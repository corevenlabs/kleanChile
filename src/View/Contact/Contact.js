"use client";

import { useState } from "react";

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
  const email = lines.find(({ kind }) => kind === "Correo")?.line ?? "";
  const [feedback, setFeedback] = useState("");

  function sendMessage(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const sender = String(form.get("email") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();

    const subject = encodeURIComponent(`Consulta web de ${name}`);
    const body = encodeURIComponent(
      `Nombre: ${name}\nCorreo: ${sender}\n\nMensaje:\n${message}`,
    );

    setFeedback("Abriremos tu correo con el mensaje listo para enviar.");
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }

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

        <form className="contact__form" onSubmit={sendMessage}>
          <div className="contact__form-head">
            <p className="contact__form-kicker">Cuéntanos tu requerimiento</p>
            <h2>Envíanos un mensaje</h2>
            <p>Déjanos tus datos y prepararemos una respuesta para tu necesidad.</p>
          </div>

          <label className="contact__field">
            <span>Nombre</span>
            <input name="name" type="text" autoComplete="name" required />
          </label>

          <label className="contact__field">
            <span>Correo</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>

          <label className="contact__field">
            <span>Mensaje</span>
            <textarea name="message" rows="6" required />
          </label>

          <button className="contact__submit" type="submit" disabled={!email}>
            Enviar mensaje
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13" />
              <path d="m22 2-7 20-4-9-9-4Z" />
            </svg>
          </button>

          <p className="contact__feedback" aria-live="polite">
            {email ? feedback : "Configura un correo de contacto para habilitar el envío."}
          </p>
        </form>
      </div>
    </div>
  );
}
