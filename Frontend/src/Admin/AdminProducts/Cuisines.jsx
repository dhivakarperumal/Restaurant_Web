import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ChefHat, ImagePlus, LayoutGrid, Pencil, Plus, Search, Star, Table2, Trash2, TrendingUp, Utensils, X } from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../PrivateRouter/AuthContext';

const imageUrl = (value) => {
  if (!value || /^https?:\/\//i.test(value)) return value || '';
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  const baseUrl = apiUrl.replace(/\/api\/?$/, '');
  return `${baseUrl}${value.startsWith('/') ? value : `/${value}`}`;
};

const formatDate = (value) => value
  ? new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  : '—';

const blankCuisine = () => ({
  cuisineId: '',
  cuisineName: '',
  description: '',
  image: '',
  status: 'Active',
  featured: false,
});

const Cuisines = () => {
  const { profileName } = useAuth();
  const [cuisines, setCuisines] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [sortBy, setSortBy] = useState('latest');
  const [viewMode, setViewMode] = useState('table');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(blankCuisine);
  const [modalError, setModalError] = useState('');
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchCuisines = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cuisines');
      setCuisines(Array.isArray(response?.data?.data) ? response.data.data : []);
      setError('');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to load cuisines.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCuisines();
  }, []);

  useEffect(() => () => {
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
  }, [preview]);

  const visibleCuisines = useMemo(() => {
    const query = search.trim().toLowerCase();
    return cuisines.filter((cuisine) => [cuisine.cuisine_id, cuisine.cuisine_name, cuisine.description]
      .some((value) => String(value || '').toLowerCase().includes(query))
      && (statusFilter === 'All statuses' || cuisine.status === statusFilter))
      .sort((first, second) => {
        if (sortBy === 'name') return String(first.cuisine_name || '').localeCompare(String(second.cuisine_name || ''));
        return new Date(second.created_at || 0).getTime() - new Date(first.created_at || 0).getTime();
      });
  }, [cuisines, search, statusFilter, sortBy]);

  const activeCount = cuisines.filter((cuisine) => cuisine.status === 'Active').length;
  const featuredCount = cuisines.filter((cuisine) => cuisine.featured).length;

  const openCreate = async () => {
    setEditingId('');
    setForm({ ...blankCuisine(), createdBy: profileName });
    setPreview('');
    setModalError('');
    setModalOpen(true);
    try {
      const response = await api.get('/cuisines/next-id');
      setForm((current) => ({ ...current, cuisineId: response?.data?.data || '' }));
    } catch (requestError) {
      setModalError(requestError?.response?.data?.message || 'ID will be assigned when the cuisine is saved.');
    }
  };

  const openEdit = async (cuisineId) => {
    setModalError('');
    setEditingId(cuisineId);
    setModalOpen(true);
    try {
      const response = await api.get(`/cuisines/${cuisineId}`);
      const cuisine = response?.data?.data;
      if (!cuisine) throw new Error('Cuisine not found.');
      setForm({
        cuisineId: cuisine.cuisine_id,
        cuisineName: cuisine.cuisine_name || '',
        description: cuisine.description || '',
        image: cuisine.image || '',
        status: cuisine.status || 'Active',
        featured: Boolean(cuisine.featured),
        createdBy: cuisine.created_by || profileName,
        updatedBy: profileName,
      });
      setPreview(imageUrl(cuisine.image));
    } catch (requestError) {
      setModalError(requestError?.response?.data?.message || requestError.message || 'Unable to load cuisine.');
    }
  };

  const handleImageUpload = async (event) => {
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
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    const uploadData = new FormData();
    uploadData.append('folder', 'cuisines');
    uploadData.append('file', file);
    try {
      const response = await api.post('/upload', uploadData);
      const uploadedUrl = response?.data?.url || '';
      if (!uploadedUrl) throw new Error('Image upload returned no URL.');
      setForm((current) => ({ ...current, image: uploadedUrl }));
    } catch (requestError) {
      setPreview('');
      setModalError(requestError?.response?.data?.message || requestError.message || 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setModalError('');
    const payload = {
      cuisine_id: form.cuisineId,
      cuisine_name: form.cuisineName.trim(),
      description: form.description.trim(),
      image: form.image,
      status: form.status,
      featured: form.featured,
      created_by: form.createdBy || profileName,
      updated_by: profileName,
    };
    try {
      if (editingId) await api.put(`/cuisines/${editingId}`, payload);
      else await api.post('/cuisines', payload);
      await fetchCuisines();
      setModalOpen(false);
      setPreview('');
    } catch (requestError) {
      setModalError(requestError?.response?.data?.message || 'Unable to save cuisine.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cuisineId) => {
    if (!window.confirm('Delete this cuisine?')) return;
    try {
      await api.delete(`/cuisines/${cuisineId}`);
      await fetchCuisines();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to delete cuisine.');
    }
  };

  return (
    <div className="min-h-screen  p-4 md:p-2">
      <div className="mx-auto max-w-[1500px]">
        

        {/* ================= STAT CARDS ================= */}
        {(() => {
          const inactiveCount = cuisines.length - activeCount;
          const statCards = [
            { title: 'Total Cuisines', value: String(cuisines.length), inc: '18.6%', icon: <ChefHat />, bg: 'bg-[#22c55e]' },
            { title: 'Active Cuisines', value: String(activeCount), inc: '12.4%', icon: <Utensils />, bg: 'bg-[#3b82f6]' },
            { title: 'Featured Cuisines', value: String(featuredCount), inc: '10.7%', icon: <Star />, bg: 'bg-[#f59e0b]' },
            { title: 'Inactive Cuisines', value: String(inactiveCount), inc: '—', icon: <TrendingUp />, bg: 'bg-[#8b5cf6]' },
          ];
          return (
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((stat, index) => (
                <article
                  key={index}
                  className={`relative min-w-0 overflow-hidden rounded-xl border border-transparent p-4 sm:p-5 shadow-[0_2px_10px_rgba(20,56,34,0.04)] flex flex-col justify-between min-h-[140px] ${stat.bg} text-white`}
                >
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-sm bg-white/20">
                      {React.cloneElement(stat.icon, { size: 24, strokeWidth: 2.2, className: 'text-white' })}
                    </div>
                    <div className="flex-1 mt-0.5 min-w-0">
                      <h3 className="text-[12px] font-semibold opacity-90 mb-1 truncate">{stat.title}</h3>
                      <div className="text-[22px] sm:text-[25px] font-extrabold leading-none tracking-tight truncate">{stat.value}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-5 relative z-10">
                    <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold bg-white/25">
                      {stat.inc !== '—' ? `↑ ${stat.inc}` : stat.inc}
                    </span>
                    <span className="text-[11px] font-medium opacity-75 truncate">from last month</span>
                  </div>
                  <div className="absolute right-0 bottom-0 w-24 h-16 pointer-events-none opacity-50">
                    <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
                      <defs>
                        <linearGradient id={`cuisgrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#cuisgrad-${index})`} />
                      <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                    </svg>
                  </div>
                </article>
              ))}
            </div>
          );
        })()}

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md lg:flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cuisines..." className="h-[46px] w-full rounded-xl border border-gray-300 bg-gray-50 pl-11 pr-3 text-sm outline-none focus:border-emerald-700" />
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <span className="mr-1 text-xs text-gray-500">{visibleCuisines.length} of {cuisines.length}</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter cuisines by status" className="h-[46px] rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-emerald-700">
                <option>All statuses</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort cuisines" className="h-[46px] rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-emerald-700">
                <option value="latest">Sort by: Latest</option>
                <option value="name">Name: A to Z</option>
              </select>
              <div className="flex h-[46px] overflow-hidden rounded-xl border border-gray-300">
                <button type="button" onClick={() => setViewMode('table')} aria-label="Table view" aria-pressed={viewMode === 'table'} className={`flex w-11 items-center justify-center border-r border-gray-300 ${viewMode === 'table' ? 'bg-[#1a3c36] text-white' : 'text-gray-600 hover:bg-gray-50'}`}><Table2 className="h-4 w-4" /></button>
                <button type="button" onClick={() => setViewMode('card')} aria-label="Card view" aria-pressed={viewMode === 'card'} className={`flex w-11 items-center justify-center ${viewMode === 'card' ? 'bg-[#1a3c36] text-white' : 'text-gray-600 hover:bg-gray-50'}`}><LayoutGrid className="h-4 w-4" /></button>
              </div>
              <button type="button" onClick={openCreate} className="inline-flex h-[46px] items-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-sm font-semibold text-white transition hover:bg-[#214a42]">
                <Plus className="h-4 w-4" /> Add New Cuisine
              </button>
            </div>
          </div>
          {error && <p role="alert" className="m-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {loading ? <p className="py-14 text-center text-sm text-gray-500">Loading cuisines...</p> : !visibleCuisines.length ? (
            <div className="flex min-h-56 flex-col items-center justify-center px-5 py-10 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-emerald-50 text-emerald-800"><Utensils className="h-5 w-5" /></span>
              <p className="font-medium text-gray-900">{search || statusFilter !== 'All statuses' ? 'No matching cuisines' : 'No cuisines yet'}</p>
              <p className="mt-1 max-w-sm text-sm text-gray-500">{search || statusFilter !== 'All statuses' ? 'Try another search or status filter.' : 'Add your first cuisine to start organizing menu items.'}</p>
              {!search && statusFilter === 'All statuses' && <button type="button" onClick={openCreate} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"><Plus className="h-4 w-4" /> Add cuisine</button>}
            </div>
          ) : viewMode === 'card' ? (
            <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
              {visibleCuisines.map((cuisine) => (
                <article key={cuisine.cuisine_id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    {cuisine.image
                      ? <img src={imageUrl(cuisine.image)} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      : <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800"><Utensils className="h-5 w-5" /></span>}
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEdit(cuisine.cuisine_id)} className="rounded-md border border-gray-300 p-2 hover:bg-gray-50" aria-label={`Edit ${cuisine.cuisine_name}`}><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => handleDelete(cuisine.cuisine_id)} className="rounded-md border border-red-200 p-2 text-red-700 hover:bg-red-50" aria-label={`Delete ${cuisine.cuisine_name}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900">{cuisine.cuisine_name}</h3>
                  <p className="mt-0.5 text-xs text-gray-500">{cuisine.cuisine_id}</p>
                  <p className="mt-3 min-h-10 text-sm text-gray-600">{cuisine.description || 'No description'}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${cuisine.status === 'Active' ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>{cuisine.status}</span>
                    {cuisine.featured && <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" /> Featured</span>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-[#c39732] bg-[#d4a843] text-xs uppercase text-white">
                  <tr>
                    <th className="px-3 py-3">Cuisine</th>
                    <th className="px-3 py-3">Description</th>
                    <th className="px-3 py-3">Featured</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Created</th>
                    <th className="px-3 py-3">Updated</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCuisines.map((cuisine) => (
                    <tr key={cuisine.cuisine_id} className="border-b border-gray-100 text-gray-700 last:border-0">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          {cuisine.image ? <img src={imageUrl(cuisine.image)} alt="" className="h-10 w-10 rounded-md object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-800"><Utensils className="h-4 w-4" /></span>}
                          <span><span className="block font-medium text-gray-900">{cuisine.cuisine_name}</span><span className="text-xs text-gray-500">{cuisine.cuisine_id}</span></span>
                        </div>
                      </td>
                      <td className="max-w-xs truncate px-3 py-3" title={cuisine.description || ''}>{cuisine.description || '—'}</td>
                      <td className="px-3 py-3">{cuisine.featured ? <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-label="Featured" /> : '—'}</td>
                      <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${cuisine.status === 'Active' ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>{cuisine.status}</span></td>
                      <td className="whitespace-nowrap px-3 py-3">{formatDate(cuisine.created_at)}</td>
                      <td className="whitespace-nowrap px-3 py-3">{formatDate(cuisine.updated_at)}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => openEdit(cuisine.cuisine_id)} className="rounded-md border border-gray-300 p-2 hover:bg-gray-50" aria-label={`Edit ${cuisine.cuisine_name}`}><Pencil className="h-4 w-4" /></button>
                          <button type="button" onClick={() => handleDelete(cuisine.cuisine_id)} className="rounded-md border border-red-200 p-2 text-red-700 hover:bg-red-50" aria-label={`Delete ${cuisine.cuisine_name}`}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving && !uploading) { setModalOpen(false); setPreview(''); } }}>
          <section role="dialog" aria-modal="true" aria-labelledby="cuisine-modal-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl">
            <form onSubmit={handleSave}>
              <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div><h2 id="cuisine-modal-title" className="text-xl font-semibold text-gray-900">{editingId ? 'Edit cuisine' : 'Add cuisine'}</h2></div>
                <button type="button" onClick={() => { setModalOpen(false); setPreview(''); }} disabled={saving || uploading} className="rounded-md p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50" aria-label="Close cuisine dialog"><X className="h-5 w-5" /></button>
              </header>
              <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">

                <label className="space-y-1.5 text-sm font-medium text-gray-700">Cuisine ID
                  <input
                    readOnly
                    value={form.cuisineId}
                    placeholder="Auto-generated"
                    className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-gray-600"
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">Cuisine name
                  <input required maxLength={150} value={form.cuisineName} onChange={(event) => setForm((current) => ({ ...current, cuisineName: event.target.value }))} placeholder="e.g. Indian, Italian, Thai" className="h-10 w-full rounded-md border border-gray-300 px-3 outline-none placeholder:text-gray-400 focus:border-emerald-700" />
                </label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700 sm:col-span-2">Description
                  <textarea rows={3} maxLength={1000} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe this cuisine" className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none placeholder:text-gray-400 focus:border-emerald-700" />
                </label>
                <div className="space-y-2 text-sm font-medium text-gray-700 sm:col-span-2">
                  <label htmlFor="cuisine-image-input">Cuisine image</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input id="cuisine-image-input" type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleImageUpload} disabled={uploading} className="block w-full max-w-md text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:font-medium" />
                    {uploading && <span className="text-xs text-gray-500">Uploading...</span>}
                    {preview && <img src={preview} alt="Cuisine preview" className="h-16 w-16 rounded-md border border-gray-200 object-cover" />}
                    {form.image && !preview && <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><ImagePlus className="h-4 w-4" /> Image saved</span>}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.featured} onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))} className="h-4 w-4 accent-emerald-800" /> Featured cuisine</label>
                <label className="space-y-1.5 text-sm font-medium text-gray-700">Status
                  <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="h-10 w-full rounded-md border border-gray-300 px-3"><option>Active</option><option>Inactive</option></select>
                </label>
                {modalError && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{modalError}</p>}
              </div>
              <footer className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
                <button type="button" onClick={() => { setModalOpen(false); setPreview(''); }} disabled={saving || uploading} className="h-10 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={saving || uploading} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1a3c36] px-4 text-sm font-semibold text-white disabled:opacity-60"><Plus className="h-4 w-4" />{saving ? 'Saving...' : 'Save cuisine'}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default Cuisines;
