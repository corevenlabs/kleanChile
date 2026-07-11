import "./Footer.css";
import { NavLink } from "react-router-dom";

export default function Footer({ data }) {
  return <footer className="footer"><div className="footer__container">
    <div className="footer__brand"><h2>{data.brand}</h2><p>{data.description}</p></div>
    {data.sections.map((section) => <div className="footer__section" key={section.title}><h3>{section.title}</h3>{section.links.map((link) => <NavLink key={link.path} to={link.path}>{link.label}</NavLink>)}</div>)}
    <div className="footer__section"><h3>{data.contact.title}</h3>{data.contact.items.map((item) => <p key={item}>{item}</p>)}</div>
    <div className="footer__location"><h3>{data.location.title}</h3><div className="footer__map"><iframe src={data.location.embedUrl} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" title={data.location.mapTitle} /></div>
      <a className="footer__map-cta" href={data.location.mapUrl} target="_blank" rel="noreferrer"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>{data.location.cta}</a>
    </div>
  </div><div className="footer__bottom"><p>© {new Date().getFullYear()} {data.copyright}</p></div></footer>;
}
