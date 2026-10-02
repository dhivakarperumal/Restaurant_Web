import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Armchair,
  CheckCircle2,
  Clock,
  Edit2,
  Layers,
  LayoutGrid,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Trash2,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";
import { useAuth } from "../PrivateRouter/AuthContext";

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
  const isAdminTablesPage = location.pathname.startsWith("/admin/tables");
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [viewMode, setViewMode] = useState(isAdminTablesPage ? "table" : "grid");

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

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await api.get("/server-tables");
      if (res.data?.success) {
        setTables(res.data.tables || []);
      }
    } catch (error) {
      console.error("Error loading server tables:", error);
      toast.error(error.response?.data?.message || "Failed to load server tables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
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

  const currentServerEmployeeId = userProfile?.employee_id || userProfile?.employeeId;
  const currentUserId = userProfile?.user_id || userProfile?.id || userProfile?.uuid;
  const currentUserName = userProfile?.name || userProfile?.displayName || userProfile?.full_name || userProfile?.username;

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
            return (
              <div
                key={table.table_id || table.id}
                className={isAdminTablesPage ? "relative flex flex-col justify-between rounded-xl border border-[#e7e0d8] bg-white p-5 shadow-sm transition hover:shadow-md" : "bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between relative group"}
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
                      <th className="py-3.5 px-4 text-right">Quick Status Update</th>
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
              <div>
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
              </div>

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
      </div>
    </div>
  );
}
