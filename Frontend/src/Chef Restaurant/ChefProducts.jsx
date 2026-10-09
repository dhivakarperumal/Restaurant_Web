import { useEffect, useMemo, useState } from "react";
import { Search, UtensilsCrossed, CheckCircle2, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";

const formatPrice = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
}).format(Number(value || 0));

const ChefProducts = () => {
  const [foods, setFoods] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingFoodId, setUpdatingFoodId] = useState("");

  const loadFoods = async () => {
    setLoading(true);
    try {
      const response = await api.get("/foods");
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
  const filteredFoods = foods.filter((food) => [food.food_name, food.category_name]
    .some((value) => String(value || "").toLowerCase().includes(normalizedSearch)));

  const toggleMenuVisibility = async (food) => {
    const nextVisibility = food.is_menu_visible === false;
    setUpdatingFoodId(food.food_id);
    setFoods((current) => current.map((item) => item.food_id === food.food_id
      ? { ...item, is_menu_visible: nextVisibility }
      : item));
    try {
      await api.patch(`/foods/${encodeURIComponent(food.food_id)}/visibility`, {
        is_menu_visible: nextVisibility,
      });
      toast.success(nextVisibility ? "Food is visible to customers and billing." : "Food is hidden from customers and billing.");
    } catch (requestError) {
      setFoods((current) => current.map((item) => item.food_id === food.food_id
        ? { ...item, is_menu_visible: !nextVisibility }
        : item));
      toast.error(requestError.response?.data?.message || "Food visibility could not be updated.");
    } finally {
      setUpdatingFoodId("");
    }
  };

  const activeCount = useMemo(() => foods.filter((f) => (f.status || "Active") === "Active").length, [foods]);
  const visibleCount = useMemo(() => foods.filter((f) => f.is_menu_visible !== false).length, [foods]);
  const hiddenCount = useMemo(() => foods.filter((f) => f.is_menu_visible === false).length, [foods]);

  const statCards = [
    { title: "Total Dishes", value: foods.length, hint: "All menu items", icon: UtensilsCrossed, bg: "bg-[#22c55e]" },
    { title: "Active Status", value: activeCount, hint: "Enabled for ordering", icon: CheckCircle2, bg: "bg-[#3b82f6]" },
    { title: "Menu Visible", value: visibleCount, hint: "Shown to customers", icon: Eye, bg: "bg-[#10b981]" },
    { title: "Hidden Dishes", value: hiddenCount, hint: "Hidden from customer view", icon: EyeOff, bg: hiddenCount > 0 ? "bg-[#f59e0b]" : "bg-[#8b5cf6]" },
  ];

  return (
    <main className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Chef workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">All Foods</h1>
          <p className="mt-1 text-sm text-slate-600">Browse the restaurant food menu.</p>
        </div>
        <span className="text-sm text-slate-600">{foods.length} {foods.length === 1 ? "food" : "foods"}</span>
      </header>

      {/* ── Stats Overview ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <article
              key={stat.title}
              className={`relative min-w-0 overflow-hidden rounded-xl border border-transparent p-4 sm:p-5 shadow-[0_2px_10px_rgba(20,56,34,0.08)] flex flex-col justify-between min-h-[140px] ${stat.bg} text-white`}
            >
              <div className="flex items-start gap-3 relative z-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm bg-white/20">
                  <Icon size={24} strokeWidth={2.2} className="text-white" />
                </div>
                <div className="flex-1 mt-0.5 min-w-0">
                  <h3 className="text-[12px] font-semibold opacity-90 mb-1 truncate">{stat.title}</h3>
                  <div className="text-[26px] font-extrabold leading-none tracking-tight">
                    {loading ? "..." : stat.value}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-5 relative z-10">
                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold bg-white/25">
                  Live
                </span>
                <span className="text-[11px] font-medium opacity-75 truncate">{stat.hint}</span>
              </div>

              <div className="absolute right-0 bottom-0 w-24 h-16 pointer-events-none opacity-50">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                  <defs>
                    <linearGradient id={`chef-prod-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#chef-prod-grad-${index})`} />
                  <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                </svg>
              </div>
            </article>
          );
        })}
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search foods or categories"
          aria-label="Search foods or categories"
          className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-emerald-700"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Food</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Preparation</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Customer & Billing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500">Loading foods...</td></tr>
              ) : error ? (
                <tr><td colSpan="6" className="px-4 py-10 text-center text-rose-700">
                  <p role="alert">{error}</p>
                  <button type="button" onClick={loadFoods} className="mt-2 font-semibold underline">Try again</button>
                </td></tr>
              ) : filteredFoods.length ? filteredFoods.map((food) => (
                <tr key={food.food_id}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{food.food_name || "Unnamed food"}</td>
                  <td className="px-4 py-3 text-slate-600">{food.category_name || "Uncategorized"}</td>
                  <td className="px-4 py-3 text-slate-600">{food.preparation_time ? `${food.preparation_time} min` : "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">{formatPrice(food.final_price)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${food.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                      {food.status || "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={food.is_menu_visible !== false}
                        disabled={updatingFoodId === food.food_id}
                        onChange={() => toggleMenuVisibility(food)}
                        aria-label={`Show ${food.food_name} to customers and billing`}
                        className="h-4 w-4 accent-emerald-700"
                      />
                      Show
                    </label>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500">{foods.length ? "No foods match this search." : "No foods have been added yet."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default ChefProducts;