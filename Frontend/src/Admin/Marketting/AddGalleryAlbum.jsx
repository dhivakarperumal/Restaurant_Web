import { useState, useRef, useEffect } from "react";
import { ChevronLeft, CloudUpload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api, { API_URL } from "../../api";

const GALLERY_CATEGORIES = [
  "Hotel Images",
  "Food Images",
  "Table Images",
  "Ambience",
  "Cooking Spots",
  "Other",
];

const AddGalleryAlbum = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editAlbumId = new URLSearchParams(location.search).get("edit");
  const isEditing = Boolean(editAlbumId);

  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [formData, setFormData] = useState({
    gallery_id: "GAL001",
    category: "Hotel Images",
    status: "Active",
    sort_order: "1",
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
          category: album.category || "Hotel Images",
          status: album.status || "Active",
          sort_order: String(album.sort_order || 1),
        });
        setCoverImage(album.cover_image || null);
        setPhotos(Array.isArray(album.photos) ? album.photos : []);
      } catch (error) {
        console.error("Failed to load gallery album for edit:", error);
        toast.error(error?.response?.data?.message || "Failed to load gallery album");
      }
    };

    const fetchNextGalleryId = async () => {
      try {
        const response = await api.get("/gallery/next-id");
        const nextId = response?.data?.data || "GAL001";
        setFormData((prev) => ({ ...prev, gallery_id: nextId }));
      } catch (error) {
        console.error("Failed to get next gallery ID:", error);
      }
    };

    if (isEditing) fetchAlbumForEdit();
    else fetchNextGalleryId();
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
    const baseUrl = API_URL.replace("/api", "");
    return `${baseUrl}${path}`;
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append("file", file);
    data.append("folder", "gallery");

    try {
      setUploadingCover(true);
      const res = await api.post("/upload", data);
      if (res.data?.success && res.data?.url) {
        setCoverImage(res.data.url);
        toast.success("Cover image uploaded");
      } else {
        toast.error("Failed to upload cover image");
      }
    } catch {
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
    data.append("folder", "gallery");

    try {
      setUploadingPhotos(true);
      const res = await api.post("/upload/multiple", data);
      if (res.data?.success && res.data?.urls) {
        setPhotos((prev) => [...prev, ...res.data.urls]);
        toast.success(`${res.data.urls.length} photo${res.data.urls.length !== 1 ? "s" : ""} uploaded`);
      } else {
        toast.error("Failed to upload photos");
      }
    } catch {
      toast.error("Failed to upload photos");
    } finally {
      setUploadingPhotos(false);
      if (photosInputRef.current) photosInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!formData.category) {
      toast.error("Please select a category");
      return;
    }
    if (!coverImage) {
      toast.error("Please upload a cover image");
      return;
    }
    if (photos.length === 0) {
      toast.error("Please upload at least one photo");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        gallery_id: formData.gallery_id,
        title: formData.category, // use category as title
        category: formData.category,
        status: formData.status,
        sort_order: formData.sort_order,
        cover_image: coverImage,
        photos,
      };
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
      <div className="flex-1 p-4 md:p-6 mx-auto w-full max-w-[900px]">

        {/* ── HEADER ── */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[2rem] font-bold tracking-tight text-[#1f1d1b]">
              {isEditing ? "Edit Gallery Album" : "Add New Gallery Album"}
            </h1>
            <p className="mt-1 text-[13px] text-[#646464]">
              Dashboard <span className="mx-2 text-[#9a9a9a]">&gt;</span>
              Gallery Management <span className="mx-2 text-[#9a9a9a]">&gt;</span>
              <span className="font-medium text-[#2a2a2a]">
                {isEditing ? "Edit Gallery Album" : "Add New Gallery Album"}
              </span>
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

        <div className="space-y-5 pb-24">

          {/* ── BASIC INFO CARD ── */}
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-[15px] font-bold text-[#1f1d1b]">Album Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* Gallery ID */}
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Gallery ID</label>
                <input
                  type="text"
                  name="gallery_id"
                  value={formData.gallery_id}
                  readOnly
                  className="w-full rounded-xl border border-[#d1d5db] bg-[#f9fafb] px-4 py-2.5 text-[14px] font-semibold text-[#6b7280] outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[#d1d5db] bg-white px-4 py-2.5 text-[14px] text-[#111827] outline-none focus:border-[#d4a843] focus:ring-1 focus:ring-[#d4a843] appearance-none cursor-pointer"
                >
                  {GALLERY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-[#d1d5db] bg-white px-4 py-2.5 text-[14px] text-[#111827] outline-none focus:border-[#d4a843] appearance-none cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <p className="mt-1.5 text-[12px] text-[#6b7280]">Active albums appear on the website</p>
              </div>

              {/* Sort Order */}
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Sort Order</label>
                <input
                  type="number"
                  name="sort_order"
                  value={formData.sort_order}
                  onChange={handleChange}
                  min="1"
                  className="w-full rounded-xl border border-[#d1d5db] bg-white px-4 py-2.5 text-[14px] text-[#111827] outline-none focus:border-[#d4a843]"
                />
                <p className="mt-1.5 text-[12px] text-[#6b7280]">Lower numbers appear first</p>
              </div>
            </div>
          </div>

          {/* ── COVER IMAGE CARD ── */}
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
            <h2 className="mb-1.5 text-[15px] font-bold text-[#1f1d1b]">Cover Image <span className="text-red-500">*</span></h2>
            <p className="mb-4 text-[12px] text-[#6b7280]">This image is shown as the album thumbnail in the gallery list</p>

            {coverImage ? (
              <div className="relative inline-block">
                <img
                  src={getImageUrl(coverImage)}
                  alt="Cover"
                  className="h-52 w-full max-w-sm rounded-2xl object-cover border border-[#e5e7eb] shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setCoverImage(null)}
                  className="absolute top-2 right-2 h-7 w-7 bg-white rounded-full flex items-center justify-center shadow-md text-[#6b7280] hover:text-red-500 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="group flex flex-col items-center justify-center w-full h-44 rounded-2xl border-2 border-dashed border-[#d1d5db] bg-[#f9fafb] cursor-pointer hover:border-[#d4a843] hover:bg-[#fffbf2] transition">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleCoverUpload}
                  disabled={uploadingCover}
                />
                {uploadingCover ? (
                  <Loader2 className="h-9 w-9 text-[#d4a843] animate-spin" />
                ) : (
                  <ImageIcon className="h-9 w-9 text-[#9ca3af] group-hover:text-[#d4a843] transition" />
                )}
                <p className="mt-3 text-[14px] font-medium text-[#4b5563]">
                  {uploadingCover ? "Uploading..." : "Click to upload cover image"}
                </p>
                <p className="mt-1 text-[12px] text-[#9ca3af]">JPG, PNG, WEBP — max 5MB</p>
              </label>
            )}
          </div>

          {/* ── GALLERY PHOTOS CARD ── */}
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-[#1f1d1b]">Gallery Photos <span className="text-red-500">*</span></h2>
                <p className="mt-0.5 text-[12px] text-[#6b7280]">Upload up to 50 photos</p>
              </div>
              {photos.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf7f1] px-3 py-1 text-[12px] font-semibold text-[#2d7b5a]">
                  {photos.length} photo{photos.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Upload zone */}
            <label className="group flex flex-col items-center justify-center w-full h-36 rounded-2xl border-2 border-dashed border-[#d1d5db] bg-[#f9fafb] cursor-pointer hover:border-[#d4a843] hover:bg-[#fffbf2] transition mb-4">
              <input
                ref={photosInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handlePhotosUpload}
                disabled={uploadingPhotos}
              />
              {uploadingPhotos ? (
                <Loader2 className="h-8 w-8 text-[#d4a843] animate-spin" />
              ) : (
                <CloudUpload className="h-8 w-8 text-[#9ca3af] group-hover:text-[#d4a843] transition" />
              )}
              <p className="mt-2 text-[13px] font-medium text-[#4b5563]">
                {uploadingPhotos ? "Uploading..." : "Click to upload multiple photos"}
              </p>
              <p className="mt-0.5 text-[12px] text-[#9ca3af]">JPG, PNG, WEBP — max 5MB each</p>
            </label>

            {/* Photo grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {photos.map((p, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden shadow-sm group border border-[#e5e7eb]">
                    <img
                      src={getImageUrl(p)}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 h-6 w-6 bg-white/90 rounded-full flex items-center justify-center text-[#6b7280] shadow-sm hover:bg-white hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── BOTTOM ACTION BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[280px] bg-white border-t border-[#e5e7eb] p-4 flex items-center justify-between z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          type="button"
          onClick={() => navigate("/admin/gallery")}
          className="inline-flex h-[42px] items-center justify-center rounded-xl border border-[#d1d5db] bg-white px-6 text-[14px] font-semibold text-[#374151] hover:bg-[#f9fafb]"
        >
          Cancel
        </button>
        <button
          type="button"
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
