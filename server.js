import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import productRouter from './routes/productRoute.js';
import userRouter from './routes/userRoute.js';
import cartRouter from './routes/cartRoute.js';
import orderRouter from './routes/orderRoute.js';
import inHouseOrderRouter from './routes/inHouseOrderRoute.js';
import analyticsRouter from './routes/analyticsRoute.js';
import * as cron from 'node-cron';

import { setMaintenanceMode } from './utils/maintenanceMode.js';

dotenv.config();


// app config
const app = express()
const port = process.env.PORT 


// middleware
app.use(express.json())
app.use(cors())


// api endpoints
app.use('/api/product', productRouter)
app.use("/images", express.static('uploads'))
app.use("/api/user", userRouter)
app.use("/api/cart", cartRouter)
app.use("/api/order", orderRouter)
app.use("/api/inhouseorder", inHouseOrderRouter)
app.use("/api/analytics", analyticsRouter)


// Start maintenance mode
cron.schedule('0 0 * * *', () => {
    console.log('Running scheduled task: Starting daily maintenance window.');
    setMaintenanceMode(true);
});

// End maintenance mode
cron.schedule('5 0 * * *', () => {
    console.log('Running scheduled task: Ending daily maintenance window.');
    setMaintenanceMode(false);
});


app.listen(port, () => {
    console.log(`Server Started on https://ahundertastesrestaurant.onrender.com:${port}`)
})
