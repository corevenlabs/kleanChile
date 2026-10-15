import BlockEditor from "../../../src/admin/components/BlockEditor";
import NavigationEditor from "../../../src/admin/components/NavigationEditor";
import SettingsTabs from "../../../src/admin/components/SettingsTabs";
import { getCollectionOptions } from "../../../src/infra/db/queries/collections.js";
import { getBlockForEdit } from "../../../src/infra/db/queries/content.js";
import { requireUser } from "../../../src/lib/adminSession.js";

export const metadata = { title: "Configuración" };

/** Lo que envuelve cada página pública: el menú, el pie y el botón de WhatsApp. */
export default async function Page() {
  await requireUser();

  const [navigation, footer, whatsapp, collections] = await Promise.all([
    getBlockForEdit("navigation"),
    getBlockForEdit("footer"),
    getBlockForEdit("whatsapp"),
    getCollectionOptions(),
  ]);

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-kicker">AJUSTES DEL SITIO</p>
          <h1>Configuración</h1>
          <p>Menú, pie de página y canales de atención. Se aplican a todas las páginas.</p>
        </div>
      </header>

      <SettingsTabs
        tabs={[
          {
            id: "menu",
            label: "Menú",
            description: "La barra superior y sus desplegables",
            content: <NavigationEditor initial={navigation} collections={collections} />,
          },
          {
            id: "pie",
            label: "Pie de página",
            description: "Contacto, mapa y enlaces",
            content: <BlockEditor formKey="footer" initial={footer} collections={collections} />,
          },
          {
            id: "whatsapp",
            label: "WhatsApp",
            description: "El botón flotante",
            content: <BlockEditor formKey="whatsapp" initial={whatsapp} />,
          },
        ]}
      />
    </section>
  );
}
