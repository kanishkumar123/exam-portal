// src/components/QuestionList.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

export default function QuestionList({ examId, onDeleted }) {
  const [questions, setQuestions] = useState([]);

  const fetchQuestions = async () => {
    const snap = await getDocs(collection(db, "exams", examId, "questions"));
    setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const handleDelete = async (qid) => {
    await deleteDoc(doc(db, "exams", examId, "questions", qid));
    fetchQuestions();
    if (onDeleted) onDeleted();
  };

  useEffect(() => {
    fetchQuestions();
  }, [examId]);

  if (!questions.length) return <p>No questions yet.</p>;

  return (
    <ul style={{ marginLeft: 20 }}>
      {questions.map((q, i) => (
        <li key={q.id}>
          <strong>Q{i + 1}:</strong> {q.question}{" "}
          <button onClick={() => handleDelete(q.id)} style={{ marginLeft: 8 }}>
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
