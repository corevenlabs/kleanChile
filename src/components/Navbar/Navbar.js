"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { classificationHref } from "../../domain/catalog/classification";
import SearchBox from "./SearchBox";
import "./Navbar.css";

/**
 * `cart` arrives as a rendered element, not as a count.
 *
 * This component is a Client Component for its menus, and the cart button has
 * to read an `httpOnly` cookie — something only the server can do. Passing the
 * finished element down from the layout keeps that read on the server without
 * making the navbar itself server-rendered.
 */
export default function Navbar({ data, cart = null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const closeTimer = useRef(null);
  const barRef = useRef(null);

  /*
   * La barra publica su propia altura en `--k-nav-h`.
   *
   * Desde que quedó pegada arriba, todo lo demás que se pega —los filtros del
   * catálogo, el resumen del carrito— tiene que empezar justo debajo de ella, y
   * ese offset se escribe en hojas que no pueden medirla. El valor de
   * `brand.css` alcanza para el caso normal, pero la barra no siempre mide lo
   * mismo: en un teléfono el buscador baja a su propia fila y la barra crece
   * casi cuarenta pixeles. Con el número fijo, los filtros quedaban cortados
   * por detrás.
   *
   * Se mide `__inner` y no `.navbar`: el menú móvil vive dentro de la barra
   * pero es una cortina sobre la página, no barra — medirlo empujaría los
   * filtros media pantalla hacia abajo cada vez que alguien abre el menú.
   *
   * El valor de CSS es el que rige hasta que esto corre, y es el correcto en el
   * caso normal, así que no hay salto al hidratar.
   */
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return undefined;
    const root = document.documentElement;
    const publish = () => {
      const borde = parseFloat(getComputedStyle(bar.parentElement).borderBottomWidth) || 0;
      root.style.setProperty("--k-nav-h", `${Math.round(bar.getBoundingClientRect().height + borde)}px`);
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      // Una página sin navbar vuelve al valor de la hoja, no al último medido.
      root.style.removeProperty("--k-nav-h");
    };
  }, []);

  const openMenu = (index) => { clearTimeout(closeTimer.current); setActiveMenu(index); };
  const scheduleClose = () => { closeTimer.current = setTimeout(() => setActiveMenu(null), 150); };
  const links = data.links.some((link) => link.path === "/nosotros")
    ? data.links
    : [...data.links, { name: "Nosotros", path: "/nosotros", dropdown: null }];

  return <nav className="navbar"><div className="navbar__inner" ref={barRef}>
    {/* The bubble mark plus the name set live, rather than the supplied lockup
        image: that file bakes in the tagline, which turns to mush at navbar
        height. Poppins was chosen because it matches the wordmark's own
        letterforms, so the typeset version reads as the logo and stays crisp. */}
    <Link href="/" className="navbar__brand" aria-label={data.brand}>
      <img src="/brand/mark.png" alt="" className="navbar__mark" width={256} height={256} />
      <span className="navbar__brand-name" aria-hidden="true">
        <span className="navbar__brand-text">{data.brand}</span>
      </span>
    </Link>
    {searchOpen && <SearchBox placeholder={data.searchPlaceholder} onDone={() => setSearchOpen(false)} />}
    <ul className={`navbar__links ${searchOpen ? "navbar__links--hidden" : ""}`}>{links.map((link, index) => <li key={link.path} className="navbar__item" onMouseEnter={() => openMenu(index)} onMouseLeave={scheduleClose}>
      <Link href={link.path} className={`navbar__link ${pathname === link.path ? "navbar__link--active" : ""}`}>{link.name}</Link>
      {link.dropdown && activeMenu === index && <div className="megaMenu" onMouseEnter={() => openMenu(index)} onMouseLeave={scheduleClose}><div className="megaMenu__container"><div className="megaMenu__title">{link.dropdown.title}</div><div className="megaMenu__grid">{link.dropdown.sections.map((section) => <div key={section.title} className="megaMenu__section"><h4>{section.title}</h4>{section.items.map((item) => { const href = classificationHref(link.path, item); return <Link key={item} href={href} className={`megaMenu__item ${pathname === href ? "megaMenu__item--active" : ""}`}>{item}</Link>; })}</div>)}</div></div></div>}
    </li>)}</ul>
    <div className="navbar__actions">{cart}<button type="button" className="navbar__icon-btn" aria-label="Buscar" aria-expanded={searchOpen} onClick={() => { setSearchOpen(!searchOpen); setMenuOpen(false); }}>{searchOpen ? <span>✕</span> : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" /></svg>}</button><button type="button" className="navbar__hamburger" aria-label="Menú" aria-expanded={menuOpen} aria-controls="menu-movil" onClick={() => { setMenuOpen(!menuOpen); setSearchOpen(false); }}><span /><span /><span /></button></div>
  </div><div id="menu-movil" className={`navbar__mobile ${menuOpen ? "navbar__mobile--open" : ""}`}>{links.map((link) => <div key={link.path} className="navbar__mobile-group">
    <Link href={link.path} className={`navbar__mobile-link ${pathname === link.path ? "navbar__mobile-link--active" : ""}`} onClick={() => setMenuOpen(false)}>{link.name}</Link>
    {/* The mega menu opens on hover, so on a phone these classifications had no
        way in at all. Repeated flat rather than behind a second tap: they are
        the shortcuts, and a shortcut you have to open a drawer for is not one. */}
    {link.dropdown && <div className="navbar__mobile-chips">{link.dropdown.sections.flatMap((section) => section.items).map((item) => { const href = classificationHref(link.path, item); return <Link key={href} href={href} className={`navbar__mobile-chip ${pathname === href ? "navbar__mobile-chip--active" : ""}`} onClick={() => setMenuOpen(false)}>{item}</Link>; })}</div>}
  </div>)}</div></nav>;
}
