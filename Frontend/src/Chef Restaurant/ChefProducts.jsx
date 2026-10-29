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

  const filteredFoods = foods.filter((food) => {
    if (categoryFilter !== "all" && food.category_name !== categoryFilter) return false;

    if (availabilityFilter === "available_now") {
      if (!getFoodAvailability(food, currentTime).available) return false;
    } else if (availabilityFilter === "kitchen_available") {
      if (food.is_available === false) return false;
    } else if (availabilityFilter === "kitchen_unavailable") {
      if (food.is_available !== false) return false;
    } else if (MEAL_TYPES.includes(availabilityFilter)) {
      if (String(food.meal_type || "").trim().toLowerCase() !== availabilityFilter.toLowerCase()) return false;
    }

    if (normalizedSearch) {
      const match = [food.food_name, food.category_name, food.meal_type].some((value) => (
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
  const allFoodsAvailable = foods.length > 0 && foods.every((food) => food.is_available !== false);

  // ── Toggle Single Food Availability (Available / Unavailable) ──
  const toggleFoodAvailability = async (food, explicitTarget) => {
    if (updatingAvailabilityId === food.food_id || bulkUpdating) return;
    const nextAvailability = typeof explicitTarget === "boolean" ? explicitTarget : food.is_available === false;
    setUpdatingAvailabilityId(food.food_id);

    // Optimistic update
    setFoods((current) => current.map((item) => (
      item.food_id === food.food_id
        ? {
          ...item,
          is_available: nextAvailability,
          stock_quantity: nextAvailability && Number(item.stock_quantity || 0) <= 0 ? 50 : item.stock_quantity,
        }
        : item
    )));

    try {
      const response = await api.patch(`/foods/${encodeURIComponent(food.food_id)}/availability`, {
        is_available: nextAvailability,
      });
      if (response.data?.data) {
        setFoods((current) => current.map((item) => (
          item.food_id === food.food_id ? { ...item, ...response.data.data } : item
        )));
      }
      toast.success(
        nextAvailability
          ? `"${food.food_name}" is now Available in the kitchen.`
          : `"${food.food_name}" is marked Unavailable / Out of Stock.`,
      );
    } catch (requestError) {
      // Rollback
      setFoods((current) => current.map((item) => (
        item.food_id === food.food_id ? { ...item, is_available: !nextAvailability } : item
      )));
      toast.error(requestError.response?.data?.message || "Food availability could not be updated.");
    } finally {
      setUpdatingAvailabilityId("");
    }
  };

  // ── Change Food Meal Slot (Breakfast / Lunch / Evening Snacks / Dinner) ──
  const changeFoodMealType = async (food, nextMealType) => {
    if (!MEAL_TYPES.includes(nextMealType) || food.meal_type === nextMealType) return;
    setUpdatingAvailabilityId(food.food_id);

    // Optimistic update
    setFoods((current) => current.map((item) => (
      item.food_id === food.food_id
        ? { ...item, meal_type: nextMealType, is_available: true }
        : item
    )));

    try {
      const response = await api.patch(`/foods/${encodeURIComponent(food.food_id)}/availability`, {
        meal_type: nextMealType,
        is_available: true,
      });
      if (response.data?.data) {
        setFoods((current) => current.map((item) => (
          item.food_id === food.food_id ? { ...item, ...response.data.data } : item
        )));
      }
      toast.success(`"${food.food_name}" assigned to ${nextMealType} menu.`);
    } catch (requestError) {
      await loadFoods();
      toast.error(requestError.response?.data?.message || "Could not change meal type.");
    } finally {
      setUpdatingAvailabilityId("");
    }
  };

  // ── Make Food Available Right Now in Current Active Window ──
  const makeAvailableNow = async (food) => {
    const currentMeal = activeMenu?.mealType || "Evening Snacks";
    setUpdatingAvailabilityId(food.food_id);

    setFoods((current) => current.map((item) => (
      item.food_id === food.food_id
        ? {
          ...item,
          is_available: true,
          meal_type: currentMeal,
          stock_quantity: Number(item.stock_quantity || 0) <= 0 ? 50 : item.stock_quantity,
        }
        : item
    )));

    try {
      const response = await api.patch(`/foods/${encodeURIComponent(food.food_id)}/availability`, {
        is_available: true,
        meal_type: currentMeal,
      });
      if (response.data?.data) {
        setFoods((current) => current.map((item) => (
          item.food_id === food.food_id ? { ...item, ...response.data.data } : item
        )));
      }
      toast.success(`"${food.food_name}" is now Available Now for ${currentMeal}!`);
    } catch (requestError) {
      await loadFoods();
      toast.error(requestError.response?.data?.message || "Could not make food available now.");
    } finally {
      setUpdatingAvailabilityId("");
    }
  };

  // ── Bulk Toggle All Foods Availability ──
  const bulkSetAllAvailability = async (targetVal) => {
    const changedFoods = foods.filter((food) => (food.is_available !== false) !== targetVal);
    if (!changedFoods.length) {
      toast("All foods already have this availability status.");
      return;
    }

    setBulkUpdating(true);
    setFoods((current) => current.map((food) => ({
      ...food,
      is_available: targetVal,
      stock_quantity: targetVal && Number(food.stock_quantity || 0) <= 0 ? 50 : food.stock_quantity,
    })));

    try {
      await Promise.all(changedFoods.map((food) => api.patch(
        `/foods/${encodeURIComponent(food.food_id)}/availability`,
        { is_available: targetVal },
      )));
      toast.success(targetVal ? "All foods marked Available in kitchen." : "All foods marked Unavailable.");
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Bulk availability update failed.");
      await loadFoods();
    } finally {
      setBulkUpdating(false);
    }
  };

  // ── Bulk Serve Filtered Foods in Active Window ──
  const bulkServeFilteredInActiveWindow = async () => {
    const currentMeal = activeMenu?.mealType;
    if (!currentMeal) return;
    const targets = filteredFoods.filter((f) => f.meal_type !== currentMeal || f.is_available === false);
    if (!targets.length) {
      toast(`All filtered foods are already serving in ${currentMeal}.`);
      return;
    }

    setBulkUpdating(true);
    setFoods((current) => current.map((food) => (
      targets.some((t) => t.food_id === food.food_id)
        ? { ...food, is_available: true, meal_type: currentMeal }
        : food
    )));

    try {
      await Promise.all(targets.map((food) => api.patch(
        `/foods/${encodeURIComponent(food.food_id)}/availability`,
        { is_available: true, meal_type: currentMeal },
      )));
      toast.success(`${targets.length} dishes set to ${currentMeal} and marked Available!`);
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || "Failed to update dishes.");
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
  const kitchenAvailableCount = useMemo(() => foods.filter((f) => f.is_available !== false).length, [foods]);
  const kitchenUnavailableCount = useMemo(() => foods.filter((f) => f.is_available === false).length, [foods]);
  const visibleCount = useMemo(() => foods.filter((f) => f.is_menu_visible !== false).length, [foods]);

  const statCards = [
    { title: "Total Dishes", value: foods.length, hint: "All menu items", icon: UtensilsCrossed, accent: "#f97316", iconBg: "bg-orange-500" },
    { title: "Available Now", value: activeNowCount, hint: `${activeMenu?.mealType || "Active"} window`, icon: CheckCircle2, accent: "#10b981", iconBg: "bg-emerald-500" },
    { title: "Kitchen Ready", value: kitchenAvailableCount, hint: "Available to prepare", icon: Check, accent: "#0284c7", iconBg: "bg-sky-600" },
    { title: "Out of Stock", value: kitchenUnavailableCount, hint: "Kitchen unavailable", icon: AlertCircle, accent: "#e11d48", iconBg: "bg-rose-500" },
  ];

  // ── Modal Foods Filter ──
  const normalizedModalSearch = availabilityModalSearch.trim().toLowerCase();
  const modalFoods = foods.filter((food) => {
    if (availabilityModalTab === "available_now") {
      if (!getFoodAvailability(food, currentTime).available) return false;
    } else if (availabilityModalTab === "available") {
      if (food.is_available === false) return false;
    } else if (availabilityModalTab === "unavailable") {
      if (food.is_available !== false) return false;
    }
    if (normalizedModalSearch) {
      return [food.food_name, food.category_name, food.meal_type].some((v) => (
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
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Food Menu & Availability</h1>
          <p className="mt-1 text-sm text-slate-600">Control kitchen availability and scheduled meal services.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-sm font-medium text-slate-600">{foods.length} {foods.length === 1 ? "food" : "foods"}</span>
          <button
            type="button"
            onClick={() => setShowAvailabilityModal(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-orange-600 bg-orange-600 px-3.5 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-orange-700 active:scale-[0.98]"
          >
            <SlidersHorizontal size={16} />
            Manage Availability
          </button>
          <button
            type="button"
            onClick={() => setShowVisibilityPopup(true)}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-[0.98]"
          >
            <Eye size={16} />
            Visibility ({visibleCount})
          </button>
        </div>
      </header>

      {/* ── Active Meal Service Window Alert ── */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 px-4 py-3.5 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3.5 w-3.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-600" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">Active Meal Service:</span>
              <span className="rounded-lg bg-emerald-700 px-2.5 py-0.5 text-xs font-black tracking-wide text-white shadow-xs">
                {activeMenu?.heading || activeMenu?.mealType || "Current Service"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-emerald-800">
              Dishes with &ldquo;Available&rdquo; status scheduled for <strong>{activeMenu?.mealType}</strong> are live for customer ordering right now.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={bulkServeFilteredInActiveWindow}
            disabled={bulkUpdating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-xs transition hover:bg-emerald-100 active:scale-95 disabled:opacity-50"
            title={`Set filtered dishes to ${activeMenu?.mealType || "active window"} and make available`}
          >
            <Sparkles size={14} className="text-emerald-600" />
            Serve Filtered in {activeMenu?.mealType || "Active Service"}
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
              className="relative flex min-h-[170px] min-w-0 flex-col justify-between overflow-hidden rounded-[20px] border border-slate-200/90 bg-white p-5 shadow-[0_4px_16px_-5px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_-7px_rgba(15,23,42,0.12)] sm:p-6"
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
            placeholder="Search dish, category, or meal..."
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
            <option value="all">All Availability</option>
            <option value="available_now">★ Available Now (Live)</option>
            <option value="kitchen_available">Kitchen Available</option>
            <option value="kitchen_unavailable">Out of Stock</option>
            <option disabled>── Meal Slots ──</option>
            {MEAL_TYPES.map((type) => (
              <option key={type} value={type}>{type} Menu</option>
            ))}
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
                      className="h-4 w-4 accent-emerald-700"
                    />
                  </th>
                  <th className="px-4 py-3">S No</th>
                  <th className="px-4 py-3">Food</th>
                  <th className="min-w-[210px] px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span>Availability</span>
                      <span className="text-[10px] font-normal lowercase tracking-normal text-orange-600">(Toggle & Slot)</span>
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
                  const isKitchenAvail = food.is_available !== false;
                  const isCurrentSlot = String(food.meal_type || "").toLowerCase() === String(activeMenu?.mealType || "").toLowerCase();
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
                          className="h-4 w-4 accent-emerald-700"
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

                      {/* ── Interactive Availability Cell ── */}
                      <td className="px-4 py-3">
                        <div className="flex min-w-[200px] flex-col gap-1.5">
                          {/* Toggle Switch */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isKitchenAvail}
                              disabled={isUpdating}
                              onClick={() => toggleFoodAvailability(food, !isKitchenAvail)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                                isKitchenAvail ? "bg-emerald-600" : "bg-slate-300"
                              }`}
                              title={isKitchenAvail ? "Click to mark as Out of Stock / Unavailable" : "Click to mark as Available in kitchen"}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  isKitchenAvail ? "translate-x-5" : "translate-x-0"
                                }`}
                              />
                            </button>
                            <span className={`text-xs font-bold ${isKitchenAvail ? "text-emerald-700" : "text-slate-500"}`}>
                              {isKitchenAvail ? "Available" : "Unavailable"}
                            </span>
                            {isUpdating && <Loader2 size={13} className="animate-spin text-emerald-700" />}
                          </div>

                          {/* Meal Slot & Live Availability Badge */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isKitchenAvail ? (
                              availability.available ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                  Active Now ({food.meal_type || "Active"})
                                </span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800"
                                    title={`Scheduled for ${food.meal_type}. Current service window is ${activeMenu?.mealType}.`}
                                  >
                                    <Clock size={11} />
                                    {food.meal_type || "Scheduled"}
                                  </span>
                                  {activeMenu?.mealType && !isCurrentSlot && (
                                    <button
                                      type="button"
                                      onClick={() => makeAvailableNow(food)}
                                      disabled={isUpdating}
                                      title={`Make available now for ${activeMenu.mealType}`}
                                      className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 transition hover:bg-orange-200 active:scale-95"
                                    >
                                      Serve Now
                                    </button>
                                  )}
                                </div>
                              )
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                Out of Stock
                              </span>
                            )}

                            {/* Meal Slot Selector Dropdown */}
                            <select
                              value={food.meal_type || "Evening Snacks"}
                              disabled={isUpdating}
                              onChange={(event) => changeFoodMealType(food, event.target.value)}
                              className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-700 outline-none hover:border-slate-300 focus:border-emerald-600"
                              title="Assign scheduled meal service window"
                            >
                              {MEAL_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {type} {type === activeMenu?.mealType ? "★ (Active)" : ""}
                                </option>
                              ))}
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
            const isKitchenAvail = food.is_available !== false;
            const isCurrentSlot = String(food.meal_type || "").toLowerCase() === String(activeMenu?.mealType || "").toLowerCase();
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

                {/* ── Interactive Availability Card Block ── */}
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isKitchenAvail}
                        disabled={isUpdating}
                        onClick={() => toggleFoodAvailability(food, !isKitchenAvail)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                          isKitchenAvail ? "bg-emerald-600" : "bg-slate-300"
                        }`}
                        title={isKitchenAvail ? "Mark as Out of Stock" : "Mark as Available"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            isKitchenAvail ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className={`text-xs font-bold ${isKitchenAvail ? "text-emerald-700" : "text-slate-500"}`}>
                        {isKitchenAvail ? "Available" : "Unavailable"}
                      </span>
                    </div>
                    {isUpdating && <Loader2 size={13} className="animate-spin text-emerald-700" />}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-200/60 pt-2">
                    {isKitchenAvail ? (
                      availability.available ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          Active Now
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            <Clock size={10} />
                            {food.meal_type || "Scheduled"}
                          </span>
                          {activeMenu?.mealType && !isCurrentSlot && (
                            <button
                              type="button"
                              onClick={() => makeAvailableNow(food)}
                              disabled={isUpdating}
                              title={`Make available now for ${activeMenu.mealType}`}
                              className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 transition hover:bg-orange-200"
                            >
                              Serve Now
                            </button>
                          )}
                        </div>
                      )
                    ) : (
                      <span className="text-[10px] font-semibold text-rose-600">Out of Stock</span>
                    )}

                    <select
                      value={food.meal_type || "Evening Snacks"}
                      disabled={isUpdating}
                      onChange={(event) => changeFoodMealType(food, event.target.value)}
                      className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-700 outline-none hover:border-slate-300"
                      title="Assign scheduled meal slot"
                    >
                      {MEAL_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type} {type === activeMenu?.mealType ? "★" : ""}
                        </option>
                      ))}
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

      {/* ── Manage Food Availability Modal ── */}
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
                <h2 id="food-availability-title" className="text-lg font-bold text-slate-900">Manage Food Availability</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Active Window: <span className="font-bold text-emerald-800">{activeMenu?.heading || activeMenu?.mealType}</span>
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
                  onClick={() => bulkSetAllAvailability(true)}
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800 disabled:opacity-50"
                >
                  Make All Available
                </button>
                <button
                  type="button"
                  disabled={bulkUpdating}
                  onClick={() => bulkSetAllAvailability(false)}
                  className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 shadow-xs transition hover:bg-rose-50 disabled:opacity-50"
                >
                  Mark All Out of Stock
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="space-y-3 border-b border-slate-200 px-5 py-3">
              <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-2 text-xs font-bold">
                {[
                  { id: "all", label: `All (${foods.length})` },
                  { id: "available_now", label: `Available Now (${activeNowCount})` },
                  { id: "available", label: `Kitchen Ready (${kitchenAvailableCount})` },
                  { id: "unavailable", label: `Out of Stock (${kitchenUnavailableCount})` },
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
                  placeholder="Search food by name or category..."
                  className="min-h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-emerald-700"
                />
              </div>
            </div>

            {/* Dishes List */}
            <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto px-5 py-2">
              {modalFoods.length ? modalFoods.map((food) => {
                const availability = getFoodAvailability(food, currentTime);
                const isKitchenAvail = food.is_available !== false;
                const isCurrentSlot = String(food.meal_type || "").toLowerCase() === String(activeMenu?.mealType || "").toLowerCase();
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
                      {/* Availability Switch */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isKitchenAvail}
                        disabled={isUpdating}
                        onClick={() => toggleFoodAvailability(food, !isKitchenAvail)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                          isKitchenAvail ? "bg-emerald-600" : "bg-slate-300"
                        }`}
                        title={isKitchenAvail ? "Mark Unavailable" : "Mark Available"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            isKitchenAvail ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>

                      {/* Serve Now button if not in current window */}
                      {isKitchenAvail && !isCurrentSlot && activeMenu?.mealType && (
                        <button
                          type="button"
                          onClick={() => makeAvailableNow(food)}
                          disabled={isUpdating}
                          className="rounded-lg bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700 transition hover:bg-orange-200"
                        >
                          Serve in {activeMenu.mealType}
                        </button>
                      )}

                      {/* Meal Slot Dropdown */}
                      <select
                        value={food.meal_type || "Evening Snacks"}
                        disabled={isUpdating}
                        onChange={(e) => changeFoodMealType(food, e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none"
                      >
                        {MEAL_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type} {type === activeMenu?.mealType ? "★ (Active)" : ""}
                          </option>
                        ))}
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
