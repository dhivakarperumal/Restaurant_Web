import { useState, useEffect, Suspense } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Bell, IndianRupee, Menu, PackageCheck, UserRound } from "lucide-react";
import Sidebar from "./DeliverySidebar";
import { useAuth } from "../PrivateRouter/AuthContext";

const mobileLinks = [
  { path: "/delivery", label: "Home", icon: PackageCheck, exact: true },
  { path: "/delivery/orders", label: "Orders", icon: PackageCheck },
  { path: "/delivery/earnings", label: "Earnings", icon: IndianRupee },
  { path: "/delivery/notifications", label: "Alerts", icon: Bell },
  { path: "/delivery/profile", label: "Profile", icon: UserRound },
];

const pageTitles = {
  "/delivery": "Dashboard",
  "/delivery/orders": "Orders",
  "/delivery/earnings": "Earnings",
  "/delivery/history": "Delivery History",
  "/delivery/notifications": "Notifications",
  "/delivery/profile": "Profile",
  "/delivery/support": "Support",
};

const DeliveryLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);
  const location = useLocation();
  const { userProfile } = useAuth();
  const name = userProfile?.displayName || userProfile?.name || "Delivery Partner";

  useEffect(() => {
    const handleResize = () => {
      const isLg = window.innerWidth >= 1024;
      setIsLargeScreen(isLg);
      if (isLg) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#f4f7f4] text-[#17231c]">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
      />
      <div className={`flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300 ${isLargeScreen ? (sidebarCollapsed ? "lg:ml-[80px]" : "lg:ml-72") : ""}`}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#e1e9e2] bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation" className="grid h-10 w-10 place-items-center rounded-lg border border-[#e1e9e2] text-[#284d35] lg:hidden">
              <Menu size={19} />
            </button>
            <Link to="/delivery" className="truncate text-sm font-bold text-[#173b27] sm:text-base">Delivery Partner</Link>
            <span className="hidden h-5 border-l border-gray-200 sm:block" />
            <span className="hidden truncate text-sm capitalize text-gray-500 sm:block">{pageTitles[location.pathname] || "Order Details"}</span>
          </div>
          <div className="flex items-center gap-3">
            <NavLink to="/delivery/notifications" aria-label="Notifications" className="grid h-10 w-10 place-items-center rounded-lg text-gray-600 hover:bg-gray-100">
              <Bell size={18} />
            </NavLink>
            <div className="hidden max-w-44 text-right sm:block">
              <p className="truncate text-sm font-semibold text-gray-800">{name}</p>
              <p className="text-[11px] text-gray-500">Delivery Partner</p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#e5f2e8] text-sm font-bold text-[#23633a]">{name.charAt(0).toUpperCase()}</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-[#f4f7f4] p-4 pb-24 sm:p-5 sm:pb-24 lg:p-6">
          <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d9e6dc] border-t-[#24713e]" aria-label="Loading" /></div>}>
            <Outlet />
          </Suspense>
        </main>
        <footer className="hidden border-t border-[#e1e9e2] bg-white px-6 py-3 text-xs text-gray-500 lg:block">Delivery Partner Workspace</footer>
      </div>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#e1e9e2] bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur lg:hidden">
        {mobileLinks.map(({ path, label, icon: Icon, exact }) => (
          <NavLink key={path} to={path} end={exact} className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium ${isActive ? "text-[#1e6a39]" : "text-gray-500"}`}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default DeliveryLayout;
