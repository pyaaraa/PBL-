import { ethers } from "ethers";
import { useCallback, useMemo, useState } from "react";
import { apiFetch, authHeaders } from "../api";
import LoginCard from "../components/LoginCard";
import { useFetch } from "../hooks/useFetch";
import { useAuth } from "../state/AuthContext";
import { SUBJECTS, subjectForTitle } from "../subjects";

export default function AttendancePage() {
  const { user, token, isAuthenticated } = useAuth();
  const [sessionForm, setSessionForm] = useState({
    title: SUBJECTS[0].title,
    courseCode: SUBJECTS[0].code,
    description: "Beta classroom attendance session",
    startTime: new Date(Date.now() - 5 * 60 * 1000).toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 55 * 60 * 1000).toISOString().slice(0, 16),
    nonceTTLMinutes: 10,
  });
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [workingSession, setWorkingSession] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);
  const fetchLiveSessions = useCallback(() => apiFetch("/sessions/live"), []);
  const { data, loading, run } = useFetch(fetchLiveSessions, []);

  const sessions = useMemo(() => data?.sessions || [], [data]);

  async function handleMarkAttendance(sessionId) {
    setWorkingSession(sessionId);
    setFeedback("");
    setError("");
    try {
      const challenge = await apiFetch("/mark-attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({ sessionId }),
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(challenge.messageToSign);

      const result = await apiFetch("/mark-attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify({
          sessionId,
          nonce: challenge.nonce,
          signature,
        }),
      });

      setFeedback(`Attendance marked. Hash: ${result.attendance.attendanceHash}`);
      run().catch(() => {});
    } catch (err) {
      setError(err.message || "Failed to mark attendance");
    } finally {
      setWorkingSession("");
    }
  }

  async function handleCreateSession(event) {
    event.preventDefault();
    setCreatingSession(true);
    setFeedback("");
    setError("");
    try {
      await apiFetch("/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(token),
        },
        body: JSON.stringify(sessionForm),
      });
      setFeedback("Attendance session created successfully.");
      run().catch(() => {});
    } catch (err) {
      setError(err.message || "Failed to create attendance session");
    } finally {
      setCreatingSession(false);
    }
  }

  return (
    <div className="page-grid">
      {!isAuthenticated && (
        <LoginCard
          initialRole="student"
          title="Student Login"
          description="Students sign attendance. Teachers and admins can switch role during beta login."
        />
      )}
      {isAuthenticated && ["teacher", "admin"].includes(user?.role) && (
        <section className="glass-card card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Teacher Tools</p>
              <h2>Create Attendance Session</h2>
            </div>
          </div>
          <form className="form-grid two-columns" onSubmit={handleCreateSession}>
            <label>
              <span>Subject</span>
              <select
                value={sessionForm.title}
                onChange={(e) => {
                  const subject = subjectForTitle(e.target.value);
                  setSessionForm({ ...sessionForm, title: e.target.value, courseCode: subject?.code || "" });
                }}
              >
                {SUBJECTS.map((subject) => <option key={subject.code} value={subject.title}>{subject.title}</option>)}
              </select>
            </label>
            <label>
              <span>Course Code</span>
              <input
                value={sessionForm.courseCode}
                readOnly
              />
            </label>
            <label className="full-width">
              <span>Description</span>
              <input
                value={sessionForm.description}
                onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
              />
            </label>
            <label>
              <span>Start Time</span>
              <input
                type="datetime-local"
                value={sessionForm.startTime}
                onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
              />
            </label>
            <label>
              <span>End Time</span>
              <input
                type="datetime-local"
                value={sessionForm.endTime}
                onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
              />
            </label>
            <label>
              <span>Nonce TTL (minutes)</span>
              <input
                type="number"
                min="1"
                max="60"
                value={sessionForm.nonceTTLMinutes}
                onChange={(e) => setSessionForm({ ...sessionForm, nonceTTLMinutes: Number(e.target.value) })}
              />
            </label>
            <button type="submit" className="primary-button" disabled={creatingSession}>
              {creatingSession ? "Creating..." : "Create Session"}
            </button>
          </form>
        </section>
      )}
      <section className="glass-card card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Attendance</p>
            <h2>Live Sessions</h2>
          </div>
          <button type="button" className="ghost-button" onClick={() => run()}>
            Refresh
          </button>
        </div>
        {loading && <p>Loading sessions...</p>}
        {feedback && <p className="success-text">{feedback}</p>}
        {error && <p className="error-text">{error}</p>}
        <div className="stack">
          {sessions.map((session) => (
            <div className="mini-card" key={session.id}>
              <div className="row-between">
                <div>
                  <strong>{session.title}</strong>
                  <p>{session.courseCode}</p>
                  <p className="muted-text">
                    {new Date(session.startTime).toLocaleString()} to{" "}
                    {new Date(session.endTime).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => handleMarkAttendance(session.id)}
                  disabled={!isAuthenticated || workingSession === session.id || user?.role !== "student"}
                >
                  {workingSession === session.id ? "Signing..." : "Mark Attendance"}
                </button>
              </div>
            </div>
          ))}
          {sessions.length === 0 && <p className="muted-text">No live attendance sessions right now.</p>}
        </div>
      </section>
    </div>
  );
}
