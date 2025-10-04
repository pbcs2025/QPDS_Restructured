import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../common/dashboard.css";
import { Link } from 'react-router-dom';


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

  // Load faculty data on component mount
  useEffect(() => {
    const storedFacultyData = localStorage.getItem("faculty_data");
    if (storedFacultyData) {
      setFacultyData(JSON.parse(storedFacultyData));
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
        <button type="button" className="sidebar-btn active-tab" onClick={() => {}}>{"\uD83C\uDFE0"} Dashboard</button>
        <Link to="/question-paper-builder">View paper</Link>
        <button type="button" className="sidebar-btn" onClick={() => {}}>{"\u270D\uFE0F"} Submit Questions</button>
        <button type="button" className="sidebar-btn" onClick={() => { handleResetPassword("faculty"); }}>{"\u2699\uFE0F"} Reset Password</button>
        <button type="button" className="sidebar-btn logout-btn" onClick={() => { handleLogoutClick(); }} style={{ color: "#ffcccc" }}>{"\uD83D\uDEAA"} Logout</button>
      </div>

      <div className="dashboard-content">
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
