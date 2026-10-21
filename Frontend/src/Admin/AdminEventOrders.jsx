import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  CircleAlert,
  Eye,
  Filter,
  Info,
  LayoutGrid,
  List,
  LoaderCircle,
  MapPin,
  Package,
  PartyPopper,
  Percent,
  Phone,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Tag,
  Trash2,
  UserRound,
  Users,
  Utensils,
  UtensilsCrossed,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { BACKEND_BASE_URL } from "../api";

const STATUS_OPTIONS = ["All", "Pending", "Quotation Sent", "Confirmed", "Preparing", "Ready", "Completed", "Cancelled"];

const statusStyles = {
  Pending: "border-amber-300 bg-amber-50 text-amber-800",
  "Quotation Sent": "border-sky-300 bg-sky-50 text-sky-800 font-bold",
  Confirmed: "border-emerald-300 bg-emerald-50 text-emerald-800 font-bold",
  Preparing: "border-purple-300 bg-purple-50 text-purple-800",
  Ready: "border-indigo-300 bg-indigo-50 text-indigo-800",
  Completed: "border-teal-300 bg-teal-50 text-teal-800 font-bold",
  Cancelled: "border-slate-200 bg-slate-100 text-slate-600",
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const dateString = typeof value === "string" ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);
  const date = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? dateString
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const formatTime = (value) => {
  if (!value) return "Time unavailable";
  const [hour, minute] = String(value).slice(0, 5).split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute || 0).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
};

const renderStatus = (status) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyles[status] || statusStyles.Cancelled}`}>
    {status}
  </span>
);

const resolveImageUrl = (image) => {
  if (!image || typeof image !== "string") return "";
  if (/^(https?:\/\/|data:)/i.test(image)) return image;
  return `${BACKEND_BASE_URL}${image.startsWith("/") ? image : `/${image}`}`;
};

export default function AdminEventOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [viewMode, setViewMode] = useState("table");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  // Quotation Editor State
  const [quoteItemPrices, setQuoteItemPrices] = useState({});
  const [quoteDiscountType, setQuoteDiscountType] = useState("fixed"); // "fixed" | "percentage"
  const [quoteDiscountValue, setQuoteDiscountValue] = useState("");
  const [quoteDeliveryFee, setQuoteDeliveryFee] = useState("");
  const [sendingQuote, setSendingQuote] = useState(false);

  const fetchEventOrders = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.get("/event-orders", {
        params: { status: activeStatus === "All" ? undefined : activeStatus },
      });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setOrders(res.data.data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Failed to fetch event orders:", err);
      toast.error("Could not load event orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    fetchEventOrders(true);
    const interval = setInterval(() => fetchEventOrders(false), 15000);
    return () => clearInterval(interval);
  }, [fetchEventOrders]);

  // View full details of a specific order
  const handleViewDetails = async (orderId) => {
    try {
      const res = await api.get(`/event-orders/${orderId}`);
      if (res.data?.success && res.data.data) {
        const orderData = res.data.data;
        setSelectedOrder(orderData);
        setAdminNotes(orderData.admin_notes || "");

        // Prefill quotation inputs
        const initialPrices = {};
        (orderData.items || []).forEach((item) => {
          initialPrices[item.id] =
            item.discounted_unit_price !== null && item.discounted_unit_price !== undefined
              ? Number(item.discounted_unit_price)
              : Number(item.unit_price);
        });
        setQuoteItemPrices(initialPrices);
        setQuoteDiscountType(orderData.discount_type || "fixed");
        setQuoteDiscountValue(
          orderData.discount_value !== null && orderData.discount_value !== undefined && Number(orderData.discount_value) > 0
            ? String(orderData.discount_value)
            : ""
        );
        setQuoteDeliveryFee(
          orderData.delivery_fee !== null && orderData.delivery_fee !== undefined && Number(orderData.delivery_fee) > 0
            ? String(orderData.delivery_fee)
            : ""
        );
      }
    } catch (err) {
      console.error("Failed to get order details:", err);
      toast.error("Could not load order details.");
    }
  };

  // Live quotation calculations
  const quoteCalculations = useMemo(() => {
    if (!selectedOrder) {
      return {
        originalSubtotal: 0,
        itemsDiscountedSubtotal: 0,
        itemSavings: 0,
        overallDiscountAmount: 0,
        totalSavings: 0,
        deliveryFee: 0,
        finalQuotedTotal: 0,
      };
    }
    const items = selectedOrder.items || [];
    let originalSubtotal = 0;
    let itemsDiscountedSubtotal = 0;

    items.forEach((item) => {
      const qty = Number(item.quantity) || 1;
      const origUnit = Number(item.unit_price) || 0;
      const quotedUnit =
        quoteItemPrices[item.id] !== undefined && quoteItemPrices[item.id] !== ""
          ? Math.max(0, Number(quoteItemPrices[item.id]))
          : origUnit;
      originalSubtotal += origUnit * qty;
      itemsDiscountedSubtotal += quotedUnit * qty;
    });

    const itemSavings = Math.max(0, originalSubtotal - itemsDiscountedSubtotal);
    const discVal = Math.max(0, Number(quoteDiscountValue) || 0);
    let overallDiscountAmount = 0;
    if (quoteDiscountType === "percentage") {
      overallDiscountAmount = (itemsDiscountedSubtotal * Math.min(100, discVal)) / 100;
    } else {
      overallDiscountAmount = Math.min(itemsDiscountedSubtotal, discVal);
    }

    const totalSavings = itemSavings + overallDiscountAmount;
    const deliveryFee = Math.max(0, Number(quoteDeliveryFee) || 0);
    const finalQuotedTotal = Math.max(0, itemsDiscountedSubtotal - overallDiscountAmount + deliveryFee);

    return {
      originalSubtotal: Number(originalSubtotal.toFixed(2)),
      itemsDiscountedSubtotal: Number(itemsDiscountedSubtotal.toFixed(2)),
      itemSavings: Number(itemSavings.toFixed(2)),
      overallDiscountAmount: Number(overallDiscountAmount.toFixed(2)),
      totalSavings: Number(totalSavings.toFixed(2)),
      deliveryFee: Number(deliveryFee.toFixed(2)),
      finalQuotedTotal: Number(finalQuotedTotal.toFixed(2)),
    };
  }, [selectedOrder, quoteItemPrices, quoteDiscountType, quoteDiscountValue, quoteDeliveryFee]);

  // Send Quotation Handler
  const handleSendQuotation = async () => {
    if (!selectedOrder) return;
    try {
      setSendingQuote(true);
      const itemDiscounts = (selectedOrder.items || []).map((item) => {
        const quotedUnit =
          quoteItemPrices[item.id] !== undefined && quoteItemPrices[item.id] !== ""
            ? Math.max(0, Number(quoteItemPrices[item.id]))
            : Number(item.unit_price);
        const discPerUnit = Math.max(0, Number(item.unit_price) - quotedUnit);
        const totalItemDisc = discPerUnit * Number(item.quantity || 1);
        return {
          id: item.id,
          discounted_unit_price: quotedUnit,
          discount_amount: Number(totalItemDisc.toFixed(2)),
        };
      });

      const payload = {
        discount_type: quoteDiscountType,
        discount_value: Number(quoteDiscountValue) || 0,
        discount_amount: quoteCalculations.totalSavings,
        delivery_fee: quoteCalculations.deliveryFee,
        quoted_amount: quoteCalculations.finalQuotedTotal,
        admin_notes: adminNotes,
        item_discounts: itemDiscounts,
      };

      const res = await api.post(`/event-orders/${selectedOrder.id}/quote`, payload);
      if (res.data?.success) {
        toast.success(`Quotation of ₹${quoteCalculations.finalQuotedTotal.toLocaleString("en-IN")} sent to customer!`);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === selectedOrder.id || o.event_order_number === selectedOrder.id
              ? {
                  ...o,
                  status: "Quotation Sent",
                  quoted_amount: quoteCalculations.finalQuotedTotal,
                  discount_amount: quoteCalculations.totalSavings,
                }
              : o
          )
        );
        setSelectedOrder((prev) => ({
          ...prev,
          status: "Quotation Sent",
          quoted_amount: quoteCalculations.finalQuotedTotal,
          discount_type: quoteDiscountType,
          discount_value: Number(quoteDiscountValue) || 0,
          discount_amount: quoteCalculations.totalSavings,
          delivery_fee: quoteCalculations.deliveryFee,
          admin_notes: adminNotes,
          customer_action: null,
          customer_action_reason: null,
          items: prev.items.map((it) => {
            const found = itemDiscounts.find((d) => d.id === it.id);
            return found
              ? {
                  ...it,
                  discounted_unit_price: found.discounted_unit_price,
                  discount_amount: found.discount_amount,
                }
              : it;
          }),
        }));
      }
    } catch (err) {
      console.error("Failed to send quotation:", err);
      toast.error(err.response?.data?.message || "Failed to send quotation.");
    } finally {
      setSendingQuote(false);
    }
  };

  // Status update
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setUpdatingStatus(true);
      const res = await api.patch(`/event-orders/${orderId}/status`, {
        status: newStatus,
        admin_notes: adminNotes,
      });
      if (res.data?.success) {
        toast.success(`Order marked as ${newStatus}`);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId || o.event_order_number === orderId ? { ...o, status: newStatus } : o))
        );
        if (selectedOrder) {
          setSelectedOrder((prev) => ({ ...prev, status: newStatus, admin_notes: adminNotes }));
        }
      }
    } catch (err) {
      console.error("Status update error:", err);
      toast.error(err.response?.data?.message || "Failed to update status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Delete Order
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to permanently delete this event order?")) {
      return;
    }
    try {
      const res = await api.delete(`/event-orders/${orderId}`);
      if (res.data?.success) {
        toast.success("Event order deleted.");
        setOrders((prev) => prev.filter((o) => o.id !== orderId && o.event_order_number !== orderId));
        if (selectedOrder?.id === orderId || selectedOrder?.event_order_number === orderId) {
          setSelectedOrder(null);
        }
      }
    } catch (err) {
      console.error("Delete order error:", err);
      toast.error("Could not delete order.");
    }
  };

  // Status counts matching AdminReservations
  const counts = useMemo(() => {
    const result = {
      All: orders.length,
      Pending: 0,
      "Quotation Sent": 0,
      Confirmed: 0,
      Preparing: 0,
      Ready: 0,
      Completed: 0,
      Cancelled: 0,
    };
    orders.forEach((order) => {
      if (result[order.status] !== undefined) result[order.status] += 1;
    });
    return result;
  }, [orders]);

  // Filtered and sorted orders
  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return orders
      .filter((order) => {
        const matchesStatus = activeStatus === "All" || order.status === activeStatus;
        if (!matchesStatus) return false;
        if (!q) return true;
        const haystack = [
          order.event_order_number,
          order.customer_name,
          order.customer_phone,
          order.customer_email,
          order.event_type,
          order.venue_address,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        if (sortBy === "soonest") {
          const dateA = new Date(`${String(a.event_date).slice(0, 10)}T${a.event_time || "00:00"}`).getTime() || 0;
          const dateB = new Date(`${String(b.event_date).slice(0, 10)}T${b.event_time || "00:00"}`).getTime() || 0;
          return dateA - dateB;
        }
        if (sortBy === "amount_high") {
          const amtA = Number(a.quoted_amount || a.total_estimated_amount || 0);
          const amtB = Number(b.quoted_amount || b.total_estimated_amount || 0);
          return amtB - amtA;
        }
        const createdA = new Date(a.created_at || 0).getTime() || 0;
        const createdB = new Date(b.created_at || 0).getTime() || 0;
        return createdB - createdA;
      });
  }, [orders, activeStatus, searchTerm, sortBy]);

  return (
    <main className="min-h-screen p-4 md:p-2 lg:p-2">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a34f32]">Front of house</p>
            <h1 className="mt-1 font-serif text-3xl font-bold text-[#203129]">Bulk &amp; Event Orders</h1>
            <p className="mt-2 text-sm text-slate-500">
              Review catering requests, send discounted quotations, and track order approvals.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchEventOrders(true)}
            disabled={loading}
            aria-label="Refresh event orders"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#dfe2e5] bg-white px-4 text-sm font-semibold text-[#34443b] transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </header>

        {/* Top Summary Cards (matching AdminReservations) */}
        <section aria-label="Event order status summaries" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[
            { status: "All", label: "All Orders", caption: "Every catering booking", icon: PartyPopper, bg: "bg-[#1a3c36]" },
            { status: "Pending", label: "Pending Review", caption: "Waiting for quotation", icon: Clock3, bg: "bg-[#f59e0b]" },
            { status: "Quotation Sent", label: "Quotation Sent", caption: "Awaiting customer approval", icon: Send, bg: "bg-[#0284c7]" },
            { status: "Confirmed", label: "Confirmed", caption: "Quote accepted & booked", icon: CheckCircle2, bg: "bg-[#22c55e]" },
            { status: "Preparing", label: "In Kitchen", caption: "Cooking & preparation", icon: Utensils, bg: "bg-[#8b5cf6]" },
            { status: "Completed", label: "Completed", caption: "Delivered & settled", icon: CheckCircle2, bg: "bg-[#0d9488]" },
          ].map(({ status, label, caption, icon: Icon, bg }) => (
            <button
              key={status}
              type="button"
              aria-pressed={activeStatus === status}
              onClick={() => setActiveStatus(status === "All" || activeStatus === status ? "All" : status)}
              className={`relative flex min-h-[140px] min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-transparent p-4 text-left text-white shadow-[0_2px_10px_rgba(20,56,34,0.08)] transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5 ${bg} ${
                activeStatus === status ? "ring-4 ring-white/40" : ""
              }`}
            >
              <div className="relative z-10 flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/20 shadow-sm">
                  <Icon size={24} strokeWidth={2.2} />
                </div>
                <div className="mt-0.5 min-w-0 flex-1">
                  <h2 className="mb-1 truncate text-xs font-semibold opacity-90">{label}</h2>
                  <div className="text-[26px] font-extrabold leading-none tracking-tight">{counts[status] || 0}</div>
                </div>
              </div>
              <div className="relative z-10 mt-5 text-[11px] font-medium opacity-75">{caption}</div>
              <div className="pointer-events-none absolute bottom-0 right-0 h-16 w-24 opacity-40" aria-hidden="true">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="h-full w-full">
                  <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill="white" fillOpacity="0.4" />
                  <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="white" strokeWidth="2.5" />
                </svg>
              </div>
            </button>
          ))}
        </section>

        {/* Filter bar: Search, Status, Sort, View Toggle */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#e1ded8] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-sm sm:flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a857d]" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search reference, customer, phone, event, venue..."
              aria-label="Search bulk orders"
              className="h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-11 pr-3 text-sm text-[#2d3830] outline-none placeholder:text-[#89938c] focus:border-[#6d9a79]"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="mr-1 text-xs text-gray-500">
              {filteredOrders.length} of {orders.length}
            </span>
            <select
              value={activeStatus}
              onChange={(event) => setActiveStatus(event.target.value)}
              aria-label="Filter orders by status"
              className="h-[46px] rounded-xl border border-[#dfe2e5] bg-white px-3 text-sm text-[#34443b] outline-none focus:border-[#6d9a79]"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status} ({counts[status] || 0})
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              aria-label="Sort bulk orders"
              className="h-[46px] rounded-xl border border-[#dfe2e5] bg-white px-3 text-sm text-[#34443b] outline-none focus:border-[#6d9a79]"
            >
              <option value="latest">Sort by: Latest Created</option>
              <option value="soonest">Sort by: Event Date (Soonest)</option>
              <option value="amount_high">Sort by: Amount (High to Low)</option>
            </select>
            <div className="flex h-[46px] overflow-hidden rounded-xl border border-[#dfe2e5] bg-white" role="group" aria-label="Order view mode">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                aria-label="Table view"
                aria-pressed={viewMode === "table"}
                title="Table view"
                className={`grid w-11 place-items-center border-r border-[#dfe2e5] ${
                  viewMode === "table" ? "bg-[#1a3c36] text-white" : "text-[#66736b] hover:bg-gray-50"
                }`}
              >
                <List size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("card")}
                aria-label="Card view"
                aria-pressed={viewMode === "card"}
                title="Card view"
                className={`grid w-11 place-items-center ${
                  viewMode === "card" ? "bg-[#1a3c36] text-white" : "text-[#66736b] hover:bg-gray-50"
                }`}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Section: Loading, Empty, Table, or Card View */}
        {loading && orders.length === 0 ? (
          <div className="rounded-2xl border border-[#e7e0d8] bg-white p-16 text-center text-sm text-gray-500 shadow-sm">
            <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin text-[#1a3c36]" />
            Loading bulk catering orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#e6ddd1] bg-[#faf9f8] py-16 text-center shadow-sm">
            <PartyPopper className="mx-auto h-12 w-12 text-[#8a8a8a]" />
            <h2 className="mt-3 text-base font-bold text-[#333]">
              {activeStatus === "All" ? "No bulk or event orders found" : `No ${activeStatus.toLowerCase()} orders`}
            </h2>
            <p className="mt-1 text-xs text-[#888]">Customer bulk requests will appear here.</p>
          </div>
        ) : viewMode === "table" ? (
          /* Table View with Gold Header matching AdminReservations */
          <div className="overflow-x-auto rounded-2xl border border-[#e7e0d8] bg-white shadow-sm">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-[#d4a843] text-[11px] uppercase tracking-wide text-white">
                <tr>
                  {["#", "Order Ref", "Customer", "Event Details", "Date & Time", "Headcount & Items", "Quoted / Est. Amount", "Status", "Actions"].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-4 py-4 font-bold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0eb]">
                {filteredOrders.map((order, index) => (
                  <tr key={order.id} className="align-middle hover:bg-[#fbfcfa]">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-[#66736b]">{index + 1}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-bold text-[#1a3c36]">
                      {order.event_order_number}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[#34443b]">{order.customer_name}</span>
                      <span className="mt-1 block text-xs text-[#7c8980]">{order.customer_phone}</span>
                      {order.customer_email && <span className="block text-xs text-[#7c8980]">{order.customer_email}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                        {order.event_type}
                      </span>
                      <span className="mt-1 block max-w-48 truncate text-xs text-[#66736b]" title={order.venue_address}>
                        {order.venue_address}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-semibold text-[#34443b]">{formatDate(order.event_date)}</span>
                      <span className="mt-1 block text-xs text-[#66736b]">{order.event_time}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-semibold text-[#34443b]">{order.guest_count} Pax</span>
                      <span className="mt-1 block text-xs text-[#66736b]">
                        {order.total_items || (order.items || []).length} dishes ({(order.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0) || order.total_quantity || 0} portions)
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {order.status === "Quotation Sent" || order.quoted_amount ? (
                        <div>
                          <span className="font-black text-[#1a3c36] text-sm block">
                            ₹{Number(order.quoted_amount || order.total_estimated_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                          {Number(order.discount_amount || 0) > 0 && (
                            <span className="inline-block rounded-md bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              -₹{Number(order.discount_amount).toLocaleString("en-IN")} off
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-black text-[#1a3c36] text-sm">
                          ₹{Number(order.total_estimated_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{renderStatus(order.status)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(order.id)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                            order.status === "Pending"
                              ? "bg-[#1a3c36] text-white hover:bg-[#245048]"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                          title={order.status === "Pending" ? "Review & Send Quotation" : "View Details"}
                        >
                          <Eye size={14} />
                          {order.status === "Pending" ? "Review & Quote" : "View"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(order.id)}
                          aria-label="Delete order"
                          title="Delete order"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card View matching AdminReservations */
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredOrders.map((order) => (
              <article
                key={order.id}
                className="flex flex-col justify-between rounded-2xl border border-[#e7e0d8] bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-bold text-[#a34f32] bg-[#fbf5ee] px-2.5 py-0.5 rounded-md border border-[#f3e7d6]">
                        {order.event_order_number}
                      </span>
                      <h2 className="mt-1.5 truncate font-serif text-xl font-bold text-[#203129]">
                        {order.customer_name}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">{order.customer_phone}</p>
                      {order.customer_email && <p className="text-xs text-slate-400">{order.customer_email}</p>}
                    </div>
                    {renderStatus(order.status)}
                  </div>

                  <div className="mt-4 grid gap-2.5 rounded-xl bg-[#f7f8f5] p-3.5 text-xs text-slate-700">
                    <p className="flex items-center gap-2 font-medium">
                      <PartyPopper className="h-4 w-4 shrink-0 text-[#a34f32]" />
                      <span className="font-bold text-[#203129]">{order.event_type}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 shrink-0 text-[#a34f32]" />
                      {formatDate(order.event_date)} · {order.event_time}
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="h-4 w-4 shrink-0 text-[#a34f32]" />
                      {order.guest_count} Pax · {order.total_items || (order.items || []).length} dishes ({(order.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0) || order.total_quantity || 0} portions)
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-[#a34f32]" />
                      <span className="truncate" title={order.venue_address}>{order.venue_address}</span>
                    </p>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between border-t border-[#f0ebe6] pt-3">
                    <span className="text-xs font-bold text-slate-500">
                      {order.status === "Quotation Sent" || order.quoted_amount ? "Quoted Total:" : "Estimated Menu Total:"}
                    </span>
                    <div className="text-right">
                      <span className="font-black text-base text-[#1a3c36]">
                        ₹{Number(order.quoted_amount || order.total_estimated_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                      {Number(order.discount_amount || 0) > 0 && (
                        <span className="block text-[10px] font-bold text-emerald-600">
                          -₹{Number(order.discount_amount).toLocaleString("en-IN")} off
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-[#f0ebe6] pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleViewDetails(order.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                      order.status === "Pending"
                        ? "bg-[#1a3c36] text-white shadow-xs hover:bg-[#245048]"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Eye size={14} />
                    {order.status === "Pending" ? "Review & Quote" : "View Details"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(order.id)}
                    aria-label="Delete order"
                    title="Delete order"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

      {/* DETAILED MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="rounded-full bg-[#f6eee2] px-3 py-1 font-mono text-xs font-black text-[#a85b00]">
                  {selectedOrder.event_order_number}
                </span>
                <h2 className="mt-2 text-2xl font-black text-[#1a3c36]">
                  {selectedOrder.event_type} · {selectedOrder.guest_count} Guests
                </h2>
                <p className="text-xs text-slate-500">
                  Booked on {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString("en-IN") : "--"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-6 space-y-6 text-xs sm:text-sm">
              {/* QUOTATION STATUS ALERTS */}
              {selectedOrder.customer_action === "accepted" && (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-bold text-sm">Customer Accepted Quotation!</p>
                      <p className="text-xs text-emerald-700">
                        The customer has confirmed the discounted quotation of ₹{Number(selectedOrder.quoted_amount).toLocaleString("en-IN")}. Booking is confirmed.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-200 px-3.5 py-1 text-xs font-black uppercase text-emerald-800">
                    Confirmed
                  </span>
                </div>
              )}

              {selectedOrder.customer_action === "rejected" && (
                <div className="rounded-2xl border border-rose-300 bg-rose-50/90 p-4 text-rose-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <X className="h-6 w-6 shrink-0 text-rose-600" />
                    <div>
                      <p className="font-bold text-sm">Customer Rejected Quotation</p>
                      <p className="text-xs text-rose-700">
                        {selectedOrder.customer_action_reason
                          ? `Reason given: "${selectedOrder.customer_action_reason}"`
                          : "The customer declined the estimated quote. Order status is Cancelled."}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-rose-200 px-3.5 py-1 text-xs font-black uppercase text-rose-800">
                    Cancelled
                  </span>
                </div>
              )}

              {selectedOrder.status === "Quotation Sent" && !selectedOrder.customer_action && (
                <div className="rounded-2xl border border-sky-300 bg-sky-50/90 p-4 text-sky-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 shrink-0 text-sky-600" />
                    <div>
                      <p className="font-bold text-sm">Quotation Sent to Customer (Awaiting Approval)</p>
                      <p className="text-xs text-sky-700">
                        Estimated amount of ₹{Number(selectedOrder.quoted_amount).toLocaleString("en-IN")} was sent. Waiting for customer to Accept or Reject in their account.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-sky-200 px-3.5 py-1 text-xs font-black uppercase text-sky-800">
                    Pending Response
                  </span>
                </div>
              )}

              {/* Customer & Event Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Customer Info</p>
                  <p className="mt-1 font-bold text-slate-900">{selectedOrder.customer_name}</p>
                  <p className="text-slate-600 flex items-center gap-1.5 mt-0.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> {selectedOrder.customer_phone}
                  </p>
                  {selectedOrder.customer_email && (
                    <p className="text-slate-600 mt-0.5">{selectedOrder.customer_email}</p>
                  )}
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Event Schedule</p>
                  <p className="mt-1 font-bold text-slate-900">
                    Date: {selectedOrder.event_date ? new Date(selectedOrder.event_date).toLocaleDateString("en-IN") : "--"}
                  </p>
                  <p className="text-slate-600">Serving Time: {selectedOrder.event_time}</p>
                  <p className="text-slate-600">Dietary: {selectedOrder.dietary_preference || "Mixed"}</p>
                </div>

                <div className="sm:col-span-2 border-t border-slate-200/70 pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Venue / Delivery Address</p>
                  <p className="mt-1 font-medium text-slate-800 leading-relaxed">{selectedOrder.venue_address}</p>
                </div>

                {selectedOrder.special_requests && (
                  <div className="sm:col-span-2 border-t border-slate-200/70 pt-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Special Requests / Notes</p>
                    <p className="mt-1 font-medium text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-relaxed">
                      {selectedOrder.special_requests}
                    </p>
                  </div>
                )}
              </div>

              {/* QUOTATION & PER-ITEM DISCOUNT BUILDER */}
              <div className="rounded-3xl border-2 border-amber-200 bg-amber-50/30 p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-[#b07838]" />
                    <div>
                      <h4 className="text-sm font-black text-[#1a3c36]">
                        Bulk Quotation &amp; Discount Management
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Adjust price per food item and/or apply an overall bulk order discount.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#f6eee2] px-3 py-1 text-xs font-black text-[#a85b00]">
                    {(selectedOrder.items || []).length} Menu Items
                  </span>
                </div>

                {/* Menu Items Table with Per-Food Discount Inputs */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase text-slate-500">
                        <th className="px-3.5 py-2.5">Item</th>
                        <th className="px-3.5 py-2.5 text-center">Portion</th>
                        <th className="px-3.5 py-2.5 text-center">Qty</th>
                        <th className="px-3.5 py-2.5 text-right">Standard Price</th>
                        <th className="px-3.5 py-2.5 text-center">Quoted Unit Price (₹)</th>
                        <th className="px-3.5 py-2.5 text-right">Line Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(selectedOrder.items || []).map((item) => {
                        const origPrice = Number(item.unit_price) || 0;
                        const qty = Number(item.quantity) || 1;
                        const quotedPrice =
                          quoteItemPrices[item.id] !== undefined && quoteItemPrices[item.id] !== ""
                            ? Math.max(0, Number(quoteItemPrices[item.id]))
                            : origPrice;
                        const isDiscounted = quotedPrice < origPrice;
                        const diff = origPrice - quotedPrice;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="px-3.5 py-3">
                              <p className="font-bold text-slate-900">{item.product_name}</p>
                              <p className="text-[10px] text-slate-400">{item.category_name || "Food"}</p>
                            </td>
                            <td className="px-3.5 py-3 text-center text-slate-500">{item.portion_size || "Standard"}</td>
                            <td className="px-3.5 py-3 text-center font-bold text-slate-800">{qty}</td>
                            <td className="px-3.5 py-3 text-right font-medium text-slate-500">
                              ₹{origPrice.toFixed(2)}
                            </td>
                            <td className="px-3.5 py-3">
                              <div className="flex flex-col items-center gap-1">
                                <div className="relative w-28">
                                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                    ₹
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={quoteItemPrices[item.id] ?? origPrice}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setQuoteItemPrices((prev) => ({
                                        ...prev,
                                        [item.id]: val === "" ? "" : Math.max(0, Number(val)),
                                      }));
                                    }}
                                    className={`w-full rounded-lg border py-1 pl-6 pr-2 text-right text-xs font-bold focus:outline-hidden ${
                                      isDiscounted
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                        : "border-slate-300 bg-slate-50 text-slate-800 focus:bg-white"
                                    }`}
                                  />
                                </div>
                                {isDiscounted && (
                                  <span className="text-[10px] font-bold text-emerald-600">
                                    -₹{diff.toFixed(2)} off / unit
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3.5 py-3 text-right">
                              {isDiscounted && (
                                <p className="text-[10px] text-slate-400 line-through">
                                  ₹{(origPrice * qty).toFixed(2)}
                                </p>
                              )}
                              <p className="font-black text-[#1a3c36] text-xs">
                                ₹{(quotedPrice * qty).toFixed(2)}
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Overall Discount & Delivery Fee Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl bg-white p-4 border border-slate-200">
                  {/* Overall Discount Field */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Overall Bulk Order Discount
                    </label>
                    <div className="flex gap-2">
                      <div className="inline-flex rounded-xl border border-slate-300 p-0.5 bg-slate-100">
                        <button
                          type="button"
                          onClick={() => setQuoteDiscountType("fixed")}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                            quoteDiscountType === "fixed"
                              ? "bg-[#1a3c36] text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Flat ₹
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuoteDiscountType("percentage")}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                            quoteDiscountType === "percentage"
                              ? "bg-[#1a3c36] text-white shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          % Percent
                        </button>
                      </div>

                      <div className="relative flex-1">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          {quoteDiscountType === "fixed" ? "₹" : "%"}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step={quoteDiscountType === "fixed" ? "10" : "1"}
                          max={quoteDiscountType === "percentage" ? "100" : undefined}
                          value={quoteDiscountValue}
                          onChange={(e) => setQuoteDiscountValue(e.target.value)}
                          placeholder={quoteDiscountType === "fixed" ? "e.g. 500" : "e.g. 10"}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-7 pr-3 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
                        />
                      </div>
                    </div>
                    {quoteCalculations.overallDiscountAmount > 0 && (
                      <p className="mt-1 text-[11px] font-bold text-emerald-600">
                        Deducts ₹{quoteCalculations.overallDiscountAmount.toFixed(2)} from total
                      </p>
                    )}
                  </div>

                  {/* Delivery / Event Logistics Fee */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Delivery / Setup Service Fee (Optional)
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={quoteDeliveryFee}
                        onChange={(e) => setQuoteDeliveryFee(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-7 pr-3 py-1.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Added for buffet setup, transport, or server staff.
                    </p>
                  </div>
                </div>

                {/* LIVE QUOTATION BREAKDOWN & SEND CTA */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Original Menu Total:</span>
                      <span className="font-bold">₹{quoteCalculations.originalSubtotal.toFixed(2)}</span>
                    </div>

                    {quoteCalculations.itemSavings > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Per-Dish Bulk Discount Savings:</span>
                        <span className="font-bold">-₹{quoteCalculations.itemSavings.toFixed(2)}</span>
                      </div>
                    )}

                    {quoteCalculations.overallDiscountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Overall Bulk Discount ({quoteDiscountType === "percentage" ? `${quoteDiscountValue}%` : `Flat ₹${quoteDiscountValue}`}):</span>
                        <span className="font-bold">-₹{quoteCalculations.overallDiscountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {quoteCalculations.totalSavings > 0 && (
                      <div className="flex justify-between text-emerald-800 font-bold border-t border-emerald-200/60 pt-1">
                        <span>Total Discount Provided:</span>
                        <span>-₹{quoteCalculations.totalSavings.toFixed(2)}</span>
                      </div>
                    )}

                    {quoteCalculations.deliveryFee > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Delivery / Setup Fee:</span>
                        <span className="font-bold">+₹{quoteCalculations.deliveryFee.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-baseline border-t border-emerald-300 pt-2 text-sm sm:text-base font-black text-[#1a3c36]">
                      <span>Final Estimated Quoted Amount:</span>
                      <span className="text-xl sm:text-2xl text-emerald-800">
                        ₹{quoteCalculations.finalQuotedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Send Quotation Button */}
                  <div className="mt-4 pt-3 border-t border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-[11px] text-slate-500">
                      Sending the quotation will notify the customer. They can review and <strong>Accept or Reject</strong> from their account.
                    </p>
                    <button
                      type="button"
                      disabled={sendingQuote}
                      onClick={handleSendQuotation}
                      className="w-full sm:w-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1a3c36] px-6 text-xs font-black uppercase tracking-wider text-white shadow-md transition hover:bg-[#255248] disabled:opacity-50"
                    >
                      {sendingQuote ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Sending Quotation...
                        </span>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Quotation to Customer
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Management & Admin Notes */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Override Booking Status &amp; Communications
                </h4>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500">Current Status:</span>
                  {["Pending", "Quotation Sent", "Confirmed", "Preparing", "Ready", "Completed", "Cancelled"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleUpdateStatus(selectedOrder.id, st)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                        selectedOrder.status === st
                          ? "bg-[#1a3c36] text-white shadow-xs"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Internal Notes / Customer Communications:
                  </label>
                  <textarea
                    rows="2"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="e.g. Spoke with customer, confirmed 50 pax, advance ₹5000 received via UPI."
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:outline-hidden"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedOrder.id, selectedOrder.status)}
                      disabled={updatingStatus}
                      className="rounded-xl bg-[#1a3c36] px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#255248] transition"
                    >
                      Save Notes
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </main>
);
}
