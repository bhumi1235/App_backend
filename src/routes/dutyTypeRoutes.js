import express from "express";
import { getAllDutyTypes, createDutyType, updateDutyType } from "../controllers/dutyTypeController.js";
//import authenticateToken from "../middleware/authMiddleware.js";
//import authenticateAdmin from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

router.get("/", getAllDutyTypes); // Everyone can view
router.post("/", createDutyType); // Only admin can create
router.put("/:id", updateDutyType); // Only admin can update

export default router;
