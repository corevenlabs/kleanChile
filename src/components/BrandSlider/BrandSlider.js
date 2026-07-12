"use client";

export default function BrandSlider({ data }) {
  const brands = [...data.items, ...data.items];
  return <section className="brands">
    <p className="brands__label">{data.label}</p>
    <div className="brands__outer"><div className="brands__track">{brands.map((brand, index) => <div key={`${brand.name}-${index}`} className="brands__item">
      <img src={brand.logo} alt={brand.name} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.nextSibling.style.display = "block"; }} />
      <span className="brands__fallback">{brand.name}</span>
    </div>)}</div></div>
  </section>;
}
