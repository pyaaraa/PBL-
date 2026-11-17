import { useCallback, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiFetch, certificatePdfUrl } from "../api";
import { useFetch } from "../hooks/useFetch";
import { useAuth } from "../state/AuthContext";
import QRCodeModal from "../components/QRCodeModal";
import { usePublicAppOrigin, verificationUrl } from "../hooks/usePublicAppOrigin";

export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === "admin") return <Navigate to="/admin" replace />;
  if (user?.role === "teacher") return <Navigate to="/teacher" replace />;
  if (user?.role === "recruiter") return <Navigate to="/recruiter/search" replace />;

  return <StudentDashboard user={user} />;
}

function StudentDashboard({ user }) {
  const walletAddress = user?.walletAddress;
  const publicAppOrigin = usePublicAppOrigin();
  const [qrModal, setQrModal] = useState({ isOpen: false, title: "", url: "" });

  const fetchProfile = useCallback(
    () => (walletAddress ? apiFetch(`/profile/${walletAddress}`) : Promise.resolve(null)),
    [walletAddress]
  );
  const { data, loading, error, run: refetch } = useFetch(fetchProfile, [walletAddress]);

  const profile = data?.profile;
  const isStudent = user?.role === "student" || !user?.role;
  const isAdmin = user?.role === "admin";
  const isRecruiter = user?.role === "recruiter";

  const publicVerifyUrl = verificationUrl(publicAppOrigin, walletAddress);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <QRCodeModal
        isOpen={qrModal.isOpen}
        onClose={() => setQrModal({ ...qrModal, isOpen: false })}
        title={qrModal.title}
        url={qrModal.url}
      />

      {/* Hero Welcome Banner */}
      <div className="bg-[#121824]/90 border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase block mb-1">
            {user?.role ? `${user.role.toUpperCase()} WORKSPACE` : "ACADEMIC IDENTITY PORTAL"}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white m-0 tracking-tight">
            Welcome back, {user?.name || "Student User"} 👋
          </h1>
          <p className="text-sm text-gray-300 mt-2 max-w-xl">
            Your academic credentials, Soulbound certificates, skill badges, and attendance records are stored immutably using your crypto wallet identity.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
            <span className="bg-white/10 text-gray-200 px-3 py-1.5 rounded-xl border border-white/10 font-mono">
              📍 {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
            </span>
            {user?.rollNumber && (
              <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-500/30 font-semibold">
                ID: {user.rollNumber}
              </span>
            )}
            {user?.branch && (
              <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-xl border border-indigo-500/30 font-semibold">
                {user.branch}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => setQrModal({ isOpen: true, title: `${user?.name || "Student"} Verification QR`, url: publicVerifyUrl })}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-400 to-indigo-600 text-slate-950 font-bold px-5 py-3 rounded-xl text-sm transition-all hover:opacity-90 cursor-pointer border-none shadow-lg flex items-center justify-center gap-2"
          >
            <span>📱 Share QR Code</span>
          </button>
          <Link
            to={`/verify/${walletAddress || ""}`}
            className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white font-bold px-5 py-3 rounded-xl text-sm transition-all text-center no-underline border border-white/15"
          >
            Public Verification
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="bg-[#121824]/90 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Attendance Score</span>
            <span className="text-xl">📅</span>
          </div>
          <div className="text-3xl font-extrabold text-white mb-2">
            {profile?.attendancePercentage ?? 0}%
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${profile?.attendancePercentage ?? 0}%` }}
            />
          </div>
          <p className="text-[11px] text-emerald-400 mt-2 font-medium">✓ Cryptographically verified signatures</p>
        </div>

        <div className="bg-[#121824]/90 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Soulbound NFT Degrees</span>
            <span className="text-xl">📜</span>
          </div>
          <div className="text-3xl font-extrabold text-white mb-2">
            {profile?.certificates?.length || 0}
          </div>
          <p className="text-[11px] text-indigo-400 font-medium">
            {profile?.certificates?.length ? "100% On-Chain Soulbound (Non-transferable)" : "No certificates issued yet"}
          </p>
        </div>

        <div className="bg-[#121824]/90 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Academic Performance</span><span className="text-xl">📈</span></div>
          <div className="text-3xl font-extrabold text-white mb-2">{profile?.grades?.length || 0}</div>
          <p className="text-[11px] text-cyan-300 font-medium">Published course grade records</p>
        </div>

        <div className="bg-[#121824]/90 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Verifiable Skill Badges</span>
            <span className="text-xl">⚡</span>
          </div>
          <div className="text-3xl font-extrabold text-white mb-2">
            {profile?.skills?.length || 0}
          </div>
          <p className="text-[11px] text-purple-400 font-medium">
            {profile?.skills?.length ? "Issued by accredited faculty & university" : "No skill proofs issued yet"}
          </p>
        </div>
      </div>

      <div className="bg-[#121824]/90 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3"><div><h2 className="text-lg font-bold text-white m-0">Academic performance</h2><p className="text-xs text-gray-400 m-0">Course results published by your institution.</p></div><span className="text-xs font-bold bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full border border-cyan-500/30">GRADE RECORDS</span></div>
        {profile?.grades?.length ? <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{profile.grades.map((grade) => <div key={grade._id} className="bg-black/30 border border-white/10 rounded-xl p-4"><div className="flex justify-between gap-3"><div><p className="text-xs font-mono text-cyan-300">{grade.courseCode}</p><h3 className="text-sm font-bold text-white mt-1">{grade.courseName}</h3></div><span className="text-xl font-black text-emerald-300">{grade.grade}</span></div><p className="text-xs text-gray-400 mt-3">{grade.semester || "Academic record"} · {grade.score}/100</p></div>)}</div> : <p className="text-xs text-gray-400">No grades published yet.</p>}
      </div>

      {/* Main Credentials Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Certificates Card */}
        <div className="bg-[#121824]/90 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-lg font-bold text-white m-0">Soulbound Certificates</h2>
              <p className="text-xs text-gray-400 m-0">Tamper-proof academic degrees stored on IPFS & Blockchain</p>
            </div>
            <span className="text-xs font-bold bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
              ERC-721
            </span>
          </div>

          {loading && <p className="text-xs text-gray-400">Loading certificates...</p>}

          <div className="space-y-3">
            {profile?.certificates?.map((cert) => (
              <div key={cert._id} className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white m-0">{cert.degreeName}</h3>
                    <p className="text-xs text-emerald-400 font-semibold m-0 mt-0.5">{cert.universityName}</p>
                    <span className="text-[11px] font-mono text-gray-400 block mt-1">Token ID: #{cert.tokenId}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${cert.verification?.ownsCertificate && cert.verification?.isValid ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border-amber-500/30"}`}>
                    {cert.verification?.ownsCertificate && cert.verification?.isValid ? "ON-CHAIN VALID" : "CHAIN CHECK REQUIRED"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10 text-xs">
                  <a
                    href={certificatePdfUrl(cert.walletAddress, cert.tokenId)}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-lg font-bold text-xs no-underline transition-all border border-emerald-500/30"
                  >
                    📄 Download PDF
                  </a>
                  <a
                    href={cert.metadataUri}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-semibold text-xs no-underline transition-all"
                  >
                    🌐 View IPFS JSON
                  </a>
                </div>
              </div>
            ))}

            {(!profile?.certificates || profile.certificates.length === 0) && (
              <div className="text-center py-8 text-gray-400 text-xs bg-black/20 rounded-xl border border-dashed border-white/10">
                <p className="m-0">No certificates issued to this wallet yet.</p>
                <p className="text-[11px] text-gray-400 mt-1">University admins can mint certificates from the Admin Portal.</p>
              </div>
            )}
          </div>
        </div>

        {/* Skill Badges Card */}
        <div className="bg-[#121824]/90 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h2 className="text-lg font-bold text-white m-0">Verifiable Skill Badges</h2>
              <p className="text-xs text-gray-400 m-0">Proof of competence & projects signed by accredited faculty</p>
            </div>
            <span className="text-xs font-bold bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30">
              NFT Badges
            </span>
          </div>

          {loading && <p className="text-xs text-gray-400">Loading skill proofs...</p>}

          <div className="space-y-3">
            {profile?.skills?.map((skill) => (
              <div key={skill._id} className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white m-0">{skill.title}</h3>
                    <p className="text-xs text-gray-300 m-0 mt-1 leading-relaxed">{skill.description}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${skill.verification?.ownsSkill && skill.verification?.isValid ? "bg-purple-500/20 text-purple-300 border-purple-500/30" : "bg-amber-500/20 text-amber-300 border-amber-500/30"}`}>
                    {skill.verification?.ownsSkill && skill.verification?.isValid ? `NFT #${skill.tokenId}` : "CHAIN CHECK REQUIRED"}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 text-xs">
                  <a
                    href={skill.metadataUri}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-300 hover:text-white underline font-medium text-xs"
                  >
                    View IPFS Badge Proof →
                  </a>
                </div>
              </div>
            ))}

            {(!profile?.skills || profile.skills.length === 0) && (
              <div className="text-center py-8 text-gray-400 text-xs bg-black/20 rounded-xl border border-dashed border-white/10">
                <p className="m-0">No skill badges earned yet.</p>
                <p className="text-[11px] text-gray-400 mt-1">Teachers and admins issue skill proof NFTs for completed courses.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
