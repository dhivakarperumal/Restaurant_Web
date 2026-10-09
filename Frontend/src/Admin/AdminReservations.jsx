import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  CircleAlert,
  LayoutGrid,
  List,
  LoaderCircle,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import api from "../api";

const statusOptions = ["All", "Pending", "Confirmed", "Declined", "Cancelled"];

const statusStyles = {
  Pending: "border-amber-300 bg-amber-50 text-amber-800",
  Confirmed: "border-emerald-300 bg-emerald-50 text-emerald-800",
  Declined: "border-rose-200 bg-rose-50 text-rose-700",
  Cancelled: "border-slate-200 bg-slate-100 text-slate-600",
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";
  const dateString = typeof value === "string" ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);
  const date = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? dateString
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const formatTime = (value) => {
  if (!value) return "Time unavailable";
  const [hour, minute] = String(value).slice(0, 5).split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
};

const getReservationDateTime = (reservation) => {
  const date = String(reservation.reservation_date || "").slice(0, 10);
  const time = String(reservation.start_time || "").slice(0, 8);
  return new Date(`${date}T${time}`).getTime() || 0;
};

const AdminReservations = () => {
  const [activeStatus, setActiveStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("soonest");
  const [viewMode, setViewMode] = useState("table");
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fetchReservations = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const { data } = await api.get("/reservations", { params: { status: "All" } });
      setReservations(data.reservations || []);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Reservation requests could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReservations();
    const interval = window.setInterval(() => fetchReservations(), 10000);
    return () => window.clearInterval(interval);
  }, [fetchReservations]);

  const counts = useMemo(() => {
    const result = { All: reservations.length, Pending: 0, Confirmed: 0, Declined: 0, Cancelled: 0 };
    reservations.forEach((reservation) => {
      if (result[reservation.status] !== undefined) result[reservation.status] += 1;
    });
    return result;
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return reservations.filter((reservation) => {
      const matchesStatus = activeStatus === "All" || reservation.status === activeStatus;
      const searchableText = [
        reservation.reservation_id,
        reservation.customer_name,
        reservation.customer_email,
        reservation.customer_phone,
        reservation.table_number,
        reservation.notes,
      ].join(" ").toLowerCase();
      return matchesStatus && (!query || searchableText.includes(query));
    }).sort((first, second) => {
      const difference = getReservationDateTime(first) - getReservationDateTime(second);
      return sortBy === "soonest" ? difference : -difference;
    });
  }, [reservations, activeStatus, searchQuery, sortBy]);

  const handleStatusChange = async (reservationId, status) => {
    setUpdatingId(reservationId);
    setErrorMessage("");
    try {
      await api.patch(`/reservations/${reservationId}/status`, { status });
      await fetchReservations();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Reservation status could not be updated.");
    } finally {
      setUpdatingId("");
    }
  };

  const renderStatus = (status) => (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyles[status] || statusStyles.Cancelled}`}>
      {status}
    </span>
  );

  const renderActions = (reservation) => {
    if (!["Pending", "Confirmed"].includes(reservation.status)) return <span className="text-xs text-slate-400">No actions</span>;
    const isUpdating = updatingId === reservation.reservation_id;
    return (
      <div className="flex flex-wrap items-center gap-2">
        {reservation.status === "Pending" && (
          <button
            type="button"
            disabled={Boolean(updatingId)}
            onClick={() => handleStatusChange(reservation.reservation_id, "Confirmed")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a3c36] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#245048] disabled:opacity-50"
          >
            {isUpdating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Confirm
          </button>
        )}
        <button
          type="button"
          disabled={Boolean(updatingId)}
          onClick={() => handleStatusChange(reservation.reservation_id, reservation.status === "Pending" ? "Declined" : "Cancelled")}
          aria-label={`${reservation.status === "Pending" ? "Decline" : "Cancel"} reservation`}
          title={`${reservation.status === "Pending" ? "Decline" : "Cancel"} reservation`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <main className="min-h-screen p-4 md:p-2 lg:p-2">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a34f32]">Front of house</p>
            <h1 className="mt-1 font-serif text-3xl font-bold text-[#203129]">Reservation requests</h1>
            <p className="mt-2 text-sm text-slate-500">Review customer table requests and confirm or decline them.</p>
          </div>
          <button
            type="button"
            onClick={() => fetchReservations(true)}
            disabled={loading}
            aria-label="Refresh reservations"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#dfe2e5] bg-white px-4 text-sm font-semibold text-[#34443b] transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </header>

        <section aria-label="Reservation status summaries" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { status: "All", label: "All Reservations", caption: "Every reservation request", icon: CalendarDays, bg: "bg-[#1a3c36]" },
            { status: "Pending", label: "Pending Requests", caption: "Waiting for review", icon: Clock3, bg: "bg-[#f59e0b]" },
            { status: "Confirmed", label: "Confirmed", caption: "Tables booked", icon: CheckCircle2, bg: "bg-[#22c55e]" },
            { status: "Declined", label: "Declined", caption: "Requests declined", icon: CircleAlert, bg: "bg-[#ef4444]" },
            { status: "Cancelled", label: "Cancelled", caption: "Requests cancelled", icon: CalendarDays, bg: "bg-[#64748b]" },
          ].map(({ status, label, caption, icon: Icon, bg }) => (
            <button
              key={status}
              type="button"
              aria-pressed={activeStatus === status}
              onClick={() => setActiveStatus(status === "All" || activeStatus === status ? "All" : status)}
              className={`relative flex min-h-[140px] min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-transparent p-4 text-left text-white shadow-[0_2px_10px_rgba(20,56,34,0.08)] transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5 ${bg} ${activeStatus === status ? "ring-4 ring-white/40" : ""}`}
            >
              <div className="relative z-10 flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/20 shadow-sm">
                  <Icon size={24} strokeWidth={2.2} />
                </div>
                <div className="mt-0.5 min-w-0 flex-1">
                  <h2 className="mb-1 truncate text-xs font-semibold opacity-90">{label}</h2>
                  <div className="text-[26px] font-extrabold leading-none tracking-tight">{counts[status]}</div>
                </div>
              </div>
              <div className="relative z-10 mt-5 text-[11px] font-medium opacity-75">{caption}</div>
              <div className="pointer-events-none absolute bottom-0 right-0 h-16 w-24 opacity-40" aria-hidden="true">
                <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="h-full w-full">
                  <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill="white" fillOpacity="0.4" />
                  <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="white" strokeWidth="2.5" />
                </svg>
              </div>
            </button>
          ))}
        </section>

        <div className="flex flex-col gap-3 rounded-xl border border-[#e1ded8] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-sm sm:flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a857d]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search guest, table, phone, or reference..."
              aria-label="Search reservations"
              className="h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-11 pr-3 text-sm text-[#2d3830] outline-none placeholder:text-[#89938c] focus:border-[#6d9a79]"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="mr-1 text-xs text-gray-500">{filteredReservations.length} of {reservations.length}</span>
            <select
              value={activeStatus}
              onChange={(event) => setActiveStatus(event.target.value)}
              aria-label="Filter reservations by status"
              className="h-[46px] rounded-xl border border-[#dfe2e5] bg-white px-3 text-sm text-[#34443b] outline-none focus:border-[#6d9a79]"
            >
              {statusOptions.map((status) => <option key={status} value={status}>{status} ({counts[status]})</option>)}
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              aria-label="Sort reservations"
              className="h-[46px] rounded-xl border border-[#dfe2e5] bg-white px-3 text-sm text-[#34443b] outline-none focus:border-[#6d9a79]"
            >
              <option value="soonest">Sort by: Soonest</option>
              <option value="latest">Sort by: Latest</option>
            </select>
            <div className="flex h-[46px] overflow-hidden rounded-xl border border-[#dfe2e5] bg-white" role="group" aria-label="Reservation view">
              <button type="button" onClick={() => setViewMode("table")} aria-label="Table view" aria-pressed={viewMode === "table"} title="Table view" className={`grid w-11 place-items-center border-r border-[#dfe2e5] ${viewMode === "table" ? "bg-[#1a3c36] text-white" : "text-[#66736b] hover:bg-gray-50"}`}><List size={16} /></button>
              <button type="button" onClick={() => setViewMode("card")} aria-label="Card view" aria-pressed={viewMode === "card"} title="Card view" className={`grid w-11 place-items-center ${viewMode === "card" ? "bg-[#1a3c36] text-white" : "text-[#66736b] hover:bg-gray-50"}`}><LayoutGrid size={16} /></button>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div role="alert" className="rounded-2xl border border-[#edc7c1] bg-white p-4 text-sm text-[#a13e30] shadow-sm">
            <p className="font-semibold">{errorMessage}</p>
            <button type="button" onClick={() => fetchReservations(true)} className="mt-2 text-xs font-bold underline">Try refreshing reservations</button>
          </div>
        )}

        {loading && reservations.length === 0 ? (
          <div className="rounded-2xl border border-[#e7e0d8] bg-white p-16 text-center text-sm text-gray-500 shadow-sm">
            <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin text-[#1a3c36]" />
            Loading reservation requests...
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#e6ddd1] bg-[#faf9f8] py-16 text-center shadow-sm">
            <CalendarDays className="mx-auto h-12 w-12 text-[#8a8a8a]" />
            <h2 className="mt-3 text-base font-bold text-[#333]">
              {activeStatus === "All" ? "No reservation requests yet" : `No ${activeStatus.toLowerCase()} reservations`}
            </h2>
            <p className="mt-1 text-xs text-[#888]">Customer table requests will appear here.</p>
          </div>
        ) : viewMode === "table" ? (
          <div className="overflow-x-auto rounded-2xl border border-[#e7e0d8] bg-white shadow-sm">
            <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-[#d4a843] text-[11px] uppercase tracking-wide text-white">
                <tr>
                  {["#", "Guest", "Date & Time", "Table / Guests", "Requests / Reference", "Status", "Actions"].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-4 py-4 font-bold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0eb]">
                {filteredReservations.map((reservation, index) => (
                  <tr key={reservation.reservation_id} className="align-middle hover:bg-[#fbfcfa]">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-[#66736b]">{index + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[#34443b]">{reservation.customer_name}</span>
                      <span className="mt-1 block text-xs text-[#7c8980]">{reservation.customer_email}</span>
                      <span className="block text-xs text-[#7c8980]">{reservation.customer_phone}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-semibold text-[#34443b]">{formatDate(reservation.reservation_date)}</span>
                      <span className="mt-1 block text-xs text-[#66736b]">{formatTime(reservation.start_time)} – {formatTime(reservation.end_time)}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-semibold text-[#34443b]">Table {reservation.table_number}</span>
                      <span className="mt-1 block text-xs text-[#66736b]">{reservation.guests} guests</span>
                    </td>
                    <td className="max-w-[260px] px-4 py-3">
                      <span className="block truncate text-xs text-[#66736b]" title={reservation.notes || ""}>{reservation.notes || "No special requests"}</span>
                      <span className="mt-1 block font-mono text-[10px] text-[#89938c]" title={reservation.reservation_id}>{String(reservation.reservation_id).slice(0, 8).toUpperCase()}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{renderStatus(reservation.status)}</td>
                    <td className="px-4 py-3">{renderActions(reservation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredReservations.map((reservation) => (
              <article key={reservation.reservation_id} className="flex flex-col justify-between rounded-2xl border border-[#e7e0d8] bg-white p-5 shadow-sm transition hover:shadow-md">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-serif text-xl font-bold text-[#203129]">{reservation.customer_name}</h2>
                      <p className="mt-1 break-all text-xs text-slate-500">{reservation.customer_email}</p>
                      <p className="text-xs text-slate-500">{reservation.customer_phone}</p>
                    </div>
                    {renderStatus(reservation.status)}
                  </div>
                  <div className="mt-4 grid gap-3 rounded-xl bg-[#f7f8f5] p-4 text-sm">
                    <p className="flex items-center gap-2 text-slate-700"><CalendarDays className="h-4 w-4 shrink-0 text-[#a34f32]" />{formatDate(reservation.reservation_date)}</p>
                    <p className="flex items-center gap-2 text-slate-700"><Clock3 className="h-4 w-4 shrink-0 text-[#a34f32]" />{formatTime(reservation.start_time)} – {formatTime(reservation.end_time)}</p>
                    <p className="flex items-center gap-2 text-slate-700"><Users className="h-4 w-4 shrink-0 text-[#a34f32]" />{reservation.guests} guests · Table {reservation.table_number}</p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600"><span className="font-semibold text-slate-700">Requests:</span> {reservation.notes || "None"}</p>
                  <p className="mt-2 break-all font-mono text-[10px] text-slate-400">Ref: {reservation.reservation_id}</p>
                </div>
                <div className="mt-4 border-t border-[#f0ebe6] pt-4">{renderActions(reservation)}</div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default AdminReservations;
