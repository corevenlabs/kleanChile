import { NavLink } from 'react-router-dom';
import { useState, useRef } from 'react';
import './Navbar.css';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const closeTimer = useRef(null);

const links = [
  { name: 'Inicio', path: '/', dropdown: null },

  {
    name: 'Limpieza',
    path: '/cleaning',
    dropdown: {
      title: 'Productos de Limpieza',
      sections: [
        { title: 'Químicos', items: ['Detergentes', 'Desinfectantes', 'Cloro'] },
        { title: 'Equipos', items: ['Aspiradoras', 'Mopas', 'Fregonas'] },
        { title: 'Accesorios', items: ['Guantes', 'Paños', 'Escobas'] }
      ]
    }
  },

  {
    name: 'Librería',
    path: '/bookshop',
    dropdown: {
      title: 'Librería',
      sections: [
        { title: 'Lectura', items: ['Novelas', 'Ficción', 'Ensayos'] },
        { title: 'Educación', items: ['Escolar', 'Universitario', 'Técnico'] },
        { title: 'Ofertas', items: ['Descuentos', 'Outlet', 'Promos'] }
      ]
    }
  },

  {
    name: 'Artículos de escritorio',
    path: '/desktop',
    dropdown: {
      title: 'Artículos de escritorio',
      sections: [
        { title: 'Periféricos', items: ['Teclados', 'Mouse', 'Webcams'] },
        { title: 'Mobiliario', items: ['Escritorios', 'Sillas', 'Soportes'] },
        { title: 'Accesorios', items: ['Lámparas', 'Organizadores', 'Cables'] }
      ]
    }
  },

  { name: 'Nosotros', path: '/about', dropdown: null },
  { name: 'Contacto', path: '/contact', dropdown: null }
];

  // Abre el menú al instante y cancela cualquier cierre pendiente
  const openMenu = (index) => {
    clearTimeout(closeTimer.current);
    setActiveMenu(index);
  };

  // Cierra el menú con un pequeño delay para tolerar movimientos rápidos/diagonales del mouse
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setActiveMenu(null), 150);
  };

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        <NavLink to="/" className="navbar__brand">
          <span className="navbar__brand-text">CleanPro</span>
        </NavLink>

        {searchOpen && (
          <div className="navbar__search">
            <input type="text" placeholder="Buscar productos..." autoFocus />
          </div>
        )}

        <ul className={`navbar__links ${searchOpen ? 'navbar__links--hidden' : ''}`}>
          {links.map((link, index) => (
            <li
              key={index}
              className="navbar__item"
              onMouseEnter={() => openMenu(index)}
              onMouseLeave={scheduleClose}
            >
              <NavLink
                to={link.path}
                end={link.path === '/'}
                className={({ isActive }) =>
                  `navbar__link ${isActive ? 'navbar__link--active' : ''}`
                }
              >
                {link.name}
              </NavLink>

              {link.dropdown && activeMenu === index && (
                <div
                  className="megaMenu"
                  onMouseEnter={() => openMenu(index)}
                  onMouseLeave={scheduleClose}
                >
                  <div className="megaMenu__container">
                    <div className="megaMenu__title">{link.dropdown.title}</div>
                    <div className="megaMenu__grid">
                      {link.dropdown.sections.map((section, i) => (
                        <div key={i} className="megaMenu__section">
                          <h4>{section.title}</h4>
                          {section.items.map((item, j) => (
                            <NavLink
                              key={j}
                              to={`${link.path}/${item.toLowerCase()}`}
                              className={({ isActive }) =>
                                `megaMenu__item ${isActive ? 'megaMenu__item--active' : ''}`
                              }
                            >
                              {item}
                            </NavLink>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="navbar__actions">
          <button className="navbar__icon-btn" onClick={() => { setSearchOpen(!searchOpen); setMenuOpen(false); }}>
            {searchOpen ? <span>✕</span> : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"/></svg>}
          </button>
          <button className="navbar__hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span /><span />
          </button>
        </div>
      </div>

      <div className={`navbar__mobile ${menuOpen ? 'navbar__mobile--open' : ''}`}>
        {links.map((link, i) => (
          <NavLink
            key={i}
            to={link.path}
            end={link.path === '/'}
            className={({ isActive }) =>
              `navbar__mobile-link ${isActive ? 'navbar__mobile-link--active' : ''}`
            }
            onClick={() => setMenuOpen(false)}
          >
            {link.name}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}