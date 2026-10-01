import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Filter,
  IdCard,
  Image as ImageIcon,
  ImagePlus,
  LayoutGrid,
  List,
  MessageSquare,
  Package,
  Pencil,
  Plus,
  Search,
  Star,
  ThumbsUp,
  Trash2,
  TrendingUp,
  UploadCloud,
  User,
  X,
} from "lucide-react";
import api from "../../api";
import { useAuth } from "../../PrivateRouter/AuthContext";
import toast from "react-hot-toast";

const generateUuid = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch (e) {
    return dateString;
  }
};

const getCatalogKey = (item) => {
  if (!item) return "";

  const type = item.type || "product";
  const id = item.id ?? item.product_id ?? item.gift_box_id ?? item.product_code ?? item.code ?? "";
  return `${type}:${String(id)}`;
};

const getCatalogLabel = (item) => {
  if (!item) return "Select product";

  const type = item.type || "product";
  const typeName = type === "album" ? "Album" : type === "giftbox" ? "Gift Box" : "Product";
  const name = item.product_name || item.name || item.productName || "Untitled item";
  const code = item.product_code || item.product_id || item.gift_box_id || item.code || item.productCode || "";

  return `${name} (${typeName}${code ? ` - ${code}` : ""})`;
};

const getCatalogImage = (item) => {
  if (!item) return "";

  return (
    item.product_image ||
    item.image ||
    item.thumbnail_image ||
    item.product_images?.[0] ||
    item.images?.[0] ||
    item.frame_data?.frame_image ||
    ""
  );
};

const AdminReviews = () => {
  const { user, userProfile } = useAuth();
  const currentUserId =
    userProfile?.user_id ||
    userProfile?.id ||
    user?.user_id ||
    user?.id ||
    "45e2dff5-104d-43ce-aed1-fb118b2e2ca9";

  // ==========================================
  // DATA STATE
  // ==========================================
  const [reviewsList, setReviewsList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("all");
  const [stats, setStats] = useState({
    total_reviews: 0,
    avg_rating: 0,
    five_star_count: 0,
    photo_reviews_count: 0,
    published_count: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRating, setFilterRating] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState("table");

  // Modal State (Add / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [viewingReview, setViewingReview] = useState(null);
  const [viewingPhotoModal, setViewingPhotoModal] = useState(null);

  // Form State
  const [formUuid, setFormUuid] = useState(generateUuid);
  const [formReviewId, setFormReviewId] = useState("REV001");
  const [formProduct, setFormProduct] = useState(null);
  const [formReviewerName, setFormReviewerName] = useState("");
  const [formReviewerEmail, setFormReviewerEmail] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formHoverRating, setFormHoverRating] = useState(0);
  const [formTitle, setFormTitle] = useState("");
  const [formComment, setFormComment] = useState("");
  const [formPhoto, setFormPhoto] = useState(null); // { file, preview, url }
  const [formStatus, setFormStatus] = useState("Published");
  const [formCreatedBy, setFormCreatedBy] = useState(currentUserId);
  const [formUpdatedBy, setFormUpdatedBy] = useState(currentUserId);
  const [formCreatedAt, setFormCreatedAt] = useState(new Date().toISOString());
  const [formUpdatedAt, setFormUpdatedAt] = useState(new Date().toISOString());

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // ==========================================
  // FETCH PRODUCTS, USERS, REVIEWS & STATS
  // ==========================================
  const fetchProducts = async () => {
    try {
      const [productResult, albumResult, giftBoxResult] = await Promise.allSettled([
        api.get("/products"),
        api.get("/albums"),
        api.get("/gift-boxes"),
      ]);

      const catalog = [];

      if (productResult.status === "fulfilled" && Array.isArray(productResult.value?.data?.data)) {
        productResult.value.data.data.forEach((item) => {
          catalog.push({
            ...item,
            type: "product",
            product_name: item.product_name || item.name,
            product_code: item.product_code || item.product_id || item.code,
            product_image: item.product_image || item.image || item.product_images?.[0] || item.frame_data?.frame_image || "",
            id: item.id,
          });
        });
      }

      if (albumResult.status === "fulfilled" && Array.isArray(albumResult.value?.data?.data)) {
        albumResult.value.data.data.forEach((item) => {
          catalog.push({
            ...item,
            type: "album",
            product_name: item.product_name || item.name,
            product_code: item.product_code || item.product_id || item.code || item.album_code,
            product_id: item.product_id || item.id,
            product_image: item.product_image || item.image || item.product_images?.[0] || item.thumbnail_image || "",
            id: item.id,
          });
        });
      }

      if (giftBoxResult.status === "fulfilled" && Array.isArray(giftBoxResult.value?.data?.data)) {
        giftBoxResult.value.data.data.forEach((item) => {
          catalog.push({
            ...item,
            type: "giftbox",
            product_name: item.name || item.product_name,
            product_code: item.gift_box_id || item.product_code || item.product_id || item.code,
            product_id: item.gift_box_id || item.product_id || item.product_code || item.code,
            product_image: item.image || item.images?.[0] || item.product_image || "",
            id: item.id,
          });
        });
      }

      setProductsList(catalog);
    } catch (err) {
      console.warn("Could not fetch reviews catalog:", err);
      setProductsList([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      if (res.data?.data && Array.isArray(res.data.data)) {
        setUsersList(res.data.data);
      }
    } catch (err) {
      console.warn("Could not fetch users list:", err);
    }
  };

  const fetchReviewsAndStats = async () => {
    try {
      setLoading(true);
      const url =
        selectedProductId === "all"
          ? "/reviews"
          : `/reviews?product_id=${selectedProductId}`;

      const [reviewsRes, statsRes] = await Promise.all([
        api.get(url),
        api.get("/reviews/stats"),
      ]);

      setReviewsList(reviewsRes.data?.data || []);
      if (statsRes.data?.data) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchReviewsAndStats();
  }, [selectedProductId]);

  // ==========================================
  // OPEN CREATE / EDIT MODAL
  // ==========================================
  const handleOpenCreateModal = async (defaultProd = null) => {
    setEditingReview(null);
    setFormUuid(generateUuid());

    // Fetch next review ID
    try {
      const idRes = await api.get("/reviews/next-id");
      if (idRes.data?.data) {
        setFormReviewId(idRes.data.data);
      }
    } catch (e) {
      setFormReviewId("REV001");
    }

    // Set product
    if (defaultProd) {
      setFormProduct(defaultProd);
    } else if (selectedProductId !== "all") {
      const p = productsList.find(
        (item) => String(item.id) === String(selectedProductId) || item.product_id === selectedProductId
      );
      setFormProduct(p || productsList[0] || null);
    } else {
      setFormProduct(productsList[0] || null);
    }

    setFormReviewerName("");
    setFormReviewerEmail("");
    setFormRating(5);
    setFormTitle("");
    setFormComment("");
    setFormPhoto(null);
    setFormStatus("Published");
    setFormCreatedBy(currentUserId);
    setFormUpdatedBy(currentUserId);
    setFormCreatedAt(new Date().toISOString());
    setFormUpdatedAt(new Date().toISOString());

    setIsModalOpen(true);
  };

  const handleOpenEditModal = (review) => {
    setEditingReview(review);
    setFormUuid(review.uuid || generateUuid());
    setFormReviewId(review.review_id || "");

    const matchedProd = productsList.find(
      (p) =>
        String(p.id) === String(review.product_id) ||
        p.product_code === review.product_code ||
        p.product_id === review.product_code ||
        p.gift_box_id === review.product_code ||
        getCatalogKey(p) === `${review.product_type || "product"}:${review.product_id}`
    );

    setFormProduct(
      matchedProd || {
        id: review.product_id,
        product_id: review.product_code,
        product_code: review.product_code,
        product_name: review.product_name,
        image: review.product_image,
        type: review.product_type || "product",
      }
    );

    setFormReviewerName(review.reviewer_name || "");
    setFormReviewerEmail(review.reviewer_email || "");
    setFormRating(review.rating || 5);
    setFormTitle(review.title || "");
    setFormComment(review.comment || "");

    if (review.review_photo) {
      setFormPhoto({
        file: null,
        preview: review.review_photo,
        url: review.review_photo,
      });
    } else {
      setFormPhoto(null);
    }

    setFormStatus(review.status || "Published");
    setFormCreatedBy(review.created_by || currentUserId);
    setFormUpdatedBy(currentUserId);
    setFormCreatedAt(review.created_at || new Date().toISOString());
    setFormUpdatedAt(new Date().toISOString());

    setIsModalOpen(true);
  };

  // ==========================================
  // PHOTO UPLOAD (STORED IN 'review' FOLDER)
  // ==========================================
  const handlePhotoUpload = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, WEBP).");
      return;
    }

    const preview = URL.createObjectURL(file);
    setFormPhoto({
      file,
      preview,
      url: "",
    });

    // Upload to server under separate folder 'review'
    const formData = new FormData();
    formData.append("folder", "review");
    formData.append("file", file);

    setIsUploadingPhoto(true);
    try {
      const response = await api.post("/upload", formData);
      const serverUrl = response?.data?.url || response?.data?.urls?.[0] || "";
      setFormPhoto((prev) => ({
        ...prev,
        url: serverUrl,
      }));
      toast.success("Review photo uploaded to review folder!");
    } catch (err) {
      console.error("Review photo upload error:", err);
      toast.error("Photo upload failed, preview will be used.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const removePhoto = () => {
    if (formPhoto?.preview) {
      URL.revokeObjectURL(formPhoto.preview);
    }
    setFormPhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ==========================================
  // SUBMIT REVIEW (SAVE OR UPDATE)
  // ==========================================
  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!formProduct) {
      toast.error("Please select a product for this review.");
      return;
    }

    if (!formReviewerName.trim()) {
      toast.error("Please enter the reviewer name.");
      return;
    }

    if (!formComment.trim()) {
      toast.error("Please enter the review comment.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        uuid: formUuid,
        review_id: formReviewId,
        product_id: formProduct.id || null,
        product_code: formProduct.product_code || formProduct.product_id || formProduct.gift_box_id || formProduct.code || "IQF",
        product_name: formProduct.product_name || formProduct.name || "",
        product_image: getCatalogImage(formProduct),
        product_type: formProduct.type || "product",
        reviewer_name: formReviewerName.trim(),
        reviewer_email: formReviewerEmail.trim() || null,
        rating: Number(formRating),
        title: formTitle.trim() || null,
        comment: formComment.trim(),
        review_photo: formPhoto?.url || formPhoto?.preview || null,
        status: formStatus,
        created_by: formCreatedBy || currentUserId,
        updated_by: formUpdatedBy || currentUserId,
        created_at: formCreatedAt,
        updated_at: new Date().toISOString(),
      };

      let response;
      if (editingReview) {
        response = await api.put(`/reviews/${editingReview.id}`, payload);
      } else {
        response = await api.post("/reviews", payload);
      }

      if (response.data?.success) {
        toast.success(
          editingReview
            ? `Review ${formReviewId} updated successfully!`
            : `Review ${formReviewId} added successfully!`
        );
        setIsModalOpen(false);
        fetchReviewsAndStats();
      } else {
        toast.error(response.data?.message || "Failed to save review.");
      }
    } catch (err) {
      console.error("Save review error:", err);
      toast.error(err.response?.data?.message || "Failed to save review.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (id, reviewId) => {
    if (!window.confirm(`Are you sure you want to delete review "${reviewId}"?`)) return;

    try {
      await api.delete(`/reviews/${id}`);
      toast.success("Review deleted successfully");
      fetchReviewsAndStats();
    } catch (err) {
      console.error("Delete review error:", err);
      toast.error("Failed to delete review");
    }
  };

  const copyToClipboard = (text, label = "User ID") => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Filtered reviews calculation
  const filteredReviews = reviewsList.filter((r) => {
    const matchesSearch =
      r.reviewer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.created_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.review_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRating =
      filterRating === "all" || String(r.rating) === String(filterRating);

    const matchesStatus =
      filterStatus === "all" || r.status === filterStatus;

    return matchesSearch && matchesRating && matchesStatus;
  });

  // Top Stats Cards Configuration (Matching Dashboard screenshot style)
  const statCardsData = [
    {
      title: "Total Reviews",
      value: String(stats.total_reviews),
      inc: "+ 18.6%",
      sub: "from last month",
      icon: <MessageSquare size={24} className="text-white" />,
      iconBg: "bg-[#22c55e]", // Green
      colorHex: "#22c55e",
    },
    {
      title: "Average Rating",
      value: `${stats.avg_rating || "0.0"} / 5.0`,
      inc: "+ 22.4%",
      sub: "positive score",
      icon: <Star size={24} className="text-white" />,
      iconBg: "bg-[#f59e0b]", // Amber
      colorHex: "#f59e0b",
    },
    {
      title: "5 Star Reviews",
      value: String(stats.five_star_count),
      inc: stats.total_reviews > 0 ? `${Math.round((stats.five_star_count / stats.total_reviews) * 100)}%` : "0%",
      sub: "of total reviews",
      icon: <ThumbsUp size={24} className="text-white" />,
      iconBg: "bg-[#06b6d4]", // Cyan
      colorHex: "#06b6d4",
    },
    {
      title: "Photo Reviews",
      value: String(stats.photo_reviews_count),
      inc: "+ 10.7%",
      sub: "with customer photos",
      icon: <Camera size={24} className="text-white" />,
      iconBg: "bg-[#a855f7]", // Purple
      colorHex: "#a855f7",
    },
    {
      title: "Published Reviews",
      value: String(stats.published_count),
      inc: "+ 12.5%",
      sub: "live in storefront",
      icon: <CheckCircle2 size={24} className="text-white" />,
      iconBg: "bg-[#f97316]", // Orange
      colorHex: "#f97316",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-3 md:p-2 text-gray-800 font-sans">
      <div className="mx-auto max-w-[1540px]">
     

        {/* ================= TOP STATS CARDS (DASHBOARD DESIGN WITH BOTTOM WAVES) ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {statCardsData.map((stat, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm relative overflow-hidden flex flex-col h-full"
            >
              <div className="flex items-start space-x-4 flex-1">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${stat.iconBg}`}
                >
                  {stat.icon}
                </div>
                <div className="flex flex-col">
                  <p className="text-gray-600 text-xs font-medium mb-1">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{stat.value}</h3>
                  <div className="flex flex-col">
                    <div className="flex items-center text-emerald-600 text-xs font-medium mb-1">
                      <TrendingUp size={12} className="mr-1" />
                      <span>{stat.inc}</span>
                    </div>
                    <p className="text-gray-400 text-[10px]">{stat.sub}</p>
                  </div>
                </div>
              </div>

              {/* Decorative wave at bottom */}
              <div className="absolute bottom-0 left-0 w-full h-8 overflow-hidden pointer-events-none">
                <svg
                  viewBox="0 0 100 20"
                  preserveAspectRatio="none"
                  className="w-full h-full opacity-35"
                  fill="currentColor"
                  style={{ color: stat.colorHex }}
                >
                  <path d="M0,10 C30,25 70,0 100,10 L100,20 L0,20 Z" />
                </svg>
              </div>
            </div>
          ))}
        </div>

       

        {/* ================= STEP 2: REVIEWS TABLE & FILTER SECTION ================= */}
        <div className="rounded-[22px] border border-[#e7e0d8] bg-white p-4 shadow-sm md:p-5">
          {/* SEARCH AND FILTER BAR */}
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center">
              {/* SEARCH */}
              <div className="relative w-full max-w-[340px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a7a7a]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search reviews by name, text, user ID or product..."
                  className="h-11 w-full rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-10 pr-3 text-xs text-[#2d2d2d] outline-none placeholder:text-[#8a8a8a] focus:border-[#d2bc8a]"
                />
              </div>

            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {/* RATING FILTER */}
              <div className="relative">
                <select
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  className="h-11 appearance-none rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-3 pr-8 text-xs font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]"
                >
                  <option value="all">All Ratings</option>
                  <option value="5">5 Stars ★★★★★</option>
                  <option value="4">4 Stars ★★★★</option>
                  <option value="3">3 Stars ★★★</option>
                  <option value="2">2 Stars ★★</option>
                  <option value="1">1 Star ★</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#777]" />
              </div>

              {/* STATUS FILTER */}
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-11 appearance-none rounded-xl border border-[#dfe2e5] bg-[#faf9f8] pl-3 pr-8 text-xs font-medium text-[#2d2d2d] outline-none focus:border-[#d2bc8a]"
                >
                  <option value="all">All Status</option>
                  <option value="Published">Published</option>
                  <option value="Pending">Pending</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#777]" />
              </div>

              <div className="flex overflow-hidden rounded-xl border border-[#dfe2e5] bg-[#faf9f8]">
                <button type="button" onClick={() => setViewMode("table")} title="Table view" className={`flex h-11 w-11 items-center justify-center border-r border-[#dfe2e5] ${viewMode === "table" ? "bg-[#1a3c36] text-white" : "text-[#666] hover:bg-white"}`}><List className="h-4 w-4" /></button>
                <button type="button" onClick={() => setViewMode("card")} title="Card view" className={`flex h-11 w-11 items-center justify-center ${viewMode === "card" ? "bg-[#1a3c36] text-white" : "text-[#666] hover:bg-white"}`}><LayoutGrid className="h-4 w-4" /></button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleOpenCreateModal()}
              className="inline-flex items-center gap-2 rounded-md bg-[#1a3c36] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(26,60,54,0.18)] transition hover:bg-[#214a42]"
            >
              <Plus className="h-6 w-6" />
              Add Review
            </button>
          </div>
            </div>
          </div>

          {/* REVIEWS TABLE */}
          {loading ? (
            <div className="py-16 text-center text-sm text-[#777]">
              Loading product reviews...
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[#e6ddd1] bg-[#faf9f8] py-16 text-center">
              <div className="mb-3 text-5xl">💬</div>
              <h3 className="text-base font-bold text-[#333]">No Reviews Found</h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-[#888]">
                {searchTerm
                  ? "No reviews match your search filter."
                  : selectedProductId !== "all"
                  ? "No reviews added for this selected product yet. Click 'Add Review' to add one."
                  : "No product reviews exist yet. Click 'Add Review' to post customer feedback."}
              </p>
              <button
                type="button"
                onClick={() => handleOpenCreateModal()}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1a3c36] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#235048]"
              >
                <Plus className="h-4 w-4" />
                Add Review
              </button>
            </div>
          ) : viewMode === "card" ? (
            <div className="grid gap-4 p-1 sm:grid-cols-2 xl:grid-cols-3">
              {filteredReviews.map((rev) => (
                <article key={rev.id} className="rounded-2xl border border-[#e7e0d8] bg-[#fffdfa] p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] font-bold text-[#1a3c36]">{rev.review_id}</p><h3 className="mt-1 text-sm font-bold text-[#222]">{rev.product_name}</h3></div><span className="rounded-full bg-[#eef5f1] px-2 py-1 text-[10px] font-semibold text-[#2d7b5a]">{rev.status}</span></div>
                  <div className="mt-4 flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d4a843] text-xs font-bold text-white">{(rev.reviewer_name?.[0] || "U").toUpperCase()}</div><div><p className="text-xs font-bold text-[#333]">{rev.reviewer_name}</p><div className="flex items-center">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-3 w-3 ${star <= rev.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />)}</div></div></div>
                  <p className="mt-4 line-clamp-3 text-xs leading-5 text-[#555]">{rev.comment}</p>
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#f0ebe6] pt-3"><button type="button" onClick={() => handleOpenEditModal(rev)} className="rounded-lg border border-[#e2d9cf] bg-white p-2 text-[#444]" title="Edit review"><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setViewingReview(rev)} className="rounded-lg border border-[#e2d9cf] bg-white p-2 text-[#444]" title="View details"><Eye className="h-3.5 w-3.5" /></button><button type="button" onClick={() => handleDeleteReview(rev.id, rev.review_id)} className="rounded-lg border border-[#f3d7d7] bg-[#fff8f8] p-2 text-[#d04d4d]" title="Delete review"><Trash2 className="h-3.5 w-3.5" /></button></div>
                </article>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-[#f0e6d2] text-left text-xs font-bold capitalize tracking-wider text-[#3d3d3d]">
                    <th className="rounded-tl-md px-4 py-4">S.No</th>
                    <th className="px-4 py-4">ID & Product</th>
                    <th className="px-4 py-4">Reviewer</th>
                    <th className="px-4 py-4">Rating</th>
                    <th className="px-4 py-4">Review Comment</th>
                    <th className="px-4 py-4">Customer Photo</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="rounded-tr-md px-4 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReviews.map((rev, index) => {
                    return (
                      <tr
                        key={rev.id}
                        className="border-t border-[#f0ebe6] transition hover:bg-[#fffdfa]"
                      >
                        <td className="px-4 py-3.5 align-middle text-[#777]">{index + 1}</td>

                        {/* ID & PRODUCT */}
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e8dfd2] bg-white p-0.5 shadow-xs">
                              {rev.product_image ? (
                                <img
                                  src={rev.product_image}
                                  alt={rev.product_name}
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <Package className="h-5 w-5 text-[#999]" />
                              )}
                            </div>
                            <div>
                              <span className="rounded bg-[#eef5f1] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#1a3c36]">
                                {rev.review_id}
                              </span>
                              <p className="mt-0.5 text-xs font-bold text-[#222]">
                                {rev.product_name}
                              </p>
                              <p className="font-mono text-[10px] text-[#777]">
                                {rev.product_code}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* REVIEWER */}
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d4a843] text-xs font-bold text-white shadow-xs">
                              {(rev.reviewer_name?.[0] || "U").toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[#222]">
                                {rev.reviewer_name}
                              </p>
                              {rev.reviewer_email && (
                                <p className="text-[10px] text-[#777]">
                                  {rev.reviewer_email}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* RATING */}
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3.5 w-3.5 ${
                                  star <= rev.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                            <span className="ml-1 text-xs font-bold text-[#333]">
                              {rev.rating}.0
                            </span>
                          </div>
                        </td>

                        {/* COMMENT */}
                        <td className="px-4 py-3.5 align-middle max-w-xs">
                          {rev.title && (
                            <p className="text-xs font-bold text-[#1f1f1f]">
                              {rev.title}
                            </p>
                          )}
                          <p className="line-clamp-2 text-xs text-[#555]">
                            {rev.comment}
                          </p>
                        </td>

                        {/* CUSTOMER PHOTO */}
                        <td className="px-4 py-3.5 align-middle">
                          {rev.review_photo ? (
                            <button
                              type="button"
                              onClick={() => setViewingPhotoModal(rev.review_photo)}
                              className="group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg border border-[#e2dacd] shadow-xs"
                            >
                              <img
                                src={rev.review_photo}
                                alt="Customer review"
                                className="h-full w-full object-cover transition group-hover:scale-105"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                                <Eye className="h-3.5 w-3.5 text-white" />
                              </div>
                            </button>
                          ) : (
                            <span className="text-[10px] text-[#aaa]">No photo</span>
                          )}
                        </td>

                        {/* STATUS */}
                        <td className="px-4 py-3.5 align-middle">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                              rev.status === "Published"
                                ? "bg-[#eaf7ee] text-[#2d7b5a]"
                                : "bg-[#fff6e6] text-[#b87840]"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                rev.status === "Published"
                                  ? "bg-[#2d7b5a]"
                                  : "bg-[#b87840]"
                              }`}
                            />
                            {rev.status}
                          </span>
                        </td>

                        {/* ACTIONS */}
                        <td className="px-4 py-3.5 align-middle">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(rev)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#444] transition hover:border-[#d0b997] hover:text-[#1a1a1a]"
                              title="Edit review"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setViewingReview(rev)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e2d9cf] bg-white text-[#444] transition hover:border-[#d0b997] hover:text-[#1a1a1a]"
                              title="View details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteReview(rev.id, rev.review_id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3d7d7] bg-[#fff8f8] text-[#d04d4d] transition hover:bg-[#fff0f0]"
                              title="Delete review"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ================= ADD / EDIT REVIEW MODAL ================= */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-[#e8dfd2] bg-white p-6 shadow-2xl hide-scrollbar">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f0eb] text-[#444] hover:bg-[#e8e2d8]"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-5 flex items-center gap-3 border-b border-[#f0ebe3] pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f3ef] text-[#1a3c36]">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#202020]">
                    {editingReview
                      ? `Edit Review (${formReviewId})`
                      : "Add Customer Review & Rating"}
                  </h2>
                  <p className="text-xs text-[#8a8a8a]">
                    Review photos are stored in the dedicated 'review' uploads folder
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* UNIQUE ID & PRODUCT SELECTOR */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
                      Review ID (Unique)
                    </label>
                    <input
                      type="text"
                      value={formReviewId}
                      readOnly
                      className="h-10 w-full rounded-xl border border-[#e8e1d9] bg-[#f8f7f5] px-3 font-mono text-xs font-bold text-[#1a3c36] outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
                      Select Product <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={getCatalogKey(formProduct)}
                      onChange={(e) => {
                        const val = e.target.value;
                        const p = productsList.find((item) => getCatalogKey(item) === val);
                        setFormProduct(p || null);
                      }}
                      className="h-10 w-full rounded-xl border border-[#e8e1d9] bg-white px-3 text-xs text-[#222] shadow-xs outline-none focus:border-[#d4a553]"
                      required
                    >
                      {productsList.map((p) => (
                        <option key={getCatalogKey(p)} value={getCatalogKey(p)}>
                          {getCatalogLabel(p)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* REVIEWER NAME & EMAIL */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
                      Reviewer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formReviewerName}
                      onChange={(e) => setFormReviewerName(e.target.value)}
                      placeholder="e.g. Priya Sundaram"
                      className="h-10 w-full rounded-xl border border-[#e8e1d9] bg-white px-3 text-xs text-[#222] shadow-xs outline-none focus:border-[#d4a553]"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
                      Reviewer Email / Location (Optional)
                    </label>
                    <input
                      type="text"
                      value={formReviewerEmail}
                      onChange={(e) => setFormReviewerEmail(e.target.value)}
                      placeholder="e.g. priya@example.com or Chennai"
                      className="h-10 w-full rounded-xl border border-[#e8e1d9] bg-white px-3 text-xs text-[#222] shadow-xs outline-none focus:border-[#d4a553]"
                    />
                  </div>
                </div>

                {/* RATING + REVIEW DESCRIPTION (TWO COLUMN LAYOUT) */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* STAR RATING PICKER */}
                  <div className="rounded-xl border border-[#e8e2d8] bg-[#faf8f5] p-3">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
                      Rating ({formRating} / 5 Stars) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled =
                          (formHoverRating || formRating) >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setFormHoverRating(star)}
                            onMouseLeave={() => setFormHoverRating(0)}
                            onClick={() => setFormRating(star)}
                            className="p-1 transition hover:scale-110"
                          >
                            <Star
                              className={`h-7 w-7 ${
                                isFilled
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-gray-300"
                              }`}
                            />
                          </button>
                        );
                      })}
                      <span className="ml-2 text-xs font-bold text-[#1a3c36]">
                        {formRating === 5
                          ? "5.0 - Excellent"
                          : formRating === 4
                          ? "4.0 - Very Good"
                          : formRating === 3
                          ? "3.0 - Good"
                          : formRating === 2
                          ? "2.0 - Fair"
                          : "1.0 - Poor"}
                      </span>
                    </div>
                  </div>

                  {/* REVIEW COMMENT */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
                      Review Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={formComment}
                      onChange={(e) => setFormComment(e.target.value)}
                      placeholder="Write the customer's detailed review..."
                      className="h-full min-h-[150px] w-full rounded-xl border border-[#e8e1d9] bg-white p-3 text-xs text-[#222] shadow-xs outline-none focus:border-[#d4a553]"
                      required
                    />
                  </div>
                </div>

                {/* REVIEW PHOTO UPLOAD (FOLDER: 'review') */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
                      Customer Review Photo (Saved in <code className="text-[#1a3c36]">uploads/review/</code>)
                    </label>
                    {formPhoto && (
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="text-[11px] font-bold text-red-600 hover:underline"
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                  />

                  {!formPhoto ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#d8d0c5] bg-[#faf8f6] p-4 text-center hover:border-[#d4a553] hover:bg-[#fffcf7]"
                    >
                      <ImagePlus className="h-6 w-6 text-[#1a3c36]" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-[#2d2d2d]">
                          Upload Customer Review Photo
                        </p>
                        <p className="text-[10px] text-[#888]">
                          Will be placed inside /uploads/review folder automatically
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl border border-[#e2dacd] bg-[#f8f6f2] p-2.5">
                      <img
                        src={formPhoto.preview}
                        alt="Preview"
                        className="h-16 w-16 rounded-lg object-cover shadow-xs"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-[#222]">
                          {formPhoto.file?.name || "Customer photo loaded"}
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-1 text-xs font-semibold text-[#1a3c36] underline"
                        >
                          Change Photo
                        </button>
                        {isUploadingPhoto && (
                          <span className="ml-2 text-[10px] text-amber-600">Uploading to /review...</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* STATUS FIELD ONLY */}
                <div className="grid gap-4 sm:grid-cols-1">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
                      Status
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="h-10 w-full rounded-xl border border-[#e8e1d9] bg-white px-3 text-xs text-[#222] shadow-xs outline-none focus:border-[#d4a553]"
                    >
                      <option value="Published">Published (Active)</option>
                      <option value="Pending">Pending Review</option>
                    </select>
                  </div>
                </div>

                {/* MODAL FOOTER BUTTONS */}
                <div className="flex justify-end gap-3 border-t border-[#f0ebe3] pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-[#ddd3c8] bg-[#faf8f5] px-5 py-2 text-xs font-semibold text-[#333] hover:bg-[#f2ece5]"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-[#1a3c36] px-6 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#235048] disabled:opacity-60"
                  >
                    {submitting
                      ? "Saving..."
                      : editingReview
                      ? "Update Review"
                      : "Save Review"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= VIEW REVIEW DETAIL MODAL ================= */}
        {viewingReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[24px] border border-[#e8dfd2] bg-white p-6 shadow-2xl hide-scrollbar">
              <button
                type="button"
                onClick={() => setViewingReview(null)}
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f0eb] text-[#444] hover:bg-[#e8e2d8]"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-3 border-b border-[#f0ebe3] pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f3ef] text-[#1a3c36]">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#202020]">
                    Review Details: {viewingReview.review_id}
                  </h2>
                  <p className="text-xs text-[#888]">{viewingReview.product_name}</p>
                </div>
              </div>

              <div className="my-4 space-y-3 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-[#faf8f5] p-3">
                  <div>
                    <p className="font-bold text-[#222]">{viewingReview.reviewer_name}</p>
                    <p className="text-[10px] text-[#777]">{viewingReview.reviewer_email || "No email"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${
                          s <= viewingReview.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {viewingReview.title && (
                  <div>
                    <span className="font-bold text-[#444]">Title:</span>
                    <p className="mt-0.5 font-bold text-[#222]">{viewingReview.title}</p>
                  </div>
                )}

                <div>
                  <span className="font-bold text-[#444]">Review Feedback:</span>
                  <p className="mt-1 rounded-xl bg-[#fbf9f6] p-3 leading-relaxed text-[#333]">
                    {viewingReview.comment}
                  </p>
                </div>

                {viewingReview.review_photo && (
                  <div>
                    <span className="font-bold text-[#444]">Customer Uploaded Photo:</span>
                    <div className="mt-1.5 overflow-hidden rounded-xl border border-[#e6ddd1] p-1">
                      <img
                        src={viewingReview.review_photo}
                        alt="Review Attachment"
                        className="max-h-60 w-full object-contain rounded-lg"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 rounded-xl border border-[#eee] bg-[#faf8f5] p-3 text-[11px] text-[#666]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#333]">Created Date:</span>
                    <span>{formatDate(viewingReview.created_at)}</span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-[#333]">Created By (User ID):</span>
                    <div className="flex items-center justify-between rounded bg-white px-2 py-1 border border-[#e8e2d8] font-mono text-[10px] text-[#444]">
                      <span>{viewingReview.created_by || "system"}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(viewingReview.created_by, "Created By User ID")}
                        className="text-[#888] hover:text-[#1a3c36]"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#333]">Updated Date:</span>
                    <span>{formatDate(viewingReview.updated_at)}</span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-[#333]">Updated By (User ID):</span>
                    <div className="flex items-center justify-between rounded bg-white px-2 py-1 border border-[#e8e2d8] font-mono text-[10px] text-[#444]">
                      <span>{viewingReview.updated_by || viewingReview.created_by || "system"}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(viewingReview.updated_by, "Updated By User ID")}
                        className="text-[#888] hover:text-[#1a3c36]"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingReview(null)}
                  className="rounded-xl bg-[#1a3c36] px-5 py-2 text-xs font-bold text-white hover:bg-[#235048]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= FULL IMAGE ZOOM MODAL ================= */}
        {viewingPhotoModal && (
          <div
            onClick={() => setViewingPhotoModal(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <div className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl bg-white p-2">
              <button
                type="button"
                onClick={() => setViewingPhotoModal(null)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={viewingPhotoModal}
                alt="Enlarged review photo"
                className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReviews;
