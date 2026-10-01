import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Coins,
  DollarSign,
  Eye,
  Frame,
  Image as ImageIcon,
  ImagePlus,
  Layers,
  Move,
  Package,
  Plus,
  RotateCw,
  Save,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import api from "../../api";
import { useAuth } from "../../PrivateRouter/AuthContext";
import toast from "react-hot-toast";
import PhotoAdjustModal from "../../CommonComponents/PhotoAdjustModal";

const generateUuid = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
};

const defaultStandardSizes = [
  "4 x 6 inch",
  "5 x 7 inch",
  "6 x 8 inch",
  "8 x 10 inch",
  "10 x 12 inch",
  "12 x 18 inch",
  "16 x 20 inch",
  "18 x 24 inch",
  "20 x 30 inch",
];

const materialOptions = [
  "Wooden",
  "Teak Wood",
  "MDF Wood",
  "Acrylic",
  "Metal / Aluminium",
  "Canvas Wrap",
  "Glass & Metal",
  "Premium Plastic",
];

const colorOptions = [
  "Natural Wood",
  "Walnut Brown",
  "Classic Black",
  "Modern White",
  "Antique Golden",
  "Brushed Silver",
  "Dark Chocolate",
  "Custom Finish",
];

/**
 * Generate a composite image containing the frame background
 * and all uploaded slot photos properly positioned & clipped
 */
/**
 * Generate a composite image containing the frame background
 * and all uploaded slot photos properly positioned & clipped with full studio adjustments.
 * Returns both { blob, dataUrl } for live preview and upload saving.
 */
const createCompositeFrameImage = async (frameImageUrl, slots, slotPhotos, slotAdjustments = {}) => {
  return new Promise((resolve) => {
    if (!frameImageUrl) return resolve({ blob: null, dataUrl: null });

    const frameImg = new Image();
    frameImg.crossOrigin = "anonymous";
    frameImg.src = frameImageUrl;

    frameImg.onload = async () => {
      try {
        const canvas = document.createElement("canvas");
        const w = frameImg.naturalWidth || 1000;
        const h = frameImg.naturalHeight || 1000;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");

        // 1. Draw Frame background image
        ctx.drawImage(frameImg, 0, 0, w, h);

        const parsePercentage = (val, total) => {
          if (typeof val === "string" && val.includes("%")) {
            return (parseFloat(val) / 100) * total;
          }
          return parseFloat(val) || 0;
        };

        // 2. Draw slot photos with studio adjustments
        for (const slot of slots || []) {
          const photoData = slotPhotos[slot.id];
          const photoSrc = typeof photoData === "string" ? photoData : (photoData?.preview || photoData?.url);

          if (photoSrc) {
            const adj = slotAdjustments[slot.id] || { panX: 0, panY: 0, scale: 1.0 };
            const panX = adj.panX || 0;
            const panY = adj.panY || 0;
            const scale = adj.scale || 1.0;

            await new Promise((slotResolve) => {
              const pImg = new Image();
              pImg.crossOrigin = "anonymous";
              pImg.src = photoSrc;

              pImg.onload = () => {
                ctx.save();

                const sx = parsePercentage(slot.left, w);
                const sy = parsePercentage(slot.top, h);
                const sw = parsePercentage(slot.width, w);
                const sh = parsePercentage(slot.height, h);

                // Clip region (circle or rounded rectangle)
                ctx.beginPath();
                const radius = Math.min(12, Math.min(sw, sh) * 0.05);
                if (slot.shape === "circle") {
                  ctx.arc(sx + sw / 2, sy + sh / 2, Math.min(sw, sh) / 2, 0, Math.PI * 2);
                } else {
                  if (ctx.roundRect) {
                    ctx.roundRect(sx, sy, sw, sh, radius);
                  } else {
                    ctx.rect(sx, sy, sw, sh);
                  }
                }
                ctx.closePath();
                ctx.clip();

                // Inner Border & Outer Border calculation
                const innerBorderWidth = adj.innerBorderWidth ? Math.round((adj.innerBorderWidth / 320) * sw) : 0;
                const innerBorderColor = adj.innerBorderColor && adj.innerBorderColor !== "transparent" ? adj.innerBorderColor : null;
                const outerBorderWidth = adj.outerBorderWidth ? Math.round((adj.outerBorderWidth / 320) * sw) : 0;
                const outerBorderColor = adj.outerBorderColor && adj.outerBorderColor !== "transparent" ? adj.outerBorderColor : null;

                if (innerBorderColor) {
                  ctx.fillStyle = innerBorderColor;
                  ctx.fillRect(sx, sy, sw, sh);
                }

                const psx = sx + innerBorderWidth;
                const psy = sy + innerBorderWidth;
                const psw = Math.max(10, sw - innerBorderWidth * 2);
                const psh = Math.max(10, sh - innerBorderWidth * 2);

                ctx.save();
                ctx.beginPath();
                if (slot.shape === "circle") {
                  ctx.arc(psx + psw / 2, psy + psh / 2, Math.min(psw, psh) / 2, 0, Math.PI * 2);
                } else {
                  const innerRadius = Math.max(0, radius - innerBorderWidth * 0.5);
                  if (ctx.roundRect) ctx.roundRect(psx, psy, psw, psh, innerRadius);
                  else ctx.rect(psx, psy, psw, psh);
                }
                ctx.closePath();
                ctx.clip();

                // Object-fit calculation (cover vs contain) with pan & zoom
                const imgRatio = pImg.naturalWidth / pImg.naturalHeight;
                const slotRatio = psw / psh;
                let baseW = psw, baseH = psh;
                const fitMode = adj.fitMode || slot.objectFit || "cover";

                if (fitMode === "contain") {
                  if (imgRatio > slotRatio) {
                    baseW = psw;
                    baseH = psw / imgRatio;
                  } else {
                    baseH = psh;
                    baseW = psh * imgRatio;
                  }
                } else {
                  // cover
                  if (imgRatio > slotRatio) {
                    baseH = psh;
                    baseW = psh * imgRatio;
                  } else {
                    baseW = psw;
                    baseH = psw / imgRatio;
                  }
                }

                const dw = baseW * scale;
                const dh = baseH * scale;
                const safePanX = fitMode === "contain" && scale <= 1 ? 0 : panX;
                const safePanY = fitMode === "contain" && scale <= 1 ? 0 : panY;
                const dx = psx + (psw - dw) / 2 + (safePanX / 100) * psw;
                const dy = psy + (psh - dh) / 2 + (safePanY / 100) * psh;

                // Apply Filters
                const filterParts = [];
                if (adj.filter === "bw") filterParts.push("grayscale(100%) contrast(110%)");
                else if (adj.filter === "sepia") filterParts.push("sepia(85%) contrast(95%)");
                else if (adj.filter === "warm") filterParts.push("sepia(25%) saturate(140%) brightness(105%)");
                else if (adj.filter === "cool") filterParts.push("hue-rotate(185deg) saturate(90%) brightness(105%)");
                else if (adj.filter === "vintage") filterParts.push("sepia(35%) contrast(120%) brightness(90%) saturate(120%)");
                else if (adj.filter === "vivid") filterParts.push("saturate(160%) contrast(115%) brightness(102%)");
                else if (adj.filter === "dramatic") filterParts.push("contrast(140%) brightness(90%) saturate(110%)");
                else if (adj.filter === "fade") filterParts.push("contrast(85%) brightness(110%) saturate(85%)");

                const brightness = adj.brightness ?? 100;
                const contrast = (adj.contrast ?? 100) + Math.round((adj.sharpness || 0) * 0.4);
                const saturation = adj.saturation ?? 100;
                const blur = adj.blur || 0;

                if (brightness !== 100) filterParts.push(`brightness(${brightness}%)`);
                if (contrast !== 100) filterParts.push(`contrast(${contrast}%)`);
                if (saturation !== 100) filterParts.push(`saturate(${saturation}%)`);
                if (blur > 0) filterParts.push(`blur(${Math.max(1, Math.round(blur * (w / 1000)))}px)`);

                if (filterParts.length > 0 && ctx.filter) {
                  ctx.filter = filterParts.join(" ");
                }

                // Rotate and Flip Transform
                const totalRot = ((adj.rotate || 0) + (adj.angle || 0)) % 360;
                const flipH = Boolean(adj.flipH);
                const flipV = Boolean(adj.flipV);

                ctx.save();
                ctx.translate(dx + dw / 2, dy + dh / 2);
                if (totalRot !== 0) {
                  ctx.rotate((totalRot * Math.PI) / 180);
                }
                if (flipH || flipV) {
                  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
                }
                ctx.drawImage(pImg, -dw / 2, -dh / 2, dw, dh);
                ctx.restore();
                ctx.filter = "none";
                ctx.restore(); // Restore sub-clip

                // Draw Outer Border stroke if specified
                if (outerBorderColor && outerBorderWidth > 0) {
                  ctx.strokeStyle = outerBorderColor;
                  ctx.lineWidth = outerBorderWidth;
                  ctx.stroke();
                }

                // Draw Text Overlay
                if (adj.textOverlay?.text) {
                  ctx.save();
                  const fontSz = Math.max(14, Math.round(((adj.textOverlay.fontSize || 18) / 320) * sw));
                  const fontFam = adj.textOverlay.fontFamily || "sans-serif";
                  const isBold = adj.textOverlay.bold ? "bold " : "";
                  const isItalic = adj.textOverlay.italic ? "italic " : "";
                  ctx.font = `${isBold}${isItalic}${fontSz}px ${fontFam}`;
                  ctx.fillStyle = adj.textOverlay.color || "#ffffff";
                  ctx.textAlign = adj.textOverlay.align || "center";
                  ctx.textBaseline = "middle";

                  if (adj.textOverlay.shadow) {
                    ctx.shadowColor = "rgba(0,0,0,0.85)";
                    ctx.shadowBlur = 5;
                    ctx.shadowOffsetX = 1;
                    ctx.shadowOffsetY = 2;
                  }

                  let tx = sx + sw / 2;
                  if (adj.textOverlay.align === "left") tx = sx + fontSz * 1.2;
                  else if (adj.textOverlay.align === "right") tx = sx + sw - fontSz * 1.2;

                  let ty = sy + sh - fontSz * 1.6;
                  if (adj.textOverlay.position === "top") ty = sy + fontSz * 1.6;
                  else if (adj.textOverlay.position === "center") ty = sy + sh / 2;

                  ctx.fillText(adj.textOverlay.text, tx, ty, sw - fontSz * 1.5);
                  ctx.restore();
                }

                ctx.restore(); // Restore outer clip
                slotResolve();
              };

              pImg.onerror = () => slotResolve();
            });
          }
        }

        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
        canvas.toBlob((blob) => {
          resolve({ blob, dataUrl });
        }, "image/jpeg", 0.92);
      } catch (err) {
        console.error("Composite creation error:", err);
        resolve({ blob: null, dataUrl: null });
      }
    };

    frameImg.onerror = () => resolve({ blob: null, dataUrl: null });
  });
};

const AddProducts = () => {
  const navigate = useNavigate();
  const { id: editProductId } = useParams();
  const isEditMode = Boolean(editProductId);
  const { user, userProfile } = useAuth();
  const currentUserId =
    userProfile?.user_id ||
    userProfile?.id ||
    user?.user_id ||
    user?.id ||
    null;

  const [searchParams] = useSearchParams();
  const preSelectedFrameId = searchParams.get("frameId");

  // ==========================================
  // BASIC PRODUCT STATE
  // ==========================================
  const [uuid, setUuid] = useState(generateUuid);
  const [productId, setProductId] = useState("IQF1");
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("Photo Frames");
  const [materialType, setMaterialType] = useState("Wooden");
  const [color, setColor] = useState("Natural Wood");
  const [description, setDescription] = useState("");
  const [categoriesList, setCategoriesList] = useState([]);
  const [loadingProduct, setLoadingProduct] = useState(false);

  // ==========================================
  // SIZE VARIANTS (MRP, OFFER, STOCK)
  // ==========================================
  const [sizeVariants, setSizeVariants] = useState([
    { id: 1, size: "8 x 10 inch", mrp: "999", offerPrice: "799", stock: "50" },
    { id: 2, size: "12 x 18 inch", mrp: "1499", offerPrice: "1199", stock: "30" },
  ]);

  // ==========================================
  // ORIENTATION & MATCHING FRAMES
  // ==========================================
  const [orientation, setOrientation] = useState("Portrait");
  const [availableFrames, setAvailableFrames] = useState([]);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [loadingFrames, setLoadingFrames] = useState(false);

  // ==========================================
  // SLOT DEMO PHOTOS & ADJUSTMENTS
  // ==========================================
  const [slotPhotos, setSlotPhotos] = useState({});
  const [slotAdjustments, setSlotAdjustments] = useState({});
  const [adjustingSlot, setAdjustingSlot] = useState(null);
  const [activeDraggingSlot, setActiveDraggingSlot] = useState(null);
  const dragSlotStartRef = useRef({ x: 0, y: 0, startPanX: 0, startPanY: 0, hasMoved: false });
  const photoInputRefs = useRef({});
  const [saving, setSaving] = useState(false);

  // Pre-save preview states
  const [viewMode, setViewMode] = useState("editor"); // "editor" | "preview"
  const [mergedPreviewUrl, setMergedPreviewUrl] = useState(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);

  const invalidateMergedPreview = () => {
    setMergedPreviewUrl(null);
  };

  const handleGeneratePreview = async () => {
    if (!selectedFrame || !selectedFrame.frame_image) {
      toast.error("Please select a frame first.");
      return;
    }
    if (!Object.keys(slotPhotos).length) {
      toast.error("Please upload at least one photo before previewing.");
      return;
    }

    setGeneratingPreview(true);
    const toastId = toast.loading("Generating full merged frame preview...");
    try {
      const { dataUrl } = await createCompositeFrameImage(
        selectedFrame.frame_image,
        selectedFrame.photo_slots || [],
        slotPhotos,
        slotAdjustments
      );
      if (dataUrl) {
        setMergedPreviewUrl(dataUrl);
        setViewMode("preview");
        toast.dismiss(toastId);
        toast.success("Live merged frame preview ready!");
      } else {
        toast.dismiss(toastId);
        toast.error("Could not generate frame preview.");
      }
    } catch (err) {
      toast.dismiss(toastId);
      console.error("Preview generation error:", err);
      toast.error("Failed to generate preview.");
    } finally {
      setGeneratingPreview(false);
    }
  };

  // ==========================================
  // INITIAL FETCH: NEXT PRODUCT ID & CATEGORIES & LOAD IN EDIT MODE
  // ==========================================
  useEffect(() => {
    const fetchInitData = async () => {
      // 1. Fetch categories
      try {
        const catRes = await api.get("/categories");
        if (catRes.data?.data && Array.isArray(catRes.data.data)) {
          const categoryRows = catRes.data.data.filter(
            (cat) => cat && (cat.category_name || cat.name)
          );
          setCategoriesList(categoryRows);

          const firstCategoryName = categoryRows[0]?.category_name || categoryRows[0]?.name || "";
          if (firstCategoryName && (!category || !categoryRows.some((cat) => (cat.category_name || cat.name) === category))) {
            setCategory(firstCategoryName);
          }
        }
      } catch (err) {
        console.warn("Could not fetch categories:", err);
      }

      // 2. If in Edit Mode, fetch product
      if (isEditMode) {
        setLoadingProduct(true);
        try {
          const res = await api.get(`/products/${editProductId}`);
          const p = res.data?.data;
          if (p) {
            setUuid(p.uuid || generateUuid());
            setProductId(p.product_id || "");
            setProductName(p.product_name || "");
            setCategory(p.category || "Photo Frames");
            setMaterialType(p.material_type || "Wooden");
            setColor(p.color || "Natural Wood");
            setDescription(p.description || "");

            if (p.size_variants && Array.isArray(p.size_variants)) {
              setSizeVariants(
                p.size_variants.map((v, i) => ({
                  id: i + 1,
                  size: v.size || "",
                  mrp: String(v.mrp || ""),
                  offerPrice: String(v.offer_price || ""),
                  stock: String(v.stock || 0),
                }))
              );
            }

            setOrientation(p.orientation || "Portrait");

            if (p.frame_data) {
              setSelectedFrame(p.frame_data);
            }

            if (p.slot_photos && typeof p.slot_photos === "object") {
              const loadedPhotos = {};
              Object.entries(p.slot_photos).forEach(([slotId, url]) => {
                if (url) {
                  const actualUrl = typeof url === "string" ? url : url.url || url.preview;
                  loadedPhotos[slotId] = { preview: actualUrl, url: actualUrl };
                }
              });
              setSlotPhotos(loadedPhotos);
            }

            if (p.frame_data?.slot_adjustments && typeof p.frame_data.slot_adjustments === "object") {
              setSlotAdjustments(p.frame_data.slot_adjustments);
            } else if (p.slot_adjustments && typeof p.slot_adjustments === "object") {
              setSlotAdjustments(p.slot_adjustments);
            }
          } else {
            toast.error("Product not found");
            navigate("/admin/products");
          }
        } catch (err) {
          console.error("Failed to load product for edit:", err);
          toast.error("Failed to load product");
        } finally {
          setLoadingProduct(false);
        }
      } else {
        // Fetch next product code
        try {
          const idRes = await api.get("/products/next-id");
          if (idRes.data?.data) {
            setProductId(idRes.data.data);
          }
        } catch (err) {
          console.warn("Could not fetch next product ID:", err);
        }

        // If frameId is specified in URL params, pre-select that frame
        if (preSelectedFrameId) {
          try {
            const frameRes = await api.get(`/frames/${preSelectedFrameId}`);
            if (frameRes.data?.data) {
              const fr = frameRes.data.data;
              setSelectedFrame(fr);
              setOrientation(fr.orientation || "Portrait");
            }
          } catch (err) {
            console.warn("Could not load preselected frame:", err);
          }
        }
      }
    };

    fetchInitData();
  }, [editProductId, isEditMode, navigate, preSelectedFrameId]);

  // ==========================================
  // FETCH FRAMES WHEN ORIENTATION CHANGES
  // ==========================================
  useEffect(() => {
    const fetchFramesByOrientation = async () => {
      setLoadingFrames(true);
      try {
        const response = await api.get(`/frames?orientation=${orientation}`);
        const frames = response.data?.data || [];
        setAvailableFrames(frames);

        // Keep pre-selected frame if matching, else select first available
        if (selectedFrame && selectedFrame.orientation === orientation) {
          // keep
        } else if (!isEditMode && frames.length > 0) {
          setSelectedFrame(frames[0]);
          setSlotPhotos({});
        } else if (!isEditMode) {
          setSelectedFrame(null);
          setSlotPhotos({});
        }
      } catch (err) {
        console.error("Failed to fetch frames by orientation:", err);
      } finally {
        setLoadingFrames(false);
      }
    };

    fetchFramesByOrientation();
  }, [orientation]);

  // ==========================================
  // SIZE VARIANTS MANAGEMENT
  // ==========================================
  const addSizeVariant = () => {
    const newVariant = {
      id: Date.now(),
      size: "6 x 8 inch",
      mrp: "",
      offerPrice: "",
      stock: "10",
    };
    setSizeVariants((prev) => [...prev, newVariant]);
  };

  const updateSizeVariant = (id, field, value) => {
    setSizeVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const removeSizeVariant = (id) => {
    if (sizeVariants.length === 1) {
      toast.error("At least one size variant is required.");
      return;
    }
    setSizeVariants((prev) => prev.filter((v) => v.id !== id));
  };

  // ==========================================
  // SLOT PHOTO UPLOAD IN FRAME PREVIEW
  // ==========================================
  const handleSlotPhotoUpload = async (slotId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    const preview = URL.createObjectURL(file);

    // Save local preview immediately
    setSlotPhotos((prev) => ({
      ...prev,
      [slotId]: { file, preview, url: "" },
    }));
    const targetSlot = (selectedFrame?.photo_slots || []).find((s) => s.id === slotId);
    const defaultFit = targetSlot?.objectFit || "cover";
    setSlotAdjustments((prev) => ({
      ...prev,
      [slotId]: prev[slotId] || { panX: 0, panY: 0, scale: 1.0, fitMode: defaultFit },
    }));

    // Upload to server
    const formData = new FormData();
    formData.append("folder", "products");
    formData.append("file", file);

    try {
      const response = await api.post("/upload", formData);
      const serverUrl = response.data?.url || response.data?.urls?.[0] || "";
      setSlotPhotos((prev) => ({
        ...prev,
        [slotId]: { ...prev[slotId], url: serverUrl },
      }));
      toast.success("Slot photo uploaded!");
    } catch (err) {
      console.warn("Slot photo server upload fallback:", err);
    }
  };

  const removeSlotPhoto = (slotId) => {
    invalidateMergedPreview();
    setSlotPhotos((prev) => {
      const updated = { ...prev };
      if (updated[slotId]?.preview) {
        URL.revokeObjectURL(updated[slotId].preview);
      }
      delete updated[slotId];
      return updated;
    });
    setSlotAdjustments((prev) => {
      const updated = { ...prev };
      delete updated[slotId];
      return updated;
    });
  };

  // Direct In-Slot Drag Handlers
  const handleSlotDragStart = (slotId, e) => {
    const photo = slotPhotos[slotId];
    if (!photo) return;

    e.stopPropagation();
    setActiveDraggingSlot(slotId);
    const targetSlot = (selectedFrame?.photo_slots || []).find((s) => s.id === slotId);
    const curr = slotAdjustments[slotId] || { panX: 0, panY: 0, scale: 1.0, fitMode: targetSlot?.objectFit || "cover" };
    dragSlotStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: curr.panX || 0,
      startPanY: curr.panY || 0,
      hasMoved: false,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handleSlotDragMove = (slotId, e) => {
    if (activeDraggingSlot !== slotId) return;
    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - dragSlotStartRef.current.x;
    const dy = e.clientY - dragSlotStartRef.current.y;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragSlotStartRef.current.hasMoved = true;
    }

    const targetSlot = (selectedFrame?.photo_slots || []).find((s) => s.id === slotId);
    const curr = slotAdjustments[slotId] || { panX: 0, panY: 0, scale: 1.0, fitMode: targetSlot?.objectFit || "cover" };
    invalidateMergedPreview();
    const slotRect = e.currentTarget.getBoundingClientRect();
    const photoElement = e.currentTarget.querySelector("img");
    const photoRatio = photoElement?.naturalWidth && photoElement?.naturalHeight
      ? photoElement.naturalWidth / photoElement.naturalHeight
      : 1;
    const fitMode = curr.fitMode || targetSlot?.objectFit || "cover";
    const baseWidth = fitMode === "contain"
      ? Math.min(slotRect.width, slotRect.height * photoRatio)
      : Math.max(slotRect.width, slotRect.height * photoRatio);
    const baseHeight = fitMode === "contain"
      ? Math.min(slotRect.height, slotRect.width / photoRatio)
      : Math.max(slotRect.height, slotRect.width / photoRatio);
    const renderedWidth = baseWidth * (curr.scale || 1.0);
    const renderedHeight = baseHeight * (curr.scale || 1.0);
    const maxPanX = Math.max(0, ((renderedWidth - slotRect.width) / 2 / slotRect.width) * 100);
    const maxPanY = Math.max(0, ((renderedHeight - slotRect.height) / 2 / slotRect.height) * 100);

    const deltaPercentX = slotRect.width ? (dx / slotRect.width) * 100 : 0;
    const deltaPercentY = slotRect.height ? (dy / slotRect.height) * 100 : 0;

    const newPanX = Math.min(maxPanX, Math.max(-maxPanX, dragSlotStartRef.current.startPanX + deltaPercentX));
    const newPanY = Math.min(maxPanY, Math.max(-maxPanY, dragSlotStartRef.current.startPanY + deltaPercentY));

    setSlotAdjustments((prev) => ({
      ...prev,
      [slotId]: {
        ...curr,
        panX: Math.round(newPanX * 10) / 10,
        panY: Math.round(newPanY * 10) / 10,
      },
    }));
  };

  const handleSlotDragEnd = (slotId, e) => {
    if (activeDraggingSlot === slotId) {
      setActiveDraggingSlot(null);
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}
    }
  };

  // ==========================================
  // SUBMIT FORM WITH COMPOSITE IMAGE GENERATION
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!productName.trim()) {
      toast.error("Please enter a Product Name.");
      return;
    }

    if (!category.trim()) {
      toast.error("Please select a Category.");
      return;
    }

    // Validate size variants
    for (const v of sizeVariants) {
      if (!v.size.trim() || !v.mrp || !v.offerPrice) {
        toast.error("Please fill Size, MRP, and Offer Price for all size variants.");
        return;
      }
    }

    if (!selectedFrame) {
      toast.error(`Please select a Frame template for ${orientation} orientation.`);
      return;
    }

    if (!Object.keys(slotPhotos).length) {
      toast.error("Product photo is required. Please upload at least one photo before saving.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading(
      isEditMode
        ? "Updating composite image & product..."
        : "Generating product composite image & saving..."
    );

    try {
      // 1. Generate full composite (Frame + Photos merged on Canvas)
      let finalProductImage = selectedFrame.frame_image;
      const { blob: compositeBlob } = await createCompositeFrameImage(
        selectedFrame.frame_image,
        selectedFrame.photo_slots || [],
        slotPhotos,
        slotAdjustments
      );

      if (compositeBlob) {
        const compFormData = new FormData();
        compFormData.append("folder", "products");
        compFormData.append(
          "file",
          compositeBlob,
          `composite-${productId}-${Date.now()}.jpg`
        );

        try {
          const compRes = await api.post("/upload", compFormData);
          finalProductImage = compRes.data?.url || compRes.data?.urls?.[0] || finalProductImage;
        } catch (uploadErr) {
          console.warn("Composite upload fallback:", uploadErr);
        }
      }

      // 2. Map slot photos URL dictionary
      const slotPhotosMap = {};
      Object.keys(slotPhotos).forEach((slotId) => {
        slotPhotosMap[slotId] = slotPhotos[slotId]?.url || slotPhotos[slotId]?.preview || "";
      });

      // 3. Save or Update Product
      const payload = {
        uuid,
        product_id: productId,
        product_name: productName.trim(),
        category: category.trim(),
        material_type: materialType,
        color: color,
        description: description.trim(),
        size_variants: sizeVariants.map((v) => ({
          size: v.size.trim(),
          mrp: Number(v.mrp),
          offer_price: Number(v.offerPrice),
          stock: Number(v.stock || 0),
        })),
        orientation,
        frame_id: selectedFrame.id,
        frame_data: {
          id: selectedFrame.id,
          frame_name: selectedFrame.frame_name,
          frame_image: selectedFrame.frame_image,
          photo_slots: selectedFrame.photo_slots || [],
          slot_adjustments: slotAdjustments,
        },
        slot_photos: slotPhotosMap,
        slot_adjustments: slotAdjustments,
        product_images: [finalProductImage, selectedFrame.frame_image],
        status: "Active",
        created_by: currentUserId,
        updated_by: currentUserId,
      };

      let response;
      if (isEditMode) {
        response = await api.put(`/products/${editProductId}`, payload);
      } else {
        response = await api.post("/products", payload);
      }

      if (response.data?.success) {
        toast.dismiss(toastId);
        toast.success(
          isEditMode
            ? `Product ${productId} updated successfully!`
            : `Product ${productId} saved with complete frame & photo layout!`
        );
        navigate("/admin/products");
      } else {
        toast.dismiss(toastId);
        toast.error(response.data?.message || "Failed to save product.");
      }
    } catch (error) {
      toast.dismiss(toastId);
      console.error("Create/update product error:", error);
      toast.error(error.response?.data?.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6]">
        <div className="text-center">
          <div className="mb-2 text-3xl">📦</div>
          <p className="text-sm font-semibold text-[#555]">Loading product details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-4 md:p-6">
      <div className="mx-auto max-w-[1480px]">
        {/* ================= HEADER ================= */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#e8d9ba] bg-[#fffaf2] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9b6b2d]">
              <Sparkles className="h-3.5 w-3.5" />
              {isEditMode ? "Edit Product" : "Product Catalog Studio"}
            </div>
            <h1 className="text-[2.1rem] font-bold tracking-[-0.05em] text-[#1f1f1f]">
              {isEditMode ? `Edit Product: ${productName || productId}` : "Add New Product"}
            </h1>
            <p className="mt-1 text-[13px] text-[#6b6b6b]">
              {isEditMode
                ? "Update product pricing, size stock matrix, frame selection, and slot photos."
                : "Configure product details, size-wise pricing & stock, select frame by orientation, and place demo photos."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/frames"
              className="inline-flex items-center gap-2 rounded-xl border border-[#d4a843] bg-[#fffaf0] px-4 py-2.5 text-[14px] font-semibold text-[#8b6528] shadow-sm transition hover:bg-[#fff5e0]"
            >
              <Eye className="h-4 w-4" />
              View Frames
            </Link>

            <Link
              to="/admin/frames/add"
              className="inline-flex items-center gap-2 rounded-xl border border-[#d4a843] bg-[#fffaf0] px-4 py-2.5 text-[14px] font-semibold text-[#8b6528] shadow-sm transition hover:bg-[#fff5e0]"
            >
              <Layers className="h-4 w-4" />
              Frame Setup
            </Link>

            <Link
              to="/admin/products"
              className="inline-flex items-center gap-2 rounded-xl border border-[#e6ddd1] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#2a2a2a] shadow-sm transition hover:bg-[#faf7f3]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Products
            </Link>
          </div>
        </div>

        {/* ================= MAIN FORM ================= */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-12">
            {/* LEFT COLUMN: PRODUCT SPECS & SIZES (6 COLS) */}
            <div className="space-y-6 xl:col-span-6">
              {/* SECTION 1: PRODUCT DETAILS */}
              <div className="rounded-[22px] border border-[#ebe3d7] bg-white p-5 shadow-sm md:p-6">
                <div className="mb-5 flex items-center gap-3 border-b border-[#f0ebe3] pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f3ef] text-[#1a3c36]">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#202020]">
                      Product Details
                    </h2>
                    <p className="text-xs text-[#8a8a8a]">
                      General specifications and catalog info
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* UUID */}
                  

                  {/* AUTO PRODUCT CODE */}
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
                      Product ID
                    </label>
                    <input
                      type="text"
                      value={productId}
                      readOnly={!isEditMode}
                      onChange={(e) => setProductId(e.target.value)}
                      className="h-11 w-full rounded-xl border border-[#e8e1d9] bg-[#f8f7f5] px-3 font-mono text-sm font-bold text-[#1a3c36] outline-none"
                    />
                  </div>

                  {/* PRODUCT NAME */}
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g. Vintage Teakwood Memories Frame"
                      className="h-11 w-full rounded-xl border border-[#e8e1d9] bg-white px-3.5 text-sm font-medium text-[#222] shadow-sm outline-none transition focus:border-[#d4a553]"
                      required
                    />
                  </div>

                  {/* CATEGORY */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="h-11 w-full rounded-xl border border-[#e8e1d9] bg-white px-3 text-sm text-[#222] shadow-sm outline-none transition focus:border-[#d4a553]"
                    >
                      {!categoriesList.length && <option value="">Select a category</option>}
                      {categoriesList.map((cat) => (
                        <option key={cat.category_id || cat.id} value={cat.category_name || cat.name}>
                          {cat.category_name || cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* MATERIAL */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
                      Material Type
                    </label>
                    <select
                      value={materialType}
                      onChange={(e) => setMaterialType(e.target.value)}
                      className="h-11 w-full rounded-xl border border-[#e8e1d9] bg-white px-3 text-sm text-[#222] shadow-sm outline-none transition focus:border-[#d4a553]"
                    >
                      {materialOptions.map((mat) => (
                        <option key={mat} value={mat}>
                          {mat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* COLOR */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
                      Color Finish
                    </label>
                    <select
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-11 w-full rounded-xl border border-[#e8e1d9] bg-white px-3 text-sm text-[#222] shadow-sm outline-none transition focus:border-[#d4a553]"
                    >
                      {colorOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* DESCRIPTION */}
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Write a concise product summary..."
                      className="w-full rounded-xl border border-[#e8e1d9] bg-white p-3 text-sm text-[#222] shadow-sm outline-none transition focus:border-[#d4a553]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: SIZE VARIANTS (MRP, OFFER PRICE, STOCK) */}
              <div className="rounded-[22px] border border-[#ebe3d7] bg-white p-5 shadow-sm md:p-6">
                <div className="mb-4 flex items-center justify-between border-b border-[#f0ebe3] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fffaf0] text-[#b87840]">
                      <Coins className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#202020]">
                        Size-Wise Pricing & Stock
                      </h2>
                      <p className="text-xs text-[#8a8a8a]">
                        Define MRP, Selling Offer Price, and Stock for each available dimension
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addSizeVariant}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a3c36] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#235048]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Size
                  </button>
                </div>

                <div className="space-y-3">
                  {sizeVariants.map((variant, index) => (
                    <div
                      key={variant.id}
                      className="flex flex-col gap-3 rounded-xl border border-[#ece4d9] bg-[#fcfbfa] p-3.5 sm:flex-row sm:items-center sm:gap-2"
                    >
                      {/* SIZE SELECT / INPUT */}
                      <div className="flex-1">
                        <label className="mb-1 block text-[11px] font-semibold text-[#666]">
                          Size {index + 1}
                        </label>
                        <input
                          type="text"
                          list="standard-sizes-list"
                          value={variant.size}
                          onChange={(e) =>
                            updateSizeVariant(variant.id, "size", e.target.value)
                          }
                          placeholder="e.g. 8 x 10 inch"
                          className="h-9 w-full rounded-lg border border-[#e2d9cf] bg-white px-2.5 text-xs font-medium text-[#222] outline-none focus:border-[#d4a553]"
                        />
                        <datalist id="standard-sizes-list">
                          {defaultStandardSizes.map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      </div>

                      {/* MRP */}
                      <div className="w-full sm:w-28">
                        <label className="mb-1 block text-[11px] font-semibold text-[#666]">
                          MRP (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={variant.mrp}
                          onChange={(e) =>
                            updateSizeVariant(variant.id, "mrp", e.target.value)
                          }
                          placeholder="999"
                          className="h-9 w-full rounded-lg border border-[#e2d9cf] bg-white px-2.5 text-xs text-[#222] outline-none focus:border-[#d4a553]"
                        />
                      </div>

                      {/* OFFER PRICE */}
                      <div className="w-full sm:w-28">
                        <label className="mb-1 block text-[11px] font-semibold text-[#666]">
                          Offer (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={variant.offerPrice}
                          onChange={(e) =>
                            updateSizeVariant(variant.id, "offerPrice", e.target.value)
                          }
                          placeholder="799"
                          className="h-9 w-full rounded-lg border border-[#e2d9cf] bg-white px-2.5 text-xs font-bold text-[#1a3c36] outline-none focus:border-[#d4a553]"
                        />
                      </div>

                      {/* STOCK */}
                      <div className="w-full sm:w-24">
                        <label className="mb-1 block text-[11px] font-semibold text-[#666]">
                          Stock
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={variant.stock}
                          onChange={(e) =>
                            updateSizeVariant(variant.id, "stock", e.target.value)
                          }
                          placeholder="25"
                          className="h-9 w-full rounded-lg border border-[#e2d9cf] bg-white px-2.5 text-xs text-[#222] outline-none focus:border-[#d4a553]"
                        />
                      </div>

                      {/* DELETE */}
                      <div className="flex sm:pt-4">
                        <button
                          type="button"
                          onClick={() => removeSizeVariant(variant.id)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                          title="Remove size"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: ORIENTATION, FRAME SELECTOR & LIVE SLOT PHOTO UPLOADER (6 COLS) */}
            <div className="space-y-6 xl:col-span-6">
              {/* SECTION 3: ORIENTATION & FRAME PICKER */}
              <div className="rounded-[22px] border border-[#ebe3d7] bg-white p-5 shadow-sm md:p-6">
                <div className="mb-4 flex items-center justify-between border-b border-[#f0ebe3] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f46e5]">
                      <Frame className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#202020]">
                        Orientation & Frame Template
                      </h2>
                      <p className="text-xs text-[#8a8a8a]">
                        Filters matching frames created in Frame Setup
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-[#f0f4f2] px-3 py-1 text-xs font-bold text-[#1a3c36]">
                    {availableFrames.length} {orientation} Frame{availableFrames.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* ORIENTATION TOGGLES */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
                    Select Orientation
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Portrait", "Landscape", "Square"].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setOrientation(item)}
                        className={`flex h-11 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition ${
                          orientation === item
                            ? "border-[#1a3c36] bg-[#1a3c36] text-white shadow-sm"
                            : "border-[#e5dfd5] bg-[#faf8f5] text-[#555] hover:border-[#d4a553]"
                        }`}
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {/* MATCHING FRAMES CAROUSEL / GRID */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
                    Choose Frame Template
                  </label>

                  {loadingFrames ? (
                    <div className="py-8 text-center text-xs text-[#888]">
                      Loading {orientation} frames...
                    </div>
                  ) : availableFrames.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#e2d9cd] bg-[#faf8f5] p-6 text-center">
                      <div className="mb-2 text-2xl">🖼️</div>
                      <p className="text-xs font-bold text-[#444]">
                        No {orientation} Frame Templates found.
                      </p>
                      <p className="mt-1 text-xs text-[#888]">
                        Create a {orientation} frame template in the Frame Setup page first.
                      </p>
                      <Link
                        to="/admin/products/frame-setup"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#1a3c36] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create {orientation} Frame
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {availableFrames.map((fr) => {
                        const isSelected = selectedFrame?.id === fr.id;
                        return (
                          <div
                            key={fr.id}
                            onClick={() => {
                              setSelectedFrame(fr);
                              setSlotPhotos({});
                            }}
                            className={`group relative cursor-pointer overflow-hidden rounded-xl border p-2 text-center transition ${
                              isSelected
                                ? "border-[#1a3c36] bg-[#eef6f3] ring-2 ring-[#1a3c36]/20"
                                : "border-[#e6ddd1] bg-[#faf9f8] hover:border-[#d4a553] hover:bg-white"
                            }`}
                          >
                            <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg bg-white p-1">
                              <img
                                src={fr.frame_image}
                                alt={fr.frame_name}
                                className="h-full w-full object-contain"
                              />
                            </div>
                            <p className="mt-2 truncate text-xs font-bold text-[#222]">
                              {fr.frame_name}
                            </p>
                            <p className="text-[10px] text-[#777]">
                              {fr.photo_slots?.length || 0} Photo Position{fr.photo_slots?.length !== 1 ? "s" : ""}
                            </p>

                            {isSelected && (
                              <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#1a3c36] text-white shadow">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 4: LIVE FRAME PREVIEW & SLOT PHOTO PLACEMENT CANVAS */}
              {selectedFrame && (
                <div className="rounded-[22px] border border-[#ebe3d7] bg-white p-5 shadow-sm md:p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#f0ebe3] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0f0] text-[#c93b3b]">
                        <ImagePlus className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-[#202020]">
                          Demo Photo Placement
                        </h2>
                        <p className="text-xs text-[#8a8a8a]">
                          {viewMode === "editor"
                            ? "Click slots on the frame below to upload and adjust demo photos"
                            : "Exact final composite image preview before adding"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="hidden sm:inline-block rounded-full bg-[#fff7e8] px-3 py-1 text-xs font-bold text-[#8b6528]">
                        {Object.keys(slotPhotos).length} / {selectedFrame.photo_slots?.length || 0} Filled
                      </span>

                      {/* MODE SWITCH TABS: SLOT EDITOR vs PREVIEW */}
                      <div className="flex items-center rounded-xl border border-[#d8cfc3] bg-[#faf8f5] p-1">
                        <button
                          type="button"
                          onClick={() => setViewMode("editor")}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                            viewMode === "editor"
                              ? "bg-[#1a3c36] text-white shadow-xs"
                              : "text-[#555] hover:text-[#1a3c36]"
                          }`}
                        >
                          <Move className="h-3 w-3 text-[#d5a65a]" /> Slot Editor
                        </button>
                        <button
                          type="button"
                          onClick={handleGeneratePreview}
                          disabled={generatingPreview || !Object.keys(slotPhotos).length}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                            viewMode === "preview"
                              ? "bg-[#1a3c36] text-white shadow-xs"
                              : "text-[#555] hover:text-[#1a3c36]"
                          }`}
                          title="Generate and view exact merged frame before adding product"
                        >
                          <Eye className="h-3 w-3 text-[#b07838]" />
                          {generatingPreview ? "Generating..." : "Preview Merged Frame"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {viewMode === "preview" && mergedPreviewUrl ? (
                    <div className="relative flex min-h-[380px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#e8dfd2] bg-[#f5f1eb] p-5">
                      <div className="mb-3 flex w-full max-w-[480px] items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800 shadow-2xs">
                          <Check className="h-3.5 w-3.5" /> Full Merged Frame Preview Ready
                        </span>
                        <button
                          type="button"
                          onClick={() => setViewMode("editor")}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#d8d0c5] bg-white px-2.5 py-1 text-xs font-bold text-[#1a3c36] shadow-2xs hover:bg-[#faf7f3] cursor-pointer"
                        >
                          ← Back to Slot Editor
                        </button>
                      </div>

                      <div className="relative mx-auto w-full max-w-[480px] overflow-hidden rounded-xl shadow-2xl">
                        <img
                          src={mergedPreviewUrl}
                          alt="Full Merged Frame Preview"
                          className="block h-auto w-full select-none"
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-center text-xs text-[#666]">
                        <span>🔍 This is the exact composite photo that will be saved and displayed to customers in the shop.</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* FRAME CANVAS */}
                  <div className="relative flex min-h-[380px] items-center justify-center overflow-hidden rounded-2xl border border-[#e8dfd2] bg-[#f5f1eb] p-4">
                    <div className="relative mx-auto w-full max-w-[460px] overflow-hidden rounded-lg shadow-md">
                      {/* FRAME BACKGROUND */}
                      <img
                        src={selectedFrame.frame_image}
                        alt={selectedFrame.frame_name}
                        className="block h-auto w-full select-none"
                      />

                      {/* PHOTO SLOTS */}
                      {(selectedFrame.photo_slots || []).map((slot, index) => {
                        const uploaded = slotPhotos[slot.id];

                        return (
                          <React.Fragment key={slot.id}>
                            <input
                              ref={(el) => {
                                photoInputRefs.current[slot.id] = el;
                              }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleSlotPhotoUpload(slot.id, e)}
                            />

                            <div
                              className="absolute overflow-hidden border-2 border-dashed border-blue-500 bg-white/75 shadow-md backdrop-blur-[1px] select-none"
                              style={{
                                top: slot.top,
                                left: slot.left,
                                width: slot.width,
                                height: slot.height,
                                borderRadius: slot.shape === "circle" ? "9999px" : "6px",
                              }}
                            >
                              {uploaded ? (
                                <div
                                  onPointerDown={(e) => handleSlotDragStart(slot.id, e)}
                                  onPointerMove={(e) => handleSlotDragMove(slot.id, e)}
                                  onPointerUp={(e) => handleSlotDragEnd(slot.id, e)}
                                  onPointerCancel={(e) => handleSlotDragEnd(slot.id, e)}
                                  className={`group relative h-full w-full overflow-hidden ${
                                    activeDraggingSlot === slot.id ? "cursor-grabbing" : "cursor-grab"
                                  }`}
                                  title="Drag to reposition photo"
                                >
                                  {(() => {
                                    const adj = slotAdjustments[slot.id] || { panX: 0, panY: 0, scale: 1.0 };
                                    const fitMode = adj.fitMode || slot.objectFit || "cover";
                                    const isContain = fitMode === "contain";
                                    const imageScale = adj.scale || 1.0;
                                    const safePanX = isContain && imageScale <= 1 ? 0 : adj.panX || 0;
                                    const safePanY = isContain && imageScale <= 1 ? 0 : adj.panY || 0;
                                    const rot = ((adj.rotate || 0) + (adj.angle || 0)) % 360;

                                    const filterParts = [];
                                    if (adj.filter === "bw") filterParts.push("grayscale(100%) contrast(110%)");
                                    else if (adj.filter === "sepia") filterParts.push("sepia(85%) contrast(95%)");
                                    else if (adj.filter === "warm") filterParts.push("sepia(25%) saturate(140%) brightness(105%)");
                                    else if (adj.filter === "cool") filterParts.push("hue-rotate(185deg) saturate(90%) brightness(105%)");
                                    else if (adj.filter === "vintage") filterParts.push("sepia(35%) contrast(120%) brightness(90%) saturate(120%)");
                                    else if (adj.filter === "vivid") filterParts.push("saturate(160%) contrast(115%) brightness(102%)");
                                    else if (adj.filter === "dramatic") filterParts.push("contrast(140%) brightness(90%) saturate(110%)");
                                    else if (adj.filter === "fade") filterParts.push("contrast(85%) brightness(110%) saturate(85%)");

                                    if (adj.brightness && adj.brightness !== 100) filterParts.push(`brightness(${adj.brightness}%)`);
                                    if (adj.contrast && adj.contrast !== 100) filterParts.push(`contrast(${adj.contrast}%)`);
                                    if (adj.saturation && adj.saturation !== 100) filterParts.push(`saturate(${adj.saturation}%)`);
                                    if (adj.blur > 0) filterParts.push(`blur(${adj.blur}px)`);
                                    if (adj.sharpness > 0) filterParts.push(`contrast(${100 + Math.round(adj.sharpness * 0.4)}%)`);

                                    return (
                                      <div
                                        className="relative h-full w-full overflow-hidden"
                                        style={{
                                          backgroundColor: adj.innerBorderColor && adj.innerBorderColor !== "transparent" ? adj.innerBorderColor : "transparent",
                                          padding: adj.innerBorderWidth ? `${adj.innerBorderWidth}px` : "0px",
                                          boxShadow: adj.outerBorderWidth && adj.outerBorderColor !== "transparent"
                                            ? `inset 0 0 0 ${adj.outerBorderWidth}px ${adj.outerBorderColor}`
                                            : "none",
                                        }}
                                      >
                                        <img
                                          src={uploaded.preview}
                                          alt={slot.name}
                                          draggable={false}
                                          className="pointer-events-none absolute h-full w-full select-none object-center origin-center"
                                          style={{
                                            top: `calc(50% + ${safePanY}%)`,
                                            left: `calc(50% + ${safePanX}%)`,
                                            objectFit: isContain ? "contain" : "cover",
                                            transform: `translate(-50%, -50%) scale(${imageScale}) rotate(${rot}deg) scaleX(${ 
                                              adj.flipH ? -1 : 1
                                            }) scaleY(${adj.flipV ? -1 : 1})`,
                                            filter: filterParts.length ? filterParts.join(" ") : "none",
                                            transition: activeDraggingSlot === slot.id ? "none" : "transform 0.08s ease-out, filter 0.2s ease",
                                          }}
                                        />
                                        {adj.textOverlay?.text && (
                                          <div
                                            className={`pointer-events-none absolute left-1 right-1 flex z-10 ${
                                              adj.textOverlay.position === "top"
                                                ? "top-1.5"
                                                : adj.textOverlay.position === "center"
                                                ? "top-1/2 -translate-y-1/2"
                                                : "bottom-1.5"
                                            } ${
                                              adj.textOverlay.align === "left"
                                                ? "justify-start"
                                                : adj.textOverlay.align === "right"
                                                ? "justify-end"
                                                : "justify-center"
                                            }`}
                                          >
                                            <span
                                              className="px-1.5 py-0.5 truncate text-center max-w-full"
                                              style={{
                                                fontFamily: adj.textOverlay.fontFamily || "inherit",
                                                fontSize: `${Math.max(10, Math.min(18, adj.textOverlay.fontSize || 14))}px`,
                                                color: adj.textOverlay.color || "#ffffff",
                                                fontWeight: adj.textOverlay.bold ? "bold" : "normal",
                                                fontStyle: adj.textOverlay.italic ? "italic" : "normal",
                                                textShadow: adj.textOverlay.shadow ? "0 1px 3px rgba(0,0,0,0.85)" : "none",
                                              }}
                                            >
                                              {adj.textOverlay.text}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  {/* HOVER OVERLAY: ADJUST, FIT/FILL & CHANGE */}
                                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition group-hover:opacity-100 z-20 p-1">
                                    <button
                                      type="button"
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAdjustingSlot(slot);
                                      }}
                                      className="rounded-md bg-white/95 px-2 py-1 text-[10px] font-bold text-[#1a3c36] shadow hover:bg-white flex items-center gap-1 cursor-pointer"
                                      title="Reposition & Zoom demo photo"
                                    >
                                      <Move className="h-3 w-3 text-[#b07838]" /> Adjust
                                    </button>

                                    <button
                                      type="button"
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const curr = slotAdjustments[slot.id] || { panX: 0, panY: 0, scale: 1.0 };
                                        const nextMode = (curr.fitMode || slot.objectFit || "cover") === "contain" ? "cover" : "contain";
                                        setSlotAdjustments((prev) => ({
                                          ...prev,
                                          [slot.id]: { ...curr, fitMode: nextMode, panX: 0, panY: 0, scale: 1.0 },
                                        }));
                                        invalidateMergedPreview();
                                        toast.success(nextMode === "contain" ? "Fit Full Image mode" : "Fill Frame mode");
                                      }}
                                      className="rounded-md bg-white/95 px-2 py-1 text-[10px] font-bold text-[#333] shadow hover:bg-white flex items-center gap-1 cursor-pointer"
                                      title="Toggle between showing full image vs filling frame"
                                    >
                                      {(slotAdjustments[slot.id]?.fitMode || slot.objectFit || "cover") === "contain" ? "Fill Frame" : "Fit Full"}
                                    </button>

                                    <button
                                      type="button"
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        photoInputRefs.current[slot.id]?.click();
                                      }}
                                      className="rounded-md bg-[#1a3c36] px-2 py-1 text-[10px] font-bold text-white shadow hover:bg-[#235048] flex items-center gap-1 cursor-pointer"
                                      title="Change photo file"
                                    >
                                      <UploadCloud className="h-3 w-3 text-white" /> Change
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => photoInputRefs.current[slot.id]?.click()}
                                  title={`Upload demo photo for: ${slot.name}`}
                                  className="flex h-full w-full flex-col items-center justify-center p-1 text-center hover:bg-white/95"
                                >
                                  <span className="text-sm sm:text-lg">📷</span>
                                  <span className="mt-0.5 rounded bg-white/90 px-1 py-0.5 text-[9px] font-bold text-[#1a3c36] shadow-xs">
                                    {slot.name}
                                  </span>
                                </button>
                              )}
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* SLOT LIST ACTIONS */}
                  <div className="mt-4 space-y-2">
                    {(selectedFrame.photo_slots || []).map((slot, idx) => {
                      const uploaded = slotPhotos[slot.id];
                      return (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between rounded-xl border border-[#e8e2d8] bg-[#faf8f5] px-3 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1a3c36] text-[10px] font-bold text-white">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-[#333]">
                              {slot.name}
                            </span>
                            {uploaded ? (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                                Photo Added
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#888]">
                                Empty
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {uploaded && (
                              <button
                                type="button"
                                onClick={() => setAdjustingSlot(slot)}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#d8d0c5] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1a3c36] hover:bg-[#faf7f3]"
                                title="Drag and adjust photo position & zoom"
                              >
                                <Move className="h-3 w-3 text-[#b07838]" /> Adjust
                              </button>
                            )}
                            {uploaded && (
                              <button
                                type="button"
                                onClick={() => {
                                  const curr = slotAdjustments[slot.id] || { panX: 0, panY: 0, scale: 1.0 };
                                  const nextMode = (curr.fitMode || slot.objectFit || "cover") === "contain" ? "cover" : "contain";
                                  setSlotAdjustments((prev) => ({
                                    ...prev,
                                    [slot.id]: { ...curr, fitMode: nextMode, panX: 0, panY: 0, scale: 1.0 },
                                  }));
                                  invalidateMergedPreview();
                                  toast.success(nextMode === "contain" ? "Fit Full Image mode" : "Fill Frame mode");
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#d8d0c5] bg-white px-2 py-1 text-[11px] font-semibold text-[#555] hover:bg-[#faf7f3]"
                                title="Toggle fit full image vs fill frame"
                              >
                                {(slotAdjustments[slot.id]?.fitMode || slot.objectFit || "cover") === "contain" ? "Fill Frame" : "Fit Full"}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => photoInputRefs.current[slot.id]?.click()}
                              className="rounded-lg border border-[#d8d0c5] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#333] hover:bg-[#faf7f3]"
                            >
                              {uploaded ? "Change" : "Upload"}
                            </button>
                            {uploaded && (
                              <button
                                type="button"
                                onClick={() => removeSlotPhoto(slot.id)}
                                className="rounded-lg p-1 text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ================= ACTION BUTTONS FOOTER ================= */}
          <div className="flex flex-col-reverse gap-3 rounded-2xl border-t border-[#e5dfd4] bg-white px-5 py-4 shadow-sm sm:flex-row sm:justify-end">
            <Link
              to="/admin/products"
              className="inline-flex items-center justify-center rounded-xl border border-[#ddd3c8] bg-[#faf8f5] px-6 py-3 text-sm font-semibold text-[#333] transition hover:bg-[#f2ece5]"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={handleGeneratePreview}
              disabled={generatingPreview || !Object.keys(slotPhotos).length}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1a3c36] bg-white px-6 py-3 text-sm font-bold text-[#1a3c36] shadow-xs transition hover:bg-[#f0f6f4] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              title="Preview the exact combined product image before adding"
            >
              <Eye className="h-4 w-4 text-[#b07838]" />
              {generatingPreview ? "Generating Preview..." : "Preview Merged Frame"}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a3c36] px-8 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(26,60,54,0.18)] transition hover:bg-[#224e47] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving
                ? isEditMode
                  ? "Updating Product..."
                  : "Saving Product..."
                : isEditMode
                ? "Update Product"
                : "Save Product"}
            </button>
          </div>
        </form>

        {/* PHOTO ADJUST MODAL FOR ADMIN DEMO PHOTOS */}
        {Boolean(adjustingSlot) && (
          <PhotoAdjustModal
            isOpen={Boolean(adjustingSlot)}
            onClose={() => setAdjustingSlot(null)}
            photoSrc={
              slotPhotos[adjustingSlot.id]?.preview || slotPhotos[adjustingSlot.id]?.url
            }
            slot={adjustingSlot}
            initialAdjustment={{
              panX: 0,
              panY: 0,
              scale: 1.0,
              fitMode: adjustingSlot.objectFit || "cover",
              ...(slotAdjustments[adjustingSlot.id] || {}),
            }}
            onSave={(adj) => {
              if (adjustingSlot) {
                setSlotAdjustments((prev) => ({
                  ...prev,
                  [adjustingSlot.id]: adj,
                }));
                invalidateMergedPreview();
                toast.success(`Position updated for ${adjustingSlot.name || "slot"}!`);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default AddProducts;
