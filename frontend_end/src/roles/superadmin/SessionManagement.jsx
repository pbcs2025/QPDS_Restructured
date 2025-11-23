// frontend/src/components/superadmin/SessionManagement.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import '../../common/dashboard.css';

function SessionManagement() {
  const [facultyActivities, setFacultyActivities] = useState([]);
  const [verifierActivities, setVerifierActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(24); // Default 24 hours
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  // Fetch activities from API
  const fetchActivities = useCallback(async (hours = 24) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE}/sessions/activities/grouped?hours=${hours}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setFacultyActivities(data.data.faculty || []);
        setVerifierActivities(data.data.verifier || []);
        setLastUpdate(new Date());
      } else {
        throw new Error(data.message || 'Failed to fetch activities');
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err.message || 'Failed to load activities');
      // Set empty arrays on error
      setFacultyActivities([]);
      setVerifierActivities([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  // Initial fetch
  useEffect(() => {
    fetchActivities(timeRange);
  }, [timeRange, fetchActivities]);

  // Setup Socket.io for real-time updates
  useEffect(() => {
    // Socket URL should be base URL without /api
    const baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';
    const socketURL = baseURL.replace('/api', '');
    const socket = io(socketURL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('Socket connected for session management');
    });

    // Listen for activity updates
    socket.on('activity_logged', (activity) => {
      console.log('New activity received:', activity);
      
      // Add to appropriate list based on role
      if (activity.role === 'Faculty') {
        setFacultyActivities(prev => [activity, ...prev].slice(0, 25));
      } else if (activity.role === 'Verifier') {
        setVerifierActivities(prev => [activity, ...prev].slice(0, 25));
      }
      
      setLastUpdate(new Date());
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get activity icon
  const getActivityIcon = (type) => {
    const icons = {
      'login': '🔓',
      'logout': '🔒',
      'paper_created': '📝',
      'paper_updated': '✏️',
      'paper_approved': '✅',
      'paper_rejected': '❌',
      'paper_corrected': '🔧',
      'profile_updated': '👤',
      'password_changed': '🔑',
      'user_created': '👥',
      'user_deleted': '🗑️'
    };
    return icons[type] || '📌';
  };

  // Render activity table
  const renderActivityTable = (activities, title, emptyMessage) => (
    <div className="section" style={{ marginBottom: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <span style={{ 
          fontSize: '12px', 
          color: '#6c757d',
          background: '#f8f9fa',
          padding: '4px 12px',
          borderRadius: '12px',
          fontWeight: 600
        }}>
          {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
        </span>
      </div>
      
      {activities.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px',
          background: '#f8f9fa',
          borderRadius: '8px',
          color: '#6c757d'
        }}>
          {emptyMessage}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="user-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '25%' }}>Name</th>
                <th style={{ width: '45%' }}>Activity</th>
                <th style={{ width: '30%' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity, index) => (
                <tr key={activity._id || index}>
                  <td style={{ fontWeight: 600 }}>
                    {activity.name}
                    {activity.usertype === 'external' && (
                      <span style={{
                        marginLeft: '6px',
                        fontSize: '10px',
                        background: '#e3f2fd',
                        color: '#1976d2',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        fontWeight: 700
                      }}>
                        EXT
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ marginRight: '8px' }}>
                      {getActivityIcon(activity.activityType)}
                    </span>
                    {activity.description}
                  </td>
                  <td style={{ color: '#ffffff', fontSize: '14px' }}>
                    {formatTime(activity.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div>
          <h1 style={{ margin: '0 0 5px 0' }}>Recent Activity</h1>
          <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontWeight: 600, color: '#495057' }}>Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              background: 'white'
            }}
          >
            <option value={1}>Last 1 hour</option>
            <option value={6}>Last 6 hours</option>
            <option value={12}>Last 12 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={48}>Last 48 hours</option>
            <option value={168}>Last 7 days</option>
          </select>
          
          <button
            onClick={() => fetchActivities(timeRange)}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: '#0d6efd',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          padding: '12px 20px',
          background: '#f8d7da',
          color: '#721c24',
          borderRadius: '6px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && !error && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          color: '#6c757d' 
        }}>
          Loading activities...
        </div>
      )}

      {!loading && !error && (
        <>
          {renderActivityTable(
            facultyActivities,
            '👩‍🏫 Faculty Activity',
            'No faculty activity in the selected time range'
          )}
          
          {renderActivityTable(
            verifierActivities,
            '✅ Verifier Activity',
            'No verifier activity in the selected time range'
          )}
        </>
      )}
    </div>
  );
}

export default SessionManagement;