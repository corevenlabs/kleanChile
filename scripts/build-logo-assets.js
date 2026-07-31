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
    from: "LOGO KLEAN CHILE-02.png",
    to: "wordmark.png",
    // Rendered at ~46px tall in the navbar and ~64px in the footer.
    height: 160,
    note: "stacked mark + KleanChile + tagline, for light backgrounds",
  },
  /*
   * There is no light wordmark asset.
   *
   * `LOGO KLEAN CHILE-03.png` is the white artwork on a baked-in blue gradient
   * rectangle, which cannot sit inside the navy footer without showing as a
   * box. The footer instead pairs the transparent bubble mark with the wordmark
   * typeset live in Poppins — heavy "Klean", light "Chile", the same weight
   * contrast the original draws — which stays crisp at any size and weighs
   * nothing.
   */
  {
    from: "LOGO KLEAN CHILE-01.png",
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
    from: "LOGO KLEAN CHILE-01.png",
    to: "icon.png",
    dir: appDir,
    height: 64,
    square: true,
    note: "browser tab",
  },
  {
    from: "LOGO KLEAN CHILE-01.png",
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
 * 1200×630 is the size every platform crops from. The mark sits left of centre
 * so WhatsApp's own square crop, which takes the middle, still contains it.
 */
const OG = { width: 1200, height: 630 };

const background = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${String(OG.width)}" height="${String(OG.height)}">
     <defs>
       <linearGradient id="k" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0%" stop-color="#22c2e8"/>
         <stop offset="52%" stop-color="#1668b8"/>
         <stop offset="100%" stop-color="#0e2a6b"/>
       </linearGradient>
     </defs>
     <rect width="100%" height="100%" fill="url(#k)"/>
     <text x="440" y="322" font-family="Poppins, Trebuchet MS, sans-serif" font-size="82"
           font-weight="800" fill="#ffffff">KleanChile</text>
     <text x="444" y="382" font-family="IBM Plex Sans, Segoe UI, sans-serif" font-size="27"
           fill="#a9e8f7">Limpieza · Librería · Escritorio</text>
     <text x="444" y="424" font-family="IBM Plex Sans, Segoe UI, sans-serif" font-size="27"
           fill="#a9e8f7">Despacho a todo Chile</text>
   </svg>`,
);

const badge = await sharp(path.join(source, "LOGO KLEAN CHILE-01.png"))
  .trim()
  .resize({ width: 260, height: 260, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

const og = await sharp(background)
  .composite([{ input: badge, left: 140, top: 185 }])
  .png({ compressionLevel: 9 })
  .toFile(path.join(out, "og.png"));

console.log(
  `${"og.png".padEnd(20)} ${String(og.width)}×${String(og.height)}  ${(og.size / 1024).toFixed(1)} KB  — tarjeta para compartir`,
);
