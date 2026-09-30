import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { RequireAuth, RequireRole } from "./components/RequireAuth";
import AddSkillPage from "./pages/AddSkillPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminIssueCertificatePage from "./pages/AdminIssueCertificatePage";
import AttendancePage from "./pages/AttendancePage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import PublicProfilePage from "./pages/PublicProfilePage";
import RecruiterViewPage from "./pages/RecruiterViewPage";
import VerificationPage from "./pages/VerificationPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />

        <Route
          path="/attendance"
          element={
            <RequireAuth>
              <AttendancePage />
            </RequireAuth>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireRole roles={["admin", "teacher"]}>
              <AdminDashboardPage />
            </RequireRole>
          }
        />

        <Route
          path="/admin/certificates"
          element={
            <RequireRole roles={["admin"]}>
              <AdminIssueCertificatePage />
            </RequireRole>
          }
        />

        <Route
          path="/skills/add"
          element={
            <RequireRole roles={["admin", "teacher"]}>
              <AddSkillPage />
            </RequireRole>
          }
        />

        <Route path="/profile/:wallet" element={<PublicProfilePage />} />
        <Route path="/verify" element={<VerificationPage />} />
        <Route path="/verify/:query" element={<VerificationPage />} />
        <Route path="/recruiter/search" element={<RecruiterViewPage />} />
        <Route path="/recruiter/:wallet" element={<RecruiterViewPage />} />
      </Routes>
    </Layout>
  );
}
