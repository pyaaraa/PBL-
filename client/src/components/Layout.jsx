import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export default function Layout({ children }) {
  const { user, logout, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";
  const isStudent = user?.role === "student" || !user?.role;
  const isRecruiter = user?.role === "recruiter";

  return (
    <div className="app-shell min-h-screen bg-[#0b0d10] text-[#f2f4f8] font-sans relative overflow-x-hidden">
      <div className="background-orb orb-a absolute w-[450px] h-[450px] bg-emerald-500/20 rounded-full blur-3xl -top-24 -left-24 pointer-events-none" />
      <div className="background-orb orb-b absolute w-[550px] h-[550px] bg-indigo-500/20 rounded-full blur-3xl -bottom-32 -right-32 pointer-events-none" />

      <header className="topbar sticky top-0 z-50 backdrop-blur-xl bg-[#0f141e]/80 border-b border-white/10 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <Link to="/" className="flex items-center gap-3 no-underline group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg group-hover:scale-105 transition-transform">
            D
          </div>
          <div>
            <span className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase block">DAuth Platform</span>
            <h1 className="text-lg font-bold text-white m-0 tracking-tight leading-none">Academic Verification</h1>
          </div>
        </Link>

        <nav className="nav-links flex items-center gap-2 flex-wrap text-sm font-medium">
          {isAuthenticated && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-lg transition-all ${
                  isActive ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "text-gray-300 hover:text-white hover:bg-white/5"
                }`
              }
            >
              Dashboard
            </NavLink>
          )}

          {isAuthenticated && (
            <NavLink
              to="/attendance"
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-lg transition-all ${
                  isActive ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "text-gray-300 hover:text-white hover:bg-white/5"
                }`
              }
            >
              Attendance
            </NavLink>
          )}

          {isAuthenticated && isAdmin && (
            <NavLink
              to="/admin/certificates"
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-lg transition-all ${
                  isActive ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "text-gray-300 hover:text-white hover:bg-white/5"
                }`
              }
            >
              Admin Portal
            </NavLink>
          )}

          <NavLink
            to="/verify"
            className={({ isActive }) =>
              `px-3.5 py-2 rounded-lg transition-all ${
                isActive ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "text-gray-300 hover:text-white hover:bg-white/5"
              }`
            }
          >
            Public Verify
          </NavLink>

          <NavLink
            to="/recruiter/search"
            className={({ isActive }) =>
              `px-3.5 py-2 rounded-lg transition-all ${
                isActive ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "text-gray-300 hover:text-white hover:bg-white/5"
              }`
            }
          >
            Recruiter Portal
          </NavLink>
        </nav>

        <div className="user-pill flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3.5 py-1.5 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-gray-200">
                {user?.walletAddress?.slice(0, 6)}...{user?.walletAddress?.slice(-4)}
              </span>
              <span className="uppercase text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                {user?.role || "student"}
              </span>
              <button
                type="button"
                onClick={logout}
                className="ml-1 text-gray-400 hover:text-red-400 transition-colors text-xs font-semibold cursor-pointer bg-transparent border-none"
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">{children}</main>
    </div>
  );
}
