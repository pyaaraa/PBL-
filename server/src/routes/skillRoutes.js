import { Router } from "express";
import multer from "multer";
import { ethers } from "ethers";
import SkillRecord from "../models/SkillRecord.js";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { mintSkillOnChain } from "../services/blockchainService.js";
import { uploadFileToPinata, uploadJsonToPinata } from "../utils/ipfs.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post("/add-skill", requireAuth, requireRole("teacher", "admin"), upload.single("proof"), async (req, res) => {
  try {
    const rawWallet = req.body?.walletAddress || "";
    if (!rawWallet || !ethers.isAddress(rawWallet)) {
      return res.status(400).json({ error: "Valid student wallet address is required" });
    }

    const walletAddress = ethers.getAddress(rawWallet).toLowerCase();
    const title = req.body?.title || "Blockchain Development";
    const description = req.body?.description || `Verified skill proof badge for ${title}`;
    const issueDate = req.body?.issueDate || new Date().toISOString();

    let proofCid = "N/A";
    let proofUrl = "";

    if (req.file) {
      const proofUpload = await uploadFileToPinata({
        name: `${title}-proof-${walletAddress}`,
        contentType: req.file.mimetype,
        buffer: req.file.buffer,
      });
      proofCid = proofUpload.cid;
      proofUrl = proofUpload.url;
    } else {
      proofUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/verify/${walletAddress}`;
    }

    const metadata = await uploadJsonToPinata(`skill-${walletAddress}-${title}`, {
      name: `${title} Skill Badge`,
      description,
      external_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/verify/${walletAddress}`,
      proof_uri: proofUrl,
      attributes: [
        { trait_type: "Student Wallet", value: walletAddress },
        { trait_type: "Skill Title", value: title },
        { trait_type: "Issue Date", value: issueDate },
        { trait_type: "Issuer", value: "DAuth University Admin" },
      ],
    });

    const minted = await mintSkillOnChain({
      walletAddress,
      metadataUri: metadata.url,
      title,
      description,
      proofUri: proofUrl,
    });

    const record = await SkillRecord.create({
      walletAddress,
      title,
      description,
      proofCid,
      proofUri: proofUrl,
      metadataCid: metadata.cid,
      metadataUri: metadata.url,
      tokenId: minted.tokenId,
      txHash: minted.txHash,
      addedBy: req.user.id,
      isValid: true,
    });

    await User.updateOne({ walletAddress }, { $addToSet: { skills: record._id } });

    res.status(201).json({ skill: record, chainId: minted.chainId, txHash: minted.txHash, tokenId: minted.tokenId });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to add skill proof" });
  }
});

router.get("/skills/:wallet", async (req, res) => {
  try {
    const rawWallet = req.params.wallet;
    if (!ethers.isAddress(rawWallet)) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }
    const walletAddress = ethers.getAddress(rawWallet).toLowerCase();
    const skills = await SkillRecord.find({ walletAddress, isValid: true })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ walletAddress, skills });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to fetch skills" });
  }
});

export default router;
