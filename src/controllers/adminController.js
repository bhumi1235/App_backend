import pool from "../config/db.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwtUtils.js";

// Admin Login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`[Admin Login] Attempt for email: ${email}`);

        const result = await pool.query("SELECT * FROM admins WHERE email = $1", [email]);
        if (result.rows.length === 0) {
            console.log(`[Admin Login] User not found: ${email}`);
            return errorResponse(res, "User not found. Please create an admin first.");
        }

        const admin = result.rows[0];
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            console.log(`[Admin Login] Password mismatch for: ${email}`);
            return errorResponse(res, "Incorrect password.");
        }

        console.log(`[Admin Login] Success for: ${email}`);
        const token = generateToken({ id: admin.id, email: admin.email, role: "admin" });

        return successResponse(res, "Admin login successful", {
            token,
            user: { // Changed from 'admin' to 'user' to match potential frontend expectation
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: "admin",
                created_at: admin.created_at
            }
        });
    } catch (error) {
        console.error("[Admin Login] Error:", error);
        return errorResponse(res, "Server error", 500);
    }
};

// Get Dashboard Stats
export const getDashboardStats = async (req, res) => {
    try {
        const totalGuards = await pool.query("SELECT COUNT(*) FROM guards");
        const totalSupervisors = await pool.query("SELECT COUNT(*) FROM employees");
        const recentGuards = await pool.query("SELECT * FROM guards ORDER BY created_at DESC LIMIT 5");

        const stats = {
            totalGuards: parseInt(totalGuards.rows[0].count),
            totalSupervisors: parseInt(totalSupervisors.rows[0].count),
            recentGuards: recentGuards.rows
        };

        return successResponse(res, "Dashboard stats fetched successfully", stats);
    } catch (error) {
        console.error(error);
        return errorResponse(res, "Server error", 500);
    }
};

// Get All Supervisors
export const getAllSupervisors = async (req, res) => {
    try {
        // Added 'Active' as static status to satisfy frontend filters
        const result = await pool.query(
            "SELECT id, name, email, phone, created_at, profile_photo, 'Active' as status FROM employees ORDER BY created_at DESC"
        );
        return successResponse(res, "Supervisors fetched successfully", { supervisors: result.rows });
    } catch (error) {
        console.error(error);
        return errorResponse(res, "Server error", 500);
    }
};

// Toggle Supervisor Status (if needed, or just standard edit)
// For now, let's just assume we list them. 
// If specific management actions needed:
// export const updateSupervisorStatus = ...

// DEBUG: List all admins
export const listAdmins = async (req, res) => {
    try {
        const result = await pool.query("SELECT id, name, email, created_at FROM admins");
        return successResponse(res, "Admin List", result.rows);
    } catch (error) {
        return errorResponse(res, "Server error", 500);
    }
};

// Create a new Admin (Optional per user request)
export const createAdmin = async (req, res) => {
    try {
        const { name, phone, email, password } = req.body;
        console.log(`[Create Admin] Request for: ${email}`);

        // Basic duplicate check
        const check = await pool.query("SELECT * FROM admins WHERE email = $1", [email]);
        if (check.rows.length > 0) {
            console.log(`[Create Admin] Already exists: ${email}`);
            return errorResponse(res, "Admin already exists");
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.query(
            "INSERT INTO admins (name, email, password) VALUES ($1, $2, $3)",
            [name, email, hashedPassword]
        );

        console.log(`[Create Admin] Created successfully: ${email}`);
        return successResponse(res, "Admin created successfully");
    } catch (error) {
        console.error("[Create Admin] Error:", error);
        return errorResponse(res, "Server error", 500);
    }
};
