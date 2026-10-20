import Category from "../../../src/View/Category/Category";
import { categoryDescription } from "../../../src/domain/catalog/categoryCopy.js";
import { getProductsByCategory } from "../../../src/infra/db/queries/catalog.js";
import { absoluteUrl } from "../../../src/lib/site.js";

const description = categoryDescription("pausa-del-dia");

export const metadata = {
  title: "Pausa del día",
  description,
  alternates: { canonical: absoluteUrl("/pausa-del-dia") },
  openGraph: { title: "Pausa del día", description, url: absoluteUrl("/pausa-del-dia") },
};

export default async function Page() {
  return <Category category="pausa-del-dia" products={await getProductsByCategory("pausa-del-dia")} />;
}
