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
    <article className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black tracking-tight text-slate-800">Quick Actions</h2>
              <p className="text-xs text-slate-400">Essential navigation shortcuts</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-orange-50 hover:text-orange-600"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {quickActions.map(({ label, icon: Icon, path, bg, iconBg }) => (
              <button
                type="button"
                key={label}
                onClick={() => navigate(path)}
                className={`group relative flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white p-3 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${bg}`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-110 ${iconBg}`}>
                  <Icon size={19} strokeWidth={2.3} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-800 group-hover:text-slate-900">
                    {label}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 group-hover:text-orange-500 flex items-center gap-0.5">
                    Open <ArrowRight size={9} />
                  </span>
                </div>
              </button>
            ))}
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
