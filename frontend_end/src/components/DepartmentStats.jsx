import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const DepartmentStats = () => {
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [departments, setDepartments] = useState([]);

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  // Fetch departments on component mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get(`${API_BASE}/departments/active`);
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
      const response = await axios.get(`${API_BASE}/dashboard/department/${deptName}`);
      setAnalyticsData(response.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  // Fetch analytics data when department is selected
  useEffect(() => {
    if (selectedDepartment) {
      fetchAnalyticsData(selectedDepartment);
    }
  }, [selectedDepartment, fetchAnalyticsData]);

  const handleDepartmentClick = (deptName) => {
    setSelectedDepartment(deptName);
  };

  // Transform data for the chart
  const getChartData = () => {
    if (!analyticsData) return [];

    const { papers_sent, papers_submitted, papers_not_submitted, cos, levels } = analyticsData;

    return [
      {
        name: 'Papers Sent',
        value: papers_sent,
        fill: '#8884d8'
      },
      {
        name: 'Papers Submitted',
        value: papers_submitted,
        fill: '#82ca9d'
      },
      {
        name: 'Papers Not Submitted',
        value: papers_not_submitted,
        fill: '#ffc658'
      },
      {
        name: 'CO1',
        value: cos['1'],
        fill: '#ff7300'
      },
      {
        name: 'CO2',
        value: cos['2'],
        fill: '#ff7300'
      },
      {
        name: 'CO3',
        value: cos['3'],
        fill: '#ff7300'
      },
      {
        name: 'CO4',
        value: cos['4'],
        fill: '#ff7300'
      },
      {
        name: 'CO5',
        value: cos['5'],
        fill: '#ff7300'
      },
      {
        name: 'Level 1',
        value: levels['1'],
        fill: '#00ff00'
      },
      {
        name: 'Level 2',
        value: levels['2'],
        fill: '#00ff00'
      },
      {
        name: 'Level 3',
        value: levels['3'],
        fill: '#00ff00'
      },
      {
        name: 'Level 4',
        value: levels['4'],
        fill: '#00ff00'
      },
      {
        name: 'Level 5',
        value: levels['5'],
        fill: '#00ff00'
      }
    ];
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Department-wise Analytics</h2>
      
      {/* Department Buttons */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Select Department:</h3>
        <div className="flex flex-wrap gap-4">
          {departments.map((dept) => (
            <button
              key={dept._id}
              onClick={() => handleDepartmentClick(dept.name)}
              className={`flex flex-col items-center justify-center p-6 rounded-xl font-medium transition-all duration-300 min-w-[140px] h-[110px] border-2 cursor-pointer ${
                selectedDepartment === dept.name
                  ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-600 shadow-xl transform scale-105'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:border-blue-300 hover:shadow-lg hover:scale-105'
              }`}
            >
              <div className="text-2xl mb-2">🏢</div>
              <div className="text-sm font-semibold text-center leading-tight">
                {dept.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chart Section */}
      {selectedDepartment && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Analytics for {selectedDepartment}
          </h3>
          
          {loading && (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {analyticsData && !loading && (
            <div>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [value, name]}
                      labelStyle={{ color: '#374151' }}
                    />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Timestamp */}
              <div className="text-sm text-gray-600 text-center">
                Last updated: {formatTimestamp(analyticsData.last_updated)}
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800">Papers Sent</h4>
                  <p className="text-2xl font-bold text-blue-600">{analyticsData.papers_sent}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-800">Papers Submitted</h4>
                  <p className="text-2xl font-bold text-green-600">{analyticsData.papers_submitted}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-800">Papers Not Submitted</h4>
                  <p className="text-2xl font-bold text-yellow-600">{analyticsData.papers_not_submitted}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!selectedDepartment && (
        <div className="text-center text-gray-500 py-8">
          <p>Please select a department to view analytics</p>
        </div>
      )}
    </div>
  );
};

export default DepartmentStats;
