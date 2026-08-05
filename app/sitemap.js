import {
  filterByClassification,
  slugify,
} from "../src/domain/catalog/classification.js";
import { CATEGORIES } from "../src/domain/content/vocabulary.js";
import { getProductsByCategory } from "../src/infra/db/queries/catalog.js";
import { getContent } from "../src/infra/db/queries/content.js";
import { absoluteUrl } from "../src/lib/site.js";

/**
 * The sitemap, built from the database rather than written down.
 *
 * A hand-kept list would be wrong the first time someone hides a product, and
 * nobody would notice — a sitemap is read by crawlers and by no human ever.
 * Everything here comes from the same queries the pages themselves use, so a
 * product that 404s cannot be listed and a hidden one cannot leak.
 *
 * The reads are cached and tagged, so this costs a crawler nothing that a page
 * view does not already cost.
 */
/*
 * Rendered on demand, not baked at build.
 *
 * Products are added through the admin, not through a deploy, so a sitemap
 * frozen at build time starts lying the first time someone adds a product and
 * keeps lying until the next release. The underlying reads are cached and
 * tagged, so a crawl costs a render, not a table scan.
 */
export const dynamic = "force-dynamic";

export default async function sitemap() {
  const content = await getContent();
  const byCategory = await Promise.all(
    CATEGORIES.map(async (category) => ({
      category,
      products: await getProductsByCategory(category),
    })),
  );

  const entries = [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/contact"), changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/nosotros"), changeFrequency: "yearly", priority: 0.6 },
  ];

  for (const { category, products } of byCategory) {
    entries.push({
      url: absoluteUrl(`/${category}`),
      changeFrequency: "weekly",
      priority: 0.8,
    });

    /*
     * Only the classifications that match something.
     *
     * Eight of the menu's items currently find no products. Those pages are
     * correct to exist and correct to say so to a person who clicked the menu,
     * but submitting an empty results page to a crawler is asking to be judged
     * on thin content. They stay reachable and stay out of the sitemap.
     */
    const link = content.navigation.links.find((entry) => entry.path === `/${category}`);
    const items = (link?.dropdown?.sections ?? []).flatMap((section) => section.items);

    for (const slug of new Set(items.map(slugify))) {
      if (filterByClassification(products, slug).length === 0) continue;
      entries.push({
        url: absoluteUrl(`/${category}/${slug}`),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }

    for (const product of products) {
      entries.push({
        url: absoluteUrl(`/product/${String(product.id)}`),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
