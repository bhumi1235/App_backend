import pool from "./src/config/db.js";

async function checkSchema() {
    try {
        console.log("Checking employees table schema...");
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'employees'
        `);
        console.log("Columns:", res.rows.map(r => r.column_name).join(", "));

        // Fix: Add status column if missing
        const hasStatus = res.rows.some(r => r.column_name === 'status');
        if (!hasStatus) {
            console.log("Adding status column...");
            await pool.query("ALTER TABLE employees ADD COLUMN status VARCHAR(50) DEFAULT 'Active'");
            console.log("Status column added.");
        } else {
            console.log("Status column already exists.");
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        pool.end();
    }
}

checkSchema();
