import Link from "next/link";
import Icon from "../../../src/admin/components/Icon";
import { CATEGORY_LABELS } from "../../../src/domain/content/vocabulary";
import { getAdminStats } from "../../../src/infra/db/queries/admin.js";
import { requireUser } from "../../../src/lib/adminSession.js";

export const metadata = { title: "Resumen" };

const dateFormat = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function Page() {
  const user = await requireUser();
  const stats = await getAdminStats();

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="admin-kicker">RESUMEN</p>
          <h1>Hola, {user.name.split(" ")[0]}</h1>
          <p>Estado actual del contenido publicado en el sitio.</p>
        </div>
        <Link className="admin-button" href="/" target="_blank">
          <Icon name="externo" size={15} /> Ver sitio público
        </Link>
      </header>

      <div className="admin-stats">
        <div className="admin-stat">
          <div className="admin-stat__icon blue"><Icon name="productos" size={20} /></div>
          <div>
            <span>Productos publicados</span>
            <strong>{stats.activeProducts}</strong>
            <small>{stats.products} en total, incluidos los ocultos</small>
          </div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__icon green"><Icon name="stock" size={20} /></div>
          <div>
            <span>Por categoría</span>
            <strong>{Object.keys(stats.byCategory).length}</strong>
            <small>
              {Object.entries(stats.byCategory)
                .map(([category, total]) => `${CATEGORY_LABELS[category] ?? category}: ${String(total)}`)
                .join(" · ") || "Sin productos"}
            </small>
          </div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__icon amber"><Icon name="reloj" size={20} /></div>
          <div>
            <span>Última edición</span>
            <strong>{stats.lastEdit ? dateFormat.format(stats.lastEdit.updatedAt) : "—"}</strong>
            <small>{stats.lastEdit ? `Sección: ${stats.lastEdit.key}` : "Sin cambios registrados"}</small>
          </div>
        </div>
      </div>

      <div className="admin-dashboard-grid">
        <article className="admin-panel">
          <div className="admin-panel__head">
            <div>
              <h2>Accesos rápidos</h2>
              <p>Lo que se edita con más frecuencia.</p>
            </div>
          </div>
          <div className="admin-quick-actions">
            <Link href="/admin/portada">
              <span><Icon name="portada" size={17} /></span>
              <div>
                <strong>Portada</strong>
                <small>Carrusel, destacados, testimonios y marcas</small>
              </div>
              <b><Icon name="chevron" size={14} /></b>
            </Link>
            <Link href="/admin/productos">
              <span><Icon name="productos" size={17} /></span>
              <div>
                <strong>Productos</strong>
                <small>Catálogo, precios e imágenes</small>
              </div>
              <b><Icon name="chevron" size={14} /></b>
            </Link>
            <Link href="/admin/configuracion">
              <span><Icon name="configuracion" size={17} /></span>
              <div>
                <strong>Configuración</strong>
                <small>Menú, pie de página y WhatsApp</small>
              </div>
              <b><Icon name="chevron" size={14} /></b>
            </Link>
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel__head">
            <div>
              <h2>Cómo funciona</h2>
              <p>Dónde vive lo que editas.</p>
            </div>
          </div>
          <p className="admin-note">
            Los cambios se guardan en la base de datos y aparecen en el sitio público de
            inmediato: no hace falta volver a desplegar. Cada sección se guarda por separado,
            así que un error en una no bloquea a las demás.
          </p>
        </article>
      </div>
    </section>
  );
}
