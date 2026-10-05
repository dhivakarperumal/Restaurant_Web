import { useContext } from 'react';
import { Clock, Flame, Heart, ShoppingBag, Star, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BACKEND_BASE_URL } from '../api';
import { StoreContext } from '../PrivateRouter/StoreContext';

const resolveImage = (image) => {
  if (!image || typeof image !== 'string') return '';
  if (/^https?:\/\//i.test(image) || image.startsWith('data:')) return image;
  return `${BACKEND_BASE_URL}${image.startsWith('/') ? image : `/${image}`}`;
};

function FavoritesSidebar() {
  const store = useContext(StoreContext) || {};
  const {
    wishlist = [],
    loadingWishlist = false,
    isFavoritesOpen,
    closeFavorites,
    removeFromWishlist,
  } = store;

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform ${isFavoritesOpen ? 'translate-x-0' : 'translate-x-full'}`}
      aria-hidden={!isFavoritesOpen}
      aria-label="Favorites"
      inert={!isFavoritesOpen}
    >
      <div className="flex items-center justify-between border-b border-[#eadfd2] px-5 py-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[#263830]">
          <Heart size={19} /> Favorites
          <span className="rounded-full bg-[#f4f0e9] px-2 py-0.5 text-xs">{wishlist.length}</span>
        </h2>
        <button type="button" onClick={closeFavorites} aria-label="Close favorites" className="rounded-full p-2 text-[#68766e] hover:bg-[#f4f0e9]"><X size={19} /></button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {loadingWishlist && wishlist.length === 0 ? (
          <div className="space-y-3" aria-label="Loading favorites">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex animate-pulse gap-3 rounded-xl border border-[#eadfd2] p-3">
                <div className="h-16 w-16 rounded-lg bg-slate-200" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-3/4 rounded bg-slate-200" />
                  <div className="h-3 w-1/3 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : wishlist.length === 0 ? (
          <div className="py-12 text-center">
            <Heart className="mx-auto h-10 w-10 text-[#d9cbb8]" />
            <p className="mt-3 font-semibold text-[#263830]">No favorites yet</p>
            <p className="mt-1 text-sm text-[#68766e]">Save dishes you love and find them here.</p>
            <Link
              to="/shop"
              onClick={closeFavorites}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1a3c36] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#245048]"
            >
              <ShoppingBag size={16} /> Browse the menu
            </Link>
          </div>
        ) : wishlist.map((item) => {
          const foodId = item.food_id || item.product_id;
          const image = resolveImage(item.image || item.product_image);
          const name = item.food_name || item.item_name || item.product_name || item.name || 'Favorite food';
          const price = Number(item.final_price || item.price || item.mrp || 0);
          const isVeg = String(item.food_type || '').toLowerCase() === 'veg';

          return (
            <article key={item.id || foodId} className="flex gap-3 rounded-xl border border-[#eadfd2] bg-white p-3 shadow-sm">
              <Link
                to={`/shop?food=${encodeURIComponent(foodId)}`}
                onClick={closeFavorites}
                aria-label={`View ${name}`}
                className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#f4f0e9]"
              >
                {image ? (
                  <img src={image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-xs text-[#68766e]">Food</span>
                )}
              </Link>
              <div className="min-w-0 flex-1 py-0.5">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/shop?food=${encodeURIComponent(foodId)}`}
                    onClick={closeFavorites}
                    className="line-clamp-2 text-sm font-semibold text-[#263830] hover:text-[#a34f32]"
                  >
                    {name}
                  </Link>
                  <span
                    title={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${isVeg ? 'border-emerald-600' : 'border-rose-600'}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#68766e]">
                  {item.category_name && <span>{item.category_name}</span>}
                  {item.cuisine_name && <span>{item.cuisine_name}</span>}
                  {item.portion_size && <span>{item.portion_size}</span>}
                  {Number(item.preparation_time) > 0 && <span className="inline-flex items-center gap-1"><Clock size={12} /> {item.preparation_time} min</span>}
                  {item.is_spicy && <span className="inline-flex items-center gap-1 text-amber-700"><Flame size={12} /> Spicy</span>}
                  {Number(item.rating) > 0 && <span className="inline-flex items-center gap-1 text-amber-700"><Star size={12} className="fill-amber-400" /> {Number(item.rating).toFixed(1)}</span>}
                </div>
                {item.description && <p className="mt-1 line-clamp-2 text-xs text-[#68766e]">{item.description}</p>}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#1a3c36]">₹{price.toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => removeFromWishlist?.(foodId)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-[#a34f32] hover:bg-rose-50"
                    aria-label={`Remove ${name} from favorites`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}

export default FavoritesSidebar;