import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import "./Exampage.css";

export default function ExamPage() {
  const { examId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);

  // New states for submission tracking
  const [submitted, setSubmitted] = useState(false);
  const [submissionBlocked, setSubmissionBlocked] = useState(false);

  const navigate = useNavigate();

  // Fetch exam data, questions, and registration status
  useEffect(() => {
    const fetchExamData = async () => {
      try {
        // Get exam metadata including duration
        const examDoc = await getDoc(doc(db, "exams", examId));
        if (!examDoc.exists()) {
          alert("Exam not found!");
          navigate("/student");
          return;
        }

        const data = examDoc.data();
        setTimeLeft(data.duration * 60); // minutes to seconds

        // Get questions
        const qSnap = await getDocs(
          collection(db, `exams/${examId}/questions`)
        );
        const qList = qSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setQuestions(qList);

        // Fetch registration to check submission
        const user = auth.currentUser;
        if (!user) throw new Error("No logged in user");

        // First try by studentId (UID)
        const regSnapByID = await getDocs(
          query(
            collection(db, "registrations"),
            where("examId", "==", examId),
            where("studentId", "==", user.uid)
          )
        );

        let regDoc = null;
        if (!regSnapByID.empty) {
          regDoc = regSnapByID.docs[0];
        } else {
          // Fallback by studentAppNo
          const emailPrefix = user.email.split("@")[0];
          const regSnapByApp = await getDocs(
            query(
              collection(db, "registrations"),
              where("examId", "==", examId),
              where("studentAppNo", "==", emailPrefix)
            )
          );
          if (!regSnapByApp.empty) {
            regDoc = regSnapByApp.docs[0];
          }
        }

        if (!regDoc) {
          alert("You are not registered for this exam.");
          navigate("/student");
          return;
        }

        // Check if already submitted
        if (regDoc.data().submittedAt) {
          setSubmitted(true);
          setSubmissionBlocked(true);
        }

        // Check if exam time expired
        const now = new Date();
        const examEndTime = data.endTime.toDate
          ? data.endTime.toDate()
          : new Date(data.endTime);

        if (now > examEndTime && !regDoc.data().submittedAt) {
          setSubmissionBlocked(true);
          alert("Time for this exam has expired. You cannot submit.");
        }
      } catch (error) {
        console.error("Error fetching exam data or registration:", error);
        alert("Error loading exam data.");
        navigate("/student");
      } finally {
        setLoading(false);
      }
    };

    fetchExamData();
  }, [examId, navigate]);

  // Timer countdown logic
  useEffect(() => {
    if (timeLeft <= 0) {
      // Auto-submit if not already submitted and not blocked
      if (!loading && !submitted && !submissionBlocked) {
        handleSubmit();
      }
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, loading, submitted, submissionBlocked]);

  const handleOptionChange = (questionId, selectedIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedIndex }));
  };

  const handleSubmit = async () => {
    if (submitted || submissionBlocked) {
      alert("You have already submitted this exam or submission is blocked.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert("No logged in user");
      return;
    }

    try {
      console.log("Submitting exam for user:", user.uid);
      console.log("Answers:", answers);

      // Calculate score
      let score = 0;
      questions.forEach((q) => {
        const selectedIndex = answers[q.id];
        if (Number(selectedIndex) === Number(q.correctIndex)) {
          score++;
        }
      });

      let regDoc = null;

      // First try studentId
      const regSnapByID = await getDocs(
        query(
          collection(db, "registrations"),
          where("examId", "==", examId),
          where("studentId", "==", user.uid)
        )
      );
      if (!regSnapByID.empty) {
        regDoc = regSnapByID.docs[0];
      } else {
        // Fallback by app number
        const emailPrefix = user.email.split("@")[0];
        const regSnapByApp = await getDocs(
          query(
            collection(db, "registrations"),
            where("examId", "==", examId),
            where("studentAppNo", "==", emailPrefix)
          )
        );
        if (!regSnapByApp.empty) {
          regDoc = regSnapByApp.docs[0];
        }
      }

      if (!regDoc) {
        alert("Registration not found.");
        return;
      }

      if (regDoc.data().submittedAt) {
        setSubmitted(true);
        alert("You have already submitted this exam.");
        return;
      }

      // Update registration with answers, score and submission time
      await updateDoc(doc(db, "registrations", regDoc.id), {
        answers,
        score,
        submittedAt: new Date(),
      });

      setSubmitted(true);
      alert("Exam submitted successfully!");
      navigate("/student");
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Error submitting exam: " + err.message);
    }
  };

  if (loading) return <p>Loading questions...</p>;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Exam</h2>
        <h4 className="text-danger">Time Left: {formatTime(timeLeft)}</h4>
      </div>

      {submitted && (
        <div
          style={{
            backgroundColor: "#d4edda",
            padding: "10px",
            marginBottom: "15px",
            borderRadius: "5px",
            color: "#155724",
          }}
        >
          You have already submitted this exam. Thank you!
        </div>
      )}

      {questions.map((q, index) => (
        <div key={q.id} className="mb-4">
          <h5>
            {index + 1}. {q.question}
          </h5>
          {q.options.map((opt, i) => (
            <div key={i}>
              <label>
                <input
                  type="radio"
                  name={q.id}
                  value={i}
                  checked={answers[q.id] === i}
                  onChange={() => handleOptionChange(q.id, i)}
                  disabled={submitted || submissionBlocked}
                />{" "}
                {opt}
              </label>
            </div>
          ))}
        </div>
      ))}

      <button
        className="btn btn-primary mt-3"
        onClick={handleSubmit}
        disabled={submitted || submissionBlocked}
      >
        Submit Exam
      </button>
    </div>
  );
}
