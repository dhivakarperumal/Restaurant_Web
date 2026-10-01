import React, { useContext, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../PrivateRouter/AuthContext";
import { StoreContext } from "../PrivateRouter/StoreContext";
import { isAdminRole } from "../PrivateRouter/roleUtils";
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
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [mobileSubMenu, setMobileSubMenu] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [services, setServices] = useState([]);
  const [profileDropdown, setProfileDropdown] = useState(false);
  const [favoritesDropdown, setFavoritesDropdown] = useState(false);
  const [cartDropdown, setCartDropdown] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [favoriteItems, setFavoriteItems] = useState([]);
  const dropdownRef = useRef(null);
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

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    setProfileDropdown(false);
    navigate("/", { replace: true });
  };

  const requestLogout = () => setShowLogoutConfirm(true);

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
    setOpenMenu(null);
    setMobileSubMenu(null);
    setMobileMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdown(false);
        setFavoritesDropdown(false);
        setCartDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMenu = (menu) => {
    setOpenMenu((current) => (current === menu ? null : menu));
  };

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
    `text-base font-semibold  transition-colors ${
      isActive ? "text-primary" : "text-white hover:text-primary"
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `flex items-center justify-between rounded-xl px-3 py-3 text-base font-medium transition ${
      isActive
        ? "bg-primary/10 text-primary"
        : "text-white/80 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <>
      <header
        className={`fixed left-0 top-0 z-50 w-full transition-transform duration-300 ease-in-out ${
          isScrolled ? "md:-translate-y-[42px]" : "translate-y-0"
        }`}
      >
        <div className="hidden bg-[#0d0d0d] text-white md:block">
          <PageContainer>
            <div className="flex h-[42px] items-center justify-between gap-4 text-[11px] font-medium tracking-wide text-[#f3f3f3]">
              <div className="flex min-w-0 items-center gap-5">
                <span className="flex items-center gap-2">
                  <FiMapPin className="text-[#d79d4a]" />
                  <span className="truncate">123, MG Road, Coimbatore, Tamil Nadu</span>
                </span>
                <span className="hidden items-center gap-2 sm:flex">
                  <FiClock className="text-[#d79d4a]" />
                  Mon - Sun: 9:00 AM - 9:00 PM
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span className="flex items-center gap-2">
                  <FiPhone className="text-[#d79d4a]" />
                  +91 98765 43210
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-[13px] text-white transition hover:bg-white/10"
                    aria-label="Facebook"
                  >
                    <FiFacebook />
                  </button>
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-[13px] text-white transition hover:bg-white/10"
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
          className={`border-b border-[#d79d4a]/40 bg-white transition-shadow duration-300 ${
            isScrolled
              ? "shadow-[0_8px_24px_rgba(0,0,0,0.1)]"
              : "shadow-[0_4px_18px_rgba(0,0,0,0.08)]"
          }`}
        >
          <PageContainer>
            <div className="flex h-[72px] items-center justify-between gap-2 bg-white sm:gap-4 lg:h-[88px]">
              <Link to="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#d79d4a]/50 bg-white shadow-inner sm:h-14 sm:w-14">
                  <img
                    src="/images/logo.png"
                    alt="Q Frame logo"
                    className="h-full bg-white w-full object-contain"
                  />
                </div>
                <div className="min-w-0 leading-none">
                  <div className="text-[22px] font-black tracking-[-0.06em] text-[#1c1c1c] sm:text-[26px]">
                    Frame
                  </div>
                  <div className="mt-1 hidden text-[9px] font-semibold tracking-[0.28em] text-[#6a5a49] sm:block">
                    PHOTO STUDIO &amp; FRAME SHOP
                  </div>
                </div>
              </Link>

              <nav className="hidden items-center gap-7 xl:flex">
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    `text-sm font-semibold transition ${isActive ? "text-[#d79d4a]" : "text-[#1d1d1d] hover:text-[#d79d4a]"}`
                  }
                >
                  Home
                </NavLink>
                <div className="flex items-center gap-1 text-sm font-semibold text-[#1d1d1d]">
                  <NavLink
                    to="/shop"
                    className={() => `text-sm font-semibold transition ${isShopPage ? "text-[#d79d4a]" : "text-[#1d1d1d] hover:text-[#d79d4a]"}`}
                  >
                    Shop
                  </NavLink>
                </div>

                <div className="flex items-center gap-1 text-sm font-semibold text-[#1d1d1d]">
                  <NavLink
                    to="/frames"
                    className={({ isActive }) => `text-sm font-semibold transition ${isActive ? "text-[#d79d4a]" : "text-[#1d1d1d] hover:text-[#d79d4a]"}`}
                  >
                    Frames
                  </NavLink>
                </div>
                

                <NavLink
                  to="/gifts"
                  className={({ isActive }) =>
                    `text-sm font-semibold transition ${isActive ? "text-[#d79d4a]" : "text-[#1d1d1d] hover:text-[#d79d4a]"}`
                  }
                >
                  Gifts
                </NavLink>

                <NavLink
                  to="/albums"
                  className={({ isActive }) =>
                    `text-sm font-semibold transition ${
                      isActive || isAlbumPage ? "text-[#d79d4a]" : "text-[#1d1d1d] hover:text-[#d79d4a]"
                    }`
                  }
                >
                  Albums
                </NavLink>
                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => toggleMenu("pages")}
                    aria-expanded={openMenu === "pages"}
                    aria-haspopup="menu"
                    className={`flex items-center gap-1 text-sm font-semibold transition ${openMenu === "pages" || isPagesRoute ? "text-[#d79d4a]" : "text-[#1d1d1d] hover:text-[#d79d4a]"}`}
                  >
                    Pages
                    <FiChevronDown
                      className={`transition-transform ${openMenu === "pages" ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openMenu === "pages" && (
                    <div className="absolute left-1/2 top-[calc(100%+20px)] z-50 w-48 -translate-x-1/2 rounded-xl border border-[#ede5da] bg-white p-2 shadow-[0_16px_35px_rgba(15,23,42,0.14)]">
                      <NavLink
                        to="/gallery"
                        className={({ isActive }) =>
                          `block rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-[#f8f1e6] text-[#d79d4a]" : "text-[#2d2d2d] hover:bg-[#faf7f3] hover:text-[#d79d4a]"}`
                        }
                      >
                        Gallery
                      </NavLink>
                      <NavLink
                        to="/about"
                        className={({ isActive }) =>
                          `block rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-[#f8f1e6] text-[#d79d4a]" : "text-[#2d2d2d] hover:bg-[#faf7f3] hover:text-[#d79d4a]"}`
                        }
                      >
                        About Us
                      </NavLink>
                      <NavLink
                        to="/contact"
                        className={({ isActive }) =>
                          `block rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-[#f8f1e6] text-[#d79d4a]" : "text-[#2d2d2d] hover:bg-[#faf7f3] hover:text-[#d79d4a]"}`
                        }
                      >
                        Contact Us
                      </NavLink>
                      <NavLink
                        to="/privacy-policy"
                        className={({ isActive }) =>
                          `block rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-[#f8f1e6] text-[#d79d4a]" : "text-[#2d2d2d] hover:bg-[#faf7f3] hover:text-[#d79d4a]"}`
                        }
                      >
                        Privacy Policy
                      </NavLink>
                    </div>
                  )}
                </div>
              </nav>

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5 lg:gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate(isLoggedIn ? "/account?tab=orders" : "/login")
                  }
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#d79d4a]/30 bg-[#f2eadb] text-[#1d1d1d] transition hover:border-[#d79d4a] hover:bg-[#f8f1e6] sm:h-11 sm:w-11"
                  aria-label="My Orders"
                  title="My Orders"
                >
                  <FiPackage className="text-base sm:text-lg" />
                  {undeliveredOrdersCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#d79d4a] text-[9px] font-bold text-[#111] shadow-xs sm:h-5 sm:w-5 sm:text-[10px]">
                      {undeliveredOrdersCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    openFavorites ? openFavorites() : navigate("/account")
                  }
                  className="relative hidden h-9 w-9 items-center justify-center rounded-full border border-[#d79d4a]/30 bg-[#f2eadb] text-[#1d1d1d] transition hover:border-[#d79d4a] hover:bg-[#f8f1e6] sm:flex sm:h-11 sm:w-11"
                  aria-label="Open favorites"
                >
                  <FiHeart className="text-base sm:text-lg" />
                  {wishlist.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#d79d4a] text-[9px] font-bold text-[#111] sm:h-5 sm:w-5 sm:text-[10px]">
                      {wishlist.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => (openCart ? openCart() : navigate("/cart"))}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#d79d4a]/30 bg-[#f2eadb] text-[#1d1d1d] transition hover:border-[#d79d4a] hover:bg-[#f8f1e6] sm:h-11 sm:w-11"
                  aria-label="Cart"
                >
                  <FiShoppingCart className="text-base sm:text-lg" />
                  {cart.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#d79d4a] text-[9px] font-bold text-[#111] sm:h-5 sm:w-5 sm:text-[10px]">
                      {cart.length}
                    </span>
                  )}
                </button>

                {isLoggedIn ? (
                  <div ref={profileRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setProfileDropdown((prev) => !prev)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1b1a18] text-xs font-bold text-white shadow-[0_8px_18px_rgba(0,0,0,0.12)] transition hover:bg-[#2a2623] sm:h-11 sm:w-11 sm:text-sm"
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
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1b1a18] text-sm font-bold text-white">
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
                          {isAdminRole(role) && (
                            <button
                              type="button"
                              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#1d1d1d] transition hover:bg-[#f7f3ee]"
                              onClick={() => {
                                setProfileDropdown(false);
                                navigate("/admin");
                              }}
                            >
                              <span>Admin Panel</span>
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
                    className="hidden rounded-xl bg-[#1b1a18] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.12)] transition hover:bg-[#2a2623] sm:block"
                  >
                    Login
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => setMobileMenu((current) => !current)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d79d4a]/30 bg-[#f2eadb] text-[#1d1d1d] transition hover:border-[#d79d4a] hover:bg-[#f8f1e6] xl:hidden sm:h-11 sm:w-11"
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
          <div className="border-t border-[#eee5d9] bg-[#1b1a18] shadow-[0_18px_35px_rgba(0,0,0,0.22)] xl:hidden">
            <PageContainer>
              <nav className="max-h-[calc(100vh-72px)] overflow-y-auto py-3 sm:max-h-[calc(100vh-130px)]" aria-label="Mobile navigation">
                <NavLink to="/" end onClick={() => setMobileMenu(false)} className={mobileLinkClass}>
                  Home
                </NavLink>
                <NavLink to="/shop" onClick={() => setMobileMenu(false)} className={() => mobileLinkClass({ isActive: isShopPage })}>
                  Shop
                </NavLink>
                <NavLink to="/frames" onClick={() => setMobileMenu(false)} className={mobileLinkClass}>
                  Frames
                </NavLink>
                <NavLink to="/gifts" onClick={() => setMobileMenu(false)} className={mobileLinkClass}>
                  Gifts
                </NavLink>
                <NavLink to="/albums" onClick={() => setMobileMenu(false)} className={() => mobileLinkClass({ isActive: isAlbumPage })}>
                  Albums
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
                  <div className="ml-3 space-y-1 border-l border-white/15 pl-3">
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

                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 sm:grid-cols-3">
                  <button type="button" onClick={() => { setMobileMenu(false); navigate(isLoggedIn ? "/account?tab=orders" : "/login"); }} className="flex items-center justify-center gap-2 rounded-xl bg-white/8 px-3 py-3 text-xs font-semibold text-white transition hover:bg-white/15">
                    <FiPackage /> Orders
                  </button>
                  <button type="button" onClick={() => { setMobileMenu(false); openFavorites ? openFavorites() : navigate("/account"); }} className="flex items-center justify-center gap-2 rounded-xl bg-white/8 px-3 py-3 text-xs font-semibold text-white transition hover:bg-white/15">
                    <FiHeart /> Favorites
                  </button>
                  <button type="button" onClick={() => { setMobileMenu(false); openCart ? openCart() : navigate("/cart"); }} className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-[#d79d4a] px-3 py-3 text-xs font-bold text-[#1b1a18] transition hover:bg-[#e4b568] sm:col-span-1">
                    <FiShoppingCart /> Cart {cart.length > 0 ? `(${cart.length})` : ""}
                  </button>
                  {!isLoggedIn && (
                    <Link
                      to="/login"
                      onClick={() => setMobileMenu(false)}
                      className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-[#d79d4a] px-3 py-3 text-xs font-bold text-[#f2d19b] transition hover:bg-white/10 sm:col-span-3"
                    >
                      <FiUser /> Login
                    </Link>
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
