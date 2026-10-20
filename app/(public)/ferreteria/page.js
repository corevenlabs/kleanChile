import Category from "../../../src/View/Category/Category";
import { categoryDescription } from "../../../src/domain/catalog/categoryCopy.js";
import { getProductsByCategory } from "../../../src/infra/db/queries/catalog.js";
import { absoluteUrl } from "../../../src/lib/site.js";

const description = categoryDescription("ferreteria");

export const metadata = {
  title: "Ferretería",
  description,
  alternates: { canonical: absoluteUrl("/ferreteria") },
  openGraph: { title: "Ferretería", description, url: absoluteUrl("/ferreteria") },
};

export default async function Page() {
  return <Category category="ferreteria" products={await getProductsByCategory("ferreteria")} />;
}
