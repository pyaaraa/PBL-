import mongoose from "mongoose";

const certificateRecordSchema = new mongoose.Schema(
  {
    walletAddress: { type: String, required: true, lowercase: true, index: true },
    certificateId: { type: String, required: true, unique: true, index: true, uppercase: true },
    degreeName: { type: String, required: true },
    stream: { type: String, default: "" },
    passingYear: { type: Number, default: null },
    universityName: { type: String, required: true },
    issueDate: { type: Date, required: true },
    metadataCid: { type: String, required: true },
    metadataUri: { type: String, required: true },
    pdfCid: { type: String, default: "" },
    pdfUri: { type: String, default: "" },
    tokenId: { type: String, required: true, unique: true },
    txHash: { type: String, required: true },
    contentHash: { type: String, required: true },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isValid: { type: Boolean, default: true },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    revocationReason: { type: String, default: "" },
    revocationTxHash: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("CertificateRecord", certificateRecordSchema);
