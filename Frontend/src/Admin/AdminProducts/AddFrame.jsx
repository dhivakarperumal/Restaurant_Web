import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Code,
  Eye,
  Frame,
  ImagePlus,
  Layers,
  Move,
  Plus,
  RotateCw,
  Save,
  Trash2,
  UploadCloud,
  X,
  Pencil
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

const AddFrame = () => {
  const navigate = useNavigate();
  const { id: editFrameId } = useParams();
  const isEditMode = Boolean(editFrameId);
  const { user, userProfile } = useAuth();
  const currentUserId =
    userProfile?.user_id ||
    userProfile?.id ||
    user?.user_id ||
    user?.id ||
    null;

  // ==========================================
  // FRAME TEMPLATE STATE
  // ==========================================
  const [uuid, setUuid] = useState(generateUuid);
  const [frameName, setFrameName] = useState("");
  const [orientation, setOrientation] = useState("Portrait");
  const [frameImage, setFrameImage] = useState(null); // { file, preview, url }
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingFrame, setLoadingFrame] = useState(false);

  // ==========================================
  // PHOTO SLOTS STATE
  // ==========================================
  const [photoSlots, setPhotoSlots] = useState([]);
  const [slotTestPhotos, setSlotTestPhotos] = useState({});
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const frameInputRef = useRef(null);
  const photoInputRefs = useRef({});

  // ==========================================
  // LOAD FRAME DATA IN EDIT MODE
  // ==========================================
  useEffect(() => {
    if (!isEditMode) return;

    const fetchFrameDetails = async () => {
      setLoadingFrame(true);
      try {
        const response = await api.get(`/frames/${editFrameId}`);
        const data = response.data?.data;
        if (data) {
          setUuid(data.uuid || generateUuid());
          setFrameName(data.frame_name || "");
          setOrientation(data.orientation || "Portrait");
          if (data.frame_image) {
            setFrameImage({
              file: null,
              preview: data.frame_image,
              url: data.frame_image,
            });
          }
          setPhotoSlots(Array.isArray(data.photo_slots) ? data.photo_slots : []);
        } else {
          toast.error("Frame template not found");
          navigate("/admin/frames");
        }
      } catch (err) {
        console.error("Failed to load frame for edit:", err);
        toast.error("Failed to load frame data");
      } finally {
        setLoadingFrame(false);
      }
    };

    fetchFrameDetails();
  }, [editFrameId, isEditMode, navigate]);

  // ==========================================
  // UPLOAD FRAME BACKGROUND IMAGE
  // ==========================================
  const handleFrameFileUpload = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (JPG, PNG, WEBP).");
      return;
    }

    const preview = URL.createObjectURL(file);
    setFrameImage({
      file,
      preview,
      url: "",
    });

    // Upload to server
    const formData = new FormData();
    formData.append("folder", "frames");
    formData.append("file", file);

    setIsUploadingImage(true);
    try {
      const response = await api.post("/upload", formData);
      const serverUrl = response?.data?.url || response?.data?.urls?.[0] || "";
      setFrameImage((prev) => ({
        ...prev,
        url: serverUrl,
      }));
      toast.success("Frame image uploaded successfully!");
    } catch (error) {
      console.error("Frame image upload error:", error);
      toast.error("Image upload failed, local preview will be used.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFrameInputChange = (e) => {
    const file = e.target.files?.[0];
    handleFrameFileUpload(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFrameFileUpload(file);
  };

  const removeFrameImage = () => {
    if (frameImage?.preview) {
      URL.revokeObjectURL(frameImage.preview);
    }
    setFrameImage(null);
    if (frameInputRef.current) {
      frameInputRef.current.value = "";
    }
  };

  // ==========================================
  // PHOTO SLOTS MANAGEMENT
  // ==========================================
  const addPhotoSlot = () => {
    const slotNumber = photoSlots.length + 1;

    // Default sensible layout staggered by slot count
    const defaultTop = slotNumber === 1 ? "15%" : slotNumber === 2 ? "55%" : "35%";
    const defaultLeft = slotNumber === 3 ? "55%" : "15%";

    const newSlot = {
      id: `slot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `Photo Position ${slotNumber}`,
      top: defaultTop,
      left: defaultLeft,
      width: "70%",
      height: "30%",
      shape: "rectangle", // rectangle | circle
      objectFit: "cover", // cover | contain
    };

    setPhotoSlots((prev) => [...prev, newSlot]);
    toast.success(`Photo Position ${slotNumber} added!`);
  };

  const updatePhotoSlot = (id, field, value) => {
    setPhotoSlots((prev) =>
      prev.map((slot) => (slot.id === id ? { ...slot, [field]: value } : slot))
    );
  };

  const removePhotoSlot = (id) => {
    setPhotoSlots((prev) => prev.filter((slot) => slot.id !== id));
    setSlotTestPhotos((prev) => {
      const updated = { ...prev };
      if (updated[id]?.preview) {
        URL.revokeObjectURL(updated[id].preview);
      }
      delete updated[id];
      return updated;
    });
  };

  // Test slot photo upload (for previewing during design)
  const handleSlotTestPhoto = (slotId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setSlotTestPhotos((prev) => {
      if (prev[slotId]?.preview) {
        URL.revokeObjectURL(prev[slotId].preview);
      }
      return {
        ...prev,
        [slotId]: { file, preview },
      };
    });
  };

  // ==========================================
  // SUBMIT / SAVE / UPDATE FRAME TEMPLATE
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!frameName.trim()) {
      toast.error("Please enter a Frame Name.");
      return;
    }

    if (!frameImage || (!frameImage.url && !frameImage.preview)) {
      toast.error("Please upload a Frame background image.");
      return;
    }

    if (photoSlots.length === 0) {
      toast.error("Please add at least one photo position slot.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        uuid,
        frame_name: frameName.trim(),
        orientation,
        frame_image: frameImage.url || frameImage.preview,
        photo_slots: photoSlots.map((slot, index) => ({
          id: slot.id,
          name: slot.name || `Photo ${index + 1}`,
          top: slot.top,
          left: slot.left,
          width: slot.width,
          height: slot.height,
          shape: slot.shape,
          objectFit: slot.objectFit,
        })),
        status: "Active",
        created_by: currentUserId,
        updated_by: currentUserId,
      };

      let response;
      if (isEditMode) {
        response = await api.put(`/frames/${editFrameId}`, payload);
      } else {
        response = await api.post("/frames", payload);
      }

      if (response.data?.success) {
        toast.success(
          isEditMode
            ? "Frame template updated successfully!"
            : "Frame template created successfully!"
        );
        navigate("/admin/frames");
      } else {
        toast.error(response.data?.message || "Failed to save frame template.");
      }
    } catch (error) {
      console.error("Save frame error:", error);
      toast.error(error.response?.data?.message || "Failed to save frame template.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (frameImage?.preview) {
      URL.revokeObjectURL(frameImage.preview);
    }
    Object.values(slotTestPhotos).forEach((p) => {
      if (p?.preview) URL.revokeObjectURL(p.preview);
    });

    setFrameName("");
    setOrientation("Portrait");
    setFrameImage(null);
    setPhotoSlots([]);
    setSlotTestPhotos({});
    if (frameInputRef.current) frameInputRef.current.value = "";
    toast.success("Form cleared.");
  };

  if (loadingFrame) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6]">
        <div className="text-center">
          <div className="mb-2 text-3xl">🖼️</div>
          <p className="text-sm font-semibold text-[#555]">Loading frame template details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-4 md:p-6">
      <div className="mx-auto max-w-[1440px]">
        {/* ================= HEADER ================= */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#e8d9ba] bg-[#fffaf2] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9b6b2d]">
              <Layers className="h-3.5 w-3.5" />
              {isEditMode ? "Edit Frame Template" : "Frame Template Builder"}
            </div>
            <h1 className="text-[2.1rem] font-bold tracking-[-0.05em] text-[#1f1f1f]">
              {isEditMode ? `Edit Frame: ${frameName || "Template"}` : "Add Frame Setup"}
            </h1>
            <p className="mt-1 text-[13px] text-[#6b6b6b]">
              {isEditMode
                ? "Update background design, orientation, and photo position coordinates."
                : "Design a reusable frame template with background image, orientation, and configurable photo positions."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/frames"
              className="inline-flex items-center gap-2 rounded-xl border border-[#e6ddd1] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#2a2a2a] shadow-sm transition hover:bg-[#faf7f3]"
            >
              <ArrowLeft className="h-4 w-4" />
              View Frames
            </Link>
          </div>
        </div>

        {/* ================= MAIN FORM ================= */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-5">
              {/* BASIC DETAILS */}
              <div className="rounded-[22px] border border-[#ebe3d7] bg-white p-5 shadow-sm md:p-6">
                <div className="mb-5 flex items-center gap-3 border-b border-[#f0ebe3] pb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff3df] text-[#b06a22]">
                    <Frame className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#202020]">
                      Frame Information
                    </h2>
                    <p className="text-xs text-[#8a8a8a]">
                      Define the template name and orientation
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
                      Frame Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={frameName}
                      onChange={(e) => setFrameName(e.target.value)}
                      placeholder="e.g. Wedding Triple Portrait Frame"
                      className="h-11 w-full rounded-xl border border-[#e8e1d9] bg-white px-3.5 text-sm font-medium text-[#222] shadow-sm outline-none transition focus:border-[#d4a553]"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#6b6b6b]">
                      Orientation <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Portrait", "Landscape", "Square"].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setOrientation(item)}
                          className={`flex h-11 items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition ${
                            orientation === item
                              ? "border-[#1a3c36] bg-[#1a3c36] text-white shadow-sm"
                              : "border-[#e5dfd5] bg-[#faf8f5] text-[#555] hover:border-[#d4a553]"
                          }`}
                        >
                          <RotateCw className="h-3 w-3" />
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-[22px] border border-[#ebe3d7] bg-white p-5 shadow-sm md:p-6">
                <div className="mb-4 flex items-center justify-between border-b border-[#f0ebe3] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f3ef] text-[#1a3c36]">
                      <ImagePlus className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#202020]">
                        Frame Background Image <span className="text-red-500">*</span>
                      </h2>
                      <p className="text-xs text-[#8a8a8a]">
                        Upload high-res PNG or JPG frame border/cutout
                      </p>
                    </div>
                  </div>

                  {frameImage && (
                    <button
                      type="button"
                      onClick={removeFrameImage}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </div>

                <input
                  ref={frameInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFrameInputChange}
                  className="hidden"
                />

                {!frameImage ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => frameInputRef.current?.click()}
                    className={`flex min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
                      isDragging
                        ? "border-[#1a3c36] bg-[#eef6f3]"
                        : "border-[#d8d0c5] bg-[#f9f8f6] hover:border-[#d4a553] hover:bg-[#fffcf7]"
                    }`}
                  >
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#1a3c36] shadow-sm">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-bold text-[#2d2d2d]">
                      Click or drag & drop frame image
                    </p>
                    <p className="mt-1 text-xs text-[#888]">
                      Supports PNG, JPG, WEBP (Max 20MB)
                    </p>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl border border-[#e5ded4] bg-[#f4f1ec] p-3 text-center">
                    <img
                      src={frameImage.preview}
                      alt="Frame Template"
                      className="mx-auto max-h-[220px] rounded-lg object-contain"
                    />
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => frameInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9d0c5] bg-white px-3 py-1.5 text-xs font-semibold text-[#333] shadow-sm hover:bg-[#faf7f3]"
                      >
                        <ImagePlus className="h-3.5 w-3.5" />
                        Change Image
                      </button>
                      {isUploadingImage && (
                        <span className="text-xs text-amber-600">Uploading...</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: PHOTO POSITIONS & PREVIEW - TWO COLUMNS */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* LEFT COLUMN: PHOTO POSITIONS (SCROLLABLE) */}
            <div className="lg:col-span-5 lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto">
              {/* PHOTO POSITIONS SETTINGS */}
              <div className="rounded-[22px] border border-[#ebe3d7] bg-white p-5 shadow-sm md:p-6">
                <div className="mb-4 flex items-center justify-between border-b border-[#f0ebe3] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0f0] text-[#c93b3b]">
                      <Move className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#202020]">
                        Photo Positions ({photoSlots.length})
                      </h2>
                      <p className="text-xs text-[#8a8a8a]">
                        Configure position, dimension & shape
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addPhotoSlot}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a3c36] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#235048]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Slot
                  </button>
                </div>

                {photoSlots.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#e2dacd] bg-[#faf8f5] p-6 text-center">
                    <p className="text-xs font-medium text-[#777]">
                      No photo positions defined yet. Click "+ Add Slot" above to define photo areas on this frame.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[500px] space-y-4 overflow-y-auto pr-1">
                    {photoSlots.map((slot, index) => (
                      <div
                        key={slot.id}
                        className="rounded-xl border border-[#e6ddd1] bg-[#fbf9f6] p-4 shadow-sm"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1a3c36] text-[11px] font-bold text-white">
                              {index + 1}
                            </span>
                            <span className="text-xs font-bold text-[#333]">
                              {slot.name}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => removePhotoSlot(slot.id)}
                            className="rounded-md p-1 text-red-500 hover:bg-red-50"
                            title="Remove position"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* SLOT NAME */}
                        <div className="mb-3">
                          <label className="mb-1 block text-[11px] font-semibold text-[#666]">
                            Slot Label
                          </label>
                          <input
                            type="text"
                            value={slot.name}
                            onChange={(e) => updatePhotoSlot(slot.id, "name", e.target.value)}
                            className="h-8 w-full rounded-lg border border-[#e2dad0] bg-white px-2.5 text-xs text-[#222] outline-none focus:border-[#d4a553]"
                          />
                        </div>

                        {/* POSITION TOP / LEFT */}
                        <div className="mb-3 grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-[#666]">
                              Top Position (%)
                            </label>
                            <input
                              type="text"
                              value={slot.top}
                              onChange={(e) => updatePhotoSlot(slot.id, "top", e.target.value)}
                              placeholder="20%"
                              className="h-8 w-full rounded-lg border border-[#e2dad0] bg-white px-2.5 text-xs text-[#222] outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-[#666]">
                              Left Position (%)
                            </label>
                            <input
                              type="text"
                              value={slot.left}
                              onChange={(e) => updatePhotoSlot(slot.id, "left", e.target.value)}
                              placeholder="20%"
                              className="h-8 w-full rounded-lg border border-[#e2dad0] bg-white px-2.5 text-xs text-[#222] outline-none"
                            />
                          </div>
                        </div>

                        {/* SIZE WIDTH / HEIGHT */}
                        <div className="mb-3 grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-[#666]">
                              Width (%)
                            </label>
                            <input
                              type="text"
                              value={slot.width}
                              onChange={(e) => updatePhotoSlot(slot.id, "width", e.target.value)}
                              placeholder="60%"
                              className="h-8 w-full rounded-lg border border-[#e2dad0] bg-white px-2.5 text-xs text-[#222] outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-[#666]">
                              Height (%)
                            </label>
                            <input
                              type="text"
                              value={slot.height}
                              onChange={(e) => updatePhotoSlot(slot.id, "height", e.target.value)}
                              placeholder="25%"
                              className="h-8 w-full rounded-lg border border-[#e2dad0] bg-white px-2.5 text-xs text-[#222] outline-none"
                            />
                          </div>
                        </div>

                        {/* SHAPE & OBJECT FIT */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-[#666]">
                              Shape
                            </label>
                            <select
                              value={slot.shape}
                              onChange={(e) => updatePhotoSlot(slot.id, "shape", e.target.value)}
                              className="h-8 w-full rounded-lg border border-[#e2dad0] bg-white px-2 text-xs text-[#222] outline-none"
                            >
                              <option value="rectangle">Rectangle</option>
                              <option value="circle">Circle / Oval</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-semibold text-[#666]">
                              Photo Fit
                            </label>
                            <select
                              value={slot.objectFit}
                              onChange={(e) => updatePhotoSlot(slot.id, "objectFit", e.target.value)}
                              className="h-8 w-full rounded-lg border border-[#e2dad0] bg-white px-2 text-xs text-[#222] outline-none"
                            >
                              <option value="cover">Cover (Fill)</option>
                              <option value="contain">Contain (Fit)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: LIVE INTERACTIVE CANVAS PREVIEW */}
            <div className="space-y-6 lg:col-span-7">
              <div className="sticky top-6 rounded-[22px] border border-[#ebe3d7] bg-white p-5 shadow-sm md:p-6">
                <div className="mb-4 flex items-center justify-between border-b border-[#f0ebe3] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f46e5]">
                      <Eye className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#202020]">
                        Interactive Live Preview Canvas
                      </h2>
                      <p className="text-xs text-[#8a8a8a]">
                        Click slot areas on the frame to test upload demo photos
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowJsonPreview(!showJsonPreview)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2d9cd] bg-[#faf8f5] px-3 py-1.5 text-xs font-semibold text-[#444] hover:bg-[#f0ebe3]"
                  >
                    <Code className="h-3.5 w-3.5" />
                    {showJsonPreview ? "Hide JSON" : "View JSON"}
                  </button>
                </div>

                {/* CANVAS WORKSPACE */}
                <div className="relative flex min-h-[460px] items-center justify-center overflow-hidden rounded-2xl border border-[#e8dfd2] bg-[#f5f1eb] p-6">
                  {!frameImage ? (
                    <div className="text-center">
                      <div className="mb-3 text-4xl">🖼️</div>
                      <p className="text-sm font-bold text-[#555]">
                        Upload a frame image to activate preview
                      </p>
                      <p className="mt-1 text-xs text-[#888]">
                        Position markers and slots will appear overlaid on top of the image
                      </p>
                    </div>
                  ) : (
                    <div className="relative mx-auto w-full max-w-[550px] overflow-hidden rounded-lg shadow-md">
                      {/* FRAME BACKGROUND */}
                      <img
                        src={frameImage.preview}
                        alt="Frame Preview"
                        className="block h-auto w-full select-none"
                      />

                      {/* DYNAMIC PHOTO SLOTS */}
                      {photoSlots.map((slot, index) => {
                        const testPhoto = slotTestPhotos[slot.id];

                        return (
                          <React.Fragment key={slot.id}>
                            {/* Hidden file input for test upload */}
                            <input
                              ref={(el) => {
                                photoInputRefs.current[slot.id] = el;
                              }}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleSlotTestPhoto(slot.id, e)}
                            />

                            {/* Slot Button */}
                            <button
                              type="button"
                              onClick={() => photoInputRefs.current[slot.id]?.click()}
                              title={`Click to test upload photo for: ${slot.name}`}
                              className="absolute overflow-hidden border-2 border-dashed border-blue-500/90 bg-white/75 shadow-md backdrop-blur-[1px] transition hover:bg-white/95"
                              style={{
                                top: slot.top,
                                left: slot.left,
                                width: slot.width,
                                height: slot.height,
                                borderRadius: slot.shape === "circle" ? "9999px" : "8px",
                              }}
                            >
                              {testPhoto ? (
                                <img
                                  src={testPhoto.preview}
                                  alt={slot.name}
                                  className="h-full w-full"
                                  style={{ objectFit: slot.objectFit }}
                                />
                              ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center p-1 text-center">
                                  <span className="text-base sm:text-xl">📷</span>
                                  <span className="mt-0.5 rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-[#1a3c36] shadow-xs">
                                    {slot.name}
                                  </span>
                                  <span className="text-[9px] text-[#555]">
                                    {slot.width} × {slot.height}
                                  </span>
                                </div>
                              )}
                            </button>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* JSON PREVIEW ACCORDION */}
                {showJsonPreview && (
                  <div className="mt-4 rounded-xl border border-[#2d3748] bg-[#1a202c] p-4 text-xs text-emerald-400">
                    <div className="mb-2 font-mono font-bold text-white">
                      JSON Template Config:
                    </div>
                    <pre className="max-h-60 overflow-auto font-mono text-[11px] leading-relaxed">
                      {JSON.stringify(
                        {
                          uuid,
                          frame_name: frameName,
                          orientation,
                          frame_image: frameImage?.url || frameImage?.file?.name || "",
                          photo_slots: photoSlots,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================= ACTION BUTTONS FOOTER ================= */}
          <div className="flex flex-col-reverse gap-3 rounded-2xl border-t border-[#e5dfd4] bg-white px-5 py-4 shadow-sm sm:flex-row sm:justify-end">
            <Link
              to="/admin/frames"
              className="inline-flex items-center justify-center rounded-xl border border-[#ddd3c8] bg-[#faf8f5] px-6 py-3 text-sm font-semibold text-[#333] transition hover:bg-[#f2ece5]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a3c36] px-8 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(26,60,54,0.18)] transition hover:bg-[#224e47] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving
                ? isEditMode
                  ? "Updating Frame..."
                  : "Saving Frame..."
                : isEditMode
                ? "Update Frame Template"
                : "Save Frame Template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFrame;
