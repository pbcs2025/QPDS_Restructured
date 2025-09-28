import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import validateLogin from "../../common/validateLogin";
import "../../common/Main.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function FacultyLogin() {
  const navigate = useNavigate();
  const initialValues = { username: "", password: "" };
  const [formValues, setFormValues] = useState(initialValues);
  const [formErrors, setFormErrors] = useState({});
  const [loginMessage, setLoginMessage] = useState("");
  const [step, setStep] = useState(1); // 1 = login, 2 = verify login, 3 = forgot email, 4 = reset password
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetPassword, setResetPassword] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  // ✅ Step 1: Login
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateLogin(formValues);
    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      try {
        const response = await fetch(`${API_BASE}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setLoginMessage("✔ Verification code sent to your email.");
          setStep(2); // move to code verification step
        } else {
          setLoginMessage("❌ " + (data.message || "Invalid credentials."));
        }
      } catch (error) {
        console.error("Login failed:", error);
        setLoginMessage("❌ Server error. Please try again later.");
      }
    }
  };

  // ✅ Step 2: Verify login code
  const handleVerify = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formValues.username, code }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("faculty_username", formValues.username);
        navigate("/faculty-dashboard");
      } else {
        setLoginMessage("❌ " + (data.message || "Invalid verification code."));
      }
    } catch (error) {
      console.error("Verification failed:", error);
      setLoginMessage("❌ Server error. Please try again later.");
    }
  };

  // ✅ Step 3: Forgot password - request code
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formValues.username }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setLoginMessage("✔ Password sent to your email.");
       // setStep(4);
       setStep(1);
      } else {
        setLoginMessage("❌ " + (data.message || "Email not found."));
      }
    } catch (error) {
      console.error("Forgot password failed:", error);
      setLoginMessage("❌ Server error. Please try again later.");
    }
  };

  // ✅ Step 4: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formValues.username,
          code,
          newPassword: resetPassword,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setLoginMessage("✔ Password reset successful. Please login again.");
        setStep(1); // go back to login
      } else {
        setLoginMessage("❌ " + (data.message || "Invalid code or error."));
      }
    } catch (error) {
      console.error("Reset failed:", error);
      setLoginMessage("❌ Server error. Please try again later.");
    }
  };

  return (
    <div className="container">
      {/* Step 1: Login */}
      {step === 1 && (
        <form onSubmit={handleSubmit}>
          <h1>Faculty Login</h1>
          <div className="ui form">
            <div className="field">
              <label>Username (Email)</label>
              <input
                type="text"
                name="username"
                value={formValues.username}
                onChange={handleChange}
              />
              <p>{formErrors.username}</p>
            </div>
            <div className="field" style={{ position: "relative" }}>
              <label>Password</label>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formValues.password}
                onChange={handleChange}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "35px",
                  cursor: "pointer",
                  fontSize: "18px",
                  color: "#555",
                }}
              >
                <i className={showPassword ? "fa fa-eye-slash" : "fa fa-eye"}></i>
              </span>
              <p>{formErrors.password}</p>
            </div>
            <button className="fluid ui button blue">Login</button>
          </div>
          <p
            style={{ cursor: "pointer", color: "blue" }}
            onClick={() => setStep(3)}
          >
            Forgot Password?
          </p>
        </form>
      )}

      {/* Step 2: Verify login */}
      {step === 2 && (
        <form onSubmit={handleVerify}>
          <h1>Email Verification</h1>
          <div className="ui form">
            <div className="field">
              <label>Enter Verification Code</label>
              <input
                type="text"
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <button className="fluid ui button green">Verify</button>
          </div>
        </form>
      )}

      {/* Step 3: Forgot password (request email) */}
      {step === 3 && (
        <form onSubmit={handleForgotPassword}>
          <h1>Forgot Password</h1>
          <div className="ui form">
            <div className="field">
              <label>Enter Registered Email</label>
              <input
                type="text"
                name="username"
                value={formValues.username}
                onChange={handleChange}
              />
            </div>
            <button className="fluid ui button orange">Send Password</button>
          </div>
        </form>
      )}

      {/* Step 4: Reset password */}
      {step === 4 && (
        <form onSubmit={handleResetPassword}>
          <h1>Reset Password</h1>
          <div className="ui form">
            <div className="field">
              <label>Verification Code</label>
              <input
                type="text"
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="field">
              <label>New Password</label>
              <input
                type="password"
                name="newPassword"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
              />
            </div>
            <button className="fluid ui button green">Reset Password</button>
          </div>
        </form>
      )}

      {loginMessage && <div className="ui message error">{loginMessage}</div>}

      {step === 1 && (
        <div className="text">
          <p>
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
        </div>
      )}
    </div>
  );
}

export default FacultyLogin;
