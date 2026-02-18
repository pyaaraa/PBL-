import mongoose from "mongoose";

const sessionMetadataSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    expiryTime: { type: Date, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

sessionMetadataSchema.index({ active: 1 });

export default mongoose.model("SessionMetadata", sessionMetadataSchema);
