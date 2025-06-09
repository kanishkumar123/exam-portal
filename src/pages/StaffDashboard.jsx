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
import QuestionForm from "../components/QuestionForm";
import QuestionList from "../components/QuestionList";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

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

  // Fetch exams
  const fetchExams = async () => {
    const snap = await getDocs(collection(db, "exams"));
    setExams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // Create or update exam
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

  // Delete exam
  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "exams", id));
    if (showQFor === id) setShowQFor(null);
    fetchExams();
  };

  // Edit exam
  const handleEdit = (exam) => {
    setEditingExam(exam);
    setTitle(exam.title);
    setDate(exam.date);
    setDuration(exam.duration);
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Fetch registrations for an exam
  const fetchResults = async (examId) => {
    const regSnap = await getDocs(collection(db, "registrations"));
    const filtered = regSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((r) => r.examId === examId);
    setRegistrations(filtered);
    setResultsForExam(examId);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📝 {editingExam ? "Edit Exam" : "Create New Exam"}</h2>
      <button className="btn btn-danger" onClick={handleLogout}>
        Logout
      </button>

      <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Title"
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
          placeholder="Duration (mins)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          required
        />
        <button type="submit">
          {editingExam ? "Update Exam" : "Create Exam"}
        </button>
        {editingExam && (
          <button
            type="button"
            onClick={() => {
              setEditingExam(null);
              setTitle("");
              setDate("");
              setDuration("");
            }}
            style={{ marginLeft: 8 }}
          >
            Cancel
          </button>
        )}
      </form>

      <h3>📚 All Exams</h3>
      <ul>
        {exams.map((exam) => (
          <li key={exam.id} style={{ marginBottom: 12 }}>
            <strong>{exam.title}</strong> ({exam.date}) — {exam.duration} mins
            <button onClick={() => handleEdit(exam)} style={{ marginLeft: 8 }}>
              Edit
            </button>
            <button
              onClick={() => handleDelete(exam.id)}
              style={{ marginLeft: 8 }}
            >
              Delete
            </button>
            <button
              onClick={() => setShowQFor(showQFor === exam.id ? null : exam.id)}
              style={{ marginLeft: 8 }}
            >
              {showQFor === exam.id ? "Hide Questions" : "Manage Questions"}
            </button>
            <button
              onClick={() =>
                resultsForExam === exam.id
                  ? setResultsForExam(null)
                  : fetchResults(exam.id)
              }
              style={{ marginLeft: 8 }}
            >
              {resultsForExam === exam.id
                ? "Hide Submissions"
                : "View Submissions"}
            </button>
            {/* Questions UI */}
            {showQFor === exam.id && (
              <div style={{ marginTop: 8 }}>
                <QuestionForm examId={exam.id} onQuestionAdded={() => {}} />
                <QuestionList examId={exam.id} />
              </div>
            )}
            {/* Submissions UI */}
            {resultsForExam === exam.id && (
              <div style={{ marginTop: 12, marginLeft: 20 }}>
                <h5>📊 Submissions:</h5>
                {registrations.length === 0 ? (
                  <p>No students have submitted this exam yet.</p>
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
    </div>
  );
}
