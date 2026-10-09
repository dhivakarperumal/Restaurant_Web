import { useState, useEffect, useMemo, useRef } from 'react';
import Select from 'react-select';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Save, RefreshCw, ArrowLeft, Loader2,
  AlertCircle, CheckCircle, DollarSign, Users, Briefcase,
  History, Printer, X, Edit, Trash2, Search, Plus,
  LayoutGrid, List, Eye
} from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../PrivateRouter/AuthContext';
import { useReactToPrint } from "react-to-print";
import ModalPortal from '../../Componets/CommonComponents/ModalPortal';
import PayslipTemplate from '../../Componets/PayslipTemplate';

const fieldClass = 'w-full rounded-xl border border-white/10 bg-[#0e1118] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/70 transition placeholder:text-white/20';
const sectionClass = 'rounded-2xl border border-white/8 bg-white/[0.03] p-5';
const readOnlyFieldClass = 'w-full rounded-xl border border-white/5 bg-[#0a0c10] px-3 py-2.5 text-sm text-white/70 outline-none cursor-not-allowed';

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

const BLANK = {
  employee_id: '',
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  basic_salary: '',
  present_days: 0,
  leave_days: 0,
  leave_deduction: 0,
  incentive_percentage: '',
  incentive_amount: 0,
  additional_deduction: '',
  total_salary: 0,
  bank_name: '',
  account_number: '',
  ifsc_code: '',
  upi_id: ''
};

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

export default function EmployeeSalary() {
  const navigate = useNavigate();
  const { user } = useAuth();


  const [formData, setFormData] = useState(BLANK);
  const [employees, setEmployees] = useState([]);
  const [history, setHistory] = useState([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSalaryEmployee, setSelectedSalaryEmployee] = useState(null);

  const [editId, setEditId] = useState(null);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [historyMonthFilter, setHistoryMonthFilter] = useState('all');
  const [historyYearFilter, setHistoryYearFilter] = useState(String(new Date().getFullYear()));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const payslipRef = useRef();
  const [employeeViewMode, setEmployeeViewMode] = useState("card");
  const [historyViewMode, setHistoryViewMode] = useState("table");

  const handlePrint = useReactToPrint({
    contentRef: payslipRef,
    documentTitle: selectedPayslip
      ? `Payslip_${selectedPayslip.first_name}_${selectedPayslip.salary_month}_${selectedPayslip.salary_year}`
      : "Payslip",
  });

  // Fetch employees & history on mount
  useEffect(() => {
    (async () => {
      setEmployeeLoading(true);
      try {
        const { data } = await api.get('/employees?limit=500&page=1');
        if (data.data && Array.isArray(data.data)) setEmployees(data.data);
        else if (data.data?.rows) setEmployees(data.data.rows);
        else if (Array.isArray(data)) setEmployees(data);
      } catch (err) {
        console.warn('Failed to load employees:', err);
      } finally {
        setEmployeeLoading(false);
      }
    })();
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get('/salary/history');
      if (data.success) {
        setHistory(data.data);
      }
    } catch (err) {
      console.warn("Failed to fetch salary history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch salary details when employee, month or year changes
  useEffect(() => {
    if (!formData.employee_id || !formData.month || !formData.year || editId) return; // skip if editing

    const fetchDetails = async () => {
      setDetailsLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/salary/details?employee_id=${formData.employee_id}&month=${formData.month}&year=${formData.year}`);
        if (data.success) {
          const emp = data.data;

          const basic = parseFloat(emp.basic_salary) || 0;
          const leaveDays = parseInt(emp.leave_days) || 0;
          const presentDays = parseInt(emp.present_days) || 0;
          const alreadyPaid = emp.alreadyPaid || false;

          const daysInMonth = new Date(formData.year, formData.month, 0).getDate();

          let lDeduct = 0;
          if (basic > 0 && leaveDays > 0) {
            lDeduct = parseFloat(((basic / daysInMonth) * leaveDays).toFixed(2));
          }

          if (alreadyPaid) {
            setError(`Salary has already been paid for this employee for ${new Date(0, formData.month - 1).toLocaleString('default', { month: 'long' })} ${formData.year}.`);
          }

          setFormData(prev => ({
            ...prev,
            basic_salary: basic,
            leave_days: leaveDays,
            present_days: presentDays,
            leave_deduction: lDeduct,
            alreadyPaid: alreadyPaid,
            bank_name: emp.bank_name || '',
            account_number: emp.account_number || '',
            ifsc_code: emp.ifsc_code || '',
            upi_id: emp.upi_id || ''
          }));
        }
      } catch (err) {
        setError(err?.response?.data?.message || err.message || 'Error fetching employee details');
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchDetails();
  }, [formData.employee_id, formData.month, formData.year, editId]);

  // Recalculate total salary whenever relevant fields change
  useEffect(() => {
    const basic = parseFloat(formData.basic_salary) || 0;
    const lDeduct = parseFloat(formData.leave_deduction) || 0;
    const pDays = parseInt(formData.present_days) || 0;
    const lDays = parseInt(formData.leave_days) || 0;

    const incPercent = parseFloat(formData.incentive_percentage) || 0;
    let incAmount = 0;
    if (incPercent > 0) {
      incAmount = parseFloat(((basic * incPercent) / 100).toFixed(2));
    }

    const addDeduct = parseFloat(formData.additional_deduction) || 0;

    const daysInMonth = new Date(formData.year, formData.month, 0).getDate();
    let earnedBasic = 0;
    if (basic > 0 && pDays > 0) {
      earnedBasic = parseFloat(((basic / daysInMonth) * pDays).toFixed(2));
    }

    // Total is calculated purely from earnedBasic (based on present days) + incentives - additional.
    // We ignore lDeduct here since leave days naturally deduct from the earned basic.
    const total = parseFloat((earnedBasic + incAmount - addDeduct).toFixed(2));

    setFormData(prev => ({
      ...prev,
      incentive_amount: incAmount,
      total_salary: total > 0 ? total : 0
    }));
  }, [formData.basic_salary, formData.present_days, formData.month, formData.year, formData.incentive_percentage, formData.additional_deduction]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.employee_id) { setError('Please select an employee'); return; }
    if (formData.total_salary <= 0) { setError('Total salary must be greater than 0'); return; }

    setLoading(true); setError(''); setSuccess('');
    try {
      const payload = {
        employee_id: formData.employee_id,
        month: parseInt(formData.month),
        year: parseInt(formData.year),
        basic_salary: parseFloat(formData.basic_salary) || 0,
        present_days: parseInt(formData.present_days) || 0,
        leave_days: parseInt(formData.leave_days) || 0,
        leave_deduction: parseFloat(formData.leave_deduction) || 0,
        incentive_percentage: parseFloat(formData.incentive_percentage) || 0,
        incentive_amount: parseFloat(formData.incentive_amount) || 0,
        additional_deduction: parseFloat(formData.additional_deduction) || 0,
        total_salary: parseFloat(formData.total_salary) || 0,
        updated_by: user?.user_id
      };

      let res;
      if (editId) {
        res = await api.put(`/salary/pay/${editId}`, payload);
      } else {
        res = await api.post('/salary/pay', payload);
      }

      if (!res.data.success) throw new Error(res.data.message || 'Payment failed');

      setSuccess(`Salary ${editId ? 'updated' : 'paid'} successfully!`);
      fetchHistory(); // refresh table
      resetForm();
      setShowForm(false);

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to pay salary');
    } finally { setLoading(false); }
  };

  const handleEdit = (record) => {
    setEditId(record.id);
    setShowForm(true);
    setFormData({
      employee_id: record.employee_id,
      month: record.salary_month,
      year: record.salary_year,
      basic_salary: record.basic_salary,
      present_days: record.present_days,
      leave_days: record.leave_days,
      leave_deduction: record.leave_deduction,
      incentive_percentage: record.incentive_percentage,
      incentive_amount: record.incentive_amount,
      additional_deduction: record.additional_deduction,
      total_salary: record.total_salary,
      alreadyPaid: false
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (record) => {
    if (!window.confirm("Are you sure you want to delete this salary record? This will add the funds back to the company.")) return;
    try {
      const res = await api.delete(`/salary/pay/${record.id}`, { data: { updated_by: user?.user_id } });
      if (res.data.success) {
        setSuccess("Salary record deleted.");
        fetchHistory();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(res.data.message || "Failed to delete");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to delete");
    }
  };

  const resetForm = () => {
    setEditId(null);
    setShowForm(false);
    setFormData(BLANK);
    setError('');
  };

  const filteredEmployees = useMemo(() => {
    const search = employeeSearch.trim().toLowerCase();
    return employees
      .filter((emp) => (emp.status || emp.employment_status) === 'Active')
      .filter((emp) => {
        if (!search) return true;
        const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
        const code = (emp.employee_code || '').toLowerCase();
        return fullName.includes(search) || code.includes(search);
      });
  }, [employees, employeeSearch]);

  const filteredSalaryHistory = useMemo(() => {
    return history.filter((record) => {
      const employee = employees.find((item) => item.employee_id === record.employee_id);
      const fullName = `${employee?.first_name || ''} ${employee?.last_name || ''}`.toLowerCase();
      const code = (employee?.employee_code || '').toLowerCase();
      const search = employeeSearch.trim().toLowerCase();
      const matchesSearch = !search || fullName.includes(search) || code.includes(search);
      const matchesMonth = historyMonthFilter === 'all' || Number(record.salary_month) === Number(historyMonthFilter);
      const matchesYear = historyYearFilter === 'all' || Number(record.salary_year) === Number(historyYearFilter);
      return matchesSearch && matchesMonth && matchesYear;
    });
  }, [history, employees, employeeSearch, historyMonthFilter, historyYearFilter]);

  const selectedEmployeeHistory = useMemo(() => {
    if (!selectedEmployeeId) return filteredSalaryHistory;
    return filteredSalaryHistory.filter((record) => record.employee_id === selectedEmployeeId);
  }, [filteredSalaryHistory, selectedEmployeeId]);

  const filteredHistory = useMemo(() => {
    return history.filter((record) => {
      const employeeName =
        `${record.first_name || ''} ${record.last_name || ''}`.toLowerCase();

      const employeeCode =
        (record.employee_code || '').toLowerCase();

      const search = employeeSearch.trim().toLowerCase();

      const matchesEmployee =
        !search ||
        employeeName.includes(search) ||
        employeeCode.includes(search);

      const matchesMonth =
        historyMonthFilter === 'all' ||
        Number(record.salary_month) === Number(historyMonthFilter);

      return matchesEmployee && matchesMonth;
    });
  }, [history, employeeSearch, historyMonthFilter]);

  const selectedEmployeeSalaryHistory = useMemo(() => {
    if (!selectedSalaryEmployee) return [];

    return history.filter((record) => record.employee_id === selectedSalaryEmployee.employee_id);
  }, [history, selectedSalaryEmployee]);

  return (
    <div className="space-y-6 text-white pb-10">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        {/* Left Side */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate("/admin/expenses")}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition shrink-0 mt-1"
          >
            <ArrowLeft size={16} />
          </button>

          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              <DollarSign size={11} />
              Salary Management
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight">
              Employee Salary
            </h1>

            <p className="text-sm text-white/40 mt-0.5">
              Calculate, process monthly salaries, and print payslips.
            </p>
          </div>
        </div>

        {/* Right Side */}
        <button
          type="button"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
              setError("");
              setSuccess("");
            }
          }}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 self-start"
          style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}
        >
          <Plus size={15} />
          {showForm ? "Close Form" : "Record Payment"}
        </button>
      </div>

      <Modal open={showForm} onClose={resetForm} title={editId ? 'Edit Salary Payment' : 'Record Salary Payment'}>
        <form onSubmit={handleSave} className="space-y-6">
          <section className={sectionClass}>
            <div className="mb-5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center"><Users size={15} className="text-blue-400" /></div>
              <h2 className="text-base font-bold text-white">{editId ? 'Edit Details' : 'Select Details'}</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm text-white/60">
                <span className="mb-1.5 block font-medium">Employee *</span>
                <Select
                  options={[
                    ...employees
                      .filter(emp => (emp.status || emp.employment_status) === 'Active' || emp.employee_id === formData.employee_id)
                      .map(emp => ({
                        value: emp.employee_id,
                        label: `${emp.first_name} ${emp.last_name} (${emp.employee_code || 'No Code'})`
                      }))
                  ]}
                  value={formData.employee_id ? {
                    value: formData.employee_id,
                    label: employees.find(e => e.employee_id === formData.employee_id)
                      ? `${employees.find(e => e.employee_id === formData.employee_id).first_name} ${employees.find(e => e.employee_id === formData.employee_id).last_name} (${employees.find(e => e.employee_id === formData.employee_id).employee_code || 'No Code'})`
                      : ''
                  } : null}
                  onChange={(option) => handleChange({ target: { name: 'employee_id', value: option ? option.value : '' } })}
                  styles={customSelectStyles}
                  isDisabled={editId}
                  placeholder={employeeLoading ? "Loading..." : "Select Employee"}
                  isSearchable={true}
                />
              </label>

              <label className="text-sm text-white/60">
                <span className="mb-1.5 block font-medium">Month *</span>
                <Select
                  options={Array.from({ length: 12 }, (_, i) => i + 1).map(m => ({
                    value: m, label: new Date(0, m - 1).toLocaleString('default', { month: 'long' })
                  }))}
                  value={formData.month ? { value: formData.month, label: new Date(0, formData.month - 1).toLocaleString('default', { month: 'long' }) } : null}
                  onChange={(option) => handleChange({ target: { name: 'month', value: option ? option.value : '' } })}
                  styles={customSelectStyles}
                  isDisabled={editId}
                  isSearchable={false}
                />
              </label>

              <label className="text-sm text-white/60">
                <span className="mb-1.5 block font-medium">Year *</span>
                <Select
                  options={Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => ({
                    value: y, label: String(y)
                  }))}
                  value={formData.year ? { value: formData.year, label: String(formData.year) } : null}
                  onChange={(option) => handleChange({ target: { name: 'year', value: option ? option.value : '' } })}
                  styles={customSelectStyles}
                  isDisabled={editId}
                  isSearchable={false}
                />
              </label>
            </div>
            {detailsLoading && <p className="mt-4 text-xs text-orange-400 animate-pulse">Loading employee salary details...</p>}
          </section>

          <section className={sectionClass}>
            <div className="mb-5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500/15 flex items-center justify-center"><DollarSign size={15} className="text-orange-400" /></div>
              <h2 className="text-base font-bold text-white">Salary Calculation</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-white/60">
                <span className="mb-1.5 block font-medium">Basic Salary (₹)</span>
                <input className={readOnlyFieldClass} type="number" readOnly value={formData.basic_salary} />
              </label>

              <div className="grid gap-4 grid-cols-3">
                <label className="text-sm text-white/60">
                  <span className="mb-1.5 block font-medium">Present Days</span>
                  <input className={readOnlyFieldClass} type="number" readOnly value={formData.present_days} />
                </label>

                <label className="text-sm text-white/60">
                  <span className="mb-1.5 block font-medium">Leave Days</span>
                  <input className={readOnlyFieldClass} type="number" readOnly value={formData.leave_days} />
                </label>

                <label className="text-sm text-white/60">
                  <span className="mb-1.5 block font-medium">Leave Deduct (₹)</span>
                  <input className={readOnlyFieldClass} type="number" readOnly value={formData.leave_deduction} />
                </label>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <label className="text-sm text-white/60">
                  <span className="mb-1.5 block font-medium">Incentive (%)</span>
                  <input className={fieldClass} type="number" name="incentive_percentage" min="0" max="100" step="0.01" placeholder="0" value={formData.incentive_percentage} onChange={handleChange} />
                </label>

                <label className="text-sm text-white/60">
                  <span className="mb-1.5 block font-medium">Incentive Amount (₹)</span>
                  <input className={readOnlyFieldClass} type="number" readOnly value={formData.incentive_amount} />
                </label>
              </div>

              <label className="text-sm text-white/60">
                <span className="mb-1.5 block font-medium">Additional Deduction (₹)</span>
                <input className={fieldClass} type="number" name="additional_deduction" min="0" step="0.01" placeholder="0" value={formData.additional_deduction} onChange={handleChange} />
              </label>

              <label className="text-sm text-emerald-400 md:col-span-2">
                <span className="mb-1.5 block font-bold text-lg">Total Calculated Salary (₹)</span>
                <input className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xl font-bold text-emerald-400 outline-none" type="number" readOnly value={formData.total_salary} />
                {(formData.present_days === 0 && formData.leave_days === 0) && (
                  <p className="mt-2 text-xs text-rose-400">Warning: Attendance not marked for this month. Calculated salary is ₹0.</p>
                )}
              </label>
            </div>
          </section>

          {!editId && (
            <section className={sectionClass}>
              <div className="mb-5 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center"><Briefcase size={15} className="text-violet-400" /></div>
                <h2 className="text-base font-bold text-white">Bank Details</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-white/60">
                  <span className="mb-1.5 block font-medium">Bank Name</span>
                  <input className={readOnlyFieldClass} type="text" readOnly value={formData.bank_name || 'Not provided'} />
                </label>

                <label className="text-sm text-white/60">
                  <span className="mb-1.5 block font-medium">Account Number</span>
                  <input className={readOnlyFieldClass} type="text" readOnly value={formData.account_number || 'Not provided'} />
                </label>

                <label className="text-sm text-white/60">
                  <span className="mb-1.5 block font-medium">IFSC Code</span>
                  <input className={readOnlyFieldClass} type="text" readOnly value={formData.ifsc_code || 'Not provided'} />
                </label>

                <label className="text-sm text-white/60">
                  <span className="mb-1.5 block font-medium">UPI ID</span>
                  <input className={readOnlyFieldClass} type="text" readOnly value={formData.upi_id || 'Not provided'} />
                </label>
              </div>
            </section>
          )}

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button type="button" onClick={resetForm} disabled={loading}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5 transition">
              {editId ? 'Cancel' : 'Reset'}
            </button>

            <button type="submit" disabled={loading || !formData.employee_id || formData.total_salary <= 0 || (formData.alreadyPaid && !editId)}
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <DollarSign size={15} />}
              {loading ? 'Processing...' : (editId ? 'Update Salary' : 'Pay Salary')}
            </button>
          </div>
        </form>
      </Modal>

      {/* <section className={sectionClass}>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-400">
              <Users size={11} /> Employee Overview
            </div>
            <h2 className="text-base font-bold text-white">Employee cards & salary history</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search employee"
                className="w-48 rounded-xl border border-white/10 bg-[#0e1118] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-orange-500/70"
              />
            </div>
            <Select
              options={[
                { value: 'all', label: 'All Months' },
                ...Array.from({ length: 12 }, (_, i) => i + 1).map(month => ({
                  value: month, label: new Date(0, month - 1).toLocaleString('default', { month: 'long' })
                }))
              ]}
              value={{ value: historyMonthFilter, label: historyMonthFilter === 'all' ? 'All Months' : new Date(0, historyMonthFilter - 1).toLocaleString('default', { month: 'long' }) }}
              onChange={(option) => setHistoryMonthFilter(option ? option.value : 'all')}
              styles={customSelectStyles}
              className="w-40"
              isSearchable={false}
            />
            <Select
              options={[
                { value: 'all', label: 'All Years' },
                ...Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => ({
                  value: year, label: String(year)
                }))
              ]}
              value={{ value: historyYearFilter, label: historyYearFilter === 'all' ? 'All Years' : String(historyYearFilter) }}
              onChange={(option) => setHistoryYearFilter(option ? option.value : 'all')}
              styles={customSelectStyles}
              className="w-40"
              isSearchable={false}
            />
            <div className="flex items-center rounded-xl border border-white/10 bg-[#0e1118] p-1">
              <button onClick={() => {
                setEmployeeViewMode("table");
                setSelectedEmployeeId(""); // optional reset
              }} className={`rounded-lg p-2 transition ${employeeViewMode === "table" ? 'bg-orange-500 text-white' : 'text-white/50 hover:text-white'}`} title="Table view"><List size={15} /></button>
              <button onClick={() => setEmployeeViewMode('card')} className={`rounded-lg p-2 transition ${employeeViewMode === 'card' ? 'bg-orange-500 text-white' : 'text-white/50 hover:text-white'}`} title="Card view"><LayoutGrid size={15} /></button>
            </div>
          </div>
        </div>

        {employeeViewMode === "table" ? (
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0e1118]">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-white/40">
                <tr>
                  <th className="px-3 py-2 text-left">S.No</th>
                  <th className="px-3 py-2 text-left">Employee</th>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Pays</th>
                  <th className="px-3 py-2 text-left">Total Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-white/70">
                {filteredEmployees.length === 0 ? (
                  <tr><td colSpan="5" className="px-3 py-4 text-center text-white/40">No employees match this search.</td></tr>
                ) : filteredEmployees.map((emp, i) => {
                  const employeeName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
                  const employeeHistory = history.filter((item) => item.employee_id === emp.employee_id);
                  const totalPaid = employeeHistory.reduce((sum, item) => sum + parseFloat(item.total_salary || 0), 0);
                  return (
                    <tr
                      key={emp.employee_id}
                      onClick={() => setSelectedEmployeeId(emp.employee_id)}
                      className={`cursor-pointer transition ${selectedEmployeeId === emp.employee_id
                          ? "bg-orange-500/10"
                          : "hover:bg-white/5"
                        }`}
                    >
                      <td className="px-3 py-2 text-white/60">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-white">{employeeName || emp.employee_code || 'Unnamed Employee'}</td>
                      <td className="px-3 py-2">{emp.employee_code || 'No code'}</td>
                      <td className="px-3 py-2">{employeeHistory.length}</td>
                      <td className="px-3 py-2 font-semibold text-emerald-400">₹{totalPaid.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredEmployees.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/50">No employees match this search.</div>
            ) : (
              filteredEmployees.map((emp) => {
                const employeeName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
                const employeeHistory = history.filter((item) => item.employee_id === emp.employee_id);
                const totalPaid = employeeHistory.reduce((sum, item) => sum + parseFloat(item.total_salary || 0), 0);
                const isActive = selectedEmployeeId === emp.employee_id;
                return (
                  <button
                    key={emp.employee_id}
                    type="button"
                    onClick={() => setSelectedEmployeeId(emp.employee_id)}
                    className={`rounded-2xl border p-4 text-left transition ${isActive ? 'border-orange-500/50 bg-orange-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{employeeName || emp.employee_code || 'Unnamed Employee'}</p>
                        <p className="text-xs text-white/40">{emp.employee_code || 'No code'}</p>
                      </div>
                      <div className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/60">{employeeHistory.length} pays</div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-white/50">Total salary</span>
                      <span className="font-semibold text-emerald-400">₹{totalPaid.toLocaleString('en-IN')}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#0e1118] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Salary history {selectedEmployeeId ? 'for selected employee' : 'for current filters'}</h3>
            <span className="text-xs text-white/40">{selectedEmployeeHistory.length} record(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-white/40">
                <tr>
                  <th className="px-3 py-2 text-left">Employee</th>
                  <th className="px-3 py-2 text-left">Month</th>
                  <th className="px-3 py-2 text-left">Year</th>
                  <th className="px-3 py-2 text-left">Total Salary</th>
                  <th className="px-3 py-2 text-left">Present / Leave</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-white/70">
                {selectedEmployeeHistory.length === 0 ? (
                  <tr><td colSpan="5" className="px-3 py-4 text-center text-white/40">No salary records found.</td></tr>
                ) : (
                  selectedEmployeeHistory.map((record) => {
                    const emp = employees.find((item) => item.employee_id === record.employee_id);
                    const employeeLabel = `${emp?.first_name || ''} ${emp?.last_name || ''}`.trim() || emp?.employee_code || 'Unknown';
                    return (
                      <tr key={record.id} className="hover:bg-white/5">
                        <td className="px-3 py-2 font-medium text-white">{employeeLabel}</td>
                        <td className="px-3 py-2">{new Date(0, Number(record.salary_month) - 1).toLocaleString('default', { month: 'long' })}</td>
                        <td className="px-3 py-2">{record.salary_year}</td>
                        <td className="px-3 py-2 font-semibold text-emerald-400">₹{parseFloat(record.total_salary || 0).toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2">{record.present_days}/{record.leave_days}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section> */}

      {success && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm px-5 py-3.5 rounded-2xl">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-sm px-5 py-3.5 rounded-2xl">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Salary History Table */}
      <section className={`${sectionClass} mt-10`}>
        <div className="mb-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

          {/* Title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-pink-500/15 flex items-center justify-center">
              <History size={15} className="text-pink-400" />
            </div>

            <div>
              <h2 className="text-base font-bold text-white">
                Salary History
              </h2>

              <p className="text-xs text-white/40 mt-0.5">
                View and manage employee salary records
              </p>
            </div>
          </div>

          {/* Filters + View */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Employee Filter */}
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
              />

              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search employee..."
                className="w-52 rounded-xl border border-white/10 bg-[#0e1118] py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-orange-500/70 transition placeholder:text-white/25"
              />
            </div>

            {/* Month Filter */}
            <Select
              options={[
                { value: 'all', label: 'All Months' },

                ...Array.from({ length: 12 }, (_, i) => ({
                  value: i + 1,
                  label: new Date(
                    0,
                    i
                  ).toLocaleString('default', {
                    month: 'long'
                  })
                }))
              ]}
              value={{
                value: historyMonthFilter,
                label:
                  historyMonthFilter === 'all'
                    ? 'All Months'
                    : new Date(
                      0,
                      Number(historyMonthFilter) - 1
                    ).toLocaleString('default', {
                      month: 'long'
                    })
              }}
              onChange={(option) =>
                setHistoryMonthFilter(
                  option ? option.value : 'all'
                )
              }
              styles={customSelectStyles}
              className="w-40"
              isSearchable={false}
            />

            {/* View Toggle */}
            <div className="flex items-center rounded-xl border border-white/10 bg-[#0e1118] p-1">

              <button
                type="button"
                onClick={() => setHistoryViewMode("table")}
                className={`rounded-lg p-2 transition ${historyViewMode === "table"
                  ? "bg-orange-500 text-white"
                  : "text-white/50 hover:text-white"
                  }`}
                title="Table view"
              >
                <List size={15} />
              </button>

              <button
                type="button"
                onClick={() => setHistoryViewMode("card")}
                className={`rounded-lg p-2 transition ${historyViewMode === "card"
                  ? "bg-orange-500 text-white"
                  : "text-white/50 hover:text-white"
                  }`}
                title="Card view"
              >
                <LayoutGrid size={15} />
              </button>

            </div>

          </div>
        </div>

        {historyViewMode === "card" ? (
          <div className="grid gap-3 md:grid-cols-2">
            {historyLoading ? (
              <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/40">Loading history...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/40">No salary records found.</div>
            ) : filteredHistory.map((record) => (
              <div key={record.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{record.first_name} {record.last_name}</p>
                    <p className="text-xs text-white/40">{record.employee_code}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">{new Date(0, record.salary_month - 1).toLocaleString('default', { month: 'short' })} {record.salary_year}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-white/50">Net Salary</span>
                  <span className="font-semibold text-emerald-400">₹{parseFloat(record.total_salary).toLocaleString('en-IN')}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-white/50">Paid On</span>
                  <span className="text-white/70">{new Date(record.created_at).toLocaleDateString()}</span>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSalaryEmployee(record)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                    title="View Employee Salary History"
                  >
                    <Eye size={14} />
                  </button>
                  <button onClick={() => handleEdit(record)} className="rounded-lg bg-blue-500/10 p-2 text-blue-400"> <Edit size={14} /> </button>
                  <button onClick={() => handleDelete(record)} className="rounded-lg bg-red-500/10 p-2 text-red-400"> <Trash2 size={14} /> </button>
                  <button onClick={() => setSelectedPayslip(record)} className="rounded-lg bg-orange-500/10 px-3 py-2 text-xs font-medium text-orange-400"> <Printer size={13} /> </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-white/70">
              <thead className="bg-white/5 text-white/50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Basic (₹)</th>
                  <th className="px-4 py-3 font-medium">Net Salary (₹)</th>
                  <th className="px-4 py-3 font-medium">Paid On</th>
                  <th className="px-4 py-3 rounded-r-lg font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {historyLoading ? (
                  <tr><td colSpan="6" className="px-4 py-6 text-center text-white/40">Loading history...</td></tr>
                ) : filteredHistory.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-6 text-center text-white/40">No salary records found.</td></tr>
                ) : (
                  filteredHistory.map((record) => (
                    <tr key={record.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{record.first_name} {record.last_name}</div>
                        <div className="text-xs opacity-60">{record.employee_code}</div>
                      </td>
                      <td className="px-4 py-3">{new Date(0, record.salary_month - 1).toLocaleString('default', { month: 'short' })} {record.salary_year}</td>
                      <td className="px-4 py-3">{parseFloat(record.basic_salary).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 font-bold text-emerald-400">{parseFloat(record.total_salary).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">{new Date(record.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedSalaryEmployee(record)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                            title="View Employee Salary History"
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            onClick={() => handleEdit(record)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(record)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => setSelectedPayslip(record)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-400 hover:bg-orange-500/20 transition"
                            title="Payslip"
                          >
                            <Printer size={13} /> Payslip
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Employee Full Salary History Modal */}
      {selectedSalaryEmployee && (
        <Modal
          open={!!selectedSalaryEmployee}
          onClose={() => setSelectedSalaryEmployee(null)}
          title="Employee Salary History"
        >
          <div className="space-y-5">

            {/* Employee Header */}
            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-5">
              <div className="flex items-center justify-between gap-4">

                <div>
                  <p className="text-lg font-bold text-white">
                    {selectedSalaryEmployee.first_name}{' '}
                    {selectedSalaryEmployee.last_name}
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    Employee Code:{' '}
                    {selectedSalaryEmployee.employee_code || 'No Code'}
                  </p>
                </div>

                <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 px-4 py-2 text-right">
                  <p className="text-[10px] uppercase tracking-widest text-orange-400/70">
                    Total Pays
                  </p>

                  <p className="mt-1 text-lg font-bold text-orange-400">
                    {selectedEmployeeSalaryHistory.length}
                  </p>
                </div>

              </div>
            </div>

            {/* Total Salary Summary */}
            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-white/40">
                  Total Salary Paid
                </p>

                <p className="mt-1 text-xl font-bold text-emerald-400">
                  ₹
                  {selectedEmployeeSalaryHistory
                    .reduce(
                      (sum, record) =>
                        sum + parseFloat(record.total_salary || 0),
                      0
                    )
                    .toLocaleString('en-IN')}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-white/40">
                  Salary Records
                </p>

                <p className="mt-1 text-xl font-bold text-white">
                  {selectedEmployeeSalaryHistory.length}
                </p>
              </div>

            </div>

            {/* Full Salary History */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">

              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <div className="flex items-center gap-2">

                  <div className="w-8 h-8 rounded-xl bg-pink-500/15 flex items-center justify-center">
                    <History
                      size={15}
                      className="text-pink-400"
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Complete Salary History
                    </h3>

                    <p className="text-xs text-white/40">
                      All months and years
                    </p>
                  </div>

                </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto">

                {selectedEmployeeSalaryHistory.length === 0 ? (

                  <div className="p-8 text-center text-sm text-white/40">
                    No salary history found for this employee.
                  </div>

                ) : (

                  <div className="divide-y divide-white/5">

                    {selectedEmployeeSalaryHistory.map((record) => {

                      const monthName = new Date(
                        0,
                        Number(record.salary_month) - 1
                      ).toLocaleString('default', {
                        month: 'long'
                      });

                      return (
                        <div
                          key={record.id}
                          className="p-4 hover:bg-white/[0.03] transition"
                        >

                          {/* Month Header */}
                          <div className="flex items-center justify-between gap-3 mb-4">

                            <div>
                              <p className="text-sm font-semibold text-white">
                                {monthName} {record.salary_year}
                              </p>

                              <p className="text-xs text-white/40 mt-1">
                                Paid on{' '}
                                {record.created_at
                                  ? new Date(
                                    record.created_at
                                  ).toLocaleDateString('en-IN')
                                  : '-'}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-[10px] uppercase tracking-wider text-white/40">
                                Net Salary
                              </p>

                              <p className="text-base font-bold text-emerald-400">
                                ₹
                                {parseFloat(
                                  record.total_salary || 0
                                ).toLocaleString('en-IN')}
                              </p>
                            </div>

                          </div>

                          {/* Salary Details */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                            <div className="rounded-xl bg-[#0e1118] border border-white/5 p-3">
                              <p className="text-[10px] text-white/40">
                                Basic
                              </p>

                              <p className="mt-1 text-sm font-semibold text-white">
                                ₹
                                {parseFloat(
                                  record.basic_salary || 0
                                ).toLocaleString('en-IN')}
                              </p>
                            </div>

                            <div className="rounded-xl bg-[#0e1118] border border-white/5 p-3">
                              <p className="text-[10px] text-white/40">
                                Present
                              </p>

                              <p className="mt-1 text-sm font-semibold text-white">
                                {record.present_days || 0}
                              </p>
                            </div>

                            <div className="rounded-xl bg-[#0e1118] border border-white/5 p-3">
                              <p className="text-[10px] text-white/40">
                                Leave
                              </p>

                              <p className="mt-1 text-sm font-semibold text-white">
                                {record.leave_days || 0}
                              </p>
                            </div>

                            <div className="rounded-xl bg-[#0e1118] border border-white/5 p-3">
                              <p className="text-[10px] text-white/40">
                                Incentive
                              </p>

                              <p className="mt-1 text-sm font-semibold text-blue-400">
                                ₹
                                {parseFloat(
                                  record.incentive_amount || 0
                                ).toLocaleString('en-IN')}
                              </p>
                            </div>

                          </div>

                          {/* Deductions */}
                          <div className="mt-3 flex flex-wrap gap-4 text-xs">

                            <span className="text-white/40">
                              Leave Deduction:{' '}
                              <span className="text-red-400">
                                ₹
                                {parseFloat(
                                  record.leave_deduction || 0
                                ).toLocaleString('en-IN')}
                              </span>
                            </span>

                            <span className="text-white/40">
                              Additional Deduction:{' '}
                              <span className="text-red-400">
                                ₹
                                {parseFloat(
                                  record.additional_deduction || 0
                                ).toLocaleString('en-IN')}
                              </span>
                            </span>

                            <span className="text-white/40">
                              Incentive:{' '}
                              <span className="text-blue-400">
                                {record.incentive_percentage || 0}%
                              </span>
                            </span>

                          </div>

                        </div>
                      );
                    })}

                  </div>

                )}

              </div>

            </section>

            {/* Close */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setSelectedSalaryEmployee(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
              >
                Close
              </button>
            </div>

          </div>
        </Modal>
      )}

      {/* Payslip Modal */}
      {selectedPayslip && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-bold text-gray-800">Payslip Preview</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition shadow-sm"
                  >
                    <Printer size={15} />
                    Print
                  </button>
                  <button onClick={() => setSelectedPayslip(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Printable Area */}
              <div className="bg-[#f8fafc] overflow-y-auto" ref={payslipRef}>
                <PayslipTemplate payslip={selectedPayslip} />
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
