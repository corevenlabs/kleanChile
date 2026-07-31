"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "../../actions/auth";
import Icon from "./Icon";

const links = [
  { to: "/admin/dashboard", icon: "resumen", label: "Resumen" },
  { to: "/admin/pedidos", icon: "pedidos", label: "Pedidos" },
  { to: "/admin/portada", icon: "portada", label: "Portada" },
  { to: "/admin/productos", icon: "productos", label: "Productos" },
  { to: "/admin/importar", icon: "importar", label: "Importar" },
  { to: "/admin/configuracion", icon: "configuracion", label: "Configuración" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar">
      <Link href="/" className="admin-brand">
        <img className="admin-brand__mark" src="/brand/mark.png" alt="" width={256} height={256} />
        <span>
          <strong>KleanChile</strong>
          <small>Administración</small>
        </span>
      </Link>

      <nav className="admin-nav">
        <span className="admin-nav__label">MENÚ</span>
        {links.map((link) => (
          <Link
            key={link.to}
            href={link.to}
            // `startsWith` para que una subruta como /admin/importar/plantilla
            // deje el ítem del menú marcado.
            className={`admin-nav__link ${pathname.startsWith(link.to) ? "active" : ""}`}
          >
            <Icon name={link.icon} />
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="admin-sidebar__footer">
        <Link href="/" className="admin-site-link">
          <Icon name="externo" size={15} />
          Ver sitio público
        </Link>
        {/* Un formulario, no un onClick: cerrar sesión cambia estado en el
            servidor, y así sigue funcionando sin JavaScript cargado. */}
        <form action={signOutAction}>
          <button type="submit">
            <Icon name="salir" size={15} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
