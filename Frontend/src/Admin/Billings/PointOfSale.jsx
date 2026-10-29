import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bike,
  ChevronRight,
  CircleDollarSign,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  ShoppingBag,
  Table2,
  X,
} from "lucide-react";
import api from "../../api";

const tableStatus = (table) => (
  Number(table.reservation_is_active) === 1 ? "Reserved" : table.status || "Available"
);

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

  const availableCount = tables.filter((table) => tableStatus(table) === "Available").length;
  const occupiedCount = tables.filter((table) => tableStatus(table) === "Occupied").length;
  const reservedCount = tables.filter((table) => tableStatus(table) === "Reserved").length;

  return (
    <main className="min-h-screen bg-[#f3f4f6] px-4 pb-32 pt-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-700">Restaurant Point of Sale</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Billing & Orders</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Start a real kitchen order, review active table bills, and continue settlement from the table workspace.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={loadBillingData} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
            <button
              type="button"
              onClick={() => { setShowTables(false); setSheetOpen(true); }}
              aria-label="Start a new order"
              className="grid h-11 w-11 place-items-center rounded-xl bg-[#FF5A00] text-white shadow-md shadow-orange-500/25 transition hover:bg-[#E94B00] active:scale-95"
            >
              <Plus size={24} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <span>{error}</span>
            <button type="button" onClick={loadBillingData} className="font-bold underline">Try again</button>
          </div>
        )}

        <section aria-label="Table status" className="mt-7 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Available", value: availableCount, tone: "text-emerald-800 bg-emerald-50 border-emerald-100" },
            { label: "Occupied", value: occupiedCount, tone: "text-amber-800 bg-amber-50 border-amber-100" },
            { label: "Reserved", value: reservedCount, tone: "text-blue-800 bg-blue-50 border-blue-100" },
          ].map((item) => (
            <article key={item.label} className={`rounded-2xl border p-5 ${item.tone}`}>
              <p className="text-xs font-bold uppercase tracking-wide">{item.label} tables</p>
              <p className="mt-2 text-3xl font-black">{loading ? "—" : item.value}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-extrabold">Active table bills</h2>
              <p className="mt-1 text-xs text-slate-500">Bills remain active until settlement succeeds.</p>
            </div>
            <button type="button" onClick={goToBills} className="inline-flex items-center gap-1 text-sm font-bold text-emerald-800 hover:underline">
              Open table billing <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {loading ? (
            <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading active bills…</div>
          ) : activeBills.length ? (
            <div className="divide-y divide-slate-100">
              {activeBills.map((bill) => (
                <article key={bill.bill_id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50">
                  <button type="button" onClick={() => completeActiveBill(bill)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Table2 size={19} /></span>
                    <span className="min-w-0"><strong className="block text-sm">Table {bill.table_number}</strong><span className="text-xs text-slate-500">Bill #{bill.bill_number} · {bill.status}</span></span>
                    <span className="ml-auto font-bold tabular-nums">₹{Number(bill.grand_total || 0).toFixed(2)}</span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => addItemsToActiveBill(bill)} className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-orange-800 transition hover:bg-orange-50">
                      Add items
                    </button>
                    <button type="button" onClick={() => completeActiveBill(bill)} className="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-900">
                      Complete bill
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center">
              <CircleDollarSign className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-700">No active table bills</p>
              <p className="mt-1 text-xs text-slate-500">A table bill is created when its first order is sent to the kitchen.</p>
            </div>
          )}
        </section>
      </div>

      <div className={`fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-200 sm:items-center ${sheetOpen ? "visible bg-slate-950/45 opacity-100" : "invisible pointer-events-none opacity-0"}`}>
        <button type="button" aria-label="Close order selector" onClick={closeOrderSelector} className="absolute inset-0 h-full w-full cursor-default" />
        <section aria-labelledby="order-selector-heading" aria-modal="true" role="dialog" aria-hidden={!sheetOpen} inert={!sheetOpen} className={`relative max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-white px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl transition-transform duration-300 sm:max-w-2xl sm:rounded-3xl sm:p-6 ${sheetOpen ? "translate-y-0" : "translate-y-full"}`}>
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300 sm:hidden" />
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-700">{showTables ? "Dine-In" : "New order"}</p>
              <h2 id="order-selector-heading" className="mt-1 text-xl font-extrabold text-slate-900">{showTables ? "Select a table" : "Select Order Type"}</h2>
            </div>
            <button type="button" onClick={closeOrderSelector} aria-label="Close order selector" className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"><X size={19} /></button>
          </div>

          {!showTables ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { type: "dine-in", label: "Dine-In / Table", detail: "Select a table", Icon: Table2 },
                { type: "home_delivery", label: "Home Delivery", detail: "Customer & delivery address", Icon: Bike },
                { type: "pickup", label: "Pick Up", detail: "Customer pickup order", Icon: ShoppingBag },
              ].map(({ type, label, detail, Icon }) => (
                <button key={type} type="button" onClick={() => openOrderType(type)} className="flex min-h-24 items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-orange-300 hover:bg-orange-50 sm:flex-col sm:items-start">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-700"><Icon size={22} /></span>
                  <span><span className="block text-sm font-bold text-slate-900">{label}</span><span className="mt-1 block text-xs text-slate-500">{detail}</span></span>
                </button>
              ))}
            </div>
          ) : loading ? (
            <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading tables…</div>
          ) : (
            <>
              {error && <p role="alert" className="mb-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
              {tables.length ? (
                <div className="grid max-h-[55vh] gap-3 overflow-y-auto sm:grid-cols-2">
                  {tables.map((table) => {
                    const status = tableStatus(table);
                    const allowed = status === "Available" || status === "Occupied";
                    const existingBill = activeBills.find((bill) => String(bill.table_id) === String(table.table_id));
                    return (
                      <button key={table.table_id || table.id} type="button" onClick={() => selectTable(table)} disabled={!allowed} className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${status === "Available" ? "border-emerald-200 hover:bg-emerald-50" : status === "Occupied" ? "border-amber-200 hover:bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                        <span className="flex min-w-0 items-center gap-3">
                          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${status === "Available" ? "bg-emerald-100 text-emerald-800" : status === "Occupied" ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-500"}`}><Table2 size={19} /></span>
                          <span className="min-w-0"><strong className="block truncate text-sm">Table {table.table_number}</strong><span className="mt-1 block text-xs text-slate-500">{table.no_of_seats ? `${table.no_of_seats} seats · ` : ""}{status}{existingBill ? ` · Bill #${existingBill.bill_number}` : ""}</span></span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                  <MapPin className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-700">No tables are configured</p>
                  <p className="mt-1 text-xs text-slate-500">Add tables before starting a dine-in order.</p>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
};

export default PointOfSale;
