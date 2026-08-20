"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { classificationHref } from "../../domain/catalog/classification";
import SearchBox from "./SearchBox";
import "./Navbar.css";

/*
 * Cuántos ítems hacen falta para partir el panel en dos columnas.
 *
 * En una sola columna el desplegable de Limpieza —quince clasificaciones más
 * sus encabezados— medía 480px de alto y scrolleaba por dentro. Un menú que se
 * cierra al salir el puntero y que además hay que scrollear no es usable, y
 * alto no es menos invasivo que ancho: tapa la misma columna de productos de
 * arriba abajo. Partido, entra entero sin scroll y sigue lejos del cartel de
 * ancho completo que había antes.
 */
const DOS_COLUMNAS_DESDE = 9;
const cuentaItems = (dropdown) => dropdown.sections.reduce((total, section) => total + section.items.length, 0);

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
  const closeMenu = () => { clearTimeout(closeTimer.current); setActiveMenu(null); };

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

    <ul className="navbar__links">{data.links.map((link, index) => (
      /*
       * El desplegable abre con el mouse y también con el teclado.
       *
       * `onFocus`/`onBlur` burbujean en React, así que el <li> se entera de que
       * alguien tabuló hasta el enlace de la categoría o hasta cualquier ítem de
       * adentro. Sin esto las clasificaciones eran inalcanzables sin mouse: el
       * menú móvil las repite como chips, pero en escritorio no había forma de
       * llegar. `relatedTarget` es quien recibe el foco — si sigue estando dentro
       * del <li>, la persona entró al panel, no lo dejó.
       */
      <li
        key={link.path}
        className="navbar__item"
        onMouseEnter={() => openMenu(index)}
        onMouseLeave={scheduleClose}
        onFocus={() => openMenu(index)}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) closeMenu(); }}
        onKeyDown={(event) => { if (event.key === "Escape") closeMenu(); }}
      >
        <Link
          href={link.path}
          className={`navbar__link ${pathname === link.path ? "navbar__link--active" : ""}`}
          aria-expanded={link.dropdown ? activeMenu === index : undefined}
        >{link.name}</Link>

        {link.dropdown && activeMenu === index && (
          <div className="navDrop" onMouseEnter={() => openMenu(index)} onMouseLeave={scheduleClose}>
            <div className={`navDrop__panel ${cuentaItems(link.dropdown) >= DOS_COLUMNAS_DESDE ? "navDrop__panel--ancho" : ""}`}>
              {link.dropdown.title && <p className="navDrop__title">{link.dropdown.title}</p>}
              <div className="navDrop__sections">{link.dropdown.sections.map((section) => (
                <div key={section.title} className="navDrop__section">
                  <h4 className="navDrop__heading">{section.title}</h4>
                  {section.items.map((item) => {
                    const href = classificationHref(link.path, item);
                    return <Link key={item} href={href} className={`navDrop__item ${pathname === href ? "navDrop__item--active" : ""}`}>{item}</Link>;
                  })}
                </div>
              ))}</div>
              {/* La categoría entera, que es lo que hace el enlace de la barra:
                  repetido acá porque con el panel abierto, volver a apuntarle al
                  título de arriba es un blanco chico. */}
              <Link href={link.path} className="navDrop__all">Ver todo en {link.name}</Link>
            </div>
          </div>
        )}
      </li>
    ))}</ul>

    {/* Siempre visible, y a la izquierda del carrito. Antes vivía detrás de un
        botón con lupa: había que descubrir el ícono para poder buscar, en un
        catálogo donde buscar es la forma principal de encontrar algo. */}
    <SearchBox placeholder={data.searchPlaceholder} />

    <div className="navbar__actions">{cart}<button type="button" className="navbar__hamburger" aria-label="Menú" aria-expanded={menuOpen} aria-controls="menu-movil" onClick={() => setMenuOpen(!menuOpen)}><span /><span /><span /></button></div>
  </div><div id="menu-movil" className={`navbar__mobile ${menuOpen ? "navbar__mobile--open" : ""}`}>{data.links.map((link) => <div key={link.path} className="navbar__mobile-group">
    <Link href={link.path} className={`navbar__mobile-link ${pathname === link.path ? "navbar__mobile-link--active" : ""}`} onClick={() => setMenuOpen(false)}>{link.name}</Link>
    {/* The dropdown opens on hover, so on a phone these classifications had no
        way in at all. Repeated flat rather than behind a second tap: they are
        the shortcuts, and a shortcut you have to open a drawer for is not one. */}
    {link.dropdown && <div className="navbar__mobile-chips">{link.dropdown.sections.flatMap((section) => section.items).map((item) => { const href = classificationHref(link.path, item); return <Link key={href} href={href} className={`navbar__mobile-chip ${pathname === href ? "navbar__mobile-chip--active" : ""}`} onClick={() => setMenuOpen(false)}>{item}</Link>; })}</div>}
  </div>)}</div></nav>;
}
