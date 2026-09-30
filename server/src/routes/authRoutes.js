import { Router } from "express";
import { ethers } from "ethers";
import LoginChallenge from "../models/LoginChallenge.js";
import User from "../models/User.js";
import {
  buildLoginMessage,
  generateNonce,
  getLoginChallengeExpiry,
  signAuthToken,
} from "../utils/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimit } from "../middleware/rateLimit.js";
import { resolveLoginRole } from "../utils/roles.js";

const router = Router();

router.post("/login", authRateLimit, async (req, res) => {
  try {
    const rawWallet = req.body?.walletAddress || "";
    if (!rawWallet || !ethers.isAddress(rawWallet)) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }

    const walletAddress = ethers.getAddress(rawWallet).toLowerCase();
    const validRoles = ["student", "admin", "recruiter", "teacher"];
    const requestedRole = validRoles.includes(req.body?.role) ? req.body.role : "student";
    const signature = req.body?.signature;
    const nonce = req.body?.nonce;

    if (!signature) {
      const challengeNonce = generateNonce();
      const messageToSign = buildLoginMessage(walletAddress, challengeNonce);
      const expiresAt = getLoginChallengeExpiry();
      await LoginChallenge.deleteMany({ walletAddress });
      await LoginChallenge.create({
        walletAddress,
        nonce: challengeNonce,
        messageToSign,
        expiresAt,
        requestedRole,
      });

      return res.json({
        walletAddress,
        nonce: challengeNonce,
        messageToSign,
        expiresAt,
      });
    }

    const challenge = await LoginChallenge.findOne({ walletAddress, nonce });
    if (!challenge || Date.now() > challenge.expiresAt.getTime()) {
      return res.status(401).json({ error: "Login challenge expired. Request a new challenge." });
    }

    const recovered = ethers.verifyMessage(challenge.messageToSign, signature).toLowerCase();
    if (recovered !== walletAddress) {
      return res.status(401).json({ error: "Wallet signature verification failed" });
    }

    let user = await User.findOne({ walletAddress });
    const assignedRole = resolveLoginRole(walletAddress, challenge.requestedRole);

    if (!user) {
      user = await User.create({
        walletAddress,
        role: assignedRole,
        name: req.body?.name || "",
        rollNumber: req.body?.rollNumber || "",
        branch: req.body?.branch || "",
        semester: req.body?.semester || "",
      });
    } else {
      user.role = assignedRole;
      if (req.body?.name) user.name = req.body.name;
      if (req.body?.rollNumber) user.rollNumber = req.body.rollNumber;
      if (req.body?.branch) user.branch = req.body.branch;
      if (req.body?.semester) user.semester = req.body.semester;
      await user.save();
    }

    await LoginChallenge.deleteMany({ walletAddress });
    const token = signAuthToken({
      id: user._id.toString(),
      walletAddress: user.walletAddress,
      role: user.role,
    });

    return res.json({
      token,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        role: user.role,
        name: user.name,
        rollNumber: user.rollNumber,
        branch: user.branch,
        semester: user.semester,
        isApproved: user.isApproved,
      },
    });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to login" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        role: user.role,
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        branch: user.branch,
        semester: user.semester,
        campus: user.campus,
        section: user.section,
        isApproved: user.isApproved,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

router.put("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ walletAddress: req.user.walletAddress });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const { name, email, rollNumber, branch, semester, campus, section } = req.body;
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (rollNumber !== undefined) user.rollNumber = rollNumber;
    if (branch !== undefined) user.branch = branch;
    if (semester !== undefined) user.semester = semester;
    if (campus !== undefined) user.campus = campus;
    if (section !== undefined) user.section = section;
    await user.save();

    return res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to update profile" });
  }
});

export default router;
