import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Armchair,
  ArrowRight,
  CheckCircle2,
  Clock,
  Coffee,
  Layers,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Table2,
  UserCheck,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api";
import { useAuth } from "../PrivateRouter/AuthContext";

export default function ServerDashboard() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [tables, setTables] = useState([]);
  const [foodsCount, setFoodsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch Server's tables & menu summary
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [tablesRes, foodsRes] = await Promise.allSettled([
        api.get("/server-tables"),
        api.get("/foods"),
      ]);

      if (tablesRes.status === "fulfilled" && tablesRes.value.data?.success) {
        const allTables = tablesRes.value.data.tables || [];
        // Filter tables assigned to this server
        const currentUserId = userProfile?.user_id;
        const currentEmpId = userProfile?.employee_id;
        const myTables = allTables.filter(
          (t) =>
            t.assigned_server_id &&
            (t.assigned_server_id === currentUserId ||
              t.assigned_server_id === currentEmpId ||
              userProfile?.role === "Super Admin" ||
              userProfile?.role === "Admin")
        );
        // If server has assigned tables, show them, or show all if admin
        setTables(myTables.length > 0 ? myTables : allTables);
      }

      if (foodsRes.status === "fulfilled") {
        const foodsData = foodsRes.value.data?.data || foodsRes.value.data || [];
        setFoodsCount(Array.isArray(foodsData) ? foodsData.length : 0);
      }
    } catch (err) {
      console.error("Error loading server dashboard:", err);
      toast.error("Could not load latest dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userProfile]);

  const availableTables = tables.filter((t) => (t.status || "Available") === "Available");
  const occupiedTables = tables.filter((t) => t.status === "Occupied");
  const totalSeats = tables.reduce((sum, t) => sum + Number(t.no_of_seats || 0), 0);

  const startOrderForTable = (table) => {
    navigate("/server/foods", {
      state: {
        selectedTable: {
          id: table.id ?? null,
          table_id: table.table_id || null,
          table_number: table.table_number,
          no_of_seats: table.no_of_seats,
        },
      },
    });
  };

  return (
    <main className="min-h-screen bg-[#f8faf8] p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1a3c36] via-[#214a42] to-[#16332e] p-6 text-white shadow-xl md:p-8">
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#d4a843] backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" /> Server Station Dashboard
              </div>
              <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white md:text-3xl">
                Welcome back, {userProfile?.username || "Server"}!
              </h1>
              <p className="mt-1 text-xs text-white/70 md:text-sm">
                Manage your assigned dining tables, browse the food menu, and send kitchen orders.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={fetchDashboardData}
                title="Refresh dashboard"
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <Link
                to="/server/foods"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#d4a843] px-4 text-xs font-bold text-[#1a3c36] shadow-md transition hover:bg-[#e2b755]"
              >
                <Utensils className="h-4 w-4" /> Food Menu & Orders
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">My Tables</p>
                <h3 className="mt-1 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
                  {tables.length}
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a3c36]/10 text-[#1a3c36]">
                <Table2 className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-3 text-[11px] text-gray-400">Total station tables</p>
          </div>

          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Available Tables</p>
                <h3 className="mt-1 font-serif text-2xl font-bold text-emerald-600 md:text-3xl">
                  {availableTables.length}
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-3 text-[11px] text-gray-400">Ready for guest seating</p>
          </div>

          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Occupied Tables</p>
                <h3 className="mt-1 font-serif text-2xl font-bold text-amber-600 md:text-3xl">
                  {occupiedTables.length}
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-3 text-[11px] text-gray-400">Currently dining</p>
          </div>

          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Total Seats</p>
                <h3 className="mt-1 font-serif text-2xl font-bold text-gray-900 md:text-3xl">
                  {totalSeats}
                </h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Armchair className="h-6 w-6" />
              </div>
            </div>
            <p className="mt-3 text-[11px] text-gray-400">{foodsCount} food items available</p>
          </div>
        </div>

        {/* Quick Action Navigation Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-2xl border border-[#e5e9e5] bg-white p-6 shadow-sm transition hover:shadow-md">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4f0] text-[#1a3c36]">
                <Table2 className="h-6 w-6 text-[#1a3c36]" />
              </div>
              <h2 className="mt-4 font-serif text-lg font-bold text-gray-900">
                Dining Table Management
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                View your table layout, switch between grid and floor views, update table status, and initiate table orders.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1a3c36]">
                {tables.length} tables in station
              </span>
              <Link
                to="/server/tables"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1a3c36] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#25524a]"
              >
                <span>View Tables</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-[#e5e9e5] bg-white p-6 shadow-sm transition hover:shadow-md">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fcf5e5] text-[#b88c2b]">
                <UtensilsCrossed className="h-6 w-6 text-[#b88c2b]" />
              </div>
              <h2 className="mt-4 font-serif text-lg font-bold text-gray-900">
                Food Menu & Order Taking
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Browse food dishes, filter veg & non-veg options, check prices and preparation time, add items to cart, and send orders to kitchen.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#b88c2b]">
                {foodsCount} dishes on menu
              </span>
              <Link
                to="/server/foods"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#d4a843] px-4 py-2 text-xs font-bold text-[#1a3c36] transition hover:bg-[#e2b755]"
              >
                <span>Open Food Menu</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Assigned Tables Section */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="font-serif text-lg font-bold text-gray-900 flex items-center gap-2">
                <Table2 className="h-5 w-5 text-[#1a3c36]" /> Assigned Station Tables
              </h2>
              <p className="text-xs text-gray-500">
                Click "Take Order" on any table to select items and send directly to the kitchen.
              </p>
            </div>
            <Link
              to="/server/tables"
              className="text-xs font-semibold text-[#1a3c36] hover:underline"
            >
              See all tables &rarr;
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-500">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#1a3c36] mb-2" />
              Loading tables...
            </div>
          ) : tables.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {tables.map((table) => {
                const isAvailable = (table.status || "Available") === "Available";
                return (
                  <div
                    key={table.table_id || table.id}
                    className="flex flex-col justify-between rounded-xl border border-gray-200 bg-[#fafbfa] p-4 transition hover:border-[#1a3c36] hover:shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-base font-bold text-gray-900">
                          Table {table.table_number}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isAvailable
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {table.status || "Available"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {table.no_of_seats} Seats • Dining
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => startOrderForTable(table)}
                      className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1a3c36] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#25524a]"
                    >
                      <Utensils className="h-3.5 w-3.5 text-[#d4a843]" />
                      <span>Take Order</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Table2 className="mx-auto h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-700">No tables assigned yet</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Ask your administrator to allocate dining tables to your server station.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}