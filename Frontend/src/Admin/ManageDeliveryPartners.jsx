import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertCircle,
  Bike,
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  FileCheck2,
  FileText,
  LayoutGrid,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Table2,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import api, { BACKEND_BASE_URL } from "../api";
import EmployeeDocument from "./EmployeeDocument";

const ManageDeliveryPartners = () => {
  const location = useLocation();

  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Filters & Controls
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [selectedAvailability, setSelectedAvailability] = useState("All Availability");
  const [selectedVehicleType, setSelectedVehicleType] = useState("All Vehicles");
  const [selectedSalaryType, setSelectedSalaryType] = useState("All Salaries");
  const [sortBy, setSortBy] = useState("latest");
  const [viewMode, setViewMode] = useState("table");

  // Modals & Actions
  const [selectedPartnerDetails, setSelectedPartnerDetails] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const [togglingId, setTogglingId] = useState("");

  const loadPartners = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/employees?type=Delivery Partner");
      const allEmps = response.data?.employees || [];
      const deliveryList = allEmps.filter((e) => e.employee_type === "Delivery Partner");
      setPartners(deliveryList);
    } catch (err) {
      console.error("Failed to load delivery partners:", err);
      setError(err.response?.data?.message || "Failed to load delivery partners.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, []);

  const deletePartner = async (partner) => {
    if (
      !window.confirm(
        `Are you sure you want to delete delivery partner "${partner.full_name}" (${partner.employee_id})? This will also remove their user account.`
      )
    )
      return;

    setActionError("");
    setActionSuccess("");
    setDeletingId(partner.employee_id);
    try {
      await api.delete(`/employees/${encodeURIComponent(partner.employee_id)}`);
      setActionSuccess(`Delivery partner "${partner.full_name}" deleted successfully.`);
      setPartners((prev) => prev.filter((p) => p.employee_id !== partner.employee_id));
      if (selectedPartnerDetails?.employee_id === partner.employee_id) {
        setSelectedPartnerDetails(null);
      }
      setTimeout(() => setActionSuccess(""), 3500);
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not delete delivery partner.");
    } finally {
      setDeletingId("");
    }
  };

  const toggleStatus = async (partner) => {
    const newStatus = partner.status === "Active" ? "Inactive" : "Active";
    setActionError("");
    setTogglingId(partner.employee_id);
    try {
      await api.patch(`/employees/${encodeURIComponent(partner.employee_id)}/status`, {
        status: newStatus,
      });
      setPartners((prev) =>
        prev.map((p) => (p.employee_id === partner.employee_id ? { ...p, status: newStatus } : p))
      );
      if (selectedPartnerDetails?.employee_id === partner.employee_id) {
        setSelectedPartnerDetails((prev) => ({ ...prev, status: newStatus }));
      }
      setActionSuccess(`Status for ${partner.full_name} updated to ${newStatus}.`);
      setTimeout(() => setActionSuccess(""), 3500);
    } catch (err) {
      try {
        await api.put(`/employees/${encodeURIComponent(partner.employee_id)}/status`, {
          status: newStatus,
        });
        setPartners((prev) =>
          prev.map((p) => (p.employee_id === partner.employee_id ? { ...p, status: newStatus } : p))
        );
        setActionSuccess(`Status updated to ${newStatus}.`);
      } catch (fallbackErr) {
        setActionError(err.response?.data?.message || "Failed to update status.");
      }
    } finally {
      setTogglingId("");
    }
  };

  const toggleAvailability = async (partner) => {
    // Cycles between Available -> Busy -> Offline
    const nextAvailability =
      partner.current_status === "Available"
        ? "Busy"
        : partner.current_status === "Busy"
        ? "Offline"
        : "Available";

    setActionError("");
    setTogglingId(partner.employee_id + "_avail");
    try {
      await api.patch(`/employees/${encodeURIComponent(partner.employee_id)}/status`, {
        current_status: nextAvailability,
        available_for_delivery: nextAvailability === "Available" ? "Yes" : "No",
      });
      setPartners((prev) =>
        prev.map((p) =>
          p.employee_id === partner.employee_id
            ? { ...p, current_status: nextAvailability, available_for_delivery: nextAvailability === "Available" ? "Yes" : "No" }
            : p
        )
      );
      if (selectedPartnerDetails?.employee_id === partner.employee_id) {
        setSelectedPartnerDetails((prev) => ({
          ...prev,
          current_status: nextAvailability,
          available_for_delivery: nextAvailability === "Available" ? "Yes" : "No",
        }));
      }
      setActionSuccess(`Availability for ${partner.full_name} changed to ${nextAvailability}.`);
      setTimeout(() => setActionSuccess(""), 3500);
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to update availability.");
    } finally {
      setTogglingId("");
    }
  };

  // Parsing working days
  const parseWorkingDays = (daysValue) => {
    if (!daysValue) return [];
    if (Array.isArray(daysValue)) return daysValue;
    try {
      const parsed = JSON.parse(daysValue);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [String(daysValue)];
    }
  };

  // Filtered & sorted partners
  const normalizedSearch = search.trim().toLowerCase();

  const visiblePartners = useMemo(() => {
    return partners
      .filter((partner) => {
        const matchesSearch = [
          partner.id,
          partner.full_name,
          partner.employee_id,
          partner.email,
          partner.phone_number,
          partner.whatsapp_number,
          partner.vehicle_number,
          partner.vehicle_model,
          partner.driving_license_number,
        ].some((val) => String(val || "").toLowerCase().includes(normalizedSearch));

        const matchesStatus =
          selectedStatus === "All Status" || partner.status === selectedStatus;

        const partnerAvailability = partner.current_status || (partner.available_for_delivery === "Yes" ? "Available" : "Offline");
        const matchesAvailability =
          selectedAvailability === "All Availability" ||
          partnerAvailability.toLowerCase() === selectedAvailability.toLowerCase();

        const matchesVehicle =
          selectedVehicleType === "All Vehicles" || partner.vehicle_type === selectedVehicleType;

        const matchesSalary =
          selectedSalaryType === "All Salaries" || partner.salary_type === selectedSalaryType;

        return matchesSearch && matchesStatus && matchesAvailability && matchesVehicle && matchesSalary;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return String(a.full_name || "").localeCompare(String(b.full_name || ""));
        }
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
  }, [
    partners,
    search,
    selectedStatus,
    selectedAvailability,
    selectedVehicleType,
    selectedSalaryType,
    sortBy,
  ]);

  // Statistics
  const activeCount = partners.filter((p) => p.status === "Active").length;
  const availableCount = partners.filter(
    (p) =>
      p.current_status === "Available" ||
      (p.available_for_delivery === "Yes" && p.current_status !== "Busy" && p.current_status !== "Offline")
  ).length;
  const busyCount = partners.filter((p) => p.current_status === "Busy").length;

  const statCards = [
    { title: "Total Delivery Partners", value: partners.length, icon: Bike, bg: "bg-[#22c55e]", hint: "Registered fleet riders" },
    { title: "Active Partners", value: activeCount, icon: UserCheck, bg: "bg-[#3b82f6]", hint: "Currently active staff" },
    { title: "Available for Delivery", value: availableCount, icon: Bike, bg: "bg-[#06b6d4]", hint: "Ready to pick up orders" },
    { title: "Busy / On Duty", value: busyCount, icon: Clock3, bg: busyCount > 0 ? "bg-[#f59e0b]" : "bg-[#8b5cf6]", hint: "Currently delivering" },
  ];

  return (
    <main className="min-h-screen bg-[#f2f3f0] p-4 md:p-6">
      <div className="mx-auto max-w-[1500px]">

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
          {statCards.map(({ title, value, icon: Icon, bg, hint }, index) => (
            <article key={title} className={`relative min-w-0 overflow-hidden rounded-xl border border-transparent p-4 sm:p-5 shadow-[0_2px_10px_rgba(20,56,34,0.08)] flex flex-col justify-between min-h-[140px] ${bg} text-white`}>
              <div className="flex items-start gap-3 relative z-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm bg-white/20">
                  <Icon size={24} strokeWidth={2.2} className="text-white" />
                </div>
                <div className="flex-1 mt-0.5 min-w-0">
                  <h3 className="text-[12px] font-semibold opacity-90 mb-1 truncate">{title}</h3>
                  <div className="text-[26px] font-extrabold leading-none tracking-tight">{value}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-5 relative z-10">
                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold bg-white/25">↑ 12%</span>
                <span className="text-[11px] font-medium opacity-75 truncate">{hint}</span>
              </div>
              <div className="absolute right-0 bottom-0 w-24 h-16 pointer-events-none opacity-50">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                  <defs>
                    <linearGradient id={`dlpgrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#dlpgrad-${index})`} />
                  <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                </svg>
              </div>
            </article>
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
                  placeholder="Search by name, ID, vehicle no, phone..."
                  className="h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-10 pr-3 text-[14px] text-[#2d2d2d] outline-none placeholder:text-[#8a8a8a] focus:border-[#d2bc8a]"
                />
              </label>

              <div className="flex w-full flex-wrap gap-2.5 lg:ml-auto lg:w-auto">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="h-[46px] min-w-32 rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]"
                >
                  <option value="All Status">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <select
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value)}
                  className="h-[46px] min-w-36 rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]"
                >
                  <option value="All Availability">All Availability</option>
                  <option value="Available">Available</option>
                  <option value="Busy">Busy</option>
                  <option value="Offline">Offline</option>
                </select>

                <select
                  value={selectedVehicleType}
                  onChange={(e) => setSelectedVehicleType(e.target.value)}
                  className="h-[46px] min-w-32 rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]"
                >
                  <option value="All Vehicles">All Vehicles</option>
                  <option value="Bike">Bike</option>
                  <option value="Scooter">Scooter</option>
                  <option value="Electric Vehicle">Electric Vehicle</option>
                  <option value="Bicycle">Bicycle</option>
                </select>

                
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
         

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

               <Link
              to="/admin/employees/add/delivery-partner"
              className="inline-flex h-[46px] items-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-[15px] font-semibold text-white shadow-[0_6px_14px_rgba(26,60,54,0.18)] transition hover:bg-[#214a42]"
            >
              <Plus className="h-4 w-4 text-[#d4a843]" /> Add Delivery 
            </Link>
            </div>
          </div>

          {/* Table View */}
          {viewMode === "table" ? (
            <div className="overflow-hidden rounded-xl border border-[#e8e4df]">
              <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-left">
                  <thead>
                    <tr className="bg-[#d4a843] text-sm font-semibold text-white">
                      <th className="px-4 py-4">ID</th>
                      <th className="px-4 py-4">Delivery Partner</th>
                      <th className="px-4 py-4">Contact</th>
                      <th className="px-4 py-4">Vehicle Details</th>
                      <th className="px-4 py-4">Availability</th>
                      <th className="px-4 py-4">Salary Model</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-14 text-center text-sm text-[#777]">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-[#1a3c36]" />
                            <span>Loading delivery partners...</span>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-12 text-center text-sm text-[#a13e30]">
                          {error}
                        </td>
                      </tr>
                    ) : visiblePartners.length > 0 ? (
                      visiblePartners.map((partner) => {
                        const isTogglingStatus = togglingId === partner.employee_id;
                        const isTogglingAvail = togglingId === partner.employee_id + "_avail";
                        const availability =
                          partner.current_status ||
                          (partner.available_for_delivery === "Yes" ? "Available" : "Offline");

                        return (
                          <tr
                            key={partner.employee_id}
                            className="border-t border-[#f0ebe6] align-middle text-sm text-[#4d4d4d] hover:bg-[#fafaf8]"
                          >
                            <td className="px-4 py-4 font-mono text-xs text-[#7a7a7a]">
                              {partner.id ?? "—"}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e6f4f2] text-sm font-bold text-[#1a3c36] border border-[#d2ebe7]">
                                  {partner.full_name?.charAt(0)?.toUpperCase() || "D"}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-[#1f1f1f]">
                                    {partner.full_name}
                                  </div>
                                  <div className="truncate text-xs text-[#7a7a7a]">
                                    {partner.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-xs font-medium text-[#2d2d2d]">
                                {partner.phone_number || "—"}
                              </div>
                              {partner.whatsapp_number && partner.whatsapp_number !== partner.phone_number && (
                                <div className="text-[11px] text-[#25d366]">
                                  WA: {partner.whatsapp_number}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {partner.vehicle_type || partner.vehicle_number ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="inline-flex w-fit items-center gap-1 rounded bg-[#f3f4f6] px-1.5 py-0.5 text-[11px] font-bold text-[#374151]">
                                    <Bike className="h-3 w-3 text-[#1a3c36]" />
                                    {partner.vehicle_type || "Vehicle"}
                                  </span>
                                  <span className="font-mono text-xs font-semibold text-[#1f2937]">
                                    {partner.vehicle_number || "No number"}
                                  </span>
                                  {partner.vehicle_model && (
                                    <span className="text-[10px] text-gray-500">
                                      {partner.vehicle_model}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 italic">No vehicle info</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <button
                                type="button"
                                onClick={() => toggleAvailability(partner)}
                                disabled={isTogglingAvail}
                                title="Click to cycle availability (Available / Busy / Offline)"
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                                  availability === "Available"
                                    ? "bg-[#ecfdf5] text-[#059669] hover:bg-[#d1fae5]"
                                    : availability === "Busy"
                                    ? "bg-[#fffbeb] text-[#d97706] hover:bg-[#fef3c7]"
                                    : "bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]"
                                }`}
                              >
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    availability === "Available"
                                      ? "bg-[#10b981]"
                                      : availability === "Busy"
                                      ? "bg-[#f59e0b]"
                                      : "bg-[#9ca3af]"
                                  }`}
                                />
                                {isTogglingAvail ? "..." : availability}
                              </button>
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center rounded-md bg-[#fefce8] border border-[#fef08a] px-2 py-0.5 text-xs font-semibold text-[#854d0e]">
                                {partner.salary_type || "Monthly Basis"}
                              </span>
                              {partner.basic_salary && (
                                <div className="text-[11px] text-gray-500 mt-0.5">
                                  ₹{Number(partner.basic_salary).toLocaleString("en-IN")}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <button
                                type="button"
                                onClick={() => toggleStatus(partner)}
                                disabled={isTogglingStatus}
                                title="Click to toggle status"
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                                  partner.status === "Active"
                                    ? "bg-[#edf7f1] text-[#2d7b5a] hover:bg-[#e1f3e8]"
                                    : "bg-[#f1f2f0] text-[#727a73] hover:bg-[#e6e8e5]"
                                }`}
                              >
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    partner.status === "Active" ? "bg-[#2d7b5a]" : "bg-[#929892]"
                                  }`}
                                />
                                {isTogglingStatus ? "Updating..." : partner.status}
                              </button>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedPartnerDetails(partner)}
                                  title="View Partner Details"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997] hover:text-[#1a1a1a]"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>

                                <Link
                                  to={`/admin/employees/${encodeURIComponent(partner.employee_id)}/edit`}
                                  title="Edit Partner"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997] hover:text-[#1a1a1a]"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => deletePartner(partner)}
                                  disabled={deletingId === partner.employee_id}
                                  title="Delete Partner"
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
                        <td colSpan={9} className="px-5 py-16 text-center">
                          <div className="mb-3 flex justify-center text-[#8a8a8a]">
                            <Bike className="h-10 w-10 text-gray-400" />
                          </div>
                          <p className="text-base font-bold text-[#333]">
                            {normalizedSearch || selectedStatus !== "All Status" || selectedAvailability !== "All Availability"
                              ? "No matching delivery partners found"
                              : "No delivery partners added yet"}
                          </p>
                          <p className="mx-auto mt-1 max-w-sm text-xs text-[#888]">
                            {normalizedSearch || selectedStatus !== "All Status" || selectedAvailability !== "All Availability"
                              ? "Try adjusting your search criteria or clear the filters."
                              : "Add your first delivery partner to start fulfilling delivery orders."}
                          </p>
                          {!normalizedSearch && selectedStatus === "All Status" && (
                            <Link
                              to="/admin/employees/add/delivery-partner"
                              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#1a3c36] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#25524a]"
                            >
                              <Plus className="h-4 w-4 text-[#d4a843]" /> Add Your First Delivery Partner
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
                  Loading delivery partners...
                </div>
              ) : visiblePartners.length > 0 ? (
                visiblePartners.map((partner) => {
                  const availability =
                    partner.current_status ||
                    (partner.available_for_delivery === "Yes" ? "Available" : "Offline");
                  const workingDays = parseWorkingDays(partner.working_days);

                  return (
                    <article
                      key={partner.employee_id}
                      className="flex flex-col justify-between rounded-xl border border-[#e8e4df] bg-white p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e6f4f2] text-base font-bold text-[#1a3c36] border border-[#d2ebe7]">
                              {partner.full_name?.charAt(0)?.toUpperCase() || "D"}
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate text-base font-bold text-[#1f1f1f]">
                                {partner.full_name}
                              </h3>
                              <p className="truncate text-xs text-[#7a7a7a]">{partner.email}</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                partner.status === "Active"
                                  ? "bg-[#edf7f1] text-[#2d7b5a]"
                                  : "bg-[#f1f2f0] text-[#727a73]"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  partner.status === "Active" ? "bg-[#2d7b5a]" : "bg-[#929892]"
                                }`}
                              />
                              {partner.status}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                availability === "Available"
                                  ? "bg-[#ecfdf5] text-[#059669]"
                                  : availability === "Busy"
                                  ? "bg-[#fffbeb] text-[#d97706]"
                                  : "bg-[#f3f4f6] text-[#6b7280]"
                              }`}
                            >
                              {availability}
                            </span>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="my-4 space-y-2.5 border-y border-[#f0ebe6] py-3.5 text-sm">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#849087]">Partner ID</span>
                            <span className="font-mono font-semibold text-[#1a3c36]">
                              {partner.employee_id}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#849087]">Phone</span>
                            <span className="font-medium text-[#34443b]">
                              {partner.phone_number || "—"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#849087]">Vehicle</span>
                            <span className="font-medium text-[#1f2937]">
                              {partner.vehicle_type ? (
                                <>
                                  {partner.vehicle_type} ({partner.vehicle_number || "No plate"})
                                </>
                              ) : (
                                "Not specified"
                              )}
                            </span>
                          </div>

                          {workingDays.length > 0 && (
                            <div className="pt-1">
                              <span className="text-[11px] text-[#849087] block mb-1">
                                Working Days
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {workingDays.map((d) => (
                                  <span
                                    key={d}
                                    className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700"
                                  >
                                    {d.slice(0, 3)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedPartnerDetails(partner)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#1a3c36] bg-[#1a3c36] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#25524a]"
                        >
                          <Eye className="h-3.5 w-3.5 text-[#d4a843]" />
                          <span>View Details</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <Link
                            to={`/admin/employees/${encodeURIComponent(partner.employee_id)}/edit`}
                            title="Edit Partner"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => deletePartner(partner)}
                            disabled={deletingId === partner.employee_id}
                            title="Delete Partner"
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
                    <Bike className="h-10 w-10 text-gray-400" />
                  </div>
                  <p className="text-base font-bold text-[#333]">No matching delivery partners</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-[#888]">
                    Try adjusting your filters or search terms.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 border-t border-[#efebe7] pt-4 text-sm text-[#6a6a6a] flex flex-wrap items-center justify-between gap-2">
            <div>
              Showing {visiblePartners.length} of {partners.length} delivery partners
            </div>
            <div className="text-xs text-[#8a8a8a]">
              Tip: Click on Availability badge to easily cycle Available / Busy / Offline.
            </div>
          </div>
        </section>
      </div>

      {/* Partner Details Modal */}
      {selectedPartnerDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPartnerDetails(null);
          }}
        >
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-start justify-between border-b border-[#edf0ec] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a3c36] text-xl font-bold text-[#d4a843] shadow-md">
                  {selectedPartnerDetails.full_name?.charAt(0)?.toUpperCase() || "D"}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 font-serif">
                    {selectedPartnerDetails.full_name}
                  </h2>
                  <p className="text-xs font-mono text-[#1a3c36] font-semibold">
                    {selectedPartnerDetails.employee_id} • Delivery Partner
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPartnerDetails(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-5 text-sm">
              {/* Badges Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f5f8f5] p-3.5 border border-[#dce8dd]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600">Account:</span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      selectedPartnerDetails.status === "Active"
                        ? "bg-[#edf7f1] text-[#2d7b5a]"
                        : "bg-[#f1f2f0] text-[#727a73]"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        selectedPartnerDetails.status === "Active" ? "bg-[#2d7b5a]" : "bg-[#929892]"
                      }`}
                    />
                    {selectedPartnerDetails.status}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-xs font-semibold text-gray-600">Availability:</span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      (selectedPartnerDetails.current_status || "Available") === "Available"
                        ? "bg-[#ecfdf5] text-[#059669]"
                        : selectedPartnerDetails.current_status === "Busy"
                        ? "bg-[#fffbeb] text-[#d97706]"
                        : "bg-[#f3f4f6] text-[#6b7280]"
                    }`}
                  >
                    {selectedPartnerDetails.current_status || "Available"}
                  </span>
                </div>

                <div className="text-xs text-gray-500">
                  Salary Model:{" "}
                  <strong className="text-gray-800">
                    {selectedPartnerDetails.salary_type || "Monthly Basis"}
                  </strong>
                </div>
              </div>

              {/* Vehicle & Driving License Section */}
              <div className="rounded-xl border border-gray-200 p-4 bg-[#fafbf9]">
                <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider text-[#849087] mb-3 flex items-center gap-1.5">
                  <Bike className="h-4 w-4 text-[#1a3c36]" /> Vehicle & License Details
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 block">Vehicle Type</span>
                    <span className="font-semibold text-gray-800">
                      {selectedPartnerDetails.vehicle_type || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Vehicle Number</span>
                    <span className="font-mono font-bold text-[#1a3c36]">
                      {selectedPartnerDetails.vehicle_number || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Vehicle Model</span>
                    <span className="font-semibold text-gray-800">
                      {selectedPartnerDetails.vehicle_model || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Vehicle Color</span>
                    <span className="font-semibold text-gray-800">
                      {selectedPartnerDetails.vehicle_color || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">License Number</span>
                    <span className="font-mono font-semibold text-gray-800">
                      {selectedPartnerDetails.driving_license_number || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">License Expiry</span>
                    <span className="font-semibold text-gray-800">
                      {selectedPartnerDetails.driving_license_expiry_date || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">RC Number</span>
                    <span className="font-mono font-semibold text-gray-800">
                      {selectedPartnerDetails.rc_number || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Working Schedule */}
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider text-[#849087] mb-2 flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4 text-[#1a3c36]" /> Working Schedule & Shift
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 block mb-1">Working Days</span>
                    <div className="flex flex-wrap gap-1">
                      {parseWorkingDays(selectedPartnerDetails.working_days).length > 0 ? (
                        parseWorkingDays(selectedPartnerDetails.working_days).map((day) => (
                          <span
                            key={day}
                            className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-800"
                          >
                            {day}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 italic">No working days set</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 block mb-1">Shift Hours</span>
                    <span className="font-semibold text-gray-800">
                      {selectedPartnerDetails.start_time || "—"} to{" "}
                      {selectedPartnerDetails.end_time || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                  <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider text-[#849087]">
                    Contact Details
                  </h3>
                  <div className="flex items-center gap-2 text-gray-700 text-xs">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>Phone: {selectedPartnerDetails.phone_number || "—"}</span>
                  </div>
                  {selectedPartnerDetails.whatsapp_number && (
                    <div className="flex items-center gap-2 text-gray-700 text-xs">
                      <Smartphone className="h-4 w-4 text-[#25d366]" />
                      <span>WhatsApp: {selectedPartnerDetails.whatsapp_number}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-700 text-xs">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{selectedPartnerDetails.email || "—"}</span>
                  </div>
                  {selectedPartnerDetails.gender && (
                    <div className="flex items-center gap-2 text-gray-700 text-xs">
                      <UserRound className="h-4 w-4 text-gray-400" />
                      <span>{selectedPartnerDetails.gender}</span>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                  <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider text-[#849087]">
                    Address & Service Location
                  </h3>
                  <div className="flex items-start gap-2 text-gray-700 text-xs">
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p>{selectedPartnerDetails.address || "—"}</p>
                      <p className="text-gray-500">
                        {[
                          selectedPartnerDetails.area_locality,
                          selectedPartnerDetails.city,
                          selectedPartnerDetails.state,
                          selectedPartnerDetails.pincode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compensation & Bank Info */}
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider text-[#849087] mb-2 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> Compensation & Bank Info
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {selectedPartnerDetails.basic_salary && (
                    <div>
                      <span className="text-gray-500 block">Basic Salary</span>
                      <span className="font-semibold text-gray-800">
                        ₹{Number(selectedPartnerDetails.basic_salary).toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                  {selectedPartnerDetails.commission_percent && (
                    <div>
                      <span className="text-gray-500 block">Commission</span>
                      <span className="font-semibold text-gray-800">
                        {selectedPartnerDetails.commission_percent}%
                      </span>
                    </div>
                  )}
                  {selectedPartnerDetails.bank_name && (
                    <div>
                      <span className="text-gray-500 block">Bank</span>
                      <span className="font-semibold text-gray-800">
                        {selectedPartnerDetails.bank_name}
                      </span>
                    </div>
                  )}
                  {selectedPartnerDetails.account_number && (
                    <div>
                      <span className="text-gray-500 block">Account No</span>
                      <span className="font-mono font-semibold text-gray-800">
                        {selectedPartnerDetails.account_number}
                      </span>
                    </div>
                  )}
                  {selectedPartnerDetails.ifsc_code && (
                    <div>
                      <span className="text-gray-500 block">IFSC</span>
                      <span className="font-mono font-semibold text-gray-800">
                        {selectedPartnerDetails.ifsc_code}
                      </span>
                    </div>
                  )}
                  {selectedPartnerDetails.upi_id && (
                    <div>
                      <span className="text-gray-500 block">UPI ID</span>
                      <span className="font-mono font-semibold text-gray-800">
                        {selectedPartnerDetails.upi_id}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Uploaded Documents */}
              {(selectedPartnerDetails.driving_license_upload ||
                selectedPartnerDetails.rc_document_upload ||
                selectedPartnerDetails.vehicle_photo ||
                selectedPartnerDetails.bank_proof_upload ||
                selectedPartnerDetails.aadhaar_id_proof ||
                selectedPartnerDetails.pan_card) && (
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider text-[#849087] mb-2 flex items-center gap-1.5">
                    <FileCheck2 className="h-4 w-4 text-[#1a3c36]" /> Verification Documents
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedPartnerDetails.driving_license_upload && (
                      <div>
                        <span className="text-xs font-semibold text-gray-700">Driving License:</span>
                        <EmployeeDocument filename={selectedPartnerDetails.driving_license_upload} />
                      </div>
                    )}
                    {selectedPartnerDetails.rc_document_upload && (
                      <div>
                        <span className="text-xs font-semibold text-gray-700">RC Document:</span>
                        <EmployeeDocument filename={selectedPartnerDetails.rc_document_upload} />
                      </div>
                    )}
                    {selectedPartnerDetails.vehicle_photo && (
                      <div>
                        <span className="text-xs font-semibold text-gray-700">Vehicle Photo:</span>
                        <EmployeeDocument filename={selectedPartnerDetails.vehicle_photo} />
                      </div>
                    )}
                    {selectedPartnerDetails.bank_proof_upload && (
                      <div>
                        <span className="text-xs font-semibold text-gray-700">Bank Proof:</span>
                        <EmployeeDocument filename={selectedPartnerDetails.bank_proof_upload} />
                      </div>
                    )}
                    {selectedPartnerDetails.aadhaar_id_proof && (
                      <div>
                        <span className="text-xs font-semibold text-gray-700">Aadhaar Proof:</span>
                        <EmployeeDocument filename={selectedPartnerDetails.aadhaar_id_proof} />
                      </div>
                    )}
                    {selectedPartnerDetails.pan_card && (
                      <div>
                        <span className="text-xs font-semibold text-gray-700">PAN Card:</span>
                        <EmployeeDocument filename={selectedPartnerDetails.pan_card} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2.5 border-t border-gray-100 pt-4">
              <Link
                to={`/admin/employees/${encodeURIComponent(selectedPartnerDetails.employee_id)}/edit`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="h-3.5 w-3.5" /> Full Edit
              </Link>
              <button
                type="button"
                onClick={() => setSelectedPartnerDetails(null)}
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

export default ManageDeliveryPartners;
