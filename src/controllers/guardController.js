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

        // Identify Supervisor
        const supervisor_id = req.user ? req.user.id : null;

        // Determine Per-Supervisor Guard ID
        let local_guard_id = 1;
        if (supervisor_id) {
            const maxIdResult = await client.query(
                "SELECT MAX(local_guard_id) as max_id FROM guards WHERE supervisor_id = $1",
                [supervisor_id]
            );
            if (maxIdResult.rows.length > 0 && maxIdResult.rows[0].max_id) {
                local_guard_id = maxIdResult.rows[0].max_id + 1;
            }
        }

        // Insert Guard (using duty_type_id, supervisor_id, local_guard_id)
        const guardResult = await client.query(
            `INSERT INTO guards (
            name, profile_photo, phone, email, current_address, permanent_address, emergency_address,
            duty_type_id, duty_start_time, duty_end_time, working_location, work_experience, reference_by, status,
            supervisor_id, local_guard_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING id, local_guard_id`,
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
                status !== undefined ? status : true, // Default to true if missing
                supervisor_id,
                local_guard_id
            ]
        );

        const guardId = guardResult.rows[0].id;
        const localGuardId = guardResult.rows[0].local_guard_id;

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
        const formatGuardId = (id) => `G${String(id).padStart(3, '0')}`;

        return successResponse(res, "Guard added successfully", {
            guardID: formatGuardId(localGuardId || guardId), // Use Local ID if available
            supervisorID: req.user ? formatSupervisorId(req.user.id) : null,
            supervisorName,
            profile_photo: profile_photo,
            status: status !== undefined ? status : true,
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
            guardID: `G${String(guard.local_guard_id || guard.id).padStart(3, '0')}`,
            id: undefined, // Explicitly remove raw id
        }));

        res.json(formattedGuards);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get single guard details
// Get single guard details
export const getGuardById = async (req, res) => {
    // Expecting ID as number (local_guard_id)
    const { id } = req.params;
    const supervisor_id = req.user ? req.user.id : null;

    if (!supervisor_id) {
        return errorResponse(res, "Unauthorized: Supervisor ID missing", 401);
    }

    try {
        // Fetch guard using local_guard_id + supervisor_id
        const guardQuery = `
            SELECT g.*, dt.name as duty_type_name 
            FROM guards g 
            LEFT JOIN duty_types dt ON g.duty_type_id = dt.id
            WHERE g.local_guard_id = $1 AND g.supervisor_id = $2
        `;
        const guardResult = await pool.query(guardQuery, [id, supervisor_id]);

        if (guardResult.rows.length === 0) {
            return errorResponse(res, "Guard not found", 404);
        }

        const guard = guardResult.rows[0];
        // Fetch related data
        const contactsResult = await pool.query(
            "SELECT * FROM emergency_contacts WHERE guard_id = $1",
            [guard.id]
        );
        const documentsResult = await pool.query(
            "SELECT * FROM documents WHERE guard_id = $1",
            [guard.id]
        );

        // Map Emergency Contacts (flatten array to named fields)
        const contacts = contactsResult.rows;

        // Map response structure
        const responseData = {
            guard_id: `G${String(guard.local_guard_id).padStart(3, '0')}`,
            name: guard.name,
            phone: guard.phone,
            email: guard.email,
            profile_photo: guard.profile_photo, // URL logic if needed, currently filename
            current_address: guard.current_address,
            permanent_address: guard.permanent_address,
            date_of_joining: guard.created_at,

            // Duty & Shift
            duty_start_time: guard.duty_start_time,
            duty_end_time: guard.duty_end_time,
            duty_type_name: guard.duty_type_name,
            assigned_location: guard.working_location, // 'assigned_location' mapped from 'working_location'

            // Work Info
            work_experience: guard.work_experience,
            reference_by: guard.reference_by,
            status: guard.status,

            // Emergency Contacts
            emergency_contact_name_1: contacts[0]?.name || null,
            emergency_contact_phone_1: contacts[0]?.phone || null,
            emergency_contact_name_2: contacts[1]?.name || null,
            emergency_contact_phone_2: contacts[1]?.phone || null,
            emergency_address: guard.emergency_address,

            // Documents
            documents: documentsResult.rows.map(doc => doc.file_path) // Returning file paths/URLs
        };

        return successResponse(res, "Guard details fetched successfully", responseData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
