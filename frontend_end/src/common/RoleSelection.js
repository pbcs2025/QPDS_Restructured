import React, { useMemo, useState } from "react";
import "./Main.css";
import { Link, useNavigate } from "react-router-dom";
import validateLogin from "./validateLogin";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const ROLE_RULES = [
  {
    key: "super-admin",
    label: "Super Admin",
    matcher: (username) => ["superadmin", "super-admin"].includes(username),
    type: "static",
    password: "12345",
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

  const normalizedUsername = formValues.username.trim().toLowerCase();

  const resolveRole = (username) => ROLE_RULES.find((role) => role.matcher(username));

  const activeRoleLabel = useMemo(() => {
    if (!normalizedUsername) return "";
    const role = resolveRole(normalizedUsername);
    return role?.label || "";
  }, [normalizedUsername]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
    if (name === "username") {
      setAuthStep("credentials");
      setVerificationCode(Array(6).fill(""));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginMessage("");
    const errors = validateLogin(formValues);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const role = resolveRole(normalizedUsername);
    if (!role) {
      setLoginMessage("We couldn't determine your role from the username. Please retry.");
      return;
    }

    setIsSubmitting(true);
    if (role.type === "static") {
      handleStaticRole(role);
    } else if (role.type === "verifier") {
      await handleVerifierLogin(role);
    } else if (role.type === "faculty") {
      await handleFacultyLogin();
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

  const handleVerifierLogin = async (role) => {
    try {
      const response = await fetch(`${API_BASE}/verifier/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem("verifier", JSON.stringify(data.verifier));
        navigate(role.destination);
      } else {
        setLoginMessage(`❌ ${data.message || "Invalid verifier credentials."}`);
      }
    } catch (error) {
      console.error("Verifier login failed:", error);
      setLoginMessage("❌ Unable to reach verifier service. Please try again.");
    }
  };

  const handleFacultyLogin = async () => {
    try {
      const response = await fetch(`${API_BASE}/faculty/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });
      const data = await response.json();
      if (response.ok && data.success) {
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
    try {
      const response = await fetch(`${API_BASE}/faculty/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formValues.username, code }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        persistFacultySession(data.facultyData || { email: formValues.username });
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
  };

  return (
    <div className="role-selection-page">
      <div className="role-selection-hero">
        <div className="hero-content">
          <p className="hero-eyebrow">Global Academy of Technology</p>
          <h1>Official Digital Question Paper Management System</h1>
          <p className="hero-description">
            “Welcome to GAT’s authorized portal for examination paper creation and delivery.
            This platform ensures secure, confidential, and streamlined handling of all question paper submissions
            by faculty and approved external examiners. Please log in to access your dashboard.”
          </p>
          <div className="quick-role-badges">
            {ROLE_RULES.map((role) => (
              <span
                key={role.key}
                className={`role-badge ${activeRoleLabel === role.label ? "active-role" : ""}`}
              >
                {role.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="role-selection-card">
        <div className="card-header">
          <p className="card-eyebrow">Welcome back</p>
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
                placeholder="e.g. superadmin or user@college.edu"
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
