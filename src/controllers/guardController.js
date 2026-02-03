import pool from "../config/db.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";

// Add a new guard
export const addGuard = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // ... (rest of function body remains same until response)

        const {
            name,
            phone,
            email,
            current_address,
            permanent_address,
            emergency_address,
            duty_type_id,
            duty_start_time,
            duty_end_time,
            working_location,
            work_experience,
            reference_by,
            emergency_contact_name_1,
            emergency_contact_phone_1,
            emergency_contact_name_2,
            emergency_contact_phone_2,
            status
        } = req.body;

        // Validate Duty Type ID
        const dutyTypeCheck = await client.query("SELECT * FROM duty_types WHERE id = $1", [duty_type_id]);
        if (dutyTypeCheck.rows.length === 0) {
            await client.query("ROLLBACK");
            return errorResponse(res, "Invalid duty type selected");
        }

        // Handle Profile Photo
        let profile_photo = null;
        if (req.files && req.files["profile_photo"]) {
            profile_photo = req.files["profile_photo"][0].filename;
        }

        // Insert Guard (using duty_type_id)
        const guardResult = await client.query(
            `INSERT INTO guards (
            name, profile_photo, phone, email, current_address, permanent_address, emergency_address,
            duty_type_id, duty_start_time, duty_end_time, working_location, work_experience, reference_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
            [
                name,
                profile_photo,
                phone,
                email,
                current_address,
                permanent_address,
                emergency_address,
                duty_type_id,
                duty_start_time,
                duty_end_time,
                working_location,
                work_experience,
                reference_by,
                status !== undefined ? status : true // Default to true if missing
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
        const uploadedDocuments = [];
        if (req.files && req.files["documents"]) {
            for (const file of req.files["documents"]) {
                await client.query(
                    "INSERT INTO documents (guard_id, file_path, original_name) VALUES ($1, $2, $3)",
                    [guardId, file.filename, file.originalname]
                );
                uploadedDocuments.push({
                    file_path: file.filename,
                    original_name: file.originalname
                });
            }
        }

        // Create Notification
        await client.query(
            "INSERT INTO notifications (type, message) VALUES ($1, $2)",
            ["GUARD_ADDED", `New guard added: ${name}`]
        );

        // Fetch Supervisor Name (Logged-in User)
        let supervisorName = "Unknown";
        if (req.user && req.user.id) {
            const supervisorResult = await client.query("SELECT name FROM employees WHERE id = $1", [req.user.id]);
            if (supervisorResult.rows.length > 0) {
                supervisorName = supervisorResult.rows[0].name;
            }
        }

        await client.query("COMMIT");

        // Helper to format Supervisor ID
        const formatSupervisorId = (id) => `SPR${String(id).padStart(3, '0')}`;

        // Helper to format Guard ID (can be moved to utils for reuse)
        const formatGuardId = (id) => `GRD${String(id).padStart(3, '0')}`;

        return successResponse(res, "Guard added successfully", {
            guardID: formatGuardId(guardId),
            supervisorID: req.user ? formatSupervisorId(req.user.id) : null,
            supervisorName,
            profile_photo: profile_photo,
            documents: uploadedDocuments
        }, 201); // 201 Created

    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        return errorResponse(res, "Server error", 500);
    } finally {
        client.release();
    }
};

// Get all guards (with search)
export const getAllGuards = async (req, res) => {
    const { search } = req.query;
    try {
        let query = `
            SELECT g.*, dt.name as duty_type_name 
            FROM guards g 
            LEFT JOIN duty_types dt ON g.duty_type_id = dt.id`;
        let params = [];

        if (search) {
            query += " WHERE g.name ILIKE $1";
            params.push(`%${search}%`);
        }

        query += " ORDER BY g.created_at DESC";

        const result = await pool.query(query, params);

        // Format IDs in response
        const formattedGuards = result.rows.map(guard => ({
            ...guard,
            guardID: `GRD${String(guard.id).padStart(3, '0')}`,
            // Removing raw id might break frontend if it relies on it, but user asked to REPLACE it.
            // Keeping raw id hidden or removed? "instead of id, make it guardID" implies replacement.
            // I'll keep raw id as well for safety unless explicit, OR just add guardID. 
            // User said "replace normal serial number id at all places".
            // So I will remove `id` or just overwrite it? 
            // Safe bet: Add guardID, maybe keep id for internal use if needed, but for "make it guardID" request:
            id: undefined, // Explicitly remove raw id
            guardID: `GRD${String(guard.id).padStart(3, '0')}`
        }));

        res.json(formattedGuards);
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
            id: undefined, // Remove raw ID
            guardID: `GRD${String(guard.id).padStart(3, '0')}`,
            emergency_contacts: contactsResult.rows,
            documents: documentsResult.rows,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
