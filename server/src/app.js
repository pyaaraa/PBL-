import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import certificateRoutes from "./routes/certificateRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import skillRoutes from "./routes/skillRoutes.js";
import verificationRoutes from "./routes/verificationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { apiRateLimit } from "./middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configuredOrigins = [process.env.CLIENT_URL, "http://localhost:5173", "http://127.0.0.1:5173"]
  .filter(Boolean)
  .join(",")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isLocalDevelopmentOrigin(origin) {
  return /^https?:\/\/(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}):5173$/.test(origin);
}

function getLanAddress() {
  for (const network of Object.values(os.networkInterfaces())) {
    for (const address of network || []) {
      if (address.family === "IPv4" && !address.internal) return address.address;
    }
  }
  return "";
}

function getPublicAppUrl() {
  const configured = configuredOrigins.find((origin) => !/^https?:\/\/(?:localhost|127\.0\.0\.1)/.test(origin));
  return configured || (getLanAddress() ? `http://${getLanAddress()}:5173` : "http://localhost:5173");
}

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || configuredOrigins.includes(origin) || (process.env.NODE_ENV !== "production" && isLocalDevelopmentOrigin(origin))) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS"));
    },
  })
);
app.use(express.json({ limit: "10mb" }));
app.use("/api", apiRateLimit);
app.use("/beta/ipfs", express.static(path.resolve(__dirname, "..", "storage", "ipfs")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), service: "DAuth API" });
});

app.get("/api/public-url", (_req, res) => {
  res.json({ publicAppUrl: getPublicAppUrl() });
});

app.use("/api", authRoutes);
app.use("/api", attendanceRoutes);
app.use("/api", certificateRoutes);
app.use("/api", skillRoutes);
app.use("/api", verificationRoutes);
app.use("/api", profileRoutes);
app.use("/api", adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
