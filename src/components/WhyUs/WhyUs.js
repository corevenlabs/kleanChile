
const icons = {
  star: <path d="M12 2l2.5 6.5L21 9.5l-5 4.5 1.5 7L12 18l-5.5 3 1.5-7L3 9.5l6.5-1z" />,
  arrow: <path d="M5 12h14M12 5l7 7-7 7" />,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  price: <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
  catalog: <><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /></>,
};

export default function WhyUs({ data }) {
  return <section className="why"><div className="why__header"><p className="why__eyebrow">{data.eyebrow}</p><h2 className="why__title">{data.title}</h2><p className="why__subtitle">{data.subtitle}</p></div>
    <div className="why__grid">{data.reasons.map((reason) => <div key={reason.id} className="why__card"><div className="why__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{icons[reason.icon]}</svg></div><div className="why__content"><h3>{reason.title}</h3><p>{reason.desc}</p></div></div>)}</div>
  </section>;
}
