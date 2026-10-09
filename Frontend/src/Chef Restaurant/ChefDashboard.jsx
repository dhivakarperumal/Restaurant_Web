import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Clock3, RefreshCw, UtensilsCrossed, Flame, CheckCircle2 } from "lucide-react";
import api from "../api";
import { useAuth } from "../PrivateRouter/AuthContext";
import AttendanceWidget from "../CommonComponents/AttendanceWidget";

const statusClasses = {
  Pending: "bg-amber-100 text-amber-800",
  Preparing: "bg-sky-100 text-sky-800",
  "Ready to Serve": "bg-emerald-100 text-emerald-800",
  Served: "bg-slate-100 text-slate-700",
  Cancelled: "bg-rose-100 text-rose-800",
};

const ChefDashboard = () => {
  const { profileName } = useAuth();
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [ordersError, setOrdersError] = useState("");
  const [requestsError, setRequestsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    const [ordersResult, requestsResult] = await Promise.allSettled([
      api.get("/kitchen-orders"),
      api.get("/inventory/kitchen-requests"),
    ]);

    if (ordersResult.status === "fulfilled") {
      setOrders(Array.isArray(ordersResult.value.data?.orders) ? ordersResult.value.data.orders : []);
      setOrdersError("");
    } else {
      setOrdersError(ordersResult.reason?.response?.data?.message || "Kitchen orders could not be loaded.");
    }

    if (requestsResult.status === "fulfilled") {
      setRequests(Array.isArray(requestsResult.value.data?.data) ? requestsResult.value.data.data : []);
      setRequestsError("");
    } else {
      setRequestsError(requestsResult.reason?.response?.data?.message || "Inventory requests could not be loaded.");
    }

    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard(true);
    const interval = window.setInterval(() => loadDashboard(), 30000);
    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  const orderCounts = useMemo(() => {
    const counts = { active: 0, pending: 0, preparing: 0, ready: 0, today: 0 };
    const today = new Date().toLocaleDateString();

    orders.forEach((order) => {
      const status = String(order.status || "Pending").toLowerCase();
      if (!["served", "cancelled"].includes(status)) counts.active += 1;
      if (status === "pending") counts.pending += 1;
      if (status === "preparing") counts.preparing += 1;
      if (status === "ready to serve") counts.ready += 1;
      if (order.created_at && new Date(order.created_at).toLocaleDateString() === today) counts.today += 1;
    });

    return counts;
  }, [orders]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => String(request.status || "Pending").toLowerCase() === "pending"),
    [requests]
  );

  const stats = [
    { label: "Active Tickets", value: orderCounts.active, detail: "Open kitchen orders", icon: UtensilsCrossed, bg: "bg-[#22c55e]" },
    { label: "Pending", value: orderCounts.pending, detail: "Waiting to start", icon: Clock3, bg: "bg-[#f59e0b]" },
    { label: "Preparing", value: orderCounts.preparing, detail: "In progress", icon: Flame, bg: "bg-[#3b82f6]" },
    { label: "Ready to Serve", value: orderCounts.ready, detail: "Plated & hot", icon: CheckCircle2, bg: "bg-[#8b5cf6]" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Kitchen workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Welcome{profileName ? `, ${profileName}` : ""}</h1>
          <p className="mt-1 text-sm text-slate-600">Your live kitchen workload and stock requests.</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-xs text-slate-500">Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
          <button type="button" onClick={() => loadDashboard(true)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {/* Attendance Banner */}
      <AttendanceWidget variant="dashboard" />

      <section aria-label="Kitchen order summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <article
              key={stat.label}
              className={`relative min-w-0 overflow-hidden rounded-xl border border-transparent p-4 sm:p-5 shadow-[0_2px_10px_rgba(20,56,34,0.08)] flex flex-col justify-between min-h-[140px] ${stat.bg} text-white`}
            >
              <div className="flex items-start gap-3 relative z-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm bg-white/20">
                  <Icon size={24} strokeWidth={2.2} className="text-white" />
                </div>
                <div className="flex-1 mt-0.5 min-w-0">
                  <h3 className="text-[12px] font-semibold opacity-90 mb-1 truncate">{stat.label}</h3>
                  <div className="text-[26px] font-extrabold leading-none tracking-tight">
                    {loading ? "..." : stat.value}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-5 relative z-10">
                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold bg-white/25">
                  Live
                </span>
                <span className="text-[11px] font-medium opacity-75 truncate">{stat.detail}</span>
              </div>

              <div className="absolute right-0 bottom-0 w-24 h-16 pointer-events-none opacity-50">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                  <defs>
                    <linearGradient id={`chef-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#chef-grad-${index})`} />
                  <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                </svg>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 border-y border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
            <div className="flex items-center gap-2">
              <UtensilsCrossed size={18} className="text-[#1a3c36]" />
              <h2 className="font-bold text-slate-900">Recent Kitchen Tickets</h2>
              <span className="text-xs text-slate-500">Today: {orderCounts.today}</span>
            </div>
            <Link to="/chef/orders" className="text-sm font-semibold text-[#1a3c36] hover:underline">All tickets</Link>
          </div>

          {ordersError ? (
            <p role="alert" className="px-4 py-8 text-sm text-rose-700">{ordersError}</p>
          ) : orders.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3 font-semibold">Ticket</th><th className="px-4 py-3 font-semibold">Table</th><th className="px-4 py-3 font-semibold">Items</th><th className="px-4 py-3 font-semibold">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.slice(0, 6).map((order) => (
                    <tr key={order.order_id}>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{order.order_id}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{order.table_number || order.table_id || "-"}</td>
                      <td className="max-w-sm px-4 py-3 text-slate-600">{(order.items || []).map((item) => `${item.food_name} × ${item.quantity}`).join(", ") || "No items"}</td>
                      <td className="whitespace-nowrap px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[order.status] || statusClasses.Pending}`}>{order.status || "Pending"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-10 text-center">
              <UtensilsCrossed size={24} className="mx-auto text-slate-400" />
              <p className="mt-2 text-sm font-semibold text-slate-700">No kitchen tickets yet</p>
              <p className="mt-1 text-xs text-slate-500">New server orders will appear here.</p>
            </div>
          )}
        </div>

        <div className="border-y border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-amber-700" />
              <h2 className="font-bold text-slate-900">Inventory Requests</h2>
            </div>
            <Link to="/chef/requests" className="text-sm font-semibold text-[#1a3c36] hover:underline">View all</Link>
          </div>
          <div className="px-4 py-4">
            {requestsError ? (
              <p role="alert" className="text-sm text-rose-700">{requestsError}</p>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
                  <Clock3 size={16} className="text-amber-600" />
                  <span><strong className="text-slate-900">{pendingRequests.length}</strong> pending requests</span>
                </div>
                {pendingRequests.length ? (
                  <ul className="divide-y divide-slate-100">
                    {pendingRequests.slice(0, 5).map((request) => (
                      <li key={request.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{request.request_number}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{(request.items || []).map((item) => item.item_name || item.product_name || "Item").join(", ") || "No items"}</p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-amber-700">{request.priority || "Normal"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-4 text-sm text-slate-500">No pending stock requests.</p>
                )}
                <Link to="/chef/requests" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#1a3c36] px-3 py-2 text-sm font-semibold text-white hover:bg-[#244e45]">
                  <ClipboardList size={15} />
                  Manage requests
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

export default ChefDashboard;