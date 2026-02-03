import pool from "../config/db.js";
import { successResponse, errorResponse } from "../utils/responseHandler.js";

// Get all duty types
export const getAllDutyTypes = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM duty_types ORDER BY name ASC");
        return successResponse(res, "Duty types fetched successfully", { duty_types: result.rows });
    } catch (error) {
        console.error(error);
        return errorResponse(res, "Server Error", 500);
    }
};

// Create a new duty type
export const createDutyType = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return errorResponse(res, "Duty type name is required");

        const result = await pool.query(
            "INSERT INTO duty_types (name) VALUES ($1) RETURNING *",
            [name]
        );
        return successResponse(res, "Duty type created successfully", { duty_type: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
            return errorResponse(res, "Duty type already exists");
        }
        console.error(error);
        return errorResponse(res, "Server Error", 500);
    }
};
