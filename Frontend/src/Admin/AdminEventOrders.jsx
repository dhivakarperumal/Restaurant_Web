import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Info,
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

const STATUS_BADGES = {
  Pending: "bg-amber-100 text-amber-800 border-amber-300",
  "Quotation Sent": "bg-sky-100 text-sky-800 border-sky-300 font-bold",
  Confirmed: "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold",
  Preparing: "bg-purple-100 text-purple-800 border-purple-300",
  Ready: "bg-indigo-100 text-indigo-800 border-indigo-300",
  Completed: "bg-teal-100 text-teal-800 border-teal-300",
  Cancelled: "bg-rose-100 text-rose-800 border-rose-300",
};

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

  // Metrics
  const metrics = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "Pending").length;
    const quotationSent = orders.filter((o) => o.status === "Quotation Sent").length;
    const confirmed = orders.filter((o) => o.status === "Confirmed").length;
    const preparing = orders.filter((o) => o.status === "Preparing").length;
    const completed = orders.filter((o) => o.status === "Completed").length;
    return { total, pending, quotationSent, confirmed, preparing, completed };
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
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
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [orders, activeStatus, searchTerm]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-[#fbfaf7] min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1a3c36] flex items-center gap-2.5">
            <PartyPopper className="h-7 w-7 text-[#b07838]" />
            Bulk &amp; Event Orders
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Manage catering requests, guest headcount, event menus, and approvals
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchEventOrders(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh List
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Bookings</p>
          <p className="mt-1 text-2xl font-black text-[#1a3c36]">{metrics.total}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pending Review</p>
          <p className="mt-1 text-2xl font-black text-amber-800">{metrics.pending}</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Confirmed</p>
          <p className="mt-1 text-2xl font-black text-blue-800">{metrics.confirmed}</p>
        </div>
        <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700">In Preparation</p>
          <p className="mt-1 text-2xl font-black text-purple-800">{metrics.preparing}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Delivered / Done</p>
          <p className="mt-1 text-2xl font-black text-emerald-800">{metrics.completed}</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        {/* Status Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-thin">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setActiveStatus(status)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                activeStatus === status
                  ? "bg-[#1a3c36] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID, name, phone, event..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-[#1a3c36] focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#b07838] border-t-transparent" />
            <p className="mt-3 text-xs font-bold text-slate-500">Loading bulk orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Package className="mx-auto h-12 w-12 text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">No event orders found</p>
            <p className="mt-1 text-xs">When users place bulk catering requests, they will show up here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-600">
                  <th className="px-4 py-3.5">Order Ref</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Event Details</th>
                  <th className="px-4 py-3.5">Date &amp; Time</th>
                  <th className="px-4 py-3.5">Dishes / Pax</th>
                  <th className="px-4 py-3.5">Estimated Total</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3.5 font-mono font-bold text-[#1a3c36]">
                      {order.event_order_number}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900">{order.customer_name}</p>
                      <p className="text-[11px] text-slate-500">{order.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-block rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                        {order.event_type}
                      </span>
                      <p className="mt-0.5 text-[11px] text-slate-500 truncate max-w-44" title={order.venue_address}>
                        {order.venue_address}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="font-bold text-slate-800">
                        {order.event_date ? new Date(order.event_date).toLocaleDateString("en-IN") : "--"}
                      </p>
                      <p className="text-[11px] text-slate-500">{order.event_time}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-800">{order.guest_count} Pax</p>
                      <p className="text-[11px] text-slate-500">
                        {order.total_items || 0} dishes ({order.total_quantity || 0} portions)
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      {order.status === "Quotation Sent" || order.quoted_amount ? (
                        <div>
                          <p className="font-black text-[#1a3c36] text-sm">
                            ₹{Number(order.quoted_amount || order.total_estimated_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </p>
                          {Number(order.discount_amount || 0) > 0 && (
                            <span className="inline-block rounded-md bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              -₹{Number(order.discount_amount).toLocaleString("en-IN")} off
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="font-black text-[#1a3c36] text-sm">
                          ₹{Number(order.total_estimated_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                          STATUS_BADGES[order.status] || "bg-slate-100 text-slate-700 border-slate-300"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(order.id)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                            order.status === "Pending"
                              ? "border-[#b07838] bg-[#fbf5ee] text-[#a85b00] hover:bg-[#f3e7d6]"
                              : "border-slate-200 bg-white text-[#1a3c36] hover:bg-slate-100"
                          }`}
                          title={order.status === "Pending" ? "Review & Send Quotation" : "View Order Details"}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {order.status === "Pending" ? "Review & Quote" : "View"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(order.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                          title="Delete Order"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
  );
}
