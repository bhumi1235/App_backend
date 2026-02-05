import express from "express";
import { getAllDutyTypes, createDutyType } from "../controllers/dutyTypeController.js";
import authenticateToken from "../middleware/authMiddleware.js";

import { requireRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(authenticateToken); // Protect all routes

router.get("/", getAllDutyTypes);
router.post("/", requireRole("admin"), createDutyType);

export default router;
