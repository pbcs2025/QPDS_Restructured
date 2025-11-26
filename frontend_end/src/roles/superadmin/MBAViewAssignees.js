import React, { useEffect, useState } from "react";
import "./viewAssignees.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function MBAViewAssignees() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [assigneesData, setAssigneesData] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);
  
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [departments, setDepartments] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedSubjectCode, setSelectedSubjectCode] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // For searchable dropdowns
  const [deptSearchTerm, setDeptSearchTerm] = useState("");
  const [semesterSearchTerm, setSemesterSearchTerm] = useState("");
  const [subjectSearchTerm, setSubjectSearchTerm] = useState("");
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [showSemesterDropdown, setShowSemesterDropdown] = useState(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  
  // Keyboard navigation - highlighted index for each dropdown
  const [highlightedDeptIndex, setHighlightedDeptIndex] = useState(-1);
  const [highlightedSemesterIndex, setHighlightedSemesterIndex] = useState(-1);
  const [highlightedSubjectIndex, setHighlightedSubjectIndex] = useState(-1);

  // Fetch MBA departments
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error("No authentication token found");
      return;
    }
    
    fetch(`${API_BASE}/mbadepartments/active`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("MBA Departments fetched:", data);
        if (Array.isArray(data)) {
          const deptNames = data.map(d => typeof d === "string" ? d : (d.name || d.department || ""));
          const uniqueDepts = [...new Set(deptNames.filter(Boolean))].sort();
          console.log("Processed MBA departments:", uniqueDepts);
          setDepartments(uniqueDepts);
        }
      })
      .catch((err) => {
        console.error("Error fetching MBA departments:", err);
        setDepartments([]);
      });
  }, []);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('[data-dropdown]')) {
        setShowDeptDropdown(false);
        setShowSemesterDropdown(false);
        setShowSubjectDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch all assigned MBA subjects on mount
  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setError("No authentication token found. Please login again.");
      setLoading(false);
      return;
    }
    
    fetch(`${API_BASE}/mbaassignedSubjects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async (res) => {
        if (!res.ok) {
          const contentType = res.headers.get("content-type");
          let errorMessage = `Status ${res.status}`;
          if (contentType && contentType.includes("application/json")) {
            try {
              const errorData = await res.json();
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (e) {
              const text = await res.text();
              errorMessage = text || errorMessage;
            }
          } else {
            const text = await res.text();
            errorMessage = text || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Non-JSON response:", text);
          throw new Error("Server returned non-JSON response");
        }
        
        let data;
        try {
          data = await res.json();
        } catch (jsonErr) {
          console.error("JSON parse error:", jsonErr);
          const text = await res.text();
          console.error("Response text:", text);
          throw new Error("Failed to parse server response");
        }
        
        return data;
      })
      .then(async (data) => {
        console.log("MBA Assigned subjects fetched (raw):", data);
        
        if (Array.isArray(data)) {
          // Fetch MBA subject details to get department and semester
          try {
            const subjectsRes = await fetch(`${API_BASE}/mbasubjects`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (subjectsRes.ok) {
              const subjectsData = await subjectsRes.json();
              console.log("MBA Subjects data fetched:", subjectsData);
              
              // Create a map of subject_code to subject details
              const subjectMap = {};
              if (Array.isArray(subjectsData)) {
                subjectsData.forEach(sub => {
                  if (sub.subject_code) {
                    subjectMap[sub.subject_code] = {
                      department: sub.department || '',
                      semester: sub.semester || null,
                      subject_name: sub.subject_name || ''
                    };
                  }
                });
              }
              
              // Enrich assigned subjects with department and semester
              const enrichedData = data.map(assigned => {
                const subjectInfo = subjectMap[assigned.subject_code] || {};
                return {
                  ...assigned,
                  department: subjectInfo.department || (assigned.assignees && assigned.assignees[0]?.deptName) || '',
                  semester: subjectInfo.semester || null,
                  subject_name: subjectInfo.subject_name || assigned.subject_code
                };
              });
              
              console.log("Enriched MBA assigned subjects:", enrichedData);
              setSubjects(enrichedData);
            } else {
              // If subject fetch fails, use assignee departments
              const enrichedData = data.map(assigned => ({
                ...assigned,
                department: (assigned.assignees && assigned.assignees[0]?.deptName) || '',
                semester: null,
                subject_name: assigned.subject_code
              }));
              setSubjects(enrichedData);
            }
          } catch (err) {
            console.error("Error fetching MBA subject details:", err);
            // Fallback: use assignee departments
            const enrichedData = data.map(assigned => ({
              ...assigned,
              department: (assigned.assignees && assigned.assignees[0]?.deptName) || '',
              semester: null,
              subject_name: assigned.subject_code
            }));
            setSubjects(enrichedData);
          }
        } else {
          setSubjects([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError(`Failed to load assigned MBA subjects: ${err.message || 'Unknown error'}`);
        setLoading(false);
      });
  }, []);

  // Auto-cleanup: Remove recent assignments older than 5 hours every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setSubjects(prevSubjects => {
        return prevSubjects.map(subject => {
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
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Fetch assignees when subject is clicked
  const handleCardClick = (subjectCode) => {
    setSelectedSubject(subjectCode);
    setTableLoading(true);
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/mbaassignments/${encodeURIComponent(subjectCode)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async (res) => {
        if (!res.ok) {
          const contentType = res.headers.get("content-type");
          let errorMessage = `Status ${res.status}`;
          if (contentType && contentType.includes("application/json")) {
            try {
              const errorData = await res.json();
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (e) {
              const text = await res.text();
              errorMessage = text || errorMessage;
            }
          } else {
            const text = await res.text();
            errorMessage = text || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error("Non-JSON response:", text);
          throw new Error("Server returned non-JSON response");
        }
        
        let data;
        try {
          data = await res.json();
        } catch (jsonErr) {
          console.error("JSON parse error:", jsonErr);
          const text = await res.text();
          console.error("Response text:", text);
          throw new Error("Failed to parse server response");
        }
        
        console.log(data);
        setAssigneesData(data);
        setTableLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError(`Failed to load assignees: ${err.message || 'Unknown error'}`);
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
    setSelectedSemester("");
    setSelectedSubjectCode("");
    setDeptSearchTerm("");
    setSemesterSearchTerm("");
    setSubjectSearchTerm("");
    setShowDeptDropdown(false);
    setShowSemesterDropdown(false);
    setShowSubjectDropdown(false);
  };
  
  // Fixed semesters list for MBA (Semester 1 to Semester 4)
  const fixedSemesters = [1, 2, 3, 4];
  
  // Filter departments based on search term
  const filteredDepartments = departments.filter(dept => 
    dept.toLowerCase().includes(deptSearchTerm.toLowerCase())
  );
  
  // Filter semesters based on search term (from fixed list)
  const filteredSemesters = fixedSemesters.filter(sem => 
    String(sem).toLowerCase().includes(semesterSearchTerm.toLowerCase()) ||
    `semester ${sem}`.toLowerCase().includes(semesterSearchTerm.toLowerCase())
  );
  
  // Handle keyboard navigation for Department dropdown
  const handleDeptKeyDown = (e) => {
    if (!showDeptDropdown || filteredDepartments.length === 0) {
      if (e.key === 'ArrowDown' && filteredDepartments.length > 0) {
        setShowDeptDropdown(true);
        setHighlightedDeptIndex(0);
      }
      return;
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedDeptIndex(prev => {
        const next = prev < filteredDepartments.length - 1 ? prev + 1 : (prev === -1 ? 0 : prev);
        setTimeout(() => {
          const dropdownEl = document.querySelector('[data-dept-dropdown-list]');
          const itemEl = dropdownEl?.children[next];
          if (itemEl) {
            itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }, 0);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedDeptIndex(prev => {
        const next = prev > 0 ? prev - 1 : 0;
        setTimeout(() => {
          const dropdownEl = document.querySelector('[data-dept-dropdown-list]');
          const itemEl = dropdownEl?.children[next];
          if (itemEl) {
            itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }, 0);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedDeptIndex >= 0 && highlightedDeptIndex < filteredDepartments.length) {
        const selectedDept = filteredDepartments[highlightedDeptIndex];
        setSelectedDepartment(selectedDept);
        setDeptSearchTerm(selectedDept);
        setShowDeptDropdown(false);
        setHighlightedDeptIndex(-1);
        setSelectedSemester("");
        setSemesterSearchTerm("");
        setSelectedSubjectCode("");
        setSubjectSearchTerm("");
      }
    } else if (e.key === 'Escape') {
      setShowDeptDropdown(false);
      setHighlightedDeptIndex(-1);
    }
  };
  
  // Handle keyboard navigation for Semester dropdown
  const handleSemesterKeyDown = (e) => {
    if (!selectedDepartment) return;
    
    if (!showSemesterDropdown || filteredSemesters.length === 0) {
      if (e.key === 'ArrowDown' && filteredSemesters.length > 0) {
        setShowSemesterDropdown(true);
        setHighlightedSemesterIndex(0);
      }
      return;
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedSemesterIndex(prev => {
        const next = prev < filteredSemesters.length - 1 ? prev + 1 : (prev === -1 ? 0 : prev);
        setTimeout(() => {
          const dropdownEl = document.querySelector('[data-semester-dropdown-list]');
          const itemEl = dropdownEl?.children[next];
          if (itemEl) {
            itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }, 0);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedSemesterIndex(prev => {
        const next = prev > 0 ? prev - 1 : 0;
        setTimeout(() => {
          const dropdownEl = document.querySelector('[data-semester-dropdown-list]');
          const itemEl = dropdownEl?.children[next];
          if (itemEl) {
            itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }, 0);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedSemesterIndex >= 0 && highlightedSemesterIndex < filteredSemesters.length) {
        const selectedSem = String(filteredSemesters[highlightedSemesterIndex]);
        setSelectedSemester(selectedSem);
        setSemesterSearchTerm(`Semester ${selectedSem}`);
        setShowSemesterDropdown(false);
        setHighlightedSemesterIndex(-1);
        setSelectedSubjectCode("");
        setSubjectSearchTerm("");
      }
    } else if (e.key === 'Escape') {
      setShowSemesterDropdown(false);
      setHighlightedSemesterIndex(-1);
    }
  };
  
  // Handle keyboard navigation for Subject Code dropdown
  const handleSubjectKeyDown = (e) => {
    if (!selectedDepartment) return;
    
    if (!showSubjectDropdown || filteredSubjectCodes.length === 0) {
      if (e.key === 'ArrowDown' && filteredSubjectCodes.length > 0 && selectedDepartment) {
        setShowSubjectDropdown(true);
        setHighlightedSubjectIndex(0);
      }
      return;
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedSubjectIndex(prev => {
        const next = prev < filteredSubjectCodes.length - 1 ? prev + 1 : (prev === -1 ? 0 : prev);
        setTimeout(() => {
          const dropdownEl = document.querySelector('[data-subject-dropdown-list]');
          const itemEl = dropdownEl?.children[next];
          if (itemEl) {
            itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }, 0);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedSubjectIndex(prev => {
        const next = prev > 0 ? prev - 1 : 0;
        setTimeout(() => {
          const dropdownEl = document.querySelector('[data-subject-dropdown-list]');
          const itemEl = dropdownEl?.children[next];
          if (itemEl) {
            itemEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }, 0);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedSubjectIndex >= 0 && highlightedSubjectIndex < filteredSubjectCodes.length) {
        const selectedCode = filteredSubjectCodes[highlightedSubjectIndex];
        setSelectedSubjectCode(selectedCode);
        setSubjectSearchTerm(selectedCode);
        setShowSubjectDropdown(false);
        setHighlightedSubjectIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowSubjectDropdown(false);
      setHighlightedSubjectIndex(-1);
    }
  };
  
  // Get subject codes filtered by department and semester
  const getFilteredSubjectCodes = () => {
    if (!selectedDepartment) return [];
    
    let filtered = subjects.filter(subject => {
      const subjectDept = subject.department || '';
      const matchesSubjectDept = subjectDept.toLowerCase() === selectedDepartment.toLowerCase();
      const matchesAssigneeDept = subject.assignees && subject.assignees.some(assignee => 
        assignee.deptName && assignee.deptName.toLowerCase() === selectedDepartment.toLowerCase()
      );
      return matchesSubjectDept || matchesAssigneeDept;
    });
    
    if (selectedSemester) {
      filtered = filtered.filter(subject => {
        return subject.semester && String(subject.semester) === String(selectedSemester);
      });
    }
    
    const codes = new Set();
    filtered.forEach(subject => {
      if (subject.subject_code) {
        codes.add(subject.subject_code);
      }
    });
    
    const subjectCodes = Array.from(codes).sort();
    return subjectCodes.filter(code => 
      code.toLowerCase().includes(subjectSearchTerm.toLowerCase())
    );
  };
  
  const filteredSubjectCodes = getFilteredSubjectCodes();

  // Handle delete assignment
  const handleDeleteClick = (e, subjectCode) => {
    e.stopPropagation();
    setSubjectToDelete(subjectCode);
    setShowDeleteDialog(true);
  };

  // Confirm delete assignment
  const confirmDelete = () => {
    if (subjectToDelete) {
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

  // Handle message button click
  const handleMessageClick = (faculty) => {
    setSelectedFaculty(faculty);
    setShowMessageModal(true);
  };

  // Close message modal
  const closeMessageModal = () => {
    setShowMessageModal(false);
    setSelectedFaculty(null);
  };

  // Send message to faculty
  const sendMessage = async (messageType) => {
    if (!selectedFaculty) return;

    setSendingMessage(true);
    try {
      const response = await fetch(`${API_BASE}/mbafaculty/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: selectedFaculty.email,
          messageType: messageType,
          subjectCode: selectedSubject,
          submitDate: selectedFaculty.submitDate,
          facultyName: selectedFaculty.facultyName,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`Message sent successfully to ${selectedFaculty.facultyName}!`);
        closeMessageModal();
      } else {
        alert(data.error || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please check your connection and try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) return <p>Loading assigned MBA subjects...</p>;
  if (error && !selectedSubject) return <p>{error}</p>;

  // Filter recent assignments (less than 5 hours old)
  const getRecentAssignments = () => {
    return subjects.filter(subject => {
      const timestamp = subject.assigned_at || subject.assignedAt || subject.createdAt || subject.created_at;
      
      if (timestamp) {
        const createdDate = new Date(timestamp);
        const now = new Date();
        const hoursDiff = (now - createdDate) / (1000 * 60 * 60);
        return hoursDiff < 5;
      }
      
      return true;
    }).slice(0, 6);
  };

  // Filter subjects by selected department, semester, and subject code
  const getFilteredSubjects = () => {
    if (!selectedDepartment) return [];
    
    let filtered = subjects.filter(subject => {
      const subjectDept = subject.department || '';
      const matchesSubjectDept = subjectDept.toLowerCase() === selectedDepartment.toLowerCase();
      const matchesAssigneeDept = subject.assignees && subject.assignees.some(assignee => 
        assignee.deptName && assignee.deptName.toLowerCase() === selectedDepartment.toLowerCase()
      );
      return matchesSubjectDept || matchesAssigneeDept;
    });
    
    if (selectedSemester) {
      filtered = filtered.filter(subject => {
        return subject.semester && String(subject.semester) === String(selectedSemester);
      });
    }
    
    if (selectedSubjectCode) {
      filtered = filtered.filter(subject => {
        return subject.subject_code && subject.subject_code.toLowerCase() === selectedSubjectCode.toLowerCase();
      });
    }
    
    return filtered;
  };

  const recentAssignments = getRecentAssignments();
  const filteredSubjects = getFilteredSubjects();

  return (
    <div className="view-assignees-container">
      <h1 className="view-assignees-title">View MBA Assignees</h1>

      {/* Search Filters */}
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
              🔍 Search MBA Assignments
            </h2>
            {(selectedDepartment || selectedSemester || selectedSubjectCode) && (
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
                ← Clear All Filters
              </button>
            )}
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '16px',
            marginBottom: 16
          }}>
            {/* Department Searchable Dropdown */}
            <div style={{ position: 'relative' }} data-dropdown>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151', fontSize: 14 }}>
                MBA Department <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={selectedDepartment ? selectedDepartment : deptSearchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDeptSearchTerm(value);
                    setSelectedDepartment("");
                    setHighlightedDeptIndex(-1);
                    setSelectedSemester("");
                    setSemesterSearchTerm("");
                    setSelectedSubjectCode("");
                    setSubjectSearchTerm("");
                    if (value) {
                      setShowDeptDropdown(true);
                    } else {
                      setShowDeptDropdown(false);
                    }
                  }}
                  onFocus={() => {
                    setShowDeptDropdown(true);
                    if (selectedDepartment) {
                      setDeptSearchTerm(selectedDepartment);
                      setSelectedDepartment("");
                    }
                    setHighlightedDeptIndex(-1);
                  }}
                  onClick={() => {
                    setShowDeptDropdown(true);
                    if (selectedDepartment) {
                      setDeptSearchTerm(selectedDepartment);
                      setSelectedDepartment("");
                    }
                    setHighlightedDeptIndex(-1);
                  }}
                  onKeyDown={handleDeptKeyDown}
                  placeholder="Type to search MBA department..."
                  style={{
                    marginLeft: '1px',
                    padding: '12px 16px',
                    width: '100%',
                    borderRadius: 8,
                    border: '2px solid #d1d5db',
                    fontSize: 15,
                    background: 'white',
                    transition: 'all 0.2s ease'
                  }}
                />
                {showDeptDropdown && filteredDepartments.length > 0 && (
                  <div 
                    data-dept-dropdown-list
                    style={{
                      marginLeft: '1px',
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: 'white',
                      border: '2px solid #d1d5db',
                      borderRadius: 8,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                    {filteredDepartments.map((dept, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedDepartment(dept);
                          setDeptSearchTerm(dept);
                          setShowDeptDropdown(false);
                          setHighlightedDeptIndex(-1);
                          setSelectedSemester("");
                          setSemesterSearchTerm("");
                          setSelectedSubjectCode("");
                          setSubjectSearchTerm("");
                        }}
                        style={{
                          marginLeft: '1px',
                          padding: '12px 16px',
                          cursor: 'pointer',
                          fontSize: 14,
                          borderBottom: idx < filteredDepartments.length - 1 ? '1px solid #e5e7eb' : 'none',
                          background: highlightedDeptIndex === idx ? '#4f46e5' : (selectedDepartment === dept ? '#eff6ff' : 'white'),
                          color: highlightedDeptIndex === idx ? 'white' : (selectedDepartment === dept ? '#1e40af' : '#374151')
                        }}
                        onMouseEnter={() => {
                          setHighlightedDeptIndex(idx);
                        }}
                      >
                        {dept}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Semester Searchable Dropdown */}
            <div style={{ position: 'relative' }} data-dropdown>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151', fontSize: 14 }}>
                Semester {!selectedDepartment && <span style={{ color: '#dc2626' }}>*</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={selectedSemester ? `Semester ${selectedSemester}` : semesterSearchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSemesterSearchTerm(value);
                    setSelectedSemester("");
                    setHighlightedSemesterIndex(-1);
                    if (value) {
                      setShowSemesterDropdown(true);
                    } else {
                      setShowSemesterDropdown(false);
                    }
                  }}
                  onFocus={() => {
                    if (selectedDepartment) {
                      setShowSemesterDropdown(true);
                      if (selectedSemester) {
                        setSemesterSearchTerm(`Semester ${selectedSemester}`);
                        setSelectedSemester("");
                      }
                      setHighlightedSemesterIndex(-1);
                    }
                  }}
                  onClick={() => {
                    if (selectedDepartment) {
                      setShowSemesterDropdown(true);
                      if (selectedSemester) {
                        setSemesterSearchTerm(`Semester ${selectedSemester}`);
                        setSelectedSemester("");
                      }
                      setHighlightedSemesterIndex(-1);
                    }
                  }}
                  onKeyDown={handleSemesterKeyDown}
                  placeholder={selectedDepartment ? "Type to search semester..." : "Select department first"}
                  disabled={!selectedDepartment}
                  style={{
                    marginLeft: '1px',
                    padding: '12px 16px',
                    width: '100%',
                    borderRadius: 8,
                    border: '2px solid #d1d5db',
                    fontSize: 15,
                    background: selectedDepartment ? 'white' : '#f3f4f6',
                    transition: 'all 0.2s ease',
                    cursor: selectedDepartment ? 'text' : 'not-allowed',
                    opacity: selectedDepartment ? 1 : 0.6
                  }}
                />
                {showSemesterDropdown && filteredSemesters.length > 0 && selectedDepartment && (
                  <div 
                    data-semester-dropdown-list
                    style={{
                      marginLeft: '1px',
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: 'white',
                      border: '2px solid #d1d5db',
                      borderRadius: 8,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                    {filteredSemesters.map((sem, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedSemester(String(sem));
                          setSemesterSearchTerm(`Semester ${sem}`);
                          setShowSemesterDropdown(false);
                          setHighlightedSemesterIndex(-1);
                          setSelectedSubjectCode("");
                          setSubjectSearchTerm("");
                        }}
                        style={{
                          marginLeft: '1px',
                          padding: '12px 16px',
                          cursor: 'pointer',
                          fontSize: 14,
                          borderBottom: idx < filteredSemesters.length - 1 ? '1px solid #e5e7eb' : 'none',
                          background: highlightedSemesterIndex === idx ? '#4f46e5' : (selectedSemester === String(sem) ? '#eff6ff' : 'white'),
                          color: highlightedSemesterIndex === idx ? 'white' : (selectedSemester === String(sem) ? '#1e40af' : '#374151')
                        }}
                        onMouseEnter={() => {
                          setHighlightedSemesterIndex(idx);
                        }}
                      >
                        Semester {sem}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Subject Code Searchable Dropdown */}
            <div style={{ position: 'relative', marginLeft: '1px' }} data-dropdown>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151', fontSize: 14, marginLeft: '1px' }}>
                Subject Code
              </label>
              <div style={{ position: 'relative', marginLeft:'1px' }}>
                <input
                  type="text"
                  value={selectedSubjectCode ? selectedSubjectCode : subjectSearchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSubjectSearchTerm(value);
                    setSelectedSubjectCode("");
                    setHighlightedSubjectIndex(-1);
                    if (value) {
                      setShowSubjectDropdown(true);
                    } else {
                      setShowSubjectDropdown(false);
                    }
                  }}
                  onFocus={() => {
                    if (selectedDepartment) {
                      setShowSubjectDropdown(true);
                      if (selectedSubjectCode) {
                        setSubjectSearchTerm(selectedSubjectCode);
                        setSelectedSubjectCode("");
                      }
                      setHighlightedSubjectIndex(-1);
                    }
                  }}
                  onClick={() => {
                    if (selectedDepartment) {
                      setShowSubjectDropdown(true);
                      if (selectedSubjectCode) {
                        setSubjectSearchTerm(selectedSubjectCode);
                        setSelectedSubjectCode("");
                      }
                      setHighlightedSubjectIndex(-1);
                    }
                  }}
                  onKeyDown={handleSubjectKeyDown}
                  placeholder={selectedDepartment ? "Type to search subject code..." : "Select department first"}
                  disabled={!selectedDepartment}
                  style={{
                    marginLeft: '1px',
                    padding: '12px 16px',
                    width: '100%',
                    borderRadius: 8,
                    border: '2px solid #d1d5db',
                    fontSize: 15,
                    background: selectedDepartment ? 'white' : '#f3f4f6',
                    transition: 'all 0.2s ease',
                    cursor: selectedDepartment ? 'text' : 'not-allowed',
                    opacity: selectedDepartment ? 1 : 0.6
                  }}
                />
                {showSubjectDropdown && filteredSubjectCodes.length > 0 && selectedDepartment && (
                  <div 
                    data-subject-dropdown-list
                    style={{
                      marginLeft: '1px',
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: 'white',
                      border: '2px solid #d1d5db',
                      borderRadius: 8,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  >
                    {filteredSubjectCodes.map((code, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedSubjectCode(code);
                          setSubjectSearchTerm(code);
                          setShowSubjectDropdown(false);
                          setHighlightedSubjectIndex(-1);
                        }}
                        style={{
                          marginLeft: '1px',
                          padding: '12px 16px',
                          cursor: 'pointer',
                          fontSize: 14,
                          borderBottom: idx < filteredSubjectCodes.length - 1 ? '1px solid #e5e7eb' : 'none',
                          background: highlightedSubjectIndex === idx ? '#4f46e5' : (selectedSubjectCode === code ? '#eff6ff' : 'white'),
                          color: highlightedSubjectIndex === idx ? 'white' : (selectedSubjectCode === code ? '#1e40af' : '#374151')
                        }}
                        onMouseEnter={() => {
                          setHighlightedSubjectIndex(idx);
                        }}
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
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
              ✓ Showing MBA assignments for <strong>{selectedDepartment}</strong>
              {selectedSemester && ` - Semester ${selectedSemester}`}
              {selectedSubjectCode && ` - ${selectedSubjectCode}`}
            </div>
          )}
        </div>
      )}

      {/* Recent Assignments Section */}
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
            🕒 Recent MBA Assignments (Last 5 Hours)
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
            ℹ️ <strong>Note:</strong> Recent assignments are automatically removed from this section after 5 hours.
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
                <p style={{ margin: 0, fontSize: 16 }}>No recent MBA assignments found.</p>
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
                    zIndex: 10,
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

      {/* Filtered Assignments Section */}
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
            📚 Filtered MBA Assignments
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
            No MBA assignments found for <strong>{selectedDepartment}</strong>
            {selectedSemester && ` - Semester ${selectedSemester}`}
            {selectedSubjectCode && ` - ${selectedSubjectCode}`}
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
                  <h3>MBA Faculties</h3>
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
                              onClick={() => handleMessageClick(fac)}
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

      {/* Message Modal */}
      {showMessageModal && selectedFaculty && (
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
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#1e40af',
              fontSize: 20,
              fontWeight: 700
            }}>
              📧 Send Message to {selectedFaculty.facultyName}
            </h3>
            <p style={{
              margin: '0 0 20px 0',
              color: '#64748b',
              fontSize: 14,
              lineHeight: 1.5
            }}>
              Select the type of message you want to send:
            </p>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <button
                onClick={() => sendMessage('reminder')}
                disabled={sendingMessage}
                style={{
                  background: sendingMessage ? '#e5e7eb' : '#fff3cd',
                  border: '2px solid #ffc107',
                  borderRadius: 8,
                  padding: '16px',
                  cursor: sendingMessage ? 'not-allowed' : 'pointer',
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#856404',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onMouseEnter={(e) => {
                  if (!sendingMessage) {
                    e.target.style.background = '#ffe69c';
                    e.target.style.transform = 'translateX(4px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!sendingMessage) {
                    e.target.style.background = '#fff3cd';
                    e.target.style.transform = 'translateX(0)';
                  }
                }}
              >
                <span style={{ fontSize: '20px' }}>⏰</span>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>Reminder (Deadline Reminder)</div>
                  <div style={{ fontSize: 13, fontWeight: 400, opacity: 0.8 }}>
                    Send a reminder about the submission deadline
                  </div>
                </div>
              </button>

              <button
                onClick={() => sendMessage('earlySubmission')}
                disabled={sendingMessage}
                style={{
                  background: sendingMessage ? '#e5e7eb' : '#d1ecf1',
                  border: '2px solid #0c5460',
                  borderRadius: 8,
                  padding: '16px',
                  cursor: sendingMessage ? 'not-allowed' : 'pointer',
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#0c5460',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
                onMouseEnter={(e) => {
                  if (!sendingMessage) {
                    e.target.style.background = '#b8dce8';
                    e.target.style.transform = 'translateX(4px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!sendingMessage) {
                    e.target.style.background = '#d1ecf1';
                    e.target.style.transform = 'translateX(0)';
                  }
                }}
              >
                <span style={{ fontSize: '20px' }}>📝</span>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>Request for Early Submission</div>
                  <div style={{ fontSize: 13, fontWeight: 400, opacity: 0.8 }}>
                    Request to submit as early as possible
                  </div>
                </div>
              </button>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={closeMessageModal}
                disabled={sendingMessage}
                style={{
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  padding: '8px 16px',
                  cursor: sendingMessage ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#374151',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!sendingMessage) {
                    e.target.style.background = '#e5e7eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!sendingMessage) {
                    e.target.style.background = '#f3f4f6';
                  }
                }}
              >
                {sendingMessage ? 'Sending...' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
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
              Are you sure you want to delete the MBA assignment for <strong>{subjectToDelete}</strong>? This action cannot be undone.
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

export default MBAViewAssignees;

