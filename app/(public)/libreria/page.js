import Category from "../../../src/View/Category/Category";
import { categoryDescription } from "../../../src/domain/catalog/categoryCopy.js";
import { getProductsByCategory } from "../../../src/infra/db/queries/catalog.js";
import { absoluteUrl } from "../../../src/lib/site.js";

const description = categoryDescription("libreria");

export const metadata = {
  title: "Librería",
  description,
  alternates: { canonical: absoluteUrl("/libreria") },
  openGraph: { title: "Librería", description, url: absoluteUrl("/libreria") },
};

export default async function Page() {
  return <Category category="libreria" products={await getProductsByCategory("libreria")} />;
}
