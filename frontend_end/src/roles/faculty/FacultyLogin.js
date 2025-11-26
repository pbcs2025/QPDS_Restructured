import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import validateLogin from "../../common/validateLogin";
import "../../common/Main.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function FacultyLogin() {
  const navigate = useNavigate();
  const initialValues = { username: "", password: "" };
  const [formValues, setFormValues] = useState(initialValues);
  const [formErrors, setFormErrors] = useState({});
  const [loginMessage, setLoginMessage] = useState("");
  const [step, setStep] = useState(1); // 1 = login, 2 = verify login, 3 = forgot email
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  // Handle verification code input
  const handleVerificationCodeChange = (index, value) => {
    if (value.length > 1) return;
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    
    if (value && index < 5) {
      setTimeout(() => {
        const nextInput = document.getElementById(`verification-${index + 1}`);
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }, 10);
    }
  };

  // Handle paste functionality
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = ['', '', '', '', '', ''];
    
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newCode[i] = pastedData[i];
    }
    
    setVerificationCode(newCode);
    
    const nextEmptyIndex = newCode.findIndex(digit => digit === '');
    const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : 5;
    
    setTimeout(() => {
      const nextInput = document.getElementById(`verification-${focusIndex}`);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }, 10);
  };

  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`verification-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Get the complete verification code
  const getCompleteCode = () => verificationCode.join('');

  // Step 1: Login
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateLogin(formValues);
    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      setIsLoading(true);
      setLoginMessage("");
      
      try {
        const response = await fetch(`${API_BASE}/faculty/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setLoginMessage("✔ Verification code sent to your email.");
          setTimeout(() => {
            setStep(2);
            setIsLoading(false);
          }, 500);
        } else {
          setLoginMessage("❌ " + (data.message || "Invalid credentials."));
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Login failed:", error);
        setLoginMessage("❌ Server error. Please try again later.");
        setIsLoading(false);
      }
    }
  };

  // Step 2: Verify login code
  const handleVerify = async (e) => {
    e.preventDefault();
    const completeCode = getCompleteCode();
    
    if (completeCode.length !== 6) {
      setLoginMessage("❌ Please enter the complete 6-digit verification code.");
      return;
    }
    
    setIsLoading(true);
    setLoginMessage("");
    
    try {
      const response = await fetch(`${API_BASE}/faculty/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formValues.username, code: completeCode }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store faculty data
        localStorage.setItem("faculty_username", formValues.username);
        if (data.facultyData) {
          localStorage.setItem("faculty_data", JSON.stringify(data.facultyData));
        }
        
        setLoginMessage("✔ Login successful! Redirecting...");
        setTimeout(() => {
          navigate("/faculty-dashboard");
        }, 1000);
      } else {
        setLoginMessage("❌ " + (data.message || "Invalid verification code."));
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Verification failed:", error);
      setLoginMessage("❌ Server error. Please try again later.");
      setIsLoading(false);
    }
  };

  // Step 3: Forgot password - request password via email
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!formValues.username) {
      setLoginMessage("❌ Please enter your email address.");
      return;
    }
    
    setIsLoading(true);
    setLoginMessage("");
    
    try {
      const response = await fetch(`${API_BASE}/faculty/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formValues.username }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        setLoginMessage("✔ Password sent to your email. Please check your inbox.");
        setTimeout(() => {
          setStep(1);
          setIsLoading(false);
        }, 2000);
      } else {
        setLoginMessage("❌ " + (data.message || "Email not found."));
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Forgot password failed:", error);
      setLoginMessage("❌ Server error. Please try again later.");
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `}
      </style>
      <div style={{
        minHeight: '100vh',
        background: 'url(/images/GAT.jpg)',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '450px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease',
          overflow: 'hidden'
        }}>
      {/* Step 1: Login */}
      {step === 1 && (
        <div style={{ padding: '40px' }}>
          <form onSubmit={handleSubmit} style={{ animation: 'fadeIn 0.5s ease-in' }}>
            <h1 style={{
              textAlign: 'center',
              color: '#2c3e50',
              marginBottom: '30px',
              fontSize: '28px',
              fontWeight: '600'
            }}>Faculty Login</h1>
          <div className="ui form">
            <div className="field">
              <label style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#34495e',
                marginBottom: '8px',
                display: 'block'
              }}>Username (Email)</label>
              <input
                type="text"
                name="username"
                value={formValues.username}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3498db'}
                onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
              />
              <p style={{ color: '#e74c3c', fontSize: '12px', margin: '5px 0 0 0' }}>{formErrors.username}</p>
            </div>
            <div className="field" style={{ position: "relative", marginTop: '20px' }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#34495e',
                marginBottom: '8px',
                display: 'block'
              }}>Password</label>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formValues.password}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '12px 45px 12px 16px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3498db'}
                onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "15px",
                  top: "40px",
                  cursor: "pointer",
                  fontSize: "18px",
                  color: "#7f8c8d",
                  transition: 'color 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = '#3498db'}
                onMouseLeave={(e) => e.target.style.color = '#7f8c8d'}
              >
                <i className={showPassword ? "fa fa-eye-slash" : "fa fa-eye"}></i>
              </span>
              <p style={{ color: '#e74c3c', fontSize: '12px', margin: '5px 0 0 0' }}>{formErrors.password}</p>
            </div>
            <button 
              className="fluid ui button blue" 
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '14px',
                background: isLoading ? '#bdc3c7' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                marginTop: '25px',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.target.style.background = '#2980b9';
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.target.style.background = '#3498db';
              }}
            >
              {isLoading ? (
                <>
                  <i className="fa fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                  Processing...
                </>
              ) : (
                'Login'
              )}
            </button>
          </div>
          <p
            style={{ 
              cursor: "pointer", 
              color: "#3498db", 
              textAlign: 'center',
              marginTop: '20px',
              fontSize: '14px',
              transition: 'color 0.3s ease'
            }}
            onClick={() => setStep(3)}
            onMouseEnter={(e) => e.target.style.color = '#2980b9'}
            onMouseLeave={(e) => e.target.style.color = '#3498db'}
          >
            Forgot Password?
          </p>
          </form>
        </div>
      )}

      {/* Step 2: Verify login */}
      {step === 2 && (
        <div style={{ padding: '40px' }}>
          <form onSubmit={handleVerify} style={{ animation: 'fadeIn 0.5s ease-in' }}>
            <h1 style={{
              textAlign: 'center',
              color: '#2c3e50',
              marginBottom: '30px',
              fontSize: '28px',
              fontWeight: '600'
            }}>Email Verification</h1>
            
            <div style={{
              background: '#e8f5e8',
              border: '1px solid #4caf50',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '25px',
              textAlign: 'center'
            }}>
              <i className="fa fa-envelope" style={{ color: '#4caf50', fontSize: '20px', marginRight: '8px' }}></i>
              <span style={{ color: '#2e7d32', fontWeight: '500' }}>
                Verification code sent to <strong>{formValues.username}</strong>
              </span>
            </div>

            <div className="ui form">
              <label style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#34495e',
                marginBottom: '15px',
                display: 'block',
                textAlign: 'center'
              }}>Enter Verification Code</label>
              
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                marginBottom: '30px'
              }}>
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    id={`verification-${index}`}
                    type="text"
                    value={digit}
                    onChange={(e) => handleVerificationCodeChange(index, e.target.value)}
                    onPaste={handlePaste}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    maxLength="1"
                    style={{
                      width: '50px',
                      height: '50px',
                      border: '2px solid #e1e8ed',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '700',
                      textAlign: 'center',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      background: 'white',
                      color: '#1a1a1a',
                      caretColor: '#3498db'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3498db';
                      e.target.style.boxShadow = '0 0 0 3px rgba(52, 152, 219, 0.2)';
                      e.target.style.background = '#f8f9fa';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e1e8ed';
                      e.target.style.boxShadow = 'none';
                      e.target.style.background = 'white';
                    }}
                  />
                ))}
              </div>

              <button 
                className="fluid ui button green" 
                disabled={isLoading || getCompleteCode().length < 6}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: (isLoading || getCompleteCode().length < 6) ? '#bdc3c7' : '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: (isLoading || getCompleteCode().length < 6) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  marginTop: '10px'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && getCompleteCode().length >= 6) e.target.style.background = '#45a049';
                }}
                onMouseLeave={(e) => {
                  if (!isLoading && getCompleteCode().length >= 6) e.target.style.background = '#4caf50';
                }}
              >
                {isLoading ? (
                  <>
                    <i className="fa fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </button>
            </div>

            <div style={{
              textAlign: 'center',
              marginTop: '25px'
            }}>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setVerificationCode(['', '', '', '', '', '']);
                }}
                style={{
                  background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                  border: '2px solid #2980b9',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  padding: '10px 20px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px rgba(52, 152, 219, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #2980b9 0%, #1f618d 100%)';
                  e.target.style.borderColor = '#1f618d';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(52, 152, 219, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
                  e.target.style.borderColor = '#2980b9';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px rgba(52, 152, 219, 0.3)';
                }}
              >
                <i className="fa fa-arrow-left" style={{ fontSize: '12px' }}></i>
                Back to Login
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Forgot password */}
      {step === 3 && (
        <div style={{ padding: '40px' }}>
          <form onSubmit={handleForgotPassword} style={{ animation: 'fadeIn 0.5s ease-in' }}>
            <h1 style={{
              textAlign: 'center',
              color: '#2c3e50',
              marginBottom: '30px',
              fontSize: '28px',
              fontWeight: '600'
            }}>Forgot Password</h1>
            
            <div style={{
              background: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '25px',
              textAlign: 'center'
            }}>
              <i className="fa fa-info-circle" style={{ color: '#856404', fontSize: '18px', marginRight: '8px' }}></i>
              <span style={{ color: '#856404', fontWeight: '500', fontSize: '14px' }}>
                Enter your registered email to receive your password
              </span>
            </div>

            <div className="ui form">
              <div className="field">
                <label style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#34495e',
                  marginBottom: '8px',
                  display: 'block'
                }}>Enter Registered Email</label>
                <input
                  type="email"
                  name="username"
                  value={formValues.username}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e1e8ed',
                    borderRadius: '8px',
                    fontSize: '16px',
                    transition: 'border-color 0.3s ease',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#f39c12'}
                  onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
                />
              </div>
              <button 
                className="fluid ui button orange"
                disabled={isLoading}
                type="submit"
                style={{
                  width: '100%',
                  padding: '14px',
                  background: isLoading 
                    ? 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)' 
                    : 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  marginTop: '25px',
                  position: 'relative',
                  boxShadow: isLoading 
                    ? '0 2px 4px rgba(127, 140, 141, 0.3)' 
                    : '0 4px 8px rgba(243, 156, 18, 0.3)',
                  transform: isLoading ? 'none' : 'translateY(0)',
                  opacity: isLoading ? '0.8' : '1'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.target.style.background = 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)';
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 12px rgba(243, 156, 18, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.target.style.background = 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 8px rgba(243, 156, 18, 0.3)';
                  }
                }}
              >
                {isLoading ? (
                  <>
                    <i className="fa fa-spinner fa-spin" style={{ 
                      marginRight: '8px',
                      animation: 'spin 1s linear infinite'
                    }}></i>
                    <span style={{ 
                      background: 'linear-gradient(45deg, #fff, #f0f0f0, #fff)',
                      backgroundSize: '200% 200%',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      animation: 'shimmer 2s ease-in-out infinite'
                    }}>
                      Sending Password...
                    </span>
                  </>
                ) : (
                  <>
                    <i className="fa fa-paper-plane" style={{ marginRight: '8px' }}></i>
                    Send Password
                  </>
                )}
              </button>
            </div>

            <div style={{
              textAlign: 'center',
              marginTop: '25px'
            }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                  border: '2px solid #2980b9',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  padding: '10px 20px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px rgba(52, 152, 219, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #2980b9 0%, #1f618d 100%)';
                  e.target.style.borderColor = '#1f618d';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(52, 152, 219, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
                  e.target.style.borderColor = '#2980b9';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px rgba(52, 152, 219, 0.3)';
                }}
              >
                <i className="fa fa-arrow-left" style={{ fontSize: '12px' }}></i>
                Back to Login
              </button>
            </div>
          </form>
        </div>
      )}

          {loginMessage && (
            <div style={{
              margin: '20px 40px',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              textAlign: 'center',
              background: loginMessage.includes('❌') ? '#fdf2f2' : '#f0f9ff',
              border: loginMessage.includes('❌') ? '1px solid #fecaca' : '1px solid #bfdbfe',
              color: loginMessage.includes('❌') ? '#dc2626' : '#1e40af',
              animation: 'fadeIn 0.3s ease-in'
            }}>
              {loginMessage}
            </div>
          )}

          {step === 1 && (
            <div style={{ padding: '0 40px 40px 40px', textAlign: 'center' }}>
              <p style={{ color: '#7f8c8d', fontSize: '14px', margin: 0 }}>
                Don't have an account? <Link to="/register" style={{ color: '#3498db', textDecoration: 'none' }}>Register here</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default FacultyLogin;