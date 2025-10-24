import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import '../common/dashboard.css';

const DepartmentStats = () => {
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  // Fetch departments on component mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get(`${API_BASE}/dashboard/departments`);
        setDepartments(response.data);
      } catch (err) {
        console.error('Error fetching departments:', err);
        setError('Failed to load departments');
      }
    };

    fetchDepartments();
  }, [API_BASE]);

  const fetchAnalyticsData = useCallback(async (deptName) => {
    setLoading(true);
    setError(null);
    
    try {
      const encodedDeptName = encodeURIComponent(deptName);
      console.log('Fetching analytics for department:', deptName);
      console.log('Encoded department name:', encodedDeptName);
      console.log('API URL:', `${API_BASE}/dashboard/department/${encodedDeptName}`);
      
      const response = await axios.get(`${API_BASE}/dashboard/department/${encodedDeptName}`);
      console.log('Analytics data received:', response.data);
      console.log('Analytics data structure:', JSON.stringify(response.data, null, 2));
      
      // Check if we have any data
      const { papers_sent, papers_submitted, papers_not_submitted, cos, levels } = response.data;
      console.log('Data breakdown:', {
        papers_sent,
        papers_submitted, 
        papers_not_submitted,
        cos,
        levels
      });
      
      setAnalyticsData(response.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError(`Failed to load analytics data: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const handleDepartmentClick = (deptName) => {
    setSelectedDepartment(deptName);
    fetchAnalyticsData(deptName);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDepartment('');
    setAnalyticsData(null);
  };

  // Unified data function that combines all three data sets
  const getUnifiedChartData = () => {
    if (!analyticsData) return [];

    const { 
      papers_sent = 0, 
      papers_submitted = 0, 
      papers_not_submitted = 0,
      cos = {},
      levels = {}
    } = analyticsData;

    console.log('Unified chart data:', { papers_sent, papers_submitted, papers_not_submitted, cos, levels });

    const unifiedData = [];

    // Add Paper Status data - include even if zero for better visibility
    unifiedData.push({
      name: 'Papers Sent',
      value: papers_sent || 0,
      fill: '#3b82f6',
      category: 'Paper Status'
    });
    unifiedData.push({
      name: 'Papers Submitted',
      value: papers_submitted || 0,
      fill: '#10b981',
      category: 'Paper Status'
    });
    unifiedData.push({
      name: 'Papers Pending',
      value: papers_not_submitted || 0,
      fill: '#f59e0b',
      category: 'Paper Status'
    });

    // Add Course Outcomes data - include all COs (1-5)
    const cosData = [
      { name: 'CO1', value: cos['1'] || 0, fill: '#ef4444' },
      { name: 'CO2', value: cos['2'] || 0, fill: '#f97316' },
      { name: 'CO3', value: cos['3'] || 0, fill: '#eab308' },
      { name: 'CO4', value: cos['4'] || 0, fill: '#22c55e' },
      { name: 'CO5', value: cos['5'] || 0, fill: '#06b6d4' }
    ];

    cosData.forEach(co => {
      unifiedData.push({
        ...co,
        category: 'Course Outcomes'
      });
    });

    // Add Difficulty Levels data - include all levels (1-5)
    const levelsData = [
      { name: 'Level 1', value: levels['1'] || 0, fill: '#8b5cf6' },
      { name: 'Level 2', value: levels['2'] || 0, fill: '#a855f7' },
      { name: 'Level 3', value: levels['3'] || 0, fill: '#c084fc' },
      { name: 'Level 4', value: levels['4'] || 0, fill: '#d946ef' },
      { name: 'Level 5', value: levels['5'] || 0, fill: '#ec4899' }
    ];

    levelsData.forEach(level => {
      unifiedData.push({
        ...level,
        category: 'Difficulty Levels'
      });
    });

    // Check if all values are zero
    const total = unifiedData.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
      // Return sample data for demonstration purposes - ALL COs and Levels
      return [
        {
          name: 'Papers Sent (Sample)',
          value: 5,
          fill: '#3b82f6',
          category: 'Paper Status'
        },
        {
          name: 'Papers Submitted (Sample)',
          value: 3,
          fill: '#10b981',
          category: 'Paper Status'
        },
        {
          name: 'Papers Pending (Sample)',
          value: 2,
          fill: '#f59e0b',
          category: 'Paper Status'
        },
        {
          name: 'CO1 (Sample)',
          value: 4,
          fill: '#ef4444',
          category: 'Course Outcomes'
        },
        {
          name: 'CO2 (Sample)',
          value: 3,
          fill: '#f97316',
          category: 'Course Outcomes'
        },
        {
          name: 'CO3 (Sample)',
          value: 2,
          fill: '#eab308',
          category: 'Course Outcomes'
        },
        {
          name: 'CO4 (Sample)',
          value: 1,
          fill: '#22c55e',
          category: 'Course Outcomes'
        },
        {
          name: 'CO5 (Sample)',
          value: 1,
          fill: '#06b6d4',
          category: 'Course Outcomes'
        },
        {
          name: 'Level 1 (Sample)',
          value: 2,
          fill: '#8b5cf6',
          category: 'Difficulty Levels'
        },
        {
          name: 'Level 2 (Sample)',
          value: 3,
          fill: '#a855f7',
          category: 'Difficulty Levels'
        },
        {
          name: 'Level 3 (Sample)',
          value: 2,
          fill: '#c084fc',
          category: 'Difficulty Levels'
        },
        {
          name: 'Level 4 (Sample)',
          value: 1,
          fill: '#d946ef',
          category: 'Difficulty Levels'
        },
        {
          name: 'Level 5 (Sample)',
          value: 1,
          fill: '#ec4899',
          category: 'Difficulty Levels'
        }
      ];
    }

    return unifiedData;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Professional Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-6 shadow-lg">
            <span className="text-5xl">📊</span>
          </div>
          <h1 className="text-5xl font-bold text-gray-800 mb-4">Department Analytics</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Comprehensive performance insights and data visualization for all departments
          </p>
        </div>

        {/* Department Cards Section */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 mb-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center justify-center">
              <span className="mr-4 text-4xl">🏢</span>
              Available Departments
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Select any department below to view detailed analytics, performance metrics, and data visualizations
            </p>
          </div>
          
          <div className="departments-grid">
            {departments.map((dept) => (
              <div
                key={dept._id}
                onClick={() => handleDepartmentClick(dept.name)}
                className="department-card group"
                style={{
                  backgroundColor: '#ffffff',
                  color: '#1e1e2f',
                  border: '2px solid #e3e6ea',
                  boxShadow: '0 4px 12px rgba(16, 24, 40, 0.08)',
                  borderRadius: '16px',
                  height: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-6px) scale(1.02)';
                  e.target.style.boxShadow = '0 12px 32px rgba(16, 24, 40, 0.15)';
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0) scale(1)';
                  e.target.style.boxShadow = '0 4px 12px rgba(16, 24, 40, 0.08)';
                  e.target.style.borderColor = '#e3e6ea';
                  e.target.style.backgroundColor = '#ffffff';
                }}
              >
                <div style={{ fontSize: '18px', fontWeight: '600', flex: 1, lineHeight: '1.4' }}>
                  {dept.name}
                </div>
                <div style={{ 
                  fontSize: '24px', 
                  color: '#94a3b8',
                  opacity: 0.6,
                  transition: 'all 0.3s ease'
                }}>
                  ›
                </div>
                {/* Hover effect overlay */}
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Compact Modal for Charts */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{selectedDepartment}</h2>
                  <p className="text-indigo-100 text-sm">Analytics Dashboard</p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all duration-300"
                >
                  <span className="text-white text-lg">×</span>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]">
              {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
                  <p className="text-gray-600 text-lg">Loading analytics data...</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <div className="text-red-600 text-xl mb-2">⚠️</div>
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              )}

              {analyticsData && !loading && (
                <div>
                  {/* Charts First - Primary Focus */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 mb-6">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">📊 Analytics Dashboard</h3>
                      <p className="text-gray-600 text-sm">Interactive data visualization</p>
                    </div>
                    
                    {/* Unified Department Analytics Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                      <div className="text-center mb-6">
                        <h4 className="text-2xl font-bold text-gray-800 mb-2 flex items-center justify-center">
                          <span className="mr-3 text-3xl">📊</span>
                          Department Analytics Overview
                        </h4>
                        <p className="text-gray-600 text-sm">
                          Interactive chart with detailed legend below - hover for values
                        </p>
                      </div>
                      
                      {(() => {
                        const unifiedData = getUnifiedChartData();
                        console.log('Rendering Unified Chart with data:', unifiedData);
                        
                        if (unifiedData.length === 0) {
                          return (
                            <div className="flex items-center justify-center h-[400px] text-gray-500">
                              <div className="text-center">
                                <div className="text-6xl mb-4">📊</div>
                                <p className="text-xl font-medium">No Data Available</p>
                                <p className="text-sm">No analytics data found for this department</p>
                              </div>
                            </div>
                          );
                        }

                        // Check if we're showing sample data
                        const isSampleData = unifiedData.some(item => item.name.includes('Sample'));
                        
                        return (
                          <div className="space-y-6">
                            {/* Sample Data Notice */}
                            {isSampleData && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-center">
                                  <span className="text-yellow-600 mr-2">⚠️</span>
                                  <p className="text-yellow-800 text-sm">
                                    <strong>Sample Data:</strong> No real data found for this department. Displaying sample data for demonstration purposes.
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {/* Main Chart - Larger Size for Better Label Display */}
                            <div className="flex justify-center">
                              <ResponsiveContainer width="100%" height={600}>
                                <PieChart>
                                  <Pie
                                    data={unifiedData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={false}
                                    outerRadius={180}
                                    innerRadius={30}
                                    fill="#8884d8"
                                    dataKey="value"
                                  >
                                    {unifiedData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                  </Pie>
                                  <Tooltip 
                                    formatter={(value, name, props) => [
                                      value, 
                                      `${name} (${props.payload.category})`
                                    ]}
                                    contentStyle={{ 
                                      backgroundColor: 'white', 
                                      border: '1px solid #e5e7eb',
                                      borderRadius: '8px',
                                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                      fontSize: '14px'
                                    }}
                                    labelStyle={{
                                      fontSize: '11px',
                                      fontWeight: 'bold',
                                      fill: '#374151'
                                    }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Enhanced Legend with Categories */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              {/* Paper Status Legend */}
                              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200">
                                <h5 className="font-bold text-blue-800 mb-4 flex items-center text-lg">
                                  <span className="mr-3 text-2xl">📄</span>
                                  Paper Status
                                </h5>
                                <div className="space-y-2">
                                  {unifiedData.filter(item => item.category === 'Paper Status').map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm">
                                      <div className="flex items-center">
                                        <div 
                                          className="w-4 h-4 rounded-full mr-3 shadow-sm" 
                                          style={{ backgroundColor: item.fill }}
                                        ></div>
                                        <span className="font-medium text-gray-700">{item.name}</span>
                                      </div>
                                      <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-sm">
                                        {item.value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Course Outcomes Legend */}
                              <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200">
                                <h5 className="font-bold text-green-800 mb-4 flex items-center text-lg">
                                  <span className="mr-3 text-2xl">🎯</span>
                                  Course Outcomes
                                </h5>
                                <div className="space-y-2">
                                  {unifiedData.filter(item => item.category === 'Course Outcomes').map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm">
                                      <div className="flex items-center">
                                        <div 
                                          className="w-4 h-4 rounded-full mr-3 shadow-sm" 
                                          style={{ backgroundColor: item.fill }}
                                        ></div>
                                        <span className="font-medium text-gray-700">{item.name}</span>
                                      </div>
                                      <span className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full text-sm">
                                        {item.value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Difficulty Levels Legend */}
                              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl border border-purple-200">
                                <h5 className="font-bold text-purple-800 mb-4 flex items-center text-lg">
                                  <span className="mr-3 text-2xl">📈</span>
                                  Difficulty Levels
                                </h5>
                                <div className="space-y-2">
                                  {unifiedData.filter(item => item.category === 'Difficulty Levels').map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm">
                                      <div className="flex items-center">
                                        <div 
                                          className="w-4 h-4 rounded-full mr-3 shadow-sm" 
                                          style={{ backgroundColor: item.fill }}
                                        ></div>
                                        <span className="font-medium text-gray-700">{item.name}</span>
                                      </div>
                                      <span className="font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full text-sm">
                                        {item.value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Summary Information - Better Formatted */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                      <span className="mr-2 text-xl">📈</span>
                      Department Summary
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-blue-800 text-sm mb-1">📤 Papers Sent</h4>
                            <p className="text-2xl font-bold text-blue-600">{analyticsData.papers_sent}</p>
                            <p className="text-blue-600 text-xs">Total assigned</p>
                          </div>
                          <div className="text-3xl text-blue-500 opacity-80">📤</div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-green-800 text-sm mb-1">✅ Papers Submitted</h4>
                            <p className="text-2xl font-bold text-green-600">{analyticsData.papers_submitted}</p>
                            <p className="text-green-600 text-xs">Completed</p>
                          </div>
                          <div className="text-3xl text-green-500 opacity-80">✅</div>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-yellow-800 text-sm mb-1">⏳ Papers Pending</h4>
                            <p className="text-2xl font-bold text-yellow-600">{analyticsData.papers_not_submitted}</p>
                            <p className="text-yellow-600 text-xs">Awaiting submission</p>
                          </div>
                          <div className="text-3xl text-yellow-500 opacity-80">⏳</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information Section */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-gray-600 text-sm mr-2">📅</span>
                        <span className="text-gray-600 text-sm">
                          <span className="font-medium">Last updated:</span> {formatTimestamp(analyticsData.last_updated)}
                        </span>
                      </div>
                      <div className="text-gray-400 text-xs">
                        Department: {selectedDepartment}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default DepartmentStats;
