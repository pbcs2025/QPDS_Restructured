import { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from 'xlsx';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function ReportsManagement({ verifier }) {
  const [reportType, setReportType] = useState('department'); // 'department' or 'subject'
  const [departmentData, setDepartmentData] = useState(null);
  const [subjectData, setSubjectData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [approvedPapers, setApprovedPapers] = useState([]);
  const [rejectedPapers, setRejectedPapers] = useState([]);

  // Fetch department-wise report
  const fetchDepartmentReport = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!verifier || !verifier.department) {
        throw new Error('Department information not available');
      }

      console.log('Fetching department report for:', verifier.department);

      // Use the correct endpoints with department filter
      const [approvedRes, rejectedRes] = await Promise.all([
        axios.get(`${API_BASE}/verifier/approved-list?department=${encodeURIComponent(verifier.department)}`),
        axios.get(`${API_BASE}/verifier/rejected-list?department=${encodeURIComponent(verifier.department)}`)
      ]);

      console.log('Approved response:', approvedRes.data);
      console.log('Rejected response:', rejectedRes.data);

      // The backend already filters by department, so use the data directly
      const approved = Array.isArray(approvedRes.data) ? approvedRes.data : [];
      const rejected = Array.isArray(rejectedRes.data) ? rejectedRes.data : [];

      console.log('Filtered approved papers:', approved.length);
      console.log('Filtered rejected papers:', rejected.length);

      setApprovedPapers(approved);
      setRejectedPapers(rejected);

      setDepartmentData({
        approved: approved.length,
        rejected: rejected.length,
        total: approved.length + rejected.length
      });

      console.log('Department data set:', {
        approved: approved.length,
        rejected: rejected.length,
        total: approved.length + rejected.length
      });
    } catch (err) {
      console.error('Error fetching department report:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError('Failed to load department report. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch subject-wise report
  const fetchSubjectReport = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!verifier || !verifier.department) {
        throw new Error('Department information not available');
      }

      // Use the correct endpoints with department filter
      const [approvedRes, rejectedRes] = await Promise.all([
        axios.get(`${API_BASE}/verifier/approved-list?department=${encodeURIComponent(verifier.department)}`),
        axios.get(`${API_BASE}/verifier/rejected-list?department=${encodeURIComponent(verifier.department)}`)
      ]);

      // Backend already filters by department, so use the data directly
      const approved = Array.isArray(approvedRes.data) ? approvedRes.data : [];
      const rejected = Array.isArray(rejectedRes.data) ? rejectedRes.data : [];

      setApprovedPapers(approved);
      setRejectedPapers(rejected);

      // Group by subject
      const subjectStats = {};

      // Process approved papers
      approved.forEach(paper => {
        const key = `${paper.subject_code}_${paper.subject_name}`;
        if (!subjectStats[key]) {
          subjectStats[key] = {
            subject_code: paper.subject_code,
            subject_name: paper.subject_name,
            approved: 0,
            rejected: 0,
            total: 0,
            approvedPapers: [],
            rejectedPapers: []
          };
        }
        subjectStats[key].approved++;
        subjectStats[key].total++;
        subjectStats[key].approvedPapers.push(paper);
      });

      // Process rejected papers
      rejected.forEach(paper => {
        const key = `${paper.subject_code}_${paper.subject_name}`;
        if (!subjectStats[key]) {
          subjectStats[key] = {
            subject_code: paper.subject_code,
            subject_name: paper.subject_name,
            approved: 0,
            rejected: 0,
            total: 0,
            approvedPapers: [],
            rejectedPapers: []
          };
        }
        subjectStats[key].rejected++;
        subjectStats[key].total++;
        subjectStats[key].rejectedPapers.push(paper);
      });

      setSubjectData(Object.values(subjectStats));

      console.log('Subject data processed:', Object.values(subjectStats));
    } catch (err) {
      console.error('Error fetching subject report:', err);
      setError('Failed to load subject report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportType === 'department') {
      fetchDepartmentReport();
    } else {
      fetchSubjectReport();
    }
  }, [reportType, verifier.department]);

  // Export department report to Excel
  const exportDepartmentReportToExcel = () => {
    if (!departmentData) return;

    const approvalRate = departmentData.total > 0 ?
      Math.round((departmentData.approved / departmentData.total) * 100) : 0;

    // Summary sheet
    const summaryData = [
      {
        'Department': verifier.department,
        'Total Papers': departmentData.total,
        'Approved': departmentData.approved,
        'Rejected': departmentData.rejected,
        'Approval Rate (%)': approvalRate
      }
    ];

    // Approved papers details
    const approvedDetails = approvedPapers.map(paper => ({
      'Paper ID': paper._id || paper.id,
      'Subject Code': paper.subject_code,
      'Subject Name': paper.subject_name,
      'Faculty Name': paper.faculty_name || paper.facultyName,
      'Status': 'Approved',
      'Date': paper.created_at || paper.createdAt || new Date().toISOString().split('T')[0]
    }));

    // Rejected papers details
    const rejectedDetails = rejectedPapers.map(paper => ({
      'Paper ID': paper._id || paper.id,
      'Subject Code': paper.subject_code,
      'Subject Name': paper.subject_name,
      'Faculty Name': paper.faculty_name || paper.facultyName,
      'Status': 'Rejected',
      'Date': paper.created_at || paper.createdAt || new Date().toISOString().split('T')[0]
    }));

    const wb = XLSX.utils.book_new();

    // Add summary sheet
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Add approved papers sheet
    if (approvedDetails.length > 0) {
      const approvedWs = XLSX.utils.json_to_sheet(approvedDetails);
      XLSX.utils.book_append_sheet(wb, approvedWs, 'Approved Papers');
    }

    // Add rejected papers sheet
    if (rejectedDetails.length > 0) {
      const rejectedWs = XLSX.utils.json_to_sheet(rejectedDetails);
      XLSX.utils.book_append_sheet(wb, rejectedWs, 'Rejected Papers');
    }

    XLSX.writeFile(wb, `${verifier.department}_department_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export subject report to Excel
  const exportSubjectReportToExcel = () => {
    if (!subjectData || subjectData.length === 0) return;

    // Summary sheet with subject-wise stats
    const summaryData = subjectData.map(subject => ({
      'Subject Code': subject.subject_code,
      'Subject Name': subject.subject_name,
      'Total Papers': subject.total,
      'Approved': subject.approved,
      'Rejected': subject.rejected,
      'Approval Rate (%)': subject.total > 0 ? Math.round((subject.approved / subject.total) * 100) : 0
    }));

    // Add overall summary row
    const totalPapers = subjectData.reduce((sum, subj) => sum + subj.total, 0);
    const totalApproved = subjectData.reduce((sum, subj) => sum + subj.approved, 0);
    const overallApprovalRate = totalPapers > 0 ? Math.round((totalApproved / totalPapers) * 100) : 0;

    summaryData.push({
      'Subject Code': 'OVERALL TOTAL',
      'Subject Name': '',
      'Total Papers': totalPapers,
      'Approved': totalApproved,
      'Rejected': subjectData.reduce((sum, subj) => sum + subj.rejected, 0),
      'Approval Rate (%)': overallApprovalRate
    });

    // Approved papers details with subject grouping
    const approvedDetails = [];
    subjectData.forEach(subject => {
      subject.approvedPapers?.forEach(paper => {
        approvedDetails.push({
          'Subject Code': subject.subject_code,
          'Subject Name': subject.subject_name,
          'Paper ID': paper._id || paper.id,
          'Faculty Name': paper.faculty_name || paper.facultyName,
          'Status': 'Approved',
          'Date': paper.created_at || paper.createdAt || new Date().toISOString().split('T')[0]
        });
      });
    });

    // Rejected papers details with subject grouping
    const rejectedDetails = [];
    subjectData.forEach(subject => {
      subject.rejectedPapers?.forEach(paper => {
        rejectedDetails.push({
          'Subject Code': subject.subject_code,
          'Subject Name': subject.subject_name,
          'Paper ID': paper._id || paper.id,
          'Faculty Name': paper.faculty_name || paper.facultyName,
          'Status': 'Rejected',
          'Date': paper.created_at || paper.createdAt || new Date().toISOString().split('T')[0]
        });
      });
    });

    const wb = XLSX.utils.book_new();

    // Add summary sheet
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Subject Summary');

    // Add approved papers sheet
    if (approvedDetails.length > 0) {
      const approvedWs = XLSX.utils.json_to_sheet(approvedDetails);
      XLSX.utils.book_append_sheet(wb, approvedWs, 'Approved Papers');
    }

    // Add rejected papers sheet
    if (rejectedDetails.length > 0) {
      const rejectedWs = XLSX.utils.json_to_sheet(rejectedDetails);
      XLSX.utils.book_append_sheet(wb, rejectedWs, 'Rejected Papers');
    }

    XLSX.writeFile(wb, `${verifier.department}_subject_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const renderDepartmentReport = () => {
    console.log('renderDepartmentReport called with departmentData:', departmentData);
    if (!departmentData) return null;

    const approvalRate = departmentData.total > 0 ?
      Math.round((departmentData.approved / departmentData.total) * 100) : 0;

    return (
      <div style={{ marginTop: '20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <h2 style={{
            margin: '0',
            color: '#2c3e50',
            fontSize: '1.8rem',
            fontWeight: '600',
            letterSpacing: '0.3px'
          }}>
            Department-wise Report: {verifier.department}
          </h2>
          <button
            onClick={exportDepartmentReportToExcel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.9rem',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#218838';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#28a745';
            }}
          >
            Export to Excel
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
          marginBottom: '35px',
          maxWidth: '1400px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <div style={{
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '20px',
            backgroundColor: 'white',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              margin: '0 0 10px 0',
              color: '#495057',
              fontSize: '1rem',
              fontWeight: '600'
            }}>
              Total Papers
            </h3>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#17a2b8'
            }}>
              {departmentData.total}
            </div>
          </div>

          <div style={{
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '20px',
            backgroundColor: 'white',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              margin: '0 0 10px 0',
              color: '#495057',
              fontSize: '1rem',
              fontWeight: '600'
            }}>
              Approved
            </h3>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#28a745'
            }}>
              {departmentData.approved}
            </div>
          </div>

          <div style={{
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '20px',
            backgroundColor: 'white',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              margin: '0 0 10px 0',
              color: '#495057',
              fontSize: '1rem',
              fontWeight: '600'
            }}>
              Rejected
            </h3>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#dc3545'
            }}>
              {departmentData.rejected}
            </div>
          </div>

          <div style={{
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '20px',
            backgroundColor: 'white',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <h3 style={{
              margin: '0 0 10px 0',
              color: '#495057',
              fontSize: '1rem',
              fontWeight: '600'
            }}>
              Approval Rate
            </h3>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#007bff'
            }}>
              {approvalRate}%
            </div>
          </div>
        </div>

        {/* Visual Representation */}
        <div style={{
          marginTop: '30px',
          backgroundColor: '#f8f9fa',
          padding: '25px',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{
            margin: '0 0 20px 0',
            color: '#2c3e50',
            fontSize: '1.2rem',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            Approval vs Rejection Overview
          </h3>
          <div style={{
            display: 'flex',
            height: '40px',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '15px'
          }}>
            <div
              style={{
                backgroundColor: '#28a745',
                width: `${departmentData.total > 0 ? (departmentData.approved / departmentData.total) * 100 : 0}%`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              {departmentData.approved > 0 && `${departmentData.approved} Approved (${Math.round((departmentData.approved / departmentData.total) * 100)}%)`}
            </div>
            <div
              style={{
                backgroundColor: '#dc3545',
                width: `${departmentData.total > 0 ? (departmentData.rejected / departmentData.total) * 100 : 0}%`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              {departmentData.rejected > 0 && `${departmentData.rejected} Rejected (${Math.round((departmentData.rejected / departmentData.total) * 100)}%)`}
            </div>
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '25px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#28a745',
                borderRadius: '2px'
              }}></div>
              <span style={{ fontSize: '0.9rem', color: '#495057' }}>Approved</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#dc3545',
                borderRadius: '2px'
              }}></div>
              <span style={{ fontSize: '0.9rem', color: '#495057' }}>Rejected</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSubjectReport = () => {
    if (!subjectData || subjectData.length === 0) return null;

    return (
      <div style={{ marginTop: '20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <h2 style={{
            margin: '0',
            color: '#2c3e50',
            fontSize: '1.8rem',
            fontWeight: '600',
            letterSpacing: '0.3px'
          }}>
            Subject-wise Report: {verifier.department}
          </h2>
          <button
            onClick={exportSubjectReportToExcel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '0.9rem',
              transition: 'background-color 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#0056b3';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#007bff';
            }}
          >
            Export to Excel
          </button>
        </div>

        <div style={{
          overflowX: 'auto',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          backgroundColor: 'white'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#f8f9fa',
                borderBottom: '2px solid #dee2e6'
              }}>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  color: '#495057',
                  borderRight: '1px solid #dee2e6'
                }}>
                  Subject Code
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  color: '#495057',
                  borderRight: '1px solid #dee2e6'
                }}>
                  Subject Name
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  color: '#495057',
                  borderRight: '1px solid #dee2e6'
                }}>
                  Total Papers
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  color: '#495057',
                  borderRight: '1px solid #dee2e6'
                }}>
                  Approved
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  color: '#495057',
                  borderRight: '1px solid #dee2e6'
                }}>
                  Rejected
                </th>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  color: '#495057'
                }}>
                  Approval Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {subjectData.map((subject, index) => {
                const approvalRate = subject.total > 0 ? Math.round((subject.approved / subject.total) * 100) : 0;
                return (
                  <tr key={index} style={{
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                    transition: 'background-color 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => {
                    e.target.closest('tr').style.backgroundColor = '#e3f2fd';
                  }}
                  onMouseOut={(e) => {
                    e.target.closest('tr').style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                  }}>
                    <td style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #dee2e6',
                      fontWeight: '500',
                      color: '#495057',
                      fontSize: '0.9rem'
                    }}>
                      {subject.subject_code}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #dee2e6',
                      color: '#6c757d',
                      fontSize: '0.9rem'
                    }}>
                      {subject.subject_name}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #dee2e6',
                      textAlign: 'center',
                      fontWeight: '600',
                      fontSize: '1rem',
                      color: '#17a2b8'
                    }}>
                      {subject.total}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #dee2e6',
                      textAlign: 'center',
                      color: '#28a745',
                      fontWeight: '600',
                      fontSize: '1rem'
                    }}>
                      {subject.approved}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #dee2e6',
                      textAlign: 'center',
                      color: '#dc3545',
                      fontWeight: '600',
                      fontSize: '1rem'
                    }}>
                      {subject.rejected}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #dee2e6',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{
                          fontWeight: '600',
                          fontSize: '0.95rem',
                          color: approvalRate >= 80 ? '#28a745' : approvalRate >= 60 ? '#ffc107' : '#dc3545'
                        }}>
                          {approvalRate}%
                        </span>
                        <div style={{
                          width: '60px',
                          height: '8px',
                          backgroundColor: '#e9ecef',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${approvalRate}%`,
                            height: '100%',
                            backgroundColor: approvalRate >= 80 ? '#28a745' : approvalRate >= 60 ? '#ffc107' : '#dc3545',
                            borderRadius: '4px'
                          }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div style={{
          marginTop: '25px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{
            margin: '0 0 15px 0',
            color: '#2c3e50',
            fontSize: '1.1rem',
            fontWeight: '600',
            textAlign: 'center'
          }}>
            Summary
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '15px'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '12px',
              borderRadius: '6px',
              textAlign: 'center',
              border: '1px solid #dee2e6'
            }}>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#6f42c1'
              }}>
                {subjectData.length}
              </div>
              <div style={{
                fontWeight: '500',
                color: '#6c757d',
                fontSize: '0.8rem'
              }}>
                Total Subjects
              </div>
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '12px',
              borderRadius: '6px',
              textAlign: 'center',
              border: '1px solid #dee2e6'
            }}>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#17a2b8'
              }}>
                {subjectData.reduce((sum, subj) => sum + subj.total, 0)}
              </div>
              <div style={{
                fontWeight: '500',
                color: '#6c757d',
                fontSize: '0.8rem'
              }}>
                Total Papers
              </div>
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '12px',
              borderRadius: '6px',
              textAlign: 'center',
              border: '1px solid #dee2e6'
            }}>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: (() => {
                  const rate = (() => {
                    const total = subjectData.reduce((sum, subj) => sum + subj.total, 0);
                    const approved = subjectData.reduce((sum, subj) => sum + subj.approved, 0);
                    return total > 0 ? Math.round((approved / total) * 100) : 0;
                  })();
                  return rate >= 80 ? '#28a745' : rate >= 60 ? '#ffc107' : '#dc3545';
                })()
              }}>
                {(() => {
                  const total = subjectData.reduce((sum, subj) => sum + subj.total, 0);
                  const approved = subjectData.reduce((sum, subj) => sum + subj.approved, 0);
                  return total > 0 ? Math.round((approved / total) * 100) : 0;
                })()}%
              </div>
              <div style={{
                fontWeight: '500',
                color: '#6c757d',
                fontSize: '0.8rem'
              }}>
                Overall Approval Rate
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
            Reports - {verifier.department}
          </h1>
          <p style={{
            margin: '8px 0 0 0',
            opacity: '0.9',
            fontSize: '1rem',
            fontWeight: '300',
            color: '#e9ecef'
          }}>
            Comprehensive Analysis of Question Paper Verification Status
          </p>
        </div>

        <div style={{ padding: '20px' }}>

          {/* Report Type Selector */}
          <div style={{
            marginBottom: '30px',
            backgroundColor: '#f8f9fa',
            padding: '25px',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              flexWrap: 'wrap'
            }}>
              <label style={{
                fontWeight: '600',
                fontSize: '1rem',
                color: '#495057',
                marginRight: '10px'
              }}>
                Report Type:
              </label>
              <button
                onClick={() => setReportType('department')}
                style={{
                  padding: '10px 20px',
                  border: reportType === 'department' ? '2px solid #007bff' : '2px solid #ced4da',
                  borderRadius: '6px',
                  backgroundColor: reportType === 'department' ? '#007bff' : 'white',
                  color: reportType === 'department' ? 'white' : '#495057',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease',
                  boxShadow: reportType === 'department' ? '0 2px 4px rgba(0, 123, 255, 0.3)' : 'none'
                }}
              >
                Branch-wise (Department)
              </button>
              <button
                onClick={() => setReportType('subject')}
                style={{
                  padding: '10px 20px',
                  border: reportType === 'subject' ? '2px solid #007bff' : '2px solid #ced4da',
                  borderRadius: '6px',
                  backgroundColor: reportType === 'subject' ? '#007bff' : 'white',
                  color: reportType === 'subject' ? 'white' : '#495057',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease',
                  boxShadow: reportType === 'subject' ? '0 2px 4px rgba(0, 123, 255, 0.3)' : 'none'
                }}
              >
                Subject-wise
              </button>
            </div>
          </div>

        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#6c757d'
          }}>
            <div style={{
              fontSize: '2rem',
              marginBottom: '10px'
            }}>
              ⏳
            </div>
            <div style={{
              fontSize: '1.2rem',
              fontWeight: '600'
            }}>
              Loading report data...
            </div>
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '20px',
            borderRadius: '8px',
            border: '1px solid #f5c6cb',
            textAlign: 'center',
            marginTop: '20px'
          }}>
            <div style={{
              fontSize: '1.5rem',
              marginBottom: '10px'
            }}>
              ⚠️
            </div>
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {reportType === 'department' && renderDepartmentReport()}
            {reportType === 'subject' && renderSubjectReport()}
            {reportType === 'department' && !departmentData && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📊</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>No Data Available</div>
                <div style={{ fontSize: '0.9rem', marginTop: '8px' }}>
                  No approved or rejected papers found for your department.
                </div>
              </div>
            )}
            {reportType === 'subject' && (!subjectData || subjectData.length === 0) && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📊</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>No Data Available</div>
                <div style={{ fontSize: '0.9rem', marginTop: '8px' }}>
                  No subject-wise data found for your department.
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}

export default ReportsManagement;