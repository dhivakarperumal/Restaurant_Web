import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api';
import FoodProductCard from '../../CommonComponents/FoodProductCard';
import FoodCustomizationModal from '../../CommonComponents/FoodCustomizationModal';
import PageContainer from '../../CommonComponents/PageContainer';
import { StoreContext } from '../../PrivateRouter/StoreContext';

function HomeProducts() {
  const carouselRef = useRef(null);
  const [foods, setFoods] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const store = useContext(StoreContext) || {};
  const { wishlist = [], toggleWishlist, addToCart } = store;

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

  const addSelectedFoodToCart = async ({ quantity, selectedAddons, selectedCustomizations, unitPrice }) => {
    if (!selectedFood || !addToCart) return false;
    return addToCart({
      ...selectedFood,
      id: selectedFood.food_id || selectedFood.id,
      food_id: selectedFood.food_id || selectedFood.id,
      product_id: selectedFood.food_id || selectedFood.id,
      product_name: selectedFood.food_name,
      name: selectedFood.food_name,
      price: unitPrice,
      portion_size: selectedFood.portion_size || 'Standard',
      product_image: selectedFood.food_images?.[0] || '',
      image: selectedFood.food_images?.[0] || '',
      quantity,
    }, {
      size: selectedFood.portion_size || 'Standard',
      price: unitPrice,
      quantity,
      selectedAddons,
      selectedCustomizations,
    });
  };

  const scrollCarousel = (direction) => {
    carouselRef.current?.scrollBy({
      left: direction * (carouselRef.current.clientWidth * 0.8),
      behavior: 'smooth',
    });
  };

  return (
    <>
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
                  onSelect={() => setSelectedFood(food)}
                  onAdd={setSelectedFood}
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
      {selectedFood && (
        <FoodCustomizationModal
          food={selectedFood}
          onClose={() => setSelectedFood(null)}
          onAdd={addSelectedFoodToCart}
        />
      )}
    </>
  );
}

export default HomeProducts;
