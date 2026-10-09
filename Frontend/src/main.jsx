import { StrictMode, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, Navigate, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Home from './Componets/Home/Home.jsx'
import Shop from './Componets/Shop/Shop.jsx'
import Offers from './Componets/Shop/Offers.jsx'
import Checkout from './Componets/Checkout/Checkout.jsx'
import About from './Componets/About.jsx'
import Gallery from './Componets/Gallery.jsx'
import Contact from './Componets/Contact.jsx'
import Reservation from './Componets/Reservation.jsx'

import Login from './Componets/Auth/Login.jsx'
import Register from './Componets/Auth/Register.jsx'
import Account from './Componets/Auth/Account.jsx'

import PrivateRoute from './PrivateRouter/PrivateRouter.jsx'


import AdminDashboard from './Admin/AdminDashboardOverview.jsx'
import AdminSettings from './Admin/AdminSettings.jsx'
import AdminProfile from './Admin/AdminProfile.jsx'
import ChefSettings from './Chef Restaurant/ChefSettings.jsx'
import ChefInventoryRequests from './Chef Restaurant/ChefInventoryRequests.jsx'
import ChefProducts from './Chef Restaurant/ChefProducts.jsx'
import AddEmployee from './Admin/AddEmployee.jsx'
import AllEmployees from './Admin/AllEmployees.jsx'
import AdminAttendance from './Admin/AdminAttendance.jsx'
import ManageServers from './Admin/ManageServers.jsx'
import ManageDeliveryPartners from './Admin/ManageDeliveryPartners.jsx'
import AdminCustomers from './Admin/AdminCustomers.jsx'
import BannerManagement from './Admin/Marketting/BannerManagement.jsx'
import Coupons from './Admin/Marketting/Coupons.jsx'
import VideoManagement from './Admin/Marketting/VideoManagement.jsx'
import AdminLayout from './Admin/Adminpanel.jsx'
import AdminCategories from './Admin/AdminProducts/Categories.jsx'
import AddCategory from './Admin/AdminProducts/AddCategory.jsx'
import Cuisines from './Admin/AdminProducts/Cuisines.jsx'
import AdminProducts from './Admin/AdminProducts/AdminProducts.jsx'
import StockDetails from './Admin/AdminProducts/StockDetails.jsx'
import AddFood from './Admin/AdminProducts/AddFood.jsx'
import InventoryModule from './Admin/InventoryModule.jsx'
import AdminReviews from './Admin/AdminReviews/AdminReviews.jsx'
import AdminReservations from './Admin/AdminReservations.jsx'
import PointOfSale from './Admin/Billings/PointOfSale.jsx'
import Billing from './Admin/Billings/Billing.jsx'
import NewBilling from './Admin/Billings/NewBilling.jsx'
import OrderDetails from './Admin/Billings/OrderDetails.jsx'
import ExpensesPage from './Admin/Expenses/ExpensesPage.jsx'
import EmployeeSalary from './Admin/Expenses/EmployeeSalary.jsx'
const RevenuePage = lazy(() => import('./Admin/RevenuePage.jsx'))



import ChefDashboard from './Chef Restaurant/ChefDashboard.jsx'
import ChefKitchenOrders from './Chef Restaurant/ChefKitchenOrders.jsx'
import ChefLayout from './Chef Restaurant/Chefpanel.jsx'
import ServerDashboard from './Server Restaurant/ServerDashboard.jsx'
import ServerFood from './Server Restaurant/ServerFood/ServerFood.jsx'
import ServerTables from './Server Restaurant/ServerTables/ServerTables.jsx'
import ServerLayout from './Server Restaurant/Serverpanel.jsx'
import DeliveryLayout from './Delivery Restaurant/Deliverypanel.jsx'
import { DeliveryOrdersPage, DeliveryPartnerDashboard, DeliveryPartnerPages } from './Delivery Restaurant/DeliveryRoutePages.jsx'

import { AuthProvider } from './PrivateRouter/AuthContext.jsx'
import { StoreProvider } from './PrivateRouter/StoreContext.jsx'
import { AdminProvider } from './PrivateRouter/AdminContext';
import RouteError from './CommonComponents/RouteError.jsx'
import CustomerOrdersPage from './CommonComponents/CustomerOrdersPage.jsx'
import FoodDetailsPage from './CommonComponents/FoodDetailsPage.jsx'



const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      
      {
        path: 'shop',
        element: <Shop />,
      },
      {
        path: 'offers',
        element: <Offers />,
      },
      {
        path: 'menu',
        element: <Shop />,
      },
      {
        path: 'about',
        element: <About />,
      },
      {
        path: 'gallery',
        element: <Gallery />,
      },
      {
        path: 'contact',
        element: <Contact />,
      },
      {
        path: 'reservation',
        element: <Reservation />,
      },
      {
        path: 'food/:foodId',
        element: <FoodDetailsPage />,
      },
      {
        path: 'checkout',
        element: <Checkout />,
      },
      {
        path: 'my-orders',
        element: (
          <PrivateRoute allowedRoles={["user", "customer"]}>
            <CustomerOrdersPage key="customer-my-orders" audience="customer" />
          </PrivateRoute>
        ),
      },
      {
        path: 'account',
        element: (
          <PrivateRoute allowedRoles={["user", "customer"]}>
            <Account />
          </PrivateRoute>
        ),
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'register',
        element: <Register />,
      },
      
      
      {
        path: 'admin',
        element: (
          <PrivateRoute allowedRoles={["Super Admin", "Admin"]}>
            <AdminLayout />
          </PrivateRoute>
        ),
        children: [
          {
            index: true,
            element: <AdminDashboard />,
          },
          {
            path: 'employees',
            element: <AllEmployees />,
          },
          {
            path: 'employee-salary',
            element: <EmployeeSalary />,
          },
          {
            path: 'employees/attendance',
            element: <AdminAttendance />,
          },
          {
            path: 'attendance',
            element: <AdminAttendance />,
          },
          {
            path: 'servers',
            element: <ManageServers />,
          },
          {
            path: 'employees/servers',
            element: <ManageServers />,
          },
          {
            path: 'delivery-partners',
            element: <ManageDeliveryPartners />,
          },
          {
            path: 'employees/delivery-partners',
            element: <ManageDeliveryPartners />,
          },
          {
            path: 'employees/add',
            element: <AddEmployee />,
          },
          {
            path: 'employees/add/:employeeType',
            element: <AddEmployee />,
          },
          {
            path: 'employees/:employeeId/edit',
            element: <AddEmployee />,
          },
          {
            path: 'tables',
            element: <ServerTables />,
          },
          {
            path: 'reservations',
            element: <AdminReservations />,
          },
          {
            path: 'customers',
            element: <AdminCustomers />,
          },
          {
            path: 'orders',
            element: <CustomerOrdersPage key="admin-orders-all" audience="admin" view="all" showOrderFilters />,
          },
          {
            path: 'kitchen-orders',
            element: <ChefKitchenOrders key="admin-kitchen-orders" defaultViewMode="table" />,
          },
          {
            path: 'orders/new',
            element: <CustomerOrdersPage key="admin-orders-new" audience="admin" view="new" showOrderFilters />,
          },
          {
            path: 'orders/delivery',
            element: <CustomerOrdersPage key="admin-orders-delivered" audience="admin" view="delivered" showOrderFilters />,
          },
          {
            path: 'orders/homedelivery',
            element: <CustomerOrdersPage key="admin-orders-homedelivery" audience="admin" view="delivery" showOrderFilters />,
          },
          {
            path: 'orders/pickup',
            element: <CustomerOrdersPage key="admin-orders-pickup" audience="admin" view="pickup" showOrderFilters />,
          },
          {
            path: 'orders/dining',
            element: <ChefKitchenOrders key="admin-orders-dining" defaultViewMode="table" orderTypeFilter="dine-in" />,
          },
          {
            path: 'orders/cancelled',
            element: <CustomerOrdersPage key="admin-orders-cancelled" audience="admin" view="cancelled" showOrderFilters />,
          },
          {
            path: 'settings',
            element: <AdminSettings />,
          },
          {
            path: 'delivery-charges',
            element: <AdminSettings initialTab="delivery" />,
          },
          {
            path: 'settings/profile',
            element: <AdminProfile />,
          },
          {
            path: 'banners',
            element: <BannerManagement />,
          },
          {
            path: 'coupons',
            element: <Coupons />,
          },
          {
            path: 'videos',
            element: <VideoManagement />,
          },
          {
            path: 'products',
            element: <AdminProducts />,
          },
          {
            path: 'products/add',
            element: <AddFood />,
          },
          {
            path: 'products/edit/:foodId',
            element: <AddFood />,
          },
          {
            path: 'products/categories',
            element: <AdminCategories />,
          },
          {
            path: 'products/categories/add',
            element: <AddCategory />,
          },
          {
            path: 'products/categories/edit/:categoryId',
            element: <AddCategory />,
          },
          {
            path: 'products/cuisines',
            element: <Cuisines />,
          },
          {
            path: 'products/stock-details',
            element: <StockDetails />,
          },
          {
            path: 'inventory/*',
            element: <InventoryModule />,
          },
          {
            path: 'reviews',
            element: <AdminReviews />,
          },
          {
            path: 'revenue',
            element: <RevenuePage />,
          },
          {
            path: 'expenses',
            element: <ExpensesPage />,
          },
          {
            path: 'billing',
            element: <PointOfSale />,
          },
          {
            path: 'billing/new',
            element: <NewBilling />,
          },
          {
            path: 'billing/history',
            element: <Billing />,
          },
          {
            path: 'billing/:orderId',
            element: <OrderDetails />,
          },
        ],
      },


      {
        path: 'chef',
        element: (
          <PrivateRoute allowedRoles={["Super Admin", "chef"]}>
            <ChefLayout />
          </PrivateRoute>
        ),
        children: [
          {
            index: true,
            element: <ChefDashboard />,
          },
          {
            path: 'orders',
            element: <ChefKitchenOrders />,
          },
          {
            path: 'requests',
            element: <ChefInventoryRequests />,
          },
          {
            path: 'products',
            element: <ChefProducts />,
          },
          {
            path: 'settings',
            element: <ChefSettings />,
          },
          {
            path: 'settings/profile',
            element: <ChefSettings />,
          },
          {
            path: 'customer-orders',
            element: <CustomerOrdersPage key="chef-orders-all" audience="chef" view="all" showOrderFilters />,
          },
          {
            path: 'customer-orders/new',
            element: <CustomerOrdersPage key="chef-orders-new" audience="chef" view="new" showOrderFilters />,
          },
          {
            path: 'customer-orders/homedelivery',
            element: <CustomerOrdersPage key="chef-orders-homedelivery" audience="chef" view="delivery" showOrderFilters />,
          },
          {
            path: 'customer-orders/pickup',
            element: <CustomerOrdersPage key="chef-orders-pickup" audience="chef" view="pickup" showOrderFilters />,
          },
          {
            path: 'customer-orders/dining',
            element: <ChefKitchenOrders key="chef-orders-dining" defaultViewMode="table" orderTypeFilter="dine-in" />,
          },
          {
            path: 'customer-orders/delivery',
            element: <CustomerOrdersPage key="chef-orders-delivery" audience="chef" view="delivery" />,
          },
          {
            path: 'customer-orders/cancelled',
            element: <CustomerOrdersPage key="chef-orders-cancelled" audience="chef" view="cancelled" showOrderFilters />,
          },
        ],
      },


      {
        path: 'server',
        element: (
          <PrivateRoute allowedRoles={["Super Admin", "server"]}>
            <ServerLayout />
          </PrivateRoute>
        ),
        children: [
          {
            index: true,
            element: <ServerDashboard />,
          },
          {
            path: 'foods',
            element: <ServerFood />,
          },
          {
            path: 'tables',
            element: <ServerTables />,
          },
        ],
      },


      {
        path: 'delivery',
        element: (
          <PrivateRoute allowedRoles={["Super Admin", "delivery", "Delivery Partner"]}>
            <DeliveryLayout />
          </PrivateRoute>
        ),
        children: [
          {
            index: true,
            element: <DeliveryPartnerDashboard />,
          },
          {
            path: 'orders',
            element: <DeliveryOrdersPage view="all" />,
          },
          { path: 'orders/new', element: <DeliveryOrdersPage view="new" /> },
          { path: 'orders/delivery', element: <DeliveryOrdersPage view="delivery" /> },
          { path: 'orders/cancelled', element: <DeliveryOrdersPage view="cancelled" /> },
          { path: 'earnings', element: <DeliveryPartnerPages section="earnings" /> },
          { path: 'history', element: <DeliveryPartnerPages section="history" /> },
          { path: 'notifications', element: <Navigate to="/delivery" replace /> },
          { path: 'profile', element: <DeliveryPartnerPages section="profile" /> },
          { path: 'support', element: <DeliveryPartnerPages section="support" /> },
        ],
      },
    ],
  },
])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <StoreProvider>
        <AdminProvider>
          <RouterProvider router={router} />
        </AdminProvider>
      </StoreProvider>
    </AuthProvider>
  </StrictMode>,
)

// Make token debugger available globally in browser console
if (import.meta.env.DEV) {
  console.log("🔐 Token debugger available. Run checkTokenStatus() in console to debug authentication.");
}
