import database from "../config/database.js";

const getProductPrice = async (req, res) => {
    const select_query = `SELECT product_name, price, category_id FROM products
                            WHERE availability = 1
                            ORDER BY category_id ASC, price DESC`;

    try {
        const [results] = await database.promise().query(select_query);
        return res.status(200).json({ data: results });
    }
    catch (error) {
        console.error("(GetProductPrice) Error fetching product price: ", error);
        return res.status(500).json({ message: "Error fetching product price" })
    }
}

const getProductPurchaseQuantity = async (req, res) => {
    const select_query = `SELECT * FROM product_quantity_purchase
                            ORDER BY category_id ASC, quantity DESC, product_name ASC`

    try {
        const [results] = await database.promise().query(select_query);
        return res.status(200).json({ data: results })
    }
    catch (error) {
        console.error("(GetProductPurchaseQuantity) Error fetching product purchase quantity: ", error);
        return res.status(500).json({ message: "Error fetching product purchase quantity" })
    }
}

const getProductFromPriceHistory = async (req, res) => {
    const select_query = `SELECT DISTINCT ph.product_id, p.product_name, p.category_id
                            FROM price_history ph
                            JOIN products p ON ph.product_id = p.product_id
                            ORDER BY p.category_id`

    try {
        const [results] = await database.promise().query(select_query);
        return res.status(200).json({ data: results })
    }
    catch (error) {
        console.error("(GetProductFromPriceHistory) Error fetching product from price history: ", error);
        return res.status(500).json({ message: "Error fetching product from price history" })
    }

}

const getProductPriceHistory = async (req, res) => {
    const { product_id } = req.body;

    const select_query = `SELECT ph._date, ph.product_id, p.product_name, ph.product_price 
                            FROM price_history ph
                            JOIN products p ON ph.product_id = p.product_id
                            WHERE ph.product_id = ?`

    try {
        const [results] = await database.promise().query(select_query, [product_id]);
        return res.status(200).json({ data: results })
    }
    catch (error) {
        console.error("(GetProductPriceHistory) Error fetching product price from price history: ", error);
        return res.status(500).json({ message: "Error fetching product price from price history" })
    }
}

const getTodayRevenue = async (req, res) => {
    const select_query = `SELECT SUM(total_revenue) AS today_revenue FROM today_revenue`;

    try {
        const [results] = await database.promise().query(select_query);

        return res.status(200).json({ data: results[0].today_revenue !== null ? results[0].today_revenue : 0 })
    }
    catch (error) {
        console.error("(GetTodayRevenue) Error fetching today revenue: ", error);
        return res.status(500).json({ message: "Error fetching today revenue" })
    }
}

const getTotalRevenue = async (req, res) => {
    const select_query = `SELECT SUM(total_revenue) AS total_revenue FROM total_revenue`;

    try {
        const [results] = await database.promise().query(select_query);

        return res.status(200).json({ data: results[0].today_revenue !== null ? results[0].total_revenue : 0 });
    }
    catch (error) {
        console.error("(GetTotalRevenue) Error fetching total revenue: ", error);
        return res.status(500).json({ message: "Error fetching total revenue" })
    }
}

export { getProductPrice, getProductPurchaseQuantity, getProductFromPriceHistory, getProductPriceHistory, getTodayRevenue, getTotalRevenue }