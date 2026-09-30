import { useState } from "react";
import { apiFetch, authHeaders } from "../api";
import LoginCard from "../components/LoginCard";
import { useAuth } from "../state/AuthContext";

export default function AddSkillPage() {
  const { user, token, isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    walletAddress: "",
    title: "",
    description: "",
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("walletAddress", form.walletAddress);
      formData.append("title", form.title);
      formData.append("description", form.description);
      if (file) formData.append("proof", file);

      const response = await apiFetch("/add-skill", {
        method: "POST",
        headers: {
          ...authHeaders(token),
        },
        body: formData,
      });
      setResult(response.skill);
    } catch (err) {
      setError(err.message || "Failed to add skill proof");
    } finally {
      setLoading(false);
    }
  }

  if (!isAuthenticated || !["teacher", "admin"].includes(user?.role)) {
    return (
      <div className="page-grid">
        <section className="glass-card card">
          <h2>Teacher or Admin Access Required</h2>
          <p className="muted-text">
            Sign in as `teacher` or `admin` to upload project proof and mint skill credentials.
          </p>
        </section>
        <LoginCard
          initialRole="teacher"
          title="Teacher / Admin Login"
          description="Pick teacher or admin during login to manage skill proofs in beta."
        />
      </div>
    );
  }

  return (
    <section className="glass-card card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Skill Proofs</p>
          <h2>Add Skill / Project NFT</h2>
        </div>
      </div>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          <span>Student Wallet</span>
          <input value={form.walletAddress} onChange={(e) => setForm({ ...form, walletAddress: e.target.value })} />
        </label>
        <label>
          <span>Title</span>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label className="full-width">
          <span>Description</span>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <label className="full-width">
          <span>Proof File</span>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        <button type="submit" className="primary-button" disabled={loading}>
          {loading ? "Uploading..." : "Mint Skill NFT"}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}
      {result && (
        <div className="mini-card">
          <strong>Skill NFT minted</strong>
          <p>Token #{result.tokenId}</p>
          <p>{result.proofUri}</p>
        </div>
      )}
    </section>
  );
}
