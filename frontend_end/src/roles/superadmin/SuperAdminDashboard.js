import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../common/dashboard.css";
import ManageUsers from "./ManageUsers";
import ViewAssignees from "./ViewAssignees";
import SubjectsPage from "./SubjectsPage";
import DepartmentsPage from "./DepartmentsPage";
import AdminManageFacultyPage from "./AdminManageFacultyPage";


function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showConfirm, setShowConfirm] = useState(false);
  const [manageUsersView, setManageUsersView] = useState("cards"); // cards | faculty | verifiers
  const [facultyCount, setFacultyCount] = useState(0);
  const [verifierCount, setVerifierCount] = useState(0);
  const [verifiers, setVerifiers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const API_BASE = process.env.REACT_APP_API_BASE_URL;
  const notifications = [
    "📢 New faculty registered.",
    "⚠️ Password update request pending.",
    "✅ Report generated successfully.",
  ];

  const handleLogoutClick = () => setShowConfirm(true);
  const confirmLogout = () => {
    setShowConfirm(false);
    navigate("/");
  };
  const cancelLogout = () => setShowConfirm(false);

  // Fetch counts when Manage Users cards are visible
  useEffect(() => {
    if (activeTab === "manageFaculty" && manageUsersView === "cards") {
      setUsersLoading(true);
      setUsersError(null);
      const fetchCounts = async () => {
        try {
          const [usersRes, verListRes] = await Promise.all([
            fetch(`${API_BASE}/users`), // internal users
            fetch(`${API_BASE}/verifier/all/list`),
          ]);
          const users = usersRes.ok ? await usersRes.json() : [];
          const verList = verListRes.ok ? await verListRes.json() : [];
          const faculty = Array.isArray(users) ? users.filter(u => (u.role === 'Faculty' || (!u.role && u.usertype === 'internal'))).length : 0;
          setFacultyCount(faculty);
          setVerifierCount(Array.isArray(verList) ? verList.length : 0);
        } catch (err) {
          console.error("Count fetch error:", err);
          setUsersError("Failed to load user counts");
          setFacultyCount(0);
          setVerifierCount(0);
        } finally {
          setUsersLoading(false);
        }
      };
      fetchCounts();
    }
  }, [activeTab, manageUsersView, API_BASE]);

  // Fetch verifiers list when verifiers view active
  useEffect(() => {
    if (activeTab === "manageFaculty" && manageUsersView === "verifiers") {
      setUsersLoading(true);
      setUsersError(null);
      fetch(`${API_BASE}/verifier/all/list`)
        .then((res) => {
          if (!res.ok) throw new Error(`Status ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setVerifiers(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          console.error("Fetch verifiers error:", err);
          setUsersError("Failed to load verifiers");
          setVerifiers([]);
        })
        .finally(() => setUsersLoading(false));
    }
  }, [activeTab, manageUsersView, API_BASE]);

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>Super Admin</h2>
        <a
          href="#"
          className={activeTab === "dashboard" ? "active-tab" : ""}
          onClick={(e) => { e.preventDefault(); setActiveTab("dashboard"); }}
        >
          Dashboard
        </a>

        <a
  href="#"
  className={activeTab === "manageFaculty" ? "active-tab" : ""}
  onClick={(e) => {
    e.preventDefault();
    setActiveTab("manageFaculty");
    setManageUsersView("cards");
  }}
>
  Manage Users
</a>


        
        <a
          href="#"
          className={activeTab === "manageUsers" ? "active-tab" : ""}
          onClick={(e) => { e.preventDefault(); setActiveTab("manageUsers"); }}
        >
          Select QP Setters
        </a>
        <a
          href="#"
          className={activeTab === "viewAssignees" ? "active-tab" : ""}
          onClick={(e) => { e.preventDefault(); setActiveTab("viewAssignees"); }}
        >
          View Assignees
        </a>

       <a
  href="#"
  className={activeTab === "subjects" ? "active-tab" : ""}
  onClick={(e) => { e.preventDefault(); setActiveTab("subjects"); }}
>
  Subjects
</a>

<a
  href="#"
  className={activeTab === "departments" ? "active-tab" : ""}
  onClick={(e) => { e.preventDefault(); setActiveTab("departments"); }}
>
  Departments
</a>



        <a
          href="#"
          className={activeTab === "settings" ? "active-tab" : ""}
          onClick={(e) => { e.preventDefault(); setActiveTab("settings"); }}
        >
          Settings
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); handleLogoutClick(); }} style={{ color: "red" }}>
          Logout
        </a>
      </div>

      <div className="dashboard-content">
        {activeTab === "dashboard" && (
          <>
            <h1>Welcome to Super Admin Dashboard</h1>

            <div className="dashboard-stats">
              <div className="card">Total Users: 150</div>
              <div className="card">Admins: 10</div>
              <div className="card">Faculties: 85</div>
              <div className="card">Paper Setters: 55</div>
            </div>

            <div className="section recent-activity">
              <h3>Recent Activity</h3>
              <table className="user-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Activity</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Ravi</td>
                    <td>Faculty</td>
                    <td>Logged in</td>
                    <td>5 mins ago</td>
                  </tr>
                  <tr>
                    <td>Shreya</td>
                    <td>Admin</td>
                    <td>Updated user</td>
                    <td>10 mins ago</td>
                  </tr>
                  <tr>
                    <td>Anil</td>
                    <td>Paper Setter</td>
                    <td>Logged out</td>
                    <td>20 mins ago</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="section notifications">
              <h3>Notifications <span className="badge">{notifications.length}</span></h3>
              <ul>
                {notifications.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        {activeTab === "manageUsers" && <ManageUsers userType="superadmin" userpage="qp" />}

        {activeTab === "manageFaculty" && (
          <>
            {manageUsersView === "cards" && (
              <>
                <h1>Manage Users</h1>
                {usersError && <p className="error-msg">{usersError}</p>}
                <div className="departments-grid">
                  <div
                    className="department-card"
                    onClick={() => setManageUsersView("faculty")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") setManageUsersView("faculty"); }}
                  >
                    <div>
                      Faculty
                    </div>
                    <div style={{ color: '#64748b', fontWeight: '600' }}>
                      {usersLoading ? "…" : `${facultyCount} total`}
                    </div>
                  </div>

                  <div
                    className="department-card"
                    onClick={() => setManageUsersView("verifiers")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") setManageUsersView("verifiers"); }}
                  >
                    <div>
                      Verifiers
                    </div>
                    <div style={{ color: '#64748b', fontWeight: '600' }}>
                      {usersLoading ? "…" : `${verifierCount} total`}
                    </div>
                  </div>
                </div>
              </>
            )}

            {manageUsersView === "faculty" && (
              <>
                <button className="back-btn" onClick={() => setManageUsersView("cards")}>
                  ← Back to Manage Users
                </button>
                <AdminManageFacultyPage />
              </>
            )}

            {manageUsersView === "verifiers" && (
              <>
                <button className="back-btn" onClick={() => setManageUsersView("cards")}>
                  ← Back to Manage Users
                </button>
                <h1>Verifiers</h1>
                {usersLoading && <p>Loading verifiers…</p>}
                {usersError && <p className="error-msg">{usersError}</p>}
                {!usersLoading && !usersError && (
                  <div className="table-wrapper">
                    <table className="user-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Department</th>
                          <th>College</th>
                        </tr>
                      </thead>
                      <tbody>
                        {verifiers.length === 0 && (
                          <tr>
                            <td colSpan={4}>No verifiers found.</td>
                          </tr>
                        )}
                        {verifiers.map((u) => (
                          <tr key={u._id || u.id}>
                            <td>{u.name || '-'}</td>
                            <td>{u.email || '-'}</td>
                            <td>{u.deptName || u.department || '-'}</td>
                            <td>{u.clgName || u.college || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}


        {activeTab === "viewAssignees" && <ViewAssignees />}

        {activeTab === "subjects" && <SubjectsPage />}

        {activeTab === "departments" && <DepartmentsPage />}



        {activeTab === "settings" && (
          <div>
            <h1>Settings</h1>
            <p>Settings section coming soon...</p>
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

export default SuperAdminDashboard;

