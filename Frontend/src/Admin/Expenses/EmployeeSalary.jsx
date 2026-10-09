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
import ModalPortal from '../../CommonComponents/ModalPortal';

const fieldClass = 'w-full rounded-xl border border-[#e7e0d8] bg-[#f8f7f4] px-3 py-2.5 text-sm text-[#1f3228] outline-none focus:border-[#d4a843] transition placeholder:text-[#929b94]';
const sectionClass = 'rounded-2xl border border-[#e7e0d8] bg-white p-5';
const readOnlyFieldClass = 'w-full rounded-xl border border-[#e7e0d8] bg-[#f2f3f0] px-3 py-2.5 text-sm text-[#56645b] outline-none cursor-not-allowed';

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: '#f8f7f4',
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
      ? '#d4a843'
      : state.isFocused
        ? 'rgba(212,168,67,.16)'
        : '#ffffff',
    color: '#1f3228',
    cursor: 'pointer',
    ':active': {
      backgroundColor: '#f2f3f0',
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

function PayslipTemplate({ payslip }) {
  const currency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <div className="mx-auto my-6 max-w-2xl bg-white p-8 text-[#1f3228]">
      <div className="border-b border-[#e7e0d8] pb-5 text-center">
        <h2 className="text-xl font-bold">Restaurant Salary Slip</h2>
        <p className="mt-1 text-sm text-[#748078]">
          {new Date(0, Number(payslip.salary_month) - 1).toLocaleString('default', { month: 'long' })} {payslip.salary_year}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 border-b border-[#e7e0d8] py-5 text-sm">
        <p><span className="text-[#748078]">Employee:</span> {payslip.first_name} {payslip.last_name}</p>
        <p><span className="text-[#748078]">Employee code:</span> {payslip.employee_code || '—'}</p>
        <p><span className="text-[#748078]">Present days:</span> {payslip.present_days ?? '—'}</p>
        <p><span className="text-[#748078]">Leave days:</span> {payslip.leave_days ?? '—'}</p>
      </div>
      <div className="space-y-3 py-5 text-sm">
        <div className="flex justify-between"><span>Basic salary</span><span>{currency(payslip.basic_salary)}</span></div>
        <div className="flex justify-between"><span>Incentive</span><span>{currency(payslip.incentive_amount)}</span></div>
        <div className="flex justify-between"><span>Leave deduction</span><span>- {currency(payslip.leave_deduction)}</span></div>
        <div className="flex justify-between"><span>Additional deduction</span><span>- {currency(payslip.additional_deduction)}</span></div>
      </div>
      <div className="flex justify-between border-t-2 border-[#1f3228] pt-4 text-base font-bold">
        <span>Net salary</span><span>{currency(payslip.total_salary)}</span>
      </div>
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
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
    <div className="space-y-6 text-[#1f3228] pb-10">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        {/* Left Side */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate("/admin/expenses")}
            className="w-9 h-9 rounded-xl bg-[#f8f7f4] border border-[#e7e0d8] flex items-center justify-center text-[#748078] hover:text-[#1f3228] hover:bg-[#f2f3f0] transition shrink-0 mt-1"
          >
            <ArrowLeft size={16} />
          </button>

          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#1f3228]/20 bg-[#1f3228]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#1f3228]">
              <DollarSign size={11} />
              Salary Management
            </div>

            <h1 className="text-2xl font-bold text-[#1f3228] tracking-tight">
              Employee Salary
            </h1>

            <p className="text-sm text-[#748078] mt-0.5">
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
          style={{ background: "linear-gradient(135deg,#1f3228,#28523c)" }}
        >
          <Plus size={15} />
          {showForm ? "Close Form" : "Record Payment"}
        </button>
      </div>

      <Modal open={showForm} onClose={resetForm} title={editId ? 'Edit Salary Payment' : 'Record Salary Payment'}>
        <form onSubmit={handleSave} className="space-y-6">
          <section className={sectionClass}>
            <div className="mb-5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#1f3228]/10 flex items-center justify-center"><Users size={15} className="text-[#28523c]" /></div>
              <h2 className="text-base font-bold text-[#1f3228]">{editId ? 'Edit Details' : 'Select Details'}</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm text-[#56645b]">
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

              <label className="text-sm text-[#56645b]">
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

              <label className="text-sm text-[#56645b]">
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
            {detailsLoading && <p className="mt-4 text-xs text-[#a98026] animate-pulse">Loading employee salary details...</p>}
          </section>

          <section className={sectionClass}>
            <div className="mb-5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#d4a843]/15 flex items-center justify-center"><DollarSign size={15} className="text-[#a98026]" /></div>
              <h2 className="text-base font-bold text-[#1f3228]">Salary Calculation</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-[#56645b]">
                <span className="mb-1.5 block font-medium">Basic Salary (₹)</span>
                <input className={readOnlyFieldClass} type="number" readOnly value={formData.basic_salary} />
              </label>

              <div className="grid gap-4 grid-cols-3">
                <label className="text-sm text-[#56645b]">
                  <span className="mb-1.5 block font-medium">Present Days</span>
                  <input className={readOnlyFieldClass} type="number" readOnly value={formData.present_days} />
                </label>

                <label className="text-sm text-[#56645b]">
                  <span className="mb-1.5 block font-medium">Leave Days</span>
                  <input className={readOnlyFieldClass} type="number" readOnly value={formData.leave_days} />
                </label>

                <label className="text-sm text-[#56645b]">
                  <span className="mb-1.5 block font-medium">Leave Deduct (₹)</span>
                  <input className={readOnlyFieldClass} type="number" readOnly value={formData.leave_deduction} />
                </label>
              </div>

              <div className="grid gap-4 grid-cols-2">
                <label className="text-sm text-[#56645b]">
                  <span className="mb-1.5 block font-medium">Incentive (%)</span>
                  <input className={fieldClass} type="number" name="incentive_percentage" min="0" max="100" step="0.01" placeholder="0" value={formData.incentive_percentage} onChange={handleChange} />
                </label>

                <label className="text-sm text-[#56645b]">
                  <span className="mb-1.5 block font-medium">Incentive Amount (₹)</span>
                  <input className={readOnlyFieldClass} type="number" readOnly value={formData.incentive_amount} />
                </label>
              </div>

              <label className="text-sm text-[#56645b]">
                <span className="mb-1.5 block font-medium">Additional Deduction (₹)</span>
                <input className={fieldClass} type="number" name="additional_deduction" min="0" step="0.01" placeholder="0" value={formData.additional_deduction} onChange={handleChange} />
              </label>

              <label className="text-sm text-[#1f3228] md:col-span-2">
                <span className="mb-1.5 block font-bold text-lg">Total Calculated Salary (₹)</span>
                <input className="w-full rounded-xl border border-[#1f3228]/30 bg-[#1f3228]/10 px-4 py-3 text-xl font-bold text-[#1f3228] outline-none" type="number" readOnly value={formData.total_salary} />
                {(formData.present_days === 0 && formData.leave_days === 0) && (
                  <p className="mt-2 text-xs text-rose-700">Warning: Attendance not marked for this month. Calculated salary is ₹0.</p>
                )}
              </label>
            </div>
          </section>

          {!editId && (
            <section className={sectionClass}>
              <div className="mb-5 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#1f3228]/10 flex items-center justify-center"><Briefcase size={15} className="text-[#28523c]" /></div>
                <h2 className="text-base font-bold text-[#1f3228]">Bank Details</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm text-[#56645b]">
                  <span className="mb-1.5 block font-medium">Bank Name</span>
                  <input className={readOnlyFieldClass} type="text" readOnly value={formData.bank_name || 'Not provided'} />
                </label>

                <label className="text-sm text-[#56645b]">
                  <span className="mb-1.5 block font-medium">Account Number</span>
                  <input className={readOnlyFieldClass} type="text" readOnly value={formData.account_number || 'Not provided'} />
                </label>

                <label className="text-sm text-[#56645b]">
                  <span className="mb-1.5 block font-medium">IFSC Code</span>
                  <input className={readOnlyFieldClass} type="text" readOnly value={formData.ifsc_code || 'Not provided'} />
                </label>

                <label className="text-sm text-[#56645b]">
                  <span className="mb-1.5 block font-medium">UPI ID</span>
                  <input className={readOnlyFieldClass} type="text" readOnly value={formData.upi_id || 'Not provided'} />
                </label>
              </div>
            </section>
          )}

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button type="button" onClick={resetForm} disabled={loading}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#44534a] hover:bg-[#f8f7f4] transition">
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
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#1f3228]/20 bg-[#1f3228]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#28523c]">
              <Users size={11} /> Employee Overview
            </div>
            <h2 className="text-base font-bold text-[#1f3228]">Employee cards & salary history</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#818a83]" />
              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search employee"
                className="w-48 rounded-xl border border-[#e7e0d8] bg-[#f8f7f4] py-2 pl-9 pr-3 text-sm text-[#1f3228] outline-none focus:border-[#d4a843]"
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
            <div className="flex items-center rounded-xl border border-[#e7e0d8] bg-[#f8f7f4] p-1">
              <button onClick={() => {
                setEmployeeViewMode("table");
                setSelectedEmployeeId(""); // optional reset
              }} className={`rounded-lg p-2 transition ${employeeViewMode === "table" ? 'bg-[#d4a843] text-[#1f3228]' : 'text-[#56645b] hover:text-[#1f3228]'}`} title="Table view"><List size={15} /></button>
              <button onClick={() => setEmployeeViewMode('card')} className={`rounded-lg p-2 transition ${employeeViewMode === 'card' ? 'bg-[#d4a843] text-[#1f3228]' : 'text-[#56645b] hover:text-[#1f3228]'}`} title="Card view"><LayoutGrid size={15} /></button>
            </div>
          </div>
        </div>

        {employeeViewMode === "table" ? (
          <div className="overflow-x-auto rounded-2xl border border-[#e7e0d8] bg-[#f8f7f4]">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f8f7f4] text-[#748078]">
                <tr>
                  <th className="px-3 py-2 text-left">S.No</th>
                  <th className="px-3 py-2 text-left">Employee</th>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Pays</th>
                  <th className="px-3 py-2 text-left">Total Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7e0d8] text-[#44534a]">
                {filteredEmployees.length === 0 ? (
                  <tr><td colSpan="5" className="px-3 py-4 text-center text-[#748078]">No employees match this search.</td></tr>
                ) : filteredEmployees.map((emp, i) => {
                  const employeeName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
                  const employeeHistory = history.filter((item) => item.employee_id === emp.employee_id);
                  const totalPaid = employeeHistory.reduce((sum, item) => sum + parseFloat(item.total_salary || 0), 0);
                  return (
                    <tr
                      key={emp.employee_id}
                      onClick={() => setSelectedEmployeeId(emp.employee_id)}
                      className={`cursor-pointer transition ${selectedEmployeeId === emp.employee_id
                          ? "bg-[#d4a843]/15"
                          : "hover:bg-[#f8f7f4]"
                        }`}
                    >
                      <td className="px-3 py-2 text-[#56645b]">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-[#1f3228]">{employeeName || emp.employee_code || 'Unnamed Employee'}</td>
                      <td className="px-3 py-2">{emp.employee_code || 'No code'}</td>
                      <td className="px-3 py-2">{employeeHistory.length}</td>
                      <td className="px-3 py-2 font-semibold text-[#1f3228]">₹{totalPaid.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredEmployees.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-[#e7e0d8] bg-[#f8f7f4] p-4 text-sm text-[#56645b]">No employees match this search.</div>
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
                    className={`rounded-2xl border p-4 text-left transition ${isActive ? 'border-[#d4a843]/50 bg-[#d4a843]/15' : 'border-[#e7e0d8] bg-[#f8f7f4] hover:bg-[#f2f3f0]'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[#1f3228]">{employeeName || emp.employee_code || 'Unnamed Employee'}</p>
                        <p className="text-xs text-[#748078]">{emp.employee_code || 'No code'}</p>
                      </div>
                      <div className="rounded-full bg-[#f2f3f0] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#56645b]">{employeeHistory.length} pays</div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-[#56645b]">Total salary</span>
                      <span className="font-semibold text-[#1f3228]">₹{totalPaid.toLocaleString('en-IN')}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-[#e7e0d8] bg-[#f8f7f4] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1f3228]">Salary history {selectedEmployeeId ? 'for selected employee' : 'for current filters'}</h3>
            <span className="text-xs text-[#748078]">{selectedEmployeeHistory.length} record(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f8f7f4] text-[#748078]">
                <tr>
                  <th className="px-3 py-2 text-left">Employee</th>
                  <th className="px-3 py-2 text-left">Month</th>
                  <th className="px-3 py-2 text-left">Year</th>
                  <th className="px-3 py-2 text-left">Total Salary</th>
                  <th className="px-3 py-2 text-left">Present / Leave</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7e0d8] text-[#44534a]">
                {selectedEmployeeHistory.length === 0 ? (
                  <tr><td colSpan="5" className="px-3 py-4 text-center text-[#748078]">No salary records found.</td></tr>
                ) : (
                  selectedEmployeeHistory.map((record) => {
                    const emp = employees.find((item) => item.employee_id === record.employee_id);
                    const employeeLabel = `${emp?.first_name || ''} ${emp?.last_name || ''}`.trim() || emp?.employee_code || 'Unknown';
                    return (
                      <tr key={record.id} className="hover:bg-[#f8f7f4]">
                        <td className="px-3 py-2 font-medium text-[#1f3228]">{employeeLabel}</td>
                        <td className="px-3 py-2">{new Date(0, Number(record.salary_month) - 1).toLocaleString('default', { month: 'long' })}</td>
                        <td className="px-3 py-2">{record.salary_year}</td>
                        <td className="px-3 py-2 font-semibold text-[#1f3228]">₹{parseFloat(record.total_salary || 0).toLocaleString('en-IN')}</td>
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
        <div className="flex items-center gap-3 bg-[#1f3228]/10 border border-[#1f3228]/20 text-[#1f3228] text-sm px-5 py-3.5 rounded-2xl">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-5 py-3.5 rounded-2xl">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Salary History Table */}
      <section className={`${sectionClass} mt-10`}>
        <div className="mb-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

          {/* Title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#d4a843]/15 flex items-center justify-center">
              <History size={15} className="text-[#a98026]" />
            </div>

            <div>
              <h2 className="text-base font-bold text-[#1f3228]">
                Salary History
              </h2>

              <p className="text-xs text-[#748078] mt-0.5">
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
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#818a83]"
              />

              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search employee..."
                className="w-52 rounded-xl border border-[#e7e0d8] bg-[#f8f7f4] py-2.5 pl-9 pr-3 text-sm text-[#1f3228] outline-none focus:border-[#d4a843] transition placeholder:text-[#929b94]"
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
            <div className="flex items-center rounded-xl border border-[#e7e0d8] bg-[#f8f7f4] p-1">

              <button
                type="button"
                onClick={() => setHistoryViewMode("table")}
                className={`rounded-lg p-2 transition ${historyViewMode === "table"
                  ? "bg-[#d4a843] text-[#1f3228]"
                  : "text-[#56645b] hover:text-[#1f3228]"
                  }`}
                title="Table view"
              >
                <List size={15} />
              </button>

              <button
                type="button"
                onClick={() => setHistoryViewMode("card")}
                className={`rounded-lg p-2 transition ${historyViewMode === "card"
                  ? "bg-[#d4a843] text-[#1f3228]"
                  : "text-[#56645b] hover:text-[#1f3228]"
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
              <div className="md:col-span-2 rounded-2xl border border-[#e7e0d8] bg-[#f8f7f4] p-6 text-center text-[#748078]">Loading history...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="md:col-span-2 rounded-2xl border border-[#e7e0d8] bg-[#f8f7f4] p-6 text-center text-[#748078]">No salary records found.</div>
            ) : filteredHistory.map((record) => (
              <div key={record.id} className="rounded-2xl border border-[#e7e0d8] bg-[#f8f7f4] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#1f3228]">{record.first_name} {record.last_name}</p>
                    <p className="text-xs text-[#748078]">{record.employee_code}</p>
                  </div>
                  <span className="rounded-full bg-[#1f3228]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#1f3228]">{new Date(0, record.salary_month - 1).toLocaleString('default', { month: 'short' })} {record.salary_year}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-[#56645b]">Net Salary</span>
                  <span className="font-semibold text-[#1f3228]">₹{parseFloat(record.total_salary).toLocaleString('en-IN')}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-[#56645b]">Paid On</span>
                  <span className="text-[#44534a]">{new Date(record.created_at).toLocaleDateString()}</span>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSalaryEmployee(record)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#1f3228]/10 text-[#1f3228] hover:bg-[#1f3228]/15 transition"
                    title="View Employee Salary History"
                  >
                    <Eye size={14} />
                  </button>
                  <button onClick={() => handleEdit(record)} className="rounded-lg bg-[#1f3228]/10 p-2 text-[#28523c]"> <Edit size={14} /> </button>
                  <button onClick={() => handleDelete(record)} className="rounded-lg bg-rose-50 p-2 text-rose-700"> <Trash2 size={14} /> </button>
                  <button onClick={() => setSelectedPayslip(record)} className="rounded-lg bg-[#d4a843]/15 px-3 py-2 text-xs font-medium text-[#a98026]"> <Printer size={13} /> </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#44534a]">
              <thead className="bg-[#f8f7f4] text-[#56645b]">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Basic (₹)</th>
                  <th className="px-4 py-3 font-medium">Net Salary (₹)</th>
                  <th className="px-4 py-3 font-medium">Paid On</th>
                  <th className="px-4 py-3 rounded-r-lg font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ede7]">
                {historyLoading ? (
                  <tr><td colSpan="6" className="px-4 py-6 text-center text-[#748078]">Loading history...</td></tr>
                ) : filteredHistory.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-6 text-center text-[#748078]">No salary records found.</td></tr>
                ) : (
                  filteredHistory.map((record) => (
                    <tr key={record.id} className="hover:bg-[#f8f7f4] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#1f3228]">{record.first_name} {record.last_name}</div>
                        <div className="text-xs opacity-60">{record.employee_code}</div>
                      </td>
                      <td className="px-4 py-3">{new Date(0, record.salary_month - 1).toLocaleString('default', { month: 'short' })} {record.salary_year}</td>
                      <td className="px-4 py-3">{parseFloat(record.basic_salary).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 font-bold text-[#1f3228]">{parseFloat(record.total_salary).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">{new Date(record.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedSalaryEmployee(record)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#1f3228]/10 text-[#1f3228] hover:bg-[#1f3228]/15 transition"
                            title="View Employee Salary History"
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            onClick={() => handleEdit(record)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#1f3228]/10 text-[#28523c] hover:bg-[#1f3228]/15 transition"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(record)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => setSelectedPayslip(record)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#d4a843]/15 px-3 py-1.5 text-xs font-medium text-[#a98026] hover:bg-[#d4a843]/20 transition"
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
            <div className="rounded-2xl border border-[#d4a843]/30 bg-[#d4a843]/15 p-5">
              <div className="flex items-center justify-between gap-4">

                <div>
                  <p className="text-lg font-bold text-[#1f3228]">
                    {selectedSalaryEmployee.first_name}{' '}
                    {selectedSalaryEmployee.last_name}
                  </p>

                  <p className="mt-1 text-xs text-[#748078]">
                    Employee Code:{' '}
                    {selectedSalaryEmployee.employee_code || 'No Code'}
                  </p>
                </div>

                <div className="rounded-xl bg-[#d4a843]/15 border border-[#d4a843]/30 px-4 py-2 text-right">
                  <p className="text-[10px] uppercase tracking-widest text-[#a98026]">
                    Total Pays
                  </p>

                  <p className="mt-1 text-lg font-bold text-[#a98026]">
                    {selectedEmployeeSalaryHistory.length}
                  </p>
                </div>

              </div>
            </div>

            {/* Total Salary Summary */}
            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-2xl border border-[#e7e0d8] bg-white p-4">
                <p className="text-xs text-[#748078]">
                  Total Salary Paid
                </p>

                <p className="mt-1 text-xl font-bold text-[#1f3228]">
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

              <div className="rounded-2xl border border-[#e7e0d8] bg-white p-4">
                <p className="text-xs text-[#748078]">
                  Salary Records
                </p>

                <p className="mt-1 text-xl font-bold text-[#1f3228]">
                  {selectedEmployeeSalaryHistory.length}
                </p>
              </div>

            </div>

            {/* Full Salary History */}
            <section className="rounded-2xl border border-[#e7e0d8] bg-white overflow-hidden">

              <div className="flex items-center justify-between px-5 py-4 border-b border-[#e7e0d8]">
                <div className="flex items-center gap-2">

                  <div className="w-8 h-8 rounded-xl bg-[#d4a843]/15 flex items-center justify-center">
                    <History
                      size={15}
                      className="text-[#a98026]"
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#1f3228]">
                      Complete Salary History
                    </h3>

                    <p className="text-xs text-[#748078]">
                      All months and years
                    </p>
                  </div>

                </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto">

                {selectedEmployeeSalaryHistory.length === 0 ? (

                  <div className="p-8 text-center text-sm text-[#748078]">
                    No salary history found for this employee.
                  </div>

                ) : (

                  <div className="divide-y divide-[#f0ede7]">

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
                          className="p-4 hover:bg-white transition"
                        >

                          {/* Month Header */}
                          <div className="flex items-center justify-between gap-3 mb-4">

                            <div>
                              <p className="text-sm font-semibold text-[#1f3228]">
                                {monthName} {record.salary_year}
                              </p>

                              <p className="text-xs text-[#748078] mt-1">
                                Paid on{' '}
                                {record.created_at
                                  ? new Date(
                                    record.created_at
                                  ).toLocaleDateString('en-IN')
                                  : '-'}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-[10px] uppercase tracking-wider text-[#748078]">
                                Net Salary
                              </p>

                              <p className="text-base font-bold text-[#1f3228]">
                                ₹
                                {parseFloat(
                                  record.total_salary || 0
                                ).toLocaleString('en-IN')}
                              </p>
                            </div>

                          </div>

                          {/* Salary Details */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                            <div className="rounded-xl bg-[#f8f7f4] border border-[#f0ede7] p-3">
                              <p className="text-[10px] text-[#748078]">
                                Basic
                              </p>

                              <p className="mt-1 text-sm font-semibold text-[#1f3228]">
                                ₹
                                {parseFloat(
                                  record.basic_salary || 0
                                ).toLocaleString('en-IN')}
                              </p>
                            </div>

                            <div className="rounded-xl bg-[#f8f7f4] border border-[#f0ede7] p-3">
                              <p className="text-[10px] text-[#748078]">
                                Present
                              </p>

                              <p className="mt-1 text-sm font-semibold text-[#1f3228]">
                                {record.present_days || 0}
                              </p>
                            </div>

                            <div className="rounded-xl bg-[#f8f7f4] border border-[#f0ede7] p-3">
                              <p className="text-[10px] text-[#748078]">
                                Leave
                              </p>

                              <p className="mt-1 text-sm font-semibold text-[#1f3228]">
                                {record.leave_days || 0}
                              </p>
                            </div>

                            <div className="rounded-xl bg-[#f8f7f4] border border-[#f0ede7] p-3">
                              <p className="text-[10px] text-[#748078]">
                                Incentive
                              </p>

                              <p className="mt-1 text-sm font-semibold text-[#28523c]">
                                ₹
                                {parseFloat(
                                  record.incentive_amount || 0
                                ).toLocaleString('en-IN')}
                              </p>
                            </div>

                          </div>

                          {/* Deductions */}
                          <div className="mt-3 flex flex-wrap gap-4 text-xs">

                            <span className="text-[#748078]">
                              Leave Deduction:{' '}
                              <span className="text-rose-700">
                                ₹
                                {parseFloat(
                                  record.leave_deduction || 0
                                ).toLocaleString('en-IN')}
                              </span>
                            </span>

                            <span className="text-[#748078]">
                              Additional Deduction:{' '}
                              <span className="text-rose-700">
                                ₹
                                {parseFloat(
                                  record.additional_deduction || 0
                                ).toLocaleString('en-IN')}
                              </span>
                            </span>

                            <span className="text-[#748078]">
                              Incentive:{' '}
                              <span className="text-[#28523c]">
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
                className="rounded-xl border border-[#e7e0d8] bg-[#f8f7f4] px-5 py-2.5 text-sm font-medium text-[#44534a] hover:bg-[#f2f3f0] hover:text-[#1f3228] transition"
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
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-[#f8f7f4]">
                <h3 className="font-bold text-[#1f3228]">Payslip Preview</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1f3228] px-4 py-2 text-sm font-medium text-white hover:bg-[#28523c] transition shadow-sm"
                  >
                    <Printer size={15} />
                    Print
                  </button>
                  <button onClick={() => setSelectedPayslip(null)} className="p-2 text-[#748078] hover:text-[#56645b] hover:bg-[#f2f3f0] rounded-lg transition">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Printable Area */}
              <div className="bg-[#f8f7f4] overflow-y-auto" ref={payslipRef}>
                <PayslipTemplate payslip={selectedPayslip} />
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
