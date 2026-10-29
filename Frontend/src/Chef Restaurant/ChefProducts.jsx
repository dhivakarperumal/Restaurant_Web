import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
  UtensilsCrossed,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { BACKEND_BASE_URL } from "../api";
import {
  getActiveMenu,
  getFoodAvailability,
  isWithinAvailableTime,
  MEAL_AVAILABLE_TIMES,
  MEAL_TYPES,
  useFoodAvailabilityClock,
} from "../CommonComponents/foodAvailability";

const formatPrice = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
}).format(Number(value || 0));

const getFoodImage = (food) => {
  let image = Array.isArray(food.food_images) ? food.food_images[0] : food.food_images || food.image || food.image_url;
  if (typeof image === "string" && image.trim().startsWith("[")) {
    try {
      const images = JSON.parse(image);
      image = Array.isArray(images) ? images[0] : image;
    } catch {
      // Use original image value if not valid JSON.
    }
  }
  if (typeof image !== "string" || !image.trim()) return "";
  const imageUrl = image.trim();
  if (/^(https?:|data:|blob:)/i.test(imageUrl)) return imageUrl;
  return `${BACKEND_BASE_URL}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
};

const formatClockTime = (date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const meridiem = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = String(minutes).padStart(2, "0");
  return `${displayHours}:${displayMinutes} ${meridiem}`;
};

const ChefProducts = () => {
  const [foods, setFoods] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingFoodId, setUpdatingFoodId] = useState("");
  const [updatingAvailabilityId, setUpdatingAvailabilityId] = useState("");
  const [showVisibilityPopup, setShowVisibilityPopup] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [popupSearch, setPopupSearch] = useState("");
  const [availabilityModalSearch, setAvailabilityModalSearch] = useState("");
  const [availabilityModalTab, setAvailabilityModalTab] = useState("all");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const currentTime = useFoodAvailabilityClock();
  const activeMenu = getActiveMenu(currentTime);

  const loadFoods = async () => {
    setLoading(true);
    try {
      const response = await api.get("/foods", { params: { include_unavailable: true } });
      setFoods(Array.isArray(response.data?.data) ? response.data.data : []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Foods could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFoods();
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const categories = [...new Set(foods.map((food) => String(food.category_name || "").trim()).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second));

  // ── Filter Foods ──
  const filteredFoods = foods.filter((food) => {
    if (categoryFilter !== "all" && food.category_name !== categoryFilter) return false;

    const availability = getFoodAvailability(food, currentTime);
    if (availabilityFilter === "available_now") {
      if (!availability.available) return false;
    } else if (availabilityFilter === "unavailable") {
      if (availability.available) return false;
    } else if (availabilityFilter === "kitchen_available") {
      if (food.is_available === false) return false;
    } else if (availabilityFilter === "kitchen_unavailable") {
      if (food.is_available !== false) return false;
    } else if (MEAL_TYPES.includes(availabilityFilter)) {
      const matchMeal = String(food.meal_type || "").trim().toLowerCase() === availabilityFilter.toLowerCase();
      const matchTime = String(food.available_time || "").toLowerCase().includes(availabilityFilter.toLowerCase());
      if (!matchMeal && !matchTime) return false;
    }

    if (normalizedSearch) {
      const match = [food.food_name, food.category_name, food.meal_type, food.available_time].some((value) => (
        String(value || "").toLowerCase().includes(normalizedSearch)
      ));
      if (!match) return false;
    }

    return true;
  });

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filteredFoods.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageOffset = (currentPage - 1) * pageSize;
  const paginatedFoods = filteredFoods.slice(pageOffset, pageOffset + pageSize);

  const normalizedPopupSearch = popupSearch.trim().toLowerCase();
  const popupFoods = foods.filter((food) => [food.food_name, food.category_name]
    .some((value) => String(value || "").toLowerCase().includes(normalizedPopupSearch)));
  const allFoodsVisible = foods.length > 0 && foods.every((food) => food.is_menu_visible !== false);

  // ── Checkbox Toggle Handler (Available time based) ──
  // If checking: ensures food is marked available, and if outside current time, sets available_time to current window
  // If unchecking: marks food unavailable
  const handleAvailabilityCheckboxToggle = async (food, shouldBeAvailable) => {
    if (updatingAvailabilityId === food.food_id || bulkUpdating) return;
    setUpdatingAvailabilityId(food.food_id);

    const currentSlotTime = activeMenu?.timeRange || "3:00 PM - 6:00 PM";
    const currentMeal = activeMenu?.mealType || "Evening Snacks";

    // When making available, if currently outside time range, also set available_time to active service
    const needsTimeUpdate = shouldBeAvailable && !isWithinAvailableTime(food.available_time, currentTime);
    const targetAvailableTime = needsTimeUpdate ? currentSlotTime : (food.available_time || currentSlotTime);
    const targetMealType = needsTimeUpdate ? currentMeal : (food.meal_type || currentMeal);

    // Optimistic state update
    setFoods((current) => current.map((item) => (
      item.food_id === food.food_id
        ? {
          ...item,
          is_available: shouldBeAvailable,
          available_time: targetAvailableTime,
          meal_type: targetMealType,
          stock_quantity: shouldBeAvailable && Number(item.stock_quantity || 0) <= 0 ? 50 : item.stock_quantity,
        }
        : item
    )));

    try {
      const payload = {
        is_available: shouldBeAvailable,
      };
      if (needsTimeUpdate) {
        payload.available_time = targetAvailableTime;
        payload.meal_type = targetMealType;
      }
      const response = await api.patch(`/foods/${encodeURIComponent(food.food_id)}/availability`, payload);
      if (response.data?.data) {
        setFoods((current) => current.map((item) => (
          item.food_id === food.food_id ? { ...item, ...response.data.data } : item
        )));
      }
      toast.success(
        shouldBeAvailable
          ? `"${food.food_name}" is now Available (${targetAvailableTime}).`
          : `"${food.food_name}" is marked Unavailable.`,
      );
    } catch (requestError) {
      await loadFoods();
      toast.error(requestError.response?.data?.message || "Could not update food availability.");
    } finally {
      setUpdatingAvailabilityId("");
    }
  };

  // ── Change Available Time Preset (e.g. 11:00 AM - 3:00 PM) ──
  const changeFoodAvailableTime = async (food, nextAvailableTime) => {
    if (!nextAvailableTime || food.available_time === nextAvailableTime) return;
    setUpdatingAvailabilityId(food.food_id);

    // Infer meal_type from the available time string
    let inferredMeal = food.meal_type || "Evening Snacks";
    for (const [meal, timeStr] of Object.entries(MEAL_AVAILABLE_TIMES)) {
      if (timeStr === nextAvailableTime) {
        inferredMeal = meal;
        break;
      }
    }

    // Optimistic update
    setFoods((current) => current.map((item) => (
      item.food_id === food.food_id
        ? { ...item, available_time: nextAvailableTime, meal_type: inferredMeal, is_available: true }
        : item
    )));

    try {
      const response = await api.patch(`/foods/${encodeURIComponent(food.food_id)}/availability`, {
        available_time: nextAvailableTime,
        meal_type: inferredMeal,
        is_available: true,
      });
      if (response.data?.data) {
        setFoods((current) => current.map((item) => (
          item.food_id === food.food_id ? { ...item, ...response.data.data } : item
        )));
      }
      toast.success(`"${food.food_name}" Available Time set to ${nextAvailableTime}.`);
    } catch (requestError) {
      await loadFoods();
      toast.error(requestError.response?.data?.message || "Could not change available time.");
    } finally {
      setUpdatingAvailabilityId("");
    }
  };

  // ── Toggle All Filtered Dishes Available Now ──
  const toggleAllFilteredAvailableNow = async (targetState) => {
    const currentSlotTime = activeMenu?.timeRange || "3:00 PM - 6:00 PM";
    const currentMeal = activeMenu?.mealType || "Evening Snacks";

    setBulkUpdating(true);
    setFoods((current) => current.map((food) => {
      const isTarget = filteredFoods.some((f) => f.food_id === food.food_id);
      if (!isTarget) return food;
      return {
        ...food,
        is_available: targetState,
        available_time: targetState ? currentSlotTime : food.available_time,
        meal_type: targetState ? currentMeal : food.meal_type,
        stock_quantity: targetState && Number(food.stock_quantity || 0) <= 0 ? 50 : food.stock_quantity,
      };
    }));

    try {
      await Promise.all(filteredFoods.map((food) => api.patch(
        `/foods/${encodeURIComponent(food.food_id)}/availability`,
        targetState
          ? { is_available: true, available_time: currentSlotTime, meal_type: currentMeal }
          : { is_available: false },
      )));
      toast.success(
        targetState
          ? `All ${filteredFoods.length} dishes marked Available Now for ${currentSlotTime}!`
          : `All ${filteredFoods.length} dishes marked Unavailable.`,
      );
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Bulk availability update failed.");
      await loadFoods();
    } finally {
      setBulkUpdating(false);
    }
  };

  // ── Menu Visibility Toggles (Customer & Billing Shown / Hidden) ──
  const toggleMenuVisibility = async (food) => {
    if (bulkUpdating) return;
    const nextVisibility = food.is_menu_visible === false;
    setUpdatingFoodId(food.food_id);
    setFoods((current) => current.map((item) => (
      item.food_id === food.food_id ? { ...item, is_menu_visible: nextVisibility } : item
    )));
    try {
      await api.patch(`/foods/${encodeURIComponent(food.food_id)}/visibility`, {
        is_menu_visible: nextVisibility,
      });
      toast.success(nextVisibility ? "Food is visible to customers and billing." : "Food is hidden from customers and billing.");
    } catch (requestError) {
      setFoods((current) => current.map((item) => (
        item.food_id === food.food_id ? { ...item, is_menu_visible: !nextVisibility } : item
      )));
      toast.error(requestError.response?.data?.message || "Food visibility could not be updated.");
    } finally {
      setUpdatingFoodId("");
    }
  };

  const toggleAllMenuVisibility = async () => {
    const nextVisibility = !allFoodsVisible;
    const changedFoods = foods.filter((food) => (food.is_menu_visible !== false) !== nextVisibility);
    if (!changedFoods.length) return;

    setBulkUpdating(true);
    setFoods((current) => current.map((food) => ({ ...food, is_menu_visible: nextVisibility })));
    try {
      await Promise.all(changedFoods.map((food) => api.patch(
        `/foods/${encodeURIComponent(food.food_id)}/visibility`,
        { is_menu_visible: nextVisibility },
      )));
      toast.success(nextVisibility ? "All foods are visible to customers and billing." : "All foods are hidden from customers and billing.");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Food visibility could not be updated.");
      await loadFoods();
    } finally {
      setBulkUpdating(false);
    }
  };

  // ── Stats Calculations ──
  const activeNowCount = useMemo(
    () => foods.filter((f) => getFoodAvailability(f, currentTime).available).length,
    [foods, currentTime],
  );
  const outsideTimeCount = useMemo(
    () => foods.filter((f) => !getFoodAvailability(f, currentTime).scheduledAvailable).length,
    [foods, currentTime],
  );
  const kitchenAvailableCount = useMemo(() => foods.filter((f) => f.is_available !== false).length, [foods]);
  const visibleCount = useMemo(() => foods.filter((f) => f.is_menu_visible !== false).length, [foods]);

  const statCards = [
    { title: "Total Dishes", value: foods.length, hint: "All menu items", icon: UtensilsCrossed, accent: "#f97316", iconBg: "bg-orange-500" },
    { title: "Available Now", value: activeNowCount, hint: `In current service window`, icon: CheckCircle2, accent: "#10b981", iconBg: "bg-emerald-500" },
    { title: "Outside Time", value: outsideTimeCount, hint: "Outside available time", icon: Clock, accent: "#f59e0b", iconBg: "bg-amber-500" },
    { title: "Kitchen Ready", value: kitchenAvailableCount, hint: "Marked available", icon: Check, accent: "#0284c7", iconBg: "bg-sky-600" },
  ];

  // ── Modal Filter ──
  const normalizedModalSearch = availabilityModalSearch.trim().toLowerCase();
  const modalFoods = foods.filter((food) => {
    const avail = getFoodAvailability(food, currentTime);
    if (availabilityModalTab === "available_now") {
      if (!avail.available) return false;
    } else if (availabilityModalTab === "unavailable") {
      if (avail.available) return false;
    } else if (availabilityModalTab === "outside_time") {
      if (avail.scheduledAvailable) return false;
    }
    if (normalizedModalSearch) {
      return [food.food_name, food.category_name, food.available_time, food.meal_type].some((v) => (
        String(v || "").toLowerCase().includes(normalizedModalSearch)
      ));
    }
    return true;
  });

  return (
    <main className="space-y-5">
      {/* ── Page Header ── */}
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Chef workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Food Menu & Available Time</h1>
          <p className="mt-1 text-sm text-slate-600">
            Available-time based food availability. Items inside their service window are marked Available to customers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-sm font-medium text-slate-600">{foods.length} {foods.length === 1 ? "food" : "foods"}</span>
          <button
            type="button"
            onClick={() => setShowAvailabilityModal(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-emerald-800 bg-emerald-800 px-3.5 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-900 active:scale-[0.98]"
          >
            <SlidersHorizontal size={16} />
            Manage Available Time
          </button>
          <button
            type="button"
            onClick={() => setShowVisibilityPopup(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-[0.98]"
          >
            <Eye size={16} />
            Menu Visibility ({visibleCount})
          </button>
        </div>
      </header>

      {/* ── Live Available Time Window Banner ── */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 px-4 py-3.5 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3.5 w-3.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-600" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">Current Clock:</span>
              <span className="rounded-md bg-white border border-emerald-200 px-2 py-0.5 text-xs font-mono font-bold text-emerald-900 shadow-2xs">
                {formatClockTime(currentTime)}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 ml-1">Live Service:</span>
              <span className="rounded-lg bg-emerald-700 px-2.5 py-0.5 text-xs font-black tracking-wide text-white shadow-xs">
                {activeMenu?.heading || activeMenu?.mealType} ({activeMenu?.timeRange})
              </span>
            </div>
            <p className="mt-1 text-xs text-emerald-800">
              The check box shows <strong>Available (checked)</strong> when current clock is within the food&apos;s Available Time and kitchen is enabled.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggleAllFilteredAvailableNow(true)}
            disabled={bulkUpdating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-xs transition hover:bg-emerald-100 active:scale-95 disabled:opacity-50"
            title={`Set filtered dishes to ${activeMenu?.timeRange} and check Available`}
          >
            <Sparkles size={14} className="text-emerald-600" />
            Make Filtered Available Now
          </button>
        </div>
      </section>

      {/* ── Stats Overview ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <article
              key={stat.title}
              className="relative flex min-h-[165px] min-w-0 flex-col justify-between overflow-hidden rounded-[20px] border border-slate-200/90 bg-white p-5 shadow-[0_4px_16px_-5px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_-7px_rgba(15,23,42,0.12)] sm:p-6"
              style={{ background: `linear-gradient(135deg, #ffffff 48%, ${stat.accent}12 100%)` }}
            >
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 pt-1">
                  <h3 className="truncate text-[12px] font-bold uppercase tracking-[0.08em] text-slate-500">{stat.title}</h3>
                  <div className="mt-4 truncate text-[30px] font-black leading-none tracking-tight text-slate-900">
                    {loading ? "..." : stat.value}
                  </div>
                </div>
                <span className={`flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-[18px] text-white shadow-[0_5px_12px_-4px_rgba(15,23,42,0.25)] ${stat.iconBg}`}>
                  <Icon size={25} strokeWidth={2.4} />
                </span>
              </div>
              <div className="relative z-10 mt-4 flex items-center gap-2 border-t border-slate-100/90 pt-3 text-xs">
                <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                  Live
                </span>
                <span className="truncate font-medium text-slate-500">{stat.hint}</span>
                <span className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: stat.accent }} />
              </div>
              <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: stat.accent }} />
            </article>
          );
        })}
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs md:max-w-sm">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search dish, category, or available time..."
            aria-label="Search foods"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-emerald-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Availability Filter */}
          <select
            value={availabilityFilter}
            onChange={(event) => { setAvailabilityFilter(event.target.value); setPage(1); }}
            aria-label="Filter foods by availability"
            className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-700"
          >
            <option value="all">All Foods ({foods.length})</option>
            <option value="available_now">★ Available Now (Checked)</option>
            <option value="unavailable">Unavailable (Unchecked)</option>
            <option value="kitchen_available">Kitchen Enabled</option>
            <option value="kitchen_unavailable">Marked Out of Stock</option>
            <option disabled>── Filter by Time / Meal ──</option>
            <option value="Breakfast">Breakfast (6:00 AM - 11:00 AM)</option>
            <option value="Lunch">Lunch (11:00 AM - 3:00 PM)</option>
            <option value="Evening Snacks">Evening Snacks (3:00 PM - 6:00 PM)</option>
            <option value="Dinner">Dinner (6:00 PM - 11:00 PM)</option>
            <option value="All Day">All Day</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(event) => { setCategoryFilter(event.target.value); setPage(1); }}
            aria-label="Filter foods by category"
            className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-700"
          >
            <option value="all">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>

          {/* View Mode Toggle */}
          <div role="group" aria-label="Food display mode" className="flex h-10 shrink-0 items-center rounded-lg border border-slate-300 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-label="Table view"
              aria-pressed={viewMode === "table"}
              title="Table view"
              className={`grid h-8 w-9 place-items-center rounded-md transition ${viewMode === "table" ? "bg-emerald-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <List size={17} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("card")}
              aria-label="Card view"
              aria-pressed={viewMode === "card"}
              title="Card view"
              className={`grid h-8 w-9 place-items-center rounded-md transition ${viewMode === "card" ? "bg-emerald-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <LayoutGrid size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Table View ── */}
      {viewMode === "table" ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-orange-100 bg-orange-50 text-xs font-bold uppercase tracking-wide text-orange-700">
                <tr>
                  <th className="w-12 px-4 py-3" aria-label="Menu visibility">
                    <input
                      type="checkbox"
                      checked={allFoodsVisible}
                      disabled={loading || bulkUpdating || !foods.length}
                      onChange={toggleAllMenuVisibility}
                      aria-label="Show all foods to customers and billing"
                      title="Toggle customer visibility for all dishes"
                      className="h-4 w-4 accent-emerald-700 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3">S No</th>
                  <th className="px-4 py-3">Food</th>
                  {/* ── Availability Column with Checkbox Header ── */}
                  <th className="min-w-[230px] px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span>Available Time & Status</span>
                    </div>
                  </th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Preparation</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Customer & Billing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="9" className="px-4 py-10 text-center text-slate-500">Loading foods...</td></tr>
                ) : error ? (
                  <tr><td colSpan="9" className="px-4 py-10 text-center text-rose-700">
                    <p role="alert">{error}</p>
                    <button type="button" onClick={loadFoods} className="mt-2 font-semibold underline">Try again</button>
                  </td></tr>
                ) : filteredFoods.length ? paginatedFoods.map((food, index) => {
                  const availability = getFoodAvailability(food, currentTime);
                  const isCurrentlyAvailable = availability.available;
                  const isWithinHours = availability.scheduledAvailable;
                  const isKitchenEnabled = food.is_available !== false;
                  const isUpdating = updatingAvailabilityId === food.food_id;

                  return (
                    <tr key={food.food_id} className="transition-colors hover:bg-slate-50/70">
                      {/* Menu Visibility Toggle */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={food.is_menu_visible !== false}
                          disabled={bulkUpdating || updatingFoodId === food.food_id}
                          onChange={() => toggleMenuVisibility(food)}
                          aria-label={`Show ${food.food_name} to customers and billing`}
                          title={food.is_menu_visible === false ? "Hidden from customers. Click to show." : "Visible to customers. Click to hide."}
                          className="h-4 w-4 accent-emerald-700 cursor-pointer"
                        />
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{pageOffset + index + 1}</td>

                      {/* Food Name & Image */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-emerald-50 text-emerald-700">
                            <UtensilsCrossed size={18} className="absolute inset-0 m-auto" />
                            {getFoodImage(food) && (
                              <img
                                src={getFoodImage(food)}
                                alt=""
                                loading="lazy"
                                className="relative h-full w-full object-cover"
                                onError={(event) => { event.currentTarget.style.display = "none"; }}
                              />
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800">{food.food_name || "Unnamed food"}</span>
                            <span className="block text-xs text-slate-400">{food.food_id}</span>
                          </div>
                        </div>
                      </td>

                      {/* ── Available-Time-Based Checkbox & Control Cell ── */}
                      <td className="px-4 py-3">
                        <div className="flex min-w-[220px] flex-col gap-1.5">
                          {/* Main Availability Checkbox */}
                          <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isCurrentlyAvailable}
                              disabled={isUpdating}
                              onChange={() => handleAvailabilityCheckboxToggle(food, !isCurrentlyAvailable)}
                              className="h-5 w-5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 cursor-pointer accent-emerald-700 transition"
                              aria-label={`${food.food_name}: ${isCurrentlyAvailable ? "Available" : "Unavailable"}`}
                            />
                            <span className={`text-xs font-bold ${isCurrentlyAvailable ? "text-emerald-700" : "text-slate-500"}`}>
                              {isCurrentlyAvailable ? "Available" : "Unavailable"}
                            </span>
                            {isUpdating && <Loader2 size={13} className="animate-spin text-emerald-700" />}
                          </label>

                          {/* Available Time Badge & Preset Selector */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                isCurrentlyAvailable
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isWithinHours && !isKitchenEnabled
                                    ? "border border-rose-200 bg-rose-50 text-rose-700"
                                    : "border border-amber-200 bg-amber-50 text-amber-800"
                              }`}
                              title={`Available time: ${food.available_time || "Not set"}`}
                            >
                              <Clock size={11} className="shrink-0" />
                              <span className="truncate max-w-[130px]">{food.available_time || food.meal_type || "No time"}</span>
                              {isCurrentlyAvailable && <span className="font-bold">· Now</span>}
                              {!isWithinHours && <span className="text-[10px] opacity-80">(Outside time)</span>}
                            </span>

                            {/* Dropdown to change Available Time preset */}
                            <select
                              value={food.available_time || MEAL_AVAILABLE_TIMES[food.meal_type] || "3:00 PM - 6:00 PM"}
                              disabled={isUpdating}
                              onChange={(event) => changeFoodAvailableTime(food, event.target.value)}
                              className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-700 outline-none hover:border-slate-300 focus:border-emerald-600"
                              title="Change Available Time slot"
                            >
                              <option value="6:00 AM - 11:00 AM">6:00 AM - 11:00 AM (Breakfast)</option>
                              <option value="11:00 AM - 3:00 PM">11:00 AM - 3:00 PM (Lunch)</option>
                              <option value="3:00 PM - 6:00 PM">3:00 PM - 6:00 PM (Evening Snacks)</option>
                              <option value="6:00 PM - 11:00 PM">6:00 PM - 11:00 PM (Dinner)</option>
                              <option value="All Day">All Day (Anytime)</option>
                            </select>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-600">{food.category_name || "Uncategorized"}</td>
                      <td className="px-4 py-3 text-slate-600">{food.preparation_time ? `${food.preparation_time} min` : "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">{formatPrice(food.final_price)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${food.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                          {food.status || "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${food.is_menu_visible === false ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-800"}`}>
                          {food.is_menu_visible === false ? "Hidden" : "Shown"}
                        </span>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="9" className="px-4 py-10 text-center text-slate-500">{foods.length ? "No foods match this filter." : "No foods have been added yet."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Card View ── */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="col-span-full rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500">Loading foods...</div>
          ) : error ? (
            <div className="col-span-full rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-rose-700">
              <p role="alert">{error}</p>
              <button type="button" onClick={loadFoods} className="mt-2 font-semibold underline">Try again</button>
            </div>
          ) : filteredFoods.length ? paginatedFoods.map((food, index) => {
            const availability = getFoodAvailability(food, currentTime);
            const isCurrentlyAvailable = availability.available;
            const isWithinHours = availability.scheduledAvailable;
            const isKitchenEnabled = food.is_available !== false;
            const isUpdating = updatingAvailabilityId === food.food_id;

            return (
              <article key={food.food_id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                <div className="relative mb-3 h-40 overflow-hidden rounded-xl bg-emerald-50 text-emerald-700">
                  <UtensilsCrossed size={30} className="absolute inset-0 m-auto" />
                  {getFoodImage(food) && (
                    <img
                      src={getFoodImage(food)}
                      alt={food.food_name || "Food"}
                      loading="lazy"
                      className="relative h-full w-full object-cover"
                      onError={(event) => { event.currentTarget.style.display = "none"; }}
                    />
                  )}
                  <span className="absolute right-2 top-2 rounded-md bg-slate-900/70 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-xs">
                    #{pageOffset + index + 1}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <h2 className="truncate font-bold text-slate-900">{food.food_name || "Unnamed food"}</h2>
                  <span className="font-bold text-emerald-800">{formatPrice(food.final_price)}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{food.category_name || "Uncategorized"} · {food.preparation_time ? `${food.preparation_time} min prep` : ""}</p>

                {/* ── Available-Time-Based Card Checkbox Section ── */}
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isCurrentlyAvailable}
                        disabled={isUpdating}
                        onChange={() => handleAvailabilityCheckboxToggle(food, !isCurrentlyAvailable)}
                        className="h-5 w-5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 cursor-pointer accent-emerald-700"
                      />
                      <span className={`text-xs font-bold ${isCurrentlyAvailable ? "text-emerald-700" : "text-slate-500"}`}>
                        {isCurrentlyAvailable ? "Available Now" : "Unavailable"}
                      </span>
                    </label>
                    {isUpdating && <Loader2 size={13} className="animate-spin text-emerald-700" />}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-200/60 pt-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isCurrentlyAvailable
                          ? "bg-emerald-100 text-emerald-800"
                          : isWithinHours && !isKitchenEnabled
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      <Clock size={10} />
                      {food.available_time || food.meal_type || "No time"}
                    </span>

                    <select
                      value={food.available_time || MEAL_AVAILABLE_TIMES[food.meal_type] || "3:00 PM - 6:00 PM"}
                      disabled={isUpdating}
                      onChange={(event) => changeFoodAvailableTime(food, event.target.value)}
                      className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-700 outline-none hover:border-slate-300"
                      title="Change Available Time slot"
                    >
                      <option value="6:00 AM - 11:00 AM">6:00 AM - 11:00 AM</option>
                      <option value="11:00 AM - 3:00 PM">11:00 AM - 3:00 PM</option>
                      <option value="3:00 PM - 6:00 PM">3:00 PM - 6:00 PM</option>
                      <option value="6:00 PM - 11:00 PM">6:00 PM - 11:00 PM</option>
                      <option value="All Day">All Day</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                  <span>Status: <strong className={food.status === "Active" ? "text-emerald-700" : "text-slate-700"}>{food.status || "Active"}</strong></span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={food.is_menu_visible !== false}
                      disabled={bulkUpdating || updatingFoodId === food.food_id}
                      onChange={() => toggleMenuVisibility(food)}
                      className="h-3.5 w-3.5 accent-emerald-700"
                    />
                    <span>Visible to Menu</span>
                  </label>
                </div>
              </article>
            );
          }) : (
            <div className="col-span-full rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500">
              {foods.length ? "No foods match this filter." : "No foods have been added yet."}
            </div>
          )}
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && !error && filteredFoods.length > 0 && (
        <nav aria-label="Food pages" className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Showing {pageOffset + 1}-{Math.min(pageOffset + pageSize, filteredFoods.length)} of {filteredFoods.length} foods
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="min-w-20 text-center text-sm font-medium text-slate-700">
              {currentPage} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pageCount, currentPage + 1))}
              disabled={currentPage === pageCount}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </nav>
      )}

      {/* ── Manage Available Time Modal ── */}
      {showAvailabilityModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !bulkUpdating) setShowAvailabilityModal(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="food-availability-title"
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 id="food-availability-title" className="text-lg font-bold text-slate-900">Manage Food Available Time</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Current Clock: <span className="font-bold text-emerald-800">{formatClockTime(currentTime)}</span> · Active Service: <span className="font-bold text-emerald-800">{activeMenu?.heading} ({activeMenu?.timeRange})</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAvailabilityModal(false)}
                disabled={bulkUpdating}
                aria-label="Close availability dialog"
                className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </header>

            {/* Quick Bulk Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-3">
              <span className="text-xs font-semibold text-slate-600">Quick Actions:</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={bulkUpdating}
                  onClick={() => toggleAllFilteredAvailableNow(true)}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800 disabled:opacity-50"
                >
                  Make Filtered Available Now ({activeMenu?.timeRange})
                </button>
                <button
                  type="button"
                  disabled={bulkUpdating}
                  onClick={() => toggleAllFilteredAvailableNow(false)}
                  className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 shadow-xs transition hover:bg-rose-50 disabled:opacity-50"
                >
                  Mark Filtered Unavailable
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="space-y-3 border-b border-slate-200 px-5 py-3">
              <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-2 text-xs font-bold">
                {[
                  { id: "all", label: `All (${foods.length})` },
                  { id: "available_now", label: `Available Now (${activeNowCount})` },
                  { id: "outside_time", label: `Outside Time (${outsideTimeCount})` },
                  { id: "unavailable", label: `Unavailable (${foods.length - activeNowCount})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAvailabilityModalTab(tab.id)}
                    className={`rounded-lg px-3 py-1.5 transition ${
                      availabilityModalTab === tab.id
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={availabilityModalSearch}
                  onChange={(event) => setAvailabilityModalSearch(event.target.value)}
                  placeholder="Search food by name, category, or time range..."
                  className="min-h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-emerald-700"
                />
              </div>
            </div>

            {/* Dishes List */}
            <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto px-5 py-2">
              {modalFoods.length ? modalFoods.map((food) => {
                const availability = getFoodAvailability(food, currentTime);
                const isCurrentlyAvailable = availability.available;
                const isUpdating = updatingAvailabilityId === food.food_id;

                return (
                  <div key={food.food_id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-emerald-50 text-emerald-700">
                        <UtensilsCrossed size={16} className="absolute inset-0 m-auto" />
                        {getFoodImage(food) && (
                          <img
                            src={getFoodImage(food)}
                            alt=""
                            className="relative h-full w-full object-cover"
                            onError={(event) => { event.currentTarget.style.display = "none"; }}
                          />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{food.food_name || "Unnamed food"}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{food.category_name || "Uncategorized"}</span>
                          <span>·</span>
                          <span>{formatPrice(food.final_price)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                      {/* Checkbox for Available / Unavailable */}
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isCurrentlyAvailable}
                          disabled={isUpdating}
                          onChange={() => handleAvailabilityCheckboxToggle(food, !isCurrentlyAvailable)}
                          className="h-5 w-5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 cursor-pointer accent-emerald-700"
                        />
                        <span className={`text-xs font-bold ${isCurrentlyAvailable ? "text-emerald-700" : "text-slate-500"}`}>
                          {isCurrentlyAvailable ? "Available Now" : "Unavailable"}
                        </span>
                      </label>

                      {/* Available Time Preset Dropdown */}
                      <select
                        value={food.available_time || MEAL_AVAILABLE_TIMES[food.meal_type] || "3:00 PM - 6:00 PM"}
                        disabled={isUpdating}
                        onChange={(e) => changeFoodAvailableTime(food, e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none"
                      >
                        <option value="6:00 AM - 11:00 AM">6:00 AM - 11:00 AM</option>
                        <option value="11:00 AM - 3:00 PM">11:00 AM - 3:00 PM</option>
                        <option value="3:00 PM - 6:00 PM">3:00 PM - 6:00 PM</option>
                        <option value="6:00 PM - 11:00 PM">6:00 PM - 11:00 PM</option>
                        <option value="All Day">All Day</option>
                      </select>
                    </div>
                  </div>
                );
              }) : (
                <p className="px-3 py-10 text-center text-sm text-slate-500">
                  {foods.length ? "No foods match this filter." : "No foods found."}
                </p>
              )}
            </div>

            <footer className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setShowAvailabilityModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-100"
              >
                Close
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* ── Manage Menu Visibility Modal ── */}
      {showVisibilityPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !bulkUpdating) setShowVisibilityPopup(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="food-visibility-title"
            className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
              <div>
                <h2 id="food-visibility-title" className="font-bold text-slate-900">Manage Menu Visibility</h2>
                <p className="mt-1 text-xs text-slate-500">Choose which foods appear to customers and billing.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowVisibilityPopup(false)}
                disabled={bulkUpdating}
                aria-label="Close food visibility popup"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </header>

            <div className="space-y-3 border-b border-slate-200 p-4">
              <label className="relative block">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={popupSearch}
                  onChange={(event) => setPopupSearch(event.target.value)}
                  placeholder="Search foods or categories"
                  aria-label="Search foods in visibility manager"
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-emerald-700"
                />
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
                <input
                  type="checkbox"
                  checked={allFoodsVisible}
                  disabled={loading || bulkUpdating || !foods.length}
                  onChange={toggleAllMenuVisibility}
                  className="h-5 w-5 accent-emerald-700"
                />
                <span className="flex-1">Show all foods</span>
                {bulkUpdating && <span className="text-xs font-medium text-emerald-700">Updating...</span>}
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {popupFoods.length ? popupFoods.map((food) => (
                <label key={food.food_id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={food.is_menu_visible !== false}
                    disabled={bulkUpdating || updatingFoodId === food.food_id}
                    onChange={() => toggleMenuVisibility(food)}
                    className="h-5 w-5 shrink-0 accent-emerald-700"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{food.food_name || "Unnamed food"}</span>
                  <span className="shrink-0 text-xs text-slate-500">{food.category_name || "Uncategorized"}</span>
                  {updatingFoodId === food.food_id && <span className="text-xs text-slate-500">Saving...</span>}
                </label>
              )) : (
                <p className="px-3 py-10 text-center text-sm text-slate-500">{foods.length ? "No foods match this search." : "No foods available."}</p>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
};

export default ChefProducts;
