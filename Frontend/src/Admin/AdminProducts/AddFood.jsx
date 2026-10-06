import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, ImagePlus, Plus, Save, Trash2, Utensils, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';
import { useAuth } from '../../PrivateRouter/AuthContext';

const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const blankFood = (foodId = '', actor = '') => ({
  foodId,
  foodName: '',
  cuisineId: '',
  categoryId: '',
  subcategoryName: '',
  description: '',
  mrp: '',
  discount: '0',
  rating: '0',
  stockQuantity: '0',
  servingSize: '',
  portionSize: 'Full',
  preparationTime: '0',
  availableTime: '10:00 AM - 1:00 PM',
  foodType: 'Veg',
  isSpicy: false,
  isAvailable: true,
  diningAvailable: true,
  takeawayAvailable: true,
  deliveryAvailable: true,
  featured: false,
  status: 'Active',
  addons: [],
  customizations: [],
  createdBy: actor,
});

const SearchableSelect = ({ label, value, options, onChange, placeholder, error, disabled = false }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="relative">
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <input
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={open ? query : selected?.label || ''}
        disabled={disabled}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); onChange(''); }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'Enter' && open && filtered[0]) {
            event.preventDefault();
            onChange(filtered[0].value);
            setOpen(false);
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className={`h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 disabled:bg-gray-100 ${error ? 'border-red-500' : 'border-gray-300'}`}
      />
      {open && !disabled && (
        <ul role="listbox" className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {filtered.length ? filtered.map((option) => (
            <li key={option.value} role="option" aria-selected={option.value === value}>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(option.value); setQuery(''); setOpen(false); }} className={`w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 ${option.value === value ? 'bg-emerald-50 font-medium text-emerald-900' : 'text-gray-700'}`}>
                {option.label}
              </button>
            </li>
          )) : <li className="px-3 py-2 text-sm text-gray-500">No matches</li>}
        </ul>
      )}
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
};

const Section = ({ number, title, description, children, columns = 2 }) => (
  <section className="rounded-lg border border-gray-200 bg-white">
    <header className="border-b border-gray-100 px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-xs font-semibold text-emerald-900">{number}</span>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
        </div>
      </div>
    </header>
    <div className={`grid gap-4 p-4 sm:grid-cols-2 sm:p-5 ${columns === 3 ? 'lg:grid-cols-3' : ''}`}>{children}</div>
  </section>
);

const Toggle = ({ label, checked, onChange }) => (
  <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700">
    <span>{label}</span>
    <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span className="absolute inset-0 rounded-full bg-gray-300 transition peer-checked:bg-emerald-700 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-700 peer-focus-visible:ring-offset-2" />
      <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
    </span>
  </label>
);

const AddFood = ({ drawer = false, onClose, onSaved }) => {
  const navigate = useNavigate();
  const { foodId: editingFoodId } = useParams();
  const { profileName } = useAuth();
  const [form, setForm] = useState(() => blankFood('', profileName));
  const [cuisines, setCuisines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [pageError, setPageError] = useState('');
  const [draggedImageId, setDraggedImageId] = useState('');
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const closeForm = () => (onClose ? onClose() : navigate('/admin/products'));

  const selectedCategory = categories.find((category) => String(category.category_id || category.id) === form.categoryId);
  const subcategoryOptions = useMemo(() => {
    const values = selectedCategory?.sub_categories;
    if (Array.isArray(values)) return values;
    if (typeof values === 'string') {
      try { return JSON.parse(values); } catch { return []; }
    }
    return [];
  }, [selectedCategory]);
  const cuisineOptions = cuisines.map((cuisine) => ({ value: String(cuisine.cuisine_id || cuisine.id), label: cuisine.cuisine_name || cuisine.name || '' }));
  const categoryOptions = categories.map((category) => ({ value: String(category.category_id || category.id), label: category.category_name || category.name || '' }));
  const finalPrice = Math.max(0, Number((Number(form.mrp || 0) - (Number(form.mrp || 0) * Number(form.discount || 0) / 100)).toFixed(2)));

  useEffect(() => () => {
    imagesRef.current.forEach((image) => {
      if (image.preview?.startsWith('blob:')) URL.revokeObjectURL(image.preview);
    });
  }, []);

  useEffect(() => {
    if (!drawer) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape' && !saving && !uploading) closeForm();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [drawer, onClose, navigate, saving, uploading]);

  useEffect(() => {
    let mounted = true;
    const loadFormData = async () => {
      setLoading(true);
      const [cuisineResult, categoryResult, idResult] = await Promise.allSettled([
        api.get('/cuisines'),
        api.get('/categories'),
        editingFoodId ? Promise.resolve(null) : api.get('/foods/next-id'),
      ]);
      if (!mounted) return;
      const cuisineRows = cuisineResult.status === 'fulfilled' ? cuisineResult.value?.data?.data : [];
      const categoryRows = categoryResult.status === 'fulfilled' ? categoryResult.value?.data?.data : [];
      setCuisines(Array.isArray(cuisineRows) ? cuisineRows.filter((item) => item.status !== 'Inactive') : []);
      setCategories(Array.isArray(categoryRows) ? categoryRows.filter((item) => item.status !== 'Inactive') : []);
      const actor = profileName || 'Admin';

      if (editingFoodId) {
        try {
          const response = await api.get(`/foods/${editingFoodId}`);
          if (!mounted) return;
          const food = response?.data?.data;
          if (!food) throw new Error('Food not found.');
          setForm({
            ...blankFood(food.food_id, actor),
            foodName: food.food_name || '',
            cuisineId: String(food.cuisine_id || ''),
            categoryId: String(food.category_id || ''),
            subcategoryName: food.subcategory_name || '',
            description: food.description || '',
            mrp: String(food.mrp ?? ''),
            discount: String(food.discount ?? 0),
            rating: String(food.rating ?? 0),
            stockQuantity: String(food.stock_quantity ?? 0),
            servingSize: food.serving_size || '',
            portionSize: food.portion_size || 'Full',
            preparationTime: String(food.preparation_time ?? 0),
            availableTime: food.available_time || '10:00 AM - 1:00 PM',
            foodType: food.food_type || 'Veg',
            isSpicy: Boolean(food.is_spicy),
            isAvailable: Boolean(food.is_available),
            diningAvailable: Boolean(food.dining_available),
            takeawayAvailable: Boolean(food.takeaway_available),
            deliveryAvailable: Boolean(food.delivery_available),
            featured: Boolean(food.featured),
            status: food.status || 'Active',
            addons: Array.isArray(food.addons) ? food.addons.map((item) => ({ ...item, key: makeId(), name: item.addon_name || item.name })) : [],
            customizations: Array.isArray(food.customizations) ? food.customizations.map((group) => ({ ...group, key: makeId(), options: (group.options || []).map((option) => ({ ...option, key: makeId() })) })) : [],
            createdBy: food.created_by || actor,
          });
          setImages((food.food_images || []).map((url) => ({ id: makeId(), url, preview: url, name: url.split('/').pop() })));
        } catch (error) {
          setPageError(error?.response?.data?.message || error.message || 'Unable to load food details.');
        }
      } else if (idResult.status === 'fulfilled' && mounted) {
        setForm((current) => ({ ...current, foodId: idResult.value?.data?.data || '' }));
      } else if (!editingFoodId && mounted) {
        setPageError(idResult.reason?.response?.data?.message || 'Unable to generate the food ID.');
      }
      if (!mounted) return;
      if (cuisineResult.status === 'rejected' || categoryResult.status === 'rejected') {
        setPageError('Could not load cuisines or categories. Check the API and try again.');
      }
      setLoading(false);
    };
    loadFormData();
    return () => { mounted = false; };
  }, [editingFoodId, profileName]);

  const setValue = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const addImageFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const accepted = files.filter((file) => allowedTypes.includes(file.type) && file.size <= 5 * 1024 * 1024);
    if (accepted.length !== files.length) setPageError('Images must be JPG, PNG, or WEBP and no larger than 5 MB each.');
    if (!accepted.length) return;

    setPageError('');
    setUploading(true);
    const pending = accepted.map((file) => ({ id: makeId(), file, name: file.name, preview: URL.createObjectURL(file), url: '', uploading: true }));
    setImages((current) => [...current, ...pending]);
    for (const image of pending) {
      const data = new FormData();
      data.append('folder', 'foods');
      data.append('file', image.file);
      try {
        const response = await api.post('/upload', data);
        const url = response?.data?.url;
        if (!url) throw new Error('Upload returned no image URL.');
        setImages((current) => current.map((item) => item.id === image.id ? { ...item, url, uploading: false } : item));
      } catch (error) {
        setImages((current) => current.filter((item) => item.id !== image.id));
        URL.revokeObjectURL(image.preview);
        setPageError(error?.response?.data?.message || `Could not upload ${image.name}.`);
      }
    }
    setUploading(false);
  };

  const removeImage = (imageId) => {
    setImages((current) => {
      const image = current.find((item) => item.id === imageId);
      if (image?.preview?.startsWith('blob:')) URL.revokeObjectURL(image.preview);
      return current.filter((item) => item.id !== imageId);
    });
  };

  const moveImage = (sourceId, targetId) => {
    setImages((current) => {
      const sourceIndex = current.findIndex((image) => image.id === sourceId);
      const targetIndex = current.findIndex((image) => image.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;
      const next = [...current];
      const [image] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, image);
      return next;
    });
  };

  const addAddon = () => setForm((current) => ({ ...current, addons: [...current.addons, { key: makeId(), name: '', price: '', status: 'Active' }] }));
  const updateAddon = (key, field, value) => setForm((current) => ({ ...current, addons: current.addons.map((item) => item.key === key ? { ...item, [field]: value } : item) }));
  const removeAddon = (key) => setForm((current) => ({ ...current, addons: current.addons.filter((item) => item.key !== key) }));

  const addCustomization = () => setForm((current) => ({
    ...current,
    customizations: [...current.customizations, { key: makeId(), name: '', selectionType: 'Single', required: false, options: [{ key: makeId(), name: '', price: '0' }] }],
  }));
  const updateCustomization = (key, field, value) => setForm((current) => ({ ...current, customizations: current.customizations.map((group) => group.key === key ? { ...group, [field]: value } : group) }));
  const removeCustomization = (key) => setForm((current) => ({ ...current, customizations: current.customizations.filter((group) => group.key !== key) }));
  const addCustomizationOption = (groupKey) => setForm((current) => ({
    ...current,
    customizations: current.customizations.map((group) => group.key === groupKey ? { ...group, options: [...group.options, { key: makeId(), name: '', price: '0' }] } : group),
  }));
  const updateCustomizationOption = (groupKey, optionKey, field, value) => setForm((current) => ({
    ...current,
    customizations: current.customizations.map((group) => group.key === groupKey ? {
      ...group,
      options: group.options.map((option) => option.key === optionKey ? { ...option, [field]: value } : option),
    } : group),
  }));
  const removeCustomizationOption = (groupKey, optionKey) => setForm((current) => ({
    ...current,
    customizations: current.customizations.map((group) => group.key === groupKey ? { ...group, options: group.options.filter((option) => option.key !== optionKey) } : group),
  }));

  const validate = () => {
    const nextErrors = {};
    if (!form.foodName.trim()) nextErrors.foodName = 'Food name is required.';
    if (!form.cuisineId) nextErrors.cuisineId = 'Choose a cuisine.';
    if (!form.categoryId) nextErrors.categoryId = 'Choose a category.';
    if (!form.subcategoryName) nextErrors.subcategoryName = 'Choose a subcategory.';
    if (form.mrp === '' || !Number.isFinite(Number(form.mrp)) || Number(form.mrp) < 0) nextErrors.mrp = 'Enter a valid non-negative MRP.';
    if (!Number.isFinite(Number(form.discount)) || Number(form.discount) < 0 || Number(form.discount) > 100) nextErrors.discount = 'Discount must be between 0 and 100.';
    if (Number(form.preparationTime) < 0) nextErrors.preparationTime = 'Preparation time cannot be negative.';
    form.addons.forEach((addon, index) => {
      if (!addon.name.trim()) nextErrors[`addon-${index}`] = 'Enter an add-on name or remove this row.';
      if (addon.price === '' || Number(addon.price) < 0) nextErrors[`addon-price-${index}`] = 'Enter a non-negative add-on price.';
    });
    form.customizations.forEach((group, groupIndex) => {
      if (!group.name.trim()) nextErrors[`customization-${groupIndex}`] = 'Enter a customization name.';
      if (!group.options.length) nextErrors[`customization-options-${groupIndex}`] = 'Add at least one option.';
      group.options.forEach((option, optionIndex) => {
        if (!option.name.trim()) nextErrors[`option-${groupIndex}-${optionIndex}`] = 'Enter an option name.';
        if (option.price === '' || Number(option.price) < 0) nextErrors[`option-price-${groupIndex}-${optionIndex}`] = 'Option price cannot be negative.';
      });
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleReset = () => {
    images.forEach((image) => { if (image.preview?.startsWith('blob:')) URL.revokeObjectURL(image.preview); });
    setImages([]);
    setErrors({});
    setPageError('');
    setForm(blankFood(form.foodId, profileName || 'Admin'));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setPageError('');
    if (!validate()) {
      setPageError('Review the highlighted fields before saving.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (uploading || images.some((image) => !image.url)) {
      setPageError('Wait for all food images to finish uploading.');
      return;
    }

    setSaving(true);
    const cuisine = cuisines.find((item) => String(item.cuisine_id || item.id) === form.cuisineId);
    const category = categories.find((item) => String(item.category_id || item.id) === form.categoryId);
    const payload = {
      food_id: form.foodId,
      food_name: form.foodName.trim(),
      cuisine_id: form.cuisineId,
      cuisine_name: cuisine?.cuisine_name || cuisine?.name || '',
      category_id: form.categoryId,
      category_name: category?.category_name || category?.name || '',
      subcategory_name: form.subcategoryName,
      description: form.description.trim(),
      food_images: images.map((image) => image.url),
      mrp: Number(form.mrp),
      discount: Number(form.discount),
      rating: Number(form.rating),
      stock_quantity: Number(form.stockQuantity),
      serving_size: form.servingSize.trim(),
      portion_size: form.portionSize,
      preparation_time: Number(form.preparationTime),
      available_time: form.availableTime.trim(),
      food_type: form.foodType,
      is_spicy: form.isSpicy,
      is_available: form.isAvailable,
      dining_available: form.diningAvailable,
      takeaway_available: form.takeawayAvailable,
      delivery_available: form.deliveryAvailable,
      featured: form.featured,
      status: form.status,
      addons: form.addons.map(({ name, price, status }) => ({ addon_name: name.trim(), price: Number(price), status })),
      customizations: form.customizations.map((group) => ({
        name: group.name.trim(),
        selection_type: group.selectionType,
        required: group.required,
        options: group.options.map((option) => ({ name: option.name.trim(), price: Number(option.price) })),
      })),
    };

    try {
      if (editingFoodId) await api.put(`/foods/${editingFoodId}`, payload);
      else await api.post('/foods', payload);
      toast.success(editingFoodId ? 'Food updated.' : 'Food saved.');
      if (onSaved) await onSaved();
      closeForm();
    } catch (error) {
      setPageError(error?.response?.data?.message || 'Unable to save food. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const cuisineName = cuisines.find((item) => String(item.cuisine_id || item.id) === form.cuisineId)?.cuisine_name || '';
  const categoryName = categories.find((item) => String(item.category_id || item.id) === form.categoryId)?.category_name || '';

  if (loading) return <div className="p-8 text-center text-sm text-gray-500">Loading food form...</div>;

  return (
    <div
      role={drawer ? 'dialog' : undefined}
      aria-modal={drawer ? 'true' : undefined}
      aria-label={drawer ? 'Add food' : undefined}
      className={drawer ? 'fixed inset-0 z-[80] flex justify-end bg-black/45' : undefined}
      onMouseDown={(event) => {
        if (drawer && event.target === event.currentTarget && !saving && !uploading) closeForm();
      }}
    >
    <form onSubmit={handleSave} className={drawer ? 'scrollbar-hide h-full w-full max-w-4xl overflow-y-auto bg-[#f4f5f2] p-4 shadow-2xl md:p-6' : 'min-h-screen bg-[#f4f5f2] p-4 md:p-6'}>
      <div className="mx-auto max-w-5xl pb-24">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-gray-200  pb-4">
          <div>
            
            
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">{editingFoodId ? 'Edit Food' : 'Add Food'}</h1>
            <div className="flex items-center gap-2 text-emerald-800"><Utensils className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-[0.14em]">Restaurant menu</span></div>
            <p className="mt-1 text-sm text-gray-600">Create a menu item with pricing, availability, add-ons, and customizations.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"><span className="text-gray-500">Food ID</span><span className="ml-2 font-mono font-semibold text-gray-900">{form.foodId || 'Generating...'}</span></div>
            {drawer && <button type="button" onClick={closeForm} disabled={saving || uploading} className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50" aria-label="Close Add Food" title="Close"><X className="h-4 w-4" /></button>}
          </div>
        </header>

        {pageError && <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{pageError}</div>}

        <div className="space-y-4">
          <Section number="01" title="Basic details" description="Name and classify this menu item.">
            <label className="block text-sm font-medium text-gray-700">Food name
              <input value={form.foodName} onChange={(event) => setValue('foodName', event.target.value)} maxLength={180} placeholder="e.g. Chicken Biryani" className={`mt-1.5 h-10 w-full rounded-md border px-3 outline-none focus:border-emerald-700 ${errors.foodName ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.foodName && <span className="mt-1 block text-xs text-red-700">{errors.foodName}</span>}
            </label>
            <label className="block text-sm font-medium text-gray-700">Food type
              <select value={form.foodType} onChange={(event) => setValue('foodType', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3"><option>Veg</option><option>Non-Veg</option></select>
            </label>
            <SearchableSelect label="Cuisine" value={form.cuisineId} options={cuisineOptions} placeholder="Search cuisines" onChange={(value) => setValue('cuisineId', value)} error={errors.cuisineId} />
            <SearchableSelect label="Category" value={form.categoryId} options={categoryOptions} placeholder="Search categories" onChange={(value) => { setValue('categoryId', value); setValue('subcategoryName', ''); }} error={errors.categoryId} />
            <SearchableSelect label="Subcategory" value={form.subcategoryName} options={subcategoryOptions.map((value) => ({ value, label: value }))} placeholder={form.categoryId ? 'Search subcategories' : 'Choose a category first'} disabled={!form.categoryId} onChange={(value) => setValue('subcategoryName', value)} error={errors.subcategoryName} />
            <label className="block text-sm font-medium text-gray-700">Description
              <textarea value={form.description} onChange={(event) => setValue('description', event.target.value)} rows={3} maxLength={2000} placeholder="Describe ingredients, flavor, or serving details" className="mt-1.5 w-full resize-y rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-emerald-700" />
            </label>
            <div className="sm:col-span-2">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-medium text-gray-800">Food images</h3><p className="mt-0.5 text-xs text-gray-500">Upload multiple JPG, PNG, or WEBP images, up to 5 MB each. Drag to reorder.</p></div><label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"><ImagePlus className="h-4 w-4" /> Add images<input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => addImageFiles(event.target.files)} /></label></div>
              {images.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{images.map((image, index) => (
                <article key={image.id} draggable onDragStart={() => setDraggedImageId(image.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => { moveImage(draggedImageId, image.id); setDraggedImageId(''); }} className="group overflow-hidden rounded-md border border-gray-200 bg-white">
                  <div className="relative aspect-[4/3] bg-gray-100"><img src={image.preview || image.url} alt={image.name || `Food image ${index + 1}`} className="h-full w-full object-cover" />
                    <span className="absolute left-2 top-2 rounded bg-black/65 px-1.5 py-0.5 text-xs text-white">{index + 1}</span>
                    {image.uploading && <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-medium text-white">Uploading…</span>}
                    <button type="button" onClick={() => removeImage(image.id)} className="absolute right-2 top-2 rounded-md bg-white/95 p-1.5 text-red-700 shadow hover:bg-white" aria-label={`Remove ${image.name}`}><X className="h-4 w-4" /></button>
                  </div>
                  <div className="flex items-center justify-between gap-2 px-2 py-1.5"><span className="truncate text-xs text-gray-600">{image.name}</span><div className="flex shrink-0 gap-1"><button type="button" disabled={index === 0} onClick={() => moveImage(image.id, images[index - 1].id)} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" aria-label="Move image earlier"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" disabled={index === images.length - 1} onClick={() => moveImage(image.id, images[index + 1].id)} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" aria-label="Move image later"><ArrowDown className="h-3.5 w-3.5" /></button></div></div>
                </article>
              ))}</div> : <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">No food images added.</div>}
            </div>
          </Section>

          <Section number="02" title="Pricing" description="Final price updates automatically and is recalculated by the server." columns={3}>
            <label className="block text-sm font-medium text-gray-700">MRP (₹)
              <input type="number" min="0" step="0.01" value={form.mrp} onChange={(event) => setValue('mrp', event.target.value)} className={`mt-1.5 h-10 w-full rounded-md border px-3 outline-none focus:border-emerald-700 ${errors.mrp ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.mrp && <span className="mt-1 block text-xs text-red-700">{errors.mrp}</span>}
            </label>
            <label className="block text-sm font-medium text-gray-700">Discount (%)
              <input type="number" min="0" max="100" step="0.01" value={form.discount} onChange={(event) => setValue('discount', event.target.value)} className={`mt-1.5 h-10 w-full rounded-md border px-3 outline-none focus:border-emerald-700 ${errors.discount ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.discount && <span className="mt-1 block text-xs text-red-700">{errors.discount}</span>}
            </label>
            <label className="block text-sm font-medium text-gray-700">Final price (₹)
              <input readOnly value={finalPrice.toFixed(2)} className="mt-1.5 h-10 w-full rounded-md border border-emerald-200 bg-emerald-50 px-3 font-semibold text-emerald-900" />
            </label>
          </Section>

          <Section number="03" title="Food details" columns={3}>
            <label className="block text-sm font-medium text-gray-700">Preparation time (minutes)
              <input type="number" min="0" step="1" value={form.preparationTime} onChange={(event) => setValue('preparationTime', event.target.value)} className={`mt-1.5 h-10 w-full rounded-md border px-3 outline-none focus:border-emerald-700 ${errors.preparationTime ? 'border-red-500' : 'border-gray-300'}`} />
              {errors.preparationTime && <span className="mt-1 block text-xs text-red-700">{errors.preparationTime}</span>}
            </label>
            <label className="block text-sm font-medium text-gray-700">Food rating (0–5)
              <input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(event) => setValue('rating', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-gray-300 px-3 outline-none focus:border-emerald-700" />
            </label>
            <label className="block text-sm font-medium text-gray-700">Stock quantity (units)
              <input type="number" min="0" step="1" value={form.stockQuantity} onChange={(event) => setValue('stockQuantity', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-gray-300 px-3 outline-none focus:border-emerald-700" />
            </label>
            <label className="block text-sm font-medium text-gray-700">Is spicy?
              <select value={form.isSpicy ? 'Yes' : 'No'} onChange={(event) => setValue('isSpicy', event.target.value === 'Yes')} className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3"><option>No</option><option>Yes</option></select>
            </label>
            <label className="block text-sm font-medium text-gray-700">Serving size
              <input value={form.servingSize} onChange={(event) => setValue('servingSize', event.target.value)} placeholder="e.g. Serves 1" className="mt-1.5 h-10 w-full rounded-md border border-gray-300 px-3 outline-none focus:border-emerald-700" />
            </label>
            <label className="block text-sm font-medium text-gray-700">Portion size
              <select value={form.portionSize} onChange={(event) => setValue('portionSize', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3"><option>Half</option><option>Full</option><option>Your Choice</option></select>
            </label>
          </Section>

          <Section number="04" title="Availability" description="Control service channels and menu visibility." columns={3}>
            <label className="block text-sm font-medium text-gray-700">Available time
              <input type="text" value={form.availableTime} onChange={(event) => setValue('availableTime', event.target.value)} maxLength={100} placeholder="e.g. 10:00 AM - 1:00 PM" className="mt-1.5 h-10 w-full rounded-md border border-gray-300 px-3 outline-none focus:border-emerald-700" />
              <span className="mt-1 block text-xs font-normal text-gray-500">Default: 10:00 AM - 1:00 PM</span>
            </label>
            <Toggle label="Available" checked={form.isAvailable} onChange={(value) => setValue('isAvailable', value)} />
            <Toggle label="Dining available" checked={form.diningAvailable} onChange={(value) => setValue('diningAvailable', value)} />
            <Toggle label="Takeaway available" checked={form.takeawayAvailable} onChange={(value) => setValue('takeawayAvailable', value)} />
            <Toggle label="Delivery available" checked={form.deliveryAvailable} onChange={(value) => setValue('deliveryAvailable', value)} />
            <Toggle label="Featured food" checked={form.featured} onChange={(value) => setValue('featured', value)} />
            <label className="block text-sm font-medium text-gray-700">Status
              <select value={form.status} onChange={(event) => setValue('status', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3"><option>Active</option><option>Inactive</option></select>
            </label>
          </Section>

          <Section number="05" title="Add-ons" description="Optional extras customers can add to this food.">
            <div className="flex items-center justify-between sm:col-span-2"><p className="text-sm text-gray-600">{form.addons.length} add-on{form.addons.length === 1 ? '' : 's'}</p><button type="button" onClick={addAddon} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"><Plus className="h-4 w-4" /> Add add-on</button></div>
            {form.addons.map((addon, index) => (
              <div key={addon.key} className="grid gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 sm:col-span-2 sm:grid-cols-[1fr_150px_150px_auto] sm:items-end">
                <label className="text-sm font-medium text-gray-700">Add-on name<input value={addon.name} onChange={(event) => updateAddon(addon.key, 'name', event.target.value)} placeholder="e.g. Extra cheese" className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3" />{errors[`addon-${index}`] && <span className="mt-1 block text-xs text-red-700">{errors[`addon-${index}`]}</span>}</label>
                <label className="text-sm font-medium text-gray-700">Price (₹)<input type="number" min="0" step="0.01" value={addon.price} onChange={(event) => updateAddon(addon.key, 'price', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3" />{errors[`addon-price-${index}`] && <span className="mt-1 block text-xs text-red-700">{errors[`addon-price-${index}`]}</span>}</label>
                <label className="text-sm font-medium text-gray-700">Status<select value={addon.status} onChange={(event) => updateAddon(addon.key, 'status', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3"><option>Active</option><option>Inactive</option></select></label>
                <button type="button" onClick={() => removeAddon(addon.key)} className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-50" aria-label="Remove add-on"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </Section>

          <Section number="06" title="Customizations" description="Add customer choices, such as spice level or side dishes.">
            <div className="flex items-center justify-between sm:col-span-2"><p className="text-sm text-gray-600">{form.customizations.length} group{form.customizations.length === 1 ? '' : 's'}</p><button type="button" onClick={addCustomization} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"><Plus className="h-4 w-4" /> Add group</button></div>
            {form.customizations.map((group, groupIndex) => (
              <fieldset key={group.key} className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3 sm:col-span-2">
                <div className="grid gap-3 sm:grid-cols-[1fr_170px_auto_auto] sm:items-end">
                  <label className="text-sm font-medium text-gray-700">Customization name<input value={group.name} onChange={(event) => updateCustomization(group.key, 'name', event.target.value)} placeholder="e.g. Spice level" className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3" />{errors[`customization-${groupIndex}`] && <span className="mt-1 block text-xs text-red-700">{errors[`customization-${groupIndex}`]}</span>}</label>
                  <label className="text-sm font-medium text-gray-700">Selection type<select value={group.selectionType} onChange={(event) => updateCustomization(group.key, 'selectionType', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-gray-300 bg-white px-3"><option>Single</option><option>Multiple</option></select></label>
                  <label className="mb-2 inline-flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={group.required} onChange={(event) => updateCustomization(group.key, 'required', event.target.checked)} className="h-4 w-4 accent-emerald-800" /> Required</label>
                  <button type="button" onClick={() => removeCustomization(group.key)} className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-50" aria-label="Remove customization group"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="space-y-2 border-t border-gray-200 pt-3">
                  <div className="flex items-center justify-between"><h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">Options</h4><button type="button" onClick={() => addCustomizationOption(group.key)} className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-emerald-800 hover:bg-emerald-50"><Plus className="h-3.5 w-3.5" /> Add option</button></div>
                  {group.options.map((option, optionIndex) => (
                    <div key={option.key} className="grid gap-2 sm:grid-cols-[1fr_150px_auto]">
                      <label className="text-xs font-medium text-gray-600">Option name<input value={option.name} onChange={(event) => updateCustomizationOption(group.key, option.key, 'name', event.target.value)} placeholder="e.g. Mild" className="mt-1 h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" />{errors[`option-${groupIndex}-${optionIndex}`] && <span className="mt-1 block text-xs text-red-700">{errors[`option-${groupIndex}-${optionIndex}`]}</span>}</label>
                      <label className="text-xs font-medium text-gray-600">Extra price (₹)<input type="number" min="0" step="0.01" value={option.price} onChange={(event) => updateCustomizationOption(group.key, option.key, 'price', event.target.value)} className="mt-1 h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" />{errors[`option-price-${groupIndex}-${optionIndex}`] && <span className="mt-1 block text-xs text-red-700">{errors[`option-price-${groupIndex}-${optionIndex}`]}</span>}</label>
                      <button type="button" disabled={group.options.length <= 1} onClick={() => removeCustomizationOption(group.key, option.key)} className="mt-4 flex h-9 w-9 items-center justify-center rounded-md text-red-700 hover:bg-red-50 disabled:opacity-30" aria-label="Remove option"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </fieldset>
            ))}
          </Section>

        </div>
      </div>
      <div className={`${drawer ? 'sticky bottom-0 -mx-4 md:-mx-6' : 'fixed inset-x-0 bottom-0'} z-20 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6`}>
        <div className={`mx-auto flex flex-wrap justify-end gap-2 ${drawer ? '' : 'max-w-5xl'}`}>
          <button type="button" onClick={closeForm} className="inline-flex h-10 items-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"><ArrowLeft className="h-4 w-4" /> Cancel</button>
          <button type="button" onClick={handleReset} disabled={saving || uploading} className="h-10 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Reset</button>
          <button type="submit" disabled={saving || uploading || loading} className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Food'}</button>
        </div>
      </div>
    </form>
    </div>
  );
};

export default AddFood;
