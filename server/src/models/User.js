import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    walletAddress: { type: String, required: true, unique: true, lowercase: true, index: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    rollNumber: { type: String, default: "", index: true },
    branch: { type: String, default: "" },
    semester: { type: String, default: "" },
    campus: { type: String, default: "" },
    section: { type: String, default: "" },
    role: {
      type: String,
      enum: ["student", "admin", "recruiter", "teacher"],
      default: "student",
    },
    isApproved: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    attendance: [{ type: mongoose.Schema.Types.ObjectId, ref: "AttendanceRecord" }],
    certificates: [{ type: mongoose.Schema.Types.ObjectId, ref: "CertificateRecord" }],
    skills: [{ type: mongoose.Schema.Types.ObjectId, ref: "SkillRecord" }],
    grades: [{ type: mongoose.Schema.Types.ObjectId, ref: "GradeRecord" }],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
