import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { storageConfig } from "../../env.js";

/**
 * Almacenamiento de objetos.
 *
 * Cloudflare R2 por su API compatible con S3. Deliberadamente sin SDK
 * específico de Cloudflare: todas las llamadas de acá son S3 estándar, así que
 * mudarse a AWS, Backblaze, MinIO o un bucket propio es cambiar endpoint y
 * credenciales, nada más.
 *
 * R2 por una razón sobre todas: no cobra egreso. Para un catálogo que es sobre
 * todo fotos, esa es la diferencia entre una cuenta previsible y una que sube
 * con cada visita.
 */

let cached = null;

function client() {
  if (cached) return cached;

  const cfg = storageConfig();
  if (!cfg) {
    // Nunca debería llegar acá: quien llama pregunta primero por
    // `storageConfigured()`. Si pasa, un mensaje que nombra la causa vale más
    // que un `undefined` reventando dentro del SDK.
    throw new Error("R2 no está configurado — faltan las variables R2_*.");
  }

  cached = new S3Client({
    // R2 no está particionado por región como S3; "auto" es lo que espera.
    region: "auto",
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });

  return cached;
}

const bucket = () => storageConfig().bucket;

/**
 * La URL pública de un objeto.
 *
 * Derivada y no guardada, para que apuntar el CDN a otro dominio no obligue a
 * reescribir cada `image_url` del catálogo.
 */
export function publicUrl(key) {
  const cfg = storageConfig();
  return `${cfg.cdnUrl.replace(/\/+$/, "")}/${key}`;
}

export async function uploadObject({
  key,
  body,
  contentType,
  // Las claves están direccionadas por contenido: el objeto en una clave dada
  // nunca cambia, así que se puede cachear para siempre.
  cacheControl = "public, max-age=31536000, immutable",
}) {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );

  return key;
}

export async function deleteObject(key) {
  await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

/**
 * Trae los bytes de un objeto a memoria.
 *
 * Lo usa la ruta de procesamiento para recuperar el original que el navegador
 * subió directo al bucket, y pasarlo por `sharp`. Solo se llama con claves que
 * el propio admin acaba de escribir, nunca con entrada libre.
 */
export async function getObjectBytes(key) {
  const response = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!response.Body) throw new Error(`Objeto vacío en ${key}`);

  return Buffer.from(await response.Body.transformToByteArray());
}

export async function objectExists(key) {
  try {
    await client().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return true;
  } catch {
    // HeadObject lanza en 404 en vez de devolver algo falsy.
    return false;
  }
}

/**
 * Una URL de vida corta a la que el navegador puede hacer PUT directo.
 *
 * Las subidas del panel se saltan el servidor por completo: una foto de 12 MB
 * nunca pasa por una función serverless, lo que las mantiene rápidas y bien
 * lejos de los límites de tamaño y duración de una petición.
 */
export function createUploadUrl(key, contentType, expiresIn = 600) {
  return getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
    { expiresIn },
  );
}
