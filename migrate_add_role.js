import pool from "./src/config/db.js";

const migrate = async () => {
    try {
        await pool.query("ALTER TABLE employees ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'supervisor'");
        console.log("Migration successful: Added role column to employees table.");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        process.exit();
    }
};

migrate();
