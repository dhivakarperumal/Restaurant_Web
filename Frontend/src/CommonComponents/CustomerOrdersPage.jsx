import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock3, LayoutGrid, List, MapPin, PackageCheck, RefreshCw, Search, UserRound, UtensilsCrossed } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api, { BACKEND_BASE_URL } from '../api';
import PageHeader from './PageHeader';

const STATUS_OPTIONS = [
  { value: 'placed', label: 'New' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const FILTERS = {
  all: {},
  new: { status: 'placed' },
  delivery: { order_type: 'home_delivery' },
  pickup: { order_type: 'pickup' },
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

function CustomerOrdersPage({ audience = 'admin', view = 'all', showOrderFilters = false }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updatingOrder, setUpdatingOrder] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState(
    view === 'delivery' ? 'home_delivery' : view === 'pickup' ? 'pickup' : 'all'
  );
  const [statusFilter, setStatusFilter] = useState(view === 'new' ? 'placed' : 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('latest');
  const [layout, setLayout] = useState('table');
  const isCustomer = audience === 'customer';
  const title = isCustomer
    ? 'My Orders'
    : audience === 'chef' ? 'Customer Kitchen Orders'
      : view === 'new' ? 'New Orders'
        : view === 'pickup' ? 'Pickup Orders'
      : view === 'delivery' ? (showOrderFilters ? 'Home Delivery Orders' : 'Delivery Orders')
        : 'Customer Orders';
  const filterStatus = showOrderFilters && view === 'new'
    ? (statusFilter === 'all' ? undefined : statusFilter)
    : FILTERS[view]?.status;
  const filterOrderType = FILTERS[view]?.order_type;
  const visibleOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return orders
      .filter((order) => statusFilter === 'all' || order.order_status === statusFilter)
      .filter((order) => {
        if (!query) return true;
        const text = [
          order.order_number,
          order.customer_name,
          order.customer_phone,
          order.customer_email,
          ...(order.items || []).map((item) => item.product_name),
        ].join(' ').toLowerCase();
        return text.includes(query);
      })
      .sort((first, second) => {
        const difference = new Date(first.created_at || 0).getTime() - new Date(second.created_at || 0).getTime();
        return sortOrder === 'latest' ? -difference : difference;
      });
  }, [orders, searchTerm, sortOrder, statusFilter]);
  const statusCounts = useMemo(() => STATUS_OPTIONS.reduce((counts, status) => {
    counts[status.value] = orders.filter((order) => order.order_status === status.value).length;
    return counts;
  }, {}), [orders]);

  const fetchOrders = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const params = {
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(showOrderFilters
          ? (orderTypeFilter !== 'all' ? { order_type: orderTypeFilter } : {})
          : (filterOrderType ? { order_type: filterOrderType } : {})),
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
  }, [filterStatus, filterOrderType, isCustomer, orderTypeFilter, showOrderFilters]);

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
    <>
      {isCustomer && <PageHeader title={title} />}
      <main className="min-h-screen  p-2 sm:p-2 lg:p-2">
      <div className="mx-auto max-w-[1500px] space-y-6">
       

        {!isCustomer && audience === 'admin' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { title: 'Total Orders', value: orders.length, icon: UtensilsCrossed, bg: 'bg-[#22c55e]', hint: 'All orders in view' },
              { title: 'Pending / Active', value: (statusCounts['placed'] || 0) + (statusCounts['preparing'] || 0), icon: Clock3, bg: 'bg-[#f59e0b]', hint: 'Placed & preparing' },
              { title: 'Completed', value: (statusCounts['completed'] || 0) + (statusCounts['delivered'] || 0), icon: PackageCheck, bg: 'bg-[#3b82f6]', hint: 'Delivered or done' },
              { title: 'Cancelled', value: statusCounts['cancelled'] || 0, icon: MapPin, bg: (statusCounts['cancelled'] || 0) > 0 ? 'bg-[#ef4444]' : 'bg-[#8b5cf6]', hint: 'Cancelled orders' },
            ].map(({ title: cardTitle, value, icon: Icon, bg, hint }, index) => (
              <article key={cardTitle} className={`relative min-w-0 overflow-hidden rounded-xl border border-transparent p-4 sm:p-5 shadow-[0_2px_10px_rgba(20,56,34,0.08)] flex flex-col justify-between min-h-[140px] ${bg} text-white`}>
                <div className="flex items-start gap-3 relative z-10">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm bg-white/20">
                    <Icon size={24} strokeWidth={2.2} className="text-white" />
                  </div>
                  <div className="flex-1 mt-0.5 min-w-0">
                    <h3 className="text-[12px] font-semibold opacity-90 mb-1 truncate">{cardTitle}</h3>
                    <div className="text-[26px] font-extrabold leading-none tracking-tight">{value}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-5 relative z-10">
                  <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold bg-white/25">↑ Live</span>
                  <span className="text-[11px] font-medium opacity-75 truncate">{hint}</span>
                </div>
                <div className="absolute right-0 bottom-0 w-24 h-16 pointer-events-none opacity-50">
                  <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                    <defs>
                      <linearGradient id={`ordgrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#ordgrad-${index})`} />
                    <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                  </svg>
                </div>
              </article>
            ))}
          </div>
        )}

        {showOrderFilters && (
          <section aria-label="Filter orders" className="flex flex-col gap-3 rounded-xl border border-[#e3e7e1] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block w-full sm:max-w-sm sm:flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a857d]" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search order, customer, phone..."
                aria-label="Search orders"
                className="h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-white pl-11 pr-3 text-sm text-[#263830] outline-none placeholder:text-[#89938c] focus:border-[#6d9a79]"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span className="mr-1 whitespace-nowrap text-xs text-[#68766e]">{visibleOrders.length} of {orders.length}</span>
              <select value={orderTypeFilter} onChange={(event) => setOrderTypeFilter(event.target.value)} aria-label="Filter orders by type" className="h-[46px] rounded-xl border border-[#dfe2e5] bg-white px-3 text-sm text-[#263830] outline-none focus:border-[#6d9a79]">
                <option value="all">All Types</option>
                <option value="home_delivery">Home Delivery</option>
                <option value="pickup">Pickup</option>
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter orders by status" className="h-[46px] rounded-xl border border-[#dfe2e5] bg-white px-3 text-sm text-[#263830] outline-none focus:border-[#6d9a79]">
                <option value="all">All Status ({orders.length})</option>
                {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label} ({statusCounts[status.value]})</option>)}
              </select>
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} aria-label="Sort orders" className="h-[46px] rounded-xl border border-[#dfe2e5] bg-white px-3 text-sm text-[#263830] outline-none focus:border-[#6d9a79]">
                <option value="latest">Sort by: Latest</option>
                <option value="oldest">Sort by: Oldest</option>
              </select>
              <div className="flex h-[46px] overflow-hidden rounded-xl border border-[#dfe2e5] bg-white" role="group" aria-label="Orders view">
                <button type="button" onClick={() => setLayout('table')} aria-label="Table view" aria-pressed={layout === 'table'} title="Table view" className={`grid w-11 place-items-center border-r border-[#dfe2e5] ${layout === 'table' ? 'bg-[#1a3c36] text-white' : 'text-[#66736b] hover:bg-gray-50'}`}><List size={16} /></button>
                <button type="button" onClick={() => setLayout('card')} aria-label="Card view" aria-pressed={layout === 'card'} title="Card view" className={`grid w-11 place-items-center ${layout === 'card' ? 'bg-[#1a3c36] text-white' : 'text-[#66736b] hover:bg-gray-50'}`}><LayoutGrid size={16} /></button>
              </div>
            </div>
          </section>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
            <button type="button" onClick={() => fetchOrders(true)} className="ml-3 font-bold underline">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-[#e3e7e1] bg-white px-6 py-16 text-center text-sm text-[#68766e]">Loading customer orders…</div>
        ) : visibleOrders.length === 0 ? (
          <div className="rounded-2xl border border-[#e3e7e1] bg-white px-6 py-16 text-center">
            <PackageCheck className="mx-auto h-10 w-10 text-[#a34f32]" />
            <p className="mt-3 text-lg font-bold text-[#263830]">No orders to show</p>
            <p className="mt-1 text-sm text-[#68766e]">New customer orders will appear here automatically.</p>
          </div>
        ) : showOrderFilters && layout === 'table' ? (
          <div className="overflow-x-auto rounded-2xl border border-[#e3e7e1] bg-white shadow-sm">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#1a3c36] text-xs uppercase tracking-wide text-white">
                <tr>{['Order', 'Customer', 'Items', 'Type', 'Status', 'Payment', 'Total', 'Placed'].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-4 font-bold">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-[#edf0eb]">
                {visibleOrders.map((order) => (
                  <tr key={order.order_number} className="hover:bg-[#fbfcfa]">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-[#263830]">{order.order_number}</td>
                    <td className="px-4 py-3"><p className="font-semibold text-[#263830]">{order.customer_name}</p><p className="text-xs text-[#68766e]">{order.customer_phone}</p></td>
                    <td className="max-w-56 px-4 py-3 text-xs text-[#435047]">{order.items.map((item) => `${item.product_name} ×${item.quantity}`).join(', ')}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[#435047]">{order.order_type === 'home_delivery' ? 'Home Delivery' : 'Pickup'}</td>
                    <td className="px-4 py-3">
                      <select value={order.order_status} disabled={updatingOrder === order.order_number || order.payment_status === 'failed'} onChange={(event) => changeStatus(order, event.target.value)} aria-label={`Update order ${order.order_number} status`} className="rounded-lg border border-[#d9ded8] bg-white px-2 py-1.5 text-xs font-semibold capitalize text-[#263830] disabled:opacity-50">
                        {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs capitalize text-[#435047]">{order.payment_method} · {order.payment_status}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-[#263830]">₹{Number(order.total_amount).toFixed(2)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#68766e]">{formatDate(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`grid gap-5 ${showOrderFilters ? 'md:grid-cols-2' : 'xl:grid-cols-2'}`}>
            {visibleOrders.map((order) => (
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
                      <MapPin size={14} /> {order.order_type === 'pickup' ? 'Pickup' : 'Home Delivery address'}
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
    </>
  );
}

export default CustomerOrdersPage;
