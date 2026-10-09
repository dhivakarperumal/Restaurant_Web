import React, { useState, useEffect } from "react";
import Select from 'react-select';

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: '#ffffff',
    border: `1px solid ${state.isFocused
      ? '#d4a843'
      : '#e7e0d8'
      }`,
    boxShadow: 'none',
    outline: 'none',
    minHeight: '42px',
    height: '42px',
    borderRadius: '12px',

    '&:hover': {
      border: '1px solid #d4a843',
    },
  }),

  valueContainer: (provided) => ({
    ...provided,
    padding: '0 12px',
    fontSize: '13px',
  }),

  singleValue: (provided) => ({
    ...provided,
    color: '#1f3228',
    fontSize: '13px',
  }),

  placeholder: (provided) => ({
    ...provided,
    color: '#748078',
    fontSize: '13px',
  }),

  input: (provided) => ({
    ...provided,
    color: '#1f3228',
    fontSize: '13px',
    margin: 0,
    padding: 0,
  }),

  menu: (provided) => ({
    ...provided,
    background: '#ffffff',
    border: '1px solid #e7e0d8',
    borderRadius: '12px',
    overflow: 'hidden',
    zIndex: 99999,
  }),

  menuPortal: (provided) => ({
    ...provided,
    zIndex: 99999,
  }),

  menuList: (provided) => ({
    ...provided,
    padding: 0,
    fontSize: '13px',
  }),

  option: (provided, state) => ({
    ...provided,
    fontSize: '13px',      // dropdown font size
    padding: '8px 14px',   // reduce option height
    backgroundColor: state.isSelected
      ? '#1f3228'
      : state.isFocused
        ? 'rgba(212,168,67,.16)'
        : '#ffffff',
    color: state.isSelected ? '#ffffff' : '#1f3228',
    cursor: 'pointer',
    ':active': {
      backgroundColor: '#1f3228',
    },
  }),

  indicatorSeparator: () => ({
    display: 'none',
  }),

  dropdownIndicator: (provided) => ({
    ...provided,
    color: '#748078',
    padding: '6px',
  }),
};
import { toast, Toaster } from "react-hot-toast";
import { Receipt, DollarSign, PlusCircle, CheckCircle2, AlertCircle, Loader2, X, Download, Edit2, Trash2 } from "lucide-react";
import api, { BACKEND_BASE_URL } from "../../api";
import ModalPortal from "../../CommonComponents/ModalPortal";

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#e7e0d8] bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-[#1f3228]">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#e7e0d8] bg-[#f8f7f4] p-2 text-[#44534a] hover:bg-[#f2f3f0] hover:text-[#1f3228] transition"
            >
              <X size={20} />
            </button>
          </div>
          {children}
        </div>
      </div>
    </ModalPortal>
  );
}

const ExpensesPage = () => {
  const [fund, setFund] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [showFundForm, setShowFundForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    expenseType: "",
    paymentMethod: "",
    datePreset: "all",
    dateFrom: "",
    dateTo: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Add Form states
  const [fundAmount, setFundAmount] = useState("");
  const [expenseData, setExpenseData] = useState({
    expense_type: "",
    date_of_payment: "",
    amount: "",
    payment_type: "",
    paid_to: "",
    description: "",
    invoice_number: "",
  });
  const [customExpenseType, setCustomExpenseType] = useState("");
  const [billFile, setBillFile] = useState(null);

  // Edit Form states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editExpenseData, setEditExpenseData] = useState({
    expense_type: "",
    date_of_payment: "",
    amount: "",
    payment_type: "",
    paid_to: "",
    description: "",
    invoice_number: "",
  });
  const [editCustomExpenseType, setEditCustomExpenseType] = useState("");
  const [editBillFile, setEditBillFile] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFund = async () => {
    try {
      const { data } = await api.get("/fund");
      if (data.success) {
        setFund(data.available_fund);
      }
    } catch (error) {
      console.error("Error fetching fund", error);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/expenses");
      if (data.success) {
        setExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error("Error fetching expenses", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data } = await api.get("/employees");
      if (data?.data) {
        setEmployees(data.data);
      }
    } catch (error) {
      console.error("Error fetching employees", error);
    }
  };

  useEffect(() => {
    fetchFund();
    fetchExpenses();
    fetchEmployees();
  }, []);

  const handleUpdateFund = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/fund", { available_fund: parseFloat(fundAmount) });
      if (data.success) {
        toast.success("Fund updated successfully", {
          style: { background: '#10b981', color: '#fff' },
        });
        setFund(data.available_fund);
        setShowFundForm(false);
        setFundAmount("");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error updating fund", {
        style: { background: '#ef4444', color: '#fff' },
      });
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();

    const finalExpenseType = expenseData.expense_type === "Other"
      ? customExpenseType.trim()
      : expenseData.expense_type;

    if (!finalExpenseType) {
      toast.error("Please enter an expense type", {
        style: { background: '#ef4444', color: '#fff' },
      });
      return;
    }

    if (!expenseData.payment_type || !expenseData.payment_type.trim()) {
      toast.error("Please select a payment mode", {
        style: { background: '#ef4444', color: '#fff' },
      });
      return;
    }

    const formData = new FormData();
    formData.append("expense_type", finalExpenseType);
    formData.append("date_of_payment", expenseData.date_of_payment);
    formData.append("amount", expenseData.amount);
    formData.append("payment_type", expenseData.payment_type);
    formData.append("paid_to", expenseData.paid_to);
    formData.append("description", expenseData.description);
    formData.append("invoice_number", expenseData.invoice_number);
    if (billFile) {
      formData.append("upload_bill", billFile);
    }

    try {
      const { data } = await api.post("/expenses", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (data.success) {
        toast.success("Expense added successfully", {
          style: { background: '#10b981', color: '#fff' },
        });
        setShowExpenseForm(false);
        setExpenseData({
          expense_type: "",
          date_of_payment: "",
          amount: "",
          payment_type: "",
          paid_to: "",
          description: "",
          invoice_number: "",
        });
        setCustomExpenseType("");
        setBillFile(null);
        fetchFund();
        fetchExpenses();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error adding expense", {
        style: { background: '#ef4444', color: '#fff' },
      });
    }
  };

  const openEditModal = (exp) => {
    const isStandardType = expenseFormTypeOptions.includes(exp.expense_type);
    setEditingExpense(exp);
    setEditExpenseData({
      expense_type: isStandardType ? exp.expense_type : "Other",
      date_of_payment: exp.date_of_payment ? new Date(exp.date_of_payment).toISOString().slice(0, 10) : "",
      amount: exp.amount || "",
      payment_type: exp.payment_type || "",
      paid_to: exp.paid_to || "",
      description: exp.description || "",
      invoice_number: exp.invoice_number || "",
    });
    setEditCustomExpenseType(isStandardType ? "" : (exp.expense_type || ""));
    setEditBillFile(null);
    setShowEditModal(true);
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    if (!editingExpense) return;

    const finalExpenseType = editExpenseData.expense_type === "Other"
      ? editCustomExpenseType.trim()
      : editExpenseData.expense_type;

    if (!finalExpenseType) {
      toast.error("Please enter an expense type");
      return;
    }

    if (!editExpenseData.payment_type || !editExpenseData.payment_type.trim()) {
      toast.error("Please select a payment mode", {
        style: { background: '#ef4444', color: '#fff' },
      });
      return;
    }

    const formData = new FormData();
    formData.append("expense_type", finalExpenseType);
    formData.append("date_of_payment", editExpenseData.date_of_payment);
    formData.append("amount", editExpenseData.amount);
    formData.append("payment_type", editExpenseData.payment_type);
    formData.append("paid_to", editExpenseData.paid_to);
    formData.append("description", editExpenseData.description);
    formData.append("invoice_number", editExpenseData.invoice_number);
    if (editBillFile) {
      formData.append("upload_bill", editBillFile);
    }

    setSavingEdit(true);
    try {
      const expenseId = editingExpense.expense_id || editingExpense.id;
      const { data } = await api.put(`/expenses/${expenseId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (data.success) {
        toast.success("Expense updated successfully", {
          style: { background: '#10b981', color: '#fff' },
        });
        setShowEditModal(false);
        setEditingExpense(null);
        setEditBillFile(null);
        fetchFund();
        fetchExpenses();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error updating expense", {
        style: { background: '#ef4444', color: '#fff' },
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const expenseId = deleteTarget.expense_id || deleteTarget.id;
      const { data } = await api.delete(`/expenses/${expenseId}`);
      if (data.success) {
        toast.success("Expense deleted successfully", {
          style: { background: '#10b981', color: '#fff' },
        });
        setDeleteTarget(null);
        fetchFund();
        fetchExpenses();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting expense", {
        style: { background: '#ef4444', color: '#fff' },
      });
    } finally {
      setDeleting(false);
    }
  };

  const expenseFormTypeOptions = [
    "Food & Ingredients",
    "Meat & Seafood",
    "Produce & Vegetables",
    "Dairy & Bakery",
    "Beverages",
    "Cooking Oil & Spices",
    "Packaging & Takeaway Supplies",
    "Kitchen Supplies",
    "Cleaning & Sanitation",
    "Kitchen Equipment",
    "Equipment Repair",
    "Kitchen Maintenance",
    "Dining Area Maintenance",
    "Restaurant Rent",
    "Kitchen Gas",
    "Electricity Bill",
    "Water Bill",
    "Internet & Phone",
    "Restaurant Supplies",
    "Staff Uniforms",
    "Staff Training",
    "Local Delivery & Transport",
    "Staff Wages",
    "Staff Meals & Welfare",
    "Delivery Platform Commission",
    "Pest Control",
    "Licenses & Permits",
    "Waste Management",
    "POS Software & Subscriptions",
    "Online Ordering & Website",
    "Marketing & Promotions",
    "Restaurant Furniture",
    "POS & Computer Equipment",
    "Taxes",
    "Insurance",
    "Miscellaneous Restaurant Expense",
    "Miscellaneous",
    "Other",
  ];
  const expenseFilterTypeOptions = [
    "Salary",
    "Staff Wages",
    "Project Payment",
    "Income",
    "Food & Ingredients",
    "Meat & Seafood",
    "Produce & Vegetables",
    "Dairy & Bakery",
    "Beverages",
    "Cooking Oil & Spices",
    "Packaging & Takeaway Supplies",
    "Kitchen Supplies",
    "Cleaning & Sanitation",
    "Kitchen Equipment",
    "Equipment Repair",
    "Kitchen Maintenance",
    "Dining Area Maintenance",
    "Restaurant Rent",
    "Gas & Fuel",
    "Kitchen Gas",
    "Internet & Phone",
    "Restaurant Supplies",
    "Staff Uniforms",
    "Staff Training",
    "Local Delivery & Transport",
    "POS Software & Subscriptions",
    "Online Ordering & Website",
    "Marketing & Promotions",
    "Restaurant Furniture",
    "POS & Computer Equipment",
    "Miscellaneous Restaurant Expense",
    "Office Rent",
    "Electricity Bill",
    "Water Bill",
    "Internet Bill",
    "Phone Bill",
    "Office Maintenance",
    "Office Supplies",
    "Stationery",
    "Snacks & Tea",
    "Travel Expense",
    "Fuel Expense",
    "Software Subscription",
    "Cloud Hosting",
    "Domain & SSL",
    "Marketing",
    "Advertising",
    "Courier & Shipping",
    "Furniture",
    "Computer & Accessories",
    "Employee Welfare",
    "Staff Meals & Welfare",
    "Delivery Platform Commission",
    "Pest Control",
    "Licenses & Permits",
    "Waste Management",
    "Transportation & Delivery",
    "Training",
    "Taxes",
    "Insurance",
    "Miscellaneous",
    "Other",
  ];
  const paymentMethodOptions = ["Cash", "Bank Transfer", "Credit Card", "UPI", "Cheque"];
  const datePresetOptions = [
    { value: "all", label: "All" },
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "this_week", label: "This Week" },
    { value: "this_month", label: "This Month" },
    { value: "custom", label: "Custom Range" },
  ];
  const isOtherExpenseType = expenseData.expense_type === "Other";

  const isCreditEntry = (entry) => {
    const type = String(entry?.expense_type || "").trim().toLowerCase();
    return type === "income" || type === "project payment" || type === "internship payment";
  };

  const isEditableExpense = (entry) => {
    const type = String(entry?.expense_type || "").trim().toLowerCase();
    return (
      type !== "income" &&
      type !== "project payment" &&
      type !== "internship payment" &&
      type !== "salary" &&
      !isCreditEntry(entry)
    );
  };

  const filteredExpenses = expenses.filter((exp) => {
    if (filters.expenseType && exp.expense_type !== filters.expenseType) return false;
    if (filters.paymentMethod && exp.payment_type !== filters.paymentMethod) return false;

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const haystack = [
        exp.expense_type,
        exp.paid_to,
        exp.from_name,
        exp.payment_type,
        exp.invoice_number,
        exp.description,
        exp.amount ? String(exp.amount) : '',
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (filters.datePreset === "all") return true;

    const expenseDate = exp.date_of_payment ? new Date(exp.date_of_payment) : null;
    if (!expenseDate || isNaN(expenseDate.getTime())) return false;

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    let dateMatch = true;
    if (filters.datePreset === "today") {
      dateMatch = Boolean(expenseDate >= startOfToday && expenseDate <= endOfToday);
    } else if (filters.datePreset === "yesterday") {
      const yesterday = new Date(startOfToday);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayEnd = new Date(startOfToday);
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
      yesterdayEnd.setHours(23, 59, 59, 999);
      dateMatch = Boolean(expenseDate >= yesterday && expenseDate <= yesterdayEnd);
    } else if (filters.datePreset === "this_week") {
      const weekStart = new Date(startOfToday);
      weekStart.setDate(startOfToday.getDate() - startOfToday.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      dateMatch = Boolean(expenseDate >= weekStart && expenseDate <= weekEnd);
    } else if (filters.datePreset === "this_month") {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      dateMatch = Boolean(expenseDate >= monthStart && expenseDate <= monthEnd);
    } else if (filters.datePreset === "custom") {
      const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
      if (fromDate) fromDate.setHours(0, 0, 0, 0);
      if (toDate) toDate.setHours(23, 59, 59, 999);
      if (fromDate && expenseDate < fromDate) dateMatch = false;
      if (toDate && expenseDate > toDate) dateMatch = false;
    }

    return dateMatch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / itemsPerPage));
  const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  React.useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, expenses.length]);

  const filteredSpendEntries = filteredExpenses.filter((exp) => !isCreditEntry(exp));
  const totalSpent = filteredSpendEntries.reduce((acc, exp) => acc + parseFloat(exp.amount || 0), 0);
  const categoryBreakdown = Object.entries(
    filteredSpendEntries.reduce((acc, exp) => {
      const key = exp.expense_type || "Miscellaneous";
      acc[key] = (acc[key] || 0) + parseFloat(exp.amount || 0);
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const chartColors = ["#1f3228", "#d4a843", "#66836d", "#b8873b", "#879b7e", "#a67646"];
  const pieSegments = categoryBreakdown.length > 0
    ? categoryBreakdown.map((item, index) => {
      return `${chartColors[index % chartColors.length]} ${index === 0 ? 0 : categoryBreakdown.slice(0, index).reduce((sum, entry) => sum + (entry.value / totalSpent) * 100, 0)}% ${index === categoryBreakdown.length - 1 ? 100 : categoryBreakdown.slice(0, index + 1).reduce((sum, entry) => sum + (entry.value / totalSpent) * 100, 0)}%`;
    })
    : ["#1f3228 0% 100%"];

  const monthlyTrend = Array.from({ length: 12 }, (_, index) => {
    const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][index];
    const monthValue = filteredSpendEntries.reduce((sum, exp) => {
      const expenseDate = exp.date_of_payment ? new Date(exp.date_of_payment) : null;
      if (!expenseDate) return sum;
      return expenseDate.getMonth() === index ? sum + parseFloat(exp.amount || 0) : sum;
    }, 0);
    return { monthName, monthValue };
  });

  const maxMonthlyValue = Math.max(...monthlyTrend.map((item) => item.monthValue), 1);

  return (
    <div className="-m-4 min-h-screen space-y-5 bg-[#f2f3f0] p-4 pb-10 text-[#1f3228] sm:-m-5 sm:px-5 sm:py-5 sm:pb-10 lg:-m-6 lg:px-6 lg:py-6 lg:pb-10">
      <Toaster position="top-right" />

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#1f3228]/15 flex items-center justify-center">
            <Receipt size={22} className="text-[#1f3228]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1f3228] tracking-tight">All Expenses</h1>
            <p className="text-[#748078] text-xs mt-0.5">
              Track restaurant spending, supplier payments, and operating costs
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExpenseForm(!showExpenseForm)}
            className="inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition shadow-lg shadow-[#1f3228]/20 hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#1f3228,#162420)' }}
          >
            {showExpenseForm ? <X size={15} /> : <PlusCircle size={15} />}
            {showExpenseForm ? "Cancel" : "Add Expense"}
          </button>
        </div>
      </div>

      {/* ── Stats Overview ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Available Fund",
            value: parseFloat(fund) < 0 ? `- ₹${Math.abs(parseFloat(fund)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `₹${parseFloat(fund).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            hint: "Current restaurant balance",
            icon: DollarSign,
            bg: parseFloat(fund) < 0 ? "bg-[#ef4444]" : "bg-[#22c55e]",
            isFund: true,
          },
          {
            title: "Total Spent",
            value: `₹${totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            hint: "Total outflow recorded",
            icon: Receipt,
            bg: "bg-[#3b82f6]",
          },
          {
            title: "Transactions",
            value: filteredExpenses.length,
            hint: `${expenses.length} total entries`,
            icon: CheckCircle2,
            bg: "bg-[#f59e0b]",
          },
          {
            title: "Expense Categories",
            value: categoryBreakdown.length,
            hint: "Active spending types",
            icon: AlertCircle,
            bg: "bg-[#8b5cf6]",
          },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <article
              key={stat.title}
              className={`relative min-w-0 overflow-hidden rounded-xl border border-transparent p-4 sm:p-5 shadow-[0_2px_10px_rgba(20,56,34,0.08)] flex flex-col justify-between min-h-[140px] ${stat.bg} text-white`}
            >
              <div className="flex items-start gap-3 relative z-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm bg-white/20">
                  <Icon size={24} strokeWidth={2.2} className="text-white" />
                </div>
                <div className="flex-1 mt-0.5 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-[12px] font-semibold opacity-90 truncate">{stat.title}</h3>
                    {stat.isFund && !showFundForm && (
                      <button
                        type="button"
                        onClick={() => setShowFundForm(true)}
                        className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-white/30 transition shrink-0"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <div className="text-[22px] sm:text-[24px] font-extrabold leading-tight tracking-tight mt-1 truncate">
                    {stat.value}
                  </div>
                </div>
              </div>

              {stat.isFund && showFundForm ? (
                <div className="mt-3 relative z-20">
                  <form onSubmit={handleUpdateFund} className="flex gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      className="w-full rounded-lg bg-white/20 px-2.5 py-1 text-xs text-white placeholder:text-white/60 focus:bg-white focus:text-[#1f3228] focus:outline-none"
                      placeholder="Amount"
                      required
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-[#1f3228] hover:bg-white/90 transition"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFundForm(false)}
                      className="rounded-lg bg-white/20 px-2 py-1 text-xs text-white hover:bg-white/30 transition"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-4 relative z-10">
                  <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold bg-white/25">
                    Live
                  </span>
                  <span className="text-[11px] font-medium opacity-75 truncate">{stat.hint}</span>
                </div>
              )}

              <div className="absolute right-0 bottom-0 w-24 h-16 pointer-events-none opacity-50">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                  <defs>
                    <linearGradient id={`exp-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#exp-grad-${index})`} />
                  <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                </svg>
              </div>
            </article>
          );
        })}
      </div>

      <Modal open={showExpenseForm} onClose={() => setShowExpenseForm(false)} title="Record Restaurant Expense">
        <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">Restaurant Expense Category</label>
            <Select
              options={[
                ...expenseFormTypeOptions.map(option => ({ value: option, label: option }))
              ]}
              value={expenseData.expense_type ? { value: expenseData.expense_type, label: expenseData.expense_type } : null}
              onChange={(option) => {
                const value = option ? option.value : "";
                setExpenseData((prev) => ({
                  ...prev,
                  expense_type: value,
                  paid_to: value === "Salary" || value === "Staff Wages" ? prev.paid_to : "",
                }));
                if (value !== "Other") {
                  setCustomExpenseType("");
                }
              }}
              styles={customSelectStyles}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              placeholder="Choose a category, e.g. Food & Ingredients"
              isSearchable={true}
            />
            {isOtherExpenseType && (
              <div className="mt-2">
                <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">Custom Restaurant Expense</label>
                <input
                  type="text"
                  required
                  className="w-full bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-4 py-2.5 text-sm text-[#1f3228] placeholder:text-[#929b94] focus:outline-none focus:border-[#d4a843]/50 transition"
                  placeholder="e.g. Refrigerator servicing"
                  value={customExpenseType}
                  onChange={(e) => setCustomExpenseType(e.target.value)}
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">Supplier / Paid To</label>
            <input type="text" required
              className="w-full bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-4 py-2.5 text-sm text-[#1f3228] placeholder:text-[#929b94] focus:outline-none focus:border-[#d4a843]/50 transition"
              placeholder="e.g. Fresh produce supplier or gas distributor"
              value={expenseData.paid_to} onChange={(e) => setExpenseData({ ...expenseData, paid_to: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">Business</label>
            <input type="text" disabled
              className="w-full bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-4 py-2.5 text-sm text-[#647067] placeholder:text-[#929b94] focus:outline-none focus:border-[#d4a843]/50 transition"
              value="Restaurant Operations" />
          </div>
          <div>
            <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">Payment Date</label>
            <input type="date" required
              className="w-full bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-4 py-2.5 text-sm text-[#1f3228] focus:outline-none focus:border-[#d4a843]/50 transition scheme-light"
              value={expenseData.date_of_payment} onChange={(e) => setExpenseData({ ...expenseData, date_of_payment: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">Expense Amount (₹)</label>
            <input type="number" step="0.01" required
              className="w-full bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-4 py-2.5 text-sm text-[#1f3228] placeholder:text-[#929b94] focus:outline-none focus:border-[#d4a843]/50 transition"
              placeholder="Enter amount in ₹"
              value={expenseData.amount} onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">
              Payment Method <span className="text-[#d4a843] font-bold">*</span>
            </label>
            <Select
              options={[
                { value: 'Cash', label: 'Cash' },
                { value: 'Bank Transfer', label: 'Bank Transfer' },
                { value: 'Credit Card', label: 'Credit Card' },
                { value: 'UPI', label: 'UPI' },
                { value: 'Cheque', label: 'Cheque' }
              ]}
              value={expenseData.payment_type ? { value: expenseData.payment_type, label: expenseData.payment_type } : null}
              onChange={(option) => setExpenseData({ ...expenseData, payment_type: option ? option.value : "" })}
              styles={customSelectStyles}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              placeholder="Select how the restaurant paid"
              isSearchable={false}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">Receipt / Invoice Number</label>
            <input type="text"
              className="w-full bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-4 py-2.5 text-sm text-[#1f3228] placeholder:text-[#929b94] focus:outline-none focus:border-[#d4a843]/50 transition"
              placeholder="Enter receipt or invoice number (optional)"
              value={expenseData.invoice_number} onChange={(e) => setExpenseData({ ...expenseData, invoice_number: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">Expense Notes</label>
            <textarea rows="2"
              className="w-full bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-4 py-2.5 text-sm text-[#1f3228] placeholder:text-[#929b94] focus:outline-none focus:border-[#d4a843]/50 transition"
              placeholder="Add details such as items purchased, quantity, or the reason for this expense"
              value={expenseData.description} onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}></textarea>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">Upload Supplier Bill / Receipt (Optional)</label>
            <input type="file" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
              className="w-full bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-4 py-2 text-sm text-[#56645b] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1f3228]/20 file:text-[#1f3228] hover:file:bg-[#1f3228]/30 transition cursor-pointer"
              onChange={(e) => setBillFile(e.target.files[0])} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 mt-2 border-t border-[#eee9e1] pt-5">
            <button type="button" onClick={() => setShowExpenseForm(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#f8f7f4] border border-[#e7e0d8] text-[#44534a] hover:text-[#1f3228] hover:bg-[#f2f3f0] transition">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-[#1f3228]/20 hover:opacity-90 transition"
              style={{ background: 'linear-gradient(135deg,#1f3228,#162420)' }}>
              Submit Expense
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Expense Modal ── */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Restaurant Expense">
        <form onSubmit={handleUpdateExpense} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">Restaurant Expense Category</label>
            <Select
              options={[
                ...expenseFormTypeOptions.map(option => ({ value: option, label: option }))
              ]}
              value={editExpenseData.expense_type ? { value: editExpenseData.expense_type, label: editExpenseData.expense_type } : null}
              onChange={(option) => {
                const value = option ? option.value : "";
                setEditExpenseData((prev) => ({ ...prev, expense_type: value }));
                if (value !== "Other") {
                  setEditCustomExpenseType("");
                }
              }}
              styles={customSelectStyles}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              placeholder="Choose a restaurant expense category"
              isSearchable={true}
            />
            {editExpenseData.expense_type === "Other" && (
              <div className="mt-2">
                <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">Custom Restaurant Expense</label>
                <input
                  type="text"
                  required
                  className="w-full bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-4 py-2.5 text-sm text-[#1f3228] placeholder:text-[#929b94] focus:outline-none focus:border-[#d4a843]/50 transition"
                  placeholder="e.g. Refrigerator servicing"
                  value={editCustomExpenseType}
                  onChange={(e) => setEditCustomExpenseType(e.target.value)}
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">Supplier / Paid To</label>
            <input
              type="text"
              required
              className="w-full bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-4 py-2.5 text-sm text-[#1f3228] placeholder:text-[#929b94] focus:outline-none focus:border-[#d4a843]/50 transition"
              placeholder="e.g. Fresh produce supplier or gas distributor"
              value={editExpenseData.paid_to}
              onChange={(e) => setEditExpenseData({ ...editExpenseData, paid_to: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">Business</label>
            <input
              type="text"
              disabled
              className="w-full bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-4 py-2.5 text-sm text-[#647067] placeholder:text-[#929b94] focus:outline-none focus:border-[#d4a843]/50 transition"
              value={editingExpense?.from_name || "Restaurant Operations"}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">Payment Date</label>
            <input
              type="date"
              required
              className="w-full bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-4 py-2.5 text-sm text-[#1f3228] focus:outline-none focus:border-[#d4a843]/50 transition scheme-light"
              value={editExpenseData.date_of_payment}
              onChange={(e) => setEditExpenseData({ ...editExpenseData, date_of_payment: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">Expense Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              required
              className="w-full bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-4 py-2.5 text-sm text-[#1f3228] placeholder:text-[#929b94] focus:outline-none focus:border-[#d4a843]/50 transition"
              placeholder="Enter amount in ₹"
              value={editExpenseData.amount}
              onChange={(e) => setEditExpenseData({ ...editExpenseData, amount: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">
              Payment Method <span className="text-[#d4a843] font-bold">*</span>
            </label>
            <Select
              options={[
                { value: 'Cash', label: 'Cash' },
                { value: 'Bank Transfer', label: 'Bank Transfer' },
                { value: 'Credit Card', label: 'Credit Card' },
                { value: 'UPI', label: 'UPI' },
                { value: 'Cheque', label: 'Cheque' }
              ]}
              value={editExpenseData.payment_type ? { value: editExpenseData.payment_type, label: editExpenseData.payment_type } : null}
              onChange={(option) => setEditExpenseData({ ...editExpenseData, payment_type: option ? option.value : "" })}
              styles={customSelectStyles}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              placeholder="Select how the restaurant paid"
              isSearchable={false}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">Receipt / Invoice Number</label>
            <input
              type="text"
              className="w-full bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-4 py-2.5 text-sm text-[#1f3228] placeholder:text-[#929b94] focus:outline-none focus:border-[#d4a843]/50 transition"
              placeholder="Enter receipt or invoice number (optional)"
              value={editExpenseData.invoice_number}
              onChange={(e) => setEditExpenseData({ ...editExpenseData, invoice_number: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">Expense Notes</label>
            <textarea
              rows="2"
              className="w-full bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-4 py-2.5 text-sm text-[#1f3228] placeholder:text-[#929b94] focus:outline-none focus:border-[#d4a843]/50 transition"
              placeholder="Add items purchased, quantity, or reason for this expense"
              value={editExpenseData.description}
              onChange={(e) => setEditExpenseData({ ...editExpenseData, description: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-[#748078] uppercase tracking-wider font-semibold mb-1">
              Upload Updated Supplier Bill / Receipt (Optional)
            </label>
            {editingExpense?.upload_bill && (
              <div className="flex items-center gap-2 mb-2 p-2 rounded-xl bg-[#f8f7f4] border border-[#e7e0d8] text-xs text-[#44534a]">
                <span className="text-[#748078]">Current bill:</span>
                <a
                  href={`${BACKEND_BASE_URL}/uploads/expenses/${editingExpense.upload_bill}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1f3228] hover:underline font-medium truncate max-w-xs"
                >
                  {editingExpense.upload_bill}
                </a>
              </div>
            )}
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
              className="w-full bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-4 py-2 text-sm text-[#56645b] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#1f3228]/20 file:text-[#1f3228] hover:file:bg-[#1f3228]/30 transition cursor-pointer"
              onChange={(e) => setEditBillFile(e.target.files[0])}
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 mt-2 border-t border-[#eee9e1] pt-5">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              disabled={savingEdit}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#f8f7f4] border border-[#e7e0d8] text-[#44534a] hover:text-[#1f3228] hover:bg-[#f2f3f0] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-[#1f3228]/20 hover:opacity-90 transition flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg,#1f3228,#162420)' }}
            >
              {savingEdit ? <Loader2 size={15} className="animate-spin" /> : null}
              {savingEdit ? "Updating..." : "Update Expense"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete Expense">
          <div className="space-y-4">
            <p className="text-[#44534a] text-sm">
              Are you sure you want to delete this expense of <span className="text-rose-700 font-bold">₹ {parseFloat(deleteTarget.amount || 0).toFixed(2)}</span> ({deleteTarget.expense_type})?
            </p>
            <p className="text-[#748078] text-xs">
              Deleting this expense will automatically restore the spent amount back to your Available Fund.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-[#e7e0d8]">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#f8f7f4] border border-[#e7e0d8] text-[#44534a] hover:text-[#1f3228] hover:bg-[#f2f3f0] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteExpense}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-2"
              >
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <div className="bg-white border border-[#e7e0d8] rounded-2xl p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="w-full xl:w-auto">
            <label className="block text-[10px] text-[#818a83] uppercase tracking-wider font-semibold mb-1">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search category, supplier, receipt..."
              className="w-full xl:w-64 bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-3 py-2 text-xs text-[#1f3228] placeholder:text-[#929b94] focus:outline-none focus:border-[#d4a843]/50"
            />
          </div>
          <div className="flex flex-wrap items-end justify-start gap-3 xl:justify-end">
            <div>
              <label className="block text-[10px] text-[#818a83] uppercase tracking-wider font-semibold mb-1">Restaurant Expense</label>
              <Select
                options={[
                  { value: '', label: 'All Types' },
                  ...expenseFilterTypeOptions.map(option => ({ value: option, label: option }))
                ]}
                value={{ value: filters.expenseType, label: filters.expenseType || 'All Types' }}
                onChange={(option) => setFilters((prev) => ({ ...prev, expenseType: option ? option.value : "" }))}
                styles={customSelectStyles}
                className="w-48"
                isSearchable={true}
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#818a83] uppercase tracking-wider font-semibold mb-1">Payment Method</label>
              <Select
                options={[
                  { value: '', label: 'All Methods' },
                  ...paymentMethodOptions.map(option => ({ value: option, label: option }))
                ]}
                value={{ value: filters.paymentMethod, label: filters.paymentMethod || 'All Methods' }}
                onChange={(option) => setFilters((prev) => ({ ...prev, paymentMethod: option ? option.value : "" }))}
                styles={customSelectStyles}
                className="w-48"
                isSearchable={false}
              />
            </div>
            <div>
              <label className="block text-[10px] text-[#818a83] uppercase tracking-wider font-semibold mb-1">Date Range</label>
              <select
                value={filters.datePreset}
                onChange={(e) => setFilters((prev) => ({ ...prev, datePreset: e.target.value }))}
                className="w-48 rounded-xl border border-[#e7e0d8] bg-[#f8f7f4] px-3 py-2 text-xs text-[#1f3228] outline-none focus:border-[#d4a843]/50"
              >
                {datePresetOptions.map((preset) => (
                  <option key={preset.value} value={preset.value}>{preset.label}</option>
                ))}
              </select>
            </div>
            {filters.datePreset === "custom" && (
              <div className="flex flex-wrap gap-2">
                <input
                  type="date"
                  className="bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-3 py-2 text-sm text-[#1f3228] focus:outline-none focus:border-[#d4a843]/50"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                />
                <input
                  type="date"
                  className="bg-[#f8f7f4] border border-[#e7e0d8] rounded-xl px-3 py-2 text-sm text-[#1f3228] focus:outline-none focus:border-[#d4a843]/50"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setFilters({ search: "", expenseType: "", paymentMethod: "", datePreset: "all", dateFrom: "", dateTo: "" })}
              className="text-sm text-[#56645b] hover:text-[#1f3228] transition"
            >
              Clear
            </button>
            <div className="rounded-full bg-[#1f3228]/10 px-3 py-1 text-[11px] font-semibold text-[#1f3228]">
              {filteredExpenses.length} matched
            </div>
          </div>
        </div>
      </div>

      {/* ── Table Mode ── */}
      <div className="bg-white border border-[#e7e0d8] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={30} className="animate-spin text-[#1f3228]/70" />
            <p className="text-sm text-[#748078]">Loading expenses…</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#8a938c]">
            <div className="w-16 h-16 rounded-2xl bg-[#f8f7f4] flex items-center justify-center mb-4">
              <Receipt size={30} className="opacity-40" />
            </div>
            <p className="text-base font-semibold text-[#748078]">No expenses recorded</p>
            <p className="text-xs mt-1">Add your first expense to track spending.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-175 text-sm">
              <thead>
                <tr className="bg-white border-b border-[#e7e0d8]">
                  <th className="text-left text-[10px] font-bold text-[#818a83] uppercase tracking-widest px-5 py-3.5">S.No</th>
                  <th className="text-left text-[10px] font-bold text-[#818a83] uppercase tracking-widest px-5 py-3.5">Date</th>
                  <th className="text-left text-[10px] font-bold text-[#818a83] uppercase tracking-widest px-5 py-3.5">Expense Details</th>
                  <th className="text-left text-[10px] font-bold text-[#818a83] uppercase tracking-widest px-4 py-3.5">Payment Mode</th>
                  <th className="text-left text-[10px] font-bold text-[#818a83] uppercase tracking-widest px-4 py-3.5">Amount</th>
                  <th className="text-left text-[10px] font-bold text-[#818a83] uppercase tracking-widest px-4 py-3.5">Bill</th>
                  <th className="text-right text-[10px] font-bold text-[#818a83] uppercase tracking-widest px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedExpenses.map((exp, i) => (
                  <tr
                    key={exp.expense_id || exp.id}
                    className={`border-b border-[#f0ede7] hover:bg-[#f8f7f4] transition-colors ${
                      isEditableExpense(exp) ? "cursor-pointer" : ""
                    }`}
                    onDoubleClick={() => {
                      if (isEditableExpense(exp)) openEditModal(exp);
                    }}
                    title={isEditableExpense(exp) ? "Double click to edit expense" : undefined}
                  >
                    <td className="px-5 py-4 text-[#56645b]">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                    <td className="px-5 py-4">
                      <p className="text-[#33443a] font-medium text-sm">
                        {new Date(exp.date_of_payment).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[#1f3228] font-semibold text-sm leading-tight">{exp.expense_type}</p>
                      <p className="text-[#748078] text-xs mt-0.5">
                        <span className="text-[#8a938c]">Paid to:</span>{" "}
                        <span className="text-[#33443a] font-medium">
                          {isCreditEntry(exp) ? "Restaurant Operations" : (exp.paid_to || "—")}
                        </span>
                      </p>
                      <p className="text-[#748078] text-xs mt-0.5">
                        <span className="text-[#8a938c]">From:</span>{" "}
                        <span className="text-[#33443a] font-medium">
                          {exp.from_name || (isCreditEntry(exp) ? (exp.expense_type === "Project Payment" ? "Client" : "Restaurant Income") : "Restaurant Operations")}
                        </span>
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-[#f8f7f4] text-[#56645b] border border-[#e7e0d8]">
                        {exp.payment_type}
                      </span>
                      {exp.invoice_number && (
                        <p className="text-[10px] text-[#8a938c] mt-1">Inv: {exp.invoice_number}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className={`${isCreditEntry(exp) ? "text-emerald-700" : "text-rose-700"} font-bold text-sm`}>
                        {isCreditEntry(exp) ? "+" : "-"} ₹ {parseFloat(exp.amount).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-[#8a938c] mt-1">{isCreditEntry(exp) ? "Added" : "Spent"}</p>
                    </td>
                    <td className="px-4 py-4">
                      {exp.upload_bill ? (
                        <a
                          href={exp.upload_bill.startsWith("http") ? exp.upload_bill : `${BACKEND_BASE_URL}/uploads/expenses/${exp.upload_bill}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f8f7f4] hover:bg-[#f2f3f0] text-[#44534a] hover:text-[#1f3228] transition text-xs"
                          title="View Bill"
                        >
                          <Download size={13} /> Bill
                        </a>
                      ) : (
                        <span className="text-[10px] text-[#a8afa9] italic">No bill</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {isEditableExpense(exp) ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(exp)}
                            className="w-8 h-8 rounded-lg bg-[#1f3228]/10 hover:bg-[#1f3228]/25 text-[#1f3228] border border-transparent hover:border-[#d4a843]/30 flex items-center justify-center transition"
                            title="Edit Expense"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(exp)}
                            className="w-8 h-8 rounded-lg bg-[#f8f7f4] hover:bg-rose-50 text-[#8a938c] hover:text-rose-700 border border-transparent hover:border-rose-200 flex items-center justify-center transition"
                            title="Delete Expense"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#a8afa9] text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 bg-white border-t border-[#e7e0d8] text-[#44534a] text-sm">
              <p className="text-xs text-[#647067]">
                Showing {filteredExpenses.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredExpenses.length)} of {filteredExpenses.length} entries (10 per page)
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                      currentPage === 1
                        ? "border-[#eee9e1] text-[#a8afa9] bg-[#f8f7f4] cursor-not-allowed"
                        : "border-[#e7e0d8] text-[#44534a] bg-[#f8f7f4] hover:bg-[#f2f3f0] hover:text-[#1f3228]"
                    } transition`}
                    title="First Page"
                  >
                    First
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      currentPage === 1
                        ? "border-[#eee9e1] text-[#a8afa9] bg-[#f8f7f4] cursor-not-allowed"
                        : "border-[#e7e0d8] text-[#44534a] bg-[#f8f7f4] hover:bg-[#f2f3f0] hover:text-[#1f3228]"
                    } transition`}
                  >
                    Prev
                  </button>
                  <div className="flex items-center gap-1 mx-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        return (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        );
                      })
                      .map((page, idx, arr) => {
                        const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && <span className="px-1 text-[#8a938c] text-xs">...</span>}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                                currentPage === page
                                  ? "bg-[#1f3228] text-white shadow-md shadow-[#1f3228]/30"
                                  : "bg-[#f8f7f4] text-[#56645b] hover:bg-[#f2f3f0] hover:text-[#1f3228] border border-[#e7e0d8]"
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      currentPage === totalPages
                        ? "border-[#eee9e1] text-[#a8afa9] bg-[#f8f7f4] cursor-not-allowed"
                        : "border-[#e7e0d8] text-[#44534a] bg-[#f8f7f4] hover:bg-[#f2f3f0] hover:text-[#1f3228]"
                    } transition`}
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                      currentPage === totalPages
                        ? "border-[#eee9e1] text-[#a8afa9] bg-[#f8f7f4] cursor-not-allowed"
                        : "border-[#e7e0d8] text-[#44534a] bg-[#f8f7f4] hover:bg-[#f2f3f0] hover:text-[#1f3228]"
                    } transition`}
                    title="Last Page"
                  >
                    Last
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white border border-[#e7e0d8] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[#1f3228]">Monthly Summary</h3>
              <p className="text-xs text-[#748078]">Current view total and category breakdown.</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-[#818a83]">Total</p>
              <p className="text-xl font-bold text-rose-700">₹ {totalSpent.toFixed(2)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#e7e0d8] bg-[#f8f7f4] p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#818a83]">Entries</p>
              <p className="text-lg font-semibold text-[#1f3228]">{filteredExpenses.length}</p>
            </div>
            <div className="rounded-xl border border-[#e7e0d8] bg-[#f8f7f4] p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#818a83]">Top Category</p>
              <p className="text-lg font-semibold text-[#1f3228]">{categoryBreakdown[0]?.name || "None"}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {categoryBreakdown.slice(0, 6).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm text-[#44534a]">
                <span>{item.name}</span>
                <span className="font-semibold text-[#1f3228]">₹ {item.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#e7e0d8] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[#1f3228]">Expense Distribution</h3>
              <p className="text-xs text-[#748078]">Category share by percentage.</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-5 items-center">
            <div
              className="w-44 h-44 rounded-full shrink-0"
              style={{ background: `conic-gradient(${pieSegments.join(", ")})` }}
            />
            <div className="flex-1 w-full space-y-2">
              {categoryBreakdown.length > 0 ? categoryBreakdown.map((item, index) => {
                const percent = totalSpent > 0 ? ((item.value / totalSpent) * 100).toFixed(1) : 0;
                return (
                  <div key={item.name} className="flex items-center justify-between rounded-lg bg-[#f8f7f4] px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                      <span className="text-[#44534a]">{item.name}</span>
                    </div>
                    <span className="font-semibold text-[#1f3228]">{percent}%</span>
                  </div>
                );
              }) : (
                <div className="rounded-lg bg-[#f8f7f4] px-3 py-2 text-sm text-[#44534a]">No expense data for the current filters.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#e7e0d8] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[#1f3228]">Monthly Expense Trend</h3>
            <p className="text-xs text-[#748078]">Full year comparison.</p>
          </div>
        </div>
        <div className="flex items-end gap-2 h-56 mt-3 overflow-x-auto">
          {monthlyTrend.map((item) => (
            <div key={item.monthName} className="min-w-11 flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center h-44 rounded-2xl bg-[#f8f7f4] p-2">
                <div
                  className="w-full rounded-xl bg-linear-to-t from-[#1f3228] to-[#d4a843]"
                  style={{ height: `${Math.max((item.monthValue / maxMonthlyValue) * 100, 6)}%` }}
                />
              </div>
              <div className="text-center">
                <p className="text-[11px] text-[#748078]">{item.monthName}</p>
                <p className="text-sm font-semibold text-[#1f3228]">₹ {item.monthValue.toFixed(0)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>


    </div>
    
  );
};

export default ExpensesPage;
