import pool from "../config/db.js";

const migrateDeviceInfo = async () => {
    try {
        console.log("Adding device info columns to employees table...");

        await pool.query(`
            ALTER TABLE employees 
            ADD COLUMN IF NOT EXISTS player_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS device_type VARCHAR(50);
        `);

        console.log("Migration completed: player_id and device_type columns added.");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await pool.end();
    }
};

migrateDeviceInfo();
