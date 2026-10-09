import React, { useState, useEffect } from "react";
import Select from 'react-select';

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: '#1a1d24',
    border: `1px solid ${state.isFocused
      ? '#f97316'
      : 'rgba(255,255,255,0.1)'
      }`,
    boxShadow: 'none',
    outline: 'none',
    minHeight: '42px',
    height: '42px',
    borderRadius: '12px',

    '&:hover': {
      border: '1px solid #f97316',
    },
  }),

  valueContainer: (provided) => ({
    ...provided,
    padding: '0 12px',
    fontSize: '13px',
  }),

  singleValue: (provided) => ({
    ...provided,
    color: '#fff',
    fontSize: '13px',
  }),

  placeholder: (provided) => ({
    ...provided,
    color: 'rgba(255,255,255,.35)',
    fontSize: '13px',
  }),

  input: (provided) => ({
    ...provided,
    color: '#fff',
    fontSize: '13px',
    margin: 0,
    padding: 0,
  }),

  menu: (provided) => ({
    ...provided,
    background: '#1a1d24',
    border: '1px solid rgba(255,255,255,.1)',
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
      ? '#f97316'
      : state.isFocused
        ? 'rgba(249,115,22,.15)'
        : '#1a1d24',
    color: '#fff',
    cursor: 'pointer',
    ':active': {
      backgroundColor: '#ea580c',
    },
  }),

  indicatorSeparator: () => ({
    display: 'none',
  }),

  dropdownIndicator: (provided) => ({
    ...provided,
    color: '#888',
    padding: '6px',
  }),
};
import { toast, Toaster } from "react-hot-toast";
import { Receipt, DollarSign, PlusCircle, CheckCircle2, AlertCircle, Loader2, X, Download, Edit2, Trash2 } from "lucide-react";
import api, { API_URL } from "../../api";
import ModalPortal from "../../CommonComponents/ModalPortal";

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#111318] p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/70 hover:bg-white/10 hover:text-white transition"
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
    "Training",
    "Taxes",
    "Insurance",
    "Miscellaneous",
    "Other",
  ];
  const expenseFilterTypeOptions = [
    "Salary",
    "Project Payment",
    "Income",
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

  const pieSegments = categoryBreakdown.length > 0
    ? categoryBreakdown.map((item, index) => {
      const colors = ["#f97316", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
      return `${colors[index % colors.length]} ${index === 0 ? 0 : categoryBreakdown.slice(0, index).reduce((sum, entry) => sum + (entry.value / totalSpent) * 100, 0)}% ${index === categoryBreakdown.length - 1 ? 100 : categoryBreakdown.slice(0, index + 1).reduce((sum, entry) => sum + (entry.value / totalSpent) * 100, 0)}%`;
    })
    : ["#f97316 0% 100%"];

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
    <div className="space-y-5 pb-10 text-white min-h-screen">
      <Toaster position="top-right" />

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Receipt size={22} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">All Expenses</h1>
            <p className="text-white/40 text-xs mt-0.5">
              Manage your company funds and track expenses
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExpenseForm(!showExpenseForm)}
            className="inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition shadow-lg shadow-primary/25 hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}
          >
            {showExpenseForm ? <X size={15} /> : <PlusCircle size={15} />}
            {showExpenseForm ? "Cancel" : "Add Expense"}
          </button>
        </div>
      </div>

      {/* ── Stats Overview ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* Available Fund Stat */}
        <div className={`bg-white/4 border ${parseFloat(fund) < 0 ? 'border-rose-500/30' : 'border-emerald-500/20'} rounded-2xl p-5 flex flex-col justify-between hover:bg-white/6 transition relative overflow-hidden group`}>
          <div className={`absolute -right-4 -top-4 w-24 h-24 ${parseFloat(fund) < 0 ? 'bg-rose-500/10 group-hover:bg-rose-500/20' : 'bg-emerald-500/10 group-hover:bg-emerald-500/20'} rounded-full blur-xl transition duration-500`} />
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className={`w-10 h-10 rounded-xl ${parseFloat(fund) < 0 ? 'bg-rose-500/15' : 'bg-emerald-500/15'} flex items-center justify-center shrink-0`}>
              <DollarSign size={18} className={parseFloat(fund) < 0 ? 'text-rose-400' : 'text-emerald-400'} />
            </div>
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider font-semibold">Available Fund</p>
              <p className={`text-2xl font-bold ${parseFloat(fund) < 0 ? 'text-rose-400' : 'text-emerald-400'} mt-1`}>
                {parseFloat(fund) < 0 ? `- ₹ ${Math.abs(parseFloat(fund)).toFixed(2)}` : `₹ ${parseFloat(fund).toFixed(2)}`}
              </p>
            </div>
          </div>
          <div className="mt-4 relative z-10">
            {!showFundForm ? (
              <button
                onClick={() => setShowFundForm(true)}
                className={`text-xs font-semibold px-4 py-2 ${parseFloat(fund) < 0 ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'} rounded-lg transition`}
              >
                Update Fund
              </button>
            ) : (
              <form onSubmit={handleUpdateFund} className="flex gap-2">
                <input
                  type="number" step="0.01"
                  value={fundAmount} onChange={(e) => setFundAmount(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50"
                  placeholder="New amount" required
                />
                <button type="submit" className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600">Save</button>
                <button type="button" onClick={() => setShowFundForm(false)} className="px-3 py-1.5 bg-white/5 text-white/60 rounded-lg hover:text-white hover:bg-white/10">X</button>
              </form>
            )}
          </div>
        </div>

        {/* Total Spent Stat */}
        <div className="bg-white/4 border border-rose-500/20 rounded-2xl p-5 flex flex-col justify-between hover:bg-white/6 transition relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-rose-500/10 rounded-full blur-xl group-hover:bg-rose-500/20 transition duration-500" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
              <Receipt size={18} className="text-rose-400" />
            </div>
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider font-semibold">Total Spent</p>
              <p className="text-2xl font-bold text-rose-400 mt-1">₹ {totalSpent.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-[11px] text-white/30 mt-4 relative z-10">{expenses.length} total transactions recorded.</p>
        </div>
      </div>

      <Modal open={showExpenseForm} onClose={() => setShowExpenseForm(false)} title="Record New Expense">
        <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">Expense Type</label>
            <Select
              options={[
                ...expenseFormTypeOptions.map(option => ({ value: option, label: option }))
              ]}
              value={expenseData.expense_type ? { value: expenseData.expense_type, label: expenseData.expense_type } : null}
              onChange={(option) => {
                const value = option ? option.value : "";
                setExpenseData((prev) => ({ ...prev, expense_type: value, paid_to: value === "Salary" ? prev.paid_to : "" }));
                if (value !== "Other") {
                  setCustomExpenseType("");
                }
              }}
              styles={customSelectStyles}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              placeholder="Select Expense Type"
              isSearchable={true}
            />
            {isOtherExpenseType && (
              <div className="mt-2">
                <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">Custom Expense Type</label>
                <input
                  type="text"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition"
                  placeholder="Enter expense type"
                  value={customExpenseType}
                  onChange={(e) => setCustomExpenseType(e.target.value)}
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">Paid To</label>
            <input type="text" required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition"
              placeholder="e.g. Amazon Web Services"
              value={expenseData.paid_to} onChange={(e) => setExpenseData({ ...expenseData, paid_to: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">From</label>
            <input type="text" disabled
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/50 placeholder-white/30 focus:outline-none focus:border-primary/50 transition"
              value="Q-Techx Solutions" />
          </div>
          <div>
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">Date of Payment</label>
            <input type="date" required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition scheme-dark"
              value={expenseData.date_of_payment} onChange={(e) => setExpenseData({ ...expenseData, date_of_payment: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">Amount (₹)</label>
            <input type="number" step="0.01" required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition"
              placeholder="0.00"
              value={expenseData.amount} onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })} />
          </div>
          <div>
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">
              Payment Mode <span className="text-orange-400 font-bold">*</span>
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
              placeholder="Select Payment Mode *"
              isSearchable={false}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">Invoice Number</label>
            <input type="text"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition"
              placeholder="Optional"
              value={expenseData.invoice_number} onChange={(e) => setExpenseData({ ...expenseData, invoice_number: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">Description</label>
            <textarea rows="2"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition"
              placeholder="Additional notes about this expense..."
              value={expenseData.description} onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}></textarea>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">Upload Bill (Optional)</label>
            <input type="file" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 transition cursor-pointer"
              onChange={(e) => setBillFile(e.target.files[0])} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 mt-2 border-t border-white/5 pt-5">
            <button type="button" onClick={() => setShowExpenseForm(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-90 transition"
              style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
              Submit Expense
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Expense Modal ── */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Expense Details">
        <form onSubmit={handleUpdateExpense} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">Expense Type</label>
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
              placeholder="Select Expense Type"
              isSearchable={true}
            />
            {editExpenseData.expense_type === "Other" && (
              <div className="mt-2">
                <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">Custom Expense Type</label>
                <input
                  type="text"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition"
                  placeholder="Enter expense type"
                  value={editCustomExpenseType}
                  onChange={(e) => setEditCustomExpenseType(e.target.value)}
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">Paid To</label>
            <input
              type="text"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition"
              placeholder="e.g. Amazon Web Services"
              value={editExpenseData.paid_to}
              onChange={(e) => setEditExpenseData({ ...editExpenseData, paid_to: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">From</label>
            <input
              type="text"
              disabled
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white/50 placeholder-white/30 focus:outline-none focus:border-primary/50 transition"
              value={editingExpense?.from_name || "Q-Techx Solutions"}
            />
          </div>
          <div>
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">Date of Payment</label>
            <input
              type="date"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 transition scheme-dark"
              value={editExpenseData.date_of_payment}
              onChange={(e) => setEditExpenseData({ ...editExpenseData, date_of_payment: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition"
              placeholder="0.00"
              value={editExpenseData.amount}
              onChange={(e) => setEditExpenseData({ ...editExpenseData, amount: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">
              Payment Mode <span className="text-orange-400 font-bold">*</span>
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
              placeholder="Select Payment Mode *"
              isSearchable={false}
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">Invoice Number</label>
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition"
              placeholder="Optional"
              value={editExpenseData.invoice_number}
              onChange={(e) => setEditExpenseData({ ...editExpenseData, invoice_number: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">Description</label>
            <textarea
              rows="2"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition"
              placeholder="Additional notes about this expense..."
              value={editExpenseData.description}
              onChange={(e) => setEditExpenseData({ ...editExpenseData, description: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1">
              Upload New Bill / Receipt (Optional)
            </label>
            {editingExpense?.upload_bill && (
              <div className="flex items-center gap-2 mb-2 p-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70">
                <span className="text-white/40">Current bill:</span>
                <a
                  href={`${API_URL}/uploads/expenses/${editingExpense.upload_bill}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline font-medium truncate max-w-xs"
                >
                  {editingExpense.upload_bill}
                </a>
              </div>
            )}
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 transition cursor-pointer"
              onChange={(e) => setEditBillFile(e.target.files[0])}
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 mt-2 border-t border-white/5 pt-5">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              disabled={savingEdit}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:opacity-90 transition flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}
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
            <p className="text-white/70 text-sm">
              Are you sure you want to delete this expense of <span className="text-rose-400 font-bold">₹ {parseFloat(deleteTarget.amount || 0).toFixed(2)}</span> ({deleteTarget.expense_type})?
            </p>
            <p className="text-white/40 text-xs">
              Deleting this expense will automatically restore the spent amount back to your Available Fund.
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteExpense}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-rose-500 hover:bg-rose-600 text-white transition flex items-center gap-2"
              >
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <div className="bg-[#111318] border border-white/10 rounded-2xl p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-[10px] text-white/35 uppercase tracking-wider font-semibold mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Search expense, payee, from..."
                className="w-52 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="block text-[10px] text-white/35 uppercase tracking-wider font-semibold mb-1">Expense Type</label>
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
              <label className="block text-[10px] text-white/35 uppercase tracking-wider font-semibold mb-1">Payment Method</label>
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
              <label className="block text-[10px] text-white/35 uppercase tracking-wider font-semibold mb-1">Date Range</label>
              <div className="flex flex-wrap gap-2">
                {datePresetOptions.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, datePreset: preset.value }))}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filters.datePreset === preset.value ? "bg-primary text-white" : "bg-white/5 text-white/60 hover:bg-white/10"}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {filters.datePreset === "custom" && (
              <div className="flex flex-wrap gap-2">
                <input
                  type="date"
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                />
                <input
                  type="date"
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setFilters({ search: "", expenseType: "", paymentMethod: "", datePreset: "all", dateFrom: "", dateTo: "" })}
              className="text-sm text-white/60 hover:text-white transition"
            >
              Clear
            </button>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
              {filteredExpenses.length} matched
            </div>
          </div>
        </div>
      </div>

      {/* ── Table Mode ── */}
      <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={30} className="animate-spin text-primary/70" />
            <p className="text-sm text-white/40">Loading expenses…</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Receipt size={30} className="opacity-40" />
            </div>
            <p className="text-base font-semibold text-white/40">No expenses recorded</p>
            <p className="text-xs mt-1">Add your first expense to track spending.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-175 text-sm">
              <thead>
                <tr className="bg-white/3 border-b border-white/8">
                  <th className="text-left text-[10px] font-bold text-white/35 uppercase tracking-widest px-5 py-3.5">S.No</th>
                  <th className="text-left text-[10px] font-bold text-white/35 uppercase tracking-widest px-5 py-3.5">Date</th>
                  <th className="text-left text-[10px] font-bold text-white/35 uppercase tracking-widest px-5 py-3.5">Expense Details</th>
                  <th className="text-left text-[10px] font-bold text-white/35 uppercase tracking-widest px-4 py-3.5">Payment Mode</th>
                  <th className="text-left text-[10px] font-bold text-white/35 uppercase tracking-widest px-4 py-3.5">Amount</th>
                  <th className="text-left text-[10px] font-bold text-white/35 uppercase tracking-widest px-4 py-3.5">Bill</th>
                  <th className="text-right text-[10px] font-bold text-white/35 uppercase tracking-widest px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedExpenses.map((exp, i) => (
                  <tr
                    key={exp.expense_id || exp.id}
                    className={`border-b border-white/4 hover:bg-white/2.5 transition-colors ${
                      isEditableExpense(exp) ? "cursor-pointer" : ""
                    }`}
                    onDoubleClick={() => {
                      if (isEditableExpense(exp)) openEditModal(exp);
                    }}
                    title={isEditableExpense(exp) ? "Double click to edit expense" : undefined}
                  >
                    <td className="px-5 py-4 text-white/60">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                    <td className="px-5 py-4">
                      <p className="text-white/80 font-medium text-sm">
                        {new Date(exp.date_of_payment).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-white font-semibold text-sm leading-tight">{exp.expense_type}</p>
                      <p className="text-white/40 text-xs mt-0.5">
                        <span className="text-white/30">Paid to:</span>{" "}
                        <span className="text-white/80 font-medium">
                          {isCreditEntry(exp) ? "Q-Techx Solutions" : (exp.paid_to || "—")}
                        </span>
                      </p>
                      <p className="text-white/40 text-xs mt-0.5">
                        <span className="text-white/30">From:</span>{" "}
                        <span className="text-white/80 font-medium">
                          {exp.from_name || (isCreditEntry(exp) ? (exp.expense_type === "Project Payment" ? "Client" : "Income") : "Q-Techx Solutions")}
                        </span>
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/5 text-white/60 border border-white/10">
                        {exp.payment_type}
                      </span>
                      {exp.invoice_number && (
                        <p className="text-[10px] text-white/30 mt-1">Inv: {exp.invoice_number}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className={`${isCreditEntry(exp) ? "text-emerald-400" : "text-rose-400"} font-bold text-sm`}>
                        {isCreditEntry(exp) ? "+" : "-"} ₹ {parseFloat(exp.amount).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-white/30 mt-1">{isCreditEntry(exp) ? "Added" : "Spent"}</p>
                    </td>
                    <td className="px-4 py-4">
                      {exp.upload_bill ? (
                        <a
                          href={exp.upload_bill.startsWith("http") ? exp.upload_bill : `${API_URL}/uploads/expenses/${exp.upload_bill}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition text-xs"
                          title="View Bill"
                        >
                          <Download size={13} /> Bill
                        </a>
                      ) : (
                        <span className="text-[10px] text-white/20 italic">No bill</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {isEditableExpense(exp) ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(exp)}
                            className="w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary/25 text-primary border border-transparent hover:border-primary/30 flex items-center justify-center transition"
                            title="Edit Expense"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(exp)}
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-rose-500/15 text-white/30 hover:text-rose-400 border border-transparent hover:border-rose-500/25 flex items-center justify-center transition"
                            title="Delete Expense"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-white/20 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 bg-[#111318] border-t border-white/10 text-white/70 text-sm">
              <p className="text-xs text-white/50">
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
                        ? "border-white/5 text-white/20 bg-white/2 cursor-not-allowed"
                        : "border-white/10 text-white/70 bg-white/5 hover:bg-white/10 hover:text-white"
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
                        ? "border-white/5 text-white/20 bg-white/2 cursor-not-allowed"
                        : "border-white/10 text-white/70 bg-white/5 hover:bg-white/10 hover:text-white"
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
                            {showEllipsis && <span className="px-1 text-white/30 text-xs">...</span>}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                                currentPage === page
                                  ? "bg-primary text-white shadow-md shadow-primary/30"
                                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
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
                        ? "border-white/5 text-white/20 bg-white/2 cursor-not-allowed"
                        : "border-white/10 text-white/70 bg-white/5 hover:bg-white/10 hover:text-white"
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
                        ? "border-white/5 text-white/20 bg-white/2 cursor-not-allowed"
                        : "border-white/10 text-white/70 bg-white/5 hover:bg-white/10 hover:text-white"
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
        <div className="bg-[#111318] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Monthly Summary</h3>
              <p className="text-xs text-white/40">Current view total and category breakdown.</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-white/35">Total</p>
              <p className="text-xl font-bold text-rose-400">₹ {totalSpent.toFixed(2)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-white/35">Entries</p>
              <p className="text-lg font-semibold text-white">{filteredExpenses.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-white/35">Top Category</p>
              <p className="text-lg font-semibold text-white">{categoryBreakdown[0]?.name || "None"}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {categoryBreakdown.slice(0, 6).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm text-white/70">
                <span>{item.name}</span>
                <span className="font-semibold text-white">₹ {item.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111318] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Expense Distribution</h3>
              <p className="text-xs text-white/40">Category share by percentage.</p>
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
                  <div key={item.name} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ["#f97316", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"][index % 6] }} />
                      <span className="text-white/70">{item.name}</span>
                    </div>
                    <span className="font-semibold text-white">{percent}%</span>
                  </div>
                );
              }) : (
                <div className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/70">No expense data for the current filters.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#111318] border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Monthly Expense Trend</h3>
            <p className="text-xs text-white/40">Full year comparison.</p>
          </div>
        </div>
        <div className="flex items-end gap-2 h-56 mt-3 overflow-x-auto">
          {monthlyTrend.map((item) => (
            <div key={item.monthName} className="min-w-11 flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center h-44 rounded-2xl bg-white/5 p-2">
                <div
                  className="w-full rounded-xl bg-linear-to-t from-primary to-orange-400"
                  style={{ height: `${Math.max((item.monthValue / maxMonthlyValue) * 100, 6)}%` }}
                />
              </div>
              <div className="text-center">
                <p className="text-[11px] text-white/40">{item.monthName}</p>
                <p className="text-sm font-semibold text-white">₹ {item.monthValue.toFixed(0)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>


    </div>
    
  );
};

export default ExpensesPage;
