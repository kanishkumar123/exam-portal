// src/pages/ExamPage.jsx
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

export default function ExamPage() {
  const { examId } = useParams();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        // Get exam metadata including duration
        const examDoc = await getDoc(doc(db, "exams", examId));
        if (examDoc.exists()) {
          const data = examDoc.data();

          setTimeLeft(data.duration * 60); // convert minutes to seconds
        }

        // Get questions
        const qSnap = await getDocs(
          collection(db, `exams/${examId}/questions`)
        );
        const qList = qSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setQuestions(qList);
      } catch (error) {
        console.error("Error fetching exam/questions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExamData();
  }, [examId]);

  // Timer countdown logic
  useEffect(() => {
    if (timeLeft <= 0) {
      if (!loading) {
        handleSubmit(); // Auto-submit on timeout
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, loading]);

  const handleOptionChange = (questionId, selectedIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selectedIndex }));
  };

  const handleSubmit = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Calculate score
      let score = 0;
      questions.forEach((q) => {
        const selectedIndex = answers[q.id];
        if (Number(selectedIndex) === Number(q.correctIndex)) {
          score++;
        }
      });

      // Find the student's registration doc
      const regSnap = await getDocs(
        query(
          collection(db, "registrations"),
          where("examId", "==", examId),
          where("studentId", "==", user.uid)
        )
      );
      const regDoc = regSnap.docs[0];
      if (!regDoc) throw new Error("Registration not found");

      // Update registration with answers and score
      await updateDoc(doc(db, "registrations", regDoc.id), {
        answers,
        score,
        submittedAt: new Date(),
      });

      alert("Exam submitted successfully!");
      navigate("/student");
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Error submitting exam");
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
                />{" "}
                {opt}
              </label>
            </div>
          ))}
        </div>
      ))}

      <button className="btn btn-primary mt-3" onClick={handleSubmit}>
        Submit Exam
      </button>
    </div>
  );
}
