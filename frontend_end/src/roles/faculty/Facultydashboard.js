import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../common/dashboard.css";
import { Link } from 'react-router-dom';
import axios from 'axios';


function FacultyDashboard() {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResetPopup, setShowResetPopup] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [facultyData, setFacultyData] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  

  const handleLogoutClick = () => setShowConfirm(true);
  const confirmLogout = () => {
    setShowConfirm(false);
    localStorage.removeItem("faculty_username");
    localStorage.removeItem("faculty_data");
    navigate("/");
  };
  const cancelLogout = () => setShowConfirm(false);

  // Fetch faculty assignments
  const fetchAssignments = async (email) => {
    try {
      setAssignmentsLoading(true);
      const response = await axios.get(`http://localhost:5000/api/faculty/assignments/${email}`);
      setAssignments(response.data.assignments || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  // Load faculty data on component mount
  useEffect(() => {
    const storedFacultyData = localStorage.getItem("faculty_data");
    if (storedFacultyData) {
      const data = JSON.parse(storedFacultyData);
      setFacultyData(data);
      // Fetch assignments for this faculty member
      if (data.email) {
        fetchAssignments(data.email);
      }
    } else {
      // If no stored data, redirect to login
      navigate("/login/faculty");
    }
  }, [navigate]);

  // const handleResetPassword = () => {
  //   setShowResetPopup(true);
  // };

  const handleResetPassword = (role) => {
  console.log("Role is:", role); // Output: faculty
  if(role === "faculty"){
    setShowResetPopup(true);
    setShowResetForm(false);
  }else{
     setShowResetPopup(false);
     setShowResetForm(false);
  }
};

  const confirmReset = () => {
    setShowResetPopup(false);
    setShowResetForm(true);
  };

  const cancelReset = () => {
    setShowResetPopup(false);
  };

  // Helper functions for assignments
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return '#f39c12';
      case 'Overdue': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage("❌ New passwords do not match.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/faculty/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword,
          newPassword,
          username: localStorage.getItem("faculty_username"),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Password updated successfully.");
       // setShowResetForm(false);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setMessage(""); // Clear the message after 5 seconds
        }, 5000);

      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to update password.");
    }
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>Faculty</h2>
        <button 
          type="button" 
          className={`sidebar-btn ${activeTab === 'dashboard' ? 'active-tab' : ''}`} 
          onClick={() => setActiveTab('dashboard')}
        >
          🏠 Dashboard
        </button>
        <button 
          type="button" 
          className={`sidebar-btn ${activeTab === 'assignments' ? 'active-tab' : ''}`} 
          onClick={() => setActiveTab('assignments')}
        >
          📋 Assigned Papers
        </button>
        <Link to="/question-paper-builder">📝 Question Paper Builder</Link>
        <button type="button" className="sidebar-btn" onClick={() => { handleResetPassword("faculty"); }}>⚙️ Reset Password</button>
        <button type="button" className="sidebar-btn logout-btn" onClick={() => { handleLogoutClick(); }} style={{ color: "#ffcccc" }}>🚪 Logout</button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'dashboard' && (
          <>
            <h1>Welcome to Faculty Dashboard</h1>
            {facultyData ? (
              <div className="faculty-info">
                <h2>Hello, {facultyData.name}! 👋</h2>
                <div className="faculty-details">
                  <p><strong>Department:</strong> {facultyData.department}</p>
                  <p><strong>College:</strong> {facultyData.clgName}</p>
                  <p><strong>Email:</strong> {facultyData.email}</p>
                </div>
              </div>
            ) : (
              <p>Loading faculty information...</p>
            )}
          </>
        )}

        {activeTab === 'assignments' && (
          <>
            <h1>📋 Assigned Papers</h1>
            {assignmentsLoading ? (
              <p>Loading assignments...</p>
            ) : assignments.length === 0 ? (
              <div className="no-assignments">
                <p>📭 No papers assigned to you yet.</p>
                <p>Check back later or contact your department head.</p>
              </div>
            ) : (
              <div className="assignments-container">
                <div className="assignments-summary">
                  <div className="summary-card">
                    <h3>📊 Summary</h3>
                    <div className="summary-stats">
                      <div className="stat">
                        <span className="stat-number">{assignments.length}</span>
                        <span className="stat-label">Total Assignments</span>
                      </div>
                      <div className="stat">
                        <span className="stat-number">{assignments.filter(a => a.status === 'Pending').length}</span>
                        <span className="stat-label">Pending</span>
                      </div>
                      <div className="stat">
                        <span className="stat-number">{assignments.filter(a => a.status === 'Overdue').length}</span>
                        <span className="stat-label">Overdue</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="assignments-table-container">
                  <table className="assignments-table">
                    <thead>
                      <tr>
                        <th>Subject Code</th>
                        <th>Subject Name</th>
                        <th>Assigned Date</th>
                        <th>Submission Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((assignment) => (
                        <tr key={assignment._id}>
                          <td>
                            <strong>{assignment.subject_code}</strong>
                          </td>
                          <td>
                            {assignment.subject_name || 'N/A'}
                          </td>
                          <td>{formatDate(assignment.assigned_at)}</td>
                          <td>
                            <span className={`deadline ${assignment.status === 'Overdue' ? 'overdue' : ''}`}>
                              {formatDate(assignment.submit_date)}
                            </span>
                          </td>
                          <td>
                            <span 
                              className="status-badge" 
                              style={{ backgroundColor: getStatusColor(assignment.status) }}
                            >
                              {assignment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {showResetPopup && (
          <div className="popup-overlay">
            <div className="popup-box">
              <p>Are you sure you want to reset your password?</p>
              <div className="popup-buttons">
                <button className="btn confirm" onClick={confirmReset}>Yes</button>
                <button className="btn cancel" onClick={cancelReset}>No</button>
              </div>
            </div>
          </div>
        )}

        {showResetForm && (
          <div className="reset-form">
            <h3>Reset Password</h3>
            <form onSubmit={handlePasswordUpdate}>
              <div className="input-wrapper">
                <input
                  type={showOld ? "text" : "password"}
                  placeholder="Old Password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
                <span onClick={() => setShowOld(!showOld)} className="toggle-eye">
                  {showOld ? "🙈" : "👁️"}
                </span>
              </div>

              <div className="input-wrapper">
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <span onClick={() => setShowNew(!showNew)} className="toggle-eye">
                  {showNew ? "🙈" : "👁️"}
                </span>
              </div>

              <div className="input-wrapper">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <span onClick={() => setShowConfirm(!showConfirm)} className="toggle-eye">
                  {showConfirm ? "🙈" : "👁️"}
                </span>
              </div>

              <button type="submit" className="btn confirm">Update Password</button>
            </form>
            {message && <p className="msg">{message}</p>}
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

export default FacultyDashboard;
