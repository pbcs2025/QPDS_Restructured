//ManageUsers.js
import React, { useEffect, useState, useRef } from "react";
import "../../common/dashboard.css";
import "./manageUsersMessage.css";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function ManageUsers({ userType , userpage }) {
  const [internalFaculties, setInternalFaculties] = useState([]);
  const [otherFaculties, setOtherFaculties] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subjectCodes, setSubjectCodes] = useState([]);
  const [subjectCode, setSubjectCode] = useState("");
  const [submitDate, setSubmitDate] = useState("");
  const [lastSubmittedSubjectCode, setLastSubmittedSubjectCode] = useState("");
  const [lastSubmittedDate, setLastSubmittedDate] = useState("");
  const [statusMessage, setStatusMessage] = useState(null);
  const [selectedGrouped, setSelectedGrouped] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [recentAssignments, setRecentAssignments] = useState([]);
  const statusRef = useRef(null);

  // Semester options
  const semesters = [
    { value: "1", label: "Semester 1" },
    { value: "2", label: "Semester 2" },
    { value: "3", label: "Semester 3" },
    { value: "4", label: "Semester 4" },
    { value: "5", label: "Semester 5" },
    { value: "6", label: "Semester 6" },
    { value: "7", label: "Semester 7" },
    { value: "8", label: "Semester 8" }
  ];
  useEffect(() => {
  axios
  .get(`${API_BASE}/subjects`)
    .then((res) => {
    // Normalize to array of { code, name, department, semester }
    const list = Array.isArray(res.data) ? res.data : [];
    const normalized = list.map(item => {
      if (typeof item === 'string') {
        return { code: item, name: '', department: '', semester: '' };
      }
      return {
        code: item.subject_code || item.code || '',
        name: item.subject_name || item.name || '',
        department: item.department || '',
        semester: typeof item.semester === 'number' ? String(item.semester) : (item.semester || '')
      };
    }).filter(x => x.code);
    setSubjectCodes(normalized);
    })
    .catch((err) => console.error("Error fetching subject codes:", err));
}, []);

useEffect(() => {
  axios
    .get(`${API_BASE}/departments`)
    .then((res) => {
      if (Array.isArray(res.data)) {
        // If API returns objects like {department: "CSE"}, map to strings
        const deptNames = res.data.map(d => typeof d === "string" ? d : d.department);
        setDepartments(deptNames.filter(Boolean));
      } else {
        console.error("Unexpected departments response:", res.data);
        setDepartments([]);
      }
    })
    .catch((err) => {
      console.error("Error fetching departments:", err);
      setDepartments([]);
    });
}, []);

// Filter subjects based on department and semester (exact match, no regex)
useEffect(() => {
  if (selectedDepartment && selectedSemester && subjectCodes.length > 0) {
    const filtered = subjectCodes.filter(subject => {
      const dept = typeof subject === 'string' ? '' : (subject.department || '');
      const sem = typeof subject === 'string' ? '' : (subject.semester || '');
      return dept === selectedDepartment && sem === selectedSemester;
    });
    setFilteredSubjects(filtered);
  } else {
    setFilteredSubjects([]);
  }
}, [selectedDepartment, selectedSemester, subjectCodes]);

// Fetch recent assignments
useEffect(() => {
  if (userType === "superadmin" && userpage === "qp") {
    fetch(`${API_BASE}/recent-assignments`)
      .then(res => res.json())
      .then(data => {
        // Process assignments to ensure completed ones have proper timestamps
        const processedData = (data || []).map(assignment => {
          if (assignment.status === 'Completed' && !assignment.completedAt) {
            // If it's completed but doesn't have completedAt, use assignedDate as fallback
            return {
              ...assignment,
              completedAt: assignment.assignedDate
            };
          }
          return assignment;
        });
        setRecentAssignments(processedData);
      })
      .catch(err => {
        console.error("Error fetching recent assignments:", err);
        setRecentAssignments([]);
      });
  }
}, [userType, userpage]);

// Auto-cleanup: Remove completed assignments older than 5 hours every minute
useEffect(() => {
  if (userType === "superadmin" && userpage === "qp") {
    const interval = setInterval(() => {
      setRecentAssignments(prevAssignments => {
        return prevAssignments.filter(assignment => {
          if (assignment.status === 'Completed') {
            // Use completedAt if available, otherwise use assignedDate
            const completedDate = new Date(assignment.completedAt || assignment.assignedDate);
            const now = new Date();
            const hoursDiff = (now - completedDate) / (1000 * 60 * 60);
            return hoursDiff < 5; // Keep if less than 5 hours old
          }
          return true; // Keep all pending assignments
        });
      });
    }, 60000); // Run every minute (60000ms)

    return () => clearInterval(interval);
  }
}, [userType, userpage]);




  // const deptMap = {
  //   "computer science": "Computer Science and Engineering (CSE)",
  //   cse: "Computer Science and Engineering (CSE)",
  //   "information science": "Information Science and Engineering (ISE)",
  //   ise: "Information Science and Engineering (ISE)",
  //   "electronics and communication": "Electronics and Communication Engineering (ECE)",
  //   ece: "Electronics and Communication Engineering (ECE)",
  //   "electrical and electronics": "Electrical and Electronics Engineering (EEE)",
  //   eee: "Electrical and Electronics Engineering (EEE)",
  //   mechanical: "Mechanical Engineering (ME)",
  //   me: "Mechanical Engineering (ME)",
  //   civil: "Civil Engineering (CE)",
  //   ce: "Civil Engineering (CE)",
  //   "artificial intelligence": "Artificial Intelligence and Machine Learning (AIML)",
  //   aiml: "Artificial Intelligence and Machine Learning (AIML)",
  //   "electronics and instrumentation": "Electronics and Instrumentation Engineering (EIE)",
  //   eie: "Electronics and Instrumentation Engineering (EIE)",
  //   aerospace: "Aerospace Engineering (AE)",
  //   ae: "Aerospace Engineering (AE)",
  // };

  const normalizeDeptName = (deptName) => {
  if (!deptName) return "No Department";

  const found = departments.find(d => d.toLowerCase() === deptName.toLowerCase());
  return found || deptName;
};

// Filter faculties by selected department
const getFilteredFaculties = (faculties) => {
  if (!selectedDepartment) return faculties;
  return faculties.filter(faculty => 
    normalizeDeptName(faculty.deptName).toLowerCase() === selectedDepartment.toLowerCase()
  );
};

// Handle department change
const handleDepartmentChange = (dept) => {
  setSelectedDepartment(dept);
  setSelectedSemester("");
  setSubjectCode("");
  setSelectedEmails([]);
  setSelectedUsers([]);
};

// Handle semester change
const handleSemesterChange = (semester) => {
  setSelectedSemester(semester);
  setSubjectCode("");
};



  useEffect(() => {
    const fetchFaculties = () => {
      fetch(`${API_BASE}/users`)
        .then((res) => res.json())
        .then((data) => setInternalFaculties(data))
        .catch((err) => console.error("Fetch error:", err));
    };

    fetchFaculties();

    // Listen for faculty updates (e.g., from bulk upload)
    const handler = () => fetchFaculties();
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('faculties-updated', handler);
    }
    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('faculties-updated', handler);
      }
    };
  }, []);

  useEffect(() => {
    const fetchExternalFaculties = () => {
      fetch(`${API_BASE}/externalusers`)
        .then((res) => res.json())
        .then((data) => setOtherFaculties(data))
        .catch((err) => console.error("Fetch error:", err));
    };

    fetchExternalFaculties();

    // Listen for faculty updates (e.g., from bulk upload)
    const handler = () => fetchExternalFaculties();
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('faculties-updated', handler);
    }
    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('faculties-updated', handler);
      }
    };
  }, []);

  // const handleSelect = (email) => {
  //   setSelectedEmails((prev) =>
  //     prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
  //   );
  // };

  const handleSelect = (email, password) => {
  // Update selectedUsers (email + password)
  setSelectedUsers((prev) => {
    const exists = prev.find((u) => u.email === email);
    if (exists) {
      return prev.filter((u) => u.email !== email);
    } else {
      return [...prev, { email, password }];
    }
  });

  // Update selectedEmails (only emails)
  setSelectedEmails((prev) =>
    prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
  );
};


  const groupByDepartment = (users) => {
    return users.reduce((acc, user) => {
      const dept = normalizeDeptName(user.deptName);
      if (!acc[dept]) acc[dept] = [];
      acc[dept].push(user);
      return acc;
    }, {});
  };

  const renderDepartmentTables = (users) => {
    const grouped = groupByDepartment(users);
    return Object.keys(grouped).map((dept) => (
      <div key={dept} style={{ marginBottom: "30px" }}>
        <h3>{dept}</h3>
        <div className="table-wrapper">
          <table className="user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>College</th>
                <th>Email</th>
                <th>Contact</th>
                {(userType === "superadmin" && userpage==="qp") && <th>Select as QP Setter</th>}
              </tr>
            </thead>
            <tbody>
              {grouped[dept].map((u) => {
                const isSelected = selectedEmails.includes(u.email);
                return (
                  <tr key={u.email}>
                    <td>{u.name}</td>
                    <td>{u.clgName}</td>
                    <td>{u.email}</td>
                    <td>{u.phoneNo}</td>
                    {userType === "superadmin"  && userpage==="qp" && (
                      <td>
                        <button
                          className={`qp-select-btn ${isSelected ? "selected" : ""}`}
                          onClick={() => handleSelect(u.email,u.password)}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    ));
  };

  const handleConfirm = () => {
    if (!subjectCode) {
      alert("Please select a subject code.");
      return;
    }
    if (!submitDate) {
      alert("Please select a submission date.");
      return;
    }
    if (selectedEmails.length === 0) {
      alert("Please select at least one faculty.");
      return;
    }

    

    setStatusMessage("Submitting assignment...");

    fetch(`${API_BASE}/assignQPSetter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        //emails: selectedEmails,
       users: selectedUsers,
        subjectCode,
        submitDate,
      }),
    })
      .then((res) => {
        if (res.ok) {
          // Filter selected users from internal and external lists
          const selectedUsersList = [...internalFaculties, ...otherFaculties].filter((f) =>
            selectedEmails.includes(f.email)
          );
          const internalSelected = selectedUsersList.filter((f) =>
            internalFaculties.some((i) => i.email === f.email)
          );
          const externalSelected = selectedUsersList.filter((f) =>
            otherFaculties.some((o) => o.email === f.email)
          );

          // Group for display
          const groupedInternal = groupByDepartment(internalSelected);
          const groupedExternal = groupByDepartment(externalSelected);

          setSelectedGrouped({ internal: groupedInternal, external: groupedExternal });

          // Save submitted subject code and date for message display
          setLastSubmittedSubjectCode(subjectCode);
          setLastSubmittedDate(submitDate);

          // Clear selections and inputs to initial state
          setSelectedEmails([]);
          setSelectedUsers([]);
          setSelectedGrouped(null);
          setSelectedDepartment("");
          setSelectedSemester("");
          setFilteredSubjects([]);
          setSubjectCode("");
          setSubmitDate("");

          setStatusMessage("✅ QP Setters assigned successfully!");

          // Add optimistic assignment and refresh from backend
          const optimisticAssignment = {
            facultyNames: selectedUsersList.map((f) => f.name || f.email),
            subjectCode,
            department: selectedDepartment,
            deadline: submitDate,
            assignedDate: new Date().toISOString().slice(0, 10),
            status: "Pending",
            completedAt: null // Explicitly set to null for pending assignments
          };
          
          // First add optimistically
          setRecentAssignments((prev) => [optimisticAssignment, ...(prev || [])]);
          
          // Then refresh from backend after a short delay
          setTimeout(() => {
            fetch(`${API_BASE}/recent-assignments`)
              .then(res => res.json())
              .then(data => {
                // Process assignments to ensure completed ones have proper timestamps
                const processedData = (data || []).map(assignment => {
                  if (assignment.status === 'Completed' && !assignment.completedAt) {
                    // If it's completed but doesn't have completedAt, use assignedDate as fallback
                    return {
                      ...assignment,
                      completedAt: assignment.assignedDate
                    };
                  }
                  return assignment;
                });
                
                // Only update if backend has data, otherwise keep optimistic
                if (processedData && processedData.length > 0) {
                  setRecentAssignments(processedData);
                }
              })
              .catch(err => {
                console.error("Error refreshing recent assignments:", err);
                // Keep optimistic data if backend fails
              });
          }, 1000);

          setTimeout(() => {
            if (statusRef.current) {
              statusRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
            }
          }, 100);
        } else {
          setStatusMessage("❌ Failed to assign QP setters.");
        }
      })
      .catch((err) => {
        console.error(err);
        setStatusMessage("❌ Error assigning QP setters.");
      });
  };

  // Notifications component
  const renderNotifications = () => {
    // Filter out completed assignments older than 5 hours
    const filteredAssignments = recentAssignments.filter(assignment => {
      if (assignment.status === 'Completed') {
        // Use completedAt if available, otherwise use assignedDate
        const completedDate = new Date(assignment.completedAt || assignment.assignedDate);
        const now = new Date();
        const hoursDiff = (now - completedDate) / (1000 * 60 * 60); // Convert ms to hours
        return hoursDiff < 5; // Only show if less than 5 hours old
      }
      return true; // Show all pending/non-completed assignments
    });

    return (
    <div className="notifications-container" style={{
      background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      boxShadow: '0 6px 18px rgba(0,0,0,0.06)'
    }}>
      <h2 style={{ margin: '0 0 8px 0', color: '#1e40af', fontSize: 24, fontWeight: 700 }}>
        📋 Recent QP Setter Assignments
      </h2>
      
      <div style={{
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: 8,
        padding: '8px 12px',
        marginBottom: 12,
        fontSize: 13,
        color: '#1e40af'
      }}>
        ℹ️ <strong>Note:</strong> Completed assignments are automatically removed after page is refreshed.
      </div>
      
      <div style={{
        background: 'white',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        height: '180px', // Reduced height to show ~3 entries
        overflowY: 'auto', // Scrollable
        padding: '12px'
      }}>
        {filteredAssignments.length > 0 ? (
          filteredAssignments.map((assignment, idx) => (
            <div 
              key={idx} 
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#eef2ff';
                e.target.style.borderColor = '#4f46e5';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#f8fafc';
                e.target.style.borderColor = '#e2e8f0';
              }}
              onClick={() => {
                const facultyNames = assignment.facultyNames || [assignment.facultyName];
                const totalCount = facultyNames.length;
                
                // Separate internal and external faculties (mock logic - you may need to adjust based on your data)
                const internalFaculties = facultyNames.filter(name => 
                  name.includes('Dr.') || name.includes('Prof.')
                );
                const externalFaculties = facultyNames.filter(name => 
                  !name.includes('Dr.') && !name.includes('Prof.')
                );
                
                let message = `Assignment for ${assignment.subjectCode}\n\n`;
                if (internalFaculties.length > 0) {
                  message += `Internal Faculties (${internalFaculties.length}):\n${internalFaculties.join('\n')}\n\n`;
                }
                if (externalFaculties.length > 0) {
                  message += `External Faculties (${externalFaculties.length}):\n${externalFaculties.join('\n')}\n\n`;
                }
                message += `Total Count: ${totalCount}\nSubmission Deadline: ${assignment.deadline}`;
                
                alert(message);
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 600, 
                  color: '#1e40af',
                  marginBottom: '4px'
                }}>
                  Assignment for {assignment.subjectCode}
                </div>
                <div style={{ 
                  fontSize: 14, 
                  color: '#64748b'
                }}>
                  Assigned on {assignment.assignedDate || 'N/A'}
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  fontSize: 14, 
                  color: '#64748b',
                  fontWeight: 500,
                  marginBottom: '4px'
                }}>
                  Assigned at: {assignment.assignedDate || 'N/A'}
                </div>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  background: assignment.status === 'Completed' ? '#dcfce7' : '#fef3c7',
                  color: assignment.status === 'Completed' ? '#166534' : '#d97706'
                }}>
                  {assignment.status}
                </span>
              </div>
              
              <div style={{ marginLeft: '12px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the row click
                    if (window.confirm('Are you sure you want to delete this assignment?')) {
                      setRecentAssignments(prev => prev.filter((_, i) => i !== idx));
                    }
                  }}
                  style={{
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#b91c1c'}
                  onMouseLeave={(e) => e.target.style.background = '#dc2626'}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <p style={{ margin: 0, fontSize: 16 }}>No recent assignments found. Start by selecting a department above.</p>
          </div>
        )}
      </div>
    </div>
  );
  };

  return (
    <div className="manage-users">
      {userType === "superadmin" && userpage==="qp" && (
        <>
          {/* QP Setter Selection Form */}
          <div className="qp-selection-form" style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            boxShadow: '0 6px 18px rgba(0,0,0,0.04)'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#1e40af', fontSize: 22, fontWeight: 700 }}>
              🎯 Select Question Paper Setters
            </h2>
            
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
              gap: "12px", 
              marginBottom: "20px",
              alignItems: "end"
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#374151' }}>
                  Department *
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  style={{ 
                    padding: "10px 12px", 
                    width: "100%", 
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    background: 'white'
                  }}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept, idx) => (
                    <option key={idx} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#374151' }}>
                  Semester *
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => handleSemesterChange(e.target.value)}
                  disabled={!selectedDepartment}
                  style={{ 
                    padding: "10px 12px", 
                    width: "100%", 
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    background: selectedDepartment ? 'white' : '#f9fafb',
                    color: selectedDepartment ? '#374151' : '#9ca3af'
                  }}
                >
                  <option value="">Select Semester</option>
                  {semesters.map((sem) => (
                    <option key={sem.value} value={sem.value}>
                      {sem.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#374151' }}>
                  Subject Code *
                </label>
                <select
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  disabled={!selectedDepartment || !selectedSemester}
                  style={{ 
                    padding: "10px 12px", 
                    width: "100%", 
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    background: (selectedDepartment && selectedSemester) ? 'white' : '#f9fafb',
                    color: (selectedDepartment && selectedSemester) ? '#374151' : '#9ca3af'
                  }}
                >
                  <option value="">Select Subject</option>
                  {filteredSubjects.map((item, idx) => {
                    const codeVal = typeof item === 'string' ? item : item.code;
                    const nameVal = typeof item === 'string' ? '' : item.name;
                    const label = nameVal ? `${codeVal} - ${nameVal}` : codeVal;
                    return (
                      <option key={idx} value={codeVal}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#374151' }}>
                  Submission Date *
                </label>
                <input
                  type="date"
                  value={submitDate}
                  onChange={(e) => setSubmitDate(e.target.value)}
                  style={{ 
                    padding: "10px 12px", 
                    width: "100%", 
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    marginLeft: "4px",
                    fontSize: 14
                  }}
                />
              </div>

              <div>
                <button 
                  onClick={handleConfirm} 
                  disabled={!selectedDepartment || !selectedSemester || !subjectCode || !submitDate}
                  style={{ 
                    padding: "10px 20px", 
                    borderRadius: 8,
                    border: 'none',
                    background: (selectedDepartment && selectedSemester && subjectCode && submitDate) ? '#4f46e5' : '#9ca3af',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: (selectedDepartment && selectedSemester && subjectCode && submitDate) ? 'pointer' : 'not-allowed',
                    width: '100%'
                  }}
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>

          {/* Show notifications when nothing is selected */}
          {!selectedDepartment && (
            renderNotifications()
          )}

          {/* View Assignees Section */}
          {/* <div className="view-assignees-section" style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            boxShadow: '0 6px 18px rgba(0,0,0,0.04)'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#1e40af', fontSize: 22, fontWeight: 700 }}>
              👁️ View Assignees
            </h2>
            
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
              gap: "12px", 
              marginBottom: "20px",
              alignItems: "end"
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#374151' }}>
                  Department
                </label>
                <select
                  value={viewDept}
                  onChange={(e) => setViewDept(e.target.value)}
                  style={{ 
                    padding: "10px 12px", 
                    width: "100%", 
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    background: 'white'
                  }}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept, idx) => (
                    <option key={idx} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#374151' }}>
                  Semester
                </label>
                <select
                  value={viewSemester}
                  onChange={(e) => setViewSemester(e.target.value)}
                  disabled={!viewDept}
                  style={{ 
                    padding: "10px 12px", 
                    width: "100%", 
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    background: viewDept ? 'white' : '#f9fafb',
                    color: viewDept ? '#374151' : '#9ca3af'
                  }}
                >
                  <option value="">Select Semester</option>
                  {semesters.map((sem) => (
                    <option key={sem.value} value={sem.value}>
                      {sem.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button 
                  onClick={() => {
                    // Filter assignments by selected department and semester
                    const filtered = recentAssignments.filter(assignment => {
                      const deptMatch = !viewDept || assignment.department === viewDept;
                      const semMatch = !viewSemester || assignment.subjectCode.includes(viewSemester);
                      return deptMatch && semMatch;
                    });
                    
                    if (filtered.length === 0) {
                      alert('No assignments found for the selected criteria.');
                      return;
                    }
                    
                    let message = `Assignments for ${viewDept || 'All Departments'} - ${viewSemester ? `Semester ${viewSemester}` : 'All Semesters'}:\n\n`;
                    filtered.forEach((assignment, idx) => {
                      message += `${idx + 1}. ${assignment.subjectCode} - ${assignment.department}\n`;
                      message += `   Faculty: ${assignment.facultyNames.join(', ')}\n`;
                      message += `   Deadline: ${assignment.deadline}\n\n`;
                    });
                    
                    alert(message);
                  }}
                  disabled={!viewDept && !viewSemester}
                  style={{ 
                    padding: "10px 20px", 
                    borderRadius: 8,
                    border: 'none',
                    background: (viewDept || viewSemester) ? '#10b981' : '#9ca3af',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: (viewDept || viewSemester) ? 'pointer' : 'not-allowed',
                    width: '100%'
                  }}
                >
                  View Assignees
                </button>
              </div>
            </div>
          </div> */}
        </>
      )}

      {userType === "superadmin" && selectedDepartment && (
        <>
          <div className="faculty-lists-container" style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            boxShadow: '0 6px 18px rgba(0,0,0,0.04)'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#1e40af', fontSize: 22, fontWeight: 700 }}>
              👥 Available Faculties - {selectedDepartment}
            </h2>
            
            <h3 style={{ color: '#374151', marginBottom: 16 }}>Internal Faculties</h3>
            {getFilteredFaculties(internalFaculties).length > 0 ? (
              renderDepartmentTables(getFilteredFaculties(internalFaculties))
            ) : (
              <div style={{
                background: '#f9fafb',
                borderRadius: 8,
                padding: 16,
                textAlign: 'center',
                color: '#6b7280',
                marginBottom: 20
              }}>
                No internal faculties found for {selectedDepartment}
              </div>
            )}

            <hr style={{ margin: "30px 0", border: '1px solid #e2e8f0' }} />

            <h3 style={{ color: '#374151', marginBottom: 16 }}>External Faculties</h3>
            {getFilteredFaculties(otherFaculties).length > 0 ? (
              renderDepartmentTables(getFilteredFaculties(otherFaculties))
            ) : (
              <div style={{
                background: '#f9fafb',
                borderRadius: 8,
                padding: 16,
                textAlign: 'center',
                color: '#6b7280'
              }}>
                No external faculties found for {selectedDepartment}
              </div>
            )}
          </div>
        </>
      )}

      {userType === "admin" && (
        <>
          <h2>External Faculties List</h2>
          {renderDepartmentTables(otherFaculties)}
        </>
      )}

      {/* Faculty Management Page - Show all faculties grouped by type */}
      {userType === "superadmin" && userpage === "managefaculty" && (
        <>
          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            boxShadow: '0 6px 18px rgba(0,0,0,0.04)'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#1e40af', fontSize: 22, fontWeight: 700 }}>
              👥 Internal Faculties
            </h2>
            {internalFaculties.length > 0 ? (
              renderDepartmentTables(internalFaculties)
            ) : (
              <div style={{
                background: '#f9fafb',
                borderRadius: 8,
                padding: 16,
                textAlign: 'center',
                color: '#6b7280'
              }}>
                No internal faculties found
              </div>
            )}
          </div>

          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: 20,
            boxShadow: '0 6px 18px rgba(0,0,0,0.04)'
          }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#1e40af', fontSize: 22, fontWeight: 700 }}>
              🌐 External Faculties
            </h2>
            {otherFaculties.length > 0 ? (
              renderDepartmentTables(otherFaculties)
            ) : (
              <div style={{
                background: '#f9fafb',
                borderRadius: 8,
                padding: 16,
                textAlign: 'center',
                color: '#6b7280'
              }}>
                No external faculties found
              </div>
            )}
          </div>
        </>
      )}

      {/* Status message box */}
      {statusMessage && (
        <div className="manage-users-msg show" ref={statusRef}>
          <p>{statusMessage}</p>

          {/* Display last submitted subject code and submission date */}
          {lastSubmittedSubjectCode && (
            <p>
              <strong>Subject Code:</strong> {lastSubmittedSubjectCode}
            </p>
          )}
          {lastSubmittedDate && (
            <p>
              <strong>Submission Date:</strong> {lastSubmittedDate}
            </p>
          )}

          {selectedGrouped && (
            <>
              <h3>Selected Internal Faculties:</h3>
              {Object.entries(selectedGrouped.internal).map(([dept, users]) => (
                <div key={dept}>
                  <strong>{dept}</strong>
                  <ul>
                    {users.map((u) => (
                      <li key={u.email || u}>{u.name || u}</li>
                    ))}
                  </ul>
                </div>
              ))}
              <h3>Selected External Faculties:</h3>
              {Object.entries(selectedGrouped.external).map(([dept, users]) => (
                <div key={dept}>
                  <strong>{dept}</strong>
                  <ul>
                    {users.map((u) => (
                      <li key={u.email || u}>{u.name || u}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}

          <p className="email-note">
            An email with details has been sent to the selected faculties.
          </p>

          <button
            className="ok-btn"
            onClick={() => setStatusMessage(null)}
            aria-label="Close message"
          >
            Okay
          </button>
        </div>
      )}
    </div>
  );
}

export default ManageUsers;
