import mongoose from "mongoose";

const attendanceSessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    courseCode: { type: String, required: true },
    description: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetWallets: { type: [String], default: [] },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    nonceTTLMinutes: { type: Number, default: 10 },
  },
  { timestamps: true }
);

attendanceSessionSchema.index({ startTime: 1, endTime: 1 });

export default mongoose.model("AttendanceSession", attendanceSessionSchema);
