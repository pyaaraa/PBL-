import { Navigate, useLocation, useNavigate } from "react-router-dom";
import LoginCard from "../components/LoginCard";
import { useAuth } from "../state/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const from = location.state?.from?.pathname || "/dashboard";

  return (
    <div className="page-grid">
      <section className="glass-card hero-card">
        <div>
          <p className="eyebrow">DAuth Access</p>
          <h2>Login With Wallet</h2>
          <p className="body-copy">
            Select your platform role, connect MetaMask, and we will route you to a dashboard built
            for that workflow.
          </p>
        </div>
      </section>

      <LoginCard
        initialRole="student"
        title="Choose Role And Connect"
        description="Students manage attendance and credentials. Teachers manage sessions and skill proofs. Admins issue certificates and verify records."
        onSuccess={() => navigate(from, { replace: true })}
      />
    </div>
  );
}
