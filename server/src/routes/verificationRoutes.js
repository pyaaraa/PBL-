import { Router } from "express";
import { ethers } from "ethers";
import AttendanceRecord from "../models/AttendanceRecord.js";
import CertificateRecord from "../models/CertificateRecord.js";
import SkillRecord from "../models/SkillRecord.js";
import User from "../models/User.js";
import { verifyCertificateOnChain, verifySkillOnChain } from "../services/blockchainService.js";

const router = Router();

router.get("/verify/:query", async (req, res) => {
  try {
    const rawQuery = req.params.query.trim();

    // Check if query is a valid wallet address
    if (ethers.isAddress(rawQuery)) {
      const walletAddress = ethers.getAddress(rawQuery).toLowerCase();
      const [user, certificates, skills, attendance] = await Promise.all([
        User.findOne({ walletAddress }).lean(),
        CertificateRecord.find({ walletAddress }).lean(),
        SkillRecord.find({ walletAddress }).lean(),
        AttendanceRecord.find({ walletAddress }).populate("sessionId").lean(),
      ]);

      const verifiedCertificates = await Promise.all(
        certificates.map(async (certificate) => ({
          ...certificate,
          verification: await verifyCertificateOnChain(walletAddress, certificate.tokenId),
        }))
      );

      const verifiedSkills = await Promise.all(
        skills.map(async (skill) => ({
          ...skill,
          verification: await verifySkillOnChain(walletAddress, skill.tokenId),
        }))
      );

      return res.json({
        type: "wallet",
        walletAddress,
        user: user ? { name: user.name, rollNumber: user.rollNumber, branch: user.branch, semester: user.semester } : null,
        verified: verifiedCertificates.some(
          (item) => item.verification?.ownsCertificate && item.verification?.isValid
        ),
        certificates: verifiedCertificates,
        skills: verifiedSkills,
        attendance,
      });
    }

    // Query by public certificate ID, on-chain token ID, or roll number.
    const certificateId = rawQuery.toUpperCase();
    let certificate = await CertificateRecord.findOne({ $or: [{ certificateId }, { tokenId: rawQuery }] }).lean();
    if (!certificate) {
      const userByRoll = await User.findOne({ rollNumber: { $regex: new RegExp(`^${rawQuery}$`, "i") } }).lean();
      if (userByRoll) {
        const walletAddress = userByRoll.walletAddress;
        const [certificates, skills, attendance] = await Promise.all([
          CertificateRecord.find({ walletAddress }).lean(),
          SkillRecord.find({ walletAddress }).lean(),
          AttendanceRecord.find({ walletAddress }).populate("sessionId").lean(),
        ]);

        const verifiedCertificates = await Promise.all(
          certificates.map(async (c) => ({
            ...c,
            verification: await verifyCertificateOnChain(walletAddress, c.tokenId),
          }))
        );

        return res.json({
          type: "student",
          walletAddress,
          user: { name: userByRoll.name, rollNumber: userByRoll.rollNumber, branch: userByRoll.branch, semester: userByRoll.semester },
          verified: verifiedCertificates.some(
            (item) => item.verification?.ownsCertificate && item.verification?.isValid
          ),
          certificates: verifiedCertificates,
          skills,
          attendance,
        });
      }
      return res.status(404).json({ error: "No student or certificate record found for query" });
    }

    const verification = await verifyCertificateOnChain(certificate.walletAddress, certificate.tokenId);
    const studentUser = await User.findOne({ walletAddress: certificate.walletAddress }).lean();

    return res.json({
      type: "certificate",
      certificate: {
        ...certificate,
        verification,
        student: studentUser ? { name: studentUser.name, rollNumber: studentUser.rollNumber, branch: studentUser.branch } : null,
      },
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to verify credential" });
  }
});

export default router;
