import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function ManageFaculties() {
  const navigate = useNavigate();
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifier, setVerifier] = useState(null);

  // Get verifier info from localStorage
  useEffect(() => {
    const raw = localStorage.getItem("verifier");
    if (!raw) {
      navigate("/login/verifier");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setVerifier(parsed);
    } catch {
      navigate("/login/verifier");
    }
  }, [navigate]);

  // Fetch faculties when verifier is loaded
  useEffect(() => {
    if (verifier?.department) {
      fetchFaculties();
    }
  }, [verifier]);

  const fetchFaculties = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/verifier/faculties/department/${encodeURIComponent(verifier.department)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('verifierToken') || ''}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch faculties');
      }

      const data = await response.json();
      setFaculties(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching faculties:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const assignTemporaryVerifier = async (facultyId) => {
    try {
      const response = await fetch(`${API_BASE}/verifier/assign-temporary/${facultyId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('verifierToken') || ''}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          expiresIn: 8 * 60 * 60 * 1000 // 8 hours in milliseconds
        })
      });

      if (!response.ok) {
        throw new Error('Failed to assign verifier role');
      }

      const result = await response.json();
      alert(`Successfully assigned verifier role to ${result.faculty.name} for 8 hours`);

      // Update the faculty in the local state immediately for real-time UI update
      setFaculties(prevFaculties =>
        prevFaculties.map(faculty =>
          faculty._id === facultyId
            ? { ...faculty, verifierExpiresAt: result.faculty.verifierExpiresAt }
            : faculty
        )
      );
    } catch (err) {
      console.error('Error assigning verifier role:', err);
      alert('Failed to assign verifier role: ' + err.message);
    }
  };

  const formatExpiryTime = (expiresAt) => {
    if (!expiresAt) return null;
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry - now;

    if (diffMs <= 0) return 'Expired';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m remaining`;
  };

  if (!verifier) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Manage Faculties - {verifier.department}</h1>

      {loading && <div>Loading faculties...</div>}
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}

      {!loading && !error && (
        <div>
          <div style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
            Total faculties: {faculties.length} |
            Internal: {faculties.filter(f => f.type === 'internal').length} |
            External: {faculties.filter(f => f.type === 'external').length}
          </div>

          <div style={{ display: 'grid', gap: '15px' }}>
            {faculties.map(faculty => (
              <div
                key={faculty._id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: '#f9f9f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{faculty.name}</div>
                  <div style={{ color: '#666', margin: '5px 0' }}>{faculty.email}</div>
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    backgroundColor: faculty.type === 'internal' ? '#e8f5e8' : '#fff3e0',
                    color: faculty.type === 'internal' ? '#2e7d32' : '#f57c00'
                  }}>
                    {faculty.type.toUpperCase()}
                  </div>
                  {faculty.verifierExpiresAt && (
                    <div style={{
                      display: 'inline-block',
                      marginLeft: '10px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor: '#e3f2fd',
                      color: '#1976d2'
                    }}>
                      VERIFIER: {formatExpiryTime(faculty.verifierExpiresAt)}
                    </div>
                  )}
                </div>

                <div>
                  <button
                    onClick={() => assignTemporaryVerifier(faculty._id)}
                    disabled={!!faculty.verifierExpiresAt}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: faculty.verifierExpiresAt ? '#cccccc' : '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: faculty.verifierExpiresAt ? 'not-allowed' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {faculty.verifierExpiresAt ? 'Already Verifier' : 'Make Verifier'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageFaculties;