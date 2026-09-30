const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://localhost:5050');

async function readPayload(res) {
  const text = await res.text();
  if (!text) return {};
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Server returned invalid JSON.");
    }
  }
  return { message: text };
}

async function apiFetch(path, init, fallbackError) {
  const res = await fetch(`${API_BASE}${path}`, init);
  const data = await readPayload(res);
  if (!res.ok) {
    const message = data.error || data.message || fallbackError || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getActiveSession() {
  return apiFetch("/api/session/active", undefined, "Failed to fetch session");
}

export async function requestNonce(body) {
  return apiFetch("/api/attendance/request-nonce", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, "Failed to get nonce");
}

export async function verifyAttendance(body) {
  return apiFetch("/api/attendance/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, "Verification failed");
}

export async function requestAuthChallenge(walletAddress) {
  return apiFetch("/api/auth/request-challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress }),
  }, "Failed to request wallet challenge");
}

export async function verifyWalletLogin(body) {
  return apiFetch("/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, "Failed to verify wallet login");
}

export async function getSessions() {
  return apiFetch("/api/admin/sessions", undefined, "Failed to fetch sessions");
}

export async function createSession(body = {}) {
  return apiFetch("/api/admin/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, "Failed to create session");
}

export async function closeSession(sessionId) {
  return apiFetch(`/api/admin/sessions/${encodeURIComponent(sessionId)}/close`, {
    method: "POST",
  }, "Failed to close session");
}

export async function getAttendance(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/api/admin/attendance?${q}`, undefined, "Failed to fetch attendance");
}

export function getAttendanceExportUrl(params = {}) {
  const q = new URLSearchParams(params).toString();
  return `${API_BASE}/api/admin/attendance/export?${q}`;
}

export async function getAuditLog(limit = 100) {
  return apiFetch(`/api/admin/audit?limit=${limit}`, undefined, "Failed to fetch audit log");
}

export async function getStudentDashboard(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/api/student/dashboard?${q}`, undefined, "Failed to fetch student dashboard");
}

export async function getStudentHistory(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/api/student/history?${q}`, undefined, "Failed to fetch attendance history");
}

export function getStudentHistoryExportUrl(params = {}) {
  const q = new URLSearchParams(params).toString();
  return `${API_BASE}/api/student/history/export?${q}`;
}

export async function claimAttendanceCertificate(body, token) {
  return apiFetch("/api/student/certificates/claim", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(body),
  }, "Failed to mint attendance certificate");
}
