
const store = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // per IP per window

function getClientId(req) {
  return req.ip || req.connection?.remoteAddress || "unknown";
}

export function attendanceRateLimit(req, res, next) {
  const id = getClientId(req);
  const now = Date.now();
  let entry = store.get(id);

  if (!entry) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(id, entry);
  }

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + WINDOW_MS;
  }

  entry.count++;
  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }
  next();
}
