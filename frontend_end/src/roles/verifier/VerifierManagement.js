import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../common/dashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

function VerifierManagement() {
  const [verifiers, setVerifiers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [newVerifierName, setNewVerifierName] = useState("");
  const [newVerifierDept, setNewVerifierDept] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");

  const refreshVerifiers = async () => {
    try {
      const res = await fetch(`${API_BASE}/verifier/all/list`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const rows = await res.json();
      const list = Array.isArray(rows) ? rows : [];
      setVerifiers(list);
    } catch (err) {
      console.error("Refresh verifiers error:", err);
      setVerifiers([]);
    }
  };

  useEffect(() => {
    setUsersLoading(true);
    setUsersError(null);
    fetch(`${API_BASE}/verifier/all/list`)
      .then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const rows = Array.isArray(data) ? data : [];
        setVerifiers(rows);
      })
      .catch((err) => {
        console.error("Fetch verifiers error:", err);
        setUsersError("Failed to load verifiers");
        setVerifiers([]);
      })
      .finally(() => setUsersLoading(false));
  }, []);

  useEffect(() => {
    axios
      .get(`${API_BASE}/departments/active`)
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        setDepartments(rows);
        if (!newVerifierDept && rows.length > 0) {
          setNewVerifierDept(rows[0].name || rows[0].department || "");
        }
      })
      .catch((err) => {
        console.error("Fetch departments error:", err);
        setDepartments([]);
      });
  }, []);

  const handleAddVerifier = async () => {
    setSubmitMsg("");
    const name = newVerifierName.trim();
    const dept = String(newVerifierDept || "").trim();
    if (!dept) {
      setSubmitMsg("Please select a department");
      return;
    }
    setSubmitLoading(true);
    try {
      await axios.post(`${API_BASE}/verifier/register`, {
        verifierName: name || undefined,
        department: dept,
      });
      setSubmitMsg("Verifier created successfully");
      setNewVerifierName("");
      await refreshVerifiers();
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to create verifier";
      setSubmitMsg(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteVerifier = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this verifier and its associated user?")) return;
    setSubmitMsg("");
    try {
      await axios.delete(`${API_BASE}/verifier/${id}`);
      await refreshVerifiers();
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to delete verifier";
      setSubmitMsg(msg);
    }
  };

  return (
    <div>
      <h1>Verifiers</h1>
      <div className="form-inline" style={{ margin: "10px 0" }}>
        <input
          type="text"
          placeholder="Verifier name (optional)"
          value={newVerifierName}
          onChange={(e) => setNewVerifierName(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <select
          value={newVerifierDept}
          onChange={(e) => setNewVerifierDept(e.target.value)}
          style={{ marginRight: "10px" }}
        >
          <option value="">Select department</option>
          {departments.map((d) => (
            <option key={d.id || d._id || d.name} value={(d.name || d.department || "").trim()}>
              {(d.name || d.department || "").trim()}
            </option>
          ))}
        </select>
        <button onClick={handleAddVerifier} disabled={submitLoading}>
          {submitLoading ? "Adding…" : "Add Verifier"}
        </button>
      </div>
      {submitMsg && <p className={submitMsg.includes("success") ? "success-msg" : "error-msg"}>{submitMsg}</p>}
      {usersLoading && <p>Loading verifiers…</p>}
      {usersError && <p className="error-msg">{usersError}</p>}
      {!usersLoading && !usersError && (
        <div className="table-wrapper">
          <table className="user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                {/* <th>College</th> */}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {verifiers.length === 0 && (
                <tr>
                  <td colSpan={5}>No verifiers found.</td>
                </tr>
              )}
              {verifiers.map((u) => (
                <tr key={u._id || u.id}>
                  <td>{u.verifierName || u.name || u.username || '-'}</td>
                  <td>{u.email || '-'}</td>
                  <td>{u.deptName || u.department || '-'}</td>
                  {/* <td>{u.clgName || u.college || '-'}</td> */}
                  <td>
                    <button
                      type="button"
                      className="no-bg-btn"
                      style={{ color: "red" }}
                      onClick={() => handleDeleteVerifier(u._id || u.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default VerifierManagement;


