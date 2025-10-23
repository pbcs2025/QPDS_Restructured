import React, { useState, useEffect } from "react";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

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
  const [internalList, setInternalList] = useState([]);
  const [externalList, setExternalList] = useState([]);

  useEffect(() => {
    // Fetch colleges
    const fetchColleges = async () => {
      try {
        const res = await fetch(`${API_BASE}/colleges/active`);
        const data = await res.json();
        setColleges(data);
      } catch (err) {
        console.error("Failed to fetch colleges:", err);
      }
    };

    // Fetch departments
    const fetchDepartments = async () => {
      try {
        setDepartmentsLoading(true);
        const res = await fetch(`${API_BASE}/departments/active`);
        const data = await res.json();
        console.log("Departments fetched:", data); // Debug log
        console.log("Departments count:", data.length); // Debug log
        setDepartments(data);
      } catch (err) {
        console.error("Failed to fetch departments:", err);
        setDepartments([]); // Set empty array on error
      } finally {
        setDepartmentsLoading(false);
      }
    };

    fetchColleges();
    fetchDepartments();
  }, []);

  useEffect(() => {
    const refresh = () => {
      // Fetch full list and split by type
      fetch(`${API_BASE}/faculty/all`)
        .then((res) => res.json())
        .then((list) => {
          const internal = (list || []).filter((f) => (f.type || f.usertype) === 'internal');
          const external = (list || []).filter((f) => (f.type || f.usertype) === 'external');
          setInternalList(internal);
          setExternalList(external);
        })
        .catch(() => {
          setInternalList([]);
          setExternalList([]);
        });
    };

    // initial
    refresh();
    // listen for bulk upload completion
    const handler = () => refresh();
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('faculties-updated', handler);
    }
    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('faculties-updated', handler);
      }
    };
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
      const res = await fetch(`${API_BASE}/faculty/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))
            ) : (
              <option disabled>No departments available</option>
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

      {/* Lists */}
      <div style={{ marginTop: 24 }}>
        <h3>Internal Faculty</h3>
        <div className="table-wrapper">
          <table className="user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {internalList.length === 0 ? (
                <tr><td colSpan="4">No internal faculty found.</td></tr>
              ) : internalList.map((f) => (
                <tr key={f._id || f.facultyId}>
                  <td>{f.name}</td>
                  <td>{f.email}</td>
                  <td>{f.department}</td>
                  <td>{f.contactNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ height: 16 }}></div>

        <h3>External Faculty</h3>
        <div className="table-wrapper">
          <table className="user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {externalList.length === 0 ? (
                <tr><td colSpan="4">No external faculty found.</td></tr>
              ) : externalList.map((f) => (
                <tr key={f._id || f.facultyId}>
                  <td>{f.name}</td>
                  <td>{f.email}</td>
                  <td>{f.department}</td>
                  <td>{f.contactNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminManageFaculty;
