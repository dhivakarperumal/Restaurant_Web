import { useState, useEffect, Suspense } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import React from "react";
import { PacmanLoader } from "react-spinners";
import { Bike, ClipboardList, Home, Plus, ShoppingBag, Table2, UtensilsCrossed, X } from "lucide-react";
import Sidebar from "./ServerSidebar";
import Header from "./ServerHeader";

const ServerLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(
    window.innerWidth >= 1024
  );

  useEffect(() => {
    const handleResize = () => {
      const isLg = window.innerWidth >= 1024;
      setIsLargeScreen(isLg);
      if (isLg) setSidebarOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const location = useLocation();
  const navigate = useNavigate();
  const isPrintPage = location.pathname.includes('/Chef/pt-form/print/');
  const [orderSheetOpen, setOrderSheetOpen] = useState(false);
  const [selectingOrderType, setSelectingOrderType] = useState(false);

  useEffect(() => {
    if (!orderSheetOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !selectingOrderType) setOrderSheetOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [orderSheetOpen, selectingOrderType]);

  const startOrder = (orderType) => {
    if (selectingOrderType) return;
    setSelectingOrderType(true);
    setOrderSheetOpen(false);
    if (orderType === "dine-in") {
      navigate("/server/tables");
    } else {
      navigate("/server/foods", { state: { orderType, returnPath: "/server" } });
    }
    window.setTimeout(() => setSelectingOrderType(false), 350);
  };


  return (
    <div className={`admin-root admin-theme flex min-h-screen ${isPrintPage ? 'bg-gray-100 text-black' : 'bg-white text-gray-900'} print:bg-white print:text-black print:min-h-0 print:block`}>
      
      {/* Sidebar */}
      {!isPrintPage && (
        <div className="print:hidden">
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>
      )}

      {/* Main Content */}
      <div
        className={`
          flex flex-col flex-1 min-w-0 min-h-screen
          transition-all duration-300 ease-in-out
          bg-[#fafcff]
          ${!isPrintPage && isLargeScreen ? (sidebarCollapsed ? "lg:ml-[80px]" : "lg:ml-72") : ""}
          print:ml-0 print:min-h-0 print:block print:w-full
        `}
      >
        {/* Header */}
        {!isPrintPage && (
          <div className="print:hidden sticky top-0 z-40">
            <Header onMenuClick={() => setSidebarOpen(true)} />
          </div>
        )}

        {/* Page Content */}
        <main className={`flex-1 ${isPrintPage ? 'p-0' : 'p-4 pb-24 sm:p-5 sm:pb-24 lg:p-6'} overflow-y-auto bg-[#f3f4f6] print:p-0 print:m-0 print:overflow-visible`}>
          <div className={isPrintPage ? '' : 'glass-container bg-[#f3f4f6] print:bg-transparent print:border-none print:p-0 print:m-0 print:shadow-none print:backdrop-filter-none'}>
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 print:hidden">
                <PacmanLoader color="#ef4444" size={20} />
                <p className="text-white/30 text-[10px] tracking-widest uppercase">Accessing Terminal...</p>
              </div>
            }>
              <Outlet />
            </Suspense>
          </div>
        </main>

        {/* Footer */}
       {!isPrintPage && (
         <footer className="glass-footer bg-gray-100 text-center py-4  text-sm  print:hidden">
           © {new Date().getFullYear()} Q-Techx Solutions. All rights reserved.
         </footer>
       )}

      </div>
       {!isPrintPage && (
         <nav aria-label="Server mobile navigation" className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 items-end border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
           <NavLink to="/server" end className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${isActive ? "text-emerald-800" : "text-slate-500"}`}>
             <Home size={18} />Home
           </NavLink>
           <NavLink to="/server/tables" className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${isActive ? "text-emerald-800" : "text-slate-500"}`}>
             <Table2 size={18} />Tables
           </NavLink>
           <button type="button" onClick={() => setOrderSheetOpen(true)} aria-label="Start a new order" className="mx-auto mb-2 grid h-14 w-14 place-items-center rounded-full bg-[#FF5A00] text-white shadow-lg shadow-orange-500/30 transition hover:scale-105 hover:bg-[#E94B00] active:scale-95">
             <Plus size={27} strokeWidth={2.5} />
           </button>
           <NavLink to="/server/foods" className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${isActive ? "text-emerald-800" : "text-slate-500"}`}>
             <UtensilsCrossed size={18} />Menu
           </NavLink>
           <NavLink to="/server/attendance" className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${isActive ? "text-emerald-800" : "text-slate-500"}`}>
             <ClipboardList size={18} />Shift
           </NavLink>
         </nav>
       )}
       {!isPrintPage && (
         <div className={`fixed inset-0 z-[60] flex items-end justify-center transition-opacity duration-200 lg:hidden ${orderSheetOpen ? "visible bg-slate-950/45 opacity-100" : "invisible pointer-events-none opacity-0"}`}>
           <button type="button" aria-label="Close order type selector" onClick={() => setOrderSheetOpen(false)} className="absolute inset-0 h-full w-full cursor-default" />
           <section aria-labelledby="server-order-sheet-title" aria-modal="true" role="dialog" aria-hidden={!orderSheetOpen} inert={!orderSheetOpen} className={`relative w-full rounded-t-3xl border border-white/70 bg-white px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl transition-transform duration-300 ${orderSheetOpen ? "translate-y-0" : "translate-y-full"}`}>
             <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300" />
             <div className="mb-5 flex items-center justify-between">
               <div>
                 <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-700">New order</p>
                 <h2 id="server-order-sheet-title" className="mt-1 text-xl font-extrabold text-slate-900">Select Order Type</h2>
               </div>
               <button type="button" onClick={() => setOrderSheetOpen(false)} aria-label="Close order type selector" className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">
                 <X size={19} />
               </button>
             </div>
             <div className="grid gap-3 sm:grid-cols-3">
               {[
                 { type: "dine-in", label: "Dine-In / Table", Icon: Table2, detail: "Choose an available table" },
                 { type: "home_delivery", label: "Home Delivery", Icon: Bike, detail: "Enter customer and address" },
                 { type: "pickup", label: "Pick Up", Icon: ShoppingBag, detail: "Enter customer details" },
               ].map(({ type, label, Icon, detail }) => (
                 <button key={type} type="button" onClick={() => startOrder(type)} disabled={selectingOrderType} className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-orange-300 hover:bg-orange-50 disabled:opacity-60 sm:flex-col sm:items-start">
                   <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-700"><Icon size={22} /></span>
                   <span className="min-w-0">
                     <span className="block text-sm font-bold text-slate-900">{label}</span>
                     <span className="mt-1 block text-xs text-slate-500">{detail}</span>
                   </span>
                 </button>
               ))}
             </div>
           </section>
         </div>
       )}
    </div>
  );
};

export default ServerLayout;
