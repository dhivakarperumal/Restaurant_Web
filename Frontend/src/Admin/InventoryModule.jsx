import { createContext, useContext, useEffect, useState } from 'react';
import { Route, Routes, NavLink, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRightLeft, BarChart3, Boxes, CalendarClock, CircleDollarSign, ClipboardList, Eye, Filter, Gauge, LayoutGrid, MapPinned, NotebookPen, Package, PackagePlus, Pencil, Plus, PlusCircle, Search, ShoppingCart, Table2, Tag, Tags, Trash2, TrendingDown, TrendingUp, Truck, UtensilsCrossed, Warehouse, Wrench } from 'lucide-react';
import api, { BACKEND_BASE_URL } from '../api';
import toast, { Toaster } from 'react-hot-toast';
import InventoryUnitField from '../CommonComponents/InventoryUnitField';

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value || 0));
const formatRequestDate = (value) => value instanceof Date
  ? value.toISOString().slice(0, 10)
  : String(value || '').slice(0, 10);
const formatRequestPeriod = (request) => {
  const startDate = formatRequestDate(request.start_date);
  const endDate = formatRequestDate(request.end_date);
  return startDate || endDate
    ? `${startDate || '—'} – ${endDate || '—'}`
    : formatRequestDate(request.request_date) || '—';
};
const emptyGroceryForm = () => ({
  product_name: '',
  sku: '',
  category_id: '',
  subcategory_id: '',
  unit_id: '',
  supplier_id: '',
  purchase_price: '',
  selling_price: '',
  current_stock: '0',
  minimum_stock: '0',
  reorder_level: '0',
  status: 'Active',
});
const inventoryImageUrl = (value) => {
  if (!value) return '';
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) return value;
  return `${BACKEND_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
};

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
                  {typeof column.render === 'function' ? column.render(row, index) : (row[column.key] ?? '-')}
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

function ProductsPage({ readOnly = false }) {
  const { products, subcategories, units, suppliers, locations, loadData } = useInventoryContext();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedStockLevel, setSelectedStockLevel] = useState('All Stock');
  const [sortBy, setSortBy] = useState('latest');
  const [viewMode, setViewMode] = useState('table');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [form, setForm] = useState(emptyGroceryForm);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const filtered = [...products]
    .filter((product) => {
      const value = search.trim().toLowerCase();
      const matchesSearch = [product.product_name, product.sku, product.barcode, product.category_name]
        .some((field) => String(field || '').toLowerCase().includes(value));
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
      return matchesSearch && matchesStatus && matchesStockLevel;
    })
    .sort((first, second) => {
      if (sortBy === 'name') return String(first.product_name || '').localeCompare(String(second.product_name || ''));
      if (sortBy === 'stock-low') return Number(first.current_stock || 0) - Number(second.current_stock || 0);
      if (sortBy === 'stock-high') return Number(second.current_stock || 0) - Number(first.current_stock || 0);
      return new Date(second.created_at || 0) - new Date(first.created_at || 0);
    });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSavingProduct) return;
    setIsSavingProduct(true);
    try {
      const payload = {
        ...form,
        image_url: form.image_url || null,
        current_stock: Number(form.current_stock || 0),
        purchase_price: Number(form.purchase_price || 0),
        selling_price: Number(form.selling_price || 0),
        minimum_stock: Number(form.minimum_stock || 0),
        reorder_level: Number(form.reorder_level || 0),
      };
      if (editingProductId) {
        await api.put(`/inventory/products/${editingProductId}`, payload);
        toast.success('Product updated successfully.');
      } else {
        await api.post('/inventory/products', payload);
        toast.success('Product added successfully.');
      }
      setForm(emptyGroceryForm());
      setEditingProductId(null);
      setIsAddModalOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || `Unable to ${editingProductId ? 'update' : 'add'} product.`);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const openAddGrocery = () => {
    setForm(emptyGroceryForm());
    setEditingProductId(null);
    setIsAddModalOpen(true);
  };

  const openEditProduct = (product) => {
    setForm({
      ...emptyGroceryForm(),
      ...product,
      sku: product.sku || '',
      category_id: product.category_id ? String(product.category_id) : '',
      subcategory_id: product.subcategory_id ? String(product.subcategory_id) : '',
      unit_id: product.unit_id ? String(product.unit_id) : '',
      supplier_id: product.supplier_id ? String(product.supplier_id) : '',
      current_stock: String(product.current_stock ?? 0),
      minimum_stock: String(product.minimum_stock ?? 0),
      reorder_level: String(product.reorder_level ?? 0),
      purchase_price: String(product.purchase_price ?? 0),
      selling_price: String(product.selling_price ?? 0),
    });
    setEditingProductId(product.id);
    setIsAddModalOpen(true);
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Delete "${product.product_name}"?`)) return;
    try {
      await api.delete(`/inventory/products/${product.id}`);
      toast.success('Product deleted successfully.');
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to delete product.');
    }
  };

  const columns = [
    ...(!readOnly ? [{ key: 'serial', label: 'S No', render: (_, index) => index + 1 }] : []),
    { key: 'product_name', label: 'Grocery Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'current_stock', label: 'Current Stock' },
    ...(!readOnly ? [
      { key: 'purchase_price', label: 'Purchase Price', render: (row) => formatCurrency(row.purchase_price) },
    ] : []),
    { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status || 'Active'} /> },
    ...(readOnly ? [{
      key: 'request',
      label: 'Request',
      render: (row) => (
        <button
          type="button"
          onClick={() => navigate('/chef/requests', { state: { requestProduct: { id: row.id, name: row.product_name } } })}
          className="rounded-lg bg-[#1a3c36] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#214a42]"
        >
          Request
        </button>
      ),
    }] : []),
    ...(!readOnly ? [{
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-3">
          <button type="button" className="text-sky-600 hover:text-sky-800" title="View" aria-label={`View ${row.product_name}`} onClick={() => setViewProduct(row)}><Eye size={15} /></button>
          <button type="button" className="text-amber-600 hover:text-amber-800" title="Edit" aria-label={`Edit ${row.product_name}`} onClick={() => openEditProduct(row)}><Pencil size={15} /></button>
          <button type="button" className="text-rose-600 hover:text-rose-800" title="Delete" aria-label={`Delete ${row.product_name}`} onClick={() => deleteProduct(row)}><Trash2 size={15} /></button>
        </div>
      ),
    }] : []),
  ];

  const totalCategories = new Set(products.map(p => p.category_name).filter(Boolean)).size;
  const lowStockCount = products.filter(p => (Number(p.current_stock) || 0) <= (Number(p.reorder_level) || 0) && (Number(p.current_stock) || 0) > 0).length;
  const outOfStockCount = products.filter(p => (Number(p.current_stock) || 0) === 0).length;

  const statCardsData = [
    { title: readOnly ? "Total Stock Items" : "Total Groceries", value: products.length, icon: Package, bg: "bg-[#22c55e]", hint: "Registered inventory items" },
    { title: "Categories", value: totalCategories, icon: Tags, bg: "bg-[#3b82f6]", hint: "Active categories" },
    { title: "Low Stock", value: lowStockCount, icon: AlertTriangle, bg: "bg-[#f59e0b]", hint: "Below reorder level" },
    { title: "Out of Stock", value: outOfStockCount, icon: TrendingDown, bg: outOfStockCount > 0 ? "bg-[#ef4444]" : "bg-[#8b5cf6]", hint: "No units left" },
  ];

  return (
    <>
      <div>
        {readOnly && (
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Chef workspace</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Inventory Stock</h1>
              <p className="mt-1 text-sm text-slate-600">View current stock levels for kitchen inventory.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/chef/requests')}
              className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#1a3c36] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#214a42] sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Add Request
            </button>
          </div>
        )}
        
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
                placeholder={readOnly ? "Search stock items by name, SKU or barcode..." : "Search groceries by name, SKU or barcode..."}
              />
            </label>
            <div className="flex flex-wrap items-center gap-3 xl:ml-auto">
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
              {!readOnly && <button
                type="button"
                onClick={openAddGrocery}
                className="inline-flex h-[46px] items-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#214a42]"
              >
                <Plus className="h-4 w-4" />
                Add Grocery
              </button>}
            </div>
          </div>
          {viewMode === 'table' ? (
            <InventoryTable columns={columns} rows={filtered} emptyText="No groceries found." />
          ) : filtered.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product) => (
                <article key={product.product_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex h-36 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
                    {product.image_url
                      ? <img src={inventoryImageUrl(product.image_url)} alt={product.product_name || 'Inventory product'} className="h-full w-full object-cover" />
                      : <Package size={32} />}
                  </div>
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
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge value={product.status || 'Active'} />
                      {!readOnly && (
                        <div className="flex gap-2">
                          <button type="button" className="text-sky-600 hover:text-sky-800" title="View" aria-label={`View ${product.product_name}`} onClick={() => setViewProduct(product)}><Eye size={15} /></button>
                          <button type="button" className="text-amber-600 hover:text-amber-800" title="Edit" aria-label={`Edit ${product.product_name}`} onClick={() => openEditProduct(product)}><Pencil size={15} /></button>
                          <button type="button" className="text-rose-600 hover:text-rose-800" title="Delete" aria-label={`Delete ${product.product_name}`} onClick={() => deleteProduct(product)}><Trash2 size={15} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-xs text-slate-500">SKU</dt><dd className="mt-1 font-medium text-slate-800">{product.sku || '—'}</dd></div>
                    <div><dt className="text-xs text-slate-500">Current Stock</dt><dd className="mt-1 font-medium text-slate-800">{product.current_stock ?? 0}</dd></div>
                    {!readOnly && <div><dt className="text-xs text-slate-500">Reorder Level</dt><dd className="mt-1 font-medium text-slate-800">{product.reorder_level ?? 0}</dd></div>}
                    {!readOnly && <div><dt className="text-xs text-slate-500">Purchase Price</dt><dd className="mt-1 font-medium text-slate-800">{formatCurrency(product.purchase_price)}</dd></div>}
                  </dl>
                  {readOnly && (
                    <button
                      type="button"
                      onClick={() => navigate('/chef/requests', { state: { requestProduct: { id: product.id, name: product.product_name } } })}
                      className="mt-4 w-full rounded-lg bg-[#1a3c36] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#214a42]"
                    >
                      Request this item
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No groceries found.</div>
          )}
        </div>
      </div>

      {!readOnly && viewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setViewProduct(null);
        }}>
          <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="product-details-title">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="product-details-title" className="text-xl font-bold text-slate-900">Product Details</h2>
              <button type="button" onClick={() => setViewProduct(null)} aria-label="Close product details" className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-600">×</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-500">
                {viewProduct.image_url ? <img src={inventoryImageUrl(viewProduct.image_url)} alt={viewProduct.product_name} className="h-full w-full object-cover" /> : <Package size={32} />}
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div><dt className="text-slate-500">Grocery Name</dt><dd className="font-semibold text-slate-900">{viewProduct.product_name || '—'}</dd></div>
                <div><dt className="text-slate-500">SKU</dt><dd className="font-semibold text-slate-900">{viewProduct.sku || '—'}</dd></div>
                <div><dt className="text-slate-500">Category</dt><dd className="font-semibold text-slate-900">{viewProduct.category_name || '—'}</dd></div>
                <div><dt className="text-slate-500">Unit</dt><dd className="font-semibold text-slate-900">{viewProduct.unit_name || '—'}</dd></div>
                <div><dt className="text-slate-500">Supplier</dt><dd className="font-semibold text-slate-900">{viewProduct.supplier_name || '—'}</dd></div>
                <div><dt className="text-slate-500">Status</dt><dd><StatusBadge value={viewProduct.status || 'Active'} /></dd></div>
                <div><dt className="text-slate-500">Current Stock</dt><dd className="font-semibold text-slate-900">{viewProduct.current_stock ?? 0}</dd></div>
                <div><dt className="text-slate-500">Reorder Level</dt><dd className="font-semibold text-slate-900">{viewProduct.reorder_level ?? 0}</dd></div>
                <div><dt className="text-slate-500">Purchase Price</dt><dd className="font-semibold text-slate-900">{formatCurrency(viewProduct.purchase_price)}</dd></div>
                <div><dt className="text-slate-500">Selling Price</dt><dd className="font-semibold text-slate-900">{formatCurrency(viewProduct.selling_price)}</dd></div>
              </dl>
            </div>
          </section>
        </div>
      )}

      {!readOnly && isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingProductId ? 'Edit Grocery' : 'Add Grocery'}</h2>
              <button type="button" onClick={() => { setIsAddModalOpen(false); setEditingProductId(null); }} className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-600">×</button>
            </div>
            <form className="space-y-3" onSubmit={handleSubmit}>
              <FormField label="Grocery name" required>
                <input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} placeholder="Enter grocery name" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
              </FormField>
              <FormField label="Unit">
                <select value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Select unit</option>
                  {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.unit_name}</option>)}
                </select>
              </FormField>
              <FormField label="Purchase price">
                <input value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} placeholder="0.00" type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </FormField>
              <FormField label="Stock">
                <input value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} placeholder="0" type="number" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" min="0" />
              </FormField>
              <FormField label="Status">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </FormField>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setIsAddModalOpen(false); setEditingProductId(null); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700" disabled={isSavingProduct}>Cancel</button>
                <button type="submit" disabled={isSavingProduct} className="rounded-xl bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{isSavingProduct ? "Saving..." : editingProductId ? "Save Changes" : "Save Product"}</button>
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
      <div>

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
                onClick={() => {
                  resetForm();
                  setEditingRequestId(null);
                  setIsAddModalOpen(true);
                }}
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
      </div>

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
  const [form, setForm] = useState({ purchase_number: 'PUR-1001', supplier_id: '', invoice_number: '', purchase_date: '', notes: '', items: [{ product_id: '', quantity: '1', unit: 'kg', purchase_price: '0', discount: '0', tax: '0' }] });
  const generateInvoiceNumber = (supplierId) => (
    `INV-${supplierId}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  );

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
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-3">
            <FormField label="Purchase number">
              <input value={form.purchase_number} onChange={(e) => setForm({ ...form, purchase_number: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Enter purchase number" />
            </FormField>
            <FormField label="Supplier">
              <select
                value={form.supplier_id}
                onChange={(event) => {
                  const supplierId = event.target.value;
                  setForm((current) => ({
                    ...current,
                    supplier_id: supplierId,
                    invoice_number: supplierId ? generateInvoiceNumber(supplierId) : '',
                  }));
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.supplier_name}</option>)}
              </select>
            </FormField>
            <FormField label="Invoice number">
              <input value={form.invoice_number} readOnly className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" placeholder="Select a supplier to generate" />
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
                    <InventoryUnitField
                      value={item.unit}
                      onChange={(value) => updateItem(index, 'unit', value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </FormField>
                  <FormField label="Price">
                    <input value={item.purchase_price} onChange={(e) => updateItem(index, 'purchase_price', e.target.value)} type="number" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="0.00" />
                  </FormField>
                  <button type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700" onClick={() => setForm((prev) => ({ ...prev, items: prev.items.filter((_, idx) => idx !== index) }))}>Remove</button>
                </div>
              ))}
            </div>
            <button type="button" className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700" onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, { product_id: '', quantity: '1', unit: 'kg', purchase_price: '0', discount: '0', tax: '0' }] }))}>Add Product</button>
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
    </div>
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
  const [requestSearch, setRequestSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [requestSort, setRequestSort] = useState('latest');
  const [requestView, setRequestView] = useState('table');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [viewRequest, setViewRequest] = useState(null);
  const [approvalRequest, setApprovalRequest] = useState(null);
  const [form, setForm] = useState({
    request_number: `KR-${Date.now()}`,
    requested_by: 'Admin',
    department: 'Kitchen',
    request_date: new Date().toISOString().slice(0, 10),
    start_date: '',
    end_date: '',
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
      start_date: '',
      end_date: '',
      priority: 'Normal',
      notes: '',
      items: [{ product_id: '', quantity: '1', unit: 'pcs' }],
    });
  };

  const openEditRequest = (request) => {
    setForm({
      request_number: request.request_number || '',
      requested_by: request.requested_by || '',
      department: request.department || 'Kitchen',
      request_date: formatRequestDate(request.request_date) || new Date().toISOString().slice(0, 10),
      start_date: formatRequestDate(request.start_date),
      end_date: formatRequestDate(request.end_date),
      priority: request.priority || 'Normal',
      notes: request.notes || '',
      items: (request.items || []).map((item) => ({
        product_id: item.product_id ? String(item.product_id) : '',
        quantity: String(item.quantity ?? 1),
        unit: item.unit || 'pcs',
      })),
    });
    setEditingRequestId(request.id);
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      toast.error('End date cannot be before the start date.');
      return;
    }

    const validItems = form.items.filter((item) => item.product_id && Number(item.quantity || 0) > 0);
    if (!validItems.length) {
      toast.error('Select at least one product and quantity for the kitchen request.');
      return;
    }

    try {
      const payload = {
        ...form,
        request_date: form.request_date || new Date().toISOString().slice(0, 10),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        requested_by: form.requested_by || 'Admin',
        items: validItems.map((item) => ({
          ...item,
          product_id: Number(item.product_id),
          quantity: Number(item.quantity || 0),
        })),
      };
      if (editingRequestId) {
        await api.put(`/inventory/kitchen-requests/${editingRequestId}`, payload);
      } else {
        await api.post('/inventory/kitchen-requests', payload);
      }

      toast.success(editingRequestId ? 'Kitchen request updated successfully.' : 'Kitchen request sent successfully.');
      setIsAddModalOpen(false);
      setEditingRequestId(null);
      resetForm();
      await fetchRequests();
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || `Unable to ${editingRequestId ? 'update' : 'create'} kitchen request.`);
    }
  };

  const deleteRequest = async (request) => {
    if (!window.confirm(`Delete kitchen request "${request.request_number}"?`)) return;
    try {
      await api.delete(`/inventory/kitchen-requests/${request.id}`);
      toast.success('Kitchen request deleted successfully.');
      await fetchRequests();
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to delete kitchen request.');
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
    const canEditDelete = ['Pending', 'Rejected'].includes(status);
    let workflowAction = <span className="text-xs text-slate-500">No action</span>;

    if (status === 'Pending') {
      workflowAction = (
        <>
          <button type="button" onClick={() => setApprovalRequest(request)} className="rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white">Approve</button>
          <button type="button" onClick={() => handleRequestAction(request.id, 'reject')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">Reject</button>
        </>
      );
    }

    if (status === 'Approved') {
      workflowAction = <button type="button" onClick={() => handleRequestAction(request.id, 'issue')} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white">Issue Stock</button>;
    }

    if (status === 'Issued') {
      workflowAction = <button type="button" onClick={() => handleRequestAction(request.id, 'complete')} className="rounded-lg bg-[#1a3c36] px-2.5 py-1.5 text-xs font-semibold text-white">Complete</button>;
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        {workflowAction}
        <button type="button" onClick={() => setViewRequest(request)} className="rounded-lg border border-slate-200 p-1.5 text-sky-600 hover:bg-sky-50" title="View" aria-label={`View ${request.request_number}`}><Eye size={15} /></button>
        {canEditDelete && (
          <>
            <button type="button" onClick={() => openEditRequest(request)} className="rounded-lg border border-slate-200 p-1.5 text-amber-600 hover:bg-amber-50" title="Edit" aria-label={`Edit ${request.request_number}`}><Pencil size={15} /></button>
            <button type="button" onClick={() => deleteRequest(request)} className="rounded-lg border border-slate-200 p-1.5 text-rose-600 hover:bg-rose-50" title="Delete" aria-label={`Delete ${request.request_number}`}><Trash2 size={15} /></button>
          </>
        )}
      </div>
    );
  };

  const pendingCount = requests.filter(r => (r.status || 'Pending') === 'Pending').length;
  const approvedCount = requests.filter(r => r.status === 'Approved').length;
  const completedCount = requests.filter(r => r.status === 'Completed').length;
  const filteredRequests = requests.filter((request) => {
    const searchValue = requestSearch.trim().toLowerCase();
    const matchesSearch = !searchValue || [request.request_number, request.requested_by, request.notes]
      .some((value) => String(value || '').toLowerCase().includes(searchValue));
    const matchesStatus = statusFilter === 'All' || (request.status || 'Pending') === statusFilter;
    const matchesPriority = priorityFilter === 'All' || (request.priority || 'Normal') === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  }).sort((first, second) => {
    const dateDifference = String(first.request_date || '').localeCompare(String(second.request_date || ''));
    return requestSort === 'latest' ? -dateDifference : dateDifference;
  });

  const kitchenCards = [
    { title: "Total Requests", value: requests.length, icon: ClipboardList, bg: "bg-[#22c55e]", hint: "All kitchen requests" },
    { title: "Pending", value: pendingCount, icon: CalendarClock, bg: "bg-[#f59e0b]", hint: "Awaiting approval" },
    { title: "Approved", value: approvedCount, icon: UtensilsCrossed, bg: "bg-[#3b82f6]", hint: "Ready to issue stock" },
    { title: "Completed", value: completedCount, icon: Boxes, bg: "bg-[#8b5cf6]", hint: "Fulfilled requests" },
  ];

  return (
    <>
      <div>

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
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center">
            <label className="relative block min-w-0 flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={requestSearch}
                onChange={(event) => setRequestSearch(event.target.value)}
                placeholder="Search request number, requester, or notes..."
                aria-label="Search kitchen requests"
                className="h-[52px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-3 text-sm outline-none focus:border-[#1a3c36]"
              />
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:flex">
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                aria-label="Filter by priority"
                className="h-[52px] min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#1a3c36] xl:w-[170px]"
              >
                <option value="All">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by status"
                className="h-[52px] min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#1a3c36] xl:w-[170px]"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Issued">Issued</option>
                <option value="Completed">Completed</option>
              </select>
              <select
                value={requestSort}
                onChange={(event) => setRequestSort(event.target.value)}
                aria-label="Sort kitchen requests"
                className="col-span-2 h-[52px] min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#1a3c36] sm:col-span-1 xl:w-[180px]"
              >
                <option value="latest">Sort by: Latest</option>
                <option value="oldest">Sort by: Oldest</option>
              </select>
            </div>
            <div className="flex h-[52px] shrink-0 items-stretch overflow-hidden rounded-xl border border-slate-200" role="group" aria-label="Request display mode">
              <button
                type="button"
                onClick={() => setRequestView('grid')}
                aria-label="Grid view"
                aria-pressed={requestView === 'grid'}
                className={`flex w-14 items-center justify-center ${requestView === 'grid' ? 'bg-[#1a3c36] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <LayoutGrid size={19} />
              </button>
              <button
                type="button"
                onClick={() => setRequestView('table')}
                aria-label="Table view"
                aria-pressed={requestView === 'table'}
                className={`flex w-14 items-center justify-center border-l border-slate-200 ${requestView === 'table' ? 'bg-[#1a3c36] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                <Table2 size={19} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1a3c36] px-5 text-sm font-semibold text-white hover:bg-[#244e45]"
            >
              <Plus size={18} />
              Add Kitchen Request
            </button>
          </div>
          {requestView === 'table' ? (
            <InventoryTable columns={[
              { key: 'request_number', label: 'Request No.' },
              { key: 'requested_by', label: 'Requested By' },
              { key: 'request_date', label: 'Period', render: (row) => formatRequestPeriod(row) },
              { key: 'priority', label: 'Priority' },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status || 'Pending'} /> },
              { key: 'notes', label: 'Notes', render: (row) => <span className="max-w-xs text-slate-600">{row.notes || '—'}</span> },
              { key: 'actions', label: 'Action', render: (row) => getRequestActions(row) },
            ]} rows={filteredRequests} emptyText={requests.length ? 'No requests match these filters.' : 'No kitchen requests created yet.'} />
          ) : filteredRequests.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredRequests.map((request) => (
                <article key={request.id} className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-slate-900">{request.request_number}</h2>
                      <p className="mt-1 text-sm text-slate-500">{request.requested_by || 'Unknown requester'}</p>
                    </div>
                    <StatusBadge value={request.status || 'Pending'} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-xs text-slate-500">Request period</dt><dd className="mt-1 text-slate-800">{formatRequestPeriod(request)}</dd></div>
                    <div><dt className="text-xs text-slate-500">Priority</dt><dd className="mt-1 text-slate-800">{request.priority || 'Normal'}</dd></div>
                  </dl>
                  <p className="mt-3 min-h-10 text-sm text-slate-600">{request.notes || 'No notes'}</p>
                  <div className="mt-4 border-t border-slate-100 pt-3">{getRequestActions(request)}</div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              {requests.length ? 'No requests match these filters.' : 'No kitchen requests created yet.'}
            </div>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingRequestId ? 'Edit Kitchen Request' : 'Add Kitchen Request'}</h2>
              <button type="button" onClick={() => { setIsAddModalOpen(false); setEditingRequestId(null); resetForm(); }} className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-600">×</button>
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
                <FormField label="Start date">
                  <input type="date" value={form.start_date} max={form.end_date || undefined} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </FormField>
                <FormField label="End date">
                  <input type="date" value={form.end_date} min={form.start_date || undefined} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
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
                <button type="button" onClick={() => { setIsAddModalOpen(false); setEditingRequestId(null); resetForm(); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
                <button type="submit" className="rounded-xl bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white">{editingRequestId ? 'Save Changes' : 'Send Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setViewRequest(null);
        }}>
          <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="kitchen-request-details-title">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="kitchen-request-details-title" className="text-xl font-bold text-slate-900">Kitchen Request Details</h2>
              <button type="button" onClick={() => setViewRequest(null)} aria-label="Close request details" className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-600">×</button>
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Request number</dt><dd className="font-semibold text-slate-900">{viewRequest.request_number || '—'}</dd></div>
              <div><dt className="text-slate-500">Status</dt><dd><StatusBadge value={viewRequest.status || 'Pending'} /></dd></div>
              <div><dt className="text-slate-500">Requested by</dt><dd className="font-semibold text-slate-900">{viewRequest.requested_by || '—'}</dd></div>
              <div><dt className="text-slate-500">Department</dt><dd className="font-semibold text-slate-900">{viewRequest.department || '—'}</dd></div>
              <div><dt className="text-slate-500">Request period</dt><dd className="font-semibold text-slate-900">{formatRequestPeriod(viewRequest)}</dd></div>
              <div><dt className="text-slate-500">Priority</dt><dd className="font-semibold text-slate-900">{viewRequest.priority || 'Normal'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">Notes</dt><dd className="font-semibold text-slate-900">{viewRequest.notes || '—'}</dd></div>
            </dl>
            <div className="mt-5">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Requested items</h3>
              {viewRequest.items?.length ? (
                <InventoryTable columns={[
                  { key: 'item_name', label: 'Product', render: (item) => item.item_name || item.product_name || products.find((product) => product.id === item.product_id)?.product_name || 'Unknown product' },
                  { key: 'quantity', label: 'Quantity' },
                  { key: 'unit', label: 'Unit' },
                ]} rows={viewRequest.items} emptyText="No request items." />
              ) : (
                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">No request items.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {approvalRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setApprovalRequest(null);
        }}>
          <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="approve-kitchen-request-title">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="approve-kitchen-request-title" className="text-xl font-bold text-slate-900">Approve Kitchen Request</h2>
                <p className="mt-1 text-sm text-slate-500">{approvalRequest.request_number}</p>
              </div>
              <button type="button" onClick={() => setApprovalRequest(null)} aria-label="Close approval confirmation" className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-600">×</button>
            </div>
            <p className="mb-3 text-sm text-slate-700">Confirm the requested stock details before approving:</p>
            {approvalRequest.items?.length ? (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {approvalRequest.items.map((item) => (
                  <li key={item.id || `${item.product_id}-${item.quantity}`} className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm">
                    <span className="font-medium text-slate-800">{item.item_name || item.product_name || products.find((product) => product.id === item.product_id)?.product_name || 'Unknown product'}</span>
                    <span className="shrink-0 text-slate-600">{formatNumber(item.quantity)} {item.unit || 'pcs'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">No stock items are listed for this request.</p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setApprovalRequest(null)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  const requestId = approvalRequest.id;
                  setApprovalRequest(null);
                  await handleRequestAction(requestId, 'approve');
                }}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Confirm Approval
              </button>
            </div>
          </section>
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

export function InventoryStockReadOnly() {
  return (
    <InventoryContext>
      <ProductsPage readOnly />
    </InventoryContext>
  );
}
