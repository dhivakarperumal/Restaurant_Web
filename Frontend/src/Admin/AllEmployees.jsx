import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bike, BriefcaseBusiness, Eye, LayoutGrid, Pencil, Search, Table2, Trash2, UserCheck, UserRound, UserRoundPlus, Users, UtensilsCrossed, X } from "lucide-react";
import api from "../api";
import EmployeeDocument from "./EmployeeDocument";
import AssignTableModal from "./AssignTableModal";
import ViewEmployeeModal from "./ViewEmployeeModal";

const AllEmployees = () => {
  const location = useLocation();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [deletingEmployeeId, setDeletingEmployeeId] = useState("");
  const [actionError, setActionError] = useState("");
  const [selectedEmployeeType, setSelectedEmployeeType] = useState("All Types");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [sortBy, setSortBy] = useState("latest");
  const [viewMode, setViewMode] = useState("table");

  // State for Assign Tables modal
  const [assignModalServer, setAssignModalServer] = useState(null);
  const [serverTableCounts, setServerTableCounts] = useState({});

  const fetchServerTableCounts = async () => {
    try {
      const res = await api.get("/server-tables");
      if (res.data?.success) {
        const counts = {};
        (res.data.tables || []).forEach((t) => {
          if (t.assigned_server_id) {
            counts[t.assigned_server_id] = (counts[t.assigned_server_id] || 0) + 1;
          }
        });
        setServerTableCounts(counts);
      }
    } catch (tableErr) {
      console.error("Could not load table assignments count:", tableErr);
    }
  };

  useEffect(() => {
    fetchServerTableCounts();
  }, []);

  // Auto-open modal if navigated from Add Server with state
  useEffect(() => {
    if (location.state?.assignServer) {
      setAssignModalServer(location.state.assignServer);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    let isMounted = true;
    api.get("/employees")
      .then((response) => {
        if (isMounted) setEmployees(response.data?.employees || []);
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.response?.data?.message || "Employees could not be loaded.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const viewEmployee = async (employeeId) => {
    setSelectedEmployee(null);
    setDetailsError("");
    setDetailsLoading(true);
    try {
      const response = await api.get(`/employees/${encodeURIComponent(employeeId)}`);
      setSelectedEmployee(response.data?.employee || null);
    } catch (requestError) {
      setDetailsError(requestError.response?.data?.message || "Employee details could not be loaded.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const deleteEmployee = async (employee) => {
    if (!window.confirm(`Delete ${employee.full_name}'s employee record? This also removes their account.`)) return;
    setActionError("");
    setDeletingEmployeeId(employee.employee_id);
    try {
      await api.delete(`/employees/${encodeURIComponent(employee.employee_id)}`);
      setEmployees((currentEmployees) => currentEmployees.filter(
        (item) => item.employee_id !== employee.employee_id,
      ));
      if (selectedEmployee?.employee_id === employee.employee_id) setSelectedEmployee(null);
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || "Employee could not be deleted.");
    } finally {
      setDeletingEmployeeId("");
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const employeeTypes = [...new Set(employees.map((employee) => employee.employee_type).filter(Boolean))].sort();
  const activeEmployeeCount = employees.filter((employee) => employee.status === "Active").length;
  const inactiveEmployeeCount = employees.length - activeEmployeeCount;
  const visibleEmployees = employees
    .filter((employee) => {
      const matchesSearch = [
        employee.id,
        employee.full_name,
        employee.employee_id,
        employee.employee_type,
        employee.email,
        employee.phone_number,
      ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
      const matchesType = selectedEmployeeType === "All Types" || employee.employee_type === selectedEmployeeType;
      const matchesStatus = selectedStatus === "All Status" || employee.status === selectedStatus;
      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((first, second) => {
      if (sortBy === "name") return String(first.full_name || "").localeCompare(String(second.full_name || ""));
      if (sortBy === "id") return Number(first.id || 0) - Number(second.id || 0);
      return new Date(second.created_at || 0) - new Date(first.created_at || 0);
    });

  const statCards = [
    { title: "Total Employees", value: employees.length, icon: Users, bg: "bg-[#22c55e]", hint: "All employee records" },
    { title: "Active Employees", value: activeEmployeeCount, icon: UserCheck, bg: "bg-[#3b82f6]", hint: "Currently active" },
    { title: "Inactive Employees", value: inactiveEmployeeCount, icon: UserRound, bg: "bg-[#f59e0b]", hint: "Not currently active" },
    { title: "Employee Types", value: employeeTypes.length, icon: BriefcaseBusiness, bg: "bg-[#8b5cf6]", hint: "Roles represented" },
  ];

  const serverCount = employees.filter((e) => e.employee_type === "Server").length;
  const deliveryCount = employees.filter((e) => e.employee_type === "Delivery Partner").length;

  return (
  <main className="min-h-screen  p-4 md:p-2">
    <div className="mx-auto max-w-[1500px]">
    

    
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
                  <linearGradient id={`empgrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#empgrad-${index})`} />
                <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
              </svg>
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-[18px] border border-[#e7e0d8] bg-white p-4 shadow-[0_1px_0_rgba(16,24,40,0.02)]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-[340px] sm:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7a7a]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employees by name or ID..."
              className="h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-10 pr-3 text-[14px] text-[#2d2d2d] outline-none placeholder:text-[#8a8a8a] focus:border-[#d2bc8a]"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <select aria-label="Filter by employee type" value={selectedEmployeeType} onChange={(event) => setSelectedEmployeeType(event.target.value)} className="h-[46px] min-w-36 rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]">
              <option value="All Types">All Types</option>
              {employeeTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <select aria-label="Filter by employee status" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="h-[46px] min-w-36 rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]">
              <option value="All Status">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <select aria-label="Sort employees" value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]">
              <option value="latest">Sort by: Latest</option>
              <option value="name">Name: A to Z</option>
              <option value="id">ID: Low to High</option>
            </select>
            <div className="flex h-[46px] items-center overflow-hidden rounded-xl border border-[#dfe2e5] bg-[#faf9f8]">
              <button
                type="button"
                onClick={() => setViewMode("card")}
                aria-label="Card view"
                aria-pressed={viewMode === "card"}
                title="Card view"
                className={`flex h-[46px] w-[46px] cursor-pointer items-center justify-center transition ${viewMode === "card" ? "bg-[#1a3c36] text-white" : "text-[#4d4d4d] hover:bg-white"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                aria-label="Table view"
                aria-pressed={viewMode === "table"}
                title="Table view"
                className={`flex h-[46px] w-[46px] cursor-pointer items-center justify-center border-l border-[#dfe2e5] transition ${viewMode === "table" ? "bg-[#1a3c36] text-white" : "text-[#4d4d4d] hover:bg-white"}`}
              >
                <Table2 className="h-4 w-4" />
              </button>
            </div>
             <Link to="/admin/employees/add" className="inline-flex h-[46px] items-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-[15px] font-semibold text-white shadow-[0_6px_14px_rgba(26,60,54,0.18)] transition hover:bg-[#214a42]">
          <UserRoundPlus className="h-4 w-4" /> Add Employee
        </Link>
          </div>
        </div>

        {actionError && <p role="alert" className="mb-4 rounded-lg border border-[#edc7c1] bg-[#fff4f1] px-4 py-3 text-sm text-[#a13e30]">{actionError}</p>}
        {viewMode === "table" ? (
        <div className="overflow-hidden rounded-md border border-[#e8e4df]">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr className="bg-[#d4a843] text-sm font-semibold text-white">
                  <th className="px-4 py-4">S No</th>
                  <th className="px-4 py-4">Employee</th>
                  <th className="px-4 py-4">Employee Type</th>
                  <th className="px-4 py-4">Phone Number</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[#777]">Loading employees...</td></tr>
                ) : error ? (
                  <tr><td colSpan={6} role="alert" className="px-5 py-12 text-center text-sm text-[#a13e30]">{error}</td></tr>
                ) : visibleEmployees.length > 0 ? visibleEmployees.map((employee, index) => (
                  <tr key={employee.employee_id} className="border-t border-[#f0ebe6] align-middle text-sm text-[#4d4d4d]">
                    <td className="px-4 py-4 font-medium text-xs">{index + 1}</td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-[#1f1f1f]">{employee.full_name}</div>
                      <div className="text-xs text-[#7a7a7a]">{employee.email}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span>{employee.employee_type}</span>
                        {employee.employee_type === "Server" && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              (serverTableCounts[employee.employee_id] || 0) > 0
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            <Table2 className="h-3 w-3" />
                            {serverTableCounts[employee.employee_id] || 0} Tables
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">{employee.phone_number}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${employee.status === "Active" ? "bg-[#edf7f1] text-[#2d7b5a]" : "bg-[#f1f2f0] text-[#727a73]"}`}>
                        <span className={`h-2 w-2 rounded-full ${employee.status === "Active" ? "bg-[#2d7b5a]" : "bg-[#929892]"}`} />
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {employee.employee_type === "Server" && (
                          <button
                            type="button"
                            onClick={() => setAssignModalServer(employee)}
                            title="Assign Dining Tables"
                            aria-label={`Assign tables to ${employee.full_name}`}
                            className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#1a3c36] bg-[#1a3c36] px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#25524a]"
                          >
                            <UtensilsCrossed className="h-3.5 w-3.5 text-[#d4a843]" />
                            <span>Assign Table</span>
                          </button>
                        )}
                        <button type="button" onClick={() => viewEmployee(employee.employee_id)} title="View employee" aria-label={`View ${employee.full_name}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997] hover:text-[#1a1a1a]"><Eye className="h-4 w-4" /></button>
                        <Link to={`/admin/employees/${encodeURIComponent(employee.employee_id)}/edit`} title="Edit employee" aria-label={`Edit ${employee.full_name}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997] hover:text-[#1a1a1a]"><Pencil className="h-4 w-4" /></Link>
                        <button type="button" onClick={() => deleteEmployee(employee)} disabled={deletingEmployeeId === employee.employee_id} title="Delete employee" aria-label={`Delete ${employee.full_name}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#f3d7d7] bg-[#fff8f8] text-[#d04d4d] transition hover:bg-[#fff0f0] disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="mb-3 flex justify-center text-[#8a8a8a]"><Users className="h-10 w-10" /></div>
                      <p className="text-base font-bold text-[#333]">{normalizedSearch || selectedStatus !== "All Status" || selectedEmployeeType !== "All Types" ? "No matching employees" : "No employee records yet"}</p>
                      <p className="mx-auto mt-1 max-w-sm text-xs text-[#888]">{normalizedSearch || selectedStatus !== "All Status" || selectedEmployeeType !== "All Types" ? "Try another search or adjust the selected filters." : "Add an employee to start building your directory."}</p>
                      {!normalizedSearch && selectedStatus === "All Status" && selectedEmployeeType === "All Types" && <Link to="/admin/employees/add" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#42694f] hover:text-[#244b36]"><UserRoundPlus className="h-4 w-4" /> Add your first employee</Link>}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        ) : loading ? (
          <div className="rounded-[18px] border border-[#e7e0d8] bg-white py-16 text-center text-sm text-[#777]">Loading employees...</div>
        ) : error ? (
          <div role="alert" className="rounded-[18px] border border-[#edc7c1] bg-white py-16 text-center text-sm text-[#a13e30]">{error}</div>
        ) : visibleEmployees.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleEmployees.map((employee) => (
              <article key={employee.employee_id} className="rounded-xl border border-[#e8e4df] bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#849087]">ID {employee.id ?? "—"}</p>
                    <h3 className="mt-1 truncate text-base font-bold text-[#1f1f1f]">{employee.full_name}</h3>
                    <p className="mt-0.5 truncate text-xs text-[#7a7a7a]">{employee.email}</p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${employee.status === "Active" ? "bg-[#edf7f1] text-[#2d7b5a]" : "bg-[#f1f2f0] text-[#727a73]"}`}>
                    <span className={`h-2 w-2 rounded-full ${employee.status === "Active" ? "bg-[#2d7b5a]" : "bg-[#929892]"}`} />
                    {employee.status}
                  </span>
                </div>
                <div className="my-4 space-y-2 border-y border-[#f0ebe6] py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-[#849087]">Employee ID</span>
                    <span className="truncate font-mono text-xs text-[#4d4d4d]">{employee.employee_id}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-[#849087]">Type</span>
                    <span className="text-right text-sm font-medium text-[#34443b] flex items-center gap-1.5">
                      {employee.employee_type}
                      {employee.employee_type === "Server" && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            (serverTableCounts[employee.employee_id] || 0) > 0
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <Table2 className="h-3 w-3" />
                          {serverTableCounts[employee.employee_id] || 0} Tables
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-[#849087]">Phone</span>
                    <span className="text-right text-sm text-[#34443b]">{employee.phone_number}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  {employee.employee_type === "Server" && (
                    <button
                      type="button"
                      onClick={() => setAssignModalServer(employee)}
                      title="Assign Dining Tables"
                      aria-label={`Assign tables to ${employee.full_name}`}
                      className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-[#1a3c36] bg-[#1a3c36] px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#25524a]"
                    >
                      <UtensilsCrossed className="h-3.5 w-3.5 text-[#d4a843]" />
                      <span>Assign Table</span>
                    </button>
                  )}
                  <button type="button" onClick={() => viewEmployee(employee.employee_id)} title="View employee" aria-label={`View ${employee.full_name}`} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997] hover:text-[#1a1a1a]"><Eye className="h-4 w-4" /></button>
                  <Link to={`/admin/employees/${encodeURIComponent(employee.employee_id)}/edit`} title="Edit employee" aria-label={`Edit ${employee.full_name}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997] hover:text-[#1a1a1a]"><Pencil className="h-4 w-4" /></Link>
                  <button type="button" onClick={() => deleteEmployee(employee)} disabled={deletingEmployeeId === employee.employee_id} title="Delete employee" aria-label={`Delete ${employee.full_name}`} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[#f3d7d7] bg-[#fff8f8] text-[#d04d4d] transition hover:bg-[#fff0f0] disabled:cursor-wait disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] border-2 border-dashed border-[#e6ddd1] bg-[#faf9f8] py-16 text-center">
            <div className="mb-3 flex justify-center text-[#8a8a8a]"><Users className="h-10 w-10" /></div>
            <p className="text-base font-bold text-[#333]">{normalizedSearch || selectedStatus !== "All Status" || selectedEmployeeType !== "All Types" ? "No matching employees" : "No employee records yet"}</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-[#888]">{normalizedSearch || selectedStatus !== "All Status" || selectedEmployeeType !== "All Types" ? "Try another search or adjust the selected filters." : "Add an employee to start building your directory."}</p>
            {!normalizedSearch && selectedStatus === "All Status" && selectedEmployeeType === "All Types" && <Link to="/admin/employees/add" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#42694f] hover:text-[#244b36]"><UserRoundPlus className="h-4 w-4" /> Add your first employee</Link>}
          </div>
        )}
        <div className="mt-5 border-t border-[#efebe7] pt-4 text-sm text-[#6a6a6a]">
          Showing {visibleEmployees.length} of {employees.length} employees
        </div>
      </section>
    </div>
    <ViewEmployeeModal
      isOpen={Boolean(detailsLoading || selectedEmployee || detailsError)}
      loading={detailsLoading}
      error={detailsError}
      employee={selectedEmployee}
      serverTableCount={selectedEmployee?.employee_id ? serverTableCounts[selectedEmployee.employee_id] || 0 : 0}
      onClose={() => {
        setSelectedEmployee(null);
        setDetailsError("");
      }}
      onAssignTable={(emp) => {
        setSelectedEmployee(null);
        setAssignModalServer(emp);
      }}
    />

    {assignModalServer && (
      <AssignTableModal
        isOpen={Boolean(assignModalServer)}
        server={assignModalServer}
        onClose={() => setAssignModalServer(null)}
        onSuccess={() => {
          fetchServerTableCounts();
        }}
      />
    )}
  </main>
  );
};

export default AllEmployees;