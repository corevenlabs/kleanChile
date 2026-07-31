import BlockEditor from "../../../src/admin/components/BlockEditor";
import { HOME_BLOCKS } from "../../../src/admin/forms";
import { getBlockForEdit } from "../../../src/infra/db/queries/content.js";
import { requireUser } from "../../../src/lib/adminSession.js";

export const metadata = { title: "Portada" };

/**
 * Every section of the public home page, in the order it appears there.
 *
 * Each block saves on its own. One page-wide save would make an unrelated
 * validation error in the footer block the reason a hero edit could not be
 * stored.
 */
export default async function Page() {
  await requireUser();

  const blocks = await Promise.all(HOME_BLOCKS.map((key) => getBlockForEdit(key)));

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-kicker">CONTENIDO</p>
          <h1>Portada</h1>
          <p>Todo lo que se ve en la página de inicio. Cada sección se guarda por separado.</p>
        </div>
      </header>

      {HOME_BLOCKS.map((key, index) => (
        <BlockEditor key={key} formKey={key} initial={blocks[index]} />
      ))}
    </section>
  );
}
