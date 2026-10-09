import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bike, CheckCircle2, Clock3, IndianRupee, MapPin, PackageCheck, Power, RefreshCw, Route, XCircle } from "lucide-react";
import api from "../api";
import toast from "react-hot-toast";
import AttendanceWidget from "../CommonComponents/AttendanceWidget";

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

const DeliveryPartnerDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/delivery-partner/dashboard");
        if (active) setDashboard(response.data?.dashboard || response.data?.data || response.data || null);
      } catch (requestError) {
        if (active) setError(requestError?.response?.data?.message || "The delivery dashboard service is not available.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [refreshKey]);

  const isOnline = Boolean(dashboard?.is_online ?? dashboard?.isOnline);
  const summary = dashboard?.summary || dashboard?.stats || {};
  const activeOrder = dashboard?.active_order || dashboard?.activeOrder || null;

  const toggleAvailability = async () => {
    if (availabilityBusy) return;
    setAvailabilityBusy(true);
    try {
      const response = await api.patch("/delivery-partner/availability", { is_online: !isOnline });
      const data = response.data?.data || response.data || {};
      setDashboard((current) => ({ ...current, ...data, is_online: data.is_online ?? !isOnline }));
      toast.success(!isOnline ? "You are online and available for assignments." : "You are offline.");
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "Availability could not be updated.");
    } finally {
      setAvailabilityBusy(false);
    }
  };

  return (
    <section className="space-y-5 text-[#17231c]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#39804f]">Delivery partner</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Your day, at a glance</h1><p className="mt-1 text-sm text-gray-500">Assignments and earnings linked to your account.</p></div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading} aria-label="Refresh dashboard" className="grid h-10 w-10 place-items-center rounded-lg border border-[#dce6de] bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button>
          <button type="button" onClick={toggleAvailability} disabled={availabilityBusy || loading || Boolean(error)} aria-pressed={isOnline} className={`inline-flex min-w-36 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-55 ${isOnline ? "bg-[#248148] hover:bg-[#1e713d]" : "bg-gray-700 hover:bg-gray-800"}`}><Power size={16} />{availabilityBusy ? "Updating..." : isOnline ? "Go offline" : "Go online"}</button>
        </div>
      </header>

      {/* Delivery Partner Attendance Banner */}
      <AttendanceWidget variant="dashboard" />

      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${isOnline ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-white"}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
        <div className="min-w-0"><p className={`text-sm font-bold ${isOnline ? "text-emerald-800" : "text-gray-800"}`}>{isOnline ? "You're online" : "You're offline"}</p><p className="text-xs text-gray-600">{isOnline ? "You can receive new delivery assignments." : "You won't receive new assignments while offline."}</p></div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Dashboard data unavailable</p><p className="mt-1">{error}</p><p className="mt-2 text-xs">A partner-scoped dashboard and availability API is required. Shared store orders are never loaded here.</p></div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ key, label, icon: Icon, tone, caption }) => (
          <div key={key} className={`relative isolate flex min-h-[190px] flex-col overflow-hidden rounded-[22px] p-5 shadow-[0_12px_25px_rgba(20,45,30,0.16)] transition-transform duration-200 hover:-translate-y-0.5 ${tones[tone]}`}>
            <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between gap-3">
              <span className="pt-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-current/90">{label}</span>
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] border border-white/35 bg-white/15 text-current shadow-inner"><Icon size={23} strokeWidth={2.2} /></span>
            </div>
            {loading ? <div className="relative mt-2 h-10 w-20 animate-pulse rounded-lg bg-white/25" /> : <p className="relative mt-2 text-[32px] font-extrabold leading-none tabular-nums text-current">{summary[key] ?? "—"}</p>}
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

      <section className="rounded-xl border border-[#e2e9e3] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-[#39804f]">On the road</p><h2 className="mt-1 text-lg font-bold">Active delivery</h2></div><Link to="/delivery/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-[#21643a] hover:underline">Open orders <ArrowRight size={15} /></Link></div>
        {activeOrder ? <div className="mt-4 grid gap-4 rounded-lg bg-[#f5f8f5] p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-xs font-semibold text-gray-500">{activeOrder.order_id || activeOrder.id}</p><p className="mt-1 font-semibold">{activeOrder.customer_name || activeOrder.customer?.name || "Customer"}</p><p className="mt-2 flex items-start gap-2 text-sm text-gray-600"><MapPin size={15} className="mt-0.5 shrink-0 text-[#39804f]" />{activeOrder.delivery_address || activeOrder.dropoff_address || "Delivery location pending"}</p></div><Link to="/delivery/orders" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#21643a] px-4 py-2.5 text-sm font-semibold text-white">View delivery <ArrowRight size={15} /></Link></div> : <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#f7f9f7] p-4 text-sm text-gray-600"><PackageCheck size={19} className="shrink-0 text-[#5b8063]" /><span>{error ? "Assigned delivery details will appear once the partner service is connected." : "No active delivery right now."}</span></div>}
      </section>
    </section>
  );
};

export default DeliveryPartnerDashboard;