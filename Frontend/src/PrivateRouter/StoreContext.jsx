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

    // ─── Fetch cart from backend database ────────────────────────
    const fetchCart = useCallback(async () => {
        if (!user?.user_id) {
            setCart([]);
            return;
        }
        try {
            setLoadingCart(true);
            const res = await api.get(`/cart/${user.user_id}`);
            const cartData = Array.isArray(res.data?.data)
                ? res.data.data
                : Array.isArray(res.data?.cart)
                ? res.data.cart
                : Array.isArray(res.data)
                ? res.data
                : [];
            setCart(cartData);
        } catch (err) {
            console.error("Fetch cart error:", err);
            setCart([]);
        } finally {
            setLoadingCart(false);
        }
    }, [user?.user_id]);

    // ─── Fetch wishlist from backend ─────────────────────────────
    const fetchWishlist = useCallback(async () => {
        if (!user?.user_id) { setWishlist([]); return; }
        try {
            setLoadingWishlist(true);
            const res = await api.get("/wishlist");
            const wishlistData = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                ? res.data.data
                : Array.isArray(res.data?.wishlist)
                ? res.data.wishlist
                : [];
            setWishlist(wishlistData);
        } catch (err) {
            console.error("Fetch wishlist error:", err);
            toast.error(err?.response?.data?.message || "Unable to load your favorites.");
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
            requireLogin("Please login to add items to your cart");
            return false;
        }

        // Support both options object and legacy signature
        let selectedSize = "Standard";
        let price = 0;
        let qty = 1;
        let selectedAddons = [];
        let selectedCustomizations = {};
        let cookingNotes = "";

        if (variantOrOptions && typeof variantOrOptions === "object" && !variantOrOptions.mrp && !variantOrOptions.sellingPrice && (variantOrOptions.size || variantOrOptions.quantity || variantOrOptions.selectedAddons || variantOrOptions.selected_addons || variantOrOptions.cookingNotes)) {
            selectedSize = variantOrOptions.size || product.portion_size || (product.size_variants?.[0]?.size) || "Standard";
            price = Number(variantOrOptions.price ?? product.final_price ?? product.price ?? product.mrp ?? 0);
            qty = Number(variantOrOptions.quantity || variantOrOptions.qty || 1);
            selectedAddons = variantOrOptions.selectedAddons || variantOrOptions.selected_addons || [];
            selectedCustomizations = variantOrOptions.selectedCustomizations || variantOrOptions.selected_customizations || {};
            cookingNotes = variantOrOptions.cookingNotes || variantOrOptions.cooking_notes || "";
        } else {
            const selectedVariant = variantOrOptions || product.size_variants?.[0] || product.variants?.[0] || null;
            selectedSize = sizeParam || product.portion_size || selectedVariant?.size || selectedVariant?.selectedSizes?.[0] || "Standard";
            price = parseFloat(product.final_price || product.price || selectedVariant?.offer_price || selectedVariant?.sellingPrice || product.mrp || 0);
            qty = Number(qtyParam) || 1;
            selectedAddons = product.selectedAddons || product.selected_addons || [];
            selectedCustomizations = product.selectedCustomizations || product.selected_customizations || {};
            cookingNotes = product.cookingNotes || product.cooking_notes || "";
        }

        const foodImages = Array.isArray(product.food_images) ? product.food_images : [];
        const productImage = product.product_image || product.image || foodImages[0] || "";

        try {
            await api.post("/cart", {
                user_id: user.user_id,
                customer_name: user?.username || user?.name || user?.displayName || "",
                customer_email: user?.email || "",
                customer_phone: user?.mobile_number || user?.phone_number || user?.phone || "",
                food_id: String(product.food_id || product.id || product.product_id),
                product_name: product.food_name || product.product_name || product.name || "Food Item",
                category_name: product.category_name || "",
                cuisine_name: product.cuisine_name || "",
                product_image: productImage,
                food_type: product.food_type || "Veg",
                portion_size: selectedSize,
                mrp: Number(product.mrp || price),
                discount: Number(product.discount || 0),
                price: price,
                quantity: qty,
                selected_addons: selectedAddons,
                selected_customizations: selectedCustomizations,
                cooking_notes: cookingNotes,
            });
            await fetchCart();
            toast.success("Added to cart!");
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
            await fetchCart();
            toast.success("Item removed from cart");
        } catch (err) {
            console.error("Remove cart error:", err);
            toast.error(err?.response?.data?.message || "Failed to remove item");
        }
    };

    const removeFromWishlist = async (wishlistItemId) => {
        if (!user?.user_id) {
            requireLogin("Please login to manage favorites");
            return;
        }

        const targetItem = wishlist.find((item) => String(item.id || item._id || item.food_id || item.product_id) === String(wishlistItemId));
        const foodId = targetItem?.food_id || targetItem?.product_id || wishlistItemId;

        try {
            await api.delete(`/wishlist/${encodeURIComponent(foodId)}`);
            toast.success("Removed from favorites");
            await fetchWishlist();
        } catch (err) {
            console.error("Remove wishlist error:", err);
            toast.error(err?.response?.data?.message || "Failed to remove favorite");
        }
    };

    const updateCartQuantity = async (cartItemId, qty) => {
        if (qty < 1) {
            await removeFromCart(cartItemId);
            return;
        }
        const targetItem = cart.find(i => (i.id === cartItemId || i.cart_id === cartItemId));
        if (!targetItem) return;

        // Resolve available stock safely from size_variants or stock_quantity
        let availableStock = 99; // default fallback
        if (targetItem.size_variants && Array.isArray(targetItem.size_variants) && targetItem.size_variants.length > 0) {
            const matched = targetItem.size_variants.find(
                (v) => String(v.size || "").trim().toLowerCase() === String(targetItem.size || targetItem.portion_size || "").trim().toLowerCase()
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

        // Optimistic UI update in state
        setCart((prev) =>
            prev.map((item) =>
                (item.id === cartItemId || item.cart_id === cartItemId)
                    ? {
                          ...item,
                          quantity: qty,
                          total_price: Number(item.price || 0) * qty,
                      }
                    : item
            )
        );

        try {
            await api.put(`/cart/${cartItemId}`, {
                quantity: qty,
                price: targetItem.price
            });
            await fetchCart();
        } catch (err) {
            console.error("Update cart quantity error:", err);
            toast.error("Failed to update quantity");
            await fetchCart();
        }
    };

    const clearCart = async () => {
        if (!user?.user_id) return;
        setCart([]);
        try {
            await api.delete(`/cart/clear/${user.user_id}`);
            await fetchCart();
        } catch (err) {
            console.error("Clear cart error:", err);
        }
    };

    // ─── WISHLIST ACTIONS ────────────────────────────────────────

    const toggleWishlist = async (product) => {
        if (!user?.user_id) {
            requireLogin("Please login before adding favorites");
            return false;
        }

        const foodId = product.food_id || product.id || product.product_id;
        if (!foodId) {
            toast.error("This menu item could not be identified.");
            return false;
        }
        const isAlready = wishlist.some((item) => String(item.food_id || item.product_id || item.id || item._id) === String(foodId));

        try {
            if (isAlready) {
                await api.delete(`/wishlist/${encodeURIComponent(foodId)}`);
                toast.success("Removed from favorites");
            } else {
                await api.post("/wishlist", {
                    food_id: foodId,
                });
                toast.success("Added to favorites!");
            }
            await fetchWishlist();
            return true;
        } catch (err) {
            console.error("Toggle wishlist error:", err);
            toast.error(err?.response?.data?.message || "Failed to update favorites");
            return false;
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
