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

  // For temporary verifiers, only show subjects that are assigned to them specifically
  const baseSubjects = verifier.temporary
    ? subjects.filter(subject =>
        verifier.assignedSubjects?.includes(subject.subject_code)
      )
    : subjects;

  // Filter subjects based on selected semester
  const filteredSubjects = selectedSemester === 'all'
    ? baseSubjects
    : baseSubjects.filter(subject => subject.semester === parseInt(selectedSemester));

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

      // Show error message
      alert('Failed to assign subject: ' + (err.response?.data?.error || err.message));
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
              marginBottom: '25px',
              color: '#2c3e50',
              fontSize: '1.6rem',
              fontWeight: '700',
              letterSpacing: '0.5px',
              textAlign: 'center',
              position: 'relative'
            }}>
              Department Subjects {selectedSemester !== 'all' && `(Semester ${selectedSemester})`}
              <div style={{
                width: '60px',
                height: '3px',
                background: 'linear-gradient(90deg, #007bff, #28a745)',
                borderRadius: '2px',
                margin: '8px auto 0'
              }}></div>
            </h2>
            {filteredSubjects.length === 0 && selectedSemester !== 'all' && (
              <div style={{
                textAlign: 'center',
                padding: '30px',
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                border: '1px solid #dee2e6',
                margin: '20px 0'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px', color: '#6c757d' }}>📭</div>
                <div style={{ fontSize: '18px', color: '#6c757d', fontWeight: '600' }}>
                  No subjects found for Semester {selectedSemester}
                </div>
                <div style={{ fontSize: '14px', color: '#adb5bd', marginTop: '5px' }}>
                  Try selecting "All Semesters" to view all subjects
                </div>
              </div>
            )}
            <div style={{
              display: 'grid',
              gap: '20px',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))'
            }}>
              {filteredSubjects.map(subject => (
                <div
                  key={subject.subject_code}
                  style={{
                    border: '1px solid #e9ecef',
                    borderRadius: '12px',
                    padding: '20px',
                    backgroundColor: 'white',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  {/* Subject Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '12px',
                    paddingBottom: '10px',
                    borderBottom: '2px solid #f8f9fa'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #007bff, #6610f2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      marginRight: '12px'
                    }}>
                      {subject.subject_code.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: '700',
                        fontSize: '16px',
                        color: '#2c3e50',
                        marginBottom: '2px'
                      }}>
                        {subject.subject_code}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#6c757d',
                        fontWeight: '500'
                      }}>
                        {subject.subject_name}
                      </div>
                    </div>
                  </div>

                  {/* Subject Details */}
                  <div style={{
                    display: 'flex',
                    gap: '15px',
                    marginBottom: '15px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{
                      backgroundColor: '#e7f3ff',
                      color: '#0066cc',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      Semester {subject.semester}
                    </div>
                  </div>

                  {/* Assigned Faculties */}
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{
                      fontWeight: '600',
                      color: '#495057',
                      fontSize: '14px',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      Assigned Faculty ({(() => {
                        const assignedFaculties = faculties.filter(faculty =>
                          faculty.assignedSubjects?.includes(subject.subject_code)
                        );
                        return assignedFaculties.length;
                      })()})
                    </div>
                    {(() => {
                      // Find assignments for this subject
                      const assignedFaculties = faculties.filter(faculty =>
                        faculty.assignedSubjects?.includes(subject.subject_code)
                      );

                      return assignedFaculties.length > 0 ? (
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          marginTop: '8px'
                        }}>
                          {assignedFaculties.map(faculty => (
                            <div
                              key={faculty._id}
                              style={{
                                background: 'linear-gradient(45deg, #28a745, #20c997)',
                                color: 'white',
                                padding: '6px 12px',
                                borderRadius: '25px',
                                fontSize: '13px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 4px rgba(40, 167, 69, 0.2)',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              <span>{faculty.name}</span>
                              <button
                                onClick={() => removeSubjectFromFaculty(subject.subject_code, faculty._id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'white',
                                  cursor: 'pointer',
                                  fontSize: '16px',
                                  padding: '0',
                                  marginLeft: '4px',
                                  borderRadius: '50%',
                                  width: '20px',
                                  height: '20px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s ease'
                                }}
                                title="Remove assignment"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{
                          color: '#6c757d',
                          fontStyle: 'italic',
                          fontSize: '14px',
                          padding: '8px 0'
                        }}>
                          🤔 Not assigned to any faculty yet
                        </div>
                      );
                    })()}
                  </div>

                  {/* Assign to Faculty Dropdown */}
                  <div>
                    <label style={{
                      fontWeight: '600',
                      color: '#495057',
                      fontSize: '14px',
                      marginBottom: '8px',
                      display: 'block'
                    }}>
                      Assign New Faculty
                    </label>
                    <div style={{ position: 'relative' }}>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            assignSubjectToFaculty(subject.subject_code, e.target.value);
                            e.target.value = ''; // Reset dropdown
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 15px',
                          borderRadius: '8px',
                          border: '2px solid #e9ecef',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          color: '#495057',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          appearance: 'none',
                          backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236c757d\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6,9 12,15 18,9\'%3e%3c/polyline%3e%3c/svg%3e")',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 10px center',
                          backgroundSize: '16px',
                          paddingRight: '40px'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.borderColor = '#007bff';
                          e.target.style.boxShadow = '0 0 0 3px rgba(0, 123, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.borderColor = '#e9ecef';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <option value="">Select faculty to assign...</option>
                        {faculties
                          .filter(faculty => !faculty.assignedSubjects?.includes(subject.subject_code))
                          .map(faculty => (
                            <option key={faculty._id} value={faculty._id}>
                              {faculty.name} ({faculty.type}) - {faculty.email}
                            </option>
                          ))}
                      </select>
                    </div>
                    {faculties.filter(faculty => !faculty.assignedSubjects?.includes(subject.subject_code)).length === 0 && (
                      <div style={{
                        color: '#ffc107',
                        fontSize: '13px',
                        marginTop: '8px',
                        padding: '8px 12px',
                        backgroundColor: '#fff3cd',
                        borderRadius: '6px',
                        border: '1px solid #ffeaa7',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        All available faculty members are already assigned to this subject
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
              marginBottom: '25px',
              color: '#2c3e50',
              fontSize: '1.6rem',
              fontWeight: '700',
              letterSpacing: '0.5px',
              textAlign: 'center',
              position: 'relative'
            }}>
              Faculty Assignment Summary
              <div style={{
                width: '60px',
                height: '3px',
                background: 'linear-gradient(90deg, #28a745, #ffc107)',
                borderRadius: '2px',
                margin: '8px auto 0'
              }}></div>
            </h2>
            {faculties.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '30px',
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                border: '1px solid #dee2e6',
                margin: '20px 0'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px', color: '#6c757d' }}>👨‍🏫</div>
                <div style={{ fontSize: '18px', color: '#6c757d', fontWeight: '600' }}>
                  No faculty members found
                </div>
                <div style={{ fontSize: '14px', color: '#adb5bd', marginTop: '5px' }}>
                  No faculty members are available for this department
                </div>
              </div>
            )}
            <div style={{
              display: 'grid',
              gap: '20px',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))'
            }}>
              {faculties.map(faculty => (
                <div
                  key={faculty._id}
                  style={{
                    border: '1px solid #e9ecef',
                    borderRadius: '12px',
                    padding: '20px',
                    backgroundColor: 'white',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  {/* Faculty Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '15px',
                    paddingBottom: '12px',
                    borderBottom: '2px solid #f8f9fa'
                  }}>
                    <div style={{
                      width: '45px',
                      height: '45px',
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #17a2b8, #138496)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      marginRight: '12px'
                    }}>
                      {faculty.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: '700',
                        fontSize: '17px',
                        color: '#2c3e50',
                        marginBottom: '2px'
                      }}>
                        {faculty.name}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#6c757d',
                        fontWeight: '500'
                      }}>
                        {faculty.type}
                      </div>
                    </div>
                  </div>

                  {/* Faculty Contact */}
                  <div style={{
                    marginBottom: '15px',
                    padding: '10px 12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#495057',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      📧 {faculty.email}
                    </div>
                  </div>

                  {/* Assigned Subjects Section */}
                  <div>
                    <div style={{
                      fontWeight: '600',
                      color: '#495057',
                      fontSize: '14px',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Assigned Subjects
                      </span>
                      <span style={{
                        backgroundColor: faculty.assignedSubjects?.length > 0 ? '#28a745' : '#6c757d',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {faculty.assignedSubjects?.length || 0}
                      </span>
                    </div>

                    {faculty.assignedSubjects?.length > 0 ? (
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginTop: '10px'
                      }}>
                        {faculty.assignedSubjects.map(subjectCode => (
                          <span
                            key={subjectCode}
                            style={{
                              background: 'linear-gradient(45deg, #007bff, #6610f2)',
                              color: 'white',
                              padding: '4px 10px',
                              borderRadius: '18px',
                              fontSize: '12px',
                              fontWeight: '500',
                              boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            {subjectCode}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        color: '#6c757d',
                        fontStyle: 'italic',
                        fontSize: '14px',
                        padding: '8px 0',
                        textAlign: 'center',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px'
                      }}>
                        No subjects assigned yet
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