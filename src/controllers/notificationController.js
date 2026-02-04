import pool from "../config/db.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";

// Get all notifications for logged-in supervisor
export const getNotifications = async (req, res) => {
    try {
        const supervisor_id = req.user.id;
        const result = await pool.query(
            "SELECT * FROM notifications WHERE supervisor_id = $1 ORDER BY created_at DESC",
            [supervisor_id]
        );
        // Return empty list if none found (standard behavior)
        return successResponse(res, "Notifications fetched successfully", { notifications: result.rows });
    } catch (error) {
        console.error(error);
        return errorResponse(res, "Server error", 500);
    }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
    const { id } = req.params;
    const supervisor_id = req.user.id;
    try {
        if (id === "all") {
            await pool.query("UPDATE notifications SET is_read = TRUE WHERE supervisor_id = $1", [supervisor_id]);
            return successResponse(res, "All notifications marked as read");
        }

        await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1 AND supervisor_id = $2", [
            id, supervisor_id
        ]);
        return successResponse(res, "Notification marked as read");
    } catch (error) {
        console.error(error);
        return errorResponse(res, "Server error", 500);
    }
};

// Delete one notification
export const deleteNotification = async (req, res) => {
    const { id } = req.params;
    const supervisor_id = req.user.id;
    try {
        const result = await pool.query("DELETE FROM notifications WHERE id = $1 AND supervisor_id = $2 RETURNING *", [id, supervisor_id]);
        if (result.rows.length === 0) {
            return errorResponse(res, "Notification not found or unauthorized", 404);
        }
        return successResponse(res, "Notification deleted successfully");
    } catch (error) {
        console.error(error);
        return errorResponse(res, "Server error", 500);
    }
};

// Delete all notifications
export const deleteAllNotifications = async (req, res) => {
    const supervisor_id = req.user.id;
    try {
        await pool.query("DELETE FROM notifications WHERE supervisor_id = $1", [supervisor_id]);
        return successResponse(res, "All notifications deleted successfully");
    } catch (error) {
        console.error(error);
        return errorResponse(res, "Server error", 500);
    }
};
