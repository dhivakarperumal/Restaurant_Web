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
  FaWhatsapp,
  FaYoutube,
} from "react-icons/fa";
import {
  HiOutlineHome,
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

/** Section heading — icon badge + label + gold underline rule */
const SectionHeading = ({ icon: Icon, label }) => (
  <div className="mb-5">
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FEB914]/15 text-[#FEB914] ring-1 ring-[#FEB914]/30">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="text-[15px] font-bold tracking-wide text-white">{label}</h2>
    </div>
    {/* Gold rule */}
    <div className="mt-3 flex items-center gap-1.5">
      <span className="h-[2px] w-8 rounded-full bg-[#FEB914]" />
      <span className="h-[2px] w-2 rounded-full bg-[#FEB914]/40" />
    </div>
  </div>
);

/** A single footer nav link row */
const FooterLink = ({ to, children }) => (
  <li>
    <Link
      to={to}
      className="group flex items-center gap-2 py-[5px] text-[13px] text-[#d0dbd5] transition-all duration-200 hover:translate-x-1 hover:text-[#FEB914]"
    >
      <FiChevronRight className="h-3.5 w-3.5 shrink-0 text-[#396F0B] transition-colors group-hover:text-[#FEB914]" />
      <span>{children}</span>
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

      {/* ── Top accent bar ──────────────────────────── */}
      <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-[#FEB914] to-transparent" />

      {/* ── Decorative leaves ───────────────────────── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <FaLeaf className="absolute left-[-14px] top-[60px]  rotate-[-40deg] text-[90px]  text-[#396F0B]/20" />
        <FaLeaf className="absolute left-[55px]  top-[130px] rotate-[20deg]  text-[60px]  text-[#396F0B]/12" />
        <FaLeaf className="absolute right-[-14px] top-[60px]  rotate-[140deg] text-[90px]  text-[#396F0B]/20" />
        <FaLeaf className="absolute right-[55px]  top-[140px] rotate-[200deg] text-[60px]  text-[#396F0B]/12" />
        <FaLeaf className="absolute bottom-8 left-8   rotate-[30deg]  text-[50px]  text-[#396F0B]/10" />
        <FaLeaf className="absolute bottom-8 right-8  rotate-[160deg] text-[50px]  text-[#396F0B]/10" />
      </div>

      {/* ── Subtle radial glow behind brand column ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 h-[340px] w-[340px] rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, #396F0B 0%, transparent 70%)",
        }}
      />

      {/* ── Food image (right side) ─────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 hidden h-[300px] w-[240px] xl:block"
        style={{
          backgroundImage: "url(/images/login.png)",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          maskImage: "linear-gradient(to left, black 40%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to left, black 40%, transparent 100%)",
          opacity: 0.45,
        }}
      />

      {/* ── Main content grid ───────────────────────── */}
      <PageContainer>
        <div className="relative z-10 grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1.35fr] lg:gap-8">

          {/* ── Col 1 · Brand ── */}
          <section className="flex flex-col gap-5 lg:pr-4">
            {/* Logo */}
            <Link to="/" className="inline-block" aria-label="Foodie Restaurant home">
              <img
                src="/images/logo.png"
                alt="Foodie Restaurant"
                className="h-[58px] w-auto object-contain sm:h-[68px]"
              />
            </Link>

            <p className="max-w-[210px] text-[13px] leading-6 text-[#d0dbd5]">
              A perfect blend of taste, tradition and quality. Fresh ingredients,
              authentic recipes and a memorable dining experience.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-2" aria-label="Social media links">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2]/90 text-white shadow-lg shadow-[#1877F2]/20 transition hover:scale-110 hover:bg-[#1877F2]"
              >
                <FaFacebookF className="text-sm" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white shadow-lg shadow-pink-500/20 transition hover:scale-110"
              >
                <FaInstagram className="text-sm" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FF0000]/90 text-white shadow-lg shadow-red-500/20 transition hover:scale-110 hover:bg-[#FF0000]"
              >
                <FaYoutube className="text-sm" />
              </a>
              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366]/90 text-white shadow-lg shadow-green-500/20 transition hover:scale-110 hover:bg-[#25D366]"
              >
                <FaWhatsapp className="text-sm" />
              </a>
            </div>
          </section>

          {/* ── Col 2 · Quick Links ── */}
          <section className="border-t border-white/8 pt-6 sm:border-t-0 lg:border-l lg:border-white/8 lg:pl-7 lg:pt-0">
            <SectionHeading icon={HiOutlineHome} label="Quick Links" />
            <ul className="space-y-0">
              {quickLinks.map((lnk) => (
                <FooterLink key={lnk.name} to={lnk.path}>
                  {lnk.name}
                </FooterLink>
              ))}
            </ul>
          </section>

          {/* ── Col 3 · Our Services ── */}
          <section className="border-t border-white/8 pt-6 sm:border-t-0 lg:border-l lg:border-white/8 lg:pl-7 lg:pt-0">
            <SectionHeading icon={MdOutlineRoomService} label="Our Services" />
            <ul className="space-y-0">
              {serviceLinks.map((lnk) => (
                <FooterLink key={lnk.name} to={lnk.path}>
                  {lnk.name}
                </FooterLink>
              ))}
            </ul>
          </section>

          {/* ── Col 4 · Contact Info ── */}
          <section className="border-t border-white/8 pt-6 sm:border-t-0 lg:border-l lg:border-white/8 lg:pl-7 lg:pt-0">
            <SectionHeading icon={HiOutlineLocationMarker} label="Contact Info" />
            <address className="space-y-3.5 not-italic text-[13px] text-[#d0dbd5]">

              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#FEB914]/10 text-[#FEB914] ring-1 ring-[#FEB914]/20">
                  <FiMapPin className="h-3.5 w-3.5" />
                </span>
                <span className="leading-5">
                  123 Food Street, Ambur,<br />Tamil Nadu - 635802
                </span>
              </div>

              <a href="tel:+919876543210" className="flex items-center gap-3 transition-colors hover:text-[#FEB914]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#FEB914]/10 text-[#FEB914] ring-1 ring-[#FEB914]/20">
                  <FiPhone className="h-3.5 w-3.5" />
                </span>
                <span>+91 98765 43210</span>
              </a>

              <a href="mailto:info@foodierestaurant.com" className="flex items-center gap-3 break-all transition-colors hover:text-[#FEB914]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#FEB914]/10 text-[#FEB914] ring-1 ring-[#FEB914]/20">
                  <FiMail className="h-3.5 w-3.5" />
                </span>
                <span>info@foodierestaurant.com</span>
              </a>

              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#FEB914]/10 text-[#FEB914] ring-1 ring-[#FEB914]/20">
                  <FiClock className="h-3.5 w-3.5" />
                </span>
                <span>Mon - Sun: 10:00 AM - 11:00 PM</span>
              </div>

            </address>
          </section>

          {/* ── Col 5 · Newsletter ── */}
          <section className="border-t border-white/8 pt-6 sm:col-span-2 lg:col-span-1 lg:border-l lg:border-white/8 lg:pl-7 lg:pt-0">
            <SectionHeading icon={FiMail} label="Newsletter" />
            <p className="text-[13px] leading-6 text-[#d0dbd5]">
              Subscribe to get the latest offers, new dishes and exciting updates.
            </p>

            {subscribed ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#396F0B]/40 bg-[#396F0B]/20 px-4 py-3 text-sm font-semibold text-[#a3c741]">
                <span>✓</span>
                <span>Subscribed! Thanks for joining us.</span>
              </div>
            ) : (
              <form
                onSubmit={handleNewsletterSubmit}
                className="mt-5 flex items-center overflow-hidden rounded-xl border border-white/10 bg-[#0d2618] shadow-inner"
              >
                <FiMail className="ml-3.5 shrink-0 text-[#d0dbd5]" />
                <input
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  aria-label="Email for restaurant updates"
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[13px] text-white outline-none placeholder:text-[#d0dbd5]/60"
                />
                <button
                  type="submit"
                  aria-label="Subscribe to newsletter"
                  className="m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FEB914] text-[#071C18] transition hover:bg-[#ffd055] active:scale-95"
                >
                  <FiArrowRight className="text-base font-bold" />
                </button>
              </form>
            )}
          </section>
        </div>

        {/* ── Bottom bar ──────────────────────────────── */}
        <div className="relative z-10 border-t border-white/10">
          {/* Gradient line above bottom bar */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#FEB914]/30 to-transparent" />

          <div className="flex flex-col items-center gap-3 py-4 text-center text-[12px] text-[#b0bbb6] sm:flex-row sm:justify-between sm:text-left">
            <p>© {new Date().getFullYear()} Foodie Restaurant. All Rights Reserved.</p>

            {/* Decorative center divider */}
            <div className="hidden items-center gap-2 sm:flex">
              <span className="h-px w-12 bg-white/10" />
              <FaLeaf className="text-[#396F0B]/50" />
              <span className="h-px w-12 bg-white/10" />
            </div>

            <nav aria-label="Legal links" className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
              <Link to="/privacy-policy" className="transition-colors hover:text-[#FEB914]">
                Privacy Policy
              </Link>
              <span aria-hidden="true" className="text-white/15">|</span>
              <Link to="/terms" className="transition-colors hover:text-[#FEB914]">
                Terms &amp; Conditions
              </Link>
              <span aria-hidden="true" className="text-white/15">|</span>
              <Link to="/refund-policy" className="transition-colors hover:text-[#FEB914]">
                Refund Policy
              </Link>
            </nav>
          </div>
        </div>
      </PageContainer>
    </footer>
  );
};

export default Footer;
