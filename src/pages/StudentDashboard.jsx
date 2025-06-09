// src/pages/StudentDashboard.jsx
import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, addDoc, doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "./StudentDashboard.css";

export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (currentUser) {
          const ref = doc(db, "users", currentUser.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            setStudentInfo(snap.data());
          }
        }

        const examSnap = await getDocs(collection(db, "exams"));
        const examsData = examSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setExams(examsData);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const startExam = async (examId) => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, "registrations"), {
        examId,
        studentId: auth.currentUser.uid,
        startedAt: new Date(),
        answers: [],
        score: null,
      });
      navigate(`/exam/${examId}`);
    } catch (err) {
      console.error("Error starting exam:", err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (loading) return <div className="status">Loading dashboard...</div>;
  if (!studentInfo) return <div className="status">No student data found.</div>;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>Welcome, {studentInfo.name || "Student"} 👋</h2>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <section className="dashboard-section">
        <h3>Your Courses</h3>
        <ul className="course-list">
          {studentInfo.courses?.map((course, i) => (
            <li className="course-item" key={i}>
              <div className="course-title">{course}</div>
              <div className="progress-bar-wrapper">
                <div
                  className="progress-fill"
                  style={{
                    width: `${studentInfo.progress?.[course] ?? 0}%`,
                  }}
                ></div>
              </div>
              <small>Progress: {studentInfo.progress?.[course] ?? 0}%</small>
            </li>
          ))}
        </ul>
      </section>

      <section className="dashboard-section">
        <h3>Available Exams</h3>
        {exams.length === 0 ? (
          <p className="empty">No exams available at this time.</p>
        ) : (
          <ul className="exam-list">
            {exams.map((exam) => (
              <li className="exam-item" key={exam.id}>
                <span>{exam.title}</span>
                <button
                  className="start-btn"
                  onClick={() => startExam(exam.id)}
                >
                  Start Exam
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
