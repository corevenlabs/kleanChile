import Category from "../../../src/View/Category/Category";
import { categoryDescription } from "../../../src/domain/catalog/categoryCopy.js";
import { getProductsByCategory } from "../../../src/infra/db/queries/catalog.js";
import { absoluteUrl } from "../../../src/lib/site.js";

const description = categoryDescription("bookshop");

export const metadata = {
  title: "Librería",
  description,
  alternates: { canonical: absoluteUrl("/bookshop") },
  openGraph: { title: "Librería", description, url: absoluteUrl("/bookshop") },
};

export default async function Page() {
  return <Category category="bookshop" products={await getProductsByCategory("bookshop")} />;
}
