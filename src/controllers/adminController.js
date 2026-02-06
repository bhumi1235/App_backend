import pool from "../config/db.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";
import path from "path";
import fs from "fs";
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
            "SELECT id, name, email, phone, created_at, profile_photo, status FROM employees ORDER BY created_at DESC"
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
            profileImage: sup.profile_photo ? `/uploads/${sup.profile_photo}` : null
        }));

        console.log(`[GetSupervisors] Sending array of length:`, formattedSupervisors.length);

        return res.status(200).json({
            success: true,
            message: "Supervisors fetched successfully",
            data: formattedSupervisors
        });
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

// Create a new Admin
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

// Get Supervisor Details by ID
export const getSupervisorById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "SELECT id, name, email, phone, created_at, status FROM employees WHERE id = $1",
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

        return res.status(200).json({
            success: true,
            message: "Supervisor details fetched successfully",
            data: supervisorDetails
        });
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

        return res.status(200).json({
            success: true,
            message: "Supervisor guards fetched successfully",
            data: formattedGuards
        });
    } catch (error) {
        console.error("[GetSupervisorGuards] Error:", error);
        return errorResponse(res, "Server error", 500);
    }
};

// Update Supervisor Status (Suspend/Activate)
export const updateSupervisorStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate status value
        const validStatuses = ['Active', 'Suspended'];
        if (!status || !validStatuses.includes(status)) {
            return errorResponse(res, "Invalid status. Must be 'Active' or 'Suspended'", 400);
        }

        // Update status
        const result = await pool.query(
            "UPDATE employees SET status = $1 WHERE id = $2 RETURNING id, name, status",
            [status, id]
        );

        if (result.rows.length === 0) {
            return errorResponse(res, "Supervisor not found", 404);
        }

        console.log(`[UpdateSupervisorStatus] Supervisor ${id} status changed to ${status}`);
        return successResponse(res, `Supervisor ${status === 'Active' ? 'activated' : 'suspended'} successfully`, {
            supervisor: result.rows[0]
        });
    } catch (error) {
        console.error("[UpdateSupervisorStatus] Error:", error);
        return errorResponse(res, "Server error", 500);
    }
};

// Update Supervisor Details
export const updateSupervisor = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone } = req.body;
        let profile_photo = undefined;

        if (req.file) {
            profile_photo = req.file.filename;

            // Fetch current photo to delete it
            const currentPhotoResult = await pool.query("SELECT profile_photo FROM employees WHERE id = $1", [id]);
            if (currentPhotoResult.rows.length > 0) {
                const oldPhoto = currentPhotoResult.rows[0].profile_photo;
                if (oldPhoto) {
                    const filePath = path.join("uploads", oldPhoto); // Assuming uploads are in root 'uploads' folder
                    fs.unlink(filePath, (err) => {
                        if (err) console.error(`[UpdateSupervisor] Failed to delete old photo: ${filePath}`, err);
                        else console.log(`[UpdateSupervisor] Deleted old photo: ${filePath}`);
                    });
                }
            }
        }

        // Initialize update fields
        const fields = [];
        const values = [];
        let idx = 1;

        if (name) {
            fields.push(`name = $${idx++}`);
            values.push(name);
        }
        if (email) {
            fields.push(`email = $${idx++}`);
            values.push(email);
        }
        if (phone) {
            fields.push(`phone = $${idx++}`);
            values.push(phone);
        }
        if (profile_photo) {
            fields.push(`profile_photo = $${idx++}`);
            values.push(profile_photo);
        }

        if (fields.length === 0) {
            return errorResponse(res, "No fields to update");
        }

        values.push(id);
        const query = `UPDATE employees SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, name, email, phone, profile_photo, status`;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return errorResponse(res, "Supervisor not found", 404);
        }

        const updatedUser = result.rows[0];
        // Format for frontend
        const userData = {
            id: updatedUser.id,
            supervisorID: formatSupervisorId(updatedUser.id),
            fullName: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            phone: updatedUser.phone,
            status: updatedUser.status,
            profileImage: updatedUser.profile_photo ? `/uploads/${updatedUser.profile_photo}` : null
        };

        return successResponse(res, "Supervisor updated successfully", userData);
    } catch (error) {
        console.error("[UpdateSupervisor] Error:", error);
        // Check for unique constraint violations
        if (error.code === '23505') {
            if (error.detail.includes('email')) return errorResponse(res, "Email already in use");
            if (error.detail.includes('phone')) return errorResponse(res, "Phone already in use");
        }
        return errorResponse(res, "Server error", 500);
    }
};

// Delete Supervisor (Soft Delete - Set status to Terminated)
export const deleteSupervisor = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // Soft delete: Set status to 'Terminated' and store reason
        const result = await pool.query(
            "UPDATE employees SET status = 'Terminated', termination_reason = $1 WHERE id = $2 RETURNING id, name, termination_reason",
            [reason || null, id]
        );

        if (result.rows.length === 0) {
            return errorResponse(res, "Supervisor not found", 404);
        }

        console.log(`[DeleteSupervisor] Supervisor ${id} (${result.rows[0].name}) terminated. Reason: ${reason || 'Not provided'}`);
        return successResponse(res, "Supervisor terminated successfully", {
            supervisor: {
                id: result.rows[0].id,
                name: result.rows[0].name,
                termination_reason: result.rows[0].termination_reason
            }
        });
    } catch (error) {
        console.error("[DeleteSupervisor] Error:", error);
        return errorResponse(res, "Server error", 500);
    }
};

// Update Termination Reason
export const updateTerminationReason = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return errorResponse(res, "Termination reason is required");
        }

        const result = await pool.query(
            "UPDATE employees SET termination_reason = $1 WHERE id = $2 AND status = 'Terminated' RETURNING id, name, termination_reason",
            [reason, id]
        );

        if (result.rows.length === 0) {
            return errorResponse(res, "Terminated supervisor not found", 404);
        }

        console.log(`[UpdateTerminationReason] Updated reason for supervisor ${id}: ${reason}`);
        return successResponse(res, "Termination reason updated successfully", {
            supervisor: {
                id: result.rows[0].id,
                name: result.rows[0].name,
                termination_reason: result.rows[0].termination_reason
            }
        });
    } catch (error) {
        console.error("[UpdateTerminationReason] Error:", error);
        return errorResponse(res, "Server error", 500);
    }
};

// Get Admin Profile
export const getAdminProfile = async (req, res) => {
    try {
        const adminId = req.user.id;

        const result = await pool.query(
            "SELECT id, name, email, created_at FROM admins WHERE id = $1",
            [adminId]
        );

        if (result.rows.length === 0) {
            return errorResponse(res, "Admin not found", 404);
        }

        const admin = result.rows[0];
        return successResponse(res, "Admin profile fetched successfully", {
            userData: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: "admin",
                created_at: admin.created_at
            }
        });
    } catch (error) {
        console.error("[GetAdminProfile] Error:", error);
        return errorResponse(res, "Server error", 500);
    }
};

// Update Admin Profile
export const updateAdminProfile = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { name, email } = req.body;

        const fields = [];
        const values = [];
        let idx = 1;

        if (name) {
            fields.push(`name = $${idx++}`);
            values.push(name);
        }
        if (email) {
            fields.push(`email = $${idx++}`);
            values.push(email);
        }

        if (fields.length === 0) {
            return errorResponse(res, "No fields to update");
        }

        values.push(adminId);
        const query = `UPDATE admins SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, name, email, created_at`;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return errorResponse(res, "Admin not found", 404);
        }

        const updatedAdmin = result.rows[0];
        return successResponse(res, "Admin profile updated successfully", {
            userData: {
                id: updatedAdmin.id,
                name: updatedAdmin.name,
                email: updatedAdmin.email,
                role: "admin",
                created_at: updatedAdmin.created_at
            }
        });
    } catch (error) {
        console.error("[UpdateAdminProfile] Error:", error);
        if (error.code === '23505') {
            if (error.detail.includes('email')) return errorResponse(res, "Email already in use");
        }
        return errorResponse(res, "Server error", 500);
    }
};

// Change Admin Password
export const changeAdminPassword = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { old_password, new_password } = req.body;

        if (!old_password || !new_password) {
            return errorResponse(res, "Old password and new password are required");
        }

        const result = await pool.query("SELECT password FROM admins WHERE id = $1", [adminId]);
        if (result.rows.length === 0) return errorResponse(res, "Admin not found");

        const admin = result.rows[0];
        const isMatch = await bcrypt.compare(old_password, admin.password);

        if (!isMatch) {
            return errorResponse(res, "Incorrect old password");
        }

        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(new_password, salt);

        await pool.query("UPDATE admins SET password = $1 WHERE id = $2", [newHash, adminId]);

        return successResponse(res, "Password changed successfully");
    } catch (error) {
        console.error("[ChangeAdminPassword] Error:", error);
        return errorResponse(res, "Server error", 500);
    }
};
