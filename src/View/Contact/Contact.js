/**
 * The contact page.
 *
 * It was a route that rendered an empty `<div>` — linked from the navbar and
 * the footer, so it read as a page that had failed to load rather than one that
 * was never written.
 *
 * Nothing here is new content. The lines, the map and the WhatsApp number are
 * the same `footer` and `whatsapp` blocks the footer already renders, which is
 * what keeps this page from becoming a second address to hold in step with the
 * first one.
 */

/**
 * What a free-text contact line is.
 *
 * The admin types lines, not typed fields — "contacto@kleanchile.cl", "+56 9
 * 1234 5678", "Temuco, Chile" — and that is worth keeping: a shop with two
 * numbers and no email should not have to fight a form. So the kind is inferred
 * here, and a line that matches nothing still renders, just without a link.
 */
function classify(line) {
  if (line.includes("@") && !line.includes(" ")) {
    return { kind: "Correo", href: `mailto:${line}`, icon: "mail" };
  }
  // A phone is digits, spaces and punctuation; an address has letters in it.
  if (/^[+()\d\s.-]{7,}$/.test(line)) {
    return { kind: "Teléfono", href: `tel:${line.replace(/[^\d+]/g, "")}`, icon: "phone" };
  }
  return { kind: "Dirección", href: null, icon: "pin" };
}

const ICONS = {
  mail: "M3 7l9 6 9-6M3 7v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z",
  phone:
    "M6 3h3l2 5-2.5 1.5a12 12 0 0 0 5 5L15 12l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z",
  pin: "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
};

export default function Contact({ footer, whatsapp }) {
  const lines = footer.contact.items.map((line) => ({ line, ...classify(line) }));

  // Hidden when there is no number. A dead wa.me link is the one thing this
  // page cannot afford to ship, and the number seeds empty by design.
  const whatsappUrl = whatsapp.phoneNumber
    ? `https://wa.me/${whatsapp.phoneNumber}?text=${encodeURIComponent(whatsapp.message)}`
    : null;

  return (
    <div className="contact">
      <header className="contact__head">
        <p className="contact__eyebrow">Contacto</p>
        <h1>Hablemos de lo que necesitas</h1>
        <p className="contact__lede">
          Cotizamos por volumen para colegios, hoteles, oficinas e industria. Escríbenos y te
          respondemos con precios y plazos de despacho.
        </p>
      </header>

      <div className="contact__body">
        <div className="contact__cards">
          {lines.map(({ line, kind, href, icon }) => {
            const inner = (
              <>
                <span className="contact__icon" aria-hidden="true">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={ICONS[icon]} />
                  </svg>
                </span>
                <span className="contact__card-text">
                  <small>{kind}</small>
                  <strong>{line}</strong>
                </span>
              </>
            );

            return href ? (
              <a key={line} className="contact__card" href={href}>
                {inner}
              </a>
            ) : (
              <div key={line} className="contact__card">
                {inner}
              </div>
            );
          })}

          {whatsappUrl && (
            <a
              className="contact__whatsapp"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={whatsapp.icon} alt="" width={18} height={18} />
              Escribir por WhatsApp
            </a>
          )}
        </div>

        {footer.location.embedUrl && (
          <div className="contact__map">
            <iframe
              src={footer.location.embedUrl}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              title={footer.location.mapTitle}
            />
            <a
              className="contact__map-cta"
              href={footer.location.mapUrl}
              target="_blank"
              rel="noreferrer"
            >
              {footer.location.cta}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
