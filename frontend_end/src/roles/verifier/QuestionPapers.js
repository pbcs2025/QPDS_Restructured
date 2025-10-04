import { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function QuestionPapers() {
  const [papers, setPapers] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/verifier/papers`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('verifierToken') || ''}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch papers');
      }
      
      const data = await response.json();
      setPapers(data);
    } catch (err) {
      setError(err.message);
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

  const handleApprovalChange = (questionIndex, approved) => {
    setSelectedPaper(prev => ({
      ...prev,
      questions: prev.questions.map((q, index) => 
        index === questionIndex ? { ...q, approved } : q
      )
    }));
  };

  const handleRemarksChange = (questionIndex, remarks) => {
    setSelectedPaper(prev => ({
      ...prev,
      questions: prev.questions.map((q, index) => 
        index === questionIndex ? { ...q, remarks } : q
      )
    }));
  };

  const handleSendToAdmin = async () => {
    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE}/api/verifier/papers/${selectedPaper._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('verifierToken') || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questions: selectedPaper.questions.map(q => ({
            question_number: q.question_number,
            question_text: q.question_text,
            approved: q.approved || false,
            remarks: q.remarks || ''
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update paper');
      }

      alert('Paper sent to admin successfully!');
      setSelectedPaper(null);
      fetchPapers(); // Refresh the list
    } catch (err) {
      alert('Error sending paper to admin: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Question Papers</h1>
        <p>Loading papers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Question Papers</h1>
        <p style={{ color: 'red' }}>Error: {error}</p>
        <button onClick={fetchPapers}>Retry</button>
      </div>
    );
  }

  if (selectedPaper) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={handleBackToList}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            ← Back to List
          </button>
          <h1 style={{ display: 'inline-block', margin: 0 }}>
            {selectedPaper.subject_name} - Semester {selectedPaper.semester}
          </h1>
        </div>

        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <p><strong>Subject Code:</strong> {selectedPaper.subject_code}</p>
          <p><strong>Subject Name:</strong> {selectedPaper.subject_name}</p>
          <p><strong>Semester:</strong> {selectedPaper.semester}</p>
          <p><strong>Total Questions:</strong> {selectedPaper.questions.length}</p>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Q.No</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Question</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>Approve</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {selectedPaper.questions.map((question, index) => (
              <tr key={index}>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                  {question.question_number}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                  {question.question_text}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={question.approved || false}
                    onChange={(e) => handleApprovalChange(index, e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </td>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                  <textarea
                    value={question.remarks || ''}
                    onChange={(e) => handleRemarksChange(index, e.target.value)}
                    placeholder="Enter remarks..."
                    style={{
                      width: '100%',
                      minHeight: '60px',
                      padding: '8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      resize: 'vertical'
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={handleSendToAdmin}
            disabled={submitting}
            style={{
              padding: '12px 24px',
              backgroundColor: submitting ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {submitting ? 'Sending...' : 'Send to Admin'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Question Papers</h1>
      
      {papers.length === 0 ? (
        <p>No question papers found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Subject Code</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Subject Name</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>Semester</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>Questions</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>Status</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {papers.map((paper) => (
              <tr key={paper._id}>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                  {paper.subject_code}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                  {paper.subject_name}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>
                  {paper.semester}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>
                  {paper.questions ? paper.questions.length : 0}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: paper.status === 'approved' ? '#d4edda' : 
                                   paper.status === 'rejected' ? '#f8d7da' : '#fff3cd',
                    color: paper.status === 'approved' ? '#155724' : 
                           paper.status === 'rejected' ? '#721c24' : '#856404'
                  }}>
                    {paper.status || 'Pending'}
                  </span>
                </td>
                <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>
                  <button
                    onClick={() => handlePaperClick(paper)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    View & Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default QuestionPapers;
