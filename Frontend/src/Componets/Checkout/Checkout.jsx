import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, MapPin, PackageCheck, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api, { BACKEND_BASE_URL } from '../../api';
import { useAuth } from '../../PrivateRouter/AuthContext';
import { StoreContext } from '../../PrivateRouter/StoreContext';

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

const getCheckoutIdempotencyKey = async (userId, cart) => {
  const requestFingerprint = JSON.stringify({
    userId,
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

  const subtotal = useMemo(() => cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  ), [cart]);
  const itemCount = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);

  const updateCustomer = (event) => {
    setCustomer((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const updateAddress = (event) => {
    setSelectedAddress('new');
    setAddress((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const selectAddress = (event) => {
    const addressId = event.target.value;
    setSelectedAddress(addressId);
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
    if (submissionInProgress.current) return;

    submissionInProgress.current = true;
    setSubmitting(true);
    try {
      const requestKey = await getCheckoutIdempotencyKey(
        user.user_id,
        cart,
      );
      idempotencyContext.current = requestKey;
      const { data } = await api.post(
        '/orders',
        {
          customer,
          order_type: fulfillmentType,
          address: fulfillmentType === 'home_delivery' ? address : null,
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

      await loadRazorpay();
      const checkout = new window.Razorpay({
        key: data.data.razorpay.key_id,
        amount: data.data.razorpay.amount,
        currency: data.data.razorpay.currency,
        name: 'Restaurant',
        description: `Order ${data.data.order_number}`,
        order_id: data.data.razorpay.order_id,
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
      <main className="min-h-[65vh] bg-[#faf8f5] px-4 py-16">
        <div className="mx-auto max-w-lg rounded-3xl border border-[#eadfd2] bg-white p-8 text-center shadow-sm">
          <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-[#a34f32]" />
          <h1 className="text-2xl font-bold text-[#263830]">Log in to checkout</h1>
          <p className="mt-2 text-sm text-[#68766e]">Sign in to save your address and place your order.</p>
          <Link to="/login" state={{ from: '/checkout' }} className="mt-6 inline-flex rounded-xl bg-[#263830] px-6 py-3 font-semibold text-white hover:bg-[#1a2822]">
            Log in
          </Link>
        </div>
      </main>
    );
  }

  if (completedOrder) {
    return (
      <main className="min-h-[65vh] bg-[#faf8f5] px-4 py-16">
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
      </main>
    );
  }

  if (loadingCart) {
    return <main className="min-h-[60vh] bg-[#faf8f5] px-4 py-20 text-center text-[#68766e]">Loading your cart…</main>;
  }

  if (!cart.length) {
    return (
      <main className="min-h-[60vh] bg-[#faf8f5] px-4 py-16">
        <div className="mx-auto max-w-lg rounded-3xl border border-[#eadfd2] bg-white p-8 text-center">
          <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-[#a34f32]" />
          <h1 className="text-2xl font-bold text-[#263830]">Your cart is empty</h1>
          <p className="mt-2 text-sm text-[#68766e]">Add something delicious before checking out.</p>
          <Link to="/shop" className="mt-6 inline-flex rounded-xl bg-[#263830] px-6 py-3 font-semibold text-white">Browse food</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf8f5] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link to="/shop" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#68766e] hover:text-[#a34f32]">
          <ArrowLeft size={17} /> Continue shopping
        </Link>
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a34f32]">Almost there</p>
          <h1 className="mt-1 text-3xl font-bold text-[#263830] sm:text-4xl">Checkout</h1>
          <p className="mt-2 text-[#68766e]">Your details, your food, and the finishing touch.</p>
        </div>

        <form onSubmit={placeOrder} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-[#eadfd2] bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7eee6] text-[#a34f32]"><ShoppingBag size={19} /></span>
                <div>
                  <h2 className="text-lg font-bold text-[#263830]">Customer details</h2>
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

            <section className="rounded-2xl border border-[#eadfd2] bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7eee6] text-[#a34f32]"><MapPin size={19} /></span>
                <div>
                  <h2 className="text-lg font-bold text-[#263830]">Fulfilment</h2>
                  <p className="text-sm text-[#8c7a6b]">Choose how you would like to receive your order.</p>
                </div>
              </div>
              <label className="block text-sm font-semibold text-[#263830]">
                Home delivery or pickup
                <select value={fulfillmentType} onChange={(event) => setFulfillmentType(event.target.value)} className="mt-2 w-full rounded-xl border border-[#ded5c9] bg-white px-4 py-3 outline-none focus:border-[#a34f32] focus:ring-2 focus:ring-[#a34f32]/10 sm:max-w-sm">
                  <option value="home_delivery">Home Delivery</option>
                  <option value="pickup">Pickup</option>
                </select>
              </label>

              {fulfillmentType === 'home_delivery' && (
                <div className="mt-5 border-t border-[#f0e9df] pt-5">
                  {savedAddresses.length > 0 && (
                    <label className="mb-4 block text-sm font-semibold text-[#263830]">
                      Saved address
                      <select value={selectedAddress} onChange={selectAddress} className="mt-2 w-full rounded-xl border border-[#ded5c9] bg-white px-4 py-3 outline-none focus:border-[#a34f32] sm:max-w-lg">
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
                    {addressFields.map((field) => (
                      <label key={field.name} className={`text-sm font-semibold text-[#263830] ${field.name === 'address_line' || field.name === 'area_locality' || field.name === 'landmark' ? 'sm:col-span-2' : ''}`}>
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

            <section className="rounded-2xl border border-[#eadfd2] bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7eee6] text-[#a34f32]"><PackageCheck size={19} /></span>
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
                  <label key={method.value} className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${paymentMethod === method.value ? 'border-[#a34f32] bg-[#fbf6f1]' : 'border-[#e8e0d6] hover:border-[#cbb9a5]'}`}>
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

          <aside className="overflow-hidden rounded-2xl border border-[#eadfd2] bg-white shadow-sm lg:sticky lg:top-6">
            <div className="border-b border-[#f0e9df] px-5 py-5">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#263830]"><UtensilsCrossed size={19} className="text-[#a34f32]" /> Your food</h2>
              <p className="mt-1 text-sm text-[#8c7a6b]">{itemCount} item{itemCount === 1 ? '' : 's'} in your order</p>
            </div>
            <div className="max-h-[380px] space-y-4 overflow-y-auto p-5">
              {cart.map((item) => (
                <div key={item.id || item.food_id} className="flex gap-3">
                  {getItemImage(item) ? (
                    <img src={resolveImageUrl(getItemImage(item))} alt={getItemName(item)} className="h-16 w-16 shrink-0 rounded-xl object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#f7eee6] text-[#a34f32]"><UtensilsCrossed size={22} /></div>
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
            <div className="space-y-3 border-t border-[#f0e9df] bg-[#faf8f5] p-5">
              <div className="flex justify-between text-sm text-[#68766e]"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between border-t border-[#e9e0d5] pt-3 text-base font-bold text-[#263830]"><span>Total</span><span className="text-[#a34f32]">₹{subtotal.toFixed(2)}</span></div>
              <button type="submit" disabled={submitting || cart.length === 0} className="w-full rounded-xl bg-[#263830] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a2822] disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? 'Preparing your order…' : paymentMethod === 'online' ? 'Continue to Razorpay' : 'Place order'}
              </button>
              <p className="text-center text-xs text-[#8c7a6b]">Your order details are protected and securely submitted.</p>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}

export default Checkout;
