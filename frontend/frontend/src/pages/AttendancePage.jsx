import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { ethers } from "ethers";
import { requestNonce, verifyAttendance, getActiveSession } from "../api";
import { loadWalletAuth, clearWalletAuth } from "../authStorage";
import { BRANCHES, CAMPUSES, SECTIONS } from "../constants";
import { loadStudentProfile, saveStudentProfile } from "../profileStorage";
import { authenticateWallet, connectWallet as requestWalletConnection } from "../web3Auth";
import "./AttendancePage.css";

const REG_MAX_LEN = 15;
const REG_ALPHA_NUM = /^[A-Za-z0-9]*$/;

function validateRegNo(value) {
  if (!value || !value.trim()) return "Required";
  const v = value.trim();
  if (v.length > REG_MAX_LEN) return `Max ${REG_MAX_LEN} characters`;
  if (!REG_ALPHA_NUM.test(v)) return "Alphanumeric only";
  return null;
}

function formatSessionTime(value) {
  return value ? new Date(value).toLocaleString() : "-";
}

function getValidationSummary(session) {
  if (!session) return [];

  const badges = ["Wallet signature"];
  if (session.requiresLocation) badges.push("Location radius");
  if (session.requiresNetwork) badges.push("Campus network");
  return badges;
}

function getInitialProfile() {
  return loadStudentProfile();
}

function getMinutesRemaining(expiryTime) {
  if (!expiryTime) return null;
  const remainingMs = new Date(expiryTime).getTime() - Date.now();
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (60 * 1000));
}

export default function AttendancePage() {
  const initialProfile = getInitialProfile();
  const [campus, setCampus] = useState(initialProfile.campus || "");
  const [branch, setBranch] = useState(initialProfile.branch || "");
  const [section, setSection] = useState(initialProfile.section || "");
  const [registrationNumber, setRegistrationNumber] = useState(initialProfile.registrationNumber || "");
  const [walletAddress, setWalletAddress] = useState(initialProfile.walletAddress || "");
  const [authToken, setAuthToken] = useState(loadWalletAuth().token || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [info, setInfo] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [proofHash, setProofHash] = useState("");
  const [sessionFeed, setSessionFeed] = useState({ active: false, session: null, nextSession: null });
  const [loadingSession, setLoadingSession] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const lastAnnouncedSessionRef = useRef("");
  const lastWarningSessionRef = useRef("");

  const regError = validateRegNo(registrationNumber);
  const currentSession = sessionFeed.session;
  const nextSession = sessionFeed.nextSession;
  const canSubmit =
    campus &&
    branch &&
    section &&
    registrationNumber.trim() &&
    !regError &&
    walletAddress &&
    sessionFeed.active &&
    !isMarking;

  const pushNotification = useCallback((title, body) => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    }
  }, []);

  const loadSession = useCallback(async (silent = false) => {
    try {
      const current = await getActiveSession();
      setSessionFeed(current);
      if (current.active && current.session?.sessionId) {
        if (lastAnnouncedSessionRef.current !== current.session.sessionId) {
          lastAnnouncedSessionRef.current = current.session.sessionId;
          lastWarningSessionRef.current = "";
          setInfo(`Attendance started for ${current.session.subject}.`);
          pushNotification(
            `Attendance started: ${current.session.subject}`,
            `${current.session.branch} ${current.session.section} is live in ${current.session.roomLabel}.`
          );
        }

        const minutesRemaining = getMinutesRemaining(current.session.expiryTime);
        if (minutesRemaining !== null && minutesRemaining <= 2 && lastWarningSessionRef.current !== current.session.sessionId) {
          lastWarningSessionRef.current = current.session.sessionId;
          setInfo(`Only ${minutesRemaining} minute${minutesRemaining === 1 ? "" : "s"} left to mark attendance.`);
          pushNotification(
            "Attendance closing soon",
            `${current.session.subject} closes in ${minutesRemaining} minute${minutesRemaining === 1 ? "" : "s"}.`
          );
        }
      }
    } catch (err) {
      if (!silent) {
        setError(err.message || "Failed to fetch active session");
      }
      setSessionFeed({ active: false, session: null, nextSession: null });
    } finally {
      setLoadingSession(false);
    }
  }, [pushNotification]);

  useEffect(() => {
    setLoadingSession(true);
    loadSession().catch(() => {});
    const interval = window.setInterval(() => {
      loadSession(true).catch(() => {});
    }, 30000);
    return () => window.clearInterval(interval);
  }, [loadSession]);

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
          setAuthToken("");
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
        setAuthToken("");
      }
    };
    window.ethereum.on?.("accountsChanged", handleAccountsChanged);

    return () => {
      mounted = false;
      window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, []);

  const connectWallet = useCallback(async () => {
    setError("");
    setSuccess("");
    setIsConnecting(true);
    try {
      const address = await requestWalletConnection();
      setWalletAddress(address);
      const auth = await authenticateWallet(address);
      setAuthToken(auth.token);
      setInfo("Wallet authenticated successfully.");
    } catch (err) {
      clearWalletAuth();
      setAuthToken("");
      setError(err.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const requestNotifications = async () => {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const getCurrentLocation = useCallback(() => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy || null,
        });
      },
      (geoError) => {
        reject(new Error(geoError.message || "Unable to fetch location."));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  }), []);

  const markAttendance = async () => {
    if (!walletAddress) {
      setError("Please connect your wallet first.");
      return;
    }
    if (!currentSession || !sessionFeed.active) {
      setError("There is no active attendance session right now.");
      return;
    }
    const reg = registrationNumber.trim();
    if (regError) {
      setError(regError);
      return;
    }

    setError("");
    setSuccess("");
    setInfo("");
    setProofHash("");
    setIsMarking(true);

    try {
      let location;
      if (currentSession.requiresLocation) {
        setIsLocating(true);
        location = await getCurrentLocation();
      }

      const noncePayload = {
        registrationNumber: reg,
        campus,
        branch,
        section,
        walletAddress,
        location,
      };
      const { nonce, messageToSign } = await requestNonce(noncePayload);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(messageToSign);

      const result = await verifyAttendance({
        nonce,
        signature,
        walletAddress,
        registrationNumber: reg,
        location,
      });

      setSuccess("Attendance marked successfully.");
      setProofHash(result.proofHash || "");
      setInfo("Verified attendance badge unlocked for this session.");
      loadSession(true).catch(() => {});
    } catch (err) {
      setError(err.message || "Failed to mark attendance");
    } finally {
      setIsLocating(false);
      setIsMarking(false);
    }
  };

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";
  const minutesRemaining = useMemo(
    () => getMinutesRemaining(currentSession?.expiryTime),
    [currentSession?.expiryTime]
  );
  const validationSummary = useMemo(() => getValidationSummary(currentSession), [currentSession]);

  return (
    <div className="attendance-page">
      <div className="attendance-card">
        <h1 className="attendance-title">Mark Attendance</h1>
        <p className="attendance-subtitle">
          Secure attendance with wallet signature, live teacher sessions, and classroom validation.
        </p>

        <div className={`session-banner ${sessionFeed.active ? "live" : "idle"}`}>
          {loadingSession ? (
            <span>Checking active session...</span>
          ) : sessionFeed.active ? (
            <>
              <span className="session-live">Live now: {currentSession.subject}</span>
              <span className="session-detail">
                {currentSession.teacherName} · {currentSession.branch} {currentSession.section} · {currentSession.roomLabel}
              </span>
              <span className="session-expiry">Ends {formatSessionTime(currentSession.expiryTime)}</span>
              <span className="session-expiry">
                Attendance window: {currentSession.attendanceWindowMinutes} mins
                {minutesRemaining !== null ? ` · ${minutesRemaining} mins left` : ""}
              </span>
              <div className="validation-badges">
                {validationSummary.map((item) => (
                  <span key={item} className="validation-badge">{item}</span>
                ))}
              </div>
            </>
          ) : (
            <>
              <span className="session-idle">No live session right now.</span>
              {nextSession ? (
                <span className="session-detail">
                  Next class: {nextSession.subject} at {formatSessionTime(nextSession.startTime)}
                </span>
              ) : (
                <span className="session-detail">Check back later for the next scheduled class.</span>
              )}
            </>
          )}
        </div>

        <div className="profile-card">
          <div>
            <h2>Saved Profile</h2>
            <p>We keep your class details on this device so attendance becomes close to one click.</p>
          </div>
          <div className="profile-actions">
            {notificationPermission !== "granted" && notificationPermission !== "unsupported" && (
              <button type="button" className="btn btn-secondary" onClick={requestNotifications}>
                Enable notifications
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={connectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : walletAddress ? "Reconnect Wallet" : "Connect Wallet"}
            </button>
          </div>
        </div>

        <form
          className="attendance-form"
          onSubmit={(e) => {
            e.preventDefault();
            markAttendance();
          }}
        >
          <label className="field-label">Campus</label>
          <select
            className="field-select"
            value={campus}
            onChange={(e) => setCampus(e.target.value)}
            required
          >
            <option value="">Select campus</option>
            {CAMPUSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <label className="field-label">Branch</label>
          <select
            className="field-select"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            required
          >
            <option value="">Select branch</option>
            {BRANCHES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <label className="field-label">Section</label>
          <select
            className="field-select"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            required
          >
            <option value="">Select section</option>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <label className="field-label">Registration Number</label>
          <input
            type="text"
            className="field-input"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value.slice(0, REG_MAX_LEN))}
            placeholder="Alphanumeric, max 15"
            maxLength={REG_MAX_LEN}
            required
          />
          {regError && <span className="field-error">{regError}</span>}

          <div className="wallet-row compact">
            {walletAddress && (
              <span className="wallet-badge">Wallet: {shortAddress}</span>
            )}
            {authToken && (
              <span className="wallet-badge auth">Wallet authenticated</span>
            )}
            {currentSession?.requiresLocation && (
              <span className="wallet-badge location">Location check required</span>
            )}
            {currentSession?.requiresNetwork && (
              <span className="wallet-badge network">Campus network check enabled</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!canSubmit}
          >
            {isMarking ? (isLocating ? "Checking location..." : "Marking...") : "Mark Attendance"}
          </button>
        </form>

        {proofHash && (
          <div className="proof-card">
            <span className="proof-badge">Verified attendance</span>
            <code>{proofHash}</code>
          </div>
        )}
        {info && <div className="message info">{info}</div>}
        {success && <div className="message success">{success}</div>}
        {error && <div className="message error">{error}</div>}
      </div>
    </div>
  );
}
