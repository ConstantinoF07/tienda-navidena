/* =====================================================================
   app.js: catálogo, ficha de producto, carrito y pedido por WhatsApp.
   No necesitas editar este archivo. Los datos viven en js/productos.js
   ===================================================================== */
(function () {
  "use strict";

  if (typeof PRODUCTOS === "undefined" || typeof TIENDA === "undefined") {
    console.error("No se encontró js/productos.js o está incompleto.");
    return;
  }

  const CLAVE_CARRITO = "tn_carrito_v1";
  const TODAS = "Todo";
  const IMAGEN_VACIA = "img/productos/placeholder.svg";
  const ICONO_WHATSAPP = '<svg class="icono-wa" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413"/></svg>';

  const formato = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: TIENDA.moneda || "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const precio = (n) => formato.format(Number(n) || 0);
  const esc = (t) => String(t == null ? "" : t)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const buscarProducto = (id) => PRODUCTOS.find((p) => p.id === id) || null;
  const imagenPrincipal = (p) => (p && p.imagenes && p.imagenes[0]) || IMAGEN_VACIA;
  const puntosEntrega = () => TIENDA.puntosEntrega || [];
  const buscarPunto = (nombre) => puntosEntrega().find((pt) => pt.nombre === nombre) || null;

  /* Presentaciones (media docena, caja completa, combinada...) */
  const presentaciones = (p) => (p && Array.isArray(p.presentaciones) && p.presentaciones.length) ? p.presentaciones : null;
  const precioMinimo = (p) => {
    const pr = presentaciones(p);
    return pr ? Math.min(...pr.map((o) => Number(o.precio) || 0)) : (Number(p.precio) || 0);
  };
  const tienePrecio = (p) => precioMinimo(p) > 0;
  /* Productos del mismo "grupo" (el mismo adorno en otro color), sin el actual */
  const otrosColores = (p) => (p && p.grupo)
    ? PRODUCTOS.filter((q) => q.grupo === p.grupo && q.id !== p.id && q.color)
    : [];
  const precioLinea = (l, p) => (l.precioUnitario != null ? Number(l.precioUnitario) : Number(p.precio) || 0);

  /* ---------- WhatsApp ---------- */
  const numeroWhatsApp = () => String(TIENDA.whatsapp || "").replace(/\D/g, "");

  function urlWhatsApp(texto) {
    return "https://wa.me/" + numeroWhatsApp() + "?text=" + encodeURIComponent(texto);
  }

  function textoDetalles(variantes, personalizacion, producto) {
    const partes = [];
    Object.keys(variantes || {}).forEach((k) => {
      if (!variantes[k]) return;
      partes.push(k === "Presentación" ? variantes[k] : k + ": " + variantes[k]);
    });
    if (personalizacion) {
      const etiqueta = producto && producto.personalizable ? producto.personalizable : "Personalización";
      partes.push(etiqueta + ": " + personalizacion);
    }
    return partes.length ? "(" + partes.join(", ") + ")" : "";
  }

  function mensajeInteres(p, variantes, personalizacion, precioUnitario) {
    const det = textoDetalles(variantes, personalizacion, p);
    const pu = precioUnitario != null ? precioUnitario : (presentaciones(p) ? 0 : p.precio);
    const conPrecio = pu ? ` de *${precio(pu)}*` : "";
    /* Los asteriscos son el formato de negritas de WhatsApp */
    return `${TIENDA.mensajes.interes}: *${p.nombre}*${det ? " " + det : ""}${conPrecio}`;
  }

  /* ---------- Carrito (estado) ---------- */
  let carrito = cargarCarrito();
  const datosPedido = {
    entrega: puntosEntrega()[0] ? puntosEntrega()[0].nombre : "",
    nombre: "",
    nota: ""
  };

  function cargarCarrito() {
    try {
      const datos = JSON.parse(localStorage.getItem(CLAVE_CARRITO) || "[]");
      if (!Array.isArray(datos)) return [];
      return datos.filter((l) => l && buscarProducto(l.id) && l.cantidad > 0);
    } catch (e) {
      return [];
    }
  }

  function guardarCarrito() {
    try {
      localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
    } catch (e) {
      /* navegación privada o almacenamiento lleno: el carrito sigue en memoria */
    }
    actualizarContador();
  }

  const mismaLinea = (a, b) => a.id === b.id
    && JSON.stringify(a.variantes || {}) === JSON.stringify(b.variantes || {})
    && (a.personalizacion || "") === (b.personalizacion || "");

  const maximoDe = (p) => {
    if (p && p.maximo > 0) return p.maximo;
    if (TIENDA.maximoPorProducto > 0) return TIENDA.maximoPorProducto;
    return 99;
  };
  const textoDisponibilidad = (p) => p.disponibilidad || (maximoDe(p) === 1 ? (TIENDA.avisoPiezaUnica || "") : "");

  /* Devuelve cuántas unidades se agregaron de verdad (0 si ya estaba al máximo) */
  function agregarAlCarrito(linea) {
    const p = buscarProducto(linea.id);
    const max = maximoDe(p);
    const existente = carrito.find((l) => mismaLinea(l, linea));
    /* El máximo cuenta todas las líneas del mismo producto (distintas presentaciones) */
    const otras = carrito.filter((l) => l.id === linea.id && l !== existente).reduce((s, l) => s + l.cantidad, 0);
    const tope = Math.max(0, max - otras);
    let agregadas = 0;
    if (existente) {
      const nueva = Math.min(tope, existente.cantidad + linea.cantidad);
      agregadas = Math.max(0, nueva - existente.cantidad);
      existente.cantidad = Math.max(existente.cantidad, nueva);
    } else if (tope > 0) {
      linea.cantidad = Math.min(tope, linea.cantidad);
      agregadas = linea.cantidad;
      carrito.push(linea);
    }
    guardarCarrito();
    return agregadas;
  }

  const cantidadTotal = () => carrito.reduce((s, l) => s + l.cantidad, 0);
  const totalCarrito = () => carrito.reduce((s, l) => {
    const p = buscarProducto(l.id);
    return s + (p ? precioLinea(l, p) * l.cantidad : 0);
  }, 0);

  function actualizarContador() {
    const n = cantidadTotal();
    $$("[data-carrito-num]").forEach((el) => {
      el.textContent = n;
      el.hidden = n === 0;
    });
    /* Barra inferior "Concluir compra": solo cuando hay algo en el carrito */
    const barra = $("[data-barra-pedido]");
    if (barra) barra.hidden = n === 0;
    $$("[data-carrito-total]").forEach((el) => { el.textContent = precio(totalCarrito()); });
  }

  function mensajePedido() {
    const lineas = carrito.map((l) => {
      const p = buscarProducto(l.id);
      const det = textoDetalles(l.variantes, l.personalizacion, p);
      /* Los asteriscos son el formato de negritas de WhatsApp */
      return `• ${l.cantidad} × *${p.nombre}*${det ? " " + det : ""} — *${precio(precioLinea(l, p) * l.cantidad)}*`;
    });
    const partes = [TIENDA.mensajes.pedido, "", ...lineas, "", `*Total: ${precio(totalCarrito())}*`];
    const punto = buscarPunto(datosPedido.entrega);
    if (punto) partes.push("", `*Recoger en:* ${punto.nombre}${punto.direccion ? " (" + punto.direccion + ")" : ""}`);
    /* Nombre y comentarios van en su propio bloque, separados del punto de entrega */
    const nombre = datosPedido.nombre.trim();
    const nota = datosPedido.nota.trim();
    if (nombre || nota) partes.push("");
    if (nombre) partes.push(`*Nombre:* ${nombre}`);
    if (nota) partes.push(`*Comentarios:* ${nota}`);
    return partes.join("\n");
  }

  /* ---------- Catálogo ---------- */
  let categoriaActiva = TODAS;

  function categorias() {
    const lista = [];
    PRODUCTOS.forEach((p) => {
      if (p.categoria && !lista.includes(p.categoria)) lista.push(p.categoria);
    });
    return lista;
  }

  function renderFiltros() {
    const cont = $("[data-filtros]");
    if (!cont) return;
    const cats = categorias();
    if (cats.length < 2) {
      cont.hidden = true;
      return;
    }
    cont.hidden = false;
    cont.innerHTML = [TODAS, ...cats].map((c) =>
      `<button type="button" class="chip" data-accion="filtro" data-categoria="${esc(c)}" aria-pressed="${c === categoriaActiva}">${esc(c)}</button>`
    ).join("");
  }

  function insignia(p) {
    if (!p.disponible) return '<span class="insignia insignia--agotado">Agotado</span>';
    if (p.precioAnterior && p.precioAnterior > p.precio) return '<span class="insignia insignia--oferta">Oferta</span>';
    if (p.destacado) return '<span class="insignia">Favorito</span>';
    return "";
  }

  function htmlPrecio(p) {
    if (!tienePrecio(p)) return '<span class="precio-pendiente">Precio por WhatsApp</span>';
    if (presentaciones(p)) return `<span class="precio-desde">Desde</span> ${esc(precio(precioMinimo(p)))}`;
    const anterior = p.precioAnterior && p.precioAnterior > p.precio
      ? ` <s>${esc(precio(p.precioAnterior))}</s>`
      : "";
    return `${esc(precio(p.precio))}${anterior}`;
  }

  function tarjeta(p) {
    const necesitaFicha = (p.variantes && p.variantes.length) || p.personalizable || presentaciones(p);
    const accionPrincipal = necesitaFicha ? "abrir-ficha" : "agregar-rapido";
    const conPrecio = tienePrecio(p);
    const textoPrincipal = !p.disponible ? "Agotado" : (necesitaFicha ? "Elegir" : "Agregar");
    return `
<article class="tarjeta${p.disponible ? "" : " is-agotado"}">
  <button type="button" class="tarjeta__media" data-accion="abrir-ficha" data-id="${esc(p.id)}" aria-label="Ver ${esc(p.nombre)}">
    <img src="${esc(p.miniatura || imagenPrincipal(p))}" alt="${esc(p.alt || p.nombre)}" width="600" height="600" loading="lazy" decoding="async">
    ${insignia(p)}
    ${p.video ? '<span class="tarjeta__video">Video</span>' : ""}
  </button>
  <div class="tarjeta__cuerpo">
    <h3 class="tarjeta__nombre"><button type="button" data-accion="abrir-ficha" data-id="${esc(p.id)}">${esc(p.nombre)}</button></h3>
    <p class="tarjeta__desc">${esc(p.descripcionCorta)}</p>
    <p class="tarjeta__precio">${htmlPrecio(p)}</p>
    <div class="tarjeta__acciones">
      ${conPrecio
        ? `<button type="button" class="boton boton--primario" data-accion="${accionPrincipal}" data-id="${esc(p.id)}"${p.disponible ? "" : " disabled"}>${textoPrincipal}</button>`
        : `<a class="boton boton--whatsapp" href="${esc(urlWhatsApp(mensajeInteres(p)))}" target="_blank" rel="noopener">Preguntar precio</a>`}
    </div>
  </div>
</article>`;
  }

  function renderCatalogo() {
    const cont = $("[data-catalogo]");
    if (!cont) return;
    const lista = PRODUCTOS
      .filter((p) => categoriaActiva === TODAS || p.categoria === categoriaActiva)
      .slice()
      .sort((a, b) =>
        (Number(Boolean(b.disponible)) - Number(Boolean(a.disponible)))
        || (Number(Boolean(b.destacado)) - Number(Boolean(a.destacado))));
    cont.innerHTML = lista.length
      ? lista.map(tarjeta).join("")
      : '<p class="vacio">No hay productos en esta categoría.</p>';
  }

  /* ---------- Diálogos ---------- */
  let ultimoFoco = null;

  function abrirDialogo(nombre) {
    const d = $(`[data-dialogo="${nombre}"]`);
    if (!d) return null;
    ultimoFoco = document.activeElement;
    if (typeof d.showModal === "function") {
      if (!d.open) d.showModal();
    } else {
      d.setAttribute("open", "");
    }
    return d;
  }

  function cerrarDialogos() {
    $$("dialog[open]").forEach((d) => {
      if (typeof d.close === "function") d.close();
      else d.removeAttribute("open");
    });
  }

  $$("dialog").forEach((d) => {
    d.addEventListener("click", (e) => {
      if (e.target === d) d.close();
    });
    d.addEventListener("close", () => {
      $$("video", d).forEach((v) => v.pause());
      if (d.dataset.dialogo === "ficha" && location.hash.indexOf("#p-") === 0) {
        history.replaceState(null, "", location.pathname + location.search);
      }
      if (ultimoFoco && typeof ultimoFoco.focus === "function") ultimoFoco.focus();
    });
  });

  /* ---------- Ficha de producto ---------- */
  let fichaActual = null;

  function renderFicha(p) {
    const cont = $("[data-ficha-contenido]");
    if (!cont) return;
    const imgs = p.imagenes && p.imagenes.length ? p.imagenes : [IMAGEN_VACIA];

    /* Diapositivas: foto principal, luego el video (si hay), luego el resto de fotos */
    const diapositivas = [];
    imgs.forEach((src, i) => {
      diapositivas.push({ tipo: "imagen", src, etiqueta: "Foto " + (i + 1) });
      if (i === 0 && p.video) diapositivas.push({ tipo: "video", src: p.video, poster: src, etiqueta: "Video" });
    });

    const galeria = `
<div class="galeria" data-galeria>
  <div class="galeria__pista" data-galeria-pista tabindex="0" aria-label="Fotos y video de ${esc(p.nombre)}">
    ${diapositivas.map((d, i) => d.tipo === "video"
      ? `<div class="galeria__diapositiva galeria__diapositiva--video"><video src="${esc(d.src)}" poster="${esc(d.poster)}" controls playsinline muted loop preload="metadata"></video></div>`
      : `<div class="galeria__diapositiva"><img src="${esc(d.src)}" alt="${esc(p.alt || p.nombre)}${i ? " (" + d.etiqueta.toLowerCase() + ")" : ""}" width="800" height="800"${i ? ' loading="lazy"' : ""}></div>`
    ).join("")}
  </div>
  ${diapositivas.length > 1 ? `
  <button type="button" class="galeria__flecha galeria__flecha--izq" data-accion="galeria-mover" data-paso="-1" aria-label="Anterior">&lsaquo;</button>
  <button type="button" class="galeria__flecha galeria__flecha--der" data-accion="galeria-mover" data-paso="1" aria-label="Siguiente">&rsaquo;</button>
  <div class="galeria__puntos">${diapositivas.map((d, i) =>
    `<button type="button" class="galeria__punto${i === 0 ? " is-activo" : ""}${d.tipo === "video" ? " galeria__punto--video" : ""}" data-accion="galeria-ir" data-indice="${i}" aria-label="${esc(d.etiqueta)}"></button>`
  ).join("")}</div>
  ${p.video ? '<p class="galeria__ayuda" data-galeria-ayuda>Desliza para ver el video</p>' : ""}` : ""}
</div>`;

    const variantes = (p.variantes || []).map((v) => `
      <label class="campo"><span>${esc(v.nombre)}</span>
        <select name="var:${esc(v.nombre)}">${(v.opciones || []).map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}</select>
      </label>`).join("");

    const personal = p.personalizable ? `
      <label class="campo"><span>${esc(p.personalizable)}</span>
        <input type="text" name="personalizacion" maxlength="60" autocomplete="off" placeholder="Escríbelo aquí">
      </label>` : "";

    const detalles = [["Medidas", p.medidas], ["Material", p.material]].filter((d) => d[1]);
    const conPrecio = tienePrecio(p);
    const pr = presentaciones(p);

    /* Mismo adorno en otros colores: cada color es un producto distinto (pieza única).
       Arriba, un selector con el color actual marcado; abajo, la tarjeta del otro color. */
    const otros = otrosColores(p);
    const bloqueColores = otros.length ? `
      <div class="colores">
        <span class="colores__titulo">Color: <b>${esc(p.color)}</b></span>
        <div class="colores__lista" role="group" aria-label="Elegir color">
          ${[p].concat(otros).map((q) => `
          <button type="button" class="color-chip" data-accion="${q.id === p.id ? "nada" : "abrir-ficha"}" data-id="${esc(q.id)}" aria-pressed="${q.id === p.id}">
            <img src="${esc(q.miniatura || imagenPrincipal(q))}" alt="" width="28" height="28" loading="lazy">${esc(q.color)}
          </button>`).join("")}
        </div>
      </div>` : "";
    const bloqueRelacionados = otros.map((q) => `
      <div class="relacionado">
        <p class="relacionado__titulo">También lo tenemos en ${esc(q.color.toLowerCase())}</p>
        <button type="button" class="relacionado__media" data-accion="abrir-ficha" data-id="${esc(q.id)}" aria-label="Ver ${esc(q.nombre)}">
          <img src="${esc(q.miniatura || imagenPrincipal(q))}" alt="${esc(q.alt || q.nombre)}" width="84" height="84" loading="lazy">
        </button>
        <div>
          <p class="relacionado__nombre">${esc(q.nombre)}</p>
          <p class="relacionado__precio">${htmlPrecio(q)}</p>
        </div>
        <button type="button" class="boton boton--primario" data-accion="abrir-ficha" data-id="${esc(q.id)}">Ver en ${esc(q.color.toLowerCase())}</button>
      </div>`).join("");

    const bloquePresentaciones = pr ? `
      <fieldset class="presentaciones"><legend>Elige tu presentación</legend>
        ${pr.map((o, i) => `
        <label class="presentacion">
          <input type="radio" name="presentacion" value="${esc(o.id)}"${i === 0 ? " checked" : ""}>
          <span class="presentacion__texto"><strong>${esc(o.nombre)}</strong>${o.detalle ? `<small>${esc(o.detalle)}</small>` : ""}</span>
          <span class="presentacion__precio">${esc(precio(o.precio))}</span>
        </label>`).join("")}
      </fieldset>
      ${pr.filter((o) => o.combinarCon && o.combinarCon.length).map((o) => `
      <fieldset class="combinar" data-combinar="${esc(o.id)}" hidden><legend>¿Con qué diseño la combinas?</legend>
        ${o.combinarCon.map((id, i) => {
          const q = buscarProducto(id);
          if (!q) return "";
          return `
        <label class="combinar__opcion">
          <input type="radio" name="combinar:${esc(o.id)}" value="${esc(q.id)}"${i === 0 ? " checked" : ""}>
          <img src="${esc(q.miniatura || imagenPrincipal(q))}" alt="" width="56" height="56" loading="lazy">
          <span>${esc(q.nombreCorto || q.nombre)}</span>
        </label>`;
        }).join("")}
        <div class="combinar__vista" data-combinar-vista="${esc(o.id)}"></div>
      </fieldset>`).join("")}` : "";

    cont.innerHTML = `
<button type="button" class="dialogo__cerrar" data-accion="cerrar" aria-label="Cerrar">&times;</button>
<div class="ficha">
  <div class="ficha__galeria">
    ${galeria}
  </div>
  <div class="ficha__datos">
    <h2 id="ficha-titulo" class="ficha__titulo">${esc(p.nombre)}</h2>
    <p class="ficha__precio" data-ficha-precio>${pr ? esc(precio(pr[0].precio)) : htmlPrecio(p)}</p>
    ${textoDisponibilidad(p) ? `<p class="ficha__disponibilidad">${esc(textoDisponibilidad(p))}</p>` : ""}
    ${bloqueColores}
    <p class="ficha__descripcion">${esc(p.descripcion || p.descripcionCorta || "")}</p>
    ${detalles.length ? `<dl class="detalles">${detalles.map((d) => `<dt>${esc(d[0])}</dt><dd>${esc(d[1])}</dd>`).join("")}</dl>` : ""}
    <form class="ficha__form" data-ficha-form>
      ${bloquePresentaciones}
      ${variantes}
      ${personal}
      ${conPrecio && maximoDe(p) > 1 ? `<label class="campo"><span>Cantidad</span>
        <span class="cantidad">
          <button type="button" data-accion="menos-ficha" aria-label="Menos">&minus;</button>
          <input type="number" name="cantidad" min="1" max="99" value="1" inputmode="numeric">
          <button type="button" data-accion="mas-ficha" aria-label="Más">+</button>
        </span>
      </label>` : ""}
      <div class="acciones acciones--columna">
        ${conPrecio
          ? `<button type="submit" class="boton boton--primario boton--grande"${p.disponible ? "" : " disabled"}>${p.disponible ? "Agregar al carrito" : "Agotado"}</button>`
          : `<a class="boton boton--whatsapp" data-ficha-interes href="${esc(urlWhatsApp(mensajeInteres(p)))}" target="_blank" rel="noopener">Preguntar precio por WhatsApp</a>`}
      </div>
    </form>
    ${bloqueRelacionados}
  </div>
</div>`;
  }

  function leerFormularioFicha() {
    const form = $("[data-ficha-form]");
    const variantes = {};
    let personalizacion = "";
    let cantidad = 1;
    let presentacion = null;
    let combinada = null;
    if (form) {
      $$("select[name^='var:']", form).forEach((s) => { variantes[s.name.slice(4)] = s.value; });
      const inp = $("input[name='personalizacion']", form);
      if (inp) personalizacion = inp.value.trim();
      const c = $("input[name='cantidad']", form);
      cantidad = Math.max(1, Math.min(99, parseInt(c && c.value, 10) || 1));
      const rp = $("input[name='presentacion']:checked", form);
      if (rp) {
        presentacion = rp.value;
        const rc = $(`input[name='combinar:${presentacion}']:checked`, form);
        if (rc) combinada = rc.value;
      }
    }
    return { variantes, personalizacion, cantidad, presentacion, combinada };
  }

  /* Convierte lo elegido en la ficha en variantes legibles y precio unitario */
  function seleccionFicha(p, d) {
    const variantes = Object.assign({}, d.variantes);
    let precioUnitario = Number(p.precio) || 0;
    const pr = presentaciones(p);
    if (pr) {
      const o = pr.find((x) => x.id === d.presentacion) || pr[0];
      precioUnitario = Number(o.precio) || 0;
      if (o.combinarCon && o.combinarCon.length) {
        const q = buscarProducto(d.combinada) || buscarProducto(o.combinarCon[0]);
        variantes["Presentación"] = o.nombre + (q ? " con " + (q.nombreCorto || q.nombre) : "");
      } else {
        variantes["Presentación"] = o.nombre + (o.detalle ? ", " + o.detalle : "");
      }
    }
    return { variantes, precioUnitario };
  }

  function actualizarFicha() {
    const p = buscarProducto(fichaActual);
    if (!p) return;
    const d = leerFormularioFicha();
    const sel = seleccionFicha(p, d);
    $$("[data-combinar]").forEach((f) => {
      f.hidden = f.dataset.combinar !== d.presentacion;
      if (f.hidden) $$("video", f).forEach((v) => v.pause());
    });
    /* Vista grande del diseño con el que se combina: su foto y, debajo, su video */
    const vista = $(`[data-combinar-vista="${d.presentacion}"]`);
    if (vista) {
      const q = buscarProducto(d.combinada);
      if (!q) {
        vista.innerHTML = "";
        vista.dataset.actual = "";
      } else if (vista.dataset.actual !== q.id) {
        vista.dataset.actual = q.id;
        vista.innerHTML = `
<p class="combinar__titulo">Así son las ${esc(q.nombreCorto || q.nombre)}</p>
<img src="${esc(imagenPrincipal(q))}" alt="${esc(q.alt || q.nombre)}" width="800" height="800" loading="lazy">
${q.video ? `<video src="${esc(q.video)}" poster="${esc(imagenPrincipal(q))}" controls muted loop playsinline preload="metadata"></video>` : ""}`;
        const v = $("video", vista);
        if (v) v.play().catch(() => { /* el navegador puede bloquear el autoplay */ });
      }
    }
    const pe = $("[data-ficha-precio]");
    if (pe && presentaciones(p)) pe.textContent = precio(sel.precioUnitario);
    const a = $("[data-ficha-interes]");
    if (a) a.href = urlWhatsApp(mensajeInteres(p, sel.variantes, d.personalizacion, sel.precioUnitario));
  }

  function abrirFicha(id) {
    const p = buscarProducto(id);
    if (!p) return;
    fichaActual = id;
    renderFicha(p);
    actualizarFicha();
    const d = abrirDialogo("ficha");
    if (d) {
      const cuerpo = $(".dialogo__cuerpo", d);
      if (cuerpo) cuerpo.scrollTop = 0;
      history.replaceState(null, "", "#p-" + id);
    }
  }

  /* ---------- Galería deslizable (foto, video, más fotos) ---------- */
  const galeriaIndice = (pista) => Math.round(pista.scrollLeft / Math.max(1, pista.clientWidth));

  function galeriaIrA(pista, indice) {
    const n = pista.children.length;
    const i = Math.max(0, Math.min(n - 1, indice));
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    pista.scrollTo({ left: i * pista.clientWidth, behavior: suave ? "smooth" : "auto" });
  }

  function galeriaActualizar(pista) {
    const i = galeriaIndice(pista);
    const galeria = pista.closest("[data-galeria]");
    if (!galeria) return;
    $$(".galeria__punto", galeria).forEach((b, k) => b.classList.toggle("is-activo", k === i));
    Array.from(pista.children).forEach((diapositiva, k) => {
      const v = diapositiva.querySelector("video");
      if (!v) return;
      if (k === i) v.play().catch(() => { /* el navegador puede bloquear el autoplay */ });
      else v.pause();
    });
    const ayuda = $("[data-galeria-ayuda]", galeria);
    if (ayuda && i > 0) ayuda.hidden = true;
  }

  document.addEventListener("scroll", (e) => {
    const t = e.target;
    if (!t || !t.matches || !t.matches("[data-galeria-pista]")) return;
    if (t.dataset.tick) return;
    t.dataset.tick = "1";
    requestAnimationFrame(() => {
      delete t.dataset.tick;
      galeriaActualizar(t);
    });
  }, true);

  /* ---------- Carrito (vista) ---------- */
  function renderCarrito() {
    const cont = $("[data-carrito-contenido]");
    if (!cont) return;
    const cerrar = '<button type="button" class="dialogo__cerrar" data-accion="cerrar" aria-label="Cerrar">&times;</button>';

    if (!carrito.length) {
      cont.innerHTML = `${cerrar}
<h2 id="carrito-titulo" class="dialogo__titulo">Tu pedido</h2>
<p class="vacio">Todavía no has agregado nada. Elige algo del catálogo y aquí aparecerá.</p>
<div class="acciones"><button type="button" class="boton boton--primario" data-accion="cerrar">Ver el catálogo</button></div>`;
      return;
    }

    const lineas = carrito.map((l, i) => {
      const p = buscarProducto(l.id);
      const det = textoDetalles(l.variantes, l.personalizacion, p).replace(/^\(|\)$/g, "");
      return `
<li class="linea">
  <img src="${esc(p.miniatura || imagenPrincipal(p))}" alt="" width="64" height="64" loading="lazy">
  <div class="linea__info">
    <p class="linea__nombre">${esc(p.nombre)}</p>
    ${det ? `<p class="linea__detalle">${esc(det)}</p>` : ""}
    <p class="linea__precio">${esc(precio(precioLinea(l, p) * l.cantidad))}</p>
  </div>
  <div class="linea__controles">
    ${maximoDe(p) > 1 ? `<span class="cantidad">
      <button type="button" data-accion="menos" data-indice="${i}" aria-label="Quitar uno">&minus;</button>
      <span>${l.cantidad}</span>
      <button type="button" data-accion="mas" data-indice="${i}" aria-label="Agregar uno">+</button>
    </span>` : `<span class="linea__unico">Pieza única</span>`}
    <button type="button" class="linea__quitar" data-accion="quitar" data-indice="${i}">Quitar</button>
  </div>
</li>`;
    }).join("");

    const entregas = puntosEntrega().map((pt, i) => {
      const marcada = pt.nombre === datosPedido.entrega || (!datosPedido.entrega && i === 0);
      const detalle = [pt.direccion, pt.horario].filter(Boolean).join(". ");
      const d = distancias[pt.nombre];
      return `<label class="opcion"><input type="radio" name="entrega" value="${esc(pt.nombre)}"${marcada ? " checked" : ""}> <span><strong>${esc(pt.nombre)}</strong>${d != null ? ` <b>${esc(textoKm(d))}</b>` : ""}${detalle ? `<small>${esc(detalle)}</small>` : ""}</span></label>`;
    }).join("") + (puntosConCoordenadas().length ? bloqueMapa("carrito", "¿Cuál me queda más cerca?") : "");

    cont.innerHTML = `${cerrar}
<h2 id="carrito-titulo" class="dialogo__titulo">Tu pedido</h2>
<ul class="lineas">${lineas}</ul>
<p class="total"><span>Total</span><strong>${esc(precio(totalCarrito()))}</strong></p>
<form class="carrito__form" data-carrito-form>
  ${entregas ? `<fieldset><legend>¿En qué punto recoges tu pedido?</legend>${entregas}</fieldset>` : ""}
  <label class="campo"><span>Tu nombre (opcional)</span><input type="text" name="nombre" maxlength="60" autocomplete="name" value="${esc(datosPedido.nombre)}"></label>
  <label class="campo"><span>Comentarios (opcional)</span><textarea name="nota" rows="2" maxlength="300">${esc(datosPedido.nota)}</textarea></label>
</form>
<div class="acciones acciones--columna">
  <a class="boton boton--whatsapp boton--grande" data-carrito-pedir href="${esc(urlWhatsApp(mensajePedido()))}" target="_blank" rel="noopener">${ICONO_WHATSAPP} Enviar pedido por WhatsApp</a>
  <button type="button" class="boton boton--texto" data-accion="vaciar">Vaciar carrito</button>
</div>
<p class="nota">Se abre WhatsApp con tu pedido ya escrito. Por ahí te confirmamos disponibilidad, total y el día para pasar por él.</p>`;
  }

  function actualizarEnlacePedido() {
    const a = $("[data-carrito-pedir]");
    if (a) a.href = urlWhatsApp(mensajePedido());
  }

  function abrirCarrito() {
    renderCarrito();
    abrirDialogo("carrito");
  }

  /* ---------- Aviso breve (toast) ---------- */
  let temporizadorToast = null;

  function aviso(texto) {
    const t = $("[data-toast]");
    if (!t) return;
    t.textContent = texto;
    t.classList.add("is-visible");
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => t.classList.remove("is-visible"), 2200);
  }

  /* ---------- Eventos ---------- */
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-accion]");
    if (!el) return;
    const accion = el.dataset.accion;
    const indice = parseInt(el.dataset.indice, 10);

    switch (accion) {
      case "abrir-ficha":
        abrirFicha(el.dataset.id);
        break;
      case "abrir-carrito":
        abrirCarrito();
        break;
      case "cerrar":
        cerrarDialogos();
        break;
      case "filtro":
        categoriaActiva = el.dataset.categoria;
        renderFiltros();
        renderCatalogo();
        break;
      case "agregar-rapido": {
        const p = buscarProducto(el.dataset.id);
        if (!p || !p.disponible || !tienePrecio(p)) return;
        const n = agregarAlCarrito({ id: p.id, cantidad: 1, variantes: {}, personalizacion: "", precioUnitario: Number(p.precio) || 0 });
        aviso(n ? "Agregado. Toca «Concluir compra» cuando termines de elegir." : "Ese producto ya está en tu pedido: es pieza única");
        break;
      }
      case "mapa-ver": {
        const destino = el.dataset.mapaDestino;
        mostrarMapa($(`[data-mapa="${destino}"]`), seleccionadorPara(destino));
        break;
      }
      case "mapa-ubicacion": {
        const destino = el.dataset.mapaDestino;
        pedirUbicacion(el, $(`[data-mapa="${destino}"]`), seleccionadorPara(destino));
        break;
      }
      case "galeria-mover":
      case "galeria-ir": {
        const pista = $("[data-galeria-pista]", el.closest("[data-galeria]"));
        if (!pista) return;
        const destino = accion === "galeria-ir" ? indice : galeriaIndice(pista) + parseInt(el.dataset.paso, 10);
        galeriaIrA(pista, destino);
        break;
      }
      case "mas-ficha":
      case "menos-ficha": {
        const c = $("[data-ficha-form] input[name='cantidad']");
        if (!c) return;
        const v = parseInt(c.value, 10) || 1;
        c.value = Math.max(1, Math.min(99, v + (accion === "mas-ficha" ? 1 : -1)));
        break;
      }
      case "mas":
      case "menos": {
        const l = carrito[indice];
        if (!l) return;
        const otras = carrito.filter((x) => x.id === l.id && x !== l).reduce((s, x) => s + x.cantidad, 0);
        l.cantidad = Math.min(Math.max(0, maximoDe(buscarProducto(l.id)) - otras), l.cantidad + (accion === "mas" ? 1 : -1));
        if (l.cantidad <= 0) carrito.splice(indice, 1);
        guardarCarrito();
        renderCarrito();
        break;
      }
      case "quitar":
        if (carrito[indice]) carrito.splice(indice, 1);
        guardarCarrito();
        renderCarrito();
        break;
      case "vaciar":
        carrito = [];
        guardarCarrito();
        renderCarrito();
        break;
      default:
        break;
    }
  });

  document.addEventListener("submit", (e) => {
    const form = e.target.closest("[data-ficha-form]");
    if (!form) return;
    e.preventDefault();
    const p = buscarProducto(fichaActual);
    if (!p || !p.disponible || !tienePrecio(p)) return;
    const d = leerFormularioFicha();
    const sel = seleccionFicha(p, d);
    const n = agregarAlCarrito({ id: p.id, cantidad: d.cantidad, variantes: sel.variantes, personalizacion: d.personalizacion, precioUnitario: sel.precioUnitario });
    cerrarDialogos();
    aviso(n ? "Agregado. Toca «Concluir compra» cuando termines de elegir." : "Ese producto ya está en tu pedido: es pieza única");
  });

  function sincronizarFormularios(e) {
    if (e.target.closest("[data-ficha-form]")) actualizarFicha();
    const f = e.target.closest("[data-carrito-form]");
    if (f) {
      const entrega = f.querySelector("input[name='entrega']:checked");
      const nombre = f.querySelector("input[name='nombre']");
      const nota = f.querySelector("textarea[name='nota']");
      datosPedido.entrega = entrega ? entrega.value : "";
      datosPedido.nombre = nombre ? nombre.value : "";
      datosPedido.nota = nota ? nota.value : "";
      actualizarEnlacePedido();
    }
  }
  document.addEventListener("input", sincronizarFormularios);
  document.addEventListener("change", sincronizarFormularios);

  /* ---------- Datos de la tienda en la página ---------- */
  function llenarDatosTienda() {
    $$("[data-tienda]").forEach((el) => {
      const v = TIENDA[el.dataset.tienda];
      if (v) el.textContent = v;
    });
    $$("[data-whatsapp-duda]").forEach((a) => { a.href = urlWhatsApp(TIENDA.mensajes.duda); });
    const av = $("[data-aviso]");
    if (av) {
      av.textContent = TIENDA.aviso || "";
      av.hidden = !TIENDA.aviso;
    }
    if (!numeroWhatsApp() || /x/i.test(TIENDA.whatsapp)) {
      console.warn("Falta el número de WhatsApp real en js/productos.js (TIENDA.whatsapp).");
    }
  }

  /* ---------- Mapa de puntos de entrega (Leaflet + OpenStreetMap, sin llaves) ---------- */
  const MAPA_JS = "js/vendor/leaflet/leaflet.js";
  const MAPA_CSS = "js/vendor/leaflet/leaflet.css";
  const CENTRO_CIUDAD = [19.19, -96.14];
  let cargaLeaflet = null;
  const distancias = {};   // nombre del punto -> km desde el cliente
  let ubicacion = null;    // { lat, lng } del cliente, solo en memoria
  const mapas = new Map(); // contenedor -> estado del mapa

  function cargarLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (cargaLeaflet) return cargaLeaflet;
    cargaLeaflet = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = MAPA_CSS;
      document.head.appendChild(css);
      const s = document.createElement("script");
      s.src = MAPA_JS;
      s.onload = () => resolve(window.L);
      s.onerror = () => reject(new Error("No se pudo cargar el mapa"));
      document.head.appendChild(s);
    });
    return cargaLeaflet;
  }

  const tieneCoordenadas = (pt) => isFinite(pt.lat) && isFinite(pt.lng);
  const puntosConCoordenadas = () => puntosEntrega().filter(tieneCoordenadas);

  function kmEntre(a, b) {
    const R = 6371;
    const rad = (x) => x * Math.PI / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const textoKm = (km) => (km < 1 ? `a ${Math.round(km * 1000)} m` : `a ${km.toFixed(1)} km`);
  const enlaceComoLlegar = (pt) => pt.mapa
    || (tieneCoordenadas(pt) ? `https://www.google.com/maps/dir/?api=1&destination=${pt.lat},${pt.lng}` : "");

  function puntoMasCercano() {
    let mejor = null;
    puntosConCoordenadas().forEach((pt) => {
      const d = distancias[pt.nombre];
      if (d != null && (!mejor || d < distancias[mejor.nombre])) mejor = pt;
    });
    return mejor;
  }

  function popupPunto(pt) {
    const partes = [`<strong>${esc(pt.nombre)}</strong>`];
    if (pt.direccion) partes.push(esc(pt.direccion));
    if (pt.referencia) partes.push(esc(pt.referencia));
    if (pt.horario) partes.push(esc(pt.horario));
    if (distancias[pt.nombre] != null) partes.push(`<em>${esc(textoKm(distancias[pt.nombre]))} de ti</em>`);
    const link = enlaceComoLlegar(pt);
    if (link) partes.push(`<a href="${esc(link)}" target="_blank" rel="noopener">Cómo llegar</a>`);
    return partes.join("<br>");
  }

  function avisoMapa(cont, texto) {
    if (!cont) return;
    const el = $(`[data-mapa-aviso="${cont.dataset.mapa}"]`);
    if (el) el.textContent = texto || "";
  }

  function marcarCercano(estado) {
    const cercano = puntoMasCercano();
    estado.marcadores.forEach((m, i) => {
      const pt = estado.puntos[i];
      const el = m.getElement();
      if (el) el.classList.toggle("is-cercano", Boolean(cercano && cercano.nombre === pt.nombre));
      m.setPopupContent(popupPunto(pt));
    });
  }

  function pintarUsuario(estado) {
    if (!ubicacion) return;
    const { L, mapa } = estado;
    if (estado.marcadorUsuario) {
      estado.marcadorUsuario.setLatLng([ubicacion.lat, ubicacion.lng]);
    } else {
      estado.marcadorUsuario = L.circleMarker([ubicacion.lat, ubicacion.lng], {
        radius: 9, color: "#fff", weight: 3, fillColor: "#1a73e8", fillOpacity: 1
      }).addTo(mapa).bindPopup("Tú estás aquí");
    }
    marcarCercano(estado);
    const grupo = L.featureGroup(estado.marcadores.concat([estado.marcadorUsuario]));
    mapa.fitBounds(grupo.getBounds().pad(0.25));
  }

  function mostrarMapa(cont, alSeleccionar) {
    if (!cont) return Promise.resolve(null);
    cont.hidden = false;
    if (mapas.has(cont)) {
      const estado = mapas.get(cont);
      setTimeout(() => estado.mapa.invalidateSize(), 50);
      return Promise.resolve(estado);
    }
    return cargarLeaflet().then((L) => {
      if (mapas.has(cont)) return mapas.get(cont);
      const puntos = puntosConCoordenadas();
      const mapa = L.map(cont, { scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
      }).addTo(mapa);
      const marcadores = puntos.map((pt, i) => {
        const icono = L.divIcon({
          className: "mapa__pin", html: `<span>${i + 1}</span>`,
          iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -18]
        });
        const m = L.marker([pt.lat, pt.lng], { icon: icono, title: pt.nombre }).addTo(mapa);
        m.bindPopup(popupPunto(pt));
        m.on("click", () => { if (alSeleccionar) alSeleccionar(pt, false); });
        return m;
      });
      if (puntos.length) mapa.fitBounds(L.featureGroup(marcadores).getBounds().pad(0.3));
      else mapa.setView(CENTRO_CIUDAD, 12);
      const estado = { L, mapa, marcadores, puntos, marcadorUsuario: null };
      mapas.set(cont, estado);
      if (ubicacion) pintarUsuario(estado);
      return estado;
    }).catch(() => {
      cont.innerHTML = '<p class="mapa__error">No se pudo cargar el mapa. Elige tu punto en la lista.</p>';
      return null;
    });
  }

  function pedirUbicacion(boton, cont, alSeleccionar) {
    if (!navigator.geolocation) {
      avisoMapa(cont, "Tu navegador no permite ubicar tu posición. Elige el punto a mano.");
      return;
    }
    const original = boton.textContent;
    boton.disabled = true;
    boton.textContent = "Buscando tu ubicación…";
    const terminar = () => { boton.disabled = false; boton.textContent = original; };
    navigator.geolocation.getCurrentPosition((pos) => {
      ubicacion = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      puntosConCoordenadas().forEach((pt) => { distancias[pt.nombre] = kmEntre(ubicacion, pt); });
      terminar();
      const cercano = puntoMasCercano();
      mostrarMapa(cont, alSeleccionar).then((estado) => { if (estado) pintarUsuario(estado); });
      renderPuntos();
      if (cercano && alSeleccionar) alSeleccionar(cercano, true);
      avisoMapa(cont, cercano
        ? `El más cercano a ti es ${cercano.nombre}, ${textoKm(distancias[cercano.nombre])}.`
        : "No hay puntos con ubicación todavía.");
    }, (err) => {
      terminar();
      mostrarMapa(cont, alSeleccionar);
      avisoMapa(cont, err && err.code === 1
        ? "No diste permiso de ubicación. Puedes elegir el punto a mano en el mapa o en la lista."
        : "No pudimos obtener tu ubicación. Elige el punto a mano en el mapa o en la lista.");
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  /* Qué pasa al elegir un punto desde el mapa, según dónde esté el mapa */
  function seleccionadorPara(destino) {
    if (destino === "carrito") {
      return (pt, automatico) => {
        const radio = $(`[data-carrito-form] input[name='entrega'][value="${pt.nombre.replace(/"/g, '\\"')}"]`);
        if (radio) radio.checked = true;
        datosPedido.entrega = pt.nombre;
        actualizarEnlacePedido();
        if (automatico) aviso(`Elegimos el punto más cercano: ${pt.nombre}`);
      };
    }
    return (pt) => {
      $$("[data-puntos] .punto").forEach((li) => li.classList.toggle("is-cercano", li.dataset.nombre === pt.nombre));
    };
  }

  function bloqueMapa(destino, textoBoton) {
    return `
<div class="mapa-bloque mapa-bloque--${esc(destino)}">
  <div class="mapa__acciones">
    <button type="button" class="boton boton--dorado boton--chico" data-accion="mapa-ubicacion" data-mapa-destino="${esc(destino)}">${esc(textoBoton)}</button>
    <button type="button" class="boton boton--texto" data-accion="mapa-ver" data-mapa-destino="${esc(destino)}">Ver mapa</button>
  </div>
  <div class="mapa mapa--chico" data-mapa="${esc(destino)}" hidden></div>
  <p class="mapa__aviso" data-mapa-aviso="${esc(destino)}"></p>
</div>`;
  }

  /* ---------- Puntos de entrega en la página ---------- */
  function renderPuntos() {
    const cont = $("[data-puntos]");
    if (!cont) return;
    const puntos = puntosEntrega().slice();
    const seccion = cont.closest("section");
    if (!puntos.length) {
      if (seccion) seccion.hidden = true;
      return;
    }
    const cercano = puntoMasCercano();
    if (cercano) puntos.sort((a, b) => (distancias[a.nombre] ?? 1e9) - (distancias[b.nombre] ?? 1e9));
    cont.innerHTML = puntos.map((pt) => {
      const d = distancias[pt.nombre];
      const link = enlaceComoLlegar(pt);
      return `
<li class="punto${cercano && cercano.nombre === pt.nombre ? " is-cercano" : ""}" data-nombre="${esc(pt.nombre)}">
  <strong class="punto__nombre">${esc(pt.nombre)}</strong>
  ${pt.direccion ? `<span class="punto__dato">${esc(pt.direccion)}</span>` : ""}
  ${pt.referencia ? `<span class="punto__dato">${esc(pt.referencia)}</span>` : ""}
  ${pt.horario ? `<span class="punto__dato">${esc(pt.horario)}</span>` : ""}
  ${d != null ? `<span class="punto__distancia">${esc(textoKm(d))}${cercano && cercano.nombre === pt.nombre ? ", el más cercano" : ""}</span>` : ""}
  ${link ? `<a class="punto__mapa" href="${esc(link)}" target="_blank" rel="noopener">Cómo llegar</a>` : ""}
</li>`;
    }).join("");
  }

  /* El mapa de la sección se carga solo cuando el visitante llega a ella */
  function prepararMapaPagina() {
    const cont = $('[data-mapa="pagina"]');
    if (!cont || !puntosConCoordenadas().length) {
      if (cont) cont.closest(".mapa-bloque").hidden = true;
      return;
    }
    const abrir = () => mostrarMapa(cont, seleccionadorPara("pagina"));
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entradas) => {
        if (entradas.some((e) => e.isIntersecting)) { io.disconnect(); abrir(); }
      }, { rootMargin: "200px" });
      io.observe(cont);
    } else {
      abrir();
    }
  }

  /* ---------- Datos estructurados para Google ---------- */
  function datosEstructurados() {
    const base = location.origin + location.pathname;
    const carpeta = location.origin + location.pathname.replace(/[^/]*$/, "");
    const datos = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": PRODUCTOS.map((p, i) => {
        const img = imagenPrincipal(p);
        return {
          "@type": "ListItem",
          "position": i + 1,
          "item": {
            "@type": "Product",
            "name": p.nombre,
            "description": p.descripcionCorta || p.descripcion || "",
            "image": /^https?:/.test(img) ? img : carpeta + img,
            "url": base + "#p-" + p.id,
            "brand": { "@type": "Brand", "name": TIENDA.nombre },
            "offers": tienePrecio(p) ? {
              "@type": "Offer",
              "price": precioMinimo(p),
              "priceCurrency": TIENDA.moneda || "MXN",
              "availability": p.disponible ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              "url": base + "#p-" + p.id
            } : undefined
          }
        };
      })
    };
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.textContent = JSON.stringify(datos);
    document.head.appendChild(s);
  }

  /* ---------- Arranque ---------- */
  function init() {
    llenarDatosTienda();
    renderFiltros();
    renderCatalogo();
    renderPuntos();
    prepararMapaPagina();
    actualizarContador();
    datosEstructurados();
    if (location.hash.indexOf("#p-") === 0) abrirFicha(location.hash.slice(3));
  }

  init();
})();
