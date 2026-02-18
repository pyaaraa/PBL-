const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'http://localhost:5000');

export async function getActiveSession() {
  const res = await fetch(`${API_BASE}/api/session/active`);
  if (!res.ok) throw new Error("Failed to fetch session");
  return res.json();
}

export async function requestNonce(body) {
  const res = await fetch(`${API_BASE}/api/attendance/request-nonce`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to get nonce");
  return data;
}

export async function verifyAttendance(body) {
  const res = await fetch(`${API_BASE}/api/attendance/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Verification failed");
  return data;
}

export async function getSessions() {
  const res = await fetch(`${API_BASE}/api/admin/sessions`);
  if (!res.ok) throw new Error("Failed to fetch sessions");
  return res.json();
}

export async function createSession() {
  const res = await fetch(`${API_BASE}/api/admin/sessions`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
}

export async function getAttendance(params = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/api/admin/attendance?${q}`);
  if (!res.ok) throw new Error("Failed to fetch attendance");
  return res.json();
}

export function getAttendanceExportUrl(params = {}) {
  const q = new URLSearchParams(params).toString();
  return `${API_BASE}/api/admin/attendance/export?${q}`;
}

export async function getAuditLog(limit = 100) {
  const res = await fetch(`${API_BASE}/api/admin/audit?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch audit log");
  return res.json();
}
