
import pool from "./src/config/db.js";

async function migrate() {
    try {
        console.log("Adding UNIQUE constraint to phone column in guards table...");

        // We first need to ensure there are no duplicates. 
        // If there are, this migration might fail. Ideally, we'd clean them up, but for now we'll just try to add the constraint.
        // In a real scenario, we might want to append IDs to duplicates or delete them.

        await pool.query(`
            ALTER TABLE guards 
            ADD CONSTRAINT guards_phone_key UNIQUE (phone);
        `);
        console.log("✅ UNIQUE constraint added to 'phone' column in guards table.");

        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        if (error.code === '23505') {
            console.error("Duplicate phone numbers found. Please resolve duplicates before running this migration.");
        }
        process.exit(1);
    }
}

migrate();
