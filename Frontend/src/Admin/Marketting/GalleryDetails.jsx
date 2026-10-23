import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Eye, Image as ImageIcon, Pencil, Video, Volume2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api, { BACKEND_BASE_URL } from "../../api";

const mediaUrl = (path) => {
  if (!path || typeof path !== "string") return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${BACKEND_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

const asMediaList = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    return mediaPath(value) ? [value] : Object.values(value);
  }
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [value];
  }
};

const mediaPath = (media) => {
  if (typeof media === "string") return media;
  if (!media || typeof media !== "object") return "";
  return media.url || media.path || media.src || media.src_url || media.file_url || media.file_path || media.media_url || media.media_path || "";
};

const getMediaKind = (media, path, defaultKind = "image") => {
  const declaredType = String(media?.media_type || media?.type || media?.mime_type || media?.mime || "").toLowerCase();
  if (declaredType.startsWith("video") || declaredType === "video") return "video";
  if (declaredType.startsWith("audio") || declaredType === "audio") return "audio";
  if (declaredType.startsWith("image") || declaredType === "photo") return "image";
  const cleanPath = String(path).split(/[?#]/)[0].toLowerCase();
  if (/\.(mp4|webm|ogg|mov|m4v|m3u8)$/.test(cleanPath)) return "video";
  if (/\.(mp3|wav|ogg|m4a|aac|flac|opus)$/.test(cleanPath)) return "audio";
  return defaultKind;
};

const getAlbumMedia = (album) => {
  const fields = [
    ["photos", "image"],
    ["images", "image"],
    ["videos", "video"],
    ["audio", "audio"],
    ["audios", "audio"],
    ["video_url", "video"],
    ["audio_url", "audio"],
    ["media", ""],
    ["media_files", ""],
  ];
  const seen = new Set();
  return fields.flatMap(([field, defaultKind]) => asMediaList(album[field])
    .map((entry) => {
      const path = mediaPath(entry);
      if (!path) return null;
      const kind = getMediaKind(entry, path, defaultKind || "image");
      const key = `${kind}:${path}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return { path, kind, title: entry?.title || entry?.name || "" };
    })
    .filter(Boolean));
};

const GalleryDetails = () => {
  const navigate = useNavigate();
  const { albumId } = useParams();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAlbum = async () => {
      try {
        const response = await api.get(`/gallery/${albumId}`);
        setAlbum(response?.data?.data || null);
      } catch (requestError) {
        console.error("Failed to load gallery album:", requestError);
        setError(requestError?.response?.data?.message || "Unable to load gallery album.");
      } finally {
        setLoading(false);
      }
    };

    loadAlbum();
  }, [albumId]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#f2f3f0] text-sm text-[#5d5d5d]">Loading gallery album...</div>;
  if (error || !album) {
    return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f2f3f0] text-sm text-[#b42318]"><span>{error || "Gallery album not found."}</span><button type="button" onClick={() => navigate("/admin/gallery")} className="rounded-xl bg-[#162420] px-4 py-2 font-medium text-white">Back to Gallery</button></div>;
  }

  const media = getAlbumMedia(album);
  const photoCount = media.filter((item) => item.kind === "image").length;
  const videoCount = media.filter((item) => item.kind === "video").length;
  const audioCount = media.filter((item) => item.kind === "audio").length;
  const createdAt = album.created_at ? new Date(album.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <div className="min-h-screen bg-[#f2f3f0] p-4 md:p-6">
      <div className="mx-auto max-w-[1250px]">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button type="button" onClick={() => navigate("/admin/gallery")} className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#49645e] hover:text-[#162420]"><ArrowLeft className="h-4 w-4" /> Back to Gallery</button>
            <h1 className="text-[2.1rem] font-bold tracking-[-0.05em] text-[#1f1d1b]">Gallery Album</h1>
            <p className="mt-2 text-[13px] text-[#646464]">Dashboard <span className="mx-2 text-[#9a9a9a]">&gt;</span> Gallery <span className="mx-2 text-[#9a9a9a]">&gt;</span> {album.title}</p>
          </div>
          <button type="button" onClick={() => navigate(`/admin/gallery/add?edit=${albumId}`)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#162420] px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#1a3c36]"><Pencil className="h-4 w-4" /> Edit Album</button>
        </div>

        <section className="rounded-2xl border border-[#e7e0d8] bg-white p-5 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-[#f3f0ec]">{album.cover_image ? <img src={mediaUrl(album.cover_image)} alt={album.title} className="h-full w-full object-contain" /> : <ImageIcon className="h-16 w-16 text-[#c1b8ad]" />}</div>
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#858585]">Gallery Album</p><h2 className="mt-2 text-3xl font-bold text-[#1f1d1b]">{album.title}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${album.status === "Active" ? "bg-[#edf7f1] text-[#2d7b5a]" : "bg-[#fff0f0] text-[#d04d4d]"}`}>{album.status}</span></div>
              <p className="mt-4 text-sm leading-6 text-[#5f5f5f]">{album.short_description || "No short description available."}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl bg-[#f7f4ef] p-3"><p className="text-xs text-[#777]">Category</p><p className="mt-1 font-semibold text-[#282828]">{album.category || "—"}</p></div><div className="rounded-xl bg-[#f1f6f4] p-3"><Eye className="h-4 w-4 text-[#28745a]" /><p className="mt-2 text-xs text-[#777]">Images</p><p className="font-semibold text-[#282828]">{photoCount}</p></div><div className="rounded-xl bg-[#f2f4fa] p-3"><Video className="h-4 w-4 text-[#526a9e]" /><p className="mt-2 text-xs text-[#777]">Videos</p><p className="font-semibold text-[#282828]">{videoCount}</p></div><div className="rounded-xl bg-[#f7f1fa] p-3"><Volume2 className="h-4 w-4 text-[#8155a1]" /><p className="mt-2 text-xs text-[#777]">Audio</p><p className="font-semibold text-[#282828]">{audioCount}</p></div><div className="rounded-xl bg-[#f2f4fa] p-3 sm:col-span-2 lg:col-span-4"><CalendarDays className="h-4 w-4 text-[#526a9e]" /><p className="mt-2 text-xs text-[#777]">Created</p><p className="font-semibold text-[#282828]">{createdAt}</p></div></div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-[#777]">Sort Order</p><p className="mt-1 text-sm font-medium">{album.sort_order || 1}</p></div><div><p className="text-xs text-[#777]">Album ID</p><p className="mt-1 break-all text-sm font-medium">{album.album_id}</p></div></div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-[#e7e0d8] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1f1d1b]">Images, video &amp; audio</h2>
          {media.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {media.map((item, index) => (
                <article key={`${item.kind}-${item.path}-${index}`} className="min-w-0 overflow-hidden rounded-xl border border-[#e7e0d8] bg-[#faf9f7]">
                  {item.kind === "video" ? (
                    <video src={mediaUrl(item.path)} controls preload="metadata" className="aspect-video w-full bg-black" aria-label={item.title || `${album.title} video ${index + 1}`} />
                  ) : item.kind === "audio" ? (
                    <div className="flex min-h-36 flex-col justify-center gap-4 p-5">
                      <div className="flex items-center gap-3 text-[#526a9e]"><Volume2 className="h-6 w-6 shrink-0" /><p className="break-all text-sm font-semibold text-[#282828]">{item.title || item.path.split("/").pop()}</p></div>
                      <audio src={mediaUrl(item.path)} controls preload="metadata" className="w-full" aria-label={item.title || `${album.title} audio ${index + 1}`} />
                    </div>
                  ) : (
                    <img src={mediaUrl(item.path)} alt={item.title || `${album.title} image ${index + 1}`} loading="lazy" className="aspect-square w-full bg-[#f3f0ec] object-contain" />
                  )}
                  {item.title && item.kind !== "audio" && <p className="truncate px-3 py-2 text-xs font-medium text-[#5f5f5f]">{item.title}</p>}
                </article>
              ))}
            </div>
          ) : <p className="mt-3 text-sm text-[#777]">No media uploaded.</p>}
        </section>
        <section className="mt-6 rounded-2xl border border-[#e7e0d8] bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold text-[#1f1d1b]">Description</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#5f5f5f]">{album.description || "No description available."}</p></section>
      </div>
    </div>
  );
};

export default GalleryDetails;
