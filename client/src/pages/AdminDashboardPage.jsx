import { useState, useCallback } from "react";
import { apiFetch } from "../api";
import { useFetch } from "../hooks/useFetch";
import { useAuth } from "../state/AuthContext";
import QRCodeModal from "../components/QRCodeModal";
import { SUBJECTS, subjectForTitle } from "../subjects";
import { usePublicAppOrigin, verificationUrl } from "../hooks/usePublicAppOrigin";

export default function AdminDashboardPage() {
  const { authHeaders, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const publicAppOrigin = usePublicAppOrigin();
  const [activeTab, setActiveTab] = useState("roster");

  // Roster state
  const [studentWallet, setStudentWallet] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentRoll, setStudentRoll] = useState("");
  const [studentBranch, setStudentBranch] = useState("Computer Science & Engineering");
  const [studentSemester, setStudentSemester] = useState("6th Semester");
  const [rosterMsg, setRosterMsg] = useState("");

  // Certificate state
  const [certWallet, setCertWallet] = useState("");
  const [certificateId, setCertificateId] = useState("");
  const [degreeName, setDegreeName] = useState("Bachelor of Technology in Computer Science");
  const [stream, setStream] = useState("Computer Science");
  const [passingYear, setPassingYear] = useState(String(new Date().getFullYear()));
  const [universityName, setUniversityName] = useState("DAuth University");
  const [certFile, setCertFile] = useState(null);
  const [issuingCert, setIssuingCert] = useState(false);
  const [certResult, setCertResult] = useState(null);
  const [operationError, setOperationError] = useState("");

  // Skill state
  const [skillWallet, setSkillWallet] = useState("");
  const [skillTitle, setSkillTitle] = useState("Blockchain Smart Contracts");
  const [skillDesc, setSkillDesc] = useState("Advanced proficiency in Solidity, Hardhat, and OpenZeppelin");
  const [issuingSkill, setIssuingSkill] = useState(false);
  const [skillResult, setSkillResult] = useState(null);

  // Session state
  const [sessionTitle, setSessionTitle] = useState(SUBJECTS[0].title);
  const [courseCode, setCourseCode] = useState(SUBJECTS[0].code);
  const [sessionDesc, setSessionDesc] = useState("Live attendance session");
  const [creatingSession, setCreatingSession] = useState(false);
  const [sessionResult, setSessionResult] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState("");

  // QR Modal state
  const [qrModal, setQrModal] = useState({ isOpen: false, title: "", url: "" });

  const fetchStats = useCallback(() => apiFetch("/admin/stats", { headers: authHeaders }), [authHeaders]);
  const { data: statsData, run: refetchStats } = useFetch(fetchStats, []);

  const fetchStudents = useCallback(() => apiFetch("/admin/students", { headers: authHeaders }), [authHeaders]);
  const { data: studentsData, run: refetchStudents } = useFetch(fetchStudents, []);
  const fetchCredentials = useCallback(() => apiFetch("/admin/credentials", { headers: authHeaders }), [authHeaders]);
  const { data: credentialsData, run: refetchCredentials } = useFetch(fetchCredentials, []);
  const fetchSessions = useCallback(() => apiFetch("/sessions/all", { headers: authHeaders }), [authHeaders]);
  const { data: sessionsData, loading: sessionsLoading, run: refetchSessions } = useFetch(fetchSessions, []);
  const fetchSessionAttendance = useCallback(
    () => (selectedSessionId
      ? apiFetch(`/sessions/${selectedSessionId}/attendance`, { headers: authHeaders })
      : Promise.resolve({ attendees: [] })),
    [authHeaders, selectedSessionId]
  );
  const {
    data: sessionAttendanceData,
    loading: attendanceLoading,
    run: refetchSessionAttendance,
  } = useFetch(fetchSessionAttendance, [selectedSessionId]);

  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    setRosterMsg("");
    try {
      await apiFetch("/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          walletAddress: studentWallet,
          name: studentName,
          rollNumber: studentRoll,
          branch: studentBranch,
          semester: studentSemester,
        }),
      });
      setRosterMsg("✓ Student registered & wallet approved successfully!");
      setStudentWallet("");
      setStudentName("");
      setStudentRoll("");
      refetchStudents();
      refetchStats();
    } catch (err) {
      setRosterMsg(`❌ ${err.message}`);
    }
  };

  const handleIssueCertificate = async (e) => {
    e.preventDefault();
    setIssuingCert(true);
    setCertResult(null);
    setOperationError("");
    try {
      const formData = new FormData();
      formData.append("walletAddress", certWallet);
      formData.append("certificateId", certificateId);
      formData.append("degreeName", degreeName);
      formData.append("stream", stream);
      formData.append("passingYear", passingYear);
      formData.append("universityName", universityName);
      if (certFile) formData.append("pdfFile", certFile);

      const res = await apiFetch("/issue-certificate", {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });
      setCertResult(res);
      setCertWallet("");
      setCertificateId("");
      refetchStats();
      refetchCredentials();
    } catch (err) {
      setOperationError(err.message || "Certificate issuance failed");
    } finally {
      setIssuingCert(false);
    }
  };

  const handleIssueSkill = async (e) => {
    e.preventDefault();
    setIssuingSkill(true);
    setSkillResult(null);
    try {
      const res = await apiFetch("/add-skill", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          walletAddress: skillWallet,
          title: skillTitle,
          description: skillDesc,
        }),
      });
      setSkillResult(res);
      setSkillWallet("");
      refetchStats();
    } catch (err) {
      alert(`Skill Issuance Failed: ${err.message}`);
    } finally {
      setIssuingSkill(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setCreatingSession(true);
    setSessionResult(null);
    try {
      const res = await apiFetch("/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          title: sessionTitle,
          courseCode,
          description: sessionDesc,
          startTime: new Date(),
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        }),
      });
      setSessionResult(res);
      setSelectedSessionId(res.session.id);
      refetchStats();
      refetchSessions();
    } catch (err) {
      alert(`Session Creation Failed: ${err.message}`);
    } finally {
      setCreatingSession(false);
    }
  };

  const stats = statsData?.stats || { totalStudents: 0, totalCertificates: 0, totalSkills: 0, totalAttendance: 0 };
  const contracts = statsData?.contracts || {};
  const students = studentsData?.students || [];
  const credentials = credentialsData?.credentials || [];
  const sessions = sessionsData?.sessions || [];
  const attendees = sessionAttendanceData?.attendees || [];

  const handleRevoke = async (certificate) => {
    const reason = window.prompt(`Revoke ${certificate.certificateId}? Enter a reason:`);
    if (reason === null) return;
    setOperationError("");
    try {
      await apiFetch(`/certificates/${certificate.certificateId}/revoke`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders }, body: JSON.stringify({ reason }),
      });
      refetchCredentials();
      refetchStats();
    } catch (err) { setOperationError(err.message || "Credential revocation failed"); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <QRCodeModal
        isOpen={qrModal.isOpen}
        onClose={() => setQrModal({ ...qrModal, isOpen: false })}
        title={qrModal.title}
        url={qrModal.url}
      />

      {/* Hero Admin Header */}
      <div className="bg-[#121824]/90 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase block mb-1">
            {isAdmin ? "Institutional Admin Portal" : "Teacher Portal"}
          </span>
          <h1 className="text-2xl font-bold text-white m-0">{isAdmin ? "University Credential Management" : "Student & Attendance Management"}</h1>
          <p className="text-sm text-gray-400 mt-1 max-w-xl">
            {isAdmin
              ? "Register students, mint Soulbound NFT certificates, issue verified skill badges, create attendance sessions, and inspect live blockchain proofs."
              : "Register students, issue verified skill badges, create attendance sessions, and review their credential history."}
          </p>
        </div>
      </div>

      {/* Analytics Counter Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Enrolled Students", val: stats.totalStudents, icon: "👨‍🎓", color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400" },
          { label: "NFT Certificates", val: stats.totalCertificates, icon: "📜", color: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30 text-indigo-400" },
          { label: "Skill Badges", val: stats.totalSkills, icon: "🛡️", color: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400" },
          { label: "Attendance Logs", val: stats.totalAttendance, icon: "📅", color: "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400" },
        ].map((s, i) => (
          <div key={i} className={`bg-gradient-to-br ${s.color} border rounded-2xl p-5 shadow-lg relative overflow-hidden`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <span className="text-xs font-semibold text-gray-300 block">{s.label}</span>
            <span className="text-3xl font-extrabold text-white mt-1 block">{s.val}</span>
          </div>
        ))}
      </div>

      {/* Admin Operations Tabs */}
      <div className="bg-[#121824]/90 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-6 overflow-x-auto">
          {[
            { id: "roster", label: "Student Roster & Register", icon: "📋" },
            ...(isAdmin ? [{ id: "certificate", label: "Issue NFT Certificate", icon: "🎓" }] : []),
            { id: "skill", label: "Issue Skill Badge", icon: "⚡" },
            { id: "attendance", label: "Attendance Session", icon: "⏱️" },
            { id: "history", label: "Credential History", icon: "🧾" },
            ...(isAdmin ? [{ id: "blockchain", label: "Blockchain Contracts", icon: "⛓️" }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 border cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: STUDENT ROSTER */}
        {activeTab === "roster" && (
          <div className="space-y-6">
            <form onSubmit={handleRegisterStudent} className="bg-black/30 border border-white/10 rounded-xl p-5 space-y-4">
              <h3 className="text-base font-bold text-white m-0">Register New Student Wallet</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-300 font-semibold mb-1">Student Wallet Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="0x..."
                    value={studentWallet}
                    onChange={(e) => setStudentWallet(e.target.value)}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-300 font-semibold mb-1">Student Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Jordan Miller"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-300 font-semibold mb-1">Roll / Reg Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 2024-CS-099"
                    value={studentRoll}
                    onChange={(e) => setStudentRoll(e.target.value)}
                    className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-300 font-semibold mb-1">Branch & Semester</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={studentBranch}
                      onChange={(e) => setStudentBranch(e.target.value)}
                      className="bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="Computer Science & Engineering">CSE</option>
                      <option value="Information Technology">IT</option>
                      <option value="Electronics & Comm.">ECE</option>
                      <option value="Data Science & AI">AI/ML</option>
                    </select>
                    <select
                      value={studentSemester}
                      onChange={(e) => setStudentSemester(e.target.value)}
                      className="bg-black/50 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="4th Semester">4th Sem</option>
                      <option value="6th Semester">6th Sem</option>
                      <option value="8th Semester">8th Sem</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="bg-gradient-to-r from-emerald-400 to-indigo-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-all hover:opacity-90 cursor-pointer border-none shadow-md"
              >
                Register & Approve Student Wallet
              </button>

              {rosterMsg && <p className="text-xs font-semibold mt-2">{rosterMsg}</p>}
            </form>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Enrolled Student Roster ({students.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {students.map((st) => (
                  <div key={st._id} className="bg-black/20 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-white m-0">{st.name || "Student Wallet"}</h4>
                      <p className="text-xs font-mono text-gray-400 m-0 mt-0.5">{st.walletAddress}</p>
                      <span className="text-[11px] text-emerald-400 font-semibold">{st.rollNumber ? `Roll: ${st.rollNumber}` : "Registered Student"} • {st.branch || "CS"}</span>
                    </div>
                    <button
                      onClick={() => setQrModal({ isOpen: true, title: `${st.name || "Student"} Verification QR`, url: verificationUrl(publicAppOrigin, st.walletAddress) })}
                      className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-none"
                    >
                      QR Code
                    </button>
                  </div>
                ))}
                {students.length === 0 && <p className="text-xs text-gray-400">No student profiles registered yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ISSUE CERTIFICATE */}
        {activeTab === "certificate" && (
          <form onSubmit={handleIssueCertificate} className="space-y-4 max-w-2xl">
            <h3 className="text-base font-bold text-white m-0">Mint Soulbound Academic NFT Certificate</h3>
            <p className="text-xs text-gray-400">Certificates are uploaded to IPFS and minted as non-transferable ERC-721 Soulbound tokens.</p>

            <div>
              <label className="block text-xs text-gray-300 font-semibold mb-1">Student Wallet Address *</label>
              <input
                type="text"
                required
                placeholder="0x..."
                value={certWallet}
                onChange={(e) => setCertWallet(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-300 font-semibold mb-1">Public Certificate ID *</label>
              <input type="text" required placeholder="e.g. DAUTH-2026-042-BTECH" value={certificateId} onChange={(e) => setCertificateId(e.target.value.toUpperCase())} className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono" />
            </div>

            <div>
              <label className="block text-xs text-gray-300 font-semibold mb-1">Degree Title</label>
              <input
                type="text"
                required
                value={degreeName}
                onChange={(e) => setDegreeName(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs text-gray-300 font-semibold mb-1">Stream</label><input value={stream} onChange={(e) => setStream(e.target.value)} className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white" /></div>
              <div><label className="block text-xs text-gray-300 font-semibold mb-1">Passing Year</label><input type="number" min="1900" max="2100" value={passingYear} onChange={(e) => setPassingYear(e.target.value)} className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white" /></div>
            </div>

            <div>
              <label className="block text-xs text-gray-300 font-semibold mb-1">Issuing Institution</label>
              <input
                type="text"
                required
                value={universityName}
                onChange={(e) => setUniversityName(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-300 font-semibold mb-1">Certificate PDF Document *</label>
              <input
                type="file"
                accept="application/pdf"
                required
                onChange={(e) => setCertFile(e.target.files[0])}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-gray-300"
              />
            </div>

            <button
              type="submit"
              disabled={issuingCert}
              className="bg-gradient-to-r from-emerald-400 to-indigo-600 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm transition-all hover:opacity-90 cursor-pointer border-none shadow-lg"
            >
              {issuingCert ? "Uploading to IPFS & Minting NFT..." : "Mint Soulbound NFT Certificate"}
            </button>

            {certResult && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 space-y-2 text-xs">
                <p className="font-bold text-sm m-0">✓ Certificate Issued Successfully!</p>
                <p className="m-0">Token ID: #{certResult.tokenId}</p>
                <p className="m-0 font-mono break-all">Tx Hash: {certResult.txHash}</p>
                <p className="m-0 break-all">IPFS Metadata: <a href={certResult.metadataUrl} target="_blank" rel="noreferrer" className="underline text-white">{certResult.metadataUrl}</a></p>
              </div>
            )}
            {operationError && <p className="text-xs text-red-300">{operationError}</p>}
          </form>
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            <div><h3 className="text-base font-bold text-white m-0">Credential lifecycle</h3><p className="text-xs text-gray-400 mt-1">On-chain issuance and revocation activity. Revocation is final and reflected by public verification.</p></div>
            <div className="overflow-x-auto border border-white/10 rounded-xl"><table className="w-full text-left text-xs"><thead className="bg-white/5 text-gray-400 uppercase"><tr><th className="p-3">Credential</th><th className="p-3">Recipient</th><th className="p-3">Status</th><th className="p-3">Transaction</th><th className="p-3"></th></tr></thead><tbody>{credentials.map((credential) => <tr key={credential._id} className="border-t border-white/10"><td className="p-3"><p className="font-mono text-emerald-300">{credential.certificateId}</p><p className="text-white">{credential.degreeName}</p></td><td className="p-3 font-mono text-gray-400">{credential.walletAddress.slice(0, 8)}...{credential.walletAddress.slice(-6)}</td><td className={`p-3 font-bold ${credential.isValid ? "text-emerald-300" : "text-red-300"}`}>{credential.isValid ? "VALID" : "REVOKED"}</td><td className="p-3 font-mono text-gray-400">{credential.txHash.slice(0, 10)}...</td><td className="p-3">{credential.isValid && <button onClick={() => handleRevoke(credential)} className="text-red-300 hover:text-red-200 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5 cursor-pointer">Revoke</button>}</td></tr>)}{credentials.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">No credentials issued yet.</td></tr>}</tbody></table></div>
            {operationError && <p className="text-xs text-red-300">{operationError}</p>}
          </div>
        )}

        {/* TAB 3: ISSUE SKILL BADGE */}
        {activeTab === "skill" && (
          <form onSubmit={handleIssueSkill} className="space-y-4 max-w-2xl">
            <h3 className="text-base font-bold text-white m-0">Issue Verifiable Skill Badge NFT</h3>
            <p className="text-xs text-gray-400">Award verifiable skill proof badges for coding, hackathons, and research projects.</p>

            <div>
              <label className="block text-xs text-gray-300 font-semibold mb-1">Student Wallet Address *</label>
              <input
                type="text"
                required
                placeholder="0x..."
                value={skillWallet}
                onChange={(e) => setSkillWallet(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-300 font-semibold mb-1">Skill Title</label>
              <input
                type="text"
                required
                value={skillTitle}
                onChange={(e) => setSkillTitle(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-300 font-semibold mb-1">Description / Proof Summary</label>
              <textarea
                rows={3}
                value={skillDesc}
                onChange={(e) => setSkillDesc(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
              />
            </div>

            <button
              type="submit"
              disabled={issuingSkill}
              className="bg-gradient-to-r from-emerald-400 to-indigo-600 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm transition-all hover:opacity-90 cursor-pointer border-none shadow-lg"
            >
              {issuingSkill ? "Minting Skill Badge..." : "Issue Skill Proof NFT"}
            </button>

            {skillResult && (
              <div className="mt-4 p-4 rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-300 space-y-2 text-xs">
                <p className="font-bold text-sm m-0">✓ Skill Badge Minted!</p>
                <p className="m-0">Token ID: #{skillResult.tokenId}</p>
                <p className="m-0 font-mono break-all">Tx Hash: {skillResult.txHash}</p>
              </div>
            )}
          </form>
        )}

        {/* TAB 4: ATTENDANCE SESSION */}
        {activeTab === "attendance" && (
          <div className="space-y-8 max-w-4xl">
          <form onSubmit={handleCreateSession} className="space-y-4 max-w-2xl">
            <h3 className="text-base font-bold text-white m-0">Create Live Attendance Session</h3>
            <p className="text-xs text-gray-400">Students mark attendance by submitting signed challenge nonces verified on-chain.</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-300 font-semibold mb-1">Subject</label>
                <select
                  value={sessionTitle}
                  onChange={(e) => {
                    const subject = subjectForTitle(e.target.value);
                    setSessionTitle(e.target.value);
                    if (subject) setCourseCode(subject.code);
                  }}
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
                >
                  {SUBJECTS.map((subject) => (
                    <option key={subject.code} value={subject.title}>{subject.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-300 font-semibold mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  value={courseCode}
                  readOnly
                  aria-label="Selected subject course code"
                  className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-300 font-semibold mb-1">Description</label>
              <input
                type="text"
                value={sessionDesc}
                onChange={(e) => setSessionDesc(e.target.value)}
                className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
              />
            </div>

            <button
              type="submit"
              disabled={creatingSession}
              className="bg-gradient-to-r from-emerald-400 to-indigo-600 text-slate-950 font-bold px-6 py-3 rounded-xl text-sm transition-all hover:opacity-90 cursor-pointer border-none shadow-lg"
            >
              {creatingSession ? "Creating..." : "Start Live Attendance Session"}
            </button>

            {sessionResult && (
              <div className="mt-4 p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs">
                <p className="font-bold text-sm m-0">✓ Session Created & Active!</p>
                <p className="m-0 mt-1">Students can now navigate to Attendance and sign the session nonce.</p>
              </div>
            )}
          </form>

          <section className="border-t border-white/10 pt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white m-0">Session attendance register</h3>
                <p className="text-xs text-gray-400 mt-1">See every student who has signed attendance for a session you created.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  refetchSessions();
                  if (selectedSessionId) refetchSessionAttendance();
                }}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-lg text-xs cursor-pointer border border-white/15"
              >
                Refresh register
              </button>
            </div>

            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full max-w-2xl bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white"
            >
              <option value="">Select a session</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.title} ({session.courseCode}) — {new Date(session.startTime).toLocaleString()}
                </option>
              ))}
            </select>

            {sessionsLoading && <p className="text-xs text-gray-400">Loading sessions…</p>}
            {selectedSessionId && attendanceLoading && <p className="text-xs text-gray-400">Loading attendance register…</p>}
            {selectedSessionId && !attendanceLoading && (
              <div className="overflow-x-auto border border-white/10 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-gray-400 uppercase">
                    <tr><th className="p-3">Student</th><th className="p-3">Roll number</th><th className="p-3">Branch</th><th className="p-3">Marked at</th><th className="p-3">Wallet</th></tr>
                  </thead>
                  <tbody>
                    {attendees.map((attendee) => (
                      <tr key={attendee.id} className="border-t border-white/10">
                        <td className="p-3 font-semibold text-white">{attendee.name}</td>
                        <td className="p-3 text-emerald-300">{attendee.rollNumber || "—"}</td>
                        <td className="p-3 text-gray-300">{attendee.branch || "—"}</td>
                        <td className="p-3 text-gray-300">{new Date(attendee.markedAt).toLocaleString()}</td>
                        <td className="p-3 font-mono text-gray-400">{attendee.walletAddress.slice(0, 8)}…{attendee.walletAddress.slice(-6)}</td>
                      </tr>
                    ))}
                    {attendees.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-400">No student has marked attendance for this session yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          </div>
        )}

        {/* TAB 5: BLOCKCHAIN CONTRACTS */}
        {activeTab === "blockchain" && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white m-0">Deployed Smart Contract Architecture</h3>
            <p className="text-xs text-gray-400">All academic credentials and attendance records are anchored to these contract addresses.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: "Soulbound Certificate NFT Contract", addr: contracts.certificateNft || "0x5FbDB2315678afecb367f032d93F642f64180aa3" },
                { name: "Verifiable Skill Proof NFT Contract", addr: contracts.skillProofNft || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512" },
                { name: "Immutable On-Chain Attendance Contract", addr: contracts.attendanceContract || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9" },
                { name: "Public On-Chain Verification Contract", addr: contracts.verificationContract || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" },
              ].map((c, i) => (
                <div key={i} className="bg-black/30 border border-white/10 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-emerald-400 m-0 uppercase tracking-wider">{c.name}</h4>
                  <p className="text-xs font-mono text-white m-0 mt-2 break-all bg-white/5 p-2 rounded-lg border border-white/10">{c.addr}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
