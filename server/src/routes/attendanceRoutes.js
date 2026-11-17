import { Router } from "express";
import { ethers } from "ethers";
import AttendanceRecord from "../models/AttendanceRecord.js";
import AttendanceSession from "../models/AttendanceSession.js";
import AttendanceChallenge from "../models/AttendanceChallenge.js";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { buildAttendanceHash, recordAttendanceOnChain } from "../services/blockchainService.js";
import { generateNonce } from "../utils/auth.js";
import { SUBJECTS, findSubject } from "../utils/subjects.js";

const router = Router();

function serializeSession(session) {
  return {
    id: session._id,
    title: session.title,
    courseCode: session.courseCode,
    description: session.description,
    startTime: session.startTime,
    endTime: session.endTime,
    isActive: session.isActive,
  };
}

router.post("/sessions", requireAuth, requireRole("teacher", "admin"), async (req, res) => {
  try {
    const subject = findSubject(req.body?.title, req.body?.courseCode);
    if (!subject) {
      return res.status(400).json({
        error: `Subject must be one of: ${SUBJECTS.map((item) => item.title).join(", ")}`,
      });
    }
    const session = await AttendanceSession.create({
      title: subject.title,
      courseCode: subject.code,
      description: req.body?.description || "",
      createdBy: req.user.id,
      startTime: req.body?.startTime || new Date(),
      endTime: req.body?.endTime || new Date(Date.now() + 2 * 60 * 60 * 1000),
      isActive: true,
      nonceTTLMinutes: Number(req.body?.nonceTTLMinutes || 10),
    });

    res.status(201).json({ session: serializeSession(session) });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to create session" });
  }
});

router.get("/sessions/all", requireAuth, requireRole("admin", "teacher"), async (req, res) => {
  try {
    const filter = req.user.role === "teacher" ? { createdBy: req.user.id } : {};
    const sessions = await AttendanceSession.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ sessions: sessions.map(serializeSession) });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to fetch all sessions" });
  }
});

router.get("/sessions/:sessionId/attendance", requireAuth, requireRole("admin", "teacher"), async (req, res) => {
  try {
    const session = await AttendanceSession.findById(req.params.sessionId).lean();
    if (!session) return res.status(404).json({ error: "Attendance session not found" });

    if (req.user.role === "teacher" && String(session.createdBy) !== req.user.id) {
      return res.status(403).json({ error: "You can view attendance only for sessions you created" });
    }

    const records = await AttendanceRecord.find({ sessionId: session._id, status: "present" })
      .sort({ markedAt: 1 })
      .lean();
    const wallets = records.map((record) => record.walletAddress);
    const students = await User.find({ walletAddress: { $in: wallets } })
      .select("walletAddress name rollNumber branch semester")
      .lean();
    const studentsByWallet = new Map(students.map((student) => [student.walletAddress, student]));

    res.json({
      session: serializeSession(session),
      attendees: records.map((record) => {
        const student = studentsByWallet.get(record.walletAddress);
        return {
          id: record._id,
          walletAddress: record.walletAddress,
          markedAt: record.markedAt,
          chainTxHash: record.chainTxHash,
          name: student?.name || "Student",
          rollNumber: student?.rollNumber || "",
          branch: student?.branch || "",
          semester: student?.semester || "",
        };
      }),
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to fetch session attendance" });
  }
});

router.get("/sessions/live", async (_req, res) => {
  const now = new Date();
  const sessions = await AttendanceSession.find({
    isActive: true,
    startTime: { $lte: now },
    endTime: { $gte: now },
  })
    .sort({ startTime: 1 })
    .lean();

  res.json({ sessions: sessions.map(serializeSession) });
});

router.post("/mark-attendance", requireAuth, requireRole("student", "teacher", "admin"), async (req, res) => {
  try {
    const walletAddress = ethers.getAddress(req.user.walletAddress).toLowerCase();
    const session = await AttendanceSession.findById(req.body?.sessionId);
    if (!session || !session.isActive) {
      return res.status(404).json({ error: "Attendance session not found or inactive" });
    }
    const now = new Date();
    if (session.startTime > now || session.endTime < now) {
      return res.status(400).json({ error: "Attendance session is not currently live" });
    }

    const existing = await AttendanceRecord.findOne({ walletAddress, sessionId: session._id });
    if (existing) {
      return res.status(400).json({ error: "Attendance already marked for this session" });
    }

    const signature = req.body?.signature;
    if (!signature) {
      const challengeNonce = generateNonce();
      const issuedAt = new Date().toISOString();
      const messageToSign = [
        "DAuth Attendance Confirmation",
        `Session: ${session._id}`,
        `Course: ${session.courseCode}`,
        `Wallet: ${walletAddress}`,
        `Nonce: ${challengeNonce}`,
        `Issued At: ${issuedAt}`,
      ].join("\n");

      await AttendanceChallenge.deleteMany({ walletAddress, sessionId: session._id });
      await AttendanceChallenge.create({
        walletAddress,
        sessionId: session._id,
        nonce: challengeNonce,
        messageToSign,
        expiresAt: new Date(Date.now() + session.nonceTTLMinutes * 60 * 1000),
      });

      return res.json({
        session: serializeSession(session),
        nonce: challengeNonce,
        messageToSign,
        expiresAt: new Date(Date.now() + session.nonceTTLMinutes * 60 * 1000),
      });
    }

    const nonce = req.body?.nonce;
    const challenge = await AttendanceChallenge.findOneAndDelete({
      walletAddress,
      sessionId: session._id,
      nonce,
      expiresAt: { $gt: now },
    });
    if (!challenge) {
      return res.status(401).json({ error: "Attendance challenge expired or is invalid. Request a new challenge." });
    }

    const recoveredAddress = ethers.verifyMessage(challenge.messageToSign, signature).toLowerCase();
    if (recoveredAddress !== walletAddress) {
      return res.status(401).json({ error: "Attendance signature verification failed" });
    }

    const attendanceHash = buildAttendanceHash({
      walletAddress,
      sessionId: session._id.toString(),
      nonce,
      timestamp: new Date().toISOString(),
    });

    const chainRes = await recordAttendanceOnChain({
      studentWallet: walletAddress,
      courseCode: session.courseCode,
      sessionDate: session.startTime,
      status: "present",
      attendanceHash,
    });

    const record = await AttendanceRecord.create({
      walletAddress,
      sessionId: session._id,
      signature,
      challengeNonce: nonce,
      attendanceHash,
      chainTxHash: chainRes.txHash || null,
      status: "present",
    });

    await User.updateOne({ walletAddress }, { $addToSet: { attendance: record._id } });

    res.status(201).json({
      attendance: {
        id: record._id,
        session: serializeSession(session),
        attendanceHash,
        chainTxHash: chainRes.txHash || null,
        markedAt: record.markedAt,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to mark attendance" });
  }
});

router.get("/attendance/:wallet", async (req, res) => {
  try {
    const rawWallet = req.params.wallet;
    if (!ethers.isAddress(rawWallet)) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }
    const walletAddress = ethers.getAddress(rawWallet).toLowerCase();
    const records = await AttendanceRecord.find({ walletAddress })
      .populate("sessionId")
      .sort({ markedAt: -1 })
      .lean();

    const totalSessions = await AttendanceSession.countDocuments({});
    const attendancePercentage = totalSessions
      ? Math.round((records.length / totalSessions) * 100)
      : 0;

    res.json({
      walletAddress,
      attendancePercentage,
      records,
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to fetch attendance" });
  }
});

export default router;
