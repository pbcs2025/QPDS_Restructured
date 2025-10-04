import React, { useState, useEffect } from 'react';

const QuestionPapers = () => {
  const [papers, setPapers] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch papers from backend
  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/verifier/papers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
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

  // Handle paper selection
  const handlePaperClick = (paper) => {
    setSelectedPaper(paper);
  };

  // Handle approval checkbox change
  const handleApprovalChange = (questionIndex, approved) => {
    setSelectedPaper(prev => ({
      ...prev,
      questions: prev.questions.map((q, index) => 
        index === questionIndex ? { ...q, approved } : q
      )
    }));
  };

  // Handle remarks change
  const handleRemarksChange = (questionIndex, remarks) => {
    setSelectedPaper(prev => ({
      ...prev,
      questions: prev.questions.map((q, index) => 
        index === questionIndex ? { ...q, remarks } : q
      )
    }));
  };

  // Send to admin
  const handleSendToAdmin = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/verifier/papers/${selectedPaper._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questions: selectedPaper.questions.map(q => ({
            questionText: q.questionText,
            marks: q.marks,
            approved: q.approved,
            remarks: q.remarks
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
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Back to list
  const handleBackToList = () => {
    setSelectedPaper(null);
  };

  if (loading) {
    return <div>Loading papers...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // Paper details view
  if (selectedPaper) {
    return (
      <div>
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={handleBackToList}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            ← Back to List
          </button>
          <button 
            onClick={handleSendToAdmin}
            disabled={saving}
            style={{
              padding: '10px 20px',
              backgroundColor: saving ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Sending...' : 'Send to Admin'}
          </button>
        </div>

        <h2>Question Paper: {selectedPaper.title || 'Untitled'}</h2>
        <p><strong>Subject:</strong> {selectedPaper.subject}</p>
        <p><strong>Department:</strong> {selectedPaper.department}</p>
        <p><strong>College:</strong> {selectedPaper.college}</p>
        <p><strong>Submitted by:</strong> {selectedPaper.submittedBy}</p>
        <p><strong>Date:</strong> {new Date(selectedPaper.createdAt).toLocaleDateString()}</p>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1f1f33', color: 'white' }}>
              <th style={{ padding: '12px', border: '1px solid #ccc' }}>Question</th>
              <th style={{ padding: '12px', border: '1px solid #ccc' }}>Marks</th>
              <th style={{ padding: '12px', border: '1px solid #ccc' }}>Approve</th>
              <th style={{ padding: '12px', border: '1px solid #ccc' }}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {selectedPaper.questions.map((question, index) => (
              <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                <td style={{ padding: '12px', border: '1px solid #ccc', verticalAlign: 'top' }}>
                  {question.questionText}
                </td>
                <td style={{ padding: '12px', border: '1px solid #ccc', textAlign: 'center' }}>
                  {question.marks}
                </td>
                <td style={{ padding: '12px', border: '1px solid #ccc', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={question.approved || false}
                    onChange={(e) => handleApprovalChange(index, e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </td>
                <td style={{ padding: '12px', border: '1px solid #ccc' }}>
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
      </div>
    );
  }

  // Papers list view
  return (
    <div>
      <h2>Question Papers</h2>
      {papers.length === 0 ? (
        <p>No papers available for review.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#1f1f33', color: 'white' }}>
              <th style={{ padding: '12px', border: '1px solid #ccc' }}>Title</th>
              <th style={{ padding: '12px', border: '1px solid #ccc' }}>Subject</th>
              <th style={{ padding: '12px', border: '1px solid #ccc' }}>Department</th>
              <th style={{ padding: '12px', border: '1px solid #ccc' }}>College</th>
              <th style={{ padding: '12px', border: '1px solid #ccc' }}>Submitted By</th>
              <th style={{ padding: '12px', border: '1px solid #ccc' }}>Date</th>
              <th style={{ padding: '12px', border: '1px solid #ccc' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {papers.map((paper, index) => (
              <tr key={paper._id} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white' }}>
                <td style={{ padding: '12px', border: '1px solid #ccc' }}>
                  {paper.title || 'Untitled'}
                </td>
                <td style={{ padding: '12px', border: '1px solid #ccc' }}>
                  {paper.subject}
                </td>
                <td style={{ padding: '12px', border: '1px solid #ccc' }}>
                  {paper.department}
                </td>
                <td style={{ padding: '12px', border: '1px solid #ccc' }}>
                  {paper.college}
                </td>
                <td style={{ padding: '12px', border: '1px solid #ccc' }}>
                  {paper.submittedBy}
                </td>
                <td style={{ padding: '12px', border: '1px solid #ccc' }}>
                  {new Date(paper.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '12px', border: '1px solid #ccc' }}>
                  <button
                    onClick={() => handlePaperClick(paper)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default QuestionPapers;
