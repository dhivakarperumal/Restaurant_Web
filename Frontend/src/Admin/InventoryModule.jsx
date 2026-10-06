import { createContext, useContext, useEffect, useState } from 'react';
import { Route, Routes, NavLink, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRightLeft, BarChart3, Boxes, CalendarClock, CircleDollarSign, ClipboardList, Eye, Filter, Gauge, LayoutGrid, MapPinned, NotebookPen, Package, PackagePlus, Pencil, Plus, PlusCircle, Search, ShoppingCart, Table2, Tag, Tags, Trash2, TrendingDown, TrendingUp, Truck, UtensilsCrossed, Warehouse, Wrench } from 'lucide-react';
import api from '../api';
import toast, { Toaster } from 'react-hot-toast';

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value || 0));

const EMPTY_DASHBOARD = {
  totalProducts: 0,
  totalStockQuantity: 0,
  totalStockValue: 0,
  lowStock: 0,
  outOfStock: 0,
  expiringSoon: 0,
  todaysPurchase: 0,
  todaysStockUsage: 0,
  todaysWastage: 0,
  pendingKitchenRequests: 0,
};

const INVENTORY_NAV = [
  { path: '/admin/inventory', label: 'Dashboard', icon: Gauge },
  { path: '/admin/inventory/products', label: 'Groceries', icon: Package },
  { path: '/admin/inventory/suppliers', label: 'Suppliers', icon: Truck },
  { path: '/admin/inventory/purchases', label: 'Purchases', icon: ShoppingCart },
  { path: '/admin/inventory/stock-in', label: 'Stock In', icon: PackagePlus },
  { path: '/admin/inventory/stock-out', label: 'Stock Out', icon: TrendingDown },
  { path: '/admin/inventory/transfers', label: 'Stock Transfer', icon: ArrowRightLeft },
  { path: '/admin/inventory/adjustments', label: 'Stock Adjustment', icon: Wrench },
  { path: '/admin/inventory/kitchen-requests', label: 'Kitchen Requests', icon: UtensilsCrossed },
  { path: '/admin/inventory/recipes', label: 'Recipes', icon: NotebookPen },
  { path: '/admin/inventory/wastage', label: 'Wastage', icon: Trash2 },
  { path: '/admin/inventory/expiry', label: 'Expiry', icon: CalendarClock },
  { path: '/admin/inventory/low-stock', label: 'Low Stock', icon: AlertTriangle },
  { path: '/admin/inventory/locations', label: 'Locations', icon: MapPinned },
  { path: '/admin/inventory/reports', label: 'Reports', icon: BarChart3 },
];

function PageCard({ title, value, icon: Icon, accent, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
          <p className="mt-4 text-2xl font-bold text-slate-900">{value}</p>
          {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function InventoryHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Inventory Management</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

function InventoryTable({ columns, rows, emptyText = 'No records found.' }) {
  if (!rows || !rows.length) {
    return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">{emptyText}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="whitespace-nowrap px-3 py-3 font-semibold">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || `${row.name || 'row'}-${index}`} className="border-t border-slate-200 align-top">
              {columns.map((column) => (
                <td key={`${row.id || index}-${column.key}`} className="px-3 py-3 text-slate-700">
                  {typeof column.render === 'function' ? column.render(row) : (row[column.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ value = 'Active' }) {
  const colors = {
    Active: 'bg-emerald-100 text-emerald-700',
    Inactive: 'bg-slate-200 text-slate-700',
    Pending: 'bg-amber-100 text-amber-700',
    Approved: 'bg-sky-100 text-sky-700',
    Rejected: 'bg-rose-100 text-rose-700',
    Issued: 'bg-violet-100 text-violet-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Expired: 'bg-rose-100 text-rose-700',
    'Expiring Soon': 'bg-amber-100 text-amber-700',
    'Low Stock': 'bg-orange-100 text-orange-700',
    'Out of Stock': 'bg-red-100 text-red-700',
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors[value] || 'bg-slate-100 text-slate-700'}`}>{value}</span>;
}

function InventoryCrudPage({ title, subtitle, children, actions }) {
  return (
    <div>
      <InventoryHeader title={title} subtitle={subtitle} actions={actions} />
      {children}
    </div>
  );
}

function FormField({ label, children, required = false }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function GenericListPage({ title, subtitle, items, onAdd, columns, emptyText, actionsFormat }) {
  return (
    <InventoryCrudPage title={title} subtitle={subtitle} actions={onAdd ? <button className="rounded-xl bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white" onClick={onAdd}><PlusCircle size={15} className="mr-2 inline" />Add</button> : null}>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 text-sm text-slate-700 outline-none focus:border-[#1a3c36]" placeholder="Search records" />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Filter size={14} />
            <span>All Records</span>
          </div>
        </div>
        <InventoryTable columns={columns} rows={items} emptyText={emptyText || 'No entries found.'} />
      </div>
    </InventoryCrudPage>
  );
}

function InventoryDashboard() {
  const navigate = useNavigate();
  const { dashboard, lowStockList, expiryList, stockHistory, recentPurchases } = useInventoryContext();

  const cards = [
    { title: 'Total Products', value: formatNumber(dashboard.totalProducts), icon: Package, accent: 'bg-sky-100 text-sky-700', hint: 'All active inventory items' },
    { title: 'Total Stock Quantity', value: formatNumber(dashboard.totalStockQuantity), icon: Warehouse, accent: 'bg-violet-100 text-violet-700', hint: 'Currently available units' },
    { title: 'Total Stock Value', value: formatCurrency(dashboard.totalStockValue), icon: CircleDollarSign, accent: 'bg-emerald-100 text-emerald-700', hint: 'Based on purchase price' },
    { title: 'Low Stock', value: formatNumber(dashboard.lowStock), icon: AlertTriangle, accent: 'bg-amber-100 text-amber-700', hint: 'Below reorder threshold' },
    { title: 'Out of Stock', value: formatNumber(dashboard.outOfStock), icon: TrendingDown, accent: 'bg-red-100 text-red-700', hint: 'No units left' },
    { title: 'Expiring Soon', value: formatNumber(dashboard.expiringSoon), icon: CalendarClock, accent: 'bg-pink-100 text-pink-700', hint: 'Within 7 days' },
    { title: "Today's Purchase", value: formatCurrency(dashboard.todaysPurchase), icon: ShoppingCart, accent: 'bg-indigo-100 text-indigo-700', hint: 'Purchase value' },
    { title: "Today's Stock Usage", value: formatNumber(dashboard.todaysStockUsage), icon: TrendingUp, accent: 'bg-orange-100 text-orange-700', hint: 'Usage recorded today' },
    { title: "Today's Wastage", value: formatCurrency(dashboard.todaysWastage), icon: Trash2, accent: 'bg-rose-100 text-rose-700', hint: 'Estimated loss' },
    { title: 'Pending Kitchen Requests', value: formatNumber(dashboard.pendingKitchenRequests), icon: UtensilsCrossed, accent: 'bg-cyan-100 text-cyan-700', hint: 'Awaiting review' },
  ];

  const chartBars = [45, 60, 78, 52, 90, 72, 88];

  return (
    <div>
      <InventoryHeader title="Inventory Dashboard" subtitle="Real-time stock performance, movement events and operational alerts." actions={
        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white" onClick={() => navigate('/admin/inventory/products')}><Plus size={15} className="mr-2 inline" />Add Product</button>
          <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => navigate('/admin/inventory/stock-in')}>Stock In</button>
          <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => navigate('/admin/inventory/stock-out')}>Stock Out</button>
          <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => navigate('/admin/inventory/purchases')}>New Purchase</button>
        </div>
      } />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <PageCard key={card.title} {...card} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Purchase vs Usage</h2>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Monthly</span>
          </div>
          <div className="flex h-48 items-end gap-2">
            {chartBars.map((value, idx) => (
              <div key={idx} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-xl bg-gradient-to-t from-[#1a3c36] to-[#70c1a6]" style={{ height: `${value}%` }} />
                <span className="text-[10px] text-slate-500">M{idx + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Stock Value</h2>
          <div className="mt-5 space-y-4">
            {[
              { label: 'Current Stock Value', value: formatCurrency(dashboard.totalStockValue) },
              { label: 'Low Stock Items', value: formatNumber(dashboard.lowStock) },
              { label: 'Pending Kitchen Requests', value: formatNumber(dashboard.pendingKitchenRequests) },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3">
                <span className="text-sm text-slate-600">{item.label}</span>
                <span className="text-sm font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Low Stock Products</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr><th className="px-3 py-2">Product</th><th className="px-3 py-2">Stock</th><th className="px-3 py-2">Status</th></tr>
              </thead>
              <tbody>
                {(lowStockList || []).slice(0, 5).map((item) => (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{item.product_name}</td>
                    <td className="px-3 py-2">{item.current_stock}</td>
                    <td className="px-3 py-2"><StatusBadge value={item.current_stock === 0 ? 'Out of Stock' : 'Low Stock'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Expiring Products</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr><th className="px-3 py-2">Product</th><th className="px-3 py-2">Expiry</th><th className="px-3 py-2">Status</th></tr>
              </thead>
              <tbody>
                {(expiryList || []).slice(0, 5).map((item) => (
                  <tr key={item.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">{item.product_name}</td>
                    <td className="px-3 py-2">{item.expiry_date || '-'}</td>
                    <td className="px-3 py-2"><StatusBadge value={item.days_remaining <= 0 ? 'Expired' : item.days_remaining <= 7 ? 'Expiring Soon' : 'Good'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Recent Stock Transactions</h2>
          <InventoryTable columns={[
            { key: 'product_id', label: 'Product' },
            { key: 'transaction_type', label: 'Type' },
            { key: 'quantity', label: 'Qty' },
            { key: 'created_at', label: 'Date' },
          ]} rows={(stockHistory || []).slice(0, 5)} emptyText="No stock transactions." />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Recent Purchases</h2>
          <InventoryTable columns={[
            { key: 'purchase_number', label: 'Purchase No' },
            { key: 'grand_total', label: 'Total', render: (row) => formatCurrency(row.grand_total) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status || 'Completed'} /> },
          ]} rows={(recentPurchases || []).slice(0, 5)} emptyText="No purchases yet." />
        </div>
      </div>
    </div>
  );
}

function ProductsPage() {
  const { products, categories, subcategories, units, suppliers, locations, loadData } = useInventoryContext();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedStockLevel, setSelectedStockLevel] = useState('All Stock');
  const [sortBy, setSortBy] = useState('latest');
  const [viewMode, setViewMode] = useState('table');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState({
    product_name: '', sku: '', barcode: '', category_id: '', subcategory_id: '', unit_id: '', supplier_id: '', purchase_price: '', selling_price: '', current_stock: '0', minimum_stock: '0', reorder_level: '0', status: 'Active',
  });

  const filtered = [...products]
    .filter((product) => {
      const value = search.trim().toLowerCase();
      const matchesSearch = [product.product_name, product.sku, product.barcode, product.category_name]
        .some((field) => String(field || '').toLowerCase().includes(value));
      const matchesCategory = selectedCategory === 'All Categories' ||
        String(product.category_id || '') === selectedCategory;
      const matchesStatus = selectedStatus === 'All Status' ||
        (selectedStatus === 'Active'
          ? String(product.status || 'Active').toLowerCase() === 'active'
          : String(product.status || 'Active').toLowerCase() !== 'active');
      const currentStock = Number(product.current_stock) || 0;
      const reorderLevel = Number(product.reorder_level) || 0;
      const matchesStockLevel = selectedStockLevel === 'All Stock' ||
        (selectedStockLevel === 'In Stock' && currentStock > 0) ||
        (selectedStockLevel === 'Low Stock' && currentStock > 0 && currentStock <= reorderLevel) ||
        (selectedStockLevel === 'Out of Stock' && currentStock === 0);
      return matchesSearch && matchesCategory && matchesStatus && matchesStockLevel;
    })
    .sort((first, second) => {
      if (sortBy === 'name') return String(first.product_name || '').localeCompare(String(second.product_name || ''));
      if (sortBy === 'stock-low') return Number(first.current_stock || 0) - Number(second.current_stock || 0);
      if (sortBy === 'stock-high') return Number(second.current_stock || 0) - Number(first.current_stock || 0);
      return new Date(second.created_at || 0) - new Date(first.created_at || 0);
    });

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/inventory/products', { ...form, current_stock: Number(form.current_stock || 0), purchase_price: Number(form.purchase_price || 0), selling_price: Number(form.selling_price || 0), minimum_stock: Number(form.minimum_stock || 0), reorder_level: Number(form.reorder_level || 0) });
      toast.success('Product added successfully.');
      setForm({ product_name: '', sku: '', barcode: '', category_id: '', subcategory_id: '', unit_id: '', supplier_id: '', purchase_price: '', selling_price: '', current_stock: '0', minimum_stock: '0', reorder_level: '0', status: 'Active' });
      loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to add product.');
    }
  };

  const columns = [
    { key: 'image_url', label: 'Product Image', render: () => <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500"> <Package size={18} /> </div> },
    { key: 'product_name', label: 'Grocery Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'barcode', label: 'Barcode' },
    { key: 'category_name', label: 'Category' },
    { key: 'current_stock', label: 'Current Stock' },
    { key: 'reorder_level', label: 'Reorder Level' },
    { key: 'purchase_price', label: 'Purchase Price', render: (row) => formatCurrency(row.purchase_price) },
    { key: 'stock_value', label: 'Stock Value', render: (row) => formatCurrency(row.stock_value || row.current_stock * row.purchase_price) },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status || 'Active'} /> },
    { key: 'actions', label: 'Actions', render: () => <div className="flex gap-2"><button className="text-sky-600" title="View"><Eye size={15} /></button><button className="text-amber-600" title="Edit"><Pencil size={15} /></button><button className="text-rose-600" title="Delete"><Trash2 size={15} /></button></div> },
  ];

  const totalCategories = new Set(products.map(p => p.category_name).filter(Boolean)).size;
  const lowStockCount = products.filter(p => (Number(p.current_stock) || 0) <= (Number(p.reorder_level) || 0) && (Number(p.current_stock) || 0) > 0).length;
  const outOfStockCount = products.filter(p => (Number(p.current_stock) || 0) === 0).length;

  const statCardsData = [
    { title: "Total Groceries", value: products.length, icon: Package, bg: "bg-[#22c55e]", hint: "Registered inventory items" },
    { title: "Categories", value: totalCategories, icon: Tags, bg: "bg-[#3b82f6]", hint: "Active categories" },
    { title: "Low Stock", value: lowStockCount, icon: AlertTriangle, bg: "bg-[#f59e0b]", hint: "Below reorder level" },
    { title: "Out of Stock", value: outOfStockCount, icon: TrendingDown, bg: outOfStockCount > 0 ? "bg-[#ef4444]" : "bg-[#8b5cf6]", hint: "No units left" },
  ];

  return (
    <>
      <div>
        
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCardsData.map(({ title, value, icon: Icon, bg, hint }, index) => (
            <article key={title} className={`relative min-w-0 overflow-hidden rounded-xl border border-transparent p-4 sm:p-5 shadow-[0_2px_10px_rgba(20,56,34,0.08)] flex flex-col justify-between min-h-[140px] ${bg} text-white`}>
              <div className="flex items-start gap-3 relative z-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm bg-white/20">
                  <Icon size={24} strokeWidth={2.2} className="text-white" />
                </div>
                <div className="flex-1 mt-0.5 min-w-0">
                  <h3 className="text-[12px] font-semibold opacity-90 mb-1 truncate">{title}</h3>
                  <div className="text-[26px] font-extrabold leading-none tracking-tight">{value}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-5 relative z-10">
                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold bg-white/25">↑ 12%</span>
                <span className="text-[11px] font-medium opacity-75 truncate">{hint}</span>
              </div>
              <div className="absolute right-0 bottom-0 w-24 h-16 pointer-events-none opacity-50">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                  <defs>
                    <linearGradient id={`grograd-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#grograd-${index})`} />
                  <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                </svg>
              </div>
            </article>
          ))}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
            <label className="relative block w-full xl:max-w-[340px] xl:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-[46px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#1a3c36]"
                placeholder="Search groceries by name, SKU or barcode..."
              />
            </label>
            <div className="flex flex-wrap items-center gap-3 xl:ml-auto">
              <select
                aria-label="Filter by category"
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="h-[46px] min-w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#1a3c36]"
              >
                <option value="All Categories">All Categories</option>
                {categories.map((category) => (
                  <option key={category.category_id} value={String(category.category_id)}>
                    {category.category_name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by status"
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                className="h-[46px] min-w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#1a3c36]"
              >
                <option value="All Status">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <select
                aria-label="Filter by stock level"
                value={selectedStockLevel}
                onChange={(event) => setSelectedStockLevel(event.target.value)}
                className="h-[46px] min-w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#1a3c36]"
              >
                <option value="All Stock">All Stock</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
              <select
                aria-label="Sort groceries"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="h-[46px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#1a3c36]"
              >
                <option value="latest">Sort by: Latest</option>
                <option value="name">Name: A to Z</option>
                <option value="stock-low">Stock: Low to High</option>
                <option value="stock-high">Stock: High to Low</option>
              </select>
              <div className="flex h-[46px] items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  aria-label="Card view"
                  aria-pressed={viewMode === 'card'}
                  title="Card view"
                  className={`flex h-[46px] w-[46px] items-center justify-center transition ${viewMode === 'card' ? 'bg-[#1a3c36] text-white' : 'text-slate-600 hover:bg-white'}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  aria-label="Table view"
                  aria-pressed={viewMode === 'table'}
                  title="Table view"
                  className={`flex h-[46px] w-[46px] items-center justify-center transition ${viewMode === 'table' ? 'bg-[#1a3c36] text-white' : 'text-slate-600 hover:bg-white'}`}
                >
                  <Table2 className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex h-[46px] items-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#214a42]"
              >
                <Plus className="h-4 w-4" />
                Add Grocery
              </button>
            </div>
          </div>
          {viewMode === 'table' ? (
            <InventoryTable columns={columns} rows={filtered} emptyText="No groceries found." />
          ) : filtered.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product) => (
                <article key={product.product_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <Package size={18} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-900">{product.product_name}</h3>
                        <p className="mt-1 truncate text-xs text-slate-500">{product.category_name || 'Uncategorized'}</p>
                      </div>
                    </div>
                    <StatusBadge value={product.status || 'Active'} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-xs text-slate-500">SKU</dt><dd className="mt-1 font-medium text-slate-800">{product.sku || '—'}</dd></div>
                    <div><dt className="text-xs text-slate-500">Current Stock</dt><dd className="mt-1 font-medium text-slate-800">{product.current_stock ?? 0}</dd></div>
                    <div><dt className="text-xs text-slate-500">Reorder Level</dt><dd className="mt-1 font-medium text-slate-800">{product.reorder_level ?? 0}</dd></div>
                    <div><dt className="text-xs text-slate-500">Purchase Price</dt><dd className="mt-1 font-medium text-slate-800">{formatCurrency(product.purchase_price)}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No groceries found.</div>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add Grocery</h2>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-600">×</button>
            </div>
            <form className="space-y-3" onSubmit={(event) => {
              handleSubmit(event);
              setIsAddModalOpen(false);
            }}>
              <FormField label="Grocery name" required>
                <input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} placeholder="Enter grocery name" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="SKU">
                  <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Enter SKU" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </FormField>
                <FormField label="Barcode">
                  <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Enter barcode" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Category">
                  <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <option value="">Select category</option>
                    {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.category_name}</option>)}
                  </select>
                </FormField>
                <FormField label="Unit">
                  <select value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <option value="">Select unit</option>
                    {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.unit_name}</option>)}
                  </select>
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Purchase price">
                  <input value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} placeholder="0.00" type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </FormField>
                <FormField label="Selling price">
                  <input value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} placeholder="0.00" type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </FormField>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Opening stock">
                  <input value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} placeholder="0" type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" min="0" />
                </FormField>
                <FormField label="Min stock">
                  <input value={form.minimum_stock} onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })} placeholder="0" type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" min="0" />
                </FormField>
                <FormField label="Reorder level">
                  <input value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} placeholder="0" type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" min="0" />
                </FormField>
              </div>
              <FormField label="Status">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </FormField>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                <button type="submit" className="rounded-xl bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function CategoriesPage() {
  const { categories, loadData } = useInventoryContext();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState({ category_name: '', description: '', status: 'Active' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/inventory/categories', form);
      toast.success('Category added successfully.');
      setForm({ category_name: '', description: '', status: 'Active' });
      setIsAddModalOpen(false);
      loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to add category.');
    }
  };

  return (
    <>
      <InventoryCrudPage title="Categories" subtitle="Organize product categories and inventory grouping." actions={<button className="rounded-xl bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white" onClick={() => setIsAddModalOpen(true)}>Add Category</button>}>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <InventoryTable columns={[
            { key: 'category_name', label: 'Category' },
            { key: 'description', label: 'Description' },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status || 'Active'} /> },
          ]} rows={categories} emptyText="No categories found." />
        </div>
      </InventoryCrudPage>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add Category</h2>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-600">×</button>
            </div>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <FormField label="Category name" required>
                <input value={form.category_name} onChange={(e) => setForm({ ...form, category_name: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter category name" required />
              </FormField>
              <FormField label="Description">
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter category description" rows={4} />
              </FormField>
              <FormField label="Status">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </FormField>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                <button className="rounded-xl bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white" type="submit">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function UnitsPage() {
  const { units, loadData } = useInventoryContext();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState({ unit_name: '', short_name: '', status: 'Active' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/inventory/units', form);
      toast.success('Unit added successfully.');
      setForm({ unit_name: '', short_name: '', status: 'Active' });
      setIsAddModalOpen(false);
      loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to add unit.');
    }
  };

  return (
    <>
      <InventoryCrudPage title="Units" subtitle="Default inventory measurement units." actions={<button className="rounded-xl bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white" onClick={() => setIsAddModalOpen(true)}>Add Unit</button>}>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <InventoryTable columns={[
            { key: 'unit_name', label: 'Unit Name' },
            { key: 'short_name', label: 'Short Name' },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status || 'Active'} /> },
          ]} rows={units} emptyText="No units found." />
        </div>
      </InventoryCrudPage>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add Unit</h2>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-600">×</button>
            </div>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <FormField label="Unit name" required>
                <input value={form.unit_name} onChange={(e) => setForm({ ...form, unit_name: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter unit name" required />
              </FormField>
              <FormField label="Short name" required>
                <input value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter short name (e.g. Kg)" required />
              </FormField>
              <FormField label="Status">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </FormField>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                <button className="rounded-xl bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white" type="submit">Save Unit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function SuppliersPage() {
  const { suppliers, loadData } = useInventoryContext();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('All Companies');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [sortBy, setSortBy] = useState('latest');
  const [viewMode, setViewMode] = useState('table');
  const [form, setForm] = useState({ supplier_name: '', company_name: '', phone: '', email: '', address: '', gst_number: '', payment_terms: '', opening_balance: '0', status: 'Active' });

  const visibleSuppliers = [...suppliers]
    .filter((supplier) => {
      const searchTerm = search.trim().toLowerCase();
      const matchesSearch = [
        supplier.supplier_id,
        supplier.supplier_name,
        supplier.company_name,
        supplier.phone,
        supplier.email,
        supplier.gst_number,
      ].some((field) => String(field || '').toLowerCase().includes(searchTerm));
      const matchesCompany = selectedCompany === 'All Companies' || supplier.company_name === selectedCompany;
      const matchesStatus = selectedStatus === 'All Status' ||
        String(supplier.status || 'Active').toLowerCase() === selectedStatus.toLowerCase();
      return matchesSearch && matchesCompany && matchesStatus;
    })
    .sort((first, second) => {
      if (sortBy === 'name') return String(first.supplier_name || '').localeCompare(String(second.supplier_name || ''));
      if (sortBy === 'name-desc') return String(second.supplier_name || '').localeCompare(String(first.supplier_name || ''));
      return new Date(second.created_at || 0) - new Date(first.created_at || 0);
    });

  const supplierCompanies = [...new Set(suppliers.map((supplier) => supplier.company_name).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second));

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/inventory/suppliers', { ...form, opening_balance: Number(form.opening_balance || 0) });
      toast.success('Supplier added successfully.');
      setForm({ supplier_name: '', company_name: '', phone: '', email: '', address: '', gst_number: '', payment_terms: '', opening_balance: '0', status: 'Active' });
      setIsAddModalOpen(false);
      loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to add supplier.');
    }
  };

  const activeSuppliers = suppliers.filter(s => (s.status || 'Active') === 'Active').length;
  const inactiveSuppliers = suppliers.filter(s => s.status === 'Inactive').length;
  const withGst = suppliers.filter(s => s.gst_number).length;

  const supplierCards = [
    { title: "Total Suppliers", value: suppliers.length, icon: Truck, bg: "bg-[#22c55e]", hint: "Registered vendors" },
    { title: "Active Suppliers", value: activeSuppliers, icon: ShoppingCart, bg: "bg-[#3b82f6]", hint: "Currently active" },
    { title: "Inactive Suppliers", value: inactiveSuppliers, icon: TrendingDown, bg: inactiveSuppliers > 0 ? "bg-[#f59e0b]" : "bg-[#8b5cf6]", hint: "Paused or disabled" },
    { title: "GST Registered", value: withGst, icon: Tag, bg: "bg-[#06b6d4]", hint: "With GST number" },
  ];

  return (
    <>
      <InventoryCrudPage title="Suppliers" subtitle="Track supplier contacts, balances and purchase history.">

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {supplierCards.map(({ title, value, icon: Icon, bg, hint }, index) => (
            <article key={title} className={`relative min-w-0 overflow-hidden rounded-xl border border-transparent p-4 sm:p-5 shadow-[0_2px_10px_rgba(20,56,34,0.08)] flex flex-col justify-between min-h-[140px] ${bg} text-white`}>
              <div className="flex items-start gap-3 relative z-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm bg-white/20">
                  <Icon size={24} strokeWidth={2.2} className="text-white" />
                </div>
                <div className="flex-1 mt-0.5 min-w-0">
                  <h3 className="text-[12px] font-semibold opacity-90 mb-1 truncate">{title}</h3>
                  <div className="text-[26px] font-extrabold leading-none tracking-tight">{value}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-5 relative z-10">
                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold bg-white/25">↑ 12%</span>
                <span className="text-[11px] font-medium opacity-75 truncate">{hint}</span>
              </div>
              <div className="absolute right-0 bottom-0 w-24 h-16 pointer-events-none opacity-50">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                  <defs>
                    <linearGradient id={`supgrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#supgrad-${index})`} />
                  <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                </svg>
              </div>
            </article>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
            <label className="relative block w-full xl:max-w-[340px] xl:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-[46px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#1a3c36]"
                placeholder="Search suppliers by name, company, phone or ID..."
                aria-label="Search suppliers"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3 xl:ml-auto">
              <select
                aria-label="Filter by company"
                value={selectedCompany}
                onChange={(event) => setSelectedCompany(event.target.value)}
                className="h-[46px] min-w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#1a3c36]"
              >
                <option value="All Companies">All Companies</option>
                {supplierCompanies.map((company) => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
              <select
                aria-label="Filter by status"
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                className="h-[46px] min-w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#1a3c36]"
              >
                <option value="All Status">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <select
                aria-label="Sort suppliers"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="h-[46px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#1a3c36]"
              >
                <option value="latest">Sort by: Latest</option>
                <option value="name">Name: A to Z</option>
                <option value="name-desc">Name: Z to A</option>
              </select>
              <div className="flex h-[46px] items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  aria-label="Card view"
                  aria-pressed={viewMode === 'card'}
                  title="Card view"
                  className={`flex h-[46px] w-[46px] items-center justify-center transition ${viewMode === 'card' ? 'bg-[#1a3c36] text-white' : 'text-slate-600 hover:bg-white'}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  aria-label="Table view"
                  aria-pressed={viewMode === 'table'}
                  title="Table view"
                  className={`flex h-[46px] w-[46px] items-center justify-center transition ${viewMode === 'table' ? 'bg-[#1a3c36] text-white' : 'text-slate-600 hover:bg-white'}`}
                >
                  <Table2 className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex h-[46px] items-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#214a42]"
              >
                <Plus className="h-4 w-4" />
                Add Supplier
              </button>
            </div>
          </div>
          {viewMode === 'table' ? (
            <InventoryTable columns={[
              { key: 'supplier_name', label: 'Supplier' },
              { key: 'company_name', label: 'Company' },
              { key: 'phone', label: 'Phone' },
              { key: 'email', label: 'Email' },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status || 'Active'} /> },
            ]} rows={visibleSuppliers} emptyText="No suppliers match these filters." />
          ) : visibleSuppliers.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleSuppliers.map((supplier) => (
                <article key={supplier.supplier_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-900">{supplier.supplier_name}</h3>
                      <p className="mt-1 truncate text-sm text-slate-500">{supplier.company_name || 'No company listed'}</p>
                    </div>
                    <StatusBadge value={supplier.status || 'Active'} />
                  </div>
                  <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Phone</dt>
                      <dd className="truncate text-right text-slate-700">{supplier.phone || '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Email</dt>
                      <dd className="truncate text-right text-slate-700">{supplier.email || '—'}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              No suppliers match these filters.
            </div>
          )}
        </div>
      </InventoryCrudPage>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add Supplier</h2>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-600">×</button>
            </div>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <FormField label="Supplier name" required>
                <input value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter supplier name" required />
              </FormField>
              <FormField label="Company name">
                <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter company name" />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Phone">
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter phone number" />
                </FormField>
                <FormField label="Email">
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter email address" />
                </FormField>
              </div>
              <FormField label="Address">
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter supplier address" rows={3} />
              </FormField>
              <FormField label="GST number">
                <input value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter GST number" />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Payment terms">
                  <input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. Net 30" />
                </FormField>
                <FormField label="Opening balance">
                  <input value={form.opening_balance} onChange={(e) => setForm({ ...form, opening_balance: e.target.value })} type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="0.00" />
                </FormField>
              </div>
              <FormField label="Status">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </FormField>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                <button className="rounded-xl bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white" type="submit">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function PurchasesPage() {
  const { suppliers, products, loadData } = useInventoryContext();
  const [form, setForm] = useState({ purchase_number: 'PUR-1001', supplier_id: '', invoice_number: '', purchase_date: '', notes: '', items: [{ product_id: '', quantity: '1', unit: 'Kg', purchase_price: '0', discount: '0', tax: '0' }] });

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        subtotal: form.items.reduce((sum, item) => sum + ((Number(item.quantity || 0) * Number(item.purchase_price || 0)) - Number(item.discount || 0)), 0),
        grand_total: form.items.reduce((sum, item) => sum + ((Number(item.quantity || 0) * Number(item.purchase_price || 0)) - Number(item.discount || 0) + Number(item.tax || 0)), 0),
        payment_status: 'Paid',
        status: 'Completed',
        items: form.items.map((item) => ({ ...item, quantity: Number(item.quantity || 0), purchase_price: Number(item.purchase_price || 0), discount: Number(item.discount || 0), tax: Number(item.tax || 0) })),
      };
      await api.post('/inventory/purchases', payload);
      toast.success('Purchase completed successfully.');
      loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to save purchase.');
    }
  };

  const updateItem = (index, field, value) => {
    setForm((prev) => ({ ...prev, items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)) }));
  };

  return (
    <InventoryCrudPage title="Purchases" subtitle="Record new purchases and update stock automatically.">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-3">
            <FormField label="Purchase number">
              <input value={form.purchase_number} onChange={(e) => setForm({ ...form, purchase_number: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter purchase number" />
            </FormField>
            <FormField label="Supplier">
              <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.supplier_name}</option>)}
              </select>
            </FormField>
            <FormField label="Invoice number">
              <input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter invoice number" />
            </FormField>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Products</h3>
            <div className="space-y-3">
              {form.items.map((item, index) => (
                <div key={index} className="grid gap-3 md:grid-cols-5">
                  <FormField label="Product">
                    <select value={item.product_id} onChange={(e) => updateItem(index, 'product_id', e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      <option value="">Select product</option>
                      {products.map((product) => <option key={product.id} value={product.id}>{product.product_name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Qty">
                    <input value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Qty" />
                  </FormField>
                  <FormField label="Unit">
                    <input value={item.unit} onChange={(e) => updateItem(index, 'unit', e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Kg" />
                  </FormField>
                  <FormField label="Price">
                    <input value={item.purchase_price} onChange={(e) => updateItem(index, 'purchase_price', e.target.value)} type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="0.00" />
                  </FormField>
                  <button type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700" onClick={() => setForm((prev) => ({ ...prev, items: prev.items.filter((_, idx) => idx !== index) }))}>Remove</button>
                </div>
              ))}
            </div>
            <button type="button" className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700" onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, { product_id: '', quantity: '1', unit: 'Kg', purchase_price: '0', discount: '0', tax: '0' }] }))}>Add Product</button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Purchase date">
              <input value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} type="date" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Notes">
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter purchase notes" />
            </FormField>
          </div>

          <button type="submit" className="rounded-xl bg-[#1a3c36] px-5 py-2.5 text-sm font-semibold text-white">Save Purchase</button>
        </form>
      </div>
    </InventoryCrudPage>
  );
}

function StockInPage() {
  const { products, suppliers, loadData } = useInventoryContext();
  const [form, setForm] = useState({ product_id: '', quantity: '0', unit: 'Kg', purchase_price: '0', supplier_id: '', date: new Date().toISOString().slice(0, 10), reference_number: '', notes: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/inventory/stock-in', { ...form, quantity: Number(form.quantity), purchase_price: Number(form.purchase_price) });
      toast.success('Stock updated successfully.');
      setForm({ product_id: '', quantity: '0', unit: 'Kg', purchase_price: '0', supplier_id: '', date: new Date().toISOString().slice(0, 10), reference_number: '', notes: '' });
      loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Stock in failed.');
    }
  };

  return (
    <InventoryCrudPage title="Stock In" subtitle="Add inventory stock and record the movement history.">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Product" required>
              <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" required>
                <option value="">Select product</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.product_name}</option>)}
              </select>
            </FormField>
            <FormField label="Supplier">
              <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.supplier_name}</option>)}
              </select>
            </FormField>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <FormField label="Quantity" required>
              <input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} type="number" min="0" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter quantity" required />
            </FormField>
            <FormField label="Unit">
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. Kg" />
            </FormField>
            <FormField label="Purchase price">
              <input value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} type="number" min="0" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="0.00" />
            </FormField>
            <FormField label="Reference number">
              <input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter ref no" />
            </FormField>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Stock in date">
              <input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} type="date" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Notes">
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter notes" />
            </FormField>
          </div>
          <button type="submit" className="rounded-xl bg-[#1a3c36] px-5 py-2.5 text-sm font-semibold text-white">Save Stock In</button>
        </form>
      </div>
    </InventoryCrudPage>
  );
}

function StockOutPage() {
  const { products, loadData } = useInventoryContext();
  const [form, setForm] = useState({ product_id: '', quantity: '0', unit: 'Kg', department: 'Kitchen', reason: 'Kitchen Usage', date: new Date().toISOString().slice(0, 10), notes: '' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/inventory/stock-out', { ...form, quantity: Number(form.quantity) });
      toast.success('Stock updated successfully.');
      setForm({ product_id: '', quantity: '0', unit: 'Kg', department: 'Kitchen', reason: 'Kitchen Usage', date: new Date().toISOString().slice(0, 10), notes: '' });
      loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Insufficient stock.');
    }
  };

  return (
    <InventoryCrudPage title="Stock Out" subtitle="Issue stock to kitchen, orders, events or operational use.">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Product" required>
              <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" required>
                <option value="">Select product</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.product_name}</option>)}
              </select>
            </FormField>
            <FormField label="Department">
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="Kitchen">Kitchen</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Staff">Staff Food</option>
                <option value="Event">Event</option>
              </select>
            </FormField>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <FormField label="Quantity" required>
              <input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} type="number" min="0" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter quantity" required />
            </FormField>
            <FormField label="Unit">
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. Kg" />
            </FormField>
            <FormField label="Reason">
              <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option>Kitchen Usage</option>
                <option>Restaurant Order</option>
                <option>Staff Food</option>
                <option>Event</option>
                <option>Complimentary</option>
                <option>Damaged</option>
                <option>Other</option>
              </select>
            </FormField>
            <FormField label="Stock out date">
              <input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} type="date" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </FormField>
          </div>
          <FormField label="Notes">
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter stock-out notes" />
          </FormField>
          <button type="submit" className="rounded-xl bg-[#1a3c36] px-5 py-2.5 text-sm font-semibold text-white">Save Stock Out</button>
        </form>
      </div>
    </InventoryCrudPage>
  );
}

function LowStockPage() {
  const { lowStockList } = useInventoryContext();
  return (
    <InventoryCrudPage title="Low Stock" subtitle="Monitor inventory that needs replenishment.">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <InventoryTable columns={[
          { key: 'product_name', label: 'Product' },
          { key: 'current_stock', label: 'Current Stock' },
          { key: 'minimum_stock', label: 'Minimum Stock' },
          { key: 'reorder_level', label: 'Reorder Level' },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.current_stock === 0 ? 'Out of Stock' : 'Low Stock'} /> },
        ]} rows={lowStockList} emptyText="No low-stock products." />
      </div>
    </InventoryCrudPage>
  );
}

function ExpiryPage() {
  const { expiryList } = useInventoryContext();
  return (
    <InventoryCrudPage title="Expiry" subtitle="Track product expiry statuses across all batches.">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <InventoryTable columns={[
          { key: 'product_name', label: 'Product' },
          { key: 'batch_number', label: 'Batch' },
          { key: 'current_stock', label: 'Quantity' },
          { key: 'expiry_date', label: 'Expiry Date' },
          { key: 'days_remaining', label: 'Days Remaining' },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.days_remaining <= 0 ? 'Expired' : row.days_remaining <= 7 ? 'Expiring Soon' : 'Good'} /> },
        ]} rows={expiryList.map((item) => ({ ...item, status: item.days_remaining <= 0 ? 'Expired' : item.days_remaining <= 7 ? 'Expiring Soon' : 'Good' }))} emptyText="No expiry data available." />
      </div>
    </InventoryCrudPage>
  );
}

function ReportsPage() {
  const { reports } = useInventoryContext();
  return (
    <InventoryCrudPage title="Reports" subtitle="Current stock, movement and stock valuation snapshots.">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Current Stock Report</h2>
          <InventoryTable columns={[
            { key: 'product_name', label: 'Product' },
            { key: 'current_stock', label: 'Qty' },
            { key: 'purchase_price', label: 'Purchase Price', render: (row) => formatCurrency(row.purchase_price) },
            { key: 'stock_value', label: 'Stock Value', render: (row) => formatCurrency(row.current_stock * row.purchase_price) },
          ]} rows={reports.stock || []} emptyText="No stock report available." />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Movement Report</h2>
          <InventoryTable columns={[
            { key: 'transaction_type', label: 'Type' },
            { key: 'quantity', label: 'Qty' },
            { key: 'reason', label: 'Reason' },
            { key: 'created_at', label: 'Date' },
          ]} rows={reports.transactions || []} emptyText="No movement data." />
        </div>
      </div>
    </InventoryCrudPage>
  );
}

function KitchenRequestsPage() {
  const { products, loadData } = useInventoryContext();
  const [requests, setRequests] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState({
    request_number: `KR-${Date.now()}`,
    requested_by: 'Admin',
    department: 'Kitchen',
    request_date: new Date().toISOString().slice(0, 10),
    priority: 'Normal',
    notes: '',
    items: [{ product_id: '', quantity: '1', unit: 'pcs' }],
  });

  const fetchRequests = async () => {
    try {
      const response = await api.get('/inventory/kitchen-requests');
      setRequests(response.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to load kitchen requests.');
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateItem = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addItemRow = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { product_id: '', quantity: '1', unit: 'pcs' }],
    }));
  };

  const removeItemRow = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, itemIndex) => itemIndex !== index) : prev.items,
    }));
  };

  const resetForm = () => {
    setForm({
      request_number: `KR-${Date.now()}`,
      requested_by: 'Admin',
      department: 'Kitchen',
      request_date: new Date().toISOString().slice(0, 10),
      priority: 'Normal',
      notes: '',
      items: [{ product_id: '', quantity: '1', unit: 'pcs' }],
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validItems = form.items.filter((item) => item.product_id && Number(item.quantity || 0) > 0);
    if (!validItems.length) {
      toast.error('Select at least one product and quantity for the kitchen request.');
      return;
    }

    try {
      await api.post('/inventory/kitchen-requests', {
        ...form,
        request_date: form.request_date || new Date().toISOString().slice(0, 10),
        requested_by: form.requested_by || 'Admin',
        items: validItems.map((item) => ({
          ...item,
          product_id: Number(item.product_id),
          quantity: Number(item.quantity || 0),
        })),
      });

      toast.success('Kitchen request sent successfully.');
      setIsAddModalOpen(false);
      resetForm();
      fetchRequests();
      loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to create kitchen request.');
    }
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      if (action === 'approve') {
        await api.put(`/inventory/kitchen-requests/${requestId}/approve`);
        toast.success('Kitchen request approved.');
      }

      if (action === 'reject') {
        await api.put(`/inventory/kitchen-requests/${requestId}/reject`);
        toast.success('Kitchen request rejected.');
      }

      if (action === 'issue') {
        await api.put(`/inventory/kitchen-requests/${requestId}/issue`);
        toast.success('Stock issued to kitchen.');
      }

      if (action === 'complete') {
        await api.put(`/inventory/kitchen-requests/${requestId}/complete`);
        toast.success('Kitchen request completed.');
      }

      fetchRequests();
      loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to update kitchen request.');
    }
  };

  const getRequestActions = (request) => {
    const status = request.status || 'Pending';

    if (status === 'Pending') {
      return (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => handleRequestAction(request.id, 'approve')} className="rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white">Approve</button>
          <button type="button" onClick={() => handleRequestAction(request.id, 'reject')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">Reject</button>
        </div>
      );
    }

    if (status === 'Approved') {
      return <button type="button" onClick={() => handleRequestAction(request.id, 'issue')} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white">Issue Stock</button>;
    }

    if (status === 'Issued') {
      return <button type="button" onClick={() => handleRequestAction(request.id, 'complete')} className="rounded-lg bg-[#1a3c36] px-2.5 py-1.5 text-xs font-semibold text-white">Complete</button>;
    }

    return <span className="text-xs text-slate-500">No action</span>;
  };

  const pendingCount = requests.filter(r => (r.status || 'Pending') === 'Pending').length;
  const approvedCount = requests.filter(r => r.status === 'Approved').length;
  const completedCount = requests.filter(r => r.status === 'Completed').length;

  const kitchenCards = [
    { title: "Total Requests", value: requests.length, icon: ClipboardList, bg: "bg-[#22c55e]", hint: "All kitchen requests" },
    { title: "Pending", value: pendingCount, icon: CalendarClock, bg: "bg-[#f59e0b]", hint: "Awaiting approval" },
    { title: "Approved", value: approvedCount, icon: UtensilsCrossed, bg: "bg-[#3b82f6]", hint: "Ready to issue stock" },
    { title: "Completed", value: completedCount, icon: Boxes, bg: "bg-[#8b5cf6]", hint: "Fulfilled requests" },
  ];

  return (
    <>
      <InventoryCrudPage title="Kitchen Requests" subtitle="Send ingredient and production requests to the kitchen team and track stock usage." actions={<button className="rounded-xl bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white" onClick={() => setIsAddModalOpen(true)}>Add Kitchen Request</button>}>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kitchenCards.map(({ title, value, icon: Icon, bg, hint }, index) => (
            <article key={title} className={`relative min-w-0 overflow-hidden rounded-xl border border-transparent p-4 sm:p-5 shadow-[0_2px_10px_rgba(20,56,34,0.08)] flex flex-col justify-between min-h-[140px] ${bg} text-white`}>
              <div className="flex items-start gap-3 relative z-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm bg-white/20">
                  <Icon size={24} strokeWidth={2.2} className="text-white" />
                </div>
                <div className="flex-1 mt-0.5 min-w-0">
                  <h3 className="text-[12px] font-semibold opacity-90 mb-1 truncate">{title}</h3>
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
                    <linearGradient id={`krgrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#krgrad-${index})`} />
                  <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                </svg>
              </div>
            </article>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <InventoryTable columns={[
            { key: 'request_number', label: 'Request No.' },
            { key: 'requested_by', label: 'Requested By' },
            { key: 'request_date', label: 'Date' },
            { key: 'priority', label: 'Priority' },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status || 'Pending'} /> },
            { key: 'notes', label: 'Notes', render: (row) => <span className="max-w-xs text-slate-600">{row.notes || '—'}</span> },
            { key: 'actions', label: 'Action', render: (row) => getRequestActions(row) },
          ]} rows={requests} emptyText="No kitchen requests created yet." />
        </div>
      </InventoryCrudPage>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add Kitchen Request</h2>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-600">×</button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Request number" required>
                  <input value={form.request_number} onChange={(e) => setForm({ ...form, request_number: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="KR-1001" required />
                </FormField>
                <FormField label="Requested by" required>
                  <input value={form.requested_by} onChange={(e) => setForm({ ...form, requested_by: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Chef / Admin" required />
                </FormField>
                <FormField label="Department">
                  <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Kitchen" />
                </FormField>
                <FormField label="Request date">
                  <input type="date" value={form.request_date} onChange={(e) => setForm({ ...form, request_date: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </FormField>
                <FormField label="Priority">
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </FormField>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Items</h3>
                  <button type="button" onClick={addItemRow} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">+ Add Item</button>
                </div>

                {form.items.map((item, index) => (
                  <div key={`kitchen-item-${index}`} className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1.5fr_0.8fr_0.7fr_auto]">
                    <FormField label="Product">
                      <select value={item.product_id} onChange={(e) => updateItem(index, 'product_id', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required>
                        <option value="">Select product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>{product.product_name}</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Quantity">
                      <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="1" required />
                    </FormField>
                    <FormField label="Unit">
                      <input value={item.unit} onChange={(e) => updateItem(index, 'unit', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="pcs" />
                    </FormField>
                    <div className="flex items-end pb-0.5">
                      <button type="button" onClick={() => removeItemRow(index)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">Remove</button>
                    </div>
                  </div>
                ))}
              </div>

              <FormField label="Notes">
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={3} placeholder="Add chef requirement or notes" />
              </FormField>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                <button type="submit" className="rounded-xl bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white">Send Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function InventoryFallbackPage() {
  return (
    <InventoryCrudPage title="Inventory Management" subtitle="System is ready. Navigate using the left sidebar to access each inventory module.">
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">Select a module from the inventory sidebar.</div>
    </InventoryCrudPage>
  );
}

const InventoryContextValue = createContext(null);

const InventoryContext = ({ children }) => {
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [lowStockList, setLowStockList] = useState([]);
  const [expiryList, setExpiryList] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [recentPurchases, setRecentPurchases] = useState([]);
  const [reports, setReports] = useState({ stock: [], transactions: [] });
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, productsRes, categoriesRes, unitsRes, suppliersRes, locationsRes, lowStockRes, expiryRes, historyRes, purchasesRes, reportsRes] = await Promise.all([
        api.get('/inventory/dashboard').catch(() => ({ data: { data: EMPTY_DASHBOARD } })),
        api.get('/inventory/products').catch(() => ({ data: { data: [] } })),
        api.get('/inventory/categories').catch(() => ({ data: { data: [] } })),
        api.get('/inventory/units').catch(() => ({ data: { data: [] } })),
        api.get('/inventory/suppliers').catch(() => ({ data: { data: [] } })),
        api.get('/inventory/locations').catch(() => ({ data: { data: [] } })),
        api.get('/inventory/low-stock').catch(() => ({ data: { data: [] } })),
        api.get('/inventory/expiry').catch(() => ({ data: { data: [] } })),
        api.get('/inventory/stock/history').catch(() => ({ data: { data: [] } })),
        api.get('/inventory/purchases').catch(() => ({ data: { data: [] } })),
        api.get('/inventory/reports').catch(() => ({ data: { data: { stock: [], transactions: [] } } })),
      ]);

      setDashboard(summaryRes.data?.data || EMPTY_DASHBOARD);
      setProducts(productsRes.data?.data || []);
      setCategories(categoriesRes.data?.data || []);
      setUnits(unitsRes.data?.data || []);
      setSuppliers(suppliersRes.data?.data || []);
      setLocations(locationsRes.data?.data || []);
      setLowStockList(lowStockRes.data?.data || []);
      setExpiryList(expiryRes.data?.data || []);
      setStockHistory(historyRes.data?.data || []);
      setRecentPurchases(purchasesRes.data?.data || []);
      setReports(reportsRes.data?.data || { stock: [], transactions: [] });
    } catch {
      setDashboard(EMPTY_DASHBOARD);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const value = { dashboard, products, categories, subcategories, units, suppliers, locations, lowStockList, expiryList, stockHistory, recentPurchases, reports, loading, loadData };

  return <InventoryContextValue.Provider value={value}>{children}</InventoryContextValue.Provider>;
};

function useInventoryContext() {
  const context = useContext(InventoryContextValue);
  if (!context) throw new Error('Inventory context missing.');
  return context;
}

function InventoryRoutes() {
  return (
    <Routes>
      
      <Route path="dashboard" element={<InventoryDashboard />} />
      <Route path="products" element={<ProductsPage />} />
      <Route path="categories" element={<CategoriesPage />} />
      <Route path="subcategories" element={<CategoriesPage />} />
      <Route path="units" element={<UnitsPage />} />
      <Route path="suppliers" element={<SuppliersPage />} />
      <Route path="purchases" element={<PurchasesPage />} />
      <Route path="stock-in" element={<StockInPage />} />
      <Route path="stock-out" element={<StockOutPage />} />
      <Route path="transfers" element={<InventoryFallbackPage />} />
      <Route path="adjustments" element={<InventoryFallbackPage />} />
      <Route path="kitchen-requests" element={<KitchenRequestsPage />} />
      <Route path="recipes" element={<InventoryFallbackPage />} />
      <Route path="wastage" element={<InventoryFallbackPage />} />
      <Route path="expiry" element={<ExpiryPage />} />
      <Route path="low-stock" element={<LowStockPage />} />
      <Route path="locations" element={<InventoryFallbackPage />} />
      <Route path="reports" element={<ReportsPage />} />
    </Routes>
  );
}

export default function InventoryModule() {
  return (
    <InventoryContext>
      <div className="space-y-6">
        <Toaster position="top-right" />
        <InventoryRoutes />
      </div>
    </InventoryContext>
  );
}
