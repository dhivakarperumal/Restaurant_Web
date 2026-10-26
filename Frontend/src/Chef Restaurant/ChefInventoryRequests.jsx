import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, X, ClipboardList, Clock3, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";
import { useAuth } from "../PrivateRouter/AuthContext";
import InventoryUnitField from "../CommonComponents/InventoryUnitField";

const newRequestForm = (requester) => ({
  request_number: `KR-${Date.now()}`,
  requested_by: requester || "Chef",
  department: "Kitchen",
  request_date: new Date().toISOString().slice(0, 10),
  start_date: "",
  end_date: "",
  priority: "Normal",
  notes: "",
  items: [{ product_id: "", product_name: "", quantity: "1", unit: "pcs" }],
});

const fieldClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-700";
const formatRequestDate = (value) => value instanceof Date
  ? value.toISOString().slice(0, 10)
  : String(value || "").slice(0, 10);
const formatRequestPeriod = (request) => {
  const startDate = formatRequestDate(request.start_date);
  const endDate = formatRequestDate(request.end_date);
  return startDate || endDate
    ? `${startDate || "—"} – ${endDate || "—"}`
    : formatRequestDate(request.request_date) || "-";
};

const ChefInventoryRequests = () => {
  const { profileName, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const requester = profileName || role || "Chef";
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(() => newRequestForm(requester));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);

  const loadPageData = async () => {
    try {
      const [requestResponse, productResponse] = await Promise.all([
        api.get("/inventory/kitchen-requests"),
        api.get("/inventory/products/options"),
      ]);
      setRequests(requestResponse.data?.data || []);
      setProducts(productResponse.data?.data || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to load kitchen requests.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  useEffect(() => {
    const requestedProduct = location.state?.requestProduct;
    if (!requestedProduct?.id || !requestedProduct?.name) return;

    setForm((current) => ({
      ...current,
      items: [{
        product_id: String(requestedProduct.id),
        product_name: requestedProduct.name,
        quantity: "1",
        unit: "pcs",
      }],
    }));
    setIsModalOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const updateItem = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        if (field !== "product_name") return { ...item, [field]: value };
        const matchedProduct = products.find(
          (product) => product.product_name.toLowerCase() === value.trim().toLowerCase()
        );
        return { ...item, product_name: value, product_id: matchedProduct?.id || "" };
      }),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      toast.error("End date cannot be before the start date.");
      return;
    }
    const items = form.items
      .filter((item) => item.product_name.trim() && Number(item.quantity) > 0)
      .map((item) => ({
        ...item,
        product_id: item.product_id ? Number(item.product_id) : null,
        product_name: item.product_name.trim(),
        quantity: Number(item.quantity),
        unit: item.unit.trim() || "pcs",
      }));

    if (!items.length) {
      toast.error("Enter an item name and quantity before sending the request.");
      return;
    }

    setIsSaving(true);
    try {
      await api.post("/inventory/kitchen-requests", {
        ...form,
        requested_by: form.requested_by || requester,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        items,
      });
      toast.success("Kitchen request created.");
      setIsModalOpen(false);
      setForm(newRequestForm(requester));
      await loadPageData();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to create kitchen request.");
    } finally {
      setIsSaving(false);
    }
  };

  const pendingCount = useMemo(() => requests.filter((r) => String(r.status || "Pending").toLowerCase() === "pending").length, [requests]);
  const approvedCount = useMemo(() => requests.filter((r) => String(r.status || "").toLowerCase() === "approved").length, [requests]);
  const completedCount = useMemo(() => requests.filter((r) => String(r.status || "").toLowerCase() === "completed").length, [requests]);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(requests.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageOffset = (currentPage - 1) * pageSize;
  const paginatedRequests = requests.slice(pageOffset, pageOffset + pageSize);

  const statCards = [
    { title: "Total Requests", value: requests.length, hint: "All kitchen stock tickets", icon: ClipboardList, accent: "#f97316", iconBg: "bg-orange-500" },
    { title: "Pending", value: pendingCount, hint: "Awaiting store review", icon: Clock3, accent: "#10b981", iconBg: "bg-emerald-500" },
    { title: "Approved", value: approvedCount, hint: "Stock being allocated", icon: AlertCircle, accent: "#3b82f6", iconBg: "bg-blue-500" },
    { title: "Completed", value: completedCount, hint: "Issued to kitchen", icon: CheckCircle2, accent: "#ec4899", iconBg: "bg-pink-500" },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Chef workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Inventory Requests</h1>
          <p className="mt-1 text-sm text-slate-600">Track kitchen stock requests and their current status.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(newRequestForm(requester));
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-[#1a3c36] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#244e45] sm:self-auto"
        >
          <Plus size={17} />
          Add New Request
        </button>
      </header>

      {/* ── Stats Overview ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <article
              key={stat.title}
              className="relative flex min-h-[194px] min-w-0 flex-col justify-between overflow-hidden rounded-[20px] border border-slate-200/90 bg-white p-5 shadow-[0_4px_16px_-5px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_-7px_rgba(15,23,42,0.12)] sm:p-6"
              style={{ background: `linear-gradient(135deg, #ffffff 48%, ${stat.accent}12 100%)` }}
            >
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 pt-1">
                  <h3 className="truncate text-[12px] font-bold uppercase tracking-[0.08em] text-slate-500">{stat.title}</h3>
                  <div className="mt-4 truncate text-[30px] font-black leading-none tracking-tight text-slate-900">
                    {isLoading ? "..." : stat.value}
                  </div>
                </div>
                <span className={`flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[18px] text-white shadow-[0_5px_12px_-4px_rgba(15,23,42,0.25)] ${stat.iconBg}`}>
                  <Icon size={27} strokeWidth={2.3} />
                </span>
              </div>
              <div className="relative z-10 mt-5 flex items-center gap-2 border-t border-slate-100/90 pt-3.5 text-xs">
                <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                  Live
                </span>
                <span className="truncate font-medium text-slate-500">{stat.hint}</span>
                <span className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: stat.accent }} />
              </div>
              <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: stat.accent }} />
            </article>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-orange-50 text-xs uppercase tracking-wide text-orange-700 border-b border-orange-100">
              <tr>
                <th className="px-4 py-4 font-semibold">Request No.</th>
                <th className="px-4 py-4 font-semibold">Items</th>
                <th className="px-4 py-4 font-semibold">Period</th>
                <th className="px-4 py-4 font-semibold">Priority</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500">Loading requests...</td></tr>
              ) : requests.length ? paginatedRequests.map((request) => (
                <tr key={request.id}>
                  <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-800">{request.request_number}</td>
                  <td className="min-w-48 px-4 py-4 text-slate-700">
                    {request.items?.length
                      ? request.items.map((item) => `${item.item_name || item.product_name || "Item"} (${item.quantity} ${item.unit || "pcs"})`).join(", ")
                      : "No items"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600">{formatRequestPeriod(request)}</td>
                  <td className="px-4 py-4 text-slate-600">{request.priority || "Normal"}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${request.status === "Approved" || request.status === "Completed" ? "bg-emerald-100 text-emerald-800" : request.status === "Rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>
                      {request.status || "Pending"}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-4 text-slate-600">{request.notes || "-"}</td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-slate-500">No kitchen requests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isLoading && requests.length > 0 && (
        <nav aria-label="Kitchen request pages" className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Showing {pageOffset + 1}-{Math.min(pageOffset + pageSize, requests.length)} of {requests.length} requests
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="min-w-20 text-center text-sm font-medium text-slate-700">
              {currentPage} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
              disabled={currentPage === pageCount}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </nav>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => event.target === event.currentTarget && setIsModalOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="new-chef-request-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 id="new-chef-request-title" className="text-lg font-bold text-slate-900">Add New Request</h2>
                <p className="mt-1 text-sm text-slate-500">Add kitchen items and quantities.</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} aria-label="Close dialog" className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">Priority
                  <select className={fieldClass} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                    <option>Low</option><option>Normal</option><option>High</option><option>Urgent</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Start date
                  <input className={fieldClass} type="date" value={form.start_date} max={form.end_date || undefined} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />
                </label>
                <label className="space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">End date
                  <input className={fieldClass} type="date" value={form.end_date} min={form.start_date || undefined} onChange={(event) => setForm({ ...form, end_date: event.target.value })} />
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">Items</h3>
                  <button type="button" onClick={() => setForm({ ...form, items: [...form.items, { product_id: "", product_name: "", quantity: "1", unit: "pcs" }] })} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Add item</button>
                </div>
                {form.items.map((item, index) => (
                  <div key={`request-item-${index}`} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1.5fr_0.7fr_0.7fr_auto]">
                    <label className="space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Item name
                      <input className={fieldClass} list="chef-request-products" value={item.product_name} onChange={(event) => updateItem(index, "product_name", event.target.value)} placeholder="Enter item name" required />
                    </label>
                    <label className="space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity
                      <input className={fieldClass} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} required />
                    </label>
                    <label className="space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Unit
                      <InventoryUnitField
                        className={fieldClass}
                        value={item.unit}
                        onChange={(value) => updateItem(index, "unit", value)}
                      />
                    </label>
                    <button type="button" onClick={() => setForm({ ...form, items: form.items.length > 1 ? form.items.filter((_, itemIndex) => itemIndex !== index) : form.items })} className="self-end rounded-md border border-rose-200 px-3 py-2.5 text-xs font-semibold text-rose-700">Remove</button>
                  </div>
                ))}
                <datalist id="chef-request-products">
                  {products.map((product) => <option key={product.id} value={product.product_name} />)}
                </datalist>
              </div>

              <label className="block space-y-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Notes
                <textarea className={fieldClass} rows="3" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Optional request notes" />
              </label>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                <button type="submit" disabled={isSaving} className="rounded-lg bg-[#1a3c36] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? "Saving..." : "Send Request"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default ChefInventoryRequests;