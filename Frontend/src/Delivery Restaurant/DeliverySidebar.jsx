import { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  History,
  IndianRupee,
  LayoutDashboard,
  LifeBuoy,
  List,
  LogOut,
  PackageCheck,
  PlusSquare,
  ShoppingCart,
  CalendarCheck,
  X,
  XCircle,
  ChevronDown,
  ChevronLeft,
  Home,
  UserRound,
} from "lucide-react";

import { useAuth } from "../PrivateRouter/AuthContext";
import LogoutConfirmModal from "../CommonComponents/LogoutConfirmModal";
const Logo = "/images/adminlogo.png";

/* ================= NAV ITEMS ================= */
const navItems = [
  { path: "/delivery", label: "Dashboard", icon: LayoutDashboard, exact: true },
  {
    label: "Orders",
    icon: ShoppingCart,
    children: [
      { path: "/delivery/orders/new", label: "New Orders", icon: PlusSquare },
      { path: "/delivery/orders", label: "All Orders", icon: List },
      { path: "/delivery/orders/delivery", label: "Delivery Orders", icon: PackageCheck },
      { path: "/delivery/orders/cancelled", label: "Cancelled Orders", icon: XCircle },
    ],
  },
  { path: "/delivery/earnings", label: "Earnings", icon: IndianRupee },
  { path: "/delivery/history", label: "Delivery History", icon: History },
  { path: "/delivery/attendance", label: "Attendance", icon: CalendarCheck },
  
];

/* ================= SIDEBAR ================= */
const DeliverySidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);
  const pendingCount = 0;
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navRef = useRef(null);

  /* ===== PRESERVE SIDEBAR SCROLL POSITION ===== */
  useEffect(() => {
    const savedScroll = sessionStorage.getItem("delivery_sidebar_scroll");
    if (savedScroll !== null && navRef.current) {
      navRef.current.scrollTop = Number(savedScroll);
    }
  }, [location.pathname]);

  const handleNavScroll = (e) => {
    sessionStorage.setItem("delivery_sidebar_scroll", e.currentTarget.scrollTop);
  };

  /* ===== AUTO OPEN DROPDOWN WHEN CHILD ACTIVE ===== */
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some((child) =>
          location.pathname === child.path || location.pathname.startsWith(child.path + "/")
        );
        if (isChildActive) setOpenMenu(item.label);
      }
    });
  }, [location.pathname]);

  const isRouteActive = (path, exact = false) => {
    if (path === "/admin" || path === "/") return location.pathname === path;
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const toggleMenu = (label) => setOpenMenu(openMenu === label ? null : label);

  return (
    <>
      {/* ========== MOBILE OVERLAY ========== */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity ${isOpen ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
      />

      {/* ========== SIDEBAR ========== */}
      <aside
        data-sidebar="delivery-sidebar"
        className={`
          fixed top-0 left-0 z-50 h-full flex flex-col
          border-r border-white/25
          
          transition-all duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${collapsed ? "w-[88px]" : "w-72"}
        `}
      >
        {/* ========== LOGO ========== */}
        <div className={`flex items-center gap-3 border-b border-white/25 shrink-0 ${collapsed ? "px-3 py-5 justify-center" : "px-5 py-5"}`}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 p-1 border border-[#d4a843]/30 bg-white">
            <img src={Logo} alt="Buy Foods restaurant logo" className="w-full h-full object-contain drop-shadow-lg" />
          </div>

          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <h1 className="text-base font-bold text-white tracking-wide font-serif">Delivery Partner</h1>
              <p className="text-[10px] text-white tracking-[0.2em] uppercase">
                Partner workspace
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className="ml-auto p-2 rounded-lg text-white/50 hover:bg-white/10 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========== NAVIGATION ========== */}
        <nav
          ref={navRef}
          onScroll={handleNavScroll}
          data-sidebar="delivery-nav"
          className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide"
        >
          {navItems.map((item) => {
            const Icon = item.icon;

            /* ===== DROPDOWN ITEM ===== */
            if (item.children) {
              const isMenuOpen = openMenu === item.label;
              const isAnyChildActive = item.children.some((c) => isRouteActive(c.path));

              return (
                <div key={item.label} className="space-y-1">
                  <button
                    onClick={() => toggleMenu(item.label)}
                    title={collapsed ? item.label : ""}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm
                      transition-all duration-200 group
                      ${isAnyChildActive
                        ? "admin-sidebar-link-active bg-white text-[#FF5A00] border-l-2 border-white"
                        : "text-white hover:text-white hover:bg-white/10"
                      }
                    `}
                  >
                    <Icon className={`w-[17px] h-[17px] shrink-0 ${isAnyChildActive ? "text-[#FF5A00]" : "text-white"}`} />
                    {!collapsed && (
                      <>
                        <span className={`flex-1 text-left font-semibold truncate ${isAnyChildActive ? "text-[#FF5A00]" : "text-white"}`}>{item.label}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${isMenuOpen ? "rotate-180" : ""} ${isAnyChildActive ? "text-[#FF5A00]" : ""}`}
                        />
                      </>
                    )}
                  </button>

                  {/* ===== SUB MENU ===== */}
                  {!collapsed && (
                    <div
                      className={`ml-8 mt-1.5 space-y-1 overflow-hidden transition-all duration-200 ${isMenuOpen ? "max-h-72 opacity-100" : "max-h-0 opacity-0"
                        }`}
                    >
                      {item.children.map((sub) => {
                        const SubIcon = sub.icon;
                        const isActive =
                          isRouteActive(sub.path) &&
                          !item.children.some(
                            (other) =>
                              other.path !== sub.path &&
                              other.path.length > sub.path.length &&
                              isRouteActive(other.path),
                          );


                        return (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            end
                            onClick={() => isOpen && onClose()}
                            className={`
                              flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold
                              transition-all duration-200
                              ${isActive
                                ? "admin-sidebar-link-active bg-white text-[#FF5A00] font-bold"
                                : "text-white hover:text-white hover:bg-white/10"
                              }
                            `}
                            title={collapsed && sub.badge ? `${sub.label} (${pendingCount})` : ''}
                          >
                            <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#FF5A00]" : "text-white"}`} />
                            <span className={`truncate flex-1 ${isActive ? "text-[#FF5A00]" : "text-white"}`}>{sub.label}</span>
                            {sub.badge === 'pending' && pendingCount > 0 && !collapsed && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 ml-2 shrink-0">
                                {pendingCount}
                              </span>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            /* ===== NORMAL ITEM ===== */
            const isActive = isRouteActive(item.path, item.exact);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                title={collapsed ? item.label : ""}
                onClick={() => isOpen && onClose()}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl text-sm
                  transition-all duration-200
                  ${isActive
                    ? "admin-sidebar-link-active bg-white text-[#FF5A00] font-bold shadow-md"
                    : "text-white hover:text-white hover:bg-white/10 font-semibold"
                  }
                  ${collapsed ? "justify-center" : ""}
                `}
              >
                <Icon className={`w-[17px] h-[17px] shrink-0 ${isActive ? "text-[#FF5A00]" : "text-white"}`} />
                {!collapsed && <span className={`font-semibold truncate ${isActive ? "text-[#FF5A00]" : "text-white"}`}>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <NavLink
          to="/"
          title={collapsed ? "Back Home" : ""}
          onClick={() => isOpen && onClose()}
          className={`admin-sidebar-link mx-3 mb-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${isRouteActive("/") ? "admin-sidebar-link-active bg-white text-[#FF5A00] shadow-md" : "text-white hover:bg-white/10"} ${collapsed ? "justify-center" : ""}`}
        >
          <Home className={`h-[17px] w-[17px] shrink-0 ${isRouteActive("/") ? "text-[#FF5A00]" : "text-white"}`} />
          {!collapsed && <span className="truncate">Back Home</span>}
        </NavLink>

       
        {/* ========== COLLAPSE BUTTON ========== */}
        <button
          onClick={onToggleCollapse}
          className="
            hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2
            w-7 h-7 rounded-full
            bg-[#d4a843] shadow-lg
            border border-white/70
            items-center justify-center
            text-[#162420] hover:scale-105 transition-all duration-200
          "
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
          />
        </button>

        {/* ========== BOTTOM USER STRIP ========== */}
        {!collapsed && (
          <div className="shrink-0 border-t border-white/25 px-3 py-4">
            <div className="flex min-w-0 select-none items-center gap-3 rounded-xl border border-white/20 bg-white/15 px-3 py-3 shadow-inner">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-[#FF5A00] shadow-sm">
                {(userProfile?.displayName?.[0] || "A").toUpperCase()}
              </div>
              <div className="min-w-0 overflow-hidden">
                <p className="truncate text-xs font-semibold text-white">
                  {userProfile?.displayName || "Delivery Partner"}
                </p>
                <p className="truncate text-[9px] font-medium text-white/70" title={userProfile?.email || "Email not provided"}>
                  {userProfile?.email || userProfile?.role || "Delivery Partner"}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
      {showLogoutConfirm && (
        <LogoutConfirmModal
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={() => {
            logout();
            navigate("/", { replace: true });
          }}
        />
      )}
    </>
  );
};

export default DeliverySidebar;
