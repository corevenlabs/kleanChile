import './Footer.css'
import { NavLink } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">

      <div className="footer__container">

        {/* BRAND */}
        <div className="footer__brand">
          <h2>CleanPro</h2>
          <p>
            Soluciones profesionales de limpieza, librería y maquinaria industrial.
          </p>
        </div>

        {/* EMPRESA */}
        <div className="footer__section">
          <h3>Empresa</h3>
          <NavLink to="/about">Nosotros</NavLink>
          <NavLink to="/contact">Contacto</NavLink>
        </div>

        {/* CATEGORÍAS */}
        <div className="footer__section">
          <h3>Categorías</h3>
          <NavLink to="/cleaning">Limpieza</NavLink>
          <NavLink to="/bookshop">Librería</NavLink>
          <NavLink to="/machinery">Maquinaria</NavLink>
        </div>

        {/* CONTACTO */}
        <div className="footer__section">
          <h3>Contacto</h3>
          <p>contacto@cleanpro.cl</p>
          <p>+56 9 1234 5678</p>
          <p>Temuco, Chile</p>
        </div>

        {/* UBICACIÓN */}
        <div className="footer__location">

          <h3>Ubicación</h3>

          <div className="footer__map">
            <iframe
              src="https://www.google.com/maps?q=Avenida+Alemania+1000+Temuco&output=embed"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación CleanPro"
            />
          </div>

          <a
            className="footer__map-cta"
            href="https://maps.google.com/?q=Avenida+Alemania+1000+Temuco"
            target="_blank"
            rel="noreferrer"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>

            Ver en Google Maps
          </a>

        </div>

      </div>

      <div className="footer__bottom">
        <p>
          © {new Date().getFullYear()} CorevenLabs Todos los derechos reservados.
        </p>
      </div>

    </footer>
  )
}