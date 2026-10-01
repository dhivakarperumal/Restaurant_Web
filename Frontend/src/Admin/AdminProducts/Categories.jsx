import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Grid2x2,
  ImageIcon,
  LayoutGrid,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Table2,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import api from '../../api';

const normalizeImageUrl = (value) => {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  
  const rawApiUrl = import.meta.env.VITE_API_URL || '/api';
  const baseUrl = rawApiUrl.replace(/\/api\/?$/, ''); // Remove trailing /api
  const relativePath = value.startsWith('/') ? value : `/${value}`;
  return `${baseUrl}${relativePath}`;
};

const AdminCategories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedParent, setSelectedParent] = useState('All Parent Categories');
  const [sortBy, setSortBy] = useState('latest');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const [categoryResponse, productResponse] = await Promise.all([
        api.get('/categories'),
        api.get('/products'),
      ]);
      const items = Array.isArray(categoryResponse?.data?.data) ? categoryResponse.data.data : [];
      const productItems = Array.isArray(productResponse?.data?.data) ? productResponse.data.data : [];
      setCategories(items);
      setProducts(productItems);
      setError('');
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError(err?.response?.data?.message || 'Unable to load categories right now.');
      setCategories([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDeleteCategory = async (categoryId) => {
    if (!categoryId) return;
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      await api.delete(`/categories/${categoryId}`);
      await fetchCategories();
    } catch (err) {
      console.error('Failed to delete category:', err);
      alert(err?.response?.data?.message || 'Failed to delete category.');
    }
  };

  const listData = useMemo(() => {
    const productCounts = products.reduce((counts, product) => {
      const categoryName = String(product.category || '').trim().toLowerCase();
      if (categoryName) counts[categoryName] = (counts[categoryName] || 0) + 1;
      return counts;
    }, {});

    return categories.map((item, index) => ({
        id: item.category_id || `CAT${index + 1}`,
        name: item.category_name || 'Untitled Category',
        subCategories: Array.isArray(item.sub_categories) ? item.sub_categories : [],
        products: productCounts[String(item.category_name || '').trim().toLowerCase()] || 0,
        status: item.status === 'Inactive' ? 'Inactive' : 'Active',
        parentCategory: item.parent_category || item.parent_category_name || '',
        sortOrder: item.sort_order || index + 1,
        createdAt: item.created_date ? new Date(item.created_date).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) : '—',
        image: normalizeImageUrl(item.category_image || ''),
      }));
  }, [categories, products]);

  const activeCount = listData.filter((item) => item.status === 'Active').length;
  const latestCategory = listData[0];
  const parentCategories = [...new Set(listData.map((item) => item.parentCategory).filter(Boolean))];
  const filteredCategories = listData
    .filter((item) => {
      const searchValue = searchTerm.toLowerCase();
      const matchesSearch = [item.name, ...item.subCategories].some((value) =>
        String(value).toLowerCase().includes(searchValue)
      );
      const matchesStatus = selectedStatus === 'All Status' || item.status === selectedStatus;
      const matchesParent = selectedParent === 'All Parent Categories' || item.parentCategory === selectedParent;
      return matchesSearch && matchesStatus && matchesParent;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'products-high') return b.products - a.products;
      if (sortBy === 'products-low') return a.products - b.products;
      return a.sortOrder - b.sortOrder;
    });
  const statValues = [
    { title: 'Total Categories', value: String(listData.length), inc: '10.7%', icon: <Grid2x2 className="h-7 w-7 text-white" />, iconBg: 'bg-[#22c55e]', waveColor: '#22c55e' },
    { title: 'Active Categories', value: String(activeCount), inc: '9.2%', icon: <PackageCheck className="h-7 w-7 text-white" />, iconBg: 'bg-[#f59e0b]', waveColor: '#f59e0b' },
    { title: 'Total Products', value: String(listData.reduce((sum, item) => sum + Number(item.products || 0), 0)), inc: '12.4%', icon: <ShoppingBag className="h-7 w-7 text-white" />, iconBg: 'bg-[#06b6d4]', waveColor: '#06b6d4' },
    { title: 'Latest Category', value: String(latestCategory?.products || 0), inc: '12.5%', sub: latestCategory?.name || 'No categories yet', icon: <Grid2x2 className="h-7 w-7 text-white" />, iconBg: 'bg-[#a855f7]', waveColor: '#a855f7' },
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f1] p-4 md:p-6">
      <div className="mx-auto max-w-[1500px]">
      

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statValues.map((stat, index) => (
            <div
              key={index}
              className="relative flex h-full min-h-[170px] flex-col overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-1 items-start gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${stat.iconBg}`}>
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
                    <p className="text-[10px] text-gray-400">{stat.sub || 'from last month'}</p>
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

        <div className="rounded-[18px] border border-[#e7e0d8] bg-white p-3 shadow-[0_1px_0_rgba(16,24,40,0.02)]">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              <div className="relative w-full max-w-[340px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7a7a]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search categories..."
                  className="h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-10 pr-3 text-[14px] text-[#2d2d2d] outline-none placeholder:text-[#8a8a8a] focus:border-[#d2bc8a]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
              <select
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]"
              >
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>

             
              </div>
            </div>

            <div className="flex items-center gap-3 lg:shrink-0">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="h-[46px] rounded-xl border border-[#dfe2e5] bg-[#faf9f8] px-3 text-[14px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]"
              >
                <option value="latest">Sort by: Latest</option>
                <option value="name">Name: A to Z</option>
                <option value="products-high">Products: High to Low</option>
                <option value="products-low">Products: Low to High</option>
              </select>

              <div className="flex overflow-hidden rounded-xl border border-[#dfe2e5] bg-[#faf9f8]">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`flex h-[46px] w-[46px] items-center justify-center border-r border-[#dfe2e5] transition ${
                    viewMode === 'table' ? 'bg-[#1a3c36] text-white' : 'text-[#4d4d4d] hover:bg-white'
                  }`}
                  aria-label="Table view"
                >
                  <Table2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  className={`flex h-[46px] w-[46px] items-center justify-center transition ${
                    viewMode === 'card' ? 'bg-[#1a3c36] text-white' : 'text-[#4d4d4d] hover:bg-white'
                  }`}
                  aria-label="Card view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
              <Link
              to="/admin/products/categories/add"
              className="inline-flex h-[46px] items-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-[15px] font-semibold text-white shadow-[0_6px_14px_rgba(26,60,54,0.18)] transition hover:bg-[#214a42]"
            >
              <Plus className="h-4 w-4" />
              Add New Category
            </Link>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-[#f2d7d7] bg-[#fff5f5] px-4 py-3 text-sm text-[#a23939]">
              {error}
            </div>
          )}

          {!loading && !listData.length && !error ? (
            <div className="rounded-2xl border border-dashed border-[#e7e0d8] bg-[#faf8f5] p-10 text-center text-[#666]">
              No categories found yet.
            </div>
          ) : (
            <>
              {viewMode === 'card' ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {filteredCategories.map((category, index) => (
                    <div key={category.id || index} className="rounded-[18px] border border-[#e7e0d8] bg-[#fdfdfc] p-4 shadow-[0_1px_0_rgba(16,24,40,0.02)] transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className={`flex h-[42px] w-[42px] items-center justify-center rounded-xl ${index % 2 === 0 ? 'bg-[#f4e4d1] text-[#a05c2a]' : 'bg-[#dfeaf8] text-[#3f7db8]'}`}>
                          {category.image ? (
                            <img src={category.image} alt={category.name} className="h-full w-full rounded-xl object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5" />
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/products/categories/edit/${category.id}`)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7e0d8] bg-white text-[#4d4d4d] hover:bg-[#f8f6f3]"
                            aria-label={`Edit ${category.name}`}
                            title="Edit category"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(category.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f1d8d8] bg-[#fff5f5] text-[#d94848] hover:bg-[#ffeded]"
                            aria-label={`Delete ${category.name}`}
                            title="Delete category"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="text-[16px] font-semibold text-[#1e1e1e]">{category.name}</div>
                      <div className="mt-1 text-[13px] text-[#646464]">{category.products} Products</div>

                      <div className="mt-3 flex items-center gap-2 text-[12px] text-[#2f7a4a]">
                        <span className={`h-2 w-2 rounded-full ${category.status === 'Active' ? 'bg-[#2f7a4a]' : 'bg-[#b85c5c]'}`} />
                        {category.status}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {category.subCategories.length ? category.subCategories.map((subCategory) => (
                          <span key={subCategory} className="mt-8 rounded-full bg-[#fff7e9] px-2 py-1 text-[11px] text-[#8b5f22]">
                            {subCategory}
                          </span>
                        )) : <span className="text-[12px] text-[#888]">No subcategories</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-0 overflow-hidden rounded-[16px] border border-[#e8e4df]">
                  <table className="w-full min-w-[760px] border-collapse bg-white text-left">
                    <thead className="bg-[#f0e6d2] text-left text-sm font-semibold text-[#3d3d3d]">
                      <tr>
                        <th className="px-4 py-4">S.No</th>
                        <th className="px-4 py-4">Category</th>
                        <th className="px-4 py-4">Subcategories</th>
                        <th className="px-4 py-4">Products</th>
                        <th className="px-4 py-4">Status</th>
                        <th className="px-4 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCategories.map((item, idx) => (
                        <tr key={item.id || idx} className="border-t border-[#efefef] text-[13px] text-[#444444]">
                          <td className="px-4 py-4 font-medium text-[#2d2d2d]">{idx + 1}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-[32px] w-[32px] items-center justify-center rounded-lg bg-[#f5efe5] text-[#a05c2a]">
                                {item.image ? (
                                  <img src={item.image} alt={item.name} className="h-full w-full rounded-lg object-cover" />
                                ) : (
                                  <ImageIcon className="h-4 w-4" />
                                )}
                              </div>
                              <span className="font-medium text-[#202020]">{item.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-[#5d5d5d]">
                            {item.subCategories.length ? item.subCategories.join(', ') : 'No subcategories'}
                          </td>
                          <td className="px-4 py-4">{item.products}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${item.status === 'Active' ? 'bg-[#eaf7ef] text-[#2b7a4b]' : 'bg-[#fdf1f1] text-[#b85c5c]'}`}>
                              <span className={`mr-1.5 h-2 w-2 rounded-full ${item.status === 'Active' ? 'bg-[#2b7a4b]' : 'bg-[#b85c5c]'}`} />
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/admin/products/categories/edit/${item.id}`)}
                                className="rounded-lg border border-[#e7e0d8] bg-white p-2 text-[#4d4d4d] hover:bg-[#f8f6f3]"
                                aria-label={`Edit ${item.name}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(item.id)}
                                className="rounded-lg border border-[#f1d8d8] bg-[#fff5f5] p-2 text-[#d94848] hover:bg-[#ffeded]"
                                aria-label={`Delete ${item.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
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
                <span>{loading ? 'Loading categories...' : `Showing ${filteredCategories.length} of ${listData.length} categories`}</span>
                <div className="flex items-center gap-2">
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7e0d8] bg-white text-[#666]">&lt;</button>
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1d3d36] text-white">1</button>
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7e0d8] bg-white text-[#666]">&gt;</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCategories;
