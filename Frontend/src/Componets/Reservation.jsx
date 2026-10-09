import { useMemo } from "react";
import { Clock3, Mail, MapPin, Phone } from "lucide-react";
import PageContainer from "../CommonComponents/PageContainer";
import PageHeader from "../CommonComponents/PageHeader";

const Reservation = () => {
  const minimumDate = useMemo(() => {
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const reservation = Object.fromEntries(formData.entries());
    const subject = `Table reservation request - ${reservation.name}`;
    const body = [
      "Hello, I would like to request a table reservation.",
      "",
      `Name: ${reservation.name}`,
      `Email: ${reservation.email}`,
      `Phone: ${reservation.phone}`,
      `Date: ${reservation.date}`,
      `Time: ${reservation.time}`,
      `Guests: ${reservation.guests}`,
      reservation.notes ? `Additional requests: ${reservation.notes}` : "",
    ].filter(Boolean).join("\n");

    window.location.href = `mailto:info@foodierestaurant.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
              Share your preferred date and time with us. Your email app will open with the request ready to send.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[0.8fr_1.2fr]">
            <aside className="bg-[#1a3c36] p-6 text-white sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#edc783]">We look forward to seeing you</p>
              <h3 className="mt-3 font-serif text-2xl font-bold">A table is waiting.</h3>
              <p className="mt-3 text-sm leading-6 text-white/75">
                Tell us when you would like to visit and how many guests are joining. We will follow up to confirm your reservation.
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

            <form onSubmit={handleSubmit} className="space-y-5 p-6 sm:p-8">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Your name
                  <input name="name" type="text" autoComplete="name" required maxLength={100} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-[#1a3c36] focus:ring-2 focus:ring-[#1a3c36]/10" placeholder="Full name" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Phone number
                  <input name="phone" type="tel" autoComplete="tel" required maxLength={30} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-[#1a3c36] focus:ring-2 focus:ring-[#1a3c36]/10" placeholder="+91" />
                </label>
              </div>

              <label className="block text-sm font-semibold text-slate-700">
                Email address
                <input name="email" type="email" autoComplete="email" required maxLength={254} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-[#1a3c36] focus:ring-2 focus:ring-[#1a3c36]/10" placeholder="you@example.com" />
              </label>

              <div className="grid gap-5 sm:grid-cols-3">
                <label className="text-sm font-semibold text-slate-700 sm:col-span-1">
                  Date
                  <input name="date" type="date" min={minimumDate} required className="mt-2 w-full min-w-0 rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none transition focus:border-[#1a3c36] focus:ring-2 focus:ring-[#1a3c36]/10" />
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Time
                  <select name="time" required defaultValue="" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none transition focus:border-[#1a3c36] focus:ring-2 focus:ring-[#1a3c36]/10">
                    <option value="" disabled>Select time</option>
                    {["10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM"].map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  Guests
                  <select name="guests" required defaultValue="2" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none transition focus:border-[#1a3c36] focus:ring-2 focus:ring-[#1a3c36]/10">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
                      <option key={count} value={count}>{count} {count === 1 ? "guest" : "guests"}</option>
                    ))}
                    <option value="9+">9+ guests</option>
                  </select>
                </label>
              </div>

              <label className="block text-sm font-semibold text-slate-700">
                Special requests <span className="font-normal text-slate-400">(optional)</span>
                <textarea name="notes" rows="3" maxLength={1000} className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none transition focus:border-[#1a3c36] focus:ring-2 focus:ring-[#1a3c36]/10" placeholder="Occasion, seating preference, or other details" />
              </label>

              <button type="submit" className="w-full rounded-xl bg-[#1a3c36] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#245048] focus:outline-none focus:ring-2 focus:ring-[#1a3c36] focus:ring-offset-2">
                Send reservation request
              </button>
              <p className="text-center text-xs leading-5 text-slate-400">
                This opens your email app with the request details. Your reservation is confirmed only after our team replies.
              </p>
            </form>
          </div>
        </section>
      </PageContainer>
    </main>
  );
};

export default Reservation;
