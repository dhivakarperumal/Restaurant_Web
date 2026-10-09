import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertCircle, CheckCircle, FolderKanban,
  DollarSign, History, Printer, X, Edit, Trash2, Search, Plus, LayoutGrid, List, Eye
} from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../PrivateRouter/AuthContext';
import { useReactToPrint } from "react-to-print";
import ModalPortal from '../../Componets/CommonComponents/ModalPortal';
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

const fieldClass = 'w-full rounded-xl border border-white/10 bg-[#0e1118] px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500/70 transition placeholder:text-white/20';
const sectionClass = 'rounded-2xl border border-white/8 bg-white/[0.03] p-5';
const readOnlyFieldClass = 'w-full rounded-xl border border-white/5 bg-[#0a0c10] px-3 py-2.5 text-sm text-white/70 outline-none cursor-not-allowed';

const BLANK = {
  project_id: '',
  amount_paid: '',
  payment_mode: '',
  reason_for_payment: '',
  date_of_payment: new Date().toISOString().split('T')[0],
  time_of_payment: new Date().toTimeString().split(' ')[0].slice(0, 5)
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

export default function ProjectPayment() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState(BLANK);
  const [projects, setProjects] = useState([]);
  const [selectedProjectDetails, setSelectedProjectDetails] = useState(null);
  const [projectSummary, setProjectSummary] = useState(null);
  const [history, setHistory] = useState([]);

  const [projectsLoading, setProjectsLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editId, setEditId] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('All');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectViewMode, setProjectViewMode] = useState("card");
  const [historyViewMode, setHistoryViewMode] = useState("table");
  const receiptRef = useRef();
  const [selectedProjectPaymentHistory, setSelectedProjectPaymentHistory] = useState(null);

  const [historyProjectSearch, setHistoryProjectSearch] = useState('');
  const [historyClientSearch, setHistoryClientSearch] = useState('');
  const [historyMonthFilter, setHistoryMonthFilter] = useState('All');

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: selectedReceipt
      ? `Receipt_${selectedReceipt.project_code}_${selectedReceipt.date_of_payment}`
      : "Receipt",
  });

  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const { data } = await api.get('/projects?limit=500&page=1');
      const rows = Array.isArray(data.data) ? data.data : (data.data?.rows || []);
      const uniqueProjects = rows.map((row) => ({
        id: row.id,
        uuid: row.uuid,
        project_name: row.project_name,
        project_code: row.project_code,
        client_name: row.client_name,
        company_name: row.company_name,
        total_project_cost: row.total_project_cost,
        current_status: row.current_status,
        overall_progress: row.overall_progress,
        project_start_date: row.project_start_date,
        estimated_completion_date: row.estimated_completion_date,
      })).sort((a, b) => {
        const nameA = (a.project_name || '').toString().toLowerCase();
        const nameB = (b.project_name || '').toString().toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setProjects(uniqueProjects);
    } catch (err) {
      console.warn('Failed to load projects:', err);
    } finally {
      setProjectsLoading(false);
    }
  };

  // Fetch projects and payment history on mount
  useEffect(() => {
    fetchProjects();
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get('/project-payments');
      if (data.success) {
        setHistory(data.data);
      }
    } catch (err) {
      console.warn("Failed to fetch project payments history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Fetch project details when project selection changes
  useEffect(() => {
    if (!formData.project_id) {
      setSelectedProjectDetails(null);
      setProjectSummary(null);
      return;
    }

    const fetchDetails = async () => {
      setDetailsLoading(true);
      setError('');
      try {
        // Find project from loaded projects
        const proj = projects.find(p => p.id.toString() === formData.project_id.toString());
        if (proj) {
          setSelectedProjectDetails(proj);
        }

        // Fetch summary (total paid, balance)
        const { data } = await api.get(`/project-payments/${formData.project_id}/summary`);
        if (data.success) {
          setProjectSummary(data.data);
        }
      } catch (err) {
        setError(err?.response?.data?.message || err.message || 'Error fetching project details');
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchDetails();
  }, [formData.project_id, projects, success]); // Added success to trigger refetch after update/delete

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.project_id) { setError('Please select a project'); return; }
    if (!formData.amount_paid || formData.amount_paid <= 0) { setError('Amount must be greater than 0'); return; }

    setLoading(true); setError(''); setSuccess('');
    try {
      const payload = {
        project_id: formData.project_id,
        client_name: selectedProjectDetails?.client_name,
        paid_to: 'Q-Techx Solutions',
        amount_paid: parseFloat(formData.amount_paid),
        payment_mode: formData.payment_mode,
        reason_for_payment: formData.reason_for_payment,
        date_of_payment: formData.date_of_payment,
        time_of_payment: formData.time_of_payment,
        created_by: user?.user_id, // Send the UUID of the user
        updated_by: user?.user_id
      };

      let res;
      if (editId) {
        res = await api.put(`/project-payments/${editId}`, payload);
      } else {
        res = await api.post('/project-payments', payload);
      }

      if (!res.data.success) throw new Error(res.data.message || 'Payment failed');

      setSuccess(`Project payment ${editId ? 'updated' : 'recorded'} successfully!`);
      fetchHistory(); // refresh table
      resetForm();
      setShowForm(false);

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to record payment');
    } finally { setLoading(false); }
  };

  const handleEdit = (record) => {
    setEditId(record.uuid);
    setShowForm(true);
    setFormData({
      project_id: record.project_id || '',
      amount_paid: record.amount_paid || '',
      payment_mode: record.payment_mode || '',
      reason_for_payment: record.reason_for_payment || '',
      date_of_payment: record.date_of_payment ? new Date(record.date_of_payment).toISOString().split('T')[0] : '',
      time_of_payment: record.time_of_payment || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (record) => {
    if (!window.confirm("Are you sure you want to delete this project payment? This will adjust the company funds accordingly.")) return;
    try {
      const res = await api.delete(`/project-payments/${record.uuid}`, { data: { updated_by: user?.user_id } });
      if (res.data.success) {
        setSuccess("Project payment deleted.");
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

  const filteredProjects = useMemo(() => {
    const projectTerm = projectSearch.trim().toLowerCase();
    const clientTerm = clientSearch.trim().toLowerCase();
    return projects.filter((project) => {
      const projectName = (project.project_name || '').toLowerCase();
      const clientName = (project.client_name || '').toLowerCase();
      const matchesProject = !projectTerm || projectName.includes(projectTerm);
      const matchesClient = !clientTerm || clientName.includes(clientTerm);
      return matchesProject && matchesClient;
    });
  }, [projects, projectSearch, clientSearch]);

  const filteredProjectHistory = useMemo(() => {
    return history.filter((record) => {
      const matchesMode = modeFilter === 'All' || (record.payment_mode || '').toLowerCase() === modeFilter.toLowerCase();
      const matchesSelected = !selectedProjectId || Number(record.project_id) === Number(selectedProjectId);
      return matchesMode && matchesSelected;
    });
  }, [history, modeFilter, selectedProjectId]);

  const projectTotals = useMemo(() => {
    return history.reduce((acc, record) => {
      const key = String(record.project_id);
      if (!acc[key]) acc[key] = { total: 0, count: 0 };
      acc[key].total += parseFloat(record.amount_paid || 0);
      acc[key].count += 1;
      return acc;
    }, {});
  }, [history]);

  const filteredHistory = useMemo(() => {
    const projectTerm = historyProjectSearch.trim().toLowerCase();
    const clientTerm = historyClientSearch.trim().toLowerCase();

    return history.filter((record) => {
      const projectName = (record.project_name || '').toLowerCase();
      const projectCode = (record.project_code || '').toLowerCase();
      const clientName = (record.client_name || '').toLowerCase();

      const matchesProject =
        !projectTerm ||
        projectName.includes(projectTerm) ||
        projectCode.includes(projectTerm);

      const matchesClient =
        !clientTerm ||
        clientName.includes(clientTerm);

      const paymentMonth = record.date_of_payment
        ? new Date(record.date_of_payment).getMonth() + 1
        : null;

      const matchesMonth =
        historyMonthFilter === 'All' ||
        Number(paymentMonth) === Number(historyMonthFilter);

      return matchesProject && matchesClient && matchesMonth;
    });
  }, [
    history,
    historyProjectSearch,
    historyClientSearch,
    historyMonthFilter
  ]);

  return (
    <div className="space-y-6 text-white pb-10">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        {/* Left */}
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate("/admin/expenses")}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition shrink-0 mt-1"
          >
            <ArrowLeft size={16} />
          </button>

          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-400">
              <FolderKanban size={11} />
              Project Finance
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight">
              Project Payment
            </h1>

            <p className="text-sm text-white/40 mt-0.5">
              Record and manage payments received from clients for ongoing projects.
            </p>
          </div>
        </div>

        {/* Right */}
        <button
          type="button"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
              setError("");
              setSuccess("");
              fetchProjects();
            }
          }}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 self-start"
          style={{ background: "linear-gradient(135deg,#f97316,#ea580c)" }}
        >
          <Plus size={15} />
          {showForm ? "Close Form" : "Record Payment"}
        </button>
      </div>

      <Modal open={showForm} onClose={resetForm} title={editId ? 'Edit Project Payment' : 'Record Project Payment'}>
        <form onSubmit={handleSave} className="space-y-6">
          <section className={sectionClass}>
            <div className="mb-5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center"><FolderKanban size={15} className="text-blue-400" /></div>
              <h2 className="text-base font-bold text-white">Select Project</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-white/60">
                <span className="mb-1.5 block font-medium">Project *</span>
                <Select
                  styles={customSelectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  name="project_id"
                  value={formData.project_id ? {
                    value: formData.project_id,
                    label: (() => {
                      const proj = projects.find(p => String(p.id) === String(formData.project_id));
                      if (!proj) return formData.project_id;
                      return `${proj.project_name || 'Untitled'}${proj.project_code ? ` (${proj.project_code})` : ''}${proj.client_name ? ` - ${proj.client_name}` : ''}`;
                    })()
                  } : null}
                  onChange={(option) => handleChange({ target: { name: 'project_id', value: option ? option.value : '' } })}
                  options={projects.map((proj) => ({
                    value: proj.id,
                    label: `${proj.project_name || 'Untitled Project'}${proj.project_code ? ` (${proj.project_code})` : ''}${proj.client_name ? ` - ${proj.client_name}` : ''}`,
                  }))}
                  placeholder="Select Project"
                  isLoading={projectsLoading}
                  isClearable
                  required
                />
              </label>
            </div>

            {detailsLoading && <p className="mt-4 text-xs text-orange-400 animate-pulse">Loading project details...</p>}

            {selectedProjectDetails && (
              <div className="mt-6 grid gap-4 md:grid-cols-4 bg-white/5 p-4 rounded-xl border border-white/10">
                <div>
                  <span className="block text-xs text-white/50 mb-1">Project Name</span>
                  <span className="font-semibold text-white">{selectedProjectDetails.project_name}</span>
                </div>
                <div>
                  <span className="block text-xs text-white/50 mb-1">Project UUID</span>
                  <span className="font-semibold text-white">{selectedProjectDetails.uuid}</span>
                </div>
                <div>
                  <span className="block text-xs text-white/50 mb-1">Client Name</span>
                  <span className="font-semibold text-white">{selectedProjectDetails.client_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-xs text-white/50 mb-1">Total Project Cost</span>
                  <span className="font-bold text-emerald-400">₹{parseFloat(selectedProjectDetails.total_project_cost || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}

            {projectSummary && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex justify-between items-center">
                  <span className="text-emerald-400 text-sm font-medium">Total Paid So Far</span>
                  <span className="text-xl font-bold text-emerald-400">₹{parseFloat(projectSummary.total_paid || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex justify-between items-center">
                  <span className="text-orange-400 text-sm font-medium">Balance Remaining</span>
                  <span className="text-xl font-bold text-orange-400">₹{parseFloat(projectSummary.balance || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </section>

          <section className={sectionClass}>
            <div className="mb-5 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center"><DollarSign size={15} className="text-emerald-400" /></div>
              <h2 className="text-base font-bold text-white">{editId ? 'Edit Project Payment' : 'Mark Project Payment'}</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm text-white/60">
                <span className="mb-1.5 block font-medium">Amount Paid (₹) *</span>
                <input className={fieldClass} type="number" name="amount_paid" min="1" step="0.01" placeholder="Enter Amount" value={formData.amount_paid} onChange={handleChange} required />
              </label>

              <label className="text-sm text-white/60">
                <span className="mb-1.5 block font-medium">Payment Mode *</span>
                <Select
                  styles={customSelectStyles}
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  name="payment_mode"
                  value={formData.payment_mode ? { value: formData.payment_mode, label: formData.payment_mode } : null}
                  onChange={(option) => handleChange({ target: { name: 'payment_mode', value: option ? option.value : '' } })}
                  options={[
                    { value: 'UPI', label: 'UPI' },
                    { value: 'Cash', label: 'Cash' },
                    { value: 'Bank Transfer', label: 'Bank Transfer' },
                    { value: 'Cheque', label: 'Cheque' },
                    { value: 'Other', label: 'Other' }
                  ]}
                  placeholder="Select Mode"
                  isClearable
                  required
                />
              </label>

              <label className="text-sm text-white/60 lg:col-span-2">
                <span className="mb-1.5 block font-medium">Reason for Payment</span>
                <input className={fieldClass} type="text" name="reason_for_payment" placeholder="e.g. Advance, Milestone 1, Final Settlement" value={formData.reason_for_payment} onChange={handleChange} />
              </label>

              <label className="text-sm text-white/60 lg:col-span-2">
                <span className="mb-1.5 block font-medium">From (Client)</span>
                <input className={readOnlyFieldClass} type="text" readOnly value={selectedProjectDetails?.client_name || ''} placeholder="Autofilled from project" />
              </label>

              <label className="text-sm text-white/60 lg:col-span-2">
                <span className="mb-1.5 block font-medium">To (Admin)</span>
                <input className={readOnlyFieldClass} type="text" readOnly value="Q-Techx Solutions" />
              </label>

              <label className="text-sm text-white/60 lg:col-span-2">
                <span className="mb-1.5 block font-medium">Date of Payment *</span>
                <input className={fieldClass} type="date" name="date_of_payment" value={formData.date_of_payment} onChange={handleChange} required />
              </label>

              <label className="text-sm text-white/60 lg:col-span-2">
                <span className="mb-1.5 block font-medium">Time of Payment *</span>
                <input className={fieldClass} type="time" name="time_of_payment" value={formData.time_of_payment} onChange={handleChange} required />
              </label>
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button type="button" onClick={resetForm}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/5 transition">
              {editId ? 'Cancel' : 'Reset'}
            </button>
            <button type="submit" disabled={loading || !formData.project_id}
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <DollarSign size={15} />}
              {loading ? 'Processing...' : (editId ? 'Update Payment' : 'Record Payment')}
            </button>
          </div>
        </form>
      </Modal>

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

      {/* Payment History Table */}
      <section className={`${sectionClass} mt-10`}>
        <div className="mb-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

  {/* Left: Title */}
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-xl bg-pink-500/15 flex items-center justify-center">
      <History size={15} className="text-pink-400" />
    </div>

    <div>
      <h2 className="text-base font-bold text-white">
        Payment History
      </h2>

      <p className="text-xs text-white/40">
        View and manage all project payments
      </p>
    </div>
  </div>

  {/* Right: Filters + View Toggle */}
  <div className="flex flex-wrap items-center gap-2">

    {/* Project Filter */}
    <div className="relative">
      <Search
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
      />

      <input
        type="text"
        value={historyProjectSearch}
        onChange={(e) => setHistoryProjectSearch(e.target.value)}
        placeholder="Search project..."
        className="w-48 rounded-xl border border-white/10 bg-[#0e1118] py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-orange-500/70 transition placeholder:text-white/25"
      />
    </div>

    {/* Client Filter */}
    <div className="relative">
      <Search
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
      />

      <input
        type="text"
        value={historyClientSearch}
        onChange={(e) => setHistoryClientSearch(e.target.value)}
        placeholder="Search client..."
        className="w-44 rounded-xl border border-white/10 bg-[#0e1118] py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-orange-500/70 transition placeholder:text-white/25"
      />
    </div>

    {/* Month Filter */}
    <div className="w-40">
      <Select
        styles={customSelectStyles}
        value={{
          value: historyMonthFilter,
          label:
            historyMonthFilter === 'All'
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
            option ? option.value : 'All'
          )
        }
        options={[
          {
            value: 'All',
            label: 'All Months'
          },
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
        isSearchable={false}
      />
    </div>

    {/* View Toggle */}
    <div className="flex items-center rounded-xl border border-white/10 bg-[#0e1118] p-1">

      {/* Table */}
      <button
        type="button"
        onClick={() => setHistoryViewMode("table")}
        className={`rounded-lg p-2 transition ${
          historyViewMode === "table"
            ? "bg-orange-500 text-white"
            : "text-white/50 hover:text-white"
        }`}
        title="Table view"
      >
        <List size={15} />
      </button>

      {/* Card */}
      <button
        type="button"
        onClick={() => setHistoryViewMode("card")}
        className={`rounded-lg p-2 transition ${
          historyViewMode === "card"
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

        {historyViewMode === 'card' ? (
          <div className="grid gap-3 md:grid-cols-2">
            {historyLoading ? (
              <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/40">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/40">No payment records found.</div>
            ) : filteredHistory.map((record) => (
              <div key={record.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{record.project_name}</p>
                    <p className="text-xs text-white/40">{record.client_name || 'N/A'}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">{record.payment_mode || '-'}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-white/50">Amount</span>
                  <span className="font-semibold text-emerald-400">₹{parseFloat(record.amount_paid).toLocaleString('en-IN')}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-white/50">Date</span>
                  <span className="text-white/70">{new Date(record.date_of_payment).toLocaleDateString()}</span>
                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProjectPaymentHistory(record)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                    title="View Project Payment History"
                  >
                    <Eye size={14} />
                  </button>
                  <button onClick={() => handleEdit(record)} className="rounded-lg bg-blue-500/10 p-2 text-blue-400"> <Edit size={14} /> </button>
                  <button onClick={() => handleDelete(record)} className="rounded-lg bg-red-500/10 p-2 text-red-400"> <Trash2 size={14} /> </button>
                  <button onClick={() => setSelectedReceipt(record)} className="rounded-lg bg-orange-500/10 px-3 py-2 text-xs font-medium text-orange-400"> <Printer size={13} /> </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-white/70">
              <thead className="bg-white/5 text-white/50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg font-medium">S.No</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Amount (₹)</th>
                  <th className="px-4 py-3 font-medium">Mode</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 rounded-r-lg font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {historyLoading ? (
                  <tr><td colSpan="7" className="px-4 py-6 text-center text-white/40">Loading history...</td></tr>
                ) : filteredHistory.length === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-6 text-center text-white/40">No payment records found.</td></tr>
                ) : (
                  filteredHistory.map((record, i) => (
                    <tr key={record.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3 text-white/60">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{record.project_name}</div>
                        <div className="text-xs opacity-60">{record.uuid}</div>
                      </td>
                      <td className="px-4 py-3">{record.client_name || 'N/A'}</td>
                      <td className="px-4 py-3 font-bold text-emerald-400">{parseFloat(record.amount_paid).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">{record.payment_mode || '-'}</td>
                      <td className="px-4 py-3">{new Date(record.date_of_payment).toLocaleDateString()} {record.time_of_payment}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedProjectPaymentHistory(record)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition"
                            title="View Project Payment History"
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
                            onClick={() => setSelectedReceipt(record)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500/10 px-3 py-1.5 text-xs font-medium text-orange-400 hover:bg-orange-500/20 transition"
                            title="Receipt"
                          >
                            <Printer size={13} /> Receipt
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

      {selectedProjectPaymentHistory && (
        <Modal
          open={!!selectedProjectPaymentHistory}
          onClose={() => setSelectedProjectPaymentHistory(null)}
          title="Project Payment History"
        >
          <div className="space-y-5">

            {/* Project Header */}
            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-5">
              <div className="flex items-center justify-between gap-4">

                <div>
                  <p className="text-lg font-bold text-white">
                    {selectedProjectPaymentHistory.project_name}
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    Project Code:{' '}
                    {selectedProjectPaymentHistory.project_code || 'No Code'}
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    Client:{' '}
                    {selectedProjectPaymentHistory.client_name || 'N/A'}
                  </p>
                </div>

                <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-right">
                  <p className="text-[10px] uppercase tracking-widest text-orange-400/70">
                    Total Payments
                  </p>

                  <p className="mt-1 text-lg font-bold text-orange-400">
                    {
                      history.filter(
                        item =>
                          Number(item.project_id) ===
                          Number(selectedProjectPaymentHistory.project_id)
                      ).length
                    }
                  </p>
                </div>

              </div>
            </div>

            {/* Total Paid */}
            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-white/40">
                  Total Amount Paid
                </p>

                <p className="mt-1 text-xl font-bold text-emerald-400">
                  ₹
                  {history
                    .filter(
                      item =>
                        Number(item.project_id) ===
                        Number(selectedProjectPaymentHistory.project_id)
                    )
                    .reduce(
                      (sum, item) =>
                        sum + parseFloat(item.amount_paid || 0),
                      0
                    )
                    .toLocaleString('en-IN')}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-white/40">
                  Payment Records
                </p>

                <p className="mt-1 text-xl font-bold text-white">
                  {
                    history.filter(
                      item =>
                        Number(item.project_id) ===
                        Number(selectedProjectPaymentHistory.project_id)
                    ).length
                  }
                </p>
              </div>

            </div>

            {/* Complete History */}
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">

              <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
                <div className="w-8 h-8 rounded-xl bg-pink-500/15 flex items-center justify-center">
                  <History size={15} className="text-pink-400" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">
                    Complete Payment History
                  </h3>

                  <p className="text-xs text-white/40">
                    All payments for this project
                  </p>
                </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto">

                {history
                  .filter(
                    item =>
                      Number(item.project_id) ===
                      Number(selectedProjectPaymentHistory.project_id)
                  )
                  .map((record) => (

                    <div
                      key={record.id}
                      className="p-4 border-b border-white/5 hover:bg-white/[0.03] transition"
                    >

                      <div className="flex items-center justify-between gap-4">

                        <div>
                          <p className="text-sm font-semibold text-white">
                            {record.reason_for_payment || 'Project Payment'}
                          </p>

                          <p className="text-xs text-white/40 mt-1">
                            {record.date_of_payment
                              ? new Date(
                                record.date_of_payment
                              ).toLocaleDateString('en-IN')
                              : '-'}
                            {' '}
                            {record.time_of_payment || ''}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-base font-bold text-emerald-400">
                            ₹
                            {parseFloat(
                              record.amount_paid || 0
                            ).toLocaleString('en-IN')}
                          </p>

                          <span className="text-[10px] uppercase tracking-wider text-white/40">
                            {record.payment_mode || '-'}
                          </span>
                        </div>

                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">

                        <div className="rounded-xl bg-[#0e1118] border border-white/5 p-3">
                          <p className="text-[10px] text-white/40">
                            Payment Mode
                          </p>

                          <p className="mt-1 text-sm font-semibold text-white">
                            {record.payment_mode || '-'}
                          </p>
                        </div>

                        <div className="rounded-xl bg-[#0e1118] border border-white/5 p-3">
                          <p className="text-[10px] text-white/40">
                            Paid To
                          </p>

                          <p className="mt-1 text-sm font-semibold text-white">
                            {record.paid_to || 'Admin'}
                          </p>
                        </div>

                      </div>

                    </div>

                  ))}

              </div>

            </section>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProjectPaymentHistory(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
              >
                Close
              </button>
            </div>

          </div>
        </Modal>
      )}

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-bold text-gray-800">Payment Receipt Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition shadow-sm"
                >
                  <Printer size={15} />
                  Print
                </button>
                <button onClick={() => setSelectedReceipt(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="p-8 overflow-y-auto bg-white text-gray-800" ref={receiptRef}>
              <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
                <div>
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">Q-Techx Solutions</h1>
                  <p className="text-sm text-gray-500 mt-1">123 Tech Avenue, Innovation Park</p>
                  <p className="text-sm text-gray-500">City, State, ZIP</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-bold text-orange-600 uppercase tracking-widest">Payment Receipt</h2>
                  <p className="text-sm font-medium text-gray-600 mt-1">
                    Date: {new Date(selectedReceipt.date_of_payment).toLocaleDateString()}
                  </p>
                  <p className="text-sm font-medium text-gray-600">
                    Time: {selectedReceipt.time_of_payment}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-10 gap-y-4 mb-8 text-sm">
                <div>
                  <span className="text-gray-500 block mb-1">Received From (Client)</span>
                  <span className="font-bold text-base">{selectedReceipt.client_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Received By (Admin)</span>
                  <span className="font-bold text-base">{selectedReceipt.paid_to || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Project Name</span>
                  <span className="font-semibold">{selectedReceipt.project_name}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Project UUID</span>
                  <span className="font-semibold">{selectedReceipt.uuid}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Payment Mode</span>
                  <span className="font-semibold">{selectedReceipt.payment_mode || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block mb-1">Reason for Payment</span>
                  <span className="font-semibold">{selectedReceipt.reason_for_payment || '-'}</span>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
                <h3 className="font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4">PAYMENT SUMMARY</h3>

                <div className="flex justify-between text-sm mb-3">
                  <span className="text-gray-600">Total Project Cost</span>
                  <span className="font-medium">₹{parseFloat(selectedReceipt.total_project_cost || 0).toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between items-center text-base mb-3 py-2 border-y border-gray-200">
                  <span className="font-bold text-gray-800">Amount Paid Now</span>
                  <span className="font-black text-xl text-emerald-600">₹{parseFloat(selectedReceipt.amount_paid).toLocaleString('en-IN')}</span>
                </div>

                <p className="text-xs text-gray-500 italic mt-2">
                  * Note: This receipt acknowledges the payment received as per the details above. Balance amount may reflect other payments made separately.
                </p>
              </div>

              <div className="mt-12 pt-8 flex justify-between">
                <div className="text-center">
                  <div className="w-40 border-b border-gray-400 mb-2"></div>
                  <span className="text-xs text-gray-500 font-medium">Client Signature</span>
                </div>
                <div className="text-center">
                  <div className="w-40 border-b border-gray-400 mb-2"></div>
                  <span className="text-xs text-gray-500 font-medium">Authorized Signatory</span>
                </div>
              </div>
              <p className="text-center text-xs text-gray-400 mt-8 italic">This is a system generated document and does not require a physical signature.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
