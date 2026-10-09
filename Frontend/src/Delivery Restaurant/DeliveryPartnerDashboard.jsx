import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bike,
  Calendar,
  CheckCircle2,
  Clock3,
  History,
  IndianRupee,
  LogOut,
  MapPin,
  PackageCheck,
  Power,
  RefreshCw,
  RotateCcw,
  Route,
  Timer,
  UserCheck,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import api from "../api";
import toast from "react-hot-toast";

const metrics = [
  { key: "todayDeliveries", label: "Today's deliveries", icon: PackageCheck, tone: "mint", caption: "Today" },
  { key: "newOrders", label: "New orders", icon: Clock3, tone: "pink", caption: "Awaiting action" },
  { key: "assignedOrders", label: "Assigned", icon: Bike, tone: "violet", caption: "Assigned to you" },
  { key: "pickupPending", label: "Pickup pending", icon: MapPin, tone: "amber", caption: "Pickup stage" },
  { key: "outForDelivery", label: "Out for delivery", icon: Route, tone: "blue", caption: "In progress" },
  { key: "deliveredOrders", label: "Delivered", icon: CheckCircle2, tone: "green", caption: "Completed" },
  { key: "cancelledOrders", label: "Cancelled", icon: XCircle, tone: "rose", caption: "Closed" },
];

const tones = {
  mint: "bg-gradient-to-br from-[#10ae89] via-[#1fc995] to-[#21d68f] text-white",
  violet: "bg-gradient-to-br from-[#4a6ce9] via-[#665ce5] to-[#8250df] text-white",
  pink: "bg-gradient-to-br from-[#ed40ac] via-[#d832a0] to-[#c72188] text-white",
  amber: "bg-gradient-to-br from-[#ff9a12] via-[#ffad0b] to-[#ffc20c] text-[#3c2d00]",
  blue: "bg-gradient-to-br from-[#168bc0] via-[#157da9] to-[#206bb2] text-white",
  green: "bg-gradient-to-br from-[#24975a] via-[#1b8b4d] to-[#14733e] text-white",
  rose: "bg-gradient-to-br from-[#df5365] via-[#d7435c] to-[#c82c55] text-white",
  lime: "bg-gradient-to-br from-[#8cbf31] via-[#69ad32] to-[#368d51] text-white",
  forest: "bg-gradient-to-br from-[#256448] via-[#1c7048] to-[#16593e] text-white",
};

const money = (value) => value == null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`;

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

const formatTime = (isoString) => {
  if (!isoString) return "--:--";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
};

const DeliveryPartnerDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [liveSeconds, setLiveSeconds] = useState(0);

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadDashboard = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const response = await api.get("/delivery-partner/dashboard");
      const d = response.data?.dashboard || response.data?.data || response.data || null;
      setDashboard(d);
      if (d?.attendance?.duration_seconds != null) {
        setLiveSeconds(Number(d.attendance.duration_seconds));
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "The delivery dashboard service is not available.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [refreshKey]);

  // Listen to external attendance events (e.g. from header pill)
  useEffect(() => {
    const handleAttendanceUpdated = () => {
      loadDashboard(true);
    };
    window.addEventListener("attendance-updated", handleAttendanceUpdated);
    return () => window.removeEventListener("attendance-updated", handleAttendanceUpdated);
  }, []);

  const attendance = dashboard?.attendance || null;
  const isOnline = Boolean(dashboard?.is_online ?? dashboard?.isOnline);
  const isCheckedIn = Boolean(
    dashboard?.isCheckedIn ??
    (attendance && attendance.check_in && !attendance.check_out)
  );
  const summary = dashboard?.summary || dashboard?.stats || {};
  const activeOrder = dashboard?.active_order || dashboard?.activeOrder || null;

  // Live timer for active working shift
  useEffect(() => {
    if (!isCheckedIn || !isOnline) return;

    const interval = setInterval(() => {
      setLiveSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isCheckedIn, isOnline]);

  const toggleOnline = async (requestedState) => {
    if (availabilityBusy) return;
    setAvailabilityBusy(true);
    try {
      const response = await api.patch("/delivery-partner/availability", {
        is_online: requestedState,
      });
      const data = response.data?.data || response.data || {};
      setDashboard((current) => ({
        ...current,
        is_online: data.is_online ?? requestedState,
        isCheckedIn: data.isCheckedIn ?? (requestedState ? true : current?.isCheckedIn),
        attendance: data.attendance || current?.attendance,
      }));
      if (data.attendance?.duration_seconds != null) {
        setLiveSeconds(Number(data.attendance.duration_seconds));
      }
      window.dispatchEvent(new CustomEvent("attendance-updated", { detail: data.attendance }));
      toast.success(
        requestedState
          ? "You are now ONLINE and checked in for deliveries!"
          : "You are now OFFLINE."
      );
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "Failed to update online status.");
    } finally {
      setAvailabilityBusy(false);
    }
  };

  const handleEndShift = async () => {
    if (!window.confirm("Are you sure you want to end your shift and clock out for today? You will be taken offline.")) {
      return;
    }
    if (availabilityBusy) return;
    setAvailabilityBusy(true);
    try {
      const response = await api.patch("/delivery-partner/availability", {
        is_online: false,
        clock_out: true,
      });
      const data = response.data?.data || response.data || {};
      setDashboard((current) => ({
        ...current,
        is_online: false,
        isCheckedIn: false,
        attendance: data.attendance || current?.attendance,
      }));
      window.dispatchEvent(new CustomEvent("attendance-updated", { detail: data.attendance }));
      toast.success(
        `Shift ended and clocked out! Total worked: ${data.attendance?.total_hours || 0} hrs.`
      );
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "Failed to end shift.");
    } finally {
      setAvailabilityBusy(false);
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

  return (
    <section className="space-y-5 text-[#17231c]">
      {/* Top Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#39804f]">Delivery Partner</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${isOnline ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"}`}>
              <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Your day, at a glance</h1>
          <p className="mt-1 text-sm text-gray-500">Live delivery duty status, active assignments and earnings.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
            aria-label="Refresh dashboard"
            className="grid h-10 w-10 place-items-center rounded-lg border border-[#dce6de] bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          {isOnline ? (
            <button
              type="button"
              onClick={() => toggleOnline(false)}
              disabled={availabilityBusy || loading}
              className="inline-flex min-w-36 items-center justify-center gap-2 rounded-lg bg-gray-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-55"
            >
              <Power size={16} />
              {availabilityBusy ? "Updating..." : "Go offline"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => toggleOnline(true)}
              disabled={availabilityBusy || loading}
              className="inline-flex min-w-36 items-center justify-center gap-2 rounded-lg bg-[#248148] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1e713d] disabled:opacity-55"
            >
              <Zap size={16} />
              {availabilityBusy ? "Updating..." : "Go online"}
            </button>
          )}
        </div>
      </header>

      {/* Hero Attendance & Online Status Card */}
      {isOnline ? (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-800 via-[#0e4835] to-[#072d20] p-5 sm:p-6 text-white shadow-xl">
          <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-emerald-400/10 blur-2xl" />
          <div className="pointer-events-none absolute right-1/3 -bottom-10 h-40 w-40 rounded-full bg-teal-400/10 blur-xl" />

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 border border-white/20 shadow-inner backdrop-blur-md">
                <Bike size={28} className="text-emerald-300" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-[#0e4835]"></span>
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 border border-emerald-400/40 px-3 py-0.5 text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Online & Ready for Deliveries
                  </span>
                  {attendance?.status && (
                    <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold text-white border border-white/20">
                      {attendance.status}
                    </span>
                  )}
                </div>
                <h2 className="mt-1.5 text-xl font-bold sm:text-2xl text-white">
                  You are Online & On Duty
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-emerald-100/80">
                  Attendance checked in at <strong className="text-white">{formatTime(attendance?.check_in)}</strong>. New delivery requests can be assigned to you.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-md shadow-sm">
                <Timer size={20} className="text-emerald-300 animate-spin" />
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-200">Duty Duration</p>
                  <p className="font-mono text-base font-extrabold text-white leading-none mt-0.5">{formatDuration(liveSeconds)}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleOnline(false)}
                disabled={availabilityBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500/90 hover:bg-amber-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-amber-950 transition shadow-md disabled:opacity-50"
              >
                <Power size={15} />
                Go Offline
              </button>

              <button
                type="button"
                onClick={handleEndShift}
                disabled={availabilityBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600/90 hover:bg-rose-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition shadow-md disabled:opacity-50"
              >
                <LogOut size={15} />
                Clock Out
              </button>

              <button
                type="button"
                onClick={loadHistory}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-3 py-2.5 text-xs font-semibold text-white transition shadow-sm"
              >
                <History size={15} />
                History
              </button>
            </div>
          </div>
        </div>
      ) : isCheckedIn ? (
        <div className="relative overflow-hidden rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-900/90 via-stone-900 to-[#2c2012] p-5 sm:p-6 text-white shadow-xl">
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 border border-white/20 shadow-inner backdrop-blur-md">
                <Power size={26} className="text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 px-3 py-0.5 text-xs font-extrabold uppercase tracking-wider text-amber-300">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Paused • Currently Offline
                  </span>
                  <span className="text-xs text-amber-200">Checked in at {formatTime(attendance?.check_in)}</span>
                </div>
                <h2 className="mt-1.5 text-xl font-bold sm:text-2xl text-white">
                  You are Temporarily Offline
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-amber-100/80">
                  You are paused from receiving new delivery orders. Click Go Online to resume duty.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => toggleOnline(true)}
                disabled={availabilityBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition active:scale-95 disabled:opacity-50"
              >
                <Zap size={16} />
                Go Online Now
              </button>

              <button
                type="button"
                onClick={handleEndShift}
                disabled={availabilityBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600/90 hover:bg-rose-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition shadow-md disabled:opacity-50"
              >
                <LogOut size={15} />
                Clock Out
              </button>

              <button
                type="button"
                onClick={loadHistory}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-3 py-2.5 text-xs font-semibold text-white transition"
              >
                <History size={15} />
                History
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-[#1a2e22] via-[#16271c] to-[#0d1711] p-5 sm:p-6 text-white shadow-xl">
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 border border-white/20 shadow-inner backdrop-blur-md">
                <Power size={26} className="text-gray-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-500/30 border border-gray-400/40 px-3 py-0.5 text-xs font-extrabold uppercase tracking-wider text-gray-300">
                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                    Offline • Check-in Required
                  </span>
                  {attendance?.check_out && (
                    <span className="text-xs text-gray-400">
                      Shift completed ({attendance.total_hours} hrs worked)
                    </span>
                  )}
                </div>
                <h2 className="mt-1.5 text-xl font-bold sm:text-2xl text-white">
                  {attendance?.check_out ? "Shift Completed for Today" : "You are Offline"}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-gray-300">
                  Check in now to go online and start receiving customer delivery orders.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => toggleOnline(true)}
                disabled={availabilityBusy}
                className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-extrabold text-white shadow-[0_4px_20px_rgba(16,185,129,0.35)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_6px_25px_rgba(16,185,129,0.5)] active:scale-95 disabled:opacity-50"
              >
                <Zap size={18} className="text-yellow-300 animate-bounce" />
                {attendance?.check_out ? "Resume Shift & Go Online" : "⚡ Go Online & Check In"}
              </button>

              <button
                type="button"
                onClick={loadHistory}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-3.5 py-3 text-xs font-semibold text-white transition"
              >
                <History size={15} />
                Attendance History
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Dashboard data notice</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ key, label, icon: Icon, tone, caption }) => (
          <div key={key} className={`relative isolate flex min-h-[190px] flex-col overflow-hidden rounded-[22px] p-5 shadow-[0_12px_25px_rgba(20,45,30,0.16)] transition-transform duration-200 hover:-translate-y-0.5 ${tones[tone]}`}>
            <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between gap-3">
              <span className="pt-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-current/90">{label}</span>
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] border border-white/35 bg-white/15 text-current shadow-inner"><Icon size={23} strokeWidth={2.2} /></span>
            </div>
            {loading ? <div className="relative mt-2 h-10 w-20 animate-pulse rounded-lg bg-white/25" /> : <p className="relative mt-2 text-[32px] font-extrabold leading-none tabular-nums text-current">{summary[key] ?? 0}</p>}
            <div aria-hidden="true" className="relative mt-auto flex h-9 items-end gap-1 pt-3 opacity-25">
              {[16, 24, 18, 32, 21, 28, 36].map((height, index) => <span key={index} style={{ height }} className="flex-1 rounded-t-[4px] bg-white" />)}
            </div>
            <span className="relative mt-2 inline-flex w-fit items-center rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[10px] font-bold text-current shadow-sm">{caption}</span>
          </div>
        ))}
        <div className={`relative isolate flex min-h-[190px] flex-col overflow-hidden rounded-[22px] p-5 shadow-[0_12px_25px_rgba(20,45,30,0.16)] ${tones.lime}`}>
          <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
          <div className="relative flex items-start justify-between gap-3"><span className="pt-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-current/90">Today's earnings</span><span className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] border border-white/35 bg-white/15 text-current shadow-inner"><IndianRupee size={23} strokeWidth={2.2} /></span></div>
          {loading ? <div className="relative mt-2 h-10 w-24 animate-pulse rounded-lg bg-white/25" /> : <p className="relative mt-2 text-[32px] font-extrabold leading-none tabular-nums text-current">{money(summary.todayEarnings)}</p>}
          <div aria-hidden="true" className="relative mt-auto flex h-9 items-end gap-1 pt-3 opacity-25">{[16, 24, 18, 32, 21, 28, 36].map((height, index) => <span key={index} style={{ height }} className="flex-1 rounded-t-[4px] bg-white" />)}</div>
          <span className="relative mt-2 inline-flex w-fit items-center rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[10px] font-bold text-current shadow-sm">Today</span>
        </div>
        <div className={`relative isolate flex min-h-[190px] flex-col overflow-hidden rounded-[22px] p-5 shadow-[0_12px_25px_rgba(20,45,30,0.16)] ${tones.forest}`}>
          <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
          <div className="relative flex items-start justify-between gap-3"><span className="pt-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-current/90">Total earnings</span><span className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] border border-white/35 bg-white/15 text-current shadow-inner"><IndianRupee size={23} strokeWidth={2.2} /></span></div>
          {loading ? <div className="relative mt-2 h-10 w-24 animate-pulse rounded-lg bg-white/25" /> : <p className="relative mt-2 text-[32px] font-extrabold leading-none tabular-nums text-current">{money(summary.totalEarnings)}</p>}
          <div aria-hidden="true" className="relative mt-auto flex h-9 items-end gap-1 pt-3 opacity-25">{[16, 24, 18, 32, 21, 28, 36].map((height, index) => <span key={index} style={{ height }} className="flex-1 rounded-t-[4px] bg-white" />)}</div>
          <span className="relative mt-2 inline-flex w-fit items-center rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[10px] font-bold text-current shadow-sm">Lifetime</span>
        </div>
      </div>

      {/* Active Delivery Section */}
      <section className="rounded-xl border border-[#e2e9e3] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#39804f]">On the road</p>
            <h2 className="mt-1 text-lg font-bold">Active delivery</h2>
          </div>
          <Link to="/delivery/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-[#21643a] hover:underline">
            Open orders <ArrowRight size={15} />
          </Link>
        </div>
        {activeOrder ? (
          <div className="mt-4 grid gap-4 rounded-lg bg-[#f5f8f5] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs font-semibold text-gray-500">Order #{activeOrder.order_number || activeOrder.id}</p>
              <p className="mt-1 font-semibold">{activeOrder.customer_name || "Customer"}</p>
              <p className="mt-2 flex items-start gap-2 text-sm text-gray-600">
                <MapPin size={15} className="mt-0.5 shrink-0 text-[#39804f]" />
                {[activeOrder.address_line, activeOrder.area_locality, activeOrder.city].filter(Boolean).join(", ") || "Delivery location pending"}
              </p>
            </div>
            <Link to="/delivery/orders" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#21643a] px-4 py-2.5 text-sm font-semibold text-white">
              View delivery <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#f7f9f7] p-4 text-sm text-gray-600">
            <PackageCheck size={19} className="shrink-0 text-[#5b8063]" />
            <span>{isOnline ? "No active delivery right now. You are online and waiting for new assignments." : "Go online to start receiving delivery assignments."}</span>
          </div>
        )}
      </section>

      {/* Attendance History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white text-gray-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <Calendar size={18} className="text-emerald-600" />
                <div>
                  <h3 className="font-bold text-gray-900">Delivery Attendance Logs</h3>
                  <p className="text-xs text-gray-500">Your recent shift punch-ins, clock-outs and active hours</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-6">
              {historyLoading ? (
                <div className="py-12 text-center text-gray-400">Loading your attendance records...</div>
              ) : historyRecords.length === 0 ? (
                <div className="py-12 text-center text-gray-400">No attendance logs found yet.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Check In</th>
                        <th className="px-4 py-3">Check Out</th>
                        <th className="px-4 py-3">Hours</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {historyRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {rec.date ? new Date(rec.date).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-4 py-3 text-emerald-700 font-medium">{formatTime(rec.check_in)}</td>
                          <td className="px-4 py-3 text-gray-600 font-medium">
                            {rec.check_out ? formatTime(rec.check_out) : <span className="text-emerald-600 font-bold">Active</span>}
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900">{rec.total_hours != null ? `${rec.total_hours} hrs` : "In Progress"}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                rec.status === "Late"
                                  ? "bg-amber-100 text-amber-800"
                                  : rec.status === "Absent"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {rec.status || "Present"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 bg-gray-50 px-6 py-3 text-right">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DeliveryPartnerDashboard;