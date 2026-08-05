import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { mediaKind } from "./enums.js";
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
 *
 * ── Imágenes y documentos en la misma tabla ─────────────────────────────────
 *
 * Las fichas técnicas en PDF también se registran acá, y no en una tabla
 * aparte, porque la pregunta que esta tabla existe para responder —qué hay en
 * el bucket y por qué pesa lo que pesa— no distingue entre las dos. Dos tablas
 * darían dos respuestas parciales y ninguna completa.
 *
 * Lo que sí las distingue es que un documento no se procesa: se guarda tal como
 * llegó. Por eso `originalWidth`/`originalHeight` son nulables y `kind` dice
 * cuál es cuál.
 */
export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),

  /** `image` procesada, o `document` guardado tal cual. */
  kind: mediaKind("kind").notNull().default("image"),

  /** `img/v1/<hash>/<w>x<h>` para una imagen, `docs/v1/<uuid>/<nombre>.pdf` para un documento. */
  storageKey: text("storage_key").notNull().unique(),

  /** Solo las imágenes tienen dimensiones; un PDF no tiene ninguna que registrar. */
  originalWidth: integer("original_width"),
  originalHeight: integer("original_height"),

  /** Suma de todas las renditions, para poder explicar el tamaño del bucket. */
  byteSize: integer("byte_size").notNull(),

  /** El nombre del archivo tal como lo mandó el navegador, solo para reconocerlo. */
  fileName: text("file_name"),

  /** Se conserva la fila si el usuario se borra: el objeto sigue en el bucket. */
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
