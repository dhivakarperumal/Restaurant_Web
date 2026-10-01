import React from "react";
import { Link } from "react-router-dom";
import {
  FiMapPin,
  FiPhone,
  FiClock,
  FiMail,
  FiFacebook,
  FiInstagram,
  FiCamera,
  FiImage,
  FiGift,
  FiHome,
  FiShoppingBag,
  FiGrid,
  FiHeart,
  FiUsers,
  FiBookOpen,
  FiInfo,
  FiNavigation
} from "react-icons/fi";
import PageContainer from "./PageContainer";

const Footer = () => {
  const quickLinks = [
    { name: "Home", path: "/", icon: FiHome },
    { name: "Shop", path: "/shop", icon: FiShoppingBag },
    { name: "Frames", path: "/frames", icon: FiImage },
    // { name: "Custom Frame", path: "/custom-frame", icon: FiGrid },
    { name: "Gifts", path: "/gifts", icon: FiGift },
    { name: "Albums", path: "/albums", icon: FiBookOpen },
    { name: "Gallery", path: "/gallery", icon: FiCamera },
    { name: "About Us", path: "/about", icon: FiInfo },
    { name: "Contact Us", path: "/contact", icon: FiPhone },
  ];

  return (
    <footer className="bg-[#2a2d31] text-white">
      <PageContainer>
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.2fr_1.1fr_1fr_1.2fr_1.6fr]">


          {/* =====================================================
              2. PHOTO SHOP
          ====================================================== */}
          <div>
            <h3 className="mb-5 text-sm font-black uppercase tracking-[0.14em] text-[#f5d39d]">
              Photo Shop
            </h3>

            <p className="text-[13px] leading-6 text-[#c9c9c9] text-justify">
              Your memories deserve more than just a place on your phone.
              We help transform your favorite photographs into beautiful
              prints, frames and albums that you can enjoy every day.
            </p>

            <p className="mt-4 text-[13px] leading-6 text-[#999] text-justify">
              From special celebrations to everyday family moments, we
              carefully create products that help your memories stay close
              for years to come.
            </p>

            <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#dcb77e]">
              <FiHeart />
              <span>Turning moments into memories</span>
            </div>
          </div>

          {/* =====================================================
              1. QUICK LINKS
          ====================================================== */}
          <div>
            <h3 className="mb-5 text-sm font-black uppercase tracking-[0.14em] text-[#f5d39d]">
              Quick Links
            </h3>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {quickLinks.map((link) => {
                const Icon = link.icon;

                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className="group flex items-center gap-2 text-[13px] text-[#d4d4d4] transition-colors hover:text-[#f5d39d]"
                  >
                    <Icon className="shrink-0 text-[#d79d4a] transition-transform duration-300 group-hover:scale-110" />

                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          

          {/* =====================================================
              3. FOLLOW US
          ====================================================== */}
          <div>
            <h3 className="mb-5 text-sm font-black uppercase tracking-[0.14em] text-[#f5d39d]">
              Follow Us
            </h3>

            <p className="text-[13px] leading-6 text-[#c9c9c9]">
              Stay connected with us and discover our latest photo frames,
              creative designs, studio work and beautiful customer memories.
            </p>

            <div className="mt-6 flex gap-3">

              {/* Facebook */}
              <a
                href="#"
                aria-label="Facebook"
                className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl text-[#e5e5e5] transition-all duration-300 hover:-translate-y-1 hover:border-[#d79d4a] hover:bg-[#d79d4a] hover:text-[#1d1d1d]"
              >
                <FiFacebook />
              </a>

              {/* Instagram */}
              <a
                href="#"
                aria-label="Instagram"
                className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl text-[#e5e5e5] transition-all duration-300 hover:-translate-y-1 hover:border-[#d79d4a] hover:bg-[#d79d4a] hover:text-[#1d1d1d]"
              >
                <FiInstagram />
              </a>

              {/* Email */}
              <a
                href="mailto:info@pixelframe.com"
                aria-label="Email"
                className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-2xl text-[#e5e5e5] transition-all duration-300 hover:-translate-y-1 hover:border-[#d79d4a] hover:bg-[#d79d4a] hover:text-[#1d1d1d]"
              >
                <FiMail />
              </a>
            </div>

            <p className="mt-5 text-xs leading-5 text-[#777]">
              Follow us for inspiration, new collections and special
              photography moments.
            </p>
          </div>

          {/* =====================================================
              4. ADDRESS DETAILS
          ====================================================== */}
          <div>
            <h3 className="mb-5 text-sm font-black uppercase tracking-[0.14em] text-[#f5d39d]">
              Visit Us
            </h3>

            <div className="space-y-5">

              {/* Address */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#d79d4a]/10">
                  <FiMapPin className="text-[#f5d39d]" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#999]">
                    Studio Address
                  </p>

                  <p className="mt-1 text-[13px] leading-5 text-[#d5d5d5]">
                    123, MG Road,
                    <br />
                    Coimbatore, Tamil Nadu
                  </p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#d79d4a]/10">
                  <FiPhone className="text-[#f5d39d]" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#999]">
                    Call Us
                  </p>

                  <p className="mt-1 text-[13px] text-[#d5d5d5]">
                    +91 98765 43210
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#d79d4a]/10">
                  <FiMail className="text-[#f5d39d]" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#999]">
                    Email
                  </p>

                  <p className="mt-1 break-all text-[13px] text-[#d5d5d5]">
                    info@pixelframe.com
                  </p>
                </div>
              </div>

              {/* Timing */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#d79d4a]/10">
                  <FiClock className="text-[#f5d39d]" />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#999]">
                    Opening Hours
                  </p>

                  <p className="mt-1 text-[13px] text-[#d5d5d5]">
                    Mon - Sun
                    <br />
                    9:00 AM - 9:00 PM
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* =====================================================
              5. FULL MAP
          ====================================================== */}
          <div>
            <h3 className="mb-5 text-sm font-black uppercase tracking-[0.14em] text-[#f5d39d]">
              Find Us
            </h3>

            <div className="relative h-[260px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#202225]">

              {/* Map-like Background */}
              <div className="absolute inset-0">

                {/* Roads */}
                <div className="absolute left-[-20%] top-[45%] h-[8px] w-[150%] rotate-[12deg] bg-[#35383b]" />

                <div className="absolute left-[-20%] top-[62%] h-[5px] w-[150%] rotate-[-20deg] bg-[#383b3e]" />

                <div className="absolute left-[35%] top-[-30%] h-[170%] w-[7px] rotate-[18deg] bg-[#35383b]" />

                <div className="absolute left-[70%] top-[-30%] h-[170%] w-[5px] rotate-[-25deg] bg-[#383b3e]" />

                {/* Smaller roads */}
                <div className="absolute left-[-10%] top-[25%] h-[2px] w-[120%] rotate-[-8deg] bg-white/10" />

                <div className="absolute left-[-10%] top-[75%] h-[2px] w-[120%] rotate-[8deg] bg-white/10" />

                <div className="absolute left-[20%] top-[-20%] h-[140%] w-[2px] rotate-[-10deg] bg-white/10" />

                <div className="absolute left-[82%] top-[-20%] h-[140%] w-[2px] rotate-[10deg] bg-white/10" />

                {/* Blocks */}
                <div className="absolute left-[8%] top-[12%] h-10 w-16 rounded bg-white/[0.03]" />
                <div className="absolute right-[8%] top-[18%] h-12 w-20 rounded bg-white/[0.03]" />
                <div className="absolute left-[12%] bottom-[12%] h-12 w-20 rounded bg-white/[0.03]" />
                <div className="absolute right-[10%] bottom-[15%] h-10 w-16 rounded bg-white/[0.03]" />
              </div>

              {/* Center Location */}
              <div className="absolute inset-0 flex items-center justify-center">

                <div className="relative">

                  {/* Pulse */}
                  <div className="absolute -inset-4 animate-ping rounded-full bg-[#d79d4a]/20" />

                  {/* Pin */}
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#d79d4a] text-[#1d1d1d] shadow-[0_8px_30px_rgba(215,157,74,0.45)]">
                    <FiMapPin className="text-2xl" />
                  </div>

                </div>
              </div>

              {/* Location Card */}
              <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-white/10 bg-[#1c1d1f]/90 px-4 py-3 backdrop-blur-md">

                <div className="flex items-center justify-between gap-3">

                  <div>
                    <p className="text-xs font-bold text-white">
                      Frames Photo Studio
                    </p>

                    <p className="mt-1 text-[10px] text-[#999]">
                      MG Road, Coimbatore
                    </p>
                  </div>

                  <button
                    type="button"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d79d4a] text-[#1d1d1d] transition hover:bg-[#f5d39d]"
                    aria-label="Get directions"
                  >
                    <FiNavigation className="text-sm" />
                  </button>

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col gap-3 border-t border-white/10 py-5 text-center text-xs text-[#888] sm:flex-row sm:items-center sm:justify-between sm:text-left">

          <p>
            © {new Date().getFullYear()} Frames Photo Studio &amp; Frame Shop.
            All rights reserved.
          </p>

          <p className="flex items-center justify-center gap-1">
            Made with
            <FiHeart className="text-[#d79d4a]" />
            for your memories
          </p>

        </div>
      </PageContainer>
    </footer>
  );
};

export default Footer;

