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
import AdminCustomers from './Admin/AdminCustomers.jsx'
import BannerManagement from './Admin/Marketting/BannerManagement.jsx'
import AdminLayout from './Admin/Adminpanel.jsx'
import AdminCategories from './Admin/AdminProducts/Categories.jsx'
import AddCategory from './Admin/AdminProducts/AddCategory.jsx'
import Cuisines from './Admin/AdminProducts/Cuisines.jsx'
import AdminProducts from './Admin/AdminProducts/AdminProducts.jsx'
import AddFood from './Admin/AdminProducts/AddFood.jsx'
import AdminReviews from './Admin/AdminReviews/AdminReviews.jsx'



import ChefDashboard from './Chef Restaurant/ChefDashboard.jsx'
import ChefLayout from './Chef Restaurant/Chefpanel.jsx'
import ServerDashboard from './Server Restaurant/ServerDashboard.jsx'
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
            path: 'customers',
            element: <AdminCustomers />,
          },
          {
            path: 'banners',
            element: <BannerManagement />,
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
            path: 'reviews',
            element: <AdminReviews />,
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
