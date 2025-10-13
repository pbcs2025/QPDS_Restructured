import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const QuestionPapers = () => {
  const [papers, setPapers] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [finalStatus, setFinalStatus] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [showRejectedPapers, setShowRejectedPapers] = useState(false);
  const [rejectedPapers, setRejectedPapers] = useState([]);
  const [showApprovedPapers, setShowApprovedPapers] = useState(false);
  const [approvedPapers, setApprovedPapers] = useState([]);

  // Initialize department from logged-in verifier
  useEffect(() => {
    try {
      const raw = localStorage.getItem('verifier');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.department) {
          setSelectedDepartment(parsed.department);
        }
      }
    } catch {}
  }, []);

  const fetchPapers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedDepartment) params.append('department', selectedDepartment);
      if (selectedSemester) params.append('semester', selectedSemester);
      
      const response = await fetch(`${API_BASE}/verifier/papers?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setPapers(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching papers:', err);
      setError('Failed to fetch question papers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment, selectedSemester]);

  // Fetch papers when department changes (semester is optional)
  useEffect(() => {
    if (selectedDepartment) {
      fetchPapers();
    }
  }, [selectedDepartment, selectedSemester, fetchPapers]);

  const fetchRejectedPapers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedDepartment) params.append('department', selectedDepartment);
      if (selectedSemester) params.append('semester', selectedSemester);
      
      const response = await fetch(`${API_BASE}/verifier/rejected?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setRejectedPapers(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching rejected papers:', err);
      setError('Failed to fetch rejected papers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment, selectedSemester]);

  const fetchApprovedPapers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedDepartment) params.append('department', selectedDepartment);
      if (selectedSemester) params.append('semester', selectedSemester);
      
      const response = await fetch(`${API_BASE}/verifier/approved?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setApprovedPapers(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching approved papers:', err);
      setError('Failed to fetch approved papers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedDepartment, selectedSemester]);

  const handlePaperClick = (paper) => {
    setSelectedPaper(paper);
    setFinalStatus('');
  };

  const handleViewPaperFromList = async (paper) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/verifier/papers/${paper.subject_code}/${paper.semester}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const paperData = await response.json();
      setSelectedPaper(paperData);
      setFinalStatus('');
      setShowRejectedPapers(false);
      setShowApprovedPapers(false);
    } catch (err) {
      console.error('Error fetching paper details:', err);
      setError('Failed to fetch paper details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedPaper(null);
  };

  const handleViewRejectedPapers = () => {
    setShowRejectedPapers(true);
    setShowApprovedPapers(false);
    fetchRejectedPapers();
  };

  const handleViewApprovedPapers = () => {
    setShowApprovedPapers(true);
    setShowRejectedPapers(false);
    fetchApprovedPapers();
  };

  const handleBackToMainPapers = () => {
    setShowRejectedPapers(false);
    setShowApprovedPapers(false);
    setSelectedPaper(null);
  };

  // Removed per-question approval handlers as per requirements

  const handleSendToAdmin = async () => {
    if (!selectedPaper) return;
    if (finalStatus !== 'approved') {
      alert('Please set FINAL STATUS to Approved to send to Admin.');
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`${API_BASE}/verifier/papers/${selectedPaper.subject_code}/${selectedPaper.semester}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: selectedPaper.questions,
          finalStatus: 'approved'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Paper updated successfully:', result);

      // Optimistically update UI status to APPROVED
      setSelectedPaper(prev => prev ? { ...prev, status: 'approved' } : prev);

      // Refresh the papers list
      await fetchPapers();

      alert('Paper marked APPROVED and sent to Admin.');

      setSelectedPaper(null);
      setFinalStatus('');
    } catch (err) {
      console.error('Error updating paper:', err);
      alert('Failed to update paper. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleStoreRejected = async () => {
    if (!selectedPaper) return;
    if (finalStatus !== 'rejected') {
      alert('Please set FINAL STATUS to Rejected to store in Rejected Papers.');
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`${API_BASE}/verifier/papers/${selectedPaper.subject_code}/${selectedPaper.semester}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: selectedPaper.questions,
          finalStatus: 'rejected'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Paper stored as rejected successfully:', result);

      // Optimistically update UI status to REJECTED
      setSelectedPaper(prev => prev ? { ...prev, status: 'rejected' } : prev);

      await fetchPapers();
      alert('Paper marked REJECTED and stored in Rejected Papers.');
      setSelectedPaper(null);
      setFinalStatus('');
    } catch (err) {
      console.error('Error storing rejected paper:', err);
      alert('Failed to store rejected paper. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading && selectedDepartment) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Question Papers</h1>
        <p>Loading question papers for {selectedDepartment}{selectedSemester ? ` - ${selectedSemester}th Semester` : ''}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Question Papers</h1>
        <div style={{ color: 'red', marginBottom: '20px' }}>{error}</div>
        <button onClick={fetchPapers} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    );
  }

  // If a paper is selected, show the paper details
  if (selectedPaper) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Question Paper Details</h1>
          <button 
            onClick={handleBackToList}
            style={{
              padding: '10px 20px', 
              backgroundColor: '#6c757d', 
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer' 
            }}
          >
            ← Back to List
          </button>
        </div>

        {/* Paper Header - Matching Faculty Format */}
        <div style={{ 
          background: '#fff', 
          padding: '20px', 
          borderRadius: '12px',
          marginBottom: '20px',
          border: '1px solid #dee2e6',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '5px 0', fontSize: '16px' }}>
            <strong>Subject:</strong> {selectedPaper.subject_name} ({selectedPaper.subject_code})
          </p>
          <p style={{ margin: '5px 0', fontSize: '16px' }}>
            <strong>Semester:</strong> {selectedPaper.semester}th Semester B.E.
          </p>
          <p style={{ margin: '5px 0', fontSize: '16px' }}>
            <strong>Status:</strong> 
            <span style={{ 
              color: selectedPaper.status === 'approved' ? 'green' : 
                     selectedPaper.status === 'rejected' ? 'red' : 'orange',
              fontWeight: 'bold',
              marginLeft: '5px'
            }}>
              {selectedPaper.status.toUpperCase()}
            </span>
          </p>
        </div>

        {/* Questions Display - Question, then CO/L/Marks row, then Remarks, then Approve */}
        <div style={{ 
          background: '#fff', 
          padding: '20px', 
          borderRadius: '12px',
          marginBottom: '20px',
          border: '1px solid rgb(230, 222, 227)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ marginBottom: '15px', color: '#0b5ed7', borderBottom: '2px solid #0d6efd', paddingBottom: '5px' }}>
            Questions
          </h4>
          {(selectedPaper.questions || []).map((question, index) => (
            <div key={index} style={{
              border: '1px solid #b6d4fe',
              borderRadius: '12px',
              marginBottom: '18px',
              overflow: 'hidden',
              background: 'linear-gradient(180deg, #f7fbff 0%, #ffffff 40%)',
              boxShadow: '0 4px 10px rgba(13,110,253,0.06)'
            }}>
              {/* Question text row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px 18px', background: 'linear-gradient(90deg, #e7f1ff, #f1f8ff)' }}>
                <div style={{ color: '#ffffff', minWidth: '44px', fontWeight: 800, backgroundColor: '#0d6efd', borderRadius: '999px', textAlign: 'center', padding: '4px 0' }}>{question.question_number}</div>
                <div style={{ flex: 1, color: '#1b2a41', fontWeight: 600 }}>
                  <textarea
                    value={question.question_text || ''}
                    onChange={(e) => {
                      const newText = e.target.value;
                      const updatedQuestions = (selectedPaper.questions || []).map((q, i) => i === index ? { ...q, question_text: newText } : q);
                      setSelectedPaper({ ...selectedPaper, questions: updatedQuestions });
                    }}
                    placeholder="Edit question text"
                    style={{ width: '100%', minHeight: '70px', padding: '10px 12px', border: '1px solid #b6d4fe', borderRadius: '10px', backgroundColor: '#f4f9ff', fontSize: '14px', resize: 'vertical', color: '#1b2a41' }}
                  />
                  {question.file_name && (
                    <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '6px' }}>📎 {question.file_name}</div>
                  )}
                  {question.file_url && (
                    <div style={{ marginTop: '10px' }}>
                      <img
                        src={`${API_BASE}${question.file_url}`}
                        alt={question.file_name || 'attachment'}
                        style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid #e9edf3' }}
                      />
                    </div>
                  )}
                </div>
              </div>
              {/* CO / L / Marks row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', padding: '14px 18px', borderTop: '1px solid #e9edf3', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#fff', fontWeight: 800, minWidth: '44px', textAlign: 'center', backgroundColor: '#6f42c1', borderRadius: '999px', padding: '4px 10px' }}>CO</span>
                  <input
                    value={question.co || ''}
                    onChange={(e) => {
                      const updatedQuestions = (selectedPaper.questions || []).map((q, i) => i === index ? { ...q, co: e.target.value } : q);
                      setSelectedPaper({ ...selectedPaper, questions: updatedQuestions });
                    }}
                    placeholder="CO"
                    style={{ flex: 1, padding: '10px 12px', border: '1px solid #e1ccff', borderRadius: '8px', background: '#faf5ff', color: '#3b2c52' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#fff', fontWeight: 800, minWidth: '44px', textAlign: 'center', backgroundColor: '#fd7e14', borderRadius: '999px', padding: '4px 10px' }}>L</span>
                  <input
                    value={question.l || ''}
                    onChange={(e) => {
                      const updatedQuestions = (selectedPaper.questions || []).map((q, i) => i === index ? { ...q, l: e.target.value } : q);
                      setSelectedPaper({ ...selectedPaper, questions: updatedQuestions });
                    }}
                    placeholder="L"
                    style={{ flex: 1, padding: '10px 12px', border: '1px solid #ffd6b0', borderRadius: '8px', background: '#fff7ef', color: '#5a3410' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#084298', fontWeight: 800 }}>Marks</span>
                  <input
                    type="number"
                    value={typeof question.marks === 'number' ? question.marks : 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      const updatedQuestions = (selectedPaper.questions || []).map((q, i) => i === index ? { ...q, marks: Number.isNaN(val) ? 0 : val } : q);
                      setSelectedPaper({ ...selectedPaper, questions: updatedQuestions });
                    }}
                    style={{ flex: 1, padding: '10px 12px', border: '1px solid #b6d4fe', borderRadius: '8px', background: '#e7f1ff', textAlign: 'center', fontWeight: 800, color: '#0b5ed7' }}
                  />
                </div>
              </div>
              {/* Per-question approval checkboxes and remarks removed as per requirements */}
            </div>
          ))}
        </div>

        {/* FINAL STATUS Section */}
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #dee2e6', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '15px', color: '#0b5ed7', borderBottom: '2px solid #0d6efd', paddingBottom: '5px' }}>FINAL STATUS</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={finalStatus === 'approved'} onChange={() => setFinalStatus(finalStatus === 'approved' ? '' : 'approved')} style={{ transform: 'scale(1.2)', accentColor: '#198754' }} />
              <span style={{ color: '#0f5132', fontWeight: 700 }}>Approved</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={finalStatus === 'rejected'} onChange={() => setFinalStatus(finalStatus === 'rejected' ? '' : 'rejected')} style={{ transform: 'scale(1.2)', accentColor: '#dc3545' }} />
              <span style={{ color: '#842029', fontWeight: 700 }}>Rejected</span>
            </label>
          </div>
        </div>

        <div style={{ textAlign: 'center', display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={handleSendToAdmin}
            disabled={updating || finalStatus !== 'approved'}
            style={{
              padding: '12px 30px',
              backgroundColor: (updating || finalStatus !== 'approved') ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (updating || finalStatus !== 'approved') ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {updating ? 'Updating...' : 'Send to Admin'}
          </button>
          <button
            onClick={handleStoreRejected}
            disabled={updating || finalStatus !== 'rejected'}
            style={{
              padding: '12px 30px',
              backgroundColor: (updating || finalStatus !== 'rejected') ? '#6c757d' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (updating || finalStatus !== 'rejected') ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {updating ? 'Updating...' : 'Store in Rejected Papers Section'}
          </button>
        </div>
      </div>
    );
  }

  // Show rejected papers view
  if (showRejectedPapers) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>Rejected Papers</h1>
          <button
            onClick={handleBackToMainPapers}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ← Back to Main Papers
          </button>
        </div>
        
        {loading && <p>Loading rejected papers...</p>}
        {error && <p className="error-msg">{error}</p>}
        
        {!loading && !error && (
          <div className="table-wrapper">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Subject Name</th>
                  <th>Subject Code</th>
                  <th>Semester</th>
                  <th>Department</th>
                  <th>Rejected At</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rejectedPapers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                      No rejected papers found.
                    </td>
                  </tr>
                ) : (
                  rejectedPapers.map((paper, index) => (
                    <tr key={index} style={{ backgroundColor: '#f8d7da', color: '#721c24' }}>
                      <td style={{ padding: '14px 12px', borderTop: '1px solid #e1e7ef', borderRight: '1px solid #e1e7ef', fontWeight: 600 }}>
                        {paper.subject_name}
                      </td>
                      <td style={{ padding: '14px 12px', borderTop: '1px solid #e1e7ef', borderRight: '1px solid #e1e7ef' }}>
                        {paper.subject_code}
                      </td>
                      <td style={{ padding: '14px 12px', borderTop: '1px solid #e1e7ef', borderRight: '1px solid #e1e7ef' }}>
                        {paper.semester}
                      </td>
                      <td style={{ padding: '14px 12px', borderTop: '1px solid #e1e7ef', borderRight: '1px solid #e1e7ef' }}>
                        {paper.department}
                      </td>
                      <td style={{ padding: '14px 12px', borderTop: '1px solid #e1e7ef', borderRight: '1px solid #e1e7ef' }}>
                        {paper.rejected_at ? new Date(paper.rejected_at).toLocaleString() : '-'}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', borderTop: '1px solid #e1e7ef', borderRight: '1px solid #e1e7ef' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          backgroundColor: '#f8d7da',
                          color: '#721c24',
                          fontWeight: 700,
                          letterSpacing: '0.3px'
                        }}>
                          REJECTED
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', borderTop: '1px solid #e1e7ef' }}>
                        <button
                          onClick={() => handleViewPaperFromList(paper)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          View Paper
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Show approved papers view
  if (showApprovedPapers) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>Approved Papers</h1>
          <button
            onClick={handleBackToMainPapers}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ← Back to Main Papers
          </button>
        </div>
        
        {loading && <p>Loading approved papers...</p>}
        {error && <p className="error-msg">{error}</p>}
        
        {!loading && !error && (
          <div className="table-wrapper">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Subject Name</th>
                  <th>Subject Code</th>
                  <th>Semester</th>
                  <th>Department</th>
                  <th>Approved At</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {approvedPapers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                      No approved papers found.
                    </td>
                  </tr>
                ) : (
                  approvedPapers.map((paper, index) => (
                    <tr key={index} style={{ backgroundColor: '#d1f4e0', color: '#0f5132' }}>
                      <td style={{ padding: '14px 12px', borderTop: '1px solid #e1e7ef', borderRight: '1px solid #e1e7ef', fontWeight: 600 }}>
                        {paper.subject_name}
                      </td>
                      <td style={{ padding: '14px 12px', borderTop: '1px solid #e1e7ef', borderRight: '1px solid #e1e7ef' }}>
                        {paper.subject_code}
                      </td>
                      <td style={{ padding: '14px 12px', borderTop: '1px solid #e1e7ef', borderRight: '1px solid #e1e7ef' }}>
                        {paper.semester}
                      </td>
                      <td style={{ padding: '14px 12px', borderTop: '1px solid #e1e7ef', borderRight: '1px solid #e1e7ef' }}>
                        {paper.department}
                      </td>
                      <td style={{ padding: '14px 12px', borderTop: '1px solid #e1e7ef', borderRight: '1px solid #e1e7ef' }}>
                        {paper.approved_at ? new Date(paper.approved_at).toLocaleString() : '-'}
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', borderTop: '1px solid #e1e7ef', borderRight: '1px solid #e1e7ef' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          backgroundColor: '#d1f4e0',
                          color: '#0f5132',
                          fontWeight: 700,
                          letterSpacing: '0.3px'
                        }}>
                          APPROVED
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center', borderTop: '1px solid #e1e7ef' }}>
                        <button
                          onClick={() => handleViewPaperFromList(paper)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          View Paper
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Show papers list
  return (
    <div style={{ padding: '20px', position: 'relative' }}>
      <h1>Question Papers</h1>
      
      {/* Department (from verifier) and optional Semester filter */}
      <div style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ marginBottom: '15px', color: '#495057' }}>Filter Papers</h3>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#495057' }}>
              Department:
            </label>
            <div style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', background: '#e9ecef' }}>
              {selectedDepartment || '—'}
            </div>
          </div>
          
          <div style={{ minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#495057' }}>
              Semester:
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">Select Semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>
                  {sem}th Semester
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <button
              onClick={fetchPapers}
              disabled={!selectedDepartment}
              style={{
                padding: '8px 20px',
                backgroundColor: (!selectedDepartment) ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (!selectedDepartment) ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              Search Papers
            </button>
          </div>
        </div>
      </div>

      {!selectedDepartment ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>Verifier department not found. Please reload or re-login.</p>
        </div>
      ) : papers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>No question papers found for {selectedDepartment}{selectedSemester ? ` - ${selectedSemester}th Semester` : ''}.</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ color: '#495057', margin: '0' }}>
              Question Papers for {selectedDepartment} - {selectedSemester}th Semester
            </h3>
          </div>
          
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, border: '1px solid #e1e7ef', borderRadius: '10px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ backgroundColor: '#eef2f7' }}>
              <th style={{ padding: '14px 12px', textAlign: 'left', color: '#5b6777', fontWeight: 700, letterSpacing: '0.3px', borderRight: '1px solid #e1e7ef' }}>Subject</th>
              <th style={{ padding: '14px 12px', textAlign: 'left', color: '#5b6777', fontWeight: 700, letterSpacing: '0.3px', borderRight: '1px solid #e1e7ef' }}>Code</th>
              <th style={{ padding: '14px 12px', textAlign: 'center', color: '#5b6777', fontWeight: 700, letterSpacing: '0.3px', borderRight: '1px solid #e1e7ef' }}>Semester</th>
              <th style={{ padding: '14px 12px', textAlign: 'center', color: '#5b6777', fontWeight: 700, letterSpacing: '0.3px', borderRight: '1px solid #e1e7ef' }}>Questions</th>
              <th style={{ padding: '14px 12px', textAlign: 'center', color: '#5b6777', fontWeight: 700, letterSpacing: '0.3px', borderRight: '1px solid #e1e7ef' }}>Status</th>
              <th style={{ padding: '14px 12px', textAlign: 'center', color: '#5b6777', fontWeight: 700, letterSpacing: '0.3px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {(papers || []).map((paper, index) => (
              <tr key={index} style={{ backgroundColor: '#5f6f81', color: '#ffffff' }}>
                <td style={{ padding: '14px 12px', borderTop: '1px solid #e1e7ef', borderRight: '1px solid #e1e7ef', fontWeight: 600 }}>
                  {paper.subject_name}
                </td>
                <td style={{ padding: '14px 12px', borderTop: '1px solid #e1e7ef', borderRight: '1px solid #e1e7ef' }}>
                  {paper.subject_code}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'center', borderTop: '1px solid #e1e7ef', borderRight: '1px solid #e1e7ef' }}>
                  {paper.semester}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'center', borderTop: '1px solid #e1e7ef', borderRight: '1px solid #e1e7ef' }}>
                  {paper.questions ? paper.questions.length : 0}
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'center', borderTop: '1px solid #e1e7ef', borderRight: '1px solid #e1e7ef' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    backgroundColor: paper.status === 'approved' ? '#d1f4e0' : paper.status === 'rejected' ? '#ffe0e0' : '#fff3cd',
                    color: paper.status === 'approved' ? '#0f5132' : paper.status === 'rejected' ? '#842029' : '#664d03',
                    fontWeight: 700,
                    letterSpacing: '0.3px'
                  }}>
                    {paper.status ? paper.status.toUpperCase() : 'PENDING'}
                  </span>
                </td>
                <td style={{ padding: '14px 12px', textAlign: 'center', borderTop: '1px solid #e1e7ef' }}>
                  <button
                    onClick={() => handlePaperClick(paper)}
                    style={{
                      padding: '10px 18px',
                      backgroundColor: '#20c997',
                      color: '#073b2a',
                      border: '1px solid #17b187',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                    }}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      )}
      
      {/* Action Buttons - Bottom Right Corner */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        gap: '10px',
        zIndex: 1000
      }}>
        <button
          onClick={handleViewApprovedPapers}
          style={{
            padding: '12px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#218838';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#28a745';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          ✅ Approved Papers
        </button>
        
        <button
          onClick={handleViewRejectedPapers}
          style={{
            padding: '12px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#c82333';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#dc3545';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          📋 Rejected Papers
        </button>
      </div>
    </div>
  );
};

export default QuestionPapers;
