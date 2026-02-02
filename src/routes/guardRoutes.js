import express from "express";
import { addGuard, getAllGuards, getGuardById } from "../controllers/guardController.js";
import authenticateToken from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

router.post(
    "/",
    upload.fields([
        { name: "profile_photo", maxCount: 1 },
        { name: "documents", maxCount: 10 },
    ]),
    addGuard
);
router.get("/", getAllGuards);
router.get("/:id", getGuardById);

export default router;
