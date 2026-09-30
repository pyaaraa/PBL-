import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch, certificatePdfUrl } from "../api";

export default function RecruiterViewPage() {
  const { wallet } = useParams();
  const navigate = useNavigate();
  const [queryInput, setQueryInput] = useState(wallet || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleSearch = async (targetQuery) => {
    const q = targetQuery || queryInput;
    if (!q) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await apiFetch(`/verify/${q.trim()}`);
      setResult(data);
    } catch (err) {
      setError(err.message || "No verified credentials found for query");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-[#121824]/90 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl text-center space-y-4">
        <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase block">
          Recruiter & Employer Verification Hub
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white m-0">
          Verify Academic Credentials & Soulbound NFTs
        </h1>
        <p className="text-sm text-gray-300 max-w-xl mx-auto">
          Verify any candidate's degree certificates, skill badges, and attendance records on-chain without contacting the university database.
        </p>

        {/* Search Bar */}
        <div className="flex items-center gap-2 max-w-xl mx-auto pt-2">
          <input
            type="text"
            placeholder="Enter candidate wallet (0x...), roll number, or certificate token ID"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-400 font-mono"
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="bg-gradient-to-r from-emerald-400 to-indigo-600 hover:from-emerald-300 hover:to-indigo-500 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm transition-all cursor-pointer border-none shadow-lg whitespace-nowrap"
          >
            {loading ? "Verifying..." : "Verify Candidate"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm text-center font-medium">
          {error}
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
          {/* Candidate Profile Summary */}
          <div className="bg-[#121824]/90 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 block mb-1">
                Verified Candidate Profile
              </span>
              <h2 className="text-xl font-bold text-white m-0">
                {result.user?.name || "Student Wallet Holder"}
              </h2>
              <p className="text-xs font-mono text-gray-400 m-0 mt-1">
                Wallet: {result.walletAddress || result.certificate?.walletAddress}
              </p>
              {result.user?.rollNumber && (
                <p className="text-xs text-indigo-300 m-0 mt-0.5 font-semibold">
                  Roll No: {result.rollNumber || result.user.rollNumber} • {result.user.branch || "CS"}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                Cryptographically Verified
              </span>
            </div>
          </div>

          {/* Certificates List */}
          {(result.certificates || (result.certificate ? [result.certificate] : [])).length > 0 && (
            <div className="bg-[#121824]/90 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white m-0 border-b border-white/10 pb-3">
                Verified Soulbound Degree NFT Credentials
              </h3>

              <div className="space-y-3">
                {(result.certificates || [result.certificate]).map((cert) => (
                  <div key={cert._id || cert.tokenId} className="bg-black/30 border border-white/10 rounded-xl p-5 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-bold text-white m-0">{cert.degreeName}</h4>
                        <p className="text-xs text-emerald-400 font-semibold m-0 mt-0.5">{cert.universityName}</p>
                        <span className="text-xs font-mono text-gray-400 block mt-1">Token ID: #{cert.tokenId} • Issue Date: {new Date(cert.issueDate).toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-bold">
                        <span>✓ ON-CHAIN VALID</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10 text-xs">
                      <a
                        href={certificatePdfUrl(cert.walletAddress, cert.tokenId)}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-3.5 py-2 rounded-lg font-bold no-underline transition-all border border-emerald-500/30"
                      >
                        📄 Download Verified PDF Certificate
                      </a>
                      <a
                        href={cert.metadataUri}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2 rounded-lg font-semibold no-underline transition-all"
                      >
                        🌐 View IPFS Metadata JSON
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skill Badges */}
          {result.skills && result.skills.length > 0 && (
            <div className="bg-[#121824]/90 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white m-0 border-b border-white/10 pb-3">
                Verifiable Skill Proof NFTs
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.skills.map((skill) => (
                  <div key={skill._id} className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-white m-0">{skill.title}</h4>
                      <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                        NFT #{skill.tokenId}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 m-0">{skill.description}</p>
                    <a href={skill.metadataUri} target="_blank" rel="noreferrer" className="text-xs text-purple-300 hover:text-white underline font-semibold block pt-1">
                      Inspect IPFS Skill Proof →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
