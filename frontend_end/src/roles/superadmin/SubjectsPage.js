import React, { useEffect, useState } from "react";
import "../../common/dashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [newSubject, setNewSubject] = useState({
    subject_code: "",
    subject_name: "",
    department: "",
    semester: "",
    credits: "",
  });
  const [message, setMessage] = useState("");

  // Fetch subjects
  useEffect(() => {
    fetch(`${API_BASE}/subjects`)
      .then((res) => res.json())
      .then((data) => setSubjects(data || []))
      .catch((err) => {
        console.error("Fetch error (subjects):", err);
        setSubjects([]);
      });
  }, []);

  // Fetch departments from DB
  useEffect(() => {
    fetch(`${API_BASE}/departments/active`)
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
      const res = await fetch(`${API_BASE}/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSubject),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Subject added successfully.");
        setNewSubject({
          subject_code: "",
          subject_name: "",
          department: selectedDept || "",
          semester: "",
          credits: "",
        });
        setShowForm(false);
        window.location.reload();
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
      fetch(`${API_BASE}/subjects/${id}`, { method: "DELETE" }).then(() =>
        window.location.reload()
      );
    }
  };

  // Back to department cards
  const handleBack = () => {
    setSelectedDept(null);
    setShowForm(false);
    setMessage("");
  };

  return (
    <div className="subjects-container">
      {/* Add Subject button stays at the top */}
      <button
        className="add-btn"
        onClick={() => setShowForm((prev) => !prev)}
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
                  department: selectedDept || "",
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
            {!selectedDept && (
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
            )}
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
            {departments.map((dept) => (
              <div
                key={dept._id || dept.id}
                className="department-card"
                onClick={() => setSelectedDept(dept.name || dept.department)}
              >
                {dept.name || dept.department}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Selected Department Subjects */}
      {selectedDept && (
        <>
          <button className="back-btn" onClick={handleBack}>
            ← Back to Departments
          </button>
          <h1>{selectedDept}</h1>

          {/* Subjects Table grouped by semester */}
          {Object.keys(groupedBySemester)
            .sort((a, b) => a - b)
            .map((sem) => (
              <div key={sem} className="table-wrapper">
                <h3>Semester {sem}</h3>
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
                    {groupedBySemester[sem].map((sub) => (
                      <tr key={sub.id}>
                        <td>{sub.subject_code}</td>
                        <td>{sub.subject_name}</td>
                        <td>{sub.credits}</td>
                        <td>
                          <button onClick={() => handleDelete(sub.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </>
      )}
    </div>
  );
}

export default SubjectsPage;
