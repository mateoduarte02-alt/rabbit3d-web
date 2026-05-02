// ═══════════════════════════════════════════════════
// tendencias.js — La Madriguera
// ═══════════════════════════════════════════════════

    // ── TENDENCIAS MULTI-PLATAFORMA ────────────────────────────────────
    let tendPlatActual = 'todas'
    const tendCache = {}
    const TEND_INICIAL = 15
    const PLAT_LABELS = { printables:'Printables', cults3d:'Cults3D', thingiverse:'Thingiverse' }
    const PLAT_BADGE_COLOR = { printables:'#fa6831', cults3d:'#f75a5a', thingiverse:'#248bfb' }
    const platLogosUrl = { printables: null, cults3d: null, thingiverse: null }
    const PLAT_SVG_FALLBACK = {
      printables: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fa6831"/><text x="12" y="16.5" text-anchor="middle" font-size="10" font-weight="900" fill="white" font-family="Arial">P</text></svg>`,
      cults3d: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#f75a5a"/><text x="12" y="16.5" text-anchor="middle" font-size="10" font-weight="900" fill="white" font-family="Arial">C</text></svg>`,
      thingiverse: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#248bfb"/><text x="12" y="16.5" text-anchor="middle" font-size="10" font-weight="900" fill="white" font-family="Arial">T</text></svg>`
    }
    function platLogoHTML(plat) {
      const color = PLAT_BADGE_COLOR[plat]||'var(--cyan)', url = platLogosUrl[plat]
      const inner = url
        ? `<img src="${url}" style="width:100%;height:100%;object-fit:contain;padding:3px" onerror="this.style.display='none';this.nextSibling.style.display='flex'"><span class="tend-plat-svg" style="display:none">${PLAT_SVG_FALLBACK[plat]||''}</span>`
        : `<span class="tend-plat-svg">${PLAT_SVG_FALLBACK[plat]||''}</span>`
      return `<div class="tend-card__plat-logo" style="--plat-color:${color}">${inner}</div>`
    }

    async function cargarMakerworld() {
      await cargarTendencias('todas')
      document.querySelectorAll('.tend-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.tend-tab').forEach(b => b.classList.remove('tend-tab--active'))
          btn.classList.add('tend-tab--active')
          tendPlatActual = btn.dataset.plat
          const old = document.getElementById('tendVerMasWrap')
          if (old) old.remove()
          cargarTendencias(tendPlatActual)
        })
      })
    }

    // IDs eliminados manualmente por el admin — persisten en localStorage
    const TEND_OCULTAS_KEY = 'r3d_tend_ocultas'
    // Cache local de IDs ocultos (se carga desde Supabase al iniciar)
    let tendOcultasSet = new Set()

    async function cargarTendOcultas() {
      try {
        const { data, error } = await supabase.from('media')
          .select('nombre').eq('tipo', 'tend-ocultas').maybeSingle()
        if (!error && data && data.nombre) {
          tendOcultasSet = new Set(JSON.parse(data.nombre))
        }
      } catch(e) { console.warn('cargarTendOcultas:', e) }
    }

    function getTendOcultas() { return tendOcultasSet }

    async function addTendOculta(id) {
      tendOcultasSet.add(String(id))
      try {
        const json = JSON.stringify([...tendOcultasSet])
        await supabase.from('media').delete().eq('tipo', 'tend-ocultas')
        await supabase.from('media').insert([{ tipo: 'tend-ocultas', url: '', nombre: json }])
      } catch(e) { console.warn('addTendOculta:', e) }
    }

    async function fetchPlat(plat) {
      if (tendCache[plat]) return tendCache[plat]
      const { data, error } = await supabase
        .from('tendencias_3d').select('*').eq('plataforma', plat)
        .order('posicion', { ascending: true }).limit(100)
      if (!error && data && data.length > 0) {
        const ocultas = getTendOcultas()
        tendCache[plat] = data
          .filter(item => !ocultas.has(String(item.id)))
          .map(item => ({ ...item, plataforma: plat }))
      }
      return tendCache[plat] || []
    }

    async function cargarTendencias(plat) {
      const grid = document.getElementById('tendGrid')
      const meta = document.getElementById('tendMeta')
      if (!grid) return
      const old = document.getElementById('tendVerMasWrap')
      if (old) old.remove()
      grid.innerHTML = '<p style="grid-column:1/-1;padding:2rem;color:var(--muted);text-align:center">Cargando...</p>'
      if (meta) meta.innerHTML = ''
      try {
        let data = []
        if (plat === 'todas') {
          const _scrap = await Promise.all([
            fetchPlat('printables'), fetchPlat('cults3d'), fetchPlat('thingiverse')
          ])
          const prints=_scrap[0], cults=_scrap[1], thing=_scrap[2]
          const maxLen = Math.max(prints.length, cults.length, thing.length)
          for (let i = 0; i < maxLen; i++) {
            if (prints[i]) data.push(prints[i])
            if (cults[i])  data.push(cults[i])
            if (thing[i])  data.push(thing[i])
          }
          if (meta) meta.innerHTML = `<p class="tend-meta__text">${data.length} diseños · Todas las plataformas</p>`
        } else {
          data = await fetchPlat(plat)
          if (meta && data[0]?.scraped_at) {
            const fecha = new Date(data[0].scraped_at).toLocaleDateString('es-AR',{day:'numeric',month:'long',year:'numeric'})
            meta.innerHTML = `<p class="tend-meta__text">Última actualización: ${fecha} · ${data.length} diseños · ${PLAT_LABELS[plat]}</p>`
          }
        }
        if (!data.length) {
          grid.innerHTML = `<p style="grid-column:1/-1;padding:2rem;color:var(--muted);text-align:center">
            Sin datos aún para esta plataforma.
            ${esAdmin ? '<br><small>Usá el botón "Actualizar Tendencias" para cargar.</small>' : ''}
          </p>`
          return
        }
        if (plat === 'todas' && data.length > TEND_INICIAL) {
          renderTendencias(data.slice(0, TEND_INICIAL), plat)
          insertarVerMas(data, plat)
        } else {
          renderTendencias(data, plat)
        }
      } catch(e) {
        console.warn('cargarTendencias error:', e)
        grid.innerHTML = '<p style="grid-column:1/-1;padding:2rem;color:var(--muted);text-align:center">Error al cargar los datos.</p>'
      }
    }

    function insertarVerMas(data, plat) {
      const section = document.getElementById('makerworld')
      if (!section) return
      const restantes = data.length - TEND_INICIAL
      const wrap = document.createElement('div')
      wrap.id = 'tendVerMasWrap'
      wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:.5rem;margin:1.5rem auto 0;'
      wrap.innerHTML = `<button class="btn-ver-mas-tend" id="btnVerMasTend">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="16" height="16"><polyline points="6 9 12 15 18 9"/></svg>
        Ver más
        <span class="btn-ver-mas-tend__count">+${restantes} diseños</span>
      </button>`
      section.appendChild(wrap)
      document.getElementById('btnVerMasTend').addEventListener('click', () => {
        wrap.remove()
        const grid = document.getElementById('tendGrid')
        if (!grid) return
        data.slice(TEND_INICIAL).forEach((item, i) => {
          const tmp = document.createElement('div')
          tmp.innerHTML = buildCardHTML(item, TEND_INICIAL + i, plat)
          const card = tmp.firstElementChild
          card.classList.add('tend-card--reveal')
          card.style.animationDelay = `${Math.min(i * 40, 400)}ms`
          grid.appendChild(card)
        })
      })
    }

    function buildCardHTML(item, i, plat) {
      const fallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect fill='%23001520' width='4' height='3'/%3E%3C/svg%3E"
      window._tendFallback = fallback
      function proxyImg(url) {
        if (!url) return fallback
        if (url.includes('thingiverse.com') || url.includes('cdn.makerbot.com')) {
          let u = url
          if (u.includes('_thumb_medium')) u = u.replace('_thumb_medium', '_thumb_large')
          if (u.includes('_thumb_small'))  u = u.replace('_thumb_small',  '_thumb_large')
          return 'https://images.weserv.nl/?url=' + encodeURIComponent(u) + '&w=600&output=webp&q=85'
        }
        return url
      }
      function parseImagen(raw) {
        if (!raw) return { type: 'img', src: '' }
        if (raw.startsWith('video:')) return { type: 'video', src: raw.slice(6) }
        const lower = raw.toLowerCase().split('?')[0]
        if (lower.endsWith('.mp4') || lower.includes('/mp4/')) return { type: 'video', src: raw }
        return { type: 'img', src: raw }
      }
      function mediaThumb(rawUrl) {
        if (!rawUrl) return '<img src="' + fallback + '" alt=""/>'
        const parsed = parseImagen(rawUrl)
        if (parsed.type === 'video') {
          return '<video src="' + parsed.src + '" muted loop playsinline preload="none"'
            + ' style="width:100%;height:100%;object-fit:cover;display:block;"'
            + ' onmouseenter="this.play()" onmouseleave="this.pause();this.currentTime=0"'
            + ' onerror="this.style.display=&quot;none&quot;;var i=document.createElement(&quot;img&quot;);i.src=window._tendFallback;i.style.cssText=&quot;width:100%;height:100%;object-fit:cover&quot;;this.parentNode.appendChild(i)"'
            + '></video>'
        }
        return '<img src="' + proxyImg(parsed.src) + '" alt="" loading="lazy"'
          + ' onerror="this.onerror=null;this.src=window._tendFallback"'
          + '/>'
      }
      const mostrarTodas = (plat === 'todas')
      const itemPlat = item.plataforma || plat
      const platLabel = PLAT_LABELS[itemPlat] || itemPlat
      const adminBtn = esAdmin
        ? `<button class="tend-card__del-btn" title="Quitar de tendencias"
             onclick="event.preventDefault();event.stopPropagation();window.eliminarTendencia('${item.id}',this)"
             aria-label="Eliminar">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12">
               <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
               <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
             </svg>
           </button>`
        : ''
      return `<a class="tend-card" href="${item.url}" target="_blank" rel="noopener" data-tend-id="${item.id}">
        <div class="tend-card__rank">#${i+1}</div>
        ${mostrarTodas ? platLogoHTML(itemPlat) : ''}
        ${adminBtn}
        <div class="tend-card__thumb">${mediaThumb(item.imagen)}</div>
        <div class="tend-card__body">
          <p class="tend-card__title">${item.titulo || 'Sin título'}</p>
          <p class="tend-card__author">por ${item.autor || 'Desconocido'}</p>
          ${item.descripcion ? `<p class="tend-card__desc">${item.descripcion.slice(0,80)}${item.descripcion.length>80?'…':''}</p>` : ''}
          <div class="tend-card__stats">
            ${item.likes    ? `<span>❤️ ${Number(item.likes).toLocaleString()}</span>` : ''}
            ${item.downloads ? `<span>⬇️ ${Number(item.downloads).toLocaleString()}</span>` : ''}
            ${item.precio && item.precio !== '' ? `<span class="tend-card__precio${item.precio==='gratis'?' tend-card__precio--free':''}">${item.precio==='gratis'?'Gratis':item.precio}</span>` : ''}
          </div>
          <span class="tend-card__btn">Ver en ${platLabel} ↗</span>
        </div>
      </a>`
    }

    function renderTendencias(data, plat) {
      const grid = document.getElementById('tendGrid')
      if (!grid) return
      grid.innerHTML = data.map((item, i) => buildCardHTML(item, i, plat)).join('')
    }

    window.eliminarTendencia = async function(id, btn) {
      if (!confirm('¿Quitar esta publicación de tendencias?')) return
      btn.disabled = true
      try {
        const { error } = await supabase.from('tendencias_3d').delete().eq('id', id)
        if (error) throw error
        // Guardar en lista de ocultas (persiste al recargar)
        addTendOculta(id)
        // Limpiar cache en memoria
        ;['printables','cults3d','thingiverse'].forEach(plat => {
          if (tendCache[plat]) tendCache[plat] = tendCache[plat].filter(x => String(x.id) !== String(id))
        })
        // Animar y eliminar la card del DOM
        const card = document.querySelector(`[data-tend-id="${id}"]`)
        if (card) {
          card.style.transition = 'opacity .3s ease, transform .3s ease'
          card.style.opacity = '0'
          card.style.transform = 'scale(0.9)'
          setTimeout(() => {
            card.remove()
            document.querySelectorAll('.tend-card__rank').forEach((el, i) => {
              el.textContent = `#${i+1}`
            })
          }, 320)
        }
        // Feedback visual en el botón
        btn.innerHTML = '✓'
        btn.style.color = 'var(--cyan)'
      } catch(e) {
        console.error('eliminarTendencia error:', e)
        btn.disabled = false
        alert('Error al eliminar: ' + (e.message || String(e)))
      }
    }

    window.actualizarMakerworld = async function() {
      const btn = document.getElementById('btnActualizarMW')
      if (btn) { btn.disabled = true; btn.textContent = 'Actualizando...' }
      try {
        const { data, error } = await supabase.functions.invoke('scrape-tendencias', {
          method: 'POST', body: {}
        })
        if (error) throw error
        if (data?.ok) {
          Object.keys(tendCache).forEach(k => delete tendCache[k])
          await cargarTendencias(tendPlatActual)
          const resumen = Object.entries(data.results||{}).map(function(e){return e[0]+': '+e[1]+' items'}).join('\n')
          alert('\u2713 Tendencias actualizadas:\n' + resumen)
        } else {
          alert('Respuesta inesperada: ' + JSON.stringify(data))
        }
      } catch(e) {
        console.error('actualizarMakerworld error:', e)
        alert('Error: ' + (e.message || String(e)))
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = '🔄 Actualizar Tendencias' }
      }
    }

    // initMakersPromo está en menu.js — llamar diferido para asegurar que esté cargado
    if (typeof initMakersPromo === 'function') initMakersPromo()
    else window.addEventListener('load', function(){ if(typeof initMakersPromo==='function') initMakersPromo() })
    // cargarMakerworld() se llama después de verificarSesionUsuario() para que esAdmin esté definido

    // ══════════════════════════════════════════
    //  ÁREA DE EMPRENDEDORES
    // ══════════════════════════════════════════
    window.abrirEmprendedor = function(id) {
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

    window.cerrarEmprendedor = function(id) {
      const el = document.getElementById(id)
      if (el) el.style.display = 'none'
      document.body.style.overflow = ''
    }
    ;['modal-tarjetas','modal-potenciador','modal-costos','modal-mejora','modal-presupuesto','modal-fotoproducto','modal-cajas'].forEach(id=>{
      const el=document.getElementById(id)
      if(el) el.addEventListener('click',e=>{ if(e.target===el) cerrarEmprendedor(id) })
    })

    // ── Sistema de Mantenimiento de herramientas ──────────────────────────────
    // Las herramientas en mantenimiento se guardan en Supabase tabla media
    // tipo = 'config-maint-<toolId>', nombre = '1' (en mant) o '0' (activa)
