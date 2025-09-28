import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../common/dashboard.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function CollegesPage() {
  const [colleges, setColleges] = useState([]);
  const [newCollege, setNewCollege] = useState("");
  const [editCollegeId, setEditCollegeId] = useState(null);
  const [updatedCollege, setUpdatedCollege] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchColleges();
  }, []);

  // Fetch all colleges
  const fetchColleges = async () => {
    try {
      const res = await axios.get(`${API_BASE}/colleges`);
      console.log("Colleges API response:", res.data);
      setColleges(res.data);
    } catch (err) {
      console.error("Error fetching colleges:", err);
      setMessage("❌ Failed to fetch colleges");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Add college
  const addCollege = async () => {
    if (!newCollege.trim()) {
      setMessage("❌ Please enter a college name");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    try {
      await axios.post(`${API_BASE}/colleges`, { name: newCollege.trim() });
      setNewCollege("");
      setMessage("✅ College added successfully");
      fetchColleges();
    } catch (err) {
      console.error("Error adding college:", err);
      setMessage("❌ " + (err.response?.data?.error || "Failed to add college"));
    }
    setTimeout(() => setMessage(""), 3000);
  };

  // Update college
  const updateCollege = async (id) => {
    if (!updatedCollege.trim()) {
      setMessage("❌ Please enter a college name");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    try {
      await axios.put(`${API_BASE}/colleges/${id}`, { name: updatedCollege.trim() });
      setEditCollegeId(null);
      setUpdatedCollege("");
      setMessage("✅ College updated successfully");
      fetchColleges();
    } catch (err) {
      console.error("Error updating college:", err);
      setMessage("❌ " + (err.response?.data?.error || "Failed to update college"));
    }
    setTimeout(() => setMessage(""), 3000);
  };

  // Delete college with confirmation
  const deleteCollege = async (id, name) => {
    const confirmDelete = window.confirm(
      `Are you sure you would like to delete the college "${name}"?`
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_BASE}/colleges/${id}`);
      setMessage("✅ College deleted successfully");
      fetchColleges();
    } catch (err) {
      console.error("Error deleting college:", err);
      setMessage("❌ " + (err.response?.data?.error || "Failed to delete college"));
    }
    setTimeout(() => setMessage(""), 3000);
  };

  // Toggle college active status
  const toggleActive = async (id, currentStatus) => {
    try {
      await axios.put(`${API_BASE}/colleges/${id}`, { isActive: !currentStatus });
      setMessage(`✅ College ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchColleges();
    } catch (err) {
      console.error("Error toggling college status:", err);
      setMessage("❌ Failed to update college status");
    }
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div>
      <h1>Colleges Management</h1>

      <div className="form-inline" style={{ margin: "10px" }}>
        <input
          style={{ marginRight: "10px" }}
          type="text"
          placeholder="Enter college name"
          value={newCollege}
          onChange={(e) => setNewCollege(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addCollege()}
        />
        <button onClick={addCollege} style={{ width: "10%" }}>
          Add
        </button>
      </div>

      {message && <p className="message-status">{message}</p>}

      <table className="data-table user-table">
        <thead>
          <tr style={{ backgroundColor: "#1f1f33" }}>
            <th>College Name</th>
            <th>Status</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {colleges.map((college) => (
            <tr key={college.id || college._id}>
              <td>
                {editCollegeId === (college.id || college._id) ? (
                  <input
                    type="text"
                    value={updatedCollege}
                    onChange={(e) => setUpdatedCollege(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && updateCollege(college.id || college._id)}
                  />
                ) : (
                  college.name
                )}
              </td>
              <td>
                <span 
                  style={{ 
                    color: college.isActive ? 'green' : 'red',
                    fontWeight: 'bold'
                  }}
                >
                  {college.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>
                {college.createdAt ? new Date(college.createdAt).toLocaleString() : 'N/A'}
              </td>
              <td>
                {editCollegeId === (college.id || college._id) ? (
                  <>
                    <button onClick={() => updateCollege(college.id || college._id)}>
                      Save
                    </button>
                    <button onClick={() => setEditCollegeId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="no-bg-btn"
                      onClick={() => {
                        setEditCollegeId(college.id || college._id);
                        setUpdatedCollege(college.name);
                      }}
                    >
                      <i className="fa fa-edit"></i>
                    </button>
                    <button
                      type="button"
                      className="no-bg-btn"
                      onClick={() => toggleActive(college.id || college._id, college.isActive)}
                      style={{ color: college.isActive ? 'orange' : 'green' }}
                      title={college.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <i className={`fa fa-${college.isActive ? 'pause' : 'play'}`}></i>
                    </button>
                    <button
                      type="button"
                      className="no-bg-btn"
                      onClick={() => deleteCollege(college.id || college._id, college.name)}
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

export default CollegesPage;





