import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import "./ResultsPage.css"; // Import CSS file

export default function ResultsPage() {
  const { examId } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examName, setExamName] = useState("");

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    // Convert Firestore Timestamp to JS Date object if needed
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    // Format as dd/mm/yyyy hh:mm AM/PM
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // convert 0 to 12
    return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
  };

  useEffect(() => {
    // Fetch exam title
    const fetchExamName = async () => {
      try {
        const examDoc = await getDoc(doc(db, "exams", examId));
        if (examDoc.exists()) {
          setExamName(examDoc.data().title || "");
        }
      } catch (err) {
        console.error("Failed to fetch exam name:", err);
      }
    };

    // Fetch submissions for this exam
    const fetchSubmissions = async () => {
      try {
        const q = query(
          collection(db, "registrations"),
          where("examId", "==", examId)
        );
        const querySnapshot = await getDocs(q);
        const results = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSubmissions(results);
      } catch (err) {
        console.error("Failed to fetch submissions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchExamName();
    fetchSubmissions();
  }, [examId]);

  if (loading) return <p>Loading submissions...</p>;
  if (!submissions.length) return <p>No submissions found for this exam.</p>;

  return (
    <div className="container">
      <h2>Submissions for Exam: {examName || examId}</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Student Application Number</th>
            <th>Score</th>
            <th>Submitted At</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map(({ id, studentAppNo, score, submittedAt }) => (
            <tr key={id}>
              <td>{studentAppNo}</td>
              <td>{score != null ? score : "Not graded"}</td>
              <td>{submittedAt ? formatDate(submittedAt) : "Not submitted"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
