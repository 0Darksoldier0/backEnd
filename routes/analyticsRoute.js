import express from 'express'
import { getProductPrice, getProductPurchaseQuantity, getProductFromPriceHistory, 
        getProductPriceHistory, getTodayRevenue, getTotalRevenue } from '../controller/analyticsController.js'
import { authenticateToken } from '../middleware/authentication.js'
import { checkAdminAccountType } from '../middleware/checkAccountType.js'

const analyticsRouter = express.Router();

analyticsRouter.post("/getprice", authenticateToken, checkAdminAccountType, getProductPrice)
analyticsRouter.post("/getproductpurchasequantity", authenticateToken, checkAdminAccountType, getProductPurchaseQuantity)
analyticsRouter.post('/getProductFromPriceHistory', authenticateToken, checkAdminAccountType, getProductFromPriceHistory)
analyticsRouter.post('/getProductPriceHistory', authenticateToken, checkAdminAccountType, getProductPriceHistory)
analyticsRouter.post('/getTodayRevenue', authenticateToken, checkAdminAccountType, getTodayRevenue)
analyticsRouter.post('/getTotalRevenue', authenticateToken, checkAdminAccountType, getTotalRevenue)

export default analyticsRouter;