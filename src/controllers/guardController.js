import pool from "../config/db.js";

// Add a new guard
export const addGuard = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const {
            name,
            phone,
            email,
            current_address,
            permanent_address,
            emergency_address,
            duty_type,
            duty_start_time,
            duty_end_time,
            working_location,
            work_experience,
            reference_by,
            emergency_contact_name_1,
            emergency_contact_phone_1,
            emergency_contact_name_2,
            emergency_contact_phone_2,
        } = req.body;

        // Handle Profile Photo
        let profile_photo = null;
        if (req.files && req.files["profile_photo"]) {
            profile_photo = req.files["profile_photo"][0].filename;
        }

        // Insert Guard
        const guardResult = await client.query(
            `INSERT INTO guards (
            name, profile_photo, phone, email, current_address, permanent_address, emergency_address,
            duty_type, duty_start_time, duty_end_time, working_location, work_experience, reference_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
            [
                name,
                profile_photo,
                phone,
                email,
                current_address,
                permanent_address,
                emergency_address,
                duty_type,
                duty_start_time,
                duty_end_time,
                working_location,
                work_experience,
                reference_by,
            ]
        );

        const guardId = guardResult.rows[0].id;

        // Insert Emergency Contacts
        if (emergency_contact_name_1 && emergency_contact_phone_1) {
            await client.query(
                "INSERT INTO emergency_contacts (guard_id, name, phone) VALUES ($1, $2, $3)",
                [guardId, emergency_contact_name_1, emergency_contact_phone_1]
            );
        }
        if (emergency_contact_name_2 && emergency_contact_phone_2) {
            await client.query(
                "INSERT INTO emergency_contacts (guard_id, name, phone) VALUES ($1, $2, $3)",
                [guardId, emergency_contact_name_2, emergency_contact_phone_2]
            );
        }

        // Insert Documents
        if (req.files && req.files["documents"]) {
            for (const file of req.files["documents"]) {
                await client.query(
                    "INSERT INTO documents (guard_id, file_path, original_name) VALUES ($1, $2, $3)",
                    [guardId, file.filename, file.originalname]
                );
            }
        }

        // Create Notification
        await client.query(
            "INSERT INTO notifications (type, message) VALUES ($1, $2)",
            ["GUARD_ADDED", `New guard added: ${name}`]
        );

        await client.query("COMMIT");
        res.status(201).json({ message: "Guard added successfully", guardId });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        res.status(500).json({ message: "Server error" });
    } finally {
        client.release();
    }
};

// Get all guards (with search)
export const getAllGuards = async (req, res) => {
    const { search } = req.query;
    try {
        let query = "SELECT * FROM guards";
        let params = [];

        if (search) {
            query += " WHERE name ILIKE $1";
            params.push(`%${search}%`);
        }

        query += " ORDER BY created_at DESC";

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get single guard details
export const getGuardById = async (req, res) => {
    const { id } = req.params;
    try {
        const guardResult = await pool.query("SELECT * FROM guards WHERE id = $1", [
            id,
        ]);

        if (guardResult.rows.length === 0) {
            return res.status(404).json({ message: "Guard not found" });
        }

        const guard = guardResult.rows[0];

        // Fetch related data
        const contactsResult = await pool.query(
            "SELECT * FROM emergency_contacts WHERE guard_id = $1",
            [id]
        );
        const documentsResult = await pool.query(
            "SELECT * FROM documents WHERE guard_id = $1",
            [id]
        );

        res.json({
            ...guard,
            emergency_contacts: contactsResult.rows,
            documents: documentsResult.rows,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
