// src/pages/StaffDashboard.jsx
import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import QuestionForm from "../components/QuestionForm";
import QuestionList from "../components/QuestionList";
import "./StaffDashboard.css";

export default function StaffDashboard() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("");
  const [exams, setExams] = useState([]);
  const [editingExam, setEditingExam] = useState(null);
  const [showQFor, setShowQFor] = useState(null);
  const [resultsForExam, setResultsForExam] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    const snapshot = await getDocs(collection(db, "exams"));
    setExams(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { title, date, duration: +duration };

    if (editingExam) {
      await updateDoc(doc(db, "exams", editingExam.id), payload);
      setEditingExam(null);
    } else {
      await addDoc(collection(db, "exams"), payload);
    }

    setTitle("");
    setDate("");
    setDuration("");
    fetchExams();
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "exams", id));
    if (showQFor === id) setShowQFor(null);
    fetchExams();
  };

  const handleEdit = (exam) => {
    setEditingExam(exam);
    setTitle(exam.title);
    setDate(exam.date);
    setDuration(exam.duration);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const fetchResults = async (examId) => {
    const regSnap = await getDocs(collection(db, "registrations"));
    const filtered = regSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((reg) => reg.examId === examId);
    setRegistrations(filtered);
    setResultsForExam(examId);
  };

  return (
    <div className="staff-dashboard">
      <header className="dashboard-header">
        <h2>{editingExam ? "✏️ Edit Exam" : "📝 Create New Exam"}</h2>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <form className="exam-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Exam Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Duration (in minutes)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          required
        />
        <div className="form-actions">
          <button type="submit">
            {editingExam ? "Update Exam" : "Create Exam"}
          </button>
          {editingExam && (
            <button
              type="button"
              className="cancel-btn"
              onClick={() => {
                setEditingExam(null);
                setTitle("");
                setDate("");
                setDuration("");
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className="exam-list">
        <h3>📚 All Exams</h3>
        <ul>
          {exams.map((exam) => (
            <li key={exam.id} className="exam-card">
              <div className="exam-info">
                <strong>{exam.title}</strong> ({exam.date}) — {exam.duration}{" "}
                mins
              </div>
              <div className="exam-actions">
                <button onClick={() => handleEdit(exam)}>Edit</button>
                <button onClick={() => handleDelete(exam.id)}>Delete</button>
                <button
                  onClick={() =>
                    setShowQFor(showQFor === exam.id ? null : exam.id)
                  }
                >
                  {showQFor === exam.id ? "Hide Questions" : "Manage Questions"}
                </button>
                <button
                  onClick={() =>
                    resultsForExam === exam.id
                      ? setResultsForExam(null)
                      : fetchResults(exam.id)
                  }
                >
                  {resultsForExam === exam.id
                    ? "Hide Submissions"
                    : "View Submissions"}
                </button>
              </div>

              {showQFor === exam.id && (
                <div className="question-section">
                  <QuestionForm examId={exam.id} onQuestionAdded={fetchExams} />
                  <QuestionList examId={exam.id} />
                </div>
              )}

              {resultsForExam === exam.id && (
                <div className="results-section">
                  <h5>📊 Submissions</h5>
                  {registrations.length === 0 ? (
                    <p>No students have submitted yet.</p>
                  ) : (
                    <ul>
                      {registrations.map((reg) => (
                        <li key={reg.id}>
                          Student ID: <strong>{reg.studentId}</strong> — Score:{" "}
                          <strong>
                            {reg.score !== null ? reg.score : "Not graded yet"}
                          </strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
