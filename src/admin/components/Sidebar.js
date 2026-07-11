import { NavLink, useNavigate } from "react-router-dom";

const links = [
  { to: "/admin/dashboard", icon: "⌂", label: "Resumen" },
  { to: "/admin/productos", icon: "□", label: "Productos" },
  { to: "/admin/banners", icon: "▧", label: "Banners" },
  { to: "/admin/configuracion", icon: "⚙", label: "Configuración" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const logout = () => { localStorage.removeItem("auth"); navigate("/login"); };
  return <aside className="admin-sidebar"><NavLink to="/" className="admin-brand"><span className="admin-brand__mark">K</span><span><strong>KleanChile</strong><small>Administración</small></span></NavLink>
    <nav className="admin-nav"><span className="admin-nav__label">MENÚ</span>{links.map((link) => <NavLink key={link.to} to={link.to} className={({ isActive }) => `admin-nav__link ${isActive ? "active" : ""}`}><span>{link.icon}</span>{link.label}</NavLink>)}</nav>
    <div className="admin-sidebar__footer"><NavLink to="/" className="admin-site-link">↗ Ver sitio público</NavLink><button onClick={logout}>Cerrar sesión</button></div>
  </aside>;
}
