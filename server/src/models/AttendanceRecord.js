import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema(
  {
    walletAddress: { type: String, required: true, lowercase: true, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "AttendanceSession", required: true },
    signature: { type: String, required: true },
    challengeNonce: { type: String, required: true },
    attendanceHash: { type: String, required: true, unique: true },
    chainTxHash: { type: String, default: null },
    status: { type: String, enum: ["present", "rejected"], default: "present" },
    markedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

attendanceRecordSchema.index({ walletAddress: 1, sessionId: 1 }, { unique: true });

export default mongoose.model("AttendanceRecord", attendanceRecordSchema);
