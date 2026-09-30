import { Router } from "express";
import { ethers } from "ethers";
import SessionMetadata from "../models/SessionMetadata.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import NonceStore, { getNonceExpiry } from "../models/NonceStore.js";
import { logAudit } from "../utils/audit.js";
import { attendanceRateLimit } from "../middleware/rateLimit.js";
import { validateRequestNonce, validateVerify } from "../middleware/validate.js";
import { anchorAttendanceProof } from "../utils/blockchain.js";
import {
  getCurrentSession,
  serializeSession,
  sessionRequiresLocation,
  sessionRequiresNetwork,
} from "../utils/session.js";

const router = Router();

function normalizeIp(ip) {
  if (!ip) return "";
  return ip.replace("::ffff:", "");
}

function buildMessageToSign(session, timeISO) {
  return `I confirm my attendance for ${session.subject} (${session.sessionId}) in ${session.roomLabel} at ${timeISO}`;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceMeters(aLat, aLng, bLat, bLng) {
  const earthRadius = 6371000;
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(haversine));
}

function ipv4ToLong(ip) {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((part) => Number(part));
  if (nums.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return null;
  }
  return nums.reduce((acc, part) => ((acc << 8) >>> 0) + part, 0);
}

function ipMatchesRule(ip, rule) {
  if (!rule) return false;
  const trimmedRule = rule.trim();
  if (!trimmedRule) return false;

  if (trimmedRule.includes("/")) {
    const [baseIp, prefixText] = trimmedRule.split("/");
    const ipLong = ipv4ToLong(ip);
    const baseLong = ipv4ToLong(baseIp);
    const prefix = Number(prefixText);
    if (ipLong === null || baseLong === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
      return false;
    }
    const mask = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
    return (ipLong & mask) === (baseLong & mask);
  }

  if (trimmedRule.endsWith("*")) {
    return ip.startsWith(trimmedRule.slice(0, -1));
  }

  return ip === trimmedRule || ip.startsWith(trimmedRule);
}

function validateLocationForSession(session, location) {
  if (!sessionRequiresLocation(session)) {
    return { ok: true, location: null };
  }

  if (!location) {
    return { ok: false, reason: "location_required", error: "Location is required for this attendance session." };
  }

  if (session.geoLatitude === null || session.geoLongitude === null) {
    return { ok: false, reason: "session_location_not_configured", error: "Session location is not configured yet." };
  }

  const distance = distanceMeters(
    Number(location.latitude),
    Number(location.longitude),
    Number(session.geoLatitude),
    Number(session.geoLongitude)
  );
  const allowedRadius = Number(session.geoRadiusMeters || 75) + Number(location.accuracyMeters || 0);

  if (distance > allowedRadius) {
    return {
      ok: false,
      reason: "outside_location_radius",
      error: "Outside the permitted classroom radius for this session.",
      location: { ...location, distanceMeters: Math.round(distance) },
    };
  }

  return {
    ok: true,
    location: { ...location, distanceMeters: Math.round(distance) },
  };
}

function validateNetworkForSession(session, req) {
  if (!sessionRequiresNetwork(session)) {
    return { ok: true };
  }

  const normalizedIp = normalizeIp(req.ip);
  const rules = session.allowedIpPrefixes || [];
  if (rules.length === 0) {
    return { ok: false, reason: "network_not_configured", error: "Campus network validation is not configured yet." };
  }

  const matched = rules.some((rule) => ipMatchesRule(normalizedIp, rule));
  if (!matched) {
    return {
      ok: false,
      reason: "outside_campus_network",
      error: "You are not connected to an approved campus network for this session.",
      meta: { ip: normalizedIp },
    };
  }

  return { ok: true, meta: { ip: normalizedIp } };
}

function buildProofHash(record) {
  return ethers.keccak256(
    ethers.toUtf8Bytes(
      JSON.stringify({
        sessionId: record.sessionId,
        registrationNumber: record.registrationNumber,
        walletAddress: record.walletAddress,
        timestamp: record.timestamp,
        subject: record.subject,
      })
    )
  );
}


router.post(
  "/request-nonce",
  attendanceRateLimit,
  validateRequestNonce,
  async (req, res) => {
    try {
      const { registrationNumber, campus, branch, section, walletAddress, location } = req.body;
      const sessionDoc = await getCurrentSession();
      const session = sessionDoc ? serializeSession(sessionDoc) : null;
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

      if (campus !== session.campus || branch !== session.branch || section !== session.section) {
        await logAudit({
          action: "request_nonce",
          registrationNumber,
          walletAddress: walletAddress?.toLowerCase(),
          success: false,
          reason: "class_mismatch",
          sessionId: session.sessionId,
          ip: req.ip,
          meta: { campus, branch, section },
        });
        return res.status(400).json({
          error: `This live session is for ${session.branch} ${session.section} at ${session.campus}.`,
        });
      }

      const now = Date.now();
      const sessionEnd = new Date(session.expiryTime).getTime();
      const sessionStart = new Date(session.startTime).getTime();
      const allowedEnd = Math.min(
        sessionEnd,
        sessionStart + Number(session.attendanceWindowMinutes || 10) * 60 * 1000
      );

      if (now > allowedEnd) {
        await logAudit({
          action: "request_nonce",
          registrationNumber,
          walletAddress: walletAddress?.toLowerCase(),
          success: false,
          reason: "attendance_window_closed",
          sessionId: session.sessionId,
          ip: req.ip,
        });
        return res.status(400).json({ error: "Attendance window has closed for this session." });
      }

      const checksumAddress = ethers.getAddress(walletAddress);
      const walletLower = checksumAddress.toLowerCase();
      const [existingByWallet, existingByReg] = await Promise.all([
        AttendanceRecord.findOne({
          sessionId: session._id,
          walletAddress: walletLower,
        }),
        AttendanceRecord.findOne({
          sessionId: session._id,
          registrationNumber: registrationNumber.toUpperCase(),
        }),
      ]);

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

      const locationValidation = validateLocationForSession(session, location);
      if (!locationValidation.ok) {
        await logAudit({
          action: "request_nonce",
          registrationNumber: registrationNumber.toUpperCase(),
          walletAddress: walletLower,
          sessionId: session.sessionId,
          success: false,
          reason: locationValidation.reason,
          ip: req.ip,
          meta: locationValidation.location || null,
        });
        return res.status(400).json({ error: locationValidation.error });
      }

      const networkValidation = validateNetworkForSession(session, req);
      if (!networkValidation.ok) {
        await logAudit({
          action: "request_nonce",
          registrationNumber: registrationNumber.toUpperCase(),
          walletAddress: walletLower,
          sessionId: session.sessionId,
          success: false,
          reason: networkValidation.reason,
          ip: req.ip,
          meta: networkValidation.meta || null,
        });
        return res.status(400).json({ error: networkValidation.error });
      }

      const nonce = ethers.hexlify(ethers.randomBytes(32));
      const timeISO = new Date().toISOString();
      const messageToSign = buildMessageToSign(session, timeISO);
      const expiresAt = getNonceExpiry();

      await NonceStore.create({
        nonce,
        walletAddress: walletLower,
        sessionId: session.sessionId,
        registrationNumber: registrationNumber.toUpperCase(),
        campus,
        branch,
        section,
        subject: session.subject,
        teacherName: session.teacherName,
        validationMode: session.validationMode,
        messageToSign,
        location: locationValidation.location,
        expiresAt,
      });

      await logAudit({
        action: "request_nonce",
        registrationNumber: registrationNumber.toUpperCase(),
        walletAddress: walletLower,
        sessionId: session.sessionId,
        success: true,
        ip: req.ip,
        meta: {
          requiresLocation: session.requiresLocation,
          requiresNetwork: session.requiresNetwork,
        },
      });

      res.json({
        nonce,
        messageToSign,
        session,
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
    const { nonce, signature, walletAddress, registrationNumber, location } = req.body;
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
    const currentSession = session ? serializeSession(session) : null;
    if (!currentSession || !currentSession.active || new Date() > new Date(currentSession.expiryTime)) {
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

    const locationValidation = validateLocationForSession(currentSession, location || stored.location);
    if (!locationValidation.ok) {
      await logAudit({
        action: "verify",
        registrationNumber: regUpper,
        walletAddress: walletLower,
        sessionId: stored.sessionId,
        success: false,
        reason: locationValidation.reason,
        ip: req.ip,
        meta: locationValidation.location || null,
      });
      return res.status(400).json({ error: locationValidation.error });
    }

    const networkValidation = validateNetworkForSession(currentSession, req);
    if (!networkValidation.ok) {
      await logAudit({
        action: "verify",
        registrationNumber: regUpper,
        walletAddress: walletLower,
        sessionId: stored.sessionId,
        success: false,
        reason: networkValidation.reason,
        ip: req.ip,
        meta: networkValidation.meta || null,
      });
      return res.status(400).json({ error: networkValidation.error });
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

    const attendanceRecord = await AttendanceRecord.create({
      registrationNumber: regUpper,
      campus: stored.campus,
      branch: stored.branch,
      section: stored.section,
      walletAddress: walletLower,
      sessionId: session._id,
      status: "present",
      subject: stored.subject || currentSession.subject,
      teacherName: stored.teacherName || currentSession.teacherName,
      validationMode: stored.validationMode || currentSession.validationMode,
      location: locationValidation.location,
    });
    attendanceRecord.proofHash = buildProofHash({
      sessionId: currentSession.sessionId,
      registrationNumber: regUpper,
      walletAddress: walletLower,
      timestamp: attendanceRecord.timestamp.toISOString(),
      subject: attendanceRecord.subject,
    });
    await attendanceRecord.save();

    let blockchainResult = {
      status: "pending",
      anchored: false,
      chainId: null,
      txHash: null,
      reason: null,
    };
    try {
      blockchainResult = await anchorAttendanceProof(attendanceRecord, currentSession);
      attendanceRecord.blockchain.anchorStatus = blockchainResult.status;
      attendanceRecord.blockchain.anchorTxHash = blockchainResult.txHash || null;
      attendanceRecord.blockchain.anchorChainId = blockchainResult.chainId || null;
      attendanceRecord.blockchain.anchoredAt = blockchainResult.anchored ? new Date() : null;
      attendanceRecord.blockchain.lastError = blockchainResult.reason || null;
      await attendanceRecord.save();
    } catch (anchorError) {
      attendanceRecord.blockchain.anchorStatus = "failed";
      attendanceRecord.blockchain.lastError = anchorError.message;
      await attendanceRecord.save();
      blockchainResult = {
        status: "failed",
        anchored: false,
        chainId: null,
        txHash: null,
        reason: anchorError.message,
      };
    }

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
      proofHash: attendanceRecord.proofHash,
      session: currentSession,
      blockchain: {
        anchorStatus: blockchainResult.status,
        anchorTxHash: blockchainResult.txHash,
        anchorChainId: blockchainResult.chainId,
        anchorReason: blockchainResult.reason || null,
      },
    });
  } catch (err) {
    console.error("verify error:", err);
    res.status(500).json({ error: "Failed to verify attendance" });
  }
});

export default router;
