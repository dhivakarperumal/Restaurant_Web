import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bike,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Filter,
  History,
  LogOut,
  Play,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  Timer,
  UserCheck,
  UtensilsCrossed,
  X,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";
import { useAuth } from "../PrivateRouter/AuthContext";

export default function StaffAttendancePage({
  role = "Staff",
  roleRoute = "/server",
}) {
  const { userProfile, user } = useAuth();
  const [attendance, setAttendance] = useState(null);
  const [shiftInfo, setShiftInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [liveSeconds, setLiveSeconds] = useState(0);

  // History state
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");

  // Delivery partner availability state
  const isDeliveryPartner =
    role === "Delivery Partner" ||
    userProfile?.role === "Delivery Partner" ||
    userProfile?.role === "delivery";
  const [isOnline, setIsOnline] = useState(false);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);

  // Clock out modal confirmation
  const [showClockOutModal, setShowClockOutModal] = useState(false);

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

  const formatShortDuration = (totalSecs) => {
    const secs = Math.max(0, Math.floor(Number(totalSecs) || 0));
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
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

  const formatShiftTime = (timeStr) => {
    if (!timeStr) return "--:--";
    try {
      const [h, m] = timeStr.split(":");
      const date = new Date();
      date.setHours(Number(h), Number(m), 0);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return timeStr;
    }
  };

  // Fetch today's attendance and shift info
  const fetchTodayData = async () => {
    try {
      const res = await api.get("/attendance/today");
      if (res.data?.success) {
        setAttendance(res.data.data || null);
        if (res.data.shift) {
          setShiftInfo(res.data.shift);
        } else if (res.data.employee) {
          setShiftInfo(res.data.employee);
        }
        if (res.data.data?.duration_seconds != null) {
          setLiveSeconds(Number(res.data.data.duration_seconds));
        }
      }
    } catch (err) {
      console.warn("Could not load today attendance:", err?.response?.data?.message || err.message);
    }
  };

  // Fetch full attendance history
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get("/attendance/my-history?limit=100");
      if (res.data?.success) {
        setHistoryRecords(res.data.data || []);
      }
    } catch (err) {
      console.warn("Failed to load attendance history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load delivery partner status if applicable
  const fetchDeliveryStatus = async () => {
    if (!isDeliveryPartner) return;
    try {
      const res = await api.get("/delivery-partner/dashboard");
      const d = res.data?.dashboard || res.data?.data || res.data || null;
      if (d) {
        setIsOnline(Boolean(d.is_online ?? d.isOnline));
      }
    } catch (ignore) {}
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([fetchTodayData(), fetchHistory(), fetchDeliveryStatus()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();

    const handleExternalUpdate = () => {
      fetchTodayData();
      fetchHistory();
      fetchDeliveryStatus();
    };

    window.addEventListener("attendance-updated", handleExternalUpdate);
    return () => window.removeEventListener("attendance-updated", handleExternalUpdate);
  }, []);

  // Live timer tick when shift is active
  useEffect(() => {
    if (!attendance?.check_in || attendance?.check_out) return;

    const interval = setInterval(() => {
      setLiveSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [attendance?.check_in, attendance?.check_out]);

  const isWorking = Boolean(attendance?.check_in && !attendance?.check_out);
  const isCompleted = Boolean(attendance?.check_in && attendance?.check_out);

  // Clock In
  const handleClockIn = async () => {
    try {
      setActionLoading(true);
      if (isDeliveryPartner) {
        // For delivery partner, going online automatically clocks in
        try {
          await api.patch("/delivery-partner/availability", { is_online: true });
          setIsOnline(true);
        } catch (ignore) {}
      }

      const res = await api.post("/attendance/clock-in");
      if (res.data?.success) {
        setAttendance(res.data.data);
        if (res.data.data?.duration_seconds != null) {
          setLiveSeconds(Number(res.data.data.duration_seconds));
        } else {
          setLiveSeconds(0);
        }
        window.dispatchEvent(new CustomEvent("attendance-updated", { detail: res.data.data }));
        toast.success("Clocked in successfully! Have a productive shift.");
        fetchHistory();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to clock in.");
    } finally {
      setActionLoading(false);
    }
  };

  // Clock Out
  const handleClockOut = async () => {
    setShowClockOutModal(false);
    try {
      setActionLoading(true);
      if (isDeliveryPartner) {
        try {
          await api.patch("/delivery-partner/availability", {
            is_online: false,
            clock_out: true,
          });
          setIsOnline(false);
        } catch (ignore) {}
      }

      const res = await api.post("/attendance/clock-out");
      if (res.data?.success) {
        setAttendance(res.data.data);
        window.dispatchEvent(new CustomEvent("attendance-updated", { detail: res.data.data }));
        toast.success(
          `Clocked out successfully! Total worked today: ${res.data.data?.total_hours || 0} hrs.`
        );
        fetchHistory();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to clock out.");
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle delivery online/offline
  const toggleDeliveryOnline = async (requestedOnline) => {
    if (availabilityBusy) return;
    setAvailabilityBusy(true);
    try {
      const response = await api.patch("/delivery-partner/availability", {
        is_online: requestedOnline,
      });
      const data = response.data?.data || response.data || {};
      setIsOnline(data.is_online ?? requestedOnline);
      if (data.attendance) {
        setAttendance(data.attendance);
      }
      window.dispatchEvent(new CustomEvent("attendance-updated", { detail: data.attendance }));
      toast.success(
        requestedOnline
          ? "You are now ONLINE and ready to receive deliveries!"
          : "You are now OFFLINE."
      );
      fetchTodayData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to toggle delivery status.");
    } finally {
      setAvailabilityBusy(false);
    }
  };

  // Export CSV of history
  const handleExportCSV = () => {
    if (!historyRecords.length) {
      toast.error("No attendance records to export.");
      return;
    }

    const headers = [
      "Date",
      "Shift Schedule",
      "Clock In",
      "Clock Out",
      "Duration (Hours)",
      "Status",
      "Notes",
    ];

    const rows = historyRecords.map((r) => [
      `"${r.date || ""}"`,
      `"${r.start_time ? `${r.start_time} to ${r.end_time || ""}` : "Regular"}"`,
      `"${r.check_in ? formatTimeStr(r.check_in) : "--"}"`,
      `"${r.check_out ? formatTimeStr(r.check_out) : r.check_in ? "Working" : "--"}"`,
      `"${r.total_hours || (r.duration_seconds ? (r.duration_seconds / 3600).toFixed(2) : "0")}"`,
      `"${r.status || "Present"}"`,
      `"${r.notes || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `my_attendance_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Monthly stats calculations
  const stats = useMemo(() => {
    const totalRecords = historyRecords.length;
    let totalSecs = 0;
    let lateCount = 0;
    let onTimeCount = 0;

    historyRecords.forEach((r) => {
      if (r.total_hours) {
        totalSecs += Number(r.total_hours) * 3600;
      } else if (r.duration_seconds) {
        totalSecs += Number(r.duration_seconds);
      }
      if (r.status === "Late") {
        lateCount += 1;
      } else {
        onTimeCount += 1;
      }
    });

    const totalHours = (totalSecs / 3600).toFixed(1);
    const avgHours = totalRecords > 0 ? (totalSecs / 3600 / totalRecords).toFixed(1) : "0.0";
    const onTimeRate = totalRecords > 0 ? Math.round((onTimeCount / totalRecords) * 100) : 100;

    return {
      totalDays: totalRecords,
      totalHours,
      avgHours,
      lateCount,
      onTimeRate,
    };
  }, [historyRecords]);

  // Filtered history records
  const filteredRecords = useMemo(() => {
    return historyRecords.filter((r) => {
      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const dateMatch = String(r.date || "").toLowerCase().includes(term);
        const notesMatch = String(r.notes || "").toLowerCase().includes(term);
        const statusMatch = String(r.status || "").toLowerCase().includes(term);
        if (!dateMatch && !notesMatch && !statusMatch) return false;
      }

      // Status
      if (statusFilter !== "All") {
        if (statusFilter === "Working" && (!r.check_in || r.check_out)) return false;
        if (statusFilter === "Completed" && (!r.check_in || !r.check_out)) return false;
        if (statusFilter === "Late" && r.status !== "Late") return false;
        if (statusFilter === "Present" && r.status === "Late") return false;
      }

      // Month
      if (monthFilter !== "All") {
        const recMonth = (r.date || "").slice(0, 7);
        const nowMonth = new Date().toISOString().slice(0, 7);
        if (monthFilter === "current" && recMonth !== nowMonth) return false;
        if (monthFilter === "previous") {
          const prev = new Date();
          prev.setMonth(prev.getMonth() - 1);
          const prevMonth = prev.toISOString().slice(0, 7);
          if (recMonth !== prevMonth) return false;
        }
      }

      return true;
    });
  }, [historyRecords, searchTerm, statusFilter, monthFilter]);

  const RoleIcon = isDeliveryPartner
    ? Bike
    : role === "Chef"
    ? UtensilsCrossed
    : UserCheck;

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6 text-[#162420]">
      {/* Header section */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
            <RoleIcon size={14} className="text-emerald-700" />
            <span>{role} Workspace</span>
            <span className="text-emerald-300">•</span>
            <span>Attendance & Shift Management</span>
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
            {role} Attendance & Shift Log
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Mark your daily duty check-in, track working hours, and view historical attendance records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={refreshAll}
            disabled={loading}
            title="Refresh Attendance"
            className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-emerald-600" : ""} />
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <Download size={14} />
            Export My History
          </button>
        </div>
      </header>

      {/* TODAY'S ATTENDANCE HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-[#10382f] via-[#16483c] to-[#0a231d] p-6 sm:p-7 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 -bottom-12 h-48 w-48 rounded-full bg-teal-400/10 blur-2xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left details */}
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md shadow-inner">
              <UserCheck size={32} className="text-emerald-300" />
              {isWorking && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-[#10382f]"></span>
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-300">
                  {todayFormatted}
                </span>
                <span className="text-white/40">•</span>
                {isWorking ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/25 border border-emerald-400/40 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-emerald-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Active on Duty
                  </span>
                ) : isCompleted ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-400/25 border border-blue-400/40 px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-blue-200">
                    <CheckCircle2 size={12} />
                    Shift Completed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/25 border border-amber-400/40 px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-amber-200">
                    <Clock size={12} />
                    Shift Not Started
                  </span>
                )}

                {attendance?.status && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      attendance.status === "Late"
                        ? "bg-amber-400 text-amber-950"
                        : "bg-emerald-400/20 text-emerald-200 border border-emerald-400/40"
                    }`}
                  >
                    {attendance.status}
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                {isWorking
                  ? "You are currently clocked in & on duty"
                  : isCompleted
                  ? "Your shift for today has been logged"
                  : "Ready to start your shift?"}
              </h2>

              <p className="text-xs sm:text-sm text-emerald-100/80 max-w-xl">
                {isWorking
                  ? `Clocked in at ${formatTimeStr(attendance.check_in)}. Working time is being automatically recorded.`
                  : isCompleted
                  ? `Clocked in at ${formatTimeStr(attendance.check_in)} and out at ${formatTimeStr(attendance.check_out)} (${attendance.total_hours} hrs total).`
                  : shiftInfo?.start_time
                  ? `Your scheduled shift is from ${formatShiftTime(shiftInfo.start_time)} to ${formatShiftTime(shiftInfo.end_time)}. Click Clock In to start duty.`
                  : "Click below to clock in for your shift and mark your attendance."}
              </p>

              {/* Shift info pill */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-emerald-200/90 font-medium">
                {shiftInfo?.start_time && (
                  <span className="rounded-lg bg-white/10 px-2.5 py-1 backdrop-blur-sm border border-white/10">
                    Shift: {formatShiftTime(shiftInfo.start_time)} – {formatShiftTime(shiftInfo.end_time)}
                  </span>
                )}
                {attendance?.check_in && (
                  <span className="rounded-lg bg-white/10 px-2.5 py-1 backdrop-blur-sm border border-white/10">
                    Clock In: <strong>{formatTimeStr(attendance.check_in)}</strong>
                  </span>
                )}
                {attendance?.check_out && (
                  <span className="rounded-lg bg-white/10 px-2.5 py-1 backdrop-blur-sm border border-white/10">
                    Clock Out: <strong>{formatTimeStr(attendance.check_out)}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Action & Timer Panel */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
            {/* Live Timer if on duty */}
            {isWorking && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-950/60 px-4 py-3 backdrop-blur-md shadow-inner">
                <Timer size={22} className="text-emerald-400 animate-spin" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    Duty Duration
                  </p>
                  <p className="font-mono text-xl font-extrabold text-white leading-tight">
                    {formatDuration(liveSeconds)}
                  </p>
                </div>
              </div>
            )}

            {/* Delivery Partner Online Toggle */}
            {isDeliveryPartner && (
              <button
                type="button"
                onClick={() => toggleDeliveryOnline(!isOnline)}
                disabled={availabilityBusy || actionLoading}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs sm:text-sm font-extrabold shadow-md transition disabled:opacity-50 ${
                  isOnline
                    ? "bg-amber-500 hover:bg-amber-600 text-amber-950"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {isOnline ? <Power size={16} /> : <Zap size={16} />}
                {availabilityBusy ? "Updating..." : isOnline ? "Go Offline" : "Go Online"}
              </button>
            )}

            {/* Primary Clock In / Clock Out Buttons */}
            {isWorking ? (
              <button
                type="button"
                onClick={() => setShowClockOutModal(true)}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-5 py-3 text-sm font-extrabold text-white shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                <LogOut size={16} />
                {actionLoading ? "Processing..." : "Clock Out"}
              </button>
            ) : isCompleted ? (
              <button
                type="button"
                onClick={handleClockIn}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                <RotateCcw size={16} />
                {actionLoading ? "Resuming..." : "Resume Shift"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClockIn}
                disabled={actionLoading}
                className="group relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_4px_20px_rgba(16,185,129,0.4)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_6px_25px_rgba(16,185,129,0.5)] active:scale-95 disabled:opacity-50"
              >
                <Play size={17} className="fill-current text-white" />
                {actionLoading ? "Clocking In..." : "Clock In Now"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            title: "Days Present",
            value: stats.totalDays,
            hint: "Total recorded shifts",
            icon: Calendar,
            bg: "bg-[#22c55e]",
          },
          {
            title: "Total Hours",
            value: `${stats.totalHours} hrs`,
            hint: "Logged on duty",
            icon: Clock,
            bg: "bg-[#3b82f6]",
          },
          {
            title: "Avg Shift",
            value: `${stats.avgHours} hrs`,
            hint: "Per logged shift",
            icon: Timer,
            bg: "bg-[#8b5cf6]",
          },
          {
            title: "On-Time Rate",
            value: `${stats.onTimeRate}%`,
            hint: "Punctuality score",
            icon: CheckCircle2,
            bg: "bg-[#10b981]",
          },
          {
            title: "Late Arrivals",
            value: stats.lateCount,
            hint: ">15m past scheduled shift",
            icon: AlertCircle,
            bg: Number(stats.lateCount) > 0 ? "bg-[#f59e0b]" : "bg-[#06b6d4]",
          },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <article
              key={stat.title}
              className={`relative min-w-0 overflow-hidden rounded-xl border border-transparent p-4 sm:p-5 shadow-[0_2px_10px_rgba(20,56,34,0.08)] flex flex-col justify-between min-h-[140px] ${stat.bg} text-white`}
            >
              <div className="flex items-start gap-3 relative z-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm bg-white/20">
                  <Icon size={24} strokeWidth={2.2} className="text-white" />
                </div>
                <div className="flex-1 mt-0.5 min-w-0">
                  <h3 className="text-[12px] font-semibold opacity-90 mb-1 truncate">{stat.title}</h3>
                  <div className="text-[24px] sm:text-[26px] font-extrabold leading-none tracking-tight truncate">
                    {stat.value}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-5 relative z-10">
                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold bg-white/25">
                  Live
                </span>
                <span className="text-[11px] font-medium opacity-75 truncate">{stat.hint}</span>
              </div>

              <div className="absolute right-0 bottom-0 w-24 h-16 pointer-events-none opacity-50">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                  <defs>
                    <linearGradient id={`staff-att-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#staff-att-grad-${index})`} />
                  <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                </svg>
              </div>
            </article>
          );
        })}
      </div>

      {/* ATTENDANCE HISTORY SECTION */}
      <section className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
              <CalendarCheck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">My Attendance History</h3>
              <p className="text-xs text-gray-500">
                Detailed timeline of your shifts, clock-in, and clock-out timestamps
              </p>
            </div>
          </div>

          <div className="text-xs font-semibold text-gray-500">
            Showing <strong className="text-gray-900">{filteredRecords.length}</strong> of{" "}
            {historyRecords.length} shifts
          </div>
        </div>

        {/* Filters and search bar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700">
              <Filter size={13} className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent font-semibold text-gray-900 outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Late">Late Arrivals</option>
                <option value="Working">Active Duty</option>
                <option value="Completed">Completed Shifts</option>
              </select>
            </div>

            {/* Month Filter */}
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-800 outline-none cursor-pointer"
            >
              <option value="All">All Months</option>
              <option value="current">Current Month</option>
              <option value="previous">Previous Month</option>
            </select>
          </div>

          {/* Search box */}
          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by date (YYYY-MM-DD) or note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#1f4e42] focus:bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50/90 text-[11px] font-bold uppercase tracking-wider text-gray-600">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-4 py-3.5">Scheduled Shift</th>
                <th className="px-4 py-3.5">Clock In</th>
                <th className="px-4 py-3.5">Clock Out</th>
                <th className="px-4 py-3.5">Total Duration</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historyLoading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={22} className="animate-spin text-emerald-600" />
                      <span>Loading attendance history...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={26} className="text-gray-300" />
                      <span className="font-semibold text-gray-600">
                        No attendance records match your criteria.
                      </span>
                      <span className="text-xs text-gray-400">
                        {historyRecords.length === 0
                          ? "Clock in today to create your first attendance record."
                          : "Try adjusting your search query or status filter."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const dateObj = new Date(r.date);
                  const formattedDate = dateObj.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  });
                  const isCurrentDay =
                    r.date && new Date().toISOString().slice(0, 10) === String(r.date).slice(0, 10);
                  const isRecordWorking = Boolean(r.check_in && !r.check_out);

                  return (
                    <tr
                      key={r.id || r.attendance_id || `${r.date}-${r.check_in}`}
                      className="transition hover:bg-gray-50/80"
                    >
                      {/* Date */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{formattedDate}</span>
                          {isCurrentDay && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-extrabold text-emerald-800">
                              Today
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Scheduled Shift */}
                      <td className="px-4 py-3.5 text-gray-600 font-mono text-[11px]">
                        {r.start_time ? (
                          `${formatShiftTime(r.start_time)} - ${formatShiftTime(r.end_time)}`
                        ) : (
                          <span className="text-gray-400 font-sans">Regular</span>
                        )}
                      </td>

                      {/* Clock In */}
                      <td className="px-4 py-3.5">
                        {r.check_in ? (
                          <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                            <span>{formatTimeStr(r.check_in)}</span>
                            {r.status === "Late" && (
                              <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-extrabold text-amber-900">
                                Late
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">--:--</span>
                        )}
                      </td>

                      {/* Clock Out */}
                      <td className="px-4 py-3.5">
                        {r.check_out ? (
                          <span className="font-semibold text-gray-800">
                            {formatTimeStr(r.check_out)}
                          </span>
                        ) : isRecordWorking ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                            On Duty
                          </span>
                        ) : (
                          <span className="text-gray-400">--:--</span>
                        )}
                      </td>

                      {/* Total Duration */}
                      <td className="px-4 py-3.5 font-mono font-bold text-gray-800">
                        {r.total_hours
                          ? `${r.total_hours} hrs`
                          : r.duration_seconds
                          ? formatShortDuration(r.duration_seconds)
                          : isRecordWorking
                          ? formatShortDuration(liveSeconds)
                          : "--"}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                            r.status === "Late"
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : r.status === "Absent"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : isRecordWorking
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {isRecordWorking ? "Active Duty" : r.status || "Present"}
                        </span>
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3.5 text-gray-500 max-w-[160px] truncate">
                        {r.notes || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* CLOCK OUT CONFIRMATION MODAL */}
      {showClockOutModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600">
                  <LogOut size={18} />
                </div>
                <h3 className="text-base font-bold text-gray-900">Clock Out of Shift</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClockOutModal(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3 text-sm text-gray-600">
              <p>
                Are you sure you want to clock out and end your working shift for today?
              </p>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Clock In Time:</span>
                  <span className="font-semibold text-gray-900">{formatTimeStr(attendance?.check_in)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration Worked:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatDuration(liveSeconds)}
                  </span>
                </div>
                {isDeliveryPartner && (
                  <p className="mt-2 text-[11px] text-amber-700">
                    Note: Ending your shift will also set your delivery availability to Offline.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setShowClockOutModal(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClockOut}
                disabled={actionLoading}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {actionLoading ? "Clocking Out..." : "Yes, Clock Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
