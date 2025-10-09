// AdminManageFacultyPage.js
import React, { useState } from "react";
import AdminManageFaculty from "./AdminManageFaculty";
import ManageUsers from "./ManageUsers";
import "../../common/dashboard.css";

function AdminManageFacultyPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="manage-faculty-container">
      <div className="faculty-section faculty-header-section" style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 6px 18px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Faculty Registration</h2>
          {!showForm && (
            <span style={{ background: '#eef2ff', color: '#4f46e5', padding: '6px 10px', borderRadius: 999, fontWeight: 700, fontSize: 12 }}>
              Quick add
            </span>
          )}
        </div>
        {!showForm ? (
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <p style={{ color: '#64748b', marginBottom: 12 }}>New faculty registration? Click below:</p>
            <button
              className="open-form-btn"
              onClick={() => setShowForm(true)}
              style={{ background: '#4f46e5', color: 'white', borderRadius: 12, padding: '12px 18px', fontWeight: 800, fontSize: 15, boxShadow: '0 6px 14px rgba(79,70,229,0.25)' }}
            >
              + Add Faculty
            </button>
          </div>
        ) : (
          <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 18,
            marginTop: 14
          }}>
            <AdminManageFaculty />
          </div>
        )}
      </div>

      <div style={{ height: 24 }}></div>

      <div className="faculty-section" style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 6px 18px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Registered Faculty List</h2>
        </div>
        <div style={{ marginTop: 12 }}>
          <ManageUsers userType="superadmin" userpage="managefaculty"/>
        </div>
      </div>
    </div>
  );
}

export default AdminManageFacultyPage;
