import { useState } from "react";
import {useNavigate } from "react-router-dom";
import validateLogin from "../../common/validateLogin";
import "../../common/Main.css";

function FacultyLogin() {
  const navigate = useNavigate();
  const initialValues = { username: "", password: "" };
  const [formValues, setFormValues] = useState(initialValues);
  const [formErrors, setFormErrors] = useState({});
  const [loginMessage, setLoginMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateLogin(formValues);
    setFormErrors(errors);

    if (Object.keys(errors).length === 0) {
      const { username, password } = formValues;
      if (username === "admin" && password === "admin123") {
        navigate("/admin-dashboard");
      } else {
        setLoginMessage("❌ Invalid credentials.");
      }
    }
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit}>
        <h1>Admin Login</h1>
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
          <button className="fluid ui button blue">Login</button>
        </div>
      </form>
      {loginMessage && <div className="ui message error">{loginMessage}</div>}
    </div>
  );
}

export default FacultyLogin;
