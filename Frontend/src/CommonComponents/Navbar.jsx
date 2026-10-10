import React, { useContext, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../PrivateRouter/AuthContext";
import { StoreContext } from "../PrivateRouter/StoreContext";
import { getRoleHome } from "../PrivateRouter/roleUtils";
import {
  FiChevronDown,
  FiMenu,
  FiX,
  FiLogOut,
  FiArrowRight,
  FiHeart,
  FiShoppingCart,
  FiUser,
  FiMapPin,
  FiClock,
  FiPhone,
  FiPackage,
  FiFacebook,
  FiInstagram,
} from "react-icons/fi";
import { HiOutlineMenuAlt3 } from "react-icons/hi";
import api from "../api";
import {
  FaCode,
  FaLaptopCode,
  FaPaintBrush,
  FaSearch,
  FaMobileAlt,
  FaUsersCog,
  FaShoppingCart,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaBullhorn,
} from "react-icons/fa";
import PageContainer from "./PageContainer";
import LogoutConfirmModal from "./LogoutConfirmModal";

const Navbar = () => {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [mobileSubMenu, setMobileSubMenu] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [services, setServices] = useState([]);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [favoritesDropdown, setFavoritesDropdown] = useState(false);
  const [cartDropdown, setCartDropdown] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [favoriteItems, setFavoriteItems] = useState([]);
  const profileRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, userProfile, role } = useAuth();
  const {
    cart = [],
    wishlist = [],
    undeliveredOrdersCount = 0,
    openCart,
    openFavorites,
  } = useContext(StoreContext) || {};

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isLoggedIn = Boolean(user || userProfile);
  const userDisplayName =
    userProfile?.displayName ||
    userProfile?.name ||
    user?.displayName ||
    user?.name ||
    user?.username ||
    "User";
  const userInitial = userDisplayName.charAt(0).toUpperCase();
  const roleDashboardPath = getRoleHome(role);
  const roleDashboardLabel = {
    "/admin": "Admin Panel",
    "/chef": "Chef Panel",
    "/server": "Server Panel",
    "/delivery": "Delivery Panel",
    "/employee": "Employee Panel",
    "/trainee": "Trainee Panel",
  }[roleDashboardPath];

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    setProfileDropdown(false);
    setMobileMenu(false);
    navigate("/", { replace: true });
  };

  const requestLogout = () => {
    setProfileDropdown(false);
    setMobileMenu(false);
    setShowLogoutConfirm(true);
  };

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data } = await api.get("/services/public/all");
        if (data.success && Array.isArray(data.data)) {
          setServices(data.data);
        }
      } catch (err) {
        console.warn("Failed to fetch services for navbar:", err?.message);
      }
    };

    fetchServices();
  }, []);

  const whoWeAreLinks = [
    { id: 1, title: "Why Choose Us", path: "/whychooseus" },
    { id: 2, title: "Who We Work With", path: "/whoweworkwith" },
    { id: 3, title: "What We Do", path: "/whatwedo" },
  ];

  const iconMap = {
    FaCode,
    FaLaptopCode,
    FaPaintBrush,
    FaSearch,
    FaMobileAlt,
    FaUsersCog,
    FaShoppingCart,
    FaUserGraduate,
    FaChalkboardTeacher,
    FaBullhorn,
  };

  useEffect(() => {
    setMobileSubMenu(null);
    setMobileMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdown(false);
        setFavoritesDropdown(false);
        setCartDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isServicesActive =
    location.pathname === "/services" ||
    location.pathname.startsWith("/services/");

  const isWhoWeAreActive =
    whoWeAreLinks.some(
      (link) =>
        location.pathname === link.path ||
        location.pathname.startsWith(link.path + "/"),
    ) || location.pathname === "/achievements";

  const isAlbumPage =
    location.pathname === "/albums" ||
    location.pathname.startsWith("/albums/") ||
    (location.pathname === "/shop" &&
      new URLSearchParams(location.search).get("categoryType") === "album");

  const isShopPage =
    !isAlbumPage &&
    (location.pathname === "/shop" ||
      location.pathname.startsWith("/products/") ||
      location.pathname.startsWith("/product/"));

  const isPagesRoute = ["/gallery", "/about", "/contact", "/privacy-policy"].includes(
    location.pathname,
  );

  const desktopLinkClass = ({ isActive }) =>
    `relative py-2 text-sm font-semibold transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-gold after:transition-transform ${
      isActive ? "text-gold after:scale-x-100" : "text-brand-text hover:text-gold"
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `flex items-center justify-between rounded-xl px-3 py-3 text-base font-medium transition ${
      isActive
        ? "bg-primary/20 text-gold"
        : "text-brand-text/85 hover:bg-brand-surface/70 hover:text-brand-text"
    }`;

  return (
    <>
      <header
        className={`fixed left-0 top-0 z-50 w-full bg-brand-bg transition-transform duration-300 ease-in-out ${
          isScrolled ? "md:-translate-y-[42px]" : "translate-y-0"
        }`}
      >
        <div className="hidden bg-[#fff8ed] text-[#203129] md:block">
          <PageContainer>
            <div className="flex h-[42px] items-center justify-between gap-4 text-[11px] font-medium tracking-wide text-[#203129]">
              <div className="flex min-w-0 items-center gap-5">
                <span className="flex items-center gap-2">
                  <FiMapPin className="text-gold" />
                  <span className="truncate">123, MG Road, Coimbatore, Tamil Nadu</span>
                </span>
                <span className="hidden items-center gap-2 sm:flex">
                  <FiClock className="text-gold" />
                  Mon - Sun: 9:00 AM - 9:00 PM
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="flex items-center gap-2">
                  <FiPhone className="text-gold" />
                  +91 98765 43210
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-surface text-[13px] text-brand-text transition hover:bg-brand-surface-strong"
                    aria-label="Facebook"
                  >
                    <FiFacebook />
                  </button>
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-surface text-[13px] text-brand-text transition hover:bg-brand-surface-strong"
                    aria-label="Instagram"
                  >
                    <FiInstagram />
                  </button>
                </div>
              </div>
            </div>
          </PageContainer>
        </div>

        <div
          className={`border-b border-brand-border bg-brand-bg transition-shadow duration-300 ${
            isScrolled
              ? "shadow-[0_8px_24px_rgba(0,0,0,0.1)]"
              : "shadow-[0_4px_18px_rgba(0,0,0,0.08)]"
          }`}
        >
          <PageContainer>
            <div className="flex h-[72px] items-center justify-between gap-2 bg-brand-bg sm:gap-4 lg:h-[88px]">
              <Link to="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                {/* <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#d79d4a]/50 bg-white shadow-inner sm:h-14 sm:w-14">
                  <img
                    src="/images/logo.png"
                    alt="Restaurant Name logo"
                    className="h-full bg-white w-full object-contain"
                  />
                </div> */}
                <div className="min-w-0 leading-none">
                  <div className="text-[22px] font-black tracking-[-0.06em] text-brand-text sm:text-[26px]">
                    Buy Food
                  </div>
                  <div className="mt-1 hidden text-[9px] font-semibold tracking-[0.28em] text-gold sm:block">
                    Buy Food &amp; Snacks Online
                  </div>
                </div>
              </Link>

              <nav className="hidden items-center gap-6 xl:flex">
                <NavLink
                  to="/"
                  end
                  className={desktopLinkClass}
                >
                  Home
                </NavLink>
                <div className="flex items-center gap-1 text-sm font-semibold text-brand-text">
                  <NavLink
                    to="/shop"
                    className={() => desktopLinkClass({ isActive: isShopPage })}
                  >
                    Menu
                  </NavLink>
                </div>

                <div className="flex items-center gap-1 text-sm font-semibold text-brand-text">
                  <NavLink
                    to="/about"
                    className={desktopLinkClass}
                  >
                    About
                  </NavLink>
                </div>
                

                {/* <NavLink
                  to="/gallery"
                  className={desktopLinkClass}
                >
                  Gallery
                </NavLink> */}

                <NavLink
                  to="/reservation"
                  className={({ isActive }) =>
                    desktopLinkClass({ isActive })
                  }
                >
                  Reservation
                </NavLink>
                <NavLink to="/offers" className={desktopLinkClass}>
                  Offers
                </NavLink>
                <NavLink to="/contact" className={desktopLinkClass}>
                  Contact
                </NavLink>
              </nav>

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5 lg:gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate(isLoggedIn ? "/account?tab=orders" : "/login")
                  }
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-brand-border bg-brand-surface text-brand-text transition hover:border-gold hover:bg-brand-surface-strong sm:h-11 sm:w-11"
                  aria-label="My Orders"
                  title="My Orders"
                >
                  <FiPackage className="text-base sm:text-lg" />
                  {undeliveredOrdersCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange text-[9px] font-bold text-brand-bg shadow-xs sm:h-5 sm:w-5 sm:text-[10px]">
                      {undeliveredOrdersCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openFavorites ? openFavorites() : navigate("/account")
                  }
                  className="relative hidden h-9 w-9 items-center justify-center rounded-full border border-brand-border bg-brand-surface text-brand-text transition hover:border-gold hover:bg-brand-surface-strong sm:flex sm:h-11 sm:w-11"
                  aria-label="Open favorites"
                >
                  <FiHeart className="text-base sm:text-lg" />
                  {wishlist.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange text-[9px] font-bold text-brand-bg sm:h-5 sm:w-5 sm:text-[10px]">
                      {wishlist.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => (openCart ? openCart() : navigate("/cart"))}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-brand-border bg-brand-surface text-brand-text transition hover:border-gold hover:bg-brand-surface-strong sm:h-11 sm:w-11"
                  aria-label="Cart"
                >
                  <FiShoppingCart className="text-base sm:text-lg" />
                  {cart.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange text-[9px] font-bold text-brand-bg sm:h-5 sm:w-5 sm:text-[10px]">
                      {cart.length}
                    </span>
                  )}
                </button>

                {isLoggedIn ? (
                  <div ref={profileRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setProfileDropdown((prev) => !prev)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-brand-text shadow-md transition hover:bg-primary-soft hover:text-brand-bg sm:h-11 sm:w-11 sm:text-sm"
                      aria-label="Open profile menu"
                    >
                      {userInitial}
                    </button>

                    {profileDropdown && (
                      <div className="absolute right-0 top-[calc(100%+12px)] w-64 overflow-hidden rounded-2xl border border-[#ede5da] bg-white shadow-[0_20px_40px_rgba(15,23,42,0.12)]">
                        <div className="border-b border-[#f0e8df] bg-[#faf6f2] px-4 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b8b8b]">
                            Profile
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-brand-text">
                              {userInitial}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-[#1d1d1d]">
                                {userDisplayName}
                              </div>
                              <div className="text-[11px] text-[#777]">
                                {user?.email || "premium customer"}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-2">
                          {roleDashboardLabel && (
                            <button
                              type="button"
                              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#1d1d1d] transition hover:bg-[#f7f3ee]"
                              onClick={() => {
                                setProfileDropdown(false);
                                navigate(roleDashboardPath);
                              }}
                            >
                              <span>{roleDashboardLabel}</span>
                              <FiUser className="text-base text-[#7a7a7a]" />
                            </button>
                          )}

                          <button
                            type="button"
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#1d1d1d] transition hover:bg-[#f7f3ee]"
                            onClick={() => {
                              setProfileDropdown(false);
                              navigate("/account");
                            }}
                          >
                            <span>My Account</span>
                            <FiUser className="text-base text-[#7a7a7a]" />
                          </button>

                          <button
                            type="button"
                            onClick={requestLogout}
                            className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#d94d4d] transition hover:bg-[#fff1f1]"
                          >
                            <span>Logout</span>
                            <FiLogOut className="text-base" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="hidden rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-brand-text shadow-md transition hover:bg-primary-soft hover:text-brand-bg sm:block"
                  >
                    Login
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => setMobileMenu((current) => !current)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-border bg-brand-surface text-brand-text transition hover:border-gold hover:bg-brand-surface-strong xl:hidden sm:h-11 sm:w-11"
                  aria-label={mobileMenu ? "Close navigation menu" : "Open navigation menu"}
                  aria-expanded={mobileMenu}
                >
                  {mobileMenu ? <FiX className="text-base sm:text-lg" /> : <HiOutlineMenuAlt3 className="text-lg sm:text-xl" />}
                </button>
              </div>
            </div>
          </PageContainer>
        </div>

        {mobileMenu && (
          <div className="border-t border-brand-border bg-brand-bg shadow-lg xl:hidden">
            <PageContainer>
              <nav className="max-h-[calc(100vh-72px)] overflow-y-auto py-3 sm:max-h-[calc(100vh-130px)]" aria-label="Mobile navigation">
                <NavLink to="/" end onClick={() => setMobileMenu(false)} className={mobileLinkClass}>
                  Home
                </NavLink>
                <NavLink to="/shop" onClick={() => setMobileMenu(false)} className={() => mobileLinkClass({ isActive: isShopPage })}>
                  Menu
                </NavLink>
                <NavLink to="/about" onClick={() => setMobileMenu(false)} className={mobileLinkClass}>
                  About
                </NavLink>
                {/* <NavLink to="/gallery" onClick={() => setMobileMenu(false)} className={mobileLinkClass}>
                  Gallery
                </NavLink> */}
                <NavLink to="/reservation" onClick={() => setMobileMenu(false)} className={mobileLinkClass}>
                  Reservation
                </NavLink>
                <NavLink to="/offers" onClick={() => setMobileMenu(false)} className={mobileLinkClass}>
                  Offers
                </NavLink>

                <button
                  type="button"
                  onClick={() => setMobileSubMenu((current) => (current === "pages" ? null : "pages"))}
                  className={`${mobileLinkClass({ isActive: isPagesRoute })} w-full`}
                  aria-expanded={mobileSubMenu === "pages"}
                >
                  <span>Pages</span>
                  <FiChevronDown className={`transition-transform ${mobileSubMenu === "pages" ? "rotate-180" : ""}`} />
                </button>

                {mobileSubMenu === "pages" && (
                  <div className="ml-3 space-y-1 border-l border-primary/20 pl-3">
                    {[
                      ["Gallery", "/gallery"],
                      ["About Us", "/about"],
                      ["Contact Us", "/contact"],
                      ["Privacy Policy", "/privacy-policy"],
                    ].map(([label, path]) => (
                      <NavLink
                        key={path}
                        to={path}
                        onClick={() => setMobileMenu(false)}
                        className={mobileLinkClass}
                      >
                        {label}
                      </NavLink>
                    ))}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-primary/20 pt-3 sm:grid-cols-3">
                  <button type="button" onClick={() => { setMobileMenu(false); navigate(isLoggedIn ? "/account?tab=orders" : "/login"); }} className="flex items-center justify-center gap-2 rounded-xl bg-brand-surface px-3 py-3 text-xs font-semibold text-brand-text transition hover:bg-brand-surface-strong">
                    <FiPackage /> Orders
                  </button>
                  <button type="button" onClick={() => { setMobileMenu(false); openFavorites ? openFavorites() : navigate("/account"); }} className="flex items-center justify-center gap-2 rounded-xl bg-brand-surface px-3 py-3 text-xs font-semibold text-brand-text transition hover:bg-brand-surface-strong">
                    <FiHeart /> Favorites
                  </button>
                  <button type="button" onClick={() => { setMobileMenu(false); openCart ? openCart() : navigate("/cart"); }} className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-orange px-3 py-3 text-xs font-bold text-brand-bg transition hover:bg-orange-light sm:col-span-1">
                    <FiShoppingCart /> Cart {cart.length > 0 ? `(${cart.length})` : ""}
                  </button>
                  {!isLoggedIn && (
                    <Link
                      to="/login"
                      onClick={() => setMobileMenu(false)}
                      className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-gold px-3 py-3 text-xs font-bold text-gold transition hover:bg-brand-surface sm:col-span-3"
                    >
                      <FiUser /> Login
                    </Link>
                  )}
                  {isLoggedIn && (
                    <button
                      type="button"
                      onClick={requestLogout}
                      className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-danger/40 px-3 py-3 text-xs font-bold text-danger transition hover:bg-danger/10 sm:col-span-3"
                    >
                      <FiLogOut /> Sign Out
                    </button>
                  )}
                </div>
              </nav>
            </PageContainer>
          </div>
        )}

        {showLogoutConfirm && (
          <LogoutConfirmModal
            onCancel={() => setShowLogoutConfirm(false)}
            onConfirm={handleConfirmLogout}
          />
        )}
      </header>

      <div className="h-[72px] md:h-[130px]" />
    </>
  );
};

export default Navbar;
