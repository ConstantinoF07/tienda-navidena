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

  function agregarAlCarrito(linea) {
    const existente = carrito.find((l) => mismaLinea(l, linea));
    if (existente) existente.cantidad += linea.cantidad;
    else carrito.push(linea);
    guardarCarrito();
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
    if (punto) partes.push(`*Recoger en:* ${punto.nombre}${punto.direccion ? " (" + punto.direccion + ")" : ""}`);
    if (datosPedido.nombre.trim()) partes.push(`*Nombre:* ${datosPedido.nombre.trim()}`);
    if (datosPedido.nota.trim()) partes.push(`*Comentarios:* ${datosPedido.nota.trim()}`);
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
      ${conPrecio ? `<button type="button" class="boton boton--primario" data-accion="${accionPrincipal}" data-id="${esc(p.id)}"${p.disponible ? "" : " disabled"}>${textoPrincipal}</button>` : ""}
      <a class="boton boton--whatsapp${conPrecio ? "" : " boton--ancho"}" href="${esc(urlWhatsApp(mensajeInteres(p)))}" target="_blank" rel="noopener">${conPrecio ? "Lo quiero" : "Preguntar precio"}</a>
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
    <p class="ficha__descripcion">${esc(p.descripcion || p.descripcionCorta || "")}</p>
    ${detalles.length ? `<dl class="detalles">${detalles.map((d) => `<dt>${esc(d[0])}</dt><dd>${esc(d[1])}</dd>`).join("")}</dl>` : ""}
    <form class="ficha__form" data-ficha-form>
      ${bloquePresentaciones}
      ${variantes}
      ${personal}
      ${conPrecio ? `<label class="campo"><span>Cantidad</span>
        <span class="cantidad">
          <button type="button" data-accion="menos-ficha" aria-label="Menos">&minus;</button>
          <input type="number" name="cantidad" min="1" max="99" value="1" inputmode="numeric">
          <button type="button" data-accion="mas-ficha" aria-label="Más">+</button>
        </span>
      </label>` : ""}
      <div class="acciones">
        ${conPrecio ? `<button type="submit" class="boton boton--primario"${p.disponible ? "" : " disabled"}>${p.disponible ? "Agregar al carrito" : "Agotado"}</button>` : ""}
        <a class="boton boton--whatsapp${conPrecio ? "" : " boton--ancho"}" data-ficha-interes href="${esc(urlWhatsApp(mensajeInteres(p)))}" target="_blank" rel="noopener">${conPrecio ? "Lo quiero por WhatsApp" : "Preguntar precio por WhatsApp"}</a>
      </div>
    </form>
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
    $$("[data-combinar]").forEach((f) => { f.hidden = f.dataset.combinar !== d.presentacion; });
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
    <span class="cantidad">
      <button type="button" data-accion="menos" data-indice="${i}" aria-label="Quitar uno">&minus;</button>
      <span>${l.cantidad}</span>
      <button type="button" data-accion="mas" data-indice="${i}" aria-label="Agregar uno">+</button>
    </span>
    <button type="button" class="linea__quitar" data-accion="quitar" data-indice="${i}">Quitar</button>
  </div>
</li>`;
    }).join("");

    const entregas = puntosEntrega().map((pt, i) => {
      const marcada = pt.nombre === datosPedido.entrega || (!datosPedido.entrega && i === 0);
      const detalle = [pt.direccion, pt.horario].filter(Boolean).join(". ");
      return `<label class="opcion"><input type="radio" name="entrega" value="${esc(pt.nombre)}"${marcada ? " checked" : ""}> <span><strong>${esc(pt.nombre)}</strong>${detalle ? `<small>${esc(detalle)}</small>` : ""}</span></label>`;
    }).join("");

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
  <a class="boton boton--whatsapp boton--grande" data-carrito-pedir href="${esc(urlWhatsApp(mensajePedido()))}" target="_blank" rel="noopener">Pedir por WhatsApp</a>
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
        agregarAlCarrito({ id: p.id, cantidad: 1, variantes: {}, personalizacion: "", precioUnitario: Number(p.precio) || 0 });
        aviso(`${p.nombre} agregado al carrito`);
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
        l.cantidad += accion === "mas" ? 1 : -1;
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
    agregarAlCarrito({ id: p.id, cantidad: d.cantidad, variantes: sel.variantes, personalizacion: d.personalizacion, precioUnitario: sel.precioUnitario });
    cerrarDialogos();
    aviso(`${p.nombre} agregado al carrito`);
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

  /* ---------- Puntos de entrega en la página ---------- */
  function renderPuntos() {
    const cont = $("[data-puntos]");
    if (!cont) return;
    const puntos = puntosEntrega();
    const seccion = cont.closest("section");
    if (!puntos.length) {
      if (seccion) seccion.hidden = true;
      return;
    }
    cont.innerHTML = puntos.map((pt) => `
<li class="punto">
  <strong class="punto__nombre">${esc(pt.nombre)}</strong>
  ${pt.direccion ? `<span class="punto__dato">${esc(pt.direccion)}</span>` : ""}
  ${pt.horario ? `<span class="punto__dato">${esc(pt.horario)}</span>` : ""}
  ${pt.mapa ? `<a class="punto__mapa" href="${esc(pt.mapa)}" target="_blank" rel="noopener">Ver en el mapa</a>` : ""}
</li>`).join("");
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
    actualizarContador();
    datosEstructurados();
    if (location.hash.indexOf("#p-") === 0) abrirFicha(location.hash.slice(3));
  }

  init();
})();
