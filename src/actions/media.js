"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { storageConfigured } from "../env.js";
import { confirmUploadedDocument } from "../infra/media/documents.js";
import {
  DOCUMENT_CONTENT_TYPE,
  DOCUMENT_MAX_BYTES,
  documentKey,
  documentSlug,
} from "../infra/storage/documentKeys.js";
import { createUploadUrl } from "../infra/storage/r2.js";
import { requireUser } from "../lib/adminSession.js";
import { checkRateLimit } from "../lib/rateLimit.js";

/**
 * Subida de imágenes, por dos caminos.
 *
 * **Con R2 configurado** el navegador pide acá una URL firmada y hace PUT del
 * original directo al bucket; después `/api/admin/media` lo procesa. El archivo
 * nunca pasa por el servidor: una foto de cámara es más grande de lo que una
 * función serverless puede recibir, y enrutarla por una función sería lento
 * además.
 *
 * **Sin R2** el archivo se escribe en `public/uploads/` como antes. Ese camino
 * sigue existiendo porque `npm run dev` tiene que funcionar con solo una base
 * de datos, y porque un VPS con volumen es una forma legítima de correr esto.
 * En un host serverless el disco es efímero y la foto desaparece — por eso
 * `docs/DEPLOY.md` abre con esa decisión.
 *
 * Los dos caminos terminan igual: el campo guarda una URL.
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_LOCAL_BYTES = 4 * 1024 * 1024;

/**
 * La extensión sale del content type, nunca del nombre que mandó el navegador.
 *
 * Un navegador manda feliz `name: "../../../app/page.js"`, y pegar eso a un
 * directorio es cómo un formulario de subida se convierte en escritura
 * arbitraria. El nombre se descarta entero.
 */
const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Solo el camino local; R2 procesa con sharp y no le sirven ni GIF ni SVG. */
const LOCAL_ONLY_EXTENSIONS = { ...EXTENSIONS, "image/gif": "gif", "image/svg+xml": "svg" };

/** Le dice al navegador qué camino usar, sin que tenga que adivinar. */
export async function storageModeAction() {
  await requireUser();
  return { mode: storageConfigured() ? "r2" : "local" };
}

/**
 * Un permiso de subida directa al bucket.
 */
export async function requestImageUploadAction({ contentType }) {
  const user = await requireUser();

  if (!storageConfigured()) {
    return { status: "error", message: "El almacenamiento de objetos no está configurado." };
  }

  /*
   * Una sesión válida pero descontrolada no debería poder emitir URLs firmadas
   * sin límite: una carga real de galería son unas pocas por minuto.
   *
   * El limitador de acá toma un objeto de opciones y devuelve `allowed` — no la
   * firma posicional con `.ok` de azarwear. Pasarle `(key, 60, 60_000)` no falla
   * en el build ni en los tipos: `limit` cae a su valor por defecto y `.ok` es
   * `undefined`, así que **toda** subida quedaba rechazada.
   */
  if (!checkRateLimit(`upload:${user.id}`, { limit: 60, windowMs: 60_000 }).allowed) {
    return { status: "error", message: "Demasiadas subidas seguidas. Espera un momento." };
  }

  const extension = EXTENSIONS[contentType];
  if (!extension) {
    return { status: "error", message: "Formato no admitido. Usa JPG, PNG, WebP o AVIF." };
  }

  // Clave temporal al azar bajo un prefijo propio. La clave definitiva se
  // calcula desde el contenido y solo después de procesar, así que este nombre
  // es descartable.
  const tempKey = `uploads/tmp/${randomUUID()}.${extension}`;

  return {
    status: "ok",
    uploadUrl: await createUploadUrl(tempKey, contentType),
    tempKey,
  };
}

/**
 * El camino local: el archivo sí pasa por el servidor y se escribe en disco.
 */
export async function uploadImageAction(formData) {
  await requireUser();

  const file = formData.get("file");
  if (!file || typeof file === "string" || file.size === 0) {
    return { status: "error", message: "No se recibió ninguna imagen." };
  }

  if (file.size > MAX_LOCAL_BYTES) {
    return { status: "error", message: "La imagen supera los 4 MB." };
  }

  const extension = LOCAL_ONLY_EXTENSIONS[file.type];
  if (!extension) {
    return { status: "error", message: "Formato no admitido. Usa JPG, PNG, WebP o AVIF." };
  }

  const name = `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.${extension}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));

  return { status: "ok", url: `/uploads/${name}` };
}

/* ── Fichas técnicas en PDF ────────────────────────────────────────────────── */

/**
 * Un permiso para subir un PDF, directo a su clave definitiva.
 *
 * Sin clave temporal ni segundo paso de procesamiento, a diferencia de las
 * imágenes: no hay nada que convertir, así que el archivo puede aterrizar donde
 * se va a quedar. Lo que sigue después es solo comprobar que llegó — ver
 * `infra/media/documents.js`.
 *
 * La clave la arma el servidor. Si la eligiera el navegador, una sesión de
 * admin podría hacer que firmemos una escritura sobre `img/v1/…` y reemplazar
 * una imagen del catálogo por cualquier cosa.
 */
export async function requestDocumentUploadAction({ fileName, contentType, size }) {
  const user = await requireUser();

  if (!storageConfigured()) {
    return { status: "error", message: "El almacenamiento de objetos no está configurado." };
  }

  if (!checkRateLimit(`upload:${user.id}`, { limit: 60, windowMs: 60_000 }).allowed) {
    return { status: "error", message: "Demasiadas subidas seguidas. Espera un momento." };
  }

  if (contentType !== DOCUMENT_CONTENT_TYPE) {
    return { status: "error", message: "La ficha técnica tiene que ser un archivo PDF." };
  }

  /*
   * Un rechazo temprano y barato, no una garantía. El tamaño real se vuelve a
   * medir contra el bucket cuando el PUT ya terminó, porque una URL firmada no
   * puede llevar un límite adentro.
   */
  if (Number(size) > DOCUMENT_MAX_BYTES) {
    return { status: "error", message: "El PDF supera los 20 MB." };
  }

  const key = documentKey(randomUUID(), fileName);

  return {
    status: "ok",
    uploadUrl: await createUploadUrl(key, DOCUMENT_CONTENT_TYPE),
    key,
  };
}

/** Comprueba que el PDF llegó al bucket, lo anota y devuelve su URL. */
export async function confirmDocumentUploadAction({ key, fileName }) {
  const user = await requireUser();

  // La clave tiene que ser una de las que emitimos. Sin esto, esto sería una
  // forma de registrar —y con `too_large`, de borrar— cualquier objeto del bucket.
  if (typeof key !== "string" || !key.startsWith("docs/")) {
    return { status: "error", message: "Referencia de archivo inválida." };
  }

  const result = await confirmUploadedDocument({ key, fileName, actorId: user.id });

  if (!result.ok) {
    return {
      status: "error",
      message:
        result.error === "too_large"
          ? "El PDF supera los 20 MB."
          : "El archivo no llegó al bucket. Intenta de nuevo.",
    };
  }

  return { status: "ok", url: result.url, bytes: result.bytes };
}

/**
 * El camino local para un PDF: se escribe en disco, como las imágenes.
 *
 * Sigue el mismo límite de 4 MB que las imágenes locales y no los 20 MB de R2,
 * porque acá el archivo **sí** pasa entero por el servidor y por el cuerpo de
 * un Server Action. Es una diferencia real entre los dos despliegues, y está
 * puesta a propósito en vez de dejar que un cuerpo de 20 MB se estrelle contra
 * el límite por defecto de Next y devuelva un error que no explica nada.
 */
export async function uploadDocumentAction(formData) {
  await requireUser();

  const file = formData.get("file");
  if (!file || typeof file === "string" || file.size === 0) {
    return { status: "error", message: "No se recibió ningún archivo." };
  }

  if (file.type !== DOCUMENT_CONTENT_TYPE) {
    return { status: "error", message: "La ficha técnica tiene que ser un archivo PDF." };
  }

  if (file.size > MAX_LOCAL_BYTES) {
    return { status: "error", message: "El PDF supera los 4 MB." };
  }

  /*
   * Lo aleatorio va en la carpeta y el nombre queda limpio.
   *
   * Con las imágenes da igual —nadie lee el nombre de un archivo que se muestra
   * como foto— pero acá el nombre **se muestra**: es lo que dice la tarjeta de
   * la ficha en la página del producto, y es lo que aparece en la carpeta de
   * descargas del cliente. `ms fi7ypp-bd5b15f9d35f-ficha.pdf` no le dice nada a
   * nadie. Esto además deja el camino local con la misma forma que el de R2,
   * donde el UUID ya vive en su propio segmento.
   */
  const folder = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
  const name = `${documentSlug(file.name)}.pdf`;

  await mkdir(path.join(UPLOAD_DIR, "docs", folder), { recursive: true });
  await writeFile(
    path.join(UPLOAD_DIR, "docs", folder, name),
    Buffer.from(await file.arrayBuffer()),
  );

  return { status: "ok", url: `/uploads/docs/${folder}/${name}` };
}
