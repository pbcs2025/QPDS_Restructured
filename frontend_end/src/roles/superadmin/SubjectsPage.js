import React, { useEffect, useState } from "react";
import "../../common/dashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newSubject, setNewSubject] = useState({
    subject_code: "",
    subject_name: "",
    department: "",
    semester: "",
    credits: "",
  });
  const [message, setMessage] = useState("");


  // Function to get contrasting text color
  const getContrastColor = (hexColor) => {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  // Fetch subjects
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/subjects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => setSubjects(data || []))
      .catch((err) => {
        console.error("Fetch error (subjects):", err);
        setSubjects([]);
      });
  }, []);

  // Fetch departments from DB
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/departments/active`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        // Normalize name field and sort alphabetically (case-insensitive)
        const sorted = [...list].sort((a, b) => {
          const an = (a.name || a.department || '').toLowerCase();
          const bn = (b.name || b.department || '').toLowerCase();
          if (an < bn) return -1;
          if (an > bn) return 1;
          return 0;
        });
        setDepartments(sorted);
      })
      .catch((err) => {
        console.error("Fetch error (departments):", err);
        setDepartments([]);
      });
  }, []);

  // Filter subjects for selected department
  const filteredSubjects = selectedDept
    ? subjects.filter((s) => s.department === selectedDept)
    : [];

  // Group subjects by semester
  const groupedBySemester = filteredSubjects.reduce((acc, sub) => {
    if (!acc[sub.semester]) acc[sub.semester] = [];
    acc[sub.semester].push(sub);
    return acc;
  }, {});

  // Get available semesters for selected department
  const availableSemesters = selectedDept 
    ? Object.keys(groupedBySemester).sort((a, b) => parseInt(a) - parseInt(b))
    : [];

  // Filter subjects for selected semester
  const semesterSubjects = selectedSemester 
    ? groupedBySemester[selectedSemester] || []
    : [];

  // Add subject
  const handleAdd = async () => {
    setMessage("");
    if (
      !newSubject.subject_code ||
      !newSubject.subject_name ||
      !newSubject.department ||
      !newSubject.semester ||
      !newSubject.credits
    ) {
      setMessage("❌ Please fill all fields.");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/subjects`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSubject),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Subject added successfully.");
        setNewSubject({
          subject_code: "",
          subject_name: "",
          department: "",
          semester: "",
          credits: "",
        });
        setShowForm(false);
        
        // Refresh subjects data without page reload
        const token = localStorage.getItem('token');
        fetch(`${API_BASE}/subjects`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
          })
          .then((data) => setSubjects(data || []))
          .catch((err) => {
            console.error("Fetch error (subjects):", err);
            setSubjects([]);
          });
      } else {
        setMessage("❌ " + (data.error || "Failed to add subject"));
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to add subject.");
    }
  };

  // Delete subject
  const handleDelete = (id) => {
    if (window.confirm("Delete this subject?")) {
      const token = localStorage.getItem('token');
      fetch(`${API_BASE}/subjects/${id}`, { 
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(() => {
          // Refresh subjects data without page reload
          fetch(`${API_BASE}/subjects`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
            .then((res) => {
              if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
              return res.json();
            })
            .then((data) => setSubjects(data || []))
            .catch((err) => {
              console.error("Fetch error (subjects):", err);
              setSubjects([]);
            });
        })
        .catch((err) => {
          console.error("Delete error:", err);
          setMessage("❌ Failed to delete subject.");
        });
    }
  };

  // Back to department cards
  const handleBack = () => {
    setSelectedDept(null);
    setSelectedSemester(null);
    setShowForm(false);
    setMessage("");
  };

  // Back to semester cards
  const handleBackToSemesters = () => {
    setSelectedSemester(null);
    setShowForm(false);
    setMessage("");
  };

  return (
    <div className="subjects-container">
      {/* Add Subject button stays at the top */}
      <button
        className="add-btn"
        onClick={() => {
          setShowForm((prev) => !prev);
          if (!showForm) {
            // Pre-populate form based on current context
            setNewSubject({
              subject_code: "",
              subject_name: "",
              department: selectedDept || "",
              semester: selectedSemester || "",
              credits: "",
            });
          }
        }}
      >
        {showForm ? "Cancel" : "+ Add New Subject"}
      </button>

      {/* Add Subject Form */}
      {showForm && (
        <div className="reset-form">
          <h2>Add Subject</h2>
          <div className="form-group">
            <input
              placeholder="Subject Code"
              value={newSubject.subject_code}
              onChange={(e) =>
                setNewSubject({
                  ...newSubject,
                  subject_code: e.target.value,
                })
              }
            />
          </div>
          <div className="form-group">
            <input
              placeholder="Subject Name"
              value={newSubject.subject_name}
              onChange={(e) =>
                setNewSubject({ ...newSubject, subject_name: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <input
              placeholder="Credits"
              type="number"
              value={newSubject.credits}
              onChange={(e) =>
                setNewSubject({ ...newSubject, credits: e.target.value })
              }
            />
          </div>
          <div className="form-group">
            <select
              value={newSubject.department}
              onChange={(e) =>
                setNewSubject({ ...newSubject, department: e.target.value })
              }
            >
              <option value="">-- Select Department --</option>
              {departments.map((dept) => (
                <option key={dept._id || dept.id} value={dept.name || dept.department}>
                  {dept.name || dept.department}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <select
              value={newSubject.semester}
              onChange={(e) =>
                setNewSubject({ ...newSubject, semester: e.target.value })
              }
            >
              <option value="">-- Select Semester --</option>
              {[...Array(8)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>
          <div className="button-group">
            <button className="small-btn save-btn" onClick={handleAdd}>
              Save
            </button>
          </div>
          {message && <p className="message-status">{message}</p>}
        </div>
      )}

      {/* Department Cards */}
      {!selectedDept && (
        <>
          <h1>Departments</h1>
          <div className="departments-grid">
            {departments.length === 0 && <p>No departments found.</p>}
            {departments.map((dept) => {
              const deptName = dept.name || dept.department;
              const deptColor = dept.color || "#6c757d"; // use dynamic color if provided, else default gray
              return (
                <div
                  key={dept._id || dept.id}
                  className="department-card"
                  onClick={() => setSelectedDept(deptName)}
                  style={{
                    backgroundColor: deptColor,
                    color: getContrastColor(deptColor),
                    border: `2px solid ${deptColor}`,
                    boxShadow: `0 4px 8px rgba(0,0,0,0.1)`,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = `0 6px 12px rgba(0,0,0,0.15)`;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = `0 4px 8px rgba(0,0,0,0.1)`;
                  }}
                >
                  {deptName}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Selected Department - Show Semester Cards */}
      {selectedDept && !selectedSemester && (
        <>
          <button className="back-btn" onClick={handleBack}>
            ← Back to Departments
          </button>
          <h1>{selectedDept}</h1>
          
          <div className="departments-grid">
            {availableSemesters.length === 0 && <p>No subjects found for this department.</p>}
            {availableSemesters.map((sem) => (
              <div
                key={sem}
                className="department-card"
                onClick={() => setSelectedSemester(sem)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  Semester {sem}
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                  {groupedBySemester[sem]?.length || 0} subjects
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Selected Semester Subjects */}
      {selectedDept && selectedSemester && (
        <>
          <button className="back-btn" onClick={handleBackToSemesters}>
            ← Back to Semesters
          </button>
          <h1>{selectedDept} - Semester {selectedSemester}</h1>

          <div className="table-wrapper">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Credits</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {semesterSubjects.length === 0 && (
                  <tr>
                    <td colSpan="4">No subjects found for this semester.</td>
                  </tr>
                )}
                {semesterSubjects.map((sub) => (
                  <tr key={sub._id || sub.id}>
                    <td>{sub.subject_code}</td>
                    <td>{sub.subject_name}</td>
                    <td>{sub.credits}</td>
                    <td>
                      <button onClick={() => handleDelete(sub._id || sub.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default SubjectsPage;
