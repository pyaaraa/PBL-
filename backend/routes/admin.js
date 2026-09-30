import { Router } from "express";
import SessionMetadata from "../models/SessionMetadata.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import AuditLog from "../models/AuditLog.js";
import {
  getSessionState,
  serializeSession,
  sessionRequiresLocation,
  sessionRequiresNetwork,
  syncSessionState,
} from "../utils/session.js";

const router = Router();

const CAMPUSES = ["Main Campus", "North Campus", "South Campus"];
const BRANCHES = ["CSE", "Cyber Security", "AI & ML", "Data Science"];
const SECTIONS = ["Section A", "Section B", "Section C"];
const VALIDATION_MODES = ["wallet", "wallet_location", "wallet_network", "wallet_location_network"];

function parseNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIpPrefixes(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function sanitizeSessionPayload(body = {}) {
  const createdAt = body.startTime ? new Date(body.startTime) : new Date();
  const durationMinutes = Math.min(Math.max(Number(body.durationMinutes) || 10, 5), 180);
  const startTime = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;
  const expiryTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
  const validationMode = VALIDATION_MODES.includes(body.validationMode) ? body.validationMode : "wallet";

  return {
    subject: String(body.subject || "General").trim() || "General",
    teacherName: String(body.teacherName || "Faculty").trim() || "Faculty",
    campus: CAMPUSES.includes(body.campus) ? body.campus : CAMPUSES[0],
    branch: BRANCHES.includes(body.branch) ? body.branch : BRANCHES[0],
    section: SECTIONS.includes(body.section) ? body.section : SECTIONS[0],
    roomLabel: String(body.roomLabel || "Classroom").trim() || "Classroom",
    notes: String(body.notes || "").trim(),
    startTime,
    expiryTime,
    durationMinutes,
    attendanceWindowMinutes: Math.min(
      Math.max(Number(body.attendanceWindowMinutes) || durationMinutes, 5),
      durationMinutes
    ),
    validationMode,
    geoLatitude: parseNumber(body.geoLatitude),
    geoLongitude: parseNumber(body.geoLongitude),
    geoRadiusMeters: Math.min(Math.max(parseNumber(body.geoRadiusMeters) || 75, 10), 2000),
    allowedIpPrefixes: parseIpPrefixes(body.allowedIpPrefixes),
  };
}


router.get("/sessions", async (req, res) => {
  try {
    const activeOnly = req.query.active === "true";
    const query = activeOnly ? { active: true } : {};
    const docs = await SessionMetadata.find(query).sort({ startTime: -1, createdAt: -1 });

    const sessionIds = docs.map((doc) => doc._id);
    const attendanceCounts = await AttendanceRecord.aggregate([
      { $match: { sessionId: { $in: sessionIds } } },
      { $group: { _id: "$sessionId", count: { $sum: 1 } } },
    ]);
    const countBySessionId = new Map(attendanceCounts.map((row) => [String(row._id), row.count]));

    const sessions = [];
    for (const doc of docs) {
      await syncSessionState(doc);
      sessions.push(
        serializeSession(doc, {
          attendanceCount: countBySessionId.get(String(doc._id)) || 0,
          requiresLocation: sessionRequiresLocation(doc),
          requiresNetwork: sessionRequiresNetwork(doc),
        })
      );
    }

    res.json({ sessions });
  } catch (err) {
    console.error("admin sessions error:", err);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});


router.post("/sessions", async (req, res) => {
  try {
    const payload = sanitizeSessionPayload(req.body || {});
    const sessionId = `S${Date.now()}`;
    const state = getSessionState({
      startTime: payload.startTime,
      expiryTime: payload.expiryTime,
      closedAt: null,
    });

    if (state === "live") {
      await SessionMetadata.updateMany(
        { active: true, closedAt: null },
        { $set: { active: false, closedAt: new Date() } }
      );
    }

    const session = await SessionMetadata.create({
      sessionId,
      subject: payload.subject,
      teacherName: payload.teacherName,
      campus: payload.campus,
      branch: payload.branch,
      section: payload.section,
      roomLabel: payload.roomLabel,
      notes: payload.notes,
      createdAt: new Date(),
      startTime: payload.startTime,
      expiryTime: payload.expiryTime,
      attendanceWindowMinutes: payload.attendanceWindowMinutes,
      validationMode: payload.validationMode,
      geoLatitude: payload.geoLatitude,
      geoLongitude: payload.geoLongitude,
      geoRadiusMeters: payload.geoRadiusMeters,
      allowedIpPrefixes: payload.allowedIpPrefixes,
      active: state === "live",
      closedAt: null,
    });

    res.status(201).json(serializeSession(session));
  } catch (err) {
    console.error("admin create session error:", err);
    res.status(500).json({ error: "Failed to create session" });
  }
});

router.post("/sessions/:sessionId/close", async (req, res) => {
  try {
    const session = await SessionMetadata.findOne({ sessionId: req.params.sessionId });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    session.active = false;
    session.closedAt = new Date();
    await session.save();

    res.json({ success: true, session: serializeSession(session) });
  } catch (err) {
    console.error("admin close session error:", err);
    res.status(500).json({ error: "Failed to close session" });
  }
});


router.get("/attendance", async (req, res) => {
  try {
    const { campus, branch, section, sessionId, subject } = req.query;
    const filter = {};
    if (campus) filter.campus = campus;
    if (branch) filter.branch = branch;
    if (section) filter.section = section;
    if (subject) filter.subject = subject;
    if (sessionId) {
      const session = await SessionMetadata.findOne({ sessionId }).select("_id").lean();
      if (session) filter.sessionId = session._id;
    }

    const records = await AttendanceRecord.find(filter)
      .populate(
        "sessionId",
        "sessionId subject teacherName campus branch section roomLabel startTime createdAt expiryTime validationMode"
      )
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
    const { campus, branch, section, sessionId, subject } = req.query;
    const filter = { status: "present" };
    if (campus) filter.campus = campus;
    if (branch) filter.branch = branch;
    if (section) filter.section = section;
    if (subject) filter.subject = subject;
    if (sessionId) {
      const session = await SessionMetadata.findOne({ sessionId }).select("_id").lean();
      if (session) filter.sessionId = session._id;
    }

    const records = await AttendanceRecord.find(filter)
      .populate(
        "sessionId",
        "sessionId subject teacherName campus branch section roomLabel startTime createdAt expiryTime validationMode"
      )
      .sort({ timestamp: 1 })
      .lean();

    const headers = [
      "Registration Number",
      "Subject",
      "Teacher",
      "Campus",
      "Branch",
      "Section",
      "Room",
      "Wallet Address",
      "Session ID",
      "Anchor Status",
      "Anchor Tx Hash",
      "Certificate Token ID",
      "Validation Mode",
      "Proof Hash",
      "Timestamp",
      "Status",
    ];
    const rows = records.map((r) => [
      r.registrationNumber,
      r.subject,
      r.teacherName,
      r.campus,
      r.branch,
      r.section,
      r.sessionId?.roomLabel ?? "",
      r.walletAddress,
      r.sessionId?.sessionId ?? "",
      r.blockchain?.anchorStatus ?? "",
      r.blockchain?.anchorTxHash ?? "",
      r.blockchain?.certificateTokenId ?? "",
      r.validationMode ?? "",
      r.proofHash ?? "",
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
