// src/pages/StudentDashboard.jsx
import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, query, where, addDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function StudentDashboard() {
  const { currentUser, userData } = useAuth();
  const [exams, setExams] = useState([]);
  const [regsByExam, setRegsByExam] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const now = new Date();

  // Convert Firestore Timestamp or plain to JS Date
  const toDate = (ts) =>
    ts?.seconds !== undefined ? new Date(ts.seconds * 1000) : new Date(ts);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      // fetch exams
      const examSnap = await getDocs(collection(db, "exams"));
      const examList = examSnap.docs.map((d) => {
        const { title, duration, startTime, endTime } = d.data();
        return {
          id: d.id,
          title,
          duration,
          startTime: toDate(startTime),
          endTime: toDate(endTime),
        };
      });
      setExams(examList);
      // fetch registrations
      const regSnap = await getDocs(
        query(
          collection(db, "registrations"),
          where("studentId", "==", currentUser.uid)
        )
      );
      const regs = {};
      regSnap.docs.forEach((d) => {
        regs[d.data().examId] = { id: d.id, ...d.data() };
      });
      setRegsByExam(regs);
      setLoading(false);
    };
    if (currentUser) fetchDashboard();
  }, [currentUser]);

  const startExam = async (exam) => {
    const startedAt = new Date();
    const ref = await addDoc(collection(db, "registrations"), {
      examId: exam.id,
      studentId: currentUser.uid,
      startedAt,
      answers: {},
      score: null,
      submittedAt: null,
    });
    setRegsByExam((r) => ({
      ...r,
      [exam.id]: {
        id: ref.id,
        examId: exam.id,
        studentId: currentUser.uid,
        startedAt,
      },
    }));
    navigate(`/exam/${exam.id}`);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (loading)
    return <div className="text-center py-5">Loading your dashboard...</div>;

  return (  
    <div>
      {/* Hero Banner */}
      <section
        className="bg-light text-dark py-5"
        style={{
          backgroundImage: "url(/banner.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="container text-center text-white">
          <h1 className="display-4 fw-bold">
            Welcome, {userData?.name || currentUser.email.split("@")[0]}
          </h1>
          <p className="lead">
            Dive into your exams and track your progress in real-time.
          </p>
          <button className="btn btn-danger btn-lg" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </section>

      {/* Exams Grid */}
      <div className="container my-5">
        <h2 className="mb-4 text-center">Your Exams</h2>
        <div className="row g-4">
          {exams.map((exam) => {
            const reg = regsByExam[exam.id];
            const windowOpen = new Date(
              exam.startTime.getTime() - 5 * 60 * 1000
            );
            const windowClose = exam.endTime;
            let status, color, action;

            // Determine status
            if (reg) {
              if (reg.submittedAt) {
                status = `Submitted at ${toDate(
                  reg.submittedAt
                ).toLocaleTimeString()}`;
                color = "success";
              } else {
                const expire = new Date(
                  toDate(reg.startedAt).getTime() + exam.duration * 60000
                );
                if (now > expire) {
                  status = "Time’s up";
                  color = "danger";
                } else {
                  status = `In progress til ${expire.toLocaleTimeString()}`;
                  color = "warning";
                  action = (
                    <button
                      className="btn btn-outline-warning me-2"
                      onClick={() => navigate(`/exam/${exam.id}`)}
                    >
                      Continue
                    </button>
                  );
                }
              }
            } else if (now < windowOpen) {
              status = `Opens ${exam.startTime.toLocaleTimeString()}`;
              color = "secondary";
            } else if (now > windowClose) {
              status = "Expired";
              color = "dark";
            } else {
              status = `Live til ${exam.endTime.toLocaleTimeString()}`;
              color = "info";
              action = (
                <button
                  className="btn btn-outline-success me-2"
                  onClick={() => startExam(exam)}
                >
                  Start Exam
                </button>
              );
            }

            return (
              <div key={exam.id} className="col-12 col-sm-6 col-lg-4">
                <div className="card h-100 border-0 shadow-lg">
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title fw-semibold">{exam.title}</h5>
                    <p className="text-muted mb-2">
                      {exam.startTime.toLocaleDateString()} &bull;{" "}
                      {exam.duration} mins
                    </p>
                    <div className="mb-3">
                      <div className="progress" style={{ height: "8px" }}>
                        <div
                          className="progress-bar bg-{color}"
                          role="progressbar"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                ((now - windowOpen) /
                                  (windowClose - windowOpen)) *
                                  100
                              )
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <span className={`badge bg-${color} mb-2`}>{status}</span>
                      <div>{action}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {exams.length === 0 && (
            <div className="col-12">
              <p className="text-center text-muted">No exams scheduled.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
