import database from '../config/database.js'

const getAvailableTable = async (req, res) => {
    const select_query = "SELECT seat_id FROM seat WHERE availability = 1";

    try {
        const [results] = await database.promise().query(select_query);
        return res.status(200).json({ tables: results });
    }
    catch (error) {
        console.error("(GetAvailableTable) Error fetching tables: ", error);
        return res.status(500).json({ message: "Error fetching tables" })
    }
}

const updateTableStatus = async (req, res) => {
    const { availability, seat_id } = req.body;
    const update_query = "UPDATE seat SET availability = ? WHERE seat_id = ?";

    try {
        await database.promise().query(update_query, [availability, seat_id]);
        return res.status(200).json({ message: "Table status updated" })
    }
    catch (error) {
        console.error("(UpdateTableStatus) Error updating table status: ", error);
        return res.status(500).json({ message: "Error updating table status" });
    }
}

const getOrderData = async (req, res) => {
    const { order_id } = req.body;
    const select_query = "SELECT * FROM in_house_orders WHERE order_id = ?"
    try {
        const [results] = await database.promise().query(select_query, [order_id])
        return res.status(200).json({ orderData: results, message: "Order data fechted" })
    }
    catch (error) {
        console.error("(GetOrderData) Error getting order data: ", error)
        return res.status(500).json({ message: "Error getting order data" })
    }
}

const getInHouseOrders = async (req, res) => {
    const select_query =   `SELECT o.order_id, o.staff_incharged_username, o.seat_id, o.order_date, o.customer_name, o.payment, SUM(p.price * od.served_quantity) as subtotal
                            FROM in_house_orders o
                            JOIN in_house_order_details od ON o.order_id = od.order_id
                            JOIN products p ON od.product_id = p.product_id
                            GROUP BY o.order_id, o.staff_incharged_username, o.seat_id, o.order_date, o.customer_name
                            ORDER BY order_id DESC`;

    try {
        const [results] = await database.promise().query(select_query);
        return res.status(200).json({ orders: results, message: "Orders fetched" })
    }
    catch (error) {
        console.error("(GetOrders) Error geting in-house orders: ", error);
        return res.status(500).json({ message: "Error geting in-house orders" })
    }
}

const getInHouseOrderDetails = async (req, res) => {
    const { order_id } = req.body;

    const select_query = `SELECT od.order_id, od.product_id, p.product_name, p.price, od.quantity, od.served_quantity, o.seat_id, p.image 
                            FROM in_house_order_details od
                            JOIN in_house_orders o ON od.order_id = o.order_id
                            JOIN products p ON od.product_id = p.product_id
                            WHERE od.order_id = ?`;

    try {
        const [results] = await database.promise().query(select_query, [order_id]);
        return res.status(200).json({ order_details: results });
    }
    catch (error) {
        console.error("(GetOrderDetails) Error getting order details: ", error);
        return res.status(500).json({ message: "Error getting order details" });
    }
}

const createOrder = async (req, res) => {
    const { seat_id, customer_name } = req.body;
    const { username } = req.user;

    const insert_query = "INSERT INTO in_house_orders(order_id, staff_incharged_username, seat_id, customer_name) VALUES(?, ?, ?, ?)";

    const order_id = String(Math.floor(performance.now()) + Date.now());

    try {
        const select_query = "SELECT availability FROM seat WHERE seat_id = ?"
        const [results] = await database.promise().query(select_query, [seat_id]);

        if (results[0].availability === 0) {
            return res.status(406).json({ message: `Table ${seat_id} is unavailable, check your input again` });
        }
    }
    catch (error) {
        console.error("(CreateOrder-SelectTable) Error creating order: ", error);
        return res.status(500).json({ message: "Error creating order" })
    }

    try {
        await database.promise().query(insert_query, [order_id, username, seat_id, customer_name]);
        return res.status(200).json({ order_id: order_id, message: "Order Created" })
    }
    catch (error) {
        console.error("(CreateOrder) Error creating order: ", error);
        return res.status(500).json({ message: "Error creating order" });
    }
}

const addItemsToOrder = async (req, res) => {
    const { cartItems, order_id } = req.body;

    const insert_query = "INSERT INTO in_house_order_details(order_id, product_id, quantity) VALUES(?, ?, ?)";
    const select_productid_query = "SELECT product_id FROM in_house_order_details WHERE order_id = ? AND product_id = ?"
    const update_quantity_query = "UPDATE in_house_order_details SET quantity = quantity + ? WHERE order_id = ? and product_id = ?";

    try {

        cartItems.forEach(async (item) => {
            const [results] = await database.promise().query(select_productid_query, [order_id, item.product_id])
            if (results.length > 0) {
                await database.promise().query(update_quantity_query, [item.quantity, order_id, item.product_id]);
            }
            else {
                await database.promise().query(insert_query, [order_id, item.product_id, item.quantity]);
            }
        });

        return res.status(200).json({ message: "Order Received" });
    }
    catch (error) {
        console.error("(AddItemsToOrder) Error adding items to order: ", error);
        return res.status(500).json({ message: "Error adding items to order" })
    }
}

const updateProductServed = async (req, res) => {
    const { order_id, product_id, quantity } = req.body;

    const update_query = "UPDATE in_house_order_details SET served_quantity = ? WHERE order_id = ? AND product_id = ?";

    try {
        await database.promise().query(update_query, [quantity, order_id, product_id]);
        return res.status(200).json({ message: "Product served" });
    }
    catch (error) {
        console.error("(UpdateProductServed) Error updating product served quantity: ", error);
        return res.status(500).json({ message: "Error updating product served quantity" })
    }
}

const updateProductQuantity = async (req, res) => {
    const { order_id, product_id, served_quantity } = req.body;

    const update_query = "UPDATE in_house_order_details SET quantity = ? WHERE order_id = ? AND product_id = ?";
    const delete_query = "DELETE FROM in_house_order_details WHERE order_id = ? AND product_id = ?";

    try {
        if (served_quantity === 0) {
            await database.promise().query(delete_query, [order_id, product_id]);
            return res.status(200).json({ message: "Product canceled and removed" })
        }
        else {
            await database.promise().query(update_query, [served_quantity, order_id, product_id]);
            return res.status(200).json({ message: "Products canceled" });
        }
    }
    catch (error) {
        console.error("(UpdateProductQuantity) Error updating product quantity: ", error);
        return res.status(500).json({ message: "Error updating product quantity" })
    }
}

const updatePayment = async (req, res) => {
    const {order_id} = req.body;
    const update_query = "UPDATE in_house_orders SET payment = 1 WHERE order_id = ?";

    try {
        await database.promise().query(update_query, [order_id])
        return res.status(200).json({ message: "Payment updated" })
    }
    catch (error) {
        console.error("(UpdatePayment) Error updating payment: ", error);
        return res.status(500).json({ message: "Error updating payment" })
    }
}

const getSeatAvailability = async (req, res) => {
    const {seat_id} = req.body;
    const select_query = "SELECT availability FROM seat WHERE seat_id = ?"
    try {
        const [results] = await database.promise().query(select_query, [seat_id]);
        return res.status(200).json({avail: results[0]})
    }
    catch (error) {
        console.error("(GetSeatAvailability) Error getting seat availability: ", error);
        return res.status(500).json({message: "Error getting seat availability"})
    }
}

export { getAvailableTable, updateTableStatus, createOrder, addItemsToOrder, getOrderData, getInHouseOrders, getInHouseOrderDetails, updateProductServed, updateProductQuantity, updatePayment, getSeatAvailability }