import { Router } from "express";
import AttendanceRecord from "../models/AttendanceRecord.js";
import SessionMetadata from "../models/SessionMetadata.js";
import { requireWalletAuth } from "../middleware/auth.js";
import { anchorAttendanceProof, mintAttendanceCertificate } from "../utils/blockchain.js";

const router = Router();
const SHORTAGE_THRESHOLD = 75;

function buildStudentFilter(query = {}) {
  const filter = {};

  if (query.registrationNumber) {
    filter.registrationNumber = String(query.registrationNumber).trim().toUpperCase();
  }
  if (query.walletAddress) {
    filter.walletAddress = String(query.walletAddress).trim().toLowerCase();
  }
  if (query.campus) filter.campus = query.campus;
  if (query.branch) filter.branch = query.branch;
  if (query.section) filter.section = query.section;
  if (query.subject) filter.subject = query.subject;

  return filter;
}

function buildSessionFilter(query = {}) {
  const filter = {};
  if (query.campus) filter.campus = query.campus;
  if (query.branch) filter.branch = query.branch;
  if (query.section) filter.section = query.section;
  if (query.subject) filter.subject = query.subject;
  filter.startTime = { $lte: new Date() };
  return filter;
}

function toPercentage(attended, total) {
  if (!total) return 0;
  return Math.round((attended / total) * 100);
}

router.get("/dashboard", async (req, res) => {
  try {
    const attendanceFilter = buildStudentFilter(req.query);
    if (!attendanceFilter.registrationNumber) {
      return res.status(400).json({ error: "registrationNumber is required" });
    }

    const [attendanceRecords, sessions] = await Promise.all([
      AttendanceRecord.find(attendanceFilter)
        .populate("sessionId", "sessionId subject teacherName startTime expiryTime roomLabel")
        .sort({ timestamp: -1 })
        .lean(),
      SessionMetadata.find(buildSessionFilter(req.query)).lean(),
    ]);

    const sessionTotalsBySubject = new Map();
    for (const session of sessions) {
      const subject = session.subject || "General";
      sessionTotalsBySubject.set(subject, (sessionTotalsBySubject.get(subject) || 0) + 1);
    }

    const attendanceBySubject = new Map();
    for (const record of attendanceRecords) {
      const subject = record.subject || record.sessionId?.subject || "General";
      attendanceBySubject.set(subject, (attendanceBySubject.get(subject) || 0) + 1);
    }

    const allSubjects = new Set([
      ...Array.from(sessionTotalsBySubject.keys()),
      ...Array.from(attendanceBySubject.keys()),
    ]);

    const subjectStats = Array.from(allSubjects)
      .map((subject) => {
        const totalClasses = sessionTotalsBySubject.get(subject) || 0;
        const attendedClasses = attendanceBySubject.get(subject) || 0;
        const attendancePercentage = toPercentage(attendedClasses, totalClasses);
        return {
          subject,
          totalClasses,
          attendedClasses,
          attendancePercentage,
          shortage: totalClasses > 0 && attendancePercentage < SHORTAGE_THRESHOLD,
        };
      })
      .sort((a, b) => a.subject.localeCompare(b.subject));

    const totalClasses = sessions.length;
    const totalAttended = attendanceRecords.length;
    const overallAttendancePercentage = toPercentage(totalAttended, totalClasses);

    res.json({
      summary: {
        totalClasses,
        totalAttended,
        overallAttendancePercentage,
        shortage: totalClasses > 0 && overallAttendancePercentage < SHORTAGE_THRESHOLD,
        shortageThreshold: SHORTAGE_THRESHOLD,
      },
      subjectStats,
      recentAttendance: attendanceRecords.slice(0, 5),
    });
  } catch (err) {
    console.error("student dashboard error:", err);
    res.status(500).json({ error: "Failed to load student dashboard" });
  }
});

router.get("/history", async (req, res) => {
  try {
    const attendanceFilter = buildStudentFilter(req.query);
    if (!attendanceFilter.registrationNumber) {
      return res.status(400).json({ error: "registrationNumber is required" });
    }

    const records = await AttendanceRecord.find(attendanceFilter)
      .populate(
        "sessionId",
        "sessionId subject teacherName campus branch section roomLabel startTime expiryTime validationMode"
      )
      .sort({ timestamp: -1 })
      .lean();

    res.json({ history: records });
  } catch (err) {
    console.error("student history error:", err);
    res.status(500).json({ error: "Failed to load attendance history" });
  }
});

router.get("/history/export", async (req, res) => {
  try {
    const attendanceFilter = buildStudentFilter(req.query);
    if (!attendanceFilter.registrationNumber) {
      return res.status(400).json({ error: "registrationNumber is required" });
    }

    const records = await AttendanceRecord.find(attendanceFilter)
      .populate(
        "sessionId",
        "sessionId subject teacherName campus branch section roomLabel startTime expiryTime validationMode"
      )
      .sort({ timestamp: -1 })
      .lean();

    const headers = [
      "Registration Number",
      "Subject",
      "Teacher",
      "Campus",
      "Branch",
      "Section",
      "Room",
      "Session ID",
      "Anchor Status",
      "Anchor Tx",
      "Certificate Token ID",
      "Validation Mode",
      "Proof Hash",
      "Timestamp",
      "Status",
    ];
    const rows = records.map((record) => [
      record.registrationNumber,
      record.subject || record.sessionId?.subject || "",
      record.teacherName || record.sessionId?.teacherName || "",
      record.campus,
      record.branch,
      record.section,
      record.sessionId?.roomLabel || "",
      record.sessionId?.sessionId || "",
      record.blockchain?.anchorStatus || "",
      record.blockchain?.anchorTxHash || "",
      record.blockchain?.certificateTokenId || "",
      record.validationMode || record.sessionId?.validationMode || "",
      record.proofHash || "",
      record.timestamp ? new Date(record.timestamp).toISOString() : "",
      record.status,
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=student-attendance-${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    console.error("student history export error:", err);
    res.status(500).json({ error: "Failed to export attendance history" });
  }
});

router.post("/certificates/claim", requireWalletAuth, async (req, res) => {
  try {
    const proofHash = String(req.body?.proofHash || "").trim();
    if (!proofHash) {
      return res.status(400).json({ error: "proofHash is required" });
    }

    const record = await AttendanceRecord.findOne({ proofHash }).populate(
      "sessionId",
      "sessionId subject teacherName campus branch section roomLabel startTime expiryTime validationMode"
    );
    if (!record) {
      return res.status(404).json({ error: "Attendance record not found" });
    }
    if (record.walletAddress !== req.auth.walletAddress) {
      return res.status(403).json({ error: "This certificate belongs to a different wallet" });
    }
    if (record.blockchain?.certificateTokenId) {
      return res.json({
        success: true,
        message: "Certificate already minted",
        certificate: {
          tokenId: record.blockchain.certificateTokenId,
          txHash: record.blockchain.certificateTxHash,
          tokenUri: record.blockchain.certificateTokenUri,
        },
      });
    }

    const session = record.sessionId;
    if (!session) {
      return res.status(400).json({ error: "Session metadata is missing for this attendance record" });
    }

    if (record.blockchain?.anchorStatus !== "anchored") {
      const anchorResult = await anchorAttendanceProof(record, session);
      record.blockchain.anchorStatus = anchorResult.status;
      record.blockchain.anchorTxHash = anchorResult.txHash || null;
      record.blockchain.anchorChainId = anchorResult.chainId || null;
      record.blockchain.anchoredAt = anchorResult.anchored ? new Date() : null;
      record.blockchain.lastError = anchorResult.reason || null;
      await record.save();

      if (anchorResult.status !== "anchored") {
        return res.status(400).json({
          error: anchorResult.reason || "Attendance proof is not anchored on-chain yet",
        });
      }
    }

    const minted = await mintAttendanceCertificate(record, session);
    record.blockchain.certificateTokenId = minted.tokenId;
    record.blockchain.certificateTxHash = minted.txHash;
    record.blockchain.certificateTokenUri = minted.tokenUri;
    record.blockchain.certificateMintedAt = new Date();
    record.blockchain.lastError = null;
    await record.save();

    res.json({
      success: true,
      certificate: {
        tokenId: minted.tokenId,
        txHash: minted.txHash,
        tokenUri: minted.tokenUri,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to mint attendance certificate" });
  }
});

export default router;
