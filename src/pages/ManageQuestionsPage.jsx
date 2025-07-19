import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QuestionForm from "../components/QuestionForm";
import QuestionList from "../components/QuestionList";

export default function ManageQuestionsPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [reload, setReload] = useState(false);

  const refreshList = () => setReload(!reload);

  return (
    <div className="container py-3">
      <button
        className="btn btn-link mb-3"
        onClick={() => navigate("/staff/dashboard")}
      >
        ← Back to Dashboard
      </button>
      <h3>Manage Questions for Exam</h3>
      <QuestionForm examId={examId} onQuestionAdded={refreshList} />
      <QuestionList examId={examId} key={reload} />
    </div>
  );
}
