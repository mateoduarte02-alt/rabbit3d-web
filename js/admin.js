// ═══════════════════════════════════════════════════
// admin.js — La Madriguera
// ═══════════════════════════════════════════════════

    //  ACTIVAR / DESACTIVAR MODO ADMIN
    // ══════════════════════════════════════════
    function activarAdmin() {
      esAdmin = true
      adminBar.classList.add('activo')
      cargarSugerencias()
      ;['stl','llavero','caja','maceta','marco','cortante'].forEach(t => {
        const ov = document.getElementById('hcard-edit-' + t)
        if (ov) ov.style.display = 'flex'
        const v = document.getElementById('hcard-visual-' + t)
        if (v && v.querySelector('img')) v.style.cursor = 'grab'
      })
      actualizarAvatarAdmin()
      if (productos && productos.length > 0) renderProductos()
    }

    function desactivarAdmin() {
      esAdmin = false
      adminBar.classList.remove('activo')
      document.getElementById('productos').classList.remove('drag-mode')
      document.getElementById('ytAdminBar').style.display = 'none'
      ;['stl','llavero','caja','maceta','marco','cortante'].forEach(t => {
        const ov = document.getElementById('hcard-edit-' + t)
        if (ov) ov.style.display = 'none'
        const v = document.getElementById('hcard-visual-' + t)
        if (v) v.style.cursor = 'default'
      })
      actualizarAvatarAdmin()
      if (productos.length > 0) renderProductos()
      cargarYoutube()
      cargarSugerencias()
    }

    // ══════════════════════════════════════════
    //  USUARIO (login / registro / perfil)
    // ══════════════════════════════════════════
    let usuarioActual = null
    let perfilUsuario = null

    document.getElementById('btnUserLogin').addEventListener('click', () => {
      if (usuarioActual) {
        abrirPerfilUsuario()
      } else {
        resetUserModal('login')
        document.getElementById('modalUsuario').classList.add('activo')
      }
    })
    document.getElementById('btnCerrarUsuario').addEventListener('click', () => {
      document.getElementById('modalUsuario').classList.remove('activo')
      const msg = document.getElementById('loginDownloadMsg')
      if (msg) msg.remove()
    })
    document.getElementById('btnCerrarPerfilUsuario').addEventListener('click', () =>
      document.getElementById('modalPerfilUsuario').classList.remove('activo'))

    function resetUserModal(tab) {
      const isLogin = tab !== 'registro'
      document.getElementById('tabLogin').classList.toggle('activo', isLogin)
      document.getElementById('tabRegistro').classList.toggle('activo', !isLogin)
      document.getElementById('panelLogin').style.display   = isLogin ? 'block' : 'none'
      document.getElementById('panelRegistro').style.display = isLogin ? 'none' : 'block'
      document.getElementById('userLoginError').textContent = ''
      document.getElementById('userRegError').textContent   = ''
      ;['userEmail','userPass','regEmail','regPass','regNombre'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = ''
      })
    }
    document.getElementById('tabLogin').addEventListener('click', () => resetUserModal('login'))
    document.getElementById('tabRegistro').addEventListener('click', () => resetUserModal('registro'))
    document.getElementById('btnIrRegistro').addEventListener('click', () => resetUserModal('registro'))
    document.getElementById('btnIrLogin').addEventListener('click', () => resetUserModal('login'))

    // ── Login — detecta rol automáticamente ──
    document.getElementById('btnUserLoginSubmit').addEventListener('click', async () => {
      const email = document.getElementById('userEmail').value.trim()
      const pass  = document.getElementById('userPass').value
      const errEl = document.getElementById('userLoginError')
      errEl.textContent = ''
      if (!email || !pass) { errEl.textContent = 'Completá email y contraseña.'; return }
      const btn = document.getElementById('btnUserLoginSubmit')
      btn.disabled = true; btn.textContent = 'Ingresando...'
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass })
      btn.disabled = false; btn.textContent = 'Iniciar sesión'
      if (error) { errEl.textContent = 'Email o contraseña incorrectos.'; return }
      usuarioActual = data.user
      // Cerrar modal sin propagar el evento de click
      const modalU = document.getElementById('modalUsuario')
      modalU.classList.remove('activo')
      // Limpiar buscador por si el navegador lo llenó con el email
      const buscadorEl = document.getElementById('buscador')
      if (buscadorEl && buscadorEl.value.includes('@')) {
        buscadorEl.value = ''
        busqueda = ''
      }
      await cargarPerfilUsuario()
      if (perfilUsuario?.rol === 'admin') {
        activarAdmin()
      } else {
        // Usuario normal: asegurar que los productos siguen visibles
        if (productos.length > 0) renderProductos()
      }
      actualizarNavUsuario()
      cargarMakers()
      if (window.reopenBugModalIfPending) window.reopenBugModalIfPending()
    })

    // ── Registro ──
    document.getElementById('btnUserRegSubmit').addEventListener('click', async () => {
      const nombre = document.getElementById('regNombre').value.trim()
      const email  = document.getElementById('regEmail').value.trim()
      const pass   = document.getElementById('regPass').value
      const errEl  = document.getElementById('userRegError')
      errEl.textContent = ''
      if (!email || !pass) { errEl.textContent = 'Completá email y contraseña.'; return }
      if (pass.length < 6) { errEl.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return }
      const btn = document.getElementById('btnUserRegSubmit')
      btn.disabled = true; btn.textContent = 'Creando cuenta...'
      const { data, error } = await supabase.auth.signUp({ email, password: pass })
      btn.disabled = false; btn.textContent = 'Crear cuenta'
      if (error) { errEl.textContent = 'Error: ' + error.message; return }
      usuarioActual = data.user
      if (usuarioActual) {
        // Upsert base siempre, campos extra si la tabla los tiene
        await supabase.from('profiles').upsert([{
          id: usuarioActual.id, email, rol: 'user'
        }], { onConflict: 'id' })
        // Intentar guardar nombre — puede fallar si la columna no existe
        await supabase.from('profiles').update({
          nombre: nombre || email.split('@')[0]
        }).eq('id', usuarioActual.id)
        await cargarPerfilUsuario()
      }
      document.getElementById('modalUsuario').classList.remove('activo')
      ;(function(){const m=document.getElementById('loginDownloadMsg');if(m)m.remove()})()
      await abrirPerfilUsuario()
      const exitoEl = document.getElementById('userPerfilExito')
      exitoEl.textContent = '¡Cuenta creada! Revisá tu email para confirmar tu cuenta.'
      exitoEl.style.display = 'block'
      actualizarNavUsuario()
    })

    async function cargarPerfilUsuario() {
      if (!usuarioActual) return
      try {
        // Usar tabla 'profiles' directamente (id = auth user uuid, tiene columna rol)
        const { data, error } = await supabase
          .from('profiles').select('*').eq('id', usuarioActual.id).limit(1)
        if (error) {
          console.warn('No se pudo cargar perfil:', error.message)
          perfilUsuario = { id: usuarioActual.id, rol: 'user' }
        } else {
          perfilUsuario = data?.[0] || { id: usuarioActual.id, rol: 'user' }
        }
      } catch(e) {
        perfilUsuario = { id: usuarioActual.id, rol: 'user' }
      }
    }

    function actualizarNavUsuario() {
      const btn        = document.getElementById('btnUserLogin')
      const iconSvg    = document.getElementById('userLoginIcon')
      const avatarSpan = document.getElementById('userAvatarNav')
      const avatarImg  = document.getElementById('userAvatarNavImg')
      if (usuarioActual) {
        if (perfilUsuario?.foto_url) {
          avatarImg.src = perfilUsuario.foto_url
          avatarSpan.style.display = 'inline-block'
          if (iconSvg) iconSvg.style.display = 'none'
        } else {
          avatarSpan.style.display = 'none'
          if (iconSvg) iconSvg.style.display = 'block'
        }
        btn.title = perfilUsuario?.nombre || usuarioActual.email
      } else {
        avatarSpan.style.display = 'none'
        if (iconSvg) iconSvg.style.display = 'block'
        btn.title = 'Iniciar sesión'
      }
      // Sugerencias: mostrar formulario solo a usuarios logueados
      const gate = document.getElementById('sugLoginGate')
      const form = document.getElementById('sugFormWrap')
      if (gate && form) {
        gate.style.display = usuarioActual ? 'none' : 'block'
        form.style.display = usuarioActual ? 'block' : 'none'
      }
    }

    async function abrirPerfilUsuario() {
      if (!usuarioActual) return
      await cargarPerfilUsuario()
      const p = perfilUsuario || {}
      document.getElementById('userPerfilEmail').textContent  = usuarioActual.email
      document.getElementById('userPerfilNombre').value       = p.nombre || ''
      document.getElementById('userPerfilDesc').value         = p.descripcion || ''
      document.getElementById('userPerfilInstagram').value    = p.instagram || ''
      document.getElementById('userPerfilTelegram').value     = p.telegram || ''
      document.getElementById('userPerfilTiktok').value       = p.tiktok || ''
      document.getElementById('userPerfilError').textContent  = ''
      document.getElementById('userPerfilExito').style.display = 'none'
      const avatarImg = document.getElementById('userPerfilAvatarImg')
      const avatarTxt = document.getElementById('userPerfilAvatarTxt')
      if (p.foto_url) {
        avatarImg.src = p.foto_url; avatarImg.style.display = 'block'; avatarTxt.style.display = 'none'
      } else {
        avatarImg.style.display = 'none'; avatarTxt.style.display = 'block'
        avatarTxt.textContent = (p.nombre || usuarioActual.email)[0].toUpperCase()
      }
      const badge = document.getElementById('userPerfilRolBadge')
      if (badge) badge.style.display = perfilUsuario?.rol === 'admin' ? 'inline-block' : 'none'
      document.getElementById('modalPerfilUsuario').classList.add('activo')
    }

    document.getElementById('userPerfilAvatar').addEventListener('click', () => {
      if (!usuarioActual) return
      document.getElementById('userFotoFile').click()
    })
    document.getElementById('userFotoFile').addEventListener('change', async (e) => {
      const file = e.target.files[0]
      if (!file || !usuarioActual) return
      const overlay = document.getElementById('userPerfilAvatarOverlay')
      overlay.innerHTML = '<span style="font-size:0.65rem;color:var(--text)">Subiendo...</span>'
      const ext = file.name.split('.').pop()
      const fileName = `user_${usuarioActual.id}_${Date.now()}.jpg`
      const fileToUpload = await comprimirImagen(file, 400, 400, 0.82)
      const { error: upErr } = await supabase.storage.from('media').upload(fileName, fileToUpload, { upsert: true })
      overlay.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>'
      if (upErr) { document.getElementById('userPerfilError').textContent = 'Error al subir imagen.'; return }
      const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName)
      const url = urlData.publicUrl
      document.getElementById('userPerfilAvatarImg').src = url
      document.getElementById('userPerfilAvatarImg').style.display = 'block'
      document.getElementById('userPerfilAvatarTxt').style.display = 'none'
      // Intentar guardar foto_url; si la columna no existe en profiles, silenciar error
      const { error: fotoErr } = await supabase.from('profiles').upsert([{
        id: usuarioActual.id, email: usuarioActual.email, foto_url: url, rol: perfilUsuario?.rol || 'user'
      }], { onConflict: 'id' })
      if (fotoErr) console.warn('foto_url no guardada en BD:', fotoErr.message)
      if (perfilUsuario) perfilUsuario.foto_url = url
      else perfilUsuario = { id: usuarioActual.id, email: usuarioActual.email, foto_url: url }
      actualizarNavUsuario()
    })

    document.getElementById('btnGuardarPerfilUsuario').addEventListener('click', async () => {
      if (!usuarioActual) return
      const errEl   = document.getElementById('userPerfilError')
      const exitoEl = document.getElementById('userPerfilExito')
      const btn     = document.getElementById('btnGuardarPerfilUsuario')
      errEl.textContent = ''; exitoEl.style.display = 'none'
      btn.disabled = true; btn.textContent = 'Guardando...'
      // Campos base que SÍ existen en profiles
      const datosBase = {
        id:    usuarioActual.id,
        email: usuarioActual.email,
        rol:   perfilUsuario?.rol || 'user'
      }
      // Campos extra (nombre, foto, redes) — se guardan si la tabla los tiene
      const datosExtra = {
        nombre:      document.getElementById('userPerfilNombre').value.trim() || null,
        descripcion: document.getElementById('userPerfilDesc').value.trim() || null,
        instagram:   document.getElementById('userPerfilInstagram').value.trim() || null,
        telegram:    document.getElementById('userPerfilTelegram').value.trim() || null,
        tiktok:      document.getElementById('userPerfilTiktok').value.trim() || null,
        foto_url:    perfilUsuario?.foto_url || null,
      }
      const datos = { ...datosBase, ...datosExtra }
      const { error } = await supabase.from('profiles').upsert([datos], { onConflict: 'id' })
      btn.disabled = false; btn.textContent = 'Guardar cambios'
      if (error) {
        // Si falla por columnas que no existen, intentar solo con campos base
        const { error: errorBase } = await supabase.from('profiles').upsert([datosBase], { onConflict: 'id' })
        if (errorBase) { errEl.textContent = 'Error al guardar: ' + errorBase.message; return }
        // Guardar datos extra solo en memoria local (no en BD)
        console.warn('Algunos campos extra no se pudieron guardar en BD:', error.message)
      }
      perfilUsuario = { ...perfilUsuario, ...datos }
      exitoEl.textContent = '¡Perfil guardado!'; exitoEl.style.display = 'block'
      setTimeout(() => { exitoEl.style.display = 'none' }, 3000)
      actualizarNavUsuario()
    })

    document.getElementById('btnCerrarSesionUsuario').addEventListener('click', async () => {
      if (!confirm('¿Cerrar sesión?')) return
      await supabase.auth.signOut()
      usuarioActual = null; perfilUsuario = null
      document.getElementById('modalPerfilUsuario').classList.remove('activo')
      if (esAdmin) desactivarAdmin()
      actualizarNavUsuario()
      cargarMakers()
    })

    // ── Restaurar sesión al cargar — detecta rol ──
    async function verificarSesionUsuario() {
      try {
        const { data } = await supabase.auth.getSession()
        if (data?.session?.user) {
          usuarioActual = data.session.user
          // Limpiar buscador por si el autocomplete del navegador lo llenó con el email
          const buscEl = document.getElementById('buscador')
          if (buscEl && buscEl.value.includes('@')) { buscEl.value = ''; busqueda = '' }
          await cargarPerfilUsuario()
          if (perfilUsuario?.rol === 'admin') {
            activarAdmin()
          }
          actualizarNavUsuario()
        }
      } catch(e) {
        console.warn('[Rabbit3D] Error verificando sesión:', e.message)
      }
    }

    // ══════════════════════════════════════════
    //  CREAR / EDITAR PRODUCTO
    // ══════════════════════════════════════════
    document.getElementById('uploadWrap').addEventListener('click', () => {
      document.getElementById('productoImagenFile').click()
    })
    document.getElementById('productoImagenFile').addEventListener('change', async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const preview = document.getElementById('uploadPreview')
      preview.innerHTML = '<span class="upload-texto">Subiendo imagen...</span>'
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('productos').upload(fileName, file, { upsert: true })
      if (error) {
        preview.innerHTML = '<span class="upload-icon">↑</span><span class="upload-texto" style="color:#d94060">Error al subir. Intentá de nuevo.</span>'
        return
      }
      const { data: urlData } = supabase.storage.from('productos').getPublicUrl(fileName)
      document.getElementById('productoImagen').value = urlData.publicUrl
      preview.innerHTML = `<img src="${urlData.publicUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"/>`
    })

    document.getElementById('btnCerrarProducto').addEventListener('click', () => modalProducto.classList.remove('activo'))

    window.editarProducto = (id) => {
      const p = productos.find(x => String(x.id) === String(id))
      if (!p) return
      document.getElementById('modalProductoTitulo').textContent = 'Editar producto'
      document.getElementById('productoId').value = p.id
      document.getElementById('productoNombre').value = p.nombre
      document.getElementById('productoDesc').value = p.descripcion || ''
      document.getElementById('productoPrecio').value = p.precio
      document.getElementById('productoCategoria').value = p.categoria
      document.getElementById('productoOrden').value = p.orden ?? ''
      document.getElementById('productoImagen').value = p.imagen_url || ''
      document.getElementById('productoImagenFile').value = ''
      const preview = document.getElementById('uploadPreview')
      if (p.imagen_url) {
        preview.innerHTML = `<img src="${p.imagen_url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;"/>`
      } else {
        preview.innerHTML = `
          <span class="upload-icon">↑</span>
          <span class="upload-texto">Hacé clic para subir una imagen</span>
          <span class="upload-sub">JPG, PNG o WEBP</span>`
      }
      productoError.textContent = ''
      modalProducto.classList.add('activo')
    }

    document.getElementById('btnGuardarProducto').addEventListener('click', async () => {
      const id       = document.getElementById('productoId').value
      const nombre   = document.getElementById('productoNombre').value.trim()
      const desc     = document.getElementById('productoDesc').value.trim()
      const precio   = parseFloat(document.getElementById('productoPrecio').value)
      const categoria= document.getElementById('productoCategoria').value
      const imagen   = document.getElementById('productoImagen').value.trim()
      const ordenVal = document.getElementById('productoOrden').value
      const orden    = ordenVal !== '' ? parseInt(ordenVal) : null

      if (!nombre || isNaN(precio)) {
        productoError.textContent = 'Nombre y precio son obligatorios.'
        return
      }

      const datos = { nombre, descripcion: desc, precio, categoria, imagen_url: imagen || null, orden }
      let error
      if (id) {
        ;({ error } = await supabase.from('productos').update(datos).eq('id', id))
      } else {
        ;({ error } = await supabase.from('productos').insert([datos]))
      }
      if (error) { productoError.textContent = 'Error al guardar: ' + error.message; return }
      modalProducto.classList.remove('activo')
      await cargarProductos()
    })

    window.eliminarProducto = async (id) => {
      if (!confirm('¿Seguro que querés eliminar este producto?')) return
      // Obtener imagen antes de eliminar para liberar storage
      const p = productos.find(x => String(x.id) === String(id))
      const { error } = await supabase.from('productos').delete().eq('id', id)
      if (error) { alert('Error al eliminar.'); return }
      // Liberar imagen de storage si fue subida localmente (no es de Cults)
      if (p?.imagen_url) {
        try {
          const url = new URL(p.imagen_url)
          const pathParts = url.pathname.split('/object/public/productos/')
          if (pathParts.length > 1) {
            await supabase.storage.from('productos').remove([pathParts[1]])
          }
        } catch (_) {}
      }
      await cargarProductos()
    }

    // ══════════════════════════════════════════
    //  MEDIA (logo, videos carrusel)
    // ══════════════════════════════════════════
    let videosMedia = []

    async function cargarMedia() {
      const { data } = await supabase.from('media').select('*')
      if (!data) return
      const logo = data.find(m => m.tipo === 'logo')
      if (logo) document.getElementById('headerLogo').src = logo.url
      ;['printables','cults3d','thingiverse'].forEach(plat => {
        const entry = data.find(m => m.tipo === `logo_${plat}`)
        if (entry) { platLogosUrl[plat] = entry.url }
      })
      videosMedia = data.filter(m => m.tipo === 'video')
      // Mapear portadas de herramientas (hcard-* y empr-img-*) para usarlas en carrusel
      window._portadasMap = {}
      const _isGHUrl = url => url && (url.includes('raw.githubusercontent.com') || url.includes('github.io') || (!url.includes('supabase')))
      data.forEach(m => {
        if (m.tipo && m.tipo.startsWith('hcard-') && !m.tipo.endsWith('-pos')) {
          const tool = m.tipo.replace('hcard-', '')
          if (m.url && _isGHUrl(m.url)) window._portadasMap[tool] = m.url
        }
        if (m.tipo && m.tipo.startsWith('empr-img-')) {
          const tool = m.tipo.replace('empr-img-', '')
          if (m.url && _isGHUrl(m.url)) window._portadasMap[tool] = m.url
        }
      })      // Cargar slides de novedades configurados por admin
      const rawItems = data.filter(m => m.tipo === 'carrusel_item')
      // nombre contiene JSON con herramienta_id, titulo_custom, subtitulo, badge, imagen_url, orden
      carruselItems = rawItems
        .map(m => { try { 
          const parsed = JSON.parse(m.nombre)
          // Siempre limpiar imagen_url — usar _portadasMap como única fuente de portadas
          parsed.imagen_url = ''
          return {...parsed, id: m.id}
        } catch(e) { return null } })
        .filter(Boolean)
        .sort((a,b) => (a.orden||0)-(b.orden||0))
      // NO llamar renderCarrusel() aquí — se llama después de cargarHcardImgs()
    }

    // Catálogo de herramientas disponibles para el carrusel
    const CARRUSEL_HERRAMIENTAS = {
      stl:        {titulo:'Cuadros 2D',               seccion:'#herramientas', icono:'🖼',  badge:'Próximamente'},
      llavero:    {titulo:'Llaveros con nombre',       seccion:'#herramientas', icono:'🔑',  badge:'Beta'},
      caja:       {titulo:'Caja con tapa',             seccion:'#herramientas', icono:'📦',  badge:'Beta'},
      maceta:     {titulo:'Macetas',                   seccion:'#herramientas', icono:'🪴',  badge:'Beta'},
      marco:      {titulo:'Marco / Porta-foto',        seccion:'#herramientas', icono:'🖼',  badge:'Beta'},
      cortante:   {titulo:'Cortantes',                 seccion:'#herramientas', icono:'✂️',  badge:'Beta'},
      tarjetas:   {titulo:'Tarjetas de agradecimiento',seccion:'#emprendedores',icono:'💌', badge:'Nuevo'},
      costos:     {titulo:'Calculadora de costos',     seccion:'#emprendedores',icono:'🧮', badge:''},
      mejora:     {titulo:'Mejorador de imágenes',     seccion:'#emprendedores',icono:'✨',  badge:'IA'},
      presupuesto:{titulo:'Generador de presupuestos', seccion:'#emprendedores',icono:'📄', badge:''},
      fotoproducto:{titulo:'Cambiar fondo de producto',seccion:'#emprendedores',icono:'🛍', badge:'Nuevo'},
    }

    let carruselItems = []  // slides configurados desde Supabase

    function renderCarrusel() {
      const track = document.getElementById('carouselTrack')
      const dots  = document.getElementById('carouselDots')

      // Usar slides de novedades si hay, sino fallback a videos legacy
      const usarNovedades = carruselItems.length > 0
      const slides = usarNovedades ? carruselItems : videosMedia

      if (slides.length === 0) {
        track.innerHTML = '<div class="carousel__placeholder"><span>Configurá el carrusel desde el panel de administración</span></div>'
        dots.innerHTML = ''
        return
      }

      if (usarNovedades) {        track.innerHTML = slides.map((item, i) => {
          const h = CARRUSEL_HERRAMIENTAS[item.herramienta_id] || {}
          // URL: siempre del mapa de portadas (fuente única de verdad)
          const imgUrl = (window._portadasMap && window._portadasMap[item.herramienta_id]) || ''
          const titulo = item.titulo_custom || h.titulo || 'Novedad'
          const subtitulo = item.subtitulo || ''
          const badge = item.badge || h.badge || ''
          const seccion = h.seccion || '#'
          const icono = h.icono || '✨'
          const bgStyle = `background-color:#061520`
          return `
          <div class="carousel__slide ${i === 0 ? 'active' : ''}" style="${bgStyle}" id="carrusel-slide-${i}">
            ${imgUrl ? `<img src="${imgUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;display:block" alt="">` : ''}
            <div style="position:absolute;inset:0;z-index:1;background:linear-gradient(to top,rgba(0,5,12,.95) 0%,rgba(0,5,12,.5) 35%,transparent 70%)"></div>
            <div style="position:absolute;bottom:0;left:0;right:0;z-index:2;padding:1rem 1.2rem 1.3rem;text-align:left">
              ${badge ? `<span style="display:inline-block;background:var(--cyan,#159A9C);color:#fff;font-size:.58rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:.18rem .55rem;border-radius:3px;margin-bottom:.4rem">${badge}</span><br>` : ''}
              <div style="font-family:var(--font-head,'Orbitron'),monospace;font-size:clamp(.9rem,2.5vw,1.4rem);font-weight:900;color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.9);letter-spacing:.04em;text-transform:uppercase;line-height:1.2;margin-bottom:.3rem">${titulo}</div>
              ${subtitulo ? `<div style="font-size:clamp(.7rem,1.5vw,.82rem);color:rgba(255,255,255,.75);margin-bottom:.6rem;line-height:1.4">${subtitulo}</div>` : ''}
              <a href="${seccion}" style="display:inline-flex;align-items:center;background:var(--cyan,#159A9C);color:#fff;padding:.35rem .9rem;border-radius:5px;font-weight:700;font-size:.73rem;text-decoration:none;cursor:pointer" onclick="document.querySelector('${seccion}')?.scrollIntoView({behavior:'smooth'});return false">Ver herramienta →</a>
            </div>
          </div>`
        }).join('')

        // Aplicar imágenes via JS también (doble seguridad)
        slides.forEach((item, i) => {
          if (!item.imagen_url) return
          const el = document.getElementById(`carrusel-slide-${i}`)
          if (el) {
            el.style.backgroundImage = `url('${item.imagen_url}')`
            el.style.backgroundSize = 'cover'
            el.style.backgroundPosition = 'center'
          }
        })
      } else {
        // Fallback: videos legacy
        track.innerHTML = slides.map((v, i) => `
          <div class="carousel__slide ${i === 0 ? 'active' : ''}">
            <video class="carousel__video" ${i === 0 ? 'autoplay' : ''} muted loop playsinline>
              <source src="${v.url}" type="video/mp4"/>
            </video>
          </div>`).join('')
      }

      dots.innerHTML = slides.map((_, i) => `
        <button class="carousel__dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></button>`).join('')

      iniciarCarrusel()
    }

    function iniciarCarrusel() {
      const track  = document.getElementById('carouselTrack')
      const slides = [...track.querySelectorAll('.carousel__slide')]
      const dots   = [...document.querySelectorAll('.carousel__dot')]
      let current  = 0
      let timer    = null

      if (!slides.length) return

      function goTo(idx) {
        slides[current].classList.remove('active')
        const outVid = slides[current].querySelector('video')
        if (outVid) outVid.pause()
        current = (idx + slides.length) % slides.length
        slides[current].classList.add('active')
        dots.forEach((d, i) => d.classList.toggle('active', i === current))
        const inVid = slides[current].querySelector('video')
        if (inVid) { inVid.currentTime = 0; inVid.play().catch(() => {}) }
        clearInterval(timer)
        timer = setInterval(() => goTo(current + 1), 6000)
      }

      document.getElementById('carouselPrev').onclick = () => goTo(current - 1)
      document.getElementById('carouselNext').onclick = () => goTo(current + 1)
      dots.forEach(d => d.addEventListener('click', () => goTo(+d.dataset.idx)))
      // timer ya se inicia dentro de goTo() — no duplicar aquí
    }

    // Modal media
    document.getElementById('btnGestionarMedia').addEventListener('click', async () => {
      renderListaVideos()
      document.getElementById('modalMedia').classList.add('activo')
    })
    document.getElementById('btnCerrarMedia').addEventListener('click', () => {
      document.getElementById('modalMedia').classList.remove('activo')
    })

    function renderListaVideos() {
      const lista = document.getElementById('listaVideos')
      if (videosMedia.length === 0) {
        lista.innerHTML = '<p class="lista-vacia" style="padding:1rem 0">No hay videos cargados aún.</p>'
        return
      }
      lista.innerHTML = videosMedia.map(v => `
        <div class="media-item">
          <video src="${v.url}" class="media-item__preview" muted></video>
          <span class="media-item__nombre">${v.nombre}</span>
          <button class="lista-item__remove" onclick="window.eliminarVideo('${v.id}', '${v.nombre}')" title="Eliminar">✕</button>
        </div>`).join('')
    }

    // Subir logo
    document.getElementById('uploadLogoWrap').addEventListener('click', () => {
      document.getElementById('logoFile').click()
    })
    document.getElementById('logoFile').addEventListener('change', async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const preview = document.getElementById('uploadLogoPreview')
      const logoError = document.getElementById('logoError')
      preview.innerHTML = '<span class="upload-texto">Subiendo logo...</span>'
      logoError.textContent = ''

      const ext = file.name.split('.').pop()
      const fileName = `logo_${Date.now()}.png`
      const fileToUpload = await comprimirImagen(file, 400, 200, 0.90)
      const { error: upErr } = await supabase.storage.from('media').upload(fileName, fileToUpload, { upsert: true })
      if (upErr) { logoError.textContent = 'Error al subir: ' + upErr.message; return }

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName)
      const url = urlData.publicUrl

      // Eliminar logo anterior
      const { data: existing } = await supabase.from('media').select('id').eq('tipo', 'logo').limit(1)
      if (existing && existing.length > 0) {
        await supabase.from('media').delete().eq('id', existing[0].id)
      }
      await supabase.from('media').insert([{ tipo: 'logo', url, nombre: fileName }])

      document.getElementById('headerLogo').src = url
      preview.innerHTML = `<img src="${url}" style="height:60px;object-fit:contain;"/>`
    })

    // Subir video
    document.getElementById('uploadVideoWrap').addEventListener('click', () => {
      document.getElementById('videoFile').click()
    })
    document.getElementById('videoFile').addEventListener('change', async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const preview = document.getElementById('uploadVideoPreview')
      const videoError = document.getElementById('videoError')
      preview.innerHTML = '<span class="upload-texto">Subiendo video... puede tardar unos segundos.</span>'
      videoError.textContent = ''

      const fileName = `video_${Date.now()}.mp4`
      const { error: upErr } = await supabase.storage.from('media').upload(fileName, file, { upsert: true })
      if (upErr) { videoError.textContent = 'Error al subir: ' + upErr.message; return }

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName)
      await supabase.from('media').insert([{ tipo: 'video', url: urlData.publicUrl, nombre: fileName }])

      preview.innerHTML = `<span class="upload-icon">✓</span><span class="upload-texto">Video subido correctamente</span>`
      await cargarMedia()
      renderListaVideos()
    })

    // Eliminar video
    window.eliminarVideo = async (id, nombre) => {
      if (!confirm('¿Eliminar este video del carrusel?')) return
      await supabase.storage.from('media').remove([nombre])
      await supabase.from('media').delete().eq('id', id)
      await cargarMedia()
      renderListaVideos()
    }

    // ══════════════════════════════════════════
    //  FOTO DE PERFIL (solo admin)
    // ══════════════════════════════════════════
    const sobreMiAvatar = document.getElementById('sobreMiAvatar')
    const fotoPerfilFile = document.getElementById('fotoPerfilFile')

    function actualizarAvatarAdmin() {
      const overlay = document.getElementById('sobreMiAvatarOverlay')
      const hint    = document.getElementById('sobreMiFotoHint')
      if (esAdmin) {
        sobreMiAvatar.title = 'Clic para cambiar foto de perfil'
        sobreMiAvatar.style.cursor = 'pointer'
        if (overlay) overlay.style.display = ''
        if (hint)    hint.style.display = ''
      } else {
        sobreMiAvatar.title = ''
        sobreMiAvatar.style.cursor = 'default'
        if (overlay) overlay.style.display = 'none'
        if (hint)    hint.style.display = 'none'
      }
    }

    sobreMiAvatar.addEventListener('click', () => {
      if (!esAdmin) return   // solo admin puede cambiar foto
      fotoPerfilFile.click()
    })

    fotoPerfilFile.addEventListener('change', async (e) => {
      const file = e.target.files[0]
      if (!file) return

      const img = document.getElementById('sobreMiAvatarImg')
      const txt = document.getElementById('sobreMiAvatarTexto')

      // Preview local inmediato
      const reader = new FileReader()
      reader.onload = (ev) => {
        img.src = ev.target.result
        img.style.display = 'block'
        if (txt) txt.style.display = 'none'
      }
      reader.readAsDataURL(file)

      // Subir a Supabase storage
      const ext = file.name.split('.').pop()
      const fileName = `foto_perfil_${Date.now()}.jpg`
      const fileToUpload = await comprimirImagen(file, 500, 500, 0.80)
      const { error: upErr } = await supabase.storage.from('media').upload(fileName, fileToUpload, { upsert: true })
      if (upErr) { alert('Error al subir la foto: ' + upErr.message); return }

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName)
      const url = urlData.publicUrl

      // Si perfilId no cargó todavía, reintentar cargar el perfil primero
      if (!perfilId) {
        const { data: pd } = await supabase.from('perfil').select('id').limit(1)
        if (pd && pd.length > 0) perfilId = pd[0].id
      }

      let saveError
      if (perfilId) {
        const res = await supabase.from('perfil').update({ foto_perfil: url }).eq('id', perfilId)
        saveError = res.error
      } else {
        // No hay ningún registro de perfil: crear uno
        const res = await supabase.from('perfil').insert([{ foto_perfil: url }]).select()
        saveError = res.error
        if (!saveError && res.data && res.data[0]) perfilId = res.data[0].id
      }

      if (saveError) {
        alert('La foto se subió pero no se pudo guardar en el perfil: ' + saveError.message)
        return
      }

      // Actualizar imagen definitiva desde servidor
      img.src = url
    })

    // ══════════════════════════════════════════
    //  ELIMINAR MASIVO
    // ══════════════════════════════════════════
    document.getElementById('btnEliminarMasivo').addEventListener('click', () => {
      const lista = document.getElementById('listaEliminar')
      lista.innerHTML = productos.map(p => `
        <div class="eliminar-item">
          <input type="checkbox" class="eliminar-check" id="chk_${p.id}" value="${p.id}"/>
          <label for="chk_${p.id}" class="eliminar-label">
            <div class="eliminar-item__img">${p.imagen_url ? `<img src="${p.imagen_url}"/>` : '<span>3D</span>'}</div>
            <div>
              <p class="eliminar-item__nombre">${p.nombre}</p>
              <p class="eliminar-item__cat">${labelCategoria(p.categoria)}</p>
            </div>
          </label>
        </div>`).join('')
      document.querySelectorAll('.eliminar-check').forEach(chk => {
        chk.addEventListener('change', () => {
          const n = document.querySelectorAll('.eliminar-check:checked').length
          document.getElementById('eliminarCount').textContent = `${n} seleccionado${n !== 1 ? 's' : ''}`
        })
      })
      document.getElementById('eliminarCount').textContent = '0 seleccionados'
      document.getElementById('eliminarError').textContent = ''
      document.getElementById('modalEliminarMasivo').classList.add('activo')
    })
    document.getElementById('btnCerrarEliminar').addEventListener('click', () => {
      document.getElementById('modalEliminarMasivo').classList.remove('activo')
    })
    document.getElementById('btnSeleccionarTodos').addEventListener('click', () => {
      document.querySelectorAll('.eliminar-check').forEach(c => { c.checked = true })
      const n = document.querySelectorAll('.eliminar-check').length
      document.getElementById('eliminarCount').textContent = `${n} seleccionado${n !== 1 ? 's' : ''}`
    })
    document.getElementById('btnDeseleccionarTodos').addEventListener('click', () => {
      document.querySelectorAll('.eliminar-check').forEach(c => { c.checked = false })
      document.getElementById('eliminarCount').textContent = '0 seleccionados'
    })
    document.getElementById('btnConfirmarEliminar').addEventListener('click', async () => {
      const seleccionados = [...document.querySelectorAll('.eliminar-check:checked')].map(c => c.value)
      if (seleccionados.length === 0) { document.getElementById('eliminarError').textContent = 'Seleccioná al menos un diseño.'; return }
      if (!confirm(`¿Seguro que querés eliminar ${seleccionados.length} diseño${seleccionados.length !== 1 ? 's' : ''}?`)) return
      for (const id of seleccionados) {
        const p = productos.find(x => String(x.id) === String(id))
        await supabase.from('productos').delete().eq('id', id)
        // Liberar imagen de storage si fue subida localmente (no es de Cults)
        if (p?.imagen_url) {
          try {
            const url = new URL(p.imagen_url)
            const pathParts = url.pathname.split('/object/public/productos/')
            if (pathParts.length > 1) {
              await supabase.storage.from('productos').remove([pathParts[1]])
            }
          } catch (_) {}
        }
      }
      document.getElementById('modalEliminarMasivo').classList.remove('activo')
      await cargarProductos()
    })

    // ══════════════════════════════════════════
    //  CATEGORIZACIÓN AUTOMÁTICA
    // ══════════════════════════════════════════
    function detectarCategoria(nombre) {
      const n = nombre.toLowerCase()
      if (n.includes('cuadro') || n.includes('frame') || n.includes('litofanía') || n.includes('lithophane')) return 'cuadros'
      if (n.includes('llavero') || n.includes('keychain') || n.includes('key chain')) return 'llaveros'
      if (n.includes('cortante') || n.includes('cutter') || n.includes('cookie') || n.includes('galleta')) return 'cortantes'
      return 'otros'
    }

    // ══════════════════════════════════════════
    //  SINCRONIZACIÓN CON CULTS3D (TODAS LAS PÁGINAS)
    // ══════════════════════════════════════════
    document.getElementById('btnSincronizarCults').addEventListener('click', () => {
      const savedNick   = localStorage.getItem('cults_nick') || ''
      const savedApiKey = localStorage.getItem('cults_api_key') || ''
      document.getElementById('cultsNick').value = savedNick
      document.getElementById('cultsApiKey').value = savedApiKey
      document.getElementById('cultsError').textContent = ''
      document.getElementById('cultsInfo').style.display = 'none'
      document.getElementById('cultsResultado').style.display = 'none'
      document.getElementById('cultsProgress').style.display = 'none'
      document.getElementById('modalCults').classList.add('activo')
    })
    document.getElementById('btnCerrarCults').addEventListener('click', () => {
      document.getElementById('modalCults').classList.remove('activo')
    })

    document.getElementById('btnEjecutarSync').addEventListener('click', async () => {
      const nick   = document.getElementById('cultsNick').value.trim()
      const apiKey = document.getElementById('cultsApiKey').value.trim()
      const errEl  = document.getElementById('cultsError')
      const infoEl = document.getElementById('cultsInfo')
      const resEl  = document.getElementById('cultsResultado')
      const listaEl= document.getElementById('cultsResultadoLista')
      const progEl = document.getElementById('cultsProgress')
      const progFill = document.getElementById('cultsProgressFill')
      const progTxt  = document.getElementById('cultsProgressTexto')

      errEl.textContent = ''
      infoEl.style.display = 'none'
      resEl.style.display = 'none'
      progEl.style.display = 'none'

      if (!nick || !apiKey) { errEl.textContent = 'Completá tu usuario y API Key de Cults3D.'; return }

      const btn = document.getElementById('btnEjecutarSync')
      btn.textContent = 'Conectando con Cults3D...'
      btn.disabled = true

      localStorage.setItem('cults_nick', nick)
      localStorage.setItem('cults_api_key', apiKey)

      // Cargar productos existentes para detectar duplicados por cults_id y nombre
      const { data: existentes } = await supabase.from('productos').select('nombre, cults_id, imagen_url')
      const cultsIdsExistentes = new Set((existentes || []).map(p => p.cults_id).filter(Boolean))
      const nombresExistentes  = new Set((existentes || []).map(p => p.nombre.toLowerCase().trim()))

      // Traer TODAS las páginas de Cults3D
      let todosLosDiseños = []
      let offset = 0
      const limit = 50
      let hayMas = true
      progEl.style.display = 'block'

      while (hayMas) {
        progTxt.textContent = `Obteniendo diseños... (${todosLosDiseños.length} hasta ahora)`
        progFill.style.width = '30%'

        const query = `{
          myself {
            creationsBatch(limit: ${limit}, offset: ${offset}) {
              results {
                slug
                name(locale: ES)
                description(locale: ES)
                illustrationImageUrl
                downloadsCount
                shortUrl
                price(currency: USD) { cents }
              }
            }
          }
        }`

        let pagina
        try {
          const resp = await supabase.functions.invoke('cults-proxy', { body: { nick, apiKey, query } })
          if (resp.error) throw new Error(resp.error.message)
          const json = resp.data
          if (json.errors) throw new Error(json.errors[0].message)
          pagina = json.data.myself.creationsBatch.results
        } catch (err) {
          errEl.textContent = 'Error al conectar con Cults3D: ' + err.message
          btn.textContent = '⟳ Sincronizar todos los diseños'; btn.disabled = false
          progEl.style.display = 'none'
          return
        }

        if (!pagina || pagina.length === 0) { hayMas = false; break }
        // Filtrar diseños sin slug, ocultos o secretos
        // Un diseño secreto en Cults no tiene shortUrl público
        const paginaFiltrada = pagina.filter(d => {
          if (!d.slug) return false
          if (d.slug.startsWith('.')) return false
          if (d.hidden || d.private || d.draft) return false
          if (!d.shortUrl) return false   // sin URL pública = secreto
          return true
        })
        todosLosDiseños = todosLosDiseños.concat(paginaFiltrada)
        if (pagina.length < limit) { hayMas = false } else { offset += limit }
      }

      if (todosLosDiseños.length === 0) {
        errEl.textContent = 'No se encontraron diseños en tu cuenta de Cults3D.'
        btn.textContent = '⟳ Sincronizar todos los diseños'; btn.disabled = false
        progEl.style.display = 'none'
        return
      }

      // Importar solo los nuevos
      btn.textContent = `Importando ${todosLosDiseños.length} diseños...`
      let nuevos = 0, duplicados = 0
      const resultadosHTML = []

      for (let i = 0; i < todosLosDiseños.length; i++) {
        const d = todosLosDiseños[i]
        const nombre = d.name || 'Sin nombre'
        const cultsId = d.slug || null

        // Detectar duplicado por cults_id (más confiable) o por nombre
        const yaExistePorId     = cultsId && cultsIdsExistentes.has(cultsId)
        const yaExistePorNombre = nombresExistentes.has(nombre.toLowerCase().trim())
        const yaExiste = yaExistePorId || yaExistePorNombre

        progFill.style.width = `${30 + Math.round((i / todosLosDiseños.length) * 65)}%`
        progTxt.textContent = `Procesando ${i + 1} de ${todosLosDiseños.length}: ${nombre}`

        if (!yaExiste) {
          const precio = d.price ? (d.price.cents / 100) : 0
          const esGratis = precio === 0
          const categoria = detectarCategoria(nombre)
          const descripcion = d.description || null

          await supabase.from('productos').insert([{
            nombre,
            descripcion,
            precio,
            imagen_url: d.illustrationImageUrl || null,
            categoria,
            cults_url: d.shortUrl || null,
            cults_id: cultsId,
            descargas: d.downloadsCount || 0,
            es_gratis: esGratis
          }])
          nuevos++
          cultsIdsExistentes.add(cultsId)
          nombresExistentes.add(nombre.toLowerCase().trim())
        } else {
          // Actualizar datos que pueden cambiar: precio, descargas
          if (cultsId) {
            const precio = d.price ? (d.price.cents / 100) : 0
            await supabase.from('productos')
              .update({
                precio,
                descargas: d.downloadsCount || 0,
                es_gratis: precio === 0,
                cults_url: d.shortUrl || null,
                imagen_url: d.illustrationImageUrl || null,
                descripcion: d.description || null,
              })
              .eq('cults_id', cultsId)
          }
          duplicados++
        }

        resultadosHTML.push(`
          <div class="cults-item">
            ${d.illustrationImageUrl ? `<img class="cults-item__img" src="${d.illustrationImageUrl}" alt="${nombre}"/>` : '<div class="cults-item__img"></div>'}
            <span class="cults-item__nombre">${nombre}</span>
            <span class="cults-item__status ${yaExiste ? 'cults-item__status--existe' : 'cults-item__status--nuevo'}">
              ${yaExiste ? '↻ Actualizado' : '✓ Nuevo'}
            </span>
          </div>`)
      }

      progFill.style.width = '100%'
      progTxt.textContent = '¡Sincronización completa!'

      document.getElementById('cultsInfoTexto').textContent =
        `${todosLosDiseños.length} diseños en Cults3D · ${nuevos} nuevos importados · ${duplicados} actualizados`
      infoEl.style.display = 'block'
      listaEl.innerHTML = resultadosHTML.join('')
      resEl.style.display = 'block'

      btn.textContent = '⟳ Sincronizar todos los diseños'; btn.disabled = false
      if (nuevos > 0 || duplicados > 0) await cargarProductos()
    })

    // ══════════════════════════════════════════
    //  TOP DESIGNS CAROUSEL (hasta 20 diseños)
    // ══════════════════════════════════════════



    //  YOUTUBE — CARRUSEL + REORDENAR
    // ══════════════════════════════════════════
    function ytIdFromUrl(url) {
      url = url.trim()
      let m
      m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
      if (m) return m[1]
      m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
      if (m) return m[1]
      m = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/)
      if (m) return m[1]
      m = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/)
      if (m) return m[1]
      if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url
      return null
    }

    let ytVideos = []
    let ytIndex  = 0
    let ytTimer  = null

    async function cargarYoutube() {
      // Intentar con order por 'orden', con fallback si falla
      let data, error
      ;({ data, error } = await supabase.from('youtube_videos').select('*').order('orden', { ascending: true }))
      if (error) {
        // Fallback: sin orden específico
        ;({ data, error } = await supabase.from('youtube_videos').select('*'))
      }
      if (error || !data || data.length === 0) {
        document.getElementById('ytTrack').innerHTML = '<p class="cargando" style="padding:2rem;width:100%">No hay videos cargados aún.</p>'
        document.getElementById('ytDots').innerHTML = ''
        return
      }
      ytVideos = data
      ytIndex  = 0
      renderYtCarousel()
    }

    // ── Variables del carrusel YT ──
    let ytCurrentIndex = 0

    function renderYtCarousel() {
      const grid = document.getElementById('ytGrid')
      if (!grid) return
      const N = ytVideos.length
      if (N === 0) {
        grid.innerHTML = '<p style="padding:2rem;grid-column:1/-1;color:var(--muted)">No hay videos cargados aún.</p>'
        return
      }
      grid.innerHTML = ytVideos.map((v, i) => `
        <div class="yt-card" data-ytid="${v.yt_id}" data-id="${v.id}" onclick="window.open('https://www.youtube.com/watch?v=${v.yt_id}','_blank','noopener')">
          ${esAdmin ? `<div class="yt-card__admin" onclick="event.stopPropagation()">
            <button onclick="window.ytMover('${v.id}',-1)" title="Subir">↑</button>
            <button onclick="window.ytMover('${v.id}', 1)" title="Bajar">↓</button>
            <button onclick="window.eliminarYt('${v.id}')" title="Eliminar">✕</button>
          </div>` : ''}
          <div class="yt-card__thumb">
            <img src="https://img.youtube.com/vi/${v.yt_id}/hqdefault.jpg"
              alt="${v.titulo || 'Video'}" data-ytid="${v.yt_id}" loading="lazy"/>
            <div class="yt-card__play">
              <svg viewBox="0 0 24 24" fill="currentColor" width="44" height="44"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
          <div class="yt-card__info">
            <p class="yt-card__title">${v.titulo || 'Ver en YouTube'}</p>
            <p class="yt-card__channel">La Madriguera</p>
          </div>
        </div>`).join('')
      grid.querySelectorAll('img[data-ytid]').forEach(img => {
        img.onerror = function() { window.ytThumbFallback(this) }
      })
    }

    function ytGoTo() {}
    function initYtCarousel() {}

    window.ytMover = async (id, dir) => {
      const idx = ytVideos.findIndex(v => String(v.id) === String(id))
      if (idx < 0) return
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= ytVideos.length) return
      ;[ytVideos[idx], ytVideos[newIdx]] = [ytVideos[newIdx], ytVideos[idx]]
      for (let i = 0; i < ytVideos.length; i++) {
        await supabase.from('youtube_videos').update({ orden: i }).eq('id', ytVideos[i].id)
      }
      ytIndex = newIdx
      renderYtCarousel()
    }

    window.eliminarYt = async (id) => {
      if (!confirm('¿Eliminar este video?')) return
      await supabase.from('youtube_videos').delete().eq('id', id)
      await cargarYoutube()
    }

    document.getElementById('btnAdminYt').addEventListener('click', () => {
      const bar = document.getElementById('ytAdminBar')
      bar.style.display = bar.style.display === 'none' ? 'block' : 'none'
    })

    document.getElementById('btnAgregarYt').addEventListener('click', async () => {
      const urlVal    = document.getElementById('ytUrlInput').value.trim()
      const tituloVal = document.getElementById('ytTituloInput').value.trim()
      const errEl     = document.getElementById('ytError')
      const btn       = document.getElementById('btnAgregarYt')
      errEl.textContent = ''
      const ytId = ytIdFromUrl(urlVal)
      if (!ytId) { errEl.textContent = 'URL de YouTube inválida. Pegá el link completo del video.'; return }
      btn.disabled = true; btn.textContent = 'Guardando...'
      const nuevoOrden = ytVideos.length
      const { error } = await supabase.from('youtube_videos').insert([{ yt_id: ytId, titulo: tituloVal || null, orden: nuevoOrden }])
      btn.disabled = false; btn.textContent = '+ Agregar video'
      if (error) { errEl.textContent = 'Error al guardar: ' + error.message; return }
      document.getElementById('ytUrlInput').value  = ''
      document.getElementById('ytTituloInput').value = ''
      await cargarYoutube()
    })

    // ══════════════════════════════════════════
    //  SUGERENCIAS
    // ══════════════════════════════════════════
    async function cargarSugerencias() {
      const lista = document.getElementById('sugLista')
      const { data, error } = await supabase.from('sugerencias').select('*').order('created_at', { ascending: false }).limit(20)
      if (error || !data || data.length === 0) {
        lista.innerHTML = '<p class="cargando">Aún no hay sugerencias.</p>'
        return
      }
      lista.innerHTML = data.map(s => {
        const fecha = new Date(s.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
        return `
        <div class="sug-item" id="sug-${s.id}">
          <div class="sug-item__header">
            <span class="sug-item__nombre">${s.nombre || 'Anónimo'}</span>
            <span class="sug-item__fecha">${fecha}</span>
            <button class="sug-item__del" onclick="window.eliminarSug('${s.id}')" title="Eliminar sugerencia" style="display:${esAdmin?'inline-flex':'none'}">✕</button>
          </div>
          <p class="sug-item__texto">${s.texto}</p>
        </div>`
      }).join('')
    }

    window.eliminarSug = async (id) => {
      if (!confirm('¿Eliminar esta sugerencia?')) return
      const { error } = await supabase.from('sugerencias').delete().eq('id', id)
      if (!error) {
        const el = document.getElementById('sug-' + id)
        if (el) el.remove()
        // Si quedó vacío, mostrar mensaje
        const lista = document.getElementById('sugLista')
        if (!lista.querySelector('.sug-item')) lista.innerHTML = '<p class="cargando">Aún no hay sugerencias.</p>'
      }
    }

    document.getElementById('btnEnviarSug').addEventListener('click', async () => {
      if (!usuarioActual) { document.getElementById('sugError').textContent = 'Tenés que iniciar sesión para enviar sugerencias.'; return }
      const nombre  = document.getElementById('sugNombre').value.trim()
      const texto   = document.getElementById('sugTexto').value.trim()
      const errEl   = document.getElementById('sugError')
      const exitoEl = document.getElementById('sugExito')
      const btn     = document.getElementById('btnEnviarSug')
      errEl.textContent = ''; exitoEl.style.display = 'none'
      if (!texto) { errEl.textContent = 'Escribí tu sugerencia antes de enviar.'; return }
      btn.disabled = true; btn.textContent = 'Enviando...'
      const { error } = await supabase.from('sugerencias').insert([{ nombre: nombre || null, texto }])
      btn.disabled = false; btn.textContent = 'Enviar sugerencia'
      if (error) { errEl.textContent = 'Error al enviar: ' + error.message; return }
      document.getElementById('sugNombre').value = ''
      document.getElementById('sugTexto').value  = ''
      exitoEl.style.display = 'block'
      setTimeout(() => { exitoEl.style.display = 'none' }, 4000)
      await cargarSugerencias()
    })



    // ══════════════════════════════════════════
    //  PANEL DE USUARIOS (solo admin)
    // ══════════════════════════════════════════
    let todosLosUsuarios = []
    let usuarioDetalleActual = null

    document.getElementById('btnVerUsuarios').addEventListener('click', async () => {
      document.getElementById('modalUsuarios').classList.add('activo')
      await cargarTodosLosUsuarios()
    })
    document.getElementById('btnCerrarUsuarios').addEventListener('click', () => {
      document.getElementById('modalUsuarios').classList.remove('activo')
    })
    document.getElementById('btnCerrarUsuarioDetalle').addEventListener('click', () => {
      document.getElementById('modalUsuarioDetalle').classList.remove('activo')
    })

    async function cargarTodosLosUsuarios() {
      const lista = document.getElementById('usuariosLista')
      const count = document.getElementById('usuariosCount')
      lista.innerHTML = '<p class="cargando">Cargando...</p>'

      // Cargar perfiles desde tabla profiles
      const { data: perfiles, error } = await supabase
        .from('profiles').select('*').order('email')

      if (error) {
        lista.innerHTML = `<p class="cargando" style="color:#d94060">Error al cargar: ${error.message}<br><small>Verificá las políticas RLS de la tabla profiles.</small></p>`
        return
      }

      // Cruzar con makers para saber quién tiene perfil maker
      // makersData ya está cargado globalmente
      todosLosUsuarios = perfiles || []

      // Agregar usuarios de makers que no tengan fila en profiles
      makersData.forEach(m => {
        const yaEsta = todosLosUsuarios.find(u => u.id === m.user_id)
        if (!yaEsta) {
          todosLosUsuarios.push({
            id:    m.user_id,
            email: m.nombre || 'Usuario Maker',
            nombre: m.nombre,
            foto_url: m.foto_url,
            rol: 'user'
          })
        }
      })

      count.textContent = `${todosLosUsuarios.length} usuario${todosLosUsuarios.length !== 1 ? 's' : ''}`
      renderUsuariosLista(todosLosUsuarios)

      // Búsqueda en tiempo real
      document.getElementById('usuariosBuscador').oninput = (e) => {
        const q = e.target.value.toLowerCase()
        const filtrados = todosLosUsuarios.filter(u =>
          (u.email || '').toLowerCase().includes(q) ||
          (u.nombre || '').toLowerCase().includes(q)
        )
        renderUsuariosLista(filtrados)
      }
    }

    function renderUsuariosLista(usuarios) {
      const lista = document.getElementById('usuariosLista')
      if (usuarios.length === 0) {
        lista.innerHTML = '<p class="cargando">No se encontraron usuarios.</p>'
        return
      }
      lista.innerHTML = usuarios.map(u => {
        const inicial = (u.nombre || u.email || '?')[0].toUpperCase()
        const rolBadge = u.rol === 'admin'
          ? '<span class="ud-rol-badge ud-rol-badge--admin">Admin</span>'
          : '<span class="ud-rol-badge">Usuario</span>'
        const tieneMaker = makersData.find(m => m.user_id === u.id)
        return `
        <div class="usuario-item" onclick="window.abrirUsuarioDetalle('${u.id}')">
          <div class="usuario-item__avatar">
            ${u.foto_url
              ? `<img src="${u.foto_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
              : `<span>${inicial}</span>`}
          </div>
          <div class="usuario-item__info">
            <p class="usuario-item__nombre">${u.nombre || 'Sin nombre'}</p>
            <p class="usuario-item__email">${u.email || '—'}</p>
          </div>
          <div class="usuario-item__badges">
            ${rolBadge}
            ${tieneMaker ? '<span class="ud-rol-badge ud-rol-badge--maker">Maker</span>' : ''}
            ${u.instagram ? `<span class="ud-ig-icon" title="Tiene Instagram">
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.975-.975 2.242-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.333.014 7.053.072 5.775.13 4.602.402 3.635 1.368 2.668 2.335 2.396 3.508 2.338 4.786 2.28 6.066 2.163 6.474 2.163 12c0 5.526.117 5.934.175 7.214.058 1.278.33 2.451 1.297 3.418.967.967 2.14 1.239 3.418 1.297C8.333 23.986 8.741 24 12 24s3.667-.014 4.947-.072c1.278-.058 2.451-.33 3.418-1.297.967-.967 1.239-2.14 1.297-3.418.058-1.28.072-1.688.072-7.214 0-5.526-.014-5.934-.072-7.214-.058-1.278-.33-2.451-1.297-3.418C19.398.402 18.225.13 16.947.072 15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
            </span>` : ''}
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="color:var(--muted);flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg>
        </div>`
      }).join('')
    }

    window.abrirUsuarioDetalle = async (uid) => {
      const u = todosLosUsuarios.find(x => x.id === uid)
      if (!u) return
      usuarioDetalleActual = u

      // Avatar
      const avatarImg = document.getElementById('udAvatarImg')
      const avatarTxt = document.getElementById('udAvatarTxt')
      if (u.foto_url) {
        avatarImg.src = u.foto_url; avatarImg.style.display = 'block'; avatarTxt.style.display = 'none'
      } else {
        avatarImg.style.display = 'none'; avatarTxt.style.display = 'block'
        avatarTxt.textContent = (u.nombre || u.email || '?')[0].toUpperCase()
      }

      // Info básica
      document.getElementById('udNombre').textContent = u.nombre || 'Sin nombre'
      document.getElementById('udEmail').textContent  = u.email  || '—'
      const rolEl = document.getElementById('udRol')
      rolEl.textContent = u.rol === 'admin' ? '✦ Administrador' : 'Usuario'
      rolEl.className = 'usuario-detalle__rol' + (u.rol === 'admin' ? ' admin' : '')

      // Descripción del perfil
      const desc = u.descripcion
      document.getElementById('udPerfil').innerHTML = desc
        ? `<div class="ud-campo">
             <span class="ud-campo__label">Descripción</span>
             <span class="ud-campo__value">${desc}</span>
           </div>`
        : '<p style="font-size:0.78rem;color:var(--muted)">Sin descripción cargada.</p>'

      // Redes sociales — siempre mostrar la sección
      const redes = []
      if (u.instagram) redes.push(`<a href="${u.instagram}" target="_blank" class="ud-red ud-red--ig">
        <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.975-.975 2.242-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.333.014 7.053.072 5.775.13 4.602.402 3.635 1.368 2.668 2.335 2.396 3.508 2.338 4.786 2.28 6.066 2.163 6.474 2.163 12c0 5.526.117 5.934.175 7.214.058 1.278.33 2.451 1.297 3.418.967.967 2.14 1.239 3.418 1.297C8.333 23.986 8.741 24 12 24s3.667-.014 4.947-.072c1.278-.058 2.451-.33 3.418-1.297.967-.967 1.239-2.14 1.297-3.418.058-1.28.072-1.688.072-7.214 0-5.526-.014-5.934-.072-7.214-.058-1.278-.33-2.451-1.297-3.418C19.398.402 18.225.13 16.947.072 15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
        Instagram</a>`)
      if (u.telegram)  redes.push(`<a href="${u.telegram}"  target="_blank" class="ud-red ud-red--tg">
        <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
        Telegram</a>`)
      if (u.tiktok)    redes.push(`<a href="${u.tiktok}"    target="_blank" class="ud-red ud-red--tt">
        <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
        TikTok</a>`)
      document.getElementById('udRedesSec').style.display = 'block'
      document.getElementById('udRedes').innerHTML = redes.length > 0
        ? redes.join('')
        : '<p style="font-size:0.78rem;color:var(--muted)">No tiene redes sociales cargadas.</p>'

      // Perfil Maker — siempre mostrar sección
      const maker = makersData.find(m => m.user_id === uid)
      const makerSec = document.getElementById('udMakerSec')
      makerSec.style.display = 'block'
      if (maker) {
        const proyFotos = (maker.proyectos || []).slice(0, 6)
          .map(url => `<div class="ud-maker-foto"><img src="${url}" loading="lazy"/></div>`).join('')
        document.getElementById('udMaker').innerHTML = `
          ${maker.descripcion
            ? `<div class="ud-campo" style="margin-bottom:0.75rem">
                <span class="ud-campo__label">Descripción</span>
                <span class="ud-campo__value">${maker.descripcion}</span>
               </div>`
            : '<p style="font-size:0.78rem;color:var(--muted);margin-bottom:0.5rem">Sin descripción maker.</p>'}
          ${maker.instagram
            ? `<a href="${maker.instagram}" target="_blank" class="ud-red ud-red--ig" style="margin-bottom:0.75rem;display:inline-flex;align-items:center;gap:0.4rem">Instagram Maker</a>`
            : '<p style="font-size:0.78rem;color:var(--muted);margin-bottom:0.5rem">Sin Instagram maker.</p>'}
          ${proyFotos
            ? `<div class="ud-maker-fotos">${proyFotos}</div>`
            : '<p style="font-size:0.78rem;color:var(--muted)">Sin fotos de proyectos.</p>'}
        `
      } else {
        document.getElementById('udMaker').innerHTML =
          '<p style="font-size:0.78rem;color:var(--muted)">Este usuario no tiene perfil Maker.</p>'
      }

      document.getElementById('modalUsuarioDetalle').classList.add('activo')
    }

    // ══════════════════════════════════════════

    //  ESTADÍSTICAS ADMIN
    // ══════════════════════════════════════════
    ;(function() {

      const NOMBRES = {
        'visit':         'Visita',
        'stl':           'Cuadros 2D',
        'llavero':       'Llavero',
        'caja':          'Caja con tapa',
        'maceta':        'Maceta',
        'marco':         'Marco',
        'cortante':      'Cortante',
        'tarjetas':      'Tarjetas',
        'costos':        'Calculadora costos',
        'mejora':        'Mejorador imágenes',
        'presupuesto':   'Presupuesto PDF',
        'fotoproducto':  'Cambiar fondo producto',
      }

      window.abrirEstadisticas = function() {
        const el = document.getElementById('modalEstadisticas')
        if (!el) return
        el.style.display = 'flex'
        document.body.style.overflow = 'hidden'
        cargarStats(1)
      }
      window.cerrarEstadisticas = function() {
        const el = document.getElementById('modalEstadisticas')
        if (el) el.style.display = 'none'
        document.body.style.overflow = ''
      }
      document.getElementById('modalEstadisticas')?.addEventListener('click', e => {
        if (e.target === document.getElementById('modalEstadisticas')) cerrarEstadisticas()
      })

      window.cargarStats = async function(days) {
        // Actualizar botones activos
        document.querySelectorAll('.stats-period-btn').forEach(b => {
          b.classList.toggle('stats-period-btn--active', parseInt(b.dataset.days) === days)
        })

        const desde = new Date()
        desde.setDate(desde.getDate() - days + 1)
        desde.setHours(0,0,0,0)
        const desdeISO = desde.toISOString()

        try {
          // Traer todos los eventos del período
          const { data, error } = await supabase
            .from('eventos')
            .select('tipo, herramienta, session_id, user_id, created_at')
            .gte('created_at', desdeISO)
            .order('created_at', { ascending: true })

          if (error) throw error

          // ── KPIs ───────────────────────────────────────────────
          const visitas    = new Set(data.filter(e => e.tipo==='visit').map(e => e.session_id))
          const usos       = data.filter(e => e.tipo==='tool_use')
          const descargas  = data.filter(e => e.tipo==='download')

          document.getElementById('kpiVisitas').textContent   = visitas.size
          document.getElementById('kpiUsos').textContent      = usos.length
          document.getElementById('kpiDescargas').textContent = descargas.length

          // KPI usuarios — usar tabla correcta 'profiles'
          const { count: countUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
          document.getElementById('kpiUsuarios').textContent = countUsers ?? '—'

          // Datos históricos adicionales (siempre, sin filtro de fecha)
          const { count: countProductos } = await supabase.from('productos').select('*', { count: 'exact', head: true })
          const { count: countMakers }    = await supabase.from('makers').select('*', { count: 'exact', head: true })
          document.getElementById('kpiProductos').textContent = countProductos ?? '—'
          document.getElementById('kpiMakers').textContent    = countMakers ?? '—'

          // ── Gráfico de actividad ───────────────────────────────
          const byDay = {}
          data.filter(e => e.tipo==='visit').forEach(e => {
            const day = e.created_at.slice(0,10)
            byDay[day] = (byDay[day] || 0) + 1
          })
          drawChart(byDay, days)

          // ── Herramientas más usadas ────────────────────────────
          const toolCount = {}
          usos.forEach(e => {
            if (!e.herramienta) return
            toolCount[e.herramienta] = (toolCount[e.herramienta] || 0) + 1
          })
          renderBarras('statsHerramientas', toolCount, 'usos')

          // ── Descargas por herramienta ──────────────────────────
          const dlCount = {}
          descargas.forEach(e => {
            if (!e.herramienta) return
            dlCount[e.herramienta] = (dlCount[e.herramienta] || 0) + 1
          })
          renderBarras('statsDescargas', dlCount, 'descargas')

          document.getElementById('statsLastUpdate').textContent =
            'Actualizado: ' + new Date().toLocaleTimeString('es-AR')

        } catch(e) {
          console.error('cargarStats:', e)
        }
      }

      function renderBarras(containerId, countObj, sufijo) {
        const el = document.getElementById(containerId)
        if (!el) return
        const entries = Object.entries(countObj).sort((a,b) => b[1]-a[1])
        if (!entries.length) { el.innerHTML = '<p style="color:var(--muted);font-size:.75rem">Sin datos en este período</p>'; return }
        const max = entries[0][1]
        el.innerHTML = entries.map(function(e) { var key=e[0], val=e[1];
          const pct = Math.round(val/max*100)
          const label = NOMBRES[key] || key
          return `<div style="display:grid;grid-template-columns:140px 1fr 40px;gap:.5rem;align-items:center">
            <span style="font-size:.72rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${label}">${label}</span>
            <div style="background:var(--bg3);border-radius:4px;height:8px;overflow:hidden">
              <div style="background:var(--cyan);height:100%;width:${pct}%;border-radius:4px;transition:width .4s"></div>
            </div>
            <span style="font-size:.72rem;color:var(--cyan);text-align:right">${val}</span>
          </div>`
        }).join('')
      }

      function drawChart(byDay, days) {
        const canvas = document.getElementById('statsChartCanvas')
        if (!canvas) return
        const wrap = canvas.parentElement
        canvas.width  = wrap.clientWidth  || 600
        canvas.height = wrap.clientHeight || 100
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Generar todos los días del período
        const labels = [], values = []
        for (let i = days-1; i >= 0; i--) {
          const d = new Date(); d.setDate(d.getDate()-i)
          const key = d.toISOString().slice(0,10)
          labels.push(key.slice(5))  // MM-DD
          values.push(byDay[key] || 0)
        }
        if (!values.some(v => v > 0)) return

        const max = Math.max(...values, 1)
        const W = canvas.width, H = canvas.height
        const padL = 10, padR = 10, padT = 10, padB = 20
        const chartW = W - padL - padR
        const chartH = H - padT - padB
        const barW = Math.max(2, chartW / values.length - 2)

        // Grid line
        ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(W-padR, padT); ctx.stroke()

        // Barras
        values.forEach((v, i) => {
          const x = padL + i * (chartW / values.length)
          const bh = (v / max) * chartH
          const y = padT + chartH - bh
          const alpha = v > 0 ? 0.85 : 0.15
          ctx.fillStyle = `rgba(21,154,156,${alpha})`
          ctx.beginPath()
          ctx.roundRect(x, y, barW, bh, 2)
          ctx.fill()
        })

        // Labels (cada N días para no solapar)
        ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center'
        const step = Math.ceil(labels.length / 8)
        labels.forEach((l, i) => {
          if (i % step === 0) ctx.fillText(l, padL + i*(chartW/values.length) + barW/2, H - 4)
        })
      }

    })()

    // ══════════════════════════════════════════
    //  ADMIN PANEL FLOTANTE — toggle collapse
    // ══════════════════════════════════════════
    ;(function() {
      const toggle = document.getElementById('adminFloatToggle')
      const body   = document.getElementById('adminFloatBody')
      const arrow  = document.getElementById('adminFloatArrow')
      if (!toggle || !body) return
      let collapsed = false
      toggle.addEventListener('click', function() {
        collapsed = !collapsed
        body.classList.toggle('collapsed', collapsed)
        toggle.classList.toggle('collapsed', collapsed)
      })
    })()

    // ══════════════════════════════════════════
    //  REPORTAR PROBLEMA — modal + Supabase
    // ══════════════════════════════════════════
    ;(function() {
      const btnAbrir    = document.getElementById('bugFloatBtn')
      const modal       = document.getElementById('modalBug')
      const btnCerrar   = document.getElementById('btnCerrarBug')
      const btnCancelar = document.getElementById('bugBtnCancelar')
      const loginGate   = document.getElementById('bugLoginGate')
      const bugForm     = document.getElementById('bugForm')
      const feedback    = document.getElementById('bugFeedback')
      const btnLogin    = document.getElementById('bugBtnLogin')

      function abrirModalBug() {
        modal.style.display = 'flex'
        // Mostrar formulario o gate según sesión
        if (perfilId) {
          loginGate.style.display = 'none'
          bugForm.style.display   = 'block'
        } else {
          loginGate.style.display = 'block'
          bugForm.style.display   = 'none'
        }
        feedback.style.display = 'none'
        document.getElementById('bugTexto').value   = ''
        document.getElementById('bugSeccion').value = ''
      }

      function cerrarModalBug() {
        modal.style.display = 'none'
      }

      btnAbrir.addEventListener('click', abrirModalBug)
      btnCerrar.addEventListener('click', cerrarModalBug)
      btnCancelar.addEventListener('click', cerrarModalBug)
      modal.addEventListener('click', function(e) {
        if (e.target === modal) cerrarModalBug()
      })

      // Si hacen click en "Iniciar sesión" desde el gate
      btnLogin.addEventListener('click', function() {
        cerrarModalBug()
        document.getElementById('btnUserLogin').click()
      })

      // Envío del formulario
      bugForm.addEventListener('submit', async function(e) {
        e.preventDefault()
        const texto   = document.getElementById('bugTexto').value.trim()
        const seccion = document.getElementById('bugSeccion').value.trim()
        if (!texto) return

        const btnEnviar = document.getElementById('bugBtnEnviar')
        btnEnviar.disabled = true
        btnEnviar.textContent = 'Enviando...'
        feedback.style.display = 'none'

        try {
          // user_id debe ser el UUID de auth.users, no el id bigint de perfil
          const authUserId = usuarioActual?.id
          if (!authUserId) throw new Error('No hay sesión activa')

          const { error } = await supabase.from('reportes_problemas').insert({
            user_id:  authUserId,
            texto,
            seccion:  seccion || null,
          })

          if (error) {
            console.error('Bug report DB error:', error)
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
              throw new Error('La tabla reportes_problemas no existe en Supabase.')
            }
            throw error
          }

          // Notificar por email al admin via Edge Function
          supabase.functions.invoke('notificar-reporte', {
            method: 'POST',
            body: { texto, seccion, user_id: authUserId }
          }).catch(function(){}) // Fire and forget

          feedback.style.display = 'block'
          feedback.innerHTML = '<div class="form-success">✓ Reporte enviado. ¡Gracias por ayudarnos a mejorar!</div>'
          setTimeout(cerrarModalBug, 2200)
        } catch(err) {
          feedback.style.display = 'block'
          feedback.innerHTML = '<div style="color:#d94060;font-size:0.82rem;padding:0.5rem 0.85rem;background:rgba(217,64,96,0.08);border:1px solid rgba(217,64,96,0.25);border-radius:6px">Error al enviar. Intentá de nuevo.</div>'
          console.error('Bug report error:', err)
        } finally {
          btnEnviar.disabled = false
          btnEnviar.textContent = 'Enviar reporte'
        }
      })

      // Exponer función para reabrir el modal desde login exitoso
      window.reopenBugModalIfPending = function() {
        if (modal.style.display === 'flex' && loginGate.style.display !== 'none') {
          abrirModalBug()
        }
      }
    })()

    // ══════════════════════════════════════════
    //  REPORTES ADMIN — cargar y mostrar
    // ══════════════════════════════════════════
    window.cargarReportesAdmin = async function() {
      const { data, error } = await supabase
        .from('reportes_problemas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) { console.error('Reportes error:', error); return }

      const container = document.getElementById('reportesAdminContainer')
      if (!container) return

      if (!data || !data.length) {
        container.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;padding:1rem 0">No hay reportes aún.</p>'
        return
      }

      container.innerHTML = '<div class="reportes-lista">' + data.map(function(r) {
        const fecha = new Date(r.created_at).toLocaleDateString('es-AR', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
        // user_id es uuid de auth.users — mostramos los primeros 8 chars como referencia
        const user = r.user_id?.slice(0, 8) || 'Anónimo'
        return '<div class="reporte-item" data-id="' + r.id + '">'
          + '<div class="reporte-item__header">'
          + '<span class="reporte-item__user">Usuario ' + user + '</span>'
          + (r.seccion ? '<span class="reporte-item__seccion">' + r.seccion + '</span>' : '')
          + '<span class="reporte-item__fecha">' + fecha + '</span>'
          + '<button class="reporte-item__del" onclick="eliminarReporte(\'' + r.id + '\')" title="Eliminar">✕</button>'
          + '</div>'
          + '<p class="reporte-item__texto">' + (r.texto || '') + '</p>'
          + '</div>'
      }).join('') + '</div>'
    }

    window.eliminarReporte = async function(id) {
      if (!confirm('¿Eliminar este reporte?')) return
      await supabase.from('reportes_problemas').delete().eq('id', id)
      window.cargarReportesAdmin()
    }

    window.abrirReportesAdmin = function() {
      const m = document.getElementById('modalReportesAdmin')
      if (!m) return
      m.style.display = 'flex'
      window.cargarReportesAdmin()
      m.addEventListener('click', function handler(e) {
        if (e.target === m) { m.style.display='none'; m.removeEventListener('click', handler) }
      })
    }


    // ── Lazy-play de videos: pausar los que salen del viewport ─────────
    if ('IntersectionObserver' in window) {
      const _vidObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const v = entry.target
          if (!entry.isIntersecting) {
            v.pause()
            v.currentTime = 0
          }
        })
      }, { threshold: 0.1 })
      // Observar todos los videos del catálogo (también los nuevos)
      const _observeVideos = () => {
        document.querySelectorAll('.lazy-video').forEach(v => {
          if (!v.dataset.observed) { _vidObserver.observe(v); v.dataset.observed = '1' }
        })
      }
      // Ejecutar después de cada render de catálogo
      const _origRenderCards = window.renderCards
      if (typeof _origRenderCards === 'function') {
        window.renderCards = function(...args) { _origRenderCards(...args); setTimeout(_observeVideos, 200) }
      }
      setTimeout(_observeVideos, 2000)
    }


    // ── Lazy-play de videos: pausar los que salen del viewport ─────────
    if ('IntersectionObserver' in window) {
      const _vidObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const v = entry.target
          if (!entry.isIntersecting) {
            v.pause()
            v.currentTime = 0
          }
        })
      }, { threshold: 0.1 })
      // Observar todos los videos del catálogo (también los nuevos)
      const _observeVideos = () => {
        document.querySelectorAll('.lazy-video').forEach(v => {
          if (!v.dataset.observed) { _vidObserver.observe(v); v.dataset.observed = '1' }
        })
      }
      // Ejecutar después de cada render de catálogo
      const _origRenderCards = window.renderCards
      if (typeof _origRenderCards === 'function') {
        window.renderCards = function(...args) { _origRenderCards(...args); setTimeout(_observeVideos, 200) }
      }
      setTimeout(_observeVideos, 2000)
    }


    // ── ADMIN: Gestión del carrusel de novedades ───────────────────────
    function carruselAdminRender() {
      const lista = document.getElementById('carruselAdminLista')
      if (!lista) return
      lista.innerHTML = ''
      carruselItems.forEach((item, i) => {
        const h = CARRUSEL_HERRAMIENTAS[item.herramienta_id] || {}
        const rawUrl = item.imagen_url || ''
        const isSupabase = rawUrl.includes('supabase.co/storage')
        const imgUrl = (!rawUrl || isSupabase)
          ? (window._portadasMap?.[item.herramienta_id] || '')
          : rawUrl
        const row = document.createElement('div')
        row.style.cssText = 'display:flex;align-items:center;gap:.6rem;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:.5rem .75rem'
        row.innerHTML = `
          <div style="width:56px;height:36px;border-radius:5px;flex-shrink:0;overflow:hidden;background:#061520;${imgUrl?'background-image:url('+imgUrl+');background-size:cover;background-position:center':'display:flex;align-items:center;justify-content:center'}">
            ${imgUrl?'':'<span style="font-size:1.1rem">'+( h.icono||'✨')+'</span>'}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:.75rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.titulo_custom||h.titulo||'?'}</div>
            <div style="font-size:.62rem;color:var(--muted)">${imgUrl ? '✅ Con portada' : '⚠️ Sin portada — usa la de la herramienta'}</div>
          </div>
          <button onclick="carruselAdminEditar(${i})" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:5px;padding:.2rem .5rem;cursor:pointer;font-size:.7rem">✏️</button>
          <button onclick="carruselAdminEliminar(${i})" style="background:none;border:1px solid rgba(255,60,60,.3);color:#f66;border-radius:5px;padding:.2rem .5rem;cursor:pointer;font-size:.7rem">🗑</button>`
        lista.appendChild(row)
      })
      if (carruselItems.length === 0) {
        lista.innerHTML = '<p style="font-size:.72rem;color:var(--muted)">No hay slides configurados. Hacé clic en "Agregar slide".</p>'
      }
    }

    window.carruselAdminEditar = function carruselAdminEditar(idx) {
      const item = idx >= 0 ? carruselItems[idx] : null

      // Construir opciones del select — al elegir herramienta, auto-carga su portada
      const h_opts = Object.entries(CARRUSEL_HERRAMIENTAS).map(function(e) { var id=e[0],h=e[1]; return `<option value="${id}" ${item?.herramienta_id===id?'selected':''}>${h.icono} ${h.titulo}</option>` }).join('')

      const modal = document.createElement('div')
      modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,8,15,.92);display:flex;align-items:center;justify-content:center'
      modal.innerHTML = `
        <div style="background:var(--bg-card,#0a2535);border:1px solid var(--border);border-radius:14px;padding:1.5rem;width:min(500px,95vw);display:flex;flex-direction:column;gap:.75rem">
          <h3 style="font-family:var(--font-head);font-size:.8rem;font-weight:700;letter-spacing:.1em;color:var(--cyan);margin:0;text-transform:uppercase">${item?'Editar slide':'Nuevo slide'}</h3>
          <div>
            <label style="font-size:.7rem;color:var(--muted)">Herramienta</label>
            <select id="_cSlideHerr" style="width:100%;margin-top:.25rem;background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:.4rem .5rem;font-size:.78rem">${h_opts}</select>
          </div>
          <div>
            <label style="font-size:.7rem;color:var(--muted)">Título personalizado <span style="opacity:.6">(opcional)</span></label>
            <input type="text" id="_cSlideTit" value="${item?.titulo_custom||''}" placeholder="Si vacío usa el nombre de la herramienta" style="width:100%;margin-top:.25rem;background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:.4rem .5rem;font-size:.78rem;box-sizing:border-box"/>
          </div>
          <div>
            <label style="font-size:.7rem;color:var(--muted)">Subtítulo / descripción breve</label>
            <input type="text" id="_cSlideSub" value="${item?.subtitulo||''}" placeholder="Ej: Generá STLs personalizados en segundos" style="width:100%;margin-top:.25rem;background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:.4rem .5rem;font-size:.78rem;box-sizing:border-box"/>
          </div>
          <div>
            <label style="font-size:.7rem;color:var(--muted)">Badge <span style="opacity:.6">(opcional — ej: Nuevo, Beta, IA)</span></label>
            <input type="text" id="_cSlideBadge" value="${item?.badge||''}" placeholder="Nuevo" style="width:100%;margin-top:.25rem;background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:.4rem .5rem;font-size:.78rem;box-sizing:border-box"/>
          </div>
          <div>
            <label style="font-size:.7rem;color:var(--muted)">
              URL de imagen de fondo
              <span style="opacity:.6;font-size:.65rem"> — si vacío usa la portada de la herramienta</span>
            </label>
            <input type="text" id="_cSlideImg" value="${item?.imagen_url||''}"
              placeholder="https://raw.githubusercontent.com/rabbit-3d/rabbit-3d.github.io/main/portadas/llaveros.png"
              style="width:100%;margin-top:.25rem;background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:.4rem .5rem;font-size:.72rem;box-sizing:border-box"/>
            <div id="_cSlideImgPreview" style="margin-top:.4rem;height:70px;border-radius:6px;background-size:cover;background-position:center;background-color:rgba(255,255,255,.04);transition:background .3s;${(item?.imagen_url || (window._portadasMap&&window._portadasMap[item?.herramienta_id])) ? `background-image:url('${item?.imagen_url || window._portadasMap[item?.herramienta_id]}')` : ''}"></div>
            ${!item?.imagen_url && window._portadasMap?.[item?.herramienta_id] ? `<p style="font-size:.62rem;color:var(--cyan);margin:.3rem 0 0">✅ Usando portada de la herramienta: ${window._portadasMap[item.herramienta_id].split('/').pop()}</p>` : ''}
          </div>
          <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.25rem">
            <button id="_cSlideCancel" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:.4rem .9rem;cursor:pointer;font-size:.78rem">Cancelar</button>
            <button id="_cSlideGuardar" style="background:var(--cyan);border:none;color:#fff;border-radius:6px;padding:.4rem .9rem;cursor:pointer;font-size:.78rem;font-weight:600">Guardar</button>
          </div>
        </div>`
      document.body.appendChild(modal)

      // Preview en tiempo real al escribir la URL
      const imgInput = document.getElementById('_cSlideImg')
      const preview = document.getElementById('_cSlideImgPreview')
      imgInput.addEventListener('input', () => {
        const url = imgInput.value.trim()
        preview.style.backgroundImage = url ? `url('${url}')` : ''
      })

      document.getElementById('_cSlideCancel').onclick = () => modal.remove()
      document.getElementById('_cSlideGuardar').onclick = async () => {
        const herramienta_id = document.getElementById('_cSlideHerr').value
        const titulo_custom = document.getElementById('_cSlideTit').value.trim()
        const subtitulo = document.getElementById('_cSlideSub').value.trim()
        const badge = document.getElementById('_cSlideBadge').value.trim()
        const imagen_url = document.getElementById('_cSlideImg').value.trim()
        const orden = item ? item.orden : carruselItems.length
        const payload = JSON.stringify({herramienta_id,titulo_custom,subtitulo,badge,imagen_url,orden})
        if (item && item.id) {
          await supabase.from('media').update({nombre:payload}).eq('id', item.id)
          carruselItems[idx] = {...carruselItems[idx], herramienta_id, titulo_custom, subtitulo, badge, imagen_url, orden}
        } else {
          const {data} = await supabase.from('media').insert([{tipo:'carrusel_item',url:'',nombre:payload}]).select('id').single()
          if (data) carruselItems.push({id:data.id, herramienta_id, titulo_custom, subtitulo, badge, imagen_url, orden})
        }
        modal.remove()
        carruselAdminRender()
        renderCarrusel()
      }
    }
    // Alias para los onclick en el HTML generado
    window.carruselAdminEliminar = carruselAdminEliminar

    async function carruselAdminEliminar(idx) {
      const item = carruselItems[idx]
      if (!item || !confirm('¿Eliminar este slide del carrusel?')) return
      await supabase.from('media').delete().eq('id', item.id)
      carruselItems.splice(idx, 1)
      carruselAdminRender()
      renderCarrusel()
    }

    // Botón agregar slide
    document.addEventListener('click', e => {
      if (e.target.id === 'btnAgregarSlide') carruselAdminEditar(-1)
    })

    // Renderizar lista cuando se abre el panel admin
    const _origAbrirGestion = window.abrirGestionHerramientas
    window.abrirGestionHerramientas = function() {
      if (_origAbrirGestion) _origAbrirGestion()
      carruselAdminRender()
    }

    // ── Limpiar URLs viejas de Supabase Storage ─────────────────────────
    // ── Toggle visibilidad sección Tendencias ────────────────────────────
    async function _tendenciasSetVisible(visible) {
      const section = document.getElementById('makerworld')
      const btn = document.getElementById('btnToggleTendencias')
      const label = document.getElementById('tendVisLabel')
      if (section) section.style.display = visible ? '' : 'none'
      if (btn) {
        btn.textContent = visible ? '👁 Visible' : '🙈 Oculta'
        btn.style.background = visible ? 'var(--cyan)' : '#8B0000'
      }
      if (label) label.textContent = visible ? 'Visible para usuarios' : 'Oculta para usuarios'
    }

    async function _tendenciasCargarEstado() {
      try {
        const { data } = await supabase.from('media').select('nombre').eq('tipo','config-tendencias-visible').maybeSingle()
        const visible = !data || data.nombre !== 'false'
        await _tendenciasSetVisible(visible)
      } catch(e) {}
    }

    window.abrirGestorTendencias = function() {
      const modal = document.getElementById('modalGestorTendencias')
      if (modal) modal.style.display = 'flex'
    }

    window.toggleTendencias = async function() {
      const section = document.getElementById('makerworld')
      const esVisible = section && section.style.display !== 'none'
      const nuevaVisibilidad = !esVisible
      await _tendenciasSetVisible(nuevaVisibilidad)
      try {
        await supabase.from('media').delete().eq('tipo','config-tendencias-visible')
        await supabase.from('media').insert([{tipo:'config-tendencias-visible', url:'', nombre: String(nuevaVisibilidad)}])
      } catch(e) { console.warn('Error guardando estado tendencias:', e) }
    }

    // ── Migrar URLs de fondos de rabbit-3d.github.io → lamadriguera.site ─
    async function migrarUrlsFondos() {
      try {
        const { data } = await supabase.from('media').select('id, url').like('tipo', 'foto-fondo-%')
        if (!data || !data.length) return
        const viejas = data.filter(r => r.url && r.url.includes('rabbit-3d.github.io/fondos/'))
        if (!viejas.length) { return }
        for (const r of viejas) {
          const newUrl = r.url.replace('https://rabbit-3d.github.io/fondos/', 'https://lamadriguera.site/fondos/')
          await supabase.from('media').update({ url: newUrl }).eq('id', r.id)
        }
      } catch(e) { console.warn('[Fondos] Error migrando URLs:', e) }
    }

    window.cerrarReportesAdmin = function() {
      const m = document.getElementById('modalReportesAdmin')
      if (m) m.style.display = 'none'
    }

    // ══════════════════════════════════════════════════
    //  EDITOR DE POSICIÓN DE TARJETA
    //  Solo mueve logo y textos — no edita contenido
    // ══════════════════════════════════════════════════
    let _ted = {
      diseno:null, idx:0, dragging:null, timer:null, canvas:null,
      logo:{ox:0, oy:0},
      // Efectos del logo
      fx:{ blur:0, offX:4, offY:4, shadowColor:'#000000',
           brightness:100, contrast:100, saturation:100,
           veloOpac:0, veloColor:'#000000', veloBlend:'source-over' }
    }

    // Valores actuales del formulario de tarjetas
    function _tedTexts(){
      return {
        neg: document.getElementById('tarjNegocio').value.trim(),
        msg: document.getElementById('tarjMensaje').value.trim(),
        con: document.getElementById('tarjContacto').value.trim()
      }
    }

    window.tarjEditorAbrir = function(diseno, idx) {
      _ted.diseno = diseno; _ted.idx = idx
      _ted.logo = {ox:0,oy:0}; _ted.neg = {ox:0,oy:0}
      _ted.msg = {ox:0,oy:0}; _ted.con = {ox:0,oy:0}
      // Resetear posición del logo
      _ted.lw0 = 0; _ted.lh0 = 0; _ted.lx0 = 0; _ted.ly0 = 0

      // Capturar posición del logo interceptando drawImage en el render del diseño
      if (tarjLogoImg) {
        const W = TARJ_W, H = TARJ_H
        const spy = document.createElement('canvas'); spy.width=W; spy.height=H
        const spyCtx = spy.getContext('2d')
        const origDrawImage = spyCtx.drawImage.bind(spyCtx)
        // Interceptar solo la llamada a drawImage con el logo
        spyCtx.drawImage = function(src) {
          if (src === tarjLogoImg || src === window._tarjLogoParaRender) {
            // Capturar coordenadas y dimensiones pasadas al drawImage
            const args = Array.from(arguments)
            // drawImage(img, dx, dy, dw, dh)
            if (args.length >= 5) {
              _ted.lx0 = args[1]; _ted.ly0 = args[2]
              _ted.lw0 = args[3]; _ted.lh0 = args[4]
            } else if (args.length >= 3) {
              _ted.lx0 = args[1]; _ted.ly0 = args[2]
              _ted.lw0 = src.width; _ted.lh0 = src.height
            }
          }
          origDrawImage.apply(spyCtx, arguments)
        }
        const t = _tedTexts()
        diseno.render(spyCtx, W, H, window._tarjLogoParaRender || tarjLogoImg,
          t.neg||'Tu Negocio', t.msg||'¡Gracias por tu compra!', t.con||'',
          tarjColores[0], tarjColores[1], tarjColores[2], tarjColores[3])
        spy.width = 0; spy.height = 0
      }

      const ov = document.getElementById('tarjEditorOverlay')
      if(!ov) return
      ov.style.display = 'flex'
      document.body.style.overflow = 'hidden'
      document.getElementById('tarjEditorNombre').textContent = '✏️ ' + diseno.nombre
      _tedFxSyncUI()
      _tedFxBindSliders()
      setTimeout(_tedDraw, 60)
    }
    let _tedSlidersBound = false
    function _tedFxBindSliders(){
      if(_tedSlidersBound) return
      _tedSlidersBound = true
      const rd=()=>{clearTimeout(_ted.timer);_ted.timer=setTimeout(_tedDraw,40)}
      const bind=(id,key,sfx)=>{const el=document.getElementById(id);if(!el)return;el.addEventListener('input',function(){_ted.fx[key]=parseFloat(this.value);const lb=document.getElementById(id+'Val');if(lb)lb.textContent=this.value+sfx;rd()})}
      bind('tedBlur','blur','px');bind('tedOffX','offX','px');bind('tedOffY','offY','px')
      const sc=document.getElementById('tedShadowColor');if(sc)sc.addEventListener('input',function(){_ted.fx.shadowColor=this.value;rd()})
      bind('tedBrillo','brightness','%');bind('tedContraste','contrast','%');bind('tedSat','saturation','%')
      bind('tedVelo','veloOpac','%')
      const vc=document.getElementById('tedVeloColor');if(vc)vc.addEventListener('input',function(){_ted.fx.veloColor=this.value;rd()})
      const vb=document.getElementById('tedVeloBlend');if(vb)vb.addEventListener('change',function(){_ted.fx.veloBlend=this.value;rd()})
    }

    window.tarjEditorCerrar = function() {
      document.getElementById('tarjEditorOverlay').style.display = 'none'
      document.body.style.overflow = ''
      if(_ted.canvas){ _ted.canvas.width=0; _ted.canvas.height=0; _ted.canvas=null }
      // Liberar canvas de pantalla también
      const _dc=document.getElementById('tarjEditorCanvas');if(_dc){_dc.width=1;_dc.height=1}
      clearTimeout(_ted.timer)
    }

    window.tarjEditorReset = function() {
      _ted.logo={ox:0,oy:0}
      _ted.fx={blur:0,offX:4,offY:4,shadowColor:'#000000',brightness:100,contrast:100,saturation:100,veloOpac:0,veloColor:'#000000',veloBlend:'source-over'}
      _tedFxSyncUI()
      _tedDraw()
    }
    function _tedFxSyncUI(){
      const f=_ted.fx
      const sv=(id,v,sfx='')=>{const e=document.getElementById(id);if(e)e.value=v;const l=document.getElementById(id+'Val');if(l)l.textContent=v+sfx}
      sv('tedBlur',f.blur,'px');sv('tedOffX',f.offX,'px');sv('tedOffY',f.offY,'px')
      const sc=document.getElementById('tedShadowColor');if(sc)sc.value=f.shadowColor
      sv('tedBrillo',f.brightness,'%');sv('tedContraste',f.contrast,'%');sv('tedSat',f.saturation,'%')
      sv('tedVelo',f.veloOpac,'%')
      const vc=document.getElementById('tedVeloColor');if(vc)vc.value=f.veloColor
      const vb=document.getElementById('tedVeloBlend');if(vb)vb.value=f.veloBlend
    }

    function _tedDraw() {
      if(!_ted.diseno) return
      const W=TARJ_W, H=TARJ_H, t=_tedTexts()
      const neg=t.neg||'Tu Negocio', msg=t.msg||'¡Gracias por tu compra!', con=t.con

      // ── Render base: diseño completo con textos originales ──────────
      // Pasamos logo=null para que el diseño NO dibuje el logo
      // Los textos los dibuja el diseño en su posición original
      const base = document.createElement('canvas'); base.width=W; base.height=H
      const bctx = base.getContext('2d')
      _ted.diseno.render(bctx, W, H, null, neg, msg, con,
        tarjColores[0], tarjColores[1], tarjColores[2], tarjColores[3])

      // ── Canvas final ────────────────────────────────────────────────
      const c = document.createElement('canvas'); c.width=W; c.height=H
      const ctx = c.getContext('2d')

      // 1) Dibujar fondo+textos del diseño
      ctx.drawImage(base, 0, 0)
      base.width=0; base.height=0

      // 2) Logo con offset — usa posición cacheada al abrir
      if(tarjLogoImg && _ted.lw0>0) {
        const lh=_ted.lh0, lw=_ted.lw0
        const lx=_ted.lx0 + _ted.logo.ox
        const ly=_ted.ly0 + _ted.logo.oy
        // Aplicar efectos
        ctx.save()
        const fx=_ted.fx
        if(fx&&fx.blur>0){ctx.shadowColor=fx.shadowColor;ctx.shadowBlur=fx.blur;ctx.shadowOffsetX=fx.offX;ctx.shadowOffsetY=fx.offY}
        if(fx)ctx.filter=`brightness(${fx.brightness}%) contrast(${fx.contrast}%) saturate(${fx.saturation}%)`
        ctx.drawImage(tarjLogoImg, lx, ly, lw, lh)
        ctx.restore()
        if(fx&&fx.veloOpac>0){ctx.save();ctx.globalAlpha=fx.veloOpac/100;ctx.globalCompositeOperation=fx.veloBlend;ctx.fillStyle=fx.veloColor;ctx.fillRect(0,0,W,H);ctx.restore()}
        // Borde punteado arrastrable
        ctx.save();ctx.strokeStyle='#159A9C';ctx.lineWidth=2;ctx.setLineDash([6,4])
        ctx.strokeRect(lx,ly,lw,lh);ctx.setLineDash([]);ctx.restore()
      }

      // (texto handles eliminados — solo logo es movible)

      // 4) Mostrar en pantalla
      const dc=document.getElementById('tarjEditorCanvas')
      const wr=document.getElementById('tarjEditorCanvasWrap')
      if(!dc||!wr) return
      const sc=Math.min((wr.clientWidth-40)/W, (wr.clientHeight-40)/H, 1)
      dc.width=W; dc.height=H
      dc.style.width=Math.round(W*sc)+'px'; dc.style.height=Math.round(H*sc)+'px'
      dc.dataset.sc=sc
      dc.getContext('2d').drawImage(c,0,0)
      if(_ted.canvas){_ted.canvas.width=0;_ted.canvas.height=0}
      _ted.canvas=c
    }

    // TARJ_ED_POS eliminado — textos no son movibles

    window.tarjEditorDescargar = function() {
      if(!_ted.diseno){ return }
      const W=TARJ_W, H=TARJ_H, t=_tedTexts()
      const neg=t.neg||'Tu Negocio', msg=t.msg||'¡Gracias por tu compra!', con=t.con
      const c=document.createElement('canvas'); c.width=W; c.height=H
      const ctx=c.getContext('2d')
      _ted.diseno.render(ctx,W,H,null,neg,msg,con,tarjColores[0],tarjColores[1],tarjColores[2],tarjColores[3])
      if(tarjLogoImg && _ted.lw0>0){
        const lh=_ted.lh0, lw=_ted.lw0
        const lx=_ted.lx0+_ted.logo.ox, ly=_ted.ly0+_ted.logo.oy
        const fx=_ted.fx
        ctx.save()
        if(fx&&fx.blur>0){ctx.shadowColor=fx.shadowColor;ctx.shadowBlur=fx.blur;ctx.shadowOffsetX=fx.offX;ctx.shadowOffsetY=fx.offY}
        if(fx)ctx.filter=`brightness(${fx.brightness}%) contrast(${fx.contrast}%) saturate(${fx.saturation}%)`
        ctx.drawImage(tarjLogoImg, lx, ly, lw, lh)
        ctx.restore()
        if(fx&&fx.veloOpac>0){ctx.save();ctx.globalAlpha=fx.veloOpac/100;ctx.globalCompositeOperation=fx.veloBlend;ctx.fillStyle=fx.veloColor;ctx.fillRect(0,0,W,H);ctx.restore()}
      }
      c.toBlob(blob=>{
        const url=URL.createObjectURL(blob),a=document.createElement('a')
        window.dlCheck('tarjetas',function(){ a.href=url;a.download=`tarjeta-editada-${_ted.idx+1}.png`;a.click();URL.revokeObjectURL(url);if(window.trackDescarga)trackDescarga('tarjetas') })
        c.width=0;c.height=0
      },'image/png')
    }

    // ── Drag ──────────────────────────────────────────────────────
    ;(function(){
      const isOpen=()=>document.getElementById('tarjEditorOverlay')?.style.display!=='none'
      const HIT=24

      function getCanvasPos(clientX,clientY){
        const dc=document.getElementById('tarjEditorCanvas');if(!dc)return null
        const r=dc.getBoundingClientRect(),sc=parseFloat(dc.dataset.sc||1)
        return{x:(clientX-r.left)/sc, y:(clientY-r.top)/sc}
      }

      function whichEl(x,y){
        if(!_ted.diseno)return null
        const W=TARJ_W,H=TARJ_H
        // Logo: detectar hitbox dinámicamente
        if(tarjLogoImg){
          const lh=H*0.28*(tarjLogoScale||1),lw=tarjLogoImg.width*(lh/tarjLogoImg.height)
          const lx=W*0.07+W*(_ted.logo.ox/100),ly=H*0.10+H*(_ted.logo.oy/100)
          if(x>=lx-HIT&&x<=lx+lw+HIT&&y>=ly-HIT&&y<=ly+lh+HIT)return'logo'
        }
        // Solo el logo es arrastrable
        return null
      }

      let lastPos=null
      function onStart(clientX,clientY){
        if(!isOpen())return false
        const pos=getCanvasPos(clientX,clientY);if(!pos)return false
        const el=whichEl(pos.x,pos.y)
        if(!el)return false
        _ted.dragging=el;lastPos=pos
        return true
      }
      function onMove(clientX,clientY){
        if(!_ted.dragging||!isOpen())return
        const pos=getCanvasPos(clientX,clientY);if(!pos)return
        const W=TARJ_W,H=TARJ_H
        const dox=((pos.x-lastPos.x)/W)*100
        const doy=((pos.y-lastPos.y)/H)*100
        lastPos=pos
        _ted[_ted.dragging].ox=Math.round((_ted[_ted.dragging].ox+dox)*10)/10
        _ted[_ted.dragging].oy=Math.round((_ted[_ted.dragging].oy+doy)*10)/10
        clearTimeout(_ted.timer);_ted.timer=setTimeout(_tedDraw,20)
      }
      function onEnd(){_ted.dragging=null}

      document.addEventListener('mousedown',e=>{
        const dc=document.getElementById('tarjEditorCanvas')
        if(e.target===dc&&onStart(e.clientX,e.clientY))e.preventDefault()
      })
      document.addEventListener('mousemove',e=>{if(isOpen())onMove(e.clientX,e.clientY)})
      document.addEventListener('mouseup',onEnd)
      document.addEventListener('touchstart',e=>{
        const dc=document.getElementById('tarjEditorCanvas')
        if(e.target===dc&&onStart(e.touches[0].clientX,e.touches[0].clientY))e.preventDefault()
      },{passive:false})
      document.addEventListener('touchmove',e=>{
        if(_ted.dragging&&isOpen()){onMove(e.touches[0].clientX,e.touches[0].clientY);e.preventDefault()}
      },{passive:false})
      document.addEventListener('touchend',onEnd)
    })()

  
    


    // ── Configuración motor remoción de fondo ────────────────────────────────
    window.abrirConfigMotorRembg = async function() {
      // Leer config actual
      let motorActual = 'birefnet', apiKey = '', credits = null
      try {
        const { data } = await supabase.from('media')
          .select('tipo,url').in('tipo',['config-rembg-motor','config-rembg-apikey','config-rembg-credits'])
        if (data) data.forEach(r => {
          if (r.tipo === 'config-rembg-motor')  motorActual = r.url || 'birefnet'
          if (r.tipo === 'config-rembg-apikey')  apiKey      = r.url || ''
          if (r.tipo === 'config-rembg-credits') credits     = r.url
        })
      } catch(e) {}

      // Crear modal
      const existing = document.getElementById('modalConfigMotorRembg')
      if (existing) existing.remove()

      const modal = document.createElement('div')
      modal.id = 'modalConfigMotorRembg'
      modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,8,15,.88);display:flex;align-items:center;justify-content:center;padding:1rem'
      var isBiref = motorActual === 'birefnet'
      var isRmbg  = motorActual === 'removebg'
      var creditsHtml = credits !== null
        ? '<p style="font-size:.72rem;color:' + (parseInt(credits)<=5?'#f59e0b':'#4ecca3') + ';margin:.2rem 0 0">Créditos restantes: <strong>' + credits + '</strong></p>'
        : ''
      var btnBirefStyle = 'flex:1;padding:.5rem;border-radius:8px;cursor:pointer;font-size:.78rem;font-weight:600;color:var(--text);border:2px solid ' + (isBiref ? 'var(--cyan)' : 'rgba(255,255,255,.1)') + ';background:' + (isBiref ? 'rgba(21,154,156,.15)' : 'transparent')
      var btnRmbgStyle  = 'flex:1;padding:.5rem;border-radius:8px;cursor:pointer;font-size:.78rem;font-weight:600;color:var(--text);border:2px solid ' + (isRmbg ? '#f59e0b' : 'rgba(255,255,255,.1)') + ';background:' + (isRmbg ? 'rgba(245,158,11,.15)' : 'transparent')
      var html = []
      html.push('<div style="background:var(--bg-card,#0a2535);border:1px solid rgba(21,154,156,.4);border-radius:16px;padding:1.5rem;max-width:420px;width:100%;display:flex;flex-direction:column;gap:1rem">')
      html.push('<div style="display:flex;justify-content:space-between;align-items:center">')
      html.push('<h3 style="font-size:.9rem;font-weight:700;color:var(--cyan);margin:0">Motor de remoción de fondo</h3>')
      html.push('<button id="rembg-close-btn" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1.1rem">&#10005;</button>')
      html.push('</div>')
      html.push('<div style="display:flex;flex-direction:column;gap:.5rem">')
      html.push('<label style="font-size:.78rem;color:var(--text);font-weight:600">Motor activo</label>')
      html.push('<div style="display:flex;gap:.5rem">')
      html.push('<button id="rembg-btn-birefnet" style="' + btnBirefStyle + '">BiRefNet lite<br><span style="font-size:.68rem;color:var(--muted);font-weight:400">Local, sin límites, ~170MB</span></button>')
      html.push('<button id="rembg-btn-removebg" style="' + btnRmbgStyle  + '">remove.bg API<br><span style="font-size:.68rem;color:var(--muted);font-weight:400">Nube, alta calidad, créditos</span></button>')
      html.push('</div></div>')
      html.push('<div style="display:flex;flex-direction:column;gap:.4rem">')
      html.push('<label style="font-size:.78rem;color:var(--text);font-weight:600">API Key de remove.bg</label>')
      html.push('<input id="rembg-apikey-input" type="password" placeholder="Ingresá tu API key de remove.bg" style="padding:.5rem .7rem;background:var(--bg2,#0d1117);border:1px solid rgba(255,255,255,.12);border-radius:8px;color:var(--text);font-size:.78rem;font-family:monospace"/>')
      html.push(creditsHtml)
      html.push('</div>')
      html.push('<div id="rembg-save-status" style="font-size:.72rem;color:var(--muted);min-height:1rem"></div>')
      html.push('<div style="display:flex;gap:.5rem;justify-content:flex-end">')
      html.push('<button id="rembg-cancel-btn" style="padding:.4rem 1rem;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:transparent;color:var(--muted);cursor:pointer;font-size:.78rem">Cancelar</button>')
      html.push('<button id="rembg-save-btn" style="padding:.4rem 1rem;border-radius:8px;border:none;background:var(--cyan,#159a9c);color:#fff;cursor:pointer;font-size:.78rem;font-weight:700">Guardar</button>')
      html.push('</div></div>')
      modal.innerHTML = html.join('')
      modal.querySelector('#rembg-apikey-input').value = apiKey
      modal.querySelector('#rembg-close-btn').onclick  = function(){ modal.remove() }
      modal.querySelector('#rembg-cancel-btn').onclick = function(){ modal.remove() }
      modal.querySelector('#rembg-save-btn').onclick   = function(){ window._rembgGuardarConfig() }
      modal.querySelector('#rembg-btn-birefnet').onclick = function(){ window._rembgSelectMotor('birefnet') }
      modal.querySelector('#rembg-btn-removebg').onclick = function(){ window._rembgSelectMotor('removebg') }
      var keyInput = modal.querySelector('#rembg-apikey-input')
      if (keyInput) keyInput.value = apiKey
      document.body.appendChild(modal)
      modal.addEventListener('click', e => { if(e.target===modal) modal.remove() })

      let _motorSeleccionado = motorActual
      window._rembgSelectMotor = function(motor) {
        _motorSeleccionado = motor
        const bb = document.getElementById('rembg-btn-birefnet')
        const rb = document.getElementById('rembg-btn-removebg')
        bb.style.borderColor = motor==='birefnet'?'var(--cyan)':'rgba(255,255,255,.1)'
        bb.style.background  = motor==='birefnet'?'rgba(21,154,156,.15)':'transparent'
        rb.style.borderColor = motor==='removebg'?'#f59e0b':'rgba(255,255,255,.1)'
        rb.style.background  = motor==='removebg'?'rgba(245,158,11,.15)':'transparent'
      }

      window._rembgGuardarConfig = async function() {
        const apiKeyVal = document.getElementById('rembg-apikey-input').value.trim()
        const statusEl = document.getElementById('rembg-save-status')
        statusEl.textContent = 'Guardando...'

        const upserts = [
          { tipo:'config-rembg-motor',  url: _motorSeleccionado, nombre:'rembg_motor' },
          { tipo:'config-rembg-apikey', url: apiKeyVal,          nombre:'rembg_apikey' }
        ]

        let err = null
        for (const row of upserts) {
          const { data: ex } = await supabase.from('media').select('id').eq('tipo',row.tipo).maybeSingle()
          if (ex) {
            const r = await supabase.from('media').update({ url: row.url }).eq('tipo', row.tipo)
            if (r.error) { err = r.error; break }
          } else {
            const r = await supabase.from('media').insert([row])
            if (r.error) { err = r.error; break }
          }
        }

        if (err) {
          statusEl.style.color = '#f87171'
          statusEl.textContent = 'Error: ' + err.message
        } else {
          statusEl.style.color = '#4ecca3'
          statusEl.textContent = '✓ Guardado correctamente'
          // Recargar config en fotoproducto
          if (typeof _cargarConfigMotor === 'function') await _cargarConfigMotor()
          setTimeout(() => modal.remove(), 1200)
        }
      }
    }
