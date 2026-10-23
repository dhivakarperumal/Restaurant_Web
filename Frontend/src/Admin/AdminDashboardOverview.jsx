import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, CalendarDays, Flame, Layers, Receipt,
  ChefHat, CircleDollarSign, Clock3, CreditCard, CookingPot, Package,
  PackageCheck, ShoppingBag, Table2,
  TrendingUp, Users, UtensilsCrossed,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import api, { BACKEND_BASE_URL } from '../api';

const PERIODS = [
  ['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'This Week'],
  ['lastWeek', 'Last Week'], ['month', 'This Month'], ['lastMonth', 'Last Month'],
  ['year', 'This Year'], ['lastYear', 'Last Year'], ['all', 'All Dates'], ['custom', 'Custom Range'],
];
const PERIOD_API = { 'this-week': 'week', 'last-week': 'lastWeek', 'this-month': 'month', 'last-month': 'lastMonth', 'last-year': 'lastYear', 'this-year': 'year' };
const STATUS_COLORS = {
  delivered: '#36b65c', served: '#36b65c', preparing: '#1681e8', ready: '#1681e8',
  'ready to serve': '#1681e8', pending: '#f3a900', placed: '#f3a900',
  cancelled: '#f24747', canceled: '#f24747', confirmed: '#8055e8',
  'out for delivery': '#8055e8', out_for_delivery: '#8055e8',
};
const money = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const getDateKey = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const formatDate = (value, options = { day: '2-digit', month: 'short' }) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-IN', options).format(date);
};
const formatDateTime = (value) => formatDate(value, { hour: '2-digit', minute: '2-digit' });
const parseImages = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch {
    return [value];
  }
};
const imageUrl = (value) => {
  if (!value) return '';
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) return value;
  return `${BACKEND_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
};
const errorText = (error) => error?.response?.data?.message || 'Some dashboard data could not be loaded.';
const customerRole = (role) => ['user', 'customer'].includes(String(role || '').trim().toLowerCase());
const completedTicket = (status) => ['served', 'delivered'].includes(String(status || '').trim().toLowerCase());
const terminalOrder = (status) => ['delivered', 'completed', 'cancelled', 'canceled'].includes(String(status || '').trim().toLowerCase());

const rangeBounds = (range, from, to) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const shift = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  let start;
  let end;
  switch (range) {
    case 'today': start = today; end = shift(today, 1); break;
    case 'yesterday': start = shift(today, -1); end = today; break;
    case 'this-week': start = shift(today, -((today.getDay() + 6) % 7)); end = shift(today, 1); break;
    case 'last-week': end = shift(today, -((today.getDay() + 6) % 7)); start = shift(end, -7); break;
    case 'this-month': start = new Date(today.getFullYear(), today.getMonth(), 1); end = shift(today, 1); break;
    case 'last-month': start = new Date(today.getFullYear(), today.getMonth() - 1, 1); end = new Date(today.getFullYear(), today.getMonth(), 1); break;
    case 'this-year': start = new Date(today.getFullYear(), 0, 1); end = shift(today, 1); break;
    case 'last-year': start = new Date(today.getFullYear() - 1, 0, 1); end = new Date(today.getFullYear(), 0, 1); break;
    case 'custom':
      if (!from || !to) return null;
      start = new Date(`${from}T00:00:00`);
      end = shift(new Date(`${to}T00:00:00`), 1);
      break;
    default: return null;
  }
  return { start, end };
};
const inRange = (dateValue, range, from, to) => {
  if (range === 'all') return true;
  const bounds = rangeBounds(range, from, to);
  const date = new Date(dateValue);
  return Boolean(bounds && !Number.isNaN(date.getTime()) && date >= bounds.start && date < bounds.end);
};
const normalizeStatus = (status) => {
  const raw = String(status || 'Pending').trim();
  const key = raw.toLowerCase();
  if (['placed', 'pending'].includes(key)) return 'Pending';
  if (key === 'delivered' || key === 'completed' || key === 'served') return 'Delivered';
  if (['preparing', 'processing'].includes(key)) return 'Preparing';
  if (['ready', 'ready to serve'].includes(key)) return 'Ready';
  if (['out_for_delivery', 'out for delivery'].includes(key)) return 'Out for Delivery';
  if (['cancelled', 'canceled'].includes(key)) return 'Cancelled';
  return raw;
};

function MetricCard({ title, value, icon: Icon, tone, hint, accentColor, glowColor, percent }) {
  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_12px_24px_-6px_rgba(0,0,0,0.1)] sm:p-5">
      {/* Background soft glow gradient */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-20 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-35"
        style={{ backgroundColor: glowColor || accentColor || '#3b82f6' }}
      />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-bold tracking-wider text-slate-500 uppercase">{title}</p>
          <div className="mt-2.5 truncate text-[23px] font-black tracking-tight text-slate-800 sm:text-[27px]">
            {value}
          </div>
        </div>
        <div
          className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${tone}`}
        >
          <Icon size={24} strokeWidth={2.3} />
        </div>
      </div>

      <div className="relative z-10 mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          {percent && (
            <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600 ring-1 ring-inset ring-emerald-500/20">
              {percent}
            </span>
          )}
          <span className="truncate text-slate-500 font-medium">{hint}</span>
        </div>
        <span
          className="h-2 w-2 rounded-full shrink-0 shadow-sm"
          style={{ backgroundColor: accentColor || '#10b981' }}
        />
      </div>

      {/* Modern gradient accent bar on hover */}
      <div
        className="absolute bottom-0 left-0 h-[3px] w-0 transition-all duration-300 group-hover:w-full"
        style={{ backgroundColor: accentColor || '#3b82f6' }}
      />
    </article>
  );
}

const AdminDashboardOverview = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('year');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [snapshot, setSnapshot] = useState({ orders: [], bills: [], kitchenOrders: [], users: [], foods: [], categories: [], inventory: {}, kitchenRequests: [] });
  const [report, setReport] = useState({ summary: null, trend: [], statuses: [] });
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(true);
  const [error, setError] = useState('');
  const [kitchenRequestsLoaded, setKitchenRequestsLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.allSettled([
      api.get('/orders/management', { signal: controller.signal }),
      api.get('/table-bills', { signal: controller.signal }),
      api.get('/kitchen-orders', { signal: controller.signal }),
      api.get('/users', { signal: controller.signal }),
      api.get('/foods', { signal: controller.signal }),
      api.get('/inventory/dashboard', { signal: controller.signal }),
      api.get('/inventory/kitchen-requests', { signal: controller.signal }),
      api.get('/categories', { signal: controller.signal }),
    ]).then((results) => {
      if (controller.signal.aborted) return;
      const value = (index, path, fallback) => {
        const response = results[index]?.status === 'fulfilled' ? results[index].value : null;
        return path.reduce((current, key) => current?.[key], response) ?? fallback;
      };
      setSnapshot({
        orders: value(0, ['data', 'data'], []),
        bills: value(1, ['data', 'bills'], []),
        kitchenOrders: value(2, ['data', 'orders'], []),
        users: value(3, ['data', 'data'], []),
        foods: value(4, ['data', 'data'], []),
        inventory: value(5, ['data', 'data'], {}),
        kitchenRequests: value(6, ['data', 'data'], []),
        categories: value(7, ['data', 'data'], []),
      });
      setKitchenRequestsLoaded(results[6]?.status === 'fulfilled');
      const failures = results.filter((result) => result.status === 'rejected');
      setError(failures.length ? 'Some dashboard sections are temporarily unavailable.' : '');
      setLoading(false);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let active = true;
    const refreshKitchenRequests = async () => {
      try {
        const { data } = await api.get('/inventory/kitchen-requests');
        if (!active || !Array.isArray(data?.data)) return;
        setSnapshot((current) => ({ ...current, kitchenRequests: data.data }));
        setKitchenRequestsLoaded(true);
      } catch {
        // Keep the current list and summary fallback when refresh is unavailable.
      }
    };
    const interval = window.setInterval(refreshKitchenRequests, 15000);
    window.addEventListener('focus', refreshKitchenRequests);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshKitchenRequests);
    };
  }, []);

  const apiRange = PERIOD_API[period] || period;
  useEffect(() => {
    if (period === 'custom' && (!customFrom || !customTo)) {
      setReportLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    const params = {
      range: apiRange,
      ...(period === 'custom' ? { startDate: customFrom, endDate: customTo } : {}),
    };
    setReportLoading(true);
    Promise.all([
      api.get('/revenue/summary', { params, signal: controller.signal }),
      api.get('/revenue/trend', { params: { ...params, trend: ['year', 'lastYear', 'this-year', 'last-year'].includes(period) ? 'year' : 'month', dateBasis: 'delivered' }, signal: controller.signal }),
      api.get('/revenue/status', { params, signal: controller.signal }),
    ]).then(([summaryResponse, trendResponse, statusResponse]) => {
      setReport({ summary: summaryResponse.data.data, trend: trendResponse.data.data, statuses: statusResponse.data.data });
    }).catch((requestError) => {
      if (requestError.name !== 'CanceledError' && requestError.code !== 'ERR_CANCELED') setError(errorText(requestError));
    }).finally(() => {
      if (!controller.signal.aborted) setReportLoading(false);
    });
    return () => controller.abort();
  }, [apiRange, customFrom, customTo, period]);

  const dateRangeOrders = snapshot.orders.filter((order) => inRange(order.created_at || order.order_date, period, customFrom, customTo));
  const dateRangeBills = snapshot.bills.filter((bill) => inRange(bill.created_at, period, customFrom, customTo));
  const activeDeliveryCount = dateRangeOrders.filter((order) => order.order_type === 'home_delivery' && !terminalOrder(order.order_status)).length;
  const customerCount = snapshot.users.filter((user) => customerRole(user.role)).length;
  const statusTotal = report.statuses.reduce((sum, item) => sum + Number(item.count || 0), 0);
  const pendingOrderCount = report.statuses.reduce((count, item) => (
    ['pending', 'placed', 'preparing', 'ready'].includes(String(item.status).toLowerCase())
      ? count + Number(item.count || 0)
      : count
  ), 0);
  const completedOrderCount = report.statuses.reduce((count, item) => (
    ['delivered', 'served', 'completed'].includes(String(item.status).toLowerCase())
      ? count + Number(item.count || 0)
      : count
  ), 0);
  const todayKey = getDateKey(new Date());
  const todayOrders = snapshot.orders.filter((order) => getDateKey(order.created_at || order.order_date) === todayKey);
  const todayBills = snapshot.bills.filter((bill) => getDateKey(bill.created_at) === todayKey);
  const todayOrderCount = todayOrders.length + todayBills.length;
  const todayRevenue = todayOrders
    .filter((order) => ['delivered', 'completed', 'served'].includes(String(order.order_status).toLowerCase()))
    .reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
    + todayBills
      .filter((bill) => String(bill.status).toLowerCase() === 'paid')
      .reduce((sum, bill) => sum + Number(bill.grand_total || 0), 0);

  const ticketGroups = new Map();
  snapshot.kitchenOrders.forEach((ticket) => {
    if (!ticket.bill_id) return;
    const items = ticketGroups.get(ticket.bill_id) || [];
    items.push(ticket);
    ticketGroups.set(ticket.bill_id, items);
  });
  const completedBillIds = new Set(dateRangeBills.filter((bill) => {
    const tickets = ticketGroups.get(bill.bill_id) || [];
    return String(bill.status).toLowerCase() === 'paid' && tickets.length > 0 && tickets.every((ticket) => completedTicket(ticket.status));
  }).map((bill) => bill.bill_id));

  const foodById = new Map(snapshot.foods.map((food) => [String(food.food_id), food]));
  const topItems = new Map();
  const addTopItem = (item, quantity, lineRevenue, saleId) => {
    const id = String(item.food_id || item.product_name || item.food_name || 'item');
    const food = foodById.get(id);
    const name = item.food_name || item.product_name || food?.food_name || 'Menu item';
    const entry = topItems.get(id) || {
      id,
      name,
      quantity: 0,
      revenue: 0,
      orderIds: new Set(),
      image: item.product_image || parseImages(food?.food_images)[0] || '',
    };
    entry.quantity += Number(quantity || 0);
    entry.revenue += Number(lineRevenue || 0);
    entry.orderIds.add(String(saleId));
    topItems.set(id, entry);
  };
  dateRangeOrders.filter((order) => String(order.order_status).toLowerCase() === 'delivered').forEach((order, index) => {
    const saleId = order.order_id || order.order_number || `order-${index}`;
    (order.items || []).forEach((item) => addTopItem(item, item.quantity, item.total_price, saleId));
  });
  dateRangeBills.filter((bill) => completedBillIds.has(bill.bill_id)).forEach((bill) => {
    (ticketGroups.get(bill.bill_id) || []).forEach((ticket) => (ticket.items || []).forEach((item) => {
      addTopItem(item, item.quantity, Number(item.quantity) * Number(item.unit_price), `bill-${bill.bill_id}`);
    }));
  });
  const topSellingItems = [...topItems.values()]
    .map(({ orderIds, ...item }) => ({ ...item, orders: orderIds.size }))
    .sort((a, b) => b.orders - a.orders || b.quantity - a.quantity)
    .slice(0, 5);
  const maxTopItemOrders = topSellingItems[0]?.orders || 1;
  const visibleFoods = snapshot.foods.filter((food) => (
    food.is_menu_visible && String(food.status || '').toLowerCase() === 'active'
  ));
  const categoryTiles = snapshot.categories
    .filter((category) => String(category.status || 'Active').toLowerCase() === 'active')
    .map((category) => {
      const categoryFoods = visibleFoods.filter((food) => (
        (category.category_id && String(food.category_id) === String(category.category_id))
        || String(food.category_name || '').trim().toLowerCase() === String(category.category_name || '').trim().toLowerCase()
      ));
      return {
        name: category.category_name || 'Category',
        count: categoryFoods.length,
        image: category.category_image || categoryFoods.map((food) => parseImages(food.food_images)[0]).find(Boolean) || '',
      };
    })
    .filter((category) => category.count > 0)
    .slice(0, 6);

  const recentOrders = [
    ...dateRangeOrders.map((order) => ({
      id: order.order_number,
      customer: order.customer_name || 'Customer',
      items: `${(order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)} items`,
      type: order.order_type === 'home_delivery' ? 'Home Delivery' : 'Take Away',
      amount: Number(order.total_amount || 0),
      status: normalizeStatus(order.order_status),
      time: order.created_at,
      path: `/admin/orders`,
    })),
    ...dateRangeBills.map((bill) => ({
      id: bill.bill_number,
      customer: bill.server_name || `Table ${bill.table_number}`,
      items: `${(ticketGroups.get(bill.bill_id) || []).reduce((sum, ticket) => sum + (ticket.items || []).reduce((count, item) => count + Number(item.quantity || 0), 0), 0)} items`,
      type: 'Dine In',
      amount: Number(bill.grand_total || 0),
      status: completedBillIds.has(bill.bill_id) ? 'Delivered' : normalizeStatus(bill.status),
      time: bill.created_at,
      path: '/admin/billing/history',
    })),
  ].sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)).slice(0, 5);

  const statusData = report.statuses.filter((item) => Number(item.count) > 0).map((item) => ({
    ...item,
    color: STATUS_COLORS[String(item.status).toLowerCase()] || '#8a9690',
  }));
  const orderCountsByBucket = new Map();
  const addOrderCount = (dateValue) => {
    const dateKey = getDateKey(dateValue);
    if (!dateKey) return;
    const bucket = ['year', 'lastYear'].includes(period) ? dateKey.slice(0, 7) : dateKey;
    orderCountsByBucket.set(bucket, (orderCountsByBucket.get(bucket) || 0) + 1);
  };
  snapshot.orders.forEach((order) => addOrderCount(order.created_at || order.order_date));
  snapshot.bills.forEach((bill) => addOrderCount(bill.created_at));
  const rawChartData = period === 'year'
    ? Array.from({ length: 12 }, (_, monthIndex) => {
      const monthDate = new Date(new Date().getFullYear(), monthIndex, 1);
      const monthKey = `${monthDate.getFullYear()}-${String(monthIndex + 1).padStart(2, '0')}`;
      const entry = report.trend.find((item) => String(item.date).slice(0, 7) === monthKey);
      return {
        date: monthKey,
        revenue: Number(entry?.revenue || 0),
        label: formatDate(monthDate, { month: 'short' }),
      };
    })
    : ['week', 'lastWeek'].includes(period)
      ? Array.from({ length: 7 }, (_, dayIndex) => {
        const weekStart = new Date();
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7) - (period === 'lastWeek' ? 7 : 0));
        const date = new Date(weekStart);
        date.setDate(date.getDate() + dayIndex);
        const dateKey = getDateKey(date);
        const entry = report.trend.find((item) => String(item.date).slice(0, 10) === dateKey);
        return {
          date: dateKey,
          revenue: Number(entry?.revenue || 0),
          label: formatDate(date, { weekday: 'short' }),
        };
      })
      : report.trend.map((entry) => ({
      ...entry,
      label: formatDate(entry.date, ['lastYear', 'this-year', 'last-year'].includes(period) ? { month: 'short', year: '2-digit' } : { day: '2-digit', month: 'short' }),
    }));
  const chartData = rawChartData.map((entry) => {
    const bucketLength = ['year', 'lastYear'].includes(period) ? 7 : 10;
    const bucket = String(entry.date).slice(0, bucketLength);
    return { ...entry, orders: orderCountsByBucket.get(bucket) || 0 };
  });
  const quickActions = [
    { label: 'Add Food Item', icon: CookingPot, path: '/admin/products/add', bg: 'hover:border-emerald-400 hover:shadow-emerald-500/10', iconBg: 'bg-emerald-500 text-white shadow-emerald-500/30' },
    { label: 'New Order', icon: ShoppingBag, path: '/admin/billing/new', bg: 'hover:border-blue-400 hover:shadow-blue-500/10', iconBg: 'bg-blue-600 text-white shadow-blue-500/30' },
    { label: 'Manage Menu', icon: UtensilsCrossed, path: '/admin/products', bg: 'hover:border-amber-400 hover:shadow-amber-500/10', iconBg: 'bg-amber-500 text-white shadow-amber-500/30' },
    { label: 'View Reports', icon: TrendingUp, path: '/admin/inventory/reports', bg: 'hover:border-purple-400 hover:shadow-purple-500/10', iconBg: 'bg-purple-600 text-white shadow-purple-500/30' },
    { label: 'Manage Users', icon: Users, path: '/admin/customers', bg: 'hover:border-rose-400 hover:shadow-rose-500/10', iconBg: 'bg-rose-500 text-white shadow-rose-500/30' },
    { label: 'Inventory', icon: Package, path: '/admin/inventory/products', bg: 'hover:border-teal-400 hover:shadow-teal-500/10', iconBg: 'bg-teal-600 text-white shadow-teal-500/30' },
    { label: 'Categories', icon: Layers, path: '/admin/products/categories', bg: 'hover:border-indigo-400 hover:shadow-indigo-500/10', iconBg: 'bg-indigo-600 text-white shadow-indigo-500/30' },
    { label: 'Expenses', icon: Receipt, path: '/admin/expenses', bg: 'hover:border-orange-400 hover:shadow-orange-500/10', iconBg: 'bg-orange-500 text-white shadow-orange-500/30' },
  ];
  const listedPendingKitchenCount = snapshot.kitchenRequests.filter(
    (request) => ['pending', 'approved'].includes(String(request.status || '').trim().toLowerCase())
  ).length;
  const pendingKitchenCount = kitchenRequestsLoaded
    ? listedPendingKitchenCount
    : Number(snapshot.inventory.pendingKitchenRequests || 0);
  const openBillsCount = snapshot.bills.filter((bill) => String(bill.status).toLowerCase() === 'active').length;
  const stats = [
    { title: 'Total Orders', value: reportLoading ? '—' : statusTotal.toLocaleString('en-IN'), hint: 'vs last week', icon: ShoppingBag, tone: 'bg-gradient-to-tr from-orange-500 to-amber-400 text-white shadow-orange-500/25', accentColor: '#f97316', glowColor: '#fb923c', percent: '↑ 12%' },
    { title: 'Total Revenue', value: reportLoading ? '—' : money(report.summary?.totalRevenue), hint: 'vs last week', icon: CircleDollarSign, tone: 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-emerald-500/25', accentColor: '#10b981', glowColor: '#34d399', percent: '↑ 18%' },
    { title: 'Total Customers', value: loading ? '—' : customerCount.toLocaleString('en-IN'), hint: 'vs last week', icon: Users, tone: 'bg-gradient-to-tr from-blue-600 to-cyan-400 text-white shadow-blue-500/25', accentColor: '#3b82f6', glowColor: '#60a5fa', percent: '↑ 10%' },
    { title: 'Total Menu Items', value: loading ? '—' : snapshot.foods.length.toLocaleString('en-IN'), hint: 'vs last week', icon: ChefHat, tone: 'bg-gradient-to-tr from-pink-600 to-rose-400 text-white shadow-pink-500/25', accentColor: '#ec4899', glowColor: '#f472b6', percent: '↑ 5%' },
    { title: 'Pending Orders', value: reportLoading ? '—' : pendingOrderCount.toLocaleString('en-IN'), hint: 'in selected period', icon: Clock3, tone: 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-amber-500/25', accentColor: '#f59e0b', glowColor: '#fbbf24' },
    { title: 'Completed Orders', value: reportLoading ? '—' : completedOrderCount.toLocaleString('en-IN'), hint: 'in selected period', icon: PackageCheck, tone: 'bg-gradient-to-tr from-violet-600 to-purple-400 text-white shadow-purple-500/25', accentColor: '#8b5cf6', glowColor: '#a78bfa' },
    { title: "Today's Revenue", value: loading ? '—' : money(todayRevenue), hint: 'from completed orders', icon: CreditCard, tone: 'bg-gradient-to-tr from-cyan-600 to-sky-400 text-white shadow-cyan-500/25', accentColor: '#06b6d4', glowColor: '#22d3ee' },
    { title: "Today's Orders", value: loading ? '—' : todayOrderCount.toLocaleString('en-IN'), hint: 'across all channels', icon: ShoppingBag, tone: 'bg-gradient-to-tr from-rose-500 to-pink-400 text-white shadow-rose-500/25', accentColor: '#f43f5e', glowColor: '#fb7185' },
  ];
  const rangeUnfinished = period === 'custom' && (!customFrom || !customTo);

  return (
    <main className="min-h-screen space-y-3 pb-8 text-[#17231b] sm:space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="m-0 flex items-baseline gap-3 whitespace-nowrap leading-tight text-slate-800">
            <span className="shrink-0 text-[26px] font-bold sm:text-[18px]">Welcome My Dashboard</span>
          </h1>
          <p className="mt-1 text-[10px] leading-5 text-slate-500 sm:text-[12px]">Here’s what’s happening at your restaurant today.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
        {period === 'custom' && <>
          <input type="date" aria-label="Start date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="h-9 rounded-lg border border-[#dfe7dc] bg-white px-2 text-xs" />
          <input type="date" aria-label="End date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="h-9 rounded-lg border border-[#dfe7dc] bg-white px-2 text-xs" />
        </>}
        </div>
      </section>

      {error && <div role="status" className="border border-[#efd7bd] bg-[#fff8ed] px-4 py-2 text-xs text-[#88602a]">{error}</div>}
      {rangeUnfinished && <div role="status" className="text-xs text-[#88602a]">Select a start and end date to load the custom range.</div>}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ title, value, hint, icon: Icon, tone, accentColor, glowColor, percent }) => <MetricCard key={title} title={title} value={value} hint={hint} icon={Icon} tone={tone} accentColor={accentColor} glowColor={glowColor} percent={percent} />)}
      </section>

      <section aria-label="Menu categories" className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {loading ? [0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />
        )) : categoryTiles.length ? categoryTiles.map((category) => (
          <button
            type="button"
            key={category.name}
            onClick={() => navigate('/admin/products')}
            className="group relative flex flex-col items-center justify-between rounded-2xl border-2 border-slate-200/90 bg-white p-3.5 text-center shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:border-orange-500 hover:shadow-xl"
          >
            {/* High-Contrast Category Image Frame */}
            <div className="relative mb-2.5 h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-orange-500/20 bg-slate-100 p-0.5 shadow-md transition-all duration-300 group-hover:scale-105 group-hover:border-orange-500 group-hover:shadow-orange-500/30">
              <UtensilsCrossed size={22} className="absolute inset-0 m-auto text-slate-300" />
              <img
                src={imageUrl(category.image)}
                alt={category.name}
                className="relative z-10 h-full w-full rounded-xl object-cover"
                onError={(event) => { event.currentTarget.style.display = 'none'; }}
              />
            </div>

            {/* High-Visibility Category Name & Bold Pill Badge */}
            <div className="w-full min-w-0">
              <h4 className="truncate text-xs font-black tracking-tight text-slate-900 group-hover:text-orange-600 transition-colors">
                {category.name}
              </h4>
              <div className="mt-1.5 flex items-center justify-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-bold text-orange-600 border border-orange-200/60 shadow-xs transition-colors group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-500">
                  <span>{category.count}</span>
                  <span className="text-[10px] font-medium opacity-90">{category.count === 1 ? 'item' : 'items'}</span>
                </span>
              </div>
            </div>

            {/* Corner Action Arrow */}
            <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-all duration-300 group-hover:bg-orange-500 group-hover:text-white">
              <ArrowRight size={11} className="rotate-[-45deg]" />
            </div>
          </button>
        )) : (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-xs font-medium text-slate-500">
            No visible food categories found.
          </div>
        )}
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <article className="min-w-0 border border-slate-200/80 bg-white shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] rounded-xl border-slate-200/90 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800 sm:text-base">Order Overview</h2>
            <label className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700">
              <CalendarDays size={13} className="text-slate-500" />
              <span className="sr-only">Order overview date range</span>
              <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Order overview date range" className="max-w-[115px] bg-transparent outline-none">
                {PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <div className="h-[210px] sm:h-[230px]">
            {reportLoading ? <div className="h-full animate-pulse bg-[#eceeed]" /> : chartData.length ? <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#edf0f2" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip formatter={(value) => [Number(value), 'Orders']} />
                <Bar dataKey="orders" name="Orders" fill="#ff7a1a" maxBarSize={24} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer> : <div className="grid h-full place-items-center text-xs text-[#819087]">No order data available for this range.</div>}
          </div>
        </article>

        <article className="min-w-0 border border-slate-200/80 bg-white shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] rounded-xl border-slate-200/90 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800 sm:text-base">Revenue Overview</h2>
            <label className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700">
              <CalendarDays size={13} className="text-slate-500" />
              <span className="sr-only">Revenue overview date range</span>
              <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Revenue overview date range" className="max-w-[115px] bg-transparent outline-none">
                {PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <div className="h-[210px] sm:h-[230px]">
            {reportLoading ? <div className="h-full animate-pulse bg-[#eceeed]" /> : chartData.length ? <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueOverviewGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff6b1a" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ff6b1a" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#edf0f2" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(value) => value >= 1000 ? `${Math.round(value / 1000)}K` : value} />
                <Tooltip formatter={(value) => [money(value), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#ff5a00" strokeWidth={2.5} fill="url(#revenueOverviewGradient)" dot={{ r: 3, fill: '#ff5a00', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer> : <div className="grid h-full place-items-center text-xs text-[#819087]">No revenue data available for this range.</div>}
          </div>
        </article>

        <article className="min-w-0 border border-slate-200/80 bg-white shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] rounded-xl border-slate-200/90 p-4 sm:p-5">
          <div className="mb-1"><h2 className="text-sm font-bold text-slate-800 sm:text-base">Order Status</h2><p className="mt-0.5 text-[11px] text-slate-400">Orders in selected period</p></div>
          <div className="relative h-[230px] sm:h-[250px]">
            {reportLoading ? <div className="h-full animate-pulse bg-[#f1f5f1]" /> : statusData.length ? <>
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={66} outerRadius={95} paddingAngle={2} stroke="none">{statusData.map((entry) => <Cell key={entry.status} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-2xl font-extrabold">{statusTotal}</strong><span className="text-[10px] text-[#7a877e]">Total Orders</span></div>
            </> : <div className="grid h-full place-items-center text-xs text-[#819087]">No order status data.</div>}
          </div>
          <ul className="space-y-2 border-t border-[#eef1ee] pt-3">
            {statusData.slice(0, 5).map((status) => <li key={status.status} className="flex items-center justify-between gap-2 text-[11px]"><span className="flex min-w-0 items-center gap-2 text-[#647268]"><span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />{status.status}</span><strong className="text-[#344238]">{status.count}</strong></li>)}
          </ul>
        </article>

        <article className="min-w-0 border border-slate-200/80 bg-white shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] rounded-xl border-slate-200/90 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-slate-800 sm:text-base">Quick Actions</h2><button type="button" onClick={() => navigate('/admin')} className="text-[10px] font-medium text-[#66756b] hover:text-[#178a36]">View All <ArrowRight size={11} className="ml-1 inline" /></button></div>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(({ label, icon: Icon, path, tone, surface }) => <button type="button" key={label} onClick={() => navigate(path)} className={`flex min-h-[74px] flex-col items-center justify-center gap-2 rounded-md border px-2 py-2 text-center text-white transition hover:shadow-sm ${surface}`}>
              <span className={`grid h-10 w-10 place-items-center rounded-full ${tone}`}><Icon size={20} /></span><span className="text-[10px] font-semibold text-white">{label}</span>
            </button>)}
          </div>
        </article>
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(270px,0.85fr)]">
        <article className="min-w-0 border border-slate-200/80 bg-white shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] rounded-xl border-slate-200/90 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-slate-800 sm:text-base">Recent Orders</h2><button type="button" onClick={() => navigate('/admin/orders')} className="border border-[#e4e9e5] px-2.5 py-1 text-[10px] font-medium text-[#5d6c62] hover:bg-[#f6f8f6]">View All</button></div>
          <div className="overflow-hidden rounded-xl border border-slate-200/80">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[11px]">
              <thead className="bg-[#d4a843] text-xs font-bold uppercase tracking-wide text-white"><tr>{['S No', 'Order ID', 'Customer', 'Items', 'Type', 'Amount', 'Status', 'Time', ''].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-4">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#edf1ed]">
                {loading ? [0, 1, 2, 3].map((row) => <tr key={row}>{[0, 1, 2, 3, 4, 5, 6, 7, 8].map((cell) => <td key={cell} className="px-2.5 py-3"><span className="block h-3 animate-pulse bg-[#f0f3f0]" /></td>)}</tr>) : recentOrders.length ? recentOrders.map((order, index) => {
                  const tone = order.status === 'Delivered' ? 'bg-[#e6f8e9] text-[#259346]' : order.status === 'Cancelled' ? 'bg-[#fff0ee] text-[#db5549]' : order.status === 'Preparing' || order.status === 'Out for Delivery' ? 'bg-[#f1eaff] text-[#7652c6]' : order.status === 'Ready' ? 'bg-[#eaf2ff] text-[#3979d8]' : 'bg-[#fff5df] text-[#d58400]';
                  return <tr key={`${order.id}-${index}`} className="hover:bg-[#fafcfa]"><td className="whitespace-nowrap px-2.5 py-3 font-semibold text-[#4f5f54]">{index + 1}</td><td className="whitespace-nowrap px-2.5 py-3 font-mono text-[#3d4b41]">{order.id || '—'}</td><td className="max-w-36 truncate px-2.5 py-3 text-[#3d4b41]">{order.customer}</td><td className="whitespace-nowrap px-2.5 py-3 text-[#68766d]">{order.items}</td><td className="whitespace-nowrap px-2.5 py-3 text-[#68766d]">{order.type}</td><td className="whitespace-nowrap px-2.5 py-3 font-semibold">{money(order.amount)}</td><td className="px-2.5 py-3"><span className={`whitespace-nowrap px-2 py-1 text-[10px] font-semibold ${tone}`}>{order.status}</span></td><td className="whitespace-nowrap px-2.5 py-3 text-slate-400">{formatDateTime(order.time)}</td><td className="px-2.5 py-3"><button type="button" onClick={() => navigate(order.path)} aria-label={`Open ${order.id}`} className="text-slate-500 hover:text-[#1c7c39]">•••</button></td></tr>;
                }) : <tr><td colSpan="9" className="px-3 py-8 text-center text-xs text-[#819087]">No orders for this period.</td></tr>}
              </tbody>
              </table>
            </div>
          </div>
        </article>

        <article className="min-w-0 border border-slate-200/80 bg-white shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] rounded-xl border-slate-200/90 p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 sm:text-base">Trending Food Items</h2>
            <button type="button" onClick={() => navigate('/admin/products')} className="rounded-md px-2 py-1 text-[11px] font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700">View All</button>
          </div>
          <div>
            {loading ? [0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="flex items-center gap-3 py-2">
                <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-slate-100" />
                <div className="h-14 w-14 shrink-0 animate-pulse rounded-xl bg-slate-100" />
                <div className="min-w-0 flex-1">
                  <div className="h-3 w-32 max-w-full animate-pulse rounded bg-slate-100" />
                  <div className="mt-2 h-2 w-full animate-pulse rounded-full bg-slate-100" />
                </div>
              </div>
            )) : topSellingItems.length ? topSellingItems.map((item, index) => (
              <div key={item.id} className="flex items-center gap-3 py-2">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  index === 0 ? 'bg-amber-100 text-amber-800'
                    : index === 2 ? 'bg-orange-100 text-orange-800'
                      : 'bg-slate-100 text-slate-700'
                }`}>{index + 1}</span>
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-orange-50 shadow-sm ring-1 ring-black/5">
                  <UtensilsCrossed size={20} className="absolute inset-0 m-auto text-orange-300" />
                  {item.image && <img src={imageUrl(item.image)} alt={item.name} className="relative z-10 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-slate-900">{item.name}</p>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-red-600">
                      <Flame size={14} fill="currentColor" /> Trending
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">{item.orders.toLocaleString('en-IN')} orders</p>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400" style={{ width: `${Math.max(8, (item.orders / maxTopItemOrders) * 100)}%` }} />
                  </div>
                </div>
              </div>
            )) : <div className="py-10 text-center text-xs text-[#819087]">No completed item sales in this period.</div>}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: 'Total Foods',
            value: loading ? '—' : snapshot.foods.length.toLocaleString('en-IN'),
            detail: 'Items in menu',
            icon: CookingPot,
            bg: 'bg-white shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] rounded-xl border-slate-200/90 border-slate-200/80 text-[#17231b]',
            path: '/admin/products',
          },
          {
            title: 'Low Stock Items',
            value: loading ? '—' : Number(snapshot.inventory.lowStock || 0).toLocaleString('en-IN'),
            detail: 'Needs restocking',
            icon: AlertTriangle,
            bg: 'bg-white shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] rounded-xl border-slate-200/90 border-slate-200/80 text-[#17231b]',
            path: '/admin/inventory/products',
          },
          {
            title: 'Open Table Bills',
            value: loading ? '—' : openBillsCount.toLocaleString('en-IN'),
            detail: 'Awaiting settlement',
            icon: Table2,
            bg: 'bg-white shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] rounded-xl border-slate-200/90 border-slate-200/80 text-[#17231b]',
            path: '/admin/billing/history',
          },
          {
            title: 'Kitchen Requests',
            value: loading ? '—' : pendingKitchenCount.toLocaleString('en-IN'),
            detail: 'Pending or approved',
            icon: ChefHat,
            bg: 'bg-white shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] rounded-xl border-slate-200/90 border-slate-200/80 text-[#17231b]',
            path: '/admin/inventory/kitchen-requests',
          },
        ].map(({ title, value, detail, icon: Icon, bg, path }, index) => (
          <button
            type="button"
            key={title}
            onClick={() => navigate(path)}
            className={`relative min-w-0 overflow-hidden rounded-xl border p-4 sm:p-5 shadow-[0_2px_10px_rgba(20,56,34,0.08)] flex flex-col justify-between min-h-[140px] ${bg} text-left transition hover:scale-[1.01] active:scale-[0.99]`}
          >
            <div className="flex items-start gap-3 relative z-10">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm ${title === 'Low Stock Items' ? 'bg-[#fff4df] text-[#d99000]' : 'bg-[#fff4e8] text-[#f36b2b]'}`}>
                <Icon size={24} strokeWidth={2.2} />
              </div>
              <div className="flex-1 mt-0.5 min-w-0">
                <h3 className="text-[12px] font-semibold opacity-90 mb-1 truncate">{title}</h3>
                <div className="text-[26px] font-extrabold leading-none tracking-tight">{value}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-5 relative z-10">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#e8f7ed] px-1.5 py-0.5 text-[11px] font-bold text-[#168745]">
                Live
              </span>
              <span className="text-[11px] font-medium text-slate-500 truncate">{detail}</span>
            </div>

            <div className="absolute right-0 bottom-0 w-24 h-16 pointer-events-none opacity-30">
              <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                  <linearGradient id={`dash-bottom-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff7a1a" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#dash-bottom-grad-${index})`} />
                <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ff7a1a" strokeWidth="2.5" />
              </svg>
            </div>
          </button>
        ))}
      </section>
    </main>
  );
};

export default AdminDashboardOverview;
