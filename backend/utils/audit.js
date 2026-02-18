import AuditLog from "../models/AuditLog.js";


export async function logAudit(data) {
  try {
    await AuditLog.create(data);
  } catch (err) {
    console.error("Audit log write failed:", err.message);
  }
}
