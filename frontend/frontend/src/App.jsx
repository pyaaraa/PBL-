import { BrowserRouter, Routes, Route, Link, NavLink } from "react-router-dom";
import AttendancePage from "./pages/AttendancePage";
import AdminPage from "./pages/AdminPage";
import StudentDashboard from "./pages/StudentDashboard";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="page">
        <div className="orb orb-one" />
        <div className="orb orb-two" />
        <header className="topbar">
          <Link to="/" className="brand link">
            <div className="brand-mark">DA</div>
            <div>
              <p className="brand-title">Attendance</p>
              <p className="brand-subtitle">Web3 identity verification</p>
            </div>
          </Link>
          <nav className="nav">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>Mark Attendance</NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>Dashboard</NavLink>
            <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>Admin</NavLink>
          </nav>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<AttendancePage />} />
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>

        <footer className="footer">
          Secure attendance powered by MetaMask with live sessions, proof hashes, and student analytics.
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
