import { ChevronRight, Settings, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../PrivateRouter/AuthContext";

const AdminSettings = () => {
  const { user } = useAuth();
  const displayName = user?.displayName || user?.username || user?.name || "Administrator";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-[calc(100vh-120px)] bg-[#f3f4f6] px-1 py-2 md:px-3 md:py-4">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef5f3] text-[#1a3c36]"><Settings className="h-6 w-6" /></div>
          <div><h1 className="text-2xl font-bold text-[#1f2937]">Settings</h1><p className="mt-1 text-sm text-[#66736e]">Manage your administrator account and preferences.</p></div>
        </header>

        <section className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-[#e5e7eb] bg-white p-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1a3c36] text-lg font-bold text-white">{initials}</div>
          <div className="min-w-0 flex-1"><h2 className="truncate text-base font-semibold text-[#1f2937]">{displayName}</h2><p className="truncate text-sm text-[#66736e]">{user?.email || "No email available"}</p></div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#eef5f3] px-3 py-1.5 text-xs font-semibold text-[#1a3c36]"><ShieldCheck className="h-4 w-4" />{user?.role || "Administrator"}</span>
        </section>

        <section className="rounded-xl border border-[#e5e7eb] bg-white">
          <div className="border-b border-[#e5e7eb] px-5 py-4"><h2 className="text-sm font-semibold text-[#1f2937]">Account</h2><p className="mt-1 text-xs text-[#66736e]">Update your personal details.</p></div>
          <Link to="/admin/settings/profile" className="flex items-center gap-4 px-5 py-4 transition hover:bg-[#f8faf9]">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f3f4f6] text-[#1a3c36]"><UserRound className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#1f2937]">Profile details</span><span className="mt-1 block text-xs text-[#66736e]">Change your name and phone number.</span></span>
            <ChevronRight className="h-5 w-5 text-[#66736e]" />
          </Link>
        </section>
      </div>
    </div>
  );
};

export default AdminSettings;