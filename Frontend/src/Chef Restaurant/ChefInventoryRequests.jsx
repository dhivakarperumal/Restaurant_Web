import { useEffect, useMemo, useState } from "react";
import { Plus, X, ClipboardList, Clock3, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";
import { useAuth } from "../PrivateRouter/AuthContext";

const newRequestForm = (requester) => ({
  request_number: `KR-${Date.now()}`,
  requested_by: requester || "Chef",
  department: "Kitchen",
  request_date: new Date().toISOString().slice(0, 10),
  priority: "Normal",
  notes: "",
  items: [{ product_id: "", product_name: "", quantity: "1", unit: "pcs" }],
});

const fieldClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-700";

const ChefInventoryRequests = () => {
  const { profileName, role } = useAuth();
  const requester = profileName || role || "Chef";
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(() => newRequestForm(requester));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  const statCards = [
    { title: "Total Requests", value: requests.length, hint: "All kitchen stock tickets", icon: ClipboardList, bg: "bg-[#22c55e]" },
    { title: "Pending", value: pendingCount, hint: "Awaiting store review", icon: Clock3, bg: "bg-[#f59e0b]" },
    { title: "Approved", value: approvedCount, hint: "Stock being allocated", icon: AlertCircle, bg: "bg-[#3b82f6]" },
    { title: "Completed", value: completedCount, hint: "Issued to kitchen", icon: CheckCircle2, bg: "bg-[#8b5cf6]" },
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
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <article
              key={stat.title}
              className={`relative min-w-0 overflow-hidden rounded-xl border border-transparent p-4 sm:p-5 shadow-[0_2px_10px_rgba(20,56,34,0.08)] flex flex-col justify-between min-h-[140px] ${stat.bg} text-white`}
            >
              <div className="flex items-start gap-3 relative z-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm bg-white/20">
                  <Icon size={24} strokeWidth={2.2} className="text-white" />
                </div>
                <div className="flex-1 mt-0.5 min-w-0">
                  <h3 className="text-[12px] font-semibold opacity-90 mb-1 truncate">{stat.title}</h3>
                  <div className="text-[26px] font-extrabold leading-none tracking-tight">
                    {isLoading ? "..." : stat.value}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-5 relative z-10">
                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold bg-white/25">
                  Live
                </span>
                <span className="text-[11px] font-medium opacity-75 truncate">{stat.hint}</span>
              </div>

              <div className="absolute right-0 bottom-0 w-24 h-16 pointer-events-none opacity-50">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                  <defs>
                    <linearGradient id={`req-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#req-grad-${index})`} />
                  <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                </svg>
              </div>
            </article>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#d4a843] text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-3 py-3 font-semibold">Request No.</th>
                <th className="px-3 py-3 font-semibold">Items</th>
                <th className="px-3 py-3 font-semibold">Date</th>
                <th className="px-3 py-3 font-semibold">Priority</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500">Loading requests...</td></tr>
              ) : requests.length ? requests.map((request) => (
                <tr key={request.id}>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">{request.request_number}</td>
                  <td className="min-w-48 px-4 py-3 text-slate-700">
                    {request.items?.length
                      ? request.items.map((item) => `${item.item_name || item.product_name || "Item"} (${item.quantity} ${item.unit || "pcs"})`).join(", ")
                      : "No items"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{String(request.request_date || "").slice(0, 10) || "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{request.priority || "Normal"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${request.status === "Approved" || request.status === "Completed" ? "bg-emerald-100 text-emerald-800" : request.status === "Rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>
                      {request.status || "Pending"}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">{request.notes || "-"}</td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-slate-500">No kitchen requests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                      <input className={fieldClass} value={item.unit} onChange={(event) => updateItem(index, "unit", event.target.value)} placeholder="pcs" />
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