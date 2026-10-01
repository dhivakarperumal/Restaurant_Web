import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  LockKeyhole,
  LogOut,
  MapPin,
  Package,
  Pencil,
  Save,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api";
import PageContainer from "../../CommonComponents/PageContainer";
import { useAuth } from "../../PrivateRouter/AuthContext";
import PageHeader from "../../CommonComponents/PageHeader";
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
  address_line1: value.address_line1 || value.door_number || "",
  address_line2: value.address_line2 || value.street_name || "",
  country: value.country || "India",
  state: value.state || "Tamil Nadu",
});

const statusClass = {
  Delivered: "bg-[#e1f2e8] text-[#28724a] border border-[#c3e6d1]",
  Cancelled: "bg-[#fae5e2] text-[#a43e32] border border-[#f5c6cb]",
  Shipped: "bg-[#e3edf7] text-[#35688e] border border-[#b8daff]",
  Processing: "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]",
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
  const [orders, setOrders] = useState([]);
  const [editingAddress, setEditingAddress] = useState(false);
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
  const [trackingOrderId, setTrackingOrderId] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Tab handling
  const tabFromUrl = searchParams.get("tab");
  const orderIdFromUrl = searchParams.get("orderId");
  const validTabIds = TAB_CONFIG.map((t) => t.id);
  const activeTab = validTabIds.includes(tabFromUrl) ? tabFromUrl : "profile";

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

  const handleTrackOrder = (event) => {
    event.preventDefault();
    const requestedOrderId = trackingOrderId.trim().replace(/^#/, "");

    if (!requestedOrderId) {
      toast.error("Please enter an order ID");
      return;
    }

    const matchedOrder = orders.find(
      (order) =>
        String(order.order_id || "").toLowerCase() === requestedOrderId.toLowerCase() ||
        String(order.id || "").toLowerCase() === requestedOrderId.toLowerCase(),
    );

    if (!matchedOrder) {
      toast.error("No order found with that order ID");
      return;
    }

    handleOpenOrder(matchedOrder);
  };

  const handleCloseOrderModal = () => {
    setSelectedOrder(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
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

    Promise.all([
      api.get(`/users/profile/${userId}`),
      api.get(`/users/address/${userId}`),
      api.get(`/orders/user/${userId}`),
    ])
      .then(([profileResponse, addressResponse, ordersResponse]) => {
        const nextProfile = profileResponse.data?.data || user;
        setProfile({
          username: nextProfile?.username || "",
          mobile_number:
            nextProfile?.mobile_number || nextProfile?.phone || "",
        });
        setAddress(normalizeAddress(addressResponse.data?.data || {}));
        setOrders(ordersResponse.data?.data || []);
      })
      .catch(() => toast.error("We could not load your account details"));
  }, [userId]);

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
      const response = await api.put(`/users/address/${userId}`, address);
      setAddress(normalizeAddress(response.data?.data || address));
      setEditingAddress(false);
      toast.success("Address saved successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save address");
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
      await api.put(`/users/password/${userId}`, password);
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

  const hasSavedAddress = Boolean(
    address.customer_name || address.address_line1 || address.city
  );

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
      <PageHeader title="Account" />
      <main className="min-h-screen bg-[#f8f6f1] pb-20 pt-10 sm:pt-14">

        <PageContainer>

          {/* Header Section */}
          <div className="mb-10 flex flex-col justify-between gap-5 border-b border-[#dfd6ca] pb-8 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-[#b87840]">
                Personal Space
              </p>
              <h1 className="font-serif text-3xl sm:text-5xl font-medium text-[#1b2925]">
                My Account
              </h1>
              <p className="mt-2 text-sm text-[#68736e]">
                Keep your details close. Follow every frame from order to doorstep.
              </p>
            </div>

            <div className="flex items-center gap-3.5 rounded-lg border border-[#dfd6ca] bg-white px-4 py-3 shadow-xs">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1b2925] text-base font-bold text-white shadow-inner">
                {userInitial}
              </span>
              <div>
                <p className="text-sm font-semibold text-[#1b2925]">
                  {displayName}
                </p>
                <p className="text-xs text-[#7b8580]">{user?.email || ""}</p>
              </div>
            </div>
          </div>

          {/* Account Layout: Left Tabs Sidebar & Right Active Content */}
          <div className="flex flex-col lg:flex-row items-start gap-8">
            {/* LEFT SIDEBAR: TAB NAVIGATION */}
            <aside className="w-full lg:w-80 flex-shrink-0">
              <div className="overflow-hidden rounded-xl border border-[#dfd6ca] bg-white shadow-xs">
                {/* User profile mini banner */}
                <div className="border-b border-[#dfd6ca] bg-[#fcfbf9] p-5">
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1b2925] text-lg font-bold text-white shadow-sm">
                      {userInitial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-[#1b2925] text-base">
                        {displayName}
                      </h3>
                      <p className="truncate text-xs text-[#7b8580]">
                        {user?.email}
                      </p>
                      <span className="mt-1.5 inline-block rounded bg-[#f4eee6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#b87840]">
                        Member Account
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tab navigation buttons */}
                <nav className="p-2 sm:p-3 space-y-1.5" aria-label="Account Tabs">
                  {TAB_CONFIG.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const count = tab.id === "orders" ? orders.length : null;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleTabSelect(tab.id)}
                        className={`group flex w-full items-center justify-between rounded-lg px-3.5 py-3.5 text-left transition-all cursor-pointer ${isActive
                            ? "bg-[#1b2925] text-white shadow-xs"
                            : "text-[#4a5550] hover:bg-[#f8f6f1] hover:text-[#1b2925]"
                          }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span
                            className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${isActive
                                ? "bg-white/10 text-[#edcca3]"
                                : "bg-[#f4eee6] text-[#b87840] group-hover:bg-[#ebe2d6]"
                              }`}
                          >
                            <Icon size={18} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-tight">
                              {tab.label}
                            </p>
                            <p
                              className={`text-xs mt-0.5 truncate ${isActive ? "text-white/70" : "text-[#7b8580]"
                                }`}
                            >
                              {tab.desc}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-2">
                          {count !== null && count > 0 && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-bold ${isActive
                                  ? "bg-[#b87840] text-white"
                                  : "bg-[#eee7de] text-[#7b6a58]"
                                }`}
                            >
                              {count}
                            </span>
                          )}
                          <ChevronRight
                            size={16}
                            className={`transition-transform duration-200 ${isActive
                                ? "text-[#edcca3] translate-x-0.5"
                                : "text-transparent group-hover:text-[#dfd6ca]"
                              }`}
                          />
                        </div>
                      </button>
                    );
                  })}

                  {/* Sign Out Option */}
                  <div className="pt-2 mt-2 border-t border-[#dfd6ca]">
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(true)}
                      className="flex w-full items-center gap-3.5 rounded-lg px-3.5 py-3 text-left text-sm font-semibold text-[#c24130] hover:bg-[#fae5e2]/60 transition cursor-pointer"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#fae5e2] text-[#c24130]">
                        <LogOut size={16} />
                      </span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </nav>
              </div>
            </aside>

            {/* RIGHT CONTENT PANEL: ONLY THE SELECTED TAB IS SHOWN */}
            <section className="flex-1 w-full min-w-0">
              <div className="rounded-xl border border-[#dfd6ca] bg-white p-6 sm:p-9 shadow-xs min-h-[460px]">
                {/* TAB 1: PROFILE DETAILS */}
                {activeTab === "profile" && (
                  <div>
                    <div className="mb-7 flex items-center justify-between border-b border-[#eee9e3] pb-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4eee6] text-[#b87840]">
                          <UserRound size={20} />
                        </span>
                        <div>
                          <h2 className="text-xl font-serif font-semibold text-[#1b2925]">
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
                          Full Name <span className="text-[#b87840]">*</span>
                          <input
                            required
                            type="text"
                            placeholder="Your full name"
                            value={profile.username}
                            onChange={(e) =>
                              setProfile({ ...profile, username: e.target.value })
                            }
                            className="mt-2 h-12 w-full rounded-lg border border-[#ddd6ce] bg-[#fcfbf8] px-4 text-sm outline-none transition focus:border-[#b87840] focus:ring-1 focus:ring-[#b87840]"
                          />
                        </label>

                        <label className="block text-xs font-bold uppercase tracking-wider text-[#68736e]">
                          Phone Number
                          <input
                            type="tel"
                            placeholder="e.g. 9876543210"
                            value={profile.mobile_number}
                            onChange={(e) =>
                              setProfile({
                                ...profile,
                                mobile_number: e.target.value,
                              })
                            }
                            className="mt-2 h-12 w-full rounded-lg border border-[#ddd6ce] bg-[#fcfbf8] px-4 text-sm outline-none transition focus:border-[#b87840] focus:ring-1 focus:ring-[#b87840]"
                          />
                        </label>

                        <label className="block text-xs font-bold uppercase tracking-wider text-[#68736e] sm:col-span-2">
                          Email Address
                          <input
                            disabled
                            value={user?.email || ""}
                            className="mt-2 h-12 w-full rounded-lg border border-[#ddd6ce] bg-[#f2f0eb] px-4 text-sm text-[#87908b] cursor-not-allowed"
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
                          className="flex h-12 items-center justify-center gap-2.5 rounded-lg bg-[#1b2925] px-8 text-sm font-semibold text-white transition hover:bg-[#b87840] disabled:opacity-60 cursor-pointer shadow-xs"
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
                  <div>
                    <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#eee9e3] pb-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4eee6] text-[#b87840]">
                          <MapPin size={20} />
                        </span>
                        <div>
                          <h2 className="text-xl font-serif font-semibold text-[#1b2925]">
                            Saved Address
                          </h2>
                          <p className="text-xs text-[#7b8580]">
                            Your default shipping destination for orders and deliveries.
                          </p>
                        </div>
                      </div>

                      {!editingAddress ? (
                        <button
                          type="button"
                          onClick={() => setEditingAddress(true)}
                          className="inline-flex items-center gap-2 self-start rounded-lg border border-[#b87840] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#b87840] hover:bg-[#b87840] hover:text-white transition cursor-pointer"
                        >
                          <Pencil size={14} />
                          {hasSavedAddress ? "Edit Address" : "Add Address"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingAddress(false)}
                          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-[#dfd6ca] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#68736e] hover:bg-[#f8f6f1] transition cursor-pointer"
                        >
                          <X size={14} />
                          Cancel
                        </button>
                      )}
                    </div>

                    {editingAddress ? (
                      <form onSubmit={saveAddress} className="space-y-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#68736e]">
                              Full Name <span className="text-[#b87840]">*</span>
                            </label>
                            <input
                              required
                              placeholder="Recipient's Name"
                              value={address.customer_name || ""}
                              onChange={(e) =>
                                setAddressField("customer_name", e.target.value)
                              }
                              className="mt-1.5 h-11 w-full rounded-lg border border-[#ddd6ce] bg-[#fcfbf8] px-3.5 text-sm outline-none transition focus:border-[#b87840] focus:ring-1 focus:ring-[#b87840]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#68736e]">
                              Phone Number <span className="text-[#b87840]">*</span>
                            </label>
                            <input
                              required
                              type="tel"
                              placeholder="Mobile Number"
                              value={address.mobile_number || ""}
                              onChange={(e) =>
                                setAddressField("mobile_number", e.target.value)
                              }
                              className="mt-1.5 h-11 w-full rounded-lg border border-[#ddd6ce] bg-[#fcfbf8] px-3.5 text-sm outline-none transition focus:border-[#b87840] focus:ring-1 focus:ring-[#b87840]"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#68736e]">
                              Address Line 1 <span className="text-[#b87840]">*</span>
                            </label>
                            <input
                              required
                              placeholder="House / Flat / Block No, Building Name"
                              value={address.address_line1 || ""}
                              onChange={(e) =>
                                setAddressField("address_line1", e.target.value)
                              }
                              className="mt-1.5 h-11 w-full rounded-lg border border-[#ddd6ce] bg-[#fcfbf8] px-3.5 text-sm outline-none transition focus:border-[#b87840] focus:ring-1 focus:ring-[#b87840]"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#68736e]">
                              Address Line 2
                            </label>
                            <input
                              placeholder="Street, Area, Sector, Colony"
                              value={address.address_line2 || ""}
                              onChange={(e) =>
                                setAddressField("address_line2", e.target.value)
                              }
                              className="mt-1.5 h-11 w-full rounded-lg border border-[#ddd6ce] bg-[#fcfbf8] px-3.5 text-sm outline-none transition focus:border-[#b87840] focus:ring-1 focus:ring-[#b87840]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#68736e]">
                              City <span className="text-[#b87840]">*</span>
                            </label>
                            <input
                              required
                              placeholder="City"
                              value={address.city || ""}
                              onChange={(e) =>
                                setAddressField("city", e.target.value)
                              }
                              className="mt-1.5 h-11 w-full rounded-lg border border-[#ddd6ce] bg-[#fcfbf8] px-3.5 text-sm outline-none transition focus:border-[#b87840] focus:ring-1 focus:ring-[#b87840]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#68736e]">
                              District
                            </label>
                            <input
                              placeholder="District"
                              value={address.district || ""}
                              onChange={(e) =>
                                setAddressField("district", e.target.value)
                              }
                              className="mt-1.5 h-11 w-full rounded-lg border border-[#ddd6ce] bg-[#fcfbf8] px-3.5 text-sm outline-none transition focus:border-[#b87840] focus:ring-1 focus:ring-[#b87840]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#68736e]">
                              State
                            </label>
                            <input
                              placeholder="State"
                              value={address.state || "Tamil Nadu"}
                              onChange={(e) =>
                                setAddressField("state", e.target.value)
                              }
                              className="mt-1.5 h-11 w-full rounded-lg border border-[#ddd6ce] bg-[#fcfbf8] px-3.5 text-sm outline-none transition focus:border-[#b87840] focus:ring-1 focus:ring-[#b87840]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#68736e]">
                              Country
                            </label>
                            <input
                              placeholder="Country"
                              value={address.country || "India"}
                              onChange={(e) =>
                                setAddressField("country", e.target.value)
                              }
                              className="mt-1.5 h-11 w-full rounded-lg border border-[#ddd6ce] bg-[#fcfbf8] px-3.5 text-sm outline-none transition focus:border-[#b87840] focus:ring-1 focus:ring-[#b87840]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#68736e]">
                              Pincode <span className="text-[#b87840]">*</span>
                            </label>
                            <input
                              required
                              placeholder="6-digit Pincode"
                              value={address.pincode || ""}
                              onChange={(e) =>
                                setAddressField("pincode", e.target.value)
                              }
                              className="mt-1.5 h-11 w-full rounded-lg border border-[#ddd6ce] bg-[#fcfbf8] px-3.5 text-sm outline-none transition focus:border-[#b87840] focus:ring-1 focus:ring-[#b87840]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#68736e]">
                              Landmark
                            </label>
                            <input
                              placeholder="Nearby landmark (e.g. Near Bus Stand)"
                              value={address.landmark || ""}
                              onChange={(e) =>
                                setAddressField("landmark", e.target.value)
                              }
                              className="mt-1.5 h-11 w-full rounded-lg border border-[#ddd6ce] bg-[#fcfbf8] px-3.5 text-sm outline-none transition focus:border-[#b87840] focus:ring-1 focus:ring-[#b87840]"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-3">
                          <button
                            type="submit"
                            disabled={saving}
                            className="h-11 rounded-lg bg-[#1b2925] px-7 text-sm font-semibold text-white transition hover:bg-[#b87840] disabled:opacity-60 cursor-pointer shadow-xs"
                          >
                            {saving ? "Saving..." : "Save Address"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingAddress(false)}
                            className="h-11 rounded-lg border border-[#dfd6ca] px-6 text-sm font-semibold text-[#68736e] hover:bg-[#f8f6f1] transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : hasSavedAddress ? (
                      <div className="rounded-xl border border-[#dfd6ca] bg-[#fcfbf9] p-6 sm:p-7">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f4eee6] px-3 py-1 text-xs font-semibold text-[#b87840]">
                            <Check size={13} />
                            Default Delivery Address
                          </span>
                        </div>

                        <div className="mt-4 space-y-2 text-sm text-[#4a5550]">
                          <h4 className="text-lg font-semibold text-[#1b2925]">
                            {address.customer_name}
                          </h4>
                          <p className="font-medium text-[#1b2925]">
                            {address.mobile_number}
                          </p>
                          <p className="leading-relaxed">
                            {[address.address_line1, address.address_line2]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                          <p className="leading-relaxed">
                            {[address.city, address.district, address.state]
                              .filter(Boolean)
                              .join(", ")}
                            {address.pincode ? ` - ${address.pincode}` : ""}
                          </p>
                          <p className="text-xs text-[#7b8580]">
                            {address.country || "India"}
                          </p>
                          {address.landmark && (
                            <p className="mt-2 text-xs italic text-[#7b8580]">
                              Landmark: {address.landmark}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f4eee6] text-[#b87840]">
                          <MapPin size={26} />
                        </div>
                        <h4 className="mt-4 text-base font-semibold text-[#1b2925]">
                          No saved address yet
                        </h4>
                        <p className="mx-auto mt-1 max-w-sm text-xs text-[#7b8580]">
                          Add your shipping address to speed up checkout and manage your deliveries seamlessly.
                        </p>
                        <button
                          type="button"
                          onClick={() => setEditingAddress(true)}
                          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1b2925] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#b87840] transition cursor-pointer"
                        >
                          <Pencil size={14} />
                          Add Address
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: YOUR ORDERS */}
                {activeTab === "orders" && (
                  <div>
                    <div className="mb-7 flex items-center justify-between border-b border-[#eee9e3] pb-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4eee6] text-[#b87840]">
                          <Package size={20} />
                        </span>
                        <div>
                          <h2 className="text-xl font-serif font-semibold text-[#1b2925]">
                            Your Orders
                          </h2>
                          <p className="text-xs text-[#7b8580]">
                            A quiet record of everything you have framed.
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-[#f4eee6] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#b87840]">
                        {orders.length} {orders.length === 1 ? "order" : "orders"}
                      </span>
                    </div>

                    <form
                      onSubmit={handleTrackOrder}
                      className="mb-6 flex flex-col gap-2 rounded-xl border border-[#dfd6ca] bg-[#faf8f5] p-4 sm:flex-row sm:items-end"
                    >
                      <label className="min-w-0 flex-1">
                        <span className="mb-1.5 block text-xs font-semibold text-[#1b2925]">
                          Track an order
                        </span>
                        <input
                          type="text"
                          value={trackingOrderId}
                          onChange={(event) => setTrackingOrderId(event.target.value)}
                          placeholder="Enter order ID, e.g. ORD-20260909-A6FY"
                          className="h-11 w-full rounded-lg border border-[#dfd6ca] bg-white px-3 text-sm text-[#1b2925] outline-none transition placeholder:text-[#a39a90] focus:border-[#b87840] focus:ring-2 focus:ring-[#b87840]/15"
                        />
                      </label>
                      <button
                        type="submit"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1b2925] px-5 text-xs font-bold text-white transition hover:bg-[#b87840]"
                      >
                        <Search size={15} />
                        Track Order
                      </button>
                    </form>

                    {orders.length > 0 ? (
                      <div className="divide-y divide-[#eee9e3]">
                        {orders.map((order) => {
                          const dateStr = order.created_at || order.order_date;
                          const formattedDate = dateStr
                            ? new Date(dateStr).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                            : "Recent";

                          const status = order.order_status || "Processing";

                          return (
                            <div
                              key={order.order_id}
                              onClick={() => handleOpenOrder(order)}
                              className="group flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between hover:bg-[#faf8f5] px-3.5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-[#dfd6ca] hover:shadow-xs"
                            >
                              <div className="space-y-1.5 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-[#1b2925] text-base tracking-wide group-hover:text-[#b87840] transition-colors">
                                    #{order.order_id}
                                  </p>
                                  <span className="text-[11px] font-medium text-[#b87840] bg-[#f4eee6] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-block">
                                    Click to view details
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[#7b8580]">
                                  <span>{formattedDate}</span>
                                  <span>•</span>
                                  <span>
                                    {order.item_count || 1}{" "}
                                    {(order.item_count || 1) === 1
                                      ? "item"
                                      : "items"}
                                  </span>
                                  {order.payment_method && (
                                    <>
                                      <span>•</span>
                                      <span>{order.payment_method}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3.5">
                                <span
                                  className={`rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                                    statusClass[status] ||
                                    "bg-[#f3eee7] text-[#7b6a58] border border-[#dfd6ca]"
                                  }`}
                                >
                                  {status}
                                </span>
                                <strong className="text-base font-bold text-[#1b2925]">
                                  ₹
                                  {Number(
                                    order.total_amount || 0
                                  ).toLocaleString("en-IN")}
                                </strong>
                                
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-14 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f4eee6] text-[#b87840]">
                          <ShoppingBag size={26} />
                        </div>
                        <h4 className="mt-4 text-base font-semibold text-[#1b2925]">
                          No orders yet
                        </h4>
                        <p className="mx-auto mt-1 max-w-sm text-xs text-[#7b8580]">
                          Your next beautiful frame will show up here once you make your first purchase.
                        </p>
                        <Link
                          to="/shop"
                          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#1b2925] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#b87840] transition"
                        >
                          Explore Collections
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: CHANGE PASSWORD */}
                {activeTab === "password" && (
                  <div>
                    <div className="mb-7 flex items-center justify-between border-b border-[#eee9e3] pb-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4eee6] text-[#b87840]">
                          <LockKeyhole size={20} />
                        </span>
                        <div>
                          <h2 className="text-xl font-serif font-semibold text-[#1b2925]">
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
                          Current Password <span className="text-[#b87840]">*</span>
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
                            className="h-12 w-full rounded-lg border border-[#ddd6ce] bg-[#fcfbf8] px-4 pr-11 text-sm outline-none transition focus:border-[#b87840] focus:ring-1 focus:ring-[#b87840]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((prev) => ({
                                ...prev,
                                current: !prev.current,
                              }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b8580] hover:text-[#1b2925] transition cursor-pointer"
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
                          New Password <span className="text-[#b87840]">*</span>
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
                            className="h-12 w-full rounded-lg border border-[#ddd6ce] bg-[#fcfbf8] px-4 pr-11 text-sm outline-none transition focus:border-[#b87840] focus:ring-1 focus:ring-[#b87840]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((prev) => ({
                                ...prev,
                                new: !prev.new,
                              }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b8580] hover:text-[#1b2925] transition cursor-pointer"
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
                          Confirm New Password <span className="text-[#b87840]">*</span>
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
                            className="h-12 w-full rounded-lg border border-[#ddd6ce] bg-[#fcfbf8] px-4 pr-11 text-sm outline-none transition focus:border-[#b87840] focus:ring-1 focus:ring-[#b87840]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((prev) => ({
                                ...prev,
                                confirm: !prev.confirm,
                              }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7b8580] hover:text-[#1b2925] transition cursor-pointer"
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
                          className="flex h-12 items-center justify-center rounded-lg bg-[#1b2925] px-8 text-sm font-semibold text-white transition hover:bg-[#b87840] disabled:opacity-60 cursor-pointer shadow-xs"
                        >
                          {saving ? "Updating Password..." : "Update Password"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </section>
          </div>
        </PageContainer>
      </main>

      {/* Order Details Popup Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        orderId={selectedOrder?.order_id || selectedOrder?.id}
        isOpen={Boolean(selectedOrder)}
        onClose={handleCloseOrderModal}
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