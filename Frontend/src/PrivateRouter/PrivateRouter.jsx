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

  // Allow direct local admin access during development so the dashboard can be previewed at
  // the admin URL without a login session. Production still keeps the auth guard.
  if (!user && !import.meta.env.DEV) {
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