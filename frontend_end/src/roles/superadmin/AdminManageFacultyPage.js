// AdminManageFacultyPage.js
import React, { useState } from "react";
import AdminManageFaculty from "./AdminManageFaculty";
import ManageUsers from "./ManageUsers";
import "../../common/dashboard.css";

function AdminManageFacultyPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="manage-faculty-container">
      <div className="faculty-section faculty-header-section">
        <h2>Faculty Registration</h2>
        {!showForm ? (
          <div style={{ textAlign: "center" }}>
            <p>New faculty registration? Click below:</p>
            <button className="open-form-btn" onClick={() => setShowForm(true)}>
              + Add Faculty
            </button>
          </div>
        ) : (
          <AdminManageFaculty />
        )}
      </div>

      <hr style={{ margin: "30px 0" }} />

      <div className="faculty-section">
        <h2>Registered Faculty List</h2>
        <ManageUsers userType="superadmin" userpage="managefaculty"/>
      </div>
    </div>
  );
}

export default AdminManageFacultyPage;
