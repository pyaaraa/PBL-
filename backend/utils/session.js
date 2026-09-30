import SessionMetadata from "../models/SessionMetadata.js";

const LOCATION_MODES = new Set(["wallet_location", "wallet_location_network"]);
const NETWORK_MODES = new Set(["wallet_network", "wallet_location_network"]);

function toDate(value, fallback = new Date()) {
  return value ? new Date(value) : fallback;
}

export function getSessionStartTime(session) {
  return toDate(session?.startTime, toDate(session?.createdAt));
}

export function sessionRequiresLocation(session) {
  return LOCATION_MODES.has(session?.validationMode);
}

export function sessionRequiresNetwork(session) {
  return NETWORK_MODES.has(session?.validationMode);
}

export function getSessionState(session, now = new Date()) {
  if (!session) return "inactive";
  const startTime = getSessionStartTime(session);
  const expiryTime = toDate(session.expiryTime);

  if (session.closedAt) return "closed";
  if (now >= expiryTime) return "expired";
  if (now < startTime) return "scheduled";
  return "live";
}

export async function syncSessionState(session, now = new Date()) {
  if (!session) return null;

  const nextState = getSessionState(session, now);
  const updates = {};

  if (nextState === "live" && !session.active) {
    updates.active = true;
  }

  if ((nextState === "expired" || nextState === "closed") && session.active) {
    updates.active = false;
  }

  if (Object.keys(updates).length > 0) {
    await SessionMetadata.updateOne({ _id: session._id }, { $set: updates });
    Object.assign(session, updates);
  }

  return session;
}

export function serializeSession(session, extras = {}) {
  if (!session) return null;

  const startTime = getSessionStartTime(session);
  const state = getSessionState(session);
  const expiryTime = toDate(session.expiryTime);

  return {
    _id: session._id,
    sessionId: session.sessionId,
    subject: session.subject || "General",
    teacherName: session.teacherName || "Faculty",
    campus: session.campus || "Main Campus",
    branch: session.branch || "CSE",
    section: session.section || "Section A",
    roomLabel: session.roomLabel || "Classroom",
    notes: session.notes || "",
    createdAt: toDate(session.createdAt).toISOString(),
    startTime: startTime.toISOString(),
    expiryTime: expiryTime.toISOString(),
    attendanceWindowMinutes: session.attendanceWindowMinutes ?? 10,
    validationMode: session.validationMode || "wallet",
    requiresLocation: sessionRequiresLocation(session),
    requiresNetwork: sessionRequiresNetwork(session),
    geoLatitude: session.geoLatitude ?? null,
    geoLongitude: session.geoLongitude ?? null,
    geoRadiusMeters: session.geoRadiusMeters ?? 75,
    allowedIpPrefixes: session.allowedIpPrefixes || [],
    active: state === "live",
    state,
    closedAt: session.closedAt ? toDate(session.closedAt).toISOString() : null,
    ...extras,
  };
}

export async function getCurrentSession(now = new Date()) {
  const candidates = await SessionMetadata.find({
    $or: [{ closedAt: null }, { closedAt: { $exists: false } }],
    expiryTime: { $gt: now },
  })
    .sort({ startTime: -1, createdAt: -1 })
    .limit(25);

  for (const session of candidates) {
    await syncSessionState(session, now);
    if (getSessionState(session, now) === "live") {
      return session;
    }
  }

  return null;
}

export async function getUpcomingSession(now = new Date()) {
  const next = await SessionMetadata.findOne({
    $or: [{ closedAt: null }, { closedAt: { $exists: false } }],
    expiryTime: { $gt: now },
    startTime: { $gt: now },
  }).sort({ startTime: 1, createdAt: 1 });

  if (!next) return null;

  await syncSessionState(next, now);
  return next;
}
