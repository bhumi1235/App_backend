import express from "express";
import { getDashboardStats, getAllSupervisors, getSupervisorById, getSupervisorGuards, updateSupervisorStatus, updateSupervisor, deleteSupervisor, createAdmin, login, listAdmins, getAdminProfile, updateAdminProfile, changeAdminPassword } from "../controllers/adminController.js";
import authenticateAdmin from "../middleware/adminAuthMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import { validateUpdateSupervisor } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.get("/debug-users", listAdmins); // Public Debug
router.post("/login", login);
router.post("/create-admin", createAdmin); // Public for bootstrapping

router.use(authenticateAdmin);

router.get("/dashboard", getDashboardStats);
router.get("/supervisors", getAllSupervisors);
router.get("/supervisors/:id", getSupervisorById);
router.get("/supervisors/:id/guards", getSupervisorGuards);
router.put("/supervisors/:id", upload.single("profile_photo"), validateUpdateSupervisor, updateSupervisor);
router.put("/supervisors/:id/status", updateSupervisorStatus);
router.delete("/supervisors/:id", deleteSupervisor);

// Admin Profile Management
router.get("/profile", getAdminProfile);
router.put("/profile", updateAdminProfile);
router.put("/change-password", changeAdminPassword);

export default router;
