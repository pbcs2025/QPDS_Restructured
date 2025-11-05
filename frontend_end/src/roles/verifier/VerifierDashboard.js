import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../common/dashboard.css";
import QuestionPapers from "./QuestionPapers";
import ManageFaculties from "./ManageFaculties";


const API_BASE = process.env.REACT_APP_API_BASE_URL;

function VerifierDashboard() {
  const navigate = useNavigate();
  const [verifier, setVerifier] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showConfirm, setShowConfirm] = useState(false);

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

  const handleLogoutClick = () => setShowConfirm(true);
  const confirmLogout = () => {
    setShowConfirm(false);
    localStorage.removeItem("verifier");
    navigate("/");
  };
  const cancelLogout = () => setShowConfirm(false);

  if (!verifier) return null;

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>Verifier</h2>
        <div style={{ marginBottom: "10px", opacity: 0.9 }}>{verifier.username}</div>
        <div style={{ marginBottom: "20px", opacity: 0.8 }}>{verifier.department}</div>

        <a href="#" className={activeTab === "dashboard" ? "active-tab" : ""} onClick={(e) => { e.preventDefault(); setActiveTab("dashboard"); }}>🏠 Dashboard</a>
        <a href="#" className={activeTab === "faculties" ? "active-tab" : ""} onClick={(e) => { e.preventDefault(); setActiveTab("faculties"); }}>👩‍🏫 Manage Faculties</a>
        <a href="#" className={activeTab === "papers" ? "active-tab" : ""} onClick={(e) => { e.preventDefault(); setActiveTab("papers"); }}>📄 Question Papers</a>
        <a href="#" className={activeTab === "subjects" ? "active-tab" : ""} onClick={(e) => { e.preventDefault(); setActiveTab("subjects"); }}>📚 Subjects</a>
        <a href="#" className={activeTab === "reports" ? "active-tab" : ""} onClick={(e) => { e.preventDefault(); setActiveTab("reports"); }}>📊 Reports</a>
        <a href="#" className={activeTab === "settings" ? "active-tab" : ""} onClick={(e) => { e.preventDefault(); setActiveTab("settings"); }}>⚙️ Profile/Settings</a>
        <a href="#" onClick={(e) => { e.preventDefault(); handleLogoutClick(); }} style={{ color: "#ffcccc" }}>🚪 Logout</a>
      </div>

      <div className="dashboard-content">
        {activeTab === "dashboard" && (
          <>
            <h1>Department Overview</h1>
            <div className="dashboard-stats">
              <div className="card">Total Faculties: —</div>
              <div className="card">Pending Papers: —</div>
              <div className="card">Approved Papers: —</div>
              <div className="card">Subjects: —</div>
            </div>
          </>
        )}

        {activeTab === "faculties" && (
          <ManageFaculties />
        )}

        {activeTab === "papers" && (
          <QuestionPapers />
        )}

        {activeTab === "subjects" && (
          <div>
            <h1>Subjects</h1>
            <p>Manage department subjects & assign to faculties (placeholder).</p>
          </div>
        )}

        {activeTab === "reports" && (
          <div>
            <h1>Reports</h1>
            <p>Submission/approval stats (placeholder).</p>
          </div>
        )}

        {activeTab === "settings" && (
          <div>
            <h1>Profile / Settings</h1>
            <p>View profile, change password (placeholder).</p>
          </div>
        )}
      </div>

      {showConfirm && (
        <div className="logout-confirm-popup">
          <div className="popup-box">
            <p>Are you sure you want to logout?</p>
            <div className="button-group">
              <button className="yes" onClick={confirmLogout}>Yes</button>
              <button className="no" onClick={cancelLogout}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VerifierDashboard;


