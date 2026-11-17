import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./state/AuthContext";
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

function RoleDashboard() {
  const { user } = useAuth();
  if (user?.role === "admin") return <Navigate to="/admin" replace />;
  if (user?.role === "teacher") return <Navigate to="/teacher" replace />;
  if (user?.role === "recruiter") return <Navigate to="/recruiter/search" replace />;
  return <DashboardPage />;
}

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
              <RoleDashboard />
            </RequireAuth>
          }
        />

        <Route
          path="/attendance"
          element={
            <RequireRole roles={["student"]}>
              <AttendancePage />
            </RequireRole>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireRole roles={["admin"]}>
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
          path="/teacher"
          element={
            <RequireRole roles={["teacher"]}>
              <AdminDashboardPage />
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
