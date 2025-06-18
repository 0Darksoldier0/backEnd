import fs from 'fs'
import database from '../config/database.js'


// add a product
const addProduct = async (req, res) => {
    let image_filename = `${req.file.filename}`;
    let data = req.body;
    const { product_name, price, description, category_id, availability } = req.body;
    const checkProductName_query = "SELECT * FROM products WHERE product_name =?";
    const insertProduct_query = "INSERT INTO products(product_name, price, description, image, category_id, availability) VALUES(?, ?, ?, ?, ?, ?)";

    try {
        const [results] = await database.promise().query(checkProductName_query, [data.product_name]);
        if (results.length > 0) {
            fs.unlink(`./uploads/${image_filename}`, err => {
                if (err) {
                    console.error("(AddProduct) Failed to unlink uploaded file", err);
                }
            });
            console.log("(AddProduct) Product name has already existed");
            return res.status(409).json({ message: "Product name has already existed" });
        }
        else {
            await database.promise().query(insertProduct_query, [product_name, price, description, image_filename, category_id, availability]);
            return res.status(200).json({ message: "Product added" });
        }
    }
    catch (error) {
        fs.unlink(`./uploads/${image_filename}`, err => {
            if (err) {
                console.error("(AddProduct) Failed to unlink uploaded file", err);
            }
        });
        console.error("(AddProduct) Error adding product: ", error);
        return res.status(500).json({ message: "Error adding product" });
    }
}

// get all products
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

// get only available product
const listAvailableProducts = async (req, res) => {
    const selectALLProduct_query = `SELECT p.product_id, p.product_name, p.price, p.description, p.image, p.category_id, c.category_name, p.availability 
                                    FROM products p 
                                    JOIN categories c ON p.category_id = c.category_id
                                    WHERE p.availability = 1`;
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
        // This is risky operation. Transaction is used
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
            // Remove the selected product
            const [results] = await connection.query(select_productFromOrderDetails_query, [product_id, product_id])
            if (results.length > 0) {
                await connection.rollback();
                return res.status(409).json({ message: "Product removal not allowed, please change status to 'unavailable'" })
            }
            else {
                await connection.query(delete_query, [product_id]);
                // Also remove product from all users cart
                await connection.query(set_safe_update_query, [0]);
                await connection.query(update_cart_query);
                await connection.commit();

                fs.unlink(`uploads/${results[0].image}`, (err) => {
                    if (err) {
                        console.error("(RemoveProduct) Fail to unlink product image");
                    }
                });

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

// update a product
const updateProduct = async (req, res) => {
    const { product_name, price, description, category_id, availability, product_id } = req.body;
    const update_query = "UPDATE products SET product_name = ?, price = ?, description = ?, category_id = ?, availability = ? WHERE product_id = ?";

    const set_safe_update_query = "SET SQL_SAFE_UPDATES = ?"
    const update_cart_query = `UPDATE users SET cart = JSON_REMOVE(cart, '$."${product_id}"');`

    let connection;

    try {
        // This is risky operation. Transaction is used
        connection = await database.promise().getConnection();
        await connection.beginTransaction();

        await connection.query(update_query, [product_name, price, description, category_id, availability, product_id]);

        // Also remove product from all users cart if availabity is set to 0
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
    const { old_image_filename, product_id } = req.body;
    let new_image_filename = `${req.file.filename}`;
    const update_query = "UPDATE products SET image = ? WHERE product_id = ?";

    try {
        await database.promise().query(update_query, [new_image_filename, product_id]);

        fs.unlink(`./uploads/${old_image_filename}`, err => {
            if (err) {
                console.error("Fail to unlink uploaded file: ", err)
            }
        });

        return res.status(200).json({ image: new_image_filename, message: "Product image updated" });

    } catch (error) {
        // If the database update failed, clean up the newly uploaded image.
        fs.unlink(`./uploads/${new_image_filename}`, err => {
            if (err) {
                console.error("Fail to unlink uploaded file: ", err)
            }
        });

        console.error("(UpdateProductImage) Error updating product image: ", error);
        return res.status(500).json({ message: "Error updating product image" });
    }
}

const getProductPrice = async (req, res) => {
    const select_query = "SELECT product_name, price, category_id FROM products ORDER BY availability desc, category_id asc";

    try {
        const [results] = await database.promise().query(select_query);
        return res.status(200).json({ data: results });
    }
    catch (error) {
        console.error("(GetProductPrice) Error fetching product price: ", error);
        return res.status(500).json({ message: "Error fetching product price" })
    }
}

export { addProduct, listProducts, listAvailableProducts, removeProduct, updateProduct, updateProductImage, getProductPrice }