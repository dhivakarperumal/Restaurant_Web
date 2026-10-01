import { useEffect, useState, useMemo } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  MapPin,
  Package,
  Phone,
  Printer,
  Sparkles,
  Truck,
  User,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { API_URL } from "../../api";

const trackingStatuses = [
  "Order Placed",
  "Confirmed",
  "Processing",
  "Packing",
  "Ready",
  "Shipped",
  "Out for Delivery",
  "Delivered",
];

const normalizeStatus = (status) => {
  const normalized = String(status || "").trim().toUpperCase().replace(/_/g, " ");
  if (normalized === "PENDING" || normalized === "NEW" || normalized === "NEW ORDER") {
    return "ORDER PLACED";
  }
  return normalized;
};

const statusColorMap = {
  DELIVERED: "bg-[#e1f2e8] text-[#1e6f43] border-[#c3e6d1]",
  "OUT FOR DELIVERY": "bg-[#e3edf7] text-[#245b85] border-[#b8daff]",
  SHIPPED: "bg-[#e3edf7] text-[#245b85] border-[#b8daff]",
  PROCESSING: "bg-[#fef3c7] text-[#92400e] border-[#fde68a]",
  PACKING: "bg-[#fef3c7] text-[#92400e] border-[#fde68a]",
  READY: "bg-[#e8f5e9] text-[#2e7d32] border-[#c8e6c9]",
  CONFIRMED: "bg-[#e8f5e9] text-[#2e7d32] border-[#c8e6c9]",
  CANCELLED: "bg-[#fae5e2] text-[#a43e32] border-[#f5c6cb]",
  "ON HOLD": "bg-[#fff3e0] text-[#b26a00] border-[#ffe0b2]",
  RETURNED: "bg-[#fae5e2] text-[#a43e32] border-[#f5c6cb]",
  "ORDER PLACED": "bg-[#fff3e0] text-[#b26a00] border-[#ffe0b2]",
};

const resolveImageUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (/^(data:|blob:|https?:\/\/)/i.test(trimmed)) return trimmed;
  const baseUrl = API_URL.replace(/\/api\/?$/, "");
  return `${baseUrl}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
};

const extractCustomData = (slotPhotosRaw) => {
  if (!slotPhotosRaw) return { photos: [], textDetails: [] };

  let data = slotPhotosRaw;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      // It might just be a direct image URL string
      if (/^(http|\/|data:)/i.test(data.trim())) {
        return {
          photos: [{ label: "Custom Photo", url: resolveImageUrl(data.trim()) }],
          textDetails: [],
        };
      }
      return { photos: [], textDetails: [{ label: "Custom Note", text: data }] };
    }
  }

  const photos = [];
  const textDetails = [];

  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      if (typeof item === "string") {
        photos.push({
          label: `Photo ${index + 1}`,
          url: resolveImageUrl(item),
        });
      } else if (item && typeof item === "object") {
        const url = item.url || item.image || item.src;
        if (url) {
          photos.push({
            label: item.label || item.name || `Photo ${index + 1}`,
            url: resolveImageUrl(url),
          });
        }
      }
    });
  } else if (data && typeof data === "object") {
    Object.entries(data).forEach(([key, val]) => {
      if (!val) return;
      if (typeof val === "string") {
        if (/^(http|\/|data:|blob:)/i.test(val.trim()) || /\.(jpe?g|png|webp|gif|svg)$/i.test(val.trim())) {
          const friendlyKey = key
            .replace(/[_-]/g, " ")
            .replace(/([A-Z])/g, " $1")
            .trim();
          photos.push({
            label: friendlyKey ? friendlyKey.charAt(0).toUpperCase() + friendlyKey.slice(1) : "Custom Photo",
            url: resolveImageUrl(val),
          });
        } else {
          const friendlyKey = key
            .replace(/[_-]/g, " ")
            .replace(/([A-Z])/g, " $1")
            .trim();
          textDetails.push({
            label: friendlyKey ? friendlyKey.charAt(0).toUpperCase() + friendlyKey.slice(1) : "Note",
            text: val,
          });
        }
      } else if (typeof val === "object" && (val.url || val.image)) {
        photos.push({
          label: key,
          url: resolveImageUrl(val.url || val.image),
        });
      }
    });
  }

  return { photos, textDetails };
};

const OrderDetailsModal = ({ order: initialOrder, orderId, isOpen, onClose }) => {
  const [orderDetails, setOrderDetails] = useState(initialOrder || null);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState(null);

  const activeOrderId = orderId || initialOrder?.order_id || initialOrder?.id;

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (lightboxImage) {
          setLightboxImage(null);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, lightboxImage, onClose]);

  // Fetch full order data on mount or order change
  useEffect(() => {
    if (!isOpen || !activeOrderId) return;

    let isMounted = true;
    setLoading(true);

    api
      .get(`/orders/${activeOrderId}`)
      .then((res) => {
        if (isMounted) {
          const data = res.data?.data;
          if (data) {
            setOrderDetails(data);
          } else if (initialOrder) {
            setOrderDetails(initialOrder);
          }
        }
      })
      .catch((err) => {
        console.warn("Could not fetch full order details:", err);
        if (isMounted && initialOrder) {
          setOrderDetails(initialOrder);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeOrderId, initialOrder]);

  if (!isOpen) return null;

  const currentOrder = orderDetails || initialOrder || {};
  const currentStatus = currentOrder.order_status || "Processing";
  const normalizedStatus = normalizeStatus(currentStatus);
  const isCancelled = ["CANCELLED", "RETURNED"].includes(normalizedStatus);
  const statusIndex = trackingStatuses.findIndex(
    (status) => normalizeStatus(status) === normalizedStatus,
  );
  const statusInfo = {
    badge: statusColorMap[normalizedStatus] || "bg-[#f3eee7] text-[#7b6a58] border-[#dfd6ca]",
    stepIndex: statusIndex >= 0 ? statusIndex : 0,
  };

  const rawDate = currentOrder.created_at || currentOrder.order_date;
  const formattedDate = rawDate
    ? new Date(rawDate).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Recent";

  const formattedTime = rawDate
    ? new Date(rawDate).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const items = currentOrder.items || [];
  const itemsTotal = items.reduce(
    (sum, item) =>
      sum +
      Number(
        item.total_price || Number(item.price || 0) * Number(item.quantity || 1)
      ),
    0
  );

  const grandTotal =
    Number(currentOrder.total_amount) || itemsTotal || 0;

  const copyOrderId = () => {
    if (currentOrder.order_id) {
      navigator.clipboard.writeText(currentOrder.order_id);
      toast.success("Order ID copied to clipboard!");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Steps for timeline
  const trackingSteps = [
    { title: "Order Placed", desc: formattedDate },
    { title: "Confirmed", desc: "Order confirmed" },
    { title: "Processing", desc: "Crafting & framing" },
    { title: "Packing", desc: "Being packed securely" },
    { title: "Ready", desc: "Ready for dispatch" },
    {
      title: "Shipped",
      desc: currentOrder.shipped_at
        ? new Date(currentOrder.shipped_at).toLocaleDateString("en-IN")
        : "Courier transit",
    },
    { title: "Out for Delivery", desc: "Arriving today" },
    { title: "Delivered", desc: "Safe doorstep delivery" },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-5 md:p-8"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="relative flex flex-col my-auto max-h-[92vh] w-full max-w-4xl rounded-2xl border border-[#e8dfd2] bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* MODAL HEADER */}
          <div className="flex items-start justify-between border-b border-[#eee8df] bg-[#fcfbf9] px-6 py-5">
            <div className="space-y-1.5 min-w-0 pr-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#b87840]">
                  Order Details
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusInfo.badge}`}
                >
                  {currentStatus}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-[#1b2925] tracking-tight truncate">
                  #{currentOrder.order_id || activeOrderId}
                </h3>
                <button
                  type="button"
                  onClick={copyOrderId}
                  title="Copy Order ID"
                  className="inline-flex items-center gap-1 rounded-md border border-[#dfd6ca] bg-white px-2 py-0.5 text-[11px] font-medium text-[#68736e] hover:bg-[#f4eee6] hover:text-[#1b2925] transition"
                >
                  <Copy size={11} />
                  Copy
                </button>
              </div>

              <p className="flex items-center gap-2 text-xs text-[#7b8580]">
                <Calendar size={13} className="text-[#b87840]" />
                <span>
                  {formattedDate} {formattedTime && `at ${formattedTime}`}
                </span>
                <span>•</span>
                <span>
                  {items.length || currentOrder.item_count || 1}{" "}
                  {(items.length || currentOrder.item_count || 1) === 1
                    ? "item"
                    : "items"}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e8dfd2] bg-white text-[#68736e] hover:bg-[#fae5e2] hover:text-[#c24130] hover:border-[#f5c6cb] transition"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          {/* SCROLLABLE BODY */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">
            
            {/* 1. ORDER PROGRESS TRACKER */}
            {!isCancelled ? (
              <div className="rounded-xl border border-[#eee8df] bg-[#faf8f5] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#b87840] flex items-center gap-1.5">
                    <Truck size={14} /> Order Journey
                  </h4>
                  {currentOrder.courier_name && (
                    <span className="text-xs font-medium text-[#4a5550]">
                      Via <strong>{currentOrder.courier_name}</strong>
                      {currentOrder.docket_number && (
                        <> (Docket: <code className="bg-white px-1.5 py-0.5 rounded border text-[#1b2925]">{currentOrder.docket_number}</code>)</>
                      )}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                  {trackingSteps.map((step, idx) => {
                    const isCompleted = idx <= statusInfo.stepIndex;
                    const isCurrent = idx === statusInfo.stepIndex;

                    return (
                      <div
                        key={step.title}
                        className={`relative rounded-lg p-3 transition-all ${
                          isCurrent
                            ? "bg-white border-2 border-[#b87840] shadow-xs"
                            : isCompleted
                            ? "bg-white border border-[#c3e6d1]"
                            : "bg-[#f4efe8]/50 border border-transparent opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                              isCompleted
                                ? "bg-[#28724a] text-white"
                                : "bg-[#ddd6ce] text-[#68736e]"
                            }`}
                          >
                            {isCompleted ? <CheckCircle2 size={12} /> : idx + 1}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              isCurrent
                                ? "text-[#b87840]"
                                : isCompleted
                                ? "text-[#1b2925]"
                                : "text-[#87908b]"
                            }`}
                          >
                            {step.title}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#7b8580] truncate">
                          {step.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#f5c6cb] bg-[#fae5e2]/50 p-4 flex items-start gap-3">
                <AlertCircle className="text-[#a43e32] shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-sm font-semibold text-[#a43e32]">
                    Order Cancelled
                  </h4>
                  <p className="text-xs text-[#7b4038] mt-0.5">
                    {currentOrder.notes
                      ? `Reason: ${currentOrder.notes}`
                      : "This order was cancelled."}
                  </p>
                </div>
              </div>
            )}

            {/* 2. ORDERED ITEMS LIST */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#b87840] flex items-center gap-1.5">
                  <Package size={15} /> Purchased Items (
                  {loading && items.length === 0 ? "Loading..." : items.length || currentOrder.item_count || 1}
                  )
                </h4>
              </div>

              {loading && items.length === 0 ? (
                <div className="space-y-3 py-4">
                  {[1, 2].map((n) => (
                    <div
                      key={n}
                      className="animate-pulse flex items-center gap-4 rounded-xl border border-[#eee8df] bg-[#faf8f5] p-4"
                    >
                      <div className="h-16 w-16 bg-[#e8dfd2] rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-[#e8dfd2] rounded w-1/3" />
                        <div className="h-3 bg-[#e8dfd2] rounded w-1/4" />
                      </div>
                      <div className="h-4 bg-[#e8dfd2] rounded w-16" />
                    </div>
                  ))}
                </div>
              ) : items.length > 0 ? (
                <div className="space-y-4">
                  {items.map((item, index) => {
                    const itemImage = resolveImageUrl(
                      item.product_image ||
                        item.frame_image ||
                        item.image ||
                        (Array.isArray(item.product_images) && item.product_images[0])
                    );
                    const wholeFrame = resolveImageUrl(
                      item.whole_frame_image || item.customized_preview_image
                    );
                    const { photos, textDetails } = extractCustomData(
                      item.slot_photos
                    );
                    const itemPrice = Number(item.price || 0);
                    const itemQty = Number(item.quantity || 1);
                    const itemTotal = Number(item.total_price || itemPrice * itemQty);

                    return (
                      <div
                        key={item.id || item.product_id || index}
                        className="rounded-xl border border-[#e8dfd2] bg-white p-4 sm:p-5 shadow-2xs hover:border-[#d6c7b2] transition"
                      >
                        {/* Main Item Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e8dfd2] bg-[#fcfbf9]">
                              {itemImage ? (
                                <img
                                  src={itemImage}
                                  alt={item.product_name || "Product"}
                                  className="h-full w-full object-contain cursor-pointer hover:scale-105 transition"
                                  onClick={() =>
                                    setLightboxImage({
                                      url: itemImage,
                                      title: item.product_name,
                                    })
                                  }
                                />
                              ) : (
                                <Package className="h-7 w-7 text-[#b7beb9]" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <h5 className="font-semibold text-base text-[#1b2925] truncate">
                                {item.product_name || "Custom Frame"}
                              </h5>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#7b8580]">
                                {item.category && (
                                  <span className="rounded bg-[#f4eee6] px-2 py-0.5 text-[#b87840] font-medium">
                                    {item.category}
                                  </span>
                                )}
                                {item.size && (
                                  <span>
                                    Size: <strong>{item.size}</strong>
                                  </span>
                                )}
                                <span>•</span>
                                <span>
                                  Qty: <strong>{itemQty}</strong>
                                </span>
                                <span>•</span>
                                <span>
                                  ₹{itemPrice.toLocaleString("en-IN")} each
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right sm:self-center">
                            <p className="text-xs text-[#7b8580]">Total</p>
                            <p className="text-base font-bold text-[#1b2925]">
                              ₹{itemTotal.toLocaleString("en-IN")}
                            </p>
                          </div>
                        </div>

                        {/* Whole Frame Rendered Preview (if customized) */}
                        {wholeFrame && (
                          <div className="mt-4 rounded-xl border border-[#dfd6ca] bg-[#faf8f5] p-3.5">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1b2925]">
                                <Sparkles size={14} className="text-[#b87840]" />
                                Final Assembled Frame Preview
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLightboxImage({
                                      url: wholeFrame,
                                      title: `${item.product_name} - Final Frame Preview`,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded bg-white px-2.5 py-1 text-xs font-medium text-[#1b2925] border border-[#dfd6ca] hover:bg-[#f4eee6] transition cursor-pointer"
                                >
                                  <Eye size={12} /> View
                                </button>
                                <a
                                  href={wholeFrame}
                                  download={`Order-${currentOrder.order_id}-Frame.jpg`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded bg-[#1b2925] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#b87840] transition"
                                >
                                  <Download size={12} /> Download
                                </a>
                              </div>
                            </div>
                            <div className="flex justify-center bg-white p-2 rounded-lg border border-[#e8dfd2]">
                              <img
                                src={wholeFrame}
                                alt="Final frame preview"
                                className="max-h-48 rounded object-contain cursor-pointer"
                                onClick={() =>
                                  setLightboxImage({
                                    url: wholeFrame,
                                    title: `${item.product_name} - Final Frame Preview`,
                                  })
                                }
                              />
                            </div>
                          </div>
                        )}

                        {/* Uploaded Customer Photos */}
                        {photos.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[#f0e8dc]">
                            <p className="text-xs font-semibold text-[#68736e] mb-2 flex items-center gap-1">
                              <ImageIcon size={13} className="text-[#b87840]" />
                              Uploaded Photos ({photos.length})
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                              {photos.map((photo, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="group relative rounded-lg border border-[#e8dfd2] bg-[#fcfbf9] p-1.5 hover:border-[#b87840] transition overflow-hidden"
                                >
                                  <div className="aspect-square overflow-hidden rounded bg-white">
                                    <img
                                      src={photo.url}
                                      alt={photo.label}
                                      className="h-full w-full object-cover group-hover:scale-105 transition"
                                    />
                                  </div>
                                  <p className="mt-1 text-[10px] font-medium text-[#7b8580] truncate text-center">
                                    {photo.label}
                                  </p>
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setLightboxImage({
                                          url: photo.url,
                                          title: `${item.product_name} - ${photo.label}`,
                                        })
                                      }
                                      className="p-1 rounded bg-white text-[#1b2925] hover:bg-[#f4eee6] cursor-pointer"
                                      title="View photo"
                                    >
                                      <Eye size={12} />
                                    </button>
                                    <a
                                      href={photo.url}
                                      download={`Order-${currentOrder.order_id}-${photo.label}.jpg`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1 rounded bg-white text-[#1b2925] hover:bg-[#f4eee6]"
                                      title="Download photo"
                                    >
                                      <Download size={12} />
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Text Customizations / Note */}
                        {textDetails.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-[#f0e8dc] space-y-1">
                            {textDetails.map((td, tdIdx) => (
                              <p key={tdIdx} className="text-xs text-[#4a5550]">
                                <strong className="text-[#1b2925]">{td.label}:</strong> {td.text}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-[#eee8df] bg-[#faf8f5] p-5 text-center text-xs text-[#7b8580]">
                  Item details could not be retrieved.
                </div>
              )}
            </div>

            {/* 3. TWO-COLUMN DETAILS: SHIPPING & PAYMENT */}
            <div className="grid gap-5 sm:grid-cols-2">
              
              {/* Delivery Address Card */}
              <div className="rounded-xl border border-[#e8dfd2] bg-[#faf8f5] p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#b87840] flex items-center gap-1.5">
                  <MapPin size={15} /> Delivery Address
                </h4>

                <div className="text-xs space-y-1 text-[#4a5550]">
                  <p className="text-sm font-bold text-[#1b2925]">
                    {currentOrder.customer_name || "Customer"}
                  </p>
                  {currentOrder.customer_phone && (
                    <p className="flex items-center gap-1.5 font-medium text-[#1b2925]">
                      <Phone size={12} className="text-[#7b8580]" />
                      {currentOrder.customer_phone}
                    </p>
                  )}
                  <p className="mt-2 leading-relaxed text-[#5a6661]">
                    {currentOrder.shipping_address || "Standard Shipping"}
                  </p>
                  <p className="font-medium text-[#5a6661]">
                    {[
                      currentOrder.city,
                      currentOrder.district,
                      currentOrder.state,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                    {currentOrder.pincode ? ` - ${currentOrder.pincode}` : ""}
                  </p>
                </div>
              </div>

              {/* Payment & Order Summary Card */}
              <div className="rounded-xl border border-[#e8dfd2] bg-[#faf8f5] p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#b87840] flex items-center gap-1.5">
                  <FileText size={15} /> Payment & Billing
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-[#5a6661]">
                    <span>Payment Method:</span>
                    <strong className="text-[#1b2925]">
                      {currentOrder.payment_method || "Cash on Delivery"}
                    </strong>
                  </div>

                  <div className="flex justify-between text-[#5a6661]">
                    <span>Payment Status:</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                        (currentOrder.payment_status || "").toLowerCase() === "paid" ||
                        (currentOrder.payment_status || "").toLowerCase() === "completed"
                          ? "bg-[#e1f2e8] text-[#1e6f43]"
                          : "bg-[#fff3e0] text-[#b26a00]"
                      }`}
                    >
                      {currentOrder.payment_status || "Pending"}
                    </span>
                  </div>

                  {currentOrder.billing_type && (
                    <div className="flex justify-between text-[#5a6661]">
                      <span>Order Type:</span>
                      <span className="text-[#1b2925]">
                        {currentOrder.billing_type}
                      </span>
                    </div>
                  )}

                  <div className="border-t border-[#e8dfd2] pt-2 space-y-1.5">
                    <div className="flex justify-between text-[#5a6661]">
                      <span>Items Subtotal:</span>
                      <span>₹{(itemsTotal || grandTotal).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-[#5a6661]">
                      <span>Delivery / Shipping:</span>
                      <span className="text-[#28724a] font-medium">FREE</span>
                    </div>
                    <div className="flex justify-between border-t border-[#dfd6ca] pt-2 text-sm font-bold text-[#1b2925]">
                      <span>Grand Total:</span>
                      <span className="text-base text-[#1b2925]">
                        ₹{grandTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. ORDER NOTES (if any) */}
            {currentOrder.notes && (
              <div className="rounded-xl border border-[#e8dfd2] bg-[#fcfbf9] p-4 text-xs text-[#5a6661]">
                <strong className="text-[#1b2925]">Order Note:</strong> {currentOrder.notes}
              </div>
            )}
          </div>

          {/* MODAL FOOTER */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eee8df] bg-[#fcfbf9] px-6 py-4">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg border border-[#dfd6ca] bg-white px-4 py-2 text-xs font-semibold text-[#1b2925] hover:bg-[#f4eee6] transition cursor-pointer"
            >
              <Printer size={14} />
              Print Receipt
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-[#1b2925] px-6 py-2 text-xs font-semibold text-white hover:bg-[#b87840] transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FULL-SIZE IMAGE LIGHTBOX POPUP */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
          role="dialog"
          aria-label="Image preview"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl bg-white p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#eee] pb-2 mb-2">
              <p className="text-xs font-bold text-[#1b2925] truncate pr-4">
                {lightboxImage.title || "Photo Preview"}
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage.url}
                  download="Photo-Download.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded hover:bg-[#f4eee6] text-[#1b2925]"
                  title="Download full resolution"
                >
                  <Download size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-1 rounded hover:bg-[#fae5e2] text-[#c24130] cursor-pointer"
                  title="Close preview"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title || "Preview"}
                className="max-h-[75vh] w-auto rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderDetailsModal;
