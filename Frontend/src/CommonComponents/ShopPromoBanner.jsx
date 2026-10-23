import { ArrowRight, Bike, ChefHat, Leaf, ShieldCheck, Sparkles, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';

const deliveryFeatures = [
  { Icon: Leaf,        label: 'Fresh\nIngredients'    },
  { Icon: ChefHat,    label: 'Variety\nof Dishes'     },
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

  const Icon = banner.icon;
  const isChef  = variant === 'chef';
  const isShare = variant === 'share';

  /* ── Delivery banner (share variant) ──────────────── */
  if (isShare) {
    return (
      <article
        aria-label={banner.eyebrow}
        className="group relative col-span-full isolate flex min-h-[200px] items-center overflow-hidden rounded-[28px] border border-[#e8d8b0]/60 bg-[#fdf8ee] px-6 py-8 shadow-sm transition duration-300 hover:shadow-lg sm:px-10"
      >
        {/* Decorative blobs */}
        <span aria-hidden="true" className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#e8a020]/10" />
        <span aria-hidden="true" className="absolute right-32 top-1/2 hidden h-40 w-40 -translate-y-1/2 rounded-full border border-[#e8a020]/20 sm:block" />

        {/* Left leaf decoration */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 hidden h-full w-24 select-none opacity-25 lg:block"
          style={{
            backgroundImage: 'url(/images/header.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'left center',
            maskImage: 'linear-gradient(to right, black 10%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, black 10%, transparent 100%)',
            filter: 'saturate(0.4) brightness(1.3)',
          }}
        />

        {/* Text content */}
        <div className="relative z-10 max-w-2xl">
          {/* Eyebrow */}
          <div className="mb-3 flex items-center gap-2.5">
            <span className="h-px w-6 bg-[#e8a020]" />
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#e8a020]">
              {banner.eyebrow}
            </p>
          </div>

          {/* Title — last 2 words in gold */}
          <h3 className="max-w-md font-serif text-2xl font-bold leading-tight text-[#1a2e1e] sm:text-3xl">
            {(() => {
              const words = banner.title.split(' ');
              const accent = words.slice(-2).join(' ');
              const rest   = words.slice(0, -2).join(' ');
              return (
                <>
                  {rest}{' '}
                  <span className="text-[#e8a020]">{accent}</span>
                </>
              );
            })()}
          </h3>

          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#4a5e52]">
            {banner.description}
          </p>

          {/* CTA + bike path */}
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-full bg-[#e8a020] px-5 py-2.5 text-sm font-bold text-white shadow transition hover:-translate-y-0.5 hover:bg-[#d4911a] group-hover:shadow-md"
            >
              {banner.action}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            {/* Dotted delivery path */}
            <div className="hidden items-center gap-1.5 text-[#e8a020] sm:flex">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8a020]/10">
                <span className="h-2 w-2 rounded-full bg-[#e8a020]" />
              </span>
              <span className="flex gap-0.5">
                {[...Array(7)].map((_, i) => (
                  <span key={i} className="h-px w-3 rounded-full bg-[#e8a020]/40" />
                ))}
              </span>
              <Bike className="h-5 w-5" />
            </div>
          </div>

          {/* Feature icons */}
          <div className="mt-6 flex flex-wrap gap-5">
            {deliveryFeatures.map(({ Icon: FeatIcon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e8a020]/30 bg-white text-[#e8a020] shadow-sm">
                  <FeatIcon className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <span className="whitespace-pre-line text-[10px] font-bold leading-tight text-[#1a2e1e]">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right photo */}
        <div className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-[260px] overflow-hidden xl:block">
          <img
            src="/images/header.png"
            alt="Fresh food delivery"
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#fdf8ee] via-[#fdf8ee]/30 to-transparent" />
          {/* Good Food badge */}
          <div className="absolute right-4 top-4 rotate-6 rounded-xl border border-[#e8a020]/30 bg-white/90 px-3 py-2 text-center shadow backdrop-blur-sm">
            <p className="text-[11px] font-bold italic text-[#1a2e1e]">Good Food</p>
            <p className="text-[10px] italic text-[#e8a020]">Good Mood ♥</p>
          </div>
          {/* Fresh badge */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 shadow backdrop-blur-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e8a020]/15 text-[#e8a020]">
              <ChefHat className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-black text-[#1a2e1e]">Fresh · Tasty</p>
              <p className="text-[10px] font-bold text-[#e8a020]">Happiness</p>
            </div>
          </div>
        </div>
      </article>
    );
  }

  /* ── Default (fresh / chef) banners ──────────────── */
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
