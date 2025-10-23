import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../common/dashboard.css";
import ManageUsers from "./ManageUsers";
import ViewAssignees from "./ViewAssignees";
import SubjectsPage from "./SubjectsPage";
import DepartmentsPage from "./DepartmentsPage";
import AdminManageFacultyPage from "./AdminManageFacultyPage";
import VerifierManagement from "../verifier/VerifierManagement";


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

  const [submittedPapers, setSubmittedPapers] = useState([]);
  const [openedPaper, setOpenedPaper] = useState(null);
  const [submittedLoading, setSubmittedLoading] = useState(false);
  const [submittedError, setSubmittedError] = useState(null);
  const QP_API_BASE = process.env.REACT_APP_QP_API_BASE_URL || process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  const [departments, setDepartments] = useState([]);
  const [newVerifierName, setNewVerifierName] = useState("");
  const [newVerifierDept, setNewVerifierDept] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

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
          const rows = Array.isArray(data) ? data : [];
          setVerifiers(rows);
          setVerifierCount(rows.length);
        })
        .catch((err) => {
          console.error("Fetch verifiers error:", err);
          setUsersError("Failed to load verifiers");
          setVerifiers([]);
        })
        .finally(() => setUsersLoading(false));
    }
  }, [activeTab, manageUsersView, API_BASE]);


  // Fetch submitted (approved) papers when tab active
  useEffect(() => {
    if (activeTab === "submitted") {
      setSubmittedLoading(true);
      setSubmittedError(null);
      fetch(`${QP_API_BASE}/verifier/approved`)
        .then((res) => {
          if (!res.ok) throw new Error(`Status ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setSubmittedPapers(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          console.error("Fetch submitted papers error:", err);
          setSubmittedError("Failed to load submitted papers");
          setSubmittedPapers([]);
        })
        .finally(() => setSubmittedLoading(false));
    }
  }, [activeTab, QP_API_BASE]);

  // Fetch active departments for dropdown when verifiers view active
  useEffect(() => {
    if (activeTab === "manageFaculty" && manageUsersView === "verifiers") {
      axios
        .get(`${API_BASE}/departments/active`)
        .then((res) => {
          const rows = Array.isArray(res.data) ? res.data : [];
          setDepartments(rows);
          // Preselect first active department if none chosen
          if (!newVerifierDept && rows.length > 0) {
            setNewVerifierDept(rows[0].name || rows[0].department || "");
          }
        })
        .catch((err) => {
          console.error("Fetch departments error:", err);
          setDepartments([]);
        });
    }
  }, [activeTab, manageUsersView, API_BASE]);

  const refreshVerifiers = async () => {
    try {
      const res = await fetch(`${API_BASE}/verifier/all/list`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const rows = await res.json();
      const list = Array.isArray(rows) ? rows : [];
      setVerifiers(list);
      setVerifierCount(list.length);
    } catch (err) {
      console.error("Refresh verifiers error:", err);
      setVerifiers([]);
    }
  };

  const handleAddVerifier = async () => {
    setSubmitMsg("");
    const name = newVerifierName.trim();
    const dept = String(newVerifierDept || "").trim();
    if (!dept) {
      setSubmitMsg("Please select a department");
      return;
    }
    setSubmitLoading(true);
    try {
      await axios.post(`${API_BASE}/verifier/register`, {
        verifierName: name || undefined,
        department: dept,
      });
      setSubmitMsg("Verifier created successfully");
      setNewVerifierName("");
      await refreshVerifiers();
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to create verifier";
      setSubmitMsg(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteVerifier = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this verifier and its associated user?")) return;
    setSubmitMsg("");
    try {
      await axios.delete(`${API_BASE}/verifier/${id}`);
      await refreshVerifiers();
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to delete verifier";
      setSubmitMsg(msg);
    }
  };


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
          className={activeTab === "submitted" ? "active-tab" : ""}
          onClick={(e) => { e.preventDefault(); setActiveTab("submitted"); }}
        >
          Submitted Papers
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
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div>
                    <h1 style={{ margin: 0 }}>Manage Users</h1>
                    <p style={{ margin: '6px 0 0 0', color: '#64748b' }}>Quickly navigate to manage Faculty and Verifiers</p>
                  </div>
                  {!usersLoading && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ background: '#eef2ff', color: '#4f46e5', padding: '6px 10px', borderRadius: '9999px', fontWeight: 600 }}>
                        Faculty:&nbsp;{facultyCount}
                      </span>
                      <span style={{ background: '#ecfeff', color: '#0891b2', padding: '6px 10px', borderRadius: '9999px', fontWeight: 600 }}>
                        Verifiers: {verifierCount}
                      </span>
                    </div>
                  )}
                </div>
                {usersError && <p className="error-msg">{usersError}</p>}

                <div className="departments-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', width: '100%' }}>
                  <div
                    className="department-card"
                    onClick={() => setManageUsersView("faculty")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") setManageUsersView("faculty"); }}
                    style={{
                      background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                      border: '1px solid #c7d2fe',
                      boxShadow: '0 8px 18px rgba(79,70,229,0.12)',
                      transition: 'transform .12s ease, box-shadow .12s ease',
                      cursor: 'pointer',
                      padding: '22px',
                      minHeight: '220px',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 22px rgba(79,70,229,0.16)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 18px rgba(79,70,229,0.12)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#1f2937' }}>
                        <i className="fa fa-users" style={{ marginRight: 8, color: '#4f46e5' }}></i>
                        Faculty
                      </div>
                      <span style={{ background: '#4f46e5', color: 'white', padding: '6px 12px', borderRadius: 10, fontSize: 13, fontWeight: 800 }}>
                        {usersLoading ? '…' : `${facultyCount}`}
                      </span>
                    </div>
                    <p style={{ margin: '12px 0 18px 0', color: '#475569', lineHeight: 1.5, wordBreak: 'break-word' }}>Manage internal and external faculty users</p>
                    <button
                      type="button"
                      className="no-bg-btn"
                      onClick={() => setManageUsersView('faculty')}
                      style={{
                        background: '#4f46e5',
                        color: 'black',
                        borderRadius: 10,
                        padding: '12px 16px',
                        fontWeight: 800,
                        fontSize: '15px',
                        width: 'fit-content'
                      }}
                    >
                      Manage Faculty
                    </button>
                  </div>

                  <div
                    className="department-card"
                    onClick={() => setManageUsersView("verifiers")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") setManageUsersView("verifiers"); }}
                    style={{
                      background: 'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)',
                      border: '1px solid #a5f3fc',
                      boxShadow: '0 8px 18px rgba(8,145,178,0.12)',
                      transition: 'transform .12s ease, box-shadow .12s ease',
                      cursor: 'pointer',
                      padding: '22px',
                      minHeight: '220px',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 22px rgba(8,145,178,0.16)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 18px rgba(8,145,178,0.12)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#1f2937' }}>
                        <i className="fa fa-check-circle" style={{ marginRight: 8, color: '#0891b2' }}></i>
                        Verifiers
                      </div>
                      <span style={{ background: '#0891b2', color: 'white', padding: '6px 12px', borderRadius: 10, fontSize: 13, fontWeight: 800 }}>
                        {usersLoading ? '…' : `${verifierCount}`}
                      </span>
                    </div>
                    <p style={{ margin: '12px 0 18px 0', color: '#475569', lineHeight: 1.5, wordBreak: 'break-word' }}>Register and manage department verifiers</p>
                    <button
                      type="button"
                      className="no-bg-btn"
                      onClick={() => setManageUsersView('verifiers')}
                      style={{
                        background: '#0891b2',
                        color: 'black',
                        borderRadius: 10,
                        padding: '12px 16px',
                        fontWeight: 800,
                        fontSize: '15px',
                        width: 'fit-content'
                      }}
                    >
                      Manage Verifiers
                    </button>
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
                <VerifierManagement />
              </>
            )}
          </>
        )}


        {activeTab === "viewAssignees" && <ViewAssignees />}

        {activeTab === "subjects" && <SubjectsPage />}

        {activeTab === "departments" && <DepartmentsPage />}



        {activeTab === "submitted" && (
          <div>
            <h1>Submitted Papers</h1>
            {openedPaper && (
              <div style={{ marginBottom: '20px', padding: '16px', border: '1px solid #e1e7ef', borderRadius: '10px', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Paper: {openedPaper.subject_name} ({openedPaper.subject_code}) - Sem {openedPaper.semester}</h3>
                  <button onClick={() => setOpenedPaper(null)} style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
                </div>
                <div style={{ marginTop: '12px' }}>
                  {openedPaper.questions.map((q, idx) => (
                    <div key={idx} style={{ border: '1px solid #e9edf3', borderRadius: '10px', marginBottom: '12px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', gap: '12px', padding: '12px', background: '#f8f9fa' }}>
                        <div style={{ color: '#ffffff', minWidth: '44px', fontWeight: 800, backgroundColor: '#0d6efd', borderRadius: '999px', textAlign: 'center', padding: '4px 0' }}>{q.question_number}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{q.question_text}</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '10px' }}>
                            <div><strong>CO:</strong> {q.co || ''}</div>
                            <div><strong>L:</strong> {q.l || ''}</div>
                            <div><strong>Marks:</strong> {typeof q.marks === 'number' ? q.marks : 0}</div>
                          </div>
                          {q.file_url && (
                            <div style={{ marginTop: '10px' }}>
                              <img src={`${QP_API_BASE}${q.file_url}`} alt={q.file_name || 'attachment'} style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #e9edf3' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {openedPaper && (
              <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #e1e7ef', borderRadius: '10px', background: '#fff' }}>
                {/* Header actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '8px' }}>
                  <button onClick={() => setOpenedPaper(null)} style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
                </div>

                {/* i) Subject code on right, H2 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <h2 style={{ margin: 0 }}>{openedPaper.subject_code}</h2>
                </div>

                {/* ii) College name centered */}
                <div style={{ textAlign: 'center', marginTop: '6px', fontWeight: 800 }}>
                  GLOBAL ACADEMY OF TECHNOLOGY, BENGALURU
                </div>
                {/* iii) Institute line centered */}
                <div style={{ textAlign: 'center', marginTop: '2px' }}>
                  (An Autonomous Institute, affiliated to VTU, Belegavi)
                </div>

                {/* iv) USN boxes row (11 boxes) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: '6px', marginTop: '12px', maxWidth: '600px' }}>
                  {Array.from({ length: 11 }).map((_, i) => (
                    <div key={i} style={{ border: '1px solid #ced4da', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                      {i === 0 ? 'USN' : ''}
                    </div>
                  ))}
                </div>

                {/* v) Semester centered */}
                <div style={{ textAlign: 'center', marginTop: '12px', fontWeight: 700 }}>
                  Semester: {openedPaper.semester}
                </div>

                {/* vi) Subject name centered */}
                <div style={{ textAlign: 'center', marginTop: '4px', fontWeight: 700 }}>
                  {openedPaper.subject_name}
                </div>

                {/* vii) Time left, Max marks right */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <div style={{ fontWeight: 700 }}>TIME: 3hrs</div>
                  <div style={{ fontWeight: 700 }}>Max.Marks: 100</div>
                </div>

                {/* viii) Note italic centered */}
                <div style={{ textAlign: 'center', marginTop: '8px', fontStyle: 'italic' }}>
                  Note: Answer any five full questions, choosing ONE full question from each module .
                </div>

                {/* Group questions into modules with explicit OR pairs: (1|2), (3|4), (5|6), (7|8), (9|10) */}
                <div style={{ marginTop: '16px' }}>
                  {(() => {
                    const byNum = new Map();
                    (openedPaper.questions || []).forEach((q) => {
                      const match = String(q.question_number || '').match(/^(\d+)/);
                      const num = match ? parseInt(match[1], 10) : null;
                      if (num) byNum.set(num, (byNum.get(num) || []).concat(q));
                    });

                    const modules = [
                      [1, 2],
                      [3, 4],
                      [5, 6],
                      [7, 8],
                      [9, 10],
                    ];

                    return modules.map((pair, idx) => {
                      const [a, b] = pair;
                      const leftQs = (byNum.get(a) || []).sort((x,y)=>String(x.question_number).localeCompare(String(y.question_number)));
                      const rightQs = (byNum.get(b) || []).sort((x,y)=>String(x.question_number).localeCompare(String(y.question_number)));
                      return (
                        <div key={idx+1} style={{ marginBottom: '18px' }}>
                          <div style={{ textAlign: 'center', fontWeight: 800, margin: '10px 0' }}>MODULE - {idx+1}</div>
                          {/* Left question (a) */}
                          {leftQs.map((q, i) => (
                            <div key={`L-${q.question_number}-${i}`} style={{ borderBottom: '1px dashed #e1e7ef', padding: '10px 4px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ color: '#ffffff', minWidth: '36px', fontWeight: 800, backgroundColor: '#0d6efd', borderRadius: '999px', textAlign: 'center', padding: '2px 0' }}>{q.question_number}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ whiteSpace: 'pre-wrap' }}>{q.question_text}</div>
                                </div>
                                <div style={{ minWidth: '220px', display: 'grid', gridTemplateColumns: 'auto auto auto', gap: '8px', alignItems: 'center', justifyContent: 'end' }}>
                                  <div style={{ textAlign: 'right' }}><strong>Marks:</strong> {typeof q.marks === 'number' ? q.marks : 0}</div>
                                  <div style={{ textAlign: 'right' }}><strong>CO:</strong> {q.co || ''}</div>
                                  <div style={{ textAlign: 'right' }}><strong>L:</strong> {q.l || ''}</div>
                                </div>
                              </div>
                              {q.file_url && (
                                <div style={{ marginTop: '8px', marginLeft: '46px' }}>
                                  <img src={`${QP_API_BASE}${q.file_url}`} alt={q.file_name || 'attachment'} style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #e9edf3' }} />
                                </div>
                              )}
                            </div>
                          ))}

                          {/* OR separator only if there is at least one right question */}
                          {rightQs.length > 0 && (
                            <div style={{ textAlign: 'center', fontWeight: 700, margin: '8px 0' }}>-- OR --</div>
                          )}

                          {/* Right question (b) */}
                          {rightQs.map((q, i) => (
                            <div key={`R-${q.question_number}-${i}`} style={{ borderBottom: '1px dashed #e1e7ef', padding: '10px 4px' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div style={{ color: '#ffffff', minWidth: '36px', fontWeight: 800, backgroundColor: '#0d6efd', borderRadius: '999px', textAlign: 'center', padding: '2px 0' }}>{q.question_number}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ whiteSpace: 'pre-wrap' }}>{q.question_text}</div>
                                </div>
                                <div style={{ minWidth: '220px', display: 'grid', gridTemplateColumns: 'auto auto auto', gap: '8px', alignItems: 'center', justifyContent: 'end' }}>
                                  <div style={{ textAlign: 'right' }}><strong>Marks:</strong> {typeof q.marks === 'number' ? q.marks : 0}</div>
                                  <div style={{ textAlign: 'right' }}><strong>CO:</strong> {q.co || ''}</div>
                                  <div style={{ textAlign: 'right' }}><strong>L:</strong> {q.l || ''}</div>
                                </div>
                              </div>
                              {q.file_url && (
                                <div style={{ marginTop: '8px', marginLeft: '46px' }}>
                                  <img src={`${QP_API_BASE}${q.file_url}`} alt={q.file_name || 'attachment'} style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #e9edf3' }} />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
            {submittedLoading && <p>Loading…</p>}
            {submittedError && <p className="error-msg">{submittedError}</p>}
            {!submittedLoading && !submittedError && (
              <div className="table-wrapper">
                <table className="user-table">
                  <thead>
                    <tr>
                      <th>Subject Code</th>
                      <th>Semester</th>
                      <th>Submitted At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submittedPapers.length === 0 && (
                      <tr>
                        <td colSpan={3}>No papers submitted yet.</td>
                      </tr>
                    )}
                    {submittedPapers.map((p) => (
                      <tr key={p._id}>
                        <td>{p.subject_code}</td>
                        <td>{p.semester}</td>
                        <td>{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</td>
                        <td>
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`${QP_API_BASE}/verifier/papers/${encodeURIComponent(p.subject_code)}/${encodeURIComponent(p.semester)}`);
                                const contentType = res.headers.get('content-type') || '';
                                if (!contentType.includes('application/json')) {
                                  const text = await res.text();
                                  throw new Error(`Unexpected response (not JSON). Check API base URL. First bytes: ${text.slice(0, 60)}`);
                                }
                                const data = await res.json();
                                if (!res.ok) throw new Error(data?.error || `Status ${res.status}`);
                                setOpenedPaper(data);
                              } catch (err) {
                                console.error('Open paper error:', err);
                                alert(`Failed to open paper: ${err.message}`);
                              }
                            }}
                            style={{ padding: '6px 12px', backgroundColor: '#0d6efd', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
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

