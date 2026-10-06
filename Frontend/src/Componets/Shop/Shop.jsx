import React, { useState, useEffect, useMemo, useContext, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Flame,
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
  const [selectedCuisine, setSelectedCuisine] = useState(searchParams.get("cuisine") || "all");
  const [selectedFoodType, setSelectedFoodType] = useState("all"); // 'all' | 'Veg' | 'Non-Veg'
  const [onlySpicy, setOnlySpicy] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState("recommended"); // 'recommended' | 'price-low' | 'price-high' | 'rating' | 'prep-time'
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'

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
    if (cat) setSelectedCategory(cat);
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
          if (
            food.category_id !== selectedCategory &&
            food.category_name?.toLowerCase() !== selectedCategory.toLowerCase()
          ) {
            return false;
          }
        }

        // Cuisine filter
        if (selectedCuisine !== "all") {
          if (
            food.cuisine_id !== selectedCuisine &&
            food.cuisine_name?.toLowerCase() !== selectedCuisine.toLowerCase()
          ) {
            return false;
          }
        }

        // Food type filter (Veg / Non-Veg)
        if (selectedFoodType !== "all") {
          if (food.food_type?.toLowerCase() !== selectedFoodType.toLowerCase()) {
            return false;
          }
        }

        // Spicy filter
        if (onlySpicy && !food.is_spicy) return false;

        // Availability filter
        if (onlyAvailable && !food.is_available) return false;

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
  }, [foods, searchQuery, selectedCategory, selectedCuisine, selectedFoodType, onlySpicy, onlyAvailable, sortBy]);

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
      {/* 1. Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#0d221d] via-[#16382f] to-[#20493e] py-12 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,168,67,0.15),transparent_50%)] pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        <PageContainer>
          <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#d4a843] backdrop-blur-xs border border-white/10 mb-3">
                <UtensilsCrossed className="h-3.5 w-3.5" />
                <span>Chef-Crafted Restaurant Menu</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
                Explore Our Food Menu
              </h1>
              <p className="mt-2 text-sm text-emerald-100/80 leading-relaxed max-w-xl">
                Freshly prepared with authentic recipes, seasonal ingredients, and culinary perfection.
                Order for home delivery or table service dining.
              </p>

              {/* Quick Info Badges */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1 font-semibold text-white">
                  <Utensils className="h-3.5 w-3.5 text-[#d4a843]" />
                  <span>{foods.length} Dishes</span>
                </span>
                <span className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1 font-semibold text-white">
                  <Layers className="h-3.5 w-3.5 text-[#d4a843]" />
                  <span>{categories.length} Categories</span>
                </span>
                <span className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1 font-semibold text-white">
                  <Sparkles className="h-3.5 w-3.5 text-[#d4a843]" />
                  <span>{cuisines.length} Cuisines</span>
                </span>
              </div>
            </div>

            {/* Quick Search in Hero */}
            <div className="w-full md:w-80">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-200/70" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search food, dish, cuisine..."
                  className="w-full rounded-2xl border border-white/20 bg-white/15 py-3 pl-10 pr-9 text-xs text-white placeholder:text-emerald-200/60 backdrop-blur-md outline-none transition focus:border-[#d4a843] focus:bg-white/25 focus:ring-2 focus:ring-[#d4a843]/30"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* 2. Main Content & Filters */}
      <PageContainer>
        {/* Category Pills Bar */}
        <div className="mt-8">
          <div className="flex items-center justify-between pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Browse by Category
            </h2>
            <span className="text-xs font-semibold text-[#1a3c36]">
              Showing {filteredFoods.length} of {foods.length} items
            </span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition ${
                selectedCategory === "all"
                  ? "bg-[#1a3c36] text-white shadow-md ring-2 ring-[#1a3c36]/20"
                  : "border border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Utensils className="h-3.5 w-3.5" />
              <span>All Dishes</span>
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                  selectedCategory === "all" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {foods.length}
              </span>
            </button>

            {categories.map((cat) => {
              const isSelected =
                selectedCategory === cat.category_id ||
                selectedCategory.toLowerCase() === cat.category_name?.toLowerCase();
              const count = getCategoryCount(cat.category_name);
              return (
                <button
                  key={cat.category_id || cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.category_name)}
                  className={`flex shrink-0 items-center gap-2.5 rounded-2xl px-4 py-2.5 text-xs font-bold transition ${
                    isSelected
                      ? "bg-[#1a3c36] text-white shadow-md ring-2 ring-[#1a3c36]/20"
                      : "border border-slate-200/80 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {cat.category_image ? (
                    <img
                      src={resolveImageUrl(cat.category_image)}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <Tag className="h-3.5 w-3.5 opacity-70" />
                  )}
                  <span>{cat.category_name}</span>
                  {count > 0 && (
                    <span
                      className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${
                        isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filter Controls */}
        <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Dietary Type Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
                Dietary:
              </span>
              <button
                type="button"
                onClick={() => setSelectedFoodType("all")}
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
                onClick={() => setSelectedFoodType("Veg")}
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
                onClick={() => setSelectedFoodType("Non-Veg")}
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

            {/* Quick toggles & Cuisine selector */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Cuisine selector */}
              {cuisines.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedCuisine}
                    onChange={(e) => setSelectedCuisine(e.target.value)}
                    className="h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-3 pr-8 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-600 focus:bg-white"
                  >
                    <option value="all">All Cuisines</option>
                    {cuisines.map((c) => (
                      <option key={c.cuisine_id || c.id} value={c.cuisine_name}>
                        {c.cuisine_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Spicy toggle */}
              <button
                type="button"
                onClick={() => setOnlySpicy(!onlySpicy)}
                className={`inline-flex h-9 items-center gap-1 rounded-xl px-3 text-xs font-bold transition ${
                  onlySpicy
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "border border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Flame className="h-3.5 w-3.5" />
                <span>Spicy</span>
              </button>

              {/* In Stock toggle */}
              <button
                type="button"
                onClick={() => setOnlyAvailable(!onlyAvailable)}
                className={`inline-flex h-9 items-center gap-1 rounded-xl px-3 text-xs font-bold transition ${
                  onlyAvailable
                    ? "bg-[#1a3c36] text-white shadow-2xs"
                    : "border border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>Available</span>
              </button>

              {/* Sort By Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-slate-50/70 px-3 pr-8 text-xs font-semibold text-slate-700 outline-none transition focus:border-emerald-600 focus:bg-white"
                >
                  <option value="recommended">Featured First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                  <option value="prep-time">Fastest Preparation</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="hidden sm:flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  className={`rounded-lg p-1.5 transition ${
                    viewMode === "grid" ? "bg-white text-[#1a3c36] shadow-2xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  className={`rounded-lg p-1.5 transition ${
                    viewMode === "list" ? "bg-white text-[#1a3c36] shadow-2xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Active filters pill display */}
          {(searchQuery ||
            selectedCategory !== "all" ||
            selectedCuisine !== "all" ||
            selectedFoodType !== "all" ||
            onlySpicy ||
            onlyAvailable) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5 text-xs">
              <span className="text-slate-400 font-medium">Active Filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 font-medium">
                  Search: "{searchQuery}"
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery("")} />
                </span>
              )}
              {selectedCategory !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-800 font-medium border border-emerald-200/60">
                  Category: {selectedCategory}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategory("all")} />
                </span>
              )}
              {selectedCuisine !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-800 font-medium border border-emerald-200/60">
                  Cuisine: {selectedCuisine}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCuisine("all")} />
                </span>
              )}
              {selectedFoodType !== "all" && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 font-medium">
                  Type: {selectedFoodType}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedFoodType("all")} />
                </span>
              )}
              {onlySpicy && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-amber-800 font-medium border border-amber-200/60">
                  Spicy Only
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setOnlySpicy(false)} />
                </span>
              )}
              {onlyAvailable && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 font-medium">
                  Available Only
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setOnlyAvailable(false)} />
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setSelectedCuisine("all");
                  setSelectedFoodType("all");
                  setOnlySpicy(false);
                  setOnlyAvailable(false);
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 underline ml-2"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>

        {/* 3. Foods Listing */}
        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setSelectedCuisine("all");
                  setSelectedFoodType("all");
                  setOnlySpicy(false);
                  setOnlyAvailable(false);
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1a3c36] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#234e46] transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>View Full Menu</span>
              </button>
            </div>
          ) : viewMode === "grid" ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredFoods.map((food) => (
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
              {filteredFoods.map((food) => {
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
