import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../common/Main.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL;

function VerifierLogin() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/verifier/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem("verifier", JSON.stringify(data.verifier));
        navigate("/verifier-dashboard");
      } else {
        setMessage(data.message || "Invalid credentials");
      }
    } catch (err) {
      console.error("Verifier login error", err);
      setMessage("Server error");
    }
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit}>
        <h1>Verifier Login</h1>
        <div className="ui form">
          <div className="field">
            <label>Username</label>
            <input type="text" name="username" value={formValues.username} onChange={handleChange} />
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
              style={{ position: "absolute", right: "10px", top: "35px", cursor: "pointer", fontSize: "18px", color: "#555" }}
            >
              <i className={showPassword ? "fa fa-eye-slash" : "fa fa-eye"}></i>
            </span>
          </div>
          <button className="fluid ui button blue">Login</button>
        </div>
        {message && <div className="ui message error">{message}</div>}
      </form>
    </div>
  );
}

export default VerifierLogin;


