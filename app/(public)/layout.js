import Navbar from "../../src/components/Navbar/Navbar";
import Footer from "../../src/components/Footer/Footer";
import WhatsAppButton from "../../src/components/WhatsAppButton/WhatsAppButton";
import CartButton from "../../src/components/cart/CartButton";
import JsonLd from "../../src/components/seo/JsonLd";
import { organizationLd } from "../../src/domain/seo/structuredData.js";
import { getContent } from "../../src/infra/db/queries/content.js";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from "../../src/lib/site.js";

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
