# Puesta en producción — KleanChile

Checklist ordenado para llevar la tienda a producción. Los pasos dependen del
anterior; márcalos a medida que avanzas.

Sigue la misma metodología que el proyecto hermano *azarwear* (**Vercel** +
**Neon** + dominio en **Cloudflare DNS**), con **una diferencia que decide el
host** y que conviene leer antes de empezar.

---

## 0. La decisión que hay que tomar primero: dónde viven las imágenes

`src/actions/media.js` guarda los archivos subidos en `public/uploads/` y
almacena la ruta en la base. Eso funciona en desarrollo y en un VPS o contenedor
con volumen, **pero no en Vercel**: cada instancia serverless tiene su propio
disco efímero, así que una foto subida desde el panel desaparece en el siguiente
despliegue —o antes— y queda un producto apuntando a un 404.

Tres salidas, en orden de esfuerzo:

1. **Solo URLs externas.** El catálogo sembrado ya funciona así, y el importador
   toma una columna de URL. Si el cliente aloja sus fotos en otro lado, Vercel
   sirve tal cual y no hay nada que hacer. El botón de subir archivo del panel
   **hay que quitarlo o desactivarlo**, o alguien lo va a usar.
2. **Object storage** (Cloudflare R2, S3). Es la costura prevista: cambia
   únicamente `src/actions/media.js` y todo lo demás sigue igual, porque el
   resto del sistema solo conoce «la imagen es una URL». Es lo que hace azarwear.
3. **Un VPS o contenedor con volumen** (Railway, Fly, Hetzner + Docker). El
   código no cambia: `docker-compose.yml` ya levanta el Postgres y `public/uploads`
   se monta como volumen.

> Elige antes del paso 4. Cambiar de host después es rehacer DNS y variables.

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

Son solo dos. Este proyecto no usa R2, ni Resend, ni cron, ni `AUTH_SECRET`
—las sesiones son tokens opacos guardados con hash en la base, no JWT firmados.

> **`NEXT_PUBLIC_SITE_URL` es la que más se olvida.** Alimenta `sitemap.xml`,
> `robots.txt`, las URLs canónicas y las imágenes de Open Graph. Si queda en
> `localhost`, eso es lo que Google indexa y lo que WhatsApp intenta cargar al
> previsualizar un enlace. El fallback es `http://localhost:3000` a propósito:
> se detecta de un vistazo, un dominio mal escrito no.

## 3. Dominio y DNS

- [ ] Apex y `www` apuntando al host (los registros que indique Vercel al añadir
      el dominio, o la IP del VPS).
- [ ] HTTPS activo antes de abrir el sitio: la cookie de sesión del admin es
      `sameSite=strict` + `httpOnly`, y sobre HTTP la contraseña viaja en claro.

## 4. Despliegue

- [ ] Conecta el repo. Framework: Next.js (autodetectado).
- [ ] `sharp` solo se usa en `scripts/build-logo-assets.js`, que se corre a mano
      —no en el build— así que no hace falta configurarlo en el host.
- [ ] Revisa el log del primer build: debe compilar limpio. El CI
      (`.github/workflows/ci.yml`) corre el mismo build en cada push a `main`.

## 5. Datos iniciales

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

## 6. Verificación post-deploy

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
- [ ] Si elegiste la opción 2 o 3 del paso 0: sube una foto desde el panel y
      recarga a los cinco minutos para confirmar que sigue ahí.

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
- **No hay forma de deshacer una importación** desde el panel. El lote y los
  valores anteriores de cada fila quedan guardados, así que la información para
  revertir existe; el botón no.
