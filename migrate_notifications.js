
import pool from "./src/config/db.js";

async function migrate() {
    try {
        console.log("Adding supervisor_id and local_notification_id to notifications table...");

        await pool.query(`
            ALTER TABLE notifications 
            ADD COLUMN IF NOT EXISTS supervisor_id INTEGER REFERENCES employees(id) ON DELETE CASCADE;
        `);
        console.log("✅ Column 'supervisor_id' added (or exists).");

        await pool.query(`
            ALTER TABLE notifications 
            ADD COLUMN IF NOT EXISTS local_notification_id INTEGER DEFAULT 1;
        `);
        console.log("✅ Column 'local_notification_id' added (or exists).");

        // Optional: Backfill local_notification_id for existing records if needed?
        // Since prior records had no supervisor_id, they might be orphaned or need complex logic.
        // Assuming fresh start or acceptable state for this update.

        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

migrate();
