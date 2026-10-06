import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Armchair,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Eye,
  LayoutGrid,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import api, { BACKEND_BASE_URL } from "../api";
import AssignTableModal from "./AssignTableModal";
import EmployeeDocument from "./EmployeeDocument";

const ManageServers = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [servers, setServers] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Filters & display
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [selectedAssignment, setSelectedAssignment] = useState("All Assignments");
  const [sortBy, setSortBy] = useState("latest");
  const [viewMode, setViewMode] = useState("table");

  // Modals
  const [assignModalServer, setAssignModalServer] = useState(null);
  const [selectedServerDetails, setSelectedServerDetails] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const [togglingStatusId, setTogglingStatusId] = useState("");

  // Auto-open modal if navigated from Add Server
  useEffect(() => {
    if (location.state?.assignServer) {
      setAssignModalServer(location.state.assignServer);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [empRes, tableRes] = await Promise.all([
        api.get("/employees?type=Server"),
        api.get("/server-tables"),
      ]);

      const allEmps = empRes.data?.employees || [];
      // Filter servers in case backend returned all
      const serverList = allEmps.filter((e) => e.employee_type === "Server");
      setServers(serverList);

      if (tableRes.data?.success) {
        setTables(tableRes.data.tables || []);
      }
    } catch (err) {
      console.error("Failed to load servers/tables:", err);
      setError(err.response?.data?.message || "Failed to load servers data.");
    } finally {
      setLoading(false);
      setTablesLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Map tables by server employee_id and user_id
  const serverTablesMap = useMemo(() => {
    const map = {};
    tables.forEach((t) => {
      if (t.assigned_server_id) {
        if (!map[t.assigned_server_id]) {
          map[t.assigned_server_id] = [];
        }
        map[t.assigned_server_id].push(t);
      }
    });
    return map;
  }, [tables]);

  const getServerTables = (server) => {
    if (!server) return [];
    const fromEmpId = serverTablesMap[server.employee_id] || [];
    const fromUserId = server.user_id ? serverTablesMap[server.user_id] || [] : [];
    // merge unique tables
    const tableIds = new Set();
    const result = [];
    [...fromEmpId, ...fromUserId].forEach((t) => {
      const id = t.table_id || t.id;
      if (!tableIds.has(id)) {
        tableIds.add(id);
        result.push(t);
      }
    });
    return result;
  };

  const deleteServer = async (server) => {
    if (
      !window.confirm(
        `Are you sure you want to delete server "${server.full_name}" (${server.employee_id})? This will also unassign any dining tables.`
      )
    )
      return;

    setActionError("");
    setActionSuccess("");
    setDeletingId(server.employee_id);
    try {
      await api.delete(`/employees/${encodeURIComponent(server.employee_id)}`);
      setActionSuccess(`Server "${server.full_name}" deleted successfully.`);
      setServers((prev) => prev.filter((s) => s.employee_id !== server.employee_id));
      if (selectedServerDetails?.employee_id === server.employee_id) {
        setSelectedServerDetails(null);
      }
      // Reload tables to reflect unassignment
      const tableRes = await api.get("/server-tables");
      if (tableRes.data?.success) setTables(tableRes.data.tables || []);
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not delete server.");
    } finally {
      setDeletingId("");
    }
  };

  const toggleStatus = async (server) => {
    const newStatus = server.status === "Active" ? "Inactive" : "Active";
    setActionError("");
    setTogglingStatusId(server.employee_id);
    try {
      await api.patch(`/employees/${encodeURIComponent(server.employee_id)}/status`, {
        status: newStatus,
      });
      setServers((prev) =>
        prev.map((s) => (s.employee_id === server.employee_id ? { ...s, status: newStatus } : s))
      );
      if (selectedServerDetails?.employee_id === server.employee_id) {
        setSelectedServerDetails((prev) => ({ ...prev, status: newStatus }));
      }
      setActionSuccess(`Status for ${server.full_name} updated to ${newStatus}.`);
      setTimeout(() => setActionSuccess(""), 3500);
    } catch (err) {
      // Fallback: try PUT status or report error
      try {
        await api.put(`/employees/${encodeURIComponent(server.employee_id)}/status`, {
          status: newStatus,
        });
        setServers((prev) =>
          prev.map((s) => (s.employee_id === server.employee_id ? { ...s, status: newStatus } : s))
        );
        setActionSuccess(`Status updated to ${newStatus}.`);
      } catch (fallbackErr) {
        setActionError(err.response?.data?.message || "Failed to update status.");
      }
    } finally {
      setTogglingStatusId("");
    }
  };

  // Filtered & sorted servers
  const normalizedSearch = search.trim().toLowerCase();

  const visibleServers = useMemo(() => {
    return servers
      .filter((server) => {
        const serverTablesList = getServerTables(server);
        const tableNumbers = serverTablesList.map((t) => String(t.table_number || "")).join(" ");

        const matchesSearch = [
          server.id,
          server.full_name,
          server.employee_id,
          server.email,
          server.phone_number,
          tableNumbers,
        ].some((val) => String(val || "").toLowerCase().includes(normalizedSearch));

        const matchesStatus =
          selectedStatus === "All Status" || server.status === selectedStatus;

        const hasTables = serverTablesList.length > 0;
        const matchesAssignment =
          selectedAssignment === "All Assignments"
            ? true
            : selectedAssignment === "Assigned Tables"
            ? hasTables
            : !hasTables;

        return matchesSearch && matchesStatus && matchesAssignment;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return String(a.full_name || "").localeCompare(String(b.full_name || ""));
        }
        if (sortBy === "most-tables") {
          return getServerTables(b).length - getServerTables(a).length;
        }
        if (sortBy === "fewest-tables") {
          return getServerTables(a).length - getServerTables(b).length;
        }
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
  }, [servers, search, selectedStatus, selectedAssignment, sortBy, serverTablesMap]);

  // Statistics
  const activeCount = servers.filter((s) => s.status === "Active").length;
  const totalAssignedTablesCount = tables.filter((t) => Boolean(t.assigned_server_id)).length;
  const unassignedServersCount = servers.filter(
    (s) => getServerTables(s).length === 0
  ).length;

  const statCards = [
    { title: "Total Servers", value: servers.length, icon: UtensilsCrossed, bg: "bg-[#22c55e]", hint: "Registered waitstaff" },
    { title: "Active Servers", value: activeCount, icon: UserCheck, bg: "bg-[#3b82f6]", hint: "Currently on duty" },
    { title: "Tables Assigned", value: totalAssignedTablesCount, icon: Table2, bg: "bg-[#f59e0b]", hint: `Across ${tables.length} total tables` },
    { title: "Unassigned Servers", value: unassignedServersCount, icon: Armchair, bg: unassignedServersCount > 0 ? "bg-[#ef4444]" : "bg-[#8b5cf6]", hint: "Servers without tables" },
  ];

  return (
    <main className="min-h-screen bg-[#f2f3f0] p-4 md:p-6">
      <div className="mx-auto max-w-[1500px]">
        {/* Navigation Tabs Header */}
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[#e1ded8] pb-3 text-sm">
          <Link
            to="/admin/employees"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-[#68706a] hover:bg-[#e7e5e0] hover:text-[#1f2d24]"
          >
            <Users className="h-4 w-4" /> All Employees
          </Link>
          <div className="flex items-center gap-1.5 rounded-lg bg-[#1a3c36] px-3 py-1.5 font-semibold text-white shadow-sm">
            <UtensilsCrossed className="h-4 w-4 text-[#d4a843]" /> Manage Servers
            <span className="ml-1 rounded-full bg-[#d4a843] px-2 py-0.2 text-[11px] font-bold text-[#1a3c36]">
              {servers.length}
            </span>
          </div>
          <Link
            to="/admin/delivery-partners"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-[#68706a] hover:bg-[#e7e5e0] hover:text-[#1f2d24]"
          >
            Manage Delivery Partners
          </Link>
          <Link
            to="/admin/tables"
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-[#d5ded6] bg-white px-3 py-1.5 text-xs font-semibold text-[#1a3c36] shadow-sm hover:bg-[#fafafa]"
          >
            <Table2 className="h-3.5 w-3.5 text-[#d4a843]" /> Server Tables Floor
          </Link>
        </div>

        {/* Page Title & Add Server CTA */}
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[2.1rem] font-bold tracking-[-0.05em] text-[#1f1d1b]">
              Manage Servers
            </h1>
            <p className="mt-1 text-[13px] text-[#646464]">
              Dashboard <span className="mx-2 text-[#9a9a9a]">&gt;</span>
              Employees <span className="mx-2 text-[#9a9a9a]">&gt;</span>
              <span className="font-medium text-[#2a2a2a]">Manage Servers</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={loadData}
              title="Refresh servers data"
              className="flex h-[44px] w-[44px] items-center justify-center rounded-xl border border-[#dcd7d0] bg-white text-[#4d4d4d] shadow-sm transition hover:bg-[#f6f5f3]"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              to="/admin/employees/add/server"
              className="inline-flex h-[46px] items-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-[15px] font-semibold text-white shadow-[0_6px_14px_rgba(26,60,54,0.18)] transition hover:bg-[#214a42]"
            >
              <Plus className="h-4 w-4 text-[#d4a843]" /> Add Server
            </Link>
          </div>
        </div>

        {/* Action alerts */}
        {actionSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-[#166534]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#22c55e]" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#edc7c1] bg-[#fff4f1] px-4 py-3 text-sm text-[#a13e30]">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#ef4444]" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Stat Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map(({ title, value, icon: Icon, iconBg, description, waveColor }) => (
            <div
              key={title}
              className="relative flex h-full min-h-[160px] flex-col overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-1 items-start gap-4">
                <div
                  className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl ${iconBg} shadow-sm`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">{title}</p>
                  <h2 className="text-2xl font-bold text-gray-900">{value}</h2>
                  <p className="mt-1.5 text-[11px] text-gray-400">{description}</p>
                </div>
              </div>
              <div className="pointer-events-none absolute bottom-0 left-0 h-7 w-full overflow-hidden">
                <svg
                  viewBox="0 0 100 20"
                  preserveAspectRatio="none"
                  className="h-full w-full opacity-35"
                  style={{ color: waveColor }}
                  fill="currentColor"
                >
                  <path d="M0,10 C30,25 70,0 100,10 L100,20 L0,20 Z" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Content Section */}
        <section className="rounded-[18px] border border-[#e7e0d8] bg-white p-4 shadow-[0_1px_0_rgba(16,24,40,0.02)]">
          {/* Controls Bar */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <label className="relative w-full max-w-[340px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7a7a]" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by server name, ID, phone..."
                  className="h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-10 pr-3 text-[14px] text-[#2d2d2d] outline-none placeholder:text-[#8a8a8a] focus:border-[#d2bc8a]"
                />
              </label>

              <div className="flex w-full flex-wrap gap-3 lg:ml-auto lg:w-auto">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-[46px] min-w-36 rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]"
                >
                  <option value="All Status">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <select
                  value={selectedAssignment}
                  onChange={(e) => setSelectedAssignment(e.target.value)}
                  className="h-[46px] min-w-40 rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]"
                >
                  <option value="All Assignments">All Assignments</option>
                  <option value="Assigned Tables">Has Assigned Tables</option>
                  <option value="Unassigned">No Tables Assigned</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]"
              >
                <option value="latest">Sort: Latest</option>
                <option value="name">Name: A to Z</option>
                <option value="most-tables">Most Tables</option>
                <option value="fewest-tables">Fewest Tables</option>
              </select>

              <div className="flex h-[46px] items-center overflow-hidden rounded-xl border border-[#dfe2e5] bg-[#faf9f8]">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  aria-label="Table view"
                  className={`flex h-[46px] w-[46px] cursor-pointer items-center justify-center transition ${
                    viewMode === "table" ? "bg-[#1a3c36] text-white" : "text-[#4d4d4d] hover:bg-white"
                  }`}
                >
                  <Table2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  aria-label="Card view"
                  className={`flex h-[46px] w-[46px] cursor-pointer items-center justify-center border-l border-[#dfe2e5] transition ${
                    viewMode === "card" ? "bg-[#1a3c36] text-white" : "text-[#4d4d4d] hover:bg-white"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Table View */}
          {viewMode === "table" ? (
            <div className="overflow-hidden rounded-xl border border-[#e8e4df]">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-left">
                  <thead>
                    <tr className="bg-[#f0e6d2] text-sm font-semibold text-[#3d3d3d]">
                      <th className="px-4 py-4">ID</th>
                      <th className="px-4 py-4">Server</th>
                      <th className="px-4 py-4">Server ID</th>
                      <th className="px-4 py-4">Phone Number</th>
                      <th className="px-4 py-4">Assigned Tables</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-14 text-center text-sm text-[#777]">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-[#1a3c36]" />
                            <span>Loading servers...</span>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-sm text-[#a13e30]">
                          {error}
                        </td>
                      </tr>
                    ) : visibleServers.length > 0 ? (
                      visibleServers.map((server) => {
                        const assignedTables = getServerTables(server);
                        const isToggling = togglingStatusId === server.employee_id;

                        return (
                          <tr
                            key={server.employee_id}
                            className="border-t border-[#f0ebe6] align-middle text-sm text-[#4d4d4d] hover:bg-[#fafaf8]"
                          >
                            <td className="px-4 py-4 font-mono text-xs text-[#7a7a7a]">
                              {server.id ?? "—"}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef3ed] text-sm font-bold text-[#1a3c36] border border-[#d6e3d7]">
                                  {server.full_name?.charAt(0)?.toUpperCase() || "S"}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-[#1f1f1f]">{server.full_name}</div>
                                  <div className="truncate text-xs text-[#7a7a7a]">{server.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 font-mono text-xs font-semibold text-[#1a3c36]">
                              {server.employee_id}
                            </td>
                            <td className="px-4 py-4 text-[#333]">
                              {server.phone_number || "—"}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {assignedTables.length > 0 ? (
                                  <>
                                    {assignedTables.slice(0, 3).map((tbl) => (
                                      <span
                                        key={tbl.table_id || tbl.id}
                                        className="inline-flex items-center gap-1 rounded-md bg-[#edf5f0] border border-[#cbe4d3] px-2 py-0.5 text-xs font-bold text-[#23583a]"
                                      >
                                        <Armchair className="h-3 w-3 text-[#39855b]" />
                                        Table {tbl.table_number}
                                        <span className="text-[10px] text-[#69977b]">
                                          ({tbl.no_of_seats}s)
                                        </span>
                                      </span>
                                    ))}
                                    {assignedTables.length > 3 && (
                                      <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-600">
                                        +{assignedTables.length - 3} more
                                      </span>
                                    )}
                                    <span className="ml-1 inline-flex items-center rounded-full bg-[#1a3c36] px-2 py-0.5 text-[10px] font-bold text-[#d4a843]">
                                      {assignedTables.length} total
                                    </span>
                                  </>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 border border-gray-200 px-2 py-0.5 text-xs text-gray-500 italic">
                                    No tables assigned
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <button
                                type="button"
                                onClick={() => toggleStatus(server)}
                                disabled={isToggling}
                                title="Click to toggle status"
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                                  server.status === "Active"
                                    ? "bg-[#edf7f1] text-[#2d7b5a] hover:bg-[#e1f3e8]"
                                    : "bg-[#f1f2f0] text-[#727a73] hover:bg-[#e6e8e5]"
                                }`}
                              >
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    server.status === "Active" ? "bg-[#2d7b5a]" : "bg-[#929892]"
                                  }`}
                                />
                                {isToggling ? "Updating..." : server.status}
                              </button>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setAssignModalServer(server)}
                                  title="Assign / Reassign Dining Tables"
                                  className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#1a3c36] bg-[#1a3c36] px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#25524a]"
                                >
                                  <UtensilsCrossed className="h-3.5 w-3.5 text-[#d4a843]" />
                                  <span>Assign Tables</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setSelectedServerDetails(server)}
                                  title="View Server Details"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997] hover:text-[#1a1a1a]"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>

                                <Link
                                  to={`/admin/employees/${encodeURIComponent(server.employee_id)}/edit`}
                                  title="Edit Server"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997] hover:text-[#1a1a1a]"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => deleteServer(server)}
                                  disabled={deletingId === server.employee_id}
                                  title="Delete Server"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#f3d7d7] bg-[#fff8f8] text-[#d04d4d] transition hover:bg-[#fff0f0] disabled:opacity-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-5 py-16 text-center">
                          <div className="mb-3 flex justify-center text-[#8a8a8a]">
                            <UtensilsCrossed className="h-10 w-10 text-gray-400" />
                          </div>
                          <p className="text-base font-bold text-[#333]">
                            {normalizedSearch || selectedStatus !== "All Status" || selectedAssignment !== "All Assignments"
                              ? "No matching servers found"
                              : "No servers added yet"}
                          </p>
                          <p className="mx-auto mt-1 max-w-sm text-xs text-[#888]">
                            {normalizedSearch || selectedStatus !== "All Status" || selectedAssignment !== "All Assignments"
                              ? "Try adjusting your search keywords or filter options."
                              : "Register waitstaff to start assigning them dining tables."}
                          </p>
                          {!normalizedSearch &&
                            selectedStatus === "All Status" &&
                            selectedAssignment === "All Assignments" && (
                              <Link
                                to="/admin/employees/add/server"
                                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1a3c36] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#25524a]"
                              >
                                <Plus className="h-4 w-4 text-[#d4a843]" /> Add Your First Server
                              </Link>
                            )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Card View */
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {loading ? (
                <div className="col-span-full py-14 text-center text-sm text-[#777]">
                  Loading servers...
                </div>
              ) : visibleServers.length > 0 ? (
                visibleServers.map((server) => {
                  const assignedTables = getServerTables(server);
                  const isToggling = togglingStatusId === server.employee_id;

                  return (
                    <article
                      key={server.employee_id}
                      className="flex flex-col justify-between rounded-xl border border-[#e8e4df] bg-white p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef3ed] text-base font-bold text-[#1a3c36] border border-[#d6e3d7]">
                              {server.full_name?.charAt(0)?.toUpperCase() || "S"}
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate text-base font-bold text-[#1f1f1f]">
                                {server.full_name}
                              </h3>
                              <p className="truncate text-xs text-[#7a7a7a]">{server.email}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleStatus(server)}
                            disabled={isToggling}
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                              server.status === "Active"
                                ? "bg-[#edf7f1] text-[#2d7b5a]"
                                : "bg-[#f1f2f0] text-[#727a73]"
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                server.status === "Active" ? "bg-[#2d7b5a]" : "bg-[#929892]"
                              }`}
                            />
                            {server.status}
                          </button>
                        </div>

                        {/* Details Grid */}
                        <div className="my-4 space-y-2.5 border-y border-[#f0ebe6] py-3.5 text-sm">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#849087]">Server ID</span>
                            <span className="font-mono font-semibold text-[#1a3c36]">
                              {server.employee_id}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#849087]">Phone Number</span>
                            <span className="font-medium text-[#34443b]">
                              {server.phone_number || "—"}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1.5 pt-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#849087]">Assigned Tables</span>
                              <span className="font-bold text-[#1a3c36]">
                                {assignedTables.length} Tables
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {assignedTables.length > 0 ? (
                                assignedTables.map((tbl) => (
                                  <span
                                    key={tbl.table_id || tbl.id}
                                    className="inline-flex items-center gap-1 rounded-md bg-[#edf5f0] border border-[#cbe4d3] px-2 py-0.5 text-[11px] font-bold text-[#23583a]"
                                  >
                                    <Armchair className="h-3 w-3 text-[#39855b]" />
                                    Table {tbl.table_number} ({tbl.no_of_seats}s)
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-400 italic">
                                  No dining tables assigned yet.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setAssignModalServer(server)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#1a3c36] bg-[#1a3c36] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#25524a]"
                        >
                          <UtensilsCrossed className="h-3.5 w-3.5 text-[#d4a843]" />
                          <span>Assign Tables</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedServerDetails(server)}
                            title="View Server Details"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997]"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <Link
                            to={`/admin/employees/${encodeURIComponent(server.employee_id)}/edit`}
                            title="Edit Server"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => deleteServer(server)}
                            disabled={deletingId === server.employee_id}
                            title="Delete Server"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3d7d7] bg-[#fff8f8] text-[#d04d4d] transition hover:bg-[#fff0f0]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="col-span-full rounded-2xl border-2 border-dashed border-[#e6ddd1] bg-[#faf9f8] py-16 text-center">
                  <div className="mb-3 flex justify-center text-[#8a8a8a]">
                    <UtensilsCrossed className="h-10 w-10 text-gray-400" />
                  </div>
                  <p className="text-base font-bold text-[#333]">No matching servers found</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-[#888]">
                    Try changing your search terms or filters.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 border-t border-[#efebe7] pt-4 text-sm text-[#6a6a6a] flex flex-wrap items-center justify-between gap-2">
            <div>
              Showing {visibleServers.length} of {servers.length} servers
            </div>
            <div className="text-xs text-[#8a8a8a]">
              Tip: Click "Assign Tables" on any server to quickly allocate dining tables.
            </div>
          </div>
        </section>
      </div>

      {/* Assign Tables Modal */}
      <AssignTableModal
        isOpen={Boolean(assignModalServer)}
        onClose={() => setAssignModalServer(null)}
        server={assignModalServer}
        onSuccess={() => {
          loadData();
          setAssignModalServer(null);
          setActionSuccess("Dining table assignments updated successfully.");
          setTimeout(() => setActionSuccess(""), 3500);
        }}
      />

      {/* Server Details Modal */}
      {selectedServerDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedServerDetails(null);
          }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-start justify-between border-b border-[#edf0ec] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a3c36] text-xl font-bold text-[#d4a843] shadow-md">
                  {selectedServerDetails.full_name?.charAt(0)?.toUpperCase() || "S"}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 font-serif">
                    {selectedServerDetails.full_name}
                  </h2>
                  <p className="text-xs font-mono text-[#1a3c36] font-semibold">
                    {selectedServerDetails.employee_id} • Server
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedServerDetails(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-5 text-sm">
              {/* Status and Action banner */}
              <div className="flex items-center justify-between rounded-xl bg-[#f5f8f5] p-3.5 border border-[#dce8dd]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600">Current Status:</span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      selectedServerDetails.status === "Active"
                        ? "bg-[#edf7f1] text-[#2d7b5a]"
                        : "bg-[#f1f2f0] text-[#727a73]"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        selectedServerDetails.status === "Active" ? "bg-[#2d7b5a]" : "bg-[#929892]"
                      }`}
                    />
                    {selectedServerDetails.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const server = selectedServerDetails;
                    setSelectedServerDetails(null);
                    setAssignModalServer(server);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a3c36] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#25524a]"
                >
                  <UtensilsCrossed className="h-3.5 w-3.5 text-[#d4a843]" />
                  <span>Assign Tables</span>
                </button>
              </div>

              {/* Assigned Tables Detailed List */}
              <div className="rounded-xl border border-gray-200 p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Table2 className="h-4 w-4 text-[#1a3c36]" />
                    <h3 className="font-bold text-gray-800 text-sm">Assigned Dining Tables</h3>
                  </div>
                  <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-xs font-bold">
                    {getServerTables(selectedServerDetails).length} Assigned
                  </span>
                </div>

                {getServerTables(selectedServerDetails).length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {getServerTables(selectedServerDetails).map((tbl) => (
                      <div
                        key={tbl.table_id || tbl.id}
                        className="rounded-lg border border-[#cbe4d3] bg-[#f2f8f4] p-3 text-center"
                      >
                        <p className="text-xs font-bold text-[#1a3c36]">Table {tbl.table_number}</p>
                        <p className="mt-1 text-[11px] text-gray-600">
                          {tbl.no_of_seats} Seats • {tbl.status || "Available"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic py-2">
                    This server currently has no dining tables assigned.
                  </p>
                )}
              </div>

              {/* Contact & Personal details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                  <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider text-[#849087]">
                    Contact Information
                  </h3>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{selectedServerDetails.phone_number || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{selectedServerDetails.email || "—"}</span>
                  </div>
                  {selectedServerDetails.gender && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <UserRound className="h-4 w-4 text-gray-400" />
                      <span>{selectedServerDetails.gender}</span>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                  <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider text-[#849087]">
                    Address Details
                  </h3>
                  <div className="flex items-start gap-2 text-gray-700 text-xs">
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p>{selectedServerDetails.address || "—"}</p>
                      <p className="text-gray-500">
                        {[
                          selectedServerDetails.area_locality,
                          selectedServerDetails.city,
                          selectedServerDetails.state,
                          selectedServerDetails.pincode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bank & Salary details if available */}
              {(selectedServerDetails.bank_name || selectedServerDetails.basic_salary) && (
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider text-[#849087] mb-2 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Payroll & Bank Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {selectedServerDetails.basic_salary && (
                      <div>
                        <span className="text-gray-500">Basic Salary:</span>{" "}
                        <span className="font-semibold text-gray-800">
                          ₹{Number(selectedServerDetails.basic_salary).toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                    {selectedServerDetails.bank_name && (
                      <div>
                        <span className="text-gray-500">Bank Name:</span>{" "}
                        <span className="font-semibold text-gray-800">
                          {selectedServerDetails.bank_name}
                        </span>
                      </div>
                    )}
                    {selectedServerDetails.account_number && (
                      <div>
                        <span className="text-gray-500">Account No:</span>{" "}
                        <span className="font-mono font-semibold text-gray-800">
                          {selectedServerDetails.account_number}
                        </span>
                      </div>
                    )}
                    {selectedServerDetails.ifsc_code && (
                      <div>
                        <span className="text-gray-500">IFSC:</span>{" "}
                        <span className="font-mono font-semibold text-gray-800">
                          {selectedServerDetails.ifsc_code}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2.5 border-t border-gray-100 pt-4">
              <Link
                to={`/admin/employees/${encodeURIComponent(selectedServerDetails.employee_id)}/edit`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="h-3.5 w-3.5" /> Full Edit
              </Link>
              <button
                type="button"
                onClick={() => setSelectedServerDetails(null)}
                className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ManageServers;
