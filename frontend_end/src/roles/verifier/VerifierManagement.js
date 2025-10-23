import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../../common/dashboard.css';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function VerifierManagement() {
  const [verifiers, setVerifiers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  
  // Form states
  const [newVerifierName, setNewVerifierName] = useState('');
  const [newVerifierDept, setNewVerifierDept] = useState('');
  const [newVerifierEmail, setNewVerifierEmail] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load verifiers and departments on component mount
  useEffect(() => {
    loadVerifiers();
    loadDepartments();
  }, []);

  const loadVerifiers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/verifier/all/list`);
      setVerifiers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Load verifiers error:', err);
      setError('Failed to load verifiers');
      setVerifiers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await axios.get(`${API_BASE}/departments/active`);
      const depts = Array.isArray(response.data) ? response.data : [];
      setDepartments(depts);
      if (depts.length > 0 && !newVerifierDept) {
        setNewVerifierDept(depts[0].name || depts[0].department || '');
      }
    } catch (err) {
      console.error('Load departments error:', err);
      setDepartments([]);
    }
  };

  const handleAddVerifier = async (e) => {
    e.preventDefault();
    setMessage('');
    
    const name = newVerifierName.trim();
    const dept = String(newVerifierDept || '').trim();
    const email = newVerifierEmail.trim();
    
    if (!dept) {
      setMessage('Please select a department');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/verifier/register`, {
        verifierName: name || undefined,
        department: dept,
        email: email || undefined,
      });
      
      setMessage('Verifier created successfully');
      setNewVerifierName('');
      setNewVerifierEmail('');
      setShowAddForm(false);
      await loadVerifiers();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to create verifier';
      setMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVerifier = async (id) => {
    if (!id) return;
    if (!window.confirm('Delete this verifier and its associated user?')) return;
    
    setMessage('');
    try {
      await axios.delete(`${API_BASE}/verifier/${id}`);
      setMessage('Verifier deleted successfully');
      await loadVerifiers();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to delete verifier';
      setMessage(msg);
    }
  };

  return (
    <div className="verifier-management-container">
      <div className="verifier-header" style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
        border: '1px solid #e2e8f0',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>Verifier Management</h2>
          <span style={{ 
            background: '#eef2ff', 
            color: '#4f46e5', 
            padding: '6px 10px', 
            borderRadius: 999, 
            fontWeight: 700, 
            fontSize: 12 
          }}>
            {verifiers.length} Verifiers
          </span>
        </div>
        
        {!showAddForm ? (
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <p style={{ color: '#64748b', marginBottom: 12 }}>Add new verifier? Click below:</p>
            <button
              className="open-form-btn"
              onClick={() => setShowAddForm(true)}
              style={{ 
                background: '#4f46e5', 
                color: 'white', 
                borderRadius: 12, 
                padding: '12px 18px', 
                fontWeight: 800, 
                fontSize: 15, 
                boxShadow: '0 6px 14px rgba(79,70,229,0.25)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              + Add Verifier
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
            <h3 style={{ margin: '0 0 15px 0', color: '#374151' }}>Add New Verifier</h3>
            <form onSubmit={handleAddVerifier}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
                    Verifier Name:
                  </label>
                  <input
                    type="text"
                    value={newVerifierName}
                    onChange={(e) => setNewVerifierName(e.target.value)}
                    placeholder="Enter verifier name (optional)"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
                    Email:
                  </label>
                  <input
                    type="email"
                    value={newVerifierEmail}
                    onChange={(e) => setNewVerifierEmail(e.target.value)}
                    placeholder="Enter email (optional)"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#374151' }}>
                  Department: *
                </label>
                <select
                  value={newVerifierDept}
                  onChange={(e) => setNewVerifierDept(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept, index) => (
                    <option key={index} value={dept.name || dept.department}>
                      {dept.name || dept.department}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: submitting ? '#9ca3af' : '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    fontWeight: 'bold',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Creating...' : 'Create Verifier'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewVerifierName('');
                    setNewVerifierEmail('');
                    setMessage('');
                  }}
                  style={{
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {message && (
        <div style={{
          padding: '10px 15px',
          marginBottom: '15px',
          borderRadius: '6px',
          backgroundColor: message.includes('successfully') ? '#d1fae5' : '#fee2e2',
          color: message.includes('successfully') ? '#065f46' : '#991b1b',
          border: `1px solid ${message.includes('successfully') ? '#a7f3d0' : '#fecaca'}`
        }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px 15px',
          marginBottom: '15px',
          borderRadius: '6px',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          border: '1px solid #fecaca'
        }}>
          {error}
        </div>
      )}

      <div className="verifier-list">
        <h3 style={{ marginBottom: '15px', color: '#374151' }}>Existing Verifiers</h3>
        
        {loading ? (
          <p>Loading verifiers...</p>
        ) : verifiers.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
            No verifiers found. Add one above to get started.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {verifiers.map((verifier) => (
                  <tr key={verifier._id}>
                    <td style={{ padding: '12px', borderTop: '1px solid #e5e7eb', fontWeight: 'bold' }}>
                      {verifier.username}
                    </td>
                    <td style={{ padding: '12px', borderTop: '1px solid #e5e7eb' }}>
                      {verifier.verifierName || '-'}
                    </td>
                    <td style={{ padding: '12px', borderTop: '1px solid #e5e7eb' }}>
                      {verifier.department}
                    </td>
                    <td style={{ padding: '12px', borderTop: '1px solid #e5e7eb' }}>
                      {verifier.email || '-'}
                    </td>
                    <td style={{ padding: '12px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteVerifier(verifier._id)}
                        style={{
                          background: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifierManagement;
