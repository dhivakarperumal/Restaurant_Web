import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Minus,
  Plus,
  Printer,
  Search,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api, { API_URL } from "../../api";
import { useAuth } from "../../PrivateRouter/AuthContext";

const money = (value) =>
  `₹ ${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const fieldClass =
  "mt-1 h-11 w-full rounded-lg border border-[#c7d2d0] bg-white px-3 text-xs outline-none transition-all duration-200 focus:border-[#1a3c36] focus:ring-2 focus:ring-[#1a3c36]/20 hover:border-[#1a3c36]/60 shadow-sm";

const parseVariants = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeImageUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  const baseUrl = API_URL.replace(/\/api\/?$/, "");
  return `${baseUrl}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
};

const getArrayValue = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getProductImage = (product) => {
  // Try to get image from first variant (albums store images inside variants)
  const firstVariant = (() => {
    const vars = getArrayValue(product?.variants);
    return vars.length ? vars[0] : null;
  })();

  const candidates = [
    product?.thumbnail_image,
    product?.product_images,
    product?.images,
    product?.image,
    product?.frame_data?.frame_image,
    product?.frame_data?.images,
    product?.image_url,
    product?.thumbnail,
    firstVariant?.images,
    firstVariant?.image,
  ];

  for (const candidate of candidates) {
    const list = getArrayValue(candidate);
    if (list.length) {
      const first = list[0];
      if (first && typeof first === "string") return normalizeImageUrl(first);
      if (first && typeof first === "object") {
        const nested = first.url || first.image || first.src || first.path || "";
        if (nested) return normalizeImageUrl(nested);
      }
    }

    if (typeof candidate === "string" && candidate.trim()) {
      return normalizeImageUrl(candidate);
    }

    if (candidate && typeof candidate === "object") {
      const nested = candidate.url || candidate.image || candidate.src || candidate.path || "";
      if (nested) return normalizeImageUrl(nested);
    }
  }

  return "";
};

const NewBilling = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantIndex, setSelectedVariantIndex] = useState("0");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedCategoryType, setSelectedCategoryType] = useState("Frame");
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    email: "",
    phone: "",
    door_number: "",
    street_name: "",
    landmark: "",
    city: "",
    district: "",
    state: "",
    country: "",
    pincode: "",
  });
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [orderTime, setOrderTime] = useState(new Date().toTimeString().slice(0, 5));
  const [receivedAmount, setReceivedAmount] = useState("2000");
  const [discount, setDiscount] = useState("0");
  const [shippingCharge, setShippingCharge] = useState("0");
  const [packagingCharge, setPackagingCharge] = useState("0");
  const [billingStep, setBillingStep] = useState(1);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );
  const itemDiscountTotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.discount || 0), 0),
    [items],
  );
  const total = Math.max(
    subtotal -
      itemDiscountTotal -
      Number(discount || 0) +
      Number(shippingCharge || 0) +
      Number(packagingCharge || 0),
    0,
  );
  const change = Math.max(Number(receivedAmount || 0) - total, 0);

  useEffect(() => {
    setReceivedAmount(total.toFixed(2));
  }, [total]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const [productsResponse, albumsResponse, giftsResponse] = await Promise.all([
          api.get("/products"),
          api.get("/albums"),
          api.get("/gift-boxes"),
        ]);
        const products = Array.isArray(productsResponse.data?.data) ? productsResponse.data.data : [];
        const albums = Array.isArray(albumsResponse.data?.data) ? albumsResponse.data.data : [];
        const gifts = Array.isArray(giftsResponse.data?.data) ? giftsResponse.data.data : [];

        const frameCatalog = products.map((product, index) => ({
          id: `frame-${product.id || product.product_id || index}`,
          productId: product.id || product.product_id,
          categoryType: "Frame",
          name: product.product_name || product.name || "Unnamed Frame",
          productCode: product.product_code || product.product_id || "",
          detail: product.size || product.product_code || "",
          category: product.category || "Photo Frames",
          price: Number(product.selling_price ?? product.price ?? 0),
          variants: parseVariants(product.size_variants),
          image: getProductImage(product),
          quantity: 1,
          discount: 0,
        }));
        const albumCatalog = albums.map((album, index) => {
          const rawVariants = parseVariants(album.variants);

          // Derive color options: from color_options field, or extract unique colors from variants
          const rawColorOptions = parseVariants(album.color_options);
          const derivedColors = rawColorOptions.length
            ? rawColorOptions
            : [...new Map(
                rawVariants
                  .filter((v) => v.color)
                  .map((v) => [v.color, typeof v.color === "object" ? v.color : { name: v.color }])
              ).values()];

          // Derive size options: from size_options field, or extract unique sizes from variants
          const rawSizeOptions = parseVariants(album.size_options);
          const derivedSizes = rawSizeOptions.length
            ? rawSizeOptions
            : [...new Set(rawVariants.filter((v) => v.size).map((v) => v.size))];

          // Base price: from root fields or first variant
          const firstVariant = rawVariants[0];
          const basePrice = Number(
            album.discount_price ||
            album.selling_price ||
            firstVariant?.offerPrice ||
            firstVariant?.offer_price ||
            firstVariant?.mrp ||
            0,
          );

          return {
            id: `album-${album.id || album.product_id || index}`,
            productId: album.id || album.product_id,
            categoryType: "Albums",
            name: album.product_name || "Unnamed Album",
            productCode: album.product_code || album.product_id || "",
            detail: album.size || `${album.total_pages || 40} Pages`,
            category: album.category || "Albums",
            price: basePrice,
            variants: [],           // keep empty so frame-size selector stays hidden
            albumVariants: rawVariants, // raw variants for price & image lookup
            size_options: derivedSizes,
            color_options: derivedColors,
            image: getProductImage(album),
            quantity: 1,
            discount: 0,
          };
        });
        const giftCatalog = gifts.map((gift, index) => ({
          id: `gift-${gift.id || gift.gift_box_id || index}`,
          productId: gift.id || gift.gift_box_id,
          categoryType: "Gift",
          name: gift.name || "Unnamed Gift Box",
          productCode: gift.gift_box_id || String(gift.id || ""),
          detail: gift.box_size || gift.theme || "Gift Box",
          category: gift.category || "Gift",
          price: Number(gift.selling_price || gift.mrp || 0),
          variants: [],
          image: getProductImage(gift),
          quantity: 1,
          discount: 0,
        }));

        setProductOptions([...frameCatalog, ...albumCatalog, ...giftCatalog]);
      } catch (error) {
        console.error("Failed to load billing catalog:", error);
      }
    };

    fetchCatalog();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get("/users");
        const userList = Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        setUsers(
          userList.filter(
            (user) => String(user.role || "user").toLowerCase() === "user",
          ),
        );
      } catch (error) {
        console.error("Failed to load users for billing:", error);
      }
    };

    fetchUsers();
  }, []);

  const updateQuantity = (id, amount) =>
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + amount) }
          : item,
      ),
    );
  const removeItem = (id) =>
    setItems((current) => current.filter((item) => item.id !== id));
  const updateItemDiscount = (id, value) =>
    setItems((current) =>
      current.map((item) =>
        String(item.id) === String(id)
          ? { ...item, discount: Math.max(0, Number(value) || 0) }
          : item,
      ),
    );

  const selectedProduct = productOptions.find(
    (option) => String(option.id) === selectedProductId,
  );
  const filteredProductOptions = productOptions.filter((product) => {
    const query = productSearch.trim().toLowerCase();
    return (
      product.categoryType === selectedCategoryType &&
      (!query || `${product.name} ${product.detail} ${product.category}`
        .toLowerCase()
        .includes(query))
    );
  });
  const filteredCustomers = users
    .filter((user) => {
      const query = customerSearch.trim().toLowerCase();
      return (
        !query ||
        `${user.username || ""} ${user.name || ""} ${user.email || ""} ${user.mobile_number || user.phone || ""}`
          .toLowerCase()
          .includes(query)
      );
    })
    .slice(0, 8);

  const selectCustomer = (user) => {
    const nextCustomer = {
      name: user.username || user.name || user.full_name || "",
      email: user.email || "",
      phone: user.mobile_number || user.phone || user.mobile || "",
      door_number: user.door_number || user.house_number || "",
      street_name: user.street_name || user.address_line1 || user.address || user.full_address || user.billing_address || "",
      landmark: user.landmark || "",
      city: user.city || "",
      district: user.district || "",
      state: user.state || "",
      country: user.country || "",
      pincode: user.pincode || user.postal_code || "",
    };

    setSelectedCustomer(user);
    setCustomerSearch(user.username || user.name || user.email || "");
    setCustomerForm(nextCustomer);
  };

  useEffect(() => {
    if (!selectedCustomer) {
      setCustomerForm((current) => ({
        ...current,
        name: current.name || "",
        email: current.email || "",
        phone: current.phone || "",
        door_number: current.door_number || "",
        street_name: current.street_name || "",
        landmark: current.landmark || "",
        city: current.city || "",
        district: current.district || "",
        state: current.state || "",
        country: current.country || "",
        pincode: current.pincode || "",
      }));
      return;
    }

    setCustomerForm({
      name: selectedCustomer.username || selectedCustomer.name || selectedCustomer.full_name || "",
      email: selectedCustomer.email || "",
      phone: selectedCustomer.mobile_number || selectedCustomer.phone || selectedCustomer.mobile || "",
      door_number: selectedCustomer.door_number || selectedCustomer.house_number || "",
      street_name: selectedCustomer.street_name || selectedCustomer.address_line1 || selectedCustomer.address || selectedCustomer.full_address || selectedCustomer.billing_address || "",
      landmark: selectedCustomer.landmark || "",
      city: selectedCustomer.city || "",
      district: selectedCustomer.district || "",
      state: selectedCustomer.state || "",
      country: selectedCustomer.country || "",
      pincode: selectedCustomer.pincode || selectedCustomer.postal_code || "",
    });
  }, [selectedCustomer]);

  const addSelectedProduct = () => {
    const product = productOptions.find(
      (option) => String(option.id) === selectedProductId,
    );
    if (!product) return;

    // Frame: use size_variant for price
    const frameVariant = product.variants?.[Number(selectedVariantIndex)];

    // Albums: find matching variant by color + size for correct price & image
    let albumVariant = null;
    if (product.categoryType === "Albums" && product.albumVariants?.length) {
      albumVariant = product.albumVariants.find((v) => {
        const colorMatch = !selectedColor || String(v.color || "").toLowerCase() === String(selectedColor).toLowerCase();
        const sizeMatch = !selectedSize || String(v.size || "").toLowerCase() === String(selectedSize).toLowerCase();
        return colorMatch && sizeMatch;
      }) || product.albumVariants[0];
    }

    // Build detail string for albums (color + size)
    let albumDetail = product.detail;
    if (product.categoryType === "Albums") {
      const parts = [];
      if (selectedColor) parts.push(selectedColor);
      if (selectedSize) parts.push(selectedSize);
      if (parts.length) albumDetail = parts.join(" / ");
    }

    // Resolve image: prefer variant image for albums
    const albumImage =
      albumVariant?.images?.[0]
        ? normalizeImageUrl(albumVariant.images[0])
        : albumVariant?.image
          ? normalizeImageUrl(albumVariant.image)
          : product.image;

    // Resolve price
    const resolvedPrice = Number(
      frameVariant?.offer_price ??
      frameVariant?.selling_price ??
      frameVariant?.mrp ??
      albumVariant?.offerPrice ??
      albumVariant?.offer_price ??
      albumVariant?.mrp ??
      product.price,
    );

    const item = {
      ...product,
      id: `${product.id}-${selectedVariantIndex}-${selectedColor || "nc"}-${selectedSize || "ns"}`,
      product_id: product.productId,
      productCode: product.productCode,
      categoryType: product.categoryType,
      category: product.category,
      detail: frameVariant?.size || albumDetail,
      size: frameVariant?.size || selectedSize || "Standard",
      color: selectedColor || "",
      selectedSize: frameVariant?.size || selectedSize || "Standard",
      selectedColor: selectedColor || "",
      image: product.categoryType === "Albums" ? albumImage : (product.image || ""),
      price: resolvedPrice,
    };

    setItems((current) => {
      const existing = current.find(
        (currentItem) => String(currentItem.id) === String(item.id),
      );
      if (existing) {
        return current.map((currentItem) =>
          String(currentItem.id) === String(item.id)
            ? { ...currentItem, quantity: currentItem.quantity + 1 }
            : currentItem,
        );
      }
      return [...current, item];
    });
    setSelectedProductId("");
    setSelectedVariantIndex("0");
    setSelectedColor("");
    setSelectedSize("");
    setProductSearch("");
    setShowProductModal(false);
  };

  const isCustomerFormValid =
    customerForm.name.trim() && customerForm.phone.trim() && items.length > 0;
  const canContinueToAddress = items.length > 0;
  const canContinueToBilling = customerForm.name.trim() && customerForm.phone.trim();

  const handleGenerateBill = async () => {
    if (!isCustomerFormValid) return;
    try {
      const createdBy = user?.user_id || user?.id || user?.email || "system";
      const customerId =
        selectedCustomer?.user_id || selectedCustomer?.id || `guest-${Date.now()}`;

      await api.post("/orders", {
        order: {
          customer_id: customerId,
          billing_type: "Shop Billing",
          order_date: orderDate || new Date().toISOString().slice(0, 10),
          order_time: orderTime || new Date().toTimeString().slice(0, 5),
          total_items: items.reduce((sum, item) => sum + item.quantity, 0),
          subtotal,
          discount_amount: itemDiscountTotal + Number(discount || 0),
          tax_amount: 0,
          total_amount: total,
          payment_method: "Cash",
          payment_status: Number(receivedAmount || 0) >= total ? "Paid" : Number(receivedAmount || 0) > 0 ? "Partial" : "Pending",
          order_status: "Completed",
          notes: "",
          created_by: createdBy,
          updated_by: createdBy,
        },
        items: items.map((item) => ({
          product_id: item.product_id || item.id,
          product_name: item.name,
          category: item.categoryType || item.category || "Photo Frames",
          product_code: item.productCode || item.productCode || "",
          size: item.selectedSize || item.size || item.detail || "Standard",
          color: item.selectedColor || item.color || "",
          product_image: item.image || "",
          quantity: item.quantity,
          unit_price: item.price,
          discount: item.discount || 0,
          tax: 0,
          total_price: item.price * item.quantity - Number(item.discount || 0),
        })),
        address: {
          user_id: createdBy,
          customer_id: customerId,
          customer_name: customerForm.name || selectedCustomer?.username || selectedCustomer?.name || selectedCustomer?.full_name || "",
          mobile_number: customerForm.phone || selectedCustomer?.mobile_number || selectedCustomer?.phone || selectedCustomer?.mobile || "",
          door_number: customerForm.door_number,
          street_name: customerForm.street_name,
          address_line1: [customerForm.door_number, customerForm.street_name].filter(Boolean).join(", "),
          landmark: customerForm.landmark,
          city: customerForm.city,
          district: customerForm.district,
          state: customerForm.state,
          country: customerForm.country,
          pincode: customerForm.pincode,
        },
      });
      navigate("/admin/billing");
    } catch (error) {
      console.error("Failed to generate bill:", error);
    }
  };

  return (
    <div className="billing-page min-h-screen bg-[#f3f4f6] p-4 font-['Josefin_Sans'] text-[#1f2937] md:p-6">
      <div className="mx-auto max-w-[1500px]">
        <style>{`.billing-page table th:nth-child(6), .billing-page table td:nth-child(6) { display: none; }`}</style>
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setShowProductModal(true)}
            className="inline-flex h-[46px] items-center gap-2 rounded-xl bg-[#1a3c36] px-4 text-[15px] font-semibold text-white shadow-[0_6px_14px_rgba(26,60,54,0.18)] transition hover:bg-[#214a42]"
          >
            <Plus className="mr-1 inline h-5 w-6" /> Add Item
          </button>
        </div>

        {/* Step Indicator */}
        <div className="mb-3 flex w-full items-center justify-between rounded-xl border border-[#e5e7eb] bg-white px-6 py-4 shadow-sm">
          {[
            { step: 1, label: "Add Products" },
            { step: 2, label: "Customer Address" },
            { step: 3, label: "Billing Details" },
          ].map(({ step, label }, idx) => (
            <div key={step} className={`flex items-center ${idx < 2 ? "flex-1" : ""}`}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                    billingStep > step
                      ? "bg-[#1a3c36] text-white shadow-md shadow-[#1a3c36]/30"
                      : billingStep === step
                      ? "border-[3px] border-[#1a3c36] bg-[#1a3c36] text-white shadow-lg shadow-[#1a3c36]/25 ring-4 ring-[#1a3c36]/15"
                      : "border-2 border-[#d1d5db] bg-white text-[#9ca3af]"
                  }`}
                >
                  {billingStep > step ? (
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    step
                  )}
                </div>
                <span className={`text-[10px] font-bold tracking-wide ${billingStep >= step ? "text-[#1a3c36]" : "text-[#9ca3af]"}`}>
                  {label}
                </span>
              </div>
              {idx < 2 && (
                <div className={`mx-3 mb-5 h-[2px] flex-1 rounded-full transition-all duration-500 ${billingStep > step ? "bg-[#1a3c36]" : "bg-[#d1d5db]"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid gap-3">
          <section className={`rounded-lg mt-5 border border-[#e5e7eb] bg-white p-3 ${billingStep === 3 ? "hidden" : ""}`}>
            <h2 className="mb-4 text-sm font-bold">{billingStep === 1 ? "Order Details" : "Customer Details"}</h2>

            <div className="mt-5 space-y-3">
            <section className={`rounded-lg border border-[#e5e7eb] bg-white p-4 ${billingStep !== 1 ? "hidden" : ""}`}>
              <h2 className="mb-4 text-sm font-bold text-[#1f2937]">Order Details</h2>
              <div className="grid gap-3 md:grid-cols-3">
              <label className="text-[10px] font-bold">
                Order Date *
                <input
                  type="date"
                  value={orderDate}
                  onChange={(event) => setOrderDate(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="text-[10px] font-bold">
                Order Time *
                <input
                  type="time"
                  value={orderTime}
                  onChange={(event) => setOrderTime(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="text-[10px] font-bold">
                Order Type
                <select className={fieldClass}>
                  <option>Shop Order</option>
                  <option>Online Order</option>
                </select>
              </label>
              </div>
            </section>
            </div>

            <div className={`grid gap-3 md:grid-cols-2 ${billingStep !== 2 ? "hidden" : ""}`}>
              <label className="text-[10px] font-bold">
                Name *
                <input
                  value={customerForm.name}
                  onChange={(event) => setCustomerForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Enter customer name"
                  className={fieldClass}
                />
              </label>
              <label className="text-[10px] font-bold">
                Email
                <input
                  type="email"
                  value={customerForm.email}
                  onChange={(event) => setCustomerForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="Enter email address"
                  className={fieldClass}
                />
              </label>
              <label className="text-[10px] font-bold">
                Phone *
                <input
                  value={customerForm.phone}
                  onChange={(event) => setCustomerForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="Enter phone number"
                  className={fieldClass}
                />
              </label>
              <label className="text-[10px] font-bold">
                Door Number
                <input value={customerForm.door_number} onChange={(event) => setCustomerForm((prev) => ({ ...prev, door_number: event.target.value }))} placeholder="Enter door number" className={fieldClass} />
              </label>
              <label className="text-[10px] font-bold">
                Street Name
                <input value={customerForm.street_name} onChange={(event) => setCustomerForm((prev) => ({ ...prev, street_name: event.target.value }))} placeholder="Enter street name" className={fieldClass} />
              </label>
              <label className="text-[10px] font-bold">
                Landmark
                <input value={customerForm.landmark} onChange={(event) => setCustomerForm((prev) => ({ ...prev, landmark: event.target.value }))} placeholder="Enter landmark" className={fieldClass} />
              </label>
              <label className="text-[10px] font-bold">
                City
                <input value={customerForm.city} onChange={(event) => setCustomerForm((prev) => ({ ...prev, city: event.target.value }))} placeholder="Enter city" className={fieldClass} />
              </label>
              <label className="text-[10px] font-bold">
                District
                <input value={customerForm.district} onChange={(event) => setCustomerForm((prev) => ({ ...prev, district: event.target.value }))} placeholder="Enter district" className={fieldClass} />
              </label>
              <label className="text-[10px] font-bold">
                State
                <select value={customerForm.state} onChange={(event) => setCustomerForm((prev) => ({ ...prev, state: event.target.value }))} className={fieldClass}>
                  <option value="">Select state</option>
                  <option>Andhra Pradesh</option>
                  <option>Arunachal Pradesh</option>
                  <option>Assam</option>
                  <option>Bihar</option>
                  <option>Chhattisgarh</option>
                  <option>Goa</option>
                  <option>Gujarat</option>
                  <option>Haryana</option>
                  <option>Himachal Pradesh</option>
                  <option>Jharkhand</option>
                  <option>Karnataka</option>
                  <option>Kerala</option>
                  <option>Madhya Pradesh</option>
                  <option>Maharashtra</option>
                  <option>Manipur</option>
                  <option>Meghalaya</option>
                  <option>Mizoram</option>
                  <option>Nagaland</option>
                  <option>Odisha</option>
                  <option>Punjab</option>
                  <option>Rajasthan</option>
                  <option>Sikkim</option>
                  <option>Tamil Nadu</option>
                  <option>Telangana</option>
                  <option>Tripura</option>
                  <option>Uttar Pradesh</option>
                  <option>Uttarakhand</option>
                  <option>West Bengal</option>
                  <option>Andaman and Nicobar Islands</option>
                  <option>Chandigarh</option>
                  <option>Dadra and Nagar Haveli and Daman and Diu</option>
                  <option>Delhi</option>
                  <option>Jammu and Kashmir</option>
                  <option>Ladakh</option>
                  <option>Lakshadweep</option>
                  <option>Puducherry</option>
                </select>
              </label>
              <label className="text-[10px] font-bold">
                Country
                <input value={customerForm.country} onChange={(event) => setCustomerForm((prev) => ({ ...prev, country: event.target.value }))} placeholder="Enter country" className={fieldClass} />
              </label>
              <label className="text-[10px] font-bold">
                Pincode
                <input value={customerForm.pincode} onChange={(event) => setCustomerForm((prev) => ({ ...prev, pincode: event.target.value }))} placeholder="Enter pincode" className={fieldClass} />
              </label>
            </div>
          </section>
        </div>

        <section className={`mt-3 rounded-lg border border-[#e5e7eb] bg-white p-3 ${billingStep === 2 ? "hidden" : ""}`}><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">Product Details</h2><button type="button" onClick={() => setShowProductModal(true)} className="rounded-md bg-[#1a3c36] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#214a42]"><Plus className="mr-1 inline h-3.5 w-3.5" /> Add Item</button></div>{items.length ? <div className="overflow-x-auto"><table className="min-w-full text-left text-[11px]"><thead><tr className="bg-[#fff4ed] font-semibold"><th className="rounded-tl-md px-2 py-3">S No</th><th className="px-2 py-3">Product</th><th className="px-2 py-3">Category</th><th className="px-2 py-3">Price</th><th className="px-2 py-3">Qty</th><th className="px-2 py-3">Discount</th><th className="px-2 py-3">Total</th><th className="rounded-tr-md px-2 py-3">Action</th></tr></thead><tbody>{items.map((item, index) => <tr key={item.id} className="border-b border-[#f0f1f3]"><td className="px-2 py-3">{index + 1}</td><td className="px-2 py-3"><div className="flex items-center gap-2"><img src={item.image || "https://placehold.co/80x80/f3f4f6/6b7280?text=No+Image"} alt={item.name} className="h-10 w-10 rounded-md object-cover border border-[#f0f1f3]" /><div><div className="font-semibold text-[#1f2937]">{item.name}</div><div className="font-normal text-[#6b7280]">{item.detail || "-"}</div></div></div></td><td className="px-2 py-3">{item.category}</td><td className="px-2 py-3">{money(item.price)}</td><td className="px-2 py-3"><div className="flex items-center"><button type="button" onClick={() => updateQuantity(item.id, -1)} className="border border-[#e5e7eb] px-2 py-1"><Minus className="h-3 w-3" /></button><span className="border-y border-[#e5e7eb] px-3 py-1">{item.quantity}</span><button type="button" onClick={() => updateQuantity(item.id, 1)} className="border border-[#e5e7eb] px-2 py-1"><Plus className="h-3 w-3" /></button></div></td><td className="px-2 py-3"><input type="number" min="0" value={item.discount} onChange={(event) => updateItemDiscount(item.id, event.target.value)} className="h-9 w-24 rounded-lg border border-[#c7d2d0] px-2 text-right text-xs outline-none transition-all duration-200 focus:border-[#1a3c36] focus:ring-2 focus:ring-[#1a3c36]/20 shadow-sm" /></td><td className="px-2 py-3 font-semibold">{money(item.price * item.quantity - Number(item.discount || 0))}</td><td className="px-2 py-3"><button type="button" onClick={() => removeItem(item.id)} className="rounded-md border border-[#ffb3b3] p-2 text-[#d04d4d]"><Trash2 className="h-3.5 w-3.5" /></button></td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-xs text-[#6b7280]">No products added. Click Add Item to select a product.</p>}</section>

        {billingStep === 1 && <div className="mt-3 flex justify-end"><button type="button" onClick={() => canContinueToAddress && setBillingStep(2)} disabled={!canContinueToAddress} className="rounded-md bg-[#1a3c36] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#214a42] disabled:cursor-not-allowed disabled:opacity-50">Next: Customer Address</button></div>}
        {billingStep === 2 && <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setBillingStep(1)} className="rounded-md bg-[#1a3c36] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#214a42]">Previous</button><button type="button" onClick={() => canContinueToBilling && setBillingStep(3)} disabled={!canContinueToBilling} className="rounded-md bg-[#1a3c36] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#214a42] disabled:cursor-not-allowed disabled:opacity-50">Next: Billing Details</button></div>}

        {billingStep === 3 && <section className="mt-3 rounded-lg border border-[#e5e7eb] bg-white p-4"><h2 className="mb-3 text-sm font-bold">Customer Details</h2><div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3"><span><b>Name:</b> {customerForm.name || "-"}</span><span><b>Email:</b> {customerForm.email || "-"}</span><span><b>Phone:</b> {customerForm.phone || "-"}</span><span><b>Door Number:</b> {customerForm.door_number || "-"}</span><span><b>Street Name:</b> {customerForm.street_name || "-"}</span><span><b>Landmark:</b> {customerForm.landmark || "-"}</span><span><b>City:</b> {customerForm.city || "-"}</span><span><b>District:</b> {customerForm.district || "-"}</span><span><b>State:</b> {customerForm.state || "-"}</span><span><b>Country:</b> {customerForm.country || "-"}</span><span><b>Pincode:</b> {customerForm.pincode || "-"}</span></div></section>}

        <div className={`mt-3 grid gap-3 xl:grid-cols-[1fr_1fr] ${billingStep !== 3 ? "hidden" : ""}`}>
          <section className="hidden rounded-lg border border-[#e5e7eb] bg-white p-3">
            <h2 className="text-sm font-bold">Order Notes</h2>
            <textarea
              placeholder="Enter order notes (optional)"
              className="mt-3 h-24 w-full resize-none rounded-md border border-[#e5e7eb] p-3 text-xs outline-none focus:border-[#1a3c36] focus:ring-1 focus:ring-[#1a3c36]"
            />
          </section>
          <section className="rounded-lg border border-[#e5e7eb] bg-white p-3">
            <h2 className="text-sm font-bold">Discount &amp; Charges</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[10px] font-bold">
                Discount Type
                <select className={fieldClass}>
                  <option>Flat Discount</option>
                  <option>Percentage</option>
                </select>
              </label>
              <label className="text-[10px] font-bold">
                Discount Amount (₹)
                <input
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="text-[10px] font-bold">
                Shipping Charge (₹)
                <input
                  value={shippingCharge}
                  onChange={(event) => setShippingCharge(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label className="text-[10px] font-bold">
                Packaging Charge (₹)
                <input
                  value={packagingCharge}
                  onChange={(event) => setPackagingCharge(event.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>
          </section>
          <section className="rounded-lg border border-[#e5e7eb] bg-white p-3 text-xs">
            <div className="space-y-2">
              <p className="flex justify-between">
                Subtotal <b>{money(subtotal)}</b>
              </p>
              <p className="flex justify-between">
                Discount <b className="text-[#198754]">- {money(discount)}</b>
              </p>
              <p className="flex justify-between">
                Shipping Charge <b>{money(shippingCharge)}</b>
              </p>
              <p className="flex justify-between">
                Packaging Charge <b>{money(packagingCharge)}</b>
              </p>
              <p className="flex justify-between">
                Tax (18%) <b>{money(0)}</b>
              </p>
              <p className="flex justify-between border-t border-[#e5e7eb] pt-3 text-sm font-bold">
                Total Amount{" "}
                <strong className="text-lg text-[#ed5d19]">
                  {money(total)}
                </strong>
              </p>
            </div>
          </section>
        </div>

        <div className={`mt-3 flex flex-col gap-3 rounded-lg border border-[#e5e7eb] bg-white p-3 md:flex-row md:items-end md:justify-between ${billingStep !== 3 ? "hidden" : ""}`}>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-[10px] font-bold">
              Payment Method *
              <select className={fieldClass}>
                <option>Cash</option>
                <option>UPI</option>
                <option>Card</option>
              </select>
            </label>
            <label className="text-[10px] font-bold">
              Received Amount (₹)
              <input
                value={receivedAmount}
                onChange={(event) => setReceivedAmount(event.target.value)}
                className={fieldClass}
              />
            </label>
            <div className="text-[10px] font-bold">
              Change (₹)
              <div className="mt-1 flex h-11 items-center rounded-lg bg-[#e8f7ed] px-3 text-xs font-semibold text-[#198754] shadow-sm border border-[#b7e4ca]">
                {change.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => setBillingStep(2)} className="rounded-md bg-[#1a3c36] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#214a42]">Previous</button>
            <button
              type="button"
              onClick={() => navigate("/admin/billing")}
              className="rounded-md bg-[#1a3c36] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#214a42]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-md bg-[#1a3c36] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#214a42]"
            >
              <Printer className="h-4 w-4" /> Print Preview
            </button>
            <button
              type="button"
              onClick={handleGenerateBill}
              disabled={!isCustomerFormValid}
              className="inline-flex items-center gap-2 rounded-md bg-[#1a3c36] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#214a42] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Printer className="h-4 w-4" /> Generate Bill
            </button>
          </div>
        </div>

        {showProductModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-item-title"
          >
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 id="add-item-title" className="text-base font-bold">
                  Add Item
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowProductModal(false);
                    setSelectedProductId("");
                    setSelectedVariantIndex("0");
                    setSelectedColor("");
                    setSelectedSize("");
                    setProductSearch("");
                  }}
                  className="rounded-md bg-[#1a3c36] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#214a42]"
                >
                  Close
                </button>
              </div>
              <label className="block text-xs font-semibold">
                Category Type
                <select
                  value={selectedCategoryType}
                  onChange={(event) => {
                    setSelectedCategoryType(event.target.value);
                    setSelectedProductId("");
                    setSelectedVariantIndex("0");
                    setSelectedColor("");
                    setSelectedSize("");
                    setProductSearch("");
                  }}
                  className={fieldClass}
                >
                  <option value="Frame">Frame</option>
                  <option value="Albums">Albums</option>
                  <option value="Gift">Gift</option>
                </select>
              </label>
              <label className="mt-3 block text-xs font-semibold">
                Search Product
                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Search product name, code, or category..."
                  className={fieldClass}
                />
              </label>
              <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
                {filteredProductOptions.map((product) => (
                  <button
                    type="button"
                    key={product.id}
                    onClick={() => {
                      setSelectedProductId(product.id);
                      setSelectedVariantIndex("0");
                      setSelectedColor("");
                      setSelectedSize("");
                    }}
                    className={`flex w-full items-center gap-3 rounded-md border px-2 py-2 text-left text-xs transition ${selectedProductId === product.id ? "border-[#ff8a4c] bg-[#fff7f2]" : "border-[#e5e7eb] bg-white hover:bg-[#fffaf7]"}`}
                  >
                    <img
                      src={product.image || "https://placehold.co/80x80/f3f4f6/6b7280?text=No+Image"}
                      alt={product.name}
                      className="h-10 w-10 rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-[#1f2937]">{product.name}</div>
                      <div className="truncate text-[#6b7280]">{product.category}</div>
                    </div>
                  </button>
                ))}
              </div>
              <label className="mt-3 block text-xs font-semibold">
                Select Product
                <select
                  value={selectedProductId}
                  onChange={(event) => {
                    setSelectedProductId(event.target.value);
                    setSelectedVariantIndex("0");
                    setSelectedColor("");
                    setSelectedSize("");
                  }}
                  className={fieldClass}
                >
                  <option value="">Select product...</option>
                  {filteredProductOptions.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
              {/* Frame size variants */}
              {selectedProduct?.variants?.length > 0 && selectedCategoryType === "Frame" && (
                <label className="mt-3 block text-xs font-semibold">
                  Select Frame Size
                  <select
                    value={selectedVariantIndex}
                    onChange={(event) =>
                      setSelectedVariantIndex(event.target.value)
                    }
                    className={fieldClass}
                  >
                    {selectedProduct.variants.map((variant, index) => (
                      <option
                        key={`${variant.size || "size"}-${index}`}
                        value={index}
                      >
                        {variant.size || "Size"} -{" "}
                        {money(
                          variant.offer_price ??
                            variant.selling_price ??
                            variant.mrp ??
                            selectedProduct.price,
                        )}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {/* Album: Color selector */}
              {selectedProduct && selectedCategoryType === "Albums" && selectedProduct.color_options?.length > 0 && (
                <label className="mt-3 block text-xs font-semibold">
                  Select Color
                  <select
                    value={selectedColor}
                    onChange={(event) => setSelectedColor(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Select color...</option>
                    {selectedProduct.color_options.map((color, index) => {
                      const colorName = typeof color === "object" ? (color.name || color.value || String(color)) : color;
                      // Find a variant matching this color (and current size if set)
                      const matchedVariant = selectedProduct.albumVariants?.find((v) => {
                        const cm = String(v.color || "").toLowerCase() === String(colorName).toLowerCase();
                        const sm = !selectedSize || String(v.size || "").toLowerCase() === String(selectedSize).toLowerCase();
                        return cm && sm;
                      });
                      const variantPrice = matchedVariant
                        ? Number(matchedVariant.offerPrice ?? matchedVariant.offer_price ?? matchedVariant.mrp ?? 0)
                        : null;
                      return (
                        <option key={`color-${index}`} value={colorName}>
                          {colorName}{variantPrice ? ` — ${money(variantPrice)}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>
              )}
              {/* Album: Size selector */}
              {selectedProduct && selectedCategoryType === "Albums" && selectedProduct.size_options?.length > 0 && (
                <label className="mt-3 block text-xs font-semibold">
                  Select Size
                  <select
                    value={selectedSize}
                    onChange={(event) => setSelectedSize(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="">Select size...</option>
                    {selectedProduct.size_options.map((size, index) => {
                      const sizeName = typeof size === "object" ? (size.name || size.value || String(size)) : size;
                      // Find a variant matching this size (and current color if set)
                      const matchedVariant = selectedProduct.albumVariants?.find((v) => {
                        const sm = String(v.size || "").toLowerCase() === String(sizeName).toLowerCase();
                        const cm = !selectedColor || String(v.color || "").toLowerCase() === String(selectedColor).toLowerCase();
                        return sm && cm;
                      });
                      const variantPrice = matchedVariant
                        ? Number(matchedVariant.offerPrice ?? matchedVariant.offer_price ?? matchedVariant.mrp ?? 0)
                        : null;
                      return (
                        <option key={`size-${index}`} value={sizeName}>
                          {sizeName}{variantPrice ? ` — ${money(variantPrice)}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowProductModal(false);
                    setSelectedProductId("");
                    setSelectedVariantIndex("0");
                    setSelectedColor("");
                    setSelectedSize("");
                    setProductSearch("");
                  }}
                  className="rounded-md bg-[#1a3c36] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#214a42]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addSelectedProduct}
                  disabled={!selectedProductId}
                  className="rounded-md bg-[#1a3c36] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#214a42] disabled:opacity-50"
                >
                  Add Product
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewBilling;
