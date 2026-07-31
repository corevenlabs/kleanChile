import Category from "../../../src/View/Category/Category";
import { categoryDescription } from "../../../src/domain/catalog/categoryCopy.js";
import { getProductsByCategory } from "../../../src/infra/db/queries/catalog.js";
import { absoluteUrl } from "../../../src/lib/site.js";

const description = categoryDescription("cleaning");

export const metadata = {
  title: "Limpieza",
  description,
  alternates: { canonical: absoluteUrl("/cleaning") },
  openGraph: { title: "Limpieza", description, url: absoluteUrl("/cleaning") },
};

export default async function Page() {
  return <Category category="cleaning" products={await getProductsByCategory("cleaning")} />;
}
