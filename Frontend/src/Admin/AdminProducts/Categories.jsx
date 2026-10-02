import { useEffect, useMemo, useState } from 'react';
import {
  ImageIcon,
  ImagePlus,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Table2,
  Trash2,
  X,
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
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [sortBy, setSortBy] = useState('latest');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGeneratingCategoryId, setIsGeneratingCategoryId] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [newSubcategory, setNewSubcategory] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [categoryForm, setCategoryForm] = useState({
    categoryId: '',
    categoryName: '',
    description: '',
    subcategories: [],
    image: '',
    status: 'Active',
  });
  const [modalError, setModalError] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const categoryResponse = await api.get('/categories');
      const productResponse = await api.get('/products').catch(() => null);
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

  useEffect(() => {
    if (!isAddOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSavingCategory && !isUploadingImage) {
        setIsAddOpen(false);
        setImagePreview('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddOpen, isSavingCategory, isUploadingImage]);

  useEffect(() => () => {
    if (imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const openAddCategory = async () => {
    setModalError('');
    setEditingCategoryId('');
    setCategoryForm({ categoryId: '', categoryName: '', description: '', subcategories: [], image: '', status: 'Active' });
    setNewSubcategory('');
    setImagePreview('');
    setIsAddOpen(true);
    setIsGeneratingCategoryId(true);
    try {
      const response = await api.get('/categories/next-id');
      setCategoryForm((current) => ({ ...current, categoryId: response?.data?.data || '' }));
    } catch (err) {
      setModalError(err?.response?.data?.message || 'Could not generate a category ID. It will be assigned when saved.');
    } finally {
      setIsGeneratingCategoryId(false);
    }
  };

  const openEditCategory = async (categoryId) => {
    setError('');
    setModalError('');
    try {
      const response = await api.get(`/categories/${categoryId}`);
      const category = response?.data?.data;
      if (!category) throw new Error('Category not found.');
      setEditingCategoryId(categoryId);
      setCategoryForm({
        categoryId: category.category_id || categoryId,
        categoryName: category.category_name || '',
        description: category.description || '',
        subcategories: Array.isArray(category.sub_categories) ? category.sub_categories : [],
        image: category.category_image || '',
        status: category.status === 'Inactive' ? 'Inactive' : 'Active',
      });
      setNewSubcategory('');
      setImagePreview(normalizeImageUrl(category.category_image || ''));
      setIsAddOpen(true);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Unable to load category details.');
    }
  };

  const handleAddSubcategory = () => {
    const value = newSubcategory.trim();
    if (!value) return;
    setCategoryForm((current) => (
      current.subcategories.some((item) => item.toLowerCase() === value.toLowerCase())
        ? current
        : { ...current, subcategories: [...current.subcategories, value] }
    ));
    setNewSubcategory('');
  };

  const handleImageSelection = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setModalError('Choose a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setModalError('Image size must be 5 MB or less.');
      return;
    }

    setModalError('');
    setImagePreview(URL.createObjectURL(file));
    setIsUploadingImage(true);
    const uploadData = new FormData();
    uploadData.append('folder', 'categories');
    uploadData.append('file', file);

    try {
      const response = await api.post('/upload', uploadData);
      const imageUrl = response?.data?.url || response?.data?.urls?.[0] || '';
      if (!imageUrl) throw new Error('The upload did not return an image URL.');
      setCategoryForm((current) => ({ ...current, image: imageUrl }));
    } catch (err) {
      setImagePreview('');
      setModalError(err?.response?.data?.message || err.message || 'Image upload failed. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveCategory = async (event) => {
    event.preventDefault();
    setIsSavingCategory(true);
    setModalError('');

    try {
      const categoryData = {
        categoryId: categoryForm.categoryId,
        categoryName: categoryForm.categoryName.trim(),
        description: categoryForm.description.trim(),
        subcategories: categoryForm.subcategories,
        image: categoryForm.image,
        status: categoryForm.status,
      };
      if (editingCategoryId) {
        await api.put(`/categories/${editingCategoryId}`, categoryData);
      } else {
        await api.post('/categories', categoryData);
      }
      await fetchCategories();
      setIsAddOpen(false);
      setImagePreview('');
    } catch (err) {
      setModalError(err?.response?.data?.message || 'Unable to create category. Please try again.');
    } finally {
      setIsSavingCategory(false);
    }
  };

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
        createdAt: item.created_at ? new Date(item.created_at).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) : '—',
        updatedAt: item.updated_at ? new Date(item.updated_at).toLocaleString('en-GB', {
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
  const filteredCategories = listData
    .filter((item) => {
      const searchValue = searchTerm.toLowerCase();
      const matchesSearch = [item.name, ...item.subCategories].some((value) =>
        String(value).toLowerCase().includes(searchValue)
      );
      const matchesStatus = selectedStatus === 'All Status' || item.status === selectedStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'products-high') return b.products - a.products;
      if (sortBy === 'products-low') return a.products - b.products;
      return a.sortOrder - b.sortOrder;
    });
  const productCount = listData.reduce((sum, item) => sum + Number(item.products || 0), 0);

  return (
    <div className="min-h-screen bg-[#f3f4f1] p-4 md:p-6">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-5 flex flex-col gap-4 border-b border-gray-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Categories</h1>
            <p className="mt-1 text-sm text-gray-600">Manage product categories and subcategories.</p>
          </div>
          <dl className="flex flex-wrap gap-x-7 gap-y-2 text-sm">
            <div><dt className="text-gray-500">Total</dt><dd className="font-semibold text-gray-900">{listData.length}</dd></div>
            <div><dt className="text-gray-500">Active</dt><dd className="font-semibold text-emerald-800">{activeCount}</dd></div>
            <div><dt className="text-gray-500">Products</dt><dd className="font-semibold text-gray-900">{productCount}</dd></div>
          </dl>
        </header>

        <div className="rounded-lg border border-[#e7e0d8] bg-white p-3 shadow-sm">
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
              <button
                type="button"
                onClick={openAddCategory}
                className="inline-flex h-[46px] items-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-[15px] font-semibold text-white shadow-[0_6px_14px_rgba(26,60,54,0.18)] transition hover:bg-[#214a42]"
              >
                <Plus className="h-4 w-4" />
                Add New Category
              </button>
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
                            onClick={() => openEditCategory(category.id)}
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
                        <th className="px-4 py-4">Created At</th>
                        <th className="px-4 py-4">Updated At</th>
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
                          <td className="whitespace-nowrap px-4 py-4">{item.createdAt}</td>
                          <td className="whitespace-nowrap px-4 py-4">{item.updatedAt}</td>
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
                                onClick={() => openEditCategory(item.id)}
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

      {isAddOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSavingCategory && !isUploadingImage) {
              setIsAddOpen(false);
              setImagePreview('');
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl"
          >
            <form onSubmit={handleSaveCategory}>
              <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4 sm:px-6">
                <div>
                  <h2 id="category-modal-title" className="text-xl font-semibold text-gray-900">{editingCategoryId ? 'Edit category' : 'Add category'}</h2>
                  <p className="mt-1 text-sm text-gray-500">{editingCategoryId ? 'Update category details and subcategories.' : 'Create a category and its subcategories.'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setImagePreview('');
                  }}
                  disabled={isSavingCategory || isUploadingImage}
                  className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50"
                  aria-label="Close category dialog"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  Category ID
                  <input value={categoryForm.categoryId} readOnly placeholder="Assigned on save" className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-gray-500" />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  Category name
                  <input
                    autoFocus
                    required
                    maxLength={150}
                    value={categoryForm.categoryName}
                    onChange={(event) => setCategoryForm((current) => ({ ...current, categoryName: event.target.value }))}
                    placeholder="e.g. Biryani"
                    className="h-10 w-full rounded-md border border-gray-300 px-3 outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700 sm:col-span-2">
                  Description
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={categoryForm.description}
                    onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Describe this category"
                    className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                  />
                </label>
                <div className="space-y-2 text-sm font-medium text-gray-700 sm:col-span-2">
                  <label htmlFor="category-subcategory-input">Subcategories</label>
                  <div className="flex gap-2">
                    <input
                      id="category-subcategory-input"
                      value={newSubcategory}
                      onChange={(event) => setNewSubcategory(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleAddSubcategory();
                        }
                      }}
                      placeholder="e.g. Chicken Biryani"
                      className="h-10 min-w-0 flex-1 rounded-md border border-gray-300 px-3 outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubcategory}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#1a3c36] text-white hover:bg-[#214a42]"
                      aria-label="Add subcategory"
                      title="Add subcategory"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categoryForm.subcategories.map((subcategory) => (
                      <span key={subcategory} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs text-emerald-900">
                        {subcategory}
                        <button
                          type="button"
                          onClick={() => setCategoryForm((current) => ({
                            ...current,
                            subcategories: current.subcategories.filter((item) => item !== subcategory),
                          }))}
                          className="rounded p-0.5 hover:bg-emerald-100"
                          aria-label={`Remove ${subcategory}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 text-sm font-medium text-gray-700">
                  <label htmlFor="category-image-input">Category image</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      id="category-image-input"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleImageSelection}
                      disabled={isUploadingImage}
                      className="block w-full max-w-md text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
                    />
                    {isUploadingImage && <span className="text-xs text-gray-500">Uploading...</span>}
                  </div>
                  {imagePreview && (
                    <div className="flex items-center gap-3">
                      <img src={imagePreview} alt="Category preview" className="h-16 w-16 rounded-md border border-gray-200 object-cover" />
                      <span className="text-xs font-normal text-gray-500">{categoryForm.image ? 'Image uploaded' : 'Preparing image...'}</span>
                    </div>
                  )}
                </div>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">
                  Status
                  <select
                    value={categoryForm.status}
                    onChange={(event) => setCategoryForm((current) => ({ ...current, status: event.target.value }))}
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </label>
                {modalError && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{modalError}</p>}
              </div>

              <footer className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setImagePreview('');
                  }}
                  disabled={isSavingCategory || isUploadingImage}
                  className="h-10 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory || isUploadingImage || isGeneratingCategoryId}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1a3c36] px-4 text-sm font-semibold text-white hover:bg-[#214a42] disabled:cursor-wait disabled:opacity-60"
                >
                  {editingCategoryId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {isUploadingImage ? 'Uploading image...' : isSavingCategory ? 'Saving...' : editingCategoryId ? 'Update category' : 'Save category'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
