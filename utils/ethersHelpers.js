import { ethers } from "ethers";
import {
  certificateNftAbi,
  skillProofNftAbi,
  verificationAbi,
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

  if (
    cachedContext &&
    cachedContext.rpcUrl === rpcUrl &&
    cachedContext.privateKey === privateKey &&
    cachedContext.certificateAddress === certificateAddress &&
    cachedContext.skillAddress === skillAddress &&
    cachedContext.verificationAddress === verificationAddress
  ) {
    return cachedContext;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  cachedContext = {
    rpcUrl,
    privateKey,
    certificateAddress,
    skillAddress,
    verificationAddress,
    provider,
    signer,
    certificateContract: new ethers.Contract(certificateAddress, certificateNftAbi, signer),
    skillContract: new ethers.Contract(skillAddress, skillProofNftAbi, signer),
    verificationContract: new ethers.Contract(verificationAddress, verificationAbi, provider),
  };

  return cachedContext;
}

export async function getChainId() {
  const { provider } = getBlockchainContext();
  const network = await provider.getNetwork();
  return Number(network.chainId);
}
