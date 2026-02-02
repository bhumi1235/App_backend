import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import guardRoutes from "./routes/guardRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import errorHandler from "./middleware/errorMiddleware.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
    res.send("API is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/guards", guardRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(errorHandler);

export default app;

