import Link from "next/link";

/**
 * La firma del estudio.
 *
 * No sale del bloque `footer` editable a propósito, igual que en azarwear: es
 * una firma, no contenido del sitio, y no tiene por qué desaparecer porque
 * alguien vació un campo en el panel. El copyright de al lado sí es editable —
 * ese es del cliente.
 *
 * `STUDIO_URL` vacío renderiza texto plano en vez de un enlace: un enlace a un
 * dominio inventado es peor que ninguno. Ponle la URL y se convierte en enlace
 * sin tocar nada más.
 */
const STUDIO = "CorevenLabs";
const STUDIO_URL = "";

function StudioCredit() {
  const label = (
    <>
      <span>Hecho por</span>
      <strong>{STUDIO}</strong>
    </>
  );

  return STUDIO_URL ? (
    <a className="footer__studio" href={STUDIO_URL} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  ) : (
    <span className="footer__studio">{label}</span>
  );
}

export default function Footer({ data }) {
  const sections = data.sections.map((section, index) => {
    if (index !== 0 || section.links.some((link) => link.path === "/nosotros")) return section;
    return { ...section, links: [...section.links, { label: "Nosotros", path: "/nosotros" }] };
  });

  return <footer className="footer"><div className="footer__container">
    <div className="footer__brand">
      <div className="footer__lockup">
        <img src="/brand/mark.png" alt="" width={256} height={256} />
        <h2>{data.brand}</h2>
      </div>
      <p>{data.description}</p>
    </div>
    {sections.map((section) => <div className="footer__section" key={section.title}><h3>{section.title}</h3>{section.links.map((link) => <Link key={link.path} href={link.path}>{link.label}</Link>)}</div>)}
    <div className="footer__section"><h3>{data.contact.title}</h3>{data.contact.items.map((item) => <p key={item}>{item}</p>)}</div>
    <div className="footer__location"><h3>{data.location.title}</h3><div className="footer__map"><iframe src={data.location.embedUrl} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" title={data.location.mapTitle} /></div>
      <a className="footer__map-cta" href={data.location.mapUrl} target="_blank" rel="noreferrer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>{data.location.cta}</a>
    </div>
  </div><div className="footer__bottom"><p>© {new Date().getFullYear()} {data.copyright}</p><StudioCredit /></div></footer>;
}
