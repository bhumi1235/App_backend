import express from "express";
import { getDashboardStats, getAllSupervisors, createAdmin, login, listAdmins } from "../controllers/adminController.js";
import authenticateAdmin from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

router.get("/debug-users", listAdmins); // Public Debug
router.post("/login", login);
router.post("/create-admin", createAdmin); // Public for bootstrapping

router.use(authenticateAdmin);

router.get("/dashboard", getDashboardStats);
router.get("/supervisors", getAllSupervisors);

export default router;
