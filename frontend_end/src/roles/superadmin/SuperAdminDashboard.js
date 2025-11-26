// frontend/src/roles/superadmin/SuperAdminDashboard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../common/dashboard.css";
import ManageUsers from "./ManageUsers";
import ViewAssignees from "./ViewAssignees";
import SubjectsPage from "./SubjectsPage";
import DepartmentsPage from "./DepartmentsPage";
import MBADepartmentsPage from "./mbaDepartmentsPage";
import MBASubjectsPage from "./mbaSubjectsPage";
import AdminManageFacultyPage from "./AdminManageFacultyPage";
import VerifierManagement from "../verifier/VerifierManagement";
import MBAManageFacultyPage from "./MBAManageFacultyPage";
import MBAVerifierManagement from "./MBAVerifierManagement";
import MBAManageQPSetters from "./MBAManageQPSetters";
import MBAViewAssignees from "./MBAViewAssignees";
import SessionManagement from "./SessionManagement";
import { io } from "socket.io-client";

function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showConfirm, setShowConfirm] = useState(false);
  const [manageUsersView, setManageUsersView] = useState("cards");
  const [facultyCount, setFacultyCount] = useState(0);
  const [verifierCount, setVerifierCount] = useState(0);
  const [verifiers, setVerifiers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);

  const [submittedPapers, setSubmittedPapers] = useState([]);
  const [openedPaper, setOpenedPaper] = useState(null);
  const [submittedLoading, setSubmittedLoading] = useState(false);
  const [submittedError, setSubmittedError] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [departments, setDepartments] = useState([]);
  const [papersSentForPrint, setPapersSentForPrint] = useState([]);
  const [showSentForPrint, setShowSentForPrint] = useState(false);
  const [showArchivedPapers, setShowArchivedPapers] = useState(false);
  const [archivedPapers, setArchivedPapers] = useState([]);
  const [openDropdowns, setOpenDropdowns] = useState({
    manageUsers: false,
    departments: false,
    subjects: false,
    qpSetters: false,
    viewAssignees: false,
    submittedPapers: false
  });

  const toggleDropdown = (dropdownName) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [dropdownName]: !prev[dropdownName]
    }));
  };

  const sidebarLinkStyle = (isActive = false) => ({
    color: '#f8fafc',
    fontWeight: 600,
    textDecoration: 'none',
    padding: '10px 14px',
    borderRadius: '10px',
    display: 'block',
    background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
    transition: 'background 0.2s ease'
  });

  const renderCaret = (open) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '22px',
        height: '22px',
        borderRadius: '999px',
        background: 'rgba(255,255,255,0.15)',
        color: '#ffffff',
        fontSize: '12px',
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.3s ease'
      }}
    >
      ▾
    </span>
  );

  useEffect(() => {
    const savedPapers = localStorage.getItem('papersSentForPrint');
    if (savedPapers) {
      try {
        setPapersSentForPrint(JSON.parse(savedPapers));
      } catch (err) {
        console.error('Error loading papers sent for print:', err);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('papersSentForPrint', JSON.stringify(papersSentForPrint));
  }, [papersSentForPrint]);

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  const [newVerifierName, setNewVerifierName] = useState("");
  const [newVerifierDept, setNewVerifierDept] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");

  const handleLogoutClick = () => setShowConfirm(true);
  
  const confirmLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Call logout endpoint to log activity
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Clear local storage
      localStorage.removeItem('token');
      
      setShowConfirm(false);
      navigate("/");
    } catch (error) {
      console.error('Logout error:', error);
      // Still navigate even if API call fails
      localStorage.removeItem('token');
      setShowConfirm(false);
      navigate("/");
    }
  };

  const cancelLogout = () => setShowConfirm(false);

  useEffect(() => {
    if (activeTab === "manageFaculty" && manageUsersView === "cards") {
      setUsersLoading(true);
      setUsersError(null);
      const fetchCounts = async () => {
        try {
          const token = localStorage.getItem('token');
          const [usersRes, verListRes] = await Promise.all([
            fetch(`${API_BASE}/users`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE}/verifier/all/list`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
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

  useEffect(() => {
    if (activeTab === "mbaManageUsers" && manageUsersView === "cards") {
      setUsersLoading(true);
      setUsersError(null);
      const fetchCounts = async () => {
        try {
          const token = localStorage.getItem('token');
          const [facultyRes, verListRes] = await Promise.all([
            fetch(`${API_BASE}/mbafaculty/all`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE}/mbaverifier/all/list`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
          ]);
          const faculties = facultyRes.ok ? await facultyRes.json() : [];
          const verList = verListRes.ok ? await verListRes.json() : [];
          const facultyCount = Array.isArray(faculties) ? faculties.length : 0;
          setFacultyCount(facultyCount);
          setVerifierCount(Array.isArray(verList) ? verList.length : 0);
        } catch (err) {
          console.error("MBA Count fetch error:", err);
          setUsersError("Failed to load MBA user counts");
          setFacultyCount(0);
          setVerifierCount(0);
        } finally {
          setUsersLoading(false);
        }
      };
      fetchCounts();
    }
  }, [activeTab, manageUsersView, API_BASE]);

  useEffect(() => {
    if (activeTab === "manageFaculty" && manageUsersView === "verifiers") {
      setUsersLoading(true);
      setUsersError(null);
      const token = localStorage.getItem('token');
      fetch(`${API_BASE}/verifier/all/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
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

  useEffect(() => {
    if (activeTab === "mbaManageUsers" && manageUsersView === "verifiers") {
      setUsersLoading(true);
      setUsersError(null);
      const token = localStorage.getItem('token');
      fetch(`${API_BASE}/mbaverifier/all/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
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
          console.error("Fetch MBA verifiers error:", err);
          setUsersError("Failed to load MBA verifiers");
          setVerifiers([]);
        })
        .finally(() => setUsersLoading(false));
    }
  }, [activeTab, manageUsersView, API_BASE]);

  useEffect(() => {
    if (activeTab === "submitted") {
      const token = localStorage.getItem('token');
      fetch(`${API_BASE}/departments/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Status ${res.status}`);
          return res.json();
        })
        .then((data) => {
          const deptList = Array.isArray(data) ? data : [];
          setDepartments(deptList);
        })
        .catch((err) => {
          console.error("Fetch departments error:", err);
          setDepartments([]);
        });
    }
  }, [activeTab, API_BASE]);

  useEffect(() => {
    if (activeTab === "submitted") {
      setSubmittedLoading(true);
      setSubmittedError(null);
      
      const params = new URLSearchParams();
      if (selectedDepartment) params.append('department', selectedDepartment);
      if (selectedSemester) params.append('semester', selectedSemester);
      
      const token = localStorage.getItem('token');
      fetch(`${API_BASE}/approvedpapers?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Status ${res.status}`);
          return res.json();
        })
        .then((data) => {
          console.log('Fetched approved papers:', data);
          let papers = [];
          if (data && data.papers && Array.isArray(data.papers)) {
            papers = data.papers;
          } else if (Array.isArray(data)) {
            papers = data;
          } else {
            console.error('Unexpected data format:', data);
            setSubmittedPapers([]);
            return;
          }
          
          const groupedPapers = {};
          papers.forEach(paper => {
            const key = `${paper.subject_code}_${paper.semester}`;
            if (!groupedPapers[key]) {
              groupedPapers[key] = {
                _id: key,
                subject_code: paper.subject_code,
                subject_name: paper.subject_name,
                semester: paper.semester,
                department: paper.department,
                createdAt: paper.approved_at || paper.createdAt,
                verified_by: paper.verified_by,
                questions: []
              };
            }
            groupedPapers[key].questions.push({
              question_number: paper.question_number,
              question_text: paper.question_text,
              marks: paper.marks,
              co: paper.co,
              level: paper.level,
              remarks: paper.remarks
            });
          });
          
          const result = Object.values(groupedPapers).sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
          );
          
          console.log('Grouped papers for Super Admin:', result.length);
          setSubmittedPapers(result);
        })
        .catch((err) => {
          console.error("Fetch submitted papers error:", err);
          setSubmittedError("Failed to load submitted papers");
          setSubmittedPapers([]);
        })
        .finally(() => setSubmittedLoading(false));
    }
  }, [activeTab, selectedDepartment, selectedSemester, API_BASE]);

  useEffect(() => {
    if (activeTab === "submitted" && showArchivedPapers) {
      setSubmittedLoading(true);
      setSubmittedError(null);
      
      const params = new URLSearchParams();
      if (selectedDepartment) params.append('department', selectedDepartment);
      if (selectedSemester) params.append('semester', selectedSemester);
      
      const token = localStorage.getItem('token');
      fetch(`${API_BASE}/papers/archived?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Status ${res.status}`);
          return res.json();
        })
        .then((data) => {
          console.log('Fetched archived papers:', data);
          let papers = [];
          if (data && data.papers && Array.isArray(data.papers)) {
            papers = data.papers;
          } else if (Array.isArray(data)) {
            papers = data;
          } else {
            console.error('Unexpected data format:', data);
            setArchivedPapers([]);
            return;
          }
          
          const groupedPapers = {};
          papers.forEach(paper => {
            const key = `${paper.subject_code}_${paper.semester}`;
            if (!groupedPapers[key]) {
              groupedPapers[key] = {
                _id: key,
                subject_code: paper.subject_code,
                subject_name: paper.subject_name,
                semester: paper.semester,
                department: paper.department,
                archived_at: paper.archived_at,
                archived_by: paper.archived_by,
                questions: []
              };
            }
            groupedPapers[key].questions.push({
              question_number: paper.question_number,
              question_text: paper.question_text,
              marks: paper.marks,
              co: paper.co,
              level: paper.level,
              remarks: paper.remarks
            });
          });
          
          const result = Object.values(groupedPapers).sort((a, b) => 
            new Date(b.archived_at) - new Date(a.archived_at)
          );
          
          console.log('Grouped archived papers:', result.length);
          setArchivedPapers(result);
        })
        .catch((err) => {
          console.error("Fetch archived papers error:", err);
          setSubmittedError("Failed to load archived papers");
          setArchivedPapers([]);
        })
        .finally(() => setSubmittedLoading(false));
    }
  }, [activeTab, showArchivedPapers, selectedDepartment, selectedSemester, API_BASE]);

  useEffect(() => {
    if (activeTab === "submitted") {
      const socketURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';
      console.log('Connecting to socket server at:', socketURL);
      const socket = io(socketURL);
      
      socket.on('paper_approved', (newPaper) => {
        console.log('Received real-time paper approval:', newPaper);
        setSubmittedPapers(prevPapers => {
          const exists = prevPapers.some(p => p._id === newPaper._id);
          if (!exists) {
            return [...prevPapers, newPaper];
          }
          return prevPapers;
        });
      });
      
      socket.on('connect', () => {
        console.log('Socket connected successfully');
      });
      
      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
      
      return () => {
        console.log('Disconnecting socket');
        socket.disconnect();
      };
    }
  }, [activeTab]);
  
  useEffect(() => {
    if (activeTab === "manageFaculty" && manageUsersView === "verifiers") {
      const token = localStorage.getItem('token');
      axios
        .get(`${API_BASE}/departments/active`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then((res) => {
          const rows = Array.isArray(res.data) ? res.data : [];
          setDepartments(rows);
          if (!newVerifierDept && rows.length > 0) {
            setNewVerifierDept(rows[0].name || rows[0].department || "");
          }
        })
        .catch((err) => {
          console.error("Fetch departments error:", err);
          setDepartments([]);
        });
    }
  }, [activeTab, manageUsersView, API_BASE, newVerifierDept]);

  const refreshVerifiers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/verifier/all/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/verifier/register`, {
        verifierName: name || undefined,
        department: dept,
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
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
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/verifier/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await refreshVerifiers();
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to delete verifier";
      setSubmitMsg(msg);
    }
  };

  return (
    <div className="dashboard-container">
      <div
        className="sidebar"
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
          color: '#f8fafc'
        }}
      >
        <h2 style={{ color: '#f8fafc', letterSpacing: '0.5px' }}>Super Admin</h2>
        <a
          href="#"
          className={activeTab === "dashboard" ? "active-tab" : ""}
          onClick={(e) => { e.preventDefault(); setActiveTab("dashboard"); }}
          style={sidebarLinkStyle(activeTab === "dashboard")}
        >
          🏠 Dashboard
        </a>
        <div className="sidebar-dropdown">
          <a
            href="#"
            className={activeTab === "manageFaculty" ? "active-tab" : ""}
            onClick={(e) => {
              e.preventDefault();
              toggleDropdown('manageUsers');
            }}
            style={{
              ...sidebarLinkStyle(activeTab === "manageFaculty" || activeTab === "mbaManageUsers"),
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#ffffff'
            }}
          >
            <span style={{ color: '#ffffff' }}>👥 Manage Users</span>
            {renderCaret(openDropdowns.manageUsers)}
          </a>
          {openDropdowns.manageUsers && (
            <div className="dropdown-menu">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab("manageFaculty");
                  setManageUsersView("cards");
                }}
                style={{ color: '#ffffff', fontWeight: 600 }}
              >
                B.Tech/M.Tech
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab("mbaManageUsers");
                  setManageUsersView("cards");
                }}
                style={{ color: '#ffffff', fontWeight: 600 }}
              >
                MBA
              </a>
            </div>
          )}
        </div>
        
        <div className="sidebar-dropdown">
          <a
            href="#"
            className={activeTab === "departments" ? "active-tab" : ""}
            onClick={(e) => {
              e.preventDefault();
              toggleDropdown('departments');
            }}
            style={{
              ...sidebarLinkStyle(activeTab === "departments" || activeTab === "mbaDepartments"),
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span style={{ color: '#ffffff' }}>🏢 Departments</span>
            {renderCaret(openDropdowns.departments)}
          </a>
          {openDropdowns.departments && (
            <div className="dropdown-menu">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab("departments");
                }}
                style={{ color: '#ffffff', fontWeight: 600 }}
              >
                B.Tech/M.Tech
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab("mbaDepartments");
                }}
                style={{ color: '#ffffff', fontWeight: 600 }}
              >
                MBA
              </a>
            </div>
          )}
        </div>
        
        <div className="sidebar-dropdown">
          <a
            href="#"
            className={activeTab === "subjects" ? "active-tab" : ""}
            onClick={(e) => {
              e.preventDefault();
              toggleDropdown('subjects');
            }}
            style={{
              ...sidebarLinkStyle(activeTab === "subjects" || activeTab === "mbaSubjects"),
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span style={{ color: '#ffffff' }}>📚 Subjects</span>
            {renderCaret(openDropdowns.subjects)}
          </a>
          {openDropdowns.subjects && (
            <div className="dropdown-menu">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab("subjects");
                }}
                style={{ color: '#ffffff', fontWeight: 600 }}
              >
                B.Tech/M.Tech
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab("mbaSubjects");
                }}
                style={{ color: '#ffffff', fontWeight: 600 }}
              >
                MBA
              </a>
            </div>
          )}
        </div>
        
        <div className="sidebar-dropdown">
          <a
            href="#"
            className={activeTab === "manageUsers" ? "active-tab" : ""}
            onClick={(e) => {
              e.preventDefault();
              toggleDropdown('qpSetters');
            }}
            style={{
              ...sidebarLinkStyle(activeTab === "manageUsers" || activeTab === "mbaQPSetters"),
              display: 'flex',
              justifyContent: 'space-between',
              color: '#ffffff',
              alignItems: 'center'
            }}
          >
            <span style={{ color: '#ffffff' }}>👩‍🏫 Select QP Setters</span>
            {renderCaret(openDropdowns.qpSetters)}
          </a>
          {openDropdowns.qpSetters && (
            <div className="dropdown-menu">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab("manageUsers");
                }}
                style={{ color: '#ffffff', fontWeight: 600 }}
              >
                B.Tech/M.Tech
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab("mbaQPSetters");
                }}
                style={{ color: '#ffffff', fontWeight: 600 }}
              >
                MBA
              </a>
            </div>
          )}
        </div>
        
        <div className="sidebar-dropdown">
          <a
            href="#"
            className={activeTab === "viewAssignees" ? "active-tab" : ""}
            onClick={(e) => {
              e.preventDefault();
              toggleDropdown('viewAssignees');
            }}
            style={{
              ...sidebarLinkStyle(activeTab === "viewAssignees" || activeTab === "mbaViewAssignees"),
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#ffffff !important'
            }}
          >
            <span style={{ color: '#ffffff' }}>📋 View Assignees</span>
            {renderCaret(openDropdowns.viewAssignees)}
          </a>
          {openDropdowns.viewAssignees && (
            <div className="dropdown-menu">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab("viewAssignees");
                }}
                style={{ color: '#ffffff', fontWeight: 600 }}
              >
                B.Tech/M.Tech
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab("mbaViewAssignees");
                }}
                style={{ color: '#ffffff', fontWeight: 600 }}
              >
                MBA
              </a>
            </div>
          )}
        </div>
        
        <div className="sidebar-dropdown">
          <a
            href="#"
            className={activeTab === "submitted" ? "active-tab" : ""}
            onClick={(e) => {
              e.preventDefault();
              toggleDropdown('submittedPapers');
            }}
            style={{
              ...sidebarLinkStyle(activeTab === "submitted" || activeTab === "mbaSubmittedPapers"),
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span style={{ color: '#ffffff' }}>📄 Submitted Papers</span>
            {renderCaret(openDropdowns.submittedPapers)}
          </a>
          {openDropdowns.submittedPapers && (
            <div className="dropdown-menu">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab("submitted");
                }}
                style={{ color: '#ffffff', fontWeight: 600 }}
              >
                B.Tech/M.Tech
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab("mbaSubmittedPapers");
                }}
                style={{ color: '#ffffff', fontWeight: 600,opacity: 0.6, cursor: 'not-allowed' }}
                // style={{ opacity: 0.6, cursor: 'not-allowed' }}
              >
                MBA (Coming Soon)
              </a>
            </div>
          )}
        </div>
        <a
          href="#"
          className={activeTab === "settings" ? "active-tab" : ""}
          onClick={(e) => { e.preventDefault(); setActiveTab("settings"); }}
        >
          ⚙️ Settings
        </a>
        <a href="#" onClick={(e) => { e.preventDefault(); handleLogoutClick(); }} style={{ color: "red" }}>
          🚪 Logout
        </a>
      </div>

      <div className="dashboard-content">
        {activeTab === "dashboard" && (
          <>
            <div
              style={{
                background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                border: '1px solid #c7d2fe',
                borderRadius: '20px',
                padding: '28px',
                marginBottom: '24px',
                boxShadow: '0 12px 30px rgba(79,70,229,0.15)'
              }}
            >
              <p style={{ margin: 0, color: '#6366f1', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Welcome, Super Admin
              </p>
              <h1 style={{ margin: '12px 0', fontSize: '32px', color: '#0f172a' }}>
                Super Admin Control Center
              </h1>
              <p style={{ margin: 0, color: '#475569', maxWidth: '720px' }}>
                Quickly check recent activities, manage users, and audit submissions in real time.
                Everything you need to orchestrate the examination workflow lives here.
              </p>
            </div>
            <SessionManagement />
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

        {/* SUBMITTED PAPERS TAB */}
        {activeTab === "submitted" && (
          <div>

            <h1>Submitted Papers</h1>
            {openedPaper && (
              <div style={{ marginBottom: '20px', padding: '16px', border: '1px solid #e1e7ef', borderRadius: '10px', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Paper: {openedPaper.subject_name} ({openedPaper.subject_code}) - Sem {openedPaper.semester}</h3>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={async () => {
                        try {
                          // Download DOCX file
                          const response = await fetch(`${API_BASE}/verifier/papers/${encodeURIComponent(openedPaper.subject_code)}/${encodeURIComponent(openedPaper.semester)}/docx`);
                          if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                          }
                          
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${openedPaper.subject_code}_${openedPaper.semester}.docx`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                          
                          alert('Question paper downloaded successfully!');
                        } catch (err) {
                          console.error('Download error:', err);
                          alert(`Failed to download paper: ${err.message}`);
                        }
                      }}
                      style={{ padding: '6px 12px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      📄 Download DOCX
                    </button>
                    <button onClick={() => setOpenedPaper(null)} style={{ padding: '6px 12px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                  {openedPaper.questions.map((q, idx) => (
                    <div key={idx} style={{ border: '1px solid #e9edf3', borderRadius: '10px', marginBottom: '12px', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', gap: '12px', padding: '12px', background: '#f8f9fa' }}>
                        <div style={{ color: '#ffffff', minWidth: '44px', fontWeight: 800, backgroundColor: '#0d6efd', borderRadius: '999px', textAlign: 'center', padding: '4px 0' }}>{q.question_number}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{q.question_text}</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: '#fff', fontWeight: 800, minWidth: '44px', textAlign: 'center', backgroundColor: '#6f42c1', borderRadius: '999px', padding: '4px 10px' }}>CO</span>
                              <span>{q.co || ''}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: '#fff', fontWeight: 800, minWidth: '44px', textAlign: 'center', backgroundColor: '#fd7e14', borderRadius: '999px', padding: '4px 10px' }}>L</span>
                              <span>{q.l || ''}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: '#084298', fontWeight: 800 }}>Marks</span>
                              <span style={{ fontWeight: 800, color: '#0b5ed7' }}>{typeof q.marks === 'number' ? q.marks : 0}</span>
                            </div>
                          </div>
                          {q.file_url && (
                            <div style={{ 
                              marginTop: '15px',
                              padding: '15px',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '12px',
                              border: '2px solid #e9ecef'
                            }}>
                              <div style={{ 
                                fontSize: '14px', 
                                fontWeight: '600', 
                                color: '#495057', 
                                marginBottom: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                🖼️ Diagram/Image Attachment
                              </div>
                              <img 
                                src={`${API_BASE}${q.file_url}`} 
                                alt={q.file_name || 'diagram attachment'} 
                                style={{ 
                                  maxWidth: '100%', 
                                  height: 'auto',
                                  borderRadius: '8px', 
                                  border: '1px solid #dee2e6',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                  cursor: 'pointer',
                                  transition: 'transform 0.2s ease'
                                }}
                                onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                onClick={() => {
                                  window.open(`${API_BASE}${q.file_url}`, '_blank');
                                }}
                              />
                              <div style={{ 
                                fontSize: '11px', 
                                color: '#6c757d', 
                                marginTop: '8px',
                                textAlign: 'center'
                              }}>
                                Click to view full size
                              </div>
                            </div>
                          )}
                          {/* Verifier Remarks Display */}
                          {q.remarks && q.remarks.trim() && (
                            <div style={{ 
                              marginTop: '10px', 
                              padding: '10px', 
                              backgroundColor: '#fff3cd', 
                              border: '1px solid #ffeaa7', 
                              borderRadius: '6px',
                              borderLeft: '4px solid #ffc107'
                            }}>
                              <div style={{ fontWeight: 600, color: '#856404', marginBottom: '5px' }}>📝 Verifier Remarks:</div>
                              <div style={{ color: '#856404', fontStyle: 'italic' }}>{q.remarks}</div>
                            </div>
                          )}
                          
                          {/* Verifier General Remarks Display */}
                          {openedPaper.verifier_remarks && openedPaper.verifier_remarks.trim() && (
                            <div style={{ 
                              marginTop: '10px', 
                              padding: '10px', 
                              backgroundColor: '#e7f3ff', 
                              border: '1px solid #b3d9ff', 
                              borderRadius: '6px',
                              borderLeft: '4px solid #0d6efd'
                            }}>
                              <div style={{ fontWeight: 600, color: '#0b5ed7', marginBottom: '5px' }}>📋 Verifier General Remarks:</div>
                              <div style={{ color: '#0b5ed7', fontStyle: 'italic' }}>{openedPaper.verifier_remarks}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h1 style={{ margin: 0 }}>Submitted Papers</h1>
                <p style={{ margin: '6px 0 0 0', color: '#64748b' }}>View and manage approved question papers</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowArchivedPapers(!showArchivedPapers)}
                  style={{
                    background: showArchivedPapers ? '#4f46e5' : '#eef2ff',
                    color: showArchivedPapers ? 'white' : '#4f46e5',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {showArchivedPapers ? 'Show Active' : 'Show Archived'}
                </button>
              </div>
            </div>

            {/* Filters */}
            <div style={{ 
              background: 'white', 
              border: '1px solid #e2e8f0', 
              borderRadius: '12px', 
              padding: '16px', 
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>Department</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px'
                  }}
                >
                  <option value="">All Departments</option>
                  {departments.map((dept, idx) => (
                    <option key={idx} value={typeof dept === 'string' ? dept : (dept.name || dept.department)}>
                      {typeof dept === 'string' ? dept : (dept.name || dept.department)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '14px' }}>Semester</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px'
                  }}
                >
                  <option value="">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <option key={sem} value={sem}>Semester {sem}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Loading State */}
            {submittedLoading && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>Loading papers...</p>
              </div>
            )}

            {/* Error State */}
            {submittedError && (
              <div style={{ 
                background: '#fef2f2', 
                border: '1px solid #fecaca', 
                borderRadius: '8px', 
                padding: '16px', 
                marginBottom: '20px',
                color: '#dc2626'
              }}>
                {submittedError}
              </div>
            )}

            {/* Papers List */}
            {!submittedLoading && !submittedError && (
              <div>
                {showArchivedPapers ? (
                  <div>
                    <h2 style={{ marginBottom: '16px' }}>Archived Papers</h2>
                    {archivedPapers.length === 0 ? (
                      <div style={{ 
                        background: 'white', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '12px', 
                        padding: '40px', 
                        textAlign: 'center',
                        color: '#64748b'
                      }}>
                        No archived papers found
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '16px' }}>
                        {archivedPapers.map((paper) => (
                          <div
                            key={paper._id}
                            style={{
                              background: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '12px',
                              padding: '20px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = 'none';
                              e.currentTarget.style.transform = 'none';
                            }}
                            onClick={() => setOpenedPaper(openedPaper?._id === paper._id ? null : paper)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                              <div>
                                <h3 style={{ margin: '0 0 8px 0', color: '#1e40af' }}>
                                  {paper.subject_name} ({paper.subject_code})
                                </h3>
                                <p style={{ margin: '4px 0', color: '#64748b', fontSize: '14px' }}>
                                  Department: {paper.department} | Semester: {paper.semester}
                                </p>
                                <p style={{ margin: '4px 0', color: '#64748b', fontSize: '12px' }}>
                                  Archived: {paper.archived_at ? new Date(paper.archived_at).toLocaleString() : 'N/A'}
                                </p>
                              </div>
<<<<<
                              {q.file_url && (
                                <div style={{ 
                                  marginTop: '15px', 
                                  marginLeft: '46px',
                                  padding: '15px',
                                  backgroundColor: '#f8f9fa',
                                  borderRadius: '12px',
                                  border: '2px solid #e9ecef'
                                }}>
                                  <div style={{ 
                                    fontSize: '14px', 
                                    fontWeight: '600', 
                                    color: '#495057', 
                                    marginBottom: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}>
                                    🖼️ Diagram/Image Attachment
                                  </div>
                                  <img 
                                    src={`${API_BASE}${q.file_url}`} 
                                    alt={q.file_name || 'diagram attachment'} 
                                    style={{ 
                                      maxWidth: '100%', 
                                      height: 'auto',
                                      borderRadius: '8px', 
                                      border: '1px solid #dee2e6',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                      cursor: 'pointer',
                                      transition: 'transform 0.2s ease'
                                    }}
                                    onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                    onClick={() => {
                                      window.open(`${API_BASE}${q.file_url}`, '_blank');
                                    }}
                                  />
                                  <div style={{ 
                                    fontSize: '11px', 
                                    color: '#6c757d', 
                                    marginTop: '8px',
                                    textAlign: 'center'
                                  }}>
                                    Click to view full size
                                  </div>
                                </div>
                              )}

                              <span style={{
                                background: '#f3f4f6',
                                color: '#6b7280',
                                padding: '4px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600
                              }}>
                                ARCHIVED
                              </span>

                            </div>
                            {openedPaper?._id === paper._id && (
                              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                                <h4 style={{ marginBottom: '12px' }}>Questions ({paper.questions?.length || 0})</h4>
                                {paper.questions?.map((q, idx) => (
                                  <div key={idx} style={{ marginBottom: '12px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                                      Q{q.question_number}: {q.question_text}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                                      Marks: {q.marks} | CO: {q.co} | Level: {q.level}
                                      {q.remarks && <span> | Remarks: {q.remarks}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {q.file_url && (
                                <div style={{ 
                                  marginTop: '15px', 
                                  marginLeft: '46px',
                                  padding: '15px',
                                  backgroundColor: '#f8f9fa',
                                  borderRadius: '12px',
                                  border: '2px solid #e9ecef'
                                }}>
                                  <div style={{ 
                                    fontSize: '14px', 
                                    fontWeight: '600', 
                                    color: '#495057', 
                                    marginBottom: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}>
                                    🖼️ Diagram/Image Attachment
                                  </div>
                                  <img 
                                    src={`${API_BASE}${q.file_url}`} 
                                    alt={q.file_name || 'diagram attachment'} 
                                    style={{ 
                                      maxWidth: '100%', 
                                      height: 'auto',
                                      borderRadius: '8px', 
                                      border: '1px solid #dee2e6',
                                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                      cursor: 'pointer',
                                      transition: 'transform 0.2s ease'
                                    }}
                                    onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                                    onClick={() => {
                                      window.open(`${API_BASE}${q.file_url}`, '_blank');
                                    }}
                                  />
                                  <div style={{ 
                                    fontSize: '11px', 
                                    color: '#6c757d', 
                                    marginTop: '8px',
                                    textAlign: 'center'
                                  }}>
                                    Click to view full size
                                  </div>
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
              <>
                {/* Filter Section */}
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                  <h3 style={{ marginBottom: '10px', color: '#495057' }}>Filter Papers</h3>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#495057' }}>
                        Department:
                      </label>
                      <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                          fontSize: '14px',
                          minWidth: '150px'
                        }}
                      >
                        <option value="">All Departments</option>
                        {departments.map((dept) => (
                          <option key={dept._id || dept.name} value={dept.name}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#495057' }}>
                        Semester:
                      </label>
                      <select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                          fontSize: '14px',
                          minWidth: '150px'
                        }}
                      >
                        <option value="">All Semesters</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                          <option key={sem} value={sem}>
                            {sem}th Semester
                          </option>

                            )}
                          </div>

                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <h2 style={{ marginBottom: '16px' }}>Approved Papers</h2>
                    {submittedPapers.length === 0 ? (
                      <div style={{ 
                        background: 'white', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '12px', 
                        padding: '40px', 
                        textAlign: 'center',
                        color: '#64748b'
                      }}>
                        No approved papers found
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '16px' }}>
                        {submittedPapers.map((paper) => (
                          <div
                            key={paper._id}
                            style={{
                              background: 'white',
                              border: '1px solid #e2e8f0',
                              borderRadius: '12px',
                              padding: '20px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = 'none';
                              e.currentTarget.style.transform = 'none';
                            }}
                            onClick={() => setOpenedPaper(openedPaper?._id === paper._id ? null : paper)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                              <div>
                                <h3 style={{ margin: '0 0 8px 0', color: '#1e40af' }}>
                                  {paper.subject_name} ({paper.subject_code})
                                </h3>
                                <p style={{ margin: '4px 0', color: '#64748b', fontSize: '14px' }}>
                                  Department: {paper.department} | Semester: {paper.semester}
                                </p>
                                <p style={{ margin: '4px 0', color: '#64748b', fontSize: '12px' }}>
                                  Approved: {paper.createdAt ? new Date(paper.createdAt).toLocaleString() : 'N/A'}
                                  {paper.verified_by && <span> | Verified by: {paper.verified_by}</span>}
                                </p>
                              </div>
                              <span style={{
                                background: '#dcfce7',
                                color: '#166534',
                                padding: '4px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600
                              }}>
                                APPROVED
                              </span>
                            </div>
                            {openedPaper?._id === paper._id && (
                              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                                <h4 style={{ marginBottom: '12px' }}>Questions ({paper.questions?.length || 0})</h4>
                                {paper.questions?.map((q, idx) => (
                                  <div key={idx} style={{ marginBottom: '12px', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                                      Q{q.question_number}: {q.question_text}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                                      Marks: {q.marks} | CO: {q.co} | Level: {q.level}
                                      {q.remarks && <span> | Remarks: {q.remarks}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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

        {/* MBA Manage Users */}
        {activeTab === "mbaManageUsers" && (
          <>
            {manageUsersView === "cards" && (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div>
                    <h1 style={{ margin: 0 }}>Manage MBA Users</h1>
                    <p style={{ margin: '6px 0 0 0', color: '#64748b' }}>Quickly navigate to manage MBA Faculty and Verifiers</p>
                  </div>
                  {!usersLoading && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ background: '#eef2ff', color: '#4f46e5', padding: '6px 10px', borderRadius: '9999px', fontWeight: 600 }}>
                        MBA Faculty:&nbsp;{facultyCount}
                      </span>
                      <span style={{ background: '#ecfeff', color: '#0891b2', padding: '6px 10px', borderRadius: '9999px', fontWeight: 600 }}>
                        MBA Verifiers: {verifierCount}
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
                        MBA Faculty
                      </div>
                      <span style={{ background: '#4f46e5', color: 'white', padding: '6px 12px', borderRadius: 10, fontSize: 13, fontWeight: 800 }}>
                        {usersLoading ? '…' : `${facultyCount}`}
                      </span>
                    </div>
                    <p style={{ margin: '12px 0 18px 0', color: '#475569', lineHeight: 1.5, wordBreak: 'break-word' }}>Manage internal and external MBA faculty users</p>
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
                      Manage MBA Faculty
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
                        MBA Verifiers
                      </div>
                      <span style={{ background: '#0891b2', color: 'white', padding: '6px 12px', borderRadius: 10, fontSize: 13, fontWeight: 800 }}>
                        {usersLoading ? '…' : `${verifierCount}`}
                      </span>
                    </div>
                    <p style={{ margin: '12px 0 18px 0', color: '#475569', lineHeight: 1.5, wordBreak: 'break-word' }}>Register and manage MBA department verifiers</p>
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
                      Manage MBA Verifiers
                    </button>
                  </div>
                </div>
              </>
            )}

            {manageUsersView === "faculty" && (
              <>
                <button className="back-btn" onClick={() => setManageUsersView("cards")}>
                  ← Back to Manage MBA Users
                </button>
                <MBAManageFacultyPage />
              </>
            )}

            {manageUsersView === "verifiers" && (
              <>
                <button className="back-btn" onClick={() => setManageUsersView("cards")}>
                  ← Back to Manage MBA Users
                </button>
                <MBAVerifierManagement />
              </>
            )}
          </>
        )}

        {activeTab === "mbaDepartments" && <MBADepartmentsPage />}

        {activeTab === "mbaSubjects" && <MBASubjectsPage />}

        {activeTab === "mbaQPSetters" && <MBAManageQPSetters />}

        {activeTab === "mbaViewAssignees" && <MBAViewAssignees />}

        {activeTab === "mbaSubmittedPapers" && (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h1>MBA Submitted Papers</h1>
            <p style={{ color: '#64748b', fontSize: '18px', marginTop: '20px' }}>
              This feature will be implemented soon.
            </p>
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