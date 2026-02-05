import pool from "./src/config/db.js";

const debugSupervisors = async () => {
    try {
        const result = await pool.query(
            "SELECT id, name, email, phone, created_at, profile_photo, 'Active' as status FROM employees ORDER BY created_at DESC"
        );
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        process.exit();
    }
};

debugSupervisors();
