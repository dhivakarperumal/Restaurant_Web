import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu, Bell, Settings, User, LogOut, ChevronDown, Search, LayoutGrid, Table2,
  ShoppingBag, Package, Clock, X, LayoutDashboard, MessageSquare,
  Users, CreditCard, UserCheck, ClipboardList, Activity, UserRound,
  CalendarCheck, Receipt, ShoppingCart, BarChart3, Dumbbell, Send,
  Boxes, Plus, PhoneCall, HeartPulse, FolderKanban, CheckSquare,
  DollarSign, CalendarOff, BookOpen, GraduationCap, CalendarDays,
  CalendarClock, TrendingUp, Tag,
  UtensilsCrossed,
} from "lucide-react";
import api from "../api";
import { useAuth } from "../PrivateRouter/AuthContext";
import dayjs from "dayjs";
import AttendanceWidget from "../CommonComponents/AttendanceWidget";

/* ── page title map ── */
const pageInfo = {
  "/server/foods":                 { title: "Menu",                  icon: UtensilsCrossed },
  "/admin":                         { title: "Dashboard",             icon: LayoutDashboard },
  "/admin/billing":                 { title: "Billing",               icon: Receipt },
  "/admin/billing/new":             { title: "New Billing",            icon: Plus },
  "/admin/orders/new":              { title: "New Orders",              icon: ShoppingCart },
  "/admin/orders/delivery":          { title: "Delivery Orders",          icon: ShoppingCart },
  "/admin/orders/cancelled":         { title: "Cancelled Orders",         icon: ShoppingCart },
  "/admin/orders":                  { title: "All Orders",                icon: ShoppingCart },
  "/admin/getorders":               { title: "Get Orders",             icon: ShoppingCart },
  "/admin/frames":                  { title: "Frames",                 icon: Boxes },
  "/admin/frames/add":              { title: "Add Frame",              icon: Plus },
  "/admin/products/categories":     { title: "Categories",              icon: Package },
  "/admin/products/categories/add": { title: "Add Category",             icon: Plus },
  "/admin/products/stock-details":  { title: "Stock Details",           icon: Package },
  "/admin/products":                { title: "Products",               icon: Package },
  "/admin/gifts":                   { title: "Gifts",                  icon: Package },
  "/admin/products/add":             { title: "Add Product",             icon: Plus },
  "/admin/customers":               { title: "Customers",              icon: Users },
  "/admin/reviews":                 { title: "Reviews",                icon: HeartPulse },
  "/admin/banners":                 { title: "Banners",                icon: Boxes },
  "/admin/videos":                  { title: "Videos Management",       icon: Boxes },
  "/admin/albums":                  { title: "Albums",                 icon: BookOpen },
  "/admin/gallery":                 { title: "Gallery",                icon: Boxes },
  "/admin/coupons":                 { title: "Coupons & Offers",        icon: Tag },
  "/admin/settings":                { title: "Settings",              icon: Settings },
  "/admin/settings/profile":        { title: "Profile",               icon: User },
  "/admin/send-message":            { title: "Bulk Messaging",        icon: Send },
};

/* ── helpers ── */
const getPageInfo = (pathname) => {
  const sorted = Object.entries(pageInfo).sort((a, b) => b[0].length - a[0].length);
  for (const [path, info] of sorted) {
    if (pathname === path || pathname.startsWith(path + "/")) return info;
  }
  return { title: "Dashboard", icon: LayoutDashboard };
};

const AlertDropdown = ({ title, items, icon, type, onClose, accent }) => {
  let viewAllLink = "/admin";
  if (type === "tasks") viewAllLink = "/admin/tasks";
  if (type === "projects") viewAllLink = "/admin/projects";
  if (type === "leaves") viewAllLink = "/admin/employees/leave";
  if (type === "orders") viewAllLink = "/admin/orders";
  if (type === "lowStock") viewAllLink = "/admin/products/stock-details";

  return (
    <div className="absolute right-0 top-full mt-3 w-80 rounded-2xl border border-gray-200 bg-white shadow-2xl z-50 overflow-hidden flex flex-col">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-sm font-bold text-gray-900 flex items-center gap-2">{icon} {title}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${accent}`}>{items.length} Active</span>
      </div>
      {/* list */}
      <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
        {items.length ? items.map((item, i) => {
          let link = "/admin", label = "", sub = "";
          if (type === "tasks")    { 
            link = "/admin/tasks";           
            label = item.title;    
            sub = `${item.status} ${item.assigned ? '· ' + item.assigned + (item.assignedId ? ' (' + item.assignedId + ')' : '') : ''}`; 
          }
          if (type === "projects") { link = "/admin/projects";        label = item.name;     sub = `Due: ${item.due}`; }
          if (type === "leaves")   { link = "/admin/employees/leave"; label = item.employee; sub = `${item.type}${item.date ? ' · ' + item.date : ''}`; }
          if (type === "orders")   { link = `/admin/billing/${item.id}`; label = item.id; sub = `${item.customer} · ${item.status}`; }
          if (type === "lowStock") { link = "/admin/products/stock-details"; label = item.name; sub = `${item.stock} units remaining`; }
          return (
            <Link key={i} to={link} onClick={onClose} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition group">
              <div className="w-8 h-8 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">{icon}</div>
              <div>
                <p className="text-xs font-semibold text-gray-900 group-hover:text-primary transition">{label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>
              </div>
            </Link>
          );
        }) : (
          <div className="py-8 text-center text-gray-400 text-xs">No active items</div>
        )}
      </div>
      <Link to={viewAllLink} onClick={onClose} className="block text-center py-2.5 border-t border-gray-100 text-[11px] font-bold text-primary hover:bg-primary/10 transition uppercase tracking-widest">
        View All
      </Link>
    </div>
  );
};

/* ══════════════════ MAIN HEADER ══════════════════ */
const ServerHeader = ({ onMenuClick, foodControls, selectedTable, onChangeTable }) => {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [alerts, setAlerts] = useState({ tasks: [], leaves: [], lowStock: [] });
  const [currentTime, setCurrentTime] = useState(dayjs());

  const dropdownRef = useRef(null);

  const location  = useLocation();
  const { profileName, role, email, logout } = useAuth();

  const userName = profileName || "Admin";
  const userRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Administrator";
  const { title: pageTitle, icon: PageIcon } = getPageInfo(location.pathname);
  const activeTable = selectedTable || foodControls?.selectedTable;

  /* clock */
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(dayjs()), 1000);
    return () => clearInterval(t);
  }, []);

  /* fetch live data — pending leaves + active task updates */
  useEffect(() => {
    const fetchAlerts = async () => {
      let leaveAlerts = [];
      let lowStockAlerts = [];

      // ── 1. Pending Leaves from employee_leaves table ──
      try {
        const { data } = await api.get('/employee-leaves/all');
        const pending = (data?.data || []).filter(l => l.status === 'Pending');
        leaveAlerts = pending.map(l => ({
          employee: `${l.first_name || ''} ${l.last_name || ''}`.trim(),
          type:     l.leave_type || 'Leave',
          date:     l.from_date ? dayjs(l.from_date).format('DD MMM YYYY') : '',
        }));
      } catch (e) {
        console.error('[Header] Leave fetch error:', e?.response?.status, e.message);
      }

      try {
        const [productsRes, albumsRes, giftsRes] = await Promise.all([
          api.get('/products'),
          api.get('/albums'),
          api.get('/gift-boxes'),
        ]);

        const productItems = (productsRes?.data?.data || []).flatMap((product) => {
          let variants = [];
          if (Array.isArray(product.size_variants)) variants = product.size_variants;
          else if (typeof product.size_variants === 'string') {
            try { variants = JSON.parse(product.size_variants); } catch { variants = []; }
          }
          const stock = variants.length ? variants.reduce((sum, variant) => sum + (Number(variant?.stock) || 0), 0) : 0;
          return stock <= 15 ? [{ name: product.product_name || 'Unnamed Product', stock }] : [];
        });

        const albumItems = (albumsRes?.data?.data || []).flatMap((album) => {
          let variants = [];
          if (Array.isArray(album.variants)) variants = album.variants;
          else if (typeof album.variants === 'string') {
            try { variants = JSON.parse(album.variants); } catch { variants = []; }
          }
          const stock = variants.length ? variants.reduce((sum, variant) => sum + (Number(variant?.stock) || 0), 0) : Number(album.stock_quantity || 0);
          return stock <= 15 ? [{ name: album.product_name || 'Unnamed Album', stock }] : [];
        });

        const giftItems = (giftsRes?.data?.data || []).flatMap((gift) => {
          const stock = Number(gift.current_stock ?? gift.stock_quantity ?? 0);
          return stock <= 15 ? [{ name: gift.name || 'Unnamed Gift Box', stock }] : [];
        });

        lowStockAlerts = [...productItems, ...albumItems, ...giftItems];
      } catch (e) {
        console.error('[Header] Low stock notification error:', e?.response?.status, e.message);
      }

      setAlerts({ tasks: [], leaves: leaveAlerts, lowStock: lowStockAlerts });
    };

    fetchAlerts();
  }, []);

  /* click outside */
  useEffect(() => {
    const h = (e) => {
      if (activeDropdown && dropdownRef.current && !dropdownRef.current.contains(e.target)) setActiveDropdown(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [activeDropdown]);

  const toggle = (name) => setActiveDropdown(p => p === name ? null : name);

  const handleLogout = () => {
    logout();
    setActiveDropdown(null);
    window.location.hash = "#/";
  };

  /* icon button helper */
  const IconBtn = ({ name, badge, badgeColor, title, children }) => (
    <div className="relative">
      <button
        onClick={() => toggle(name)}
        title={title}
        className={`relative flex items-center justify-center w-[42px] h-[42px] rounded-2xl transition-all duration-200 border
          ${activeDropdown === name
            ? "bg-gray-100 border-gray-200 text-gray-900 shadow-sm"
            : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800"
          }`}
      >
        {children}
        {badge > 0 && (
          <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full text-[9px] font-bold text-white ring-2 ring-white ${badgeColor}`}>
            {badge}
          </span>
        )}
      </button>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-30 bg-white backdrop-blur-xl border-b border-gray-200 shadow-sm">
        <div className={`flex items-center gap-3 px-4 sm:px-6 ${foodControls ? "min-h-16 flex-nowrap overflow-visible py-2" : "h-18"}`} ref={dropdownRef}>

          {/* ── HAMBURGER (mobile) ── */}
          <button
            onClick={onMenuClick}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 transition shrink-0"
          >
            <Menu size={18} />
          </button>

          {/* ── PAGE TITLE ── */}
          <div className={`flex items-center gap-2.5 min-w-0 ${foodControls ? "shrink-0" : "flex-1"}`}>
            {foodControls ? (
              <Link
                to="/server"
                aria-label="Go to server dashboard"
                title="Server dashboard"
                className="shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a3c36]/30"
              >
                <img
                  src="/images/adminlogo.png"
                  alt="Buy Foods restaurant logo"
                  className="h-10 w-10 rounded-xl border border-[#dce7df] bg-white object-contain p-0.5 shadow-sm transition hover:shadow-md"
                />
              </Link>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#d4a843]/15 border border-[#d4a843]/30 flex items-center justify-center shrink-0">
                <PageIcon size={16} className="text-[#d4a843]" />
              </div>
            )}
            <div className="min-w-0 hidden sm:block">
              <h1 className="text-base font-bold text-gray-900 truncate leading-tight">{pageTitle}</h1>
              <p className={`text-[10px] leading-none ${activeTable ? "font-semibold text-[#1a3c36]" : "text-gray-500"}`}>
                {activeTable
                  ? `Table ${activeTable.table_number || activeTable.table_name || ""}`
                  : `${currentTime.format("ddd, DD MMM YYYY")} · ${currentTime.format("hh:mm:ss A")}`}
              </p>
            </div>
          </div>

          {foodControls && (
            <div className="flex min-w-0 flex-1 items-center justify-start gap-2">
              <div className="relative min-w-[160px] max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={foodControls.searchQuery}
                  onChange={(event) => foodControls.setSearchQuery(event.target.value)}
                  placeholder="Search dishes by name, cuisine, category..."
                  aria-label="Search dishes"
                  className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#1a3c36] focus:bg-white"
                />
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <select
                  value={foodControls.selectedType}
                  onChange={(event) => foodControls.setSelectedType(event.target.value)}
                  aria-label="Filter dishes by type"
                  className="h-10 min-w-32 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 outline-none focus:border-[#1a3c36]"
                >
                  <option value="all">All Types</option>
                  <option value="veg">Veg Only</option>
                  <option value="non-veg">Non-Veg</option>
                </select>
                <div className="flex h-10 shrink-0 items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => foodControls.setViewMode("grid")}
                    aria-label="Grid view"
                    aria-pressed={foodControls.viewMode === "grid"}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${foodControls.viewMode === "grid" ? "bg-[#1a3c36] text-white" : "text-gray-500 hover:text-[#1a3c36]"}`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => foodControls.setViewMode("table")}
                    aria-label="Table view"
                    aria-pressed={foodControls.viewMode === "table"}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${foodControls.viewMode === "table" ? "bg-[#1a3c36] text-white" : "text-gray-500 hover:text-[#1a3c36]"}`}
                  >
                    <Table2 className="h-4 w-4" />
                  </button>
                </div>
                {onChangeTable && (
                  <button
                    type="button"
                    onClick={onChangeTable}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#0b3f2f] px-4 text-sm font-semibold text-white transition hover:bg-[#14543f]"
                  >
                    Change Table
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── RIGHT ACTIONS ── */}
          <div className="flex items-center gap-2 shrink-0">

            {foodControls
              ? <AttendanceWidget variant="header" clockOutOnly />
              : <AttendanceWidget variant="header" />}

            {!foodControls && (
              <>
                {/* Low stock notifications */}
                <div className="relative">
                  <IconBtn name="lowStock" badge={alerts.lowStock.length} badgeColor="bg-red-500" title="Low Stock Notifications">
                    <Package size={18} />
                  </IconBtn>
                  {activeDropdown === "lowStock" && (
                    <AlertDropdown title="Low Stock Notifications" items={alerts.lowStock} icon={<Package size={13} className="text-red-400" />} type="lowStock" onClose={() => setActiveDropdown(null)} accent="bg-red-500/20 text-red-400" />
                  )}
                </div>
                <div className="w-px h-6 bg-gray-200 mx-1" />
              </>
            )}

            {foodControls && <div className="w-px h-6 bg-gray-200 mx-1" />}

            {/* ── USER PROFILE ── */}
            <div className="relative ml-1 sm:ml-2">
              <button
                onClick={() => toggle("profile")}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-2xl transition-all duration-200 border
                  ${activeDropdown === "profile"
                    ? "bg-gray-100 border-gray-200 shadow-sm"
                    : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-200"
                  }`}
              >
                <div className="w-[34px] h-[34px] rounded-xl bg-gradient-to-br from-[#1a2e28] to-[#2c473f] border border-[#1a2e28] flex items-center justify-center text-white text-sm font-bold shadow-inner">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:flex flex-col items-start pr-1">
                  <span className="text-sm font-semibold text-gray-900 leading-tight">
                    {userName}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium tracking-wide">
                    {userRole}
                  </span>
                </div>
                <ChevronDown size={14} className={`hidden md:block text-gray-400 transition-transform ${activeDropdown === "profile" ? "rotate-180" : ""}`} />
              </button>

              {/* Profile dropdown */}
              {activeDropdown === "profile" && (
                <div className="absolute right-0 top-full mt-3 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white text-base font-bold shrink-0">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-gray-900 truncate">{userName}</p>
                      <p className="text-[10px] text-gray-500 truncate">{email}</p>
                    </div>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    <Link to="/admin/settings/profile" onClick={() => setActiveDropdown(null)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 text-sm text-gray-700 transition">
                      <User size={15} className="text-gray-500" /> Profile
                    </Link>
                    <Link to="/admin/settings" onClick={() => setActiveDropdown(null)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 text-sm text-gray-700 transition">
                      <Settings size={15} className="text-gray-500" /> Settings
                    </Link>
                    <div className="h-px bg-gray-200 my-1" />
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-sm text-red-500 transition">
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

    </>
  );
};

export default ServerHeader;
