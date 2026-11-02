import Home from "../../src/View/Home/Home";
import { getBestSellers } from "../../src/infra/db/queries/catalog.js";
import { getContent } from "../../src/infra/db/queries/content.js";
import { SITE_NAME } from "../../src/lib/site.js";

/**
 * La portada es la única página que se presenta con el título y la
 * descripción del sitio, y esos se editan en Configuración → Google. Las
 * demás páginas escriben los suyos.
 *
 * `openGraph` y `twitter` van completos y no solo con la descripción: Next
 * reemplaza esos objetos enteros entre segmentos, no los mezcla, así que
 * mandar solo `description` borraba la imagen de la vista previa.
 */
export async function generateMetadata() {
  const { seo } = await getContent();
  const title = { absolute: seo.title };

  return {
    title,
    description: seo.description,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "es_CL",
      url: "/",
      title: seo.title,
      description: seo.description,
      images: [{ url: "/brand/og.png", width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: ["/brand/og.png"],
    },
  };
}

export default async function Page() {
  const content = await getContent();

  // The rail's heading and link are editable; which products fill it is not —
  // that comes from what has actually sold.
  const bestSellers = await getBestSellers(content.bestSellers.limit);

  return <Home content={content} bestSellers={bestSellers} />;
}
