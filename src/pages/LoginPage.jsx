import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, userData, currentUser } = useAuth();
  const navigate = useNavigate();

  const isEmail = identifier.includes("@");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      let emailToUse;
      let pwd;

      if (isEmail) {
        emailToUse = identifier.trim();
        pwd = password;
      } else {
        emailToUse = `${identifier.trim()}@yourdomain.local`;
        pwd = dob.replace(/-/g, "");
      }

      await login(emailToUse, pwd);
    } catch (err) {
      console.error(err);
      setError("Login failed. Check your credentials.");
    }
  };

  // ✅ Redirect automatically once userData is loaded
  useEffect(() => {
    if (!userData || !currentUser) return;

    switch (userData.role) {
      case "student":
        navigate("/student");
        break;
      case "staff":
        navigate("/staff");
        break;
      case "admin":
        navigate("/admin");
        break;
      default:
        break;
    }
  }, [userData, currentUser]);

  return (
    <div className="container py-4" style={{ maxWidth: 400 }}>
      <h3 className="mb-3">Login</h3>
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="mb-3">
          <label className="form-label">Email or Application Number</label>
          <input
            type="text"
            className="form-control"
            placeholder={isEmail ? "email@example.com" : "e.g. 12345678"}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value.trim())}
            required
          />
        </div>

        {isEmail ? (
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        ) : (
          <div className="mb-3">
            <label className="form-label">Date of Birth</label>
            <input
              type="date"
              className="form-control"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
            />
            <div className="form-text">Students login with App No + DOB</div>
          </div>
        )}

        <button type="submit" className="btn btn-primary w-100">
          Log In
        </button>
      </form>
    </div>
  );
}
