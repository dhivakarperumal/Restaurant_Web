import { useEffect, useMemo, useState } from "react";
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
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    badge: "bg-amber-500",
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

export default function ServerTables() {
  const { userProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminTablesPage = location.pathname.startsWith("/admin/tables");
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [viewMode, setViewMode] = useState(isAdminTablesPage ? "table" : "grid");
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [activeBills, setActiveBills] = useState([]);
  const [viewingBill, setViewingBill] = useState(null);
  const [loadingBillDetails, setLoadingBillDetails] = useState(false);
  const [settlingBill, setSettlingBill] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [settleDiscount, setSettleDiscount] = useState(0);
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
      const key = String(item.food_id || item.food_name);
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
  });

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

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await api.get("/server-tables");
      if (res.data?.success) {
        setTables(res.data.tables || []);
      }
      fetchKitchenOrders();
      fetchActiveBills();
    } catch (error) {
      console.error("Error loading server tables:", error);
      toast.error(error.response?.data?.message || "Failed to load server tables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    fetchKitchenOrders();
    fetchActiveBills();
    const interval = window.setInterval(() => {
      fetchKitchenOrders();
      fetchActiveBills();
    }, 10000);
    return () => window.clearInterval(interval);
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      table_number: "",
      no_of_seats: "",
      status: "Available",
    });
    setEditingTable(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (table) => {
    setFormData({
      table_number: table.table_number || "",
      no_of_seats: table.no_of_seats || "",
      status: table.status || "Available",
    });
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
      if (editingTable) {
        const idToUpdate = editingTable.table_id || editingTable.id;
        const res = await api.put(`/server-tables/${idToUpdate}`, {
          table_number: tableNumber,
          no_of_seats: seats,
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

  const handleSettleBill = async () => {
    if (!viewingBill) return;
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
      setSettlingBill(false);
    }
  };

  const currentServerEmployeeId = userProfile?.employee_id || userProfile?.employeeId;
  const currentUserId = userProfile?.user_id || userProfile?.id || userProfile?.uuid;
  const currentUserName = userProfile?.name || userProfile?.displayName || userProfile?.full_name || userProfile?.username;

  const selectTableForOrder = (table) => {
    if (String(table.status || "").trim().toLowerCase() !== "occupied") {
      toast.error("Mark the table as Occupied before starting an order.");
      return;
    }
    navigate("/server/foods", {
      state: {
        selectedTable: {
          id: table.id ?? null,
          table_id: table.table_id || null,
          table_number: table.table_number,
          no_of_seats: table.no_of_seats,
        },
      },
    });
  };

  const isCurrentServerTable = (table) => {
    if (!table.assigned_server_id) return false;
    const assignedId = String(table.assigned_server_id).trim().toLowerCase();
    if (currentServerEmployeeId && assignedId === String(currentServerEmployeeId).trim().toLowerCase()) return true;
    if (currentUserId && assignedId === String(currentUserId).trim().toLowerCase()) return true;
    if (userProfile?.id && assignedId === String(userProfile.id).trim().toLowerCase()) return true;
    if (userProfile?.uuid && assignedId === String(userProfile.uuid).trim().toLowerCase()) return true;
    if (currentUserName && table.assigned_server_name && String(table.assigned_server_name).trim().toLowerCase() === String(currentUserName).trim().toLowerCase()) return true;
    if (userProfile?.email && table.assigned_server_email && String(table.assigned_server_email).trim().toLowerCase() === String(userProfile.email).trim().toLowerCase()) return true;
    return false;
  };

  // Base tables: on /server/tables, only consider tables assigned to this server
  const baseTables = useMemo(() => {
    if (isAdminTablesPage) return tables;
    return tables.filter(isCurrentServerTable);
  }, [tables, isAdminTablesPage, userProfile]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return baseTables.filter((table) => {
      const matchesSearch =
        !searchQuery ||
        String(table.table_number || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        String(table.table_id || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        String(table.assigned_server_name || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        String(table.created_by || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        String(table.status || "").toLowerCase() === statusFilter.toLowerCase();

      const userEmpId = userProfile?.employee_id || userProfile?.employeeId;
      const matchesAssignment =
        !isAdminTablesPage ||
        assignmentFilter === "all" ||
        (assignmentFilter === "assigned" && Boolean(table.assigned_server_id)) ||
        (assignmentFilter === "unassigned" && !table.assigned_server_id) ||
        (assignmentFilter === "my-tables" && table.assigned_server_id === userEmpId);

      return matchesSearch && matchesStatus && matchesAssignment;
    });
  }, [baseTables, searchQuery, statusFilter, assignmentFilter, isAdminTablesPage, userProfile]);

  // Statistics
  const stats = useMemo(() => {
    const total = baseTables.length;
    const available = baseTables.filter((t) => t.status === "Available").length;
    const occupied = baseTables.filter((t) => t.status === "Occupied").length;
    const reserved = baseTables.filter((t) => t.status === "Reserved").length;
    const assigned = baseTables.filter((t) => Boolean(t.assigned_server_id)).length;
    const unassigned = baseTables.length - assigned;
    const totalSeats = baseTables.reduce((sum, t) => sum + Number(t.no_of_seats || 0), 0);
    return { total, available, occupied, reserved, assigned, unassigned, totalSeats };
  }, [baseTables]);

  return (
    <div className={isAdminTablesPage ? "min-h-screen bg-[#f2f3f0] p-4 md:p-6" : "space-y-6"}>
      <div className={isAdminTablesPage ? "mx-auto max-w-[1500px] space-y-6" : "space-y-6"}>
      {/* Top Banner / Header */}
      <div className={isAdminTablesPage ? "mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between" : "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"}>
        <div>
          <div className="flex items-center gap-2">
            {!isAdminTablesPage && <div className="p-2 rounded-xl bg-[#1f3228] text-[#d4a843]">
              <UtensilsCrossed className="w-5 h-5" />
            </div>}
            <div>
              <h1 className={isAdminTablesPage ? "text-[2.1rem] font-bold tracking-[-0.05em] text-[#1f1d1b]" : "text-xl sm:text-2xl font-bold text-gray-900 font-serif"}>
                {isAdminTablesPage ? "Tables" : "My Assigned Tables"}
              </h1>
              <p className={isAdminTablesPage ? "mt-2 text-[13px] text-[#646464]" : "text-xs sm:text-sm text-gray-500"}>
                {isAdminTablesPage ? (
                  <>Dashboard <span className="mx-2 text-[#9a9a9a]">&gt;</span> <span className="font-medium text-[#2a2a2a]">Tables</span></>
                ) : (
                  "Dining tables assigned to your station. View real-time seating and update dining status."
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchTables}
            title="Refresh tables"
            className={isAdminTablesPage ? "flex h-[46px] w-[46px] cursor-pointer items-center justify-center rounded-xl border border-[#dfe2e5] bg-white text-gray-600 transition hover:bg-[#faf9f8]" : "p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition cursor-pointer"}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {isAdminTablesPage && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-[15px] font-semibold text-white shadow-[0_6px_14px_rgba(26,60,54,0.18)] transition hover:bg-[#214a42]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Table</span>
            </button>
          )}
        </div>
      </div>

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

      {/* Stats Cards */}
      <div className={isAdminTablesPage ? "mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" : "grid grid-cols-2 lg:grid-cols-4 gap-4"}>
        {[
          {
            title: isAdminTablesPage ? "Total Tables" : "My Assigned Tables",
            value: stats.total,
            icon: Layers,
            iconBg: "bg-[#22c55e]",
            waveColor: "#22c55e",
            description: isAdminTablesPage ? "Dining tables" : "Assigned to your station",
          },
          {
            title: "Available",
            value: stats.available,
            icon: CheckCircle2,
            iconBg: "bg-[#f59e0b]",
            waveColor: "#f59e0b",
            description: "Ready for guests",
          },
          {
            title: "Occupied",
            value: stats.occupied,
            icon: Clock,
            iconBg: "bg-[#06b6d4]",
            waveColor: "#06b6d4",
            description: "Currently in use",
          },
          {
            title: "Total Seats",
            value: stats.totalSeats,
            icon: Armchair,
            iconBg: "bg-[#a855f7]",
            waveColor: "#a855f7",
            description: "Dining capacity",
          },
        ].map(({ title, value, icon: Icon, iconBg, waveColor, description }) => (
          <div key={title} className={isAdminTablesPage ? "relative flex h-full min-h-[170px] flex-col overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm" : "bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4"}>
            {isAdminTablesPage ? (
              <div className="flex flex-1 items-start gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${iconBg} text-white`}>
                  <Icon className="h-7 w-7" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-600">{title}</p>
                  <h3 className="mb-3 text-2xl font-bold text-gray-900">{value}</h3>
                  <p className="text-[10px] text-gray-400">{description}</p>
                </div>
              </div>
            ) : (
              <>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg} text-white`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">{title}</p>
                  <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                </div>
              </>
            )}
            {isAdminTablesPage && (
              <div className="pointer-events-none absolute bottom-0 left-0 h-8 w-full overflow-hidden">
                <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="h-full w-full opacity-40" style={{ color: waveColor }} fill="currentColor">
                  <path d="M0,10 C30,25 70,0 100,10 L100,20 L0,20 Z" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className={isAdminTablesPage ? "flex flex-col gap-3 rounded-[18px] border border-[#e7e0d8] bg-white p-4 shadow-[0_1px_0_rgba(16,24,40,0.02)] sm:flex-row sm:items-center sm:justify-between" : "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm"}>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={isAdminTablesPage ? "Search by table number or server..." : "Search by table number..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={isAdminTablesPage ? "h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-10 pr-3 text-[14px] text-[#2d2d2d] outline-none placeholder:text-[#8a8a8a] focus:border-[#d2bc8a]" : "w-full pl-9 pr-4 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:border-[#d4a843] focus:bg-white transition"}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter tabs */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={isAdminTablesPage ? "h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]" : "px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 outline-none focus:border-[#d4a843]"}
          >
            <option value="all">All Statuses ({baseTables.length})</option>
            <option value="Available">Available ({stats.available})</option>
            <option value="Occupied">Occupied ({stats.occupied})</option>
            <option value="Reserved">Reserved ({stats.reserved})</option>
            <option value="Maintenance">Maintenance</option>
          </select>

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

          {/* View mode toggle */}
          <div className={isAdminTablesPage ? "flex h-[46px] items-center overflow-hidden rounded-xl border border-[#dfe2e5] bg-[#faf9f8]" : "flex items-center rounded-lg border border-gray-200 p-0.5 bg-gray-50"}>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={isAdminTablesPage
                ? `flex h-[46px] w-[46px] cursor-pointer items-center justify-center transition ${viewMode === "grid" ? "bg-[#1a3c36] text-white" : "text-[#4d4d4d] hover:bg-white"}`
                : `cursor-pointer rounded-md p-1.5 text-xs transition ${viewMode === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              aria-label="Card view"
              aria-pressed={viewMode === "grid"}
              title="Card view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={isAdminTablesPage
                ? `flex h-[46px] w-[46px] cursor-pointer items-center justify-center border-l border-[#dfe2e5] transition ${viewMode === "table" ? "bg-[#1a3c36] text-white" : "text-[#4d4d4d] hover:bg-white"}`
                : `cursor-pointer rounded-md p-1.5 text-xs transition ${viewMode === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
              aria-label="Table view"
              aria-pressed={viewMode === "table"}
              title="Table view"
            >
              <Table2 className="w-4 h-4" />
            </button>
          </div>
        </div>
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
                : (searchQuery || statusFilter !== "all"
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
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${isAdminTablesPage ? "rounded-[18px]" : ""}`}>
          {filteredTables.map((table) => {
            const config = statusConfig[table.status] || statusConfig.Available;
            const activeOrder = getTableActiveOrder(table);
            const activeBill = getTableActiveBill(table);
            const isReady = activeOrder?.status === "Ready to Serve";
            const canOrder = String(table.status || "").trim().toLowerCase() === "occupied";
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
                      <div className="w-10 h-10 rounded-xl bg-[#1f3228] text-[#d4a843] flex items-center justify-center font-bold text-base font-serif shadow-inner">
                        {table.table_number.length <= 4 ? table.table_number : "#"}
                      </div>
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
                      {table.status}
                    </span>
                  </div>

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
                          Assigned to You
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
                          className="mt-1 w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition cursor-pointer disabled:opacity-50"
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
                              ? "bg-[#1f3228] text-white shadow-sm"
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
                      {activeBill && (
                        <button
                          type="button"
                          onClick={() => handleOpenBillModal(table)}
                          className="inline-flex w-full cursor-pointer items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 transition hover:bg-emerald-100 shadow-sm"
                        >
                          <span className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-emerald-700" />
                            Bill #{activeBill.bill_number}
                          </span>
                          <span className="font-mono text-emerald-800 text-[11px]">
                            ₹{Number(activeBill.grand_total || 0).toFixed(0)} ({activeBill.total_items_count || "Items"}) · View & Settle
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!canOrder}
                        onClick={() => selectTableForOrder(table)}
                        title={canOrder ? "Select table and create an order" : "Mark the table as Occupied before ordering"}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a3c36] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#214a42] enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[#1a3c36]"
                      >
                        {activeBill ? "+ Add Round / Items" : "Select Table & Order"} <ArrowRight className="h-4 w-4" />
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
              <thead className={isAdminTablesPage ? "border-b border-[#e8e4df] bg-[#f0e6d2] text-left text-sm font-semibold text-[#3d3d3d]" : "bg-gray-50/75 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider font-semibold"}>
                <tr>
                  {isAdminTablesPage && <th className="py-3.5 px-4"># ID</th>}
                  <th className="py-3.5 px-4">Table Number</th>
                  <th className="py-3.5 px-4">Seats</th>
                  <th className="py-3.5 px-4">Status</th>
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
                {filteredTables.map((table) => {
                  const config = statusConfig[table.status] || statusConfig.Available;
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
                          <div className="w-8 h-8 rounded-lg bg-[#1f3228] text-[#d4a843] flex items-center justify-center font-bold text-xs font-serif">
                            {table.table_number.length <= 4 ? table.table_number : "#"}
                          </div>
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
                          {table.status}
                        </span>
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
                              Assigned to You
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
                                      className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
                                      ? "bg-[#1f3228] text-white shadow-sm"
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
                                const canOrder = String(table.status || "").trim().toLowerCase() === "occupied";
                                return (
                                  <>
                                    {activeBill && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenBillModal(table)}
                                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                                      >
                                        <FileText className="h-3.5 w-3.5" /> Bill #{activeBill.bill_number} (₹{Number(activeBill.grand_total || 0).toFixed(0)})
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      disabled={!canOrder}
                                      onClick={() => selectTableForOrder(table)}
                                      title={canOrder ? "Select table and create an order" : "Mark the table as Occupied before ordering"}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a3c36] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#214a42] enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[#1a3c36]"
                                    >
                                      {activeBill ? "+ Add Round" : "Select Table"} <ArrowRight className="h-3.5 w-3.5" />
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
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
                  <span className="text-gray-400 block text-[10px]">Table</span>
                  <strong className="text-gray-900 text-sm">Table {viewingBill.table_number}</strong>
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
                billItems.map((item) => (
                  <div key={item.food_id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-gray-800">{item.food_name}</span>
                      <span className="text-gray-500 ml-2">× {item.quantity}</span>
                    </div>
                    <span className="font-mono text-gray-700">₹{item.total_price.toFixed(2)}</span>
                  </div>
                ))
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
                <span>GST (5%):</span>
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
                    className="w-20 px-2 py-1 text-right text-xs border border-gray-200 rounded-lg outline-none focus:border-[#1a3c36]"
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
                            ? "bg-[#1a3c36] text-white border-[#1a3c36] shadow-sm"
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
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition cursor-pointer disabled:opacity-50"
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
