import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bike,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  LayoutGrid,
  LogOut,
  Play,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  Table2,
  Timer,
  UserCheck,
  X,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";
import { useAuth } from "../PrivateRouter/AuthContext";

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
const fmtDuration = (totalSecs) => {
  const s  = Math.max(0, Math.floor(Number(totalSecs) || 0));
  const h  = Math.floor(s / 3600);
  const m  = Math.floor((s % 3600) / 60);
  const sc = s % 60;
  return h > 0 ? `${h}h ${m}m ${sc}s` : `${m}m ${sc}s`;
};
const fmtShort = (totalSecs) => {
  const s = Math.max(0, Math.floor(Number(totalSecs) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};
const fmtTime = (iso) => {
  if (!iso) return "--:--";
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return "--:--"; }
};
const fmtShiftTime = (t) => {
  if (!t) return "--:--";
  try { const [h, m] = t.split(":"); const d = new Date(); d.setHours(+h, +m, 0); return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return t; }
};

const PAGE_SIZE = 8;

/* ─── Coloured stat card — identical to admin/products/categories style ─── */
const StatCard = ({ title, value, inc, icon, bg, cardLoading }) => (
  <article className={`relative min-w-0 overflow-hidden rounded-xl border border-transparent p-4 sm:p-5 shadow-[0_2px_10px_rgba(20,56,34,0.04)] flex flex-col justify-between min-h-[140px] ${bg} text-white`}>
    <div className="flex items-start gap-3 relative z-10">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/20 shadow-sm">
        {React.cloneElement(icon, { size: 24, strokeWidth: 2.2, className: "text-white" })}
      </div>
      <div className="flex-1 mt-0.5 min-w-0">
        <h3 className="text-[12px] font-semibold opacity-90 mb-1 truncate">{title}</h3>
        {cardLoading
          ? <div className="mt-1 h-7 w-20 animate-pulse rounded-lg bg-white/30" />
          : <div className="text-[22px] sm:text-[25px] font-extrabold leading-none tracking-tight truncate">{value}</div>}
      </div>
    </div>
    <div className="flex items-center gap-2 mt-5 relative z-10">
      <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold bg-white/25">↑ {inc}</span>
      <span className="text-[11px] font-medium opacity-75 truncate">from last month</span>
    </div>
    <div className="absolute right-0 bottom-0 w-24 h-16 pointer-events-none opacity-50">
      <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
        <defs>
          <linearGradient id={`attgrad-${title.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#attgrad-${title.replace(/\s+/g,"")})`} />
        <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
      </svg>
    </div>
  </article>
);

/* ─── Numbered pagination — identical to admin/products/categories style ─── */
const Pagination = ({ page, pageCount, setPage, total }) => (
  <div className="mt-4 flex items-center justify-between text-[12px] text-[#666]">
    <span>Showing {total === 0 ? 0 : Math.min((page-1)*PAGE_SIZE+1, total)}–{Math.min(page*PAGE_SIZE, total)} of {total} records</span>
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page <= 1} aria-label="Previous page"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7e0d8] bg-white text-[#666] disabled:cursor-not-allowed disabled:opacity-40">
        <ChevronLeft size={15} />
      </button>
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
        <button key={p} type="button" onClick={() => setPage(p)} aria-current={page === p ? "page" : undefined} aria-label={`Page ${p}`}
          className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 ${page === p ? "bg-[#FF5A00] text-white" : "border border-[#e7e0d8] bg-white text-[#666] hover:border-orange-200 hover:text-[#FF5A00]"}`}>
          {p}
        </button>
      ))}
      <button type="button" onClick={() => setPage((p) => Math.min(pageCount, p+1))} disabled={page >= pageCount} aria-label="Next page"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7e0d8] bg-white text-[#666] disabled:cursor-not-allowed disabled:opacity-40">
        <ChevronRight size={15} />
      </button>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function DeliveryAttendancePage() {
  const { userProfile } = useAuth();

  /* ─── today + shift state ─── */
  const [attendance,    setAttendance]    = useState(null);
  const [shiftInfo,     setShiftInfo]     = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [liveSeconds,   setLiveSeconds]   = useState(0);
  const [isOnline,      setIsOnline]      = useState(false);
  const [availBusy,     setAvailBusy]     = useState(false);
  const [clockOutModal, setClockOutModal] = useState(false);

  /* ─── history state ─── */
  const [historyRecords,  setHistoryRecords]  = useState([]);
  const [historyLoading,  setHistoryLoading]  = useState(false);
  const [search,          setSearch]          = useState("");
  const [statusFilter,    setStatusFilter]    = useState("All");
  const [monthFilter,     setMonthFilter]     = useState("All");
  const [sortBy,          setSortBy]          = useState("newest");
  const [viewMode,        setViewMode]        = useState("table");
  const [page,            setPage]            = useState(1);

  /* ─── data fetchers ─── */
  const fetchToday = async () => {
    try {
      const res = await api.get("/attendance/today");
      if (res.data?.success) {
        setAttendance(res.data.data || null);
        setShiftInfo(res.data.shift || res.data.employee || null);
        if (res.data.data?.duration_seconds != null)
          setLiveSeconds(Number(res.data.data.duration_seconds));
      }
    } catch { /* silent */ }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get("/attendance/my-history?limit=200");
      if (res.data?.success) setHistoryRecords(res.data.data || []);
    } catch { /* silent */ }
    finally { setHistoryLoading(false); }
  };

  const fetchStatus = async () => {
    try {
      const res = await api.get("/delivery-partner/dashboard");
      const d = res.data?.dashboard || res.data?.data || res.data || null;
      if (d) setIsOnline(Boolean(d.is_online ?? d.isOnline));
    } catch { /* silent */ }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([fetchToday(), fetchHistory(), fetchStatus()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
    const handler = (e) => {
      const u = e.detail;
      if (u && Object.hasOwn(u, "check_in")) {
        setAttendance(u);
        if (u.duration_seconds != null) setLiveSeconds(Number(u.duration_seconds));
        else if (u.total_hours != null)  setLiveSeconds(Number(u.total_hours) * 3600);
      } else { fetchToday(); }
      fetchHistory(); fetchStatus();
    };
    window.addEventListener("attendance-updated", handler);
    return () => window.removeEventListener("attendance-updated", handler);
  }, []);

  /* live timer */
  useEffect(() => {
    if (!attendance?.check_in || attendance?.check_out) return;
    const t = setInterval(() => setLiveSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [attendance?.check_in, attendance?.check_out]);

  const isWorking   = Boolean(attendance?.check_in && !attendance?.check_out);
  const isCompleted = Boolean(attendance?.check_in && attendance?.check_out);

  /* ─── clock in ─── */
  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      const res = await api.patch("/delivery-partner/availability", { is_online: true });
      const u   = res.data?.data?.attendance;
      if (!res.data?.success || !u) throw new Error(res.data?.message || "Failed to clock in.");
      setIsOnline(true); setAttendance(u);
      setLiveSeconds(Number(u.duration_seconds ?? 0));
      window.dispatchEvent(new CustomEvent("attendance-updated", { detail: u }));
      toast.success("Clocked in! Have a great shift.");
      fetchHistory();
    } catch (err) { toast.error(err.response?.data?.message || err.message || "Failed to clock in."); }
    finally { setActionLoading(false); }
  };

  /* ─── clock out ─── */
  const handleClockOut = async () => {
    setClockOutModal(false); setActionLoading(true);
    try {
      const res = await api.patch("/delivery-partner/availability", { is_online: false, clock_out: true });
      const u   = res.data?.data?.attendance;
      if (!res.data?.success || !u) throw new Error(res.data?.message || "Failed to clock out.");
      setIsOnline(false); setAttendance(u);
      if (u.duration_seconds != null) setLiveSeconds(Number(u.duration_seconds));
      else if (u.total_hours != null) setLiveSeconds(Number(u.total_hours) * 3600);
      window.dispatchEvent(new CustomEvent("attendance-updated", { detail: u }));
      toast.success(`Clocked out! Total worked: ${u.total_hours || 0} hrs.`);
      fetchHistory();
    } catch (err) { toast.error(err.response?.data?.message || err.message || "Failed to clock out."); }
    finally { setActionLoading(false); }
  };

  /* ─── go online / offline toggle ─── */
  const toggleOnline = async (requested) => {
    if (availBusy) return; setAvailBusy(true);
    try {
      const res = await api.patch("/delivery-partner/availability", { is_online: requested });
      const d   = res.data?.data || res.data || {};
      setIsOnline(d.is_online ?? requested);
      if (d.attendance) setAttendance(d.attendance);
      window.dispatchEvent(new CustomEvent("attendance-updated", { detail: d.attendance }));
      toast.success(requested ? "You are now ONLINE!" : "You are now OFFLINE.");
      fetchToday();
    } catch (err) { toast.error(err.response?.data?.message || "Failed to toggle status."); }
    finally { setAvailBusy(false); }
  };

  /* ─── CSV export ─── */
  const handleExport = () => {
    if (!historyRecords.length) { toast.error("No records to export."); return; }
    const headers = ["Date","Shift","Clock In","Clock Out","Duration (hrs)","Status","Notes"];
    const rows    = historyRecords.map((r) => [
      `"${r.date || ""}"`,
      `"${r.start_time ? `${r.start_time} to ${r.end_time || ""}` : "Regular"}"`,
      `"${r.check_in  ? fmtTime(r.check_in)  : "--"}"`,
      `"${r.check_out ? fmtTime(r.check_out) : r.check_in ? "Working" : "--"}"`,
      `"${r.total_hours || (r.duration_seconds ? (r.duration_seconds/3600).toFixed(2) : "0")}"`,
      `"${r.status || "Present"}"`,
      `"${r.notes || ""}"`,
    ]);
    const csv  = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href     = encodeURI(csv);
    link.download = `attendance_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  /* ─── KPI stats ─── */
  const stats = useMemo(() => {
    let totalSecs = 0, lateCount = 0, onTimeCount = 0;
    historyRecords.forEach((r) => {
      if (r.duration_seconds != null) totalSecs += Number(r.duration_seconds);
      else if (r.total_hours != null) totalSecs += Number(r.total_hours) * 3600;
      r.status === "Late" ? lateCount++ : onTimeCount++;
    });
    const totalDays = new Set(historyRecords.map((r) => String(r.date||"").slice(0,10))).size;
    return {
      totalDays,
      totalHours:  (totalSecs/3600).toFixed(1),
      avgHours:    historyRecords.length ? (totalSecs/3600/historyRecords.length).toFixed(1) : "0.0",
      onTimeRate:  historyRecords.length ? Math.round((onTimeCount/historyRecords.length)*100) : 100,
      lateCount,
    };
  }, [historyRecords]);

  /* ─── filtered + paginated records ─── */
  const filtered = useMemo(() => {
    let list = historyRecords.filter((r) => {
      const term       = search.trim().toLowerCase();
      const st         = String(r.status||"").toLowerCase();
      const recMonth   = String(r.date||"").slice(0,7);
      const nowMonth   = new Date().toISOString().slice(0,7);
      const prevMonth  = (() => { const d = new Date(); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })();
      if (term && !["date","notes","status"].some((k) => String(r[k]||"").toLowerCase().includes(term))) return false;
      if (statusFilter === "Working"   && (!r.check_in || r.check_out))       return false;
      if (statusFilter === "Completed" && (!r.check_in || !r.check_out))      return false;
      if (statusFilter === "Late"      && r.status !== "Late")                 return false;
      if (statusFilter === "Present"   && r.status === "Late")                 return false;
      if (monthFilter  === "current"  && recMonth !== nowMonth)                return false;
      if (monthFilter  === "previous" && recMonth !== prevMonth)               return false;
      return true;
    });
    if (sortBy === "newest") list = [...list].sort((a,b) => new Date(b.date||0) - new Date(a.date||0));
    if (sortBy === "oldest") list = [...list].sort((a,b) => new Date(a.date||0) - new Date(b.date||0));
    if (sortBy === "hours-high") list = [...list].sort((a,b) => Number(b.total_hours??b.duration_seconds/3600??0) - Number(a.total_hours??a.duration_seconds/3600??0));
    return list;
  }, [historyRecords, search, statusFilter, monthFilter, sortBy]);

  const pageCount   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const displayPage = Math.min(page, pageCount);
  const visible     = filtered.slice((displayPage-1)*PAGE_SIZE, displayPage*PAGE_SIZE);

  const statCards = [
    { title: "Days Present",   value: String(stats.totalDays),  inc: "12.4%", icon: <CalendarCheck />,bg: "bg-[#22c55e]" },
    { title: "Total Hours",    value: `${stats.totalHours} hrs`, inc: "18.6%", icon: <Clock />,        bg: "bg-[#3b82f6]" },
    { title: "Avg Shift",      value: `${stats.avgHours} hrs`,  inc: "8.3%",  icon: <Timer />,        bg: "bg-[#8b5cf6]" },
    { title: "On-Time Rate",   value: `${stats.onTimeRate}%`,   inc: "5.7%",  icon: <CheckCircle2 />, bg: "bg-[#10b981]" },
    { title: "Late Arrivals",  value: String(stats.lateCount),  inc: "2.1%",  icon: <AlertCircle />,  bg: Number(stats.lateCount) > 0 ? "bg-[#f59e0b]" : "bg-[#06b6d4]" },
  ];

  const statusBadge = (r, isActive) => {
    if (isActive)         return "bg-emerald-100 text-emerald-900 border border-emerald-300";
    if (r.status==="Late") return "bg-amber-100 text-amber-900 border border-amber-200";
    if (r.status==="Absent")return "bg-rose-100 text-rose-800 border border-rose-200";
    return "bg-emerald-50 text-emerald-800 border border-emerald-200";
  };

  const todayStr = new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-2">
      <div className="mx-auto max-w-[1500px]">

        {/* ─── PAGE HEADER ─── */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#39804f]">Delivery Partner</p>
          <div className="mt-0.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#17231c]">Attendance &amp; Shift Log</h1>
              <p className="mt-0.5 text-sm text-gray-500">Mark your daily duty check-in, track working hours, and view attendance records.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={refreshAll} disabled={loading} aria-label="Refresh"
                className="grid h-10 w-10 place-items-center rounded-lg border border-[#dce6de] bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                <RefreshCw size={16} className={loading ? "animate-spin text-emerald-600" : ""} />
              </button>
              <button type="button" onClick={handleExport}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce6de] bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                <Download size={15} /> Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* ─── CLOCK-IN HERO BANNER ─── */}
        <div className="mb-6 relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-r from-white via-white to-emerald-50/70 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] sm:p-6">
          <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            {/* left info */}
            <div className="flex items-start gap-4">
              <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600">
                <Bike size={26} />
                {isWorking && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-700">{todayStr}</span>
                  <span className="text-slate-300">•</span>
                  {isWorking ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-emerald-700">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Active on Duty
                    </span>
                  ) : isCompleted ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-blue-700">
                      <Check size={12} /> Shift Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-amber-700">
                      Shift Not Started
                    </span>
                  )}
                  {attendance?.status && (
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${attendance.status === "Late" ? "bg-amber-100 text-amber-800" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                      {attendance.status}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">
                  {isWorking ? "You are currently clocked in & on duty" : isCompleted ? "Your shift for today has been logged" : "Ready to start your shift?"}
                </h2>
                <p className="max-w-xl text-xs text-slate-500 sm:text-sm">
                  {isWorking
                    ? `Clocked in at ${fmtTime(attendance.check_in)}. Working time is being automatically recorded.`
                    : isCompleted
                    ? `Clocked in at ${fmtTime(attendance.check_in)} and out at ${fmtTime(attendance.check_out)} (${attendance.total_hours} hrs total).`
                    : shiftInfo?.start_time
                    ? `Your scheduled shift: ${fmtShiftTime(shiftInfo.start_time)} to ${fmtShiftTime(shiftInfo.end_time)}. Click Clock In to start.`
                    : "Click below to clock in for your shift and mark your attendance."}
                </p>
                {/* shift pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium text-slate-600">
                  {shiftInfo?.start_time && (
                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1">
                      Shift: {fmtShiftTime(shiftInfo.start_time)} – {fmtShiftTime(shiftInfo.end_time)}
                    </span>
                  )}
                  {attendance?.check_in && (
                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1">
                      Clock In: <strong>{fmtTime(attendance.check_in)}</strong>
                    </span>
                  )}
                  {attendance?.check_out && (
                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1">
                      Clock Out: <strong>{fmtTime(attendance.check_out)}</strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* right actions */}
            <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
              {/* live timer */}
              {isWorking && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                  <Timer size={22} className="animate-spin text-emerald-600" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Duty Duration</p>
                    <p className="font-mono text-xl font-extrabold leading-tight text-slate-900">{fmtDuration(liveSeconds)}</p>
                  </div>
                </div>
              )}

              {/* online / offline toggle */}
              <button type="button" onClick={() => toggleOnline(!isOnline)} disabled={availBusy || actionLoading}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold shadow-sm transition disabled:opacity-50 ${isOnline ? "bg-amber-500 text-amber-950 hover:bg-amber-600" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                {isOnline ? <Power size={16} /> : <Zap size={16} />}
                {availBusy ? "Updating…" : isOnline ? "Go Offline" : "Go Online"}
              </button>

              {/* clock in / out */}
              {isWorking ? (
                <button type="button" onClick={() => setClockOutModal(true)} disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg transition hover:bg-rose-700 disabled:opacity-50">
                  <LogOut size={16} /> {actionLoading ? "Processing…" : "Clock Out"}
                </button>
              ) : isCompleted ? (
                <button type="button" onClick={handleClockIn} disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg transition hover:bg-emerald-700 disabled:opacity-50">
                  <RotateCcw size={16} /> {actionLoading ? "Resuming…" : "Resume Shift"}
                </button>
              ) : (
                <button type="button" onClick={handleClockIn} disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50">
                  <Play size={17} className="fill-current" /> {actionLoading ? "Clocking In…" : "Clock In Now"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── STAT CARDS ─── */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {statCards.map((s) => <StatCard key={s.title} {...s} cardLoading={loading} />)}
        </div>

        {/* ─── FILTER + HISTORY TABLE CARD ─── */}
        <div className="rounded-lg border border-[#e7e0d8] bg-gray-100 p-3 shadow-sm">

          {/* filters row */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-wrap items-center gap-3">

              {/* search */}
              <div className="relative w-full max-w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7a7a]" />
                <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by date, status, notes…"
                  className="h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-10 pr-3 text-[14px] text-[#2d2d2d] outline-none placeholder:text-[#8a8a8a] focus:border-[#FF5A00]" />
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
                {/* status filter */}
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#FF5A00]">
                  <option value="All">All Statuses</option>
                  <option value="Present">Present</option>
                  <option value="Late">Late Arrivals</option>
                  <option value="Working">Active Duty</option>
                  <option value="Completed">Completed Shifts</option>
                </select>

                {/* month filter */}
                <select value={monthFilter} onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }}
                  className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#FF5A00]">
                  <option value="All">All Months</option>
                  <option value="current">Current Month</option>
                  <option value="previous">Previous Month</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 lg:shrink-0">
              {/* sort */}
              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#FF5A00]">
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Oldest First</option>
                <option value="hours-high">Hours: High to Low</option>
              </select>

              {/* view toggle */}
              <div className="flex overflow-hidden rounded-xl border border-[#dfe2e5] bg-[#faf9f8]">
                <button type="button" onClick={() => { setViewMode("table"); setPage(1); }} aria-pressed={viewMode === "table"}
                  className={`flex h-[46px] w-[46px] items-center justify-center border-r border-[#dfe2e5] transition ${viewMode==="table" ? "bg-[#FF5A00] text-white" : "text-[#4d4d4d] hover:bg-orange-50 hover:text-[#FF5A00]"}`}
                  aria-label="Table view"><Table2 className="h-4 w-4" /></button>
                <button type="button" onClick={() => { setViewMode("card"); setPage(1); }} aria-pressed={viewMode === "card"}
                  className={`flex h-[46px] w-[46px] items-center justify-center transition ${viewMode==="card" ? "bg-[#FF5A00] text-white" : "text-[#4d4d4d] hover:bg-orange-50 hover:text-[#FF5A00]"}`}
                  aria-label="Card view"><LayoutGrid className="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          {/* section label */}
          <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="font-bold text-[#17231c]">My Attendance History</h2>
              <p className="mt-0.5 text-xs text-gray-500">Clock-in / clock-out timestamps for all your shifts</p>
            </div>
            <span className="text-[12px] text-[#666]">Showing <strong className="text-gray-900">{filtered.length}</strong> of {historyRecords.length} shifts</span>
          </div>

          {/* ─── LOADING SKELETON ─── */}
          {historyLoading && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[0,1,2,3].map((i) => <div key={i} className="h-36 animate-pulse rounded-xl border border-gray-200 bg-white" />)}
            </div>
          )}

          {/* ─── EMPTY ─── */}
          {!historyLoading && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#e7e0d8] bg-white p-10 text-center">
              <AlertCircle size={28} className="mx-auto mb-3 text-gray-300" />
              <p className="font-semibold text-gray-600">
                {historyRecords.length === 0 ? "Clock in today to create your first attendance record." : "No records match these filters."}
              </p>
            </div>
          )}

          {/* ─── CARD VIEW ─── */}
          {!historyLoading && filtered.length > 0 && viewMode === "card" && (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {visible.map((r) => {
                  const isActive = Boolean(r.check_in && !r.check_out);
                  const isToday  = r.date && new Date().toISOString().slice(0,10) === String(r.date).slice(0,10);
                  return (
                    <article key={r.id || r.attendance_id || `${r.date}-${r.check_in}`}
                      className="rounded-[18px] border border-[#e7e0d8] bg-white p-4 shadow-[0_1px_0_rgba(16,24,40,0.02)] transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#dfeaf8] text-[#3f7db8]">
                          <CalendarDays className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isToday && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">Today</span>}
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${statusBadge(r, isActive)}`}>
                            {isActive ? "Active" : r.status || "Present"}
                          </span>
                        </div>
                      </div>
                      <div className="text-[15px] font-semibold text-[#1e1e1e]">
                        {r.date ? new Date(r.date).toLocaleDateString("en-IN", { weekday:"short", day:"2-digit", month:"short", year:"numeric" }) : "—"}
                      </div>
                      {r.start_time && (
                        <div className="mt-1 text-[12px] text-[#646464]">
                          Shift: {fmtShiftTime(r.start_time)} – {fmtShiftTime(r.end_time)}
                        </div>
                      )}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                        <div>
                          <span className="text-gray-500">Clock In</span>
                          <div className="font-semibold text-emerald-700">{r.check_in ? fmtTime(r.check_in) : "--:--"}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Clock Out</span>
                          <div className="font-semibold text-gray-800">
                            {r.check_out ? fmtTime(r.check_out) : isActive ? <span className="text-emerald-600">On Duty</span> : "--:--"}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-[#f0ebe4] pt-3">
                        <span className="text-[12px] text-gray-500">Duration</span>
                        <span className="font-mono text-[15px] font-bold text-[#21643a]">
                          {r.total_hours ? `${r.total_hours} hrs` : r.duration_seconds ? fmtShort(r.duration_seconds) : isActive ? fmtShort(liveSeconds) : "--"}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
              <Pagination page={displayPage} pageCount={pageCount} setPage={setPage} total={filtered.length} />
            </>
          )}

          {/* ─── TABLE VIEW ─── */}
          {!historyLoading && filtered.length > 0 && viewMode === "table" && (
            <>
              <div className="overflow-x-auto rounded-[16px] border border-[#e8e4df]">
                <table className="w-full min-w-[760px] border-collapse bg-white text-left">
                  <thead className="border-b border-orange-100 bg-orange-50 text-left text-sm font-semibold text-orange-700">
                    <tr>
                      <th className="px-4 py-4">S.No</th>
                      <th className="px-4 py-4">Date</th>
                      <th className="px-4 py-4">Scheduled Shift</th>
                      <th className="px-4 py-4">Clock In</th>
                      <th className="px-4 py-4">Clock Out</th>
                      <th className="px-4 py-4">Duration</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r, i) => {
                      const isActive = Boolean(r.check_in && !r.check_out);
                      const isToday  = r.date && new Date().toISOString().slice(0,10) === String(r.date).slice(0,10);
                      return (
                        <tr key={r.id || r.attendance_id || `${r.date}-${r.check_in}`}
                          className="border-t border-[#efefef] text-[13px] text-[#444444] hover:bg-gray-50/60">
                          <td className="px-4 py-4 font-medium text-[#2d2d2d]">{(displayPage-1)*PAGE_SIZE+i+1}</td>
                          <td className="whitespace-nowrap px-4 py-4 font-semibold text-[#202020]">
                            <div className="flex items-center gap-2">
                              {r.date ? new Date(r.date).toLocaleDateString("en-US", { weekday:"short", month:"short", day:"2-digit", year:"numeric" }) : "—"}
                              {isToday && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">Today</span>}
                            </div>
                          </td>
                          <td className="px-4 py-4 font-mono text-[12px] text-gray-600">
                            {r.start_time ? `${fmtShiftTime(r.start_time)} – ${fmtShiftTime(r.end_time)}` : <span className="font-sans text-gray-400">Regular</span>}
                          </td>
                          <td className="px-4 py-4">
                            {r.check_in
                              ? <span className="font-semibold text-emerald-700">{fmtTime(r.check_in)}{r.status==="Late" && <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[9px] font-extrabold text-amber-900">Late</span>}</span>
                              : <span className="text-gray-400">--:--</span>}
                          </td>
                          <td className="px-4 py-4">
                            {r.check_out
                              ? <span className="font-semibold text-gray-800">{fmtTime(r.check_out)}</span>
                              : isActive
                              ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800"><span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-600" />On Duty</span>
                              : <span className="text-gray-400">--:--</span>}
                          </td>
                          <td className="px-4 py-4 font-mono font-bold text-gray-800">
                            {r.total_hours ? `${r.total_hours} hrs` : r.duration_seconds ? fmtShort(r.duration_seconds) : isActive ? fmtShort(liveSeconds) : "--"}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${statusBadge(r, isActive)}`}>
                              {isActive ? "Active Duty" : r.status || "Present"}
                            </span>
                          </td>
                          <td className="max-w-[140px] truncate px-4 py-4 text-gray-500">{r.notes || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={displayPage} pageCount={pageCount} setPage={setPage} total={filtered.length} />
            </>
          )}
        </div>
      </div>

      {/* ─── CLOCK OUT CONFIRM MODAL ─── */}
      {clockOutModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600"><LogOut size={18} /></div>
                <h3 className="text-base font-bold text-gray-900">Clock Out of Shift</h3>
              </div>
              <button type="button" onClick={() => setClockOutModal(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 py-4 text-sm text-gray-600">
              <p>Are you sure you want to clock out and end your working shift for today?</p>
              <div className="space-y-1.5 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">Clock In Time:</span><span className="font-semibold text-gray-900">{fmtTime(attendance?.check_in)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Duration Worked:</span><span className="font-mono font-bold text-emerald-700">{fmtDuration(liveSeconds)}</span></div>
                <p className="mt-2 text-[11px] text-amber-700">Note: Ending your shift will also set your delivery availability to Offline.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => setClockOutModal(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="button" onClick={handleClockOut} disabled={actionLoading}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50">
                {actionLoading ? "Clocking Out…" : "Yes, Clock Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
