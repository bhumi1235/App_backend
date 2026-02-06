import pool from "./src/config/db.js";
import bcrypt from "bcryptjs";

async function checkAdmins() {
    try {
        console.log("Checking admins table...");
        const res = await pool.query("SELECT id, name, email, password FROM admins");
        console.log("Found admins:", res.rows.length);
        res.rows.forEach(admin => {
            console.log(`- ID: ${admin.id}, Email: ${admin.email}, Hash: ${admin.password ? 'Present' : 'Missing'}`);
        });

        // Test login for admin@example.com
        const email = "admin@example.com";
        const password = "admin123";

        const admin = res.rows.find(a => a.email === email);
        if (admin) {
            console.log(`Testing password '${password}' for ${email}...`);
            const isMatch = await bcrypt.compare(password, admin.password);
            console.log(`Password Match: ${isMatch}`);

            if (!isMatch) {
                console.log("Resetting password to 'admin123'...");
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                await pool.query("UPDATE admins SET password = $1 WHERE id = $2", [hashedPassword, admin.id]);
                console.log("Password reset successful.");
            }
        } else {
            console.log(`Admin ${email} not found. Creating...`);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            await pool.query(
                "INSERT INTO admins (name, email, password) VALUES ($1, $2, $3)",
                ["Admin User", email, hashedPassword]
            );
            console.log("Admin created successfully.");
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        pool.end();
    }
}

checkAdmins();
