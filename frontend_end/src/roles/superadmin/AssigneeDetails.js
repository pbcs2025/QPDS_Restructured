import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function AssigneeDetails() {
  const { subjectCode } = useParams();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!subjectCode) {
      setError("No subject code provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`${API_BASE}/assignments/${encodeURIComponent(subjectCode)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setAssignments(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError("Failed to load assignment details.");
        setLoading(false);
      });
  }, [subjectCode]);

  const sendReminder = (email) => {
    fetch(`${API_BASE}/sendReminder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, subjectCode }),
    })
      .then((res) => {
        if (res.ok) alert("Reminder sent!");
        else alert("Failed to send reminder.");
      })
      .catch(() => alert("Error sending reminder."));
  };

  if (loading) return <p>Loading assignments...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>Assignments for {subjectCode}</h1>
      {assignments.length === 0 ? (
        <p>No assignments found.</p>
      ) : (
        <table className="user-table">
          <thead>
            <tr>
              <th>Faculty Name</th>
              <th>Email</th>
              <th>Submit Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((row, i) => (
              <tr key={row.id || i}>
                <td>{row.facultyName || '—'}</td>
                <td>{row.email}</td>
                <td>{row.submitDate || row.submit_date || '—'}</td>
                <td>
                  {row.done ? (
                    "Done"
                  ) : (
                    <button onClick={() => sendReminder(row.email)}>Send Reminder</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AssigneeDetails;