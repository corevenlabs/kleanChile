"use client";

import { useEffect, useState } from "react";

/**
 * Pestañas para una página de ajustes larga.
 *
 * Configuración apilaba el menú, el pie y WhatsApp uno debajo del otro, y el
 * menú solo ya ocupaba varias pantallas. Una pestaña por tema deja ver una
 * cosa a la vez.
 *
 * Los paneles se ocultan, no se desmontan: cada uno guarda su borrador en su
 * propio estado, y cambiar de pestaña no debe tirar lo que alguien escribió
 * sin guardar. La pestaña activa va en el `#` de la dirección, para que
 * recargar o compartir el enlace abra la misma.
 */
export default function SettingsTabs({ tabs }) {
  const [active, setActive] = useState(tabs[0]?.id);

  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (tabs.some((tab) => tab.id === fromHash)) setActive(fromHash);
  }, [tabs]);

  const choose = (id) => {
    setActive(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className="settings-tabs">
      <div className="settings-tabs__list" role="tablist" aria-label="Secciones de configuración">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            className={`settings-tabs__tab ${active === tab.id ? "is-active" : ""}`}
            onClick={() => choose(tab.id)}
          >
            <strong>{tab.label}</strong>
            <small>{tab.description}</small>
          </button>
        ))}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={active !== tab.id}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
