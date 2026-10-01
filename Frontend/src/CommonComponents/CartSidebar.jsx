import { useContext } from 'react';
import { Minus, Plus, ShoppingCart, X } from 'lucide-react';
import { StoreContext } from '../PrivateRouter/StoreContext';

const itemName = (item) => item.product_name || item.name || item.title || 'Restaurant item';
const itemImage = (item) => item.product_image || item.image || item.thumbnail_image || item.product_images?.[0] || '';

function CartSidebar() {
  const store = useContext(StoreContext) || {};
  const { cart = [], isCartOpen, closeCart, removeFromCart, updateCartQuantity } = store;
  const total = cart.reduce((sum, item) => sum + Number(item.total_price || Number(item.price || 0) * Number(item.quantity || 1)), 0);

  return (
    <aside className={`fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`} aria-hidden={!isCartOpen}>
      <div className="flex items-center justify-between border-b border-[#eadfd2] px-5 py-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[#263830]"><ShoppingCart size={19} /> Your cart</h2>
        <button type="button" onClick={closeCart} aria-label="Close cart" className="rounded-full p-2 text-[#68766e] hover:bg-[#f4f0e9]"><X size={19} /></button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {cart.length === 0 ? <p className="py-10 text-center text-sm text-[#68766e]">Your cart is empty.</p> : cart.map((item) => (
          <div key={item.id || item.cart_id || item.product_id} className="flex gap-3 rounded-lg border border-[#eadfd2] p-3">
            {itemImage(item) && <img src={itemImage(item)} alt="" className="h-16 w-16 rounded object-cover" />}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-[#263830]">{itemName(item)}</p>
              <p className="mt-1 text-sm text-[#68766e]">₹{Number(item.price || 0).toFixed(2)}</p>
              <div className="mt-2 flex items-center gap-2">
                <button type="button" onClick={() => updateCartQuantity?.(item.id, Number(item.quantity || 1) - 1)} aria-label="Decrease quantity" className="rounded border p-1"><Minus size={13} /></button>
                <span className="min-w-5 text-center text-sm">{item.quantity || 1}</span>
                <button type="button" onClick={() => updateCartQuantity?.(item.id, Number(item.quantity || 1) + 1)} aria-label="Increase quantity" className="rounded border p-1"><Plus size={13} /></button>
                <button type="button" onClick={() => removeFromCart?.(item.id)} className="ml-auto text-xs text-[#a34f32]">Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-[#eadfd2] p-5"><div className="flex justify-between font-semibold text-[#263830]"><span>Total</span><span>₹{total.toFixed(2)}</span></div></div>
    </aside>
  );
}

export default CartSidebar;