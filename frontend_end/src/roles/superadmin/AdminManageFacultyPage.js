// AdminManageFacultyPage.js
import React, { useState } from "react";
import AdminManageFaculty from "./AdminManageFaculty";
import ManageUsers from "./ManageUsers";
import "../../common/dashboard.css";

function AdminManageFacultyPage() {
  const [showForm, setShowForm] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

  const handleFilePick = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setMessage("");
    setUploadResult(null);
    setSelectedFile(file);
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setMessage("");
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch(`${API_BASE}/faculty/bulk-upload`, {
        method: 'POST',
        body: formData
      });
      const contentType = res.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        if (!res.ok) {
          throw new Error(text || 'Upload failed');
        }
        setMessage(text);
        return;
      }
      if (!res.ok) {
        throw new Error((data && data.error) || 'Upload failed');
      }
      setUploadResult(data);
      const summary = `✅ Created: ${data.created || 0} | ⏭️ Skipped: ${data.skipped || 0} | ❌ Errors: ${(data.errors && data.errors.length) || 0}`;
      setMessage(summary);
      // Notify other components to refresh their faculty lists
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('faculties-updated'));
      }
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

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
            <button
              onClick={() => setShowQuickAdd((v) => !v)}
              style={{ background: '#eef2ff', color: '#4f46e5', padding: '6px 10px', borderRadius: 999, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}
            >
              {showQuickAdd ? 'Close quick add' : 'Quick add'}
            </button>
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

            {showQuickAdd && (
              <div style={{
                marginTop: 16,
                textAlign: 'left',
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: 16
              }}>
                <h3 style={{ marginTop: 0 }}>Quick add via Excel/CSV</h3>
                <p style={{ color: '#64748b', marginBottom: 8 }}>
                  Please upload a file with the following columns (header row required):
                </p>
                <ul style={{ marginTop: 0 }}>
                  <li><strong>name</strong> (required)</li>
                  <li><strong>email</strong> (required)</li>
                  <li><strong>phone</strong></li>
                  <li><strong>clgName</strong></li>
                  <li><strong>deptName</strong> (required - must match existing departments exactly)</li>
                  <li><strong>usertype</strong> (internal|external; defaults to internal)</li>
                </ul>
                <p style={{ color: '#dc2626', fontSize: '14px', marginTop: 8, marginBottom: 8 }}>
                  ⚠️ <strong>Important:</strong> Department names must match exactly with the departments in the system. 
                  Invalid department names will be rejected with error details.
                </p>
                <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    onChange={handleFilePick}
                    disabled={uploading}
                  />
                  <button
                    onClick={handleConfirmUpload}
                    disabled={!selectedFile || uploading}
                    style={{ background: '#10b981', color: 'white', borderRadius: 8, padding: '8px 12px', fontWeight: 700, border: 'none', cursor: selectedFile && !uploading ? 'pointer' : 'not-allowed' }}
                  >
                    {uploading ? 'Uploading...' : (selectedFile ? 'Confirm upload' : 'Select a file')}
                  </button>
                </div>
                {selectedFile && (
                  <p style={{ marginTop: 8, color: '#334155' }}>
                    Selected: <strong>{selectedFile.name}</strong>
                  </p>
                )}
                {message && (
                  <p style={{ marginTop: 12, fontWeight: 600 }}>{message}</p>
                )}
                {uploadResult && uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <details>
                      <summary style={{ 
                        background: '#fef2f2', 
                        color: '#dc2626', 
                        padding: '8px 12px', 
                        borderRadius: '6px', 
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        border: '1px solid #fecaca'
                      }}>
                        View error details ({uploadResult.errors.length})
                      </summary>
                      <div style={{ marginTop: 8, padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#374151' }}>Error Details:</h4>
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                          {uploadResult.errors.slice(0, 50).map((err, idx) => (
                            <li key={idx} style={{ marginBottom: '4px' }}>
                              <strong>Row {err.row}:</strong> {err.error.replace(/Valid departments:.*$/, '').trim()}
                            </li>
                          ))}
                          {uploadResult.errors.length > 50 && (
                            <li style={{ fontStyle: 'italic', color: '#6b7280' }}>
                              ...and {uploadResult.errors.length - 50} more errors
                            </li>
                          )}
                        </ul>
                        
                        {/* Extract and display valid departments once */}
                        {uploadResult.errors.some(err => err.error.includes('Valid departments:')) && (
                          <div style={{ marginTop: '12px', padding: '8px', background: '#f0f9ff', borderRadius: '4px' }}>
                            <h5 style={{ margin: '0 0 4px 0', color: '#1e40af' }}>Valid Departments:</h5>
                            <p style={{ margin: 0, fontSize: '14px', color: '#1e40af' }}>
                              {uploadResult.errors
                                .find(err => err.error.includes('Valid departments:'))
                                ?.error.match(/Valid departments: (.*)/)?.[1] || 'No valid departments found'}
                            </p>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}
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
