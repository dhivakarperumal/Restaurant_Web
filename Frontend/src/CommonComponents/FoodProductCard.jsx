import { Clock, Flame, Heart, Plus, Star, UtensilsCrossed } from 'lucide-react';
import { BACKEND_BASE_URL } from '../api';

const resolveImageUrl = (image) => {
  if (!image || typeof image !== 'string') return '';
  if (/^https?:\/\//i.test(image) || image.startsWith('data:')) return image;
  return `${BACKEND_BASE_URL}${image.startsWith('/') ? image : `/${image}`}`;
};

function FoodProductCard({
  food,
  onSelect,
  onAdd,
  cartQuantity = 0,
  isInWishlist = false,
  onToggleWishlist,
  className = '',
}) {
  const isVeg = String(food.food_type || '').toLowerCase() === 'veg';
  const mrp = Number(food.mrp || 0);
  const price = Number(food.final_price || food.mrp || 0);
  const discount = Number(food.discount || 0);
  const isAvailable = food.is_available !== false
    && String(food.status || 'Active').toLowerCase() === 'active';
  const hasOptions = (food.addons || []).some(
    (addon) => String(addon.status || 'Active').toLowerCase() === 'active',
  ) || (food.customizations || []).length > 0;
  const image = resolveImageUrl(food.food_images?.[0]);

  return (
    <article className={`group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl ${className}`}>
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <button
          type="button"
          onClick={onSelect}
          aria-label={`View ${food.food_name}`}
          className="absolute inset-0 z-0 h-full w-full"
        >
          {image ? (
            <img
              src={image}
              alt={food.food_name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-emerald-50 text-[#1a3c36]/40">
              <UtensilsCrossed className="h-10 w-10" />
            </span>
          )}
        </button>

        <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-1.5">
          <span
            title={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
            className={`flex h-5 w-5 items-center justify-center rounded-md border-2 bg-white shadow-sm ${isVeg ? 'border-emerald-600' : 'border-rose-600'}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
          </span>
          {food.is_spicy && (
            <span className="flex h-5 items-center gap-0.5 rounded-md bg-amber-500/90 px-1.5 text-[10px] font-bold text-white shadow-sm">
              <Flame className="h-3 w-3" /> Spicy
            </span>
          )}
        </div>

        {onToggleWishlist && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleWishlist(food);
            }}
            aria-label={isInWishlist ? 'Remove from favorites' : 'Add to favorites'}
            className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-md transition hover:scale-110 ${isInWishlist ? 'text-rose-600' : 'text-slate-400 hover:text-rose-600'}`}
          >
            <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-rose-600' : ''}`} />
          </button>
        )}

        {discount > 0 && mrp > price && (
          <span className="absolute bottom-3 left-3 z-10 rounded-lg bg-[#d4a843] px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow">
            {discount}% off
          </span>
        )}
        {Number(food.preparation_time) > 0 && (
          <span className="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-lg bg-black/65 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
            <Clock className="h-3 w-3 text-[#d4a843]" /> {food.preparation_time}m
          </span>
        )}
        {!isAvailable && (
          <span className="absolute inset-0 z-10 flex items-center justify-center bg-black/55">
            <span className="rounded-xl bg-rose-600/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
              Unavailable
            </span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-400">
            <span className="truncate">{food.category_name || 'Specialty'}</span>
            {Number(food.rating) > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1 font-bold text-amber-600">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {Number(food.rating).toFixed(1)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onSelect}
            className="block max-w-full truncate text-left font-serif text-base font-bold text-slate-900 transition hover:text-[#1a3c36]"
          >
            {food.food_name}
          </button>
          <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-relaxed text-slate-500">
            {food.description || `${food.portion_size || 'Full'} portion prepared fresh.`}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif text-lg font-black text-[#1a3c36]">₹{price.toFixed(2)}</span>
              {discount > 0 && mrp > price && (
                <span className="text-xs text-slate-400 line-through">₹{mrp.toFixed(2)}</span>
              )}
            </div>
            {food.portion_size && <p className="text-[10px] font-medium text-slate-400">{food.portion_size}</p>}
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAdd(food);
            }}
            disabled={!isAvailable}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#1a3c36] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#245048] active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            {isAvailable && <Plus className="h-3.5 w-3.5 text-emerald-300" />}
            {isAvailable ? (hasOptions ? 'Customize' : cartQuantity > 0 ? `Add (${cartQuantity})` : 'Add') : 'Unavailable'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default FoodProductCard;
