import ProductsManager from "../../../src/admin/components/ProductsManager";
import { getAllProducts } from "../../../src/infra/db/queries/catalog.js";
import { requireUser } from "../../../src/lib/adminSession.js";

export const metadata = { title: "Productos" };

export default async function Page() {
  await requireUser();

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-kicker">CATÁLOGO</p>
          <h1>Productos</h1>
          <p>Administra productos, categorías, precios, imágenes y fichas técnicas.</p>
        </div>
      </header>

      <ProductsManager products={await getAllProducts()} />
    </section>
  );
}
