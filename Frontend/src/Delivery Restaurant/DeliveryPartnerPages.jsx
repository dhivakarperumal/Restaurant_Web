import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCheck, ChevronLeft, ChevronRight, CircleHelp, FileText, IndianRupee, LockKeyhole, MessageSquareText, RefreshCw, Search, Send, ShieldCheck, WalletCards } from "lucide-react";
import api from "../api";
import toast from "react-hot-toast";
import { useAuth } from "../PrivateRouter/AuthContext";
import LogoutConfirmModal from "../CommonComponents/LogoutConfirmModal";

const EMPTY_PROFILE = {};

const currency = (value) => value == null ? "—" : `₹${Number(value).toLocaleString("en-IN")}`;
const rowsFrom = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.history)) return payload.history;
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  if (Array.isArray(payload?.tickets)) return payload.tickets;
  return [];
};

const usePartnerResource = (endpoint, params = {}) => {
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const query = JSON.stringify(params);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get(endpoint, { params: JSON.parse(query) });
        if (active) setResource(response.data?.data ?? response.data ?? null);
      } catch (requestError) {
        if (active) setError(requestError?.response?.data?.message || "This delivery service is currently unavailable.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [endpoint, query, refreshKey]);

  return { resource, loading, error, refresh: () => setRefreshKey((value) => value + 1) };
};

const PageHeading = ({ eyebrow, title, description, onRefresh, loading }) => (
  <header className="flex flex-wrap items-end justify-between gap-4">
    <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#39804f]">{eyebrow}</p><h1 className="mt-1 text-2xl font-bold text-[#17231c]">{title}</h1><p className="mt-1 text-sm text-gray-500">{description}</p></div>
    {onRefresh && <button type="button" onClick={onRefresh} disabled={loading} aria-label="Refresh" className="grid h-10 w-10 place-items-center rounded-lg border border-[#dce6de] bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button>}
  </header>
);

const ServiceNotice = ({ error, loading, refresh, noun }) => {
  if (loading) return <div className="grid gap-3 sm:grid-cols-2"><div className="h-28 animate-pulse rounded-xl bg-white" /><div className="h-28 animate-pulse rounded-xl bg-white" /></div>;
  if (error) return <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">{noun} unavailable</p><p className="mt-1">{error}</p><p className="mt-2 text-xs">This page uses a delivery-partner-scoped service. No other partner's information is loaded.</p>{refresh && <button type="button" onClick={refresh} className="mt-3 font-semibold underline">Try again</button>}</div>;
  return null;
};

const SummaryCard = ({ label, value, icon: Icon, highlight = false }) => (
  <div className={`rounded-xl border p-4 ${highlight ? "border-[#cfe4d3] bg-[#eaf5ec]" : "border-[#e2e9e3] bg-white"}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-gray-500">{label}</span><Icon size={17} className={highlight ? "text-[#24713e]" : "text-gray-400"} /></div><p className={`mt-3 text-xl font-bold tabular-nums ${highlight ? "text-[#215c35]" : "text-gray-900"}`}>{value ?? "—"}</p></div>
);

const dateRanges = ["today", "yesterday", "this-week", "last-week", "this-month", "last-month", "this-year", "last-year", "custom"];
const rangeLabel = (value) => ({ today: "Today", yesterday: "Yesterday", "this-week": "This Week", "last-week": "Last Week", "this-month": "This Month", "last-month": "Last Month", "this-year": "This Year", "last-year": "Last Year", custom: "Custom Date" }[value] || value);

const EarningsPage = () => {
  const [range, setRange] = useState("this-month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const params = { range, ...(range === "custom" ? { from, to } : {}) };
  const { resource, loading, error, refresh } = usePartnerResource("/delivery-partner/earnings", params);
  const summary = resource?.summary || resource || {};
  const entries = rowsFrom(resource?.entries || resource?.history || resource?.rows || []);

  return <section className="space-y-5"><PageHeading eyebrow="Payouts" title="Earnings" description="Delivery pay and payout history for your account." onRefresh={refresh} loading={loading} />
    <ServiceNotice error={error} loading={loading} refresh={refresh} noun="Earnings" />
    <div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 rounded-lg border border-[#dce6de] bg-white px-3 py-2 text-sm"><CalendarDays size={15} className="text-[#448052]" /><span className="sr-only">Date range</span><select value={range} onChange={(event) => setRange(event.target.value)} className="bg-transparent font-medium text-gray-700 outline-none">{dateRanges.map((option) => <option key={option} value={option}>{rangeLabel(option)}</option>)}</select></label>{range === "custom" && <><input aria-label="From date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded-lg border border-[#dce6de] bg-white px-3 py-2 text-sm" /><input aria-label="To date" type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded-lg border border-[#dce6de] bg-white px-3 py-2 text-sm" /></>}</div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{[
      ["Today's earnings", summary.today_earnings ?? summary.todayEarnings, IndianRupee, true], ["This week", summary.week_earnings ?? summary.weekEarnings, IndianRupee], ["This month", summary.month_earnings ?? summary.monthEarnings, IndianRupee], ["Total earnings", summary.total_earnings ?? summary.totalEarnings, WalletCards], ["Completed deliveries", summary.completed_deliveries ?? summary.completedDeliveries, CheckCheck], ["Base charges", summary.base_charge ?? summary.baseCharge, IndianRupee], ["Extra distance", summary.extra_km_charge ?? summary.extraKmCharge, IndianRupee], ["Incentives & bonuses", Number(summary.incentives || 0) + Number(summary.bonuses || 0), IndianRupee], ["Cash collected", summary.cash_collected ?? summary.cashCollected, WalletCards],
    ].map(([label, value, Icon, highlight]) => <SummaryCard key={label} label={label} value={currency(value)} icon={Icon} highlight={highlight} />)}</div>
    <div className="overflow-hidden rounded-xl border border-[#e2e9e3] bg-white"><div className="border-b border-gray-100 px-4 py-4"><h2 className="font-bold">Earnings history</h2><p className="mt-1 text-xs text-gray-500">Per-delivery amounts and payment status</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Order", "Date", "Distance", "Base", "Extra", "Incentive", "Total", "Payment"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{entries.map((entry, index) => <tr key={entry.order_id || entry.id || index}><td className="px-4 py-3 font-semibold">{entry.order_id || entry.id || "—"}</td><td className="whitespace-nowrap px-4 py-3 text-gray-500">{entry.date ? new Date(entry.date).toLocaleDateString("en-IN") : "—"}</td><td className="px-4 py-3">{entry.distance_km ?? entry.distance ?? "—"} km</td><td className="px-4 py-3">{currency(entry.base_charge)}</td><td className="px-4 py-3">{currency(entry.extra_charge)}</td><td className="px-4 py-3">{currency(entry.incentive)}</td><td className="px-4 py-3 font-bold">{currency(entry.total_earnings ?? entry.total)}</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{entry.payment_status || "—"}</span></td></tr>)}{!loading && !error && entries.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">Earnings history will appear after completed deliveries.</td></tr>}</tbody></table></div></div>
  </section>;
};

const DeliveryHistoryPage = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const { resource, loading, error, refresh } = usePartnerResource("/delivery-partner/history", { from, to });
  const entries = rowsFrom(resource?.deliveries || resource?.items || resource);
  const filtered = useMemo(() => entries.filter((entry) => {
    const query = search.toLowerCase();
    const entryStatus = String(entry.status || entry.order_status || "").toLowerCase();
    const date = String(entry.date || entry.created_at || "").slice(0, 10);
    return (!query || [entry.order_id, entry.customer_name, entry.restaurant_name].some((value) => String(value || "").toLowerCase().includes(query)))
      && (status === "All" || entryStatus === status.toLowerCase())
      && (!from || date >= from) && (!to || date <= to);
  }), [entries, from, search, status, to]);
  const pageSize = 8;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const summary = resource?.summary || {};

  return <section className="space-y-5"><PageHeading eyebrow="Completed work" title="Delivery history" description="Completed, cancelled, and failed deliveries assigned to you." onRefresh={refresh} loading={loading} /><ServiceNotice error={error} loading={loading} refresh={refresh} noun="History" />
    <div className="grid grid-cols-3 gap-3"><SummaryCard label="Completed" value={summary.completed ?? entries.filter((row) => row.status === "Delivered").length} icon={CheckCheck} /><SummaryCard label="Cancelled" value={summary.cancelled ?? entries.filter((row) => row.status === "Cancelled").length} icon={FileText} /><SummaryCard label="Failed" value={summary.failed ?? entries.filter((row) => row.status === "Failed").length} icon={CircleHelp} /></div>
    <div className="flex flex-wrap gap-2"><label className="relative min-w-52 flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search order, customer, restaurant" className="w-full rounded-lg border border-[#dce6de] bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#4a8b5a]" /></label><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Filter history status" className="rounded-lg border border-[#dce6de] bg-white px-3 text-sm"><option>All</option><option>Delivered</option><option>Cancelled</option><option>Failed</option></select><input type="date" aria-label="History from" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className="rounded-lg border border-[#dce6de] bg-white px-3 py-2 text-sm" /><input type="date" aria-label="History to" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className="rounded-lg border border-[#dce6de] bg-white px-3 py-2 text-sm" /></div>
    <div className="grid gap-3 lg:hidden">{visible.map((entry, index) => <article key={entry.order_id || entry.id || index} className="rounded-xl border border-[#e2e9e3] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-gray-500">{entry.order_id || entry.id || "—"}</p><p className="mt-1 font-semibold text-gray-900">{entry.customer_name || "Customer"}</p></div><span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-700">{entry.status || entry.order_status || "—"}</span></div><p className="mt-3 text-xs text-gray-600">{entry.restaurant_name || entry.chef_name || "Restaurant"}</p><div className="mt-3 space-y-1 border-l border-[#d9e5db] pl-3 text-xs text-gray-500"><p>Pickup · {entry.pickup_address || "—"}</p><p>Drop-off · {entry.delivery_address || "—"}</p></div><div className="mt-3 flex justify-between gap-2 text-xs"><span className="text-gray-500">{entry.date || entry.created_at ? new Date(entry.date || entry.created_at).toLocaleDateString("en-IN") : "—"}</span><span className="font-bold text-[#21643a]">{currency(entry.earnings ?? entry.delivery_charge)}</span></div></article>)}{!loading && !error && visible.length === 0 && <div className="rounded-xl border border-dashed border-[#cddbd0] bg-white px-5 py-10 text-center text-sm text-gray-500">No delivery history for these filters.</div>}</div>
    <div className="hidden overflow-hidden rounded-xl border border-[#e2e9e3] bg-white lg:block"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Order", "Customer", "Restaurant", "Pickup", "Drop-off", "Date", "Status", "Earnings"].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{visible.map((entry, index) => <tr key={entry.order_id || entry.id || index}><td className="px-4 py-3 font-semibold">{entry.order_id || entry.id || "—"}</td><td className="px-4 py-3">{entry.customer_name || "—"}</td><td className="px-4 py-3">{entry.restaurant_name || entry.chef_name || "—"}</td><td className="max-w-40 truncate px-4 py-3 text-gray-500">{entry.pickup_address || "—"}</td><td className="max-w-40 truncate px-4 py-3 text-gray-500">{entry.delivery_address || "—"}</td><td className="whitespace-nowrap px-4 py-3 text-gray-500">{entry.date || entry.created_at ? new Date(entry.date || entry.created_at).toLocaleString("en-IN") : "—"}</td><td className="px-4 py-3">{entry.status || entry.order_status || "—"}</td><td className="px-4 py-3 font-semibold text-[#21643a]">{currency(entry.earnings ?? entry.delivery_charge)}</td></tr>)}{!loading && !error && visible.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">No delivery history for these filters.</td></tr>}</tbody></table></div></div>
    <div className="flex items-center justify-between text-sm text-gray-500"><span>{filtered.length} records · page {page} of {pages}</span><div className="flex gap-2"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} aria-label="Previous page" className="rounded-lg border bg-white p-2 disabled:opacity-40"><ChevronLeft size={16} /></button><button type="button" onClick={() => setPage((value) => Math.min(pages, value + 1))} disabled={page >= pages} aria-label="Next page" className="rounded-lg border bg-white p-2 disabled:opacity-40"><ChevronRight size={16} /></button></div></div>
  </section>;
};

const NotificationsPage = () => {
  const { resource, loading, error, refresh } = usePartnerResource("/delivery-partner/notifications");
  const notifications = rowsFrom(resource?.notifications || resource);
  const unread = notifications.filter((notice) => !notice.read_at && !notice.is_read).length;
  const [busy, setBusy] = useState(false);
  const markAllRead = async () => {
    setBusy(true);
    try { await api.patch("/delivery-partner/notifications/read"); toast.success("Notifications marked as read"); refresh(); }
    catch (requestError) { toast.error(requestError?.response?.data?.message || "Could not update notifications."); }
    finally { setBusy(false); }
  };
  return <section className="space-y-5"><PageHeading eyebrow="Updates" title="Notifications" description="Delivery assignments, pickup updates, payments, and messages." onRefresh={refresh} loading={loading} /><ServiceNotice error={error} loading={loading} refresh={refresh} noun="Notifications" /><div className="rounded-xl border border-[#e2e9e3] bg-white"><div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4"><div><h2 className="font-bold">All updates</h2><p className="mt-1 text-xs text-gray-500">{unread} unread</p></div><button type="button" onClick={markAllRead} disabled={busy || unread === 0} className="inline-flex items-center gap-2 rounded-lg border border-[#dce6de] px-3 py-2 text-xs font-semibold text-[#21643a] disabled:opacity-40"><CheckCheck size={15} />Mark all read</button></div><div className="divide-y divide-gray-100">{notifications.map((notice, index) => { const isUnread = !notice.read_at && !notice.is_read; return <article key={notice.id || notice.notification_id || index} className={`flex gap-3 p-4 ${isUnread ? "bg-[#f6fbf6]" : ""}`}><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${isUnread ? "bg-[#2e8149]" : "bg-gray-200"}`} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-gray-800">{notice.title || notice.type || "Delivery update"}</p><p className="mt-1 text-sm text-gray-600">{notice.message || notice.body || "A new update is available."}</p><p className="mt-2 text-xs text-gray-400">{notice.created_at ? new Date(notice.created_at).toLocaleString("en-IN") : ""}</p></div>{isUnread && <span className="text-[10px] font-bold uppercase text-[#2e8149]">New</span>}</article>; })}{!loading && !error && notifications.length === 0 && <div className="px-4 py-14 text-center text-sm text-gray-500">You’re all caught up. New delivery updates will appear here.</div>}</div></div></section>;
};

const ProfilePage = () => {
  const { userProfile, logout } = useAuth();
  const { resource, loading, error, refresh } = usePartnerResource("/delivery-partner/profile");
  const profile = resource?.profile || resource?.partner || resource || EMPTY_PROFILE;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [form, setForm] = useState({});
  const updateField = (event) => setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
  const startEditing = () => {
    setForm({ full_name: profile.full_name || profile.name || userProfile?.displayName || "", phone_number: profile.phone_number || userProfile?.phone || "", email: profile.email || userProfile?.email || "", address: profile.address || "", vehicle_type: profile.vehicle_type || "", vehicle_number: profile.vehicle_number || "" });
    setEditing(true);
  };
  const saveProfile = async (event) => { event.preventDefault(); setSaving(true); try { await api.patch("/delivery-partner/profile", form); toast.success("Profile updated"); setEditing(false); refresh(); } catch (requestError) { toast.error(requestError?.response?.data?.message || "Profile updates are unavailable."); } finally { setSaving(false); } };

  return <section className="space-y-5"><PageHeading eyebrow="Your account" title="Profile" description="Personal and vehicle information for your delivery account." onRefresh={refresh} loading={loading} /><ServiceNotice error={error} loading={false} refresh={refresh} noun="Profile" />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="rounded-xl border border-[#e2e9e3] bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4"><div className="flex items-center gap-3"><div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e5f2e8] text-xl font-bold text-[#23633a]">{(profile.profile_photo_url || profile.photo_url || profile.avatar_url) ? <img src={profile.profile_photo_url || profile.photo_url || profile.avatar_url} alt="" className="h-full w-full object-cover" /> : (profile.full_name || userProfile?.displayName || "D").charAt(0).toUpperCase()}</div><div><p className="font-bold">{profile.full_name || profile.name || userProfile?.displayName || "Delivery Partner"}</p><p className="mt-1 text-xs text-gray-500">{profile.account_status || profile.status || "Account details"}</p></div></div><button type="button" onClick={editing ? () => setEditing(false) : startEditing} className="rounded-lg border border-[#dce6de] px-3 py-2 text-sm font-semibold text-[#21643a]">{editing ? "Cancel edit" : "Edit profile"}</button></div>
      {editing ? <form onSubmit={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">{[["full_name", "Full name"], ["phone_number", "Mobile number"], ["email", "Email"], ["address", "Address"], ["vehicle_type", "Vehicle type"], ["vehicle_number", "Vehicle number"]].map(([name, label]) => <label key={name} className="text-xs font-semibold text-gray-600">{label}<input name={name} value={form[name] || ""} onChange={updateField} type={name === "email" ? "email" : "text"} className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal text-gray-800 outline-none focus:border-[#4a8b5a]" /></label>)}<div className="sm:col-span-2"><button disabled={saving} className="rounded-lg bg-[#21643a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save profile"}</button></div></form> : <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">{[["Full name", profile.full_name || profile.name || userProfile?.displayName], ["Mobile number", profile.phone_number || userProfile?.phone], ["Email", profile.email || userProfile?.email], ["Address", profile.address], ["Vehicle type", profile.vehicle_type], ["Vehicle number", profile.vehicle_number]].map(([label, value]) => <div key={label}><dt className="text-xs font-medium text-gray-500">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-gray-800">{value || "Not provided"}</dd></div>)}</dl>}</div>
      <aside className="space-y-3"><div className="rounded-xl border border-[#e2e9e3] bg-white p-4"><div className="flex items-center gap-2"><ShieldCheck size={17} className="text-[#39804f]" /><h2 className="text-sm font-bold">Verification</h2></div><p className="mt-3 text-sm text-gray-600">Driving license and ID documents are kept private and are not displayed in this panel.</p><p className="mt-3 text-xs font-semibold text-gray-500">Account status: {profile.account_status || profile.status || "—"}</p></div><div className="rounded-xl border border-[#e2e9e3] bg-white p-4"><div className="flex items-center gap-2"><LockKeyhole size={17} className="text-[#39804f]" /><h2 className="text-sm font-bold">Bank details</h2></div><p className="mt-3 text-sm text-gray-600">{profile.bank_account_last4 || profile.account_last_four ? `Account ending in •••• ${profile.bank_account_last4 || profile.account_last_four}` : "Bank details are securely stored."}</p><button type="button" onClick={() => setBankOpen(true)} className="mt-3 text-sm font-semibold text-[#21643a]">Update bank details</button></div><button type="button" onClick={() => setPasswordOpen(true)} className="w-full rounded-lg border border-[#dce6de] bg-white px-4 py-3 text-left text-sm font-semibold text-gray-700">Change password</button><button type="button" onClick={() => setLogoutOpen(true)} className="w-full rounded-lg border border-rose-200 bg-white px-4 py-3 text-left text-sm font-semibold text-rose-700">Log out</button></aside></div>
    {bankOpen && <BankDetailsDialog onClose={() => setBankOpen(false)} />}
    {passwordOpen && <ChangePasswordDialog onClose={() => setPasswordOpen(false)} />}
    {logoutOpen && <LogoutConfirmModal onCancel={() => setLogoutOpen(false)} onConfirm={logout} />}
  </section>;
};

const ChangePasswordDialog = ({ onClose }) => {
  const [values, setValues] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (values.new_password !== values.confirm_password) { toast.error("The new passwords do not match."); return; }
    setSaving(true);
    try { await api.post("/delivery-partner/password", { current_password: values.current_password, new_password: values.new_password }); toast.success("Password updated"); onClose(); }
    catch (requestError) { toast.error(requestError?.response?.data?.message || "Password updates are unavailable."); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4"><form onSubmit={submit} className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"><h2 className="font-bold">Change password</h2><div className="mt-4 space-y-3">{[["current_password", "Current password"], ["new_password", "New password"], ["confirm_password", "Confirm new password"]].map(([name, label]) => <label key={name} className="block text-xs font-semibold text-gray-600">{label}<input required minLength={8} type="password" autoComplete="new-password" value={values[name]} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal" /></label>)}</div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-[#21643a] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Update password"}</button></div></form></div>;
};

const BankDetailsDialog = ({ onClose }) => {
  const [values, setValues] = useState({ account_holder_name: "", bank_name: "", account_number: "", ifsc_code: "", upi_id: "" });
  const [saving, setSaving] = useState(false);
  const submit = async (event) => { event.preventDefault(); setSaving(true); try { await api.patch("/delivery-partner/profile/bank", values); toast.success("Bank details updated securely"); onClose(); } catch (requestError) { toast.error(requestError?.response?.data?.message || "Bank detail updates are unavailable."); } finally { setSaving(false); } };
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4"><form onSubmit={submit} className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="font-bold">Update bank details</h2><LockKeyhole size={18} className="text-[#39804f]" /></div><p className="mt-1 text-xs text-gray-500">Account number is masked while you type and sent only to the secure profile service.</p><div className="mt-4 space-y-3">{[["account_holder_name", "Account holder"], ["bank_name", "Bank name"], ["account_number", "Account number"], ["ifsc_code", "IFSC code"], ["upi_id", "UPI ID (optional)"]].map(([name, label]) => <label key={name} className="block text-xs font-semibold text-gray-600">{label}<input required={!name.includes("upi")} type={name === "account_number" ? "password" : "text"} autoComplete="off" value={values[name]} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#4a8b5a]" /></label>)}</div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-[#21643a] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save securely"}</button></div></form></div>;
};

const SupportPage = () => {
  const { resource, loading, error, refresh } = usePartnerResource("/delivery-partner/support");
  const tickets = rowsFrom(resource?.tickets || resource);
  const [form, setForm] = useState({ issue_type: "Order Issue", order_id: "", description: "", attachment: null });
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (!form.description.trim()) { toast.error("Describe the issue before submitting."); return; }
    const payload = new FormData();
    payload.append("issue_type", form.issue_type);
    payload.append("order_id", form.order_id);
    payload.append("description", form.description);
    if (form.attachment) payload.append("attachment", form.attachment);
    setSubmitting(true);
    try { await api.post("/delivery-partner/support", payload); toast.success("Support request submitted"); setForm({ issue_type: "Order Issue", order_id: "", description: "", attachment: null }); refresh(); }
    catch (requestError) { toast.error(requestError?.response?.data?.message || "Support requests are unavailable."); }
    finally { setSubmitting(false); }
  };
  return <section className="space-y-5"><PageHeading eyebrow="Help & support" title="Support" description="Contact the operations team about an order, payment, or app issue." onRefresh={refresh} loading={loading} /><ServiceNotice error={error} loading={false} refresh={refresh} noun="Support tickets" />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]"><form onSubmit={submit} className="rounded-xl border border-[#e2e9e3] bg-white p-5"><div className="flex items-center gap-2"><MessageSquareText size={18} className="text-[#39804f]" /><h2 className="font-bold">Report an issue</h2></div><label className="mt-4 block text-xs font-semibold text-gray-600">Issue type<select value={form.issue_type} onChange={(event) => setForm((current) => ({ ...current, issue_type: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal"><option>Order Issue</option><option>Customer Issue</option><option>Payment Issue</option><option>Technical Support</option><option>Other</option></select></label><label className="mt-3 block text-xs font-semibold text-gray-600">Order ID (optional)<input value={form.order_id} onChange={(event) => setForm((current) => ({ ...current, order_id: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal" /></label><label className="mt-3 block text-xs font-semibold text-gray-600">Description<textarea required rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="mt-1.5 w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal" placeholder="Tell us what happened" /></label><label className="mt-3 flex items-center gap-2 text-xs font-medium text-gray-600"><FileText size={15} /><span>Attach image or document</span><input type="file" accept="image/*,.pdf" onChange={(event) => setForm((current) => ({ ...current, attachment: event.target.files?.[0] || null }))} className="max-w-52 text-xs" /></label><button disabled={submitting} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#21643a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Send size={15} />{submitting ? "Submitting..." : "Submit ticket"}</button></form>
      <div className="rounded-xl border border-[#e2e9e3] bg-white"><div className="border-b border-gray-100 p-4"><h2 className="font-bold">Previous tickets</h2><p className="mt-1 text-xs text-gray-500">Replies from support appear alongside your tickets.</p></div><div className="divide-y divide-gray-100">{tickets.map((ticket, index) => <article key={ticket.ticket_id || ticket.id || index} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-gray-500">{ticket.ticket_id || ticket.id}</p><h3 className="mt-1 text-sm font-bold">{ticket.subject || ticket.issue_type || "Support request"}</h3></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">{ticket.status || "Open"}</span></div><p className="mt-2 text-sm text-gray-600">{ticket.admin_response || ticket.response || "Awaiting support response."}</p><p className="mt-2 text-xs text-gray-400">{ticket.created_at ? new Date(ticket.created_at).toLocaleDateString("en-IN") : ""}</p></article>)}{!loading && !error && tickets.length === 0 && <p className="px-4 py-12 text-center text-sm text-gray-500">No support tickets yet.</p>}</div></div></div>
  </section>;
};

const DeliveryPartnerPages = ({ section }) => {
  if (section === "earnings") return <EarningsPage />;
  if (section === "history") return <DeliveryHistoryPage />;
  if (section === "notifications") return <NotificationsPage />;
  if (section === "profile") return <ProfilePage />;
  if (section === "support") return <SupportPage />;
  return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Page not found.</div>;
};

export default DeliveryPartnerPages;