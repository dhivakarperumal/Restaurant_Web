import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  CloudUpload,
  X,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Link as LinkIcon,
  Upload,
  Loader2
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api, { API_URL } from "../../api";

const AddGalleryAlbum = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editAlbumId = new URLSearchParams(location.search).get("edit");
  const isEditing = Boolean(editAlbumId);
  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    gallery_id: "GAL001",
    title: "",
    category: "",
    status: "Active",
    sort_order: "1",
    short_description: "",
    description: "",
    meta_title: "",
    meta_description: "",
  });
  
  const [coverImage, setCoverImage] = useState(null);
  const [photos, setPhotos] = useState([]);

  const coverInputRef = useRef(null);
  const photosInputRef = useRef(null);

  useEffect(() => {
    const fetchAlbumForEdit = async () => {
      try {
        const response = await api.get(`/gallery/${editAlbumId}`);
        const album = response?.data?.data || {};
        setFormData({
          gallery_id: album.album_id || editAlbumId,
          title: album.title || "",
          category: album.category || "",
          status: album.status || "Active",
          sort_order: String(album.sort_order || 1),
          short_description: album.short_description || "",
          description: album.description || "",
          meta_title: album.meta_title || "",
          meta_description: album.meta_description || "",
        });
        setCoverImage(album.cover_image || null);
        setPhotos(Array.isArray(album.photos) ? album.photos : []);
      } catch (error) {
        console.error("Failed to load gallery album for edit:", error);
        toast.error(error?.response?.data?.message || "Failed to load gallery album");
      }
    };

    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
        const categoryList = Array.isArray(response?.data?.data) ? response.data.data : [];
        setCategories(categoryList);

        if (categoryList.length && !formData.category) {
          setFormData((prev) => ({
            ...prev,
            category: categoryList[0].category_name,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    const fetchNextGalleryId = async () => {
      try {
        const response = await api.get("/gallery/next-id");
        const nextId = response?.data?.data || "GAL001";
        setFormData((previous) => ({ ...previous, gallery_id: nextId }));
      } catch (error) {
        console.error("Failed to get next gallery ID:", error);
      }
    };

    if (isEditing) fetchAlbumForEdit();
    if (!isEditing) fetchNextGalleryId();
    fetchCategories();
  }, [editAlbumId, isEditing]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const removePhoto = (idx) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  const getImageUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("data:")) return path;
    // API_URL might be like http://localhost:5000/api
    const baseUrl = API_URL.replace("/api", "");
    return `${baseUrl}${path}`;
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const data = new FormData();
    data.append("file", file); // Use "file" as per typical multer setup, backend uses upload.any() so field name doesn't matter much
    
    try {
      setUploadingCover(true);
      const res = await api.post("/upload", data);
      if (res.data?.success && res.data?.urls?.length > 0) {
        setCoverImage(res.data.urls[0]);
        toast.success("Cover image uploaded");
      } else if (res.data?.success && res.data?.url) {
        setCoverImage(res.data.url);
        toast.success("Cover image uploaded");
      }
    } catch (error) {
      toast.error("Failed to upload cover image");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handlePhotosUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    if (photos.length + files.length > 50) {
      toast.error("You can upload a maximum of 50 photos");
      return;
    }

    const data = new FormData();
    files.forEach((file) => data.append("files", file));
    
    try {
      setUploadingPhotos(true);
      const res = await api.post("/upload", data);
      if (res.data?.success && res.data?.urls) {
        setPhotos([...photos, ...res.data.urls]);
        toast.success(`${res.data.urls.length} photos uploaded`);
      }
    } catch (error) {
      toast.error("Failed to upload photos");
    } finally {
      setUploadingPhotos(false);
      if (photosInputRef.current) photosInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.category || !formData.short_description) {
      toast.error("Please fill in all required fields (*)");
      return;
    }
    if (!coverImage) {
      toast.error("Please upload a cover image (*)");
      return;
    }
    if (photos.length === 0) {
      toast.error("Please upload at least one photo (*)");
      return;
    }

    try {
      setLoading(true);
      const payload = { ...formData, cover_image: coverImage, photos };
      if (isEditing) {
        await api.put(`/gallery/${editAlbumId}`, payload);
      } else {
        await api.post("/gallery", payload);
      }
      toast.success(isEditing ? "Album updated successfully" : "Album saved successfully");
      navigate("/admin/gallery");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to save album");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">
      <div className="flex-1 p-4 md:p-6 mx-auto w-full max-w-[1500px]">
        {/* ── HEADER ── */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[2rem] font-bold tracking-tight text-[#1f1d1b]">
              {isEditing ? "Edit Gallery Album" : "Add New Gallery Album"}
            </h1>
            <p className="mt-1 text-[13px] text-[#646464]">
              Dashboard <span className="mx-2 text-[#9a9a9a]">&gt;</span>
              Gallery Management <span className="mx-2 text-[#9a9a9a]">&gt;</span>
              <span className="font-medium text-[#2a2a2a]">{isEditing ? "Edit Gallery Album" : "Add New Gallery Album"}</span>
            </p>
          </div>
          <Link
            to="/admin/gallery"
            className="inline-flex h-[42px] items-center gap-2 rounded-xl border border-[#d9d6d2] bg-white px-4 text-[14px] font-medium text-[#2d2d2d] shadow-sm transition hover:bg-[#faf7f3]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Gallery
          </Link>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Form Fields */}
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
              <div className="space-y-5">
                {/* Album Title */}
                <div>
                  <label className="mb-1.5 block text-[14px] font-semibold text-[#1f1d1b]">
                    Gallery ID
                  </label>
                  <input
                    type="text"
                    name="gallery_id"
                    value={formData.gallery_id}
                    readOnly
                    className="w-full rounded-xl border border-[#d1d5db] bg-[#f9fafb] px-4 py-2.5 text-[14px] font-semibold text-[#4b5563] outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[14px] font-semibold text-[#1f1d1b]">
                    Album Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Enter album title"
                    className="w-full rounded-xl border border-[#d1d5db] bg-white px-4 py-2.5 text-[14px] text-[#111827] outline-none focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843]"
                  />
                  <p className="mt-1.5 text-[12px] text-[#6b7280]">
                    Enter a clear and attractive title for the album
                  </p>
                </div>

                {/* Category */}
                <div>
                  <label className="mb-1.5 block text-[14px] font-semibold text-[#1f1d1b]">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-[#d1d5db] bg-white px-4 py-2.5 text-[14px] text-[#111827] outline-none focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] appearance-none"
                  >
                    <option value="">Select category</option>
                    {categories.length ? (
                      categories.map((category) => (
                        <option key={category.category_id || category.category_name} value={category.category_name}>
                          {category.category_name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Photo Frames">Photo Frames</option>
                        <option value="Collage Frames">Collage Frames</option>
                        <option value="Photo Prints">Photo Prints</option>
                        <option value="Canvas Prints">Canvas Prints</option>
                      </>
                    )}
                  </select>
                  <p className="mt-1.5 text-[12px] text-[#6b7280]">
                    Choose the most suitable category for this album
                  </p>
                </div>

                {/* Status & Sort Order */}
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="mb-1.5 block text-[14px] font-semibold text-[#1f1d1b]">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-[#d1d5db] bg-white px-4 py-2.5 text-[14px] text-[#111827] outline-none focus:border-[#d4a843] appearance-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    <p className="mt-1.5 text-[12px] text-[#6b7280]">
                      Active albums will be visible on the website
                    </p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[14px] font-semibold text-[#1f1d1b]">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      name="sort_order"
                      value={formData.sort_order}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-[#d1d5db] bg-white px-4 py-2.5 text-[14px] text-[#111827] outline-none focus:border-[#d4a843]"
                    />
                    <p className="mt-1.5 text-[12px] text-[#6b7280]">
                      Lower numbers appear first
                    </p>
                  </div>
                </div>

                {/* Short Description */}
                <div>
                  <label className="mb-1.5 block text-[14px] font-semibold text-[#1f1d1b]">
                    Short Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="short_description"
                    value={formData.short_description}
                    onChange={handleChange}
                    placeholder="Enter short description"
                    rows="3"
                    maxLength={160}
                    className="w-full rounded-xl border border-[#d1d5db] bg-white px-4 py-3 text-[14px] text-[#111827] outline-none focus:border-[#d4a843]"
                  />
                  <div className="mt-1.5 flex justify-between text-[12px] text-[#6b7280]">
                    <span>A brief summary of this album (max 160 characters)</span>
                    <span>{formData.short_description.length}/160</span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1.5 block text-[14px] font-semibold text-[#1f1d1b]">
                    Description (Optional)
                  </label>
                  <div className="rounded-xl border border-[#d1d5db] overflow-hidden bg-white">
                    {/* Toolbar */}
                    <div className="flex items-center gap-1 border-b border-[#d1d5db] bg-[#f9fafb] p-2">
                      <button className="p-1.5 text-[#4b5563] hover:bg-white hover:shadow-sm rounded"><Bold className="h-4 w-4" /></button>
                      <button className="p-1.5 text-[#4b5563] hover:bg-white hover:shadow-sm rounded"><Italic className="h-4 w-4" /></button>
                      <button className="p-1.5 text-[#4b5563] hover:bg-white hover:shadow-sm rounded"><Underline className="h-4 w-4" /></button>
                      <div className="w-[1px] h-5 bg-[#d1d5db] mx-1" />
                      <button className="p-1.5 text-[#4b5563] hover:bg-white hover:shadow-sm rounded"><List className="h-4 w-4" /></button>
                      <button className="p-1.5 text-[#4b5563] hover:bg-white hover:shadow-sm rounded"><ListOrdered className="h-4 w-4" /></button>
                      <div className="w-[1px] h-5 bg-[#d1d5db] mx-1" />
                      <button className="p-1.5 text-[#4b5563] hover:bg-white hover:shadow-sm rounded"><AlignLeft className="h-4 w-4" /></button>
                      <button className="p-1.5 text-[#4b5563] hover:bg-white hover:shadow-sm rounded"><AlignCenter className="h-4 w-4" /></button>
                      <button className="p-1.5 text-[#4b5563] hover:bg-white hover:shadow-sm rounded"><AlignRight className="h-4 w-4" /></button>
                      <div className="w-[1px] h-5 bg-[#d1d5db] mx-1" />
                      <button className="p-1.5 text-[#4b5563] hover:bg-white hover:shadow-sm rounded"><LinkIcon className="h-4 w-4" /></button>
                    </div>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Enter detailed description about this album"
                      rows="6"
                      maxLength={1000}
                      className="w-full px-4 py-3 text-[14px] text-[#111827] outline-none border-none resize-none"
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[12px] text-[#6b7280]">
                    <span>Detailed information about this album</span>
                    <span>{formData.description.length}/1000</span>
                  </div>
                </div>

                {/* Cover Image */}
                <div>
                  <label className="mb-1.5 block text-[14px] font-semibold text-[#1f1d1b]">
                    Album Cover Image <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={coverInputRef} 
                      onChange={handleCoverUpload}
                    />
                    <div 
                      onClick={() => !uploadingCover && coverInputRef.current.click()}
                      className={`flex-1 w-full border-2 border-dashed border-[#d1d5db] rounded-2xl flex flex-col items-center justify-center py-8 bg-[#f9fafb] hover:bg-white transition cursor-pointer group ${uploadingCover ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {uploadingCover ? (
                        <Loader2 className="h-8 w-8 text-[#d4a843] animate-spin" />
                      ) : (
                        <CloudUpload className="h-8 w-8 text-[#9ca3af] group-hover:text-[#d4a843]" />
                      )}
                      <p className="mt-3 text-[14px] text-[#4b5563] font-medium text-center">
                        <span className="text-[#111827]">{uploadingCover ? 'Uploading...' : 'Click to upload'}</span> {uploadingCover ? '' : 'or drag and drop'}
                      </p>
                      <p className="mt-1 text-[12px] text-[#6b7280]">JPG, PNG or WEBP (max. 2MB)</p>
                    </div>
                    {coverImage && (
                      <div className="relative shrink-0 w-[200px] h-[130px] rounded-xl overflow-hidden shadow-sm">
                        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${getImageUrl(coverImage)})` }} />
                        <button
                          onClick={() => setCoverImage(null)}
                          className="absolute top-2 right-2 h-6 w-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black transition"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-[12px] text-[#6b7280]">Recommended size: 1200 x 800 pixels</p>
                </div>

              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Photos Upload */}
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[16px] font-bold text-[#1f1d1b]">Photos <span className="text-red-500">*</span></h3>
                <button 
                  onClick={() => !uploadingPhotos && photosInputRef.current.click()}
                  disabled={uploadingPhotos}
                  className="inline-flex h-[36px] items-center gap-1.5 rounded-lg bg-[#162420] px-3 text-[13px] font-semibold text-white transition hover:bg-[#1a3c36] disabled:opacity-70"
                >
                  {uploadingPhotos ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} 
                  Upload Photos
                </button>
              </div>

              <input 
                type="file" 
                accept="image/*" 
                multiple
                className="hidden" 
                ref={photosInputRef} 
                onChange={handlePhotosUpload}
              />

              <div 
                onClick={() => !uploadingPhotos && photosInputRef.current.click()}
                className={`border-2 border-dashed border-[#d1d5db] rounded-2xl flex flex-col items-center justify-center py-10 bg-[#f9fafb] hover:bg-white transition cursor-pointer group mb-5 ${uploadingPhotos ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {uploadingPhotos ? (
                  <Loader2 className="h-8 w-8 text-[#d4a843] animate-spin" />
                ) : (
                  <CloudUpload className="h-8 w-8 text-[#9ca3af] group-hover:text-[#d4a843]" />
                )}
                <p className="mt-3 text-[14px] text-[#4b5563] font-medium text-center">
                  <span className="text-[#111827]">{uploadingPhotos ? 'Uploading...' : 'Click to upload'}</span> {uploadingPhotos ? '' : 'or drag and drop multiple photos'}
                </p>
                <p className="mt-1 text-[12px] text-[#6b7280]">JPG, PNG, WEBP (max. 5MB each)</p>
                <p className="mt-3 text-[12px] text-[#9ca3af]">You can upload up to 50 photos</p>
              </div>

              {photos.length > 0 && (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    {photos.map((p, idx) => (
                      <div key={idx} className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-sm group">
                        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${getImageUrl(p)})` }} />
                        <button
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1.5 right-1.5 h-6 w-6 bg-white/90 rounded-full flex items-center justify-center text-[#4b5563] shadow-sm hover:bg-white hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[13px] font-medium text-[#4b5563]">
                    Total Photos: {photos.length}
                  </p>
                </>
              )}
            </div>



            {/* Preview Card */}
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-5">
              <h3 className="text-[14px] font-bold text-[#1f1d1b] mb-4">Preview</h3>
              <div className="rounded-2xl border border-[#e7e0d8] bg-white p-4 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div
                  className="h-20 w-32 shrink-0 rounded-xl bg-cover bg-center border border-[#e7e0d8]"
                  style={{ backgroundImage: coverImage ? `url(${getImageUrl(coverImage)})` : "none", backgroundColor: "#f3f4f6" }}
                />
                <div className="flex-1 w-full text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-3">
                    <h4 className="text-[15px] font-bold text-[#1f1f1f] truncate max-w-[150px]">
                      {formData.title || "Album Title"}
                    </h4>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${formData.status === 'Active' ? 'bg-[#edf7f1] text-[#2d7b5a]' : 'bg-[#fff0f0] text-[#d04d4d]'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${formData.status === 'Active' ? 'bg-[#2d7b5a]' : 'bg-[#d04d4d]'}`} />
                      {formData.status}
                    </span>
                  </div>
                  <div className="mt-1 text-[13px] font-medium text-[#4b5563]">
                    {formData.category || "Category"}
                  </div>
                  <div className="mt-1 text-[12px] text-[#6b7280] line-clamp-2 leading-relaxed">
                    {formData.short_description || "Short description will appear here..."}
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* ── BOTTOM ACTION BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[280px] bg-white border-t border-[#e5e7eb] p-4 flex items-center justify-between z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => navigate("/admin/gallery")}
          className="inline-flex h-[42px] items-center justify-center rounded-xl border border-[#d1d5db] bg-white px-6 text-[14px] font-semibold text-[#374151] hover:bg-[#f9fafb]"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="inline-flex h-[42px] items-center justify-center gap-2 rounded-xl bg-[#162420] px-6 text-[14px] font-semibold text-white hover:bg-[#1a3c36] disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CloudUpload className="h-4 w-4" />
          )}
          {isEditing ? "Update Album" : "Save Album"}
        </button>
      </div>
    </div>
  );
};

export default AddGalleryAlbum;
