import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Pencil, Search, Trash2, UserRoundPlus, Users, X } from "lucide-react";
import api from "../api";

const AllEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [deletingEmployeeId, setDeletingEmployeeId] = useState("");
  const [actionError, setActionError] = useState("");

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

  const downloadDocument = async (filename) => {
    try {
      const response = await api.get(`/employees/documents/${encodeURIComponent(filename)}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setDetailsError(requestError.response?.data?.message || "Document could not be downloaded.");
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const visibleEmployees = employees.filter((employee) => [
    employee.full_name,
    employee.employee_id,
    employee.employee_type,
    employee.email,
    employee.phone_number,
  ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch)));

  return (
  <main className="mx-auto w-full max-w-6xl px-1 pb-10 pt-2 sm:px-3 sm:pt-4">
    <div className="mb-6 flex flex-col gap-4 border-b border-[#dfe5df] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#9a7442]">People & access</p>
        <h1 className="mt-1 text-2xl font-bold text-[#203129]">All Employee</h1>
        <p className="mt-1 text-sm text-[#758179]">Employee records across your restaurant.</p>
      </div>
      <Link to="/admin/employees/add" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#244b36] px-4 text-sm font-semibold text-white transition hover:bg-[#1b3d2b]">
        <UserRoundPlus className="h-4 w-4" /> Add Employee
      </Link>
    </div>

    <section className="overflow-hidden rounded-xl border border-[#e1e7e1] bg-white shadow-[0_2px_10px_rgba(31,48,38,0.035)]">
      <div className="flex flex-col gap-3 border-b border-[#edf0ec] p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-bold text-[#23342b]">Employee directory</h2>
        <label className="relative block w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#849087]" />
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employees" className="h-10 w-full rounded-lg border border-[#dce3dd] bg-[#fbfcfa] pl-9 pr-3 text-sm text-[#20312a] outline-none placeholder:text-[#9aa59d] focus:border-[#4d765c] focus:ring-2 focus:ring-[#4d765c]/10" />
        </label>
      </div>

      <div className="overflow-x-auto">
        {actionError && <p role="alert" className="border-b border-[#edc7c1] bg-[#fff4f1] px-5 py-3 text-sm text-[#a13e30]">{actionError}</p>}
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="bg-[#f7f9f6] text-[11px] font-bold uppercase tracking-wide text-[#718076]">
            <tr>
              <th className="px-5 py-3">Employee</th>
              <th className="px-5 py-3">Employee ID</th>
              <th className="px-5 py-3">Employee Type</th>
              <th className="px-5 py-3">Phone Number</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[#849087]">Loading employees...</td></tr>
            ) : error ? (
              <tr><td colSpan={6} role="alert" className="px-5 py-12 text-center text-sm text-[#a13e30]">{error}</td></tr>
            ) : visibleEmployees.length > 0 ? visibleEmployees.map((employee) => (
              <tr key={employee.employee_id} className="border-t border-[#edf0ec] text-sm text-[#34443b]">
                <td className="px-5 py-3.5"><div className="font-semibold text-[#23342b]">{employee.full_name}</div><div className="mt-0.5 text-xs text-[#849087]">{employee.email}</div></td>
                <td className="px-5 py-3.5 font-mono text-xs">{employee.employee_id}</td>
                <td className="px-5 py-3.5">{employee.employee_type}</td>
                <td className="px-5 py-3.5">{employee.phone_number}</td>
                <td className="px-5 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${employee.status === "Active" ? "bg-[#edf6ef] text-[#3d7450]" : "bg-[#f1f2f0] text-[#727a73]"}`}>{employee.status}</span></td>
                <td className="px-5 py-3.5">
                  <div className="flex justify-end gap-1">
                    <button type="button" onClick={() => viewEmployee(employee.employee_id)} title="View employee" aria-label={`View ${employee.full_name}`} className="rounded-md p-2 text-[#42694f] transition hover:bg-[#edf3ed]"><Eye className="h-4 w-4" /></button>
                    <Link to={`/admin/employees/${encodeURIComponent(employee.employee_id)}/edit`} title="Edit employee" aria-label={`Edit ${employee.full_name}`} className="rounded-md p-2 text-[#42694f] transition hover:bg-[#edf3ed]"><Pencil className="h-4 w-4" /></Link>
                    <button type="button" onClick={() => deleteEmployee(employee)} disabled={deletingEmployeeId === employee.employee_id} title="Delete employee" aria-label={`Delete ${employee.full_name}`} className="rounded-md p-2 text-[#a13e30] transition hover:bg-[#fff0ed] disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef3ed] text-[#42694f]"><Users className="h-6 w-6" /></div>
                  <p className="mt-4 text-sm font-bold text-[#34443b]">{normalizedSearch ? "No matching employees" : "No employee records yet"}</p>
                  <p className="mt-1 text-xs text-[#849087]">{normalizedSearch ? "Try another name, ID, role, email, or phone number." : "Add an employee to start building your directory."}</p>
                  {!normalizedSearch && <Link to="/admin/employees/add" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#42694f] hover:text-[#244b36]"><UserRoundPlus className="h-4 w-4" /> Add your first employee</Link>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
    {(detailsLoading || selectedEmployee || detailsError) && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onClick={(event) => {
        if (event.target === event.currentTarget) {
          setSelectedEmployee(null);
          setDetailsError("");
        }
      }}>
        <section role="dialog" aria-modal="true" aria-labelledby="employee-details-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
          <div className="sticky top-0 flex items-center justify-between border-b border-[#edf0ec] bg-white px-5 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#9a7442]">Employee record</p>
              <h2 id="employee-details-title" className="mt-1 text-lg font-bold text-[#203129]">{selectedEmployee?.full_name || (detailsLoading ? "Loading employee..." : "Employee details")}</h2>
            </div>
            <button type="button" onClick={() => { setSelectedEmployee(null); setDetailsError(""); }} aria-label="Close employee details" className="rounded-md p-2 text-[#758179] hover:bg-[#f2f5f1]"><X className="h-5 w-5" /></button>
          </div>
          {detailsLoading ? (
            <p className="p-8 text-center text-sm text-[#849087]">Loading employee details...</p>
          ) : detailsError ? (
            <p role="alert" className="m-5 rounded-lg border border-[#edc7c1] bg-[#fff4f1] px-4 py-3 text-sm text-[#a13e30]">{detailsError}</p>
          ) : selectedEmployee && (
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {Object.entries(selectedEmployee)
                .filter(([key, value]) => value !== null && value !== "" && !["user_id", "created_by", "updated_by"].includes(key))
                .map(([key, value]) => {
                  const isDocument = /(_upload|_proof|_photo|_card|_certificate|_book|_documents)$/.test(key)
                    && typeof value === "string";
                  return (
                    <div key={key} className="min-w-0 rounded-lg border border-[#edf0ec] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#849087]">{key.replaceAll("_", " ")}</p>
                      {isDocument ? (
                        <button type="button" onClick={() => downloadDocument(value)} className="mt-1 break-all text-left text-sm font-semibold text-[#42694f] underline decoration-[#b8caba] underline-offset-2 hover:text-[#244b36]">{value}</button>
                      ) : (
                        <p className="mt-1 break-words text-sm text-[#34443b]">{typeof value === "object" ? JSON.stringify(value) : String(value)}</p>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      </div>
    )}
  </main>
  );
};

export default AllEmployees;