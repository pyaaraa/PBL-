import { verifyAuthToken } from "../utils/auth.js";

export function requireWalletAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    req.auth = verifyAuthToken(token);
    next();
  } catch (err) {
    res.status(401).json({ error: err.message || "Unauthorized" });
  }
}
