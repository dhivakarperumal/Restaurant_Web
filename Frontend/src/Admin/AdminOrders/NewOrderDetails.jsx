import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, CreditCard, Download, Image as ImageIcon, MapPin, Package, Phone, User, Printer } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api, { API_URL } from "../../api";
import toast from "react-hot-toast";

const formatCurrency = (value) =>
  `₹ ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const statusOptions = [
  ["NEW", "New Order"],
  ["ORDER_PLACED", "Order Placed"],
  ["CONFIRMED", "Confirmed"],
  ["PROCESSING", "Processing"],
  ["PACKING", "Packing"],
  ["READY", "Ready"],
  ["SHIPPED", "Shipped"],
  ["OUT_FOR_DELIVERY", "Out for Delivery"],
  ["DELIVERED", "Delivered"],
  ["CANCELLED", "Cancelled"],
  ["ON_HOLD", "On Hold"],
  ["RETURNED", "Returned"],
];

const normalizeStatus = (status) => {
  const value = String(status || "").trim().toUpperCase();
  if (value === "PENDING" || value === "NEW ORDER") return "NEW";
  if (value === "ORDER PLACED") return "ORDER_PLACED";
  if (value === "OUT FOR DELIVERY") return "OUT_FOR_DELIVERY";
  if (value === "ON HOLD") return "ON_HOLD";
  return value || "NEW";
};

const getVisibleStatusOptions = (currentStatus) => {
  const normalizedStatus = normalizeStatus(currentStatus);
  const workflowStatuses = statusOptions.slice(0, 9);
  const currentIndex = workflowStatuses.findIndex(([value]) => value === normalizedStatus);
  const visibleWorkflowStatuses = currentIndex >= 0
    ? workflowStatuses.slice(currentIndex)
    : [[normalizedStatus, currentStatus]];
  const specialStatuses = statusOptions.slice(9);

  return [
    ...visibleWorkflowStatuses,
    ...specialStatuses.filter(
      ([value]) => !visibleWorkflowStatuses.some(([visibleValue]) => visibleValue === value)
    ),
  ];
};

const imageUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  if (/^(data:|blob:|https?:\/\/)/i.test(value)) return value;
  const baseUrl = API_URL.replace(/\/api\/?$/, "");
  return `${baseUrl}${value.startsWith("/") ? value : `/${value}`}`;
};

const isPhotoUrl = (value) => {
  if (!value || typeof value !== "string") return false;
  const str = value.trim();
  return /^(https?:\/\/|\/|data:|blob:)/i.test(str) || /\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(str);
};

const getSlotPhotoEntries = (value) => {
  if (!value) return [];
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return isPhotoUrl(parsed) ? [["Photo 1", imageUrl(parsed)]] : [];
    }
  }
  if (Array.isArray(parsed)) return parsed.filter(isPhotoUrl).map((photo, index) => [`Photo ${index + 1}`, imageUrl(photo)]);
  if (typeof parsed === "object") return Object.entries(parsed)
    .filter(([, photo]) => isPhotoUrl(photo))
    .map(([slot, photo]) => [slot, imageUrl(photo)]);
  return [];
};

const handleDownloadPhoto = async (photoUrl, fileName) => {
  try {
    const response = await fetch(photoUrl);
    const blobUrl = window.URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(photoUrl, "_blank", "noopener,noreferrer");
  }
};

const handleDownloadAllPhotos = async (photos, orderId, productName) => {
  if (!photos || !photos.length) return;
  toast.loading(`Downloading ${photos.length} photos...`, { id: "downloadAllNew" });
  for (let i = 0; i < photos.length; i++) {
    const photoUrl = photos[i];
    try {
      const resp = await fetch(photoUrl);
      const blob = await resp.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `Order-${orderId || "Order"}-${productName || "Album"}-Photo-${i + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch {
      const link = document.createElement("a");
      link.href = photoUrl;
      link.download = `Order-${orderId || "Order"}-Photo-${i + 1}.jpg`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
  toast.success(`Downloaded all ${photos.length} photos!`, { id: "downloadAllNew" });
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
          @page { size: A4; margin: 10mm; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 15px; color: #1a1a1a; background: #fff; }
          .header { border-bottom: 2px solid #1a3c36; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
          .header h1 { margin: 0; font-size: 18px; color: #1a3c36; }
          .header p { margin: 4px 0 0; font-size: 12px; color: #666; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
          .photo-card { border: 1px solid #ddd; border-radius: 8px; padding: 8px; page-break-inside: avoid; text-align: center; background: #fafafa; }
          .photo-card img { max-width: 100%; height: 250px; object-fit: contain; border-radius: 4px; background: #fff; }
          .photo-label { margin-top: 6px; font-weight: bold; font-size: 12px; color: #333; }
          @media print { .no-print { display: none; } body { padding: 0; } }
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
          ${photos.map((src, idx) => `
            <div class="photo-card">
              <img src="${src}" alt="Photo ${idx + 1}" />
              <div class="photo-label">Position ${idx + 1}</div>
            </div>
          `).join("")}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 600);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};

const NewOrderDetails = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusDraft, setStatusDraft] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [shippingDetails, setShippingDetails] = useState({
    shipped_at: "",
    docket_number: "",
    courier_name: "",
  });
  const [showShippingPopup, setShowShippingPopup] = useState(false);
  const [showCancellationPopup, setShowCancellationPopup] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const response = await api.get(`/orders/${orderId}`);
        const nextOrder = response.data?.data || null;
        setOrder(nextOrder);
        setStatusDraft(normalizeStatus(nextOrder?.order_status));
        setCancellationReason(nextOrder?.notes || "");
        setShippingDetails({
          shipped_at: nextOrder?.shipped_at
            ? new Date(nextOrder.shipped_at).toISOString().slice(0, 16)
            : "",
          docket_number: nextOrder?.docket_number || "",
          courier_name: nextOrder?.courier_name || "",
        });
      } catch (error) {
        console.error("Failed to load new order details:", error);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  const handleStatusUpdate = async (nextStatus = statusDraft, nextReason = cancellationReason) => {
    if (!nextStatus) return;
    if (nextStatus === "CANCELLED" && !nextReason.trim()) {
      toast.error("Please enter a cancellation reason");
      return;
    }

    try {
      setUpdatingStatus(true);
      await api.patch(`/orders/${orderId}/status`, {
        order_status: nextStatus,
        notes: nextReason.trim(),
        ...(nextStatus === "SHIPPED" ? shippingDetails : {}),
      });
      setStatusDraft(nextStatus);
      setCancellationReason(nextReason.trim());
      setOrder((previous) => ({ ...previous, order_status: nextStatus, notes: nextReason.trim() }));
      setShowShippingPopup(false);
      setShowCancellationPopup(false);
      toast.success("Order status updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update order status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f7f5f2] text-sm text-[#475467]">Loading order details...</div>;
  }

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f5f2] px-4 text-center">
        <p className="text-lg font-bold text-[#1d2925]">Order not found</p>
        <button type="button" onClick={() => navigate("/admin/orders/new")} className="mt-4 rounded-lg bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white">Back to New Orders</button>
      </div>
    );
  }

  const items = order.items || [];
  const itemTotal = items.reduce((sum, item) => sum + Number(item.total_price || Number(item.price || 0) * Number(item.quantity || 1)), 0);
  const address = order.shipping_address || "-";

  return (
    <div className="min-h-screen bg-[#f7f5f2] p-4 text-[#1d2925] md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <button type="button" onClick={() => navigate("/admin/orders/new")} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#49645e]"><ArrowLeft className="h-4 w-4" /> Back to New Orders</button>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">New Order Details</h1>
            <p className="mt-1 text-sm text-[#66736e]">Review the customer order and purchased items.</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <label className="text-xs font-bold text-[#66736e]" htmlFor="new-order-status">Update Status</label>
            <select id="new-order-status" value={statusDraft} onChange={(event) => { const nextStatus = event.target.value; if (nextStatus === "SHIPPED") { setStatusDraft(nextStatus); setShowShippingPopup(true); return; } if (nextStatus === "CANCELLED") { setStatusDraft(nextStatus); setCancellationReason(""); setShowCancellationPopup(true); return; } setCancellationReason(""); handleStatusUpdate(nextStatus, ""); }} disabled={updatingStatus} className="h-10 min-w-48 rounded-xl border border-[#d8cfc3] bg-white px-3 text-xs font-bold text-[#1a3c36] outline-none focus:border-[#1a3c36]">
              {getVisibleStatusOptions(order.order_status).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              {!getVisibleStatusOptions(order.order_status).some(([value]) => value === statusDraft) && <option value={statusDraft}>{order.order_status}</option>}
            </select>
            {showShippingPopup && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Shipping details"><div className="w-full max-w-sm rounded-2xl border border-[#e8dfd2] bg-white p-5 shadow-2xl"><h2 className="text-lg font-black text-[#1a3c36]">Shipping Details</h2><p className="mt-1 text-xs text-[#66736e]">Enter the details before marking this order as shipped.</p><div className="mt-4 space-y-3"><input type="datetime-local" value={shippingDetails.shipped_at} onChange={(event) => setShippingDetails((previous) => ({ ...previous, shipped_at: event.target.value }))} className="h-10 w-full rounded-lg border border-[#d8cfc3] px-3 text-xs outline-none focus:border-[#1a3c36]" aria-label="Shipped date and time" /><input value={shippingDetails.docket_number} onChange={(event) => setShippingDetails((previous) => ({ ...previous, docket_number: event.target.value }))} placeholder="Docket number" className="h-10 w-full rounded-lg border border-[#d8cfc3] px-3 text-xs outline-none focus:border-[#1a3c36]" /><input value={shippingDetails.courier_name} onChange={(event) => setShippingDetails((previous) => ({ ...previous, courier_name: event.target.value }))} placeholder="Courier name" className="h-10 w-full rounded-lg border border-[#d8cfc3] px-3 text-xs outline-none focus:border-[#1a3c36]" /></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => { setShowShippingPopup(false); setStatusDraft(normalizeStatus(order.order_status)); }} className="rounded-lg border border-[#d8cfc3] px-3 py-2 text-xs font-bold text-[#66736e]">Cancel</button><button type="button" onClick={() => handleStatusUpdate("SHIPPED", "")} disabled={updatingStatus || !shippingDetails.shipped_at || !shippingDetails.docket_number.trim() || !shippingDetails.courier_name.trim()} className="rounded-lg bg-[#1a3c36] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{updatingStatus ? "Updating..." : "Submit Shipped"}</button></div></div></div>}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-[#e8dfd2] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#f0e8dc] pb-4">
                <div><p className="text-xs font-bold uppercase tracking-wider text-[#b07838]">Order ID</p><h2 className="mt-1 text-xl font-black text-[#1a3c36]">{order.order_id}</h2></div>
                <div className="text-right text-xs text-[#66736e]"><p>{order.created_at ? new Date(order.created_at).toLocaleDateString("en-IN") : "-"}</p><p>{order.created_at ? new Date(order.created_at).toLocaleTimeString("en-IN") : "-"}</p></div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-[#faf8f4] p-4"><User className="h-4 w-4 text-[#b07838]" /><p className="mt-2 text-xs text-[#66736e]">Customer</p><p className="mt-1 font-bold">{order.customer_name || "-"}</p></div>
                <div className="rounded-xl bg-[#faf8f4] p-4"><Phone className="h-4 w-4 text-[#b07838]" /><p className="mt-2 text-xs text-[#66736e]">Phone</p><p className="mt-1 font-bold">{order.customer_phone || "-"}</p></div>
                <div className="rounded-xl bg-[#faf8f4] p-4"><CreditCard className="h-4 w-4 text-[#b07838]" /><p className="mt-2 text-xs text-[#66736e]">Payment</p><p className="mt-1 font-bold">{order.payment_method || "-"}</p><p className="text-xs text-[#66736e]">{order.payment_status || "Pending"}</p></div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#e8dfd2] bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 font-bold"><Package className="h-5 w-5 text-[#b07838]" /> Ordered Items</div>
              <div className="space-y-3">
                {items.map((item) => {
                  const image = imageUrl(item.product_image || item.frame_image);
                  const wholeFrame = imageUrl(item.whole_frame_image);
                  const slotPhotoEntries = getSlotPhotoEntries(item.slot_photos);
                  return (
                    <div key={item.id || item.product_id || item.product_name} className="border-b border-[#f0e8dc] pb-5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#faf8f4]">
                          {image ? <img src={image} alt={item.product_name || "Product"} className="h-full w-full object-contain" /> : <Package className="h-5 w-5 text-[#b7beb9]" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold">{item.product_name || "Custom Frame"}</p>
                          <p className="text-xs text-[#66736e]">{item.category || "Photo Frames"} · Size: {item.size || "Standard"} · Qty: {item.quantity || 1}</p>
                        </div>
                        <p className="font-bold">{formatCurrency(item.total_price || Number(item.price || 0) * Number(item.quantity || 1))}</p>
                      </div>
                      {wholeFrame && (
                        <div className="mt-4 rounded-xl border border-[#e8dfd2] bg-[#faf8f4] p-3">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm font-bold">
                              <ImageIcon className="h-4 w-4 text-[#b07838]" /> Whole Frame Photo
                            </div>
                            <a href={wholeFrame} download={`Order-${order.order_id}-Whole-Frame.jpg`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-[#1a3c36] px-3 py-1.5 text-xs font-bold text-white">
                              <Download className="h-3.5 w-3.5" /> Download
                            </a>
                          </div>
                          <div className="flex justify-center">
                            <img src={wholeFrame} alt="Final assembled frame" className="max-h-[420px] rounded-lg border border-[#e8dfd2] object-contain" />
                          </div>
                        </div>
                      )}
                      {slotPhotoEntries.length > 0 && (
                        <div className="mt-4">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm font-bold">
                              <ImageIcon className="h-4 w-4 text-[#b07838]" /> Uploaded Photos ({slotPhotoEntries.length})
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDownloadAllPhotos(slotPhotoEntries.map(([, photo]) => photo), order.order_id, item.product_name)}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#1a3c36] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#235048]"
                              >
                                <Download className="h-3.5 w-3.5" /> Download All ({slotPhotoEntries.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintAlbumPhotos(slotPhotoEntries.map(([, photo]) => photo), order.order_id, item.product_name, order)}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#1a3c36] bg-white px-3 py-1.5 text-xs font-bold text-[#1a3c36] hover:bg-[#faf7f2]"
                              >
                                <Printer className="h-3.5 w-3.5" /> Print All
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 max-h-96 overflow-y-auto p-1 scrollbar-thin">
                            {slotPhotoEntries.map(([slot, photo], index) => (
                              <div key={`${photo}-${index}`} className="overflow-hidden rounded-xl border border-[#e8dfd2] bg-[#faf8f4] p-2">
                                <img src={photo} alt={`${slot} uploaded photo`} className="h-36 w-full rounded-lg object-cover" />
                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold">{slot || `Photo ${index + 1}`}</span>
                                  <button type="button" onClick={() => handleDownloadPhoto(photo, `Order-${order.order_id}-Position-${index + 1}.jpg`)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1a3c36] text-white" title="Download uploaded photo" aria-label={`Download ${slot || `photo ${index + 1}`}`}>
                                    <Download className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-[#e8dfd2] bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2 font-bold"><CreditCard className="h-5 w-5 text-[#b07838]" /> Order Summary</div><div className="space-y-3 text-sm"><div className="flex justify-between"><span>Items total</span><span>{formatCurrency(itemTotal)}</span></div><div className="flex justify-between border-t border-[#f0e8dc] pt-3 text-base font-black"><span>Total</span><span className="text-[#1a3c36]">{formatCurrency(order.total_amount)}</span></div></div></section>
            <section className="rounded-2xl border border-[#e8dfd2] bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2 font-bold"><MapPin className="h-5 w-5 text-[#b07838]" /> Delivery Address</div><p className="font-bold">{order.customer_name || "-"}</p><p className="mt-2 text-sm leading-6 text-[#66736e]">{address}<br />{[order.city, order.state, order.pincode].filter(Boolean).join(", ")}</p></section>
            <section className="rounded-2xl border border-[#e8dfd2] bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2 font-bold"><CalendarDays className="h-5 w-5 text-[#b07838]" /> Additional Information</div><p className="flex justify-between text-sm"><span>Billing type</span><strong>{order.billing_type || "-"}</strong></p>{order.notes && <p className="mt-4 rounded-lg bg-[#faf8f4] p-3 text-sm text-[#66736e]"><strong className="text-[#1d2925]">Notes:</strong> {order.notes}</p>}</section>
          </aside>
        </div>
        {showCancellationPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Cancellation reason">
            <div className="w-full max-w-sm rounded-2xl border border-[#e8dfd2] bg-white p-5 shadow-2xl">
              <h2 className="text-lg font-black text-[#1a3c36]">Cancel Order</h2>
              <p className="mt-1 text-xs text-[#66736e]">Enter a reason before cancelling this order.</p>
              <textarea value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} placeholder="Cancellation reason" rows={4} autoFocus className="mt-4 w-full rounded-lg border border-[#d8cfc3] px-3 py-2 text-xs outline-none focus:border-[#1a3c36]" />
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => { setShowCancellationPopup(false); setStatusDraft(normalizeStatus(order.order_status)); }} className="rounded-lg border border-[#d8cfc3] px-3 py-2 text-xs font-bold text-[#66736e]">Cancel</button>
                <button type="button" onClick={() => handleStatusUpdate("CANCELLED", cancellationReason)} disabled={updatingStatus || !cancellationReason.trim()} className="rounded-lg bg-[#b42318] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{updatingStatus ? "Updating..." : "Submit Cancelled"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewOrderDetails;
