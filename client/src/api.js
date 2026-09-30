const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050/api";

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
