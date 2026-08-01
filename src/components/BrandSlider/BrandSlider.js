"use client";

export default function BrandSlider({ data }) {
  const brands = [...data.items, ...data.items];
  return <section className="brands">
    <p className="brands__label">{data.label}</p>
    <div className="brands__outer"><div className="brands__track">{brands.map((brand, index) => <div key={`${brand.name}-${index}`} className="brands__item">
      {/* Sin logo se muestra el nombre directamente, en vez de un `src=""` que
          React reporta como error y que en desarrollo abre el overlay de Next
          encima de la página. El `onError` cubre el otro caso: el logo existe
          pero su URL ya no responde. */}
      {brand.logo && <img src={brand.logo} alt={brand.name} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.nextSibling.style.display = "block"; }} />}
      <span className="brands__fallback" style={brand.logo ? undefined : { display: "block" }}>{brand.name}</span>
    </div>)}</div></div>
  </section>;
}
