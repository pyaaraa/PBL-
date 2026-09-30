import mongoose from "mongoose";

const skillRecordSchema = new mongoose.Schema(
  {
    walletAddress: { type: String, required: true, lowercase: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    proofCid: { type: String, required: true },
    proofUri: { type: String, required: true },
    metadataCid: { type: String, required: true },
    metadataUri: { type: String, required: true },
    tokenId: { type: String, required: true, unique: true },
    txHash: { type: String, required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isValid: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("SkillRecord", skillRecordSchema);
