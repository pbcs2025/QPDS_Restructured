import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../common/dashboard.css";
//import AdminManageFaculty from "./AdminManageFaculty"; // Import at the top
//import AdminManageFacultyPage from "./AdminManageFacultyPage";

function AdminDashboard() {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [formData, setFormData] = useState({
    name: "",
    clgName: "",
    deptName: "",
    email: "",
    phone: "",
  });
  const [message, setMessage] = useState("");

  const handleLogoutClick = () => setShowConfirm(true);
  const confirmLogout = () => {
    setShowConfirm(false);
    navigate("/");
  };
  const cancelLogout = () => setShowConfirm(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddFaculty = async () => {
    setMessage("");
    try {
      const res = await fetch("http://localhost:5000/api/externalregister", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.name,
          clgName: formData.clgName,
          deptName: formData.deptName,
          email: formData.email,
          phoneNo: formData.phone,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ External faculty registered successfully.");
        setFormData({
          name: "",
          clgName: "",
          deptName: "",
          email: "",
          phone: "",
        });
      } else {
        setMessage("❌ " + data.error);
      }
    } catch (err) {
      console.error("Registration failed:", err);
      setMessage("❌ Failed to register external faculty.");
    }
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>Admin</h2>
        <a
          href="#"
          onClick={() => setActiveTab("dashboard")}
          className={activeTab === "dashboard" ? "active-tab" : ""}
        >
          Dashboard
        </a>
        <a
          href="#"
          onClick={() => setActiveTab("faculties")}
          className={activeTab === "faculties" ? "active-tab" : ""}
        >
          Manage Faculties
        </a>
        <a href="#" onClick={() => setActiveTab("reports")}
          className={activeTab === "reports" ? "active-tab" : ""}>Reports</a>
        <a href="#" onClick={handleLogoutClick} style={{ color: "red" }}>
          Logout
        </a>
      </div>

      <div className="dashboard-content">
        {activeTab === "dashboard" && (
          <>
            <h1>Welcome to Admin Dashboard</h1>
            <p>This is the Admin's control panel.</p>
          </>
        )}


        {/* {activeTab === "faculties" && (
  <AdminManageFacultyPage />
)} */}

        
        {activeTab === "reports" && (
          <>
            <h1>Reports</h1>
            <p>Reports will be updated soon...</p>
          </>
        )}

      </div>

      {showConfirm && (
        <div className="logout-confirm-popup">
          <div className="popup-box">
            <p>Are you sure you want to logout?</p>
            <div className="button-group">
              <button className="yes" onClick={confirmLogout}>
                Yes
              </button>
              <button className="no" onClick={cancelLogout}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
