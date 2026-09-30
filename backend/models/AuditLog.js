import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true }, // e.g. "request_nonce", "verify_success", "verify_failed"
    registrationNumber: { type: String, default: null },
    walletAddress: { type: String, default: null },
    sessionId: { type: String, default: null },
    success: { type: Boolean, required: true },
    reason: { type: String, default: null },
    ip: { type: String, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ action: 1 });

export default mongoose.model("AuditLog", auditLogSchema);
