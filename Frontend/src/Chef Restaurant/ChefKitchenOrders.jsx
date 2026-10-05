import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  Flame,
  Loader2,
  MoreVertical,
  RefreshCw,
  Sparkles,
  Table2,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";

const STATUS_CONFIG = {
  Pending: {
    label: "Pending",
    badgeBg: "bg-amber-50 text-amber-800 border-amber-300",
    dotBg: "bg-amber-500",
    icon: Clock3,
    nextAction: "Accept & Start Cooking",
    nextStatus: "Preparing",
    nextBtnStyle: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
  },
  Preparing: {
    label: "Preparing",
    badgeBg: "bg-blue-50 text-blue-800 border-blue-300",
    dotBg: "bg-blue-500 animate-pulse",
    icon: Flame,
    nextAction: "Mark Ready to Serve 🔔",
    nextStatus: "Ready to Serve",
    nextBtnStyle: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/20",
  },
  "Ready to Serve": {
    label: "Ready to Serve",
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-300",
    dotBg: "bg-emerald-500 animate-ping",
    icon: Bell,
    nextAction: "Mark as Served ✓",
    nextStatus: "Served",
    nextBtnStyle: "bg-[#1a3c36] hover:bg-[#25524a] text-white shadow-sm",
  },
  Served: {
    label: "Served",
    badgeBg: "bg-gray-100 text-gray-700 border-gray-300",
    dotBg: "bg-gray-400",
    icon: CheckCircle2,
    nextAction: null,
    nextStatus: null,
  },
  Cancelled: {
    label: "Cancelled",
    badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
    dotBg: "bg-rose-500",
    icon: XCircle,
    nextAction: null,
    nextStatus: null,
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

const ChefKitchenOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const fetchOrders = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get("/kitchen-orders");
      const list = Array.isArray(response.data?.orders) ? response.data.orders : [];
      setOrders(list);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Kitchen orders could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(true);
    // Poll orders every 10 seconds for real-time kitchen updates
    const interval = window.setInterval(() => fetchOrders(false), 10000);
    return () => window.clearInterval(interval);
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId, targetStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await api.patch(`/kitchen-orders/${encodeURIComponent(orderId)}/status`, {
        status: targetStatus,
      });

      if (res.data?.success) {
        setOrders((prev) =>
          prev.map((o) => (o.order_id === orderId ? { ...o, status: targetStatus, updated_at: new Date() } : o))
        );
        toast.success(`Order status updated to ${targetStatus}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to update status to ${targetStatus}`);
    } finally {
      setUpdatingOrderId("");
    }
  };

  // Status counts for tabs
  const counts = useMemo(() => {
    const c = { all: orders.length, Pending: 0, Preparing: 0, "Ready to Serve": 0, Served: 0 };
    orders.forEach((o) => {
      const st = o.status || "Pending";
      if (c[st] !== undefined) c[st] += 1;
    });
    return c;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (activeTab === "all") return orders;
    return orders.filter((o) => (o.status || "Pending") === activeTab);
  }, [orders, activeTab]);

  return (
    <main className="min-h-screen bg-[#f2f3f0] p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[2.1rem] font-bold tracking-[-0.05em] text-[#1f1d1b]">
              Kitchen Orders
            </h1>
            <p className="mt-1 text-[13px] text-[#646464]">
              Dashboard <span className="mx-2 text-[#9a9a9a]">&gt;</span>{" "}
              <span className="font-medium text-[#2a2a2a]">Live Kitchen Orders</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-white px-3 py-2 rounded-xl border border-gray-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live polling every 10s
            </span>
            <button
              type="button"
              onClick={() => fetchOrders(true)}
              disabled={loading}
              className="inline-flex h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#dfe2e5] bg-white px-4 text-sm font-semibold text-[#34443b] shadow-sm transition hover:bg-[#faf9f8] disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-[#1a3c36]" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Filter Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#e1ded8] pb-3 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "all"
                ? "bg-[#1a3c36] text-white shadow-sm"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            All Orders ({counts.all})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("Pending")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "Pending"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white text-amber-700 hover:bg-amber-50 border border-amber-200"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Pending ({counts.Pending})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("Preparing")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "Preparing"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-blue-700 hover:bg-blue-50 border border-blue-200"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Preparing ({counts.Preparing})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("Ready to Serve")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "Ready to Serve"
                ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20"
                : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-300"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            Ready to Serve 🔔 ({counts["Ready to Serve"]})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("Served")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === "Served"
                ? "bg-gray-800 text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            Served / Completed ({counts.Served})
          </button>
        </div>

        {/* Content */}
        {error ? (
          <div role="alert" className="rounded-2xl border border-[#edc7c1] bg-white p-6 text-sm text-[#a13e30] shadow-sm">
            <p className="font-semibold">{error}</p>
            <button type="button" onClick={() => fetchOrders(true)} className="mt-2 text-xs font-bold underline">
              Try refreshing orders
            </button>
          </div>
        ) : loading && orders.length === 0 ? (
          <div className="rounded-2xl border border-[#e7e0d8] bg-white p-16 text-center text-sm text-gray-500 shadow-sm">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[#1a3c36] mb-2" />
            Loading kitchen tickets...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#e6ddd1] bg-[#faf9f8] py-16 text-center shadow-sm">
            <UtensilsCrossed className="mx-auto h-12 w-12 text-[#8a8a8a]" />
            <h2 className="mt-3 text-base font-bold text-[#333]">
              {activeTab === "all" ? "No kitchen orders yet" : `No orders currently in ${activeTab}`}
            </h2>
            <p className="mt-1 text-xs text-[#888]">
              Orders sent by servers from their dining tables will appear here live.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredOrders.map((order) => {
              const currentStatus = order.status || "Pending";
              const cfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.Pending;
              const StatusIcon = cfg.icon;
              const isUpdating = updatingOrderId === order.order_id;
              const totalItems = order.items.reduce((s, it) => s + Number(it.quantity || 1), 0);
              const orderTotal = order.items.reduce((s, it) => s + Number(it.unit_price || 0) * Number(it.quantity || 1), 0);

              return (
                <article
                  key={order.order_id}
                  className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                    currentStatus === "Ready to Serve"
                      ? "border-emerald-300 ring-2 ring-emerald-500/15"
                      : currentStatus === "Preparing"
                      ? "border-blue-200"
                      : currentStatus === "Pending"
                      ? "border-amber-200 bg-[#fffdfa]"
                      : "border-gray-200 opacity-80"
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-[#f0ebe6] pb-3.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="rounded-lg bg-[#1a3c36] px-2.5 py-1 font-serif text-sm font-bold text-white">
                            Table {order.table_number}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              order.round_number > 1
                                ? "bg-purple-100 text-purple-800 border border-purple-300"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {order.round_number > 1 ? `Round ${order.round_number} (Add-on)` : "Round 1"}
                          </span>
                          {order.bill_number && (
                            <span className="font-mono text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                              {order.bill_number}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400">
                          <Clock3 className="h-3 w-3" />
                          <span>Placed {formatTimeAgo(order.created_at)}</span>
                        </p>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${cfg.badgeBg}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${cfg.dotBg}`} />
                        {currentStatus}
                      </span>
                    </div>

                    {/* Items List */}
                    <div className="my-4 space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Items Ordered ({totalItems})
                      </p>
                      <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {order.items.map((item, itemIndex) => (
                          <li
                            key={`${order.order_id}-${item.food_id}-${itemIndex}`}
                            className="flex items-start justify-between gap-3 rounded-lg bg-[#f8faf8] px-3 py-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800">
                                <span className="inline-block min-w-5 font-mono font-bold text-emerald-800">
                                  {item.quantity}×
                                </span>{" "}
                                {item.food_name}
                              </p>
                              {item.selected_addons?.length > 0 && (
                                <p className="mt-1 text-[11px] text-gray-600">
                                  Add-ons: {item.selected_addons.join(", ")}
                                </p>
                              )}
                              {Object.entries(item.selected_customizations || {}).flatMap(([group, selection]) => {
                                const options = Array.isArray(selection) ? selection : selection ? [selection] : [];
                                return options.map((option) => (
                                  <p key={`${group}-${option}`} className="mt-1 text-[11px] text-gray-600">
                                    {group}: {option}
                                  </p>
                                ));
                              })}
                            </div>
                            <span className="font-mono text-gray-500">
                              ₹{(Number(item.unit_price) * item.quantity).toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex justify-between border-t border-gray-100 pt-2 text-xs text-gray-500 font-medium">
                        <span>Total Bill Value</span>
                        <span className="font-mono font-bold text-gray-800">₹{orderTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="border-t border-[#f0ebe6] pt-3.5 flex flex-col gap-2">
                    {/* Primary Next Action Button */}
                    {cfg.nextAction && (
                      <button
                        type="button"
                        onClick={() => updateOrderStatus(order.order_id, cfg.nextStatus)}
                        disabled={isUpdating}
                        className={`w-full flex h-11 items-center justify-center gap-2 rounded-xl text-xs font-bold transition disabled:opacity-60 cursor-pointer ${cfg.nextBtnStyle}`}
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Updating status...</span>
                          </>
                        ) : (
                          <>
                            {currentStatus === "Pending" && <Flame className="h-4 w-4" />}
                            {currentStatus === "Preparing" && <Bell className="h-4 w-4 animate-bounce" />}
                            {currentStatus === "Ready to Serve" && <Check className="h-4 w-4" />}
                            <span>{cfg.nextAction}</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Secondary Status Dropdown / Actions */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-gray-400">Change status:</span>
                      <div className="flex items-center gap-1.5">
                        {currentStatus !== "Pending" && currentStatus !== "Served" && (
                          <button
                            type="button"
                            onClick={() => updateOrderStatus(order.order_id, "Pending")}
                            disabled={isUpdating}
                            className="px-2 py-1 rounded-md text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                          >
                            Revert
                          </button>
                        )}

                        {currentStatus !== "Cancelled" && currentStatus !== "Served" && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Cancel order for Table ${order.table_number}?`)) {
                                updateOrderStatus(order.order_id, "Cancelled");
                              }
                            }}
                            disabled={isUpdating}
                            className="px-2 py-1 rounded-md text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                          >
                            Cancel
                          </button>
                        )}

                        {currentStatus === "Served" && (
                          <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Served to table
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default ChefKitchenOrders;
