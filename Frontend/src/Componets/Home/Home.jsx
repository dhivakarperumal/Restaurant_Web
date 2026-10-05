import { useCallback, useEffect, useMemo, useRef, useState, useContext } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Sparkles, UtensilsCrossed } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import FoodProductCard from '../../CommonComponents/FoodProductCard';
import PageContainer from '../../CommonComponents/PageContainer';
import { StoreContext } from '../../PrivateRouter/StoreContext';

const Home = () => {
  const navigate = useNavigate();
  const carouselRef = useRef(null);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const store = useContext(StoreContext) || {};
  const { wishlist = [], toggleWishlist } = store;

  const fetchFoods = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/foods');
      const data = response.data?.data ?? response.data;
      if (!Array.isArray(data)) throw new Error('The menu response was invalid.');
      setFoods(data.filter((food) => (
        food.is_available !== false
        && String(food.status || 'Active').toLowerCase() === 'active'
      )));
    } catch (requestError) {
      console.error('Failed to load home menu:', requestError);
      setError(requestError.response?.data?.message || 'We could not load the menu right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  const featuredFoods = useMemo(() => [...foods]
    .sort((first, second) => Number(Boolean(second.featured)) - Number(Boolean(first.featured)))
    .slice(0, 10), [foods]);

  const openFoodInShop = (food) => {
    const foodId = food.food_id || food.id;
    navigate(`/shop?food=${encodeURIComponent(foodId)}`);
  };

  const scrollCarousel = (direction) => {
    carouselRef.current?.scrollBy({
      left: direction * (carouselRef.current.clientWidth * 0.8),
      behavior: 'smooth',
    });
  };

  return (
    <main className="min-h-screen bg-[#fcfbf9] pb-16 pt-24 text-[#203129]">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0d221d] via-[#16382f] to-[#20493e] py-14 text-white sm:py-20">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#d4a843]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />
        <PageContainer>
          <div className="relative grid items-center gap-8 md:grid-cols-[1.2fr_0.8fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#e8c873]">
                <Sparkles className="h-3.5 w-3.5" /> Fresh from our kitchen
              </span>
              <h1 className="mt-5 max-w-2xl font-serif text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Good food brings us together.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-50/80 sm:text-base">
                Discover freshly prepared favorites made with care. Find your next
                meal and make it your own.
              </p>
              <Link
                to="/shop"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#d4a843] px-5 py-3 text-sm font-bold text-[#172c24] transition hover:bg-[#e3bd60]"
              >
                Explore the menu <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="hidden justify-self-end rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm md:block">
              <UtensilsCrossed className="mx-auto h-16 w-16 text-[#d4a843]" />
              <p className="mt-4 font-serif text-xl font-bold">Made fresh. Served with love.</p>
              <p className="mt-2 text-sm text-emerald-50/70">Your table is waiting.</p>
            </div>
          </div>
        </PageContainer>
      </section>

      <section className="py-12 sm:py-16">
        <PageContainer>
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a34f32]">A taste of what we make</p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-[#203129] sm:text-4xl">Guest favorites</h2>
              <p className="mt-2 text-sm text-slate-500">Fresh picks from our menu, ready for your next meal.</p>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => scrollCarousel(-1)}
                aria-label="Scroll food carousel left"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#1a3c36] shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCarousel(1)}
                aria-label="Scroll food carousel right"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#1a3c36] shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex gap-5 overflow-hidden">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="w-[270px] shrink-0 animate-pulse rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="aspect-[4/3] rounded-2xl bg-slate-200" />
                  <div className="mt-4 h-4 w-2/3 rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-full rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
              <p className="text-sm font-semibold text-rose-800">{error}</p>
              <button type="button" onClick={fetchFoods} className="mt-3 text-sm font-bold text-rose-700 underline">
                Try again
              </button>
            </div>
          ) : featuredFoods.length ? (
            <div
              ref={carouselRef}
              className="scrollbar-hide flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-4"
            >
              {featuredFoods.map((food) => (
                <FoodProductCard
                  key={food.food_id || food.id}
                  food={food}
                  className="w-[270px] shrink-0 snap-start sm:w-[290px]"
                  onSelect={() => openFoodInShop(food)}
                  onAdd={openFoodInShop}
                  isInWishlist={wishlist.some((item) => (
                    String(item.food_id || item.id || item.product_id || item._id)
                      === String(food.food_id || food.id)
                  ))}
                  onToggleWishlist={toggleWishlist}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <UtensilsCrossed className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">Menu favorites will appear here.</p>
            </div>
          )}

          <div className="mt-5 text-center sm:text-right">
            <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-[#1a3c36] hover:text-emerald-700">
              View the full menu <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </PageContainer>
      </section>
    </main>
  );
};

export default Home;
