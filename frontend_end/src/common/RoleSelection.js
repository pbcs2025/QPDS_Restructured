import React from "react";
import "./Main.css";
import { useNavigate } from "react-router-dom";

function RoleSelection() {
  const navigate = useNavigate();

  const handleRoleClick = (role) => {
    navigate(`/login/${role}`);
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Times New Roman"
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 8px 20px rgba(0, 0, 0, 0.15)",
          textAlign: "center",
          width: "400px",
        }}
      >
        <h2 style={{ marginBottom: "30px", fontSize: "24px" }}>Select Your Role</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <button
            onClick={() => handleRoleClick("super-admin")}
            style={buttonStyle}
          >
            Super Admin
          </button>
          <button
            onClick={() => handleRoleClick("admin")}
            style={buttonStyle}
          >
            Admin
          </button>
          <button
            onClick={() => handleRoleClick("faculty")}
            style={buttonStyle}
          >
            Faculty
          </button>
          <button
            onClick={() => handleRoleClick("paper-setter")}
            style={buttonStyle}
          >
            Paper Setter
          </button>
          <button
            onClick={() => handleRoleClick("verifier")}
            style={buttonStyle}
          >
            Verifier
          </button>
        </div>
      </div>
    </div>
  );
}

// Common button styling
const buttonStyle = {
  padding: "12px 20px",
  fontSize: "16px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#1e90ff",
  color: "white",
  cursor: "pointer",
  transition: "0.3s",
};

export default RoleSelection;
