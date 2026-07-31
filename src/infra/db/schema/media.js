import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth.js";

/**
 * Lo que se subió al bucket.
 *
 * **Nada de lo que se ve en la tienda depende de esta tabla.** El `srcset` sale
 * de la propia URL, que lleva las dimensiones del original adentro — ver
 * `infra/storage/imageKeys.js`. Si esta tabla se perdiera entera, el sitio
 * seguiría renderizando exactamente igual.
 *
 * Existe para lo que la URL no puede contestar: qué hay en el bucket, quién lo
 * subió y cuándo. Sin eso no hay forma de limpiar huérfanos —una foto que se
 * subió, se reemplazó por otra y quedó ocupando espacio para siempre— ni de
 * responder «¿por qué el bucket pesa 4 GB?».
 *
 * La clave es el prefijo, no el hash: la revisión del codificador es parte de
 * la identidad de lo que se escribió, y reconstruir el prefijo desde un hash
 * repuntaría filas viejas a la revisión en la que ande el código hoy.
 */
export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),

  /** `img/v1/<hash>/<w>x<h>` — sin barra final, sin dominio. */
  storageKey: text("storage_key").notNull().unique(),

  originalWidth: integer("original_width").notNull(),
  originalHeight: integer("original_height").notNull(),

  /** Suma de todas las renditions, para poder explicar el tamaño del bucket. */
  byteSize: integer("byte_size").notNull(),

  /** El nombre del archivo tal como lo mandó el navegador, solo para reconocerlo. */
  fileName: text("file_name"),

  /** Se conserva la fila si el usuario se borra: el objeto sigue en el bucket. */
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
