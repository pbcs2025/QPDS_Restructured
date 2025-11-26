//MBAManageQPSetters.js
import React, { useEffect, useState, useRef } from "react";
import "../../common/dashboard.css";
import "./manageUsersMessage.css";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function MBAManageQPSetters() {
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

  // Semester options for MBA (1-4)
  const semesters = [
    { value: "1", label: "Semester 1" },
    { value: "2", label: "Semester 2" },
    { value: "3", label: "Semester 3" },
    { value: "4", label: "Semester 4" }
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios
    .get(`${API_BASE}/mbasubjects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => {
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
      .catch((err) => console.error("Error fetching MBA subject codes:", err));
  }, []);

useEffect(() => {
  const token = localStorage.getItem('token');
  axios
    .get(`${API_BASE}/mbadepartments/active`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then((res) => {
      if (Array.isArray(res.data)) {
        const deptNames = res.data.map(d => typeof d === "string" ? d : (d.name || d.department));
        setDepartments(deptNames.filter(Boolean));
      } else {
        console.error("Unexpected MBA departments response:", res.data);
        setDepartments([]);
      }
    })
    .catch((err) => {
      console.error("Error fetching MBA departments:", err);
      setDepartments([]);
    });
}, []);

// Filter subjects based on department and semester
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

// Fetch recent MBA assignments
useEffect(() => {
  const token = localStorage.getItem('token');
  fetch(`${API_BASE}/mbarecent-assignments`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => {
      if (!res.ok) throw new Error(`Status ${res.status}`);
      return res.json();
    })
    .then(data => {
      const processedData = (data || []).map(assignment => {
        if (assignment.status === 'Completed' && !assignment.completedAt) {
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
      console.error("Error fetching recent MBA assignments:", err);
      setRecentAssignments([]);
    });
}, []);

// Auto-cleanup: Remove completed assignments older than 5 hours every minute
useEffect(() => {
  const interval = setInterval(() => {
    setRecentAssignments(prevAssignments => {
      return prevAssignments.filter(assignment => {
        if (assignment.status === 'Completed') {
          const completedDate = new Date(assignment.completedAt || assignment.assignedDate);
          const now = new Date();
          const hoursDiff = (now - completedDate) / (1000 * 60 * 60);
          return hoursDiff < 5;
        }
        return true;
      });
    });
  }, 60000);

  return () => clearInterval(interval);
}, []);

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
    const fetchFaculties = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/mbafaculty/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error(`Status ${res.status}`);
        
        const data = await res.json();
        const mbaFaculties = Array.isArray(data) ? data : [];
        
        // Separate internal and external faculties
        const internal = mbaFaculties.filter(f => f.type === 'internal' || !f.type);
        const external = mbaFaculties.filter(f => f.type === 'external');
        
        // Convert to User format for compatibility
        const internalUsers = internal.map(f => ({
          _id: f._id,
          name: f.name,
          email: f.email,
          clgName: f.clgName,
          deptName: f.department,
          phoneNo: f.contactNumber,
          usertype: f.type || 'internal',
          role: 'MBAFaculty',
          password: f.password || ''
        }));
        
        const externalUsers = external.map(f => ({
          _id: f._id,
          name: f.name,
          email: f.email,
          clgName: f.clgName,
          deptName: f.department,
          phoneNo: f.contactNumber,
          usertype: f.type || 'external',
          role: 'MBAFaculty',
          password: f.password || ''
        }));
        
        setInternalFaculties(internalUsers);
        setOtherFaculties(externalUsers);
      } catch (err) {
        console.error("Fetch MBA faculties error:", err);
        setInternalFaculties([]);
        setOtherFaculties([]);
      }
    };

    fetchFaculties();

    const handler = () => fetchFaculties();
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('mba-faculties-updated', handler);
    }
    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('mba-faculties-updated', handler);
      }
    };
  }, []);

  const handleSelect = (email, password) => {
  setSelectedUsers((prev) => {
    const exists = prev.find((u) => u.email === email);
    if (exists) {
      return prev.filter((u) => u.email !== email);
    } else {
      return [...prev, { email, password }];
    }
  });

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
                <th>Select as QP Setter</th>
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
                    <td>
                      <button
                        className={`qp-select-btn ${isSelected ? "selected" : ""}`}
                        onClick={() => handleSelect(u.email, u.password)}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>
                    </td>
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

    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/mbaassignQPSetter`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        users: selectedUsers,
        subjectCode,
        submitDate,
      }),
    })
      .then(async (res) => {
        // Clone response to read it multiple times if needed
        const contentType = res.headers.get("content-type");
        let data;
        
        try {
          // Try to parse as JSON first
          if (contentType && contentType.includes("application/json")) {
            const text = await res.text();
            try {
              data = JSON.parse(text);
            } catch (parseErr) {
              console.error("JSON parse error:", parseErr);
              console.error("Response text:", text);
              setStatusMessage(`❌ Server returned invalid JSON: ${res.status} ${res.statusText}`);
              return;
            }
          } else {
            // Not JSON, read as text
            const text = await res.text();
            console.error("Non-JSON response:", text);
            setStatusMessage(`❌ Server error: ${res.status} ${res.statusText}`);
            return;
          }
        } catch (readErr) {
          console.error("Error reading response:", readErr);
          setStatusMessage(`❌ Failed to read server response: ${res.status} ${res.statusText}`);
          return;
        }
        
        // Check if response is OK
        if (!res.ok) {
          const errorMsg = data?.error || data?.details || data?.message || `Server error: ${res.status} ${res.statusText}`;
          setStatusMessage(`❌ ${errorMsg}`);
          console.error("Assignment error:", data);
          return;
        }
        
        // Success - process the data
        if (data) {
          const selectedUsersList = [...internalFaculties, ...otherFaculties].filter((f) =>
            selectedEmails.includes(f.email)
          );
          const internalSelected = selectedUsersList.filter((f) =>
            internalFaculties.some((i) => i.email === f.email)
          );
          const externalSelected = selectedUsersList.filter((f) =>
            otherFaculties.some((o) => o.email === f.email)
          );

          const groupedInternal = groupByDepartment(internalSelected);
          const groupedExternal = groupByDepartment(externalSelected);

          setSelectedGrouped({ internal: groupedInternal, external: groupedExternal });

          setLastSubmittedSubjectCode(subjectCode);
          setLastSubmittedDate(submitDate);

          setSelectedEmails([]);
          setSelectedUsers([]);
          setSelectedGrouped(null);
          setSelectedDepartment("");
          setSelectedSemester("");
          setFilteredSubjects([]);
          setSubjectCode("");
          setSubmitDate("");

          setStatusMessage("✅ MBA QP Setters assigned successfully!");

          const optimisticAssignment = {
            facultyNames: selectedUsersList.map((f) => f.name || f.email),
            subjectCode,
            department: selectedDepartment,
            deadline: submitDate,
            assignedDate: new Date().toISOString().slice(0, 10),
            status: "Pending",
            completedAt: null
          };
          
          setRecentAssignments((prev) => [optimisticAssignment, ...(prev || [])]);
          
          setTimeout(() => {
            const token = localStorage.getItem('token');
            fetch(`${API_BASE}/mbarecent-assignments`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
              .then(res => {
                if (!res.ok) throw new Error(`Status ${res.status}`);
                return res.json();
              })
              .then(data => {
                const processedData = (data || []).map(assignment => {
                  if (assignment.status === 'Completed' && !assignment.completedAt) {
                    return {
                      ...assignment,
                      completedAt: assignment.assignedDate
                    };
                  }
                  return assignment;
                });
                
                if (processedData && processedData.length > 0) {
                  setRecentAssignments(processedData);
                }
              })
              .catch(err => {
                console.error("Error refreshing recent MBA assignments:", err);
              });
          }, 1000);

          setTimeout(() => {
            if (statusRef.current) {
              statusRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
            }
          }, 100);
        } else {
          const errorMsg = data?.error || data?.details || data?.message || "Failed to assign MBA QP setters.";
          setStatusMessage(`❌ ${errorMsg}`);
          console.error("Assignment error:", data);
        }
      })
      .catch((err) => {
        console.error("Assignment fetch error:", err);
        const errorMsg = err.message || 'Network error';
        setStatusMessage(`❌ Error assigning MBA QP setters: ${errorMsg}`);
      });
  };

  // Notifications component
  const renderNotifications = () => {
    const filteredAssignments = recentAssignments.filter(assignment => {
      if (assignment.status === 'Completed') {
        const completedDate = new Date(assignment.completedAt || assignment.assignedDate);
        const now = new Date();
        const hoursDiff = (now - completedDate) / (1000 * 60 * 60);
        return hoursDiff < 5;
      }
      return true;
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
        📋 Recent MBA QP Setter Assignments
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
        height: '180px',
        overflowY: 'auto',
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
                
                const internalFaculties = facultyNames.filter(name => 
                  name.includes('Dr.') || name.includes('Prof.')
                );
                const externalFaculties = facultyNames.filter(name => 
                  !name.includes('Dr.') && !name.includes('Prof.')
                );
                
                let message = `MBA Assignment for ${assignment.subjectCode}\n\n`;
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
                    e.stopPropagation();
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
            <p style={{ margin: 0, fontSize: 16 }}>No recent MBA assignments found. Start by selecting a department above.</p>
          </div>
        )}
      </div>
    </div>
  );
  };

  return (
    <div className="manage-users">
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
            🎯 Select MBA Question Paper Setters
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
                MBA Department *
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
                <option value="">Select MBA Department</option>
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

        {selectedDepartment && (
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
                👥 Available MBA Faculties - {selectedDepartment}
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
                  No internal MBA faculties found for {selectedDepartment}
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
                  No external MBA faculties found for {selectedDepartment}
                </div>
              )}
            </div>
          </>
        )}
      </>

      {/* Status message box */}
      {statusMessage && (
        <div className="manage-users-msg show" ref={statusRef}>
          <p>{statusMessage}</p>

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
            An email with details has been sent to the selected MBA faculties.
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

export default MBAManageQPSetters;

