import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileText,
  History,
  IndianRupee,
  LayoutGrid,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Table2,
  TrendingUp,
  Wallet,
  WalletCards,
  X,
} from "lucide-react";
import api from "../api";
import toast from "react-hot-toast";
import { useAuth } from "../PrivateRouter/AuthContext";
import LogoutConfirmModal from "../CommonComponents/LogoutConfirmModal";

/* ─────────────────────────────────────────────────────────────────
   SHARED UTILITIES
───────────────────────────────────────────────────────────────── */
const EMPTY_PROFILE = {};

const currency = (value) =>
  value == null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`;

const rowsFrom = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items))         return payload.items;
  if (Array.isArray(payload?.rows))          return payload.rows;
  if (Array.isArray(payload?.data))          return payload.data;
  if (Array.isArray(payload?.history))       return payload.history;
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  if (Array.isArray(payload?.tickets))       return payload.tickets;
  return [];
};

const usePartnerResource = (endpoint, params = {}) => {
  const [resource,   setResource]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const query = JSON.stringify(params);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError("");
      try {
        const res = await api.get(endpoint, { params: JSON.parse(query) });
        if (active) setResource(res.data?.data ?? res.data ?? null);
      } catch (err) {
        if (active) setError(err?.response?.data?.message || "This delivery service is currently unavailable.");
      } finally { if (active) setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [endpoint, query, refreshKey]);

  return { resource, loading, error, refresh: () => setRefreshKey((v) => v + 1) };
};

/* ─── Stat card (matches admin categories style) ─── */
const StatCard = ({ title, value, inc, icon, bg, loading }) => (
  <article className={`relative min-w-0 overflow-hidden rounded-xl border border-transparent p-4 sm:p-5 shadow-[0_2px_10px_rgba(20,56,34,0.04)] flex flex-col justify-between min-h-[140px] ${bg} text-white`}>
    <div className="flex items-start gap-3 relative z-10">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm bg-white/20">
        {React.cloneElement(icon, { size: 24, strokeWidth: 2.2, className: "text-white" })}
      </div>
      <div className="flex-1 mt-0.5 min-w-0">
        <h3 className="text-[12px] font-semibold opacity-90 mb-1 truncate">{title}</h3>
        {loading
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
        <defs><linearGradient id={`dpgrad-${title}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient></defs>
        <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#dpgrad-${title})`} />
        <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
      </svg>
    </div>
  </article>
);

/* ─── Page heading ─── */
const PageHeading = ({ eyebrow, title, description, onRefresh, loading }) => (
  <header className="flex flex-wrap items-end justify-between gap-4">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#39804f]">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-bold text-[#17231c]">{title}</h1>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
    {onRefresh && (
      <button type="button" onClick={onRefresh} disabled={loading} aria-label="Refresh"
        className="grid h-10 w-10 place-items-center rounded-lg border border-[#dce6de] bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
      </button>
    )}
  </header>
);

/* ─── Error / skeleton notice ─── */
const ServiceNotice = ({ error, loading, refresh, noun }) => {
  if (loading) return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="h-28 animate-pulse rounded-xl bg-white" />
      <div className="h-28 animate-pulse rounded-xl bg-white" />
    </div>
  );
  if (error) return (
    <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">{noun} unavailable</p>
      <p className="mt-1">{error}</p>
      {refresh && <button type="button" onClick={refresh} className="mt-3 font-semibold underline">Try again</button>}
    </div>
  );
  return null;
};

/* ─── Pagination ─── */
const Pagination = ({ page, pageCount, setPage, total, label = "records" }) => (
  <div className="mt-4 flex items-center justify-between text-[12px] text-[#666]">
    <span>Showing {Math.min((page-1)*8+1, total)}–{Math.min(page*8, total)} of {total} {label}</span>
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page <= 1} aria-label="Previous"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7e0d8] bg-white text-[#666] disabled:cursor-not-allowed disabled:opacity-40">
        <ChevronLeft size={15} />
      </button>
      {Array.from({ length: pageCount }, (_, i) => i+1).map((p) => (
        <button key={p} type="button" onClick={() => setPage(p)} aria-current={page===p?"page":undefined}
          className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 ${page===p ? "bg-[#FF5A00] text-white" : "border border-[#e7e0d8] bg-white text-[#666] hover:border-orange-200 hover:text-[#FF5A00]"}`}>
          {p}
        </button>
      ))}
      <button type="button" onClick={() => setPage((p) => Math.min(pageCount, p+1))} disabled={page >= pageCount} aria-label="Next"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7e0d8] bg-white text-[#666] disabled:cursor-not-allowed disabled:opacity-40">
        <ChevronRight size={15} />
      </button>
    </div>
  </div>
);

const dateRanges  = ["today","yesterday","this-week","last-week","this-month","last-month","this-year","last-year","custom"];
const rangeLabel  = (v) => ({ today:"Today", yesterday:"Yesterday", "this-week":"This Week", "last-week":"Last Week", "this-month":"This Month", "last-month":"Last Month", "this-year":"This Year", "last-year":"Last Year", custom:"Custom Date" }[v] || v);
const PAGE_SIZE   = 8;

/* ═══════════════════════════════════════════════════════════════
   EARNINGS PAGE
═══════════════════════════════════════════════════════════════ */
const EarningsPage = () => {
  const [range,    setRange]    = useState("this-month");
  const [from,     setFrom]     = useState("");
  const [to,       setTo]       = useState("");
  const [search,   setSearch]   = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [page,     setPage]     = useState(1);

  const params = { range, ...(range === "custom" ? { from, to } : {}) };
  const { resource, loading, error, refresh } = usePartnerResource("/delivery-partner/earnings", params);

  const summary = resource?.summary || resource || {};
  const entries = rowsFrom(resource?.entries || resource?.history || resource?.rows || []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q ? entries : entries.filter((e) =>
      [e.order_id, e.id, e.payment_status].some((v) => String(v||"").toLowerCase().includes(q))
    );
  }, [entries, search]);

  const pageCount   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const displayPage = Math.min(page, pageCount);
  const visible     = filtered.slice((displayPage-1)*PAGE_SIZE, displayPage*PAGE_SIZE);

  const earningsCards = [
    { title: "Today's Earnings",   value: currency(summary.today_earnings  ?? summary.todayEarnings),                                        inc: "8.4%",  icon: <IndianRupee />, bg: "bg-[#22c55e]" },
    { title: "This Week",          value: currency(summary.week_earnings   ?? summary.weekEarnings),                                         inc: "11.2%", icon: <TrendingUp />,  bg: "bg-[#3b82f6]" },
    { title: "This Month",         value: currency(summary.month_earnings  ?? summary.monthEarnings),                                        inc: "15.3%", icon: <WalletCards />, bg: "bg-[#f59e0b]" },
    { title: "Total Earnings",     value: currency(summary.total_earnings  ?? summary.totalEarnings),                                        inc: "20.7%", icon: <Wallet />,      bg: "bg-[#8b5cf6]" },
    { title: "Deliveries Done",    value: String(summary.completed_deliveries ?? summary.completedDeliveries ?? 0),                          inc: "13.1%", icon: <CheckCheck />,  bg: "bg-[#ec4899]" },
    { title: "Cash Collected",     value: currency(summary.cash_collected  ?? summary.cashCollected),                                        inc: "9.5%",  icon: <WalletCards />, bg: "bg-[#06b6d4]" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-2">
      <div className="mx-auto max-w-[1500px]">

        {/* ── PAGE HEADER ── */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#39804f]">Payouts</p>
          <div className="mt-0.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#17231c]">Earnings</h1>
              <p className="mt-0.5 text-sm text-gray-500">Delivery pay and payout history for your account.</p>
            </div>
            <button type="button" onClick={refresh} disabled={loading} aria-label="Refresh"
              className="grid h-10 w-10 place-items-center rounded-lg border border-[#dce6de] bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {earningsCards.map((s) => <StatCard key={s.title} {...s} loading={loading} />)}
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Earnings unavailable</p>
            <p className="mt-1">{error}</p>
            <button type="button" onClick={refresh} className="mt-2 font-semibold underline">Try again</button>
          </div>
        )}

        <div className="rounded-lg border border-[#e7e0d8] bg-gray-100 p-3 shadow-sm">

        <PageHeading eyebrow="Payouts" title="Earnings" description="Delivery pay and payout history for your account." onRefresh={refresh} loading={loading} />

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {earningsCards.map((s) => <StatCard key={s.title} {...s} loading={loading} />)}
        </div>

        <ServiceNotice error={error} loading={false} refresh={refresh} noun="Earnings" />

        <div className="rounded-lg border border-[#e7e0d8] bg-gray-100 p-3 shadow-sm">

          {/* ── FILTERS ── */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              {/* search */}
              <div className="relative w-full max-w-[300px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7a7a]" />
                <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search by order ID…"
                  className="h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-10 pr-3 text-[14px] text-[#2d2d2d] outline-none placeholder:text-[#8a8a8a] focus:border-[#FF5A00]" />
              </div>

              {/* date range */}
              <label className="flex h-[46px] items-center gap-2 rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-sm">
                <CalendarDays size={15} className="text-[#448052]" />
                <select value={range} onChange={(e) => { setRange(e.target.value); setPage(1); }}
                  className="bg-transparent font-medium text-gray-700 outline-none">
                  {dateRanges.map((o) => <option key={o} value={o}>{rangeLabel(o)}</option>)}
                </select>
              </label>

              {range === "custom" && (
                <>
                  <input aria-label="From date" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                    className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-sm" />
                  <input aria-label="To date" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
                    className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-sm" />
                </>
              )}
            </div>

            {/* view toggle */}
            <div className="flex items-center gap-3 lg:shrink-0">
              <div className="flex overflow-hidden rounded-xl border border-[#dfe2e5] bg-[#faf9f8]">
                <button type="button" onClick={() => { setViewMode("table"); setPage(1); }}
                  className={`flex h-[46px] w-[46px] items-center justify-center border-r border-[#dfe2e5] transition ${viewMode==="table" ? "bg-[#FF5A00] text-white" : "text-[#4d4d4d] hover:bg-orange-50 hover:text-[#FF5A00]"}`}
                  aria-label="Table view"><Table2 className="h-4 w-4" /></button>
                <button type="button" onClick={() => { setViewMode("card"); setPage(1); }}
                  className={`flex h-[46px] w-[46px] items-center justify-center transition ${viewMode==="card" ? "bg-[#FF5A00] text-white" : "text-[#4d4d4d] hover:bg-orange-50 hover:text-[#FF5A00]"}`}
                  aria-label="Card view"><LayoutGrid className="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          {/* ── SECTION HEADING ── */}
          <div className="mb-3 border-b border-gray-100 pb-3">
            <h2 className="font-bold text-[#17231c]">Earnings History</h2>
            <p className="mt-1 text-xs text-gray-500">Per-delivery amounts and payment status</p>
          </div>

          {/* ── CARD VIEW ── */}
          {viewMode === "card" && (
            <>
              {!loading && !error && filtered.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#e7e0d8] bg-white p-10 text-center text-[#666]">
                  No earnings history for this period.
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {visible.map((entry, i) => (
                  <article key={entry.order_id || entry.id || i}
                    className="rounded-[18px] border border-[#e7e0d8] bg-white p-4 shadow-[0_1px_0_rgba(16,24,40,0.02)] transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#f4e4d1] text-[#a05c2a]">
                        <IndianRupee className="h-5 w-5" />
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        {entry.payment_status || "—"}
                      </span>
                    </div>
                    <div className="text-[15px] font-semibold text-[#1e1e1e]">{entry.order_id || entry.id || "—"}</div>
                    <div className="mt-1 text-[13px] text-[#646464]">{entry.date ? new Date(entry.date).toLocaleDateString("en-IN") : "—"}</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                      <div><span className="text-gray-500">Base</span><div className="font-semibold">{currency(entry.base_charge)}</div></div>
                      <div><span className="text-gray-500">Extra</span><div className="font-semibold">{currency(entry.extra_charge)}</div></div>
                      <div><span className="text-gray-500">Incentive</span><div className="font-semibold">{currency(entry.incentive)}</div></div>
                      <div><span className="text-gray-500">Distance</span><div className="font-semibold">{entry.distance_km ?? entry.distance ?? "—"} km</div></div>
                    </div>
                    <div className="mt-3 border-t border-[#f0ebe4] pt-3 flex items-center justify-between">
                      <span className="text-[12px] text-gray-500">Total</span>
                      <span className="text-[16px] font-extrabold text-[#21643a]">{currency(entry.total_earnings ?? entry.total)}</span>
                    </div>
                  </article>
                ))}
              </div>
              {filtered.length > 0 && <Pagination page={displayPage} pageCount={pageCount} setPage={setPage} total={filtered.length} label="entries" />}
            </>
          )}

          {/* ── TABLE VIEW ── */}
          {viewMode === "table" && (
            <>
              <div className="overflow-x-auto rounded-[16px] border border-[#e8e4df]">
                <table className="w-full min-w-[760px] border-collapse bg-white text-left">
                  <thead className="bg-orange-50 text-left text-sm font-semibold text-orange-700 border-b border-orange-100">
                    <tr>
                      {["S.No","Order","Date","Distance","Base","Extra","Incentive","Total","Payment"].map((h) => (
                        <th key={h} className="px-4 py-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((entry, i) => (
                      <tr key={entry.order_id||entry.id||i} className="border-t border-[#efefef] text-[13px] text-[#444444]">
                        <td className="px-4 py-4 font-medium text-[#2d2d2d]">{(displayPage-1)*PAGE_SIZE+i+1}</td>
                        <td className="px-4 py-4 font-semibold">{entry.order_id || entry.id || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-gray-500">{entry.date ? new Date(entry.date).toLocaleDateString("en-IN") : "—"}</td>
                        <td className="px-4 py-4">{entry.distance_km ?? entry.distance ?? "—"} km</td>
                        <td className="px-4 py-4">{currency(entry.base_charge)}</td>
                        <td className="px-4 py-4">{currency(entry.extra_charge)}</td>
                        <td className="px-4 py-4">{currency(entry.incentive)}</td>
                        <td className="px-4 py-4 font-bold text-[#21643a]">{currency(entry.total_earnings ?? entry.total)}</td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center rounded-full bg-[#eaf7ef] px-2.5 py-1 text-[11px] font-medium text-[#2b7a4b]">
                            <span className="mr-1.5 h-2 w-2 rounded-full bg-[#2b7a4b]" />{entry.payment_status || "—"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!loading && !error && filtered.length === 0 && (
                      <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-500">Earnings history will appear after completed deliveries.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filtered.length > 0 && <Pagination page={displayPage} pageCount={pageCount} setPage={setPage} total={filtered.length} label="entries" />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   DELIVERY HISTORY PAGE
═══════════════════════════════════════════════════════════════ */
const DeliveryHistoryPage = () => {
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("All");
  const [sortBy,   setSortBy]   = useState("newest");
  const [from,     setFrom]     = useState("");
  const [to,       setTo]       = useState("");
  const [page,     setPage]     = useState(1);
  const [viewMode, setViewMode] = useState("table");

  const { resource, loading, error, refresh } = usePartnerResource("/delivery-partner/history", { from, to });
  const entries = rowsFrom(resource?.deliveries || resource?.items || resource);
  const summary = resource?.summary || {};

  const filtered = useMemo(() => {
    let list = entries.filter((entry) => {
      const q         = search.toLowerCase();
      const entryStatus = String(entry.status || entry.order_status || "").toLowerCase();
      const date      = String(entry.date || entry.created_at || "").slice(0, 10);
      return (
        (!q || [entry.order_id, entry.customer_name, entry.restaurant_name].some((v) => String(v||"").toLowerCase().includes(q))) &&
        (status === "All" || entryStatus === status.toLowerCase()) &&
        (!from || date >= from) && (!to || date <= to)
      );
    });
    if (sortBy === "newest") list = [...list].sort((a,b) => new Date(b.date||b.created_at||0) - new Date(a.date||a.created_at||0));
    if (sortBy === "oldest") list = [...list].sort((a,b) => new Date(a.date||a.created_at||0) - new Date(b.date||b.created_at||0));
    if (sortBy === "earn-high") list = [...list].sort((a,b) => Number(b.earnings??b.delivery_charge??0) - Number(a.earnings??a.delivery_charge??0));
    return list;
  }, [entries, from, search, sortBy, status, to]);

  const pageCount   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const displayPage = Math.min(page, pageCount);
  const visible     = filtered.slice((displayPage-1)*PAGE_SIZE, displayPage*PAGE_SIZE);

  const totalDelivered  = summary.completed ?? entries.filter((r) => (r.status||"").toLowerCase() === "delivered").length;
  const totalCancelled  = summary.cancelled ?? entries.filter((r) => (r.status||"").toLowerCase() === "cancelled").length;
  const totalFailed     = summary.failed    ?? entries.filter((r) => (r.status||"").toLowerCase() === "failed").length;
  const totalEarnings   = entries.reduce((s, r) => s + Number(r.earnings ?? r.delivery_charge ?? 0), 0);

  const statCards = [
    { title: "Completed",      value: String(totalDelivered), inc: "14.2%", icon: <CheckCheck />,  bg: "bg-[#22c55e]" },
    { title: "Cancelled",      value: String(totalCancelled), inc: "3.1%",  icon: <FileText />,    bg: "bg-[#f59e0b]" },
    { title: "Failed",         value: String(totalFailed),    inc: "1.4%",  icon: <CircleHelp />,  bg: "bg-[#ef4444]" },
    { title: "Total Earnings", value: currency(totalEarnings),inc: "18.6%", icon: <WalletCards />, bg: "bg-[#8b5cf6]" },
  ];

  const statusBadge = (s) => {
    const sl = String(s||"").toLowerCase();
    if (sl === "delivered" || sl === "completed") return "bg-[#eaf7ef] text-[#2b7a4b]";
    if (sl === "cancelled") return "bg-[#fdf1f1] text-[#b85c5c]";
    if (sl === "failed")    return "bg-rose-50 text-rose-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-2">
      <div className="mx-auto max-w-[1500px] space-y-6">

        <PageHeading eyebrow="Completed work" title="Delivery History" description="Completed, cancelled, and failed deliveries assigned to you." onRefresh={refresh} loading={loading} />

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((s) => <StatCard key={s.title} {...s} loading={loading} />)}
        </div>

        <ServiceNotice error={error} loading={false} refresh={refresh} noun="History" />

        <div className="rounded-lg border border-[#e7e0d8] bg-gray-100 p-3 shadow-sm">

          {/* ── FILTERS ── */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              {/* search */}
              <div className="relative w-full max-w-[340px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7a7a]" />
                <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search order, customer, restaurant…"
                  className="h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-10 pr-3 text-[14px] text-[#2d2d2d] outline-none placeholder:text-[#8a8a8a] focus:border-[#FF5A00]" />
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
                {/* status filter */}
                <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                  className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#FF5A00]">
                  <option>All</option>
                  <option>Delivered</option>
                  <option>Cancelled</option>
                  <option>Failed</option>
                </select>

                {/* date from */}
                <label className="flex h-[46px] items-center gap-2 rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-xs text-gray-500">
                  <CalendarDays size={14} /><span>From</span>
                  <input aria-label="History from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                    className="max-w-32 bg-transparent text-gray-700 outline-none" />
                </label>

                {/* date to */}
                <label className="flex h-[46px] items-center gap-2 rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-xs text-gray-500">
                  <span>To</span>
                  <input aria-label="History to" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
                    className="max-w-32 bg-transparent text-gray-700 outline-none" />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 lg:shrink-0">
              {/* sort */}
              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#FF5A00]">
                <option value="newest">Sort by: Newest</option>
                <option value="oldest">Oldest First</option>
                <option value="earn-high">Earnings: High to Low</option>
              </select>

              {/* view toggle */}
              <div className="flex overflow-hidden rounded-xl border border-[#dfe2e5] bg-[#faf9f8]">
                <button type="button" onClick={() => { setViewMode("table"); setPage(1); }}
                  className={`flex h-[46px] w-[46px] items-center justify-center border-r border-[#dfe2e5] transition ${viewMode==="table" ? "bg-[#FF5A00] text-white" : "text-[#4d4d4d] hover:bg-orange-50 hover:text-[#FF5A00]"}`}
                  aria-label="Table view"><Table2 className="h-4 w-4" /></button>
                <button type="button" onClick={() => { setViewMode("card"); setPage(1); }}
                  className={`flex h-[46px] w-[46px] items-center justify-center transition ${viewMode==="card" ? "bg-[#FF5A00] text-white" : "text-[#4d4d4d] hover:bg-orange-50 hover:text-[#FF5A00]"}`}
                  aria-label="Card view"><LayoutGrid className="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          {/* ── CARD VIEW ── */}
          {viewMode === "card" && (
            <>
              {!loading && !error && filtered.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#e7e0d8] bg-white p-10 text-center text-[#666]">
                  No delivery history for these filters.
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {visible.map((entry, i) => (
                  <article key={entry.order_id||entry.id||i}
                    className="rounded-[18px] border border-[#e7e0d8] bg-white p-4 shadow-[0_1px_0_rgba(16,24,40,0.02)] transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-500">{entry.order_id || entry.id || "—"}</p>
                        <p className="mt-1 font-semibold text-gray-900">{entry.customer_name || "Customer"}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadge(entry.status || entry.order_status)}`}>
                        {entry.status || entry.order_status || "—"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">{entry.restaurant_name || entry.chef_name || "Restaurant"}</p>
                    <div className="mt-2 space-y-1 border-l border-[#d9e5db] pl-3 text-xs text-gray-500">
                      <p>Pickup · {entry.pickup_address || "—"}</p>
                      <p>Drop-off · {entry.delivery_address || "—"}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-gray-500">{entry.date || entry.created_at ? new Date(entry.date || entry.created_at).toLocaleDateString("en-IN") : "—"}</span>
                      <span className="font-bold text-[#21643a]">{currency(entry.earnings ?? entry.delivery_charge)}</span>
                    </div>
                  </article>
                ))}
              </div>
              {filtered.length > 0 && <Pagination page={displayPage} pageCount={pageCount} setPage={setPage} total={filtered.length} />}
            </>
          )}

          {/* ── TABLE VIEW ── */}
          {viewMode === "table" && (
            <>
              <div className="overflow-x-auto rounded-[16px] border border-[#e8e4df]">
                <table className="w-full min-w-[850px] border-collapse bg-white text-left">
                  <thead className="bg-orange-50 text-left text-sm font-semibold text-orange-700 border-b border-orange-100">
                    <tr>
                      {["S.No","Order","Customer","Restaurant","Pickup","Drop-off","Date","Status","Earnings"].map((h) => (
                        <th key={h} className="px-4 py-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((entry, i) => (
                      <tr key={entry.order_id||entry.id||i} className="border-t border-[#efefef] text-[13px] text-[#444444]">
                        <td className="px-4 py-4 font-medium text-[#2d2d2d]">{(displayPage-1)*PAGE_SIZE+i+1}</td>
                        <td className="px-4 py-4 font-semibold">{entry.order_id || entry.id || "—"}</td>
                        <td className="px-4 py-4">{entry.customer_name || "—"}</td>
                        <td className="px-4 py-4">{entry.restaurant_name || entry.chef_name || "—"}</td>
                        <td className="max-w-40 truncate px-4 py-4 text-gray-500">{entry.pickup_address || "—"}</td>
                        <td className="max-w-40 truncate px-4 py-4 text-gray-500">{entry.delivery_address || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-gray-500">
                          {entry.date || entry.created_at ? new Date(entry.date||entry.created_at).toLocaleString("en-IN") : "—"}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${statusBadge(entry.status || entry.order_status)}`}>
                            <span className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: "currentColor" }} />
                            {entry.status || entry.order_status || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-semibold text-[#21643a]">{currency(entry.earnings ?? entry.delivery_charge)}</td>
                      </tr>
                    ))}
                    {!loading && !error && filtered.length === 0 && (
                      <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-500">No delivery history for these filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filtered.length > 0 && <Pagination page={displayPage} pageCount={pageCount} setPage={setPage} total={filtered.length} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   PROFILE PAGE (unchanged in structure, light cleanup)
═══════════════════════════════════════════════════════════════ */
const ProfilePage = () => {
  const { userProfile, logout } = useAuth();
  const { resource, loading, error, refresh } = usePartnerResource("/delivery-partner/profile");
  const profile = resource?.profile || resource?.partner || resource || EMPTY_PROFILE;
  const [editing,       setEditing]       = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [bankOpen,      setBankOpen]      = useState(false);
  const [passwordOpen,  setPasswordOpen]  = useState(false);
  const [logoutOpen,    setLogoutOpen]    = useState(false);
  const [form,          setForm]          = useState({});
  const updateField = (e) => setForm((v) => ({ ...v, [e.target.name]: e.target.value }));
  const startEditing = () => {
    setForm({ full_name: profile.full_name||profile.name||userProfile?.displayName||"", phone_number: profile.phone_number||userProfile?.phone||"", email: profile.email||userProfile?.email||"", address: profile.address||"", vehicle_type: profile.vehicle_type||"", vehicle_number: profile.vehicle_number||"" });
    setEditing(true);
  };
  const saveProfile = async (e) => { e.preventDefault(); setSaving(true); try { await api.patch("/delivery-partner/profile", form); toast.success("Profile updated"); setEditing(false); refresh(); } catch (err) { toast.error(err?.response?.data?.message || "Profile updates are unavailable."); } finally { setSaving(false); } };

  return (
    <section className="space-y-5">
      <PageHeading eyebrow="Your account" title="Profile" description="Personal and vehicle information for your delivery account." onRefresh={refresh} loading={loading} />
      <ServiceNotice error={error} loading={false} refresh={refresh} noun="Profile" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-xl border border-[#e2e9e3] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e5f2e8] text-xl font-bold text-[#23633a]">
                {(profile.profile_photo_url||profile.photo_url||profile.avatar_url)
                  ? <img src={profile.profile_photo_url||profile.photo_url||profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  : (profile.full_name||userProfile?.displayName||"D").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold">{profile.full_name||profile.name||userProfile?.displayName||"Delivery Partner"}</p>
                <p className="mt-1 text-xs text-gray-500">{profile.account_status||profile.status||"Account details"}</p>
              </div>
            </div>
            <button type="button" onClick={editing ? () => setEditing(false) : startEditing}
              className="rounded-lg border border-[#dce6de] px-3 py-2 text-sm font-semibold text-[#21643a]">
              {editing ? "Cancel edit" : "Edit profile"}
            </button>
          </div>
          {editing
            ? <form onSubmit={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
                {[["full_name","Full name"],["phone_number","Mobile number"],["email","Email"],["address","Address"],["vehicle_type","Vehicle type"],["vehicle_number","Vehicle number"]].map(([name, label]) => (
                  <label key={name} className="text-xs font-semibold text-gray-600">{label}
                    <input name={name} value={form[name]||""} onChange={updateField} type={name==="email"?"email":"text"} className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal text-gray-800 outline-none focus:border-[#4a8b5a]" />
                  </label>
                ))}
                <div className="sm:col-span-2">
                  <button disabled={saving} className="rounded-lg bg-[#21643a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save profile"}</button>
                </div>
              </form>
            : <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                {[["Full name",profile.full_name||profile.name||userProfile?.displayName],["Mobile number",profile.phone_number||userProfile?.phone],["Email",profile.email||userProfile?.email],["Address",profile.address],["Vehicle type",profile.vehicle_type],["Vehicle number",profile.vehicle_number]].map(([label, value]) => (
                  <div key={label}><dt className="text-xs font-medium text-gray-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-gray-800">{value||"Not provided"}</dd></div>
                ))}
              </dl>
          }
        </div>
        <aside className="space-y-3">
          <div className="rounded-xl border border-[#e2e9e3] bg-white p-4">
            <div className="flex items-center gap-2"><ShieldCheck size={17} className="text-[#39804f]" /><h2 className="text-sm font-bold">Verification</h2></div>
            <p className="mt-3 text-sm text-gray-600">Driving license and ID documents are kept private.</p>
            <p className="mt-3 text-xs font-semibold text-gray-500">Account status: {profile.account_status||profile.status||"—"}</p>
          </div>
          <div className="rounded-xl border border-[#e2e9e3] bg-white p-4">
            <div className="flex items-center gap-2"><LockKeyhole size={17} className="text-[#39804f]" /><h2 className="text-sm font-bold">Bank details</h2></div>
            <p className="mt-3 text-sm text-gray-600">{profile.bank_account_last4||profile.account_last_four ? `Account ending in •••• ${profile.bank_account_last4||profile.account_last_four}` : "Bank details are securely stored."}</p>
            <button type="button" onClick={() => setBankOpen(true)} className="mt-3 text-sm font-semibold text-[#21643a]">Update bank details</button>
          </div>
          <button type="button" onClick={() => setPasswordOpen(true)} className="w-full rounded-lg border border-[#dce6de] bg-white px-4 py-3 text-left text-sm font-semibold text-gray-700">Change password</button>
          <button type="button" onClick={() => setLogoutOpen(true)} className="w-full rounded-lg border border-rose-200 bg-white px-4 py-3 text-left text-sm font-semibold text-rose-700">Log out</button>
        </aside>
      </div>
      {bankOpen     && <BankDetailsDialog   onClose={() => setBankOpen(false)} />}
      {passwordOpen && <ChangePasswordDialog onClose={() => setPasswordOpen(false)} />}
      {logoutOpen   && <LogoutConfirmModal   onCancel={() => setLogoutOpen(false)} onConfirm={logout} />}
    </section>
  );
};

/* ─── Password dialog ─── */
const ChangePasswordDialog = ({ onClose }) => {
  const [values,  setValues]  = useState({ current_password:"", new_password:"", confirm_password:"" });
  const [saving,  setSaving]  = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (values.new_password !== values.confirm_password) { toast.error("The new passwords do not match."); return; }
    setSaving(true);
    try { await api.post("/delivery-partner/password", { current_password: values.current_password, new_password: values.new_password }); toast.success("Password updated"); onClose(); }
    catch (err) { toast.error(err?.response?.data?.message || "Password updates are unavailable."); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
        <h2 className="font-bold">Change password</h2>
        <div className="mt-4 space-y-3">
          {[["current_password","Current password"],["new_password","New password"],["confirm_password","Confirm new password"]].map(([name, label]) => (
            <label key={name} className="block text-xs font-semibold text-gray-600">{label}
              <input required minLength={8} type="password" autoComplete="new-password" value={values[name]} onChange={(e) => setValues((cur) => ({ ...cur, [name]: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal" />
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">Cancel</button>
          <button disabled={saving} className="rounded-lg bg-[#21643a] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Update password"}</button>
        </div>
      </form>
    </div>
  );
};

/* ─── Bank details dialog ─── */
const BankDetailsDialog = ({ onClose }) => {
  const [values, setValues] = useState({ account_holder_name:"", bank_name:"", account_number:"", ifsc_code:"", upi_id:"" });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => { e.preventDefault(); setSaving(true); try { await api.patch("/delivery-partner/profile/bank", values); toast.success("Bank details updated securely"); onClose(); } catch (err) { toast.error(err?.response?.data?.message || "Bank detail updates are unavailable."); } finally { setSaving(false); } };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between"><h2 className="font-bold">Update bank details</h2><LockKeyhole size={18} className="text-[#39804f]" /></div>
        <p className="mt-1 text-xs text-gray-500">Account number is masked while you type and sent only to the secure profile service.</p>
        <div className="mt-4 space-y-3">
          {[["account_holder_name","Account holder"],["bank_name","Bank name"],["account_number","Account number"],["ifsc_code","IFSC code"],["upi_id","UPI ID (optional)"]].map(([name, label]) => (
            <label key={name} className="block text-xs font-semibold text-gray-600">{label}
              <input required={!name.includes("upi")} type={name==="account_number"?"password":"text"} autoComplete="off" value={values[name]} onChange={(e) => setValues((cur) => ({ ...cur, [name]: e.target.value }))} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#4a8b5a]" />
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">Cancel</button>
          <button disabled={saving} className="rounded-lg bg-[#21643a] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save securely"}</button>
        </div>
      </form>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   SUPPORT PAGE (unchanged)
═══════════════════════════════════════════════════════════════ */
const SupportPage = () => {
  const { resource, loading, error, refresh } = usePartnerResource("/delivery-partner/support");
  const tickets = rowsFrom(resource?.tickets || resource);
  const [form,       setForm]       = useState({ issue_type:"Order Issue", order_id:"", description:"", attachment: null });
  const [submitting, setSubmitting] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) { toast.error("Describe the issue before submitting."); return; }
    const payload = new FormData();
    payload.append("issue_type",   form.issue_type);
    payload.append("order_id",     form.order_id);
    payload.append("description",  form.description);
    if (form.attachment) payload.append("attachment", form.attachment);
    setSubmitting(true);
    try { await api.post("/delivery-partner/support", payload); toast.success("Support request submitted"); setForm({ issue_type:"Order Issue", order_id:"", description:"", attachment: null }); refresh(); }
    catch (err) { toast.error(err?.response?.data?.message || "Support requests are unavailable."); }
    finally { setSubmitting(false); }
  };
  return (
    <section className="space-y-5">
      <PageHeading eyebrow="Help & support" title="Support" description="Contact the operations team about an order, payment, or app issue." onRefresh={refresh} loading={loading} />
      <ServiceNotice error={error} loading={false} refresh={refresh} noun="Support tickets" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
        <form onSubmit={submit} className="rounded-xl border border-[#e2e9e3] bg-white p-5">
          <div className="flex items-center gap-2"><MessageSquareText size={18} className="text-[#39804f]" /><h2 className="font-bold">Report an issue</h2></div>
          <label className="mt-4 block text-xs font-semibold text-gray-600">Issue type
            <select value={form.issue_type} onChange={(e) => setForm((c) => ({ ...c, issue_type: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal">
              <option>Order Issue</option><option>Customer Issue</option><option>Payment Issue</option><option>Technical Support</option><option>Other</option>
            </select>
          </label>
          <label className="mt-3 block text-xs font-semibold text-gray-600">Order ID (optional)
            <input value={form.order_id} onChange={(e) => setForm((c) => ({ ...c, order_id: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal" />
          </label>
          <label className="mt-3 block text-xs font-semibold text-gray-600">Description
            <textarea required rows={4} value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} className="mt-1.5 w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal" placeholder="Tell us what happened" />
          </label>
          <label className="mt-3 flex items-center gap-2 text-xs font-medium text-gray-600">
            <FileText size={15} /><span>Attach image or document</span>
            <input type="file" accept="image/*,.pdf" onChange={(e) => setForm((c) => ({ ...c, attachment: e.target.files?.[0] || null }))} className="max-w-52 text-xs" />
          </label>
          <button disabled={submitting} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#21643a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            <Send size={15} />{submitting ? "Submitting..." : "Submit ticket"}
          </button>
        </form>
        <div className="rounded-xl border border-[#e2e9e3] bg-white">
          <div className="border-b border-gray-100 p-4"><h2 className="font-bold">Previous tickets</h2><p className="mt-1 text-xs text-gray-500">Replies from support appear alongside your tickets.</p></div>
          <div className="divide-y divide-gray-100">
            {tickets.map((ticket, i) => (
              <article key={ticket.ticket_id||ticket.id||i} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs font-semibold text-gray-500">{ticket.ticket_id||ticket.id}</p><h3 className="mt-1 text-sm font-bold">{ticket.subject||ticket.issue_type||"Support request"}</h3></div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">{ticket.status||"Open"}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{ticket.admin_response||ticket.response||"Awaiting support response."}</p>
                <p className="mt-2 text-xs text-gray-400">{ticket.created_at ? new Date(ticket.created_at).toLocaleDateString("en-IN") : ""}</p>
              </article>
            ))}
            {!loading && !error && tickets.length === 0 && <p className="px-4 py-12 text-center text-sm text-gray-500">No support tickets yet.</p>}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════════════════
   ROUTER
═══════════════════════════════════════════════════════════════ */
const DeliveryPartnerPages = ({ section }) => {
  if (section === "earnings") return <EarningsPage />;
  if (section === "history")  return <DeliveryHistoryPage />;
  if (section === "profile")  return <ProfilePage />;
  if (section === "support")  return <SupportPage />;
  return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Page not found.</div>;
};

export default DeliveryPartnerPages;
