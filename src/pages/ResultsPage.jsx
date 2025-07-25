import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function ResultsPage() {
  const { examId } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        // Assume 'registrations' contains student submissions with examId
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

    fetchSubmissions();
  }, [examId]);

  if (loading) return <p>Loading submissions...</p>;
  if (!submissions.length) return <p>No submissions found for this exam.</p>;

  return (
    <div>
      <h2>Submissions for Exam {examId}</h2>
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
              <td>
                {submittedAt
                  ? new Date(submittedAt.seconds * 1000).toLocaleString()
                  : "Not submitted"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
