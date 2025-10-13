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

// Department options will be fetched from API

function App() {
  const [formValues, setFormValues] = useState(initialValues);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  // Fetch departments from API
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:5000/api/departments/active");
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  const validate = (values) => {
    const errors = {};
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    if (!values.username) {
      errors.username = "Username is required!";
    }
    // College name is fixed, no validation needed

    if (!values.deptName) {
      errors.deptName = "Department Name is Required";
    }
    if (!values.email) {
      errors.email = "Email is required!";
    } else if (!regex.test(values.email)) {
      errors.email = "This is not a valid email format!";
    }
    if (!values.phoneNo) {
      errors.phoneNo = "Phone No is required!";
    } else if (values.phoneNo.length !== 10 || !/^\d+$/.test(values.phoneNo)) {
      errors.phoneNo = "Phone No must be exactly 10 digits!";
    }
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate(formValues);
    setFormErrors(errors);
    setIsSubmit(true);

    if (Object.keys(errors).length === 0) {
      fetch("http://localhost:5000/api/faculty/register", {
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
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Registered successfully:", data);
          setIsSubmit(true);
          setFormValues(initialValues);
          setTimeout(() => {
            navigate("/login/faculty");
          }, 3000);
        })
        .catch((err) => {
          console.error("Registration failed:", err);
          setIsSubmit(false);
        });
    }
  };

  return (
    <>
      <div className="bgImg"></div>

      {isSubmit && Object.keys(formErrors).length === 0 && (
        <div className="success-toast">
          Registration Successful<br />
          Email is sent, please login through that
        </div>
      )}

      {!isSubmit || Object.keys(formErrors).length !== 0 ? (
        <div className="container">
          <form onSubmit={handleSubmit}>
            <h1>Registration</h1>
            <div className="ui divider"></div>
            <div className="ui form">
              <div className="field">
                <label>Name:</label>
                <input
                  type="text"
                  name="username"
                  value={formValues.username}
                  onChange={handleChange}
                />
                <p className="error">{formErrors.username}</p>
              </div>

              <div className="field">
                <label>College Name:</label>
                {/* Fixed and readonly */}
                <input
                  type="text"
                  name="clgName"
                  value={formValues.clgName}
                  readOnly
                  style={{ backgroundColor: "#eee", cursor: "not-allowed" }}
                />
              </div>

              <div className="field">
                <label>Department Name:</label>
                <select
                  name="deptName"
                  value={formValues.deptName}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">{loading ? "Loading departments..." : "Select Department"}</option>
                  {departments.map((dept) => (
                    <option key={dept._id || dept.id} value={dept.name || dept.deptName}>
                      {dept.name || dept.deptName}
                    </option>
                  ))}
                </select>
                {error && <p className="error">{error}</p>}
                <p className="error">{formErrors.deptName}</p>
              </div>

              <div className="field">
                <label>Email:</label>
                <input
                  type="email"
                  name="email"
                  value={formValues.email}
                  onChange={handleChange}
                />
                <p className="error">{formErrors.email}</p>
              </div>

              <div className="field">
                <label>Phone No:</label>
                <input
                  type="text"
                  name="phoneNo"
                  value={formValues.phoneNo}
                  onChange={handleChange}
                />
                <p className="error">{formErrors.phoneNo}</p>
              </div>

              <button type="submit" className="fluid ui button blue">
                Register
              </button>
            </div>
          </form>

          <div className="text">
            <p>
              Already registered? <Link to="/login/faculty">Login here</Link>
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default App;
