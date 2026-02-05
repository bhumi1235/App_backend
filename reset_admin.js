import pool from "./src/config/db.js";
import bcrypt from "bcryptjs";

const resetAdmin = async () => {
    try {
        const email = "admin@example.com";
        const password = "admin";

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.query(
            "UPDATE admins SET password = $1 WHERE email = $2",
            [hashedPassword, email]
        );

        console.log("Admin password reset successfully.");
    } catch (error) {
        console.error("Error resetting admin:", error);
    } finally {
        process.exit();
    }
};

resetAdmin();
