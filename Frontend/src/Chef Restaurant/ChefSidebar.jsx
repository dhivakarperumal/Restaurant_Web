import { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  GraduationCap,
  BookOpen,
  Receipt,
  DollarSign,
  CalendarOff,
  ClipboardCheck,
  BarChart3,
  CalendarDays,
  CalendarClock,
  X,
  ChevronDown,
  ChevronLeft,
  Home,
  Briefcase,
  UserCog,
  FileText,
  TrendingUp,
  Clock,
  Handshake,
  UserRoundPlus,
  List,
  FolderPlus,
  ClipboardList,
  Image,
  Server,
  Globe,
  PlusSquare,
  Edit3,
  UserCheck,
  Layers,
  AlertCircle,
  XCircle,
  Package,
  Printer,
  Gift,
  Album,
  ShoppingCart,
  Star,
  Zap,
  Tag,
  Lock,
  Settings,
  MessageSquare,
  UtensilsCrossed,
} from "lucide-react";

import { useAuth } from "../PrivateRouter/AuthContext";
const Logo = "/favicon.svg";

/* ================= NAV ITEMS ================= */
const navItems = [
  {
    path: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    path: "/chef/orders",
    label: "Kitchen Orders",
    icon: UtensilsCrossed,
  },
  {
    path: "/chef/requests",
    label: "Inventory Requests",
    icon: ClipboardList,
  },


  /* ---- PRODUCTS ---- */
  {
    label: "Foods",
    icon: Package,
    children: [
     
      { path: "/admin/products", label: "All Products", icon: Package },
      { path: "/admin/products/categories", label: "Category", icon: Layers },
      { path: "/admin/products/stock-details", label: "Stock Details", icon: ClipboardList },
    ],
  },






  {
    label: "Orders",
    icon: ShoppingCart,
    children: [
      { path: "/chef/customer-orders/new", label: "New Customer Orders", icon: PlusSquare },
      { path: "/chef/customer-orders", label: "All Customer Orders", icon: List },
      { path: "/chef/customer-orders/delivery", label: "Delivery Orders", icon: Package },
      { path: "/chef/customer-orders/cancelled", label: "Cancelled Orders", icon: XCircle },
    ],
  },

 


 







];

/* ================= SIDEBAR ================= */
const ChefSidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const { userProfile } = useAuth();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const navRef = useRef(null);

  /* ===== PRESERVE SIDEBAR SCROLL POSITION ===== */
  useEffect(() => {
    const savedScroll = sessionStorage.getItem("admin_sidebar_scroll");
    if (savedScroll !== null && navRef.current) {
      navRef.current.scrollTop = Number(savedScroll);
    }
  }, [location.pathname]);

  const handleNavScroll = (e) => {
    sessionStorage.setItem("admin_sidebar_scroll", e.currentTarget.scrollTop);
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
        data-sidebar="admin-sidebar"
        className={`
          fixed top-0 left-0 z-50 h-full flex flex-col
          bg-brand-bg
          border-r border-[#1f3228]
          
          transition-all duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${collapsed ? "w-[88px]" : "w-72"}
        `}
      >
        {/* ========== LOGO ========== */}
        <div className={`flex items-center gap-3 border-b border-[#1f3228] shrink-0 ${collapsed ? "px-3 py-5 justify-center" : "px-5 py-5"}`}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 p-1 border border-[#d4a843]/30 bg-white">
            <img src={Logo} alt="Logo" className="w-full h-full object-cover drop-shadow-lg" />
          </div>

          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <h1 className="text-base font-bold text-white tracking-wide font-serif">Foodie Restaurant</h1>
              <p className="text-[10px] text-white tracking-[0.2em] uppercase">
                Fresh Food, Warm Welcome
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
          data-sidebar="admin-nav"
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
                        ? "bg-[#1f3228] text-white border-l-2 border-white"
                        : "text-white hover:text-white hover:bg-[#1f3228]/70"
                      }
                    `}
                  >
                    <Icon className={`w-[17px] h-[17px] shrink-0 ${isAnyChildActive ? "text-white" : "text-white"}`} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left font-medium truncate text-white">{item.label}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${isMenuOpen ? "rotate-180" : ""}`}
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
                            onClick={() => isOpen && onClose()}
                            className={`
                              flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs
                              transition-all duration-200
                              ${isActive
                                ? "bg-[#d4a843] text-[#162420] font-semibold"
                                : "text-white hover:text-white hover:bg-[#1f3228]"
                              }
                            `}
                            title={collapsed && sub.badge ? `${sub.label} (${pendingCount})` : ''}
                          >
                            <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-[#162420]" : "text-white"}`} />
                            <span className={`truncate flex-1 ${isActive ? "text-[#162420]" : "text-white"}`}>{sub.label}</span>
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
            const isActive = isRouteActive(item.path);
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
                    ? "bg-[#d4a843] text-[#162420] font-semibold shadow-md"
                    : "text-white hover:text-white hover:bg-[#1f3228]/70"
                  }
                  ${collapsed ? "justify-center" : ""}
                `}
              >
                <Icon className={`w-[17px] h-[17px] shrink-0 ${isActive ? "text-[#162420]" : "text-white"}`} />
                {!collapsed && <span className={`font-medium truncate ${isActive ? "text-[#162420]" : "text-white"}`}>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* ========== BACK HOME ========== */}
        <NavLink
          to="/"
          title={collapsed ? "Back Home" : ""}
          onClick={() => isOpen && onClose()}
          className={`
            mx-3 mb-3 flex items-center gap-3 px-3 py-3 rounded-xl text-sm
            transition-all duration-200
            ${isRouteActive("/")
              ? "bg-[#d4a843] text-[#162420] font-semibold shadow-md"
              : "text-white hover:text-white hover:bg-[#1f3228]/70"
            }
            ${collapsed ? "justify-center" : ""}
          `}
        >
          <Home className={`w-[17px] h-[17px] shrink-0 ${isRouteActive("/") ? "text-[#162420]" : "text-white"}`} />
          {!collapsed && <span className={`font-medium truncate ${isRouteActive("/") ? "text-[#162420]" : "text-white"}`}>Back Home</span>}
        </NavLink>

        {/* ========== COLLAPSE BUTTON ========== */}
        <button
          onClick={onToggleCollapse}
          className="
            hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2
            w-7 h-7 rounded-full
            bg-[#d4a843] shadow-lg
            border border-[#162420]
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
          <div className="px-3 py-4 border-t border-[#1f3228] shrink-0">
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-[#1f3228] border border-white/5 shadow-inner">
              <div className="w-9 h-9 rounded-lg bg-[#d4a843] flex items-center justify-center text-[#162420] text-sm font-bold shrink-0">
                {(userProfile?.displayName?.[0] || "A").toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">
                  {userProfile?.displayName || "Administrator"}
                </p>
                <p className="text-[10px] text-white truncate">
                  {userProfile?.role || "Super Admin"}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default ChefSidebar;
