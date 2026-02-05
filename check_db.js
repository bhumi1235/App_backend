import pool from "./src/config/db.js";

const checkDb = async () => {
    try {
        const admins = await pool.query("SELECT COUNT(*) FROM admins");
        const employees = await pool.query("SELECT COUNT(*) FROM employees");

        console.log(`✅ DATABASE STATUS:`);
        console.log(`   - Admins Count: ${admins.rows[0].count}`);
        console.log(`   - Employees Count: ${employees.rows[0].count}`);
    } catch (error) {
        console.error("Error checking DB:", error);
    } finally {
        process.exit();
    }
};

checkDb();
