import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Table2,
  Tag,
  Utensils,
  UtensilsCrossed,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api";
import { useAuth } from "../../PrivateRouter/AuthContext";

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

export default function ServerFood() {
  const { userProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedTable = location.state?.selectedTable;
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
  const [cart, setCart] = useState({});
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [activeBill, setActiveBill] = useState(null);
  const [showBillItems, setShowBillItems] = useState(false);

  // View Details Modal
  const [viewingFood, setViewingFood] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [selectedCustomizations, setSelectedCustomizations] = useState({});
  const [customizeQuantity, setCustomizeQuantity] = useState(1);

  const fetchActiveBill = async () => {
    if (!selectedTable?.table_id) return;
    try {
      const res = await api.get(`/table-bills/active/${selectedTable.table_id}`);
      if (res.data?.success) {
        setActiveBill(res.data.bill || null);
      }
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    fetchActiveBill();
  }, [selectedTable?.table_id]);

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
          String(food.status || "Active").toLowerCase() === "active" &&
          (!selectedTable || food.dining_available !== false);

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
    setSelectedAddons([]);
    setSelectedCustomizations({});
    setCustomizeQuantity(1);
  };

  const getDefaultCartKey = (food) => `${food.food_id || food.id}:default`;
  const getFoodQuantity = (food) => {
    const foodId = String(food.food_id || food.id);
    return Object.values(cart).reduce(
      (total, item) => total + (item.foodId === foodId ? item.quantity : 0),
      0,
    );
  };

  const updateCartQuantity = (food, quantity, cartKey = getDefaultCartKey(food)) => {
    const foodId = String(food.food_id || food.id);
    setCart((currentCart) => {
      const nextCart = { ...currentCart };
      if (quantity <= 0) {
        delete nextCart[cartKey];
      } else {
        const existingItem = currentCart[cartKey];
        nextCart[cartKey] = {
          food,
          foodId,
          quantity: Math.min(quantity, 99),
          selected_addons: existingItem?.selected_addons || [],
          selected_customizations: existingItem?.selected_customizations || {},
          unitPrice: existingItem?.unitPrice ?? Number(food.final_price || 0),
        };
      }
      return nextCart;
    });
  };

  const adjustFoodQuantity = (food, change) => {
    const defaultKey = getDefaultCartKey(food);
    const defaultQuantity = cart[defaultKey]?.quantity || 0;
    if (change > 0) {
      const requiredGroup = (food.customizations || []).find((group) => (
        group.required === true || Number(group.required) === 1 || group.required === "true"
      ));
      if (requiredGroup) {
        handleOpenDetails(food);
        return;
      }
      updateCartQuantity(food, defaultQuantity + 1, defaultKey);
      return;
    }
    if (defaultQuantity > 0) {
      updateCartQuantity(food, defaultQuantity - 1, defaultKey);
      return;
    }
    const foodId = String(food.food_id || food.id);
    const variant = Object.entries(cart).find(([, item]) => item.foodId === foodId);
    if (variant) updateCartQuantity(variant[1].food, variant[1].quantity - 1, variant[0]);
  };

  const getConfiguredUnitPrice = () => {
    if (!viewingFood) return 0;
    const addonPrice = (viewingFood.addons || [])
      .filter((addon) => selectedAddons.includes(addon.addon_name || addon.name))
      .reduce((total, addon) => total + Number(addon.price || 0), 0);
    const customizationPrice = (viewingFood.customizations || []).reduce((total, group) => {
      const selected = selectedCustomizations[group.name];
      const names = Array.isArray(selected) ? selected : selected ? [selected] : [];
      return total + names.reduce((groupTotal, name) => {
        const option = (group.options || []).find((candidate) => candidate.name === name);
        return groupTotal + Number(option?.price || 0);
      }, 0);
    }, 0);
    return Number((Number(viewingFood.final_price || 0) + addonPrice + customizationPrice).toFixed(2));
  };

  const addConfiguredFood = () => {
    if (!viewingFood) return;
    const missingRequiredGroup = (viewingFood.customizations || []).find((group) => {
      const selection = selectedCustomizations[group.name];
      const isRequired = group.required === true || Number(group.required) === 1 || group.required === "true";
      return isRequired
        && (!selection || (Array.isArray(selection) && selection.length === 0));
    });
    if (missingRequiredGroup) {
      toast.error(`Choose ${missingRequiredGroup.name} before adding this item.`);
      return;
    }

    const foodId = String(viewingFood.food_id || viewingFood.id);
    const selectedAddonsCopy = [...selectedAddons].sort();
    const selectedCustomizationsCopy = Object.fromEntries(
      Object.entries(selectedCustomizations)
        .map(([name, selection]) => [name, Array.isArray(selection) ? [...selection].sort() : selection])
        .sort(([first], [second]) => first.localeCompare(second)),
    );
    const cartKey = `${foodId}:${JSON.stringify([selectedAddonsCopy, selectedCustomizationsCopy])}`;
    setCart((currentCart) => {
      const currentQuantity = currentCart[cartKey]?.quantity || 0;
      return {
        ...currentCart,
        [cartKey]: {
          food: viewingFood,
          foodId,
          quantity: Math.min(currentQuantity + customizeQuantity, 99),
          selected_addons: selectedAddonsCopy,
          selected_customizations: selectedCustomizationsCopy,
          unitPrice: getConfiguredUnitPrice(),
        },
      };
    });
    toast.success(`${viewingFood.food_name} added to this order.`);
    setViewingFood(null);
  };

  const cartItems = Object.entries(cart);
  const cartQuantity = cartItems.reduce((total, [, item]) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (total, [, item]) => total + item.unitPrice * item.quantity,
    0,
  );

  const submitOrder = async () => {
    if (!selectedTable?.table_id || cartItems.length === 0) return;
    try {
      setSubmittingOrder(true);
      const response = await api.post("/kitchen-orders", {
        table_id: selectedTable.table_id,
        items: cartItems.map(([, item]) => ({
          food_id: item.foodId,
          quantity: item.quantity,
          selected_addons: item.selected_addons,
          selected_customizations: item.selected_customizations,
        })),
      });
      setCart({});
      const roundNum = response.data?.order?.round_number || (activeBill ? (activeBill.rounds?.length || 1) + 1 : 1);
      const billNum = response.data?.order?.bill_number || activeBill?.bill_number;
      if (roundNum > 1) {
        toast.success(`Round ${roundNum} (Add-on) added to Bill ${billNum ? `#${billNum}` : ''} for Table ${selectedTable.table_number}!`);
      } else {
        toast.success(`Order sent to kitchen for Table ${selectedTable.table_number}! Bill ${billNum ? `#${billNum}` : ''} opened.`);
      }
      fetchActiveBill();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send this order to the kitchen.");
    } finally {
      setSubmittingOrder(false);
    }
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
                {selectedTable ? "Dine-in Ordering" : "View Only"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {selectedTable
                ? "Select dishes and quantities to send this table's order to the kitchen."
                : "Browse dining dishes and beverages configured by administrator."}
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

      {/* Active Dining Bill Banner for Table (Consolidating Rounds) */}
      {selectedTable && activeBill && (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-4 text-white shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-amber-300">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h4 className="flex flex-wrap items-center gap-2 text-sm font-bold sm:text-base">
                  Active Bill #{activeBill.bill_number} for Table {selectedTable.table_number}
                  <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-amber-950">
                    Round {(activeBill.rounds?.length || 1) + 1} Add-on
                  </span>
                </h4>
                <p className="mt-0.5 text-xs text-blue-200">
                  {activeBill.total_items_count} item{activeBill.total_items_count === 1 ? "" : "s"} already ordered (Running Total: ₹{activeBill.grand_total.toFixed(2)}).
                  Any additional dishes selected now will be added to the <strong className="text-white">SAME bill</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBillItems((prev) => !prev)}
              className="self-start rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 sm:self-auto cursor-pointer"
            >
              {showBillItems ? "Hide Ordered Items ▲" : "View Ordered Items ▼"}
            </button>
          </div>

          {showBillItems && (
            <div className="mt-3 rounded-xl border border-blue-400/30 bg-black/20 p-3">
              <p className="mb-2 text-xs font-bold text-blue-200 uppercase tracking-wider">
                Previously Ordered Items on this Bill:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {activeBill.consolidated_items?.map((it) => (
                  <div key={it.food_id} className="rounded-lg bg-white/10 p-2 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-white">{it.food_name}</p>
                      <p className="text-[11px] text-blue-200">{it.quantity} × ₹{it.unit_price}</p>
                    </div>
                    <span className="font-bold text-amber-300">₹{it.total_price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
              String(food.status || "Active").toLowerCase() === "active" &&
              (!selectedTable || food.dining_available !== false);
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
                <div className="space-y-2 p-3 pt-0">
                  {selectedTable && (
                    <div className="flex items-center justify-between rounded-xl bg-gray-50 p-2">
                      <span className="text-xs font-medium text-gray-600">Quantity</span>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => adjustFoodQuantity(food, -1)} aria-label={`Decrease ${food.food_name} quantity`} disabled={!getFoodQuantity(food)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 disabled:cursor-not-allowed disabled:opacity-40">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-5 text-center text-sm font-bold">{getFoodQuantity(food)}</span>
                        <button type="button" onClick={() => adjustFoodQuantity(food, 1)} aria-label={`Increase ${food.food_name} quantity`} disabled={!isAvailable || getFoodQuantity(food) >= 99} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 disabled:cursor-not-allowed disabled:opacity-40">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenDetails(food)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-50 hover:bg-[#1f3228] text-gray-700 hover:text-[#d4a843] rounded-xl text-xs font-semibold transition border border-gray-200 hover:border-[#1f3228] cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{selectedTable ? "Customize & Add" : "View Food Details"}</span>
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
                  <th className="py-3.5 px-4 text-right">{selectedTable ? "Order / Details" : "Details"}</th>
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
                        <div className="flex items-center justify-end gap-2">
                          {selectedTable && (
                            <div className="flex items-center gap-1.5">
                              <button type="button" onClick={() => adjustFoodQuantity(food, -1)} aria-label={`Decrease ${food.food_name} quantity`} disabled={!getFoodQuantity(food)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 disabled:cursor-not-allowed disabled:opacity-40">
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-5 text-center text-xs font-bold">{getFoodQuantity(food)}</span>
                              <button type="button" onClick={() => adjustFoodQuantity(food, 1)} aria-label={`Increase ${food.food_name} quantity`} disabled={!isAvailable || getFoodQuantity(food) >= 99} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 disabled:cursor-not-allowed disabled:opacity-40">
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(food)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-[#1f3228] hover:bg-[#1f3228] hover:text-[#d4a843]"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>{selectedTable ? "Customize & Add" : "View"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {selectedTable && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#d8e5da] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a3c36] text-white">
              <Table2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Selected table</p>
              <p className="text-sm font-bold text-gray-900">
                {selectedTable.table_number}
                {selectedTable.no_of_seats ? ` · ${selectedTable.no_of_seats} seats` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/server/tables")}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-4 py-2.5 text-sm font-semibold text-[#2d2d2d] transition hover:bg-white"
          >
            Change Table
          </button>
        </div>
      )}

      {selectedTable && (
        <section className="rounded-2xl border border-[#e7e0d8] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a3c36] text-white">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                  Order for {selectedTable.table_number}
                  {activeBill && (
                    <span className="text-xs font-bold text-purple-800 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded-full">
                      Same Bill: #{activeBill.bill_number} (Round {(activeBill.rounds?.length || 1) + 1})
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-500">
                  {cartQuantity} item{cartQuantity === 1 ? "" : "s"} selected
                  {activeBill ? ` · ${activeBill.total_items_count} items previously ordered` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">This Round: ₹{cartTotal.toFixed(2)}</p>
                {activeBill && (
                  <p className="text-[11px] text-gray-500">
                    Est. Total: ₹{(Number(activeBill.grand_total || 0) + cartTotal * 1.05).toFixed(2)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={submitOrder}
                disabled={cartItems.length === 0 || submittingOrder}
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-sm font-semibold text-white transition hover:bg-[#214a42] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submittingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                {submittingOrder
                  ? "Sending..."
                  : activeBill
                  ? `Add to Bill (Round ${(activeBill.rounds?.length || 1) + 1}) 🍳`
                  : "Send Order to Kitchen (Round 1) 🍳"}
              </button>
            </div>
          </div>
          {cartItems.length ? (
            <div className="space-y-3">
              {cartItems.map(([cartKey, item]) => (
                <div key={cartKey} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800">{item.food.food_name}</p>
                    {(item.selected_addons.length > 0 || Object.keys(item.selected_customizations).length > 0) && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {[
                          ...item.selected_addons,
                          ...Object.entries(item.selected_customizations).flatMap(([group, selection]) => {
                            const options = Array.isArray(selection) ? selection : [selection];
                            return options.filter(Boolean).map((option) => `${group}: ${option}`);
                          }),
                        ].join(" · ")}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">₹{item.unitPrice.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateCartQuantity(item.food, item.quantity - 1, cartKey)} aria-label={`Decrease ${item.food.food_name} quantity`} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-gray-800">{item.quantity}</span>
                    <button type="button" onClick={() => updateCartQuantity(item.food, item.quantity + 1, cartKey)} aria-label={`Increase ${item.food.food_name} quantity`} disabled={item.quantity >= 99} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Add available dishes below to start this order.</p>
          )}
        </section>
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

            {selectedTable && (
              <div className="mb-5 space-y-5">
                {Array.isArray(viewingFood.addons) && viewingFood.addons.some((addon) => String(addon.status || "Active").toLowerCase() === "active") && (
                  <fieldset className="space-y-2">
                    <legend className="text-xs font-semibold uppercase tracking-wider text-gray-700">Add-ons</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {viewingFood.addons
                        .filter((addon) => String(addon.status || "Active").toLowerCase() === "active")
                        .map((addon) => {
                          const name = addon.addon_name || addon.name;
                          return (
                            <label key={name} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                              <span className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedAddons.includes(name)}
                                  onChange={(event) => setSelectedAddons((current) => event.target.checked
                                    ? [...current, name]
                                    : current.filter((selected) => selected !== name))}
                                  className="h-4 w-4 accent-[#1f3228]"
                                />
                                <span className="font-medium text-gray-800">{name}</span>
                              </span>
                              <span className="text-xs font-semibold text-gray-600">+₹{Number(addon.price || 0).toFixed(2)}</span>
                            </label>
                          );
                        })}
                    </div>
                  </fieldset>
                )}

                {(viewingFood.customizations || []).map((group) => {
                  const isMultiple = String(group.selection_type || "Single").toLowerCase() === "multiple";
                  const selection = selectedCustomizations[group.name];
                  const selectedOptions = Array.isArray(selection) ? selection : selection ? [selection] : [];
                  return (
                    <fieldset key={group.name} className="space-y-2">
                      <legend className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                        {group.name}{(group.required === true || Number(group.required) === 1 || group.required === "true") ? " *" : ""}{" "}
                        <span className="normal-case font-normal text-gray-500">
                          ({isMultiple ? "choose any" : "choose one"})
                        </span>
                      </legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {!(group.required === true || Number(group.required) === 1 || group.required === "true") && !isMultiple && (
                          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm">
                            <input
                              type="radio"
                              name={`customization-${group.name}`}
                              checked={!selection}
                              onChange={() => setSelectedCustomizations((current) => {
                                const next = { ...current };
                                delete next[group.name];
                                return next;
                              })}
                              className="h-4 w-4 accent-[#1f3228]"
                            />
                            <span>No preference</span>
                          </label>
                        )}
                        {(group.options || []).map((option) => (
                          <label key={option.name} className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                            <span className="flex items-center gap-2">
                              <input
                                type={isMultiple ? "checkbox" : "radio"}
                                name={`customization-${group.name}`}
                                checked={selectedOptions.includes(option.name)}
                                onChange={(event) => setSelectedCustomizations((current) => {
                                  if (isMultiple) {
                                    const nextOptions = event.target.checked
                                      ? [...selectedOptions, option.name]
                                      : selectedOptions.filter((name) => name !== option.name);
                                    return { ...current, [group.name]: nextOptions };
                                  }
                                  return { ...current, [group.name]: option.name };
                                })}
                                className="h-4 w-4 accent-[#1f3228]"
                              />
                              <span className="font-medium text-gray-800">{option.name}</span>
                            </span>
                            {Number(option.price || 0) > 0 && (
                              <span className="text-xs font-semibold text-gray-600">+₹{Number(option.price).toFixed(2)}</span>
                            )}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  );
                })}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Quantity</p>
                    <div className="mt-1 flex items-center gap-2">
                      <button type="button" onClick={() => setCustomizeQuantity((quantity) => Math.max(1, quantity - 1))} aria-label="Decrease customized food quantity" className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white"><Minus className="h-4 w-4" /></button>
                      <span className="w-6 text-center text-sm font-bold">{customizeQuantity}</span>
                      <button type="button" onClick={() => setCustomizeQuantity((quantity) => Math.min(99, quantity + 1))} aria-label="Increase customized food quantity" disabled={customizeQuantity >= 99} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white disabled:opacity-50"><Plus className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-gray-900">₹{getConfiguredUnitPrice().toFixed(2)} each</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setViewingFood(null)}
                className="cursor-pointer rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-200"
              >
                {selectedTable ? "Cancel" : "Close Details"}
              </button>
              {selectedTable && (
                <button
                  type="button"
                  onClick={addConfiguredFood}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#1f3228] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#29483b]"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add to order · ₹{(getConfiguredUnitPrice() * customizeQuantity).toFixed(2)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}