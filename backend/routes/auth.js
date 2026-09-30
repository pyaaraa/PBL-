import { Router } from "express";
import { ethers } from "ethers";
import AuthChallenge from "../models/AuthChallenge.js";
import { buildAuthMessage, getChallengeExpiry, issueAuthToken } from "../utils/auth.js";

const router = Router();

router.post("/request-challenge", async (req, res) => {
  try {
    const walletAddress = ethers.getAddress(req.body?.walletAddress || "").toLowerCase();
    const nonce = ethers.hexlify(ethers.randomBytes(16));
    const messageToSign = buildAuthMessage(walletAddress, nonce);
    const expiresAt = getChallengeExpiry();

    await AuthChallenge.deleteMany({ walletAddress });
    await AuthChallenge.create({
      walletAddress,
      nonce,
      messageToSign,
      expiresAt,
    });

    res.json({ walletAddress, nonce, messageToSign, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    res.status(400).json({ error: "Invalid wallet address" });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const walletAddress = ethers.getAddress(req.body?.walletAddress || "").toLowerCase();
    const signature = req.body?.signature;
    if (!signature || typeof signature !== "string") {
      return res.status(400).json({ error: "signature is required" });
    }

    const challenge = await AuthChallenge.findOne({ walletAddress });
    if (!challenge || Date.now() > challenge.expiresAt.getTime()) {
      return res.status(401).json({ error: "Challenge expired. Request a new one." });
    }

    const recovered = ethers.verifyMessage(challenge.messageToSign, signature).toLowerCase();
    if (recovered !== walletAddress) {
      return res.status(401).json({ error: "Wallet signature verification failed" });
    }

    await AuthChallenge.deleteMany({ walletAddress });
    const token = issueAuthToken(walletAddress);

    res.json({
      token,
      walletAddress,
      expiresInMs: 7 * 24 * 60 * 60 * 1000,
    });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to verify wallet login" });
  }
});

export default router;
