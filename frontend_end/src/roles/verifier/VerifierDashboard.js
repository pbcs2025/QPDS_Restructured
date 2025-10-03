import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../common/dashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function VerifierDashboard() {
  const navigate = useNavigate();
  const [verifier, setVerifier] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem("verifier");
    if (!raw) {
      navigate("/login/verifier");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setVerifier(parsed);
    } catch {
      navigate("/login/verifier");
    }
  }, [navigate]);

  if (!verifier) return null;

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>Verifier</h2>
        <div>{verifier.username}</div>
        <div>{verifier.department}</div>
      </div>
      <div className="main-content">
        <h1>Verifier Dashboard</h1>
        <p>Welcome, {verifier.username}</p>
      </div>
    </div>
  );
}

export default VerifierDashboard;


