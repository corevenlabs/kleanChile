import { createContext, useContext, useEffect, useMemo, useState } from "react";

export const KleanContext = createContext(null);

const DATA_ENDPOINTS = {
  navigation: "/data/navigation.json",
  banner: "/data/banner.json",
  home: "/data/home.json",
  catalogs: "/data/catalogs.json",
  site: "/data/site.json",
  productDetails: "/data/product-details.json",
};

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`No se pudo cargar ${url} (${response.status})`);
  return response.json();
}

export const KleanProvider = ({ children }) => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all(
      Object.entries(DATA_ENDPOINTS).map(async ([key, url]) => [
        key,
        await fetchJson(url, controller.signal),
      ])
    )
      .then((entries) => setData(Object.fromEntries(entries)))
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const value = useMemo(() => ({ ...data, loading, error }), [data, loading, error]);

  return <KleanContext.Provider value={value}>{children}</KleanContext.Provider>;
};

export const useKlean = () => {
  const context = useContext(KleanContext);
  if (!context) throw new Error("useKlean debe usarse dentro de KleanProvider");
  return context;
};
