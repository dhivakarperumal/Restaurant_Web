import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  RefreshCw,
  UtensilsCrossed,
  Flame,
  CheckCircle2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api";
import { useAuth } from "../PrivateRouter/AuthContext";
import AttendanceWidget from "../CommonComponents/AttendanceWidget";

const STATUS_COLORS = {
  Pending: "#d4a843",
  Preparing: "#3b82f6",
  "Ready to Serve": "#22c55e",
  Served: "#64748b",
  Cancelled: "#f43f5e",
  Other: "#8b5cf6",
};

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
  const [eventOrders, setEventOrders] = useState([]);
  const [ordersError, setOrdersError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dashboardDate, setDashboardDate] = useState(() => new Date());

  const loadDashboard = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

   
    const [ordersResult, eventOrdersResult] = await Promise.allSettled([
      api.get("/kitchen-orders"),
      api.get("/event-orders", { params: { confirmedOnly: "true" } }),
    ]);

    if (ordersResult.status === "fulfilled") {
      setOrders(Array.isArray(ordersResult.value.data?.orders) ? ordersResult.value.data.orders : []);
      setOrdersError("");
    } else {
      setOrdersError(ordersResult.reason?.response?.data?.message || "Kitchen orders could not be loaded.");
    }

    const updatedAt = new Date();
    setLastUpdated(updatedAt);
    setDashboardDate(updatedAt);
    if (eventOrdersResult.status === "fulfilled") {
      setEventOrders(Array.isArray(eventOrdersResult.value.data?.data) ? eventOrdersResult.value.data.data : []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard(true);
    const interval = window.setInterval(() => loadDashboard(), 30000);
    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  const orderCounts = useMemo(() => {
    const counts = { active: 0, pending: 0, preparing: 0, ready: 0, today: 0 };
    const today = dashboardDate.toLocaleDateString();

    orders.forEach((order) => {
      const status = String(order.status || "Pending").toLowerCase();
      if (!["served", "cancelled"].includes(status)) counts.active += 1;
      if (status === "pending") counts.pending += 1;
      if (status === "preparing") counts.preparing += 1;
      if (status === "ready to serve") counts.ready += 1;
      if (order.created_at && new Date(order.created_at).toLocaleDateString() === today) counts.today += 1;
    });

    return counts;
  }, [dashboardDate, orders]);

  const dailyOrders = useMemo(() => {
    const today = new Date(dashboardDate);
    today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return {
        dateKey: date.toLocaleDateString(),
        day: date.toLocaleDateString(undefined, { weekday: "short" }),
        orders: 0,
      };
    });
    const countsByDate = new Map(days.map((day) => [day.dateKey, day]));

    orders.forEach((order) => {
      if (!order.created_at) return;
      const createdAt = new Date(order.created_at);
      if (Number.isNaN(createdAt.getTime())) return;
      const day = countsByDate.get(createdAt.toLocaleDateString());
      if (day) day.orders += 1;
    });

    return days;
  }, [dashboardDate, orders]);

  const hourlyOrders = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: new Date(2000, 0, 1, hour).toLocaleTimeString([], { hour: "numeric" }),
      orders: 0,
    }));
    const today = dashboardDate.toLocaleDateString();

    orders.forEach((order) => {
      if (!order.created_at) return;
      const createdAt = new Date(order.created_at);
      if (Number.isNaN(createdAt.getTime()) || createdAt.toLocaleDateString() !== today) return;
      buckets[createdAt.getHours()].orders += 1;
    });

    return buckets.filter((bucket) => bucket.hour % 3 === 0);
  }, [dashboardDate, orders]);

  const topDishes = useMemo(() => {
    const quantities = new Map();

    orders.forEach((order) => {
      (Array.isArray(order.items) ? order.items : []).forEach((item) => {
        const name = String(item.food_name || "").trim();
        if (!name) return;
        const quantity = Number(item.quantity);
        quantities.set(name, (quantities.get(name) || 0) + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1));
      });
    });

    return Array.from(quantities, ([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [orders]);

  const orderStatusData = useMemo(() => {
    const counts = new Map(Object.keys(STATUS_COLORS).map((status) => [status, 0]));

    orders.forEach((order) => {
      const status = String(order.status || "Pending").trim().toLowerCase();
      const label = Object.keys(STATUS_COLORS).find((item) => item.toLowerCase() === status) || "Other";
      counts.set(label, counts.get(label) + 1);
    });

    return Array.from(counts, ([name, value]) => ({ name, value, color: STATUS_COLORS[name] }))
      .filter((item) => item.value > 0);
  }, [orders]);

  const upcomingEventOrders = useMemo(() => {
    return eventOrders.filter((o) =>
      ["confirmed", "preparing", "ready"].includes(String(o.status || "").toLowerCase())
    );
  }, [eventOrders]);

  const stats = [
    { label: "Active Orders", value: orderCounts.active, detail: "Open kitchen orders", icon: UtensilsCrossed, tone: "bg-gradient-to-tr from-emerald-600 to-green-400 text-white shadow-emerald-500/25", accentColor: "#10b981", glowColor: "#34d399" },
    { label: "Pending", value: orderCounts.pending, detail: "Waiting to start", icon: Clock3, tone: "bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-amber-500/25", accentColor: "#f59e0b", glowColor: "#fbbf24" },
    { label: "Preparing", value: orderCounts.preparing, detail: "In progress", icon: Flame, tone: "bg-gradient-to-tr from-blue-600 to-cyan-400 text-white shadow-blue-500/25", accentColor: "#3b82f6", glowColor: "#60a5fa" },
    { label: "Ready to Serve", value: orderCounts.ready, detail: "Plated & hot", icon: CheckCircle2, tone: "bg-gradient-to-tr from-violet-600 to-purple-400 text-white shadow-purple-500/25", accentColor: "#8b5cf6", glowColor: "#a78bfa" },
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Kitchen workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Welcome{profileName ? `, ${profileName}` : ""}</h1>
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

      {/* Confirmed Event Orders Banner */}
      {upcomingEventOrders.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d4a843] text-white shadow-sm">
              <CalendarDays size={22} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-amber-950">
                {upcomingEventOrders.length} Confirmed Event Order{upcomingEventOrders.length > 1 ? "s" : ""} to Prepare
              </p>
              <p className="text-xs text-amber-800">
                Next: {upcomingEventOrders[0]?.event_type || "Catering Event"} ({upcomingEventOrders[0]?.guest_count} guests) on{" "}
                {upcomingEventOrders[0]?.event_date ? new Date(upcomingEventOrders[0].event_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Upcoming"}
              </p>
            </div>
          </div>
          <Link
            to="/chef/event-orders"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a3c36] px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-[#25524a] transition self-start sm:self-center"
          >
            Open Event Orders
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      <section aria-label="Kitchen order summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article
              key={stat.label}
              className="group relative flex min-h-[140px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_12px_24px_-6px_rgba(0,0,0,0.1)] sm:p-5"
            >
              <div
                className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-20 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-35"
                style={{ backgroundColor: stat.glowColor }}
              />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500">{stat.label}</h3>
                  <div className="mt-2.5 truncate text-[23px] font-black tracking-tight text-slate-800 sm:text-[27px]">
                    {loading ? "..." : stat.value}
                  </div>
                </div>
                <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${stat.tone}`}>
                  <Icon size={24} strokeWidth={2.3} />
                </div>
              </div>

              <div className="relative z-10 mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600 ring-1 ring-inset ring-emerald-500/20">
                    Live
                  </span>
                  <span className="truncate font-medium text-slate-500">{stat.detail}</span>
                </div>
                <span className="h-2 w-2 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: stat.accentColor }} />
              </div>
              <div
                className="absolute bottom-0 left-0 h-[3px] w-0 transition-all duration-300 group-hover:w-full"
                style={{ backgroundColor: stat.accentColor }}
              />
            </article>
          );
        })}
      </section>

      <section aria-label="Kitchen order charts" className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">At a glance</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Kitchen analytics</h2>
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
          <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">Order activity</h3>
                <p className="mt-1 text-xs text-slate-500">Kitchen orders received over the last 7 days</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Last 7 days</span>
            </div>
            <div className="h-64 w-full" role="img" aria-label="Bar chart showing kitchen order activity over the last 7 days">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyOrders} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)" }}
                    labelStyle={{ color: "#0f172a", fontWeight: 700 }}
                    formatter={(value) => [value, "Orders"]}
                  />
                  <Bar dataKey="orders" fill="#1a3c36" radius={[6, 6, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-2">
              <h3 className="font-bold text-slate-900">Order status mix</h3>
              <p className="mt-1 text-xs text-slate-500">Current status of kitchen orders</p>
            </div>
            {orderStatusData.length ? (
              <div className="grid items-center gap-3 sm:grid-cols-[minmax(150px,1fr)_minmax(120px,0.9fr)]">
                <div className="relative h-52 min-w-0" role="img" aria-label="Donut chart showing kitchen orders by status">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={orderStatusData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="62%"
                        outerRadius="88%"
                        paddingAngle={3}
                        stroke="none"
                      >
                        {orderStatusData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)" }}
                        formatter={(value, name) => [value, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-slate-900">{orders.length}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Orders</span>
                  </div>
                </div>
                <ul className="space-y-3">
                  {orderStatusData.map((status) => (
                    <li key={status.name} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2 text-slate-600">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
                        <span className="truncate">{status.name}</span>
                      </span>
                      <span className="font-bold text-slate-900">{status.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex h-52 flex-col items-center justify-center text-center">
                <UtensilsCrossed size={24} className="text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-700">No order data yet</p>
                <p className="mt-1 text-xs text-slate-500">Status distribution will appear when orders arrive.</p>
              </div>
            )}
          </article>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <h3 className="font-bold text-slate-900">Today’s order pace</h3>
              <p className="mt-1 text-xs text-slate-500">Order arrivals by time of day</p>
            </div>
            <div className="h-60 w-full" role="img" aria-label="Line chart showing today's kitchen orders by hour">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyOrders} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)" }}
                    formatter={(value) => [value, "Orders"]}
                  />
                  <Line type="monotone" dataKey="orders" stroke="#d4a843" strokeWidth={3} dot={{ r: 3, fill: "#d4a843", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <h3 className="font-bold text-slate-900">Most-ordered dishes</h3>
              <p className="mt-1 text-xs text-slate-500">Top 5 dishes by quantity across kitchen orders</p>
            </div>
            {topDishes.length ? (
              <div className="h-60 w-full" role="img" aria-label="Bar chart showing the five most-ordered dishes">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topDishes} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={{ fill: "#475569", fontSize: 11 }} />
                    <Tooltip
                      cursor={{ fill: "#f1f5f9" }}
                      contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)" }}
                      formatter={(value) => [value, "Quantity"]}
                    />
                    <Bar dataKey="quantity" fill="#1a3c36" radius={[0, 6, 6, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-60 flex-col items-center justify-center text-center">
                <UtensilsCrossed size={24} className="text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-700">No dish data yet</p>
                <p className="mt-1 text-xs text-slate-500">Dish quantities will appear when orders arrive.</p>
              </div>
            )}
          </article>
        </div>
      </section>

      <section className="grid gap-5">
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
            <div className="flex items-center gap-2">
              <UtensilsCrossed size={18} className="text-[#1a3c36]" />
              <h2 className="font-bold text-slate-900">Recent Kitchen Orders</h2>
              <span className="text-xs text-slate-500">Today: {orderCounts.today}</span>
            </div>
            <Link to="/chef/orders" className="text-sm font-semibold text-[#1a3c36] hover:underline">All orders</Link>
          </div>

          {ordersError ? (
            <p role="alert" className="px-4 py-8 text-sm text-rose-700">{ordersError}</p>
          ) : orders.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#d4a843] text-xs uppercase tracking-wide text-white">
                  <tr><th className="rounded-tl-lg px-4 py-3 font-semibold">S No</th><th className="px-4 py-3 font-semibold">Table</th><th className="px-4 py-3 font-semibold">Items</th><th className="rounded-tr-lg px-4 py-3 font-semibold">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.slice(0, 6).map((order, index) => (
                    <tr key={order.order_id}>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{index + 1}</td>
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
              <p className="mt-2 text-sm font-semibold text-slate-700">No kitchen orders yet</p>
              <p className="mt-1 text-xs text-slate-500">New server orders will appear here.</p>
            </div>
          )}
        </div>

      </section>
    </main>
  );
};

export default ChefDashboard;