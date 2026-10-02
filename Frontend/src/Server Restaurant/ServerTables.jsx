import { useEffect, useMemo, useState } from "react";
import {
  Armchair,
  CheckCircle2,
  Clock,
  Copy,
  Edit2,
  Hash,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";

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
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

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

  const copyToClipboard = (text, label = "Table ID") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const matchesSearch =
        !searchQuery ||
        String(table.table_number || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        String(table.table_id || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        String(table.created_by || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        String(table.status || "").toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [tables, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = tables.length;
    const available = tables.filter((t) => t.status === "Available").length;
    const occupied = tables.filter((t) => t.status === "Occupied").length;
    const reserved = tables.filter((t) => t.status === "Reserved").length;
    const totalSeats = tables.reduce((sum, t) => sum + Number(t.no_of_seats || 0), 0);
    return { total, available, occupied, reserved, totalSeats };
  }, [tables]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#1f3228] text-[#d4a843]">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-serif">
                Server Tables
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Manage restaurant dining tables, seating capacity, and real-time status.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchTables}
            title="Refresh tables"
            className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1f3228] hover:bg-[#162420] text-[#d4a843] font-semibold text-sm shadow-md transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-[#d4a843]" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Tables</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.total}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Available</p>
            <h3 className="text-2xl font-bold text-green-700">{stats.available}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Occupied</p>
            <h3 className="text-2xl font-bold text-amber-700">{stats.occupied}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Armchair className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Seats</p>
            <h3 className="text-2xl font-bold text-blue-700">{stats.totalSeats}</h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by table number, UUID, or creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:border-[#d4a843] focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter tabs */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 outline-none focus:border-[#d4a843]"
          >
            <option value="all">All Statuses ({tables.length})</option>
            <option value="Available">Available ({stats.available})</option>
            <option value="Occupied">Occupied ({stats.occupied})</option>
            <option value="Reserved">Reserved ({stats.reserved})</option>
            <option value="Maintenance">Maintenance</option>
          </select>

          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 p-0.5 bg-gray-50">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md text-xs transition ${
                viewMode === "grid"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md text-xs transition ${
                viewMode === "table"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Grid or List */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-100 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#d4a843]" />
          <p className="text-sm text-gray-500 font-medium">Loading server tables...</p>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#1f3228]/10 text-[#1f3228] flex items-center justify-center mx-auto">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">No tables found</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">
              {searchQuery || statusFilter !== "all"
                ? "No server tables match your filter criteria. Try clearing search."
                : "No server tables have been added yet. Click 'Add Table' to create your first dining table."}
            </p>
          </div>
          {!searchQuery && statusFilter === "all" && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#1f3228] text-[#d4a843] rounded-xl text-sm font-semibold shadow hover:bg-[#162420] transition"
            >
              <Plus className="w-4 h-4" />
              Add First Table
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            const config = statusConfig[table.status] || statusConfig.Available;
            return (
              <div
                key={table.table_id || table.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between relative group"
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
                        <span className="text-[11px] text-gray-400 font-mono">
                          ID: #{table.id}
                        </span>
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

                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span className="flex items-center gap-1.5 text-gray-500 font-medium">
                        <Hash className="w-3.5 h-3.5 text-gray-400" />
                        UUID:
                      </span>
                      <button
                        onClick={() => copyToClipboard(table.table_id, "UUID")}
                        title="Click to copy full UUID"
                        className="font-mono text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                      >
                        {String(table.table_id || "").slice(0, 8)}...
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>

                    {table.created_by && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Created by:</span>
                        <span className="font-medium text-gray-700 truncate max-w-[130px]">
                          {table.created_by}
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
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                            table.status === st
                              ? "bg-[#1f3228] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {st[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleOpenEditModal(table)}
                      className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition"
                      title="Edit Table"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(table)}
                      className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition"
                      title="Delete Table"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/75 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4"># ID</th>
                  <th className="py-3.5 px-4">Table Number</th>
                  <th className="py-3.5 px-4">Seats</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">UUID (table_id)</th>
                  <th className="py-3.5 px-4">Created By</th>
                  <th className="py-3.5 px-4">Created At</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
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
                      <td className="py-3 px-4 font-mono font-bold text-xs text-gray-700">
                        #{table.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        {table.table_number}
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
                      <td className="py-3 px-4">
                        <button
                          onClick={() => copyToClipboard(table.table_id, "UUID")}
                          className="font-mono text-xs text-blue-600 hover:underline flex items-center gap-1"
                          title="Click to copy full UUID"
                        >
                          {String(table.table_id || "").slice(0, 12)}...
                          <Copy className="w-3 h-3" />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">
                        {table.created_by || "—"}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {table.created_at
                          ? new Date(table.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(table)}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition"
                            title="Edit Table"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(table)}
                            className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
                            title="Delete Table"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Table Modal */}
      {isAddModalOpen && (
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
                    <span className="font-semibold text-gray-700">Normal ID:</span>{" "}
                    #{editingTable.id}
                  </p>
                  <p className="truncate">
                    <span className="font-semibold text-gray-700">UUID (table_id):</span>{" "}
                    {editingTable.table_id}
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
  );
}
