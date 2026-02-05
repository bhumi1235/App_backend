import express from "express";
import { getDashboardStats, getAllSupervisors, createAdmin, login } from "../controllers/adminController.js";
import authenticateAdmin from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

router.post("/login", login);

router.use(authenticateAdmin);

router.get("/dashboard", getDashboardStats);
router.get("/supervisors", getAllSupervisors);
router.post("/create-admin", createAdmin); // Optional helper to bootstrap more admins

export default router;
