import mongoose from "mongoose";


const NONCE_EXPIRY_MINUTES = 2;

const nonceStoreSchema = new mongoose.Schema(
  {
    nonce: { type: String, required: true, unique: true },
    walletAddress: { type: String, required: true, lowercase: true },
    sessionId: { type: String, required: true },
    registrationNumber: { type: String, required: true, uppercase: true },
    campus: { type: String, required: true },
    branch: { type: String, required: true },
    section: { type: String, required: true },
    messageToSign: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);
nonceStoreSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
nonceStoreSchema.index({ walletAddress: 1 });

export const getNonceExpiry = () => new Date(Date.now() + NONCE_EXPIRY_MINUTES * 60 * 1000);

export default mongoose.model("NonceStore", nonceStoreSchema);
