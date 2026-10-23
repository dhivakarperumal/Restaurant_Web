import { ArrowRight, Bike, ChefHat, Leaf, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';

const deliveryFeatures = [
  { Icon: Leaf,        label: 'Fresh\nIngredients'    },
  { Icon: ChefHat,     label: 'Variety\nof Dishes'    },
  { Icon: Bike,        label: 'Fast & Safe\nDelivery' },
  { Icon: ShieldCheck, label: 'Hygienic\nPackaging'   },
];

const bannerContent = {
  fresh: {
    eyebrow: 'Fresh from our kitchen',
    title: 'Good food, made with care.',
    description: 'Thoughtful ingredients and fresh preparation in every order.',
    action: 'Explore the menu',
    icon: Leaf,
  },
  chef: {
    eyebrow: 'Our Kitchen',
    title: 'Where Great Taste',
    description: 'Our skilled chefs craft every dish with fresh ingredients, authentic recipes and a passion for great food.',
    action: 'Explore Our Menu',
    icon: ChefHat,
  },
  share: {
    eyebrow: 'Delicious Food',
    title: 'Authentic Flavours Delivered to Your Doorstep',
    description:
      'Enjoy a wide variety of tasty and hygienic meals prepared with fresh ingredients, delivered fresh to your home.',
    action: 'Order Now',
    icon: Bike,
  },
};

function ShopPromoBanner({ variant }) {
  const banner = bannerContent[variant];
  if (!banner) return null;

  const Icon   = banner.icon;
  const isChef  = variant === 'chef';
  const isShare = variant === 'share';

  /* ── Delivery banner (share variant) ─────────────── */
  if (isShare) {
    return (
      <article
        aria-label="Delivery Banner"
        className="col-span-full isolate overflow-hidden rounded-2xl border border-[#ede8d8] bg-white shadow-sm"
      >
        <div className="relative flex min-h-[200px] items-stretch">

          {/* ── Far-left leaf strip ─────────────────── */}
          <div
            aria-hidden="true"
            className="pointer-events-none relative hidden w-[60px] shrink-0 select-none overflow-hidden lg:block"
            style={{
              background: 'linear-gradient(to right, #f5f0e0 60%, transparent 100%)',
            }}
          >
            {/* Leaf SVG illustration */}
            <svg viewBox="0 0 60 200" className="absolute inset-0 h-full w-full opacity-40" preserveAspectRatio="xMidYMid slice">
              <ellipse cx="30" cy="90" rx="22" ry="55" fill="#c8d88a" transform="rotate(-20 30 90)" />
              <ellipse cx="25" cy="140" rx="16" ry="40" fill="#b5cb72" transform="rotate(15 25 140)" />
              <line x1="30" y1="35" x2="30" y2="145" stroke="#8aaa3a" strokeWidth="1.5" />
            </svg>
          </div>

          {/* ── LEFT TEXT (35%) ──────────────────────── */}
          <div className="relative z-10 flex flex-col justify-center px-6 py-8 sm:px-8 lg:w-[36%] lg:shrink-0">
            {/* Eyebrow */}
            <div className="mb-3 flex items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c8920a]">
                {banner.eyebrow}
              </p>
              <span className="h-px w-8 bg-[#c8920a]/50" />
            </div>

            {/* Headline — "Your Doorstep" in gold */}
            <h3 className="text-[1.45rem] font-black leading-tight text-[#1a1a1a] sm:text-[1.65rem]">
              Authentic Flavours
              <br />
              Delivered to{' '}
              <span className="text-[#c8920a]">Your Doorstep</span>
            </h3>

            {/* Description */}
            <p className="mt-3 max-w-[280px] text-[13px] leading-5 text-[#555]">
              Enjoy a wide variety of tasty and hygienic meals prepared with fresh
              ingredients, delivered fresh to your{' '}
              <span className="font-semibold text-[#1a1a1a]">home</span>.
            </p>

            {/* CTA button */}
            <div className="mt-5">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-full bg-[#c8920a] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#b07d08]"
              >
                {banner.action}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Delivery path: pin → dotted line → bike */}
            <div className="mt-5 flex items-center gap-1 text-[#c8920a]">
              {/* Pin */}
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#c8920a]">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
              </svg>
              {/* Dotted curved path */}
              <svg viewBox="0 0 80 20" className="h-4 w-16 sm:w-20" fill="none">
                <path
                  d="M2 14 Q20 4 40 10 Q60 16 78 6"
                  stroke="#c8920a"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                />
              </svg>
              {/* Bike */}
              <Bike className="h-6 w-6" />
            </div>
          </div>

          {/* ── MIDDLE FEATURES (25%) ────────────────── */}
          <div className="relative z-10 hidden flex-col justify-center gap-5 border-l border-r border-[#ede8d8] px-6 py-8 lg:flex lg:w-[25%] lg:shrink-0">
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
              {deliveryFeatures.map(({ Icon: FeatIcon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e8d8a0] bg-[#fdf5e0] text-[#c8920a]">
                    <FeatIcon className="h-5 w-5" strokeWidth={1.6} />
                  </span>
                  <span className="whitespace-pre-line text-[11px] font-semibold leading-tight text-[#333]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT PHOTO (remaining width) ────────── */}
          <div className="relative flex-1 overflow-hidden">
            {/* Photo */}
            <img
              src="/images/delivery.png"
              alt="Fresh food delivery"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            {/* Left soft fade into white */}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/10 to-transparent" />

            {/* "Good Food Good Mood" — top right outside photo feel */}
            <div className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-right">
              <p
                className="font-serif text-sm font-bold italic leading-snug text-[#2d2d2d]"
                style={{ fontFamily: "'Dancing Script', cursive, serif" }}
              >
                Good Food
              </p>
              <p
                className="font-serif text-sm font-bold italic leading-snug text-[#2d2d2d]"
                style={{ fontFamily: "'Dancing Script', cursive, serif" }}
              >
                Good Mood{' '}
                <span className="text-[#c8920a]">♥</span>
              </p>
            </div>

            {/* "Fresh Tasty Happiness" circular badge */}
            <div className="absolute bottom-4 right-16 z-10 flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 border-[#c8920a]/40 bg-white/90 text-center shadow backdrop-blur-sm">
              <ChefHat className="h-4 w-4 text-[#c8920a]" />
              <p className="mt-0.5 text-[8px] font-black leading-tight text-[#333]">
                Fresh<br />Tasty<br />
                <span className="text-[#c8920a]">Happiness</span>
              </p>
            </div>
          </div>
        </div>

        {/* Mobile: show features in a row below */}
        <div className="flex justify-around border-t border-[#ede8d8] px-4 py-4 lg:hidden">
          {deliveryFeatures.map(({ Icon: FeatIcon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 text-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e8d8a0] bg-[#fdf5e0] text-[#c8920a]">
                <FeatIcon className="h-4 w-4" strokeWidth={1.6} />
              </span>
              <span className="whitespace-pre-line text-[9px] font-semibold leading-tight text-[#333]">
                {label}
              </span>
            </div>
          ))}
        </div>
      </article>
    );
  }

  if (isChef) {
    const featureItems = [
      { Icon: Leaf, label: 'Fresh\nIngredients' },
      { Icon: ChefHat, label: 'Skilled\nChefs' },
      { Icon: UtensilsCrossed, label: 'Authentic\nFlavours' },
      { Icon: ShieldCheck, label: 'Quality\nYou Can Trust' },
    ];

    return (
      <article
        aria-label={banner.eyebrow}
        className="group relative col-span-full isolate overflow-hidden rounded-[18px] border border-[#c9a866] shadow-[0_18px_45px_rgba(31,18,11,0.18)]"
      >
        <img
          src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1600&q=80"
          alt="Chef cooking in a restaurant kitchen"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-90"
        />

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(34,23,17,0.62)_0%,rgba(34,23,17,0.38)_36%,rgba(34,23,17,0.78)_100%)]" />
        <div className="absolute inset-y-0 left-0 w-[40%] bg-gradient-to-r from-[#f6d98a]/10 to-transparent" />

        <svg
          aria-hidden="true"
          viewBox="0 0 120 260"
          className="pointer-events-none absolute -left-6 top-0 h-full w-[110px] opacity-60"
          preserveAspectRatio="xMidYMid meet"
        >
          <path d="M78 16c-16 24-18 52-2 72 7 8 13 15 18 26 11 24 8 48-6 64-15 18-38 28-57 36 15-12 29-26 36-42 8-18 8-37 5-58-4-26-7-35-1-53 5-16 8-27 7-45Z" fill="none" stroke="#e9d18f" strokeWidth="2" strokeLinecap="round" />
          <path d="M53 58c8 17 12 36 5 52" fill="none" stroke="#e9d18f" strokeWidth="2" strokeLinecap="round" />
          <path d="M75 118c-14 9-18 23-22 40" fill="none" stroke="#e9d18f" strokeWidth="2" strokeLinecap="round" />
        </svg>

        <svg
          aria-hidden="true"
          viewBox="0 0 120 260"
          className="pointer-events-none absolute -right-6 top-0 h-full w-[110px] rotate-180 opacity-60"
          preserveAspectRatio="xMidYMid meet"
        >
          <path d="M78 16c-16 24-18 52-2 72 7 8 13 15 18 26 11 24 8 48-6 64-15 18-38 28-57 36 15-12 29-26 36-42 8-18 8-37 5-58-4-26-7-35-1-53 5-16 8-27 7-45Z" fill="none" stroke="#e9d18f" strokeWidth="2" strokeLinecap="round" />
          <path d="M53 58c8 17 12 36 5 52" fill="none" stroke="#e9d18f" strokeWidth="2" strokeLinecap="round" />
          <path d="M75 118c-14 9-18 23-22 40" fill="none" stroke="#e9d18f" strokeWidth="2" strokeLinecap="round" />
        </svg>

        <div className="relative z-10 flex flex-col gap-6 px-4 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10 lg:py-8">
          <div className="flex w-full flex-wrap items-center justify-center gap-3 sm:gap-5 lg:w-[45%] lg:justify-start">
            {featureItems.map(({ Icon: FeatureIcon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 text-center text-[#f6dfb2]">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[#f3d486] bg-[#f9f4e6] text-[#3f250f] shadow-[0_0_0_8px_rgba(244,211,138,0.14)] sm:h-20 sm:w-20">
                  <FeatureIcon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.8} />
                </span>
                <span className="whitespace-pre-line text-[10px] font-extrabold uppercase leading-[1.1] tracking-[0.03em] text-[#f6dfb2] sm:text-[11px]">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex w-full max-w-[560px] flex-col items-center text-center text-[#fdf3d8] lg:items-end lg:text-right">
            <div className="mb-3 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.32em] text-[#f3cc7a] lg:justify-end">
              <span className="h-px w-14 bg-[#f1c96c]/80" />
              {banner.eyebrow}
              <span className="h-px w-14 bg-[#f1c96c]/80" />
            </div>

            <h3 className="max-w-[500px] font-serif text-[2.1rem] font-black leading-[0.95] text-[#f8f0dc] sm:text-[3rem] lg:text-[4.1rem]">
              {banner.title}
              <span className="mt-1 block text-[#f4d28d]">Comes to Life</span>
            </h3>

            <p className="mt-4 max-w-[490px] text-sm leading-6 text-[#f6e8d3] sm:text-base">
              {banner.description}
            </p>

            <Link
              to="/shop"
              className="mt-7 inline-flex items-center gap-3 rounded-xl border border-[#e5bb61] bg-[#f7cf73] px-7 py-3 text-base font-extrabold text-[#1d120d] shadow-[0_10px_20px_rgba(247,207,115,0.25)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#f9d77e]"
            >
              {banner.action}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  /* ── Default (fresh) banner ─────────────── */
  return (
    <article
      aria-label={banner.eyebrow}
      className="group relative col-span-full isolate flex min-h-[190px] items-center overflow-hidden rounded-[28px] border border-[#e7e4d8] bg-[#f3f5e9] px-6 py-7 text-[#203129] shadow-sm transition duration-300 hover:shadow-lg sm:min-h-[210px] sm:px-10"
    >
      <span aria-hidden="true" className="absolute -right-12 -top-24 h-64 w-64 rounded-full bg-[#dce5c5] sm:right-12 sm:h-80 sm:w-80" />
      <span aria-hidden="true" className="absolute right-16 top-1/2 hidden h-40 w-40 -translate-y-1/2 rounded-full border-2 border-[#cad7ad] sm:block" />

      <div className="relative z-10 max-w-2xl">
        <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#5f7839] sm:text-xs">
          <Icon className="h-4 w-4" />
          {banner.eyebrow}
        </div>
        <h3 className="max-w-xl font-serif text-2xl font-bold leading-tight text-[#203129] sm:text-3xl lg:text-4xl">
          {banner.title}
        </h3>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#6d655d] sm:text-base">
          {banner.description}
        </p>
        <Link
          to="/shop"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#506a35] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#3d5428] sm:text-sm"
        >
          {banner.action}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div
        aria-hidden="true"
        className="absolute right-7 top-1/2 hidden h-28 w-28 -translate-y-1/2 items-center justify-center rounded-full border border-[#d8e1c4] bg-white/75 text-[#5f7839] sm:flex lg:right-16 lg:h-36 lg:w-36"
      >
        <Icon className="h-12 w-12 lg:h-16 lg:w-16" strokeWidth={1.4} />
      </div>
    </article>
  );
}

export default ShopPromoBanner;
