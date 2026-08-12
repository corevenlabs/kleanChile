import About from "../../../src/View/About/About";
import { absoluteUrl } from "../../../src/lib/site.js";

const description =
  "Conoce KleanChile, nuestras soluciones de limpieza, librería, escritorio y maquinaria, y cómo ayudamos a empresas e instituciones de todo Chile.";

/* Canónica y `og:url` explícitas — ver la nota en `contact/page.js`: sin ellas
   se hereda la de la portada y esta página se auto-descarta del índice. */
export const metadata = {
  title: "Nosotros",
  description,
  alternates: { canonical: absoluteUrl("/nosotros") },
  openGraph: { title: "Nosotros", description, url: absoluteUrl("/nosotros") },
};

export default function Page() {
  return <About />;
}
