import { body, validationResult } from "express-validator";
import { errorResponse } from "../utils/responseHandler.js";

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg);
    }
    next();
};

export const validateSignup = [
    body("name").notEmpty().withMessage("Name is required"),
    body("phone").matches(/^[0-9]{10,15}$/).withMessage("Invalid phone number format"),
    body("email").isEmail().withMessage("Invalid email format"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("confirmPassword").custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error("Passwords do not match");
        }
        return true;
    }),
    handleValidationErrors
];

export const validateLogin = [
    body("phone").notEmpty().withMessage("Phone number is required"),
    body("password").notEmpty().withMessage("Password is required"),
    body("player_id").optional().isString().withMessage("player_id must be a string"),
    body("device_type").optional().isString().withMessage("device_type must be a string"),
    handleValidationErrors
];

export const validateForgotPassword = [
    body("phone").notEmpty().withMessage("Phone number is required"),
    handleValidationErrors
];

export const validateVerifyOtp = [
    body("phone").notEmpty().withMessage("Phone number is required"),
    body("otp").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
    handleValidationErrors
];

export const validateResetPassword = [
    body("phone").notEmpty().withMessage("Phone number is required"),
    body("new_password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    handleValidationErrors
];
