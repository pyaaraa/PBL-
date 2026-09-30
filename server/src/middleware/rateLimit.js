const store = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 60;

function getClientId(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

export function apiRateLimit(req, res, next) {
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

  entry.count += 1;
  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  next();
}

export function authRateLimit(req, res, next) {
  const id = getClientId(req);
  const now = Date.now();
  const key = `auth:${id}`;
  let entry = store.get(key);

  if (!entry) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    store.set(key, entry);
  }

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + WINDOW_MS;
  }

  entry.count += 1;
  if (entry.count > 10) {
    return res.status(429).json({ error: "Too many login attempts. Please try again later." });
  }

  next();
}
