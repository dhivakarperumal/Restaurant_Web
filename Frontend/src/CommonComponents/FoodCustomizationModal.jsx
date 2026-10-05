import { useEffect, useMemo, useState } from 'react';
import { Clock, Flame, Minus, Plus, ShoppingCart, Star, Utensils, UtensilsCrossed, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { BACKEND_BASE_URL } from '../api';

const imageUrl = (image) => {
  if (!image || typeof image !== 'string') return '';
  if (/^https?:\/\//i.test(image) || image.startsWith('data:')) return image;
  return `${BACKEND_BASE_URL}${image.startsWith('/') ? image : `/${image}`}`;
};

function FoodCustomizationModal({ food, onClose, onAdd }) {
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [customizations, setCustomizations] = useState(() => {
    const initial = {};
    (food.customizations || []).forEach((group) => {
      initial[group.name] = group.selection_type === 'Multiple'
        ? []
        : group.options?.[0]?.name || '';
    });
    return initial;
  });
  const [customAddonRequests, setCustomAddonRequests] = useState('');
  const [customizationRequest, setCustomizationRequest] = useState('');

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const unitPrice = useMemo(() => {
    const addonPrice = selectedAddons.reduce((total, name) => {
      const addon = (food.addons || []).find((item) => item.addon_name === name);
      return total + Number(addon?.price || 0);
    }, 0);
    const customizationPrice = Object.entries(customizations).reduce((total, [groupName, selection]) => {
      const group = (food.customizations || []).find((item) => item.name === groupName);
      const names = Array.isArray(selection) ? selection : selection ? [selection] : [];
      return total + names.reduce((subtotal, name) => {
        const option = (group?.options || []).find((item) => item.name === name);
        return subtotal + Number(option?.price || 0);
      }, 0);
    }, 0);
    return Number((Number(food.final_price || food.mrp || 0) + addonPrice + customizationPrice).toFixed(2));
  }, [customizations, food, selectedAddons]);

  const toggleAddon = (name, checked) => {
    setSelectedAddons((current) => checked
      ? [...current, name]
      : current.filter((item) => item !== name));
  };

  const submit = async () => {
    const requestedAddons = customAddonRequests.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
    if (requestedAddons.length > 50 || requestedAddons.some((name) => name.length > 150)) {
      toast.error('Enter up to 50 add-on requests, with no more than 150 characters each.');
      return;
    }
    if (customizationRequest.trim().length > 500) {
      toast.error('Customization requests must be 500 characters or fewer.');
      return;
    }
    const missingRequired = (food.customizations || []).find((group) => {
      if (!group.required) return false;
      const selected = customizations[group.name];
      return !selected || (Array.isArray(selected) && selected.length === 0);
    });
    if (missingRequired) {
      toast.error(`Choose an option for ${missingRequired.name}.`);
      return;
    }

    const addonNames = [...new Set([
      ...selectedAddons,
      ...requestedAddons.map((name) => `Custom request: ${name}`),
    ])];
    const selectedCustomizationValues = { ...customizations };
    if (customizationRequest.trim()) selectedCustomizationValues.__custom_request__ = customizationRequest.trim();
    const result = await onAdd({
      quantity,
      selectedAddons: addonNames,
      selectedCustomizations: selectedCustomizationValues,
      unitPrice,
    });
    if (result !== false) onClose();
  };

  const images = Array.isArray(food.food_images) ? food.food_images : [];
  const activeAddons = (food.addons || []).filter(
    (addon) => String(addon.status || 'Active').toLowerCase() === 'active',
  );
  const basePrice = Number(food.final_price || food.mrp || 0);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="food-customization-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl"
      >
        <div className="relative h-48 shrink-0 bg-slate-100 sm:h-60">
          {images.length ? (
            <img src={imageUrl(images[imageIndex] || images[0])} alt={food.food_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-emerald-50 text-[#1a3c36]">
              <UtensilsCrossed className="h-12 w-12" />
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close food popup"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X className="h-5 w-5" />
          </button>
          {images.length > 1 && (
            <div className="absolute bottom-3 left-3 flex gap-1.5 rounded-xl bg-black/40 p-1">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setImageIndex(index)}
                  aria-label={`View food image ${index + 1}`}
                  className={`h-10 w-10 overflow-hidden rounded-lg border-2 ${imageIndex === index ? 'border-[#d4a843]' : 'border-transparent opacity-70'}`}
                >
                  <img src={imageUrl(image)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`h-4 w-4 rounded-sm border-2 ${String(food.food_type).toLowerCase() === 'veg' ? 'border-emerald-600' : 'border-rose-600'}`}>
                <span className={`m-auto mt-0.5 block h-1.5 w-1.5 rounded-full ${String(food.food_type).toLowerCase() === 'veg' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
              </span>
              {food.category_name && <span className="rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-800">{food.category_name}</span>}
              {food.cuisine_name && <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-700">{food.cuisine_name}</span>}
              {food.is_spicy && <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 font-bold text-amber-800"><Flame className="h-3 w-3" /> Spicy</span>}
              {Number(food.rating) > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 font-bold text-amber-800"><Star className="h-3 w-3 fill-amber-400" /> {Number(food.rating).toFixed(1)}</span>}
            </div>
            <h2 id="food-customization-title" className="font-serif text-2xl font-bold text-slate-900">{food.food_name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {food.description || `Our ${food.food_name} is freshly prepared to order.`}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
              {Number(food.preparation_time) > 0 && <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {food.preparation_time} mins</span>}
              {food.portion_size && <span className="inline-flex items-center gap-1.5"><Utensils className="h-3.5 w-3.5" /> {food.portion_size}</span>}
              {food.serving_size && <span>{food.serving_size}</span>}
            </div>
          </div>

          {activeAddons.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Add-ons & extras</legend>
              {activeAddons.map((addon) => (
                <label key={addon.addon_name} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${selectedAddons.includes(addon.addon_name) ? 'border-emerald-600 bg-emerald-50/40' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-800">
                    <input type="checkbox" checked={selectedAddons.includes(addon.addon_name)} onChange={(event) => toggleAddon(addon.addon_name, event.target.checked)} className="h-4 w-4 accent-[#1a3c36]" />
                    {addon.addon_name}
                  </span>
                  <span className="text-xs font-bold text-[#1a3c36]">+₹{Number(addon.price || 0).toFixed(2)}</span>
                </label>
              ))}
            </fieldset>
          )}

          {(food.customizations || []).map((group) => (
            <fieldset key={group.name} className="space-y-2">
              <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                {group.name}{group.required && <span className="text-rose-500"> *</span>}
                <span className="ml-1 normal-case font-normal">({group.selection_type === 'Multiple' ? 'choose any' : 'choose one'})</span>
              </legend>
              {group.options?.map((option) => {
                const selection = customizations[group.name];
                const checked = Array.isArray(selection) ? selection.includes(option.name) : selection === option.name;
                return (
                  <label key={option.name} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 ${checked ? 'border-emerald-600 bg-emerald-50/40' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <span className="flex items-center gap-2.5 text-sm font-semibold text-slate-800">
                      <input
                        type={group.selection_type === 'Multiple' ? 'checkbox' : 'radio'}
                        name={`food-custom-${group.name}`}
                        checked={checked}
                        onChange={(event) => setCustomizations((current) => {
                          if (group.selection_type !== 'Multiple') return { ...current, [group.name]: option.name };
                          const selected = current[group.name] || [];
                          return { ...current, [group.name]: event.target.checked ? [...selected, option.name] : selected.filter((name) => name !== option.name) };
                        })}
                        className="h-4 w-4 accent-[#1a3c36]"
                      />
                      {option.name}
                    </span>
                    {Number(option.price || 0) > 0 && <span className="text-xs font-bold text-[#1a3c36]">+₹{Number(option.price).toFixed(2)}</span>}
                  </label>
                );
              })}
            </fieldset>
          ))}

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Additional add-ons (optional)
              <textarea value={customAddonRequests} onChange={(event) => setCustomAddonRequests(event.target.value.slice(0, 500))} maxLength={500} rows={2} placeholder="Enter extra add-ons, one per line (e.g. Extra sauce)" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-normal text-slate-800 outline-none focus:border-emerald-600" />
              <span className="mt-1 block text-right text-[10px] font-normal text-slate-400">Typed requests do not change the price.</span>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Additional customization (optional)
              <textarea value={customizationRequest} onChange={(event) => setCustomizationRequest(event.target.value.slice(0, 500))} maxLength={500} rows={2} placeholder="e.g. Less oil, extra spicy, no onions" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-normal text-slate-800 outline-none focus:border-emerald-600" />
            </label>
          </div>
        </div>

        <footer className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/90 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Qty</span>
            <div className="flex items-center rounded-xl border border-slate-200 bg-white">
              <button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} aria-label="Decrease quantity" className="rounded-l-xl p-2 text-slate-600 hover:bg-slate-100"><Minus className="h-3.5 w-3.5" /></button>
              <span className="min-w-8 text-center text-xs font-bold">{quantity}</span>
              <button type="button" onClick={() => setQuantity((current) => current + 1)} aria-label="Increase quantity" className="rounded-r-xl p-2 text-slate-600 hover:bg-slate-100"><Plus className="h-3.5 w-3.5" /></button>
            </div>
            <span className="text-xs text-slate-500">₹{basePrice.toFixed(2)} each</span>
          </div>
          <button type="button" onClick={submit} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1a3c36] to-[#25524a] px-5 py-3 text-xs font-bold text-white shadow-md transition hover:from-[#142f2a] hover:to-[#1e453e]">
            <ShoppingCart className="h-4 w-4 text-[#d4a843]" />
            Add to Cart · ₹{(unitPrice * quantity).toFixed(2)}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default FoodCustomizationModal;
