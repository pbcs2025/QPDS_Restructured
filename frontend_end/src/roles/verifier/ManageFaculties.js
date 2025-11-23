import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function ManageFaculties() {
  const navigate = useNavigate();
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [verifier, setVerifier] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeMessage, setRemoveMessage] = useState("");

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
      setSuccessMessage(`Successfully assigned verifier role to ${result.faculty.name} for 8 hours.\n\nAn email with login credentials has been sent to ${result.faculty.email}.`);
      setShowSuccessModal(true);

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

  const removeTemporaryVerifier = async (facultyId) => {
    try {
      const response = await fetch(`${API_BASE}/verifier/remove-temporary/${facultyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('verifierToken') || ''}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove verifier role');
      }

      const result = await response.json();
      setRemoveMessage(`Successfully removed verifier role from ${result.faculty.name}`);
      setShowRemoveModal(true);

      // Update the faculty in the local state immediately for real-time UI update
      setFaculties(prevFaculties =>
        prevFaculties.map(faculty =>
          faculty._id === facultyId
            ? { ...faculty, verifierExpiresAt: null }
            : faculty
        )
      );
    } catch (err) {
      console.error('Error removing verifier role:', err);
      alert('Failed to remove verifier role: ' + err.message);
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
    <div className="manage-faculties-container">
      <div style={{
        padding: '20px',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
            padding: '30px',
            color: 'white',
            textAlign: 'center'
          }}>
            <h1 style={{
              margin: '0',
              fontSize: '2.2rem',
              fontWeight: '600',
              letterSpacing: '0.5px',
              background: 'linear-gradient(45deg, #ffffff, #e9ecef, #ffffff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none'
            }}>
              Manage Faculties - {verifier.department}
            </h1>
            <p style={{
              margin: '8px 0 0 0',
              opacity: '0.9',
              fontSize: '1rem',
              fontWeight: '300',
              color: '#e9ecef'
            }}>
              Faculty Management and Verifier Role Assignment
            </p>
          </div>

          <div style={{ padding: '40px' }}>
            {loading && <div>Loading faculties...</div>}
            {error && <div style={{ color: 'red' }}>Error: {error}</div>}

            {!loading && !error && (
              <div>
                <div style={{
                  marginBottom: '30px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '20px',
                  maxWidth: '900px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '20px 25px',
                    borderRadius: '10px',
                    border: '1px solid #dee2e6',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                    textAlign: 'center',
                    minHeight: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      fontSize: '2.2rem',
                      fontWeight: '800',
                      color: '#17a2b8',
                      marginBottom: '8px'
                    }}>
                      {faculties.length}
                    </div>
                    <div style={{
                      fontWeight: '600',
                      color: '#6c757d',
                      fontSize: '0.9rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Total Faculties
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '20px 25px',
                    borderRadius: '10px',
                    border: '1px solid #dee2e6',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                    textAlign: 'center',
                    minHeight: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      fontSize: '2.2rem',
                      fontWeight: '800',
                      color: '#28a745',
                      marginBottom: '8px'
                    }}>
                      {faculties.filter(f => f.type === 'internal').length}
                    </div>
                    <div style={{
                      fontWeight: '600',
                      color: '#6c757d',
                      fontSize: '0.9rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Internal Faculty
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '20px 25px',
                    borderRadius: '10px',
                    border: '1px solid #dee2e6',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
                    textAlign: 'center',
                    minHeight: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      fontSize: '2.2rem',
                      fontWeight: '800',
                      color: '#ffc107',
                      marginBottom: '8px'
                    }}>
                      {faculties.filter(f => f.type === 'external').length}
                    </div>
                    <div style={{
                      fontWeight: '600',
                      color: '#6c757d',
                      fontSize: '0.9rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      External Faculty
                    </div>
                  </div>
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
                          {faculty.type ? faculty.type.toUpperCase() : 'UNKNOWN'}
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

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                        {faculty.verifierExpiresAt && (
                          <button
                            onClick={() => removeTemporaryVerifier(faculty._id)}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                            title="Remove verifier role"
                          >
                            Undo
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
            border: '2px solid #667eea',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%)',
              animation: 'rotate 20s linear infinite'
            }}></div>
            <div style={{
              color: '#48bb78',
              fontSize: '64px',
              marginBottom: '20px',
              position: 'relative',
              zIndex: 1,
              animation: 'bounceIn 0.6s ease-out'
            }}>
              🎉
            </div>
            <h3 style={{
              color: '#2d3748',
              margin: '0 0 20px 0',
              fontSize: '24px',
              fontWeight: '700',
              position: 'relative',
              zIndex: 1
            }}>
              Assignment Successful!
            </h3>
            <p style={{
              color: '#718096',
              margin: '0 0 30px 0',
              lineHeight: '1.6',
              whiteSpace: 'pre-line',
              fontSize: '16px',
              position: 'relative',
              zIndex: 1
            }}>
              {successMessage}
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                padding: '14px 28px',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                position: 'relative',
                zIndex: 1
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)';
                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }}
            >
              <span style={{ marginRight: '8px' }}>✓</span>
              OK
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Remove Modal */}
      {showRemoveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #fef5e7 100%)',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '450px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
            border: '2px solid #fc8181',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(252, 129, 129, 0.1) 0%, transparent 70%)',
              animation: 'rotate 20s linear infinite'
            }}></div>
            <div style={{
              color: '#f56565',
              fontSize: '64px',
              marginBottom: '20px',
              position: 'relative',
              zIndex: 1,
              animation: 'bounceIn 0.6s ease-out'
            }}>
              🔄
            </div>
            <h3 style={{
              color: '#2d3748',
              margin: '0 0 20px 0',
              fontSize: '24px',
              fontWeight: '700',
              position: 'relative',
              zIndex: 1
            }}>
              Role Removed Successfully!
            </h3>
            <p style={{
              color: '#718096',
              margin: '0 0 30px 0',
              lineHeight: '1.6',
              fontSize: '16px',
              position: 'relative',
              zIndex: 1
            }}>
              {removeMessage}
            </p>
            <button
              onClick={() => setShowRemoveModal(false)}
              style={{
                background: 'linear-gradient(135deg, #fc8181, #f56565)',
                color: 'white',
                border: 'none',
                padding: '14px 28px',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(252, 129, 129, 0.4)',
                position: 'relative',
                zIndex: 1
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05)';
                e.target.style.boxShadow = '0 6px 20px rgba(252, 129, 129, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 4px 15px rgba(252, 129, 129, 0.4)';
              }}
            >
              <span style={{ marginRight: '8px' }}>✓</span>
              OK
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(180deg); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

export default ManageFaculties;
