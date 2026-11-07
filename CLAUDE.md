# Tu Rinconcito Navideño: guía para cualquier sesión de Claude

Sitio estático de una sola página para vender adornos navideños artesanales en el puerto de
Veracruz. Fachada de e-commerce con carrito, pero el "pago" es abrir WhatsApp con el pedido
escrito. Se publica en Cloudflare (Workers con archivos estáticos) conectado a la rama `main`,
en https://turinconcitonavideno.com; GitHub Pages queda solo como respaldo. Dueño: usuario principiante en GitHub; explicar en español, con pasos simples.

## Reglas del negocio (no cambiar sin que el dueño lo pida)

- Sin backend, sin base de datos, sin pagos en línea, sin frameworks. HTML + CSS + JS puro.
- Todo pedido termina en `https://wa.me/522291433176?text=...` con el mensaje armado.
  Los mensajes usan `*negritas*` de WhatsApp en nombre de producto, precio, total y etiquetas.
- No hay envío a domicilio: cuatro puntos de entrega (Divertiplaza, Soriana Hiper Los Pinos,
  KMG Élite Boca del Río, Walmart Boca del Río). El cliente elige uno; el más cercano se sugiere
  con el mapa.
- Nunca mostrar horarios de entrega: se acuerdan por WhatsApp con cada cliente.
- Piezas únicas: solo hay una de cada producto (`TIENDA.maximoPorProducto = 1`). No hay
  selector de cantidad. Las tres cajas de esferas se venden como media docena ($800), caja
  completa ($1,400) o caja combinada 6 + 6 con otro diseño ($1,500). Las piñatas van aparte.
- Videos siempre sin audio y en silencio; foto principal, al deslizar el video, luego más fotos.
- Los precios y datos viven solo en `js/productos.js`. Textos SEO y Open Graph en `index.html`.

## Dónde está cada cosa

- `index.html`: estructura, SEO, Open Graph, datos estructurados. El dominio real es
  https://turinconcitonavideno.com (canonical, og:url, sitemap y robots ya lo usan).
- `js/productos.js`: bloque `TIENDA` (nombre, WhatsApp, puntos de entrega con coordenadas,
  mensajes) y lista `PRODUCTOS`. Es el único archivo que el dueño edita.
- `js/app.js`: catálogo, ficha con galería, carrito, mensajes de WhatsApp, mapa.
- `css/estilos.css`: estilos. Colores y tipografía en `:root` (rojo profundo, verde pino, dorado,
  crema; títulos en Fraunces desde Google Fonts, cuerpo en fuente del sistema). La portada es una
  escena por capas: esferas colgando de hilos dorados a la izquierda y el gnomo a la derecha, con
  una sola animación de entrada (balanceo). Las posiciones viven en `.escena__colgante--N`.
- `img/portada/`: recortes con transparencia hechos a partir de las fotos de producto (gnomo en
  dos tamaños y tres esferas en círculo). `img/og.png` (1200x630) es la vista previa al compartir;
  se generó con esos mismos recortes. Si cambia el nombre de la tienda hay que regenerarla.
- `js/vendor/leaflet/`: librería del mapa (OpenStreetMap, sin llaves). No usar Google Maps API.
- `img/productos/<id>/`: fotos WebP (1200 px y miniatura 600 px) y `video.mp4` cuadrado de
  720 px, máximo 15 s. Se generan con `tools/optimizar.js` desde las fotos originales, que no
  están en el repositorio.
- `_headers`: cabeceras de seguridad para Cloudflare. `.nojekyll`: necesario para que
  GitHub Pages publique sin fallar.
- `wrangler.jsonc` y `.assetsignore`: configuración para publicar en Cloudflare (Workers con
  archivos estáticos, conectado al repositorio). No hace falta tocarlos.

## Cómo trabajar

- Al cambiar `css/estilos.css`, `js/app.js` o `js/productos.js`, subir el número de versión
  `?v=` en `index.html` (los tres enlaces) para que los celulares no usen archivos viejos.
- Probar en ancho de celular (390 px) antes de subir: la mayoría de clientes entra desde el
  teléfono. Verificar que ningún botón se salga de su tarjeta.
- Cada `git push` a `main` publica en https://turinconcitonavideno.com en un minuto (Cloudflare)
  y en la dirección de respaldo https://constantinof07.github.io/tienda-navidena/.
- Commits en español, cortos, describiendo el cambio para el dueño.
