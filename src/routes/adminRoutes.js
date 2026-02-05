import express from "express";
import { getDashboardStats, getAllSupervisors, getSupervisorById, getSupervisorGuards, createAdmin, login, listAdmins } from "../controllers/adminController.js";
import authenticateAdmin from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

router.get("/debug-users", listAdmins); // Public Debug
router.post("/login", login);
router.post("/create-admin", createAdmin); // Public for bootstrapping

router.use(authenticateAdmin);

router.get("/dashboard", getDashboardStats);
router.get("/supervisors", getAllSupervisors);
router.get("/supervisors/:id", getSupervisorById);
router.get("/supervisors/:id/guards", getSupervisorGuards);

export default router;
