import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bike,
  ChefHat,
  ShieldCheck,
  Utensils,
} from "lucide-react";
import { Link } from "react-router-dom";
import api, { BACKEND_BASE_URL } from "../api";
import PageContainer from "./PageContainer";

function resolveAssetUrl(asset) {
  if (!asset || typeof asset !== "string") return "";
  if (/^https?:\/\//i.test(asset) || asset.startsWith("data:")) return asset;
  return `${BACKEND_BASE_URL}${asset.startsWith("/") ? asset : `/${asset}`}`;
}

function getBannerLink(link) {
  const value = String(link || "").trim();

  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (/^https?:\/\//i.test(value)) return value;

  return "/shop";
}

const benefits = [
  { Icon: Utensils, title: "Freshly Cooked", subtitle: "Everyday" },
  { Icon: ShieldCheck, title: "Hygienic & Safe", subtitle: "Preparation" },
  { Icon: ChefHat, title: "Trusted", subtitle: "Home Chefs" },
  { Icon: Bike, title: "Fast", subtitle: "Delivery" },
];

export default function HomeBanner() {
  const [banners, setBanners] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadBanners() {
      try {
        const response = await api.get("/banners/public");
        const data = response.data?.data ?? response.data;

        if (!Array.isArray(data)) {
          throw new Error("Invalid banner response");
        }

        if (isMounted) {
          setBanners(data.filter((banner) => banner.active));
          setError("");
        }
      } catch (err) {
        console.error("Failed to load home banners:", err);
        if (isMounted) {
          setError("Unable to load banners.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBanners();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (banners.length < 2) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % banners.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [banners.length]);

  const banner = banners[activeIndex];
  const image = resolveAssetUrl(banner?.image);
  const mobileImage = banner?.mobile_image
    ? resolveAssetUrl(banner.mobile_image)
    : image;

  const link = getBannerLink(banner?.link);
  const isExternal = /^https?:\/\//i.test(link);

  const title = banner?.title?.trim() || "";
  const subtitle = banner?.subtitle?.trim() || "";
  const description = banner?.description?.trim() || "";

  const renderOrderButton = () =>
    isExternal ? (
      <a
        href={link}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff681d] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-950/20 transition hover:-translate-y-0.5 hover:bg-[#ed570e] sm:px-9 sm:py-4"
      >
        <Utensils size={18} />
        Order Now
        <ArrowRight size={17} />
      </a>
    ) : (
      <Link
        to={link}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff681d] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-950/20 transition hover:-translate-y-0.5 hover:bg-[#ed570e] sm:px-9 sm:py-4"
      >
        <Utensils size={18} />
        Order Now
        <ArrowRight size={17} />
      </Link>
    );

  return (
    <section className="relative isolate w-full overflow-hidden bg-[#20170e] text-white">
      {/* Main hero */}
      <div className="relative min-h-[600px] sm:min-h-[620px] lg:min-h-[570px]">
        {/* Chef and food background image */}
        {image ? (
          <picture key={banner?.id || image}>
            {mobileImage && (
              <source
                media="(max-width: 767px)"
                srcSet={mobileImage}
              />
            )}
            <img
              src={image}
              alt="Fresh homemade meals prepared by our home chef"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover object-[62%_center]"
            />
          </picture>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_35%,#77502b_0%,#382416_45%,#17170f_100%)]" />
        )}

        {/* Dark overlay keeps the text readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#160e08]/45 via-[#21150b]/20 to-transparent" />

        {/* Decorative details */}
        <div className="pointer-events-none absolute left-0 top-0 h-40 w-40 rounded-full border border-[#f5a047]/10" />
        <div className="pointer-events-none absolute left-5 top-5 h-28 w-28 rounded-full border border-[#f5a047]/10" />

        {/* Content */}
        <PageContainer className="relative z-10 flex min-h-[600px] items-center pb-36 pt-12 sm:min-h-[620px] sm:pb-40 lg:min-h-[570px] lg:pb-40">
          <div className="max-w-[650px]">
            {subtitle && (
              <p className="mb-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.28em] text-[#f6c88b] sm:text-xs sm:tracking-[0.35em]">
                <span className="h-px w-8 bg-[#f6a34b]" />
                {subtitle}
              </p>
            )}

            {title && (
              <h1 className="max-w-[650px] whitespace-pre-line font-serif text-[clamp(2.7rem,6.5vw,5.5rem)] font-black leading-[1.02] tracking-[-0.045em] text-white">
                {title}
              </h1>
            )}

            {description && (
              <p className="mt-5 max-w-[480px] text-sm leading-6 text-white/85 sm:text-base sm:leading-7">
                {description}
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              {renderOrderButton()}

              <Link
                to="/shop"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/50 bg-black/15 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white hover:bg-white/10 sm:px-8 sm:py-4"
              >
                Explore Menu
                <ArrowRight size={17} />
              </Link>
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-white/75">
              <span className="flex -space-x-1 text-[#ffb51b]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <span key={index}>★</span>
                ))}
              </span>
              <span>Made with love, served fresh every day</span>
            </div>
          </div>
        </PageContainer>

        {/* Bottom benefits strip */}
        <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#071c0d]/75 backdrop-blur-sm">
          <PageContainer className="grid grid-cols-2 divide-x divide-y divide-white/10 sm:grid-cols-4 sm:divide-y-0">
            {benefits.map(({ Icon, title, subtitle }) => (
              <div
                key={title}
                className="flex min-h-[82px] items-center justify-center gap-3 px-3 py-3 sm:min-h-[94px] sm:gap-3 sm:px-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#f4c67e]/50 bg-white/[0.06] text-[#f4c67e] sm:h-11 sm:w-11">
                  <Icon size={21} strokeWidth={1.7} />
                </span>

                <div>
                  <p className="text-xs font-bold text-white sm:text-sm">
                    {title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/65 sm:text-xs">
                    {subtitle}
                  </p>
                </div>
              </div>
            ))}
          </PageContainer>
        </div>

        {/* Slider controls */}
        {banners.length > 1 && (
          <>
            <div className="absolute bottom-[108px] right-5 z-30 flex gap-2 sm:bottom-[112px] sm:right-10">
              {banners.map((item, index) => (
                <button
                  key={item.id || index}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show banner ${index + 1}`}
                  aria-current={activeIndex === index}
                  className={`h-2 rounded-full transition-all ${
                    activeIndex === index
                      ? "w-7 bg-[#ff681d]"
                      : "w-2 bg-white/65 hover:bg-white"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {loading && (
          <span className="sr-only" role="status">
            Loading home banner
          </span>
        )}

        {error && banners.length === 0 && (
          <span className="sr-only" role="status">
            {error}
          </span>
        )}
      </div>
    </section>
  );
}
