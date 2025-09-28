// ===== FRONTEND: ResetPassword.js =====
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const { username } = location.state || {};

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, oldPassword, newPassword }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage("✅ Password updated. Redirecting...");
        setOldPassword("");
        setNewPassword("");
        //setTimeout(() => navigate("/faculty-dashboard"), 2000);
      } else {
        setMessage("❌ " + data.error);
      }
    } catch (error) {
      setMessage("❌ Server error");
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input type="password" placeholder="Old Password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
        <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        <button>Change Password</button>
        {message && <p>{message}</p>}
      </form>
    </div>
  );
}

export default ResetPassword;
