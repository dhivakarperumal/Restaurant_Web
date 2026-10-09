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

          <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-[#031d12]/95 via-[#031d12]/85 to-[#031d12]/25" />

          <div className="relative z-10 w-full px-5 py-7 text-left sm:px-8 sm:py-9 md:px-8 lg:px-12">
            <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-3 md:gap-5 lg:gap-8">
              <div className="flex min-w-0 flex-col items-start">
                <span className="font-dancing text-2xl font-semibold leading-tight text-[#f5a623] drop-shadow-sm select-none sm:text-3xl lg:text-[34px]">
                  {badgeTitle}
                </span>
                <h3 className="my-1 text-3xl font-extrabold leading-tight tracking-tight text-white drop-shadow-md select-none sm:my-1.5 sm:text-4xl lg:text-[40px] xl:text-[46px]">
                  {headlinePrefix}
                  <span className="font-black text-[#f97316]">{discount}</span>
                </h3>
              </div>

              <div className="flex min-w-0 flex-col items-start">
                <p className="text-sm font-medium tracking-wide text-white/95 drop-shadow-sm select-none sm:text-base lg:text-lg">
                  {offerSubtitle}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-start gap-2.5 sm:gap-3">
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
                  className="group inline-flex cursor-pointer select-none items-center gap-2 rounded-xl border border-emerald-500/40 bg-black/45 px-3 py-1.5 shadow-inner backdrop-blur-xs transition-all duration-200 hover:border-emerald-400 hover:bg-black/65 active:scale-95 sm:gap-2.5 sm:px-3.5 sm:py-2"
                >
                  <span className="text-xs font-medium tracking-wide text-slate-200 sm:text-sm">
                    Use Code
                  </span>
                  <span className="flex items-center gap-1.5 rounded-md border border-emerald-400/50 bg-black/60 px-2.5 py-0.5 font-mono text-xs font-extrabold tracking-wider text-white transition-colors group-hover:border-emerald-300 sm:px-3 sm:text-sm">
                    {code}
                    {copied ? (
                      <Check className="h-3.5 w-3.5 scale-110 text-emerald-400 transition-transform" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-emerald-300/80 transition-transform group-hover:scale-110 group-hover:text-emerald-200" />
                    )}
                  </span>
                </div>

                <Link
                  to={buttonLink}
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ea580c] to-[#f97316] px-5 py-2 font-bold text-white shadow-lg shadow-orange-950/40 transition-all duration-200 hover:scale-105 hover:from-[#d84e06] hover:to-[#ea580c] hover:shadow-orange-900/60 active:scale-95 sm:px-6 sm:py-2.5 sm:text-base"
                >
                  <span>{buttonText}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                </div>
              </div>

              <div className="relative hidden select-none items-center justify-center text-center md:flex">
                <span aria-hidden="true" className="absolute h-36 w-36 rounded-full border border-[#facc15]/25" />
                <span aria-hidden="true" className="absolute h-28 w-28 rounded-full border border-dashed border-white/20" />
                <div className="relative -rotate-6 font-dancing text-3xl font-bold leading-[1.05] text-white drop-shadow-md lg:text-4xl">
                  <span>Tasty</span>
                  <br />
                  <span className="text-[#facc15]">Healthy</span>
                  <br />
                  <span>Fresh</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
