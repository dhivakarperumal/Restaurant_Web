import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Copy,
  IndianRupee,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Table2,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api";

const tableStatus = (table) => (
  Number(table.reservation_is_active) === 1 ? "Reserved" : table.status || "Available"
);

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const diffMinutes = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  const remainingMins = diffMinutes % 60;
  return `${diffHours}h ${remainingMins}m ago`;
};

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const PointOfSale = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [activeBills, setActiveBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showTables, setShowTables] = useState(false);
  const [orderDraft, setOrderDraft] = useState(() => location.state?.orderDraft || null);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "bills" | "tables"
  const [tableFilter, setTableFilter] = useState("all"); // "all" | "Available" | "Occupied" | "Reserved"
  const [viewMode, setViewMode] = useState("card"); // "card" | "table"
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const selectionLock = useRef(false);

  const loadBillingData = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const [tablesResponse, billsResponse] = await Promise.all([
        api.get("/server-tables"),
        api.get("/table-bills", { params: { status: "Active" } }),
      ]);
      if (!tablesResponse.data?.success || !Array.isArray(tablesResponse.data.tables)) {
        throw new Error(tablesResponse.data?.message || "Table data was invalid.");
      }
      if (!billsResponse.data?.success || !Array.isArray(billsResponse.data.bills)) {
        throw new Error(billsResponse.data?.message || "Active bill data was invalid.");
      }
      setTables(tablesResponse.data.tables);
      setActiveBills(billsResponse.data.bills);
      setLastUpdated(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (requestError) {
      console.error("Could not load billing data:", requestError);
      setError(requestError.response?.data?.message || requestError.message || "Billing data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBillingData({ showLoading: false });
  }, [loadBillingData]);

  useEffect(() => {
    if (!location.state?.openTableSelector) return;
    setSheetOpen(true);
    setShowTables(true);
    loadBillingData();
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, loadBillingData, navigate]);

  const closeOrderSelector = useCallback(() => {
    setSheetOpen(false);
    setShowTables(false);
    if (orderDraft?.selectedTable) {
      navigate("/admin/billing/order", {
        state: {
          orderType: "dine-in",
          returnPath: "/admin/billing",
          selectedTable: orderDraft.selectedTable,
          orderDraft: {
            cart: orderDraft.cart,
            customer: orderDraft.customer,
          },
        },
      });
    } else {
      setOrderDraft(null);
    }
  }, [navigate, orderDraft]);

  useEffect(() => {
    if (!sheetOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !selectionLock.current) {
        closeOrderSelector();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [sheetOpen, closeOrderSelector]);

  const openOrderType = (orderType) => {
    if (selectionLock.current) return;
    if (orderType === "dine-in") {
      setShowTables(true);
      loadBillingData();
      return;
    }
    setOrderDraft(null);
    selectionLock.current = true;
    setSheetOpen(false);
    navigate("/admin/billing/order", { state: { orderType, returnPath: "/admin/billing" } });
    window.setTimeout(() => { selectionLock.current = false; }, 350);
  };

  const selectTable = (table) => {
    if (selectionLock.current) return;
    const status = tableStatus(table);
    if (!["Available", "Occupied"].includes(status)) return;
    selectionLock.current = true;
    setSheetOpen(false);
    setShowTables(false);
    navigate("/admin/billing/order", {
      state: {
        orderType: "dine-in",
        returnPath: "/admin/billing",
        selectedTable: {
          id: table.id ?? null,
          table_id: table.table_id || null,
          table_number: table.table_number,
          no_of_seats: table.no_of_seats,
        },
        ...(orderDraft ? {
          orderDraft: {
            cart: orderDraft.cart,
            customer: orderDraft.customer,
          },
        } : {}),
      },
    });
    window.setTimeout(() => { selectionLock.current = false; }, 350);
  };

  const goToBills = () => navigate("/admin/tables");

  const addItemsToActiveBill = (bill) => {
    if (!bill.table_id) {
      setError(`Could not find the table for bill #${bill.bill_number}. Refresh and try again.`);
      return;
    }
    navigate("/admin/billing/order", {
      state: {
        orderType: "dine-in",
        returnPath: "/admin/billing",
        selectedTable: {
          table_id: bill.table_id,
          table_number: bill.table_number,
        },
      },
    });
  };

  const completeActiveBill = (bill) => {
    navigate("/admin/tables", { state: { openBillId: bill.bill_id } });
  };

  const copyBillNumber = (billNumber, event) => {
    event?.stopPropagation();
    if (!billNumber) return;
    navigator.clipboard?.writeText(billNumber);
    toast.success(`Copied #${billNumber}`);
  };

  // Metrics
  const availableCount = tables.filter((table) => tableStatus(table) === "Available").length;
  const occupiedCount = tables.filter((table) => tableStatus(table) === "Occupied").length;
  const reservedCount = tables.filter((table) => tableStatus(table) === "Reserved").length;
  const totalTables = tables.length;
  const totalRunningBalance = activeBills.reduce((sum, b) => sum + Number(b.grand_total || 0), 0);
  const capacityPercent = totalTables > 0 ? Math.round((availableCount / totalTables) * 100) : 0;

  // Table to active bill lookup
  const billsByTableId = useMemo(() => {
    const map = new Map();
    for (const bill of activeBills) {
      if (bill.table_id != null) {
        map.set(String(bill.table_id), bill);
      }
    }
    return map;
  }, [activeBills]);

  // Filtered lists
  const filteredActiveBills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeBills;
    return activeBills.filter((bill) => {
      const billNum = String(bill.bill_number || "").toLowerCase();
      const tableNum = String(bill.table_number || "").toLowerCase();
      const serverName = String(bill.server_name || "").toLowerCase();
      return billNum.includes(q) || tableNum.includes(q) || serverName.includes(q);
    });
  }, [activeBills, searchQuery]);

  const filteredTables = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tables.filter((table) => {
      const status = tableStatus(table);
      if (tableFilter !== "all" && status !== tableFilter) return false;
      if (!q) return true;
      const tableNum = String(table.table_number || "").toLowerCase();
      const serverName = String(table.assigned_server_name || "").toLowerCase();
      const existingBill = billsByTableId.get(String(table.table_id || table.id));
      const billNum = String(existingBill?.bill_number || "").toLowerCase();
      return tableNum.includes(q) || serverName.includes(q) || billNum.includes(q) || status.toLowerCase().includes(q);
    });
  }, [tables, tableFilter, searchQuery, billsByTableId]);

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Hero Header */}
        <header className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                  </span>
                  Live POS Terminal
                </span>
                {lastUpdated && (
                  <span className="text-xs text-slate-400">
                    Synced {lastUpdated}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                Billing & Orders
              </h1>
              
            </div>

            <div className="flex flex-wrap items-center gap-3">
            

              <button
                type="button"
                onClick={goToBills}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
              >
                <Table2 className="h-4 w-4 text-slate-500" />
                <span>Floor Workspace</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/billing/history")}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
              >
                <Receipt className="h-4 w-4 text-slate-500" />
                <span>Bill History</span>
              </button>

              <button
                type="button"
                onClick={() => { setShowTables(false); setSheetOpen(true); }}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0A4731] px-5 text-sm font-bold text-white shadow-md shadow-emerald-950/20 transition hover:bg-[#062D22] active:scale-95"
              >
                <Plus size={18} strokeWidth={2.6} />
                <span>Start New Order</span>
              </button>
            </div>
          </div>
        </header>

        {/* Error Alert */}
        {error && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800 shadow-xs">
            <span className="flex items-center gap-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-rose-200 text-rose-800 font-bold text-xs">!</span>
              {error}
            </span>
            <button
              type="button"
              onClick={() => loadBillingData()}
              className="rounded-lg bg-rose-100 px-3 py-1 font-bold text-rose-900 transition hover:bg-rose-200"
            >
              Try again
            </button>
          </div>
        )}

        {/* Metric Summary Cards */}
        <section aria-label="POS Key Metrics" className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
          {/* Available Tables */}
          <article
            onClick={() => { setActiveTab("tables"); setTableFilter("Available"); }}
            className={`group cursor-pointer rounded-2xl border bg-white p-4.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${tableFilter === "Available" && activeTab === "tables" ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200/90"}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-700 transition-colors">
                Available Tables
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CheckCircle2 size={18} />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {loading ? "—" : availableCount}
              </span>
              <span className="text-xs font-semibold text-emerald-700">
                {capacityPercent}% free
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-400">
              Ready for walk-in seating
            </p>
          </article>

          {/* Occupied Tables */}
          <article
            onClick={() => { setActiveTab("tables"); setTableFilter("Occupied"); }}
            className={`group cursor-pointer rounded-2xl border bg-white p-4.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${tableFilter === "Occupied" && activeTab === "tables" ? "border-amber-500 ring-2 ring-amber-500/20" : "border-slate-200/90"}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-700 transition-colors">
                Occupied Tables
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
                <UtensilsCrossed size={18} />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {loading ? "—" : occupiedCount}
              </span>
              <span className="text-xs font-semibold text-amber-700">
                {occupiedCount > 0 ? "Dining now" : "None"}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-400">
              Active service & orders
            </p>
          </article>

          {/* Reserved Tables */}
          <article
            onClick={() => { setActiveTab("tables"); setTableFilter("Reserved"); }}
            className={`group cursor-pointer rounded-2xl border bg-white p-4.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${tableFilter === "Reserved" && activeTab === "tables" ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200/90"}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-700 transition-colors">
                Reserved
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                <Users size={18} />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {loading ? "—" : reservedCount}
              </span>
              <span className="text-xs font-semibold text-blue-700">
                Bookings
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-400">
              Scheduled table holds
            </p>
          </article>

          {/* Active Running Bills */}
          <article
            onClick={() => setActiveTab("bills")}
            className={`group cursor-pointer rounded-2xl border bg-white p-4.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${activeTab === "bills" ? "border-purple-500 ring-2 ring-purple-500/20" : "border-slate-200/90"}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-purple-700 transition-colors">
                Active Bills
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
                <Receipt size={18} />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {loading ? "—" : activeBills.length}
              </span>
              <span className="text-xs font-semibold text-purple-700">
                Open tickets
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-400">
              Awaiting settlement
            </p>
          </article>

          {/* Live Floor Balance */}
          <article
            onClick={() => setActiveTab("bills")}
            className="col-span-2 sm:col-span-2 lg:col-span-1 group cursor-pointer rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-white to-white p-4.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                Floor Running Total
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0A4731] text-white shadow-xs">
                <IndianRupee size={17} />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-black text-slate-900 sm:text-[26px]">
                {loading ? "—" : formatCurrency(totalRunningBalance)}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-emerald-800">
              Live unsettled dining revenue
            </p>
          </article>
        </section>

        {/* Quick Order Starter Launchers */}
        <section aria-label="Fast POS Launchers" className="grid gap-3.5 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => { setShowTables(true); setSheetOpen(true); }}
            className="group flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          >
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-100 transition-transform group-hover:scale-105">
                <Table2 size={22} />
              </div>
              <div>
                <span className="block text-sm font-black text-slate-900">Dine-In Order</span>
                <span className="text-xs text-slate-500">Assign table & generate KOT</span>
              </div>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-400 transition-colors group-hover:bg-[#0A4731] group-hover:text-white">
              <ChevronRight size={16} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => openOrderType("pickup")}
            className="group flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
          >
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-100 transition-transform group-hover:scale-105">
                <ShoppingBag size={22} />
              </div>
              <div>
                <span className="block text-sm font-black text-slate-900">Takeaway / Pick-Up</span>
                <span className="text-xs text-slate-500">Fast counter order & checkout</span>
              </div>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-400 transition-colors group-hover:bg-amber-600 group-hover:text-white">
              <ChevronRight size={16} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => openOrderType("home_delivery")}
            className="group flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-800 border border-blue-100 transition-transform group-hover:scale-105">
                <Bike size={22} />
              </div>
              <div>
                <span className="block text-sm font-black text-slate-900">Home Delivery</span>
                <span className="text-xs text-slate-500">Address, customer & rider dispatch</span>
              </div>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-400 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <ChevronRight size={16} />
            </div>
          </button>
        </section>

        {/* View Controls & Filter Bar: Left side Search & Filters, Right side Card/Table Mode */}
        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
          {/* LEFT SIDE: Search input & all filters */}
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
            {/* Real-time search */}
            <div className="relative w-full sm:w-64 md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search table, bill #, server..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Scope tabs */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${activeTab === "all" ? "bg-white text-emerald-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                <Sparkles size={13} />
                <span>All</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("bills")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${activeTab === "bills" ? "bg-white text-emerald-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                <Receipt size={13} />
                <span>Bills</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "bills" ? "bg-emerald-100 text-emerald-800 font-bold" : "bg-slate-200 text-slate-700 font-medium"}`}>
                  {activeBills.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("tables")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${activeTab === "tables" ? "bg-white text-emerald-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                <Table2 size={13} />
                <span>Tables</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "tables" ? "bg-emerald-100 text-emerald-800 font-bold" : "bg-slate-200 text-slate-700 font-medium"}`}>
                  {tables.length}
                </span>
              </button>
            </div>

            {/* Status Filters */}
            {(activeTab === "tables" || activeTab === "all") && (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {[
                  { id: "all", label: "All" },
                  { id: "Available", label: `Available (${availableCount})` },
                  { id: "Occupied", label: `Occupied (${occupiedCount})` },
                  { id: "Reserved", label: `Reserved (${reservedCount})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTableFilter(f.id)}
                    className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${tableFilter === f.id ? "bg-slate-800 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT SIDE: Card Mode / Table Mode Switcher */}
          <div className="flex shrink-0 items-center justify-end gap-2">
            <div className="flex h-10 items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode("card")}
                aria-label="Card mode"
                aria-pressed={viewMode === "card"}
                title="Card mode"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${viewMode === "card" ? "bg-white text-emerald-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                <LayoutGrid size={15} />
                
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                aria-label="Table mode"
                aria-pressed={viewMode === "table"}
                title="Table mode"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${viewMode === "table" ? "bg-white text-emerald-900 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                <List size={15} />
                
              </button>
            </div>
          </div>
        </section>

        {/* ACTIVE BILLS SECTION */}
        {(activeTab === "all" || activeTab === "bills") && (
          <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">Active Dining Bills</h2>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    {filteredActiveBills.length} Active
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Orders stay active until final table payment and settlement.
                </p>
              </div>
              <button
                type="button"
                onClick={goToBills}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 transition hover:text-emerald-950 hover:underline"
              >
                <span>Full Settlement Desk</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {loading ? (
              <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
                <span>Loading active dining bills…</span>
              </div>
            ) : filteredActiveBills.length > 0 ? (
              viewMode === "card" ? (
                /* Card Mode */
                <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredActiveBills.map((bill) => (
                    <article
                      key={bill.bill_id}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                    >
                      <div>
                        {/* Top Row: Table & Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-100 font-black">
                              <Table2 size={20} />
                            </span>
                            <div>
                              <h3 className="text-base font-black text-slate-900">
                                Table {bill.table_number}
                              </h3>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span>#{bill.bill_number}</span>
                                <button
                                  type="button"
                                  onClick={(e) => copyBillNumber(bill.bill_number, e)}
                                  title="Copy bill number"
                                  className="text-slate-400 hover:text-slate-700"
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200/60">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            Active
                          </span>
                        </div>

                        {/* Middle Row: Details & Timing */}
                        <div className="mt-4 space-y-2 rounded-xl bg-slate-50/80 p-3 text-xs text-slate-600">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-slate-500">
                              <Clock size={13} />
                              <span>Started</span>
                            </span>
                            <span className="font-semibold text-slate-800">
                              {formatTime(bill.created_at)} ({getTimeAgo(bill.created_at)})
                            </span>
                          </div>
                          {bill.server_name && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Assigned Server</span>
                              <span className="font-semibold text-slate-800">{bill.server_name}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
                            <span className="font-semibold text-slate-500">Grand Total</span>
                            <span className="text-base font-black text-emerald-800">
                              {formatCurrency(bill.grand_total)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Buttons */}
                      <div className="mt-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => addItemsToActiveBill(bill)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800 active:scale-95"
                        >
                          <Plus size={14} />
                          <span>Add Items</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => completeActiveBill(bill)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0A4731] py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#062D22] active:scale-95"
                        >
                          <Receipt size={14} />
                          <span>Settle Bill</span>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                /* Table Mode */
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3.5 px-5">Table</th>
                        <th className="py-3.5 px-4">Bill Number</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Started Time</th>
                        <th className="py-3.5 px-4">Assigned Server</th>
                        <th className="py-3.5 px-4 text-right">Grand Total</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredActiveBills.map((bill) => (
                        <tr key={bill.bill_id} className="transition hover:bg-slate-50/80">
                          <td className="py-3.5 px-5 font-black text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-100">
                                <Table2 size={16} />
                              </span>
                              <span>Table {bill.table_number}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <span>#{bill.bill_number}</span>
                              <button
                                type="button"
                                onClick={(e) => copyBillNumber(bill.bill_number, e)}
                                title="Copy bill number"
                                className="text-slate-400 hover:text-slate-700"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200/60">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                              Active
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            <div className="font-semibold text-slate-800">{formatTime(bill.created_at)}</div>
                            <div className="text-[10px] text-slate-400">{getTimeAgo(bill.created_at)}</div>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-700">
                            {bill.server_name || "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-emerald-800 text-sm">
                            {formatCurrency(bill.grand_total)}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => addItemsToActiveBill(bill)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800 active:scale-95"
                              >
                                + Items
                              </button>
                              <button
                                type="button"
                                onClick={() => completeActiveBill(bill)}
                                className="rounded-lg bg-[#0A4731] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#062D22] active:scale-95"
                              >
                                Settle
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-slate-100 text-slate-400">
                  <CircleDollarSign size={28} />
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-800">No active dining bills</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  When a dine-in order is sent to the kitchen, its running table bill appears here for instant management.
                </p>
                <button
                  type="button"
                  onClick={() => { setShowTables(true); setSheetOpen(true); }}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0A4731] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#062D22]"
                >
                  <Plus size={14} />
                  <span>Start Dine-In Order</span>
                </button>
              </div>
            )}
          </section>
        )}

        {/* FLOOR TABLES SECTION */}
        {(activeTab === "all" || activeTab === "tables") && (
          <section className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">Dining Floor Plan & Tables</h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                    {filteredTables.length} Tables
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Select any available table to seat guests, or review occupied bills directly from the floor.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Available
                  <span className="ml-2 h-2 w-2 rounded-full bg-amber-500" /> Occupied
                  <span className="ml-2 h-2 w-2 rounded-full bg-blue-500" /> Reserved
                </span>
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
                <span>Loading tables…</span>
              </div>
            ) : filteredTables.length > 0 ? (
              viewMode === "card" ? (
                /* Card Mode */
                <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredTables.map((table) => {
                    const status = tableStatus(table);
                    const isAvailable = status === "Available";
                    const isOccupied = status === "Occupied";
                    const isReserved = status === "Reserved";
                    const activeBill = billsByTableId.get(String(table.table_id || table.id));

                    return (
                      <article
                        key={table.table_id || table.id}
                        className={`group relative flex flex-col justify-between rounded-2xl border p-4.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                          isAvailable
                            ? "border-emerald-200/90 bg-emerald-50/20 hover:border-emerald-400"
                            : isOccupied
                            ? "border-amber-200/90 bg-amber-50/20 hover:border-amber-400"
                            : "border-blue-200/90 bg-blue-50/20 hover:border-blue-400"
                        }`}
                      >
                        <div>
                          {/* Table Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`grid h-10 w-10 place-items-center rounded-xl font-black ${
                                  isAvailable
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isOccupied
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                <Table2 size={18} />
                              </span>
                              <div>
                                <h3 className="text-base font-black text-slate-900">
                                  Table {table.table_number}
                                </h3>
                                <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                  <Users size={12} />
                                  {table.no_of_seats ? `${table.no_of_seats} Seats` : "Standard table"}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                isAvailable
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isOccupied
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {status}
                            </span>
                          </div>

                          {/* Card Info Body */}
                          <div className="mt-3.5 min-h-[52px] rounded-xl bg-white/90 p-2.5 text-xs text-slate-600 border border-slate-100">
                            {isOccupied && activeBill ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">Bill</span>
                                  <span className="font-bold text-slate-700">#{activeBill.bill_number}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400">Total</span>
                                  <span className="font-extrabold text-emerald-800">{formatCurrency(activeBill.grand_total)}</span>
                                </div>
                              </div>
                            ) : isReserved ? (
                              <p className="text-blue-700 font-medium">Table currently reserved for booking.</p>
                            ) : (
                              <p className="text-slate-500 font-medium">Clean & ready for new guest seating.</p>
                            )}
                          </div>
                        </div>

                        {/* Card Action Footer */}
                        <div className="mt-3.5 pt-2 border-t border-slate-200/50">
                          {isAvailable ? (
                            <button
                              type="button"
                              onClick={() => selectTable(table)}
                              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0A4731] py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#062D22] active:scale-95"
                            >
                              <Plus size={14} />
                              <span>Seat & Start Order</span>
                            </button>
                          ) : isOccupied && activeBill ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => addItemsToActiveBill(activeBill)}
                                className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
                              >
                                + Items
                              </button>
                              <button
                                type="button"
                                onClick={() => completeActiveBill(activeBill)}
                                className="flex-1 rounded-xl bg-[#0A4731] py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#062D22]"
                              >
                                Settle
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => selectTable(table)}
                              disabled={!["Available", "Occupied"].includes(status)}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-500 disabled:opacity-50"
                            >
                              Reserved
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                /* Table Mode */
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3.5 px-5">Table</th>
                        <th className="py-3.5 px-4">Seats / Capacity</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Active Order / Bill</th>
                        <th className="py-3.5 px-4">Live Running Total</th>
                        <th className="py-3.5 px-4">Assigned Server</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTables.map((table) => {
                        const status = tableStatus(table);
                        const isAvailable = status === "Available";
                        const isOccupied = status === "Occupied";
                        const isReserved = status === "Reserved";
                        const activeBill = billsByTableId.get(String(table.table_id || table.id));

                        return (
                          <tr key={table.table_id || table.id} className="transition hover:bg-slate-50/80">
                            <td className="py-3.5 px-5 font-black text-slate-900">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`grid h-8 w-8 place-items-center rounded-lg font-bold ${
                                    isAvailable
                                      ? "bg-emerald-50 text-emerald-800 border border-emerald-100"
                                      : isOccupied
                                      ? "bg-amber-50 text-amber-800 border border-amber-100"
                                      : "bg-blue-50 text-blue-800 border border-blue-100"
                                  }`}
                                >
                                  <Table2 size={16} />
                                </span>
                                <span>Table {table.table_number}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-medium">
                              <span className="inline-flex items-center gap-1">
                                <Users size={12} className="text-slate-400" />
                                {table.no_of_seats ? `${table.no_of_seats} Seats` : "Standard"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                  isAvailable
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isOccupied
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-700">
                              {isOccupied && activeBill ? (
                                <div className="flex items-center gap-1.5 font-bold">
                                  <span>#{activeBill.bill_number}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => copyBillNumber(activeBill.bill_number, e)}
                                    title="Copy bill number"
                                    className="text-slate-400 hover:text-slate-700"
                                  >
                                    <Copy size={12} />
                                  </button>
                                </div>
                              ) : isReserved ? (
                                <span className="text-blue-700 font-semibold">Reserved Booking</span>
                              ) : (
                                <span className="text-slate-400 font-normal">No active bill</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-black">
                              {isOccupied && activeBill ? (
                                <span className="text-emerald-800 text-sm">
                                  {formatCurrency(activeBill.grand_total)}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-normal">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-medium">
                              {table.assigned_server_name || "—"}
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              {isAvailable ? (
                                <button
                                  type="button"
                                  onClick={() => selectTable(table)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A4731] px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#062D22] active:scale-95"
                                >
                                  <Plus size={13} />
                                  <span>Seat & Order</span>
                                </button>
                              ) : isOccupied && activeBill ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => addItemsToActiveBill(activeBill)}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
                                  >
                                    + Items
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => completeActiveBill(activeBill)}
                                    className="rounded-lg bg-[#0A4731] px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#062D22]"
                                  >
                                    Settle
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => selectTable(table)}
                                  disabled={!["Available", "Occupied"].includes(status)}
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-400 disabled:opacity-50"
                                >
                                  Reserved
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="px-6 py-12 text-center">
                <MapPin className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-2 text-sm font-bold text-slate-800">No tables matching filter</h3>
                <p className="mt-1 text-xs text-slate-500">Try selecting a different status filter or clearing your search.</p>
                <button
                  type="button"
                  onClick={() => { setTableFilter("all"); setSearchQuery(""); }}
                  className="mt-3 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Clear filters
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      {/* START ORDER MODAL / DRAWER */}
      <div
        className={`fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-200 sm:items-center ${
          sheetOpen ? "visible bg-slate-950/50 backdrop-blur-xs opacity-100" : "invisible pointer-events-none opacity-0"
        }`}
      >
        <button
          type="button"
          aria-label="Close order selector"
          onClick={closeOrderSelector}
          className="absolute inset-0 h-full w-full cursor-default"
        />

        <section
          aria-labelledby="order-selector-heading"
          aria-modal="true"
          role="dialog"
          aria-hidden={!sheetOpen}
          inert={!sheetOpen}
          className={`relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white px-5 pt-5 pb-8 shadow-2xl transition-transform duration-300 sm:max-w-2xl sm:rounded-3xl sm:p-6 ${
            sheetOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-300 sm:hidden" />

          <div className="mb-6 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  {showTables ? "Dine-In Table Assignment" : "POS Order Creator"}
                </span>
              </div>
              <h2 id="order-selector-heading" className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                {showTables ? "Choose a Table" : "Select Order Channel"}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeOrderSelector}
              aria-label="Close order selector"
              className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            >
              <X size={18} />
            </button>
          </div>

          {!showTables ? (
            <div className="grid gap-3.5 sm:grid-cols-3">
              {[
                {
                  type: "dine-in",
                  label: "Dine-In / Table",
                  detail: "Assign guests to a floor table and send live tickets to the kitchen",
                  Icon: Table2,
                  tone: "text-emerald-700 bg-emerald-50 border-emerald-100",
                },
                {
                  type: "pickup",
                  label: "Takeaway / Pick Up",
                  detail: "Customer counter takeaway with immediate invoice & payment",
                  Icon: ShoppingBag,
                  tone: "text-amber-700 bg-amber-50 border-amber-100",
                },
                {
                  type: "home_delivery",
                  label: "Home Delivery",
                  detail: "Order dispatched with customer contact & delivery address",
                  Icon: Bike,
                  tone: "text-blue-700 bg-blue-50 border-blue-100",
                },
              ].map(({ type, label, detail, Icon, tone }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => openOrderType(type)}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-slate-400 hover:shadow-lg"
                >
                  <div className={`grid h-12 w-12 place-items-center rounded-2xl border ${tone} transition-transform group-hover:scale-105`}>
                    <Icon size={24} />
                  </div>
                  <div className="mt-4">
                    <span className="block text-base font-black text-slate-900 group-hover:text-emerald-800 transition-colors">
                      {label}
                    </span>
                    <span className="mt-1.5 block text-xs leading-relaxed text-slate-500">
                      {detail}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-bold text-slate-700 group-hover:text-emerald-800">
                    <span>Continue</span>
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              ))}
            </div>
          ) : loading ? (
            <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
              <span>Loading tables…</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Select an available table to begin. Occupied tables will append new rounds to the active bill.
                </p>
                <button
                  type="button"
                  onClick={() => setShowTables(false)}
                  className="text-xs font-bold text-emerald-800 hover:underline"
                >
                  ← Back to order channels
                </button>
              </div>

              {tables.length ? (
                <div className="grid max-h-[55vh] gap-3 overflow-y-auto sm:grid-cols-2 pr-1">
                  {tables.map((table) => {
                    const status = tableStatus(table);
                    const allowed = status === "Available" || status === "Occupied";
                    const existingBill = billsByTableId.get(String(table.table_id || table.id));

                    return (
                      <button
                        key={table.table_id || table.id}
                        type="button"
                        onClick={() => selectTable(table)}
                        disabled={!allowed}
                        className={`group flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                          status === "Available"
                            ? "border-emerald-200 bg-emerald-50/20 hover:border-emerald-400 hover:bg-emerald-50/60"
                            : status === "Occupied"
                            ? "border-amber-200 bg-amber-50/20 hover:border-amber-400 hover:bg-amber-50/60"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl font-bold ${
                              status === "Available"
                                ? "bg-emerald-100 text-emerald-800"
                                : status === "Occupied"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            <Table2 size={20} />
                          </span>
                          <div className="min-w-0">
                            <strong className="block truncate text-sm font-black text-slate-900">
                              Table {table.table_number}
                            </strong>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {table.no_of_seats ? `${table.no_of_seats} seats · ` : ""}
                              <span className="font-semibold">{status}</span>
                              {existingBill ? ` · Bill #${existingBill.bill_number}` : ""}
                            </span>
                            {table.assigned_server_name && (
                              <span className="mt-0.5 block truncate text-[11px] text-slate-600">
                                Server: {table.assigned_server_name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-slate-400 shadow-xs group-hover:bg-[#0A4731] group-hover:text-white transition-colors">
                          <ChevronRight size={16} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                  <MapPin className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm font-bold text-slate-700">No tables configured</p>
                  <p className="mt-1 text-xs text-slate-500">Please add dining tables in Table Management first.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default PointOfSale;
