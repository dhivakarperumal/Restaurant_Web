import React, { useState, useEffect, useCallback, useContext } from "react";
import { useLocation } from "react-router-dom";
import { Phone } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { FiArrowUp } from "react-icons/fi";
import ChatBot from "./ChatBot";
import { StoreContext } from "../PrivateRouter/StoreContext";
import "./FloatingSupport.css";

const FloatingSupport = () => {
  const { isCartOpen } = useContext(StoreContext) || {};
  const [chatOpen, setChatOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { pathname, hash } = useLocation();
  const currentRoute = hash?.startsWith("#") ? hash.slice(1) : pathname;

  const isAdmin = currentRoute === "/admin" || currentRoute.startsWith("/admin/");
  const isEmployee =
    currentRoute === "/employee" ||
    currentRoute.startsWith("/employee/") ||
    currentRoute === "/trainee" ||
    currentRoute.startsWith("/trainee/");

  // User UI pages: any page outside /admin and /employee panels (even if an admin/employee is logged in browsing the site)
  const isUserUIPage = !isAdmin && !isEmployee;

  // 1. WhatsApp, Call, and ScrollNavigator are visible on all User UI pages (including Home, About, Services, Contact, Login, etc.)
  const showUserUIWidgets = isUserUIPage;

  // 2. AI ChatBot is available on customer and admin pages, but not employee panels
  const showChatBot = isUserUIPage || isAdmin;

  // Scroll detection for Scroll-to-Top button
  const checkScroll = useCallback(() => {
    const windowScroll =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;
    setShowScrollTop(windowScroll > 80);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", checkScroll, { capture: true, passive: true });
    document.addEventListener("scroll", checkScroll, { capture: true, passive: true });
    checkScroll();

    return () => {
      window.removeEventListener("scroll", checkScroll, { capture: true });
      document.removeEventListener("scroll", checkScroll, { capture: true });
    };
  }, [checkScroll]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo({ top: 0, behavior: "smooth" });
  };

  // If cart sidebar is open, hide floating support so it never interferes
  if (isCartOpen) {
    return null;
  }

  // If neither should show on this route, render nothing
  if (!showUserUIWidgets && !showChatBot) {
    return null;
  }

  const whatsappNumber = "919597293504"; // Company WhatsApp number (+91 95972 93504)
  const phoneNumber = "+919597293504";   // Company Call line (+91 95972 93504)

  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hello Q-Techx Solutions, I need some help!")}`,
      "_blank"
    );
  };

  const handleCall = () => {
    window.location.href = `tel:${phoneNumber}`;
  };

  return (
    <>
      {/* Chatbot panel */}
      {showChatBot && <ChatBot isOpen={chatOpen} onClose={() => setChatOpen(false)} />}

      {/* Floating button container – fixed to bottom right */}
      <div className="floating-support-container">
        {/* WhatsApp button - visible on all user UI pages */}
        {showUserUIWidgets && (
          <div
            className="support-item whatsapp"
            onClick={handleWhatsApp}
            title="WhatsApp (+91 95972 93504)"
          >
            <FaWhatsapp size={26} />
            <span className="tooltip">🟢 WhatsApp (+91 95972 93504)</span>
          </div>
        )}

        {/* Call button - visible on all user UI pages */}
        {showUserUIWidgets && (
          <div
            className="support-item call"
            onClick={handleCall}
            title="Call Us (+91 95972 93504)"
          >
            <Phone size={22} />
            <span className="tooltip">📞 Call (+91 95972 93504)</span>
          </div>
        )}

        {/* ScrollNavigator (Scroll-To-Top) button - placed below the Call button */}
        {showUserUIWidgets && showScrollTop && (
          <div
            className="support-item scroll-top"
            onClick={scrollToTop}
            title="Scroll to Top"
            aria-label="Scroll to top"
          >
            <FiArrowUp size={24} strokeWidth={3} />
            <span className="tooltip">⬆ Scroll to Top</span>
          </div>
        )}

        {/* Chat toggle button - visible on customer and admin pages */}
        {showChatBot && (
          <div
            className={`support-item chatbot ${chatOpen ? "chatbot-active" : ""}`}
            onClick={() => setChatOpen((prev) => !prev)}
            title="AI Chat Assistant"
          >
            {chatOpen ? (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <line x1="9" y1="10" x2="15" y2="10" />
                <line x1="9" y1="14" x2="13" y2="14" />
              </svg>
            )}
            <span className="tooltip">{chatOpen ? "Close Chat" : "AI Assistant"}</span>
            {!chatOpen && <span className="chat-ping" />}
          </div>
        )}
      </div>
    </>
  );
};

export default FloatingSupport;
