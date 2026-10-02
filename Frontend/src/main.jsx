import { StrictMode, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import Home from './Componets/Home/Home.jsx'

import Login from './Componets/Auth/Login.jsx'
import Register from './Componets/Auth/Register.jsx'

import PrivateRoute from './PrivateRouter/PrivateRouter.jsx'


import AdminDashboard from './Admin/AdminDashboard.jsx'
import AdminSettings from './Admin/AdminSettings.jsx'
import AdminProfile from './Admin/AdminProfile.jsx'
import AddEmployee from './Admin/AddEmployee.jsx'
import AllEmployees from './Admin/AllEmployees.jsx'
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
import AdminReviews from './Admin/AdminReviews/AdminReviews.jsx'
import PointOfSale from './Admin/Billings/PointOfSale.jsx'
import Billing from './Admin/Billings/Billing.jsx'
import NewBilling from './Admin/Billings/NewBilling.jsx'
import OrderDetails from './Admin/Billings/OrderDetails.jsx'



import ChefDashboard from './Chef Restaurant/ChefDashboard.jsx'
import ChefLayout from './Chef Restaurant/Chefpanel.jsx'
import ServerDashboard from './Server Restaurant/ServerDashboard.jsx'
import ServerTables from './Server Restaurant/ServerTables.jsx'
import ServerLayout from './Server Restaurant/Serverpanel.jsx'
import DeliveryDashboard from './Delivery Restaurant/DeliveryDashboard.jsx'
import DeliveryLayout from './Delivery Restaurant/Deliverypanel.jsx'


import { AuthProvider } from './PrivateRouter/AuthContext.jsx'
import { StoreProvider } from './PrivateRouter/StoreContext.jsx'
import { AdminProvider } from './PrivateRouter/AdminContext';
import RouteError from './CommonComponents/RouteError.jsx'



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
            path: 'customers',
            element: <AdminCustomers />,
          },
          {
            path: 'settings',
            element: <AdminSettings />,
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
            path: 'reviews',
            element: <AdminReviews />,
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
            element: <ServerDashboard />,
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
          <PrivateRoute allowedRoles={["Super Admin", "delivery"]}>
            <DeliveryLayout />
          </PrivateRoute>
        ),
        children: [
          {
            index: true,
            element: <DeliveryDashboard />,
          },
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
