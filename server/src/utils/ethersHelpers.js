import { ethers } from "ethers";
import {
  certificateNftAbi,
  skillProofNftAbi,
  verificationAbi,
  attendanceAbi,
} from "./contractConfig.js";

let cachedContext = null;

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function getBlockchainContext() {
  const rpcUrl = required("CHAIN_RPC_URL");
  const privateKey = required("CHAIN_PRIVATE_KEY");
  const certificateAddress = required("CERTIFICATE_NFT_ADDRESS");
  const skillAddress = required("SKILL_PROOF_NFT_ADDRESS");
  const verificationAddress = required("VERIFICATION_CONTRACT_ADDRESS");
  const attendanceAddress = required("ATTENDANCE_CONTRACT_ADDRESS");

  if (
    cachedContext &&
    cachedContext.rpcUrl === rpcUrl &&
    cachedContext.privateKey === privateKey &&
    cachedContext.certificateAddress === certificateAddress &&
    cachedContext.skillAddress === skillAddress &&
    cachedContext.verificationAddress === verificationAddress &&
    cachedContext.attendanceAddress === attendanceAddress
  ) {
    return cachedContext;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  // A long-lived issuer service can submit consecutive issuance/revocation transactions.
  // NonceManager prevents stale RPC nonce reads from producing duplicate nonces.
  const signer = new ethers.NonceManager(new ethers.Wallet(privateKey, provider));
  cachedContext = {
    rpcUrl,
    privateKey,
    certificateAddress,
    skillAddress,
    verificationAddress,
    attendanceAddress,
    provider,
    signer,
    certificateContract: new ethers.Contract(certificateAddress, certificateNftAbi, signer),
    skillContract: new ethers.Contract(skillAddress, skillProofNftAbi, signer),
    verificationContract: new ethers.Contract(verificationAddress, verificationAbi, provider),
    attendanceContract: new ethers.Contract(attendanceAddress, attendanceAbi, signer),
  };

  return cachedContext;
}

export async function getChainId() {
  const { provider } = getBlockchainContext();
  const network = await provider.getNetwork();
  return Number(network.chainId);
}
