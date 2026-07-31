import { randomUUID } from "node:crypto";
import { config } from "dotenv";

config({ path: ".env.local" });

const { storageConfig } = await import("../src/env.js");
const { processImage } = await import("../src/infra/storage/imagePipeline.js");
const { parseRenditionUrl, buildSrcSet } = await import("../src/infra/storage/imageKeys.js");
const sharp = (await import("sharp")).default;

/**
 * Prueba el pipeline de imágenes de punta a punta.
 *
 *   node scripts/verify-media.js            # solo el pipeline, sin red
 *   node scripts/verify-media.js --r2       # además sube, lee y borra en R2
 *   node scripts/verify-media.js --r2 --cors https://kleanchile.cl
 *
 * Sin `--r2` no toca la red: comprueba que sharp produce el escalón esperado y
 * que la URL resultante se puede volver a leer para armar el `srcset`. Ese
 * ida y vuelta es la única cosa que, si se rompe, deja el sitio sirviendo URLs
 * que dan 404 sin que nada falle en el build.
 *
 * Con `--r2` sube un objeto de prueba con prefijo `uploads/tmp/verify-` y lo
 * borra al terminar, así que es seguro correrlo contra el bucket de producción.
 */

const wantR2 = process.argv.includes("--r2");
const corsOrigin = process.argv[process.argv.indexOf("--cors") + 1];

let failures = 0;
const check = (label, passed, detail = "") => {
  console.log(`${passed ? "  ok  " : "FALLA "} ${label}${detail ? `  — ${detail}` : ""}`);
  if (!passed) failures += 1;
};

// ── 1. El pipeline ───────────────────────────────────────────────────────────

// Una imagen sintética de 2000×1200: más ancha que 1600 para que se ejerciten
// el tope de WebP y el escalón completo.
const source = await sharp({
  create: { width: 2000, height: 1200, channels: 3, background: { r: 30, g: 100, b: 200 } },
})
  .jpeg()
  .toBuffer();

const processed = await processImage(source);

check("dimensiones del original", processed.originalWidth === 2000 && processed.originalHeight === 1200,
  `${String(processed.originalWidth)}×${String(processed.originalHeight)}`);

const avif = processed.renditions.filter((r) => r.format === "avif").map((r) => r.width);
const webp = processed.renditions.filter((r) => r.format === "webp").map((r) => r.width);

check("AVIF hasta 1600 (no agranda por sobre el original)",
  JSON.stringify(avif) === JSON.stringify([320, 640, 1024, 1600]), avif.join(", "));
check("WebP acotado a 1600", webp.every((w) => w <= 1600), webp.join(", "));
check("el prefijo lleva las dimensiones", processed.prefix.includes("/2000x1200"), processed.prefix);

const totalKb = processed.totalBytes / 1024;
check("el escalón pesa menos que el original", processed.totalBytes < source.length,
  `${totalKb.toFixed(0)} KB vs ${(source.length / 1024).toFixed(0)} KB del original`);

// ── 2. El ida y vuelta de la URL ─────────────────────────────────────────────

const fakeUrl = `https://cdn.ejemplo.cl/${processed.prefix}/1024.avif`;
const parsed = parseRenditionUrl(fakeUrl);

check("la URL se vuelve a leer", parsed !== null);
check("el ancho original sobrevive el viaje", parsed?.originalWidth === 2000, String(parsed?.originalWidth));

const srcset = parsed ? buildSrcSet(parsed.prefix, parsed.originalWidth, "avif") : "";
const listed = srcset.split(", ").map((entry) => Number(entry.match(/(\d+)w$/)?.[1]));
check("el srcset ofrece exactamente las renditions que existen",
  JSON.stringify(listed) === JSON.stringify(avif), listed.join(", "));

check("una URL de proveedor no se confunde con una rendition",
  parseRenditionUrl("https://images.unsplash.com/photo-123?w=600") === null);

// ── 3. R2 ────────────────────────────────────────────────────────────────────

if (!wantR2) {
  console.log(`\n${failures === 0 ? "Todo bien" : `${String(failures)} fallas`} (pipeline; usa --r2 para probar el bucket)\n`);
  process.exit(failures === 0 ? 0 : 1);
}

const cfg = storageConfig();
if (!cfg) {
  console.error("\nR2 no está configurado. Define las cinco variables R2_* en .env.local.\n");
  process.exit(1);
}

const { uploadObject, getObjectBytes, objectExists, deleteObject, createUploadUrl } = await import(
  "../src/infra/storage/r2.js"
);

const key = `uploads/tmp/verify-${randomUUID()}.avif`;
const body = processed.renditions[0].data;

await uploadObject({ key, body, contentType: "image/avif" });
check("subir un objeto", await objectExists(key));

const readBack = await getObjectBytes(key);
check("leerlo de vuelta byte por byte", readBack.equals(body), `${String(readBack.length)} bytes`);

const signed = await createUploadUrl(`${key}.signed`, "image/avif");
check("firmar una URL de subida", signed.includes("X-Amz-Signature"));

/*
 * El preflight de CORS.
 *
 * Es el paso que más se olvida al desplegar: el PUT sale del navegador directo
 * al bucket, así que R2 tiene que permitir el origen del sitio. Si falta, las
 * subidas fallan solo en producción y solo desde el navegador — nunca acá.
 */
if (corsOrigin) {
  const preflight = await fetch(signed, {
    method: "OPTIONS",
    headers: {
      Origin: corsOrigin,
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "content-type",
    },
  });
  const allowed = preflight.headers.get("access-control-allow-origin");
  check(`CORS permite ${corsOrigin}`, allowed === corsOrigin || allowed === "*",
    allowed ?? "sin cabecera Access-Control-Allow-Origin");
}

await deleteObject(key);
check("borrarlo", !(await objectExists(key)));

console.log(`\n${failures === 0 ? "Todo bien" : `${String(failures)} fallas`}\n`);
process.exit(failures === 0 ? 0 : 1);
