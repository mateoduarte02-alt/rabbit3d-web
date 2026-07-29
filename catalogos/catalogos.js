// ═══════════════════════════════════════════════════
// catalogos.js — La Madriguera
// Página independiente. Reutiliza el mismo proyecto de Supabase.
// Tres vistas: panel admin (todos los catálogos), vista pública de
// un catálogo, y esa misma vista con controles de edición si sos
// la dueña o el admin.
// ═══════════════════════════════════════════════════

;(function () {
  const SUPABASE_URL = 'https://jcrpxrfjenjdgqtwkiyw.supabase.co'
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcnB4cmZqZW5qZGdxdHdraXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzAzMDYsImV4cCI6MjA5MDg0NjMwNn0.eygcb6oGMkXRUXoJUCs_9B5yr5doF3LrQn9C1-eYHpE'
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

  // ── Puentes globales para reutilizar tarjetas.js / presupuesto.js / fotoproducto.js
  // tal cual están en el sitio principal, sin reescribirlos ──────────────────
  window.supabase = supabase              // esos scripts esperan un `supabase` global, no uno de módulo
  window.esAdmin = false                  // solo lo usa fotoproducto.js para un aviso de créditos bajos
  window.dlCheck = function (tool, cb) {  // acá no hay límite de descargas — solo entra el dueño/admin
    if (typeof cb === 'function') cb()
    return true
  }
  window.trackDescarga = function () {}
  window.trackUso = function () {}

  // Igual que tendencias.js en el sitio principal — abre/cierra estos modales
  window.abrirEmprendedor = function (id) {
    const el = document.getElementById(id)
    if (!el) return
    el.style.display = 'flex'
    el.style.alignItems = 'center'
    el.style.justifyContent = 'center'
    el.style.position = 'fixed'
    el.style.inset = '0'
    el.style.zIndex = '9998'
    el.style.background = 'rgba(0,0,0,0.82)'
    el.style.backdropFilter = 'blur(6px)'
    el.style.padding = '1rem'
    document.body.style.overflow = 'hidden'
  }
  window.cerrarEmprendedor = function (id) {
    const el = document.getElementById(id)
    if (el) el.style.display = 'none'
    document.body.style.overflow = ''
  }
  ;['modal-tarjetas', 'modal-potenciador', 'modal-costos', 'modal-presupuesto', 'modal-fotoproducto'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.addEventListener('click', e => { if (e.target === el) window.cerrarEmprendedor(id) })
  })

  let usuarioActual  = null
  let esAdminCat      = false
  let catalogoActual  = null   // fila completa del catálogo abierto
  let esDueñoActual   = false
  let items           = []
  let categorias      = []
  let categoriaFiltroActual = null // null = "Todos"
  let searchTerm      = ''

  const params = new URLSearchParams(window.location.search)
  const slugURL = params.get('slug')

  // ── Compresión de imágenes antes de subir a Storage ──────────────
  async function comprimirImagen(file, maxW = 1000, maxH = 1000, quality = 0.78) {
    return new Promise(resolve => {
      if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') { resolve(file); return }
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        let w = img.width, h = img.height
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h)
          w = Math.round(w * ratio); h = Math.round(h * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        const hasAlpha = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif'
        if (hasAlpha) {
          ctx.drawImage(img, 0, 0, w, h)
          canvas.toBlob(blob => {
            if (!blob) { resolve(file); return }
            resolve(new File([blob], file.name, { type: 'image/png' }))
          }, 'image/png')
        } else {
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, w, h)
          ctx.drawImage(img, 0, 0, w, h)
          canvas.toBlob(blob => {
            if (!blob) { resolve(file); return }
            resolve(new File([blob], file.name, { type: 'image/jpeg' }))
          }, 'image/jpeg', quality)
        }
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })
  }

  // ── Nombre de archivo seguro para Storage ────────────────────────
  // Importante: NO usar el nombre original del archivo. Las fotos de
  // celular/WhatsApp suelen traer espacios, paréntesis, dos puntos o
  // acentos, y Supabase Storage rechaza esas claves con error 400.
  function nombreSeguro(prefijo, tipoMime) {
    const ext = tipoMime === 'image/png' ? 'png' : tipoMime === 'image/webp' ? 'webp' : 'jpg'
    const rand = Math.random().toString(36).slice(2, 8)
    return `${prefijo}-${Date.now()}-${rand}.${ext}`
  }

  function slugify(str) {
    return (str || '').toString().toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  }

  function money(n) {
    if (n === null || n === undefined || n === '') return null
    return '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // ── Valores originales de La Madriguera (para "restablecer") ──────
  const TEMA_MADRIGUERA = { bg: '#002333', card: '#001825', accent: '#159A9C', text: '#DEEFE7', muted: '#8fa8b2', border: '#0c3545' }

  // ── 15 paletas de ejemplo para que el dueño pruebe combinaciones ───
  const PALETAS = [
    { id: 'terracota', nombre: 'Terracota cálida',   bg: '#2b1811', card: '#3a231a', accent: '#d97a4a', text: '#fbeee2', muted: '#c9a68f', border: '#54382a' },
    { id: 'lavanda',   nombre: 'Lavanda nocturna',   bg: '#1c1a2e', card: '#272444', accent: '#9d7fe8', text: '#f2f0fb', muted: '#b3aed6', border: '#3a3660' },
    { id: 'menta',     nombre: 'Menta fresca',       bg: '#0f2420', card: '#153631', accent: '#3ecf8e', text: '#eafaf5', muted: '#8fc9bb', border: '#1f4c45' },
    { id: 'rosa',      nombre: 'Rosa atardecer',     bg: '#241019', card: '#341623', accent: '#e8608f', text: '#fdeef4', muted: '#d9a9c0', border: '#4a2035' },
    { id: 'claro',     nombre: 'Claro minimalista',  bg: '#f7f5f2', card: '#ffffff', accent: '#b5651d', text: '#20201d', muted: '#7a7568', border: '#e2ddd3' },
    { id: 'byn',       nombre: 'Blanco y negro',     bg: '#f5f5f5', card: '#ffffff', accent: '#1a1a1a', text: '#111111', muted: '#6e6e6e', border: '#dcdcdc' },
    { id: 'rosaclaro', nombre: 'Rosa clarito',       bg: '#fdf3f6', card: '#ffffff', accent: '#c9718b', text: '#3a2530', muted: '#a98a95', border: '#f0dde3' },
    { id: 'beige',     nombre: 'Marrón clarito',     bg: '#f4ede3', card: '#fffdf9', accent: '#8a5a34', text: '#3a2c1e', muted: '#93816f', border: '#e3d5c2' },
    { id: 'dorado',    nombre: 'Dorado elegante',    bg: '#14110d', card: '#1f1a14', accent: '#c9a24b', text: '#f5ecd8', muted: '#b3a181', border: '#3a3021' },
    { id: 'bosque',    nombre: 'Bosque y tierra',    bg: '#16241a', card: '#1e3324', accent: '#6fae5a', text: '#e9f3e7', muted: '#9dbd93', border: '#2c4a34' },
    { id: 'panaderia', nombre: 'Panadería cálida',   bg: '#2e1b12', card: '#3d2419', accent: '#d1495b', text: '#fbe9e4', muted: '#d1a898', border: '#55352a' },
    { id: 'oceano',    nombre: 'Océano sereno',      bg: '#0d2430', card: '#123243', accent: '#3fa9c9', text: '#e6f4f8', muted: '#8fb8c4', border: '#1e4657' },
    { id: 'vintage',   nombre: 'Vintage mostaza',    bg: '#24200f', card: '#332c17', accent: '#c9973a', text: '#f7f0dc', muted: '#b8ab84', border: '#4a3f1f' },
    { id: 'lilaclaro', nombre: 'Lila suave',         bg: '#f6f2fb', card: '#ffffff', accent: '#8b6bc7', text: '#2c2438', muted: '#8a7fa3', border: '#e4dbf5' },
    { id: 'grafito',   nombre: 'Grafito moderno',    bg: '#1b2028', card: '#242b36', accent: '#4f8ff7', text: '#e8ecf3', muted: '#8b95a8', border: '#313a48' },
  ]

  // ── Aplicar un tema completo (6 colores) a cualquier elemento ──────
  function aplicarTema(tema, target) {
    const el = target || document.body
    const t = tema || {}
    const map = { bg: '--bg', card: '--card-bg', text: '--text', muted: '--muted', border: '--border' }
    Object.entries(map).forEach(([k, cssVar]) => {
      if (t[k]) el.style.setProperty(cssVar, t[k]); else el.style.removeProperty(cssVar)
    })
    if (t.card) el.style.setProperty('--bg3', t.card); else el.style.removeProperty('--bg3')
    if (t.accent) {
      el.style.setProperty('--cyan', t.accent)
      el.style.setProperty('--cyan-mid', t.accent + '55')
      el.style.setProperty('--cyan-soft', t.accent + '35')
      el.style.setProperty('--cyan-dim', t.accent + '15')
    } else {
      ;['--cyan', '--cyan-mid', '--cyan-soft', '--cyan-dim'].forEach(v => el.style.removeProperty(v))
    }
  }

  // ── Sesión / rol ──────────────────────────────────────────────────
  async function chequearSesion() {
    const { data } = await supabase.auth.getSession()
    usuarioActual = data?.session?.user || null
    esAdminCat = false
    if (usuarioActual) {
      const { data: perfil } = await supabase.from('profiles').select('rol').eq('id', usuarioActual.id).limit(1)
      esAdminCat = perfil?.[0]?.rol === 'admin'
    }
    window.esAdmin = esAdminCat
  }

  async function intentarLogin(email, pass, errEl, btn, textoOriginal) {
    errEl.textContent = ''
    if (!email || !pass) { errEl.textContent = 'Completá email y contraseña.'; return false }
    btn.disabled = true; btn.textContent = 'Ingresando...'
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    btn.disabled = false; btn.textContent = textoOriginal
    if (error) { errEl.textContent = 'Email o contraseña incorrectos.'; return false }
    return true
  }

  document.getElementById('catBtnLogin').addEventListener('click', async () => {
    const email = document.getElementById('catLoginEmail').value.trim()
    const pass  = document.getElementById('catLoginPass').value
    const ok = await intentarLogin(email, pass, document.getElementById('catLoginError'), document.getElementById('catBtnLogin'), 'Ingresar')
    if (ok) await init()
  })

  // Login desde el desplegable de la topbar (dentro de un catálogo real)
  document.getElementById('catBtnLoginIcon').addEventListener('click', e => {
    e.stopPropagation()
    const dd = document.getElementById('catLoginDropdown')
    const abierto = dd.style.display === 'block'
    if (abierto) { dd.style.display = 'none'; return }
    document.getElementById('catLoginDropdownForm').style.display = usuarioActual ? 'none' : 'block'
    document.getElementById('catLoginDropdownSesion').style.display = usuarioActual ? 'block' : 'none'
    if (usuarioActual) document.getElementById('catSesionEmailLabel').textContent = usuarioActual.email
    dd.style.display = 'block'
  })
  document.addEventListener('click', () => { document.getElementById('catLoginDropdown').style.display = 'none' })
  document.getElementById('catLoginDropdown').addEventListener('click', e => e.stopPropagation())

  document.getElementById('catBtnTopLogin').addEventListener('click', async () => {
    const email = document.getElementById('catTopLoginEmail').value.trim()
    const pass  = document.getElementById('catTopLoginPass').value
    const ok = await intentarLogin(email, pass, document.getElementById('catTopLoginError'), document.getElementById('catBtnTopLogin'), 'Ingresar')
    if (ok) {
      document.getElementById('catLoginDropdown').style.display = 'none'
      await init()
    }
  })

  document.getElementById('catBtnLogout').addEventListener('click', async () => {
    await supabase.auth.signOut()
    document.getElementById('catLoginDropdown').style.display = 'none'
    await init()
  })

  // ── Contacto (Instagram / WhatsApp / Otro) ─────────────────────────
  document.getElementById('catBtnContacto').addEventListener('click', e => {
    e.stopPropagation()
    const dd = document.getElementById('catContactoDropdown')
    dd.style.display = dd.style.display === 'block' ? 'none' : 'block'
  })
  document.addEventListener('click', () => { document.getElementById('catContactoDropdown').style.display = 'none' })
  document.getElementById('catContactoDropdown').addEventListener('click', e => e.stopPropagation())

  function instagramUrl(valor) {
    const v = (valor || '').trim()
    if (!v) return ''
    if (/^https?:\/\//i.test(v)) return v
    return 'https://instagram.com/' + v.replace(/^@/, '')
  }

  function renderContacto() {
    const btn = document.getElementById('catBtnContacto')
    const lista = document.getElementById('catContactoLista')
    const filas = []
    if (catalogoActual.whatsapp) {
      filas.push(`<a class="cat-contacto-fila" href="https://wa.me/${catalogoActual.whatsapp.replace(/[^0-9]/g, '')}" target="_blank">💬 WhatsApp</a>`)
    }
    if (catalogoActual.instagram) {
      filas.push(`<a class="cat-contacto-fila" href="${instagramUrl(catalogoActual.instagram)}" target="_blank">📷 Instagram</a>`)
    }
    if (catalogoActual.otro_url) {
      filas.push(`<a class="cat-contacto-fila" href="${catalogoActual.otro_url}" target="_blank">🔗 ${catalogoActual.otro_label || 'Más info'}</a>`)
    }
    if (filas.length === 0) {
      btn.style.display = 'none'
      return
    }
    btn.style.display = 'flex'
    lista.innerHTML = filas.join('')
  }

  // ── Router principal ──────────────────────────────────────────────
  async function init() {
    await chequearSesion()
    ocultarTodo()

    if (slugURL) {
      await abrirCatalogo(slugURL)
      return
    }

    // Vitrina pública de catálogos — la ve cualquiera, sin necesidad de sesión.
    document.getElementById('catVistaAdmin').style.display = 'block'
    await cargarPanelAdmin()

    // Si el admin llega con ?stats=1 (link desde el panel de La Madriguera),
    // abrimos las estadísticas directo, sin necesidad de un botón acá.
    if (esAdminCat && params.get('stats') === '1') {
      abrirEstadisticasCatalogos()
    }
  }

  function ocultarTodo() {
    document.getElementById('catLogin').style.display = 'none'
    document.getElementById('catVistaAdmin').style.display = 'none'
    document.getElementById('catVistaCatalogo').style.display = 'none'
    document.getElementById('catMensajeGeneral').style.display = 'none'
    document.getElementById('catTopHeader').style.display = 'flex' // se oculta solo dentro de un catálogo real
    document.getElementById('catOwnerBar').style.display = 'none'
    document.getElementById('catWhatsappBtn').style.display = 'none'
  }

  function mostrarMensaje(msg) {
    const el = document.getElementById('catMensajeGeneral')
    el.textContent = msg
    el.style.display = 'block'
  }

  // ══════════════════════════════════════════
  //  PANEL ADMIN — listado de catálogos de clientes
  // ══════════════════════════════════════════
  async function cargarPanelAdmin() {
    const grid  = document.getElementById('catAdminGrid')
    const empty = document.getElementById('catAdminEmpty')
    grid.innerHTML = '<p class="cargando">Cargando catálogos...</p>'

    const { data: catalogosData, error } = await supabase.from('catalogos').select('*').order('nombre')
    if (error) { grid.innerHTML = '<p class="cargando" style="color:#d94060">Error al cargar: ' + error.message + '</p>'; return }

    if (!catalogosData || catalogosData.length === 0) {
      grid.innerHTML = ''
      empty.style.display = 'block'
      return
    }
    empty.style.display = 'none'

    const counts = await Promise.all(catalogosData.map(c =>
      supabase.from('catalogo_items').select('*', { count: 'exact', head: true }).eq('catalogo_id', c.id)
    ))

    grid.innerHTML = catalogosData.map((c, i) => `
      <div class="cat-admin-card" onclick="window.location.href='catalogos.html?slug=${encodeURIComponent(c.slug)}'">
        ${esAdminCat ? `<button class="cat-admin-card__eliminar" title="Eliminar catálogo" onclick="event.stopPropagation();window._catEliminarCatalogo(${c.id}, '${(c.nombre || '').replace(/'/g, "\\'")}')">🗑</button>` : ''}
        ${c.logo_url
          ? `<img class="cat-admin-card__logo" src="${c.logo_url}" alt="${c.nombre}"/>`
          : `<div class="cat-admin-card__logo-placeholder">${(c.nombre || '?').charAt(0).toUpperCase()}</div>`}
        <p class="cat-admin-card__nombre">${c.nombre}</p>
        ${c.descripcion ? `<p class="cat-admin-card__owner">${c.descripcion}</p>` : ''}
        <div class="cat-admin-card__meta">
          <span>${counts[i]?.count ?? 0} producto${(counts[i]?.count ?? 0) === 1 ? '' : 's'}</span>
          ${esAdminCat ? `
            <span class="cat-admin-card__estado ${c.publicado ? 'cat-admin-card__estado--pub' : 'cat-admin-card__estado--priv'}">
              ${c.publicado ? 'Publicado' : 'Privado'}
            </span>` : ''}
        </div>
      </div>
    `).join('')
  }

  window._catEliminarCatalogo = async function (id, nombre) {
    if (!confirm(`¿Eliminar el catálogo "${nombre}" junto con todos sus productos y categorías? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('catalogos').delete().eq('id', id)
    if (error) { alert('Error al eliminar: ' + error.message); return }
    await cargarPanelAdmin()
  }

  document.getElementById('catBtnCrearElMio').addEventListener('click', async e => {
    e.preventDefault()
    await chequearSesion()
    abrirModalCrearPropio()
  })

  document.getElementById('catBtnCerrarEstadisticas').addEventListener('click', () =>
    document.getElementById('catModalEstadisticas').classList.remove('activo'))

  function formatoFecha(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  async function abrirEstadisticasCatalogos() {
    const modal = document.getElementById('catModalEstadisticas')
    const tbody = document.getElementById('catEstadisticasBody')
    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--muted)">Cargando...</td></tr>'
    modal.classList.add('activo')

    const { data: catalogosData, error } = await supabase.from('catalogos').select('*').order('created_at', { ascending: false })
    if (error) { tbody.innerHTML = `<tr><td colspan="5" style="color:#d94060">Error: ${error.message}</td></tr>`; return }
    if (!catalogosData || catalogosData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:var(--muted)">Todavía no hay catálogos creados.</td></tr>'
      return
    }

    const userIds = catalogosData.map(c => c.user_id)
    const { data: perfiles } = await supabase.from('profiles').select('id,email').in('id', userIds)
    const emailPorId = Object.fromEntries((perfiles || []).map(p => [p.id, p.email]))

    // Un pedido por catálogo — trae las fechas de todas sus publicaciones para
    // sacar la cantidad y la fecha de la última, ordenadas más nueva primero.
    const itemsPorCatalogo = await Promise.all(catalogosData.map(c =>
      supabase.from('catalogo_items').select('created_at').eq('catalogo_id', c.id).order('created_at', { ascending: false })
    ))

    tbody.innerHTML = catalogosData.map((c, i) => {
      const publicaciones = itemsPorCatalogo[i]?.data || []
      return `
        <tr>
          <td>${c.nombre}</td>
          <td>${emailPorId[c.user_id] || 'sin usuario asociado'}</td>
          <td>${formatoFecha(c.created_at)}</td>
          <td>${publicaciones.length}</td>
          <td class="${publicaciones.length ? '' : 'cat-stats-muted'}">${publicaciones.length ? formatoFecha(publicaciones[0].created_at) : 'sin publicaciones'}</td>
        </tr>`
    }).join('')
  }

  // ── Contenido de ejemplo al crear un catálogo — para que se vea la
  // estructura de la página desde el primer momento, editable después ──
  async function sembrarContenidoInicial(catalogoId) {
    try {
      const { data: cats } = await supabase.from('catalogo_categorias').insert([
        { catalogo_id: catalogoId, nombre: 'Categoría 1', orden: 0 },
        { catalogo_id: catalogoId, nombre: 'Categoría 2', orden: 1 }
      ]).select()
      const cat1 = cats && cats[0] ? cats[0].id : null
      const cat2 = cats && cats[1] ? cats[1].id : null
      await supabase.from('catalogo_items').insert([
        { catalogo_id: catalogoId, titulo: 'Publicación de ejemplo 1', descripcion: 'Editá esta publicación para cargar tu primer producto (foto, precio y descripción).', categoria_ids: cat1 ? [cat1] : [] },
        { catalogo_id: catalogoId, titulo: 'Publicación de ejemplo 2', descripcion: 'Editá esta publicación para cargar tu segundo producto.', categoria_ids: cat2 ? [cat2] : [] },
        { catalogo_id: catalogoId, titulo: 'Publicación de ejemplo 3', descripcion: 'Editá esta publicación para cargar tu tercer producto.', categoria_ids: [] }
      ])
    } catch (e) {
      console.error('No se pudo sembrar el contenido de ejemplo:', e)
    }
  }

  // ══════════════════════════════════════════
  //  MODAL: crear / editar catálogo (datos + tema)
  // ══════════════════════════════════════════
  let logoUrlTemp = ''
  let temaTocado  = false // false = "sigue el estilo de La Madriguera", true = personalizado

  function leerTemaDeInputs() {
    return {
      bg:     document.getElementById('temaBg').value,
      card:   document.getElementById('temaCard').value,
      accent: document.getElementById('temaAccent').value,
      text:   document.getElementById('temaText').value,
      muted:  document.getElementById('temaMuted').value,
      border: document.getElementById('temaBorder').value,
    }
  }

  function setInputsDesdeTema(t) {
    document.getElementById('temaBg').value     = t.bg
    document.getElementById('temaCard').value   = t.card
    document.getElementById('temaAccent').value = t.accent
    document.getElementById('temaText').value   = t.text
    document.getElementById('temaMuted').value  = t.muted
    document.getElementById('temaBorder').value = t.border
    marcarPaletaActiva(t)
  }

  function actualizarPreview() {
    aplicarTema(leerTemaDeInputs(), document.getElementById('catPreview'))
  }

  function marcarPaletaActiva(t) {
    document.querySelectorAll('.cat-paleta-btn').forEach(btn => {
      const p = PALETAS.find(x => x.id === btn.dataset.id)
      const coincide = p && p.bg === t.bg && p.card === t.card && p.accent === t.accent
      btn.classList.toggle('cat-paleta-btn--activa', !!coincide)
    })
  }

  function renderPaletas() {
    document.getElementById('catPaletas').innerHTML = PALETAS.map(p => `
      <button type="button" class="cat-paleta-btn" data-id="${p.id}">
        <span class="cat-paleta-swatch">
          <span style="background:${p.bg}"></span>
          <span style="background:${p.card}"></span>
          <span style="background:${p.accent}"></span>
        </span>
        <span class="cat-paleta-nombre">${p.nombre}</span>
      </button>
    `).join('')
    document.querySelectorAll('.cat-paleta-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = PALETAS.find(x => x.id === btn.dataset.id)
        temaTocado = true
        setInputsDesdeTema(p)
        actualizarPreview()
      })
    })
  }
  renderPaletas()

  ;['temaBg', 'temaCard', 'temaAccent', 'temaText', 'temaMuted', 'temaBorder'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      temaTocado = true
      marcarPaletaActiva(leerTemaDeInputs())
      actualizarPreview()
    })
  })

  document.getElementById('catBtnResetTema').addEventListener('click', () => {
    temaTocado = false
    setInputsDesdeTema(TEMA_MADRIGUERA)
    actualizarPreview()
  })

  let creandoParaSiMismo = false

  function abrirModalCatalogo(catalogo, paraSiMismo) {
    creandoParaSiMismo = !!paraSiMismo
    document.getElementById('catModalCatalogoTitulo').textContent = paraSiMismo ? 'Creá tu catálogo' : (catalogo ? 'Editar catálogo' : 'Nuevo catálogo')
    document.getElementById('catCatalogoId').value        = catalogo ? catalogo.id : ''
    document.getElementById('catCatalogoNombre').value     = catalogo ? catalogo.nombre : ''
    document.getElementById('catCatalogoSlug').value       = catalogo ? catalogo.slug : ''
    document.getElementById('catCatalogoDesc').value       = catalogo ? (catalogo.descripcion || '') : ''
    document.getElementById('catCatalogoWhatsapp').value   = catalogo ? (catalogo.whatsapp || '') : ''
    document.getElementById('catCatalogoInstagram').value  = catalogo ? (catalogo.instagram || '') : ''
    document.getElementById('catCatalogoOtroLabel').value  = catalogo ? (catalogo.otro_label || '') : ''
    document.getElementById('catCatalogoOtroUrl').value    = catalogo ? (catalogo.otro_url || '') : ''

    document.getElementById('catCatalogoEmailGroup').style.display = (catalogo || paraSiMismo) ? 'none' : 'block'
    document.getElementById('catCatalogoEmail').value = ''
    document.getElementById('catCatalogoSlugGroup').style.display = (catalogo && !esAdminCat) ? 'none' : 'block'

    const temaInicial = (catalogo && catalogo.tema)
      ? catalogo.tema
      : (catalogo && catalogo.color) ? { ...TEMA_MADRIGUERA, accent: catalogo.color } : { ...TEMA_MADRIGUERA }
    temaTocado = !!(catalogo && (catalogo.tema || catalogo.color))
    setInputsDesdeTema(temaInicial)
    actualizarPreview()

    logoUrlTemp = catalogo ? (catalogo.logo_url || '') : ''
    const logoPreview = document.getElementById('catLogoPreview')
    logoPreview.innerHTML = logoUrlTemp
      ? `<img class="cat-upload__img" src="${logoUrlTemp}">`
      : `<span class="cat-upload__btn">↑</span><span class="cat-upload__texto">Subir logo</span><span class="cat-upload__sub">JPG, PNG o WEBP</span>`
    document.getElementById('catCatalogoError').textContent = !catalogo
      ? 'Subí una foto de perfil y elegí una paleta de colores para poder crear el catálogo.'
      : ''
    document.getElementById('catModalCatalogo').classList.add('activo')
  }
  document.getElementById('catBtnCerrarModalCatalogo').addEventListener('click', () =>
    document.getElementById('catModalCatalogo').classList.remove('activo'))

  document.getElementById('catLogoUploadWrap').addEventListener('click', () => document.getElementById('catLogoFile').click())
  document.getElementById('catLogoFile').addEventListener('change', async e => {
    const file = e.target.files[0]
    if (!file) return
    const preview = document.getElementById('catLogoPreview')
    preview.innerHTML = `<span class="cat-upload__texto">Subiendo logo...</span>`
    const comprimido = await comprimirImagen(file, 400, 400, 0.85)
    const fileName = nombreSeguro('logo', comprimido.type)
    const { error } = await supabase.storage.from('catalogos').upload(fileName, comprimido, { upsert: true })
    if (error) {
      preview.innerHTML = `<span class="cat-upload__btn" style="background:#d94060">↑</span><span class="cat-upload__texto" style="color:#d94060">Error al subir: ${error.message}</span>`
      return
    }
    const { data: urlData } = supabase.storage.from('catalogos').getPublicUrl(fileName)
    logoUrlTemp = urlData.publicUrl
    preview.innerHTML = `<img class="cat-upload__img" src="${logoUrlTemp}">`
  })

  document.getElementById('catCatalogoNombre').addEventListener('input', e => {
    const slugEl = document.getElementById('catCatalogoSlug')
    if (!slugEl.dataset.tocado) slugEl.value = slugify(e.target.value)
  })
  document.getElementById('catCatalogoSlug').addEventListener('input', e => { e.target.dataset.tocado = '1' })

  document.getElementById('catBtnGuardarCatalogo').addEventListener('click', async () => {
    const errEl = document.getElementById('catCatalogoError')
    errEl.textContent = ''
    const id     = document.getElementById('catCatalogoId').value
    const email  = document.getElementById('catCatalogoEmail').value.trim()
    const nombre = document.getElementById('catCatalogoNombre').value.trim()
    const slug   = slugify(document.getElementById('catCatalogoSlug').value)
    const descripcion = document.getElementById('catCatalogoDesc').value.trim()
    const whatsapp     = document.getElementById('catCatalogoWhatsapp').value.trim()
    const instagram    = document.getElementById('catCatalogoInstagram').value.trim()
    const otro_label   = document.getElementById('catCatalogoOtroLabel').value.trim()
    const otro_url     = document.getElementById('catCatalogoOtroUrl').value.trim()
    const tema         = temaTocado ? leerTemaDeInputs() : null

    if (!nombre || !slug) { errEl.textContent = 'Nombre y slug son obligatorios.'; return }
    if (!id) {
      if (!logoUrlTemp) { errEl.textContent = 'Subí una foto de perfil del emprendimiento para continuar.'; return }
      if (!temaTocado) { errEl.textContent = 'Elegí una paleta de colores (o personalizá una) para continuar.'; return }
    }

    const btn = document.getElementById('catBtnGuardarCatalogo')
    btn.disabled = true; btn.textContent = 'Guardando...'

    try {
      if (id) {
        const datos = { nombre, descripcion, whatsapp, instagram, otro_label, otro_url, logo_url: logoUrlTemp, tema }
        if (esAdminCat) datos.slug = slug
        const { error } = await supabase.from('catalogos').update(datos).eq('id', id)
        if (error) throw error
      } else {
        let ownerUserId
        if (creandoParaSiMismo) {
          ownerUserId = usuarioActual.id
        } else {
          if (!email) { errEl.textContent = 'El email de la dueña/dueño es obligatorio para crear el catálogo.'; return }
          const { data: perfil, error: errPerfil } = await supabase.from('profiles').select('id').eq('email', email).limit(1)
          if (errPerfil) throw errPerfil
          if (!perfil || perfil.length === 0) {
            errEl.textContent = 'No encontré ninguna cuenta con ese email. Primero tiene que registrarse en el sitio principal.'
            return
          }
          ownerUserId = perfil[0].id
        }
        const { data: nuevo, error } = await supabase.from('catalogos').insert([{
          user_id: ownerUserId, nombre, slug, descripcion, whatsapp, instagram, otro_label, otro_url, logo_url: logoUrlTemp, tema, publicado: false
        }]).select().single()
        if (error) throw error
        await sembrarContenidoInicial(nuevo.id)
        if (creandoParaSiMismo) {
          window.location.href = 'catalogos.html?slug=' + encodeURIComponent(slug)
          return
        }
      }
      document.getElementById('catModalCatalogo').classList.remove('activo')
      if (catalogoActual && id) {
        await abrirCatalogo(catalogoActual.slug)
      } else {
        await cargarPanelAdmin()
      }
    } catch (e) {
      errEl.textContent = 'Error al guardar: ' + (e.message || String(e))
    } finally {
      btn.disabled = false; btn.textContent = 'Guardar'
    }
  })

  // ══════════════════════════════════════════
  //  VISTA DE UN CATÁLOGO (pública o de edición)
  // ══════════════════════════════════════════
  async function abrirCatalogo(slug) {
    const { data, error } = await supabase.from('catalogos').select('*').eq('slug', slug).limit(1)

    if (error || !data || data.length === 0) {
      if (!usuarioActual) {
        document.getElementById('catLogin').style.display = 'block'
      } else {
        mostrarMensaje('No se encontró este catálogo o no tenés acceso a él.')
      }
      return
    }

    catalogoActual = data[0]
    esDueñoActual = !!usuarioActual && usuarioActual.id === catalogoActual.user_id

    document.getElementById('catVistaCatalogo').style.display = 'block'
    document.getElementById('catTopHeader').style.display = 'none'
    const tema = catalogoActual.tema || (catalogoActual.color ? { ...TEMA_MADRIGUERA, accent: catalogoActual.color } : null)
    aplicarTema(tema, document.body)

    document.getElementById('catDetNombre').textContent = catalogoActual.nombre
    document.getElementById('catDetDesc').textContent = catalogoActual.descripcion || ''
    document.getElementById('catTopNombre').textContent = catalogoActual.nombre

    const logoTop = document.getElementById('catTopLogo')
    if (catalogoActual.logo_url) { logoTop.src = catalogoActual.logo_url; logoTop.style.display = 'block' } else { logoTop.style.display = 'none' }

    const wspBtn = document.getElementById('catWhatsappBtn')
    if (catalogoActual.whatsapp) {
      wspBtn.href = 'https://wa.me/' + catalogoActual.whatsapp.replace(/[^0-9]/g, '')
      wspBtn.style.display = 'flex'
    } else {
      wspBtn.style.display = 'none'
    }

    renderContacto()

    // El admin de La Madriguera ya NO puede editar catálogos ajenos —
    // solo puede verlos (para el panel y las estadísticas). Los controles
    // de edición solo aparecen para la dueña/dueño real del catálogo.
    const puedeEditar = esDueñoActual
    document.getElementById('catOwnerBar').style.display = puedeEditar ? 'flex' : 'none'
    document.getElementById('catHerramientasSection').style.display = puedeEditar ? 'block' : 'none'
    if (puedeEditar) {
      document.getElementById('catEstadoLabel').textContent = catalogoActual.publicado ? '🟢 Publicado' : '⚪ Privado'
      const btnToggle = document.getElementById('catBtnTogglePublicado')
      btnToggle.textContent = catalogoActual.publicado ? 'Poner en privado' : 'Publicar'
    }

    // Reset de filtros al entrar/recargar el catálogo
    categoriaFiltroActual = null
    searchTerm = ''
    document.getElementById('catBuscador').value = ''

    await cargarCategorias()
    await cargarItems()
  }

  document.getElementById('catBtnTogglePublicado').addEventListener('click', async () => {
    const nuevoEstado = !catalogoActual.publicado
    const { error } = await supabase.from('catalogos').update({ publicado: nuevoEstado }).eq('id', catalogoActual.id)
    if (error) { alert('Error: ' + error.message); return }
    catalogoActual.publicado = nuevoEstado
    document.getElementById('catEstadoLabel').textContent = nuevoEstado ? '🟢 Publicado' : '⚪ Privado'
    document.getElementById('catBtnTogglePublicado').textContent = nuevoEstado ? 'Poner en privado' : 'Publicar'
  })

  document.getElementById('catBtnEditarCatalogo').addEventListener('click', () => {
    abrirModalCatalogo(catalogoActual)
  })

  // ══════════════════════════════════════════
  //  BUSCADOR (topbar)
  // ══════════════════════════════════════════
  document.getElementById('catBuscador').addEventListener('input', e => {
    searchTerm = e.target.value
    aplicarFiltros()
  })

  // ══════════════════════════════════════════
  //  CATEGORÍAS — sidebar pública + gestión (dueño/admin)
  // ══════════════════════════════════════════
  async function cargarCategorias() {
    const { data, error } = await supabase.from('catalogo_categorias')
      .select('*').eq('catalogo_id', catalogoActual.id).order('orden', { ascending: true }).order('id', { ascending: true })
    categorias = error ? [] : (data || [])
    renderSidebarCategorias()
  }

  function renderSidebarCategorias() {
    const cont = document.getElementById('catCategoriasLista')
    const botones = [`<button class="cat-cat-btn ${categoriaFiltroActual === null ? 'cat-cat-btn--activo' : ''}" data-cat="todos">Todos</button>`]
      .concat(categorias.map(c => `<button class="cat-cat-btn ${categoriaFiltroActual === c.id ? 'cat-cat-btn--activo' : ''}" data-cat="${c.id}">${c.nombre}</button>`))
    cont.innerHTML = botones.join('')
    cont.querySelectorAll('.cat-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        categoriaFiltroActual = btn.dataset.cat === 'todos' ? null : Number(btn.dataset.cat)
        renderSidebarCategorias()
        aplicarFiltros()
      })
    })
  }

  document.getElementById('catBtnGestionarCategorias').addEventListener('click', () => abrirModalCategorias())

  function abrirModalCategorias() {
    document.getElementById('catCategoriaError').textContent = ''
    document.getElementById('catNuevaCategoriaInput').value = ''
    renderCategoriasAdminLista()
    document.getElementById('catModalCategorias').classList.add('activo')
  }
  document.getElementById('catBtnCerrarModalCategorias').addEventListener('click', () =>
    document.getElementById('catModalCategorias').classList.remove('activo'))

  function renderCategoriasAdminLista() {
    const cont = document.getElementById('catCategoriasAdminLista')
    if (categorias.length === 0) {
      cont.innerHTML = '<p style="font-size:.78rem;color:var(--muted);margin:0">Todavía no creaste ninguna categoría.</p>'
      return
    }
    const destacadas = catalogoActual.categorias_destacadas || []
    cont.innerHTML = categorias.map(c => {
      const pos = destacadas.indexOf(c.id)
      const label = pos >= 0 ? '★' + (pos + 1) : '☆'
      return `
      <div class="cat-cat-row">
        <input type="text" class="form-input" value="${c.nombre}" data-id="${c.id}"/>
        <button class="btn btn--sm" data-destacar="${c.id}" title="Destacar como sección">${label}</button>
        <button class="btn btn--sm" data-eliminar="${c.id}">🗑</button>
      </div>
    `}).join('')
    cont.querySelectorAll('input[data-id]').forEach(inp => {
      inp.addEventListener('change', () => renombrarCategoria(Number(inp.dataset.id), inp.value.trim()))
    })
    cont.querySelectorAll('button[data-eliminar]').forEach(btn => {
      btn.addEventListener('click', () => eliminarCategoria(Number(btn.dataset.eliminar)))
    })
    cont.querySelectorAll('button[data-destacar]').forEach(btn => {
      btn.addEventListener('click', () => toggleCategoriaDestacada(Number(btn.dataset.destacar)))
    })
  }

  async function toggleCategoriaDestacada(id) {
    const errEl = document.getElementById('catCategoriaError')
    errEl.textContent = ''
    let destacadas = [...(catalogoActual.categorias_destacadas || [])]
    if (destacadas.includes(id)) {
      destacadas = destacadas.filter(x => x !== id)
    } else {
      if (destacadas.length >= 3) { errEl.textContent = 'Ya tenés 3 categorías destacadas — sacá una para agregar otra.'; return }
      destacadas.push(id)
    }
    const { error } = await supabase.from('catalogos').update({ categorias_destacadas: destacadas }).eq('id', catalogoActual.id)
    if (error) { errEl.textContent = 'Error: ' + error.message; return }
    catalogoActual.categorias_destacadas = destacadas
    renderCategoriasAdminLista()
    aplicarFiltros()
  }

  async function renombrarCategoria(id, nuevoNombre) {
    if (!nuevoNombre) return
    const { error } = await supabase.from('catalogo_categorias').update({ nombre: nuevoNombre }).eq('id', id)
    if (error) { document.getElementById('catCategoriaError').textContent = 'Error: ' + error.message; return }
    await cargarCategorias()
  }

  async function eliminarCategoria(id) {
    if (!confirm('¿Eliminar esta categoría? Los productos que la tenían asignada dejan de mostrarla, pero no se borran.')) return
    const { error } = await supabase.from('catalogo_categorias').delete().eq('id', id)
    if (error) { document.getElementById('catCategoriaError').textContent = 'Error: ' + error.message; return }
    if ((catalogoActual.categorias_destacadas || []).includes(id)) {
      const destacadas = catalogoActual.categorias_destacadas.filter(x => x !== id)
      await supabase.from('catalogos').update({ categorias_destacadas: destacadas }).eq('id', catalogoActual.id)
      catalogoActual.categorias_destacadas = destacadas
    }
    await cargarCategorias()
    renderCategoriasAdminLista()
    aplicarFiltros()
  }

  document.getElementById('catBtnAgregarCategoria').addEventListener('click', async () => {
    const input = document.getElementById('catNuevaCategoriaInput')
    const nombre = input.value.trim()
    const errEl = document.getElementById('catCategoriaError')
    if (!nombre) { errEl.textContent = 'Escribí un nombre para la categoría.'; return }
    errEl.textContent = ''
    const { error } = await supabase.from('catalogo_categorias').insert([{
      catalogo_id: catalogoActual.id, nombre, orden: categorias.length
    }])
    if (error) { errEl.textContent = 'Error: ' + error.message; return }
    input.value = ''
    await cargarCategorias()
    renderCategoriasAdminLista()
  })

  // ══════════════════════════════════════════
  //  PRODUCTOS — carga, filtros y grilla
  // ══════════════════════════════════════════
  async function cargarItems() {
    const { data, error } = await supabase.from('catalogo_items')
      .select('*').eq('catalogo_id', catalogoActual.id).order('orden', { ascending: true }).order('id', { ascending: true })

    if (error) {
      const empty = document.getElementById('catItemsEmpty')
      document.getElementById('catItemsGrid').innerHTML = ''
      empty.textContent = 'Error al cargar: ' + error.message
      empty.style.display = 'block'
      return
    }
    items = data || []
    aplicarFiltros()
  }

  function aplicarFiltros() {
    const q = searchTerm.trim().toLowerCase()
    const vistaPorDefecto = categoriaFiltroActual === null && !q
    const destacadas = catalogoActual.categorias_destacadas || []

    if (vistaPorDefecto && destacadas.length > 0) {
      renderGridPorSecciones(destacadas)
      return
    }

    const filtrados = items.filter(it => {
      const pasaCategoria = categoriaFiltroActual === null || (it.categoria_ids || []).includes(categoriaFiltroActual)
      const pasaBusqueda = !q || (it.titulo || '').toLowerCase().includes(q)
      return pasaCategoria && pasaBusqueda
    })
    renderGrid(filtrados)
  }

  function cardHtml(it, uid) {
    if (uid === undefined) uid = it.id
    const puedeEditar = esDueñoActual
    const tieneDosFotos = !!(it.imagen_url && it.imagen_url_2)
    return `
      <div class="cat-item">
        ${puedeEditar ? `
          <div class="cat-item__admin-btns">
            <button class="cat-item__admin-btn" title="Editar" onclick="window._catEditarItem(${it.id})">✎</button>
            <button class="cat-item__admin-btn" title="Eliminar" onclick="window._catEliminarItem(${it.id})">🗑</button>
          </div>` : ''}
        <div class="cat-item__img-wrap" id="cat-imgwrap-${uid}">
          ${it.imagen_url
            ? `<img class="cat-item__img cat-item__img--activa" data-idx="0" src="${it.imagen_url}" alt="${it.titulo}"/>`
            : `<div class="cat-item__placeholder">Sin imagen</div>`}
          ${it.imagen_url_2 ? `<img class="cat-item__img" data-idx="1" src="${it.imagen_url_2}" alt="${it.titulo}"/>` : ''}
          ${money(it.precio) ? `<span class="cat-item__precio-badge">${money(it.precio)}</span>` : ''}
          ${tieneDosFotos ? `
            <div class="cat-item__dots">
              <button class="cat-item__dot cat-item__dot--activo" onclick="event.stopPropagation();window._catSwitchImg('${uid}',0)"></button>
              <button class="cat-item__dot" onclick="event.stopPropagation();window._catSwitchImg('${uid}',1)"></button>
            </div>` : ''}
        </div>
        <div class="cat-item__body">
          <p class="cat-item__titulo">${it.titulo}</p>
          ${it.descripcion ? `<p class="cat-item__desc">${it.descripcion}</p>` : ''}
        </div>
      </div>`
  }

  function renderGrid(lista) {
    const grid  = document.getElementById('catItemsGrid')
    const empty = document.getElementById('catItemsEmpty')
    grid.className = 'cat-grid'

    if (items.length === 0) {
      grid.innerHTML = ''
      empty.textContent = 'Todavía no hay productos cargados.'
      empty.style.display = 'block'
      return
    }
    if (lista.length === 0) {
      grid.innerHTML = ''
      empty.textContent = 'Ningún producto coincide con la búsqueda o la categoría elegida.'
      empty.style.display = 'block'
      return
    }
    empty.style.display = 'none'
    grid.innerHTML = lista.map(it => cardHtml(it)).join('')
  }

  // Vista con hasta 3 categorías destacadas como secciones propias, seguidas
  // siempre de "Todos los productos" con el catálogo completo publicado.
  function renderGridPorSecciones(destacadas) {
    const grid  = document.getElementById('catItemsGrid')
    const empty = document.getElementById('catItemsEmpty')
    empty.style.display = 'none'
    grid.className = ''

    if (items.length === 0) {
      grid.innerHTML = ''
      empty.textContent = 'Todavía no hay productos cargados.'
      empty.style.display = 'block'
      return
    }

    let html = ''
    destacadas.forEach(catId => {
      const cat = categorias.find(c => c.id === catId)
      if (!cat) return
      const productos = items.filter(it => (it.categoria_ids || []).includes(catId))
      if (productos.length === 0) return
      html += `<div class="cat-seccion"><h3 class="cat-seccion__titulo">${cat.nombre}</h3><div class="cat-grid">${productos.map(it => cardHtml(it, 'f' + catId + '-' + it.id)).join('')}</div></div>`
    })
    html += `<div class="cat-seccion"><h3 class="cat-seccion__titulo">Todos los productos</h3><div class="cat-grid">${items.map(it => cardHtml(it, 'all-' + it.id)).join('')}</div></div>`
    grid.innerHTML = html
  }

  window._catSwitchImg = function (itemId, idx) {
    const wrap = document.getElementById('cat-imgwrap-' + itemId)
    if (!wrap) return
    wrap.querySelectorAll('.cat-item__img').forEach(img => {
      img.classList.toggle('cat-item__img--activa', Number(img.dataset.idx) === idx)
    })
    wrap.querySelectorAll('.cat-item__dot').forEach((dot, i) => {
      dot.classList.toggle('cat-item__dot--activo', i === idx)
    })
  }

  // ══════════════════════════════════════════
  //  MODAL: crear / editar producto
  // ══════════════════════════════════════════
  let imagenUrlTemp  = ''
  let imagenUrlTemp2 = ''

  document.getElementById('catBtnNuevoItem').addEventListener('click', () => abrirModalItem(null))

  window._catEditarItem = function (id) {
    const it = items.find(x => x.id === id)
    if (it) abrirModalItem(it)
  }

  function previewHtml(url, textoBoton) {
    return url
      ? `<img class="cat-upload__img" src="${url}">`
      : `<span class="cat-upload__btn">↑</span><span class="cat-upload__texto">${textoBoton}</span>`
  }

  function renderCategoriasChecks(seleccionadas) {
    const cont = document.getElementById('catItemCategoriasChecks')
    if (categorias.length === 0) {
      cont.innerHTML = '<span class="cat-check-pill cat-check-pill--vacio">Todavía no creaste categorías (botón 🏷️ Categorías)</span>'
      return
    }
    cont.innerHTML = categorias.map(c => `
      <label class="cat-check-pill">
        <input type="checkbox" value="${c.id}" ${seleccionadas.includes(c.id) ? 'checked' : ''}/>
        ${c.nombre}
      </label>
    `).join('')
  }

  function abrirModalItem(it) {
    document.getElementById('catModalItemTitulo').textContent = it ? 'Editar producto' : 'Nuevo producto'
    document.getElementById('catItemId').value = it ? it.id : ''
    document.getElementById('catItemTitulo').value = it ? it.titulo : ''
    document.getElementById('catItemPrecio').value = it && it.precio !== null ? it.precio : ''
    document.getElementById('catItemDesc').value = it ? (it.descripcion || '') : ''
    imagenUrlTemp  = it ? (it.imagen_url || '') : ''
    imagenUrlTemp2 = it ? (it.imagen_url_2 || '') : ''
    document.getElementById('catItemPreview').innerHTML  = previewHtml(imagenUrlTemp, 'Subir foto')
    document.getElementById('catItemPreview2').innerHTML = previewHtml(imagenUrlTemp2, 'Subir foto')
    renderCategoriasChecks(it ? (it.categoria_ids || []) : [])
    document.getElementById('catItemError').textContent = ''
    document.getElementById('catModalItem').classList.add('activo')
  }
  document.getElementById('catBtnCerrarModalItem').addEventListener('click', () =>
    document.getElementById('catModalItem').classList.remove('activo'))

  async function subirFotoProducto(file, previewEl) {
    previewEl.innerHTML = `<span class="cat-upload__texto">Subiendo...</span>`
    const comprimido = await comprimirImagen(file, 1000, 1000, 0.78)
    const fileName = nombreSeguro('item-' + (catalogoActual ? catalogoActual.id : '0'), comprimido.type)
    const { error } = await supabase.storage.from('catalogos').upload(fileName, comprimido, { upsert: true })
    if (error) {
      previewEl.innerHTML = `<span class="cat-upload__btn" style="background:#d94060">↑</span><span class="cat-upload__texto" style="color:#d94060">Error: ${error.message}</span>`
      return null
    }
    const { data: urlData } = supabase.storage.from('catalogos').getPublicUrl(fileName)
    previewEl.innerHTML = `<img class="cat-upload__img" src="${urlData.publicUrl}">`
    return urlData.publicUrl
  }

  document.getElementById('catItemUploadWrap').addEventListener('click', () => document.getElementById('catItemFile').click())
  document.getElementById('catItemFile').addEventListener('change', async e => {
    const file = e.target.files[0]
    if (!file) return
    const url = await subirFotoProducto(file, document.getElementById('catItemPreview'))
    if (url) imagenUrlTemp = url
  })

  document.getElementById('catItemUploadWrap2').addEventListener('click', () => document.getElementById('catItemFile2').click())
  document.getElementById('catItemFile2').addEventListener('change', async e => {
    const file = e.target.files[0]
    if (!file) return
    const url = await subirFotoProducto(file, document.getElementById('catItemPreview2'))
    if (url) imagenUrlTemp2 = url
  })

  document.getElementById('catBtnGuardarItem').addEventListener('click', async () => {
    const errEl = document.getElementById('catItemError')
    const id = document.getElementById('catItemId').value
    const titulo = document.getElementById('catItemTitulo').value.trim()
    const precioRaw = document.getElementById('catItemPrecio').value
    const descripcion = document.getElementById('catItemDesc').value.trim()
    if (!titulo) { errEl.textContent = 'El título es obligatorio.'; return }

    const categoriaIds = Array.from(document.querySelectorAll('#catItemCategoriasChecks input[type="checkbox"]:checked'))
      .map(cb => Number(cb.value))

    const datos = {
      catalogo_id: catalogoActual.id,
      titulo,
      precio: precioRaw === '' ? null : Number(precioRaw),
      descripcion: descripcion || null,
      imagen_url: imagenUrlTemp || null,
      imagen_url_2: imagenUrlTemp2 || null,
      categoria_ids: categoriaIds
    }

    let error
    if (id) {
      ;({ error } = await supabase.from('catalogo_items').update(datos).eq('id', id))
    } else {
      ;({ error } = await supabase.from('catalogo_items').insert([datos]))
    }
    if (error) { errEl.textContent = 'Error al guardar: ' + error.message; return }
    document.getElementById('catModalItem').classList.remove('activo')
    await cargarItems()
  })

  window._catEliminarItem = async function (id) {
    if (!confirm('¿Eliminar este producto del catálogo?')) return
    const { error } = await supabase.from('catalogo_items').delete().eq('id', id)
    if (error) { alert('Error al eliminar: ' + error.message); return }
    await cargarItems()
  }

  // ══════════════════════════════════════════
  //  AUTOSERVICIO — "¿Querés tu propio catálogo?" desde la vitrina pública
  // ══════════════════════════════════════════
  document.getElementById('catBtnCerrarCrearPropio').addEventListener('click', () =>
    document.getElementById('catModalCrearPropio').classList.remove('activo'))

  function abrirModalCrearPropio() {
    document.getElementById('catCPAuthError').textContent = ''
    if (usuarioActual) {
      pasoNombreCrearPropio()
    } else {
      document.getElementById('catModalCrearPropio').classList.add('activo')
      mostrarTabCP('login')
    }
  }

  function mostrarTabCP(tab) {
    document.getElementById('catCPPanelLogin').style.display = tab === 'login' ? 'block' : 'none'
    document.getElementById('catCPPanelRegistro').style.display = tab === 'registro' ? 'block' : 'none'
  }
  document.getElementById('catCPTabLogin').addEventListener('click', () => mostrarTabCP('login'))
  document.getElementById('catCPTabRegistro').addEventListener('click', () => mostrarTabCP('registro'))

  // Si ya tiene un catálogo, lo mandamos directo al de él en vez de dejarlo crear otro.
  // Si no tiene, cerramos este modal simple y abrimos el modal completo (logo + paleta +
  // vista previa) en modo autoservicio, para que arranque con todo bien configurado.
  async function pasoNombreCrearPropio() {
    const { data } = await supabase.from('catalogos').select('slug').eq('user_id', usuarioActual.id).limit(1)
    if (data && data.length > 0) {
      window.location.href = 'catalogos.html?slug=' + encodeURIComponent(data[0].slug)
      return
    }
    document.getElementById('catModalCrearPropio').classList.remove('activo')
    abrirModalCatalogo(null, true)
  }

  document.getElementById('catCPBtnLogin').addEventListener('click', async () => {
    const email = document.getElementById('catCPEmail').value.trim()
    const pass  = document.getElementById('catCPPass').value
    const ok = await intentarLogin(email, pass, document.getElementById('catCPAuthError'), document.getElementById('catCPBtnLogin'), 'Ingresar')
    if (ok) { await chequearSesion(); await pasoNombreCrearPropio() }
  })

  document.getElementById('catCPBtnRegistro').addEventListener('click', async () => {
    const nombre = document.getElementById('catCPRegNombre').value.trim()
    const email  = document.getElementById('catCPRegEmail').value.trim()
    const pass   = document.getElementById('catCPRegPass').value
    const errEl  = document.getElementById('catCPAuthError')
    errEl.textContent = ''
    if (!email || !pass) { errEl.textContent = 'Completá email y contraseña.'; return }
    if (pass.length < 6) { errEl.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return }
    const btn = document.getElementById('catCPBtnRegistro')
    btn.disabled = true; btn.textContent = 'Creando cuenta...'
    const { data, error } = await supabase.auth.signUp({ email, password: pass })
    btn.disabled = false; btn.textContent = 'Crear cuenta'
    if (error) { errEl.textContent = 'Error: ' + error.message; return }
    if (data.user) {
      await supabase.from('profiles').upsert([{ id: data.user.id, email, rol: 'user', nombre: nombre || email.split('@')[0] }], { onConflict: 'id' })
    }
    await chequearSesion()
    await pasoNombreCrearPropio()
  })

  // ══════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════
  init()
})()
