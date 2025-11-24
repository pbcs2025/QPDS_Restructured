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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isTemporaryVerifier, setIsTemporaryVerifier] = useState(false);
  const [temporaryVerifierExpiry, setTemporaryVerifierExpiry] = useState(null);
  const [verifierPapers, setVerifierPapers] = useState([]);
  const [verifierPapersLoading, setVerifierPapersLoading] = useState(true);
  const [selectedVerifierPaper, setSelectedVerifierPaper] = useState(null);
  const [verifierRemarks, setVerifierRemarks] = useState('');
  const [expiryInterval, setExpiryInterval] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);


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

  // Fetch verifier papers for temporary verifiers
  const fetchVerifierPapers = async () => {
    try {
      setVerifierPapersLoading(true);
      const response = await axios.get('http://localhost:5000/api/verifier/papers', {
        headers: {
          'verifier-data': localStorage.getItem('faculty_data')
        }
      });
      setVerifierPapers(response.data || []);
    } catch (error) {
      console.error('Error fetching verifier papers:', error);
      setVerifierPapers([]);
    } finally {
      setVerifierPapersLoading(false);
    }
  };

  // Refresh faculty data to check for temporary verifier status
  const refreshFacultyData = async () => {
    const username = localStorage.getItem("faculty_username");
    if (!username) return;

    try {
      // Remove the duplicate /api since REACT_APP_API_BASE_URL already includes it
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/faculty/fresh-data/${username}`);
      if (response.ok) {
        const freshData = await response.json();
        console.log('Refreshed faculty data:', freshData);

        // Update localStorage with fresh data
        localStorage.setItem("faculty_data", JSON.stringify(freshData));

        // Update state
        setFacultyData(freshData);
        const isTempVerifier = freshData.isTemporaryVerifier || (freshData.verifierExpiresAt && new Date(freshData.verifierExpiresAt) > new Date());
        setIsTemporaryVerifier(isTempVerifier);
        setTemporaryVerifierExpiry(freshData.verifierExpiresAt);

        // If this faculty became a temporary verifier, fetch verifier papers
        if (isTempVerifier && freshData.assignedSubjects && freshData.assignedSubjects.length > 0) {
          fetchVerifierPapers();
        }

        return freshData;
      }
    } catch (error) {
      console.error('Error refreshing faculty data:', error);
    }
    return null;
  };

  // Load faculty data on component mount
  useEffect(() => {
    const storedFacultyData = localStorage.getItem("faculty_data");
    if (storedFacultyData) {
      const data = JSON.parse(storedFacultyData);
      setFacultyData(data);

      // Check if this is a temporary verifier
      const isTempVerifier = data.isTemporaryVerifier || (data.verifierExpiresAt && new Date(data.verifierExpiresAt) > new Date());
      setIsTemporaryVerifier(isTempVerifier);
      setTemporaryVerifierExpiry(data.verifierExpiresAt);

      // Fetch assignments for this faculty member
      if (data.email) {
        fetchAssignments(data.email);
        // Always try to fetch verifier papers for potential temporary verifiers
        // The backend will handle filtering based on assigned subjects
        if (isTempVerifier || data.role === 'Verifier') {
          fetchVerifierPapers();
        }
      }

      // Refresh faculty data to check for any updates (like becoming a temporary verifier)
      refreshFacultyData();
    } else {
      // If no stored data, redirect to login
      navigate("/login/faculty");
    }
  }, [navigate]);

  // Auto-expiry check for temporary verifier
  useEffect(() => {
    if (temporaryVerifierExpiry && isTemporaryVerifier) {
      const checkExpiry = () => {
        const now = new Date();
        const expiry = new Date(temporaryVerifierExpiry);

        if (now >= expiry) {
          // Verifier role has expired
          console.log('Temporary verifier role has expired');
          setIsTemporaryVerifier(false);
          setTemporaryVerifierExpiry(null);

          // If currently on verifier tab, switch to dashboard
          if (activeTab === 'verifier') {
            setActiveTab('dashboard');
          }

          // Clear the interval
          if (expiryInterval) {
            clearInterval(expiryInterval);
            setExpiryInterval(null);
          }

          // Update localStorage to reflect expired status
          const storedData = localStorage.getItem("faculty_data");
          if (storedData) {
            const data = JSON.parse(storedData);
            data.isTemporaryVerifier = false;
            data.verifierExpiresAt = null;
            localStorage.setItem("faculty_data", JSON.stringify(data));
          }

          // Show expiry notification (optional)
          alert('Your temporary verifier access has expired.');
        } else {
          // Update time remaining
          const remainingMs = expiry - now;
          const remainingHours = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60)));
          setTimeRemaining(remainingHours);
        }
      };

      // Check immediately
      checkExpiry();

      // Set up interval to check every minute
      const interval = setInterval(checkExpiry, 60000);
      setExpiryInterval(interval);

      // Cleanup function
      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [temporaryVerifierExpiry, isTemporaryVerifier, activeTab, expiryInterval]);

  // Cleanup interval on component unmount
  useEffect(() => {
    return () => {
      if (expiryInterval) {
        clearInterval(expiryInterval);
      }
    };
  }, [expiryInterval]);

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
        {isTemporaryVerifier && (
          <button
            type="button"
            className={`sidebar-btn ${activeTab === 'verifier' ? 'active-tab' : ''}`}
            onClick={async () => {
              setActiveTab('verifier');
              // Refresh faculty data and fetch verifier papers when switching to verifier tab
              await fetchVerifierPapers(true);
            }}
          >
            ✅ Verifier (8h)
          </button>
        )}
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

            {/* Show temporary verifier info if applicable */}
            {isTemporaryVerifier && (
              <div className="verifier-info" style={{
                background: '#e8f4fd',
                border: '1px solid #3498db',
                borderRadius: '8px',
                padding: '15px',
                marginTop: '20px'
              }}>
                <h3 style={{ color: '#2c5aa0', margin: '0 0 10px 0' }}>✅ Temporary Verifier Access</h3>
                <p style={{ margin: '5px 0', color: '#2c5aa0' }}>
                  <strong>Status:</strong> Active for the next 8 hours
                </p>
                <p style={{ margin: '5px 0', color: '#2c5aa0' }}>
                  <strong>Expires:</strong> {temporaryVerifierExpiry ? new Date(temporaryVerifierExpiry).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A'}
                </p>
                <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#2c5aa0' }}>
                  You can review and verify question papers sent by the main verifier using the "Verifier" tab.
                </p>
              </div>
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
                        <th>Action</th>
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
                          <td>
                            {assignment.status !== 'Submitted' && (
                              <Link 
                                to="/question-paper-builder" 
                                state={{ 
                                  subjectCode: assignment.subject_code,
                                  subjectName: assignment.subject_name 
                                }}
                                className="btn btn-primary btn-sm"
                              >
                                📝 Create Paper
                              </Link>
                            )}
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

        {activeTab === 'verifier' && (
          <>
            <h1>✅ Temporary Verifier Dashboard</h1>
            <div style={{
              background: '#e8f4fd',
              border: '1px solid #3498db',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: '#2c5aa0', margin: '0 0 10px 0' }}>⏰ Temporary Verifier Access Active</h3>
              <p style={{ margin: '5px 0', color: '#2c5aa0' }}>
                <strong>Time Remaining:</strong> {timeRemaining !== null ? timeRemaining + ' hours' : 'N/A'}
              </p>
              <p style={{ margin: '5px 0', color: '#2c5aa0' }}>
                <strong>Expires:</strong> {temporaryVerifierExpiry ? new Date(temporaryVerifierExpiry).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'N/A'}
              </p>
              <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#2c5aa0' }}>
                You can review and verify the question papers assigned to you by the main verifier.
              </p>
            </div>

            {verifierPapersLoading ? (
              <p>Loading verifier papers...</p>
            ) : verifierPapers.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#666',
                background: '#f8f9fa',
                borderRadius: '8px',
                marginTop: '20px'
              }}>
                <p>📭 No question papers assigned for verification yet.</p>
                <p>The main verifier will assign papers to you for review.</p>
              </div>
            ) : selectedVerifierPaper ? (
              // Show selected paper details for review
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2>Review Paper: {selectedVerifierPaper.subject_name} ({selectedVerifierPaper.subject_code})</h2>
                  <button
                    onClick={() => setSelectedVerifierPaper(null)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    ← Back to List
                  </button>
                </div>

                {/* Paper Header */}
                <div style={{
                  background: '#fff',
                  padding: '20px',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  border: '1px solid #dee2e6',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <p style={{ margin: '5px 0', fontSize: '16px' }}>
                    <strong>Subject:</strong> {selectedVerifierPaper.subject_name} ({selectedVerifierPaper.subject_code})
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '16px' }}>
                    <strong>Semester:</strong> {selectedVerifierPaper.semester}th Semester B.E.
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '16px' }}>
                    <strong>Status:</strong>
                    <span style={{
                      color: selectedVerifierPaper.status === 'approved' ? 'green' :
                             selectedVerifierPaper.status === 'rejected' ? 'red' : 'orange',
                      fontWeight: 'bold',
                      marginLeft: '5px'
                    }}>
                      {selectedVerifierPaper.status.toUpperCase()}
                    </span>
                  </p>
                </div>

                {/* Questions Display */}
                <div style={{
                  background: '#fff',
                  padding: '20px',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  border: '1px solid rgb(230, 222, 227)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <h4 style={{ marginBottom: '15px', color: '#0b5ed7', borderBottom: '2px solid #0d6efd', paddingBottom: '5px' }}>
                    Questions
                  </h4>
                  {(selectedVerifierPaper.questions || []).map((question, index) => (
                    <div key={question._id || index} style={{
                      border: '1px solid #b6d4fe',
                      borderRadius: '12px',
                      marginBottom: '18px',
                      overflow: 'hidden',
                      background: 'linear-gradient(180deg, #f7fbff 0%, #ffffff 40%)',
                      boxShadow: '0 4px 10px rgba(13,110,253,0.06)'
                    }}>
                      {/* Question text row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px 18px', background: 'linear-gradient(90deg, #e7f1ff, #f1f8ff)' }}>
                        <div style={{ color: '#ffffff', minWidth: '44px', fontWeight: 800, backgroundColor: '#0d6efd', borderRadius: '999px', textAlign: 'center', padding: '4px 0' }}>{question.question_number}</div>
                        <div style={{ flex: 1, color: '#1b2a41', fontWeight: 600 }}>
                          <textarea
                            value={question.question_text || ''}
                            readOnly
                            style={{ width: '100%', minHeight: '70px', padding: '10px 12px', border: '1px solid #b6d4fe', borderRadius: '10px', backgroundColor: '#f4f9ff', fontSize: '14px', resize: 'vertical', color: '#1b2a41' }}
                          />
                          {question.file_name && (
                            <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '6px' }}>📎 {question.file_name}</div>
                          )}
                          {question.file_url && (
                            <div style={{ marginTop: '10px' }}>
                              <img
                                src={`${process.env.REACT_APP_API_BASE_URL}${question.file_url}`}
                                alt={question.file_name || 'attachment'}
                                style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #e9edf3' }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      {/* CO / L / Marks row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', padding: '14px 18px', borderTop: '1px solid #e9edf3', backgroundColor: '#ffffff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#fff', fontWeight: 800, minWidth: '44px', textAlign: 'center', backgroundColor: '#6f42c1', borderRadius: '999px', padding: '4px 10px' }}>CO</span>
                          <input
                            value={question.co || ''}
                            readOnly
                            style={{ flex: 1, padding: '10px 12px', border: '1px solid #e1ccff', borderRadius: '8px', background: '#faf5ff', color: '#3b2c52' }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#fff', fontWeight: 800, minWidth: '44px', textAlign: 'center', backgroundColor: '#fd7e14', borderRadius: '999px', padding: '4px 10px' }}>L</span>
                          <input
                            value={question.l || ''}
                            readOnly
                            style={{ flex: 1, padding: '10px 12px', border: '1px solid #ffd6b0', borderRadius: '8px', background: '#fff7ef', color: '#5a3410' }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#084298', fontWeight: 800 }}>Marks</span>
                          <input
                            type="number"
                            value={typeof question.marks === 'number' ? question.marks : 0}
                            readOnly
                            style={{ flex: 1, padding: '10px 12px', border: '1px solid #b6d4fe', borderRadius: '8px', background: '#e7f1ff', textAlign: 'center', fontWeight: 800, color: '#0b5ed7' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Verifier Remarks */}
                <div style={{
                  background: '#fff',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #dee2e6',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ marginBottom: '15px', color: '#0b5ed7', borderBottom: '2px solid #0d6efd', paddingBottom: '5px' }}>VERIFIER REMARKS</h4>
                  <textarea
                    value={verifierRemarks || ''}
                    onChange={(e) => setVerifierRemarks(e.target.value)}
                    placeholder="Enter your remarks about this paper..."
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '12px',
                      border: '1px solid #ced4da',
                      borderRadius: '8px',
                      fontSize: '14px',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Approval Actions */}
                <div style={{
                  background: '#fff',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid #dee2e6',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ marginBottom: '15px', color: '#0b5ed7', borderBottom: '2px solid #0d6efd', paddingBottom: '5px' }}>
                    Final Decision
                  </h4>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={async () => {
                        try {
                          const verifierInfo = JSON.parse(localStorage.getItem('faculty_data') || '{}');
                          const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/verifier/papers/${selectedVerifierPaper.subject_code}/${selectedVerifierPaper.semester}/approve-corrected`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              corrected_questions: selectedVerifierPaper.questions,
                              verifier_remarks: verifierRemarks || 'Approved by temporary verifier',
                              verified_by: verifierInfo.name || 'Temporary Verifier'
                            }),
                          });

                          if (!response.ok) {
                            throw new Error('Failed to approve paper');
                          }

                          alert('Paper approved successfully!');
                          setSelectedVerifierPaper(null);
                          setVerifierRemarks('');
                          // Refresh the papers list
                          await fetchVerifierPapers();
                        } catch (error) {
                          console.error('Error approving paper:', error);
                          alert('Failed to approve paper. Please try again.');
                        }
                      }}
                      style={{
                        padding: '12px 30px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}
                    >
                      ✅ Approve Paper
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const verifierInfo = JSON.parse(localStorage.getItem('faculty_data') || '{}');
                          const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/verifier/papers/${selectedVerifierPaper.subject_code}/${selectedVerifierPaper.semester}/reject`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              remarks: verifierRemarks || 'Rejected by temporary verifier',
                              verified_by: verifierInfo.name || 'Temporary Verifier'
                            }),
                          });

                          if (!response.ok) {
                            throw new Error('Failed to reject paper');
                          }

                          alert('Paper rejected and moved to rejected papers!');
                          setSelectedVerifierPaper(null);
                          setVerifierRemarks('');
                          // Refresh the papers list
                          await fetchVerifierPapers();
                        } catch (error) {
                          console.error('Error rejecting paper:', error);
                          alert('Failed to reject paper. Please try again.');
                        }
                      }}
                      style={{
                        padding: '12px 30px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold'
                      }}
                    >
                      ❌ Reject Paper
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '15px' }}>
                  <h3 style={{ color: '#495057', margin: '0' }}>
                    📋 Question Papers for Verification
                  </h3>
                  <p style={{ color: '#666', fontSize: '14px' }}>
                    Review and verify the papers assigned to you
                  </p>
                </div>

                <table style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  border: '1px solid #e1e7ef',
                  borderRadius: '10px',
                  overflow: 'hidden'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#eef2f7' }}>
                      <th style={{
                        padding: '14px 12px',
                        textAlign: 'left',
                        color: '#5b6777',
                        fontWeight: 700,
                        letterSpacing: '0.3px',
                        borderRight: '1px solid #e1e7ef'
                      }}>Subject</th>
                      <th style={{
                        padding: '14px 12px',
                        textAlign: 'left',
                        color: '#5b6777',
                        fontWeight: 700,
                        letterSpacing: '0.3px',
                        borderRight: '1px solid #e1e7ef'
                      }}>Code</th>
                      <th style={{
                        padding: '14px 12px',
                        textAlign: 'center',
                        color: '#5b6777',
                        fontWeight: 700,
                        letterSpacing: '0.3px',
                        borderRight: '1px solid #e1e7ef'
                      }}>Semester</th>
                      <th style={{
                        padding: '14px 12px',
                        textAlign: 'center',
                        color: '#5b6777',
                        fontWeight: 700,
                        letterSpacing: '0.3px',
                        borderRight: '1px solid #e1e7ef'
                      }}>Questions</th>
                      <th style={{
                        padding: '14px 12px',
                        textAlign: 'center',
                        color: '#5b6777',
                        fontWeight: 700,
                        letterSpacing: '0.3px'
                      }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(verifierPapers || []).map((paper, index) => (
                      <tr key={paper._id || index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                        <td style={{
                          padding: '14px 12px',
                          borderTop: '1px solid #e1e7ef',
                          borderRight: '1px solid #e1e7ef',
                          fontWeight: 600,
                          color: '#000000'
                        }}>
                          {paper.subject_name}
                        </td>
                        <td style={{
                          padding: '14px 12px',
                          borderTop: '1px solid #e1e7ef',
                          borderRight: '1px solid #e1e7ef',
                          color: '#000000'
                        }}>
                          {paper.subject_code}
                        </td>
                        <td style={{
                          padding: '14px 12px',
                          textAlign: 'center',
                          borderTop: '1px solid #e1e7ef',
                          borderRight: '1px solid #e1e7ef',
                          color: '#000000'
                        }}>
                          {paper.semester}
                        </td>
                        <td style={{
                          padding: '14px 12px',
                          textAlign: 'center',
                          borderTop: '1px solid #e1e7ef',
                          borderRight: '1px solid #e1e7ef',
                          color: '#000000'
                        }}>
                          {paper.questions ? paper.questions.length : 0}
                        </td>
                        <td style={{
                          padding: '14px 12px',
                          textAlign: 'center',
                          borderTop: '1px solid #e1e7ef'
                        }}>
                          <button
                            onClick={() => setSelectedVerifierPaper(paper)}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}
                          >
                            Review Paper
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
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
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="toggle-eye">
                  {showConfirmPassword ? "🙈" : "👁️"}
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
