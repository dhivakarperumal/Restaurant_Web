import { useContext, useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Flame, Heart, Leaf, Minus, Plus, ShoppingCart, Sparkles, Star, Truck, UtensilsCrossed } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { BACKEND_BASE_URL } from '../api';
import { StoreContext } from '../PrivateRouter/StoreContext';
import PageContainer from './PageContainer';
import PageHeader from './PageHeader';
import FoodCustomizationModal from './FoodCustomizationModal';
import FoodProductCard from './FoodProductCard';

const imageUrl = (image) => {
  if (!image || typeof image !== 'string') return '';
  if (/^https?:\/\//i.test(image) || image.startsWith('data:')) return image;
  return `${BACKEND_BASE_URL}${image.startsWith('/') ? image : `/${image}`}`;
};

function FoodDetailsPage() {
  const { foodId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const store = useContext(StoreContext) || {};
  const { addToCart, wishlist = [], toggleWishlist } = store;
  const initialFood = location.state?.food;
  const [food, setFood] = useState(
    initialFood && String(initialFood.food_id || initialFood.id) === String(foodId)
      ? initialFood
      : null,
  );
  const [loading, setLoading] = useState(!food);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [customizing, setCustomizing] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [zoomPosition, setZoomPosition] = useState(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState('overview');
  const [relatedFoods, setRelatedFoods] = useState([]);
  const [relatedFoodsLoading, setRelatedFoodsLoading] = useState(false);
  const [relatedFoodsError, setRelatedFoodsError] = useState('');
  const [relatedFoodToCustomize, setRelatedFoodToCustomize] = useState(null);

  useEffect(() => {
    if (food && String(food.food_id || food.id) === String(foodId)) return undefined;
    let mounted = true;
    const loadFood = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/foods/${encodeURIComponent(foodId)}`);
        const result = response.data?.data;
        if (!result || String(result.food_id || result.id) !== String(foodId)) {
          throw new Error('This menu item could not be found.');
        }
        if (mounted) setFood(result);
      } catch (requestError) {
        console.error('Failed to load food details:', requestError);
        if (mounted) {
          setError(requestError.response?.data?.message || requestError.message || 'We could not load this menu item.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadFood();
    return () => { mounted = false; };
  }, [food, foodId]);

  useEffect(() => {
    if (!food) return undefined;
    let mounted = true;
    const loadRelatedFoods = async () => {
      setRelatedFoodsLoading(true);
      setRelatedFoodsError('');
      try {
        const response = await api.get('/foods');
        const result = response.data?.success
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : null;
        if (!Array.isArray(result)) throw new Error('The related menu items response was invalid.');
        if (mounted) setRelatedFoods(result);
      } catch (requestError) {
        console.error('Failed to load related foods:', requestError);
        if (mounted) {
          setRelatedFoodsError('Related dishes could not be loaded right now.');
        }
      } finally {
        if (mounted) setRelatedFoodsLoading(false);
      }
    };
    loadRelatedFoods();
    return () => { mounted = false; };
  }, [food]);

  const addSelectedFoodToCart = async ({
    quantity,
    selectedAddons,
    selectedCustomizations,
    unitPrice,
  }) => {
    if (!food || !addToCart) {
      toast.error('Unable to add this item to your cart.');
      return false;
    }
    return addToCart({
      ...food,
      id: food.food_id || food.id,
      food_id: food.food_id || food.id,
      product_id: food.food_id || food.id,
      product_name: food.food_name,
      name: food.food_name,
      price: unitPrice,
      portion_size: food.portion_size || 'Standard',
      product_image: food.food_images?.[0] || '',
      image: food.food_images?.[0] || '',
      quantity,
    }, {
      size: food.portion_size || 'Standard',
      price: unitPrice,
      quantity,
      selectedAddons,
      selectedCustomizations,
    });
  };

  const addRelatedFoodToCart = async ({
    quantity,
    selectedAddons,
    selectedCustomizations,
    unitPrice,
  }) => {
    if (!relatedFoodToCustomize || !addToCart) {
      toast.error('Unable to add this item to your cart.');
      return false;
    }
    const selectedFood = relatedFoodToCustomize;
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

  const images = Array.isArray(food?.food_images) ? food.food_images.filter(Boolean) : [];
  const addons = Array.isArray(food?.addons) ? food.addons : [];
  const customizations = Array.isArray(food?.customizations) ? food.customizations : [];
  const getRelatedFoods = (type) => {
    const idField = type === 'cuisine' ? 'cuisine_id' : 'category_id';
    const nameField = type === 'cuisine' ? 'cuisine_name' : 'category_name';
    const currentId = String(food?.[idField] || '').trim();
    const currentName = String(food?.[nameField] || '').trim().toLowerCase();
    if (!currentId && !currentName) return [];
    return relatedFoods.filter((item) => {
      const itemId = String(item[idField] || '').trim();
      const itemName = String(item[nameField] || '').trim().toLowerCase();
      const matches = currentId && itemId
        ? currentId === itemId
        : currentName && itemName === currentName;
      const sameFood = String(item.food_id || item.id) === String(food?.food_id || food?.id);
      return matches && !sameFood && item.is_menu_visible !== false
        && String(item.status || 'Active').toLowerCase() === 'active';
    }).slice(0, 8);
  };
  const cuisineRelatedFoods = getRelatedFoods('cuisine');
  const categoryRelatedFoods = getRelatedFoods('category');
  const detailTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'food-details', label: 'Food Details' },
    ...(addons.length ? [{ id: 'add-ons', label: 'Add-ons' }] : []),
    ...(customizations.length ? [{ id: 'customization', label: 'Customization' }] : []),
    ...(Number(food?.rating) > 0 ? [{ id: 'reviews', label: 'Reviews' }] : []),
  ];
  const price = Number(food?.final_price || food?.mrp || 0);
  const mrp = Number(food?.mrp || 0);
  const hasDiscount = Number(food?.discount || 0) > 0 && mrp > price;
  const isAvailable = food?.is_available !== false
    && String(food?.status || 'Active').toLowerCase() === 'active';
  const isInWishlist = wishlist.some((item) => (
    String(item.food_id || item.id || item.product_id || item._id)
      === String(food?.food_id || food?.id)
  ));

  if (loading) {
    return (
      <>
        <PageHeader title="Dish Details" />
        <PageContainer>
          <div className="grid animate-pulse gap-8 py-10 lg:grid-cols-2">
            <div className="aspect-[4/3] rounded-3xl bg-slate-200" />
            <div className="space-y-4">
              <div className="h-8 w-2/3 rounded bg-slate-200" />
              <div className="h-4 w-full rounded bg-slate-100" />
              <div className="h-4 w-5/6 rounded bg-slate-100" />
              <div className="h-12 w-1/3 rounded bg-slate-200" />
            </div>
          </div>
        </PageContainer>
      </>
    );
  }

  if (error || !food) {
    return (
      <>
        <PageHeader title="Dish Details" />
        <PageContainer>
          <div className="py-16 text-center">
            <UtensilsCrossed className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-4 text-xl font-bold text-slate-800">Dish unavailable</h2>
            <p role="alert" className="mt-2 text-sm text-slate-500">{error || 'This menu item could not be found.'}</p>
            <Link to="/shop" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1a3c36] px-5 py-3 text-sm font-bold text-white hover:bg-[#245048]">
              <ArrowLeft className="h-4 w-4" /> Back to shop
            </Link>
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_#fffdf6_0%,_#f8f6ef_52%,_#f5f3ed_100%)] pb-16">
        <PageContainer>
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 pt-5 text-xs font-medium text-slate-500 sm:pt-7">
            <Link to="/" className="transition hover:text-[#1a3c36]">Home</Link>
            <span>/</span>
            <Link to="/shop" className="transition hover:text-[#1a3c36]">Menu</Link>
            {food.cuisine_name && <><span>/</span><span>{food.cuisine_name}</span></>}
            <span>/</span>
            <span className="font-bold text-slate-800">{food.food_name}</span>
          </nav>

          <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-4">
            <div className="order-2 space-y-5 lg:order-2">
              <section className="rounded-[1.75rem] border border-[#e9e4d8] bg-white/90 p-5 shadow-[0_16px_50px_-30px_rgba(38,55,37,0.3)] sm:p-7">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className={`rounded-full px-3 py-1.5 font-bold ${String(food.food_type || '').toLowerCase() === 'veg' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                    {String(food.food_type || 'Food')}
                  </span>
                  {food.cuisine_name && <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-800">{food.cuisine_name}</span>}
                  {food.category_name && <span className="rounded-full bg-orange-50 px-3 py-1.5 font-semibold text-orange-800">{food.category_name}</span>}
                  {food.is_spicy && <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 font-bold text-orange-700"><Flame className="h-3.5 w-3.5" /> Spicy</span>}
                </div>

                <h1 className="mt-4 font-serif text-3xl font-bold leading-tight tracking-tight text-[#14231e] sm:text-4xl">{food.food_name}</h1>
                {Number(food.rating) > 0 && (
                  <div className="mt-3 inline-flex flex-wrap items-center gap-1.5 text-sm font-bold text-amber-700">
                    <span className="inline-flex gap-0.5" aria-label={`${Number(food.rating).toFixed(1)} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`h-4 w-4 ${Number(food.rating) >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                      ))}
                    </span>
                    {Number(food.rating).toFixed(1)} <span className="font-medium text-slate-500">Customer rating</span>
                    {Number(food.preparation_time) > 0 && <><span className="mx-1 text-slate-300">|</span><Clock3 className="h-4 w-4 text-orange-600" /><span className="text-slate-800">{food.preparation_time} min</span></>}
                  </div>
                )}
                <p className="mt-4 text-sm leading-6 text-slate-600">{food.description || `Freshly prepared ${food.food_name}, made to order with care.`}</p>

                <div className="mt-5 grid grid-cols-2 border-y border-[#efeae0] py-3 sm:grid-cols-4">
                  {[
                    [<BadgeCheck key="freshly-prepared" className="h-5 w-5" />, 'Freshly', 'Prepared'],
                    [<Leaf key="quality-ingredients" className="h-5 w-5" />, 'Quality', 'Ingredients'],
                    [<UtensilsCrossed key="authentic-taste" className="h-5 w-5" />, 'Authentic', 'Taste'],
                    [<Truck key="delivery" className="h-5 w-5" />, 'Available for', 'Delivery'],
                  ].map(([icon, firstLine, secondLine], index) => (
                    <div key={firstLine} className={`flex flex-col items-center gap-1 px-2 py-2 text-center ${index > 0 ? 'border-l border-[#efeae0]' : ''}`}>
                      <span className="text-orange-600">{icon}</span>
                      <span className="text-[10px] font-semibold leading-tight text-slate-700">{firstLine}<br />{secondLine}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#edf5e8] to-[#fff2dc] p-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-serif text-3xl font-black text-[#16432d]">₹{price.toFixed(2)}</span>
                    {hasDiscount && <span className="text-sm font-medium text-slate-500 line-through">₹{mrp.toFixed(2)}</span>}
                    {hasDiscount && <span className="rounded-lg bg-orange-600 px-3 py-1 text-[11px] font-extrabold text-white">{food.discount}% OFF</span>}
                  </div>
                  {hasDiscount && <p className="mt-1 text-xs font-semibold text-emerald-800">You save ₹{(mrp - price).toFixed(2)} on this dish!</p>}
                  {food.featured && <span className="mt-2 inline-flex rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-amber-800">Featured dish</span>}
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <div>
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">Quantity</span>
                    <div className="inline-flex h-11 items-center rounded-full border border-[#e5e2da] bg-[#fffefa]">
                    <button
                      type="button"
                      onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                      className="flex h-full w-10 items-center justify-center rounded-l-full text-slate-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span aria-live="polite" aria-label={`Quantity ${quantity}`} className="min-w-10 text-center text-sm font-bold text-slate-800">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((current) => Math.min(99, current + 1))}
                      disabled={quantity >= 99}
                      aria-label="Increase quantity"
                      className="flex h-full w-10 items-center justify-center rounded-r-full text-slate-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    </div>
                  </div>
                  <button type="button" onClick={() => setCustomizing(true)} disabled={!isAvailable} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#10482f] to-[#075b39] px-4 py-3 text-sm font-bold text-white shadow-md shadow-emerald-950/10 transition hover:from-[#0c3d28] hover:to-[#064a30] disabled:cursor-not-allowed disabled:bg-slate-300 sm:flex-none">
                  {isAvailable ? <><ShoppingCart className="h-4 w-4" />Customize & add to cart <ArrowLeft className="h-4 w-4 rotate-180" /></> : 'Unavailable'}
                  </button>
                </div>
                <p className={`mt-3 flex items-center gap-2 text-xs font-semibold ${isAvailable ? 'text-emerald-700' : 'text-rose-600'}`}>
                  <span className={`h-2 w-2 rounded-full ${isAvailable ? 'bg-emerald-600' : 'bg-rose-500'}`} />
                  {isAvailable ? 'Available to order' : 'Currently unavailable'}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    ['Dine-in', food.dining_available],
                    ['Takeaway', food.takeaway_available],
                    ['Delivery', food.delivery_available],
                  ].map(([label, available]) => (
                    <div key={label} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center ${available ? 'border-emerald-100 bg-emerald-50/60 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                      {label === 'Delivery' ? <Truck className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                      <span className="text-[10px] font-bold leading-tight sm:text-[11px]">{label}</span>
                      <span className="text-[9px] leading-tight sm:text-[10px]">{available ? 'Available' : 'Not available'}</span>
                    </div>
                  ))}
                </div>
              </section>

            </div>

            <aside className="order-1 lg:sticky lg:top-24 lg:order-1">
              <div className="relative z-10 rounded-[1.75rem] border border-[#e9e4d8] bg-white/90 p-3 shadow-[0_18px_55px_-30px_rgba(38,55,37,0.35)] sm:p-4">
                <div className="relative" onMouseLeave={() => setZoomPosition(null)}>
                  <div
                    className="relative aspect-[3/2] overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-[#edf2ea] to-[#f6f3ed]"
                    onMouseEnter={() => setZoomPosition({ x: 50, y: 50 })}
                    onMouseMove={(event) => {
                      const bounds = event.currentTarget.getBoundingClientRect();
                      setZoomPosition({
                        x: ((event.clientX - bounds.left) / bounds.width) * 100,
                        y: ((event.clientY - bounds.top) / bounds.height) * 100,
                      });
                    }}
                  >
                    {images.length ? (
                      <img src={imageUrl(images[activeImage] || images[0])} alt={food.food_name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#1a3c36]/40"><UtensilsCrossed className="h-16 w-16" /></div>
                    )}
                    {hasDiscount && <span className="absolute left-4 top-5 -rotate-6 rounded-md bg-orange-600 px-3.5 py-2 text-xs font-black text-white shadow-md">{food.discount}% OFF</span>}
                    {toggleWishlist && (
                      <button type="button" onClick={() => toggleWishlist(food)} aria-label={isInWishlist ? 'Remove from favorites' : 'Add to favorites'} className={`absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-lg transition hover:scale-105 ${isInWishlist ? 'text-rose-600' : 'text-slate-500 hover:text-rose-600'}`}>
                        <Heart className={`h-5 w-5 ${isInWishlist ? 'fill-rose-600' : ''}`} />
                      </button>
                    )}
                    {images.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveImage((current) => (current - 1 + images.length) % images.length)}
                          aria-label="View previous food image"
                          className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/95 text-slate-800 shadow-lg transition hover:scale-105 hover:bg-white"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveImage((current) => (current + 1) % images.length)}
                          aria-label="View next food image"
                          className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/95 text-slate-800 shadow-lg transition hover:scale-105 hover:bg-white"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-[11px] font-bold text-slate-800 shadow-md backdrop-blur">
                      <span className={`h-2 w-2 rounded-full ${String(food.food_type || '').toLowerCase() === 'veg' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                      {String(food.food_type || 'Food')}
                    </span>
                  </div>
                  {zoomPosition && images.length > 0 && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-auto absolute left-[calc(100%+1rem)] top-0 z-30 hidden aspect-[4/3] w-[min(40vw,560px)] rounded-2xl border border-white/80 bg-white shadow-2xl lg:block"
                      style={{
                        backgroundImage: `url("${imageUrl(images[activeImage] || images[0])}")`,
                        backgroundSize: '250% 250%',
                        backgroundPosition: `${Math.max(0, Math.min(100, (zoomPosition.x * 2.5 - 50) / 1.5))}% ${Math.max(0, Math.min(100, (zoomPosition.y * 2.5 - 50) / 1.5))}%`,
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                  )}
                </div>
                {images.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto px-0.5 pb-1 scrollbar-hide sm:gap-3">
                    {images.map((image, index) => (
                      <button key={`${image}-${index}`} type="button" onClick={() => setActiveImage(index)} aria-label={`View image ${index + 1}`} aria-pressed={activeImage === index} className={`h-[4.25rem] w-[5.25rem] shrink-0 overflow-hidden rounded-xl border-2 transition sm:h-[4.5rem] sm:w-[5.5rem] ${activeImage === index ? 'border-orange-600 shadow-sm' : 'border-transparent opacity-75 hover:opacity-100'}`}>
                        <img src={imageUrl(image)} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                <p className="px-1 pb-1 pt-3 text-center text-[11px] font-medium tracking-wide text-slate-500">Freshly prepared, just for you</p>
              </div>
            </aside>

          <section className="order-3 mt-0 overflow-hidden rounded-[1.75rem] border border-[#e9e4d8] bg-white/90 shadow-[0_18px_55px_-36px_rgba(38,55,37,0.35)] lg:col-start-2">
            <div className="border-b border-[#eee9de] bg-gradient-to-r from-white to-[#faf8f1] p-3 sm:px-5 sm:py-4">
              <div role="tablist" aria-label="Food information" className="flex gap-2 overflow-x-auto scrollbar-hide">
                {detailTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`food-tab-${tab.id}`}
                    aria-selected={activeDetailsTab === tab.id}
                    aria-controls={`food-panel-${tab.id}`}
                    onClick={() => setActiveDetailsTab(tab.id)}
                    className={`min-w-fit flex-1 rounded-xl px-4 py-3 text-xs font-bold transition sm:text-sm ${activeDetailsTab === tab.id ? 'bg-gradient-to-r from-[#10482f] to-[#075b39] text-white shadow-md' : 'text-slate-600 hover:bg-[#f3f5ee] hover:text-[#174a32]'}`}
                  >
                    {tab.label}
                    {tab.id === 'add-ons' && <span className="ml-1.5 opacity-75">({addons.length})</span>}
                    {tab.id === 'customization' && <span className="ml-1.5 opacity-75">({customizations.length})</span>}
                  </button>
                ))}
              </div>
            </div>

            <div
              role="tabpanel"
              id={`food-panel-${activeDetailsTab}`}
              aria-labelledby={`food-tab-${activeDetailsTab}`}
              className="min-h-56 p-5 sm:p-7"
            >
              {activeDetailsTab === 'overview' && (
                <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(180px,0.72fr)]">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-700">Made fresh for you</p>
                    <h2 className="mt-2 font-serif text-2xl font-bold leading-tight text-[#17241e] sm:text-3xl">
                      A taste of <span className="font-dancing text-3xl font-bold text-orange-600 sm:text-4xl">tradition</span>
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                      {food.description || `Our ${food.food_name} is prepared fresh to order with care, bringing together delicious ingredients and satisfying flavor in every serving.`}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {[
                        ['Freshly prepared', BadgeCheck],
                        [food.portion_size || 'Made to order', UtensilsCrossed],
                        ...(Number(food.preparation_time) > 0 ? [[`Ready in ${food.preparation_time} min`, Clock3]] : []),
                      ].map(([label, Icon]) => (
                        <span key={label} className="inline-flex items-center gap-2 rounded-full border border-[#e7eee2] bg-[#f7faf4] px-3 py-2 text-[11px] font-semibold text-[#31543e]">
                          <Icon className="h-4 w-4 text-emerald-700" />{label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="relative flex min-h-48 flex-col justify-between overflow-hidden rounded-2xl border border-[#e8ecdf] bg-gradient-to-br from-[#f1f6e9] via-[#fffaf0] to-[#fbe8d5] p-5 sm:p-6">
                    <span className="absolute -right-8 -top-10 h-36 w-36 rounded-full border-[22px] border-white/35" />
                    <span className="absolute -bottom-14 -left-8 h-40 w-40 rounded-full border-[24px] border-[#dce9d4]/50" />
                    <div className="relative z-10 flex items-start justify-between gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 shadow-sm">
                        <BadgeCheck className="h-4 w-4" /> Made fresh
                      </span>
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/85 text-orange-600 shadow-sm">
                        <UtensilsCrossed className="h-5 w-5" />
                      </span>
                    </div>
                    <div className="relative z-10 mt-7">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800">{food.cuisine_name || 'Restaurant favorite'}</p>
                      <p className="mt-1 font-serif text-xl font-bold text-[#17241e]">{food.food_name}</p>
                      <p className="mt-2 max-w-xs text-xs leading-5 text-slate-600">Thoughtfully prepared with fresh ingredients and served with care.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailsTab === 'food-details' && (
                <div>
                  <div className="mb-5">
                    <h2 className="font-serif text-2xl font-bold text-[#17241e]">Food details</h2>
                    <p className="mt-1 text-sm text-slate-500">Serving, preparation, and ordering information.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      ['Food ID', food.food_id || food.id],
                      ['Cuisine', food.cuisine_name],
                      ['Category', food.category_name],
                      ['Subcategory', food.subcategory_name],
                      ['Serving size', food.serving_size],
                      ['Portion', food.portion_size],
                      ['Preparation time', Number(food.preparation_time) > 0 ? `${food.preparation_time} minutes` : 'Not specified'],
                      ['Available time', food.available_time],
                      ['Menu status', String(food.status || 'Active')],
                    ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '').map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-[#eee9de] bg-[#fffefa] px-4 py-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">{label}</p>
                        <p className="mt-1.5 break-words text-sm font-semibold text-[#26362e]">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeDetailsTab === 'add-ons' && (
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#17241e]">Add something extra</h2>
                  <p className="mt-1 text-sm text-slate-500">Optional extras available with this dish.</p>
                  <ul className="mt-5 divide-y divide-[#eee9de]">
                    {addons.map((addon, index) => {
                      const available = String(addon.status || 'Active').toLowerCase() === 'active';
                      return (
                        <li key={`${addon.addon_name || addon.name}-${index}`} className="flex items-center justify-between gap-4 py-4">
                          <span className={`text-sm font-semibold ${available ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{addon.addon_name || addon.name}</span>
                          <span className="shrink-0 rounded-lg bg-[#f2f6ec] px-3 py-1.5 text-sm font-bold text-[#174a32]">{Number(addon.price) > 0 ? `+₹${Number(addon.price).toFixed(2)}` : 'Included'}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {activeDetailsTab === 'customization' && (
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#17241e]">Make it your own</h2>
                  <p className="mt-1 text-sm text-slate-500">Choose the options that suit your taste when you add this dish to your cart.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {customizations.map((group, index) => (
                      <div key={`${group.name}-${index}`} className="rounded-2xl border border-[#eee9de] bg-[#fffefa] p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-800">{group.name}</h3>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                            {group.selection_type === 'Multiple' ? 'Choose any' : 'Choose one'}
                          </span>
                          {group.required && <span className="text-[10px] font-bold text-rose-600">Required</span>}
                        </div>
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {(group.options || []).map((option, optionIndex) => (
                            <li key={`${option.name}-${optionIndex}`} className="rounded-lg border border-[#e8eee5] bg-[#f8faf7] px-3 py-2 text-xs text-slate-700">
                              {option.name}
                              {Number(option.price) > 0 && <span className="ml-1 font-bold text-[#1a3c36]">+₹{Number(option.price).toFixed(2)}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeDetailsTab === 'reviews' && Number(food.rating) > 0 && (
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="flex h-28 w-36 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#fff5df]">
                    <span className="font-serif text-4xl font-bold text-[#174a32]">{Number(food.rating).toFixed(1)}</span>
                    <span className="mt-1 flex text-amber-500" aria-label={`${Number(food.rating).toFixed(1)} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-3.5 w-3.5 ${Number(food.rating) >= star ? 'fill-current' : 'text-amber-200'}`} />)}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-[#17241e]">Customer rating</h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">This is the current overall rating recorded for {food.food_name}.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
          </div>

          <div className="mt-10 space-y-10">
            {relatedFoodsError && (
              <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {relatedFoodsError}
              </p>
            )}
            {relatedFoodsLoading && (
              <div className="space-y-4" aria-label="Loading related dishes">
                <div className="h-7 w-56 animate-pulse rounded-lg bg-slate-200" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[1, 2, 3, 4].map((item) => <div key={item} className="aspect-[4/3] animate-pulse rounded-3xl bg-slate-100" />)}
                </div>
              </div>
            )}
            {!relatedFoodsLoading && !relatedFoodsError && cuisineRelatedFoods.length > 0 && (
              <section aria-labelledby="related-cuisine-heading">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-700">Explore the cuisine</p>
                    <h2 id="related-cuisine-heading" className="mt-1 font-serif text-2xl font-bold text-[#17241e] sm:text-3xl">
                      More from {food.cuisine_name}
                    </h2>
                  </div>
                  <Sparkles className="mb-1 h-5 w-5 shrink-0 text-orange-500" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {cuisineRelatedFoods.map((relatedFood) => (
                    <FoodProductCard
                      key={`cuisine-${relatedFood.food_id || relatedFood.id}`}
                      food={relatedFood}
                      onSelect={() => navigate(`/food/${encodeURIComponent(relatedFood.food_id || relatedFood.id)}`, { state: { food: relatedFood } })}
                      onImageClick={() => navigate(`/food/${encodeURIComponent(relatedFood.food_id || relatedFood.id)}`, { state: { food: relatedFood } })}
                      onAdd={() => setRelatedFoodToCustomize(relatedFood)}
                      isInWishlist={wishlist.some((item) => String(item.food_id || item.id || item.product_id || item._id) === String(relatedFood.food_id || relatedFood.id))}
                      onToggleWishlist={toggleWishlist}
                    />
                  ))}
                </div>
              </section>
            )}
            {!relatedFoodsLoading && !relatedFoodsError && categoryRelatedFoods.length > 0 && (
              <section aria-labelledby="related-category-heading">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-700">More to enjoy</p>
                    <h2 id="related-category-heading" className="mt-1 font-serif text-2xl font-bold text-[#17241e] sm:text-3xl">
                      More {food.category_name} dishes
                    </h2>
                  </div>
                  <UtensilsCrossed className="mb-1 h-5 w-5 shrink-0 text-orange-500" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {categoryRelatedFoods.map((relatedFood) => (
                    <FoodProductCard
                      key={`category-${relatedFood.food_id || relatedFood.id}`}
                      food={relatedFood}
                      onSelect={() => navigate(`/food/${encodeURIComponent(relatedFood.food_id || relatedFood.id)}`, { state: { food: relatedFood } })}
                      onImageClick={() => navigate(`/food/${encodeURIComponent(relatedFood.food_id || relatedFood.id)}`, { state: { food: relatedFood } })}
                      onAdd={() => setRelatedFoodToCustomize(relatedFood)}
                      isInWishlist={wishlist.some((item) => String(item.food_id || item.id || item.product_id || item._id) === String(relatedFood.food_id || relatedFood.id))}
                      onToggleWishlist={toggleWishlist}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </PageContainer>
      </main>
      {customizing && (
        <FoodCustomizationModal
          key={food.food_id || food.id}
          food={food}
          initialQuantity={quantity}
          onClose={() => setCustomizing(false)}
          onAdd={addSelectedFoodToCart}
        />
      )}
      {relatedFoodToCustomize && (
        <FoodCustomizationModal
          key={`related-${relatedFoodToCustomize.food_id || relatedFoodToCustomize.id}`}
          food={relatedFoodToCustomize}
          onClose={() => setRelatedFoodToCustomize(null)}
          onAdd={addRelatedFoodToCart}
        />
      )}
    </>
  );
}

export default FoodDetailsPage;
