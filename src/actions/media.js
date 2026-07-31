"use server";

import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireUser } from "../lib/adminSession.js";

/**
 * Image upload.
 *
 * Files land in `public/uploads/` and the database stores the path. The old
 * admin encoded images as base64 data URLs and kept them in `localStorage`,
 * which meant every product image was inlined into the page that listed it and
 * the whole catalog shared a five-megabyte quota.
 *
 * **This writes to the local filesystem**, so it works in development and on a
 * VPS or container with a persistent volume, but not on a serverless host where
 * the disk is ephemeral and per-instance. Object storage is the seam to add
 * when that matters: only this file and the returned URL would change, because
 * nothing downstream knows where the bytes went. Products can also just be
 * given an external image URL, which is what the seeded catalog uses.
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * The extension comes from the content type, never from the uploaded filename.
 *
 * A browser will happily send `name: "../../../app/page.js"`, and joining that
 * onto a directory is how an upload form becomes a write primitive. The name is
 * discarded entirely — the stored file is named from random bytes.
 */
const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export async function uploadImageAction(formData) {
  await requireUser();

  const file = formData.get("file");
  if (!file || typeof file === "string" || file.size === 0) {
    return { status: "error", message: "No se recibió ninguna imagen." };
  }

  if (file.size > MAX_BYTES) {
    return { status: "error", message: "La imagen supera los 4 MB." };
  }

  const extension = EXTENSIONS[file.type];
  if (!extension) {
    return { status: "error", message: "Formato no admitido. Usa JPG, PNG, WebP o AVIF." };
  }

  const name = `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.${extension}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));

  return { status: "ok", url: `/uploads/${name}` };
}
