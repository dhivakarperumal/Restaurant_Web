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
          backgroundImage: "url('/images/delivery.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="flex min-h-[260px] items-stretch">
          <div className="relative z-10 flex w-full flex-col justify-center px-5 py-4 sm:px-7 lg:w-[40%] lg:shrink-0 lg:px-10 lg:py-5">
            <div className="mb-2 flex items-center gap-3 text-[#d39d2d]">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] sm:text-[11px]">
                {banner.eyebrow}
              </p>
              <span className="h-px w-12 bg-[#d39d2d]/80" />
            </div>

            <h3 className="max-w-[470px] font-serif text-[1.8rem] font-black leading-[0.95] tracking-[-0.04em] text-[#1a1a1a] sm:text-[2.2rem] lg:text-[2.55rem]">
              Authentic Flavours
              <br />
              Delivered to{' '}
              <span className="text-[#c99518]">Your Doorstep</span>
            </h3>

            <p className="mt-2 max-w-[380px] text-[13px] leading-[1.45] text-[#4d4039] sm:text-[14px]">
              Enjoy a wide variety of tasty and hygienic meals prepared with fresh ingredients,
              delivered fresh to your home.
            </p>

            <div className="mt-3 flex items-center">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-xl bg-[#e2b14e] px-5 py-3 text-sm font-extrabold text-[#1d130d] shadow-[0_8px_18px_rgba(226,177,78,0.22)] transition hover:bg-[#d29c2f]"
              >
                {banner.action}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-3 flex items-center gap-2 text-[#d39d2d]">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#d39d2d]">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
              </svg>
              <svg viewBox="0 0 120 30" className="h-5 w-28 sm:w-32" fill="none">
                <path d="M2 18 Q20 4 40 10 T80 12 T118 8" stroke="#d39d2d" strokeWidth="1.8" strokeDasharray="4 5" strokeLinecap="round" />
              </svg>
              <Bike className="h-7 w-7" />
            </div>
          </div>

          <div className="relative z-10 hidden w-[38%] shrink-0 items-center px-1 py-6 lg:flex">
            <div className="grid w-full grid-cols-4 gap-3">
              {deliveryFeatures.map(({ Icon: FeatIcon, label }) => (
                <div key={label} className="flex min-w-0 flex-col items-center gap-2 text-center">
                  <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#e8d6a0] bg-[#f8f0dc] text-[#c9941f] shadow-[0_0_0_4px_rgba(236,204,126,0.15)]">
                    <FeatIcon className="h-6 w-6" strokeWidth={1.8} />
                  </span>
                  <span className="whitespace-pre-line text-[11px] font-semibold leading-tight text-[#3d3128]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative ml-auto hidden w-[22%] min-w-[220px] flex-1 overflow-hidden lg:block">
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

  /* ── Chef banner (chef variant) – matches reference design ── */
  if (isChef) {
    const featureItems = [
      { Icon: Leaf,            label: 'Fresh\nIngredients'     },
      { Icon: ChefHat,         label: 'Skilled\nChefs'         },
      { Icon: UtensilsCrossed, label: 'Authentic\nFlavours'    },
      { Icon: ShieldCheck,     label: 'Quality\nYou Can Trust' },
    ];

    return (
      <article
        aria-label={banner.eyebrow}
        className="group relative col-span-full isolate overflow-hidden rounded-[18px] border border-[#c9a866] shadow-[0_18px_45px_rgba(31,18,11,0.22)]"
        style={{ minHeight: '200px' }}
      >
        {/* ── Background: banner.png ── */}
        <img
          src="/images/banner.png"
          alt="Chef cooking in a restaurant kitchen"
          className="absolute inset-0 h-full w-full object-cover object-left"
        />

        {/* ── Dark gradient overlay – lighter on left (chef visible), dark on right (text readable) ── */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,9,4,0.08)_0%,rgba(15,9,4,0.25)_38%,rgba(15,9,4,0.82)_62%,rgba(15,9,4,0.94)_100%)]" />

        {/* ── Decorative gold leaf – top-left ── */}
        <svg aria-hidden="true" viewBox="0 0 80 120" className="pointer-events-none absolute left-0 top-0 h-[130px] w-[80px] opacity-80">
          <path d="M55 6C38 26 30 52 38 70c4 9 10 16 12 26 6 22 0 44-12 56 14-14 24-30 28-50 5-20 2-40-6-60C56 30 54 18 55 6Z" fill="#b8840e" opacity="0.5"/>
          <path d="M55 6C38 26 30 52 38 70c4 9 10 16 12 26 6 22 0 44-12 56 14-14 24-30 28-50 5-20 2-40-6-60C56 30 54 18 55 6Z" fill="none" stroke="#e9cc6e" strokeWidth="1.6"/>
          <path d="M50 38c3 14 4 28 0 42" fill="none" stroke="#e9cc6e" strokeWidth="1.2" strokeLinecap="round"/>
          <circle cx="57" cy="66" r="3" fill="#e9cc6e" opacity="0.8"/>
        </svg>

        {/* ── Decorative gold leaf – bottom-right ── */}
        <svg aria-hidden="true" viewBox="0 0 80 120" className="pointer-events-none absolute bottom-0 right-0 h-[110px] w-[70px] rotate-180 opacity-75">
          <path d="M55 6C38 26 30 52 38 70c4 9 10 16 12 26 6 22 0 44-12 56 14-14 24-30 28-50 5-20 2-40-6-60C56 30 54 18 55 6Z" fill="#b8840e" opacity="0.45"/>
          <path d="M55 6C38 26 30 52 38 70c4 9 10 16 12 26 6 22 0 44-12 56 14-14 24-30 28-50 5-20 2-40-6-60C56 30 54 18 55 6Z" fill="none" stroke="#e9cc6e" strokeWidth="1.6"/>
          <path d="M50 38c3 14 4 28 0 42" fill="none" stroke="#e9cc6e" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>

        {/* ── Small green leaves – top-right corner ── */}
        <svg aria-hidden="true" viewBox="0 0 36 50" className="pointer-events-none absolute right-7 top-2 h-10 w-8 opacity-90">
          <path d="M18 2C10 12 6 26 10 36c2 5 6 9 8 9s6-4 8-9c4-10 0-24-8-34Z" fill="#3a7a30" opacity="0.9"/>
          <path d="M18 8v26" stroke="#2a5e22" strokeWidth="1" strokeLinecap="round"/>
        </svg>
        <svg aria-hidden="true" viewBox="0 0 30 44" className="pointer-events-none absolute right-14 top-0 h-8 w-6 opacity-70 -rotate-12">
          <path d="M15 2C8 10 5 22 8 30c2 4 5 8 7 8s5-4 7-8c3-8 0-20-7-28Z" fill="#3a7a30" opacity="0.8"/>
          <path d="M15 6v22" stroke="#2a5e22" strokeWidth="1" strokeLinecap="round"/>
        </svg>

        {/* ── Gold brush stroke at bottom ── */}
        <svg aria-hidden="true" viewBox="0 0 900 22" className="pointer-events-none absolute bottom-0 left-0 w-full" preserveAspectRatio="none">
          <path d="M0 14 Q225 2 450 10 T900 8 L900 22 L0 22Z" fill="#b8840e" opacity="0.55"/>
          <path d="M0 18 Q225 6 450 13 T900 11" stroke="#e9cc6e" strokeWidth="1.4" fill="none" opacity="0.7"/>
        </svg>

        {/* ── Main content ── */}
        <div className="relative z-10 flex min-h-[200px] flex-col gap-5 px-4 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-end lg:gap-10 lg:px-10 lg:py-8">

          {/* Feature icons row – positioned in the centre-right area */}
          <div className="flex w-full flex-wrap items-center justify-center gap-4 sm:gap-5 lg:w-auto lg:flex-nowrap">
            {featureItems.map(({ Icon: FeatureIcon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#e8c96a] bg-[#f9f4e8] text-[#3d2208] shadow-[0_0_0_5px_rgba(233,200,106,0.2)] sm:h-16 sm:w-16">
                  <FeatureIcon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.8} />
                </span>
                <span className="whitespace-pre-line text-[10px] font-extrabold uppercase leading-tight tracking-wide text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)] sm:text-[11px]">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Right text block */}
          <div className="flex w-full flex-col items-center text-center lg:w-auto lg:max-w-[360px] lg:items-end lg:text-right">
            {/* Eyebrow line */}
            <div className="mb-2 flex items-center justify-center gap-2 lg:justify-end">
              <span className="h-px w-10 bg-[#e8bc5c]" />
              <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#e8bc5c]">
                {banner.eyebrow}
              </p>
            </div>

            {/* Headline */}
            <h3 className="font-serif text-[1.7rem] font-black leading-[1.06] text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.7)] sm:text-[2.2rem] lg:text-[2.55rem]">
              {banner.title}
              <span className="mt-0.5 block text-[#f4c83a] [text-shadow:0_2px_8px_rgba(0,0,0,0.5)]">
                Comes to Life
              </span>
            </h3>

            {/* Description */}
            <p className="mt-3 max-w-[320px] text-[12px] leading-[1.6] text-[#eedcbc] [text-shadow:0_1px_4px_rgba(0,0,0,0.6)] sm:text-[13px]">
              {banner.description}
            </p>

            {/* CTA */}
            <Link
              to="/shop"
              className="mt-4 inline-flex items-center gap-2.5 rounded-lg border border-[#b8840e] bg-[#d4a017] px-6 py-2.5 text-sm font-extrabold text-[#1a0e04] shadow-[0_6px_18px_rgba(212,160,23,0.35)] transition-all duration-200 hover:bg-[#e0b820] hover:shadow-[0_8px_24px_rgba(212,160,23,0.45)] hover:-translate-y-0.5"
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
