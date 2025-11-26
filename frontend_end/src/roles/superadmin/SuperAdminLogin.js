import { useState } from "react";
import {useNavigate } from "react-router-dom";
import validateLogin from "../../common/validateLogin";
import "../../common/Main.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function SuperAdminLogin() {
  const navigate = useNavigate();
  const initialValues = { username: "", password: "" };
  const [formValues, setFormValues] = useState(initialValues);
  const [formErrors, setFormErrors] = useState({});
  const [loginMessage, setLoginMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginMessage("");
    const errors = validateLogin(formValues);
    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      setIsSubmitting(true);
      try {
        const response = await fetch(`${API_BASE}/superadmin/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues),
        });
        const data = await response.json();
        
        if (response.ok && data.success) {
          // Store token and user data
          if (data.token) {
            localStorage.setItem("token", data.token);
          }
          if (data.user) {
            localStorage.setItem("superAdmin", JSON.stringify(data.user));
          }
          navigate("/super-admin-dashboard");
        } else {
          setLoginMessage(`❌ ${data.message || "Invalid Super Admin credentials."}`);
        }
      } catch (error) {
        console.error("Super Admin login failed:", error);
        setLoginMessage("❌ Unable to reach authentication service. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit}>
        <h1>Super Admin Login</h1>
        <div className="ui form">
          <div className="field">
            <label>Username</label>
            <input type="text" name="username" value={formValues.username} onChange={handleChange} />
            <p>{formErrors.username}</p>
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" name="password" value={formValues.password} onChange={handleChange} />
            <p>{formErrors.password}</p>
          </div>
          <button className="fluid ui button blue" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Login"}
          </button>
        </div>
      </form>
      {loginMessage && <div className="ui message error">{loginMessage}</div>}
    </div>
  );
}

export default SuperAdminLogin;
