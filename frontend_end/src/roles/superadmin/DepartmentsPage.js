import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../common/dashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [newDept, setNewDept] = useState("");
  const [editDeptId, setEditDeptId] = useState(null);
  const [updatedDept, setUpdatedDept] = useState("");

  // Fetch all departments
  const fetchDepartments = async () => {
    try {
      const res = await axios.get(`${API_BASE}/departments`);
      setDepartments(res.data); // res.data contains array with "id", "name", "createdAt"
    } catch (err) {
      console.error("Error fetching departments:", err);
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
                    value={updatedDept}
                    onChange={(e) => setUpdatedDept(e.target.value)}
                  />
                ) : (
                  dept.name
                )}
              </td>
              <td>{dept.createdAt ? new Date(dept.createdAt).toLocaleString() : "N/A"}</td>
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
                        setUpdatedDept(dept.name);
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
