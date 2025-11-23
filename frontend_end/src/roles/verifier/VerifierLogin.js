import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../common/Main.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function VerifierLogin() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
    // Clear error message when user starts typing
    if (message) setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    console.log("Attempting login with:", formValues);
    try {
      const res = await fetch(`${API_BASE}/verifier/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });
      console.log("Login response status:", res.status);
      const data = await res.json();
      console.log("Login response data:", data);
      if (res.ok && data.success) {
        localStorage.setItem("verifier", JSON.stringify(data.verifier));
        navigate("/verifier-dashboard");
      } else {
        setMessage(data.message || "Invalid credentials");
      }
    } catch (err) {
      console.error("Verifier login error", err);
      setMessage("Server error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
        animation: 'float 8s ease-in-out infinite'
      }}></div>

      <div style={{
        position: 'absolute',
        top: '20%',
        right: '10%',
        width: '100px',
        height: '100px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '50%',
        animation: 'float-reverse 6s ease-in-out infinite'
      }}></div>

      <div style={{
        position: 'absolute',
        bottom: '20%',
        left: '15%',
        width: '80px',
        height: '80px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '50%',
        animation: 'float 10s ease-in-out infinite'
      }}></div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          padding: '3rem',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          width: '100%',
          maxWidth: '450px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          position: 'relative',
          zIndex: 1,
          animation: 'slideUp 0.6s ease-out'
        }}
      >
        {/* Header with icon */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            fontSize: '4rem',
            marginBottom: '1rem',
            color: '#667eea',
            filter: 'drop-shadow(0 4px 8px rgba(102, 126, 234, 0.3))'
          }}>
            🔍
          </div>
          <h1 style={{
            margin: '0',
            color: '#2d3748',
            fontSize: '2.2rem',
            fontWeight: '700',
            letterSpacing: '0.5px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            Verifier Login
          </h1>
          <p style={{
            margin: '0.5rem 0 0 0',
            color: '#718096',
            fontSize: '0.95rem',
            fontWeight: '400'
          }}>
            Access your verification dashboard
          </p>
        </div>

        <div className="ui form" style={{ marginTop: '2rem' }}>
          <div className="field" style={{ marginBottom: '1.5rem' }}>
            <label style={{
              fontWeight: '600',
              color: '#4a5568',
              marginBottom: '0.5rem',
              display: 'block',
              fontSize: '0.95rem',
              textAlign: 'left'
            }}>
              <span style={{
                color: '#667eea',
                marginRight: '0.5rem',
                fontSize: '1.1rem'
              }}>👤</span>
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formValues.username}
              onChange={handleChange}
              placeholder="Enter your username"
              style={{
                width: '100%',
                padding: '1rem',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                background: '#f8fafc',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                e.target.style.background = 'white';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
                e.target.style.background = '#f8fafc';
              }}
            />
          </div>

          <div className="field" style={{
            marginBottom: '2rem',
            position: "relative"
          }}>
            <label style={{
              fontWeight: '600',
              color: '#4a5568',
              marginBottom: '0.5rem',
              display: 'block',
              fontSize: '0.95rem',
              textAlign: 'left'
            }}>
              <span style={{
                color: '#667eea',
                marginRight: '0.5rem',
                fontSize: '1.1rem'
              }}>🔒</span>
              Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formValues.password}
              onChange={handleChange}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '1rem',
                paddingRight: '3rem',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                background: '#f8fafc',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                e.target.style.background = 'white';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
                e.target.style.background = '#f8fafc';
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "42px",
                cursor: "pointer",
                fontSize: "18px",
                color: "#718096",
                background: 'none',
                border: 'none',
                padding: '4px',
                borderRadius: '4px',
                transition: 'color 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => e.target.style.color = '#667eea'}
              onMouseLeave={(e) => e.target.style.color = '#718096'}
            >
              <i className={showPassword ? "fa fa-eye-slash" : "fa fa-eye"}></i>
            </button>
          </div>

          <button
            className={`fluid ui button blue ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
            style={{
              background: isLoading ? '#a0aec0' : 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '12px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: isLoading ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.3)',
              outline: 'none',
              width: '100%',
              marginTop: '1rem'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
              }
            }}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </div>

        {message && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            borderRadius: '10px',
            border: '1px solid #fed7d7',
            backgroundColor: '#fef5e7',
            color: '#c53030',
            textAlign: 'center',
            fontWeight: '500',
            fontSize: '0.95rem',
            animation: 'shake 0.5s ease-in-out'
          }}>
            <span style={{ marginRight: '0.5rem' }}>⚠️</span>
            {message}
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #e2e8f0',
          color: '#a0aec0',
          fontSize: '0.85rem'
        }}>
          Secure access for authorized verifiers only
        </div>
      </form>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }

        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(20px) rotate(-180deg); }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        @media (max-width: 768px) {
          form {
            padding: 2rem !important;
            margin: 20px !important;
            maxWidth: 350px !important;
          }

          h1 {
            font-size: 1.8rem !important;
          }

          input {
            padding: 0.8rem !important;
          }

          button {
            padding: 0.8rem 1.5rem !important;
            font-size: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}

export default VerifierLogin;


