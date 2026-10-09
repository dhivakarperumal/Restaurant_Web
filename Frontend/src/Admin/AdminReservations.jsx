import { useEffect, useState } from "react";
import { CalendarDays, Check, Clock3, LoaderCircle, Users, X } from "lucide-react";
import api from "../api";

const statusOptions = ["All", "Pending", "Confirmed", "Declined", "Cancelled"];

const formatDate = (value) => {
  const dateString = typeof value === "string" ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (value) => {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
};

const AdminReservations = () => {
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/reservations", { params: { status: statusFilter } })
      .then(({ data }) => {
        if (active) setReservations(data.reservations || []);
      })
      .catch((error) => {
        if (active) setErrorMessage(error.response?.data?.message || "Reservation requests could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [statusFilter]);

  const handleStatusChange = async (reservationId, status) => {
    setUpdatingId(reservationId);
    setLoading(true);
    setErrorMessage("");
    try {
      await api.patch(`/reservations/${reservationId}/status`, { status });
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Reservation status could not be updated.");
      setLoading(false);
      setUpdatingId("");
      return;
    }
    try {
      const { data } = await api.get("/reservations", { params: { status: statusFilter } });
      setReservations(data.reservations || []);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "The status was updated, but the list could not be refreshed.");
    } finally {
      setLoading(false);
      setUpdatingId("");
    }
  };

  return (
    <section className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a34f32]">Front of house</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-[#203129]">Reservation requests</h1>
          <p className="mt-2 text-sm text-slate-500">Review customer table requests and confirm or decline them.</p>
        </div>
        <label className="text-sm font-semibold text-slate-700">
          Status
          <select value={statusFilter} onChange={(event) => { setErrorMessage(""); setLoading(true); setStatusFilter(event.target.value); }} className="ml-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-[#1a3c36]">
            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
      </div>

      {errorMessage && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-14 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading reservation requests…
        </div>
      ) : reservations.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {reservations.map((reservation) => (
            <article key={reservation.reservation_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-xl font-bold text-[#203129]">{reservation.customer_name}</p>
                  <p className="mt-1 text-sm text-slate-500">{reservation.customer_email} · {reservation.customer_phone}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${reservation.status === "Confirmed" ? "bg-green-100 text-green-800" : reservation.status === "Pending" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                  {reservation.status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 rounded-xl bg-[#f7f8f5] p-4 text-sm sm:grid-cols-3">
                <p className="flex items-center gap-2 text-slate-700"><CalendarDays className="h-4 w-4 text-[#a34f32]" />{formatDate(reservation.reservation_date)}</p>
                <p className="flex items-center gap-2 text-slate-700"><Clock3 className="h-4 w-4 text-[#a34f32]" />{formatTime(reservation.start_time)}</p>
                <p className="flex items-center gap-2 text-slate-700"><Users className="h-4 w-4 text-[#a34f32]" />{reservation.guests} guests · Table {reservation.table_number}</p>
              </div>

              {reservation.notes && <p className="mt-3 text-sm leading-6 text-slate-600"><span className="font-semibold text-slate-700">Requests:</span> {reservation.notes}</p>}
              <p className="mt-3 break-all text-xs text-slate-400">Ref: {reservation.reservation_id}</p>

              {["Pending", "Confirmed"].includes(reservation.status) && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {reservation.status === "Pending" && (
                    <button type="button" disabled={Boolean(updatingId)} onClick={() => handleStatusChange(reservation.reservation_id, "Confirmed")} className="inline-flex items-center gap-2 rounded-lg bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#245048] disabled:opacity-50">
                      {updatingId === reservation.reservation_id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirm
                    </button>
                  )}
                  <button type="button" disabled={Boolean(updatingId)} onClick={() => handleStatusChange(reservation.reservation_id, reservation.status === "Pending" ? "Declined" : "Cancelled")} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50">
                    <X className="h-4 w-4" /> {reservation.status === "Pending" ? "Decline" : "Cancel"}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center text-sm text-slate-500">
          No {statusFilter === "All" ? "" : statusFilter.toLowerCase()} reservation requests.
        </div>
      )}
    </section>
  );
};

export default AdminReservations;
