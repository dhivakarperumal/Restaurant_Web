import { useEffect, useState } from "react";
import {
  Armchair,
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  Clock3,
  Leaf,
  MapPin,
  Phone,
  Sparkles,
  Star,
  UserRound,
  Users,
  Utensils,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageContainer from "../CommonComponents/PageContainer";
import PageHeader from "../CommonComponents/PageHeader";
import api, { BACKEND_BASE_URL } from "../api";
import { useAuth } from "../PrivateRouter/AuthContext";

const minimumReservationDate = (() => {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
})();

const normalizeReservationDate = (value) => {
  const input = String(value || "").trim();
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/) || input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return "";
  const dateString = match[1].length === 4
    ? input
    : `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
  const date = new Date(`${dateString}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === dateString
    ? dateString
    : "";
};

const normalizeReservationTime = (value) => {
  const input = String(value || "").trim();
  const twelveHourTime = input.match(/^(1[0-2]|0?[1-9]):([0-5]\d)\s*(AM|PM)$/i);
  let normalized = input;
  if (twelveHourTime) {
    let hour = Number(twelveHourTime[1]) % 12;
    if (twelveHourTime[3].toUpperCase() === "PM") hour += 12;
    normalized = `${String(hour).padStart(2, "0")}:${twelveHourTime[2]}`;
  } else {
    const twentyFourHourTime = input.match(/^([01]\d|2[0-3]):([0-5]\d)(?::00)?$/);
    if (!twentyFourHourTime) return "";
    normalized = `${twentyFourHourTime[1]}:${twentyFourHourTime[2]}`;
  }
  return /^(?:1[0-9]|20|21):[0-5][0-9]$|^22:00$/.test(normalized) ? normalized : "";
};

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

const resolveTableImageUrl = (table) => {
  const image = String(table.image_url || table.imageUrl || table.image || "").trim();
  if (!image) return "";

  try {
    const imageUrl = new URL(image, `${BACKEND_BASE_URL}/`);
    const isLocalImageHost = ["localhost", "127.0.0.1"].includes(imageUrl.hostname);
    const isLocalAppHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    if (isLocalImageHost && !isLocalAppHost) {
      const backendUrl = new URL(BACKEND_BASE_URL);
      imageUrl.protocol = backendUrl.protocol;
      imageUrl.host = backendUrl.host;
    }
    return imageUrl.href;
  } catch {
    return image;
  }
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
  const [availabilityError, setAvailabilityError] = useState("");
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
    const hasDateAndTime = Boolean(date && time);
    const normalizedDate = normalizeReservationDate(date);
    const normalizedTime = normalizeReservationTime(time);
    const validDateAndTime = Boolean(normalizedDate && normalizedTime);
    const validGuestCount = Number.isInteger(guestCount) && guestCount >= 1 && guestCount <= 20;
    if (!hasDateAndTime || !validDateAndTime || !validGuestCount) {
      setTables([]);
      setSelectedTable("");
      setTablesLoading(false);
      setAvailabilityError(
        hasDateAndTime && !validDateAndTime
          ? "Choose a valid reservation date and time."
          : hasDateAndTime && !validGuestCount
            ? "Guest count must be between 1 and 20."
            : ""
      );
      return () => { active = false; };
    }

    setAvailabilityError("");
    api.get("/reservations/available-tables", { params: { date: normalizedDate, time: normalizedTime, guests } })
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
        setAvailabilityError(error.response?.data?.message || "Available tables could not be loaded.");
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
    setAvailabilityError("");
    const nextGuests = update.guests ?? guests;
    const guestCount = Number(nextGuests);
    setTablesLoading(
      Boolean(update.date ?? date) &&
      Boolean(update.time ?? time) &&
      Number.isInteger(guestCount) &&
      guestCount >= 1 &&
      guestCount <= 20
    );
    if (update.date !== undefined) setDate(normalizeReservationDate(update.date) || update.date);
    if (update.time !== undefined) setTime(normalizeReservationTime(update.time) || update.time);
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
        date: normalizeReservationDate(date),
        time: normalizeReservationTime(time),
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
    <main className="min-h-screen bg-[#f7f7f3] pb-16 text-[#203129]">
      <PageHeader title="Reservation" />
      <PageContainer>
        <section className="py-5 sm:py-7">
          <form onSubmit={handleSubmit} className="mx-auto grid max-w-[1500px] gap-4 lg:grid-cols-2 lg:items-start">
            <div className="rounded-3xl border border-[#e8e8e1] bg-white p-5 shadow-[0_8px_30px_rgba(25,45,34,0.05)] sm:p-7 lg:col-start-1 lg:row-start-1">
              <div className="mb-6 flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#e9f3df] text-[#155c3b]">
                  <CalendarCheck2 className="h-7 w-7" />
                </span>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#18251f] sm:text-[27px]">Make a Reservation</h1>
                  <p className="mt-1 text-sm text-slate-500">Fill in the details to find the best table for your dining experience.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-600" /> Date</span>
                  <input name="date" type="date" min={minimumReservationDate} value={date} onChange={(event) => updateAvailability({ date: event.target.value })} required className="mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none transition focus:border-[#17834d] focus:ring-2 focus:ring-[#17834d]/10" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-slate-600" /> Time</span>
                  <input name="time" type="time" min="10:00" max="22:00" step="60" required value={time} onChange={(event) => updateAvailability({ time: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none transition focus:border-[#17834d] focus:ring-2 focus:ring-[#17834d]/10" />
                </label>
              </div>
              <label className="mt-4 block text-sm font-semibold text-slate-700">
                <span className="flex items-center gap-2"><Users className="h-4 w-4 text-slate-600" /> Number of Guests</span>
                <select name="guests" value={guests} onChange={(event) => updateAvailability({ guests: event.target.value })} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none transition focus:border-[#17834d] focus:ring-2 focus:ring-[#17834d]/10">
                  {Array.from({ length: 20 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} {count === 1 ? "Guest" : "Guests"}</option>)}
                </select>
              </label>
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#203129]"><UserRound className="h-4 w-4" /> Your Details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Full Name <span className="text-red-500">*</span>
                    <input name="name" type="text" autoComplete="name" required maxLength={150} value={form.name} onChange={handleFormChange} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none transition focus:border-[#17834d] focus:ring-2 focus:ring-[#17834d]/10" placeholder="Your name" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">
                    Email <span className="text-red-500">*</span>
                    <input name="email" type="email" autoComplete="email" required maxLength={255} value={form.email} onChange={handleFormChange} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none transition focus:border-[#17834d] focus:ring-2 focus:ring-[#17834d]/10" placeholder="you@example.com" />
                  </label>
                </div>
                <label className="mt-4 block text-xs font-semibold text-slate-700">
                  Phone Number <span className="text-red-500">*</span>
                  <input name="phone" type="tel" autoComplete="tel" required maxLength={32} value={form.phone} onChange={handleFormChange} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none transition focus:border-[#17834d] focus:ring-2 focus:ring-[#17834d]/10" placeholder="+91" />
                </label>
                <label className="mt-4 block text-xs font-semibold text-slate-700">
                  Special Requests <span className="font-normal text-slate-400">(Optional)</span>
                  <textarea name="notes" rows="3" maxLength={1000} value={form.notes} onChange={handleFormChange} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal outline-none transition focus:border-[#17834d] focus:ring-2 focus:ring-[#17834d]/10" placeholder="Birthday, anniversary, seating preference..." />
                </label>
                {errorMessage && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</p>}
                {successMessage && <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{successMessage}</p>}
                {isCustomer ? (
                  <button type="submit" disabled={submitting || tablesLoading || !selectedTable} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#08713e] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#075d34] focus:outline-none focus:ring-2 focus:ring-[#08713e] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
                    <CalendarCheck2 className="h-4 w-4" /> {submitting ? "Sending request…" : "Request this table"}
                  </button>
                ) : (
                  <button type="button" onClick={() => navigate("/login", { state: { from: "/reservation" } })} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#08713e] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#075d34]">
                    <CalendarCheck2 className="h-4 w-4" /> Login to request a table
                  </button>
                )}
                <p className="mt-3 text-center text-xs leading-5 text-slate-400">Requests remain pending until confirmed by our team. A table is held for one hour per request.</p>
              </div>

            </div>

            <div className="space-y-4 lg:col-start-2 lg:row-start-1">
            <section className="flex h-[430px] flex-col overflow-hidden rounded-3xl border border-[#e8e8e1] bg-white p-5 shadow-[0_8px_30px_rgba(25,45,34,0.05)] sm:p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e9f3df] text-[#155c3b]"><Armchair className="h-6 w-6" /></span>
                    <div>
                      <h2 className="text-xl font-bold text-[#18251f]">Available Tables</h2>
                      <p className="text-xs text-slate-500">Select a table based on your preference.</p>
                    </div>
                  </div>
                </div>
                <div className="mb-4 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                  {date && <span className="rounded-lg bg-slate-100 px-2.5 py-2"><CalendarDays className="mr-1 inline h-3.5 w-3.5" />{formatDate(date)}</span>}
                  {time && <span className="rounded-lg bg-slate-100 px-2.5 py-2"><Clock3 className="mr-1 inline h-3.5 w-3.5" />{formatTime(time)}</span>}
                  <span className="rounded-lg bg-slate-100 px-2.5 py-2"><Users className="mr-1 inline h-3.5 w-3.5" />{guests} Guests</span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {!time ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
                    Choose your date and time to see available tables.
                  </p>
                ) : tablesLoading ? (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">Checking table availability…</p>
                ) : availabilityError ? (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-5 text-center text-sm text-red-700">
                    {availabilityError}
                  </p>
                ) : tables.length ? (
                  <div className="space-y-2.5">
                    {tables.map((table) => {
                      const isSelected = selectedTable === table.table_id;
                      const tableImageUrl = resolveTableImageUrl(table);
                      return (
                        <button key={table.table_id} type="button" onClick={() => setSelectedTable(table.table_id)} aria-pressed={isSelected} className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition focus:outline-none focus:ring-2 focus:ring-[#16804a]/25 sm:gap-4 ${isSelected ? "border-[#19a45e] bg-[#fbfefb] shadow-[0_0_0_1px_rgba(25,164,94,0.18)]" : "border-slate-200 bg-white hover:border-[#9dc9a8] hover:bg-[#fbfefb]"}`}>
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-[#16804a]" : "border-slate-300"}`}>{isSelected && <span className="h-2.5 w-2.5 rounded-full bg-[#16804a]" />}</span>
                          {tableImageUrl ? <img src={tableImageUrl} alt={`Table ${table.table_number}`} className="h-[68px] w-24 shrink-0 rounded-xl object-cover sm:w-28" /> : <span className="flex h-[68px] w-24 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#244a32] via-[#68764b] to-[#d8ad69] text-white sm:w-28"><Utensils className="h-7 w-7" /></span>}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-[#203129]">Table {table.table_number}</span>
                            <span className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500"><Users className="h-3.5 w-3.5 shrink-0" /> {table.no_of_seats} Guests <span className="mx-1 text-slate-300">·</span><MapPin className="h-3.5 w-3.5 shrink-0" /> Indoor Seating</span>
                          </span>
                          <span className="hidden rounded-lg bg-[#e6f5e8] px-3 py-1.5 text-xs font-bold text-[#16804a] sm:inline-flex">Available</span>
                          {isSelected && <CheckCircle2 className="h-5 w-5 shrink-0 text-[#16804a] sm:hidden" />}
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
            </section>

            <div className="grid grid-cols-4 divide-x divide-[#e9dfca] rounded-2xl bg-[#fff7e8] px-2 py-4 text-center">
              {[
                { icon: Leaf, title: "Comfortable", detail: "Ambience", color: "text-emerald-700" },
                { icon: ChefHat, title: "Delicious", detail: "Food", color: "text-orange-600" },
                { icon: Users, title: "Perfect for", detail: "Gatherings", color: "text-orange-600" },
                { icon: Star, title: "Great", detail: "Experience", color: "text-orange-500" },
              ].map(({ icon: Icon, title, detail, color }) => (
                <div key={detail} className="flex flex-col items-center gap-1 px-1 text-[11px] font-semibold leading-tight text-slate-700">
                  <Icon className={`mb-1 h-6 w-6 ${color}`} />
                  <span>{title}</span><span>{detail}</span>
                </div>
              ))}
            </div>

            <section className="relative min-h-[190px] overflow-hidden rounded-3xl bg-[#073b27] px-6 py-6 text-white shadow-sm sm:px-8">
              <div className="absolute inset-0 bg-[url('/images/offerbanner.png')] bg-cover bg-[position:70%_center]" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#073b27] via-[#073b27]/90 to-[#073b27]/20" />
              <div className="relative max-w-md">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#d8c28d]"><Sparkles className="h-4 w-4" /> Make it memorable</p>
                <h2 className="mt-2 font-serif text-2xl font-bold sm:text-3xl">Celebrate <span className="block italic text-[#f4b323]">Special Moments</span></h2>
                <p className="mt-2 max-w-sm text-xs leading-5 text-white/80">Birthdays, anniversaries, family dinners and more. Let us make your evening special.</p>
                <button type="button" onClick={() => document.querySelector("[name='date']")?.focus()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#f2780b] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#db6500]">Book Now <ArrowRight className="h-3.5 w-3.5" /></button>
              </div>
            </section>
            </div>

          </form>

          {isCustomer && (
            <section className="mx-auto mt-8 max-w-[1500px] rounded-3xl border border-[#e8e8e1] bg-white p-5 shadow-[0_8px_30px_rgba(25,45,34,0.05)] sm:p-6">
              <div className="mb-4 flex items-center gap-4 border-b border-slate-100 pb-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e9f3df] text-[#155c3b]">
                  <Clock3 className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-[#18251f]">Your Reservations</h2>
                  <p className="text-xs text-slate-500">View your upcoming and past reservation requests.</p>
                </div>
                <span className="ml-auto hidden rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 sm:block">
                  {reservations.length} {reservations.length === 1 ? "reservation" : "reservations"}
                </span>
              </div>
              {reservations.length ? (
                <div className="space-y-2.5">
                  {reservations.map((reservation) => {
                    const statusClass = reservation.status === "Confirmed"
                      ? "bg-emerald-100 text-emerald-800"
                      : reservation.status === "Pending"
                        ? "bg-amber-100 text-amber-800"
                        : reservation.status === "Cancelled" || reservation.status === "Declined"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-700";
                    const imageUrl = resolveTableImageUrl(reservation);
                    return (
                      <article key={reservation.reservation_id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-[#cbd9cf] sm:flex-row sm:items-center sm:gap-4">
                        {imageUrl ? (
                          <img src={imageUrl} alt={`Table ${reservation.table_number}`} className="h-20 w-full shrink-0 rounded-xl object-cover sm:h-[58px] sm:w-28" />
                        ) : (
                          <div className="h-20 w-full shrink-0 rounded-xl bg-[url('/images/registre.png')] bg-cover bg-center sm:h-[58px] sm:w-28" role="img" aria-label="Restaurant table" />
                        )}
                        <div className="min-w-0 flex-1 sm:min-w-[115px]">
                          <p className="truncate text-sm font-bold text-[#18251f]">{reservation.reservation_id}</p>
                          <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass}`}>{reservation.status}</span>
                        </div>
                        <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600 sm:flex sm:items-center sm:justify-between">
                          <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 shrink-0 text-slate-700" />{formatDate(reservation.reservation_date)}</span>
                          <span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4 shrink-0 text-slate-700" />{formatTime(reservation.start_time)}</span>
                          <span className="flex items-center gap-1.5"><Users className="h-4 w-4 shrink-0 text-slate-700" />{reservation.guests} Guests</span>
                          <span className="flex items-center gap-1.5"><Armchair className="h-4 w-4 shrink-0 text-slate-700" />Table {reservation.table_number}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">You have no reservation requests yet.</p>
              )}
            </section>
          )}
        </section>
      </PageContainer>
    </main>
  );
};

export default Reservation;
