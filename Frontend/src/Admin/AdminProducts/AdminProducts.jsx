import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDownUp,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Frame,
  IndianRupee,
  Layers,
  LayoutGrid,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Table2,
  TrendingUp,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';

const AdminProducts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [productsList, setProductsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(
    location.pathname === '/admin/gifts' ? 'Gift' : 'All Categories'
  );
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [sortBy, setSortBy] = useState('latest');
  const [viewMode, setViewMode] = useState('table');
  const [selectedProductView, setSelectedProductView] = useState(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      if (res.data?.data && Array.isArray(res.data.data)) {
        // Map database products
        const mapped = res.data.data.map((p) => {
          const firstVariant = p.size_variants?.[0] || {};
          const totalStock = (p.size_variants || []).reduce(
            (acc, curr) => acc + (Number(curr.stock) || 0),
            0
          );
          const minOfferPrice = firstVariant.offer_price ? `₹${firstVariant.offer_price}` : '₹--';
          const minMrp = firstVariant.mrp ? `₹${firstVariant.mrp}` : '';

          // Prefer composite image (product_images[0]), then frame image
          const primaryImg = p.product_images?.[0] || p.frame_data?.frame_image || '';

          return {
            id: p.id,
            uuid: p.uuid,
            name: p.product_name,
            code: p.product_id,
            category: p.category,
            price: minOfferPrice,
            oldPrice: minMrp,
            stock: totalStock,
            stockLabel: totalStock <= 15 ? 'Low Stock' : 'In Stock',
            status: p.status || 'Active',
            views: 0,
            image: primaryImg,
            rawData: p,
            isDbProduct: true,
          };
        });
        setProductsList(mapped);
      } else {
        setProductsList([]);
      }
    } catch (err) {
      console.warn('Could not fetch products from database:', err);
      setProductsList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setCategoriesList(list);
      } catch (err) {
        console.warn('Could not fetch categories:', err);
      }
    };

    fetchCategories();
    fetchProducts();
  }, []);

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  const filteredProducts = productsList
    .filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'All Categories' ||
        (selectedCategory === 'Gift'
          ? p.category.toLowerCase().includes('gift')
          : p.category === selectedCategory);

      const matchesStatus =
        selectedStatus === 'All Status' ||
        (selectedStatus === 'Active' && p.status === 'Active') ||
        (selectedStatus === 'Inactive' && p.status !== 'Active');

      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'latest') {
        return (b.id || 0) - (a.id || 0);
      }

      if (sortBy === 'low-stock') {
        return (a.stock || 0) - (b.stock || 0);
      }

      if (sortBy === 'price-high') {
        return Number(b.rawData?.size_variants?.[0]?.offer_price || 0) - Number(a.rawData?.size_variants?.[0]?.offer_price || 0);
      }

      if (sortBy === 'price-low') {
        return Number(a.rawData?.size_variants?.[0]?.offer_price || 0) - Number(b.rawData?.size_variants?.[0]?.offer_price || 0);
      }

      return 0;
    });

  const activeProducts = productsList.filter((p) => (p.status || 'Active') === 'Active').length;
  const totalUnitsInStock = productsList.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const totalProductAmount = productsList.reduce((sum, p) => {
    const variants = Array.isArray(p.rawData?.size_variants) ? p.rawData.size_variants : [];
    const value = variants.reduce((variantSum, variant) => {
      const offerPrice = Number(variant.offer_price || 0);
      const stock = Number(variant.stock || 0);
      return variantSum + (offerPrice * stock);
    }, 0);

    return sum + value;
  }, 0);

  const statCards = [
    {
      title: 'No of Products',
      value: String(productsList.length || 0),
      inc: productsList.length > 0 ? '18.6%' : '0%',
      icon: <PackageCheck className="h-7 w-7 text-white" />,
      iconBg: 'bg-[#22c55e]',
      waveColor: '#22c55e',
    },
    {
      title: 'Active Products',
      value: String(activeProducts),
      inc: productsList.length > 0 ? '12.4%' : '0%',
      icon: <ShoppingBag className="h-7 w-7 text-white" />,
      iconBg: 'bg-[#f59e0b]',
      waveColor: '#f59e0b',
    },
    {
      title: 'Total Orders',
      value: String(Math.max(totalUnitsInStock, productsList.length || 0)),
      inc: productsList.length > 0 ? '15.3%' : '0%',
      icon: <Users className="h-7 w-7 text-white" />,
      iconBg: 'bg-[#06b6d4]',
      waveColor: '#06b6d4',
    },
    {
      title: 'Total Amount',
      value: `₹${totalProductAmount.toLocaleString('en-IN')}`,
      inc: productsList.length > 0 ? '10.7%' : '0%',
      icon: <IndianRupee className="h-7 w-7 text-white" />,
      iconBg: 'bg-[#a855f7]',
      waveColor: '#a855f7',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f2f3f0] p-4 md:p-6">
      <div className="mx-auto max-w-[1500px]">
        {/* ================= TOP TOOLBAR ================= */}
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[2.1rem] font-bold tracking-[-0.05em] text-[#1f1d1b]">Products</h1>
            <p className="mt-2 text-[13px] text-[#646464]">
              Dashboard <span className="mx-2 text-[#9a9a9a]">&gt;</span> <span className="font-medium text-[#2a2a2a]">Products</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">

            {/* ADD NEW PRODUCT BUTTON */}
            <Link
              to="/admin/products/add"
              className="inline-flex h-[46px] items-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-[15px] font-semibold text-white shadow-[0_6px_14px_rgba(26,60,54,0.18)] transition hover:bg-[#214a42]"
            >
              <Plus className="h-4 w-4" />
              Add New Product
            </Link>
          </div>
        </div>

        {/* ================= STAT CARDS ================= */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="relative flex h-full min-h-[170px] flex-col overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-1 items-start gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${stat.iconBg}`}
                >
                  {stat.icon}
                </div>

                <div className="flex flex-col">
                  <p className="mb-1 text-xs font-medium text-gray-600">{stat.title}</p>
                  <h3 className="mb-3 text-2xl font-bold text-gray-900">{stat.value}</h3>
                  <div className="flex flex-col">
                    <div className="mb-1 flex items-center text-xs font-medium text-emerald-600">
                      <TrendingUp size={12} className="mr-1" />
                      <span>{stat.inc}</span>
                    </div>
                    <p className="text-[10px] text-gray-400">from last month</p>
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-0 left-0 h-8 w-full overflow-hidden">
                <svg
                  viewBox="0 0 100 20"
                  preserveAspectRatio="none"
                  className="h-full w-full opacity-40"
                  style={{ color: stat.waveColor }}
                  fill="currentColor"
                >
                  <path d="M0,10 C30,25 70,0 100,10 L100,20 L0,20 Z" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* ================= TABLE CARD ================= */}
        <div className="rounded-[18px] border border-[#e7e0d8] bg-white p-4 shadow-[0_1px_0_rgba(16,24,40,0.02)]">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative w-full max-w-[340px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7a7a]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products by name or code..."
                  className="h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-10 pr-3 text-[14px] text-[#2d2d2d] outline-none placeholder:text-[#8a8a8a] focus:border-[#d2bc8a]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]"
              >
                <option value="All Categories">All Categories</option>
                <option value="Gift">Gifts</option>
                {categoriesList.map((cat) => (
                  <option key={cat.category_id || cat.id} value={cat.category_name}>
                    {cat.category_name}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]"
              >
                <option value="All Status">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              
              </div>
            </div>

            <div className="flex items-center gap-3 lg:shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]"
              >
                <option value="latest">Sort by: Latest</option>
                <option value="low-stock">Low Stock</option>
                <option value="price-high">Price: High to Low</option>
                <option value="price-low">Price: Low to High</option>
              </select>

              <div className="flex overflow-hidden rounded-xl border border-[#dfe2e5] bg-[#faf9f8]">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`flex h-[46px] w-[46px] items-center justify-center border-r border-[#dfe2e5] ${viewMode === 'table' ? 'bg-[#1a3c36] text-white' : 'text-[#4d4d4d] hover:bg-white'}`}
                  aria-label="Table view"
                  title="Table view"
                >
                  <Table2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  className={`flex h-[46px] w-[46px] items-center justify-center ${viewMode === 'card' ? 'bg-[#1a3c36] text-white' : 'text-[#4d4d4d] hover:bg-white'}`}
                  aria-label="Card view"
                  title="Card view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-[#777]">
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[#e6ddd1] bg-[#faf9f8] py-16 text-center">
              <div className="mb-3 text-5xl">📦</div>
              <h3 className="text-base font-bold text-[#333]">No Products Found</h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-[#888]">
                {searchTerm
                  ? 'No products match your search keyword.'
                  : 'No products are currently in your store. Click "Add New Product" to create your first product.'}
              </p>
              <Link
                to="/admin/products/add"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1a3c36] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#235048]"
              >
                <Plus className="h-4 w-4" />
                Add New Product
              </Link>
            </div>
          ) : (
            <>
              {viewMode === 'card' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {filteredProducts.map((product, index) => (
                    <div key={product.id || index} className="rounded-xl border border-[#e7e0d8] bg-[#fdfdfc] p-4 shadow-sm">
                      <div className="mb-4 flex h-40 items-center justify-center overflow-hidden rounded-lg bg-[#f5f1ec]">
                        {product.image && (product.image.startsWith('http') || product.image.startsWith('/')) ? (
                          <img src={product.image} alt={product.name} className="h-full w-full object-contain" />
                        ) : (
                          <div className="h-20 w-20 rounded-lg border border-[#d9c5a7]" style={{ background: product.image || '#eee' }} />
                        )}
                      </div>
                      <h3 className="truncate text-base font-semibold text-[#1f1f1f]">{product.name}</h3>
                      <p className="mt-1 font-mono text-xs text-[#7a7a7a]">{product.code}</p>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="font-bold text-[#1e1e1e]">{product.price}</span>
                        <span className="text-[#666]">Stock: {product.stock}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf7f1] px-2.5 py-1 text-xs font-semibold text-[#2d7b5a]">
                          <span className="h-2 w-2 rounded-full bg-[#2d7b5a]" />
                          {product.status}
                        </span>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => navigate(`/admin/products/edit/${product.id}`)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white" aria-label="Edit product photos" title="Edit product photos"><Upload className="h-4 w-4" /></button>
                          <button type="button" onClick={() => handleDeleteProduct(product.id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3d7d7] bg-[#fff8f8] text-[#d04d4d]" aria-label="Delete product" title="Delete product"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
              <div className="overflow-hidden rounded-md border border-[#e8e4df]">
                <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-[#f0e6d2] text-left text-sm font-semibold text-[#3d3d3d]">
                      <th className="px-4 py-4">S.No</th>
                      <th className="px-4 py-4">Product</th>
                      <th className="px-4 py-4">Category</th>
                      <th className="px-4 py-4">Price</th>
                      <th className="px-4 py-4">Stock</th>
                      <th className="px-4 py-4">Status</th>
                      {/* <th className="px-4 py-4">Views</th> */}
                      <th className="px-4 py-4">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredProducts.map((product, index) => {
                      const lowStock = product.stock <= 18;
                      const stockClass = lowStock ? 'bg-[#fff0f0] text-[#d04d4d]' : 'bg-[#eaf7ee] text-[#2d7b5a]';

                      return (
                        <tr key={product.id || index} className="border-t border-[#f0ebe6] align-middle">
                          <td className="px-4 py-4">{index + 1}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-[#e7e0d8] bg-[#f5f1ec]">
                                {product.image && (product.image.startsWith('http') || product.image.startsWith('/')) ? (
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  <div
                                    className="h-11 w-11 rounded-lg border border-[#d9c5a7] shadow-inner"
                                    style={{ background: product.image || '#eee' }}
                                  />
                                )}
                              </div>
                              <div>
                                <div className="text-lg font-semibold text-[#1f1f1f]">{product.name}</div>
                                <div className="text-sm font-mono text-[#7a7a7a]">{product.code}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-sm text-[#4d4d4d]">{product.category}</td>

                          <td className="px-4 py-4">
                            <div className="text-lg font-bold text-[#1e1e1e]">{product.price}</div>
                            {product.oldPrice && (
                              <div className="text-xs text-[#8a8a8a] line-through">{product.oldPrice}</div>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="text-sm font-medium text-[#333]">{product.stock}</div>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${stockClass}`}>
                                {product.stockLabel}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-2 rounded-full bg-[#edf7f1] px-2.5 py-1 text-xs font-semibold text-[#2d7b5a]">
                              <span className="h-2 w-2 rounded-full bg-[#2d7b5a]" />
                              {product.status}
                            </span>
                          </td>

                          {/* <td className="px-4 py-4 text-sm font-medium text-[#313131]">{product.views}</td> */}

                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/admin/products/edit/${product.id}`)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997] hover:text-[#1a1a1a]"
                                aria-label="Edit product"
                                title="Edit product"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedProductView(product)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997] hover:text-[#1a1a1a]"
                                aria-label="View product"
                                title="View product details & frame layout"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(product.id)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#f3d7d7] bg-[#fff8f8] text-[#d04d4d] transition hover:bg-[#fff0f0]"
                                aria-label="Delete product"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
              )}

              <div className="mt-6 flex flex-col gap-3 border-t border-[#efebe7] pt-4 text-sm text-[#6a6a6a] md:flex-row md:items-center md:justify-between">
                <span>Showing {filteredProducts.length} of {productsList.length} products</span>

                <div className="flex items-center gap-2">
                  <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e3dbd2] bg-white text-[#7d7d7d]">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#173b35] text-white">
                    1
                  </button>
                  <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e3dbd2] bg-white text-[#7d7d7d]">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ================= PRODUCT PREVIEW MODAL ================= */}
        {selectedProductView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-[#e8dfd2] bg-white p-6 shadow-2xl">
              <button
                type="button"
                onClick={() => setSelectedProductView(null)}
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f0eb] text-[#444] hover:bg-[#e8e2d8]"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3 border-b border-[#f0ebe3] pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f3ef] text-[#1a3c36]">
                  <Frame className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#202020]">
                    {selectedProductView.name}
                  </h2>
                  <p className="text-xs font-mono text-[#888]">
                    {selectedProductView.code} • {selectedProductView.category}
                  </p>
                </div>
              </div>

              {/* PRODUCT IMAGE & FRAME COMPOSITE */}
              <div className="my-5 flex items-center justify-center rounded-2xl border border-[#e8dfd2] bg-[#f7f4ee] p-4">
                {selectedProductView.image && (selectedProductView.image.startsWith('http') || selectedProductView.image.startsWith('/')) ? (
                  <img
                    src={selectedProductView.image}
                    alt={selectedProductView.name}
                    className="max-h-[340px] rounded-lg object-contain shadow-md"
                  />
                ) : (
                  <div className="h-48 w-48 rounded-xl" style={{ background: selectedProductView.image }} />
                )}
              </div>

              {/* SIZE VARIANTS */}
              {selectedProductView.rawData?.size_variants && (
                <div className="mb-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#666]">
                    Available Sizes & Pricing
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {selectedProductView.rawData.size_variants.map((v, i) => (
                      <div key={i} className="rounded-xl border border-[#e8e2d8] bg-[#faf8f5] p-2.5 text-xs">
                        <p className="font-bold text-[#222]">{v.size}</p>
                        <p className="mt-1 font-bold text-[#1a3c36]">₹{v.offer_price} <span className="font-normal text-[#888] line-through">₹{v.mrp}</span></p>
                        <p className="text-[10px] text-[#666]">Stock: {v.stock}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedProductView(null)}
                  className="rounded-xl bg-[#1a3c36] px-6 py-2 text-xs font-bold text-white hover:bg-[#235048]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;
