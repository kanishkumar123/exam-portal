import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "./StudentDashboard.css";

export default function StudentDashboard() {
  const { currentUser, logout } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadMyExams = async () => {
      setLoading(true);

      const emailPrefix = currentUser.email.split("@")[0];
      let allowedExamIds = [];

      try {
        // 1️⃣ Get registrations where this student is allowed
        const regSnap = await getDocs(
          query(
            collection(db, "registrations"),
            where("studentAppNo", "==", emailPrefix),
            where("allowed", "==", true)
          )
        );
        allowedExamIds = regSnap.docs.map((d) => d.data().examId);
      } catch (error) {
        console.error("Failed to load registrations:", error);
        alert("You do not have access to any exam. Contact support.");
        setLoading(false);
        return; // prevent continuation if registration fetch failed
      }

      try {
        // 2️⃣ Fetch only the exams matching allowed exam IDs
        const examSnap = await getDocs(collection(db, "exams"));
        setExams(
          examSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((e) => allowedExamIds.includes(e.id))
        );
      } catch (error) {
        console.error("Failed to load exams:", error);
        alert("Error fetching exam data.");
      }

      setLoading(false);
    };

    if (currentUser) loadMyExams();
  }, [currentUser]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (loading) return <div>Loading…</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Available Exams</h2>
      <button onClick={handleLogout}>Logout</button>

      {exams.length === 0 ? (
        <p>No exams assigned to you.</p>
      ) : (
        exams.map((exam) => (
          <div
            key={exam.id}
            style={{ border: "1px solid #ccc", padding: 10, margin: 10 }}
          >
            <h4>{exam.title}</h4>
            <button onClick={() => navigate(`/exam/${exam.id}`)}>
              Start Exam
            </button>
          </div>
        ))
      )}
    </div>
  );
}
