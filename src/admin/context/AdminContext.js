import { createContext, useContext, useEffect, useState } from "react";
import { ADMIN_STORAGE_KEY, adminStorage } from "../services/adminStorage";

const AdminContext = createContext(null);

const EMPTY_CONTENT = {
  products: [],
  banners: [],
  settings: {
    footer: {
      brand: "",
      description: "",
      contact: { title: "Contacto", items: ["", "", ""] },
      sections: [],
      location: { title: "Ubicación", embedUrl: "", mapUrl: "", mapTitle: "", cta: "Ver en Google Maps" },
      copyright: "",
    },
    whatsapp: {
      phoneNumber: "",
      message: "",
      ariaLabel: "Chat en WhatsApp",
      icon: "/whatsapp-fill.svg",
      alt: "WhatsApp",
    },
  },
};

const createEmptyContent = () => JSON.parse(JSON.stringify(EMPTY_CONTENT));

export function AdminProvider({ children }) {
  const [content, setContent] = useState(() => adminStorage.load() || createEmptyContent());

  useEffect(() => adminStorage.save(content), [content]);

  const mutate = (collection, updater) => setContent((current) => ({ ...current, [collection]: updater(current[collection]) }));
  const saveProduct = (product) => mutate("products", (items) => {
    const exists = items.some(({ id }) => id === product.id);
    return exists ? items.map((item) => item.id === product.id ? product : item) : [...items, { ...product, id: Date.now() }];
  });
  const deleteProduct = ({ id }) => mutate("products", (items) => items.filter((item) => item.id !== id));
  const saveBanner = (banner) => mutate("banners", (items) => items.some(({ id }) => id === banner.id) ? items.map((item) => item.id === banner.id ? banner : item) : [...items, { ...banner, id: Date.now() }]);
  const deleteBanner = (id) => mutate("banners", (items) => items.filter((item) => item.id !== id));
  const saveSettings = (settings) => setContent((current) => ({ ...current, settings }));
  const clearContent = () => {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    setContent(createEmptyContent());
  };

  const value = { ...content, saveProduct, deleteProduct, saveBanner, deleteBanner, saveSettings, clearContent };
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export const useAdmin = () => {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin debe usarse dentro de AdminProvider");
  return value;
};
