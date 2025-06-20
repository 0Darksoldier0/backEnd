import fs from 'fs'
import database from '../config/database.js'
import { bucket } from '../config/gcs.js';
import path from 'path';


// add a product
const addProduct = async (req, res) => {
    // req.file.buffer will contain the image data because multer's storage will be memoryStorage
    // req.file.originalname will have the original file name
    const { product_name, price, description, category_id, availability } = req.body;
    let image_url = ''; // Will store the GCS public URL

    const checkProductName_query = "SELECT * FROM products WHERE product_name =?";
    const insertProduct_query = "INSERT INTO products(product_name, price, description, image, category_id, availability) VALUES(?, ?, ?, ?, ?, ?)";

    let uploadStream; // Declare uploadStream outside try for finally block access

    try {
        const [results] = await database.promise().query(checkProductName_query, [product_name]);
        if (results.length > 0) {
            console.log("(AddProduct) Product name has already existed");
            return res.status(409).json({ message: "Product name has already existed" });
        }
        else {
            if (req.file) {
                // Create a unique filename for GCS
                const filename = `products/${Date.now()}_${path.basename(req.file.originalname)}`;
                const blob = bucket.file(filename);

                uploadStream = blob.createWriteStream({
                    resumable: false,
                    metadata: {
                        contentType: req.file.mimetype,
                    },
                });

                // Pipe the file buffer to the GCS stream
                await new Promise((resolve, reject) => {
                    uploadStream.on('error', (err) => {
                        console.error('Error uploading to GCS:', err);
                        reject(new Error('Failed to upload image to Google Cloud Storage.'));
                    });

                    uploadStream.on('finish', async () => {
                        await blob.makePublic(); // Make the uploaded image publicly accessible
                        image_url = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
                        resolve();
                    });

                    uploadStream.end(req.file.buffer); // End the stream with the file buffer
                });
            } else {
                return res.status(400).json({ message: "No image file provided." });
            }

            await database.promise().query(insertProduct_query, [product_name, price, description, image_url, category_id, availability]);
            return res.status(200).json({ message: "Product added" });
        }
    }
    catch (error) {
        console.error("(AddProduct) Error adding product: ", error);
        // If an error occurs after GCS upload but before DB insertion, you might want to delete the GCS file.
        // This makes the system more robust but adds complexity. For now, we rely on the DB rollback or manual cleanup.
        return res.status(500).json({ message: "Error adding product" });
    }
}

// get all products (no change needed here as image column will now contain URLs)
const listProducts = async (req, res) => {
    const selectALLProduct_query = `SELECT p.product_id, p.product_name, p.price, p.description, p.image, p.category_id, c.category_name, p.availability
                                    FROM products p
                                    JOIN categories c ON p.category_id = c.category_id
                                    ORDER BY availability DESC, category_id ASC, product_name ASC`;
    try {
        const [results] = await database.promise().query(selectALLProduct_query);
        return res.status(200).json({ products: results })
    }
    catch (error) {
        console.error("(ListProducts) Error listing products: ", error);
        return res.status(500).json({ message: "Error listing products" });
    }
}

// get only available product (no change needed here as image column will now contain URLs)
const listAvailableProducts = async (req, res) => {
    const selectALLProduct_query = `SELECT p.product_id, p.product_name, p.price, p.description, p.image, p.category_id, c.category_name, p.availability
                                    FROM products p
                                    JOIN categories c ON p.category_id = c.category_id
                                    WHERE p.availability = 1
                                    ORDER BY category_id ASC, product_name ASC`;
    try {
        const [results] = await database.promise().query(selectALLProduct_query);
        return res.status(200).json({ products: results })
    }
    catch (error) {
        console.error("{ListAvailableProducts} Error listing available products: ", error);
        return res.status(500).json({ message: "Error listing available products" });
    }
}

// delete a product
const removeProduct = async (req, res) => {
    const { product_id } = req.body;

    const select_query = "SELECT * FROM products WHERE product_id = ?";
    const delete_query = "DELETE FROM products WHERE product_id = ?";
    const select_productFromOrderDetails_query =   `SELECT COUNT(*)
                                                    FROM (
                                                        SELECT product_id FROM online_order_details WHERE product_id = ?
                                                        UNION ALL
                                                        SELECT product_id FROM in_house_order_details WHERE product_id = ?
                                                    ) AS order_details`;

    const set_safe_update_query = "SET SQL_SAFE_UPDATES = ?"
    const update_cart_query = `UPDATE users SET cart = JSON_REMOVE(cart, '$."${product_id}"');`

    let connection;
    try {
        connection = await database.promise().getConnection();
        await connection.beginTransaction();

        const [results] = await connection.query(select_query, [product_id]);
        if (results.length <= 0) {
            console.log("(RemoveProduct) Product not found: ");

            await connection.rollback();
            if (connection) {
                connection.release();
            }
            return res.status(404).json({ message: "Product not found" });
        }
        else {
            const productToDelete = results[0]; // Get the product details including image URL

            const [orderCheckResults] = await connection.query(select_productFromOrderDetails_query, [product_id, product_id])
            // Note: results[0]['COUNT(*)'] will contain the count from the UNION ALL query
            if (orderCheckResults[0]['COUNT(*)'] > 0) {
                await connection.rollback();
                return res.status(409).json({ message: "Product removal not allowed, please change status to 'unavailable'" })
            }
            else {
                await connection.query(delete_query, [product_id]);
                await connection.query(set_safe_update_query, [0]);
                await connection.query(update_cart_query);
                await connection.commit();

                // Delete image from GCS
                if (productToDelete.image) {
                    try {
                        const filenameInGCS = productToDelete.image.split('/').pop(); // Extract filename from URL
                        // GCS object names need to include the "products/" prefix if you used it during upload
                        const gcsFilePath = `products/${filenameInGCS}`;
                        await bucket.file(gcsFilePath).delete();
                        console.log(`(RemoveProduct) Image ${gcsFilePath} deleted from GCS.`);
                    } catch (gcsError) {
                        console.error("(RemoveProduct) Failed to delete image from GCS:", gcsError.message);
                        // Log the error but don't prevent the product removal from proceeding if DB delete was successful.
                    }
                }

                return res.status(200).json({ message: "Product removed" });
            }
        }
    }
    catch (error) {
        console.error("(RemoveProduct) Error removing product: ", error);

        if (connection) {
            try {
                await connection.rollback();
                console.log("(RemoveProduct) Error removing product, rolling back")
            }
            catch (rollbackError) {
                console.error("(RemoveProduct) Transaction rollback error: ", rollbackError)
            }
        }
        return res.status(500).json({ message: "Error removing product" });
    }
    finally {
        if (connection) {
            try {
                await connection.query(set_safe_update_query, [1]);
            }
            catch (safeUpdateError) {
                console.error("(RemoveProduct) Error re-enabling safe update: ", safeUpdateError)
            }
            connection.release();
        }
    }
}

// update a product (no change needed as image is not updated here)
const updateProduct = async (req, res) => {
    const { product_name, price, description, category_id, availability, product_id } = req.body;
    const update_query = "UPDATE products SET product_name = ?, price = ?, description = ?, category_id = ?, availability = ? WHERE product_id = ?";

    const set_safe_update_query = "SET SQL_SAFE_UPDATES = ?"
    const update_cart_query = `UPDATE users SET cart = JSON_REMOVE(cart, '$."${product_id}"');`

    let connection;

    try {
        connection = await database.promise().getConnection();
        await connection.beginTransaction();

        await connection.query(update_query, [product_name, price, description, category_id, availability, product_id]);

        if (availability === 0) {
            await connection.query(set_safe_update_query, [0]);
            await connection.query(update_cart_query);
        }

        await connection.commit();
        return res.status(200).json({ message: "Product updated" });
    }
    catch (error) {
        console.error("(UpdateProduct) Error updating product: ", error);

        if (connection) {
            try {
                await connection.rollback();
                console.log("(UpdateProduct) Error updating product, rolling back");
            }
            catch (rollbackError) {
                console.error("(UpdateProduct) Transaction rollback error: ", rollbackError);
            }
        }
        return res.status(500).json({ message: "Error updating product" });
    }
    finally {
        if (connection) {
            try {
                await connection.query(set_safe_update_query, [1]);
            } catch (safeUpdateError) {
                console.error("(UpdateProduct) Error re-enabling safe update: ", safeUpdateError);
            }
            connection.release();
        }
    }
}

const updateProductImage = async (req, res) => {
    const { product_id } = req.body; // old_image_filename is no longer needed in req.body
    let new_image_url = ''; // Will store the new GCS public URL
    const update_query = "UPDATE products SET image = ? WHERE product_id = ?";
    const select_old_image_query = "SELECT image FROM products WHERE product_id = ?"; // Query to get the old image URL

    let uploadStream; // Declare uploadStream outside try for finally block access

    try {
        if (!req.file) {
            return res.status(400).json({ message: "No new image file provided." });
        }

        // 1. Get the old image URL from the database
        const [oldImageResults] = await database.promise().query(select_old_image_query, [product_id]);
        let old_image_url = '';
        if (oldImageResults.length > 0) {
            old_image_url = oldImageResults[0].image;
        }

        // 2. Upload the new image to GCS
        const filename = `products/${Date.now()}_${path.basename(req.file.originalname)}`;
        const blob = bucket.file(filename);

        uploadStream = blob.createWriteStream({
            resumable: false,
            metadata: {
                contentType: req.file.mimetype,
            },
        });

        await new Promise((resolve, reject) => {
            uploadStream.on('error', (err) => {
                console.error('Error uploading new image to GCS:', err);
                reject(new Error('Failed to upload new image to Google Cloud Storage.'));
            });

            uploadStream.on('finish', async () => {
                await blob.makePublic(); // Make the new image public
                new_image_url = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
                resolve();
            });

            uploadStream.end(req.file.buffer);
        });

        // 3. Update the database with the new image URL
        await database.promise().query(update_query, [new_image_url, product_id]);

        // 4. Delete the old image from GCS
        if (old_image_url) {
            try {
                const oldFilenameInGCS = old_image_url.split('/').pop(); // Extract filename from URL
                const oldGCSFilePath = `products/${oldFilenameInGCS}`; // Reconstruct path if prefix was used
                await bucket.file(oldGCSFilePath).delete();
                console.log(`(UpdateProductImage) Old image ${oldGCSFilePath} deleted from GCS.`);
            } catch (gcsError) {
                console.error("(UpdateProductImage) Failed to delete old image from GCS:", gcsError.message);
                // Log the error but don't prevent the new image update from proceeding.
            }
        }

        return res.status(200).json({ image: new_image_url, message: "Product image updated" });

    } catch (error) {
        // If database update or GCS upload failed, handle cleanup if new image was uploaded
        if (new_image_url) { // Check if new_image_url was set, meaning upload to GCS might have succeeded
            try {
                const newFilenameInGCS = new_image_url.split('/').pop();
                const newGCSFilePath = `products/${newFilenameInGCS}`;
                await bucket.file(newGCSFilePath).delete();
                console.log(`(UpdateProductImage) Cleaned up newly uploaded image ${newGCSFilePath} due to error.`);
            } catch (cleanupError) {
                console.error("(UpdateProductImage) Failed to clean up newly uploaded image on error:", cleanupError);
            }
        }

        console.error("(UpdateProductImage) Error updating product image: ", error);
        return res.status(500).json({ message: "Error updating product image" });
    }
}


export { addProduct, listProducts, listAvailableProducts, removeProduct, updateProduct, updateProductImage }