import pool from "../config/db.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";

// Get all notifications
export const getNotifications = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM notifications ORDER BY created_at DESC"
        );
        return successResponse(res, "Notifications fetched successfully", result.rows);
    } catch (error) {
        console.error(error);
        return errorResponse(res, "Server error", 500);
    }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
    const { id } = req.params;
    try {
        if (id === "all") {
            await pool.query("UPDATE notifications SET is_read = TRUE");
            return successResponse(res, "All notifications marked as read");
        }

        await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1", [
            id,
        ]);
        return successResponse(res, "Notification marked as read");
    } catch (error) {
        console.error(error);
        return errorResponse(res, "Server error", 500);
    }
};
