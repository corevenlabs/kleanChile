import { NavLink } from "react-router-dom";
import { useRef, useState } from "react";
import "./Navbar.css";

export default function Navbar({ data }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const closeTimer = useRef(null);
  const openMenu = (index) => { clearTimeout(closeTimer.current); setActiveMenu(index); };
  const scheduleClose = () => { closeTimer.current = setTimeout(() => setActiveMenu(null), 150); };

  return <nav className="navbar"><div className="navbar__inner">
    <NavLink to="/" className="navbar__brand"><span className="navbar__brand-text">{data.brand}</span></NavLink>
    {searchOpen && <div className="navbar__search"><input type="text" placeholder={data.searchPlaceholder} autoFocus /></div>}
    <ul className={`navbar__links ${searchOpen ? "navbar__links--hidden" : ""}`}>{data.links.map((link, index) => <li key={link.path} className="navbar__item" onMouseEnter={() => openMenu(index)} onMouseLeave={scheduleClose}>
      <NavLink to={link.path} end={link.path === "/"} className={({ isActive }) => `navbar__link ${isActive ? "navbar__link--active" : ""}`}>{link.name}</NavLink>
      {link.dropdown && activeMenu === index && <div className="megaMenu" onMouseEnter={() => openMenu(index)} onMouseLeave={scheduleClose}><div className="megaMenu__container"><div className="megaMenu__title">{link.dropdown.title}</div><div className="megaMenu__grid">{link.dropdown.sections.map((section) => <div key={section.title} className="megaMenu__section"><h4>{section.title}</h4>{section.items.map((item) => <NavLink key={item} to={`${link.path}/${item.toLowerCase()}`} className={({ isActive }) => `megaMenu__item ${isActive ? "megaMenu__item--active" : ""}`}>{item}</NavLink>)}</div>)}</div></div></div>}
    </li>)}</ul>
    <div className="navbar__actions"><button className="navbar__icon-btn" aria-label="Buscar" onClick={() => { setSearchOpen(!searchOpen); setMenuOpen(false); }}>{searchOpen ? <span>✕</span> : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" /></svg>}</button><button className="navbar__hamburger" aria-label="Menú" onClick={() => setMenuOpen(!menuOpen)}><span /><span /><span /></button></div>
  </div><div className={`navbar__mobile ${menuOpen ? "navbar__mobile--open" : ""}`}>{data.links.map((link) => <NavLink key={link.path} to={link.path} end={link.path === "/"} className={({ isActive }) => `navbar__mobile-link ${isActive ? "navbar__mobile-link--active" : ""}`} onClick={() => setMenuOpen(false)}>{link.name}</NavLink>)}</div></nav>;
}
