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
      const { data, error } = await supabase.from('productos').select('*').order('id', { ascending: false })

      if (error) {
        divProductos.innerHTML = '<p class="cargando">Error al cargar productos. Verificá las políticas de acceso en Supabase.</p>'
        console.error('Supabase error:', error)
        return
      }

      // Guardar sin ordenar — el orden se aplica en renderProductos según ordenActual
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
        // 'llegada': más nuevos primero, ignorar campo orden completamente
        filtrados.sort((a, b) => b.id - a.id)
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
          <span class="card__drag-handle" title="Arrastrá para reordenar">⠿</span>
          <div class="card__img-wrap">
            ${p.imagen_url
              ? (p.imagen_url.match(/\.mp4(\?|$)/i)
                ? `<video src="${p.imagen_url}" class="card__img card__video lazy-video" muted loop playsinline preload="none" onmouseenter="this.play()" onmouseleave="this.pause();this.currentTime=0"></video>`
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
              <span class="card__drag-handle" title="Arrastrá para reordenar">⠿</span>
              <div class="card__img-wrap">
                ${p.imagen_url
                  ? (p.imagen_url.match(/\.mp4(\?|$)/i)
                    ? `<video src="${p.imagen_url}" class="card__img card__video lazy-video" muted loop playsinline preload="none" onmouseenter="this.play()" onmouseleave="this.pause();this.currentTime=0"></video>`
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
          if (esAdmin) initDragDrop()
        }
        document.getElementById('btnVerMas').addEventListener('click', handleVerMas)
      }

      if (esAdmin) initDragDrop()
    }

    function labelCategoria(cat) {
      const labels = { cuadros: 'Cuadros 2D', llaveros: 'Llaveros', cortantes: 'Cortantes', otros: 'Otros' }
      return labels[cat] || cat
    }

    // ══════════════════════════════════════════
    //  DRAG AND DROP PARA REORDENAR EN GRILLA
    // ══════════════════════════════════════════
    let _dragDropInit = false
    function initDragDrop() {
      const grid = document.getElementById('productos')
      grid.classList.add('drag-mode')
      // Usar delegación de eventos — solo UNA vez, no por cada render
      if (_dragDropInit) {
        // Ya inicializado, solo marcar cards como draggable
        grid.querySelectorAll('.card').forEach(c => c.setAttribute('draggable','true'))
        return
      }
      _dragDropInit = true
      let dragSrc = null

      grid.addEventListener('dragstart', e => {
        const card = e.target.closest('.card')
        if (!card) return
        dragSrc = card
        card.classList.add('dragging')
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', card.dataset.id)
      })
      grid.addEventListener('dragend', e => {
        const card = e.target.closest('.card')
        if (card) card.classList.remove('dragging')
        grid.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'))
      })
      grid.addEventListener('dragover', e => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        const card = e.target.closest('.card')
        if (card && card !== dragSrc) {
          grid.querySelectorAll('.drag-over').forEach(c => c.classList.remove('drag-over'))
          card.classList.add('drag-over')
        }
      })
      grid.addEventListener('dragleave', e => {
        const card = e.target.closest('.card')
        if (card) card.classList.remove('drag-over')
      })
      grid.addEventListener('drop', async e => {
        e.preventDefault()
        e.stopPropagation()
        const card = e.target.closest('.card')
        if (!card) return
        card.classList.remove('drag-over')
        if (!dragSrc || dragSrc === card) return
        const allCards = [...grid.querySelectorAll('.card')]
        const srcIdx = allCards.indexOf(dragSrc)
        const dstIdx = allCards.indexOf(card)
        if (srcIdx < dstIdx) grid.insertBefore(dragSrc, card.nextSibling)
        else grid.insertBefore(dragSrc, card)
        await guardarOrden()
      })
      // Marcar cards actuales como draggable
      grid.querySelectorAll('.card').forEach(c => c.setAttribute('draggable','true'))
    }

    async function guardarOrden() {
      const cards = document.querySelectorAll('#productos .card')
      const updates = [...cards].map((card, i) => ({
        id: card.dataset.id,
        orden: i
      }))
      // Actualizar cada producto con su nuevo orden
      for (const u of updates) {
        await supabase.from('productos').update({ orden: u.orden }).eq('id', u.id)
      }
      // Recargar sin mover la posición visual (el orden ya está en la BD)
      const { data } = await supabase.from('productos').select('*').order('orden', { ascending: true })
      productos = (data || []).sort((a, b) => {
        const oa = a.orden ?? 999999
        const ob = b.orden ?? 999999
        return oa - ob
      })
      statTotal.textContent = productos.length
      // No re-renderizar para no perder la posición visual actual
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
