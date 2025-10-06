import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const QuestionPapers = () => {
  const [papers, setPapers] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');

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

  // Fetch papers when department changes (semester is optional)
  useEffect(() => {
    if (selectedDepartment) {
      fetchPapers();
    }
  }, [selectedDepartment, selectedSemester]);

  // (Optional) Departments fetch retained for future use, but not needed now
  const fetchDepartments = async () => {};

  const fetchPapers = async () => {
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
  };

  const handlePaperClick = (paper) => {
    setSelectedPaper(paper);
  };

  const handleBackToList = () => {
    setSelectedPaper(null);
  };

  const handleQuestionApprovalChange = (questionIndex, approved) => {
    if (!selectedPaper) return;
    const updatedQuestions = selectedPaper.questions.map((q, i) =>
      i === questionIndex ? { ...q, approved } : q
    );
    setSelectedPaper({ ...selectedPaper, questions: updatedQuestions });
  };

  const handleQuestionRemarksChange = (questionIndex, remarks) => {
    if (!selectedPaper) return;
    const updatedQuestions = selectedPaper.questions.map((q, i) =>
      i === questionIndex ? { ...q, remarks } : q
    );
    setSelectedPaper({ ...selectedPaper, questions: updatedQuestions });
  };

  const handleQuestionRejectionChange = (questionIndex, rejected) => {
    if (!selectedPaper) return;
    const updatedQuestions = selectedPaper.questions.map((q, i) => {
      if (i !== questionIndex) return q;
      // Maintain a single source of truth: approved boolean
      return { ...q, approved: rejected ? false : q.approved };
    });
    setSelectedPaper({ ...selectedPaper, questions: updatedQuestions });
  };

  const handleSendToAdmin = async () => {
    if (!selectedPaper) return;

    try {
      setUpdating(true);
      const response = await fetch(`${API_BASE}/verifier/papers/${selectedPaper._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: selectedPaper.questions
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Paper updated successfully:', result);
      
      // Refresh the papers list
      await fetchPapers();
      
      // Show success message (you could add a toast notification here)
      alert('Paper verification status updated successfully!');
      
      // Go back to list
      setSelectedPaper(null);
    } catch (err) {
      console.error('Error updating paper:', err);
      alert('Failed to update paper. Please try again.');
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
          {selectedPaper.questions.map((question, index) => (
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
                  {question.question_text}
                  {question.file_name && (
                    <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '6px' }}>📎 {question.file_name}</div>
                  )}
                </div>
              </div>
              {/* CO / L / Marks row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', padding: '14px 18px', borderTop: '1px solid #e9edf3', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#fff', fontWeight: 800, minWidth: '44px', textAlign: 'center', backgroundColor: '#6f42c1', borderRadius: '999px', padding: '4px 10px' }}>CO</span>
                  <div style={{ flex: 1, padding: '10px 12px', border: '1px solid #e1ccff', borderRadius: '8px', background: '#faf5ff', color: '#3b2c52' }}>{question.co || ''}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#fff', fontWeight: 800, minWidth: '44px', textAlign: 'center', backgroundColor: '#fd7e14', borderRadius: '999px', padding: '4px 10px' }}>L</span>
                  <div style={{ flex: 1, padding: '10px 12px', border: '1px solid #ffd6b0', borderRadius: '8px', background: '#fff7ef', color: '#5a3410' }}>{question.l || ''}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#084298', fontWeight: 800 }}>Marks</span>
                  <div style={{ flex: 1, padding: '10px 12px', border: '1px solid #b6d4fe', borderRadius: '8px', background: '#e7f1ff', textAlign: 'center', fontWeight: 800, color: '#0b5ed7' }}>{question.marks || 'N/A'}</div>
                </div>
              </div>
              {/* Remarks */}
              <div style={{ padding: '14px 18px', borderTop: '1px solid #e9edf3', backgroundColor: '#ffffff' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: '#0d6efd', marginBottom: '6px', letterSpacing: '0.2px' }}>Remarks</label>
                <textarea
                  value={question.remarks || ''}
                  onChange={(e) => handleQuestionRemarksChange(index, e.target.value)}
                  placeholder="Enter your remarks here..."
                  style={{ width: '100%', minHeight: '70px', padding: '12px 14px', border: '1px solid #b6d4fe', borderRadius: '10px', backgroundColor: '#f4f9ff', fontSize: '14px', resize: 'vertical', color: '#1b2a41' }}
                />
              </div>
              {/* Approve / Reject checkboxes below remark */}
              <div style={{ padding: '12px 18px', borderTop: '1px solid #e9edf3', backgroundColor: '#f8fffb', display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    id={`approve_${index}`}
                    type="checkbox"
                    checked={Boolean(question.approved)}
                    onChange={(e) => handleQuestionApprovalChange(index, e.target.checked)}
                    style={{ transform: 'scale(1.2)', cursor: 'pointer', accentColor: '#198754' }}
                  />
                  <label htmlFor={`approve_${index}`} style={{ userSelect: 'none', color: '#0f5132', fontWeight: 700 }}>Approved</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    id={`reject_${index}`}
                    type="checkbox"
                    checked={question.approved === false}
                    onChange={(e) => handleQuestionRejectionChange(index, e.target.checked)}
                    style={{ transform: 'scale(1.2)', cursor: 'pointer', accentColor: '#dc3545' }}
                  />
                  <label htmlFor={`reject_${index}`} style={{ userSelect: 'none', color: '#842029', fontWeight: 700 }}>Rejected</label>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleSendToAdmin}
            disabled={updating}
            style={{
              padding: '12px 30px',
              backgroundColor: updating ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: updating ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {updating ? 'Updating...' : 'Send to Admin'}
          </button>
        </div>
      </div>
    );
  }

  // Show papers list
  return (
    <div style={{ padding: '20px' }}>
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
            {papers.map((paper, index) => (
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
    </div>
  );
};

export default QuestionPapers;
