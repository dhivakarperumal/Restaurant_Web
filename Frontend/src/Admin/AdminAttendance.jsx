import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Edit3,
  Eye,
  Filter,
  LogOut,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Timer,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { BACKEND_BASE_URL } from "../api";

export default function AdminAttendance() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [search, setSearch] = useState("");

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit / Add modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    attendance_record_id: null,
    employee_id: "",
    employee_name: "",
    date: todayStr,
    check_in: "",
    check_out: "",
    status: "Present",
    notes: "",
  });
  const [savingRecord, setSavingRecord] = useState(false);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError("");

      const [listRes, summaryRes] = await Promise.all([
        api.get("/attendance/admin/records", {
          params: {
            date: selectedDate,
            employeeType: selectedRole !== "All" ? selectedRole : undefined,
            status: selectedStatus !== "All" ? selectedStatus : undefined,
            search: search.trim() || undefined,
          },
        }),
        api.get("/attendance/admin/summary", {
          params: { date: selectedDate },
        }),
      ]);

      if (listRes.data?.success) {
        setRecords(listRes.data.data || []);
      }
      if (summaryRes.data?.success) {
        setSummary(summaryRes.data.data || null);
      }
    } catch (err) {
      console.error("Failed to load admin attendance:", err);
      setError(err.response?.data?.message || "Failed to load attendance records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, selectedRole, selectedStatus]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchAttendance();
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const formatTimeStr = (isoString) => {
    if (!isoString) return "--:--";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "--:--";
    }
  };

  const formatDuration = (totalSecs) => {
    const secs = Math.max(0, Math.floor(Number(totalSecs) || 0));
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handleEditClick = (record) => {
    // Format check_in and check_out for datetime-local input
    const toInputFormat = (iso) => {
      if (!iso) return "";
      try {
        const d = new Date(iso);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
      } catch {
        return "";
      }
    };

    setModalData({
      attendance_record_id: record.attendance_record_id || null,
      employee_id: record.employee_id,
      employee_name: record.full_name,
      date: record.attendance_date || selectedDate,
      check_in: toInputFormat(record.check_in),
      check_out: toInputFormat(record.check_out),
      status: record.attendance_status || "Present",
      notes: record.notes || "",
    });
    setModalOpen(true);
  };

  const handleSaveModal = async (e) => {
    e.preventDefault();
    if (!modalData.employee_id) {
      toast.error("Employee is required.");
      return;
    }

    try {
      setSavingRecord(true);
      const payload = {
        employeeId: modalData.employee_id,
        date: modalData.date,
        checkIn: modalData.check_in ? new Date(modalData.check_in).toISOString() : null,
        checkOut: modalData.check_out ? new Date(modalData.check_out).toISOString() : null,
        status: modalData.status,
        notes: modalData.notes,
      };

      const res = await api.post("/attendance/admin/mark", payload);
      if (res.data?.success) {
        toast.success(res.data.message || "Attendance saved successfully.");
        setModalOpen(false);
        fetchAttendance();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save attendance.");
    } finally {
      setSavingRecord(false);
    }
  };

  const handleDeleteRecord = async (record) => {
    if (!record.attendance_record_id) return;
    if (!window.confirm(`Delete attendance record for ${record.full_name}?`)) return;

    try {
      const res = await api.delete(`/attendance/admin/${record.attendance_record_id}`);
      if (res.data?.success) {
        toast.success("Attendance record removed.");
        fetchAttendance();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete record.");
    }
  };

  const handleExportCSV = () => {
    if (!records.length) {
      toast.error("No records available to export.");
      return;
    }

    const headers = [
      "Employee ID",
      "Full Name",
      "Department / Role",
      "Date",
      "Scheduled Shift",
      "Clock In",
      "Clock Out",
      "Total Hours",
      "Attendance Status",
      "Notes",
    ];

    const rows = records.map((r) => [
      `"${r.employee_id || ""}"`,
      `"${r.full_name || ""}"`,
      `"${r.employee_type || ""}"`,
      `"${r.attendance_date || ""}"`,
      `"${r.start_time || "--"} to ${r.end_time || "--"}"`,
      `"${r.check_in ? formatTimeStr(r.check_in) : "--"}"`,
      `"${r.check_out ? formatTimeStr(r.check_out) : r.check_in ? "Working" : "--"}"`,
      `"${r.total_hours || (r.duration_seconds ? (r.duration_seconds / 3600).toFixed(2) : "0")}"`,
      `"${r.attendance_status || "Absent"}"`,
      `"${r.notes || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `staff_attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statCards = [
    {
      title: "Total Staff",
      value: summary?.total_active_staff ?? records.length,
      icon: Users,
      bg: "bg-[#1f4e42]",
      hint: "Active employees registered",
    },
    {
      title: "Present Today",
      value: summary?.present_count ?? 0,
      icon: UserCheck,
      bg: "bg-[#16a34a]",
      hint: "Clocked in today",
    },
    {
      title: "Active on Duty",
      value: summary?.working_now_count ?? 0,
      icon: Timer,
      bg: "bg-[#0284c7]",
      hint: "Currently working shifts",
    },
    {
      title: "Completed Shift",
      value: summary?.completed_count ?? 0,
      icon: CheckCircle2,
      bg: "bg-[#6366f1]",
      hint: "Clocked out today",
    },
    {
      title: "Late Arrivals",
      value: summary?.late_count ?? 0,
      icon: Clock,
      bg: "bg-[#d97706]",
      hint: "Arrived after start time",
    },
    {
      title: "Absent Today",
      value: summary?.absent_count ?? 0,
      icon: UserRound,
      bg: "bg-[#e11d48]",
      hint: "Did not check in",
    },
  ];

  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8 bg-[#f8faf8]">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              <CalendarCheck size={14} /> Staff Attendance System
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Daily Attendance & Shift Records
            </h1>
            <p className="mt-1 text-xs text-gray-500 sm:text-sm">
              Live tracking for Chef, Server, Delivery Partner, and staff logins.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={fetchAttendance}
              disabled={loading}
              title="Refresh"
              className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Top KPI Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl p-4 text-white shadow-sm transition hover:shadow-md ${card.bg}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                    {card.title}
                  </span>
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/20">
                    <Icon size={16} className="text-white" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-extrabold tabular-nums">
                    {loading ? "..." : card.value}
                  </div>
                  <p className="text-[10px] text-white/75 truncate mt-0.5">{card.hint}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Picker */}
            <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700">
              <Calendar size={15} className="text-gray-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent font-semibold text-gray-900 outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                selectedDate === todayStr
                  ? "bg-[#1f4e42] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Today
            </button>

            {/* Department / Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-800 outline-none cursor-pointer"
            >
              <option value="All">All Departments</option>
              <option value="Chef">Chefs</option>
              <option value="Server">Servers</option>
              <option value="Delivery Partner">Delivery Partners</option>
              <option value="Cashier">Cashiers</option>
              <option value="Manager">Managers</option>
              <option value="Cleaner">Cleaners</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-800 outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Working">Working Now</option>
              <option value="Completed">Completed Shift</option>
              <option value="Late">Late Arrival</option>
              <option value="Absent">Absent</option>
            </select>
          </div>

          {/* Search box */}
          <div className="relative min-w-[240px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by name, ID, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-xs text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#1f4e42] focus:bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Attendance Records Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5">Scheduled Shift</th>
                  <th className="px-4 py-3.5">Clock In</th>
                  <th className="px-4 py-3.5">Clock Out</th>
                  <th className="px-4 py-3.5">Duration</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Notes</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={24} className="animate-spin text-[#1f4e42]" />
                        <span>Loading attendance records...</span>
                      </div>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle size={28} className="text-gray-300" />
                        <span className="font-semibold text-gray-600">
                          No attendance records found for this date.
                        </span>
                        <span className="text-xs text-gray-400">
                          Try changing filters or select a different date.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((r) => {
                    const isClockedIn = Boolean(r.check_in);
                    const isWorking = Boolean(r.check_in && !r.check_out);
                    const isCompleted = Boolean(r.check_in && r.check_out);
                    const isAbsent = !r.check_in || r.attendance_status === "Absent";

                    return (
                      <tr
                        key={r.employee_id}
                        className="transition hover:bg-gray-50/70"
                      >
                        {/* Employee Details */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {r.profile_photo ? (
                                <img
                                  src={
                                    r.profile_photo.startsWith("http")
                                      ? r.profile_photo
                                      : `${BACKEND_BASE_URL}/upload/employee_documents/${r.profile_photo}`
                                  }
                                  alt={r.full_name}
                                  className="h-10 w-10 rounded-full object-cover border border-gray-200"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="grid h-10 w-10 place-items-center rounded-full bg-[#1f4e42]/10 font-bold text-[#1f4e42]">
                                  {r.full_name?.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                                  isWorking
                                    ? "bg-emerald-500 animate-pulse"
                                    : isCompleted
                                    ? "bg-blue-500"
                                    : "bg-gray-300"
                                }`}
                              />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 leading-tight">
                                {r.full_name}
                              </p>
                              <p className="text-[10px] text-gray-500 font-mono">
                                {r.employee_id}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Department / Role */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              r.employee_type === "Chef"
                                ? "bg-amber-100 text-amber-800"
                                : r.employee_type === "Server"
                                ? "bg-purple-100 text-purple-800"
                                : r.employee_type === "Delivery Partner"
                                ? "bg-sky-100 text-sky-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {r.employee_type}
                          </span>
                        </td>

                        {/* Shift Times */}
                        <td className="px-4 py-3.5 text-gray-600">
                          {r.start_time ? (
                            <span>
                              {r.start_time.slice(0, 5)} - {r.end_time ? r.end_time.slice(0, 5) : "--"}
                            </span>
                          ) : (
                            <span className="text-gray-400">Regular</span>
                          )}
                        </td>

                        {/* Clock In */}
                        <td className="px-4 py-3.5">
                          {r.check_in ? (
                            <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                              <span>{formatTimeStr(r.check_in)}</span>
                              {r.attendance_status === "Late" && (
                                <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-extrabold text-amber-800">
                                  Late
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">--</span>
                          )}
                        </td>

                        {/* Clock Out */}
                        <td className="px-4 py-3.5">
                          {r.check_out ? (
                            <span className="font-semibold text-gray-800">
                              {formatTimeStr(r.check_out)}
                            </span>
                          ) : isWorking ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                              Working
                            </span>
                          ) : (
                            <span className="text-gray-400">--</span>
                          )}
                        </td>

                        {/* Duration */}
                        <td className="px-4 py-3.5 font-mono font-bold text-gray-800">
                          {r.total_hours
                            ? `${r.total_hours} hrs`
                            : r.duration_seconds
                            ? formatDuration(r.duration_seconds)
                            : "--"}
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                              r.attendance_status === "Late"
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : r.attendance_status === "Absent" || isAbsent
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : r.attendance_status === "Half Day"
                                ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {isAbsent ? "Absent" : r.attendance_status || "Present"}
                          </span>
                        </td>

                        {/* Notes */}
                        <td className="px-4 py-3.5 text-gray-500 max-w-[140px] truncate">
                          {r.notes || "—"}
                        </td>

                        {/* Action buttons */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleEditClick(r)}
                              title="Edit Attendance"
                              className="grid h-7 w-7 place-items-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                            >
                              <Pencil size={13} />
                            </button>
                            {r.attendance_record_id && (
                              <button
                                onClick={() => handleDeleteRecord(r)}
                                title="Delete attendance entry"
                                className="grid h-7 w-7 place-items-center rounded-lg border border-gray-200 bg-white text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit / Mark Attendance Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                <div className="flex items-center gap-2">
                  <CalendarCheck size={18} className="text-[#1f4e42]" />
                  <h3 className="font-bold text-gray-900">
                    {modalData.attendance_record_id ? "Edit Attendance" : "Mark Attendance"}
                  </h3>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveModal} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Employee
                  </label>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs font-semibold text-gray-900">
                    {modalData.employee_name} ({modalData.employee_id})
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={modalData.date}
                      onChange={(e) =>
                        setModalData({ ...modalData, date: e.target.value })
                      }
                      required
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium outline-none focus:border-[#1f4e42]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                      Status
                    </label>
                    <select
                      value={modalData.status}
                      onChange={(e) =>
                        setModalData({ ...modalData, status: e.target.value })
                      }
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold outline-none focus:border-[#1f4e42]"
                    >
                      <option value="Present">Present</option>
                      <option value="Late">Late</option>
                      <option value="Half Day">Half Day</option>
                      <option value="Absent">Absent</option>
                      <option value="On Leave">On Leave</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                      Clock In Time
                    </label>
                    <input
                      type="datetime-local"
                      value={modalData.check_in}
                      onChange={(e) =>
                        setModalData({ ...modalData, check_in: e.target.value })
                      }
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium outline-none focus:border-[#1f4e42]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                      Clock Out Time
                    </label>
                    <input
                      type="datetime-local"
                      value={modalData.check_out}
                      onChange={(e) =>
                        setModalData({ ...modalData, check_out: e.target.value })
                      }
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium outline-none focus:border-[#1f4e42]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                    Notes / Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={modalData.notes}
                    onChange={(e) =>
                      setModalData({ ...modalData, notes: e.target.value })
                    }
                    placeholder="e.g. Late approved by manager, sick leave..."
                    className="w-full rounded-xl border border-gray-200 p-3 text-xs outline-none focus:border-[#1f4e42]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingRecord}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1f4e42] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#163b32] disabled:opacity-50"
                  >
                    {savingRecord ? "Saving..." : "Save Record"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
