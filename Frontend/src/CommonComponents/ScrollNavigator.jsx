// src/components/ScrollNavigator.jsx
import React, { useEffect, useState, useCallback } from "react";
import { FiArrowUp } from "react-icons/fi";

const ScrollNavigator = () => {
  const [showButtons, setShowButtons] = useState(false);

  const checkScroll = useCallback(() => {
    const windowScroll =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    let maxElementScroll = 0;
    const scrollableElements = document.querySelectorAll(
      'main, main .overflow-y-auto, main [class*="overflow-y-auto"], .admin-root main, .employee-root main'
    );
    scrollableElements.forEach((el) => {
      if (
        el &&
        el.scrollTop > maxElementScroll &&
        !el.closest('aside') &&
        !el.closest('nav') &&
        !el.hasAttribute('data-sidebar') &&
        !el.closest('[data-sidebar]')
      ) {
        maxElementScroll = el.scrollTop;
      }
    });

    const isScrolled = Math.max(windowScroll, maxElementScroll) > 100;
    setShowButtons(isScrolled);
  }, []);

  useEffect(() => {
    // Listen to scroll events on window, document, and capture all container scrolls
    window.addEventListener("scroll", checkScroll, { capture: true, passive: true });
    document.addEventListener("scroll", checkScroll, { capture: true, passive: true });

    // Initial check
    checkScroll();

    // Check periodically on active user interaction
    const interval = setInterval(checkScroll, 400);

    return () => {
      window.removeEventListener("scroll", checkScroll, { capture: true });
      document.removeEventListener("scroll", checkScroll, { capture: true });
      clearInterval(interval);
    };
  }, [checkScroll]);

  const scrollToTop = () => {
    // Scroll window / html / body
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
    document.body.scrollTo({ top: 0, behavior: "smooth" });

    // Scroll all scrollable container elements (e.g. main in Admin & Employee panels)
    const scrollableElements = document.querySelectorAll(
      'main, main .overflow-y-auto, main [class*="overflow-y-auto"], .admin-root main, .employee-root main'
    );
    scrollableElements.forEach((el) => {
      if (
        el &&
        el.scrollTop > 0 &&
        !el.closest('aside') &&
        !el.closest('nav') &&
        !el.hasAttribute('data-sidebar') &&
        !el.closest('[data-sidebar]')
      ) {
        el.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  return (
    showButtons && (
      <div className="fixed right-5.5 bottom-20 z-[999] flex flex-col gap-3 sm:right-6.5 sm:bottom-24 pointer-events-auto print:hidden">
        <button
          onClick={scrollToTop}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-[#FF6A00] text-white shadow-[0_8px_22px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#e85d00] hover:shadow-[0_10px_26px_rgba(255,106,0,0.45)] focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/50"
          aria-label="Scroll to top"
          title="Scroll to top"
        >
          <FiArrowUp size={24} strokeWidth={3} />
        </button>
      </div>
    )
  );
};

export default ScrollNavigator;