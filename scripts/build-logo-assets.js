import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Produces web-sized logo assets from the originals.
 *
 * The supplied files are print exports — 2000×2000 and 5000×2200, half a
 * megabyte to a megabyte each, with wide transparent margins. Putting one of
 * those in a navbar costs more than the rest of the page combined, and the
 * margins make it impossible to align optically.
 *
 * `trim()` removes the transparent border so the artwork's own edges become the
 * box edges; sizes are 2× the largest rendered size, for retina.
 *
 *   node scripts/build-logo-assets.js
 *
 * The originals stay in the repo as the source of truth.
 */

const source = path.join(process.cwd(), "public", "image");
const out = path.join(process.cwd(), "public", "brand");
/*
 * The favicons go into `app/`, not `public/brand/`.
 *
 * Next's file conventions pick up `app/icon.png` and `app/apple-icon.png` on
 * their own and emit the `<link rel>` tags, fingerprinted. Putting them in
 * `public/` instead would mean writing those tags by hand and serving them
 * uncached-busted, for no gain.
 */
const appDir = path.join(process.cwd(), "app");

await mkdir(out, { recursive: true });

const assets = [
  {
    from: "rutacorp-logo.png",
    to: "wordmark.png",
    height: 320,
    note: "bubble + RutaCorp + tagline, on white",
  },
  /*
   * There is no light wordmark asset.
   *
   * The client's lockup arrives on an opaque white background, which cannot sit
   * inside the navy footer without showing as a box. The footer instead pairs
   * the transparent bubble mark with the name typeset live in Poppins — heavy
   * "Ruta", light "Corp", the same weight contrast the lockup draws — which
   * stays crisp at any size and weighs nothing.
   *
   * `rutacorp-isotipo.png` is the bubble cut out of the client's JPEG along a
   * circle fitted to its rim: transparent outside, no drop shadow. The shadow
   * was baked onto white and would read as a grey smudge on any other colour.
   */
  {
    from: "rutacorp-isotipo.png",
    to: "mark.png",
    // The bubble alone: favicon, WhatsApp button, loading states.
    height: 256,
    note: "bubble mark only",
  },
  /*
   * The tab icon.
   *
   * Square and transparent, not padded onto a white card: the bubble already
   * carries its own white rim, so it holds its shape on a light tab strip and
   * on a dark one, which a white card would not.
   *
   * `fit: "contain"` because `trim()` leaves the artwork's own bounding box,
   * which is a hair off square — resizing to 64×64 without it would stretch
   * the bubble into an egg at the one size where the distortion is most
   * visible.
   */
  {
    from: "rutacorp-isotipo.png",
    to: "icon.png",
    dir: appDir,
    height: 64,
    square: true,
    note: "browser tab",
  },
  {
    from: "rutacorp-isotipo.png",
    to: "apple-icon.png",
    dir: appDir,
    // 180 is what iOS asks for; anything smaller is upscaled on the home screen.
    height: 180,
    square: true,
    note: "iOS home screen",
  },
];

for (const asset of assets) {
  const pipeline = sharp(path.join(source, asset.from)).trim();

  pipeline.resize(
    asset.square
      ? {
          width: asset.height,
          height: asset.height,
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        }
      : { height: asset.height, withoutEnlargement: true },
  );

  const info = await pipeline
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(asset.dir ?? out, asset.to));

  console.log(
    `${asset.to.padEnd(20)} ${String(info.width)}×${String(info.height)}  ${(info.size / 1024).toFixed(1)} KB  — ${asset.note}`,
  );
}

/*
 * The share card.
 *
 * WhatsApp is how this shop actually sells, so a pasted link is seen far more
 * often than a search result is — and without an `og:image` it previews as a
 * bare grey rectangle.
 *
 * Composed here rather than with Next's `ImageResponse`, which renders per
 * request and would need the brand fonts fetched and embedded to do it. This is
 * one flat file that never changes; generating it at request time would be
 * paying forever for a decision made once.
 *
 * 1200×630 is the size every platform crops from.
 */
const OG = { width: 1200, height: 630 };

/*
 * The client's lockup on its own white, centred. It is a finished piece of
 * artwork — bubble, name and tagline — so nothing is typeset over it; the
 * bubble sits on the vertical axis, which is what WhatsApp's square crop keeps.
 */
const lockup = await sharp(path.join(source, "rutacorp-logo.png"))
  .trim({ background: "#ffffff", threshold: 12 })
  .resize({ width: 1000, height: 540, fit: "inside" })
  .toBuffer({ resolveWithObject: true });

const og = await sharp({
  create: { width: OG.width, height: OG.height, channels: 3, background: "#ffffff" },
})
  .composite([
    {
      input: lockup.data,
      left: Math.round((OG.width - lockup.info.width) / 2),
      top: Math.round((OG.height - lockup.info.height) / 2),
    },
  ])
  .png({ compressionLevel: 9 })
  .toFile(path.join(out, "og.png"));

console.log(
  `${"og.png".padEnd(20)} ${String(og.width)}×${String(og.height)}  ${(og.size / 1024).toFixed(1)} KB  — tarjeta para compartir`,
);
