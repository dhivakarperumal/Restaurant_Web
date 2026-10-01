import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Edit3,
  Eye,
  List,
  LayoutGrid,
  Package,
  Printer,
  Search,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

const emptyOrder = {
  id: "",
  customer: "-",
  phone: "-",
  items: 0,
  date: "-",
  time: "-",
  amount: 0,
  status: "Pending",
  orderItems: [],
};
const products = [];

const formatCurrency = (value) =>
  `₹ ${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const statusClass = {
  Confirmed: "bg-[#e6f7ed] text-[#18794e]",
  Preparing: "bg-[#e9f1ff] text-[#3069c5]",
  Ready: "bg-[#f0e9ff] text-[#6c3bc0]",
  Completed: "bg-[#e6f7ed] text-[#18794e]",
  Cancelled: "bg-[#ffe9e9] text-[#cf4545]",
};

const Billing = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await api.get("/orders", {
          params: { billing_type: "Shop Billing" },
        });
        const savedOrders = Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        const mappedOrders = savedOrders.map((order) => ({
          id: order.order_id,
          customer:
            order.customer_name || order.address?.customer_name || order.customer_id || "Customer",
          phone: order.customer_phone || order.address?.mobile_number || "",
          items: Number(order.total_items || order.item_count || order.items?.length || 0),
          date: (order.order_date || order.created_at)
            ? new Date(order.order_date || order.created_at).toLocaleDateString("en-GB")
            : "-",
          time: order.created_at
            ? new Date(order.created_at).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-",
          amount: Number(order.total_amount || 0),
          status: order.order_status || "Pending",
          paymentStatus: order.payment_status || "Pending",
          orderDate: (order.order_date || order.created_at)
            ? new Date(order.order_date || order.created_at).toISOString().slice(0, 10)
            : "",
          createdDate: order.created_at
            ? new Date(order.created_at).toISOString().slice(0, 10)
            : "",
          email: order.customer_email || order.address?.email || "",
          address: order.address || {
            customer_name: order.customer_name,
            mobile_number: order.customer_phone,
            address_line1: order.shipping_address,
            city: order.city,
            state: order.state,
            pincode: order.pincode,
          },
          orderItems: order.items || [],
        }));
        setOrders(mappedOrders);
        setSelectedOrder(null);
      } catch (error) {
        console.error("Failed to load billing orders:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(
    () => {
      const today = new Date();
      let rangeStart = "";
      let rangeEnd = "";

      if (datePreset === "today") {
        rangeStart = rangeEnd = toDateKey(today);
      } else if (datePreset === "yesterday") {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        rangeStart = rangeEnd = toDateKey(yesterday);
      } else if (datePreset === "thisWeek") {
        const weekStart = new Date(today);
        const day = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
        rangeStart = toDateKey(weekStart);
        rangeEnd = toDateKey(today);
      } else if (datePreset === "thisMonth") {
        rangeStart = toDateKey(new Date(today.getFullYear(), today.getMonth(), 1));
        rangeEnd = toDateKey(today);
      } else if (datePreset === "lastMonth") {
        rangeStart = toDateKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
        rangeEnd = toDateKey(new Date(today.getFullYear(), today.getMonth(), 0));
      } else if (datePreset === "custom") {
        rangeStart = customStartDate;
        rangeEnd = customEndDate;
      }

      return orders.filter((order) => {
        const query = search.toLowerCase();
        const matchesSearch =
          !query ||
          `${order.id} ${order.customer} ${order.phone}`
            .toLowerCase()
            .includes(query);
        const matchesDate =
          (!rangeStart || order.orderDate >= rangeStart) &&
          (!rangeEnd || order.orderDate <= rangeEnd);
        return matchesSearch && matchesDate;
      });
    },
    [orders, search, datePreset, customStartDate, customEndDate],
  );

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ordersPerPage,
    currentPage * ordersPerPage,
  );

  const selectedOrderItems = selectedOrder?.orderItems || [];

  const subtotal = products.reduce(
    (sum, product) => sum + product.price * product.quantity,
    0,
  );
  const discount = 598;
  const total = Math.max(subtotal - discount, 0);
  const change = Math.max(Number(receivedAmount || 0) - total, 0);

  const totalRevenue = orders.reduce(
    (sum, order) => sum + Number(order.amount || 0),
    0,
  );
  const totalCustomers = new Set(
    orders.map((order) => order.customer).filter(Boolean),
  ).size;
  const totalProducts = orders.reduce(
    (sum, order) => sum + Number(order.items || 0),
    0,
  );
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter(
    (order) => order.createdDate === today || order.orderDate === today,
  );
  const todayAmount = todayOrders.reduce(
    (sum, order) => sum + Number(order.amount || 0),
    0,
  );
  const summaryCards = [
    {
      title: "Today's Order",
      value: todayOrders.length.toLocaleString(),
      change: "18.6%",
      icon: ShoppingBag,
      color: "#22c55e",
      wave: "#9be7b9",
    },
    {
      title: "Today's Total Amount",
      value: formatCurrency(todayAmount),
      change: "22.4%",
      icon: Wallet,
      color: "#f59e0b",
      wave: "#f9d99b",
    },
    {
      title: "Total Orders",
      value: orders.length.toLocaleString(),
      change: "18.6%",
      icon: ShoppingBag,
      color: "#06b6d4",
      wave: "#93dce8",
    },
    {
      title: "Total Amount",
      value: formatCurrency(totalRevenue),
      change: "22.4%",
      icon: Wallet,
      color: "#a855f7",
      wave: "#d8b4f5",
    },
    {
      title: "Total Customers",
      value: totalCustomers.toLocaleString(),
      change: "15.3%",
      icon: Users,
      color: "#06b6d4",
      wave: "#93dce8",
    },
    {
      title: "Total Products",
      value: totalProducts.toLocaleString(),
      change: "10.7%",
      icon: Package,
      color: "#a855f7",
      wave: "#d8b4f5",
    },
    {
      title: "Total Views",
      value: "0",
      change: "12.5%",
      icon: Eye,
      color: "#f97316",
      wave: "#ffc39e",
    },
  ];

  return (
    <div
      className={`billing-page ${viewMode === "card" ? "card-mode" : ""} min-h-screen bg-[#f3f4f6] p-0 text-[#1f2937] md:p-2`}
    >
      <div className="mx-auto max-w-[1500px]">
        <style>{`.billing-page.card-mode table { display: none; } .billing-page.card-mode .card-mode-only { display: grid; }`}</style>

        <div className="mb-3 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {summaryCards
            .filter(
              (card) => !["Total Products", "Total Views"].includes(card.title),
            )
            .map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="relative flex min-h-[145px] flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: card.color }}
                    >
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="min-w-0 pt-1">
                      <p className="text-sm font-medium text-[#374151]">
                        {card.title}
                      </p>
                      <p className="mt-2 truncate text-[1.75rem] font-bold leading-none text-[#111827]">
                        {card.value}
                      </p>
                      <p className="mt-5 text-xs font-medium text-[#00a76f]">
                        ↗ {card.change}
                      </p>
                      <p className="mt-1 text-[11px] text-[#7c8798]">
                        from last month
                      </p>
                    </div>
                  </div>
                  <div
                    className="absolute bottom-0 left-0 h-6 w-full"
                    style={{
                      background: card.wave,
                      clipPath: "ellipse(65% 75% at 55% 100%)",
                    }}
                  />
                </div>
              );
            })}
        </div>
        <div className="hidden mb-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Amount",
              value: "₹ 1,29,850.00",
              note: "All time total billed amount",
              icon: Wallet,
              color: "#ff6b22",
              bg: "#fff0e7",
            },
            {
              label: "Today's Order",
              value: "18",
              note: "Total orders today",
              icon: ShoppingBag,
              color: "#198754",
              bg: "#e8f7ed",
            },
            {
              label: "Today's Amount",
              value: "₹ 24,680.00",
              note: "Total amount of today's orders",
              icon: Wallet,
              color: "#1769e0",
              bg: "#eaf1ff",
            },
            {
              label: "Average Order Value",
              value: "₹ 1,371.11",
              note: "Average value today",
              icon: Check,
              color: "#6b21c9",
              bg: "#f1eaff",
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-center justify-between rounded-lg border border-[#e5e7eb] bg-white p-4"
              >
                <div>
                  <p className="text-xs font-medium text-[#374151]">
                    {stat.label}
                  </p>
                  <p
                    className="mt-2 text-lg font-bold"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </p>
                  <p className="mt-2 text-[10px] text-[#6b7280]">{stat.note}</p>
                </div>
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full"
                  style={{ backgroundColor: stat.bg, color: stat.color }}
                >
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 xl:grid-cols-[1.1fr] mt-8">
          <section className="rounded-lg border border-[#e5e7eb] bg-white p-3">
            <div className="mb-3 flex flex-col gap-2 md:flex-row">
              <div className="flex flex-1 flex-col gap-2 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by Order ID / Customer / Mobile..."
                    className="h-12 w-1/2 rounded-md border border-[#e5e7eb] pl-9 pr-3 text-xs outline-none focus:border-[#1a3c36] focus:ring-1 focus:ring-[#1a3c36]"
                  />
                </div>
                <select
                  value={datePreset}
                  onChange={(event) => {
                    setDatePreset(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-12 w-full rounded-md border border-[#e5e7eb] bg-white px-3 text-xs outline-none focus:border-[#1a3c36] focus:ring-1 focus:ring-[#1a3c36] md:w-44"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="thisWeek">This Week</option>
                  <option value="thisMonth">This Month</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="custom">Custom Range</option>
                </select>
                {datePreset === "custom" && (
                  <div className="flex w-full gap-2 md:w-auto">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(event) => {
                        setCustomStartDate(event.target.value);
                        setCurrentPage(1);
                      }}
                      className="h-12 min-w-0 rounded-md border border-[#e5e7eb] bg-white px-2 text-xs outline-none focus:border-[#1a3c36] focus:ring-1 focus:ring-[#1a3c36]"
                      aria-label="Start date"
                    />
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(event) => {
                        setCustomEndDate(event.target.value);
                        setCurrentPage(1);
                      }}
                      className="h-12 min-w-0 rounded-md border border-[#e5e7eb] bg-white px-2 text-xs outline-none focus:border-[#1a3c36] focus:ring-1 focus:ring-[#1a3c36]"
                      aria-label="End date"
                    />
                  </div>
                )}
              </div>
              <div className="flex overflow-hidden rounded-md border border-[#e5e7eb] bg-white">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  aria-label="Table view"
                  className={`flex h-12 w-10 items-center justify-center ${viewMode === "table" ? "bg-[#1a3c36] text-white" : "text-[#6b7280] hover:bg-[#f7f7f7]"}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  aria-label="Card view"
                  className={`flex h-12 w-10 items-center justify-center ${viewMode === "card" ? "bg-[#1a3c36] text-white" : "text-[#6b7280] hover:bg-[#f7f7f7]"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => navigate("/admin/billing/new")}
                className="inline-flex items-center gap-2 rounded-lg border border-[#1a3c36] bg-[#1a3c36] px-4 py-2.5 text-sm font-semibold text-white"
              >
                <span className="text-lg leading-none">+</span> New Billing
              </button>
            </div>

            <div className="overflow-x-auto mt-8">
              <table className="min-w-full text-left text-[11px]">
                <thead>
                  <tr className="bg-[#fff4ed] font-semibold text-[#374151]">
                    <th className="rounded-tl-md px-4 py-4">S.No</th>
                    <th className="px-4 py-4">Order ID</th>
                    <th className="px-4 py-4">Customer</th>
                    <th className="px-4 py-4">Items</th>
                    <th className="px-4 py-4">Order Date</th>
                    <th className="px-4 py-4">Amount</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="rounded-tr-md px-4 py-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order, index) => (
                    <tr
                      key={order.id}
                      className={`border-b border-[#f0f1f3] ${selectedOrder?.id === order.id ? "bg-[#fffaf7]" : ""}`}
                    >
                      <td className="px-2 py-3 text-[#6b7280]">{(currentPage - 1) * ordersPerPage + index + 1}</td>
                      <td className="px-2 py-3 font-semibold text-[#ed5d19]">
                        {order.id}
                        <div className="font-normal text-[#6b7280]">
                          #{order.id.slice(-3)}
                        </div>
                      </td>
                      <td className="px-2 py-3 font-medium">
                        {order.customer}
                        <div className="text-[#6b7280]">{order.phone}</div>
                      </td>
                      <td className="px-2 py-3">{order.items} Items</td>
                      <td className="px-2 py-3">
                        {order.date}
                        <div className="text-[#6b7280]">{order.time}</div>
                      </td>
                      <td className="px-2 py-3 font-medium">
                        {formatCurrency(order.amount)}
                      </td>
                      <td className="px-2 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass[order.status]}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/billing/${order.id}`)}
                          className="rounded-md border border-[#ff9869] px-2 py-1 text-[10px] font-semibold text-[#ed6b26]"
                        >
                          Show
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-mode-only hidden grid-cols-1 gap-3 p-1 sm:grid-cols-2 xl:grid-cols-3">
              {paginatedOrders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-[#1f2937]">
                        {order.id}
                      </h2>
                      <p className="mt-1 text-xs text-[#6b7280]">
                        {order.date} · {order.time}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass[order.status]}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2 text-xs">
                    <p>
                      <span className="text-[#6b7280]">Customer:</span>{" "}
                      {order.customer}
                    </p>
                    <p>
                      <span className="text-[#6b7280]">Phone:</span>{" "}
                      {order.phone || "-"}
                    </p>
                    <p>
                      <span className="text-[#6b7280]">Items:</span>{" "}
                      {order.items}
                    </p>
                    <p className="text-base font-bold text-[#ed5d19]">
                      {formatCurrency(order.amount)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/billing/${order.id}`)}
                    className="mt-4 w-full rounded-md border border-[#ff9869] px-3 py-2 text-xs font-semibold text-[#ed6b26]"
                  >
                    View Details
                  </button>
                </article>
              ))}
              {!filteredOrders.length && (
                <p className="col-span-full py-8 text-center text-xs text-[#6b7280]">
                  No orders found.
                </p>
              )}
            </div>
            <div className="mt-3 flex flex-col gap-2 text-[11px] text-[#6b7280] sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {filteredOrders.length ? (currentPage - 1) * ordersPerPage + 1 : 0} to {Math.min(currentPage * ordersPerPage, filteredOrders.length)} of {filteredOrders.length} orders
              </span>
              {filteredOrders.length > 0 && (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="rounded-md bg-[#1a3c36] px-3 py-1.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="rounded-md bg-[#1a3c36] px-3 py-1.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                </div>
              )}
            </div>
            {selectedOrder && (
              <div className="mt-4 rounded-lg border border-[#e5e7eb] bg-[#fffaf7] p-4">
                <div className="flex items-center justify-between gap-3 border-b border-[#f0e3da] pb-3">
                  <div><h2 className="text-sm font-bold">Order Details</h2><p className="mt-1 text-xs text-[#ed6b26]">{selectedOrder.id}</p></div>
                  <button type="button" onClick={() => setSelectedOrder(null)} className="rounded-md border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-semibold text-[#6b7280]">Close</button>
                </div>
                <div className="mt-3 grid gap-3 text-xs sm:grid-cols-4"><div><p className="font-semibold">Customer</p><p className="mt-1">{selectedOrder.customer}</p></div><div><p className="font-semibold">Phone</p><p className="mt-1">{selectedOrder.phone || "-"}</p></div><div><p className="font-semibold">Order Status</p><p className="mt-1">{selectedOrder.status}</p></div><div><p className="font-semibold">Payment Status</p><p className="mt-1">{selectedOrder.paymentStatus || "-"}</p></div></div>
                <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead><tr className="border-b border-[#f0e3da] text-[#6b7280]"><th className="px-2 py-2">Product</th><th className="px-2 py-2">Qty</th><th className="px-2 py-2">Unit Price</th><th className="px-2 py-2 text-right">Total</th></tr></thead><tbody>{selectedOrderItems.map((item) => <tr key={item.item_id || item.id} className="border-b border-[#f0e3da]"><td className="px-2 py-2 font-medium">{item.product_name}<div className="text-[10px] text-[#6b7280]">{item.product_code || "-"}</div></td><td className="px-2 py-2">{item.quantity}</td><td className="px-2 py-2">{formatCurrency(item.unit_price)}</td><td className="px-2 py-2 text-right font-semibold">{formatCurrency(item.total_price)}</td></tr>)}</tbody></table></div>
                <div className="mt-3 flex justify-end text-sm font-bold">Total Amount: <span className="ml-2 text-[#ed5d19]">{formatCurrency(selectedOrder.amount)}</span></div>
                {selectedOrder.address && <p className="mt-2 text-xs text-[#6b7280]">Billing Address: {selectedOrder.address.address_line1 || "-"}{selectedOrder.address.city ? `, ${selectedOrder.address.city}` : ""}{selectedOrder.address.state ? `, ${selectedOrder.address.state}` : ""}</p>}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Billing;
