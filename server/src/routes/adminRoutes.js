import { Router } from "express";
import { ethers } from "ethers";
import User from "../models/User.js";
import CertificateRecord from "../models/CertificateRecord.js";
import SkillRecord from "../models/SkillRecord.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import GradeRecord from "../models/GradeRecord.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { SUBJECTS, findSubject } from "../utils/subjects.js";

const router = Router();

router.get("/admin/students", requireAuth, requireRole("admin", "teacher"), async (_req, res) => {
  try {
    const students = await User.find({ role: "student" }).sort({ createdAt: -1 }).lean();
    res.json({ students });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch student roster" });
  }
});

router.get("/admin/credentials", requireAuth, requireRole("admin", "teacher"), async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 10));
    const search = String(req.query.search || "").trim();
    const filter = search ? { $or: [
      { certificateId: { $regex: search, $options: "i" } },
      { walletAddress: { $regex: search, $options: "i" } },
      { degreeName: { $regex: search, $options: "i" } },
    ] } : {};
    const [credentials, total] = await Promise.all([
      CertificateRecord.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      CertificateRecord.countDocuments(filter),
    ]);
    res.json({ credentials, page, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch credential history" });
  }
});

router.post("/admin/students", requireAuth, requireRole("admin", "teacher"), async (req, res) => {
  try {
    const { walletAddress, name, rollNumber, branch, semester, email } = req.body;
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: "Valid wallet address is required" });
    }

    const normalizedWallet = ethers.getAddress(walletAddress).toLowerCase();
    let student = await User.findOne({ walletAddress: normalizedWallet });
    if (student) {
      student.name = name || student.name;
      student.rollNumber = rollNumber || student.rollNumber;
      student.branch = branch || student.branch;
      student.semester = semester || student.semester;
      student.email = email || student.email;
      student.isApproved = true;
      await student.save();
    } else {
      student = await User.create({
        walletAddress: normalizedWallet,
        name: name || "Student User",
        rollNumber: rollNumber || "",
        branch: branch || "",
        semester: semester || "",
        email: email || "",
        role: "student",
        isApproved: true,
      });
    }

    res.status(201).json({ student });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to register student" });
  }
});

router.post("/admin/students/approve", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: "Valid wallet address is required" });
    }
    const normalizedWallet = ethers.getAddress(walletAddress).toLowerCase();
    const student = await User.findOneAndUpdate(
      { walletAddress: normalizedWallet },
      { isApproved: true },
      { new: true }
    );
    res.json({ message: "Student wallet approved", student });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to approve student" });
  }
});

router.post("/admin/grades", requireAuth, requireRole("admin", "teacher"), async (req, res) => {
  try {
    const { walletAddress, courseCode, courseName, semester = "", score, grade } = req.body || {};
    if (!walletAddress || !ethers.isAddress(walletAddress)) return res.status(400).json({ error: "Valid student wallet address is required" });
    if (!courseCode?.trim() || !courseName?.trim() || score === undefined || !grade?.trim()) {
      return res.status(400).json({ error: "Course code, course name, score, and grade are required" });
    }
    if (!Number.isFinite(Number(score)) || Number(score) < 0 || Number(score) > 100) {
      return res.status(400).json({ error: "Score must be between 0 and 100" });
    }
    const subject = findSubject(courseName, courseCode);
    if (!subject) {
      return res.status(400).json({
        error: `Subject must be one of: ${SUBJECTS.map((item) => item.title).join(", ")}`,
      });
    }
    const normalizedWallet = ethers.getAddress(walletAddress).toLowerCase();
    const record = await GradeRecord.findOneAndUpdate(
      { walletAddress: normalizedWallet, courseCode: subject.code, semester: String(semester).trim() },
      { walletAddress: normalizedWallet, courseCode: subject.code, courseName: subject.title, semester: String(semester).trim(), score: Number(score), grade: grade.trim().toUpperCase(), issuedBy: req.user.id },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    await User.updateOne({ walletAddress: normalizedWallet }, { $addToSet: { grades: record._id } });
    res.status(201).json({ grade: record });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to save grade" });
  }
});

router.get("/admin/stats", requireAuth, requireRole("admin", "teacher"), async (_req, res) => {
  try {
    const [totalStudents, totalCertificates, revokedCertificates, totalSkills, totalAttendance] = await Promise.all([
      User.countDocuments({ role: "student" }),
      CertificateRecord.countDocuments({ isValid: true }),
      CertificateRecord.countDocuments({ isValid: false }),
      SkillRecord.countDocuments({ isValid: true }),
      AttendanceRecord.countDocuments({ status: "present" }),
    ]);

    const recentCertificates = await CertificateRecord.find({ isValid: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      stats: {
        totalStudents,
        totalCertificates,
        revokedCertificates,
        totalSkills,
        totalAttendance,
      },
      recentCertificates,
      contracts: {
        certificateNft: process.env.CERTIFICATE_NFT_ADDRESS,
        skillProofNft: process.env.SKILL_PROOF_NFT_ADDRESS,
        verificationContract: process.env.VERIFICATION_CONTRACT_ADDRESS,
        attendanceContract: process.env.ATTENDANCE_CONTRACT_ADDRESS,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

export default router;
