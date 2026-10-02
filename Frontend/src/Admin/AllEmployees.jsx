import { Link } from "react-router-dom";
import { Search, UserRoundPlus, Users } from "lucide-react";

const AllEmployees = () => (
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
          <input type="search" placeholder="Search employees" className="h-10 w-full rounded-lg border border-[#dce3dd] bg-[#fbfcfa] pl-9 pr-3 text-sm text-[#20312a] outline-none placeholder:text-[#9aa59d] focus:border-[#4d765c] focus:ring-2 focus:ring-[#4d765c]/10" />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead className="bg-[#f7f9f6] text-[11px] font-bold uppercase tracking-wide text-[#718076]">
            <tr>
              <th className="px-5 py-3">Employee</th>
              <th className="px-5 py-3">Employee ID</th>
              <th className="px-5 py-3">Employee Type</th>
              <th className="px-5 py-3">Phone Number</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="px-5 py-16 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#eef3ed] text-[#42694f]"><Users className="h-6 w-6" /></div>
                <p className="mt-4 text-sm font-bold text-[#34443b]">No employee records yet</p>
                <p className="mt-1 text-xs text-[#849087]">Add an employee to start building your directory.</p>
                <Link to="/admin/employees/add" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#42694f] hover:text-[#244b36]">
                  <UserRoundPlus className="h-4 w-4" /> Add your first employee
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
);

export default AllEmployees;