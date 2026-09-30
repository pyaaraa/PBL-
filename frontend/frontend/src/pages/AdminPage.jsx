import { useState, useEffect, useCallback } from "react";
import {
  getSessions,
  createSession,
  closeSession,
  getAttendance,
  getAttendanceExportUrl,
  getAuditLog,
} from "../api";
import { BRANCHES, CAMPUSES, SECTIONS, VALIDATION_OPTIONS } from "../constants";
import "./AdminPage.css";

function toLocalDateTimeValue(date) {
  const target = date instanceof Date ? date : new Date(date);
  const offset = target.getTimezoneOffset() * 60000;
  return new Date(target.getTime() - offset).toISOString().slice(0, 16);
}

function getDefaultSessionForm() {
  return {
    subject: "DBMS",
    teacherName: "Faculty",
    campus: CAMPUSES[0],
    branch: BRANCHES[0],
    section: SECTIONS[0],
    roomLabel: "Room 204",
    startTime: toLocalDateTimeValue(new Date()),
    durationMinutes: 10,
    attendanceWindowMinutes: 10,
    validationMode: "wallet",
    geoLatitude: "",
    geoLongitude: "",
    geoRadiusMeters: 75,
    allowedIpPrefixes: "",
    notes: "",
  };
}

function formatValidationMode(value) {
  const option = VALIDATION_OPTIONS.find((item) => item.value === value);
  return option?.label || value;
}

export default function AdminPage() {
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [filterCampus, setFilterCampus] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterSessionId, setFilterSessionId] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [closingSessionId, setClosingSessionId] = useState("");
  const [sessionForm, setSessionForm] = useState(getDefaultSessionForm());

  const loadSessions = useCallback(async () => {
    try {
      const { sessions: s } = await getSessions();
      setSessions(s || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const loadAttendance = useCallback(async () => {
    try {
      const params = {};
      if (filterCampus) params.campus = filterCampus;
      if (filterBranch) params.branch = filterBranch;
      if (filterSection) params.section = filterSection;
      if (filterSessionId) params.sessionId = filterSessionId;
      if (filterSubject) params.subject = filterSubject;
      const { attendance: a } = await getAttendance(params);
      setAttendance(a || []);
    } catch (e) {
      setError(e.message);
    }
  }, [filterCampus, filterBranch, filterSection, filterSessionId, filterSubject]);

  const loadAudit = useCallback(async () => {
    try {
      const { logs } = await getAuditLog(100);
      setAuditLog(logs || []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      await Promise.all([loadSessions(), loadAttendance(), loadAudit()]);
      setLoading(false);
    })();
  }, [loadAudit, loadAttendance, loadSessions]);

  useEffect(() => {
    loadAttendance().catch(() => {});
  }, [loadAttendance]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError("");
    try {
      await Promise.all([loadSessions(), loadAttendance(), loadAudit()]);
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateSession = async () => {
    setCreating(true);
    setError("");
    try {
      await createSession({
        ...sessionForm,
        durationMinutes: Number(sessionForm.durationMinutes),
        attendanceWindowMinutes: Number(sessionForm.attendanceWindowMinutes),
        geoRadiusMeters: Number(sessionForm.geoRadiusMeters),
      });
      await loadSessions();
      await loadAttendance();
      setSessionForm(getDefaultSessionForm());
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleCloseSession = async (sessionId) => {
    setClosingSessionId(sessionId);
    setError("");
    try {
      await closeSession(sessionId);
      await handleRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setClosingSessionId("");
    }
  };

  const exportParams = {};
  if (filterCampus) exportParams.campus = filterCampus;
  if (filterBranch) exportParams.branch = filterBranch;
  if (filterSection) exportParams.section = filterSection;
  if (filterSessionId) exportParams.sessionId = filterSessionId;
  if (filterSubject) exportParams.subject = filterSubject;
  const exportUrl = getAttendanceExportUrl(exportParams);
  const activeSessions = sessions.filter((s) => s.state === "live").length;
  const scheduledSessions = sessions.filter((s) => s.state === "scheduled").length;
  const uniqueWallets = new Set(attendance.map((r) => r.walletAddress)).size;
  const failedAttempts = auditLog.filter((l) => !l.success).length;
  const liveSession = sessions.find((s) => s.state === "live");

  return (
    <div className="admin-page">
      <h1 className="admin-title">Admin Dashboard</h1>
      {error && <div className="admin-error">{error}</div>}
      {loading ? (
        <p className="admin-loading">Loading…</p>
      ) : (
        <>
          <section className="admin-stats">
            <article className="stat-card">
              <p className="stat-label">Active sessions</p>
              <p className="stat-value">{activeSessions}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Scheduled sessions</p>
              <p className="stat-value">{scheduledSessions}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Attendance records</p>
              <p className="stat-value">{attendance.length}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Live attendees</p>
              <p className="stat-value">{liveSession?.attendanceCount || 0}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Unique wallets</p>
              <p className="stat-value">{uniqueWallets}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Failed attempts</p>
              <p className="stat-value">{failedAttempts}</p>
            </article>
          </section>

          <section className="admin-section">
            <div className="section-head">
              <div>
                <h2>Teacher Session Control</h2>
                <p className="muted">Start live attendance, schedule future classes, and close sessions instantly.</p>
              </div>
              <div className="section-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCreateSession}
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Start / Schedule Session"}
                </button>
              </div>
            </div>
            <div className="session-form-grid">
              <label>
                <span>Subject</span>
                <input
                  className="filter-input"
                  value={sessionForm.subject}
                  onChange={(e) => setSessionForm((prev) => ({ ...prev, subject: e.target.value }))}
                />
              </label>
              <label>
                <span>Teacher</span>
                <input
                  className="filter-input"
                  value={sessionForm.teacherName}
                  onChange={(e) => setSessionForm((prev) => ({ ...prev, teacherName: e.target.value }))}
                />
              </label>
              <label>
                <span>Campus</span>
                <select
                  className="filter-select"
                  value={sessionForm.campus}
                  onChange={(e) => setSessionForm((prev) => ({ ...prev, campus: e.target.value }))}
                >
                  {CAMPUSES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Branch</span>
                <select
                  className="filter-select"
                  value={sessionForm.branch}
                  onChange={(e) => setSessionForm((prev) => ({ ...prev, branch: e.target.value }))}
                >
                  {BRANCHES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Section</span>
                <select
                  className="filter-select"
                  value={sessionForm.section}
                  onChange={(e) => setSessionForm((prev) => ({ ...prev, section: e.target.value }))}
                >
                  {SECTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Room</span>
                <input
                  className="filter-input"
                  value={sessionForm.roomLabel}
                  onChange={(e) => setSessionForm((prev) => ({ ...prev, roomLabel: e.target.value }))}
                />
              </label>
              <label>
                <span>Start time</span>
                <input
                  type="datetime-local"
                  className="filter-input"
                  value={sessionForm.startTime}
                  onChange={(e) => setSessionForm((prev) => ({ ...prev, startTime: e.target.value }))}
                />
              </label>
              <label>
                <span>Duration (mins)</span>
                <input
                  type="number"
                  min="5"
                  max="180"
                  className="filter-input"
                  value={sessionForm.durationMinutes}
                  onChange={(e) => setSessionForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                />
              </label>
              <label>
                <span>Attendance window</span>
                <input
                  type="number"
                  min="5"
                  max="180"
                  className="filter-input"
                  value={sessionForm.attendanceWindowMinutes}
                  onChange={(e) => setSessionForm((prev) => ({ ...prev, attendanceWindowMinutes: e.target.value }))}
                />
              </label>
              <label className="wide">
                <span>Validation mode</span>
                <select
                  className="filter-select"
                  value={sessionForm.validationMode}
                  onChange={(e) => setSessionForm((prev) => ({ ...prev, validationMode: e.target.value }))}
                >
                  {VALIDATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              {(sessionForm.validationMode === "wallet_location" ||
                sessionForm.validationMode === "wallet_location_network") && (
                <>
                  <label>
                    <span>Latitude</span>
                    <input
                      className="filter-input"
                      value={sessionForm.geoLatitude}
                      onChange={(e) => setSessionForm((prev) => ({ ...prev, geoLatitude: e.target.value }))}
                      placeholder="17.3850"
                    />
                  </label>
                  <label>
                    <span>Longitude</span>
                    <input
                      className="filter-input"
                      value={sessionForm.geoLongitude}
                      onChange={(e) => setSessionForm((prev) => ({ ...prev, geoLongitude: e.target.value }))}
                      placeholder="78.4867"
                    />
                  </label>
                  <label>
                    <span>Radius (meters)</span>
                    <input
                      type="number"
                      min="10"
                      max="2000"
                      className="filter-input"
                      value={sessionForm.geoRadiusMeters}
                      onChange={(e) => setSessionForm((prev) => ({ ...prev, geoRadiusMeters: e.target.value }))}
                    />
                  </label>
                </>
              )}
              {(sessionForm.validationMode === "wallet_network" ||
                sessionForm.validationMode === "wallet_location_network") && (
                <label className="wide">
                  <span>Allowed campus IP prefixes</span>
                  <textarea
                    className="filter-textarea"
                    value={sessionForm.allowedIpPrefixes}
                    onChange={(e) => setSessionForm((prev) => ({ ...prev, allowedIpPrefixes: e.target.value }))}
                    placeholder="127.0.0.1, 10.10.0.0/16, 192.168.1.*"
                  />
                </label>
              )}
              <label className="wide">
                <span>Session notes</span>
                <textarea
                  className="filter-textarea"
                  value={sessionForm.notes}
                  onChange={(e) => setSessionForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes for students"
                />
              </label>
            </div>
            <div className="sessions-list">
              {sessions.length === 0 ? (
                <p className="muted">No sessions. Create one to allow attendance.</p>
              ) : (
                sessions.map((s) => (
                  <div key={s._id} className="session-item">
                    <div className="session-copy">
                      <div className="session-topline">
                        <span className="session-id">{s.sessionId}</span>
                        <span className={s.state === "live" ? "badge live" : "badge idle"}>
                          {s.state}
                        </span>
                        <span className="badge outline">{formatValidationMode(s.validationMode)}</span>
                      </div>
                      <strong>{s.subject}</strong>
                      <span className="muted">
                        {s.teacherName} · {s.branch} {s.section} · {s.roomLabel}
                      </span>
                      <span className="muted">
                        Starts {new Date(s.startTime).toLocaleString()} · Ends {new Date(s.expiryTime).toLocaleString()}
                      </span>
                      <span className="muted">
                        Attendance window: {s.attendanceWindowMinutes} mins · Attendees: {s.attendanceCount || 0}
                      </span>
                    </div>
                    {s.state === "live" && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleCloseSession(s.sessionId)}
                        disabled={closingSessionId === s.sessionId}
                      >
                        {closingSessionId === s.sessionId ? "Closing..." : "Close Session"}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="admin-section">
            <h2>Attendance</h2>
            <div className="filters">
              <select
                value={filterCampus}
                onChange={(e) => setFilterCampus(e.target.value)}
                className="filter-select"
              >
                <option value="">All campuses</option>
                {CAMPUSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="filter-select"
              >
                <option value="">All branches</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="filter-select"
              >
                <option value="">All sections</option>
                {SECTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Subject"
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="filter-input"
              />
              <input
                type="text"
                placeholder="Session ID"
                value={filterSessionId}
                onChange={(e) => setFilterSessionId(e.target.value)}
                className="filter-input"
              />
              <a href={exportUrl} download className="btn btn-secondary">
                Export CSV
              </a>
            </div>
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Reg No</th>
                    <th>Subject</th>
                    <th>Teacher</th>
                    <th>Campus</th>
                    <th>Branch</th>
                    <th>Section</th>
                    <th>Wallet</th>
                    <th>Session</th>
                    <th>Proof</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((r) => (
                    <tr key={r._id}>
                      <td>{r.registrationNumber}</td>
                      <td>{r.subject || r.sessionId?.subject || "-"}</td>
                      <td>{r.teacherName || r.sessionId?.teacherName || "-"}</td>
                      <td>{r.campus}</td>
                      <td>{r.branch}</td>
                      <td>{r.section}</td>
                      <td className="mono">{r.walletAddress?.slice(0, 10)}…</td>
                      <td>{r.sessionId?.sessionId ?? "-"}</td>
                      <td className="mono">{r.proofHash ? `${r.proofHash.slice(0, 12)}…` : "-"}</td>
                      <td>{r.timestamp ? new Date(r.timestamp).toLocaleString() : "-"}</td>
                      <td>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {attendance.length === 0 && (
                <p className="muted">No attendance records match the filters.</p>
              )}
            </div>
          </section>

          <section className="admin-section">
            <h2>Audit Log</h2>
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>Success</th>
                    <th>Reg No</th>
                    <th>Wallet</th>
                    <th>Reason</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((l) => (
                    <tr key={l._id}>
                      <td>{l.timestamp ? new Date(l.timestamp).toLocaleString() : "-"}</td>
                      <td>{l.action}</td>
                      <td>{l.success ? "Yes" : "No"}</td>
                      <td>{l.registrationNumber ?? "-"}</td>
                      <td className="mono">{l.walletAddress ? `${l.walletAddress.slice(0, 8)}…` : "-"}</td>
                      <td>{l.reason ?? "-"}</td>
                      <td className="mono">{l.meta ? JSON.stringify(l.meta).slice(0, 60) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {auditLog.length === 0 && <p className="muted">No audit entries yet.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
