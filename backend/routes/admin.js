import { Router } from "express";
import SessionMetadata from "../models/SessionMetadata.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import AuditLog from "../models/AuditLog.js";

const router = Router();


router.get("/sessions", async (req, res) => {
  try {
    const activeOnly = req.query.active === "true";
    const query = activeOnly ? { active: true } : {};
    const sessions = await SessionMetadata.find(query).sort({ createdAt: -1 }).lean();
    res.json({ sessions });
  } catch (err) {
    console.error("admin sessions error:", err);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});


router.post("/sessions", async (req, res) => {
  try {
    const durationMs = 2 * 60 * 60 * 1000; // 2 hours
    const createdAt = new Date();
    const expiryTime = new Date(createdAt.getTime() + durationMs);
    const sessionId = `S${Date.now()}`;
    await SessionMetadata.updateMany({}, { $set: { active: false } });

    await SessionMetadata.create({
      sessionId,
      createdAt,
      expiryTime,
      active: true,
    });

    res.status(201).json({
      sessionId,
      createdAt: createdAt.toISOString(),
      expiryTime: expiryTime.toISOString(),
      active: true,
    });
  } catch (err) {
    console.error("admin create session error:", err);
    res.status(500).json({ error: "Failed to create session" });
  }
});


router.get("/attendance", async (req, res) => {
  try {
    const { campus, branch, section, sessionId } = req.query;
    const filter = {};
    if (campus) filter.campus = campus;
    if (branch) filter.branch = branch;
    if (section) filter.section = section;
    if (sessionId) {
      const session = await SessionMetadata.findOne({ sessionId }).select("_id").lean();
      if (session) filter.sessionId = session._id;
    }

    const records = await AttendanceRecord.find(filter)
      .populate("sessionId", "sessionId createdAt expiryTime")
      .sort({ timestamp: -1 })
      .lean();

    res.json({ attendance: records });
  } catch (err) {
    console.error("admin attendance error:", err);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});


router.get("/attendance/export", async (req, res) => {
  try {
    const { campus, branch, section, sessionId } = req.query;
    const filter = { status: "present" };
    if (campus) filter.campus = campus;
    if (branch) filter.branch = branch;
    if (section) filter.section = section;
    if (sessionId) {
      const session = await SessionMetadata.findOne({ sessionId }).select("_id").lean();
      if (session) filter.sessionId = session._id;
    }

    const records = await AttendanceRecord.find(filter)
      .populate("sessionId", "sessionId createdAt expiryTime")
      .sort({ timestamp: 1 })
      .lean();

    const headers = [
      "Registration Number",
      "Campus",
      "Branch",
      "Section",
      "Wallet Address",
      "Session ID",
      "Timestamp",
      "Status",
    ];
    const rows = records.map((r) => [
      r.registrationNumber,
      r.campus,
      r.branch,
      r.section,
      r.walletAddress,
      r.sessionId?.sessionId ?? "",
      r.timestamp ? new Date(r.timestamp).toISOString() : "",
      r.status,
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=attendance-${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    console.error("admin export error:", err);
    res.status(500).json({ error: "Failed to export attendance" });
  }
});


router.get("/audit", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(limit).lean();
    res.json({ logs });
  } catch (err) {
    console.error("admin audit error:", err);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});

export default router;
