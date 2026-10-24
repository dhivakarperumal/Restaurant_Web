import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bike,
  Calendar,
  CalendarCheck,
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
  { key: "deliveredOrders", label: "Delivered", icon: CheckCircle2, tone: "green", caption: "Completed" },
  { key: "cancelledOrders", label: "Cancelled", icon: XCircle, tone: "rose", caption: "Closed" },
];

const tones = {
  mint: { icon: "bg-orange-500 text-white", accent: "#f97316" },
  violet: { icon: "bg-blue-500 text-white", accent: "#3b82f6" },
  pink: { icon: "bg-pink-500 text-white", accent: "#ec4899" },
  amber: { icon: "bg-amber-500 text-white", accent: "#f59e0b" },
  green: { icon: "bg-violet-500 text-white", accent: "#8b5cf6" },
  rose: { icon: "bg-rose-500 text-white", accent: "#f43f5e" },
  lime: { icon: "bg-cyan-500 text-white", accent: "#06b6d4" },
  forest: { icon: "bg-emerald-500 text-white", accent: "#10b981" },
};

const money = (value) => value == null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`;

function DashboardMetricCard({ label, value, loading, icon: Icon, caption, tone }) {
  return (
    <article className="group relative flex min-h-[176px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_12px_24px_-6px_rgba(0,0,0,0.1)] sm:p-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-15 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-30"
        style={{ backgroundColor: tone.accent }}
      />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          {loading ? (
            <div className="mt-3 h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <p className="mt-2.5 truncate text-[23px] font-black tracking-tight text-slate-800 sm:text-[27px]">{value}</p>
          )}
        </div>
        <span className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${tone.icon}`}>
          <Icon size={24} strokeWidth={2.3} />
        </span>
      </div>
      <div className="relative z-10 mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="truncate font-medium text-slate-500">{caption}</span>
        <span className="h-2 w-2 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: tone.accent }} />
      </div>
      <div
        className="absolute bottom-0 left-0 h-[3px] w-0 transition-all duration-300 group-hover:w-full"
        style={{ backgroundColor: tone.accent }}
      />
    </article>
  );
}

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
    const handleAttendanceUpdated = (event) => {
      const updatedAttendance = event.detail;
      if (updatedAttendance && Object.hasOwn(updatedAttendance, "check_in")) {
        setDashboard((current) => ({
          ...current,
          attendance: updatedAttendance,
          ...(updatedAttendance.check_out ? { is_online: false, isCheckedIn: false } : {}),
        }));
        if (updatedAttendance.duration_seconds != null) {
          setLiveSeconds(Number(updatedAttendance.duration_seconds));
        } else if (updatedAttendance.total_hours != null) {
          setLiveSeconds(Number(updatedAttendance.total_hours) * 3600);
        }
        return;
      }
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
      if (data.attendance?.duration_seconds != null) {
        setLiveSeconds(Number(data.attendance.duration_seconds));
      } else if (data.attendance?.total_hours != null) {
        setLiveSeconds(Number(data.attendance.total_hours) * 3600);
      }
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

      {/* Attendance & availability banner */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-r from-white via-white to-emerald-50/70 p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] sm:p-5">
        <div className="pointer-events-none absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
              <Bike size={24} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Today's Attendance</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                  isOnline ? "bg-emerald-100 text-emerald-800" : isCheckedIn ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                }`}>
                  {isOnline ? "Online" : isCheckedIn ? "Paused" : attendance?.check_out ? "Completed" : "Offline"}
                </span>
              </div>
              <h2 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
                {isOnline ? "You're on duty and ready for deliveries" : isCheckedIn ? "You're checked in and temporarily offline" : attendance?.check_out ? "Shift completed for today" : "Ready to start your shift?"}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {isOnline
                  ? `Checked in at ${formatTime(attendance?.check_in)} · On duty for ${formatDuration(liveSeconds)}`
                  : isCheckedIn
                  ? `Checked in at ${formatTime(attendance?.check_in)} · ${formatDuration(liveSeconds)} worked`
                  : attendance?.check_out
                  ? `Worked from ${formatTime(attendance.check_in)} to ${formatTime(attendance.check_out)} (${attendance.total_hours || 0} hrs total).`
                  : "Go online to check in and start receiving delivery orders."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
            {isOnline ? (
              <button
                type="button"
                onClick={() => toggleOnline(false)}
                disabled={availabilityBusy || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-amber-950 shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
              >
                <Power size={16} />
                {availabilityBusy ? "Updating..." : "Go Offline"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toggleOnline(true)}
                disabled={availabilityBusy || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {attendance?.check_out ? <RotateCcw size={16} /> : <Zap size={16} />}
                {availabilityBusy ? "Updating..." : isCheckedIn ? "Resume Shift" : attendance?.check_out ? "Resume Shift" : "Go Online & Check In"}
              </button>
            )}
            {isCheckedIn && (
              <button
                type="button"
                onClick={handleEndShift}
                disabled={availabilityBusy || loading}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
              >
                <LogOut size={15} />
                Clock Out
              </button>
            )}
            <Link
              to="/delivery/attendance"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <CalendarCheck size={14} />
              Attendance Page
            </Link>
            <button
              type="button"
              onClick={loadHistory}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <History size={14} />
              History
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Dashboard data notice</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ key, label, icon: Icon, tone, caption }) => (
          <DashboardMetricCard
            key={key}
            label={label}
            value={summary[key] ?? 0}
            loading={loading}
            icon={Icon}
            caption={caption}
            tone={tones[tone]}
          />
        ))}
        <DashboardMetricCard
          label="Today's earnings"
          value={money(summary.todayEarnings)}
          loading={loading}
          icon={IndianRupee}
          caption="Today"
          tone={tones.lime}
        />
        <DashboardMetricCard
          label="Total earnings"
          value={money(summary.totalEarnings)}
          loading={loading}
          icon={IndianRupee}
          caption="Lifetime"
          tone={tones.forest}
        />
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
                    <thead className="border-b border-orange-100 bg-orange-50 text-[11px] font-bold uppercase tracking-wider text-orange-700">
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
                          <td className="px-4 py-3 font-bold text-gray-900">
                            {rec.check_out
                              ? `${rec.total_hours || 0} hrs`
                              : rec.duration_seconds != null
                              ? formatDuration(rec.duration_seconds)
                              : "In Progress"}
                          </td>
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