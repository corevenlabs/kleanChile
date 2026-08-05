# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
docker compose up -d   # local Postgres; deployed environments are just a different DATABASE_URL
npm run db:migrate     # apply migrations
npm run db:seed        # load the original site content (--reset wipes first)
npm run dev            # http://localhost:3000

npm run db:generate    # write a migration from schema changes
npm run db:studio      # browse the database
npm run build

npm run admin:create -- --email you@kleanchile.cl --name "Your Name" --owner
```

There is no test runner or linter configured. `npm run build` is the only automated check.

Copy `.env.example` to `.env.local` first; `DATABASE_URL` is the only required variable.

## Architecture

Next.js 15 App Router + React 19, plain JavaScript (no TypeScript), Postgres via Drizzle. UI copy is Spanish; prices are whole Chilean pesos.

### Layers

```
src/domain/      pure logic — content schemas, money. No framework, no database.
src/infra/       adapters: Postgres (schema/queries/mutations), auth
src/actions/     Server Actions. They orchestrate; they do not decide.
src/admin/       the panel
src/components/  storefront UI
src/View/        storefront page-level views
app/             routing only
```

`app/**/page.js` files are thin: load data, hand it to a component in `src/`, and nothing else. Keep that split when adding routes.

Route groups: `app/(public)/` wraps children in `Navbar` + `WhatsAppButton` + `Footer`; `app/admin/` has its own shell; `app/login/` sits outside both so it renders bare.

### All storefront content is editable, and lives in the database

There are two content stores, and the distinction is the main thing to understand:

- **`content_blocks`** — a key/JSONB table, one row per section of the site: `hero`, `bestSellers`, `dualBanner`, `whyUs`, `testimonials`, `brands`, `navigation`, `footer`, `whatsapp`. Every block has a bespoke nested shape, each is read and written whole, and none is ever queried across — so a dozen near-empty relational tables would buy nothing but migrations.
- **`products`** — a real table. Products are rows to be filtered, sorted, hidden and edited individually.

The JSONB looseness stops at `src/domain/content/schemas.js`, which parses every block with Zod on the way in and on the way out. Two rules there:

- **Every field has a default**, so `schema.parse({})` succeeds and a never-saved block degrades to an empty section instead of throwing mid-render.
- **Anything a component uses as a lookup key is an enum** (`whyUs.icon`, `bestSellers.badge`, `dualBanner.position`). Free text there renders a blank icon or an unstyled badge — a bug that ships because nothing errors.

`public/data/*.json` is now **seed input only**. Nothing at runtime reads it. Editing those files changes nothing until `npm run db:seed` runs.

### Adding a section to the home page

1. Add a Zod schema to `src/domain/content/schemas.js` and register it in `contentSchemas`.
2. Describe its form in `src/admin/forms.js` and list the key in `HOME_BLOCKS`.
3. Render it in `src/View/Home/Home.js`.

No new admin component: `BlockEditor` renders any block from its description. Fields are addressed by dotted path (`dropdown.title`), so the form shape need not mirror storage. Lists nest recursively — that is how footer sections hold links and nav links hold dropdown columns.

`BlockEditor` takes `formKey`, not the form object: the descriptions hold functions (`itemTitle`, `normalize`) and a function cannot cross the server/client boundary as a prop.

### The navbar is a product finder

The mega-menu's items are free text an admin types — "Detergentes", "Aspiradoras", "Lámparas". They do **not** correspond to any column: products carry a `type` ("químico", "resma") that was never built to line up with them. Treating an item as a key would mean a migration every time someone edited the menu.

So an item is a **search term scoped to its category**, resolved by `src/domain/catalog/classification.js` against name, type and description, accent- and plural-insensitive:

```
Navbar dropdown item  →  classificationHref()  →  /cleaning/detergentes
                      →  app/(public)/[category]/[classification]
                      →  filterByClassification(products, slug)
```

One dynamic route, not a `[classification]` folder under each of the three category pages. `/carrito/x` reaches it too, since those segments have no children of their own — hence the `CATEGORIES` check, which is the line between the two failure modes: **an unknown category is a 404, an unknown classification is a page that reports finding nothing.** A URL that was never valid and a shelf that is empty today are not the same answer, and the menu is editable, so "no results" is a normal outcome rather than a fault.

`slugify` must stay the single definition of a slug — the navbar (a Client Component) builds the href with it and the route parses the href with it. Two copies drifting by one character breaks every link in the menu.

`View/Category` is the one view behind `/cleaning`, `/bookshop`, `/desktop` and every filtered variant. It owns the page wrapper, the heading and the empty state; `components/Catalog` owns only the filter bar and the grid. The empty state lives at the Category level because only that level knows what to offer instead.

Eight of the seeded menu items currently match nothing — the Librería column ("Novelas", "Ficción", "Outlet") was written for a bookshop, not a stationery supplier. That is visible in the UI rather than hidden, and fixed by editing the menu in `/admin/configuracion`.

### Search

```
navbar <form action="/buscar">  →  /buscar?q=…  →  searchProducts(snapshot, q)
        ↳ typing → GET /api/buscar?q=…  →  six suggestions
```

**The form works before React does.** `SearchBox` renders a real `<form method="get" action="/buscar">` with `name="q"`, so Enter reaches the same URL the router pushes. The suggestions dropdown is an accelerator on top of that, not the mechanism — if the fetch fails, the search still works.

**Results live in a URL**, so a result set can be sent to a colleague or reached with the back button.

`src/domain/catalog/search.js` is pure and ranks rather than filters: name match ≫ type ≫ description, so "no contiene cloro" in a description cannot outrank the bottle of Cloro. Two rules there are load-bearing:

- **Every word must match something**, or adding words widens the result instead of narrowing it.
- **An exact SKU is a lookup, not a search** — it returns that product alone. Customers retype these off a WhatsApp order to reorder, and `KC0000021` has one right answer.

Plural folding is shared with the navbar classifications, deliberately: someone typing "guantes" and someone clicking "Guantes" in the menu are asking the same question. The `z → c` case is the one that is easy to miss — "lápiz" pluralises to "lápices", so without it a shop selling "Set de lápices" returns nothing for the most likely thing a person types.

**It runs in memory over a cached snapshot**, which is a decision with a size attached. At forty-six products it is a fraction of a millisecond and one cache read. Past roughly a thousand it belongs in Postgres — a `tsvector` column with a GIN index, or `pg_trgm` for the fuzzy part. `getSearchableProducts` is the seam: change what it returns and `search.js` stops being the search.

`/api/buscar` is the only route handler in the project. A `GET`, not a Server Action, because actions are POSTs and a keystroke-rate POST is neither cacheable nor idempotent. It returns only the fields a suggestion row draws, and formats the price server-side so the client never needs to know CLP is zero-decimal.

### Orders, stock and the cart

The storefront sells by handing the customer a pre-written WhatsApp message.

```
cart (cookie)  →  requestOrderAction  →  order (pending), stock untouched
               →  /pedido/[token]     →  wa.me link with SKUs, quantities, total
               →  admin confirms      →  stock decremented via the ledger
```

**Placing an order moves no stock.** The customer has only composed a message at that point; a request that never gets sent should not hold units off the shelf. Confirmation is the single moment inventory changes. The cost is that two people can request the last unit and only one confirmation will succeed — which is the right failure, because it surfaces in front of someone who can call the customer.

**Stock is a ledger.** Never write `products.stock_on_hand` directly. Every change goes through `applyMovement` in `mutations/inventory.js`, which writes the balance and an `inventory_movements` row in one statement over a `SELECT … FOR UPDATE` row. The invariant is that a product's deltas sum to its balance; a bare `UPDATE` breaks it silently. A check constraint rejects negative stock regardless of what the application believes.

`confirmOrder` locks every product in the order **in id order** and checks all of them before applying any movement. Both matter: consistent lock ordering avoids deadlock between two confirmations sharing products, and checking up front is what makes failure clean — Drizzle only rolls back when the callback *throws*, so a shortfall returned mid-loop would commit the movements already applied.

**SKU codes** (`KC0000427`) come from the `sku_code_seq` sequence with a Damm check digit. Allocate only through `allocateSkuCode`; inventing one lets two simultaneous creations collide on `products_sku_code_idx`. They are opaque on purpose — a descriptive code becomes a lie the moment a product is renamed.

**Best sellers are derived**, not curated: ranked by units sold across *confirmed* orders, falling back to catalog position while there are no sales. Counting pending orders would let anyone push a product onto the home page by filling a cart. The `bestSellers` content block holds only the heading, link and how many to show.

**The cart is an httpOnly cookie** of `{productId, quantity}` — no names, no prices. Those are read from the database wherever the cart renders and when the order is placed, so the browser never states what something costs. There is no `carts` table because nothing needs one here; add one when abandoned carts must be visible in the admin.

### Visual identity

Everything is derived from the logo in `public/image/`, not invented. `src/styles/brand.css` holds the tokens and states the reasoning; two rules matter when adding UI:

- **There are no neutral greys.** Secondary text is `--k-muted`, a blue-grey. Plain `#888` is what made the old catalog read as a wireframe, and a blanket sweep replaced every one of them.
- **The gradient is spent once per view.** `--k-gradient` (cyan → blue → navy) plus `--k-glow` marks the single primary action on a screen: the active category filter, the cart button, add-to-cart, the hero CTA, the "Más vendido" badge. Putting it on secondary surfaces is what would make it stop meaning anything.

Type has three roles: **Poppins** for display (it matches the wordmark's geometric-rounded letterforms), **IBM Plex Sans** for body, **IBM Plex Mono** for SKU codes only — those are codes customers retype into WhatsApp, so monospace is functional.

`scripts/build-logo-assets.js` regenerates `public/brand/` from the print-resolution originals (467 KB → 14 KB). There is deliberately no light wordmark asset: the supplied dark version has its blue background baked in, so the navbar and footer pair the transparent mark with the name typeset live.

The same script writes the tab icons — `app/icon.png` and `app/apple-icon.png`, which Next discovers by filename and links itself, so `metadata.icons` is deliberately empty. They stay transparent rather than sitting on a white card: the bubble carries its own white rim and so holds its shape on a light tab strip and a dark one. Root `metadata.title` is a template, so a page setting `title: "Limpieza"` gets a tab reading `Limpieza · KleanChile`.

The three category pages share **one** stylesheet, `src/styles/catalog.css`. They previously had one each, all defining `.catalog`, `.chip` and `.product-card` and all loaded globally, so which one applied was decided by import order rather than by page.

**Every stylesheet here is global**, so duplicate selectors across files are resolved by import order in `app/layout.js`. That has already caused three separate bugs: the catalog above; a second complete hero inside `Home.css` that overrode `Banner.css` and painted navy text onto a photograph; and `body { font-family }` declared in `index.css` and `Home.css`, which silently beat the type system and rendered the whole site in the system font. When a rule "does nothing", check whether a later file redefines it before adding `!important`.

The hero renders each line only when it has content. Some banner artwork is a finished poster with its own headline and button; clearing a slide's title and description in the admin leaves the artwork to speak, and the scrim drops to a light tint (`.hero__overlay--bare`). Plain photography — no baked-in text — is what the overlay treatment is designed for.

### Previewing while `npm run dev` runs

`next build` and `next dev` both write to `.next`, so building while a dev server is up deletes the chunks it is still serving — the page renders but every asset 404s, which looks like a CSS bug. Build elsewhere instead:

```bash
NEXT_DIST_DIR=.next-preview npx next build
NEXT_DIST_DIR=.next-preview npx next start -p 3200
```

Note that editing the database directly with SQL does **not** invalidate `unstable_cache`; the storefront will keep serving stale data until the tag is revalidated by an admin action or `.next*/cache` is cleared. **A data migration is SQL too** — after `npm run db:migrate` touches `content_blocks`, a running server keeps serving the old copy, which reads exactly like the migration having failed.

### Bulk import (`/admin/importar`)

CSV and XLSX, mapped to canonical fields. The pipeline mirrors the storefront's layering:

```
parseSpreadsheet   infra/  → { headers, rows }, everything as strings
detectMapping      domain/ → vendor headers → canonical fields, accent-insensitive
buildPlan          domain/ → pure diff; no database access, so preview has no side effects
applyImportPlan    infra/  → one transaction, or nothing
```

**Everything arrives as text.** A spreadsheet's idea of a type is not to be trusted: a SKU stored as a number loses its leading zeros, and Excel will guess a date out of anything. Each field is coerced deliberately in `plan.js` instead.

**Every input row produces exactly one planned row.** Nothing is dropped silently — an unknown SKU is a visible error, not an absence. That is the difference between "40 products updated" and "40 of your 42 rows applied and you never found out about the other two".

Matching is by SKU: blank creates and mints a code, a known SKU updates, an unknown one errors. **Only the columns present in the file are touched**, so a two-column sheet of SKU + price is a safe bulk price update. Stock is an absolute count and goes through `applyMovement`, never written directly — see the inventory rules above.

`buildPlan` is pure and takes the catalog snapshot as an argument, so `scripts/verify-import.js <file>` can dry-run any spreadsheet without a browser, and `--apply` additionally re-checks the ledger invariant.

Adding a field means adding it to `domain/import/fields.js` — that list feeds the mapping UI, the row validator and the downloadable template, and a single source is how they stay in step.

### Caching

Reads go through `unstable_cache` with a tag (`CONTENT_TAG`, `CATALOG_TAG`, `SALES_TAG`) — the Next 15 equivalent of the `use cache` directive, without experimental flags. There is no `revalidate` timer: content changes when someone edits it. Every mutating Server Action calls `revalidateTag`, so the person who saved sees the change immediately.

`SALES_TAG` is separate from `CATALOG_TAG` because they change on different events: editing a product is an admin action, while stock moves on every confirmation. Confirming an order must refresh the home page's ranking without discarding the whole catalog cache.

Anything that mutates content **must** invalidate the matching tag, or the storefront will keep serving the cached copy indefinitely.

**The public routes are dynamic, not prerendered.** The cart count in the navbar reads an `httpOnly` cookie in `app/(public)/layout.js`, and in Next 15 without PPR that makes the whole route render on demand. The alternative — fetching the count from the browser after hydration — keeps the pages static but shows an empty badge on first paint and needs its own refresh path after every add. Page *data* is still cached by tag, so a dynamic render is a render, not a round trip to Postgres.

### Images

```
browser  →  requestImageUploadAction  →  presigned PUT  →  R2 (uploads/tmp/…)
         →  POST /api/admin/media     →  sharp ladder   →  R2 (img/v1/…)
         →  the field holds a URL
```

A spec-sheet PDF takes the same shape with one step fewer — nothing to process, so it lands on its final key straight away and only has to be confirmed:

```
browser  →  requestDocumentUploadAction  →  presigned PUT  →  R2 (docs/v1/<uuid>/<slug>.pdf)
         →  confirmDocumentUploadAction  →  HEAD + media row
         →  the field holds a URL
```

**An image is a URL, and that does not change.** azarwear makes an image a row in `media` that products reference; here the seeded catalog points at supplier URLs, the importer takes a URL column, and the editor lets you paste any link. Changing that would mean migrating the schema, the importer, the seed and every component.

So the URL is made self-describing instead — the original's dimensions live in the path:

```
img/v1/<hash>/<originalW>x<originalH>/<width>.<format>
```

Three properties follow, and they are worth more than the table would be:

- An untouched `<img src={product.image}>` **still works** — what is stored is a real image, not an identifier.
- The full `srcset` is derived **with no database read**, because the original width is the only thing needed to know which renditions exist, and it travels in the URL.
- A supplier URL does not match the pattern, `parseRenditionUrl` returns null, and `Picture` falls back to a plain `<img>`. The two kinds coexist, which is what let this be adopted one component at a time.

**`media` records what is in the bucket; nothing rendered depends on it.** Drop the table and the storefront renders identically. It exists to answer "what did we upload, who uploaded it, why is the bucket 4 GB" — questions the URL cannot. Spec-sheet PDFs are rows in the same table (`kind = 'document'`, dimensions null), because that question does not distinguish between the two and two tables would each answer half of it.

**R2 is optional, as a group.** All five `R2_*` variables or none: `storageConfig()` rejects the half-configured state by name, because that is the one that fails late — uploads appear to work, then fail at presign, or succeed into a bucket whose public URL nobody set. With none of them, uploads write to `public/uploads/` as before, which keeps `npm run dev` working on a bare checkout.

**There is a local bucket.** `docker compose up -d` also starts MinIO on `:9000` with the bucket created and public-read. Point `R2_ENDPOINT` at it (see `docker-compose.yml`) and the whole path runs locally — presigned PUT, CORS preflight, sharp, the database write. That substitution is only possible because `r2.js` speaks plain S3 with no Cloudflare-specific calls, and it is the only way to exercise this without real credentials. `R2_ENDPOINT` also switches the client to path-style addressing, which MinIO needs and R2 accepts.

**`sharp` is reachable only from Route Handlers** — `app/api/admin/media/route.js` and the spec-sheet PDF — and is in `serverExternalPackages`. Never from a page, a component or a Server Action. `imageKeys.js` holds every naming rule with no dependencies at all, precisely so a page can name a rendition without pulling a native binary into its graph. Keep that split.

`PIPELINE_REVISION` is folded into every key. Bump it when widths, formats or quality change — otherwise new settings collide with objects encoded under the old ones and nothing regenerates.

### The spec sheet, in two forms

A product's "Especificaciones" section has two mutually exclusive shapes, and which one a customer sees is decided by one column:

```
products.spec_sheet_url = ""   →  the specs table  +  a PDF generated from it
products.spec_sheet_url = URL  →  a download card for that PDF, and no table
```

**A spec sheet is a URL**, exactly like an image, and for the same reasons: manufacturers publish these documents on their own sites, the importer takes a text column (`Ficha técnica (URL)`), and the editor lets you paste any link. A `media` id would have meant migrating the schema, the importer and the editor to buy nothing.

**The generated PDF is derived, not stored.** `app/(public)/product/[id]/ficha-tecnica` renders it per request from the same tagged cache the product page reads, so editing a spec changes the document with no synchronisation step in between. Storing it would cost an object per product, a regeneration on every typo fix, and an orphan left behind by each one. The seam if this ever costs too much is the route — cache the buffer under `CATALOG_TAG` — not the generator.

That route **redirects** when a PDF has been uploaded, so both ways of asking for the sheet answer the same document. A generated PDF quietly disagreeing with the manufacturer's official one is the failure nobody finds until a customer holds both.

**The two stores coexist on purpose.** Uploading a PDF hides the table; it does not delete it. `product.specs.marca` still feeds the `brand` in the structured data, and removing the PDF brings the table back without anyone retyping it. The admin says so, but only in the state where it matters — when both are filled in.

`pdfkit` is in `serverExternalPackages` for a different reason than `sharp`: it reads its font metrics (`.afm`) off disk from inside its own package at runtime, so a bundler that inlines it ships the code and leaves the data behind — and that fails on the first PDF in production, not at build time.

Two things in `specSheet.js` are load-bearing and both were bugs first:

- **The footer lowers `page.margins.bottom` to zero while it draws.** It writes below the bottom margin, and to pdfkit that is content overflowing — it adds a page, which gets its own footer, which overflows again. A three-page document came out with six.
- **The logo is opened once with `doc.openImage`.** `doc.image(buffer)` re-embeds the bytes per call, so a five-page sheet carried five copies of the mark.

`documentKeys.js` holds the naming rules with no dependencies, mirroring `imageKeys.js`. Document keys are **not** content-addressed the way image keys are: a PDF is stored exactly as it arrived, so hashing it would mean pulling back from the bucket a file the browser just uploaded, to deduplicate a case that barely happens.

**The size limit is checked twice, and the second time is the real one.** A presigned S3 PUT cannot carry a size limit — only POST policies can — so the browser's check is a courtesy and `confirmUploadedDocument` re-measures with a `HEAD` and deletes what is over. The local path caps at 4 MB instead of 20, because there the file really does travel through the Server Action body.

### Metadata, sharing and accessibility

**`NEXT_PUBLIC_SITE_URL` is load-bearing in production.** `src/lib/site.js` holds it, and `metadataBase` in the root layout is built from it. Canonical tags, `og:image`, `og:url` and every URL in the sitemap are absolute; without the variable they all resolve against `http://localhost:3000`, and Next drops `og:image` entirely rather than emitting a relative one. The fallback is deliberately the obvious wrong answer — a production page advertising `localhost` is diagnosable at a glance, a subtly wrong domain is not.

**`app/robots.js` and `app/sitemap.js` are generated, not files.** `public/robots.txt` was Create React App's default and has been deleted; two files serving `/robots.txt` is a conflict, so it could not stay. The sitemap is `force-dynamic`: products arrive through the admin rather than through a deploy, so a version baked at build time starts lying the first time someone adds one. The reads underneath are the same tagged caches the pages use.

**Classifications that match nothing are `noindex, follow`.** They are correct pages for a person who clicked the menu and thin content for a crawler. Reachable, not submitted — and `follow` so the links back into the catalogue still count.

**A missing product is a real 404.** `app/(public)/product/[id]/page.js` calls `notFound()`. It used to render "Producto no encontrado" with a 200, which a crawler indexes as a valid page — so a shop that withdraws products accumulates identical dead results in search.

Structured data lives in `src/domain/seo/structuredData.js`, pure and given everything as arguments, so what the site claims to Google can be checked without a browser. `Product` carries the SKU, the CLP price as a whole number and an availability derived from the ledger balance — never a guess. Nothing is asserted that the site does not know: wrong structured data is a manual penalty, not a ranking boost. `JsonLd` escapes `<` because these payloads carry admin-entered text, and a description containing `</script>` would otherwise close the block and spill JSON into the document.

On the accessibility side, four things are load-bearing and easy to undo by accident:

- **The home page's `<h1>` is visually hidden** (`.sr-only` in `brand.css`). It cannot be the hero's headline: that rotates every few seconds and some slides deliberately carry no text, so the page's one top-level heading would change under the reader or disappear.
- **The hero carousel stops.** WCAG 2.2.2 — content that moves by itself for more than five seconds needs a control. There is a pause button, choosing a slide stops the rotation, and `prefers-reduced-motion` never starts it. The CSS block for reduced motion cannot cancel a `setInterval`, which is why the check is in the component too.
- **Only the active slide is exposed.** All slides sit in the DOM; the inactive ones get `aria-hidden` and an empty `alt`, or a screen reader reads five alt texts as one page.
- **The skip link is the first tab stop** on every public page, and `<main id="contenido">` in `app/(public)/layout.js` is what it skips to. Without it, reaching the products means tabbing past twenty-seven menu items on every page.

### Auth

Ported from the sibling `azarwear` project: scrypt password hashing (`src/infra/auth/password.js`), opaque session tokens stored hashed, `httpOnly` + `sameSite=strict` cookie, per-account lockout after 8 failures.

**Every admin page and every admin Server Action calls `requireUser()` itself.** The check in `app/admin/layout.js` is convenience, not security — a Server Action is its own POST endpoint and can be invoked without the layout ever rendering. When adding an action, guard it.

There is no sign-up route by design. Accounts come from `npm run admin:create`.

## Deliberate decisions

- **Prices are integer Chilean pesos, not cents.** This departs from azarwear's "money is always integer cents" rule because CLP is zero-decimal — there is no centavo to represent. `src/domain/shared/money.js` formats and parses; `parseClp` exists because `Number("2.990")` returns 2.99, which would price a three-thousand-peso product at three pesos.
- **An image is a URL.** Not a media id, not a `MediaRef` — see "Images" below. This is the invariant the importer, the seed and every component depend on.
- **The rate limiter is in-memory** (`src/lib/rateLimit.js`), so its limit multiplies across instances. It exists to stop unauthenticated requests from burning 32 MB of scrypt each, not to stop guessing — the per-account lockout does that.
- **`admin.css` is untouched.** All admin UI composes from the classes already in it.

## Things the migration fixed

Do not be surprised that these no longer match the old JSON:

- **The 8 home-page "best seller" tiles are now catalog products.** They lived only inside the `bestSellers` content block, duplicating names and prices with no description and no identity — so nothing there could be previewed, added to a cart, or counted as sold. They are cleaning products (Fabuloso, Ajax, Axion, Suavitel), which is why `/cleaning` holds 20 rather than 12.
- **Product ids are globally unique.** The three category arrays each restarted at 1, so `/product/1` was ambiguous. One serial primary key ends that, and existing URLs still work.
- **Every product has a detail page.** `product-details.json` held only ids 1–2, so every other product led to "Producto no encontrado". Those two records were the full versions of the first two cleaning products (ids and prices match), so the seed merges them; the rest get their catalog copy and an empty spec sheet, which `ProductDetail` now hides rather than rendering as an empty table.
- **`/bookshop` and `/desktop` link to product pages.** They previously omitted `linkProducts` because those pages did not exist.
- **The WhatsApp number seeds empty.** `site.json` carried the placeholder `"569XXXXXXXX"`, which produced a dead `wa.me` link; the schema rejects it. Set a real number in `/admin/configuracion`.

- **The nav mega-menu resolves.** Its items used to build hrefs like `/cleaning/detergentes` against a route that did not exist — see "The navbar is a product finder" above. `/about` and `/machinery` were removed from `navigation` and `footer` by `drizzle/0003_fix_dead_nav_links.sql`; neither ever had a page.
- **`/contact` renders something.** It was a route whose component returned an empty `<div>`, linked from both the navbar and the footer. It now composes the `footer` and `whatsapp` blocks — the same contact lines, map and number the footer shows, so there is still only one place to edit them.
- **The hero and dual-banner "Maquinaria" buttons go somewhere.** They pointed at `/machinery`, a category that was never built, from inside the `hero` and `dualBanner` blocks — so 0003 missed them and the home page's own call to action 404'd. `drizzle/0004_repoint_machinery_ctas.sql` sends them to `/cleaning/industrial`, where the trolley and the industrial vacuum actually are.

## Create React App leftovers

All removed: `public/index.html`, `public/manifest.json`, `public/favicon.ico`, `public/logo192.png`, `public/logo512.png`, `src/App.css` and `src/logo.svg`. Nothing imported them, and `public/favicon.ico` was the React atom — browsers request that path implicitly, so it would have kept turning up in tabs and link previews alongside the real icon.
