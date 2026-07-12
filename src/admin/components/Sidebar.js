"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { to: "/admin/dashboard", icon: "⌂", label: "Resumen" },
  { to: "/admin/productos", icon: "□", label: "Productos" },
  { to: "/admin/banners", icon: "▧", label: "Banners" },
  { to: "/admin/configuracion", icon: "⚙", label: "Configuración" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = () => { localStorage.removeItem("auth"); router.push("/login"); };
  return <aside className="admin-sidebar"><Link href="/" className="admin-brand"><span className="admin-brand__mark">K</span><span><strong>KleanChile</strong><small>Administración</small></span></Link>
    <nav className="admin-nav"><span className="admin-nav__label">MENÚ</span>{links.map((link) => <Link key={link.to} href={link.to} className={`admin-nav__link ${pathname === link.to ? "active" : ""}`}><span>{link.icon}</span>{link.label}</Link>)}</nav>
    <div className="admin-sidebar__footer"><Link href="/" className="admin-site-link">↗ Ver sitio público</Link><button onClick={logout}>Cerrar sesión</button></div>
  </aside>;
}
