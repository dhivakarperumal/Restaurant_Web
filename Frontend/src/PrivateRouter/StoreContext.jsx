import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { toast } from "react-hot-toast";
import api from "../api";
import { AuthContext } from "./AuthContext";

export const StoreContext = createContext();

export const notifyLoginRequired = (message = "Please login to continue") => {
    toast.error(message);
    return false;
};

export const StoreProvider = ({ children }) => {
    const authContext = useContext(AuthContext);
    const user = authContext?.user || null;
    const [cart, setCart] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [loadingCart, setLoadingCart] = useState(false);
    const [loadingWishlist, setLoadingWishlist] = useState(false);
    const [productsCache, setProductsCache] = useState([]);
    const [videosCache, setVideosCache] = useState([]);
    const [bannersCache, setBannersCache] = useState({});
    const [categoriesCache, setCategoriesCache] = useState([]);
    const [lastFetchTime, setLastFetchTime] = useState(0);

    const [budgetMode, setBudgetMode] = useState(user?.budget_mode || false);
    const [budgetAmount, setBudgetAmount] = useState(user?.budget_amount || 0);

    const requireLogin = useCallback((message) => notifyLoginRequired(message), []);

    // Global Cart Sidebar Drawer state
    const [isCartOpen, setIsCartOpen] = useState(false);
    const openCart = useCallback(() => setIsCartOpen(true), []);
    const closeCart = useCallback(() => setIsCartOpen(false), []);
    const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
    const openFavorites = useCallback(() => setIsFavoritesOpen(true), []);
    const closeFavorites = useCallback(() => setIsFavoritesOpen(false), []);

    useEffect(() => {
        if (user) {
            setBudgetMode(user.budget_mode || false);
            setBudgetAmount(user.budget_amount || 0);
        } else {
            setBudgetMode(false);
            setBudgetAmount(0);
        }
    }, [user]);

    const updateBudget = async (mode, amount) => {
        if (!user?.user_id) return;
        try {
            await api.put(`/auth/users/budget/${user.user_id}`, { budget_mode: mode, budget_amount: amount });
            setBudgetMode(mode);
            setBudgetAmount(amount);
            if (authContext && authContext.setUser) {
                const updatedUser = { ...user, budget_mode: mode, budget_amount: amount };
                authContext.setUser(updatedUser);
                localStorage.setItem("user", JSON.stringify(updatedUser));
            }
            toast.success("Budget saved!");
        } catch (err) {
            console.error("Update budget error:", err);
            toast.error("Failed to save budget");
        }
    };

    const getActiveUserId = useCallback(() => {
        if (user?.user_id) return user.user_id;
        let guestId = localStorage.getItem("frame_shop_guest_id");
        if (!guestId) {
            guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            localStorage.setItem("frame_shop_guest_id", guestId);
        }
        return guestId;
    }, [user?.user_id]);

    // ─── Fetch cart from backend ─────────────────────────────────
    const fetchCart = useCallback(async () => {
        const activeId = user?.user_id || localStorage.getItem("frame_shop_guest_id");
        if (!activeId) { setCart([]); return; }
        try {
            setLoadingCart(true);
            const res = await api.get(`/cart/${activeId}`);
            const cartData = Array.isArray(res.data?.data)
                ? res.data.data
                : Array.isArray(res.data?.cart)
                ? res.data.cart
                : Array.isArray(res.data)
                ? res.data
                : [];
            setCart(cartData);
        } catch (err) {
            if (err?.response?.status === 404 || err?.response?.status === 405) {
                setCart([]);
            } else {
                console.error("Fetch cart error:", err);
            }
        } finally {
            setLoadingCart(false);
        }
    }, [user?.user_id]);

    // ─── Fetch wishlist from backend ─────────────────────────────
    const fetchWishlist = useCallback(async () => {
        if (!user?.user_id) { setWishlist([]); return; }
        try {
            setLoadingWishlist(true);
            const res = await api.get(`/wishlist/${user.user_id}`);
            const wishlistData = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                ? res.data.data
                : Array.isArray(res.data?.wishlist)
                ? res.data.wishlist
                : [];
            setWishlist(wishlistData);
        } catch (err) {
            if (err?.response?.status === 404 || err?.response?.status === 405) {
                setWishlist([]);
            } else {
                console.error("Fetch wishlist error:", err);
            }
        } finally {
            setLoadingWishlist(false);
        }
    }, [user?.user_id]);

    const [undeliveredOrdersCount, setUndeliveredOrdersCount] = useState(0);

    // ─── Fetch active/undelivered orders count ──────────────────
    const fetchOrdersCount = useCallback(async () => {
        const activeUserId = user?.user_id || user?.id;
        if (!activeUserId) {
            setUndeliveredOrdersCount(0);
            return;
        }
        try {
            const res = await api.get(`/orders/user/${activeUserId}`);
            const orders = Array.isArray(res.data?.data)
                ? res.data.data
                : Array.isArray(res.data)
                ? res.data
                : [];
            const count = orders.filter((o) => {
                const s = String(o?.order_status || o?.status || "").trim().toUpperCase();
                return s !== "DELIVERED" && s !== "COMPLETED" && s !== "CANCELLED" && s !== "RETURNED";
            }).length;
            setUndeliveredOrdersCount(count);
        } catch (err) {
            setUndeliveredOrdersCount(0);
        }
    }, [user?.user_id, user?.id]);

    // Load cart + wishlist + undelivered orders count when user logs in or mounts
    useEffect(() => {
        fetchCart();
        fetchWishlist();
        fetchOrdersCount();
    }, [fetchCart, fetchWishlist, fetchOrdersCount]);

    // ─── CART ACTIONS ────────────────────────────────────────────

    const addToCart = async (product, variantOrOptions = null, sizeParam = null, qtyParam = 1) => {
        if (!user?.user_id) {
            requireLogin("Please login before adding items to your cart");
            return false;
        }

        const activeUserId = getActiveUserId();

        // Support both old signature (product, variant, size, qty) and new options object
        let selectedSize = "Standard";
        let price = 0;
        let qty = 1;
        let customizationId = null;
        let slotPhotos = null;
        let previewImage = null;

        if (variantOrOptions && typeof variantOrOptions === "object" && !variantOrOptions.mrp && !variantOrOptions.sellingPrice && (variantOrOptions.size || variantOrOptions.slot_photos || variantOrOptions.customization_id || variantOrOptions.preview_image)) {
            selectedSize = variantOrOptions.size || (product.size_variants?.[0]?.size) || "Standard";
            price = Number(variantOrOptions.price ?? product.size_variants?.[0]?.offer_price ?? product.offer_price ?? 0);
            qty = Number(variantOrOptions.quantity || variantOrOptions.qty || 1);
            customizationId = variantOrOptions.customization_id || null;
            slotPhotos = variantOrOptions.slot_photos || null;
            previewImage = variantOrOptions.preview_image || null;
        } else {
            const selectedVariant = variantOrOptions || product.size_variants?.[0] || product.variants?.[0] || null;
            selectedSize = sizeParam || selectedVariant?.size || selectedVariant?.selectedSizes?.[0] || "Standard";
            price = parseFloat(selectedVariant?.offer_price || selectedVariant?.sellingPrice || product.offer_price || product.price || 0);
            qty = Number(qtyParam) || 1;
        }

        const itemType =
            product.item_type ||
            variantOrOptions?.item_type ||
            (product.gift_box_id || String(product.category || "").toLowerCase().includes("gift")
                ? "gift"
                : (product.total_pages || product.sheet_count || String(product.category || "").toLowerCase().includes("album"))
                ? "album"
                : "product");

        try {
            await api.post("/cart", {
                user_id: activeUserId,
                product_id: product.id || product.product_id || product.gift_box_id,
                item_type: itemType,
                customization_id: customizationId,
                size: selectedSize,
                price: price,
                quantity: qty,
                slot_photos: slotPhotos,
                preview_image: previewImage,
            });
            toast.success("Added to cart!");
            await fetchCart();
            openCart();
            return true;
        } catch (err) {
            console.error("Add to cart error:", err);
            toast.error(err?.response?.data?.message || "Failed to add to cart");
            return false;
        }
    };

    const removeFromCart = async (cartItemId) => {
        try {
            await api.delete(`/cart/${cartItemId}`);
            toast.error("Removed from cart");
            await fetchCart();
        } catch (err) {
            console.error("Remove cart error:", err);
            toast.error("Failed to remove item");
        }
    };

    const removeFromWishlist = async (wishlistItemId) => {
        if (!user?.user_id) {
            toast.error("Please login to manage wishlist");
            return;
        }

        const targetItem = wishlist.find((item) => String(item.id || item._id || item.product_id) === String(wishlistItemId));
        const productId = targetItem?.product_id || wishlistItemId;

        try {
            await api.delete(`/wishlist/${user.user_id}/${productId}`);
            toast.success("Removed from favorites");
            await fetchWishlist();
        } catch (err) {
            console.error("Remove wishlist error:", err);
            toast.error("Failed to remove item");
        }
    };

    const updateCartQuantity = async (cartItemId, qty) => {
        if (qty < 1) return;
        const targetItem = cart.find(i => i.id === cartItemId);
        if (!targetItem) return;

        // Resolve available stock safely from size_variants or stock_quantity
        let availableStock = 99; // default fallback
        if (targetItem.size_variants && Array.isArray(targetItem.size_variants) && targetItem.size_variants.length > 0) {
            const matched = targetItem.size_variants.find(
                (v) => String(v.size || "").trim().toLowerCase() === String(targetItem.size || "").trim().toLowerCase()
            );
            if (matched && matched.stock !== undefined && matched.stock !== null && matched.stock !== "") {
                availableStock = Number(matched.stock);
            }
        } else if (targetItem.stock_quantity !== undefined && targetItem.stock_quantity !== null && targetItem.stock_quantity !== "") {
            availableStock = Number(targetItem.stock_quantity);
        }

        if (availableStock > 0 && qty > availableStock) {
            toast.error(`Only ${availableStock} item${availableStock === 1 ? '' : 's'} available in stock.`);
            return;
        }

        if (budgetMode) {
            const currentQty = targetItem.quantity;
            if (qty > currentQty) {
                const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                const addedAmount = targetItem.price * (qty - currentQty);
                if (cartTotal + addedAmount > budgetAmount) {
                    toast.error("Cannot increase quantity. Budget exceeded!");
                    return;
                }
            }
        }

        // Optimistic UI update for instantaneous responsiveness
        const prevQuantity = targetItem.quantity;
        setCart(prev => prev.map(item =>
            item.id === cartItemId ? {
                ...item,
                quantity: qty,
                total_price: Number(item.price || 0) * qty
            } : item
        ));

        try {
            await api.put(`/cart/${cartItemId}`, {
                quantity: qty,
                price: targetItem.price
            });
        } catch (err) {
            console.error("Update qty error:", err);
            // Revert on error
            setCart(prev => prev.map(item =>
                item.id === cartItemId ? {
                    ...item,
                    quantity: prevQuantity,
                    total_price: Number(item.price || 0) * prevQuantity
                } : item
            ));
            const message = err?.response?.data?.message || "Failed to update quantity";
            toast.error(message);
        }
    };

    const clearCart = async () => {
        const activeUserId = getActiveUserId();
        if (!activeUserId) { setCart([]); return; }
        try {
            await api.delete(`/cart/clear/${activeUserId}`);
            setCart([]);
        } catch (err) {
            console.error("Clear cart error:", err);
        }
    };

    // ─── WISHLIST ACTIONS ────────────────────────────────────────

    const toggleWishlist = async (product, variant = null, size = null) => {
        if (!user?.user_id) {
            requireLogin("Please login before adding favorites");
            return;
        }

        const productId = product.id || product.product_id;
        const itemType = product.__wishlistType || (product.gift_box_id ? "gift" : product.product_name && (product.product_images || product.total_pages) ? "album" : "product");
        const isAlready = wishlist.some((item) => String(item.product_id || item.id || item._id) === String(productId));

        try {
            if (isAlready) {
                await api.delete(`/wishlist/${user.user_id}/${productId}`);
                toast.success("Removed from favorites");
            } else {
                const selectedVariant = variant || product.variants?.[0] || null;
                const groceryVariantInfo = (selectedVariant?.quantity && selectedVariant?.unit) ? `${selectedVariant.quantity} ${selectedVariant.unit}` : null;
                const selectedSize = size || groceryVariantInfo || selectedVariant?.selectedSizes?.[0] || "";
                const variantColor = selectedVariant?.colorName || selectedVariant?.color || "";
                
                // Correctly parse images if they are stored as JSON strings
                let productImages = product.images || [];
                if (typeof productImages === "string") {
                    try {
                        productImages = JSON.parse(productImages);
                    } catch {
                        productImages = [];
                    }
                }
                const variantImage = selectedVariant?.images?.[0] || productImages[0] || product.product_images?.[0] || null;
                const price = parseFloat(
                    selectedVariant?.offer_price ||
                    selectedVariant?.sellingPrice ||
                    selectedVariant?.selling_price ||
                    selectedVariant?.mrp ||
                    product.offer_price ||
                    product.price ||
                    0,
                );

                await api.post("/wishlist", {
                    user_id: user.user_id,
                    product_id: productId,
                    variant_color: variantColor,
                    variant_size: selectedSize,
                    image: variantImage,
                    email: user.email || "",
                    price: price,
                    total_price: price,
                    item_type: itemType,
                    item_name: product.name || product.product_name || "",
                });
                toast.success("Added to favorites!");
            }
            await fetchWishlist();
        } catch (err) {
            console.error("Toggle wishlist error:", err);
            toast.error("Failed to update wishlist");
        }
    };

    return (
        <StoreContext.Provider value={{
            cart, wishlist,
            addToCart, removeFromCart, updateCartQuantity, clearCart,
            removeFromWishlist,
            toggleWishlist,
            loadingCart, loadingWishlist,
            fetchCart, fetchWishlist,
            undeliveredOrdersCount, fetchOrdersCount,
            isCartOpen, setIsCartOpen, openCart, closeCart,
            isFavoritesOpen, openFavorites, closeFavorites,
            productsCache, setProductsCache,
            videosCache, setVideosCache,
            bannersCache, setBannersCache,
            categoriesCache, setCategoriesCache,
            lastFetchTime, setLastFetchTime,
            budgetMode, budgetAmount, updateBudget
        }}>
            {children}
        </StoreContext.Provider>
    );
};
