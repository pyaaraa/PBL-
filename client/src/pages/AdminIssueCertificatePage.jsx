import { useState } from "react";
import { apiFetch, authHeaders } from "../api";
import LoginCard from "../components/LoginCard";
import { useAuth } from "../state/AuthContext";

export default function AdminIssueCertificatePage() {
  const { user, token, isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    walletAddress: "",
    degreeName: "",
    universityName: "DAuth University",
    issueDate: new Date().toISOString().slice(0, 10),
  });
  const [result, setResult] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!pdfFile) {
        throw new Error("Select the certificate PDF to upload.");
      }
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      formData.append("pdfFile", pdfFile);

      const response = await apiFetch("/issue-certificate", {
        method: "POST",
        headers: {
          ...authHeaders(token),
        },
        body: formData,
      });
      setResult(response.certificate);
    } catch (err) {
      setError(err.message || "Failed to issue certificate");
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="page-grid">
        <section className="glass-card card">
          <h2>Admin Access Required</h2>
          <p className="muted-text">
            Connect an allowlisted administrator wallet to issue academic certificates.
          </p>
        </section>
        <LoginCard
          initialRole="admin"
          title="Admin Wallet Login"
          description="Use an allowlisted university administrator wallet to mint certificates."
        />
      </div>
    );
  }

  return (
    <section className="glass-card card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Admin Panel</p>
          <h2>Issue Certificate NFT</h2>
        </div>
      </div>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          <span>Student Wallet</span>
          <input value={form.walletAddress} onChange={(e) => setForm({ ...form, walletAddress: e.target.value })} />
        </label>
        <label>
          <span>Degree Name</span>
          <input value={form.degreeName} onChange={(e) => setForm({ ...form, degreeName: e.target.value })} />
        </label>
        <label>
          <span>University Name</span>
          <input value={form.universityName} onChange={(e) => setForm({ ...form, universityName: e.target.value })} />
        </label>
        <label>
          <span>Issue Date</span>
          <input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
        </label>
        <label>
          <span>Signed Certificate PDF</span>
          <input
            type="file"
            accept="application/pdf"
            required
            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
          />
        </label>
        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? "Issuing..." : "Mint Certificate"}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}
      {result && (
        <div className="mini-card">
          <strong>Certificate issued</strong>
          <p>Token #{result.tokenId}</p>
          <p>{result.metadataUri}</p>
        </div>
      )}
    </section>
  );
}
