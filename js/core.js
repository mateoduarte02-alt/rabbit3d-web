// ═══════════════════════════════════════════════════
// core.js — La Madriguera
// ═══════════════════════════════════════════════════


    // supabase — var para no colisionar con window.supabase del CDN
    var createClient = window.supabase.createClient

    const SUPABASE_URL = 'https://jcrpxrfjenjdgqtwkiyw.supabase.co'
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcnB4cmZqZW5qZGdxdHdraXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzAzMDYsImV4cCI6MjA5MDg0NjMwNn0.eygcb6oGMkXRUXoJUCs_9B5yr5doF3LrQn9C1-eYHpE'
    var supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    let esAdmin = false
    let categoriaActual = 'todos'
    let filtroPrecios   = 'todos'
    let ordenActual     = 'llegada'
    let paginaProductos  = 1
    const POR_PAGINA     = 20
    let busqueda = ''
    let productos = []
    let perfilId = null
    let perfilData = null
    let disenadorData = null
    let productoDetalleActual = null

    // Favoritos en localStorage
    let favoritos = (() => {
      try {
        const raw = JSON.parse(localStorage.getItem('r3d_favoritos') || '[]')
        return Array.isArray(raw) ? raw.filter(x => x && String(x).trim() !== '') : []
      } catch(e) { return [] }
    })()



    function guardarFavoritos() { localStorage.setItem('r3d_favoritos', JSON.stringify(favoritos)) }

    function actualizarBadges() {
      document.getElementById('badgeFavoritos').textContent = favoritos.length
      document.getElementById('badgeFavoritos').style.display = favoritos.length > 0 ? 'flex' : 'none'
    }

    window.toggleFavorito = (id) => {
      id = String(id)
      if (favoritos.includes(id)) { favoritos = favoritos.filter(x => x !== id) }
      else { favoritos.push(id) }
      guardarFavoritos()
      actualizarBadges()
      renderProductos()
    }

    window.toggleFavoritoDetalle = () => {
      if (!productoDetalleActual) return
      window.toggleFavorito(productoDetalleActual)
      actualizarBotonesDetalle()
    }

    function actualizarBotonesDetalle() {
      const id = String(productoDetalleActual)
      const btnFav = document.getElementById('detalleToggleFav')
      if (favoritos.includes(id)) {
        btnFav.classList.add('activo')
        btnFav.querySelector('svg').setAttribute('fill', 'currentColor')
      } else {
        btnFav.classList.remove('activo')
        btnFav.querySelector('svg').setAttribute('fill', 'none')
      }
    }

    // Panel favoritos
    document.getElementById('btnFavoritos').addEventListener('click', () => {
      const lista = document.getElementById('listaFavoritos')
      const items = favoritos.map(id => productos.find(p => String(p.id) === id)).filter(Boolean)
      if (items.length === 0) {
        lista.innerHTML = '<p class="lista-vacia">No tenés diseños favoritos todavía.<br>Hacé clic en el corazón de cualquier diseño.</p>'
      } else {
        lista.innerHTML = items.map(p => `
          <div class="lista-item" onclick="window.abrirDetalle('${p.id}');document.getElementById('modalFavoritos').classList.remove('activo')">
            <div class="lista-item__img">${p.imagen_url ? `<img src="${p.imagen_url}"/>` : '<span>3D</span>'}</div>
            <div class="lista-item__info">
              <p class="lista-item__nombre">${p.nombre}</p>
              <p class="lista-item__precio">$${Number(p.precio).toFixed(2)} USD</p>
            </div>
            <button class="lista-item__remove" onclick="event.stopPropagation();window.toggleFavorito('${p.id}');document.getElementById('btnFavoritos').click()" title="Quitar">✕</button>
          </div>`).join('')
      }
      document.getElementById('modalFavoritos').classList.add('activo')
    })
    document.getElementById('btnCerrarFavoritos').addEventListener('click', () => {
      document.getElementById('modalFavoritos').classList.remove('activo')
    })

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('activo')
      })
    })

    const divProductos  = document.getElementById('productos')
    const adminBar      = document.getElementById('adminBar')
    // modalLogin eliminado — auth unificada
    const modalProducto = document.getElementById('modalProducto')
    const modalPerfil   = document.getElementById('modalPerfil')
    // loginError eliminado — auth unificada
    const productoError = document.getElementById('productoError')
    const perfilError   = document.getElementById('perfilError')
    const statTotal     = document.getElementById('statTotal')

    // ══════════════════════════════════════════
    //  PERFIL
    // ══════════════════════════════════════════
    // ── Compresión de imágenes antes de subir a Storage ─────────────────
    // Reduce el peso de las fotos para minimizar el egress de Supabase
    async function comprimirImagen(file, maxW=800, maxH=800, quality=0.78) {
      return new Promise(resolve => {
        // Videos y SVG no se comprimen
        if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
          resolve(file); return
        }
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
          URL.revokeObjectURL(url)
          let w = img.width, h = img.height
          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW/w, maxH/h)
            w = Math.round(w * ratio); h = Math.round(h * ratio)
          }
          const canvas = document.createElement('canvas')
          canvas.width = w; canvas.height = h
          const ctx = canvas.getContext('2d')

          // Detectar si el archivo tiene transparencia (PNG, WEBP, GIF)
          const hasAlpha = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif'

          if (hasAlpha) {
            // Mantener como PNG para preservar transparencia — NO agregar fondo
            ctx.drawImage(img, 0, 0, w, h)
            canvas.toBlob(blob => {
              if (!blob || blob.size >= file.size) { resolve(file); return }
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.png'), { type: 'image/png' }))
            }, 'image/png')
          } else {
            // JPEG: agregar fondo blanco para evitar fondo negro en transparencias residuales
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, w, h)
            ctx.drawImage(img, 0, 0, w, h)
            canvas.toBlob(blob => {
              if (!blob || blob.size >= file.size) { resolve(file); return }
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
            }, 'image/jpeg', quality)
          }
        }
        img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
        img.src = url
      })
    }

    async function cargarPerfil() {
      const { data, error } = await supabase.from('perfil').select('*').limit(1)
      if (error || !data || data.length === 0) return
      const p = data[0]
      perfilData = p
      perfilId = p.id
      if (p.nombre) document.getElementById('perfilNombreVista').textContent = p.nombre
      if (p.descripcion) document.getElementById('perfilDescVista').textContent = p.descripcion

      // Foto de perfil guardada
      if (p.foto_perfil) {
        const img = document.getElementById('sobreMiAvatarImg')
        const txt = document.getElementById('sobreMiAvatarTexto')
        img.src = p.foto_perfil
        img.style.display = 'block'
        if (txt) txt.style.display = 'none'
      }


      const links = document.getElementById('contactoLinks')
      links.innerHTML = ''
      if (p.instagram) links.innerHTML += `
        <a href="${p.instagram}" target="_blank" class="contacto__btn contacto__btn--instagram">
          <svg class="social-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.975-.975 2.242-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.333.014 7.053.072 5.775.13 4.602.402 3.635 1.368 2.668 2.335 2.396 3.508 2.338 4.786 2.28 6.066 2.163 6.474 2.163 12c0 5.526.117 5.934.175 7.214.058 1.278.33 2.451 1.297 3.418.967.967 2.14 1.239 3.418 1.297C8.333 23.986 8.741 24 12 24s3.667-.014 4.947-.072c1.278-.058 2.451-.33 3.418-1.297.967-.967 1.239-2.14 1.297-3.418.058-1.28.072-1.688.072-7.214 0-5.526-.014-5.934-.072-7.214-.058-1.278-.33-2.451-1.297-3.418C19.398.402 18.225.13 16.947.072 15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
          Instagram
        </a>`
      if (p.telegram) links.innerHTML += `
        <a href="${p.telegram}" target="_blank" class="contacto__btn contacto__btn--telegram">
          <svg class="social-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          Telegram
        </a>`
      if (p.tiktok) links.innerHTML += `
        <a href="${p.tiktok}" target="_blank" class="contacto__btn contacto__btn--tiktok">
          <svg class="social-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
          TikTok
        </a>`
    }

    document.getElementById('btnEditarPerfil').addEventListener('click', async () => {
      const { data } = await supabase.from('perfil').select('*').limit(1)
      if (data && data.length > 0) {
        const p = data[0]
        document.getElementById('perfilNombre').value    = p.nombre || ''
        document.getElementById('perfilDesc').value      = p.descripcion || ''
        document.getElementById('perfilInstagram').value = p.instagram || ''
        document.getElementById('perfilTelegram').value  = p.telegram || ''
        document.getElementById('perfilTiktok').value    = p.tiktok || ''
      }
      perfilError.textContent = ''
      modalPerfil.classList.add('activo')
    })
    document.getElementById('btnCerrarPerfil').addEventListener('click', () => modalPerfil.classList.remove('activo'))

    document.getElementById('btnGuardarPerfil').addEventListener('click', async () => {
      const datos = {
        nombre:      document.getElementById('perfilNombre').value.trim(),
        descripcion: document.getElementById('perfilDesc').value.trim(),
        instagram:   document.getElementById('perfilInstagram').value.trim(),
        telegram:    document.getElementById('perfilTelegram').value.trim(),
        tiktok:      document.getElementById('perfilTiktok').value.trim(),
      }
      perfilError.textContent = ''
      let error
      if (perfilId) {
        ;({ error } = await supabase.from('perfil').update(datos).eq('id', perfilId))
      } else {
        const res = await supabase.from('perfil').insert([datos]).select()
        error = res.error
        if (!error && res.data && res.data[0]) perfilId = res.data[0].id
      }
      if (error) { perfilError.textContent = 'Error al guardar el perfil: ' + error.message; return }
      modalPerfil.classList.remove('activo')
      await cargarPerfil()
    })

    // ══════════════════════════════════════════
    //  PERFIL DISEÑADOR (modal de detalle)
    // ══════════════════════════════════════════
    async function cargarDisenador() {
      const { data } = await supabase.from('perfil_disenador').select('*').limit(1)
      if (data && data.length > 0) disenadorData = data[0]
    }

    document.getElementById('btnEditarDisenador').addEventListener('click', async () => {
      const preview = document.getElementById('uploadDisenadorPreview')
      document.getElementById('disenadorDesc').value = disenadorData?.descripcion || ''
      document.getElementById('disenadorError').textContent = ''
      if (disenadorData?.foto_url) {
        preview.innerHTML = `<img src="${disenadorData.foto_url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"/>`
      } else {
        preview.innerHTML = `<span class="upload-icon">↑</span><span class="upload-texto">Subir foto</span><span class="upload-sub">PNG, JPG o WEBP</span>`
      }
      document.getElementById('modalDisenador').classList.add('activo')
    })
    document.getElementById('btnCerrarDisenador').addEventListener('click', () => {
      document.getElementById('modalDisenador').classList.remove('activo')
    })

    // Upload foto diseñador
    document.getElementById('uploadDisenadorWrap').addEventListener('click', () => {
      document.getElementById('disenadorFotoFile').click()
    })
    document.getElementById('disenadorFotoFile').addEventListener('change', async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const preview = document.getElementById('uploadDisenadorPreview')
      preview.innerHTML = '<span class="upload-texto">Subiendo foto...</span>'
      const ext = file.name.split('.').pop()
      const fileName = `disenador_${Date.now()}.jpg`
      const fileToUpload = await comprimirImagen(file, 600, 600, 0.80)
      const { error: upErr } = await supabase.storage.from('media').upload(fileName, fileToUpload, { upsert: true })
      if (upErr) {
        preview.innerHTML = `<span class="upload-icon">↑</span><span class="upload-texto" style="color:#d94060">Error al subir.</span>`
        return
      }
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName)
      preview.innerHTML = `<img src="${urlData.publicUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"/>`
      // Guardar URL temporalmente en el input oculto
      document.getElementById('uploadDisenadorWrap').dataset.fotoUrl = urlData.publicUrl
    })

    document.getElementById('btnGuardarDisenador').addEventListener('click', async () => {
      const desc    = document.getElementById('disenadorDesc').value.trim()
      const fotoUrl = document.getElementById('uploadDisenadorWrap').dataset.fotoUrl || disenadorData?.foto_url || null
      const errEl   = document.getElementById('disenadorError')
      errEl.textContent = ''
      const datos = { descripcion: desc, foto_url: fotoUrl }
      let error
      if (disenadorData?.id) {
        ;({ error } = await supabase.from('perfil_disenador').update(datos).eq('id', disenadorData.id))
      } else {
        const res = await supabase.from('perfil_disenador').insert([datos]).select()
        error = res.error
        if (!error && res.data?.[0]) disenadorData = res.data[0]
      }
      if (error) { errEl.textContent = 'Error al guardar: ' + error.message; return }
      await cargarDisenador()
      document.getElementById('modalDisenador').classList.remove('activo')
      delete document.getElementById('uploadDisenadorWrap').dataset.fotoUrl
    })


    document.getElementById('btnCerrarDetalle').addEventListener('click', () => {
      document.getElementById('modalDetalle').classList.remove('activo')
    })

    window.abrirDetalle = async (id) => {
      const p = productos.find(x => String(x.id) === String(id))
      if (!p) return
      productoDetalleActual = String(p.id)
      const imgWrap = document.getElementById('detalleImgWrap')
      imgWrap.innerHTML = p.imagen_url
        ? (p.imagen_url.match(/\.mp4(\?|$)/i)
            ? `<video src="${p.imagen_url}" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;" autoplay muted loop playsinline></video>`
            : `<img src="${p.imagen_url}" alt="${p.nombre}" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<div class=\\'card__placeholder\\' style=\\'height:100%\\'>3D</div>')"/>`)
        : `<div class="card__placeholder" style="height:100%;">3D</div>`
      document.getElementById('detalleBadge').textContent = labelCategoria(p.categoria)
      document.getElementById('detalleNombre').textContent = p.nombre
      document.getElementById('detalleDesc').textContent = p.descripcion || 'Sin descripción.'

      // Precio
      const precio = Number(p.precio)
      document.getElementById('detallePrecio').textContent = precio === 0 ? 'Gratis' : `$${precio.toFixed(2)} USD`

      // Descargas
      const descEl = document.getElementById('detalleDescargas')
      if (Number(p.descargas) > 0) {
        document.getElementById('detalleDescargasNum').textContent = p.descargas.toLocaleString()
        descEl.style.display = 'flex'
      } else {
        descEl.style.display = 'none'
      }

      // Botón Cults3D
      const cultsBtn = document.getElementById('detalleCultsBtn')
      if (p.cults_url) {
        cultsBtn.href = p.cults_url
        cultsBtn.style.display = 'flex'
      } else {
        cultsBtn.style.display = 'none'
      }

      // ── Creador: desde perfil_disenador (independiente del perfil principal) ──
      const avatarImg   = document.getElementById('detalleCreadorAvatarImg')
      const avatarTxt   = document.getElementById('detalleCreadorAvatarTxt')
      const descCreador = document.getElementById('detalleCreadorDesc')
      const redes       = document.getElementById('detalleRedes')

      // Nombre: del perfil principal
      if (perfilData?.nombre) document.getElementById('detalleCreadorNombre').textContent = perfilData.nombre

      // Foto y descripción: del perfil del diseñador
      const fotoDisenador = disenadorData?.foto_url || null
      const descDisenador = disenadorData?.descripcion || perfilData?.descripcion || ''
      if (fotoDisenador) {
        avatarImg.src = fotoDisenador
        avatarImg.style.display = 'block'
        avatarTxt.style.display = 'none'
      } else {
        avatarImg.style.display = 'none'
        avatarTxt.style.display = ''
        avatarTxt.textContent = 'R3D'
      }
      descCreador.textContent = descDisenador

      // Redes: del perfil principal
      redes.innerHTML = ''
      if (perfilData?.instagram) redes.innerHTML += `<a href="${perfilData.instagram}" target="_blank" class="detalle__red detalle__red--ig">Instagram</a>`
      if (perfilData?.telegram)  redes.innerHTML += `<a href="${perfilData.telegram}" target="_blank" class="detalle__red detalle__red--tg">Telegram</a>`
      if (perfilData?.tiktok)    redes.innerHTML += `<a href="${perfilData.tiktok}" target="_blank" class="detalle__red detalle__red--tt">TikTok</a>`

      actualizarBotonesDetalle()
      document.getElementById('modalDetalle').classList.add('activo')
    }

    // ══════════════════════════════════════════
