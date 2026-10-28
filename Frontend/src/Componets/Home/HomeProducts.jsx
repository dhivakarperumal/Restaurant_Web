import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, UtensilsCrossed } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Autoplay } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import api from '../../api';
import FoodProductCard from '../../CommonComponents/FoodProductCard';
import PageContainer from '../../CommonComponents/PageContainer';
import ShopPromoBanner from '../../CommonComponents/ShopPromoBanner';
import { getActiveMenu, getFoodAvailability, useFoodAvailabilityClock } from '../../CommonComponents/foodAvailability';
import { StoreContext } from '../../PrivateRouter/StoreContext';
import 'swiper/css';

function HomeProductSwiper({
  section,
  loading,
  error,
  onRetry,
  onSelectFood,
  onAdd,
  onBuyNow,
  wishlist,
  toggleWishlist,
}) {
  const swiperRef = useRef(null);
  const carouselFoods = useMemo(() => (
    section.foods.length
      ? Array.from(
        { length: Math.max(6, section.foods.length) },
        (_, index) => section.foods[index % section.foods.length],
      )
      : []
  ), [section.foods]);

  return (
    <section className="py-12 sm:py-16">
      <PageContainer>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a34f32]">{section.eyebrow}</p>
            <h2 className="mt-2 font-serif text-3xl font-bold text-[#203129] sm:text-4xl">{section.title}</h2>
            <p className="mt-2 text-sm text-slate-500">{section.description}</p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => swiperRef.current?.slidePrev()}
              aria-label={`Scroll ${section.title.toLowerCase()} carousel left`}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#1a3c36] shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => swiperRef.current?.slideNext()}
              aria-label={`Scroll ${section.title.toLowerCase()} carousel right`}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#1a3c36] shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex gap-5 overflow-hidden">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="basis-[calc((100%-1.25rem)/2)] shrink-0 animate-pulse rounded-3xl border border-slate-200 bg-white p-4 sm:basis-[calc((100%-2.5rem)/3)] lg:basis-[calc((100%-3.75rem)/4)] xl:basis-[calc((100%-5rem)/5)]">
                <div className="aspect-[4/3] rounded-2xl bg-slate-200" />
                <div className="mt-4 h-4 w-2/3 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-full rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
            <p className="text-sm font-semibold text-rose-800">{error}</p>
            <button type="button" onClick={onRetry} className="mt-3 text-sm font-bold text-rose-700 underline">
              Try again
            </button>
          </div>
        ) : section.foods.length ? (
          <Swiper
            onSwiper={(swiper) => { swiperRef.current = swiper; }}
            modules={[Autoplay]}
            loop={section.foods.length > 1}
            autoplay={section.foods.length > 1
              && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? { delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true }
              : false}
            slidesPerView={2}
            slidesPerGroup={1}
            spaceBetween={20}
            breakpoints={{
              640: { slidesPerView: 3 },
              1024: { slidesPerView: 4 },
              1280: { slidesPerView: 5 },
            }}
            className="!pb-4"
          >
            {carouselFoods.map((food, index) => (
              <SwiperSlide key={`${food.food_id || food.id}-${index}`} className="!h-auto">
                <FoodProductCard
                  food={food}
                  className="h-full w-full"
                  onSelect={() => onSelectFood(food)}
                  onImageClick={() => onSelectFood(food)}
                  onAdd={() => onAdd(food)}
                  onBuyNow={() => onBuyNow(food)}
                  isInWishlist={wishlist.some((item) => (
                    String(item.food_id || item.id || item.product_id || item._id)
                      === String(food.food_id || food.id)
                  ))}
                  onToggleWishlist={toggleWishlist}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <UtensilsCrossed className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">No food items available right now.</p>
          </div>
        )}

        <div className="mt-5 text-center sm:text-right">
          <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-bold text-[#1a3c36] hover:text-emerald-700">
            View the full menu <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </PageContainer>
    </section>
  );
}

function HomeProducts() {
  const navigate = useNavigate();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const store = useContext(StoreContext) || {};
  const { wishlist = [], toggleWishlist, addToCart } = store;
  const currentTime = useFoodAvailabilityClock();
  const activeMenu = getActiveMenu(currentTime);

  const fetchFoods = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/foods', { params: { include_unavailable: true } });
      const data = response.data?.data ?? response.data;
      if (!Array.isArray(data)) throw new Error('The menu response was invalid.');
      setFoods(data.filter((food) => (
        food.is_menu_visible !== false
        && food.is_available !== false
        && String(food.status || 'Active').toLowerCase() === 'active'
        && Number(food.stock_quantity || 0) > 0
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

  const productSections = useMemo(() => {
    const activeFoods = foods.filter((food) => getFoodAvailability(food, currentTime).available);
    const byFeaturedAndRating = [...activeFoods].sort((first, second) => (
      Number(Boolean(second.featured)) - Number(Boolean(first.featured))
      || Number(second.rating || 0) - Number(first.rating || 0)
    ));
    return [
      {
        id: activeMenu.mealType.toLowerCase().replaceAll(' ', '-'),
        eyebrow: 'Available now',
        title: activeMenu.heading,
        description: 'Fresh food available during this time.',
        foods: byFeaturedAndRating.slice(0, 10),
      },
    ];
  }, [activeMenu, currentTime, foods]);

  const addFoodToCart = (food) => {
    const price = Number(food.final_price || food.mrp || 0);
    const size = food.portion_size || 'Standard';
    if (!addToCart) return false;
    return addToCart({
      ...food,
      id: food.food_id || food.id,
      food_id: food.food_id || food.id,
      product_id: food.food_id || food.id,
      product_name: food.food_name,
      name: food.food_name,
      price,
      portion_size: size,
      product_image: food.food_images?.[0] || '',
      image: food.food_images?.[0] || '',
      quantity: 1,
    }, {
      size,
      price,
      quantity: 1,
    });
  };

  const buyFoodNow = (food) => {
    navigate('/checkout', {
      state: {
        buyNowItem: {
          food_id: String(food.food_id || food.id),
          food_name: food.food_name,
          product_name: food.food_name,
          food_images: food.food_images || [],
          product_image: food.food_images?.[0] || '',
          portion_size: food.portion_size || 'Standard',
          price: Number(food.final_price || food.mrp || 0),
          quantity: 1,
          selected_addons: [],
          selected_customizations: {},
        },
      },
    });
  };

  return (
    <>
      {productSections.map((section, index) => (
        <div key={section.id}>
          <HomeProductSwiper
            section={section}
            loading={loading}
            error={error}
            onRetry={fetchFoods}
            onSelectFood={(food) => navigate(`/food/${encodeURIComponent(food.food_id || food.id)}`, { state: { food } })}
            onAdd={addFoodToCart}
            onBuyNow={buyFoodNow}
            wishlist={wishlist}
            toggleWishlist={toggleWishlist}
          />
          <section className="px-4 py-4 sm:py-6">
            <PageContainer>
              <ShopPromoBanner variant={['chef', 'share'][index]} />
            </PageContainer>
          </section>
        </div>
      ))}
    </>
  );
}

export default HomeProducts;
