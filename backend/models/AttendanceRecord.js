import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema(
  {
    registrationNumber: { type: String, required: true, uppercase: true, trim: true },
    campus: { type: String, required: true },
    branch: { type: String, required: true },
    section: { type: String, required: true },
    walletAddress: { type: String, required: true, lowercase: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "SessionMetadata", required: true },
    timestamp: { type: Date, default: Date.now },
    status: { type: String, enum: ["present", "rejected"], required: true },
    reason: { type: String, default: null },
  },
  { timestamps: true }
);
attendanceRecordSchema.index({ sessionId: 1, registrationNumber: 1 }, { unique: true });
attendanceRecordSchema.index({ sessionId: 1, walletAddress: 1 }, { unique: true });
attendanceRecordSchema.index({ campus: 1, branch: 1, section: 1 });

export default mongoose.model("AttendanceRecord", attendanceRecordSchema);
