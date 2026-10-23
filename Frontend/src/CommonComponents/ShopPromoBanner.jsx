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
        className="col-span-full isolate overflow-hidden rounded-[18px] border border-[#e9d8b1] shadow-[0_0_0_1px_rgba(220,189,118,0.2)]"
        style={{
          backgroundImage: "linear-gradient(90deg, rgba(245,240,230,0.96) 0%, rgba(245,240,230,0.94) 36%, rgba(243,234,216,0.76) 52%, rgba(243,234,216,0.35) 100%), url('/images/delivery.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="relative flex min-h-[200px] items-stretch">
          <div className="absolute inset-y-0 left-0 w-[18%] bg-[radial-gradient(circle_at_left,_rgba(196,214,138,0.2),transparent_60%)]" />

          <div className="relative z-10 flex w-full flex-col justify-center px-5 py-6 sm:px-7 lg:w-[44%] lg:shrink-0 lg:px-10 lg:py-8">
            <div className="mb-3 flex items-center gap-3 text-[#d39d2d]">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] sm:text-[11px]">
                {banner.eyebrow}
              </p>
              <span className="h-px w-12 bg-[#d39d2d]/80" />
            </div>

            <h3 className="max-w-[470px] font-serif text-[2.1rem] font-black leading-[0.95] tracking-[-0.04em] text-[#1a1a1a] sm:text-[2.5rem] lg:text-[3.3rem]">
              Authentic Flavours
              <br />
              Delivered to{' '}
              <span className="text-[#c99518]">Your Doorstep</span>
            </h3>

            <p className="mt-4 max-w-[380px] text-[14px] leading-[1.65] text-[#4d4039] sm:text-[15px]">
              Enjoy a wide variety of tasty and hygienic meals prepared with fresh ingredients,
              delivered fresh to your home.
            </p>

            <div className="mt-6 flex items-center">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-xl bg-[#e2b14e] px-5 py-3 text-sm font-extrabold text-[#1d130d] shadow-[0_8px_18px_rgba(226,177,78,0.22)] transition hover:bg-[#d29c2f]"
              >
                {banner.action}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-7 flex items-center gap-2 text-[#d39d2d]">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#d39d2d]">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
              </svg>
              <svg viewBox="0 0 120 30" className="h-5 w-28 sm:w-32" fill="none">
                <path d="M2 18 Q20 4 40 10 T80 12 T118 8" stroke="#d39d2d" strokeWidth="1.8" strokeDasharray="4 5" strokeLinecap="round" />
              </svg>
              <Bike className="h-7 w-7" />
            </div>
          </div>

          <div className="relative z-10 hidden w-[28%] flex-col justify-center gap-5 px-3 py-6 lg:flex">
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
              {deliveryFeatures.map(({ Icon: FeatIcon, label }) => (
                <div key={label} className="flex flex-col items-center gap-2 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[#e8d6a0] bg-[#f8f0dc] text-[#c9941f] shadow-[0_0_0_4px_rgba(236,204,126,0.15)]">
                    <FeatIcon className="h-6 w-6" strokeWidth={1.8} />
                  </span>
                  <span className="whitespace-pre-line text-[11px] font-semibold leading-tight text-[#3d3128]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative ml-auto flex w-[30%] min-w-[220px] flex-1 overflow-hidden">
            <img
              src="/images/delivery.png"
              alt="Fresh food delivery"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#f5f0e7]/10 via-transparent to-transparent" />

            <div
              className="absolute right-5 top-7 z-10 text-right font-serif italic text-[#2b251e]"
              style={{ fontFamily: "'Dancing Script', cursive, serif" }}
            >
              <p className="text-[16px] sm:text-[20px]">Good Food</p>
              <p className="text-[16px] sm:text-[20px]">Good Mood</p>
            </div>

            <div className="absolute bottom-4 right-4 z-10 flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 border-[#d5ad52] bg-[#f9f1db]/90 text-center shadow-md">
              <ChefHat className="h-4 w-4 text-[#b17816]" />
              <p className="mt-0.5 text-[7px] font-black uppercase leading-[1.1] text-[#312821]">
                Fresh
                <br />
                Tasty
                <br />
                <span className="text-[#b17816]">Happiness</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-around border-t border-[#e8dac3] px-4 py-4 lg:hidden">
          {deliveryFeatures.map(({ Icon: FeatIcon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e6c678] bg-[#f7f0df] text-[#d08a17]">
                <FeatIcon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span className="whitespace-pre-line text-[9px] font-semibold leading-tight text-[#3d3128]">
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
