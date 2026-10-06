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
  Trash2,
  UserRound,
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
  id: value.id || value.address_id || "",
  address_line1: value.address_line1 || value.address_line || value.door_number || "",
  address_line2: value.address_line2 || value.area_locality || value.street_name || "",
  country: value.country || "India",
  state: value.state || "Tamil Nadu",
});

const statusClass = {
  placed: "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]",
  preparing: "bg-[#fef3c7] text-[#92400e] border border-[#fde68a]",
  ready: "bg-[#e1f2e8] text-[#28724a] border border-[#c3e6d1]",
  completed: "bg-[#e1f2e8] text-[#28724a] border border-[#c3e6d1]",
  delivered: "bg-[#e1f2e8] text-[#28724a] border border-[#c3e6d1]",
  cancelled: "bg-[#fae5e2] text-[#a43e32] border border-[#f5c6cb]",
  payment_failed: "bg-[#fae5e2] text-[#a43e32] border border-[#f5c6cb]",
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
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
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
      <PageHeader title="Account" />
      <main className="min-h-screen bg-[#f5f7f3] pb-20 pt-8 sm:pt-12">
        <PageContainer className="max-w-[1440px]">
          <section className="relative mb-7 overflow-hidden rounded-[28px] bg-[#071C18] px-6 py-7 text-white shadow-xl shadow-[#071C18]/10 sm:px-9 sm:py-9">
            <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full border-[36px] border-white/[0.035]" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-32 h-56 w-56 rounded-full bg-[#FD5E02]/10 blur-2xl" />
            <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 sm:gap-5">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 font-serif text-2xl font-bold text-[#FEB914] sm:h-[76px] sm:w-[76px] sm:text-3xl">
                  {userInitial}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FEB914]">Your Foodie account</p>
                  <h1 className="mt-1 truncate font-serif text-3xl font-bold sm:text-4xl">Welcome, {displayName}</h1>
                  <p className="mt-1 truncate text-sm text-white/65">{user?.email || "Manage your personal details and orders"}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/20 bg-white/[0.07] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-[#FD5E02] hover:bg-[#FD5E02] sm:self-center"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
            <div className="relative mt-7 grid grid-cols-2 gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
              <div className="rounded-xl bg-white/[0.06] px-4 py-3">
                <p className="text-2xl font-bold text-white">{orders.length}</p>
                <p className="mt-0.5 text-xs text-white/60">Your orders</p>
              </div>
              <div className="rounded-xl bg-white/[0.06] px-4 py-3">
                <p className="text-2xl font-bold text-white">{addresses.length}</p>
                <p className="mt-0.5 text-xs text-white/60">Saved addresses</p>
              </div>
              <div className="col-span-2 rounded-xl bg-white/[0.06] px-4 py-3 sm:col-span-1">
                <p className="truncate text-sm font-semibold text-white">{profile.mobile_number || "Add a phone number"}</p>
                <p className="mt-1 text-xs text-white/60">Contact number</p>
              </div>
            </div>
          </section>

          <nav className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Account sections">
            {TAB_CONFIG.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count = tab.id === "orders" ? orders.length : null;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabSelect(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`group flex min-h-[78px] items-center gap-3 rounded-2xl border p-3 text-left transition duration-200 sm:min-h-[88px] sm:p-4 ${
                    isActive
                      ? "border-[#396F0B] bg-[#396F0B] text-white shadow-lg shadow-[#396F0B]/15"
                      : "border-[#e2e8df] bg-white text-[#071C18] hover:-translate-y-0.5 hover:border-[#396F0B]/40 hover:shadow-md"
                  }`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isActive ? "bg-white/15 text-[#FEB914]" : "bg-[#eff5e9] text-[#396F0B]"}`}>
                    <Icon size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-bold leading-tight">
                      {tab.id === "profile" ? "Personal info" : tab.id === "address" ? "Addresses" : tab.id === "orders" ? "Orders" : "Password"}
                      {count !== null && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? "bg-white/15 text-white" : "bg-[#eff5e9] text-[#396F0B]"}`}>{count}</span>}
                    </span>
                    <span className={`mt-1 hidden truncate text-xs sm:block ${isActive ? "text-white/65" : "text-slate-500"}`}>{tab.desc}</span>
                  </span>
                  <ChevronRight size={16} className={`hidden shrink-0 sm:block ${isActive ? "text-[#FEB914]" : "text-slate-300 group-hover:text-[#396F0B]"}`} />
                </button>
              );
            })}
          </nav>

          <section className="min-w-0">
            <div className="account-content min-h-[460px] rounded-[24px] border border-[#e2e8df] bg-white p-5 shadow-sm sm:p-8 lg:p-10">
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
                  <div>
                    <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E8EDE6] pb-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF5E9] text-[#FD5E02]">
                          <MapPin size={20} />
                        </span>
                        <div>
                          <h2 className="text-xl font-serif font-semibold text-[#071C18]">
                            Saved Addresses
                          </h2>
                          <p className="text-xs text-[#7b8580]">
                            Manage delivery addresses saved to your customer account.
                          </p>
                        </div>
                      </div>

                      {!editingAddress && (
                        <button
                          type="button"
                          onClick={() => {
                            setAddress(emptyAddress);
                            setEditingAddressId(null);
                            setEditingAddress(true);
                          }}
                          className="inline-flex items-center gap-2 self-start rounded-lg border border-[#FD5E02] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#FD5E02] transition hover:bg-[#FD5E02] hover:text-white"
                        >
                          <MapPin size={14} /> Add Address
                        </button>
                      )}
                    </div>

                    {editingAddress ? (
                      <form onSubmit={saveAddress} className="space-y-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                          {[
                            ["address_line1", "Door / street address", "House number, street, building", true],
                            ["address_line2", "Area / locality", "Area or neighbourhood", true],
                            ["city", "City", "City", true],
                            ["state", "State", "State", true],
                            ["pincode", "Pincode", "6-digit pincode", true],
                            ["landmark", "Landmark", "Nearby landmark (optional)", false],
                          ].map(([field, label, placeholder, required]) => (
                            <label key={field} className="block text-xs font-bold uppercase tracking-wider text-[#68736e]">
                              {label}{required && <span className="text-[#FD5E02]"> *</span>}
                              <input
                                required={required}
                                type={field === "pincode" ? "text" : "text"}
                                inputMode={field === "pincode" ? "numeric" : undefined}
                                pattern={field === "pincode" ? "\\d{6}" : undefined}
                                maxLength={field === "address_line1" ? 255 : field === "address_line2" || field === "landmark" ? 180 : 120}
                                placeholder={placeholder}
                                value={address[field] || ""}
                                onChange={(event) => setAddressField(field, event.target.value)}
                                className="mt-1.5 h-11 w-full rounded-lg border border-[#E2E8DF] bg-[#F8FAF7] px-3.5 text-sm font-normal normal-case tracking-normal outline-none transition focus:border-[#FD5E02] focus:ring-1 focus:ring-[#FD5E02]"
                              />
                            </label>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-3">
                          <button
                            type="submit"
                            disabled={saving}
                            className="h-11 rounded-lg bg-[#071C18] px-7 text-sm font-semibold text-white transition hover:bg-[#FD5E02] disabled:opacity-60 cursor-pointer shadow-xs"
                          >
                            {saving ? "Saving..." : editingAddressId ? "Update Address" : "Save Address"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingAddress(false);
                              setEditingAddressId(null);
                              setAddress(emptyAddress);
                            }}
                            className="h-11 rounded-lg border border-[#E2E8DF] px-6 text-sm font-semibold text-[#68736e] hover:bg-[#F5F7F3] transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : hasSavedAddress ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        {addresses.map((savedAddress, index) => (
                          <article key={savedAddress.id || `${savedAddress.address_line1}-${index}`} className="rounded-xl border border-[#E2E8DF] bg-[#F1F5ED] p-5">
                            <div className="flex items-start justify-between gap-3">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF5E9] px-3 py-1 text-xs font-semibold text-[#FD5E02]">
                                <Check size={13} /> Saved address
                              </span>
                              <div className="flex gap-1">
                                <button type="button" onClick={() => editAddress(savedAddress)} aria-label="Edit address" className="rounded-lg p-2 text-[#68736e] transition hover:bg-[#EFF5E9] hover:text-[#071C18]">
                                  <Pencil size={15} />
                                </button>
                                <button type="button" disabled={saving} onClick={() => deleteAddress(savedAddress.id)} aria-label="Delete address" className="rounded-lg p-2 text-[#c24130] transition hover:bg-[#fae5e2] disabled:opacity-50">
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                            <div className="mt-4 space-y-1.5 text-sm text-[#4a5550]">
                              <h4 className="font-semibold text-[#071C18]">{profile.username || displayName}</h4>
                              {profile.mobile_number && <p className="text-xs">{profile.mobile_number}</p>}
                              <p className="leading-relaxed">{[savedAddress.address_line1, savedAddress.address_line2].filter(Boolean).join(", ")}</p>
                              <p className="leading-relaxed">{[savedAddress.city, savedAddress.state].filter(Boolean).join(", ")}{savedAddress.pincode ? ` - ${savedAddress.pincode}` : ""}</p>
                              {savedAddress.landmark && <p className="pt-1 text-xs italic text-[#7b8580]">Landmark: {savedAddress.landmark}</p>}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EFF5E9] text-[#FD5E02]">
                          <MapPin size={26} />
                        </div>
                        <h4 className="mt-4 text-base font-semibold text-[#071C18]">
                          No saved address yet
                        </h4>
                        <p className="mx-auto mt-1 max-w-sm text-xs text-[#7b8580]">
                          Save an address to make delivery checkout faster.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setAddress(emptyAddress);
                            setEditingAddressId(null);
                            setEditingAddress(true);
                          }}
                          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#071C18] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#FD5E02] transition cursor-pointer"
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
                    <div className="mb-7 flex items-center justify-between border-b border-[#E8EDE6] pb-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EFF5E9] text-[#FD5E02]">
                          <Package size={20} />
                        </span>
                        <div>
                          <h2 className="text-xl font-serif font-semibold text-[#071C18]">
                            Your Orders
                          </h2>
                          <p className="text-xs text-[#7b8580]">
                            Review your recent restaurant orders and delivery status.
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-[#EFF5E9] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#FD5E02]">
                        {orders.length} {orders.length === 1 ? "order" : "orders"}
                      </span>
                    </div>

                    <form
                      onSubmit={handleTrackOrder}
                      className="mb-6 flex flex-col gap-2 rounded-xl border border-[#E2E8DF] bg-[#F5F7F3] p-4 sm:flex-row sm:items-end"
                    >
                      <label className="min-w-0 flex-1">
                        <span className="mb-1.5 block text-xs font-semibold text-[#071C18]">
                          Track an order
                        </span>
                        <input
                          type="text"
                          value={trackingOrderId}
                          onChange={(event) => setTrackingOrderId(event.target.value)}
                          placeholder="Enter order ID, e.g. ORD-20260909-A6FY"
                          className="h-11 w-full rounded-lg border border-[#E2E8DF] bg-white px-3 text-sm text-[#071C18] outline-none transition placeholder:text-[#a39a90] focus:border-[#FD5E02] focus:ring-2 focus:ring-[#FD5E02]/15"
                        />
                      </label>
                      <button
                        type="submit"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#071C18] px-5 text-xs font-bold text-white transition hover:bg-[#FD5E02]"
                      >
                        <Search size={15} />
                        Track Order
                      </button>
                    </form>

                    {orders.length > 0 ? (
                      <div className="divide-y divide-[#E8EDE6]">
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
                          const displayStatus = String(status).replaceAll("_", " ");

                          return (
                            <div
                              key={order.order_id}
                              onClick={() => handleOpenOrder(order)}
                              className="group flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between hover:bg-[#F5F7F3] px-3.5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-[#E2E8DF] hover:shadow-xs"
                            >
                              <div className="space-y-1.5 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-[#071C18] text-base tracking-wide group-hover:text-[#FD5E02] transition-colors">
                                    #{order.order_id}
                                  </p>
                                  <span className="text-[11px] font-medium text-[#FD5E02] bg-[#EFF5E9] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline-block">
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
                                    statusClass[String(status).toLowerCase()] || statusClass[displayStatus] ||
                                    "bg-[#f3eee7] text-[#396F0B] border border-[#E2E8DF]"
                                  }`}
                                >
                                  {displayStatus}
                                </span>
                                <strong className="text-base font-bold text-[#071C18]">
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
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EFF5E9] text-[#FD5E02]">
                          <ShoppingBag size={26} />
                        </div>
                        <h4 className="mt-4 text-base font-semibold text-[#071C18]">
                          No orders yet
                        </h4>
                        <p className="mx-auto mt-1 max-w-sm text-xs text-[#7b8580]">
                          Your orders will appear here after your first purchase.
                        </p>
                        <Link
                          to="/shop"
                          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#071C18] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#FD5E02] transition"
                        >
                          Browse the menu
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: CHANGE PASSWORD */}
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