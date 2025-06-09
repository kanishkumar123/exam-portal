import React, { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

export default function QuestionForm({ examId, onQuestionAdded }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  const handleOptionChange = (value, index) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "exams", examId, "questions"), {
      question,
      options,
      correctIndex,
    });
    setQuestion("");
    setOptions(["", "", "", ""]);
    setCorrectIndex(0);
    if (onQuestionAdded) onQuestionAdded();
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 10 }}>
      <input
        type="text"
        placeholder="Question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        required
      />
      {options.map((opt, idx) => (
        <input
          key={idx}
          type="text"
          placeholder={`Option ${idx + 1}`}
          value={opt}
          onChange={(e) => handleOptionChange(e.target.value, idx)}
          required
        />
      ))}
      <select
        value={correctIndex}
        onChange={(e) => setCorrectIndex(parseInt(e.target.value))}
      >
        <option value={0}>Option 1 is correct</option>
        <option value={1}>Option 2 is correct</option>
        <option value={2}>Option 3 is correct</option>
        <option value={3}>Option 4 is correct</option>
      </select>
      <button type="submit">Add Question</button>
    </form>
  );
}
