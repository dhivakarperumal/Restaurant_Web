import { useCallback, useEffect, useState } from 'react';
import { Clock3, MapPin, PackageCheck, RefreshCw, UserRound, UtensilsCrossed } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api, { BACKEND_BASE_URL } from '../api';

const STATUS_OPTIONS = [
  { value: 'placed', label: 'New' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const FILTERS = {
  all: {},
  new: { status: 'placed' },
  delivery: { fulfillment: 'delivery' },
  cancelled: { status: 'cancelled' },
};

const imageUrl = (image) => {
  if (!image) return '';
  if (/^https?:\/\//i.test(image)) return image;
  return `${BACKEND_BASE_URL}${image.startsWith('/') ? image : `/${image}`}`;
};

const formatDate = (value) => {
  if (!value) return 'Date unavailable';
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

function CustomerOrdersPage({ audience = 'admin', view = 'all' }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updatingOrder, setUpdatingOrder] = useState('');
  const isCustomer = audience === 'customer';
  const title = isCustomer
    ? 'My Orders'
    : audience === 'chef' ? 'Customer Kitchen Orders' : 'Customer Orders';
  const filterStatus = FILTERS[view]?.status;
  const filterFulfillment = FILTERS[view]?.fulfillment;

  const fetchOrders = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const params = {
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterFulfillment ? { fulfillment: filterFulfillment } : {}),
      };
      const endpoint = isCustomer ? '/orders/mine' : '/orders/management';
      const { data } = await api.get(endpoint, { params: isCustomer ? undefined : params });
      setOrders(Array.isArray(data?.data) ? data.data : []);
      setError('');
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Customer orders could not be loaded.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterStatus, filterFulfillment, isCustomer]);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => fetchOrders(), 0);
    const intervalId = window.setInterval(() => fetchOrders(), 15000);
    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(intervalId);
    };
  }, [fetchOrders]);

  const changeStatus = async (order, status) => {
    setUpdatingOrder(order.order_number);
    try {
      const { data } = await api.patch(
        `/orders/management/${encodeURIComponent(order.order_number)}/status`,
        { status }
      );
      if (!data?.success) throw new Error(data?.message || 'Order status could not be updated.');
      setOrders((current) => current.map((item) => (
        item.order_number === order.order_number
          ? { ...item, order_status: status }
          : item
      )));
      toast.success('Customer order updated.');
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || requestError.message || 'Order status could not be updated.');
    } finally {
      setUpdatingOrder('');
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f6f3] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a34f32]">
              {audience === 'chef' ? 'Kitchen' : 'Administration'}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#263830]">{title}</h1>
            <p className="mt-2 text-sm text-[#68766e]">
              {isCustomer
                ? 'Your order history and current order status.'
                : audience === 'chef'
                ? 'Review customer orders and update their kitchen progress.'
                : 'Review customer orders, fulfilment details, and payment status.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-[#d9ded8] bg-white px-4 py-2.5 text-sm font-semibold text-[#263830] hover:bg-[#f9faf8] disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
            <button type="button" onClick={() => fetchOrders(true)} className="ml-3 font-bold underline">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-[#e3e7e1] bg-white px-6 py-16 text-center text-sm text-[#68766e]">Loading customer orders…</div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-[#e3e7e1] bg-white px-6 py-16 text-center">
            <PackageCheck className="mx-auto h-10 w-10 text-[#a34f32]" />
            <p className="mt-3 text-lg font-bold text-[#263830]">No orders to show</p>
            <p className="mt-1 text-sm text-[#68766e]">New customer orders will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {orders.map((order) => (
              <article key={order.order_number} className="overflow-hidden rounded-2xl border border-[#e3e7e1] bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf0eb] p-5">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-sm font-bold text-[#263830]">{order.order_number}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[#768078]">
                      <Clock3 size={13} /> {formatDate(order.created_at)}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                    order.order_status === 'cancelled' ? 'bg-rose-50 text-rose-700'
                      : order.order_status === 'completed' ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-800'
                  }`}>
                    {order.order_status?.replaceAll('_', ' ') || 'placed'}
                  </span>
                </div>

                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#879088]"><UserRound size={14} /> Customer</p>
                    <p className="text-sm font-bold text-[#263830]">{order.customer_name}</p>
                    <p className="mt-1 text-sm text-[#68766e]">{order.customer_phone}</p>
                    {order.customer_email && <p className="mt-1 break-all text-sm text-[#68766e]">{order.customer_email}</p>}
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#879088]">
                      <MapPin size={14} /> {order.fulfillment_type === 'pickup' ? 'Pickup' : 'Delivery address'}
                    </p>
                    {order.address ? (
                      <p className="text-sm leading-6 text-[#435047]">
                        {[order.address.address_line, order.address.area_locality, order.address.landmark, order.address.city, order.address.state, order.address.pincode].filter(Boolean).join(', ')}
                      </p>
                    ) : (
                      <p className="text-sm text-[#68766e]">Customer pickup</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 border-t border-[#edf0eb] px-5 py-4">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#879088]"><UtensilsCrossed size={14} /> Items</p>
                  {order.items.map((item) => (
                    <div key={`${order.order_number}-${item.food_id}`} className="flex items-center gap-3">
                      {item.product_image ? (
                        <img src={imageUrl(item.product_image)} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#f4f2ed] text-[#a34f32]"><UtensilsCrossed size={18} /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#263830]">{item.product_name}</p>
                        <p className="text-xs text-[#7a857d]">
                          {item.portion_size} · Qty {item.quantity}
                          {Array.isArray(item.selected_addons) && item.selected_addons.length > 0
                            ? ` · ${item.selected_addons.join(', ')}`
                            : ''}
                        </p>
                        {Object.entries(item.selected_customizations || {}).flatMap(([group, selection]) => {
                          const options = Array.isArray(selection) ? selection : selection ? [selection] : [];
                          return options.map((option) => (
                            <p key={`${group}-${option}`} className="mt-0.5 text-xs text-[#7a857d]">
                              {group === '__custom_request__' ? 'Custom request' : group}: {option}
                            </p>
                          ));
                        })}
                        {item.cooking_notes && <p className="mt-0.5 text-xs italic text-[#7a857d]">Note: {item.cooking_notes}</p>}
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-[#263830]">₹{Number(item.total_price).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <footer className="flex flex-col gap-4 border-t border-[#edf0eb] bg-[#fafbf9] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs text-[#7a857d]">
                      {String(order.payment_method).toUpperCase()} · Payment {order.payment_status}
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-[#263830]">₹{Number(order.total_amount).toFixed(2)}</p>
                  </div>
                  {!isCustomer && (
                    <label className="text-xs font-semibold text-[#68766e]">
                      Update order
                      <select
                        value={order.order_status}
                        disabled={updatingOrder === order.order_number || order.payment_status === 'failed'}
                        onChange={(event) => changeStatus(order, event.target.value)}
                        className="mt-1 block w-full rounded-lg border border-[#d9ded8] bg-white px-3 py-2 text-sm font-semibold capitalize text-[#263830] disabled:opacity-50 sm:min-w-44"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default CustomerOrdersPage;
