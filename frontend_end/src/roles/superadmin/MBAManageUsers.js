//MBAManageUsers.js
import React, { useEffect, useState } from "react";
import "../../common/dashboard.css";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function MBAManageUsers({ userType , userpage }) {
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

  // Semester options
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
        const deptNames = res.data.map(d => typeof d === "string" ? d : (d.department || d.name));
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
        // Fetch all MBA faculties from the dedicated endpoint
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
          role: 'MBAFaculty'
        }));
        
        const externalUsers = external.map(f => ({
          _id: f._id,
          name: f.name,
          email: f.email,
          clgName: f.clgName,
          deptName: f.department,
          phoneNo: f.contactNumber,
          usertype: f.type || 'external',
          role: 'MBAFaculty'
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

    // Listen for faculty updates
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

    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/assignQPSetter`, {
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
      .then((res) => {
        if (res.ok) {
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
          setSubjectCode("");
          setSubmitDate("");

          setStatusMessage("✅ QP Setters assigned successfully!");
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
              👥 Internal MBA Faculties
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
                No internal MBA faculties found
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
              🌐 External MBA Faculties
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
                No external MBA faculties found
              </div>
            )}
          </div>
        </>
      )}

      {/* Status message box */}
      {statusMessage && (
        <div className="manage-users-msg show">
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

export default MBAManageUsers;

