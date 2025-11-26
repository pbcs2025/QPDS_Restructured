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
    matcher: (username) => {
      const normalized = username.trim().toLowerCase();
      return normalized.startsWith("verifier") || 
             normalized.includes("adminid") ||  // MBA verifier format
             normalized.includes("admin");      // Add this to catch "AdminA12"
    },
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const API_ROLE_MAP = {
  SuperAdmin: {
    key: "super-admin-api",
    label: "Super Admin",
    type: "super-admin",
    destination: "/super-admin-dashboard",
  },
  Verifier: {
    key: "verifier-api",
    label: "Verifier",
    type: "verifier",
    destination: "/verifier-dashboard",
  },
  MBAVerifier: {
    key: "mba-verifier-api",
    label: "MBA Verifier",
    type: "verifier",
    destination: "/verifier-dashboard",
  },
  Faculty: {
    key: "faculty-api",
    label: "Faculty",
    type: "faculty",
    destination: "/faculty-dashboard",
  },
  MBAFaculty: {
    key: "mba-faculty-api",
    label: "MBA Faculty",
    type: "faculty",
    destination: "/faculty-dashboard",
  },
};

const mapRoleFromServer = (role) => {
  if (!role) return null;
  const template = API_ROLE_MAP[role];
  return template ? { ...template } : null;
};

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

  const isEmail = (value) => EMAIL_REGEX.test(value.trim().toLowerCase());

  const fetchResolvedRole = async (identifier) => {
    if (!identifier) return null;
    try {
      const response = await fetch(`${API_BASE}/resolve-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await response.json();
      if (response.ok && data.success && data.role) {
        return data;
      }
      return null;
    } catch (error) {
      console.error("Role resolution failed:", error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginMessage("");
    const errors = validateLogin(formValues);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const trimmedUsername = formValues.username.trim();
    let role = resolveRole(normalizedUsername);
    let resolvedUser = await fetchResolvedRole(trimmedUsername);
    if (resolvedUser?.role) {
      const mappedRole = mapRoleFromServer(resolvedUser.role);
      if (mappedRole) {
        role = mappedRole;
      }
    }
    const emailLike = isEmail(trimmedUsername);

    setIsSubmitting(true);

    let handled = false;

    try {
      if (role) {
        if (role.type === "static") {
          handled = handleStaticRole(role);
        } else if (role.type === "super-admin") {
          handled = await handleSuperAdminLogin(role);
        } else if (role.type === "verifier") {
          handled = await handleVerifierLogin(role, {
            usernameOverride: resolvedUser?.username,
          });
        } else if (role.type === "faculty") {
          if (resolvedUser?.role === "MBAFaculty") {
            setIsMBAFaculty(true);
          }
          handled = await handleFacultyLogin();
        }
      } else if (emailLike) {
        handled = await handleFacultyLogin();
      } else {
        handled = await handleVerifierLogin(null, { silentOnFail: true });
      }
    } finally {
      setIsSubmitting(false);
    }

    if (!handled) {
      setLoginMessage((prev) =>
        prev ||
        "❌ We couldn't determine your role from the username. Please verify your credentials and try again."
      );
    }
  };

  const handleStaticRole = (role) => {
    if (formValues.password === role.password) {
      navigate(role.destination);
      return true;
    }
    setLoginMessage(`❌ Incorrect password for ${role.label}.`);
    return false;
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
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        if (data.user) {
          localStorage.setItem("superAdmin", JSON.stringify(data.user));
        }
        navigate(role.destination);
        return true;
      } else {
        setLoginMessage(`❌ ${data.message || "Invalid Super Admin credentials."}`);
      }
    } catch (error) {
      console.error("Super Admin login failed:", error);
      setLoginMessage("❌ Unable to reach authentication service. Please try again.");
    }
    return false;
  };

  const handleVerifierLogin = async (role, options = {}) => {
    const destination = role?.destination || "/verifier-dashboard";
    const usernameToUse = (options.usernameOverride || formValues.username || "").trim();
    if (!usernameToUse) {
      if (!options.silentOnFail) {
        setLoginMessage("❌ Username is required for verifier login.");
      }
      return false;
    }

    const credentials = {
      username: usernameToUse,
      password: formValues.password,
    };

    const persistSession = (payload) => {
      if (payload?.token) {
        localStorage.setItem("token", payload.token);
      }
      const verifierPayload = payload?.verifierData || payload?.verifier;
      if (verifierPayload) {
        localStorage.setItem("verifier", JSON.stringify(verifierPayload));
      }
    };

    const attemptLogin = async (endpoint) => {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          return { success: true, data };
        }
        return { success: false, message: data.message || data.error };
      } catch (error) {
        console.error(`Verifier login error (${endpoint}):`, error);
        return { success: false, message: error.message };
      }
    };

    const regularResult = await attemptLogin(`${API_BASE}/verifier/login`);
    if (regularResult.success) {
      persistSession(regularResult.data);
      navigate(destination);
      return true;
    }

    const mbaResult = await attemptLogin(`${API_BASE}/mbaverifier/login`);
    if (mbaResult.success) {
      persistSession(mbaResult.data);
      navigate(destination);
      return true;
    }

    if (!options.silentOnFail) {
      setLoginMessage(
        `❌ ${
          mbaResult.message ||
          regularResult.message ||
          "Invalid verifier credentials. Please try again."
        }`
      );
    }
    return false;
  };

  const handleFacultyLogin = async () => {
    const attempt = async (endpoint, mba = false) => {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues),
        });
        const data = await response.json();
        if (response.ok && data.success) {
          setIsMBAFaculty(mba);
          setLoginMessage("✔ Verification code sent to your email.");
          setAuthStep("faculty-verification");
          return { success: true };
        }
        return { success: false, message: data.message };
      } catch (error) {
        console.error(`Faculty login error (${endpoint}):`, error);
        return { success: false, message: error.message };
      }
    };

    const mbaAttempt = await attempt(`${API_BASE}/mbafaculty/login`, true);
    if (mbaAttempt.success) {
      return true;
    }

    const regularAttempt = await attempt(`${API_BASE}/faculty/login`, false);
    if (regularAttempt.success) {
      return true;
    }

    setLoginMessage(
      `❌ ${
        regularAttempt.message ||
        mbaAttempt.message ||
        "Invalid faculty credentials."
      }`
    );
    return false;
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

  const persistFacultySession = (facultyData = {}) => {
    const resolvedEmail = facultyData.email || formValues.username;
    const role = isMBAFaculty ? "MBAFaculty" : "Faculty";
    localStorage.setItem("faculty_username", resolvedEmail);
    localStorage.setItem("faculty_role", role);
    localStorage.setItem(
      "faculty_data",
      JSON.stringify({
        name: facultyData.name || resolvedEmail,
        department: facultyData.department || "Department not set",
        clgName: facultyData.clgName || "College not set",
        email: resolvedEmail,
        role,
        type: facultyData.type || (isMBAFaculty ? "mba" : "regular"),
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
