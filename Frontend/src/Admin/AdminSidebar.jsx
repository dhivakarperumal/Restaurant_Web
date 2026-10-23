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
  CircleDollarSign,
  CalendarOff,
  ClipboardCheck,
  CalendarCheck,
  BarChart3,
  Bike,
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
  Utensils,
  Lock,
  Settings,
  MessageSquare,
  UtensilsCrossed,
  Boxes,
  ArrowRightLeft,
  Wrench,
  PartyPopper,
} from "lucide-react";

import { useAuth } from "../PrivateRouter/AuthContext";
const Logo = "/images/adminlogo.png";

/* ================= NAV ITEMS ================= */
const navItems = [
  {
    path: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },



  /* ---- PRODUCTS ---- */
  {
    label: "Foods",
    icon: Package,
    children: [

      { path: "/admin/products", label: "All Foods", icon: Package },
      { path: "/admin/products/categories", label: "Category", icon: Layers },
      { path: "/admin/products/cuisines", label: "Cuisine", icon: Utensils },

    ],
  },






  {
    label: "Inventory Management",
    icon: Boxes,
    children: [
      // { path: "/admin/inventory", label: "Dashboard", icon: LayoutDashboard },
      { path: "/admin/inventory/products", label: "Stock Details", icon: Package },
      // { path: "/admin/inventory/categories", label: "Categories", icon: Layers },
      // { path: "/admin/inventory/units", label: "Units", icon: ClipboardList },
      // { path: "/admin/inventory/suppliers", label: "Suppliers", icon: Users },
      // { path: "/admin/inventory/purchases", label: "Purchases", icon: ShoppingCart },
      { path: "/admin/inventory/kitchen-requests", label: "Kitchen Requests", icon: UtensilsCrossed },
      { path: "/admin/inventory/server-supplies", label: "Serving Supplies Requests", icon: Package },

    ],
  },

  {
    label: "Orders",
    icon: ShoppingCart,
    children: [
      { path: "/admin/orders/dining", label: "Dining Orders", icon: PlusSquare },
      { path: "/admin/orders/pickup", label: "Pickup Orders", icon: PlusSquare },
      { path: "/admin/orders/homedelivery", label: "Home Delivery Orders", icon: PlusSquare },
      { path: "/admin/event-orders", label: "Event & Bulk Orders", icon: PartyPopper },
      { path: "/admin/orders", label: "All Orders", icon: List },
      { path: "/admin/orders/delivery", label: "Delivered Orders", icon: Package },
      { path: "/admin/orders/cancelled", label: "Cancelled Orders", icon: XCircle },

    ],
  },

  // {
  //   path: "/admin/kitchen-orders",
  //   label: "Kitchen Orders",
  //   icon: UtensilsCrossed,
  // },
  {
    path: "/admin/reservations",
    label: "Reservations",
    icon: CalendarDays,
  },
  // {
  //   path: "/admin/event-orders",
  //   label: "Event & Bulk Orders",
  //   icon: PartyPopper,
  // },



  {
    label: "Employee",
    icon: Users,
    children: [
      { path: "/admin/employees", label: "All Employee", icon: Users },
      { path: "/admin/employees/attendance", label: "Attendance", icon: CalendarCheck },
      { path: "/admin/employees/add", label: "Add Employee", icon: UserRoundPlus },
      { path: "/admin/employee-salary", label: "Employee Salary", icon: DollarSign },
      { path: "/admin/servers", label: "Manage Server", icon: UtensilsCrossed },
      { path: "/admin/delivery-partners", label: "Manage Delivery Partner", icon: Bike },
      // { path: "/admin/employees/add/chef", label: "Add Chef", icon: UserRoundPlus },
      // { path: "/admin/employees/add/server", label: "Add Server", icon: UserRoundPlus },
      // { path: "/admin/employees/add/delivery-partner", label: "Add Delivery Partner", icon: UserRoundPlus },
      // { path: "/admin/employees/add/cashier", label: "Add Cashier", icon: UserRoundPlus },
      // { path: "/admin/employees/add/manager", label: "Add Manager", icon: UserRoundPlus },
      // { path: "/admin/employees/add/cleaner", label: "Add Cleaner", icon: UserRoundPlus },
    ],
  },



  {
    path: "/admin/billing",
    label: "Billing",
    icon: Receipt,
  },

  {
    path: "/admin/revenue",
    label: "Revenue",
    icon: CircleDollarSign,
  },



  /* ---- MARKETING ---- */
  {
    label: "Marketing",
    icon: TrendingUp,
    children: [
      { path: "/admin/banners", label: "Banners", icon: Image },
      { path: "/admin/videos", label: "Videos Management", icon: Image },
      // { path: "/admin/gallery", label: "Gallery", icon: Image },
      { path: "/admin/coupons", label: "Coupons & Offers", icon: Tag },
      {
        path: "/admin/expenses",
        label: "Expenses",
        icon: DollarSign,
      },

      {
        path: "/admin/reviews",
        label: "Reviews",
        icon: Star,
      },
    ],
  },


];

/* ================= SIDEBAR ================= */
const Sidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
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
          border-r border-white/20
          
          transition-all duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${collapsed ? "w-[88px]" : "w-72"}
        `}
      >
        {/* ========== LOGO ========== */}
        <div className={`flex items-center gap-3 border-b border-white/20 shrink-0 ${collapsed ? "px-3 py-3 justify-center" : "px-5 py-3"}`}>
          <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/30 bg-white shadow-sm ${collapsed ? "h-12 w-12 p-1" : "h-16 w-16"}`}>
            <img src={Logo} alt="Admin restaurant logo" className="w-full h-full object-contain" />
          </div>

          {!collapsed && (
            <div className="overflow-hidden flex-1">
              <h1 className="text-base font-bold text-white tracking-wide font-serif">Buy Foods</h1>
              <p className="text-[10px] text-white tracking-[0.2em] uppercase">
                Fresh Food WellCome
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
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm
                      admin-sidebar-link transition-colors duration-150 group
                      ${isAnyChildActive
                        ? "admin-sidebar-link-active border-l-2 border-white"
                        : ""
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
                      className={`ml-8 mt-1.5 space-y-1 overflow-hidden transition-all duration-200 ${isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
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
                            className={`admin-sidebar-link ${
                              isActive
                                ? "admin-sidebar-link-active font-semibold"
                                : "text-white"
                            } flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs transition-colors duration-150`}
                            title={collapsed && sub.badge ? `${sub.label} (${pendingCount})` : ''}
                          >
                            <SubIcon className="w-3.5 h-3.5 shrink-0 text-white" />
                            <span className="truncate flex-1 text-white">{sub.label}</span>
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
                className={`admin-sidebar-link flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors duration-150 ${
                  isActive
                    ? "admin-sidebar-link-active font-semibold shadow-md"
                    : "text-white"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <Icon className="w-[17px] h-[17px] shrink-0 text-white" />
                {!collapsed && <span className="font-medium truncate text-white">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* ========== BACK HOME ========== */}
        <NavLink
          to="/"
          title={collapsed ? "Back Home" : ""}
          onClick={() => isOpen && onClose()}
          className={`admin-sidebar-link mx-3 mb-3 flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors duration-150 ${
            isRouteActive("/")
              ? "admin-sidebar-link-active font-semibold shadow-md"
              : "text-white"
          } ${collapsed ? "justify-center" : ""}`}
        >
          <Home className="w-[17px] h-[17px] shrink-0 text-white" />
          {!collapsed && <span className="font-medium truncate text-white">Back Home</span>}
        </NavLink>

        {/* ========== COLLAPSE BUTTON ========== */}
        <button
          onClick={onToggleCollapse}
          className="admin-sidebar-collapse
            hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2
            w-7 h-7 rounded-full
            bg-white shadow-lg
            border border-white
            items-center justify-center
            hover:scale-105 transition-all duration-200
          "
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
          />
        </button>

        {/* ========== BOTTOM USER STRIP ========== */}
        {!collapsed && (
          <div className="px-3 py-4 border-t border-white/20 shrink-0">
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/15 border border-white/15 shadow-inner">
              <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[#FF5A00] text-sm font-bold shrink-0">
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

export default Sidebar;
