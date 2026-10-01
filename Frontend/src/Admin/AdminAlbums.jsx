import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { BACKEND_BASE_URL } from "../api";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  Image as ImageIcon,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Package,
  BookOpen,
  FolderOpen,
  BarChart3,
  LayoutGrid,
  List,
} from "lucide-react";
import api, { API_URL } from "../api";

const formatCurrency = (value) => {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numeric);
};

const getImageUrl = (imagePath) => {
  if (!imagePath) return "";

  const normalizedPath = String(imagePath).trim();
  if (!normalizedPath) return "";
  if (/^https?:\/\//i.test(normalizedPath)) return encodeURI(normalizedPath);

  const cleanPath = normalizedPath.replace(/\\/g, "/");
  let finalPath = cleanPath;

  if (finalPath.startsWith("/")) finalPath = finalPath;
  else if (finalPath.startsWith("uploads/")) finalPath = `/${finalPath}`;
  else if (finalPath.startsWith("images/")) finalPath = `/${finalPath}`;
  else finalPath = `/${finalPath.replace(/^\//, "")}`;

  const backendUrl = (BACKEND_BASE_URL || window.location.origin).replace(/\/$/, "");
  return encodeURI(`${backendUrl}${finalPath}`);
};

const normalizeAlbum = (album) => {
  const parseJsonArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }
    return [];
  };

  const variants = parseJsonArray(album.variants);
  const firstVariant =
    variants.find((variant) => variant && typeof variant === "object") ||
    variants[0] ||
    {};
  const variantImages = parseJsonArray(
    firstVariant.images || firstVariant.image
      ? [firstVariant.image]
          .filter(Boolean)
          .concat(parseJsonArray(firstVariant.images))
      : [],
  );
  const productImages = parseJsonArray(album.product_images);
  const firstGalleryImage =
    variantImages[0] || productImages[0] || album.thumbnail_image || "";
  const thumbnail = getImageUrl(firstGalleryImage);

  const variantOfferPrice = Number(
    firstVariant.offerPrice ??
      firstVariant.offer_price ??
      firstVariant.price ??
      firstVariant.offer ??
      0,
  );
  const variantMrp = Number(
    firstVariant.mrp ??
      firstVariant.price ??
      firstVariant.sell_price ??
      firstVariant.selling_price ??
      0,
  );
  const variantStock = Number(
    firstVariant.stock ?? firstVariant.stock_quantity ?? 0,
  );
  const stock =
    variants.length > 0
      ? variants.reduce(
          (sum, variant) =>
            sum + (Number(variant.stock ?? variant.stock_quantity ?? 0) || 0),
          0,
        )
      : Number(album.stock_quantity || 0);
  const stockLabel =
    stock <= 0
      ? "Out of Stock"
      : stock <= Number(album.minimum_stock || 5)
        ? "Low Stock"
        : "In Stock";
  const displayPrice =
    variantOfferPrice > 0
      ? variantOfferPrice
      : Number(album.selling_price ?? album.price ?? 0);
  const displayOldPrice =
    variantMrp > 0
      ? variantMrp
      : Number(album.discount_price ?? album.selling_price ?? 0);

  return {
    id: album.product_id || album.id,
    name: album.product_name || "Untitled Album",
    code: album.product_code || album.product_id || "N/A",
    category: album.category || album.sub_category || "General",
    size: firstVariant.size || album.size || "N/A",
    price: formatCurrency(displayPrice),
    oldPrice: formatCurrency(displayOldPrice),
    stock,
    stockLabel,
    status: album.status || "Active",
    views: album.views || 0,
    image: thumbnail || "linear-gradient(135deg, #f8d7da, #f3d6e4)",
  };
};

const getStatusClasses = (status) => {
  if (status === "Active") {
    return "bg-[#dff7ef] text-[#1b7f57]";
  }
  if (status === "Inactive") {
    return "bg-[#ffe5e5] text-[#d14d4d]";
  }
  return "bg-[#f5f5f5] text-[#606060]";
};

const getStockClasses = (stockLabel) => {
  if (stockLabel === "In Stock") {
    return "bg-[#dff7ef] text-[#1b7f57]";
  }
  if (stockLabel === "Low Stock") {
    return "bg-[#fff2d9] text-[#b26a00]";
  }
  return "bg-[#ffe5e5] text-[#d14d4d]";
};

const AdminAlbums = () => {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [status, setStatus] = useState("All Status");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("table");

  useEffect(() => {
    let isMounted = true;

    const fetchAlbums = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/albums");
        const data = Array.isArray(response.data?.data)
          ? response.data.data
          : [];

        if (!isMounted) return;

        setAlbums(data.map(normalizeAlbum));
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load albums:", err);
        setError("Unable to load albums right now.");
        setAlbums([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAlbums();

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const totalAlbums = albums.length;
    const activeAlbums = albums.filter(
      (album) => album.status === "Active",
    ).length;
    const lowStock = albums.filter(
      (album) => album.stockLabel === "Low Stock",
    ).length;
    const totalViews = albums.reduce(
      (sum, album) => sum + (Number(album.views) || 0),
      0,
    );

    return [
      {
        title: "Total Albums",
        value: String(totalAlbums),
        change: totalAlbums ? "+ 12.5%" : "0%",
        subtitle: totalAlbums ? "from last month" : "No albums yet",
        color: "#22c55e",
        wave: "#9be7b9",
        icon: BookOpen,
      },
      {
        title: "Active Albums",
        value: String(activeAlbums),
        change: activeAlbums ? "+ 8.3%" : "0%",
        subtitle: activeAlbums ? "from last month" : "No active items",
        color: "#06b6d4",
        wave: "#93dce8",
        icon: FolderOpen,
      },
      {
        title: "Low Stock",
        value: String(lowStock),
        change: lowStock ? "Needs restock" : "Healthy",
        subtitle: "",
        color: "#f97316",
        wave: "#ffc39e",
        icon: Package,
      },
      {
        title: "Total Views",
        value: totalViews.toLocaleString(),
        change: "+ 15.2%",
        subtitle: "from last month",
        color: "#a855f7",
        wave: "#d8b4f5",
        icon: BarChart3,
      },
    ];
  }, [albums]);

  const filteredAlbums = useMemo(() => {
    return albums.filter((album) => {
      const matchesSearch = album.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory =
        category === "All Categories" ||
        String(album.category || "").toLowerCase() === category.toLowerCase();
      const matchesStatus =
        status === "All Status" ||
        String(album.status || "").toLowerCase() === status.toLowerCase();
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [albums, search, category, status]);

  const categoryOptions = useMemo(() => {
    return [
      ...new Set(albums.map((album) => album.category).filter(Boolean)),
    ].sort();
  }, [albums]);

  const handleViewAlbum = (album) => {
    navigate(`/admin/albums/${album.id}`);
  };

  const handleEditAlbum = (album) => {
    navigate(`/admin/albums/add?edit=${album.id}`);
  };

  const handleDeleteAlbum = async (albumId) => {
    if (!window.confirm("Are you sure you want to delete this album?")) {
      return;
    }

    try {
      await api.delete(`/albums/${albumId}`);
      setAlbums((prev) =>
        prev.filter((album) => String(album.id) !== String(albumId)),
      );
      toast.success("Album deleted successfully");
    } catch (error) {
      console.error("Delete album error:", error);
      toast.error(error?.response?.data?.message || "Failed to delete album");
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f3f0] p-4 md:p-2">
      <div className="mx-auto max-w-[1550px]">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3"></div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className="relative flex min-h-[176px] flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm"
              >
                <div className="flex flex-1 items-start gap-4">
                  <div
                    className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: card.color }}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 pt-1">
                    <p className="text-sm font-medium text-[#374151]">
                      {card.title}
                    </p>
                    <p className="mt-2 truncate text-[1.75rem] font-bold leading-none text-[#111827]">
                      {card.value}
                    </p>
                    <p className="mt-5 flex items-center gap-1 text-xs font-medium text-[#00a76f]">
                      <ArrowUpRight className="h-3.5 w-3.5" /> {card.change}
                    </p>
                    <p className="mt-1 text-[11px] text-[#7c8798]">
                      {card.subtitle || "album overview"}
                    </p>
                  </div>
                </div>
                <div
                  className="absolute bottom-0 left-0 h-6 w-full"
                  style={{
                    background: card.wave,
                    clipPath: "ellipse(65% 75% at 55% 100%)",
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="rounded-[18px] border border-[#e7e0d8] bg-white p-3 shadow-[0_1px_0_rgba(16,24,40,0.02)]">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap lg:shrink-0">
              <div className="relative w-full max-w-[340px] lg:w-[390px] lg:max-w-[390px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7a7a]" />
                <input
                  type="text"
                  placeholder="Search albums..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-10 pr-3 text-[14px] text-[#2d2d2d] outline-none placeholder:text-[#8a8a8a] focus:border-[#d2bc8a]"
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="relative">
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-[46px] appearance-none rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-3 pr-9 text-[14px] font-medium text-[#2d2d2d] outline-none cursor-pointer focus:border-[#d2bc8a]"
                >
                  <option value="All Categories">All Categories</option>
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
              </div>

              <div className="relative">
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-[46px] appearance-none rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-3 pr-9 text-[14px] font-medium text-[#2d2d2d] outline-none cursor-pointer focus:border-[#d2bc8a]"
                >
                  <option value="All Status">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666]" />
              </div>

              <div className="flex overflow-hidden rounded-xl border border-[#dfe2e5] bg-[#faf9f8]">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  title="Table view"
                  className={`flex h-[46px] w-[46px] items-center justify-center border-r border-[#dfe2e5] ${viewMode === "table" ? "bg-[#1a3c36] text-white" : "text-[#4d4d4d] hover:bg-white"}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  title="Card view"
                  className={`flex h-[46px] w-[46px] items-center justify-center ${viewMode === "card" ? "bg-[#1a3c36] text-white" : "text-[#4d4d4d] hover:bg-white"}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => navigate("/admin/albums/add")}
                className="inline-flex h-[46px] items-center gap-2 rounded-xl border border-[#1a3c36] bg-[#1a3c36] px-4 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#1a3c36]"
              >
                <Plus className="h-4 w-4" />
                Add New Album
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex min-h-[200px] items-center justify-center text-sm text-[#5d5d5d]">
                Loading albums...
              </div>
            ) : error ? (
              <div className="flex min-h-[200px] items-center justify-center text-sm text-[#b42318]">
                {error}
              </div>
            ) : viewMode === "card" ? (
              <div className="grid gap-4 p-1 sm:grid-cols-2 xl:grid-cols-3">
                {filteredAlbums.map((album) => (
                  <article
                    key={album.id}
                    className="overflow-hidden rounded-2xl border border-[#e7e0d8] bg-white shadow-sm"
                  >
                    {album.image &&
                    !album.image.startsWith("linear-gradient") ? (
                      <img
                        src={album.image}
                        alt={album.name}
                        className="h-44 w-full object-cover"
                      />
                    ) : (
                      <div
                        className="h-44 w-full"
                        style={{ background: album.image }}
                      />
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="font-semibold text-[#1d1d1d]">
                            {album.name}
                          </h2>
                          <p className="mt-1 text-xs text-[#707070]">
                            {album.code}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusClasses(album.status)}`}
                        >
                          {album.status}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[#888]">Category</p>
                          <p className="mt-1 font-medium text-[#333]">
                            {album.category}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#888]">Stock</p>
                          <p className="mt-1 font-medium text-[#333]">
                            {album.stock} ({album.stockLabel})
                          </p>
                        </div>
                        <div>
                          <p className="text-[#888]">Size</p>
                          <p className="mt-1 font-medium text-[#333]">
                            {album.size}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#888]">Price</p>
                          <p className="mt-1 font-medium text-[#333]">
                            {album.price}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end gap-2 border-t border-[#f0efec] pt-4">
                        <button
                          type="button"
                          onClick={() => handleViewAlbum(album)}
                          className="rounded-lg border border-[#dfe2e5] bg-white p-2 text-[#4d4d4d]"
                          aria-label={`View ${album.name}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditAlbum(album)}
                          className="rounded-lg border border-[#dfe2e5] bg-white p-2 text-[#4d4d4d]"
                          aria-label={`Edit ${album.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAlbum(album.id)}
                          className="rounded-lg border border-[#f1d8d8] bg-[#fff5f5] p-2 text-[#d95a5a]"
                          aria-label={`Delete ${album.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <table className="min-w-full text-left">
                <thead>
                  <tr className="rounded-md bg-[#f0e6d2] text-left text-sm font-semibold text-[#3d3d3d]">
                    <th className="rounded-tl-md px-4 py-4">S.No</th>
                    <th className="px-4 py-4">Album</th>
                    <th className="px-4 py-4">Product Code</th>
                    <th className="px-4 py-4">Category</th>
                    <th className="px-4 py-4">Size</th>
                    <th className="px-4 py-4">Price</th>
                    <th className="px-4 py-4">Stock</th>
                    <th className="px-4 py-4">Status</th>

                    <th className="rounded-tr-md px-4 py-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAlbums.map((album, index) => (
                    <tr
                      key={album.id}
                      className="border-b border-[#f0efec] text-sm text-[#2d2d2d] transition hover:bg-[#fafaf9]"
                    >
                      <td className="px-4 py-4 text-[#737373]">{index + 1}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {album.image &&
                          !album.image.startsWith("linear-gradient") ? (
                            <img
                              src={album.image}
                              alt={album.name}
                              className="h-14 w-14 rounded-xl border border-[#eaeaea] object-cover shadow-sm"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div
                              className="h-14 w-14 rounded-xl border border-[#eaeaea] shadow-sm"
                              style={{
                                background:
                                  album.image &&
                                  album.image.startsWith("linear-gradient")
                                    ? album.image
                                    : "linear-gradient(135deg, #f8d7da, #f3d6e4)",
                              }}
                            />
                          )}
                          <div>
                            <div className="font-semibold text-[#1d1d1d]">
                              {album.name}
                            </div>
                            <div className="text-[12px] text-[#707070]">
                              {album.category} album
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[#5d5d5d]">{album.code}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-[#edf0f7] px-2.5 py-1 text-[11px] font-medium text-[#4d6480]">
                          {album.category}
                        </span>
                      </td>
                      <td className="px-4 py-4">{album.size}</td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-[#1e1e1e]">
                          {album.price}
                        </div>
                        <div className="text-[11px] text-[#8e8e8e] line-through">
                          {album.oldPrice}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-[#1f1f1f]">
                          {album.stock}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusClasses(album.status)}`}
                        >
                          {album.status}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewAlbum(album)}
                            className="rounded-lg border border-[#dfe2e5] bg-white p-2 text-[#4d4d4d] transition hover:border-[#c9d3df] hover:text-[#1f1f1f]"
                            aria-label="View album"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditAlbum(album)}
                            className="rounded-lg border border-[#dfe2e5] bg-white p-2 text-[#4d4d4d] transition hover:border-[#c9d3df] hover:text-[#1f1f1f]"
                            aria-label="Edit album"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAlbum(album.id)}
                            className="rounded-lg border border-[#dfe2e5] bg-white p-2 text-[#d95a5a] transition hover:border-[#f0c9c9] hover:bg-[#fff2f2]"
                            aria-label="Delete album"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-[#ece9e5] px-2 pt-4 text-[12px] text-[#737373]">
            <span>Showing 1 to 8 of 186 albums</span>

            <div className="flex items-center gap-2">
              <button className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e2e1df] bg-white text-[#5b5b5b]">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1">
                <button className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1a3c36] text-white">
                  1
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e2e1df] bg-white text-[#5b5b5b]">
                  2
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e2e1df] bg-white text-[#5b5b5b]">
                  3
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e2e1df] bg-white text-[#5b5b5b]">
                  4
                </button>
                <span className="px-1 text-[#7a7a7a]">...</span>
                <button className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e2e1df] bg-white text-[#5b5b5b]">
                  24
                </button>
              </div>
              <button className="flex h-8 w-8 items-center justify-center rounded-md border border-[#e2e1df] bg-white text-[#5b5b5b]">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAlbums;
