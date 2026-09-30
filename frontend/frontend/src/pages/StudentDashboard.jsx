import { useCallback, useEffect, useMemo, useState } from "react";
import {
  claimAttendanceCertificate,
  getStudentDashboard,
  getStudentHistory,
  getStudentHistoryExportUrl,
} from "../api";
import { clearWalletAuth, loadWalletAuth } from "../authStorage";
import { BRANCHES, CAMPUSES, SECTIONS, SHORTAGE_THRESHOLD } from "../constants";
import { loadStudentProfile, saveStudentProfile } from "../profileStorage";
import { authenticateWallet, connectWallet } from "../web3Auth";
import "./StudentDashboard.css";

function getInitialProfile() {
  return loadStudentProfile();
}

function formatPercent(value) {
  return `${Math.round(value || 0)}%`;
}

export default function StudentDashboard() {
  const initialProfile = getInitialProfile();
  const [campus, setCampus] = useState(initialProfile.campus || "");
  const [branch, setBranch] = useState(initialProfile.branch || "");
  const [section, setSection] = useState(initialProfile.section || "");
  const [registrationNumber, setRegistrationNumber] = useState(initialProfile.registrationNumber || "");
  const [walletAddress, setWalletAddress] = useState(initialProfile.walletAddress || "");
  const [authState, setAuthState] = useState(loadWalletAuth());
  const [dashboard, setDashboard] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [claimingProofHash, setClaimingProofHash] = useState("");

  useEffect(() => {
    saveStudentProfile({ campus, branch, section, registrationNumber, walletAddress });
  }, [campus, branch, section, registrationNumber, walletAddress]);

  useEffect(() => {
    if (!window.ethereum) return undefined;

    let mounted = true;
    const syncWallet = async () => {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (mounted && accounts?.[0]) {
        setWalletAddress(accounts[0]);
        const storedAuth = loadWalletAuth();
        if (storedAuth.walletAddress && storedAuth.walletAddress.toLowerCase() !== accounts[0].toLowerCase()) {
          clearWalletAuth();
          setAuthState({ token: "", walletAddress: "" });
        }
      }
    };

    syncWallet().catch(() => {});
    const handleAccountsChanged = (accounts) => {
      const nextWallet = accounts?.[0] || "";
      setWalletAddress(nextWallet);
      const storedAuth = loadWalletAuth();
      if (!nextWallet || (storedAuth.walletAddress && storedAuth.walletAddress.toLowerCase() !== nextWallet.toLowerCase())) {
        clearWalletAuth();
        setAuthState({ token: "", walletAddress: "" });
      }
    };
    window.ethereum.on?.("accountsChanged", handleAccountsChanged);

    return () => {
      mounted = false;
      window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, []);

  const params = useMemo(
    () => ({
      registrationNumber: registrationNumber.trim(),
      campus,
      branch,
      section,
      walletAddress,
    }),
    [registrationNumber, campus, branch, section, walletAddress]
  );

  const exportUrl = useMemo(() => {
    if (!params.registrationNumber) return "#";
    return getStudentHistoryExportUrl(params);
  }, [params]);

  const loadData = useCallback(async () => {
    if (!params.registrationNumber || !params.campus || !params.branch || !params.section) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [dashboardResponse, historyResponse] = await Promise.all([
        getStudentDashboard(params),
        getStudentHistory(params),
      ]);
      setDashboard(dashboardResponse);
      setHistory(historyResponse.history || []);
    } catch (err) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    loadData().catch(() => {});
  }, [loadData]);

  const handleConnectWallet = async () => {
    try {
      setError("");
      const address = await connectWallet();
      setWalletAddress(address);
      const auth = await authenticateWallet(address);
      setAuthState({ token: auth.token, walletAddress: auth.walletAddress });
    } catch (err) {
      clearWalletAuth();
      setAuthState({ token: "", walletAddress: "" });
      setError(err.message || "Failed to connect wallet");
    }
  };

  const handleClaimCertificate = async (proofHash) => {
    if (!authState.token) {
      setError("Authenticate your wallet before claiming a certificate.");
      return;
    }

    setClaimingProofHash(proofHash);
    setError("");
    try {
      await claimAttendanceCertificate({ proofHash }, authState.token);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to mint attendance certificate");
    } finally {
      setClaimingProofHash("");
    }
  };

  const summary = dashboard?.summary;

  return (
    <div className="student-dashboard">
      <section className="student-card">
        <div className="student-hero">
          <div>
            <h1>Student Dashboard</h1>
            <p>
              Track subject-wise attendance, shortage risk, and your verified attendance history.
            </p>
          </div>
          <div className="student-hero-actions">
            <button type="button" className="btn btn-secondary" onClick={handleConnectWallet}>
              {authState.token ? "Wallet Authenticated" : walletAddress ? "Authenticate Wallet" : "Connect Wallet"}
            </button>
            <button type="button" className="btn btn-primary" onClick={loadData} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh Dashboard"}
            </button>
          </div>
        </div>

        <div className="student-form-grid">
          <label>
            <span>Campus</span>
            <select value={campus} onChange={(e) => setCampus(e.target.value)} className="field">
              <option value="">Select campus</option>
              {CAMPUSES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Branch</span>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className="field">
              <option value="">Select branch</option>
              {BRANCHES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Section</span>
            <select value={section} onChange={(e) => setSection(e.target.value)} className="field">
              <option value="">Select section</option>
              {SECTIONS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Registration Number</span>
            <input
              className="field"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
              placeholder="Example: 22CSE101"
            />
          </label>
        </div>

        {walletAddress && <p className="wallet-line">Connected wallet: {walletAddress}</p>}
        {authState.token && <p className="wallet-line">Wallet session active. NFT certificate claims are enabled.</p>}
        {error && <div className="panel-error">{error}</div>}
      </section>

      {summary && (
        <>
          <section className="student-stats">
            <article className="student-stat-card">
              <span>Total classes</span>
              <strong>{summary.totalClasses}</strong>
            </article>
            <article className="student-stat-card">
              <span>Attended</span>
              <strong>{summary.totalAttended}</strong>
            </article>
            <article className="student-stat-card">
              <span>Attendance</span>
              <strong>{formatPercent(summary.overallAttendancePercentage)}</strong>
            </article>
            <article className="student-stat-card">
              <span>Threshold</span>
              <strong>{SHORTAGE_THRESHOLD}%</strong>
            </article>
          </section>

          {summary.shortage && (
            <section className="student-alert shortage">
              Attendance is below {summary.shortageThreshold}%. You are currently at{" "}
              {formatPercent(summary.overallAttendancePercentage)}.
            </section>
          )}

          <section className="student-card">
            <div className="section-head">
              <h2>Subject Performance</h2>
              <p>Subject-wise classes attended with shortage warning highlights.</p>
            </div>
            <div className="subject-grid">
              {dashboard.subjectStats.map((item) => (
                <article key={item.subject} className={`subject-card ${item.shortage ? "warn" : ""}`}>
                  <div className="subject-row">
                    <h3>{item.subject}</h3>
                    <span>{formatPercent(item.attendancePercentage)}</span>
                  </div>
                  <p>{item.attendedClasses} of {item.totalClasses} classes attended</p>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(item.attendancePercentage || 0, 100)}%` }}
                    />
                  </div>
                  <span className={`subject-badge ${item.shortage ? "warn" : "ok"}`}>
                    {item.shortage ? "Shortage risk" : "On track"}
                  </span>
                </article>
              ))}
            </div>
          </section>

          <section className="student-card">
            <div className="section-head">
              <div>
                <h2>Attendance History</h2>
                <p>Date-wise verified records with proof hashes for download and review.</p>
              </div>
              <a
                className={`btn btn-secondary ${exportUrl === "#" ? "disabled-link" : ""}`}
                href={exportUrl}
              >
                Export History
              </a>
            </div>
            <div className="table-wrap">
              <table className="student-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Subject</th>
                    <th>Teacher</th>
                    <th>Session</th>
                    <th>On-chain</th>
                    <th>Certificate</th>
                    <th>Proof</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item._id}>
                      <td>{item.timestamp ? new Date(item.timestamp).toLocaleString() : "-"}</td>
                      <td>{item.subject || item.sessionId?.subject || "-"}</td>
                      <td>{item.teacherName || item.sessionId?.teacherName || "-"}</td>
                      <td>{item.sessionId?.sessionId || "-"}</td>
                      <td>{item.blockchain?.anchorStatus || "pending"}</td>
                      <td>
                        {item.blockchain?.certificateTokenId ? (
                          <span>Token #{item.blockchain.certificateTokenId}</span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-small"
                            disabled={
                              claimingProofHash === item.proofHash ||
                              item.blockchain?.anchorStatus === "failed" ||
                              !item.proofHash
                            }
                            onClick={() => handleClaimCertificate(item.proofHash)}
                          >
                            {claimingProofHash === item.proofHash ? "Minting..." : "Claim NFT"}
                          </button>
                        )}
                      </td>
                      <td className="mono-cell">{item.proofHash ? `${item.proofHash.slice(0, 12)}…` : "-"}</td>
                      <td>{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {history.length === 0 && (
                <p className="muted-copy">No attendance history yet for this profile.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
