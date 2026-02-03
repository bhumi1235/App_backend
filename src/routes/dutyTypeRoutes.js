import express from "express";
import { getAllDutyTypes, createDutyType } from "../controllers/dutyTypeController.js";

const router = express.Router();

router.get("/", getAllDutyTypes);
router.post("/", createDutyType);

export default router;
