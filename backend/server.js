import express from "express";
import cors from "cors";
import { ethers } from "ethers";

const app = express();
app.use(cors());
app.use(express.json());

const nonceStore = new Map();
const generateNonce = () => ethers.hexlify(ethers.randomBytes(32));

app.get("/api/nonce/:walletAddress", (req, res) => {
  try {
    const { walletAddress } = req.params;
    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: "Invalid wallet address format" });
    }

    const checksumAddress = ethers.getAddress(walletAddress);
    const nonce = generateNonce();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    nonceStore.set(checksumAddress, { nonce, expiresAt });

    res.json({ walletAddress: checksumAddress, nonce });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate nonce" });
  }
});

app.post("/api/verify", (req, res) => {
  try {
    const { walletAddress, signature, nonce } = req.body;

    if (!walletAddress || !signature || !nonce) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: "Invalid wallet address format" });
    }

    const checksumAddress = ethers.getAddress(walletAddress);
    const stored = nonceStore.get(checksumAddress);

    if (!stored) {
      return res.status(401).json({ error: "No nonce found for this address" });
    }

    if (Date.now() > stored.expiresAt) {
      nonceStore.delete(checksumAddress);
      return res.status(401).json({ error: "Nonce has expired. Request a new one." });
    }

    if (stored.nonce !== nonce) {
      return res.status(401).json({ error: "Invalid nonce" });
    }

    const recoveredAddress = ethers.verifyMessage(nonce, signature);

    if (recoveredAddress.toLowerCase() !== checksumAddress.toLowerCase()) {
      return res.status(401).json({ error: "Signature verification failed" });
    }

    nonceStore.delete(checksumAddress);

    res.json({ success: true, message: "Authentication successful", walletAddress: checksumAddress });
  } catch (error) {
    res.status(500).json({ error: "Failed to verify signature" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
