import Navbar from "../../src/components/Navbar/Navbar";
import Footer from "../../src/components/Footer/Footer";
import WhatsAppButton from "../../src/components/WhatsAppButton/WhatsAppButton";
import CartButton from "../../src/components/cart/CartButton";
import JsonLd from "../../src/components/seo/JsonLd";
import { organizationLd } from "../../src/domain/seo/structuredData.js";
import { getContent } from "../../src/infra/db/queries/content.js";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "../../src/lib/site.js";

/**
 * La tienda se renderiza por petición, y eso se declara acá.
 *
 * Ya era así en la práctica: este layout lee la cookie del carrito a través de
 * `CartButton`, y sin PPR eso vuelve dinámica toda la rama. Pero *no declararlo*
 * tenía una consecuencia cara: durante `next build` Next igual intenta
 * prerenderizar la página, y llega a consultar la base **antes** de toparse con
 * la cookie que la haría desistir. El resultado es que compilar exigía un
 * Postgres arriba y ya migrado.
 *
 * Eso rompió el primer despliegue en Vercel con
 * `relation "content_blocks" does not exist`: un error de build que en realidad
 * era un paso de datos pendiente. Y encadenaba dos cosas que no deberían
 * depender una de la otra — un despliegue no puede quedar a merced de que Neon
 * despierte de su suspensión a tiempo.
 *
 * Con esto el build no renderiza nada de la tienda, así que no abre una sola
 * conexión. No cambia lo que se sirve: estas rutas ya salían como `ƒ`.
 */
export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }) {
  const content = await getContent();

  return (
    <>
      {/* Declared once for the whole storefront: it describes the shop, not the
          page, and repeating it per route would be three chances to disagree. */}
      <JsonLd
        data={organizationLd({
          url: absoluteUrl("/"),
          name: SITE_NAME,
          description: SITE_DESCRIPTION,
          logo: absoluteUrl("/brand/mark.png"),
          contact: content.footer.contact.items,
        })}
      />

      {/*
        The first thing a keyboard reaches on every page.
        Without it, getting past the navbar to the products means tabbing
        through the logo, five links, twenty-seven menu items, the cart and the
        search button — on every single page, every single time.
      */}
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>

      <Navbar data={content.navigation} cart={<CartButton />} />

      {/* A real `main` landmark: it is what "skip to content" skips to, and
          what a screen reader's landmark list offers as the way in. */}
      <main id="contenido">{children}</main>

      <WhatsAppButton data={content.whatsapp} />
      <Footer data={content.footer} />
    </>
  );
}
