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
    <div style={{ padding: 20 }}>
      <h2>Available Exams</h2>
      <button onClick={handleLogout}>Logout</button>

      {loading && <p>Loading exams...</p>}

      {!loading && exams.length === 0 && (
        <p>No active exams available at this time.</p>
      )}

      {!loading &&
        exams.map((exam) => (
          <div
            key={exam.id}
            style={{ border: "1px solid #ccc", padding: 10, margin: 10 }}
          >
            <h4>{exam.title}</h4>
            <p>
              Starts: {exam.startTime.toLocaleString()}
              <br />
              Ends: {exam.endTime.toLocaleString()}
            </p>

            {exam.status === "not_started" && (
              <p style={{ color: "blue" }}>Exam not started yet</p>
            )}

            {exam.status === "expired" && (
              <p style={{ color: "red" }}>Time for this exam has expired</p>
            )}

            {exam.status === "submitted" && (
              <p style={{ color: "green" }}>
                Exam submitted on{" "}
                {exam.submissionTime
                  ? new Date(
                      exam.submissionTime.seconds * 1000
                    ).toLocaleString()
                  : "N/A"}
              </p>
            )}

            <button
              disabled={exam.status !== "active"}
              onClick={() => navigate(`/exam/${exam.id}`)}
            >
              {exam.status === "active" ? "Start Exam" : "Unavailable"}
            </button>
          </div>
        ))}
    </div>
  );
}
