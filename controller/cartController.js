import database from "../config/database.js";

// add products to cart
const addToCart = async (req, res) => {
    const { username } = req.user;
    const { product_id } = req.body;
    const select_query = "SELECT * FROM users WHERE username = ?";
    const update_query = `UPDATE users 
                            SET cart = JSON_SET(
                            cart,
                            '$."${product_id}"', 
                            CAST(IFNULL(JSON_EXTRACT(cart, '$."${product_id}"'), 0) + 1 AS UNSIGNED INTEGER)) 
                            WHERE username = ?`;

    try {
        let [users] = await database.promise().query(select_query, [username]);

        if (users.length > 0) {
            await database.promise().query(update_query, [username]);
            return res.status(200).json({ message: "Product added to cart" });
        }
        else {
            console.log("(AddToCart) Username does not exist");
            return res.status(404).json({ message: "Username does not exist" });
        }
    }
    catch (error) {
        console.error("(AddToCart) Error adding product to cart: ", error);
        return res.status(500).json({ message: "Error adding product to cart" })
    }

}

// remove from cart
const removeFromCart = async (req, res) => {
    const { username } = req.user;
    const { product_id } = req.body;
    const select_query = "SELECT * FROM users WHERE username = ?";
    const update_query = `UPDATE users
                            SET cart =
                            CASE
                                WHEN JSON_EXTRACT(cart, '$."${product_id}"') > 1 THEN
                                    JSON_SET(cart, '$."${product_id}"', CAST(JSON_EXTRACT(cart, '$."${product_id}"') - 1 AS UNSIGNED INTEGER))
                                WHEN JSON_EXTRACT(cart, '$."${product_id}"') = 1 THEN
                                    JSON_REMOVE(cart, '$."${product_id}"')
                                ELSE
                                    cart
                            END
                        WHERE username = ?` ;

    try {
        let [users] = await database.promise().query(select_query, [username]);

        if (users.length > 0) {
            await database.promise().query(update_query, [username]);
            return res.status(200).json({ message: "Product remove from cart" })

        }
        else {
            console.log("(RemoveFromCart) Username does not exist");
            return res.status(404).json({ message: "Username does not exist" });
        }

    }
    catch (error) {
        console.error("(RemoveFromCart) Error removing product from cart: ", error);
        return res.status(500).json({ message: "Error removing product from cart" })
    }
}

// get all cart data
const getCart = async (req, res) => {
    const { username } = req.user;
    const select_query = "SELECT cart FROM users WHERE username = ?";
    try {
        const [results] = await database.promise().query(select_query, username);
        if (results.length > 0) {
            return res.status(200).json({ cartData: results[0].cart });
        }
        else {
            console.log("(GetCart) Username does not exist");
            return res.status(404).json({message: "Username does not exist"});
        }
    }
    catch (error) {
        console.error("(GetCart) Error fetching products from cart: ", error);
        return res.status(500).json({ message: "Error fetching products from cart" });
    }
}

export { addToCart, removeFromCart, getCart }