import React, { createContext, useState, useCallback, useContext } from "react";
import api from "../api";

const defaultAdminValue = {
    dashboardData: null,
    ordersCache: {},
    productsCache: {},
    stockCache: {},
    videosCache: null,
    reviewsCache: {},
    reportsCache: null,
    isInitialDashboardLoaded: false,
    getDashboardData: async () => null,
    getOrdersData: async () => [],
    getProductsData: async () => null,
    invalidateCache: () => {},
    setDashboardCached: () => {},
    setOrdersCache: () => {},
    setProductsCached: () => {},
    setStockCached: () => {},
    setVideosCache: () => {},
    setReviewsCache: () => {},
    setReportsCache: () => {},
};

export const AdminContext = createContext(defaultAdminValue);

export const AdminProvider = ({ children }) => {
    // Cache states
    const [dashboardData, setDashboardCached] = useState(null);
    const [ordersCache, setOrdersCache] = useState({}); // { status: data }
    const [productsCache, setProductsCached] = useState({}); // { 'page-limit-search-status': data }
    const [stockCache, setStockCached] = useState({}); // { 'page-limit-search': data }
    const [videosCache, setVideosCache] = useState(null);
    const [reviewsCache, setReviewsCache] = useState({}); // { status-rating-search: data }
    const [reportsCache, setReportsCache] = useState(null);

    // Global loading states (optional, but good for first load)
    const [isInitialDashboardLoaded, setInitialDashboardLoaded] = useState(false);

    // ─── Dashboard ────────────────────────────────────────────────
    const getDashboardData = useCallback(async (forceRefresh = false) => {
        if (!forceRefresh && dashboardData) return dashboardData;
        try {
            const res = await api.get("/dashboard");
            setDashboardCached(res.data);
            setInitialDashboardLoaded(true);
            return res.data;
        } catch (err) {
            console.error("Dashboard cache error:", err);
            throw err;
        }
    }, [dashboardData]);

    // ─── Orders ──────────────────────────────────────────────────
    const getOrdersData = useCallback(async (status = "All", forceRefresh = false) => {
        if (!forceRefresh && ordersCache[status]) return ordersCache[status];
        try {
            const res = await api.get(`/orders?status=${status}`);
            setOrdersCache(prev => ({ ...prev, [status]: res.data || [] }));
            return res.data || [];
        } catch (err) {
            console.error("Orders cache error:", err);
            throw err;
        }
    }, [ordersCache]);

    // ─── Products ────────────────────────────────────────────────
    const getProductsData = useCallback(async (params, forceRefresh = false) => {
        const cacheKey = JSON.stringify(params);
        if (!forceRefresh && productsCache[cacheKey]) return productsCache[cacheKey];
        try {
            const res = await api.get("/products", { params });
            setProductsCached(prev => ({ ...prev, [cacheKey]: res.data }));
            return res.data;
        } catch (err) {
            console.error("Products cache error:", err);
            throw err;
        }
    }, [productsCache]);

    const invalidateCache = useCallback((key) => {
        if (key === 'orders') setOrdersCache({});
        if (key === 'dashboard') setDashboardCached(null);
        if (key === 'products') setProductsCached({});
        if (key === 'videos') setVideosCache(null);
        if (key === 'reviews') setReviewsCache({});
        if (key === 'reports') setReportsCache(null);
        if (key === 'all') {
            setDashboardCached(null);
            setOrdersCache({});
            setProductsCached({});
            setStockCached({});
            setVideosCache(null);
            setReviewsCache({});
            setReportsCache(null);
        }
    }, []);

    return (
        <AdminContext.Provider value={{
            dashboardData,
            ordersCache,
            productsCache,
            stockCache,
            videosCache,
            reviewsCache,
            reportsCache,
            isInitialDashboardLoaded,
            getDashboardData,
            getOrdersData,
            getProductsData,
            invalidateCache,
            setDashboardCached,
            setOrdersCache,
            setProductsCached,
            setStockCached,
            setVideosCache,
            setReviewsCache,
            setReportsCache
        }}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = () => {
    const context = useContext(AdminContext);
    return context || defaultAdminValue;
};
