import React, { useState, useEffect, useContext } from "react";
import { createPortal } from "react-dom";
import { useAdmin } from "../../PrivateRouter/AdminContext";
import api, { BACKEND_BASE_URL } from "../../api";
import {
    FiPlus,
    FiSearch,
    FiEdit2,
    FiTrash2,
    FiVideo,
    FiX,
    FiPlay,
    FiUploadCloud,
    FiGrid,
    FiList,
    FiCheck,
    FiSlash
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import { useAuth } from "../../PrivateRouter/AuthContext";

const getYoutubeId = (value) => {
    if (!value) return "";
    try {
        const url = new URL(value);
        if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0];
        if (url.searchParams.get("v")) return url.searchParams.get("v");
        const parts = url.pathname.split("/").filter(Boolean);
        return parts[0] === "shorts" || parts[0] === "embed" ? parts[1] : value;
    } catch {
        return value.trim();
    }
};

const resolveMediaUrl = (url) => {
    if (!url || /^(https?:|data:|blob:)/i.test(url)) return url;
    const backendUrl = (BACKEND_BASE_URL || window.location.origin).replace(/\/$/, "");
    return `${backendUrl}${url.startsWith("/") ? url : `/${url}`}`;
};

const VideoManagement = () => {
    const { user } = useAuth();
    const { videosCache, setVideosCache } = useAdmin();
    const [videos, setVideos] = useState(videosCache || []);
    const [loading, setLoading] = useState(!videosCache);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentVideo, setCurrentVideo] = useState({ title: "", videoId: "", thumbnail: "", type: "youtube" });
    const [isEditing, setIsEditing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [thumbUploading, setThumbUploading] = useState(false);
    const [viewMode, setViewMode] = useState("table");

    const fetchVideos = async () => {
        if (!videosCache) setLoading(true);
        try {
            const response = await api.get("/videos");
            const data = Array.isArray(response.data) ? response.data : [];
            setVideos(data);
            setVideosCache(data);
        } catch (error) {
            console.error("Error fetching videos:", error);
            toast.error("Failed to load videos");
            setVideos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this video?")) return;
        try {
            await api.delete(`/videos/${id}`);
            setVideos(videos.filter(v => v.id !== id));
            toast.success("Video deleted successfully");
        } catch (error) {
            console.error("Error deleting video:", error);
            toast.error("Failed to delete video");
        }
    };

    const handleOpenModal = (video = { title: "", videoId: "", thumbnail: "", type: "youtube" }) => {
        setCurrentVideo(video);
        setIsEditing(!!video.id);
        setIsModalOpen(true);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) {
            toast.error("File is too large! Max 50MB.");
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("video", file);
            const response = await api.post("/videos/upload", formData);
            setCurrentVideo(previous => ({ ...previous, videoId: response.data.url, type: "custom" }));
            toast.success("Video uploaded successfully!");
        } catch (error) {
            console.error("Video upload failed:", error);
            toast.error(error.response?.data?.message || "Video upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleThumbnailUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error("Thumbnail too large! Max 2MB.");
            return;
        }

        setThumbUploading(true);
        try {
            const formData = new FormData();
            formData.append("image", file);
            const response = await api.post("/videos/upload-thumbnail", formData);
            setCurrentVideo(previous => ({ ...previous, thumbnail: response.data.url }));
            toast.success("Thumbnail ready!");
        } catch (error) {
            console.error("Thumbnail upload failed:", error);
            toast.error(error.response?.data?.message || "Thumbnail upload failed");
        } finally {
            setThumbUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const videoPayload = {
                ...currentVideo,
                user_id: user?.user_id || currentVideo.user_id || null,
            };
            if (isEditing) {
                await api.put(`/videos/${currentVideo.id}`, videoPayload);
                toast.success("Video updated successfully");
            } else {
                await api.post("/videos", videoPayload);
                toast.success("Video added successfully");
            }
            fetchVideos();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving video:", error);
            toast.error("Failed to save video");
        }
    };

    const filteredVideos = videos.filter((video) =>
        (video.title || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
    const totalVideos = videos.length;
    const activeVideos = videos.filter((video) => video.active !== false).length;
    const inactiveVideos = videos.filter((video) => video.active === false).length;
    const videoStats = [
        { title: "Total Videos", value: totalVideos, note: "All uploaded videos", icon: FiVideo, color: "#22c55e", wave: "#9be7b9" },
        { title: "Active Videos", value: activeVideos, note: "Available in showcase", icon: FiCheck, color: "#06b6d4", wave: "#93dce8" },
        { title: "Inactive Videos", value: inactiveVideos, note: "Currently hidden", icon: FiSlash, color: "#f97316", wave: "#ffc39e" },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 min-h-[600px]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {videoStats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.title} className="relative flex min-h-[176px] flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                            <div className="flex flex-1 items-start gap-4">
                                <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: stat.color }}>
                                    <Icon size={28} />
                                </div>
                                <div className="min-w-0 pt-1">
                                    <p className="text-sm font-medium text-[#374151]">{stat.title}</p>
                                    <p className="mt-2 truncate text-[1.75rem] font-bold leading-none text-[#111827]">{stat.value.toLocaleString()}</p>
                                    <p className="mt-5 text-xs font-medium text-[#00a76f]">↗ {stat.note}</p>
                                    <p className="mt-1 text-[11px] text-[#7c8798]">video overview</p>
                                </div>
                            </div>
                            <div className="absolute bottom-0 left-0 h-6 w-full" style={{ background: stat.wave, clipPath: "ellipse(65% 75% at 55% 100%)" }} />
                        </div>
                    );
                })}
            </div>
            {/* Header Section */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="relative w-full xl:w-[420px] xl:max-w-[420px]">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search videos by title..."
                        className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg outline-none focus:bg-white focus:border-[#4b0b78] transition-all text-sm font-bold"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3">
                    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
                        <button type="button" onClick={() => setViewMode("table")} className={`p-2 rounded-md transition-colors ${viewMode === "table" ? "bg-white text-[#4b0b78] shadow-sm" : "text-gray-500 hover:text-[#4b0b78]"}`} aria-label="Table mode" title="Table mode"><FiList size={16} /></button>
                        <button type="button" onClick={() => setViewMode("card")} className={`p-2 rounded-md transition-colors ${viewMode === "card" ? "bg-white text-[#4b0b78] shadow-sm" : "text-gray-500 hover:text-[#4b0b78]"}`} aria-label="Card mode" title="Card mode"><FiGrid size={16} /></button>
                    </div>
                    <button onClick={() => handleOpenModal()} className="flex items-center justify-center gap-2 bg-[#1a3c36] hover:bg-[#214a42] text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-emerald-900/20 active:scale-95"><FiPlus /> Add New Video</button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm text-slate-800">
                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-bold">Loading videos...</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-slate-800">
                    {viewMode === "table" ? <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse block md:table">
                            <thead className="hidden md:table-header-group">
                                <tr className="bg-[#f0e6d2] text-left text-sm font-semibold text-[#3d3d3d]">
                                    <th className="rounded-tl-md px-4 py-4 text-xs font-black  capitalize tracking-wider text-center">S No</th>
                                    <th className="px-6 py-4 text-xs font-black  capitalize tracking-wider">Preview</th>
                                    <th className="px-6 py-4 text-xs font-black  capitalize tracking-wider">Title</th>
                                    <th className="px-6 py-4 text-xs font-black  capitalize tracking-wider">Source</th>
                                    <th className="rounded-tr-md px-6 py-4 text-xs font-black  capitalize tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="block md:table-row-group divide-y divide-gray-50 text-slate-800 px-3 py-4 md:p-0">
                                {filteredVideos.map((video, index) => (
                                        <tr key={video.id} className="hover:bg-blue-50/30 transition-colors group block md:table-row bg-white md:bg-transparent border border-gray-100 md:border-0 rounded-2xl md:rounded-none mb-4 md:mb-0 shadow-sm md:shadow-none">
                                            <td className="px-3 py-4 md:px-4 md:py-4 block md:table-cell border-b border-gray-50 md:border-b-0 text-center"><span className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest mr-3">S No</span><span className="text-sm font-bold text-gray-400">{index + 1}</span></td>
                                            <td className="px-3 py-4 md:px-6 md:py-4 block md:table-cell border-b border-gray-50 md:border-b-0">
                                                <div className="flex md:block items-center justify-between w-full">
                                                    <span className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest">Preview</span>
                                                    <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-gray-100 bg-gray-100 hover:shadow-md transition-shadow">
                                                        {video.thumbnail ? (
                                                            <img src={resolveMediaUrl(video.thumbnail)} alt="" className="w-full h-full object-cover" />
                                                        ) : video.type === 'youtube' ? (
                                                            <img
                                                                src={`https://img.youtube.com/vi/${getYoutubeId(video.videoId)}/hqdefault.jpg`}
                                                                alt={video.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-slate-200">
                                                                <FiVideo className="text-slate-400" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                            <FiPlay className="text-white" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 md:px-6 md:py-4 block md:table-cell border-b border-gray-50 md:border-b-0">
                                                <div className="flex md:block items-center justify-between w-full">
                                                    <span className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest">Title</span>
                                                    <p className="text-sm font-bold text-slate-800 text-right md:text-left">{video.title}</p>
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 md:px-6 md:py-4 block md:table-cell border-b border-gray-50 md:border-b-0">
                                                <div className="flex md:block items-center justify-between w-full">
                                                    <span className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest">Source</span>
                                                    <div className="flex flex-col gap-1 items-end md:items-start">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest inline-block w-fit ${video.type === 'youtube' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                            {video.type}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 truncate max-w-[150px] text-right md:text-left">
                                                            {video.type === 'youtube' ? video.videoId : 'Uploaded File'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 md:px-6 md:py-4 block md:table-cell text-right md:text-right">
                                                <div className="flex md:block items-center justify-between w-full">
                                                    <span className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</span>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleOpenModal(video)}
                                                            className="p-2 border border-[#1a3c36] bg-[#1a3c36] text-white rounded-lg hover:bg-[#214a42] transition-all shadow-sm md:shadow-none"
                                                            title="Edit"
                                                        >
                                                            <FiEdit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(video.id)}
                                                            className="p-2 border border-[#1a3c36] bg-[#1a3c36] text-white rounded-lg hover:bg-[#214a42] transition-all shadow-sm md:shadow-none"
                                                            title="Delete"
                                                        >
                                                            <FiTrash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                        {filteredVideos.length === 0 && (
                            <div className="text-center py-10">
                                <p className="text-gray-400 font-bold">No videos found.</p>
                            </div>
                        )}
                    </div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
                        {filteredVideos.length === 0 ? <div className="col-span-full text-center py-16 text-gray-400 font-bold">No videos found.</div> : filteredVideos.map((video, index) => (
                            <article key={video.id} className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="h-40 bg-gray-100 relative">{video.thumbnail ? <img src={resolveMediaUrl(video.thumbnail)} alt={video.title} className="w-full h-full object-cover" /> : video.type === "youtube" ? <img src={`https://img.youtube.com/vi/${getYoutubeId(video.videoId)}/hqdefault.jpg`} alt={video.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><FiVideo size={32} /></div>}<span className="absolute top-3 left-3 bg-white/90 text-[10px] px-2 py-1 rounded font-black text-[#4b0b78]">S No. {index + 1}</span></div>
                                <div className="p-4 space-y-3"><div><h3 className="font-black text-slate-800 truncate">{video.title || "Untitled Video"}</h3><p className="text-xs text-gray-400 truncate">{video.type === "youtube" ? video.videoId : "Uploaded File"}</p></div><div className="flex gap-2"><button onClick={() => handleOpenModal(video)} className="flex-1 py-2 rounded-lg bg-[#1a3c36] text-white text-xs font-bold hover:bg-[#214a42]"><FiEdit2 className="inline mr-1" />Edit</button><button onClick={() => handleDelete(video.id)} className="flex-1 py-2 rounded-lg bg-[#1a3c36] text-white text-xs font-bold hover:bg-[#214a42]"><FiTrash2 className="inline mr-1" />Delete</button></div></div>
                            </article>
                        ))}
                    </div>}
                </div>
            )}

            {/* Modal - Perfectly Centered */}
            {isModalOpen && (
                createPortal(
                <div className="fixed inset-0 z-[1000] flex h-screen w-screen items-center justify-center bg-slate-900/80 px-4 backdrop-blur-[3px] animate-in fade-in duration-300">
                    <div
                        className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto hide-scrollbar"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#4b0b78] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
                                    <FiVideo size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-xl uppercase tracking-tighter leading-none">
                                        {isEditing ? "Modify Creation" : "New Showcase Video"}
                                    </h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1.5 leading-none">Media Studio</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-3 bg-white border border-gray-100 rounded-2xl transition-all text-gray-400 hover:text-red-500 hover:shadow-lg shadow-sm"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-8">
                            <div className="space-y-6">
                                {/* Title Input */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Video Title *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-6 py-4 bg-gray-50/50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all text-slate-800 font-bold shadow-inner"
                                        placeholder="e.g. Exclusive Silk Saree Showcase"
                                        value={currentVideo.title}
                                        onChange={(e) => setCurrentVideo({ ...currentVideo, title: e.target.value })}
                                    />
                                </div>

                                {/* Thumbnail Upload */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Cover Thumbnail (Optional)</label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleThumbnailUpload}
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        />
                                        <div className={`p-4 rounded-3xl border-2 border-dashed transition-all flex items-center gap-4 ${currentVideo.thumbnail ? 'border-blue-500/30 bg-blue-50/30' : 'border-gray-100 bg-gray-50/50 group-hover:border-blue-200'}`}>
                                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white shadow-sm flex-shrink-0 border border-gray-100">
                                                {currentVideo.thumbnail ? (
                                                    <img src={resolveMediaUrl(currentVideo.thumbnail)} className="w-full h-full object-cover" alt="Preview" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <FiUploadCloud size={24} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-black text-slate-800">{currentVideo.thumbnail ? "Replace Thumbnail" : "Upload Custom Cover"}</p>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">PNG • JPG • WEBP (MAX 2MB)</p>
                                            </div>
                                            {thumbUploading && <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
                                        </div>
                                    </div>
                                </div>

                                {/* Source Toggle */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Video Source</label>
                                    <div className="grid grid-cols-2 gap-3 p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
                                        <button
                                            type="button"
                                            onClick={() => setCurrentVideo({ ...currentVideo, type: 'youtube', videoId: isEditing && currentVideo.type === 'youtube' ? currentVideo.videoId : '' })}
                                            className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentVideo.type === 'youtube' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:bg-white/50'}`}
                                        >
                                            YouTube
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentVideo({ ...currentVideo, type: 'custom', videoId: isEditing && currentVideo.type === 'custom' ? currentVideo.videoId : '' })}
                                            className={`py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentVideo.type === 'custom' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:bg-white/50'}`}
                                        >
                                            Upload File
                                        </button>
                                    </div>
                                </div>

                                {/* Dynamic Input Based on Type */}
                                {currentVideo.type === 'youtube' ? (
                                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">YouTube Video ID</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-6 py-4 bg-gray-50/50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-red-500/20 focus:ring-4 focus:ring-red-500/5 transition-all text-slate-800 font-bold shadow-inner"
                                                placeholder="e.g. tgbNymZ7vqY"
                                                value={currentVideo.videoId}
                                                onChange={(e) => setCurrentVideo({ ...currentVideo, videoId: e.target.value })}
                                            />
                                            {currentVideo.videoId && !currentVideo.thumbnail && (
                                                <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100/50 flex items-center gap-3">
                                                    <img src={`https://img.youtube.com/vi/${getYoutubeId(currentVideo.videoId)}/maxresdefault.jpg`} className="w-16 h-10 object-cover rounded-lg" onError={(e) => e.target.src = 'https://via.placeholder.com/160x90?text=Wait...'} />
                                                    <p className="text-[9px] text-red-600 font-bold leading-relaxed">Preview detected! We'll use the YouTube cover unless you upload a custom one.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Video File</label>
                                        <div className={`relative border-2 border-dashed rounded-[2rem] p-8 transition-all group ${currentVideo.videoId && currentVideo.type === 'custom' ? 'border-emerald-500/50 bg-emerald-50/30' : 'border-gray-200 hover:border-blue-500/50 bg-gray-50/30'}`}>
                                            <input
                                                type="file"
                                                accept="video/*"
                                                onChange={handleFileUpload}
                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="flex flex-col items-center justify-center text-center space-y-4">
                                                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${currentVideo.videoId && currentVideo.type === 'custom' ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-200' : 'bg-white text-gray-400 shadow-lg shadow-gray-200/50'}`}>
                                                    {uploading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <FiUploadCloud size={32} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800">{currentVideo.videoId && currentVideo.type === 'custom' ? 'Change Selection' : 'Choose Video File'}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">MP4 / MOV / WEBM (MAX 50MB)</p>
                                                </div>
                                            </div>
                                        </div>
                                        {currentVideo.videoId && currentVideo.type === 'custom' && (
                                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                                                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                                                    <FiPlay />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-black text-emerald-700">Video Encoded Successfully</p>
                                                    <p className="text-[8px] text-emerald-600/70 font-bold uppercase">Ready for distribution</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={uploading || thumbUploading || !currentVideo.videoId}
                                className={`w-full py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.3em] transition-all shadow-2xl active:scale-[0.98] ${uploading || thumbUploading || !currentVideo.videoId ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#1a3c36] hover:bg-[#214a42] text-white shadow-emerald-900/20'}`}
                            >
                                {uploading || thumbUploading ? "Processing Media..." : isEditing ? "Save Refinements" : "Launch Showcase"}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
                )
            )}
        </div>
    );
};

export default VideoManagement;
