// inside AdminDashboard.jsx
import React, { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";

export default function AdminDashboard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const createStaff = async () => {
    try {
      // 1) Create Auth user
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // 2) (Optional) set displayName in Auth profile
      await updateProfile(cred.user, { displayName: "Staff" });
      // 3) Save role in Firestore
      await setDoc(doc(db, "users", cred.user.uid), {
        email: cred.user.email,
        role: "staff",
        createdAt: new Date(),
      });
      alert(`Staff ${email} created!`);
      setEmail("");
      setPassword("");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div>
      <h2>Invite New Staff</h2>
      <input
        type="email"
        placeholder="Staff Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />
      <button onClick={createStaff}>Create Staff Account</button>
    </div>
  );
}
