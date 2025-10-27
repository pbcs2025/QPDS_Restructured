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


