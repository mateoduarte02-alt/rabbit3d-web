// ═══════════════════════════════════════════════════
// catalogo.js — La Madriguera
// ═══════════════════════════════════════════════════

    //  CARGAR Y RENDERIZAR PRODUCTOS
    //  — ordena por campo "orden" (si existe), luego por id
    //  — al actualizar NO modifica la posición visual porque
    //    el orden viene de la BD y no se recalcula automáticamente
    // ══════════════════════════════════════════
    async function cargarProductos() {
      divProductos.innerHTML = '<p class="cargando">Cargando diseños...</p>'

      // Ordenar solo por id en la query (evita errores si 'orden' no existe o no tiene índice)
      // El orden visual se aplica después en JS con el campo orden
      const { data, error } = await supabase.from('productos').select('*').order('published_at', { ascending: false, nullsFirst: false }).order('id', { ascending: false })

      if (error) {
        divProductos.innerHTML = '<p class="cargando">Error al cargar productos. Verificá las políticas de acceso en Supabase.</p>'
        console.error('Supabase error:', error)
        return
      }

      productos = data || []
      statTotal.textContent = productos.length
      renderProductos()
    }

    function renderProductos(reset = true) {
      if (reset) paginaProductos = 1

      let filtrados = categoriaActual === 'todos'
        ? [...productos]
        : productos.filter(p => p.categoria === categoriaActual)
      if (filtroPrecios === 'gratis') filtrados = filtrados.filter(p => !p.precio || Number(p.precio) === 0)
      if (filtroPrecios === 'pago')   filtrados = filtrados.filter(p => p.precio && Number(p.precio) > 0)
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase()
        filtrados = filtrados.filter(p => p.nombre && p.nombre.toLowerCase().includes(q))
      }
      if (temaActual) {
        const t = tematicas.find(x => String(x.id) === temaActual)
        if (t) filtrados = filtrados.filter(p => matchTema(p, t.palabras))
      }

      // Ordenamiento
      if (ordenActual === 'descargas') {
        filtrados.sort((a, b) => (Number(b.descargas) || 0) - (Number(a.descargas) || 0))
      } else {
        // 'llegada': más nuevos primero por fecha de publicación en Cults
        filtrados.sort((a, b) => {
          const da = a.published_at ? new Date(a.published_at).getTime() : 0
          const db = b.published_at ? new Date(b.published_at).getTime() : 0
          if (db !== da) return db - da
          return Number(b.id) - Number(a.id)
        })
      }

      if (filtrados.length === 0) {
        divProductos.innerHTML = '<p class="cargando">No se encontraron diseños.</p>'
        return
      }

      // Paginación: mostrar hasta paginaProductos * POR_PAGINA
      const total      = filtrados.length
      const mostrar    = paginaProductos * POR_PAGINA
      const visibles   = filtrados.slice(0, mostrar)
      const hayMas     = total > mostrar

      divProductos.innerHTML = visibles.map((p, i) => {
        const precio = Number(p.precio)
        const precioTexto = precio === 0 ? 'Gratis' : `$${precio.toFixed(2)} USD`
        const esGratis = precio === 0
        return `
        <article class="card" data-id="${p.id}" data-cat="${p.categoria}" onclick="window.abrirDetalle('${p.id}')" style="cursor:pointer">
          <div class="card__img-wrap">
            ${p.imagen_url
              ? (p.imagen_url.match(/\.mp4(\?|$)/i)
                ? `<video src="${p.imagen_url}" class="card__img card__video lazy-video" muted loop playsinline preload="none"></video>`
                : `<img src="${p.imagen_url}" alt="${p.nombre}" class="card__img"/>`)
              : `<div class="card__placeholder">3D</div>`}
            <span class="card__num">${String(i+1).padStart(2,'0')}</span>
            <span class="card__badge">${labelCategoria(p.categoria)}</span>
            ${esGratis ? `<span class="card__badge-gratis">Gratis</span>` : ''}
            <div class="card__overlay">
              <p class="card__nombre-overlay">${p.nombre}</p>
              <p class="card__precio-overlay">${precioTexto}</p>
              ${Number(p.descargas) > 0 ? `<p class="card__descargas-overlay">↓ ${Number(p.descargas).toLocaleString()}</p>` : ''}
            </div>
            ${esAdmin ? `
              <div class="card__admin-btns" onclick="event.stopPropagation()">
                <button class="card__admin-btn" onclick="window.editarProducto('${p.id}')">Editar</button>
                <button class="card__admin-btn card__admin-btn--danger" onclick="window.eliminarProducto('${p.id}')">Eliminar</button>
              </div>` : ''}
          </div>
          <div class="card__body">
            <h3 class="card__nombre">${p.nombre}</h3>
            <div class="card__footer">
              <span class="card__precio ${esGratis ? 'card__precio--gratis' : ''}">${precioTexto}</span>
              <div class="card__acciones" onclick="event.stopPropagation()">
                ${p.cults_url ? `<a href="${p.cults_url}" target="_blank" class="card__accion-btn card__accion-btn--cults card__accion-btn--descarga" title="Descargar en Cults3D" onclick="event.stopPropagation()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </a>` : ''}
                <button class="card__accion-btn ${favoritos.includes(String(p.id)) ? 'activo' : ''}" onclick="window.toggleFavorito('${p.id}')" title="Favorito">
                  <svg viewBox="0 0 24 24" fill="${favoritos.includes(String(p.id)) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
              </div>
            </div>
          </div>
        </article>`
      }).join('')

      // Activar autoplay-en-viewport de los videos de portada recién insertados
      if (window._observarVideosLazy) setTimeout(window._observarVideosLazy, 50)

      // Botón "Ver más" — muestra 100 más en cada click
      if (hayMas) {
        divProductos.insertAdjacentHTML('beforeend', `
          <div class="ver-mas-wrap" id="verMasWrap" style="grid-column:1/-1">
            <button class="btn-ver-mas" id="btnVerMas">
              Ver más
              <span class="ver-mas-count">${visibles.length} de ${total}</span>
            </button>
          </div>`)
        const handleVerMas = () => {
          // Quitar botón actual
          const wrap = document.getElementById('verMasWrap')
          if (wrap) wrap.remove()
          // Calcular rango de nuevos items a agregar (hasta 100 más)
          const yaVisibles = paginaProductos * POR_PAGINA
          const VER_MAS_CANTIDAD = 100
          paginaProductos++
          const nuevosTotal = Math.min(filtrados.length, yaVisibles + VER_MAS_CANTIDAD)
          const nuevos = filtrados.slice(yaVisibles, nuevosTotal)
          const hayMasAun = filtrados.length > nuevosTotal
          // Agregar nuevas cards con animación
          nuevos.forEach((p, idx) => {
            const i = yaVisibles + idx
            const precio = Number(p.precio)
            const precioTexto = precio === 0 ? 'Gratis' : `$${precio.toFixed(2)} USD`
            const esGratis = precio === 0
            const art = document.createElement('article')
            art.className = 'card card--reveal'
            art.dataset.id  = p.id
            art.dataset.cat = p.categoria
            art.style.cursor = 'pointer'
            art.style.animationDelay = `${(idx % 20) * 30}ms`
            art.setAttribute('onclick', `window.abrirDetalle('${p.id}')`)
            art.innerHTML = `
                  <div class="card__img-wrap">
                ${p.imagen_url
                  ? (p.imagen_url.match(/\.mp4(\?|$)/i)
                    ? `<video src="${p.imagen_url}" class="card__img card__video lazy-video" muted loop playsinline preload="none"></video>`
                    : `<img src="${p.imagen_url}" alt="${p.nombre}" class="card__img"/>`)
                  : `<div class="card__placeholder">3D</div>`}
                <span class="card__num">${String(i+1).padStart(2,'0')}</span>
                <span class="card__badge">${labelCategoria(p.categoria)}</span>
                ${esGratis ? `<span class="card__badge-gratis">Gratis</span>` : ''}
                <div class="card__overlay">
                  <p class="card__nombre-overlay">${p.nombre}</p>
                  <p class="card__precio-overlay">${precioTexto}</p>
                  ${Number(p.descargas) > 0 ? `<p class="card__descargas-overlay">↓ ${Number(p.descargas).toLocaleString()}</p>` : ''}
                </div>
                ${esAdmin ? `
                  <div class="card__admin-btns" onclick="event.stopPropagation()">
                    <button class="card__admin-btn" onclick="window.editarProducto('${p.id}')">Editar</button>
                    <button class="card__admin-btn card__admin-btn--danger" onclick="window.eliminarProducto('${p.id}')">Eliminar</button>
                  </div>` : ''}
              </div>
              <div class="card__body">
                <h3 class="card__nombre">${p.nombre}</h3>
                <div class="card__footer">
                  <span class="card__precio ${esGratis ? 'card__precio--gratis' : ''}">${precioTexto}</span>
                  <div class="card__acciones" onclick="event.stopPropagation()">
                    ${p.cults_url ? `<a href="${p.cults_url}" target="_blank" class="card__accion-btn card__accion-btn--cults card__accion-btn--descarga" title="Descargar en Cults3D" onclick="event.stopPropagation()">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </a>` : ''}
                    <button class="card__accion-btn ${favoritos.includes(String(p.id)) ? 'activo' : ''}" onclick="window.toggleFavorito('${p.id}')" title="Favorito">
                      <svg viewBox="0 0 24 24" fill="${favoritos.includes(String(p.id)) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    </button>
                  </div>
                </div>
              </div>`
            divProductos.appendChild(art)
          })
          // Activar autoplay-en-viewport de los videos recién agregados
          if (window._observarVideosLazy) setTimeout(window._observarVideosLazy, 50)
          // Nuevo botón si aún quedan más
          if (hayMasAun) {
            divProductos.insertAdjacentHTML('beforeend', `
              <div class="ver-mas-wrap" id="verMasWrap" style="grid-column:1/-1">
                <button class="btn-ver-mas" id="btnVerMas">
                  Ver más
                  <span class="ver-mas-count">${nuevosTotal} de ${filtrados.length}</span>
                </button>
              </div>`)
            document.getElementById('btnVerMas').addEventListener('click', handleVerMas)
          }
            }
        document.getElementById('btnVerMas').addEventListener('click', handleVerMas)
      }

    }

    function labelCategoria(cat) {
      const labels = { cuadros: 'Cuadros 2D', llaveros: 'Llaveros', cortantes: 'Cortantes', otros: 'Otros' }
      return labels[cat] || cat
    }


    document.getElementById('buscador').addEventListener('input', e => {
      const val = e.target.value
      // Ignorar si el valor parece un email (autocomplete del navegador)
      if (val.includes('@') && val.includes('.') && !val.includes(' ')) {
        e.target.value = ''
        busqueda = ''
      } else {
        busqueda = val
      }
      paginaProductos = 1
      renderProductos()
    })
    // También limpiar en focus por si el autocomplete llena después
    document.getElementById('buscador').addEventListener('focus', e => {
      if (e.target.value.includes('@')) {
        e.target.value = ''
        busqueda = ''
        renderProductos()
      }
    })
    document.getElementById('selectOrden').addEventListener('change', e => {
      ordenActual = e.target.value
      paginaProductos = 1
      renderProductos()
    })
    document.querySelectorAll('.filtro-precio').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filtro-precio').forEach(b => b.classList.remove('activo'))
        btn.classList.add('activo')
        filtroPrecios = btn.dataset.precio
        paginaProductos = 1
        renderProductos()
      })
    })
    document.querySelectorAll('.filtro').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filtro').forEach(b => b.classList.remove('activo'))
        btn.classList.add('activo')
        categoriaActual = btn.dataset.cat
        paginaProductos = 1
        renderProductos()
      })
    })

    // ══════════════════════════════════════════
