import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, Check, ClipboardList, Eye, LayoutGrid, Package, Pencil, Plus, Search, Table2, Trash2, TrendingDown, TrendingUp, X, XCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import api, { BACKEND_BASE_URL } from '../api';
import { useAuth } from '../PrivateRouter/AuthContext';

const PAGE_SIZE = 10;
const MATERIALS = ['Stainless Steel', 'Plastic', 'Ceramic', 'Glass', 'Melamine', 'Paper'];
const UNITS = ['Pieces', 'Sets', 'Packs', 'Boxes', 'Dozens'];
const EMPTY_FORM = {
  item_name: '',
  item_code: '',
  category: '',
  image_url: '',
  material: 'Stainless Steel',
  unit: 'Pieces',
  current_stock: '0',
  purchase_price: '0',
  description: '',
};

const getStatus = (item) => {
  const stock = Number(item.current_stock) || 0;
  if (stock <= 0) return 'Out of Stock';
  if (stock <= Number(item.minimum_stock || 0)) return 'Low Stock';
  return 'Available';
};

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
}).format(Number(value || 0));

const imageUrl = (value) => {
  if (!value) return '';
  return /^(https?:\/\/|data:|blob:)/i.test(value)
    ? value
    : `${BACKEND_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
};

const emptyMovement = (type) => ({
  type,
  quantity: '',
  date: new Date().toISOString().slice(0, 10),
  remarks: '',
});

const getRequestItems = (request) => request.items?.length
  ? request.items
  : [{ item_id: request.item_id, item_name: request.item_name, unit: request.unit, quantity: request.requested_quantity }];

export default function ServerSupplies() {
  const { role } = useAuth();
  const isAdmin = ['admin', 'super admin', 'superadmin'].includes(String(role || '').trim().toLowerCase());
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [requestSearch, setRequestSearch] = useState('');
  const [requestStatus, setRequestStatus] = useState('All');
  const [requesterFilter, setRequesterFilter] = useState('All');
  const [requestSort, setRequestSort] = useState('latest');
  const [requestView, setRequestView] = useState('table');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imageInputKey, setImageInputKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [viewingItem, setViewingItem] = useState(null);
  const [movements, setMovements] = useState([]);
  const [movementItem, setMovementItem] = useState(null);
  const [movementForm, setMovementForm] = useState(emptyMovement('in'));
  const [savingMovement, setSavingMovement] = useState(false);
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [requestItem, setRequestItem] = useState(null);
  const [requestForm, setRequestForm] = useState({ quantity: '', remarks: '' });
  const [requestLines, setRequestLines] = useState([]);
  const [requestCustomMode, setRequestCustomMode] = useState(false);
  const [requestCustomName, setRequestCustomName] = useState('');
  const [requestCustomUnit, setRequestCustomUnit] = useState(UNITS[0]);
  const [savingRequest, setSavingRequest] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsResponse, categoriesResponse, requestsResponse] = await Promise.all([
        api.get('/server-supplies'),
        api.get('/server-supplies/categories'),
        api.get('/server-supplies/requests'),
      ]);
      setItems(itemsResponse.data?.data || []);
      setCategories(categoriesResponse.data?.data || []);
      setRequests(requestsResponse.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to load serving supplies.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const categoryName = (category) => category.category_name || category.name || String(category);
  const filteredItems = useMemo(() => items.filter((item) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [item.item_name, item.item_code]
      .some((value) => String(value || '').toLowerCase().includes(query));
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || (item.status || getStatus(item)) === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  }), [items, search, selectedCategory, selectedStatus]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const itemsByCategory = useMemo(() => {
    const groups = new Map();
    items.forEach((item) => {
      if (!groups.has(item.category)) groups.set(item.category, []);
      groups.get(item.category).push(item);
    });
    return [...groups.entries()];
  }, [items]);
  const requesters = [...new Set(requests.map((request) => request.requested_by).filter(Boolean))];
  const filteredRequests = useMemo(() => {
    const query = requestSearch.trim().toLowerCase();
    return requests
      .filter((request) => {
        const matchesSearch = !query || [
          request.id,
          request.requested_by,
          request.remarks,
          ...getRequestItems(request).flatMap((item) => [item.item_name, item.item_code]),
        ].some((value) => String(value || '').toLowerCase().includes(query));
        const matchesStatus = requestStatus === 'All' || request.status === requestStatus.toLowerCase();
        const matchesRequester = requesterFilter === 'All' || request.requested_by === requesterFilter;
        return matchesSearch && matchesStatus && matchesRequester;
      })
      .sort((a, b) => {
        const difference = new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime();
        return requestSort === 'latest' ? -difference : difference;
      });
  }, [requests, requestSearch, requestStatus, requesterFilter, requestSort]);
  const lowStockCount = items.filter((item) => getStatus(item) === 'Low Stock').length;
  const outOfStockCount = items.filter((item) => getStatus(item) === 'Out of Stock').length;
  const availableStock = items.reduce((total, item) => total + (Number(item.current_stock) || 0), 0);
  const categoryCounts = categories.map((category) => {
    const name = categoryName(category);
    return { name, count: items.filter((item) => item.category === name).length };
  });

  const openAddForm = () => {
    setEditingItem(null);
    setForm({ ...EMPTY_FORM, category: categoryName(categories[0] || { name: '' }) });
    setImageFile(null);
    setFormOpen(true);
  };

  const openEditForm = (item) => {
    setEditingItem(item);
    setForm({
      ...EMPTY_FORM,
      ...item,
      current_stock: String(item.current_stock ?? 0),
      purchase_price: String(item.purchase_price ?? 0),
    });
    setImageFile(null);
    setFormOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const addAnother = event.nativeEvent.submitter?.value === 'add-another' && !editingItem;
    const stock = Number(form.current_stock);
    const price = Number(form.purchase_price);
    if (![stock, price].every(Number.isFinite) || stock < 0 || price < 0) {
      toast.error('Stock and purchase price must be zero or greater.');
      return;
    }

    setSaving(true);
    try {
      let uploadedImage = form.image_url;
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('folder', 'server_supplies');
        uploadData.append('file', imageFile);
        const uploadResponse = await api.post('/upload', uploadData);
        uploadedImage = uploadResponse.data?.url;
        if (!uploadedImage) throw new Error('Image upload did not return a file URL.');
      }
      const payload = {
        ...form,
        image_url: uploadedImage || null,
        current_stock: stock,
        purchase_price: price,
      };
      if (editingItem) {
        await api.put(`/server-supplies/${editingItem.id}`, payload);
        toast.success('Supply item updated.');
      } else {
        await api.post('/server-supplies', payload);
        toast.success('Supply item added.');
      }
      setImageFile(null);
      setImageInputKey((key) => key + 1);
      if (addAnother) {
        setForm({ ...EMPTY_FORM, category: form.category });
      } else {
        setFormOpen(false);
      }
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || 'Unable to save supply item.');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.item_name}"?`)) return;
    try {
      await api.delete(`/server-supplies/${item.id}`);
      toast.success('Supply item deleted.');
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to delete supply item.');
    }
  };

  const openItemDetails = async (item) => {
    setViewingItem(item);
    setMovements([]);
    try {
      const response = await api.get(`/server-supplies/${item.id}/movements`);
      setMovements(response.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to load stock movement history.');
    }
  };

  const saveMovement = async (event) => {
    event.preventDefault();
    const quantity = Number(movementForm.quantity);
    if (!movementItem || !Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Enter a quantity greater than zero.');
      return;
    }
    setSavingMovement(true);
    try {
      await api.post(`/server-supplies/${movementItem.id}/stock-${movementForm.type}`, {
        quantity,
        date: movementForm.date,
        remarks: movementForm.remarks,
      });
      toast.success(movementForm.type === 'in' ? 'Stock received.' : 'Stock usage recorded.');
      setMovementItem(null);
      await loadData();
      if (viewingItem?.id === movementItem.id) await openItemDetails({ ...viewingItem });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to update supply stock.');
    } finally {
      setSavingMovement(false);
    }
  };

  const submitSupplyRequest = async (event) => {
    event.preventDefault();
    if (!requestLines.length) {
      toast.error('Add at least one supply item to the request.');
      return;
    }
    setSavingRequest(true);
    try {
      await api.post('/server-supplies/requests', {
        items: requestLines.map((line) => line.is_custom
          ? { is_custom: true, item_name: line.item_name, unit: line.unit, quantity: line.quantity }
          : { item_id: line.item.id, quantity: line.quantity }),
        remarks: requestForm.remarks,
      });
      toast.success('Request sent to Admin for approval.');
      setRequestFormOpen(false);
      setRequestItem(null);
      setRequestForm({ quantity: '', remarks: '' });
      setRequestLines([]);
      setRequestCustomMode(false);
      setRequestCustomName('');
      setRequestCustomUnit(UNITS[0]);
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to submit supply request.');
    } finally {
      setSavingRequest(false);
    }
  };

  const openRequestForm = (item = null) => {
    setRequestItem(item);
    setRequestForm({ quantity: '', remarks: '' });
    setRequestLines([]);
    setRequestCustomMode(false);
    setRequestCustomName('');
    setRequestCustomUnit(UNITS[0]);
    setRequestFormOpen(true);
  };

  const closeRequestForm = () => {
    setRequestFormOpen(false);
    setRequestItem(null);
    setRequestForm({ quantity: '', remarks: '' });
    setRequestLines([]);
    setRequestCustomMode(false);
    setRequestCustomName('');
    setRequestCustomUnit(UNITS[0]);
  };

  const addRequestLine = () => {
    const quantity = Number(requestForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error('Enter a quantity greater than zero.');
      return;
    }
    if (requestCustomMode) {
      const itemName = requestCustomName.trim();
      if (!itemName) {
        toast.error('Enter a name for the custom supply item.');
        return;
      }
      if (requestLines.some((line) => line.is_custom && line.item_name.toLowerCase() === itemName.toLowerCase())) {
        toast.error('This custom item is already in the request.');
        return;
      }
      setRequestLines((lines) => [...lines, {
        is_custom: true,
        item_name: itemName,
        unit: requestCustomUnit,
        quantity,
      }]);
      setRequestCustomName('');
      setRequestForm((formState) => ({ ...formState, quantity: '' }));
      return;
    }
    if (!requestItem) {
      toast.error('Select a supply item.');
      toast.error('Select a supply item and enter a quantity greater than zero.');
      return;
    }
    if (requestLines.some((line) => !line.is_custom && line.item.id === requestItem.id)) {
      toast.error('This supply item is already in the request.');
      return;
    }
    setRequestLines((lines) => [...lines, {
      item: requestItem,
      item_name: requestItem.item_name,
      unit: requestItem.unit,
      quantity,
      is_custom: false,
    }]);
    setRequestItem(null);
    setRequestForm((formState) => ({ ...formState, quantity: '' }));
  };

  const decideRequest = async (request, decision) => {
    const approved = decision === 'approve';
    const reason = approved
      ? ''
      : window.prompt(`Enter a reason for rejecting the request for ${request.item_name}:`);
    if (!approved && (reason === null || !reason.trim())) {
      if (reason !== null) toast.error('A rejection reason is required.');
      return;
    }
    const requestSummary = getRequestItems(request).map((item) => `${item.item_name}: ${item.quantity} ${item.unit}`).join(', ');
    if (approved && !window.confirm(`Approve ${requestSummary}? Stock will be updated.`)) return;
    setProcessingRequestId(request.id);
    try {
      await api.patch(`/server-supplies/requests/${request.id}/${decision === 'approve' ? 'approve' : 'reject'}`, { reason });
      toast.success(approved ? 'Request approved and stock updated.' : 'Request rejected.');
      await loadData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to process supply request.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const statusClass = (status) => {
    if (status === 'Available') return 'bg-emerald-50 text-emerald-700';
    if (status === 'Low Stock') return 'bg-amber-50 text-amber-700';
    return 'bg-rose-50 text-rose-700';
  };

  const renderStatus = (item) => {
    const status = item.status || getStatus(item);
    return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(status)}`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{isAdmin ? 'Admin Workspace' : 'Server Workspace'}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Serving Supplies</h1>
          <p className="mt-1 text-sm text-slate-500">{isAdmin ? 'Review server requests and manage dining supply inventory.' : 'Browse supplies and request stock. Inventory changes after Admin approval.'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isAdmin && <button type="button" onClick={() => openRequestForm()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-sm font-semibold text-white hover:bg-[#214a42]">
            <Plus size={17} /> Request Supplies
          </button>}
          {isAdmin && <button type="button" onClick={openAddForm} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-sm font-semibold text-white hover:bg-[#214a42]">
            <Plus size={17} /> Add Supply Item
          </button>}
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Supply Items', value: items.length.toLocaleString('en-IN'), detail: 'in the supply catalog', badge: 'Items', icon: Boxes, tone: 'bg-white/20 text-white', surface: 'bg-[#22c55e] border-transparent text-white' },
          { label: 'Available Stock', value: availableStock.toLocaleString('en-IN'), detail: 'units currently available', badge: 'Units', icon: Package, tone: 'bg-white/20 text-white', surface: 'bg-[#3b82f6] border-transparent text-white' },
          { label: 'Low Stock Items', value: lowStockCount.toLocaleString('en-IN'), detail: 'need attention', badge: 'Low', icon: AlertTriangle, tone: 'bg-white/20 text-white', surface: 'bg-[#f59e0b] border-transparent text-white' },
          { label: 'Out of Stock Items', value: outOfStockCount.toLocaleString('en-IN'), detail: 'need restocking', badge: 'Empty', icon: TrendingDown, tone: 'bg-white/20 text-white', surface: 'bg-[#8b5cf6] border-transparent text-white' },
        ].map(({ label, value, detail, badge, icon: Icon, tone, surface }) => (
          <article key={label} className={`relative flex min-h-[140px] min-w-0 flex-col justify-between overflow-hidden rounded-xl border p-4 text-white shadow-[0_2px_10px_rgba(20,56,34,0.04)] sm:p-5 ${surface}`}>
            <div className="relative z-10 flex items-start gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm ${tone}`}><Icon size={24} strokeWidth={2.2} /></div>
              <div className="mt-0.5 min-w-0 flex-1">
                <h2 className="mb-1 truncate text-[12px] font-semibold opacity-90">{label}</h2>
                <p className="truncate text-[22px] font-extrabold leading-none tracking-tight sm:text-[25px]">{value}</p>
              </div>
            </div>
            <div className="relative z-10 mt-5 flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-white/25 px-1.5 py-0.5 text-[11px] font-bold">{badge}</span>
              <span className="truncate text-[11px] font-medium opacity-75">{detail}</span>
            </div>
            <div className="pointer-events-none absolute bottom-0 right-0 h-16 w-24 opacity-50">
              <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="h-full w-full">
                <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="white" strokeWidth="2.5" />
              </svg>
            </div>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><ClipboardList size={19} />{isAdmin ? 'Supply Requests' : 'My Supply Requests'}</h2>
            <p className="mt-1 text-sm text-slate-500">{isAdmin ? 'Approve a request to add the quantity to inventory, or reject it with a reason.' : 'Requests are sent to Admin. Stock is not changed until approved.'}</p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">{requests.filter((request) => request.status === 'pending').length} pending</span>
        </div>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={requestSearch}
              onChange={(event) => setRequestSearch(event.target.value)}
              placeholder="Search request number, item, requester, or remarks..."
              aria-label="Search supply requests"
              className="h-[52px] w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-3 text-sm outline-none focus:border-[#1a3c36]"
            />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:flex">
            <select value={requesterFilter} onChange={(event) => setRequesterFilter(event.target.value)} aria-label="Filter by requester" className="h-[52px] min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#1a3c36] xl:w-[170px]">
              <option value="All">All Requesters</option>
              {requesters.map((requester) => <option key={requester} value={requester}>{requester}</option>)}
            </select>
            <select value={requestStatus} onChange={(event) => setRequestStatus(event.target.value)} aria-label="Filter by request status" className="h-[52px] min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#1a3c36] xl:w-[170px]">
              <option value="All">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={requestSort} onChange={(event) => setRequestSort(event.target.value)} aria-label="Sort supply requests" className="col-span-2 h-[52px] min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#1a3c36] sm:col-span-1 xl:w-[180px]">
              <option value="latest">Sort by: Latest</option>
              <option value="oldest">Sort by: Oldest</option>
            </select>
          </div>
          <div className="flex h-[52px] shrink-0 items-stretch overflow-hidden rounded-xl border border-slate-200" role="group" aria-label="Request display mode">
            <button type="button" onClick={() => setRequestView('grid')} aria-label="Grid view" aria-pressed={requestView === 'grid'} className={`flex w-14 items-center justify-center ${requestView === 'grid' ? 'bg-[#1a3c36] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}><LayoutGrid size={19} /></button>
            <button type="button" onClick={() => setRequestView('table')} aria-label="Table view" aria-pressed={requestView === 'table'} className={`flex w-14 items-center justify-center border-l border-slate-200 ${requestView === 'table' ? 'bg-[#1a3c36] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}><Table2 size={19} /></button>
          </div>
          {!isAdmin && <button type="button" onClick={() => openRequestForm()} className="inline-flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1a3c36] px-5 text-sm font-semibold text-white hover:bg-[#244e45]">
            <Plus size={18} /> Request Supplies
          </button>}
        </div>
        {requests.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">{isAdmin ? 'There are no supply requests yet.' : 'You have not submitted any supply requests yet.'}</p>
        ) : filteredRequests.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No supply requests match these filters.</p>
        ) : requestView === 'table' ? (
          <div className="scrollbar-hide overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>{['Requested Items', ...(isAdmin ? ['Requested By'] : []), 'Remarks', 'Status', 'Date', ...(isAdmin ? ['Actions'] : ['Decision'])].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="space-y-1">{getRequestItems(request).map((item) => <p key={item.item_id} className="font-semibold text-slate-900">{item.item_name} <span className="font-normal text-slate-600">· {item.unit} · Qty {item.quantity}</span></p>)}</div>
                    </td>
                    {isAdmin && <td className="px-4 py-3 text-slate-600">{request.requested_by}</td>}
                    <td className="max-w-56 truncate px-4 py-3 text-slate-600" title={request.remarks || ''}>{request.remarks || '—'}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${request.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : request.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{request.status}</span></td>
                    <td className="px-4 py-3 text-slate-600">{String(request.requested_at || '').slice(0, 10)}</td>
                    {isAdmin ? (
                      <td className="px-4 py-3">
                        {request.status === 'pending' ? <div className="flex gap-1">
                          <button type="button" disabled={processingRequestId === request.id} onClick={() => decideRequest(request, 'approve')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-50"><Check size={14} /> Approve</button>
                          <button type="button" disabled={processingRequestId === request.id} onClick={() => decideRequest(request, 'reject')} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-50"><XCircle size={14} /> Reject</button>
                        </div> : <span className="text-xs text-slate-500">{request.decided_by || '—'}{request.decision_reason ? ` · ${request.decision_reason}` : ''}</span>}
                      </td>
                    ) : (
                      <td className="max-w-56 truncate px-4 py-3 text-slate-600" title={request.decision_reason || ''}>{request.decision_reason || (request.status === 'pending' ? 'Awaiting Admin approval' : '—')}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRequests.map((request) => (
              <article key={request.id} className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="font-semibold text-slate-900">{getRequestItems(request).length} item{getRequestItems(request).length === 1 ? '' : 's'}</h3><p className="mt-1 text-xs text-slate-500">Request #{request.id}{isAdmin ? ` · ${request.requested_by}` : ''}</p></div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${request.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : request.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{request.status}</span>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-slate-700">
                  {getRequestItems(request).map((item) => <li key={item.item_id}><strong>{item.item_name}</strong> · {item.unit} · Qty {item.quantity}</li>)}
                </ul>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{request.remarks || 'No remarks'}</p>
                <p className="mt-2 text-xs text-slate-500">{String(request.requested_at || '').slice(0, 10)}</p>
                <div className="mt-3 border-t border-slate-100 pt-3">
                  {isAdmin && request.status === 'pending' ? <div className="flex gap-2">
                    <button type="button" disabled={processingRequestId === request.id} onClick={() => decideRequest(request, 'approve')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-50"><Check size={14} /> Approve</button>
                    <button type="button" disabled={processingRequestId === request.id} onClick={() => decideRequest(request, 'reject')} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-50"><XCircle size={14} /> Reject</button>
                  </div> : isAdmin ? <p className="text-xs text-slate-500">{request.decided_by || '—'}{request.decision_reason ? ` · ${request.decision_reason}` : ''}</p> : <p className="text-xs text-slate-500">{request.decision_reason || (request.status === 'pending' ? 'Awaiting Admin approval' : '—')}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold text-slate-900">Supply Categories</h2><p className="text-sm text-slate-500">Browse the serving and dining supply catalog.</p></div>
          <button type="button" onClick={() => { setSelectedCategory('All'); setPage(1); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${selectedCategory === 'All' ? 'bg-[#1a3c36] text-white' : 'border border-slate-200 text-slate-600'}`}>All</button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {categoryCounts.map(({ name, count }) => (
            <button key={name} type="button" onClick={() => { setSelectedCategory(selectedCategory === name ? 'All' : name); setPage(1); }} className={`rounded-xl border p-3 text-left transition ${selectedCategory === name ? 'border-[#1a3c36] bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}>
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#1a3c36]"><Package size={15} /></span>{name}</span><span className="mt-1 block text-xs text-slate-500">{count} items</span>
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by item name or code..." className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-[#1a3c36]" />
          </label>
          <select aria-label="Filter by category" value={selectedCategory} onChange={(event) => { setSelectedCategory(event.target.value); setPage(1); }} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700">
            <option value="All">All Categories</option>
            {categories.map((category) => <option key={category.id || categoryName(category)} value={categoryName(category)}>{categoryName(category)}</option>)}
          </select>
          <select aria-label="Filter by stock status" value={selectedStatus} onChange={(event) => { setSelectedStatus(event.target.value); setPage(1); }} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700">
            <option value="All">All Stock Status</option><option value="Available">Available</option><option value="Low Stock">Low Stock</option><option value="Out of Stock">Out of Stock</option>
          </select>
        </div>

        {loading ? <div className="p-12 text-center text-sm text-slate-500">Loading supply inventory…</div> : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">No supply items found.</div>
        ) : (
          <>
            <div className="scrollbar-hide hidden overflow-x-auto lg:block">
              <table className="min-w-[1180px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>{['Image', 'Item Name', 'Item Code', 'Category', 'Material', 'Current Stock', 'Unit', 'Purchase Price', 'Stock Status', 'Actions'].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr>
                </thead>
                <tbody>
                  {pageItems.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-3"><div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-slate-100">{item.image_url ? <img src={imageUrl(item.image_url)} alt={item.item_name} className="h-full w-full object-cover" /> : <Package size={18} className="text-slate-400" />}</div></td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{item.item_name}</td><td className="px-4 py-3 font-mono text-slate-600">{item.item_code}</td><td className="px-4 py-3">{item.category}</td><td className="px-4 py-3">{item.material}</td><td className="px-4 py-3 font-semibold">{item.current_stock}</td><td className="px-4 py-3">{item.unit}</td><td className="px-4 py-3">{formatCurrency(item.purchase_price)}</td><td className="px-4 py-3">{renderStatus(item)}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1">
                        {isAdmin ? <>
                          <button type="button" title="View and movement history" aria-label={`View ${item.item_name}`} onClick={() => openItemDetails(item)} className="rounded-lg p-2 text-sky-700 hover:bg-sky-50"><Eye size={16} /></button>
                          <button type="button" title="Stock in" aria-label={`Receive stock for ${item.item_name}`} onClick={() => { setMovementItem(item); setMovementForm(emptyMovement('in')); }} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50"><TrendingUp size={16} /></button>
                          <button type="button" title="Stock out" aria-label={`Record usage for ${item.item_name}`} onClick={() => { setMovementItem(item); setMovementForm(emptyMovement('out')); }} className="rounded-lg p-2 text-amber-700 hover:bg-amber-50"><TrendingDown size={16} /></button>
                          <button type="button" title="Edit" aria-label={`Edit ${item.item_name}`} onClick={() => openEditForm(item)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Pencil size={16} /></button>
                          <button type="button" title="Delete" aria-label={`Delete ${item.item_name}`} onClick={() => deleteItem(item)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button>
                        </> : <>
                          <button type="button" title="Request stock" aria-label={`Request stock for ${item.item_name}`} onClick={() => openRequestForm(item)} className="inline-flex items-center gap-1 rounded-lg bg-[#1a3c36] px-2.5 py-2 text-xs font-semibold text-white hover:bg-[#214a42]"><Plus size={14} /> Request</button>
                          <button type="button" title="View item details" aria-label={`View ${item.item_name}`} onClick={() => openItemDetails(item)} className="rounded-lg p-2 text-sky-700 hover:bg-sky-50"><Eye size={16} /></button>
                        </>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-4 lg:hidden">
              {pageItems.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">{item.image_url ? <img src={imageUrl(item.image_url)} alt={item.item_name} className="h-full w-full object-cover" /> : <Package size={20} className="text-slate-400" />}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-900">{item.item_name}</h3>{renderStatus(item)}</div>
                      <p className="mt-1 text-xs text-slate-500">{item.item_code} · {item.category}</p>
                      <p className="mt-2 text-sm text-slate-700">Stock: <strong>{item.current_stock} {item.unit}</strong> · {item.material}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatCurrency(item.purchase_price)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2">
                    {isAdmin ? <>
                      <button type="button" onClick={() => openItemDetails(item)} title="View and movement history" className="rounded-lg p-2 text-sky-700 hover:bg-sky-50"><Eye size={17} /></button>
                      <button type="button" onClick={() => { setMovementItem(item); setMovementForm(emptyMovement('in')); }} title="Stock in" className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50"><TrendingUp size={17} /></button>
                      <button type="button" onClick={() => { setMovementItem(item); setMovementForm(emptyMovement('out')); }} title="Stock out" className="rounded-lg p-2 text-amber-700 hover:bg-amber-50"><TrendingDown size={17} /></button>
                      <button type="button" onClick={() => openEditForm(item)} title="Edit" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Pencil size={17} /></button>
                      <button type="button" onClick={() => deleteItem(item)} title="Delete" className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={17} /></button>
                    </> : <>
                      <button type="button" onClick={() => openRequestForm(item)} title="Request stock" className="inline-flex items-center gap-1 rounded-lg bg-[#1a3c36] px-3 py-2 text-xs font-semibold text-white"><Plus size={14} /> Request</button>
                      <button type="button" onClick={() => openItemDetails(item)} title="View item details" className="rounded-lg p-2 text-sky-700 hover:bg-sky-50"><Eye size={17} /></button>
                    </>}
                  </div>
                </article>
              ))}
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>Showing {filteredItems.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filteredItems.length)} of {filteredItems.length} items</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Previous</button>
                <span>Page {currentPage} of {pageCount}</span>
                <button type="button" onClick={() => setPage(Math.min(pageCount, currentPage + 1))} disabled={currentPage >= pageCount} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-5">
          <section className="scrollbar-hide max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-bold text-slate-900">{editingItem ? 'Edit Supply Item' : 'Add Supply Item'}</h2><p className="mt-1 text-sm text-slate-500">Enter item details and stock levels.</p></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Close form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Item Name<input required maxLength={200} value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
              <label className="text-sm font-medium text-slate-700">Category<select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="">Select category</option>{categories.map((category) => <option key={category.id || categoryName(category)} value={categoryName(category)}>{categoryName(category)}</option>)}</select></label>
              <label className="text-sm font-medium text-slate-700">Material<select value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">{MATERIALS.map((material) => <option key={material}>{material}</option>)}</select></label>
              <label className="text-sm font-medium text-slate-700">Unit<select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
              <label className="text-sm font-medium text-slate-700">Current Stock<input required type="number" min="0" step="any" value={form.current_stock} onChange={(e) => setForm({ ...form, current_stock: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
              <label className="text-sm font-medium text-slate-700">Purchase Price<input required type="number" min="0" step="any" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
              <label className="text-sm font-medium text-slate-700">Item Image<input key={imageInputKey} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0] || null; if (file && file.size > 5 * 1024 * 1024) { toast.error('Image size must be 5 MB or less.'); e.target.value = ''; return; } if (file && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Choose a JPG, PNG, or WEBP image.'); e.target.value = ''; return; } setImageFile(file); }} className="mt-1.5 block w-full text-sm" /></label>
              <label className="text-sm font-medium text-slate-700">Status (automatic)<input readOnly value={getStatus({ ...form, current_stock: Number(form.current_stock), minimum_stock: editingItem?.minimum_stock ?? 1 })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" /></label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">Description<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
              <div className="flex flex-wrap justify-end gap-2 pt-2 sm:col-span-2"><button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>{!editingItem && <button type="submit" value="add-another" disabled={saving} className="rounded-xl border border-[#1a3c36] px-4 py-2 text-sm font-semibold text-[#1a3c36] disabled:opacity-60">{saving ? 'Saving…' : 'Save & Add Another'}</button>}<button type="submit" disabled={saving} className="rounded-xl bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : editingItem ? 'Save Changes' : 'Add Item'}</button></div>
            </form>
          </section>
        </div>
      )}

      {requestFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3">
          <section className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div><h2 className="text-xl font-bold text-slate-900">Request Supply Stock</h2><p className="mt-1 text-sm text-slate-500">Add one or more items with their type and quantity.</p></div>
              <button type="button" onClick={closeRequestForm} aria-label="Close request form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <form onSubmit={submitSupplyRequest} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-end">
                <label className="block text-sm font-medium text-slate-700">Supply Item / Type<select required value={requestItem?.id || ''} onChange={(event) => { const selectedItem = items.find((item) => String(item.id) === event.target.value) || null; setRequestItem(selectedItem); setRequestForm((formState) => ({ ...formState, quantity: '' })); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="">Select supply item</option>{itemsByCategory.map(([category, categoryItems]) => <optgroup key={category} label={category}>{categoryItems.map((item) => <option key={item.id} value={item.id} disabled={requestLines.some((line) => line.item.id === item.id)}>{item.item_name} · {item.material || 'General'} · {item.unit} · {item.current_stock} available</option>)}</optgroup>)}</select></label>
                <label className="block text-sm font-medium text-slate-700">Quantity<input autoFocus type="number" min="0.01" step="any" value={requestForm.quantity} onChange={(event) => setRequestForm((formState) => ({ ...formState, quantity: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
                <button type="button" onClick={addRequestLine} className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl border border-[#1a3c36] px-4 text-sm font-semibold text-[#1a3c36] hover:bg-emerald-50"><Plus size={16} /> Add Item</button>
              </div>
              {requestLines.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="grid grid-cols-[minmax(0,1fr)_90px_90px_40px] gap-2 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500"><span>Name</span><span>Type</span><span>Quantity</span><span /></div>
                  {requestLines.map(({ item, quantity }) => (
                    <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_90px_90px_40px] items-center gap-2 border-t border-slate-100 px-3 py-2 text-sm">
                      <span className="truncate font-medium text-slate-800">{item.item_name}</span><span className="truncate text-slate-600">{item.unit}</span><span className="text-slate-700">{quantity}</span>
                      <button type="button" onClick={() => setRequestLines((lines) => lines.filter((line) => line.item.id !== item.id))} aria-label={`Remove ${item.item_name}`} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><X size={15} /></button>
                    </div>
                  ))}
                </div>
              )}
              <label className="block text-sm font-medium text-slate-700">Remarks<textarea rows={3} value={requestForm.remarks} onChange={(event) => setRequestForm({ ...requestForm, remarks: event.target.value })} placeholder="Reason or additional details" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">This request will not change stock until an Admin approves it.</p>
              <div className="flex justify-end gap-2"><button type="button" onClick={closeRequestForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button><button type="submit" disabled={savingRequest || !requestLines.length} className="rounded-xl bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{savingRequest ? 'Sending…' : 'Send Request'}</button></div>
            </form>
          </section>
        </div>
      )}

      {movementItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3">
          <section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between"><div><h2 className="text-xl font-bold text-slate-900">{movementForm.type === 'in' ? 'Receive Stock' : 'Record Stock Usage'}</h2><p className="mt-1 text-sm text-slate-500">{movementItem.item_name} · Current: {movementItem.current_stock} {movementItem.unit}</p></div><button type="button" onClick={() => setMovementItem(null)} aria-label="Close stock movement" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
            <form onSubmit={saveMovement} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">Date<input required type="date" value={movementForm.date} onChange={(e) => setMovementForm({ ...movementForm, date: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
              <label className="block text-sm font-medium text-slate-700">Quantity<input required type="number" min="0.01" step="any" max={movementForm.type === 'out' ? movementItem.current_stock : undefined} value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
              <label className="block text-sm font-medium text-slate-700">Remarks<textarea required rows={3} value={movementForm.remarks} onChange={(e) => setMovementForm({ ...movementForm, remarks: e.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setMovementItem(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button><button type="submit" disabled={savingMovement} className="rounded-xl bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{savingMovement ? 'Saving…' : 'Save Movement'}</button></div>
            </form>
          </section>
        </div>
      )}

      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingItem(null); }}>
          <section className="scrollbar-hide max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="supply-details-title">
            <div className="mb-4 flex items-center justify-between"><h2 id="supply-details-title" className="text-xl font-bold text-slate-900">Supply Details</h2><button type="button" onClick={() => setViewingItem(null)} aria-label="Close details" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">{viewingItem.image_url ? <img src={imageUrl(viewingItem.image_url)} alt={viewingItem.item_name} className="h-full w-full object-cover" /> : <Package size={32} className="text-slate-400" />}</div>
              <dl className="grid flex-1 grid-cols-2 gap-3 text-sm">
                {[['Item Name', viewingItem.item_name], ['Item Code', viewingItem.item_code], ['Category', viewingItem.category], ['Material', viewingItem.material], ['Current Stock', `${viewingItem.current_stock} ${viewingItem.unit}`], ['Purchase Price', formatCurrency(viewingItem.purchase_price)], ['Status', getStatus(viewingItem)]].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-0.5 font-semibold text-slate-900">{value}</dd></div>)}
                <div className="col-span-2"><dt className="text-slate-500">Description</dt><dd className="mt-0.5 text-slate-800">{viewingItem.description || '—'}</dd></div>
              </dl>
            </div>
            <h3 className="mb-2 mt-6 font-semibold text-slate-900">Stock Movement History</h3>
            {movements.length ? <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['Type', 'Date', 'Quantity', 'Remarks'].map((heading) => <th key={heading} className="px-3 py-2 font-semibold">{heading}</th>)}</tr></thead><tbody>{movements.map((movement) => <tr key={movement.id} className="border-t border-slate-100"><td className="px-3 py-2">{movement.movement_type === 'IN' ? 'Stock In' : 'Stock Out'}</td><td className="px-3 py-2">{String(movement.movement_date || '').slice(0, 10)}</td><td className="px-3 py-2">{movement.quantity} {viewingItem.unit}</td><td className="px-3 py-2">{movement.remarks || '—'}</td></tr>)}</tbody></table></div> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No stock movements recorded yet.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
