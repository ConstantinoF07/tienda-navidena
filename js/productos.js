/* =====================================================================
   PRODUCTOS Y DATOS DE LA TIENDA
   Este es el único archivo que necesitas editar para:
   - cambiar nombre, WhatsApp o textos de la tienda (bloque TIENDA)
   - agregar, quitar o modificar productos (lista PRODUCTOS)
   Guarda el archivo y recarga la página. No hace falta tocar nada más.
   ===================================================================== */

const TIENDA = {
  nombre: "Tienda Navideña Veracruz",          // EDITAR: nombre real de la tienda
  eslogan: "Piezas únicas hechas a mano. Elige las tuyas, pide por WhatsApp y recógelas en tu punto de entrega.",
  whatsapp: "522291433176",                    // lada + número, sin "+" ni espacios
  ciudad: "Veracruz, Ver.",
  moneda: "MXN",

  // Piezas únicas: solo hay una de cada producto. Con 1 no se pide cantidad y el
  // carrito acepta una por producto. Un producto puede cambiarlo con su propio "maximo".
  maximoPorProducto: 1,
  avisoPiezaUnica: "Pieza única: solo tenemos una.",

  // Puntos de entrega. No hay envío a domicilio: el cliente elige dónde recoger.
  // EDITAR: nombre, dirección, referencia, horario y coordenadas (lat, lng).
  // Para sacar lat y lng: en Google Maps mantén presionado el punto exacto y arriba
  // aparecen dos números, por ejemplo 19.2006, -96.1360. El primero es lat, el segundo lng.
  // "mapa" es opcional: un enlace propio de "Cómo llegar"; si va vacío se arma solo.
  puntosEntrega: [
    // El horario se acuerda por WhatsApp con cada cliente: "horario" va vacío a propósito.
    { nombre: "Divertiplaza", direccion: "Fidel Velázquez 526, Río Medio II, Fraccionamiento del Norte, 91809 Veracruz, Ver.", referencia: "", horario: "", lat: 19.2127177, lng: -96.2008532, mapa: "" },
    { nombre: "Soriana Hiper Los Pinos", direccion: "Dr. Rafael Cuervo 60, Playa Linda, 91810 Veracruz, Ver.", referencia: "", horario: "", lat: 19.2140814, lng: -96.1722379, mapa: "" },
    { nombre: "KMG Élite Boca del Río", direccion: "C. Alaminos 152, Virginia, 94294 Veracruz, Ver.", referencia: "", horario: "", lat: 19.1647773, lng: -96.1206622, mapa: "" }
  ],

  // Inicio de los mensajes de WhatsApp. El resto se arma solo.
  mensajes: {
    pedido: "Hola, quiero hacer este pedido:",
    interes: "Hola, me interesa este adorno",   // se completa: "...: Carrusel luminoso de $2,000"
    duda: "Hola, tengo una duda sobre sus adornos navideños."
  },

  // Aviso corto que aparece arriba del catálogo. Déjalo en "" para ocultarlo.
  aviso: "Piezas hechas a mano en cantidades limitadas. Pedidos navideños hasta el 20 de diciembre."
};

/* ---------------------------------------------------------------------
   Cada producto es un bloque { ... } separado por coma.
   Para agregar uno: copia un bloque completo, pégalo debajo y cambia los datos.
   Para quitar uno: borra su bloque (o pon disponible: false para mostrarlo agotado).

   id               texto único, sin espacios ni acentos (se usa en el enlace)
   nombre           como lo verá el cliente
   nombreCorto      opcional: versión corta para listas y mensajes (ej. al combinar)
   precio           número, sin signo de pesos. Con 0 se muestra "Precio por WhatsApp"
   precioAnterior   número o null. Si lo pones, se muestra tachado como oferta
   presentaciones   opcional: lista de formas de compra con su precio, por ejemplo
                    media docena / caja completa / caja combinada. Si existe, el
                    cliente elige una en la ficha y la tarjeta muestra "Desde $...".
                    Una presentación con combinarCon: [ids] pide elegir el otro diseño.
   categoria        para los filtros: "Luminosos", "Para el árbol", "Nacimientos"...
   descripcionCorta una línea para la tarjeta del catálogo
   descripcion      párrafo para la ficha completa
   medidas          texto libre
   material         texto libre
   imagenes         lista de rutas; la primera es la principal
   miniatura        versión chica de la foto principal para las tarjetas (opcional)
   video            ruta a un .mp4 o null. En la ficha va justo después de la foto
                    principal: el cliente desliza y aparece el video
   (las rutas de imagenes, miniatura y video las genera tools/optimizar.js)
   variantes        lista de { nombre, opciones } o [] si no hay
   personalizable   qué se personaliza (ej. "Nombre que llevará la esfera") o null
   grupo            opcional: mismo nombre en los productos que son el mismo adorno en
                    otro color (ej. "nacimiento-tetera"). En la ficha aparece el selector
                    de color y, abajo, la tarjeta del otro color
   color            nombre del color de ESTE producto cuando tiene grupo (ej. "Rojo")
   destacado        true para mostrarlo primero con etiqueta
   disponible       false para mostrarlo como agotado
   maximo           opcional: máximo de unidades por pedido para ESTE producto.
                    Si no se pone, aplica TIENDA.maximoPorProducto (1 = pieza única)
   disponibilidad   opcional: aviso corto en la ficha, ej. "Solo tenemos una caja".
                    Si no se pone y es pieza única, se usa TIENDA.avisoPiezaUnica
   --------------------------------------------------------------------- */

// Presentaciones compartidas por las tres cajas de esferas (no aplican a las piñatas)
const PRESENTACIONES_ESFERAS = (otrosDisenos) => [
  { id: "media-docena", nombre: "Media docena", detalle: "6 piezas", precio: 800 },
  { id: "caja-completa", nombre: "Caja completa", detalle: "12 piezas del mismo diseño", precio: 1400 },
  { id: "caja-combinada", nombre: "Caja combinada", detalle: "6 de este diseño + 6 de otro", precio: 1500, combinarCon: otrosDisenos }
];

const PRODUCTOS = [
  {
    id: "gnomo-santa-entrada",
    nombre: "Gnomo Santa de entrada con letrero de Bienvenidos",
    precio: 1200,
    precioAnterior: null,
    categoria: "Figuras",
    descripcionCorta: "Santa gnomo con farol y letrero de Bienvenidos para recibir en la puerta.",
    descripcion: "Un Santa gnomo de 53 cm de alto que recibe a tus visitas con su farol y un letrero de Bienvenidos. Es una pieza con presencia para la entrada de la casa, el recibidor o el pie del árbol. Adorno navideño artesanal, hecho a mano.",
    medidas: "48 cm de ancho x 53 cm de alto",
    material: "",
    imagenes: ["img/productos/gnomo-santa-entrada/01.webp"],
    miniatura: "img/productos/gnomo-santa-entrada/01-m.webp",
    video: "img/productos/gnomo-santa-entrada/video.mp4",
    variantes: [],
    personalizable: null,
    destacado: false,
    disponible: true
  },
  {
    id: "villa-muneco-nieve-luminosa",
    nombre: "Villa navideña luminosa con muñeco de nieve",
    precio: 1600,
    precioAnterior: null,
    categoria: "Luminosos",
    descripcionCorta: "Escena nevada con pinos, casitas y muñeco de nieve que se ilumina.",
    descripcion: "Escena nevada con pinos, casitas y un muñeco de nieve que se ilumina por dentro y crea un ambiente cálido en la noche. Mide 30 cm de ancho por 23.5 cm de alto: queda perfecta en una repisa, en la mesa del recibidor o junto al árbol.",
    medidas: "30 cm de ancho x 23.5 cm de alto",
    material: "",
    imagenes: ["img/productos/villa-muneco-nieve-luminosa/01.webp"],
    miniatura: "img/productos/villa-muneco-nieve-luminosa/01-m.webp",
    video: "img/productos/villa-muneco-nieve-luminosa/video.mp4",
    variantes: [],
    personalizable: null,
    destacado: false,
    disponible: true
  },
  {
    id: "manzana-blanco-luminoso",
    nombre: "Frutero navideño luminoso con manzana blanca",
    precio: 1300,
    precioAnterior: null,
    categoria: "Luminosos",
    descripcionCorta: "Manzana blanca iluminada con esferas nacaradas en frutero de madera calada.",
    descripcion: "Frutero de madera calada con una manzana blanca que se ilumina, acompañada de esferas nacaradas y plateadas. Mide 52 cm de ancho por 32 cm de alto, pensado como centro de mesa para el comedor o la sala. Luce de día y, encendido, todavía más de noche.",
    medidas: "52 cm de ancho x 32 cm de alto",
    material: "Frutero de madera calada",
    imagenes: ["img/productos/manzana-blanco-luminoso/01.webp"],
    miniatura: "img/productos/manzana-blanco-luminoso/01-m.webp",
    video: "img/productos/manzana-blanco-luminoso/video.mp4",
    variantes: [],
    personalizable: null,
    destacado: false,
    disponible: true
  },
  {
    id: "manzana-tradicional",
    nombre: "Frutero navideño luminoso con manzana dorada",
    precio: 1300,
    precioAnterior: null,
    categoria: "Luminosos",
    descripcionCorta: "Manzana dorada iluminada con esferas ámbar y cobre en frutero de madera calada.",
    descripcion: "Frutero de madera calada con una manzana dorada que se ilumina, rodeada de esferas en tonos ámbar y cobre. Mide 52 cm de ancho por 32 cm de alto y funciona como centro de mesa de estilo tradicional y cálido.",
    medidas: "52 cm de ancho x 32 cm de alto",
    material: "Frutero de madera calada",
    imagenes: ["img/productos/manzana-tradicional/01.webp"],
    miniatura: "img/productos/manzana-tradicional/01-m.webp",
    video: "img/productos/manzana-tradicional/video.mp4",
    variantes: [],
    personalizable: null,
    destacado: false,
    disponible: true
  },
  {
    id: "carrusel-esferas",
    nombre: "Carrusel luminoso de esferas navideñas",
    precio: 2000,
    precioAnterior: null,
    categoria: "Luminosos",
    descripcionCorta: "Carrusel de madera calada con esferas de colores colgantes e iluminación.",
    descripcion: "Carrusel de madera calada con esferas de colores colgantes y luz en la base. Mide 38 cm de alto y unos 32 cm de diámetro (101 cm de contorno). Es la pieza central que llama la atención en la mesa, el recibidor o la entrada.",
    medidas: "38 cm de alto; aprox. 32 cm de diámetro (101 cm de contorno)",
    material: "Madera calada",
    imagenes: ["img/productos/carrusel-esferas/01.webp"],
    miniatura: "img/productos/carrusel-esferas/01-m.webp",
    video: "img/productos/carrusel-esferas/video.mp4",
    variantes: [],
    personalizable: null,
    destacado: false,
    disponible: true
  },
  {
    id: "esferas-rojas",
    nombre: "Esferas navideñas rojas, caja de 12",
    nombreCorto: "Esferas rojas",
    precio: 800,
    precioAnterior: null,
    disponibilidad: "Solo tenemos una caja de este diseño.",
    presentaciones: PRESENTACIONES_ESFERAS(["esferas-monos-rojas", "esferas-blancas-tradicional"]),
    categoria: "Para el árbol",
    descripcionCorta: "Esferas con diseño en rojo, verde y dorado. Media docena, caja de 12 o combinada.",
    descripcion: "Esferas navideñas con diseño en rojo, verde y dorado, de unos 11 cm de diámetro cada una. Elige media docena, la caja completa de 12 piezas, o combínala 6 y 6 con otro de nuestros diseños: esferas blancas con moños rojos o esferas blancas tradicionales.",
    medidas: "Aprox. 11 cm de diámetro por pieza (35 cm de contorno)",
    material: "",
    imagenes: ["img/productos/esferas-rojas/01.webp"],
    miniatura: "img/productos/esferas-rojas/01-m.webp",
    video: "img/productos/esferas-rojas/video.mp4",
    variantes: [],
    personalizable: null,
    destacado: false,
    disponible: true
  },
  {
    id: "esferas-monos-rojas",
    nombre: "Esferas blancas con moños rojos, caja de 12",
    nombreCorto: "Esferas blancas con moños rojos",
    precio: 800,
    precioAnterior: null,
    disponibilidad: "Solo tenemos una caja de este diseño.",
    presentaciones: PRESENTACIONES_ESFERAS(["esferas-rojas", "esferas-blancas-tradicional"]),
    categoria: "Para el árbol",
    descripcionCorta: "Esferas blancas decoradas con moños rojos. Media docena, caja de 12 o combinada.",
    descripcion: "Esferas blancas decoradas con moños rojos, de unos 11 cm de diámetro cada una. Elige media docena, la caja completa de 12 piezas, o combínala 6 y 6 con otro de nuestros diseños: esferas rojas o esferas blancas tradicionales.",
    medidas: "Aprox. 11 cm de diámetro por pieza (35 cm de contorno)",
    material: "",
    imagenes: ["img/productos/esferas-monos-rojas/01.webp"],
    miniatura: "img/productos/esferas-monos-rojas/01-m.webp",
    video: "img/productos/esferas-monos-rojas/video.mp4",
    variantes: [],
    personalizable: null,
    destacado: false,
    disponible: true
  },
  {
    id: "esferas-blancas-tradicional",
    nombre: "Esferas blancas tradicionales, caja de 12",
    nombreCorto: "Esferas blancas tradicionales",
    precio: 800,
    precioAnterior: null,
    disponibilidad: "Solo tenemos una caja de este diseño.",
    presentaciones: PRESENTACIONES_ESFERAS(["esferas-rojas", "esferas-monos-rojas"]),
    categoria: "Para el árbol",
    descripcionCorta: "Esferas blancas con hojas verdes y listones rojos. Media docena, caja de 12 o combinada.",
    descripcion: "Esferas blancas con hojas verdes y listones rojos, de estilo tradicional, de unos 11 cm de diámetro cada una. Elige media docena, la caja completa de 12 piezas, o combínala 6 y 6 con otro de nuestros diseños: esferas rojas o esferas blancas con moños rojos.",
    medidas: "Aprox. 11 cm de diámetro por pieza (35 cm de contorno)",
    material: "",
    imagenes: ["img/productos/esferas-blancas-tradicional/01.webp"],
    miniatura: "img/productos/esferas-blancas-tradicional/01-m.webp",
    video: "img/productos/esferas-blancas-tradicional/video.mp4",
    variantes: [],
    personalizable: null,
    destacado: false,
    disponible: true
  },
  {
    id: "pinatas-coloridas-arbol",
    nombre: "Mini piñatas de colores para el árbol, paquete de 7",
    precio: 1500,
    precioAnterior: null,
    categoria: "Para el árbol",
    descripcionCorta: "Siete mini piñatas de papel en colores vivos para colgar en el árbol.",
    descripcion: "Paquete de siete mini piñatas de papel en colores vivos para colgar en el árbol o en una guirnalda. Un toque muy mexicano para la decoración navideña de la casa.",
    medidas: "Paquete de 7 piezas; aprox. 35 cm de contorno cada una",
    material: "Papel",
    imagenes: ["img/productos/pinatas-coloridas-arbol/01.webp"],
    miniatura: "img/productos/pinatas-coloridas-arbol/01-m.webp",
    video: "img/productos/pinatas-coloridas-arbol/video.mp4",
    variantes: [],
    personalizable: null,
    destacado: false,
    disponible: true
  },
  {
    id: "nacimiento-talavera-azul",
    grupo: "nacimiento-tetera",
    color: "Azul",
    nombre: "Nacimiento luminoso en tetera estilo talavera azul",
    precio: 1600,
    precioAnterior: null,
    categoria: "Nacimientos",
    descripcionCorta: "Nacimiento con luz dentro de una tetera decorada estilo talavera en azul.",
    descripcion: "Nacimiento con figuras pintadas dentro de una tetera decorada estilo talavera en azul, con luz interior que ilumina la escena. Mide 22 cm de alto y unos 20 cm de diámetro (62 cm de contorno). Una forma distinta y muy mexicana de poner el nacimiento en casa.",
    medidas: "22 cm de alto; aprox. 20 cm de diámetro (62 cm de contorno)",
    material: "Cerámica estilo talavera",
    imagenes: ["img/productos/nacimiento-talavera-azul/01.webp"],
    miniatura: "img/productos/nacimiento-talavera-azul/01-m.webp",
    video: "img/productos/nacimiento-talavera-azul/video.mp4",
    variantes: [],
    personalizable: null,
    destacado: false,
    disponible: true
  },
  {
    id: "nacimiento-talavera-rojo",
    grupo: "nacimiento-tetera",
    color: "Rojo",
    nombre: "Nacimiento luminoso en tetera estilo talavera rojo",
    precio: 1600,
    precioAnterior: null,
    categoria: "Nacimientos",
    descripcionCorta: "Nacimiento con luz dentro de una tetera decorada estilo talavera en rojo.",
    descripcion: "Nacimiento con figuras pintadas dentro de una tetera decorada estilo talavera en rojo, con luz interior que ilumina la escena. Mide 22 cm de alto y unos 20 cm de diámetro (62 cm de contorno). Una forma distinta y muy mexicana de poner el nacimiento en casa.",
    medidas: "22 cm de alto; aprox. 20 cm de diámetro (62 cm de contorno)",
    material: "Cerámica estilo talavera",
    imagenes: ["img/productos/nacimiento-talavera-rojo/01.webp", "img/productos/nacimiento-talavera-rojo/02.webp"],
    miniatura: "img/productos/nacimiento-talavera-rojo/01-m.webp",
    video: "img/productos/nacimiento-talavera-rojo/video.mp4",
    variantes: [],
    personalizable: null,
    destacado: false,
    disponible: true
  },
  {
    id: "nacimiento-blanco",
    grupo: "nacimiento-figuras",
    color: "Blanco",
    nombre: "Nacimiento artesanal blanco",
    precio: 1200,
    precioAnterior: null,
    categoria: "Nacimientos",
    descripcionCorta: "Nacimiento de figuras en tonos blancos y crema con detalles suaves.",
    descripcion: "Nacimiento de figuras en tonos blancos y crema con detalles suaves, pensado para una decoración elegante y luminosa. Como referencia de tamaño, el ángel central mide 15 cm de alto por 8.5 cm de ancho.",
    medidas: "Ángel central de referencia: 8.5 cm de ancho x 15 cm de alto",
    material: "",
    imagenes: ["img/productos/nacimiento-blanco/01.webp"],
    miniatura: "img/productos/nacimiento-blanco/01-m.webp",
    video: "img/productos/nacimiento-blanco/video.mp4",
    variantes: [],
    personalizable: null,
    destacado: false,
    disponible: true
  },
  {
    id: "nacimiento-tradicional",
    grupo: "nacimiento-figuras",
    color: "Tradicional",
    nombre: "Nacimiento artesanal tradicional",
    precio: 1200,
    precioAnterior: null,
    categoria: "Nacimientos",
    descripcionCorta: "Nacimiento de figuras de colores, de estilo tradicional.",
    descripcion: "Nacimiento de figuras de colores, de estilo tradicional, con los personajes clásicos del portal. Como referencia de tamaño, el ángel central mide 15 cm de alto por 8.5 cm de ancho.",
    medidas: "Ángel central de referencia: 8.5 cm de ancho x 15 cm de alto",
    material: "",
    imagenes: ["img/productos/nacimiento-tradicional/01.webp"],
    miniatura: "img/productos/nacimiento-tradicional/01-m.webp",
    video: "img/productos/nacimiento-tradicional/video.mp4",
    variantes: [],
    personalizable: null,
    destacado: false,
    disponible: true
  },
  {
    id: "cascanueces-azul",
    grupo: "cascanueces-grande",
    color: "Azul",
    nombre: "Soldado cascanueces azul",
    precio: 800,
    precioAnterior: null,
    categoria: "Cascanueces",
    descripcionCorta: "Soldado cascanueces de 36 cm en azul marino y blanco con detalles dorados.",
    descripcion: "Soldado cascanueces de 36 cm de alto en azul marino y blanco con detalles dorados. Una figura clásica de la Navidad para la entrada, la chimenea o la mesa.",
    medidas: "9.5 cm de ancho x 36 cm de alto",
    material: "",
    imagenes: ["img/productos/cascanueces-azul/01.webp"],
    miniatura: "img/productos/cascanueces-azul/01-m.webp",
    video: "img/productos/cascanueces-azul/video.mp4",
    variantes: [],
    personalizable: null,
    destacado: false,
    disponible: true
  },
  {
    id: "cascanueces-rojo",
    grupo: "cascanueces-grande",
    color: "Rojo",
    nombre: "Soldado cascanueces rojo",
    precio: 800,
    precioAnterior: null,
    categoria: "Cascanueces",
    descripcionCorta: "Soldado cascanueces de 36 cm en rojo y blanco con detalles dorados.",
    descripcion: "Soldado cascanueces de 36 cm de alto en rojo y blanco con detalles dorados. Una figura clásica de la Navidad para la entrada, la chimenea o la mesa.",
    medidas: "9.5 cm de ancho x 36 cm de alto",
    material: "",
    imagenes: ["img/productos/cascanueces-rojo/01.webp"],
    miniatura: "img/productos/cascanueces-rojo/01-m.webp",
    video: "img/productos/cascanueces-rojo/video.mp4",
    variantes: [],
    personalizable: null,
    destacado: false,
    disponible: true
  },
  {
    id: "cascanueces-blancos-mesa",
    grupo: "cascanueces-mesa",
    color: "Blanco y dorado",
    nombre: "Set de 4 cascanueces blancos para mesa",
    precio: 500,
    precioAnterior: null,
    categoria: "Cascanueces",
    descripcionCorta: "Cuatro soldados cascanueces en blanco y dorado para decorar la mesa.",
    descripcion: "Cuatro soldados cascanueces en blanco y dorado, de 18.5 cm de alto cada uno. Ideales para la mesa navideña, una repisa o para acompañar el centro de mesa.",
    medidas: "4 piezas de 5 cm de ancho x 18.5 cm de alto",
    material: "",
    imagenes: ["img/productos/cascanueces-blancos-mesa/01.webp"],
    miniatura: "img/productos/cascanueces-blancos-mesa/01-m.webp",
    video: "img/productos/cascanueces-blancos-mesa/video.mp4",
    variantes: [],
    personalizable: null,
    destacado: false,
    disponible: true
  },
  {
    id: "cascanueces-tradicional-mesa",
    grupo: "cascanueces-mesa",
    color: "Tradicional",
    nombre: "Set de 4 cascanueces tradicionales para mesa",
    precio: 500,
    precioAnterior: null,
    categoria: "Cascanueces",
    descripcionCorta: "Cuatro soldados cascanueces de colores para decorar la mesa.",
    descripcion: "Cuatro soldados cascanueces en colores tradicionales, de 18.5 cm de alto cada uno. Ideales para la mesa navideña, una repisa o para acompañar el centro de mesa.",
    medidas: "4 piezas de 5 cm de ancho x 18.5 cm de alto",
    material: "",
    imagenes: ["img/productos/cascanueces-tradicional-mesa/01.webp"],
    miniatura: "img/productos/cascanueces-tradicional-mesa/01-m.webp",
    video: "img/productos/cascanueces-tradicional-mesa/video.mp4",
    variantes: [],
    personalizable: null,
    destacado: false,
    disponible: true
  }
];
