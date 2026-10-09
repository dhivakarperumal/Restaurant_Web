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
  DELIVERED: "bg-[#eaf4e4] text-[#396F0B] border-[#cfe3c4]",
  "OUT FOR DELIVERY": "bg-[#edf3fa] text-[#245b85] border-[#c9daee]",
  SHIPPED: "bg-[#edf3fa] text-[#245b85] border-[#c9daee]",
  PROCESSING: "bg-[#fff6d8] text-[#795500] border-[#f1d889]",
  PACKING: "bg-[#fff6d8] text-[#795500] border-[#f1d889]",
  READY: "bg-[#eaf4e4] text-[#396F0B] border-[#cfe3c4]",
  CONFIRMED: "bg-[#eaf4e4] text-[#396F0B] border-[#cfe3c4]",
  CANCELLED: "bg-[#fff0ec] text-[#b83b1d] border-[#f5c6b9]",
  "ON HOLD": "bg-[#fff6d8] text-[#795500] border-[#f1d889]",
  RETURNED: "bg-[#fff0ec] text-[#b83b1d] border-[#f5c6b9]",
  "ORDER PLACED": "bg-[#fff6d8] text-[#795500] border-[#f1d889]",
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

    if (Array.isArray(initialOrder?.items)) {
      setOrderDetails(initialOrder);
      setLoading(false);
      return undefined;
    }

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
    badge: statusColorMap[normalizedStatus] || "bg-white/10 text-white border-white/20",
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
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#03130d]/80 p-3 backdrop-blur-md sm:p-5 md:p-8"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="relative my-auto flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-white/70 bg-[#F9F8F6] shadow-[0_32px_100px_rgba(2,38,16,0.34)] animate-in fade-in zoom-in-95 duration-200">
          
          {/* MODAL HEADER */}
          <div className="relative flex items-start justify-between overflow-hidden border-b border-white/10 bg-[#071C18] px-5 py-5 text-white sm:px-8 sm:py-6">
            <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full border-[36px] border-[#396F0B]/30" />
            <div aria-hidden="true" className="pointer-events-none absolute -right-3 -bottom-20 h-44 w-44 rounded-full bg-[#FEB914]/10 blur-2xl" />
            <div className="space-y-1.5 min-w-0 pr-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#FEB914]">
                  Order Details
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusInfo.badge}`}
                >
                  {currentStatus}
                </span>
              </div>

              <div className="relative flex flex-wrap items-center gap-2">
                <h3 className="truncate font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  #{currentOrder.order_id || activeOrderId}
                </h3>
                <button
                  type="button"
                  onClick={copyOrderId}
                  title="Copy Order ID"
                  className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80 transition hover:border-[#FEB914]/60 hover:bg-white/15 hover:text-white"
                >
                  <Copy size={11} />
                  Copy
                </button>
              </div>

              <p className="flex flex-wrap items-center gap-2 text-xs text-white/65">
                <Calendar size={13} className="text-[#FEB914]" />
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
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 transition hover:border-[#FD5E02] hover:bg-[#FD5E02] hover:text-white"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          {/* SCROLLABLE BODY */}
          <div className="flex-1 space-y-6 overflow-y-auto bg-[#F9F8F6] px-4 py-5 sm:px-8 sm:py-7">
            
            {/* 1. ORDER PROGRESS TRACKER */}
            {!isCancelled ? (
              <div className="rounded-2xl border border-[#dce8d5] bg-gradient-to-br from-[#f1f7ed] to-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#071C18]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#396F0B] text-white"><Truck size={15} /></span>
                    Order Journey
                  </h4>
                  {currentOrder.courier_name && (
                    <span className="text-xs font-medium text-[#4a5550]">
                      Via <strong>{currentOrder.courier_name}</strong>
                      {currentOrder.docket_number && (
                        <> (Docket: <code className="rounded border border-[#dce8d5] bg-white px-1.5 py-0.5 text-[#071C18]">{currentOrder.docket_number}</code>)</>
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
                            ? "bg-white border-2 border-[#396F0B] shadow-md"
                            : isCompleted
                            ? "bg-white border border-[#cfe3c4]"
                            : "bg-white/50 border border-transparent opacity-55"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                              isCompleted
                                ? "bg-[#396F0B] text-white"
                                : "bg-[#e3e8e0] text-[#68736e]"
                            }`}
                          >
                            {isCompleted ? <CheckCircle2 size={12} /> : idx + 1}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              isCurrent
                                ? "text-[#396F0B]"
                                : isCompleted
                                ? "text-[#071C18]"
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
              <div className="flex items-start gap-3 rounded-2xl border border-[#f5c6b9] bg-[#fff0ec] p-4">
                <AlertCircle className="mt-0.5 shrink-0 text-[#b83b1d]" size={18} />
                <div>
                  <h4 className="text-sm font-semibold text-[#b83b1d]">
                    Order Cancelled
                  </h4>
                  <p className="mt-0.5 text-xs text-[#7b4038]">
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
                <h4 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#071C18]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF5E9] text-[#396F0B]"><Package size={15} /></span>
                  Purchased Items (
                  {loading && items.length === 0 ? "Loading..." : items.length || currentOrder.item_count || 1}
                  )
                </h4>
              </div>

              {loading && items.length === 0 ? (
                <div className="space-y-3 py-4">
                  {[1, 2].map((n) => (
                    <div
                      key={n}
                      className="flex animate-pulse items-center gap-4 rounded-xl border border-[#e4e9e1] bg-[#f3f8ef] p-4"
                    >
                      <div className="h-16 w-16 rounded-lg bg-[#dce8d5]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/3 rounded bg-[#dce8d5]" />
                        <div className="h-3 w-1/4 rounded bg-[#dce8d5]" />
                      </div>
                      <div className="h-4 w-16 rounded bg-[#dce8d5]" />
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
                        className="rounded-2xl border border-[#e4e9e1] bg-white p-4 shadow-sm transition hover:border-[#a9c69a] hover:shadow-md sm:p-5"
                      >
                        {/* Main Item Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e4e9e1] bg-[#f3f8ef] sm:h-20 sm:w-20">
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
                              <h5 className="truncate text-base font-semibold text-[#071C18]">
                                {item.product_name || "Custom Frame"}
                              </h5>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#7b8580]">
                                {item.category && (
                                  <span className="rounded bg-[#EFF5E9] px-2 py-0.5 font-medium text-[#396F0B]">
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
                            <p className="text-base font-bold text-[#071C18]">
                              ₹{itemTotal.toLocaleString("en-IN")}
                            </p>
                          </div>
                        </div>

                        {/* Whole Frame Rendered Preview (if customized) */}
                        {wholeFrame && (
                          <div className="mt-4 rounded-xl border border-[#dce8d5] bg-[#f3f8ef] p-3.5">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#071C18]">
                                <Sparkles size={14} className="text-[#396F0B]" />
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
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#dce8d5] bg-white px-2.5 py-1 text-xs font-medium text-[#071C18] transition hover:bg-[#EFF5E9]"
                                >
                                  <Eye size={12} /> View
                                </button>
                                <a
                                  href={wholeFrame}
                                  download={`Order-${currentOrder.order_id}-Frame.jpg`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg bg-[#071C18] px-2.5 py-1 text-xs font-medium text-white transition hover:bg-[#396F0B]"
                                >
                                  <Download size={12} /> Download
                                </a>
                              </div>
                            </div>
                            <div className="flex justify-center rounded-lg border border-[#e4e9e1] bg-white p-2">
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
                              <ImageIcon size={13} className="text-[#396F0B]" />
                              Uploaded Photos ({photos.length})
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                              {photos.map((photo, pIdx) => (
                                <div
                                  key={pIdx}
                                  className="group relative overflow-hidden rounded-xl border border-[#e4e9e1] bg-[#f3f8ef] p-1.5 transition hover:border-[#396F0B]"
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
                                      className="cursor-pointer rounded bg-white p-1 text-[#071C18] hover:bg-[#EFF5E9]"
                                      title="View photo"
                                    >
                                      <Eye size={12} />
                                    </button>
                                    <a
                                      href={photo.url}
                                      download={`Order-${currentOrder.order_id}-${photo.label}.jpg`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded bg-white p-1 text-[#071C18] hover:bg-[#EFF5E9]"
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
                                <strong className="text-[#071C18]">{td.label}:</strong> {td.text}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-[#e4e9e1] bg-white p-5 text-center text-xs text-[#7b8580]">
                  Item details could not be retrieved.
                </div>
              )}
            </div>

            {/* 3. TWO-COLUMN DETAILS: SHIPPING & PAYMENT */}
            <div className="grid gap-4 sm:grid-cols-2">
              
              {/* Delivery Address Card */}
              <div className="space-y-3 rounded-2xl border border-[#e4e9e1] bg-white p-4 shadow-sm sm:p-5">
                <h4 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#071C18]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF5E9] text-[#396F0B]"><MapPin size={15} /></span>
                  Delivery Address
                </h4>

                <div className="text-xs space-y-1 text-[#4a5550]">
                  <p className="text-sm font-bold text-[#071C18]">
                    {currentOrder.customer_name || "Customer"}
                  </p>
                  {currentOrder.customer_phone && (
                    <p className="flex items-center gap-1.5 font-medium text-[#071C18]">
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
              <div className="space-y-3 rounded-2xl border border-[#dce8d5] bg-gradient-to-br from-[#f1f7ed] to-white p-4 shadow-sm sm:p-5">
                <h4 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#071C18]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#071C18] text-[#FEB914]"><FileText size={15} /></span>
                  Payment & Billing
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-[#5a6661]">
                    <span>Payment Method:</span>
                    <strong className="text-[#071C18]">
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
                      <span className="text-[#071C18]">
                        {currentOrder.billing_type}
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5 border-t border-[#dce8d5] pt-2">
                    <div className="flex justify-between text-[#5a6661]">
                      <span>Items Subtotal:</span>
                      <span>₹{(itemsTotal || grandTotal).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-[#5a6661]">
                      <span>Delivery / Shipping:</span>
                      <span className="text-[#28724a] font-medium">FREE</span>
                    </div>
                    <div className="flex justify-between border-t border-[#dce8d5] pt-2 text-sm font-bold text-[#071C18]">
                      <span>Grand Total:</span>
                      <span className="text-base text-[#071C18]">
                        ₹{grandTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. ORDER NOTES (if any) */}
            {currentOrder.notes && (
              <div className="rounded-2xl border border-[#f1d889] bg-[#fff9e8] p-4 text-xs text-[#5a6661]">
                <strong className="text-[#071C18]">Order Note:</strong> {currentOrder.notes}
              </div>
            )}
          </div>

          {/* MODAL FOOTER */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#071C18] px-5 py-4 sm:px-8">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:border-[#FEB914]/60 hover:bg-white/15"
            >
              <Printer size={14} />
              Print Receipt
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[#FD5E02] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#e65300]"
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#03130d]/90 p-4 backdrop-blur-md"
          role="dialog"
          aria-label="Image preview"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl border border-[#dce8d5] bg-[#F9F8F6] p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#eee] pb-2 mb-2">
              <p className="truncate pr-4 text-xs font-bold text-[#071C18]">
                {lightboxImage.title || "Photo Preview"}
              </p>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage.url}
                  download="Photo-Download.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg p-1.5 text-[#396F0B] transition hover:bg-[#EFF5E9]"
                  title="Download full resolution"
                >
                  <Download size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="cursor-pointer rounded-lg p-1.5 text-[#b83b1d] transition hover:bg-[#fff0ec]"
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
