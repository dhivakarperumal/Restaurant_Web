import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Award,
  Bike,
  BriefcaseBusiness,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  Eye,
  FileCheck2,
  FileText,
  Globe,
  Hash,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Sparkles,
  Table2,
  User,
  UserCheck,
  UserRound,
  Utensils,
  UtensilsCrossed,
  X,
} from "lucide-react";
import EmployeeDocument from "./EmployeeDocument";
import { BACKEND_BASE_URL } from "../api";

const getRoleIcon = (type) => {
  switch (type) {
    case "Chef":
      return ChefHat;
    case "Delivery Partner":
      return Bike;
    case "Server":
      return UtensilsCrossed;
    case "Cashier":
      return CreditCard;
    case "Manager":
      return BriefcaseBusiness;
    case "Cleaner":
      return Sparkles;
    default:
      return UserRound;
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(dateStr);
  }
};

const formatCurrency = (val) => {
  if (val === null || val === undefined || val === "") return "—";
  const num = Number(val);
  return isNaN(num) ? String(val) : `₹${num.toLocaleString("en-IN")}`;
};

const parseList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // string
  }
  return [String(value).trim()].filter(Boolean);
};

const documentConfigs = [
  { key: "profile_photo", label: "Profile Photo" },
  { key: "chef_photo", label: "Chef Photo" },
  { key: "aadhaar_id_proof", label: "Aadhaar Card / ID Proof" },
  { key: "pan_card", label: "PAN Card Document" },
  { key: "bank_proof_upload", label: "Bank Proof / Passbook / Cheque" },
  { key: "fssai_certificate", label: "FSSAI Certificate" },
  { key: "driving_license", label: "Driving License Document" },
  { key: "driving_license_upload", label: "Driving License Upload" },
  { key: "rc_book", label: "RC Book Document" },
  { key: "rc_document_upload", label: "RC Document Upload" },
  { key: "insurance_certificate", label: "Insurance Certificate" },
  { key: "vehicle_photo", label: "Vehicle Photo" },
  { key: "address_proof", label: "Address Proof" },
  { key: "other_documents", label: "Other Supporting Documents" },
];

const InfoTile = ({ icon: Icon, label, value, isMonospace = false, isLink = false, href, badgeColor }) => (
  <div className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 transition hover:border-emerald-200/80 hover:bg-white hover:shadow-2xs">
    <div className="flex items-center gap-1.5 text-slate-400">
      {Icon && <Icon className="h-3.5 w-3.5 text-emerald-700/80" />}
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
    </div>
    {badgeColor ? (
      <div className="mt-0.5">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColor}`}>
          {value || "—"}
        </span>
      </div>
    ) : isLink && href && value ? (
      <a
        href={href}
        className="mt-0.5 truncate text-sm font-semibold text-emerald-800 underline decoration-emerald-200 underline-offset-2 hover:text-emerald-950"
      >
        {value}
      </a>
    ) : (
      <p className={`mt-0.5 break-words text-sm font-semibold text-slate-800 ${isMonospace ? "font-mono tracking-tight" : ""}`}>
        {value || "—"}
      </p>
    )}
  </div>
);

const ViewEmployeeModal = ({
  isOpen,
  loading,
  error,
  employee,
  serverTableCount = 0,
  onClose,
  onAssignTable,
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const RoleIcon = getRoleIcon(employee?.employee_type);
  const isChef = employee?.employee_type === "Chef";
  const isDelivery = employee?.employee_type === "Delivery Partner";
  const isServer = employee?.employee_type === "Server";

  const specialDishes = parseList(employee?.special_dishes);
  const workingDays = parseList(employee?.working_days);

  // Collect documents
  const uploadedDocs = employee
    ? documentConfigs.filter((cfg) => Boolean(employee[cfg.key]))
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-5 backdrop-blur-xs animate-fadeIn"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-details-modal-title"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100/80 animate-scaleUp"
      >
        {/* Header Hero */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#112723] via-[#1a3c36] to-[#25524a] px-6 py-6 text-white sm:px-8">
          {/* Subtle decorative glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl" />
          <div className="pointer-events-none absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-emerald-400/10 blur-xl" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute right-4 top-4 rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {loading ? (
            <div className="flex items-center gap-4 py-4">
              <LoaderCircle className="h-8 w-8 animate-spin text-emerald-400" />
              <div>
                <h2 className="text-lg font-bold">Loading Employee Details...</h2>
                <p className="text-xs text-emerald-200/80">Fetching the latest employee profile data</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 py-2 text-rose-300">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <div>
                <h2 className="text-base font-bold">Error loading record</h2>
                <p className="text-xs text-rose-200">{error}</p>
              </div>
            </div>
          ) : employee ? (
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative flex h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-white ring-2 ring-white/20 shadow-md">
                  {employee.profile_photo || employee.chef_photo ? (
                    <img
                      src={`${BACKEND_BASE_URL}/upload/employee_documents/${encodeURIComponent(employee.profile_photo || employee.chef_photo)}`}
                      alt={employee.full_name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : null}
                  <span className="font-serif text-2xl font-bold tracking-tight">
                    {employee.full_name
                      ? employee.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                      : "EM"}
                  </span>
                </div>

                {/* Identity */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-200 backdrop-blur-xs">
                      <RoleIcon className="h-3.5 w-3.5" />
                      {employee.employee_type}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-semibold ${
                        employee.status === "Active"
                          ? "bg-emerald-500/20 text-emerald-200"
                          : "bg-slate-500/20 text-slate-300"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          employee.status === "Active" ? "bg-emerald-400 animate-pulse" : "bg-slate-400"
                        }`}
                      />
                      {employee.status}
                    </span>
                    {isServer && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400/20 px-2 py-0.5 text-xs font-semibold text-amber-200">
                        <Table2 className="h-3.5 w-3.5" />
                        {serverTableCount} {serverTableCount === 1 ? "Table" : "Tables"}
                      </span>
                    )}
                    {employee.today_check_in ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-400/20 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                        {employee.today_check_out ? "Shift Completed" : "Clocked In"} (
                        {new Date(employee.today_check_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/70">
                        <Clock className="h-3.5 w-3.5" /> Not Clocked In Today
                      </span>
                    )}
                  </div>

                  <h2
                    id="employee-details-modal-title"
                    className="mt-1.5 truncate font-serif text-2xl font-bold text-white tracking-tight"
                  >
                    {employee.full_name}
                  </h2>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-emerald-100/80">
                    <button
                      type="button"
                      onClick={() => handleCopyId(employee.employee_id)}
                      title="Click to copy ID"
                      className="group inline-flex items-center gap-1 font-mono font-bold text-white hover:text-emerald-200 transition"
                    >
                      <Hash className="h-3 w-3 text-emerald-300" />
                      <span>{employee.employee_id}</span>
                      {copiedId ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                      )}
                    </button>
                    <span>•</span>
                    <span className="truncate">{employee.email}</span>
                    <span>•</span>
                    <span>{employee.phone_number}</span>
                  </div>
                </div>
              </div>

              {/* Quick Action Button in Header */}
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  to={`/admin/employees/${encodeURIComponent(employee.employee_id)}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[#1a3c36] shadow-sm transition hover:bg-emerald-50 active:scale-95"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit Profile</span>
                </Link>
                {isServer && (
                  <button
                    type="button"
                    onClick={() => onAssignTable && onAssignTable(employee)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-white/20 active:scale-95"
                  >
                    <UtensilsCrossed className="h-3.5 w-3.5 text-amber-300" />
                    <span>Assign Table</span>
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Tab Navigation */}
        {employee && (
          <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50/80 px-6 pt-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap ${
                activeTab === "overview"
                  ? "border-[#1a3c36] text-[#1a3c36]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <User className="h-4 w-4" />
              <span>Personal & Contact</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("role")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap ${
                activeTab === "role"
                  ? "border-[#1a3c36] text-[#1a3c36]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <RoleIcon className="h-4 w-4" />
              <span>Role & Operations</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("payroll")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap ${
                activeTab === "payroll"
                  ? "border-[#1a3c36] text-[#1a3c36]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              <span>Banking & Salary</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("documents")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap ${
                activeTab === "documents"
                  ? "border-[#1a3c36] text-[#1a3c36]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Documents ({uploadedDocs.length})</span>
            </button>
          </div>
        )}

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
              <p className="mt-3 text-sm font-medium">Fetching details...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center text-rose-700">
              <p className="font-semibold">{error}</p>
            </div>
          ) : employee ? (
            <>
              {/* TAB 1: OVERVIEW & PERSONAL */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Identity & Basic Info */}
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <InfoTile icon={User} label="Full Name" value={employee.full_name} />
                      <InfoTile icon={UserRound} label="Gender" value={employee.gender} />
                      <InfoTile
                        icon={Calendar}
                        label="Date of Birth"
                        value={formatDate(employee.date_of_birth)}
                      />
                      <InfoTile
                        icon={Phone}
                        label="Phone Number"
                        value={employee.phone_number}
                        isLink
                        href={`tel:${employee.phone_number}`}
                      />
                      {employee.whatsapp_number && (
                        <InfoTile
                          icon={Phone}
                          label="WhatsApp Number"
                          value={employee.whatsapp_number}
                          isLink
                          href={`https://wa.me/91${employee.whatsapp_number}`}
                        />
                      )}
                      <InfoTile
                        icon={Mail}
                        label="Email Address"
                        value={employee.email}
                        isLink
                        href={`mailto:${employee.email}`}
                      />
                    </div>
                  </div>

                  {/* Location Details */}
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Address & Location
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="sm:col-span-2">
                        <InfoTile icon={MapPin} label="Street Address" value={employee.address} />
                      </div>
                      <InfoTile icon={MapPin} label="Area / Locality" value={employee.area_locality} />
                      <InfoTile icon={Building2} label="City" value={employee.city} />
                      <InfoTile icon={Building2} label="District" value={employee.district} />
                      <InfoTile icon={Globe} label="State" value={employee.state} />
                      <InfoTile
                        icon={Hash}
                        label="Pincode"
                        value={employee.pincode}
                        isMonospace
                      />
                      {employee.latitude && employee.longitude && (
                        <InfoTile
                          icon={MapPin}
                          label="GPS Coordinates"
                          value={`${employee.latitude}, ${employee.longitude}`}
                          isMonospace
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ROLE & OPERATIONS */}
              {activeTab === "role" && (
                <div className="space-y-6">
                  {/* CHEF SPECIFIC */}
                  {isChef && (
                    <div className="space-y-5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Chef Culinary Profile
                      </h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <InfoTile
                          icon={ChefHat}
                          label="Cuisine Type"
                          value={employee.cuisine_type}
                          badgeColor="bg-emerald-50 text-emerald-800 border border-emerald-200"
                        />
                        <InfoTile
                          icon={Award}
                          label="Experience"
                          value={
                            employee.experience_years
                              ? `${employee.experience_years} Years Experience`
                              : "—"
                          }
                        />
                        <InfoTile
                          icon={Utensils}
                          label="Food Preference"
                          value={employee.food_preference}
                        />
                      </div>

                      {specialDishes.length > 0 && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Signature Dishes / Specialties
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {specialDishes.map((dish, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100/80 px-3 py-1 text-xs font-semibold text-[#1a3c36]"
                              >
                                <Utensils className="h-3 w-3 text-emerald-600" />
                                {dish}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {employee.description && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            About Chef / Bio
                          </p>
                          <p className="text-sm text-slate-700 leading-relaxed italic">
                            "{employee.description}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DELIVERY PARTNER SPECIFIC */}
                  {isDelivery && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                          Vehicle & License Information
                        </h3>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <InfoTile icon={Bike} label="Vehicle Type" value={employee.vehicle_type} />
                          <InfoTile
                            icon={Hash}
                            label="Vehicle Registration No."
                            value={employee.vehicle_number}
                            isMonospace
                            badgeColor="bg-slate-900 text-amber-300 font-mono tracking-widest uppercase border border-amber-400/40"
                          />
                          <InfoTile icon={Bike} label="Vehicle Model" value={employee.vehicle_model} />
                          <InfoTile
                            icon={ShieldCheck}
                            label="Driving License No."
                            value={employee.driving_license_number}
                            isMonospace
                          />
                          <InfoTile
                            icon={Calendar}
                            label="DL Expiry Date"
                            value={formatDate(employee.driving_license_expiry_date)}
                          />
                          <InfoTile
                            icon={Hash}
                            label="RC Number"
                            value={employee.rc_number}
                            isMonospace
                          />
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                          Working Schedule & Availability
                        </h3>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                              Active Working Days
                            </p>
                            {workingDays.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
                                  (day) => {
                                    const active = workingDays.includes(day);
                                    return (
                                      <span
                                        key={day}
                                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold ${
                                          active
                                            ? "bg-[#1a3c36] text-white shadow-2xs"
                                            : "bg-slate-100 text-slate-400 opacity-60"
                                        }`}
                                      >
                                        {active && <Check className="h-3 w-3 text-emerald-300" />}
                                        {day}
                                      </span>
                                    );
                                  }
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500">No specific days configured</p>
                            )}
                          </div>
                          <InfoTile
                            icon={Clock}
                            label="Shift Hours"
                            value={
                              employee.start_time || employee.end_time
                                ? `${employee.start_time || "—"} to ${employee.end_time || "—"}`
                                : "—"
                            }
                          />
                          <InfoTile
                            icon={CheckCircle2}
                            label="Available for Delivery"
                            value={employee.available_for_delivery}
                            badgeColor={
                              employee.available_for_delivery === "Yes"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-slate-100 text-slate-600"
                            }
                          />
                          <InfoTile
                            icon={Sparkles}
                            label="Current Live Status"
                            value={employee.current_status}
                            badgeColor={
                              employee.current_status === "Available"
                                ? "bg-emerald-50 text-emerald-800"
                                : employee.current_status === "Busy"
                                ? "bg-amber-50 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                            }
                          />
                          <InfoTile
                            icon={ShieldCheck}
                            label="Verification Status"
                            value={employee.verification_status}
                          />
                          <InfoTile
                            icon={ShieldCheck}
                            label="Background Check"
                            value={employee.background_verification}
                          />
                          <InfoTile
                            icon={DollarSign}
                            label="Commission Rate"
                            value={
                              employee.commission_percent !== null && employee.commission_percent !== undefined
                                ? `${employee.commission_percent}% per order`
                                : "—"
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SERVER SPECIFIC */}
                  {isServer && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Dining Service & Table Assignments
                      </h3>
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a3c36] text-amber-300 shadow-md">
                            <Table2 className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-slate-900">
                              {serverTableCount} Assigned Dining Tables
                            </h4>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {serverTableCount > 0
                                ? "This server is actively assigned to customer dining tables."
                                : "No dining tables currently assigned to this server."}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onAssignTable && onAssignTable(employee)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1a3c36] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#234e46]"
                        >
                          <UtensilsCrossed className="h-4 w-4 text-amber-300" />
                          <span>Manage Assigned Tables</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* GENERAL ROLES (Manager, Cashier, Cleaner) */}
                  {!isChef && !isDelivery && !isServer && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Operational Information
                      </h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <InfoTile
                          icon={RoleIcon}
                          label="Assigned Role"
                          value={employee.employee_type}
                        />
                        <InfoTile
                          icon={Calendar}
                          label="Joining Date"
                          value={formatDate(employee.joining_date)}
                        />
                        <InfoTile
                          icon={CheckCircle2}
                          label="Account Status"
                          value={employee.status}
                          badgeColor={
                            employee.status === "Active"
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Admin notes if any */}
                  {employee.admin_notes && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Internal Admin Notes
                      </p>
                      <p className="text-sm text-slate-700">{employee.admin_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: BANKING & SALARY */}
              {activeTab === "payroll" && (
                <div className="space-y-6">
                  {/* Compensation */}
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Salary & Compensation
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <InfoTile
                        icon={BriefcaseBusiness}
                        label="Salary Structure"
                        value={employee.salary_type || "Monthly Basis"}
                      />
                      <InfoTile
                        icon={DollarSign}
                        label="Basic Salary"
                        value={formatCurrency(employee.basic_salary)}
                      />
                      <InfoTile
                        icon={DollarSign}
                        label="Allowances"
                        value={formatCurrency(employee.allowances)}
                      />
                      <InfoTile
                        icon={DollarSign}
                        label="Deductions"
                        value={formatCurrency(employee.deductions)}
                      />
                      <div className="sm:col-span-2 lg:col-span-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/70 to-teal-50/50 p-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                            Net Calculated Salary
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">Basic + Allowances - Deductions</p>
                        </div>
                        <p className="text-2xl font-bold font-serif text-[#1a3c36]">
                          {formatCurrency(employee.net_salary || employee.basic_salary)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Banking Info */}
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Bank Account Details
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <InfoTile
                        icon={User}
                        label="Account Holder Name"
                        value={employee.account_holder_name || employee.full_name}
                      />
                      <InfoTile
                        icon={Building2}
                        label="Bank Name"
                        value={employee.bank_name}
                      />
                      <InfoTile
                        icon={CreditCard}
                        label="Account Number"
                        value={employee.account_number}
                        isMonospace
                      />
                      <InfoTile
                        icon={Hash}
                        label="IFSC Code"
                        value={employee.ifsc_code}
                        isMonospace
                      />
                      <InfoTile
                        icon={Globe}
                        label="UPI ID"
                        value={employee.upi_id}
                      />
                      <InfoTile
                        icon={CreditCard}
                        label="PAN Card Number"
                        value={employee.pan_number || employee.pan_card_number}
                        isMonospace
                      />
                    </div>
                  </div>

                  {employee.payroll_notes && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Payroll Notes
                      </p>
                      <p className="text-sm text-slate-700">{employee.payroll_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: DOCUMENTS & IDENTITY */}
              {activeTab === "documents" && (
                <div className="space-y-6">
                  {/* Identity Numbers */}
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Identity Numbers
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <InfoTile
                        icon={ShieldCheck}
                        label="Aadhaar Number"
                        value={
                          employee.aadhaar_number
                            ? employee.aadhaar_number.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")
                            : "—"
                        }
                        isMonospace
                      />
                      <InfoTile
                        icon={CreditCard}
                        label="PAN Number"
                        value={employee.pan_number || employee.pan_card_number}
                        isMonospace
                      />
                      {employee.driving_license_number && (
                        <InfoTile
                          icon={ShieldCheck}
                          label="Driving License No."
                          value={employee.driving_license_number}
                          isMonospace
                        />
                      )}
                    </div>
                  </div>

                  {/* Uploaded Documents */}
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Uploaded File Attachments
                    </h3>
                    {uploadedDocs.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {uploadedDocs.map((item) => (
                          <div
                            key={item.key}
                            className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs flex flex-col justify-between"
                          >
                            <EmployeeDocument
                              filename={employee[item.key]}
                              label={item.label}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
                        <FileText className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-2 text-sm font-semibold text-slate-700">
                          No documents uploaded yet
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          You can upload identity proof, certificates, or vehicle documents by editing this profile.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[11px] text-slate-400">
            {employee?.created_at && (
              <span>Joined / Record Created: {formatDate(employee.created_at)}</span>
            )}
          </div>
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-600 shadow-2xs transition hover:bg-slate-100"
            >
              Close
            </button>
            {employee && (
              <Link
                to={`/admin/employees/${encodeURIComponent(employee.employee_id)}/edit`}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#1a3c36] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#245048] active:scale-95"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Employee</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewEmployeeModal;
