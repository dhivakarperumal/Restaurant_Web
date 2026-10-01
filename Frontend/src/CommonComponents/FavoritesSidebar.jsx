import { useContext } from 'react';
import { Heart, X } from 'lucide-react';
import { StoreContext } from '../PrivateRouter/StoreContext';

function FavoritesSidebar() {
  const store = useContext(StoreContext) || {};
  const { wishlist = [], isFavoritesOpen, closeFavorites, removeFromWishlist } = store;

  return (
    <aside className={`fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform ${isFavoritesOpen ? 'translate-x-0' : 'translate-x-full'}`} aria-hidden={!isFavoritesOpen}>
      <div className="flex items-center justify-between border-b border-[#eadfd2] px-5 py-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[#263830]"><Heart size={19} /> Favorites</h2>
        <button type="button" onClick={closeFavorites} aria-label="Close favorites" className="rounded-full p-2 text-[#68766e] hover:bg-[#f4f0e9]"><X size={19} /></button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {wishlist.length === 0 ? <p className="py-10 text-center text-sm text-[#68766e]">No favorite items yet.</p> : wishlist.map((item) => (
          <div key={item.id || item.product_id} className="flex items-center gap-3 rounded-lg border border-[#eadfd2] p-3">
            {(item.image || item.product_image) && <img src={item.image || item.product_image} alt="" className="h-14 w-14 rounded object-cover" />}
            <p className="min-w-0 flex-1 truncate font-semibold text-[#263830]">{item.item_name || item.product_name || item.name || 'Favorite item'}</p>
            <button type="button" onClick={() => removeFromWishlist?.(item.id || item.product_id)} className="text-xs text-[#a34f32]">Remove</button>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default FavoritesSidebar;