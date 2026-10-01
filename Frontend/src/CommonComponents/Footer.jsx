import React from "react";
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
import PageContainer from "./PageContainer";

const quickLinks = [
  { name: "Home", path: "/" },
  { name: "Menu", path: "/shop" },
  { name: "About Us", path: "/about" },
  { name: "Gallery", path: "/gallery" },
  { name: "Reservation", path: "/contact?type=reservation" },
  { name: "Contact", path: "/contact" },
];

const serviceLinks = [
  { name: "Dine In", path: "/contact?service=dine-in" },
  { name: "Takeaway", path: "/contact?service=takeaway" },
  { name: "Home Delivery", path: "/contact?service=delivery" },
  { name: "Catering", path: "/contact?service=catering" },
  { name: "Party Orders", path: "/contact?service=party-orders" },
  { name: "Corporate Events", path: "/contact?service=corporate-events" },
];

const footerLinkClass = "group flex items-center justify-between gap-3 text-sm text-brand-muted transition-colors hover:text-gold";

const Footer = () => {
  const handleNewsletterSubmit = (event) => {
    event.preventDefault();
    const email = event.currentTarget.elements.email.value.trim();
    if (!email) return;

    window.location.href = `mailto:info@foodierestaurant.com?subject=${encodeURIComponent("Newsletter subscription")}&body=${encodeURIComponent(`Please subscribe ${email} to restaurant updates.`)}`;
  };

  return (
    <footer className="relative overflow-hidden bg-brand-bg text-brand-text">
      <div aria-hidden="true" className="pointer-events-none absolute -left-5 top-8 hidden text-primary-soft/70 lg:block">
        <FaLeaf className="-rotate-45 text-6xl" />
        <FaLeaf className="-mt-5 ml-7 rotate-12 text-5xl" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute -right-5 bottom-5 hidden text-primary-soft/70 lg:block">
        <FaLeaf className="rotate-[135deg] text-6xl" />
        <FaLeaf className="-mt-5 mr-7 rotate-[195deg] text-5xl" />
      </div>

      <PageContainer>
        <div className="relative z-10 grid gap-9 py-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.55fr_0.85fr_1fr_1.25fr_1.25fr] xl:gap-0 xl:py-8">
          <section className="xl:pr-8">
            <Link to="/" className="inline-flex items-center gap-3" aria-label="Foodie Restaurant home">
              <FaUtensils className="text-4xl text-orange" />
              <span>
                <span className="block font-serif text-4xl font-bold italic leading-none text-brand-text">Foodie</span>
                <span className="mt-1 block text-[10px] font-bold tracking-[0.48em] text-orange">RESTAURANT</span>
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-5 text-brand-muted">
              A perfect blend of taste, tradition and quality. Fresh ingredients,
              authentic recipes and a memorable dining experience.
            </p>

            <div className="mt-4 flex items-center gap-2.5" aria-label="Social media">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-brand-text" aria-label="Facebook"><FaFacebookF /></span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange text-brand-bg" aria-label="Instagram"><FaInstagram /></span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-danger text-brand-text" aria-label="YouTube"><FaYoutube /></span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success text-brand-text" aria-label="WhatsApp"><FaWhatsapp /></span>
            </div>
          </section>

          <section className="border-t border-brand-border pt-5 sm:border-t-0 xl:border-l xl:px-6 xl:pt-0">
            <h2 className="mb-4 text-base font-bold text-brand-text">Quick Links</h2>
            <div className="mb-3 h-0.5 w-7 bg-gold" />
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className={footerLinkClass}>
                    <span>{link.name}</span>
                    <FiChevronRight className="text-gold transition-transform group-hover:translate-x-1" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-t border-brand-border pt-5 sm:border-t-0 xl:border-l xl:px-6 xl:pt-0">
            <h2 className="mb-4 text-base font-bold text-brand-text">Our Services</h2>
            <div className="mb-3 h-0.5 w-7 bg-gold" />
            <ul className="space-y-2">
              {serviceLinks.map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className={footerLinkClass}>
                    <span>{link.name}</span>
                    <FiChevronRight className="text-gold transition-transform group-hover:translate-x-1" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-t border-brand-border pt-5 sm:border-t-0 xl:border-l xl:px-6 xl:pt-0">
            <h2 className="mb-4 text-base font-bold text-brand-text">Contact Info</h2>
            <div className="mb-3 h-0.5 w-7 bg-gold" />
            <address className="space-y-4 not-italic text-sm text-brand-muted">
              <div className="flex items-start gap-3">
                <FiMapPin className="mt-0.5 shrink-0 text-lg text-gold" />
                <span>123 Food Street, Ambur,<br />Tamil Nadu - 635802</span>
              </div>
              <a href="tel:+919876543210" className="flex items-center gap-3 transition-colors hover:text-gold">
                <FiPhone className="shrink-0 text-lg text-gold" />
                <span>+91 98765 43210</span>
              </a>
              <a href="mailto:info@foodierestaurant.com" className="flex items-start gap-3 break-all transition-colors hover:text-gold">
                <FiMail className="mt-0.5 shrink-0 text-lg text-gold" />
                <span>info@foodierestaurant.com</span>
              </a>
              <div className="flex items-center gap-3">
                <FiClock className="shrink-0 text-lg text-gold" />
                <span>Mon - Sun: 10:00 AM - 11:00 PM</span>
              </div>
            </address>
          </section>

          <section className="border-t border-brand-border pt-5 sm:col-span-2 lg:col-span-1 sm:border-t-0 xl:border-l xl:pl-8 xl:pt-0">
            <h2 className="mb-4 text-base font-bold text-brand-text">Newsletter</h2>
            <div className="mb-3 h-0.5 w-7 bg-gold" />
            <p className="text-sm leading-5 text-brand-muted">
              Subscribe to get the latest offers, new dishes and exciting updates.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="mt-5 flex items-center gap-2 rounded-full bg-background p-1.5">
              <FiMail className="ml-2 shrink-0 text-lg text-[var(--text-primary)]" />
              <input
                name="email"
                type="email"
                required
                placeholder="Enter your email"
                aria-label="Email for restaurant updates"
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              />
              <button type="submit" aria-label="Request newsletter subscription" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange text-brand-bg transition hover:bg-orange-light">
                <FiArrowRight className="text-xl" />
              </button>
            </form>
          </section>
        </div>

        <div className="relative z-10 flex flex-col gap-3 border-t border-brand-border py-4 text-center text-xs text-brand-muted sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} Foodie Restaurant. All Rights Reserved.</p>
          <nav aria-label="Legal links" className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
            <Link to="/privacy-policy" className="transition-colors hover:text-gold">Privacy Policy</Link>
            <span aria-hidden="true" className="text-brand-border">|</span>
            <Link to="/terms" className="transition-colors hover:text-gold">Terms &amp; Conditions</Link>
            <span aria-hidden="true" className="text-brand-border">|</span>
            <Link to="/refund-policy" className="transition-colors hover:text-gold">Refund Policy</Link>
          </nav>
        </div>
      </PageContainer>
    </footer>
  );
};

export default Footer;