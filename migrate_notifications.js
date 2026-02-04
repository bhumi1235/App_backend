
import pool from "./src/config/db.js";

async function migrate() {
    try {
        console.log("Adding supervisor_id column to notifications table...");
        await pool.query(`
            ALTER TABLE notifications 
            ADD COLUMN IF NOT EXISTS supervisor_id INTEGER REFERENCES employees(id) ON DELETE CASCADE;
        `);
        console.log("✅ Column 'supervisor_id' added successfully.");

        // Optional: Clear old notifications to avoid orphaned data confusion?
        // await pool.query("DELETE FROM notifications WHERE supervisor_id IS NULL");

        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

migrate();
