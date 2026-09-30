import mongoose from "mongoose";

const gradeRecordSchema = new mongoose.Schema(
  {
    walletAddress: { type: String, required: true, lowercase: true, index: true },
    courseCode: { type: String, required: true, trim: true, uppercase: true },
    courseName: { type: String, required: true, trim: true },
    semester: { type: String, default: "" },
    score: { type: Number, required: true, min: 0, max: 100 },
    grade: { type: String, required: true, trim: true, uppercase: true },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

gradeRecordSchema.index({ walletAddress: 1, courseCode: 1, semester: 1 }, { unique: true });

export default mongoose.model("GradeRecord", gradeRecordSchema);
