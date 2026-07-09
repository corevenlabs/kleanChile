import './BrandSlider.css'

const brands = [
  { name: 'Clorox',        logo: 'https://logo.clearbit.com/clorox.com' },
  { name: 'Ariel',         logo: 'https://logo.clearbit.com/ariel.com' },
  { name: '3M',            logo: 'https://logo.clearbit.com/3m.com' },
  { name: 'Vileda',        logo: 'https://logo.clearbit.com/vileda.com' },
  { name: 'Scotch-Brite',  logo: 'https://logo.clearbit.com/scotch-brite.com' },
  { name: 'Faber-Castell', logo: 'https://logo.clearbit.com/faber-castell.com' },
  { name: 'Staedtler',     logo: 'https://logo.clearbit.com/staedtler.com' },
  { name: 'BIC',           logo: 'https://logo.clearbit.com/bicworld.com' },
  { name: 'Pelikan',       logo: 'https://logo.clearbit.com/pelikan.com' },
  { name: 'Omo',           logo: 'https://logo.clearbit.com/omo.com' },
  { name: 'Unilever',      logo: 'https://logo.clearbit.com/unilever.com' },
  { name: 'Ajax',          logo: 'https://logo.clearbit.com/ajax.com' },
]

const doubled = [...brands, ...brands]

export default function BrandSlider() {
  return (
    <section className="brands">
      <p className="brands__label">Marcas que trabajamos</p>
      <div className="brands__outer">
        <div className="brands__track">
          {doubled.map((b, i) => (
            <div key={i} className="brands__item">
              <img
                src={b.logo}
                alt={b.name}
                loading="lazy"
                onError={e => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextSibling.style.display = 'block'
                }}
              />
              <span className="brands__fallback">{b.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}