import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute = ({ allowedRoles }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!currentUser || !allowedRoles.includes(userData?.role)) {
    return <Navigate to="/login" />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
