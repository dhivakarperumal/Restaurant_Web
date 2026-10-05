import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bike,
  CheckCircle2,
  ChevronDown,
  History,
  IndianRupee,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  PlusSquare,
  ShoppingCart,
  UserRound,
  XCircle,
} from "lucide-react";
import { useAuth } from "../PrivateRouter/AuthContext";
import LogoutConfirmModal from "../CommonComponents/LogoutConfirmModal";

const pageTitles = {
  "/delivery": "Dashboard",
  "/delivery/orders": "Orders",
  "/delivery/orders/new": "New Orders",
  "/delivery/orders/delivery": "Delivery Orders",
  "/delivery/orders/cancelled": "Cancelled Orders",
  "/delivery/earnings": "Earnings",
  "/delivery/history": "Delivery History",
  "/delivery/profile": "Profile",
  "/delivery/support": "Support",
};

const pageIcons = {
  "/delivery": LayoutDashboard,
  "/delivery/orders": ShoppingCart,
  "/delivery/orders/new": PlusSquare,
  "/delivery/orders/delivery": Bike,
  "/delivery/orders/cancelled": XCircle,
  "/delivery/earnings": IndianRupee,
  "/delivery/history": History,
  "/delivery/profile": UserRound,
  "/delivery/support": LifeBuoy,
};

const DeliveryHeader = ({ onMenuClick }) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const location = useLocation();
  const { userProfile, logout } = useAuth();
  const name = userProfile?.displayName || userProfile?.name || "Delivery Partner";
  const ActivePageIcon = pageIcons[location.pathname] || CheckCircle2;

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return <>
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#e1e9e2] bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onMenuClick} aria-label="Open navigation" className="grid h-10 w-10 place-items-center rounded-lg border border-[#e1e9e2] text-[#284d35] lg:hidden">
          <Menu size={19} />
        </button>
        <Link to="/delivery" className="shrink-0 border-r border-[#e1e9e2] pr-3 text-sm font-bold text-[#173b27] sm:pr-5 sm:text-base">Delivery Partner</Link>
        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-[#f4f8f4] px-2.5 py-2 text-[#327347] sm:px-3">
          <ActivePageIcon aria-hidden="true" size={17} className="shrink-0" />
          <span className="truncate text-xs font-semibold text-gray-600 sm:text-sm">{pageTitles[location.pathname] || "Order Details"}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div ref={profileMenuRef} className="relative">
          <button type="button" onClick={() => setProfileMenuOpen((open) => !open)} aria-expanded={profileMenuOpen} aria-haspopup="menu" aria-label="Open profile menu" className="flex items-center gap-2 rounded-full p-1 transition hover:bg-gray-50">
            <div className="hidden max-w-44 text-right sm:block">
              <p className="truncate text-sm font-semibold text-gray-800">{name}</p>
              <p className="text-[11px] text-gray-500">Delivery Partner</p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#e5f2e8] text-sm font-bold text-[#23633a]">{name.charAt(0).toUpperCase()}</div>
            <ChevronDown size={15} className={`hidden text-gray-500 transition-transform sm:block ${profileMenuOpen ? "rotate-180" : ""}`} />
          </button>
          {profileMenuOpen && <div role="menu" className="absolute right-0 top-[calc(100%+10px)] z-50 w-60 overflow-hidden rounded-xl border border-[#e1e9e2] bg-white shadow-[0_16px_36px_rgba(22,48,29,0.16)]">
            <div className="border-b border-gray-100 bg-[#f7faf7] px-4 py-3"><p className="truncate text-sm font-bold text-gray-900">{name}</p><p className="mt-0.5 truncate text-xs text-gray-500">{userProfile?.email || "Delivery Partner"}</p></div>
            <Link role="menuitem" to="/delivery/profile" onClick={() => setProfileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-[#f3f8f4]"><UserRound size={17} className="text-[#327347]" />Profile</Link>
            <button role="menuitem" type="button" onClick={() => { setProfileMenuOpen(false); setLogoutConfirmOpen(true); }} className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"><LogOut size={17} />Log out</button>
          </div>}
        </div>
      </div>
    </header>
    {logoutConfirmOpen && <LogoutConfirmModal onCancel={() => setLogoutConfirmOpen(false)} onConfirm={() => { logout(); setLogoutConfirmOpen(false); }} />}
  </>;
};

export default DeliveryHeader;
