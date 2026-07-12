# KleanChile

Aplicación web migrada a Next.js 15 con App Router. Incluye el sitio público y
el panel administrativo de demostración.

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). El acceso del panel está en
`/login` y acepta cualquier correo y contraseña no vacíos. Mientras no exista
una API, los cambios del panel se conservan en `localStorage`.

## Producción

```bash
npm run build
npm start
```
