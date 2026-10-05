import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bike,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Leaf,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { BACKEND_BASE_URL } from '../api';
import PageContainer from './PageContainer';

const resolveAssetUrl = (asset) => {
  if (!asset || typeof asset !== 'string') return '';
  if (/^https?:\/\//i.test(asset) || asset.startsWith('data:')) return asset;
  return `${BACKEND_BASE_URL}${asset.startsWith('/') ? asset : `/${asset}`}`;
};

const getBannerLink = (link) => {
  const value = String(link || '').trim();
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return '/shop';
};

function HomeBanner() {
  const [banners, setBanners] = useState([]);
  const [foodImages, setFoodImages] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadBannerContent = async () => {
      const [bannerResult, foodResult] = await Promise.allSettled([
        api.get('/banners/public'),
        api.get('/foods'),
      ]);

      if (bannerResult.status === 'fulfilled') {
        const data = bannerResult.value.data?.data ?? bannerResult.value.data;
        if (Array.isArray(data)) {
          if (isMounted) setBanners(data.filter((banner) => banner.active));
        } else {
          console.error('Home banners response was not an array.');
          if (isMounted) setError('Home banners are temporarily unavailable.');
        }
      } else {
        console.error('Failed to load home banners:', bannerResult.reason);
        if (isMounted) setError('Home banners are temporarily unavailable.');
      }

      if (foodResult.status === 'fulfilled') {
        const data = foodResult.value.data?.data ?? foodResult.value.data;
        if (Array.isArray(data) && isMounted) {
          setFoodImages(data
            .filter((food) => food.is_available !== false && String(food.status || 'Active').toLowerCase() === 'active')
            .map((food) => ({
              id: food.food_id || food.id,
              image: resolveAssetUrl(food.food_images?.[0]),
              name: food.food_name,
            }))
            .filter((food) => food.image)
            .slice(0, 3));
        }
      } else {
        console.error('Failed to load menu images for the home banner:', foodResult.reason);
      }

      if (isMounted) setLoading(false);
    };

    loadBannerContent();
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

  const moveSlide = (direction) => {
    setActiveIndex((current) => (current + direction + banners.length) % banners.length);
  };

  const banner = banners[activeIndex];
  const link = getBannerLink(banner?.link);
  const isExternalLink = /^https?:\/\//i.test(link);
  const image = resolveAssetUrl(banner?.image);
  const mobileImage = banner?.mobile_image ? resolveAssetUrl(banner.mobile_image) : image;
  const title = banner?.title || 'Taste Good Food Every Day';
  const subtitle = banner?.subtitle || 'Food That Feels Like Home';
  const description = banner?.description || 'Fresh ingredients, traditional recipes and a dining experience that feels like home.';
  const specialImages = foodImages.length ? foodImages : (image ? [{ id: 'banner-food', image, name: title }] : []);
  const benefits = [
    { Icon: Leaf, lines: ['Fresh', 'Ingredients'] },
    { Icon: ChefHat, lines: ['Authentic', 'Taste'] },
    { Icon: ShieldCheck, lines: ['Hygienic', '& Safe'] },
    { Icon: Bike, lines: ['Fast', 'Delivery'] },
  ];

  return (
    <section className="relative isolate overflow-hidden bg-[#fff8ed] text-[#102c22]">
      <div className="relative mx-auto grid min-h-[620px] max-w-[1920px] md:min-h-[570px] lg:min-h-[620px] md:grid-cols-[46%_54%]">
        <div className="relative z-10 flex min-w-0 flex-col justify-center bg-[#fff8ed]">
          <div className="pointer-events-none absolute -left-12 -top-12 h-36 w-36 rounded-full bg-[#315d2d]/[0.06]" />
          <PageContainer className="relative flex h-full w-full flex-col justify-center !px-[13.04%] py-12 sm:!px-[10.87%] sm:py-14 lg:!px-[6.52%]">
          <div className="max-w-[590px]">
            <p className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#e86d16] sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Good food <span>·</span> Good company <span>·</span> Great memories
            </p>

            <h1 className="mt-5 max-w-[560px] font-serif text-[clamp(2.7rem,4.2vw,4.75rem)] font-black leading-[0.99] tracking-[-0.04em] text-[#102c22]">
              {title}
            </h1>
            <p className="mt-5 max-w-[420px] text-sm leading-6 text-[#41443e] sm:text-base sm:leading-7">
              {description}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {isExternalLink ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#f47716] px-6 py-3 text-sm font-extrabold text-white shadow-md shadow-orange-950/10 transition hover:-translate-y-0.5 hover:bg-[#e9680b]"
                >
                  Order Now <ArrowRight className="h-4 w-4" />
                </a>
              ) : (
                <Link
                  to={link}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#f47716] px-6 py-3 text-sm font-extrabold text-white shadow-md shadow-orange-950/10 transition hover:-translate-y-0.5 hover:bg-[#e9680b]"
                >
                  Order Now <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-lg border border-[#263a30]/70 px-6 py-3 text-sm font-bold text-[#14291f] transition hover:bg-[#e9e1d3]"
              >
                Explore Menu
              </Link>
            </div>

            <div className="mt-8 grid max-w-[480px] grid-cols-4 divide-x divide-[#d9cbb6]">
              {benefits.map(({ Icon, lines }) => (
                <div key={lines[0]} className="flex flex-col items-center gap-1.5 px-1.5 text-center sm:px-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#183b2b] shadow-sm">
                    <Icon className="h-6 w-6" strokeWidth={1.7} />
                  </span>
                  <span className="text-[10px] font-bold leading-tight sm:text-[11px]">
                    {lines[0]}<br />{lines[1]}
                  </span>
                </div>
              ))}
            </div>
          </div>
          </PageContainer>
        </div>

        <div className="relative z-10 min-h-[330px] overflow-hidden rounded-tl-[4rem] bg-[#243b2b] sm:min-h-[390px] md:min-h-0 md:rounded-tl-[6rem]">
          {image ? (
            <picture key={banner?.id || image}>
              {mobileImage && <source media="(max-width: 767px)" srcSet={mobileImage} />}
              <img
                src={image}
                alt={title}
                fetchPriority="high"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            </picture>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_45%,#74502d_0%,#392715_45%,#17291f_100%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10" />

          <div className="absolute left-5 top-5 z-10 flex h-28 w-28 items-center justify-center rounded-full border-2 border-[#f3a126] bg-[#073c2b]/95 p-4 text-center shadow-[0_0_0_6px_rgba(243,161,38,0.2)] sm:left-8 sm:top-8 sm:h-36 sm:w-36">
            <span className="font-serif text-sm font-bold italic leading-tight text-white sm:text-base">
              {subtitle}
              <span className="mt-1 block text-lg not-italic text-[#f5a21b]">♥</span>
            </span>
          </div>

          {specialImages.length > 0 && (
            <Link
              to="/shop"
              className="absolute bottom-4 right-4 z-10 flex items-center gap-2.5 rounded-2xl border border-white/80 bg-[#fffaf2]/95 p-2.5 text-[#153526] shadow-xl backdrop-blur sm:bottom-7 sm:right-7 sm:gap-4 sm:p-3"
            >
              <span className="hidden max-w-[92px] font-serif text-sm font-bold italic leading-tight sm:block">
                Explore Our Special Dishes
              </span>
              <span className="flex -space-x-3">
                {specialImages.map((food) => (
                  <img
                    key={food.id}
                    src={food.image}
                    alt={food.name}
                    className="h-11 w-11 rounded-full border-2 border-[#fffaf2] object-cover sm:h-14 sm:w-14"
                  />
                ))}
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f47716] text-white">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          )}

          {banners.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => moveSlide(-1)}
                aria-label="Previous banner"
                className="absolute left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/60 md:flex"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => moveSlide(1)}
                aria-label="Next banner"
                className="absolute right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/60 md:flex"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                {banners.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Show banner ${index + 1}`}
                    aria-current={activeIndex === index}
                    className={`h-2 rounded-full transition-all ${activeIndex === index ? 'w-7 bg-[#f28a20]' : 'w-2 bg-white/70 hover:bg-white'}`}
                  />
                ))}
              </div>
            </>
          )}
          {loading && <span className="sr-only" role="status">Loading home banner</span>}
          {error && <p role="status" className="sr-only">{error}</p>}
        </div>
      </div>
    </section>
  );
}

export default HomeBanner;
