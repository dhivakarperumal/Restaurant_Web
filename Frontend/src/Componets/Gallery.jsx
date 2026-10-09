import { useCallback, useEffect, useState } from "react";
import { Image as ImageIcon, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import api, { BACKEND_BASE_URL } from "../api";
import PageContainer from "../CommonComponents/PageContainer";
import PageHeader from "../CommonComponents/PageHeader";

const imageUrl = (path) => {
  if (!path || typeof path !== "string") return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${BACKEND_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

function Gallery() {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAlbums = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/gallery");
      if (!data?.success || !Array.isArray(data.data)) {
        throw new Error(data?.message || "The gallery response was invalid.");
      }
      setAlbums(data.data.filter((album) => String(album.status || "Active").toLowerCase() === "active"));
    } catch (requestError) {
      console.error("Failed to load public gallery:", requestError);
      setError(requestError.response?.data?.message || requestError.message || "The gallery could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  return (
    <main className="min-h-screen bg-[#fcfbf9] pb-16 text-[#203129]">
      <PageHeader title="Gallery" />
      <PageContainer>
        <section className="py-10 sm:py-14">
          <div className="mb-7 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a34f32]">From our restaurant</p>
            <h2 className="mt-2 font-serif text-3xl font-bold">A taste of the moments we love</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">Explore food, celebrations, and memories shared around our tables.</p>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="aspect-[4/3] bg-slate-200" />
                  <div className="space-y-2 p-4"><div className="h-4 w-2/3 rounded bg-slate-200" /><div className="h-3 w-full rounded bg-slate-100" /></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
              <p className="text-sm text-rose-800">{error}</p>
              <button type="button" onClick={loadAlbums} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white">
                <RefreshCw className="h-4 w-4" /> Try again
              </button>
            </div>
          ) : albums.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map((album) => (
                <article key={album.album_id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="aspect-[4/3] overflow-hidden bg-[#eef5f3]">
                    {album.cover_image ? (
                      <img src={imageUrl(album.cover_image)} alt={album.title || "Gallery album"} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#1a3c36]/40"><ImageIcon className="h-12 w-12" /></div>
                    )}
                  </div>
                  <div className="p-5">
                    {album.category && <p className="text-[11px] font-bold uppercase tracking-wider text-[#a34f32]">{album.category}</p>}
                    <h3 className="mt-1 text-lg font-bold text-[#203129]">{album.title || "Restaurant moments"}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{album.short_description || album.description || "A collection of moments from our restaurant."}</p>
                    <p className="mt-4 text-xs font-semibold text-slate-400">{Number(album.photo_count || album.photos?.length || 0)} photos</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <ImageIcon className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 text-lg font-bold text-slate-700">Our gallery is being prepared</h3>
              <p className="mt-2 text-sm text-slate-500">Check back soon for photos from the restaurant.</p>
              <Link to="/shop" className="mt-5 inline-flex rounded-xl bg-[#1a3c36] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#245048]">Explore the menu</Link>
            </div>
          )}
        </section>
      </PageContainer>
    </main>
  );
}

export default Gallery;
