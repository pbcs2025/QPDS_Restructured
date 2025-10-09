//ManageUsers.js
import React, { useEffect, useState, useRef } from "react";
import "../../common/dashboard.css";
import "./manageUsersMessage.css";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const statusRef = useRef(null);

  // const subjectCodes = [
  //   "CS101 - Data Structures",
  //   "CS102 - Algorithms",
  //   "EC201 - Digital Electronics",
  //   "ME301 - Thermodynamics",
  //   "CE401 - Structural Engineering",
  //   "CSE23401 - Engineering Mathematics"
  // ];
  useEffect(() => {
  axios
  .get(`${API_BASE}/subjects`)
    .then((res) => {
    // Normalize to array of { code, name }
    const list = Array.isArray(res.data) ? res.data : [];
    const normalized = list.map(item => {
      if (typeof item === 'string') {
        return { code: item, name: '' };
      }
      return { code: item.subject_code || item.code || '', name: item.subject_name || item.name || '' };
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
        setDepartments(deptNames);
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



  useEffect(() => {
    fetch(`${API_BASE}/users`)
      .then((res) => res.json())
      .then((data) => setInternalFaculties(data))
      .catch((err) => console.error("Fetch error:", err));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/externalusers`)
      .then((res) => res.json())
      .then((data) => setOtherFaculties(data))
      .catch((err) => console.error("Fetch error:", err));
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

    console.log(selectedUsers);

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

          // Clear selections and inputs
          setSelectedEmails([]);
          setSubjectCode("");
          setSubmitDate("");

          setStatusMessage("✅ QP Setters assigned successfully!");

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

  return (
    <div className="manage-users">
      {userType === "superadmin" && userpage==="qp" && (
        <div
          style={{ marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center" }}
        >
          <select
            value={subjectCode}
            onChange={(e) => setSubjectCode(e.target.value)}
            style={{ padding: "6px", flex: 1 }}
          >
            <option value="">Select Subject Code</option>
            {subjectCodes.map((item, idx) => {
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
          <input
            type="date"
            value={submitDate}
            onChange={(e) => setSubmitDate(e.target.value)}
            style={{ padding: "6px", flex: 1 }}
          />
          <button onClick={handleConfirm} style={{ padding: "6px 12px" }}>
            Confirm
          </button>
        </div>
      )}

      {userType === "superadmin" && (
        <>
          <h2>Internal Faculties List</h2>
          {renderDepartmentTables(internalFaculties)}

          <hr style={{ margin: "50px 0" }} />

          <h2>External Faculties List</h2>
          {renderDepartmentTables(otherFaculties)}
        </>
      )}

      {userType === "admin" && (
        <>
          <h2>External Faculties List</h2>
          {renderDepartmentTables(otherFaculties)}
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
