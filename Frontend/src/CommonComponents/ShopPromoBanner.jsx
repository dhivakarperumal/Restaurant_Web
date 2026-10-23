
import {
  ArrowRight,
  Bike,
  ChefHat,
  Leaf,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react";
import { Link } from "react-router-dom";

const deliveryFeatures = [
  { Icon: Leaf, label: "Fresh\nIngredients" },
  { Icon: ChefHat, label: "Variety\nof Dishes" },
  { Icon: Bike, label: "Fast & Safe\nDelivery" },
  { Icon: ShieldCheck, label: "Hygienic\nPackaging" },
];

const bannerContent = {
  // fresh: {
  //   eyebrow: "Fresh from our kitchen",
  //   title: "Good food, made with care.",
  //   description:
  //     "Thoughtful ingredients and fresh preparation in every order.",
  //   action: "Explore the menu",
  //   icon: Leaf,
  // },
  chef: {
    eyebrow: "Our Kitchen",
    title: "Where Great Taste",
    description:
      "Our skilled chefs craft every dish with fresh ingredients, authentic recipes and a passion for great food.",
    action: "Explore Our Menu",
    icon: ChefHat,
  },
  share: {
    eyebrow: "Delicious Food",
    title: "Authentic Flavours",
    description:
      "Enjoy a wide variety of tasty and hygienic meals prepared with fresh ingredients, delivered fresh to your home.",
    action: "Order Now",
    icon: Bike,
  },
};

function ShopPromoBanner({ variant }) {
  const banner = bannerContent[variant];
  if (!banner) return null;

  const Icon = banner.icon;
  const isChef = variant === "chef";
  const isShare = variant === "share";

  // THIRD BANNER: delivery / restaurant promotion
  if (isShare) {
    return (
      <article
        aria-label="Restaurant delivery promotion"
        className="group relative col-span-full isolate min-h-[230px] overflow-hidden rounded-2xl border border-[#e5c989] bg-[#fbf5e8] shadow-lg sm:min-h-[250px] lg:min-h-[260px]"
      >
        {/* Background image: delivery person and customer on the right */}
        <img
          src="/images/delivery.png"
          alt="Restaurant order being delivered to a customer"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        {/* Cream text area on the left, image visible on the right */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#fffaf0] via-[#fff8eb]/95 via-45% to-transparent" />

        {/* Decorative botanical details */}
        <svg
          aria-hidden="true"
          viewBox="0 0 120 180"
          className="pointer-events-none absolute -left-3 top-0 h-32 w-24 text-[#d6b76c]/50 sm:h-40 sm:w-28"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        >
          <path d="M8 170 Q40 90 100 12" />
          <path d="M29 126 Q-4 115 3 84 Q29 90 29 126Z" />
          <path d="M43 101 Q24 66 51 43 Q62 72 43 101Z" />
          <path d="M62 72 Q56 39 91 23 Q90 54 62 72Z" />
          <path d="M19 145 Q52 140 60 116 Q32 115 19 145Z" />
        </svg>

        {/* Desktop layout: text | feature icons | delivery photo */}
        <div className="relative z-10 hidden min-h-[260px] items-center lg:flex">
          {/* Left: headline and CTA */}
          <div className="flex w-[36%] shrink-0 flex-col justify-center py-6 pl-9 pr-4 xl:pl-12">
            <div className="mb-2 flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.28em] text-[#bd851c]">
                {banner.eyebrow}
              </span>
              <span className="h-px w-12 bg-[#d7a638]" />
            </div>

            <h3 className="max-w-[390px] font-serif text-[1.85rem] font-black leading-[1.03] tracking-tight text-[#29231d] xl:text-[2.1rem]">
              Authentic Flavours
              <br />
              Delivered to{" "}
              <span className="text-[#c48a19]">Your Doorstep</span>
            </h3>

            <p className="mt-3 max-w-[340px] text-[12px] leading-relaxed text-[#5e5146] xl:text-[13px]">
              {banner.description}
            </p>

            <Link
              to="/shop"
              className="mt-4 inline-flex w-fit items-center gap-3 rounded-lg bg-[#efb33d] px-5 py-3 text-sm font-extrabold text-[#30200d] shadow-md transition duration-300 hover:-translate-y-0.5 hover:bg-[#dfa12a]"
            >
              {banner.action}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Center: four feature icons in one row */}
          {/* Center: four feature icons */}
<div className="relative z-10 flex flex-1 items-center justify-center px-3 xl:px-5">
  <div className="grid w-full max-w-[460px] grid-cols-2 gap-x-3 gap-y-5 xl:grid-cols-4 xl:gap-x-0">
              {deliveryFeatures.map(({ Icon: FeatureIcon, label }) => (
                <div
                  key={label}
                  className="flex min-w-0 flex-col items-center gap-2 text-center xl:border-r xl:border-[#c8a96a]/60 xl:last:border-r-0"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#e8d19b] bg-[#fff5d9]/95 text-[#bd851c] shadow-[0_0_0_4px_rgba(226,194,126,0.16)] xl:h-[50px] xl:w-[50px]">
                    <FeatureIcon className="h-5 w-5 xl:h-6 xl:w-6" strokeWidth={1.7} />
                  </span>
                  <span className="whitespace-pre-line text-[10px] font-semibold leading-tight text-[#41362b] xl:text-[10px]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: image remains visible with decorative greeting */}
          <div className="relative min-h-[260px] flex-1 self-stretch">
            <div className="absolute right-5 top-5 rounded-xl bg-[#fff9ed]/75 px-3 py-2 text-right font-serif italic text-[#473323] backdrop-blur-[2px]">
              <p className="text-base">Good Food</p>
              <p className="text-base">
                Good Mood <span className="text-[#d69b28]">♥</span>
              </p>
            </div>

            <div className="absolute bottom-4 right-4 flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 border-[#e3bd65] bg-[#fff8e7]/95 text-center shadow-lg">
              <ChefHat className="h-4 w-4 text-[#a76d14]" />
              <span className="mt-0.5 text-[7px] font-black uppercase leading-tight text-[#443426]">
                Fresh
                <br />
                Tasty
                <br />
                <span className="text-[#b7801c]">Happiness</span>
              </span>
            </div>
          </div>
        </div>

        {/* Mobile and tablet layout */}
        <div className="relative z-10 lg:hidden">
          <div className="max-w-[570px] px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-2 flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-[#bd851c]">
                {banner.eyebrow}
              </span>
              <span className="h-px w-10 bg-[#d7a638]" />
            </div>

            <h3 className="max-w-[440px] font-serif text-[1.65rem] font-black leading-tight text-[#29231d] sm:text-3xl">
              Authentic Flavours
              <br />
              Delivered to{" "}
              <span className="text-[#c48a19]">Your Doorstep</span>
            </h3>

            <p className="mt-2 max-w-[370px] text-xs leading-relaxed text-[#5e5146] sm:text-sm">
              {banner.description}
            </p>

            <Link
              to="/shop"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#efb33d] px-5 py-3 text-sm font-extrabold text-[#30200d] shadow-md transition hover:bg-[#dfa12a]"
            >
              {banner.action}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex justify-around gap-1 border-t border-[#dfcda8]/80 bg-[#fff9ed]/90 px-2 py-4 backdrop-blur-sm sm:px-5">
            {deliveryFeatures.map(({ Icon: FeatureIcon, label }) => (
              <div
                key={label}
                className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e8d19b] bg-[#fff5d9] text-[#bd851c] sm:h-11 sm:w-11">
                  <FeatureIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <span className="whitespace-pre-line text-[9px] font-semibold leading-tight text-[#41362b] sm:text-[10px]">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </article>
    );
  }

  // SECOND BANNER: chef promotion
  if (isChef) {
    const featureItems = [
      { Icon: Leaf, label: "Fresh\nIngredients" },
      { Icon: ChefHat, label: "Skilled\nChefs" },
      { Icon: UtensilsCrossed, label: "Authentic\nFlavours" },
      { Icon: ShieldCheck, label: "Quality\nYou Can Trust" },
    ];

    return (
      <article
        aria-label={banner.eyebrow}
        className="group relative col-span-full isolate min-h-[200px] overflow-hidden rounded-[18px] border border-[#c9a866] shadow-lg"
      >
        <img
          src="/images/banner.png"
          alt="Chef cooking in a restaurant kitchen"
          className="absolute inset-0 h-full w-full object-cover object-left"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-black/30 to-[#150904]/90" />

        <div className="relative z-10 flex min-h-[200px] flex-col gap-5 px-4 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-end lg:gap-8 lg:px-10">
          <div className="flex w-full flex-wrap items-center justify-center gap-4 sm:gap-5 lg:w-auto lg:flex-nowrap">
            {featureItems.map(({ Icon: FeatureIcon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#e8c96a] bg-[#f9f4e8] text-[#3d2208] sm:h-16 sm:w-16">
                  <FeatureIcon className="h-6 w-6 sm:h-7 sm:w-7" />
                </span>
                <span className="whitespace-pre-line text-[10px] font-bold text-white sm:text-[11px]">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex w-full flex-col items-center text-center lg:w-auto lg:max-w-[360px] lg:items-end lg:text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#e8bc5c]">
              {banner.eyebrow}
            </p>

            <h3 className="mt-2 font-serif text-[1.7rem] font-black leading-tight text-white sm:text-[2.2rem] lg:text-[2.55rem]">
              {banner.title}
              <span className="block text-[#f4c83a]">Comes to Life</span>
            </h3>

            <p className="mt-3 max-w-[320px] text-xs leading-relaxed text-[#eedcbc] sm:text-[13px]">
              {banner.description}
            </p>

            <Link
              to="/shop"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#d4a017] px-6 py-2.5 text-sm font-extrabold text-[#1a0e04] transition hover:bg-[#e0b820]"
            >
              {banner.action}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  // FIRST BANNER: fresh food promotion
  return (
    <article className="group relative col-span-full isolate flex min-h-[190px] items-center overflow-hidden rounded-[28px] border border-[#e7e4d8] bg-[#f3f5e9] px-6 py-7 text-[#203129] shadow-sm transition hover:shadow-lg sm:min-h-[210px] sm:px-10">
      <span className="absolute -right-12 -top-24 h-64 w-64 rounded-full bg-[#dce5c5] sm:right-12 sm:h-80 sm:w-80" />
      <span className="absolute right-16 top-1/2 hidden h-40 w-40 -translate-y-1/2 rounded-full border-2 border-[#cad7ad] sm:block" />

      <div className="relative z-10 max-w-2xl">
        <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#5f7839] sm:text-xs">
          <Icon className="h-4 w-4" />
          {banner.eyebrow}
        </div>

        <h3 className="max-w-xl font-serif text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
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

      <div className="absolute right-7 top-1/2 hidden h-28 w-28 -translate-y-1/2 items-center justify-center rounded-full border border-[#d8e1c4] bg-white/75 text-[#5f7839] sm:flex lg:right-16 lg:h-36 lg:w-36">
        <Icon className="h-12 w-12 lg:h-16 lg:w-16" strokeWidth={1.4} />
      </div>
    </article>
  );
}

export default ShopPromoBanner;
