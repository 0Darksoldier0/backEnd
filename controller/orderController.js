import database from '../config/database.js'
import Stripe from 'stripe'
import bcrypt from 'bcrypt'
import { FRONTEND_URL } from '../config/constants.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


const placeOrder = async (req, res) => {
    const { username } = req.user;
    const { cartItems, shipping_details } = req.body;

    const insert_orders_query = "INSERT INTO online_orders(order_id, username, shipping_details, payment_token) VALUES(?, ?, ?, ?)";
    const insert_order_details_query = "INSERT INTO online_order_details VALUES(?, ?, ?)";

    console.log("printing items: ")
    console.log(cartItems);


    try {
        const order_id = String(Math.floor(performance.now()) + Date.now());

        let success_payment_token = '';
        for (let i = 0; i < 50; i++) {
            success_payment_token += Math.random().toString(36).substring(2, 3);
        }

        const salt = await bcrypt.genSalt(10);
        const encrypted_PaymentToken = await bcrypt.hash(success_payment_token, salt);

        await database.promise().query(insert_orders_query, [order_id, username, shipping_details, encrypted_PaymentToken]);

        cartItems.forEach(async (item) => {
            await database.promise().query(insert_order_details_query, [order_id, item.product_id, item.quantity]);
        });

        const line_items = cartItems.map((item) => ({
            price_data: {
                currency: "vnd",
                product_data: {
                    name: item.product_name
                },
                unit_amount: item.price
            },
            quantity: item.quantity
        }))

        line_items.push({
            price_data: {
                currency: "vnd", // Ensure this currency is supported by your enabled payment methods
                product_data: {
                    name: "Delivery Fee"
                },
                unit_amount: 35000 // Ensure correct conversion
            },
            quantity: 1
        })

        let fail_payment_token = '';
        for (let i = 0; i < 50; i++) {
            fail_payment_token += Math.random().toString(36).substring(2, 3);
        }

        const session = await stripe.checkout.sessions.create({
            line_items: line_items,
            mode: "payment",
            success_url: `${FRONTEND_URL}/verifyOrder?payment_token=${success_payment_token}&order_id=${order_id}`,
            cancel_url: `${FRONTEND_URL}/verifyOrder?payment_token=${fail_payment_token}&order_id=${order_id}`
        })

        return res.json({ success: true, session_url: session.url });
    }
    catch (error) {
        console.error("(PlaceOrder) Error placing order: ", error);
        returnres.json({ sucess: false, message: "Error placing order" });
    }
}


const verifyOrder = async (req, res) => {
    const { order_id, payment_token } = req.body;

    const select_paymentToken_query = "SELECT payment_token FROM online_orders WHERE order_id = ?";

    try {
        const [results] = await database.promise().query(select_paymentToken_query, [order_id]);
        const isPaymentTokenMatch = await bcrypt.compare(payment_token, results[0].payment_token);

        if (isPaymentTokenMatch) {
            const update_payment_query = "UPDATE online_orders SET payment = ? WHERE order_id = ?";
            const update_userCart_query = "UPDATE users SET cart = '{}' WHERE username = (SELECT username FROM online_orders WHERE order_id = ?)";

            await database.promise().query(update_payment_query, [1, order_id]);
            await database.promise().query(update_userCart_query, [order_id]);

            console.log('(Backend) payment fail')
            return res.json({success: true});
        }
        else {
            console.log('(Backend) payment fail')
            return res.status({success: false});
        }
    }
    catch (error) {
        console.error("(VerifyOrder) Error verifying order: ", error);
        return res.status(500);
    }
}


const getUserOrders = async (req, res) => {
    const { username } = req.user;
    const select_query = `SELECT o.order_id, o.order_date, o.shipping_details, sum((p.price * od.product_quantity))  as subtotal, o.status
                            FROM online_orders o 
                            JOIN online_order_details od ON o.order_id = od.order_id 
                            JOIN products p ON od.product_id = p.product_id
                            WHERE o.username = ? and payment is true
                            GROUP BY o.order_id, o.username, o.order_date
                            ORDER BY o.order_id desc`;

    try {
        const [results] = await database.promise().query(select_query, [username]);
        return res.status(200).json({ userOrders: results });
    }
    catch (error) {
        console.error("(GetUserOrders) Error fetching user orders: ", error);
        return res.status(500).json({ message: "Error fetching user orders" });
    }
}


const getOrderDetails = async (req, res) => {
    const { order_id } = req.body;
    const select_query = `SELECT od.order_id, od.product_id, p.product_name, p.price, od.product_quantity, (p.price * od.product_quantity) as total 
                            FROM online_order_details od
                            JOIN products p ON od.product_id = p.product_id
                            WHERE od.order_id = ?` ;

    try {
        const [results] = await database.promise().query(select_query, [order_id]);
        return res.status(200).json({ orderDetails: results });
    }
    catch (error) {
        console.error("(GetOrderDetails) Error fetching user details: ", error);
        return res.status(500).json({ message: "Error fetching user details" })
    }
}


const getOrders = async (req, res) => {
    const select_query = `SELECT o.order_id, o.order_date, o.shipping_details, sum((p.price * od.product_quantity))  as subtotal, o.status
                            FROM online_orders o 
                            JOIN online_order_details od ON o.order_id = od.order_id 
                            JOIN products p ON od.product_id = p.product_id
                            WHERE payment is true
                            GROUP BY o.order_id, o.username, o.order_date
                            ORDER BY o.order_id DESC`;
    try {
        const [results] = await database.promise().query(select_query);
        return res.status(200).json({ orders: results });
    }
    catch (error) {
        console.error("(GetOrders) Error listing orders: ", error);
        return res.status(500).json({ message: "Error listing orders" })
    }
}

const updateStatus = async (req, res) => {
    const { order_id, status } = req.body;
    const update_query = "UPDATE online_orders SET status = ? WHERE order_id = ?";

    try {
        await database.promise().query(update_query, [status, order_id]);
        console.log("status updated: ", status);
        return res.status(200).json({ message: "Order status updated" })
    }
    catch (error) {
        console.error("(UpdateStatus) Error updating order status: ", error);
        return res.status(500).json({ message: "Error updating order status" })
    }
}


export { placeOrder, verifyOrder, getUserOrders, getOrderDetails, getOrders, updateStatus }