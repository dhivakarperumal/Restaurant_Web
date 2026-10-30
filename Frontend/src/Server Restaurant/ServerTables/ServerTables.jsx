import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Armchair,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  FileText,
  Flame,
  Layers,
  LayoutGrid,
  Loader2,
  List,
  Merge,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Table2,
  Trash2,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api";
import { useAuth } from "../../PrivateRouter/AuthContext";

const statusConfig = {
  Available: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badge: "bg-emerald-500",
    label: "Available",
  },
  Occupied: {
    bg: "bg-orange-50 text-orange-700 border-orange-200",
    badge: "bg-orange-500",
    label: "Occupied",
  },
  Reserved: {
    bg: "bg-blue-50 text-blue-700 border-blue-200",
    badge: "bg-blue-500",
    label: "Reserved",
  },
  Maintenance: {
    bg: "bg-gray-100 text-gray-700 border-gray-300",
    badge: "bg-gray-500",
    label: "Maintenance",
  },
};

const formatReservationTime = (value) => {
  if (!value) return "";
  const [hour, minute] = String(value).slice(0, 5).split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
};

const formatReservationDate = (value) => {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value).slice(0, 10)
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export default function ServerTables() {
  const { userProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminTablesPage = location.pathname.startsWith("/admin/tables");
  const serverLookupId = userProfile?.employee_id || userProfile?.employeeId || userProfile?.user_id || userProfile?.id || userProfile?.uuid;
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoadError, setTableLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [viewMode, setViewMode] = useState(() => isAdminTablesPage ? "table" : "grid");
  const [sortOrder, setSortOrder] = useState("latest");
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [activeBills, setActiveBills] = useState([]);
  const [viewingBill, setViewingBill] = useState(null);
  const [mergeTablesOpen, setMergeTablesOpen] = useState(false);
  const [mergeConfirmationOpen, setMergeConfirmationOpen] = useState(false);
  const [mergePrimaryTableId, setMergePrimaryTableId] = useState("");
  const [mergeSecondaryTableIds, setMergeSecondaryTableIds] = useState([]);
  const [loadingMergeTables, setLoadingMergeTables] = useState(false);
  const [mergingTables, setMergingTables] = useState(false);
  const [loadingBillDetails, setLoadingBillDetails] = useState(false);
  const [settlingBill, setSettlingBill] = useState(false);
  const settleLock = useRef(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [settleDiscount, setSettleDiscount] = useState(0);
  const orderLock = useRef(false);
  const billItems = useMemo(() => {
    if (!viewingBill) return [];
    const roundItems = Array.isArray(viewingBill.rounds)
      ? viewingBill.rounds.flatMap((round) => round.items || [])
      : [];
    const sourceItems = roundItems.length
      ? roundItems
      : viewingBill.consolidated_items || viewingBill.items || [];
    const itemsByFood = new Map();
    sourceItems.forEach((item) => {
      const selectedAddons = item.selected_addons || [];
      const selectedCustomizations = item.selected_customizations || {};
      const key = `${item.food_id || item.food_name}:${item.unit_price}:${JSON.stringify([selectedAddons, selectedCustomizations])}`;
      const existing = itemsByFood.get(key);
      const quantity = Number(item.quantity || 0);
      const totalPrice = Number(item.total_price ?? Number(item.unit_price || 0) * quantity);
      if (existing) {
        existing.quantity += quantity;
        existing.total_price += totalPrice;
      } else {
        itemsByFood.set(key, {
          food_id: key,
          food_name: item.food_name,
          quantity,
          total_price: totalPrice,
          unit_price: Number(item.unit_price || 0),
          selected_addons: selectedAddons,
          selected_customizations: selectedCustomizations,
        });
      }
    });
    return Array.from(itemsByFood.values());
  }, [viewingBill]);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form input state
  const [formData, setFormData] = useState({
    table_number: "",
    no_of_seats: "",
    status: "Available",
    image_url: "",
  });
  const [tableImageFile, setTableImageFile] = useState(null);

  const fetchActiveBills = async () => {
    try {
      const res = await api.get("/table-bills?status=Active");
      if (res.data?.bills) {
        setActiveBills(res.data.bills);
      }
    } catch {
      // non-blocking
    }
  };

  const fetchKitchenOrders = async () => {
    try {
      const res = await api.get("/kitchen-orders");
      if (res.data?.orders) {
        setKitchenOrders(res.data.orders);
      }
    } catch {
      // non-blocking
    }
  };

  const fetchTables = async ({ quiet = false } = {}) => {
    try {
      if (!quiet) setLoading(true);
      setTableLoadError("");
      if (!isAdminTablesPage && !serverLookupId) {
        throw new Error("Your server employee ID is missing. Please sign in again.");
      }
      const res = isAdminTablesPage
        ? await api.get("/server-tables")
        : await api.get(`/server-tables/server/${encodeURIComponent(serverLookupId)}`);
      if (!res.data?.success || !Array.isArray(res.data.tables)) {
        throw new Error(res.data?.message || "Table data was invalid.");
      }
      setTables(res.data.tables);
      await Promise.all([fetchKitchenOrders(), fetchActiveBills()]);
    } catch (error) {
      console.error("Error loading server tables:", error);
      const message = error.response?.data?.message || error.message || "Failed to load server tables";
      setTableLoadError(message);
      toast.error(message);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    const interval = window.setInterval(() => {
      fetchTables({ quiet: true });
    }, 10000);
    return () => window.clearInterval(interval);
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      table_number: "",
      no_of_seats: "",
      status: "Available",
      image_url: "",
    });
    setTableImageFile(null);
    setEditingTable(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (table) => {
    setFormData({
      table_number: table.table_number || "",
      no_of_seats: table.no_of_seats || "",
      status: table.status || "Available",
      image_url: table.image_url || "",
    });
    setTableImageFile(null);
    setEditingTable(table);
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tableNumber = String(formData.table_number || "").trim();
    const seats = Number(formData.no_of_seats);

    if (!tableNumber) {
      toast.error("Please enter a valid table number");
      return;
    }

    if (!formData.no_of_seats || Number.isNaN(seats) || seats <= 0 || !Number.isInteger(seats)) {
      toast.error("Number of seats must be a positive whole number");
      return;
    }

    try {
      setSubmitting(true);
      let imageUrl = formData.image_url;
      if (tableImageFile) {
        const uploadData = new FormData();
        uploadData.append("folder", "tables");
        uploadData.append("file", tableImageFile);
        const uploadResponse = await api.post("/upload", uploadData);
        imageUrl = uploadResponse.data?.url;
        if (!imageUrl) throw new Error("The image upload did not return an image URL.");
      }

      if (editingTable) {
        const idToUpdate = editingTable.table_id || editingTable.id;
        const res = await api.put(`/server-tables/${idToUpdate}`, {
          table_number: tableNumber,
          no_of_seats: seats,
          image_url: imageUrl || null,
          status: formData.status,
          user_id: userProfile?.user_id,
        });
        if (res.data?.success) {
          toast.success("Table updated successfully!");
          setIsAddModalOpen(false);
          fetchTables();
        }
      } else {
        const res = await api.post("/server-tables", {
          table_number: tableNumber,
          no_of_seats: seats,
          image_url: imageUrl || null,
          status: formData.status,
          user_id: userProfile?.user_id,
        });
        if (res.data?.success) {
          toast.success(`Table "${tableNumber}" added successfully!`);
          setIsAddModalOpen(false);
          fetchTables();
        }
      }
    } catch (error) {
      console.error("Save table error:", error);
      toast.error(error.response?.data?.message || "Operation failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (table) => {
    const tableIdentifier = table.table_id || table.id;
    if (!window.confirm(`Are you sure you want to delete table "${table.table_number}"?`)) {
      return;
    }

    try {
      const res = await api.delete(`/server-tables/${tableIdentifier}`);
      if (res.data?.success) {
        toast.success(`Table "${table.table_number}" deleted successfully`);
        fetchTables();
      }
    } catch (error) {
      console.error("Delete table error:", error);
      toast.error(error.response?.data?.message || "Failed to delete table");
    }
  };

  const handleQuickStatusChange = async (table, newStatus) => {
    if (table.status === newStatus) return;
    const tableIdentifier = table.table_id || table.id;
    try {
      const res = await api.put(`/server-tables/${tableIdentifier}`, {
        status: newStatus,
        user_id: userProfile?.user_id,
      });
      if (res.data?.success) {
        toast.success(`Table ${table.table_number} marked as ${newStatus}`);
        setTables((prev) =>
          prev.map((t) => (t.id === table.id ? { ...t, status: newStatus } : t))
        );
      }
    } catch (error) {
      console.error("Status change error:", error);
      toast.error("Failed to update status");
    }
  };

  const handleUnassignTable = async (table) => {
    if (!table.assigned_server_id) return;
    if (
      !window.confirm(
        `Are you sure you want to unassign Table "${table.table_number}" from ${table.assigned_server_name || "the server"}?`
      )
    ) {
      return;
    }

    try {
      const res = await api.post("/server-tables/unassign", {
        table_id: table.table_id || table.id,
        user_id: userProfile?.user_id,
      });
      if (res.data?.success) {
        toast.success(`Table "${table.table_number}" unassigned successfully`);
        fetchTables();
      }
    } catch (error) {
      console.error("Unassign table error:", error);
      toast.error(error.response?.data?.message || "Failed to unassign table");
    }
  };

  const handleMarkServed = async (orderId, tableNumber) => {
    if (!orderId) return;
    setUpdatingOrderId(orderId);
    try {
      const res = await api.patch(`/kitchen-orders/${encodeURIComponent(orderId)}/status`, {
        status: "Served",
      });
      if (res.data?.success) {
        toast.success(`Table ${tableNumber ? `"${tableNumber}"` : ""} order marked as Served!`);
        setKitchenOrders((prev) =>
          prev.map((o) =>
            (o.kitchen_order_id === orderId || o.order_id === orderId)
              ? { ...o, status: "Served" }
              : o
          )
        );
      }
    } catch (err) {
      console.error("Failed to mark order as served:", err);
      toast.error(err.response?.data?.message || "Failed to mark order as served");
    } finally {
      setUpdatingOrderId("");
    }
  };

  const getTableActiveOrder = (table) => {
    if (!kitchenOrders || kitchenOrders.length === 0) return null;
    const tId = table.table_id || table.id;
    const tNum = String(table.table_number || "").trim().toLowerCase();
    return kitchenOrders.find((order) => {
      const isCurrentTable =
        (order.table_id && (String(order.table_id) === String(tId) || String(order.table_id) === String(table.id))) ||
        (order.table_number && String(order.table_number).trim().toLowerCase() === tNum);
      const isNotCompleted = order.status !== "Served" && order.status !== "Cancelled";
      return isCurrentTable && isNotCompleted;
    });
  };

  const readyToServeOrders = useMemo(() => {
    if (!kitchenOrders) return [];
    return kitchenOrders.filter((o) => o.status === "Ready to Serve");
  }, [kitchenOrders]);

  const getTableActiveBill = (table) => {
    if (!activeBills || activeBills.length === 0) return null;
    const tId = table.table_id || table.id;
    const tNum = String(table.table_number || "").trim().toLowerCase();
    return activeBills.find((b) =>
      (b.table_id && (String(b.table_id) === String(tId) || String(b.table_id) === String(table.id))) ||
      (b.table_number && String(b.table_number).trim().toLowerCase() === tNum)
    );
  };

  const handleOpenBillModal = async (tableOrBill) => {
    try {
      setLoadingBillDetails(true);
      let billId = tableOrBill.bill_id;
      if (!billId) {
        const found = getTableActiveBill(tableOrBill);
        billId = found?.bill_id;
      }
      if (!billId) {
        const tId = tableOrBill.table_id || tableOrBill.id;
        const res = await api.get(`/table-bills/active/${tId}`);
        if (res.data?.bill) {
          setViewingBill(res.data.bill);
          setSettleDiscount(res.data.bill.discount || 0);
          setPaymentMethod(res.data.bill.payment_method || "Cash");
          return;
        }
        toast.error("No active bill found for this table");
        return;
      }

      const res = await api.get(`/table-bills/${billId}`);
      if (res.data?.bill) {
        setViewingBill(res.data.bill);
        setSettleDiscount(res.data.bill.discount || 0);
        setPaymentMethod(res.data.bill.payment_method || "Cash");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not load bill details");
    } finally {
      setLoadingBillDetails(false);
    }
  };

  useEffect(() => {
    const billId = location.state?.openBillId;
    if (!billId || loading) return;
    handleOpenBillModal({ bill_id: billId });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, loading, navigate]);

  const handleSettleBill = async () => {
    if (!viewingBill || settleLock.current) return;
    settleLock.current = true;
    try {
      setSettlingBill(true);
      const res = await api.post(`/table-bills/${viewingBill.bill_id}/settle`, {
        payment_method: paymentMethod,
        discount: Number(settleDiscount) || 0,
      });
      if (res.data?.success) {
        toast.success(`Bill #${viewingBill.bill_number} settled for Table ${viewingBill.table_number}. Table is now Available!`);
        setViewingBill(null);
        fetchTables();
        fetchActiveBills();
        fetchKitchenOrders();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to settle bill");
    } finally {
      settleLock.current = false;
      setSettlingBill(false);
    }
  };

  const currentUserName = userProfile?.name || userProfile?.displayName || userProfile?.full_name || userProfile?.username;
  const getDisplayStatus = (table) => (
    Number(table.reservation_is_active) === 1 ? "Reserved" : table.status
  );
  const getReservationSchedule = (table) => {
    if (!table.next_reservation_date) return null;
    return {
      date: formatReservationDate(table.next_reservation_date),
      start: formatReservationTime(table.next_reservation_start_time),
      end: formatReservationTime(table.next_reservation_end_time),
    };
  };

  const selectTableForOrder = async (table) => {
    if (orderLock.current) return;
    const tableStatus = getDisplayStatus(table);
    if (tableStatus === "Occupied" || getTableActiveBill(table)) {
      await handleOpenBillModal(table);
      return;
    }
    if (tableStatus !== "Available") {
      toast.error(`Table ${table.table_number} is ${tableStatus.toLowerCase()} and cannot be selected.`);
      return;
    }
    if (!table.table_id) {
      toast.error("This table is missing its ID and cannot be checked for an active bill.");
      return;
    }
    orderLock.current = true;
    try {
      const activeBillResponse = await api.get(`/table-bills/active/${encodeURIComponent(table.table_id)}`);
      if (activeBillResponse.data?.bill) {
        setActiveBills((previous) => [
          activeBillResponse.data.bill,
          ...previous.filter((bill) => bill.bill_id !== activeBillResponse.data.bill.bill_id),
        ]);
        await handleOpenBillModal({ bill_id: activeBillResponse.data.bill.bill_id });
        return;
      }
      navigate("/server/foods", {
        state: {
          returnPath: isAdminTablesPage ? "/admin/billing" : "/server",
          selectedTable: {
            id: table.id ?? null,
            table_id: table.table_id,
            table_number: table.table_number,
            no_of_seats: table.no_of_seats,
          },
        },
      });
    } catch (error) {
      console.error("Could not verify table bill before starting an order:", error);
      toast.error(error.response?.data?.message || "Could not verify this table's active bill. Please try again.");
    } finally {
      orderLock.current = false;
    }
  };

  const openMergeTables = async () => {
    setMergePrimaryTableId("");
    setMergeSecondaryTableIds([]);
    setMergeConfirmationOpen(false);
    setMergeTablesOpen(true);
    setLoadingMergeTables(true);
    try {
      await fetchTables({ quiet: true });
    } finally {
      setLoadingMergeTables(false);
    }
  };

  const toggleMergeTable = (table) => {
    const tableId = String(table.table_id || "");
    if (getDisplayStatus(table) !== "Occupied" || !getTableActiveBill(table)) return;

    if (tableId === mergePrimaryTableId) {
      setMergePrimaryTableId(mergeSecondaryTableIds[0] || "");
      setMergeSecondaryTableIds((ids) => ids.slice(1));
      return;
    }
    if (mergeSecondaryTableIds.includes(tableId)) {
      setMergeSecondaryTableIds((ids) => ids.filter((id) => id !== tableId));
      return;
    }
    if (!mergePrimaryTableId) {
      setMergePrimaryTableId(tableId);
      return;
    }
    setMergeSecondaryTableIds((ids) => [...ids, tableId]);
  };

  const makeMergeTablePrimary = (tableId) => {
    if (tableId === mergePrimaryTableId) return;
    setMergeSecondaryTableIds((ids) => [
      mergePrimaryTableId,
      ...ids.filter((id) => id !== tableId),
    ]);
    setMergePrimaryTableId(tableId);
  };

  const confirmTableMerge = async () => {
    if (mergingTables || !mergePrimaryTableId || !mergeSecondaryTableIds.length) return;
    setMergingTables(true);
    try {
      const response = await api.post("/table-bills/merge", {
        primary_table_id: mergePrimaryTableId,
        merge_table_ids: mergeSecondaryTableIds,
      });
      if (!response.data?.success || !response.data.bill) {
        throw new Error(response.data?.message || "The tables could not be merged.");
      }

      toast.success(response.data.message || "Tables merged successfully.");
      setMergeTablesOpen(false);
      setMergeConfirmationOpen(false);
      setMergePrimaryTableId("");
      setMergeSecondaryTableIds([]);
      setViewingBill(response.data.bill);
      setSettleDiscount(response.data.bill.discount || 0);
      await Promise.all([
        fetchTables({ quiet: true }),
        fetchActiveBills(),
        fetchKitchenOrders(),
      ]);
    } catch (error) {
      console.error("Could not merge table bills:", error);
      toast.error(error.response?.data?.message || error.message || "Could not merge tables. Please refresh and try again.");
    } finally {
      setMergingTables(false);
    }
  };

  const baseTables = tables;

  // Filtered tables
  const filteredTables = useMemo(() => {
    return baseTables.filter((table) => {
      const activeOrder = getTableActiveOrder(table);
      const activeBill = getTableActiveBill(table);
      const searchableValues = [
        table.table_number,
        table.table_id,
        table.assigned_server_name,
        table.created_by,
        activeOrder?.order_id,
        activeOrder?.kitchen_order_id,
        activeBill?.bill_number,
        activeBill?.bill_id,
        ...(activeOrder?.items || []).flatMap((item) => [item.food_name, item.name]),
        ...(activeBill?.items || []).flatMap((item) => [item.food_name, item.name]),
      ];
      const normalizedSearchQuery = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !normalizedSearchQuery ||
        searchableValues.some((value) =>
          String(value || "").toLowerCase().includes(normalizedSearchQuery)
        );

      const matchesStatus = !isAdminTablesPage ||
        statusFilter === "all" ||
        String(getDisplayStatus(table) || "").toLowerCase() === statusFilter.toLowerCase();

      const userEmpId = userProfile?.employee_id || userProfile?.employeeId;
      const matchesAssignment =
        !isAdminTablesPage ||
        assignmentFilter === "all" ||
        (assignmentFilter === "assigned" && Boolean(table.assigned_server_id)) ||
        (assignmentFilter === "unassigned" && !table.assigned_server_id) ||
        (assignmentFilter === "my-tables" && table.assigned_server_id === userEmpId);

      return matchesSearch && matchesStatus && matchesAssignment;
    });
  }, [baseTables, searchQuery, statusFilter, assignmentFilter, isAdminTablesPage, kitchenOrders, activeBills]);

  const sortedTables = useMemo(() => {
    if (isAdminTablesPage) return filteredTables;

    const getSortValue = (table) => {
      const activeOrder = getTableActiveOrder(table);
      const activeBill = getTableActiveBill(table);
      const timestamp = Date.parse(
        activeOrder?.created_at ||
        activeBill?.created_at ||
        table.created_at ||
        ""
      );
      return Number.isFinite(timestamp)
        ? timestamp
        : Number(table.id || table.table_id) || 0;
    };

    return [...filteredTables].sort((a, b) => {
      const difference = getSortValue(a) - getSortValue(b);
      return sortOrder === "latest" ? -difference : difference;
    });
  }, [filteredTables, sortOrder, kitchenOrders, activeBills, isAdminTablesPage]);

  // Statistics
  const stats = useMemo(() => {
    const total = baseTables.length;
    const available = baseTables.filter((t) => getDisplayStatus(t) === "Available").length;
    const occupied = baseTables.filter((t) => getDisplayStatus(t) === "Occupied").length;
    const reserved = baseTables.filter((t) => getDisplayStatus(t) === "Reserved").length;
    const assigned = baseTables.filter((t) => Boolean(t.assigned_server_id)).length;
    const unassigned = baseTables.length - assigned;
    const totalSeats = baseTables.reduce((sum, t) => sum + Number(t.no_of_seats || 0), 0);
    return { total, available, occupied, reserved, assigned, unassigned, totalSeats };
  }, [baseTables]);

  return (
    <div className={isAdminTablesPage ? "min-h-screen bg-[#f2f3f0] p-4 md:p-6" : "space-y-6"}>
      <div className={isAdminTablesPage ? "mx-auto max-w-[1500px] space-y-6" : "space-y-6"}>
      {isAdminTablesPage && (
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            {!isAdminTablesPage && <div className="p-2 rounded-xl bg-[#1f3228] text-[#d4a843]">
              <UtensilsCrossed className="w-5 h-5" />
            </div>}
            <div>
              <h1 className={isAdminTablesPage ? "text-[2.1rem] font-bold tracking-[-0.05em] text-[#1f1d1b]" : "text-xl sm:text-2xl font-bold text-gray-900 font-serif"}>
                {isAdminTablesPage ? "Tables" : "My Assigned Tables"}
              </h1>
              {isAdminTablesPage && (
                <p className="mt-2 text-[13px] text-[#646464]">
                  Dashboard <span className="mx-2 text-[#9a9a9a]">&gt;</span> <span className="font-medium text-[#2a2a2a]">Tables</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isAdminTablesPage && (
            <button
              onClick={fetchTables}
              title="Refresh tables"
              className="flex h-[46px] w-[46px] cursor-pointer items-center justify-center rounded-xl border border-[#dfe2e5] bg-white text-gray-600 transition hover:bg-[#faf9f8]"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>
      )}

      {/* Ready to Serve Alert Banner for Servers */}
      {!isAdminTablesPage && readyToServeOrders.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-4 rounded-2xl shadow-md border border-emerald-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl text-white">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base flex items-center gap-2">
                Order Ready for Pickup! 🔔
                <span className="bg-white text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
                  {readyToServeOrders.length} {readyToServeOrders.length === 1 ? "Order" : "Orders"}
                </span>
              </h4>
              <p className="text-xs text-emerald-100 mt-0.5">
                The kitchen has finished cooking for Table(s):{" "}
                <span className="font-bold text-white underline">
                  {readyToServeOrders
                    .map((o) => o.table_number || "Order #" + (o.order_id || o.kitchen_order_id))
                    .join(", ")}
                </span>
                . Please collect from the chef and serve to guests.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isAdminTablesPage && tableLoadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <span>{tableLoadError}</span>
          <button type="button" onClick={fetchTables} className="font-bold underline">Try again</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: isAdminTablesPage ? "Total Tables" : "My Assigned Tables",
            value: stats.total,
            icon: Layers,
            bg: "bg-[#22c55e]",
            tone: "bg-gradient-to-tr from-orange-500 to-amber-400 text-white shadow-orange-500/25",
            accentColor: "#f97316",
            glowColor: "#fb923c",
            hint: isAdminTablesPage ? "Dining tables" : "Assigned to station",
          },
          {
            title: "Available",
            value: stats.available,
            icon: CheckCircle2,
            bg: "bg-[#3b82f6]",
            tone: "bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-emerald-500/25",
            accentColor: "#10b981",
            glowColor: "#34d399",
            hint: "Ready for guests",
          },
          {
            title: "Occupied",
            value: stats.occupied,
            icon: Clock,
            bg: "bg-[#f59e0b]",
            tone: "bg-gradient-to-tr from-blue-600 to-cyan-400 text-white shadow-blue-500/25",
            accentColor: "#3b82f6",
            glowColor: "#60a5fa",
            hint: "Currently in use",
          },
          {
            title: "Total Seats",
            value: stats.totalSeats,
            icon: Armchair,
            bg: "bg-[#8b5cf6]",
            tone: "bg-gradient-to-tr from-violet-600 to-purple-400 text-white shadow-purple-500/25",
            accentColor: "#8b5cf6",
            glowColor: "#a78bfa",
            hint: "Dining capacity",
          },
        ].map(({ title, value, icon: Icon, bg, tone, accentColor, glowColor, hint }) => (
          <article
            key={title}
            className={isAdminTablesPage
              ? `relative flex min-h-[140px] min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-transparent ${bg} p-4 text-white shadow-[0_2px_10px_rgba(20,56,34,0.08)] sm:p-5`
              : "group relative flex min-h-[140px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_12px_24px_-6px_rgba(0,0,0,0.1)] sm:p-5"}
          >
            {!isAdminTablesPage && (
              <div
                className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-20 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-35"
                style={{ backgroundColor: glowColor }}
              />
            )}
            <div className={`relative z-10 flex items-start ${isAdminTablesPage ? "gap-3" : "justify-between gap-3"}`}>
              {isAdminTablesPage && (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/20 shadow-sm">
                  <Icon size={24} strokeWidth={2.2} className="text-white" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className={isAdminTablesPage ? "mb-1 truncate text-[12px] font-semibold opacity-90" : "truncate text-[11px] font-bold uppercase tracking-wider text-slate-500"}>{title}</h3>
                <div className={isAdminTablesPage ? "text-[26px] font-extrabold leading-none tracking-tight" : "mt-2.5 truncate text-[23px] font-black tracking-tight text-slate-800 sm:text-[27px]"}>{value}</div>
              </div>
              {!isAdminTablesPage && (
                <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${tone}`}>
                  <Icon size={24} strokeWidth={2.3} />
                </div>
              )}
            </div>
            <div className={isAdminTablesPage ? "relative z-10 mt-5 flex items-center gap-2" : "relative z-10 mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs"}>
              <div className={isAdminTablesPage ? "contents" : "flex min-w-0 items-center gap-1.5"}>
                <span className={isAdminTablesPage ? "inline-flex items-center gap-1 rounded-md bg-white/25 px-1.5 py-0.5 text-[11px] font-bold" : "inline-flex shrink-0 items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600 ring-1 ring-inset ring-emerald-500/20"}>
                  Live
                </span>
                <span className={isAdminTablesPage ? "truncate text-[11px] font-medium opacity-75" : "truncate font-medium text-slate-500"}>{hint}</span>
              </div>
              {!isAdminTablesPage && <span className="h-2 w-2 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: accentColor }} />}
            </div>
            {!isAdminTablesPage && (
              <div
                className="absolute bottom-0 left-0 h-[3px] w-0 transition-all duration-300 group-hover:w-full"
                style={{ backgroundColor: accentColor }}
              />
            )}
          </article>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className={isAdminTablesPage ? "flex flex-col gap-3 rounded-[18px] border border-[#e7e0d8] bg-white p-4 shadow-[0_1px_0_rgba(16,24,40,0.02)] lg:flex-row lg:items-center lg:justify-between" : "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm"}>
        <div className={isAdminTablesPage ? "flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center" : "contents"}>
          <div className={`relative flex-1 ${isAdminTablesPage ? "max-w-md" : "min-w-0 sm:max-w-[480px]"}`}>
            <Search className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isAdminTablesPage ? "left-3 w-4 h-4" : "left-4 w-5 h-5"}`} />
            <input
              type="text"
              placeholder={isAdminTablesPage ? "Search by table number or server..." : "Search table, ticket, food..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={isAdminTablesPage ? "h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-10 pr-3 text-[14px] text-[#2d2d2d] outline-none placeholder:text-[#8a8a8a] focus:border-[#d2bc8a]" : "h-[58px] w-full rounded-2xl border border-[#dfe2e5] bg-[#faf9f8] pl-12 pr-4 text-[15px] text-[#2d2d2d] outline-none placeholder:text-[#8a8a8a] focus:border-[#FF5A00]"}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
          {!isAdminTablesPage && (
            <span className="mr-2 whitespace-nowrap text-sm font-medium text-[#51605c]" aria-live="polite">
              {filteredTables.length} of {baseTables.length}
            </span>
          )}
          {/* Status filter tabs */}
          {isAdminTablesPage && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]"
            >
              <option value="all">All Statuses ({baseTables.length})</option>
              <option value="Available">Available ({stats.available})</option>
              <option value="Occupied">Occupied ({stats.occupied})</option>
              <option value="Reserved">Reserved ({stats.reserved})</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          )}

          {/* Assignment filter (Admin only) */}
          {isAdminTablesPage && (
            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
              className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]"
            >
              <option value="all">All Assignments ({tables.length})</option>
              <option value="assigned">Assigned ({stats.assigned || 0})</option>
              <option value="unassigned">Unassigned ({stats.unassigned || 0})</option>
            </select>
          )}

          {!isAdminTablesPage && (
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="h-[58px] min-w-[170px] rounded-2xl border border-[#dfe2e5] bg-white px-4 text-[15px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]"
              aria-label="Sort tables"
            >
              <option value="latest">Sort by: Latest</option>
              <option value="oldest">Sort by: Oldest</option>
            </select>
          )}

          {!isAdminTablesPage && (
            <button
              type="button"
              onClick={openMergeTables}
              className="inline-flex h-[58px] items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-800 transition hover:bg-orange-100"
            >
              <Merge className="h-4 w-4" />
              Merge Tables
            </button>
          )}

          {/* Server view mode toggle */}
          {!isAdminTablesPage && <div className="flex h-[58px] items-center overflow-hidden rounded-2xl border border-[#dfe2e5] bg-white">
            <button
              type="button"
              onClick={() => setViewMode(isAdminTablesPage ? "grid" : "table")}
              className={isAdminTablesPage
                ? `flex h-[46px] w-[46px] cursor-pointer items-center justify-center transition ${viewMode === "grid" ? "bg-[#1a3c36] text-white" : "text-[#4d4d4d] hover:bg-white"}`
                : `h-full w-[54px] cursor-pointer transition ${viewMode === "table" ? "bg-[#FF5A00] text-white" : "text-[#4d4d4d] hover:bg-orange-50"}`}
              aria-label={isAdminTablesPage ? "Card view" : "List view"}
              aria-pressed={isAdminTablesPage ? viewMode === "grid" : viewMode === "table"}
              title={isAdminTablesPage ? "Card view" : "List view"}
            >
              {isAdminTablesPage ? <LayoutGrid className="w-4 h-4" /> : <List className="mx-auto w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => setViewMode(isAdminTablesPage ? "table" : "grid")}
              className={isAdminTablesPage
                ? `flex h-[46px] w-[46px] cursor-pointer items-center justify-center border-l border-[#dfe2e5] transition ${viewMode === "table" ? "bg-[#1a3c36] text-white" : "text-[#4d4d4d] hover:bg-white"}`
                : `h-full w-[54px] border-l border-[#dfe2e5] cursor-pointer transition ${viewMode === "grid" ? "bg-[#FF5A00] text-white" : "text-[#4d4d4d] hover:bg-orange-50"}`}
              aria-label={isAdminTablesPage ? "Table view" : "Grid view"}
              aria-pressed={isAdminTablesPage ? viewMode === "table" : viewMode === "grid"}
              title={isAdminTablesPage ? "Table view" : "Grid view"}
            >
              {isAdminTablesPage ? <Table2 className="w-4 h-4" /> : <LayoutGrid className="mx-auto w-5 h-5" />}
            </button>
          </div>}
          </div>
        </div>

        {isAdminTablesPage && (
          <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-[15px] font-semibold text-white shadow-[0_6px_14px_rgba(26,60,54,0.18)] transition hover:bg-[#214a42]"
            >
              <Plus className="h-4 w-4" />
              <span>Add Table</span>
            </button>
            <div className="flex h-[46px] items-center overflow-hidden rounded-xl border border-[#dfe2e5] bg-[#faf9f8]">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex h-[46px] w-[46px] cursor-pointer items-center justify-center transition ${viewMode === "grid" ? "bg-[#1a3c36] text-white" : "text-[#4d4d4d] hover:bg-white"}`}
                aria-label="Card view"
                aria-pressed={viewMode === "grid"}
                title="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex h-[46px] w-[46px] cursor-pointer items-center justify-center border-l border-[#dfe2e5] transition ${viewMode === "table" ? "bg-[#1a3c36] text-white" : "text-[#4d4d4d] hover:bg-white"}`}
                aria-label="Table view"
                aria-pressed={viewMode === "table"}
                title="Table view"
              >
                <Table2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content: Grid or List */}
      {loading ? (
        <div className={isAdminTablesPage ? "flex flex-col items-center justify-center gap-3 rounded-[18px] border border-[#e7e0d8] bg-white p-12" : "bg-white p-12 rounded-2xl border border-gray-100 flex flex-col items-center justify-center gap-3"}>
          <Loader2 className="w-8 h-8 animate-spin text-[#d4a843]" />
          <p className="text-sm text-gray-500 font-medium">Loading server tables...</p>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className={isAdminTablesPage ? "space-y-4 rounded-[18px] border border-[#e7e0d8] bg-white p-12 text-center" : "bg-white p-12 rounded-2xl border border-gray-100 text-center space-y-4"}>
          <div className="w-16 h-16 rounded-full bg-[#1f3228]/10 text-[#1f3228] flex items-center justify-center mx-auto">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              {isAdminTablesPage ? "No tables found" : "No tables assigned to you"}
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
              {isAdminTablesPage
                ? (searchQuery || statusFilter !== "all"
                    ? "No server tables match your filter criteria. Try clearing search."
                    : "No server tables have been added yet. Click 'Add Table' to create your first dining table.")
                : (searchQuery
                    ? "No assigned tables match your filter criteria. Try clearing search or status filter."
                    : "You do not have any dining tables assigned to your station yet. Your restaurant administrator will assign tables to you.")}
            </p>
          </div>
          {isAdminTablesPage && !searchQuery && statusFilter === "all" && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#214a42]"
            >
              <Plus className="w-4 h-4" />
              Add First Table
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${isAdminTablesPage ? "rounded-[18px] lg:grid-cols-3 xl:grid-cols-4" : ""}`}>
          {sortedTables.map((table) => {
            const displayStatus = getDisplayStatus(table);
            const config = statusConfig[displayStatus] || statusConfig.Available;
            const reservationSchedule = getReservationSchedule(table);
            const activeOrder = getTableActiveOrder(table);
            const activeBill = getTableActiveBill(table);
            const isReady = activeOrder?.status === "Ready to Serve";
            return (
              <div
                key={table.table_id || table.id}
                className={
                  isAdminTablesPage
                    ? "relative flex flex-col justify-between rounded-xl border border-[#e7e0d8] bg-white p-5 shadow-sm transition hover:shadow-md"
                    : `bg-white rounded-2xl border shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between relative group ${
                        isReady
                          ? "border-emerald-400 ring-2 ring-emerald-500/40 bg-emerald-50/20"
                          : "border-gray-100"
                      }`
                }
              >
                <div>
                  {/* Top Bar: Table Number & Status */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {table.image_url && isAdminTablesPage ? (
                          <img
                            src={table.image_url}
                            alt={`${table.table_number} table`}
                            className="h-10 w-10 rounded-xl object-cover"
                          />
                        ) : (
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            isAdminTablesPage
                              ? "bg-[#1f3228] text-[#d4a843]"
                              : displayStatus === "Occupied"
                                ? "bg-orange-100 text-orange-700"
                                : displayStatus === "Reserved"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {isAdminTablesPage ? (
                              <span className="font-serif text-base font-bold">{table.table_number.length <= 4 ? table.table_number : "#"}</span>
                            ) : (
                              <Table2 className="h-5 w-5" />
                            )}
                          </div>
                        )}
                      <div>
                        <h4 className="font-bold text-gray-900 text-base leading-tight">
                          {table.table_number}
                        </h4>
                        {isAdminTablesPage ? (
                          <span className="text-[11px] text-gray-400 font-mono">
                            ID: #{table.id}
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-medium">
                            Assigned Table
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${config.badge}`} />
                      {displayStatus}
                    </span>
                  </div>

                  {reservationSchedule && (
                    <div className={`mb-3 rounded-xl border px-3 py-2 text-xs ${Number(table.reservation_is_active) === 1 ? "border-blue-200 bg-blue-50 text-blue-900" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                      <p className="font-semibold">
                        {Number(table.reservation_is_active) === 1 ? "Reserved now" : "Next reservation"}
                        {" · "}{reservationSchedule.date}
                      </p>
                      <p className="mt-1">
                        {reservationSchedule.start}–{reservationSchedule.end}
                        {table.next_reservation_guests ? ` · ${table.next_reservation_guests} guests` : ""}
                        {table.next_reservation_customer_name ? ` · ${table.next_reservation_customer_name}` : ""}
                      </p>
                      <p className="mt-1 font-medium">{table.next_reservation_status}</p>
                    </div>
                  )}

                  {/* Seat count & Details */}
                  <div className="space-y-2 py-3 border-y border-gray-100 my-3">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span className="flex items-center gap-1.5 text-gray-500 font-medium">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        Capacity:
                      </span>
                      <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md">
                        {table.no_of_seats} Seats
                      </span>
                    </div>

                    {isAdminTablesPage ? (
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span className="flex items-center gap-1.5 text-gray-500 font-medium">
                          <UtensilsCrossed className="w-3.5 h-3.5 text-gray-400" />
                          Server:
                        </span>
                        {table.assigned_server_id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                              {table.assigned_server_name || "Assigned"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUnassignTable(table)}
                              title="Unassign this server from table"
                              className="text-gray-400 hover:text-red-600 p-0.5 rounded transition cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Unassigned</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span className="flex items-center gap-1.5 text-gray-500 font-medium">
                          <UtensilsCrossed className="w-3.5 h-3.5 text-[#d4a843]" />
                          Station:
                        </span>
                        <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                          Assigned to {table.assigned_server_name || currentUserName || "you"}
                        </span>
                      </div>
                    )}
                    {!isAdminTablesPage && displayStatus === "Occupied" && (
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span className="flex items-center gap-1.5 text-gray-500 font-medium">
                        <FileText className="h-3.5 w-3.5 text-orange-600" />
                        Active bill:
                      </span>
                      <span className="font-semibold text-orange-800">
                        {activeBill ? `#${activeBill.bill_number}` : "No active bill found"}
                      </span>
                    </div>
                    )}
                  </div>

                  {/* Active Kitchen Order Status (Server View) */}
                  {!isAdminTablesPage && activeOrder && (
                    <div
                      className={`mb-3 p-3 rounded-xl border text-xs flex flex-col gap-1.5 transition-all ${
                        activeOrder.status === "Ready to Serve"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm"
                          : activeOrder.status === "Preparing"
                          ? "bg-blue-50 border-blue-200 text-blue-900"
                          : "bg-amber-50 border-amber-200 text-amber-900"
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="flex items-center gap-1.5">
                          {activeOrder.status === "Ready to Serve" && (
                            <Bell className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
                          )}
                          {activeOrder.status === "Preparing" && (
                            <Flame className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                          )}
                          {activeOrder.status === "Pending" && (
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          Kitchen:
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            activeOrder.status === "Ready to Serve"
                              ? "bg-emerald-600 text-white animate-pulse"
                              : activeOrder.status === "Preparing"
                              ? "bg-blue-600 text-white"
                              : "bg-amber-500 text-white"
                          }`}
                        >
                          {activeOrder.status}
                        </span>
                      </div>

                      {activeOrder.items && activeOrder.items.length > 0 && (
                        <div className="text-[11px] text-gray-600 line-clamp-1">
                          {activeOrder.items
                            .map((it) => `${it.food_name || it.name || "Item"} × ${it.quantity || 1}`)
                            .join(", ")}
                        </div>
                      )}

                      {activeOrder.status === "Ready to Serve" && (
                        <button
                          type="button"
                          disabled={
                            updatingOrderId ===
                            (activeOrder.kitchen_order_id || activeOrder.order_id)
                          }
                          onClick={() =>
                            handleMarkServed(
                              activeOrder.kitchen_order_id || activeOrder.order_id,
                              table.table_number
                            )
                          }
                          className="mt-1 w-full py-2 px-3 rounded-lg bg-[#FF5A00] hover:bg-[#E94B00] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {updatingOrderId ===
                          (activeOrder.kitchen_order_id || activeOrder.order_id)
                            ? "Marking as Served..."
                            : "Mark as Served ✓"}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Quick Switch & Actions */}
                <div className="pt-2 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <span className="text-gray-400">Quick Status:</span>
                    <div className="flex gap-1">
                      {["Available", "Occupied", "Reserved"].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleQuickStatusChange(table, st)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                            table.status === st
                              ? `${isAdminTablesPage ? "bg-[#1f3228]" : "bg-[#FF5A00]"} text-white shadow-sm`
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isAdminTablesPage && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleOpenEditModal(table)}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition cursor-pointer"
                        title="Edit Table"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(table)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                        title="Delete Table"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {!isAdminTablesPage && (
                    <div className="flex flex-col gap-2 mt-2">
                      <button
                        type="button"
                        disabled={!["Available", "Occupied"].includes(displayStatus)}
                        onClick={() => displayStatus === "Occupied" ? handleOpenBillModal(table) : selectTableForOrder(table)}
                        title={displayStatus === "Occupied" ? "View the existing active bill" : displayStatus === "Available" ? "Select table and create an order" : `Table is ${displayStatus.toLowerCase()}`}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 ${
                          displayStatus === "Occupied" ? "bg-orange-600 hover:bg-orange-700" : "bg-[#FF5A00] hover:bg-[#E94B00]"
                        }`}
                      >
                        {displayStatus === "Occupied" ? `View Bill${activeBill ? ` #${activeBill.bill_number}` : ""}` : displayStatus === "Available" ? "Select Table & Order" : displayStatus}
                        {displayStatus !== "Reserved" && <ArrowRight className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className={isAdminTablesPage ? "overflow-hidden rounded-md border border-[#e8e4df] bg-white" : "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={isAdminTablesPage ? "border-b border-orange-100 bg-orange-50 text-left text-sm font-semibold text-orange-700" : "bg-orange-50 border-b border-orange-100 text-xs text-orange-700 uppercase tracking-wider font-semibold"}>
                <tr>
                  {isAdminTablesPage && <th className="py-3.5 px-4"># ID</th>}
                  <th className="py-3.5 px-4">Table Number</th>
                  <th className="py-3.5 px-4">Seats</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Reservation</th>
                  {isAdminTablesPage ? (
                    <>
                      <th className="py-3.5 px-4">Assigned Server</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3.5 px-4">Assignment</th>
                      <th className="py-3.5 px-4">Kitchen Order</th>
                      <th className="py-3.5 px-4 text-right">Quick Status Update</th>
                      <th className="py-3.5 px-4 text-right">Menu</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedTables.map((table) => {
                  const displayStatus = getDisplayStatus(table);
                  const config = statusConfig[displayStatus] || statusConfig.Available;
                  const reservationSchedule = getReservationSchedule(table);
                  return (
                    <tr
                      key={table.table_id || table.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      {isAdminTablesPage && (
                        <td className="py-3 px-4 font-mono font-bold text-xs text-gray-700">
                          #{table.id}
                        </td>
                      )}
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        <div className="flex items-center gap-2">
                          {table.image_url ? (
                            <img
                              src={table.image_url}
                              alt={`${table.table_number} table`}
                              className="h-8 w-8 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-[#1f3228] text-[#d4a843] flex items-center justify-center font-bold text-xs font-serif">
                              {table.table_number.length <= 4 ? table.table_number : "#"}
                            </div>
                          )}
                          <span>{table.table_number}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md text-xs">
                          <Users className="w-3 h-3 text-gray-500" />
                          {table.no_of_seats} Seats
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${config.badge}`} />
                          {displayStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">
                        {reservationSchedule ? (
                          <div>
                            <span className="font-semibold text-gray-800">
                              {Number(table.reservation_is_active) === 1 ? "Reserved now" : reservationSchedule.date}
                            </span>
                            <span className="mt-0.5 block">
                              {reservationSchedule.start}–{reservationSchedule.end}
                              {table.next_reservation_guests ? ` · ${table.next_reservation_guests} guests` : ""}
                            </span>
                            <span className="mt-0.5 block">
                              {table.next_reservation_customer_name || ""}{table.next_reservation_customer_name && table.next_reservation_status ? " · " : ""}{table.next_reservation_status || ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">No upcoming reservations</span>
                        )}
                      </td>
                      {isAdminTablesPage ? (
                        <>
                          <td className="py-3 px-4">
                            {table.assigned_server_id ? (
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs">
                                  <UtensilsCrossed className="w-3 h-3 text-[#d4a843]" />
                                  {table.assigned_server_name || "Assigned"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUnassignTable(table)}
                                  title="Unassign server"
                                  className="text-gray-400 hover:text-red-600 p-0.5 rounded transition cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic text-xs">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(table)}
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                                title="Edit Table"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(table)}
                                className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                                title="Delete Table"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs">
                              <UtensilsCrossed className="w-3 h-3 text-[#d4a843]" />
                              Assigned to {table.assigned_server_name || currentUserName || "you"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {(() => {
                              const activeOrder = getTableActiveOrder(table);
                              if (!activeOrder) {
                                return <span className="text-gray-400 text-xs italic">No active order</span>;
                              }
                              return (
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                      activeOrder.status === "Ready to Serve"
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold animate-pulse"
                                        : activeOrder.status === "Preparing"
                                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                                        : "bg-amber-100 text-amber-800 border border-amber-200"
                                    }`}
                                  >
                                    {activeOrder.status === "Ready to Serve" && <Bell className="w-3 h-3 text-emerald-600" />}
                                    {activeOrder.status === "Preparing" && <Flame className="w-3 h-3 text-blue-600" />}
                                    {activeOrder.status === "Pending" && <Clock className="w-3 h-3 text-amber-600" />}
                                    {activeOrder.status}
                                  </span>
                                  {activeOrder.status === "Ready to Serve" && (
                                    <button
                                      type="button"
                                      disabled={updatingOrderId === (activeOrder.kitchen_order_id || activeOrder.order_id)}
                                      onClick={() => handleMarkServed(activeOrder.kitchen_order_id || activeOrder.order_id, table.table_number)}
                                      className="px-2 py-1 rounded bg-[#FF5A00] hover:bg-[#E94B00] text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                    >
                                      <Check className="w-3 h-3" /> Mark Served
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {["Available", "Occupied", "Reserved"].map((st) => (
                                <button
                                  key={st}
                                  onClick={() => handleQuickStatusChange(table, st)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                    table.status === st
                                      ? `${isAdminTablesPage ? "bg-[#1f3228]" : "bg-[#FF5A00]"} text-white shadow-sm`
                                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {(() => {
                                const activeBill = getTableActiveBill(table);
                                const displayStatus = getDisplayStatus(table);
                                return (
                                  <>
                                    {displayStatus === "Occupied" && activeBill && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenBillModal(table)}
                                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-bold text-orange-800 transition hover:bg-orange-100"
                                      >
                                        <FileText className="h-3.5 w-3.5" /> Bill #{activeBill.bill_number} (₹{Number(activeBill.grand_total || 0).toFixed(0)})
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      disabled={!["Available", "Occupied"].includes(displayStatus)}
                                      onClick={() => displayStatus === "Occupied" ? handleOpenBillModal(table) : selectTableForOrder(table)}
                                      title={displayStatus === "Occupied" ? "View the existing active bill" : displayStatus === "Available" ? "Select table and create an order" : `Table is ${displayStatus.toLowerCase()}`}
                                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 ${
                                        displayStatus === "Occupied" ? "bg-orange-600 hover:bg-orange-700" : "bg-[#FF5A00] hover:bg-[#E94B00]"
                                      }`}
                                    >
                                      {displayStatus === "Occupied" ? "View Active Bill" : displayStatus === "Available" ? "Select Table" : displayStatus}
                                      {displayStatus !== "Reserved" && <ArrowRight className="h-3.5 w-3.5" />}
                                    </button>
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Table Modal (Admin only) */}
      {isAdminTablesPage && isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-h-[90vh] max-w-md w-full overflow-y-auto p-6 shadow-2xl border border-gray-100 relative">
            <button
              onClick={() => !submitting && setIsAddModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-[#1f3228] text-[#d4a843]">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 font-serif">
                  {editingTable ? "Edit Server Table" : "Add New Server Table"}
                </h3>
                <p className="text-xs text-gray-500">
                  {editingTable
                    ? `Update configuration for Table ${editingTable.table_number}`
                    : "Add table number and seating capacity to the restaurant"}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Table Number Input Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Table Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-xs">
                    #
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Table 1, T-01, VIP-2"
                    value={formData.table_number}
                    onChange={(e) =>
                      setFormData({ ...formData, table_number: e.target.value })
                    }
                    className="w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-[#d4a843] focus:ring-2 focus:ring-[#d4a843]/20 transition"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  A unique identifier or display number for the table.
                </p>
              </div>

              {/* No of Seats Input Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Number of Seats <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    placeholder="e.g. 2, 4, 6"
                    value={formData.no_of_seats}
                    onChange={(e) =>
                      setFormData({ ...formData, no_of_seats: e.target.value })
                    }
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-[#d4a843] focus:ring-2 focus:ring-[#d4a843]/20 transition"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Total maximum guest capacity for this table.
                </p>
              </div>

              <div>
                <label htmlFor="server-table-image" className="block text-xs font-semibold text-gray-700 mb-1">
                  Table Image
                </label>
                {formData.image_url && (
                  <div className="mb-2 flex items-center gap-3">
                    <img
                      src={formData.image_url}
                      alt="Current table"
                      className="h-14 w-14 rounded-lg border border-gray-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((current) => ({ ...current, image_url: "" }));
                        setTableImageFile(null);
                      }}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Remove image
                    </button>
                  </div>
                )}
                <input
                  id="server-table-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    if (!file) return;
                    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                      toast.error("Choose a JPG, PNG, or WEBP image.");
                      event.target.value = "";
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("Image size must be 5 MB or less.");
                      event.target.value = "";
                      return;
                    }
                    setTableImageFile(file);
                  }}
                  className="w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-gray-700 hover:file:bg-gray-200"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Optional. JPG, PNG, or WEBP, up to 5 MB.
                  {tableImageFile ? ` Selected: ${tableImageFile.name}` : ""}
                </p>
              </div>

              {/* Status Select Field */}
              {/* <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Table Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#d4a843] focus:ring-2 focus:ring-[#d4a843]/20 transition"
                >
                  <option value="Available">Available (Ready for guests)</option>
                  <option value="Occupied">Occupied (Currently dining)</option>
                  <option value="Reserved">Reserved (Booked)</option>
                  <option value="Maintenance">Maintenance (Out of service)</option>
                </select>
              </div> */}

              {editingTable && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1 text-gray-500">
                  <p>
                    <span className="font-semibold text-gray-700">Table ID:</span>{" "}
                    #{editingTable.id}
                  </p>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-[#1f3228] hover:bg-[#162420] text-[#d4a843] shadow-md transition disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingTable ? "Save Changes" : "Create Table"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mergeTablesOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close merge tables dialog"
            disabled={mergingTables}
            onClick={() => {
              setMergeTablesOpen(false);
              setMergeConfirmationOpen(false);
            }}
            className="absolute inset-0 h-full w-full cursor-default"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="merge-tables-heading"
            className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-700">Table management</p>
                <h2 id="merge-tables-heading" className="mt-1 text-xl font-extrabold text-slate-900">
                  {mergeConfirmationOpen ? "Confirm table merge" : "Merge occupied tables"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {mergeConfirmationOpen
                    ? "Orders and charges will be moved to the primary table."
                    : "Choose the primary table first, then choose one or more occupied tables to merge."}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close merge tables dialog"
                disabled={mergingTables}
                onClick={() => {
                  setMergeTablesOpen(false);
                  setMergeConfirmationOpen(false);
                }}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {mergeConfirmationOpen ? (
              <div className="space-y-4 overflow-y-auto p-5 sm:p-6">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Primary Table</p>
                  <p className="mt-1 text-lg font-extrabold text-slate-900">
                    Table {baseTables.find((table) => String(table.table_id) === mergePrimaryTableId)?.table_number || "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-orange-800">Merge Table{mergeSecondaryTableIds.length === 1 ? "" : "s"}</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {mergeSecondaryTableIds.map((id) => {
                      const table = baseTables.find((entry) => String(entry.table_id) === id);
                      return table ? `Table ${table.table_number}` : null;
                    }).filter(Boolean).join(", ")}
                  </p>
                </div>
                <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                  Total Selected Tables: {mergeSecondaryTableIds.length + 1}
                </p>
                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={mergingTables}
                    onClick={() => setMergeConfirmationOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={mergingTables || !mergePrimaryTableId || !mergeSecondaryTableIds.length}
                    onClick={confirmTableMerge}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {mergingTables && <Loader2 className="h-4 w-4 animate-spin" />}
                    {mergingTables ? "Merging…" : "Confirm Merge"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-y-auto p-5 sm:p-6">
                  {loadingMergeTables ? (
                    <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Refreshing assigned tables and bills…
                    </div>
                  ) : tableLoadError ? (
                    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                      {tableLoadError}
                    </div>
                  ) : (
                    <div className="grid max-h-[55vh] gap-3 overflow-y-auto sm:grid-cols-2">
                      {baseTables.map((table) => {
                        const tableId = String(table.table_id || "");
                        const status = getDisplayStatus(table) || "Available";
                        const activeBill = getTableActiveBill(table);
                        const canMerge = status === "Occupied" && Boolean(activeBill);
                        const isPrimary = tableId === mergePrimaryTableId;
                        const isSecondary = mergeSecondaryTableIds.includes(tableId);
                        return (
                          <article
                            key={tableId || table.id}
                            className={`rounded-xl border p-4 transition ${
                              isPrimary ? "border-emerald-300 bg-emerald-50/50" :
                                isSecondary ? "border-orange-300 bg-orange-50/50" :
                                  "border-slate-200 bg-white"
                            } ${canMerge ? "hover:border-slate-300" : "opacity-60"}`}
                          >
                            <button
                              type="button"
                              disabled={!canMerge || loadingMergeTables}
                              onClick={() => toggleMergeTable(table)}
                              className="flex w-full items-center gap-3 text-left disabled:cursor-not-allowed"
                            >
                              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                                status === "Occupied" ? "bg-orange-100 text-orange-700" :
                                  status === "Reserved" ? "bg-blue-100 text-blue-700" :
                                    "bg-emerald-100 text-emerald-800"
                              }`}>
                                <Table2 className="h-5 w-5" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <strong className="block truncate text-sm text-slate-900">Table {table.table_number}</strong>
                                <span className="mt-1 block text-xs text-slate-500">
                                  {table.no_of_seats ? `${table.no_of_seats} seats · ` : ""}{status}
                                  {activeBill ? ` · Bill #${activeBill.bill_number}` : ""}
                                </span>
                              </span>
                              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                                isPrimary ? "border-emerald-700 bg-emerald-700 text-white" :
                                  isSecondary ? "border-orange-600 bg-orange-600 text-white" :
                                    "border-slate-300 text-transparent"
                              }`}>
                                {(isPrimary || isSecondary) && <Check className="h-4 w-4" />}
                              </span>
                            </button>
                            {(isPrimary || isSecondary) && (
                              <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-2">
                                <span className={`text-xs font-bold ${isPrimary ? "text-emerald-800" : "text-orange-800"}`}>
                                  {isPrimary ? "Primary table" : "Merge table"}
                                </span>
                                {isSecondary && (
                                  <button
                                    type="button"
                                    onClick={() => makeMergeTablePrimary(tableId)}
                                    className="text-xs font-semibold text-slate-600 underline hover:text-slate-900"
                                  >
                                    Make primary
                                  </button>
                                )}
                              </div>
                            )}
                          </article>
                        );
                      })}
                      {!baseTables.length && (
                        <div className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                          No assigned tables are available.
                        </div>
                      )}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-slate-500">
                    Only occupied tables with active bills can be merged. The first selection is primary; select any chosen table to remove it.
                  </p>
                </div>
                <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <span className="text-sm font-semibold text-slate-600">
                    Selected: {mergePrimaryTableId ? mergeSecondaryTableIds.length + 1 : 0}
                  </span>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={mergingTables}
                      onClick={() => setMergeTablesOpen(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={loadingMergeTables || !mergePrimaryTableId || !mergeSecondaryTableIds.length}
                      onClick={() => setMergeConfirmationOpen(true)}
                      className="rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Review Merge
                    </button>
                  </div>
                </footer>
              </>
            )}
          </section>
        </div>
      )}

      {/* Table Bill & Settlement Modal */}
      {viewingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative my-8">
            <button
              onClick={() => !settlingBill && setViewingBill(null)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Bill Header */}
            <div className="border-b border-gray-100 pb-4 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="p-2 rounded-xl bg-[#1f3228] text-[#d4a843]">
                  <UtensilsCrossed className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 font-serif">
                    Table Dining Bill
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    Bill #{viewingBill.bill_number}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-600">
                <div>
                  <span className="text-gray-400 block text-[10px]">
                    {Array.isArray(viewingBill.merged_table_numbers) && viewingBill.merged_table_numbers.length > 1 ? "Tables" : "Table"}
                  </span>
                  <strong className="text-gray-900 text-sm">
                    {Array.isArray(viewingBill.merged_table_numbers) && viewingBill.merged_table_numbers.length > 1
                      ? viewingBill.merged_table_numbers.map((number) => `Table ${number}`).join(" + ")
                      : `Table ${viewingBill.table_number}`}
                  </strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Server</span>
                  <strong className="text-gray-900">{viewingBill.server_name || "Assigned Server"}</strong>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Date & Time</span>
                  <span>{new Date(viewingBill.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Bill Status</span>
                  <span className={`inline-block px-2 py-0.5 rounded font-bold text-[11px] ${viewingBill.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {viewingBill.status === 'Paid' ? 'PAID' : 'ACTIVE / OPEN'}
                  </span>
                </div>
              </div>
            </div>

            {/* Consolidated bill items */}
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 mb-4 pr-1">
              {billItems.length > 0 ? (
                billItems.map((item) => {
                  const customizations = Object.entries(item.selected_customizations || {}).flatMap(([group, selection]) => {
                    const options = Array.isArray(selection) ? selection : [selection];
                    return options.filter(Boolean).map((option) => `${group === "__custom_request__" ? "Custom request" : group}: ${option}`);
                  });
                  const itemOptions = [
                    ...(Array.isArray(item.selected_addons) ? item.selected_addons : []),
                    ...customizations,
                  ];
                  return (
                    <div key={item.food_id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-800">{item.food_name}</span>
                        <span className="ml-2 text-gray-500">× {item.quantity}</span>
                        {itemOptions.length > 0 && (
                          <span className="mt-1 block break-words text-[10px] text-gray-500">{itemOptions.join(" · ")}</span>
                        )}
                        <span className="mt-1 block text-[10px] text-gray-400">₹{item.unit_price.toFixed(2)} each</span>
                      </div>
                      <span className="shrink-0 font-mono text-gray-700">₹{item.total_price.toFixed(2)}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-gray-400">No items on this bill yet.</div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="border-t border-gray-100 pt-3 space-y-1.5 text-xs text-gray-600 mb-4">
              <div className="flex justify-between">
                <span>Subtotal ({viewingBill.total_items_count} items):</span>
                <span className="font-mono">₹{viewingBill.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST ({Number(viewingBill.tax_rate || 5).toFixed(2)}%):</span>
                <span className="font-mono">₹{viewingBill.tax_amount.toFixed(2)}</span>
              </div>
              {viewingBill.status !== 'Paid' && (
                <div className="flex justify-between items-center py-1">
                  <span>Discount (₹):</span>
                  <input
                    type="number"
                    min="0"
                    max={viewingBill.subtotal}
                    value={settleDiscount}
                    onChange={(e) => setSettleDiscount(e.target.value)}
                    className="w-20 px-2 py-1 text-right text-xs border border-gray-200 rounded-lg outline-none focus:border-[#FF5A00]"
                  />
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-800">
                  ₹{Math.max(0, viewingBill.subtotal + viewingBill.tax_amount - (Number(settleDiscount) || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment & Actions */}
            {viewingBill.status !== 'Paid' ? (
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Payment Method:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Cash", "UPI", "Card"].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer ${
                          paymentMethod === method
                            ? "bg-[#FF5A00] text-white border-[#FF5A00] shadow-sm"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Receipt
                  </button>
                  <button
                    type="button"
                    disabled={settlingBill}
                    onClick={handleSettleBill}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#FF5A00] hover:bg-[#E94B00] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition cursor-pointer disabled:opacity-50"
                  >
                    {settlingBill ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Settle & Free Table ✓
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-semibold">
                ✓ Bill Settled & Paid via {viewingBill.payment_method || "Cash"}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
