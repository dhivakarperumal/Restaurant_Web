import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Bike, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, MapPin, Phone, RefreshCw, Search, ShoppingBag, X, XCircle } from "lucide-react";
import api from "../api";
import toast from "react-hot-toast";

const normalizeStatus = (status) =>
  String(status || "").trim().toUpperCase().replace(/[\s-]+/g, "_");

const orderViews = {
  new: { title: "New Orders", statuses: ["NEW", "NEW_ORDER", "PENDING", "ORDER_PLACED"] },
  all: { title: "All Orders", statuses: null },
  delivery: { title: "Delivery Orders", statuses: ["ASSIGNED", "ACCEPTED", "REACHED_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY", "REACHED_CUSTOMER", "SHIPPED"] },
  cancelled: { title: "Cancelled Orders", statuses: ["CANCELLED"] },
};

const statusFlow = ["ASSIGNED", "ACCEPTED", "REACHED_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY", "REACHED_CUSTOMER", "DELIVERED"];
const statusLabels = {
  ASSIGNED: "Assigned", ACCEPTED: "Accepted", REACHED_PICKUP: "Reached pickup",
  PICKED_UP: "Picked up", OUT_FOR_DELIVERY: "Out for delivery",
  REACHED_CUSTOMER: "Reached customer", DELIVERED: "Delivered", COMPLETED: "Delivered",
  CANCELLED: "Cancelled", NEW: "New", NEW_ORDER: "New", ORDER_PLACED: "Order placed", PENDING: "New",
};
const nextStatus = {
  ASSIGNED: "ACCEPTED", ACCEPTED: "REACHED_PICKUP", REACHED_PICKUP: "PICKED_UP",
  PICKED_UP: "OUT_FOR_DELIVERY", OUT_FOR_DELIVERY: "REACHED_CUSTOMER", REACHED_CUSTOMER: "DELIVERED",
};

const formatDate = (value, options = { dateStyle: "medium", timeStyle: "short" }) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", options);
};

const statusClass = (status) => {
  const normalizedStatus = normalizeStatus(status);
  if (["DELIVERED", "COMPLETED"].includes(normalizedStatus)) return "bg-emerald-50 text-emerald-700";
  if (normalizedStatus === "CANCELLED") return "bg-rose-50 text-rose-700";
  if (["PICKED_UP", "OUT_FOR_DELIVERY", "REACHED_CUSTOMER"].includes(normalizedStatus)) return "bg-sky-50 text-sky-700";
  if (["ASSIGNED", "ACCEPTED", "REACHED_PICKUP", "NEW", "NEW_ORDER", "PENDING", "ORDER_PLACED"].includes(normalizedStatus)) return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
};

const getItems = (order) => {
  const value = order.items || order.food_items || order.order_items || [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
};

const orderId = (order) => order.order_id || order.id || "Order";

const DeliveryOrdersPage = ({ view = "all" }) => {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pendingStatus, setPendingStatus] = useState("");
  const [updating, setUpdating] = useState(false);
  const pageSize = 8;
  const config = orderViews[view] || orderViews.all;

  useEffect(() => {
    let active = true;

    const loadOrders = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/delivery-partner/orders");
        if (!active) return;
        const result = response.data?.orders || response.data?.data;
        setOrders(Array.isArray(result) ? result : []);
      } catch (requestError) {
        if (!active) return;
        setError(requestError?.response?.data?.message || "Assigned orders are temporarily unavailable.");
        setOrders([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadOrders();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const matchingOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const normalizedStatus = normalizeStatus(order.order_status);
      const matchesView = !config.statuses || config.statuses.includes(normalizedStatus);
      const date = new Date(order.order_date || order.created_at || "");
      const dateKey = Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const matchesDate = (!dateFrom || dateKey >= dateFrom) && (!dateTo || dateKey <= dateTo);
      const matchesSearch = !query || [orderId(order), order.customer_name, order.customer?.name]
        .some((value) => String(value || "").toLowerCase().includes(query));
      return matchesView && matchesDate && matchesSearch;
    });
  }, [config.statuses, dateFrom, dateTo, orders, search]);

  const pageCount = Math.max(1, Math.ceil(matchingOrders.length / pageSize));
  const visibleOrders = matchingOrders.slice((page - 1) * pageSize, page * pageSize);
  const countStatuses = (statuses) => orders.filter((order) => statuses.includes(normalizeStatus(order.order_status))).length;
  const summaryCards = [
    { label: "New Orders", value: countStatuses(["NEW", "NEW_ORDER", "PENDING", "ORDER_PLACED"]), icon: Clock3, style: "bg-gradient-to-br from-[#ed40ac] via-[#d832a0] to-[#c72188] text-white", caption: "Awaiting action" },
    { label: "Active Deliveries", value: countStatuses(["ASSIGNED", "ACCEPTED", "REACHED_PICKUP", "PICKED_UP", "OUT_FOR_DELIVERY", "REACHED_CUSTOMER", "SHIPPED"]), icon: Bike, style: "bg-gradient-to-br from-[#4a6ce9] via-[#665ce5] to-[#8250df] text-white", caption: "Assigned to you" },
    { label: "Delivered", value: countStatuses(["DELIVERED", "COMPLETED"]), icon: CheckCircle2, style: "bg-gradient-to-br from-[#10ae89] via-[#1fc995] to-[#21d68f] text-white", caption: "Completed" },
    { label: "Cancelled", value: countStatuses(["CANCELLED"]), icon: XCircle, style: "bg-gradient-to-br from-[#ff9a12] via-[#ffad0b] to-[#ffc20c] text-[#3c2d00]", caption: "Closed" },
  ];

  const updateOrderStatus = async () => {
    if (!selectedOrder || !pendingStatus) return;
    setUpdating(true);
    try {
      const response = await api.patch(`/delivery-partner/orders/${encodeURIComponent(orderId(selectedOrder))}/status`, { status: pendingStatus });
      const updated = response.data?.order || response.data?.data;
      setOrders((current) => current.map((order) => orderId(order) === orderId(selectedOrder) ? { ...order, ...(updated || {}), order_status: updated?.order_status || pendingStatus } : order));
      setSelectedOrder((current) => current ? { ...current, ...(updated || {}), order_status: updated?.order_status || pendingStatus } : current);
      toast.success(`Order marked ${statusLabels[pendingStatus]?.toLowerCase() || pendingStatus.toLowerCase()}`);
      setPendingStatus("");
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "Could not update this delivery.");
    } finally {
      setUpdating(false);
    }
  };

  const getLocationUrl = (address, latitude, longitude) => latitude && longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || "")}`;

  const renderOrderCard = (order) => (
    <button key={orderId(order)} type="button" onClick={() => setSelectedOrder(order)} className="w-full rounded-xl border border-[#e3eae4] bg-white p-4 text-left shadow-sm transition hover:border-[#a8c5ae]">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-gray-500">{orderId(order)}</p><p className="mt-1 text-sm font-semibold text-gray-900">{order.customer_name || order.customer?.name || "Customer"}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(order.order_status)}`}>{statusLabels[normalizeStatus(order.order_status)] || order.order_status || "New"}</span></div>
      <div className="mt-4 space-y-2 border-l border-[#d9e5db] pl-3 text-xs text-gray-600"><p><span className="font-semibold text-gray-800">Pickup</span> · {order.restaurant_name || order.chef_name || order.pickup_address || "Pickup location pending"}</p><p><span className="font-semibold text-gray-800">Drop-off</span> · {order.delivery_address || order.dropoff_address || "Delivery location pending"}</p></div>
      <div className="mt-4 flex items-center justify-between text-xs"><span className="text-gray-500">{formatDate(order.order_date || order.created_at)}</span><span className="font-semibold text-[#21643a]">₹{Number(order.delivery_charge || 0).toLocaleString("en-IN")} delivery</span></div>
    </button>
  );

  return (
    <section className="min-h-[60vh] text-gray-900">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#39754a]">Deliveries</p>
          <h1 className="mt-1 text-2xl font-bold">{config.title}</h1>
          <p className="mt-1 text-sm text-gray-500">Only orders assigned to your account appear here.</p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((current) => current + 1)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon, style, caption }) => (
          <div key={label} className={`relative isolate flex min-h-[155px] flex-col overflow-hidden rounded-[22px] p-4 shadow-[0_10px_22px_rgba(20,45,30,0.15)] sm:p-5 ${style}`}>
            <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
            <div className="relative flex items-start justify-between gap-3"><span className="pt-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-current/90">{label}</span><span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] border border-white/35 bg-white/15 text-current shadow-inner"><Icon size={21} strokeWidth={2.2} /></span></div>
            {loading ? <div className="relative mt-2 h-9 w-16 animate-pulse rounded-lg bg-white/25" /> : <p className="relative mt-2 text-[30px] font-extrabold leading-none tabular-nums">{error ? "—" : value}</p>}
            <div aria-hidden="true" className="relative mt-auto flex h-7 items-end gap-1 pt-2 opacity-25">{[13, 19, 15, 25, 17, 22, 29].map((height, index) => <span key={index} style={{ height }} className="flex-1 rounded-t-[4px] bg-white" />)}</div>
            <span className="relative mt-2 inline-flex w-fit items-center rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10px] font-bold text-current">{caption}</span>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="relative block w-full max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search order or customer"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-600"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500"><CalendarDays size={14} /><span>From</span><input aria-label="Date from" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} className="max-w-32 bg-transparent text-gray-700 outline-none" /></label>
          <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500"><span>To</span><input aria-label="Date to" type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} className="max-w-32 bg-transparent text-gray-700 outline-none" /></label>
          <span className="px-1 text-sm text-gray-500">{matchingOrders.length} orders</span>
        </div>
      </div>

      {loading && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-xl border border-gray-200 bg-white" />)}</div>}
      {error && !loading && <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><p className="font-semibold">Assigned orders are unavailable</p><p className="mt-1">{error}</p><p className="mt-2 text-xs text-amber-800">This screen requires a partner-scoped delivery API. General store orders are intentionally not shown.</p></div>}
      {!loading && !error && matchingOrders.length === 0 && <div className="rounded-xl border border-dashed border-[#cddbd0] bg-white px-5 py-14 text-center"><ShoppingBag size={25} className="mx-auto mb-3 text-[#7a9b82]" /><p className="font-semibold text-gray-800">No orders in this view</p><p className="mt-1 text-sm text-gray-500">New assignments will appear here when you are online.</p></div>}
      {!loading && !error && matchingOrders.length > 0 && <>
      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">{visibleOrders.map(renderOrderCard)}</div>
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Pickup / Drop-off</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleOrders.map((order) => <tr key={orderId(order)} className="hover:bg-gray-50/70">
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-800">{orderId(order)}</td>
                <td className="px-4 py-3 text-gray-700">{order.customer_name || order.customer?.name || "Customer"}</td>
                <td className="max-w-64 px-4 py-3 text-xs text-gray-500"><p className="truncate">{order.restaurant_name || order.chef_name || order.pickup_address || "Pickup pending"}</p><p className="mt-1 truncate">{order.delivery_address || order.dropoff_address || "Drop-off pending"}</p></td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500">{formatDate(order.order_date || order.created_at)}</td>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">₹{Number(order.total_amount || 0).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(order.order_status)}`}>{statusLabels[normalizeStatus(order.order_status)] || order.order_status || "New"}</span></td>
                <td className="px-4 py-3"><button type="button" onClick={() => setSelectedOrder(order)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#21643a] hover:bg-[#edf5ef]">View order</button></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm text-gray-500"><span>Page {page} of {pageCount}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} aria-label="Previous page" className="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 bg-white disabled:opacity-40"><ChevronLeft size={17} /></button><button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)} aria-label="Next page" className="grid h-9 w-9 place-items-center rounded-lg border border-gray-200 bg-white disabled:opacity-40"><ChevronRight size={17} /></button></div></div>
      </>}

      {selectedOrder && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 sm:items-center sm:p-4" role="presentation" onClick={(event) => event.target === event.currentTarget && setSelectedOrder(null)}>
        <section role="dialog" aria-modal="true" aria-labelledby="delivery-order-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-[#39754a]">Delivery details</p><h2 id="delivery-order-title" className="mt-1 text-xl font-bold">{orderId(selectedOrder)}</h2></div><button type="button" onClick={() => setSelectedOrder(null)} aria-label="Close order details" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-gray-100"><X size={18} /></button></div>
          <div className="mt-4 flex items-center justify-between gap-3"><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass(selectedOrder.order_status)}`}>{statusLabels[normalizeStatus(selectedOrder.order_status)] || selectedOrder.order_status || "New"}</span><span className="text-xs text-gray-500">{formatDate(selectedOrder.order_date || selectedOrder.created_at)}</span></div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div><h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Customer</h3><p className="mt-2 font-semibold">{selectedOrder.customer_name || selectedOrder.customer?.name || "Customer"}</p><p className="mt-1 text-sm text-gray-600">{selectedOrder.delivery_address || selectedOrder.dropoff_address || "Address unavailable"}</p>{(selectedOrder.customer_phone || selectedOrder.phone || selectedOrder.customer?.phone) && <a className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#21643a]" href={`tel:${selectedOrder.customer_phone || selectedOrder.phone || selectedOrder.customer?.phone}`}><Phone size={15} />Call customer</a>}<a className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#21643a]" target="_blank" rel="noreferrer" href={getLocationUrl(selectedOrder.delivery_address || selectedOrder.dropoff_address, selectedOrder.delivery_latitude, selectedOrder.delivery_longitude)}><MapPin size={15} />Open navigation<ArrowUpRight size={14} /></a></div>
            <div><h3 className="text-xs font-bold uppercase tracking-wide text-gray-500">Pickup</h3><p className="mt-2 font-semibold">{selectedOrder.restaurant_name || selectedOrder.chef_name || "Restaurant"}</p><p className="mt-1 text-sm text-gray-600">{selectedOrder.pickup_address || selectedOrder.restaurant_address || "Pickup address unavailable"}</p><a className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#21643a]" target="_blank" rel="noreferrer" href={getLocationUrl(selectedOrder.pickup_address || selectedOrder.restaurant_address, selectedOrder.pickup_latitude, selectedOrder.pickup_longitude)}><MapPin size={15} />Navigate to pickup<ArrowUpRight size={14} /></a></div>
          </div>
          <div className="mt-6 rounded-xl bg-[#f5f8f5] p-4"><h3 className="text-sm font-bold">Food items</h3><div className="mt-3 space-y-2">{getItems(selectedOrder).length ? getItems(selectedOrder).map((item, index) => <div key={item.id || item.food_id || index} className="flex justify-between gap-3 text-sm"><span>{item.food_name || item.name || item.product_name || "Food item"}</span><span className="text-gray-500">× {Number(item.quantity || item.qty || 1)}</span></div>) : <p className="text-sm text-gray-500">Item details unavailable</p>}</div><div className="mt-4 border-t border-gray-200 pt-3 text-sm"><div className="flex justify-between"><span className="text-gray-500">Payment</span><span>{selectedOrder.payment_type || selectedOrder.payment_method || "—"}</span></div><div className="mt-2 flex justify-between font-semibold"><span>Delivery charge</span><span>₹{Number(selectedOrder.delivery_charge || 0).toLocaleString("en-IN")}</span></div></div></div>
          {statusFlow.includes(normalizeStatus(selectedOrder.order_status)) && <div className="mt-6"><h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">Delivery progress</h3><div className="flex items-start">{statusFlow.map((status, index) => { const currentIndex = statusFlow.indexOf(normalizeStatus(selectedOrder.order_status)); const complete = index <= currentIndex; return <div key={status} className="flex min-w-0 flex-1 flex-col items-center text-center"><div className={`grid h-7 w-7 place-items-center rounded-full ${complete ? "bg-[#287545] text-white" : "bg-gray-100 text-gray-400"}`}>{complete ? <Check size={14} /> : <span className="text-[10px]">{index + 1}</span>}</div><span className="mt-2 text-[9px] leading-tight text-gray-500 sm:text-[10px]">{statusLabels[status]}</span></div>; })}</div></div>}
          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" onClick={() => setSelectedOrder(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">Close</button>{nextStatus[normalizeStatus(selectedOrder.order_status)] && <button type="button" onClick={() => setPendingStatus(nextStatus[normalizeStatus(selectedOrder.order_status)])} className="rounded-lg bg-[#1f6a3b] px-4 py-2 text-sm font-semibold text-white hover:bg-[#195a31]">{statusLabels[nextStatus[normalizeStatus(selectedOrder.order_status)]]}</button>}</div>
        </section>
      </div>}
      {pendingStatus && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4"><section role="alertdialog" aria-modal="true" aria-labelledby="confirm-delivery-title" className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between"><div><h2 id="confirm-delivery-title" className="font-bold text-gray-900">Confirm status update</h2><p className="mt-2 text-sm text-gray-600">Mark {orderId(selectedOrder)} as {statusLabels[pendingStatus]}?</p></div><Clock3 className="text-[#287545]" size={20} /></div><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={updating} onClick={() => setPendingStatus("")} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">Cancel</button><button type="button" disabled={updating} onClick={updateOrderStatus} className="rounded-lg bg-[#1f6a3b] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{updating ? "Updating…" : "Confirm"}</button></div></section></div>}
    </section>
  );
};

export default DeliveryOrdersPage;