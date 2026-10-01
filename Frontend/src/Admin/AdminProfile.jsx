import { useEffect, useState } from "react";
import { BadgeCheck, CalendarDays, Check, Mail, Phone, Save, ShieldCheck, UserRound } from "lucide-react";
import api from "../api";
import { useAuth } from "../PrivateRouter/AuthContext";
import toast from "react-hot-toast";

const AdminProfile = () => {
  const { user, userProfile, setUser } = useAuth();
  const profileId = userProfile?.user_id || userProfile?.id || user?.user_id || user?.id;
  const [profile, setProfile] = useState(userProfile || user || {});
  const [form, setForm] = useState({ username: profile.username || profile.displayName || "", mobile_number: profile.mobile_number || profile.phone || "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!profileId) { setLoading(false); return; }
      try {
        const response = await api.get(`/users/profile/${profileId}`);
        const nextProfile = response.data?.data || {};
        setProfile(nextProfile);
        setForm({ username: nextProfile.username || "", mobile_number: nextProfile.mobile_number || nextProfile.phone || "" });
      } catch (error) {
        console.error("Failed to load profile:", error);
        toast.error(error.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [profileId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const response = await api.put(`/users/profile/${profileId}`, form);
      const updatedProfile = { ...profile, ...(response.data?.data || form), ...form };
      setProfile(updatedProfile);
      setUser((previous) => previous ? { ...previous, ...updatedProfile, displayName: updatedProfile.username } : previous);
      localStorage.setItem("user", JSON.stringify({ ...user, ...updatedProfile, displayName: updatedProfile.username }));
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const displayName = profile.username || profile.displayName || "Administrator";
  const initials = displayName.slice(0, 2).toUpperCase();

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-[#66736e]">Loading profile...</div>;

  return (
    <div className="min-h-[calc(100vh-120px)] bg-[#f3f4f6] px-1 py-2 md:px-3 md:py-4">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[28px] bg-[#173b35] px-6 py-8 text-white shadow-[0_18px_50px_rgba(23,59,53,0.18)] md:px-10 md:py-10">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[36px] border-[#d4a843]/25" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e5c875]">Account settings</p><h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Your profile</h1><p className="mt-2 max-w-lg text-sm text-[#d7e4df]">Keep your administrator details current and easy to recognize.</p></div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm"><BadgeCheck className="h-5 w-5 text-[#e5c875]" /><div><p className="text-xs font-bold">Verified account</p><p className="text-[11px] text-[#c1d3cc]">Admin access enabled</p></div></div>
          </div>
        </div>

        <div className="-mt-8 grid gap-6 px-3 pb-8 lg:grid-cols-[290px_1fr] lg:px-8">
          <aside className="relative rounded-3xl border border-[#e7e0d8] bg-white p-6 shadow-[0_8px_30px_rgba(31,31,31,0.07)]">
            <div className="flex flex-col items-center text-center"><div className="flex h-28 w-28 items-center justify-center rounded-[32px] border-8 border-[#f3ead7] bg-[#d4a843] text-3xl font-black text-[#173b35] shadow-lg">{initials}</div><h2 className="mt-5 text-xl font-black text-[#1f2925]">{displayName}</h2><p className="mt-1 text-sm text-[#7a817d]">{profile.email || "No email added"}</p><span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#edf7f1] px-3 py-1.5 text-xs font-bold text-[#2d7b5a]"><ShieldCheck className="h-3.5 w-3.5" /> {profile.role || "Administrator"}</span></div>
            <div className="mt-7 space-y-3 border-t border-[#f0ebe6] pt-5 text-left"><div className="flex items-center gap-3 text-xs text-[#66736e]"><CalendarDays className="h-4 w-4 text-[#b07838]" /><span>Joined {profile.created_at ? new Date(profile.created_at).toLocaleDateString("en-IN") : "Recently"}</span></div><div className="flex items-center gap-3 text-xs text-[#66736e]"><Check className="h-4 w-4 text-[#2d7b5a]" /><span>Account status: {profile.status || "Active"}</span></div></div>
          </aside>

          <form onSubmit={handleSubmit} className="rounded-3xl border border-[#e7e0d8] bg-white p-6 shadow-[0_8px_30px_rgba(31,31,31,0.07)] md:p-8"><div className="border-b border-[#f0ebe6] pb-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b07838]">Personal information</p><h2 className="mt-1 text-xl font-black text-[#1f2925]">Profile details</h2><p className="mt-1 text-sm text-[#7a817d]">Update the information shown across your admin workspace.</p></div><div className="mt-7 grid gap-5 md:grid-cols-2"><label className="space-y-2"><span className="flex items-center gap-2 text-sm font-bold text-[#333]"><UserRound className="h-4 w-4 text-[#b07838]" /> Full name</span><input required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className="h-12 w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-4 text-sm outline-none transition focus:border-[#b07838] focus:ring-2 focus:ring-[#d4a843]/20" /></label><label className="space-y-2"><span className="flex items-center gap-2 text-sm font-bold text-[#333]"><Phone className="h-4 w-4 text-[#b07838]" /> Phone number</span><input value={form.mobile_number} onChange={(event) => setForm({ ...form, mobile_number: event.target.value })} className="h-12 w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-4 text-sm outline-none transition focus:border-[#b07838] focus:ring-2 focus:ring-[#d4a843]/20" /></label><label className="space-y-2 md:col-span-2"><span className="flex items-center gap-2 text-sm font-bold text-[#333]"><Mail className="h-4 w-4 text-[#b07838]" /> Email address</span><input disabled value={profile.email || ""} className="h-12 w-full cursor-not-allowed rounded-xl border border-[#e5e1dc] bg-[#f3f1ee] px-4 text-sm text-[#777]" /><span className="block text-[11px] text-[#8a918d]">Email and role are managed by your administrator account.</span></label></div><div className="mt-8 flex justify-end border-t border-[#f0ebe6] pt-5"><button type="submit" disabled={saving || !profileId} className="inline-flex items-center gap-2 rounded-xl bg-[#173b35] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#214a42] disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? "Saving..." : "Save changes"}</button></div></form>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;