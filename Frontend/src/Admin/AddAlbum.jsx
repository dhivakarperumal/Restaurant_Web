import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ImagePlus, Plus, Trash2, X, ChevronDown } from 'lucide-react';
import api from '../api';

const albumProduct = {
  productId: 'ALB001',
  productName: 'Premium Wedding Photo Album',
  productCode: 'ALB-001',
  category: 'Albums',
  subCategory: 'Wedding Album',
  brand: 'Q Frames',
  albumType: 'Photo Album',
  occasion: 'Wedding',
  theme: 'Classic',
  size: '12 x 18 Inches',
  width: '12 Inches',
  height: '18 Inches',
  orientation: 'Landscape',
  totalPages: 40,
  sheetCount: 20,
  pageMaterial: 'Premium Photo Paper',
  pageThickness: '300 GSM',
  coverType: 'Hard Cover',
  coverMaterial: 'Leatherette',
  coverFinish: 'Matte',
  printingType: 'Digital Printing',
  printQuality: 'High Definition',
  printingSides: 'Both Sides',
  bindingType: 'Lay Flat Binding',
  thumbnailImage: '',
  productImages: [],
  mrp: 1200,
  offerPrice: 999,
  costPrice: 800,
  discountPercentage: 17,
  stockQuantity: 0,
  minimumStock: 5,
  stockStatus: 'In Stock',
  shortDescription: 'Premium quality customizable photo album.',
  description: '',
  customizationAvailable: true,
  customerNamePrinting: true,
  photoUploadRequired: true,
  customCoverDesign: true,
  estimatedDeliveryDays: 7,
  status: 'Active',
  featuredProduct: true,
  metaTitle: '',
  metaDescription: '',
  keywords: [],
  colors: [{ name: 'Brown', code: '#8B4513' }],
  sizes: ['12 x 18 Inches'],
  variants: [],
  createdBy: 'Admin',
  createdAt: '',
  updatedBy: 'Admin',
  updatedAt: '',
};

const fieldStyle = 'w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 py-2.5 text-sm text-[#1f1f1f] outline-none focus:border-[#1a3c36]';

const calculateDiscount = (mrp, offerPrice) => {
  if (!mrp || !offerPrice) return 0;
  return Math.round(((mrp - offerPrice) / mrp) * 100);
};

const getVariantStockTotal = (variants = []) => (
  variants.reduce((total, variant) => total + (Number(variant.stock) || 0), 0)
);

const colorPalette = [
  ['Black', '#000000'],
  ['White', '#ffffff'],
  ['Red', '#ff0000'],
  ['Orange', '#ffa500'],
  ['Yellow', '#ffff00'],
  ['Green', '#008000'],
  ['Blue', '#0000ff'],
  ['Purple', '#800080'],
  ['Pink', '#ffc0cb'],
  ['Brown', '#8b4513'],
  ['Gray', '#808080'],
];

const getColorName = (hexCode) => {
  const red = Number.parseInt(hexCode.slice(1, 3), 16);
  const green = Number.parseInt(hexCode.slice(3, 5), 16);
  const blue = Number.parseInt(hexCode.slice(5, 7), 16);

  return colorPalette.reduce((closest, [name, hex]) => {
    const paletteRed = Number.parseInt(hex.slice(1, 3), 16);
    const paletteGreen = Number.parseInt(hex.slice(3, 5), 16);
    const paletteBlue = Number.parseInt(hex.slice(5, 7), 16);
    const distance = (red - paletteRed) ** 2 + (green - paletteGreen) ** 2 + (blue - paletteBlue) ** 2;

    return distance < closest.distance ? { name, distance } : closest;
  }, { name: 'Custom', distance: Number.POSITIVE_INFINITY }).name;
};

const AddAlbum = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const editAlbumId = queryParams.get('edit');
  const viewAlbumId = queryParams.get('view');
  const mode = viewAlbumId ? 'view' : editAlbumId ? 'edit' : 'create';
  const [formData, setFormData] = useState(albumProduct);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [expandedVariant, setExpandedVariant] = useState(null);
  const [newColor, setNewColor] = useState({ name: '', code: '#000000' });
  const [newSize, setNewSize] = useState('');

  useEffect(() => {
    const fetchAlbumForEdit = async (albumId) => {
      try {
        const response = await api.get(`/albums/${albumId}`);
        const album = response?.data?.data || {};

        const productImages = Array.isArray(album.product_images)
          ? album.product_images
          : typeof album.product_images === 'string'
            ? JSON.parse(album.product_images || '[]')
            : [];

        const colorOptions = Array.isArray(album.color_options)
          ? album.color_options
          : Array.isArray(album.colors)
            ? album.colors
            : typeof album.color_options === 'string'
              ? JSON.parse(album.color_options || '[]')
              : (album.color && typeof album.color === 'string'
                ? [{ name: album.color, code: '#000000' }]
                : [{ name: 'Brown', code: '#8B4513' }]);

        const sizeOptions = Array.isArray(album.size_options)
          ? album.size_options
          : Array.isArray(album.sizes)
            ? album.sizes
            : typeof album.size_options === 'string'
              ? JSON.parse(album.size_options || '[]')
              : (album.size ? [album.size] : []);

        const variants = Array.isArray(album.variants) ? album.variants : [];

        setFormData({
          ...albumProduct,
          productId: album.product_id || album.productId || 'ALB001',
          productName: album.product_name || album.productName || '',
          productCode: album.product_code || album.productCode || '',
          category: album.category || 'Albums',
          subCategory: album.sub_category || album.subCategory || '',
          brand: album.brand || '',
          albumType: album.album_type || album.albumType || '',
          occasion: album.occasion || '',
          theme: album.theme || '',
          size: album.size || '',
          width: album.width || '',
          height: album.height || '',
          orientation: album.orientation || 'Landscape',
          totalPages: album.total_pages ?? album.totalPages ?? 0,
          sheetCount: album.sheet_count ?? album.sheetCount ?? 0,
          pageMaterial: album.page_material || album.pageMaterial || '',
          pageThickness: album.page_thickness || album.pageThickness || '',
          coverType: album.cover_type || album.coverType || '',
          coverMaterial: album.cover_material || album.coverMaterial || '',
          coverFinish: album.cover_finish || album.coverFinish || '',
          printingType: album.printing_type || album.printingType || '',
          printQuality: album.print_quality || album.printQuality || '',
          printingSides: album.printing_sides || album.printingSides || '',
          bindingType: album.binding_type || album.bindingType || '',
          thumbnailImage: album.thumbnail_image || album.thumbnailImage || '',
          productImages: Array.isArray(productImages) ? productImages : [],
          costPrice: album.cost_price ?? album.costPrice ?? 0,
          mrp: album.mrp ?? album.selling_price ?? album.sellingPrice ?? 0,
          offerPrice: album.offer_price ?? album.discount_price ?? album.discountPrice ?? 0,
          discountPercentage: album.discount_percentage ?? album.discountPercentage ?? 0,
          stockQuantity: album.stock_quantity ?? album.stockQuantity ?? 0,
          minimumStock: album.minimum_stock ?? album.minimumStock ?? 0,
          stockStatus: album.stock_status || album.stockStatus || 'In Stock',
          shortDescription: album.short_description || album.shortDescription || '',
          description: album.description || '',
          customizationAvailable: Boolean(album.customization_available ?? album.customizationAvailable ?? false),
          customerNamePrinting: Boolean(album.customer_name_printing ?? album.customerNamePrinting ?? false),
          photoUploadRequired: Boolean(album.photo_upload_required ?? album.photoUploadRequired ?? false),
          customCoverDesign: Boolean(album.custom_cover_design ?? album.customCoverDesign ?? false),
          estimatedDeliveryDays: album.estimated_delivery_days ?? album.estimatedDeliveryDays ?? 0,
          status: album.status || 'Active',
          featuredProduct: Boolean(album.featured_product ?? album.featuredProduct ?? false),
          metaTitle: album.meta_title || album.metaTitle || '',
          metaDescription: album.meta_description || album.metaDescription || '',
          keywords: Array.isArray(album.keywords) ? album.keywords : [],
          colors: Array.isArray(colorOptions) ? colorOptions : [],
          sizes: Array.isArray(sizeOptions) ? sizeOptions : [],
          variants,
        });
      } catch (error) {
        console.error('Failed to load album for edit:', error);
      }
    };

    const fetchNextProductId = async () => {
      try {
        const response = await api.get('/albums/next-id');
        const nextId = response?.data?.data || 'ALB001';
        const nextCode = nextId.includes('-') ? nextId : nextId.replace('ALB', 'ALB-');

        setFormData((prev) => ({
          ...prev,
          productId: nextId,
          productCode: nextCode,
        }));
      } catch (error) {
        console.error('Failed to get next album ID:', error);
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
        const allCategories = Array.isArray(response?.data?.data) ? response.data.data : [];
        const albumCategories = allCategories.filter((category) => {
          const categoryType = String(category.category_type || category.categoryType || '').trim().toLowerCase();
          return categoryType === 'albums' || categoryType === 'album';
        });

        setCategories(albumCategories);

        if (albumCategories.length && !formData.category) {
          setFormData((prev) => ({
            ...prev,
            category: albumCategories[0].category_name,
            subCategory: Array.isArray(albumCategories[0].sub_categories) ? albumCategories[0].sub_categories[0] || '' : '',
          }));
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    if (mode === 'create') {
      fetchNextProductId();
    }

    if (mode === 'edit' || mode === 'view') {
      const albumId = editAlbumId || viewAlbumId;
      if (albumId) {
        fetchAlbumForEdit(albumId);
      }
    }

    fetchCategories();
  }, [editAlbumId, viewAlbumId, mode, formData.category]);

  const selectedCategory = categories.find((category) => category.category_name === formData.category) || categories[0] || null;
  const subCategoryOptions = Array.isArray(selectedCategory?.sub_categories) ? selectedCategory.sub_categories : [];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'category') {
      const matchedCategory = categories.find((category) => category.category_name === value);
      const firstSubCategory = Array.isArray(matchedCategory?.sub_categories) ? matchedCategory.sub_categories[0] || '' : '';

      setFormData((prev) => ({
        ...prev,
        category: value,
        subCategory: firstSubCategory,
      }));
      return;
    }

    if (name === 'mrp' || name === 'offerPrice') {
      const newMrp = name === 'mrp' ? Number(value) : formData.mrp;
      const newOffer = name === 'offerPrice' ? Number(value) : formData.offerPrice;
      const discount = calculateDiscount(newMrp, newOffer);

      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
        discountPercentage: discount,
      }));
      return;
    }

    if (name === 'sheetCount') {
      const sheets = Math.max(0, Number(value) || 0);
      setFormData((prev) => ({
        ...prev,
        sheetCount: value,
        totalPages: sheets * 2,
      }));
      return;
    }

    if (name === 'totalPages') {
      const pages = Math.max(0, Number(value) || 0);
      setFormData((prev) => ({
        ...prev,
        totalPages: value,
        sheetCount: Math.round(pages / 2),
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageUpload = async (event, type = 'thumbnail') => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    if (type === 'thumbnail') {
      setUploadingThumb(true);
    }

    try {
      const uploadedUrls = [];

      for (const file of files) {
        const form = new FormData();
        form.append('folder', 'albums');
        form.append('file', file);

        const response = await api.post('/upload', form);
        const uploadedUrl = response?.data?.url || response?.data?.urls?.[0] || '';

        if (uploadedUrl) {
          uploadedUrls.push(uploadedUrl);
        }
      }

      if (type === 'thumbnail') {
        const [firstUrl] = uploadedUrls;
        if (firstUrl) {
          setFormData((prev) => ({ ...prev, thumbnailImage: firstUrl }));
        }
      } else if (typeof type === 'string' && type.startsWith('gallery-replace-')) {
        const replaceIndex = Number(type.replace('gallery-replace-', ''));
        const [firstUrl] = uploadedUrls;
        if (firstUrl && Number.isInteger(replaceIndex)) {
          setFormData((prev) => ({
            ...prev,
            productImages: prev.productImages.map((image, index) => index === replaceIndex ? firstUrl : image),
          }));
        }
      } else if (typeof type === 'string' && type.startsWith('variant-')) {
        const variantIndex = Number(type.replace('variant-', ''));
        if (uploadedUrls.length > 0 && Number.isInteger(variantIndex)) {
          setFormData((prev) => ({
            ...prev,
            variants: prev.variants.map((v, idx) => 
              idx === variantIndex 
                ? { ...v, images: [...(v.images || (v.image ? [v.image] : [])), ...uploadedUrls], image: v.image || uploadedUrls[0] } 
                : v
            ),
          }));
        }
      }
    } catch (error) {
      console.error(error);
      alert('Image upload failed.');
    } finally {
      event.target.value = '';
      if (type === 'thumbnail') setUploadingThumb(false);
    }
  };

  const removeThumbnail = () => {
    setFormData((prev) => ({ ...prev, thumbnailImage: '' }));
  };

  const addColor = () => {
    if (!newColor.name.trim()) {
      alert('Please enter a color name');
      return;
    }
    const color = { ...newColor, name: newColor.name.trim() };
    setFormData((prev) => ({
      ...prev,
      colors: [...(prev.colors || []), color],
    }));
    const latestSize = formData.sizes?.[formData.sizes.length - 1];
    if (latestSize) addVariant(color.name, latestSize);
    setNewColor({ name: '', code: '#000000' });
  };

  const removeColor = (index) => {
    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.filter((_, i) => i !== index),
    }));
  };

  const addSize = () => {
    if (!newSize.trim()) {
      alert('Please enter a size');
      return;
    }
    const size = newSize.trim();
    setFormData((prev) => ({
      ...prev,
      sizes: [...(prev.sizes || []), size],
    }));
    const latestColor = formData.colors?.[formData.colors.length - 1];
    if (latestColor) addVariant(latestColor.name, size);
    setNewSize('');
  };

  const removeSize = (index) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index),
    }));
  };

  const addVariant = (color = '', size = '') => {
    const newVariant = {
      id: Date.now(),
      color,
      size,
      mrp: 0,
      offer: 0,
      offerPrice: 0,
      stock: 0,
      image: '',
      images: [],
    };
    setExpandedVariant((formData.variants || []).length);
    setFormData((prev) => ({
      ...prev,
      variants: [...(prev.variants || []), newVariant],
    }));
  };

  const removeVariant = (index) => {
    setFormData((prev) => {
      const variants = prev.variants.filter((_, i) => i !== index);
      return {
        ...prev,
        variants,
        stockQuantity: getVariantStockTotal(variants),
      };
    });
  };

  const updateVariant = (index, field, value) => {
    setFormData((prev) => {
      const variants = prev.variants.map((variant, variantIndex) => (
        variantIndex === index ? { ...variant, [field]: value } : variant
      ));
      return {
        ...prev,
        variants,
        ...(field === 'stock' ? { stockQuantity: getVariantStockTotal(variants) } : {}),
      };
    });
  };

  const removeVariantImage = (variantIndex, imageIndex) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => {
        if (i === variantIndex) {
          const newImages = (v.images || (v.image ? [v.image] : [])).filter((_, imgIdx) => imgIdx !== imageIndex);
          return { ...v, images: newImages, image: newImages[0] || '' };
        }
        return v;
      }),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const firstVariantWithImg = (formData.variants || []).find((v) => v && (v.image || (Array.isArray(v.images) && v.images.length))) || formData.variants?.[0] || {};
      const variantThumbnail = firstVariantWithImg.image || (Array.isArray(firstVariantWithImg.images) ? firstVariantWithImg.images[0] : '');
      const thumbnailImage = formData.thumbnailImage || variantThumbnail || (formData.productImages?.[0] || '');

      const allVariantImages = [];
      (formData.variants || []).forEach((v) => {
        if (v.image) allVariantImages.push(v.image);
        if (Array.isArray(v.images)) allVariantImages.push(...v.images);
      });
      const productImages = (Array.isArray(formData.productImages) && formData.productImages.length > 0)
        ? formData.productImages
        : [...new Set([thumbnailImage, ...allVariantImages].filter(Boolean))];

      const variantMrp = Number(firstVariantWithImg.mrp || 0);
      const variantOffer = Number(firstVariantWithImg.offerPrice || firstVariantWithImg.offer || variantMrp || 0);
      const mrp = Number(formData.mrp) > 0 ? Number(formData.mrp) : variantMrp;
      const offerPrice = Number(formData.offerPrice) > 0 ? Number(formData.offerPrice) : (variantOffer > 0 ? variantOffer : mrp);
      const discountPercentage = mrp > offerPrice ? Math.round(((mrp - offerPrice) / mrp) * 100) : (Number(formData.discountPercentage) || 0);

      const payload = {
        product_id: formData.productId,
        product_name: formData.productName,
        product_code: formData.productCode,
        category: formData.category,
        sub_category: formData.subCategory,
        brand: formData.brand,
        album_type: formData.albumType,
        occasion: formData.occasion,
        theme: formData.theme,
        size: formData.size,
        width: formData.width,
        height: formData.height,
        orientation: formData.orientation,
        total_pages: Number(formData.totalPages),
        sheet_count: Number(formData.sheetCount),
        page_material: formData.pageMaterial,
        page_thickness: formData.pageThickness,
        cover_type: formData.coverType,
        cover_material: formData.coverMaterial,
        cover_finish: formData.coverFinish,
        printing_type: formData.printingType,
        print_quality: formData.printQuality,
        printing_sides: formData.printingSides,
        binding_type: formData.bindingType,
        thumbnail_image: thumbnailImage,
        product_images: productImages,
        cost_price: Number(formData.costPrice),
        selling_price: mrp,
        discount_price: offerPrice,
        mrp: mrp,
        offer_price: offerPrice,
        discount_percentage: discountPercentage,
        stock_quantity: Number(formData.stockQuantity) || getVariantStockTotal(formData.variants),
        stock_status: formData.stockStatus,
        description: formData.description,
        customization_available: formData.customizationAvailable,
        customer_name_printing: formData.customerNamePrinting,
        photo_upload_required: formData.photoUploadRequired,
        custom_cover_design: formData.customCoverDesign,
        estimated_delivery_days: Number(formData.estimatedDeliveryDays),
        status: formData.status,
        featured_product: formData.featuredProduct,
        color_options: Array.isArray(formData.colors) ? formData.colors : [],
        size_options: Array.isArray(formData.sizes) ? formData.sizes : [],
        variants: formData.variants,
        created_by: 'Admin',
        updated_by: 'Admin',
      };

      if (mode === 'edit' && editAlbumId) {
        await api.put(`/albums/${editAlbumId}`, payload);
      } else {
        await api.post('/albums', payload);
      }

      navigate('/admin/albums');
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || 'Failed to save album.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[2.1rem] font-bold tracking-tighter text-[#1f1d1b]">
              {mode === 'view' ? 'View Album' : mode === 'edit' ? 'Edit Album' : 'Add New Album'}
            </h1>
            <p className="mt-2 text-[13px] text-[#646464]">
              Dashboard <span className="mx-2 text-[#9a9a9a]">&gt;</span> <span className="font-medium text-[#2a2a2a]">Albums</span> <span className="mx-2 text-[#9a9a9a]">&gt;</span> <span className="font-medium text-[#2a2a2a]">{mode === 'view' ? 'View' : mode === 'edit' ? 'Edit' : 'Add New'}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/albums')}
            className="rounded-xl border border-[#dfe2e5] bg-white px-4 py-2.5 text-sm font-medium text-[#2d2d2d] shadow-sm hover:bg-[#f9f9f9]"
          >
            ← Back to Albums
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-[20px] border border-[#e7e0d8] bg-white p-5 shadow-sm">
          {/* Basic Info */}
          <div className="rounded-2xl border border-[#e7e0d8] bg-[#faf9f8] p-5">
            <h2 className="mb-4 text-lg font-semibold text-[#1f1d1b]">Basic Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-[#2d2d2d]">Product Name *</span>
                <input name="productName" value={formData.productName} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#2d2d2d]">Product Code *</span>
                <input name="productCode" value={formData.productCode} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#2d2d2d]">Category *</span>
                <select name="category" value={formData.category} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle}>
                  {categories.length ? (
                    categories.map((category) => (
                      <option key={category.category_id || category.category_name} value={category.category_name}>
                        {category.category_name}
                      </option>
                    ))
                  ) : (
                    <option value="Albums">Albums</option>
                  )}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#2d2d2d]">Sub Category</span>
                <select name="subCategory" value={formData.subCategory} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle}>
                  {subCategoryOptions.length ? (
                    subCategoryOptions.map((subCategory) => (
                      <option key={subCategory} value={subCategory}>{subCategory}</option>
                    ))
                  ) : (
                    <option value="">No sub category</option>
                  )}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#2d2d2d]">Brand</span>
                <input name="brand" value={formData.brand} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#2d2d2d]">Album Type</span>
                <input name="albumType" value={formData.albumType} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#2d2d2d]">Description</span>
                <textarea name="description" value={formData.description} onChange={handleChange} disabled={mode === 'view'} rows={6} className={`${fieldStyle} resize-none`} />
              </label>
            </div>
          </div>

          {/* Colors & Sizes Section */}
          <div className="rounded-2xl border border-[#e7e0d8] bg-[#faf9f8] p-5">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Colors Subsection */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#1f1d1b]">Product Colors</h2>
                  {mode !== 'view' && (
                    <button
                      type="button"
                      onClick={addColor}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#1a3c36] px-3 py-2 text-xs font-semibold text-white hover:bg-[#214a42]"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  )}
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {(formData.colors || []).map((color, index) => (
                    <div key={`color-${index}`} className="flex items-center gap-2 rounded-lg bg-white p-2 border border-[#dfe2e5]">
                      <div
                        className="h-6 w-6 rounded border border-[#dfe2e5]"
                        style={{ backgroundColor: color.code }}
                        title={color.code}
                      />
                      <span className="text-sm font-medium text-[#2d2d2d]">{color.name}</span>
                      <span className="text-xs text-[#777]">({color.code})</span>
                      {mode !== 'view' && (
                        <button
                          type="button"
                          onClick={() => removeColor(index)}
                          className="ml-1 text-[#b42318] hover:text-[#8e1c14]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {mode !== 'view' && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Color name"
                      value={newColor.name}
                      onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
                      className={fieldStyle}
                    />
                    <input
                      type="color"
                      value={newColor.code}
                      onChange={(e) => {
                        const code = e.target.value;
                        setNewColor({ ...newColor, code, name: getColorName(code) });
                      }}
                      className="w-20 h-10 rounded-xl border border-[#dfe2e5] cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Sizes Subsection */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#1f1d1b]">Product Sizes</h2>
                  {mode !== 'view' && (
                    <button
                      type="button"
                      onClick={addSize}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#1a3c36] px-3 py-2 text-xs font-semibold text-white hover:bg-[#214a42]"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  )}
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {(formData.sizes || []).map((size, index) => (
                    <div key={`size-${index}`} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 border border-[#dfe2e5]">
                      <span className="text-sm font-semibold text-[#2d2d2d]">{size}</span>
                      {mode !== 'view' && (
                        <button
                          type="button"
                          onClick={() => removeSize(index)}
                          className="text-[#b42318] hover:text-[#8e1c14]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {mode !== 'view' && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Size (e.g., 12 x 18)"
                      value={newSize}
                      onChange={(e) => setNewSize(e.target.value)}
                      className={fieldStyle}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Product Variants */}
          <div className="rounded-2xl border border-[#e7e0d8] bg-[#faf9f8] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#1f1d1b]">Product Variants</h2>
              {mode !== 'view' && (
                <button
                  type="button"
                  onClick={addVariant}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#1a3c36] px-3 py-2 text-xs font-semibold text-white hover:bg-[#214a42]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Variant
                </button>
              )}
            </div>

            {(formData.variants || []).length === 0 ? (
              <p className="text-sm text-[#777]">No variants added yet.</p>
            ) : (
              <div className="space-y-3">
                {formData.variants.map((variant, idx) => (
                  <div
                    key={variant.id || idx}
                    className="rounded-lg border border-[#dfe2e5] bg-white p-4"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setExpandedVariant(expandedVariant === idx ? null : idx)}
                        className="flex min-w-0 flex-1 items-center justify-between text-left"
                      >
                        <div>
                          <p className="font-semibold text-[#2d2d2d]">
                            Variant {idx + 1}: {variant.color} - {variant.size}
                          </p>
                          <p className="text-xs text-[#777]">₹{variant.mrp} → ₹{variant.offer} → ₹{variant.offerPrice} | Stock: {variant.stock}</p>
                        </div>
                        <ChevronDown
                          className={`h-5 w-5 transition-transform ${expandedVariant === idx ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {mode !== 'view' && (
                        <button
                          type="button"
                          aria-label={`Delete variant ${idx + 1}`}
                          onClick={() => removeVariant(idx)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#b42318] hover:bg-[#fff5f5]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {expandedVariant === idx && (
                      <div className="mt-4 border-t border-[#dfe2e5] pt-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="space-y-2">
                            <span className="text-sm font-medium text-[#2d2d2d]">Color</span>
                            <select
                              value={variant.color}
                              onChange={(e) => updateVariant(idx, 'color', e.target.value)}
                              disabled={mode === 'view'}
                              className={fieldStyle}
                            >
                              <option value="">Select color</option>
                              {(formData.colors || []).map((color, i) => (
                                <option key={i} value={color.name}>{color.name}</option>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm font-medium text-[#2d2d2d]">Size</span>
                            <select
                              value={variant.size}
                              onChange={(e) => updateVariant(idx, 'size', e.target.value)}
                              disabled={mode === 'view'}
                              className={fieldStyle}
                            >
                              <option value="">Select size</option>
                              {(formData.sizes || []).map((size, i) => (
                                <option key={i} value={size}>{size}</option>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm font-medium text-[#2d2d2d]">MRP (₹)</span>
                            <input
                              type="number"
                              value={variant.mrp}
                              onChange={(e) => {
                                const newMrp = Number(e.target.value);
                                const newSellingPrice = newMrp - variant.offer;
                                updateVariant(idx, 'mrp', newMrp);
                                updateVariant(idx, 'offerPrice', newSellingPrice);
                              }}
                              disabled={mode === 'view'}
                              className={fieldStyle}
                            />
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm font-medium text-[#2d2d2d]">Offer Price (₹)</span>
                            <input
                              type="number"
                              value={variant.offer}
                              onChange={(e) => {
                                const newOffer = Number(e.target.value);
                                const newSellingPrice = variant.mrp - newOffer;
                                updateVariant(idx, 'offer', newOffer);
                                updateVariant(idx, 'offerPrice', newSellingPrice);
                              }}
                              disabled={mode === 'view'}
                              className={fieldStyle}
                            />
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm font-medium text-[#2d2d2d]">Selling Price (₹)</span>
                            <div className="rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 py-2.5 text-sm font-semibold text-[#1a3c36]">
                              {variant.mrp - variant.offer}
                            </div>
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm font-medium text-[#2d2d2d]">Stock Quantity</span>
                            <input
                              type="number"
                              value={variant.stock}
                              onChange={(e) => updateVariant(idx, 'stock', Number(e.target.value))}
                              disabled={mode === 'view'}
                              className={fieldStyle}
                            />
                          </label>
                        </div>

                        {/* Variant Image */}
                        <div className="mt-4 border-t border-[#dfe2e5] pt-4">
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-[#2d2d2d]">Variant Image</span>
                            <input
                              id={`variant-upload-${idx}`}
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => handleImageUpload(e, `variant-${idx}`)}
                              className="sr-only"
                              disabled={mode === 'view'}
                            />
                            <div className="flex flex-wrap gap-3">
                              {(variant.images || (variant.image ? [variant.image] : [])).map((image, imageIndex) => (
                                <div key={`${image}-${imageIndex}`} className="relative h-24 w-24">
                                  <img
                                    src={image}
                                    alt={`Variant ${idx + 1} image ${imageIndex + 1}`}
                                    className="h-full w-full rounded-lg border border-[#dfe2e5] object-cover"
                                  />
                                  {mode !== 'view' && (
                                    <button
                                      type="button"
                                      aria-label={`Remove variant image ${imageIndex + 1}`}
                                      onClick={() => removeVariantImage(idx, imageIndex)}
                                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#b42318] text-white shadow-md hover:bg-[#8e1c14]"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {mode !== 'view' && (
                                <label
                                  htmlFor={`variant-upload-${idx}`}
                                  className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#cbd4d0] bg-white text-[#6e8379] hover:border-[#1a3c36] hover:text-[#1a3c36]"
                                >
                                  <ImagePlus className="h-4 w-4" />
                                  <span className="text-xs font-semibold">Add</span>
                                </label>
                              )}
                            </div>
                          </label>
                        </div>

                        {mode !== 'view' && (
                          <button
                            type="button"
                            onClick={() => removeVariant(idx)}
                            className="mt-4 inline-flex items-center gap-1 rounded-lg border border-[#f1d8d8] bg-[#fff5f5] px-3 py-2 text-xs font-semibold text-[#b42318] hover:bg-[#ffe5e5]"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove Variant
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Album Details, Stock, Description, etc. */}
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-6">
              <div className="rounded-2xl border border-[#e7e0d8] bg-[#faf9f8] p-5">
                <h2 className="mb-4 text-lg font-semibold text-[#1f1d1b]">Album Details</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[#2d2d2d]">Occasion</span>
                    <input name="occasion" value={formData.occasion} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[#2d2d2d]">Theme</span>
                    <input name="theme" value={formData.theme} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[#2d2d2d]">Cover Type</span>
                    <input name="coverType" value={formData.coverType} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[#2d2d2d]">Cover Material</span>
                    <input name="coverMaterial" value={formData.coverMaterial} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[#2d2d2d]">Cover Finish</span>
                    <input name="coverFinish" value={formData.coverFinish} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[#2d2d2d]">Printing Type</span>
                    <input name="printingType" value={formData.printingType} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle} />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e7e0d8] bg-[#faf9f8] p-5">
                <h2 className="mb-4 text-lg font-semibold text-[#1f1d1b]">Pages Information</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#2d2d2d]">Sheet Count</span>
                      <span className="text-[11px] font-bold text-[#b07838]">2 photos / sheet</span>
                    </div>
                    <input name="sheetCount" type="number" min="1" value={formData.sheetCount} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle} />
                    <span className="text-[11px] text-[#666] block">
                      Customers can upload up to <strong>{(Number(formData.sheetCount) || 0) * 2} photos</strong> during ordering.
                    </span>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[#2d2d2d]">Total Pages</span>
                    <input name="totalPages" type="number" min="1" value={formData.totalPages} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle} />
                    <span className="text-[11px] text-[#666] block">
                      Auto-calculated: {formData.sheetCount || 0} sheets × 2 = {formData.totalPages || 0} pages.
                    </span>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[#2d2d2d]">Page Material</span>
                    <input name="pageMaterial" value={formData.pageMaterial} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[#2d2d2d]">Page Thickness</span>
                    <input name="pageThickness" value={formData.pageThickness} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle} />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e7e0d8] bg-[#faf9f8] p-5">
                <h2 className="mb-4 text-lg font-semibold text-[#1f1d1b]">Size & Dimensions</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[#2d2d2d]">Size</span>
                    <input name="size" value={formData.size} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[#2d2d2d]">Orientation</span>
                    <select name="orientation" value={formData.orientation} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle}>
                      <option>Landscape</option>
                      <option>Portrait</option>
                    </select>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[#2d2d2d]">Width</span>
                    <input name="width" value={formData.width} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[#2d2d2d]">Height</span>
                    <input name="height" value={formData.height} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle} />
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-[#e7e0d8] bg-[#faf9f8] p-5">
                <h2 className="mb-4 text-lg font-semibold text-[#1f1d1b]">Stock Information</h2>
                <div className="space-y-4">
                  <label className="space-y-2 block">
                    <span className="text-sm font-medium text-[#2d2d2d]">Stock Quantity</span>
                    <input name="stockQuantity" type="number" value={formData.stockQuantity} readOnly disabled={mode === 'view'} className={fieldStyle} />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e7e0d8] bg-[#faf9f8] p-5">
                <h2 className="mb-4 text-lg font-semibold text-[#1f1d1b]">Customization Options</h2>
                <div className="space-y-3">
                  {[
                    ['customizationAvailable', 'Customization Available'],
                    ['customerNamePrinting', 'Customer Name Printing'],
                    ['photoUploadRequired', 'Photo Upload Required'],
                    ['customCoverDesign', 'Custom Cover Design'],
                    ['featuredProduct', 'Featured Product'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 rounded-lg border border-[#dfe2e5] bg-white px-3 py-2.5">
                      <input
                        type="checkbox"
                        name={key}
                        checked={formData[key]}
                        onChange={handleChange}
                        disabled={mode === 'view'}
                        className="h-4 w-4 rounded border-[#dfe2e5] text-[#1a3c36] focus:ring-[#1a3c36]"
                      />
                      <span className="text-sm font-medium text-[#2d2d2d]">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#e7e0d8] bg-[#faf9f8] p-5">
                <h2 className="mb-4 text-lg font-semibold text-[#1f1d1b]">Delivery & Status</h2>
                <div className="space-y-4">
                  <label className="space-y-2 block">
                    <span className="text-sm font-medium text-[#2d2d2d]">Estimated Delivery Days</span>
                    <input name="estimatedDeliveryDays" type="number" value={formData.estimatedDeliveryDays} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle} />
                  </label>
                  <label className="space-y-2 block">
                    <span className="text-sm font-medium text-[#2d2d2d]">Status</span>
                    <select name="status" value={formData.status} onChange={handleChange} disabled={mode === 'view'} className={fieldStyle}>
                      <option>Active</option>
                      <option>Inactive</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 border-t border-[#ece9e5] pt-5">
            <button
              type="button"
              onClick={() => navigate('/admin/albums')}
              className="rounded-xl border border-[#dfe2e5] bg-white px-5 py-2.5 text-sm font-medium text-[#2d2d2d] hover:bg-[#f9f9f9]"
            >
              Cancel
            </button>
            {mode !== 'view' && (
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#1a3c36] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(26,60,54,0.18)] disabled:opacity-70 hover:bg-[#214a42]"
              >
                {saving ? 'Saving...' : mode === 'edit' ? 'Update Album' : 'Save Album'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAlbum;
