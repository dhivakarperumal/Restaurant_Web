import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, Bike, CalendarDays,
  Check, ChefHat, CircleDollarSign, Clock3, CreditCard, CookingPot, Package,
  PackageCheck, Search, ShoppingBag, ShoppingCart, Sparkles, Table2,
  TrendingUp, Users, UtensilsCrossed,
  XCircle,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import api, { BACKEND_BASE_URL } from '../api';
import { useAuth } from '../PrivateRouter/AuthContext';

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
const HERO_IMAGE = '/images/registre.png';
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

function MetricCard({ title, value, icon: Icon, tone, hint, surface, waveColor, percent }) {
  return (
    <article className={`relative min-w-0 overflow-hidden rounded-xl border p-4 sm:p-5 shadow-[0_2px_10px_rgba(20,56,34,0.04)] flex flex-col justify-between min-h-[140px] ${surface}`}>
      <div className="flex items-start gap-3 relative z-10">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm ${tone}`}>
          <Icon size={24} strokeWidth={2.2} />
        </div>
        <div className="flex-1 mt-0.5 min-w-0">
          <h3 className="text-[12px] font-semibold opacity-90 mb-1 truncate">{title}</h3>
          <div className="text-[22px] sm:text-[25px] font-extrabold leading-none tracking-tight truncate">{value}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-5 relative z-10">
        {percent && (
          <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold bg-white/25">
            {percent}
          </span>
        )}
        <span className="text-[11px] font-medium opacity-75 truncate">{hint}</span>
      </div>

      <div className="absolute right-0 bottom-0 w-24 h-16 pointer-events-none opacity-50">
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={waveColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={waveColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#grad-${title.replace(/\s+/g, '')})`} />
          <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke={waveColor} strokeWidth="2.5" />
        </svg>
      </div>
    </article>
  );
}

const AdminDashboardOverview = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [period, setPeriod] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [includeOrders, setIncludeOrders] = useState(true);
  const [snapshot, setSnapshot] = useState({ orders: [], bills: [], kitchenOrders: [], users: [], foods: [], categories: [], inventory: {}, kitchenRequests: [] });
  const [report, setReport] = useState({ summary: null, trend: [], statuses: [] });
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(true);
  const [error, setError] = useState('');

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
      const failures = results.filter((result) => result.status === 'rejected');
      setError(failures.length ? 'Some dashboard sections are temporarily unavailable.' : '');
      setLoading(false);
    });
    return () => controller.abort();
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
      api.get('/revenue/trend', { params: { ...params, trend: ['year', 'lastYear', 'this-year', 'last-year'].includes(period) ? 'year' : 'month' }, signal: controller.signal }),
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
  const dateRangeCustomers = snapshot.users.filter((user) => customerRole(user.role) && inRange(user.created_at, period, customFrom, customTo));
  const activeDeliveryCount = dateRangeOrders.filter((order) => order.fulfillment_type === 'delivery' && !terminalOrder(order.order_status)).length;
  const customerCount = snapshot.users.filter((user) => customerRole(user.role)).length;
  const statusTotal = report.statuses.reduce((sum, item) => sum + Number(item.count || 0), 0);

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
  const addTopItem = (item, quantity, lineRevenue) => {
    const id = String(item.food_id || item.product_name || item.food_name || 'item');
    const food = foodById.get(id);
    const name = item.food_name || item.product_name || food?.food_name || 'Menu item';
    const entry = topItems.get(id) || { id, name, quantity: 0, revenue: 0, image: item.product_image || parseImages(food?.food_images)[0] || '' };
    entry.quantity += Number(quantity || 0);
    entry.revenue += Number(lineRevenue || 0);
    topItems.set(id, entry);
  };
  dateRangeOrders.filter((order) => String(order.order_status).toLowerCase() === 'delivered').forEach((order) => {
    (order.items || []).forEach((item) => addTopItem(item, item.quantity, item.total_price));
  });
  dateRangeBills.filter((bill) => completedBillIds.has(bill.bill_id)).forEach((bill) => {
    (ticketGroups.get(bill.bill_id) || []).forEach((ticket) => (ticket.items || []).forEach((item) => {
      addTopItem(item, item.quantity, Number(item.quantity) * Number(item.unit_price));
    }));
  });
  const topSellingItems = [...topItems.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
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
      type: order.fulfillment_type === 'delivery' ? 'Delivery' : 'Take Away',
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
  const chartData = report.trend.map((entry) => ({
    ...entry,
    label: formatDate(entry.date, ['year', 'lastYear', 'this-year', 'last-year'].includes(period) ? { month: 'short', year: '2-digit' } : { day: '2-digit', month: 'short' }),
  }));
  const name = userProfile?.displayName?.split(' ')[0] || 'Admin';
  const periodLabel = PERIODS.find(([key]) => (PERIOD_API[key] || key) === apiRange)?.[1] || 'Today';
  const quickActions = [
    { label: 'Add Food Item', icon: CookingPot, path: '/admin/products/add', tone: 'bg-[#eaf7ed] text-[#23944a]' },
    { label: 'New Order', icon: ShoppingBag, path: '/admin/billing/new', tone: 'bg-[#eaf2ff] text-[#2475dc]' },
    { label: 'Manage Menu', icon: UtensilsCrossed, path: '/admin/products', tone: 'bg-[#fff3df] text-[#e99a00]' },
    { label: 'View Reports', icon: TrendingUp, path: '/admin/inventory/reports', tone: 'bg-[#f0eaff] text-[#8051d8]' },
    { label: 'Manage Users', icon: Users, path: '/admin/customers', tone: 'bg-[#fff0ed] text-[#e55243]' },
    { label: 'Inventory', icon: Package, path: '/admin/inventory/products', tone: 'bg-[#e6f6f4] text-[#14978a]' },
  ];
  const dateLabel = period === 'custom' && customFrom && customTo
    ? `${formatDate(customFrom, { day: '2-digit', month: 'short', year: 'numeric' })} - ${formatDate(customTo, { day: '2-digit', month: 'short', year: 'numeric' })}`
    : `${periodLabel} (${formatDate(new Date(), { day: '2-digit', month: 'short', year: 'numeric' })})`;
  const todayOrderCount = snapshot.orders.filter((order) => getDateKey(order.created_at) === getDateKey(new Date())).length
    + snapshot.bills.filter((bill) => getDateKey(bill.created_at) === getDateKey(new Date())).length;
  const pendingKitchenCount = snapshot.kitchenRequests.filter((request) => ['pending', 'approved'].includes(String(request.status).toLowerCase())).length;
  const openBillsCount = snapshot.bills.filter((bill) => String(bill.status).toLowerCase() === 'active').length;
  const pendingOrderCount = report.statuses.reduce((count, item) => count + (['pending', 'placed', 'preparing', 'ready'].includes(String(item.status).toLowerCase()) ? Number(item.count || 0) : 0), 0);
  const completedOrderCount = report.statuses.reduce((count, item) => count + (['delivered', 'served', 'completed'].includes(String(item.status).toLowerCase()) ? Number(item.count || 0) : 0), 0);
  const todayRevenue = snapshot.orders.filter((order) => getDateKey(order.created_at) === getDateKey(new Date()) && ['delivered', 'completed', 'served'].includes(String(order.order_status).toLowerCase())).reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
    + snapshot.bills.filter((bill) => getDateKey(bill.created_at) === getDateKey(new Date()) && String(bill.status).toLowerCase() === 'paid').reduce((sum, bill) => sum + Number(bill.grand_total || 0), 0);
  const estimatedProfit = todayRevenue * 0.35; // Placeholder estimate

  const stats = [
    { title: 'Total Revenue', value: reportLoading ? '—' : money(report.summary?.totalRevenue), hint: 'in selected period', icon: CircleDollarSign, tone: 'bg-white/20 text-white', surface: 'bg-[#22c55e] border-transparent text-white', waveColor: '#ffffff', percent: '↑ 18%' },
    { title: 'Total Orders', value: reportLoading ? '—' : statusTotal.toLocaleString('en-IN'), hint: 'in selected period', icon: ShoppingBag, tone: 'bg-white/20 text-white', surface: 'bg-[#3b82f6] border-transparent text-white', waveColor: '#ffffff', percent: '↑ 12%' },
    { title: 'Pending Orders', value: reportLoading ? '—' : pendingOrderCount.toLocaleString('en-IN'), hint: 'active right now', icon: Clock3, tone: 'bg-white/20 text-white', surface: 'bg-[#f59e0b] border-transparent text-white', waveColor: '#ffffff', percent: '—' },
    { title: 'Completed Orders', value: reportLoading ? '—' : completedOrderCount.toLocaleString('en-IN'), hint: 'in selected period', icon: PackageCheck, tone: 'bg-white/20 text-white', surface: 'bg-[#8b5cf6] border-transparent text-white', waveColor: '#ffffff', percent: '↑ 20%' },
    { title: 'Today’s Revenue', value: loading ? '—' : money(todayRevenue), hint: 'from all channels today', icon: CreditCard, tone: 'bg-white/20 text-white', surface: 'bg-[#06b6d4] border-transparent text-white', waveColor: '#ffffff', percent: '↑ 5%' },
    { title: 'Today’s Orders', value: loading ? '—' : todayOrderCount.toLocaleString('en-IN'), hint: 'from all channels today', icon: Sparkles, tone: 'bg-white/20 text-white', surface: 'bg-[#ec4899] border-transparent text-white', waveColor: '#ffffff', percent: '↑ 8%' },
    { title: 'Total Customers', value: loading ? '—' : customerCount.toLocaleString('en-IN'), hint: 'all registered users', icon: Users, tone: 'bg-white/20 text-white', surface: 'bg-[#14b8a6] border-transparent text-white', waveColor: '#ffffff', percent: '↑ 3%' },
    { title: 'Today’s Profit', value: loading ? '—' : money(estimatedProfit), hint: 'estimated for today', icon: TrendingUp, tone: 'bg-white/20 text-white', surface: 'bg-[#f43f5e] border-transparent text-white', waveColor: '#ffffff', percent: '↑ 15%' },
  ];
  const rangeUnfinished = period === 'custom' && (!customFrom || !customTo);

  return (
    <main className="min-h-screen space-y-3 pb-8 text-[#17231b] sm:space-y-4">
      <section className="relative isolate flex min-h-[152px] items-center overflow-hidden rounded-2xl border border-[#24483b] bg-[#10271f] px-3 shadow-sm sm:min-h-[142px] sm:px-8">
        <img src={HERO_IMAGE} alt="Restaurant food spread" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#071c18]/75 via-[#10271f]/50 to-[#10271f]/5" />
        <div className="relative z-20 w-[62%] pt-12 pb-4 sm:w-[58%] sm:py-9">
          <p className="text-xl font-extrabold leading-tight text-white sm:text-2xl">Welcome Back, <span className="text-[#f4c45e]">{name}!</span></p>
          <p className="mt-1 text-xs text-white/85 sm:text-sm">Manage your restaurant, orders, and grow your business.</p>
          <p className="mt-2 text-xs font-semibold italic text-[#f4d991]">“Good Food Brings Great People Together”</p>
        </div>
        <div className="absolute right-3 top-3 z-30 flex flex-wrap justify-end gap-2 sm:right-4 sm:top-4">
          <label className="flex h-9 items-center gap-2 rounded-xl border border-[#e4e9e3] bg-white/95 px-2.5 text-xs shadow-sm sm:px-3">
            <CalendarDays size={15} className="text-[#536259]" />
            <span className="sr-only">Dashboard date range</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Dashboard date range" className="max-w-[125px] bg-transparent font-semibold text-[#354239] outline-none sm:max-w-[165px]">
              {PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        {period === 'custom' && <div className="absolute bottom-3 right-4 z-20 flex gap-2">
          <input type="date" aria-label="Start date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="h-8 border border-[#dfe7dc] bg-white px-2 text-xs" />
          <input type="date" aria-label="End date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="h-8 border border-[#dfe7dc] bg-white px-2 text-xs" />
        </div>}
      </section>

      {error && <div role="status" className="border border-[#efd7bd] bg-[#fff8ed] px-4 py-2 text-xs text-[#88602a]">{error}</div>}
      {rangeUnfinished && <div role="status" className="text-xs text-[#88602a]">Select a start and end date to load the custom range.</div>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ title, value, hint, icon: Icon, tone, surface, waveColor, percent }) => <MetricCard key={title} title={title} value={value} hint={hint} icon={Icon} tone={tone} surface={surface} waveColor={waveColor} percent={percent} />)}
      </section>

      <section aria-label="Menu categories" className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {loading ? [0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-[76px] animate-pulse border border-[#e5ece6] bg-white" />) : categoryTiles.length ? categoryTiles.map((category, index) => (
          <button type="button" key={category.name} onClick={() => navigate('/admin/products')} className={`flex min-w-0 items-center gap-2.5 border p-2 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${['bg-[#f0fbf1] border-[#e0f1df]', 'bg-[#fff8eb] border-[#f2eadb]', 'bg-[#edf7ff] border-[#dceaf5]', 'bg-[#fff2f0] border-[#f3e2df]', 'bg-[#effbf8] border-[#d8eee8]', 'bg-[#f5f1ff] border-[#e6ddf8]'][index % 6]}`}>
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/80"><UtensilsCrossed size={18} className="absolute inset-0 m-auto text-[#66816b]" /><img src={imageUrl(category.image)} alt="" className="relative z-10 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-bold text-[#304538]">{category.name}</span><span className="mt-1 block text-[9px] text-[#77847b]">{category.count} {category.count === 1 ? 'item' : 'items'}</span></span><ArrowRight size={13} className="shrink-0 rotate-[-45deg] text-[#718078]" />
          </button>
        )) : <div className="col-span-full border border-dashed border-[#dfe8e0] bg-white px-4 py-5 text-center text-xs text-[#7e8b82]">No visible food categories found.</div>}
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.95fr)_minmax(260px,0.85fr)]">
        <article className="min-w-0 border border-[#e6ebe7] bg-white p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-sm font-bold text-[#1c2c22] sm:text-base">Sales &amp; Orders Overview</h2><p className="mt-0.5 text-[11px] text-[#7d8981]">Delivered revenue · {dateLabel}</p></div>
            <div className="flex gap-1.5 text-[10px]">
              <span className="inline-flex items-center gap-1.5 border border-[#e5ebe6] px-2 py-1 text-[#506056]"><span className="h-2 w-2 rounded-full bg-[#20a342]" />Revenue (₹)</span>
              <button type="button" aria-pressed={includeOrders} onClick={() => setIncludeOrders((value) => !value)} className={`inline-flex items-center gap-1.5 border px-2 py-1 ${includeOrders ? 'border-[#d9eadc] bg-[#f3faf4] text-[#506056]' : 'border-[#e5ebe6] text-[#879189]'}`}><span className={`h-2 w-2 rounded-full ${includeOrders ? 'bg-[#b8edc2]' : 'bg-[#cdd4cf]'}`} />Orders</button>
            </div>
          </div>
          <div className="h-[230px] sm:h-[250px]">
            {reportLoading ? <div className="h-full animate-pulse bg-[#f1f5f1]" /> : chartData.length ? <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 6, left: -17, bottom: 0 }}>
                <defs><linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22a341" stopOpacity={0.2} /><stop offset="100%" stopColor="#22a341" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="#edf1ed" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#647268' }} />
                <YAxis yAxisId="revenue" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#6c786f' }} tickFormatter={(value) => value >= 1000 ? `${Math.round(value / 1000)}k` : value} />
                {includeOrders && <YAxis yAxisId="orders" orientation="right" hide domain={[0, 'dataMax + 4']} />}
                <Tooltip formatter={(value, name) => [name === 'Revenue' ? money(value) : Number(value), name]} labelFormatter={(label) => label} />
                <Area yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue" stroke="#20a342" strokeWidth={2.5} fill="url(#salesArea)" activeDot={{ r: 4 }} />
                {includeOrders && <Line yAxisId="orders" type="monotone" dataKey="orders" name="Orders" stroke="#83dfa0" strokeWidth={2} dot={{ r: 2.5, fill: '#83dfa0' }} activeDot={{ r: 4 }} />}
              </LineChart>
            </ResponsiveContainer> : <div className="grid h-full place-items-center text-xs text-[#819087]">No delivered revenue recorded in this range.</div>}
          </div>
        </article>

        <article className="min-w-0 border border-[#e6ebe7] bg-white p-4 sm:p-5">
          <div className="mb-1"><h2 className="text-sm font-bold text-[#1c2c22] sm:text-base">Order Status</h2><p className="mt-0.5 text-[11px] text-[#7d8981]">Orders in selected period</p></div>
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

        <article className="min-w-0 border border-[#e6ebe7] bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-[#1c2c22] sm:text-base">Quick Actions</h2><button type="button" onClick={() => navigate('/admin')} className="text-[10px] font-medium text-[#66756b] hover:text-[#178a36]">View All <ArrowRight size={11} className="ml-1 inline" /></button></div>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map(({ label, icon: Icon, path, tone }) => <button type="button" key={label} onClick={() => navigate(path)} className="flex min-h-[74px] flex-col items-center justify-center gap-2 rounded-full border border-[#d7e5f7] bg-[#eaf2ff] px-2 py-2 text-center transition hover:border-[#bfd5f3] hover:bg-[#dbeaff] hover:shadow-sm">
              <span className={`grid h-10 w-10 place-items-center ${tone}`}><Icon size={20} /></span><span className="text-[10px] font-semibold text-[#45544a]">{label}</span>
            </button>)}
          </div>
        </article>
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(270px,0.85fr)]">
        <article className="min-w-0 border border-[#e6ebe7] bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-[#1c2c22] sm:text-base">Recent Orders</h2><button type="button" onClick={() => navigate('/admin/orders')} className="border border-[#e4e9e5] px-2.5 py-1 text-[10px] font-medium text-[#5d6c62] hover:bg-[#f6f8f6]">View All</button></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[11px]">
              <thead className="bg-[#f4f7f5] text-[#637067]"><tr>{['#', 'Customer', 'Items', 'Type', 'Amount', 'Status', 'Time', ''].map((heading) => <th key={heading} className="whitespace-nowrap px-2.5 py-2 font-semibold">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-[#edf1ed]">
                {loading ? [0, 1, 2, 3].map((row) => <tr key={row}>{[0, 1, 2, 3, 4, 5, 6, 7].map((cell) => <td key={cell} className="px-2.5 py-3"><span className="block h-3 animate-pulse bg-[#f0f3f0]" /></td>)}</tr>) : recentOrders.length ? recentOrders.map((order, index) => {
                  const tone = order.status === 'Delivered' ? 'bg-[#e6f8e9] text-[#259346]' : order.status === 'Cancelled' ? 'bg-[#fff0ee] text-[#db5549]' : order.status === 'Preparing' || order.status === 'Out for Delivery' ? 'bg-[#f1eaff] text-[#7652c6]' : order.status === 'Ready' ? 'bg-[#eaf2ff] text-[#3979d8]' : 'bg-[#fff5df] text-[#d58400]';
                  return <tr key={`${order.id}-${index}`} className="hover:bg-[#fafcfa]"><td className="whitespace-nowrap px-2.5 py-3 font-semibold text-[#4f5f54]">{order.id || `#${index + 1}`}</td><td className="max-w-36 truncate px-2.5 py-3 text-[#3d4b41]">{order.customer}</td><td className="whitespace-nowrap px-2.5 py-3 text-[#68766d]">{order.items}</td><td className="whitespace-nowrap px-2.5 py-3 text-[#68766d]">{order.type}</td><td className="whitespace-nowrap px-2.5 py-3 font-semibold">{money(order.amount)}</td><td className="px-2.5 py-3"><span className={`whitespace-nowrap px-2 py-1 text-[10px] font-semibold ${tone}`}>{order.status}</span></td><td className="whitespace-nowrap px-2.5 py-3 text-[#7d8981]">{formatDateTime(order.time)}</td><td className="px-2.5 py-3"><button type="button" onClick={() => navigate(order.path)} aria-label={`Open ${order.id}`} className="text-[#718078] hover:text-[#1c7c39]">•••</button></td></tr>;
                }) : <tr><td colSpan="8" className="px-3 py-8 text-center text-xs text-[#819087]">No orders for this period.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article className="min-w-0 border border-[#e6ebe7] bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-[#1c2c22] sm:text-base">Top Selling Items</h2><button type="button" onClick={() => navigate('/admin/products')} className="border border-[#e4e9e5] px-2.5 py-1 text-[10px] font-medium text-[#5d6c62] hover:bg-[#f6f8f6]">View All</button></div>
          <div className="divide-y divide-[#edf1ed]">
            {loading ? [0, 1, 2, 3].map((row) => <div key={row} className="flex items-center gap-3 py-2.5"><div className="h-10 w-10 animate-pulse bg-[#f0f3f0]" /><div className="flex-1"><div className="h-3 w-28 animate-pulse bg-[#f0f3f0]" /><div className="mt-2 h-2 w-16 animate-pulse bg-[#f0f3f0]" /></div></div>) : topSellingItems.length ? topSellingItems.map((item, index) => <div key={item.id} className="flex items-center gap-2.5 py-2.5 first:pt-0 last:pb-0">
              <span className={`grid h-5 w-5 shrink-0 place-items-center text-[10px] font-bold ${index === 0 ? 'rounded-full bg-[#f4a900] text-white' : 'rounded-full bg-[#f0f2f0] text-[#738077]'}`}>{index + 1}</span>
              <div className="h-10 w-10 shrink-0 overflow-hidden bg-[#f1f4f0]"><img src={imageUrl(item.image)} alt="" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} /></div>
              <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-[#344238]">{item.name}</p><p className="mt-0.5 text-[10px] text-[#818d84]">{item.quantity} sold</p></div>
              <div className="text-right"><p className="whitespace-nowrap text-[11px] font-bold text-[#258742]">{money(item.revenue)}</p><p className="mt-0.5 text-[9px] text-[#55a467]">Completed</p></div>
            </div>) : <div className="py-10 text-center text-xs text-[#819087]">No completed item sales in this period.</div>}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { title: 'Total Customers', value: loading ? '—' : customerCount.toLocaleString('en-IN'), detail: 'Registered customers', icon: Users, tone: 'bg-[#eaf7ed] text-[#269448]', path: '/admin/customers' },
          { title: 'Low Stock Items', value: loading ? '—' : Number(snapshot.inventory.lowStock || 0).toLocaleString('en-IN'), detail: 'Needs restocking', icon: AlertTriangle, tone: 'bg-[#fff0ed] text-[#e95045]', path: '/admin/inventory/products' },
          { title: 'Open Table Bills', value: loading ? '—' : openBillsCount.toLocaleString('en-IN'), detail: 'Awaiting settlement', icon: Table2, tone: 'bg-[#eaf2ff] text-[#2675d5]', path: '/admin/billing/history' },
          { title: 'Kitchen Requests', value: loading ? '—' : pendingKitchenCount.toLocaleString('en-IN'), detail: 'Pending or approved', icon: ChefHat, tone: 'bg-[#fff5df] text-[#e99b00]', path: '/admin/inventory/kitchen-requests' },
        ].map(({ title, value, detail, icon: Icon, tone, path }) => <button type="button" key={title} onClick={() => navigate(path)} className="flex min-w-0 items-center gap-3 border border-[#e5ece6] bg-white p-4 text-left shadow-[0_2px_10px_rgba(20,56,34,0.04)] transition hover:border-[#cbd9ce]">
          <span className={`grid h-11 w-11 shrink-0 place-items-center ${tone}`}><Icon size={20} /></span><span className="min-w-0"><span className="block text-[11px] font-medium text-[#657269]">{title}</span><strong className="mt-0.5 block text-lg leading-tight text-[#1e2c22]">{value}</strong><span className="mt-1 block truncate text-[10px] text-[#89948c]">{detail}</span></span>
        </button>)}
      </section>
    </main>
  );
};

export default AdminDashboardOverview;
