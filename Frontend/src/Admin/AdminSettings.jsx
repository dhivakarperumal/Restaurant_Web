import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import imageCompression from "browser-image-compression";
import { QRCodeSVG } from "qrcode.react";
import api from "../api";
import "./Settings.css";
import {
  Printer,
  Receipt,
  CreditCard,
  Store,
  Percent,
  Globe,
  Barcode,
  MonitorSmartphone,
  Search,
  Save,
  RotateCcw,
  ArrowLeft,
  Bluetooth,
  Wifi,
  Usb,
  Network,
  Truck,
  Ticket,
  MapPin,
  Navigation,
  Loader
} from "lucide-react";

const Toggle = ({ label, defaultChecked = false, checked, onChange }) => (
  <div className="toggle-switch">
    <span className="toggle-label">{label}</span>
    <label className="switch">
      <input type="checkbox" defaultChecked={defaultChecked} checked={checked} onChange={onChange} />
      <span className="slider"></span>
    </label>
  </div>
);

const Input = ({ label, type = "text", placeholder, value, onChange, accept }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <input type={type} className="form-input" placeholder={placeholder} value={value} onChange={onChange} accept={accept} />
  </div>
);

const Select = ({ label, options, value, onChange }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <select className="form-select" value={value} onChange={onChange}>
      {options.map((opt, i) => (
        <option key={i} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

const SETTINGS_CATEGORIES = [
  { id: 'print', title: 'Printer Setup', desc: 'Configure receipt and kitchen printers.', icon: <Printer size={24} /> },
  { id: 'receipt', title: 'Receipt Settings', desc: 'Set restaurant details and receipt content.', icon: <Receipt size={24} /> },
  { id: 'payment', title: 'Payment Methods', desc: 'Manage cash, UPI, card, and online payments.', icon: <CreditCard size={24} /> },
  { id: 'store', title: 'Restaurant Profile', desc: 'Manage restaurant details, location, and hours.', icon: <Store size={24} /> },
  { id: 'tax', title: 'Tax & GST', desc: 'Configure restaurant GST and tax display.', icon: <Percent size={24} /> },
  { id: 'localization', title: 'Regional Settings', desc: 'Set region, language, currency, and formats.', icon: <Globe size={24} /> },


  { id: 'delivery', title: 'Delivery & Service Charges', desc: 'Set delivery fees, minimums, and service areas.', icon: <Truck size={24} /> },
  { id: 'coupon', title: 'Offers & Coupons', desc: 'Manage dining and delivery promotions.', icon: <Ticket size={24} /> }
];

const Settings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(null);

  // States for Printer specific UI
  const [connectionType, setConnectionType] = useState('USB');
  const [isScanning, setIsScanning] = useState(false);

  // Bluetooth devices state
  const [pairedDevices, setPairedDevices] = useState([
    { id: 'dev1', name: 'POS-58 Receipt Printer', mac: '00:11:22:33:44:55' }
  ]);
  const [availableDevices, setAvailableDevices] = useState([
    { id: 'dev2', name: 'TVS RP3150', mac: 'A1:B2:C3:D4:E5:F6' }
  ]);

  const [receiptSettings, setReceiptSettings] = useState({
    storeName: '',
    address: '',
    phone: '',
    email: '',
    gst: '',
    fssai: '',
    invoicePrefix: '',
    invoiceFormat: '',
    currency: '',
    dateFormat: 'DD/MM/YYYY',
    taxDisplay: true,
    discountDisplay: true,
    qrCodeDisplay: true,
    footerMessage: 'Thank you for dining with us!',
    thankYouMessage: 'Thank you for choosing us.',
    returnPolicy: 'Please contact the restaurant for order concerns.',
    storeLogo: ''
  });

  const [paymentSettings, setPaymentSettings] = useState({
    cashSupport: true,
    onlinePaymentSupport: true,
    upiSupport: true,
    upiId: "",
    cardSupport: true,
    paymentType: "both",
    razorpayEnabled: true,
    razorpayKey: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
  });

  const [taxSettings, setTaxSettings] = useState({
    enableGst: true,
    defaultGstPercentage: '5%',
    taxMode: 'Tax Exclusive'
  });

  const [storeSettings, setStoreSettings] = useState({
    storeName: '',
    storeLogo: null,
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    gstin: '',
    fssai: '',
    businessType: 'Restaurant',
    timezone: 'Asia/Kolkata (IST)',
    language: 'English',
    currency: 'INR (₹)',
    openingTime: '09:00',
    closingTime: '21:00',
    latitude: '',
    longitude: '',
  });

  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const updateStoreSetting = (key, value) => {
    setStoreSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleFetchLiveLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }
    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const addr = data.address || {};
          setStoreSettings(prev => ({
            ...prev,
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
            address: [
              addr.road || addr.pedestrian || addr.neighbourhood || '',
              addr.suburb || addr.village || '',
            ].filter(Boolean).join(', '),
            city: addr.city || addr.town || addr.district || addr.county || '',
            state: addr.state || '',
            country: addr.country || '',
            zipCode: addr.postcode || '',
          }));
          toast.success('Location fetched and address filled!');
        } catch {
          toast.error('Failed to reverse geocode location.');
        } finally {
          setIsFetchingLocation(false);
        }
      },
      (err) => {
        setIsFetchingLocation(false);
        toast.error(`Location error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const updatePaymentSetting = (key, value) => {
    setPaymentSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateTaxSetting = (key, value) => {
    setTaxSettings(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    fetchReceiptSettings();
    fetchPaymentSettings();
    fetchTaxSettings();
    fetchStoreSettings();
  }, []);

  const fetchTaxSettings = async () => {
    try {
      const response = await api.get("/settings/tax");
      if (response.data?.success && response.data?.data) {
        if (Object.keys(response.data.data).length > 0) {
          const dbData = response.data.data;
          setTaxSettings({
            enableGst: dbData.enable_gst === 1 || dbData.enable_gst === true || dbData.enable_gst == null,
            defaultGstPercentage: dbData.default_gst_percentage || '5%',
            taxMode: dbData.tax_mode || 'Tax Exclusive',
          });
        }
      }
    } catch (error) {
      console.error("Error fetching tax settings:", error);
      toast.error("Failed to load tax settings");
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const response = await api.get("/settings/payment");
      if (response.data?.success && response.data?.data) {
        if (Object.keys(response.data.data).length > 0) {
          const dbData = response.data.data;
          setPaymentSettings({
            cashSupport: dbData.cash_support !== 0 && dbData.cash_support !== "0",
            onlinePaymentSupport: dbData.online_payment_support !== 0 && dbData.online_payment_support !== "0",
            upiSupport: dbData.upi_support !== 0 && dbData.upi_support !== "0",
            upiId: dbData.upi_id || "",
            cardSupport: dbData.credit_debit_card !== 0 && dbData.credit_debit_card !== "0",
            paymentType: dbData.payment_type || "both",
            razorpayEnabled: dbData.razorpay_enabled !== 0 && dbData.razorpay_enabled !== "0",
            razorpayKey: dbData.razorpay_key || "",
            cardNumber: dbData.card_number || "",
            cardExpiry: dbData.card_expiry || "",
            cardCvv: dbData.card_cvv || "",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching payment settings:", error);
      toast.error("Failed to load payment settings");
    }
  };

  const fetchReceiptSettings = async () => {
    try {
      const response = await api.get("/settings/receipt");
      if (response.data?.success && response.data?.data) {
        if (Object.keys(response.data.data).length > 0) {
          const dbData = response.data.data;
          setReceiptSettings({
            storeName: dbData.store_name || '',
            address: dbData.address || '',
            phone: dbData.phone || '',
            email: dbData.email || '',
            gst: dbData.gst || '',
            fssai: dbData.fssai || '',
            invoicePrefix: dbData.invoice_prefix || '',
            invoiceFormat: dbData.invoice_format || '',
            currency: dbData.currency || '',
            dateFormat: dbData.date_format || 'DD/MM/YYYY',
            taxDisplay: dbData.tax_display === 1,
            discountDisplay: dbData.discount_display === 1,
            qrCodeDisplay: dbData.qr_code_display === 1,
            footerMessage: dbData.footer_message || '',
            thankYouMessage: dbData.thank_you_message || '',
            returnPolicy: dbData.return_policy || '',
            storeLogo: dbData.store_logo || ''
          });
        }
      }
    } catch (error) {
      console.error("Error fetching receipt settings:", error);
      toast.error("Failed to load receipt settings");
    }
  };

  const updateReceiptSetting = (key, value) => {
    setReceiptSettings(prev => ({ ...prev, [key]: value }));
  };

  const uploadSettingsLogo = async (file) => {
    const compressed = await imageCompression(file, {
      maxSizeMB: 4,
      maxWidthOrHeight: 2000,
      useWebWorker: true,
    });
    const uploadData = new FormData();
    uploadData.append("folder", "settings");
    uploadData.append("file", compressed, compressed.name || file.name);
    const response = await api.post("/upload", uploadData);
    const imageUrl = response.data?.url;
    if (!imageUrl) throw new Error("Image upload did not return a URL.");
    return imageUrl;
  };

  const handleLogoUpload = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const imageUrl = await uploadSettingsLogo(file);
      setReceiptSettings((prev) => ({ ...prev, storeLogo: imageUrl }));
      toast.success("Logo uploaded successfully. Don't forget to save settings.");
    } catch (error) {
      console.error("Logo upload error:", error);
      toast.error("Logo upload failed.");
    }
  };

  const fetchStoreSettings = async () => {
    try {
      const response = await api.get("/settings/store");
      if (response.data?.success && response.data?.data) {
        if (Object.keys(response.data.data).length > 0) {
          const d = response.data.data;
          setStoreSettings({
            storeName: d.store_name || '',
            storeLogo: d.store_logo || null,
            email: d.email || '',
            phone: d.phone || '',
            address: d.address || '',
            city: d.city || '',
            state: d.state || '',
            country: d.country || '',
            zipCode: d.zip_code || '',
            gstin: d.gstin || '',
            fssai: d.fssai || '',
            businessType: d.business_type || 'Restaurant',
            timezone: d.timezone || 'Asia/Kolkata (IST)',
            language: d.language || 'English',
            currency: d.currency || 'INR (₹)',
            openingTime: d.opening_time || '09:00',
            closingTime: d.closing_time || '21:00',
            latitude: d.latitude || '',
            longitude: d.longitude || '',
          });
          try {
            localStorage.setItem('store_settings', JSON.stringify(response.data.data));
          } catch (e) {
            console.warn('Unable to persist store settings to localStorage', e);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching store settings:', error);
      toast.error('Failed to load store settings');
    }
  };

  const handleStoreLogoUpload = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      const imageUrl = await uploadSettingsLogo(file);
      setStoreSettings(prev => ({ ...prev, storeLogo: imageUrl }));
      toast.success("Logo ready. Save settings to apply.");
    } catch (err) {
      console.error('Store logo upload error:', err);
      toast.error('Logo upload failed.');
    }
  };

  const handleSave = async () => {
    if (activeTab === 'receipt') {
      try {
        const response = await api.post("/settings/receipt", receiptSettings);
        if (response.data?.success) {
          toast.success("Receipt settings saved successfully!");
        } else {
          toast.error("Failed to save receipt settings.");
        }
      } catch (error) {
        console.error("Error saving receipt settings:", error);
        toast.error("Failed to save receipt settings.");
      }
    } else if (activeTab === 'payment') {
      try {
        const response = await api.post("/settings/payment", paymentSettings);
        if (response.data?.success) {
          toast.success("Payment settings saved successfully!");
        } else {
          toast.error("Failed to save payment settings.");
        }
      } catch (error) {
        console.error("Error saving payment settings:", error);
        toast.error("Failed to save payment settings.");
      }
    } else if (activeTab === 'store') {
      try {
        const response = await api.post("/settings/store", storeSettings);
        if (response.data?.success) {
          toast.success("Restaurant profile saved successfully!");
          try {
            localStorage.setItem('store_settings', JSON.stringify(storeSettings));
          } catch (e) {
            console.warn('Unable to persist store settings to localStorage', e);
          }
        } else {
          toast.error("Failed to save restaurant profile.");
        }
      } catch (error) {
        console.error("Error saving restaurant profile:", error);
        toast.error("Failed to save restaurant profile.");
      }
    } else {
      toast.success("Settings saved successfully!");
    }
    setActiveTab(null);
  };

  const handleScanBluetooth = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 2500);
  };

  const handlePair = (device) => {
    setAvailableDevices(prev => prev.filter(d => d.id !== device.id));
    setPairedDevices(prev => [...prev, device]);
  };

  const handleUnpair = (device) => {
    setPairedDevices(prev => prev.filter(d => d.id !== device.id));
    setAvailableDevices(prev => [...prev, device]);
  };

  const renderActiveFields = () => {
    switch (activeTab) {
      case 'print':
        return (
          <>
            <Select label="Printer Selection" options={['EPSON TM-T82', 'TVS RP 3150', 'Generic POS Printer']} />

            <Select
              label="Connection Type"
              options={['USB', 'LAN / Network', 'Bluetooth', 'Wi-Fi']}
              value={connectionType}
              onChange={(e) => setConnectionType(e.target.value)}
            />

            {/* Dynamic UI based on connection type */}
            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', marginBottom: '1rem' }}>
              {connectionType === 'LAN / Network' || connectionType === 'Wi-Fi' ? (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#0f172a', fontWeight: 'bold' }}>
                    {connectionType === 'Wi-Fi' ? <Wifi size={18} /> : <Network size={18} />}
                    Network Configuration
                  </div>
                  <Input label="Printer IP Address" placeholder="192.168.1.100" />
                  <Input label="Port" placeholder="9100" />
                </div>
              ) : connectionType === 'USB' ? (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Usb size={18} style={{ color: '#64748b' }} />
                  <span style={{ fontSize: '0.9rem', color: '#475569' }}>Please ensure the printer is plugged into a USB port. Auto-detection enabled.</span>
                </div>
              ) : connectionType === 'Bluetooth' ? (
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a', fontWeight: 'bold' }}>
                      <Bluetooth size={18} style={{ color: '#3b82f6' }} />
                      Bluetooth Printers
                    </div>
                    <button
                      onClick={handleScanBluetooth}
                      style={{
                        background: '#eff6ff', color: '#2563eb', border: 'none', padding: '0.4rem 0.8rem',
                        borderRadius: '8px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer'
                      }}
                    >
                      {isScanning ? 'Scanning...' : 'Scan Devices'}
                    </button>
                  </div>

                  {/* Paired Devices */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h5 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Paired Devices</h5>
                    {pairedDevices.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No paired devices</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {pairedDevices.map(device => (
                          <div key={device.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <Printer size={20} style={{ color: '#94a3b8' }} />
                              <div>
                                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>{device.name}</p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>{device.mac}</p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#10b981', background: '#d1fae5', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>Connected</span>
                              <button
                                onClick={() => handleUnpair(device)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                Unpair
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Available Devices */}
                  <div>
                    <h5 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Available Devices</h5>
                    {isScanning ? (
                      <p style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', padding: '1rem 0' }}>Searching for nearby printers...</p>
                    ) : availableDevices.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>No available devices found.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {availableDevices.map(device => (
                          <div key={device.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <Printer size={20} style={{ color: '#94a3b8' }} />
                              <div>
                                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>{device.name}</p>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>{device.mac}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handlePair(device)}
                              style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                              Pair
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <Select label="Paper Size" options={['58mm', '80mm', 'A4']} />
            <Input label="Print Copies" type="number" placeholder="1" />

            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '0.5rem' }}></div>

            <Toggle label="Auto-print Receipt" defaultChecked />
            <Toggle label="Cash Drawer Trigger" defaultChecked />
            <Toggle label="Kitchen Order Printer" />
            <Toggle label="Barcode Printing" defaultChecked />
            <Toggle label="QR Code Printing" defaultChecked />
            <Toggle label="Print Logo" defaultChecked />
            <Toggle label="Print Header" defaultChecked />
            <Toggle label="Print Footer" defaultChecked />
          </>
        );

      case 'receipt':
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 380px",
              gap: "2rem",
              width: "100%",
              alignItems: "start",
            }}
          >
            {/* Left Side */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <Input label="Restaurant Logo" type="file" onChange={handleLogoUpload} accept="image/*" />

              <Input
                label="Restaurant or Hotel Name"
                placeholder="Foodie Restaurant"
                value={receiptSettings.storeName}
                onChange={(e) => updateReceiptSetting("storeName", e.target.value)}
              />

              <Input
                label="Restaurant Address"
                placeholder="123 MG Road"
                value={receiptSettings.address}
                onChange={(e) => updateReceiptSetting("address", e.target.value)}
              />

              <Input
                label="Phone Number"
                placeholder="+91 9876543210"
                value={receiptSettings.phone}
                onChange={(e) => updateReceiptSetting("phone", e.target.value)}
              />

              <Input
                label="Email"
                placeholder="contact@dmart.com"
                value={receiptSettings.email}
                onChange={(e) => updateReceiptSetting("email", e.target.value)}
              />

              <Input
                label="GSTIN"
                placeholder="22AAAAA0000A1Z5"
                value={receiptSettings.gst}
                onChange={(e) => updateReceiptSetting("gst", e.target.value)}
              />

              <Input
                label="FSSAI Number"
                placeholder="10022000000000"
                value={receiptSettings.fssai}
                onChange={(e) => updateReceiptSetting("fssai", e.target.value)}
              />

              <Input
                label="Invoice Prefix"
                placeholder="INV-"
                value={receiptSettings.invoicePrefix}
                onChange={(e) => updateReceiptSetting("invoicePrefix", e.target.value)}
              />

              <Select
                label="Invoice Number Format"
                options={["YYYY/MM/DD/0001", "00001", "INV-00001"]}
                value={receiptSettings.invoiceFormat}
                onChange={(e) => updateReceiptSetting("invoiceFormat", e.target.value)}
              />

              <Input
                label="Currency Symbol"
                placeholder="₹"
                value={receiptSettings.currency}
                onChange={(e) => updateReceiptSetting("currency", e.target.value)}
              />

              <Select
                label="Date Format"
                options={["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]}
                value={receiptSettings.dateFormat}
                onChange={(e) => updateReceiptSetting("dateFormat", e.target.value)}
              />

              <Toggle
                label="Tax Display"
                checked={receiptSettings.taxDisplay}
                onChange={(e) => updateReceiptSetting("taxDisplay", e.target.checked)}
              />

              <Toggle
                label="Discount Display"
                checked={receiptSettings.discountDisplay}
                onChange={(e) => updateReceiptSetting("discountDisplay", e.target.checked)}
              />

              <Toggle
                label="QR Code Display"
                checked={receiptSettings.qrCodeDisplay}
                onChange={(e) => updateReceiptSetting("qrCodeDisplay", e.target.checked)}
              />

              <Input
                label="Footer Message"
                placeholder="Visit us again!"
                value={receiptSettings.footerMessage}
                onChange={(e) => updateReceiptSetting("footerMessage", e.target.value)}
              />

              <Input
                label="Thank You Message"
                placeholder="Thank you for dining with us."
                value={receiptSettings.thankYouMessage}
                onChange={(e) => updateReceiptSetting("thankYouMessage", e.target.value)}
              />

              <Input
                label="Order Refund Policy"
                placeholder="Please contact us about order concerns."
                value={receiptSettings.returnPolicy}
                onChange={(e) => updateReceiptSetting("returnPolicy", e.target.value)}
              />
            </div>

            {/* Right Side Receipt Preview */}

            <div
              className="receipt-preview-container"
              style={{ position: "sticky", top: "20px", alignSelf: "start", padding: "0 1rem" }}
            >


              <div className="receipt-preview-card">
                <h4 className="receipt-preview-title">Receipt Preview</h4>
                <div className="receipt-top">
                  {receiptSettings.storeLogo && (
                    <img src={receiptSettings.storeLogo} alt="Restaurant logo" />
                  )}

                  <h3>{receiptSettings.storeName || "RESTAURANT NAME"}</h3>

                  <div>{receiptSettings.address}</div>
                  <div>Phone: {receiptSettings.phone}</div>

                  {receiptSettings.email && <div>Email: {receiptSettings.email}</div>}
                  {receiptSettings.gst && <div>GST: {receiptSettings.gst}</div>}
                  {receiptSettings.fssai && <div>FSSAI: {receiptSettings.fssai}</div>}
                </div>

                <div className="receipt-meta">
                  <span>Receipt: {receiptSettings.invoicePrefix}0001</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>

                <div className="receipt-divider" />

                <div className="receipt-items">
                  <div className="item" style={{ fontWeight: 700 }}>
                    <span>Item</span>
                    <span>Total</span>
                  </div>
                  <div className="item">
                    <span>Paneer Tikka</span>
                    <span>{receiptSettings.currency}120.00</span>
                  </div>
                  <div className="item">
                    <span>Masala Dosa</span>
                    <span>{receiptSettings.currency}450.00</span>
                  </div>
                </div>

                <div className="receipt-divider" />

                <div className="item">
                  <span>Subtotal</span>
                  <span>{receiptSettings.currency}570.00</span>
                </div>

                {receiptSettings.taxDisplay && (
                  <div className="item">
                    <span>GST (5%)</span>
                    <span>{receiptSettings.currency}28.50</span>
                  </div>
                )}

                {receiptSettings.discountDisplay && (
                  <div className="item">
                    <span>Discount</span>
                    <span>-{receiptSettings.currency}10.00</span>
                  </div>
                )}

                <div className="total-row">
                  <span>Total</span>
                  <span>
                    {receiptSettings.currency}
                    {(
                      570 +
                      (receiptSettings.taxDisplay ? 28.5 : 0) -
                      (receiptSettings.discountDisplay ? 10 : 0)
                    ).toFixed(2)}
                  </span>
                </div>

                <div className="receipt-divider" />

                {receiptSettings.qrCodeDisplay && (
                  <div className="qr">
                    {paymentSettings.upiId ? (
                      <QRCodeSVG
                        value={`upi://pay?pa=${paymentSettings.upiId}&pn=${receiptSettings.storeName || "Store"}`}
                        size={80}
                      />
                    ) : (
                      <div style={{ width: "80px", height: "80px", margin: "0 auto", background: "conic-gradient(#333 90deg, transparent 90deg)", backgroundSize: "10px 10px" }} />
                    )}
                    <div style={{ fontSize: ".75rem", marginTop: ".25rem" }}>Scan to Pay</div>
                  </div>
                )}

                <div className="footer">
                  <div>{receiptSettings.thankYouMessage}</div>
                  <div>{receiptSettings.footerMessage}</div>

                  {receiptSettings.returnPolicy && (
                    <div style={{ marginTop: ".5rem", fontSize: ".75rem", color: "#666" }}>
                      {receiptSettings.returnPolicy}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );


      case 'payment':
        return (
          <>
            <Toggle label="Cash Support" checked={paymentSettings.cashSupport} onChange={(e) => updatePaymentSetting('cashSupport', e.target.checked)} />
            <Toggle label="Online Payment Support" checked={paymentSettings.onlinePaymentSupport} onChange={(e) => updatePaymentSetting('onlinePaymentSupport', e.target.checked)} />

            {paymentSettings.onlinePaymentSupport && (
              <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid #e5e7eb", borderRadius: "0.75rem", background: "#f9fafb" }}>
                <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600 }}>Online Payment Gateway</h3>
                <p style={{ margin: "0 0 0.75rem", color: "#6b7280", fontSize: "0.9rem" }}>Razorpay is used for restaurant order payments.</p>
                <Toggle label="Enable Razorpay" checked={paymentSettings.razorpayEnabled} onChange={(e) => updatePaymentSetting('razorpayEnabled', e.target.checked)} />

                {paymentSettings.razorpayEnabled && (
                  <Input label="Razorpay Key" placeholder="rzp_live_xxxxx" value={paymentSettings.razorpayKey} onChange={(e) => updatePaymentSetting('razorpayKey', e.target.value)} />
                )}
              </div>
            )}

            <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid #e5e7eb", borderRadius: "0.75rem", background: "#ffffff" }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600 }}>UPI Settings</h3>
              <Toggle label="UPI Support" checked={paymentSettings.upiSupport} onChange={(e) => updatePaymentSetting('upiSupport', e.target.checked)} />

              {paymentSettings.upiSupport && (
                <Input label="UPI ID" placeholder="example@upi" value={paymentSettings.upiId} onChange={(e) => updatePaymentSetting('upiId', e.target.value)} />
              )}
            </div>

            <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid #e5e7eb", borderRadius: "0.75rem", background: "#ffffff" }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600 }}>Card Settings</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  label="Card Number"
                  placeholder="1234 5678 9012 3456"
                  value={paymentSettings.cardNumber}
                  onChange={(e) => updatePaymentSetting('cardNumber', e.target.value)}
                />
                <Input
                  label="MM/YY"
                  placeholder="MM/YY"
                  value={paymentSettings.cardExpiry}
                  onChange={(e) => updatePaymentSetting('cardExpiry', e.target.value)}
                />
                <Input
                  label="CVV"
                  placeholder="CVV"
                  value={paymentSettings.cardCvv}
                  onChange={(e) => updatePaymentSetting('cardCvv', e.target.value)}
                />
              </div>
            </div>


          </>
        );
      case 'store':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', width: '100%', gridColumn: '1 / -1' }}>

            {/* Restaurant identity */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '2px solid #d1fae5' }}>
                <Store size={16} style={{ color: '#10b981' }} />
                <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Restaurant Identity</span>
              </div>
            </div>

            <Input
              label="Restaurant or Hotel Name"
              placeholder="Foodie Restaurant"
              value={storeSettings.storeName}
              onChange={(e) => updateStoreSetting('storeName', e.target.value)}
            />

            <div className="form-group">
              <label className="form-label">Restaurant Logo</label>
              <input
                type="file"
                accept="image/*"
                className="form-input"
                onChange={handleStoreLogoUpload}
              />
              {storeSettings.storeLogo && (
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img
                    src={storeSettings.storeLogo}
                    alt="Restaurant logo preview"
                    style={{ width: '56px', height: '56px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', padding: '4px' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '600' }}>✓ Logo loaded</span>
                </div>
              )}
            </div>

            <Input
              label="Email"
              placeholder="contact@foodierestaurant.com"
              value={storeSettings.email}
              onChange={(e) => updateStoreSetting('email', e.target.value)}
            />

            <Input
              label="Phone"
              placeholder="+91 9876543210"
              value={storeSettings.phone}
              onChange={(e) => updateStoreSetting('phone', e.target.value)}
            />

            <Select
              label="Business Type"
              options={['Restaurant', 'Hotel', 'Cafe', 'Bakery', 'Catering Service', 'Food Truck']}
              value={storeSettings.businessType}
              onChange={(e) => updateStoreSetting('businessType', e.target.value)}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                label="Opening Time"
                type="time"
                value={storeSettings.openingTime}
                onChange={(e) => updateStoreSetting('openingTime', e.target.value)}
              />
              <Input
                label="Closing Time"
                type="time"
                value={storeSettings.closingTime}
                onChange={(e) => updateStoreSetting('closingTime', e.target.value)}
              />
            </div>

            {/* Location Section */}
            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '2px solid #d1fae5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={16} style={{ color: '#10b981' }} />
                  <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Restaurant Location</span>
                </div>
                <button
                  onClick={handleFetchLiveLocation}
                  disabled={isFetchingLocation}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: isFetchingLocation ? '#e2e8f0' : 'linear-gradient(135deg, #10b981, #34d399)',
                    color: isFetchingLocation ? '#94a3b8' : 'white',
                    border: 'none',
                    padding: '0.5rem 1.1rem',
                    borderRadius: '10px',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: isFetchingLocation ? 'not-allowed' : 'pointer',
                    boxShadow: isFetchingLocation ? 'none' : '0 4px 12px rgba(16,185,129,0.35)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isFetchingLocation
                    ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Fetching...</>
                    : <><Navigation size={15} /> Fetch Live Location</>}
                </button>
              </div>
            </div>

            {/* Coordinates row */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <Input
                  label="Latitude"
                  placeholder="e.g. 12.479808"
                  value={storeSettings.latitude}
                  onChange={(e) => updateStoreSetting('latitude', e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Input
                  label="Longitude"
                  placeholder="e.g. 78.573702"
                  value={storeSettings.longitude}
                  onChange={(e) => updateStoreSetting('longitude', e.target.value)}
                />
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <Input
                label="Address"
                placeholder="123 MG Road"
                value={storeSettings.address}
                onChange={(e) => updateStoreSetting('address', e.target.value)}
              />
            </div>

            <Input
              label="City"
              placeholder="Coimbatore"
              value={storeSettings.city}
              onChange={(e) => updateStoreSetting('city', e.target.value)}
            />

            <Input
              label="State"
              placeholder="Karnataka"
              value={storeSettings.state}
              onChange={(e) => updateStoreSetting('state', e.target.value)}
            />

            <Input
              label="Country"
              placeholder="India"
              value={storeSettings.country}
              onChange={(e) => updateStoreSetting('country', e.target.value)}
            />

            <Input
              label="ZIP Code"
              placeholder="560001"
              value={storeSettings.zipCode}
              onChange={(e) => updateStoreSetting('zipCode', e.target.value)}
            />

            {/* Compliance */}
            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '2px solid #d1fae5' }}>
                <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Licenses & Preferences</span>
              </div>
            </div>

            <Input
              label="GSTIN"
              placeholder="29AAAAA0000A1Z5"
              value={storeSettings.gstin}
              onChange={(e) => updateStoreSetting('gstin', e.target.value)}
            />

            <Input
              label="FSSAI License"
              placeholder="11223344556677"
              value={storeSettings.fssai}
              onChange={(e) => updateStoreSetting('fssai', e.target.value)}
            />

            <Select
              label="Timezone"
              options={['Asia/Kolkata (IST)', 'UTC', 'America/New_York']}
              value={storeSettings.timezone}
              onChange={(e) => updateStoreSetting('timezone', e.target.value)}
            />

            <Select
              label="Language"
              options={['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada']}
              value={storeSettings.language}
              onChange={(e) => updateStoreSetting('language', e.target.value)}
            />

            <Select
              label="Currency"
              options={['INR (₹)', 'USD ($)', 'EUR (€)']}
              value={storeSettings.currency}
              onChange={(e) => updateStoreSetting('currency', e.target.value)}
            />

          </div>
        );
      case 'tax':
        return (
          <>
            <Toggle label="Enable GST Collection" defaultChecked />
            <Select label="Default GST Rate" options={['0%', '5%', '12%', '18%', '28%']} />
            <Select label="Tax Calculation Mode" options={['Tax Exclusive', 'Tax Inclusive']} />
          </>
        );
      case 'localization':
        return (
          <>
            <Select label="System Language" options={['English (US)', 'English (UK)', 'Hindi']} />
            <Select label="System Currency" options={['INR', 'USD', 'EUR', 'GBP']} />
            <Select label="Timezone" options={['Asia/Kolkata', 'America/New_York']} />
            <Select label="Date Format" options={['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']} />
            <Select label="Time Format" options={['12-hour (AM/PM)', '24-hour']} />
            <Select label="Number Format" options={['1,00,000.00', '100,000.00']} />
            <Toggle label="Multi-language Support" defaultChecked />
          </>
        );
      case 'barcode':
        return (
          <>
            <Select label="Barcode Format" options={['CODE128', 'EAN-13', 'UPC-A']} />
            <Input label="Barcode Width (px)" type="number" placeholder="2" />
            <Input label="Barcode Height (px)" type="number" placeholder="50" />
            <Select label="Scanner Type" options={['USB Scanner', 'Bluetooth', 'Camera']} />
            <Toggle label="Auto Scan Focus" defaultChecked />
            <Toggle label="Scan Beep Sound" defaultChecked />
            <Toggle label="Generate Missing Barcodes" defaultChecked />
          </>
        );
      case 'pos':
        return (
          <>
            <Input label="Default Guest Name" placeholder="Walk-in Guest" />
            <Select label="Default Payment Method" options={['Cash', 'UPI', 'Card']} />
            <Toggle label="Round Off Bill Amount" defaultChecked />
            <Toggle label="Quick Billing Mode" defaultChecked />
            <Toggle label="Offline Billing Support" defaultChecked />
            <Toggle label="Enable Hold Bill" defaultChecked />
            <Toggle label="Enable Resume Bill" defaultChecked />
            <Toggle label="Invoice Auto Save" defaultChecked />
            <Toggle label="Enable Customer Display" />
          </>
        );
      case 'delivery':
        return (
          <>
            <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
              <h4 style={{ marginBottom: '1rem', color: '#1e293b', fontSize: '1rem', fontWeight: 'bold' }}>Restaurant Delivery Fees</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <Input label="Base Delivery Fee (₹)" type="number" placeholder="e.g. 50" />
                <Input label="Free Delivery Minimum Order Value (₹)" type="number" placeholder="e.g. 500" />
                <Input label="Delivery Fee per KM (₹)" type="number" placeholder="e.g. 10" />
                <Input label="Maximum Delivery Radius (KM)" type="number" placeholder="e.g. 15" />
                <Select label="Delivery Service Area" options={['Local', 'City', 'Custom Radius']} />
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1', background: '#f0f9ff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #bae6fd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Truck size={20} style={{ color: '#0284c7' }} />
                  <h4 style={{ margin: 0, color: '#0284c7', fontSize: '1rem', fontWeight: 'bold' }}>Express Delivery</h4>
                </div>
                <Toggle label="Enable Express Delivery" defaultChecked />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <Input label="Express Delivery Charge (₹)" type="number" placeholder="e.g. 100" />
                <Input label="Estimated Delivery Time" placeholder="e.g. 30 Mins" />
              </div>
            </div>
          </>
        );
      case 'coupon':
        return (
          <>
            <Toggle label="Enable Restaurant Offers" defaultChecked />
            <Toggle label="Allow Multiple Offers per Order" />
            <Select label="Default Discount Type" options={['Percentage (%)', 'Flat Amount (₹)']} />
            <Input label="Maximum Discount Cap (₹)" placeholder="e.g. ₹2000" />
            <Toggle label="Show Offers at Checkout" defaultChecked />
            <Toggle label="Auto-apply Best Offer" />
          </>
        );
      default:
        return null;
    }
  };

  const activeCategory = SETTINGS_CATEGORIES.find(c => c.id === activeTab);

  return (
    <div className="settings-page">
      <Toaster position="top-right" />


      {!activeTab ? (
        <div className="settings-grid">
          {SETTINGS_CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className="glass-card clickable-card"
              onClick={() => {
                if (cat.id === 'delivery') { navigate('/admin/delivery-charges'); return; }
                if (cat.id === 'coupon') { navigate('/admin/coupons'); return; }
                setActiveTab(cat.id);
              }}
            >
              <div className="card-header" style={{ marginBottom: 0 }}>
                <div className="icon-wrapper">{cat.icon}</div>
                <div>
                  <h3 className="card-title">{cat.title}</h3>
                  <p className="card-description">{cat.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card detail-view animate-fade-in">
          <div className="detail-header">
            <button className="back-button" onClick={() => setActiveTab(null)}>
              <ArrowLeft size={20} /> Back
            </button>
            <div className="detail-title-area">
              <div className="icon-wrapper sm">{activeCategory.icon}</div>
              <h2>{activeCategory.title}</h2>
            </div>
          </div>

          <div className={`detail-content ${activeTab === "receipt" ? "" : "grid-2-col"}`}>
            {renderActiveFields()}
          </div>

          <div className="detail-actions">
            <button className="btn-secondary" onClick={() => setActiveTab(null)}>Cancel</button>
            <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RotateCcw size={18} /> Reset
            </button>
            <button className="btn-primary" onClick={handleSave}>
              <Save size={18} /> Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
