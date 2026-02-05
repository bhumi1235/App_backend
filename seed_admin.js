import pool from "./src/config/db.js";
import bcrypt from "bcryptjs";

const seedAdmin = async () => {
    try {
        const email = "admin@example.com";
        const password = "admin";
        const name = "Super Admin";

        // Check if exists
        const check = await pool.query("SELECT * FROM admins WHERE email = $1", [email]);
        if (check.rows.length > 0) {
            console.log("Admin already exists.");
            process.exit();
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.query(
            "INSERT INTO admins (name, email, password) VALUES ($1, $2, $3)",
            [name, email, hashedPassword]
        );

        console.log("Admin created successfully.");
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
    } catch (error) {
        console.error("Error seeding admin:", error);
    } finally {
        process.exit();
    }
};

seedAdmin();
