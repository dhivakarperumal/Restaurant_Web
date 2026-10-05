import { useEffect, useState } from 'react';
import { ArrowRight, Bike, ChefHat, ChevronLeft, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { BACKEND_BASE_URL } from '../api';
import PageContainer from './PageContainer';

const resolveBannerImage = (image) => {
  if (!image || typeof image !== 'string') return '';
  if (/^https?:\/\//i.test(image) || image.startsWith('data:')) return image;
  return `${BACKEND_BASE_URL}${image.startsWith('/') ? image : `/${image}`}`;
};

const getBannerLink = (link) => {
  const value = String(link || '').trim();
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return '/shop';
};

function HomeBanner() {
  const [banners, setBanners] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadBanners = async () => {
      try {
        const response = await api.get('/banners/public');
        const data = response.data?.data ?? response.data;
        if (!Array.isArray(data)) throw new Error('The banner response was invalid.');
        if (isMounted) setBanners(data.filter((banner) => banner.active));
      } catch (requestError) {
        console.error('Failed to load home banners:', requestError);
        if (isMounted) setError('Home banners are temporarily unavailable.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
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

  const moveSlide = (direction) => {
    setActiveIndex((current) => (current + direction + banners.length) % banners.length);
  };

  const banner = banners[activeIndex];
  const link = getBannerLink(banner?.link);
  const isExternalLink = /^https?:\/\//i.test(link);
  const image = banner ? resolveBannerImage(banner.image) : '';
  const mobileImage = banner?.mobile_image ? resolveBannerImage(banner.mobile_image) : image;
  const title = banner?.title || 'Authentic Flavors, Always Near You';
  const description = banner?.description || 'Fresh ingredients, traditional recipes and a dining experience that feels like home.';

  return (
    <section className="relative isolate overflow-hidden bg-[#061b12] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_55%,rgba(14,75,45,0.8),transparent_55%),linear-gradient(110deg,#041a10_0%,#062216_54%,#160d07_100%)]" />
      {image && (
        <picture key={banner.id}>
          {mobileImage && <source media="(max-width: 767px)" srcSet={mobileImage} />}
          <img
            src={image}
            alt={title}
            fetchPriority="high"
            className="absolute inset-y-0 right-0 h-full w-full object-cover object-center opacity-75 md:w-[70%] md:opacity-100"
          />
        </picture>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#041a10] via-[#041a10]/95 to-[#041a10]/10 md:via-[#041a10]/85 md:to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#041a10]/80 via-transparent to-[#041a10]/10 md:from-transparent" />

      <PageContainer>
        <div className="relative flex min-h-[590px] items-center py-14 sm:min-h-[620px] sm:py-16 lg:min-h-[640px]">
          <div className="relative z-10 max-w-xl pb-24 md:max-w-[54%] md:pb-8">
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#e5a326] sm:text-sm">
              <Sparkles className="h-4 w-4" />
              Good food · Good people · Great times
            </span>
            <h1 className="mt-5 max-w-xl text-4xl font-black leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/80 sm:text-base sm:leading-7">
              {description}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {isExternalLink ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#f47716] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-950/20 transition hover:bg-[#ff8b2b]"
                >
                  Order Now <ArrowRight className="h-4 w-4" />
                </a>
              ) : (
                <Link
                  to={link}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#f47716] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-950/20 transition hover:bg-[#ff8b2b]"
                >
                  Order Now <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-black/15 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10"
              >
                Explore Menu
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex -space-x-3" aria-hidden="true">
                {['#f5c9a9', '#d4a78a', '#eed6bf'].map((color, index) => (
                  <span
                    key={color}
                    className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/80 text-xs font-black text-[#18352a] shadow-md"
                    style={{ backgroundColor: color }}
                  >
                    {['A', 'M', 'S'][index]}
                  </span>
                ))}
              </div>
              <div>
                <p className="text-lg font-black leading-tight">50K+</p>
                <p className="text-xs font-medium text-white/75">Happy customers</p>
              </div>
            </div>
          </div>

          <div className="absolute right-[35%] top-[18%] hidden h-36 w-36 rotate-6 items-center justify-center rounded-full border-[3px] border-[#f28a20] bg-[#ef861c] text-center shadow-[0_0_0_7px_rgba(242,138,32,0.2)] xl:flex">
            <span className="max-w-[100px] font-serif text-xl font-bold italic leading-tight text-white">
              {banner?.subtitle || 'Food Brings People Together'}
            </span>
          </div>

          <div className="absolute bottom-0 right-0 left-0 z-10 grid grid-cols-2 gap-y-3 rounded-2xl border border-[#ead8c7] bg-[#fffaf3] px-4 py-4 text-[#202820] shadow-xl sm:grid-cols-4 sm:px-5 md:left-auto md:w-[62%] md:gap-2 lg:w-[58%]">
            {[
              { Icon: ChefHat, label: <>Freshly<br />Prepared</> },
              { Icon: Sparkles, label: <>Authentic<br />Taste</> },
              { Icon: ShieldCheck, label: <>Hygienic<br />& Safe</> },
              { Icon: Bike, label: <>On-Time<br />Delivery</> },
            ].map(({ Icon, label }) => (
              <div key={Icon.displayName || Icon.name} className="flex flex-col items-center gap-1 text-center">
                <Icon className="h-7 w-7 text-[#243b30]" strokeWidth={1.8} />
                <span className="text-[11px] font-extrabold leading-tight sm:text-xs">{label}</span>
              </div>
            ))}
          </div>

          {banners.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => moveSlide(-1)}
                aria-label="Previous banner"
                className="absolute left-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/55 md:flex"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => moveSlide(1)}
                aria-label="Next banner"
                className="absolute right-2 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur transition hover:bg-black/55 md:flex"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div className="absolute bottom-[112px] right-0 z-20 flex gap-2 md:bottom-24">
                {banners.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Show banner ${index + 1}`}
                    aria-current={activeIndex === index}
                    className={`h-2 rounded-full transition-all ${activeIndex === index ? 'w-7 bg-[#f28a20]' : 'w-2 bg-white/60 hover:bg-white'}`}
                  />
                ))}
              </div>
            </>
          )}

          {loading && (
            <span className="sr-only" role="status">Loading home banners</span>
          )}
          {error && (
            <p role="status" className="absolute bottom-2 left-0 text-[10px] text-white/60">{error}</p>
          )}
        </div>
      </PageContainer>
    </section>
  );
}

export default HomeBanner;
