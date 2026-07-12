"use client";

import NextLink from "next/link";
import { useAdmin } from "../context/AdminContext";

const Link = ({ to, ...props }) => <NextLink href={to} {...props} />;

export default function Dashboard() {
  const { products, banners } = useAdmin();
  const categories = new Set(products.map(({ category }) => category)).size;
  const stats = [
    { label: "Productos", value: products.length, detail: `${categories} categorías`, icon: "□", tone: "blue" },
    { label: "Banners activos", value: banners.length, detail: "Portada principal", icon: "▧", tone: "green" },
    { label: "Estructura", value: "Lista", detail: "Pendiente de contenido", icon: "✓", tone: "amber" },
  ];
  return <section className="admin-page"><header className="admin-page__header"><div><p className="admin-kicker">RESUMEN GENERAL</p><h1>Buenos días</h1><p>Gestiona el contenido de tu sitio desde un solo lugar.</p></div><Link to="/" className="admin-button admin-button--secondary">Ver página ↗</Link></header>
    <div className="admin-stats">{stats.map((stat) => <article className="admin-stat" key={stat.label}><div className={`admin-stat__icon ${stat.tone}`}>{stat.icon}</div><div><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.detail}</small></div></article>)}</div>
    <div className="admin-dashboard-grid"><article className="admin-panel"><div className="admin-panel__head"><div><h2>Accesos rápidos</h2><p>Actualiza las secciones más importantes.</p></div></div><div className="admin-quick-actions"><Link to="/admin/productos"><span>＋</span><div><strong>Agregar producto</strong><small>Catálogo y precios</small></div><b>›</b></Link><Link to="/admin/banners"><span>▧</span><div><strong>Editar portada</strong><small>Banners principales</small></div><b>›</b></Link><Link to="/admin/configuracion"><span>⚙</span><div><strong>Datos del negocio</strong><small>Contacto y redes</small></div><b>›</b></Link></div></article>
      <article className="admin-panel admin-preview"><div className="admin-panel__head"><div><h2>Estado del panel</h2><p>Estructura disponible para completar.</p></div><span className="admin-status">● Preparado</span></div><div className="admin-progress"><div><span>Estructura administrativa</span><strong>100%</strong></div><div className="admin-progress__bar"><i style={{ width: "100%" }} /></div></div><div className="admin-progress"><div><span>Conexión con API</span><strong>Pendiente</strong></div><div className="admin-progress__bar"><i style={{ width: "0%" }} /></div></div><div className="admin-note">El panel comienza vacío. Puedes ingresar contenido manualmente; después, la capa de almacenamiento se reemplaza por la API definitiva.</div></article>
    </div>
  </section>;
}
