import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  FolderPlus,
  ImagePlus,
  ListFilter,
  Save,
  ShieldCheck,
  Sparkles,
  Tag,
  UploadCloud,
  X,
} from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../PrivateRouter/AuthContext';

const categoryTypes = ['Frame', 'Gift', 'Albums'];
const subCategoryOptions = [
  'Wooden Frames',
  'LED Frames',
  'Collage Frames',
  'Canvas Prints',
  'Premium Albums',
  'Custom Gifts',
  'Photo Books',
  'Wall Decor',
];

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

const normalizeImageUrl = (value) => {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return value.startsWith('/') ? value : `/${value}`;
};

const getInitialCategoryId = () => 'CAT001';

const AddCategory = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { profileName } = useAuth();
  const { categoryId } = useParams();
  const isEditMode = Boolean(categoryId);

  const [formData, setFormData] = useState({
    categoryId: getInitialCategoryId(),
    categoryType: 'Frame',
    categoryName: 'Photo Frames',
    subCategories: ['Wooden Frames', 'Collage Frames'],
    sortOrder: 1,
    status: true,
    createdBy: profileName || 'Admin',
    updatedBy: 'Super Admin',
    createdDate: formatDate(new Date()),
    updatedDate: formatDate(new Date()),
  });

  const fetchNextCategoryId = async () => {
    try {
      const response = await api.get('/categories/next-id');
      const nextId = response?.data?.data || 'CAT001';
      setFormData((current) => ({
        ...current,
        categoryId: nextId,
      }));
    } catch (error) {
      console.warn('Unable to fetch next category ID.', error);
    }
  };

  useEffect(() => {
    if (isEditMode) {
      const fetchCategory = async () => {
        try {
          const response = await api.get(`/categories/${categoryId}`);
          const item = response?.data?.data;
          if (!item) {
            navigate('/admin/products/categories');
            return;
          }

          setFormData({
            categoryId: item.category_id || categoryId,
            categoryType: item.category_type || 'Frame',
            categoryName: item.category_name || '',
            subCategories: Array.isArray(item.sub_categories) ? item.sub_categories : [],
            sortOrder: Number(item.sort_order || 1),
            status: item.status !== 'Inactive',
            createdBy: item.created_by || profileName || 'Admin',
            updatedBy: item.updated_by || profileName || 'Admin',
            createdDate: item.created_date ? formatDate(new Date(item.created_date)) : formatDate(new Date()),
            updatedDate: item.updated_date ? formatDate(new Date(item.updated_date)) : formatDate(new Date()),
          });
          setUploadedImageUrl(normalizeImageUrl(item.category_image || ''));
          setPreviewUrl(normalizeImageUrl(item.category_image || ''));
        } catch (error) {
          console.error('Failed to load category for edit:', error);
          alert(error?.response?.data?.message || 'Failed to load category.');
          navigate('/admin/products/categories');
        }
      };

      fetchCategory();
      return;
    }

    fetchNextCategoryId();
  }, [categoryId, isEditMode, navigate, profileName]);
  const [newSubCategory, setNewSubCategory] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: name === 'sortOrder' ? Number(value) : value,
    }));
  };

  const handleToggleSubCategory = (category) => {
    setFormData((current) => {
      const exists = current.subCategories.includes(category);
      return {
        ...current,
        subCategories: exists
          ? current.subCategories.filter((item) => item !== category)
          : [...current.subCategories, category],
      };
    });
  };

  const handleAddSubCategory = () => {
    const trimmedValue = newSubCategory.trim();
    if (!trimmedValue) return;

    setFormData((current) => {
      if (current.subCategories.includes(trimmedValue)) {
        return current;
      }

      return {
        ...current,
        subCategories: [...current.subCategories, trimmedValue],
      };
    });

    setNewSubCategory('');
  };

  const handleFileSelection = async (file) => {
    if (!file) return;

    const isValidType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!isValidType) {
      alert('Please upload a JPG, PNG, or WEBP image.');
      return;
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append('folder', 'categories');
    formData.append('file', file);

    try {
      const response = await api.post('/upload', formData);
      const imageUrl = response?.data?.url || response?.data?.urls?.[0] || '';
      const normalizedUrl = normalizeImageUrl(imageUrl);
      setUploadedImageUrl(normalizedUrl);
    } catch (error) {
      console.error('Upload failed:', error);
      alert(error?.response?.data?.message || 'Image upload failed. Please try again.');
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    handleFileSelection(file);
  };

  const resetForm = async () => {
    await fetchNextCategoryId();
    setFormData((current) => ({
      ...current,
      categoryType: 'Frame',
      categoryName: '',
      subCategories: [],
      sortOrder: 1,
      status: true,
      createdBy: profileName || 'Admin',
      updatedBy: 'Super Admin',
      createdDate: formatDate(new Date()),
      updatedDate: formatDate(new Date()),
    }));
    setImageFile(null);
    setUploadedImageUrl('');
    setPreviewUrl('');
  };

  const onSubmit = async (event, mode = 'save') => {
    event.preventDefault();

    const payload = {
      category_id: formData.categoryId,
      category_type: formData.categoryType,
      category_name: formData.categoryName,
      sub_categories: formData.subCategories,
      category_image: normalizeImageUrl(uploadedImageUrl || previewUrl || ''),
      sort_order: formData.sortOrder,
      status: formData.status ? 'Active' : 'Inactive',
      created_by: formData.createdBy,
      updated_by: formData.updatedBy || profileName || 'Admin',
      created_date: formData.createdDate,
      updated_date: formatDate(new Date()),
    };

    try {
      if (isEditMode) {
        await api.put(`/categories/${categoryId}`, payload);
      } else {
        await api.post('/categories', payload);
      }

      if (mode === 'add-another' && !isEditMode) {
        await resetForm();
        return;
      }

      navigate('/admin/products/categories');
    } catch (error) {
      console.error('Failed to save category:', error);
      alert(error?.response?.data?.message || 'Failed to save category. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-4 md:p-6">
      <div className="mx-auto max-w-[1480px]">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#e8d9ba] bg-[#fffaf2] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9b6b2d]">
              <Sparkles className="h-3.5 w-3.5" />
              Product catalog
            </div>
            <h1 className="text-[2.1rem] font-bold tracking-[-0.06em] text-[#1f1f1f]">
              {isEditMode ? 'Edit Category' : 'Add New Category'}
            </h1>
            <div className="mt-2 flex items-center gap-2 text-[13px] text-[#666]">
              <span>Dashboard</span>
              <span className="text-[#c0b8af]">›</span>
              <span>Categories</span>
              <span className="text-[#c0b8af]">›</span>
              <span className="font-semibold text-[#1f1f1f]">
                {isEditMode ? 'Edit Category' : 'Add New Category'}
              </span>
            </div>
          </div>

          <Link
            to="/admin/products/categories"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e6ddd1] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#2a2a2a] shadow-[0_1px_0_rgba(16,24,40,0.02)] transition hover:bg-[#faf7f3]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Categories
          </Link>
        </div>

        <form onSubmit={(event) => onSubmit(event, 'save')} className="space-y-6">
          <div className="rounded-[22px] border border-[#ebe3d7] bg-white p-4 shadow-[0_18px_40px_rgba(31,41,55,0.06)] md:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff3df] text-[#b06a22]">
                <FolderPlus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[12px] uppercase tracking-[0.18em] text-[#8a8a8a]">Category Setup</p>
                <h2 className="text-xl font-semibold text-[#202020]">Create a new catalog group</h2>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
              <div className="space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#6b6b6b]">Category ID</label>
                    <input
                      type="text"
                      readOnly
                      name="categoryId"
                      value={formData.categoryId}
                      className="h-[52px] w-full rounded-2xl border border-[#e8e1d9] bg-[#f7f7f6] px-4 text-[15px] font-medium text-[#262626] outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#6b6b6b]">Category Type</label>
                    <div className="relative">
                      <select
                        name="categoryType"
                        value={formData.categoryType}
                        onChange={handleChange}
                        className="h-[52px] w-full appearance-none rounded-2xl border border-[#e8e1d9] bg-white px-4 pr-10 text-[15px] text-[#2a2a2a] shadow-sm outline-none transition focus:border-[#d4a553]"
                      >
                        {categoryTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                      <ListFilter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7a7a]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#6b6b6b]">Category Name</label>
                  <input
                    type="text"
                    name="categoryName"
                    value={formData.categoryName}
                    onChange={handleChange}
                    placeholder="Photo Frames"
                    className="h-[52px] w-full rounded-2xl border border-[#e8e1d9] bg-white px-4 text-[15px] text-[#2a2a2a] shadow-sm outline-none transition placeholder:text-[#9a9a9a] focus:border-[#d4a553]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#6b6b6b]">Sub Categories</label>
                  <div className="rounded-2xl border border-[#e8e1d9] bg-white p-3 shadow-sm">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {formData.subCategories.length ? (
                        formData.subCategories.map((item) => (
                          <button
                            type="button"
                            key={item}
                            onClick={() => handleToggleSubCategory(item)}
                            className="inline-flex items-center gap-2 rounded-full border border-[#f0d7a1] bg-[#fff8ed] px-3 py-1.5 text-[12px] font-medium text-[#8b5f22]"
                          >
                            {item}
                            <X className="h-3.5 w-3.5" />
                          </button>
                        ))
                      ) : (
                        <span className="text-[12px] text-[#888]">No subcategories selected yet</span>
                      )}
                    </div>

                    <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        value={newSubCategory}
                        onChange={(event) => setNewSubCategory(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleAddSubCategory();
                          }
                        }}
                        placeholder="Add a subcategory"
                        className="h-[44px] flex-1 rounded-xl border border-[#e8e1d9] bg-[#faf9f8] px-3 text-[14px] text-[#2a2a2a] outline-none placeholder:text-[#9a9a9a] focus:border-[#d4a553]"
                      />
                      <button
                        type="button"
                        onClick={handleAddSubCategory}
                        className="inline-flex h-[44px] items-center justify-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-[13px] font-semibold text-white transition hover:bg-[#214a42]"
                      >
                        <Tag className="h-4 w-4" />
                        Add
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {subCategoryOptions.map((option) => {
                        const active = formData.subCategories.includes(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleToggleSubCategory(option)}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
                              active
                                ? 'border-[#d9a551] bg-[#fff7e9] text-[#7b521a]'
                                : 'border-[#ece7e0] bg-[#faf9f8] text-[#5d5d5d] hover:border-[#d6d0c6]'
                            }`}
                          >
                            <Tag className="h-3.5 w-3.5" />
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[13px] font-semibold uppercase tracking-[0.14em] text-[#6b6b6b]">Category Image</label>
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`relative overflow-hidden rounded-[22px] border border-dashed border-[#d8d0c5] bg-[#f2efe9] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)] transition ${
                      isDragging ? 'border-[#d8a44a] bg-[#fffaf0]' : 'border-[#d8d0c5] bg-[#f4f1ee]'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={(event) => handleFileSelection(event.target.files?.[0])}
                    />

                    {previewUrl ? (
                      <>
                        <div className="mx-auto flex h-[220px] max-w-[100%] items-center justify-center overflow-hidden rounded-[18px] border border-[#e4ddd1] bg-[#f4f0eb]">
                          <img src={previewUrl} alt="Category preview" className="h-full w-full object-cover" />
                        </div>
                        <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#153d38] px-5 py-3 text-[18px] font-semibold text-white shadow-[0_8px_20px_rgba(21,61,56,0.12)] transition hover:bg-[#1b4d46]"
                          >
                            <ImagePlus className="h-5 w-5" />
                            Change Image
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(null);
                              setUploadedImageUrl('');
                              setPreviewUrl('');
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d3c8bc] bg-white px-5 py-3 text-[18px] font-semibold text-[#1f1f1f] shadow-[0_2px_8px_rgba(31,41,55,0.04)] transition hover:bg-[#faf7f3]"
                          >
                            <X className="h-5 w-5" />
                            Remove
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-4 px-3 py-8">
                        <div className="flex h-[54px] w-[54px] items-center justify-center rounded-xl border border-[#d7d0c7] bg-[#eef1ee] text-[#5a6e63] shadow-sm">
                          <UploadCloud className="h-8 w-8" />
                        </div>

                        <div className="text-center">
                          <p className="text-[24px] font-semibold tracking-[-0.04em] text-[#2a2a2a]">Category preview</p>
                        </div>

                        <div className="mt-2 flex flex-col items-center justify-center gap-3 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#153d38] px-5 py-3 text-[18px] font-semibold text-white shadow-[0_8px_20px_rgba(21,61,56,0.12)] transition hover:bg-[#1b4d46]"
                          >
                            <ImagePlus className="h-5 w-5" />
                            Change Image
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(null);
                              setUploadedImageUrl('');
                              setPreviewUrl('');
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#d3c8bc] bg-white px-5 py-3 text-[18px] font-semibold text-[#1f1f1f] shadow-[0_2px_8px_rgba(31,41,55,0.04)] transition hover:bg-[#faf7f3]"
                          >
                            <X className="h-5 w-5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <aside className="space-y-5">
                <div className="rounded-[22px] border border-[#ece0d1] bg-[#fffaf3] p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#7f6b52]">Publication</h3>
                    <div className="rounded-full border border-[#ebd8b6] bg-[#fff7e8] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b6528]">
                      {formData.status ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-2xl border border-[#efe2cc] bg-white p-3">
                      <div>
                        <p className="text-[12px] uppercase tracking-[0.12em] text-[#7a7a7a]">Status</p>
                        <p className="mt-1 text-[16px] font-semibold text-[#1f1f1f]">{formData.status ? 'Active' : 'Inactive'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData((current) => ({ ...current, status: !current.status }))}
                        className={`relative h-7 w-12 rounded-full transition ${formData.status ? 'bg-[#1a3c36]' : 'bg-[#d4d4d4]'}`}
                        aria-label="Toggle status"
                      >
                        <span
                          className={`absolute top-[4px] h-5 w-5 rounded-full bg-white shadow transition ${
                            formData.status ? 'left-[26px]' : 'left-[4px]'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[12px] uppercase tracking-[0.12em] text-[#6b6b6b]">Sort Order</label>
                      <input
                        type="number"
                        name="sortOrder"
                        min="1"
                        value={formData.sortOrder}
                        onChange={handleChange}
                        className="h-[48px] w-full rounded-2xl border border-[#e8e1d9] bg-white px-3 text-[15px] text-[#2a2a2a] outline-none focus:border-[#d4a553]"
                      />
                    </div>

                    <div className="rounded-2xl border border-[#eae4dc] bg-white p-3">
                      <p className="text-[12px] uppercase tracking-[0.12em] text-[#6b6b6b]">Created By</p>
                      <div className="mt-2 flex items-center gap-2 text-[15px] font-semibold text-[#202020]">
                        <ShieldCheck className="h-4 w-4 text-[#1a3c36]" />
                        {formData.createdBy}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#eae4dc] bg-white p-3">
                      <p className="text-[12px] uppercase tracking-[0.12em] text-[#6b6b6b]">Updated By</p>
                      <div className="mt-2 flex items-center gap-2 text-[15px] font-semibold text-[#202020]">
                        <ShieldCheck className="h-4 w-4 text-[#b77d2f]" />
                        {formData.updatedBy}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#eae4dc] bg-white p-3">
                      <p className="text-[12px] uppercase tracking-[0.12em] text-[#6b6b6b]">Created Date</p>
                      <div className="mt-2 flex items-center gap-2 text-[14px] font-medium text-[#212121]">
                        <CalendarDays className="h-4 w-4 text-[#1a3c36]" />
                        {formData.createdDate}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#eae4dc] bg-white p-3">
                      <p className="text-[12px] uppercase tracking-[0.12em] text-[#6b6b6b]">Updated Date</p>
                      <div className="mt-2 flex items-center gap-2 text-[14px] font-medium text-[#212121]">
                        <CalendarDays className="h-4 w-4 text-[#b77d2f]" />
                        {formData.updatedDate}
                      </div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>

          <div className="flex flex-col justify-end gap-3 border-t border-[#e8e1d9] bg-white px-4 py-4 md:flex-row md:px-6">
            <button
              type="button"
              onClick={() => navigate('/admin/products/categories')}
              className="inline-flex items-center justify-center rounded-xl border border-[#ddd3c8] bg-[#faf8f5] px-5 py-3 text-[14px] font-semibold text-[#333] transition hover:bg-[#f4efe9]"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a3c36] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_10px_22px_rgba(26,60,54,0.16)] transition hover:bg-[#214a42]"
            >
              <Save className="h-4 w-4" />
              Save Category
            </button>

            <button
              type="button"
              onClick={(event) => onSubmit(event, 'add-another')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#b87840] px-5 py-3 text-[14px] font-semibold text-white shadow-[0_10px_22px_rgba(184,120,64,0.18)] transition hover:bg-[#a96b36]"
            >
              <Check className="h-4 w-4" />
              Save & Add Another
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCategory;
