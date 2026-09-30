import { Router } from "express";
import { ethers } from "ethers";
import AttendanceRecord from "../models/AttendanceRecord.js";
import CertificateRecord from "../models/CertificateRecord.js";
import SkillRecord from "../models/SkillRecord.js";
import User from "../models/User.js";
import GradeRecord from "../models/GradeRecord.js";
import { verifyCertificateOnChain, verifySkillOnChain } from "../services/blockchainService.js";

const router = Router();

router.get("/profile/:wallet", async (req, res) => {
  try {
    const walletAddress = ethers.getAddress(req.params.wallet).toLowerCase();
    const [user, attendance, certificates, skills, grades, totalSessions] = await Promise.all([
      User.findOne({ walletAddress }).lean(),
      AttendanceRecord.find({ walletAddress }).populate("sessionId").lean(),
      CertificateRecord.find({ walletAddress, isValid: true }).lean(),
      SkillRecord.find({ walletAddress, isValid: true }).lean(),
      GradeRecord.find({ walletAddress }).sort({ createdAt: -1 }).lean(),
      AttendanceRecord.distinct("sessionId"),
    ]);

    const attendancePercentage = totalSessions.length
      ? Math.round((attendance.length / totalSessions.length) * 100)
      : 0;

    const [verifiedCertificates, verifiedSkills] = await Promise.all([
      Promise.all(
        certificates.map(async (certificate) => ({
          ...certificate,
          verification: await verifyCertificateOnChain(walletAddress, certificate.tokenId),
        }))
      ),
      Promise.all(
        skills.map(async (skill) => ({
          ...skill,
          verification: await verifySkillOnChain(walletAddress, skill.tokenId),
        }))
      ),
    ]);

    res.json({
      profile: {
        walletAddress,
        role: user?.role || "student",
        name: user?.name || "",
        attendancePercentage,
        attendance,
        certificates: verifiedCertificates,
        skills: verifiedSkills,
        grades,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to load public profile" });
  }
});

export default router;
