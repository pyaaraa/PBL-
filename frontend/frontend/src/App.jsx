import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import AttendancePage from "./pages/AttendancePage";
import AdminPage from "./pages/AdminPage";
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
            <Link to="/" className="nav-link">Mark Attendance</Link>
            <Link to="/admin" className="nav-link">Admin</Link>
          </nav>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<AttendancePage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>

        <footer className="footer">
          Secure attendance powered by MetaMask. No private keys stored.
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
