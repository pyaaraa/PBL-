import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import User from "../src/models/User.js";
import CertificateRecord from "../src/models/CertificateRecord.js";
import SkillRecord from "../src/models/SkillRecord.js";
import GradeRecord from "../src/models/GradeRecord.js";
import { uploadJsonToPinata } from "../src/utils/ipfs.js";
import { buildCredentialContentHash, getCertificateOnChainById, mintCertificateOnChain, mintSkillOnChain } from "../src/services/blockchainService.js";

const ADMIN_WALLET = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".toLowerCase();
const STUDENT_WALLET = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".toLowerCase();

export async function seedDemoData() {
  const admin = await User.findOneAndUpdate(
    { walletAddress: ADMIN_WALLET },
    { walletAddress: ADMIN_WALLET, name: "Dr. Aanya Verma", role: "admin", isApproved: true },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const student = await User.findOneAndUpdate(
    { walletAddress: STUDENT_WALLET },
    { walletAddress: STUDENT_WALLET, name: "Maya Sharma", email: "maya.sharma@example.edu", rollNumber: "DAUTH-2026-042", branch: "Computer Science & Engineering", semester: "8th Semester", role: "student", isApproved: true },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const certificateId = "DAUTH-2026-042-BTECH";
  let certificate = await CertificateRecord.findOne({ certificateId });
  if (!certificate) {
    const existingOnChain = await getCertificateOnChainById(certificateId);
    if (existingOnChain) {
      certificate = await CertificateRecord.create({
        walletAddress: existingOnChain.walletAddress,
        certificateId,
        degreeName: existingOnChain.degreeName,
        stream: "Computer Science",
        passingYear: 2026,
        universityName: existingOnChain.universityName,
        issueDate: existingOnChain.issueDate,
        metadataCid: "recovered-on-chain",
        metadataUri: existingOnChain.metadataUri,
        tokenId: existingOnChain.tokenId,
        txHash: "recovered-from-local-chain",
        contentHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        issuedBy: admin._id,
        isValid: existingOnChain.isValid,
      });
      await User.updateOne({ _id: student._id }, { $addToSet: { certificates: certificate._id } });
    } else {
      const metadata = await uploadJsonToPinata(certificateId, {
      name: "Bachelor of Technology - DAuth Demo",
      description: "Demo academic credential for the DAuth local blockchain workflow.",
      external_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/verify/${certificateId}`,
      });
      const contentHash = buildCredentialContentHash({ certificateId, walletAddress: STUDENT_WALLET, degreeName: "Bachelor of Technology in Computer Science", universityName: "DAuth University", stream: "Computer Science", passingYear: 2026, metadataCid: metadata.cid });
      const minted = await mintCertificateOnChain({ walletAddress: STUDENT_WALLET, metadataUri: metadata.url, certificateId, contentHash, degreeName: "Bachelor of Technology in Computer Science", universityName: "DAuth University", issueDate: "2026-06-15" });
      certificate = await CertificateRecord.create({ walletAddress: STUDENT_WALLET, certificateId, degreeName: "Bachelor of Technology in Computer Science", stream: "Computer Science", passingYear: 2026, universityName: "DAuth University", issueDate: new Date("2026-06-15"), metadataCid: metadata.cid, metadataUri: metadata.url, tokenId: minted.tokenId, txHash: minted.txHash, contentHash, issuedBy: admin._id });
      await User.updateOne({ _id: student._id }, { $addToSet: { certificates: certificate._id } });
    }
  }

  const skill = await SkillRecord.findOne({ walletAddress: STUDENT_WALLET, title: "Solidity & Smart Contract Development" });
  if (!skill) {
    const metadata = await uploadJsonToPinata("demo-skill", { name: "Solidity & Smart Contract Development", recipient: STUDENT_WALLET });
    const minted = await mintSkillOnChain({ walletAddress: STUDENT_WALLET, metadataUri: metadata.url, title: "Solidity & Smart Contract Development", description: "Verified implementation of Solidity contracts, Hardhat tests, and secure wallet workflows.", proofUri: metadata.url });
    const record = await SkillRecord.create({ walletAddress: STUDENT_WALLET, title: "Solidity & Smart Contract Development", description: "Verified implementation of Solidity contracts, Hardhat tests, and secure wallet workflows.", proofCid: metadata.cid, proofUri: metadata.url, metadataCid: metadata.cid, metadataUri: metadata.url, tokenId: minted.tokenId, txHash: minted.txHash, addedBy: admin._id });
    await User.updateOne({ _id: student._id }, { $addToSet: { skills: record._id } });
  }

  for (const grade of [
    ["CS401", "Distributed Systems", "8th Semester", 91, "A+"],
    ["CS402", "Web3 Cryptography", "8th Semester", 96, "A+"],
    ["CS403", "Machine Learning", "8th Semester", 88, "A"],
  ]) {
    await GradeRecord.findOneAndUpdate(
      { walletAddress: STUDENT_WALLET, courseCode: grade[0], semester: grade[2] },
      { walletAddress: STUDENT_WALLET, courseCode: grade[0], courseName: grade[1], semester: grade[2], score: grade[3], grade: grade[4], issuedBy: admin._id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`Demo ready: http://localhost:5173/verify/${certificateId}`);
}

if (process.argv[1]?.endsWith("seedDemo.js")) {
  connectDB()
    .then(seedDemoData)
    .then(() => mongoose.disconnect())
    .catch(async (error) => { console.error(error); await mongoose.disconnect(); process.exit(1); });
}
