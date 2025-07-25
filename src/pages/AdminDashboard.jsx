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
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import Papa from "papaparse";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [file, setFile] = useState(null);
  const [importLog, setImportLog] = useState([]);
  const [importing, setImporting] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ⬇️ Store admin credentials securely to re-login after staff creation
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "users"));
    setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (uid, newRole) => {
    await updateDoc(doc(db, "users", uid), { role: newRole });
    fetchUsers();
  };

  const handleDelete = async (uid) => {
    if (!window.confirm("Delete user?")) return;
    await deleteDoc(doc(db, "users", uid));
    fetchUsers();
  };

  const createStaff = async () => {
    if (!adminEmail || !adminPassword) {
      alert("Please enter your admin email and password.");
      return;
    }

    try {
      // Step 1: create staff (this switches auth to new staff)
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const staffUid = cred.user.uid;

      // Step 2: Sign out of new staff
      await signOut(auth);

      // Step 3: Re-authenticate as admin
      await signInWithEmailAndPassword(
        auth,
        adminEmail,
        adminPassword
      );

      // Step 4: Now back in admin context, add Firestore staff user doc
      await setDoc(doc(db, "users", staffUid), {
        uid: staffUid,
        email: email.trim(),
        role: "staff",
        createdAt: new Date(),
      });

      alert(`Staff ${email} created successfully.`);

      // Cleanup
      setEmail("");
      setPassword("");
      fetchUsers();
    } catch (err) {
      console.error("Create staff failed:", err);
      alert(err.message || "Failed to create staff user. Check credentials and try again.");
    }
  };

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
          const iso = `${year}-${month}-${day}`;
          const pwd = `${year}${month}${day}`;
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

      {/* ✅ Admin login credentials section (used for safe re-login) */}
      <div className="mb-4">
        <h4>Admin Credentials (for re-login after staff creation)</h4>
        <div className="d-flex gap-2 flex-wrap">
          <input
            type="email"
            className="form-control"
            placeholder="Your Admin Email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="form-control"
            placeholder="Admin Password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="mb-5">
        <h4>Invite New Staff</h4>
        <div className="d-flex gap-2 flex-wrap">
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
            placeholder="Temp Password for staff"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn btn-primary" onClick={createStaff}>
            Create Staff
          </button>
        </div>
      </div>

      <div className="mb-5">
        <h4>Import Students CSV</h4>
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
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
