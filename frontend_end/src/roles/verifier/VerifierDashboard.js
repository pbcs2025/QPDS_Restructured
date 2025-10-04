import React, { useState } from 'react';
import '../../common/dashboard.css';
import QuestionPapers from './QuestionPapers';

function VerifierDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleLogoutClick = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      window.location.href = '/';
    }
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>Verifier</h2>
        <a 
          href="#" 
          className={activeTab === 'dashboard' ? 'active-tab' : ''}
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('dashboard');
          }}
        >
          Dashboard
        </a>
        <a 
          href="#" 
          className={activeTab === 'papers' ? 'active-tab' : ''}
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('papers');
          }}
        >
          📄 Question Papers
        </a>
        <a 
          href="#" 
          onClick={handleLogoutClick} 
          style={{ color: "red" }}
        >
          Logout
        </a>
      </div>

      <div className="dashboard-content">
        {activeTab === 'dashboard' && (
          <div>
            <h1>Welcome to Verifier Dashboard</h1>
            <p>This is the Verifier's control panel.</p>
            <div className="dashboard-stats">
              <div className="card">
                <h3>Pending Papers</h3>
                <p>0</p>
              </div>
              <div className="card">
                <h3>Reviewed Papers</h3>
                <p>0</p>
              </div>
              <div className="card">
                <h3>Total Papers</h3>
                <p>0</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'papers' && (
          <QuestionPapers />
        )}
      </div>
    </div>
  );
}

export default VerifierDashboard;
