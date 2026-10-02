import { useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Bike,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Clock3,
  CreditCard,
  FileCheck2,
  LocateFixed,
  MapPin,
  ShieldCheck,
  Upload,
  UserPlus,
  UserRound,
  Utensils,
} from "lucide-react";
import { Link } from "react-router-dom";

const employeeTypes = ["Chef", "Delivery Partner", "Server", "Cashier", "Manager", "Cleaner"];

const fieldStyles =
  "h-11 w-full rounded-lg border border-[#dce3dd] bg-[#fbfcfa] px-3.5 text-sm text-[#20312a] outline-none transition placeholder:text-[#9aa59d] focus:border-[#4d765c] focus:ring-2 focus:ring-[#4d765c]/10";

const Field = ({ label, required = false, type = "text", options, placeholder, wide = false }) => (
  <label className={`block min-w-0 space-y-2 ${wide ? "md:col-span-2" : ""}`}>
    <span className="block text-xs font-semibold text-[#34443b]">
      {label}{required && <span className="ml-1 text-[#c16b3a]">*</span>}
    </span>
    {options ? (
      <div className="relative">
        <select className={`${fieldStyles} appearance-none pr-9`} defaultValue="">
          <option value="" disabled>Select {label.toLowerCase()}</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#75847a]" />
      </div>
    ) : type === "file" ? (
      <input type="file" className={`${fieldStyles} cursor-pointer py-2 text-xs file:mr-3 file:rounded-md file:border-0 file:bg-[#edf2ed] file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-[#355443]`} />
    ) : type === "textarea" ? (
      <textarea rows={3} placeholder={placeholder || `Enter ${label.toLowerCase()}`} className={`${fieldStyles} h-auto min-h-24 resize-y py-3`} />
    ) : (
      <input type={type} placeholder={placeholder || `Enter ${label.toLowerCase()}`} className={fieldStyles} />
    )}
  </label>
);

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

const UploadField = ({ label }) => (
  <Field label={label} type="file" />
);

const LocationFields = ({ showCoordinates, delivery }) => (
  <Section icon={MapPin} title="Location details" description="Primary address and service location">
    <Field label="Address" required wide />
    <Field label="Area / Locality" required />
    <Field label="City" required />
    <Field label="District" required />
    <Field label="State" required />
    <Field label="Pincode" required />
    {showCoordinates && <Field label="Latitude" placeholder="Optional" />}
    {showCoordinates && <Field label="Longitude" placeholder="Optional" />}
    {showCoordinates && (
      <div className="flex items-end">
        <button type="button" className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#cfdacf] bg-[#f5f8f4] px-4 text-sm font-semibold text-[#355443] transition hover:bg-[#edf3eb]">
          <LocateFixed className="h-4 w-4" /> {delivery ? "Get Current Location" : "Get Location"}
        </button>
      </div>
    )}
  </Section>
);

const EmployeeFields = ({ employeeType }) => {
  const isChef = employeeType === "Chef";
  const isDelivery = employeeType === "Delivery Partner";
  const isBasic = !isChef && !isDelivery;
  const [deliverySalaryType, setDeliverySalaryType] = useState("Monthly Basis");

  return (
    <>
      <Section icon={UserRound} title="Personal details" description="Identity, contact and account access">
        <Field label={isChef ? "Chef Name" : "Full Name"} required />
        <UploadField label="Profile Photo" />
        <Field label="Gender" options={["Female", "Male", "Non-binary", "Prefer not to say"]} />
        <Field label="Date of Birth" type="date" />
        <Field label="Phone Number" type="tel" required />
        {isDelivery && <Field label="WhatsApp Number" type="tel" />}
        <Field label="Email" type="email" />
        {!isDelivery && <Field label="Password / Create Login" type="password" />}
        <Field label={isChef ? "Chef ID / Employee ID" : isDelivery ? "Delivery Boy ID / Employee ID" : "Employee ID"} />
        <Field label="Status" options={["Active", "Inactive"]} />
      </Section>

      {isChef && (
        <Section icon={Utensils} title="Restaurant details" description="Cuisine, experience and food specialties">
          <Field label="Cuisine Type" required options={["South Indian", "North Indian", "Chinese", "Bakery", "Italian", "Continental", "Other"]} />
          <Field label="Specialization" />
          <Field label="Experience (Years)" type="number" />
          <Field label="Food Preference" options={["Veg", "Non-Veg", "Both"]} />
          <Field label="Special Dishes" placeholder="e.g. signature biryani, dosa" />
          <Field label="Description / About Chef" type="textarea" wide />
        </Section>
      )}

      <LocationFields showCoordinates={isChef || isDelivery} delivery={isDelivery} />

      {isDelivery && (
        <Section icon={Bike} title="Vehicle details" description="Vehicle and driving licence information">
          <Field label="Vehicle Type" required options={["Bike", "Scooter", "Bicycle", "Electric Vehicle"]} />
          <Field label="Vehicle Number" required />
          <Field label="Vehicle Model" />
          <Field label="Driving License Number" required />
          <Field label="Driving License Expiry Date" type="date" />
          <Field label="RC Number" />
          <UploadField label="RC Document Upload" />
          <UploadField label="Driving License Upload" />
          <UploadField label="Vehicle Photo" />
        </Section>
      )}

      {isDelivery && (
        <Section icon={Clock3} title="Availability" description="Working schedule and delivery status">
          <div className="md:col-span-2 lg:col-span-3">
            <span className="block text-xs font-semibold text-[#34443b]">Working Days</span>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                <label key={day} className="inline-flex items-center gap-2 text-xs text-[#536259]"><input type="checkbox" className="h-4 w-4 accent-[#42694f]" />{day}</label>
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
          <Field label="Account Holder Name" />
          <Field label="Bank Name" />
          <Field label="Account Number" />
          <Field label="IFSC Code" />
          <Field label="UPI ID" />
          {(isChef || isBasic) && <Field label="PAN Number" />}
          <UploadField label="Cancelled Cheque / Bank Proof Upload" />
        </Section>
      )}

      {isDelivery && (
        <Section icon={CreditCard} title="Bank & payment details" description="Payment destination">
          <Field label="Account Holder Name" />
          <Field label="Bank Name" />
          <Field label="Account Number" />
          <Field label="IFSC Code" />
          <Field label="UPI ID" />
          <UploadField label="Cancelled Cheque / Bank Proof" />
        </Section>
      )}

      <Section icon={Banknote} title="Salary details" description="Compensation and payroll information">
        {isDelivery && (
          <label htmlFor="delivery-salary-type" className="block min-w-0 space-y-2 md:col-span-2 lg:col-span-3">
            <span className="block text-xs font-semibold text-[#34443b]">Salary Type</span>
            <div className="relative">
              <select
                id="delivery-salary-type"
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
            <Field label="Basic Salary" type="number" placeholder="Enter basic salary" required />
            <Field label="Allowances" type="number" placeholder="Enter allowances" />
            <Field label="Deductions" type="number" placeholder="Enter deductions" />
            <Field label="Net Salary" type="number" placeholder="Enter net salary" />
            <Field label="Payroll Notes" type="textarea" wide />
          </>
        )}
      </Section>

      <Section icon={FileCheck2} title="Documents" description="Identity and supporting documents">
        <UploadField label="Aadhaar / ID Proof" />
        {(isChef || isBasic || isDelivery) && <UploadField label="PAN Card" />}
        {isChef && <UploadField label="FSSAI Certificate" />}
        {isDelivery && <UploadField label="Driving License" />}
        {isDelivery && <UploadField label="RC Book" />}
        {isDelivery && <UploadField label="Insurance Certificate" />}
        <UploadField label="Address Proof" />
        {isChef && <UploadField label="Chef Photo" />}
        {isDelivery && <UploadField label="Profile Photo" />}
        <UploadField label="Other Documents" />
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
            <Field label="Password" type="password" />
            <Field label="App Access" options={["Enabled", "Disabled"]} />
            <Field label="Login Status" options={["Logged In", "Logged Out"]} />
          </Section>
        </>
      )}
    </>
  );
};

const AddEmployee = () => {
  const [employeeType, setEmployeeType] = useState("Chef");

  return (
    <main className="mx-auto w-full max-w-6xl px-1 pb-10 pt-2 sm:px-3 sm:pt-4">
      <div className="mb-6 flex flex-col gap-4 border-b border-[#dfe5df] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/admin" className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#64736a] transition hover:text-[#355443]"><ArrowLeft className="h-3.5 w-3.5" /> Admin dashboard</Link>
          <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#9a7442]">People & access</p>
          <h1 className="mt-1 text-2xl font-bold text-[#203129]">Add employee</h1>
          <p className="mt-1 text-sm text-[#758179]">Review employee information fields before setting up the workflow.</p>
        </div>
        <div className="w-full sm:w-64">
          <label htmlFor="employee-type" className="mb-2 block text-xs font-semibold text-[#34443b]">Employee type <span className="text-[#c16b3a">*</span></label>
          <div className="relative">
            <select id="employee-type" value={employeeType} onChange={(event) => setEmployeeType(event.target.value)} className={`${fieldStyles} appearance-none pr-9 font-semibold`}>
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
        <span className="hidden items-center gap-1.5 rounded-full border border-[#d8e4d7] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#55715a] sm:inline-flex"><Check className="h-3.5 w-3.5" /> Draft form</span>
      </div>

      <div className="space-y-4">
        <EmployeeFields employeeType={employeeType} />
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#dfe5df] pt-5 sm:flex-row sm:justify-end">
        <Link to="/admin" className="inline-flex h-11 items-center justify-center rounded-lg border border-[#d5ddd5] bg-white px-5 text-sm font-semibold text-[#56645a] transition hover:bg-[#f7f8f6]">Cancel</Link>
        <button type="button" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#244b36] px-5 text-sm font-semibold text-white transition hover:bg-[#1b3d2b]"><Upload className="h-4 w-4" /> Save employee</button>
      </div>
    </main>
  );
};

export default AddEmployee;