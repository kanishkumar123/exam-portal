// src/pages/AdminDashboard.jsx
import React, { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import "./AdminDashboard.css"; // Import your scoped styles

export default function AdminDashboard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const createStaff = async () => {
    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: "Staff" });
      await setDoc(doc(db, "users", cred.user.uid), {
        email: cred.user.email,
        role: "staff",
        createdAt: new Date(),
      });
      alert(`✅ Staff account for ${email} created successfully.`);
      setEmail("");
      setPassword("");
    } catch (err) {
      alert("❌ Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-card glass-card">
        <h2 className="admin-heading">👤 Invite New Staff</h2>

        <input
          type="email"
          className="admin-input"
          placeholder="Staff Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          className="admin-input"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          className="admin-button"
          onClick={createStaff}
          disabled={loading || !email || !password}
        >
          {loading ? "Creating..." : "Create Staff Account"}
        </button>
      </div>
    </div>
  );
}
