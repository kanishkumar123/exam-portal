// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import Papa from "papaparse";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bulk import state
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState([]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // Fetch all users from Firestore
  const fetchUsers = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "users"));
    const data = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Change user role
  const handleRoleChange = async (uid, newRole) => {
    await updateDoc(doc(db, "users", uid), { role: newRole });
    fetchUsers();
  };

  // Delete Firestore user record
  const handleDelete = async (uid) => {
    if (!window.confirm("Delete this user record?")) return;
    await deleteDoc(doc(db, "users", uid));
    fetchUsers();
  };

  // Invite New Staff
  const createStaff = async () => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: "Staff" });
      await setDoc(doc(db, "users", cred.user.uid), {
        email: cred.user.email,
        role: "staff",
        createdAt: new Date(),
      });
      alert(`Staff ${email} created!`);
      setEmail("");
      setPassword("");
      fetchUsers();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Bulk Import Students from CSV (DD-MM-YYYY)
  const handleImport = () => {
    if (!file) return;
    setImporting(true);
    setImportLog([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const log = [];
        for (let row of results.data) {
          const appNum = String(
            row.applicationNumber || row.application_number
          ).trim();
          const dobRaw = String(row.DOB || row.dob).trim();

          // Parse DD-MM-YYYY or DD/MM/YYYY
          const parts = dobRaw.split(/[-/]/);
          if (parts.length !== 3) {
            log.push(`❌ ${appNum}: invalid DOB format "${dobRaw}"`);
            continue;
          }
          let [day, month, year] = parts;
          day = day.padStart(2, "0");
          month = month.padStart(2, "0");
          // Build ISO date and password
          const isoDate = `${year}-${month}-${day}`; // YYYY-MM-DD
          const pwd = `${year}${month}${day}`; // YYYYMMDD

          const email = `${appNum}@yourdomain.local`;
          try {
            const cred = await createUserWithEmailAndPassword(auth, email, pwd);
            await setDoc(doc(db, "users", cred.user.uid), {
              uid: cred.user.uid,
              role: "student",
              applicationNumber: appNum,
              dob: isoDate,
              createdAt: new Date(),
            });
            log.push(`✅ ${appNum}`);
          } catch (err) {
            log.push(`❌ ${appNum}: ${err.code}`);
          }
        }
        setImportLog(log);
        setImporting(false);
        fetchUsers();
      },
      error: (err) => {
        console.error("CSV parse error:", err);
        setImportLog([`❌ CSV parse error: ${err.message}`]);
        setImporting(false);
      },
    });
  };

  // Logout
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Admin Dashboard</h2>
        <button className="btn btn-danger" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Invite New Staff */}
      <div className="mb-5">
        <h4>Invite New Staff</h4>
        <div className="d-flex gap-2">
          <input
            type="email"
            className="form-control"
            placeholder="Staff Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="form-control"
            placeholder="Temporary Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn btn-primary" onClick={createStaff}>
            Create Staff
          </button>
        </div>
      </div>

      {/* Bulk Import Students */}
      <div className="mb-5">
        <h4>Import Students from CSV</h4>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button
          className="btn btn-secondary ms-2"
          onClick={handleImport}
          disabled={!file || importing}
        >
          {importing ? "Importing..." : "Start Import"}
        </button>
        {importLog.length > 0 && (
          <div className="mt-3">
            <h6>Import Results:</h6>
            <ul>
              {importLog.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* User Management Table */}
      {loading ? (
        <p>Loading users...</p>
      ) : (
        <table className="table table-striped">
          <thead>
            <tr>
              <th>UID</th>
              <th>Email</th>
              <th>Name/App#</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid}>
                <td>{u.uid}</td>
                <td>{u.email}</td>
                <td>{u.applicationNumber || u.displayName || "—"}</td>
                <td>
                  <select
                    className="form-select"
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                  >
                    <option value="student">Student</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(u.uid)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
