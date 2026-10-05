import React, { useState, useEffect, useMemo, useContext } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpDown,
  Check,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Flame,
  Heart,
  Info,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
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
  const { cart = [], addToCart, openCart, wishlist = [], toggleWishlist } = store;

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
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalSelectedAddons, setModalSelectedAddons] = useState([]);
  const [modalCustomizations, setModalCustomizations] = useState({});
  const [modalCookingNotes, setModalCookingNotes] = useState("");

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
  const openCustomizer = (food) => {
    setSelectedFood(food);
    setActiveImageIndex(0);
    setModalQuantity(1);
    setModalSelectedAddons([]);
    setModalCookingNotes("");

    // Initialize required customizations
    const initialCust = {};
    if (Array.isArray(food.customizations)) {
      food.customizations.forEach((group) => {
        if (group.selection_type === "Multiple") {
          initialCust[group.name] = [];
        } else {
          // Single selection default
          initialCust[group.name] = group.options?.[0]?.name || "";
        }
      });
    }
    setModalCustomizations(initialCust);
  };

  const closeModal = () => {
    setSelectedFood(null);
  };

  // Add item from modal
  const handleAddFromModal = async () => {
    if (!selectedFood) return;

    // Calculate addon price
    let extraPrice = 0;
    if (Array.isArray(selectedFood.addons)) {
      selectedFood.addons.forEach((addon) => {
        if (modalSelectedAddons.includes(addon.addon_name)) {
          extraPrice += Number(addon.price || 0);
        }
      });
    }

    // Calculate customization extra price
    if (Array.isArray(selectedFood.customizations)) {
      selectedFood.customizations.forEach((group) => {
        const val = modalCustomizations[group.name];
        if (Array.isArray(val)) {
          group.options?.forEach((opt) => {
            if (val.includes(opt.name)) extraPrice += Number(opt.price || 0);
          });
        } else if (val) {
          const match = group.options?.find((opt) => opt.name === val);
          if (match) extraPrice += Number(match.price || 0);
        }
      });
    }

    const basePrice = Number(selectedFood.final_price || selectedFood.mrp || 0);
    const itemFinalPrice = basePrice + extraPrice;

    const payload = {
      ...selectedFood,
      id: selectedFood.food_id || selectedFood.id,
      food_id: selectedFood.food_id || selectedFood.id,
      product_id: selectedFood.food_id || selectedFood.id,
      product_name: selectedFood.food_name,
      name: selectedFood.food_name,
      price: itemFinalPrice,
      portion_size: selectedFood.portion_size || "Standard",
      product_image: selectedFood.food_images?.[0] || "",
      image: selectedFood.food_images?.[0] || "",
      quantity: modalQuantity,
      selectedAddons: modalSelectedAddons,
      selectedCustomizations: modalCustomizations,
      cookingNotes: modalCookingNotes,
    };

    if (addToCart) {
      await addToCart(payload, {
        size: selectedFood.portion_size || "Standard",
        price: itemFinalPrice,
        quantity: modalQuantity,
        selectedAddons: modalSelectedAddons,
        selectedCustomizations: modalCustomizations,
        cookingNotes: modalCookingNotes,
      });
    } else {
      toast.success(`Added ${selectedFood.food_name} to cart!`);
    }
    closeModal();
  };

  // Direct quick add
  const handleQuickAdd = async (e, food) => {
    e.stopPropagation();
    // If food has addons or customizations, open modal instead
    if ((food.addons && food.addons.length > 0) || (food.customizations && food.customizations.length > 0)) {
      openCustomizer(food);
      return;
    }

    const basePrice = Number(food.final_price || food.mrp || 0);
    const payload = {
      ...food,
      id: food.food_id || food.id,
      food_id: food.food_id || food.id,
      product_id: food.food_id || food.id,
      product_name: food.food_name,
      name: food.food_name,
      price: basePrice,
      portion_size: food.portion_size || "Standard",
      product_image: food.food_images?.[0] || "",
      image: food.food_images?.[0] || "",
      quantity: 1,
    };

    if (addToCart) {
      await addToCart(payload, {
        size: food.portion_size || "Standard",
        price: basePrice,
        quantity: 1,
        selectedAddons: [],
        selectedCustomizations: {},
        cookingNotes: "",
      });
    } else {
      toast.success(`Added ${food.food_name} to cart!`);
    }
  };

  // Filtered & Sorted Foods
  const filteredFoods = useMemo(() => {
    return foods
      .filter((food) => {
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
    <div className="min-h-screen bg-[#fcfbf9] text-[#203129] pt-24 pb-20">
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
              {filteredFoods.map((food) => {
                const isVeg = food.food_type?.toLowerCase() === "veg";
                const discount = Number(food.discount || 0);
                const finalPrice = Number(food.final_price || food.mrp || 0);
                const mrp = Number(food.mrp || 0);
                const hasDiscount = discount > 0 && mrp > finalPrice;
                const inWishlist = isItemInWishlist(food.food_id || food.id);
                const cartQty = getItemCartQty(food.food_id || food.id);
                const isAvailable = food.is_available !== false;
                const hasCustomizations =
                  (food.addons && food.addons.length > 0) ||
                  (food.customizations && food.customizations.length > 0);

                const primaryImage =
                  Array.isArray(food.food_images) && food.food_images.length > 0
                    ? resolveImageUrl(food.food_images[0])
                    : "";

                return (
                  <article
                    key={food.food_id || food.id}
                    onClick={() => openCustomizer(food)}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl cursor-pointer"
                  >
                    {/* Top Image Box */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      {primaryImage ? (
                        <img
                          src={primaryImage}
                          alt={food.food_name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src =
                              "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60";
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-emerald-50/50 text-[#1a3c36]/40">
                          <UtensilsCrossed className="h-10 w-10" />
                        </div>
                      )}

                      {/* Veg / Non-Veg Indicator in Top Left */}
                      <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-md border-2 bg-white shadow-sm ${
                            isVeg ? "border-emerald-600" : "border-rose-600"
                          }`}
                          title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
                        >
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${
                              isVeg ? "bg-emerald-600" : "bg-rose-600"
                            }`}
                          />
                        </div>

                        {food.is_spicy && (
                          <span
                            className="flex h-5 items-center gap-0.5 rounded-md bg-amber-500/90 px-1.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-xs"
                            title="Spicy dish"
                          >
                            <Flame className="h-3 w-3" />
                            <span>Spicy</span>
                          </span>
                        )}
                      </div>

                      {/* Wishlist Button in Top Right */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (toggleWishlist) toggleWishlist(food);
                        }}
                        aria-label="Add to favorites"
                        className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-xs transition hover:scale-110 active:scale-95 ${
                          inWishlist ? "text-rose-600" : "text-slate-400 hover:text-rose-600"
                        }`}
                      >
                        <Heart
                          className={`h-4 w-4 ${inWishlist ? "fill-rose-600" : ""}`}
                        />
                      </button>

                      {/* Discount Tag */}
                      {hasDiscount && (
                        <div className="absolute bottom-2.5 left-3 z-10">
                          <span className="rounded-lg bg-[#d4a843] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-md">
                            {discount}% OFF
                          </span>
                        </div>
                      )}

                      {/* Preparation Time chip in Bottom Right */}
                      {food.preparation_time > 0 && (
                        <div className="absolute bottom-2.5 right-3 z-10">
                          <span className="flex items-center gap-1 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs shadow-sm">
                            <Clock className="h-2.5 w-2.5 text-[#d4a843]" />
                            <span>{food.preparation_time}m</span>
                          </span>
                        </div>
                      )}

                      {/* Sold out overlay */}
                      {!isAvailable && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-xs">
                          <span className="rounded-xl border border-white/20 bg-rose-600/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
                            Sold Out
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        {/* Cuisine & Category line */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-1">
                          <span className="truncate">{food.category_name || "Specialty"}</span>
                          {food.rating > 0 && (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span>{Number(food.rating).toFixed(1)}</span>
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="font-serif text-base font-bold text-slate-900 line-clamp-1 group-hover:text-[#1a3c36] transition-colors">
                          {food.food_name}
                        </h3>

                        {/* Description excerpt */}
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {food.description ||
                            `${food.portion_size || "Full"} portion of delicious ${food.food_name} prepared fresh.`}
                        </p>
                      </div>

                      {/* Price & Action row */}
                      <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
                        <div>
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
                            <p className="text-[10px] text-slate-400 font-medium">
                              {food.portion_size}
                            </p>
                          )}
                        </div>

                        {/* Add / Customizer Button */}
                        <div>
                          {!isAvailable ? (
                            <button
                              type="button"
                              disabled
                              className="rounded-xl bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-400 cursor-not-allowed"
                            >
                              Unavailable
                            </button>
                          ) : hasCustomizations ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCustomizer(food);
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-[#1a3c36] border border-emerald-200/80 shadow-2xs hover:bg-[#1a3c36] hover:text-white transition active:scale-95"
                            >
                              <span>Customize</span>
                              <Plus className="h-3 w-3" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleQuickAdd(e, food)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a3c36] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#245048] transition active:scale-95"
                            >
                              <Plus className="h-3.5 w-3.5 text-emerald-300" />
                              <span>{cartQty > 0 ? `Add (${cartQty})` : "Add"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
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

      {/* 4. Food Detail & Customization Modal */}
      {selectedFood && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 sm:p-5 backdrop-blur-xs animate-fadeIn"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dish-detail-title"
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 animate-scaleUp"
          >
            {/* Modal Header Media */}
            <div className="relative aspect-[16/9] w-full bg-slate-100 overflow-hidden">
              {Array.isArray(selectedFood.food_images) && selectedFood.food_images.length > 0 ? (
                <img
                  src={resolveImageUrl(selectedFood.food_images[activeImageIndex] || selectedFood.food_images[0])}
                  alt={selectedFood.food_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-emerald-50 text-[#1a3c36]">
                  <UtensilsCrossed className="h-12 w-12" />
                </div>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close modal"
                className="absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-xs hover:bg-black/80 transition"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Multiple thumbnails if available */}
              {Array.isArray(selectedFood.food_images) && selectedFood.food_images.length > 1 && (
                <div className="absolute bottom-3 left-3 z-10 flex gap-1.5 bg-black/40 p-1 rounded-xl backdrop-blur-xs">
                  {selectedFood.food_images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`h-10 w-10 overflow-hidden rounded-lg border-2 transition ${
                        activeImageIndex === idx ? "border-[#d4a843]" : "border-transparent opacity-70"
                      }`}
                    >
                      <img src={resolveImageUrl(img)} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
              {/* Header Title & Badges */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-sm border-2 ${
                      selectedFood.food_type?.toLowerCase() === "veg"
                        ? "border-emerald-600"
                        : "border-rose-600"
                    }`}
                  >
                    <div
                      className={`h-2 w-2 rounded-full ${
                        selectedFood.food_type?.toLowerCase() === "veg"
                          ? "bg-emerald-600"
                          : "bg-rose-600"
                      }`}
                    />
                  </div>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    {selectedFood.category_name}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {selectedFood.cuisine_name}
                  </span>
                  {selectedFood.is_spicy && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                      <Flame className="h-3 w-3" /> Spicy
                    </span>
                  )}
                  {selectedFood.rating > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                      {Number(selectedFood.rating).toFixed(1)}
                    </span>
                  )}
                </div>

                <h2 id="dish-detail-title" className="font-serif text-2xl font-bold text-slate-900">
                  {selectedFood.food_name}
                </h2>

                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  {selectedFood.description ||
                    `Our signature ${selectedFood.food_name} prepared fresh with traditional spices and gourmet ingredients.`}
                </p>

                {/* Specs row */}
                <div className="mt-4 flex flex-wrap gap-4 border-y border-slate-100 py-3 text-xs text-slate-600">
                  {selectedFood.preparation_time > 0 && (
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Prep Time: {selectedFood.preparation_time} mins</span>
                    </span>
                  )}
                  {selectedFood.portion_size && (
                    <span className="flex items-center gap-1.5 font-medium">
                      <Utensils className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Portion: {selectedFood.portion_size}</span>
                    </span>
                  )}
                  {selectedFood.serving_size && (
                    <span className="flex items-center gap-1.5 font-medium">
                      <Info className="h-3.5 w-3.5 text-emerald-700" />
                      <span>Serving: {selectedFood.serving_size}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Addons Selection */}
              {Array.isArray(selectedFood.addons) && selectedFood.addons.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Add-ons & Extras
                  </h4>
                  <div className="space-y-2">
                    {selectedFood.addons.map((addon, idx) => {
                      const isSelected = modalSelectedAddons.includes(addon.addon_name);
                      return (
                        <label
                          key={idx}
                          className={`flex items-center justify-between rounded-xl border p-3 transition cursor-pointer ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/40"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setModalSelectedAddons([...modalSelectedAddons, addon.addon_name]);
                                } else {
                                  setModalSelectedAddons(
                                    modalSelectedAddons.filter((name) => name !== addon.addon_name)
                                  );
                                }
                              }}
                              className="h-4 w-4 accent-[#1a3c36] rounded"
                            />
                            <span className="text-xs font-semibold text-slate-800">
                              {addon.addon_name}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-[#1a3c36]">
                            +₹{Number(addon.price || 0).toFixed(2)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Customizations Selection */}
              {Array.isArray(selectedFood.customizations) && selectedFood.customizations.length > 0 && (
                <div className="space-y-4">
                  {selectedFood.customizations.map((group, groupIdx) => (
                    <div key={groupIdx}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        {group.name} {group.required && <span className="text-rose-500">*</span>}
                      </h4>
                      <div className="space-y-2">
                        {group.options?.map((opt, optIdx) => {
                          const isSelected =
                            group.selection_type === "Multiple"
                              ? (modalCustomizations[group.name] || []).includes(opt.name)
                              : modalCustomizations[group.name] === opt.name;

                          return (
                            <label
                              key={optIdx}
                              className={`flex items-center justify-between rounded-xl border p-3 transition cursor-pointer ${
                                isSelected
                                  ? "border-emerald-600 bg-emerald-50/40"
                                  : "border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type={group.selection_type === "Multiple" ? "checkbox" : "radio"}
                                  name={`cust-${group.name}`}
                                  checked={isSelected}
                                  onChange={() => {
                                    if (group.selection_type === "Multiple") {
                                      const currentList = modalCustomizations[group.name] || [];
                                      const next = currentList.includes(opt.name)
                                        ? currentList.filter((n) => n !== opt.name)
                                        : [...currentList, opt.name];
                                      setModalCustomizations({
                                        ...modalCustomizations,
                                        [group.name]: next,
                                      });
                                    } else {
                                      setModalCustomizations({
                                        ...modalCustomizations,
                                        [group.name]: opt.name,
                                      });
                                    }
                                  }}
                                  className="h-4 w-4 accent-[#1a3c36]"
                                />
                                <span className="text-xs font-semibold text-slate-800">
                                  {opt.name}
                                </span>
                              </div>
                              {Number(opt.price || 0) > 0 && (
                                <span className="text-xs font-bold text-[#1a3c36]">
                                  +₹{Number(opt.price).toFixed(2)}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Cooking Instructions Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Special Cooking Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={modalCookingNotes}
                  onChange={(e) => setModalCookingNotes(e.target.value)}
                  placeholder="e.g. Less oil, extra spicy, no onions, pack gravy separately"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Modal Bottom Sticky Checkout Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/80 px-6 py-4">
              {/* Quantity Controls */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Qty:
                </span>
                <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                    aria-label="Decrease quantity"
                    className="p-2 text-slate-600 hover:bg-slate-100 transition rounded-l-xl"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-8 text-center text-xs font-bold text-slate-800">
                    {modalQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalQuantity(modalQuantity + 1)}
                    aria-label="Increase quantity"
                    className="p-2 text-slate-600 hover:bg-slate-100 transition rounded-r-xl"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Add to Cart with Calculated Price */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleAddFromModal}
                  className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1a3c36] to-[#25524a] px-6 py-3 text-xs font-bold text-white shadow-md hover:from-[#142f2a] hover:to-[#1e453e] active:scale-98 transition"
                >
                  <ShoppingCart className="h-4 w-4 text-[#d4a843]" />
                  <span>
                    Add to Cart • ₹
                    {(
                      (Number(selectedFood.final_price || selectedFood.mrp || 0) +
                        modalSelectedAddons.reduce((sum, name) => {
                          const addon = selectedFood.addons?.find((a) => a.addon_name === name);
                          return sum + Number(addon?.price || 0);
                        }, 0) +
                        Object.entries(modalCustomizations).reduce((sum, [grpName, val]) => {
                          const group = selectedFood.customizations?.find((g) => g.name === grpName);
                          if (!group) return sum;
                          if (Array.isArray(val)) {
                            return (
                              sum +
                              val.reduce((s, optName) => {
                                const opt = group.options?.find((o) => o.name === optName);
                                return s + Number(opt?.price || 0);
                              }, 0)
                            );
                          }
                          const opt = group.options?.find((o) => o.name === val);
                          return sum + Number(opt?.price || 0);
                        }, 0)) *
                      modalQuantity
                    ).toFixed(2)}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
