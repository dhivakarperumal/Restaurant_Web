import { useState, useEffect, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import React from "react";
import { PacmanLoader } from "react-spinners";
import Sidebar from "./AdminSidebar";
import Header from "./AdminHeader";

const AdminLayout = () => {
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
  const isPrintPage = location.pathname.includes('/admin/pt-form/print/');


  return (
    <div className={`admin-root flex min-h-screen ${isPrintPage ? 'bg-gray-100 text-black' : 'bg-white text-gray-900'} print:bg-white print:text-black print:min-h-0 print:block`}>
      
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
        <main className={`flex-1 ${isPrintPage ? 'p-0' : 'p-4 sm:p-5 lg:p-6'} overflow-y-auto bg-[#f3f4f6] print:p-0 print:m-0 print:overflow-visible`}>
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
    </div>
  );
};

export default AdminLayout;
