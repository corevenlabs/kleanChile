# Puesta en producción — KleanChile

Checklist ordenado para llevar la tienda a producción. Los pasos dependen del
anterior; márcalos a medida que avanzas.

Sigue la misma metodología que el proyecto hermano *azarwear* (**Vercel** +
**Neon** + dominio en **Cloudflare DNS**), con **una diferencia que decide el
host** y que conviene leer antes de empezar.

---

## 0. Imágenes: R2, o disco local

Hay dos caminos y el código elige solo, según estén o no las variables `R2_*`.

**Con R2** (lo recomendado, y lo que hace azarwear) el navegador sube el
original directo al bucket con una URL firmada, y el servidor lo convierte en un
escalón AVIF/WebP de hasta cinco anchos. El archivo nunca pasa por una función
serverless.

**Sin ellas** los archivos se escriben en `public/uploads/` y los sirve
`app/uploads/[...path]/route.js`. Sirve en desarrollo y en un VPS o contenedor
con volumen, **pero no en Vercel**: cada instancia tiene disco efímero, así que
una foto subida desde el panel desaparece en el siguiente despliegue y queda un
producto apuntando a un 404.

> La ruta existe porque Next fija el contenido de `public/` al momento del
> build: un archivo escrito ahí después **no lo sirve `next start`**, aunque sí
> `next dev`. Sin ella, subir una imagen funcionaba en desarrollo y daba 404 en
> cualquier build de producción.

En los dos casos el campo guarda **una URL**, así que un producto con foto
subida y uno con enlace de proveedor son la misma clase de cosa. Eso es lo que
permite que el importador siga tomando una columna de URL sin saber nada de
esto.

> Si despliegas en Vercel: configura R2 (paso 3) o acepta que el botón de subir
> archivo no sirve y todas las imágenes entran como URL externa.

---

## 1. Base de datos (Neon, o el Postgres que uses)

- [ ] Crea el proyecto/branch de producción.
- [ ] Copia el connection string **pooled**, con `?sslmode=require`.
- [ ] Aplica las migraciones contra esa base:
      `DATABASE_URL="<prod>" npm run db:migrate`
- [ ] **No corras `db:seed` en producción.** Carga el catálogo real por
      `/admin/productos` o en lote por `/admin/importar`.

Si de todos modos siembras para tener el contenido de portada, recuerda que el
seed trae 46 productos de ejemplo y que `--reset` borra todo antes.

## 2. Variables de entorno

`src/env.js` las valida al arrancar: una faltante o mal formada rompe con un
mensaje claro, no con un `undefined` tres capas más abajo.

| Variable | Valor en producción |
|---|---|
| `DATABASE_URL` | El string pooled de Postgres. |
| `NEXT_PUBLIC_SITE_URL` | **El dominio real**, p. ej. `https://kleanchile.cl`. Sin barra final. |
| `R2_ACCOUNT_ID` | Account ID de Cloudflare. |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | El par de llaves S3 del bucket. |
| `R2_BUCKET` | `kleanchile` |
| `NEXT_PUBLIC_CDN_URL` | `https://cdn.kleanchile.cl` |
| `PREVIEW_PASSWORD` | **Temporal.** Ver el paso 5b. Bórrala para abrir el sitio. |

Las cinco de R2 son **todas o ninguna**: `storageConfig()` en `src/env.js`
rechaza el estado intermedio nombrando las que faltan. Medio configurado es el
estado peligroso — las subidas parecerían funcionar y después fallarían al
firmar, o peor, escribirían en un bucket cuya URL pública nadie definió, y las
fotos quedarían guardadas e inalcanzables.

No hay `AUTH_SECRET`: las sesiones son tokens opacos guardados con hash en la
base, no JWT firmados. Tampoco Resend ni cron.

> **`NEXT_PUBLIC_SITE_URL` es la que más se olvida.** Alimenta `sitemap.xml`,
> `robots.txt`, las URLs canónicas y las imágenes de Open Graph. Si queda en
> `localhost`, eso es lo que Google indexa y lo que WhatsApp intenta cargar al
> previsualizar un enlace. El fallback es `http://localhost:3000` a propósito:
> se detecta de un vistazo, un dominio mal escrito no.

## 3. R2 (imágenes, fichas técnicas y CORS)

- [ ] Bucket creado, con dominio público `cdn.kleanchile.cl`
      (Cloudflare → R2 → bucket → Settings → Custom Domains).
- [ ] **CORS.** La subida del panel hace un PUT firmado desde el navegador
      directo al bucket, así que R2 tiene que permitir el dominio de producción.
      Es el paso que más se olvida, y falla **solo en producción y solo desde el
      navegador** — nunca al probar desde la consola. En Cloudflare → R2 →
      bucket → Settings → CORS Policy:
      ```json
      [{
        "AllowedOrigins": ["https://kleanchile.cl", "https://www.kleanchile.cl"],
        "AllowedMethods": ["PUT", "GET"],
        "AllowedHeaders": ["content-type"],
        "MaxAgeSeconds": 3600
      }]
      ```
      La misma política cubre las fichas técnicas en PDF: van por un PUT
      firmado idéntico, solo que a `docs/v1/…` y con `application/pdf`.
- [ ] Compruébalo:
      `npm run media:verify -- --r2 --cors https://kleanchile.cl`
      Sube un objeto de prueba bajo `uploads/tmp/verify-`, lo lee, hace el
      preflight de CORS contra ese origen y lo borra. Es seguro contra el bucket
      de producción.

> **Antes de tener el bucket real** puedes correr todo esto contra el MinIO que
> levanta `docker compose up -d`: mismo protocolo S3, mismas URLs firmadas,
> mismo preflight. Las variables están en `docker-compose.yml`.
>
> Con MinIO usa `npm run dev`, no un build de producción. La CSP se calcula
> **en el build**, y `R2_ENDPOINT` —que es lo que apunta al bucket local— solo
> existe ahí. Un `next build` hecho sin esa variable deja el bucket local fuera
> de `connect-src`, y la subida falla con un error de CSP que no tiene nada que
> ver con el bucket. En producción no aplica: `R2_ENDPOINT` no se usa y la
> política lleva el comodín de R2.

## 4. Dominio y DNS

- [ ] Apex y `www` apuntando al host (los registros que indique Vercel al añadir
      el dominio, o la IP del VPS).
- [ ] HTTPS activo antes de abrir el sitio: la cookie de sesión del admin es
      `sameSite=strict` + `httpOnly`, y sobre HTTP la contraseña viaja en claro.

## 5. Despliegue

- [ ] Conecta el repo. Framework: Next.js (autodetectado).
- [ ] `sharp` y `pdfkit` están en `serverExternalPackages` (`next.config.js`).
      `sharp` es un binario nativo que el bundler no puede empaquetar; `pdfkit`
      lee sus métricas de fuente del disco en tiempo de ejecución, y empaquetado
      se queda sin ellas — falla al generar el primer PDF, no en el build.
      Vercel soporta los dos sin más configuración.
- [ ] Revisa el log del primer build: debe compilar limpio. El CI
      (`.github/workflows/ci.yml`) corre el mismo build en cada push a `main`.
- [ ] No hace falta `vercel.json`: no hay cron ni rutas con configuración
      especial. Si el proyecto de Neon está en una región lejana a la de las
      funciones, ahí es donde se ajusta (`"regions"`) — cada consulta paga ese
      viaje, y el panel hace varias por página.

## 5a. Cabeceras de seguridad

Van en `next.config.js` como cabeceras estáticas de respuesta, no por
middleware: un nonce por petición obligaría a que cada respuesta fuera dinámica,
y acá no se carga un solo script de terceros que lo justifique.

Cuatro permisos de la CSP son deliberados y conviene conocerlos antes de
apretarlos:

- **`img-src` acepta cualquier `https:`.** Es la directiva que no se puede
  cerrar sin romper el proyecto: *una imagen es una URL*, el catálogo apunta a
  fotos de proveedores y el importador toma una columna de enlaces. Limitarla al
  CDN dejaría media tienda en blanco. Una `<img>` no ejecuta nada, así que lo
  peor que logra un enlace hostil es no cargar.
- **`frame-src` permite Google Maps**, que es el mapa del pie y de contacto. Si
  algún día se cambia el `embedUrl` por otro proveedor, hay que agregarlo acá; el
  síntoma es un recuadro en blanco.
- **`connect-src` permite el bucket**, porque la subida hace PUT directo desde
  el navegador. Sin eso la CSP rompería justo lo que protege.
- **`'unsafe-inline'`** en scripts y estilos: Next inserta su arranque de
  hidratación en línea y nosotros emitimos JSON-LD. Sin nonce no hay forma de
  distinguirlos de una inyección; lo que lo hace tolerable es que todo el HTML
  sale del servidor desde datos propios.

## 5b. Vista previa privada (mientras el cliente revisa)

Para que el cliente vea el sitio y el público no, sin sacarlo de línea:

- [ ] En Vercel → Settings → Environment Variables, añade **`PREVIEW_PASSWORD`**
      (y opcionalmente `PREVIEW_USER`; por defecto es `kleanchile`). Ámbito:
      **Production**.
- [ ] **Vuelve a desplegar.** Vercel solo aplica variables nuevas en un
      despliegue nuevo.
- [ ] Entra al dominio: el navegador pedirá usuario y contraseña. Eso es lo que
      le pasas al cliente.

**Para abrirlo al público: borra `PREVIEW_PASSWORD` y vuelve a desplegar.** No
hay código que revertir ni rama que fusionar — `middleware.js` sale por la
primera línea cuando la variable no está.

Detalles que conviene saber:

- Mientras la cortina esté puesta **Google no indexa nada**: todo responde 401,
  incluido `/robots.txt` y el `sitemap.xml`. Eso es exactamente lo que quieres
  antes de lanzar.
- **`/api` también queda detrás**, a diferencia de azarwear. Allá se exceptúa
  porque el cron de Vercel se autentica con `Authorization: Bearer` y esa
  cabecera admite un solo esquema. Acá no hay cron, y dejar `/api/buscar`
  abierto entregaría el catálogo entero —nombres y precios— mientras el sitio se
  supone privado. El buscador sigue funcionando para quien ya pasó la cortina.
- El panel sigue pidiendo su propio login. Esto es una cortina, no reemplaza la
  autorización real: `requireUser()` sigue en cada página y cada Server Action.
- Es autenticación básica sobre HTTPS: la contraseña viaja cifrada pero queda
  guardada en el navegador del cliente. No reutilices una que uses en otro lado.

## 6. Datos iniciales

- [ ] Crea la cuenta dueña:
      `DATABASE_URL="<prod>" npm run admin:create -- --email tu@kleanchile.cl --name "Tu Nombre" --owner`
      Imprime la contraseña **una sola vez**; guárdala en un gestor. No hay ruta
      de registro por diseño: esta es la única puerta.
- [ ] Borra la cuenta de prueba si la creaste en desarrollo.
- [ ] En `/admin/configuracion`, pon el **número de WhatsApp real**. Se siembra
      vacío a propósito porque el JSON original traía un marcador
      (`569XXXXXXXX`) que producía un `wa.me` muerto, y el schema lo rechaza.
      Sin número, el botón flotante y el de la página de contacto no aparecen.
- [ ] Revisa el menú de navegación. Ocho de las clasificaciones sembradas no
      encuentran productos (la columna de Librería está escrita para una librería
      de libros, no para una distribuidora de útiles). Se ven vacías en el sitio
      hasta que edites el menú o cargues esos productos.
- [ ] Carga el catálogo real. El importador acepta CSV y XLSX; la vista previa no
      escribe nada, así que puedes revisarla sin miedo.

## 7. Verificación post-deploy

> Si dejaste puesta la cortina del paso 5b, quítala antes de esta sección o
> haz cada comprobación con `-u usuario:contraseña` — si no, todo responde 401
> y no estarás midiendo nada.

- [ ] Cabeceras de seguridad presentes:
      `curl -sI https://<dominio> | grep -i "content-security\|strict-transport"`
- [ ] Abre la consola del navegador en la portada y en una ficha de producto:
      **cero violaciones de CSP**. Es donde aparecería un recurso que la política
      dejó fuera, y se ve como una sección vacía sin ningún error de servidor.
- [ ] `https://<dominio>/sitemap.xml` lista el dominio real, no localhost.
- [ ] `https://<dominio>/robots.txt` apunta al sitemap y bloquea `/admin`,
      `/api`, `/carrito`, `/pedido`.
- [ ] Pega el enlace del sitio en un chat de WhatsApp: debe salir la tarjeta con
      logo, título y descripción. Si sale el enlace pelado, `NEXT_PUBLIC_SITE_URL`
      está mal.
- [ ] `/admin` sin sesión redirige a `/login`.
- [ ] **Un pedido de prueba completo**: agrega al carrito, pide por WhatsApp,
      confírmalo en `/admin/pedidos` y verifica que el stock bajó. Después anúlalo
      —anular devuelve el stock— o déjalo marcado.
- [ ] Ajusta el stock de un producto desde el editor y confirma que la columna de
      la lista cambió.
- [ ] **Sube una foto desde el panel.** Es la prueba real del CORS de R2, y el
      campo debe quedar con una URL de `cdn.` — no con una ruta `/uploads/`. Si
      quedó `/uploads/`, R2 no está configurado y esa foto se va a perder.

---

## Comprobación de la invariante de inventario

El saldo de cada producto tiene que ser igual a la suma de sus movimientos. Es
la única invariante que, si se rompe, lo hace en silencio:

```sql
select count(*) from products p
left join (select product_id, sum(delta) s from inventory_movements group by product_id) m
  on m.product_id = p.id
where coalesce(m.s, 0) <> p.stock_on_hand;
```

Debe dar `0`. `scripts/verify-import.js <archivo> --apply` la revisa sola después
de aplicar una importación.

## Lo que sigue siendo aproximado

- **El limitador de peticiones es en memoria** (`src/lib/rateLimit.js`), así que
  su límite se multiplica por instancia. Existe para que peticiones no
  autenticadas no quemen 32 MB de scrypt cada una, no para frenar adivinación:
  de eso se encarga el bloqueo por cuenta a los 8 intentos. La defensa de borde
  real es una regla de Cloudflare.
- **La búsqueda corre en memoria** sobre el catálogo cacheado. Con 46 productos
  es una fracción de milisegundo; pasando los ~1000 hay que moverla a Postgres
  (`tsvector` + GIN). La costura es `getSearchableProducts`.
- **No hay carga masiva de imágenes por ZIP**: el importador toma una columna de
  URL, y las fotos se suben de a una en el editor.
- **Las imágenes externas no pasan por el pipeline.** Una URL de proveedor se
  sirve tal cual, sin renditions y sin `srcset`: el escalón solo aplica a lo que
  se sube por el panel. Ingerir URLs externas al subirlas sería el siguiente
  paso, y `ingestUploadedImage` ya hace casi todo lo necesario.
- **No hay limpieza de huérfanos.** La tabla `media` registra qué se subió, así
  que se puede escribir un `media:purge`, pero no existe: una foto reemplazada
  por otra sigue ocupando espacio en el bucket.
- **No hay forma de deshacer una importación** desde el panel. El lote y los
  valores anteriores de cada fila quedan guardados, así que la información para
  revertir existe; el botón no.
