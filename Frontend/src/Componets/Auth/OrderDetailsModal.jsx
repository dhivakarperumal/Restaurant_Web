import { useContext, useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  Headset,
  Image as ImageIcon,
  MapPin,
  Package,
  Pencil,
  Phone,
  Printer,
  RefreshCw,
  Sparkles,
  Truck,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { API_URL } from "../../api";
import { StoreContext } from "../../PrivateRouter/StoreContext";

const trackingStatuses = ["Order Placed", "Preparing", "Ready", "Assigned", "Delivered"];

const normalizeStatus = (status) => {
  const normalized = String(status || "").trim().toUpperCase().replace(/_/g, " ");
  if (["PENDING", "NEW", "NEW ORDER", "PLACED", "PROCESSING"].includes(normalized)) {
    return "ORDER PLACED";
  }
  if (normalized === "READY TO SERVE") return "READY";
  if (["OUT FOR DELIVERY", "SHIPPED"].includes(normalized)) return "ASSIGNED";
  if (["COMPLETED", "SERVED"].includes(normalized)) return "DELIVERED";
  return normalized;
};

const statusColorMap = {
  DELIVERED: "bg-[#eaf4e4] text-[#396F0B] border-[#cfe3c4]",
  ASSIGNED: "bg-[#edf3fa] text-[#245b85] border-[#c9daee]",
  READY: "bg-[#eaf4e4] text-[#396F0B] border-[#cfe3c4]",
  PROCESSING: "bg-[#fff6d8] text-[#795500] border-[#f1d889]",
  PACKING: "bg-[#fff6d8] text-[#795500] border-[#f1d889]",
  CONFIRMED: "bg-[#eaf4e4] text-[#396F0B] border-[#cfe3c4]",
  CANCELLED: "bg-[#fff0ec] text-[#b83b1d] border-[#f5c6b9]",
  "ON HOLD": "bg-[#fff6d8] text-[#795500] border-[#f1d889]",
  RETURNED: "bg-[#fff0ec] text-[#b83b1d] border-[#f5c6b9]",
  "ORDER PLACED": "bg-[#fff6d8] text-[#795500] border-[#f1d889]",
};

const getStatusLabel = (status) => {
  const normalized = normalizeStatus(status);
  return trackingStatuses.find((step) => normalizeStatus(step) === normalized) || normalized;
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

const OrderDetailsModal = ({ order: initialOrder, orderId, isOpen, onClose, onEditAddress }) => {
  const store = useContext(StoreContext) || {};
  const { addToCart } = store;
  const [orderDetails, setOrderDetails] = useState(initialOrder || null);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [reordering, setReordering] = useState(false);

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

  // Refresh the saved order status while the customer is viewing its details.
  useEffect(() => {
    if (!isOpen || !activeOrderId) return;
    let isMounted = true;
    const refreshOrder = () => api
      .get(`/orders/mine/${encodeURIComponent(activeOrderId)}`)
      .then((res) => {
        if (isMounted && res.data?.data) setOrderDetails(res.data.data);
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn("Could not refresh order details:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    setLoading(!initialOrder);
    refreshOrder();
    const intervalId = window.setInterval(refreshOrder, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isOpen, activeOrderId, initialOrder]);

  if (!isOpen) return null;

  const currentOrder = orderDetails || initialOrder || {};
  const currentStatus = currentOrder.order_status || "placed";
  const normalizedStatus = normalizeStatus(currentStatus);
  const isCancelled = ["CANCELLED", "RETURNED", "PAYMENT FAILED"].includes(normalizedStatus);
  const statusIndex = trackingStatuses.findIndex(
    (status) => normalizeStatus(status) === normalizedStatus,
  );
  const stepIndex = statusIndex >= 0 ? statusIndex : 0;
  const statusInfo = {
    badge: statusColorMap[normalizedStatus] || "bg-white/10 text-white border-white/20",
    stepIndex,
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

  const grandTotal = Number(currentOrder.total_amount) || itemsTotal || 0;
  const subtotal = Number(currentOrder.subtotal) || itemsTotal || grandTotal;
  const taxAmount = Number(currentOrder.tax_amount || currentOrder.tax) || 0;
  const deliveryCharge =
    Number(currentOrder.delivery_charge) ||
    Math.max(0, grandTotal - subtotal - taxAmount);
  const heroImage = resolveImageUrl(
    items[0]?.product_image || items[0]?.image || items[0]?.food_images?.[0],
  );
  const address = currentOrder.address || {};
  const addressLines = [
    currentOrder.shipping_address || address.address_line || currentOrder.address_line,
    address.area_locality || currentOrder.area_locality,
    [currentOrder.city || address.city, currentOrder.state || address.state]
      .filter(Boolean)
      .join(", "),
    currentOrder.pincode || address.pincode,
  ].filter(Boolean);

  const copyOrderId = () => {
    if (currentOrder.order_id) {
      navigator.clipboard.writeText(currentOrder.order_id);
      toast.success("Order ID copied to clipboard!");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReorder = async () => {
    if (!addToCart || !items.length) {
      toast.error("These order items cannot be added to your cart.");
      return;
    }

    setReordering(true);
    try {
      for (const item of items) {
        const foodId = item.food_id || item.product_id || item.id;
        if (!foodId) {
          throw new Error(`${item.product_name || "An item"} is no longer available to reorder.`);
        }
        const added = await addToCart(
          {
            food_id: foodId,
            product_name: item.product_name,
            product_image: item.product_image || item.image,
            portion_size: item.portion_size || item.size || "Standard",
            price: item.unit_price || item.price || 0,
            selected_addons: item.selected_addons || [],
            selected_customizations: item.selected_customizations || {},
            cooking_notes: item.cooking_notes || "",
          },
          {
            size: item.portion_size || item.size || "Standard",
            price: item.unit_price || item.price || 0,
            quantity: Number(item.quantity) || 1,
            selectedAddons: item.selected_addons || [],
            selectedCustomizations: item.selected_customizations || {},
            cookingNotes: item.cooking_notes || "",
          },
        );
        if (!added) return;
      }
      toast.success("Order items added to your cart.");
    } catch (error) {
      console.error("Could not reorder this order:", error);
      toast.error(error.message || "Could not reorder this order.");
    } finally {
      setReordering(false);
    }
  };

  const supportMessage = encodeURIComponent(
    `Hi, I need help with order ${currentOrder.order_id || activeOrderId}.`,
  );

  const trackingSteps = [
    { title: "Order Placed", desc: formattedDate },
    { title: "Preparing", desc: "In the kitchen" },
    { title: "Ready", desc: "Prepared and ready" },
    { title: "Assigned", desc: "Delivery assigned" },
    { title: "Delivered", desc: "Order delivered" },
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
        <div className="relative my-auto flex max-h-[94vh] w-full max-w-lg flex-col overflow-hidden rounded-[22px] border border-white/80 bg-white shadow-[0_32px_100px_rgba(2,38,16,0.34)] animate-in fade-in zoom-in-95 duration-200">
          
          {/* MODAL HEADER */}
          <div className="flex shrink-0 items-center justify-between border-b border-[#eef0ec] bg-white px-4 py-3.5 sm:px-5">
            <h3 className="font-serif text-xl font-bold tracking-tight text-[#111827]">Order Details</h3>
            <div className="flex items-center gap-1">
              <button type="button" onClick={handlePrint} className="flex h-9 w-9 items-center justify-center rounded-full text-[#647067] transition hover:bg-[#f3f8ef] hover:text-[#396F0B]" aria-label="Print receipt" title="Print receipt">
                <Printer size={17} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#374151] transition hover:bg-[#fff0ec] hover:text-[#FD5E02]"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* SCROLLABLE BODY */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-white px-3.5 py-3.5 sm:px-4">
            <section className="relative order-1 min-h-[148px] overflow-hidden rounded-[18px] bg-[#071C18] text-white">
              {heroImage && <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />}
              <div className="absolute inset-0 bg-gradient-to-r from-[#03130d]/95 via-[#03130d]/80 to-[#03130d]/15" />
              <div className="relative flex min-h-[148px] flex-col justify-center p-4 pl-[42%] sm:p-5 sm:pl-[42%]">
                <div className="flex items-center gap-1.5">
                  <h4 className="min-w-0 truncate text-base font-bold sm:text-lg">Order #{currentOrder.order_id || activeOrderId}</h4>
                  <button type="button" onClick={copyOrderId} title="Copy Order ID" className="shrink-0 rounded p-1 text-white/85 transition hover:bg-white/15 hover:text-white">
                    <Copy size={15} />
                  </button>
                </div>
                <span className={`mt-1.5 inline-flex w-fit items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${statusInfo.badge}`}>
                  <CheckCircle2 size={13} />{getStatusLabel(currentStatus)}
                </span>
                <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs text-white/90 sm:text-sm">
                  <Calendar size={13} />{formattedDate} {formattedTime && `• ${formattedTime}`}
                </p>
                <p className="mt-1 text-xs text-white/90 sm:text-sm">
                  {items.length || currentOrder.item_count || 1} items <span className="px-1">•</span> ₹{grandTotal.toLocaleString("en-IN")}
                </p>
              </div>
            </section>
            
            {/* 1. ORDER PROGRESS TRACKER */}
            {!isCancelled ? (
              <div className="order-2 px-1 py-1.5">
                <div className="grid grid-cols-5">
                  {trackingSteps.map((step, idx) => {
                    const isCompleted = idx <= statusInfo.stepIndex;

                    return (
                      <div key={step.title} className="relative flex min-w-0 flex-col items-center text-center">
                        {idx < trackingSteps.length - 1 && (
                          <span className={`absolute left-1/2 top-[11px] h-0.5 w-full ${idx < statusInfo.stepIndex ? "bg-[#087b2f]" : "bg-[#dce3da]"}`} />
                        )}
                        <span className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full ${isCompleted ? "bg-[#087b2f] text-white" : "bg-[#e3e8e0] text-[#68736e]"}`}>
                          {isCompleted ? idx === 3 ? <Truck size={13} /> : <CheckCircle2 size={15} /> : idx + 1}
                        </span>
                        <span className="mt-1.5 truncate px-0.5 text-[10px] font-bold leading-tight text-[#111827] sm:text-xs">{step.title}</span>
                        <span className="mt-0.5 text-[9px] leading-tight text-[#697386] sm:text-[10px]">{idx === 0 || idx === statusInfo.stepIndex ? formattedDate.replace(/^[^,]+,?\s*/, "") : step.desc}</span>
                        {idx === statusInfo.stepIndex && formattedTime && <span className="text-[9px] text-[#697386]">{formattedTime}</span>}
                      </div>
                    );
                  })}
                </div>
                {currentOrder.courier_name && (
                  <p className="mt-2 text-center text-[10px] text-[#68736e]">
                    Via <strong>{currentOrder.courier_name}</strong>
                    {currentOrder.docket_number && <> · Docket {currentOrder.docket_number}</>}
                  </p>
                )}
              </div>
            ) : (
              <div className="order-2 flex items-start gap-3 rounded-xl border border-[#f5c6b9] bg-[#fff0ec] p-3">
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
            <div className="order-4 rounded-xl border border-[#edf0eb] bg-white px-2.5 py-2">
              <div className="mb-1 flex items-center gap-2 border-b border-[#edf0eb] pb-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#fff0ec] text-[#FD5E02]"><Package size={16} /></span>
                <h4 className="text-sm font-bold text-[#111827]">
                  Order Items <span className="font-medium text-[#697386]">(
                  {loading && items.length === 0 ? "Loading..." : items.length || currentOrder.item_count || 1}
                  )</span>
                </h4>
              </div>

              {loading && items.length === 0 ? (
                <div className="space-y-2 py-3">
                  {[1, 2].map((n) => (
                    <div
                      key={n}
                      className="flex animate-pulse items-center gap-3 border-b border-[#edf0eb] py-2"
                    >
                      <div className="h-12 w-12 rounded-lg bg-[#dce8d5]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/3 rounded bg-[#dce8d5]" />
                        <div className="h-3 w-1/4 rounded bg-[#dce8d5]" />
                      </div>
                      <div className="h-4 w-16 rounded bg-[#dce8d5]" />
                    </div>
                  ))}
                </div>
              ) : items.length > 0 ? (
                <div>
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
                    const itemQty = Number(item.quantity || 1);
                    const itemTotal = Number(item.total_price || Number(item.unit_price || item.price || 0) * itemQty);

                    return (
                      <div
                        key={item.id || item.product_id || index}
                        className="border-b border-[#edf0eb] py-2.5 last:border-0"
                      >
                        {/* Main Item Row */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e4e9e1] bg-[#f3f8ef]">
                              {itemImage ? (
                                <img
                                  src={itemImage}
                                  alt={item.product_name || "Product"}
                                  className="h-full w-full cursor-pointer object-cover transition hover:scale-105"
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
                              <h5 className="truncate text-xs font-bold text-[#111827] sm:text-sm">
                                {item.product_name || "Custom Frame"}
                              </h5>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-[#697386]">
                                {item.category && (
                                  <span className="rounded bg-[#EFF5E9] px-2 py-0.5 font-medium text-[#396F0B]">
                                    {item.category}
                                  </span>
                                )}
                                <span>{item.portion_size || item.size || "Regular"}</span>
                                <span aria-hidden="true">•</span>
                                <span>Qty: {itemQty}</span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold text-[#111827]">
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
            <div className="contents">
              
              {/* Delivery Address Card */}
              <div className="order-3 rounded-xl border border-[#edf0eb] bg-[#fafbf8] p-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-[#111827]">
                    <MapPin size={19} className="shrink-0 text-[#FD5E02]" />
                    Delivery Address
                  </h4>
                  {onEditAddress && (
                    <button type="button" onClick={onEditAddress} className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce3da] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#374151] transition hover:border-[#396F0B] hover:text-[#396F0B]">
                      <Pencil size={12} /> Edit
                    </button>
                  )}
                </div>

                <div className="mt-2 space-y-0.5 pl-7 text-xs text-[#505a68]">
                  <p className="text-sm font-bold text-[#111827]">
                    {currentOrder.customer_name || "Customer"}
                  </p>
                  {currentOrder.customer_phone && (
                    <p className="flex items-center gap-1.5 font-medium text-[#111827]">
                      <Phone size={12} className="text-[#7b8580]" />
                      {currentOrder.customer_phone}
                    </p>
                  )}
                  {addressLines.length ? addressLines.map((line, index) => <p key={`${line}-${index}`} className="leading-relaxed">{line}</p>) : <p className="leading-relaxed">Standard Shipping</p>}
                  {(currentOrder.landmark || address.landmark) && <p className="font-medium text-[#087b2f]">Landmark: {currentOrder.landmark || address.landmark}</p>}
                </div>
              </div>

              {/* Payment & Order Summary Card */}
              <div className="order-5 space-y-1 rounded-xl border border-[#e5e9e4] bg-white p-2.5 text-xs text-[#505a68]">
                <div className="flex justify-between gap-3"><span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between gap-3"><span>Delivery Charge</span><span>₹{deliveryCharge.toLocaleString("en-IN")}</span></div>
                {taxAmount > 0 && <div className="flex justify-between gap-3"><span>GST / Tax</span><span>₹{taxAmount.toLocaleString("en-IN")}</span></div>}
                <div className="flex justify-between gap-3 rounded-lg bg-[#eff8f0] px-2.5 py-2 text-sm font-bold text-[#075b20]">
                  <span>{["paid", "completed"].includes(String(currentOrder.payment_status || "").toLowerCase()) ? "Total Paid" : "Total"}</span>
                  <span>₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
                <p className="px-1 pt-1 text-[10px] text-[#697386]">
                  {currentOrder.payment_method || "Cash on Delivery"}
                  {currentOrder.payment_status ? ` · ${currentOrder.payment_status}` : ""}
                  {currentOrder.order_type ? ` · ${String(currentOrder.order_type).replaceAll("_", " ")}` : ""}
                </p>
              </div>
            </div>

            {/* 4. ORDER NOTES (if any) */}
            {currentOrder.notes && (
              <div className="order-6 rounded-xl border border-[#f1d889] bg-[#fff9e8] p-3 text-xs text-[#5a6661]">
                <strong className="text-[#071C18]">Order Note:</strong> {currentOrder.notes}
              </div>
            )}
          </div>

          {/* MODAL FOOTER */}
          <div className="grid shrink-0 grid-cols-2 gap-2.5 border-t border-[#edf0eb] bg-white px-3.5 py-3 sm:px-4">
            <button
              type="button"
              onClick={handleReorder}
              disabled={reordering || items.length === 0}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#FD5E02] bg-white px-3 text-xs font-bold text-[#FD5E02] transition hover:bg-[#fff5ef] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={17} className={reordering ? "animate-spin" : ""} />
              {reordering ? "Adding..." : "Reorder"}
            </button>
            <a
              href={`https://wa.me/919597293504?text=${supportMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#FD5E02] px-3 text-xs font-bold text-white transition hover:bg-[#e65300]"
            >
              <Headset size={17} />
              Need Help?
            </a>
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
