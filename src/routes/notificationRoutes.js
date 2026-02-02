import express from "express";
import { getNotifications, markAsRead } from "../controllers/notificationController.js";
import authenticateToken from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/", getNotifications);
router.put("/:id/read", markAsRead);

export default router;
