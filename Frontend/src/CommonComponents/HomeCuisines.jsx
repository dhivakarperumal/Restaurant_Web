import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { BACKEND_BASE_URL } from '../api';
import PageContainer from './PageContainer';

const resolveImageUrl = (image) => {
  if (!image || typeof image !== 'string') return '';
  if (/^https?:\/\//i.test(image) || image.startsWith('data:')) return image;
  return `${BACKEND_BASE_URL}${image.startsWith('/') ? image : `/${image}`}`;
};

function HomeCuisines() {
  const carouselRef = useRef(null);
  const [cuisines, setCuisines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCuisines = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/cuisines');
      const data = response.data?.data ?? response.data;
      if (!Array.isArray(data)) throw new Error('The cuisines response was invalid.');
      setCuisines(data.filter((cuisine) => (
        String(cuisine.status || 'Active').toLowerCase() === 'active'
      )));
    } catch (requestError) {
      console.error('Failed to load home cuisines:', requestError);
      setError(requestError.response?.data?.message || 'We could not load cuisines right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCuisines();
  }, [fetchCuisines]);

  const scrollCuisines = (direction) => {
    carouselRef.current?.scrollBy({
      left: direction * carouselRef.current.clientWidth * 0.75,
      behavior: 'smooth',
    });
  };

  return (
    <section className="bg-white pb-10 sm:pb-12" aria-labelledby="home-cuisines-heading">
      <PageContainer>
        <div className="mb-6 text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#e86d16]">
            Our Cuisines
          </p>
          <h2 id="home-cuisines-heading" className="mt-2 text-2xl font-extrabold text-[#17251e] sm:text-3xl">
            A World of <span className="font-serif italic text-[#1a6a3b]">Flavors</span>
          </h2>
        </div>

        {loading ? (
          <div className="scrollbar-hide flex gap-4 overflow-hidden px-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="w-[250px] shrink-0 animate-pulse overflow-hidden rounded-xl bg-slate-200 sm:w-[300px]">
                <div className="aspect-[3/2] bg-slate-300" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-center">
            <p className="text-sm font-semibold text-rose-800">{error}</p>
            <button type="button" onClick={fetchCuisines} className="mt-2 text-sm font-bold text-rose-700 underline">
              Try again
            </button>
          </div>
        ) : cuisines.length ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => scrollCuisines(-1)}
              aria-label="Scroll cuisines left"
              className="absolute -left-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#e7e0d8] bg-white text-[#203129] shadow-md transition hover:bg-[#fff8ed] sm:-left-3 sm:h-10 sm:w-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div
              ref={carouselRef}
              className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-2 pb-3 pt-1"
            >
              {cuisines.map((cuisine) => {
                const cuisineId = cuisine.cuisine_id || cuisine.id;
                const cuisineName = cuisine.cuisine_name || 'Cuisine';
                const cuisineFilter = cuisine.cuisine_id || cuisine.cuisine_name || cuisine.id;
                const image = resolveImageUrl(cuisine.image);
                return (
                  <Link
                    key={cuisineId}
                    to={`/shop?cuisine=${encodeURIComponent(cuisineFilter)}`}
                    aria-label={`Browse ${cuisineName} cuisine`}
                    className="group relative w-[250px] shrink-0 snap-start overflow-hidden rounded-xl bg-[#17251e] shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:w-[300px]"
                  >
                    <div className="aspect-[3/2] overflow-hidden">
                      {image ? (
                        <img
                          src={image}
                          alt={cuisineName}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[#315d2d] text-white/80">
                          <Utensils className="h-12 w-12" />
                        </div>
                      )}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 flex min-h-[76px] items-end justify-between gap-3 bg-gradient-to-t from-black/90 via-black/65 to-transparent px-4 pb-3 pt-8 text-white">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold sm:text-lg">{cuisineName}</h3>
                        <p className="mt-0.5 line-clamp-1 text-xs text-white/90 sm:text-sm">
                          {cuisine.description || 'Discover delicious dishes'}
                        </p>
                      </div>
                      <span className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#203129] transition group-hover:bg-[#fff8ed]">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => scrollCuisines(1)}
              aria-label="Scroll cuisines right"
              className="absolute -right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#e7e0d8] bg-white text-[#203129] shadow-md transition hover:bg-[#fff8ed] sm:-right-3 sm:h-10 sm:w-10"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <p className="py-5 text-center text-sm text-slate-500">Cuisines will appear here soon.</p>
        )}
      </PageContainer>
    </section>
  );
}

export default HomeCuisines;
