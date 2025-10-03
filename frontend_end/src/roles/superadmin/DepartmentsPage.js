import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../common/dashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [newDept, setNewDept] = useState("");
  const [editDeptId, setEditDeptId] = useState(null);
  const [updatedDept, setUpdatedDept] = useState("");

  // Fetch all departments
  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API_BASE}/departments`);
      const rows = Array.isArray(res.data) ? res.data : [];
      // Normalize possible shapes: {id, name} or {_id, name} or {id, department}
      const normalized = rows.map((r) => ({
        id: String(r.id || r._id || ''),
        name: r.name || r.department || '',
        createdAt: r.createdAt || null,
      })).filter(d => d.name);
      setDepartments(normalized);
    } catch (err) {
      console.error("Error fetching departments:", err);
      setDepartments([]);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Add new department
  const addDepartment = async () => {
    if (!newDept.trim()) return;

    try {
      await axios.post(`${API_BASE}/departments`, { name: newDept });
      setNewDept("");
      fetchDepartments();
    } catch (err) {
      console.error("Error adding department:", err);
    }
  };

  // Update department
  const updateDepartment = async (id) => {
    if (!updatedDept.trim()) return;

    try {
      await axios.put(`${API_BASE}/departments/${id}`, { newDepartment: updatedDept });
      setEditDeptId(null);
      setUpdatedDept("");
      fetchDepartments();
    } catch (err) {
      console.error("Error updating department:", err);
    }
  };

  // Delete department
  const deleteDepartment = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await axios.delete(`${API_BASE}/departments/${id}`);
      fetchDepartments();
    } catch (err) {
      console.error("Error deleting department:", err);
    }
  };

  return (
    <div>
      <h1>Departments Management</h1>

      <div className="form-inline" style={{ margin: "10px" }}>
        <input
          style={{ marginRight: "10px" }}
          type="text"
          placeholder="Enter department name"
          value={newDept}
          onChange={(e) => setNewDept(e.target.value)}
        />
        <button onClick={addDepartment} style={{ width: "10%" }}>
          Add
        </button>
      </div>

      <table className="data-table user-table">
        <thead>
          <tr style={{ backgroundColor: "#1f1f33" }}>
            <th>Department</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
  {departments.map((dept) => (
    <tr key={dept.id}>
      <td>
        {editDeptId === dept.id ? (
          <input
            type="text"
            value={updatedDept || dept.name}  // fallback to dept.name
            onChange={(e) => setUpdatedDept(e.target.value)}
          />
        ) : (
          dept.name
        )}
      </td>
      <td>
        {dept.createdAt
          ? new Date(dept.createdAt).toLocaleString()
          : "N/A"}
      </td>
      <td>
        {editDeptId === dept.id ? (
          <>
            <button onClick={() => updateDepartment(dept.id)}>Save</button>
            <button onClick={() => setEditDeptId(null)}>Cancel</button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="no-bg-btn"
              onClick={() => {
                setEditDeptId(dept.id);
                setUpdatedDept(dept.name); // preload dept name into input
              }}
            >
              <i className="fa fa-edit"></i>
            </button>
            <button
              type="button"
              className="no-bg-btn"
              onClick={() => deleteDepartment(dept.id, dept.name)}
              style={{ color: "red" }}
            >
              <i className="fa fa-trash"></i>
            </button>
          </>
        )}
      </td>
    </tr>
  ))}
</tbody>
      </table>
    </div>
  );
}

export default DepartmentsPage;
