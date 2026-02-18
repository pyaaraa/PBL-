import { useState, useEffect } from "react";
import {
  getSessions,
  createSession,
  getAttendance,
  getAttendanceExportUrl,
  getAuditLog,
} from "../api";
import "./AdminPage.css";

const CAMPUSES = ["", "Main Campus", "North Campus", "South Campus"];
const BRANCHES = ["", "CSE", "Cyber Security", "AI & ML", "Data Science"];
const SECTIONS = ["", "Section A", "Section B", "Section C"];

export default function AdminPage() {
  const [sessions, setSessions] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [filterCampus, setFilterCampus] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterSessionId, setFilterSessionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const loadSessions = async () => {
    try {
      const { sessions: s } = await getSessions();
      setSessions(s || []);
    } catch (e) {
      setError(e.message);
    }
  };

  const loadAttendance = async () => {
    try {
      const params = {};
      if (filterCampus) params.campus = filterCampus;
      if (filterBranch) params.branch = filterBranch;
      if (filterSection) params.section = filterSection;
      if (filterSessionId) params.sessionId = filterSessionId;
      const { attendance: a } = await getAttendance(params);
      setAttendance(a || []);
    } catch (e) {
      setError(e.message);
    }
  };

  const loadAudit = async () => {
    try {
      const { logs } = await getAuditLog(100);
      setAuditLog(logs || []);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      await Promise.all([loadSessions(), loadAttendance(), loadAudit()]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [filterCampus, filterBranch, filterSection, filterSessionId]);

  const handleCreateSession = async () => {
    setCreating(true);
    setError("");
    try {
      await createSession();
      await loadSessions();
      await loadAttendance();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const exportParams = {};
  if (filterCampus) exportParams.campus = filterCampus;
  if (filterBranch) exportParams.branch = filterBranch;
  if (filterSection) exportParams.section = filterSection;
  if (filterSessionId) exportParams.sessionId = filterSessionId;
  const exportUrl = getAttendanceExportUrl(exportParams);

  return (
    <div className="admin-page">
      <h1 className="admin-title">Admin Dashboard</h1>
      {error && <div className="admin-error">{error}</div>}
      {loading ? (
        <p className="admin-loading">Loading…</p>
      ) : (
        <>
          <section className="admin-section">
            <h2>Sessions</h2>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateSession}
              disabled={creating}
            >
              {creating ? "Creating…" : "Create new session"}
            </button>
            <div className="sessions-list">
              {sessions.length === 0 ? (
                <p className="muted">No sessions. Create one to allow attendance.</p>
              ) : (
                sessions.map((s) => (
                  <div key={s._id} className="session-item">
                    <span className="session-id">{s.sessionId}</span>
                    <span className={s.active ? "badge live" : "badge idle"}>
                      {s.active ? "Active" : "Closed"}
                    </span>
                    <span className="muted">
                      Expires: {new Date(s.expiryTime).toLocaleString()}
                    </span>
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
                {CAMPUSES.map((c) => (
                  <option key={c || "all"} value={c}>{c || "All campuses"}</option>
                ))}
              </select>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="filter-select"
              >
                {BRANCHES.map((b) => (
                  <option key={b || "all"} value={b}>{b || "All branches"}</option>
                ))}
              </select>
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="filter-select"
              >
                {SECTIONS.map((s) => (
                  <option key={s || "all"} value={s}>{s || "All sections"}</option>
                ))}
              </select>
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
                    <th>Campus</th>
                    <th>Branch</th>
                    <th>Section</th>
                    <th>Wallet</th>
                    <th>Session</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((r) => (
                    <tr key={r._id}>
                      <td>{r.registrationNumber}</td>
                      <td>{r.campus}</td>
                      <td>{r.branch}</td>
                      <td>{r.section}</td>
                      <td className="mono">{r.walletAddress?.slice(0, 10)}…</td>
                      <td>{r.sessionId?.sessionId ?? "-"}</td>
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
