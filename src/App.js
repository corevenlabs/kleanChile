import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

import PublicLayout from "./layouts/PublicLayout";

import Home from "./View/Home/Home";
import Cleaning from "./View/Cleaning/Cleaning";
import Bookshop from "./View/Bookshop/Bookshop";
import Desktop  from "./View/Desktop/Desktop"
import Contact from "./View/Contact/Contact";

import Login from "./admin/pages/Login";

import AdminLayout from "./admin/components/AdminLayout";
import Dashboard from "./admin/pages/Dashboard";
import Productos from "./admin/pages/Productos";
import Configuraciones from "./admin/pages/Configuraciones";
import Banners from "./admin/pages/Banners";
import ProtectedRoute from "./admin/components/ProtectedRoute";
import ProductDetail from "./View/ProductDetail/ProductDetail"
import { KleanProvider, useKlean } from "./context/KleanContext";

function AppRoutes() {
  const { navigation, banner, home, catalogs, site, productDetails, loading, error } = useKlean();

  if (loading) return <main className="app-status">Cargando contenido…</main>;
  if (error) return <main className="app-status">No fue posible cargar el contenido: {error}</main>;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout navigation={navigation} site={site} />}>
          <Route path="/" element={<Home banner={banner} content={home} />} />
          <Route path="/cleaning" element={<Cleaning products={catalogs.cleaning} />} />
          <Route path="/bookshop" element={<Bookshop products={catalogs.bookshop} />} />
          <Route path="/desktop" element={<Desktop products={catalogs.desktop} />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/product/:id" element={<ProductDetail products={productDetails} />} />
        </Route>

        <Route path="/login" element={<Login />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="productos" element={<Productos />} />
          <Route path="configuracion" element={<Configuraciones />} />
          <Route path="banners" element={<Banners />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return <KleanProvider><AppRoutes /></KleanProvider>;
}

export default App;
