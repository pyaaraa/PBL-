import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { getApiBase } from "../api";
import { useFetch } from "../hooks/useFetch";
import { apiFetch } from "../api";

export default function PublicProfilePage() {
  const { wallet } = useParams();
  const fetchProfile = useCallback(() => apiFetch(`/profile/${wallet}`), [wallet]);
  const { data, loading, error } = useFetch(fetchProfile, [wallet]);
  const profile = data?.profile;

  return (
    <section className="glass-card card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Public Profile</p>
          <h2>{wallet}</h2>
        </div>
        <Link className="ghost-button link-button" to={`/verify?wallet=${wallet}`}>
          Verify Wallet
        </Link>
      </div>
      {loading && <p>Loading public profile...</p>}
      {error && <p className="error-text">{error}</p>}
      {profile && (
        <div className="dashboard-columns">
          <div>
            <h3>Attendance</h3>
            <div className="mini-card">
              <strong>{profile.attendancePercentage}%</strong>
              <span>Attendance Score</span>
            </div>
          </div>
          <div>
            <h3>Certificates</h3>
            <div className="stack">
              {profile.certificates.map((certificate) => (
                <div className="mini-card" key={certificate._id}>
                  <strong>{certificate.degreeName}</strong>
                  <span>{certificate.universityName}</span>
                  <a
                    href={`${getApiBase().replace(/\/api$/, "")}/api/certificates/${wallet}/${certificate.tokenId}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download PDF
                  </a>
                </div>
              ))}
              {profile.certificates.length === 0 && <p className="muted-text">No certificates yet.</p>}
            </div>
          </div>
          <div>
            <h3>Skills</h3>
            <div className="stack">
              {profile.skills.map((skill) => (
                <div className="mini-card" key={skill._id}>
                  <strong>{skill.title}</strong>
                  <span>{skill.description}</span>
                  <a href={skill.proofUri} target="_blank" rel="noreferrer">
                    View Proof
                  </a>
                </div>
              ))}
              {profile.skills.length === 0 && <p className="muted-text">No skills yet.</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
