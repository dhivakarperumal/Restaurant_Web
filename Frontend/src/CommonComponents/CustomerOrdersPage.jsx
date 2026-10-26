import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3, LayoutGrid, List, MapPin, PackageCheck, RefreshCw, Search, UserRound, UtensilsCrossed, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api, { BACKEND_BASE_URL } from '../api';
import PageHeader from './PageHeader';

const STATUS_OPTIONS = [
  { value: 'placed', label: 'Order Placed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const formatStatus = (status) => {
  const normalized = String(status || 'placed').toLowerCase();
  if (normalized === 'completed') return 'Delivered';
  return STATUS_OPTIONS.find((option) => option.value === normalized)?.label || normalized.replaceAll('_', ' ');
};

const STATUS_FLOW = ['placed', 'preparing', 'ready', 'assigned', 'delivered'];

const getAvailableStatusOptions = (order) => {
  const current = String(order?.order_status || 'placed').toLowerCase();
  const normalized = current === 'completed' ? 'delivered' : current;

  if (normalized === 'cancelled') {
    return [{ value: 'cancelled', label: 'Cancelled' }];
  }

  if (normalized === 'delivered') {
    return [{ value: 'delivered', label: 'Delivered' }];
  }

  const isPickup = order?.order_type === 'pickup';
  const flow = isPickup
    ? ['placed', 'preparing', 'ready', 'delivered']
    : STATUS_FLOW;

  const currentIndex = flow.indexOf(normalized);

  if (currentIndex === -1) {
    return STATUS_OPTIONS;
  }

  // Hide previous order statuses so only the current and subsequent statuses are selectable
  return STATUS_OPTIONS.filter((option) => {
    if (option.value === 'cancelled') return true;
    if (isPickup && option.value === 'assigned') return false;
    const optionIndex = flow.indexOf(option.value);
    return optionIndex >= currentIndex;
  });
};

const FILTERS = {
  all: {},
  new: { status: 'placed' },
  delivery: { order_type: 'home_delivery' },
  pickup: { order_type: 'pickup' },
  delivered: { status: 'delivered' },
  cancelled: { status: 'cancelled' },
};

const imageUrl = (image) => {
  if (!image) return '';
  if (/^https?:\/\//i.test(image)) return image;
  return `${BACKEND_BASE_URL}${image.startsWith('/') ? image : `/${image}`}`;
};

const isPartnerAvailable = (partner) => (
  Boolean(partner.check_in && !partner.check_out)
  && String(partner.available_for_delivery || 'Yes').toLowerCase() !== 'no'
  && String(partner.current_status || 'Available').toLowerCase() === 'available'
);

const formatDate = (value) => {
  if (!value) return 'Date unavailable';
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const isOrderFromToday = (order) => {
  if (!order.created_at) return false;
  const createdAt = new Date(order.created_at);
  const today = new Date();
  return !Number.isNaN(createdAt.getTime())
    && createdAt.getFullYear() === today.getFullYear()
    && createdAt.getMonth() === today.getMonth()
    && createdAt.getDate() === today.getDate();
};

const KITCHEN_STATUS_TO_ORDER_STATUS = {
  Pending: 'placed',
  Preparing: 'preparing',
  'Ready to Serve': 'ready',
  Served: 'delivered',
  Cancelled: 'cancelled',
};

const formatKotNumber = (order) => {
  const ticketId = String(order.kot_number || order.order_id || '').trim().toUpperCase();
  const kotMatch = ticketId.match(/^(?:KOT-?)+(\d+)$/);
  if (kotMatch) return `KOT${kotMatch[1].padStart(3, '0')}`;
  if (order.id !== null && order.id !== undefined && order.id !== '' && Number.isFinite(Number(order.id))) {
    return `KOT${String(order.id).padStart(3, '0')}`;
  }
  if (ticketId.startsWith('KOT-')) return ticketId;
  return `KOT-${ticketId.slice(0, 8)}`;
};

const normalizeKitchenOrder = (order) => ({
  order_number: formatKotNumber(order),
  kitchen_order_id: order.order_id,
  customer_name: `Table ${order.table_number}`,
  customer_phone: 'Dining order',
  customer_email: '',
  order_type: 'dine-in',
  order_status: KITCHEN_STATUS_TO_ORDER_STATUS[order.status] || 'placed',
  kitchen_status: order.status || 'Pending',
  is_kitchen_order: true,
  created_at: order.created_at,
  table_number: order.table_number,
  bill_number: order.bill_number,
  round_number: order.round_number || 1,
  payment_method: 'Table bill',
  payment_status: order.bill_status || 'Active',
  total_amount: (order.items || []).reduce(
    (total, item) => total + Number(item.unit_price || 0) * Number(item.quantity || 1),
    0
  ),
  items: (order.items || []).map((item) => ({
    food_id: item.food_id,
    product_name: item.food_name,
    quantity: Number(item.quantity || 1),
    unit_price: Number(item.unit_price || 0),
    total_price: Number(item.unit_price || 0) * Number(item.quantity || 1),
  })),
});

const fetchOrderLists = async ({ isCustomer, params, includeKitchenOrders }) => {
  const requests = [
    api.get(isCustomer ? '/orders/mine' : '/orders/management', {
      params: isCustomer ? undefined : params,
    }),
  ];
  if (includeKitchenOrders) {
    requests.push(api.get('/kitchen-orders', { params: { all: 1 } }));
  }

  const [customerResponse, kitchenResponse] = await Promise.all(requests);
  const customerOrders = Array.isArray(customerResponse.data?.data) ? customerResponse.data.data : [];
  const kitchenOrders = Array.isArray(kitchenResponse?.data?.orders)
    ? kitchenResponse.data.orders.map(normalizeKitchenOrder)
    : [];
  return [...customerOrders, ...kitchenOrders];
};

function CustomerOrdersPage({
  audience = 'admin',
  view = 'all',
  showOrderFilters = false,
  showOrderSummaryCards = false,
  todayOnly = false,
  includeKitchenOrders = false,
}) {
  const getInitialOrderType = (v) => (v === 'delivery' ? 'home_delivery' : v === 'pickup' ? 'pickup' : 'all');
  const getInitialStatus = (v) => (v === 'new' ? 'placed' : v === 'cancelled' ? 'cancelled' : v === 'delivered' ? 'delivered' : 'all');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updatingOrder, setUpdatingOrder] = useState('');
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [loadingDeliveryPartners, setLoadingDeliveryPartners] = useState(false);
  const [deliveryPartnersError, setDeliveryPartnersError] = useState('');
  const [assignmentDrafts, setAssignmentDrafts] = useState({});
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentModalOrder, setAssignmentModalOrder] = useState(null);
  const [assignmentOrderNumber, setAssignmentOrderNumber] = useState('');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState(getInitialOrderType(view));
  const [statusFilter, setStatusFilter] = useState(getInitialStatus(view));
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('latest');
  const [layout, setLayout] = useState('table');
  const [page, setPage] = useState(1);

  // Immediately synchronize filter state whenever audience or view prop changes
  const [prevViewKey, setPrevViewKey] = useState(`${audience}-${view}`);
  if (prevViewKey !== `${audience}-${view}`) {
    setPrevViewKey(`${audience}-${view}`);
    setOrderTypeFilter(getInitialOrderType(view));
    setStatusFilter(getInitialStatus(view));
    setSearchTerm('');
    setOrders([]);
    setLoading(true);
    setError('');
  }

  const isCustomer = audience === 'customer';
  const isAdminOrdersOrangePage = audience === 'admin' && ['all', 'pickup', 'delivery', 'delivered', 'cancelled'].includes(view);
  const useLightOrderSummary = (audience === 'admin' && ['all', 'pickup', 'delivery', 'delivered', 'cancelled'].includes(view))
    || (audience === 'chef' && ['all', 'new', 'pickup', 'delivery', 'cancelled'].includes(view) && (showOrderFilters || showOrderSummaryCards));
  const showChefDeliveryTable = audience === 'chef' && view === 'delivery';
  const canAssignDelivery = showChefDeliveryTable || (showOrderFilters && view === 'delivery');
  const isAdminHomeDeliveryOrders = audience === 'admin' && view === 'delivery' && todayOnly;
  const showOrderSummary = audience === 'admin' || (audience === 'chef' && (showOrderFilters || showOrderSummaryCards));
  const title = isCustomer
    ? 'My Orders'
    : audience === 'chef' && view === 'delivery' ? 'Home Delivery Orders'
      : audience === 'chef' && view === 'new' ? 'New Customer Orders'
        : audience === 'chef' && view === 'pickup' ? 'Pickup Orders'
          : audience === 'chef' && view === 'cancelled' ? 'Cancelled Orders'
            : audience === 'chef' ? 'All Customer Orders'
      : view === 'new' ? 'New Orders'
        : view === 'pickup' ? 'Pickup Orders'
          : view === 'delivered' ? 'Delivered Orders'
          : view === 'cancelled' ? 'Cancelled Orders'
            : view === 'delivery' ? (showOrderFilters ? 'Home Delivery Orders' : 'Delivery Orders')
            : 'Customer Orders';
  const filterStatus = showOrderFilters && ['new', 'delivery', 'pickup', 'delivered', 'cancelled'].includes(view)
    ? (statusFilter === 'all' ? undefined : statusFilter)
    : FILTERS[view]?.status;
  const filterOrderType = FILTERS[view]?.order_type;
  const visibleOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return orders
      .filter((order) => {
        if (orderTypeFilter !== 'all' && order.order_type && order.order_type !== orderTypeFilter) {
          return false;
        }
        return statusFilter === 'all' || order.order_status === statusFilter;
      })
      .filter((order) => {
        if (!query) return true;
        const text = [
          order.order_number,
          order.customer_name,
          order.customer_phone,
          order.customer_email,
          order.table_number,
          order.bill_number,
          ...(order.items || []).map((item) => item.product_name),
        ].join(' ').toLowerCase();
        return text.includes(query);
      })
      .sort((first, second) => {
        const difference = new Date(first.created_at || 0).getTime() - new Date(second.created_at || 0).getTime();
        return sortOrder === 'latest' ? -difference : difference;
      });
  }, [orders, orderTypeFilter, searchTerm, sortOrder, statusFilter]);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(visibleOrders.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageOffset = (currentPage - 1) * pageSize;
  const paginatedOrders = visibleOrders.slice(pageOffset, pageOffset + pageSize);
  const assignableHomeDeliveryOrders = visibleOrders.filter((order) => (
    !order.is_kitchen_order
    && order.order_type === 'home_delivery'
    && !order.assigned_delivery_partner_id
    && !['delivered', 'completed', 'cancelled'].includes(String(order.order_status || '').toLowerCase())
  ));
  const selectedAssignmentOrder = assignmentModalOrder
    || assignableHomeDeliveryOrders.find((order) => order.order_number === assignmentOrderNumber)
    || null;
  const statusCounts = useMemo(() => STATUS_OPTIONS.reduce((counts, status) => {
    counts[status.value] = orders.filter((order) => order.order_status === status.value).length;
    return counts;
  }, {}), [orders]);

  const fetchOrders = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const activeOrderType = showOrderFilters
        ? (orderTypeFilter !== 'all' ? orderTypeFilter : undefined)
        : filterOrderType;
      const params = {
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(activeOrderType ? { order_type: activeOrderType } : {}),
      };
      const fetchedOrders = await fetchOrderLists({ isCustomer, params, includeKitchenOrders });
      const visibleOrders = todayOnly
        ? fetchedOrders.filter(isOrderFromToday)
        : fetchedOrders;
      setOrders(visibleOrders);
      setError('');
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Customer orders could not be loaded.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterStatus, filterOrderType, includeKitchenOrders, isCustomer, orderTypeFilter, showOrderFilters, todayOnly]);

  const fetchDeliveryPartners = useCallback(async () => {
    if (!canAssignDelivery) return;
    try {
      const { data } = await api.get('/delivery-partners', {
        params: isAdminHomeDeliveryOrders ? { all: 'true' } : undefined,
      });
      setDeliveryPartners(Array.isArray(data?.data) ? data.data : []);
      setDeliveryPartnersError('');
    } catch (requestError) {
      setDeliveryPartnersError(requestError.response?.data?.message || 'Delivery partners could not be loaded.');
      setDeliveryPartners([]);
    } finally {
      setLoadingDeliveryPartners(false);
    }
  }, [canAssignDelivery, isAdminHomeDeliveryOrders]);

  useEffect(() => {
    if (!canAssignDelivery) return undefined;
    setLoadingDeliveryPartners(true);
    fetchDeliveryPartners();
    const handleAttendanceUpdate = () => {
      fetchDeliveryPartners();
    };
    window.addEventListener('attendance-updated', handleAttendanceUpdate);
    return () => {
      window.removeEventListener('attendance-updated', handleAttendanceUpdate);
    };
  }, [canAssignDelivery, fetchDeliveryPartners]);

  useEffect(() => {
    let isCancelled = false;
    const executeFetch = async (showSpinner = false) => {
      if (showSpinner) setRefreshing(true);
      try {
        const activeOrderType = showOrderFilters
          ? (orderTypeFilter !== 'all' ? orderTypeFilter : undefined)
          : filterOrderType;
        const params = {
          ...(filterStatus ? { status: filterStatus } : {}),
          ...(activeOrderType ? { order_type: activeOrderType } : {}),
        };
        const fetchedOrders = await fetchOrderLists({ isCustomer, params, includeKitchenOrders });
        if (isCancelled) return;
        setOrders(todayOnly ? fetchedOrders.filter(isOrderFromToday) : fetchedOrders);
        setError('');
        if (canAssignDelivery) {
          fetchDeliveryPartners();
        }
      } catch (requestError) {
        if (isCancelled) return;
        const message = requestError.response?.data?.message || 'Customer orders could not be loaded.';
        setError(message);
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    executeFetch();
    const intervalId = window.setInterval(() => executeFetch(false), 15000);
    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [canAssignDelivery, fetchDeliveryPartners, filterStatus, filterOrderType, includeKitchenOrders, isCustomer, orderTypeFilter, showOrderFilters, todayOnly]);

  const changeStatus = async (order, status, deliveryPartnerId = '') => {
    setUpdatingOrder(order.order_number);
    try {
      const { data } = await api.patch(
        `/orders/management/${encodeURIComponent(order.order_number)}/status`,
        { status, ...(status === 'assigned' ? { delivery_partner_id: deliveryPartnerId } : {}) }
      );
      if (!data?.success) throw new Error(data?.message || 'Order status could not be updated.');
      setOrders((current) => current.map((item) => (
        item.order_number === order.order_number
          ? {
            ...item,
            order_status: status,
            ...(status === 'assigned' ? {
              assigned_delivery_partner_id: data.data?.assigned_delivery_partner_id,
              assigned_partner_name: deliveryPartners.find((partner) => partner.employee_id === deliveryPartnerId)?.full_name
                || data.data?.assigned_partner_name,
              assigned_partner_phone: deliveryPartners.find((partner) => partner.employee_id === deliveryPartnerId)?.phone_number || '',
              assigned_partner_profile_photo: deliveryPartners.find((partner) => partner.employee_id === deliveryPartnerId)?.profile_photo || '',
            } : {}),
          }
          : item
      )));
      setAssignmentDrafts((current) => {
        const next = { ...current };
        delete next[order.order_number];
        return next;
      });
      toast.success(status === 'assigned' ? 'Delivery partner assigned.' : 'Customer order updated.');
      return true;
    } catch (requestError) {
      const message = requestError.response?.data?.message || requestError.message || 'Order status could not be updated.';
      if (status === 'assigned') setAssignmentError(message);
      toast.error(message);
      return false;
    } finally {
      setUpdatingOrder('');
    }
  };

  const openAssignmentModal = (order) => {
    setAssignmentModalOpen(true);
    setAssignmentModalOrder(order);
    setAssignmentOrderNumber(order?.order_number || '');
    setPartnerSearch('');
    setSelectedPartnerId(deliveryPartners.some((partner) => partner.employee_id === order?.assigned_delivery_partner_id && isPartnerAvailable(partner))
      ? order.assigned_delivery_partner_id
      : '');
    setAssignmentError('');
  };

  const closeAssignmentModal = useCallback(() => {
    if (updatingOrder) return;
    setAssignmentModalOpen(false);
    setAssignmentModalOrder(null);
    setAssignmentOrderNumber('');
    setAssignmentError('');
  }, [updatingOrder]);

  const assignSelectedPartner = async () => {
    if (!selectedAssignmentOrder || !selectedPartnerId || updatingOrder) return;
    const succeeded = await changeStatus(selectedAssignmentOrder, 'assigned', selectedPartnerId);
    if (succeeded) {
      setAssignmentModalOpen(false);
      setAssignmentModalOrder(null);
      setAssignmentOrderNumber('');
      setAssignmentError('');
    }
  };

  const selectAssignmentOrder = (orderNumber) => {
    setAssignmentModalOrder(null);
    setAssignmentOrderNumber(orderNumber);
    setPartnerSearch('');
    const order = assignableHomeDeliveryOrders.find((item) => item.order_number === orderNumber);
    setSelectedPartnerId(deliveryPartners.some((partner) => partner.employee_id === order?.assigned_delivery_partner_id && isPartnerAvailable(partner))
      ? order.assigned_delivery_partner_id
      : '');
    setAssignmentError('');
  };

  const selectOrderStatus = (order, status) => {
    if (canAssignDelivery && order.order_type === 'home_delivery' && status === 'assigned') {
      if (isAdminHomeDeliveryOrders) {
        openAssignmentModal(null);
        return;
      }
      setAssignmentDrafts((current) => ({ ...current, [order.order_number]: '' }));
      return;
    }
    setAssignmentDrafts((current) => {
      const next = { ...current };
      delete next[order.order_number];
      return next;
    });
    changeStatus(order, status);
  };

  const renderPartnerAssignment = (order) => {
    if (isAdminHomeDeliveryOrders && order.order_type === 'home_delivery') {
      return (
        <div className="min-w-40">
          <p className="truncate font-semibold text-[#263830]">{order.assigned_partner_name || 'Not assigned'}</p>
          {order.assigned_partner_phone && <p className="mt-0.5 text-[11px] text-[#68766e]">{order.assigned_partner_phone}</p>}
        </div>
      );
    }
    const isSelectingPartner = Object.prototype.hasOwnProperty.call(assignmentDrafts, order.order_number);
    if (!canAssignDelivery || order.order_type !== 'home_delivery') return '—';
    if (!isSelectingPartner) return order.assigned_partner_name || 'Not assigned';

    return (
      <div className="flex min-w-64 flex-col gap-2">
        <select
          value={assignmentDrafts[order.order_number]}
          onChange={(event) => setAssignmentDrafts((current) => ({ ...current, [order.order_number]: event.target.value }))}
          disabled={loadingDeliveryPartners || updatingOrder === order.order_number}
          aria-label={`Choose delivery partner for order ${order.order_number}`}
          className={`rounded-lg border border-[#d9ded8] bg-white px-2 py-1.5 text-xs text-[#263830] disabled:opacity-50 ${isAdminOrdersOrangePage ? 'outline-none focus:border-[#FF5A00] focus:ring-1 focus:ring-[#FF5A00]' : ''}`}
        >
          <option value="">
            {loadingDeliveryPartners
              ? 'Loading logged-in partners…'
              : deliveryPartners.length === 0
              ? 'No delivery partner logged in'
              : 'Choose delivery partner'}
          </option>
          {deliveryPartners.map((partner) => (
            <option key={partner.employee_id} value={partner.employee_id}>
              {partner.full_name}{partner.phone_number ? ` · ${partner.phone_number}` : ''}
            </option>
          ))}
        </select>
        {deliveryPartnersError && <span role="alert" className="text-xs text-red-700">{deliveryPartnersError}</span>}
        {!loadingDeliveryPartners && !deliveryPartnersError && deliveryPartners.length === 0 && (
          <span className="rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 border border-amber-200">
            No delivery partners are currently logged in.
          </span>
        )}
        <button
          type="button"
          onClick={() => changeStatus(order, 'assigned', assignmentDrafts[order.order_number])}
          disabled={!assignmentDrafts[order.order_number] || loadingDeliveryPartners || updatingOrder === order.order_number}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${isAdminOrdersOrangePage ? 'bg-[#FF5A00] transition hover:bg-[#E94B00]' : 'bg-[#1a3c36]'}`}
        >
          {updatingOrder === order.order_number ? 'Assigning…' : 'Assign'}
        </button>
      </div>
    );
  };

  const matchingDeliveryPartners = deliveryPartners.filter((partner) => {
    const query = partnerSearch.trim().toLowerCase();
    if (!query) return true;
    return `${partner.full_name || ''} ${partner.phone_number || ''}`.toLowerCase().includes(query);
  });

  useEffect(() => {
    if (!assignmentModalOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !updatingOrder) closeAssignmentModal();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [assignmentModalOpen, closeAssignmentModal, updatingOrder]);

  return (
    <>
      {isCustomer && <PageHeader title={title} />}
      <main className="min-h-screen  p-2 sm:p-2 lg:p-2">
      <div className="mx-auto max-w-[1500px] space-y-6">
       

        {!isCustomer && showOrderSummary && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { title: 'Total Orders', value: orders.length, icon: UtensilsCrossed, bg: 'bg-[#22c55e]', accent: '#f97316', iconBg: 'bg-orange-500', hint: 'All orders in view' },
              { title: 'Pending / Active', value: (statusCounts['placed'] || 0) + (statusCounts['preparing'] || 0), icon: Clock3, bg: 'bg-[#f59e0b]', accent: '#10b981', iconBg: 'bg-emerald-500', hint: 'Placed & preparing' },
              { title: 'Completed', value: (statusCounts['completed'] || 0) + (statusCounts['delivered'] || 0), icon: PackageCheck, bg: 'bg-[#3b82f6]', accent: '#3b82f6', iconBg: 'bg-blue-500', hint: 'Delivered or done' },
              { title: 'Cancelled', value: statusCounts['cancelled'] || 0, icon: MapPin, bg: (statusCounts['cancelled'] || 0) > 0 ? 'bg-[#ef4444]' : 'bg-[#8b5cf6]', accent: '#ec4899', iconBg: 'bg-pink-500', hint: 'Cancelled orders' },
            ].map(({ title: cardTitle, value, icon: Icon, bg, accent, iconBg, hint }, index) => (
              <article
                key={cardTitle}
                className={useLightOrderSummary
                  ? "group relative flex min-h-[194px] min-w-0 flex-col justify-between overflow-hidden rounded-[20px] border border-slate-200/90 bg-white p-5 shadow-[0_4px_16px_-5px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_22px_-7px_rgba(15,23,42,0.12)] sm:p-6"
                  : `relative flex min-h-[140px] min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-transparent p-4 text-white shadow-[0_2px_10px_rgba(20,56,34,0.08)] sm:p-5 ${bg}`}
                style={useLightOrderSummary ? { background: `linear-gradient(135deg, #ffffff 48%, ${accent}12 100%)` } : undefined}
              >
                {useLightOrderSummary ? (
                  <>
                    <div className="relative z-10 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 pt-1">
                        <h3 className="truncate text-[12px] font-bold uppercase tracking-[0.08em] text-slate-500">{cardTitle}</h3>
                        <div className="mt-4 truncate text-[30px] font-black leading-none tracking-tight text-slate-900 sm:text-[34px]">{value}</div>
                      </div>
                      <span className={`flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[18px] text-white shadow-[0_5px_12px_-4px_rgba(15,23,42,0.25)] ${iconBg}`}>
                        <Icon size={27} strokeWidth={2.3} />
                      </span>
                    </div>
                    <div className="relative z-10 mt-5 flex items-center gap-2 border-t border-slate-100/90 pt-3.5 text-xs">
                      <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2 py-0.5 text-[11px] font-bold text-emerald-600">Live</span>
                      <span className="truncate text-xs font-medium text-slate-500">{hint}</span>
                      <span className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
                    </div>
                    <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-20 blur-2xl" style={{ backgroundColor: accent }} />
                    <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100" style={{ backgroundColor: accent }} />
                  </>
                ) : (
                  <>
                    <div className="relative z-10 flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/20 shadow-sm">
                        <Icon size={24} strokeWidth={2.2} className="text-white" />
                      </div>
                      <div className="mt-0.5 min-w-0 flex-1">
                        <h3 className="mb-1 truncate text-[12px] font-semibold opacity-90">{cardTitle}</h3>
                        <div className="text-[26px] font-extrabold leading-none tracking-tight">{value}</div>
                      </div>
                    </div>
                    <div className="relative z-10 mt-5 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-white/25 px-1.5 py-0.5 text-[11px] font-bold">↑ Live</span>
                      <span className="truncate text-[11px] font-medium opacity-75">{hint}</span>
                    </div>
                    <div className="pointer-events-none absolute bottom-0 right-0 h-16 w-24 opacity-50">
                      <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="h-full w-full">
                        <defs>
                          <linearGradient id={`ordgrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,50 L0,40 Q25,30 50,40 T100,20 L100,50 Z" fill={`url(#ordgrad-${index})`} />
                        <path d="M0,40 Q25,30 50,40 T100,20" fill="none" stroke="#ffffff" strokeWidth="2.5" />
                      </svg>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}

        {showChefDeliveryTable && (
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-[#e7e0d8] bg-white px-5 py-4 shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a34f32]">Customer orders</p>
              <h1 className="mt-1 font-serif text-2xl font-bold text-[#203129]">Home Delivery Orders</h1>
              <p className="mt-1 text-sm text-[#7c8980]">Track and update home delivery order status.</p>
            </div>
            <span className="rounded-full bg-[#f4f2ed] px-3 py-1.5 text-xs font-bold text-[#34443b]">
              {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </span>
          </div>
        )}

        {showOrderFilters && (
          <section aria-label="Filter orders" className="flex flex-col gap-3 rounded-xl border border-[#e3e7e1] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block w-full sm:max-w-sm sm:flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a857d]" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }}
                placeholder="Search order, customer, phone..."
                aria-label="Search orders"
                className={`h-[46px] w-full rounded-xl border border-[#dfe2e5] bg-white pl-11 pr-3 text-sm text-[#263830] outline-none placeholder:text-[#89938c] ${isAdminOrdersOrangePage ? 'focus:border-[#FF5A00] focus:ring-1 focus:ring-[#FF5A00]' : 'focus:border-[#6d9a79]'}`}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span className="mr-1 whitespace-nowrap text-xs text-[#68766e]">{visibleOrders.length} of {orders.length}</span>
              <select value={orderTypeFilter} onChange={(event) => { setOrderTypeFilter(event.target.value); setPage(1); }} aria-label="Filter orders by type" className={`h-[46px] rounded-xl border border-[#dfe2e5] bg-white px-3 text-sm text-[#263830] outline-none ${isAdminOrdersOrangePage ? 'focus:border-[#FF5A00] focus:ring-1 focus:ring-[#FF5A00]' : 'focus:border-[#6d9a79]'}`}>
                <option value="all">All Types</option>
                <option value="home_delivery">Home Delivery</option>
                <option value="pickup">Pickup</option>
                {includeKitchenOrders && <option value="dine-in">Dining</option>}
              </select>
              <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} aria-label="Filter orders by status" className={`h-[46px] rounded-xl border border-[#dfe2e5] bg-white px-3 text-sm text-[#263830] outline-none ${isAdminOrdersOrangePage ? 'focus:border-[#FF5A00] focus:ring-1 focus:ring-[#FF5A00]' : 'focus:border-[#6d9a79]'}`}>
                <option value="all">All Status ({orders.length})</option>
                {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label} ({statusCounts[status.value]})</option>)}
              </select>
              <select value={sortOrder} onChange={(event) => { setSortOrder(event.target.value); setPage(1); }} aria-label="Sort orders" className={`h-[46px] rounded-xl border border-[#dfe2e5] bg-white px-3 text-sm text-[#263830] outline-none ${isAdminOrdersOrangePage ? 'focus:border-[#FF5A00] focus:ring-1 focus:ring-[#FF5A00]' : 'focus:border-[#6d9a79]'}`}>
                <option value="latest">Sort by: Latest</option>
                <option value="oldest">Sort by: Oldest</option>
              </select>
              <div className="flex h-[46px] overflow-hidden rounded-xl border border-[#dfe2e5] bg-white" role="group" aria-label="Orders view">
                <button type="button" onClick={() => setLayout('table')} aria-label="Table view" aria-pressed={layout === 'table'} title="Table view" className={`grid w-11 place-items-center border-r border-[#dfe2e5] ${layout === 'table' ? (isAdminOrdersOrangePage ? 'bg-[#FF5A00] text-white' : 'bg-[#1a3c36] text-white') : `text-[#66736b] ${isAdminOrdersOrangePage ? 'hover:bg-orange-50 hover:text-[#FF5A00]' : 'hover:bg-gray-50'}`}`}><List size={16} /></button>
                <button type="button" onClick={() => setLayout('card')} aria-label="Card view" aria-pressed={layout === 'card'} title="Card view" className={`grid w-11 place-items-center ${layout === 'card' ? (isAdminOrdersOrangePage ? 'bg-[#FF5A00] text-white' : 'bg-[#1a3c36] text-white') : `text-[#66736b] ${isAdminOrdersOrangePage ? 'hover:bg-orange-50 hover:text-[#FF5A00]' : 'hover:bg-gray-50'}`}`}><LayoutGrid size={16} /></button>
              </div>
              {isAdminHomeDeliveryOrders && (
                <button
                  type="button"
                  onClick={() => openAssignmentModal(null)}
                  disabled={!assignableHomeDeliveryOrders.length}
                  className="h-[46px] rounded-xl bg-[#FF5A00] px-4 text-sm font-bold text-white transition hover:bg-[#E94B00] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Assign Delivery Partner
                </button>
              )}
            </div>
          </section>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
            <button type="button" onClick={() => fetchOrders(true)} className="ml-3 font-bold underline">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-[#e3e7e1] bg-white px-6 py-16 text-center text-sm text-[#68766e]">Loading customer orders…</div>
        ) : visibleOrders.length === 0 ? (
          <div className="rounded-2xl border border-[#e3e7e1] bg-white px-6 py-16 text-center">
            <PackageCheck className="mx-auto h-10 w-10 text-[#a34f32]" />
            <p className="mt-3 text-lg font-bold text-[#263830]">No orders to show</p>
            <p className="mt-1 text-sm text-[#68766e]">New customer orders will appear here automatically.</p>
          </div>
        ) : (showOrderFilters || showChefDeliveryTable) && layout === 'table' ? (
          <div className="overflow-hidden rounded-2xl border border-[#e3e7e1] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className={`${isAdminOrdersOrangePage ? 'bg-[#FF5A00]' : 'bg-[#d4a843]'} text-xs uppercase tracking-wide text-white`}>
                  <tr>{['Order', 'Customer', 'Items', 'Type', 'Status', ...(canAssignDelivery ? ['Delivery Partner'] : []), 'Payment', 'Total', 'Placed'].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-4 font-bold">{heading}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-[#edf0eb]">
                  {paginatedOrders.map((order) => (
                    <tr key={`${order.is_kitchen_order ? 'kitchen' : 'customer'}-${order.order_number}`} className="hover:bg-[#fbfcfa]">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-[#263830]">{order.order_number}</td>
                      <td className="px-4 py-3"><p className="font-semibold text-[#263830]">{order.customer_name}</p><p className="text-xs text-[#68766e]">{order.customer_phone}</p></td>
                      <td className="max-w-56 px-4 py-3 text-xs text-[#435047]">{order.items.map((item) => `${item.product_name} ×${item.quantity}`).join(', ')}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#435047]">{order.order_type === 'home_delivery' ? 'Home Delivery' : order.order_type === 'dine-in' ? 'Dining' : 'Pickup'}</td>
                      <td className="px-4 py-3">
                        {order.is_kitchen_order ? (
                          <span className="whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{order.kitchen_status}</span>
                        ) : (
                          <select
                            value={Object.prototype.hasOwnProperty.call(assignmentDrafts, order.order_number) ? 'assigned' : order.order_status}
                            disabled={updatingOrder === order.order_number || order.payment_status === 'failed' || ['delivered', 'completed', 'cancelled'].includes(String(order.order_status || '').toLowerCase())}
                            onChange={(event) => selectOrderStatus(order, event.target.value)}
                            aria-label={`Update order ${order.order_number} status`}
                            className={`rounded-lg border border-[#d9ded8] bg-white px-2 py-1.5 text-xs font-semibold capitalize text-[#263830] disabled:opacity-50 ${isAdminOrdersOrangePage ? 'outline-none focus:border-[#FF5A00] focus:ring-1 focus:ring-[#FF5A00]' : ''}`}
                          >
                            {getAvailableStatusOptions(order).map((status) => (
                              <option key={status.value} value={status.value}>{status.label}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      {canAssignDelivery && <td className="px-4 py-3 text-xs text-[#435047]">{renderPartnerAssignment(order)}</td>}
                      <td className="whitespace-nowrap px-4 py-3 text-xs capitalize text-[#435047]">{order.payment_method} · {order.payment_status}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-bold text-[#263830]">₹{Number(order.total_amount).toFixed(2)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[#68766e]">{formatDate(order.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={`grid gap-5 ${showOrderFilters ? 'md:grid-cols-2' : 'xl:grid-cols-2'}`}>
            {paginatedOrders.map((order) => (
              <article key={`${order.is_kitchen_order ? 'kitchen' : 'customer'}-${order.order_number}`} className="overflow-hidden rounded-2xl border border-[#e3e7e1] bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf0eb] p-5">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-sm font-bold text-[#263830]">{order.order_number}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[#768078]">
                      <Clock3 size={13} /> {formatDate(order.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      ['cancelled'].includes(order.order_status) ? 'bg-rose-50 text-rose-700'
                        : ['completed', 'delivered'].includes(order.order_status) ? 'bg-emerald-50 text-emerald-700'
                          : ['assigned', 'ready'].includes(order.order_status) ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-800'
                    }`}>
                      {order.is_kitchen_order ? order.kitchen_status : formatStatus(order.order_status)}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#879088]"><UserRound size={14} /> Customer</p>
                    <p className="text-sm font-bold text-[#263830]">{order.customer_name}</p>
                    <p className="mt-1 text-sm text-[#68766e]">{order.customer_phone}</p>
                    {order.customer_email && <p className="mt-1 break-all text-sm text-[#68766e]">{order.customer_email}</p>}
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#879088]">
                      <MapPin size={14} /> {order.is_kitchen_order ? 'Dining table' : order.order_type === 'pickup' ? 'Pickup' : 'Home Delivery address'}
                    </p>
                    {order.is_kitchen_order ? (
                      <p className="text-sm leading-6 text-[#435047]">
                        Table {order.table_number}{order.bill_number ? ` · Bill ${order.bill_number}` : ''} · Round {order.round_number}
                      </p>
                    ) : order.address ? (
                      <p className="text-sm leading-6 text-[#435047]">
                        {[order.address.address_line, order.address.area_locality, order.address.landmark, order.address.city, order.address.state, order.address.pincode].filter(Boolean).join(', ')}
                      </p>
                    ) : (
                      <p className="text-sm text-[#68766e]">Customer pickup</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3 border-t border-[#edf0eb] px-5 py-4">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#879088]"><UtensilsCrossed size={14} /> Items</p>
                  {order.items.map((item) => (
                    <div key={`${order.order_number}-${item.food_id}`} className="flex items-center gap-3">
                      {item.product_image ? (
                        <img src={imageUrl(item.product_image)} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#f4f2ed] text-[#a34f32]"><UtensilsCrossed size={18} /></div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#263830]">{item.product_name}</p>
                        <p className="text-xs text-[#7a857d]">
                          {item.portion_size ? `${item.portion_size} · ` : ''}Qty {item.quantity}
                          {Array.isArray(item.selected_addons) && item.selected_addons.length > 0
                            ? ` · ${item.selected_addons.join(', ')}`
                            : ''}
                        </p>
                        {Object.entries(item.selected_customizations || {}).flatMap(([group, selection]) => {
                          const options = Array.isArray(selection) ? selection : selection ? [selection] : [];
                          return options.map((option) => (
                            <p key={`${group}-${option}`} className="mt-0.5 text-xs text-[#7a857d]">
                              {group === '__custom_request__' ? 'Custom request' : group}: {option}
                            </p>
                          ));
                        })}
                        {item.cooking_notes && <p className="mt-0.5 text-xs italic text-[#7a857d]">Note: {item.cooking_notes}</p>}
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-[#263830]">₹{Number(item.total_price).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <footer className="flex flex-col gap-4 border-t border-[#edf0eb] bg-[#fafbf9] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs text-[#7a857d]">
                      {String(order.payment_method).toUpperCase()} · Payment {order.payment_status}
                    </p>
                    <p className="mt-1 text-lg font-extrabold text-[#263830]">₹{Number(order.total_amount).toFixed(2)}</p>
                  </div>
                  {!isCustomer && !order.is_kitchen_order && (
                    <label className="text-xs font-semibold text-[#68766e]">
                      Update order
                      <select
                        value={Object.prototype.hasOwnProperty.call(assignmentDrafts, order.order_number) ? 'assigned' : order.order_status}
                        disabled={updatingOrder === order.order_number || order.payment_status === 'failed' || ['delivered', 'completed', 'cancelled'].includes(String(order.order_status || '').toLowerCase())}
                        onChange={(event) => selectOrderStatus(order, event.target.value)}
                        className="mt-1 block w-full rounded-lg border border-[#d9ded8] bg-white px-3 py-2 text-sm font-semibold capitalize text-[#263830] disabled:opacity-50 sm:min-w-44"
                      >
                        {getAvailableStatusOptions(order).map((status) => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                      {canAssignDelivery && order.order_type === 'home_delivery' && (
                        <div className="mt-2 text-xs text-[#68766e]">
                          <span className="mb-1 block">Delivery partner</span>
                          {renderPartnerAssignment(order)}
                        </div>
                      )}
                    </label>
                  )}
                </footer>
              </article>
            ))}
          </div>
        )}
        {!loading && !error && visibleOrders.length > 0 && (
          <nav aria-label="Order pages" className="flex flex-col gap-3 rounded-xl border border-[#e1ded8] bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#68766e]">
              Showing {pageOffset + 1}-{Math.min(pageOffset + pageSize, visibleOrders.length)} of {visibleOrders.length} orders
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#dfe2e5] bg-white px-3 text-sm font-medium text-[#34443b] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="min-w-20 text-center text-sm font-medium text-[#34443b]">
                {currentPage} / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
                disabled={currentPage === pageCount}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[#dfe2e5] bg-white px-3 text-sm font-medium text-[#34443b] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </nav>
        )}
      </div>
      </main>
      {isAdminHomeDeliveryOrders && assignmentModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAssignmentModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-delivery-partner-title"
            className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <h2 id="assign-delivery-partner-title" className="text-lg font-extrabold text-slate-900 sm:text-xl">Assign Delivery Partner</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedAssignmentOrder
                    ? <>Order <span className="font-mono font-bold text-slate-700">{selectedAssignmentOrder.order_number}</span></>
                    : 'Choose an order and a delivery partner'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAssignmentModal}
                disabled={Boolean(updatingOrder)}
                aria-label="Close assignment dialog"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              <label className="mb-4 block text-xs font-bold text-slate-600">
                Home Delivery Order
                <select
                  value={selectedAssignmentOrder?.order_number || ''}
                  onChange={(event) => selectAssignmentOrder(event.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#FF5A00] focus:ring-2 focus:ring-orange-100"
                >
                  <option value="" disabled>Select an order</option>
                  {assignableHomeDeliveryOrders.map((order) => (
                    <option key={order.order_number} value={order.order_number}>
                      {order.order_number} · {order.customer_name}
                    </option>
                  ))}
                </select>
              </label>
              {selectedAssignmentOrder?.assigned_delivery_partner_id && (
                <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50/70 px-3.5 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-orange-700">Currently assigned</p>
                  <p className="mt-1 font-semibold text-slate-800">{selectedAssignmentOrder.assigned_partner_name || 'Delivery partner'}</p>
                  {selectedAssignmentOrder.assigned_partner_phone && <p className="mt-0.5 text-sm text-slate-600">{selectedAssignmentOrder.assigned_partner_phone}</p>}
                </div>
              )}

              <label className="relative block">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={partnerSearch}
                  onChange={(event) => setPartnerSearch(event.target.value)}
                  placeholder="Search by name or phone number"
                  aria-label="Search delivery partners"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#FF5A00] focus:ring-2 focus:ring-orange-100"
                />
              </label>

              {deliveryPartnersError && (
                <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <p>{deliveryPartnersError}</p>
                  <button type="button" onClick={() => { setLoadingDeliveryPartners(true); fetchDeliveryPartners(); }} className="mt-1 font-bold underline">Retry loading partners</button>
                </div>
              )}
              {loadingDeliveryPartners && selectedAssignmentOrder ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm font-medium text-slate-500">
                  <RefreshCw size={17} className="animate-spin" /> Loading available delivery partners…
                </div>
              ) : !selectedAssignmentOrder ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  {assignableHomeDeliveryOrders.length
                    ? 'Select an unassigned home delivery order to view partners.'
                    : 'There are no unassigned home delivery orders to assign.'}
                </p>
              ) : !deliveryPartnersError && matchingDeliveryPartners.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-500">
                  {deliveryPartners.length ? 'No partners match your search.' : 'No active delivery partners found.'}
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {matchingDeliveryPartners.map((partner) => {
                    const isSelected = selectedPartnerId === partner.employee_id;
                    const available = isPartnerAvailable(partner);
                    const availability = available
                      ? 'Available'
                      : !partner.check_in || partner.check_out
                        ? 'Off shift'
                        : String(partner.available_for_delivery || 'Yes').toLowerCase() === 'no'
                          ? 'Unavailable'
                          : partner.current_status || 'Unavailable';
                    return (
                      <label
                        key={partner.employee_id}
                        className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                          available ? 'cursor-pointer' : 'cursor-not-allowed opacity-65'
                        } ${
                          isSelected ? 'border-[#FF5A00] bg-orange-50/70 ring-1 ring-[#FF5A00]/20' : 'border-slate-200'
                        } ${
                          available && !isSelected ? 'hover:border-orange-200 hover:bg-slate-50' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="delivery-partner"
                          value={partner.employee_id}
                          checked={isSelected}
                          onChange={() => { setSelectedPartnerId(partner.employee_id); setAssignmentError(''); }}
                          disabled={!available}
                          className="h-4 w-4 accent-[#FF5A00]"
                        />
                        {partner.profile_photo ? (
                          <img src={imageUrl(partner.profile_photo)} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                            {(partner.full_name || 'D').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-slate-800">{partner.full_name}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{partner.phone_number || 'Phone number unavailable'}</span>
                        </span>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${
                          available ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {availability.replaceAll('_', ' ')}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {assignmentError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{assignmentError}</p>}
            </div>

            <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeAssignmentModal}
                disabled={Boolean(updatingOrder)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={assignSelectedPartner}
                disabled={
                  !selectedAssignmentOrder
                  || !selectedPartnerId
                  || !deliveryPartners.some((partner) => partner.employee_id === selectedPartnerId && isPartnerAvailable(partner))
                  || loadingDeliveryPartners
                  || Boolean(updatingOrder)
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#FF5A00] px-5 text-sm font-bold text-white transition hover:bg-[#E94B00] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updatingOrder === selectedAssignmentOrder?.order_number && <RefreshCw size={15} className="animate-spin" />}
                {updatingOrder === selectedAssignmentOrder?.order_number ? 'Assigning…' : 'Assign Delivery Partner'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

export default CustomerOrdersPage;
