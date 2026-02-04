import pool from "../config/db.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";

// Helper to format Supervisor ID
const formatSupervisorId = (id) => `SPR${String(id).padStart(3, '0')}`;

// Helper to format Guard ID
const formatGuardId = (id) => `G${String(id).padStart(3, '0')}`;

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
            duty_type_id,
            duty_start_time,
            duty_end_time,
            working_location,
            work_experience,
            reference_by,
            emergency_contact_name_1,
            emergency_contact_phone_1,
            emergency_contact_name_2,
            emergency_contact_phone_2
        } = req.body;

        // Validate Duty Type ID
        const dutyTypeCheck = await client.query("SELECT * FROM duty_types WHERE id = $1", [duty_type_id]);
        if (dutyTypeCheck.rows.length === 0) {
            await client.query("ROLLBACK");
            return errorResponse(res, "Invalid duty type selected");
        }

        // Handle Profile Photo (Support both keys)
        let profile_photo = null;
        if (req.files) {
            if (req.files["profileimage"]) {
                profile_photo = req.files["profileimage"][0].filename;
            } else if (req.files["profile_photo"]) {
                profile_photo = req.files["profile_photo"][0].filename;
            }
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
            duty_type_id, duty_start_time, duty_end_time, working_location, work_experience, reference_by,
            supervisor_id, local_guard_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id, local_guard_id`,
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

        // Create Notification linked to Supervisor
        if (supervisor_id) {
            await client.query(
                "INSERT INTO notifications (type, message, supervisor_id) VALUES ($1, $2, $3)",
                ["GUARD_ADDED", `New guard added: ${name}`, supervisor_id]
            );
        }

        // Fetch Supervisor Name (Logged-in User)
        let supervisorName = "Unknown";
        if (req.user && req.user.id) {
            const supervisorResult = await client.query("SELECT name FROM employees WHERE id = $1", [req.user.id]);
            if (supervisorResult.rows.length > 0) {
                supervisorName = supervisorResult.rows[0].name;
            }
        }

        // Fetch Duty Type Name
        const dutyTypeResult = await client.query("SELECT name FROM duty_types WHERE id = $1", [duty_type_id]);
        const duty_type_name = dutyTypeResult.rows[0]?.name || "Unknown";

        await client.query("COMMIT");

        return successResponse(res, "Guard added successfully", {
            guardData: {
                guardID: formatGuardId(localGuardId || guardId),
                supervisorID: req.user ? formatSupervisorId(req.user.id) : null,
                supervisorName,
                name,
                phone,
                email,
                profile_photo,
                current_address,
                permanent_address,
                date_of_joining: new Date(), // Approximate for immediate response
                duty_start_time,
                duty_end_time,
                duty_type_name,
                assigned_location: working_location,
                work_experience,
                reference_by,
                emergency_contact_name_1,
                emergency_contact_phone_1,
                emergency_contact_name_2,
                emergency_contact_phone_2,
                emergency_address,
                documents: uploadedDocuments
            }
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
        const supervisor_id = req.user.id;

        let query = `
            SELECT g.*, dt.name as duty_type_name 
            FROM guards g 
            LEFT JOIN duty_types dt ON g.duty_type_id = dt.id
            WHERE g.supervisor_id = $1`;
        let params = [supervisor_id];

        if (search) {
            query += " AND g.name ILIKE $2";
            params.push(`%${search}%`);
        }

        query += " ORDER BY g.local_guard_id ASC"; // Order sequentially 1, 2, 3...

        const result = await pool.query(query, params);

        // Format IDs in response
        const formattedGuards = result.rows.map(guard => ({
            guardData: {
                guardID: formatGuardId(guard.local_guard_id || guard.id),
                supervisorID: req.user ? formatSupervisorId(req.user.id) : null, // Assuming context or skip
                name: guard.name,
                phone: guard.phone,
                email: guard.email,
                profile_photo: guard.profile_photo,
                current_address: guard.current_address,
                permanent_address: guard.permanent_address,
                date_of_joining: guard.created_at,
                duty_start_time: guard.duty_start_time,
                duty_end_time: guard.duty_end_time,
                duty_type_name: guard.duty_type_name,
                assigned_location: guard.working_location,
                work_experience: guard.work_experience,
                reference_by: guard.reference_by,
                // Status removed
            }
        }));

        if (result.rows.length === 0) {
            return successResponse(res, "No guards found for this supervisor", { guards: [] });
        }

        return successResponse(res, "Guards fetched successfully", { guards: formattedGuards });
    } catch (error) {
        console.error(error);
        return errorResponse(res, "Server error", 500);
    }
};

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
            guardData: {
                guardID: formatGuardId(guard.local_guard_id),
                name: guard.name,
                phone: guard.phone,
                email: guard.email,
                profile_photo: guard.profile_photo,
                current_address: guard.current_address,
                permanent_address: guard.permanent_address,
                date_of_joining: guard.created_at,
                duty_start_time: guard.duty_start_time,
                duty_end_time: guard.duty_end_time,
                duty_type_name: guard.duty_type_name,
                assigned_location: guard.working_location,
                work_experience: guard.work_experience,
                reference_by: guard.reference_by,
                // Status removed
                emergency_contact_name_1: contacts[0]?.name || null,
                emergency_contact_phone_1: contacts[0]?.phone || null,
                emergency_contact_name_2: contacts[1]?.name || null,
                emergency_contact_phone_2: contacts[1]?.phone || null,
                emergency_address: guard.emergency_address,
                documents: documentsResult.rows.map(doc => doc.file_path)
            }
        };

        return successResponse(res, "Guard details fetched successfully", responseData);
    } catch (error) {
        console.error(error);
        return errorResponse(res, "Server error", 500);
    }
};

// Edit Guard
export const editGuard = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params; // local_guard_id
        const supervisor_id = req.user ? req.user.id : null;

        if (!supervisor_id) {
            client.release();
            return errorResponse(res, "Unauthorized: Supervisor ID missing", 401);
        }

        await client.query("BEGIN");

        // NOTE: We update by local_guard_id + supervisor_id
        // First get the real ID to update related tables
        const guardQuery = `SELECT id FROM guards WHERE local_guard_id = $1 AND supervisor_id = $2`;
        const guardResult = await client.query(guardQuery, [id, supervisor_id]);

        if (guardResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return errorResponse(res, "Guard not found", 404);
        }

        const realGuardId = guardResult.rows[0].id;

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
            emergency_contact_phone_2
        } = req.body;

        // Update Guard Fields
        const updates = [];
        const values = [];
        let idx = 1;

        const addField = (col, val) => {
            if (val !== undefined) {
                updates.push(`${col} = $${idx++}`);
                values.push(val);
            }
        };

        addField("name", name);
        addField("phone", phone);
        addField("email", email);
        addField("current_address", current_address);
        addField("permanent_address", permanent_address);
        addField("emergency_address", emergency_address);
        addField("duty_type_id", duty_type_id);
        addField("duty_start_time", duty_start_time);
        addField("duty_end_time", duty_end_time);
        addField("working_location", working_location);
        addField("work_experience", work_experience);
        addField("reference_by", reference_by);

        if (req.files && req.files["profile_photo"]) {
            addField("profile_photo", req.files["profile_photo"][0].filename);
        }

        if (updates.length > 0) {
            values.push(realGuardId);
            await client.query(
                `UPDATE guards SET ${updates.join(", ")} WHERE id = $${idx}`,
                values
            );
        }

        // Update Emergency Contacts (Delete all and re-insert is simpler)
        if (emergency_contact_name_1 || emergency_contact_name_2) {
            await client.query("DELETE FROM emergency_contacts WHERE guard_id = $1", [realGuardId]);

            if (emergency_contact_name_1 && emergency_contact_phone_1) {
                await client.query(
                    "INSERT INTO emergency_contacts (guard_id, name, phone) VALUES ($1, $2, $3)",
                    [realGuardId, emergency_contact_name_1, emergency_contact_phone_1]
                );
            }
            if (emergency_contact_name_2 && emergency_contact_phone_2) {
                await client.query(
                    "INSERT INTO emergency_contacts (guard_id, name, phone) VALUES ($1, $2, $3)",
                    [realGuardId, emergency_contact_name_2, emergency_contact_phone_2]
                );
            }
        }

        // Documents (Append new documents)
        if (req.files && req.files["documents"]) {
            for (const file of req.files["documents"]) {
                await client.query(
                    "INSERT INTO documents (guard_id, file_path, original_name) VALUES ($1, $2, $3)",
                    [realGuardId, file.filename, file.originalname]
                );
            }
        }

        await client.query("COMMIT");

        // Return updated details logic (reuse formatted response logic if possible, or just message)
        // User asked for "Edit" api, usually implies returning the updated object or just success.
        // Assuming success message is sufficient for now, or minimal data.
        return successResponse(res, "Guard details updated successfully");

    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        return errorResponse(res, "Server error", 500);
    } finally {
        client.release();
    }
};
