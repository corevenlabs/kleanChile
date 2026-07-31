import BlockEditor from "../../../src/admin/components/BlockEditor";
import { SITE_BLOCKS } from "../../../src/admin/forms";
import { getBlockForEdit } from "../../../src/infra/db/queries/content.js";
import { requireUser } from "../../../src/lib/adminSession.js";

export const metadata = { title: "Configuración" };

/** The chrome that wraps every public page: nav, footer and WhatsApp button. */
export default async function Page() {
  await requireUser();

  const blocks = await Promise.all(SITE_BLOCKS.map((key) => getBlockForEdit(key)));

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-kicker">AJUSTES DEL SITIO</p>
          <h1>Configuración</h1>
          <p>Menú, pie de página y canales de atención. Se aplican a todas las páginas.</p>
        </div>
      </header>

      {SITE_BLOCKS.map((key, index) => (
        <BlockEditor key={key} formKey={key} initial={blocks[index]} />
      ))}
    </section>
  );
}
