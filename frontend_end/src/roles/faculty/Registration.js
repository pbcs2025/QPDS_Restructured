import { useState } from "react";
import "../../common/Main.css";
import { Link, useNavigate } from "react-router-dom";

const initialValues = {
  username: "",
  clgName: "Global Academy of Technology", // fixed value
  deptName: "",
  email: "",
  phoneNo: "",
};

const departmentOptions = [
  { value: "", label: "Select Department" },
  { value: "CSE", label: "Computer Science and Engineering (CSE)" },
  { value: "ISE", label: "Information Science and Engineering (ISE)" },
  { value: "ECE", label: "Electronics and Communication Engineering (ECE)" },
  { value: "EEE", label: "Electrical and Electronics Engineering (EEE)" },
  { value: "ME", label: "Mechanical Engineering (ME)" },
  { value: "CE", label: "Civil Engineering (CE)" },
  { value: "AIML", label: "Artificial Intelligence and Machine Learning (AIML)" },
  { value: "EIE", label: "Electronics and Instrumentation Engineering (EIE)" },
  { value: "AE", label: "Aerospace Engineering (AE)" },
];

function App() {
  const [formValues, setFormValues] = useState(initialValues);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmit, setIsSubmit] = useState(false);

  const navigate = useNavigate();

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
      fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      })
        .then((res) => res.text())
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
                >
                  {departmentOptions.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
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
