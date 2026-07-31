# KleanChile

Sitio público y panel de administración en una sola aplicación Next.js 15.
Todo el contenido de la portada —carrusel, destacados, banners, testimonios,
razones, marcas, menú, pie de página y WhatsApp— se edita desde el panel y se
guarda en Postgres.

## Puesta en marcha

```bash
cp .env.example .env.local   # DATABASE_URL es lo único obligatorio
npm install
docker compose up -d         # Postgres local
npm run db:migrate
npm run db:seed              # carga el contenido original del sitio
npm run admin:create -- --email tu@kleanchile.cl --name "Tu Nombre" --owner
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El panel está en `/admin` y
el acceso en `/login`, con la contraseña que imprimió `admin:create`.

No hay registro público: las cuentas se crean con ese comando.

## Panel

| Sección | Qué controla |
| --- | --- |
| `/admin/pedidos` | Pedidos: confirmar (descuenta stock) o anular (lo devuelve) |
| `/admin/portada` | Todas las secciones de la página de inicio |
| `/admin/productos` | Catálogo: SKU, stock, precios, imágenes y fichas técnicas |
| `/admin/configuracion` | Menú, pie de página y botón de WhatsApp |

Cada sección se guarda por separado y aparece en el sitio público de inmediato,
sin volver a desplegar.

## Cómo se compra

1. El cliente agrega productos desde la portada (vista rápida), el catálogo o la
   ficha del producto.
2. En `/carrito` revisa el detalle y presiona **Solicitar por WhatsApp**.
3. Se crea un pedido con número de referencia y se abre WhatsApp con el detalle
   ya escrito: producto, SKU, cantidad, subtotal por línea y total.
4. En `/admin/pedidos` se confirma el pedido. Ese es el momento en que se
   descuenta el stock; anular un pedido confirmado lo devuelve.

Los productos más vendidos de la portada se ordenan solos según lo vendido en
pedidos confirmados. No se eligen a mano.

## Producción

```bash
npm run build
npm start
```

Las imágenes subidas se guardan en `public/uploads/`, así que el despliegue
necesita un disco persistente (VPS o contenedor con volumen). En un entorno
serverless conviene usar URLs externas o conectar almacenamiento de objetos en
`src/actions/media.js`.
