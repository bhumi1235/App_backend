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
            userData: { // Matched with authController pattern
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

// Helper to format Supervisor ID
const formatSupervisorId = (id) => `SPR${String(id).padStart(3, '0')}`;

// Get All Supervisors
export const getAllSupervisors = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name, email, phone, created_at, profile_photo, 'Active' as status FROM employees ORDER BY created_at DESC"
        );

        console.log(`[GetSupervisors] Found ${result.rows.length} records.`);

        const formattedSupervisors = result.rows.map(sup => ({
            id: sup.id,
            supervisorID: formatSupervisorId(sup.id),
            fullName: sup.name, // Frontend expects 'fullName'
            email: sup.email,
            phone: sup.phone,
            status: sup.status, // "Active"
            date_of_joining: sup.created_at,
            profileImage: sup.profile_photo || null
        }));

        console.log(`[GetSupervisors] Sending array of length:`, formattedSupervisors.length);

        // Bypass successResponse to return a RAW ARRAY as expected by frontend's res.data.filter()
        return res.status(200).json(formattedSupervisors);
    } catch (error) {
        console.error("[GetSupervisors] Error:", error);
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

// ... (createAdmin code)

// Get Supervisor Details by ID
export const getSupervisorById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "SELECT id, name, email, phone, created_at, 'Active' as status FROM employees WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return errorResponse(res, "Supervisor not found", 404);
        }

        const s = result.rows[0];
        const supervisorDetails = {
            id: s.id,
            fullName: s.name,      // Map name -> fullName
            email: s.email,
            phone: s.phone,
            status: s.status,
            createdDate: s.created_at // Map created_at -> createdDate
        };

        return res.status(200).json(supervisorDetails); // Bypass wrapper for direct access
    } catch (error) {
        console.error("[GetSupervisorById] Error:", error);
        return errorResponse(res, "Server error", 500);
    }
};

// Get Guards for a specific Supervisor
export const getSupervisorGuards = async (req, res) => {
    try {
        const { id } = req.params; // Supervisor ID

        // Query guards for this supervisor
        const result = await pool.query(
            "SELECT id, name, phone, working_location, 'Active' as status FROM guards WHERE supervisor_id = $1 ORDER BY created_at DESC",
            [id]
        );

        const formattedGuards = result.rows.map(g => ({
            id: g.id,
            fullName: g.name,           // Map name -> fullName
            phone: g.phone,
            assignedArea: g.working_location, // Map working_location -> assignedArea
            status: g.status
        }));

        return res.status(200).json(formattedGuards); // Bypass wrapper
    } catch (error) {
        console.error("[GetSupervisorGuards] Error:", error);
        return errorResponse(res, "Server error", 500);
    }
};
