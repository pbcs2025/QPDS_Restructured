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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch all departments
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        setError("No authentication token found. Please login again.");
        setLoading(false);
        return;
      }
      
      const res = await axios.get(`${API_BASE}/departments/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log("Departments API response:", res.data);
      console.log("Response status:", res.status);
      
      // Backend returns direct array: [{ id, name, color, createdAt, isActive }, ...]
      let rows = [];
      if (Array.isArray(res.data)) {
        rows = res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        rows = res.data.data;
      } else if (res.data && res.data.departments && Array.isArray(res.data.departments)) {
        rows = res.data.departments;
      }
      
      console.log("Processed departments count:", rows.length);
      if (rows.length > 0) {
        console.log("First department sample (raw):", rows[0]);
        console.log("First department fields:", {
          id: rows[0].id,
          _id: rows[0]._id,
          name: rows[0].name,
          color: rows[0].color,
          createdAt: rows[0].createdAt,
          isActive: rows[0].isActive
        });
      }
      
      // Filter out any MBA departments that might accidentally be in the regular Department collection
      // MBA departments: Finance Management, Human Resource Management, Marketing Management, 
      // Operations & Logistics Management, Business Analytics / IT Management
      const mbaDepartmentNames = [
        'Finance Management',
        'Human Resource Management',
        'Marketing Management',
        'Operations & Logistics Management',
        'Business Analytics / IT Management',
        'Business Analytics',
        'IT Management'
      ];
      
      const filteredRows = rows.filter(dept => {
        const deptName = (dept.name || '').trim();
        return !mbaDepartmentNames.some(mbaName => 
          deptName.toLowerCase() === mbaName.toLowerCase()
        );
      });
      
      // Backend already returns: { id, name, color, createdAt, isActive }
      // Just ensure we have fallbacks for missing fields
      const normalizedRows = filteredRows.map((dept, index) => {
        // Backend returns id as string from _id.toString()
        const normalized = {
          id: dept.id || (dept._id ? dept._id.toString() : null) || `temp-${index}`,
          name: dept.name || "Unknown Department",
          color: dept.color || "#6c757d",
          isActive: dept.isActive !== undefined ? dept.isActive : true,
          createdAt: dept.createdAt || null
        };
        console.log(`Department ${index} normalized:`, normalized);
        return normalized;
      });
      
      console.log("Final normalized departments:", normalizedRows);
      setDepartments(normalizedRows);
    } catch (err) {
      console.error("Error fetching departments:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to fetch departments";
      setError(errorMessage);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Add new department
  const addDepartment = async () => {
    if (!newDept.trim()) {
      setError("Please enter a department name");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError("No authentication token found. Please login again.");
        setLoading(false);
        return;
      }

      console.log("Adding department:", { name: newDept.trim(), color: newDeptColor });
      
      const response = await axios.post(`${API_BASE}/departments`, { 
        name: newDept.trim(), 
        color: newDeptColor 
      }, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log("Add department response:", response.data);
      console.log("Response status:", response.status);
      
      if (response.status === 201 || response.status === 200) {
        setSuccess(`Department "${newDept.trim()}" added successfully!`);
        setNewDept("");
        setNewDeptColor("#6c757d");
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
        // Refresh the list
        await fetchDepartments();
      } else {
        setError("Unexpected response from server");
      }
    } catch (err) {
      console.error("Error adding department:", err);
      console.error("Error response:", err.response);
      console.error("Error response data:", err.response?.data);
      console.error("Error status:", err.response?.status);
      
      let errorMessage = "Failed to add department";
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Handle specific error cases
      if (err.response?.status === 400) {
        errorMessage = errorMessage || "Invalid request. Please check the department name.";
      } else if (err.response?.status === 401) {
        errorMessage = "Authentication failed. Please login again.";
      } else if (err.response?.status === 403) {
        errorMessage = "You don't have permission to add departments.";
      } else if (err.response?.status === 409 || err.code === 11000) {
        errorMessage = "A department with this name already exists.";
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Update department
  const updateDepartment = async (id) => {
    if (!updatedDept.trim()) {
      setError("Please enter a department name");
      return;
    }

    try {
      setError(null);
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE}/departments/${id}`, { 
        newDepartment: updatedDept.trim(),
        color: updatedDeptColor || undefined
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setEditDeptId(null);
      setUpdatedDept("");
      setUpdatedDeptColor("");
      fetchDepartments();
    } catch (err) {
      console.error("Error updating department:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to update department";
      setError(errorMessage);
    }
  };

  // Delete department
  const deleteDepartment = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      setError(null);
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/departments/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchDepartments();
    } catch (err) {
      console.error("Error deleting department:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to delete department";
      setError(errorMessage);
    }
  };

  return (
    <div>
      <h1>Departments Management</h1>

      <div className="form-inline" style={{ margin: "10px" }}>
        <input
          style={{ marginRight: "10px", width: "600px", borderRadius: "10px" }}
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

      {error && (
        <div style={{ 
          background: "#fef2f2", 
          border: "1px solid #fecaca", 
          borderRadius: "8px", 
          padding: "16px", 
          margin: "20px 0",
          color: "#dc2626"
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div style={{ 
          background: "#f0fdf4", 
          border: "1px solid #86efac", 
          borderRadius: "8px", 
          padding: "16px", 
          margin: "20px 0",
          color: "#166534"
        }}>
          <strong>Success:</strong> {success}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <p>Loading departments...</p>
        </div>
      )}

      {!loading && !error && (
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
            {departments.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  No departments found. Add a new department using the form above.
                </td>
              </tr>
            ) : (
              departments.map((dept) => {
                // Ensure we have all fields with proper fallbacks
                const deptId = dept.id || dept._id || null;
                const deptName = dept.name || "Unknown Department";
                const deptColor = dept.color || "#6c757d";
                const deptCreatedAt = dept.createdAt || null;
                
                console.log("Rendering department:", { deptId, deptName, deptColor, deptCreatedAt });
                
                if (!deptId) {
                  console.warn("Department missing ID:", dept);
                }
                
                return (
                  <tr key={deptId || `dept-${deptName}`}>
                    <td>
                      {editDeptId === deptId ? (
                        <input
                          type="text"
                          value={updatedDept || deptName}
                          onChange={(e) => setUpdatedDept(e.target.value)}
                          style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #ccc", width: "100%" }}
                        />
                      ) : (
                        <span style={{ color: "#000000", fontWeight: "500" }}>{deptName}</span>
                      )}
                    </td>
                    <td>
                      {editDeptId === deptId ? (
                        <input
                          type="color"
                          value={updatedDeptColor || deptColor}
                          onChange={(e) => setUpdatedDeptColor(e.target.value)}
                          style={{ width: "50px", height: "30px", cursor: "pointer" }}
                        />
                      ) : (
                        <div 
                          style={{ 
                            width: "50px", 
                            height: "30px", 
                            backgroundColor: deptColor,
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            display: "inline-block",
                            cursor: "default",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                            minWidth: "50px",
                            minHeight: "30px"
                          }}
                          title={`Color: ${deptColor}`}
                        ></div>
                      )}
                    </td>
                    <td>
                      {deptCreatedAt ? (
                        <span style={{ color: "#000000" }}>{new Date(deptCreatedAt).toLocaleString()}</span>
                      ) : (
                        <span style={{ color: "#9ca3af", fontStyle: "italic" }}>N/A</span>
                      )}
                    </td>
                    <td>
                      {editDeptId === deptId ? (
                        <>
                          <button 
                            onClick={() => updateDepartment(deptId)}
                            style={{ marginRight: "8px", padding: "6px 12px", borderRadius: "4px", border: "none", backgroundColor: "#4f46e5", color: "white", cursor: "pointer" }}
                          >
                            Save
                          </button>
                          <button 
                            onClick={() => {
                              setEditDeptId(null);
                              setUpdatedDept("");
                              setUpdatedDeptColor("");
                            }}
                            style={{ padding: "6px 12px", borderRadius: "4px", border: "1px solid #ccc", backgroundColor: "white", cursor: "pointer" }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="no-bg-btn"
                            onClick={() => {
                              setEditDeptId(deptId);
                              setUpdatedDept(deptName);
                              setUpdatedDeptColor(deptColor);
                            }}
                            style={{ marginRight: "8px", cursor: "pointer" }}
                            title="Edit department"
                          >
                            <i className="fa fa-edit"></i>
                          </button>
                          <button
                            type="button"
                            className="no-bg-btn"
                            onClick={() => deleteDepartment(deptId, deptName)}
                            style={{ color: "red", cursor: "pointer" }}
                            title="Delete department"
                          >
                            <i className="fa fa-trash"></i>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default DepartmentsPage;