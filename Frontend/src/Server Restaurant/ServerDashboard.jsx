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
        returnPath: "/server",
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
        <section className="group relative isolate overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_12px_24px_-6px_rgba(0,0,0,0.1)]">
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-orange-400/15 blur-3xl transition-transform duration-500 group-hover:scale-110" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400" />
          <div className="relative z-10 p-5 md:p-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                  <Sparkles className="h-3.5 w-3.5 text-orange-500" /> Server Station Dashboard
                </div>
                <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                  Welcome back, {userProfile?.username || "Server"}!
                </h1>
                <p className="mt-1 text-xs text-slate-500 md:text-sm">
                  Manage your dining tables, monitor kitchen orders in real-time, and serve hot meals to guests.
                </p>
              </div>

              
            </div>
          </div>

          <div className="relative z-10 border-t border-slate-100 bg-gradient-to-r from-slate-50/70 to-emerald-50/40">
            <AttendanceWidget variant="dashboard" embedded />
          </div>
        </section>

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
              tone: "bg-gradient-to-tr from-orange-500 to-amber-400 text-white shadow-orange-500/25",
              accentColor: "#f97316",
              glowColor: "#fb923c",
            },
            {
              title: "Available Tables",
              value: availableTables.length,
              hint: "Ready for guest seating",
              icon: CheckCircle2,
              tone: "bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-emerald-500/25",
              accentColor: "#10b981",
              glowColor: "#34d399",
            },
            {
              title: "Kitchen Cooking",
              value: preparingOrders.length,
              hint: "Orders currently in kitchen",
              icon: Flame,
              tone: "bg-gradient-to-tr from-blue-600 to-cyan-400 text-white shadow-blue-500/25",
              accentColor: "#3b82f6",
              glowColor: "#60a5fa",
            },
            {
              title: "Ready to Serve",
              value: readyOrders.length,
              hint: "Waiting at pickup counter",
              icon: Bell,
              tone: "bg-gradient-to-tr from-pink-600 to-rose-400 text-white shadow-pink-500/25",
              accentColor: "#ec4899",
              glowColor: "#f472b6",
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <article
                key={stat.title}
                className="group relative flex min-h-[140px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_12px_24px_-6px_rgba(0,0,0,0.1)] sm:p-5"
              >
                <div
                  className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-20 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-35"
                  style={{ backgroundColor: stat.glowColor }}
                />
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500">{stat.title}</h3>
                    <div className="mt-2.5 truncate text-[23px] font-black tracking-tight text-slate-800 sm:text-[27px]">{stat.value}</div>
                  </div>
                  <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${stat.tone}`}>
                    <Icon size={24} strokeWidth={2.3} />
                  </div>
                </div>
                <div className="relative z-10 mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600 ring-1 ring-inset ring-emerald-500/20">
                      Live
                    </span>
                    <span className="truncate font-medium text-slate-500">{stat.hint}</span>
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
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] md:p-6">
          <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-50 text-orange-600">
                  <Table2 className="h-5 w-5" />
                </span>
                Assigned Station Tables
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Click "Take Order" on any table to select items and send directly to the kitchen.
              </p>
            </div>
            <Link
              to="/server/tables"
              className="inline-flex items-center gap-1 self-start rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:border-orange-200 hover:bg-orange-100 sm:self-auto"
            >
              <span>See full station layout</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">
              <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-orange-500" />
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
                    className={`group relative flex min-h-[172px] flex-col justify-between overflow-hidden rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                      tableOrder?.status === "Ready to Serve"
                        ? "border-emerald-200 bg-gradient-to-br from-white to-emerald-50/70 hover:border-emerald-300"
                        : "border-slate-200 bg-white hover:border-orange-200"
                    }`}
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 ${tableOrder?.status === "Ready to Serve" ? "bg-emerald-500" : isAvailable ? "bg-orange-400" : "bg-amber-400"}`} />
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-100">
                            <Table2 className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">Table {table.table_number}</p>
                            <p className="mt-0.5 text-[11px] text-slate-500">{table.no_of_seats} Seats <span aria-hidden="true">·</span> Dining</p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                            isAvailable
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {table.status || "Available"}
                        </span>
                      </div>

                      {/* Live order status pill if active */}
                      {tableOrder && (
                        <div className="mt-3 border-t border-slate-100 pt-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold ${STATUS_BADGES[tableOrder.status]?.bg || ""}`}>
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

                    <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => startOrderForTable(table)}
                        className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-400 px-3 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/15 transition hover:from-orange-600 hover:to-amber-500"
                      >
                        <Utensils className="h-3.5 w-3.5" />
                        <span>{tableOrder ? "Add Food" : "Take Order"}</span>
                      </button>

                      {tableOrder?.status === "Ready to Serve" && (
                        <button
                          type="button"
                          onClick={() => handleMarkServed(tableOrder.order_id)}
                          title="Mark as Served"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700"
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