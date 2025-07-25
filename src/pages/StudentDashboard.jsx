import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "./StudentDashboard.css";

export default function StudentDashboard() {
  const { currentUser, logout } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const formatDate = (date) => {
    if (!date) return "";
    // If Firestore Timestamp, convert to JS Date
    if (typeof date.toDate === "function") {
      date = date.toDate();
    }
    const d = new Date(date);

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strTime = `${hours}:${minutes} ${ampm}`;

    return `${day}/${month}/${year} - ${strTime}`;
  };

  useEffect(() => {
    if (!currentUser) return;
    const loadExams = async () => {
      setLoading(true);
      const emailPrefix = currentUser.email.split("@")[0];

      try {
        // Get registrations allowed for this student
        const regSnap = await getDocs(
          query(
            collection(db, "registrations"),
            where("studentAppNo", "==", emailPrefix),
            where("allowed", "==", true)
          )
        );

        if (regSnap.empty) {
          setExams([]);
          setLoading(false);
          return;
        }

        const examData = [];

        for (const regDoc of regSnap.docs) {
          const reg = regDoc.data();
          const examId = reg.examId;
          const examDoc = await getDoc(doc(db, "exams", examId));
          if (!examDoc.exists()) continue;

          const exam = examDoc.data();

          const now = new Date();
          const startTime = exam.startTime.toDate
            ? exam.startTime.toDate()
            : new Date(exam.startTime);
          const endTime = exam.endTime.toDate
            ? exam.endTime.toDate()
            : new Date(exam.endTime);

          let status = "active";
          if (now < startTime) status = "not_started";
          else if (now > endTime && !reg.submittedAt) status = "expired";
          if (reg.submittedAt) status = "submitted";

          examData.push({
            id: examDoc.id,
            title: exam.title,
            startTime,
            endTime,
            duration: exam.duration,
            status,
            registrationId: regDoc.id,
            submitted: !!reg.submittedAt,
            submissionTime: reg.submittedAt,
          });
        }

        setExams(examData);
      } catch (e) {
        console.error("Error loading exams:", e);
        alert("Failed to load exams. Please contact support.");
      } finally {
        setLoading(false);
      }
    };

    loadExams();
  }, [currentUser]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Available Exams</h2>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {loading && <p className="status">Loading exams…</p>}

      {!loading && exams.length === 0 && (
        <p className="empty">No active exams available at this time.</p>
      )}

      <ul className="exam-list">
        {!loading &&
          exams.map((exam) => (
            <li key={exam.id} className="exam-item">
              <div>
                <div className="course-title">{exam.title}</div>
                <div>
                  Starts: {formatDate(exam.startTime)}
                  <br />
                  Ends: {formatDate(exam.endTime)}
                </div>
                {exam.status === "not_started" && (
                  <p style={{ color: "blue", marginTop: "0.5rem" }}>
                    Exam not started yet
                  </p>
                )}
                {exam.status === "expired" && (
                  <p style={{ color: "red", marginTop: "0.5rem" }}>
                    Time for this exam has expired
                  </p>
                )}
                {exam.status === "submitted" && (
                  <p style={{ color: "green", marginTop: "0.5rem" }}>
                    Exam submitted on{" "}
                    {exam.submissionTime
                      ? formatDate(exam.submissionTime)
                      : "N/A"}
                  </p>
                )}
              </div>
              <button
                className="start-btn"
                disabled={exam.status !== "active"}
                onClick={() => navigate(`/exam/${exam.id}`)}
              >
                {exam.status === "active" ? "Start Exam" : "Unavailable"}
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
