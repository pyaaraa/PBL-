import { Router } from "express";
import { ethers } from "ethers";
import multer from "multer";
import CertificateRecord from "../models/CertificateRecord.js";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { buildCredentialContentHash, mintCertificateOnChain, revokeCertificateOnChain } from "../services/blockchainService.js";
import { streamCertificatePdf } from "../services/pdfService.js";
import { uploadFileToPinata, uploadJsonToPinata } from "../utils/ipfs.js";

const router = Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

function normalizeCertificateId(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "-");
}

router.post("/issue-certificate", requireAuth, requireRole("admin"), upload.single("pdfFile"), async (req, res) => {
  try {
    const rawWallet = req.body?.walletAddress || "";
    if (!rawWallet || !ethers.isAddress(rawWallet)) {
      return res.status(400).json({ error: "Valid student wallet address is required" });
    }

    const walletAddress = ethers.getAddress(rawWallet).toLowerCase();
    const certificateId = normalizeCertificateId(req.body?.certificateId);
    if (!/^[A-Z0-9][A-Z0-9-]{5,63}$/.test(certificateId)) {
      return res.status(400).json({ error: "Certificate ID must contain 6-64 letters, numbers, or hyphens" });
    }
    if (await CertificateRecord.exists({ certificateId })) {
      return res.status(409).json({ error: "Certificate ID already exists" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Certificate PDF is required" });
    }
    if (req.file.mimetype && req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Certificate upload must be a PDF" });
    }
    const degreeName = req.body?.degreeName || "Bachelor of Technology in Computer Science";
    const universityName = req.body?.universityName || "DAuth University";
    const issueDate = req.body?.issueDate || new Date().toISOString();
    const stream = String(req.body?.stream || "").trim();
    const passingYear = Number(req.body?.passingYear || new Date(issueDate).getFullYear());
    if (!Number.isInteger(passingYear) || passingYear < 1900 || passingYear > 2100) {
      return res.status(400).json({ error: "Passing year must be valid" });
    }

    let pdfCid = "";
    let pdfUrl = "";

    const pdfUpload = await uploadFileToPinata({
      name: `cert-${walletAddress}.pdf`,
      contentType: req.file.mimetype || "application/pdf",
      buffer: req.file.buffer,
    });
    pdfCid = pdfUpload.cid;
    pdfUrl = pdfUpload.url;

    // Upload JSON metadata to IPFS
    const metadata = await uploadJsonToPinata(`certificate-${certificateId}`, {
      name: `${degreeName} Certificate`,
      description: `Soulbound Academic Certificate issued to ${walletAddress}`,
      image: pdfUrl,
      external_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/verify/${certificateId}`,
      attributes: [
        { trait_type: "Student Wallet", value: walletAddress },
        { trait_type: "Certificate ID", value: certificateId },
        { trait_type: "Degree Name", value: degreeName },
        { trait_type: "Stream", value: stream || "Not specified" },
        { trait_type: "Passing Year", value: passingYear },
        { trait_type: "University Name", value: universityName },
        { trait_type: "Issue Date", value: issueDate },
        { trait_type: "PDF IPFS CID", value: pdfCid || "N/A" },
      ],
    });

    const contentHash = buildCredentialContentHash({
      certificateId, walletAddress, degreeName, universityName, stream, passingYear, metadataCid: metadata.cid,
    });

    const minted = await mintCertificateOnChain({
      walletAddress,
      metadataUri: metadata.url,
      certificateId,
      contentHash,
      degreeName,
      universityName,
      issueDate,
    });

    const record = await CertificateRecord.create({
      walletAddress,
      certificateId,
      degreeName,
      stream,
      passingYear,
      universityName,
      issueDate: new Date(issueDate),
      metadataCid: metadata.cid,
      metadataUri: metadata.url,
      pdfCid,
      pdfUri: pdfUrl,
      tokenId: minted.tokenId,
      txHash: minted.txHash,
      contentHash,
      issuedBy: req.user.id,
      isValid: true,
    });

    // Update User certificates list if student user exists
    await User.updateOne({ walletAddress }, { $addToSet: { certificates: record._id } });

    res.status(201).json({
      certificate: record,
      pdfUrl,
      metadataUrl: metadata.url,
      txHash: minted.txHash,
      tokenId: minted.tokenId,
    });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to issue certificate" });
  }
});

router.post("/certificates/:certificateId/revoke", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const certificateId = normalizeCertificateId(req.params.certificateId);
    const certificate = await CertificateRecord.findOne({ certificateId });
    if (!certificate) return res.status(404).json({ error: "Certificate not found" });
    if (!certificate.isValid) return res.status(409).json({ error: "Certificate is already revoked" });

    const reason = String(req.body?.reason || "Revoked by authorized issuer").trim().slice(0, 240);
    const chain = await revokeCertificateOnChain({ tokenId: certificate.tokenId, reason });
    certificate.isValid = false;
    certificate.revokedAt = new Date();
    certificate.revokedBy = req.user.id;
    certificate.revocationReason = reason;
    certificate.revocationTxHash = chain.txHash;
    await certificate.save();
    res.json({ certificate, txHash: chain.txHash, chainId: chain.chainId });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to revoke certificate" });
  }
});

router.get("/certificates/:wallet", async (req, res) => {
  try {
    const rawWallet = req.params.wallet;
    if (!ethers.isAddress(rawWallet)) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }
    const walletAddress = ethers.getAddress(rawWallet).toLowerCase();
    const certificates = await CertificateRecord.find({ walletAddress })
      .sort({ issueDate: -1 })
      .lean();
    res.json({ walletAddress, certificates });
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to fetch certificates" });
  }
});

router.get("/certificates/:wallet/:tokenId/pdf", async (req, res) => {
  try {
    const rawWallet = req.params.wallet;
    if (!ethers.isAddress(rawWallet)) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }
    const walletAddress = ethers.getAddress(rawWallet).toLowerCase();
    const certificate = await CertificateRecord.findOne({
      walletAddress,
      tokenId: req.params.tokenId,
    }).lean();

    if (!certificate) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    if (certificate.pdfUri) {
      return res.redirect(certificate.pdfUri);
    }

    streamCertificatePdf(res, certificate);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to generate certificate PDF" });
  }
});

export default router;
