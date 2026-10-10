import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronRight,
  CalendarDays,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CookingPot,
  Truck,
  CircleX,
  Eye,
  EyeOff,
  Gift,
  Heart,
  LockKeyhole,
  LogOut,
  MapPin,
  Package,
  Pencil,
  Save,
  Search,
  ShoppingBag,
  Trash2,
  Utensils,
  UserRound,
  Users,
  PartyPopper,
  Plus,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { API_URL } from "../../api";
import PageContainer from "../../CommonComponents/PageContainer";
import { useAuth } from "../../PrivateRouter/AuthContext";
import OrderDetailsModal from "./OrderDetailsModal";
import LogoutConfirmModal from "../../CommonComponents/LogoutConfirmModal";

const emptyAddress = {
  customer_name: "",
  mobile_number: "",
  address_line1: "",
  address_line2: "",
  city: "",
  district: "",
  state: "Tamil Nadu",
  country: "India",
  pincode: "",
  landmark: "",
};

const normalizeAddress = (value = {}) => ({
  ...emptyAddress,
  ...value,
  id: value.id || value.address_id || "",
  address_line1: value.address_line1 || value.address_line || value.door_number || "",
  address_line2: value.address_line2 || value.area_locality || value.street_name || "",
  country: value.country || "India",
  state: value.state || "Tamil Nadu",
});

const statusClass = {
  placed: "bg-[#eaf4e4] text-[#075b20] border border-[#cfe3c4]",
  assigned: "bg-[#edf3ff] text-[#1749c6] border border-[#cfddff]",
  preparing: "bg-[#fff6d8] text-[#a85b00] border border-[#f1d889]",
  ready: "bg-[#fff6d8] text-[#a85b00] border border-[#f1d889]",
  completed: "bg-[#eaf4e4] text-[#075b20] border border-[#cfe3c4]",
  delivered: "bg-[#eaf4e4] text-[#075b20] border border-[#cfe3c4]",
  cancelled: "bg-[#fff0f2] text-[#c51d42] border border-[#f6d1d9]",
  payment_failed: "bg-[#fff0f2] text-[#c51d42] border border-[#f6d1d9]",
  Delivered: "bg-[#eaf4e4] text-[#075b20] border border-[#cfe3c4]",
  Cancelled: "bg-[#fff0f2] text-[#c51d42] border border-[#f6d1d9]",
  Shipped: "bg-[#edf3ff] text-[#1749c6] border border-[#cfddff]",
  Processing: "bg-[#fff6d8] text-[#a85b00] border border-[#f1d889]",
};

const ORDER_FILTERS = ["All Orders", "Order Placed", "Preparing", "Ready", "Assigned", "Delivered", "Cancelled"];
const ORDERS_PER_PAGE = 5;
const ORDER_STATUS_BADGE_CLASSES = {
  "Order Placed": "bg-[#fff6d8] text-[#a85b00] border border-[#f1d889]",
  Preparing: "bg-[#fff6d8] text-[#a85b00] border border-[#f1d889]",
  Ready: "bg-[#fff6d8] text-[#a85b00] border border-[#f1d889]",
  Assigned: "bg-[#edf3ff] text-[#1749c6] border border-[#cfddff]",
  Delivered: "bg-[#eaf4e4] text-[#075b20] border border-[#cfe3c4]",
  Cancelled: "bg-[#fff0f2] text-[#c51d42] border border-[#f6d1d9]",
};

const RESERVATION_STATUS_CLASSES = {
  Pending: "border-amber-200 bg-amber-50 text-amber-800",
  Confirmed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Declined: "border-rose-200 bg-rose-50 text-rose-700",
  Cancelled: "border-slate-200 bg-slate-100 text-slate-600",
};

const formatReservationDate = (value) => {
  if (!value) return "Date unavailable";
  const dateString = String(value).slice(0, 10);
  const date = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? dateString
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const formatReservationTime = (value) => {
  if (!value) return "Time unavailable";
  const [hour, minute] = String(value).slice(0, 5).split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
};

const getOrderFilterGroup = (status) => {
  const normalized = String(status || "processing").trim().toLowerCase().replaceAll("_", " ");
  if (["cancelled", "returned", "payment failed"].includes(normalized)) return "Cancelled";
  if (["delivered", "completed"].includes(normalized)) return "Delivered";
  if (["assigned", "out for delivery", "shipped"].includes(normalized)) return "Assigned";
  if (normalized === "ready" || normalized === "ready to serve") return "Ready";
  if (normalized === "preparing") return "Preparing";
  return "Order Placed";
};

const getOrderDateValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const resolveOrderImage = (value) => {
  if (!value || typeof value !== "string") return "";
  const image = value.trim();
  if (/^(data:|blob:|https?:\/\/)/i.test(image)) return image;
  const baseUrl = API_URL.replace(/\/api\/?$/, "");
  return `${baseUrl}${image.startsWith("/") ? image : `/${image}`}`;
};

const TAB_CONFIG = [
  {
    id: "profile",
    label: "Profile Details",
    desc: "Personal info & contact details",
    icon: UserRound,
  },
  {
    id: "address",
    label: "Saved Address",
    desc: "Shipping & delivery destination",
    icon: MapPin,
  },
  {
    id: "orders",
    label: "Your Orders",
    desc: "Track and view your purchases",
    icon: Package,
  },
  {
    id: "reservations",
    label: "Reservations",
    desc: "View your table bookings",
    icon: CalendarDays,
  },
  {
    id: "event-orders",
    label: "Event & Bulk Orders",
    desc: "Track catering & party requests",
    icon: PartyPopper,
  },
  {
    id: "password",
    label: "Change Password",
    desc: "Security and account credentials",
    icon: LockKeyhole,
  },
];

const Account = () => {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const userId = user?.user_id || user?.id;
  const [profile, setProfile] = useState({ username: "", mobile_number: "" });
  const [address, setAddress] = useState(emptyAddress);
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [eventOrders, setEventOrders] = useState([]);
  const [editingAddress, setEditingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [saving, setSaving] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedEventOrder, setSelectedEventOrder] = useState(null);
  const [ordersSearchQuery, setOrdersSearchQuery] = useState("");
  const [ordersDateFilter, setOrdersDateFilter] = useState("");
  const [ordersStatusFilter, setOrdersStatusFilter] = useState("All Orders");
  const [ordersPage, setOrdersPage] = useState(1);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Tab handling
  const tabFromUrl = searchParams.get("tab");
  const orderIdFromUrl = searchParams.get("orderId");
  const validTabIds = TAB_CONFIG.map((t) => t.id);
  const activeTab = validTabIds.includes(tabFromUrl) ? tabFromUrl : "profile";
  const normalizedOrderSearch = ordersSearchQuery.trim().toLowerCase();
  const filteredOrders = orders.filter((order) => {
    const orderStatusGroup = getOrderFilterGroup(order.order_status);
    const matchesStatus =
      ordersStatusFilter === "All Orders" || orderStatusGroup === ordersStatusFilter;
    const orderDate = order.created_at || order.order_date;
    const matchesDate =
      !ordersDateFilter || getOrderDateValue(orderDate) === ordersDateFilter;
    const searchableOrderText = [
      order.order_id,
      order.order_number,
      ...(order.items || []).map((item) => item.product_name || item.food_name || ""),
    ].join(" ").toLowerCase();
    const matchesSearch =
      !normalizedOrderSearch || searchableOrderText.includes(normalizedOrderSearch);
    return matchesStatus && matchesDate && matchesSearch;
  });
  const orderPageCount = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const visibleOrders = filteredOrders.slice(
    (ordersPage - 1) * ORDERS_PER_PAGE,
    ordersPage * ORDERS_PER_PAGE,
  );
  const paginationPages = [...new Set(
    [1, ordersPage - 1, ordersPage, ordersPage + 1, orderPageCount]
      .filter((page) => page >= 1 && page <= orderPageCount),
  )].sort((first, second) => first - second);

  const handleTabSelect = (tabId) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tabId);
      if (tabId !== "orders") {
        next.delete("orderId");
      }
      return next;
    });
  };

  const handleOpenOrder = (order) => {
    setSelectedOrder(order);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", "orders");
      if (order?.order_id) {
        next.set("orderId", String(order.order_id));
      }
      return next;
    });
  };

  const handleCloseOrderModal = () => {
    setSelectedOrder(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("orderId");
      return next;
    });
  };

  const handleEditOrderAddress = () => {
    setSelectedOrder(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", "address");
      next.delete("orderId");
      return next;
    });
  };

  useEffect(() => {
    if (orderIdFromUrl && orders.length > 0) {
      const matched = orders.find(
        (o) =>
          String(o.order_id) === String(orderIdFromUrl) ||
          String(o.id) === String(orderIdFromUrl)
      );
      if (matched) {
        setSelectedOrder(matched);
      } else {
        setSelectedOrder({ order_id: orderIdFromUrl });
      }
    }
  }, [orderIdFromUrl, orders]);

  useEffect(() => {
    if (!userId) return;

    api.get("/reservations/mine")
      .then((response) => {
        setReservations(Array.isArray(response.data?.reservations) ? response.data.reservations : []);
      })
      .catch((error) => {
        console.error("Could not load customer reservations:", error);
        toast.error(error.response?.data?.message || "We could not load your reservations");
      });

    api.get("/event-orders/mine")
      .then((response) => {
        setEventOrders(Array.isArray(response.data?.data) ? response.data.data : []);
      })
      .catch((error) => {
        console.warn("Could not load customer event orders:", error?.message);
      });

    Promise.all([
      api.get(`/users/profile/${userId}`),
      api.get("/orders/addresses"),
      api.get("/orders/mine"),
    ])
      .then(([profileResponse, addressResponse, ordersResponse]) => {
        const nextProfile = profileResponse.data?.data || user;
        setProfile({
          username: nextProfile?.username || "",
          mobile_number:
            nextProfile?.mobile_number || nextProfile?.phone || "",
        });
        const savedAddresses = Array.isArray(addressResponse.data?.data)
          ? addressResponse.data.data.map(normalizeAddress)
          : [];
        setAddresses(savedAddresses);
        const orderRecords = Array.isArray(ordersResponse.data?.data)
          ? ordersResponse.data.data
          : [];
        const uniqueOrders = new Map();
        for (const order of orderRecords) {
          const orderNumber = String(order.order_number || order.order_id || order.id || "");
          if (!orderNumber || uniqueOrders.has(orderNumber)) continue;
          uniqueOrders.set(orderNumber, {
            ...order,
            order_id: orderNumber,
            item_count: order.item_count || order.items?.reduce(
              (count, item) => count + Number(item.quantity || 1),
              0,
            ) || 0,
          });
        }
        setOrders([...uniqueOrders.values()]);
      })
      .catch((error) => {
        console.error("Could not load customer account:", error);
        toast.error(error.response?.data?.message || "We could not load your account details");
      });
  }, [userId, user]);

  const updateProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.put(`/users/profile/${userId}`, profile);
      const nextUser = {
        ...user,
        username: profile.username,
        name: profile.username,
        displayName: profile.username,
        mobile_number: profile.mobile_number,
        phone: profile.mobile_number,
      };
      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const saveAddress = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        address_line: address.address_line1,
        area_locality: address.address_line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
      };
      const response = editingAddressId
        ? await api.put(`/orders/addresses/${editingAddressId}`, payload)
        : await api.post("/orders/addresses", payload);
      const savedAddress = normalizeAddress(response.data?.data || payload);
      setAddresses((current) => {
        const withoutEdited = current.filter((item) => String(item.id) !== String(savedAddress.id));
        return [savedAddress, ...withoutEdited];
      });
      setAddress(emptyAddress);
      setEditingAddress(false);
      setEditingAddressId(null);
      toast.success(response.data?.created === false ? "This address is already saved" : "Address saved successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save address");
    } finally {
      setSaving(false);
    }
  };

  const editAddress = (savedAddress) => {
    setAddress(normalizeAddress(savedAddress));
    setEditingAddressId(savedAddress.id);
    setEditingAddress(true);
  };

  const deleteAddress = async (addressId) => {
    if (!window.confirm("Delete this saved address?")) return;
    setSaving(true);
    try {
      await api.delete(`/orders/addresses/${addressId}`);
      setAddresses((current) => current.filter((item) => String(item.id) !== String(addressId)));
      toast.success("Address deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not delete address");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (password.newPassword !== password.confirmPassword) {
      return toast.error("New passwords do not match");
    }
    if (password.newPassword.length < 8) {
      return toast.error("New password must be at least 8 characters long");
    }
    setSaving(true);
    try {
      await api.put("/users/password", {
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not change password");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Signed out successfully");
    navigate("/", { replace: true });
  };

  const setAddressField = (field, value) => {
    setAddress((current) => ({ ...current, [field]: value }));
  };

  const hasSavedAddress = addresses.length > 0;

  const displayName =
    profile.username ||
    user?.displayName ||
    user?.name ||
    user?.username ||
    user?.email ||
    "User";

  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <main className="min-h-screen bg-[#f7f7f3] pb-16 pt-2 sm:pt-4">
        <PageContainer className="max-w-[1500px]">
          <section className="relative mb-4 min-h-[300px] overflow-hidden rounded-[26px] bg-[#002d1c] text-white shadow-lg sm:min-h-[322px]">
            <img src="/images/header.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center opacity-90 sm:object-[center_44%]" />
            <div className="absolute inset-0 bg-[#002b1a]/40" />
            <div className="relative flex min-h-[235px] flex-col justify-center gap-5 px-5 pb-6 pt-7 sm:min-h-[242px] sm:flex-row sm:items-center sm:gap-8 sm:px-10 sm:pb-10">
              <div className="flex shrink-0 items-center gap-4 sm:gap-6">
                <div className="relative flex h-[82px] w-[82px] shrink-0 items-center justify-center rounded-full border-[4px] border-[#FEB914] bg-[#146b3a] text-4xl font-bold text-white shadow-xl sm:h-[112px] sm:w-[112px] sm:text-5xl">
                  {userInitial}
                  <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#00351f] bg-[#FEB914] text-[#05341f]">
                    <Utensils size={17} />
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#FEB914]">My account</p>
                  <h1 className="mt-1 font-serif text-3xl font-extrabold leading-[1.04] sm:text-4xl lg:text-[46px]">
                    Welcome back,<br />
                    <span className="text-[#FEB914]">{displayName}!</span>
                  </h1>
                  <p className="mt-2 text-xs text-white/80 sm:text-sm">Good food, good times, always with you.</p>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#FEB914]/40 bg-[#FEB914]/15 px-3 py-1 text-[11px] font-semibold text-[#ffe18a]">
                    <Heart size={13} fill="currentColor" /> Food lover
                  </div>
                </div>
              </div>
              <div aria-hidden="true" className="hidden max-w-32 -rotate-6 text-center font-serif text-2xl font-bold italic leading-tight text-white drop-shadow sm:block">
                Food<br />Brings<br />People<br /><span className="text-[#FEB914]">Together</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="absolute right-5 top-5 hidden items-center gap-2 rounded-full border border-white/25 bg-black/20 px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#FD5E02] sm:inline-flex"
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
            <div className="relative grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-2 sm:gap-3 lg:absolute lg:inset-x-7 lg:bottom-2 lg:grid-cols-5 lg:pb-0">
              {[
                { id: "orders", icon: Package, value: orders.length, title: "Total Orders", detail: "Your food journey", tone: "text-[#FD5E02]", wash: "bg-[#fff0e6]" },
                { id: "reservations", icon: CalendarDays, value: reservations.length, title: "Reservations", detail: "Your table bookings", tone: "text-[#396F0B]", wash: "bg-[#edf5e9]" },
                { id: "address", icon: MapPin, value: addresses.length, title: "Saved Addresses", detail: "Faster checkout", tone: "text-[#396F0B]", wash: "bg-[#edf5e9]" },
                { id: "profile", icon: Heart, value: profile.mobile_number ? "Ready" : "Add", title: "Your Details", detail: "Keep in touch", tone: "text-[#eaa600]", wash: "bg-[#fff6d8]" },
                { id: "password", icon: LockKeyhole, value: "Secure", title: "Your Account", detail: "Privacy matters", tone: "text-[#e84747]", wash: "bg-[#fff0f0]" },
              ].map(({ id, icon: Icon, value, title, detail, tone, wash }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleTabSelect(id)}
                  className="group flex min-w-0 items-center gap-2.5 rounded-2xl border border-[#e9e5dd] bg-white px-3 py-3 text-left text-[#10221a] shadow-md transition hover:-translate-y-1 hover:shadow-lg sm:gap-3.5 sm:px-4"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${wash} ${tone} sm:h-11 sm:w-11`}>
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-extrabold leading-none sm:text-lg">{value}</span>
                    <span className="mt-1 block truncate text-[10px] font-bold sm:text-xs">{title}</span>
                    <span className="hidden truncate text-[10px] text-slate-500 sm:block">{detail}</span>
                  </span>
                  <ChevronRight size={15} className={`shrink-0 ${tone} transition group-hover:translate-x-0.5`} />
                </button>
              ))}
            </div>
          </section>

          <div className={`grid ${activeTab === "orders" ? "items-start" : "items-stretch"} gap-3 ${activeTab === "address" ? "lg:grid-cols-[minmax(225px,0.78fr)_minmax(0,1.55fr)_minmax(290px,0.95fr)]" : "lg:grid-cols-[minmax(225px,0.78fr)_minmax(0,1.55fr)_minmax(205px,0.64fr)]"}`}>
            <aside className={`relative self-start overflow-hidden rounded-[22px] bg-[#00351f] text-white shadow-md ${activeTab === "orders" ? "lg:sticky lg:top-24" : ""}`}>
              <img src="/images/tab.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-35" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#00351f]/95 via-[#00351f]/80 to-[#001f14]/95" />
              <div className="relative flex h-full flex-col p-4 sm:p-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#FEB914]">Account</p>
                <h2 className="mt-1 font-serif text-2xl font-bold leading-tight">Your Foodie Space</h2>
                <p className="mt-1 text-xs leading-5 text-white/70">Manage everything in one place</p>
                <nav className="mt-5 space-y-1.5" aria-label="Account sections">
                  {TAB_CONFIG.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const label = tab.label;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleTabSelect(tab.id)}
                        aria-current={isActive ? "page" : undefined}
                        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                          isActive ? "bg-[#eff5e9] text-[#07321f] shadow-sm" : "text-white hover:bg-white/10"
                        }`}
                      >
                        <Icon size={19} className={`shrink-0 ${isActive ? "text-[#396F0B]" : "text-[#FEB914]"}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-bold">{label}</span>
                          <span className={`mt-0.5 block truncate text-[10px] ${isActive ? "text-slate-500" : "text-white/55"}`}>{tab.desc}</span>
                        </span>
                        <ChevronRight size={15} className={`shrink-0 transition group-hover:translate-x-0.5 ${isActive ? "text-[#396F0B]" : "text-white/45"}`} />
                      </button>
                    );
                  })}
                </nav>
                <button type="button" onClick={() => setShowLogoutConfirm(true)} className="mt-auto flex items-center gap-3 rounded-xl border-t border-white/15 px-3 pt-4 text-sm font-semibold text-[#ffb5a9] transition hover:text-white">
                  <LogOut size={18} /> Sign out <span className="ml-auto text-[10px] text-white/50">Leave your account</span>
                </button>
              </div>
            </aside>

            <section className={`${activeTab === "address" ? "contents" : "min-w-0"}`}>
              <div className={`account-content h-full ${activeTab === "address" ? "contents" : "min-h-[460px] rounded-[22px] border border-[#ecece5] bg-white p-5 shadow-sm sm:p-7 lg:p-8"}`}>
                {/* TAB 1: PROFILE DETAILS */}
                {activeTab === "profile" && (
                  <div>
                    <div className="mb-7 flex items-center justify-between border-b border-[#E8EDE6] pb-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF5E9] text-[#FD5E02]">
                          <UserRound size={20} />
                        </span>
                        <div>
                          <h2 className="text-xl font-serif font-semibold text-[#071C18]">
                            Profile Details
                          </h2>
                          <p className="text-xs text-[#7b8580]">
                            The details we use to reach you and fulfill your orders.
                          </p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={updateProfile} className="space-y-6">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#68736e]">
                          Full Name <span className="text-[#FD5E02]">*</span>
                          <input
                            required
                            type="text"
                            placeholder="Your full name"
                            maxLength={100}
                            value={profile.username}
                            onChange={(e) =>
                              setProfile({ ...profile, username: e.target.value })
                            }
                            className="mt-2 h-12 w-full rounded-lg border border-[#E2E8DF] bg-[#F8FAF7] px-4 text-sm outline-none transition focus:border-[#FD5E02] focus:ring-1 focus:ring-[#FD5E02]"
                          />
                        </label>

                        <label className="block text-xs font-bold uppercase tracking-wider text-[#68736e]">
                          Phone Number
                          <input
                            type="tel"
                            placeholder="e.g. 9876543210"
                            maxLength={32}
                            value={profile.mobile_number}
                            onChange={(e) =>
                              setProfile({
                                ...profile,
                                mobile_number: e.target.value,
                              })
                            }
                            className="mt-2 h-12 w-full rounded-lg border border-[#E2E8DF] bg-[#F8FAF7] px-4 text-sm outline-none transition focus:border-[#FD5E02] focus:ring-1 focus:ring-[#FD5E02]"
                          />
                        </label>

                        <label className="block text-xs font-bold uppercase tracking-wider text-[#68736e] sm:col-span-2">
                          Email Address
                          <input
                            disabled
                            value={user?.email || ""}
                            className="mt-2 h-12 w-full rounded-lg border border-[#E2E8DF] bg-[#f2f0eb] px-4 text-sm text-[#87908b] cursor-not-allowed"
                          />
                          <span className="mt-1.5 block text-[11px] text-[#87908b]">
                            Email address is tied to your account login and cannot be modified.
                          </span>
                        </label>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={saving}
                          className="flex h-12 items-center justify-center gap-2.5 rounded-lg bg-[#071C18] px-8 text-sm font-semibold text-white transition hover:bg-[#FD5E02] disabled:opacity-60 cursor-pointer shadow-xs"
                        >
                          <Save size={16} />
                          {saving ? "Saving Changes..." : "Save Details"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* TAB 2: SAVED ADDRESS */}
                {activeTab === "address" && (
                  <div className="contents">
                    <section className="min-w-0">
                      <div className="mb-4">
                        <span className="mb-1 block h-0.5 w-8 rounded-full bg-[#FD5E02]" />
                        <h2 className="font-serif text-2xl font-extrabold text-[#071C18]">
                          Your <span className="italic text-[#07502d]">Addresses</span>
                        </h2>
                        <p className="mt-1 text-xs text-[#69716e]">Manage your delivery addresses. You can add, edit or remove addresses anytime.</p>
                      </div>

                      {hasSavedAddress ? (
                        <div className="space-y-3">
                          {addresses.map((savedAddress, index) => (
                            <article key={savedAddress.id || `${savedAddress.address_line1}-${index}`} className={`relative overflow-hidden rounded-xl border bg-white p-4 shadow-[0_5px_18px_rgba(22,47,31,0.06)] transition ${index === 0 ? "border-[#8dbb8d]" : "border-[#edf0eb]"}`}>
                              <div className="flex items-start gap-3">
                                <span className={`mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${index === 0 ? "bg-[#FD5E02]" : "bg-[#07502d]"}`}>
                                  <MapPin size={21} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${index === 0 ? "bg-[#07502d] text-white" : "bg-[#f1f3f2] text-[#59615e]"}`}>
                                    {index === 0 ? "Default address" : "Saved address"}
                                  </span>
                                  <h3 className="mt-1.5 text-sm font-extrabold text-[#171d1a]">{profile.username || displayName}</h3>
                                  {profile.mobile_number && <p className="text-xs text-[#606a65]">{profile.mobile_number}</p>}
                                  <p className="mt-1.5 text-xs leading-relaxed text-[#4a5550]">{[savedAddress.address_line1, savedAddress.address_line2].filter(Boolean).join(", ")}</p>
                                  <p className="text-xs leading-relaxed text-[#4a5550]">{[savedAddress.city, savedAddress.state].filter(Boolean).join(", ")}{savedAddress.pincode ? ` - ${savedAddress.pincode}` : ""}</p>
                                  {savedAddress.landmark && <p className="mt-1 text-[11px] font-semibold text-[#07502d]">Landmark: {savedAddress.landmark}</p>}
                                </div>
                                <div className="flex shrink-0 gap-1">
                                  <button type="button" onClick={() => editAddress(savedAddress)} aria-label="Edit address" className="rounded-lg border border-[#edf0eb] p-2 text-[#53605a] transition hover:border-[#07502d] hover:text-[#07502d]">
                                    <Pencil size={15} />
                                  </button>
                                  <button type="button" disabled={saving} onClick={() => deleteAddress(savedAddress.id)} aria-label="Delete address" className="rounded-lg border border-[#edf0eb] p-2 text-[#FD5E02] transition hover:border-[#FD5E02] hover:bg-[#fff4ed] disabled:opacity-50">
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-[#cbd8cb] bg-white px-5 py-10 text-center">
                          <MapPin className="mx-auto text-[#07502d]" size={26} />
                          <h3 className="mt-3 text-sm font-bold text-[#17231c]">No saved address yet</h3>
                          <p className="mt-1 text-xs text-[#78817c]">Add a delivery location using the form to make checkout faster.</p>
                        </div>
                      )}
                    </section>

                    <section className="rounded-2xl border border-[#f0eee9] bg-white p-4 shadow-[0_7px_24px_rgba(22,47,31,0.07)] sm:p-5">
                      <div className="mb-4 flex items-center justify-between border-b border-[#f0eee9] pb-3">
                        <div>
                          <h2 className="font-serif text-xl font-extrabold text-[#101713]">
                            {editingAddressId ? "Edit" : "Add New"} <span className="italic text-[#07502d]">Address</span>
                          </h2>
                          <p className="mt-0.5 text-[11px] text-[#69716e]">Save a delivery location for faster checkout.</p>
                        </div>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eff5e9] text-[#FD5E02]">
                          <MapPin size={21} />
                        </span>
                      </div>

                      <form onSubmit={saveAddress} className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {[
                            ["address_line1", "Door / Street Address", "House number, street, building", true, "sm:col-span-2"],
                            ["address_line2", "Area / Locality", "Area or neighbourhood", true, "sm:col-span-2"],
                            ["city", "City", "City", true, ""],
                            ["state", "State", "State", true, ""],
                            ["pincode", "Pincode", "6-digit pincode", true, ""],
                            ["landmark", "Landmark (Optional)", "Nearby landmark", false, ""],
                          ].map(([field, label, placeholder, required, span]) => (
                            <label key={field} className={`block text-[11px] font-bold text-[#505954] ${span}`}>
                              {label}{required && <span className="ml-1 text-[#FD5E02]">*</span>}
                              <input
                                required={required}
                                type="text"
                                inputMode={field === "pincode" ? "numeric" : undefined}
                                pattern={field === "pincode" ? "\\d{6}" : undefined}
                                maxLength={field === "address_line1" ? 255 : field === "address_line2" || field === "landmark" ? 180 : 120}
                                placeholder={placeholder}
                                value={address[field] || ""}
                                onChange={(event) => setAddressField(field, event.target.value)}
                                className="mt-1.5 h-10 w-full rounded-lg border border-[#e3e6e4] bg-[#f8f8f8] px-3 text-xs font-normal text-[#222a25] outline-none transition placeholder:text-[#9ba19e] focus:border-[#07502d] focus:ring-1 focus:ring-[#07502d]/20"
                              />
                            </label>
                          ))}
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button type="submit" disabled={saving} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#00351f] px-4 text-xs font-bold text-white shadow-[0_2px_0_#f6a400] transition hover:bg-[#07502d] disabled:opacity-60">
                            <Save size={15} />{saving ? "Saving..." : editingAddressId ? "Update Address" : "Save Address"}
                          </button>
                          {(editingAddress || editingAddressId) && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAddress(false);
                                setEditingAddressId(null);
                                setAddress(emptyAddress);
                              }}
                              className="h-11 rounded-lg border border-[#e3e6e4] px-4 text-xs font-semibold text-[#68736e] transition hover:bg-[#f5f7f3]"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </form>
                    </section>
                  </div>
                )}

                {/* TAB 3: YOUR ORDERS */}
                {activeTab === "orders" && (
                  <div>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-[#E8EDE6] pb-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF5E9] text-[#396F0B] shadow-sm">
                          <Package size={20} />
                        </span>
                        <div>
                          <h2 className="text-xl font-serif font-semibold text-[#071C18]">
                            Your Orders
                          </h2>
                          <p className="text-xs text-[#7b8580]">
                            Your meals, payments and delivery updates.
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#dce8d5] bg-[#f3f8ef] px-3.5 py-2 text-xs font-bold text-[#396F0B]">
                        <ShoppingBag size={14} />
                        {orders.length} {orders.length === 1 ? "order" : "orders"}
                      </span>
                    </div>

                    <nav className="scrollbar-hide mb-3 flex gap-2 overflow-x-auto pb-1" aria-label="Filter orders by status">
                      {ORDER_FILTERS.map((filter) => {
                        const count = filter === "All Orders"
                          ? orders.length
                          : orders.filter((order) => getOrderFilterGroup(order.order_status) === filter).length;
                        const isSelected = ordersStatusFilter === filter;
                        return (
                          <button
                            key={filter}
                            type="button"
                            onClick={() => {
                              setOrdersStatusFilter(filter);
                              setOrdersPage(1);
                            }}
                            aria-pressed={isSelected}
                            className={`shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-semibold transition sm:px-4 ${
                              isSelected
                                ? "border-[#075b2b] bg-[#075b2b] text-white shadow-sm"
                                : "border-[#e7e9e6] bg-white text-[#344035] hover:border-[#a9c69a] hover:bg-[#f6faf3]"
                            }`}
                          >
                            {filter} ({count})
                          </button>
                        );
                      })}
                    </nav>

                    <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
                      <label className="relative block min-w-0">
                        <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#59645e]" />
                        <input
                          type="text"
                          value={ordersSearchQuery}
                          onChange={(event) => {
                            setOrdersSearchQuery(event.target.value);
                            setOrdersPage(1);
                          }}
                          placeholder="Search by Order ID, dish name..."
                          aria-label="Search orders by order ID or dish name"
                          className="h-10 w-full rounded-lg border border-[#e2e5e2] bg-white pl-10 pr-3 text-xs text-[#071C18] outline-none transition placeholder:text-[#778078] focus:border-[#396F0B] focus:ring-2 focus:ring-[#396F0B]/10"
                        />
                      </label>
                      <label className="relative block">
                        <CalendarDays size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#59645e]" />
                        <input
                          type="date"
                          value={ordersDateFilter}
                          onChange={(event) => {
                            setOrdersDateFilter(event.target.value);
                            setOrdersPage(1);
                          }}
                          aria-label="Filter orders by date"
                          className="h-10 w-full rounded-lg border border-[#e2e5e2] bg-white pl-10 pr-2 text-xs text-[#4b5563] outline-none transition focus:border-[#396F0B] focus:ring-2 focus:ring-[#396F0B]/10"
                        />
                      </label>
                    </div>

                    {visibleOrders.length > 0 ? (
                      <div className="space-y-2.5">
                        {visibleOrders.map((order) => {
                          const dateStr = order.created_at || order.order_date;
                          const parsedDate = dateStr ? new Date(dateStr) : null;
                          const formattedDate = parsedDate && !Number.isNaN(parsedDate.getTime())
                            ? parsedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                            : "Recent";
                          const formattedTime = parsedDate && !Number.isNaN(parsedDate.getTime())
                            ? parsedDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                            : "";
                          const status = order.order_status || "Processing";
                          const statusGroup = getOrderFilterGroup(status);
                          const displayStatus = statusGroup;
                          const StatusIcon = statusGroup === "Delivered" || statusGroup === "Ready"
                            ? CheckCircle2
                            : statusGroup === "Assigned"
                              ? Truck
                              : statusGroup === "Cancelled"
                                ? CircleX
                                : CookingPot;
                          const itemImages = (order.items || [])
                            .map((item) => resolveOrderImage(item.product_image || item.image || item.food_images?.[0]))
                            .filter(Boolean);
                          const orderImage = itemImages[0];

                          return (
                            <button
                              key={order.order_id}
                              type="button"
                              onClick={() => handleOpenOrder(order)}
                              className="group grid w-full grid-cols-[76px_minmax(0,1fr)] gap-x-3 gap-y-2.5 rounded-xl border border-[#eeefec] bg-white p-2.5 text-left shadow-[0_4px_14px_rgba(26,37,27,0.06)] transition-all hover:border-[#b8cfac] hover:shadow-md sm:grid-cols-[144px_minmax(0,1fr)_minmax(110px,auto)_130px] sm:items-center sm:gap-x-4 sm:gap-y-0 sm:p-3"
                            >
                              <div className="relative h-[68px] overflow-hidden rounded-lg bg-[#EFF5E9] sm:h-[96px]">
                                {orderImage ? (
                                  <img src={orderImage} alt={order.items?.[0]?.product_name || "Order item"} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                                ) : (
                                  <span className="flex h-full items-center justify-center text-[#396F0B]"><Utensils size={24} /></span>
                                )}
                              </div>

                              <div className="flex min-w-0 flex-col justify-center">
                                <p className="truncate text-xs font-extrabold text-[#101820] sm:text-sm">
                                  #{order.order_id}
                                </p>
                                <p className="mt-0.5 truncate text-[10px] text-[#697386] sm:text-xs">
                                  {formattedDate}{formattedTime && ` • ${formattedTime}`}
                                </p>
                                <p className="mt-0.5 text-[10px] text-[#697386] sm:text-xs">
                                  {order.item_count || order.items?.length || 1} {(order.item_count || order.items?.length || 1) === 1 ? "item" : "items"}
                                </p>
                                {itemImages.length > 0 && (
                                  <div className="mt-1 flex items-center gap-1">
                                    {itemImages.slice(0, 3).map((image, index) => (
                                      <img key={`${order.order_id}-${index}`} src={image} alt="" className="h-6 w-6 rounded-md border border-white object-cover shadow-sm sm:h-8 sm:w-8" />
                                    ))}
                                    {itemImages.length > 3 && (
                                      <span className="flex h-6 min-w-7 items-center justify-center rounded-md bg-[#f2f4f6] px-1 text-[9px] font-semibold text-[#4b5563] sm:h-8 sm:min-w-8 sm:text-[10px]">
                                        +{itemImages.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:justify-center">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold ${
                                    ORDER_STATUS_BADGE_CLASSES[statusGroup] || statusClass[String(status).toLowerCase()] || "bg-[#f3f8ef] text-[#396F0B] border border-[#E2E8DF]"
                                  }`}
                                >
                                  <StatusIcon size={13} />
                                  {displayStatus}
                                </span>
                                <strong className="text-sm font-extrabold text-[#111827] sm:text-base">
                                  ₹{Number(order.total_amount || 0).toLocaleString("en-IN")}
                                </strong>
                              </div>

                              <span className="col-span-2 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#FD5E02] px-3 text-[11px] font-bold text-[#e94616] transition group-hover:bg-[#FD5E02] group-hover:text-white sm:col-span-1 sm:h-9">
                                View Details <ArrowRight size={14} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#dce8d5] bg-[#fbfcf9] py-14 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EFF5E9] text-[#396F0B]">
                          <ShoppingBag size={26} />
                        </div>
                        <h4 className="mt-4 text-lg font-semibold text-[#071C18]">
                          {orders.length ? "No matching orders" : "No orders yet"}
                        </h4>
                        <p className="mx-auto mt-1 max-w-sm text-xs text-[#7b8580]">
                          {orders.length ? "Try changing your search or filters." : "Your orders will appear here after your first purchase."}
                        </p>
                        {!orders.length && (
                          <Link
                            to="/shop"
                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#071C18] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#396F0B]"
                          >
                            Browse the menu
                          </Link>
                        )}
                      </div>
                    )}

                    {filteredOrders.length > ORDERS_PER_PAGE && (
                      <nav className="mt-3 flex items-center justify-center gap-1.5" aria-label="Orders pagination">
                        <button type="button" onClick={() => setOrdersPage((page) => Math.max(1, page - 1))} disabled={ordersPage === 1} aria-label="Previous orders page" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8ebe7] bg-white text-[#344035] transition hover:border-[#a9c69a] disabled:cursor-not-allowed disabled:opacity-40">
                          <ChevronRight size={15} className="rotate-180" />
                        </button>
                        {paginationPages.map((page, index) => (
                          <span key={page} className="flex items-center gap-1.5">
                            {index > 0 && paginationPages[index - 1] < page - 1 && <span className="px-0.5 text-xs text-[#697386]">...</span>}
                            <button type="button" onClick={() => setOrdersPage(page)} aria-current={ordersPage === page ? "page" : undefined} className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition ${ordersPage === page ? "bg-[#075b2b] text-white shadow-sm" : "text-[#344035] hover:bg-[#f2f7ef]"}`}>
                              {page}
                            </button>
                          </span>
                        ))}
                        <button type="button" onClick={() => setOrdersPage((page) => Math.min(orderPageCount, page + 1))} disabled={ordersPage === orderPageCount} aria-label="Next orders page" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e8ebe7] bg-white text-[#344035] transition hover:border-[#a9c69a] disabled:cursor-not-allowed disabled:opacity-40">
                          <ChevronRight size={15} />
                        </button>
                      </nav>
                    )}
                  </div>
                )}

                {/* TAB 4: CHANGE PASSWORD */}
                {activeTab === "reservations" && (
                  <div>
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#E8EDE6] pb-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF5E9] text-[#396F0B] shadow-sm">
                          <CalendarDays size={20} />
                        </span>
                        <div>
                          <h2 className="text-xl font-serif font-semibold text-[#071C18]">Your Reservations</h2>
                          <p className="text-xs text-[#7b8580]">Review your table, date, time, and booking status.</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#dce8d5] bg-[#f3f8ef] px-3.5 py-2 text-xs font-bold text-[#396F0B]">
                        <CalendarDays size={14} />
                        {reservations.length} {reservations.length === 1 ? "reservation" : "reservations"}
                      </span>
                    </div>

                    {reservations.length ? (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {reservations.map((reservation) => (
                          <article key={reservation.reservation_id} className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#e6ebe2] bg-white shadow-[0_8px_24px_rgba(26,37,27,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-[#c9dac0] hover:shadow-[0_14px_32px_rgba(26,37,27,0.1)]">
                            <div className="h-1.5 bg-gradient-to-r from-[#075b2b] via-[#396F0B] to-[#FEB914]" />
                            <div className="flex flex-1 flex-col p-4 sm:p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eff5e9] text-[#396F0B]">
                                    <Utensils size={19} />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#7b8580]">Reserved table</p>
                                    <h3 className="mt-0.5 truncate font-serif text-xl font-bold text-[#071C18]">{reservation.table_number}</h3>
                                  </div>
                                </div>
                                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${RESERVATION_STATUS_CLASSES[reservation.status] || RESERVATION_STATUS_CLASSES.Pending}`}>
                                  {reservation.status}
                                </span>
                              </div>

                              <div className="mt-4 grid grid-cols-2 gap-2.5">
                                <div className="rounded-xl border border-[#edf0ea] bg-[#f8faf6] p-3">
                                  <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider text-[#89938c]">
                                    <CalendarDays size={13} className="text-[#396F0B]" /> Date
                                  </p>
                                  <p className="mt-1.5 text-xs font-bold leading-5 text-[#344035]">{formatReservationDate(reservation.reservation_date)}</p>
                                </div>
                                <div className="rounded-xl border border-[#edf0ea] bg-[#f8faf6] p-3">
                                  <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider text-[#89938c]">
                                    <Clock3 size={13} className="text-[#396F0B]" /> Time
                                  </p>
                                  <p className="mt-1.5 text-xs font-bold leading-5 text-[#344035]">
                                    {formatReservationTime(reservation.start_time)}
                                    <span className="text-[#89938c]"> – </span>
                                    {formatReservationTime(reservation.end_time)}
                                  </p>
                                </div>
                                <div className="col-span-2 flex items-center justify-between rounded-xl border border-[#edf0ea] bg-[#f8faf6] px-3 py-2.5">
                                  <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-[#89938c]">
                                    <Users size={15} className="text-[#396F0B]" /> Party size
                                  </p>
                                  <p className="text-xs font-bold text-[#344035]">
                                    {reservation.guests} {Number(reservation.guests) === 1 ? "guest" : "guests"}
                                  </p>
                                </div>
                              </div>

                              {reservation.notes && (
                                <p className="mt-3 rounded-xl border-l-2 border-[#FEB914] bg-[#fffaf0] px-3 py-2 text-xs leading-5 text-[#68736e]">
                                  <span className="font-bold text-[#344035]">Special requests:</span> {reservation.notes}
                                </p>
                              )}
                              <p className="mt-auto truncate border-t border-[#edf0ea] pt-3 font-mono text-[9px] text-[#89938c]" title={reservation.reservation_id}>
                                Booking reference: {reservation.reservation_id}
                              </p>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border-2 border-dashed border-[#e1e8dd] bg-[#fafcf9] px-5 py-12 text-center">
                        <CalendarDays className="mx-auto h-10 w-10 text-[#9aab9a]" />
                        <h3 className="mt-3 text-base font-bold text-[#071C18]">No reservations yet</h3>
                        <p className="mt-1 text-sm text-[#7b8580]">Your table bookings will appear here after you request a reservation.</p>
                        <Link to="/reservation" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#071C18] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#396F0B]">
                          Book a table <ArrowRight size={15} />
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "event-orders" && (
                  <div>
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8EDE6] pb-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF5E9] text-[#146b3a]">
                          <PartyPopper size={20} />
                        </span>
                        <div>
                          <h2 className="text-xl font-serif font-semibold text-[#071C18]">
                            Event &amp; Bulk Orders
                          </h2>
                          <p className="text-xs text-[#7b8580]">
                            Track your bulk party catering requests, guest headcount, and order status.
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/bulk-order"
                        className="inline-flex items-center gap-1.5 self-start rounded-xl bg-[#071C18] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#146b3a]"
                      >
                        <Plus size={14} /> New Bulk Order
                      </Link>
                    </div>

                    {eventOrders.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {eventOrders.map((evt) => (
                          <article
                            key={evt.id || evt.event_order_number}
                            className="flex flex-col rounded-2xl border border-[#edf0ea] bg-white p-5 shadow-xs transition hover:shadow-md"
                          >
                            <div className="flex items-start justify-between gap-2 border-b border-[#edf0ea] pb-3">
                              <div>
                                <span className="font-mono text-xs font-bold text-[#146b3a]">
                                  {evt.event_order_number}
                                </span>
                                <h3 className="mt-0.5 text-base font-bold text-[#071C18]">
                                  {evt.event_type}
                                </h3>
                              </div>
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                                  evt.status === "Confirmed"
                                    ? "border-blue-200 bg-blue-50 text-blue-800"
                                    : evt.status === "Preparing"
                                    ? "border-purple-200 bg-purple-50 text-purple-800"
                                    : evt.status === "Completed"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                    : evt.status === "Cancelled"
                                    ? "border-rose-200 bg-rose-50 text-rose-800"
                                    : "border-amber-200 bg-amber-50 text-amber-800"
                                }`}
                              >
                                {evt.status || "Pending"}
                              </span>
                            </div>

                            <div className="my-3 grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-xl bg-[#f8faf6] p-2.5">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Event Date</span>
                                <p className="font-bold text-slate-800">
                                  {evt.event_date ? new Date(evt.event_date).toLocaleDateString("en-IN") : "--"}
                                </p>
                              </div>
                              <div className="rounded-xl bg-[#f8faf6] p-2.5">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Serving Time</span>
                                <p className="font-bold text-slate-800">{evt.event_time}</p>
                              </div>
                              <div className="rounded-xl bg-[#f8faf6] p-2.5">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Guest Count</span>
                                <p className="font-bold text-slate-800">{evt.guest_count} Pax</p>
                              </div>
                              <div className="rounded-xl bg-[#f8faf6] p-2.5">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Estimated Total</span>
                                <p className="font-black text-[#146b3a]">
                                  ₹{Number(evt.total_estimated_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-1.5 text-xs text-slate-600">
                              <p className="flex items-start gap-1.5">
                                <MapPin size={14} className="shrink-0 text-slate-400 mt-0.5" />
                                <span className="truncate" title={evt.venue_address}>{evt.venue_address}</span>
                              </p>
                              {evt.dietary_preference && (
                                <p className="text-[11px] text-slate-500">
                                  Dietary: <strong className="text-slate-700">{evt.dietary_preference}</strong>
                                </p>
                              )}
                              {evt.admin_notes && (
                                <p className="rounded-xl border border-blue-200 bg-blue-50/70 p-2 text-[11px] text-blue-900 leading-relaxed">
                                  <strong>Kitchen Note:</strong> {evt.admin_notes}
                                </p>
                              )}
                            </div>

                            {/* Foods & Quantity Preview */}
                            {evt.items && evt.items.length > 0 && (
                              <div className="mt-3 rounded-xl border border-[#edf0ea] bg-[#f8faf6] p-2.5">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                                  <span className="flex items-center gap-1.5 text-[#146b3a]">
                                    <Utensils size={13} /> Selected Foods ({evt.items.length} dishes)
                                  </span>
                                  <span className="text-[#146b3a]">
                                    {evt.items.reduce((s, i) => s + Number(i.quantity || 1), 0)} Total Portions
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {evt.items.slice(0, 3).map((it) => (
                                    <div key={it.id || it.food_id} className="flex items-center justify-between text-xs text-slate-700">
                                      <span className="truncate max-w-[200px] font-medium">{it.product_name}</span>
                                      <span className="shrink-0 font-bold text-[#146b3a] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                        {it.quantity} Qty
                                      </span>
                                    </div>
                                  ))}
                                  {evt.items.length > 3 && (
                                    <p className="text-[11px] font-bold text-slate-500 pt-0.5">
                                      +{evt.items.length - 3} more dishes...
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* View Details Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedEventOrder(evt)}
                              className="mt-3.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-[#146b3a] bg-[#146b3a]/5 text-xs font-bold text-[#146b3a] transition hover:bg-[#146b3a] hover:text-white cursor-pointer"
                            >
                              <Eye size={14} /> View Details &amp; Full Menu ({evt.items?.length || evt.total_items || 0} Foods)
                            </button>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border-2 border-dashed border-[#e1e8dd] bg-[#fafcf9] px-5 py-12 text-center">
                        <PartyPopper className="mx-auto h-10 w-10 text-[#9aab9a]" />
                        <h3 className="mt-3 text-base font-bold text-[#071C18]">No bulk or event orders yet</h3>
                        <p className="mt-1 text-sm text-[#7b8580]">
                          Hosting a birthday, wedding, or office party? Select your dishes and book bulk catering in advance.
                        </p>
                        <Link
                          to="/bulk-order"
                          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#071C18] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#396F0B]"
                        >
                          Place a Bulk Order <ArrowRight size={15} />
                        </Link>
                      </div>
                    )}

                    {/* EVENT ORDER DETAILS MODAL */}
                    {selectedEventOrder && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
                        <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#e8ede6] bg-white p-6 shadow-2xl sm:p-8">
                          {/* Modal Header */}
                          <div className="flex items-start justify-between border-b border-[#edf0ea] pb-4">
                            <div>
                              <span className="font-mono text-xs font-extrabold uppercase tracking-wider text-[#146b3a] bg-[#eef6ea] px-3 py-1 rounded-full border border-[#d6ebd0]">
                                {selectedEventOrder.event_order_number}
                              </span>
                              <h3 className="mt-2 text-2xl font-black text-[#071C18]">
                                {selectedEventOrder.event_type} Catering
                              </h3>
                              <p className="text-xs text-slate-500">
                                Booked on {selectedEventOrder.created_at ? new Date(selectedEventOrder.created_at).toLocaleString("en-IN") : "--"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full border px-3 py-1 text-xs font-bold ${
                                  selectedEventOrder.status === "Confirmed"
                                    ? "border-blue-200 bg-blue-50 text-blue-800"
                                    : selectedEventOrder.status === "Preparing"
                                    ? "border-purple-200 bg-purple-50 text-purple-800"
                                    : selectedEventOrder.status === "Completed"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                    : selectedEventOrder.status === "Cancelled"
                                    ? "border-rose-200 bg-rose-50 text-rose-800"
                                    : "border-amber-200 bg-amber-50 text-amber-800"
                                }`}
                              >
                                {selectedEventOrder.status || "Pending"}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedEventOrder(null)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          </div>

                          {/* Event Specs Grid */}
                          <div className="my-5 grid grid-cols-2 gap-3 rounded-2xl bg-[#f8faf6] p-4 text-xs sm:grid-cols-4">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date</span>
                              <p className="mt-0.5 font-bold text-slate-800">
                                {selectedEventOrder.event_date ? new Date(selectedEventOrder.event_date).toLocaleDateString("en-IN") : "--"}
                              </p>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Serving Time</span>
                              <p className="mt-0.5 font-bold text-slate-800">{selectedEventOrder.event_time}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Headcount</span>
                              <p className="mt-0.5 font-bold text-slate-800">{selectedEventOrder.guest_count} Pax</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dietary</span>
                              <p className="mt-0.5 font-bold text-slate-800">{selectedEventOrder.dietary_preference || "Mixed"}</p>
                            </div>

                            <div className="col-span-2 sm:col-span-4 border-t border-slate-200/60 pt-2.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Venue Delivery Address</span>
                              <p className="mt-0.5 font-medium text-slate-800">{selectedEventOrder.venue_address}</p>
                            </div>

                            {selectedEventOrder.special_requests && (
                              <div className="col-span-2 sm:col-span-4 border-t border-slate-200/60 pt-2.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Special Instructions</span>
                                <p className="mt-0.5 rounded-lg bg-amber-50 p-2 font-medium text-amber-900 border border-amber-200">
                                  {selectedEventOrder.special_requests}
                                </p>
                              </div>
                            )}

                            {selectedEventOrder.admin_notes && (
                              <div className="col-span-2 sm:col-span-4 border-t border-slate-200/60 pt-2.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Restaurant Kitchen Note</span>
                                <p className="mt-0.5 rounded-lg bg-blue-50 p-2 font-medium text-blue-900 border border-blue-200">
                                  {selectedEventOrder.admin_notes}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Itemized Food Menu Table with Count Details */}
                          <div>
                            <h4 className="text-sm font-bold text-[#071C18] mb-2.5 flex items-center gap-2">
                              <Utensils size={15} className="text-[#146b3a]" />
                              Selected Food Items &amp; Quantity Counts
                            </h4>
                            <div className="overflow-hidden rounded-2xl border border-[#edf0ea]">
                              <table className="min-w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-[#edf0ea] bg-[#f8faf6] font-bold uppercase tracking-wider text-slate-500">
                                    <th className="px-4 py-3">Food Item</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3 text-center">Portion</th>
                                    <th className="px-4 py-3 text-center">Count / Qty</th>
                                    <th className="px-4 py-3 text-right">Unit Price</th>
                                    <th className="px-4 py-3 text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#edf0ea] text-slate-700">
                                  {(selectedEventOrder.items || []).map((item) => (
                                    <tr key={item.id || item.food_id} className="hover:bg-slate-50 transition">
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                          {item.product_image ? (
                                            <img
                                              src={resolveOrderImage(item.product_image)}
                                              alt={item.product_name}
                                              className="h-10 w-10 shrink-0 rounded-lg object-cover border border-slate-100"
                                            />
                                          ) : (
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                                              <Utensils size={16} />
                                            </span>
                                          )}
                                          <div>
                                            <p className="font-bold text-slate-900">{item.product_name}</p>
                                            {item.notes && (
                                              <p className="text-[10px] text-slate-400 italic">{item.notes}</p>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-slate-500">{item.category_name || "--"}</td>
                                      <td className="px-4 py-3 text-center text-slate-500">{item.portion_size || "Standard"}</td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="inline-block rounded-md bg-[#eef6ea] px-2.5 py-1 font-black text-[#146b3a] border border-[#d6ebd0]">
                                          {item.quantity} Qty
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-right text-slate-600">
                                        ₹{Number(item.unit_price || 0).toFixed(2)}
                                      </td>
                                      <td className="px-4 py-3 text-right font-black text-[#071C18]">
                                        ₹{Number(item.total_price || (Number(item.unit_price || 0) * Number(item.quantity || 1))).toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t border-[#edf0ea] bg-[#f8faf6] font-bold">
                                    <td colSpan="3" className="px-4 py-3 text-slate-600">
                                      Total Dishes: <strong>{(selectedEventOrder.items || []).length}</strong>
                                    </td>
                                    <td className="px-4 py-3 text-center text-[#146b3a]">
                                      {(selectedEventOrder.items || []).reduce((s, i) => s + Number(i.quantity || 1), 0)} Total Portions
                                    </td>
                                    <td className="px-4 py-3 text-right text-slate-600">
                                      Grand Subtotal:
                                    </td>
                                    <td className="px-4 py-3 text-right font-black text-base text-[#146b3a]">
                                      ₹{Number(selectedEventOrder.total_estimated_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>

                          {/* Modal Footer */}
                          <div className="mt-6 flex justify-end border-t border-[#edf0ea] pt-4">
                            <button
                              type="button"
                              onClick={() => setSelectedEventOrder(null)}
                              className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                            >
                              Close Details
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "password" && (
                  <div>
                    <div className="mb-7 flex items-center justify-between border-b border-[#E8EDE6] pb-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF5E9] text-[#FD5E02]">
                          <LockKeyhole size={20} />
                        </span>
                        <div>
                          <h2 className="text-xl font-serif font-semibold text-[#071C18]">
                            Change Password
                          </h2>
                          <p className="text-xs text-[#7b8580]">
                            Use at least 8 characters with a mix of letters and numbers.
                          </p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={changePassword} className="max-w-lg space-y-5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#68736e]">
                          Current Password <span className="text-[#FD5E02]">*</span>
                        </label>
                        <div className="relative mt-1.5">
                          <input
                            required
                            type={showPassword.current ? "text" : "password"}
                            placeholder="Enter your current password"
                            value={password.currentPassword}
                            onChange={(e) =>
                              setPassword({
                                ...password,
                                currentPassword: e.target.value,
                              })
                            }
                            className="h-12 w-full rounded-lg border border-[#E2E8DF] bg-[#F8FAF7] px-4 pr-11 text-sm outline-none transition focus:border-[#FD5E02] focus:ring-1 focus:ring-[#FD5E02]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((prev) => ({
                                ...prev,
                                current: !prev.current,
                              }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b8580] hover:text-[#071C18] transition cursor-pointer"
                          >
                            {showPassword.current ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#68736e]">
                          New Password <span className="text-[#FD5E02]">*</span>
                        </label>
                        <div className="relative mt-1.5">
                          <input
                            required
                            minLength={8}
                            type={showPassword.new ? "text" : "password"}
                            placeholder="At least 8 characters"
                            value={password.newPassword}
                            onChange={(e) =>
                              setPassword({
                                ...password,
                                newPassword: e.target.value,
                              })
                            }
                            className="h-12 w-full rounded-lg border border-[#E2E8DF] bg-[#F8FAF7] px-4 pr-11 text-sm outline-none transition focus:border-[#FD5E02] focus:ring-1 focus:ring-[#FD5E02]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((prev) => ({
                                ...prev,
                                new: !prev.new,
                              }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b8580] hover:text-[#071C18] transition cursor-pointer"
                          >
                            {showPassword.new ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#68736e]">
                          Confirm New Password <span className="text-[#FD5E02]">*</span>
                        </label>
                        <div className="relative mt-1.5">
                          <input
                            required
                            minLength={8}
                            type={showPassword.confirm ? "text" : "password"}
                            placeholder="Re-enter your new password"
                            value={password.confirmPassword}
                            onChange={(e) =>
                              setPassword({
                                ...password,
                                confirmPassword: e.target.value,
                              })
                            }
                            className="h-12 w-full rounded-lg border border-[#E2E8DF] bg-[#F8FAF7] px-4 pr-11 text-sm outline-none transition focus:border-[#FD5E02] focus:ring-1 focus:ring-[#FD5E02]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((prev) => ({
                                ...prev,
                                confirm: !prev.confirm,
                              }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b8580] hover:text-[#071C18] transition cursor-pointer"
                          >
                            {showPassword.confirm ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={saving}
                          className="flex h-12 items-center justify-center rounded-lg bg-[#071C18] px-8 text-sm font-semibold text-white transition hover:bg-[#FD5E02] disabled:opacity-60 cursor-pointer shadow-xs"
                        >
                          {saving ? "Updating Password..." : "Update Password"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
            </div>
          </section>
          <aside className={`${activeTab === "address" ? "hidden" : `self-start rounded-[22px] border border-[#eeeae0] bg-white p-4 shadow-sm sm:p-5 ${activeTab === "orders" ? "lg:sticky lg:top-24" : ""}`}`}>
            <div className="relative h-40 overflow-hidden rounded-[18px] bg-[#00351f]">
              <img src="/images/tab.png" alt="A selection of restaurant dishes" className="h-full w-full object-cover object-[center_38%]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#002817]/60 via-transparent to-transparent" />
              <span className="absolute bottom-3 left-3 rounded-full bg-[#FEB914] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#17391c]">Made for food lovers</span>
            </div>
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eff5e9] text-[#396F0B]"><Utensils size={17} /></span>
                <div><h3 className="text-xs font-extrabold text-[#071C18]">Explore the menu</h3><p className="mt-0.5 text-[10px] leading-4 text-slate-500">Find something delicious for your next meal.</p></div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff4dd] text-[#d68a00]"><Heart size={17} fill="currentColor" /></span>
                <div><h3 className="text-xs font-extrabold text-[#071C18]">Your favourites</h3><p className="mt-0.5 text-[10px] leading-4 text-slate-500">Keep your favourite dishes close at hand.</p></div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff0e8] text-[#FD5E02]"><Gift size={17} /></span>
                <div><h3 className="text-xs font-extrabold text-[#071C18]">Special offers</h3><p className="mt-0.5 text-[10px] leading-4 text-slate-500">Discover current deals and new dishes.</p></div>
              </div>
            </div>
            <Link to="/offers" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FD5E02] px-4 py-3 text-xs font-extrabold text-white transition hover:bg-[#e65300]">
              View today&apos;s offers <ChevronRight size={15} />
            </Link>
          </aside>
        </div>
        </PageContainer>
      </main>

      {/* Order Details Popup Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        orderId={selectedOrder?.order_id || selectedOrder?.id}
        isOpen={Boolean(selectedOrder)}
        onClose={handleCloseOrderModal}
        onEditAddress={handleEditOrderAddress}
      />
      {showLogoutConfirm && (
        <LogoutConfirmModal
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={handleLogout}
        />
      )}
    </>
  );
};

export default Account;