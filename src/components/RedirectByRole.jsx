// src/components/RedirectByRole.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RedirectByRole() {
  const { userData, loading } = useAuth();

  // Wait until user data is loaded
  if (loading) return <div>Loading...</div>;

  // If user is not authenticated
  if (!userData || !userData.role) return <Navigate to="/login" replace />;

  // Role-based redirection
  switch (userData.role) {
    case "student":
      return <Navigate to="/student" replace />;
    case "admin":
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}
