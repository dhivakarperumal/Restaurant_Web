import React, { useState } from "react";
import { FaWhatsapp } from "react-icons/fa";

const FloatingWhatsApp = () => {
  const [isHovered, setIsHovered] = useState(false);
  const phoneNumber = "919597293504";
  const defaultMessage = encodeURIComponent("Hello Q-Techx Solutions, I would like to inquire about your services.");
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${defaultMessage}`;

  return (
    <aside
      aria-label="WhatsApp Support"
      className="fixed bottom-5 right-5 z-40 flex items-center sm:bottom-6 sm:right-6"
    >
      {/* Tooltip banner sliding to the left */}
      <div
        className={`pointer-events-none absolute right-full mr-3 hidden items-center whitespace-nowrap rounded-xl border border-white/10 bg-[#11171c]/95 px-3.5 py-2 text-xs text-white shadow-[0_8px_25px_rgba(0,0,0,0.6)] backdrop-blur-md transition-all duration-300 sm:flex ${
          isHovered
            ? "translate-x-0 opacity-100"
            : "translate-x-2 opacity-0"
        }`}
      >
        <div className="flex flex-col text-right">
          <span className="font-semibold text-white">Chat on WhatsApp</span>
          <span className="text-[11px] text-[#25D366]">+91 95972 93504</span>
        </div>
        {/* Tooltip arrow pointing right */}
        <span className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 border-t border-r border-white/10 bg-[#11171c]/95" />
      </div>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp at +91 95972 93504"
        title="Chat with us on WhatsApp (+91 95972 93504)"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_25px_rgba(37,211,102,0.45)] transition-all duration-300 hover:scale-110 hover:bg-[#20bd5a] hover:shadow-[0_10px_30px_rgba(37,211,102,0.65)] focus:outline-none focus:ring-4 focus:ring-[#25D366]/40 sm:h-14 sm:w-14"
      >

        {/* WhatsApp Icon */}
        <FaWhatsapp className="relative z-10 text-2xl text-white transition-transform duration-300 group-hover:scale-110 sm:text-3xl" />

        {/* Online indicator dot */}
        <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
        </span>
      </a>
    </aside>
  );
};

export default FloatingWhatsApp;
