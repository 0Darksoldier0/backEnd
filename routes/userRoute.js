import express from 'express'
import {adminSignIn, staffSignUp, userSignUp, userSignIn, getUserData, getUsers, updateUserFirstName, updateUserLastName, updateUserPassword, removeUser, updateStaffData, updateStaffPassword } from '../controller/userController.js'
import { authenticateToken } from '../middleware/authentication.js';
import { checkAdminAccountType } from '../middleware/checkAccountType.js';


const userRouter = express.Router();

userRouter.post('/adminSignIn', adminSignIn);
userRouter.post('/signUp', userSignUp)
userRouter.post('/signIn', userSignIn)
userRouter.post('/list', authenticateToken, checkAdminAccountType, getUsers)
userRouter.post('/get', authenticateToken, getUserData)
userRouter.post('/updatefirstname', authenticateToken, updateUserFirstName)
userRouter.post('/updatelastname', authenticateToken, updateUserLastName)
userRouter.post('/updatepassword', authenticateToken, updateUserPassword)
userRouter.post('/remove', authenticateToken, checkAdminAccountType, removeUser)
userRouter.post('/staffSignUp', authenticateToken, checkAdminAccountType, staffSignUp)
userRouter.post('/updateStaffData', authenticateToken, checkAdminAccountType, updateStaffData)
userRouter.post('/updateStaffPassword', authenticateToken, checkAdminAccountType, updateStaffPassword)

export default userRouter;