import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/attendance-pbl";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log("MongoDB connected to " + uri);
  } catch (err) {
    console.warn("Failed to connect to primary MongoDB (" + uri + "): " + err.message);
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      console.log("Starting in-memory MongoDB fallback...");
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log("MongoDB connected (In-Memory) at " + mongoUri);
    } catch (memErr) {
      console.error("Could not start MongoDB in-memory fallback:", memErr.message);
      throw err;
    }
  }
}

