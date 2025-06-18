import express from 'express'
import { addToCart, removeFromCart, getCart } from "../controller/cartController.js";
import { authenticateToken } from '../middleware/authentication.js';

const cartRouter = express.Router();

cartRouter.post('/add', authenticateToken, addToCart);
cartRouter.post('/remove', authenticateToken, removeFromCart);
cartRouter.post('/get', authenticateToken, getCart);

export default cartRouter;