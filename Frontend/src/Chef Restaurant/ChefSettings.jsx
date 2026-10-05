import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../PrivateRouter/AuthContext";
import api from "../api";
import toast from "react-hot-toast";
import { Bell, ChefHat, Lock, PackagePlus, Plus, ShieldCheck, UserCircle } from "lucide-react";

const ChefSettings = () => {
  const { profileName, email, role } = useAuth();
  const [products, setProducts] = useState([]);
  const [requestForm, setRequestForm] = useState({
    request_number: `KR-${Date.now()}`,
    requested_by: profileName || role || "Chef",
    department: "Kitchen",
    request_date: new Date().toISOString().slice(0, 10),
    priority: "Normal",
    notes: "",
    items: [{ product_id: "", quantity: "1", unit: "pcs" }],
  });

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get("/inventory/products");
        setProducts(response.data?.data || []);
      } catch (error) {
        console.error("Unable to load products for chef request form:", error);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    setRequestForm((prev) => ({
      ...prev,
      requested_by: profileName || role || prev.requested_by || "Chef",
    }));
  }, [profileName, role]);

  const updateItem = (index, field, value) => {
    setRequestForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addItemRow = () => {
    setRequestForm((prev) => ({
      ...prev,
      items: [...prev.items, { product_id: "", quantity: "1", unit: "pcs" }],
    }));
  };

  const removeItemRow = (index) => {
    setRequestForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, itemIndex) => itemIndex !== index) : prev.items,
    }));
  };

  const resetForm = () => {
    setRequestForm({
      request_number: `KR-${Date.now()}`,
      requested_by: profileName || role || "Chef",
      department: "Kitchen",
      request_date: new Date().toISOString().slice(0, 10),
      priority: "Normal",
      notes: "",
      items: [{ product_id: "", quantity: "1", unit: "pcs" }],
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validItems = requestForm.items.filter(
      (item) => item.product_id && Number(item.quantity || 0) > 0
    );

    if (!validItems.length) {
      toast.error("Select at least one product and quantity for the kitchen request.");
      return;
    }

    try {
      await api.post("/inventory/kitchen-requests", {
        ...requestForm,
        request_date: requestForm.request_date || new Date().toISOString().slice(0, 10),
        requested_by: requestForm.requested_by || profileName || role || "Chef",
        items: validItems.map((item) => ({
          ...item,
          product_id: Number(item.product_id),
          quantity: Number(item.quantity || 0),
          unit: item.unit || "pcs",
        })),
      });

      toast.success("Kitchen request created successfully.");
      resetForm();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to create kitchen request.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ChefHat size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Chef Access</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Chef Settings</h1>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-slate-800">
            <UserCircle size={18} />
            <h2 className="text-lg font-bold">Profile</h2>
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <p><span className="font-semibold text-slate-800">Name:</span> {profileName}</p>
            <p><span className="font-semibold text-slate-800">Role:</span> {role}</p>
            <p><span className="font-semibold text-slate-800">Email:</span> {email || "Not provided"}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-slate-800">
            <Bell size={18} />
            <h2 className="text-lg font-bold">Kitchen Alerts</h2>
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>• Live kitchen order updates</li>
            <li>• Ready-to-serve notifications</li>
            <li>• Low stock reminders</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-slate-800">
            <ShieldCheck size={18} />
            <h2 className="text-lg font-bold">Security</h2>
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>• Role-based access enabled</li>
            <li>• Chef workspace isolated</li>
            <li>• Protected kitchen actions</li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-slate-800">
              <PackagePlus size={18} />
              <h2 className="text-lg font-bold">Inventory Request</h2>
            </div>
            <p className="text-sm text-slate-600">
              Create ingredient and stock requests for the kitchen team.
            </p>
          </div>
          <Link to="/chef/requests" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            View Requests
          </Link>
        </div>

        <form className="hidden mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Request number</span>
              <input
                value={requestForm.request_number}
                onChange={(e) => setRequestForm({ ...requestForm, request_number: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#1a3c36]"
                placeholder="KR-1001"
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Requested by</span>
              <input
                value={requestForm.requested_by}
                onChange={(e) => setRequestForm({ ...requestForm, requested_by: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#1a3c36]"
                placeholder="Chef"
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Department</span>
              <input
                value={requestForm.department}
                onChange={(e) => setRequestForm({ ...requestForm, department: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#1a3c36]"
                placeholder="Kitchen"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Request date</span>
              <input
                type="date"
                value={requestForm.request_date}
                onChange={(e) => setRequestForm({ ...requestForm, request_date: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#1a3c36]"
              />
            </label>

            <label className="block space-y-1.5 md:col-span-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Priority</span>
              <select
                value={requestForm.priority}
                onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#1a3c36]"
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </label>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Items</h3>
              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                <Plus size={14} />
                Add Item
              </button>
            </div>

            {requestForm.items.map((item, index) => (
              <div key={`chef-request-item-${index}`} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1.6fr_0.8fr_0.7fr_auto]">
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Product</span>
                  <select
                    value={item.product_id}
                    onChange={(e) => updateItem(index, "product_id", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#1a3c36]"
                    required
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.product_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Qty</span>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#1a3c36]"
                    required
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Unit</span>
                  <input
                    value={item.unit}
                    onChange={(e) => updateItem(index, "unit", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#1a3c36]"
                    placeholder="pcs"
                  />
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeItemRow(index)}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Notes</span>
            <textarea
              value={requestForm.notes}
              onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-[#1a3c36]"
              placeholder="Add notes for the kitchen team"
            />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Reset
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#1a3c36] px-4 py-2 text-sm font-semibold text-white"
            >
              Send Request
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <Lock size={16} />
          Chef settings are managed separately from the admin settings page.
        </div>
      </div>
    </div>
  );
};

export default ChefSettings;
