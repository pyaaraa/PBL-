import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import attendanceRoutes from "./routes/attendance.js";
import adminRoutes from "./routes/admin.js";

const app = express();
app.use(cors());
app.use(express.json());
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/attendance", attendanceRoutes);
app.use("/api/admin", adminRoutes);
app.get("/api/session/active", async (req, res) => {
  try {
    const SessionMetadata = (await import("./models/SessionMetadata.js")).default;
    const session = await SessionMetadata.findOne({ active: true })
      .sort({ createdAt: -1 })
      .lean();
    if (!session) return res.json({ active: false });
    if (new Date() > session.expiryTime) {
      await SessionMetadata.updateOne({ _id: session._id }, { active: false });
      return res.json({ active: false });
    }
    res.json({
      active: true,
      sessionId: session.sessionId,
      expiryTime: session.expiryTime,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get session" });
  }
});

async function start() {
  await connectDB();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});
