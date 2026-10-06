import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { BACKEND_BASE_URL } from '../api';
import PageContainer from './PageContainer';

const resolveImageUrl = (image) => {
  if (!image || typeof image !== 'string') return '';
  if (/^https?:\/\//i.test(image) || image.startsWith('data:')) return image;
  return `${BACKEND_BASE_URL}${image.startsWith('/') ? image : `/${image}`}`;
};

function HomeCategories() {
  const carouselRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/categories');
      const data = response.data?.data ?? response.data;
      if (!Array.isArray(data)) throw new Error('The categories response was invalid.');
      setCategories(data.filter((category) => (
        String(category.status || 'Active').toLowerCase() === 'active'
      )));
    } catch (requestError) {
      console.error('Failed to load home categories:', requestError);
      setError(requestError.response?.data?.message || 'We could not load categories right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const scrollCategories = useCallback((direction = 1) => {
    const carousel = carouselRef.current;
    const firstCard = carousel?.firstElementChild;
    if (!carousel || !firstCard) return;

    const gap = Number.parseFloat(window.getComputedStyle(carousel).columnGap) || 0;
    const cardWidth = firstCard.getBoundingClientRect().width + gap;
    const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;
    if (maxScrollLeft <= 1) return;

    if (direction > 0 && carousel.scrollLeft >= maxScrollLeft - 1) {
      carousel.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }

    carousel.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (loading || error || categories.length < 2
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const intervalId = window.setInterval(() => {
      const carousel = carouselRef.current;
      if (!carousel || carousel.matches(':hover')
        || carousel.contains(document.activeElement)
        || document.visibilityState !== 'visible') return;
      scrollCategories();
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [categories.length, error, loading, scrollCategories]);

  return (
    <section className="bg-white py-10 sm:py-12" aria-labelledby="home-categories-heading">
      <PageContainer>
        <div className="mb-6 text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#e86d16]">
            Popular Categories
          </p>
          <h2 id="home-categories-heading" className="mt-2 text-2xl font-extrabold text-[#17251e] sm:text-3xl">
            Choose Your <span className="font-serif italic text-[#1a6a3b]">Favorite</span>
          </h2>
        </div>

        {loading ? (
          <div className="scrollbar-hide flex gap-4 overflow-hidden px-2">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="basis-[calc((100%-1rem)/2)] shrink-0 animate-pulse rounded-2xl border-2 border-slate-200 bg-white p-2 sm:basis-[calc((100%-2rem)/3)] lg:basis-[calc((100%-3rem)/4)] xl:basis-[calc((100%-6rem)/7)]">
                <div className="aspect-[4/3] rounded-xl bg-slate-200" />
                <div className="mx-auto mt-3 h-4 w-2/3 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-center">
            <p className="text-sm font-semibold text-rose-800">{error}</p>
            <button type="button" onClick={fetchCategories} className="mt-2 text-sm font-bold text-rose-700 underline">
              Try again
            </button>
          </div>
        ) : categories.length ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => scrollCategories(-1)}
              aria-label="Scroll categories left"
              className="absolute -left-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#e7e0d8] bg-white text-[#203129] shadow-md transition hover:bg-[#fff8ed] sm:-left-3 sm:h-10 sm:w-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div
              ref={carouselRef}
              className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-2 pb-3 pt-1"
            >
              {categories.map((category) => {
                const categoryId = category.category_id || category.id;
                const categoryName = category.category_name || 'Category';
                const categoryFilter = category.category_id || category.category_name || category.id;
                const image = resolveImageUrl(category.category_image);
                return (
                  <Link
                    key={categoryId}
                    to={`/shop?category=${encodeURIComponent(categoryFilter)}`}
                    aria-label={`Browse ${categoryName}`}
                    className="group basis-[calc((100%-1rem)/2)] shrink-0 snap-start overflow-hidden rounded-2xl border-2 border-[#e5e5e5] bg-white p-2 shadow-sm transition hover:-translate-y-1 hover:border-[#d8c7a7] hover:shadow-lg sm:basis-[calc((100%-2rem)/3)] lg:basis-[calc((100%-3rem)/4)] xl:basis-[calc((100%-6rem)/7)]"
                  >
                    <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#f5efe5]">
                      {image ? (
                        <img
                          src={image}
                          alt={categoryName}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[#a05c2a]">
                          <ImageIcon className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <h3 className="truncate px-1 pb-1 pt-3 text-center text-sm font-bold text-[#202020]" title={categoryName}>
                      {categoryName}
                    </h3>
                  </Link>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => scrollCategories(1)}
              aria-label="Scroll categories right"
              className="absolute -right-1 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#e7e0d8] bg-white text-[#203129] shadow-md transition hover:bg-[#fff8ed] sm:-right-3 sm:h-10 sm:w-10"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <p className="py-5 text-center text-sm text-slate-500">Categories will appear here soon.</p>
        )}
      </PageContainer>
    </section>
  );
}

export default HomeCategories;
