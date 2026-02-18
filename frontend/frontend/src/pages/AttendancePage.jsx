import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { requestNonce, verifyAttendance } from "../api";
import "./AttendancePage.css";

const CAMPUSES = ["Main Campus", "North Campus", "South Campus"];
const BRANCHES = ["CSE", "Cyber Security", "AI & ML", "Data Science"];
const SECTIONS = ["Section A", "Section B", "Section C"];
const REG_MAX_LEN = 15;
const REG_ALPHA_NUM = /^[A-Za-z0-9]*$/;

function validateRegNo(value) {
  if (!value || !value.trim()) return "Required";
  const v = value.trim();
  if (v.length > REG_MAX_LEN) return `Max ${REG_MAX_LEN} characters`;
  if (!REG_ALPHA_NUM.test(v)) return "Alphanumeric only";
  return null;
}

export default function AttendancePage() {
  const [campus, setCampus] = useState("");
  const [branch, setBranch] = useState("");
  const [section, setSection] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  const regError = validateRegNo(registrationNumber);
  const canSubmit =
    campus &&
    branch &&
    section &&
    registrationNumber.trim() &&
    !regError &&
    walletAddress &&
    !isMarking;

  const connectWallet = useCallback(async () => {
    setError("");
    setSuccess("");
    if (!window.ethereum) {
      setError("MetaMask not detected. Install the extension to continue.");
      return;
    }
    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const address = accounts[0];
      setWalletAddress(address);
    } catch (err) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const markAttendance = async () => {
    if (!walletAddress) {
      setError("Please connect your wallet first.");
      return;
    }
    const reg = registrationNumber.trim();
    if (regError) {
      setError(regError);
      return;
    }

    setError("");
    setSuccess("");
    setIsMarking(true);

    try {
      const noncePayload = {
        registrationNumber: reg,
        campus,
        branch,
        section,
        walletAddress,
      };
      const { nonce, messageToSign } = await requestNonce(noncePayload);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(messageToSign);

      await verifyAttendance({
        nonce,
        signature,
        walletAddress,
        registrationNumber: reg,
      });

      setSuccess("Attendance marked successfully.");
    } catch (err) {
      setError(err.message || "Failed to mark attendance");
    } finally {
      setIsMarking(false);
    }
  };

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "";

  return (
    <div className="attendance-page">
      <div className="attendance-card">
        <h1 className="attendance-title">Mark Attendance</h1>
        <p className="attendance-subtitle">
          Select your campus, branch, section, enter your registration number, connect your wallet, and confirm.
        </p>

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

          <div className="wallet-row">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={connectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting…" : "Connect Wallet"}
            </button>
            {walletAddress && (
              <span className="wallet-badge">{shortAddress}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!canSubmit}
          >
            {isMarking ? "Marking…" : "Mark Attendance"}
          </button>
        </form>

        {success && <div className="message success">{success}</div>}
        {error && <div className="message error">{error}</div>}
      </div>
    </div>
  );
}
