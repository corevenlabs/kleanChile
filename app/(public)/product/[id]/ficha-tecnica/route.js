import { redirect } from "next/navigation";
import { specEntries } from "../../../../../src/domain/catalog/specLabels.js";
import { getProduct } from "../../../../../src/infra/db/queries/catalog.js";
import { getContent } from "../../../../../src/infra/db/queries/content.js";
import { renderSpecSheet } from "../../../../../src/infra/pdf/specSheet.js";
import { documentSlug } from "../../../../../src/infra/storage/documentKeys.js";
import { absoluteImage } from "../../../../../src/lib/site.js";

/**
 * La ficha técnica de un producto, en PDF, armada desde su tabla de
 * especificaciones.
 *
 * Un Route Handler porque lo que devuelve no es una página: son bytes con un
 * `Content-Disposition`. Es además el segundo sitio donde corre `sharp` —para
 * convertir la foto AVIF del catálogo en algo que un PDF pueda llevar adentro—
 * y mantenerlo detrás de un endpoint conserva la regla de que el binario nativo
 * no entre en el grafo de ninguna página.
 *
 * Público a propósito: es el botón «Descargar ficha técnica» de la tienda.
 *
 * Los datos salen de las mismas cachés etiquetadas que usa la página del
 * producto, así que editar una especificación en el panel cambia este PDF en la
 * siguiente descarga sin ningún paso intermedio.
 */

export async function GET(_request, { params }) {
  const { id } = await params;
  const product = await getProduct(Number.parseInt(id, 10));

  if (!product) {
    return new Response("No encontrado", { status: 404 });
  }

  /*
   * Si el producto tiene una ficha subida, esa manda.
   *
   * La tienda ya enlaza directo al archivo, así que llegar acá significa una URL
   * escrita a mano o guardada de antes. Redirigir es lo que hace que las dos
   * respondan lo mismo — un PDF generado a espaldas de la ficha oficial del
   * fabricante sería la clase de discrepancia que nadie descubre hasta que un
   * cliente compara los dos documentos.
   */
  if (product.specSheet) redirect(product.specSheet);

  const specs = specEntries(product.specs);
  if (specs.length === 0) {
    // Sin especificaciones no hay documento que generar. Un PDF de una página en
    // blanco es peor que un 404: parece que la descarga funcionó.
    return new Response("Este producto no tiene ficha técnica.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const content = await getContent();

  const pdf = await renderSpecSheet({
    product: { ...product, image: absoluteImage(product.image) },
    specs,
    contactLines: content.footer?.contact?.items ?? [],
  });

  const fileName = `${product.skuCode ? `${product.skuCode}-` : ""}${documentSlug(product.name)}.pdf`;

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.byteLength),
      /*
       * `attachment` y no `inline`: el botón dice «Descargar». Y el nombre va
       * dos veces —ASCII y UTF-8— porque `documentSlug` ya quitó los acentos
       * pero el SKU y el guion se escapan distinto según el navegador; la forma
       * `filename*` es la que entienden todos los actuales.
       */
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      /*
       * Se puede cachear un rato, pero no para siempre: esto se deriva de datos
       * que un admin edita, y la URL no cambia cuando el contenido sí. Cinco
       * minutos es bastante para absorber una ráfaga de descargas y poco para
       * que una corrección tarde en verse.
       */
      "Cache-Control": "public, max-age=300",
    },
  });
}
