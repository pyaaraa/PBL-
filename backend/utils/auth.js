import crypto from "crypto";

const AUTH_CHALLENGE_MINUTES = 5;
const AUTH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function getTokenSecret() {
  return process.env.AUTH_TOKEN_SECRET || "attendance-dev-secret";
}

export function getChallengeExpiry() {
  return new Date(Date.now() + AUTH_CHALLENGE_MINUTES * 60 * 1000);
}

export function buildAuthMessage(walletAddress, nonce) {
  return [
    "Sign in to Decentralized Attendance",
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join("\n");
}

export function issueAuthToken(walletAddress) {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: walletAddress.toLowerCase(),
      exp: Date.now() + AUTH_TOKEN_TTL_MS,
    })
  );
  const signature = crypto
    .createHmac("sha256", getTokenSecret())
    .update(`${header}.${payload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${header}.${payload}.${signature}`;
}

export function verifyAuthToken(token) {
  if (!token || typeof token !== "string") {
    throw new Error("Missing auth token");
  }

  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) {
    throw new Error("Malformed auth token");
  }

  const expectedSignature = crypto
    .createHmac("sha256", getTokenSecret())
    .update(`${header}.${payload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  if (expectedSignature !== signature) {
    throw new Error("Invalid auth token signature");
  }

  const decoded = JSON.parse(base64UrlDecode(payload));
  if (!decoded.sub || !decoded.exp) {
    throw new Error("Invalid auth token payload");
  }
  if (Date.now() > decoded.exp) {
    throw new Error("Auth token expired");
  }

  return { walletAddress: decoded.sub.toLowerCase(), exp: decoded.exp };
}
