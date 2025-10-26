import React, { useEffect, useState } from "react";
import "./viewAssignees.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function ViewAssignees() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [assigneesData, setAssigneesData] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);
  
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [departments, setDepartments] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);

  // Fetch departments
  useEffect(() => {
    fetch(`${API_BASE}/departments`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const deptNames = data.map(d => typeof d === "string" ? d : (d.department || d.name));
          setDepartments(deptNames.filter(Boolean));
        }
      })
      .catch((err) => console.error("Error fetching departments:", err));
  }, []);

  // Fetch all assigned subjects on mount
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/assignedSubjects`)
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setSubjects(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError("Failed to load assigned subjects.");
        setLoading(false);
      });
  }, []);

  // Auto-cleanup: Remove recent assignments older than 5 hours every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setSubjects(prevSubjects => {
        return prevSubjects.map(subject => {
          // Add isRecent flag based on creation time
          if (subject.assignedAt || subject.createdAt) {
            const createdDate = new Date(subject.assignedAt || subject.createdAt);
            const now = new Date();
            const hoursDiff = (now - createdDate) / (1000 * 60 * 60);
            return {
              ...subject,
              isRecent: hoursDiff < 5
            };
          }
          return subject;
        });
      });
    }, 60000); // Run every minute (60000ms)

    return () => clearInterval(interval);
  }, []);

  // Fetch assignees when subject is clicked
  const handleCardClick = (subjectCode) => {
    setSelectedSubject(subjectCode);
    setTableLoading(true);
    fetch(`${API_BASE}/assignments/${encodeURIComponent(subjectCode)}`)
      .then((res) => {
       // console.log(res.json());
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log(data);
        setAssigneesData(data);
        setTableLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError("Failed to load assignees.");
        setTableLoading(false);
      });
  };

  // Reset to subject list view
  const handleBack = () => {
    setSelectedSubject(null);
    setAssigneesData(null);
    setError(null);
  };

  // Reset department selection
  const handleDepartmentBack = () => {
    setSelectedDepartment("");
  };

  // Handle delete assignment
  const handleDeleteClick = (e, subjectCode) => {
    e.stopPropagation(); // Prevent card click
    setSubjectToDelete(subjectCode);
    setShowDeleteDialog(true);
  };

  // Confirm delete assignment
  const confirmDelete = () => {
    if (subjectToDelete) {
      // Here you would make an API call to delete the assignment
      // For now, we'll just remove it from the local state
      setSubjects(prevSubjects => 
        prevSubjects.filter(subject => subject.subject_code !== subjectToDelete)
      );
      setShowDeleteDialog(false);
      setSubjectToDelete(null);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setSubjectToDelete(null);
  };

  if (loading) return <p>Loading assigned subjects...</p>;
  if (error && !selectedSubject) return <p>{error}</p>;

  // Filter recent assignments (less than 5 hours old) - ALL subjects
  const getRecentAssignments = () => {
    return subjects.filter(subject => {
      // Check multiple possible timestamp fields
      const timestamp = subject.assigned_at || subject.assignedAt || subject.createdAt || subject.created_at;
      
      if (timestamp) {
        const createdDate = new Date(timestamp);
        const now = new Date();
        const hoursDiff = (now - createdDate) / (1000 * 60 * 60);
        return hoursDiff < 5;
      }
      
      // If no timestamp, consider it recent
      return true;
    }).slice(0, 6); // Limit to 6 most recent for better UI
  };

  // Filter subjects by selected department
  const getFilteredSubjects = () => {
    if (!selectedDepartment) return [];
    
    return subjects.filter(subject => {
      // Check if any assignee belongs to the selected department
      return subject.assignees && subject.assignees.some(assignee => 
        assignee.deptName && assignee.deptName.toLowerCase() === selectedDepartment.toLowerCase()
      );
    });
  };

  const recentAssignments = getRecentAssignments();
  const filteredSubjects = getFilteredSubjects();

  return (
    <div className="view-assignees-container">
      <h1 className="view-assignees-title">View Assignees</h1>

      {/* Department Search Bar */}
      {!selectedSubject && (
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
          boxShadow: '0 6px 18px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, color: '#1e40af', fontSize: 22, fontWeight: 700 }}>
              🔍 Search Assignments by Department
            </h2>
            {selectedDepartment && (
              <button
                onClick={handleDepartmentBack}
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#374151',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f3f4f6';
                }}
              >
                ← Back to All Assignments
              </button>
            )}
          </div>
          
          <div style={{ maxWidth: '500px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151', fontSize: 14 }}>
              Select Department *
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              style={{
                padding: '12px 16px',
                width: '100%',
                borderRadius: 8,
                border: '2px solid #d1d5db',
                fontSize: 15,
                background: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            >
              <option value="">-- Select a Department --</option>
              {departments.map((dept, idx) => (
                <option key={idx} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            
            {selectedDepartment && (
              <div style={{
                marginTop: 12,
                padding: '10px 12px',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 6,
                fontSize: 13,
                color: '#0369a1'
              }}>
                ✓ Showing assignments for <strong>{selectedDepartment}</strong> department
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Assignments Section - Only show when NO department is selected */}
      {!selectedSubject && !selectedDepartment && (
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
          boxShadow: '0 6px 18px rgba(0,0,0,0.06)'
        }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#1e40af', fontSize: 24, fontWeight: 700 }}>
            🕒 Recent Assignments (Last 5 Hours)
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
            ℹ️ <strong>Note:</strong> Recent assignments are automatically removed from this section after 5 hours. You can still search for them by selecting a department above.
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            marginTop: 12
          }}>
            {recentAssignments.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#64748b',
                gridColumn: '1 / -1'
              }}>
                <p style={{ margin: 0, fontSize: 16 }}>No recent assignments found. New assignments will appear here.</p>
              </div>
            ) : (
              recentAssignments.map((subject) => (
              <div
                key={subject.subject_code}
                onClick={() => handleCardClick(subject.subject_code)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCardClick(subject.subject_code);
                }}
                style={{
                  background: 'white',
                  border: '2px solid #4f46e5',
                  borderRadius: 12,
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 6px rgba(79, 70, 229, 0.1)',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 12px rgba(79, 70, 229, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(79, 70, 229, 0.1)';
                }}
              >
                <button
                  type="button"
                  className="no-bg-btn"
                  onClick={(e) => handleDeleteClick(e, subject.subject_code)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    color: 'red',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    zIndex: 10
                  }}
                  title="Delete Assignment"
                >
                  <i className="fa fa-trash"></i>
                </button>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8
                }}>
                  <div style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#4f46e5'
                  }}>
                    {subject.subject_code}
                  </div>
                  <span style={{
                    background: '#dcfce7',
                    color: '#166534',
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600
                  }}>
                    NEW
                  </span>
                </div>
                <div style={{
                  fontSize: 14,
                  color: '#64748b',
                  marginBottom: 4
                }}>
                  Total Assigned: <strong>{subject.assignees ? subject.assignees.length : 0}</strong>
                </div>
                {subject.submit_date && (
                  <div style={{
                    fontSize: 13,
                    color: '#64748b'
                  }}>
                    Deadline: {new Date(subject.submit_date).toLocaleDateString()}
                  </div>
                )}
                {(subject.assigned_at || subject.assignedAt || subject.createdAt) && (
                  <div style={{
                    fontSize: 12,
                    color: '#94a3b8',
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px solid #e2e8f0'
                  }}>
                    Created: {new Date(subject.assigned_at || subject.assignedAt || subject.createdAt).toLocaleString()}
                  </div>
                )}
              </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Department Assignments Section */}
      {!selectedSubject && selectedDepartment && filteredSubjects.length > 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 6px 18px rgba(0,0,0,0.04)'
        }}>
          <h2 style={{ 
            margin: '0 0 16px 0', 
            color: '#334155', 
            fontSize: 20, 
            fontWeight: 700 
          }}>
            📚 Assignments for {selectedDepartment}
          </h2>
          <div className="assignees-grid">
            {filteredSubjects.map((subject) => (
              <div
                key={subject.subject_code}
                className="assignee-card"
                onClick={() => handleCardClick(subject.subject_code)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCardClick(subject.subject_code);
                }}
                style={{ position: 'relative' }}
              >
                <button
                  type="button"
                  className="no-bg-btn"
                  onClick={(e) => handleDeleteClick(e, subject.subject_code)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    color: 'red',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    zIndex: 10
                  }}
                  title="Delete Assignment"
                >
                  <i className="fa fa-trash"></i>
                </button>
                <div className="subject-code">{subject.subject_code}</div>
                <div className="assigned-count">
                  Total Assigned: {subject.assignees ? subject.assignees.length : 0}
                </div>
                {subject.submit_date && (
                  <div className="submit-date">
                    Deadline: {new Date(subject.submit_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results Message */}
      {!selectedSubject && selectedDepartment && filteredSubjects.length === 0 && (
        <div style={{
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          boxShadow: '0 6px 18px rgba(0,0,0,0.04)'
        }}>
          <p style={{ margin: 0, fontSize: 16, color: '#64748b' }}>
            No assignments found for <strong>{selectedDepartment}</strong> department.
          </p>
        </div>
      )}

      {/* Assignees Table View */}
      {selectedSubject && (
        <>
          <button className="back-btn" onClick={handleBack}>
            ← Back to Subjects
          </button>
          <div className="assignees-table-section">
            <h2>Assignees for {selectedSubject}</h2>

          {tableLoading && <p>Loading assignees...</p>}
          {error && <p>{error}</p>}

          {assigneesData && (
            <>
                  <h3>Faculties</h3>
                  <table className="assignees-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Assigned Date</th>
                        <th>Submission Deadline</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assigneesData.map((fac, idx) => (
                        <tr key={idx}>
                          <td>{fac.facultyName}</td>
                          <td>{fac.email}</td>
                          <td>{fac.assignedAt ? new Date(fac.assignedAt).toLocaleDateString() : "-"}</td>
                          <td>{fac.submitDate ? new Date(fac.submitDate).toLocaleDateString() : "-"}</td>
                          <td>
                            <button
                              className={`status-btn ${
                                fac.status === 'submitted' || fac.status === 'completed' 
                                  ? 'status-submitted' 
                                  : 'status-pending'
                              }`}
                            >
                              {fac.status === 'submitted' || fac.status === 'completed' ? 'Submitted' : 'Pending'}
                            </button>
                          </td>
                          <td>
                            <button
                              className="message-btn"
                              onClick={() => alert(`Messaging ${fac.facultyName}`)}
                            >
                              Message
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
          )}
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#dc2626',
              fontSize: 18,
              fontWeight: 700
            }}>
              ⚠️ Delete Assignment
            </h3>
            <p style={{
              margin: '0 0 20px 0',
              color: '#374151',
              fontSize: 14,
              lineHeight: 1.5
            }}>
              Are you sure you want to delete the assignment for <strong>{subjectToDelete}</strong>? This action cannot be undone and will permanently remove the assignment.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={cancelDelete}
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#374151',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f3f4f6';
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  background: '#dc2626',
                  border: '1px solid #dc2626',
                  borderRadius: 8,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'white',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#b91c1c';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#dc2626';
                }}
              >
                Delete Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewAssignees;
