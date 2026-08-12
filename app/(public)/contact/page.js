import Contact from "../../../src/View/Contact/Contact";
import { getContent } from "../../../src/infra/db/queries/content.js";
import { absoluteUrl } from "../../../src/lib/site.js";

const description =
  "Escríbenos por WhatsApp, llámanos o visítanos. Cotizaciones para colegios, hoteles, oficinas e industria, con despacho a todo Chile.";

/*
 * La canónica y el `og:url` van explícitos, y tienen que ir.
 *
 * Next mezcla los metadatos recorriendo **solo las claves presentes en el
 * hijo** (`mergeMetadata` en `next/dist/lib/metadata`): lo que la página no
 * declara se hereda resuelto desde el layout raíz. Ahí está
 * `alternates: { canonical: "/" }`, así que sin esta línea la página de
 * contacto le declara a Google que ella *es* la portada — estando además
 * enviada en el sitemap. Una URL que se envía y se auto-descarta no se indexa.
 *
 * Lo mismo con `og:url`: heredado, un enlace de contacto compartido por
 * WhatsApp previsualiza la portada.
 */
export const metadata = {
  title: "Contacto",
  description,
  alternates: { canonical: absoluteUrl("/contact") },
  openGraph: { title: "Contacto", description, url: absoluteUrl("/contact") },
};

export default async function Page() {
  const content = await getContent();

  return <Contact footer={content.footer} whatsapp={content.whatsapp} />;
}
