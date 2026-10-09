import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import PageContainer from './PageContainer';

/**
 * OfferBanner Component
 * Renders the promotional offer banner using /images/offerbanner.png
 * Matches the reference mockup with:
 * - Special Offer cursive script
 * - "Get 20% OFF" highlighted text
 * - "On Your First Order" subtitle
 * - "Use Code FIRST20" interactive copyable coupon badge
 * - "Order Now ->" CTA button linking to menu
 * - Background grilled platter and "Tasty Healthy Fresh" handwritten artwork
 */
export default function OfferBanner({
  code = 'FIRST20',
  discount = '20% OFF',
  headlinePrefix = 'Get ',
  badgeTitle = 'Special Offer',
  offerSubtitle = 'On Your First Order',
  buttonText = 'Order Now',
  buttonLink = '/shop',
  className = '',
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopied(true);
      toast.success(`Coupon code ${code} copied to clipboard!`, {
        icon: '🎉',
        style: {
          borderRadius: '12px',
          background: '#042013',
          color: '#ffffff',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          fontWeight: 600,
        },
      });
      setTimeout(() => setCopied(false), 2400);
    } catch (err) {
      console.error('Failed to copy code:', err);
      toast.error('Could not copy code. Please use: ' + code);
    }
  };

  return (
    <section className={`py-6 sm:py-10 ${className}`} aria-label="Special Offer Banner">
      <PageContainer>
        <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl lg:rounded-[30px] border border-emerald-950/40 shadow-xl sm:shadow-2xl bg-[#031d12] min-h-[220px] sm:min-h-[240px] md:min-h-[260px] lg:h-[270px] xl:h-[290px] flex items-center">
          {/* Background banner image */}
          <img
            src="/images/offerbanner.png"
            alt="Special Offer Background"
            className="absolute inset-0 h-full w-full object-cover object-[72%_center] sm:object-[70%_center] md:object-center pointer-events-none select-none z-0"
            loading="lazy"
          />

          {/* Mobile contrast overlay so text is 100% legible on small screens */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#031d12]/95 via-[#031d12]/80 to-[#031d12]/20 md:from-transparent md:via-transparent md:to-transparent pointer-events-none z-0" />

          {/* Floating 'Tasty Healthy Fresh' stamp on mobile devices */}
          <div className="md:hidden absolute top-3 right-3 sm:top-4 sm:right-6 z-10 -rotate-6 select-none opacity-90 scale-90 sm:scale-100">
            <div className="relative text-center">
              <div className="absolute -top-2.5 -right-3 text-[#facc15] pointer-events-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 19L2 15" />
                  <path d="M9 13L8 5" />
                  <path d="M15 11L21 8" />
                </svg>
              </div>
              <div className="font-dancing text-lg sm:text-xl font-bold text-white leading-tight drop-shadow-md">
                Tasty<br />Healthy<br />Fresh
              </div>
            </div>
          </div>

          {/* Main content grid */}
          <div className="relative z-10 w-full px-5 sm:px-8 md:px-10 lg:px-14 py-6 md:py-0">
            <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6 md:gap-4">
              
              {/* Left Column: Heading and offer text */}
              <div className="md:col-span-5 lg:col-span-4 flex flex-col justify-center items-start text-left">
                <span className="font-dancing text-2xl sm:text-3xl lg:text-[34px] xl:text-[36px] text-[#f5a623] font-semibold leading-tight drop-shadow-sm select-none">
                  {badgeTitle}
                </span>

                <h3 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[54px] font-extrabold tracking-tight text-white my-1 sm:my-1.5 leading-none drop-shadow-md select-none whitespace-nowrap">
                  {headlinePrefix}
                  <span className="text-[#f97316] font-black">{discount}</span>
                </h3>

                <p className="text-sm sm:text-base lg:text-lg font-medium text-white/95 tracking-wide drop-shadow-sm select-none">
                  {offerSubtitle}
                </p>
              </div>

              {/* Middle Column: Use Code Badge & Order Now Button */}
              <div className="md:col-span-3 lg:col-span-3 flex flex-wrap sm:flex-nowrap md:flex-col items-start md:items-center justify-start md:justify-center gap-2.5 sm:gap-3.5">
                {/* Coupon Code Pill */}
                <div
                  onClick={handleCopyCode}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleCopyCode(e);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  title="Click to copy coupon code"
                  className="group inline-flex items-center gap-2 sm:gap-2.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-black/45 hover:bg-black/65 border border-emerald-500/40 hover:border-emerald-400 backdrop-blur-xs transition-all duration-200 cursor-pointer shadow-inner select-none active:scale-95"
                >
                  <span className="text-xs sm:text-sm font-medium text-slate-200 tracking-wide">
                    Use Code
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-0.5 rounded-md bg-black/60 border border-emerald-400/50 text-white font-extrabold text-xs sm:text-sm tracking-wider font-mono group-hover:border-emerald-300 transition-colors">
                    {code}
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400 transition-transform scale-110" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-emerald-300/80 group-hover:text-emerald-200 transition-transform group-hover:scale-110" />
                    )}
                  </span>
                </div>

                {/* Order Now CTA */}
                <Link
                  to={buttonLink}
                  className="group inline-flex items-center justify-center gap-2 px-6 py-2 sm:px-7 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white font-bold text-sm sm:text-base shadow-lg shadow-orange-950/40 hover:from-[#d84e06] hover:to-[#ea580c] hover:shadow-orange-900/60 hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <span>{buttonText}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Spacer Column: Keeps the background grilled food plate unobstructed */}
              <div className="hidden md:block md:col-span-2 lg:col-span-3 pointer-events-none" aria-hidden="true" />

              {/* Far Right Column: 'Tasty Healthy Fresh' callout with yellow rays */}
              <div className="hidden md:flex md:col-span-2 lg:col-span-2 justify-end items-center">
                <div className="relative flex flex-col items-center justify-center text-center -rotate-6 select-none shrink-0 pr-1 lg:pr-3">
                  {/* Yellow radiating ray bursts top-right */}
                  <div className="absolute -top-3.5 -right-3.5 lg:-right-4 text-[#facc15] pointer-events-none">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M5 19L2 15" />
                      <path d="M9 13L8 5" />
                      <path d="M15 11L21 8" />
                    </svg>
                  </div>

                  {/* Playful cursive text */}
                  <div className="font-dancing text-2xl sm:text-2xl lg:text-[30px] xl:text-[34px] font-bold text-white leading-[1.08] drop-shadow-md">
                    <span>Tasty</span>
                    <br />
                    <span>Healthy</span>
                    <br />
                    <span>Fresh</span>
                  </div>

                  {/* Yellow accent curve below Fresh */}
                  <div className="text-[#facc15] mt-1 pointer-events-none">
                    <svg
                      width="46"
                      height="10"
                      viewBox="0 0 46 10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M2 6 Q 23 1 44 5" />
                    </svg>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
