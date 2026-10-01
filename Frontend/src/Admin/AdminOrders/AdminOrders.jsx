import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  Filter,
  LayoutGrid,
  List,
  Image as ImageIcon,
  IndianRupee,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  User,
  X,
  XCircle,
  Sparkles,
  Upload,
  Printer,
} from "lucide-react";
import api, { API_URL } from "../../api";
import toast from "react-hot-toast";

const orderStatuses = [
  { id: "NEW", name: "New Order" },
  { id: "ORDER_PLACED", name: "Order Placed" },
  { id: "CONFIRMED", name: "Confirmed" },
  { id: "PROCESSING", name: "Processing" },
  { id: "PACKING", name: "Packing" },
  { id: "READY", name: "Ready" },
  { id: "SHIPPED", name: "Shipped" },
  { id: "OUT_FOR_DELIVERY", name: "Out for Delivery" },
  { id: "DELIVERED", name: "Delivered" },
  { id: "CANCELLED", name: "Cancelled" },
  { id: "ON_HOLD", name: "On Hold" },
  { id: "RETURNED", name: "Returned" },
];

const statusAliases = {
  "NEW ORDER": "NEW",
  PENDING: "NEW",
  "ORDER PLACED": "ORDER_PLACED",
  ORDER_PLACED: "ORDER_PLACED",
  CONFIRMED: "CONFIRMED",
  PROCESSING: "PROCESSING",
  PACKING: "PACKING",
  READY: "READY",
  "OUT FOR DELIVERY": "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  COMPLETED: "DELIVERED",
  CANCELLED: "CANCELLED",
  "ON HOLD": "ON_HOLD",
  ON_HOLD: "ON_HOLD",
  RETURNED: "RETURNED",
};

const normalizeStatus = (status) =>
  statusAliases[String(status || "").trim().toUpperCase()] || status;

const statusName = (status) =>
  orderStatuses.find((option) => option.id === normalizeStatus(status))?.name || status;

const imageUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  if (/^(data:|blob:|https?:\/\/)/i.test(value)) return value;
  const normalizedPath = `/${value.replace(/^\/+/, "")}`;
  if (/^\/api\/?$/i.test(API_URL)) return normalizedPath;
  const baseUrl = API_URL.replace(/\/api\/?$/, "");
  return `${baseUrl}${normalizedPath}`;
};

const productPhotos = (value) => {
  if (!value) return [];
  const photos = typeof value === "string" ? (() => {
    try { return JSON.parse(value); } catch { return []; }
  })() : value;
  if (Array.isArray(photos)) return photos.map(imageUrl).filter(Boolean);
  if (typeof photos === "object") return Object.values(photos).map((photo) => imageUrl(typeof photo === "string" ? photo : photo?.url || photo?.preview)).filter(Boolean);
  return [];
};

const productPhotoEntries = (value) => {
  if (!value) return [];
  const photos = typeof value === "string" ? (() => {
    try { return JSON.parse(value); } catch { return {}; }
  })() : value;
  if (!photos || typeof photos !== "object" || Array.isArray(photos)) return [];
  return Object.entries(photos)
    .map(([slotId, photo]) => [slotId, imageUrl(typeof photo === "string" ? photo : photo?.url || photo?.preview)])
    .filter(([, photo]) => photo);
};

const enquiryImages = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [value];
  } catch {
    return value ? [value] : [];
  }
};

const enquiryDefaults = {
  enquiryId: "",
  customerName: "Dhivakar",
  mobileNumber: "9876543210",
  whatsappNumber: "9876543210",
  email: "",
  enquiryType: "Frame",
  productCategory: "Photo Frames",
  productName: "Customized LED Photo Frame",
  frameImage: "",
  quantity: 2,
  budget: 1500,
  message: "Need customized birthday photo frame",
  size: "12 x 18 Inches",
  frameType: "Wooden Frame",
  customization: "Photo + Name + Date",
  status: "New",
  priority: "Medium",
  source: "WhatsApp",
  assignedTo: "Admin",
  followUpDate: "2026-09-05",
  followUpNotes: "",
  quotationAmount: 1200,
  createdAt: "2026-09-04",
  updatedAt: "2026-09-04",
};

const getStatusOptions = (currentStatus) => {
  const normalizedStatus = normalizeStatus(currentStatus);
  const workflowIndex = orderStatuses.findIndex((option) => option.id === normalizedStatus);
  const workflowOptions = workflowIndex >= 0 ? orderStatuses.slice(workflowIndex) : [];
  const currentOption = workflowOptions.length
    ? workflowOptions
    : [{ id: normalizedStatus, name: statusName(currentStatus) }];
  const specialOptions = orderStatuses.filter((option) =>
    ["CANCELLED", "ON_HOLD", "RETURNED"].includes(option.id)
  );

  return [...currentOption, ...specialOptions.filter(
    (option) => !currentOption.some((current) => current.id === option.id)
  )];
};

const AdminOrders = ({ defaultStatus = "All", allowedStatuses = null, showNewOrderButton = false, todayOnly = false, readOnlyStatus = false }) => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [loadingEnquiries, setLoadingEnquiries] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState(defaultStatus);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [viewEnquiryProduct, setViewEnquiryProduct] = useState(null);
  const [editingEnquiryId, setEditingEnquiryId] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState("table");
  const [statusDraft, setStatusDraft] = useState("");
  const [shippingDetails, setShippingDetails] = useState({
    shipped_at: "",
    docket_number: "",
    courier_name: "",
  });
  const [statusPopupOrderId, setStatusPopupOrderId] = useState(null);
  const [showEnquiryPopup, setShowEnquiryPopup] = useState(false);
  const [enquiry, setEnquiry] = useState(enquiryDefaults);
  const [enquiryCategories, setEnquiryCategories] = useState([]);
  const [enquiryProducts, setEnquiryProducts] = useState([]);
  const [loadingEnquiryCategories, setLoadingEnquiryCategories] = useState(false);
  const [enquiryUploadedPhotos, setEnquiryUploadedPhotos] = useState([]);
  const [enquiryReplacedPhotos, setEnquiryReplacedPhotos] = useState({});
  const enquiryTypes = [...new Set(enquiryCategories.map((category) => String(category.category_type || "").trim()).filter(Boolean))];
  const enquiryProductCategories = enquiryCategories.filter((category) =>
    String(category.category_type || "").trim().toLowerCase() === String(enquiry.enquiryType || "").trim().toLowerCase()
  );
  const enquiryCategoryProducts = enquiryProducts.filter((product) =>
    String(product.category || "").trim().toLowerCase() === String(enquiry.productCategory || "").trim().toLowerCase()
  );
  const selectedEnquiryProduct = enquiryProducts.find((product) => product.product_name === enquiry.productName);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      if (todayOnly) {
        params.today = "1";
      } else if (!allowedStatuses) {
        params.billing_type = "Online Order";
      }

      const res = await api.get("/orders", { params });
      if (res.data?.success && Array.isArray(res.data.data)) {
        const nextOrders = res.data.data.filter((order) => {
          const normalizedStatus = normalizeStatus(order.order_status);
          const rawStatus = String(order.order_status || "").trim().toLowerCase();
          if (todayOnly && ["completed", "delivered", "cancelled"].includes(rawStatus)) return false;
          if (
            allowedStatuses &&
            !allowedStatuses.some(
              (status) => normalizeStatus(status) === normalizedStatus
            )
          ) return false;
          return activeStatus === "All" || normalizedStatus === normalizeStatus(activeStatus);
        });
        setOrders(nextOrders);
        setCurrentPage(1);
      } else {
        setOrders([]);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error("Fetch orders error:", err);
      toast.error("Failed to load orders");
      setOrders([]);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeStatus, allowedStatuses, todayOnly]);

  useEffect(() => {
    if (!showNewOrderButton) return;

    const fetchEnquiries = async () => {
      try {
        setLoadingEnquiries(true);
        const response = await api.get("/enquiries");
        setEnquiries(Array.isArray(response.data?.data) ? response.data.data : []);
      } catch (error) {
        console.error("Fetch enquiries error:", error);
        toast.error("Failed to load enquiries");
        setEnquiries([]);
      } finally {
        setLoadingEnquiries(false);
      }
    };

    fetchEnquiries();
  }, [showNewOrderButton]);

  useEffect(() => {
    if (!showEnquiryPopup) return;

    const fetchEnquiryCategories = async () => {
      try {
        setLoadingEnquiryCategories(true);
        const [categoryResponse, productResponse] = await Promise.all([
          api.get("/categories"),
          api.get("/products"),
        ]);
        const categories = Array.isArray(categoryResponse.data?.data) ? categoryResponse.data.data : [];
        const products = Array.isArray(productResponse.data?.data) ? productResponse.data.data : [];
        setEnquiryCategories(categories);
        setEnquiryProducts(products);
      } catch (error) {
        console.warn("Could not fetch enquiry categories:", error);
        setEnquiryCategories([]);
        setEnquiryProducts([]);
      } finally {
        setLoadingEnquiryCategories(false);
      }
    };

    fetchEnquiryCategories();
  }, [showEnquiryPopup]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
  const paginatedOrders = orders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleEnquiryChange = (event) => {
    const { name, value } = event.target;
    const selectedProduct = name === "productName"
      ? enquiryProducts.find((product) => product.product_name === value)
      : null;
    setEnquiry((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "enquiryType" ? { productCategory: "", productName: "" } : {}),
      ...(name === "productCategory" ? { productName: "" } : {}),
      ...(selectedProduct ? {
        size: selectedProduct.size_variants?.[0]?.size || "",
        frameType: selectedProduct.frame_data?.frame_name || "",
      } : {}),
    }));
    if (name === "enquiryType" || name === "productCategory" || name === "productName") {
      setEnquiryUploadedPhotos([]);
      setEnquiryReplacedPhotos({});
    }
  };

  const handleEnquiryPhotoUpload = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;

    const formData = new FormData();
    formData.append("folder", "enquiries");
    files.forEach((file) => formData.append("files", file));

    try {
      const response = await api.post("/upload", formData);
      const uploadedUrls = response.data?.urls || (response.data?.url ? [response.data.url] : []);
      setEnquiryUploadedPhotos((previous) => [...previous, ...uploadedUrls.map(imageUrl)]);
      if (uploadedUrls[0]) setEnquiry((previous) => ({ ...previous, referenceImage: uploadedUrls[0] }));
      toast.success(`${uploadedUrls.length} photo${uploadedUrls.length === 1 ? "" : "s"} uploaded`);
    } catch (error) {
      console.error("Enquiry photo upload error:", error);
      toast.error("Photo upload failed");
    } finally {
      event.target.value = "";
    }
  };

  const handleReplaceEnquiryPhoto = async (event, photoIndex) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const formData = new FormData();
    formData.append("folder", "enquiries");
    formData.append("file", file);

    try {
      const response = await api.post("/upload", formData);
      const uploadedUrl = response.data?.url || response.data?.urls?.[0] || "";
      if (!uploadedUrl) return;
      setEnquiryReplacedPhotos((previous) => ({ ...previous, [photoIndex]: imageUrl(uploadedUrl) }));
      toast.success("Photo replaced successfully");
    } catch (error) {
      console.error("Replace enquiry photo error:", error);
      toast.error("Photo replacement failed");
    } finally {
      event.target.value = "";
    }
  };

  const handleEnquirySubmit = async (event) => {
    event.preventDefault();
    try {
      const updatedAt = new Date().toISOString().slice(0, 10);
      const frameImage = selectedEnquiryProduct?.frame_data?.frame_image || selectedEnquiryProduct?.product_images?.[0] || enquiry.frameImage || "";
      const uploadedImages = [...productPhotos(selectedEnquiryProduct?.slot_photos), ...enquiryUploadedPhotos]
        .filter((image, index, images) => images.indexOf(image) === index);
      const payload = {
        ...enquiry,
        enquiryId: editingEnquiryId ? enquiry.enquiryId : "",
        frameImage,
        referenceImage: uploadedImages[0] || enquiry.referenceImage || "",
        uploadedImages,
        updatedAt,
      };
      const response = editingEnquiryId
        ? await api.put(`/enquiries/${editingEnquiryId}`, payload)
        : await api.post("/enquiries", payload);
      if (!response.data?.success) throw new Error(response.data?.message || "Failed to save enquiry");
      setEnquiry((previous) => ({ ...previous, updatedAt }));
      setShowEnquiryPopup(false);
      setEditingEnquiryId(null);
      toast.success(editingEnquiryId ? "Enquiry updated successfully" : "New enquiry saved successfully");
      const refreshed = await api.get("/enquiries");
      setEnquiries(Array.isArray(refreshed.data?.data) ? refreshed.data.data : []);
    } catch (error) {
      console.error("Save enquiry error:", error);
      toast.error(error.response?.data?.message || "Failed to save enquiry");
    }
  };

  const enquiryToForm = (item) => ({
    ...enquiryDefaults,
    enquiryId: item.enquiry_id || item.enquiryId || item.id,
    customerName: item.customer_name || "", mobileNumber: item.mobile_number || "",
    whatsappNumber: item.whatsapp_number || "", email: item.email || "",
    enquiryType: item.enquiry_type || "", productCategory: item.product_category || "",
    productName: item.product_name || "", quantity: item.quantity || 1, budget: item.budget || 0,
    frameImage: item.frame_image || "",
    referenceImage: item.reference_image || "",
    uploadedImages: enquiryImages(item.uploaded_images),
    message: item.message || "", size: item.size || "", frameType: item.frame_type || "",
    customization: item.customization || "", status: item.status || "New", priority: item.priority || "Medium",
    source: item.source || "Website", assignedTo: item.assigned_to || "Admin",
    followUpDate: item.follow_up_date ? String(item.follow_up_date).slice(0, 10) : "",
    followUpNotes: item.follow_up_notes || "", quotationAmount: item.quotation_amount || 0,
    createdAt: item.created_at ? String(item.created_at).slice(0, 10) : "",
    updatedAt: item.updated_at ? String(item.updated_at).slice(0, 10) : "",
  });

  const handleEditEnquiry = (item) => {
    setEnquiry(enquiryToForm(item));
    setEnquiryUploadedPhotos(enquiryToForm(item).uploadedImages.map(imageUrl));
    setEditingEnquiryId(item.enquiry_id || item.id);
    setShowEnquiryPopup(true);
  };

  const handleViewEnquiry = async (item) => {
    setSelectedEnquiry({ ...item, uploaded_images: enquiryImages(item.uploaded_images) });
    setViewEnquiryProduct(null);
    if (!item.product_name) return;
    try {
      const response = await api.get("/products");
      const products = Array.isArray(response.data?.data) ? response.data.data : [];
      setViewEnquiryProduct(products.find((product) => product.product_name === item.product_name) || null);
    } catch (error) {
      console.warn("Could not load enquiry frame preview:", error);
    }
  };

  const handleDeleteEnquiry = async (item) => {
    const enquiryId = item.enquiry_id || item.id;
    if (!window.confirm(`Delete enquiry ${enquiryId}?`)) return;
    try {
      await api.delete(`/enquiries/${enquiryId}`);
      setEnquiries((previous) => previous.filter((entry) => (entry.enquiry_id || entry.id) !== enquiryId));
      setSelectedEnquiry(null);
      toast.success("Enquiry deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete enquiry");
    }
  };

  const handleDownloadAllPhotos = async (photos, orderId, productName) => {
    if (!photos || !photos.length) return;
    toast.loading(`Starting download of ${photos.length} photos...`, { id: "downloadAll" });
    for (let i = 0; i < photos.length; i++) {
      const [slotId, photoEntry] = photos[i];
      const rawUrl = typeof photoEntry === "string" ? photoEntry : photoEntry?.url || photoEntry?.preview || "";
      const resolvedUrl = imageUrl(rawUrl);
      try {
        const resp = await fetch(resolvedUrl);
        const blob = await resp.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `Order-${orderId || "Order"}-${slotId || `Photo-${i + 1}`}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch {
        const link = document.createElement("a");
        link.href = resolvedUrl;
        link.download = `Order-${orderId || "Order"}-${slotId || `Photo-${i + 1}`}.jpg`;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
    toast.success(`Downloaded all ${photos.length} photos!`, { id: "downloadAll" });
  };

  const handlePrintAlbumPhotos = (photos, orderId, productName, orderDetails) => {
    if (!photos || !photos.length) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups to print photos.");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Order #${orderId} - ${productName || "Album Photos"}</title>
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 15px;
              color: #1a1a1a;
              background: #fff;
            }
            .header {
              border-bottom: 2px solid #1a3c36;
              padding-bottom: 10px;
              margin-bottom: 15px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .header h1 {
              margin: 0;
              font-size: 18px;
              color: #1a3c36;
            }
            .header p {
              margin: 4px 0 0;
              font-size: 12px;
              color: #666;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
            }
            .photo-card {
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 8px;
              page-break-inside: avoid;
              text-align: center;
              background: #fafafa;
            }
            .photo-card img {
              max-width: 100%;
              height: 250px;
              object-fit: contain;
              border-radius: 4px;
              background: #fff;
            }
            .photo-label {
              margin-top: 6px;
              font-weight: bold;
              font-size: 12px;
              color: #333;
            }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Order #${orderId} - Album Photos Sheet</h1>
              <p>Product: <strong>${productName}</strong> | Total Photos: <strong>${photos.length}</strong> | Customer: <strong>${orderDetails?.customer_name || ""}</strong></p>
            </div>
            <div class="no-print">
              <button onclick="window.print()" style="background:#1a3c36; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:bold; cursor:pointer;">Print Now</button>
            </div>
          </div>
          <div class="grid">
            ${photos.map(([label, entry], idx) => {
              const src = imageUrl(typeof entry === "string" ? entry : entry?.url || entry?.preview || "");
              return `
                <div class="photo-card">
                  <img src="${src}" alt="Photo ${idx + 1}" />
                  <div class="photo-label">Position ${idx + 1} (${label})</div>
                </div>
              `;
            }).join("")}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 600);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleViewOrder = async (orderId) => {
    if (todayOnly) {
      navigate(`/admin/orders/new/${orderId}`);
      return;
    }

    try {
      setLoadingDetails(true);
      const res = await api.get(`/orders/${orderId}`);
      if (res.data?.success && res.data.data) {
        setSelectedOrder(res.data.data);
        setStatusDraft(normalizeStatus(res.data.data.order_status || "Pending"));
        setCancellationReason(res.data.data.notes || "");
        setShippingDetails({
          shipped_at: res.data.data.shipped_at
            ? new Date(res.data.data.shipped_at).toISOString().slice(0, 16)
            : "",
          docket_number: res.data.data.docket_number || "",
          courier_name: res.data.data.courier_name || "",
        });
      } else {
        toast.error("Could not load order details");
      }
    } catch (err) {
      console.error("View order error:", err);
      toast.error("Failed to load order details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus, details = shippingDetails) => {
    if ((newStatus === "Cancelled" || newStatus === "CANCELLED") && !cancellationReason.trim()) {
      toast.error("Please enter a cancellation reason");
      return;
    }
    try {
      setUpdatingStatus(true);
      const res = await api.patch(`/orders/${orderId}/status`, {
        order_status: newStatus,
        ...details,
        notes: cancellationReason.trim(),
      });

      if (res.data?.success) {
        toast.success(`Order status updated to ${statusName(newStatus)}`);
        if (selectedOrder) {
          setSelectedOrder((prev) => ({ ...prev, order_status: newStatus, notes: cancellationReason.trim() }));
        }
        setOrders((prev) =>
          prev.map((o) =>
            o.order_id === orderId ? { ...o, order_status: newStatus } : o
          )
        );
        setStatusPopupOrderId(null);
        setStatusDraft("");
        setStatusPopupOrderId(null);
      }
    } catch (err) {
      console.error("Update status error:", err);
      toast.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm(`Are you sure you want to delete order ${orderId}?`)) return;

    try {
      const res = await api.delete(`/orders/${orderId}`);
      if (res.data?.success) {
        toast.success("Order deleted successfully");
        if (selectedOrder?.order_id === orderId) {
          setSelectedOrder(null);
        }
        fetchOrders();
      }
    } catch (err) {
      console.error("Delete order error:", err);
      toast.error("Failed to delete order");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return "bg-[#fff8eb] text-[#b07838] border-[#eedac3]";
      case "Processing":
      case "PACKING":
        return "bg-[#eef2ff] text-[#4f46e5] border-[#c7d2fe]";
      case "SHIPPED":
      case "Packing":
        return "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]";
      case "Shipped":
        return "bg-[#f0fdf4] text-[#16a34a] border-[#bbf7d0]";
      case "Delivered":
        return "bg-[#e8f6ed] text-[#1b794b] border-[#a3e6be]";
      case "Cancelled":
        return "bg-[#fff1f1] text-[#dc2626] border-[#fecaca]";
      default:
        return "bg-[#f3f4f6] text-[#4b5563] border-[#e5e7eb]";
    }
  };

  const statusOptions = allowedStatuses
    ? ["All", ...allowedStatuses]
    : ["All", "Pending", "Order Placed", "Processing", "Packing", "Shipped", "Delivered", "Cancelled"];

  // Metrics
  const totalOrdersCount = orders.length;
  const pendingCount = orders.filter((o) => o.order_status === "Pending").length;
  const processingCount = orders.filter((o) => o.order_status === "Processing").length;
  const deliveredOrders = orders.filter((o) => normalizeStatus(o.order_status) === "DELIVERED");
  const deliveredCount = deliveredOrders.length;
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const metricCards = [
    {
      title: "Total Orders",
      value: totalOrdersCount.toLocaleString(),
      change: "18.6%",
      icon: ShoppingCart,
      color: "#22c55e",
      wave: "#9be7b9",
    },
    {
      title: "Total Revenue",
      value: `₹${totalRevenue.toLocaleString("en-IN")}`,
      change: "22.4%",
      icon: IndianRupee,
      color: "#f59e0b",
      wave: "#f9d99b",
    },
    {
      title: "Pending Orders",
      value: pendingCount.toLocaleString(),
      change: "15.3%",
      icon: Clock,
      color: "#06b6d4",
      wave: "#93dce8",
    },
    {
      title: "Delivered Orders",
      value: deliveredCount.toLocaleString(),
      change: "10.7%",
      icon: CheckCircle,
      color: "#a855f7",
      wave: "#d8b4f5",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f5f2] p-4 md:p-2">
      <style>{`@keyframes status-popup-in { from { opacity: 0; transform: scale(.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } } .status-popup-card { animation: status-popup-in 180ms ease-out; }`}</style>
      <div className="mx-auto max-w-7xl">
     

        {/* METRICS ROW */}
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
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
                    <p className="text-sm font-medium text-[#374151]">{card.title}</p>
                    <p className="mt-2 truncate text-[1.75rem] font-bold leading-none text-[#111827]">
                      {card.value}
                    </p>
                    <p className="mt-5 text-xs font-medium text-[#00a76f]">↗ {card.change}</p>
                    <p className="mt-1 text-[11px] text-[#7c8798]">from last month</p>
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

        {/* SEARCH & FILTER BAR */}
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-[#e8dfd2] bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          {/* SEARCH */}
          <form onSubmit={handleSearch} className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Order ID, Name, Phone..."
              className="h-10 w-full rounded-xl border border-[#d8cfc3] bg-white pl-9 pr-3 text-xs outline-none focus:border-[#b07838]"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-[#999]" />
          </form>
          <div className="flex flex-wrap items-center justify-end gap-3 sm:ml-auto">
            {showNewOrderButton && (
              <button
                type="button"
                onClick={() => { setEditingEnquiryId(null); setEnquiry(enquiryDefaults); setEnquiryUploadedPhotos([]); setEnquiryReplacedPhotos({}); setShowEnquiryPopup(true); }}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#235048]"
              >
                <Plus className="h-4 w-4" /> Add New Order
              </button>
            )}
            <div className="flex items-center gap-2">
                
                <select value={activeStatus} onChange={(event) => setActiveStatus(event.target.value)} className="h-10 rounded-xl border border-[#d8cfc3] bg-white px-3 text-xs font-bold text-[#1a3c36] outline-none focus:border-[#b07838]" aria-label="Filter orders by status">
                  <option value="All">All Statuses</option>
                  {orderStatuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}
                </select>
            </div>

            <div className="flex shrink-0 items-center gap-1 rounded-xl border border-[#d8cfc3] bg-[#faf8f4] p-1">
            <button type="button" onClick={() => setViewMode("card")} className={`inline-flex h-8 w-9 items-center justify-center rounded-lg text-xs font-bold ${viewMode === "card" ? "bg-[#1a3c36] text-white" : "text-[#66736e] hover:bg-white"}`} aria-pressed={viewMode === "card"} aria-label="Card view" title="Card view">
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setViewMode("table")} className={`inline-flex h-8 w-9 items-center justify-center rounded-lg text-xs font-bold ${viewMode === "table" ? "bg-[#1a3c36] text-white" : "text-[#66736e] hover:bg-white"}`} aria-pressed={viewMode === "table"} aria-label="Table view" title="Table view">
              <List className="h-3.5 w-3.5" />
            </button>
            </div>
          </div>
        </div>

        {showNewOrderButton ? (
          <div className="overflow-hidden rounded-3xl border border-[#e8dfd2] bg-white shadow-xs">
            {loadingEnquiries ? (
              <div className="py-20 text-center text-sm text-[#777]">Loading enquiries...</div>
            ) : enquiries.length === 0 ? (
              <div className="py-20 text-center text-sm text-[#777]"><Package className="mx-auto h-12 w-12 text-[#ccc]" /><p className="mt-3 font-semibold text-[#444]">No enquiries found.</p></div>
            ) : (
              <>
              {viewMode === "card" && (
                <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                  {enquiries.map((item) => (
                    <article key={item.enquiry_id || item.id} className="rounded-2xl border border-[#e8dfd2] bg-[#fffdfa] p-4 shadow-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="font-mono text-xs font-bold text-[#1a3c36]">{item.enquiry_id}</p><p className="mt-1 text-[11px] text-[#777]">{item.created_at ? new Date(item.created_at).toLocaleDateString("en-IN") : "--"}</p></div>
                        <span className="rounded-full border border-[#eedac3] bg-[#fff8eb] px-2.5 py-1 text-[11px] font-bold text-[#b07838]">{item.status || "New"}</span>
                      </div>
                      <div className="mt-4 space-y-2 text-xs"><p className="font-bold text-[#1d2925]">{item.customer_name || "--"}</p><p className="text-[#777]">{item.mobile_number || "--"}</p><p className="font-semibold text-[#333]">{item.product_name || "Custom Frame"}</p><p className="text-[#555]">{item.frame_type || "-"} · {item.size || "-"}</p><p className="text-[#777]">{item.customization || item.message || "No customization notes"}</p></div>
                      <div className="mt-4 flex justify-end gap-2 border-t border-[#f0e8dc] pt-3"><button type="button" onClick={() => handleViewEnquiry(item)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d8cfc3] bg-white px-2.5 text-xs font-bold text-[#1a3c36] hover:bg-[#eef5f3]" title="View enquiry"><Eye className="h-3.5 w-3.5" /> View</button><button type="button" onClick={() => handleEditEnquiry(item)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d8cfc3] bg-white text-[#1a3c36] hover:bg-[#eef5f3]" title="Edit enquiry" aria-label={`Edit ${item.enquiry_id}`}><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => handleDeleteEnquiry(item)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f2dada] bg-[#fff5f5] text-[#d04d4d] hover:bg-[#ffe5e5]" title="Delete enquiry" aria-label={`Delete ${item.enquiry_id}`}><Trash2 className="h-3.5 w-3.5" /></button></div>
                    </article>
                  ))}
                </div>
              )}
              <div className={viewMode === "card" ? "hidden" : "overflow-x-auto"}>
                <table className="min-w-full text-left text-xs">
                  <thead><tr className="border-b border-[#e5d7bb] bg-[#f0e6d2] text-left text-sm font-semibold text-[#3d3d3d]"><th className="px-4 py-3.5">Enquiry ID</th><th className="px-4 py-3.5">Customer</th><th className="px-4 py-3.5">Product</th><th className="px-4 py-3.5">Requirements</th><th className="px-4 py-3.5">Follow-up</th><th className="px-4 py-3.5">Status</th><th className="px-4 py-3.5">Priority</th><th className="px-4 py-3.5 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-[#f2ebdf]">{enquiries.map((item) => <tr key={item.enquiry_id || item.id} className="text-[#333] transition hover:bg-[#fbf9f6]"><td className="whitespace-nowrap px-4 py-4 font-mono font-bold text-[#1a3c36]">{item.enquiry_id}</td><td className="px-4 py-4"><p className="font-bold">{item.customer_name}</p><p className="text-[11px] text-[#777]">{item.mobile_number}</p></td><td className="px-4 py-4"><p className="font-semibold">{item.product_name || "-"}</p><p className="text-[11px] text-[#777]">{item.enquiry_type} · {item.product_category}</p></td><td className="max-w-56 px-4 py-4"><p>{item.frame_type || "-"} · {item.size || "-"}</p><p className="truncate text-[11px] text-[#777]">{item.customization || item.message || "-"}</p></td><td className="whitespace-nowrap px-4 py-4"><p>{item.follow_up_date ? new Date(item.follow_up_date).toLocaleDateString("en-IN") : "-"}</p><p className="max-w-40 truncate text-[11px] text-[#777]">{item.follow_up_notes || "No notes"}</p></td><td className="px-4 py-4"><span className="rounded-full border border-[#eedac3] bg-[#fff8eb] px-2.5 py-1 text-[11px] font-bold text-[#b07838]">{item.status || "New"}</span></td><td className="px-4 py-4 font-semibold">{item.priority || "Medium"}</td><td className="px-4 py-4 text-right"><div className="inline-flex items-center gap-1"><button type="button" onClick={() => handleViewEnquiry(item)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#d8cfc3] bg-white px-2.5 text-xs font-bold text-[#1a3c36] hover:bg-[#eef5f3]" title="View enquiry"><Eye className="h-3.5 w-3.5" /> View</button><button type="button" onClick={() => handleEditEnquiry(item)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d8cfc3] bg-white text-[#1a3c36] hover:bg-[#eef5f3]" title="Edit enquiry" aria-label={`Edit ${item.enquiry_id}`}><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => handleDeleteEnquiry(item)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f2dada] bg-[#fff5f5] text-[#d04d4d] hover:bg-[#ffe5e5]" title="Delete enquiry" aria-label={`Delete ${item.enquiry_id}`}><Trash2 className="h-3.5 w-3.5" /></button></div></td></tr>)}</tbody>
                </table>
              </div>
              </>
            )}
          </div>
        ) : (
        /* ORDERS TABLE */
        <div className="overflow-hidden rounded-3xl border border-[#e8dfd2] bg-white shadow-xs">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#b07838] border-t-transparent" />
              <p className="mt-2 text-xs font-semibold text-[#777]">Loading customer orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-20 text-center text-sm text-[#777]">
              <Package className="mx-auto h-12 w-12 text-[#ccc]" />
              <p className="mt-3 font-semibold text-[#444]">No orders found.</p>
              <p className="text-xs text-[#888]">When customers buy frames, orders appear here with customized photos.</p>
            </div>
          ) : (
            <>
              {viewMode === "card" && (
                <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                  {paginatedOrders.map((order) => (
                    <article key={order.id} className="rounded-2xl border border-[#e8dfd2] bg-[#fffdfa] p-4 shadow-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-xs font-bold text-[#1a3c36]">{order.order_id}</p>
                          <p className="mt-1 text-[11px] text-[#777]">{order.created_at ? new Date(order.created_at).toLocaleDateString("en-IN") : "--"}</p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${getStatusBadge(order.order_status)}`}>{statusName(order.order_status)}</span>
                      </div>
                      <div className="mt-4 space-y-2 text-xs">
                        <p className="font-bold text-[#1d2925]">{order.customer_name || "--"}</p>
                        <p className="flex items-center gap-1 text-[#777]"><Phone className="h-3 w-3" /> {order.customer_phone || "--"}</p>
                        <p className="text-[#555]"><span className="font-semibold">{order.item_count || 1} item{order.item_count !== 1 ? "s" : ""}</span> · {order.product_names || "Custom Frame"}</p>
                        <p className="text-base font-black text-[#1a3c36]">₹{order.total_amount}</p>
                        <p className="text-[#777]">{order.payment_method || "--"} · {order.payment_status || "--"}</p>
                      </div>
                      <div className="mt-4 flex justify-end gap-2 border-t border-[#f0e8dc] pt-3">
                        <button type="button" onClick={() => handleViewOrder(order.order_id)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#d8cfc3] bg-white px-2.5 text-xs font-bold text-[#1a3c36] hover:bg-[#eef5f3]"><Eye className="h-3.5 w-3.5" /> View</button>
                        <button type="button" onClick={() => handleDeleteOrder(order.order_id)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f2dada] bg-[#fff5f5] text-[#d04d4d] hover:bg-[#ffe5e5]" title="Delete Order"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <div className={viewMode === "card" ? "hidden" : "overflow-x-auto"}>
                <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e5d7bb] bg-[#f0e6d2] text-left text-sm font-semibold text-[#3d3d3d]">
                    <th className="px-4 py-3.5">Order ID</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Customer</th>
                    <th className="px-4 py-3.5">Items</th>
                    <th className="px-4 py-3.5">Total</th>
                    <th className="px-4 py-3.5">Payment</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2ebdF]">
                  {paginatedOrders.map((order) => {
                    const dateStr = order.created_at
                      ? new Date(order.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "--";

                    return (
                      <tr
                        key={order.id}
                        className="transition hover:bg-[#fbf9f6] text-[#333]"
                      >
                        <td className="px-4 py-4 font-mono font-bold text-[#1a3c36]">
                          {order.order_id}
                        </td>
                        <td className="px-4 py-4 text-[#777] whitespace-nowrap">
                          {dateStr}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-[#1d2925]">{order.customer_name}</div>
                          <div className="text-[11px] text-[#777] flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" /> {order.customer_phone}
                          </div>
                        </td>
                        <td className="px-4 py-4 max-w-[200px] truncate text-[#555]">
                          <span className="font-semibold text-[#333]">
                            {order.item_count || 1} item{order.item_count !== 1 ? "s" : ""}
                          </span>
                          <span className="block text-[11px] text-[#888] truncate">
                            {order.product_names || "Custom Frame"}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-bold text-[#1a3c36]">
                          ₹{order.total_amount}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-[11px] font-semibold text-[#444]">
                            {order.payment_method}
                          </span>
                          <span className="block text-[10px] text-[#888]">
                            {order.payment_status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="relative inline-block">
                            {readOnlyStatus ? (
                              <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${getStatusBadge(order.order_status)}`}>
                                {statusName(order.order_status)}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setStatusPopupOrderId((current) => current === order.order_id ? null : order.order_id);
                                  setStatusDraft(normalizeStatus(order.order_status));
                                  setCancellationReason(order.notes || "");
                                }}
                                className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${getStatusBadge(order.order_status)}`}
                                title="Click to update order status"
                              >
                                {statusName(order.order_status)}
                              </button>
                            )}
                            {!readOnlyStatus && statusPopupOrderId === order.order_id && (
                              <div
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
                                role="dialog"
                                aria-modal="true"
                                aria-label={`Update status for ${order.order_id}`}
                                onMouseDown={(event) => event.target === event.currentTarget && setStatusPopupOrderId(null)}
                              >
                                <div className="status-popup-card w-full max-w-sm rounded-2xl border border-[#e5e7eb] bg-white p-5 text-left shadow-2xl">
                                  <div className="mb-4 flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#6b7280]">Update Status</p>
                                      <h3 className="mt-1 text-base font-bold text-[#1a3c36]">{order.order_id}</h3>
                                    </div>
                                    <button type="button" onClick={() => setStatusPopupOrderId(null)} className="rounded-md bg-[#1a3c36] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#235048]">Close</button>
                                  </div>
                                  <select
                                    value={statusDraft}
                                    onChange={(event) => {
                                      setStatusDraft(event.target.value);
                                      if (event.target.value !== "Cancelled" && event.target.value !== "CANCELLED") {
                                        setCancellationReason("");
                                      }
                                    }}
                                    disabled={updatingStatus}
                                    className="h-10 w-full rounded-md border border-[#d8cfc3] bg-white px-3 text-xs font-semibold text-[#1a3c36] outline-none focus:border-[#1a3c36] focus:ring-1 focus:ring-[#1a3c36]"
                                  >
                                    {getStatusOptions(order.order_status).map((status) => (
                                      <option key={status.id} value={status.id}>{status.name}</option>
                                    ))}
                                    {!getStatusOptions(order.order_status).some((status) => status.id === normalizeStatus(order.order_status)) && (
                                      <option value={normalizeStatus(order.order_status)}>{statusName(order.order_status)}</option>
                                    )}
                                  </select>
                                  {(statusDraft === "Shipped" || statusDraft === "SHIPPED") && (
                                    <div className="mt-3 space-y-2">
                                      <input type="datetime-local" value={shippingDetails.shipped_at} onChange={(event) => setShippingDetails((prev) => ({ ...prev, shipped_at: event.target.value }))} className="h-9 w-full rounded-md border border-[#d8cfc3] px-2 text-xs outline-none focus:border-[#1a3c36]" aria-label="Shipped date and time" />
                                      <input value={shippingDetails.docket_number} onChange={(event) => setShippingDetails((prev) => ({ ...prev, docket_number: event.target.value }))} placeholder="Docket number" className="h-9 w-full rounded-md border border-[#d8cfc3] px-2 text-xs outline-none focus:border-[#1a3c36]" />
                                      <input value={shippingDetails.courier_name} onChange={(event) => setShippingDetails((prev) => ({ ...prev, courier_name: event.target.value }))} placeholder="Courier name" className="h-9 w-full rounded-md border border-[#d8cfc3] px-2 text-xs outline-none focus:border-[#1a3c36]" />
                                    </div>
                                  )}
                                  {(statusDraft === "Cancelled" || statusDraft === "CANCELLED") && (
                                    <textarea
                                      value={cancellationReason}
                                      onChange={(event) => setCancellationReason(event.target.value)}
                                      placeholder="Enter cancellation reason"
                                      rows={3}
                                      required
                                      className="mt-3 w-full rounded-md border border-[#d8cfc3] px-2 py-2 text-xs outline-none focus:border-[#1a3c36]"
                                      aria-label="Cancellation reason"
                                    />
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(order.order_id, statusDraft, shippingDetails)}
                                    disabled={updatingStatus || !statusDraft || statusDraft === normalizeStatus(order.order_status) || ((statusDraft === "Cancelled" || statusDraft === "CANCELLED") && !cancellationReason.trim())}
                                    className="mt-3 w-full rounded-md bg-[#1a3c36] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#235048] disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {updatingStatus ? "Updating..." : "Update Status"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleViewOrder(order.order_id)}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#d8cfc3] bg-white px-2.5 text-xs font-bold text-[#1a3c36] shadow-2xs hover:bg-[#eef5f3]"
                              title="View Order Details and Customized Photos"
                            >
                              <Eye className="h-3.5 w-3.5" /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOrder(order.order_id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f2dada] bg-[#fff5f5] text-[#d04d4d] hover:bg-[#ffe5e5]"
                              title="Delete Order"
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
              <div className={viewMode === "card" ? "hidden" : "flex flex-col gap-3 border-t border-[#f0e8dc] px-4 py-3 text-xs text-[#777] sm:flex-row sm:items-center sm:justify-between"}>
              <span>
                Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, orders.length)} of {orders.length} orders
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d8cfc3] bg-white text-[#1a3c36] transition hover:bg-[#eef5f3] disabled:cursor-not-allowed disabled:opacity-40"
                  title="Previous page"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-16 text-center font-semibold text-[#444]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d8cfc3] bg-white text-[#1a3c36] transition hover:bg-[#eef5f3] disabled:cursor-not-allowed disabled:opacity-40"
                  title="Next page"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              </div>
            </>
          )}
        </div>
        )}
      </div>

      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="enquiry-details-title" onMouseDown={(event) => event.target === event.currentTarget && setSelectedEnquiry(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#e8dfd2] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#f0e8dc] pb-4">
              <div><p className="text-[10px] font-bold uppercase tracking-widest text-[#b07838]">Enquiry details</p><h2 id="enquiry-details-title" className="mt-1 text-xl font-black text-[#1a3c36]">{selectedEnquiry.enquiry_id}</h2></div>
              <button type="button" onClick={() => setSelectedEnquiry(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f4eee6] text-[#555]" aria-label="Close enquiry details"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 grid gap-4 text-xs sm:grid-cols-2">
              {[['Customer', selectedEnquiry.customer_name], ['Mobile', selectedEnquiry.mobile_number], ['WhatsApp', selectedEnquiry.whatsapp_number], ['Email', selectedEnquiry.email], ['Product', selectedEnquiry.product_name], ['Category', selectedEnquiry.product_category], ['Quantity', selectedEnquiry.quantity], ['Budget', `₹${selectedEnquiry.budget || 0}`], ['Size', selectedEnquiry.size], ['Frame Type', selectedEnquiry.frame_type], ['Status', selectedEnquiry.status], ['Priority', selectedEnquiry.priority], ['Source', selectedEnquiry.source], ['Assigned To', selectedEnquiry.assigned_to], ['Follow-up Date', selectedEnquiry.follow_up_date ? new Date(selectedEnquiry.follow_up_date).toLocaleDateString('en-IN') : '-'], ['Quotation', `₹${selectedEnquiry.quotation_amount || 0}`]].map(([label, value]) => <div key={label} className="rounded-xl bg-[#faf8f4] p-3"><p className="font-semibold text-[#66736e]">{label}</p><p className="mt-1 font-bold text-[#1d2925]">{value || '-'}</p></div>)}
              <div className="rounded-xl bg-[#faf8f4] p-3 sm:col-span-2"><p className="font-semibold text-[#66736e]">Message / Customization</p><p className="mt-1 whitespace-pre-wrap font-bold text-[#1d2925]">{selectedEnquiry.message || selectedEnquiry.customization || '-'}</p></div>
              <div className="rounded-xl bg-[#faf8f4] p-3 sm:col-span-2"><p className="font-semibold text-[#66736e]">Follow-up Notes</p><p className="mt-1 whitespace-pre-wrap font-bold text-[#1d2925]">{selectedEnquiry.follow_up_notes || '-'}</p></div>
            </div>
            {(selectedEnquiry.frame_image || selectedEnquiry.reference_image || selectedEnquiry.uploaded_images || viewEnquiryProduct?.frame_data?.frame_image || viewEnquiryProduct?.product_images?.[0]) && <div className="mt-5 rounded-2xl border border-[#e8dfd2] bg-[#faf8f4] p-4"><p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#b07838]">Frame Preview &amp; Customer Images</p><div className="grid gap-4 sm:grid-cols-2">{(selectedEnquiry.frame_image || viewEnquiryProduct?.frame_data?.frame_image || viewEnquiryProduct?.product_images?.[0]) && <div><p className="mb-2 text-xs font-semibold text-[#66736e]">Selected Frame</p><div className="relative mx-auto aspect-[3/4] max-h-[28rem] w-full max-w-sm overflow-hidden rounded-xl border border-[#e8dfd2] bg-white"><img src={imageUrl(selectedEnquiry.frame_image || viewEnquiryProduct?.frame_data?.frame_image || viewEnquiryProduct.product_images[0])} alt={selectedEnquiry.product_name || 'Frame product'} className="absolute inset-0 h-full w-full object-contain" />{(viewEnquiryProduct?.frame_data?.photo_slots || []).map((slot, index) => { const photo = enquiryImages(selectedEnquiry.uploaded_images)[index] || (index === 0 ? selectedEnquiry.reference_image : ""); return photo ? <img key={`${slot.id || index}-${photo}`} src={imageUrl(photo)} alt={`Customer photo ${index + 1}`} className="absolute object-cover" style={{ top: slot.top, left: slot.left, width: slot.width, height: slot.height, borderRadius: slot.shape === "circle" ? "9999px" : undefined }} /> : null; })}</div></div>}{enquiryImages(selectedEnquiry.uploaded_images).concat(selectedEnquiry.reference_image ? [selectedEnquiry.reference_image] : []).filter((image, index, images) => images.indexOf(image) === index).map((image, index) => <div key={`${image}-${index}`}><p className="mb-2 text-xs font-semibold text-[#66736e]">Customer Image {index + 1}</p><img src={imageUrl(image)} alt={`Customer reference ${index + 1}`} className="h-56 w-full rounded-xl border border-[#e8dfd2] bg-white object-contain" /></div>)}</div></div>}
            <div className="mt-5 flex justify-end gap-2 border-t border-[#f0e8dc] pt-4"><button type="button" onClick={() => { setSelectedEnquiry(null); handleEditEnquiry(selectedEnquiry); }} className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a3c36] px-4 py-2.5 text-xs font-bold text-white"><Pencil className="h-3.5 w-3.5" /> Edit Enquiry</button><button type="button" onClick={() => setSelectedEnquiry(null)} className="rounded-xl border border-[#d8cfc3] px-4 py-2.5 text-xs font-bold text-[#66736e]">Close</button></div>
          </div>
        </div>
      )}

      {/* ================= ORDER DETAILS & CUSTOMIZED PHOTOS INSPECTOR MODAL ================= */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-[#ebe3d7] bg-white p-6 shadow-2xl">
            {/* CLOSE */}
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-[#f4eee6] text-[#555] hover:bg-[#e7dfd4]"
            >
              <X className="h-4 w-4" />
            </button>

            {/* MODAL HEADER */}
            <div className="border-b border-[#f0e8dc] pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[#1a3c36] px-3 py-1 text-xs font-mono font-bold text-white">
                  {selectedOrder.order_id}
                </span>
                <span
                  className={`rounded-full border px-3 py-0.5 text-xs font-bold ${getStatusBadge(
                    selectedOrder.order_status
                  )}`}
                >
                  {selectedOrder.order_status}
                </span>
                <span className="text-xs text-[#777]">
                  Placed on {new Date(selectedOrder.created_at).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-[#1d2925]">
                  Order Details &amp; Customer Frame Photos
                </h2>

                {/* STATUS CHANGER */}
                {!readOnlyStatus && <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-[#666]">Change Status:</label>
                  <select
                    value={statusDraft || selectedOrder.order_status}
                    onChange={(e) => {
                      setStatusDraft(e.target.value);
                      if (e.target.value !== "Cancelled" && e.target.value !== "CANCELLED") {
                        setCancellationReason("");
                      }
                    }}
                    disabled={updatingStatus}
                    className="h-9 rounded-xl border border-[#d8cfc3] bg-white px-3 text-xs font-bold text-[#1a3c36] outline-none focus:border-[#1a3c36]"
                  >
                    {["Pending", "Order Placed", "Processing", "Shipped", "Delivered", "Cancelled"].map(
                      (st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      )
                    )}
                  </select>
                  {(statusDraft === "Shipped" || statusDraft === "SHIPPED") && (
                    <div className="mt-3 grid w-full gap-2 sm:grid-cols-3">
                      <input type="datetime-local" value={shippingDetails.shipped_at} onChange={(e) => setShippingDetails((prev) => ({ ...prev, shipped_at: e.target.value }))} className="h-9 rounded-md border border-[#d8cfc3] px-2 text-xs outline-none focus:border-[#1a3c36]" aria-label="Shipped date and time" />
                      <input value={shippingDetails.docket_number} onChange={(e) => setShippingDetails((prev) => ({ ...prev, docket_number: e.target.value }))} placeholder="Docket number" className="h-9 rounded-md border border-[#d8cfc3] px-2 text-xs outline-none focus:border-[#1a3c36]" />
                      <input value={shippingDetails.courier_name} onChange={(e) => setShippingDetails((prev) => ({ ...prev, courier_name: e.target.value }))} placeholder="Courier name" className="h-9 rounded-md border border-[#d8cfc3] px-2 text-xs outline-none focus:border-[#1a3c36]" />
                      <button type="button" onClick={() => handleStatusChange(selectedOrder.order_id, statusDraft, shippingDetails)} disabled={updatingStatus || statusDraft === selectedOrder.order_status} className="rounded-md bg-[#1a3c36] px-3 py-2 text-xs font-bold text-white hover:bg-[#235048] disabled:opacity-50 sm:col-span-3">{updatingStatus ? "Updating..." : "Update Shipped Status"}</button>
                    </div>
                  )}
                  {(statusDraft === "Cancelled" || statusDraft === "CANCELLED") && (
                    <div className="mt-3 w-full">
                      <textarea
                        value={cancellationReason}
                        onChange={(e) => setCancellationReason(e.target.value)}
                        placeholder="Enter cancellation reason"
                        rows={3}
                        required
                        className="w-full rounded-md border border-[#d8cfc3] px-2 py-2 text-xs outline-none focus:border-[#1a3c36]"
                        aria-label="Cancellation reason"
                      />
                      <button type="button" onClick={() => handleStatusChange(selectedOrder.order_id, statusDraft)} disabled={updatingStatus || !cancellationReason.trim()} className="mt-2 rounded-md bg-[#1a3c36] px-3 py-2 text-xs font-bold text-white hover:bg-[#235048] disabled:opacity-50">{updatingStatus ? "Updating..." : "Update Cancelled Status"}</button>
                    </div>
                  )}
                  {statusDraft !== "Shipped" && statusDraft !== "SHIPPED" && statusDraft !== selectedOrder.order_status && (
                    statusDraft !== "Cancelled" && statusDraft !== "CANCELLED" &&
                    <button type="button" onClick={() => handleStatusChange(selectedOrder.order_id, statusDraft)} disabled={updatingStatus} className="rounded-md bg-[#1a3c36] px-3 py-2 text-xs font-bold text-white hover:bg-[#235048] disabled:opacity-50">Update</button>
                  )}
                </div>}
              </div>
            </div>

            {/* CUSTOMER & SHIPPING INFO GRID */}
            <div className="mt-5 grid grid-cols-1 gap-4 rounded-2xl border border-[#ebdcc8] bg-[#fdfbf8] p-4 text-xs sm:grid-cols-3">
              <div>
                <p className="font-bold uppercase tracking-wider text-[#b07838] flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Customer Details
                </p>
                <p className="mt-1.5 font-bold text-[#222]">{selectedOrder.customer_name}</p>
                <p className="text-[#666]">{selectedOrder.customer_phone}</p>
                <p className="text-[#666] truncate">{selectedOrder.customer_email || "No email"}</p>
              </div>

              <div>
                <p className="font-bold uppercase tracking-wider text-[#b07838] flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Shipping Address
                </p>
                <p className="mt-1.5 text-[#333] whitespace-pre-line">{selectedOrder.shipping_address}</p>
                <p className="text-[#666]">
                  {[selectedOrder.city, selectedOrder.state, selectedOrder.pincode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>

              <div>
                <p className="font-bold uppercase tracking-wider text-[#b07838] flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5" /> Payment &amp; Total
                </p>
                <p className="mt-1.5 text-[#333]">
                  Method: <strong className="text-[#1a3c36]">{selectedOrder.payment_method}</strong>
                </p>
                <p className="text-[#666]">Status: {selectedOrder.payment_status}</p>
                <p className="mt-1 text-sm font-black text-[#1a3c36]">
                  Total: ₹{selectedOrder.total_amount}
                </p>
              </div>
            </div>

            {/* ORDER ITEMS & CUSTOMIZED PHOTOS INSPECTION */}
            <div className="mt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#1d2925]">
                Ordered Items ({selectedOrder.items?.length || 0})
              </h3>

              <div className="mt-3 space-y-6">
                {(selectedOrder.items || []).map((item, idx) => {
                  let customPhotos = item.slot_photos || {};
                  if (typeof customPhotos === "string") {
                    try {
                      customPhotos = JSON.parse(customPhotos);
                    } catch {
                      customPhotos = {};
                    }
                  }

                  const isPhotoValue = (val) => {
                    if (!val) return false;
                    const str = typeof val === "string" ? val : val?.url || val?.preview || "";
                    if (!str || typeof str !== "string") return false;
                    const trimmed = str.trim();
                    return /^(https?:\/\/|\/|data:|blob:)/i.test(trimmed) || /\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(trimmed);
                  };

                  const slotEntries = Object.entries(customPhotos).filter(([, v]) => isPhotoValue(v));
                  const textEntries = Object.entries(customPhotos).filter(([, v]) => !isPhotoValue(v) && typeof v === "string" && v.trim());

                  return (
                    <div
                      key={item.id || idx}
                      className="rounded-3xl border border-[#e8dfd2] bg-white p-5 shadow-xs"
                    >
                      {/* ITEM SUMMARY ROW */}
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#f0e8dc] pb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f4efe8]">
                            {item.product_image || item.frame_image ? (
                              <img
                                src={item.product_image || item.frame_image}
                                alt={item.product_name}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <Package className="h-6 w-6 text-[#b9aa98]" />
                            )}
                          </div>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[#b07838]">
                              {item.category || "Photo Frame"}
                            </p>
                            <h4 className="text-base font-bold text-[#1d2925]">
                              {item.product_name}
                            </h4>
                            <p className="text-xs text-[#666]">
                              Size: <strong>{item.size || "Standard"}</strong> • Qty: <strong>{item.quantity}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-[#888]">Unit: ₹{item.price}</p>
                          <p className="text-base font-black text-[#1a3c36]">
                            Total: ₹{item.total_price || item.price * item.quantity}
                          </p>
                        </div>
                      </div>

                      {/* 1. WHOLE FRAME PHOTO (MERGED DESIGN) */}
                      {item.whole_frame_image && (
                        <div className="mt-5 rounded-2xl border border-[#ebdcc8] bg-[#fdfbf8] p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0e8dc] pb-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-[#1a3c36] flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4 text-[#b07838]" /> Whole Frame Photo (Merged Customer Frame)
                              </p>
                              <p className="text-[11px] text-[#777]">
                                Complete final composition of the frame with customer's photos placed
                              </p>
                            </div>

                            <a
                              href={item.whole_frame_image}
                              download={`Order-${selectedOrder.order_id}-WholeFrame.jpg`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a3c36] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#235048]"
                            >
                              <Download className="h-3.5 w-3.5" /> Download Whole Frame
                            </a>
                          </div>

                          <div className="mt-4 flex justify-center">
                            <div className="relative max-w-sm overflow-hidden rounded-xl border border-[#e8dfd2] bg-white p-2 shadow-md">
                              <img
                                src={item.whole_frame_image}
                                alt="Whole Frame Complete Preview"
                                className="max-h-72 w-auto object-contain rounded-lg"
                              />
                              <div className="mt-2 text-center text-[11px] font-semibold text-[#666]">
                                Final Assembled Frame
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. SEPARATELY UPLOADED CUSTOMER PHOTOS (INDIVIDUAL SLOTS) */}
                      <div className="mt-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0e8dc] pb-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#b07838] flex items-center gap-1.5">
                              <ImageIcon className="h-4 w-4" /> Customer Uploaded Photos ({slotEntries.length} Photos)
                            </p>
                            <span className="text-[11px] text-[#777]">
                              High-resolution files for lab printing
                            </span>
                          </div>

                          {slotEntries.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDownloadAllPhotos(slotEntries, selectedOrder.order_id || selectedOrder.id, item.product_name)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a3c36] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#235048]"
                              >
                                <Download className="h-3.5 w-3.5" /> Download All ({slotEntries.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintAlbumPhotos(slotEntries, selectedOrder.order_id || selectedOrder.id, item.product_name, selectedOrder)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-[#1a3c36] bg-white px-3.5 py-1.5 text-xs font-bold text-[#1a3c36] shadow-xs transition hover:bg-[#f4efe8]"
                              >
                                <Printer className="h-3.5 w-3.5" /> Print All Photos
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Customer text custom details (e.g. Cover title, Dedication note) */}
                        {textEntries.length > 0 && (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {textEntries.map(([key, val]) => (
                              <div key={key} className="rounded-xl border border-[#e8dfd2] bg-[#faf8f5] p-2.5 text-xs">
                                <span className="font-bold text-[#b07838] uppercase tracking-wider text-[10px] block">
                                  {key.replace(/([A-Z])/g, " $1")}
                                </span>
                                <span className="mt-1 text-[#2d2d2d] font-medium">{val}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {slotEntries.length === 0 ? (
                          <p className="mt-2 rounded-xl bg-[#faf8f5] p-3 text-xs text-[#888]">
                            Customer did not attach individual photos for this item.
                          </p>
                        ) : (
                          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 max-h-96 overflow-y-auto p-1 scrollbar-thin">
                            {slotEntries.map(([slotId, photoEntry], pIdx) => {
                              const photoUrl = typeof photoEntry === "string" ? photoEntry : photoEntry?.url || photoEntry?.preview || "";
                              const resolved = imageUrl(photoUrl);
                              return (
                                <div
                                  key={slotId || pIdx}
                                  className="group relative overflow-hidden rounded-2xl border border-[#e8dfd2] bg-[#faf8f5] p-2 transition hover:border-[#d4a553]"
                                >
                                  <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-[#eee7de]">
                                    <img
                                      src={resolved}
                                      alt={`Slot ${pIdx + 1}`}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>

                                  <div className="mt-2 flex items-center justify-between">
                                    <span className="truncate text-[11px] font-bold text-[#333]" title={slotId}>
                                      {slotId.startsWith("Photo") ? slotId : `Pos ${pIdx + 1} (${slotId})`}
                                    </span>

                                    <a
                                      href={resolved}
                                      download={`Order-${selectedOrder.order_id || selectedOrder.id}-${slotId || `Photo-${pIdx + 1}`}.jpg`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1a3c36] text-white shadow transition hover:bg-[#235048]"
                                      title="Download individual high-resolution photo"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="mt-6 flex justify-end border-t border-[#f0e8dc] pt-4">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl bg-[#1a3c36] px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-[#235048]"
              >
                Close Order Details
              </button>
            </div>
          </div>
        </div>
      )}

      {showEnquiryPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-enquiry-title"
          onMouseDown={(event) => event.target === event.currentTarget && setShowEnquiryPopup(false)}
        >
          <form onSubmit={handleEnquirySubmit} className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-[#e8dfd2] bg-white p-5 shadow-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-[#f0e8dc] pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#b07838]">Enquiry to order</p>
                <h2 id="new-enquiry-title" className="mt-1 text-xl font-black text-[#1a3c36]">{editingEnquiryId ? "Edit Enquiry" : "Add New Order"}</h2>
                <p className="mt-1 text-xs text-[#66736e]">Capture the customer requirements and follow-up details.</p>
              </div>
              <button type="button" onClick={() => setShowEnquiryPopup(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4eee6] text-[#555] hover:bg-[#e7dfd4]" aria-label="Close new order popup">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-5 text-xs">
              <section>
                <h3 className="mb-3 font-bold uppercase tracking-wider text-[#b07838]">Customer Details</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[["enquiryId", "Enquiry ID"], ["customerName", "Customer Name"], ["mobileNumber", "Mobile Number"], ["whatsappNumber", "WhatsApp Number"], ["email", "Email"]].map(([name, label]) => (
                    <label key={name} className={name === "customerName" ? "lg:col-span-2" : ""}>
                      <span className="mb-1.5 block font-semibold text-[#66736e]">{label}</span>
                      <input name={name} value={name === "enquiryId" && !editingEnquiryId ? "Auto-generated on save" : enquiry[name]} onChange={name === "enquiryId" ? undefined : handleEnquiryChange} readOnly={name === "enquiryId"} type={name === "email" ? "email" : "text"} className={`h-10 w-full rounded-lg border border-[#d8cfc3] px-3 outline-none focus:border-[#1a3c36] ${name === "enquiryId" ? "cursor-not-allowed bg-[#f5f2ed] text-[#66736e]" : ""}`} />
                    </label>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-3 font-bold uppercase tracking-wider text-[#b07838]">Enquiry Details</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label><span className="mb-1.5 block font-semibold text-[#66736e]">Enquiry Type</span><select name="enquiryType" value={enquiry.enquiryType} onChange={handleEnquiryChange} disabled={loadingEnquiryCategories} className="h-10 w-full rounded-lg border border-[#d8cfc3] bg-white px-3 outline-none focus:border-[#1a3c36] disabled:opacity-60"><option value="">{loadingEnquiryCategories ? "Loading types..." : "Select enquiry type"}</option>{!enquiryTypes.includes(enquiry.enquiryType) && enquiry.enquiryType && <option value={enquiry.enquiryType}>{enquiry.enquiryType}</option>}{enquiryTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                  <label><span className="mb-1.5 block font-semibold text-[#66736e]">Product Category</span><select name="productCategory" value={enquiry.productCategory} onChange={handleEnquiryChange} disabled={loadingEnquiryCategories} className="h-10 w-full rounded-lg border border-[#d8cfc3] bg-white px-3 outline-none focus:border-[#1a3c36] disabled:opacity-60"><option value="">{loadingEnquiryCategories ? "Loading categories..." : "Select category"}</option>{!enquiryProductCategories.some((category) => category.category_name === enquiry.productCategory) && enquiry.productCategory && <option value={enquiry.productCategory}>{enquiry.productCategory}</option>}{enquiryProductCategories.map((category) => <option key={category.category_id || category.id || category.category_name} value={category.category_name}>{category.category_name}</option>)}</select></label>
                  <label><span className="mb-1.5 block font-semibold text-[#66736e]">Product Name</span><select name="productName" value={enquiry.productName} onChange={handleEnquiryChange} disabled={loadingEnquiryCategories || !enquiry.productCategory} className="h-10 w-full rounded-lg border border-[#d8cfc3] bg-white px-3 outline-none focus:border-[#1a3c36] disabled:opacity-60"><option value="">{loadingEnquiryCategories ? "Loading products..." : "Select product"}</option>{!enquiryCategoryProducts.some((product) => product.product_name === enquiry.productName) && enquiry.productName && <option value={enquiry.productName}>{enquiry.productName}</option>}{enquiryCategoryProducts.map((product) => <option key={product.id || product.uuid || product.product_name} value={product.product_name}>{product.product_name}</option>)}</select></label>
                  <label><span className="mb-1.5 block font-semibold text-[#66736e]">Quantity</span><input name="quantity" value={enquiry.quantity} onChange={handleEnquiryChange} type="number" min="1" className="h-10 w-full rounded-lg border border-[#d8cfc3] px-3 outline-none focus:border-[#1a3c36]" /></label>
                  <label><span className="mb-1.5 block font-semibold text-[#66736e]">Budget (₹)</span><input name="budget" value={enquiry.budget} onChange={handleEnquiryChange} type="number" min="0" className="h-10 w-full rounded-lg border border-[#d8cfc3] px-3 outline-none focus:border-[#1a3c36]" /></label>
                  <label className="sm:col-span-2 lg:col-span-3"><span className="mb-1.5 block font-semibold text-[#66736e]">Message</span><textarea name="message" value={enquiry.message} onChange={handleEnquiryChange} rows="2" className="w-full resize-none rounded-lg border border-[#d8cfc3] px-3 py-2 outline-none focus:border-[#1a3c36]" /></label>
                </div>
                {selectedEnquiryProduct && (
                  <div className="mt-4 grid gap-4 rounded-xl border border-[#e8dfd2] bg-[#faf8f4] p-4 md:grid-cols-[180px_1fr]">
                    <div className="relative flex min-h-36 items-center justify-center overflow-hidden rounded-lg border border-[#e8dfd2] bg-white">
                      {imageUrl(selectedEnquiryProduct.frame_data?.frame_image || selectedEnquiryProduct.product_images?.[0]) ? <div className="relative aspect-[3/4] h-44 w-full max-w-36 overflow-hidden"><img src={imageUrl(selectedEnquiryProduct.frame_data?.frame_image || selectedEnquiryProduct.product_images?.[0])} alt={selectedEnquiryProduct.product_name} className="absolute inset-0 h-full w-full object-contain" />{(selectedEnquiryProduct.frame_data?.photo_slots || []).map((slot, slotIndex) => { const photoIndex = productPhotoEntries(selectedEnquiryProduct.slot_photos).findIndex(([slotId]) => slotId === slot.id); const photo = productPhotoEntries(selectedEnquiryProduct.slot_photos).find(([slotId]) => slotId === slot.id)?.[1]; const appliedPhoto = enquiryUploadedPhotos[slotIndex] || enquiryReplacedPhotos[photoIndex] || photo; return appliedPhoto ? <img key={slot.id} src={appliedPhoto} alt={slot.name || "Uploaded frame photo"} className="absolute object-cover" style={{ top: slot.top, left: slot.left, width: slot.width, height: slot.height, borderRadius: slot.shape === "circle" ? "9999px" : undefined }} /> : null; })}</div> : <Package className="h-8 w-8 text-[#b7beb9]" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#1a3c36]">{selectedEnquiryProduct.product_name}</p>
                      <p className="mt-1 text-xs text-[#66736e]">{selectedEnquiryProduct.description || "No product description available."}</p>
                      <div className="mt-3 flex items-center justify-between gap-2"><p className="text-xs font-semibold text-[#66736e]">Frame upload photos</p><label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#1a3c36] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#235048]"><Upload className="h-3.5 w-3.5" /> Upload Photos<input type="file" accept="image/*" multiple onChange={handleEnquiryPhotoUpload} className="hidden" /></label></div>
                      {[...productPhotos(selectedEnquiryProduct.slot_photos), ...enquiryUploadedPhotos].length > 0 ? <div className="mt-2 flex flex-wrap gap-2">{[...productPhotos(selectedEnquiryProduct.slot_photos), ...enquiryUploadedPhotos].map((photo, index) => <div key={`${photo}-${index}`} className="group relative"><img src={enquiryReplacedPhotos[index] || photo} alt={`Frame upload ${index + 1}`} className="h-14 w-14 rounded-md border border-[#d8cfc3] object-cover" />{index < productPhotos(selectedEnquiryProduct.slot_photos).length && <label className="absolute inset-x-0 bottom-0 cursor-pointer bg-black/65 py-1 text-center text-[9px] font-bold text-white opacity-0 transition group-hover:opacity-100">Replace<input type="file" accept="image/*" onChange={(event) => handleReplaceEnquiryPhoto(event, index)} className="hidden" /></label>}</div>)}</div> : <p className="mt-1 text-xs text-[#8a918d]">No uploaded frame photos.</p>}
                    </div>
                  </div>
                )}
              </section>

              <section>
                <h3 className="mb-3 font-bold uppercase tracking-wider text-[#b07838]">Product Requirements</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label><span className="mb-1.5 block font-semibold text-[#66736e]">Size</span><select name="size" value={enquiry.size} onChange={handleEnquiryChange} disabled={!selectedEnquiryProduct} className="h-10 w-full rounded-lg border border-[#d8cfc3] bg-white px-3 outline-none focus:border-[#1a3c36] disabled:opacity-60"><option value="">{selectedEnquiryProduct ? "Select size" : "Select product first"}</option>{!selectedEnquiryProduct?.size_variants?.some((variant) => variant.size === enquiry.size) && enquiry.size && <option value={enquiry.size}>{enquiry.size}</option>}{(selectedEnquiryProduct?.size_variants || []).map((variant) => <option key={variant.size} value={variant.size}>{variant.size}{variant.offer_price ? ` - ₹${variant.offer_price}` : ""}</option>)}</select></label>
                  <label><span className="mb-1.5 block font-semibold text-[#66736e]">Frame Type</span><select name="frameType" value={enquiry.frameType} onChange={handleEnquiryChange} disabled={!selectedEnquiryProduct} className="h-10 w-full rounded-lg border border-[#d8cfc3] bg-white px-3 outline-none focus:border-[#1a3c36] disabled:opacity-60"><option value="">{selectedEnquiryProduct ? "Select frame type" : "Select product first"}</option>{selectedEnquiryProduct?.frame_data?.frame_name && <option value={selectedEnquiryProduct.frame_data.frame_name}>{selectedEnquiryProduct.frame_data.frame_name}</option>}{!selectedEnquiryProduct?.frame_data?.frame_name && enquiry.frameType && <option value={enquiry.frameType}>{enquiry.frameType}</option>}</select></label>
                  <label className="lg:col-span-2"><span className="mb-1.5 block font-semibold text-[#66736e]">Customization</span><input name="customization" value={enquiry.customization} onChange={handleEnquiryChange} className="h-10 w-full rounded-lg border border-[#d8cfc3] px-3 outline-none focus:border-[#1a3c36]" /></label>
                </div>
              </section>

              <section>
                <h3 className="mb-3 font-bold uppercase tracking-wider text-[#b07838]">Status &amp; Follow-up</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label><span className="mb-1.5 block font-semibold text-[#66736e]">Status</span><select name="status" value={enquiry.status} onChange={handleEnquiryChange} className="h-10 w-full rounded-lg border border-[#d8cfc3] bg-white px-3 font-semibold outline-none focus:border-[#1a3c36]"><option>New</option><option>Contacted</option><option>Quote Sent</option><option>Confirmed</option><option>Converted</option><option>Closed</option></select></label>
                  <label><span className="mb-1.5 block font-semibold text-[#66736e]">Priority</span><select name="priority" value={enquiry.priority} onChange={handleEnquiryChange} className="h-10 w-full rounded-lg border border-[#d8cfc3] bg-white px-3 font-semibold outline-none focus:border-[#1a3c36]"><option>Low</option><option>Medium</option><option>High</option></select></label>
                  <label><span className="mb-1.5 block font-semibold text-[#66736e]">Source</span><select name="source" value={enquiry.source} onChange={handleEnquiryChange} className="h-10 w-full rounded-lg border border-[#d8cfc3] bg-white px-3 font-semibold outline-none focus:border-[#1a3c36]"><option>Walk-in</option><option>WhatsApp</option><option>Instagram</option><option>Website</option><option>Phone Call</option></select></label>
                  <label><span className="mb-1.5 block font-semibold text-[#66736e]">Assigned To</span><input name="assignedTo" value={enquiry.assignedTo} onChange={handleEnquiryChange} className="h-10 w-full rounded-lg border border-[#d8cfc3] px-3 outline-none focus:border-[#1a3c36]" /></label>
                  <label className="sm:col-span-2"><span className="mb-1.5 block font-semibold text-[#66736e]">Follow-up Notes</span><textarea name="followUpNotes" value={enquiry.followUpNotes} onChange={handleEnquiryChange} rows="2" className="w-full resize-none rounded-lg border border-[#d8cfc3] px-3 py-2 outline-none focus:border-[#1a3c36]" /></label>
                  <label><span className="mb-1.5 block font-semibold text-[#66736e]">Next Follow-up Date</span><input name="followUpDate" value={enquiry.followUpDate} onChange={handleEnquiryChange} type="date" className="h-10 w-full rounded-lg border border-[#d8cfc3] px-3 outline-none focus:border-[#1a3c36]" /></label>
                  <label><span className="mb-1.5 block font-semibold text-[#66736e]">Quotation Amount (₹)</span><input name="quotationAmount" value={enquiry.quotationAmount} onChange={handleEnquiryChange} type="number" min="0" className="h-10 w-full rounded-lg border border-[#d8cfc3] px-3 outline-none focus:border-[#1a3c36]" /></label>
                  <label><span className="mb-1.5 block font-semibold text-[#66736e]">Created Date</span><input name="createdAt" value={enquiry.createdAt} onChange={handleEnquiryChange} type="date" className="h-10 w-full rounded-lg border border-[#d8cfc3] px-3 outline-none focus:border-[#1a3c36]" /></label>
                  <label><span className="mb-1.5 block font-semibold text-[#66736e]">Updated Date</span><input name="updatedAt" value={enquiry.updatedAt} onChange={handleEnquiryChange} type="date" className="h-10 w-full rounded-lg border border-[#d8cfc3] px-3 outline-none focus:border-[#1a3c36]" /></label>
                </div>
              </section>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-[#f0e8dc] pt-4">
              <button type="button" onClick={() => setShowEnquiryPopup(false)} className="rounded-xl border border-[#d8cfc3] px-4 py-2.5 text-xs font-bold text-[#66736e] hover:bg-[#faf8f4]">Cancel</button>
              <button type="submit" className="rounded-xl bg-[#1a3c36] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#235048]">{editingEnquiryId ? "Update Enquiry" : "Save Enquiry"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
