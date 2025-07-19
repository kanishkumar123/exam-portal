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

  // bulk‐import state
  const [file, setFile] = useState(null);
  const [importLog, setImportLog] = useState([]);
  const [importing, setImporting] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // fetch all users
  const fetchUsers = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "users"));
    setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    setLoading(false);
  };
  useEffect(() => {
    fetchUsers();
  }, []);

  // change role
  const handleRoleChange = async (uid, newRole) => {
    await updateDoc(doc(db, "users", uid), { role: newRole });
    fetchUsers();
  };
  // delete user doc
  const handleDelete = async (uid) => {
    if (!window.confirm("Delete user?")) return;
    await deleteDoc(doc(db, "users", uid));
    fetchUsers();
  };
  // invite staff
  const createStaff = async () => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: "Staff" });
      await setDoc(doc(db, "users", cred.user.uid), {
        email: cred.user.email,
        role: "staff",
        createdAt: new Date(),
      });
      setEmail("");
      setPassword("");
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };
  // bulk import students CSV (DD‑MM‑YYYY)
  const handleImport = () => {
    if (!file) return;
    setImporting(true);
    setImportLog([]);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        const log = [];
        for (let row of data) {
          const app = String(row.applicationNumber).trim();
          const dobRaw = String(row.DOB).trim();
          const parts = dobRaw.split(/[-/]/);
          if (parts.length !== 3) {
            log.push(`❌ ${app}: invalid DOB "${dobRaw}"`);
            continue;
          }
          let [day, month, year] = parts.map((p) => p.padStart(2, "0"));
          const iso = `${year}-${month}-${day}`; // YYYY-MM-DD
          const pwd = `${year}${month}${day}`; // password
          const studEmail = `${app}@yourdomain.local`;
          try {
            const cred = await createUserWithEmailAndPassword(
              auth,
              studEmail,
              pwd
            );
            await setDoc(doc(db, "users", cred.user.uid), {
              uid: cred.user.uid,
              role: "student",
              applicationNumber: app,
              dob: iso,
              createdAt: new Date(),
            });
            log.push(`✅ ${app}`);
          } catch (err) {
            log.push(`❌ ${app}: ${err.code}`);
          }
        }
        setImportLog(log);
        setImporting(false);
        fetchUsers();
      },
    });
  };
  // logout
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

      {/* invite staff */}
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
            placeholder="Temp Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn btn-primary" onClick={createStaff}>
            Create Staff
          </button>
        </div>
      </div>

      {/* bulk import students */}
      <div className="mb-5">
        <h4>Import Students CSV</h4>
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
          {importing ? "Importing…" : "Start Import"}
        </button>
        {importLog.length > 0 && (
          <ul className="mt-3">
            {importLog.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        )}
      </div>

      {/* user table */}
      {loading ? (
        <p>Loading users…</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>UID</th>
              <th>Email</th>
              <th>App#/Name</th>
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
