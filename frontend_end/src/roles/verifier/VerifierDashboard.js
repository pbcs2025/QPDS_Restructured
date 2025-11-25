import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../../common/dashboard.css";
import QuestionPapers from "./QuestionPapers";
import ManageFaculties from "./ManageFaculties";
import SubjectsManagement from "./SubjectsManagement";
import ReportsManagement from "./ReportsManagement";


const API_BASE = process.env.REACT_APP_API_BASE_URL;

function VerifierDashboard() {
  const navigate = useNavigate();
  const [verifier, setVerifier] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("verifier");
    if (!raw) {
      navigate("/login/verifier");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setVerifier(parsed);
      // Set default tab based on verifier type - case-insensitive check
      if (parsed.role && parsed.role.toLowerCase() === 'verifier' && parsed.temporary) {
        console.log('Setting active tab to papers for temporary verifier');
        setActiveTab("papers");
      }
    } catch {
      navigate("/login/verifier");
    }
  }, [navigate]);

  const isTemporaryVerifier = verifier && verifier.role && verifier.role.toLowerCase() === 'verifier' && verifier.temporary;
  console.log('Verifier role check:', {
    hasVerifier: !!verifier,
    role: verifier?.role,
    temporary: verifier?.temporary,
    isTemporaryVerifier
  });

  // Timer for temporary verifier expiration
  const formatTimeRemaining = useCallback((seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (isTemporaryVerifier && verifier?.expiresAt) {
      const expiryTime = new Date(verifier.expiresAt).getTime();

      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000));

        if (remaining > 0) {
          setTimeRemaining(remaining);
          setIsExpired(false);
        } else {
          setTimeRemaining(0);
          setIsExpired(true);
          // Auto-logout when expired
          console.log('Temporary verifier session expired, logging out...');
          alert('Your temporary verifier session has expired. You will be logged out.');
          localStorage.removeItem("verifier");
          navigate("/login/verifier");
          return;
        }
      };

      // Update immediately
      updateTimer();

      // Set up interval to update every second
      const timerId = setInterval(updateTimer, 1000);

      return () => clearInterval(timerId);
    }
  }, [isTemporaryVerifier, verifier?.expiresAt, navigate]);

  const handleLogoutClick = () => setShowConfirm(true);
  const confirmLogout = () => {
    setShowConfirm(false);
    localStorage.removeItem("verifier");
    navigate("/");
  };

  // Check if session has expired on component mount
  useEffect(() => {
    if (isTemporaryVerifier && verifier?.expiresAt) {
      const now = Date.now();
      const expiryTime = new Date(verifier.expiresAt).getTime();

      if (now >= expiryTime) {
        console.log('Session already expired on load, logging out...');
        localStorage.removeItem("verifier");
        navigate("/login/verifier");
        return;
      }
    }
  }, [isTemporaryVerifier, verifier?.expiresAt, navigate]);
  const cancelLogout = () => setShowConfirm(false);

  if (!verifier) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'url(/images/GAT.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '20px', marginBottom: '10px' }}>Loading Verifier Dashboard...</div>
          <div style={{ border: '2px solid #3498db', borderTop: '2px solid transparent', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>Verifier</h2>
        <div style={{ marginBottom: "10px", opacity: 0.9 }}>{verifier.username}</div>
        <div style={{ marginBottom: "20px", opacity: 0.8 }}>{verifier.department}</div>

        {/* Show countdown timer for temporary verifiers */}
        {isTemporaryVerifier && (
          <div style={{
            marginBottom: "20px",
            padding: "10px",
            backgroundColor: timeRemaining < 1800 ? "#ffebee" : "#e8f5e8", // Red if < 30 min
            borderRadius: "5px",
            border: timeRemaining < 1800 ? "1px solid #f44336" : "1px solid #4caf50",
            color: timeRemaining < 1800 ? "#c62828" : "#2e7d32",
            fontSize: "14px",
            fontWeight: "bold",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "12px", marginBottom: "5px" }}>Session Expires In:</div>
            <div style={{ fontSize: "16px", fontFamily: "monospace" }}>
              {formatTimeRemaining(timeRemaining)}
            </div>
          </div>
        )}

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
          <SubjectsManagement verifier={verifier} />
        )}

        {activeTab === "reports" && (
          <ReportsManagement verifier={verifier} />
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


