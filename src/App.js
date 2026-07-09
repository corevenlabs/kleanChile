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

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/cleaning" element={<Cleaning />} />
          <Route path="/bookshop" element={<Bookshop />} />
          <Route path="/desktop" element={<Desktop />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/product/:id" element={<ProductDetail />} />
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

export default App;