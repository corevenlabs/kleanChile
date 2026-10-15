"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { slugify } from "../domain/catalog/classification.js";
import {
  createCollection,
  deleteCollection,
  moveCollection,
  updateCollection,
} from "../infra/db/mutations/collections.js";
import { CATALOG_TAG } from "../infra/db/queries/catalog.js";
import { CONTENT_TAG } from "../infra/db/queries/content.js";
import { requireUser } from "../lib/adminSession.js";

/** Colecciones. Cada acción se protege sola — ver `lib/adminSession.js`. */

const collectionInput = z.object({
  id: z.number().int().positive().nullish(),
  name: z.string().trim().min(1, "La colección necesita un nombre.").max(80),
  /** Solo se lee al crear; vacío = se arma desde el nombre. */
  slug: z.string().trim().default(""),
  description: z.string().trim().max(600).default(""),
  image: z.string().trim().default(""),
  isActive: z.boolean().default(true),
  productIds: z.array(z.number().int().positive()).max(2000).default([]),
});

const id = z.number().int().positive();

/*
 * Las colecciones invalidan también el contenido: el selector de enlaces del
 * menú y del banner las nombra, y una colección recién creada tiene que
 * aparecer ahí sin esperar a otra cosa.
 */
const refresh = () => {
  revalidateTag(CATALOG_TAG);
  revalidateTag(CONTENT_TAG);
};

export async function saveCollectionAction(input) {
  await requireUser();

  const parsed = collectionInput.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { id: collectionId, slug, image, productIds, ...rest } = parsed.data;
  const row = { ...rest, imageUrl: image };
  const unique = [...new Set(productIds)];

  if (collectionId) {
    await updateCollection(collectionId, row, unique);
    refresh();
    return { status: "ok", id: collectionId };
  }

  const finalSlug = slugify(slug || rest.name);
  if (!finalSlug) {
    return { status: "error", message: "El nombre tiene que tener al menos una letra o número." };
  }

  try {
    const newId = await createCollection({ ...row, slug: finalSlug }, unique);
    refresh();
    return { status: "ok", id: newId };
  } catch (error) {
    const pg = error?.cause ?? error;
    if (pg?.code === "23505") {
      return {
        status: "error",
        message: `Ya existe una colección con la dirección /coleccion/${finalSlug}. Usa otro nombre.`,
      };
    }
    throw error;
  }
}

export async function deleteCollectionAction(collectionId) {
  await requireUser();
  const parsed = id.safeParse(collectionId);
  if (!parsed.success) return { status: "error", message: "Colección inválida." };

  await deleteCollection(parsed.data);
  refresh();
  return { status: "ok" };
}

export async function moveCollectionAction(collectionId, direction) {
  await requireUser();
  const parsed = id.safeParse(collectionId);
  if (!parsed.success) return { status: "error", message: "Colección inválida." };

  await moveCollection(parsed.data, direction < 0 ? -1 : 1);
  refresh();
  return { status: "ok" };
}
