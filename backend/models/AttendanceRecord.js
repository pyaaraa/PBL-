import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema(
  {
    registrationNumber: { type: String, required: true, uppercase: true, trim: true },
    campus: { type: String, required: true },
    branch: { type: String, required: true },
    section: { type: String, required: true },
    subject: { type: String, default: "General" },
    teacherName: { type: String, default: "Faculty" },
    walletAddress: { type: String, required: true, lowercase: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "SessionMetadata", required: true },
    timestamp: { type: Date, default: Date.now },
    status: { type: String, enum: ["present", "rejected"], required: true },
    reason: { type: String, default: null },
    proofHash: { type: String, default: null },
    validationMode: { type: String, default: "wallet" },
    blockchain: {
      anchorStatus: {
        type: String,
        enum: ["pending", "anchored", "failed", "skipped"],
        default: "pending",
      },
      anchorTxHash: { type: String, default: null },
      anchorChainId: { type: Number, default: null },
      anchoredAt: { type: Date, default: null },
      certificateTokenId: { type: String, default: null },
      certificateTxHash: { type: String, default: null },
      certificateTokenUri: { type: String, default: null },
      certificateMintedAt: { type: Date, default: null },
      lastError: { type: String, default: null },
    },
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracyMeters: { type: Number, default: null },
      distanceMeters: { type: Number, default: null },
    },
  },
  { timestamps: true }
);
attendanceRecordSchema.index({ sessionId: 1, registrationNumber: 1 }, { unique: true });
attendanceRecordSchema.index({ sessionId: 1, walletAddress: 1 }, { unique: true });
attendanceRecordSchema.index({ campus: 1, branch: 1, section: 1 });
attendanceRecordSchema.index({ registrationNumber: 1, timestamp: -1 });
attendanceRecordSchema.index({ subject: 1, timestamp: -1 });
attendanceRecordSchema.index({ proofHash: 1 }, { unique: true, sparse: true });

export default mongoose.model("AttendanceRecord", attendanceRecordSchema);
