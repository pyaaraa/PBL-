import { ethers } from "ethers";
import { getBlockchainContext, getChainId } from "../utils/ethersHelpers.js";

function normalizeTokenId(value) {
  if (value == null) return null;
  return value.toString();
}

async function parseMintedTokenId(receipt, contract, eventName) {
  for (const log of receipt.logs || []) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === eventName) {
        return normalizeTokenId(parsed.args?.tokenId);
      }
    } catch {
      // ignore foreign logs
    }
  }

  return null;
}

async function issuerTransactionOverrides() {
  const { provider, signer } = getBlockchainContext();
  return { nonce: await provider.getTransactionCount(await signer.getAddress(), "pending") };
}

export function buildAttendanceHash({ walletAddress, sessionId, nonce, timestamp }) {
  return ethers.keccak256(
    ethers.toUtf8Bytes(
      JSON.stringify({
        walletAddress: walletAddress.toLowerCase(),
        sessionId,
        nonce,
        timestamp,
      })
    )
  );
}

export function buildCredentialContentHash({ certificateId, walletAddress, degreeName, universityName, stream, passingYear, metadataCid }) {
  return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({
    certificateId,
    walletAddress: walletAddress.toLowerCase(),
    degreeName,
    universityName,
    stream: stream || "",
    passingYear: Number(passingYear) || 0,
    metadataCid,
  })));
}

export async function mintCertificateOnChain({ walletAddress, metadataUri, certificateId, contentHash, degreeName, universityName, issueDate }) {
  const { certificateContract } = getBlockchainContext();
  const tx = await certificateContract.mintCertificate(
    walletAddress,
    metadataUri,
    certificateId,
    contentHash,
    degreeName,
    universityName,
    Math.floor(new Date(issueDate).getTime() / 1000),
    await issuerTransactionOverrides()
  );
  const receipt = await tx.wait();
  const tokenId = await parseMintedTokenId(receipt, certificateContract, "CertificateIssued");

  return {
    tokenId,
    txHash: tx.hash,
    chainId: await getChainId(),
  };
}

export async function revokeCertificateOnChain({ tokenId, reason }) {
  const { certificateContract } = getBlockchainContext();
  const tx = await certificateContract.revokeCertificate(tokenId, reason || "Revoked by authorized issuer", await issuerTransactionOverrides());
  await tx.wait();
  return { txHash: tx.hash, chainId: await getChainId() };
}

export async function mintSkillOnChain({ walletAddress, metadataUri, title, description, proofUri }) {
  const { skillContract } = getBlockchainContext();
  const tx = await skillContract.mintSkill(walletAddress, metadataUri, title, description, proofUri, await issuerTransactionOverrides());
  const receipt = await tx.wait();
  const tokenId = await parseMintedTokenId(receipt, skillContract, "SkillIssued");

  return {
    tokenId,
    txHash: tx.hash,
    chainId: await getChainId(),
  };
}

export async function recordAttendanceOnChain({ studentWallet, courseCode, sessionDate, status, attendanceHash }) {
  const { attendanceContract } = getBlockchainContext();
  const dateNum = Math.floor(new Date(sessionDate).getTime() / 1000);
  const tx = await attendanceContract.recordAttendance(
    studentWallet,
    courseCode || "CS101",
    dateNum,
    status || "present",
    attendanceHash,
    await issuerTransactionOverrides()
  );
  await tx.wait();
  return {
    txHash: tx.hash,
    chainId: await getChainId(),
  };
}

export async function verifyCertificateOnChain(walletAddress, tokenId) {
  try {
    const { verificationContract } = getBlockchainContext();
    const [ownsCertificate, isValid] = await verificationContract.verifyCertificate(walletAddress, tokenId);
    return { ownsCertificate, isValid };
  } catch (error) {
    return { ownsCertificate: false, isValid: false, error: error.message };
  }
}

export async function verifySkillOnChain(walletAddress, tokenId) {
  try {
    const { verificationContract } = getBlockchainContext();
    const [ownsSkill, isValid] = await verificationContract.verifySkill(walletAddress, tokenId);
    return { ownsSkill, isValid };
  } catch (error) {
    return { ownsSkill: false, isValid: false, error: error.message };
  }
}
