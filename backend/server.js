import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import attendanceRoutes from "./routes/attendance.js";
import adminRoutes from "./routes/admin.js";
import studentRoutes from "./routes/student.js";
import authRoutes from "./routes/auth.js";
import { getCurrentSession, getUpcomingSession, serializeSession } from "./utils/session.js";

const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.json({
    name: "PBL Attendance API",
    status: "ok",
    docs: "/api/health",
    timestamp: new Date().toISOString(),
  });
});
app.get("/api/health", (req, res) => {
  const state = mongoose.connection.readyState;
  const dbState = state === 1 ? "connected" : "disconnected";
  res.json({ status: "ok", db: dbState, timestamp: new Date().toISOString() });
});

app.use("/api/attendance", attendanceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/auth", authRoutes);
app.get("/api/session/active", async (req, res) => {
  try {
    const current = await getCurrentSession();
    const upcoming = await getUpcomingSession();

    if (!current) {
      return res.json({
        active: false,
        session: null,
        nextSession: upcoming ? serializeSession(upcoming) : null,
      });
    }

    res.json({
      active: true,
      session: serializeSession(current),
      nextSession: upcoming ? serializeSession(upcoming) : null,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get session" });
  }
});

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
  }
  const PORT = process.env.PORT || 5050;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});
