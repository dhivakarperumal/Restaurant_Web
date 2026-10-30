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
  GitMerge,
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

const tableStatus = (table, activeBills = []) => {
  const tableId = String(table.table_id || table.id || "");
  const hasActiveBill = activeBills.some((bill) => String(bill.table_id || "") === tableId);
  const storedStatus = String(table.status || "Available").trim().toLowerCase();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const hasReservationToday = table.next_reservation_date === today
    && ["pending", "confirmed"].includes(String(table.next_reservation_status || "").trim().toLowerCase());

  if (hasActiveBill || storedStatus === "occupied") return "Occupied";
  if (Number(table.reservation_is_active) === 1 || hasReservationToday) return "Reserved";
  if (storedStatus === "reserved") return "Available";
  return storedStatus === "available" ? "Available" : table.status || "Available";
};

const isTableSelectionAllowed = (table, status) => (
  ["Available", "Occupied"].includes(status)
  || (status === "Reserved" && Number(table.reservation_is_active) !== 1)
);

const formatReservationTime = (value) => {
  const match = /^(\d{1,2}):([0-5]\d)/.exec(String(value || ""));
  if (!match) return String(value || "");
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
};

const formatReservationDate = (value) => {
  const date = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

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

const getBillItems = (bill) => (
  Array.isArray(bill?.consolidated_items)
    ? bill.consolidated_items
    : (bill?.rounds || []).flatMap((round) => round.items || [])
);

const PointOfSale = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [activeBills, setActiveBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [billingDataFresh, setBillingDataFresh] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showTables, setShowTables] = useState(false);
  const [orderDraft, setOrderDraft] = useState(() => location.state?.orderDraft || null);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "bills" | "tables"
  const [tableFilter, setTableFilter] = useState("all"); // "all" | "Available" | "Occupied" | "Reserved"
  const [viewMode, setViewMode] = useState("card"); // "card" | "table"
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeConfirmationOpen, setMergeConfirmationOpen] = useState(false);
  const [mergePrimaryTableId, setMergePrimaryTableId] = useState("");
  const [mergeSecondaryTableId, setMergeSecondaryTableId] = useState("");
  const [mergeBillDetails, setMergeBillDetails] = useState({});
  const [loadingMergeBillIds, setLoadingMergeBillIds] = useState(() => new Set());
  const [loadingMergeTables, setLoadingMergeTables] = useState(false);
  const [mergingTables, setMergingTables] = useState(false);
  const [mergeError, setMergeError] = useState("");
  const [settlementBill, setSettlementBill] = useState(null);
  const [loadingSettlementBill, setLoadingSettlementBill] = useState(false);
  const [settlingBill, setSettlingBill] = useState(false);
  const [settlementError, setSettlementError] = useState("");
  const [settlementPaymentMethod, setSettlementPaymentMethod] = useState("Cash");
  const [settlementDiscount, setSettlementDiscount] = useState(0);
  const selectionLock = useRef(false);
  const settlementLock = useRef(false);
  const billingLoadSequence = useRef(0);

  const loadBillingData = useCallback(async ({ showLoading = true } = {}) => {
    const requestId = billingLoadSequence.current + 1;
    billingLoadSequence.current = requestId;
    if (showLoading) setLoading(true);
    setBillingDataFresh(false);
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
      if (requestId !== billingLoadSequence.current) return false;
      setTables(tablesResponse.data.tables);
      setActiveBills(billsResponse.data.bills);
      setBillingDataFresh(true);
      setLastUpdated(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      return true;
    } catch (requestError) {
      console.error("Could not load billing data:", requestError);
      if (requestId === billingLoadSequence.current) {
        setError(requestError.response?.data?.message || requestError.message || "Billing data could not be loaded.");
      }
      return false;
    } finally {
      if (requestId === billingLoadSequence.current) setLoading(false);
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

  useEffect(() => {
    if (!mergeModalOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key !== "Escape" || mergingTables) return;
      if (mergeConfirmationOpen) {
        setMergeConfirmationOpen(false);
      } else {
        setMergeModalOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mergeModalOpen, mergeConfirmationOpen, mergingTables]);

  useEffect(() => {
    if (!settlementBill) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !settlingBill && !loadingSettlementBill) setSettlementBill(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [settlementBill, settlingBill, loadingSettlementBill]);

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

  const openTableAssignment = () => {
    setShowTables(true);
    setSheetOpen(true);
    loadBillingData();
  };

  const selectTable = (table) => {
    if (selectionLock.current || !billingDataFresh) return;
    const status = tableStatus(table, activeBills);
    if (!isTableSelectionAllowed(table, status)) return;
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

  const completeActiveBill = async (bill) => {
    if (!bill?.bill_id || loadingSettlementBill || settlingBill) return;
    setSettlementBill(bill);
    setLoadingSettlementBill(true);
    setSettlementError("");
    setSettlementDiscount(Number(bill.discount || 0));
    setSettlementPaymentMethod(bill.payment_method || "Cash");
    try {
      const response = await api.get(`/table-bills/${encodeURIComponent(bill.bill_id)}`);
      if (!response.data?.success || !response.data.bill) {
        throw new Error(response.data?.message || `Could not load bill #${bill.bill_number}.`);
      }
      setSettlementBill(response.data.bill);
      setSettlementDiscount(Number(response.data.bill.discount || 0));
    } catch (requestError) {
      console.error("Could not load bill for settlement:", requestError);
      setSettlementError(requestError.response?.data?.message || requestError.message || "Could not load bill details.");
    } finally {
      setLoadingSettlementBill(false);
    }
  };

  const settleBillInPopup = async () => {
    if (!settlementBill?.bill_id || settlementLock.current || settlingBill) return;
    settlementLock.current = true;
    setSettlingBill(true);
    setSettlementError("");
    try {
      const response = await api.post(`/table-bills/${encodeURIComponent(settlementBill.bill_id)}/settle`, {
        payment_method: settlementPaymentMethod,
        discount: Number(settlementDiscount) || 0,
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to settle bill.");
      }
      toast.success(`Bill #${settlementBill.bill_number} settled successfully.`);
      setSettlementBill(null);
      const refreshed = await loadBillingData({ showLoading: false });
      if (!refreshed) toast.error("Bill was settled, but table status could not be refreshed.");
    } catch (requestError) {
      console.error("Could not settle bill:", requestError);
      const message = requestError.response?.data?.message || requestError.message || "Failed to settle bill.";
      setSettlementError(message);
      toast.error(message);
    } finally {
      settlementLock.current = false;
      setSettlingBill(false);
    }
  };

  const copyBillNumber = (billNumber, event) => {
    event?.stopPropagation();
    if (!billNumber) return;
    navigator.clipboard?.writeText(billNumber);
    toast.success(`Copied #${billNumber}`);
  };

  // Metrics
  const availableCount = tables.filter((table) => tableStatus(table, activeBills) === "Available").length;
  const occupiedCount = tables.filter((table) => tableStatus(table, activeBills) === "Occupied").length;
  const reservedCount = tables.filter((table) => tableStatus(table, activeBills) === "Reserved").length;
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
      const status = tableStatus(table, activeBills);
      if (tableFilter !== "all" && status !== tableFilter) return false;
      if (!q) return true;
      const tableNum = String(table.table_number || "").toLowerCase();
      const serverName = String(table.assigned_server_name || "").toLowerCase();
      const existingBill = billsByTableId.get(String(table.table_id || table.id));
      const billNum = String(existingBill?.bill_number || "").toLowerCase();
      return tableNum.includes(q) || serverName.includes(q) || billNum.includes(q) || status.toLowerCase().includes(q);
    });
  }, [tables, activeBills, tableFilter, searchQuery, billsByTableId]);

  const occupiedMergeTables = tables.filter((table) => tableStatus(table, activeBills) === "Occupied");
  const primaryMergeTable = tables.find((table) => String(table.table_id || table.id) === mergePrimaryTableId);
  const secondaryMergeTable = tables.find((table) => String(table.table_id || table.id) === mergeSecondaryTableId);
  const primaryMergeBill = primaryMergeTable
    ? billsByTableId.get(String(primaryMergeTable.table_id || primaryMergeTable.id))
    : null;
  const secondaryMergeBill = secondaryMergeTable
    ? billsByTableId.get(String(secondaryMergeTable.table_id || secondaryMergeTable.id))
    : null;
  const primaryMergeDetails = mergeBillDetails[String(primaryMergeBill?.bill_id || "")];
  const secondaryMergeDetails = mergeBillDetails[String(secondaryMergeBill?.bill_id || "")];

  const combinedMergeItems = useMemo(() => {
    const items = [...getBillItems(primaryMergeDetails), ...getBillItems(secondaryMergeDetails)];
    const combined = new Map();
    for (const item of items) {
      const key = JSON.stringify([
        item.food_id || item.food_name,
        Number(item.unit_price || 0),
        item.selected_addons || [],
        item.selected_customizations || {},
      ]);
      const existing = combined.get(key);
      if (existing) {
        existing.quantity += Number(item.quantity || 0);
        existing.total_price = Number((existing.quantity * existing.unit_price).toFixed(2));
      } else {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || 0);
        combined.set(key, {
          ...item,
          quantity,
          unit_price: unitPrice,
          total_price: Number((quantity * unitPrice).toFixed(2)),
        });
      }
    }
    return Array.from(combined.values());
  }, [primaryMergeDetails, secondaryMergeDetails]);

  const mergePreview = useMemo(() => {
    if (!primaryMergeDetails || !secondaryMergeDetails) return null;
    const subtotal = Number(primaryMergeDetails.subtotal || 0) + Number(secondaryMergeDetails.subtotal || 0);
    const discount = Number(primaryMergeDetails.discount || 0) + Number(secondaryMergeDetails.discount || 0);
    const taxRate = Number(primaryMergeDetails.tax_rate ?? 5);
    const taxAmount = Number((subtotal * taxRate / 100).toFixed(2));
    const grandTotal = Math.max(0, Number((subtotal + taxAmount - discount).toFixed(2)));
    return { subtotal, discount, taxRate, taxAmount, grandTotal };
  }, [primaryMergeDetails, secondaryMergeDetails]);

  const mergeEligibilityError = (() => {
    if (!primaryMergeDetails || !secondaryMergeDetails) return "";
    if ([primaryMergeDetails, secondaryMergeDetails].some((bill) => bill.status !== "Active")) {
      return "Only active bills can be merged.";
    }
    if ([primaryMergeDetails, secondaryMergeDetails].some((bill) => bill.payment_method || bill.settled_at)) {
      return "Bills with recorded payment information cannot be merged.";
    }
    if (Number(primaryMergeDetails.tax_rate ?? 5) !== Number(secondaryMergeDetails.tax_rate ?? 5)) {
      return "Bills with different tax rates cannot be merged.";
    }
    return "";
  })();

  const loadMergeBillDetails = async (bill) => {
    if (!bill?.bill_id || mergeBillDetails[String(bill.bill_id)]) return;
    const billId = String(bill.bill_id);
    setLoadingMergeBillIds((current) => new Set(current).add(billId));
    setMergeError("");
    try {
      const response = await api.get(`/table-bills/${encodeURIComponent(billId)}`);
      if (!response.data?.success || !response.data.bill) {
        throw new Error(response.data?.message || `Could not load bill #${bill.bill_number}.`);
      }
      setMergeBillDetails((current) => ({ ...current, [billId]: response.data.bill }));
    } catch (requestError) {
      console.error("Could not load merge bill details:", requestError);
      setMergeError(requestError.response?.data?.message || requestError.message || "Could not load selected bill details.");
    } finally {
      setLoadingMergeBillIds((current) => {
        const next = new Set(current);
        next.delete(billId);
        return next;
      });
    }
  };

  const openMergeTables = async () => {
    setMergePrimaryTableId("");
    setMergeSecondaryTableId("");
    setMergeBillDetails({});
    setLoadingMergeBillIds(new Set());
    setMergeConfirmationOpen(false);
    setMergeError("");
    setMergeModalOpen(true);
    setLoadingMergeTables(true);
    const loaded = await loadBillingData({ showLoading: false });
    if (!loaded) setMergeError("Could not refresh tables and bills. Please try again.");
    setLoadingMergeTables(false);
  };

  const selectMergeTable = async (table) => {
    const tableId = String(table.table_id || table.id);
    const activeBill = billsByTableId.get(tableId);
    if (!activeBill?.bill_id) return;
    setMergeError("");
    if (tableId === mergePrimaryTableId) {
      if (mergeSecondaryTableId) {
        setMergePrimaryTableId(mergeSecondaryTableId);
        setMergeSecondaryTableId("");
      } else {
        setMergePrimaryTableId("");
      }
    } else if (tableId === mergeSecondaryTableId) {
      setMergeSecondaryTableId("");
    } else if (!mergePrimaryTableId) {
      setMergePrimaryTableId(tableId);
    } else {
      setMergeSecondaryTableId(tableId);
    }
    await loadMergeBillDetails(activeBill);
  };

  const makeMergeTablePrimary = (tableId) => {
    if (tableId !== mergeSecondaryTableId) return;
    setMergePrimaryTableId(mergeSecondaryTableId);
    setMergeSecondaryTableId(mergePrimaryTableId);
  };

  const confirmTableMerge = async () => {
    if (
      mergingTables ||
      !mergePrimaryTableId ||
      !mergeSecondaryTableId ||
      !primaryMergeDetails ||
      !secondaryMergeDetails ||
      mergeEligibilityError
    ) return;
    setMergingTables(true);
    setMergeError("");
    try {
      const response = await api.post("/table-bills/merge", {
        primary_table_id: mergePrimaryTableId,
        merge_table_ids: [mergeSecondaryTableId],
      });
      if (!response.data?.success || !response.data.bill) {
        throw new Error(response.data?.message || "The tables could not be merged.");
      }

      toast.success(response.data.message || "Tables merged successfully.");
      setMergeModalOpen(false);
      setMergeConfirmationOpen(false);
      setMergePrimaryTableId("");
      setMergeSecondaryTableId("");
      const refreshed = await loadBillingData({ showLoading: false });
      if (!refreshed) toast.error("Merge completed, but tables could not be refreshed. Please refresh the page.");
    } catch (requestError) {
      console.error("Could not merge table bills:", requestError);
      const message = requestError.response?.data?.message || requestError.message || "Could not merge tables. Please try again.";
      setMergeError(message);
      toast.error(message);
    } finally {
      setMergingTables(false);
    }
  };

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
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
              >
                <Table2 className="h-4 w-4 text-slate-500" />
                <span>Floor Workspace</span>
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/billing/history")}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 active:scale-95"
              >
                <Receipt className="h-4 w-4 text-slate-500" />
                <span>Bill History</span>
              </button>

              <button
                type="button"
                onClick={openMergeTables}
                disabled={loading || mergingTables}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-900 shadow-xs transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GitMerge className="h-4 w-4" />
                <span>Merge Table</span>
              </button>

              <button
                type="button"
                onClick={() => { setShowTables(false); setSheetOpen(true); }}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#0A4731] px-5 text-sm font-bold text-white shadow-md shadow-emerald-950/20 transition hover:bg-[#062D22] hover:text-white active:scale-95"
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
              className="rounded-lg bg-rose-100 px-3 py-1 font-bold text-rose-900 transition hover:bg-rose-200 hover:text-rose-950"
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
            className={`group cursor-pointer rounded-2xl border bg-white p-4.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              tableFilter === "Available" && activeTab === "tables"
                ? "border-emerald-500 ring-2 ring-emerald-500/20"
                : "border-slate-200/90 hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-800 transition-colors">
                Available Tables
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 group-hover:bg-emerald-100 group-hover:text-emerald-900 transition-colors">
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
            <p className="mt-1 text-[11px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
              Ready for walk-in seating
            </p>
          </article>

          {/* Occupied Tables */}
          <article
            onClick={() => { setActiveTab("tables"); setTableFilter("Occupied"); }}
            className={`group cursor-pointer rounded-2xl border bg-white p-4.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              tableFilter === "Occupied" && activeTab === "tables"
                ? "border-amber-500 ring-2 ring-amber-500/20"
                : "border-slate-200/90 hover:border-amber-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-amber-800 transition-colors">
                Occupied Tables
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700 border border-amber-100 group-hover:bg-amber-100 group-hover:text-amber-900 transition-colors">
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
            <p className="mt-1 text-[11px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
              Active service & orders
            </p>
          </article>

          {/* Reserved Tables */}
          <article
            onClick={() => { setActiveTab("tables"); setTableFilter("Reserved"); }}
            className={`group cursor-pointer rounded-2xl border bg-white p-4.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              tableFilter === "Reserved" && activeTab === "tables"
                ? "border-amber-500 ring-2 ring-amber-500/20"
                : "border-slate-200/90 hover:border-amber-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-800 transition-colors">
                Reserved
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700 border border-amber-100 group-hover:bg-amber-100 group-hover:text-amber-900 transition-colors">
                <Users size={18} />
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">
                {loading ? "—" : reservedCount}
              </span>
              <span className="text-xs font-semibold text-amber-700">
                Bookings
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
              Scheduled table holds
            </p>
          </article>

          {/* Active Running Bills */}
          <article
            onClick={() => setActiveTab("bills")}
            className={`group cursor-pointer rounded-2xl border bg-white p-4.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              activeTab === "bills"
                ? "border-purple-500 ring-2 ring-purple-500/20"
                : "border-slate-200/90 hover:border-purple-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-purple-800 transition-colors">
                Active Bills
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-purple-700 border border-purple-100 group-hover:bg-purple-100 group-hover:text-purple-900 transition-colors">
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
            <p className="mt-1 text-[11px] font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
              Awaiting settlement
            </p>
          </article>

          {/* Live Floor Balance */}
          <article
            onClick={() => setActiveTab("bills")}
            className="col-span-2 sm:col-span-2 lg:col-span-1 group cursor-pointer rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-white to-white p-4.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 group-hover:text-emerald-950 transition-colors">
                Floor Running Total
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0A4731] text-white shadow-xs group-hover:bg-[#062D22] transition-colors">
                <IndianRupee size={17} />
              </span>
            </div>
            <div className="mt-2.5">
              <span className="text-2xl font-black text-slate-900 sm:text-[26px]">
                {loading ? "—" : formatCurrency(totalRunningBalance)}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium text-emerald-800 group-hover:text-emerald-950 transition-colors">
              Live unsettled dining revenue
            </p>
          </article>
        </section>

        {/* Quick Order Starter Launchers */}
        <section aria-label="Fast POS Launchers" className="grid gap-3.5 sm:grid-cols-3">
          <button
            type="button"
            onClick={openTableAssignment}
            className="group flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md active:scale-98"
          >
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-100 transition-transform group-hover:scale-105 group-hover:bg-emerald-100 group-hover:text-emerald-900">
                <Table2 size={22} />
              </div>
              <div>
                <span className="block text-sm font-black text-slate-900 group-hover:text-emerald-900 transition-colors">Dine-In Order</span>
                <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors">Assign table & generate KOT</span>
              </div>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 transition-colors group-hover:bg-[#0A4731] group-hover:text-white">
              <ChevronRight size={16} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => openOrderType("pickup")}
            className="group flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md active:scale-98"
          >
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-100 transition-transform group-hover:scale-105 group-hover:bg-amber-100 group-hover:text-amber-900">
                <ShoppingBag size={22} />
              </div>
              <div>
                <span className="block text-sm font-black text-slate-900 group-hover:text-amber-900 transition-colors">Takeaway / Pick-Up</span>
                <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors">Fast counter order & checkout</span>
              </div>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 transition-colors group-hover:bg-amber-600 group-hover:text-white">
              <ChevronRight size={16} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => openOrderType("home_delivery")}
            className="group flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md active:scale-98"
          >
            <div className="flex items-center gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-800 border border-blue-100 transition-transform group-hover:scale-105 group-hover:bg-blue-100 group-hover:text-blue-900">
                <Bike size={22} />
              </div>
              <div>
                <span className="block text-sm font-black text-slate-900 group-hover:text-blue-900 transition-colors">Home Delivery</span>
                <span className="text-xs text-slate-500 group-hover:text-slate-700 transition-colors">Address, customer & rider dispatch</span>
              </div>
            </div>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 transition-colors group-hover:bg-blue-600 group-hover:text-white">
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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
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
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === "all"
                    ? "bg-[#0A4731] text-white shadow-xs hover:bg-[#062D22] hover:text-white"
                    : "text-slate-600 hover:bg-slate-200/80 hover:text-slate-950"
                }`}
              >
                <Sparkles size={13} />
                <span>All</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("bills")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === "bills"
                    ? "bg-[#0A4731] text-white shadow-xs hover:bg-[#062D22] hover:text-white"
                    : "text-slate-600 hover:bg-slate-200/80 hover:text-slate-950"
                }`}
              >
                <Receipt size={13} />
                <span>Bills</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  activeTab === "bills"
                    ? "bg-white/20 text-white font-bold"
                    : "bg-slate-200 text-slate-700 font-semibold"
                }`}>
                  {activeBills.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("tables")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeTab === "tables"
                    ? "bg-[#0A4731] text-white shadow-xs hover:bg-[#062D22] hover:text-white"
                    : "text-slate-600 hover:bg-slate-200/80 hover:text-slate-950"
                }`}
              >
                <Table2 size={13} />
                <span>Tables</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  activeTab === "tables"
                    ? "bg-white/20 text-white font-bold"
                    : "bg-slate-200 text-slate-700 font-semibold"
                }`}>
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
                    className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                      tableFilter === f.id
                        ? "bg-[#0A4731] text-white shadow-xs hover:bg-[#062D22] hover:text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950"
                    }`}
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
                title="Card mode"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  viewMode === "card"
                    ? "bg-[#0A4731] text-white shadow-xs hover:bg-[#062D22] hover:text-white"
                    : "text-slate-600 hover:bg-slate-200/80 hover:text-slate-950"
                }`}
              >
                <LayoutGrid size={15} />
                
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Table mode"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  viewMode === "table"
                    ? "bg-[#0A4731] text-white shadow-xs hover:bg-[#062D22] hover:text-white"
                    : "text-slate-600 hover:bg-slate-200/80 hover:text-slate-950"
                }`}
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
                              {Array.isArray(bill.merged_table_numbers) && bill.merged_table_numbers.length > 1 && (
                                <span className="mt-0.5 block text-[10px] font-semibold text-emerald-800">
                                  Tables {bill.merged_table_numbers.join(" + ")}
                                </span>
                              )}
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span>#{bill.bill_number}</span>
                                <button
                                  type="button"
                                  onClick={(e) => copyBillNumber(bill.bill_number, e)}
                                  title="Copy bill number"
                                  className="text-slate-400 hover:text-slate-900 transition-colors"
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
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950 active:scale-95"
                        >
                          <Plus size={14} />
                          <span>Add Items</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => completeActiveBill(bill)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0A4731] py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#062D22] hover:text-white active:scale-95"
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
                        <tr key={bill.bill_id} className="transition hover:bg-emerald-50/20">
                          <td className="py-3.5 px-5 font-black text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-100">
                                <Table2 size={16} />
                              </span>
                              <span>
                                Table {bill.table_number}
                                {Array.isArray(bill.merged_table_numbers) && bill.merged_table_numbers.length > 1 && (
                                  <span className="mt-0.5 block text-[10px] font-semibold text-emerald-800">
                                    Merged: {bill.merged_table_numbers.join(" + ")}
                                  </span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                <span>#{bill.bill_number}</span>
                                <button
                                  type="button"
                                  onClick={(e) => copyBillNumber(bill.bill_number, e)}
                                  title="Copy bill number"
                                  className="text-slate-400 hover:text-slate-900 transition-colors"
                                >
                                  <Copy size={12} />
                                </button>
                              </div>
                              {Array.isArray(bill.merged_table_numbers) && bill.merged_table_numbers.length > 1 && (
                                <span className="mt-0.5 block text-[10px] font-semibold text-emerald-800">
                                  Tables {bill.merged_table_numbers.join(" + ")}
                                </span>
                              )}
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
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950 active:scale-95"
                              >
                                + Items
                              </button>
                              <button
                                type="button"
                                onClick={() => completeActiveBill(bill)}
                                className="rounded-lg bg-[#0A4731] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#062D22] hover:text-white active:scale-95"
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
                  onClick={openTableAssignment}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0A4731] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#062D22] hover:text-white"
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
                  <span className="ml-2 h-2 w-2 rounded-full bg-amber-500" /> Reserved
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
                    const status = tableStatus(table, activeBills);
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
                            ? "border-red-200/90 bg-red-50/20 hover:border-red-400"
                            : "border-amber-200/90 bg-amber-50/20 hover:border-amber-400"
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
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                <Table2 size={18} />
                              </span>
                              <div>
                                <h3 className="text-base font-black text-slate-900 group-hover:text-slate-950 transition-colors">
                                  Table {table.table_number}
                                </h3>
                                <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 group-hover:text-slate-700 transition-colors">
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
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
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
                                {Array.isArray(activeBill.merged_table_numbers) && activeBill.merged_table_numbers.length > 1 && (
                                  <div className="border-t border-slate-100 pt-1 font-semibold text-emerald-800">
                                    Merged: {activeBill.merged_table_numbers.join(" + ")}
                                  </div>
                                )}
                              </div>
                            ) : isReserved ? (
                              <div className="space-y-1 text-amber-800">
                                <p className="font-semibold">
                                  {table.next_reservation_customer_name || "Reservation"} · {table.next_reservation_guests || "—"} guests
                                </p>
                                <p className="text-[11px] font-medium">
                                  {formatReservationTime(table.next_reservation_start_time)}–{formatReservationTime(table.next_reservation_end_time)}
                                </p>
                              </div>
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
                              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0A4731] py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#062D22] hover:text-white active:scale-95"
                            >
                              <Plus size={14} />
                              <span>Seat & Start Order</span>
                            </button>
                          ) : isOccupied && activeBill ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => addItemsToActiveBill(activeBill)}
                                className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950 active:scale-95"
                              >
                                + Items
                              </button>
                              <button
                                type="button"
                                onClick={() => completeActiveBill(activeBill)}
                                className="flex-1 rounded-xl bg-[#0A4731] py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#062D22] hover:text-white active:scale-95"
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
                        const status = tableStatus(table, activeBills);
                        const isAvailable = status === "Available";
                        const isOccupied = status === "Occupied";
                        const isReserved = status === "Reserved";
                        const activeBill = billsByTableId.get(String(table.table_id || table.id));

                        return (
                          <tr key={table.table_id || table.id} className="transition hover:bg-slate-50">
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
                                <div>
                                  <div className="flex items-center gap-1.5 font-bold">
                                    <span>#{activeBill.bill_number}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => copyBillNumber(activeBill.bill_number, e)}
                                      title="Copy bill number"
                                      className="text-slate-400 hover:text-slate-900 transition-colors"
                                    >
                                      <Copy size={12} />
                                    </button>
                                  </div>
                                  {Array.isArray(activeBill.merged_table_numbers) && activeBill.merged_table_numbers.length > 1 && (
                                    <span className="mt-0.5 block text-[10px] font-semibold text-emerald-800">
                                      Tables {activeBill.merged_table_numbers.join(" + ")}
                                    </span>
                                  )}
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
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A4731] px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#062D22] hover:text-white active:scale-95"
                                >
                                  <Plus size={13} />
                                  <span>Seat & Order</span>
                                </button>
                              ) : isOccupied && activeBill ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => addItemsToActiveBill(activeBill)}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950 active:scale-95"
                                  >
                                    + Items
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => completeActiveBill(activeBill)}
                                    className="rounded-lg bg-[#0A4731] px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#062D22] hover:text-white active:scale-95"
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
                  className="mt-3 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 hover:text-slate-950"
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
              className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-950"
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
                  tone: "text-emerald-700 bg-emerald-50 border-emerald-100 group-hover:bg-emerald-100 group-hover:text-emerald-900",
                },
                {
                  type: "pickup",
                  label: "Takeaway / Pick Up",
                  detail: "Customer counter takeaway with immediate invoice & payment",
                  Icon: ShoppingBag,
                  tone: "text-amber-700 bg-amber-50 border-amber-100 group-hover:bg-amber-100 group-hover:text-amber-900",
                },
                {
                  type: "home_delivery",
                  label: "Home Delivery",
                  detail: "Order dispatched with customer contact & delivery address",
                  Icon: Bike,
                  tone: "text-blue-700 bg-blue-50 border-blue-100 group-hover:bg-blue-100 group-hover:text-blue-900",
                },
              ].map(({ type, label, detail, Icon, tone }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => openOrderType(type)}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-slate-400 hover:shadow-lg"
                >
                  <div className={`grid h-12 w-12 place-items-center rounded-2xl border ${tone} transition-all`}>
                    <Icon size={24} />
                  </div>
                  <div className="mt-4">
                    <span className="block text-base font-black text-slate-900 group-hover:text-emerald-950 transition-colors">
                      {label}
                    </span>
                    <span className="mt-1.5 block text-xs leading-relaxed text-slate-500 group-hover:text-slate-700 transition-colors">
                      {detail}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-bold text-slate-700 group-hover:text-emerald-900 transition-colors">
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
          ) : !billingDataFresh ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
              <p className="text-sm font-bold text-red-800">
                {error || "Latest table availability could not be loaded."}
              </p>
              <button
                type="button"
                onClick={() => loadBillingData()}
                className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Today’s confirmed reservations are shown as Reserved. You can select one before its reservation time; occupied tables append rounds to their active bill.
                </p>
                <button
                  type="button"
                  onClick={() => setShowTables(false)}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline transition-colors"
                >
                  ← Back to order channels
                </button>
              </div>

              {tables.length ? (
                <div className="grid max-h-[55vh] gap-3 overflow-y-auto sm:grid-cols-2 pr-1">
                  {tables.map((table) => {
                    const status = tableStatus(table, activeBills);
                    const allowed = isTableSelectionAllowed(table, status);
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
                            ? "border-red-200 bg-red-50/20 hover:border-red-400 hover:bg-red-50/60"
                            : "border-amber-200 bg-amber-50/20"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl font-bold ${
                              status === "Available"
                                ? "bg-emerald-100 text-emerald-800"
                                : status === "Occupied"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            <Table2 size={20} />
                          </span>
                          <div className="min-w-0">
                            <strong className="block truncate text-sm font-black text-slate-900 group-hover:text-emerald-950 transition-colors">
                              Table {table.table_number}
                            </strong>
                            <span className="mt-0.5 block text-xs text-slate-500 group-hover:text-slate-700 transition-colors">
                              {table.no_of_seats ? `${table.no_of_seats} seats · ` : ""}
                              <span className={`font-semibold ${
                                status === "Available"
                                  ? "text-emerald-800"
                                  : status === "Occupied"
                                  ? "text-red-800"
                                  : "text-amber-800"
                              }`}>{status}</span>
                              {existingBill ? ` · Bill #${existingBill.bill_number}` : ""}
                            </span>
                            {status === "Reserved" && (
                              <span className="mt-1 block text-[11px] font-medium text-amber-800">
                                {table.next_reservation_customer_name || "Reservation"}
                                {" · "}
                                {formatReservationDate(table.next_reservation_date)}
                                {" · "}
                                {formatReservationTime(table.next_reservation_start_time)}–{formatReservationTime(table.next_reservation_end_time)}
                                {" · "}
                                {table.next_reservation_guests || "—"} guests
                              </span>
                            )}
                            {table.assigned_server_name && (
                              <span className="mt-0.5 block truncate text-[11px] text-slate-600 group-hover:text-slate-800 transition-colors">
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

    {settlementBill && (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5">
        <button
          type="button"
          aria-label="Close bill settlement"
          disabled={settlingBill || loadingSettlementBill}
          onClick={() => setSettlementBill(null)}
          className="absolute inset-0 h-full w-full cursor-default disabled:cursor-wait"
        />
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="settlement-heading"
          className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        >
          <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
            <div>
              <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800">
                <Receipt className="h-4 w-4" />
                Bill settlement
              </p>
              <h2 id="settlement-heading" className="mt-1 text-xl font-black text-slate-900">
                Settle Table {settlementBill.table_number} Bill
              </h2>
              <p className="mt-1 text-sm text-slate-500">Bill #{settlementBill.bill_number}</p>
            </div>
            <button
              type="button"
              aria-label="Close bill settlement"
              disabled={settlingBill || loadingSettlementBill}
              onClick={() => setSettlementBill(null)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-950 disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </header>

          {settlementError && (
            <div role="alert" className="mx-5 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 sm:mx-6">
              <span>{settlementError}</span>
              {!loadingSettlementBill && (
                <button
                  type="button"
                  onClick={() => completeActiveBill(settlementBill)}
                  className="font-bold text-rose-900 underline underline-offset-2"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {loadingSettlementBill ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
              Loading bill details…
            </div>
          ) : (
            <>
              <div className="space-y-4 overflow-y-auto p-5 sm:p-6">
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-xs">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {Array.isArray(settlementBill.merged_table_numbers) && settlementBill.merged_table_numbers.length > 1 ? "Merged tables" : "Table"}
                    </span>
                    <strong className="mt-1 block text-sm text-slate-900">
                      {Array.isArray(settlementBill.merged_table_numbers) && settlementBill.merged_table_numbers.length > 1
                        ? settlementBill.merged_table_numbers.map((number) => `Table ${number}`).join(" + ")
                        : `Table ${settlementBill.table_number}`}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Assigned server</span>
                    <strong className="mt-1 block text-sm text-slate-900">{settlementBill.server_name || "—"}</strong>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4">
                  {getBillItems(settlementBill).length ? getBillItems(settlementBill).map((item, index) => {
                    const customizations = Object.entries(item.selected_customizations || {}).flatMap(([group, selection]) => {
                      const options = Array.isArray(selection) ? selection : [selection];
                      return options.filter(Boolean).map((option) => `${group === "__custom_request__" ? "Custom request" : group}: ${option}`);
                    });
                    const itemOptions = [
                      ...(Array.isArray(item.selected_addons) ? item.selected_addons : []),
                      ...customizations,
                    ];
                    return (
                      <div key={`${item.food_id || item.food_name}-${index}`} className="flex items-start justify-between gap-3 py-3 text-sm">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">
                            {item.food_name || "Food item"} <span className="text-slate-500">× {Number(item.quantity || 0)}</span>
                          </p>
                          {itemOptions.length > 0 && (
                            <p className="mt-1 break-words text-xs text-slate-500">{itemOptions.join(" · ")}</p>
                          )}
                          <p className="mt-1 text-xs text-slate-400">{formatCurrency(item.unit_price)} each</p>
                        </div>
                        <span className="shrink-0 font-semibold text-slate-700">
                          {formatCurrency(item.total_price ?? Number(item.unit_price || 0) * Number(item.quantity || 0))}
                        </span>
                      </div>
                    );
                  }) : (
                    <p className="py-8 text-center text-sm text-slate-500">No items on this bill yet.</p>
                  )}
                </div>

                {(() => {
                  const subtotal = Number(settlementBill.subtotal || 0);
                  const taxAmount = Number(settlementBill.tax_amount || 0);
                  const discount = Math.max(0, Math.min(subtotal, Number(settlementDiscount) || 0));
                  const grandTotal = Math.max(0, subtotal + taxAmount - discount);
                  return (
                    <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between gap-3 text-slate-600">
                          <dt>Subtotal ({settlementBill.total_items_count || getBillItems(settlementBill).reduce((sum, item) => sum + Number(item.quantity || 0), 0)} items)</dt>
                          <dd>{formatCurrency(subtotal)}</dd>
                        </div>
                        <div className="flex justify-between gap-3 text-slate-600">
                          <dt>GST ({Number(settlementBill.tax_rate ?? 5).toFixed(2)}%)</dt>
                          <dd>{formatCurrency(taxAmount)}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-slate-600">
                          <label htmlFor="settlement-discount">Discount (₹)</label>
                          <input
                            id="settlement-discount"
                            type="number"
                            min="0"
                            max={subtotal}
                            step="0.01"
                            value={settlementDiscount}
                            onChange={(event) => setSettlementDiscount(event.target.value)}
                            disabled={settlingBill}
                            className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-right text-sm font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50"
                          />
                        </div>
                        <div className="flex justify-between gap-3 border-t border-slate-200 pt-3 text-base font-black text-slate-900">
                          <dt>Grand Total</dt>
                          <dd className="text-emerald-800">{formatCurrency(grandTotal)}</dd>
                        </div>
                      </dl>

                      <div>
                        <p className="mb-2 text-xs font-bold text-slate-700">Payment method</p>
                        <div className="grid grid-cols-3 gap-2">
                          {["Cash", "UPI", "Card"].map((method) => (
                            <button
                              key={method}
                              type="button"
                              disabled={settlingBill}
                              onClick={() => setSettlementPaymentMethod(method)}
                              className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                settlementPaymentMethod === method
                                  ? "border-[#0A4731] bg-[#0A4731] text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {method}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  disabled={settlingBill || loadingSettlementBill}
                  onClick={() => setSettlementBill(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={settlingBill || loadingSettlementBill || Boolean(settlementError)}
                  onClick={settleBillInPopup}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A4731] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#062D22] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {settlingBill && <Loader2 className="h-4 w-4 animate-spin" />}
                  {settlingBill ? "Settling…" : "Confirm Settlement"}
                </button>
              </footer>
            </>
          )}
        </section>
      </div>
    )}

    {mergeModalOpen && (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5">
        <button
          type="button"
          aria-label="Close merge tables dialog"
          disabled={mergingTables}
          onClick={() => {
            setMergeModalOpen(false);
            setMergeConfirmationOpen(false);
          }}
          className="absolute inset-0 h-full w-full cursor-default disabled:cursor-wait"
        />
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="billing-merge-heading"
          className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        >
          <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
            <div>
              <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-800">
                <GitMerge className="h-4 w-4" />
                Table management
              </p>
              <h2 id="billing-merge-heading" className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                {mergeConfirmationOpen ? "Confirm table merge" : "Merge occupied tables"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {mergeConfirmationOpen
                  ? "Review the selected tables and combined bill before continuing."
                  : "Choose the primary table first, then select the secondary table to merge."}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close merge tables dialog"
              disabled={mergingTables}
              onClick={() => {
                setMergeModalOpen(false);
                setMergeConfirmationOpen(false);
              }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-950 disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </header>

          {mergeError && (
            <div role="alert" className="mx-5 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 sm:mx-6">
              {mergeError}
            </div>
          )}

          {mergeConfirmationOpen ? (
            <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                <p className="text-sm font-bold text-slate-900">
                  Are you sure you want to merge Table {primaryMergeTable?.table_number || "—"} and Table {secondaryMergeTable?.table_number || "—"} into Table {primaryMergeTable?.table_number || "—"}?
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  The primary table will keep its active bill. The secondary table will become available after the merge succeeds.
                </p>
              </div>
              {mergePreview && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <span className="text-sm font-bold text-emerald-900">
                    {combinedMergeItems.length} combined food item{combinedMergeItems.length === 1 ? "" : "s"}
                  </span>
                  <span className="text-lg font-black text-emerald-900">{formatCurrency(mergePreview.grandTotal)}</span>
                </div>
              )}
              {mergeEligibilityError && (
                <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                  {mergeEligibilityError}
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={mergingTables}
                  onClick={() => setMergeConfirmationOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={mergingTables || !mergePreview || Boolean(mergeEligibilityError)}
                  onClick={confirmTableMerge}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A4731] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#062D22] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {mergingTables && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mergingTables ? "Merging…" : "Confirm Merge"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid min-h-0 gap-5 overflow-y-auto p-5 sm:p-6 lg:grid-cols-[0.9fr_1.1fr]">
                <section aria-label="Occupied tables to merge" className="min-w-0">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Occupied tables</h3>
                      <p className="mt-0.5 text-xs text-slate-500">Only tables with an active bill can be selected.</p>
                    </div>
                    <button
                      type="button"
                      disabled={loadingMergeTables}
                      onClick={async () => {
                        setLoadingMergeTables(true);
                        setMergeError("");
                        if (!await loadBillingData({ showLoading: false })) {
                          setMergeError("Could not refresh tables and bills. Please try again.");
                        }
                        setLoadingMergeTables(false);
                      }}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${loadingMergeTables ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  </div>

                  {loadingMergeTables ? (
                    <div className="flex min-h-48 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                      Loading occupied tables…
                    </div>
                  ) : occupiedMergeTables.length ? (
                    <div className="grid max-h-[48vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-1">
                      {occupiedMergeTables.map((table) => {
                        const tableId = String(table.table_id || table.id);
                        const activeBill = billsByTableId.get(tableId);
                        const canSelect = Boolean(activeBill?.bill_id);
                        const isPrimary = tableId === mergePrimaryTableId;
                        const isSecondary = tableId === mergeSecondaryTableId;
                        const selectedRole = isPrimary ? "Primary Table" : isSecondary ? "Secondary Table" : "";
                        return (
                          <button
                            key={tableId}
                            type="button"
                            disabled={!canSelect}
                            onClick={() => selectMergeTable(table)}
                            className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              isPrimary ? "border-emerald-300 bg-emerald-50/70 ring-1 ring-emerald-200" :
                                isSecondary ? "border-orange-300 bg-orange-50/70 ring-1 ring-orange-200" :
                                  "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                              isPrimary ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"
                            }`}>
                              <Table2 className="h-5 w-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <strong className="text-sm font-black text-slate-900">
                                  Table {table.table_number || table.table_name || tableId}
                                </strong>
                                {selectedRole && (
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    isPrimary ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"
                                  }`}>
                                    {selectedRole}
                                  </span>
                                )}
                              </span>
                              {table.table_name && table.table_name !== table.table_number && (
                                <span className="mt-0.5 block truncate text-xs text-slate-500">{table.table_name}</span>
                              )}
                              <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                                <span className="inline-flex items-center gap-1">
                                  <span className="h-2 w-2 rounded-full bg-orange-500" /> Occupied
                                </span>
                                {activeBill ? (
                                  <>
                                    <span>Bill #{activeBill.bill_number}</span>
                                    <span className="font-bold text-slate-800">{formatCurrency(activeBill.grand_total)}</span>
                                  </>
                                ) : (
                                  <span className="font-semibold text-rose-700">No active bill</span>
                                )}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center">
                      <Table2 className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-2 text-sm font-bold text-slate-700">No occupied tables</p>
                      <p className="mt-1 text-xs text-slate-500">There are no occupied tables available to merge.</p>
                    </div>
                  )}
                </section>

                <div className="min-w-0 space-y-4">
                  <section aria-label="Selected table bill details">
                    <div className="mb-3">
                      <h3 className="text-sm font-black text-slate-900">Selected table details</h3>
                      <p className="mt-0.5 text-xs text-slate-500">Review both active bills before merging.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { table: primaryMergeTable, bill: primaryMergeBill, details: primaryMergeDetails, role: "Primary Table", roleClass: "text-emerald-800", borderClass: "border-emerald-200" },
                        { table: secondaryMergeTable, bill: secondaryMergeBill, details: secondaryMergeDetails, role: "Secondary Table", roleClass: "text-orange-800", borderClass: "border-orange-200" },
                      ].map(({ table, bill, details, role, roleClass, borderClass }) => {
                        const billId = String(bill?.bill_id || "");
                        const isLoading = loadingMergeBillIds.has(billId);
                        return (
                          <article key={role} className={`min-h-44 rounded-2xl border ${table ? borderClass : "border-dashed border-slate-200"} bg-white p-3`}>
                            <p className={`text-[10px] font-black uppercase tracking-wider ${table ? roleClass : "text-slate-400"}`}>{role}</p>
                            {table ? (
                              <>
                                <div className="mt-1 flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h4 className="truncate text-sm font-black text-slate-900">
                                      Table {table.table_number || table.table_name || "—"}
                                    </h4>
                                    {table.table_name && table.table_name !== table.table_number && (
                                      <p className="truncate text-xs text-slate-500">{table.table_name}</p>
                                    )}
                                  </div>
                                  {role === "Secondary Table" && (
                                    <button
                                      type="button"
                                      onClick={() => makeMergeTablePrimary(String(table.table_id || table.id))}
                                      className="shrink-0 text-[10px] font-bold text-emerald-800 hover:underline"
                                    >
                                      Make primary
                                    </button>
                                  )}
                                </div>
                                <p className="mt-1 text-xs font-semibold text-slate-600">
                                  Active bill: {bill?.bill_number ? `#${bill.bill_number}` : "Not found"}
                                </p>
                                {isLoading ? (
                                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-700" />
                                    Loading order items…
                                  </div>
                                ) : details ? (
                                  <>
                                    <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto border-t border-slate-100 pt-2">
                                      {getBillItems(details).length ? getBillItems(details).map((item, index) => (
                                        <li key={`${billId}-${item.food_id || item.food_name}-${index}`} className="flex items-start justify-between gap-2 text-xs">
                                          <span className="min-w-0 truncate text-slate-700">
                                            {item.food_name || "Food item"} <span className="font-bold text-slate-500">×{Number(item.quantity || 0)}</span>
                                          </span>
                                          <span className="shrink-0 font-semibold text-slate-700">{formatCurrency(item.total_price ?? Number(item.unit_price || 0) * Number(item.quantity || 0))}</span>
                                        </li>
                                      )) : <li className="text-xs text-slate-500">No food items on this bill.</li>}
                                    </ul>
                                    <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                                      <span className="font-semibold text-slate-500">Bill amount</span>
                                      <span className="font-black text-slate-900">{formatCurrency(details.grand_total)}</span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="mt-3 text-xs text-slate-500">
                                    <p>{bill ? "Select this table to load its bill items." : "This table has no active bill."}</p>
                                    {bill && mergeError && (
                                      <button
                                        type="button"
                                        onClick={() => loadMergeBillDetails(bill)}
                                        className="mt-1 font-bold text-emerald-800 hover:underline"
                                      >
                                        Retry bill details
                                      </button>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="mt-3 text-xs text-slate-500">Select an occupied table to assign this role.</p>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </section>

                  <section aria-label="Combined order preview" className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black text-slate-900">Combined order preview</h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {mergePreview ? `${combinedMergeItems.length} distinct food item${combinedMergeItems.length === 1 ? "" : "s"}` : "Select two tables to preview the combined bill."}
                        </p>
                      </div>
                      {mergePreview && <strong className="shrink-0 text-base font-black text-emerald-900">{formatCurrency(mergePreview.grandTotal)}</strong>}
                    </div>
                    {mergePreview && (
                      <>
                        <ul className="mt-3 max-h-32 space-y-1.5 overflow-y-auto border-t border-slate-200 pt-3">
                          {combinedMergeItems.map((item, index) => (
                            <li key={`${item.food_id || item.food_name}-${index}`} className="flex items-center justify-between gap-3 text-xs">
                              <span className="min-w-0 truncate text-slate-700">
                                {item.food_name || "Food item"} <span className="font-bold text-slate-500">×{item.quantity}</span>
                              </span>
                              <span className="shrink-0 font-semibold text-slate-700">{formatCurrency(item.total_price)}</span>
                            </li>
                          ))}
                        </ul>
                        <dl className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-xs">
                          <div className="flex justify-between gap-3 text-slate-600">
                            <dt>Subtotal</dt><dd>{formatCurrency(mergePreview.subtotal)}</dd>
                          </div>
                          <div className="flex justify-between gap-3 text-slate-600">
                            <dt>Tax ({mergePreview.taxRate.toFixed(2)}%)</dt><dd>{formatCurrency(mergePreview.taxAmount)}</dd>
                          </div>
                          <div className="flex justify-between gap-3 text-slate-600">
                            <dt>Discount</dt><dd>−{formatCurrency(mergePreview.discount)}</dd>
                          </div>
                          <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 text-sm font-black text-slate-900">
                            <dt>Combined total</dt><dd>{formatCurrency(mergePreview.grandTotal)}</dd>
                          </div>
                        </dl>
                      </>
                    )}
                    {mergeEligibilityError && (
                      <p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                        {mergeEligibilityError}
                      </p>
                    )}
                  </section>
                </div>
              </div>

              <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  disabled={mergingTables}
                  onClick={() => setMergeModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    !mergePrimaryTableId ||
                    !mergeSecondaryTableId ||
                    !primaryMergeDetails ||
                    !secondaryMergeDetails ||
                    Boolean(mergeEligibilityError) ||
                    loadingMergeBillIds.size > 0 ||
                    mergingTables
                  }
                  onClick={() => setMergeConfirmationOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A4731] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#062D22] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <GitMerge className="h-4 w-4" />
                  Merge Tables
                </button>
              </footer>
            </>
          )}
        </section>
      </div>
    )}
    </main>
  );
};

export default PointOfSale;
