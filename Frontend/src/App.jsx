import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./CommonComponents/Navbar";
import Footer from "./CommonComponents/Footer";

import ScrollToTop from "./CommonComponents/ScrollToTop";
import FloatingSupport from "./CommonComponents/FloatingSupport";
import Loader from "./CommonComponents/Loader";
import CartSidebar from "./CommonComponents/CartSidebar";
import FavoritesSidebar from "./CommonComponents/FavoritesSidebar";
import { useAuth } from "./PrivateRouter/AuthContext";

function App() {
  const [loading] = useState(false);
  const { user } = useAuth();
  const { pathname, hash } = useLocation();
  const currentRoute = hash?.startsWith("#") ? hash.slice(1) : pathname;
  const isAuthPage = currentRoute === "/login" || currentRoute === "/register";
  const isAdmin = currentRoute === "/admin" || currentRoute.startsWith("/admin/");
  const isEmployee =
    currentRoute === "/employee" ||
    currentRoute.startsWith("/employee/") ||
    currentRoute === "/trainee" ||
    currentRoute.startsWith("/trainee/");
  const showPublicChrome = !isAuthPage && !isAdmin && !isEmployee;

  if (loading) {
    return <Loader />;
  }

  return (
    <section>
      {showPublicChrome && (
        <div className="print:hidden">
          <Navbar />
        </div>
      )}
      <div className="print:hidden">
        <ScrollToTop />
        <FloatingSupport />
      </div>
      <CartSidebar />
      <FavoritesSidebar />
      <Outlet />
      <Toaster
        position="top-right"
        reverseOrder={false}
        containerStyle={{ zIndex: 999999 }}
        toastOptions={{
          style: {
            zIndex: 999999,
          },
        }}
      />
      {showPublicChrome && <Footer />}
    </section>
  );
}

export default App;