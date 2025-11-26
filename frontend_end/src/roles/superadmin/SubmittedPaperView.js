import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './questionPaperStyles.css';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function SubmittedPaperView() {
  const { subjectCode, semester } = useParams();
  const navigate = useNavigate();
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const paperRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/verifier/papers/${encodeURIComponent(subjectCode)}/${encodeURIComponent(semester)}`);
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await res.text();
          throw new Error(`Unexpected response (not JSON). First bytes: ${text.slice(0, 60)}`);
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Status ${res.status}`);
        setPaper(data);
      } catch (err) {
        setError(err.message || 'Failed to load paper');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [subjectCode, semester]);

  // Generate USN boxes
  const renderUsnBoxes = () => {
    const boxes = [];
    for (let i = 0; i < 10; i++) {
      boxes.push(<div key={i} className="usn-box"></div>);
    }
    return boxes;
  };

  return (
    <div className="paper-view-container">
      <button onClick={() => navigate(-1)} className="back-button">← Back</button>
      <h1>Submitted Paper</h1>
      {loading && <p>Loading…</p>}
      {error && <p className="error-message">{error}</p>}
      {!loading && !error && paper && (
        <>
          <div className="paper-status">
            <span className={`status-badge ${paper.status}`}>
              {(paper.status || 'pending').toUpperCase()}
            </span>
          </div>
          
          <div className="paper-document" ref={paperRef}>
            {/* Subject Code - Top Right */}
            <div className="subject-code-container">
              <div className="subject-code">{paper.subject_code}</div>
            </div>
            
            {/* Header */}
            <div className="paper-header">
              <h2>GLOBAL ACADEMY OF TECHNOLOGY, BENGALURU</h2>
              <p>(An Autonomous Institute, affiliated to VTU, Belagavi)</p>
            </div>
            
            {/* USN Section */}
            <div className="usn-section">
              <span className="usn-label">USN:</span>
              <div className="usn-boxes">
                {renderUsnBoxes()}
              </div>
            </div>
            
            {/* Exam Information */}
            <div className="exam-info">
              {/* Replace static text with dynamic semester */}
              <p>{`${paper.semester ?? semester} Semester B.E. Degree Second Internal Assessment, April – 2025`}</p>
              <p className="subject-name">Subject Name: {paper.subject_name}</p>
              <div className="exam-details">
                <span>Time: 3 hrs.</span>
                <span>Max. Marks: 100</span>
          <div style={{ marginTop: '12px' }}>
            {paper.questions.map((q, idx) => (
              <div key={idx} style={{ border: '1px solid #e9edf3', borderRadius: '10px', marginBottom: '12px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: '12px', padding: '12px', background: '#f8f9fa' }}>
                  <div style={{ color: '#ffffff', minWidth: '44px', fontWeight: 800, backgroundColor: '#0d6efd', borderRadius: '999px', textAlign: 'center', padding: '4px 0' }}>{q.question_number}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{q.question_text}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#fff', fontWeight: 800, minWidth: '44px', textAlign: 'center', backgroundColor: '#6f42c1', borderRadius: '999px', padding: '4px 10px' }}>CO</span>
                        <span>{q.co || ''}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#fff', fontWeight: 800, minWidth: '44px', textAlign: 'center', backgroundColor: '#fd7e14', borderRadius: '999px', padding: '4px 10px' }}>L</span>
                        <span>{q.l || ''}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#084298', fontWeight: 800 }}>Marks</span>
                        <span style={{ fontWeight: 800, color: '#0b5ed7' }}>{typeof q.marks === 'number' ? q.marks : 0}</span>
                      </div>
                    </div>
                    {q.file_url && (
                      <div style={{ 
                        marginTop: '15px',
                        padding: '15px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '12px',
                        border: '2px solid #e9ecef'
                      }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#495057', 
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          🖼️ Diagram/Image Attachment
                        </div>
                        <img 
                          src={`${API_BASE}${q.file_url}`} 
                          alt={q.file_name || 'diagram attachment'} 
                          style={{ 
                            maxWidth: '100%', 
                            height: 'auto',
                            borderRadius: '8px', 
                            border: '1px solid #dee2e6',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease'
                          }}
                          onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                          onClick={() => {
                            window.open(`${API_BASE}${q.file_url}`, '_blank');
                          }}
                        />
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#6c757d', 
                          marginTop: '8px',
                          textAlign: 'center'
                        }}>
                          Click to view full size
                        </div>
                      </div>
                    )}
                    {/* Verifier Remarks Display */}
                    {q.remarks && q.remarks.trim() && (
                      <div style={{ 
                        marginTop: '10px', 
                        padding: '10px', 
                        backgroundColor: '#fff3cd', 
                        border: '1px solid #ffeaa7', 
                        borderRadius: '6px',
                        borderLeft: '4px solid #ffc107'
                      }}>
                        <div style={{ fontWeight: 600, color: '#856404', marginBottom: '5px' }}>📝 Verifier Remarks:</div>
                        <div style={{ color: '#856404', fontStyle: 'italic' }}>{q.remarks}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Note Section */}
            <div className="note-section">
              <p><em>Note: Answer any five full questions, choosing ONE full question from each module.</em></p>
            </div>
            
            {/* Question Table */}
            <table className="question-table">
              <thead>
                <tr>
                  <th>Q. No.</th>
                  <th>QUESTIONS</th>
                  <th>Marks</th>
                  <th>CO's / Blooms Level (CO/Levels)</th>
                </tr>
              </thead>
              <tbody>
                {paper.questions.map((q, idx) => (
                  <tr key={idx}>
                    <td>{q.question_number}</td>
                    <td className="question-text">{q.question_text}
                      {q.file_url && (
                        <div className="question-image">
                          <img src={`${API_BASE}${q.file_url}`} alt={q.file_name || 'question image'} />
                        </div>
                      )}
                    </td>
                    <td>{typeof q.marks === 'number' ? q.marks : 0}</td>
                    <td>{q.co || ''} / {q.l || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Bottom Section */}
            <div className="bottom-section">
              <div className="asterisks">* * * * *</div>
            </div>
            
            {/* Page Numbers - Added via CSS */}
            <div className="page-number">Page 1 of 1</div>
          </div>
          {/* Close React Fragment */}
          </>
        )}
    </div>
  );
}

export default SubmittedPaperView;


