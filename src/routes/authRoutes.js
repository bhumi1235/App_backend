import express from "express";
import { signup, login, forgotPassword, verifyOtp, resetPassword } from "../controllers/authController.js";
import { validateSignup, validateLogin, validateForgotPassword, validateVerifyOtp, validateResetPassword } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.post("/signup", validateSignup, signup);
router.post("/login", validateLogin, login);
router.post("/forgot-password", validateForgotPassword, forgotPassword);
router.post("/verify-otp", validateVerifyOtp, verifyOtp);
router.post("/reset-password", validateResetPassword, resetPassword);

export default router;
