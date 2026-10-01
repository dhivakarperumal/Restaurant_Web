import { useState, useEffect, useMemo } from "react";
import {
  Search,
  ChevronDown,
  Filter,
  Download,
  Upload,
  Plus,
  Image as ImageIcon,
  MonitorPlay,
  Users,
  Star,
  Package,
  List,
  LayoutGrid,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api, { API_URL } from "../../api";
import toast from "react-hot-toast";

const GalleryManagement = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("albums");
  const [viewMode, setViewMode] = useState("table");
  
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const fetchAlbums = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/gallery");
      if (data.success) {
        setAlbums(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching gallery albums:", error);
      toast.error("Failed to load gallery albums");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  // Filter Albums
  const filteredAlbums = useMemo(() => {
    return albums.filter(album => {
      const matchSearch = !search || album.title?.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "All Categories" || album.category === categoryFilter;
      const matchStatus = statusFilter === "All Status" || album.status === statusFilter;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [albums, search, categoryFilter, statusFilter]);

  // Derived Stats
  const totalAlbums = albums.length;
  const totalPhotos = albums.reduce((acc, curr) => acc + (curr.photo_count || 0), 0);
  const activeAlbums = albums.filter(a => a.status === 'Active').length;
  const inactiveAlbums = albums.filter(a => a.status === 'Inactive').length;

  const statCards = [
    {
      title: "Total Albums",
      value: totalAlbums,
      subtext: "All gallery albums",
      icon: Package,
      color: "#22c55e",
      wave: "#9be7b9",
    },
    {
      title: "Total Photos",
      value: totalPhotos,
      subtext: "Across all albums",
      icon: ImageIcon,
      color: "#06b6d4",
      wave: "#93dce8",
    },
    {
      title: "Total Views",
      value: "0", // Views not tracked yet
      subtext: "Album & photo views",
      icon: MonitorPlay,
      color: "#a855f7",
      wave: "#d8b4f5",
    },
    {
      title: "Active Albums",
      value: activeAlbums,
      subtext: "Currently active",
      icon: Users,
      color: "#f59e0b",
      wave: "#f9d99b",
    },
    {
      title: "Inactive Albums",
      value: inactiveAlbums,
      subtext: "Currently inactive",
      icon: Star,
      color: "#f97316",
      wave: "#ffc39e",
    },
  ];

  const getImageUrl = (path) => {
    if (!path) return "linear-gradient(135deg, #f3f4f6, #e5e7eb)";
    if (path.startsWith("http") || path.startsWith("data:")) return `url(${path})`;
    const baseUrl = API_URL.replace("/api", "");
    return `url(${baseUrl}${path})`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return { date: "—", time: "—" };
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
    };
  };

  const handleDelete = async (album_id) => {
    if (!window.confirm("Are you sure you want to delete this album?")) return;
    try {
      await api.delete(`/gallery/${album_id}`);
      setAlbums((previousAlbums) => previousAlbums.filter((album) => album.album_id !== album_id));
      toast.success("Gallery album deleted successfully");
    } catch (error) {
      console.error("Error deleting gallery album:", error);
      toast.error(error?.response?.data?.message || "Failed to delete gallery album");
    }
  };

  const handleEdit = (albumId) => navigate(`/admin/gallery/add?edit=${albumId}`);
  const handleView = (albumId) => navigate(`/admin/gallery/${albumId}`);

  return (
    <div className="min-h-screen bg-[#f2f3f0] p-4 md:p-6">
      <div className="mx-auto max-w-[1500px]">
        
        {/* ── HEADER ── */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[2.1rem] font-bold tracking-[-0.05em] text-[#1f1d1b]">
              Gallery Management
            </h1>
            <p className="mt-1 text-[13px] text-[#646464]">
              Dashboard <span className="mx-2 text-[#9a9a9a]">&gt;</span>
              <span className="font-medium text-[#2a2a2a]">Gallery Management</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="inline-flex h-[42px] items-center gap-2 rounded-xl border border-[#d9d6d2] bg-white px-4 text-[14px] font-medium text-[#2d2d2d] shadow-sm transition hover:bg-[#faf7f3]">
              <Download className="h-4 w-4" />
              Export
            </button>
            <button className="inline-flex h-[42px] items-center gap-2 rounded-xl border border-[#d9d6d2] bg-white px-4 text-[14px] font-medium text-[#2d2d2d] shadow-sm transition hover:bg-[#faf7f3]">
              <Upload className="h-4 w-4" />
              Import
            </button>
            <Link
              to="/admin/gallery/add"
              className="inline-flex h-[42px] items-center gap-2 rounded-xl bg-[#162420] px-4 text-[14px] font-semibold text-white shadow-md transition hover:bg-[#1a3c36]"
            >
              <Plus className="h-4 w-4" />
              Add New Album
            </Link>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div key={idx} className="relative flex min-h-[176px] flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                <div className="flex flex-1 items-start gap-4">
                  <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: card.color }}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 pt-1">
                    <p className="text-sm font-medium text-[#374151]">{card.title}</p>
                    <p className="mt-2 truncate text-[1.75rem] font-bold leading-none text-[#111827]">{card.value}</p>
                    <p className="mt-5 text-xs font-medium text-[#00a76f]">↗ {card.subtext}</p>
                    <p className="mt-1 text-[11px] text-[#7c8798]">gallery overview</p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 h-6 w-full" style={{ background: card.wave, clipPath: "ellipse(65% 75% at 55% 100%)" }} />
              </div>
            );
          })}
        </div>

        {/* ── MAIN CONTENT AREA ── */}
        <div className="rounded-2xl border border-[#e7e0d8] bg-white p-2 shadow-sm">
          
          {/* TOOLBAR */}
          <div className="p-3 flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-center lg:justify-between mt-2">
            
            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap lg:shrink-0">
              <div className="relative w-full max-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7a7a]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search albums..."
                  className="h-[42px] w-full rounded-xl border border-[#dfe2e5] bg-white pl-9 pr-3 text-[13px] text-[#2d2d2d] outline-none placeholder:text-[#8a8a8a] focus:border-[#d2bc8a]"
                />
              </div>
            </div>

            {/* Sort & View Toggles */}
            <div className="flex items-center gap-3">
            
              
           <div className="relative">
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-[42px] appearance-none rounded-xl border border-[#dfe2e5] bg-white pl-3 pr-8 text-[13px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a] cursor-pointer"
                >
                  <option value="All Categories">All Categories</option>
                  <option value="Photo Frames">Photo Frames</option>
                  <option value="Collage Frames">Collage Frames</option>
                  <option value="Photo Prints">Photo Prints</option>
                  <option value="Canvas Prints">Canvas Prints</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
              </div>

              <div className="relative">
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-[42px] appearance-none rounded-xl border border-[#dfe2e5] bg-white pl-3 pr-8 text-[13px] font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a] cursor-pointer"
                >
                  <option value="All Status">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
              </div>

              <div className="flex overflow-hidden rounded-xl border border-[#dfe2e5] bg-white">
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex h-[40px] w-[40px] items-center justify-center border-r border-[#dfe2e5] transition ${
                    viewMode === "table" ? "bg-[#f2f3f0] text-[#1a3c36]" : "text-[#6a6a6a] hover:bg-[#faf9f8]"
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("card")}
                  className={`flex h-[40px] w-[40px] items-center justify-center transition ${
                    viewMode === "card" ? "bg-[#162420] text-white" : "text-[#6a6a6a] hover:bg-[#faf9f8]"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          

          {/* TABLE CONTENT */}
          <div className="overflow-x-auto p-1">
            {viewMode === "card" ? (
              <div className="grid gap-4 p-2 sm:grid-cols-2 xl:grid-cols-3">
                {loading ? (
                  <div className="col-span-full flex min-h-[200px] items-center justify-center text-sm text-[#5d5d5d]">
                    <Loader2 className="mr-2 h-6 w-6 animate-spin text-[#d4a843]" />
                    Loading albums...
                  </div>
                ) : filteredAlbums.length === 0 ? (
                  <p className="col-span-full px-4 py-10 text-center text-sm text-[#6a6a6a]">No albums found.</p>
                ) : (
                  filteredAlbums.map((album) => {
                    const isActive = album.status === "Active";
                    return (
                      <article key={album.album_id} className="overflow-hidden rounded-xl border border-[#e7e0d8] bg-white shadow-sm transition-shadow hover:shadow-md">
                        <div className="h-48 w-full bg-[#f3f0ec] bg-cover bg-center" style={{ backgroundImage: getImageUrl(album.cover_image) }} />
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="truncate text-base font-bold text-[#1f1d1b]">{album.title}</h2>
                              <p className="mt-1 text-xs text-[#7a7a7a]">{album.album_id}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${isActive ? "bg-[#edf7f1] text-[#2d7b5a]" : "bg-[#fff0f0] text-[#d04d4d]"}`}>
                              {album.status}
                            </span>
                          </div>
                          <p className="mt-3 line-clamp-2 min-h-10 text-sm text-[#5f5f5f]">{album.short_description || "No description available."}</p>
                          <div className="mt-4 flex items-center justify-between border-t border-[#f0ebe6] pt-3 text-xs text-[#6a6a6a]">
                            <span>{album.category || "Uncategorized"}</span>
                            <span>{album.photo_count || 0} photos</span>
                          </div>
                          <div className="mt-4 flex justify-end gap-2">
                            <button type="button" onClick={() => handleEdit(album.album_id)} aria-label="Edit gallery album" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997] hover:text-[#1a1a1a]">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => handleView(album.album_id)} aria-label="View gallery album" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997] hover:text-[#1a1a1a]">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => handleDelete(album.album_id)} aria-label="Delete gallery album" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3d7d7] bg-[#fff8f8] text-[#d04d4d] transition hover:bg-[#fff0f0]">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            ) : (
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-[#f0e6d2] text-left text-sm font-semibold text-[#3d3d3d]">
                  <th className="rounded-tl-md px-4 py-4 whitespace-nowrap">S.No</th>
                  <th className="px-4 py-4 whitespace-nowrap">Album</th>
                  <th className="px-4 py-4 whitespace-nowrap">Category</th>
                  <th className="px-4 py-4 whitespace-nowrap">Photos</th>
                  <th className="px-4 py-4 whitespace-nowrap">Status</th>
                  <th className="px-4 py-4 whitespace-nowrap">Created At</th>
                  <th className="rounded-tr-md px-4 py-4 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-10 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-[#d4a843] mx-auto mb-2" />
                      <p className="text-[#6a6a6a] text-sm">Loading albums...</p>
                    </td>
                  </tr>
                ) : filteredAlbums.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-10 text-center">
                      <p className="text-[#6a6a6a] text-sm">No albums found.</p>
                    </td>
                  </tr>
                ) : (
                  filteredAlbums.map((album) => {
                    const isActive = album.status === "Active";
                    const { date, time } = formatDate(album.created_at);
                    return (
                      <tr
                        key={album.album_id}
                        className="border-b border-[#f0ebe6] align-middle transition-colors hover:bg-[#faf9f8]"
                      >
                        <td className="border-t border-[#f0ebe6] px-4 py-3 text-[13px] text-[#5d5d5d]">
                          {filteredAlbums.indexOf(album) + 1}
                        </td>

                        {/* Album Info */}
                        <td className="border-t border-[#f0ebe6] px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-12 w-[72px] shrink-0 rounded-lg bg-cover bg-center border border-[#e7e0d8] shadow-inner"
                              style={{ backgroundImage: getImageUrl(album.cover_image) }}
                            />
                            <div>
                              <div className="text-[14px] font-bold text-[#1f1f1f]">
                                {album.title}
                              </div>
                              <div className="text-[12px] text-[#7a7a7a] line-clamp-1 max-w-[200px]">
                                {album.short_description || "—"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="border-t border-[#f0ebe6] px-4 py-3 text-[13px] text-[#4d4d4d]">
                          {album.category || "—"}
                        </td>

                        {/* Photos */}
                        <td className="border-t border-[#f0ebe6] px-4 py-3 text-[13px] text-[#4d4d4d]">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-[#8a8a8a]" />
                            {album.photo_count || 0}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="border-t border-[#f0ebe6] px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              isActive
                                ? "bg-[#edf7f1] text-[#2d7b5a]"
                                : "bg-[#fff0f0] text-[#d04d4d]"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isActive ? "bg-[#2d7b5a]" : "bg-[#d04d4d]"
                              }`}
                            />
                            {album.status}
                          </span>
                        </td>

                        {/* Created At */}
                        <td className="border-t border-[#f0ebe6] px-4 py-3 text-[12px] text-[#4d4d4d]">
                          <div>{date}</div>
                          <div className="text-[#8a8a8a]">{time}</div>
                        </td>

                        {/* Actions */}
                        <td className="border-t border-[#f0ebe6] px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => handleEdit(album.album_id)} aria-label="Edit gallery album" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997] hover:text-[#1a1a1a]">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => handleView(album.album_id)} aria-label="View gallery album" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#4d4d4d] transition hover:border-[#d0b997] hover:text-[#1a1a1a]">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(album.album_id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3d7d7] bg-[#fff8f8] text-[#d04d4d] transition hover:bg-[#fff0f0]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            )}
          </div>

          {/* PAGINATION */}
          <div className="flex flex-col gap-3 p-4 text-[13px] text-[#6a6a6a] md:flex-row md:items-center md:justify-between border-t border-[#f0ebe6]">
            <span>
              Showing {filteredAlbums.length > 0 ? 1 : 0} to {filteredAlbums.length} of {albums.length} albums
            </span>

            <div className="flex items-center gap-2">
              <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e3dbd2] bg-white text-[#7d7d7d]">
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#162420] text-white font-medium">
                1
              </button>
              
              <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e3dbd2] bg-white text-[#7d7d7d]">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default GalleryManagement;
