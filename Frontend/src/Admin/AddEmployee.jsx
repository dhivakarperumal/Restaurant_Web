import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Bike,
  BriefcaseBusiness,
  ChevronDown,
  Clock3,
  CreditCard,
  Eye,
  EyeOff,
  FileCheck2,
  LocateFixed,
  LoaderCircle,
  MapPin,
  Plus,
  Trash2,
  ShieldCheck,
  Upload,
  UserPlus,
  UserRound,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api";
import EmployeeDocument from "./EmployeeDocument";

const employeeTypes = ["Chef", "Delivery Partner", "Server", "Cashier", "Manager", "Cleaner"];
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
  "h-11 w-full rounded-lg border border-[#dce3dd] bg-[#fbfcfa] px-3.5 text-sm text-[#20312a] outline-none transition placeholder:text-[#9aa59d] focus:border-[#4d765c] focus:ring-2 focus:ring-[#4d765c]/10";

const fieldNameFromLabel = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

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
      <div className={`block min-w-0 space-y-2 ${wide ? "md:col-span-2" : ""}`}>
        <label htmlFor={inputId} className="block space-y-2 text-xs font-semibold text-[#34443b]">
          <span>{label}{required && <span className="ml-1 text-[#c16b3a]">*</span>}</span>
          <input
            id={inputId}
            name={name}
            type="file"
            className={`${fieldStyles} cursor-pointer py-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-[#edf2ed] file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-[#355443]`}
          />
        </label>
        {existingDocument && (
          <div>
            <p className="text-[11px] font-semibold text-[#55715a]">Saved document (kept unless you choose a replacement)</p>
            <EmployeeDocument filename={existingDocument} />
          </div>
        )}
      </div>
    );
  }

  if (type === "password") {
    return (
      <div className={`block min-w-0 space-y-2 ${wide ? "md:col-span-2" : ""}`}>
        <label htmlFor={inputId} className="block text-xs font-semibold text-[#34443b]">
          {label}{required && <span className="ml-1 text-[#c16b3a]">*</span>}
        </label>
        <div className="relative">
          <input
            id={inputId}
            name={name}
            type={isPasswordVisible ? "text" : "password"}
            required={required}
            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
            className={`${fieldStyles} pr-11 ${error ? "border-[#e05244] bg-[#fffbfb] focus:border-[#e05244] focus:ring-[#e05244]/20" : ""}`}
            onChange={onChange}
            onBlur={onBlur}
          />
          <button
            type="button"
            aria-label={isPasswordVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            aria-pressed={isPasswordVisible}
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#75847a] transition hover:text-[#355443] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4d765c]/40"
          >
            {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-[#c0392b]">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </p>
        ) : helperText ? (
          <p className="text-[11px] text-[#718276]">{helperText}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`block min-w-0 space-y-2 ${wide ? "md:col-span-2" : ""}`}>
      <label htmlFor={inputId} className="block text-xs font-semibold text-[#34443b]">
        {label}{required && <span className="ml-1 text-[#c16b3a]">*</span>}
      </label>
      {options ? (
        <div className="relative">
          <select
            id={inputId}
            name={name}
            required={required}
            defaultValue=""
            className={`${fieldStyles} appearance-none pr-9 ${error ? "border-[#e05244] bg-[#fffbfb] focus:border-[#e05244] focus:ring-[#e05244]/20" : ""}`}
            onChange={onChange}
            onBlur={onBlur}
          >
            <option value="" disabled>Select {label.toLowerCase()}</option>
            {options.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#75847a]" />
        </div>
      ) : type === "textarea" ? (
        <textarea
          id={inputId}
          name={name}
          required={required}
          rows={3}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          className={`${fieldStyles} h-auto min-h-24 resize-y py-3 ${error ? "border-[#e05244] bg-[#fffbfb] focus:border-[#e05244] focus:ring-[#e05244]/20" : ""}`}
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
          className={`${fieldStyles} ${uppercase ? "uppercase" : ""} ${readOnly ? "bg-[#f2f5f1] text-[#66746a]" : ""} ${error ? "border-[#e05244] bg-[#fffbfb] focus:border-[#e05244] focus:ring-[#e05244]/20" : ""}`}
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
        <p className="flex items-center gap-1.5 text-xs font-medium text-[#c0392b]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-[#718276]">{helperText}</p>
      ) : null}
    </div>
  );
};

const Section = ({ icon: Icon, title, description, children }) => (
  <section className="overflow-hidden rounded-xl border border-[#e1e7e1] bg-white shadow-[0_2px_10px_rgba(31,48,38,0.035)]">
    <div className="flex items-center gap-3 border-b border-[#edf0ec] px-5 py-4 sm:px-6">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eef3ed] text-[#42694f]"><Icon className="h-[18px] w-[18px]" /></span>
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-[#23342b]">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-[#7b8980]">{description}</p>}
      </div>
    </div>
    <div className="grid gap-x-5 gap-y-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">{children}</div>
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
  <Section icon={MapPin} title="Location details" description="Primary address and service location">
    <Field
      label="Address"
      required
      wide
      placeholder="e.g. 123 Main Street"
      error={fieldErrors.address}
      onChange={handleFieldChange}
      onBlur={(e) => handleFieldBlur('address', e.target.value)}
    />
    <Field
      label="Area / Locality"
      required
      placeholder="e.g. Anna Nagar"
      error={fieldErrors.area_locality}
      onChange={handleFieldChange}
      onBlur={(e) => handleFieldBlur('area_locality', e.target.value)}
    />
    <Field
      label="City"
      required
      placeholder="e.g. Chennai"
      error={fieldErrors.city}
      onChange={handleFieldChange}
      onBlur={(e) => handleFieldBlur('city', e.target.value)}
    />
    <Field
      label="District"
      required
      placeholder="e.g. Chennai"
      error={fieldErrors.district}
      onChange={handleFieldChange}
      onBlur={(e) => handleFieldBlur('district', e.target.value)}
    />
    <Field
      label="State"
      required
      options={indiaStatesAndTerritories}
      error={fieldErrors.state}
      onChange={handleFieldChange}
      onBlur={(e) => handleFieldBlur('state', e.target.value)}
    />
    <Field
      label="Pincode"
      required
      placeholder="e.g. 600001 (6 digits)"
      helperText="6-digit postal pincode"
      error={fieldErrors.pincode}
      onChange={handleFieldChange}
      onBlur={(e) => handleFieldBlur('pincode', e.target.value)}
    />
    {showCoordinates && <Field label="Latitude" placeholder="Optional" />}
    {showCoordinates && <Field label="Longitude" placeholder="Optional" />}
    {showCoordinates && (
      <div className="flex items-end">
        <button type="button" className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#cfdacf] bg-[#f5f8f4] px-4 text-sm font-semibold text-[#355443] transition hover:bg-[#edf3eb]">
          <LocateFixed className="h-4 w-4" /> {delivery ? "Get Current Location" : "Get Location"}
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
    <div className="min-w-0 space-y-2">
      <span className="block text-xs font-semibold text-[#34443b]">{label}</span>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              name={name}
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
              placeholder={placeholder}
              className={fieldStyles}
            />
            {items.length > 1 && (
              <button type="button" onClick={() => removeItem(index)} aria-label={`Remove ${label.toLowerCase()} ${index + 1}`} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#ead8d3] text-[#a13e30] hover:bg-[#fff4f1]">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setItems((current) => [...current, ""])} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#cfdacf] bg-[#f5f8f4] px-3 text-xs font-semibold text-[#355443] transition hover:bg-[#edf3eb]">
        <Plus className="h-4 w-4" /> Add {label.toLowerCase().replace(/s$/, "")}
      </button>
    </div>
  );
};

const uniqueFieldNames = [
  'phone_number',
  'email',
  'account_number',
  'ifsc_code',
  'upi_id',
  'aadhaar_number',
  'pan_number',
  'pan_card_number',
  'vehicle_number',
  'driving_license_number',
];

const validateFormat = (name, value, employeeType) => {
  const trimmed = String(value || '').trim();

  // If empty and not required:
  if (!trimmed) {
    if (['full_name', 'phone_number', 'email', 'address', 'area_locality', 'city', 'district', 'state', 'pincode'].includes(name)) {
      return `${name.replace(/_/g, ' ')} is required`;
    }
    if (employeeType === 'Chef' && name === 'cuisine_type') {
      return 'Cuisine type is required for Chef';
    }
    if (employeeType === 'Delivery Partner' && ['vehicle_type', 'vehicle_number', 'driving_license_number'].includes(name)) {
      return `${name.replace(/_/g, ' ')} is required for Delivery Partner`;
    }
    return '';
  }

  switch (name) {
    case 'phone_number': {
      const cleanPhone = trimmed.replace(/^\+91/, '').replace(/[\s\-()]/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        return 'Phone number must be a 10-digit number starting with 6, 7, 8, or 9';
      }
      return '';
    }
    case 'whatsapp_number': {
      const cleanPhone = trimmed.replace(/^\+91/, '').replace(/[\s\-()]/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        return 'WhatsApp number must be a 10-digit number starting with 6, 7, 8, or 9';
      }
      return '';
    }
    case 'email': {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(trimmed)) {
        return 'Please enter a valid email address (e.g. employee@restaurant.com)';
      }
      return '';
    }
    case 'account_number': {
      const cleanAcc = trimmed.replace(/[\s\-]/g, '');
      if (!/^\d{9,18}$/.test(cleanAcc)) {
        return 'Account number must be 9 to 18 digits (e.g. 123456789012)';
      }
      return '';
    }
    case 'ifsc_code': {
      const cleanIfsc = trimmed.toUpperCase().replace(/\s/g, '');
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
        return 'IFSC code must be 11 characters (e.g. SBIN0001234: 4 letters, 0, then 6 alphanumeric characters)';
      }
      return '';
    }
    case 'upi_id': {
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
      if (!upiRegex.test(trimmed)) {
        return 'UPI ID must be a valid format (e.g. employee@okaxis or 9876543210@upi)';
      }
      return '';
    }
    case 'aadhaar_number': {
      const cleanAadhaar = trimmed.replace(/[\s\-]/g, '');
      if (!/^\d{12}$/.test(cleanAadhaar)) {
        return 'Aadhaar number must be a 12-digit number (e.g. 1234 5678 9012)';
      }
      return '';
    }
    case 'pan_number':
    case 'pan_card_number': {
      const cleanPan = trimmed.replace(/[\s\-]/g, '').toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
        return 'PAN number must be 10 characters: 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F)';
      }
      return '';
    }
    case 'vehicle_number': {
      const cleanVeh = trimmed.replace(/[\s\-]/g, '').toUpperCase();
      if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/.test(cleanVeh)) {
        return 'Vehicle number must match registration format (e.g. TN01AB1234 or TN 01 AB 1234)';
      }
      return '';
    }
    case 'driving_license_number': {
      const cleanDl = trimmed.replace(/[\s\-]/g, '').toUpperCase();
      if (!/^[A-Z]{2}[0-9]{2}[0-9A-Z]{7,12}$/.test(cleanDl)) {
        return 'Driving license must match standard format (e.g. TN0120200001234: 11-16 characters)';
      }
      return '';
    }
    case 'pincode': {
      const cleanPin = trimmed.replace(/[\s\-]/g, '');
      if (!/^\d{6}$/.test(cleanPin)) {
        return 'Pincode must be 6 digits (e.g. 600001)';
      }
      return '';
    }
    default:
      return '';
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

  return (
    <>
      <Section icon={UserRound} title="Personal details" description="Identity, contact and account access">
        <Field
          label={isChef ? "Chef Name" : "Full Name"}
          name="full_name"
          required
          placeholder="e.g. John Doe"
          error={fieldErrors.full_name}
          onChange={handleFieldChange}
          onBlur={(e) => handleFieldBlur('full_name', e.target.value)}
        />
        <UploadField label="Profile Photo" initialData={initialData} />
        <Field label="Gender" options={["Female", "Male", "Non-binary", "Prefer not to say"]} />
        <Field label="Date of Birth" type="date" />
        <Field
          label="Phone Number"
          type="tel"
          required
          placeholder="e.g. 9876543210 (10 digits starting with 6, 7, 8, 9)"
          helperText="10-digit number starting with 6, 7, 8, or 9"
          error={fieldErrors.phone_number}
          onChange={handleFieldChange}
          onBlur={(e) => handleFieldBlur('phone_number', e.target.value)}
        />
        {isDelivery && (
          <Field
            label="WhatsApp Number"
            type="tel"
            placeholder="e.g. 9876543210 (10 digits starting with 6, 7, 8, 9)"
            helperText="10-digit number starting with 6, 7, 8, or 9"
            error={fieldErrors.whatsapp_number}
            onChange={handleFieldChange}
            onBlur={(e) => handleFieldBlur('whatsapp_number', e.target.value)}
          />
        )}
        <Field
          label="Email"
          type="email"
          required
          placeholder="e.g. employee@restaurant.com"
          error={fieldErrors.email}
          onChange={handleFieldChange}
          onBlur={(e) => handleFieldBlur('email', e.target.value)}
        />
        <label className="block min-w-0 space-y-2">
          <span className="block text-xs font-semibold text-[#34443b]">{isChef ? "Chef ID / Employee ID" : isDelivery ? "Delivery Boy ID / Employee ID" : "Employee ID"}</span>
          <input readOnly value={employeeId} placeholder="Generated automatically on save" className={`${fieldStyles} bg-[#f2f5f1] text-[#66746a]`} />
        </label>
        <Field label="Status" options={["Active", "Inactive"]} />
        <Field label="Password" type="password" name="password" required={!isEditing} error={fieldErrors.password} onChange={handleFieldChange} />
        <Field label="Confirm Password" type="password" name="confirm_password" required={!isEditing} error={fieldErrors.confirm_password} onChange={handleFieldChange} />
      </Section>

      {isChef && (
        <Section icon={Utensils} title="Restaurant details" description="Cuisine, experience and food specialties">
          <Field label="Cuisine Type" required options={["South Indian", "North Indian", "Chinese", "Bakery", "Italian", "Continental", "Other"]} error={fieldErrors.cuisine_type} onChange={handleFieldChange} />
          <Field label="Experience (Years)" type="number" placeholder="e.g. 5" />
          <Field label="Food Preference" options={["Veg", "Non-Veg", "Both"]} />
          <StringListField name="special_dishes" label="Special Dishes" initialValue={initialData?.special_dishes} placeholder="e.g. signature biryani" />
          <Field label="Description / About Chef" type="textarea" wide placeholder="Brief background or achievements" />
        </Section>
      )}

      <LocationFields
        showCoordinates={isChef || isDelivery}
        delivery={isDelivery}
        fieldErrors={fieldErrors}
        handleFieldChange={handleFieldChange}
        handleFieldBlur={handleFieldBlur}
      />

      {isDelivery && (
        <Section icon={Bike} title="Vehicle details" description="Vehicle and driving licence information">
          <Field label="Vehicle Type" required options={["Bike", "Scooter", "Bicycle", "Electric Vehicle"]} error={fieldErrors.vehicle_type} onChange={handleFieldChange} />
          <Field
            label="Vehicle Number"
            required
            uppercase
            placeholder="e.g. TN01AB1234 (e.g. TN 01 AB 1234)"
            helperText="State, District, Series, 4-digit number"
            error={fieldErrors.vehicle_number}
            onChange={handleFieldChange}
            onBlur={(e) => handleFieldBlur('vehicle_number', e.target.value)}
          />
          <Field label="Vehicle Model" placeholder="e.g. Honda Activa 6G" />
          <Field
            label="Driving License Number"
            required
            uppercase
            placeholder="e.g. TN0120200001234 (15 or 16 characters)"
            helperText="Standard DL format (e.g. TN0120200001234)"
            error={fieldErrors.driving_license_number}
            onChange={handleFieldChange}
            onBlur={(e) => handleFieldBlur('driving_license_number', e.target.value)}
          />
          <Field label="Driving License Expiry Date" type="date" />
          <Field label="RC Number" uppercase placeholder="e.g. TN01AB1234" />
          <UploadField label="RC Document Upload" initialData={initialData} />
          <UploadField label="Driving License Upload" initialData={initialData} />
          <UploadField label="Vehicle Photo" initialData={initialData} />
        </Section>
      )}

      {isDelivery && (
        <Section icon={Clock3} title="Availability" description="Working schedule and delivery status">
          <div className="md:col-span-2 lg:col-span-3">
            <span className="block text-xs font-semibold text-[#34443b]">Working Days</span>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                  <label key={day} className="inline-flex items-center gap-2 text-xs text-[#536259]"><input type="checkbox" name="working_days" value={day} className="h-4 w-4 accent-[#42694f]" />{day}</label>
              ))}
            </div>
          </div>
          <Field label="Start Time" type="time" />
          <Field label="End Time" type="time" />
          <Field label="Available for Delivery" options={["Yes", "No"]} />
          <Field label="Current Status" options={["Available", "Busy", "Offline"]} />
        </Section>
      )}

      {(isChef || isBasic) && (
        <Section icon={CreditCard} title="Bank & payment details" description="Payment destination and identity details">
          <Field label="Account Holder Name" placeholder="e.g. John Doe" />
          <Field label="Bank Name" placeholder="e.g. State Bank of India" />
          <Field
            label="Account Number"
            placeholder="e.g. 123456789012 (9 to 18 digits)"
            helperText="9 to 18 digits bank account number"
            error={fieldErrors.account_number}
            onChange={handleFieldChange}
            onBlur={(e) => handleFieldBlur('account_number', e.target.value)}
          />
          <Field
            label="IFSC Code"
            uppercase
            placeholder="e.g. SBIN0001234 (11 characters)"
            helperText="11 characters: 4 letters, 0, 6 letters/digits"
            error={fieldErrors.ifsc_code}
            onChange={handleFieldChange}
            onBlur={(e) => handleFieldBlur('ifsc_code', e.target.value)}
          />
          <Field
            label="UPI ID"
            placeholder="e.g. employee@okaxis or 9876543210@upi"
            helperText="Virtual payment address"
            error={fieldErrors.upi_id}
            onChange={handleFieldChange}
            onBlur={(e) => handleFieldBlur('upi_id', e.target.value)}
          />
          {(isChef || isBasic) && (
            <Field
              label="PAN Number"
              uppercase
              value={panValue}
              placeholder="e.g. ABCDE1234F (10 characters: 5 letters, 4 numbers, 1 letter)"
              helperText="10 characters: 5 letters, 4 numbers, 1 letter"
              error={fieldErrors.pan_number || fieldErrors.pan_card_number}
              onChange={(e) => handlePanChange(e.target.value)}
              onBlur={(e) => handleFieldBlur('pan_number', e.target.value)}
            />
          )}
          <UploadField label="Bank Passbook" initialData={initialData} />
        </Section>
      )}

      {isDelivery && (
        <Section icon={CreditCard} title="Bank & payment details" description="Payment destination">
          <Field label="Account Holder Name" placeholder="e.g. John Doe" />
          <Field label="Bank Name" placeholder="e.g. State Bank of India" />
          <Field
            label="Account Number"
            placeholder="e.g. 123456789012 (9 to 18 digits)"
            helperText="9 to 18 digits bank account number"
            error={fieldErrors.account_number}
            onChange={handleFieldChange}
            onBlur={(e) => handleFieldBlur('account_number', e.target.value)}
          />
          <Field
            label="IFSC Code"
            uppercase
            placeholder="e.g. SBIN0001234 (11 characters)"
            helperText="11 characters: 4 letters, 0, 6 letters/digits"
            error={fieldErrors.ifsc_code}
            onChange={handleFieldChange}
            onBlur={(e) => handleFieldBlur('ifsc_code', e.target.value)}
          />
          <Field
            label="UPI ID"
            placeholder="e.g. employee@okaxis or 9876543210@upi"
            helperText="Virtual payment address"
            error={fieldErrors.upi_id}
            onChange={handleFieldChange}
            onBlur={(e) => handleFieldBlur('upi_id', e.target.value)}
          />
          <UploadField label="Cancelled Cheque / Bank Proof" initialData={initialData} />
        </Section>
      )}

      <Section icon={Banknote} title="Salary details" description="Compensation and payroll information">
        {isDelivery && (
          <label htmlFor="delivery-salary-type" className="block min-w-0 space-y-2 md:col-span-2 lg:col-span-3">
            <span className="block text-xs font-semibold text-[#34443b]">Salary Type</span>
            <div className="relative">
              <select
                id="delivery-salary-type"
                name="salary_type"
                value={deliverySalaryType}
                onChange={(event) => setDeliverySalaryType(event.target.value)}
                className={`${fieldStyles} appearance-none pr-9`}
              >
                <option value="Monthly Basis">Monthly Basis</option>
                <option value="Order Basis">Order Basis</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#75847a]" />
            </div>
          </label>
        )}
        {(!isDelivery || deliverySalaryType === "Monthly Basis") && (
          <>
            <Field label="Basic Salary" type="number" placeholder="Enter basic salary" required error={fieldErrors.basic_salary} onChange={handleFieldChange} />
            <Field label="Allowances" type="number" placeholder="Enter allowances" />
            <Field label="Deductions" type="number" placeholder="Enter deductions" />
            <Field label="Net Salary" type="number" placeholder="Enter net salary" />
            <Field label="Payroll Notes" type="textarea" wide />
          </>
        )}
      </Section>

      <Section icon={FileCheck2} title="Documents" description="Identity and supporting documents">
        <Field
          label="Aadhaar Number"
          placeholder="e.g. 1234 5678 9012 (12 digits)"
          helperText="12-digit Aadhaar number"
          error={fieldErrors.aadhaar_number}
          onChange={handleFieldChange}
          onBlur={(e) => handleFieldBlur('aadhaar_number', e.target.value)}
        />
        <UploadField label="Aadhaar / ID Proof" initialData={initialData} />
        <Field
          label="PAN Card Number"
          uppercase
          value={panValue}
          placeholder="e.g. ABCDE1234F (10 characters: 5 letters, 4 numbers, 1 letter)"
          helperText="10 characters: 5 letters, 4 numbers, 1 letter"
          error={fieldErrors.pan_card_number || fieldErrors.pan_number}
          onChange={(e) => handlePanChange(e.target.value)}
          onBlur={(e) => handleFieldBlur('pan_card_number', e.target.value)}
        />
        <UploadField label="PAN Card" initialData={initialData} />
        {isChef && <UploadField label="FSSAI Certificate" initialData={initialData} />}
        {isDelivery && <UploadField label="Driving License" initialData={initialData} />}
        {isDelivery && <UploadField label="RC Book" initialData={initialData} />}
        {isDelivery && <UploadField label="Insurance Certificate" initialData={initialData} />}
        <UploadField label="Address Proof" initialData={initialData} />
        {isChef && <UploadField label="Chef Photo" initialData={initialData} />}
        {isDelivery && <UploadField label="Profile Photo" initialData={initialData} />}
        <UploadField label="Other Documents" initialData={initialData} />
      </Section>

      {isDelivery && (
        <>
          <Section icon={ShieldCheck} title="Admin / verification" description="Review and onboarding details">
            <Field label="Verification Status" options={["Pending", "Verified", "Rejected"]} />
            <Field label="Background Verification" options={["Pending", "In Progress", "Cleared", "Rejected"]} />
            <Field label="Joining Date" type="date" />
            <Field label="Commission %" type="number" />
            <Field label="Admin Notes" type="textarea" wide />
          </Section>
          <Section icon={BriefcaseBusiness} title="Login / app access" description="Partner account access">
            <Field label="Username / Phone Number" />
            <Field label="App Access" options={["Enabled", "Disabled"]} />
            <Field label="Login Status" options={["Logged In", "Logged Out"]} />
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
    (type) => type.toLowerCase().replaceAll(" ", "-") === routeEmployeeType,
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

  useEffect(() => {
    if (!isEditing) return undefined;

    let isMounted = true;
    api.get(`/employees/${encodeURIComponent(routeEmployeeId)}`)
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
        if (isMounted) setLoadError(requestError.response?.data?.message || "Employee details could not be loaded.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingEmployee(false);
      });

    return () => { isMounted = false; };
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
      const value = field.name === "description_about_chef"
        ? employeeData.description
        : employeeData[field.name];
      if (value === null || value === undefined) return;
      const stringValue = String(value);
      field.value = field.type === "date"
        ? stringValue.slice(0, 10)
        : field.type === "time" ? stringValue.slice(0, 5) : stringValue;
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
      if (["full_name", "phone_number", "email", "address", "area_locality", "city", "district", "state", "pincode"].includes(name)) {
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
      if (typeof val === 'string' && key !== 'employee_type') {
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
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      const errorMsg = respData?.message || `Employee could not be ${isEditing ? "updated" : "created"}. Please try again.`;
      setSubmitError(errorMsg);
      if (respData?.field) {
        setFieldErrors((prev) => ({ ...prev, [respData.field]: errorMsg }));
        const el = formRef.current?.querySelector(`[name="${respData.field}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus?.();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
    <main className="mx-auto w-full max-w-6xl px-1 pb-10 pt-2 sm:px-3 sm:pt-4">
      <input type="hidden" name="employee_type" value={employeeType} />
      <div className="mb-6 flex flex-col gap-4 border-b border-[#dfe5df] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/admin/employees" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#64736a] transition hover:text-[#355443]"><ArrowLeft className="h-3.5 w-3.5" /> All Employees</Link>
          <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#9a7442]">People & access</p>
          <h1 className="mt-1 text-2xl font-bold text-[#203129]">{isEditing ? "Edit employee" : "Add employee"}</h1>
          <p className="mt-1 text-sm text-[#758179]">{isEditing ? "Update this employee's details and account access." : "Review employee information fields before setting up the workflow."}</p>
        </div>
        <div className="w-full sm:w-64">
          <label htmlFor="employee-type" className="mb-2 block text-xs font-semibold text-[#34443b]">Employee type <span className="text-[#c16b3a">*</span></label>
          <div className="relative">
            <select
              id="employee-type"
              value={employeeType}
              disabled={isEditing}
              onChange={(event) => {
                setTypeChoice({ routeEmployeeType, value: event.target.value });
                setCreatedEmployeeId("");
                setFieldErrors({});
                setSubmitError("");
              }}
              className={`${fieldStyles} appearance-none pr-9 font-semibold disabled:cursor-not-allowed disabled:opacity-70`}
            >
              {employeeTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#75847a]" />
          </div>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-3 rounded-lg border border-[#dce6db] bg-[#f5f8f3] px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#42694f]"><UserPlus className="h-[18px] w-[18px]" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#294333]">{employeeType} profile</p>
          <p className="mt-0.5 text-xs text-[#748177]">Fields marked with <span className="font-bold text-[#c16b3a">*</span> are required.</p>
        </div>
      </div>

      {(loadError || submitError) && <p role="alert" className="mb-4 rounded-lg border border-[#edc7c1] bg-[#fff4f1] px-4 py-3 text-sm text-[#a13e30]">{loadError || submitError}</p>}
      {createdEmployeeId && <p role="status" className="mb-4 rounded-lg border border-[#cfe2d1] bg-[#f2f8f2] px-4 py-3 text-sm font-semibold text-[#315a3c]">Employee created successfully. Employee ID: {createdEmployeeId}</p>}

      {isLoadingEmployee ? (
        <p className="rounded-xl border border-[#e1e7e1] bg-white px-5 py-12 text-center text-sm text-[#849087]">Loading employee details...</p>
      ) : !isEditing || employeeData ? (
        <div className="space-y-4">
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

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#dfe5df] pt-5 sm:flex-row sm:justify-end">
        <Link to="/admin/employees" className="inline-flex h-11 items-center justify-center rounded-lg border border-[#d5ddd5] bg-white px-5 text-sm font-semibold text-[#56645a] transition hover:bg-[#f7f8f6]">Cancel</Link>
        <button type="submit" disabled={isSubmitting || isLoadingEmployee || Boolean(loadError)} aria-busy={isSubmitting} className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#244b36] px-5 text-sm font-semibold text-white transition hover:bg-[#1b3d2b] disabled:opacity-60">{isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {isSubmitting ? (isEditing ? "Saving changes..." : "Adding employee...") : (isEditing ? "Save changes" : "Save employee")}</button>
      </div>

      {newlyCreatedServer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1f3228] text-[#d4a843] shadow-md">
              <UtensilsCrossed className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 font-serif">Server Added Successfully!</h3>
            <p className="mt-2 text-sm text-gray-600">
              <strong>{newlyCreatedServer.full_name}</strong> has been registered. You can assign dining tables to this server now.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  navigate("/admin/servers", { state: { assignServer: newlyCreatedServer } });
                }}
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-sm font-semibold text-white shadow-md transition hover:bg-[#234e46]"
              >
                <UtensilsCrossed className="h-4 w-4 text-[#d4a843]" />
                <span>Assign Tables Now</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate("/admin/servers");
                }}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
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