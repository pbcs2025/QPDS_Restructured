import React, { useState, useEffect } from "react";

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function AdminManageFaculty() {
  const [formData, setFormData] = useState({
    name: "",
    clgName: "",
    deptName: "",
    email: "",
    phone: "",
    usertype: "",
  });
  const [colleges, setColleges] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Fetch colleges
    const fetchColleges = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/colleges/active`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        const collegesList = Array.isArray(data) ? data : [];
        setColleges(collegesList);
      } catch (err) {
        console.error("Failed to fetch colleges:", err);
        setColleges([]);
      }
    };

    // Fetch departments
    const fetchDepartments = async () => {
      try {
        setDepartmentsLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.error("No authentication token found");
          setDepartments([]);
          setDepartmentsLoading(false);
          return;
        }
        
        const res = await fetch(`${API_BASE}/departments/active`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log("Departments API response status:", res.status);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        console.log("Departments fetched (raw):", data);
        
        // Handle different response formats
        let departmentsList = [];
        if (Array.isArray(data)) {
          departmentsList = data;
        } else if (data && Array.isArray(data.data)) {
          departmentsList = data.data;
        } else if (data && Array.isArray(data.departments)) {
          departmentsList = data.departments;
        }
        
        console.log("Departments processed:", departmentsList.length);
        console.log("First department sample:", departmentsList[0]);
        
        // Ensure each department has id and name
        const normalizedDepartments = departmentsList.map((dept) => ({
          id: dept.id || (dept._id ? dept._id.toString() : null),
          name: dept.name || "Unknown",
          color: dept.color || "#6c757d"
        }));
        
        console.log("Normalized departments:", normalizedDepartments);
        setDepartments(normalizedDepartments);
      } catch (err) {
        console.error("Failed to fetch departments:", err);
        console.error("Error details:", err.message);
        setDepartments([]);
      } finally {
        setDepartmentsLoading(false);
      }
    };

    fetchColleges();
    fetchDepartments();
  }, []);

  const handleInputChange = (e) => {
    let { name, value } = e.target;

    if (name === "usertype" && value === "internal") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        clgName: "Global Academy of Technology",
      }));
    } else if (name === "usertype" && value === "external") {
      setFormData((prev) => ({ ...prev, [name]: value, clgName: "" }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddFaculty = async () => {
    setMessage("");

    // Validation
    if (
      !formData.name ||
      !formData.clgName ||
      !formData.deptName ||
      !formData.email ||
      !formData.phone ||
      !formData.usertype
    ) {
      setMessage("❌ Please fill all the fields.");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    if (!/^\d{10}$/.test(formData.phone)) {
      setMessage("❌ Contact number must be 10 digits.");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setMessage("❌ Please enter a valid email.");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/faculty/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          clgName: formData.clgName,
          deptName: formData.deptName,
          email: formData.email,
          phone: formData.phone,
          usertype: formData.usertype,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Faculty registered successfully.");
        setFormData({
          name: "",
          clgName: "",
          deptName: "",
          email: "",
          phone: "",
          usertype: "",
        });
        // Notify other components to refresh their faculty lists
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('faculties-updated'));
        }
      } else {
        setMessage("❌ " + (data.error || "Registration failed"));
      }
    } catch (err) {
      console.error("Registration failed:", err);
      setMessage("❌ Failed to register faculty.");
    }

    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div className="section">
      <h2>Register Faculty</h2>
      <div className="reset-form">
        {/* Faculty Type */}
        <div className="form-group">
          <label>Faculty Type</label>
          <select
            name="usertype"
            value={formData.usertype}
            onChange={handleInputChange}
            required
          >
            <option value="">-- Select Type --</option>
            <option value="internal">Internal</option>
            <option value="external">External</option>
          </select>
        </div>

        {/* Name */}
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter full name"
            required
          />
        </div>

        {/* College Name */}
        <div className="form-group">
          <label>College Name</label>
          <select
            name="clgName"
            value={formData.clgName}
            onChange={handleInputChange}
            disabled={formData.usertype === "internal"}
            required
          >
            <option value="">-- Select College --</option>
            {formData.usertype === "internal" ? (
              <option value="Global Academy of Technology">
                Global Academy of Technology
              </option>
            ) : (
              colleges.map((clg) => (
                <option key={clg.id} value={clg.name}>
                  {clg.name}
                </option>
              ))
            )
            }
          </select>
        </div>

        {/* Department */}
        <div className="form-group">
          <label>Department</label>
          <select
            name="deptName"
            value={formData.deptName}
            onChange={handleInputChange}
            required
          >
            <option value="">-- Select Department --</option>
            {departmentsLoading ? (
              <option disabled>Loading departments...</option>
            ) : departments.length > 0 ? (
              departments.map((dept) => (
                <option key={dept.id || dept.name} value={dept.name}>
                  {dept.name}
                </option>
              ))
            ) : (
              <option disabled value="">
                {departmentsLoading ? "Loading..." : "No departments available"}
              </option>
            )}
          </select>
        </div>

        {/* Email */}
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="example@college.edu"
            required
          />
        </div>

        {/* Phone */}
        <div className="form-group">
          <label>Contact Number</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="10-digit number"
            maxLength={10}
            required
          />
        </div>

        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button type="button" onClick={handleAddFaculty}>
            Add +
          </button>
        </div>

        {message && <p className="message-status">{message}</p>}
      </div>
    </div>
  );
}

export default AdminManageFaculty;
