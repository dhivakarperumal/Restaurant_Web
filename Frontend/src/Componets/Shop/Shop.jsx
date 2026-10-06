import React, { useState, useEffect, useMemo, useContext, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Tag,
  Utensils,
  UtensilsCrossed,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { BACKEND_BASE_URL } from "../../api";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import PageContainer from "../../CommonComponents/PageContainer";
import PageHeader from "../../CommonComponents/PageHeader";
import FoodProductCard from "../../CommonComponents/FoodProductCard";
import FoodCustomizationModal from "../../CommonComponents/FoodCustomizationModal";

const resolveImageUrl = (img) => {
  if (!img || typeof img !== "string") return "";
  if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:")) {
    return img;
  }
  const cleanPath = img.startsWith("/") ? img : `/${img}`;
  return `${BACKEND_BASE_URL}${cleanPath}`;
};

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const store = useContext(StoreContext) || {};
  const { cart = [], addToCart, wishlist = [], toggleWishlist } = store;

  // Data states
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [selectedCuisines, setSelectedCuisines] = useState(() => {
    const cuisine = searchParams.get("cuisine");
    return cuisine && cuisine !== "all" ? [cuisine] : [];
  });
  const [selectedFoodType, setSelectedFoodType] = useState("all"); // 'all' | 'Veg' | 'Non-Veg'
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [minimumRating, setMinimumRating] = useState(0);
  const [selectedOfferRange, setSelectedOfferRange] = useState("");
  const [sortBy, setSortBy] = useState("recommended"); // 'recommended' | 'price-low' | 'price-high' | 'rating' | 'prep-time'
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(true);
  const productsPerPage = desktopFiltersOpen ? 12 : 15;

  // Modal state for food detail & customizations
  const [selectedFood, setSelectedFood] = useState(null);

  // Fetch foods, categories, cuisines
  const fetchMenuData = async () => {
    try {
      setLoading(true);
      setError("");
      const [foodsRes, catRes, cuisRes] = await Promise.allSettled([
        api.get("/foods"),
        api.get("/categories"),
        api.get("/cuisines"),
      ]);

      if (foodsRes.status === "fulfilled" && foodsRes.value.data?.success) {
        setFoods(foodsRes.value.data.data || []);
      } else if (foodsRes.status === "fulfilled" && Array.isArray(foodsRes.value.data)) {
        setFoods(foodsRes.value.data);
      } else {
        throw new Error("Unable to load food menu");
      }

      if (catRes.status === "fulfilled" && catRes.value.data?.success) {
        setCategories(catRes.value.data.data || []);
      }
      if (cuisRes.status === "fulfilled" && cuisRes.value.data?.success) {
        setCuisines(cuisRes.value.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load shop menu:", err);
      setError("Unable to load the restaurant menu. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
  }, []);

  // Sync category param with URL
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      setSelectedCategory(cat);
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Open customization modal
  const openCustomizer = useCallback((food) => {
    setSelectedFood(food);
  }, []);

  const closeModal = () => {
    setSelectedFood(null);
    if (searchParams.has("food")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("food");
      setSearchParams(nextParams, { replace: true });
    }
  };

  useEffect(() => {
    const foodId = searchParams.get("food");
    if (!foodId || !foods.length || selectedFood) return;
    const food = foods.find((item) => String(item.food_id || item.id) === foodId);
    if (food) openCustomizer(food);
  }, [foods, openCustomizer, searchParams, selectedFood]);

  // Add item from modal
  const handleAddFromModal = async ({
    quantity,
    selectedAddons,
    selectedCustomizations,
    unitPrice,
  }) => {
    if (!selectedFood) return;

    const payload = {
      ...selectedFood,
      id: selectedFood.food_id || selectedFood.id,
      food_id: selectedFood.food_id || selectedFood.id,
      product_id: selectedFood.food_id || selectedFood.id,
      product_name: selectedFood.food_name,
      name: selectedFood.food_name,
      price: unitPrice,
      portion_size: selectedFood.portion_size || "Standard",
      product_image: selectedFood.food_images?.[0] || "",
      image: selectedFood.food_images?.[0] || "",
      quantity,
      selectedAddons,
      selectedCustomizations,
    };

    if (addToCart) {
      const success = await addToCart(payload, {
        size: selectedFood.portion_size || "Standard",
        price: unitPrice,
        quantity,
        selectedAddons,
        selectedCustomizations,
      });
      if (!success) return false;
    } else {
      toast.success(`Added ${selectedFood.food_name} to cart!`);
    }
    return true;
  };

  // Direct quick add
  const handleQuickAdd = async (e, food) => {
    e.stopPropagation();
    openCustomizer(food);
  };

  // Filtered & Sorted Foods
  const filteredFoods = useMemo(() => {
    return foods
      .filter((food) => {
        if (food.is_menu_visible === false) return false;
        // Status check
        if (food.status === "Inactive") return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = food.food_name?.toLowerCase().includes(q);
          const matchDesc = food.description?.toLowerCase().includes(q);
          const matchCat = food.category_name?.toLowerCase().includes(q);
          const matchCuis = food.cuisine_name?.toLowerCase().includes(q);
          const matchSub = food.subcategory_name?.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchCat && !matchCuis && !matchSub) {
            return false;
          }
        }

        // Category filter
        if (selectedCategory !== "all") {
          if (String(food.category_id) !== String(selectedCategory)
            && food.category_name?.toLowerCase() !== selectedCategory.toLowerCase()) {
            return false;
          }
        }

        // Cuisine filter
        if (selectedCuisines.length > 0 && !selectedCuisines.some((cuisine) => (
          String(food.cuisine_id) === String(cuisine)
          || food.cuisine_name?.toLowerCase() === cuisine.toLowerCase()
        ))) return false;

        // Food type filter (Veg / Non-Veg)
        if (selectedFoodType !== "all") {
          if (food.food_type?.toLowerCase() !== selectedFoodType.toLowerCase()) {
            return false;
          }
        }

        const price = Number(food.final_price || food.mrp || 0);
        if (minimumPrice !== "" && price < Number(minimumPrice)) return false;
        if (maximumPrice !== "" && price > Number(maximumPrice)) return false;
        if (selectedOfferRange) {
          const discount = Number(food.discount || 0);
          const hasDiscount = discount > 0 && Number(food.mrp || 0) > price;
          const [minimumDiscount, maximumDiscount] = selectedOfferRange.split("-").map(Number);
          const matchesOffer = selectedOfferRange === "30+"
            ? discount > 30
            : discount >= minimumDiscount
              && (selectedOfferRange === "20-30" ? discount <= maximumDiscount : discount < maximumDiscount);
          if (!hasDiscount || !matchesOffer) return false;
        }
        if (minimumRating > 0 && Number(food.rating || 0) < minimumRating) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-low") {
          return Number(a.final_price || a.mrp || 0) - Number(b.final_price || b.mrp || 0);
        }
        if (sortBy === "price-high") {
          return Number(b.final_price || b.mrp || 0) - Number(a.final_price || a.mrp || 0);
        }
        if (sortBy === "rating") {
          return Number(b.rating || 0) - Number(a.rating || 0);
        }
        if (sortBy === "prep-time") {
          return Number(a.preparation_time || 999) - Number(b.preparation_time || 999);
        }
        // Recommended default: featured first, then newest
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return (b.id || 0) - (a.id || 0);
      });
  }, [foods, searchQuery, selectedCategory, selectedCuisines, selectedFoodType, minimumPrice, maximumPrice, minimumRating, selectedOfferRange, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredFoods.length / productsPerPage));
  const paginatedFoods = filteredFoods.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage,
  );
  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  ).filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1);
  const maxMenuPrice = Math.ceil(Math.max(
    0,
    foods.reduce((maxPrice, food) => Math.max(maxPrice, Number(food.final_price || food.mrp || 0)), 0),
  ));

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedCuisines([]);
    setSelectedFoodType("all");
    setMinimumPrice("");
    setMaximumPrice("");
    setMinimumRating(0);
    setSelectedOfferRange("");
    setCurrentPage(1);
  };

  // Count items in category
  const getCategoryCount = (catName) => {
    return foods.filter((f) => f.category_name?.toLowerCase() === catName?.toLowerCase()).length;
  };

  // Check if item is in cart
  const getItemCartQty = (foodId) => {
    const match = cart.find(
      (item) => String(item.product_id || item.id || item.food_id) === String(foodId)
    );
    return match ? match.quantity || 1 : 0;
  };

  // Check if item is in wishlist
  const isItemInWishlist = (foodId) => {
    return wishlist.some(
      (item) => String(item.product_id || item.id || item._id) === String(foodId)
    );
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-[#203129] pb-20">
      <PageHeader title="Shop" />
      <PageContainer>
        <div className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 font-semibold text-[#1a3c36] shadow-sm">
              <Utensils className="h-3.5 w-3.5 text-[#d4a843]" />
              <span>{foods.length} Dishes</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 font-semibold text-[#1a3c36] shadow-sm">
              <Layers className="h-3.5 w-3.5 text-[#d4a843]" />
              <span>{categories.length} Categories</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 font-semibold text-[#1a3c36] shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#d4a843]" />
              <span>{cuisines.length} Cuisines</span>
            </span>
          </div>
          <div className="w-full sm:max-w-sm">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search food, dish, cuisine..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-9 text-xs text-slate-800 outline-none transition focus:border-[#1a3c36] focus:ring-2 focus:ring-[#1a3c36]/15"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </PageContainer>

      {/* Shop content and filters */}
      <PageContainer>
        <div className={`mt-8 grid grid-cols-1 gap-6 ${desktopFiltersOpen ? "lg:grid-cols-[260px_minmax(0,1fr)]" : "lg:grid-cols-1"} lg:items-start`}>
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((open) => !open)}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#1a3c36] shadow-sm lg:hidden"
          aria-expanded={mobileFiltersOpen}
        >
          <span className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</span>
          <span>{mobileFiltersOpen ? "Hide" : "Show"}</span>
        </button>
        <aside id="shop-filter-sidebar" className={`${mobileFiltersOpen ? "block" : "hidden"} space-y-5 lg:sticky lg:top-4 ${desktopFiltersOpen ? "lg:block" : "lg:hidden"}`}>
        {/* Category Pills Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Categories</h2>
            <span className="text-[11px] font-semibold text-slate-400">{categories.length}</span>
          </div>

          <div className="scrollbar-hide flex max-h-56 flex-col gap-1 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => { setSelectedCategory("all"); setCurrentPage(1); }}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${
                selectedCategory === "all"
                  ? "bg-[#eef5f3] text-[#1a3c36]"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2"><Utensils className="h-3.5 w-3.5" />All Dishes</span>
              <span className="text-[10px] text-slate-400">{foods.length}</span>
            </button>

            {categories.map((cat) => {
              const isSelected = String(selectedCategory) === String(cat.category_id || cat.id)
                || selectedCategory.toLowerCase() === cat.category_name?.toLowerCase();
              const count = getCategoryCount(cat.category_name);
              return (
                <button
                  key={cat.category_id || cat.id}
                  type="button"
                  onClick={() => { setSelectedCategory(cat.category_name); setCurrentPage(1); }}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${
                    isSelected
                      ? "bg-[#eef5f3] text-[#1a3c36]"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {cat.category_image
                      ? <img src={resolveImageUrl(cat.category_image)} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                      : <Tag className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                    <span className="truncate">{cat.category_name}</span>
                  </span>
                  <span className="ml-2 text-[10px] text-slate-400">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Price range</h2>
            <span className="text-[10px] text-slate-400">₹0 – ₹{maxMenuPrice}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-[11px] font-semibold text-slate-500">
              Minimum
              <span className="mt-1 flex items-center rounded-lg border border-slate-200 px-2 text-sm text-slate-700 focus-within:border-[#1a3c36]">
                <span className="text-slate-400">₹</span>
                <input type="number" min="0" max={maxMenuPrice || undefined} value={minimumPrice} onChange={(event) => { setMinimumPrice(event.target.value); setCurrentPage(1); }} placeholder="0" className="w-full min-w-0 bg-transparent py-2 pl-1 outline-none" aria-label="Minimum price" />
              </span>
            </label>
            <label className="text-[11px] font-semibold text-slate-500">
              Maximum
              <span className="mt-1 flex items-center rounded-lg border border-slate-200 px-2 text-sm text-slate-700 focus-within:border-[#1a3c36]">
                <span className="text-slate-400">₹</span>
                <input type="number" min="0" max={maxMenuPrice || undefined} value={maximumPrice} onChange={(event) => { setMaximumPrice(event.target.value); setCurrentPage(1); }} placeholder={String(maxMenuPrice)} className="w-full min-w-0 bg-transparent py-2 pl-1 outline-none" aria-label="Maximum price" />
              </span>
            </label>
          </div>
        </div>

        {/* Secondary Filter Controls */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col items-stretch gap-5">
            {/* Dietary Type Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-full text-xs font-bold uppercase tracking-wider text-slate-500">Dietary</span>
              <button
                type="button"
                onClick={() => { setSelectedFoodType("all"); setCurrentPage(1); }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  selectedFoodType === "all"
                    ? "bg-[#1a3c36] text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => { setSelectedFoodType("Veg"); setCurrentPage(1); }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  selectedFoodType === "Veg"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Pure Veg</span>
              </button>
              <button
                type="button"
                onClick={() => { setSelectedFoodType("Non-Veg"); setCurrentPage(1); }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  selectedFoodType === "Non-Veg"
                    ? "bg-rose-700 text-white shadow-2xs"
                    : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>Non-Veg</span>
              </button>
            </div>

            {/* Quick toggles */}
            <div className="flex flex-col items-stretch gap-3">
              {cuisines.length > 0 && (
                <fieldset className="space-y-2">
                  <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Cuisine</legend>
                  <div className="scrollbar-hide max-h-40 space-y-2 overflow-y-auto pr-1">
                    <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedCuisines.length === 0}
                        onChange={() => {
                          setSelectedCuisines([]);
                          setCurrentPage(1);
                        }}
                        className="h-4 w-4 rounded accent-[#1a3c36]"
                      />
                      <span>All Cuisines</span>
                    </label>
                    {cuisines.map((c) => (
                      <label key={c.cuisine_id || c.id} className="flex cursor-pointer items-center gap-2.5 text-xs font-medium text-slate-600">
                        <input
                          type="checkbox"
                          checked={selectedCuisines.includes(c.cuisine_name)}
                          onChange={(event) => {
                            setSelectedCuisines((current) => event.target.checked
                              ? [...current, c.cuisine_name]
                              : current.filter((name) => name !== c.cuisine_name));
                            setCurrentPage(1);
                          }}
                          className="h-4 w-4 rounded accent-[#1a3c36]"
                        />
                        <span>{c.cuisine_name}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

            </div>
          </div>

          <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">More filters</h2>
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Offers</p>
              {[
                { value: "", label: "Any offer" },
                { value: "5-10", label: "5–10% off" },
                { value: "10-20", label: "10–20% off" },
                { value: "20-30", label: "20–30% off" },
                { value: "30+", label: "More than 30% off" },
              ].map((offer) => (
                <label key={offer.value || "any-offer"} className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                  <input
                    type="radio"
                    name="offer-range"
                    value={offer.value}
                    checked={selectedOfferRange === offer.value}
                    onChange={() => { setSelectedOfferRange(offer.value); setCurrentPage(1); }}
                    className="accent-[#1a3c36]"
                  />
                  {offer.label}
                </label>
              ))}
            </div>
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rating</p>
              {[0, 5, 4, 3, 2, 1].map((rating) => (
                <label key={rating} className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                  <input type="radio" name="minimum-rating" checked={minimumRating === rating} onChange={() => { setMinimumRating(rating); setCurrentPage(1); }} className="accent-[#1a3c36]" />
                  <span className="flex items-center gap-1">{rating === 0 ? "Any rating" : <><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{rating === 5 ? "5 stars" : `${rating}+ stars`}</>}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Active filters pill display */}
          {(searchQuery ||
            selectedCategory !== "all" ||
            selectedCuisines.length > 0 ||
            selectedFoodType !== "all" ||
            minimumPrice !== "" ||
            maximumPrice !== "" ||
            minimumRating > 0 ||
            selectedOfferRange) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5 text-xs">
              <span className="text-slate-400 font-medium">Active Filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 font-medium">
                  Search: "{searchQuery}"
                  <button type="button" aria-label="Clear search filter" onClick={() => { setSearchQuery(""); setCurrentPage(1); }}><X className="h-3 w-3" /></button>
                </span>
              )}
              {selectedCategory !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-800 font-medium border border-emerald-200/60">
                  Category: {selectedCategory}
                  <button type="button" aria-label="Clear category filter" onClick={() => { setSelectedCategory("all"); setCurrentPage(1); }}><X className="h-3 w-3" /></button>
                </span>
              )}
              {selectedCuisines.map((cuisine) => (
                <span key={cuisine} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200/60 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800">
                  Cuisine: {cuisine}
                  <button type="button" aria-label={`Clear ${cuisine} cuisine filter`} onClick={() => { setSelectedCuisines((current) => current.filter((name) => name !== cuisine)); setCurrentPage(1); }}><X className="h-3 w-3" /></button>
                </span>
              ))}
              {selectedFoodType !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 font-medium">
                  Type: {selectedFoodType}
                  <button type="button" aria-label="Clear dietary filter" onClick={() => { setSelectedFoodType("all"); setCurrentPage(1); }}><X className="h-3 w-3" /></button>
                </span>
              )}
              {(minimumPrice !== "" || maximumPrice !== "") && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 font-medium">
                  Price: ₹{minimumPrice || "0"}–₹{maximumPrice || maxMenuPrice}
                  <button type="button" aria-label="Clear price filter" onClick={() => { setMinimumPrice(""); setMaximumPrice(""); setCurrentPage(1); }}><X className="h-3 w-3" /></button>
                </span>
              )}
              {selectedOfferRange && <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 font-medium text-amber-800">{selectedOfferRange === "30+" ? "More than 30% off" : `${selectedOfferRange.replace("-", "–")}% off`} <button type="button" aria-label="Clear offer filter" onClick={() => { setSelectedOfferRange(""); setCurrentPage(1); }}><X className="h-3 w-3" /></button></span>}
              {minimumRating > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 font-medium text-amber-800">{minimumRating}+ stars <button type="button" aria-label="Clear rating filter" onClick={() => { setMinimumRating(0); setCurrentPage(1); }}><X className="h-3 w-3" /></button></span>}
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 underline ml-2"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
        </aside>

        {/* 3. Foods Listing */}
        <section className="min-w-0">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-[#1a3c36]">Our menu</h2>
            <p className="mt-1 text-xs text-slate-500">Showing {filteredFoods.length ? (currentPage - 1) * productsPerPage + 1 : 0}–{Math.min(currentPage * productsPerPage, filteredFoods.length)} of {filteredFoods.length} dishes</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDesktopFiltersOpen((open) => !open);
                setCurrentPage(1);
              }}
              aria-expanded={desktopFiltersOpen}
              aria-controls="shop-filter-sidebar"
              className="hidden h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 lg:inline-flex"
            >
              <Filter className="h-4 w-4" />
              {desktopFiltersOpen ? "Hide filters" : "Show filters"}
            </button>
            <label className="sr-only" htmlFor="shop-sort">Sort menu</label>
            <select
              id="shop-sort"
              value={sortBy}
              onChange={(event) => { setSortBy(event.target.value); setCurrentPage(1); }}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-[#1a3c36]"
            >
              <option value="recommended">Featured First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="prep-time">Fastest Preparation</option>
            </select>
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
                className={`rounded-md p-2 transition ${viewMode === "grid" ? "bg-white text-[#1a3c36] shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="List view"
                aria-pressed={viewMode === "list"}
                className={`rounded-md p-2 transition ${viewMode === "list" ? "bg-white text-[#1a3c36] shadow-sm" : "text-slate-400 hover:text-slate-700"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${desktopFiltersOpen ? "xl:grid-cols-4" : "xl:grid-cols-5"}`}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-2xs animate-pulse">
                  <div className="h-48 w-full rounded-2xl bg-slate-200" />
                  <div className="mt-4 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-slate-200" />
                    <div className="h-3 w-1/2 rounded bg-slate-100" />
                    <div className="h-5 w-1/3 rounded bg-slate-200 mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-12 text-center text-rose-800 max-w-xl mx-auto">
              <AlertCircle className="mx-auto h-10 w-10 text-rose-600" />
              <h3 className="mt-3 text-lg font-bold">Failed to load menu</h3>
              <p className="mt-1 text-xs text-rose-600">{error}</p>
              <button
                type="button"
                onClick={fetchMenuData}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          ) : filteredFoods.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-16 text-center max-w-lg mx-auto shadow-2xs">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#1a3c36]">
                <UtensilsCrossed className="h-7 w-7" />
              </div>
              <h3 className="font-serif text-xl font-bold text-slate-800">No dishes found</h3>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                We couldn't find any menu items matching your selected criteria or search term.
                Try adjusting your search or filters.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1a3c36] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#234e46] transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>View Full Menu</span>
              </button>
            </div>
          ) : viewMode === "grid" ? (
            /* Grid View */
            <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${desktopFiltersOpen ? "xl:grid-cols-4" : "xl:grid-cols-5"}`}>
              {paginatedFoods.map((food) => (
                <FoodProductCard
                  key={food.food_id || food.id}
                  food={food}
                  onSelect={() => openCustomizer(food)}
                  onAdd={() => openCustomizer(food)}
                  cartQuantity={getItemCartQty(food.food_id || food.id)}
                  isInWishlist={isItemInWishlist(food.food_id || food.id)}
                  onToggleWishlist={toggleWishlist}
                />
              ))}
            </div>
          ) : (
            /* List View */
            <div className="space-y-4">
              {paginatedFoods.map((food) => {
                const isVeg = food.food_type?.toLowerCase() === "veg";
                const discount = Number(food.discount || 0);
                const finalPrice = Number(food.final_price || food.mrp || 0);
                const mrp = Number(food.mrp || 0);
                const hasDiscount = discount > 0 && mrp > finalPrice;
                const isAvailable = food.is_available !== false;
                const primaryImage =
                  Array.isArray(food.food_images) && food.food_images.length > 0
                    ? resolveImageUrl(food.food_images[0])
                    : "";

                return (
                  <article
                    key={food.food_id || food.id}
                    onClick={() => openCustomizer(food)}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-emerald-200 hover:shadow-md transition cursor-pointer"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                        {primaryImage ? (
                          <img
                            src={primaryImage}
                            alt={food.food_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-300">
                            <UtensilsCrossed className="h-6 w-6" />
                          </div>
                        )}
                        <div
                          className={`absolute left-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-md border bg-white ${
                            isVeg ? "border-emerald-600" : "border-rose-600"
                          }`}
                        >
                          <div
                            className={`h-2 w-2 rounded-full ${
                              isVeg ? "bg-emerald-600" : "bg-rose-600"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                          <span>{food.category_name}</span>
                          <span>•</span>
                          <span>{food.cuisine_name}</span>
                          {food.rating > 0 && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {Number(food.rating).toFixed(1)}
                              </span>
                            </>
                          )}
                        </div>
                        <h3 className="font-serif text-lg font-bold text-slate-900 truncate">
                          {food.food_name}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-1 max-w-xl">
                          {food.description || "Authentic freshly cooked restaurant dish."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                      <div className="text-right">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-serif text-lg font-black text-[#1a3c36]">
                            ₹{finalPrice.toFixed(2)}
                          </span>
                          {hasDiscount && (
                            <span className="text-xs text-slate-400 line-through">
                              ₹{mrp.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {food.portion_size && (
                          <p className="text-[10px] text-slate-400">{food.portion_size}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleQuickAdd(e, food)}
                        disabled={!isAvailable}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a3c36] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#245048] transition disabled:opacity-50"
                      >
                        <Plus className="h-3.5 w-3.5 text-emerald-300" />
                        <span>Add</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
        {filteredFoods.length > 0 && (
          <nav className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5" aria-label="Menu pagination">
            <p className="text-xs text-slate-500">Page {currentPage} of {totalPages}</p>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              {pageNumbers.map((page, index) => (
                <React.Fragment key={page}>
                  {index > 0 && page - pageNumbers[index - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
                  <button type="button" onClick={() => setCurrentPage(page)} aria-current={page === currentPage ? "page" : undefined} className={`h-9 min-w-9 rounded-lg px-2 text-xs font-bold ${page === currentPage ? "bg-[#1a3c36] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                    {page}
                  </button>
                </React.Fragment>
              ))}
              <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </nav>
        )}
        </section>
        </div>
      </PageContainer>

      {selectedFood && (
        <FoodCustomizationModal
          key={selectedFood.food_id || selectedFood.id}
          food={selectedFood}
          onClose={closeModal}
          onAdd={handleAddFromModal}
        />
      )}
    </div>
  );
}
