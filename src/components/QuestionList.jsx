// src/components/QuestionList.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

export default function QuestionList({ examId }) {
  const [questions, setQuestions] = useState([]);

  const fetch = async () => {
    const snap = await getDocs(collection(db, `exams/${examId}/questions`));
    setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetch();
  }, [examId]);

  const remove = async (id) => {
    await deleteDoc(doc(db, `exams/${examId}/questions/${id}`));
    fetch();
  };

  return (
    <div style={{ marginTop: 12 }}>
      {questions.map((q) => (
        <div key={q.id} className="border p-2 mb-2">
          <strong>{q.question}</strong>
          <ul>
            {q.options.map((o, i) => (
              <li
                key={i}
                style={{ fontWeight: i === q.correctIndex ? "bold" : "normal" }}
              >
                {o}
              </li>
            ))}
          </ul>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => remove(q.id)}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
