import { Link } from "react-router-dom";
import { useAuth } from "../PrivateRouter/AuthContext";
import { Bell, ChefHat, Lock, PackagePlus, ShieldCheck, UserCircle } from "lucide-react";

const ChefSettings = () => {
  const { profileName, email, role } = useAuth();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ChefHat size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Chef Access</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Chef Settings</h1>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-slate-800">
            <UserCircle size={18} />
            <h2 className="text-lg font-bold">Profile</h2>
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <p><span className="font-semibold text-slate-800">Name:</span> {profileName}</p>
            <p><span className="font-semibold text-slate-800">Role:</span> {role}</p>
            <p><span className="font-semibold text-slate-800">Email:</span> {email || "Not provided"}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-slate-800">
            <Bell size={18} />
            <h2 className="text-lg font-bold">Kitchen Alerts</h2>
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>• Live kitchen order updates</li>
            <li>• Ready-to-serve notifications</li>
            <li>• Low stock reminders</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-slate-800">
            <ShieldCheck size={18} />
            <h2 className="text-lg font-bold">Security</h2>
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>• Role-based access enabled</li>
            <li>• Chef workspace isolated</li>
            <li>• Protected kitchen actions</li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-slate-800">
              <PackagePlus size={18} />
              <h2 className="text-lg font-bold">Inventory Request</h2>
            </div>
            <p className="text-sm text-slate-600">
              Create ingredient and stock requests for the kitchen team.
            </p>
          </div>
          <Link to="/admin/inventory/kitchen-requests" className="rounded-xl bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white">
            Open Request
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <Lock size={16} />
          Chef settings are managed separately from the admin settings page.
        </div>
      </div>
    </div>
  );
};

export default ChefSettings;
