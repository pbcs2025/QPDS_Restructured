import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function BEpapers() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    axios
      .get(`${API_BASE}/submitted/be`)
      .then((res) => {
        const data = Array.isArray(res.data?.papers) ? res.data.papers : Array.isArray(res.data) ? res.data : [];
        if (mounted) setPapers(data);
      })
      .catch((err) => {
        if (mounted) setError(err?.response?.data?.error || 'Failed to load BE submitted papers');
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <div>
      <h1>Submitted BE Papers</h1>
      <div style={{ marginTop: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search by subject code or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            minWidth: '60%',
            padding: '10px',
            border: '1px solid #ced4da',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
      </div>
      {loading && <p>Loading…</p>}
      {error && <p className="error-msg">{error}</p>}
      {!loading && !error && (
        <div className="table-wrapper">
          <table className="user-table">
            <thead>
              <tr style={{ backgroundColor: '#1f1f33', color: 'white' }}>
                <th>Department</th>
                <th>Subject Code</th>
                <th>Subject Name</th>
                <th>Semester</th>
                <th>Submitted At</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {papers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center' }}>No papers submitted yet.</td>
                </tr>
              ) : (
                (() => {
                  const q = (searchQuery || '').toLowerCase();
                  const filteredPapers = (papers || []).filter((p) => {
                    const code = (p.subject_code || p.subjectCode || '').toLowerCase();
                    const name = (p.subject_name || p.subjectName || '').toLowerCase();
                    return code.includes(q) || name.includes(q);
                  });
                  return filteredPapers.map((p) => (
                  <tr key={`${p.subject_code}_${p.semester}`}>
                    <td>{p.department || 'N/A'}</td>
                    <td><strong>{p.subject_code}</strong></td>
                    <td>{p.subject_name || 'N/A'}</td>
                    <td>{p.semester}</td>
                    <td>{p.submitted_at ? new Date(p.submitted_at).toLocaleString() : '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <a
                        href={`/submitted-paper/${encodeURIComponent(p.subject_code)}/${encodeURIComponent(p.semester)}`}
                        className="view-link"
                      >
                        View Paper
                      </a>
                    </td>
                  </tr>
                ));
                })()
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default BEpapers;