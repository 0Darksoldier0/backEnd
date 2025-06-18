import express from 'express'
import { authenticateToken } from '../middleware/authentication.js';
import { checkAdminAndStaffAccountType } from '../middleware/checkAccountType.js';
import { getAvailableTable, updateTableStatus, createOrder, addItemsToOrder, getSeatAvailability, 
    getInHouseOrderDetails, getOrderData, getInHouseOrders, updateProductServed, updateProductQuantity, updatePayment } from '../controller/inHouseOrderController.js';

const inHouseOrderRouter = express.Router();

inHouseOrderRouter.post('/getTable', authenticateToken, checkAdminAndStaffAccountType, getAvailableTable);
inHouseOrderRouter.post('/updateTableStatus', authenticateToken, checkAdminAndStaffAccountType, updateTableStatus)
inHouseOrderRouter.post('/createOrder', authenticateToken, checkAdminAndStaffAccountType, createOrder)
inHouseOrderRouter.post('/addItems', authenticateToken, addItemsToOrder)
inHouseOrderRouter.post('/getDetails', authenticateToken, getInHouseOrderDetails)
inHouseOrderRouter.post('/getOrderData', authenticateToken, getOrderData)
inHouseOrderRouter.post('/list', authenticateToken, checkAdminAndStaffAccountType, getInHouseOrders)
inHouseOrderRouter.post('/updateServedQuantity', authenticateToken, checkAdminAndStaffAccountType, updateProductServed)
inHouseOrderRouter.post('/updateQuantity', authenticateToken, checkAdminAndStaffAccountType, updateProductQuantity)
inHouseOrderRouter.post('/updatePayment', authenticateToken, checkAdminAndStaffAccountType, updatePayment)
inHouseOrderRouter.post('/getSeatAvail', authenticateToken, checkAdminAndStaffAccountType, getSeatAvailability)


export default inHouseOrderRouter