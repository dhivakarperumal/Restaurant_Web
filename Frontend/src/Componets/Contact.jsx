import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Clock,
  Navigation,
  User,
  Send,
  Package,
  RefreshCcw,
  Headphones,
  MessageSquare,
  ChevronDown,
  Leaf,
} from "lucide-react";
import PageContainer from "../CommonComponents/PageContainer";
import PageHeader from "../CommonComponents/PageHeader";

/* ─── Static data ───────────────────────────────────── */

const contactCards = [
  {
    icon: Phone,
    title: "Call Us",
    line1: "+91 98765 43210",
    line2: "Mon - Sun, 8:00 AM - 9:00 PM",
    href: "tel:+919876543210",
  },
  {
    icon: Mail,
    title: "Email Us",
    line1: "support@restaurant.com",
    line2: "We'll respond within 24 hours",
    href: "mailto:support@restaurant.com",
  },
  {
    icon: MapPin,
    title: "Our Location",
    line1: "12B, Anna Nagar, Main Road,",
    line2: "Tirupattur, Tamil Nadu – 635601",
    href: "https://maps.google.com",
  },
  {
    icon: MessageCircle,
    title: "Support",
    line1: "For order issues, returns",
    line2: "or general queries",
    href: "#contact-form",
  },
];

const subjectOptions = [
  "Order Related Query",
  "Returns & Refunds",
  "General Support",
  "Feedback",
  "Partnership",
  "Other",
];

const supportCards = [
  {
    icon: Package,
    title: "Order Related Queries",
    desc: "Get help with your orders, deliveries and tracking.",
  },
  {
    icon: RefreshCcw,
    title: "Returns & Refunds",
    desc: "Need to return an item? We'll guide you through it.",
  },
  {
    icon: Headphones,
    title: "General Support",
    desc: "Have a question? Our team is here to help.",
  },
  {
    icon: MessageSquare,
    title: "Feedback",
    desc: "We value your feedback to serve you better.",
  },
];

/* ─── Component ─────────────────────────────────────── */

function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [sent, setSent] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 4000);
    setForm({ name: "", email: "", phone: "", subject: "", message: "" });
  };

  return (
    <main className="min-h-screen bg-[#f7f9f5] text-[#203129]">

    <PageHeader title="Contact Us" />

      {/* ── 4-CARD INFO BAR ──────────────────────────── */}
      <PageContainer>
        <div className="grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {contactCards.map(({ icon: Icon, title, line1, line2, href }) => (
            <a
              key={title}
              href={href}
              className="flex items-start gap-4 rounded-2xl border border-[#d9e8ce] bg-white p-5 shadow-sm transition hover:border-[#396F0B]/40 hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef5e7] text-[#396F0B]">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-[#396F0B]">{title}</p>
                <p className="mt-1 text-sm font-semibold text-[#1a3c2e]">{line1}</p>
                <p className="mt-0.5 text-xs text-slate-500">{line2}</p>
              </div>
            </a>
          ))}
        </div>
      </PageContainer>

      {/* ── MAP + FORM ───────────────────────────────── */}
      <PageContainer>
        <div id="contact-form" className="grid gap-8 pb-16 lg:grid-cols-2">

          {/* Left — Map & Location info */}
          <div>
            <h2 className="text-2xl font-black">
              Our <span className="text-[#e07b3c]">Location</span>
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Visit us or reach out anytime. We'd love to hear from you.
            </p>

            {/* Google Map embed */}
            <div className="mt-5 overflow-hidden rounded-2xl border border-[#d9e8ce] shadow-sm">
              <iframe
                title="Restaurant Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3908.472!2d78.6001!3d12.4988!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDI5JzU1LjciTiA3OMKwMzYnMDAuNCJF!5e0!3m2!1sen!2sin!4v1234567890"
                width="100%"
                height="280"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full"
              />
            </div>

            {/* Address / Hours / Directions row */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-[#d9e8ce] bg-white p-4">
                <MapPin className="h-4 w-4 text-[#396F0B]" />
                <p className="mt-2 text-xs font-bold text-[#1a3c2e]">Address</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  12B, Anna Nagar, Main Road,
                  <br />
                  Tirupattur, Tamil Nadu – 635601
                </p>
              </div>
              <div className="rounded-xl border border-[#d9e8ce] bg-white p-4">
                <Clock className="h-4 w-4 text-[#396F0B]" />
                <p className="mt-2 text-xs font-bold text-[#1a3c2e]">Business Hours</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Mon – Sun
                  <br />
                  8:00 AM – 9:00 PM
                </p>
              </div>
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col rounded-xl border border-[#d9e8ce] bg-white p-4 transition hover:border-[#396F0B]/40"
              >
                <Navigation className="h-4 w-4 text-[#396F0B]" />
                <p className="mt-2 text-xs font-bold text-[#1a3c2e]">Get Directions</p>
                <p className="mt-1 text-[11px] leading-4 text-[#396F0B] underline underline-offset-2">
                  Find us on Google Maps ›
                </p>
              </a>
            </div>
          </div>

          {/* Right — Contact Form */}
          <div className="rounded-2xl border border-[#d9e8ce] bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-black">
              Send Us a <span className="text-[#e07b3c]">Message</span>
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Fill in the details below and we'll get back to you soon.
            </p>

            {sent && (
              <div className="mt-4 rounded-xl bg-[#eef5e7] px-4 py-3 text-sm font-semibold text-[#396F0B]">
                ✓ Message sent! We'll get back to you within 24 hours.
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Name + Email */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="name"
                    placeholder="Your Name *"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-[#d9e8ce] bg-[#f7f9f5] py-3 pl-10 pr-4 text-sm outline-none focus:border-[#396F0B] focus:ring-2 focus:ring-[#396F0B]/15"
                  />
                </div>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    placeholder="Your Email *"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-[#d9e8ce] bg-[#f7f9f5] py-3 pl-10 pr-4 text-sm outline-none focus:border-[#396F0B] focus:ring-2 focus:ring-[#396F0B]/15"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Your Phone Number"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[#d9e8ce] bg-[#f7f9f5] py-3 pl-10 pr-4 text-sm outline-none focus:border-[#396F0B] focus:ring-2 focus:ring-[#396F0B]/15"
                />
              </div>

              {/* Subject */}
              <div className="relative">
                <MessageCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  required
                  className="w-full appearance-none rounded-xl border border-[#d9e8ce] bg-[#f7f9f5] py-3 pl-10 pr-10 text-sm text-slate-600 outline-none focus:border-[#396F0B] focus:ring-2 focus:ring-[#396F0B]/15"
                >
                  <option value="">Subject *</option>
                  {subjectOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Message */}
              <div className="relative">
                <MessageSquare className="pointer-events-none absolute left-3 top-4 h-4 w-4 text-slate-400" />
                <textarea
                  name="message"
                  rows={5}
                  placeholder="Your Message *"
                  value={form.message}
                  onChange={handleChange}
                  required
                  className="w-full resize-none rounded-xl border border-[#d9e8ce] bg-[#f7f9f5] py-3 pl-10 pr-4 text-sm outline-none focus:border-[#396F0B] focus:ring-2 focus:ring-[#396F0B]/15"
                />
                <p className="mt-1 pl-1 text-[10px] text-slate-400">
                  Write your message here...
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a3c2e] py-3.5 text-sm font-bold text-white transition hover:bg-[#396F0B]"
              >
                <Send className="h-4 w-4" />
                Send Message
              </button>
            </form>
          </div>
        </div>
      </PageContainer>

      {/* ── SUPPORT CATEGORIES ───────────────────────── */}
      <section className="relative overflow-hidden bg-[#eef5e7] py-16">
        {/* Decorative leaves */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-15">
          <Leaf className="absolute -left-6 bottom-4 h-40 w-40 rotate-[-20deg] text-[#396F0B]" />
          <Leaf className="absolute -right-6 top-4 h-32 w-32 rotate-[30deg] text-[#396F0B]" />
        </div>

        <PageContainer>
          <div className="relative z-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#396F0B]">
              We're Always Here
            </p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">
              Need Help with{" "}
              <span className="text-[#e07b3c]">Your Order?</span>
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Quick support for a better experience
            </p>
          </div>

          <div className="relative z-10 mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {supportCards.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-4 rounded-2xl border border-[#d9e8ce] bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef5e7] text-[#396F0B]">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-[#1a3c2e]">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>
    </main>
  );
}

export default Contact;
