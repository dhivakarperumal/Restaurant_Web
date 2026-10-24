import { useCallback, useEffect, useState } from "react";
import { Image as ImageIcon, RefreshCw, X } from "lucide-react";
import { Link } from "react-router-dom";
import api, { BACKEND_BASE_URL } from "../api";
import PageContainer from "../CommonComponents/PageContainer";
import PageHeader from "../CommonComponents/PageHeader";

const imageUrl = (path) => {
  if (!path || typeof path !== "string") return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${BACKEND_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

// Category order (matches what admin sets)
const CATEGORY_ORDER = [
  "Hotel Images",
  "Food Images",
  "Table Images",
  "Ambience",
  "Cooking Spots",
  "Other",
];

function Gallery() {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [lightbox, setLightbox] = useState(null); // { photos: [], index: number, albumTitle: string }

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/gallery");
      if (!data?.success || !Array.isArray(data.data)) {
        throw new Error(data?.message || "The gallery response was invalid.");
      }
      setAlbums(
        data.data.filter(
          (album) => String(album.status || "Active").toLowerCase() === "active"
        )
      );
    } catch (requestError) {
      console.error("Failed to load public gallery:", requestError);
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "The gallery could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  // Derive sorted unique categories from fetched albums
  const categories = [
    "All",
    ...CATEGORY_ORDER.filter((cat) =>
      albums.some((a) => a.category === cat)
    ),
    // Any categories not in CATEGORY_ORDER go at the end
    ...albums
      .map((a) => a.category)
      .filter(
        (cat, i, arr) =>
          cat &&
          !CATEGORY_ORDER.includes(cat) &&
          arr.indexOf(cat) === i
      ),
  ];

  const filteredAlbums =
    activeCategory === "All"
      ? albums
      : albums.filter((a) => a.category === activeCategory);

  // All photos from filtered albums (flat list for masonry)
  const allPhotos = filteredAlbums.flatMap((album) =>
    (Array.isArray(album.photos) ? album.photos : []).map((photo) => ({
      src: imageUrl(photo),
      albumTitle: album.category || album.title || "Gallery",
      cover: imageUrl(album.cover_image),
    }))
  );

  const openLightbox = (idx) => setLightbox({ photos: allPhotos, index: idx });
  const closeLightbox = () => setLightbox(null);
  const prevPhoto = () =>
    setLightbox((lb) => ({
      ...lb,
      index: (lb.index - 1 + lb.photos.length) % lb.photos.length,
    }));
  const nextPhoto = () =>
    setLightbox((lb) => ({
      ...lb,
      index: (lb.index + 1) % lb.photos.length,
    }));

  // Keyboard navigation
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") nextPhoto();
      if (e.key === "ArrowLeft") prevPhoto();
      if (e.key === "Escape") closeLightbox();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  return (
    <main className="min-h-screen bg-[#fcfbf9] pb-16 text-[#203129]">
      <PageHeader title="Gallery" />
      <PageContainer>
        <section className="py-10 sm:py-14">

          {/* ── Section heading ── */}
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a34f32]">
              From our restaurant
            </p>
            <h2 className="mt-2 font-serif text-3xl font-bold">
              A taste of the moments we love
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Explore food, celebrations, and memories shared around our tables.
            </p>
          </div>

          {/* ── Loading skeleton ── */}
          {loading ? (
            <>
              {/* Category tab skeletons */}
              <div className="mb-8 flex gap-3 overflow-x-auto pb-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className="h-9 w-28 shrink-0 animate-pulse rounded-full bg-slate-200"
                  />
                ))}
              </div>
              {/* Photo grid skeletons */}
              <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div
                    key={n}
                    className="mb-4 animate-pulse overflow-hidden rounded-2xl bg-slate-200"
                    style={{ height: `${140 + (n % 3) * 60}px` }}
                  />
                ))}
              </div>
            </>
          ) : error ? (
            /* ── Error state ── */
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center"
            >
              <p className="text-sm text-rose-800">{error}</p>
              <button
                type="button"
                onClick={loadAlbums}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white"
              >
                <RefreshCw className="h-4 w-4" /> Try again
              </button>
            </div>
          ) : albums.length === 0 ? (
            /* ── Empty state ── */
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <ImageIcon className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 text-lg font-bold text-slate-700">
                Our gallery is being prepared
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Check back soon for photos from the restaurant.
              </p>
              <Link
                to="/shop"
                className="mt-5 inline-flex rounded-xl bg-[#1a3c36] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#245048]"
              >
                Explore the menu
              </Link>
            </div>
          ) : (
            <>
              {/* ── Category filter tabs ── */}
              <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 rounded-full px-5 py-2 text-[13px] font-semibold transition-all ${
                      activeCategory === cat
                        ? "bg-[#1a3c36] text-white shadow-md"
                        : "border border-[#d9d6d2] bg-white text-[#374151] hover:border-[#1a3c36] hover:text-[#1a3c36]"
                    }`}
                  >
                    {cat}
                    {cat !== "All" && (
                      <span
                        className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          activeCategory === cat
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {albums.filter((a) => a.category === cat).reduce(
                          (sum, a) =>
                            sum +
                            (Array.isArray(a.photos) ? a.photos.length : 0),
                          0
                        )}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── Photo count badge ── */}
              {allPhotos.length > 0 && (
                <p className="mb-5 text-[13px] text-slate-400">
                  Showing{" "}
                  <span className="font-semibold text-[#1a3c36]">
                    {allPhotos.length}
                  </span>{" "}
                  photo{allPhotos.length !== 1 ? "s" : ""}
                  {activeCategory !== "All" && (
                    <> in <span className="font-semibold">{activeCategory}</span></>
                  )}
                </p>
              )}

              {/* ── Masonry photo grid ── */}
              {allPhotos.length > 0 ? (
                <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
                  {allPhotos.map((photo, idx) => (
                    <div
                      key={`${photo.src}-${idx}`}
                      className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm cursor-pointer group"
                      onClick={() => openLightbox(idx)}
                    >
                      <div className="relative overflow-hidden">
                        <img
                          src={photo.src}
                          alt={photo.albumTitle}
                          loading="lazy"
                          className="w-full object-cover transition duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 drop-shadow" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* No photos in this category yet */
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                  <ImageIcon className="mx-auto h-9 w-9 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-500">
                    No photos in this category yet
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveCategory("All")}
                    className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    View all photos
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </PageContainer>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Prev */}
          {lightbox.photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prevPhoto(); }}
              className="absolute left-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition text-xl font-bold"
            >
              ‹
            </button>
          )}

          {/* Image */}
          <div
            className="relative max-h-[88vh] max-w-[88vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.photos[lightbox.index].src}
              alt={lightbox.photos[lightbox.index].albumTitle}
              className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl"
            />
            <p className="mt-3 text-center text-[13px] font-semibold text-white/70">
              {lightbox.photos[lightbox.index].albumTitle} &nbsp;·&nbsp;{" "}
              {lightbox.index + 1} / {lightbox.photos.length}
            </p>
          </div>

          {/* Next */}
          {lightbox.photos.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); nextPhoto(); }}
              className="absolute right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition text-xl font-bold"
            >
              ›
            </button>
          )}
        </div>
      )}
    </main>
  );
}

export default Gallery;
