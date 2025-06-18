import express from 'express'
import { addProduct, removeProduct, listProducts, listAvailableProducts, updateProduct, updateProductImage, getProductPrice } from '../controller/productController.js'
import multer from 'multer'
import { authenticateToken } from '../middleware/authentication.js'
import { checkAdminAccountType } from '../middleware/checkAccountType.js'
import { checkMaintenanceMode } from '../middleware/checkMaintenanceMode.js'

const productRouter = express.Router();

// store product images
const storage = multer.diskStorage({
    destination: "uploads",
    filename: (req, file, callback) => {
        return callback(null, `${Date.now()}${file.originalname}`)
    }
})

const upload = multer({ storage: storage })

productRouter.post("/add", authenticateToken, checkAdminAccountType, checkMaintenanceMode, upload.single("image"), addProduct)
productRouter.post("/remove", authenticateToken, checkAdminAccountType, checkMaintenanceMode, removeProduct)
productRouter.post("/update", authenticateToken, checkAdminAccountType, checkMaintenanceMode, updateProduct)
productRouter.post("/updateimage", authenticateToken, checkAdminAccountType, checkMaintenanceMode, upload.single("image"), updateProductImage)
productRouter.post("/getprice", authenticateToken, checkAdminAccountType, getProductPrice)
productRouter.post("/listall", authenticateToken, checkAdminAccountType, listProducts)
productRouter.get("/listavailable", listAvailableProducts)

export default productRouter;