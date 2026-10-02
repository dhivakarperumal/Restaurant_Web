import { useEffect, useMemo, useState } from "react";
import { Check, ChefHat, Clock3, Coffee, Minus, Plus, Printer, RotateCcw, Search, ShoppingCart, Table2, Trash2, Utensils } from "lucide-react";
import toast from "react-hot-toast";
import api, { BACKEND_BASE_URL } from "../../api";
import { useAuth } from "../../PrivateRouter/AuthContext";

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const getFoodPrice = (food) => Number(food.final_price ?? food.mrp ?? 0);
const getFoodImage = (food) => {
  const image = Array.isArray(food.food_images) ? food.food_images[0] : food.food_images || food.image;
  if (!image) return "";
  if (/^(https?:|data:|blob:)/i.test(image)) return image;
  return `${BACKEND_BASE_URL}${image.startsWith("/") ? image : `/${image}`}`;
};

const PointOfSale = () => {
  const { user } = useAuth();
  const [foods, setFoods] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState("Dine In");
  const [tableNumber, setTableNumber] = useState("T-05");
  const [discount, setDiscount] = useState(0);
  const [billNumber, setBillNumber] = useState(1);
  const [billGenerated, setBillGenerated] = useState(false);
  const [sentToKitchen, setSentToKitchen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadMenu = async () => {
      const [foodResult, categoryResult] = await Promise.allSettled([
        api.get("/foods"),
        api.get("/categories"),
      ]);
      if (!mounted) return;
      if (foodResult.status === "fulfilled") {
        const rows = foodResult.value?.data?.data;
        setFoods(Array.isArray(rows) ? rows.filter((food) => food.status !== "Inactive" && food.is_available !== false) : []);
      } else {
        toast.error("Could not load menu items.");
      }
      if (categoryResult.status === "fulfilled") {
        const rows = categoryResult.value?.data?.data;
        setCategories(Array.isArray(rows) ? rows.filter((category) => category.status !== "Inactive") : []);
      }
      setLoading(false);
    };
    loadMenu();
    return () => { mounted = false; };
  }, []);

  const menuCategories = useMemo(() => {
    if (categories.length) return categories;
    return [...new Map(foods.map((food) => [String(food.category_id || food.category_name), {
      category_id: food.category_id || food.category_name,
      category_name: food.category_name || "Other",
    }])).values()];
  }, [categories, foods]);

  const visibleFoods = useMemo(() => foods.filter((food) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${food.food_name || ""} ${food.description || ""} ${food.category_name || ""}`.toLowerCase().includes(query);
    const matchesCategory = selectedCategory === "all"
      || String(food.category_id || food.category_name) === String(selectedCategory);
    return matchesSearch && matchesCategory;
  }), [foods, search, selectedCategory]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const discountAmount = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const taxableAmount = subtotal - discountAmount;
  const cgst = taxableAmount * 0.025;
  const sgst = taxableAmount * 0.025;
  const total = taxableAmount + cgst + sgst;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const now = new Date();
  const compactDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const invoiceNumber = `#BF${compactDate}-${String(billNumber).padStart(3, "0")}`;
  const cashier = user?.username || user?.name || "Admin";

  const addFood = (food) => {
    const id = String(food.food_id || food.id);
    setCart((current) => {
      const existing = current.find((item) => item.id === id);
      if (existing) return current.map((item) => item.id === id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, {
        id,
        foodId: food.food_id || id,
        name: food.food_name || "Menu item",
        category: food.category_name || "Food",
        portion: food.portion_size || food.serving_size || "Regular",
        image: getFoodImage(food),
        price: getFoodPrice(food),
        quantity: 1,
      }];
    });
    setBillGenerated(false);
    setSentToKitchen(false);
  };

  const updateQuantity = (id, amount) => setCart((current) => current
    .map((item) => item.id === id ? { ...item, quantity: item.quantity + amount } : item)
    .filter((item) => item.quantity > 0));
  const clearOrder = () => {
    setCart([]);
    setDiscount(0);
    setBillGenerated(false);
    setSentToKitchen(false);
  };

  const generateBill = () => {
    if (!cart.length) {
      toast.error("Add a food item before generating a bill.");
      return;
    }
    setBillGenerated(true);
    toast.success("Bill generated.");
  };

  const sendToKitchen = () => {
    if (!cart.length) {
      toast.error("Add a food item before sending to the kitchen.");
      return;
    }
    setSentToKitchen(true);
    toast.success("Order marked as sent to kitchen.");
  };

  const startNewOrder = () => {
    clearOrder();
    setBillNumber((current) => current + 1);
    setSearch("");
    setSelectedCategory("all");
    toast.success("New order started.");
  };

  return (
    <div className="pos-shell flex min-h-screen flex-col bg-[#f3f4f6] text-[#1f2937]">
      <style>{`@media print { body * { visibility: hidden !important; } .pos-bill, .pos-bill * { visibility: visible !important; } .pos-bill { position: absolute; inset: 0; width: 100%; border: 0 !important; box-shadow: none !important; } .pos-actions, .pos-header, .pos-category-rail, .pos-menu { display: none !important; } }`}</style>
      <header className="pos-header flex min-h-[76px] flex-wrap items-center gap-3 border-b border-[#e6d8ca] bg-white px-4 py-3 md:px-6">
        <div className="flex min-w-[190px] items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef5f3] text-[#1a3c36]"><ChefHat className="h-8 w-8" /></div>
          <div className="leading-none"><p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#1a3c36]">Restaurant</p><h1 className="mt-1 text-2xl font-black tracking-tight text-[#1a3c36]">Foodies</h1><p className="mt-1 text-[8px] font-bold uppercase tracking-[0.24em] text-[#66736e]">Taste · Good · Mood</p></div>
        </div>
        <label className="relative min-w-[200px] flex-1 xl:max-w-[420px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#806b5e]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search food items..." className="h-10 w-full rounded-lg border border-[#dfe2e5] bg-[#faf9f8] pl-10 pr-3 text-sm outline-none focus:border-[#1a3c36] focus:ring-2 focus:ring-[#1a3c36]/15" />
        </label>
        <div className="ml-auto flex items-center gap-4 text-xs font-semibold text-[#1f2937]">
          {orderType === "Dine In" && <label className="flex items-center gap-2 border-l border-[#e5e7eb] pl-4"><Table2 className="h-5 w-5 text-[#1a3c36]" /><span className="hidden sm:block">Table</span><select value={tableNumber} onChange={(event) => setTableNumber(event.target.value)} className="bg-transparent font-bold outline-none">{Array.from({ length: 12 }, (_, index) => <option key={index} value={`T-${String(index + 1).padStart(2, "0")}`}>T-{String(index + 1).padStart(2, "0")}</option>)}</select></label>}
          <div className="flex items-center gap-2 border-l border-[#e5e7eb] pl-4"><span className="hidden sm:block">Cashier</span><strong>{cashier}</strong></div>
          <div className="hidden items-center gap-2 border-l border-[#e5e7eb] pl-4 md:flex"><Clock3 className="h-5 w-5 text-[#1a3c36]" /><span>{now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}<br />{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></div>
        </div>
      </header>

      <main className="pos-layout grid min-h-0 flex-1 gap-3 p-3 md:grid-cols-[104px_minmax(0,0.9fr)_minmax(0,1.25fr)] md:gap-2 md:p-2">
        <nav className="pos-category-rail flex gap-2 overflow-x-auto rounded-lg bg-[#f3f4f6] p-2 md:flex-col md:overflow-y-auto">
          <button type="button" onClick={() => setSelectedCategory("all")} className={`flex min-w-[88px] items-center gap-2 rounded-md px-2 py-3 text-left text-xs font-semibold transition md:min-w-0 ${selectedCategory === "all" ? "bg-[#1a3c36] text-white shadow-sm" : "text-[#1f2937] hover:bg-white/80"}`}><Utensils className="h-5 w-5 shrink-0" /><span>All Items</span></button>
          {menuCategories.map((category) => {
            const id = String(category.category_id || category.id || category.category_name);
            const selected = selectedCategory === id;
            const CategoryIcon = /drink|beverage|tea|coffee/i.test(category.category_name) ? Coffee : Utensils;
            return <button key={id} type="button" onClick={() => setSelectedCategory(id)} className={`flex min-w-[88px] items-center gap-2 rounded-md px-2 py-3 text-left text-xs font-semibold transition md:min-w-0 ${selected ? "bg-[#1a3c36] text-white shadow-sm" : "text-[#1f2937] hover:bg-white/80"}`}><CategoryIcon className="h-5 w-5 shrink-0" /><span className="line-clamp-2">{category.category_name}</span></button>;
          })}
        </nav>

        <section className="pos-menu min-h-[35vh] overflow-y-auto rounded-lg bg-white p-2 md:min-h-0 md:p-1">
          {loading ? <div className="flex h-full min-h-40 items-center justify-center text-sm font-medium text-[#806b5e]">Loading menu...</div> : visibleFoods.length ? (
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
              {visibleFoods.map((food) => {
                const id = String(food.food_id || food.id);
                const inCart = cart.some((item) => item.id === id);
                return <article key={id} className={`relative overflow-hidden rounded-lg border bg-white p-1.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${inCart ? "border-[#1a3c36] ring-1 ring-[#1a3c36]/20" : "border-[#e5e7eb]"}`}>
                  <button type="button" onClick={() => addFood(food)} className="block w-full text-left" aria-label={`Add ${food.food_name} to bill`}>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-[#f3f4f6]">
                      {getFoodImage(food) ? <img src={getFoodImage(food)} alt={food.food_name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#66736e]"><Utensils className="h-8 w-8" /></div>}
                      {inCart && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#1a3c36] text-white"><Check className="h-4 w-4" /></span>}
                    </div>
                    <div className="px-1 pb-1 pt-2"><p className="truncate text-xs font-bold text-[#1f2937]">{food.food_name}</p><p className="mt-1 truncate text-[10px] text-[#66736e]">{food.subcategory_name || food.category_name || "Menu item"}</p></div>
                  </button>
                  <div className="flex items-center justify-between px-1 pb-1"><span className="text-xs font-bold text-[#1f2937]">{money(getFoodPrice(food))}</span><button type="button" onClick={() => addFood(food)} className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a3c36] text-white transition hover:bg-[#214a42]" aria-label={`Add ${food.food_name}`} title={`Add ${food.food_name}`}><Plus className="h-4 w-4" /></button></div>
                </article>;
              })}
            </div>
          ) : <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-center text-[#8d7868]"><Utensils className="h-8 w-8" /><p className="text-sm font-semibold">No food items found</p><p className="text-xs">Try another category or search.</p></div>}
        </section>

        <section className="pos-bill flex min-h-[420px] flex-col overflow-hidden rounded-lg border border-[#dfe2e5] bg-white shadow-sm md:min-h-0">
          <div className="flex items-center justify-between bg-[#1a3c36] px-4 py-3 text-white"><h2 className="flex items-center gap-2 text-lg font-bold"><Printer className="h-5 w-5" />Invoice / Bill</h2><button type="button" onClick={generateBill} disabled={!cart.length} className={`inline-flex h-9 w-9 items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-60 ${billGenerated ? "bg-[#347d52]" : "bg-[#214a42] hover:bg-[#2b5b50]"}`} aria-label={billGenerated ? "Bill generated" : "Generate bill"} title={billGenerated ? "Bill generated" : "Generate bill"}><Check className="h-4 w-4" /></button></div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 bg-[#f8faf9] px-4 py-3 text-[11px] text-[#4b5563] sm:text-xs">
            <p className="flex justify-between gap-2"><span>Bill No</span><strong className="text-[#1f2937]">{invoiceNumber}</strong></p><p className="flex justify-between gap-2"><span>Date</span><strong>{now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</strong></p>
            <p className="flex justify-between gap-2"><span>Table No</span><strong>{orderType === "Dine In" ? tableNumber : "-"}</strong></p><p className="flex justify-between gap-2"><span>Time</span><strong>{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</strong></p>
            <label className="col-span-2 flex items-center justify-between gap-2"><span>Order Type</span><select value={orderType} onChange={(event) => setOrderType(event.target.value)} className="rounded border border-[#dfe2e5] bg-white px-2 py-1 font-semibold text-[#1a3c36] outline-none"><option>Dine In</option><option>Takeaway</option><option>Delivery</option></select></label>
          </div>

          <div className="min-h-[140px] flex-1 overflow-auto">
            <table className="w-full min-w-[450px] border-collapse text-left text-[11px]">
              <thead className="sticky top-0 bg-[#1a3c36] text-white"><tr><th className="px-2 py-2">#</th><th className="px-2 py-2">Item</th><th className="px-2 py-2">Portion</th><th className="px-2 py-2 text-center">Qty</th><th className="px-2 py-2 text-right">Price</th><th className="px-2 py-2 text-right">Amount</th><th className="px-1 py-2"></th></tr></thead>
              <tbody className="divide-y divide-[#eee6df]">{cart.map((item, index) => <tr key={item.id}>
                <td className="px-2 py-2 text-[#756458]">{index + 1}</td><td className="px-2 py-2"><div className="flex min-w-0 items-center gap-2">{item.image ? <img src={item.image} alt="" className="h-9 w-9 shrink-0 rounded object-cover" /> : <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[#f4ece3] text-[#87421f]"><Utensils className="h-4 w-4" /></div>}<span className="min-w-0"><strong className="block truncate text-[#2a1a11]">{item.name}</strong><small className="block truncate text-[#8b7769]">{item.category}</small></span></div></td>
                <td className="px-2 py-2 text-[#66564b]">{item.portion}</td><td className="px-2 py-2"><div className="flex items-center justify-center gap-1"><button type="button" onClick={() => updateQuantity(item.id, -1)} className="flex h-6 w-6 items-center justify-center rounded border border-[#e7d8ca] text-[#77340f] hover:bg-[#faf3ec]" aria-label={`Remove one ${item.name}`}><Minus className="h-3 w-3" /></button><span className="w-5 text-center font-semibold">{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.id, 1)} className="flex h-6 w-6 items-center justify-center rounded border border-[#e7d8ca] text-[#77340f] hover:bg-[#faf3ec]" aria-label={`Add one ${item.name}`}><Plus className="h-3 w-3" /></button></div></td><td className="px-2 py-2 text-right">{money(item.price)}</td><td className="px-2 py-2 text-right font-semibold">{money(item.price * item.quantity)}</td><td className="px-1 py-2"><button type="button" onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))} className="p-1 text-[#a14a2b] hover:bg-[#f8e9df]" aria-label={`Remove ${item.name}`}><Trash2 className="h-3.5 w-3.5" /></button></td>
              </tr>)}{!cart.length && <tr><td colSpan="7" className="px-4 py-12 text-center text-sm text-[#907c6c]">Add food from the menu to start this bill.</td></tr>}</tbody>
            </table>
          </div>

          <div className="border-t border-[#eee5dc] px-3 py-2 text-xs text-[#51453c]">
            <div className="flex items-center justify-between py-1"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
            <label className="flex items-center justify-between gap-4 py-1"><span>Discount</span><span className="flex items-center gap-1">₹<input type="number" min="0" max={subtotal} step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} className="w-20 rounded border border-[#e7d8ca] px-2 py-1 text-right outline-none focus:border-[#884017]" /></span></label>
            <div className="flex items-center justify-between py-1"><span>CGST (2.5%)</span><span>{money(cgst)}</span></div><div className="flex items-center justify-between py-1"><span>SGST (2.5%)</span><span>{money(sgst)}</span></div>
          </div>
          <div className="flex items-center justify-between bg-[#702d0b] px-4 py-2.5 text-white"><span className="text-lg font-bold">Grand Total</span><strong className="text-xl">{money(total)}</strong></div>

          <div className="border-t border-[#eadfd4] bg-[#fbf8f4] p-2.5">
            <div className="mb-2 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-bold text-[#5e2c13]"><ShoppingCart className="h-4 w-4" />Selected Items</h3><span className="text-[11px] font-bold text-[#5d4b3e]">Total Items: {itemCount}</span></div>
            <div className="flex gap-2 overflow-x-auto pb-1">{cart.length ? cart.map((item) => <article key={item.id} className="min-w-[112px] max-w-[140px] flex-1 overflow-hidden rounded-md border border-[#e8ddd3] bg-white"><div className="h-16 bg-[#f2e9df]">{item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#92522d]"><Utensils className="h-6 w-6" /></div>}</div><div className="p-1.5"><p className="truncate text-[10px] font-bold">{item.name} ({item.quantity})</p><p className="truncate text-[9px] text-[#806c5e]">{item.portion}</p></div></article>) : <p className="py-2 text-xs text-[#907c6c]">No items selected</p>}</div>
          </div>
        </section>
      </main>

      <footer className="pos-actions flex flex-wrap items-center justify-between gap-2 border-t border-[#e6d8ca] bg-[#fbf8f4] px-3 py-2.5 md:px-4">
        <div className="flex gap-2"><button type="button" onClick={clearOrder} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e6d8ca] bg-white px-3 text-xs font-bold text-[#9a321f] hover:bg-[#fff7f2]"><Trash2 className="h-4 w-4" />Clear All</button><button type="button" onClick={startNewOrder} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e6d8ca] bg-white px-3 text-xs font-bold text-[#78370f] hover:bg-[#fff7f2]"><RotateCcw className="h-4 w-4" />Reset</button></div>
        <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => window.print()} disabled={!billGenerated} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#81380f] px-4 text-xs font-bold text-white hover:bg-[#9c4718] disabled:cursor-not-allowed disabled:opacity-50"><Printer className="h-4 w-4" />Print Bill</button><button type="button" onClick={sendToKitchen} disabled={!cart.length} className="inline-flex h-10 items-center gap-2 rounded-md border border-[#e5d5c7] bg-white px-4 text-xs font-bold text-[#6a3117] hover:bg-[#fff8f1] disabled:opacity-50"><ChefHat className="h-4 w-4" />{sentToKitchen ? "Sent to Kitchen" : "Send to Kitchen"}</button><button type="button" onClick={startNewOrder} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#4f8c30] px-4 text-xs font-bold text-white hover:bg-[#3f7525]"><Check className="h-4 w-4" />New Order</button></div>
      </footer>
    </div>
  );
};

export default PointOfSale;