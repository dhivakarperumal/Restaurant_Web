import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Eye,
  LayoutGrid,
  Pencil,
  Package,
  Search,
  ShoppingBag,
  Table2,
  TrendingUp,
} from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';

const normalizeImageUrl = (value) => {
  if (!value || typeof value !== 'string') return '';
  if (value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('http://') || value.startsWith('https://')) return value;

  const rawApiUrl = import.meta.env.VITE_API_URL || '/api';
  const baseUrl = rawApiUrl.replace(/\/api\/?$/, '');
  return `${baseUrl}${value.startsWith('/') ? value : `/${value}`}`;
};

const parseVariantArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getVariantColor = (variant) => variant?.color || variant?.colour || variant?.variant_color || '';

const getVariantSize = (variant) => variant?.size || variant?.size_name || variant?.label || variant?.name || variant?.size_description || '';

const getVariantDisplayLabel = (variant, index = 0) => {
  const size = getVariantSize(variant);
  const color = getVariantColor(variant);

  if (size && color) return `${color} / ${size}`;
  if (size) return size;
  if (color) return color;
  return `Variant ${index + 1}`;
};

const getProductVariantStock = (data) => {
  const variants = parseVariantArray(data?.size_variants);
  return variants.reduce((sum, variant) => sum + Number(variant?.stock || 0), 0);
};

const getAlbumVariantStock = (album) => {
  const variants = parseVariantArray(album?.variants);
  if (variants.length) {
    return variants.reduce((sum, variant) => sum + Number(variant?.stock || variant?.quantity || 0), 0);
  }
  return Number(album?.stock_quantity || 0);
};

const getStatusLabel = (currentStock) => {
  if (currentStock === 0) return 'Out of Stock';
  if (currentStock <= 15) return 'Low Stock';
  return 'In Stock';
};

const StockDetails = () => {
  const [products, setProducts] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStatus, setSelectedStatus] = useState('All Stock Status');
  const [sortBy, setSortBy] = useState('latest');
  const [viewMode, setViewMode] = useState('table');
  const [editingProduct, setEditingProduct] = useState(null);
  const [stockValues, setStockValues] = useState([]);
  const [savingStock, setSavingStock] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const [productsResponse, albumsResponse, giftsResponse] = await Promise.all([
          api.get('/products'),
          api.get('/albums'),
          api.get('/gift-boxes'),
        ]);

        setProducts(Array.isArray(productsResponse?.data?.data) ? productsResponse.data.data : []);
        setAlbums(Array.isArray(albumsResponse?.data?.data) ? albumsResponse.data.data : []);
        setGifts(Array.isArray(giftsResponse?.data?.data) ? giftsResponse.data.data : []);
      } catch (error) {
        console.error('Failed to load stock details:', error);
        setProducts([]);
        setAlbums([]);
        setGifts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, []);

  const stockRows = useMemo(() => {
    const productRows = products.map((product) => {
      const variants = parseVariantArray(product.size_variants);
      const currentStock = variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0);
      const firstVariant = variants[0] || {};
      const status = getStatusLabel(currentStock);
      const image = normalizeImageUrl(product.product_images?.[0] || product.frame_data?.frame_image || '');

      return {
        id: `product-${product.id || product.product_id || product.product_code || ''}`,
        type: 'product',
        product: product.product_name || 'Untitled Product',
        sku: product.product_id || product.product_code || '—',
        category: product.category || 'Uncategorized',
        price: Number(firstVariant.offer_price || product.selling_price || product.price || 0),
        offerPrice: Number(firstVariant.mrp || product.mrp || product.selling_price || 0),
        currentStock,
        available: currentStock,
        reserved: 0,
        status,
        lastUpdated: product.updated_at || product.created_at || '',
        image,
        rawData: product,
      };
    });

    const albumRows = albums.map((album) => {
      const variants = parseVariantArray(album.variants);
      const currentStock = getAlbumVariantStock(album);
      const status = getStatusLabel(currentStock);
      const image = normalizeImageUrl(
        album.product_images?.[0] ||
        album.thumbnail_image ||
        (Array.isArray(album.images) ? album.images[0] : '') ||
        (variants[0]?.image || variants[0]?.images?.[0] || '')
      );

      return {
        id: `album-${album.id || album.product_id || album.product_code || ''}`,
        type: 'album',
        product: album.product_name || 'Untitled Album',
        sku: album.product_code || album.product_id || album.id || '—',
        category: album.category || 'Albums',
        price: Number(album.discount_price || album.selling_price || album.price || 0),
        offerPrice: Number(album.mrp || album.selling_price || album.discount_price || 0),
        currentStock,
        available: currentStock,
        reserved: 0,
        status,
        lastUpdated: album.updated_at || album.created_at || '',
        image,
        rawData: album,
      };
    });

    const giftRows = gifts.map((gift) => {
      const currentStock = Number(gift.current_stock ?? gift.stock_quantity ?? gift.currentStock ?? 0);
      const status = getStatusLabel(currentStock);
      const image = normalizeImageUrl(gift.image || gift.images?.[0] || '');

      return {
        id: `gift-${gift.id || gift.gift_box_id || gift.product_id || ''}`,
        type: 'gift',
        product: gift.name || 'Untitled Gift Box',
        sku: gift.gift_box_id || gift.product_code || gift.id || '—',
        category: gift.category || 'Gift Boxes',
        price: Number(gift.selling_price || gift.mrp || 0),
        offerPrice: Number(gift.mrp || gift.selling_price || 0),
        currentStock,
        available: currentStock,
        reserved: 0,
        status,
        lastUpdated: gift.updated_at || gift.created_at || '',
        image,
        rawData: gift,
      };
    });

    return [...productRows, ...albumRows, ...giftRows];
  }, [products, albums, gifts]);

  const categories = [...new Set(stockRows.map((item) => item.category))].sort();
  const filteredRows = stockRows
    .filter((item) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch = item.product.toLowerCase().includes(query) || item.sku.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === 'All Categories' || item.category === selectedCategory;
      const matchesStatus = selectedStatus === 'All Stock Status' || item.status === selectedStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'stock-high') return b.currentStock - a.currentStock;
      if (sortBy === 'stock-low') return a.currentStock - b.currentStock;
      if (sortBy === 'name') return a.product.localeCompare(b.product);
      return new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0);
    });

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visiblePage = Math.min(currentPage, pageCount);
  const paginatedRows = filteredRows.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);

  const totalStock = stockRows.reduce((sum, item) => sum + item.currentStock, 0);
  const inStock = stockRows.filter((item) => item.status === 'In Stock').length;
  const lowStock = stockRows.filter((item) => item.status === 'Low Stock').length;
  const outOfStock = stockRows.filter((item) => item.status === 'Out of Stock').length;
  const statCards = [
    { title: 'Total Products', value: String(stockRows.length), sub: 'All products', inc: '10.7%', icon: <Package className="h-7 w-7 text-white" />, iconBg: 'bg-[#22c55e]', waveColor: '#22c55e' },
    { title: 'Total Stock (Units)', value: totalStock.toLocaleString('en-IN'), sub: 'Across all products', inc: '12.4%', icon: <ShoppingBag className="h-7 w-7 text-white" />, iconBg: 'bg-[#f59e0b]', waveColor: '#f59e0b' },
    { title: 'In Stock', value: String(inStock), sub: 'Products available', inc: '15.3%', icon: <Eye className="h-7 w-7 text-white" />, iconBg: 'bg-[#06b6d4]', waveColor: '#06b6d4' },
    { title: 'Low Stock', value: String(lowStock), sub: 'Reorder needed', inc: '9.2%', icon: <AlertTriangle className="h-7 w-7 text-white" />, iconBg: 'bg-[#a855f7]', waveColor: '#a855f7' },
    { title: 'Out of Stock', value: String(outOfStock), sub: 'Need attention', inc: '0%', icon: <Package className="h-7 w-7 text-white" />, iconBg: 'bg-[#f97316]', waveColor: '#f97316' },
  ];

  const openStockEditor = (row) => {
    setEditingProduct(row);
    setReportOpen(true);

    if (row.type === 'product') {
      const variants = Array.isArray(row.rawData?.size_variants) ? row.rawData.size_variants : [];
      setStockValues(variants.map((variant) => ({
        ...variant,
        stock: Number(variant.stock) || 0,
        add: 0,
      })));
      return;
    }

    if (row.type === 'album') {
      const variants = parseVariantArray(row.rawData?.variants);
      if (variants.length) {
        setStockValues(variants.map((variant) => ({
          ...variant,
          stock: Number(variant.stock ?? variant.quantity ?? 0) || 0,
          add: 0,
        })));
      } else {
        setStockValues([{ size: row.rawData?.size || 'Standard', color: '', stock: Number(row.rawData?.stock_quantity ?? row.currentStock ?? 0) || 0, add: 0 }]);
      }
      return;
    }

    if (row.type === 'gift') {
      const stock = Number(row.rawData?.current_stock ?? row.rawData?.stock_quantity ?? row.rawData?.currentStock ?? row.currentStock ?? 0);
      setStockValues([{ size: 'Gift Box', color: '', stock, add: 0 }]);
    }
  };

  const openStockReport = () => {
    setEditingProduct(null);
    setStockValues([]);
    setReportOpen(true);
  };

  const handleReportProductChange = (event) => {
    const row = stockRows.find((item) => String(item.id) === event.target.value);
    if (row) openStockEditor(row);
  };

  const updateStockValue = (index, value) => {
    const parsed = Math.max(0, Number(value) || 0);
    setStockValues((current) => current.map((variant, variantIndex) => (
      variantIndex === index ? { ...variant, add: parsed } : variant
    )));
  };

  const totalCurrentStock = stockValues.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  const totalAddedStock = stockValues.reduce((sum, variant) => sum + Number(variant.add || 0), 0);
  const totalProjectedStock = totalCurrentStock + totalAddedStock;

  const saveStock = async (event) => {
    event.preventDefault();
    if (!editingProduct) return;

    try {
      setSavingStock(true);

      if (editingProduct.type === 'product') {
        const productVariants = stockValues.map((variant) => {
          const oldStock = Number(variant.stock ?? 0);
          const addQty = Number(variant.add ?? 0);
          return {
            ...variant,
            stock: Math.max(0, oldStock + addQty),
          };
        });

        await api.put(`/products/${editingProduct.rawData?.id ?? editingProduct.id}`, {
          ...editingProduct.rawData,
          size_variants: productVariants,
        });
      }

      if (editingProduct.type === 'album') {
        const nextVariants = stockValues.map((variant) => {
          const oldStock = Number(variant.stock ?? variant.quantity ?? 0);
          const addQty = Number(variant.add ?? 0);
          return {
            ...variant,
            stock: Math.max(0, oldStock + addQty),
            quantity: Math.max(0, oldStock + addQty),
          };
        });
        const totalStock = nextVariants.reduce((sum, variant) => sum + Number(variant.stock || variant.quantity || 0), 0);

        await api.put(`/albums/${editingProduct.rawData?.product_id ?? editingProduct.rawData?.id ?? editingProduct.id}`, {
          ...editingProduct.rawData,
          variants: nextVariants,
          stock_quantity: totalStock,
          stock_status: totalStock <= 0 ? 'Out of Stock' : 'In Stock',
        });
      }

      if (editingProduct.type === 'gift') {
        const oldStock = Number(editingProduct.rawData?.current_stock ?? editingProduct.rawData?.stock_quantity ?? editingProduct.rawData?.currentStock ?? 0);
        const addQty = Number(stockValues[0]?.add ?? 0);
        const nextStock = Math.max(0, oldStock + addQty);

        await api.put(`/gift-boxes/${editingProduct.rawData?.gift_box_id ?? editingProduct.rawData?.id ?? editingProduct.id}`, {
          ...editingProduct.rawData,
          current_stock: nextStock,
          stock_status: nextStock <= 0 ? 'Out of Stock' : 'Available',
        });
      }

      toast.success('Stock updated successfully');
      setEditingProduct(null);
      setReportOpen(false);

      const [productsResponse, albumsResponse, giftsResponse] = await Promise.all([
        api.get('/products'),
        api.get('/albums'),
        api.get('/gift-boxes'),
      ]);

      setProducts(Array.isArray(productsResponse?.data?.data) ? productsResponse.data.data : []);
      setAlbums(Array.isArray(albumsResponse?.data?.data) ? albumsResponse.data.data : []);
      setGifts(Array.isArray(giftsResponse?.data?.data) ? giftsResponse.data.data : []);
    } catch (error) {
      console.error('Failed to update stock:', error);
      toast.error(error?.response?.data?.message || 'Failed to update stock');
    } finally {
      setSavingStock(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f1] p-4 md:p-6">
      <div className="mx-auto max-w-[1500px]">
       

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {statCards.map((stat, index) => (
            <div key={index} className="relative flex min-h-[170px] flex-col overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-1 items-start gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${stat.iconBg}`}>{stat.icon}</div>
                <div className="flex flex-col">
                  <p className="mb-1 text-xs font-medium text-gray-600">{stat.title}</p>
                  <h3 className="mb-3 text-2xl font-bold text-gray-900">{stat.value}</h3>
                  <div className="flex flex-col">
                    <div className="mb-1 flex items-center text-xs font-medium text-emerald-600">
                      <TrendingUp size={12} className="mr-1" />
                      <span>{stat.inc}</span>
                    </div>
                    <p className="text-[10px] text-gray-400">{stat.sub}</p>
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute bottom-0 left-0 h-8 w-full overflow-hidden">
                <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="h-full w-full opacity-40" style={{ color: stat.waveColor }} fill="currentColor">
                  <path d="M0,10 C30,25 70,0 100,10 L100,20 L0,20 Z" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[18px] border border-[#e7e0d8] bg-white p-3 shadow-[0_1px_0_rgba(16,24,40,0.02)]">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:flex-nowrap">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 lg:flex-nowrap">
              <div className="relative w-full max-w-[340px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7a7a]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => { setSearchTerm(event.target.value); setCurrentPage(1); }}
                  placeholder="Search products..."
                  className="h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-10 pr-3 text-[14px] text-[#2d2d2d] outline-none placeholder:text-[#8a8a8a] focus:border-[#d2bc8a]"
                />
              </div>

              <div className="flex w-full flex-wrap items-center justify-end gap-3 lg:ml-auto lg:w-auto lg:flex-nowrap">
              <select value={selectedCategory} onChange={(event) => { setSelectedCategory(event.target.value); setCurrentPage(1); }} className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none">
                <option>All Categories</option>
                {categories.map((category) => <option key={category}>{category}</option>)}
              </select>

              <select value={selectedStatus} onChange={(event) => { setSelectedStatus(event.target.value); setCurrentPage(1); }} className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none">
                <option>All Stock Status</option>
                <option>In Stock</option>
                <option>Low Stock</option>
                <option>Out of Stock</option>
              </select>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setCurrentPage(1); }} className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none">
                <option value="latest">Sort by: Latest</option>
                <option value="name">Name: A to Z</option>
                <option value="stock-high">Stock: High to Low</option>
                <option value="stock-low">Stock: Low to High</option>
              </select>

              <div className="flex overflow-hidden rounded-xl border border-[#dfe2e5] bg-[#faf9f8]">
                <button type="button" onClick={() => setViewMode('table')} className={`flex h-[46px] w-[46px] items-center justify-center border-r border-[#dfe2e5] ${viewMode === 'table' ? 'bg-[#1a3c36] text-white' : 'text-[#4d4d4d] hover:bg-white'}`} aria-label="Table view" title="Table view">
                  <Table2 className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setViewMode('card')} className={`flex h-[46px] w-[46px] items-center justify-center ${viewMode === 'card' ? 'bg-[#1a3c36] text-white' : 'text-[#4d4d4d] hover:bg-white'}`} aria-label="Card view" title="Card view">
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
               <button type="button" onClick={openStockReport} className="inline-flex h-[46px] items-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-[15px] font-semibold text-white shadow-[0_6px_14px_rgba(26,60,54,0.18)] transition hover:bg-[#214a42]">
              <span className="text-lg">+</span>
              Stock Report
            </button>
         
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-[#777]">Loading stock details...</div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[#e6ddd1] bg-[#faf9f8] py-16 text-center text-sm text-[#777]">No stock records found.</div>
          ) : viewMode === 'card' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {paginatedRows.map((item) => (
                <div key={item.id} className="rounded-xl border border-[#e7e0d8] bg-[#fdfdfc] p-4 shadow-sm">
                  <div className="mb-4 flex h-40 items-center justify-center overflow-hidden rounded-lg bg-[#f5f1ec]">
                    {item.image ? <img src={item.image} alt={item.product} className="h-full w-full object-contain" /> : <Package className="h-12 w-12 text-[#b5a998]" />}
                  </div>
                  <h3 className="truncate text-base font-semibold text-[#1f1f1f]">{item.product}</h3>
                  <p className="mt-1 text-[11px] font-medium text-[#666]">SKU: <span className="font-mono text-[#7a7a7a]">{item.sku}</span></p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="font-bold text-[#1e1e1e]">Stock: {item.currentStock}</span>
                    <span className="text-[#666]">{item.category}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'In Stock' ? 'bg-[#edf7f1] text-[#2d7b5a]' : item.status === 'Low Stock' ? 'bg-[#fff2df] text-[#c77f11]' : 'bg-[#fde7e7] text-[#d94d4d]'}`}>
                      <span className="h-2 w-2 rounded-full bg-current" />{item.status}
                    </span>
                    <button type="button" onClick={() => openStockEditor(item)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] hover:border-[#d0b997] hover:text-[#1a1a1a]" aria-label={`Edit stock for ${item.product}`} title="Edit stock">
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div className="w-full overflow-x-auto rounded-[16px] border border-[#e8e4df]">
            <table className="w-full min-w-[1200px] border-collapse bg-white text-left">
              <thead className="bg-[#f0e6d2] text-left text-sm font-semibold text-[#3d3d3d]">
                <tr>
                  <th className="px-4 py-4">S.No</th>
                  <th className="px-4 py-4">Product</th>
                  
                  <th className="px-4 py-4">Category</th>
                  <th className="px-4 py-4">Price</th>
                  <th className="px-4 py-4">Stock</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((item, index) => (
                  <tr key={item.id} className="border-t border-[#efefef] text-[13px] text-[#444444]">
                    <td className="px-4 py-4">{index + 1}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-[#e7e0d8] bg-[#f5f1ec]">
                          {item.image ? <img src={item.image} alt={item.product} className="h-full w-full object-contain" /> : <Package className="h-5 w-5 text-[#b5a998]" />}
                        </div>
                        <div>
                          <div className="font-medium text-[#202020]">{item.product}</div>
                          <div>{item.sku}</div>
                        </div>
                       
                      </div>
                    </td>
                    
                    <td className="px-4 py-4">{item.category}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-[#1d1d1d]">₹{item.price.toLocaleString('en-IN')}</div>
                      <div className="text-[11px] text-[#7a7a7a] line-through">₹{item.offerPrice.toLocaleString('en-IN')}</div>
                    </td>
                    <td className="px-4 py-4">{item.currentStock}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        item.status === 'In Stock'
                          ? 'bg-[#eaf7ef] text-[#2b7a4b]'
                          : item.status === 'Low Stock'
                            ? 'bg-[#fff2df] text-[#c77f11]'
                            : 'bg-[#fde7e7] text-[#d94d4d]'
                      }`}>
                        <span className={`mr-1.5 h-2 w-2 rounded-full ${
                          item.status === 'In Stock'
                            ? 'bg-[#2b7a4b]'
                            : item.status === 'Low Stock'
                              ? 'bg-[#c77f11]'
                              : 'bg-[#d94d4d]'
                        }`} />
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => openStockEditor(item)} className="rounded-lg border border-[#e7e0d8] bg-white p-2 text-[#4d4d4d] hover:bg-[#f8f6f3]" aria-label={`Edit stock for ${item.product}`} title="Edit stock">
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          <div className="mt-4 flex items-center justify-between text-[12px] text-[#666]">
            <span>Showing {filteredRows.length === 0 ? 0 : ((visiblePage - 1) * pageSize) + 1} to {Math.min(visiblePage * pageSize, filteredRows.length)} of {filteredRows.length} products</span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={visiblePage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7e0d8] bg-white text-[#666] disabled:cursor-not-allowed disabled:opacity-40">&lt;</button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                <button type="button" key={page} onClick={() => setCurrentPage(page)} className={`flex h-8 w-8 items-center justify-center rounded-lg ${visiblePage === page ? 'bg-[#1d3d36] text-white' : 'border border-[#e7e0d8] bg-white text-[#666]'}`}>{page}</button>
              ))}
              <button type="button" disabled={visiblePage === pageCount} onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7e0d8] bg-white text-[#666] disabled:cursor-not-allowed disabled:opacity-40">&gt;</button>
            </div>
          </div>
        </div>
      </div>

      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={saveStock} className="w-full max-w-lg rounded-2xl border border-[#e7e0d8] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#f0ebe3] pb-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[#777]">Stock report</p>
                <h2 className="mt-1 text-xl font-bold text-[#202020]">Select product and update stock</h2>
              </div>
              <button type="button" onClick={() => { setEditingProduct(null); setReportOpen(false); }} className="text-2xl leading-none text-[#777] hover:text-[#222]" aria-label="Close stock editor">&times;</button>
            </div>

            <label className="mb-4 block text-sm font-semibold text-[#333]">
              Product
              <select value={editingProduct?.id || ''} onChange={handleReportProductChange} className="mt-2 h-11 w-full rounded-lg border border-[#dfe2e5] bg-white px-3 text-sm font-normal outline-none focus:border-[#1a3c36]">
                <option value="">Select a product</option>
                {stockRows.map((row) => <option key={row.id} value={row.id}>{row.product} ({row.sku})</option>)}
              </select>
            </label>

            {!editingProduct ? (
              <p className="rounded-xl bg-[#faf9f8] p-4 text-sm text-[#666]">Select a product to view and update its stock.</p>
            ) : stockValues.length === 0 ? (
              <p className="rounded-xl bg-[#faf9f8] p-4 text-sm text-[#666]">No size variants are available for this product.</p>
            ) : (
              <div className="space-y-3">
                <div className="mb-3 flex items-center justify-between rounded-xl border border-[#e7e0d8] bg-[#faf9f8] px-4 py-3 text-sm">
                  <span className="text-[#666] font-semibold">Total Stock</span>
                  <span className="font-bold text-[#1a3c36]">{totalProjectedStock}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#e7e0d8] bg-[#faf9f8] p-3 text-xs">
                  <div>
                    <span className="block text-[#777]">Current</span>
                    <span className="block font-bold text-[#222]">{totalCurrentStock}</span>
                  </div>
                  <div>
                    <span className="block text-[#777]">Add</span>
                    <span className="block font-bold text-[#222]">{totalAddedStock}</span>
                  </div>
                  <div>
                    <span className="block text-[#777]">Updated</span>
                    <span className="block font-bold text-[#1a3c36]">{totalProjectedStock}</span>
                  </div>
                </div>
                {stockValues.map((variant, index) => (
                  <label key={index} className="flex items-center justify-between gap-4 rounded-xl border border-[#e7e0d8] bg-[#faf9f8] p-3">
                    <span>
                      <span className="block text-sm font-semibold text-[#222]">{getVariantDisplayLabel(variant, index)}</span>
                      <span className="text-xs text-[#777]">Current stock: {variant.stock}</span>
                    </span>
                    <div className="flex flex-col items-end gap-1">
                      <input
                        type="number"
                        min="0"
                        value={variant.add}
                        onChange={(event) => updateStockValue(index, event.target.value)}
                        className="h-10 w-24 rounded-lg border border-[#dfe2e5] bg-white px-3 text-right text-sm font-semibold outline-none focus:border-[#1a3c36]"
                        aria-label={`Add stock for ${getVariantDisplayLabel(variant, index)}`}
                      />
                      <span className="text-[10px] text-[#777]">Add units</span>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => { setEditingProduct(null); setReportOpen(false); }} className="rounded-xl border border-[#dfe2e5] bg-white px-4 py-2 text-sm font-semibold text-[#555] hover:bg-[#faf9f8]">Cancel</button>
              <button type="submit" disabled={savingStock || !editingProduct || stockValues.length === 0} className="rounded-xl bg-[#1a3c36] px-5 py-2 text-sm font-semibold text-white hover:bg-[#214a42] disabled:cursor-not-allowed disabled:opacity-60">
                {savingStock ? 'Updating...' : 'Update Stock'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default StockDetails;
