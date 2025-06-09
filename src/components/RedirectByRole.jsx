import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RedirectByRole() {
  const { userData, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!userData) return <Navigate to="/login" />;

  switch (userData.role) {
    case "student":
      return <Navigate to="/student" />;
    case "staff":
      return <Navigate to="/staff" />;
    case "admin":
      return <Navigate to="/admin" />;
    default:
      return <Navigate to="/login" />;
  }
}
