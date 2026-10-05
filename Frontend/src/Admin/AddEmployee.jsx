import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Bike,
  BriefcaseBusiness,
  Calendar,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  ChevronRight,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  Info,
  LocateFixed,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  User,
  UserCheck,
  UserPlus,
  UserRound,
  Utensils,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";
import EmployeeDocument from "./EmployeeDocument";

const employeeTypes = ["Chef", "Delivery Partner", "Server", "Cashier", "Manager", "Cleaner"];

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

const indiaStatesAndTerritories = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const fieldStyles =
  "h-11 w-full rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:bg-white focus:border-[#1a3c36] focus:ring-4 focus:ring-[#1a3c36]/10 hover:border-slate-300";

const fieldNameFromLabel = (label) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const parseStringList = (value) => {
  if (!value) return [""];
  if (Array.isArray(value)) return value.length ? value.map((dish) => String(dish || "")) : [""];
  try {
    const dishes = JSON.parse(value);
    if (Array.isArray(dishes)) return dishes.length ? dishes.map((dish) => String(dish || "")) : [""];
  } catch {
    return [String(value)];
  }
  return [String(value)];
};

const Field = ({
  label,
  required = false,
  type = "text",
  options,
  placeholder,
  wide = false,
  name = fieldNameFromLabel(label),
  existingDocument,
  value,
  defaultValue,
  onChange,
  onBlur,
  error,
  helperText,
  uppercase = false,
  readOnly = false,
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const inputId = `employee-${name}`;

  if (type === "file") {
    return (
      <div className={`block min-w-0 space-y-1.5 ${wide ? "md:col-span-2" : ""}`}>
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
          <span>
            {label}
            {required && <span className="ml-1 text-rose-500 font-bold">*</span>}
          </span>
        </label>
        <div className="relative rounded-xl border border-slate-200/90 bg-slate-50/40 p-2.5 transition hover:border-emerald-300">
          <input
            id={inputId}
            name={name}
            type="file"
            className="w-full cursor-pointer text-xs text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[#1a3c36] hover:file:bg-emerald-100 transition"
          />
          <p className="mt-1 text-[10px] text-slate-400">Accepted formats: JPG, PNG, PDF (Max 5MB)</p>
        </div>
        {existingDocument && (
          <div className="mt-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Current saved document (will be kept if not replaced)</span>
            </div>
            <EmployeeDocument filename={existingDocument} label={label} />
          </div>
        )}
      </div>
    );
  }

  if (type === "password") {
    return (
      <div className={`block min-w-0 space-y-1.5 ${wide ? "md:col-span-2" : ""}`}>
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
          {label}
          {required && <span className="ml-1 text-rose-500 font-bold">*</span>}
        </label>
        <div className="relative">
          <input
            id={inputId}
            name={name}
            type={isPasswordVisible ? "text" : "password"}
            required={required}
            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
            className={`${fieldStyles} pr-11 ${
              error
                ? "border-rose-400 bg-rose-50/30 text-rose-900 focus:border-rose-500 focus:ring-rose-500/10"
                : ""
            }`}
            onChange={onChange}
            onBlur={onBlur}
          />
          <button
            type="button"
            aria-label={isPasswordVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            aria-pressed={isPasswordVisible}
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 transition hover:text-slate-700"
          >
            {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error ? (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 animate-fadeIn">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`block min-w-0 space-y-1.5 ${wide ? "md:col-span-2" : ""}`}>
      <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-rose-500 font-bold">*</span>}
      </label>
      {options ? (
        <div className="relative">
          <select
            id={inputId}
            name={name}
            required={required}
            defaultValue=""
            className={`${fieldStyles} appearance-none pr-9 ${
              error
                ? "border-rose-400 bg-rose-50/30 text-rose-900 focus:border-rose-500 focus:ring-rose-500/10"
                : ""
            }`}
            onChange={onChange}
            onBlur={onBlur}
          >
            <option value="" disabled>
              Select {label.toLowerCase()}
            </option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      ) : type === "textarea" ? (
        <textarea
          id={inputId}
          name={name}
          required={required}
          rows={3}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          className={`${fieldStyles} h-auto min-h-24 resize-y py-2.5 ${
            error
              ? "border-rose-400 bg-rose-50/30 text-rose-900 focus:border-rose-500 focus:ring-rose-500/10"
              : ""
          }`}
          onChange={onChange}
          onBlur={onBlur}
        />
      ) : (
        <input
          id={inputId}
          name={name}
          type={type}
          required={required}
          readOnly={readOnly}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          className={`${fieldStyles} ${uppercase ? "uppercase" : ""} ${
            readOnly ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""
          } ${
            error
              ? "border-rose-400 bg-rose-50/30 text-rose-900 focus:border-rose-500 focus:ring-rose-500/10"
              : ""
          }`}
          onChange={(e) => {
            if (uppercase) {
              e.target.value = e.target.value.toUpperCase();
            }
            if (onChange) onChange(e);
          }}
          onBlur={onBlur}
        />
      )}
      {error ? (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 animate-fadeIn">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
};

const Section = ({ id, icon: Icon, title, description, badge, children }) => (
  <section
    id={id}
    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition hover:shadow-md duration-200"
  >
    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1a3c36] to-[#2a5944] text-white shadow-xs">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {badge && (
        <span className="hidden sm:inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-100">
          {badge}
        </span>
      )}
    </div>
    <div className="grid gap-x-5 gap-y-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">{children}</div>
  </section>
);

const uploadColumnByFieldName = {
  bank_passbook: "bank_proof_upload",
  cancelled_cheque_bank_proof: "bank_proof_upload",
};

const UploadField = ({ label, initialData }) => {
  const fieldName = fieldNameFromLabel(label);
  const column = uploadColumnByFieldName[fieldName] || fieldName;
  return <Field label={label} type="file" existingDocument={initialData?.[column]} />;
};

const LocationFields = ({ showCoordinates, delivery, fieldErrors = {}, handleFieldChange, handleFieldBlur }) => (
  <Section
    id="location-section"
    icon={MapPin}
    title="Location & Address"
    description="Primary residence or delivery service operational location"
  >
    <Field
      label="Street Address"
      name="address"
      required
      wide
      placeholder="e.g. 123 Main Street, Door No. 4B"
      error={fieldErrors.address}
      onChange={handleFieldChange}
      onBlur={(e) => handleFieldBlur("address", e.target.value)}
    />
    <Field
      label="Area / Locality"
      name="area_locality"
      required
      placeholder="e.g. Anna Nagar"
      error={fieldErrors.area_locality}
      onChange={handleFieldChange}
      onBlur={(e) => handleFieldBlur("area_locality", e.target.value)}
    />
    <Field
      label="City"
      name="city"
      required
      placeholder="e.g. Chennai"
      error={fieldErrors.city}
      onChange={handleFieldChange}
      onBlur={(e) => handleFieldBlur("city", e.target.value)}
    />
    <Field
      label="District"
      name="district"
      required
      placeholder="e.g. Chennai"
      error={fieldErrors.district}
      onChange={handleFieldChange}
      onBlur={(e) => handleFieldBlur("district", e.target.value)}
    />
    <Field
      label="State"
      name="state"
      required
      options={indiaStatesAndTerritories}
      error={fieldErrors.state}
      onChange={handleFieldChange}
      onBlur={(e) => handleFieldBlur("state", e.target.value)}
    />
    <Field
      label="Pincode"
      name="pincode"
      required
      placeholder="e.g. 600001 (6 digits)"
      helperText="6-digit postal pincode"
      error={fieldErrors.pincode}
      onChange={handleFieldChange}
      onBlur={(e) => handleFieldBlur("pincode", e.target.value)}
    />
    {showCoordinates && <Field label="Latitude" name="latitude" placeholder="Optional GPS Latitude" />}
    {showCoordinates && <Field label="Longitude" name="longitude" placeholder="Optional GPS Longitude" />}
    {showCoordinates && (
      <div className="flex items-end">
        <button
          type="button"
          onClick={() => {
            if ("geolocation" in navigator) {
              navigator.geolocation.getCurrentPosition((pos) => {
                const latInput = document.querySelector('input[name="latitude"]');
                const lngInput = document.querySelector('input[name="longitude"]');
                if (latInput) latInput.value = pos.coords.latitude.toFixed(6);
                if (lngInput) lngInput.value = pos.coords.longitude.toFixed(6);
              });
            }
          }}
          className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 text-xs font-bold text-[#1a3c36] transition hover:bg-emerald-100/70"
        >
          <LocateFixed className="h-4 w-4" />
          <span>{delivery ? "Get Current Live Location" : "Detect Location"}</span>
        </button>
      </div>
    )}
  </Section>
);

const StringListField = ({ name, label, initialValue, placeholder }) => {
  const [items, setItems] = useState(() => parseStringList(initialValue));

  const updateItem = (index, value) => {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const removeItem = (index) => {
    setItems((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [""];
    });
  };

  return (
    <div className="min-w-0 space-y-2 md:col-span-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">{label}</label>
        <span className="text-[10px] text-slate-400">Add dishes chef specializes in</span>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[11px] font-bold text-emerald-800">
              {index + 1}
            </span>
            <input
              name={name}
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
              placeholder={placeholder || "e.g. Signature Hyderabadi Dum Biryani"}
              className={fieldStyles}
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(index)}
                aria-label={`Remove dish ${index + 1}`}
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-rose-200 bg-rose-50/50 text-rose-600 transition hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setItems((current) => [...current, ""])}
        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/50 px-3.5 text-xs font-bold text-[#1a3c36] transition hover:bg-emerald-100"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Add Another Specialty Dish</span>
      </button>
    </div>
  );
};

const uniqueFieldNames = [
  "phone_number",
  "email",
  "account_number",
  "ifsc_code",
  "upi_id",
  "aadhaar_number",
  "pan_number",
  "pan_card_number",
  "vehicle_number",
  "driving_license_number",
];

const validateFormat = (name, value, employeeType) => {
  const trimmed = String(value || "").trim();

  // If empty and not required:
  if (!trimmed) {
    if (
      ["full_name", "phone_number", "email", "address", "area_locality", "city", "district", "state", "pincode"].includes(
        name
      )
    ) {
      return `${name.replace(/_/g, " ")} is required`;
    }
    if (employeeType === "Chef" && name === "cuisine_type") {
      return "Cuisine type is required for Chef";
    }
    if (
      employeeType === "Delivery Partner" &&
      ["vehicle_type", "vehicle_number", "driving_license_number"].includes(name)
    ) {
      return `${name.replace(/_/g, " ")} is required for Delivery Partner`;
    }
    return "";
  }

  switch (name) {
    case "phone_number": {
      const cleanPhone = trimmed.replace(/^\+91/, "").replace(/[\s\-()]/g, "");
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        return "Phone number must be a 10-digit number starting with 6, 7, 8, or 9";
      }
      return "";
    }
    case "whatsapp_number": {
      const cleanPhone = trimmed.replace(/^\+91/, "").replace(/[\s\-()]/g, "");
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        return "WhatsApp number must be a 10-digit number starting with 6, 7, 8, or 9";
      }
      return "";
    }
    case "email": {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(trimmed)) {
        return "Please enter a valid email address (e.g. employee@restaurant.com)";
      }
      return "";
    }
    case "account_number": {
      const cleanAcc = trimmed.replace(/[\s\-]/g, "");
      if (!/^\d{9,18}$/.test(cleanAcc)) {
        return "Account number must be 9 to 18 digits (e.g. 123456789012)";
      }
      return "";
    }
    case "ifsc_code": {
      const cleanIfsc = trimmed.toUpperCase().replace(/\s/g, "");
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
        return "IFSC code must be 11 characters (e.g. SBIN0001234: 4 letters, 0, then 6 alphanumeric characters)";
      }
      return "";
    }
    case "upi_id": {
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
      if (!upiRegex.test(trimmed)) {
        return "UPI ID must be a valid format (e.g. employee@okaxis or 9876543210@upi)";
      }
      return "";
    }
    case "aadhaar_number": {
      const cleanAadhaar = trimmed.replace(/[\s\-]/g, "");
      if (!/^\d{12}$/.test(cleanAadhaar)) {
        return "Aadhaar number must be a 12-digit number (e.g. 1234 5678 9012)";
      }
      return "";
    }
    case "pan_number":
    case "pan_card_number": {
      const cleanPan = trimmed.replace(/[\s\-]/g, "").toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
        return "PAN number must be 10 characters: 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F)";
      }
      return "";
    }
    case "vehicle_number": {
      const cleanVeh = trimmed.replace(/[\s\-]/g, "").toUpperCase();
      if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/.test(cleanVeh)) {
        return "Vehicle number must match registration format (e.g. TN01AB1234 or TN 01 AB 1234)";
      }
      return "";
    }
    case "driving_license_number": {
      const cleanDl = trimmed.replace(/[\s\-]/g, "").toUpperCase();
      if (!/^[A-Z]{2}[0-9]{2}[0-9A-Z]{7,12}$/.test(cleanDl)) {
        return "Driving license must match standard format (e.g. TN0120200001234: 11-16 characters)";
      }
      return "";
    }
    case "pincode": {
      const cleanPin = trimmed.replace(/[\s\-]/g, "");
      if (!/^\d{6}$/.test(cleanPin)) {
        return "Pincode must be 6 digits (e.g. 600001)";
      }
      return "";
    }
    default:
      return "";
  }
};

const EmployeeFields = ({
  employeeType,
  employeeId,
  isEditing,
  initialData,
  fieldErrors = {},
  handleFieldChange,
  handleFieldBlur,
  panValue = "",
  handlePanChange,
}) => {
  const isChef = employeeType === "Chef";
  const isDelivery = employeeType === "Delivery Partner";
  const isBasic = !isChef && !isDelivery;
  const [deliverySalaryType, setDeliverySalaryType] = useState(initialData?.salary_type || "Monthly Basis");
  const [selectedWorkingDays, setSelectedWorkingDays] = useState(() => {
    if (!initialData?.working_days) return [];
    if (Array.isArray(initialData.working_days)) return initialData.working_days;
    try {
      const parsed = JSON.parse(initialData.working_days);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const toggleDay = (day) => {
    setSelectedWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <>
      {/* 1. PERSONAL DETAILS */}
      <Section
        id="personal-section"
        icon={UserRound}
        title="Personal & Access Details"
        description="Employee identity, contact channels, and system authentication"
      >
        <Field
          label={isChef ? "Chef Name" : "Full Name"}
          name="full_name"
          required
          placeholder="e.g. John Doe"
          error={fieldErrors.full_name}
          onChange={handleFieldChange}
          onBlur={(e) => handleFieldBlur("full_name", e.target.value)}
        />
        <UploadField label="Profile Photo" initialData={initialData} />
        <Field label="Gender" options={["Female", "Male", "Non-binary", "Prefer not to say"]} />
        <Field label="Date of Birth" type="date" />
        <Field
          label="Phone Number"
          type="tel"
          required
          placeholder="e.g. 9876543210 (10 digits starting with 6, 7, 8, 9)"
          helperText="10-digit mobile number starting with 6, 7, 8, or 9"
          error={fieldErrors.phone_number}
          onChange={handleFieldChange}
          onBlur={(e) => handleFieldBlur("phone_number", e.target.value)}
        />
        {isDelivery && (
          <Field
            label="WhatsApp Number"
            type="tel"
            placeholder="e.g. 9876543210 (10 digits starting with 6, 7, 8, 9)"
            helperText="WhatsApp contact for order notifications"
            error={fieldErrors.whatsapp_number}
            onChange={handleFieldChange}
            onBlur={(e) => handleFieldBlur("whatsapp_number", e.target.value)}
          />
        )}
        <Field
          label="Email"
          type="email"
          required
          placeholder="e.g. employee@restaurant.com"
          error={fieldErrors.email}
          onChange={handleFieldChange}
          onBlur={(e) => handleFieldBlur("email", e.target.value)}
        />
        <div className="block min-w-0 space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700">
            {isChef ? "Chef ID" : isDelivery ? "Delivery Partner ID" : "Employee ID"}
          </label>
          <input
            readOnly
            value={employeeId || ""}
            placeholder="Auto-generated on creation"
            className={`${fieldStyles} bg-slate-100 font-mono text-slate-500 cursor-not-allowed`}
          />
        </div>
        <Field label="Status" options={["Active", "Inactive"]} />
        <Field
          label="Password"
          type="password"
          name="password"
          required={!isEditing}
          placeholder={isEditing ? "Leave blank to keep unchanged" : "Create login password"}
          error={fieldErrors.password}
          onChange={handleFieldChange}
        />
        <Field
          label="Confirm Password"
          type="password"
          name="confirm_password"
          required={!isEditing}
          placeholder={isEditing ? "Repeat only if changing password" : "Re-enter password"}
          error={fieldErrors.confirm_password}
          onChange={handleFieldChange}
        />
      </Section>

      {/* 2. CHEF DETAILS */}
      {isChef && (
        <Section
          id="chef-section"
          icon={Utensils}
          title="Culinary & Cuisine Details"
          description="Chef experience, food specialty, and kitchen background"
        >
          <Field
            label="Cuisine Type"
            required
            options={["South Indian", "North Indian", "Chinese", "Bakery", "Italian", "Continental", "Other"]}
            error={fieldErrors.cuisine_type}
            onChange={handleFieldChange}
          />
          <Field label="Experience (Years)" type="number" placeholder="e.g. 5" />
          <Field label="Food Preference" options={["Veg", "Non-Veg", "Both"]} />
          <StringListField
            name="special_dishes"
            label="Special Dishes"
            initialValue={initialData?.special_dishes}
            placeholder="e.g. Signature Hyderabadi Dum Biryani"
          />
          <Field
            label="Description / About Chef"
            name="description_about_chef"
            type="textarea"
            wide
            placeholder="Brief professional background, awards, culinary certificates or achievements"
          />
        </Section>
      )}

      {/* 3. LOCATION DETAILS */}
      <LocationFields
        showCoordinates={isChef || isDelivery}
        delivery={isDelivery}
        fieldErrors={fieldErrors}
        handleFieldChange={handleFieldChange}
        handleFieldBlur={handleFieldBlur}
      />

      {/* 4. DELIVERY PARTNER VEHICLE DETAILS */}
      {isDelivery && (
        <Section
          id="vehicle-section"
          icon={Bike}
          title="Vehicle & Driving License"
          description="Delivery transportation equipment and statutory driving permits"
        >
          <Field
            label="Vehicle Type"
            required
            options={["Bike", "Scooter", "Bicycle", "Electric Vehicle"]}
            error={fieldErrors.vehicle_type}
            onChange={handleFieldChange}
          />
          <Field
            label="Vehicle Number"
            required
            uppercase
            placeholder="e.g. TN01AB1234"
            helperText="Format: State, District, Series, 4-digit number (e.g. TN01AB1234)"
            error={fieldErrors.vehicle_number}
            onChange={handleFieldChange}
            onBlur={(e) => handleFieldBlur("vehicle_number", e.target.value)}
          />
          <Field label="Vehicle Model" placeholder="e.g. Honda Activa 6G" />
          <Field
            label="Driving License Number"
            required
            uppercase
            placeholder="e.g. TN0120200001234"
            helperText="Standard DL format (11 to 16 alphanumeric characters)"
            error={fieldErrors.driving_license_number}
            onChange={handleFieldChange}
            onBlur={(e) => handleFieldBlur("driving_license_number", e.target.value)}
          />
          <Field label="Driving License Expiry Date" type="date" />
          <Field label="RC Number" uppercase placeholder="e.g. TN01AB1234" />
          <UploadField label="RC Document Upload" initialData={initialData} />
          <UploadField label="Driving License Upload" initialData={initialData} />
          <UploadField label="Vehicle Photo" initialData={initialData} />
        </Section>
      )}

      {/* 5. DELIVERY PARTNER SCHEDULE & AVAILABILITY */}
      {isDelivery && (
        <Section
          id="schedule-section"
          icon={Clock3}
          title="Work Schedule & Shift Availability"
          description="Operating days of the week, shift hours, and dispatch status"
        >
          <div className="md:col-span-2 lg:col-span-3 space-y-2">
            <span className="block text-xs font-semibold text-slate-700">Active Working Days</span>
            <div className="flex flex-wrap gap-2 pt-1">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                const isSelected = selectedWorkingDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                      isSelected
                        ? "bg-[#1a3c36] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                    }`}
                  >
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 text-emerald-300" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-slate-300" />
                    )}
                    <span>{day}</span>
                    <input
                      type="checkbox"
                      name="working_days"
                      value={day}
                      checked={isSelected}
                      readOnly
                      className="sr-only"
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="Start Time" type="time" />
          <Field label="End Time" type="time" />
          <Field label="Available for Delivery" options={["Yes", "No"]} />
          <Field label="Current Status" options={["Available", "Busy", "Offline"]} />
        </Section>
      )}

      {/* 6. BANKING & PAYMENT DETAILS */}
      <Section
        id="bank-section"
        icon={CreditCard}
        title="Bank & Payment Details"
        description="Salary disbursement account, UPI handle, and tax identification"
      >
        <Field label="Account Holder Name" placeholder="e.g. John Doe" />
        <Field label="Bank Name" placeholder="e.g. State Bank of India" />
        <Field
          label="Account Number"
          placeholder="e.g. 123456789012 (9 to 18 digits)"
          helperText="9 to 18 digits bank account number"
          error={fieldErrors.account_number}
          onChange={handleFieldChange}
          onBlur={(e) => handleFieldBlur("account_number", e.target.value)}
        />
        <Field
          label="IFSC Code"
          uppercase
          placeholder="e.g. SBIN0001234"
          helperText="11 characters (e.g. SBIN0001234)"
          error={fieldErrors.ifsc_code}
          onChange={handleFieldChange}
          onBlur={(e) => handleFieldBlur("ifsc_code", e.target.value)}
        />
        <Field
          label="UPI ID"
          placeholder="e.g. employee@okaxis or 9876543210@upi"
          helperText="Virtual payment address (VPA)"
          error={fieldErrors.upi_id}
          onChange={handleFieldChange}
          onBlur={(e) => handleFieldBlur("upi_id", e.target.value)}
        />
        <Field
          label="PAN Number"
          uppercase
          value={panValue}
          placeholder="e.g. ABCDE1234F"
          helperText="10 characters: 5 letters, 4 numbers, 1 letter"
          error={fieldErrors.pan_number || fieldErrors.pan_card_number}
          onChange={(e) => handlePanChange(e.target.value)}
          onBlur={(e) => handleFieldBlur("pan_number", e.target.value)}
        />
        {isDelivery ? (
          <UploadField label="Cancelled Cheque / Bank Proof" initialData={initialData} />
        ) : (
          <UploadField label="Bank Passbook" initialData={initialData} />
        )}
      </Section>

      {/* 7. SALARY DETAILS */}
      <Section
        id="salary-section"
        icon={Banknote}
        title="Compensation & Payroll"
        description="Wage structure, base pay, and regular payroll adjustments"
      >
        {isDelivery && (
          <div className="block min-w-0 space-y-1.5 md:col-span-2 lg:col-span-3">
            <label htmlFor="delivery-salary-type" className="block text-xs font-semibold text-slate-700">
              Salary Structure Type
            </label>
            <div className="relative">
              <select
                id="delivery-salary-type"
                name="salary_type"
                value={deliverySalaryType}
                onChange={(event) => setDeliverySalaryType(event.target.value)}
                className={`${fieldStyles} appearance-none pr-9 font-semibold`}
              >
                <option value="Monthly Basis">Monthly Basis</option>
                <option value="Order Basis">Order Basis (Per-delivery Commission)</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        )}
        {(!isDelivery || deliverySalaryType === "Monthly Basis") && (
          <>
            <Field
              label="Basic Salary"
              type="number"
              placeholder="e.g. 25000"
              required
              error={fieldErrors.basic_salary}
              onChange={handleFieldChange}
            />
            <Field label="Allowances" type="number" placeholder="e.g. 3000" />
            <Field label="Deductions" type="number" placeholder="e.g. 1500" />
            <Field label="Net Salary" type="number" placeholder="Calculated / Net pay" />
            <Field
              label="Payroll Notes"
              type="textarea"
              wide
              placeholder="Special allowance notes, bonus terms, or overtime rates"
            />
          </>
        )}
      </Section>

      {/* 8. DOCUMENTS & IDENTITY PROOFS */}
      <Section
        id="documents-section"
        icon={FileCheck2}
        title="Identity Proofs & Documents"
        description="Statutory identity documents and government certificate uploads"
      >
        <Field
          label="Aadhaar Number"
          placeholder="e.g. 1234 5678 9012"
          helperText="12-digit Aadhaar number"
          error={fieldErrors.aadhaar_number}
          onChange={handleFieldChange}
          onBlur={(e) => handleFieldBlur("aadhaar_number", e.target.value)}
        />
        <UploadField label="Aadhaar / ID Proof" initialData={initialData} />
        <Field
          label="PAN Card Number"
          uppercase
          value={panValue}
          placeholder="e.g. ABCDE1234F"
          helperText="10 characters: 5 letters, 4 numbers, 1 letter"
          error={fieldErrors.pan_card_number || fieldErrors.pan_number}
          onChange={(e) => handlePanChange(e.target.value)}
          onBlur={(e) => handleFieldBlur("pan_card_number", e.target.value)}
        />
        <UploadField label="PAN Card" initialData={initialData} />
        {isChef && <UploadField label="FSSAI Certificate" initialData={initialData} />}
        {isChef && <UploadField label="Chef Photo" initialData={initialData} />}
        {isDelivery && <UploadField label="Driving License" initialData={initialData} />}
        {isDelivery && <UploadField label="RC Book" initialData={initialData} />}
        {isDelivery && <UploadField label="Insurance Certificate" initialData={initialData} />}
        <UploadField label="Address Proof" initialData={initialData} />
        <UploadField label="Other Documents" initialData={initialData} />
      </Section>

      {/* 9. DELIVERY PARTNER VERIFICATION & APP ACCESS */}
      {isDelivery && (
        <>
          <Section
            id="verification-section"
            icon={ShieldCheck}
            title="Verification & Onboarding"
            description="Background verification clearance and delivery commission"
          >
            <Field label="Verification Status" options={["Pending", "Verified", "Rejected"]} />
            <Field label="Background Verification" options={["Pending", "In Progress", "Cleared", "Rejected"]} />
            <Field label="Joining Date" type="date" />
            <Field label="Commission %" name="commission_percent" type="number" placeholder="e.g. 10" />
            <Field label="Admin Notes" type="textarea" wide placeholder="Notes on onboarding or vehicle inspection" />
          </Section>

          <Section
            id="app-access-section"
            icon={BriefcaseBusiness}
            title="Partner Mobile App Access"
            description="Delivery mobile app credentials and account permissions"
          >
            <Field label="Username / Phone Number" name="username_phone_number" placeholder="Partner username" />
            <Field label="App Access" options={["Enabled", "Disabled"]} />
            <Field label="Login Status" options={["Logged Out", "Logged In"]} />
          </Section>
        </>
      )}
    </>
  );
};

const AddEmployee = () => {
  const { employeeType: routeEmployeeType, employeeId: routeEmployeeId } = useParams();
  const navigate = useNavigate();
  const formRef = useRef(null);
  const isEditing = Boolean(routeEmployeeId);
  const initialEmployeeType = employeeTypes.find(
    (type) => type.toLowerCase().replaceAll(" ", "-") === routeEmployeeType
  );
  const [typeChoice, setTypeChoice] = useState({
    routeEmployeeType,
    value: initialEmployeeType || "Chef",
  });
  const [employeeData, setEmployeeData] = useState(null);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(isEditing);
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdEmployeeId, setCreatedEmployeeId] = useState("");
  const [newlyCreatedServer, setNewlyCreatedServer] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [panValue, setPanValue] = useState("");

  const employeeType = isEditing
    ? employeeData?.employee_type || initialEmployeeType || "Chef"
    : typeChoice.routeEmployeeType === routeEmployeeType
    ? typeChoice.value
    : initialEmployeeType || "Chef";

  const RoleIcon = getRoleIcon(employeeType);

  useEffect(() => {
    if (!isEditing) return undefined;

    let isMounted = true;
    api
      .get(`/employees/${encodeURIComponent(routeEmployeeId)}`)
      .then((response) => {
        if (!isMounted) return;
        const employee = response.data?.employee;
        if (!employee) {
          setLoadError("Employee details could not be loaded.");
          return;
        }
        setEmployeeData(employee);
        setCreatedEmployeeId(employee.employee_id);
        if (employee.pan_number || employee.pan_card_number) {
          setPanValue(employee.pan_number || employee.pan_card_number);
        }
      })
      .catch((requestError) => {
        if (isMounted)
          setLoadError(requestError.response?.data?.message || "Employee details could not be loaded.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingEmployee(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialEmployeeType, isEditing, routeEmployeeId]);

  useEffect(() => {
    if (!employeeData || !formRef.current) return;
    const days = Array.isArray(employeeData.working_days)
      ? employeeData.working_days
      : (() => {
          try {
            return JSON.parse(employeeData.working_days || "[]");
          } catch {
            return [];
          }
        })();

    Array.from(formRef.current.elements).forEach((field) => {
      if (!field.name || field.type === "file" || field.type === "password") return;
      if (field.name === "special_dishes") return;
      if (field.type === "checkbox") {
        field.checked = days.includes(field.value);
        return;
      }
      const value =
        field.name === "description_about_chef" ? employeeData.description : employeeData[field.name];
      if (value === null || value === undefined) return;
      const stringValue = String(value);
      field.value =
        field.type === "date"
          ? stringValue.slice(0, 10)
          : field.type === "time"
          ? stringValue.slice(0, 5)
          : stringValue;
    });
  }, [employeeData]);

  const handleFieldChange = (event) => {
    const { name } = event.target;
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handlePanChange = (value) => {
    const upper = value.toUpperCase();
    setPanValue(upper);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.pan_number;
      delete next.pan_card_number;
      return next;
    });
  };

  const handleFieldBlur = async (name, value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) {
      if (
        ["full_name", "phone_number", "email", "address", "area_locality", "city", "district", "state", "pincode"].includes(
          name
        )
      ) {
        setFieldErrors((prev) => ({ ...prev, [name]: "This field is required" }));
      } else {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }
      return;
    }

    const err = validateFormat(name, trimmed, employeeType);
    if (err) {
      setFieldErrors((prev) => ({ ...prev, [name]: err }));
      return;
    }

    if (uniqueFieldNames.includes(name)) {
      try {
        const response = await api.get("/employees/check-unique", {
          params: {
            field: name,
            value: trimmed,
            excludeEmployeeId: routeEmployeeId || undefined,
          },
        });
        if (response.data && response.data.isUnique === false) {
          setFieldErrors((prev) => ({ ...prev, [name]: response.data.message }));
        } else {
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next[name];
            return next;
          });
        }
      } catch (checkErr) {
        console.error("Field uniqueness check error:", checkErr);
      }
    } else {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");

    const formData = new FormData(event.currentTarget);
    formData.set("employee_type", employeeType);

    if (panValue) {
      formData.set("pan_number", panValue);
      formData.set("pan_card_number", panValue);
    }

    const password = formData.get("password");
    const confirmPassword = formData.get("confirm_password");
    if ((!isEditing || password || confirmPassword) && password !== confirmPassword) {
      setSubmitError("Password and confirm password do not match.");
      setFieldErrors((prev) => ({ ...prev, confirm_password: "Passwords do not match" }));
      return;
    }

    const newErrors = {};
    for (const [key, val] of formData.entries()) {
      if (typeof val === "string" && key !== "employee_type") {
        const err = validateFormat(key, val, employeeType);
        if (err) {
          newErrors[key] = err;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setSubmitError("Please fix the validation errors marked in red before submitting.");
      const firstErrorField = Object.keys(newErrors)[0];
      const el = formRef.current?.querySelector(`[name="${firstErrorField}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus?.();
      }
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await api.put(`/employees/${encodeURIComponent(routeEmployeeId)}`, formData);
        navigate("/admin/employees");
      } else {
        const response = await api.post("/employees", formData);
        if (employeeType === "Server" && response.data?.employee) {
          setNewlyCreatedServer(response.data.employee);
        } else if (employeeType === "Delivery Partner") {
          navigate("/admin/delivery-partners");
        } else {
          navigate("/admin/employees");
        }
      }
    } catch (requestError) {
      const respData = requestError.response?.data;
      const errorMsg =
        respData?.message ||
        `Employee could not be ${isEditing ? "updated" : "created"}. Please try again.`;
      setSubmitError(errorMsg);
      if (respData?.field) {
        setFieldErrors((prev) => ({ ...prev, [respData.field]: errorMsg }));
        const el = formRef.current?.querySelector(`[name="${respData.field}"]`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus?.();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="min-h-screen bg-slate-50/50 pb-20">
      <main className="mx-auto w-full max-w-6xl px-3 pt-4 sm:px-6 sm:pt-6">
        <input type="hidden" name="employee_type" value={employeeType} />

        {/* Top Header & Breadcrumbs */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/admin/employees"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-600 shadow-2xs transition hover:border-slate-300 hover:text-[#1a3c36]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Employees</span>
            </Link>

            {isEditing && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Editing Mode
              </span>
            )}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1a3c36] to-[#25524a] text-white shadow-md">
                  <RoleIcon className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="font-serif text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    {isEditing ? `Edit ${employeeData?.full_name || "Employee"}` : "Add New Employee"}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isEditing
                      ? "Update employee identity, contact, salary, role details and documents."
                      : "Create a staff record with profile details, access credentials, and payroll."}
                  </p>
                </div>
              </div>
            </div>

            {/* Role indicator in Edit mode */}
            {isEditing && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-3 sm:px-4">
                <RoleIcon className="h-5 w-5 text-emerald-800" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-900/60">Current Role</p>
                  <p className="text-xs font-bold text-slate-800">{employeeType}</p>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Role Switcher in ADD mode */}
          {!isEditing && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Select Employee Role <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {employeeTypes.map((type) => {
                  const Icon = getRoleIcon(type);
                  const isSelected = employeeType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setTypeChoice({ routeEmployeeType, value: type });
                        setCreatedEmployeeId("");
                        setFieldErrors({});
                        setSubmitError("");
                      }}
                      className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                        isSelected
                          ? "border-[#1a3c36] bg-[#1a3c36] text-white shadow-md ring-2 ring-[#1a3c36]/20 font-bold"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 font-medium"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="truncate text-xs">{type}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Jump In-Page Nav */}
          <nav className="flex items-center gap-2 overflow-x-auto rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-2xs scrollbar-none">
            <a
              href="#personal-section"
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-900 transition whitespace-nowrap"
            >
              Personal & Access
            </a>
            {employeeType === "Chef" && (
              <a
                href="#chef-section"
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-900 transition whitespace-nowrap"
              >
                Culinary Specialty
              </a>
            )}
            {employeeType === "Delivery Partner" && (
              <>
                <a
                  href="#vehicle-section"
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-900 transition whitespace-nowrap"
                >
                  Vehicle & License
                </a>
                <a
                  href="#schedule-section"
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-900 transition whitespace-nowrap"
                >
                  Schedule
                </a>
              </>
            )}
            <a
              href="#location-section"
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-900 transition whitespace-nowrap"
            >
              Location
            </a>
            <a
              href="#bank-section"
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-900 transition whitespace-nowrap"
            >
              Bank & Payment
            </a>
            <a
              href="#salary-section"
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-900 transition whitespace-nowrap"
            >
              Salary & Payroll
            </a>
            <a
              href="#documents-section"
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-900 transition whitespace-nowrap"
            >
              Documents
            </a>
          </nav>
        </div>

        {/* Global Error & Status Banners */}
        {(loadError || submitError) && (
          <div
            role="alert"
            className="mb-5 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-xs font-semibold text-rose-700 shadow-2xs animate-fadeIn"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <span>{loadError || submitError}</span>
          </div>
        )}

        {createdEmployeeId && (
          <div
            role="status"
            className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs font-semibold text-emerald-800 shadow-2xs animate-fadeIn"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span>
              Employee saved successfully! Generated System Employee ID: <strong>{createdEmployeeId}</strong>
            </span>
          </div>
        )}

        {isLoadingEmployee ? (
          <div className="rounded-3xl border border-slate-200 bg-white py-20 text-center shadow-xs">
            <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[#1a3c36]" />
            <p className="mt-3 text-sm font-semibold text-slate-700">Loading employee details...</p>
          </div>
        ) : !isEditing || employeeData ? (
          <div className="space-y-6">
            <EmployeeFields
              employeeType={employeeType}
              employeeId={createdEmployeeId}
              isEditing={isEditing}
              initialData={employeeData}
              fieldErrors={fieldErrors}
              handleFieldChange={handleFieldChange}
              handleFieldBlur={handleFieldBlur}
              panValue={panValue}
              handlePanChange={handlePanChange}
            />
          </div>
        ) : null}

        {/* Bottom Floating Action Bar */}
        <div className="sticky bottom-4 z-30 mt-8 flex flex-col-reverse items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:flex-row">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              All required fields marked with <span className="font-bold text-rose-500">*</span> are validated for format
              and system uniqueness.
            </span>
          </div>

          <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
            <Link
              to="/admin/employees"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 sm:flex-none"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingEmployee || Boolean(loadError)}
              className="inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1a3c36] to-[#25524a] px-6 text-xs font-bold text-white shadow-md transition hover:from-[#142f2a] hover:to-[#1d443d] active:scale-98 disabled:opacity-60 sm:flex-none"
            >
              {isSubmitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Upload className="h-4 w-4 text-emerald-300" />
              )}
              <span>
                {isSubmitting
                  ? isEditing
                    ? "Saving changes..."
                    : "Adding employee..."
                  : isEditing
                  ? "Save Changes"
                  : `Save ${employeeType}`}
              </span>
            </button>
          </div>
        </div>

        {/* Server Dining Table Assignment Modal */}
        {newlyCreatedServer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl border border-slate-100 animate-scaleUp">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1a3c36] to-[#25524a] text-amber-300 shadow-lg">
                <UtensilsCrossed className="h-8 w-8" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-slate-900">Server Registered!</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                <strong>{newlyCreatedServer.full_name}</strong> has been successfully added to your staff directory.
                Would you like to assign dining tables to this server now?
              </p>

              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    navigate("/admin/servers", { state: { assignServer: newlyCreatedServer } });
                  }}
                  className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1a3c36] to-[#25524a] px-5 text-xs font-bold text-white shadow-md transition hover:from-[#142f2a] hover:to-[#1d443d]"
                >
                  <UtensilsCrossed className="h-4 w-4 text-amber-300" />
                  <span>Assign Dining Tables Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate("/admin/servers");
                  }}
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
                >
                  Go to Manage Servers
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </form>
  );
};

const AddEmployeeRoute = () => {
  const { employeeType: routeEmployeeType, employeeId } = useParams();
  return <AddEmployee key={employeeId || routeEmployeeType || "new"} />;
};

export default AddEmployeeRoute;