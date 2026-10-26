import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bike,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutGrid,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  Table2,
  X,
  XCircle,
} from "lucide-react";
import api from "../api";
import toast from "react-hot-toast";

const normalizeStatus = (status) =>
  String(status || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

const orderViews = {
  new:      { title: "New Orders",      statuses: ["NEW", "NEW_ORDER", "PENDING", "ORDER_PLACED"] },
  all:      { title: "All Orders",      statuses: null },
  delivery: { title: "Delivery Orders", statuses: ["ASSIGNED", "ACCEPTED", "REACHED_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY", "REACHED_CUSTOMER", "SHIPPED"] },
  cancelled:{ title: "Cancelled Orders",statuses: ["CANCELLED"] },
};

const statusFlow   = ["ASSIGNED","ACCEPTED","REACHED_PICKUP","PICKED_UP","OUT_FOR_DELIVERY","REACHED_CUSTOMER","DELIVERED"];
const statusLabels = {
  ASSIGNED:"Assigned", ACCEPTED:"Accepted", REACHED_PICKUP:"Reached pickup",
  PICKED_UP:"Picked up", OUT_FOR_DELIVERY:"Out for delivery",
  REACHED_CUSTOMER:"Reached customer", DELIVERED:"Delivered", COMPLETED:"Delivered",
  CANCELLED:"Cancelled", NEW:"New", NEW_ORDER:"New", ORDER_PLACED:"Order placed", PENDING:"New",
};
const nextStatus = {
  ASSIGNED:"ACCEPTED", ACCEPTED:"REACHED_PICKUP", REACHED_PICKUP:"PICKED_UP",
  PICKED_UP:"OUT_FOR_DELIVERY", OUT_FOR_DELIVERY:"REACHED_CUSTOMER", REACHED_CUSTOMER:"DELIVERED",
};

const formatDate = (value, options = { dateStyle:"medium", timeStyle:"short" }) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", options);
};

const statusClass = (status) => {
  const s = normalizeStatus(status);
  if (["DELIVERED","COMPLETED"].includes(s))                                                        return "bg-emerald-50 text-emerald-700";
  if (s === "CANCELLED")                                                                             return "bg-rose-50 text-rose-700";
  if (["PICKED_UP","OUT_FOR_DELIVERY","REACHED_CUSTOMER"].includes(s))                              return "bg-sky-50 text-sky-700";
  if (["ASSIGNED","ACCEPTED","REACHED_PICKUP","NEW","NEW_ORDER","PENDING","ORDER_PLACED"].includes(s)) return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
};

const getItems = (order) => {
  const value = order.items || order.food_items || order.order_items || [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") { try { const p = JSON.parse(value); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};

const orderId        = (order) => order.order_id || order.id || "Order";
const canMarkDeliver = (order) => normalizeStatus(order.order_status) === "REACHED_CUSTOMER";

const getLocationUrl = (address, lat, lng) =>
  lat && lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || "")}`;

/* ─── Stat card (matches admin categories style) ─── */
const StatCard = ({ title, value, inc, icon, bg }) => (
  <article className={`relative min-w-0 overflow-hidden rounded-xl border border-transparent p-4 sm:p-5 shadow-[0_2px_10px_rgba(20,56,34,0.04)] flex flex-col justify-between min-h-[140px] ${bg} text-white`}>
    <div className="flex items-start gap-3 relative z-10">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm bg-white/20">
        {React.cloneElement(icon, { size: 24, strokeWidth: 2.2, className: "text-white" })}
      </div>
      <div className="flex-1 mt-0.5 min-w-0">
        <h3 className="text-[12px] font-semibold opacity-90 mb-1 truncate">{title}</h3>
        <div className="text-[22px] sm:text-[25px] font-extrabold leading-none tracking-tight truncate">{value}</div>
      </div>
    </div>
    <div className="flex items-center gap-2 mt-5 relative z-10">
      <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold bg-white/25">↑ {inc}</span>
      <span className="text-[11px] font-medium opacity-75 truncate">from last month</span>
    </div>
    <div className="absolute right-0 bottom-0 w-24 h-16 pointer-events-none opacity-50">
      <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
        <defs><linearGradient id={`dlvgrad-${title}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" /><stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient></defs>
        <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#dlvgrad-${title})`} />
        <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
      </svg>
    </div>
  </article>
);

/* ─── Pagination ─── */
const Pagination = ({ page, pageCount, setPage }) => (
  <div className="mt-4 flex items-center justify-between text-[12px] text-[#666]">
    <span>Page {page} of {pageCount}</span>
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous page"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7e0d8] bg-white text-[#666] disabled:cursor-not-allowed disabled:opacity-40">
        <ChevronLeft size={15} />
      </button>
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
        <button key={p} type="button" onClick={() => setPage(p)} aria-current={page === p ? "page" : undefined} aria-label={`Page ${p}`}
          className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 ${page === p ? "bg-[#FF5A00] text-white" : "border border-[#e7e0d8] bg-white text-[#666] hover:border-orange-200 hover:text-[#FF5A00]"}`}>
          {p}
        </button>
      ))}
      <button type="button" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount} aria-label="Next page"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7e0d8] bg-white text-[#666] disabled:cursor-not-allowed disabled:opacity-40">
        <ChevronRight size={15} />
      </button>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
const DeliveryOrdersPage = ({ view = "all" }) => {
  const [orders,        setOrders]        = useState([]);
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState("All Status");
  const [sortBy,        setSortBy]        = useState("latest");
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const [page,          setPage]          = useState(1);
  const [viewMode,      setViewMode]      = useState("card");
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [refreshKey,    setRefreshKey]    = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pendingStatus, setPendingStatus] = useState("");
  const [updating,      setUpdating]      = useState(false);

  const PAGE_SIZE = 8;
  const config    = orderViews[view] || orderViews.all;

  /* ── fetch ── */
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError("");
      try {
        const res = await api.get("/delivery-partner/orders");
        if (!active) return;
        const result = res.data?.orders || res.data?.data;
        setOrders(Array.isArray(result) ? result : []);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "Assigned orders are temporarily unavailable.");
        setOrders([]);
      } finally { if (active) setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [refreshKey]);

  /* ── counts for stat cards ── */
  const countByStatuses = (statuses) =>
    orders.filter((o) => statuses.includes(normalizeStatus(o.order_status))).length;

  const statCards = [
    { title: "New Orders",        value: countByStatuses(["NEW","NEW_ORDER","PENDING","ORDER_PLACED"]),                                                           inc: "8.2%",  icon: <Clock3 />,      bg: "bg-[#ec4899]" },
    { title: "Active Deliveries", value: countByStatuses(["ASSIGNED","ACCEPTED","REACHED_PICKUP","PICKED_UP","OUT_FOR_DELIVERY","REACHED_CUSTOMER","SHIPPED"]),    inc: "12.4%", icon: <Bike />,        bg: "bg-[#3b82f6]" },
    { title: "Delivered",         value: countByStatuses(["DELIVERED","COMPLETED"]),                                                                               inc: "15.3%", icon: <CheckCircle2 />,bg: "bg-[#8b5cf6]" },
    { title: "Cancelled",         value: countByStatuses(["CANCELLED"]),                                                                                           inc: "3.1%",  icon: <XCircle />,     bg: "bg-[#f59e0b]" },
  ];

  /* ── filter & sort ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = orders.filter((o) => {
      const ns = normalizeStatus(o.order_status);
      const matchesView   = !config.statuses || config.statuses.includes(ns);
      const date          = new Date(o.order_date || o.created_at || "");
      const dk            = Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
      const matchesDate   = (!dateFrom || dk >= dateFrom) && (!dateTo || dk <= dateTo);
      const matchesSearch = !q || [orderId(o), o.customer_name, o.customer?.name].some((v) => String(v||"").toLowerCase().includes(q));
      const matchesStatus = statusFilter === "All Status" || statusLabels[ns]?.toLowerCase() === statusFilter.toLowerCase();
      return matchesView && matchesDate && matchesSearch && matchesStatus;
    });
    if (sortBy === "newest") list = [...list].sort((a,b) => new Date(b.order_date||b.created_at||0) - new Date(a.order_date||a.created_at||0));
    if (sortBy === "oldest") list = [...list].sort((a,b) => new Date(a.order_date||a.created_at||0) - new Date(b.order_date||b.created_at||0));
    if (sortBy === "amount-high") list = [...list].sort((a,b) => Number(b.total_amount||0) - Number(a.total_amount||0));
    if (sortBy === "amount-low")  list = [...list].sort((a,b) => Number(a.total_amount||0) - Number(b.total_amount||0));
    return list;
  }, [config.statuses, dateFrom, dateTo, orders, search, statusFilter, sortBy]);

  const pageCount    = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const displayPage  = Math.min(page, pageCount);
  const visibleOrders = filtered.slice((displayPage-1)*PAGE_SIZE, displayPage*PAGE_SIZE);

  /* ── status update ── */
  const updateOrderStatus = async () => {
    if (!selectedOrder || !pendingStatus) return;
    setUpdating(true);
    try {
      const res = await api.patch(`/delivery-partner/orders/${encodeURIComponent(orderId(selectedOrder))}/status`, { status: pendingStatus });
      const updated = res.data?.order || res.data?.data;
      setOrders((cur) => cur.map((o) => orderId(o) === orderId(selectedOrder) ? { ...o, ...(updated||{}), order_status: updated?.order_status || pendingStatus } : o));
      setSelectedOrder((cur) => cur ? { ...cur, ...(updated||{}), order_status: updated?.order_status || pendingStatus } : cur);
      toast.success(`Order marked ${statusLabels[pendingStatus]?.toLowerCase() || pendingStatus.toLowerCase()}`);
      setPendingStatus("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update this delivery.");
    } finally { setUpdating(false); }
  };

  /* ── card view ── */
  const renderCard = (order) => (
    <article key={orderId(order)} className="rounded-[18px] border border-[#e7e0d8] bg-white p-4 shadow-[0_1px_0_rgba(16,24,40,0.02)] transition hover:-translate-y-0.5 hover:shadow-md">
      <button type="button" onClick={() => setSelectedOrder(order)} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-500">{orderId(order)}</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{order.customer_name || order.customer?.name || "Customer"}</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(order.order_status)}`}>
            {statusLabels[normalizeStatus(order.order_status)] || order.order_status || "New"}
          </span>
        </div>
        <div className="mt-3 space-y-1.5 border-l border-[#d9e5db] pl-3 text-xs text-gray-600">
          <p><span className="font-semibold text-gray-800">Pickup</span> · {order.restaurant_name || order.chef_name || order.pickup_address || "Pickup pending"}</p>
          <p><span className="font-semibold text-gray-800">Drop-off</span> · {order.delivery_address || order.dropoff_address || "Delivery pending"}</p>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-gray-500">{formatDate(order.order_date || order.created_at)}</span>
          <span className="font-semibold text-[#21643a]">₹{Number(order.delivery_charge||0).toLocaleString("en-IN")} delivery</span>
        </div>
      </button>
      {canMarkDeliver(order) && (
        <button type="button" onClick={() => { setSelectedOrder(order); setPendingStatus("DELIVERED"); }}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1f6a3b] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#195a31]">
          <CheckCircle2 size={16} /> Mark delivered
        </button>
      )}
    </article>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-2">
      <div className="mx-auto max-w-[1500px]">

        {/* ── STAT CARDS ── */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((s) => <StatCard key={s.title} {...s} value={String(s.value)} />)}
        </div>

        <div className="rounded-lg border border-[#e7e0d8] bg-gray-100 p-3 shadow-sm">

          {/* ── HEADER ── */}
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#39754a]">Deliveries</p>
            <h1 className="mt-0.5 text-xl font-bold text-[#17231c]">{config.title}</h1>
            <p className="mt-0.5 text-sm text-gray-500">Only orders assigned to your account appear here.</p>
          </div>

          {/* ── FILTERS ── */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              {/* search */}
              <div className="relative w-full max-w-[340px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7a7a]" />
                <input type="text" value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search order or customer…"
                  className="h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-10 pr-3 text-[14px] text-[#2d2d2d] outline-none placeholder:text-[#8a8a8a] focus:border-[#FF5A00]" />
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
                {/* status */}
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#FF5A00]">
                  <option>All Status</option>
                  <option>New</option>
                  <option>Assigned</option>
                  <option>Accepted</option>
                  <option>Picked up</option>
                  <option>Out for delivery</option>
                  <option>Delivered</option>
                  <option>Cancelled</option>
                </select>

                {/* date from */}
                <label className="flex h-[46px] items-center gap-2 rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-xs text-gray-500">
                  <CalendarDays size={14} /><span>From</span>
                  <input aria-label="Date from" type="date" value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                    className="max-w-32 bg-transparent text-gray-700 outline-none" />
                </label>

                {/* date to */}
                <label className="flex h-[46px] items-center gap-2 rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-xs text-gray-500">
                  <span>To</span>
                  <input aria-label="Date to" type="date" value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                    className="max-w-32 bg-transparent text-gray-700 outline-none" />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 lg:shrink-0">
              {/* sort */}
              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#FF5A00]">
                <option value="latest">Sort by: Latest</option>
                <option value="oldest">Oldest First</option>
                <option value="amount-high">Amount: High to Low</option>
                <option value="amount-low">Amount: Low to High</option>
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

              {/* refresh */}
              <button type="button" onClick={() => setRefreshKey((k) => k+1)} disabled={loading}
                className="inline-flex h-[46px] items-center gap-2 rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-4 text-[14px] font-medium text-[#2d2d2d] transition hover:bg-white disabled:opacity-50">
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          {/* ── ERROR ── */}
          {error && !loading && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Orders unavailable</p><p className="mt-1">{error}</p>
            </div>
          )}

          {/* ── SKELETON ── */}
          {loading && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[0,1,2,3].map((i) => <div key={i} className="h-36 animate-pulse rounded-xl border border-gray-200 bg-white" />)}
            </div>
          )}

          {/* ── EMPTY ── */}
          {!loading && !error && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#e7e0d8] bg-white p-10 text-center">
              <ShoppingBag size={28} className="mx-auto mb-3 text-[#7a9b82]" />
              <p className="font-semibold text-gray-800">No orders in this view</p>
              <p className="mt-1 text-sm text-gray-500">New assignments will appear here when you are online.</p>
            </div>
          )}

          {/* ── CARD VIEW ── */}
          {!loading && !error && filtered.length > 0 && viewMode === "card" && (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {visibleOrders.map(renderCard)}
              </div>
              <Pagination page={displayPage} pageCount={pageCount} setPage={setPage} />
            </>
          )}

          {/* ── TABLE VIEW ── */}
          {!loading && !error && filtered.length > 0 && viewMode === "table" && (
            <>
              <div className="mt-0 overflow-x-auto rounded-[16px] border border-[#e8e4df]">
                <table className="w-full min-w-[900px] border-collapse bg-white text-left">
                  <thead className="bg-orange-50 text-left text-sm font-semibold text-orange-700 border-b border-orange-100">
                    <tr>
                      <th className="px-4 py-4">S.No</th>
                      <th className="px-4 py-4">Order</th>
                      <th className="px-4 py-4">Customer</th>
                      <th className="px-4 py-4">Pickup / Drop-off</th>
                      <th className="px-4 py-4">Date</th>
                      <th className="px-4 py-4">Amount</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleOrders.map((order, idx) => (
                      <tr key={orderId(order)} className="border-t border-[#efefef] text-[13px] text-[#444444] hover:bg-gray-50/70">
                        <td className="px-4 py-4 font-medium text-[#2d2d2d]">{(displayPage-1)*PAGE_SIZE+idx+1}</td>
                        <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-800">{orderId(order)}</td>
                        <td className="px-4 py-4 text-gray-700">{order.customer_name || order.customer?.name || "Customer"}</td>
                        <td className="max-w-64 px-4 py-4 text-xs text-gray-500">
                          <p className="truncate">{order.restaurant_name || order.chef_name || order.pickup_address || "Pickup pending"}</p>
                          <p className="mt-1 truncate">{order.delivery_address || order.dropoff_address || "Drop-off pending"}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-gray-500">{formatDate(order.order_date || order.created_at)}</td>
                        <td className="whitespace-nowrap px-4 py-4 font-medium text-gray-800">₹{Number(order.total_amount||0).toLocaleString("en-IN")}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClass(order.order_status)}`}>
                            <span className="mr-1.5 h-2 w-2 rounded-full" style={{ backgroundColor: "currentColor" }} />
                            {statusLabels[normalizeStatus(order.order_status)] || order.order_status || "New"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" onClick={() => setSelectedOrder(order)}
                              className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#FF5A00] transition hover:bg-orange-50">
                              View order
                            </button>
                            {canMarkDeliver(order) && (
                              <button type="button" onClick={() => { setSelectedOrder(order); setPendingStatus("DELIVERED"); }}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1f6a3b] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#195a31]">
                                <CheckCircle2 size={14} /> Mark delivered
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={displayPage} pageCount={pageCount} setPage={setPage} />
            </>
          )}
        </div>
      </div>

      {/* ── ORDER DETAIL MODAL ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 sm:items-center sm:p-4" role="presentation"
          onClick={(e) => e.target === e.currentTarget && !pendingStatus && setSelectedOrder(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="delivery-order-title"
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#39754a]">Delivery details</p>
                <h2 id="delivery-order-title" className="mt-1 text-xl font-bold">{orderId(selectedOrder)}</h2>
              </div>
              <button type="button" onClick={() => setSelectedOrder(null)} aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass(selectedOrder.order_status)}`}>
                {statusLabels[normalizeStatus(selectedOrder.order_status)] || selectedOrder.order_status || "New"}
              </span>
              <span className="text-xs text-gray-500">{formatDate(selectedOrder.order_date || selectedOrder.created_at)}</span>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Customer</h3>
                <p className="mt-2 font-semibold">{selectedOrder.customer_name || selectedOrder.customer?.name || "Customer"}</p>
                <p className="mt-1 text-sm text-gray-600">{selectedOrder.delivery_address || selectedOrder.dropoff_address || "Address unavailable"}</p>
                {(selectedOrder.customer_phone || selectedOrder.phone || selectedOrder.customer?.phone) && (
                  <a className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#21643a]"
                    href={`tel:${selectedOrder.customer_phone || selectedOrder.phone || selectedOrder.customer?.phone}`}>
                    <Phone size={15} />Call customer
                  </a>
                )}
                <a className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#21643a]" target="_blank" rel="noreferrer"
                  href={getLocationUrl(selectedOrder.delivery_address || selectedOrder.dropoff_address, selectedOrder.delivery_latitude, selectedOrder.delivery_longitude)}>
                  <MapPin size={15} />Open navigation<ArrowUpRight size={14} />
                </a>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Pickup</h3>
                <p className="mt-2 font-semibold">{selectedOrder.restaurant_name || selectedOrder.chef_name || "Restaurant"}</p>
                <p className="mt-1 text-sm text-gray-600">{selectedOrder.pickup_address || selectedOrder.restaurant_address || "Pickup address unavailable"}</p>
                <a className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#21643a]" target="_blank" rel="noreferrer"
                  href={getLocationUrl(selectedOrder.pickup_address || selectedOrder.restaurant_address, selectedOrder.pickup_latitude, selectedOrder.pickup_longitude)}>
                  <MapPin size={15} />Navigate to pickup<ArrowUpRight size={14} />
                </a>
              </div>
            </div>
            <div className="mt-6 rounded-xl bg-[#f5f8f5] p-4">
              <h3 className="text-sm font-bold">Food items</h3>
              <div className="mt-3 space-y-2">
                {getItems(selectedOrder).length
                  ? getItems(selectedOrder).map((item, i) => (
                    <div key={item.id || item.food_id || i} className="flex justify-between gap-3 text-sm">
                      <span>{item.food_name || item.name || item.product_name || "Food item"}</span>
                      <span className="text-gray-500">× {Number(item.quantity || item.qty || 1)}</span>
                    </div>))
                  : <p className="text-sm text-gray-500">Item details unavailable</p>}
              </div>
              <div className="mt-4 border-t border-gray-200 pt-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Payment</span><span>{selectedOrder.payment_type || selectedOrder.payment_method || "—"}</span></div>
                <div className="mt-2 flex justify-between font-semibold"><span>Delivery charge</span><span>₹{Number(selectedOrder.delivery_charge||0).toLocaleString("en-IN")}</span></div>
              </div>
            </div>
            {statusFlow.includes(normalizeStatus(selectedOrder.order_status)) && (
              <div className="mt-6">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Delivery progress</h3>
                <div className="flex items-start">
                  {statusFlow.map((s, i) => {
                    const currentIndex = statusFlow.indexOf(normalizeStatus(selectedOrder.order_status));
                    const complete = i <= currentIndex;
                    return (
                      <div key={s} className="flex min-w-0 flex-1 flex-col items-center text-center">
                        <div className={`grid h-7 w-7 place-items-center rounded-full ${complete ? "bg-[#287545] text-white" : "bg-gray-100 text-gray-400"}`}>
                          {complete ? <Check size={14} /> : <span className="text-[10px]">{i+1}</span>}
                        </div>
                        <span className="mt-2 text-[9px] leading-tight text-gray-500 sm:text-[10px]">{statusLabels[s]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => setSelectedOrder(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">Close</button>
              {nextStatus[normalizeStatus(selectedOrder.order_status)] && (
                <button type="button" onClick={() => setPendingStatus(nextStatus[normalizeStatus(selectedOrder.order_status)])}
                  className="rounded-lg bg-[#1f6a3b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#195a31]">
                  {statusLabels[nextStatus[normalizeStatus(selectedOrder.order_status)]]}
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ── CONFIRM STATUS MODAL ── */}
      {pendingStatus && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4">
          <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"
            className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
            <h2 id="confirm-title" className="font-bold text-gray-900">Confirm status update</h2>
            <p className="mt-2 text-sm text-gray-600">Mark {orderId(selectedOrder)} as {statusLabels[pendingStatus]}?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={updating} onClick={() => setPendingStatus("")}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">Cancel</button>
              <button type="button" disabled={updating} onClick={updateOrderStatus}
                className="rounded-lg bg-[#1f6a3b] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {updating ? "Updating…" : "Confirm"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default DeliveryOrdersPage;
