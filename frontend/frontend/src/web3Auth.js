import { requestAuthChallenge, verifyWalletLogin } from "./api";
import { saveWalletAuth } from "./authStorage";

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask not detected. Install the extension to continue.");
  }

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  return accounts?.[0] || "";
}

export async function authenticateWallet(walletAddress) {
  if (!walletAddress) {
    throw new Error("walletAddress is required");
  }

  const challenge = await requestAuthChallenge(walletAddress);
  const signature = await window.ethereum.request({
    method: "personal_sign",
    params: [challenge.messageToSign, walletAddress],
  });
  const verified = await verifyWalletLogin({ walletAddress, signature });

  saveWalletAuth({
    token: verified.token,
    walletAddress: verified.walletAddress,
  });

  return verified;
}
