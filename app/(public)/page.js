import Home from "../../src/View/Home/Home";
import { getBestSellers } from "../../src/infra/db/queries/catalog.js";
import { getContent } from "../../src/infra/db/queries/content.js";

export default async function Page() {
  const content = await getContent();

  // The rail's heading and link are editable; which products fill it is not —
  // that comes from what has actually sold.
  const bestSellers = await getBestSellers(content.bestSellers.limit);

  return <Home content={content} bestSellers={bestSellers} />;
}
