import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../PrivateRouter/AuthContext.jsx";

const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const auth = useContext(AuthContext);
  const user = auth?.user || null;
  const loading = auth?.loading || false;

  if (loading) {
    return <div className="p-6 text-center text-slate-600">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const userRole = (user?.role || "admin").toString().trim().toLowerCase();

  // Role check
  if (
    allowedRoles.length &&
    !allowedRoles.some((role) => role.toString().trim().toLowerCase() === userRole)
  ) {
    return (
      <div className="p-6 text-center text-red-600">
        You are not authorized to view this page
      </div>
    );
  }

  return children;
};

export default PrivateRoute;