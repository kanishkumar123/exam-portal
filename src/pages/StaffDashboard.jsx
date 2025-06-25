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
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [duration, setDuration] = useState(0);
  const [exams, setExams] = useState([]);
  const [editingExam, setEditingExam] = useState(null);
  const [showQFor, setShowQFor] = useState(null);
  const [resultsForExam, setResultsForExam] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const navigate = useNavigate();

  // Helper to format Firestore Timestamp or JS Date or ISO string
  const formatDateTime = (ts) => {
    if (!ts) return "";
    if (ts.seconds !== undefined) {
      return new Date(ts.seconds * 1000).toLocaleString();
    }
    // If it's a JS Date object or ISO string
    const dateObj = ts instanceof Date ? ts : new Date(ts);
    return dateObj.toLocaleString();
  };

  // Fetch exams
  const fetchExams = async () => {
    const snap = await getDocs(collection(db, "exams"));
    setExams(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // Create or update exam with schedule
  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      title,
      startTime: new Date(startDateTime),
      endTime: new Date(endDateTime),
      duration: Number(duration),
      createdBy: auth.currentUser.uid,
    };
    if (editingExam) {
      await updateDoc(doc(db, "exams", editingExam.id), payload);
      setEditingExam(null);
    } else {
      await addDoc(collection(db, "exams"), payload);
    }
    setTitle("");
    setStartDateTime("");
    setEndDateTime("");
    setDuration(0);
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
    const toLocal = (ts) => {
      if (!ts) return "";
      const dateObj =
        ts.seconds !== undefined ? new Date(ts.seconds * 1000) : new Date(ts);
      return dateObj.toISOString().slice(0, 16);
    };
    setTitle(exam.title);
    setStartDateTime(toLocal(exam.startTime));
    setEndDateTime(toLocal(exam.endTime));
    setDuration(exam.duration);
  };

  // Logout
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  // Fetch registrations for an exam
  const fetchResults = async (examId) => {
    const regSnap = await getDocs(collection(db, "registrations"));
    const filtered = regSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((r) => r.examId === examId);
    setRegistrations(filtered);
    setResultsForExam(examId);
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>📝 {editingExam ? "Edit Exam" : "Create New Exam"}</h2>
        <button className="btn btn-danger" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="mb-2">
          <input
            className="form-control"
            type="text"
            placeholder="Exam Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="mb-2">
          <label>Start Date & Time:</label>
          <input
            className="form-control"
            type="datetime-local"
            value={startDateTime}
            onChange={(e) => setStartDateTime(e.target.value)}
            required
          />
        </div>
        <div className="mb-2">
          <label>End Date & Time:</label>
          <input
            className="form-control"
            type="datetime-local"
            value={endDateTime}
            onChange={(e) => setEndDateTime(e.target.value)}
            required
          />
        </div>
        <div className="mb-2">
          <input
            className="form-control"
            type="number"
            placeholder="Duration (mins)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-primary me-2" type="submit">
          {editingExam ? "Update Exam" : "Create Exam"}
        </button>
        {editingExam && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setEditingExam(null);
              setTitle("");
              setStartDateTime("");
              setEndDateTime("");
              setDuration(0);
            }}
          >
            Cancel
          </button>
        )}
      </form>

      <h3>📚 All Exams</h3>
      {exams.length === 0 ? (
        <p>No exams scheduled.</p>
      ) : (
        <ul className="list-group">
          {exams.map((exam) => (
            <li key={exam.id} className="list-group-item mb-3">
              <div className="d-flex justify-content-between">
                <div>
                  <strong>{exam.title}</strong>
                  <div>Starts: {formatDateTime(exam.startTime)}</div>
                  <div>Ends: {formatDateTime(exam.endTime)}</div>
                  <div>Duration: {exam.duration} mins</div>
                </div>
                <div className="btn-group">
                  <button
                    onClick={() => handleEdit(exam)}
                    className="btn btn-sm btn-outline-primary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(exam.id)}
                    className="btn btn-sm btn-outline-danger"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() =>
                      setShowQFor(showQFor === exam.id ? null : exam.id)
                    }
                    className="btn btn-sm btn-outline-secondary"
                  >
                    {showQFor === exam.id ? "Hide Qs" : "Manage Qs"}
                  </button>
                  <button
                    onClick={() => fetchResults(exam.id)}
                    className="btn btn-sm btn-outline-info"
                  >
                    View Submissions
                  </button>
                </div>
              </div>
              {showQFor === exam.id && (
                <div className="mt-3">
                  <QuestionForm examId={exam.id} onQuestionAdded={fetchExams} />
                  <QuestionList examId={exam.id} />
                </div>
              )}
              {resultsForExam === exam.id && (
                <div className="mt-3 ps-3">
                  <h5>Submissions:</h5>
                  {registrations.length === 0 ? (
                    <p>No submissions yet.</p>
                  ) : (
                    <ul>
                      {registrations.map((reg) => (
                        <li key={reg.id} className="mb-2">
                          <div>
                            <strong>Student:</strong> {reg.studentId}
                          </div>
                          <div>
                            <strong>Started:</strong>{" "}
                            {formatDateTime(reg.startedAt)}
                          </div>
                          <div>
                            <strong>Submitted:</strong>{" "}
                            {reg.submittedAt
                              ? formatDateTime(reg.submittedAt)
                              : "In progress"}
                          </div>
                          <div>
                            <strong>Score:</strong>{" "}
                            {reg.score !== null ? reg.score : "Not graded"}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
