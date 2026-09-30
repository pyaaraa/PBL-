import mongoose from "mongoose";

const authChallengeSchema = new mongoose.Schema(
  {
    walletAddress: { type: String, required: true, lowercase: true, index: true },
    nonce: { type: String, required: true, unique: true },
    messageToSign: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

authChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("AuthChallenge", authChallengeSchema);
