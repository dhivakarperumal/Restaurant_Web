import { useContext } from 'react';
import { Minus, Plus, ShoppingCart, Trash2, UtensilsCrossed, X } from 'lucide-react';
import { StoreContext } from '../PrivateRouter/StoreContext';
import { BACKEND_BASE_URL } from '../api';

const resolveImageUrl = (img) => {
  if (!img || typeof img !== 'string') return '';
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) {
    return img;
  }
  const cleanPath = img.startsWith('/') ? img : `/${img}`;
  return `${BACKEND_BASE_URL}${cleanPath}`;
};

const itemName = (item) => item.product_name || item.name || item.food_name || 'Restaurant item';
const itemImage = (item) => item.product_image || item.image || item.thumbnail_image || item.product_images?.[0] || '';

function CartSidebar() {
  const store = useContext(StoreContext) || {};
  const { cart = [], isCartOpen, closeCart, removeFromCart, updateCartQuantity, clearCart } = store;
  const total = cart.reduce((sum, item) => sum + Number(item.total_price || Number(item.price || 0) * Number(item.quantity || 1)), 0);
  const totalItemCount = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);

  return (
    <aside className={`fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`} aria-hidden={!isCartOpen}>
      <div className="flex items-center justify-between border-b border-[#eadfd2] bg-[#faf8f5] px-5 py-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#263830]">
          <ShoppingCart size={20} className="text-[#a34f32]" />
          Your Cart
          {totalItemCount > 0 && (
            <span className="rounded-full bg-[#a34f32] px-2 py-0.5 text-xs font-semibold text-white">
              {totalItemCount}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-[#8c7a6b] hover:text-[#a34f32] transition-colors font-medium px-2 py-1"
            >
              Clear
            </button>
          )}
          <button type="button" onClick={closeCart} aria-label="Close cart" className="rounded-full p-2 text-[#68766e] hover:bg-[#efe9df] transition-colors">
            <X size={19} />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {cart.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#faf5ee] text-[#b8a695]">
              <ShoppingCart size={28} />
            </div>
            <p className="text-base font-medium text-[#263830]">Your cart is empty</p>
            <p className="mt-1 text-xs text-[#8c7a6b]">Explore delicious food from our shop and add to cart.</p>
          </div>
        ) : (
          cart.map((item) => {
            const imgUrl = itemImage(item);
            return (
              <div key={item.id || item.cart_id || item.food_id} className="flex gap-3 rounded-xl border border-[#eadfd2] bg-[#fbf9f6] p-3 shadow-xs transition-all hover:border-[#dab98f]">
                {imgUrl ? (
                  <img
                    src={resolveImageUrl(imgUrl)}
                    alt={itemName(item)}
                    className="h-16 w-16 rounded-lg object-cover flex-shrink-0 border border-[#eadfd2]"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-[#efe9df] text-[#8c7a6b]">
                    <UtensilsCrossed size={20} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <p className="truncate font-semibold text-[#263830] text-sm">{itemName(item)}</p>
                    <button
                      type="button"
                      onClick={() => removeFromCart?.(item.id)}
                      aria-label="Remove item"
                      className="text-[#8c7a6b] hover:text-[#a34f32] transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {item.portion_size && item.portion_size !== 'Standard' && (
                    <span className="inline-block mt-0.5 text-[11px] font-medium text-[#7a482b] bg-[#f3e7dc] px-1.5 py-0.5 rounded">
                      Size: {item.portion_size}
                    </span>
                  )}

                  {Array.isArray(item.selected_addons) && item.selected_addons.length > 0 && (
                    <p className="mt-0.5 text-[11px] text-[#68766e] truncate">
                      + {item.selected_addons.join(', ')}
                    </p>
                  )}

                  {item.cooking_notes && (
                    <p className="mt-0.5 text-[11px] text-[#68766e] italic truncate">
                      Note: "{item.cooking_notes}"
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-sm font-bold text-[#263830]">
                      ₹{Number(item.total_price || Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
                      {Number(item.quantity || 1) > 1 && (
                        <span className="text-xs text-[#8c7a6b] font-normal ml-1">
                          (₹{Number(item.price || 0).toFixed(2)} each)
                        </span>
                      )}
                    </p>

                    <div className="flex items-center gap-1.5 rounded-lg border border-[#d6c7b2] bg-white px-1.5 py-0.5 shadow-xs">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity?.(item.id, Number(item.quantity || 1) - 1)}
                        aria-label="Decrease quantity"
                        className="rounded p-1 text-[#4a5568] hover:bg-[#f3ece3] transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="min-w-5 text-center text-xs font-semibold text-[#263830]">
                        {item.quantity || 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity?.(item.id, Number(item.quantity || 1) + 1)}
                        aria-label="Increase quantity"
                        className="rounded p-1 text-[#4a5568] hover:bg-[#f3ece3] transition-colors"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {cart.length > 0 && (
        <div className="border-t border-[#eadfd2] bg-[#faf8f5] p-5">
          <div className="flex justify-between items-center font-bold text-[#263830] text-base">
            <span>Total Amount</span>
            <span className="text-lg text-[#a34f32]">₹{total.toFixed(2)}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              closeCart();
            }}
            className="mt-4 w-full rounded-xl bg-[#263830] py-3 text-center text-sm font-bold text-white shadow-md hover:bg-[#1a2822] active:scale-[0.99] transition-all"
          >
            Checkout
          </button>
        </div>
      )}
    </aside>
  );
}

export default CartSidebar;