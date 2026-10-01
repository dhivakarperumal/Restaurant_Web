import { useState, useEffect, useMemo } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  Eye,
  Pencil,
  Trash2,
  ChevronDown,
  ArrowUpRight,
  Shield,
  LayoutGrid,
  List,
  Mail,
  Calendar,
  Plus,
  X,
} from "lucide-react";
import api from "../api";
import toast from "react-hot-toast";

/* ============================================================
   HELPERS
   ============================================================ */
const getInitials = (name = "") =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";

const AVATAR_COLORS = [
  "bg-[#d4a843] text-[#162420]",
  "bg-[#4f88b2] text-white",
  "bg-[#7d5a93] text-white",
  "bg-[#2d7b5a] text-white",
  "bg-[#d04d4d] text-white",
  "bg-[#1a3c36] text-white",
];

const getAvatarColor = (str = "") => {
  const sum = [...str].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ROLES    = ["All Roles", "Super Admin", "Admin", "Chef", "Server", "Delivery", "user"];
const STATUSES = ["All Status", "Active", "Inactive"];
const PAGE_SIZES = [10, 25, 50];

/* ============================================================
   CUSTOMER CARD (card-view)
   ============================================================ */
const CustomerCard = ({ customer, onView, onEdit, onDelete }) => {
  const isActive = customer.status === "Active";
  const isAdmin  = ["Admin", "Super Admin"].includes(customer.role);

  return (
    <div className="group relative flex min-h-[250px] flex-col gap-4 overflow-hidden rounded-2xl border border-[#e7e0d8] bg-white p-5 shadow-[0_2px_8px_rgba(31,31,31,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#d8cbbd] hover:shadow-[0_10px_24px_rgba(31,31,31,0.08)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-[#d4a843]" />
      {/* Top row: avatar + status */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-base font-bold shadow-inner ${getAvatarColor(customer.username || "")}`}
          >
            {getInitials(customer.username)}
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9a9a9a]">Customer profile</p>
            <p className="max-w-[150px] truncate text-[15px] font-semibold leading-tight text-[#1f1f1f]">
              {customer.username || "—"}
            </p>
            <p className="text-[11px] text-[#9a9a9a] mt-0.5">
              #{String(customer.id || "").slice(0, 8)}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isActive ? "bg-[#edf7f1] text-[#2d7b5a]" : "bg-[#fff0f0] text-[#d04d4d]"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[#2d7b5a]" : "bg-[#d04d4d]"}`}
          />
          {customer.status || "Active"}
        </span>
      </div>

      {/* Info rows */}
      <div className="space-y-2.5 rounded-xl border border-[#f0ebe6] bg-[#faf9f8] px-3 py-3">
        <div className="flex min-w-0 items-center gap-2 text-[13px] text-[#5a5a5a]">
          <Mail className="h-3.5 w-3.5 shrink-0 text-[#8d8d8d]" />
          <span className="truncate">{customer.email || "No email provided"}</span>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-[#5a5a5a]">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-[#8d8d8d]" />
          <span>Joined {formatDate(customer.created_at)}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="mt-auto border-t border-[#f0ebe6]" />

      {/* Footer: role + actions */}
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isAdmin ? "bg-[#f1e7f7] text-[#7d5a93]" : "bg-[#e8eefb] text-[#4f88b2]"
          }`}
        >
          {isAdmin && <Shield className="h-3 w-3" />}
          {customer.role || "user"}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onView(customer.id)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#1a3c36] hover:bg-[#f3f8f6] hover:text-[#1a3c36]"
            title="View customer"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => onEdit(customer.id)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#1a3c36] hover:bg-[#f3f8f6] hover:text-[#1a3c36]" title="Edit customer">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(customer.id)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#f3d7d7] bg-[#fff8f8] text-[#d04d4d] transition hover:bg-[#fff0f0]"
            title="Delete customer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const AddUserModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ username: "", email: "", phone: "", password: "", role: "user" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      setSaving(true);
      await api.post("/users/register", { username: form.username.trim(), email: form.email.trim(), phone: form.phone.trim(), mobile_number: form.phone.trim(), password: form.password, role: form.role, status: "Active" });
      toast.success("User created successfully");
      onCreated();
      onClose();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-[#ece9e5] pb-4"><div><h2 className="text-xl font-bold text-[#1f1d1b]">Add New User</h2><p className="mt-1 text-xs text-[#777]">Create a user or admin account</p></div><button type="button" onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-[#777]" /></button></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2"><span className="text-sm font-semibold text-[#333]">Username</span><input required placeholder="Enter username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className="w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 py-2.5 text-sm outline-none placeholder:text-[#999] focus:border-[#1a3c36]" /></label>
          <label className="space-y-2"><span className="text-sm font-semibold text-[#333]">Email</span><input required type="email" placeholder="Enter email address" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 py-2.5 text-sm outline-none placeholder:text-[#999] focus:border-[#1a3c36]" /></label>
          <label className="space-y-2"><span className="text-sm font-semibold text-[#333]">Phone</span><input required type="tel" placeholder="Enter phone number" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 py-2.5 text-sm outline-none placeholder:text-[#999] focus:border-[#1a3c36]" /></label>
          <label className="space-y-2"><span className="text-sm font-semibold text-[#333]">Role</span><select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 py-2.5 text-sm outline-none focus:border-[#1a3c36]"><option value="user">User</option><option value="Admin">Admin</option><option value="Super Admin">Super Admin</option><option value="Chef">Chef</option><option value="Server">Server</option><option value="Delivery">Delivery</option></select></label>
          <label className="space-y-2 sm:col-span-2"><span className="text-sm font-semibold text-[#333]">Password</span><input required minLength={6} type="password" placeholder="Enter password (minimum 6 characters)" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 py-2.5 text-sm outline-none placeholder:text-[#999] focus:border-[#1a3c36]" /></label>
        </div>
        {error && <p className="mt-4 text-sm text-[#c03939]">{error}</p>}
        <div className="mt-6 flex justify-end gap-3 border-t border-[#ece9e5] pt-5"><button type="button" onClick={onClose} className="rounded-xl border border-[#dfe2e5] bg-white px-5 py-2.5 text-sm font-medium">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-[#1a3c36] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Creating..." : "Create User"}</button></div>
      </form>
    </div>
  );
};

const CustomerModal = ({ customer, mode, onClose, onSaved }) => {
  const isEditing = mode === "edit";
  const [form, setForm] = useState({ username: customer.username || "", mobile_number: customer.mobile_number || "", role: customer.role || "user", status: customer.status || "Active" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await api.put(`/users/${customer.id}`, form);
      toast.success("Customer updated successfully");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-[#ece9e5] pb-4"><div><h2 className="text-xl font-bold text-[#1f1d1b]">{isEditing ? "Edit Customer" : "Customer Details"}</h2><p className="mt-1 text-xs text-[#777]">{customer.user_id || customer.id}</p></div><button type="button" onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-[#777]" /></button></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2"><span className="text-sm font-semibold text-[#333]">Username</span><input required disabled={!isEditing} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className="w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 py-2.5 text-sm disabled:text-[#555]" /></label>
          <label className="space-y-2"><span className="text-sm font-semibold text-[#333]">Email</span><input disabled value={customer.email || ""} className="w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 py-2.5 text-sm text-[#555]" /></label>
          <label className="space-y-2"><span className="text-sm font-semibold text-[#333]">Phone</span><input disabled={!isEditing} value={form.mobile_number} onChange={(event) => setForm({ ...form, mobile_number: event.target.value })} className="w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 py-2.5 text-sm disabled:text-[#555]" /></label>
          <label className="space-y-2"><span className="text-sm font-semibold text-[#333]">Role</span><select disabled={!isEditing} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 py-2.5 text-sm disabled:text-[#555]"><option value="user">User</option><option value="Admin">Admin</option><option value="Super Admin">Super Admin</option><option value="Chef">Chef</option><option value="Server">Server</option><option value="Delivery">Delivery</option></select></label>
          <label className="space-y-2"><span className="text-sm font-semibold text-[#333]">Status</span><select disabled={!isEditing} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 py-2.5 text-sm disabled:text-[#555]"><option>Active</option><option>Inactive</option></select></label>
          <div><span className="text-sm font-semibold text-[#333]">Joined</span><p className="mt-2 text-sm text-[#555]">{formatDate(customer.created_at)}</p></div>
        </div>
        {isEditing && <div className="mt-6 flex justify-end gap-3 border-t border-[#ece9e5] pt-5"><button type="button" onClick={onClose} className="rounded-xl border border-[#dfe2e5] bg-white px-5 py-2.5 text-sm font-medium">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-[#1a3c36] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button></div>}
      </form>
    </div>
  );
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
const AdminCustomers = () => {
  const [customers,    setCustomers]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [search,       setSearch]       = useState("");
  const [roleFilter,   setRoleFilter]   = useState("All Roles");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [page,         setPage]         = useState(1);
  const [pageSize,     setPageSize]     = useState(10);
  const [refreshKey,   setRefreshKey]   = useState(0);
  const [viewMode,     setViewMode]     = useState("table"); // "table" | "card"
  const [showAddUser,  setShowAddUser]  = useState(false);
  const [customerModal, setCustomerModal] = useState(null);

  /* ---------- FETCH ---------- */
  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/users");
      setCustomers(data?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, [refreshKey]);

  const handleView = (userId) => {
    const customer = customers.find((item) => String(item.id) === String(userId));
    if (customer) setCustomerModal({ customer, mode: "view" });
  };
  const handleEdit = (userId) => {
    const customer = customers.find((item) => String(item.id) === String(userId));
    if (customer) setCustomerModal({ customer, mode: "edit" });
  };
  const handleDelete = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    try {
      await api.delete(`/users/${userId}`);
      setCustomers((previousCustomers) => previousCustomers.filter((customer) => String(customer.id) !== String(userId)));
      toast.success("Customer deleted successfully");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete customer");
    }
  };

  /* ---------- FILTER ---------- */
  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        c.username?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.user_id?.toLowerCase().includes(q);
      const matchRole   = roleFilter   === "All Roles"   || c.role   === roleFilter;
      const matchStatus = statusFilter === "All Status"  || c.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [customers, search, roleFilter, statusFilter]);

  /* ---------- PAGINATION ---------- */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter, pageSize]);

  const getPageNumbers = () => {
    const delta = 2;
    const pages = [];
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
      pages.push(i);
    }
    return pages;
  };

  /* ---------- STAT CARDS ---------- */
  const totalCustomers    = customers.length;
  const activeCustomers   = customers.filter((c) => c.status === "Active").length;
  const inactiveCustomers = customers.filter((c) => c.status !== "Active").length;
  const adminCount        = customers.filter((c) => ["Admin","Super Admin"].includes(c.role)).length;

  const statCards = [
    {
      title: "Total Customers",
      value: totalCustomers,
      icon: <Users className="h-6 w-6" />,
      color: "#22c55e",
      wave: "#9be7b9",
      trend: `${totalCustomers} total`,
    },
    {
      title: "Active",
      value: activeCustomers,
      icon: <UserCheck className="h-6 w-6" />,
      color: "#06b6d4",
      wave: "#93dce8",
      trend: totalCustomers > 0 ? `${Math.round((activeCustomers / totalCustomers) * 100)}% of total` : "0%",
    },
    {
      title: "Inactive",
      value: inactiveCustomers,
      icon: <UserX className="h-6 w-6" />,
      color: "#f97316",
      wave: "#ffc39e",
      trend: totalCustomers > 0 ? `${Math.round((inactiveCustomers / totalCustomers) * 100)}% of total` : "0%",
    },
    {
      title: "Admins",
      value: adminCount,
      icon: <Shield className="h-6 w-6" />,
      color: "#a855f7",
      wave: "#d8b4f5",
      trend: "Admin & Super Admin",
    },
  ];

  /* ---------- EXPORT ---------- */
  const handleExport = () => {
    const headers = ["Username", "Email", "Role", "Status", "Joined"];
    const rows = filtered.map((c) => [c.username, c.email, c.role, c.status, formatDate(c.created_at)]);
    const csv  = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "customers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="min-h-screen bg-[#f2f3f0] p-4 md:p-2">
      <div className="mx-auto max-w-[1500px]">


        {/* ── STAT CARDS ── */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card, idx) => (
            <div
              key={idx}
              className="relative flex min-h-[176px] flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm"
            >
              <div className="flex flex-1 items-start gap-4">
                <div
                  className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: card.color }}
                >
                  {card.icon}
                </div>
                <div className="min-w-0 pt-1">
                  <p className="text-sm font-medium text-[#374151]">{card.title}</p>
                  <p className="mt-2 truncate text-[1.75rem] font-bold leading-none text-[#111827]">
                    {loading ? "—" : card.value}
                  </p>
                  <p className="mt-5 flex items-center gap-1 text-xs font-medium text-[#00a76f]">
                    <ArrowUpRight className="h-3.5 w-3.5" /> {card.trend}
                  </p>
                  <p className="mt-1 text-[11px] text-[#7c8798]">customer overview</p>
                </div>
              </div>
              <div
                className="absolute bottom-0 left-0 h-6 w-full"
                style={{
                  background: card.wave,
                  clipPath: "ellipse(65% 75% at 55% 100%)",
                }}
              />
            </div>
          ))}
        </div>

        {/* ── TABLE / CARD WRAPPER ── */}
        <div className="rounded-[18px] border border-[#e7e0d8] bg-white p-4 shadow-[0_1px_0_rgba(16,24,40,0.02)]">

          {/* ── TOOLBAR ── */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-center lg:justify-between">
            {/* Left: search + filters */}
            <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap lg:shrink-0">
              {/* Search */}
              <div className="relative w-full max-w-[500px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7a7a]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-10 pr-3 text-[14px] text-[#2d2d2d] outline-none placeholder:text-[#8a8a8a] focus:border-[#d2bc8a]"
                />
              </div>

              {/* Role */}
              
            </div>

            {/* Right: page size + view toggle */}
            <div className="flex shrink-0 items-center gap-3">
              {/* Page size */}
            <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-[46px] appearance-none rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-3 pr-9 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a] cursor-pointer"
                >
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
              </div>

              {/* Status */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-[46px] appearance-none rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-3 pr-9 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a] cursor-pointer"
                >
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
              </div>

              {/* View toggle */}
              <div className="flex overflow-hidden rounded-xl border border-[#dfe2e5] bg-[#faf9f8]">
                <button
                  onClick={() => setViewMode("table")}
                  title="Table view"
                  className={`flex h-[42px] w-[42px] items-center justify-center border-r border-[#dfe2e5] transition ${
                    viewMode === "table"
                      ? "bg-[#1a3c36] text-white"
                      : "text-[#6a6a6a] hover:bg-white"
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("card")}
                  title="Card view"
                  className={`flex h-[42px] w-[42px] items-center justify-center transition ${
                    viewMode === "card"
                      ? "bg-[#1a3c36] text-white"
                      : "text-[#6a6a6a] hover:bg-white"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
             
            <button
              type="button"
              onClick={() => setShowAddUser(true)}
              className="inline-flex h-[46px] items-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-[15px] font-semibold text-white shadow-[0_6px_14px_rgba(26,60,54,0.18)] transition hover:bg-[#214a42]"
            >
              <Plus className="h-4 w-4" />
              Add New User
            </button>
         
            <button
              onClick={handleExport}
              className="inline-flex h-[46px] items-center gap-2 rounded-xl border border-[#d9d6d2] bg-white px-4 text-[15px] font-medium text-[#2d2d2d] shadow-sm transition hover:bg-[#faf7f3]"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            </div>
          </div>

          {/* ── CONTENT ── */}
          {error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <UserX className="mb-3 h-12 w-12 text-[#d04d4d]" />
              <p className="text-[15px] font-semibold text-[#d04d4d]">{error}</p>
              <button
                onClick={() => setRefreshKey((k) => k + 1)}
                className="mt-4 rounded-xl bg-[#1a3c36] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#214a42]"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-[#d4a843]" />
              <span className="ml-3 text-[15px] text-[#5a5a5a]">Loading customers...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="mb-3 h-12 w-12 text-[#c9c2ba]" />
              <p className="text-[15px] font-semibold text-[#4d4d4d]">No customers found</p>
              <p className="mt-1 text-[13px] text-[#7a7a7a]">Try adjusting your search or filter criteria.</p>
            </div>
          ) : viewMode === "card" ? (
            /* ─────────── CARD VIEW ─────────── */
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginated.map((customer) => (
                <CustomerCard key={customer.id || customer.user_id} customer={customer} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>
          ) : (
            /* ─────────── TABLE VIEW ─────────── */
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-[#f7f9f6] text-left text-sm font-semibold text-[#374151]">
                    <th className="rounded-tl-md px-4 py-4">S No</th>
                    <th className="px-4 py-4">Customer</th>
                    <th className="px-4 py-4">Email</th>
                    <th className="px-4 py-4">Role</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Joined</th>
                    <th className="rounded-tr-md px-4 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((customer, idx) => {
                    const isActive = customer.status === "Active";
                    const isAdmin  = ["Admin", "Super Admin"].includes(customer.role);
                    const rowNum   = (page - 1) * pageSize + idx + 1;

                    return (
                      <tr
                        key={customer.id || customer.user_id}
                        className="border-t border-[#f0ebe6] align-middle transition-colors hover:bg-[#faf8f5]"
                      >
                        <td className="px-4 py-4 text-sm text-[#9a9a9a]">{rowNum}</td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${getAvatarColor(customer.username || "")}`}
                            >
                              {getInitials(customer.username)}
                            </div>
                            <div>
                              <div className="text-[15px] font-semibold text-[#1f1f1f]">
                                {customer.username || "—"}
                              </div>
                              <div className="text-[11px] text-[#8a8a8a]">
                                ID: {customer.user_id || customer.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-[#4d4d4d]">{customer.email || "—"}</td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              isAdmin ? "bg-[#f1e7f7] text-[#7d5a93]" : "bg-[#e8eefb] text-[#4f88b2]"
                            }`}
                          >
                            {isAdmin && <Shield className="h-3 w-3" />}
                            {customer.role || "user"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              isActive ? "bg-[#edf7f1] text-[#2d7b5a]" : "bg-[#fff0f0] text-[#d04d4d]"
                            }`}
                          >
                            <span className={`h-2 w-2 rounded-full ${isActive ? "bg-[#2d7b5a]" : "bg-[#d04d4d]"}`} />
                            {customer.status || "Active"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-sm text-[#5a5a5a]">{formatDate(customer.created_at)}</td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleView(customer.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997] hover:text-[#1a1a1a]"
                              title="View customer"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => handleEdit(customer.id)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997] hover:text-[#1a1a1a]" title="Edit customer">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(customer.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#f3d7d7] bg-[#fff8f8] text-[#d04d4d] transition hover:bg-[#fff0f0]"
                              title="Delete customer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          

          {/* ── PAGINATION ── */}
          {!loading && !error && filtered.length > 0 && (
            <div className="mt-6 flex flex-col gap-3 border-t border-[#efebe7] pt-4 text-sm text-[#6a6a6a] md:flex-row md:items-center md:justify-between">
               <div className="flex items-center gap-2 text-[13px] text-[#6a6a6a]">
                <span>Show</span>
                <div className="relative">
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="h-[38px] appearance-none rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-3 pr-8 text-[13px] font-medium text-[#2d2d2d] outline-none cursor-pointer"
                  >
                    {PAGE_SIZES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#666]" />
                </div>
                <span>entries</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e3dbd2] bg-white text-[#7d7d7d] disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageNumbers().map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg font-medium transition ${
                      p === page
                        ? "bg-[#173b35] text-white"
                        : "border border-[#e3dbd2] bg-white text-[#4d4d4d] hover:bg-[#faf7f3]"
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e3dbd2] bg-white text-[#7d7d7d] disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {showAddUser && <AddUserModal onClose={() => setShowAddUser(false)} onCreated={() => setRefreshKey((key) => key + 1)} />}
      {customerModal && <CustomerModal customer={customerModal.customer} mode={customerModal.mode} onClose={() => setCustomerModal(null)} onSaved={() => setRefreshKey((key) => key + 1)} />}
    </div>
  );
};

export default AdminCustomers;
