import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Armchair,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
  Flame,
  Layers,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Table2,
  UserCheck,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";
import { useAuth } from "../PrivateRouter/AuthContext";
import AttendanceWidget from "../CommonComponents/AttendanceWidget";

const STATUS_BADGES = {
  Pending: {
    bg: "bg-amber-50 text-amber-800 border-amber-300",
    dot: "bg-amber-500",
    icon: Clock,
    label: "Pending in Kitchen",
  },
  Preparing: {
    bg: "bg-blue-50 text-blue-800 border-blue-300",
    dot: "bg-blue-500 animate-pulse",
    icon: Flame,
    label: "Chef Preparing...",
  },
  "Ready to Serve": {
    bg: "bg-emerald-100 text-emerald-900 border-emerald-400 ring-2 ring-emerald-500/20",
    dot: "bg-emerald-600 animate-ping",
    icon: Bell,
    label: "Ready to Serve! 🔔",
  },
  Served: {
    bg: "bg-gray-100 text-gray-700 border-gray-300",
    dot: "bg-gray-400",
    icon: CheckCircle2,
    label: "Served",
  },
  Cancelled: {
    bg: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    icon: AlertCircle,
    label: "Cancelled",
  },
};

const formatTimeAgo = (dateValue) => {
  if (!dateValue) return "";
  const diffMs = Date.now() - new Date(dateValue).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins === 1) return "1 min ago";
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours}h ${diffMins % 60}m ago`;
};

export default function ServerDashboard() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [tables, setTables] = useState([]);
  const [foodsCount, setFoodsCount] = useState(0);
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState("");

  // Fetch Server's tables, foods count & live kitchen orders
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [tablesRes, foodsRes, ordersRes] = await Promise.allSettled([
        api.get("/server-tables"),
        api.get("/foods"),
        api.get("/kitchen-orders"),
      ]);

      if (tablesRes.status === "fulfilled" && tablesRes.value.data?.success) {
        const allTables = tablesRes.value.data.tables || [];
        const currentUserId = userProfile?.user_id;
        const currentEmpId = userProfile?.employee_id;
        const myTables = allTables.filter(
          (t) =>
            t.assigned_server_id &&
            (t.assigned_server_id === currentUserId ||
              t.assigned_server_id === currentEmpId ||
              userProfile?.role === "Super Admin" ||
              userProfile?.role === "Admin")
        );
        setTables(myTables.length > 0 ? myTables : allTables);
      }

      if (foodsRes.status === "fulfilled") {
        const foodsData = foodsRes.value.data?.data || foodsRes.value.data || [];
        setFoodsCount(Array.isArray(foodsData) ? foodsData.length : 0);
      }

      if (ordersRes.status === "fulfilled") {
        const orderList = Array.isArray(ordersRes.value.data?.orders)
          ? ordersRes.value.data.orders
          : [];
        setKitchenOrders(orderList);
      }
    } catch (err) {
      console.error("Error loading server dashboard:", err);
      toast.error("Could not load latest dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh orders every 10 seconds so servers get live kitchen updates
    const interval = window.setInterval(() => {
      api.get("/kitchen-orders").then((res) => {
        if (res.data?.orders) setKitchenOrders(res.data.orders);
      }).catch(() => {});
    }, 10000);
    return () => window.clearInterval(interval);
  }, [userProfile]);

  const handleMarkServed = async (orderId) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await api.patch(`/kitchen-orders/${encodeURIComponent(orderId)}/status`, {
        status: "Served",
      });
      if (res.data?.success) {
        setKitchenOrders((prev) =>
          prev.map((o) => (o.order_id === orderId ? { ...o, status: "Served" } : o))
        );
        toast.success("Order marked as Served!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark order as Served.");
    } finally {
      setUpdatingOrderId("");
    }
  };

  const availableTables = tables.filter((t) => (t.status || "Available") === "Available");
  const occupiedTables = tables.filter((t) => t.status === "Occupied");
  const totalSeats = tables.reduce((sum, t) => sum + Number(t.no_of_seats || 0), 0);

  // Active kitchen orders (exclude Served and Cancelled)
  const activeOrders = kitchenOrders.filter(
    (o) => (o.status || "Pending") !== "Served" && (o.status || "Pending") !== "Cancelled"
  );
  const readyOrders = kitchenOrders.filter((o) => o.status === "Ready to Serve");
  const preparingOrders = kitchenOrders.filter((o) => o.status === "Preparing");

  const startOrderForTable = (table) => {
    navigate("/server/foods", {
      state: {
        selectedTable: {
          id: table.id ?? null,
          table_id: table.table_id || null,
          table_number: table.table_number,
          no_of_seats: table.no_of_seats,
        },
      },
    });
  };

  return (
    <main className="min-h-screen bg-[#f8faf8] p-2 md:p-2 lg:p-2">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1a3c36] via-[#214a42] to-[#16332e] p-6 text-white shadow-xl md:p-8">
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#d4a843] backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" /> Server Station Dashboard
              </div>
              <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white md:text-3xl">
                Welcome back, {userProfile?.username || "Server"}!
              </h1>
              <p className="mt-1 text-xs text-white/70 md:text-sm">
                Manage your dining tables, monitor kitchen orders in real-time, and serve hot meals to guests.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={fetchDashboardData}
                title="Refresh dashboard"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <Link
                to="/server/foods"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#d4a843] px-4 text-xs font-bold text-[#1a3c36] shadow-md transition hover:bg-[#e2b755]"
              >
                <Utensils className="h-4 w-4" /> Food Menu & Orders
              </Link>
            </div>
          </div>
        </div>

        {/* Server Attendance Banner */}
        <AttendanceWidget variant="dashboard" />

        {/* READY TO SERVE ALERT BANNER */}
        {readyOrders.length > 0 && (
          <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/90 p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                <Bell className="h-6 w-6 animate-bounce" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-emerald-950 flex items-center gap-2">
                  <span>Food Ready to Serve!</span>
                  <span className="rounded-full bg-emerald-200 px-2 py-0.2 text-xs font-extrabold text-emerald-900">
                    {readyOrders.length} {readyOrders.length === 1 ? "Order" : "Orders"}
                  </span>
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Chef has plated dishes for:{" "}
                  <strong>{readyOrders.map((o) => `Table ${o.table_number}`).join(", ")}</strong>. Please pick up at the kitchen counter and serve.
                </p>
              </div>
            </div>

            <Link
              to="/server/tables"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800"
            >
              <span>View Tables</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "My Tables",
              value: tables.length,
              hint: "Total station tables",
              icon: Table2,
              bg: "bg-[#22c55e]",
            },
            {
              title: "Available Tables",
              value: availableTables.length,
              hint: "Ready for guest seating",
              icon: CheckCircle2,
              bg: "bg-[#3b82f6]",
            },
            {
              title: "Kitchen Cooking",
              value: preparingOrders.length,
              hint: "Orders currently in kitchen",
              icon: Flame,
              bg: "bg-[#f59e0b]",
            },
            {
              title: "Ready to Serve",
              value: readyOrders.length,
              hint: "Waiting at pickup counter",
              icon: Bell,
              bg: readyOrders.length > 0 ? "bg-[#ec4899]" : "bg-[#8b5cf6]",
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
                    <div className="text-[26px] font-extrabold leading-none tracking-tight">{stat.value}</div>
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
                      <linearGradient id={`server-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#server-grad-${index})`} />
                    <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                  </svg>
                </div>
              </article>
            );
          })}
        </div>

        {/* LIVE KITCHEN ORDERS TRACKER */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="font-serif text-lg font-bold text-gray-900 flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-[#1a3c36]" /> Live Kitchen Orders Status
                {activeOrders.length > 0 && (
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.2 text-xs font-bold text-blue-800">
                    {activeOrders.length} Active
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500">
                Track food progress from kitchen acceptance to pickup.
              </p>
            </div>
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Auto-updates live
            </span>
          </div>

          {activeOrders.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeOrders.map((order) => {
                const cfg = STATUS_BADGES[order.status] || STATUS_BADGES.Pending;
                const StatusIcon = cfg.icon;
                const isReady = order.status === "Ready to Serve";
                const isUpdating = updatingOrderId === order.order_id;
                const itemCount = (order.items || []).reduce((s, it) => s + Number(it.quantity || 1), 0);

                return (
                  <div
                    key={order.order_id}
                    className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                      isReady
                        ? "border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-sm"
                        : order.status === "Preparing"
                        ? "border-blue-200 bg-[#f8fbff]"
                        : "border-gray-200 bg-[#fafbfa]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                        <span className="font-serif text-base font-bold text-gray-900">
                          Table {order.table_number}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.bg}`}>
                          <StatusIcon className={`h-3 w-3 ${isReady ? "animate-bounce" : ""}`} />
                          {order.status}
                        </span>
                      </div>

                      <div className="my-2.5 space-y-1 text-xs">
                        <p className="text-gray-500 flex items-center justify-between">
                          <span>Items ({itemCount})</span>
                          <span className="font-mono text-[11px] text-gray-400">
                            {formatTimeAgo(order.created_at)}
                          </span>
                        </p>
                        <p className="font-medium text-gray-800 line-clamp-2">
                          {(order.items || []).map((it) => `${it.quantity}× ${it.food_name}`).join(", ")}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                      {isReady ? (
                        <button
                          type="button"
                          onClick={() => handleMarkServed(order.order_id)}
                          disabled={isUpdating}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>{isUpdating ? "Updating..." : "Mark as Served ✓"}</span>
                        </button>
                      ) : (
                        <div className="text-[11px] text-gray-500 italic flex items-center gap-1">
                          <StatusIcon className="h-3 w-3 text-gray-400" />
                          <span>{cfg.label}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-1" />
              <p className="text-xs font-bold text-gray-700">All kitchen orders are served!</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                New orders placed from dining tables will appear here live.
              </p>
            </div>
          )}
        </section>

        {/* Assigned Tables Section */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="font-serif text-lg font-bold text-gray-900 flex items-center gap-2">
                <Table2 className="h-5 w-5 text-[#1a3c36]" /> Assigned Station Tables
              </h2>
              <p className="text-xs text-gray-500">
                Click "Take Order" on any table to select items and send directly to the kitchen.
              </p>
            </div>
            <Link
              to="/server/tables"
              className="text-xs font-semibold text-[#1a3c36] hover:underline flex items-center gap-1"
            >
              <span>See full station layout</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#1a3c36] mb-2" />
              Loading tables...
            </div>
          ) : tables.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {tables.map((table) => {
                const isAvailable = (table.status || "Available") === "Available";
                const tableOrder = activeOrders.find(
                  (o) => String(o.table_id) === String(table.table_id || table.id) || String(o.table_number) === String(table.table_number)
                );

                return (
                  <div
                    key={table.table_id || table.id}
                    className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                      tableOrder?.status === "Ready to Serve"
                        ? "border-emerald-400 bg-emerald-50/30 ring-2 ring-emerald-500/20"
                        : "border-gray-200 bg-[#fafbfa] hover:border-[#1a3c36]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-base font-bold text-gray-900">
                          Table {table.table_number}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isAvailable
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {table.status || "Available"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {table.no_of_seats} Seats • Dining
                      </p>

                      {/* Live order status pill if active */}
                      {tableOrder && (
                        <div className="mt-2.5">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${STATUS_BADGES[tableOrder.status]?.bg || ""}`}>
                            {tableOrder.status === "Ready to Serve" ? (
                              <Bell className="h-3 w-3 animate-bounce text-emerald-700" />
                            ) : tableOrder.status === "Preparing" ? (
                              <Flame className="h-3 w-3 text-blue-600 animate-pulse" />
                            ) : (
                              <Clock className="h-3 w-3 text-amber-600" />
                            )}
                            {tableOrder.status}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-2 border-t border-gray-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startOrderForTable(table)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1a3c36] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#25524a]"
                      >
                        <Utensils className="h-3.5 w-3.5 text-[#d4a843]" />
                        <span>{tableOrder ? "Add Food" : "Take Order"}</span>
                      </button>

                      {tableOrder?.status === "Ready to Serve" && (
                        <button
                          type="button"
                          onClick={() => handleMarkServed(tableOrder.order_id)}
                          title="Mark as Served"
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs font-bold"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Table2 className="mx-auto h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-700">No tables assigned yet</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Ask your administrator to allocate dining tables to your server station.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}