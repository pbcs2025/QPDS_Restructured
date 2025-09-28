import React, { useEffect, useState } from "react";
import "./viewAssignees.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function ViewAssignees() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [assigneesData, setAssigneesData] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);

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

  if (loading) return <p>Loading assigned subjects...</p>;
  if (error && !selectedSubject) return <p>{error}</p>;

  return (
    <div className="view-assignees-container">
      <h1 className="view-assignees-title">View Assignees</h1>

      {/* Subject List View */}
      {!selectedSubject && (
        <div className="assignees-grid">
          {subjects.length === 0 && (
            <p className="no-assignees">No assigned subjects found.</p>
          )}

          {subjects.map((subject) => (
            <div
              key={subject.subject_code}
              className="assignee-card"
              onClick={() => handleCardClick(subject.subject_code)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCardClick(subject.subject_code);
              }}
            >
              <div className="subject-code">{subject.subject_code}</div>
              <div className="assigned-count">
                Total Assigned: {subject.assignees ? subject.assignees.length : 0}
              </div>
              {subject.submit_date && (
                <div className="submit-date">Submit Date: {subject.submit_date}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assignees Table View */}
      {selectedSubject && (
        <div className="assignees-table-section">
          <button className="back-btn" onClick={handleBack}>
            ← Back to Subjects
          </button>
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
                        <th>Status</th>
                        <th>Received Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assigneesData.map((fac, idx) => (
                        <tr key={idx}>
                          <td>{fac.facultyName}</td>
                          <td>{fac.email}</td>
                          <td>{fac.status}</td>
                          <td>{fac.receivedDate || "-"}</td>
                          <td>
                            <button
                              className="message-btn"
                              onClick={() => alert(`Messaging ${fac.name}`)}
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
      )}
    </div>
  );
}

export default ViewAssignees;
