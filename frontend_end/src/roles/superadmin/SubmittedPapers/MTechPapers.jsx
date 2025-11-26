import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function MTechPapers() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [showSentForPrint, setShowSentForPrint] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [sentForPrint, setSentForPrint] = useState([]);
  const [archived, setArchived] = useState([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    axios
      .get(`${API_BASE}/submitted/mtech`)
      .then((res) => {
        const data = Array.isArray(res.data?.papers) ? res.data.papers : Array.isArray(res.data) ? res.data : [];
        if (mounted) setPapers(data);
      })
      .catch((err) => {
        if (mounted) setError(err?.response?.data?.error || 'Failed to load MTech submitted papers');
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  // Load/persist Sent for Print and Archived for MTech
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('papersSentForPrint_MTech') || '[]');
      const a = JSON.parse(localStorage.getItem('archivedPapers_MTech') || '[]');
      setSentForPrint(Array.isArray(s) ? s : []);
      setArchived(Array.isArray(a) ? a : []);
    } catch (_) {}
  }, []);
  useEffect(() => { try { localStorage.setItem('papersSentForPrint_MTech', JSON.stringify(sentForPrint)); } catch (_) {} }, [sentForPrint]);
  useEffect(() => { try { localStorage.setItem('archivedPapers_MTech', JSON.stringify(archived)); } catch (_) {} }, [archived]);

  const departments = useMemo(() => {
    const set = new Set((papers || []).map(p => p.department).filter(Boolean));
    return Array.from(set).sort();
  }, [papers]);
  const semesters = useMemo(() => {
    const set = new Set((papers || []).map(p => p.semester).filter(Boolean));
    return Array.from(set).sort((a,b) => Number(a) - Number(b));
  }, [papers]);

  const filteredPapers = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return (papers || []).filter(p => {
      const code = (p.subject_code || p.subjectCode || '').toLowerCase();
      const name = (p.subject_name || p.subjectName || '').toLowerCase();
      const deptOk = !selectedDepartment || (p.department === selectedDepartment);
      const semOk = !selectedSemester || String(p.semester) === String(selectedSemester);
      const searchOk = code.includes(q) || name.includes(q);
      return deptOk && semOk && searchOk;
    });
  }, [papers, searchQuery, selectedDepartment, selectedSemester]);

  const handlePrint = async (p) => {
    try {
      const response = await fetch(`${API_BASE}/verifier/papers/${encodeURIComponent(p.subject_code)}/${encodeURIComponent(p.semester)}/docx`, {
        method: 'GET',
        headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
        cache: 'no-store',
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to generate DOCX (status ${response.status}). ${text}`);
      }
      const contentType = response.headers.get('Content-Type') || '';
      const text = contentType.includes('text/') ? (await response.text()) : '';
      const isDocx = contentType.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') || contentType.includes('application/octet-stream');
      if (!isDocx) {
        alert(`Unexpected response while generating DOCX. Please try again.\nDetails: ${text?.slice(0, 200) || 'no details'}`);
        return;
      }
      const buf = await response.arrayBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = `${p.subject_code}_${p.semester}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setSentForPrint(prev => [{...p, degree: 'MTech', sentForPrintAt: new Date().toISOString()}, ...prev.filter(x => !(x.subject_code===p.subject_code && x.semester===p.semester))]);
    } catch (err) {
      alert(err.message || 'Failed to download DOCX.');
    }
  };

  const handleArchive = (p) => {
    setArchived(prev => [{...p, degree: 'MTech', archivedAt: new Date().toISOString()}, ...prev.filter(x => !(x.subject_code===p.subject_code && x.semester===p.semester))]);
  };

  return (
    <div>
      <h1>Submitted MTech Papers</h1>
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
      <div style={{ 
        marginBottom: '20px', 
        padding: '16px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ marginBottom: '12px', color: '#495057' }}>Filter Papers</h3>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'end', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#495057' }}>Department</label>
            <select value={selectedDepartment} onChange={(e)=>setSelectedDepartment(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', width: '100%' }}>
              <option value="">All Departments</option>
              {departments.map((d)=> (<option key={d} value={d}>{d}</option>))}
            </select>
          </div>
          <div style={{ minWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#495057' }}>Semester</label>
            <select value={selectedSemester} onChange={(e)=>setSelectedSemester(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: '4px', width: '100%' }}>
              <option value="">All Semesters</option>
              {semesters.map((s)=> (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div>
            <button onClick={()=>setShowSentForPrint(!showSentForPrint)} style={{ padding: '8px 14px', backgroundColor: showSentForPrint ? '#6c757d' : '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
              {showSentForPrint ? '← Back to Submitted' : '📄 Papers Sent for Print'}
            </button>
            <button onClick={()=>setShowArchived(!showArchived)} style={{ marginLeft: 8, padding: '8px 14px', backgroundColor: showArchived ? '#6c757d' : '#0d6efd', color: 'white', border: 'none', borderRadius: '4px' }}>
              {showArchived ? '← Back to Submitted' : '📁 Archived Papers'}
            </button>
          </div>
        </div>
      </div>

      {loading && <p>Loading…</p>}
      {/* Suppress error message in UI per request */}
      {showSentForPrint ? (
        <div className="table-wrapper">
          <h3 style={{ marginBottom: '12px', color: '#495057' }}>Papers Sent for Print (MTech)</h3>
          {(sentForPrint && sentForPrint.length > 0) ? (
            <table className="user-table">
              <thead>
                <tr style={{ backgroundColor: '#1f1f33', color: 'white' }}>
                  <th>Department</th>
                  <th>Subject Code</th>
                  <th>Subject Name</th>
                  <th>Semester</th>
                  <th>Sent For Print At</th>
                </tr>
              </thead>
              <tbody>
                {sentForPrint.map((p)=> (
                  <tr key={`${p.subject_code}_${p.semester}`}>
                    <td>{p.department || 'N/A'}</td>
                    <td><strong>{p.subject_code}</strong></td>
                    <td>{p.subject_name || 'N/A'}</td>
                    <td>{p.semester}</td>
                    <td>{p.sentForPrintAt ? new Date(p.sentForPrintAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center' }}>No papers sent for print yet.</p>
          )}
        </div>
      ) : showArchived ? (
        <div className="table-wrapper">
          <h3 style={{ marginBottom: '12px', color: '#495057' }}>Archived Papers (MTech)</h3>
          {(archived && archived.length > 0) ? (
            <table className="user-table">
              <thead>
                <tr style={{ backgroundColor: '#1f1f33', color: 'white' }}>
                  <th>Department</th>
                  <th>Subject Code</th>
                  <th>Subject Name</th>
                  <th>Semester</th>
                  <th>Archived At</th>
                </tr>
              </thead>
              <tbody>
                {archived.map((p)=> (
                  <tr key={`${p.subject_code}_${p.semester}`}>
                    <td>{p.department || 'N/A'}</td>
                    <td><strong>{p.subject_code}</strong></td>
                    <td>{p.subject_name || 'N/A'}</td>
                    <td>{p.semester}</td>
                    <td>{p.archivedAt ? new Date(p.archivedAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center' }}>No archived papers found.</p>
          )}
        </div>
      ) : (
      !loading && (
        <div className="table-wrapper">
          <table className="user-table">
            <thead>
              <tr style={{ backgroundColor: '#1f1f33', color: 'white' }}>
                <th>Department</th>
                <th>Subject Code</th>
                <th>Subject Name</th>
                <th>Semester</th>
                <th>Submitted At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPapers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center' }}>No papers submitted yet.</td>
                </tr>
              ) : (
                filteredPapers.map((p) => (
                  <tr key={`${p.subject_code}_${p.semester}`}>
                    <td>{p.department || 'N/A'}</td>
                    <td><strong>{p.subject_code}</strong></td>
                    <td>{p.subject_name || 'N/A'}</td>
                    <td>{p.semester}</td>
                    <td>{p.submitted_at ? new Date(p.submitted_at).toLocaleString() : '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <a href={`/submitted-paper/${encodeURIComponent(p.subject_code)}/${encodeURIComponent(p.semester)}`} className="view-link" style={{ marginRight: 8 }}>View</a>
                      <button onClick={() => handlePrint(p)} style={{ marginRight: 8 }}>Print</button>
                      <button onClick={() => handleArchive(p)}>Archive</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default MTechPapers;