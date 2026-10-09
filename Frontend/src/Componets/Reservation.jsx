import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, Mail, MapPin, Phone, Users, Utensils } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../CommonComponents/PageContainer";
import PageHeader from "../CommonComponents/PageHeader";
import api from "../api";
import { useAuth } from "../PrivateRouter/AuthContext";

const minimumReservationDate = (() => {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
})();

const formatTime = (value) => {
  if (!value) return "";
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
};

const formatDate = (value) => {
  if (!value) return "";
  const dateString = typeof value === "string" ? value.slice(0, 10) : new Date(value).toISOString().slice(0, 10);
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const Reservation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [date, setDate] = useState(minimumReservationDate);
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState("2");
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [tablesLoading, setTablesLoading] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [form, setForm] = useState({
    name: user?.name || user?.username || "",
    email: user?.email || "",
    phone: user?.mobile_number || user?.phone || "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const isCustomer = ["user", "customer"].includes(String(user?.role || "").trim().toLowerCase());

  useEffect(() => {
    let active = true;
    const guestCount = Number(guests);
    if (!date || !time || !Number.isInteger(guestCount) || guestCount < 1 || guestCount > 20) {
      return () => { active = false; };
    }

    api.get("/reservations/available-tables", { params: { date, time, guests } })
      .then(({ data }) => {
        if (!active) return;
        setTables(data.tables || []);
        setSelectedTable((current) => (
          data.tables?.some((table) => table.table_id === current) ? current : ""
        ));
      })
      .catch((error) => {
        if (!active) return;
        setTables([]);
        setErrorMessage(error.response?.data?.message || "Available tables could not be loaded.");
      })
      .finally(() => {
        if (active) setTablesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [date, time, guests, refreshKey]);

  useEffect(() => {
    let active = true;
    if (!isCustomer) return () => { active = false; };
    api.get("/reservations/mine")
      .then(({ data }) => {
        if (active) setReservations(data.reservations || []);
      })
      .catch((error) => {
        if (active) setErrorMessage(error.response?.data?.message || "Your reservation requests could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, [isCustomer, refreshKey]);

  const handleFormChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const updateAvailability = (update) => {
    setTables([]);
    setSelectedTable("");
    setErrorMessage("");
    const nextGuests = update.guests ?? guests;
    const guestCount = Number(nextGuests);
    setTablesLoading(
      Boolean(update.date ?? date) &&
      Boolean(update.time ?? time) &&
      Number.isInteger(guestCount) &&
      guestCount >= 1 &&
      guestCount <= 20
    );
    if (update.date !== undefined) setDate(update.date);
    if (update.time !== undefined) setTime(update.time);
    if (update.guests !== undefined) setGuests(update.guests);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    if (!isCustomer) {
      navigate("/login", { state: { from: "/reservation" } });
      return;
    }
    if (!selectedTable) {
      setErrorMessage("Please choose an available table before sending your request.");
      return;
    }

    setSubmitting(true);
    setTablesLoading(true);
    try {
      const { data } = await api.post("/reservations", {
        ...form,
        table_id: selectedTable,
        date,
        time,
        guests: Number(guests),
      });
      setSuccessMessage(`${data.message} Request reference: ${data.reservation.reservation_id}`);
      setSelectedTable("");
      setForm((current) => ({ ...current, notes: "" }));
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || "Your reservation request could not be submitted.");
      setRefreshKey((current) => current + 1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fcfbf9] pb-16 text-[#203129]">
      <PageHeader title="Reservation" />
      <PageContainer>
        <section className="py-10 sm:py-14">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a34f32]">Make it a date</p>
            <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Reserve your table</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Choose a date, time, and table. Your request will be saved and our team will confirm it.
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[0.8fr_1.2fr]">
            <aside className="bg-[#1a3c36] p-6 text-white sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#edc783]">We look forward to seeing you</p>
              <h3 className="mt-3 font-serif text-2xl font-bold">A table is waiting.</h3>
              <p className="mt-3 text-sm leading-6 text-white/75">
                Select a table that suits your group. Each request holds the table for one hour while our team reviews it.
              </p>

              <div className="mt-8 space-y-5 border-t border-white/15 pt-6 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#edc783]" />
                  <span>123 Food Street, Ambur,<br />Tamil Nadu - 635802</span>
                </div>
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#edc783]" />
                  <span>Every day<br />10:00 AM – 11:00 PM</span>
                </div>
                <a href="tel:+919876543210" className="flex items-center gap-3 text-white transition hover:text-[#edc783]">
                  <Phone className="h-5 w-5 shrink-0 text-[#edc783]" />
                  +91 98765 43210
                </a>
                <a href="mailto:info@foodierestaurant.com" className="flex items-center gap-3 break-all text-white transition hover:text-[#edc783]">
                  <Mail className="h-5 w-5 shrink-0 text-[#edc783]" />
                  info@foodierestaurant.com
                </a>
              </div>
            </aside>

            <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
              <div className="grid gap-5 sm:grid-cols-3">
                <label className="text-sm font-semibold text-slate-700">
                  Date
                  <span className="relative mt-2 block">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1a3c36]" />
                    <input name="date" type="date" min={minimumReservationDate} value={date} onChange={(event) => updateAvailability({ date: event.target.value })} required className="w-full min-w-0 rounded-xl border border-slate-200 py-3 pl-10 pr-3 font-normal outline-none transition focus:border-[#1a3c36] focus:ring-2 focus:ring-[#1a3c36]/10" />
                  </span>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Time
                  <input name="time" type="time" min="10:00" max="22:00" step="3600" required value={time} onChange={(event) => updateAvailability({ time: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none transition focus:border-[#1a3c36] focus:ring-2 focus:ring-[#1a3c36]/10" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Guests
                  <input name="guests" type="number" min="1" max="20" step="1" required value={guests} onChange={(event) => updateAvailability({ guests: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none transition focus:border-[#1a3c36] focus:ring-2 focus:ring-[#1a3c36]/10" />
                </label>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-serif text-lg font-bold text-[#203129]">Choose your table</h3>
                  {date && time && <span className="text-xs text-slate-500">{tables.length} available</span>}
                </div>
                {!time ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                    Choose your date and time to see available tables.
                  </p>
                ) : tablesLoading ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">Checking table availability…</p>
                ) : tables.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {tables.map((table) => {
                      const isSelected = selectedTable === table.table_id;
                      return (
                        <button key={table.table_id} type="button" onClick={() => setSelectedTable(table.table_id)} aria-pressed={isSelected} className={`rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-[#1a3c36]/30 ${isSelected ? "border-[#1a3c36] bg-[#edf4f0] ring-1 ring-[#1a3c36]" : "border-slate-200 bg-white hover:border-[#1a3c36]/50 hover:bg-slate-50"}`}>
                          <span className="flex items-center justify-between">
                            <Utensils className={`h-5 w-5 ${isSelected ? "text-[#1a3c36]" : "text-[#a34f32]"}`} />
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-[#1a3c36]" />}
                          </span>
                          <span className="mt-3 block font-bold text-[#203129]">Table {table.table_number}</span>
                          <span className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Users className="h-3.5 w-3.5" /> Up to {table.no_of_seats} guests</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-center text-sm text-amber-800">
                    No suitable tables are available for this time. Please try another time or guest count.
                  </p>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Your name
                  <input name="name" type="text" autoComplete="name" required maxLength={150} value={form.name} onChange={handleFormChange} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-[#1a3c36] focus:ring-2 focus:ring-[#1a3c36]/10" placeholder="Full name" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Phone number
                  <input name="phone" type="tel" autoComplete="tel" required maxLength={32} value={form.phone} onChange={handleFormChange} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-[#1a3c36] focus:ring-2 focus:ring-[#1a3c36]/10" placeholder="+91" />
                </label>
              </div>

              <label className="block text-sm font-semibold text-slate-700">
                Email address
                <input name="email" type="email" autoComplete="email" required maxLength={255} value={form.email} onChange={handleFormChange} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-[#1a3c36] focus:ring-2 focus:ring-[#1a3c36]/10" placeholder="you@example.com" />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Special requests <span className="font-normal text-slate-400">(optional)</span>
                <textarea name="notes" rows="3" maxLength={1000} value={form.notes} onChange={handleFormChange} className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-[#1a3c36] focus:ring-2 focus:ring-[#1a3c36]/10" placeholder="Occasion, seating preference, or other details" />
              </label>

              {errorMessage && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>}
              {successMessage && <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{successMessage}</p>}

              {isCustomer ? (
                <button type="submit" disabled={submitting || tablesLoading || !selectedTable} className="w-full rounded-xl bg-[#1a3c36] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#245048] focus:outline-none focus:ring-2 focus:ring-[#1a3c36] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
                  {submitting ? "Sending request…" : "Request this table"}
                </button>
              ) : (
                <button type="button" onClick={() => navigate("/login", { state: { from: "/reservation" } })} className="w-full rounded-xl bg-[#1a3c36] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#245048] focus:outline-none focus:ring-2 focus:ring-[#1a3c36] focus:ring-offset-2">
                  Login to request a table
                </button>
              )}
              <p className="text-center text-xs leading-5 text-slate-400">
                Requests remain pending until confirmed by our team. A table is held for one hour per request.
              </p>
            </form>
          </div>

          {isCustomer && (
            <section className="mx-auto mt-10 max-w-6xl">
              <h3 className="mb-4 font-serif text-2xl font-bold text-[#203129]">Your reservation requests</h3>
              {reservations.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {reservations.map((reservation) => (
                    <article key={reservation.reservation_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-[#203129]">Table {reservation.table_number}</p>
                          <p className="mt-1 text-sm text-slate-500">{formatDate(reservation.reservation_date)} · {formatTime(reservation.start_time)}</p>
                          <p className="mt-1 text-xs text-slate-500">{reservation.guests} guests</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${reservation.status === "Confirmed" ? "bg-green-100 text-green-800" : reservation.status === "Pending" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                          {reservation.status}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">You have no reservation requests yet.</p>
              )}
            </section>
          )}
        </section>
      </PageContainer>
    </main>
  );
};

export default Reservation;
