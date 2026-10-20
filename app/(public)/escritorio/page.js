import Category from "../../../src/View/Category/Category";
import { categoryDescription } from "../../../src/domain/catalog/categoryCopy.js";
import { getProductsByCategory } from "../../../src/infra/db/queries/catalog.js";
import { absoluteUrl } from "../../../src/lib/site.js";

const description = categoryDescription("escritorio");

export const metadata = {
  title: "Artículos de escritorio",
  description,
  alternates: { canonical: absoluteUrl("/escritorio") },
  openGraph: { title: "Artículos de escritorio", description, url: absoluteUrl("/escritorio") },
};

export default async function Page() {
  return <Category category="escritorio" products={await getProductsByCategory("escritorio")} />;
}
