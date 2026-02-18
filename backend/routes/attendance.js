import { Router } from "express";
import { ethers } from "ethers";
import SessionMetadata from "../models/SessionMetadata.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import NonceStore, { getNonceExpiry } from "../models/NonceStore.js";
import { logAudit } from "../utils/audit.js";
import { attendanceRateLimit } from "../middleware/rateLimit.js";
import { validateRequestNonce, validateVerify } from "../middleware/validate.js";

const router = Router();


function buildMessageToSign(sessionId, timeISO) {
  return `I confirm my attendance for Session ID ${sessionId} at ${timeISO}`;
}


router.post(
  "/request-nonce",
  attendanceRateLimit,
  validateRequestNonce,
  async (req, res) => {
    try {
      const { registrationNumber, campus, branch, section, walletAddress } = req.body;
      const session = await SessionMetadata.findOne({ active: true }).sort({ createdAt: -1 });
      if (!session) {
        await logAudit({
          action: "request_nonce",
          registrationNumber,
          walletAddress: walletAddress?.toLowerCase(),
          success: false,
          reason: "no_active_session",
          ip: req.ip,
        });
        return res.status(400).json({ error: "No active attendance session. Try again later." });
      }

      if (new Date() > session.expiryTime) {
        await session.updateOne({ active: false });
        await logAudit({
          action: "request_nonce",
          registrationNumber,
          walletAddress: walletAddress?.toLowerCase(),
          success: false,
          reason: "session_expired",
          sessionId: session.sessionId,
          ip: req.ip,
        });
        return res.status(400).json({ error: "Attendance session has ended." });
      }

      const checksumAddress = ethers.getAddress(walletAddress);
      const walletLower = checksumAddress.toLowerCase();
      const existingByWallet = await AttendanceRecord.findOne({
        sessionId: session._id,
        walletAddress: walletLower,
      });
      if (existingByWallet) {
        await logAudit({
          action: "request_nonce",
          registrationNumber,
          walletAddress: walletLower,
          sessionId: session.sessionId,
          success: false,
          reason: "wallet_already_marked",
          ip: req.ip,
        });
        return res.status(400).json({
          error: "This wallet has already marked attendance for this session.",
        });
      }
      const existingByReg = await AttendanceRecord.findOne({
        sessionId: session._id,
        registrationNumber: registrationNumber.toUpperCase(),
      });
      if (existingByReg) {
        await logAudit({
          action: "request_nonce",
          registrationNumber,
          walletAddress: walletLower,
          sessionId: session.sessionId,
          success: false,
          reason: "registration_number_already_used",
          ip: req.ip,
        });
        return res.status(400).json({
          error: "This registration number has already been used for this session.",
        });
      }

      const nonce = ethers.hexlify(ethers.randomBytes(32));
      const timeISO = new Date().toISOString();
      const messageToSign = buildMessageToSign(session.sessionId, timeISO);
      const expiresAt = getNonceExpiry();

      await NonceStore.create({
        nonce,
        walletAddress: walletLower,
        sessionId: session.sessionId,
        registrationNumber: registrationNumber.toUpperCase(),
        campus,
        branch,
        section,
        messageToSign,
        expiresAt,
      });

      await logAudit({
        action: "request_nonce",
        registrationNumber: registrationNumber.toUpperCase(),
        walletAddress: walletLower,
        sessionId: session.sessionId,
        success: true,
        ip: req.ip,
      });

      res.json({
        nonce,
        messageToSign,
        sessionId: session.sessionId,
        expiresAt: expiresAt.toISOString(),
      });
    } catch (err) {
      if (err.code === "INVALID_ARGUMENT" && err.argument === "address") {
        return res.status(400).json({ error: "Invalid wallet address format" });
      }
      console.error("request-nonce error:", err);
      res.status(500).json({ error: "Failed to generate nonce" });
    }
  }
);


router.post("/verify", attendanceRateLimit, validateVerify, async (req, res) => {
  try {
    const { nonce, signature, walletAddress, registrationNumber } = req.body;
    const walletLower = ethers.getAddress(walletAddress).toLowerCase();
    const regUpper = registrationNumber.trim().toUpperCase();

    const stored = await NonceStore.findOne({ nonce });
    if (!stored) {
      await logAudit({
        action: "verify",
        registrationNumber: regUpper,
        walletAddress: walletLower,
        success: false,
        reason: "invalid_or_expired_nonce",
        ip: req.ip,
      });
      return res.status(401).json({ error: "Invalid or expired nonce. Please request a new one." });
    }

    if (Date.now() > stored.expiresAt.getTime()) {
      await NonceStore.deleteOne({ nonce });
      await logAudit({
        action: "verify",
        registrationNumber: regUpper,
        walletAddress: walletLower,
        success: false,
        reason: "time_window_expired",
        ip: req.ip,
      });
      return res.status(400).json({ error: "Time window expired. Please request a new nonce." });
    }
    let recoveredAddress;
    try {
      recoveredAddress = ethers.verifyMessage(stored.messageToSign, signature);
    } catch (e) {
      await logAudit({
        action: "verify",
        registrationNumber: regUpper,
        walletAddress: walletLower,
        success: false,
        reason: "invalid_signature",
        ip: req.ip,
      });
      return res.status(401).json({ error: "Invalid signature" });
    }

    if (recoveredAddress.toLowerCase() !== walletLower) {
      await logAudit({
        action: "verify",
        registrationNumber: regUpper,
        walletAddress: walletLower,
        success: false,
        reason: "signature_mismatch",
        ip: req.ip,
      });
      return res.status(401).json({ error: "Signature verification failed" });
    }

    if (stored.walletAddress !== walletLower || stored.registrationNumber !== regUpper) {
      await logAudit({
        action: "verify",
        registrationNumber: regUpper,
        walletAddress: walletLower,
        success: false,
        reason: "nonce_wallet_or_reg_mismatch",
        ip: req.ip,
      });
      return res.status(400).json({ error: "Nonce was issued for a different wallet or registration number." });
    }

    const session = await SessionMetadata.findOne({ sessionId: stored.sessionId });
    if (!session || !session.active || new Date() > session.expiryTime) {
      await logAudit({
        action: "verify",
        registrationNumber: regUpper,
        walletAddress: walletLower,
        sessionId: stored.sessionId,
        success: false,
        reason: "session_expired",
        ip: req.ip,
      });
      return res.status(400).json({ error: "Attendance session has ended." });
    }
    const existingWallet = await AttendanceRecord.findOne({
      sessionId: session._id,
      walletAddress: walletLower,
    });
    if (existingWallet) {
      await NonceStore.deleteOne({ nonce });
      await logAudit({
        action: "verify",
        registrationNumber: regUpper,
        walletAddress: walletLower,
        sessionId: session.sessionId,
        success: false,
        reason: "wallet_already_marked",
        ip: req.ip,
      });
      return res.status(400).json({ error: "This wallet has already marked attendance for this session." });
    }

    const existingReg = await AttendanceRecord.findOne({
      sessionId: session._id,
      registrationNumber: regUpper,
    });
    if (existingReg) {
      await NonceStore.deleteOne({ nonce });
      await logAudit({
        action: "verify",
        registrationNumber: regUpper,
        walletAddress: walletLower,
        sessionId: session.sessionId,
        success: false,
        reason: "registration_number_already_used",
        ip: req.ip,
      });
      return res.status(400).json({ error: "This registration number has already been used for this session." });
    }

    await AttendanceRecord.create({
      registrationNumber: regUpper,
      campus: stored.campus,
      branch: stored.branch,
      section: stored.section,
      walletAddress: walletLower,
      sessionId: session._id,
      status: "present",
    });

    await NonceStore.deleteOne({ nonce });

    await logAudit({
      action: "verify",
      registrationNumber: regUpper,
      walletAddress: walletLower,
      sessionId: session.sessionId,
      success: true,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: "Attendance marked successfully",
    });
  } catch (err) {
    console.error("verify error:", err);
    res.status(500).json({ error: "Failed to verify attendance" });
  }
});

export default router;
