import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit3,
  Gift,
  Image as ImageIcon,
  ImagePlus,
  LayoutGrid,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Table2,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import api from "../api";
import toast from "react-hot-toast";

const categories = [
  "Birthday Gift Box",
  "Anniversary Gift Box",
  "Wedding Gift Box",
  "Love Gift Box",
  "Couple Gift Box",
  "Baby Shower Gift Box",
  "Friendship Gift Box",
  "Corporate Gift Box",
  "Festival Gift Box",
  "Personalized Gift Box",
  "Surprise Gift Box",
];

const blankForm = {
  name: "",
  code: "",
  category: categories[0],
  subCategory: "Premium Collection",
  description: "",
  brand: "Q Frames Prima Shop",
  material: "Rigid cardboard",
  size: "Medium",
  color: "Warm white",
  theme: "Classic celebration",
  boxType: "Magnetic closure",
  purchasePrice: "",
  mrp: "",
  sellingPrice: "",
  offerPrice: "",
  discount: "",
  tax: "18",
  openingStock: "0",
  currentStock: "0",
  minimumStock: "5",
  stockStatus: "Available",
  customerName: true,
  photoUpload: true,
  customMessage: true,
  greetingCard: false,
  items: [],
  image: "",
  images: [],
};

const initialBoxes = [
  {
    id: "GBX001",
    name: "The Memory Keeper",
    category: "Personalized Gift Box",
    subCategory: "Premium Collection",
    description:
      "A thoughtful keepsake box for photographs and handwritten memories.",
    brand: "Q Frames Prima Shop",
    material: "Rigid cardboard",
    size: "Large",
    color: "Sage green",
    theme: "Memory lane",
    boxType: "Magnetic closure",
    purchasePrice: 680,
    mrp: 1899,
    sellingPrice: 1499,
    offerPrice: 1299,
    discount: 13,
    tax: 18,
    openingStock: 40,
    currentStock: 24,
    minimumStock: 8,
    stockStatus: "Available",
    customerName: true,
    photoUpload: true,
    customMessage: true,
    greetingCard: true,
    items: [
      {
        name: "Classic 6x8 Frame",
        quantity: 1,
        purchasePrice: 360,
        sellingPrice: 699,
        image: "/images/1.png",
      },
      {
        name: "Memory Card Set",
        quantity: 1,
        purchasePrice: 85,
        sellingPrice: 199,
        image: "/images/2.png",
      },
    ],
    image: "/images/1.png",
    orders: 32,
    salesToday: 3897,
  },
  {
    id: "GBX002",
    name: "Birthday Cheer Box",
    category: "Birthday Gift Box",
    subCategory: "Celebrations",
    description:
      "Bright, playful gifting with a frame and celebration essentials.",
    brand: "Q Frames Prima Shop",
    material: "Kraft board",
    size: "Medium",
    color: "Sunshine yellow",
    theme: "Birthday cheer",
    boxType: "Drawer box",
    purchasePrice: 420,
    mrp: 1299,
    sellingPrice: 999,
    offerPrice: 849,
    discount: 15,
    tax: 18,
    openingStock: 60,
    currentStock: 7,
    minimumStock: 10,
    stockStatus: "Low Stock",
    customerName: true,
    photoUpload: true,
    customMessage: true,
    greetingCard: true,
    items: [
      {
        name: "Desk Frame",
        quantity: 1,
        purchasePrice: 220,
        sellingPrice: 449,
        image: "/images/3.png",
      },
      {
        name: "Birthday Card",
        quantity: 1,
        purchasePrice: 30,
        sellingPrice: 99,
        image: "/images/1.png",
      },
    ],
    image: "/images/3.png",
    orders: 18,
    salesToday: 849,
  },
  {
    id: "GBX003",
    name: "Two Of Us",
    category: "Couple Gift Box",
    subCategory: "Love & Togetherness",
    description:
      "A refined couple's gift set made for a shared favorite photograph.",
    brand: "Q Frames Prima Shop",
    material: "Textured board",
    size: "Medium",
    color: "Blush pink",
    theme: "Togetherness",
    boxType: "Ribbon tie",
    purchasePrice: 510,
    mrp: 1599,
    sellingPrice: 1199,
    offerPrice: 1199,
    discount: 0,
    tax: 18,
    openingStock: 25,
    currentStock: 0,
    minimumStock: 5,
    stockStatus: "Out of Stock",
    customerName: true,
    photoUpload: true,
    customMessage: true,
    greetingCard: false,
    items: [
      {
        name: "Couple Frame",
        quantity: 1,
        purchasePrice: 310,
        sellingPrice: 599,
        image: "/images/4.png",
      },
    ],
    image: "/images/4.png",
    orders: 11,
    salesToday: 0,
  },
];

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const statusForStock = (stock, minimum) => {
  if (Number(stock) <= 0) return "Out of Stock";
  if (Number(stock) <= Number(minimum || 0)) return "Low Stock";
  return "Available";
};

const normalizeGiftBox = (giftBox) => ({
  ...giftBox,
  id: giftBox.gift_box_id || giftBox.id,
  code: giftBox.gift_box_id || giftBox.id,
  subCategory: giftBox.sub_category || giftBox.subCategory || "",
  items: Array.isArray(giftBox.gift_items)
    ? giftBox.gift_items
    : Array.isArray(giftBox.items)
      ? giftBox.items
      : [],
  mrp: Number(giftBox.mrp || 0),
  discount: Number(giftBox.discount_percentage ?? giftBox.discount ?? 0),
  sellingPrice: Number(giftBox.selling_price ?? giftBox.sellingPrice ?? 0),
  currentStock: Number(giftBox.current_stock ?? giftBox.currentStock ?? 0),
  stockStatus: giftBox.stock_status || giftBox.stockStatus || "Available",
  image: giftBox.image || giftBox.images?.[0] || "",
  images: Array.isArray(giftBox.images) ? giftBox.images : [],
});

const statusClasses = {
  Available: "bg-[#e8f6ed] text-[#237548]",
  "Low Stock": "bg-[#fff4db] text-[#a66a00]",
  "Out of Stock": "bg-[#feeceb] text-[#bb3f3b]",
};

const Field = ({ label, children, wide = false }) => (
  <label className={wide ? "sm:col-span-2" : ""}>
    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#7c837f]">
      {label}
    </span>
    {children}
  </label>
);

const inputClass =
  "w-full rounded-lg border border-[#dedfd9] bg-white px-3 py-2.5 text-sm text-[#23312e] outline-none transition placeholder:text-[#abb0aa] focus:border-[#2d7560] focus:ring-2 focus:ring-[#2d7560]/10";

const GiftBoxManagement = () => {
  const navigate = useNavigate();
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [stockFilter, setStockFilter] = useState("All Stock Status");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortBy, setSortBy] = useState("latest");
  const [viewMode, setViewMode] = useState("table");
  const [page, setPage] = useState(1);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [giftCategories, setGiftCategories] = useState([]);
  const [itemDraft, setItemDraft] = useState({
    name: "",
    quantity: 1,
    mrp: "",
    offerPrice: "",
    sellingPrice: "",
    image: "/images/1.png",
  });
  const [stockModalBox, setStockModalBox] = useState(null);
  const [stockAdjustmentType, setStockAdjustmentType] = useState("reduce");
  const [stockAdjustmentAmount, setStockAdjustmentAmount] = useState(1);
  const [stockSubmitting, setStockSubmitting] = useState(false);
  const pageSize = 6;

  useEffect(() => {
    const loadGiftBoxes = async () => {
      try {
        const response = await api.get("/gift-boxes");
        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        setBoxes(rows.map(normalizeGiftBox));
      } catch (error) {
        console.error("Could not load gift boxes:", error);
      } finally {
        setLoading(false);
      }
    };

    loadGiftBoxes();
  }, []);

  useEffect(() => {
    const loadGiftCategories = async () => {
      try {
        const response = await api.get("/categories");
        const categoryRows = Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        const giftRows = categoryRows.filter((category) => {
          const type = String(category.category_type || "")
            .trim()
            .toLowerCase();
          return type === "gift" || type === "gifts";
        });
        setGiftCategories(giftRows);
      } catch (error) {
        console.warn("Could not load gift categories:", error);
      }
    };

    loadGiftCategories();
  }, []);

  const filteredBoxes = useMemo(
    () =>
      boxes
        .filter((box) => {
        const query = search.toLowerCase();
        const matchesSearch =
          !query ||
          [box.id, box.name, box.category].some((value) =>
            String(value).toLowerCase().includes(query),
          );
        const matchesCategory =
          categoryFilter === "All Categories" ||
          box.category === categoryFilter;
        const matchesStock =
          stockFilter === "All Stock Status" || box.stockStatus === stockFilter;
        const matchesStatus =
          statusFilter === "All Status" || (box.status || "Active") === statusFilter;
        return matchesSearch && matchesCategory && matchesStock && matchesStatus;
      })
      .sort((first, second) => {
        if (sortBy === "name") return first.name.localeCompare(second.name);
        if (sortBy === "stock-low") return first.currentStock - second.currentStock;
        return new Date(second.created_at || 0) - new Date(first.created_at || 0);
      }),
    [boxes, search, categoryFilter, stockFilter, statusFilter, sortBy],
  );

  const totalPages = Math.max(1, Math.ceil(filteredBoxes.length / pageSize));
  const pageBoxes = filteredBoxes.slice((page - 1) * pageSize, page * pageSize);
  const totalStock = boxes.reduce(
    (sum, box) => sum + Number(box.currentStock || 0),
    0,
  );
  const lowStock = boxes.filter(
    (box) => box.stockStatus === "Low Stock",
  ).length;
  const outOfStock = boxes.filter(
    (box) => box.stockStatus === "Out of Stock",
  ).length;
  const totalOrders = boxes.reduce(
    (sum, box) => sum + Number(box.orders || 0),
    0,
  );
  const todaySales = boxes.reduce(
    (sum, box) => sum + Number(box.salesToday || 0),
    0,
  );

  const updateForm = (field, value) =>
    setForm((previous) => ({ ...previous, [field]: value }));
  const handlePricingChange = (field, value) => {
    setForm((previous) => {
      const next = { ...previous, [field]: value };
      if (field === "mrp" || field === "discount") {
        const mrp = Number(next.mrp || 0);
        const discount = Number(next.discount || 0);
        next.sellingPrice =
          mrp > 0 ? Math.round(mrp * (1 - discount / 100)) : "";
      }
      return next;
    });
  };
  const categoryOptions = giftCategories.length
    ? giftCategories.map((category) => category.category_name).filter(Boolean)
    : categories;
  const openAdd = () => {
    setEditingId(null);
    setForm({
      ...blankForm,
      code: `GBX${String(boxes.length + 1).padStart(3, "0")}`,
    });
    setIsPanelOpen(true);
  };

  const openEdit = (box) => {
    setEditingId(box.id);
    setForm({
      ...blankForm,
      ...box,
      images: Array.isArray(box.images)
        ? box.images
        : box.image
          ? [box.image]
          : [],
      code: box.id,
    });
    setIsPanelOpen(true);
  };

  const handleGiftImagesUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploadingImages(true);
    try {
      const data = new FormData();
      data.append("folder", "gifts");
      files.forEach((file) => data.append("files", file));
      const response = await api.post("/upload", data);
      const uploadedImages = Array.isArray(response.data?.urls)
        ? response.data.urls
        : response.data?.url
          ? [response.data.url]
          : [];
      if (uploadedImages.length) {
        setForm((previous) => ({
          ...previous,
          images: [...(previous.images || []), ...uploadedImages],
          image: previous.image || uploadedImages[0],
        }));
      }
    } catch (error) {
      console.error("Gift image upload failed:", error);
    } finally {
      setUploadingImages(false);
      event.target.value = "";
    }
  };

  const removeGiftImage = (index) => {
    setForm((previous) => {
      const images = (previous.images || []).filter(
        (_, imageIndex) => imageIndex !== index,
      );
      return { ...previous, images, image: images[0] || "" };
    });
  };

  const saveBox = async (event) => {
    event.preventDefault();
    const nextBox = {
      ...form,
      id:
        editingId ||
        form.code ||
        `GBX${String(boxes.length + 1).padStart(3, "0")}`,
      image: form.images?.[0] || form.image || "",
      images: form.images || (form.image ? [form.image] : []),
      purchasePrice: Number(form.purchasePrice || 0),
      mrp: Number(form.mrp || 0),
      sellingPrice: Number(form.sellingPrice || 0),
      offerPrice: Number(form.offerPrice || 0),
      discount: Number(form.discount || 0),
      tax: Number(form.tax || 0),
      openingStock: Number(form.openingStock || 0),
      currentStock: Number(form.currentStock || 0),
      minimumStock: Number(form.minimumStock || 0),
      stockStatus: statusForStock(form.currentStock, form.minimumStock),
      orders: editingId
        ? boxes.find((box) => box.id === editingId)?.orders || 0
        : 0,
      salesToday: editingId
        ? boxes.find((box) => box.id === editingId)?.salesToday || 0
        : 0,
    };
    const payload = {
      gift_box_id: nextBox.id,
      name: nextBox.name,
      category: nextBox.category,
      sub_category: nextBox.subCategory,
      description: nextBox.description,
      material: nextBox.material,
      box_size: nextBox.size,
      color: nextBox.color,
      theme: nextBox.theme,
      box_type: nextBox.boxType,
      mrp: nextBox.mrp,
      discount_percentage: nextBox.discount,
      current_stock: nextBox.currentStock,
      image: nextBox.image,
      images: nextBox.images,
      customization: {
        customerName: nextBox.customerName,
        photoUpload: nextBox.photoUpload,
        customMessage: nextBox.customMessage,
        greetingCard: nextBox.greetingCard,
      },
      gift_items: nextBox.items,
    };

    try {
      const response = editingId
        ? await api.put(`/gift-boxes/${editingId}`, payload)
        : await api.post("/gift-boxes", payload);
      const savedBox = response.data?.data;
      if (savedBox) {
        const normalized = normalizeGiftBox(savedBox);
        setBoxes((previous) =>
          editingId
            ? previous.map((box) => (box.id === editingId ? normalized : box))
            : [normalized, ...previous],
        );
        toast.success(editingId ? "Gift box updated successfully!" : "Gift box created successfully!");
      }
      setIsPanelOpen(false);
    } catch (error) {
      console.error("Could not save gift box:", error);
      toast.error(error.response?.data?.message || "Failed to save gift box");
    }
  };

  const handleItemPricingChange = (field, value) => {
    setItemDraft((previous) => {
      const next = { ...previous, [field]: value };
      if (field === "mrp" || field === "offerPrice") {
        const mrp = Number(next.mrp || 0);
        const offerPrice = Number(next.offerPrice || 0);
        next.sellingPrice = mrp >= offerPrice ? mrp - offerPrice : 0;
      }
      return next;
    });
  };

  const addItem = () => {
    if (!itemDraft.name.trim()) return;
    updateForm("items", [
      ...form.items,
      {
        ...itemDraft,
        quantity: Number(itemDraft.quantity || 1),
        mrp: Number(itemDraft.mrp || 0),
        offerPrice: Number(itemDraft.offerPrice || 0),
        sellingPrice: Number(itemDraft.sellingPrice || 0),
      },
    ]);
    setItemDraft({
      name: "",
      quantity: 1,
      mrp: "",
      offerPrice: "",
      sellingPrice: "",
      image: "/images/1.png",
    });
  };

  const updateGiftItem = (index, field, value) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const next = { ...item, [field]: value };
        if (field === "mrp" || field === "offerPrice") {
          const mrp = Number(next.mrp || next.purchasePrice || 0);
          const offerPrice = Number(next.offerPrice || 0);
          next.sellingPrice = mrp >= offerPrice ? mrp - offerPrice : 0;
        }
        return next;
      }),
    }));
  };

  const replaceGiftItemImage = async (event, index) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingImages(true);
    try {
      const data = new FormData();
      data.append("folder", "gifts");
      data.append("file", file);
      const response = await api.post("/upload", data);
      const uploadedImage = response.data?.url || response.data?.urls?.[0] || "";
      if (uploadedImage) updateGiftItem(index, "image", uploadedImage);
    } catch (error) {
      console.error("Gift item image replacement failed:", error);
    } finally {
      setUploadingImages(false);
      event.target.value = "";
    }
  };

  const handleItemImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImages(true);
    try {
      const data = new FormData();
      data.append("folder", "gifts");
      data.append("file", file);
      const response = await api.post("/upload", data);
      const uploadedImage =
        response.data?.url || response.data?.urls?.[0] || "";
      if (uploadedImage)
        setItemDraft((previous) => ({ ...previous, image: uploadedImage }));
    } catch (error) {
      console.error("Gift item image upload failed:", error);
    } finally {
      setUploadingImages(false);
      event.target.value = "";
    }
  };

  const removeItem = (index) =>
    updateForm(
      "items",
      form.items.filter((_, itemIndex) => itemIndex !== index),
    );

  const deleteBox = async (id) => {
    if (!window.confirm("Delete this gift box?")) return;
    try {
      await api.delete(`/gift-boxes/${id}`);
      setBoxes((previous) => previous.filter((box) => box.id !== id));
      toast.success("Gift box deleted successfully!");
    } catch (error) {
      console.error("Could not delete gift box:", error);
      toast.error(error.response?.data?.message || "Failed to delete gift box");
    }
  };

  const handleQuickStock = async (boxId, action, amount = 1) => {
    try {
      const response = await api.patch(`/gift-boxes/${boxId}/stock`, {
        action,
        amount,
      });
      if (response.data?.success && response.data?.data) {
        const updated = normalizeGiftBox(response.data.data);
        setBoxes((previous) =>
          previous.map((box) =>
            box.id === updated.id || box.code === updated.id || box.gift_box_id === updated.id
              ? updated
              : box
          )
        );
        toast.success(
          action === "reduce"
            ? `Stock reduced by ${amount} (New stock: ${updated.currentStock})`
            : `Stock increased by ${amount} (New stock: ${updated.currentStock})`
        );
      }
    } catch (error) {
      console.error("Could not adjust stock:", error);
      toast.error(error.response?.data?.message || "Failed to adjust stock");
    }
  };

  const openStockModal = (box) => {
    setStockModalBox(box);
    setStockAdjustmentType("reduce");
    setStockAdjustmentAmount(1);
  };

  const handleStockModalSubmit = async (e) => {
    e.preventDefault();
    if (!stockModalBox) return;

    const amount = Math.max(0, Number(stockAdjustmentAmount || 0));
    setStockSubmitting(true);
    try {
      const payload =
        stockAdjustmentType === "set"
          ? { stock: amount }
          : { action: stockAdjustmentType, amount };

      const response = await api.patch(`/gift-boxes/${stockModalBox.id}/stock`, payload);
      if (response.data?.success && response.data?.data) {
        const updated = normalizeGiftBox(response.data.data);
        setBoxes((previous) =>
          previous.map((box) =>
            box.id === updated.id || box.code === updated.id || box.gift_box_id === updated.id
              ? updated
              : box
          )
        );
        toast.success(`Stock updated successfully! New stock: ${updated.currentStock}`);
        setStockModalBox(null);
      }
    } catch (error) {
      console.error("Failed to update stock:", error);
      toast.error(error.response?.data?.message || "Failed to update stock");
    } finally {
      setStockSubmitting(false);
    }
  };

  const statCards = [
    {
      label: "Total Gift Boxes",
      value: boxes.length,
      icon: Gift,
      accent: "#28745f",
      note: "Active catalog",
    },
    {
      label: "Available Stock",
      value: totalStock,
      icon: Package,
      accent: "#3477a5",
      note: "Units ready",
    },
    {
      label: "Low Stock Items",
      value: lowStock,
      icon: AlertTriangle,
      accent: "#c58a28",
      note: "Need attention",
    },
    {
      label: "Out of Stock",
      value: outOfStock,
      icon: Archive,
      accent: "#c45a57",
      note: "Restock required",
    },
    {
      label: "Gift Box Orders",
      value: totalOrders,
      icon: ShoppingBag,
      accent: "#805b9e",
      note: "All time",
    },
    {
      label: "Today's Sales",
      value: money(todaySales),
      icon: CalendarDays,
      accent: "#c06c45",
      note: "Across gift boxes",
    },
  ];

  return (
    <div className="min-h-full bg-[#f4f6f2] text-[#23312e]">
      <div className="mx-auto max-w-[1580px] space-y-5 p-1 sm:p-2 lg:p-4">
        <header className="flex flex-col gap-4 rounded-2xl border border-[#e1e6df] bg-[#fbfcfa] px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#698279]">
              <Gift className="h-4 w-4 text-[#c1843b]" /> Q Frames Prima Shop
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1e302b] sm:text-3xl">
              Gift Box Management
            </h1>
            <p className="mt-1 text-sm text-[#718079]">
              Manage gift boxes, products, stock, pricing and customization
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1f5d4d] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#174b3e] focus:outline-none focus:ring-2 focus:ring-[#1f5d4d]/30"
          >
            <Plus className="h-4 w-4" /> Add New Gift Box
          </button>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {statCards.map(({ label, value, icon: Icon, accent, note }) => (
            <div
              key={label}
              className="relative flex min-h-[150px] flex-col overflow-hidden rounded-xl border border-[#e1e6df] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-1 items-start gap-4">
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: accent }}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <div className="min-w-0 pt-1">
                  <p className="text-sm font-medium text-[#374151]">{label}</p>
                  <p className="mt-2 truncate text-2xl font-bold leading-none text-[#111827]">
                    {value}
                  </p>
                  <p className="mt-4 text-xs font-medium text-[#77837c]">{note}</p>
                </div>
              </div>
              <div
                className="pointer-events-none absolute bottom-0 left-0 h-6 w-full"
                style={{
                  backgroundColor: `${accent}55`,
                  clipPath: "ellipse(65% 75% at 55% 100%)",
                }}
              />
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#e1e6df] bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[#edf0eb] px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ba69f]" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search gift boxes..."
                  className={`${inputClass} h-10 pl-9 sm:w-full sm:max-w-[420px]`}
                />
              </label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <label className="relative">
                <select
                  value={categoryFilter}
                  onChange={(event) => {
                    setCategoryFilter(event.target.value);
                    setPage(1);
                  }}
                  className={`${inputClass} h-10 appearance-none pr-9 sm:w-48`}
                >
                  <option>All Categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#89948d]" />
              </label>
              <label className="relative">
                <select
                  value={stockFilter}
                  onChange={(event) => {
                    setStockFilter(event.target.value);
                    setPage(1);
                  }}
                  className={`${inputClass} h-10 appearance-none pr-9 sm:w-40`}
                >
                  <option>All Stock Status</option>
                  <option>Available</option>
                  <option>Low Stock</option>
                  <option>Out of Stock</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#89948d]" />
              </label>
              <label className="relative">
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                  className={`${inputClass} h-10 appearance-none pr-9 sm:w-36`}
                >
                  <option>All Status</option>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#89948d]" />
              </label>
              <label className="relative">
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className={`${inputClass} h-10 appearance-none pr-9 sm:w-40`}
                >
                  <option value="latest">Sort by: Latest</option>
                  <option value="name">Sort by: Name</option>
                  <option value="stock-low">Sort by: Stock</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#89948d]" />
              </label>
              <div className="flex h-10 overflow-hidden rounded-lg border border-[#dfe5df] bg-white">
                <button type="button" onClick={() => setViewMode("table")} title="Table view" className={`flex w-10 items-center justify-center ${viewMode === "table" ? "bg-[#1f5d4d] text-white" : "text-[#718079] hover:bg-[#f3f7f3]"}`}><Table2 className="h-4 w-4" /></button>
                <button type="button" onClick={() => setViewMode("grid")} title="Grid view" className={`flex w-10 items-center justify-center ${viewMode === "grid" ? "bg-[#1f5d4d] text-white" : "text-[#718079] hover:bg-[#f3f7f3]"}`}><LayoutGrid className="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          <div className={viewMode === "grid" ? "hidden" : "overflow-x-auto"}>
            <table className="w-full min-w-[1260px] text-left text-sm">
              <thead>
                <tr className="rounded-md bg-[#f0e6d2] text-left text-sm font-semibold text-[#3d3d3d]">
                  <th className="px-3 py-3 font-bold">S.No</th>
                  <th className="px-3 py-3 font-bold">Gift Box Name</th>
                  <th className="px-5 py-3 font-bold">Image</th>
                  <th className="px-3 py-3 font-bold">Category</th>
                  <th className="px-3 py-3 font-bold">Included Items</th>
                  
                  <th className="px-3 py-3 font-bold">Price</th>
                  <th className="px-3 py-3 font-bold">Stock</th>
                  
                  <th className="px-3 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0eb]">
                {loading ? (
                  <tr>
                    <td colSpan="11" className="px-5 py-16 text-center text-sm text-[#8a958e]">
                      Loading gift boxes...
                    </td>
                  </tr>
                ) : pageBoxes.length ? (
                  pageBoxes.map((box, index) => (
                    <tr
                      key={box.id}
                      className="group transition hover:bg-[#fbfdfb]"
                    >
                      <td className="px-5 py-3 text-xs font-bold text-[#87928c]">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      
                     
                      <td className="px-3 py-3">
                        <p className="font-bold text-[#263a34]">{box.name}</p>
                        <p className="mt-0.5 max-w-[210px] truncate text-xs text-[#919c95]">
                          {box.id}
                        </p>
                      </td>

                      <td className="px-5 py-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-[#e5e8e2] bg-[#f1f5f0]">
                          {box.image ? (
                            <img
                              src={box.image}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Gift className="h-5 w-5 text-[#9aaa9f]" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-md bg-[#f1f5ef] px-2 py-1 text-[11px] font-semibold text-[#547164]">
                          {box.category}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-[#5f7068]">
                        {box.items.length} item
                        {box.items.length === 1 ? "" : "s"}
                      </td>
                     
                      <td className="px-3 py-3 font-semibold text-[#4e6259]">
                        {money(box.sellingPrice)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#e0e6df] bg-[#fbfdfa] p-1 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleQuickStock(box.id, "reduce", 1)}
                            disabled={box.currentStock <= 0}
                            title="Reduce stock by 1"
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-[#d2d9d4] bg-white text-[#4e6259] transition hover:border-[#f5c6cb] hover:bg-[#feeceb] hover:text-[#bb3f3b] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openStockModal(box)}
                            title="Click to adjust stock"
                            className="min-w-[28px] px-1 text-center font-bold text-[#203b30] transition hover:text-[#2d7560] hover:underline"
                          >
                            {box.currentStock}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickStock(box.id, "increase", 1)}
                            title="Increase stock by 1"
                            className="flex h-6 w-6 items-center justify-center rounded-md border border-[#d2d9d4] bg-white text-[#4e6259] transition hover:border-[#b8e5c8] hover:bg-[#e8f6ed] hover:text-[#237548]"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                     
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/gifts/${box.id}`)}
                            title="View gift box"
                            className="rounded-md p-2 text-[#688279] transition hover:bg-[#eaf3ed] hover:text-[#1f5d4d]"
                          >
                            <ClipboardList className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(box)}
                            title="Edit gift box"
                            className="rounded-md p-2 text-[#688279] transition hover:bg-[#eaf3ed] hover:text-[#1f5d4d]"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteBox(box.id)}
                            title="Delete gift box"
                            className="rounded-md p-2 text-[#b87070] transition hover:bg-[#fceedf] hover:text-[#b43c3c]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="11"
                      className="px-5 py-16 text-center text-sm text-[#8a958e]"
                    >
                      No gift boxes match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className={viewMode === "grid" ? "grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3" : "hidden"}>
            {pageBoxes.map((box) => (
              <article key={box.id} className="overflow-hidden rounded-xl border border-[#e1e6df] bg-[#fbfcfa] transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex h-40 items-center justify-center bg-[#eef4ee]">{box.image ? <img src={box.image} alt="" className="h-full w-full object-cover" /> : <Gift className="h-10 w-10 text-[#9aaa9f]" />}</div>
                <div className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] font-bold text-[#588070]">{box.id}</p><h3 className="mt-1 font-bold text-[#263a34]">{box.name}</h3></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClasses[box.stockStatus]}`}>{box.stockStatus}</span></div><p className="text-xs text-[#77847c]">{box.category} <span className="mx-1">·</span> {box.subCategory || "-"}</p><div className="flex items-center justify-between border-t border-[#e7ece6] pt-3"><div><p className="text-[10px] uppercase tracking-wide text-[#919d95]">Selling Price</p><p className="font-bold text-[#bd713a]">{money(box.sellingPrice)}</p></div><p className="text-xs font-semibold text-[#68776f]">{box.currentStock} in stock</p><button type="button" onClick={() => navigate(`/admin/gifts/${box.id}`)} title="View gift box" className="rounded-md p-2 text-[#688279] hover:bg-[#eaf3ed]"><ClipboardList className="h-4 w-4" /></button></div></div>
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] font-bold text-[#588070]">{box.id}</p>
                      <h3 className="mt-1 font-bold text-[#263a34]">{box.name}</h3>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusClasses[box.stockStatus]}`}>{box.stockStatus}</span>
                  </div>
                  <p className="text-xs text-[#77847c]">{box.category} <span className="mx-1">·</span> {box.subCategory || "-"}</p>
                  <div className="flex items-center justify-between border-t border-[#e7ece6] pt-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-[#919d95]">Selling Price</p>
                      <p className="font-bold text-[#bd713a]">{money(box.sellingPrice)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg border border-[#e0e6df] bg-[#fbfdfa] px-1.5 py-1">
                      <button
                        type="button"
                        onClick={() => handleQuickStock(box.id, "reduce", 1)}
                        disabled={box.currentStock <= 0}
                        title="Reduce stock by 1"
                        className="flex h-5 w-5 items-center justify-center rounded border border-[#d2d9d4] bg-white text-[#4e6259] transition hover:border-[#f5c6cb] hover:bg-[#feeceb] hover:text-[#bb3f3b] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openStockModal(box)}
                        title="Click to adjust stock"
                        className="text-xs font-bold text-[#263a34] hover:text-[#2d7560] hover:underline"
                      >
                        {box.currentStock} in stock
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickStock(box.id, "increase", 1)}
                        title="Increase stock by 1"
                        className="flex h-5 w-5 items-center justify-center rounded border border-[#d2d9d4] bg-white text-[#4e6259] transition hover:border-[#b8e5c8] hover:bg-[#e8f6ed] hover:text-[#237548]"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    <button type="button" onClick={() => openEdit(box)} title="Edit gift box" className="rounded-md p-2 text-[#688279] hover:bg-[#eaf3ed]"><Edit3 className="h-4 w-4" /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-[#edf0eb] px-5 py-3 text-xs text-[#87928c]">
            <span>
              Showing {pageBoxes.length ? (page - 1) * pageSize + 1 : 0}-
              {Math.min(page * pageSize, filteredBoxes.length)} of{" "}
              {filteredBoxes.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
                className="rounded-md border border-[#e0e6df] p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-semibold text-[#52675e]">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-md border border-[#e0e6df] p-1.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      {isPanelOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#17251f]/40 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsPanelOpen(false);
          }}
        >
          <aside className="ml-auto flex h-full w-full max-w-2xl flex-col bg-[#f8faf7] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e0e6df] bg-white px-5 py-4 sm:px-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#bd713a]">
                  {editingId ? "Update catalog item" : "New catalog item"}
                </p>
                <h2 className="mt-1 text-xl font-bold text-[#20362e]">
                  {editingId ? "Edit Gift Box" : "Add New Gift Box"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                className="rounded-lg p-2 text-[#718079] hover:bg-[#f0f4ef]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              id="gift-box-form"
              onSubmit={saveBox}
              className="scrollbar-hide flex-1 space-y-5 overflow-y-auto p-5 sm:p-7"
            >
              <div className="grid gap-4 rounded-xl border border-[#e0e6df] bg-white p-4 sm:grid-cols-2">
                <div className="sm:col-span-2 flex items-center gap-3 border-b border-[#edf0eb] pb-3">
                  <Sparkles className="h-4 w-4 text-[#c1843b]" />
                  <h3 className="font-bold text-[#294339]">
                    Basic Information
                  </h3>
                </div>
                <Field label="Gift Box Name">
                  <input
                    required
                    className={inputClass}
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="e.g. The Memory Keeper"
                  />
                </Field>
                <Field label="Gift Box Code">
                  <input
                    required
                    className={inputClass}
                    value={form.code}
                    onChange={(event) =>
                      updateForm("code", event.target.value.toUpperCase())
                    }
                    placeholder="GBX001"
                  />
                </Field>
                <Field label="Category">
                  <select
                    className={inputClass}
                    value={form.category}
                    onChange={(event) =>
                      updateForm("category", event.target.value)
                    }
                  >
                    {categoryOptions.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Description" wide>
                  <textarea
                    rows="3"
                    className={inputClass}
                    value={form.description}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                    placeholder="Describe what makes this gift box special"
                  />
                </Field>
                <Field label="Product Images" wide>
                  <div className="flex gap-2">
                    <label
                      htmlFor="gift-image-upload"
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#1f5d4d] px-3 py-2 text-xs font-bold text-white hover:bg-[#174b3e]"
                    >
                      <ImagePlus className="h-4 w-4" /> Upload
                    </label>
                    <input
                      id="gift-image-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleGiftImagesUpload}
                      className="sr-only"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-[#89948d]">
                    Multiple images are uploaded to the gifts folder.
                  </p>
                  {uploadingImages && (
                    <p className="mt-1 text-xs font-semibold text-[#1f5d4d]">
                      Uploading images...
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(form.images || []).map((image, index) => (
                      <div
                        key={`${image}-${index}`}
                        className="relative h-16 w-16"
                      >
                        <img
                          src={image}
                          alt=""
                          className="h-full w-full rounded-lg border border-[#dfe5dd] object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeGiftImage(index)}
                          title="Remove image"
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#b42318] text-white shadow-sm hover:bg-[#8e1c14]"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </Field>
              </div>
              <div className="grid gap-4 rounded-xl border border-[#e0e6df] bg-white p-4 sm:grid-cols-2">
                <div className="sm:col-span-2 flex items-center gap-3 border-b border-[#edf0eb] pb-3">
                  <Package className="h-4 w-4 text-[#c1843b]" />
                  <h3 className="font-bold text-[#294339]">Box Details</h3>
                </div>
                {[
                  ["material", "Box Material"],
                  ["size", "Box Size"],
                  ["color", "Box Color"],
                  ["theme", "Theme"],
                  ["boxType", "Box Type"],
                ].map(([field, label]) => (
                  <Field key={field} label={label}>
                    <input
                      className={inputClass}
                      value={form[field]}
                      onChange={(event) =>
                        updateForm(field, event.target.value)
                      }
                    />
                  </Field>
                ))}
              </div>
              <div className="grid gap-4 rounded-xl border border-[#e0e6df] bg-white p-4 sm:grid-cols-3">
                <div className="sm:col-span-3 flex items-center gap-3 border-b border-[#edf0eb] pb-3">
                  <ShoppingBag className="h-4 w-4 text-[#c1843b]" />
                  <h3 className="font-bold text-[#294339]">Pricing Details</h3>
                </div>
                {[
                  ["mrp", "MRP"],
                  ["discount", "Discount Percentage"],
                  ["sellingPrice", "Selling Price"],
                ].map(([field, label]) => (
                  <Field key={field} label={label}>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#8d9991]">
                        {field === "discount" ? "%" : "₹"}
                      </span>
                      <input
                        type="number"
                        min="0"
                        readOnly={field === "sellingPrice"}
                        className={`${inputClass} pl-7 ${field === "sellingPrice" ? "cursor-not-allowed bg-[#f3f6f2] text-[#597267]" : ""}`}
                        value={form[field]}
                        onChange={(event) =>
                          handlePricingChange(field, event.target.value)
                        }
                      />
                    </div>
                  </Field>
                ))}
              </div>
              <div className="grid gap-4 rounded-xl border border-[#e0e6df] bg-white p-4 sm:grid-cols-2">
                <div className="sm:col-span-2 flex items-center gap-3 border-b border-[#edf0eb] pb-3">
                  <Archive className="h-4 w-4 text-[#c1843b]" />
                  <h3 className="font-bold text-[#294339]">Stock Management</h3>
                </div>
                <Field label="Current Stock">
                  <input
                    type="number"
                    min="0"
                    className={inputClass}
                    value={form.currentStock}
                    onChange={(event) =>
                      updateForm("currentStock", event.target.value)
                    }
                  />
                </Field>
                <Field label="Stock Status">
                  <div className="flex h-[42px] items-center gap-2 rounded-lg bg-[#f4f7f3] px-3 text-sm font-semibold text-[#587267]">
                    <span
                      className={`h-2 w-2 rounded-full ${statusForStock(form.currentStock, form.minimumStock) === "Available" ? "bg-[#3c9b68]" : statusForStock(form.currentStock, form.minimumStock) === "Low Stock" ? "bg-[#d6982d]" : "bg-[#cb5d59]"}`}
                    />
                    {statusForStock(form.currentStock, form.minimumStock)}
                  </div>
                </Field>
              </div>
              <div className="rounded-xl border border-[#e0e6df] bg-white p-4">
                <div className="mb-4 flex items-center gap-3 border-b border-[#edf0eb] pb-3">
                  <UserRound className="h-4 w-4 text-[#c1843b]" />
                  <h3 className="font-bold text-[#294339]">
                    Customization Options
                  </h3>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    ["customerName", "Customer Name"],
                    ["photoUpload", "Photo Upload"],
                    ["customMessage", "Custom Message"],
                    ["greetingCard", "Greeting Card"],
                  ].map(([field, label]) => (
                    <label
                      key={field}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#edf0eb] p-3 text-sm font-semibold text-[#52675e] hover:bg-[#f7faf6]"
                    >
                      <input
                        type="checkbox"
                        checked={form[field]}
                        onChange={(event) =>
                          updateForm(field, event.target.checked)
                        }
                        className="h-4 w-4 accent-[#1f5d4d]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-[#e0e6df] bg-white p-4">
                <div className="mb-4 flex items-center justify-between border-b border-[#edf0eb] pb-3">
                  <div className="flex items-center gap-3">
                    <Gift className="h-4 w-4 text-[#c1843b]" />
                    <h3 className="font-bold text-[#294339]">Gift Items</h3>
                  </div>
                  <span className="rounded-full bg-[#edf5ee] px-2.5 py-1 text-[10px] font-bold text-[#39735d]">
                    {form.items.length} added
                  </span>
                </div>
                <div className="space-y-3">
                  {form.items.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="rounded-lg border border-[#e5ebe4] bg-[#f7f9f6] p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8881]">Gift Item {index + 1}</span>
                        <button type="button" onClick={() => removeItem(index)} title="Remove gift item" className="rounded-md p-2 text-[#b87070] hover:bg-[#fceedf]"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-4">
                        <label className="space-y-1 sm:col-span-2"><span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8881]">Product Name</span><input className={inputClass} value={item.name} onChange={(event) => updateGiftItem(index, "name", event.target.value)} /></label>
                        <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8881]">Quantity</span><input type="number" min="1" className={inputClass} value={item.quantity} onChange={(event) => updateGiftItem(index, "quantity", event.target.value)} /></label>
                        <div className="flex items-end gap-2"><div className="flex h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-md bg-white">{item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-[#9ba69f]" />}</div><label htmlFor={`gift-item-replace-${index}`} className="flex h-[42px] flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border border-[#c9ddd0] text-xs font-bold text-[#27614e] hover:bg-[#edf6ef]"><ImagePlus className="h-3.5 w-3.5" /> Image</label><input id={`gift-item-replace-${index}`} type="file" accept="image/*" onChange={(event) => replaceGiftItemImage(event, index)} className="sr-only" /></div>
                        <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8881]">MRP</span><input type="number" min="0" className={inputClass} value={item.mrp ?? item.purchasePrice ?? ""} onChange={(event) => updateGiftItem(index, "mrp", event.target.value)} /></label>
                        <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8881]">Offer Price</span><input type="number" min="0" className={inputClass} value={item.offerPrice} onChange={(event) => updateGiftItem(index, "offerPrice", event.target.value)} /></label>
                        <label className="space-y-1"><span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8881]">Selling Price</span><input readOnly className={`${inputClass} cursor-not-allowed bg-[#f3f6f2] text-[#597267]`} value={item.sellingPrice} /></label>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid gap-2 border-t border-[#edf0eb] pt-3 sm:grid-cols-4">
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8881]">
                      Product Name
                    </span>
                    <input
                      className={inputClass}
                      placeholder="Product name"
                      value={itemDraft.name}
                      onChange={(event) =>
                        setItemDraft({ ...itemDraft, name: event.target.value })
                      }
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8881]">
                      Quantity
                    </span>
                    <input
                      type="number"
                      min="1"
                      className={inputClass}
                      placeholder="Qty"
                      value={itemDraft.quantity}
                      onChange={(event) =>
                        setItemDraft({
                          ...itemDraft,
                          quantity: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8881]">
                      MRP
                    </span>
                    <input
                      type="number"
                      min="0"
                      className={inputClass}
                      placeholder="MRP"
                      value={itemDraft.mrp}
                      onChange={(event) =>
                        handleItemPricingChange("mrp", event.target.value)
                      }
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8881]">
                      Offer Price
                    </span>
                    <input
                      type="number"
                      min="0"
                      className={inputClass}
                      placeholder="Offer"
                      value={itemDraft.offerPrice}
                      onChange={(event) =>
                        handleItemPricingChange("offerPrice", event.target.value)
                      }
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#7c8881]">
                      Selling Price
                    </span>
                    <input
                      type="number"
                      min="0"
                      readOnly
                      className={`${inputClass} cursor-not-allowed bg-[#f3f6f2] text-[#597267]`}
                      placeholder="Selling"
                      value={itemDraft.sellingPrice}
                      onChange={(event) =>
                        handleItemPricingChange("sellingPrice", event.target.value)
                      }
                    />
                  </label>
                  <label
                    htmlFor="gift-item-image-upload"
                    title="Upload gift item image"
                    className="mt-5 inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-[#c9ddd0] px-3 py-2 text-xs font-bold text-[#27614e] hover:bg-[#edf6ef]"
                  >
                    <ImagePlus className="h-3.5 w-3.5" /> Image
                  </label>
                  <input
                    id="gift-item-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleItemImageUpload}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    onClick={addItem}
                    className="mt-5 inline-flex items-center justify-center gap-1 rounded-lg border border-[#c9ddd0] px-3 py-2 text-xs font-bold text-[#27614e] hover:bg-[#edf6ef]"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
                {itemDraft.image && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#60766b]">
                    <img
                      src={itemDraft.image}
                      alt="Gift item preview"
                      className="h-10 w-10 rounded-md border border-[#dfe5dd] object-cover"
                    />
                    {uploadingImages
                      ? "Uploading item image..."
                      : "Item image ready"}
                  </div>
                )}
              </div>
            </form>
            <div className="flex gap-3 border-t border-[#e0e6df] bg-white px-5 py-4 sm:justify-end sm:px-7">
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                className="flex-1 rounded-lg border border-[#dce3dc] px-4 py-2.5 text-sm font-bold text-[#62736a] hover:bg-[#f5f7f4] sm:flex-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="gift-box-form"
                className="flex-1 rounded-lg bg-[#1f5d4d] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#174b3e] sm:flex-none"
              >
                {editingId ? "Save Changes" : "Create Gift Box"}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* QUICK STOCK ADJUST MODAL */}
      {stockModalBox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setStockModalBox(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#e0e6df] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#edf0eb] pb-3">
              <div>
                <p className="font-mono text-xs font-bold text-[#588070]">{stockModalBox.id}</p>
                <h3 className="font-bold text-[#233830]">Adjust Gift Stock</h3>
              </div>
              <button
                type="button"
                onClick={() => setStockModalBox(null)}
                className="rounded-full p-1 text-[#87928c] hover:bg-[#f0f4f0] hover:text-[#233830]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-[#eaf0e8] bg-[#f8fbf8] p-3 text-xs text-[#52675e]">
              <p className="font-semibold text-[#294339]">{stockModalBox.name}</p>
              <div className="mt-2 flex items-center justify-between">
                <span>Current Stock:</span>
                <span className="text-sm font-bold text-[#203b30]">{stockModalBox.currentStock} units</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>Status:</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClasses[stockModalBox.stockStatus]}`}>
                  {stockModalBox.stockStatus}
                </span>
              </div>
            </div>

            <form onSubmit={handleStockModalSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#63726a]">Action</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStockAdjustmentType("reduce");
                      setStockAdjustmentAmount(1);
                    }}
                    className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                      stockAdjustmentType === "reduce"
                        ? "border-[#bb3f3b] bg-[#feeceb] text-[#bb3f3b]"
                        : "border-[#dfe5df] bg-white text-[#52675e] hover:bg-[#f8faf8]"
                    }`}
                  >
                    Reduce Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStockAdjustmentType("increase");
                      setStockAdjustmentAmount(1);
                    }}
                    className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                      stockAdjustmentType === "increase"
                        ? "border-[#237548] bg-[#e8f6ed] text-[#237548]"
                        : "border-[#dfe5df] bg-white text-[#52675e] hover:bg-[#f8faf8]"
                    }`}
                  >
                    Add Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStockAdjustmentType("set");
                      setStockAdjustmentAmount(stockModalBox.currentStock);
                    }}
                    className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                      stockAdjustmentType === "set"
                        ? "border-[#2d7560] bg-[#eaf3ed] text-[#2d7560]"
                        : "border-[#dfe5df] bg-white text-[#52675e] hover:bg-[#f8faf8]"
                    }`}
                  >
                    Set Exact
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#63726a]">
                  {stockAdjustmentType === "reduce"
                    ? "Units to Reduce"
                    : stockAdjustmentType === "increase"
                    ? "Units to Add"
                    : "New Stock Total"}
                </label>
                <input
                  type="number"
                  min={stockAdjustmentType === "set" ? "0" : "1"}
                  max={stockAdjustmentType === "reduce" ? String(stockModalBox.currentStock) : undefined}
                  value={stockAdjustmentAmount}
                  onChange={(e) => setStockAdjustmentAmount(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              {stockAdjustmentType === "reduce" && (
                <div className="flex gap-2">
                  {[1, 2, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setStockAdjustmentAmount(num)}
                      className="rounded-md border border-[#d2d9d4] bg-white px-2.5 py-1 text-xs font-semibold text-[#52675e] transition hover:bg-[#eaf3ed]"
                    >
                      -{num}
                    </button>
                  ))}
                </div>
              )}

              <div className="rounded-lg bg-[#f4f7f3] p-2.5 text-xs text-[#52675e]">
                <span>New estimated stock: </span>
                <span className="font-bold text-[#203b30]">
                  {stockAdjustmentType === "reduce"
                    ? Math.max(0, stockModalBox.currentStock - Number(stockAdjustmentAmount || 0))
                    : stockAdjustmentType === "increase"
                    ? stockModalBox.currentStock + Number(stockAdjustmentAmount || 0)
                    : Math.max(0, Number(stockAdjustmentAmount || 0))}{" "}
                  units
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStockModalBox(null)}
                  className="rounded-lg border border-[#d6ded8] px-4 py-2 text-xs font-bold text-[#556960] hover:bg-[#f0f4f0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={stockSubmitting}
                  className="rounded-lg bg-[#28745f] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#1f5d4d] disabled:opacity-50"
                >
                  {stockSubmitting ? "Updating..." : "Apply Stock Change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GiftBoxManagement;
