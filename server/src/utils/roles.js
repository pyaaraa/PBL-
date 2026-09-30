import { ethers } from "ethers";

function parseWalletList(envValue) {
  if (!envValue) return [];
  return envValue
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item && ethers.isAddress(item));
}

export function getAdminWallets() {
  return parseWalletList(process.env.ADMIN_WALLETS);
}

export function getRecruiterWallets() {
  return parseWalletList(process.env.RECRUITER_WALLETS);
}

export function resolveLoginRole(walletAddress, requestedRole) {
  const normalized = walletAddress.toLowerCase();
  const adminWallets = getAdminWallets();
  const recruiterWallets = getRecruiterWallets();

  if (adminWallets.includes(normalized)) {
    return "admin";
  }

  if (recruiterWallets.includes(normalized)) {
    return "recruiter";
  }

  if (requestedRole === "admin" || requestedRole === "recruiter") {
    return "student";
  }

  if (requestedRole === "teacher") {
    return adminWallets.length === 0 ? "teacher" : "student";
  }

  return requestedRole || "student";
}
