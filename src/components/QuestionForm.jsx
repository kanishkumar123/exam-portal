// src/components/QuestionForm.jsx
import React, { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

export default function QuestionForm({ examId, onQuestionAdded }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, `exams/${examId}/questions`), {
      question,
      options,
      correctIndex,
      createdAt: new Date(),
    });
    setQuestion("");
    setOptions(["", "", "", ""]);
    setCorrectIndex(0);
    onQuestionAdded();
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
      <div>
        <input
          className="form-control mb-2"
          placeholder="Question text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
        />
      </div>
      {options.map((opt, i) => (
        <div key={i} className="input-group mb-2">
          <span className="input-group-text">
            <input
              type="radio"
              name="correct"
              checked={correctIndex === i}
              onChange={() => setCorrectIndex(i)}
            />
          </span>
          <input
            className="form-control"
            placeholder={`Option ${i + 1}`}
            value={opt}
            onChange={(e) =>
              setOptions((opts) => {
                const copy = [...opts];
                copy[i] = e.target.value;
                return copy;
              })
            }
            required
          />
        </div>
      ))}
      <button className="btn btn-sm btn-primary">Add Question</button>
    </form>
  );
}
