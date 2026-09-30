import mongoose from "mongoose";

const loginChallengeSchema = new mongoose.Schema(
  {
    walletAddress: { type: String, required: true, lowercase: true, index: true },
    nonce: { type: String, required: true, unique: true },
    messageToSign: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    requestedRole: {
      type: String,
      enum: ["student", "teacher", "admin", "recruiter"],
      default: "student",
    },
  },
  { timestamps: true }
);

loginChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("LoginChallenge", loginChallengeSchema);
