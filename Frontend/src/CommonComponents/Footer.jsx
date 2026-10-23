import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiChevronRight,
  FiClock,
  FiMail,
  FiMapPin,
  FiPhone,
} from "react-icons/fi";
import {
  FaFacebookF,
  FaInstagram,
  FaLeaf,
  FaUtensils,
  FaWhatsapp,
  FaYoutube,
} from "react-icons/fa";
import {
  HiOutlineHome,
  HiOutlineShoppingBag,
  HiOutlineLocationMarker,
} from "react-icons/hi";
import { MdOutlineRoomService } from "react-icons/md";
import PageContainer from "./PageContainer";

/* ─── Data ──────────────────────────────────────────── */
const quickLinks = [
  { name: "Home",        path: "/" },
  { name: "Menu",        path: "/shop" },
  { name: "About Us",    path: "/about" },
  { name: "Gallery",     path: "/gallery" },
  { name: "Reservation", path: "/reservation" },
  { name: "Contact",     path: "/contact" },
];

const serviceLinks = [
  { name: "Dine In",          path: "/contact?service=dine-in" },
  { name: "Takeaway",         path: "/contact?service=takeaway" },
  { name: "Home Delivery",    path: "/contact?service=delivery" },
  { name: "Catering",         path: "/contact?service=catering" },
  { name: "Party Orders",     path: "/contact?service=party-orders" },
  { name: "Corporate Events", path: "/contact?service=corporate-events" },
];

/* ─── Sub-components ────────────────────────────────── */

/** Section heading with golden circle icon */
const SectionHeading = ({ icon: Icon, label }) => (
  <div className="mb-5 flex items-center gap-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#FEB914]/50 bg-[#FEB914]/10 text-[#FEB914]">
      <Icon className="h-4 w-4" />
    </span>
    <h2 className="text-base font-bold text-white">{label}</h2>
  </div>
);

/** A single footer nav link row */
const FooterLink = ({ to, children }) => (
  <li>
    <Link
      to={to}
      className="group flex items-center justify-between gap-3 py-1 text-sm text-[#A5A9A8] transition-colors hover:text-[#FEB914]"
    >
      <span>{children}</span>
      <FiChevronRight className="shrink-0 text-[#FEB914] transition-transform group-hover:translate-x-1" />
    </Link>
  </li>
);

/* ─── Main Footer ───────────────────────────────────── */
const Footer = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail("");
    setTimeout(() => setSubscribed(false), 4000);
  };

  return (
    <footer className="relative overflow-hidden bg-[#071C18] text-white">

      {/* ── Wavy top edge ──────────────────────────── */}
      <div className="absolute inset-x-0 top-0 z-10 overflow-hidden leading-none">
        <svg
          viewBox="0 0 1440 56"
          preserveAspectRatio="none"
          className="h-14 w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,32 C240,60 480,0 720,32 C960,64 1200,0 1440,32 L1440,0 L0,0 Z"
            fill="#f7f9f5"
          />
        </svg>
      </div>

      {/* ── Decorative leaves (background) ─────────── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* top-left cluster */}
        <FaLeaf className="absolute left-[-10px] top-[70px] rotate-[-40deg] text-[80px] text-[#396F0B]/30" />
        <FaLeaf className="absolute left-[50px] top-[120px] rotate-[20deg] text-[55px] text-[#396F0B]/20" />
        {/* top-right cluster */}
        <FaLeaf className="absolute right-[-10px] top-[70px] rotate-[140deg] text-[80px] text-[#396F0B]/30" />
        <FaLeaf className="absolute right-[50px] top-[130px] rotate-[200deg] text-[55px] text-[#396F0B]/20" />
        {/* bottom decorative */}
        <FaLeaf className="absolute bottom-10 left-10 rotate-[30deg] text-[50px] text-[#396F0B]/15" />
        <FaLeaf className="absolute bottom-10 right-10 rotate-[160deg] text-[50px] text-[#396F0B]/15" />
      </div>

      {/* ── Food image (right side) ─────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 hidden h-[320px] w-[260px] xl:block"
        style={{
          backgroundImage: "url(/images/login.png)",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          maskImage: "linear-gradient(to left, black 50%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to left, black 50%, transparent 100%)",
          opacity: 0.55,
        }}
      />

      {/* ── Main grid ──────────────────────────────── */}
      <PageContainer>
        <div className="relative z-10 grid gap-8 pb-10 pt-20 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1.3fr] lg:gap-6">

          {/* ── Col 1 · Brand ── */}
          <section className="lg:pr-6">
            {/* Logo emblem */}
            <Link to="/" className="inline-flex items-center gap-4" aria-label="Foodie Restaurant home">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#FEB914]/60 bg-[#0f2e22]">
                <FaUtensils className="text-3xl text-[#FEB914]" />
              </div>
              <span>
                <span className="block font-serif text-3xl font-bold italic leading-none text-white">
                  Foodie
                </span>
                <span className="mt-1 block text-[9px] font-bold tracking-[0.45em] text-[#FEB914]">
                  RESTAURANT
                </span>
              </span>
            </Link>

            <p className="mt-5 max-w-[220px] text-sm leading-6 text-[#A5A9A8]">
              A perfect blend of taste, tradition and quality. Fresh ingredients,
              authentic recipes and a memorable dining experience.
            </p>

            {/* Social icons */}
            <div className="mt-5 flex items-center gap-2.5" aria-label="Social media links">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] text-white transition hover:opacity-80"
              >
                <FaFacebookF className="text-sm" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white transition hover:opacity-80"
              >
                <FaInstagram className="text-sm" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF0000] text-white transition hover:opacity-80"
              >
                <FaYoutube className="text-sm" />
              </a>
              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white transition hover:opacity-80"
              >
                <FaWhatsapp className="text-sm" />
              </a>
            </div>
          </section>

          {/* ── Col 2 · Quick Links ── */}
          <section className="border-t border-white/10 pt-6 sm:border-t-0 lg:border-l lg:border-white/10 lg:pl-6 lg:pt-0">
            <SectionHeading icon={HiOutlineHome} label="Quick Links" />
            <ul className="space-y-0.5">
              {quickLinks.map((lnk) => (
                <FooterLink key={lnk.name} to={lnk.path}>
                  {lnk.name}
                </FooterLink>
              ))}
            </ul>
          </section>

          {/* ── Col 3 · Our Services ── */}
          <section className="border-t border-white/10 pt-6 sm:border-t-0 lg:border-l lg:border-white/10 lg:pl-6 lg:pt-0">
            <SectionHeading icon={MdOutlineRoomService} label="Our Services" />
            <ul className="space-y-0.5">
              {serviceLinks.map((lnk) => (
                <FooterLink key={lnk.name} to={lnk.path}>
                  {lnk.name}
                </FooterLink>
              ))}
            </ul>
          </section>

          {/* ── Col 4 · Contact Info ── */}
          <section className="border-t border-white/10 pt-6 sm:border-t-0 lg:border-l lg:border-white/10 lg:pl-6 lg:pt-0">
            <SectionHeading icon={HiOutlineLocationMarker} label="Contact Info" />
            <address className="space-y-4 not-italic text-sm text-[#A5A9A8]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FEB914]/10 text-[#FEB914]">
                  <FiMapPin className="h-3.5 w-3.5" />
                </span>
                <span className="leading-5">
                  123 Food Street, Ambur,
                  <br />
                  Tamil Nadu - 635802
                </span>
              </div>
              <a
                href="tel:+919876543210"
                className="flex items-center gap-3 transition-colors hover:text-[#FEB914]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FEB914]/10 text-[#FEB914]">
                  <FiPhone className="h-3.5 w-3.5" />
                </span>
                <span>+91 98765 43210</span>
              </a>
              <a
                href="mailto:info@foodierestaurant.com"
                className="flex items-center gap-3 break-all transition-colors hover:text-[#FEB914]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FEB914]/10 text-[#FEB914]">
                  <FiMail className="h-3.5 w-3.5" />
                </span>
                <span>info@foodierestaurant.com</span>
              </a>
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FEB914]/10 text-[#FEB914]">
                  <FiClock className="h-3.5 w-3.5" />
                </span>
                <span>Mon - Sun: 10:00 AM - 11:00 PM</span>
              </div>
            </address>
          </section>

          {/* ── Col 5 · Newsletter ── */}
          <section className="border-t border-white/10 pt-6 sm:col-span-2 lg:col-span-1 lg:border-l lg:border-white/10 lg:pl-6 lg:pt-0">
            <SectionHeading icon={FiMail} label="Newsletter" />
            <p className="text-sm leading-6 text-[#A5A9A8]">
              Subscribe to get the latest offers, new dishes and exciting updates.
            </p>

            {subscribed ? (
              <div className="mt-4 rounded-xl bg-[#396F0B]/30 px-4 py-3 text-sm font-semibold text-[#a3c741]">
                ✓ Subscribed! Thanks for joining us.
              </div>
            ) : (
              <form
                onSubmit={handleNewsletterSubmit}
                className="mt-5 flex items-center gap-0 overflow-hidden rounded-full border border-white/20 bg-[#0f2e22]"
              >
                <FiMail className="ml-3.5 shrink-0 text-[#A5A9A8]" />
                <input
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  aria-label="Email for restaurant updates"
                  className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#A5A9A8]/60"
                />
                <button
                  type="submit"
                  aria-label="Subscribe to newsletter"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEB914] text-[#071C18] transition hover:bg-[#ffd055]"
                >
                  <FiArrowRight className="text-base font-bold" />
                </button>
              </form>
            )}
          </section>
        </div>

        {/* ── Bottom bar ─────────────────────────────── */}
        <div className="relative z-10 flex flex-col items-center gap-3 border-t border-white/10 py-4 text-center text-xs text-[#A5A9A8] sm:flex-row sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} Foodie Restaurant. All Rights Reserved.</p>

          {/* Decorative center icon */}
          <div className="hidden items-center gap-3 sm:flex">
            <span className="h-px w-16 bg-white/10" />
            <FaLeaf className="text-[#396F0B]/60" />
            <span className="h-px w-16 bg-white/10" />
          </div>

          <nav aria-label="Legal links" className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
            <Link to="/privacy-policy" className="transition-colors hover:text-[#FEB914]">
              Privacy Policy
            </Link>
            <span aria-hidden="true" className="text-white/20">|</span>
            <Link to="/terms" className="transition-colors hover:text-[#FEB914]">
              Terms &amp; Conditions
            </Link>
            <span aria-hidden="true" className="text-white/20">|</span>
            <Link to="/refund-policy" className="transition-colors hover:text-[#FEB914]">
              Refund Policy
            </Link>
          </nav>
        </div>
      </PageContainer>
    </footer>
  );
};

export default Footer;
