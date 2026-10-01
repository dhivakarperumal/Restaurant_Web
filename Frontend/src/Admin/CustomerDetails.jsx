import { useEffect, useState } from "react";
import { ArrowLeft, Mail, Pencil, Shield, User } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api";

const CustomerDetails = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const isEditing = searchParams.get("edit") === "true";
  const [customer, setCustomer] = useState(null);
  const [form, setForm] = useState({ username: "", mobile_number: "", role: "user", status: "Active" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        const response = await api.get(`/users/${userId}`);
        const data = response?.data?.data;
        setCustomer(data);
        setForm({ username: data?.username || "", mobile_number: data?.mobile_number || "", role: data?.role || "user", status: data?.status || "Active" });
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load customer");
      } finally {
        setLoading(false);
      }
    };
    loadCustomer();
  }, [userId]);

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const response = await api.put(`/users/${userId}`, form);
      setCustomer(response?.data?.data || { ...customer, ...form });
      toast.success("Customer updated successfully");
      navigate(`/admin/customers/${userId}`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update customer");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f2f3f0] text-sm text-[#666]">Loading customer...</div>;
  if (!customer) return <div className="flex min-h-screen items-center justify-center bg-[#f2f3f0] text-sm text-[#b42318]">Customer not found.</div>;

  return (
    <div className="min-h-screen bg-[#f2f3f0] p-4 md:p-6">
      <div className="mx-auto max-w-[900px]">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><button type="button" onClick={() => navigate("/admin/customers")} className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#49645e]"><ArrowLeft className="h-4 w-4" /> Back to Customers</button><h1 className="text-[2.1rem] font-bold tracking-[-0.05em] text-[#1f1d1b]">{isEditing ? "Edit Customer" : "Customer Details"}</h1></div>
          {!isEditing && <button type="button" onClick={() => navigate(`/admin/customers/${userId}?edit=true`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a3c36] px-5 py-3 text-sm font-semibold text-white"><Pencil className="h-4 w-4" /> Edit Customer</button>}
        </div>
        <form onSubmit={handleSave} className="rounded-2xl border border-[#e7e0d8] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4 border-b border-[#ece9e5] pb-6"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8f3eb] text-xl font-bold text-[#2d7b5a]"><User className="h-7 w-7" /></div><div><h2 className="text-xl font-bold text-[#1f1f1f]">{customer.username}</h2><p className="text-sm text-[#777]">{customer.user_id}</p></div></div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="space-y-2"><span className="text-sm font-semibold text-[#333]">Username</span><input value={form.username} disabled={!isEditing} onChange={(event) => setForm({ ...form, username: event.target.value })} className="w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 py-2.5 text-sm disabled:text-[#555]" /></label>
            <label className="space-y-2"><span className="text-sm font-semibold text-[#333]">Email</span><div className="flex items-center gap-2 rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 py-2.5 text-sm text-[#555]"><Mail className="h-4 w-4 text-[#999]" />{customer.email}</div></label>
            <label className="space-y-2"><span className="text-sm font-semibold text-[#333]">Mobile Number</span><input value={form.mobile_number} disabled={!isEditing} onChange={(event) => setForm({ ...form, mobile_number: event.target.value })} className="w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 py-2.5 text-sm disabled:text-[#555]" /></label>
            <label className="space-y-2"><span className="text-sm font-semibold text-[#333]">Role</span><select value={form.role} disabled={!isEditing} onChange={(event) => setForm({ ...form, role: event.target.value })} className="w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 py-2.5 text-sm disabled:text-[#555]"><option value="user">user</option><option value="Admin">Admin</option><option value="Super Admin">Super Admin</option></select></label>
            <label className="space-y-2"><span className="text-sm font-semibold text-[#333]">Status</span><select value={form.status} disabled={!isEditing} onChange={(event) => setForm({ ...form, status: event.target.value })} className="w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 py-2.5 text-sm disabled:text-[#555]"><option>Active</option><option>Inactive</option></select></label>
            <div className="space-y-2"><span className="text-sm font-semibold text-[#333]">Joined</span><div className="rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 py-2.5 text-sm text-[#555]">{customer.created_at ? new Date(customer.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</div></div>
          </div>
          {isEditing && <div className="mt-6 flex justify-end gap-3 border-t border-[#ece9e5] pt-5"><button type="button" onClick={() => navigate(`/admin/customers/${userId}`)} className="rounded-xl border border-[#dfe2e5] bg-white px-5 py-2.5 text-sm font-medium">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-[#1a3c36] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button></div>}
        </form>
      </div>
    </div>
  );
};

export default CustomerDetails;
