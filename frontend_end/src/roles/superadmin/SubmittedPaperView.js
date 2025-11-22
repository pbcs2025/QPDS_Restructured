import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function SubmittedPaperView() {
  const { subjectCode, semester } = useParams();
  const navigate = useNavigate();
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div style={{ padding: '20px' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: '12px' }}>← Back</button>
      <h1>Submitted Paper</h1>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && paper && (
        <div style={{ marginBottom: '20px', padding: '16px', border: '1px solid #e1e7ef', borderRadius: '10px', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Paper: {paper.subject_name} ({paper.subject_code}) - Sem {paper.semester}</h3>
            <span style={{ fontWeight: 700, color: paper.status === 'approved' ? '#0f5132' : paper.status === 'rejected' ? '#842029' : '#664d03' }}>{(paper.status || 'pending').toUpperCase()}</span>
          </div>
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SubmittedPaperView;


