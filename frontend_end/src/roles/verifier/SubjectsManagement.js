import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function SubjectsManagement({ verifier }) {
  const [subjects, setSubjects] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('all');

  // Fetch subjects for this department
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch subjects for this department
      const subjectsRes = await axios.get(`${API_BASE}/subjects`, {
        params: { department: verifier.department }
      });

      // Fetch faculties for this department
      const facultiesRes = await axios.get(`${API_BASE}/verifier/faculties/department/${encodeURIComponent(verifier.department)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('verifierToken') || ''}`,
          'Content-Type': 'application/json'
        }
      });

      setSubjects(subjectsRes.data || []);
      setFaculties(facultiesRes.data || []);
      setError(null);
      setSuccessMessage(null); // Clear any previous success message
    } catch (err) {
      console.error('Error fetching subjects data:', err);
      setError('Failed to load subjects and faculties');
      setSubjects([]);
      setFaculties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (verifier?.department) {
      fetchData();
    }
  }, [verifier]);

  // Reset dialog on component mount/unmount
  useEffect(() => {
    return () => {
      setShowDialog(false);
      setDialogMessage('');
    };
  }, []);

  // Helper function to get unique semesters from subjects
  const getAvailableSemesters = () => {
    const semesters = [...new Set(subjects.map(subject => subject.semester))];
    return semesters.sort((a, b) => a - b);
  };

  // Filter subjects based on selected semester
  const filteredSubjects = selectedSemester === 'all'
    ? subjects
    : subjects.filter(subject => subject.semester === parseInt(selectedSemester));

  const assignSubjectToFaculty = async (subjectCode, facultyId) => {
    try {
      const response = await axios.post(`${API_BASE}/verifier/assign-subject`, {
        subjectCode,
        facultyId,
        department: verifier.department
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('verifierToken') || ''}`,
          'Content-Type': 'application/json'
        }
      });

      // Display success message in a small modal/popup instead of alert
      setSuccessMessage(`Subject ${subjectCode} assigned successfully!`);
      // Refresh data locally instead of full page reload
      await fetchData();

      // Auto-hide the message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error assigning subject:', err);

      // Check if it's a limit exceeded error
      if (err.response?.data?.error === 'Faculty has reached the maximum limit of 2 papers') {
        // Show allocation limit modal instead of alert
        setDialogMessage('Faculty has reached the maximum limit of 2 papers and is allocated.');
        setShowDialog(true);
      } else {
        alert('Failed to assign subject: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const removeSubjectFromFaculty = async (subjectCode, facultyId) => {
    try {
      console.log('Removing subject assignment:', { subjectCode, facultyId, department: verifier.department });
      
      const response = await axios({
        method: 'delete',
        url: `${API_BASE}/verifier/remove-subject-assignment`,
        data: {
          subjectCode: String(subjectCode || '').trim(),
          facultyId: String(facultyId || '').trim(),
          department: String(verifier.department || '').trim()
        },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('verifierToken') || ''}`,
          'Content-Type': 'application/json'
        }
      });

      // Refresh data locally instead of full page reload
      await fetchData();

      // Display centered dialog with success message
      setDialogMessage(`Subject ${subjectCode} assignment removed successfully!`);
      setShowDialog(true);
    } catch (err) {
      console.error('Error removing subject assignment:', err);
      const errorMessage = err.response?.data?.details || err.response?.data?.error || err.message;
      alert(`Failed to remove subject assignment: ${errorMessage}`);
    }
  };

  if (loading) return <div>Loading subjects...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;

  return (
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
            Subject Management - {verifier.department}
          </h1>
          <p style={{
            margin: '8px 0 0 0',
            opacity: '0.9',
            fontSize: '1rem',
            fontWeight: '300',
            color: '#e9ecef'
          }}>
            Manage Subject Assignments and Faculty Allocations for Verification
          </p>
        </div>

        <div style={{ padding: '40px' }}>
          {/* Semester Filter */}
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontWeight: '600', color: '#2c3e50' }}>Filter by Semester:</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '14px',
                minWidth: '150px',
                backgroundColor: 'white'
              }}
            >
              <option value="all">All Semesters</option>
              {getAvailableSemesters().map(semester => (
                <option key={semester} value={semester}>Semester {semester}</option>
              ))}
            </select>
          </div>

          {/* Success message popup */}
          {successMessage && (
            <div style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              backgroundColor: '#4caf50',
              color: 'white',
              padding: '10px 15px',
              borderRadius: '4px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              zIndex: 1000,
              fontSize: '14px',
              maxWidth: '300px',
              border: '2px solid #fff'
            }}>
              <strong> Success:</strong> {successMessage}
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setSuccessMessage(null);
                    // Auto-hide after 2 seconds if user clicks OK
                    setTimeout(() => setSuccessMessage(null), 2000);
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid white',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          )}

          {/* Centered Dialog for Removal Success */}
          {showDialog && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1001
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                textAlign: 'center',
                maxWidth: '400px',
                width: '90%'
              }}>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#dc3545',
                  marginBottom: '15px'
                }}>
                  Alert!
                </div>
                <div style={{
                  fontSize: '16px',
                  color: '#333',
                  marginBottom: '20px'
                }}>
                  {dialogMessage}
                </div>
                <button
                  onClick={() => setShowDialog(false)}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          )}


          {/* Subjects List */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{
              marginBottom: '20px',
              color: '#2c3e50',
              fontSize: '1.5rem',
              fontWeight: '600',
              letterSpacing: '0.3px'
            }}>
              Department Subjects {selectedSemester !== 'all' && `(Semester ${selectedSemester})`}
            </h2>
            {filteredSubjects.length === 0 && selectedSemester !== 'all' && (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ fontSize: '16px', color: '#6c757d' }}>
                  No subjects found for Semester {selectedSemester}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gap: '15px' }}>
              {filteredSubjects.map(subject => (
                <div
                  key={subject.subject_code}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '15px',
                    backgroundColor: '#f9f9f9'
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                    {subject.subject_code} - {subject.subject_name}
                  </div>
                  <div style={{ color: '#666', margin: '5px 0' }}>
                    Semester: {subject.semester} | Department: {subject.department}
                  </div>

                  {/* Assigned Faculties */}
                  <div style={{ marginTop: '10px' }}>
                    <strong>Assigned to:</strong>
                    {(() => {
                      // Find assignments for this subject
                      const assignedFaculties = faculties.filter(faculty =>
                        faculty.assignedSubjects?.includes(subject.subject_code)
                      );

                      return assignedFaculties.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                          {assignedFaculties.map(faculty => (
                            <span
                              key={faculty._id}
                              style={{
                                backgroundColor: '#e8f5e8',
                                color: '#2e7d32',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}
                            >
                              {faculty.name}
                              <button
                                onClick={() => removeSubjectFromFaculty(subject.subject_code, faculty._id)}
                                style={{
                                  marginLeft: '5px',
                                  background: 'none',
                                  border: 'none',
                                  color: '#d32f2f',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                                title="Remove assignment"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: '#999', fontStyle: 'italic' }}> Not assigned</span>
                      );
                    })()}
                  </div>

                  {/* Assign to Faculty Dropdown */}
                  <div style={{ marginTop: '10px' }}>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          assignSubjectToFaculty(subject.subject_code, e.target.value);
                          e.target.value = ''; // Reset dropdown
                        }
                      }}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Assign to faculty...</option>
                      {faculties
                        .filter(faculty => !faculty.assignedSubjects?.includes(subject.subject_code))
                        .map(faculty => (
                          <option key={faculty._id} value={faculty._id}>
                            {faculty.name} ({faculty.email})
                          </option>
                        ))}
                    </select>
                    {faculties.filter(faculty => !faculty.assignedSubjects?.includes(subject.subject_code)).length === 0 && (
                      <div style={{ color: '#ff9800', fontSize: '12px', marginTop: '5px' }}>
                        ⚠️ All available faculty members are already assigned to this subject
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Faculty Assignment Summary */}
          <div>
            <h2 style={{
              marginBottom: '20px',
              color: '#2c3e50',
              fontSize: '1.5rem',
              fontWeight: '600',
              letterSpacing: '0.3px'
            }}>
              Faculty Assignment Summary
            </h2>
            {faculties.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ fontSize: '16px', color: '#6c757d' }}>
                  No faculty members found for this department
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gap: '10px' }}>
              {faculties.map(faculty => (
                <div
                  key={faculty._id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '15px',
                    backgroundColor: '#f9f9f9'
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                    {faculty.name}
                  </div>
                  <div style={{ color: '#666', margin: '5px 0' }}>
                    {faculty.email} | {faculty.type}
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    <strong>Assigned Subjects:</strong> {faculty.assignedSubjects?.length || 0}
                    {faculty.assignedSubjects?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                        {faculty.assignedSubjects.map(subjectCode => (
                          <span
                            key={subjectCode}
                            style={{
                              backgroundColor: '#e3f2fd',
                              color: '#1976d2',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          >
                            {subjectCode}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubjectsManagement;