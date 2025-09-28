import React from "react";
import "../../common/dashboard.css";

function PaperSetterDashboard() {
  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>Paper Setter</h2>
        <a href="#">Dashboard</a>
        <a href="#">Create Paper</a>
        <a href="#">Upload Questions</a>
        <a href="#">Logout</a>
      </div>
      <div className="dashboard-content">
        <h1>Welcome to Paper Setter Dashboard</h1>
        <p>This is the Paper Setter's control panel.</p>
      </div>
    </div>
  );
}

export default PaperSetterDashboard;
