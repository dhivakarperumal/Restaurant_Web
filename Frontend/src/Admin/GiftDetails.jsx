import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Edit3, Gift, Package, ImagePlus } from "lucide-react";
import api from "../api";
import toast from "react-hot-toast";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

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
  images: Array.isArray(giftBox.images) ? giftBox.images : Array.isArray(giftBox.image) ? giftBox.image : (giftBox.image ? [giftBox.image] : []),
});

const GiftDetails = () => {
  const navigate = useNavigate();
  const { giftId } = useParams();
  const [gift, setGift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadGift = async () => {
      try {
        const response = await api.get(`/gift-boxes/${giftId}`);
        const payload = response?.data?.data || response?.data || null;
        setGift(normalizeGiftBox(payload));
      } catch (requestError) {
        console.error('Could not load gift details:', requestError);
        setError(requestError?.response?.data?.message || 'Unable to load gift box details.');
      } finally {
        setLoading(false);
      }
    };

    loadGift();
  }, [giftId]);

  const imageList = useMemo(() => {
    const images = Array.isArray(gift?.images) ? gift.images : [];
    return Array.from(new Set([gift?.image, ...images].filter(Boolean)));
  }, [gift]);

  if (loading) {
    return <div className="min-h-screen bg-[#f4f6f2] p-4 text-[#23312e]">Loading gift details...</div>;
  }

  if (error || !gift) {
    return (
      <div className="min-h-screen bg-[#f4f6f2] p-4 text-[#23312e]">
        <div className="mx-auto max-w-[900px] rounded-2xl border border-[#e1e6df] bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-[#b43c3c]">{error || 'Gift box not found.'}</p>
          <button type="button" onClick={() => navigate('/admin/gifts')} className="mt-4 rounded-xl bg-[#1f5d4d] px-4 py-2 text-sm font-bold text-white hover:bg-[#174b3e]">Back to Gifts</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f2] p-4 text-[#23312e]">
      <div className="mx-auto max-w-[1280px] rounded-[20px] border border-[#e1e6df] bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <button type="button" onClick={() => navigate('/admin/gifts')} className="mb-3 inline-flex items-center gap-2 rounded-lg border border-[#dce3dc] px-3 py-2 text-xs font-bold text-[#60756a] hover:bg-[#eef4ee]">
              <ChevronLeft className="h-4 w-4" /> Back to Gifts
            </button>
            <div className="font-mono text-[11px] font-bold uppercase tracking-wide text-[#bd713a]">{gift.id}</div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#20362e]">{gift.name}</h1>
            <p className="mt-2 text-sm text-[#718079]">{gift.category}</p>
          </div>
          <button type="button" onClick={() => navigate('/admin/gifts')} className="inline-flex items-center gap-2 rounded-xl bg-[#1f5d4d] px-4 py-3 text-sm font-bold text-white hover:bg-[#174b3e]">
            <Edit3 className="h-4 w-4" /> Edit Gift Box
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-2xl border border-[#e1e6df] bg-[#fafbf9] p-4">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-[#e7ece5] bg-[#eef4ee]">
              {gift.image ? <img src={gift.image} alt={gift.name} className="h-full w-full object-cover" /> : <Gift className="h-16 w-16 text-[#9aaa9f]" />}
            </div>
            {imageList.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {imageList.slice(0, 8).map((image, index) => (
                  <img key={`${image}-${index}`} src={image} alt={`${gift.name}-${index}`} className="aspect-square rounded-xl border border-[#dce3dc] object-cover" />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#e1e6df] bg-[#fafbf9] p-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#edf7f1] p-4">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#68776f]">Stock</span>
                <div className="mt-2 text-2xl font-bold text-[#1f5d4d]">{gift.currentStock}</div>
              </div>
              <div className="rounded-xl bg-[#fff7e8] p-4">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#a78959]">Selling Price</span>
                <div className="mt-2 text-2xl font-bold text-[#bd713a]">{money(gift.sellingPrice)}</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="border-b border-[#e7ece5] pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#718079]">Category</span>
                <div className="mt-1 text-sm font-bold text-[#23312e]">{gift.category}</div>
              </div>
              <div className="border-b border-[#e7ece5] pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#718079]">Sub Category</span>
                <div className="mt-1 text-sm font-bold text-[#23312e]">{gift.subCategory || '-'}</div>
              </div>
              <div className="border-b border-[#e7ece5] pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#718079]">Material</span>
                <div className="mt-1 text-sm font-bold text-[#23312e]">{gift.material || '-'}</div>
              </div>
              <div className="border-b border-[#e7ece5] pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#718079]">Color</span>
                <div className="mt-1 text-sm font-bold text-[#23312e]">{gift.color || '-'}</div>
              </div>
              <div className="border-b border-[#e7ece5] pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#718079]">Size</span>
                <div className="mt-1 text-sm font-bold text-[#23312e]">{gift.size || '-'}</div>
              </div>
              <div className="border-b border-[#e7ece5] pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[#718079]">Theme</span>
                <div className="mt-1 text-sm font-bold text-[#23312e]">{gift.theme || '-'}</div>
              </div>
            </div>

            <div className="mt-6">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#718079]">Description</span>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#60756c]">{gift.description || 'No description added yet.'}</p>
            </div>

            <div className="mt-6">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#718079]">Included Items</span>
              <div className="mt-3 space-y-2">
                {(gift.items || []).length ? gift.items.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="flex items-center justify-between rounded-xl border border-[#e7ece5] bg-white px-3 py-2">
                    <span className="text-sm font-semibold text-[#52675e]">{item.name}</span>
                    <span className="text-xs text-[#87948b]">Qty {item.quantity || 1}</span>
                  </div>
                )) : <span className="text-xs text-[#87948b]">No items added</span>}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default GiftDetails;
