import mongoose from "mongoose";

const sessionMetadataSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    subject: { type: String, default: "General" },
    teacherName: { type: String, default: "Faculty" },
    campus: { type: String, default: "Main Campus" },
    branch: { type: String, default: "CSE" },
    section: { type: String, default: "Section A" },
    roomLabel: { type: String, default: "Classroom" },
    notes: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    startTime: { type: Date, default: Date.now },
    expiryTime: { type: Date, required: true },
    attendanceWindowMinutes: { type: Number, default: 10, min: 1, max: 180 },
    validationMode: {
      type: String,
      enum: ["wallet", "wallet_location", "wallet_network", "wallet_location_network"],
      default: "wallet",
    },
    geoLatitude: { type: Number, default: null },
    geoLongitude: { type: Number, default: null },
    geoRadiusMeters: { type: Number, default: 75, min: 10, max: 2000 },
    allowedIpPrefixes: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

sessionMetadataSchema.index({ active: 1 });
sessionMetadataSchema.index({ startTime: 1, expiryTime: 1 });
sessionMetadataSchema.index({ campus: 1, branch: 1, section: 1, subject: 1 });

export default mongoose.model("SessionMetadata", sessionMetadataSchema);
