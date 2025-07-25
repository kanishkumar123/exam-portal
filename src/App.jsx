import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/StaffDashboard"; // using as AdminDashboard
import ExamPage from "./pages/ExamPage";
import ManageQuestionsPage from "./pages/ManageQuestionsPage";
import ResultsPage from "./pages/ResultsPage"; // if implemented

import RedirectByRole from "./components/RedirectByRole";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Landing route redirects based on role */}
        <Route path="/" element={<RedirectByRole />} />

        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected Student routes */}
        <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/exam/:examId" element={<ExamPage />} />
        </Route>

        {/* Protected Admin routes */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route
            path="/admin/exam/:examId/questions"
            element={<ManageQuestionsPage />}
          />
          <Route path="/admin/results/:examId" element={<ResultsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
