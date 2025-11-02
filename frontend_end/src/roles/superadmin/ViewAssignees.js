import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import "./viewAssignees.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function ViewAssignees() {
  const location = useLocation();
  const navigate = useNavigate();
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
    setSelectedSemester("");
    setSelectedSubjectCode("");
    setDeptSearchTerm("");
    setSemesterSearchTerm("");
    setSubjectSearchTerm("");
  };
  
  // Fixed semesters list (Semester 1 to Semester 8)
  const fixedSemesters = [1, 2, 3, 4, 5, 6, 7, 8];
  
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
        // Scroll to highlighted item
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
        // Clear semester and subject code when department is selected
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
        // Clear subject code when semester changes
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
      // Check if subject department matches OR any assignee belongs to the selected department
      const subjectDept = subject.department || '';
      const matchesSubjectDept = subjectDept.toLowerCase() === selectedDepartment.toLowerCase();
      const matchesAssigneeDept = subject.assignees && subject.assignees.some(assignee => 
        assignee.deptName && assignee.deptName.toLowerCase() === selectedDepartment.toLowerCase()
      );
      return matchesSubjectDept || matchesAssigneeDept;
    });
    
    // Further filter by semester if selected
    if (selectedSemester) {
      filtered = filtered.filter(subject => {
        return subject.semester && String(subject.semester) === String(selectedSemester);
      });
    }
    
    // Extract unique subject codes
    const codes = new Set();
    filtered.forEach(subject => {
      if (subject.subject_code) {
        codes.add(subject.subject_code);
      }
    });
    
    // Then filter by search term
    const subjectCodes = Array.from(codes).sort();
    return subjectCodes.filter(code => 
      code.toLowerCase().includes(subjectSearchTerm.toLowerCase())
    );
  };
  
  const filteredSubjectCodes = getFilteredSubjectCodes();

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

  // Messaging handlers
  const handleMessageClick = (fac) => {
    // Original behavior: simple in-app alert
    if (fac && fac.facultyName) {
      alert(`Messaging ${fac.facultyName}`);
    } else {
      alert('Messaging');
    }
  };

  const closeMessageModal = () => {
    setShowMessageModal(false);
    setSelectedFaculty(null);
    setSendingMessage(false);
  };

  const sendMessage = (type) => {
    // Keep behavior consistent with original request: alert and close
    const name = selectedFaculty?.facultyName || '';
    alert(`Messaging ${name}`);
    closeMessageModal();
  };

  // Deep link support from ViewAnalytics: ?tab=viewAssignees&subject=...&department=...&semester=...
  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const tab = params.get('tab');
    if (tab === 'viewAssignees') {
      const dep = params.get('department');
      const subj = params.get('subject');
      const sem = params.get('semester');
      if (dep) setSelectedDepartment(dep);
      if (sem) setSelectedSemester(String(sem));
      if (subj && selectedSubject !== subj) {
        handleCardClick(subj);
      }
    }
    // Depend on location.search and selectedSubject to avoid duplicate fetches
  }, [location.search, selectedSubject]);

  useEffect(() => {
    const reloadSubjects = async () => {
      try {
        const res = await fetch(`${API_BASE}/assignedSubjects`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        setSubjects(data || []);
      } catch (err) {
        console.error("Socket refresh subjects error:", err);
      }
    };

    const reloadCurrentAssignees = async () => {
      if (!selectedSubject) return;
      try {
        const res = await fetch(`${API_BASE}/assignments/${encodeURIComponent(selectedSubject)}`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        setAssigneesData(data);
      } catch (err) {
        console.error("Socket refresh assignees error:", err);
      }
    };

    const socketURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';
    const socket = io(socketURL);

    const onAnyAssignmentChange = () => {
      reloadSubjects();
      reloadCurrentAssignees();
    };

    socket.on('assignment_created', onAnyAssignmentChange);
    socket.on('assignment_updated', onAnyAssignmentChange);
    socket.on('assignment_deleted', onAnyAssignmentChange);
    socket.on('paper_approved', onAnyAssignmentChange);

    socket.on('connect_error', (error) => {
      console.error('Socket connection error (ViewAssignees):', error);
    });

    return () => {
      socket.off('assignment_created', onAnyAssignmentChange);
      socket.off('assignment_updated', onAnyAssignmentChange);
      socket.off('assignment_deleted', onAnyAssignmentChange);
      socket.off('paper_approved', onAnyAssignmentChange);
      socket.disconnect();
    };
  }, [selectedSubject]);

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

  // Filter subjects by selected department, semester, and subject code
  // Department is REQUIRED first
  const getFilteredSubjects = () => {
    if (!selectedDepartment) return [];
    
    let filtered = subjects.filter(subject => {
      // Check if subject department matches OR any assignee belongs to the selected department
      const subjectDept = subject.department || '';
      const matchesSubjectDept = subjectDept.toLowerCase() === selectedDepartment.toLowerCase();
      const matchesAssigneeDept = subject.assignees && subject.assignees.some(assignee => 
        assignee.deptName && assignee.deptName.toLowerCase() === selectedDepartment.toLowerCase()
      );
      return matchesSubjectDept || matchesAssigneeDept;
    });
    
    // Filter by semester if selected
    if (selectedSemester) {
      filtered = filtered.filter(subject => {
        return subject.semester && String(subject.semester) === String(selectedSemester);
      });
    }
    
    // Filter by subject code if selected
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
      <h1 className="view-assignees-title">View Assignees</h1>

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
              🔍 Search Assignments
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
                Department <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={selectedDepartment ? selectedDepartment : deptSearchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDeptSearchTerm(value);
                    setSelectedDepartment("");
                    setHighlightedDeptIndex(-1); // Reset highlight when typing
                    // Clear semester and subject code when department changes
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
                  placeholder="Type to search department..."
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
                          // Clear semester and subject code when department is selected
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
                        onMouseLeave={() => {
                          // Don't reset on mouse leave to keep keyboard navigation working
                        }}
                      >
                        {dept}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Semester Searchable Dropdown - Only enabled if department is selected */}
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
                    setHighlightedSemesterIndex(-1); // Reset highlight when typing
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
                          // Clear subject code when semester changes
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

            {/* Subject Code Searchable Dropdown - Only enabled if department is selected */}
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
                    setHighlightedSubjectIndex(-1); // Reset highlight when typing
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
              ✓ Showing assignments for <strong>{selectedDepartment}</strong>
              {selectedSemester && ` - Semester ${selectedSemester}`}
              {selectedSubjectCode && ` - ${selectedSubjectCode}`}
            </div>
          )}
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
                    top: '100px',
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

      {/* Filtered Assignments Section - Only show if department is selected */}
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
            📚 Filtered Assignments
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
            No assignments found for <strong>{selectedDepartment}</strong>
            {selectedSemester && ` - Semester ${selectedSemester}`}
            {selectedSubjectCode && ` - ${selectedSubjectCode}`}
          </p>
        </div>
      )}

      {/* Assignees Table View */}
      {selectedSubject && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button className="back-btn" onClick={handleBack}>
              ← Back to Subjects
            </button>
            <button
              className="back-btn"
              onClick={() => navigate('/super-admin-dashboard?tab=viewAnalytics')}
            >
              ← Back to View Analytics
            </button>
          </div>
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
                        <tr
                          key={idx}
                          style={{
                            backgroundColor:
                              (fac.status === 'submitted' || fac.status === 'completed')
                                ? 'transparent'
                                : '#fff1f2' // light red for pending
                          }}
                        >
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
