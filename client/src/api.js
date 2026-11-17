function resolveApiBase() {
  const configured = import.meta.env.VITE_API_URL || "http://localhost:5050/api";
  if (typeof window === "undefined") return configured;

  const apiUrl = new URL(configured);
  const appHost = window.location.hostname;
  const apiUsesLocalhost = ["localhost", "127.0.0.1", "::1"].includes(apiUrl.hostname);
  const appUsesLocalhost = ["localhost", "127.0.0.1", "::1"].includes(appHost);

  // A phone opening a LAN QR link must call the laptop's API, not its own localhost.
  if (apiUsesLocalhost && !appUsesLocalhost) apiUrl.hostname = appHost;
  return apiUrl.toString().replace(/\/$/, "");
}

const API_BASE = resolveApiBase();

async function readPayload(res) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const payload = await readPayload(res);
  if (!res.ok) {
    const message =
      payload?.error ||
      payload?.message ||
      (typeof payload === "string" ? payload : "Request failed");
    throw new Error(message);
  }
  return payload;
}

export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getApiBase() {
  return API_BASE;
}

export function certificatePdfUrl(walletAddress, tokenId) {
  return `${API_BASE}/certificates/${walletAddress}/${tokenId}/pdf`;
}
