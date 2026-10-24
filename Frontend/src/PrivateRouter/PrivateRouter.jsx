import { useContext, useState } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../PrivateRouter/AuthContext.jsx";
import api from "../api";
import { CalendarCheck } from "lucide-react";

const staffRoles = new Set(["chef", "server", "delivery", "delivery partner", "cashier", "manager", "cleaner", "employee", "trainee"]);

const AttendanceCheckInGate = ({ children }) => {
  const [attendanceMarked, setAttendanceMarked] = useState(
    () => sessionStorage.getItem("staff-attendance-marked") === "true"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleMarkAttendance = async () => {
    setSubmitting(true);
    setError("");
    try {
      const response = await api.post("/attendance/clock-in");
      const attendance = response.data?.data;
      if (!response.data?.success || !attendance) {
        throw new Error(response.data?.message || "Unable to mark attendance.");
      }

      sessionStorage.setItem("staff-attendance-marked", "true");
      window.dispatchEvent(new CustomEvent("attendance-updated", { detail: attendance }));
      setAttendanceMarked(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || "Unable to mark attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  if (attendanceMarked) return children;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-check-in-title"
        className="w-full max-w-md rounded-2xl bg-white p-7 text-center shadow-2xl"
      >
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
          <CalendarCheck size={28} />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Staff attendance</p>
        <h1 id="attendance-check-in-title" className="mt-2 text-2xl font-extrabold text-slate-900">
          Mark your attendance
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Check in to begin your shift. You can access the staff pages after your attendance is recorded.
        </p>
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleMarkAttendance}
          disabled={submitting}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
        >
          <CalendarCheck size={18} />
          {submitting ? "Recording attendance..." : "Check In & Continue"}
        </button>
      </section>
    </div>
  );
};

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

  const isStaff = staffRoles.has(userRole);
  return isStaff ? <AttendanceCheckInGate>{children}</AttendanceCheckInGate> : children;
};

export default PrivateRoute;