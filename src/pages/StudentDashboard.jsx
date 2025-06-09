// src/pages/StudentDashboard.jsx
import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, addDoc, doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch student data
        if (currentUser) {
          const ref = doc(db, "users", currentUser.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            setStudentInfo(snap.data());
          }
        }

        // Fetch exam list
        const examSnap = await getDocs(collection(db, "exams"));
        const examsData = examSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
    console.log("Start Exam clicked:", examId); // Add this
    const user = auth.currentUser;
    if (!user) {
      console.error("User not authenticated");
      return;
    }

    try {
      await addDoc(collection(db, "registrations"), {
        examId,
        studentId: user.uid,
        startedAt: new Date(),
        answers: [],
        score: null,
      });
      console.log("Exam started");
      navigate(`/exam/${examId}`); // ✅ Navigates to exam page
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

  if (loading)
    return <div className="text-center mt-5">Loading dashboard...</div>;
  if (!studentInfo)
    return <div className="text-center mt-5">No student data found.</div>;

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Welcome, {studentInfo.name || "Student"} 👋</h2>
        <button className="btn btn-danger" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="mb-4">
        <h4>Your Courses</h4>
        <ul className="list-group">
          {studentInfo.courses?.map((course, i) => (
            <li
              key={i}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              {course}
              <div className="w-100">
                <small>{course}</small>
                <div className="progress" style={{ height: "8px" }}>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{ width: `${studentInfo.progress?.[course] ?? 0}%` }}
                    aria-valuenow={studentInfo.progress?.[course] ?? 0}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>
                <small className="text-muted">
                  Progress: {studentInfo.progress?.[course] ?? 0}%
                </small>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4>Available Exams</h4>
        {exams.length === 0 ? (
          <p className="text-muted">No exams available at this time.</p>
        ) : (
          <ul className="list-group">
            {exams.map((exam) => (
              <li
                key={exam.id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                {exam.title}
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => startExam(exam.id)}
                >
                  Start Exam
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
