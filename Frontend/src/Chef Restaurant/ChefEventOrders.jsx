import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  CookingPot,
  Flame,
  LayoutGrid,
  List,
  LoaderCircle,
  MapPin,
  Package,
  PartyPopper,
  Phone,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  UtensilsCrossed,
  X,
  AlertCircle,
  Eye,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { BACKEND_BASE_URL } from "../api";

const CHEF_STATUS_OPTIONS = ["All Confirmed", "Confirmed", "Preparing", "Ready", "Completed"];

const statusStyles = {
  Confirmed: "border-amber-300 bg-amber-50 text-amber-800",
  Preparing: "border-blue-300 bg-blue-50 text-blue-800",
  Ready: "border-emerald-300 bg-emerald-50 text-emerald-800",
  Completed: "border-slate-300 bg-slate-100 text-slate-700",
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const dateString = typeof value === "string" ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);
  const date = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? dateString
    : date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

const formatTime = (value) => {
  if (!value) return "Time unavailable";
  const [hour, minute] = String(value).slice(0, 5).split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute || 0).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
};

const getEventDateUrgency = (eventDateStr) => {
  if (!eventDateStr) return { label: "Upcoming", badgeBg: "bg-slate-100 text-slate-600" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(typeof eventDateStr === "string" ? eventDateStr.slice(0, 10) : eventDateStr);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: "Past Event", badgeBg: "bg-slate-100 text-slate-500" };
  if (diffDays === 0) return { label: "TODAY!", badgeBg: "bg-rose-500 text-white animate-pulse" };
  if (diffDays === 1) return { label: "Tomorrow", badgeBg: "bg-amber-500 text-white" };
  if (diffDays <= 3) return { label: `In ${diffDays} days`, badgeBg: "bg-amber-100 text-amber-900 border border-amber-300" };
  return { label: `In ${diffDays} days`, badgeBg: "bg-sky-50 text-sky-800 border border-sky-200" };
};

const resolveImageUrl = (image) => {
  if (!image || typeof image !== "string") return "";
  if (/^(https?:\/\/|data:)/i.test(image)) return image;
  return `${BACKEND_BASE_URL}${image.startsWith("/") ? image : `/${image}`}`;
};

export default function ChefEventOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState("All Confirmed");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("eventDateAsc");
  const [viewMode, setViewMode] = useState("card");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const [kitchenNotes, setKitchenNotes] = useState("");

  const fetchOrders = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.get("/event-orders", {
        params: {
          confirmedOnly: "true",
          status: activeStatus === "All Confirmed" ? undefined : activeStatus,
        },
      });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setOrders(res.data.data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Failed to fetch chef event orders:", err);
      toast.error(err.response?.data?.message || "Could not load event catering orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    fetchOrders(true);
    const timer = setInterval(() => fetchOrders(false), 25000);
    return () => clearInterval(timer);
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId);
      const res = await api.patch(`/event-orders/${orderId}/status`, {
        status: newStatus,
        admin_notes: kitchenNotes || undefined,
      });

      if (res.data?.success) {
        toast.success(`Event Order moved to ${newStatus}!`);
        if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.event_order_number === orderId)) {
          setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
        await fetchOrders(false);
      } else {
        toast.error(res.data?.message || "Failed to update status.");
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error(err.response?.data?.message || "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = useMemo(() => {
    const res = { confirmed: 0, preparing: 0, ready: 0, completed: 0, total: orders.length };
    orders.forEach((o) => {
      const s = String(o.status || "").toLowerCase();
      if (s === "confirmed") res.confirmed += 1;
      else if (s === "preparing") res.preparing += 1;
      else if (s === "ready") res.ready += 1;
      else if (s === "completed") res.completed += 1;
    });
    return res;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        if (activeStatus !== "All Confirmed" && o.status !== activeStatus) return false;
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        const num = String(o.event_order_number || "").toLowerCase();
        const name = String(o.customer_name || "").toLowerCase();
        const type = String(o.event_type || "").toLowerCase();
        const phone = String(o.customer_phone || "").toLowerCase();
        const hasItem = Array.isArray(o.items) && o.items.some((it) => String(it.product_name || "").toLowerCase().includes(q));
        return num.includes(q) || name.includes(q) || type.includes(q) || phone.includes(q) || hasItem;
      })
      .sort((a, b) => {
        if (sortBy === "eventDateAsc") {
          return new Date(a.event_date || 0) - new Date(b.event_date || 0);
        }
        if (sortBy === "eventDateDesc") {
          return new Date(b.event_date || 0) - new Date(a.event_date || 0);
        }
        if (sortBy === "guestsDesc") {
          return (Number(b.guest_count) || 0) - (Number(a.guest_count) || 0);
        }
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
  }, [orders, activeStatus, searchTerm, sortBy]);

  const toggleCheckItem = (orderId, itemId) => {
    const key = `${orderId}-${itemId}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const statCards = [
    {
      label: "Confirmed (Awaiting Prep)",
      value: counts.confirmed,
      statusKey: "Confirmed",
      icon: Clock3,
      desc: "New catering bookings",
      bgClass: "bg-gradient-to-br from-[#d4a843] to-[#b3862b] text-white",
    },
    {
      label: "Cooking In Progress",
      value: counts.preparing,
      statusKey: "Preparing",
      icon: Flame,
      desc: "Kitchen active tickets",
      bgClass: "bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] text-white",
    },
    {
      label: "Ready for Event",
      value: counts.ready,
      statusKey: "Ready",
      icon: CheckCircle2,
      desc: "Packed & plated hot",
      bgClass: "bg-gradient-to-br from-[#10b981] to-[#059669] text-white",
    },
    {
      label: "Completed Events",
      value: counts.completed,
      statusKey: "Completed",
      icon: Package,
      desc: "Fulfilled event orders",
      bgClass: "bg-gradient-to-br from-[#0f766e] to-[#115e59] text-white",
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#1a3c36]/10 px-3 py-1 text-xs font-bold text-[#1a3c36]">
            <UtensilsCrossed size={13} />
            Kitchen Catering Workspace
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Event Catering Orders
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Confirmed bulk orders verified for kitchen food preparation and portion tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-[#d4a843]" : ""} />
            Refresh Orders
          </button>
        </div>
      </div>

      {/* Top Status Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          const isSelected = activeStatus === card.statusKey;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => setActiveStatus(activeStatus === card.statusKey ? "All Confirmed" : card.statusKey)}
              className={`group relative overflow-hidden rounded-2xl p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${card.bgClass} ${
                isSelected ? "ring-4 ring-offset-2 ring-[#1a3c36]" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-90">{card.label}</p>
                  <p className="mt-2 text-3xl font-black">{loading ? "..." : card.value}</p>
                  <p className="mt-1 text-xs opacity-80">{card.desc}</p>
                </div>
                <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
                  <Icon size={22} className="text-white" />
                </div>
              </div>

              {/* Decorative wave */}
              <div className="pointer-events-none absolute -bottom-3 -right-3 opacity-20 transition group-hover:opacity-30">
                <svg width="120" height="70" viewBox="0 0 100 60" fill="none">
                  <path
                    d="M0 45 C 20 20, 40 55, 60 30 C 80 5, 90 40, 100 20 L 100 60 L 0 60 Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search, Filter & View Controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        {/* Status Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {CHEF_STATUS_OPTIONS.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setActiveStatus(st)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                activeStatus === st
                  ? "bg-[#1a3c36] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search, Sort, View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search order, customer, dishes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#1a3c36] focus:bg-white focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-[#1a3c36] focus:bg-white focus:outline-none"
          >
            <option value="eventDateAsc">Event Date (Upcoming First)</option>
            <option value="eventDateDesc">Event Date (Latest First)</option>
            <option value="guestsDesc">Guests Count (Largest First)</option>
            <option value="createdAtDesc">Booking Date (Newest)</option>
          </select>

          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`rounded-lg p-1.5 transition ${
                viewMode === "card" ? "bg-white text-[#1a3c36] shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Card View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-lg p-1.5 transition ${
                viewMode === "table" ? "bg-white text-[#1a3c36] shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
              title="Table View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Orders Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-center shadow-sm">
          <LoaderCircle size={36} className="animate-spin text-[#d4a843]" />
          <p className="mt-3 text-sm font-bold text-slate-700">Loading confirmed catering orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-center shadow-sm">
          <UtensilsCrossed size={40} className="text-slate-300" />
          <p className="mt-3 text-base font-bold text-slate-800">No confirmed event orders found</p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Event orders will show here automatically once confirmed. Pending quotations and cancelled orders are filtered out.
          </p>
        </div>
      ) : viewMode === "card" ? (
        /* ================= CARD VIEW ================= */
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {filteredOrders.map((order) => {
            const urgency = getEventDateUrgency(order.event_date);
            const items = Array.isArray(order.items) ? order.items : [];
            const isUpdating = updatingId === order.id;

            return (
              <div
                key={order.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Card Top */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-[#1a3c36]">
                          #{order.event_order_number}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                            statusStyles[order.status] || "border-slate-300 bg-slate-50 text-slate-700"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="mt-1 text-base font-extrabold text-slate-900">
                        {order.event_type || "Catering Event"}
                      </p>
                    </div>

                    {/* Urgency Badge */}
                    <span className={`rounded-xl px-2.5 py-1 text-xs font-black shadow-sm ${urgency.badgeBg}`}>
                      {urgency.label}
                    </span>
                  </div>

                  {/* Event Timing & Guests */}
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date & Time</span>
                      <p className="mt-0.5 font-bold text-slate-800">
                        {formatDate(order.event_date)}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-600">
                        {formatTime(order.event_time)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Guests & Diet</span>
                      <p className="mt-0.5 font-extrabold text-[#1a3c36]">
                        {order.guest_count} Guests
                      </p>
                      <p className="text-[11px] font-semibold text-slate-600">
                        Diet: {order.dietary_preference || "Mixed"}
                      </p>
                    </div>
                  </div>

                  {/* Contact & Venue */}
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <p className="flex items-center gap-1.5 font-medium truncate">
                      <UserRound size={13} className="text-slate-400 shrink-0" />
                      <span>{order.customer_name}</span>
                      <span className="text-slate-400">•</span>
                      <span>{order.customer_phone}</span>
                    </p>
                    {order.venue_address && (
                      <p className="flex items-center gap-1.5 font-medium truncate">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{order.venue_address}</span>
                      </p>
                    )}
                  </div>

                  {/* Customer Special Requests */}
                  {order.special_requests && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900">
                      <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                      <div>
                        <strong className="font-bold">Kitchen Instructions: </strong>
                        <span>{order.special_requests}</span>
                      </div>
                    </div>
                  )}

                  {/* Dishes Preview */}
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Menu Dishes ({items.length})
                    </p>
                    <div className="mt-2 space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {item.product_image ? (
                              <img
                                src={resolveImageUrl(item.product_image)}
                                alt=""
                                className="h-8 w-8 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-[#1a3c36] font-bold">
                                🍽️
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate">{item.product_name}</p>
                              <p className="text-[10px] text-slate-500">
                                {item.category_name} {item.portion_size ? `• ${item.portion_size}` : ""}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-md bg-[#1a3c36] px-2 py-1 text-xs font-black text-white">
                            × {item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 p-3.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrder(order);
                      setKitchenNotes(order.admin_notes || "");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
                  >
                    <Eye size={13} />
                    Prep Sheet
                  </button>

                  <div className="flex items-center gap-1.5">
                    {order.status === "Confirmed" && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(order.id, "Preparing")}
                        className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Flame size={13} />
                        Start Cooking
                      </button>
                    )}

                    {order.status === "Preparing" && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(order.id, "Ready")}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={13} />
                        Mark Ready 🔔
                      </button>
                    )}

                    {order.status === "Ready" && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(order.id, "Completed")}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#1a3c36] px-3 py-1.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-[#25524a] disabled:opacity-50"
                      >
                        <Check size={13} />
                        Completed ✓
                      </button>
                    )}

                    {order.status === "Completed" && (
                      <span className="text-xs font-bold text-slate-500">Fulfilled</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= TABLE VIEW ================= */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#d4a843] text-white uppercase tracking-wider font-extrabold">
                <tr>
                  <th className="px-4 py-3.5">Order #</th>
                  <th className="px-4 py-3.5">Event Info</th>
                  <th className="px-4 py-3.5">Date & Time</th>
                  <th className="px-4 py-3.5">Guests & Diet</th>
                  <th className="px-4 py-3.5">Dishes Summary</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Kitchen Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredOrders.map((order) => {
                  const urgency = getEventDateUrgency(order.event_date);
                  const items = Array.isArray(order.items) ? order.items : [];
                  const isUpdating = updatingId === order.id;

                  return (
                    <tr key={order.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 font-mono font-extrabold text-[#1a3c36]">
                        #{order.event_order_number}
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-900">{order.event_type || "Catering"}</p>
                        <p className="text-[11px] text-slate-500">{order.customer_name} • {order.customer_phone}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${urgency.badgeBg}`}>
                            {urgency.label}
                          </span>
                          <span className="font-bold text-slate-800">{formatDate(order.event_date)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{formatTime(order.event_time)}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-extrabold text-[#1a3c36]">{order.guest_count} Guests</p>
                        <p className="text-[11px] text-slate-500">{order.dietary_preference || "Mixed"}</p>
                      </td>

                      <td className="px-4 py-3.5 max-w-xs truncate">
                        <p className="font-bold text-slate-800">{items.length} Dishes Total</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {items.map((it) => `${it.product_name} (×${it.quantity})`).join(", ")}
                        </p>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                            statusStyles[order.status] || "border-slate-300 bg-slate-50 text-slate-700"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(order);
                              setKitchenNotes(order.admin_notes || "");
                            }}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100"
                            title="View Kitchen Ticket"
                          >
                            <Eye size={15} />
                          </button>

                          {order.status === "Confirmed" && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(order.id, "Preparing")}
                              className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              Cook
                            </button>
                          )}

                          {order.status === "Preparing" && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(order.id, "Ready")}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Ready 🔔
                            </button>
                          )}

                          {order.status === "Ready" && (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleUpdateStatus(order.id, "Completed")}
                              className="rounded-lg bg-[#1a3c36] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#25524a] disabled:opacity-50"
                            >
                              Done ✓
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= KITCHEN PREP TICKET MODAL ================= */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-[#1a3c36] p-2 text-white">
                  <CookingPot size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Kitchen Prep Ticket #{selectedOrder.event_order_number}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedOrder.event_type} • {selectedOrder.guest_count} Guests
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Event Timing Banner */}
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 p-3.5 text-xs text-amber-950">
                <div>
                  <span className="font-bold uppercase tracking-wider text-amber-700 text-[10px]">Event Timing</span>
                  <p className="mt-0.5 font-black text-base">{formatDate(selectedOrder.event_date)}</p>
                  <p className="font-bold text-amber-800">{formatTime(selectedOrder.event_time)}</p>
                </div>
                <div>
                  <span className="font-bold uppercase tracking-wider text-amber-700 text-[10px]">Catering Details</span>
                  <p className="mt-0.5 font-black text-base text-[#1a3c36]">{selectedOrder.guest_count} Guests</p>
                  <p className="font-bold text-slate-700">Diet: {selectedOrder.dietary_preference || "Mixed"}</p>
                </div>
              </div>

              {/* Customer Notes */}
              {selectedOrder.special_requests && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-900">
                  <p className="font-bold uppercase tracking-wider text-rose-700 text-[10px]">Customer Kitchen Notes</p>
                  <p className="mt-1 font-semibold">{selectedOrder.special_requests}</p>
                </div>
              )}

              {/* Delivery / Venue Address */}
              {selectedOrder.venue_address && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Venue / Delivery Location</p>
                  <p className="mt-1 font-semibold text-slate-800">{selectedOrder.venue_address}</p>
                </div>
              )}

              {/* Checklist Dishes */}
              <div>
                <div className="flex items-center justify-between pb-2">
                  <h4 className="text-sm font-black text-slate-900">
                    Dishes To Cook (Check off as prepared)
                  </h4>
                  <span className="text-xs font-bold text-slate-500">
                    {selectedOrder.items?.length || 0} items
                  </span>
                </div>

                <div className="space-y-2">
                  {(selectedOrder.items || []).map((item) => {
                    const checkKey = `${selectedOrder.id}-${item.id}`;
                    const isChecked = !!checkedItems[checkKey];

                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleCheckItem(selectedOrder.id, item.id)}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3 transition ${
                          isChecked
                            ? "border-emerald-300 bg-emerald-50/70 opacity-70"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          {item.product_image && (
                            <img
                              src={resolveImageUrl(item.product_image)}
                              alt=""
                              className="h-10 w-10 rounded-xl object-cover"
                            />
                          )}
                          <div className="min-w-0">
                            <p className={`text-sm font-bold text-slate-900 ${isChecked ? "line-through text-slate-500" : ""}`}>
                              {item.product_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.category_name} {item.portion_size ? `• ${item.portion_size}` : ""}
                            </p>
                            {item.notes && (
                              <p className="mt-0.5 text-xs font-semibold text-amber-700">Note: {item.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="rounded-xl bg-[#1a3c36] px-3 py-1 text-sm font-black text-white">
                            × {item.quantity} Portions
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Kitchen internal notes */}
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Kitchen Chef Log / Internal Notes
                </label>
                <textarea
                  rows={2}
                  value={kitchenNotes}
                  onChange={(e) => setKitchenNotes(e.target.value)}
                  placeholder="e.g., Cooking in station 2, packed in thermal warmers..."
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-[#1a3c36] focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-6 py-4">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100"
              >
                <Printer size={15} />
                Print Prep Ticket
              </button>

              <div className="flex items-center gap-2">
                {selectedOrder.status === "Confirmed" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, "Preparing")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-blue-700"
                  >
                    <Flame size={15} />
                    Start Preparing
                  </button>
                )}

                {selectedOrder.status === "Preparing" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, "Ready")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-emerald-700"
                  >
                    <CheckCircle2 size={15} />
                    Mark Ready for Event 🔔
                  </button>
                )}

                {selectedOrder.status === "Ready" && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedOrder.id, "Completed")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a3c36] px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-[#25524a]"
                  >
                    <Check size={15} />
                    Mark Completed ✓
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
