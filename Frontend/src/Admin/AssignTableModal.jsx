import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Armchair,
  Check,
  CheckCircle2,
  Info,
  Layers,
  Loader2,
  Lock,
  Search,
  Table2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";

export default function AssignTableModal({ isOpen, onClose, server, onSuccess }) {
  const [tables, setTables] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [seatFilter, setSeatFilter] = useState("all");

  // Load all tables when modal opens
  useEffect(() => {
    if (!isOpen || !server?.employee_id) return;

    let isMounted = true;
    setLoading(true);

    api
      .get("/server-tables")
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.success) {
          const allTables = res.data.tables || [];
          setTables(allTables);

          // Find tables already assigned to this server
          const currentAssigned = allTables
            .filter((t) => t.assigned_server_id === server.employee_id)
            .map((t) => t.table_id || t.id);
          setSelectedIds(currentAssigned);
        }
      })
      .catch((err) => {
        console.error("Failed to load tables:", err);
        toast.error("Failed to load tables for assignment");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, server?.employee_id]);

  // Capacity calculation based on selected tables
  const capacity = useMemo(() => {
    const selectedTables = tables.filter((t) =>
      selectedIds.includes(t.table_id || t.id)
    );
    let count2Seats = 0;
    let count4Seats = 0;
    let countLargeSeats = 0;
    let pointsUsed = 0;

    for (const t of selectedTables) {
      const seats = Number(t.no_of_seats || 0);
      if (seats <= 2) {
        count2Seats += 1;
        pointsUsed += 2;
      } else if (seats <= 4) {
        count4Seats += 1;
        pointsUsed += 3;
      } else {
        countLargeSeats += 1;
        pointsUsed += 6;
      }
    }

    return {
      selectedTables,
      count2Seats,
      count4Seats,
      countLargeSeats,
      pointsUsed,
      maxPoints: 6,
      hasLarge: countLargeSeats > 0,
      isAtCapacity: pointsUsed >= 6 || (countLargeSeats > 0 && selectedTables.length >= 1),
    };
  }, [tables, selectedIds]);

  // Check if a table can be toggled
  const getTableSelectability = (table) => {
    const tableId = table.table_id || table.id;
    const isSelected = selectedIds.includes(tableId);

    // If already selected, user can always deselect it
    if (isSelected) {
      return { allowed: true, isSelected: true };
    }

    // Exclusivity rule: if assigned to another server, cannot be selected
    if (table.assigned_server_id && table.assigned_server_id !== server?.employee_id) {
      return {
        allowed: false,
        isSelected: false,
        isOtherServer: true,
        reason: `Assigned to ${table.assigned_server_name || "another server"}`,
      };
    }

    const seats = Number(table.no_of_seats || 0);

    // If large table is already selected, no more tables allowed
    if (capacity.hasLarge) {
      return {
        allowed: false,
        isSelected: false,
        isCapacityBreached: true,
        reason: "Max 1 table allowed when 6 or 8 seats are assigned",
      };
    }

    // If candidate table is large (6 or 8 seats): only allowed if no tables are selected
    if (seats >= 5) {
      if (selectedIds.length > 0) {
        return {
          allowed: false,
          isSelected: false,
          isCapacityBreached: true,
          reason: "6/8 seat tables can only be assigned alone (1 table only)",
        };
      }
      return { allowed: true, isSelected: false };
    }

    // Candidate is 4-seat table
    if (seats >= 3 && seats <= 4) {
      if (capacity.count4Seats >= 2) {
        return {
          allowed: false,
          isSelected: false,
          isCapacityBreached: true,
          reason: "Max 2 tables of 4 seats allowed",
        };
      }
      if (capacity.pointsUsed + 3 > 6) {
        return {
          allowed: false,
          isSelected: false,
          isCapacityBreached: true,
          reason: "Would exceed server capacity limit (6 points)",
        };
      }
      return { allowed: true, isSelected: false };
    }

    // Candidate is 2-seat table
    if (seats <= 2) {
      if (capacity.count2Seats >= 3) {
        return {
          allowed: false,
          isSelected: false,
          isCapacityBreached: true,
          reason: "Max 3 tables of 2 seats allowed",
        };
      }
      if (capacity.pointsUsed + 2 > 6) {
        return {
          allowed: false,
          isSelected: false,
          isCapacityBreached: true,
          reason: "Would exceed server capacity limit (6 points)",
        };
      }
      return { allowed: true, isSelected: false };
    }

    return { allowed: true, isSelected: false };
  };

  // Toggle selection
  const handleToggleTable = (table) => {
    const tableId = table.table_id || table.id;
    const selectability = getTableSelectability(table);

    if (selectedIds.includes(tableId)) {
      setSelectedIds((prev) => prev.filter((id) => id !== tableId));
    } else {
      if (!selectability.allowed) {
        toast.error(selectability.reason || "Cannot select this table");
        return;
      }
      setSelectedIds((prev) => [...prev, tableId]);
    }
  };

  // Save assignments
  const handleSave = async () => {
    if (!server?.employee_id) return;

    try {
      setSaving(true);
      const res = await api.post("/server-tables/assign", {
        employee_id: server.employee_id,
        table_ids: selectedIds,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "Tables assigned successfully!");
        if (onSuccess) onSuccess(res.data);
        onClose();
      }
    } catch (error) {
      console.error("Assignment error:", error);
      toast.error(
        error.response?.data?.message || "Failed to assign tables. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // Filtered tables for display
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchSearch =
        !search ||
        String(t.table_number || "")
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        String(t.assigned_server_name || "")
          .toLowerCase()
          .includes(search.toLowerCase());

      const seats = Number(t.no_of_seats || 0);
      let matchSeats = true;
      if (seatFilter === "2") matchSeats = seats <= 2;
      else if (seatFilter === "4") matchSeats = seats === 4 || seats === 3;
      else if (seatFilter === "6+") matchSeats = seats >= 5;

      return matchSearch && matchSeats;
    });
  }, [tables, search, seatFilter]);

  if (!isOpen) return null;

  const progressPercent = Math.min(100, Math.round((capacity.pointsUsed / 6) * 100));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-[#1f3228] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4a843] text-[#1f3228]">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Assign Tables</h2>
                <span className="rounded-full bg-[#d4a843]/20 px-2 py-0.5 text-xs font-semibold text-[#d4a843]">
                  Server Role
                </span>
              </div>
              <p className="text-xs text-gray-300">
                Server: <span className="font-semibold text-white">{server?.full_name}</span>{" "}
                <span className="font-mono text-gray-400">({server?.employee_id})</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-300 transition hover:bg-white/10 hover:text-white"
            title="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Capacity Rules Guide & Live Meter */}
        <div className="border-b border-gray-100 bg-[#fbfbfa] p-5">
          {/* Rules Cards */}
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className={`flex items-center justify-between rounded-xl border p-3 ${capacity.count2Seats > 0 ? "border-emerald-300 bg-emerald-50/60" : "border-gray-200 bg-white"}`}>
              <div>
                <p className="text-xs font-semibold text-gray-700">2-Seat Tables</p>
                <p className="text-[11px] text-gray-500">Max 3 tables per server</p>
              </div>
              <span className={`rounded-lg px-2 py-1 text-xs font-bold ${capacity.count2Seats >= 3 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-800"}`}>
                {capacity.count2Seats} / 3
              </span>
            </div>

            <div className={`flex items-center justify-between rounded-xl border p-3 ${capacity.count4Seats > 0 ? "border-emerald-300 bg-emerald-50/60" : "border-gray-200 bg-white"}`}>
              <div>
                <p className="text-xs font-semibold text-gray-700">4-Seat Tables</p>
                <p className="text-[11px] text-gray-500">Max 2 tables per server</p>
              </div>
              <span className={`rounded-lg px-2 py-1 text-xs font-bold ${capacity.count4Seats >= 2 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-800"}`}>
                {capacity.count4Seats} / 2
              </span>
            </div>

            <div className={`flex items-center justify-between rounded-xl border p-3 ${capacity.countLargeSeats > 0 ? "border-emerald-300 bg-emerald-50/60" : "border-gray-200 bg-white"}`}>
              <div>
                <p className="text-xs font-semibold text-gray-700">6 or 8-Seat Tables</p>
                <p className="text-[11px] text-gray-500">Max 1 table only (no others)</p>
              </div>
              <span className={`rounded-lg px-2 py-1 text-xs font-bold ${capacity.countLargeSeats >= 1 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-800"}`}>
                {capacity.countLargeSeats} / 1
              </span>
            </div>
          </div>

          {/* Workload Progress Bar */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-gray-700">
                <Layers className="h-3.5 w-3.5 text-[#1f3228]" />
                Server Workload Capacity:
              </span>
              <span className="font-bold text-[#1f3228]">
                {capacity.pointsUsed} / 6 Points ({progressPercent}%)
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full transition-all duration-300 ${
                  progressPercent >= 100
                    ? "bg-[#1f3228]"
                    : progressPercent >= 66
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-500">
              <span>{capacity.selectedTables.length} table(s) selected</span>
              {capacity.isAtCapacity && (
                <span className="font-semibold text-amber-700">
                  Full capacity reached for this server
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search table number..."
              className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-xs outline-none focus:border-[#1f3228] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 font-medium">Filter:</span>
            {[
              { id: "all", label: "All Seats" },
              { id: "2", label: "2 Seats" },
              { id: "4", label: "4 Seats" },
              { id: "6+", label: "6+ Seats" },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSeatFilter(id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  seatFilter === id
                    ? "bg-[#1f3228] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Selection Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#d4a843]" />
              <p className="text-sm font-medium">Loading dining tables...</p>
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <Table2 className="mx-auto mb-2 h-10 w-10 text-gray-300" />
              <p className="text-sm font-semibold">No tables match your filter</p>
              <p className="text-xs text-gray-400">Try clearing search or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTables.map((table) => {
                const selectability = getTableSelectability(table);
                const isSelected = selectedIds.includes(table.table_id || table.id);
                const isAssignedToOther = selectability.isOtherServer;
                const isBreached = selectability.isCapacityBreached;

                return (
                  <div
                    key={table.table_id || table.id}
                    onClick={() => {
                      if (!isAssignedToOther) handleToggleTable(table);
                    }}
                    className={`relative flex flex-col justify-between rounded-xl border p-4 transition ${
                      isSelected
                        ? "border-[#1f3228] bg-[#f5f8f5] shadow-sm ring-2 ring-[#1f3228]/20 cursor-pointer"
                        : isAssignedToOther
                        ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                        : isBreached
                        ? "cursor-not-allowed border-gray-200 bg-gray-50/80 opacity-70"
                        : "cursor-pointer border-gray-200 bg-white hover:border-[#1f3228]/40 hover:shadow-sm"
                    }`}
                  >
                    <div>
                      {/* Top row: Table name & Selection indicator */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg font-bold text-sm ${
                              isSelected
                                ? "bg-[#1f3228] text-white"
                                : isAssignedToOther
                                ? "bg-gray-200 text-gray-500"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {table.table_number.length <= 4 ? table.table_number : "#"}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm">
                              {table.table_number}
                            </h3>
                            <span className="text-[10px] text-gray-400 font-mono">
                              ID: #{table.id}
                            </span>
                          </div>
                        </div>

                        {/* Checkbox / lock icon */}
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                            isSelected
                              ? "border-[#1f3228] bg-[#1f3228] text-white"
                              : isAssignedToOther
                              ? "border-gray-300 bg-gray-200 text-gray-500"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {isSelected ? (
                            <Check className="h-4 w-4" />
                          ) : isAssignedToOther ? (
                            <Lock className="h-3 w-3" />
                          ) : null}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
                        <span className="inline-flex items-center gap-1 font-semibold text-gray-700">
                          <Armchair className="h-3.5 w-3.5 text-gray-400" />
                          {table.no_of_seats} Seats
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            table.status === "Available"
                              ? "bg-emerald-50 text-emerald-700"
                              : table.status === "Occupied"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {table.status}
                        </span>
                      </div>
                    </div>

                    {/* Footer Status Badge */}
                    <div className="mt-3 border-t border-gray-100 pt-2">
                      {isAssignedToOther ? (
                        <p className="flex items-center gap-1 text-[11px] font-semibold text-red-600">
                          <Lock className="h-3 w-3" />
                          Assigned to {table.assigned_server_name || "other"}
                        </p>
                      ) : isSelected ? (
                        <p className="flex items-center gap-1 text-[11px] font-semibold text-[#1f3228]">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Assigned to this server
                        </p>
                      ) : isBreached ? (
                        <p className="flex items-center gap-1 text-[10px] font-medium text-amber-700">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {selectability.reason}
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-400">Click to assign</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-[#faf9f8] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={selectedIds.length === 0 || saving}
              className="text-xs font-semibold text-gray-600 hover:text-red-600 disabled:opacity-40"
            >
              Clear All Assignments
            </button>
            <span className="text-gray-300">|</span>
            <span className="text-xs text-gray-500">
              <strong className="text-gray-800">{selectedIds.length}</strong> table(s) selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1f3228] px-5 py-2 text-xs font-semibold text-[#d4a843] shadow-md transition hover:bg-[#162420] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? "Saving Assignments..." : "Save Assignments"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
