import React, { useState } from "react";
import "./Main.css";
import { Link, useNavigate } from "react-router-dom";
import validateLogin from "./validateLogin";

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

const ROLE_RULES = [
  {
    key: "super-admin",
    label: "Super Admin",
    matcher: (username) => {
      const normalized = username.trim().toLowerCase();
      return ["superadmin", "super-admin", "superadmin"].includes(normalized) || 
             username.trim() === "SuperAdmin";
    },
    type: "super-admin",
    destination: "/super-admin-dashboard",
  },
  {
    key: "admin",
    label: "Admin",
    matcher: (username) => username === "admin",
    type: "static",
    password: "admin123",
    destination: "/admin-dashboard",
  },
  {
    key: "verifier",
    label: "Verifier",
    matcher: (username) => username.startsWith("verifier"),
    type: "verifier",
    destination: "/verifier-dashboard",
  },
  {
    key: "faculty",
    label: "Faculty",
    matcher: (username) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username),
    type: "faculty",
    destination: "/faculty-dashboard",
  },
];

function RoleSelection() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({ username: "", password: "" });
  const [formErrors, setFormErrors] = useState({});
  const [loginMessage, setLoginMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authStep, setAuthStep] = useState("credentials"); // credentials | faculty-verification
  const [verificationCode, setVerificationCode] = useState(Array(6).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMBAFaculty, setIsMBAFaculty] = useState(false); // Track if using MBA faculty login

  const normalizedUsername = formValues.username.trim().toLowerCase();

  const resolveRole = (username) => ROLE_RULES.find((role) => role.matcher(username));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    if (name === "username") {
      setAuthStep("credentials");
      setVerificationCode(Array(6).fill(""));
      setIsMBAFaculty(false); // Reset MBA faculty flag
    }
  };

  // Helper function to try verifier login for email addresses
  const tryVerifierLoginForEmail = async () => {
    // Try regular verifier login first
    let regularVerifierFailed = false;
    try {
      const response = await fetch(`${API_BASE}/verifier/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem("verifier", JSON.stringify(data.verifierData));
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        navigate("/verifier-dashboard");
        return true;
      } else {
        regularVerifierFailed = true;
        console.log("Regular verifier login failed:", data.message || data.error);
      }
    } catch (error) {
      console.error("Regular verifier login error:", error);
      regularVerifierFailed = true;
    }

    // If regular verifier fails, try MBA verifier
    if (regularVerifierFailed) {
      try {
        const response = await fetch(`${API_BASE}/mbaverifier/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          localStorage.setItem("verifier", JSON.stringify(data.verifierData));
          if (data.token) {
            localStorage.setItem("token", data.token);
          }
          navigate("/verifier-dashboard");
          return true;
        } else {
          console.log("MBA Verifier login failed:", data.message || data.error);
        }
      } catch (error) {
        console.error("MBA Verifier login error:", error);
      }
    }
    
    return false; // Verifier login failed
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginMessage("");
    const errors = validateLogin(formValues);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const role = resolveRole(normalizedUsername);
    
    setIsSubmitting(true);
    
    // If username is an email, try verifier login first (since verifiers can have email usernames)
    // Then fall back to faculty login if verifier fails
    if (role?.type === "faculty" || (!role && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedUsername))) {
      // Try verifier login first for email addresses
      const verifierSuccess = await tryVerifierLoginForEmail();
      if (!verifierSuccess) {
        // If verifier login failed, try faculty login
        if (role?.type === "faculty") {
          await handleFacultyLogin();
        } else {
          setLoginMessage("❌ We couldn't determine your role from the username. Please check your credentials and try again.");
        }
      }
    } else if (role) {
      if (role.type === "static") {
        handleStaticRole(role);
      } else if (role.type === "super-admin") {
        await handleSuperAdminLogin(role);
      } else if (role.type === "verifier") {
        await handleVerifierLogin(role);
      }
    } else {
      setLoginMessage("We couldn't determine your role from the username. Please retry.");
    }
    
    setIsSubmitting(false);
  };

  const handleStaticRole = (role) => {
    if (formValues.password === role.password) {
      navigate(role.destination);
    } else {
      setLoginMessage(`❌ Incorrect password for ${role.label}.`);
    }
  };

  const handleSuperAdminLogin = async (role) => {
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
        navigate(role.destination);
      } else {
        setLoginMessage(`❌ ${data.message || "Invalid Super Admin credentials."}`);
      }
    } catch (error) {
      console.error("Super Admin login failed:", error);
      setLoginMessage("❌ Unable to reach authentication service. Please try again.");
    }
  };

  const handleVerifierLogin = async (role) => {
    // Try regular verifier login first
    let regularVerifierFailed = false;
    try {
      const response = await fetch(`${API_BASE}/verifier/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        // Both regular and MBA verifier return verifierData
        localStorage.setItem("verifier", JSON.stringify(data.verifierData));
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        navigate(role.destination);
        return;
      } else {
        regularVerifierFailed = true;
        console.log("Regular verifier login failed:", data.message || data.error);
      }
    } catch (error) {
      console.error("Regular verifier login error:", error);
      regularVerifierFailed = true;
    }

    // If regular verifier fails, try MBA verifier
    if (regularVerifierFailed) {
      try {
        const response = await fetch(`${API_BASE}/mbaverifier/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          // MBA verifier returns verifierData
          localStorage.setItem("verifier", JSON.stringify(data.verifierData));
          if (data.token) {
            localStorage.setItem("token", data.token);
          }
          navigate(role.destination);
        } else {
          setLoginMessage(`❌ ${data.message || data.error || "Invalid verifier credentials."}`);
        }
      } catch (error) {
        console.error("MBA Verifier login error:", error);
        setLoginMessage("❌ Unable to reach verifier service. Please try again.");
      }
    }
  };

  const handleFacultyLogin = async () => {
    // Try MBA faculty login first
    try {
      const response = await fetch(`${API_BASE}/mbafaculty/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setIsMBAFaculty(true);
        setLoginMessage("✔ Verification code sent to your email.");
        setAuthStep("faculty-verification");
        return;
      }
    } catch (error) {
      console.error("MBA Faculty login failed:", error);
    }

    // If MBA faculty login fails, try regular faculty login
    try {
      const response = await fetch(`${API_BASE}/faculty/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setIsMBAFaculty(false);
        setLoginMessage("✔ Verification code sent to your email.");
        setAuthStep("faculty-verification");
      } else {
        setLoginMessage(`❌ ${data.message || "Invalid faculty credentials."}`);
      }
    } catch (error) {
      console.error("Faculty login failed:", error);
      setLoginMessage("❌ Unable to reach faculty service. Please try again.");
    }
  };

  const handleFacultyVerification = async (e) => {
    e.preventDefault();
    const code = verificationCode.join("");
    if (code.length !== 6) {
      setLoginMessage("❌ Please enter the 6-digit verification code.");
      return;
    }
    setIsVerifying(true);
    
    // Use appropriate endpoint based on whether it's MBA faculty or regular faculty
    const endpoint = isMBAFaculty ? `${API_BASE}/mbafaculty/verify` : `${API_BASE}/faculty/verify`;
    
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formValues.username, code }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        // Store token if provided
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        // Store faculty data
        const facultyData = data.facultyData || { email: formValues.username };
        persistFacultySession(facultyData);
        navigate("/faculty-dashboard");
      } else {
        setLoginMessage(`❌ ${data.message || "Invalid verification code."}`);
      }
    } catch (error) {
      console.error("Faculty verification failed:", error);
      setLoginMessage("❌ Unable to verify code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const persistFacultySession = (facultyData) => {
    localStorage.setItem("faculty_username", facultyData.email || formValues.username);
    localStorage.setItem(
      "faculty_data",
      JSON.stringify({
        name: facultyData.name || facultyData.email || formValues.username,
        department: facultyData.department || "Department not set",
        clgName: facultyData.clgName || "College not set",
        email: facultyData.email || formValues.username,
      })
    );
  };

  const handleVerificationInput = (index, value) => {
    if (value.length > 1 || isNaN(Number(value)) || value === " ") return;
    setVerificationCode((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
    if (value && index < 5) {
      const nextInput = document.getElementById(`faculty-code-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const handleVerificationBackspace = (index, e) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`faculty-code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const resetFormState = () => {
    setAuthStep("credentials");
    setVerificationCode(Array(6).fill(""));
    setLoginMessage("");
    setIsMBAFaculty(false);
  };

  return (
    <div className="role-selection-page">
      <div className="role-selection-hero" style={{ backgroundColor: 'rgba(179, 13, 112, 0.3)' }}>
        <div className="hero-content">
          <p className="hero-eyebrow">Global Academy of Technology</p>
          <h1>Digital Question Paper Management System</h1>
          <p className="hero-description">
            "Welcome to GAT's authorized portal for examination paper creation and delivery.
            This platform ensures secure, confidential, and streamlined handling of all question paper submissions
            by faculty and approved external examiners. Please log in to access your dashboard."
          </p>
        </div>
      </div>

      <div className="role-selection-card">
        <div className="card-header">
          {/* <p className="card-eyebrow">Welcome back</p> */}
          <h2>{authStep === "credentials" ? "Sign in to continue" : "Verify your faculty login"}</h2>
          <p className="card-subtitle">
            {authStep === "credentials"
              ? " "
              : `Enter the 6-digit code sent to ${formValues.username || "your email"}.`}
          </p>
        </div>

        {authStep === "credentials" ? (
          <form className="role-login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={formValues.username}
                onChange={handleChange}
                placeholder="Enter your username"
                autoComplete="username"
              />
              {formErrors.username && <p className="form-error">{formErrors.username}</p>}
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={formValues.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              {formErrors.password && <p className="form-error">{formErrors.password}</p>}
            </div>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
          </form>
        ) : (
          <form className="role-login-form" onSubmit={handleFacultyVerification}>
            <div className="verification-info">
              <p>We&apos;ve sent a 6-digit code to your registered email.</p>
              <div className="code-inputs">
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    id={`faculty-code-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleVerificationInput(index, e.target.value)}
                    onKeyDown={(e) => handleVerificationBackspace(index, e)}
                  />
                ))}
              </div>
            </div>
            <div className="verification-actions">
              <button type="button" className="ghost-btn" onClick={resetFormState}>
                Back
          </button>
              <button type="submit" disabled={isVerifying}>
                {isVerifying ? "Verifying..." : "Verify & Continue"}
          </button>
            </div>
          </form>
        )}

        {loginMessage && <div className="role-login-message">{loginMessage}</div>}

        <div className="role-selection-footer">
          <p>
            New faculty member? <Link to="/register">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RoleSelection;
