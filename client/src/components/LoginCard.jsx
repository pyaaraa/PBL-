import { useState } from "react";
import { useAuth } from "../state/AuthContext";

export default function LoginCard({
  initialRole = "student",
  title = "MetaMask Web3 Sign-In",
  description = "Select your identity role and authenticate securely using your crypto wallet.",
  onSuccess,
}) {
  const [role, setRole] = useState(initialRole);
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [branch, setBranch] = useState("Computer Science & Engineering");
  const [semester, setSemester] = useState("6th Semester");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login, user } = useAuth();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const session = await login(role, { name, rollNumber, branch, semester });
      await onSuccess?.(session);
    } catch (err) {
      setError(err.message || "Wallet login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="wallet-login" className="bg-[#121824]/90 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-xl max-w-md w-full mx-auto scroll-mt-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-400 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
          🦊
        </div>
        <div>
          <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase block">Wallet Authentication</span>
          <h2 className="text-xl font-bold text-white m-0">{title}</h2>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-6 leading-relaxed">{description}</p>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Select Platform Role</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "student", label: "Student", icon: "🎓" },
              { id: "admin", label: "Admin", icon: "🏛️" },
              { id: "recruiter", label: "Recruiter", icon: "💼" },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  role === r.id
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10"
                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <span className="text-base">{r.icon}</span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-400 to-indigo-600 hover:from-emerald-300 hover:to-indigo-500 text-slate-950 font-bold py-3.5 rounded-xl text-base transition-all shadow-lg hover:shadow-emerald-500/25 cursor-pointer border-none flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>Signing Challenge...</span>
            </>
          ) : (
            <>
              <span>Connect Wallet</span>
              <span>→</span>
            </>
          )}
        </button>

        {role === "student" && (
          <div className="space-y-3 pt-2 border-t border-white/10 animate-in fade-in duration-200">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-1">Student Full Name</label>
              <input
                type="text"
                placeholder="e.g. Alex Rivera"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Roll / Reg Number</label>
                <input
                  type="text"
                  placeholder="e.g. 2024-CS-042"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Branch</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="Computer Science & Engineering">CSE</option>
                  <option value="Information Technology">IT</option>
                  <option value="Electronics & Comm.">ECE</option>
                  <option value="Data Science & AI">AI/ML</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs text-center font-medium">
          {error}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-white/10 text-center">
        <p className="text-[11px] text-gray-400">
          🔒 DAuth uses cryptographic message signing. No password or private keys are ever transmitted or stored.
        </p>
      </div>
    </div>
  );
}
