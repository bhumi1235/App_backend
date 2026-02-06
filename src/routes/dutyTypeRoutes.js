import express from "express";
import { getAllDutyTypes, createDutyType, updateDutyType } from "../controllers/dutyTypeController.js";
import authenticateToken from "../middleware/authMiddleware.js";
import authenticateAdmin from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

router.get("/", authenticateToken, getAllDutyTypes); // Everyone can view
router.post("/", authenticateAdmin, createDutyType); // Only admin can create
router.put("/:id", authenticateAdmin, updateDutyType); // Only admin can update

export default router;
