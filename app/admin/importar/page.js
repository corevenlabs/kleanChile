import Icon from "../../../src/admin/components/Icon";
import ImportWizard from "../../../src/admin/components/ImportWizard";
import { getImportBatches } from "../../../src/infra/db/queries/imports.js";
import { requireUser } from "../../../src/lib/adminSession.js";

export const metadata = { title: "Importar productos" };

const dateFormat = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short",
});

export default async function Page() {
  await requireUser();

  const batches = await getImportBatches();

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-kicker">CATÁLOGO</p>
          <h1>Importar productos</h1>
          <p>Carga o actualiza muchos productos de una vez desde Excel o CSV.</p>
        </div>
      </header>

      <div className="admin-settings">
        <ImportWizard />

        <div className="admin-panel">
          <div className="admin-panel__head">
            <div>
              <h2>Cargas anteriores</h2>
              <p>Queda registro de cada archivo aplicado y de quién lo subió.</p>
            </div>
          </div>

          {batches.length === 0 ? (
            <div className="admin-empty">
              <Icon name="archivo" size={30} />
              Todavía no has importado ningún archivo.
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Archivo</th>
                    <th>Fecha</th>
                    <th>Quién</th>
                    <th>Creados</th>
                    <th>Actualizados</th>
                    <th>Errores</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id}>
                      <td>
                        <strong>{batch.fileName}</strong>
                        <small className="admin-hint"> · {batch.totalRows} filas</small>
                      </td>
                      <td>{dateFormat.format(batch.createdAt)}</td>
                      <td>{batch.uploadedBy?.name ?? "—"}</td>
                      <td>{batch.createdRows}</td>
                      <td>{batch.updatedRows}</td>
                      <td>{batch.errorRows}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
