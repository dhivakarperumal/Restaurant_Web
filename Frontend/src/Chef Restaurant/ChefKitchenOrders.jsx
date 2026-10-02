import { useCallback, useEffect, useState } from "react";
import { Clock3, RefreshCw, UtensilsCrossed } from "lucide-react";
import api from "../api";

const requestKitchenOrders = async () => {
  const response = await api.get("/kitchen-orders");
  return Array.isArray(response.data?.orders) ? response.data.orders : [];
};

const getKitchenOrderErrorMessage = (requestError) => (
  requestError.response?.data?.message || "Kitchen orders could not be loaded."
);

const ChefKitchenOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      setOrders(await requestKitchenOrders());
      setError("");
    } catch (requestError) {
      setError(getKitchenOrderErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    requestKitchenOrders()
      .then((nextOrders) => {
        if (!isMounted) return;
        setOrders(nextOrders);
        setError("");
      })
      .catch((requestError) => {
        if (isMounted) setError(getKitchenOrderErrorMessage(requestError));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const interval = window.setInterval(() => fetchOrders(), 15000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [fetchOrders]);

  return (
    <main className="min-h-screen bg-[#f2f3f0] p-4 md:p-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[2.1rem] font-bold tracking-[-0.05em] text-[#1f1d1b]">Kitchen Orders</h1>
            <p className="mt-2 text-[13px] text-[#646464]">Dashboard <span className="mx-2 text-[#9a9a9a]">&gt;</span> <span className="font-medium text-[#2a2a2a]">Kitchen Orders</span></p>
          </div>
          <button type="button" onClick={() => fetchOrders(true)} disabled={loading} className="inline-flex h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#dfe2e5] bg-white px-4 text-sm font-semibold text-[#34443b] transition hover:bg-[#faf9f8] disabled:cursor-wait disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {error ? (
          <div role="alert" className="rounded-[18px] border border-[#edc7c1] bg-white p-6 text-sm text-[#a13e30]">
            {error}
            <button type="button" onClick={() => fetchOrders(true)} className="ml-3 cursor-pointer font-semibold underline">Try again</button>
          </div>
        ) : loading ? (
          <div className="rounded-[18px] border border-[#e7e0d8] bg-white p-12 text-center text-sm text-gray-500">Loading kitchen orders...</div>
        ) : orders.length === 0 ? (
          <div className="rounded-[18px] border-2 border-dashed border-[#e6ddd1] bg-[#faf9f8] py-16 text-center">
            <UtensilsCrossed className="mx-auto h-10 w-10 text-[#8a8a8a]" />
            <h2 className="mt-3 text-base font-bold text-[#333]">No kitchen orders yet</h2>
            <p className="mt-1 text-sm text-[#888]">New orders from the server menu will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {orders.map((order) => (
              <article key={order.order_id} className="rounded-[18px] border border-[#e7e0d8] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#f0ebe6] pb-4">
                  <div>
                    <p className="text-xs font-mono text-[#849087]">Order {order.order_id.slice(0, 8).toUpperCase()}</p>
                    <h2 className="mt-1 text-lg font-bold text-[#203129]">Table {order.table_number}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[#758179]">
                      <Clock3 className="h-3.5 w-3.5" />
                      {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    {order.status}
                  </span>
                </div>
                <ul className="mt-4 space-y-3">
                  {order.items.map((item) => (
                    <li key={`${order.order_id}-${item.food_id}`} className="flex items-start justify-between gap-3 text-sm">
                      <span className="font-semibold text-[#34443b]">{item.quantity} × {item.food_name}</span>
                      <span className="shrink-0 text-[#758179]">₹{(Number(item.unit_price) * item.quantity).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default ChefKitchenOrders;
