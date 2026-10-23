import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, LocateFixed, MapPin, PackageCheck, ShoppingBag, Store, Truck, UtensilsCrossed } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api, { BACKEND_BASE_URL } from '../../api';
import { useAuth } from '../../PrivateRouter/AuthContext';
import { StoreContext } from '../../PrivateRouter/StoreContext';
import PageContainer from '../../CommonComponents/PageContainer';
import PageHeader from '../../CommonComponents/PageHeader';

let razorpayScriptPromise;

const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve();
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = resolve;
      script.onerror = () => {
        razorpayScriptPromise = null;
        reject(new Error('Razorpay checkout could not be loaded. Check your internet connection and try again.'));
      };
      document.body.appendChild(script);
    });
  }
  return razorpayScriptPromise;
};

const resolveImageUrl = (image) => {
  if (!image || typeof image !== 'string') return '';
  if (/^(https?:\/\/|data:)/i.test(image)) return image;
  return `${BACKEND_BASE_URL}${image.startsWith('/') ? image : `/${image}`}`;
};

const getItemName = (item) => item.product_name || item.name || item.food_name || 'Restaurant item';
const getItemImage = (item) => item.product_image || item.image || item.thumbnail_image || '';
const indianStatesAndTerritories = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];
const addressFields = [
  { name: 'address_line', label: 'Door / street address', placeholder: 'House no., street, building' },
  { name: 'area_locality', label: 'Area / locality', placeholder: 'Area or neighbourhood' },
  { name: 'city', label: 'City', placeholder: 'City' },
  { name: 'state', label: 'State', placeholder: 'State' },
  { name: 'pincode', label: 'Pincode', placeholder: '6-digit pincode' },
  { name: 'landmark', label: 'Landmark (optional)', placeholder: 'Nearby landmark' },
];
const getAddressFromCoordinates = async ({ latitude, longitude }) => {
  const query = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    zoom: '18',
    lat: String(latitude),
    lon: String(longitude),
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`);
  if (!response.ok) {
    throw new Error('Your location could not be converted to an address. Please enter it manually.');
  }

  const result = await response.json();
  const parts = result.address || {};
  const resolvedState = parts.state === 'NCT of Delhi' ? 'Delhi' : parts.state;
  const matchedState = indianStatesAndTerritories.find(
    (state) => state.toLowerCase() === String(resolvedState || '').toLowerCase(),
  );
  const street = [parts.house_number, parts.road || parts.pedestrian || parts.footway]
    .filter(Boolean)
    .join(' ');
  const area = parts.neighbourhood || parts.suburb || parts.quarter || parts.city_district;
  const city = parts.city || parts.town || parts.village || parts.municipality || parts.county;

  if (!result.address || (!street && !area && !city && !parts.state)) {
    throw new Error('No address details were found for your current location. Please enter it manually.');
  }

  return {
    address_line: street || parts.house_name || '',
    area_locality: area || '',
    city: city || '',
    state: matchedState || '',
    pincode: String(parts.postcode || '').replace(/\s/g, '').slice(0, 6),
  };
};

const getCoordinatesFromAddress = async (address, signal) => {
  const areaAndCity = [
    address.area_locality,
    address.city,
    address.state,
    address.pincode,
    'India',
  ].filter(Boolean);
  const searches = [
    [
      address.address_line,
      ...areaAndCity,
    ].filter(Boolean),
    areaAndCity,
    [address.city, address.state, address.pincode, 'India'].filter(Boolean),
  ];

  for (let index = 0; index < searches.length; index += 1) {
    if (signal.aborted) throw new DOMException('Address lookup was cancelled.', 'AbortError');
    if (index > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 1100));
    }
    const query = new URLSearchParams({
      format: 'jsonv2',
      limit: '1',
      countrycodes: 'in',
      q: searches[index].join(', '),
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${query}`, { signal });
    if (!response.ok) {
      throw new Error('Address search is temporarily unavailable. Please try again or use current location.');
    }

    const results = await response.json();
    const latitude = Number(results?.[0]?.lat);
    const longitude = Number(results?.[0]?.lon);
    if (Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
      && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180) {
      return { latitude, longitude };
    }
  }

  throw new Error('We could not find that address. Check the street, area, city, state, and pincode, or use current location.');
};

const getCheckoutIdempotencyKey = async (userId, cart, checkoutDetails) => {
  const requestFingerprint = JSON.stringify({
    userId,
    fulfillmentType: checkoutDetails.fulfillmentType,
    paymentMethod: checkoutDetails.paymentMethod,
    address: checkoutDetails.fulfillmentType === 'home_delivery' ? checkoutDetails.address : null,
    deliveryLocation: checkoutDetails.fulfillmentType === 'home_delivery'
      ? checkoutDetails.deliveryLocation
      : null,
    cart: cart.map((item) => ({
      id: item.id || item.cart_id,
      food_id: item.food_id,
      quantity: item.quantity,
      selected_addons: item.selected_addons,
      selected_customizations: item.selected_customizations,
      cooking_notes: item.cooking_notes,
    })),
  });
  const digest = await window.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(requestFingerprint)
  );
  const fingerprint = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  const storageKey = `checkout-order:${userId}:${fingerprint}`;
  let idempotencyKey = localStorage.getItem(storageKey);
  if (!idempotencyKey) {
    idempotencyKey = window.crypto.randomUUID();
    localStorage.setItem(storageKey, idempotencyKey);
  }
  return { idempotencyKey, storageKey };
};

function Checkout() {
  const { user } = useAuth();
  const store = useContext(StoreContext) || {};
  const { cart = [], loadingCart, fetchCart } = store;
  const navigate = useNavigate();
  const [fulfillmentType, setFulfillmentType] = useState('home_delivery');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [customer, setCustomer] = useState({
    name: user?.name || user?.username || '',
    phone: user?.mobile_number || user?.phone || '',
    email: user?.email || '',
  });
  const [address, setAddress] = useState({
    address_line: '',
    area_locality: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
  });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('new');
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [deliveryQuote, setDeliveryQuote] = useState(null);
  const [deliveryQuoteError, setDeliveryQuoteError] = useState(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [geocodingAddressFingerprint, setGeocodingAddressFingerprint] = useState('');
  const [addressGeocodingError, setAddressGeocodingError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const submissionInProgress = useRef(false);
  const idempotencyContext = useRef(null);

  useEffect(() => {
    if (!user?.user_id) return;
    let active = true;
    api.get('/orders/addresses')
      .then(({ data }) => {
        if (!active) return;
        const addresses = Array.isArray(data?.data) ? data.data : [];
        setSavedAddresses(addresses);
        if (addresses.length > 0) {
          setAddress(addresses[0]);
          setSelectedAddress(String(addresses[0].id));
        }
      })
      .catch((error) => {
        console.error('Saved checkout addresses could not be loaded:', error);
        if (active) toast.error(error?.response?.data?.message || 'Saved addresses could not be loaded.');
      });
    return () => {
      active = false;
    };
  }, [user?.user_id]);

  const addressFingerprint = [
    address.address_line,
    address.area_locality,
    address.city,
    address.state,
    address.pincode,
  ].map((part) => String(part || '').trim()).join('|');
  const geocodingAddress = fulfillmentType === 'home_delivery'
    && !deliveryLocation
    && !fetchingLocation
    && Boolean(addressFingerprint)
    && geocodingAddressFingerprint === addressFingerprint;
  const currentAddressGeocodingError = fulfillmentType === 'home_delivery'
    && !deliveryLocation
    && addressGeocodingError?.fingerprint === addressFingerprint
    ? addressGeocodingError.message
    : '';

  useEffect(() => {
    if (fulfillmentType !== 'home_delivery' || deliveryLocation || fetchingLocation) return undefined;

    const requiredAddressParts = [
      address.address_line,
      address.area_locality,
      address.city,
      address.state,
      address.pincode,
    ];
    if (requiredAddressParts.some((part) => !String(part || '').trim())) return undefined;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setGeocodingAddressFingerprint(addressFingerprint);
      try {
        const location = await getCoordinatesFromAddress(address, controller.signal);
        if (!controller.signal.aborted) setDeliveryLocation(location);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Could not locate the manually entered checkout address:', error);
          setAddressGeocodingError({
            fingerprint: addressFingerprint,
            message: error.message || 'The address could not be located.',
          });
        }
      } finally {
        if (!controller.signal.aborted) setGeocodingAddressFingerprint('');
      }
    }, 700);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [address, addressFingerprint, deliveryLocation, fetchingLocation, fulfillmentType]);

  const subtotal = useMemo(() => cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  ), [cart]);
  const itemCount = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  const quoteFingerprint = `${fulfillmentType}:${subtotal.toFixed(2)}:${deliveryLocation?.latitude ?? ''}:${deliveryLocation?.longitude ?? ''}`;
  const deliveryLatitude = deliveryLocation?.latitude;
  const deliveryLongitude = deliveryLocation?.longitude;
  const currentDeliveryQuote = deliveryQuote?.fingerprint === quoteFingerprint ? deliveryQuote : null;
  const currentDeliveryQuoteError = deliveryQuoteError?.fingerprint === quoteFingerprint
    ? deliveryQuoteError.message
    : '';
  const deliveryQuotePending = fulfillmentType === 'home_delivery'
    && Boolean(deliveryLocation)
    && !currentDeliveryQuote
    && !currentDeliveryQuoteError;

  useEffect(() => {
    if (fulfillmentType !== 'home_delivery'
      || deliveryLatitude === undefined
      || deliveryLongitude === undefined) return undefined;
    let active = true;
    api.post('/orders/delivery-quote', {
      location: { latitude: deliveryLatitude, longitude: deliveryLongitude },
      subtotal,
    })
      .then(({ data }) => {
        if (!active) return;
        if (!data?.success || !data?.data) {
          throw new Error(data?.message || 'The delivery charge could not be calculated.');
        }
        setDeliveryQuote({ ...data.data, fingerprint: quoteFingerprint });
      })
      .catch((error) => {
        if (!active) return;
        console.error('Delivery charge could not be calculated:', error);
        setDeliveryQuoteError({
          fingerprint: quoteFingerprint,
          message: error?.response?.data?.message || error.message || 'The delivery charge could not be calculated.',
        });
      });
    return () => {
      active = false;
    };
  }, [
    deliveryLatitude,
    deliveryLongitude,
    fulfillmentType,
    quoteFingerprint,
    subtotal,
  ]);

  const updateCustomer = (event) => {
    setCustomer((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const updateAddress = (event) => {
    setSelectedAddress('new');
    setDeliveryLocation(null);
    setAddressGeocodingError(null);
    setAddress((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const selectAddress = (event) => {
    const addressId = event.target.value;
    setSelectedAddress(addressId);
    setDeliveryLocation(null);
    const selected = savedAddresses.find((item) => String(item.id) === addressId);
    setAddress(selected || {
      address_line: '',
      area_locality: '',
      city: '',
      state: '',
      pincode: '',
      landmark: '',
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not supported by this browser. Delivery requires device location to calculate the charge.');
      return;
    }

    setDeliveryLocation(null);
    setDeliveryQuote(null);
    setDeliveryQuoteError(null);
    setAddressGeocodingError(null);
    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const location = {
            latitude: coords.latitude,
            longitude: coords.longitude,
          };
          setDeliveryLocation(location);
          const detectedAddress = await getAddressFromCoordinates(coords);
          setSelectedAddress('new');
          setAddress((previous) => ({
            ...previous,
            ...Object.fromEntries(
              Object.entries(detectedAddress).filter(
                ([field, value]) => value && !String(previous[field] || '').trim(),
              ),
            ),
          }));
          toast.success('Location found. Please review your address before placing the order.');
        } catch (error) {
          console.error('Could not resolve current checkout location:', error);
          toast.error(error.message || 'Could not fetch your address. Please enter it manually.');
        } finally {
          setFetchingLocation(false);
        }
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Allow location access or enter your address manually.'
          : error.code === error.TIMEOUT
            ? 'Location lookup timed out. Please try again or enter your address manually.'
            : 'Your current location could not be detected. Please enter your address manually.';
        toast.error(message);
        setFetchingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const finishOrder = async (orderNumber, message) => {
    await fetchCart?.();
    if (idempotencyContext.current) {
      try {
        localStorage.removeItem(idempotencyContext.current.storageKey);
      } catch (error) {
        console.error('Could not clear the completed checkout request key:', error);
      }
      idempotencyContext.current = null;
    }
    setCompletedOrder(orderNumber);
    toast.success(message);
  };

  const placeOrder = async (event) => {
    event.preventDefault();
    if (!user?.user_id) {
      toast.error('Please log in before placing an order.');
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }
    if (!cart.length) {
      toast.error('Your cart is empty.');
      return;
    }
    if (fulfillmentType === 'home_delivery' && !deliveryLocation) {
      toast.error(currentAddressGeocodingError || 'Enter a complete address or use current location to calculate the delivery charge.');
      return;
    }
    if (fulfillmentType === 'home_delivery' && !currentDeliveryQuote) {
      toast.error(currentDeliveryQuoteError || 'Wait for the delivery charge to finish calculating.');
      return;
    }
    if (submissionInProgress.current) return;

    submissionInProgress.current = true;
    setSubmitting(true);
    try {
      const requestKey = await getCheckoutIdempotencyKey(
        user.user_id,
        cart,
        {
          fulfillmentType,
          paymentMethod,
          address,
          deliveryLocation,
        },
      );
      idempotencyContext.current = requestKey;
      const { data } = await api.post(
        '/orders',
        {
          customer,
          order_type: fulfillmentType,
          address: fulfillmentType === 'home_delivery' ? address : null,
          delivery_location: fulfillmentType === 'home_delivery' ? deliveryLocation : null,
          payment_method: paymentMethod,
        },
        { headers: { 'Idempotency-Key': requestKey.idempotencyKey } },
      );
      if (!data?.success || !data?.data?.order_number) {
        throw new Error(data?.message || 'Your order could not be placed.');
      }

      const orderPaymentMethod = data.data.payment_method || paymentMethod;
      if (orderPaymentMethod === 'cod') {
        await finishOrder(data.data.order_number, 'Order placed successfully.');
        return;
      }
      if (data.data.completed) {
        await finishOrder(data.data.order_number, 'Your order is already confirmed.');
        return;
      }

      const paymentDetails = data.data.razorpay;
      if (!paymentDetails?.key_id || !paymentDetails.order_id || !Number(paymentDetails.amount)) {
        throw new Error('Razorpay payment details are incomplete. Please contact the restaurant.');
      }
      await loadRazorpay();
      if (!window.Razorpay) {
        throw new Error('Razorpay checkout could not be initialized. Please try again.');
      }
      const checkout = new window.Razorpay({
        key: paymentDetails.key_id,
        amount: paymentDetails.amount,
        currency: paymentDetails.currency,
        name: 'Restaurant',
        description: `Order ${data.data.order_number}`,
        order_id: paymentDetails.order_id,
        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.phone,
        },
        notes: { order_number: data.data.order_number },
        theme: { color: '#a34f32' },
        handler: async (paymentResponse) => {
          try {
            const verification = await api.post('/orders/verify-payment', {
              order_number: data.data.order_number,
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            });
            if (!verification.data?.success) {
              throw new Error(verification.data?.message || 'Payment could not be verified.');
            }
            await finishOrder(data.data.order_number, 'Payment received. Your order is confirmed.');
          } catch (error) {
            console.error('Razorpay payment verification failed:', error);
            toast.error(error?.response?.data?.message || error.message || 'Payment could not be verified. Please contact the restaurant.');
          } finally {
            setSubmitting(false);
            submissionInProgress.current = false;
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            submissionInProgress.current = false;
            toast('Payment was not completed. Your cart is still available.');
          },
        },
      });
      checkout.on('payment.failed', (response) => {
        setSubmitting(false);
        submissionInProgress.current = false;
        toast.error(response.error?.description || 'Payment failed. Please try again.');
      });
      checkout.open();
    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error(error?.response?.data?.message || error.message || 'Your order could not be placed. Please try again.');
      setSubmitting(false);
      submissionInProgress.current = false;
    }
  };

  if (!user?.user_id) {
    return (
      <main className="min-h-[65vh] bg-[#faf8f5] pb-16">
        <PageHeader title="Log in to checkout" />
        <PageContainer className="pt-12">
          <div className="mx-auto max-w-lg rounded-3xl border border-[#eadfd2] bg-white p-8 text-center shadow-sm">
            <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-[#a34f32]" />
            <p className="text-sm text-[#68766e]">Sign in to save your address and place your order.</p>
            <Link to="/login" state={{ from: '/checkout' }} className="mt-6 inline-flex rounded-xl bg-[#263830] px-6 py-3 font-semibold text-white hover:bg-[#1a2822]">
              Log in
            </Link>
          </div>
        </PageContainer>
      </main>
    );
  }

  if (completedOrder) {
    return (
      <main className="min-h-[65vh] bg-[#faf8f5] pb-16">
        <PageHeader title="Order confirmed" />
        <PageContainer className="pt-12">
          <div className="mx-auto max-w-xl rounded-3xl border border-[#eadfd2] bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-600" />
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a34f32]">Order confirmed</p>
            <h1 className="mt-2 text-3xl font-bold text-[#263830]">Thank you, {customer.name}!</h1>
            <p className="mt-3 text-sm text-[#68766e]">Your order reference is</p>
            <p className="mt-1 break-all font-mono text-sm font-bold text-[#263830]">{completedOrder}</p>
            <Link to="/shop" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#263830] px-6 py-3 font-semibold text-white hover:bg-[#1a2822]">
              <ShoppingBag size={17} /> Continue browsing
            </Link>
          </div>
        </PageContainer>
      </main>
    );
  }

  if (loadingCart) {
    return (
      <main className="min-h-[60vh] bg-[#faf8f5] pb-16">
        <PageHeader title="Checkout" />
        <PageContainer className="py-16 text-center text-[#68766e]">Loading your cart…</PageContainer>
      </main>
    );
  }

  if (!cart.length) {
    return (
      <main className="min-h-[60vh] bg-[#faf8f5] pb-16">
        <PageHeader title="Checkout" />
        <PageContainer className="pt-12">
          <div className="mx-auto max-w-lg rounded-3xl border border-[#eadfd2] bg-white p-8 text-center">
            <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-[#a34f32]" />
            <h1 className="text-2xl font-bold text-[#263830]">Your cart is empty</h1>
            <p className="mt-2 text-sm text-[#68766e]">Add something delicious before checking out.</p>
            <Link to="/shop" className="mt-6 inline-flex rounded-xl bg-[#263830] px-6 py-3 font-semibold text-white">Browse food</Link>
          </div>
        </PageContainer>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf8f5] pb-12">
      <PageHeader title="Checkout" />
      <PageContainer className="py-8">
        <div className="mb-8 rounded-3xl border border-[#eadfd2] bg-gradient-to-r from-white via-[#fffdfa] to-[#f7eee6] p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#a34f32]">Almost there</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#263830] sm:text-4xl">Checkout</h1>
              <p className="mt-2 text-sm text-[#68766e]">Confirm your details and choose how you’d like to receive your food.</p>
            </div>
            <div className="flex items-center gap-2 self-start rounded-full border border-[#e8ddd0] bg-white/80 px-4 py-2 text-sm font-semibold text-[#68766e] sm:self-auto">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#263830] text-xs text-white">1</span>
              <span className="text-[#263830]">Your details</span>
              <span className="mx-1 h-px w-6 bg-[#ded5c9]" />
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f7eee6] text-xs text-[#a34f32]">2</span>
              <span>Review</span>
            </div>
          </div>
        </div>

        <form onSubmit={placeOrder} className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-5">
            <section className="rounded-3xl border border-[#eadfd2] bg-white p-5 shadow-[0_8px_30px_rgba(60,45,30,0.04)] sm:p-7">
              <div className="mb-6 flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f7eee6] text-[#a34f32]"><ShoppingBag size={20} /></span>
                <div>
                  <h2 className="text-lg font-bold text-[#263830]">Contact details</h2>
                  <p className="text-sm text-[#8c7a6b]">Who should we contact about your order?</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-[#263830]">
                  Full name <span className="text-[#a34f32]">*</span>
                  <input name="name" value={customer.name} onChange={updateCustomer} required maxLength={150} autoComplete="name" className="mt-2 w-full rounded-xl border border-[#ded5c9] px-4 py-3 font-normal outline-none focus:border-[#a34f32] focus:ring-2 focus:ring-[#a34f32]/10" placeholder="Your name" />
                </label>
                <label className="text-sm font-semibold text-[#263830]">
                  Phone number <span className="text-[#a34f32]">*</span>
                  <input name="phone" type="tel" value={customer.phone} onChange={updateCustomer} required minLength={7} maxLength={32} autoComplete="tel" className="mt-2 w-full rounded-xl border border-[#ded5c9] px-4 py-3 font-normal outline-none focus:border-[#a34f32] focus:ring-2 focus:ring-[#a34f32]/10" placeholder="+91 98765 43210" />
                </label>
                <label className="text-sm font-semibold text-[#263830] sm:col-span-2">
                  Email address <span className="font-normal text-[#8c7a6b]">(optional)</span>
                  <input name="email" type="email" value={customer.email} onChange={updateCustomer} maxLength={255} autoComplete="email" className="mt-2 w-full rounded-xl border border-[#ded5c9] px-4 py-3 font-normal outline-none focus:border-[#a34f32] focus:ring-2 focus:ring-[#a34f32]/10" placeholder="you@example.com" />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-[#eadfd2] bg-white p-5 shadow-[0_8px_30px_rgba(60,45,30,0.04)] sm:p-7">
              <div className="mb-6 flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f7eee6] text-[#a34f32]"><MapPin size={20} /></span>
                <div>
                  <h2 className="text-lg font-bold text-[#263830]">How would you like your order?</h2>
                  <p className="text-sm text-[#8c7a6b]">Choose how you would like to receive your order.</p>
                </div>
              </div>
              <div role="radiogroup" aria-label="Order fulfilment method" className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    value: 'home_delivery',
                    label: 'Home delivery',
                    detail: 'Delivered to your address',
                    icon: Truck,
                  },
                  {
                    value: 'pickup',
                    label: 'Pickup',
                    detail: 'Collect your order at the restaurant',
                    icon: Store,
                  },
                ].map((option) => {
                  const OptionIcon = option.icon;
                  const selected = fulfillmentType === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-all focus-within:ring-2 focus-within:ring-[#a34f32]/20 ${
                        selected
                          ? 'border-[#a34f32] bg-[#fbf6f1] shadow-sm'
                          : 'border-[#e8e0d6] bg-white hover:border-[#cbb9a5] hover:bg-[#fffdfa]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="fulfillment_type"
                        value={option.value}
                        checked={selected}
                        onChange={(event) => setFulfillmentType(event.target.value)}
                        className="sr-only"
                      />
                      <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-[#a34f32] text-white' : 'bg-[#f7eee6] text-[#a34f32]'}`}>
                        <OptionIcon size={19} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-[#263830]">{option.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-[#8c7a6b]">{option.detail}</span>
                      </span>
                      <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-[#a34f32]' : 'border-[#c9c0b5]'}`}>
                        {selected && <span className="h-2.5 w-2.5 rounded-full bg-[#a34f32]" />}
                      </span>
                    </label>
                  );
                })}
              </div>

              {fulfillmentType === 'home_delivery' && (
                <div className="mt-6 border-t border-[#f0e9df] pt-6">
                  {savedAddresses.length > 0 && (
                    <label className="mb-4 block text-sm font-semibold text-[#263830]">
                      <span className="block">Saved address</span>
                      <select value={selectedAddress} onChange={selectAddress} className="mt-2 block w-full rounded-xl border border-[#ded5c9] bg-white px-4 py-3 outline-none focus:border-[#a34f32]">
                        {savedAddresses.map((saved) => (
                          <option key={saved.id} value={String(saved.id)}>
                            {[saved.address_line, saved.area_locality, saved.city, saved.pincode].filter(Boolean).join(', ')}
                          </option>
                        ))}
                        <option value="new">Enter a different address</option>
                      </select>
                    </label>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          onClick={useCurrentLocation}
                          disabled={fetchingLocation}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#a34f32] px-4 py-2.5 text-sm font-semibold text-[#a34f32] transition hover:bg-[#fbf6f1] disabled:cursor-wait disabled:opacity-60"
                        >
                          <LocateFixed size={17} />
                          {fetchingLocation ? 'Finding your address…' : 'Use current location'}
                        </button>
                        <p className="mt-2 text-xs leading-5 text-[#8c7a6b]">
                          Enter a complete address to calculate the delivery fee automatically, or use your current location for a more precise result.
                          {' '}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline hover:text-[#a34f32]">© OpenStreetMap contributors</a>
                        </p>
                      </div>
                      {deliveryLocation && (
                        <p className="text-xs font-medium text-emerald-700 sm:col-span-2">
                          Delivery location captured. The delivery fee is calculated from the restaurant by straight-line distance.
                        </p>
                      )}
                      {geocodingAddress && (
                        <p role="status" className="text-xs font-medium text-[#8c5b21] sm:col-span-2">
                          Finding your address to calculate the delivery fee…
                        </p>
                      )}
                      {currentAddressGeocodingError && (
                        <p role="alert" className="text-xs text-red-700 sm:col-span-2">
                          {currentAddressGeocodingError}
                        </p>
                      )}
                      {addressFields.map((field) => (
                      <label key={field.name} className={`text-sm font-semibold text-[#263830] ${field.name === 'address_line' || field.name === 'area_locality' ? 'sm:col-span-2' : ''}`}>
                        {field.label}{field.name !== 'landmark' && <span className="text-[#a34f32]"> *</span>}
                        {field.name === 'state' ? (
                          <select
                            name={field.name}
                            value={address[field.name] || ''}
                            onChange={updateAddress}
                            required
                            autoComplete="address-level1"
                            className="mt-2 w-full rounded-xl border border-[#ded5c9] bg-white px-4 py-3 font-normal outline-none focus:border-[#a34f32] focus:ring-2 focus:ring-[#a34f32]/10"
                          >
                            <option value="" disabled>Select a state or union territory</option>
                            {indianStatesAndTerritories.map((state) => (
                              <option key={state} value={state}>{state}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            name={field.name}
                            value={address[field.name] || ''}
                            onChange={updateAddress}
                            required={field.name !== 'landmark'}
                            maxLength={field.name === 'address_line' ? 255 : ['area_locality', 'landmark'].includes(field.name) ? 180 : field.name === 'pincode' ? 6 : 120}
                            inputMode={field.name === 'pincode' ? 'numeric' : undefined}
                            pattern={field.name === 'pincode' ? '[0-9]{6}' : undefined}
                            autoComplete={field.name === 'address_line' ? 'street-address' : 'off'}
                            className="mt-2 w-full rounded-xl border border-[#ded5c9] px-4 py-3 font-normal outline-none focus:border-[#a34f32] focus:ring-2 focus:ring-[#a34f32]/10"
                            placeholder={field.placeholder}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-[#8c7a6b]">We save each unique address once to your account for faster future checkouts.</p>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-[#eadfd2] bg-white p-5 shadow-[0_8px_30px_rgba(60,45,30,0.04)] sm:p-7">
              <div className="mb-6 flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f7eee6] text-[#a34f32]"><PackageCheck size={20} /></span>
                <div>
                  <h2 className="text-lg font-bold text-[#263830]">Payment method</h2>
                  <p className="text-sm text-[#8c7a6b]">Choose how you want to pay.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { value: 'cod', label: 'Cash on delivery', detail: 'Pay when your order arrives.' },
                  { value: 'online', label: 'Online payment', detail: 'Secure checkout powered by Razorpay.' },
                ].map((method) => (
                  <label key={method.value} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition-all focus-within:ring-2 focus-within:ring-[#a34f32]/20 ${paymentMethod === method.value ? 'border-[#a34f32] bg-[#fbf6f1] shadow-sm' : 'border-[#e8e0d6] hover:border-[#cbb9a5] hover:bg-[#fffdfa]'}`}>
                    <input type="radio" name="payment_method" value={method.value} checked={paymentMethod === method.value} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-1 accent-[#a34f32]" />
                    <span>
                      <span className="block text-sm font-bold text-[#263830]">{method.label}</span>
                      <span className="mt-1 block text-xs text-[#68766e]">{method.detail}</span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <aside className="overflow-hidden rounded-3xl border border-[#eadfd2] bg-white shadow-[0_12px_40px_rgba(60,45,30,0.08)] lg:sticky lg:top-6">
            <div className="border-b border-[#f0e9df] bg-gradient-to-r from-white to-[#fffaf5] px-5 py-5">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#263830]"><UtensilsCrossed size={19} className="text-[#a34f32]" /> Order summary</h2>
              <p className="mt-1 text-sm text-[#8c7a6b]">{itemCount} item{itemCount === 1 ? '' : 's'} in your order</p>
            </div>
            <div className="max-h-[420px] space-y-4 overflow-y-auto p-5">
              {cart.map((item) => (
                <div key={item.id || item.food_id} className="flex gap-3 rounded-2xl border border-[#f0e9df] bg-white p-3">
                  {getItemImage(item) ? (
                    <img src={resolveImageUrl(getItemImage(item))} alt={getItemName(item)} className="h-[68px] w-[68px] shrink-0 rounded-xl object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-xl bg-[#f7eee6] text-[#a34f32]"><UtensilsCrossed size={22} /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#263830]">{getItemName(item)}</p>
                    <p className="mt-1 text-xs text-[#8c7a6b]">
                      {item.portion_size && item.portion_size !== 'Standard' ? `${item.portion_size} · ` : ''}
                      Qty {item.quantity || 1}
                    </p>
                    {Array.isArray(item.selected_addons) && item.selected_addons.length > 0 && (
                      <p className="mt-1 truncate text-xs text-[#8c7a6b]">+ {item.selected_addons.join(', ')}</p>
                    )}
                    {Object.entries(item.selected_customizations || {}).flatMap(([group, selection]) => {
                      const options = Array.isArray(selection) ? selection : selection ? [selection] : [];
                      return options.map((option) => (
                        <p key={`${group}-${option}`} className="mt-1 truncate text-xs text-[#8c7a6b]">
                          {group === '__custom_request__' ? 'Custom request' : group}: {option}
                        </p>
                      ));
                    })}
                  </div>
                  <p className="shrink-0 text-sm font-bold text-[#263830]">
                    ₹{(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-4 border-t border-[#f0e9df] bg-[#faf8f5] p-5">
              <div className="flex justify-between text-sm text-[#68766e]"><span>Subtotal</span><span className="font-medium text-[#263830]">₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between gap-3 text-sm text-[#68766e]">
                <span>
                  {fulfillmentType === 'pickup' ? 'Pickup' : 'Delivery charge'}
                  {currentDeliveryQuote && ` (${currentDeliveryQuote.distance_km.toFixed(2)} km)`}
                </span>
                <span className="text-right font-medium text-[#263830]">
                  {fulfillmentType === 'pickup'
                    ? 'No delivery fee'
                    : deliveryQuotePending
                      ? 'Calculating…'
                      : geocodingAddress
                        ? 'Finding address…'
                      : currentDeliveryQuote
                        ? `₹${currentDeliveryQuote.delivery_charge.toFixed(2)}`
                        : 'Enter address'}
                </span>
              </div>
              {currentDeliveryQuoteError && (
                <p role="alert" className="text-xs text-red-700">{currentDeliveryQuoteError}</p>
              )}
              {fulfillmentType === 'home_delivery' && !deliveryLocation && (
                <p className="text-xs text-[#8c7a6b]">
                  Enter the complete delivery address to calculate the charge, or use current location.
                </p>
              )}
              <div className="flex justify-between border-t border-[#e9e0d5] pt-4 text-base font-bold text-[#263830]">
                <span>Total</span>
                <span className="text-xl text-[#a34f32]">
                  ₹{(fulfillmentType === 'pickup'
                    ? subtotal
                    : currentDeliveryQuote?.total_amount ?? subtotal).toFixed(2)}
                </span>
              </div>
              <button
                type="submit"
                disabled={submitting || cart.length === 0 || (fulfillmentType === 'home_delivery' && (!deliveryLocation || geocodingAddress || deliveryQuotePending || !currentDeliveryQuote))}
                className="w-full rounded-xl bg-[#263830] px-5 py-4 text-sm font-bold text-white shadow-md shadow-[#263830]/15 transition hover:-translate-y-0.5 hover:bg-[#1a2822] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Preparing your order…' : paymentMethod === 'online' ? 'Continue to Razorpay' : 'Place order'}
              </button>
              <p className="text-center text-xs text-[#8c7a6b]">Your order details are protected and securely submitted.</p>
            </div>
          </aside>
        </form>
      </PageContainer>
    </main>
  );
}

export default Checkout;
