import pool from "../config/db.js";

// Get all notifications
export const getNotifications = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM notifications ORDER BY created_at DESC"
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
    const { id } = req.params;
    try {
        if (id === "all") {
            await pool.query("UPDATE notifications SET is_read = TRUE");
            return res.json({ message: "All notifications marked as read" });
        }

        await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1", [
            id,
        ]);
        res.json({ message: "Notification marked as read" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
