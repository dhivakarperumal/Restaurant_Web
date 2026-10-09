import React, { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  History,
  LogOut,
  Play,
  RotateCcw,
  Sparkles,
  Timer,
  UserCheck,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";
import { useAuth } from "../PrivateRouter/AuthContext";

export default function AttendanceWidget({ variant = "header", onAttendanceChange }) {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [liveSeconds, setLiveSeconds] = useState(0);

  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get("/attendance/today");
      if (res.data?.success) {
        setAttendance(res.data.data || null);
        if (res.data.data?.duration_seconds != null) {
          setLiveSeconds(Number(res.data.data.duration_seconds));
        }
        onAttendanceChange?.(res.data.data || null);
      }
    } catch (err) {
      // If error occurs, attendance remains null
      console.warn("Could not load attendance:", err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayAttendance();
    const handleUpdate = () => {
      fetchTodayAttendance();
    };
    window.addEventListener("attendance-updated", handleUpdate);
    return () => window.removeEventListener("attendance-updated", handleUpdate);
  }, []);

  // Live timer for active working shift
  useEffect(() => {
    if (!attendance?.check_in || attendance?.check_out) return;

    const interval = setInterval(() => {
      setLiveSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [attendance?.check_in, attendance?.check_out]);

  const formatDuration = (totalSecs) => {
    const secs = Math.max(0, Math.floor(Number(totalSecs) || 0));
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = secs % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const formatTimeStr = (isoString) => {
    if (!isoString) return "--:--";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "--:--";
    }
  };

  const handleClockIn = async () => {
    try {
      setActionLoading(true);
      const res = await api.post("/attendance/clock-in");
      if (res.data?.success) {
        setAttendance(res.data.data);
        if (res.data.data?.duration_seconds != null) {
          setLiveSeconds(Number(res.data.data.duration_seconds));
        } else {
          setLiveSeconds(0);
        }
        window.dispatchEvent(new CustomEvent("attendance-updated", { detail: res.data.data }));
        onAttendanceChange?.(res.data.data);
        toast.success("Clocked in successfully! Have a great shift.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to clock in.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!window.confirm("Are you sure you want to clock out for today?")) return;
    try {
      setActionLoading(true);
      const res = await api.post("/attendance/clock-out");
      if (res.data?.success) {
        setAttendance(res.data.data);
        window.dispatchEvent(new CustomEvent("attendance-updated", { detail: res.data.data }));
        onAttendanceChange?.(res.data.data);
        toast.success(
          `Clocked out successfully! Total worked: ${res.data.data?.total_hours || 0} hrs.`
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to clock out.");
    } finally {
      setActionLoading(false);
    }
  };

  const loadHistory = async () => {
    setShowHistoryModal(true);
    try {
      setHistoryLoading(true);
      const res = await api.get("/attendance/my-history?limit=30");
      if (res.data?.success) {
        setHistoryRecords(res.data.data || []);
      }
    } catch (err) {
      toast.error("Failed to load attendance history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const isWorking = Boolean(attendance?.check_in && !attendance?.check_out);
  const isCompleted = Boolean(attendance?.check_in && attendance?.check_out);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white/80 px-3 py-1.5 text-xs text-gray-500 shadow-sm animate-pulse">
        <Clock size={14} className="animate-spin text-gray-400" />
        <span>Loading attendance...</span>
      </div>
    );
  }

  // --- HEADER COMPACT VARIANT ---
  if (variant === "header") {
    return (
      <div className="flex items-center gap-2">
        {isWorking ? (
          <div className="flex items-center gap-2.5 rounded-full border border-emerald-300 bg-emerald-50/90 px-3 py-1 text-xs shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600"></span>
            </span>
            <div className="flex items-center gap-1.5 font-medium text-emerald-950">
              <span className="font-semibold text-emerald-800">
                In: {formatTimeStr(attendance.check_in)}
              </span>
              <span className="text-gray-300">|</span>
              <span className="tabular-nums font-mono font-bold text-emerald-700">
                {formatDuration(liveSeconds)}
              </span>
            </div>
            <button
              onClick={handleClockOut}
              disabled={actionLoading}
              title="Clock Out of your shift"
              className="ml-1 inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white transition hover:bg-rose-600 hover:shadow disabled:opacity-50"
            >
              <LogOut size={12} />
              Clock Out
            </button>
          </div>
        ) : isCompleted ? (
          <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-900 shadow-sm">
            <CheckCircle2 size={13} className="text-blue-600" />
            <span className="font-semibold">Shift Done</span>
            <span className="text-gray-300">|</span>
            <span className="font-bold text-blue-700">{attendance.total_hours} hrs</span>
            <button
              onClick={handleClockIn}
              disabled={actionLoading}
              title="Resume shift / Clock In again"
              className="ml-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-blue-700"
            >
              Resume
            </button>
          </div>
        ) : (
          <button
            onClick={handleClockIn}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-500 px-3.5 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
          >
            <Play size={12} />
            Clock In
          </button>
        )}

        {/* History Icon Button */}
        <button
          onClick={loadHistory}
          title="View my attendance history"
          className="grid h-8 w-8 place-items-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 hover:text-gray-900 shadow-sm"
        >
          <History size={14} />
        </button>

        {/* Attendance History Modal */}
        {showHistoryModal && renderHistoryModal()}
      </div>
    );
  }

  // --- DASHBOARD HERO VARIANT ---
  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-900 via-teal-900 to-[#10382f] p-5 text-white shadow-lg">
      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/10 backdrop-blur-md">
            <UserCheck size={26} className="text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">
                Today's Attendance
              </span>
              {attendance?.status && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                    attendance.status === "Late"
                      ? "bg-amber-400 text-amber-950"
                      : "bg-emerald-400 text-emerald-950"
                  }`}
                >
                  {attendance.status}
                </span>
              )}
            </div>
            <h3 className="mt-1 text-lg font-bold sm:text-xl">
              {isWorking
                ? "You are on duty"
                : isCompleted
                ? "Shift completed for today"
                : "Shift not yet started"}
            </h3>
            <p className="mt-0.5 text-xs text-emerald-200/80">
              {isWorking
                ? `Clocked in at ${formatTimeStr(attendance.check_in)}. Time logged automatically.`
                : isCompleted
                ? `Worked from ${formatTimeStr(attendance.check_in)} to ${formatTimeStr(
                    attendance.check_out
                  )} (${attendance.total_hours} hrs total).`
                : "Click below or log in during your scheduled shift to mark attendance."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isWorking && (
            <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md">
              <Timer size={18} className="text-emerald-300 animate-spin" />
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-200">
                  Active Duration
                </p>
                <p className="font-mono text-base font-extrabold text-white">
                  {formatDuration(liveSeconds)}
                </p>
              </div>
            </div>
          )}

          {isWorking ? (
            <button
              onClick={handleClockOut}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-rose-700 disabled:opacity-50"
            >
              <LogOut size={16} />
              Clock Out
            </button>
          ) : isCompleted ? (
            <button
              onClick={handleClockIn}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-600 disabled:opacity-50"
            >
              <RotateCcw size={16} />
              Resume Shift
            </button>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-600 disabled:opacity-50"
            >
              <Play size={16} />
              Clock In Now
            </button>
          )}

          <button
            onClick={loadHistory}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            <History size={14} />
            History
          </button>
        </div>
      </div>

      {showHistoryModal && renderHistoryModal()}
    </div>
  );

  function renderHistoryModal() {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white text-gray-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <Calendar size={18} className="text-emerald-600" />
              <div>
                <h3 className="font-bold text-gray-900">My Attendance History</h3>
                <p className="text-xs text-gray-500">Your recent attendance and working logs</p>
              </div>
            </div>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            >
              <X size={18} />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-6">
            {historyLoading ? (
              <div className="py-12 text-center text-gray-400">Loading your records...</div>
            ) : historyRecords.length === 0 ? (
              <div className="py-12 text-center text-gray-400">No attendance logs found yet.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Clock In</th>
                      <th className="px-4 py-3">Clock Out</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {historyRecords.map((rec) => {
                      const dateFormatted = new Date(rec.date).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });
                      return (
                        <tr key={rec.id || rec.attendance_id} className="hover:bg-gray-50/70">
                          <td className="px-4 py-3 font-semibold text-gray-800">{dateFormatted}</td>
                          <td className="px-4 py-3 text-emerald-700 font-medium">
                            {formatTimeStr(rec.check_in)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {rec.check_out ? (
                              formatTimeStr(rec.check_out)
                            ) : (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                Active Duty
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-gray-800">
                            {rec.total_hours ? `${rec.total_hours} hrs` : rec.duration_seconds ? formatDuration(rec.duration_seconds) : "--"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                                rec.status === "Late"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : rec.status === "Absent"
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {rec.status || "Present"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 text-right">
            <button
              onClick={() => setShowHistoryModal(false)}
              className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-black"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
}
