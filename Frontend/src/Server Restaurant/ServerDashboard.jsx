import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Flame,
  IndianRupee,
  Info,
  Layers,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Table2,
  Tag,
  Utensils,
  UtensilsCrossed,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";
import { useAuth } from "../PrivateRouter/AuthContext";

const resolveImageUrl = (img) => {
  if (!img || typeof img !== "string") return "";
  if (
    img.startsWith("http://") ||
    img.startsWith("https://") ||
    img.startsWith("data:")
  ) {
    return img;
  }
  const cleanPath = img.startsWith("/") ? img : `/${img}`;
  return `http://localhost:5000${cleanPath}`;
};

export default function ServerDashboard() {
  const { userProfile } = useAuth();
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all"); // 'all' | 'veg' | 'non-veg'
  const [selectedStatus, setSelectedStatus] = useState("all"); // 'all' | 'available' | 'unavailable'
  const [sortBy, setSortBy] = useState("latest");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

  // View Details Modal
  const [viewingFood, setViewingFood] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const fetchFoodsAndCategories = async () => {
    try {
      setLoading(true);
      const [foodsRes, categoriesRes] = await Promise.allSettled([
        api.get("/foods"),
        api.get("/categories"),
      ]);

      if (foodsRes.status === "fulfilled" && foodsRes.value.data?.success) {
        setFoods(foodsRes.value.data.data || []);
      } else if (
        foodsRes.status === "fulfilled" &&
        Array.isArray(foodsRes.value.data)
      ) {
        setFoods(foodsRes.value.data);
      } else {
        setFoods([]);
      }

      if (
        categoriesRes.status === "fulfilled" &&
        categoriesRes.value.data?.data
      ) {
        const catList = Array.isArray(categoriesRes.value.data.data)
          ? categoriesRes.value.data.data
          : [];
        setCategories(catList);
      }
    } catch (error) {
      console.error("Error fetching foods:", error);
      toast.error("Failed to load restaurant food menu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoodsAndCategories();
  }, []);

  // Filtered & Sorted Foods
  const filteredFoods = useMemo(() => {
    return foods
      .filter((food) => {
        const nameMatch =
          !searchQuery ||
          String(food.food_name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          String(food.food_id || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          String(food.category_name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          String(food.cuisine_name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        const categoryMatch =
          selectedCategory === "all" ||
          String(food.category_id || "") === selectedCategory ||
          String(food.category_name || "").toLowerCase() ===
            selectedCategory.toLowerCase();

        const typeMatch =
          selectedType === "all" ||
          (selectedType === "veg" &&
            String(food.food_type || "").toLowerCase() === "veg") ||
          (selectedType === "non-veg" &&
            String(food.food_type || "").toLowerCase().includes("non"));

        const isAvailable =
          Boolean(food.is_available) &&
          String(food.status || "Active").toLowerCase() === "active";

        const statusMatch =
          selectedStatus === "all" ||
          (selectedStatus === "available" && isAvailable) ||
          (selectedStatus === "unavailable" && !isAvailable);

        return nameMatch && categoryMatch && typeMatch && statusMatch;
      })
      .sort((a, b) => {
        if (sortBy === "latest") {
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        }
        if (sortBy === "price-low") {
          return Number(a.final_price || 0) - Number(b.final_price || 0);
        }
        if (sortBy === "price-high") {
          return Number(b.final_price || 0) - Number(a.final_price || 0);
        }
        if (sortBy === "prep-time") {
          return (
            Number(a.preparation_time || 0) - Number(b.preparation_time || 0)
          );
        }
        if (sortBy === "name") {
          return String(a.food_name || "").localeCompare(
            String(b.food_name || "")
          );
        }
        return 0;
      });
  }, [
    foods,
    searchQuery,
    selectedCategory,
    selectedType,
    selectedStatus,
    sortBy,
  ]);

  // Statistics Summary
  const stats = useMemo(() => {
    const total = foods.length;
    const available = foods.filter(
      (f) =>
        Boolean(f.is_available) &&
        String(f.status || "Active").toLowerCase() === "active"
    ).length;
    const vegCount = foods.filter(
      (f) => String(f.food_type || "").toLowerCase() === "veg"
    ).length;
    const nonVegCount = foods.filter((f) =>
      String(f.food_type || "").toLowerCase().includes("non")
    ).length;

    const uniqueCategories = new Set(
      foods.map((f) => f.category_name).filter(Boolean)
    ).size;

    return { total, available, vegCount, nonVegCount, uniqueCategories };
  }, [foods]);

  const handleOpenDetails = (food) => {
    setViewingFood(food);
    setActiveImageIndex(0);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#1f3228] text-[#d4a843] shadow-inner">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-serif">
                Restaurant Food Menu
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3" />
                View Only
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Browse dining dishes and beverages configured by administrator.
              View ingredients, pricing, and availability.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchFoodsAndCategories}
            title="Refresh menu items"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition cursor-pointer text-sm font-medium shadow-sm"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin text-[#d4a843]" : ""}`}
            />
            <span className="hidden sm:inline">Refresh Menu</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            title: "Total Dishes",
            value: stats.total,
            desc: "Configured by admin",
            icon: UtensilsCrossed,
            iconBg: "bg-[#1f3228] text-[#d4a843]",
          },
          {
            title: "Available Today",
            value: stats.available,
            desc: "Ready to serve",
            icon: CheckCircle2,
            iconBg: "bg-emerald-500 text-white",
          },
          {
            title: "Pure Veg Items",
            value: stats.vegCount,
            desc: "Vegetarian selections",
            icon: Sparkles,
            iconBg: "bg-green-600 text-white",
          },
          {
            title: "Non-Veg Dishes",
            value: stats.nonVegCount,
            desc: "Meat & poultry specialties",
            icon: Flame,
            iconBg: "bg-rose-500 text-white",
          },
        ].map(({ title, value, desc, icon: Icon, iconBg }) => (
          <div
            key={title}
            className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3.5 transition hover:shadow-md"
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg} shadow-sm`}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">{title}</p>
              <h3 className="text-2xl font-bold text-gray-900 leading-tight">
                {value}
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search dishes by name, cuisine, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:border-[#d4a843] focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns and View Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-700 outline-none focus:border-[#d4a843]"
            >
              <option value="all">All Categories ({foods.length})</option>
              {categories.map((cat) => (
                <option
                  key={cat.category_id || cat.id}
                  value={cat.category_id || cat.name}
                >
                  {cat.name || cat.category_name}
                </option>
              ))}
            </select>

            {/* Type Dropdown (Veg/Non-Veg) */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-700 outline-none focus:border-[#d4a843]"
            >
              <option value="all">All Types</option>
              <option value="veg">🟢 Veg Only ({stats.vegCount})</option>
              <option value="non-veg">🔴 Non-Veg ({stats.nonVegCount})</option>
            </select>

            {/* Availability Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-700 outline-none focus:border-[#d4a843]"
            >
              <option value="all">All Availability</option>
              <option value="available">Available ({stats.available})</option>
              <option value="unavailable">
                Unavailable ({stats.total - stats.available})
              </option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl text-gray-700 outline-none focus:border-[#d4a843]"
            >
              <option value="latest">Sort: Latest Added</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="prep-time">Prep Time: Quickest</option>
              <option value="name">Name: A to Z</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-xl border border-gray-200 p-1 bg-gray-50">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`cursor-pointer rounded-lg p-1.5 text-xs transition ${viewMode === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`cursor-pointer rounded-lg p-1.5 text-xs transition ${viewMode === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                title="Table view"
              >
                <Table2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white p-14 rounded-2xl border border-gray-100 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#d4a843]" />
          <p className="text-sm text-gray-500 font-medium">
            Fetching restaurant foods from database...
          </p>
        </div>
      ) : filteredFoods.length === 0 ? (
        <div className="bg-white p-14 rounded-2xl border border-gray-100 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#1f3228]/10 text-[#1f3228] flex items-center justify-center mx-auto">
            <UtensilsCrossed className="w-8 h-8 text-[#d4a843]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">No dishes found</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
              {searchQuery ||
              selectedCategory !== "all" ||
              selectedType !== "all" ||
              selectedStatus !== "all"
                ? "No food items match your filter criteria. Try clearing search or filters."
                : "No dishes have been added by the administrator yet."}
            </p>
          </div>
          {(searchQuery ||
            selectedCategory !== "all" ||
            selectedType !== "all" ||
            selectedStatus !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedType("all");
                setSelectedStatus("all");
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* GRID (CARD) VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredFoods.map((food) => {
            const isVeg = String(food.food_type || "").toLowerCase() === "veg";
            const isAvailable =
              Boolean(food.is_available) &&
              String(food.status || "Active").toLowerCase() === "active";
            const primaryImage =
              Array.isArray(food.food_images) && food.food_images.length > 0
                ? food.food_images[0]
                : "";

            return (
              <div
                key={food.food_id || food.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Card Image */}
                  <div className="relative h-44 w-full bg-gray-100 overflow-hidden">
                    {primaryImage ? (
                      <img
                        src={resolveImageUrl(primaryImage)}
                        alt={food.food_name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.target.style.display = "none";
                          if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = "flex";
                          }
                        }}
                      />
                    ) : null}
                    <div
                      style={{ display: primaryImage ? "none" : "flex" }}
                      className="w-full h-full items-center justify-center bg-gradient-to-br from-[#1f3228]/5 to-[#1f3228]/15 text-[#1f3228]/40"
                    >
                      <UtensilsCrossed className="w-12 h-12" />
                    </div>

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      {/* Veg / Non-Veg Indicator */}
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded bg-white shadow-sm border ${
                          isVeg ? "border-green-600" : "border-rose-600"
                        }`}
                        title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isVeg ? "bg-green-600" : "bg-rose-600"
                          }`}
                        />
                      </span>

                      {food.is_spicy ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-sm">
                          <Flame className="w-3 h-3" /> Spicy
                        </span>
                      ) : null}
                    </div>

                    {/* Availability status badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-sm backdrop-blur-sm ${
                          isAvailable
                            ? "bg-emerald-500/90 text-white"
                            : "bg-gray-800/80 text-gray-200"
                        }`}
                      >
                        {isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </div>

                    {/* Preparation Time */}
                    {food.preparation_time ? (
                      <div className="absolute bottom-2.5 right-2.5 bg-black/60 text-white text-[11px] font-medium px-2 py-0.5 rounded-md backdrop-blur-sm flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{food.preparation_time}m</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between gap-1 text-[11px] text-gray-400">
                        <span className="font-mono font-medium">
                          {food.food_id}
                        </span>
                        <span className="truncate max-w-[120px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-medium">
                          {food.category_name || "General"}
                        </span>
                      </div>
                      <h3
                        className="font-bold text-gray-900 text-base mt-1 line-clamp-1 group-hover:text-[#1a3c36] transition-colors"
                        title={food.food_name}
                      >
                        {food.food_name}
                      </h3>
                      {food.cuisine_name ? (
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {food.cuisine_name} Cuisine
                        </p>
                      ) : null}
                    </div>

                    {/* Pricing */}
                    <div className="flex items-baseline gap-2 pt-1 border-t border-gray-100">
                      <span className="text-lg font-bold text-gray-900">
                        ₹{Number(food.final_price || 0).toFixed(2)}
                      </span>
                      {Number(food.mrp || 0) > Number(food.final_price || 0) && (
                        <span className="text-xs text-gray-400 line-through">
                          ₹{Number(food.mrp || 0).toFixed(2)}
                        </span>
                      )}
                      {Number(food.discount || 0) > 0 && (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {Number(food.discount)}% OFF
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer: View Details Action */}
                <div className="p-3 pt-0">
                  <button
                    type="button"
                    onClick={() => handleOpenDetails(food)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-50 hover:bg-[#1f3228] text-gray-700 hover:text-[#d4a843] rounded-xl text-xs font-semibold transition border border-gray-200 hover:border-[#1f3228] cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Food Details</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE (LIST) VIEW */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Dish Details</th>
                  <th className="py-3.5 px-4">Category & Cuisine</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Prep Time</th>
                  <th className="py-3.5 px-4">Price / MRP</th>
                  <th className="py-3.5 px-4">Availability</th>
                  <th className="py-3.5 px-4 text-right">View Only</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFoods.map((food) => {
                  const isVeg =
                    String(food.food_type || "").toLowerCase() === "veg";
                  const isAvailable =
                    Boolean(food.is_available) &&
                    String(food.status || "Active").toLowerCase() === "active";
                  const primaryImage =
                    Array.isArray(food.food_images) &&
                    food.food_images.length > 0
                      ? food.food_images[0]
                      : "";

                  return (
                    <tr
                      key={food.food_id || food.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      {/* Dish Details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0 overflow-hidden border border-gray-200">
                            {primaryImage ? (
                              <img
                                src={resolveImageUrl(primaryImage)}
                                alt={food.food_name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Utensils className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-gray-900 leading-tight">
                                {food.food_name}
                              </h4>
                              {food.is_spicy ? (
                                <Flame className="w-3.5 h-3.5 text-rose-500" />
                              ) : null}
                            </div>
                            <span className="text-xs text-gray-400 font-mono">
                              {food.food_id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category & Cuisine */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800 text-xs">
                            {food.category_name || "General"}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {food.cuisine_name || "Standard"}
                          </span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isVeg
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isVeg ? "bg-green-600" : "bg-rose-600"
                            }`}
                          />
                          {isVeg ? "Veg" : "Non-Veg"}
                        </span>
                      </td>

                      {/* Prep Time */}
                      <td className="py-3 px-4 text-xs text-gray-600">
                        {food.preparation_time ? (
                          <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md font-medium">
                            <Clock className="w-3 h-3 text-gray-500" />
                            {food.preparation_time} min
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 text-sm">
                            ₹{Number(food.final_price || 0).toFixed(2)}
                          </span>
                          {Number(food.mrp || 0) >
                            Number(food.final_price || 0) && (
                            <span className="text-[11px] text-gray-400 line-through">
                              ₹{Number(food.mrp || 0).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Availability */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isAvailable
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-gray-100 text-gray-600 border border-gray-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAvailable ? "bg-emerald-500" : "bg-gray-400"
                            }`}
                          />
                          {isAvailable ? "Available" : "Unavailable"}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(food)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 hover:border-[#1f3228] text-gray-700 hover:text-[#d4a843] hover:bg-[#1f3228] text-xs font-semibold transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW-ONLY FOOD DETAILS MODAL */}
      {viewingFood && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-gray-100 relative">
            {/* Close Button */}
            <button
              onClick={() => setViewingFood(null)}
              className="absolute right-4 top-4 p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-start gap-4 mb-5 pb-4 border-b border-gray-100">
              <div className="p-3 rounded-2xl bg-[#1f3228] text-[#d4a843] shadow-inner shrink-0">
                <Utensils className="w-6 h-6" />
              </div>
              <div className="pr-8">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {viewingFood.food_id}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      String(viewingFood.food_type || "").toLowerCase() ===
                      "veg"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {String(viewingFood.food_type || "").toLowerCase() ===
                    "veg"
                      ? "Pure Veg"
                      : "Non-Veg"}
                  </span>
                  {viewingFood.is_spicy ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                      <Flame className="w-3 h-3 text-rose-500" /> Spicy
                    </span>
                  ) : null}
                </div>
                <h2 className="text-xl font-bold text-gray-900 font-serif mt-1">
                  {viewingFood.food_name}
                </h2>
                <p className="text-xs text-gray-500">
                  {viewingFood.category_name} • {viewingFood.cuisine_name} Cuisine
                </p>
              </div>
            </div>

            {/* Images Carousel / Gallery */}
            {Array.isArray(viewingFood.food_images) &&
            viewingFood.food_images.length > 0 ? (
              <div className="mb-5 space-y-2">
                <div className="h-60 w-full rounded-xl bg-gray-100 overflow-hidden border border-gray-200 relative">
                  <img
                    src={resolveImageUrl(
                      viewingFood.food_images[activeImageIndex] ||
                        viewingFood.food_images[0]
                    )}
                    alt={viewingFood.food_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {viewingFood.food_images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {viewingFood.food_images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                          activeImageIndex === idx
                            ? "border-[#1f3228] scale-105"
                            : "border-gray-200 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={resolveImageUrl(img)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* Price & Summary Box */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs text-gray-500 font-medium">
                  Price per item
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    ₹{Number(viewingFood.final_price || 0).toFixed(2)}
                  </span>
                  {Number(viewingFood.mrp || 0) >
                    Number(viewingFood.final_price || 0) && (
                    <span className="text-sm text-gray-400 line-through">
                      ₹{Number(viewingFood.mrp || 0).toFixed(2)}
                    </span>
                  )}
                  {Number(viewingFood.discount || 0) > 0 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {Number(viewingFood.discount)}% OFF
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    Boolean(viewingFood.is_available) &&
                    String(viewingFood.status || "Active").toLowerCase() ===
                      "active"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      Boolean(viewingFood.is_available) &&
                      String(viewingFood.status || "Active").toLowerCase() ===
                        "active"
                        ? "bg-emerald-500"
                        : "bg-gray-400"
                    }`}
                  />
                  {Boolean(viewingFood.is_available) &&
                  String(viewingFood.status || "Active").toLowerCase() ===
                    "active"
                    ? "Available in Kitchen"
                    : "Currently Unavailable"}
                </span>
              </div>
            </div>

            {/* Detailed Properties Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 font-medium">Preparation Time</span>
                <p className="font-bold text-gray-800 text-sm mt-0.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  {viewingFood.preparation_time
                    ? `${viewingFood.preparation_time} mins`
                    : "Instant"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 font-medium">Portion / Serving</span>
                <p className="font-bold text-gray-800 text-sm mt-0.5">
                  {viewingFood.portion_size || viewingFood.serving_size || "1 Portion"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 font-medium">Cuisine</span>
                <p className="font-bold text-gray-800 text-sm mt-0.5">
                  {viewingFood.cuisine_name || "Standard"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 font-medium">Dining Option</span>
                <p className="font-bold text-emerald-700 text-sm mt-0.5">
                  {viewingFood.dining_available !== false
                    ? "✓ Dine-in Available"
                    : "✗ No Dine-in"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 font-medium">Takeaway</span>
                <p className="font-bold text-blue-700 text-sm mt-0.5">
                  {viewingFood.takeaway_available !== false
                    ? "✓ Takeaway Allowed"
                    : "✗ No Takeaway"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-400 font-medium">Delivery</span>
                <p className="font-bold text-purple-700 text-sm mt-0.5">
                  {viewingFood.delivery_available !== false
                    ? "✓ Delivery Available"
                    : "✗ No Delivery"}
                </p>
              </div>
            </div>

            {/* Description */}
            {viewingFood.description ? (
              <div className="mb-5 space-y-1">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Description & Ingredients
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                  {viewingFood.description}
                </p>
              </div>
            ) : null}

            {/* Addons / Customizations if available */}
            {Array.isArray(viewingFood.addons) &&
            viewingFood.addons.length > 0 ? (
              <div className="mb-5 space-y-1">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Available Add-ons
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {viewingFood.addons.map((addon, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-gray-100 text-gray-800 text-xs rounded-lg font-medium"
                    >
                      {addon.name || addon.addon_name || JSON.stringify(addon)}{" "}
                      {addon.price ? `(+₹${addon.price})` : ""}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Modal Bottom: Close Button */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setViewingFood(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-semibold transition cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}