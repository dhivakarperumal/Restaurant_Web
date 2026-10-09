import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  Flame,
  LayoutGrid,
  Loader2,
  List,
  MoreVertical,
  RefreshCw,
  Search,
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

const ChefKitchenOrders = ({ defaultViewMode = "table", orderTypeFilter = "" }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState(defaultViewMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("latest");

  const fetchOrders = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get("/kitchen-orders", {
        params: orderTypeFilter ? { order_type: orderTypeFilter } : undefined,
      });
      const list = Array.isArray(response.data?.orders) ? response.data.orders : [];
      setOrders(list);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Kitchen orders could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [orderTypeFilter]);

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
    const query = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = activeTab === "all" || (order.status || "Pending") === activeTab;
      const searchableText = [
        order.order_id,
        order.table_number,
        order.bill_number,
        ...(order.items || []).map((item) => item.food_name),
      ].join(" ").toLowerCase();
      return matchesStatus && (!query || searchableText.includes(query));
    }).sort((first, second) => {
      const firstTime = new Date(first.created_at || 0).getTime();
      const secondTime = new Date(second.created_at || 0).getTime();
      return sortBy === "latest" ? secondTime - firstTime : firstTime - secondTime;
    });
  }, [orders, activeTab, searchQuery, sortBy]);

  return (
    <main className="min-h-screen  p-4 md:p-2 lg:p-2">
      <div className="mx-auto max-w-[1500px] space-y-6">
       
        <section aria-label="Kitchen order status summaries" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { status: 'Pending', label: 'Pending Orders', count: counts.Pending, caption: 'Waiting to start', icon: Clock3, bg: 'bg-[#f59e0b]' },
            { status: 'Preparing', label: 'Preparing', count: counts.Preparing, caption: 'Being prepared', icon: Flame, bg: 'bg-[#3b82f6]' },
            { status: 'Ready to Serve', label: 'Ready to Serve', count: counts['Ready to Serve'], caption: 'Ready for pickup', icon: Bell, bg: 'bg-[#06b6d4]' },
            { status: 'Served', label: 'Served', count: counts.Served, caption: 'Completed tickets', icon: CheckCircle2, bg: 'bg-[#22c55e]' },
          ].map(({ status, label, count, caption, icon: Icon, bg }) => (
            <button
              key={status}
              type="button"
              aria-pressed={activeTab === status}
              onClick={() => { setActiveTab(activeTab === status ? 'all' : status); setSearchQuery(''); }}
              className={`relative min-w-0 overflow-hidden rounded-xl border border-transparent p-4 sm:p-5 shadow-[0_2px_10px_rgba(20,56,34,0.08)] flex flex-col justify-between min-h-[140px] text-white text-left transition hover:-translate-y-0.5 hover:shadow-lg ${bg} ${activeTab === status ? 'ring-4 ring-white/40' : ''}`}
            >
              <div className="flex items-start gap-3 relative z-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm bg-white/20">
                  <Icon size={24} strokeWidth={2.2} className="text-white" />
                </div>
                <div className="flex-1 mt-0.5 min-w-0">
                  <h3 className="text-[12px] font-semibold opacity-90 mb-1 truncate">{label}</h3>
                  <div className="text-[26px] font-extrabold leading-none tracking-tight">{count}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-5 relative z-10">
                <span className="text-[11px] font-medium opacity-75">{caption}</span>
              </div>
              <div className="absolute right-0 bottom-0 w-24 h-16 pointer-events-none opacity-50">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                  <defs>
                    <linearGradient id={`kitchengrad-${status}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d={`M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z`} fill={`url(#kitchengrad-${status})`} />
                  <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                </svg>
              </div>
            </button>
          ))}
        </section>

        {/* Search and filters */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#e1ded8] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-sm sm:flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a857d]" />
            <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search table, ticket, food..." aria-label="Search kitchen orders" className="h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-11 pr-3 text-sm text-[#2d3830] outline-none placeholder:text-[#89938c] focus:border-[#6d9a79]" />
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="mr-1 text-xs text-gray-500">{filteredOrders.length} of {orders.length}</span>
            <select value={activeTab} onChange={(event) => setActiveTab(event.target.value)} aria-label="Filter kitchen orders by status" className="h-[46px] rounded-xl border border-[#dfe2e5] bg-white px-3 text-sm text-[#34443b] outline-none focus:border-[#6d9a79]">
              <option value="all">All Status ({counts.all})</option>
              <option value="Pending">Pending ({counts.Pending})</option>
              <option value="Preparing">Preparing ({counts.Preparing})</option>
              <option value="Ready to Serve">Ready to Serve ({counts["Ready to Serve"]})</option>
              <option value="Served">Served / Completed ({counts.Served})</option>
            </select>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort kitchen orders" className="h-[46px] rounded-xl border border-[#dfe2e5] bg-white px-3 text-sm text-[#34443b] outline-none focus:border-[#6d9a79]">
              <option value="latest">Sort by: Latest</option>
              <option value="oldest">Sort by: Oldest</option>
            </select>
            <div className="flex h-[46px] overflow-hidden rounded-xl border border-[#dfe2e5] bg-white" role="group" aria-label="Kitchen orders view">
              <button type="button" onClick={() => setViewMode("table")} aria-label="Table view" aria-pressed={viewMode === "table"} title="Table view" className={`grid w-11 place-items-center border-r border-[#dfe2e5] ${viewMode === "table" ? "bg-[#1a3c36] text-white" : "text-[#66736b] hover:bg-gray-50"}`}><List size={16} /></button>
              <button type="button" onClick={() => setViewMode("card")} aria-label="Card view" aria-pressed={viewMode === "card"} title="Card view" className={`grid w-11 place-items-center ${viewMode === "card" ? "bg-[#1a3c36] text-white" : "text-[#66736b] hover:bg-gray-50"}`}><LayoutGrid size={16} /></button>
            </div>
          </div>
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
        ) : viewMode === "table" ? (
          <div className="overflow-x-auto rounded-2xl border border-[#e7e0d8] bg-white shadow-sm">
            <table className="w-full min-w-[940px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-[#d4a843] text-[11px] uppercase tracking-wide text-white">
                <tr>
                  {['S No', 'Kitchen Order', 'Table / Bill', 'Round', 'Items', 'Amount', 'Status', 'Placed', 'Action'].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-4 font-bold">{heading}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0eb]">
                {filteredOrders.map((order, index) => {
                  const currentStatus = order.status || 'Pending';
                  const cfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.Pending;
                  const isUpdating = updatingOrderId === order.order_id;
                  const totalItems = order.items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
                  const orderTotal = order.items.reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 1), 0);
                  return <tr key={order.order_id} className="align-middle hover:bg-[#fbfcfa]">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-[#66736b]">{index + 1}</td>
                    <td className="whitespace-nowrap px-4 py-3"><span className="font-mono text-xs font-semibold text-[#244b35]" title={order.order_id}>{String(order.order_id).slice(0, 8).toUpperCase()}</span><span className="mt-1 block text-[10px] text-[#89938c]">{totalItems} item{totalItems === 1 ? '' : 's'}</span></td>
                    <td className="whitespace-nowrap px-4 py-3"><span className="font-semibold text-[#34443b]">Table {order.table_number}</span>{order.bill_number && <span className="mt-1 block text-[10px] text-[#7c8980]">{order.bill_number}</span>}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#66736b]">{order.round_number > 1 ? `Round ${order.round_number} · Add-on` : 'Round 1'}</td>
                    <td className="max-w-[280px] px-4 py-3"><div className="space-y-1">{order.items.map((item) => <p key={`${order.order_id}-${item.food_id}`} className="truncate text-xs text-[#46554b]" title={`${item.quantity}× ${item.food_name}`}><strong className="text-[#276a3e]">{item.quantity}×</strong> {item.food_name}</p>)}</div></td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#283c2f]">₹{orderTotal.toFixed(2)}</td>
                    <td className="whitespace-nowrap px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${cfg.badgeBg}`}><span className={`h-1.5 w-1.5 rounded-full ${cfg.dotBg}`} />{currentStatus}</span></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#7c8980]">{formatTimeAgo(order.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{cfg.nextAction && <button type="button" onClick={() => updateOrderStatus(order.order_id, cfg.nextStatus)} disabled={isUpdating} className={`rounded-lg px-3 py-2 text-[11px] font-bold disabled:opacity-50 ${cfg.nextBtnStyle}`}>{isUpdating ? 'Updating…' : currentStatus === 'Pending' ? 'Start cooking' : currentStatus === 'Preparing' ? 'Mark ready' : 'Mark served'}</button>}{!cfg.nextAction && <span className="text-xs text-[#849087]">No action</span>}</td>
                  </tr>;
                })}
              </tbody>
            </table>
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
                                    {group === "__custom_request__" ? "Custom request" : group}: {option}
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
