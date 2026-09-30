import crypto from "crypto";
import jwt from "jsonwebtoken";

const LOGIN_NONCE_TTL_MS = 5 * 60 * 1000;

function getSecret() {
  return process.env.JWT_SECRET || "dauth-dev-secret";
}

export function generateNonce(bytes = 16) {
  return `0x${crypto.randomBytes(bytes).toString("hex")}`;
}

export function getLoginChallengeExpiry() {
  return new Date(Date.now() + LOGIN_NONCE_TTL_MS);
}

export function buildLoginMessage(walletAddress, nonce) {
  return [
    "Welcome to DAuth",
    "Sign this message to authenticate your academic identity.",
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join("\n");
}

export function signAuthToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: "7d" });
}

export function verifyAuthToken(token) {
  return jwt.verify(token, getSecret());
}
