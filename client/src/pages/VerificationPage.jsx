import { useCallback, useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { apiFetch, certificatePdfUrl } from "../api";

export default function VerificationPage() {
  const { query } = useParams();
  const [params] = useSearchParams();
  const initialInput = query || params.get("wallet") || params.get("tokenId") || "";

  const [inputVal, setInputVal] = useState(initialInput);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const verificationUrl = useMemo(
    () => `${window.location.origin}/verify/${inputVal || ""}`,
    [inputVal]
  );
  const isVerified = result?.type === "certificate"
    ? Boolean(result.certificate?.verification?.ownsCertificate && result.certificate?.verification?.isValid)
    : Boolean(result?.verified);

  const handleVerify = useCallback(async (searchTarget) => {
    const q = (searchTarget || inputVal).trim();
    if (!q) {
      setError("Please enter a wallet address, student roll number, or certificate token ID.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await apiFetch(`/verify/${q}`);
      setResult(response);
    } catch (err) {
      setError(err.message || "Credential verification failed");
    } finally {
      setLoading(false);
    }
  }, [inputVal]);

  useEffect(() => {
    if (initialInput) {
      handleVerify(initialInput);
    }
  }, [initialInput, handleVerify]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Verification Hero Banner */}
      <div className="bg-[#121824]/90 border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-xl text-center space-y-4">
        <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase block">
          Public On-Chain Verification Engine
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white m-0">
          Decentralized Credential Authenticator
        </h1>
        <p className="text-sm text-gray-300 max-w-xl mx-auto">
          Enter a credential ID, wallet, or roll number to check issuer, recipient, IPFS evidence, and the immutable on-chain status.
        </p>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify();
          }}
          className="flex items-center gap-2 max-w-xl mx-auto pt-2"
        >
          <input
            type="text"
            placeholder="Credential ID, wallet (0x...), or roll number"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="flex-1 bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-400 font-mono"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-emerald-400 to-indigo-600 hover:from-emerald-300 hover:to-indigo-500 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm transition-all cursor-pointer border-none shadow-lg whitespace-nowrap"
          >
            {loading ? "Verifying..." : "Verify Credential"}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm text-center font-medium">
          {error}
        </div>
      )}

      {/* Verification Result Card */}
      {result && (
        <div className="bg-[#121824]/90 border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-6 animate-in slide-in-from-bottom duration-300">
          {/* Status Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">
                Verification Result
              </span>
              <h2 className="text-xl font-bold text-white m-0">
                {result.type === "certificate" ? result.certificate?.degreeName : "Academic Identity Portfolio"}
              </h2>
              <p className="text-xs font-mono text-emerald-400 m-0 mt-1">
                Subject Wallet: {result.walletAddress || result.certificate?.walletAddress}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className={`${isVerified ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-red-500/15 text-red-300 border-red-500/30"} border px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 shadow-lg`}>
                <span className={`w-2.5 h-2.5 rounded-full ${isVerified ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                <span>{isVerified ? "AUTHENTIC & VALID" : "NOT VERIFIED"}</span>
              </div>
            </div>
          </div>

          {/* Single Certificate Result */}
          {result.type === "certificate" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                  <span className="text-xs text-gray-400 block">Credential ID</span>
                  <span className="text-sm font-mono text-white block mt-1">{result.certificate.certificateId || `TOKEN-${result.certificate.tokenId}`}</span>
                </div>

                <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                  <span className="text-xs text-gray-400 block">Degree Program</span>
                  <span className="text-sm font-bold text-white block mt-1">{result.certificate.degreeName}</span>
                </div>

                <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                  <span className="text-xs text-gray-400 block">Issuing University</span>
                  <span className="text-sm font-bold text-emerald-400 block mt-1">{result.certificate.universityName}</span>
                </div>

                <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                  <span className="text-xs text-gray-400 block">Soulbound Token ID</span>
                  <span className="text-sm font-mono text-white block mt-1">Token #{result.certificate.tokenId}</span>
                </div>

                <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                  <span className="text-xs text-gray-400 block">Stream & Passing Year</span>
                  <span className="text-sm text-white block mt-1">{result.certificate.stream || "Not specified"} · {result.certificate.passingYear || new Date(result.certificate.issueDate).getFullYear()}</span>
                </div>

                <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                  <span className="text-xs text-gray-400 block">Blockchain Transaction</span>
                  <span className="text-xs font-mono text-indigo-300 block mt-1 truncate">{result.certificate.txHash}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href={certificatePdfUrl(result.certificate.walletAddress, result.certificate.tokenId)}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-4 py-2.5 rounded-xl font-bold text-xs no-underline transition-all border border-emerald-500/30"
                >
                  📄 Download Verified Certificate PDF
                </a>
                <a
                  href={result.certificate.metadataUri}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-semibold text-xs no-underline transition-all"
                >
                  🌐 View IPFS Metadata JSON
                </a>
                {result.certificate.pdfUri && <a href={result.certificate.pdfUri} target="_blank" rel="noreferrer" className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-semibold text-xs no-underline transition-all">↗ Open IPFS document</a>}
              </div>
            </div>
          )}

          {/* Full Wallet Profile Result */}
          {result.type !== "certificate" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Verified Academic Credentials ({result.certificates?.length || 0})
                </h3>

                <div className="space-y-3">
                  {result.certificates?.map((cert) => (
                    <div key={cert._id} className="bg-black/30 border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-white m-0">{cert.degreeName}</h4>
                        <p className="text-xs text-emerald-400 font-semibold m-0 mt-0.5">{cert.universityName}</p>
                        <span className="text-[11px] font-mono text-gray-400">Token ID: #{cert.tokenId}</span>
                      </div>
                      <a
                        href={certificatePdfUrl(cert.walletAddress, cert.tokenId)}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-lg font-bold text-xs no-underline border border-emerald-500/30"
                      >
                        📄 Download PDF
                      </a>
                    </div>
                  ))}

                  {(!result.certificates || result.certificates.length === 0) && (
                    <p className="text-xs text-gray-400">No degree certificates recorded for this wallet.</p>
                  )}
                </div>

                <h3 className="text-sm font-bold text-white uppercase tracking-wider pt-2">
                  Verifiable Skill Proof Badges ({result.skills?.length || 0})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.skills?.map((skill) => (
                    <div key={skill._id} className="bg-black/30 border border-white/10 rounded-xl p-3.5 space-y-1">
                      <h4 className="text-xs font-bold text-white m-0">{skill.title}</h4>
                      <p className="text-[11px] text-gray-300 m-0">{skill.description}</p>
                      <a href={skill.metadataUri} target="_blank" rel="noreferrer" className="text-[11px] text-purple-300 hover:text-white underline font-semibold block pt-1">
                        IPFS Badge Proof →
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* QR Code Side Panel */}
              <div className="bg-black/30 border border-white/10 rounded-xl p-6 text-center space-y-3 flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Shareable QR Verification</span>
                <div className="bg-white p-3 rounded-xl inline-block shadow-lg">
                  <QRCodeSVG value={verificationUrl} size={150} level="H" includeMargin={true} />
                </div>
                <p className="text-[11px] text-gray-400">Scan to verify credentials directly on mobile devices.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
