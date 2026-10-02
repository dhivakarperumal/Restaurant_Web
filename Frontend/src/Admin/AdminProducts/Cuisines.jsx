import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Pencil, Plus, Search, Star, Trash2, Utensils, X } from 'lucide-react';
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
      && (statusFilter === 'All statuses' || cuisine.status === statusFilter));
  }, [cuisines, search, statusFilter]);

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
    <div className="min-h-screen bg-[#f3f4f1] p-4 md:p-6">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-5 border-b border-gray-200 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">Menu catalog</p>
              <h1 className="text-2xl font-semibold text-gray-900">Cuisines</h1>
              <p className="mt-1 text-sm text-gray-600">Manage cuisine names, images, and website visibility.</p>
            </div>
            <button type="button" onClick={openCreate} className="inline-flex h-10 items-center gap-2 rounded-md bg-[#1a3c36] px-4 text-sm font-semibold text-white hover:bg-[#214a42]">
            <Plus className="h-4 w-4" /> Add cuisine
            </button>
          </div>
          <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div className="flex items-baseline gap-2"><dt className="text-gray-500">Total</dt><dd className="font-semibold text-gray-900">{cuisines.length}</dd></div>
            <div className="flex items-baseline gap-2"><dt className="text-gray-500">Active</dt><dd className="font-semibold text-emerald-800">{activeCount}</dd></div>
            <div className="flex items-baseline gap-2"><dt className="text-gray-500">Featured</dt><dd className="font-semibold text-amber-700">{featuredCount}</dd></div>
          </dl>
        </header>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, ID, or description" className="h-10 w-full rounded-md border border-gray-300 pl-9 pr-3 text-sm outline-none focus:border-emerald-700" />
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-xs text-gray-500">{visibleCuisines.length} of {cuisines.length}</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter cuisines by status" className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none focus:border-emerald-700">
                <option>All statuses</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-600">
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
