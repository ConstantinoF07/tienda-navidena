# Tienda Navideña Veracruz

Catálogo de adornos navideños artesanales con pedido por WhatsApp. Sitio 100 % estático:
HTML, CSS y JavaScript, sin servidor ni base de datos.

## Editar productos y datos de la tienda

Todo está en un solo archivo: `js/productos.js`.

- Bloque `TIENDA`: nombre, número de WhatsApp, opciones de entrega, textos de los mensajes y aviso.
- Lista `PRODUCTOS`: un bloque por producto. Para agregar uno, copia un bloque completo, pégalo
  debajo del último y cambia los datos. Para quitarlo, borra su bloque o pon `disponible: false`.

Las fotos van en `img/productos/<id-del-producto>/` y se enlazan desde el campo `imagenes`.

Los textos para Google y para la vista previa al compartir (título, descripción, imagen) están al
inicio de `index.html`, marcados con el comentario EDITAR.

## Ver el sitio en tu computadora

Opción rápida: abre `index.html` con doble clic. Funciona completo porque no usa servidor.

Opción con servidor local (igual a como se verá publicado), con Node instalado:

```bash
npx serve . -l 8080
```

Luego entra a http://localhost:8080 en tu navegador. Para verlo en tu celular, conéctalo a la
misma red Wi-Fi y abre la dirección que `serve` muestra como "Network".

## Publicar

El código vive en GitHub y se publica con Cloudflare Pages conectado al repositorio: cada vez que
subes un cambio, se publica solo. El archivo `_headers` fija las cabeceras de seguridad en
Cloudflare. GitHub Pages sirve como respaldo; para usarlo con dominio propio se agrega un archivo
`CNAME` con el dominio.

## Estructura

    index.html          página completa
    css/estilos.css     estilos
    js/productos.js     productos y datos de la tienda (lo único que se edita)
    js/app.js           catálogo, carrito y mensajes de WhatsApp
    img/                imágenes optimizadas, favicon e imagen para compartir
    _headers            cabeceras de seguridad (Cloudflare Pages)
    robots.txt          permisos para buscadores
    sitemap.xml         mapa del sitio
