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
    eyebrow: 'A little something special',
    title: 'Find your new favorite.',
    description: 'Discover comforting classics and exciting new flavors.',
    action: 'Meet the menu',
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

  /* ── Default (fresh / chef) banners ─────────────── */
  return (
    <article
      aria-label={banner.eyebrow}
      className={`group relative col-span-full isolate flex min-h-[190px] items-center overflow-hidden rounded-[28px] px-6 py-7 shadow-sm transition duration-300 hover:shadow-lg sm:min-h-[210px] sm:px-10 ${
        isChef
          ? 'bg-[#173b31] text-white'
          : 'border border-[#e7e4d8] bg-[#f3f5e9] text-[#203129]'
      }`}
    >
      {isChef ? (
        <>
          <span aria-hidden="true" className="absolute -right-8 -top-16 h-56 w-56 rounded-full border border-white/10 sm:right-10 sm:h-72 sm:w-72" />
          <span aria-hidden="true" className="absolute -right-1 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-[#e99a45]/15 blur-2xl sm:right-24 sm:h-52 sm:w-52" />
        </>
      ) : (
        <>
          <span aria-hidden="true" className="absolute -right-12 -top-24 h-64 w-64 rounded-full bg-[#dce5c5] sm:right-12 sm:h-80 sm:w-80" />
          <span aria-hidden="true" className="absolute right-16 top-1/2 hidden h-40 w-40 -translate-y-1/2 rounded-full border-2 border-[#cad7ad] sm:block" />
        </>
      )}

      <div className="relative z-10 max-w-2xl">
        <div className={`mb-3 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] sm:text-xs ${
          isChef ? 'text-[#f3bb77]' : 'text-[#5f7839]'
        }`}>
          <Icon className="h-4 w-4" />
          {banner.eyebrow}
        </div>
        <h3 className={`max-w-xl font-serif text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl ${
          isChef ? 'text-white' : 'text-[#203129]'
        }`}>
          {banner.title}
        </h3>
        <p className={`mt-2 max-w-lg text-sm leading-relaxed sm:text-base ${
          isChef ? 'text-white/75' : 'text-[#6d655d]'
        }`}>
          {banner.description}
        </p>
        <Link
          to="/shop"
          className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
            isChef
              ? 'bg-[#f0a24b] text-[#1c3028] hover:bg-[#ffc06c]'
              : 'bg-[#506a35] text-white hover:bg-[#3d5428]'
          }`}
        >
          {banner.action}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div
        aria-hidden="true"
        className={`absolute right-7 top-1/2 hidden h-28 w-28 -translate-y-1/2 items-center justify-center rounded-full sm:flex lg:right-16 lg:h-36 lg:w-36 ${
          isChef
            ? 'border border-white/15 bg-white/5 text-[#f3bb77]'
            : 'border border-[#d8e1c4] bg-white/75 text-[#5f7839]'
        }`}
      >
        <Icon className="h-12 w-12 lg:h-16 lg:w-16" strokeWidth={1.4} />
        {isChef && <UtensilsCrossed className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full bg-[#f3bb77] p-2 text-[#173b31]" />}
      </div>
    </article>
  );
}

export default ShopPromoBanner;
