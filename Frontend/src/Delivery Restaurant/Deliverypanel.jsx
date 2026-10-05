import { useState, useEffect, Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { IndianRupee, PackageCheck, UserRound } from "lucide-react";
import Sidebar from "./DeliverySidebar";
import DeliveryHeader from "./DeliveryHeader";

const mobileLinks = [
  { path: "/delivery", label: "Home", icon: PackageCheck, exact: true },
  { path: "/delivery/orders", label: "Orders", icon: PackageCheck },
  { path: "/delivery/earnings", label: "Earnings", icon: IndianRupee },
  { path: "/delivery/profile", label: "Profile", icon: UserRound },
];

const DeliveryLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);

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
        <DeliveryHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-[#f4f7f4] p-4 pb-24 sm:p-5 sm:pb-24 lg:p-6">
          <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d9e6dc] border-t-[#24713e]" aria-label="Loading" /></div>}>
            <Outlet />
          </Suspense>
        </main>
        <footer className="hidden border-t border-[#e1e9e2] bg-white px-6 py-3 text-xs text-gray-500 lg:block">Delivery Partner Workspace</footer>
      </div>
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#e1e9e2] bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur lg:hidden">
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
