import { useState, useEffect } from "react";
import "../../common/Main.css";
import { Link, useNavigate } from "react-router-dom";

const initialValues = {
  username: "",
  clgName: "Global Academy of Technology", // fixed value
  deptName: "",
  email: "",
  phoneNo: "",
  usertype: "internal", // default for faculty registration
};

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Department options will be fetched from API

function App() {
  const [formValues, setFormValues] = useState(initialValues);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  // Fetch departments from API
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/departments/active`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setDepartments(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching departments:", err);
        setError("Failed to load departments. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  // Check if email already exists
  const checkEmailExists = async (email) => {
    try {
      const response = await fetch(`${API_BASE}/faculty/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      return data.exists || false;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  const validate = async (values) => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    const nameRegex = /^[a-zA-Z\s]+$/;
    
    if (!values.username) {
      errors.username = "Name is required!";
    } else if (values.username.length < 2) {
      errors.username = "Name must be at least 2 characters long!";
    } else if (!nameRegex.test(values.username)) {
      errors.username = "Name can only contain letters and spaces!";
    }

    if (!values.deptName) {
      errors.deptName = "Department is required!";
    }
    
    if (!values.email) {
      errors.email = "Email is required!";
    } else if (!emailRegex.test(values.email)) {
      errors.email = "Invalid email format!";
    } else {
      // Check if email already exists
      try {
        const exists = await checkEmailExists(values.email);
        if (exists) {
          errors.email = "This email is already registered! Please use a different email.";
        }
      } catch (error) {
        console.error('Email validation error:', error);
        errors.email = "Unable to verify email. Please try again.";
      }
    }
    
    if (!values.phoneNo) {
      errors.phoneNo = "Phone number is required!";
    } else if (values.phoneNo.length !== 10 || !/^\d+$/.test(values.phoneNo)) {
      errors.phoneNo = "Phone number must be exactly 10 digits!";
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormErrors({});
    
    try {
      const errors = await validate(formValues);
    setFormErrors(errors);
    setIsSubmit(true);

    if (Object.keys(errors).length === 0) {
        const response = await fetch(`${API_BASE}/faculty/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formValues.username,
          clgName: formValues.clgName,
          deptName: formValues.deptName,
          email: formValues.email,
          phone: formValues.phoneNo,
          usertype: formValues.usertype,
        }),
        });

        const data = await response.json();
        
        if (response.ok) {
          console.log("Registered successfully:", data);
          setIsSubmit(true);
          setFormValues(initialValues);
          setTimeout(() => {
            navigate("/login/faculty");
          }, 4000);
        } else {
          console.error("Registration failed:", data);
          setFormErrors({ submit: data.message || data.error || "Registration failed. Please try again." });
          setIsSubmit(false);
        }
      } else {
        setIsSubmit(false);
      }
    } catch (err) {
      console.error("Registration failed:", err);
      setFormErrors({ submit: "Network error. Please try again." });
      setIsSubmit(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes slideInFromTop {
            from { 
              opacity: 0; 
              transform: translateY(-50px) scale(0.95); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0) scale(1); 
            }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
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
        padding: '20px',
        position: 'relative'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '800px',
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          boxShadow: '0 15px 30px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          animation: 'slideInFromTop 0.8s ease-out',
          position: 'relative'
        }}>
          {/* Go Back Button */}
          <button
            onClick={() => navigate(-1)}
            style={{
              position: 'absolute',
              top: '15px',
              left: '15px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
              border: '1px solid #bbdefb',
              color: '#1976d2',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 12px rgba(25, 118, 210, 0.3)';
              e.target.style.background = 'linear-gradient(135deg, #bbdefb 0%, #e1bee7 100%)';
              e.target.style.borderColor = '#90caf9';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
              e.target.style.background = 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)';
              e.target.style.borderColor = '#bbdefb';
            }}
            title="Go Back"
          >
            <i className="fa fa-arrow-left"></i>
          </button>
      {isSubmit && Object.keys(formErrors).length === 0 && (
            <div style={{
              position: 'absolute',
              top: '15px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
              color: 'white',
              padding: '15px 25px',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: '600',
              textAlign: 'center',
              boxShadow: '0 6px 15px rgba(46, 204, 113, 0.4)',
              zIndex: 1000,
              animation: 'fadeIn 0.5s ease-in',
              width: '90%',
              maxWidth: '400px'
            }}>
              <div style={{ marginBottom: '8px' }}>
                <i className="fa fa-check-circle" style={{ fontSize: '20px', marginRight: '8px' }}></i>
                Registration Successful!
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9, lineHeight: '1.4' }}>
                An email has been sent to <strong>{formValues.email}</strong> containing your username and password for login.
              </div>
        </div>
      )}

      {!isSubmit || Object.keys(formErrors).length !== 0 ? (
            <div style={{ padding: '30px' }}>
              <form onSubmit={handleSubmit} style={{ animation: 'fadeIn 0.6s ease-out' }}>
                <h1 style={{
                  textAlign: 'center',
                  color: '#2c3e50',
                  marginBottom: '20px',
                  fontSize: '28px',
                  fontWeight: '700',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>Faculty Registration</h1>
                
                <div style={{ marginBottom: '20px' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
                    border: '1px solid #bbdefb',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center'
                  }}>
                    <i className="fa fa-info-circle" style={{ color: '#1976d2', fontSize: '16px', marginRight: '6px' }}></i>
                    <span style={{ color: '#1565c0', fontWeight: '500', fontSize: '13px' }}>
                      Join our faculty community and start creating question papers
                    </span>
                  </div>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: '20px',
                  alignItems: 'start',
                  marginBottom: '20px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#34495e',
                      marginBottom: '8px'
                    }}>Full Name *</label>
                    <input
                      type="text"
                      name="username"
                      value={formValues.username}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      style={{
                        marginLeft:"1px",
                        width: '100%',
                        padding: '10px 14px',
                        border: `2px solid ${formErrors.username ? '#e74c3c' : '#e1e8ed'}`,
                        borderRadius: '8px',
                        fontSize: '15px',
                        transition: 'all 0.3s ease',
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: formErrors.username ? '#fdf2f2' : 'white'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3498db'}
                      onBlur={(e) => e.target.style.borderColor = formErrors.username ? '#e74c3c' : '#e1e8ed'}
                    />
                    {formErrors.username && (
                      <p style={{
                        marginLeft: '1px',
                        color: '#e74c3c',
                        fontSize: '12px',
                        margin: '5px 0 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        animation: 'fadeIn 0.3s ease-in'
                      }}>
                        <i className="fa fa-exclamation-circle" style={{ marginRight: '5px' }}></i>
                        {formErrors.username}
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#34495e',
                      marginBottom: '8px'
                    }}>Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={formValues.email}
                      onChange={handleChange}
                      placeholder="Enter your email address"
                      style={{
                        marginLeft: '1px',
                        width: '100%',
                        padding: '10px 14px',
                        border: `2px solid ${formErrors.email ? '#e74c3c' : '#e1e8ed'}`,
                        borderRadius: '8px',
                        fontSize: '15px',
                        transition: 'all 0.3s ease',
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: formErrors.email ? '#fdf2f2' : 'white'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3498db'}
                      onBlur={(e) => e.target.style.borderColor = formErrors.email ? '#e74c3c' : '#e1e8ed'}
                    />
                    {formErrors.email && (
                      <p style={{
                        color: '#e74c3c',
                        fontSize: '12px',
                        margin: '5px 0 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        animation: 'fadeIn 0.3s ease-in'
                      }}>
                        <i className="fa fa-exclamation-circle" style={{ marginRight: '5px' }}></i>
                        {formErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#34495e',
                      marginBottom: '8px'
                    }}>Department *</label>
                    <select
                      name="deptName"
                      value={formValues.deptName}
                      onChange={handleChange}
                      disabled={loading}
                      style={{
                        marginLeft: '1px',
                        width: '100%',
                        padding: '10px 14px',
                        border: `2px solid ${formErrors.deptName ? '#e74c3c' : '#e1e8ed'}`,
                        borderRadius: '8px',
                        fontSize: '15px',
                        transition: 'all 0.3s ease',
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: loading ? '#f8f9fa' : 'white',
                        cursor: loading ? 'not-allowed' : 'pointer'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3498db'}
                      onBlur={(e) => e.target.style.borderColor = formErrors.deptName ? '#e74c3c' : '#e1e8ed'}
                    >
                      <option value="">{loading ? "Loading departments..." : "Select Department"}</option>
                      {departments.map((dept) => (
                        <option key={dept._id || dept.id} value={dept.name || dept.deptName}>
                          {dept.name || dept.deptName}
                        </option>
                      ))}
                    </select>
                    {error && (
                      <p style={{
                        color: '#e74c3c',
                        fontSize: '12px',
                        margin: '5px 0 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        animation: 'fadeIn 0.3s ease-in'
                      }}>
                        <i className="fa fa-exclamation-circle" style={{ marginRight: '5px' }}></i>
                        {error}
                      </p>
                    )}
                    {formErrors.deptName && (
                      <p style={{
                        color: '#e74c3c',
                        fontSize: '12px',
                        margin: '5px 0 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        animation: 'fadeIn 0.3s ease-in'
                      }}>
                        <i className="fa fa-exclamation-circle" style={{ marginRight: '5px' }}></i>
                        {formErrors.deptName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#34495e',
                      marginBottom: '8px'
                    }}>Phone Number *</label>
                    <input
                      type="text"
                      name="phoneNo"
                      value={formValues.phoneNo}
                      onChange={handleChange}
                      placeholder="Enter 10-digit phone number"
                      maxLength="10"
                      style={{
                        marginLeft: '1px',
                        width: '100%',
                        padding: '10px 14px',
                        border: `2px solid ${formErrors.phoneNo ? '#e74c3c' : '#e1e8ed'}`,
                        borderRadius: '8px',
                        fontSize: '15px',
                        transition: 'all 0.3s ease',
                        outline: 'none',
                        boxSizing: 'border-box',
                        background: formErrors.phoneNo ? '#fdf2f2' : 'white'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3498db'}
                      onBlur={(e) => e.target.style.borderColor = formErrors.phoneNo ? '#e74c3c' : '#e1e8ed'}
                    />
                    {formErrors.phoneNo && (
                      <p style={{
                        color: '#e74c3c',
                        fontSize: '12px',
                        margin: '5px 0 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        animation: 'fadeIn 0.3s ease-in'
                      }}>
                        <i className="fa fa-exclamation-circle" style={{ marginRight: '5px' }}></i>
                        {formErrors.phoneNo}
                      </p>
                    )}
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#34495e',
                      marginBottom: '8px'
                    }}>College Name</label>
                    <input
                      type="text"
                      name="clgName"
                      value={formValues.clgName}
                      readOnly
                      style={{
                        marginLeft: '1px',
                        width: '100%',
                        padding: '10px 14px',
                        border: '2px solid #e1e8ed',
                        borderRadius: '8px',
                        fontSize: '15px',
                        backgroundColor: '#f8f9fa',
                        color: '#6c757d',
                        cursor: 'not-allowed',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {formErrors.submit && (
                    <div style={{
                      background: '#fdf2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#dc2626',
                      fontSize: '14px',
                      textAlign: 'center',
                      animation: 'fadeIn 0.3s ease-in',
                      gridColumn: '1 / -1'
                    }}>
                      <i className="fa fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                      {formErrors.submit}
                    </div>
                  )}

                  <div style={{ 
                    gridColumn: '1 / -1', 
                    display: 'flex', 
                    justifyContent: 'center',
                    marginTop: '10px'
                  }}>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      style={{
                        width: '300px',
                        padding: '12px',
                        background: isSubmitting 
                          ? 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)'
                          : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '700',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: isSubmitting 
                          ? '0 3px 6px rgba(149, 165, 166, 0.3)'
                          : '0 4px 8px rgba(52, 152, 219, 0.3)',
                        transform: isSubmitting ? 'none' : 'translateY(0)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSubmitting) {
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 6px 12px rgba(52, 152, 219, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSubmitting) {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 4px 8px rgba(52, 152, 219, 0.3)';
                        }
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <i className="fa fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                          Registering...
                        </>
                      ) : (
                        <>
                          <i className="fa fa-user-plus" style={{ marginRight: '8px' }}></i>
                          Register Now
                        </>
                      )}
                    </button>
                  </div>
            </div>
          </form>

              <div style={{
                textAlign: 'center',
                marginTop: '20px',
                padding: '15px',
                background: 'rgba(52, 152, 219, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(52, 152, 219, 0.2)'
              }}>
                <p style={{ 
                  color: '#2c3e50', 
                  fontSize: '14px', 
                  margin: '0 0 8px 0',
                  fontWeight: '500'
                }}>
                  Already have an account?
                </p>
                <Link 
                  to="/login/faculty" 
                  style={{
                    color: '#3498db',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    padding: '8px 16px',
                    background: 'white',
                    borderRadius: '6px',
                    border: '2px solid #3498db',
                    transition: 'all 0.3s ease',
                    display: 'inline-block'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#3498db';
                    e.target.style.color = 'white';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.color = '#3498db';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  <i className="fa fa-sign-in-alt" style={{ marginRight: '6px' }}></i>
                  Login Here
                </Link>
              </div>
        </div>
      ) : null}
        </div>
      </div>
    </>
  );
}

export default App;
