import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  User,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api, { API_URL } from "../../api";

const formatCurrency = (value) =>
  `₹ ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const normalizeImageUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  const baseUrl = API_URL.replace(/\/api\/?$/, "");
  return `${baseUrl}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
};

const getOrderItemImage = (value) => {
  if (Array.isArray(value)) return getOrderItemImage(value[0]);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    try {
      const parsed = JSON.parse(trimmed);
      return parsed === value ? normalizeImageUrl(value) : getOrderItemImage(parsed);
    } catch {
      return normalizeImageUrl(trimmed);
    }
  }
  if (value && typeof value === "object") {
    return getOrderItemImage(value.url || value.image || value.src || value.path || "");
  }
  return "";
};

const statusClass = {
  Confirmed: "bg-[#e6f7ed] text-[#18794e]",
  Preparing: "bg-[#e9f1ff] text-[#3069c5]",
  Ready: "bg-[#f0e9ff] text-[#6c3bc0]",
  Completed: "bg-[#e6f7ed] text-[#18794e]",
  Cancelled: "bg-[#ffe9e9] text-[#cf4545]",
  Pending: "bg-[#fff4e8] text-[#b86b00]",
};

const mapOrder = (order) => ({
  id: order.order_id,
  customer:
    order.customer_name || order.address?.customer_name || order.customer_id || "Customer",
  phone: order.customer_phone || order.address?.mobile_number || "",
  items: Number(order.total_items || order.item_count || order.items?.length || 0),
  date: order.order_date
    ? new Date(order.order_date).toLocaleDateString("en-GB")
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
  orderDate: order.order_date
    ? new Date(order.order_date).toISOString().slice(0, 10)
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
  orderItems: (order.items || []).map((item) => ({
    ...item,
    unit_price: item.unit_price ?? item.price,
  })),
  billingType: order.billing_type || "Shop Billing",
  paymentMethod: order.payment_method || "Cash",
  subtotal: Number(order.subtotal || 0),
  discount: Number(order.discount_amount || 0),
  tax: Number(order.tax_amount || 0),
  notes: order.notes || "",
});

const OrderDetails = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await api.get(`/orders/${orderId}`);
        setOrder(response.data?.data ? mapOrder(response.data.data) : null);
      } catch (error) {
        console.error("Failed to load order details:", error);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const itemTotal = useMemo(
    () =>
      (order?.orderItems || []).reduce(
        (sum, item) => sum + Number(item.total_price || item.unit_price * item.quantity || 0),
        0,
      ),
    [order],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] text-sm text-[#475467]">
        Loading order details...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f3f4f6] px-4 text-center">
        <p className="text-lg font-semibold text-[#1f2937]">Order not found</p>
        <button
          type="button"
          onClick={() => navigate("/admin/billing")}
          className="mt-4 rounded-lg bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white"
        >
          Back to Billing
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-4 text-[#1f2937] md:p-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate("/admin/billing")}
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#49645e]"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Billing
            </button>
            <h1 className="text-2xl font-bold tracking-[-0.04em] text-[#111827]">
              Order Details
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass[order.status] || statusClass.Pending}`}
            >
              {order.status}
            </span>
            <button
              type="button"
              onClick={() => navigate("/admin/billing")}
              className="rounded-lg border border-[#dfe2e5] bg-white px-4 py-2 text-sm font-medium text-[#374151]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 border-b border-[#eef0f3] pb-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-[#6b7280]">Order ID</p>
                  <h2 className="mt-1 text-xl font-bold text-[#ed6b26]">{order.id}</h2>
                </div>
                <div className="text-sm text-[#6b7280]">
                  <p>{order.date}</p>
                  <p>{order.time}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-[#f9fafb] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                    <User className="h-4 w-4" /> Customer
                  </div>
                  <p className="mt-3 text-base font-semibold text-[#111827]">{order.customer}</p>
                  <p className="mt-1 text-sm text-[#4b5563]">{order.email || "No email provided"}</p>
                </div>

                <div className="rounded-xl bg-[#f9fafb] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                    <Phone className="h-4 w-4" /> Phone
                  </div>
                  <p className="mt-3 text-base font-semibold text-[#111827]">{order.phone || "-"}</p>
                </div>

                <div className="rounded-xl bg-[#f9fafb] p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                    <CreditCard className="h-4 w-4" /> Payment
                  </div>
                  <p className="mt-3 text-base font-semibold text-[#111827]">{order.paymentMethod}</p>
                  <p className="mt-1 text-sm text-[#4b5563]">{order.paymentStatus}</p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-base font-semibold text-[#111827]">
                <Package className="h-5 w-5 text-[#ed6b26]" /> Ordered Items
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#eef0f3] text-[#6b7280]">
                      <th className="px-2 py-3 font-semibold">Product</th>
                      <th className="px-2 py-3 font-semibold">Qty</th>
                      <th className="px-2 py-3 font-semibold">Unit Price</th>
                      <th className="px-2 py-3 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.orderItems || []).map((item) => (
                      <tr key={item.item_id || item.id || `${order.id}-${item.product_name}`} className="border-b border-[#f3f4f6]">
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e5e7eb] bg-[#f9fafb]">
                              {getOrderItemImage(item.product_image) ? (
                                <img
                                  src={getOrderItemImage(item.product_image)}
                                  alt={item.product_name || "Ordered product"}
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <Package className="h-5 w-5 text-[#9ca3af]" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-[#111827]">{item.product_name}</div>
                              <div className="text-xs text-[#6b7280]">{item.product_code || "-"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-[#374151]">{item.quantity}</td>
                        <td className="px-2 py-3 text-[#374151]">{formatCurrency(item.unit_price)}</td>
                        <td className="px-2 py-3 text-right font-semibold text-[#111827]">
                          {formatCurrency(item.total_price || item.unit_price * item.quantity || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-base font-semibold text-[#111827]">
                <ShoppingBag className="h-5 w-5 text-[#ed6b26]" /> Summary
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-[#4b5563]">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal || itemTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-[#4b5563]">
                  <span>Discount</span>
                  <span>- {formatCurrency(order.discount)}</span>
                </div>
                <div className="flex items-center justify-between text-[#4b5563]">
                  <span>Tax</span>
                  <span>{formatCurrency(order.tax)}</span>
                </div>
                <div className="mt-3 border-t border-[#eef0f3] pt-3 text-base font-bold text-[#111827]">
                  <div className="flex items-center justify-between">
                    <span>Total</span>
                    <span className="text-[#ed5d19]">{formatCurrency(order.amount)}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-base font-semibold text-[#111827]">
                <MapPin className="h-5 w-5 text-[#ed6b26]" /> Billing Address
              </div>

              {order.address ? (
                <div className="space-y-2 text-sm text-[#4b5563]">
                  <p className="font-medium text-[#111827]">{order.address.customer_name}</p>
                  <p>{order.address.address_line1 || "-"}</p>
                  {order.address.address_line2 && <p>{order.address.address_line2}</p>}
                  <p>
                    {[order.address.city, order.address.state, order.address.pincode]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p>{order.address.country || "India"}</p>
                  <p>{order.address.mobile_number || order.phone || "-"}</p>
                </div>
              ) : (
                <p className="text-sm text-[#6b7280]">No address available.</p>
              )}
            </section>

            <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-base font-semibold text-[#111827]">
                <CalendarDays className="h-5 w-5 text-[#ed6b26]" /> Additional Info
              </div>
              <div className="space-y-3 text-sm text-[#4b5563]">
                <div className="flex items-center justify-between gap-4">
                  <span>Billing Type</span>
                  <span className="font-medium text-[#111827]">{order.billingType}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Order Date</span>
                  <span className="font-medium text-[#111827]">{order.date}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Items Count</span>
                  <span className="font-medium text-[#111827]">{order.items}</span>
                </div>
                {order.notes && (
                  <div className="rounded-lg bg-[#f9fafb] p-3 text-xs leading-6 text-[#475467]">
                    <span className="font-semibold text-[#111827]">Notes:</span> {order.notes}
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
