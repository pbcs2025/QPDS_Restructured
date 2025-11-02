import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../common/dashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [newDept, setNewDept] = useState("");
  const [newDeptColor, setNewDeptColor] = useState("#6c757d");
  const [editDeptId, setEditDeptId] = useState(null);
  const [updatedDept, setUpdatedDept] = useState("");
  const [updatedDeptColor, setUpdatedDeptColor] = useState("");

  // Fetch all departments
  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API_BASE}/departments/active`);
      console.log(res.data);
      const rows = Array.isArray(res.data) ? res.data : [];
      // Use backend departments shape directly: { id, name, isActive, createdAt }
      setDepartments(rows);
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
      await axios.post(`${API_BASE}/departments`, { 
        name: newDept, 
        color: newDeptColor 
      });
      setNewDept("");
      setNewDeptColor("#6c757d");
      fetchDepartments();
    } catch (err) {
      console.error("Error adding department:", err);
    }
  };

  // Update department
  const updateDepartment = async (id) => {
    if (!updatedDept.trim()) return;

    try {
      await axios.put(`${API_BASE}/departments/${id}`, { 
        newDepartment: updatedDept,
        color: updatedDeptColor || undefined
      });
      setEditDeptId(null);
      setUpdatedDept("");
      setUpdatedDeptColor("");
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
          style={{ marginRight: "10px",width: "600px", borderRadius: "10px" }}
          type="text"
          placeholder="Enter department name"
          value={newDept}
          onChange={(e) => setNewDept(e.target.value)}
        />
        <input
          style={{ marginRight: "10px", width: "100px" }}
          type="color"
          value={newDeptColor}
          onChange={(e) => setNewDeptColor(e.target.value)}
          title="Select department color"
        />
        <button onClick={addDepartment} style={{ width: "10%" }}>
          Add
        </button>
      </div>

      <table className="data-table user-table">
        <thead>
          <tr style={{ backgroundColor: "#1f1f33" }}>
            <th>Department</th>
            <th>Color</th>
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
        {editDeptId === dept.id ? (
          <input
            type="color"
            value={updatedDeptColor || dept.color || "#6c757d"}
            onChange={(e) => setUpdatedDeptColor(e.target.value)}
            style={{ width: "50px", height: "30px" }}
          />
        ) : (
          <div 
            style={{ 
              width: "30px", 
              height: "20px", 
              backgroundColor: dept.color || "#6c757d",
              border: "1px solid #ccc",
              borderRadius: "3px"
            }}
            title={dept.color || "#6c757d"}
          ></div>
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
                setUpdatedDeptColor(dept.color || "#6c757d"); // preload color
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
