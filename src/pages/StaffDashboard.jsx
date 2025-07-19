import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  setDoc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import Papa from "papaparse";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "./StaffDashboard.css"; // ✅ Import your custom styles

export default function StaffDashboard() {
  const { currentUser, logout } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [csvTarget, setCsvTarget] = useState(null); // current examId being imported
  const [csvLogs, setCsvLogs] = useState({});
  const [csvImporting, setCsvImporting] = useState(false);

  const navigate = useNavigate();

  // Fetch exams created by current staff
  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    const fetchExams = async () => {
      setLoading(true);
      const q = query(
        collection(db, "exams"),
        where("createdBy", "==", currentUser.uid)
      );
      const snap = await getDocs(q);
      setExams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    fetchExams();
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { title, startTime, endTime, duration } = e.target.elements;
    const payload = {
      title: title.value,
      startTime: new Date(startTime.value),
      endTime: new Date(endTime.value),
      duration: Number(duration.value),
      createdBy: currentUser.uid,
    };
    const form = e.target;
    if (form.dataset.editId) {
      await updateDoc(doc(db, "exams", form.dataset.editId), payload);
      delete form.dataset.editId;
    } else {
      await addDoc(collection(db, "exams"), payload);
    }
    form.reset();

    setLoading(true);
    const q = query(
      collection(db, "exams"),
      where("createdBy", "==", currentUser.uid)
    );
    const snap = await getDocs(q);
    setExams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "exams", id));
    setExams((prev) => prev.filter((e) => e.id !== id));
  };

  const handleStudentCsv = (file, examId) => {
    if (!file) return;
    setCsvImporting(true);
    setCsvLogs((l) => ({ ...l, [examId]: [] }));

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        const logs = [];
        for (const row of data) {
          const app = String(row.applicationNumber).trim();
          const dobRaw = String(row.DOB).trim();

          if (!app || !dobRaw) {
            logs.push(`❌ [${app}] Missing applicationNumber or DOB`);
            continue;
          }

          const parts = dobRaw.split(/[-/]/);
          if (parts.length !== 3) {
            logs.push(`❌ [${app}] Invalid DOB "${dobRaw}"`);
            continue;
          }

          let [day, month, year] = parts.map((p) => p.padStart(2, "0"));
          const iso = `${year}-${month}-${day}`;
          const pwd = `${year}${month}${day}`;
          const studEmail = `${app}@yourdomain.local`;

          let uid = null;
          try {
            const usersSnap = await getDocs(
              query(
                collection(db, "users"),
                where("applicationNumber", "==", app)
              )
            );

            if (!usersSnap.empty) {
              uid = usersSnap.docs[0].id;
              logs.push(`ℹ️ [${app}] Student exists`);
            } else {
              try {
                const cred = await createUserWithEmailAndPassword(
                  auth,
                  studEmail,
                  pwd
                );
                uid = cred.user.uid;
                await setDoc(doc(db, "users", uid), {
                  uid,
                  email: studEmail,
                  role: "student",
                  applicationNumber: app,
                  dob: iso,
                  createdAt: new Date(),
                });
                logs.push(`✅ [${app}] Student created`);
              } catch (createErr) {
                logs.push(
                  `❌ [${app}] User create error: ${
                    createErr.message || createErr.code
                  }`
                );
                continue;
              }
            }

            const regRef = doc(db, "registrations", `${examId}_${app}`);
            await setDoc(regRef, {
              examId,
              studentId: uid,
              studentAppNo: app,
              DOB: dobRaw,
              allowed: true,
            });

            logs.push(`✅ [${app}] Registered for exam`);
          } catch (err) {
            logs.push(`❌ [${app}] Error: ${err.message || err.code}`);
          }
        }

        setCsvLogs((prev) => ({
          ...prev,
          [examId]: logs,
        }));
        setCsvImporting(false);
        setCsvTarget(null);
        alert("CSV import completed.");
      },
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (loading) return <div>Loading…</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Your Exams</h2>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Exam form */}
      <form className="exam-form" onSubmit={handleSubmit}>
        <input name="title" placeholder="Title" required />
        <input name="startTime" type="datetime-local" required />
        <input name="endTime" type="datetime-local" required />
        <input
          name="duration"
          type="number"
          placeholder="Duration (mins)"
          required
        />
        <button type="submit">Save Exam</button>
      </form>

      {exams.length === 0 && <p>No exams created yet.</p>}

      {exams.map((exam) => (
        <div key={exam.id} className="exam-card">
          <h4>{exam.title}</h4>
          <p>
            {new Date(
              exam.startTime.seconds
                ? exam.startTime.seconds * 1000
                : exam.startTime
            ).toLocaleString()}{" "}
            –{" "}
            {new Date(
              exam.endTime.seconds ? exam.endTime.seconds * 1000 : exam.endTime
            ).toLocaleString()}
          </p>
          <p>Duration: {exam.duration} mins</p>

          <div className="exam-buttons">
            <button
              onClick={() => {
                const f = document.querySelector("form");
                f.title.value = exam.title;

                let st = exam.startTime.seconds
                  ? new Date(exam.startTime.seconds * 1000)
                  : new Date(exam.startTime);
                let et = exam.endTime.seconds
                  ? new Date(exam.endTime.seconds * 1000)
                  : new Date(exam.endTime);

                f.startTime.value = st.toISOString().slice(0, 16);
                f.endTime.value = et.toISOString().slice(0, 16);
                f.duration.value = exam.duration;
                f.dataset.editId = exam.id;
              }}
            >
              Edit
            </button>
            <button onClick={() => handleDelete(exam.id)}>Delete</button>
            <button
              onClick={() =>
                setCsvTarget(csvTarget === exam.id ? null : exam.id)
              }
              disabled={csvImporting}
            >
              {csvTarget === exam.id ? "Cancel CSV" : "Import Students"}
            </button>
            <button onClick={() => navigate(`/staff/results/${exam.id}`)}>
              View Submissions
            </button>
            <button
              onClick={() => navigate(`/staff/exam/${exam.id}/questions`)}
            >
              Manage Questions
            </button>
          </div>

          {/* 📥 CSV File input */}
          {csvTarget === exam.id && (
            <div>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleStudentCsv(e.target.files[0], exam.id)}
              />
              {csvImporting && <span>Importing…</span>}
            </div>
          )}

          {/* 📜 CSV Import logs */}
          {csvLogs[exam.id] && csvLogs[exam.id].length > 0 && (
            <ul className="logs">
              {csvLogs[exam.id].map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
