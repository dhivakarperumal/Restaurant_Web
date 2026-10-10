import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Info,
  MapPin,
  Minus,
  PartyPopper,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api, { BACKEND_BASE_URL } from "../../api";
import PageContainer from "../../CommonComponents/PageContainer";
import PageHeader from "../../CommonComponents/PageHeader";
import { useAuth } from "../../PrivateRouter/AuthContext";

const EVENT_TYPES = [
  "Birthday Party",
  "Corporate Event",
  "Wedding / Reception",
  "Family Gathering",
  "Anniversary",
  "Housewarming / Puja",
  "College / School Event",
  "Festival Celebration",
  "Other Occasion",
];

const DIETARY_OPTIONS = [
  { id: "Mixed", label: "Veg & Non-Veg (Mixed)", desc: "Balanced menu with both options" },
  { id: "Pure Veg", label: "Pure Vegetarian", desc: "100% vegetarian preparations" },
  { id: "Non-Veg", label: "Non-Veg Focused", desc: "Non-vegetarian dishes prioritized" },
];

const minimumEventDate = (() => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const localDate = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
})();

const resolveImageUrl = (image) => {
  if (!image || typeof image !== "string") return "";
  if (/^(https?:\/\/|data:)/i.test(image)) return image;
  return `${BACKEND_BASE_URL}${image.startsWith("/") ? image : `/${image}`}`;
};

export default function BulkOrder() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form State
  const [form, setForm] = useState({
    customer_name: user?.name || user?.username || "",
    customer_phone: user?.mobile_number || user?.phone || "",
    customer_email: user?.email || "",
    event_type: "Birthday Party",
    event_date: minimumEventDate,
    event_time: "13:00",
    guest_count: 25,
    dietary_preference: "Mixed",
    venue_address: "",
    special_requests: "",
    payment_method: "cod",
  });

  // Food Menu state
  const [allFoods, setAllFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingFoods, setLoadingFoods] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedFoodType, setSelectedFoodType] = useState("all");
  const [menuSearch, setMenuSearch] = useState("");

  // Selected Items in Bulk Order: { [foodId]: { food, quantity, notes } }
  const [selectedItems, setSelectedItems] = useState({});

  // Submitting & Feedback states
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  // Sync user info if auth state hydrates
  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        customer_name: prev.customer_name || user.name || user.username || "",
        customer_phone: prev.customer_phone || user.mobile_number || user.phone || "",
        customer_email: prev.customer_email || user.email || "",
      }));
    }
  }, [user]);

  // Load foods and categories.
  // CRITICAL REQUIREMENT: For Bulk Order, ALL foods added by admin are loaded,
  // including chef-unchecked / not-on-daily-menu items!
  useEffect(() => {
    let active = true;
    const fetchMenu = async () => {
      try {
        setLoadingFoods(true);
        const [menuRes, catRes] = await Promise.allSettled([
          api.get("/event-orders/menu"),
          api.get("/categories"),
        ]);

        if (!active) return;

        if (menuRes.status === "fulfilled" && menuRes.value.data?.success) {
          setAllFoods(menuRes.value.data.data || []);
        } else if (menuRes.status === "fulfilled" && Array.isArray(menuRes.value.data)) {
          setAllFoods(menuRes.value.data);
        } else {
          // Fallback to /foods if needed
          const fallback = await api.get("/foods");
          if (active && fallback.data?.data) {
            setAllFoods(fallback.data.data);
          }
        }

        if (catRes.status === "fulfilled" && catRes.value.data?.success) {
          setCategories(catRes.value.data.data || []);
        }
      } catch (err) {
        console.error("Failed to load bulk menu foods:", err);
        toast.error("Could not load the full catering menu.");
      } finally {
        if (active) setLoadingFoods(false);
      }
    };

    fetchMenu();
    return () => { active = false; };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Quantity Management
  const updateItemQuantity = (food, newQty) => {
    const foodId = String(food.food_id || food.id);
    const qty = Math.max(0, Number(newQty) || 0);

    setSelectedItems((prev) => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[foodId];
      } else {
        next[foodId] = {
          food,
          quantity: qty,
          unit_price: Number(food.final_price || food.mrp || 0),
          notes: prev[foodId]?.notes || "",
        };
      }
      return next;
    });
  };

  const removeItem = (foodId) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      delete next[foodId];
      return next;
    });
  };

  // Filtered Food items
  const filteredFoods = useMemo(() => {
    return allFoods.filter((food) => {
      // Category filter
      if (selectedCategory !== "all") {
        if (
          String(food.category_id) !== String(selectedCategory) &&
          food.category_name?.toLowerCase() !== selectedCategory.toLowerCase()
        ) {
          return false;
        }
      }

      // Food type filter (Veg / Non-Veg)
      if (selectedFoodType !== "all") {
        if (String(food.food_type).toLowerCase() !== selectedFoodType.toLowerCase()) {
          return false;
        }
      }

      // Search filter
      if (menuSearch.trim()) {
        const query = menuSearch.toLowerCase().trim();
        const matchName = food.food_name?.toLowerCase().includes(query);
        const matchDesc = food.description?.toLowerCase().includes(query);
        const matchCat = food.category_name?.toLowerCase().includes(query);
        const matchCuis = food.cuisine_name?.toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchCat && !matchCuis) return false;
      }

      return true;
    });
  }, [allFoods, selectedCategory, selectedFoodType, menuSearch]);

  // Totals
  const selectedItemsList = useMemo(() => Object.values(selectedItems), [selectedItems]);
  const estimatedSubtotal = useMemo(() => {
    return selectedItemsList.reduce(
      (sum, item) => sum + (item.unit_price * item.quantity),
      0
    );
  }, [selectedItemsList]);

  const totalPortions = useMemo(() => {
    return selectedItemsList.reduce((sum, item) => sum + item.quantity, 0);
  }, [selectedItemsList]);

  // Submit Bulk Order
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.customer_name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!form.customer_phone.trim()) {
      toast.error("Please enter your phone number.");
      return;
    }
    if (!form.venue_address.trim()) {
      toast.error("Please provide the event venue or delivery address.");
      return;
    }
    if (Number(form.guest_count) < 5) {
      toast.error("Bulk orders require a minimum of 5 guests.");
      return;
    }
    if (selectedItemsList.length === 0) {
      toast.error("Please select at least one food item for your bulk order menu.");
      return;
    }

    setSubmitting(true);
    try {
      const itemsPayload = selectedItemsList.map(({ food, quantity, unit_price, notes }) => ({
        food_id: food.food_id || food.id,
        product_name: food.food_name,
        product_image: Array.isArray(food.food_images) ? food.food_images[0] : food.image || "",
        category_name: food.category_name || "",
        portion_size: food.portion_size || "Standard",
        unit_price,
        quantity,
        total_price: Number((unit_price * quantity).toFixed(2)),
        notes,
      }));

      const payload = {
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        customer_email: form.customer_email.trim() || null,
        event_type: form.event_type,
        event_date: form.event_date,
        event_time: form.event_time,
        guest_count: Number(form.guest_count),
        dietary_preference: form.dietary_preference,
        venue_address: form.venue_address.trim(),
        special_requests: form.special_requests.trim(),
        payment_method: form.payment_method,
        total_estimated_amount: Number(estimatedSubtotal.toFixed(2)),
        items: itemsPayload,
      };

      const res = await api.post("/event-orders", payload);
      if (res.data?.success) {
        setOrderSuccess({
          orderNumber: res.data.data?.eventOrderNumber || "EVT-CONFIRMED",
          customerName: form.customer_name,
          guestCount: form.guest_count,
          eventDate: form.event_date,
          eventType: form.event_type,
          estimatedTotal: estimatedSubtotal,
        });
        toast.success("Bulk order request placed successfully!");
      } else {
        toast.error(res.data?.message || "Failed to submit bulk order request.");
      }
    } catch (err) {
      console.error("Bulk order submission error:", err);
      toast.error(err.response?.data?.message || "Could not submit your bulk order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <main className="min-h-screen bg-[#f7f7f3] pb-20 text-[#203129]">
        <PageHeader title="Quotation Request Submitted" />
        <PageContainer>
          <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-[#d8d6c7] bg-white p-8 text-center shadow-lg sm:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-inner">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <span className="mt-6 inline-block rounded-full bg-[#f6eee2] px-4 py-1 text-xs font-black uppercase tracking-widest text-[#a85b00]">
              Quotation Request #{orderSuccess.orderNumber}
            </span>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#1a3c36] sm:text-4xl">
              Thank You, {orderSuccess.customerName}!
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              Your bulk catering menu request for <strong>{orderSuccess.eventType}</strong> ({orderSuccess.guestCount} guests) on <strong>{orderSuccess.eventDate}</strong> has been submitted to our management.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-xs sm:text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">Event Occasion:</span>
                <span className="font-bold text-slate-800">{orderSuccess.eventType}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">Event Date:</span>
                <span className="font-bold text-slate-800">{orderSuccess.eventDate}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-200">
                <span className="text-slate-500">Guest Count:</span>
                <span className="font-bold text-slate-800">{orderSuccess.guestCount} Pax</span>
              </div>
              <div className="flex justify-between py-1.5 font-bold">
                <span className="text-slate-700">Estimated Menu Value:</span>
                <span className="text-[#1a3c36] text-base">₹{Number(orderSuccess.estimatedTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-amber-50 p-4 text-left text-xs leading-relaxed text-amber-900 border border-amber-200">
              <div className="flex gap-2.5">
                <Info className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                <p>
                  <strong>What happens next?</strong> Our admin team will review your order, apply bulk discounts per dish or overall, and send you a discounted quotation. You can then review and <strong>Accept or Reject</strong> the quote directly in your account!
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/account?tab=event-orders"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#1a3c36] px-6 text-sm font-bold text-white shadow-md transition hover:bg-[#24534a]"
              >
                View Quote in My Account
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOrderSuccess(null);
                  setSelectedItems({});
                }}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Place Another Bulk Order
              </button>
            </div>
          </div>
        </PageContainer>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f3] pb-24 text-[#203129]">
      <PageHeader
        title="Bulk & Event Orders"
        subtitle="Custom catering, party platters, and bulk meals for your special gatherings"
      />

      <PageContainer>
        {/* Banner highlighting full menu access */}
        <section className="mb-8 mt-4 rounded-3xl bg-gradient-to-r from-[#1a3c36] to-[#255248] p-6 text-white shadow-lg sm:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d79d4a]/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#f5cca0]">
                <Sparkles className="h-3.5 w-3.5" /> Catering & Special Events
              </span>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl text-white">
                All Restaurant Delicacies Available for Bulk Orders
              </h2>
              <p className="mt-2 max-w-2xl text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
                Planning a party, family event, or office lunch? Choose from our complete master recipe collection. All items created by our kitchen are available for pre-ordered bulk batches.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 shrink-0 rounded-2xl bg-black/20 p-3 sm:p-4 backdrop-blur-xs text-center">
              <div>
                <p className="text-xl sm:text-2xl font-black text-[#f5cca0]">5+</p>
                <p className="text-[10px] text-emerald-200 uppercase font-semibold">Min Guests</p>
              </div>
              <div className="border-x border-white/10 px-2">
                <p className="text-xl sm:text-2xl font-black text-[#f5cca0]">{allFoods.length}</p>
                <p className="text-[10px] text-emerald-200 uppercase font-semibold">Dishes</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-[#f5cca0]">100%</p>
                <p className="text-[10px] text-emerald-200 uppercase font-semibold">Fresh Batches</p>
              </div>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* LEFT COLUMN: Event Details & Customer Info (7 cols) */}
          <div className="space-y-6 lg:col-span-7">
            {/* 1. Contact Information */}
            <div className="rounded-3xl border border-[#e5e2d6] bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-[#a85b00]">
                  <UserRound className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-[#1a3c36]">1. Contact & Organizer Details</h3>
                  <p className="text-xs text-slate-500">Who should we contact for order verification?</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Organizer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customer_name"
                    value={form.customer_name}
                    onChange={handleInputChange}
                    placeholder="Full Name"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold text-slate-800 transition focus:border-[#1a3c36] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="customer_phone"
                    value={form.customer_phone}
                    onChange={handleInputChange}
                    placeholder="10-digit mobile number"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold text-slate-800 transition focus:border-[#1a3c36] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    name="customer_email"
                    value={form.customer_email}
                    onChange={handleInputChange}
                    placeholder="For booking confirmation & digital invoice"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold text-slate-800 transition focus:border-[#1a3c36] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* 2. Event Specifications */}
            <div className="rounded-3xl border border-[#e5e2d6] bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#1a3c36]">
                  <PartyPopper className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-[#1a3c36]">2. Event Schedule & Guest Count</h3>
                  <p className="text-xs text-slate-500">Date, time, and crowd size for food preparation</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Occasion / Event Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="event_type"
                    value={form.event_type}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold text-slate-800 transition focus:border-[#1a3c36] focus:bg-white focus:outline-hidden"
                  >
                    {EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Expected Guests (Pax) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="guest_count"
                      value={form.guest_count}
                      onChange={handleInputChange}
                      min="5"
                      max="2000"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-black text-slate-800 transition focus:border-[#1a3c36] focus:bg-white focus:outline-hidden"
                    />
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                      People
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Event Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="event_date"
                    min={minimumEventDate}
                    value={form.event_date}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold text-slate-800 transition focus:border-[#1a3c36] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Serving / Delivery Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    name="event_time"
                    value={form.event_time}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold text-slate-800 transition focus:border-[#1a3c36] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Dietary Preference
                  </label>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {DIETARY_OPTIONS.map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer flex-col rounded-xl border p-3 transition ${
                          form.dietary_preference === opt.id
                            ? "border-[#1a3c36] bg-[#1a3c36]/5 text-[#1a3c36] font-bold"
                            : "border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span className="flex items-center gap-2 text-xs font-bold">
                          <input
                            type="radio"
                            name="dietary_preference"
                            value={opt.id}
                            checked={form.dietary_preference === opt.id}
                            onChange={handleInputChange}
                            className="accent-[#1a3c36]"
                          />
                          {opt.label}
                        </span>
                        <span className="mt-1 text-[11px] text-slate-500 font-normal">
                          {opt.desc}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Venue Delivery Address <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    name="venue_address"
                    value={form.venue_address}
                    onChange={handleInputChange}
                    placeholder="Enter complete venue address, hall/building name, street, locality, landmark"
                    rows="3"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-800 transition focus:border-[#1a3c36] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Special Preparation / Serving Notes (Optional)
                  </label>
                  <textarea
                    name="special_requests"
                    value={form.special_requests}
                    onChange={handleInputChange}
                    placeholder="e.g. Mild spicy for kids, provide hot buffet chafing pans, separate veg packing..."
                    rows="2"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-medium text-slate-800 transition focus:border-[#1a3c36] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* 3. Interactive Food Menu Selector */}
            <div className="rounded-3xl border border-[#e5e2d6] bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-[#b07838]">
                    <UtensilsCrossed className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-[#1a3c36]">3. Choose Your Bulk Menu</h3>
                    <p className="text-xs text-slate-500">
                      All foods created by admin are displayed below. Add portions for your event.
                    </p>
                  </div>
                </div>

                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setSelectedFoodType("all")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      selectedFoodType === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFoodType("Veg")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      selectedFoodType === "Veg" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFoodType("Non-Veg")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      selectedFoodType === "Non-Veg" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Non-Veg
                  </button>
                </div>
              </div>

              {/* Search & Category Filter */}
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder="Search dishes (Biryani, Paneer, Curry, Desserts...)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:border-[#1a3c36] focus:bg-white focus:outline-hidden"
                  />
                  {menuSearch && (
                    <button
                      type="button"
                      onClick={() => setMenuSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Categories Pills */}
                {categories.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("all")}
                      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        selectedCategory === "all"
                          ? "bg-[#1a3c36] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      All Categories
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id || cat.category_id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.category_name || cat.name)}
                        className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          selectedCategory === (cat.category_name || cat.name)
                            ? "bg-[#1a3c36] text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {cat.category_name || cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Food List Grid */}
              <div className="mt-4 max-h-[560px] overflow-y-auto pr-1">
                {loadingFoods ? (
                  <div className="py-12 text-center text-sm font-semibold text-slate-500">
                    Loading full catering menu...
                  </div>
                ) : filteredFoods.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500">
                    No dishes found matching your selection.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {filteredFoods.map((food) => {
                      const foodId = String(food.food_id || food.id);
                      const currentSelection = selectedItems[foodId];
                      const currentQty = currentSelection?.quantity || 0;
                      const price = Number(food.final_price || food.mrp || 0);
                      const img = Array.isArray(food.food_images) ? food.food_images[0] : food.image || "";

                      return (
                        <div
                          key={foodId}
                          className={`flex flex-col justify-between rounded-2xl border p-3 transition ${
                            currentQty > 0
                              ? "border-[#1a3c36] bg-[#1a3c36]/5 shadow-xs"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex gap-3">
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-100">
                              {img ? (
                                <img
                                  src={resolveImageUrl(img)}
                                  alt={food.food_name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-400">
                                  <Utensils className="h-6 w-6" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-block h-2 w-2 rounded-full ${
                                    String(food.food_type).toLowerCase() === "veg"
                                      ? "bg-emerald-600"
                                      : "bg-rose-600"
                                  }`}
                                />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                                  {food.category_name || "Dish"}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-slate-900 truncate" title={food.food_name}>
                                {food.food_name}
                              </h4>
                              <p className="mt-0.5 text-xs font-black text-[#1a3c36]">
                                ₹{price.toFixed(2)}{" "}
                                <span className="text-[10px] font-normal text-slate-500">
                                  / {food.portion_size || "Portion"}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Bulk Quantity Stepper */}
                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                            {currentQty === 0 ? (
                              <button
                                type="button"
                                onClick={() => updateItemQuantity(food, 10)}
                                className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[#1a3c36] bg-white text-xs font-bold text-[#1a3c36] transition hover:bg-[#1a3c36] hover:text-white"
                              >
                                <Plus className="h-3.5 w-3.5" /> Add to Event Menu
                              </button>
                            ) : (
                              <div className="flex w-full items-center justify-between gap-2">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => updateItemQuantity(food, currentQty - 5)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-slate-700 font-bold hover:bg-slate-300"
                                    title="Decrease by 5"
                                  >
                                    -5
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateItemQuantity(food, currentQty - 1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-slate-700 font-bold hover:bg-slate-300"
                                    title="Decrease by 1"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                </div>

                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={currentQty}
                                    onChange={(e) => updateItemQuantity(food, e.target.value)}
                                    className="h-7 w-14 rounded-md border border-[#1a3c36] text-center text-xs font-black text-[#1a3c36] focus:outline-hidden"
                                    min="1"
                                  />
                                  <span className="text-[10px] font-bold text-slate-500">Qty</span>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => updateItemQuantity(food, currentQty + 1)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1a3c36] text-white font-bold hover:bg-[#255248]"
                                    title="Increase by 1"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateItemQuantity(food, currentQty + 5)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1a3c36] text-white font-bold hover:bg-[#255248]"
                                    title="Increase by 5"
                                  >
                                    +5
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Order Summary & Confirmation Box (5 cols) */}
          <div className="lg:col-span-5 sticky top-24 space-y-6">
            <div className="rounded-3xl border border-[#d8d6c7] bg-white p-6 shadow-md sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="h-5 w-5 text-[#1a3c36]" />
                  <h3 className="text-lg font-bold text-[#1a3c36]">Catering Order Summary</h3>
                </div>
                <span className="rounded-full bg-[#f6eee2] px-3 py-1 text-xs font-black text-[#a85b00]">
                  {selectedItemsList.length} Items Selected
                </span>
              </div>

              {/* Event Quick Specs */}
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Occasion</span>
                  <p className="font-bold text-slate-800 truncate">{form.event_type}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Guest Count</span>
                  <p className="font-bold text-slate-800">{form.guest_count} Pax</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Date</span>
                  <p className="font-bold text-slate-800">{form.event_date}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Serving Time</span>
                  <p className="font-bold text-slate-800">{form.event_time}</p>
                </div>
              </div>

              {/* Selected Dishes List */}
              <div className="mt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Selected Dishes & Quantities
                </h4>

                {selectedItemsList.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                    <UtensilsCrossed className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600">No dishes chosen yet</p>
                    <p className="mt-1">Browse the menu on the left and add portions to calculate cost.</p>
                  </div>
                ) : (
                  <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
                    {selectedItemsList.map(({ food, quantity, unit_price }) => {
                      const foodId = String(food.food_id || food.id);
                      const itemSubtotal = unit_price * quantity;

                      return (
                        <div
                          key={foodId}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 truncate">{food.food_name}</p>
                            <p className="text-[11px] text-slate-500">
                              {quantity} × ₹{unit_price.toFixed(2)}
                            </p>
                          </div>
                          <span className="font-black text-[#1a3c36] whitespace-nowrap">
                            ₹{itemSubtotal.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItem(foodId)}
                            className="text-slate-400 hover:text-rose-600 transition"
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Price Calculation */}
              <div className="mt-6 border-t border-slate-200 pt-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Portions / Servings:</span>
                  <span className="font-bold">{totalPortions} Portions</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Food Menu Subtotal:</span>
                  <span className="font-bold">₹{estimatedSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Per-Guest Estimate (~{form.guest_count} Pax):</span>
                  <span className="font-bold">
                    ₹{form.guest_count > 0 ? (estimatedSubtotal / Number(form.guest_count)).toFixed(2) : "0.00"} / guest
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline text-base font-black text-[#1a3c36]">
                  <span>Estimated Total Amount:</span>
                  <span className="text-xl">
                    ₹{estimatedSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  * Final quote may include delivery/serving setup based on venue location.
                </p>
              </div>

              {/* No Payment Required Notice */}
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-emerald-900">No Upfront Payment Required</h5>
                    <p className="mt-0.5 text-slate-600 leading-relaxed">
                      Submit your requirements and selected dishes. Our admin team will review your quantities, apply <strong>special bulk discounts</strong> (per dish or overall), and send you an official quotation for your approval.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="mt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#1a3c36] text-base font-black text-white shadow-lg transition hover:bg-[#255248] disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Sending Quotation Request...
                    </span>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 text-[#d79d4a]" />
                      Request Bulk Order Quotation
                    </>
                  )}
                </button>
                <p className="mt-2 text-center text-[11px] text-slate-500">
                  You can review and accept or reject the estimated quote in your account before any order confirmation.
                </p>
              </div>
            </div>
          </div>
        </form>
      </PageContainer>
    </main>
  );
}
