import mongoose from "mongoose";

const attendanceChallengeSchema = new mongoose.Schema(
  {
    walletAddress: { type: String, required: true, lowercase: true, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "AttendanceSession", required: true, index: true },
    nonce: { type: String, required: true, unique: true, index: true },
    messageToSign: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

attendanceChallengeSchema.index({ walletAddress: 1, sessionId: 1 });
attendanceChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("AttendanceChallenge", attendanceChallengeSchema);
