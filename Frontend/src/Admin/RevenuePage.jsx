import { useEffect, useState } from "react";
import {
  Activity, ArrowDownToLine, CalendarDays, ChevronLeft, ChevronRight,
  CircleDollarSign, Clock3, CreditCard, PackageCheck, Search, ShoppingBag,
  TrendingUp, X,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie,
  PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import api, { BACKEND_BASE_URL } from "../api";

const PERIODS = [
  ["today", "Today"], ["yesterday", "Yesterday"], ["week", "This Week"],
  ["lastWeek", "Last Week"], ["month", "This Month"], ["lastMonth", "Last Month"],
  ["year", "This Year"], ["lastYear", "Last Year"], ["custom", "Custom Range"], ["all", "All Time"],
];
const CHART_PERIODS = [["today", "Today"], ["week", "This Week"], ["month", "This Month"], ["year", "This Year"]];
const STATUS_ORDER = ["Pending", "Confirmed", "Preparing", "Ready", "Out for Delivery", "Delivered", "Cancelled"];
const STATUS_COLORS = ["#9aa79d", "#668c6e", "#d39833", "#5781a5", "#805db1", "#278453", "#c36464"];
const SOURCE_COLORS = ["#237a4b", "#d5a43a", "#5587a4", "#8e70ad"];
const currency = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2,
}).format(Number(value || 0));
const dateTime = (value) => value
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "Not recorded";
const dateOnly = (value) => value
  ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value))
  : "Not recorded";
const getErrorMessage = (error) => error.response?.data?.message || "Revenue data could not be loaded. Please try again.";
const paramsFor = ({ range, startDate, endDate, type, paymentMethod }) => ({
  range,
  ...(range === "custom" ? { startDate, endDate } : {}),
  type,
  ...(paymentMethod ? { paymentMethod } : {}),
});
const orderStatusLabel = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (["placed", "pending"].includes(normalized)) return "Pending";
  if (normalized === "confirmed") return "Confirmed";
  if (normalized === "preparing") return "Preparing";
  if (["ready", "ready to serve"].includes(normalized)) return "Ready";
  if (["out for delivery", "out_for_delivery"].includes(normalized)) return "Out for Delivery";
  if (normalized === "delivered") return "Delivered";
  if (["cancelled", "canceled"].includes(normalized)) return "Cancelled";
  return status || "Unknown";
};
const itemImage = (value) => {
  if (!value) return "";
  let image = value;
  if (typeof value === "string" && value.startsWith("[")) {
    try { image = JSON.parse(value)[0]; } catch { image = value; }
  }
  if (!image) return "";
  return /^https?:\/\//i.test(image) ? image : `${BACKEND_BASE_URL}${image.startsWith("/") ? image : `/${image}`}`;
};

const Card = ({ label, value, detail, icon: Icon, loading }) => (
  <article className="min-w-0 border border-[#e0e8e1] bg-white p-4 shadow-[0_2px_10px_rgba(25,65,39,0.035)] sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#718078]">{label}</p>
        {loading
          ? <div className="mt-3 h-7 w-32 animate-pulse bg-[#edf2ed]" />
          : <p className="mt-2 truncate text-2xl font-bold text-[#173d29]">{value}</p>}
        {detail && <p className="mt-2 text-xs text-[#819087]">{detail}</p>}
      </div>
      <span className="grid h-10 w-10 shrink-0 place-items-center bg-[#edf5ee] text-[#267447]"><Icon size={19} /></span>
    </div>
  </article>
);

const SectionHeading = ({ title, caption, action }) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div><h2 className="text-base font-bold text-[#1c3828]">{title}</h2>{caption && <p className="mt-1 text-xs text-[#748178]">{caption}</p>}</div>
    {action}
  </div>
);

const RevenuePage = () => {
  const [filters, setFilters] = useState({ range: "month", startDate: "", endDate: "", type: "all", paymentMethod: "" });
  const [trendRange, setTrendRange] = useState("month");
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [pageData, setPageData] = useState({ rows: [], total: 0, page: 1, pageSize: 10 });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState("");
  const [ordersError, setOrdersError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const filterKey = JSON.stringify(filters);
  const customRangeIncomplete = filters.range === "custom" && (!filters.startDate || !filters.endDate);
  useEffect(() => {
    if (customRangeIncomplete) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    const currentFilters = paramsFor(filters);
    setLoading(true);
    setError("");
    Promise.all([
      api.get("/revenue/summary", { params: currentFilters, signal: controller.signal }),
      api.get("/revenue/trend", { params: { ...currentFilters, trend: trendRange }, signal: controller.signal }),
      api.get("/revenue/status", { params: currentFilters, signal: controller.signal }),
    ]).then(([summaryResponse, trendResponse, statusResponse]) => {
      setSummary(summaryResponse.data.data);
      setTrend(trendResponse.data.data);
      setStatuses(statusResponse.data.data);
    }).catch((requestError) => {
      if (requestError.name !== "CanceledError" && requestError.code !== "ERR_CANCELED") setError(getErrorMessage(requestError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [filterKey, trendRange, customRangeIncomplete, reloadKey]);

  useEffect(() => {
    if (customRangeIncomplete) {
      setOrdersLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setOrdersLoading(true);
    setOrdersError("");
    api.get("/revenue/orders", {
      params: { ...paramsFor(filters), page, pageSize: 10, search },
      signal: controller.signal,
    }).then((response) => setPageData(response.data.data))
      .catch((requestError) => {
        if (requestError.name !== "CanceledError" && requestError.code !== "ERR_CANCELED") setOrdersError(getErrorMessage(requestError));
      }).finally(() => {
        if (!controller.signal.aborted) setOrdersLoading(false);
      });
    return () => controller.abort();
  }, [filterKey, page, search, customRangeIncomplete, reloadKey]);

  useEffect(() => {
    if (!selectedOrder) return undefined;
    const controller = new AbortController();
    setDetailsLoading(true);
    setDetailsError("");
    setOrderDetails(null);
    const [source, id] = String(selectedOrder.record_id).split(":");
    api.get(`/revenue/order/${encodeURIComponent(source)}/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((response) => setOrderDetails(response.data.data))
      .catch((requestError) => {
        if (requestError.name !== "CanceledError" && requestError.code !== "ERR_CANCELED") setDetailsError(getErrorMessage(requestError));
      }).finally(() => {
        if (!controller.signal.aborted) setDetailsLoading(false);
      });
    return () => controller.abort();
  }, [selectedOrder]);

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await api.get("/revenue/export", { params: paramsFor(filters), responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "delivered-revenue.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(getErrorMessage(exportError));
    } finally {
      setExporting(false);
    }
  };

  const chartStatuses = STATUS_ORDER.map((status) => ({
    status,
    count: Number(statuses.find((entry) => entry.status === status)?.count || 0),
  }));
  const filteredRangeText = PERIODS.find(([value]) => value === filters.range)?.[1] || "Selected range";
  const totalPages = Math.max(1, Math.ceil(pageData.total / pageData.pageSize));

  return (
    <div className="space-y-5 pb-8 text-[#25382d] sm:space-y-6">
      <header className="flex flex-col gap-4 border-b border-[#dce5dd] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#3e8054]">Admin / Finance</p>
          <h1 className="mt-1 text-2xl font-bold text-[#183b28]">Revenue</h1>
          <p className="mt-1 text-sm text-[#718078]">Completed revenue and delivered order records</p>
        </div>
        <button type="button" onClick={exportCsv} disabled={exporting || customRangeIncomplete} className="inline-flex h-10 items-center justify-center gap-2 self-start border border-[#b9d2bf] bg-white px-4 text-sm font-semibold text-[#236640] transition hover:bg-[#f2f8f3] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto">
          <ArrowDownToLine size={16} />{exporting ? "Preparing…" : "Export CSV"}
        </button>
      </header>

      <section aria-label="Revenue filters" className="grid gap-3 border-b border-[#dce5dd] pb-5 md:grid-cols-2 xl:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(160px,0.8fr)_minmax(160px,0.8fr)_auto] xl:items-end">
        <label className="text-xs font-semibold text-[#66756b]">Date range
          <span className="relative mt-1 block"><CalendarDays size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#578065]" />
            <select value={filters.range} onChange={(event) => updateFilter("range", event.target.value)} className="h-10 w-full appearance-none border border-[#d5dfd7] bg-white pl-9 pr-3 text-sm text-[#293d30] outline-none focus:border-[#42815a]">
              {PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </span>
        </label>
        <label className="text-xs font-semibold text-[#66756b]">Order source
          <select value={filters.type} onChange={(event) => updateFilter("type", event.target.value)} className="mt-1 h-10 w-full border border-[#d5dfd7] bg-white px-3 text-sm text-[#293d30] outline-none focus:border-[#42815a]">
            <option value="all">All order types</option><option value="dining">Dining orders</option><option value="delivery">Delivery orders</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-[#66756b]">Payment method
          <select value={filters.paymentMethod} onChange={(event) => updateFilter("paymentMethod", event.target.value)} className="mt-1 h-10 w-full border border-[#d5dfd7] bg-white px-3 text-sm text-[#293d30] outline-none focus:border-[#42815a]">
            <option value="">All methods</option><option value="cod">Cash on delivery</option><option value="online">Online</option><option value="cash">Cash</option><option value="card">Card</option>
          </select>
        </label>
        {filters.range === "custom" ? <div className="grid grid-cols-2 gap-2 xl:col-span-2">
          <label className="text-xs font-semibold text-[#66756b]">From<input type="date" value={filters.startDate} onChange={(event) => updateFilter("startDate", event.target.value)} className="mt-1 h-10 w-full border border-[#d5dfd7] bg-white px-2 text-sm" /></label>
          <label className="text-xs font-semibold text-[#66756b]">To<input type="date" value={filters.endDate} onChange={(event) => updateFilter("endDate", event.target.value)} className="mt-1 h-10 w-full border border-[#d5dfd7] bg-white px-2 text-sm" /></label>
        </div> : <p className="pb-2 text-xs text-[#839087] xl:justify-self-end">Showing {filteredRangeText.toLowerCase()}</p>}
      </section>

      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-[#e8c8c0] bg-[#fff7f4] px-4 py-3 text-sm text-[#8c4437]"><span>{error}</span><button type="button" onClick={() => setReloadKey((previous) => previous + 1)} className="font-semibold underline">Retry</button></div>}
      {customRangeIncomplete && <p role="status" className="text-sm text-[#8a672a]">Choose both dates to load a custom range.</p>}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card label="Total Revenue" value={currency(summary?.totalRevenue)} detail={filteredRangeText} icon={CircleDollarSign} loading={loading} />
        <Card label="Today Revenue" value={currency(summary?.todayRevenue)} detail="Delivered orders today" icon={CalendarDays} loading={loading} />
        <Card label="Delivered Orders" value={Number(summary?.deliveredOrders || 0).toLocaleString("en-IN")} detail="Exact Delivered status" icon={PackageCheck} loading={loading} />
        <Card label="Average Order Value" value={currency(summary?.averageOrderValue)} detail="Delivered revenue / orders" icon={ShoppingBag} loading={loading} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,1fr)]">
        <article className="min-w-0 border border-[#e0e8e1] bg-white p-4 sm:p-5">
          <SectionHeading title="Revenue Trend" caption="Final payable from delivered orders" action={
            <div className="flex flex-wrap gap-1 border border-[#e0e8e1] p-1" role="group" aria-label="Revenue trend period">
              {CHART_PERIODS.map(([value, label]) => <button key={value} type="button" aria-pressed={trendRange === value} onClick={() => { setTrendRange(value); updateFilter("range", value); }} className={`px-2.5 py-1.5 text-xs font-semibold transition ${trendRange === value ? "bg-[#236640] text-white" : "text-[#52645a] hover:bg-[#f0f5f1]"}`}>{label}</button>)}
            </div>
          } />
          <div className="mt-5 h-64 w-full">
            {loading ? <div className="h-full animate-pulse bg-[#f3f6f3]" /> : trend.length ? <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
                <defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#328252" stopOpacity={0.22} /><stop offset="95%" stopColor="#328252" stopOpacity={0.01} /></linearGradient></defs>
                <CartesianGrid stroke="#e9eee9" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#77847b" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#77847b" }} tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} width={72} />
                <Tooltip formatter={(value) => currency(value)} labelFormatter={(label) => dateOnly(label)} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#287648" strokeWidth={2.5} fill="url(#revenueFill)" activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer> : <div className="grid h-full place-items-center text-center text-sm text-[#829087]">No delivered revenue for this range.</div>}
          </div>
        </article>

        <article className="min-w-0 border border-[#e0e8e1] bg-white p-4 sm:p-5">
          <SectionHeading title="Order Status" caption="Current orders in the selected period" />
          <div className="mt-5 h-64 w-full">
            {loading ? <div className="h-full animate-pulse bg-[#f3f6f3]" /> : statuses.length ? <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartStatuses} layout="vertical" margin={{ top: 2, right: 16, bottom: 2, left: 0 }}>
                <CartesianGrid stroke="#edf1ed" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#77847b" }} />
                <YAxis type="category" dataKey="status" width={112} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#5d6d63" }} />
                <Tooltip />
                <Bar dataKey="count" name="Orders" radius={[0, 3, 3, 0]} barSize={16}>
                  {chartStatuses.map((entry) => <Cell key={entry.status} fill={STATUS_COLORS[STATUS_ORDER.indexOf(entry.status)] || "#718078"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-[#829087]">No orders in this range.</div>}
          </div>
          {statuses.some((entry) => !STATUS_ORDER.includes(entry.status)) && <p className="mt-2 border-t border-[#edf1ed] pt-2 text-[11px] text-[#829087]">Other stored statuses: {statuses.filter((entry) => !STATUS_ORDER.includes(entry.status)).map((entry) => `${entry.status} (${entry.count})`).join(", ")}</p>}
        </article>
      </section>

      <section className="border border-[#e0e8e1] bg-white p-4 sm:p-5">
        <SectionHeading title="Revenue by Source" caption="Delivered revenue only" />
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.8fr)] md:items-center">
          <div className="h-60 min-w-0">
            {loading ? <div className="h-full animate-pulse bg-[#f3f6f3]" /> : summary?.sources?.length ? <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={summary.sources} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={90} paddingAngle={3}>
                {summary.sources.map((source, index) => <Cell key={source.name} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />)}
              </Pie><Tooltip formatter={(value) => currency(value)} /><Legend verticalAlign="bottom" height={28} /></PieChart>
            </ResponsiveContainer> : <div className="grid h-full place-items-center text-center text-sm text-[#829087]">No delivered source revenue for this range.</div>}
          </div>
          <div className="divide-y divide-[#edf1ed]">
            {(summary?.sources || []).map((source, index) => <div key={source.name} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <span className="flex min-w-0 items-center gap-2 text-sm text-[#53635a]"><span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length] }} />{source.name}</span>
              <span className="shrink-0 text-right"><strong className="block text-sm text-[#203d2b]">{currency(source.revenue)}</strong><span className="text-xs text-[#829087]">{source.orders} orders</span></span>
            </div>)}
          </div>
        </div>
      </section>

      <section className="border border-[#e0e8e1] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#e6ece7] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div><h2 className="text-base font-bold text-[#1c3828]">Delivered Orders</h2><p className="mt-1 text-xs text-[#748178]">Delivery orders require Delivered; dining bills require Paid and all kitchen tickets Served</p></div>
          <label className="relative block w-full sm:max-w-xs"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87948b]" /><input type="search" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="Search order, customer, phone" className="h-10 w-full border border-[#d5dfd7] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#42815a]" /></label>
        </div>
        {ordersError ? <div role="alert" className="p-6 text-sm text-[#8c4437]">{ordersError}</div> : ordersLoading ? <div className="space-y-3 p-5"><div className="h-8 animate-pulse bg-[#f0f4f0]" /><div className="h-12 animate-pulse bg-[#f6f8f6]" /><div className="h-12 animate-pulse bg-[#f6f8f6]" /></div> : pageData.rows.length === 0 ? <div className="px-5 py-14 text-center"><span className="mx-auto grid h-12 w-12 place-items-center bg-[#edf5ee] text-[#4b805b]"><PackageCheck size={22} /></span><h3 className="mt-4 text-sm font-bold text-[#304638]">No delivered orders found</h3><p className="mx-auto mt-1 max-w-md text-sm text-[#829087]">Orders will appear here after their status is set to Delivered. Pending, cancelled, paid-but-unserved, and incomplete records are excluded.</p></div> : <>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[1840px] border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#f1f6f1] text-[10px] uppercase tracking-[0.07em] text-[#56685c] shadow-[0_1px_0_#dfe8e0]">
                <tr>{["Order ID", "Order Date", "Customer", "Phone", "Type", "Items", "Qty", "Subtotal", "Discount", "Delivery", "Tax", "Total", "Payment", "Payment Status", "Delivery Partner", "Delivered At", "Status", ""].map((label) => <th key={label} className="whitespace-nowrap px-3 py-3 font-bold">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ed]">
                {pageData.rows.map((order) => <tr key={order.record_id} className="hover:bg-[#fafcf9]">
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-[#275b3a]">{order.order_id}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-[#637168]">{dateTime(order.order_date)}</td>
                  <td className="max-w-40 truncate px-3 py-3">{order.customer_name || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3">{order.customer_phone || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3">{order.order_type}</td>
                  <td className="max-w-56 truncate px-3 py-3" title={order.items}>{order.items || "—"}</td>
                  <td className="px-3 py-3">{Number(order.quantity || 0)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{currency(order.subtotal)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{order.discount === null ? "—" : currency(order.discount)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{order.delivery_charge === null ? "—" : currency(order.delivery_charge)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{order.tax === null ? "—" : currency(order.tax)}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-bold text-[#203d2b]">{currency(order.total_amount)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{order.payment_method || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3">{order.payment_status || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3">{order.delivery_partner || "Not recorded"}</td>
                  <td className="whitespace-nowrap px-3 py-3">{dateTime(order.delivered_at)}</td>
                  <td className="whitespace-nowrap px-3 py-3"><span className="inline-flex items-center gap-1.5 text-[#287648]"><span className="h-1.5 w-1.5 rounded-full bg-[#287648]" />{orderStatusLabel(order.status)}</span></td>
                  <td className="whitespace-nowrap px-3 py-3"><button type="button" onClick={() => setSelectedOrder(order)} className="border border-[#b9d2bf] px-2.5 py-1.5 font-semibold text-[#236640] hover:bg-[#f2f8f3]">View Details</button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6ece7] px-4 py-3 text-xs text-[#718078] sm:px-5">
            <span>Showing {(page - 1) * pageData.pageSize + 1}–{Math.min(page * pageData.pageSize, pageData.total)} of {pageData.total}</span>
            <div className="flex items-center gap-2"><button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="grid h-8 w-8 place-items-center border border-[#dce5dd] text-[#4a6553] disabled:opacity-40"><ChevronLeft size={16} /></button><span>Page {page} of {totalPages}</span><button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="grid h-8 w-8 place-items-center border border-[#dce5dd] text-[#4a6553] disabled:opacity-40"><ChevronRight size={16} /></button></div>
          </div>
        </>}
      </section>

      {selectedOrder && <div className="fixed inset-0 z-[80] grid place-items-center bg-[#102318]/55 p-0 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedOrder(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="revenue-order-title" className="flex max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[94vh] sm:max-w-5xl">
          <header className="flex items-start justify-between gap-4 border-b border-[#e4ebe5] px-5 py-4 sm:px-7">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#47805a]">Delivered order details</p><h2 id="revenue-order-title" className="mt-1 text-lg font-bold text-[#193d29]">{selectedOrder.order_id}</h2></div>
            <button type="button" onClick={() => setSelectedOrder(null)} aria-label="Close order details" className="grid h-9 w-9 shrink-0 place-items-center text-[#64736a] hover:bg-[#f1f5f1]"><X size={18} /></button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
            {detailsLoading ? <div className="space-y-4"><div className="h-24 animate-pulse bg-[#f1f5f1]" /><div className="h-48 animate-pulse bg-[#f1f5f1]" /></div>
              : detailsError ? <div role="alert" className="border border-[#e8c8c0] bg-[#fff7f4] p-4 text-sm text-[#8c4437]">{detailsError}</div>
                : orderDetails && <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div><h3 className="mb-3 border-b border-[#e8eee9] pb-2 text-sm font-bold text-[#264632]">Customer Details</h3><dl className="space-y-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-[#819087]">Name</dt><dd className="text-right font-medium">{orderDetails.customer_name || "Not recorded"}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#819087]">Phone</dt><dd className="text-right font-medium">{orderDetails.customer_phone || "Not recorded"}</dd></div><div><dt className="text-[#819087]">Address</dt><dd className="mt-1 font-medium">{orderDetails.delivery_address || "Not recorded"}</dd></div></dl></div>
                    <div><h3 className="mb-3 border-b border-[#e8eee9] pb-2 text-sm font-bold text-[#264632]">Order Details</h3><dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm"><dt className="text-[#819087]">Order ID</dt><dd className="text-right font-medium">{orderDetails.order_id}</dd><dt className="text-[#819087]">Order date</dt><dd className="text-right font-medium">{dateTime(orderDetails.order_date)}</dd><dt className="text-[#819087]">Order type</dt><dd className="text-right font-medium">{orderDetails.order_type}</dd><dt className="text-[#819087]">Current status</dt><dd className="text-right font-medium">{orderStatusLabel(orderDetails.status)}</dd><dt className="text-[#819087]">Payment method</dt><dd className="text-right font-medium">{orderDetails.payment_method || "Not recorded"}</dd><dt className="text-[#819087]">Payment status</dt><dd className="text-right font-medium">{orderDetails.payment_status || "Not recorded"}</dd></dl></div>
                  </div>
                  <div><h3 className="mb-3 border-b border-[#e8eee9] pb-2 text-sm font-bold text-[#264632]">Food Items</h3>{orderDetails.items?.length ? <div className="divide-y divide-[#edf1ed]">{orderDetails.items.map((item, index) => <div key={`${item.food_id}-${index}`} className="flex items-center gap-3 py-3 first:pt-0"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden bg-[#f1f5f1] text-[#8a998e]"><img src={itemImage(item.product_image)} alt="" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />{!item.product_image && <ShoppingBag size={18} />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#304638]">{item.food_name}</p><p className="mt-1 text-xs text-[#819087]">Qty {item.quantity} · {currency(item.price)} each · Discount {item.discount === null ? "Not recorded" : currency(item.discount)}</p></div><strong className="shrink-0 text-sm text-[#263f2f]">{currency(item.item_total)}</strong></div>)}</div> : <p className="py-3 text-sm text-[#819087]">No item details recorded.</p>}</div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div><h3 className="mb-3 border-b border-[#e8eee9] pb-2 text-sm font-bold text-[#264632]">Price Summary</h3><dl className="space-y-2 text-sm"><div className="flex justify-between"><dt className="text-[#819087]">Subtotal</dt><dd>{currency(orderDetails.subtotal)}</dd></div><div className="flex justify-between"><dt className="text-[#819087]">Discount</dt><dd>{orderDetails.discount === null ? "Not recorded" : currency(orderDetails.discount)}</dd></div><div className="flex justify-between"><dt className="text-[#819087]">Tax</dt><dd>{orderDetails.tax === null ? "Not recorded" : currency(orderDetails.tax)}</dd></div><div className="flex justify-between"><dt className="text-[#819087]">Delivery charge</dt><dd>{orderDetails.delivery_charge === null ? "Not recorded" : currency(orderDetails.delivery_charge)}</dd></div><div className="flex justify-between border-t border-[#e8eee9] pt-2 font-bold text-[#1d452e]"><dt>Final total</dt><dd>{currency(orderDetails.total_amount)}</dd></div></dl></div>
                    <div><h3 className="mb-3 border-b border-[#e8eee9] pb-2 text-sm font-bold text-[#264632]">{orderDetails.source === "dining" ? "Dining Details" : "Delivery Details"}</h3><dl className="space-y-2 text-sm">{orderDetails.source !== "dining" && <div className="flex justify-between gap-3"><dt className="text-[#819087]">Delivery partner</dt><dd className="text-right">{orderDetails.delivery_partner || "Not recorded"}</dd></div>}<div><dt className="text-[#819087]">{orderDetails.source === "dining" ? "Table" : "Delivery address"}</dt><dd className="mt-1">{orderDetails.delivery_address || "Not recorded"}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#819087]">{orderDetails.source === "dining" ? "Service status" : "Delivery status"}</dt><dd className="text-right">{orderStatusLabel(orderDetails.status)}</dd></div><div className="flex justify-between gap-3"><dt className="text-[#819087]">{orderDetails.source === "dining" ? "Served date/time" : "Delivered date/time"}</dt><dd className="text-right">{dateTime(orderDetails.delivered_at)}</dd></div></dl></div>
                  </div>
                </div>}
          </div>
        </section>
      </div>}
    </div>
  );
};

export default RevenuePage;
