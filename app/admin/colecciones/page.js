import CollectionsManager from "../../../src/admin/components/CollectionsManager";
import { collectionPath } from "../../../src/domain/content/links.js";
import { getAllProducts } from "../../../src/infra/db/queries/catalog.js";
import { getAllCollections } from "../../../src/infra/db/queries/collections.js";
import { getBlockForEdit } from "../../../src/infra/db/queries/content.js";
import { requireUser } from "../../../src/lib/adminSession.js";

export const metadata = { title: "Colecciones" };

/** Los bloques que pueden enlazar a una colección, con el nombre que les da el panel. */
const LINKING_BLOCKS = [
  ["navigation", "Menú"],
  ["hero", "Carrusel de la portada"],
  ["dualBanner", "Banner doble"],
  ["bestSellers", "Más vendidos"],
  ["footer", "Pie de página"],
];

export default async function Page() {
  await requireUser();

  const [collections, products, blocks] = await Promise.all([
    getAllCollections(),
    getAllProducts(),
    Promise.all(LINKING_BLOCKS.map(([key]) => getBlockForEdit(key))),
  ]);

  /*
   * Dónde se usa cada colección, para avisarlo antes de borrarla: un enlace a
   * una colección que ya no existe es un 404 en el menú o en el banner. Se
   * busca la ruta en el texto de cada bloque, que es exactamente lo que el
   * selector de enlaces guarda.
   */
  const texts = blocks.map((block) => JSON.stringify(block));
  const withUsage = collections.map((collection) => {
    const needle = `"${collectionPath(collection.slug)}"`;
    return {
      ...collection,
      usedIn: LINKING_BLOCKS.filter((_, index) => texts[index].includes(needle)).map(([, label]) => label),
    };
  });

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-kicker">CATÁLOGO</p>
          <h1>Colecciones</h1>
          <p>Grupos de productos con su propia página, para enlazarlos desde el banner o el menú.</p>
        </div>
      </header>

      <CollectionsManager collections={withUsage} products={products} />
    </section>
  );
}
