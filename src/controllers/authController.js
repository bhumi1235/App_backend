import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { generateToken } from "../utils/jwtUtils.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";

// Helper to format Supervisor ID
const formatSupervisorId = (id) => `SPR${String(id).padStart(3, '0')}`;

// Helper to extract ID from Supervisor ID string (SPRxxx -> xxx)
const parseSupervisorId = (sprId) => {
    if (!sprId || typeof sprId !== 'string') return null;
    const match = sprId.match(/SPR(\d+)/);
    return match ? parseInt(match[1], 10) : parseInt(sprId, 10); // Fallback to int if raw
};

// Employee Signup
export const signup = async (req, res, next) => {
    try {
        const { name, phone, email, password, player_id, device_type } = req.body;

        // Check if phone already exists
        const phoneCheck = await pool.query("SELECT * FROM employees WHERE phone = $1", [phone]);
        if (phoneCheck.rows.length > 0) {
            return errorResponse(res, "Phone number already registered.");
        }

        // Check if email already exists
        const emailCheck = await pool.query("SELECT * FROM employees WHERE email = $1", [email]);
        if (emailCheck.rows.length > 0) {
            return errorResponse(res, "Email id is already registered");
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const { rows } = await pool.query(
            "INSERT INTO employees (name, phone, email, password_hash, player_id, device_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, phone, email, player_id, device_type",
            [name, phone, email, hashedPassword, player_id || null, device_type || null]
        );

        const newEmployee = rows[0];
        const token = generateToken({ id: newEmployee.id, phone: newEmployee.phone });

        const userData = {
            supervisorID: formatSupervisorId(newEmployee.id), // Formatted ID
            name: newEmployee.name,
            phone: newEmployee.phone,
            email: newEmployee.email,
            player_id: newEmployee.player_id,
            device_type: newEmployee.device_type,
            profileImage: null // New user has no profile image
        };

        return successResponse(res, "Account created successfully.", {
            token,
            userData: userData
        });
    } catch (error) {
        // Check for Postgres Unique Violation (Code 23505) OR generic duplicate message
        if (error.code === '23505' || (error.message && error.message.includes('duplicate key'))) {
            if ((error.constraint && error.constraint.includes('email')) || (error.detail && error.detail.includes('email')) || (error.message && error.message.includes('email'))) {
                return errorResponse(res, "Email id is already registered");
            }
            if ((error.constraint && error.constraint.includes('phone')) || (error.detail && error.detail.includes('phone')) || (error.message && error.message.includes('phone'))) {
                return errorResponse(res, "Phone number already registered.");
            }
        }
        next(error);
    }
};

// Employee Login
export const login = async (req, res, next) => {
    try {
        const { phone, password, player_id, device_type } = req.body;

        const result = await pool.query("SELECT * FROM employees WHERE phone = $1", [phone]);

        if (result.rows.length === 0) {
            return errorResponse(res, "Phone number not registered");
        }

        const employee = result.rows[0];
        const isMatch = await bcrypt.compare(password, employee.password_hash);

        if (!isMatch) {
            return errorResponse(res, "Invalid password");
        }

        // Update device info if provided
        if (player_id || device_type) {
            await pool.query(
                "UPDATE employees SET player_id = COALESCE($1, player_id), device_type = COALESCE($2, device_type) WHERE id = $3",
                [player_id, device_type, employee.id]
            );
        }

        const token = generateToken({ id: employee.id, phone: employee.phone });

        // Construct userData object (as requested)
        const userData = {
            supervisorID: formatSupervisorId(employee.id), // Formatted ID ("SPR001")
            name: employee.name,
            phone: employee.phone,
            email: employee.email,
            player_id: player_id || employee.player_id,
            device_type: device_type || employee.device_type,
            profileImage: employee.profile_photo || null // Add profile image
        };

        return successResponse(res, "Login successfully", {
            token,
            userData: userData
        });
    } catch (error) {
        next(error);
    }
};

// Forgot Password - Send OTP
export const forgotPassword = async (req, res, next) => {
    try {
        const { phone } = req.body;

        const result = await pool.query("SELECT * FROM employees WHERE phone = $1", [phone]);

        if (result.rows.length === 0) {
            return errorResponse(res, "Phone number not registered");
        }

        const employee = result.rows[0];
        const id = employee.id; // Get ID for OTP update

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const salt = await bcrypt.genSalt(10);
        const otpHash = await bcrypt.hash(otp, salt);
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        await pool.query(
            "UPDATE employees SET otp_hash = $1, otp_expiry = $2 WHERE id = $3",
            [otpHash, otpExpiry, id]
        );

        console.log(`[MOCK SMS] OTP for ${phone}: ${otp}`);

        return successResponse(res, "OTP sent successfully", { otp, supervisorID: formatSupervisorId(employee.id) });

        return successResponse(res, "OTP sent successfully", { otp, supervisorID: formatSupervisorId(employee.id) });
    } catch (error) {
        next(error);
    }
};

// Resend OTP
export const resendOtp = async (req, res, next) => {
    try {
        const { supervisorID } = req.body;
        const id = parseSupervisorId(supervisorID);

        if (!id) return errorResponse(res, "Invalid Supervisor ID format");

        const result = await pool.query("SELECT * FROM employees WHERE id = $1", [id]);
        if (result.rows.length === 0) {
            return errorResponse(res, "User not found");
        }

        const employee = result.rows[0];

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const salt = await bcrypt.genSalt(10);
        const otpHash = await bcrypt.hash(otp, salt);
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        await pool.query(
            "UPDATE employees SET otp_hash = $1, otp_expiry = $2 WHERE id = $3",
            [otpHash, otpExpiry, id]
        );

        console.log(`[MOCK SMS] Resend OTP for ${employee.phone}: ${otp}`);

        return successResponse(res, "OTP resent successfully", { otp });
    } catch (error) {
        next(error);
    }
};

// Verify OTP
export const verifyOtp = async (req, res, next) => {
    try {
        const { supervisorID, otp } = req.body;
        const id = parseSupervisorId(supervisorID);

        if (!id) return errorResponse(res, "Invalid Supervisor ID format");

        const result = await pool.query("SELECT * FROM employees WHERE id = $1", [id]);
        if (result.rows.length === 0) {
            return errorResponse(res, "Invalid Supervisor ID");
        }

        const employee = result.rows[0];

        if (!employee.otp_hash || !employee.otp_expiry) {
            return errorResponse(res, "No OTP requested");
        }

        if (new Date() > new Date(employee.otp_expiry)) {
            return errorResponse(res, "OTP expired");
        }

        const isMatch = await bcrypt.compare(otp, employee.otp_hash);
        if (!isMatch) {
            return errorResponse(res, "Invalid OTP");
        }

        return successResponse(res, "OTP verified");
    } catch (error) {
        next(error);
    }
};

// Reset Password
export const resetPassword = async (req, res, next) => {
    try {
        const { supervisorID, new_password } = req.body;
        const id = parseSupervisorId(supervisorID);

        if (!id) return errorResponse(res, "Invalid Supervisor ID format");

        const result = await pool.query("SELECT * FROM employees WHERE id = $1", [id]);
        if (result.rows.length === 0) {
            return errorResponse(res, "User not found");
        }

        const employee = result.rows[0];

        // Verify password is explicitly provided and valid length is handled by validator

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(new_password, salt);

        await pool.query(
            "UPDATE employees SET password_hash = $1, otp_hash = NULL, otp_expiry = NULL WHERE id = $2",
            [passwordHash, id]
        );

        return successResponse(res, "Password reset successfully", { supervisorID: formatSupervisorId(employee.id) });
    } catch (error) {
        next(error);
    }
};
