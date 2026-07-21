// ═══════════════════════════════════════════════════
// emprendedor.js — La Madriguera
// ═══════════════════════════════════════════════════

    let _maintTools = {}       // { toolId: true/false } — bloqueada con overlay "En mantenimiento"
    let _hiddenTools = {}      // { toolId: true/false } — oculta directamente del catálogo de herramientas
    let _maintLoaded = false

    async function cargarMantenimiento() {
      if (_maintLoaded) return
      try {
        const { data } = await supabase.from('media')
          .select('tipo,nombre').or('tipo.like.config-maint-%,tipo.like.config-hidden-%')
        if (data) data.forEach(r => {
          if (r.tipo.startsWith('config-maint-')) {
            const id = r.tipo.replace('config-maint-','')
            _maintTools[id] = (r.nombre === '1' || r.url === '1')  // 'nombre'=1 es el formato viejo, 'url'=1 el nuevo
          } else if (r.tipo.startsWith('config-hidden-')) {
            const id = r.tipo.replace('config-hidden-','')
            _hiddenTools[id] = (r.nombre === '1' || r.url === '1')
          }
        })
        _maintLoaded = true
        _aplicarOverlaysMant()
      } catch(e) {}
    }

    function _estaEnMant(toolId) { return !!_maintTools[toolId] }
    function _estaOculta(toolId) { return !!_hiddenTools[toolId] }

    // Muestra overlay visual en la card si está en mantenimiento, y la oculta si corresponde
    function _aplicarOverlaysMant() {
      const ids = new Set([...Object.keys(_maintTools), ...Object.keys(_hiddenTools)])
      ids.forEach(function(id) {
        const enMant = !!_maintTools[id]
        const oculta = !!_hiddenTools[id]
        // Cards de laboratorio
        const labCard = document.querySelector('.herramienta-card[onclick*="modal-' + id + '"]')
        if (labCard) { _toggleMantOverlay(labCard, id, enMant, 'lab'); _toggleHiddenCard(labCard, id, oculta) }
        // Cards de emprendedores
        const emprCard = document.querySelector('[data-empr-id="' + id + '"]')
        if (emprCard) { _toggleMantOverlay(emprCard, id, enMant, 'empr'); _toggleHiddenCard(emprCard, id, oculta) }
      })
    }

    // Oculta la card por completo para usuarios normales; para el admin la deja
    // visible pero marcada, así puede reactivarla desde el gestor
    function _toggleHiddenCard(card, id, oculta) {
      if (oculta && !esAdmin) {
        card.style.display = 'none'
        return
      }
      card.style.display = ''
      const badgeId = 'hidden-admin-badge-' + id
      let badge = document.getElementById(badgeId)
      if (oculta && esAdmin) {
        if (!badge) {
          badge = document.createElement('div')
          badge.id = badgeId
          badge.style.cssText = 'position:absolute;top:8px;left:8px;z-index:11;background:rgba(0,0,0,.75);border:1px solid #f87171;color:#f87171;font-size:.62rem;font-weight:700;padding:.2rem .5rem;border-radius:6px;pointer-events:none'
          badge.textContent = '🙈 Oculta para usuarios'
          if (getComputedStyle(card).position === 'static') card.style.position = 'relative'
          card.appendChild(badge)
        }
      } else if (badge) {
        badge.remove()
      }
    }

    function _toggleMantOverlay(card, id, enMant, tipo) {
      const overlayId = 'mant-overlay-' + id
      let overlay = document.getElementById(overlayId)
      if (enMant && !esAdmin) {
        if (!overlay) {
          overlay = document.createElement('div')
          overlay.id = overlayId
          overlay.style.cssText = 'position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4rem;background:rgba(0,0,0,.72);border-radius:inherit;backdrop-filter:blur(3px);pointer-events:all'
          overlay.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.5" width="28" height="28"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span style="font-size:.72rem;font-weight:700;color:#f59e0b;text-align:center;padding:0 .5rem">En mantenimiento</span><span style="font-size:.65rem;color:rgba(255,255,255,.6);text-align:center;padding:0 .5rem">Volvé pronto</span>'
          if (getComputedStyle(card).position === 'static') card.style.position = 'relative'
          card.appendChild(overlay)
        }
      } else if (overlay) {
        overlay.remove()
      }
    }

    // Interceptar abrirHerramienta y abrirEmprendedor para bloquear si está en mant u oculta
    const _origAbrirH_mant = window.abrirHerramienta
    window.abrirHerramienta = function(id) {
      const toolId = id.replace('modal-','')
      if ((_estaEnMant(toolId) || _estaOculta(toolId)) && !esAdmin) {
        // Mostrar toast de mantenimiento
        _mostrarToastMant()
        return
      }
      _origAbrirH_mant(id)
    }

    const _origAbrirE_mant = window.abrirEmprendedor
    window.abrirEmprendedor = function(id) {
      const toolId = id.replace('modal-','')
      if ((_estaEnMant(toolId) || _estaOculta(toolId)) && !esAdmin) {
        _mostrarToastMant()
        return
      }
      _origAbrirE_mant(id)
    }

    function _mostrarToastMant() {
      const t = document.createElement('div')
      t.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:#1a1a2e;border:1px solid #f59e0b;color:#f59e0b;padding:.6rem 1.2rem;border-radius:8px;font-size:.8rem;font-weight:600;z-index:99999;display:flex;align-items:center;gap:.5rem;box-shadow:0 4px 20px rgba(0,0,0,.5)'
      t.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Esta herramienta está en mantenimiento'
      document.body.appendChild(t)
      setTimeout(() => t.remove(), 3000)
    }

    // Cargar estado de mantenimiento al iniciar
    cargarMantenimiento()
    // ── Fin sistema de mantenimiento ──────────────────────────────────────────

    window.requireLogin = function(callback) {
      if (usuarioActual) { callback(); return }
      // Mostrar modal de login inmediatamente (z-index: 99999 lo pone sobre cualquier herramienta)
      const modalU = document.getElementById('modalUsuario')
      if (modalU) {
        // Agregar mensaje contextual en el modal
        const existing = document.getElementById('loginDownloadMsg')
        if (existing) existing.remove()
        const msg = document.createElement('div')
        msg.id = 'loginDownloadMsg'
        msg.style.cssText = 'background:rgba(21,154,156,.12);border:1px solid rgba(21,154,156,.35);border-radius:8px;padding:.65rem 1rem;font-size:.8rem;color:var(--cyan);text-align:center;margin-bottom:.5rem'
        msg.innerHTML = '🔒 Iniciá sesión para descargar el archivo'
        const firstChild = modalU.querySelector('.modal')
        if (firstChild) {
          const title = firstChild.querySelector('.modal__title,.modal__sub')
          if (title) title.parentNode.insertBefore(msg, title.nextSibling)
          else firstChild.prepend(msg)
        }
        // Asegurarse de mostrar el tab de login
        const tabLogin = document.getElementById('tabLogin')
        if (tabLogin) tabLogin.click()
        modalU.classList.add('activo')
      }
    }
    // ── TARJETAS ─────────────────────────────────────────────────────
    // Agrega contorno del color del fondo original al logo recortado
    async function tarjAgregarContorno(src, color) {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const pad = Math.round(Math.max(img.width, img.height) * 0.04)
          const W = img.width + pad*2, H = img.height + pad*2
          const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, pad, pad)
          resolve(canvas.toDataURL('image/png'))
        }
        img.src = src
      })
    }

    let tarjLogoImg=null, tarjLogoColor=null, tarjColores=['#159A9C','#001520','#ffffff','#f0a028']
    let tarjBgRemoval = 0  // 0 = sin remoción, 1 = remoción total del fondo
    let tarjLogoScale = 1.0  // 1 = tamaño base

    function tarjLoadLogo(file) {
      if (!file || !file.type.startsWith('image/')) return
      const r = new FileReader()
      r.onload = e => {
        const img = new Image()
        img.onload = () => {
          tarjLogoImg = img
          tarjPrevImg.src = e.target.result
          tarjInner.style.display = 'none'
          tarjPrev.style.display = 'flex'
          document.getElementById('tarjError').textContent = ''
          document.getElementById('tarjLogoOpacityGroup').style.display = 'block'
          document.getElementById('tarjLogoScaleGroup').style.display = 'block'

          // Extraer los 4 colores más destacados del logo
          try {
            const tc = document.createElement('canvas'); tc.width = 80; tc.height = 80
            const tx = tc.getContext('2d'); tx.drawImage(img, 0, 0, 80, 80)
            const pixels = tx.getImageData(0, 0, 80, 80).data
            const colorMap = {}
            for (let i = 0; i < pixels.length; i += 4) {
              const a = pixels[i+3]; if (a < 80) continue
              const rv = pixels[i], gv = pixels[i+1], bv = pixels[i+2]
              const bright = rv*0.299 + gv*0.587 + bv*0.114
              if (bright > 235 || bright < 15) continue
              // Cuantizar a grupos de 32
              const key = `${Math.round(rv/32)*32},${Math.round(gv/32)*32},${Math.round(bv/32)*32}`
              colorMap[key] = (colorMap[key] || 0) + 1
            }
            const sorted = Object.entries(colorMap).sort((a,b) => b[1]-a[1])
            // Tomar los 4 más frecuentes y distintos entre sí
            const picked = []
            for (var ki=0; ki<sorted.length; ki++) {
              var key = sorted[ki][0]
              var rgb = key.split(',').map(Number)
              var r2=rgb[0],g2=rgb[1],b2=rgb[2]
              var esDistinto = picked.every(function(p) {
                return Math.abs(r2-p[0])+Math.abs(g2-p[1])+Math.abs(b2-p[2]) > 60
              })
              if (esDistinto) picked.push([r2,g2,b2])
              if (picked.length === 4) break
            }
            const defaults = [[21,154,156],[0,21,32],[255,255,255],[240,160,40]]
            while (picked.length < 4) picked.push(defaults[picked.length])
            tarjColores = picked.map(function(p) { return 'rgb('+p[0]+','+p[1]+','+p[2]+')' })
            tarjLogoColor = tarjColores[0]
            tarjActualizarSelectores()
          } catch(e) { tarjLogoColor = null }

          if (typeof tarjGenerarTodas === 'function') tarjGenerarTodas_throttled()
        }
        img.src = e.target.result
      }
      r.readAsDataURL(file)
    }

    function tarjActualizarSelectores() {
      tarjColores.forEach((color, i) => {
        const el = document.getElementById('tarjColor' + i)
        if (el) {
          // Convertir rgb() a hex para el input color
          const m = color.match(/\d+/g)
          if (m && m.length >= 3) el.value = '#' + m.slice(0,3).map(v => Math.min(255,parseInt(v)).toString(16).padStart(2,'0')).join('')
        }
      })
    }
    const tarjZone=document.getElementById('tarjUploadZone'),tarjFile=document.getElementById('tarjLogoFile'),tarjInner=document.getElementById('tarjUploadInner'),tarjPrev=document.getElementById('tarjUploadPreview'),tarjPrevImg=document.getElementById('tarjLogoPreviewImg')
    tarjZone.addEventListener('click',e=>{if(!e.target.closest('#tarjChangeLogo'))tarjFile.click()})
    document.getElementById('tarjChangeLogo').addEventListener('click',e=>{e.stopPropagation();tarjFile.click()})
    tarjFile.addEventListener('change',e=>tarjLoadLogo(e.target.files[0]))
    tarjZone.addEventListener('dragover',e=>{e.preventDefault();tarjZone.classList.add('vec-drag')});tarjZone.addEventListener('dragleave',()=>tarjZone.classList.remove('vec-drag'));tarjZone.addEventListener('drop',e=>{e.preventDefault();tarjZone.classList.remove('vec-drag');tarjLoadLogo(e.dataTransfer.files[0])})

    // Color inputs
    ;[0,1,2,3].forEach(i => {
      document.getElementById('tarjColor'+i)?.addEventListener('input', function() {
        const hex = this.value
        const r2 = parseInt(hex.slice(1,3),16), g2 = parseInt(hex.slice(3,5),16), b2 = parseInt(hex.slice(5,7),16)
        tarjColores[i] = `rgb(${r2},${g2},${b2})`
        if (i === 0) tarjLogoColor = tarjColores[0]
        if (typeof tarjGenerarTodas === 'function') tarjGenerarTodas_throttled()
      })
    })
    document.getElementById('tarjResetColores')?.addEventListener('click', () => {
      if (tarjLogoImg) tarjLoadLogo(tarjFile.files[0]) // re-detectar del logo
    })
    document.getElementById('tarjLogoOpacity')?.addEventListener('input', function() {
      tarjBgRemoval = this.value / 100
      document.getElementById('tarjLogoOpacityVal').textContent = this.value + '%'
      if (typeof tarjGenerarTodas === 'function') tarjGenerarTodas_throttled()
    })
    document.getElementById('tarjLogoScaleInput')?.addEventListener('input', function() {
      tarjLogoScale = this.value / 100
      document.getElementById('tarjLogoScaleVal').textContent = this.value + '%'
      if (typeof tarjGenerarTodas === 'function') tarjGenerarTodas_throttled()
    })

      // ── Gestor de Mantenimiento (admin) ──────────────────────────────────
      // Lee dinámicamente las herramientas desde el DOM — se actualiza solo al agregar nuevas
      window._getMantTools = function() {
        var tools = []

        // Laboratorio 3D: herramienta-card — extraer id sin regex
        document.querySelectorAll('.herramienta-card[onclick]').forEach(function(card) {
          var onc = card.getAttribute('onclick') || ''
          var raw = ''
          var q1 = onc.indexOf("'"), q2 = onc.indexOf("'", q1+1)
          var q3 = onc.indexOf('"'), q4 = onc.indexOf('"', q3+1)
          if (q1 >= 0 && q2 > q1) raw = onc.slice(q1+1, q2)
          else if (q3 >= 0 && q4 > q3) raw = onc.slice(q3+1, q4)
          if (!raw) return
          var id = raw.indexOf('modal-') === 0 ? raw.slice(6) : raw
          var titulo = card.querySelector('h3,.herramienta-card__title')
          var label = titulo ? titulo.textContent.trim() : id
          if (!tools.find(function(t){ return t.id === id })) tools.push({ id: id, label: label, tipo: 'lab' })
        })

        // Emprendedores: data-empr-id — lectura directa, soporta cualquier caracter
        document.querySelectorAll('[data-empr-id]').forEach(function(card) {
          var id = card.getAttribute('data-empr-id')
          if (!id) return
          var titulo = card.querySelector('h3,.empr-card__title')
          var label = titulo ? titulo.textContent.trim() : id
          if (!tools.find(function(t){ return t.id === id })) tools.push({ id: id, label: label, tipo: 'empr' })
        })

        return tools
      }

      window.abrirGestorMantenimiento = async function() {
        const modal = document.getElementById('modalGestorMant')
        modal.style.display = 'flex'
        // Recargar estado fresco desde Supabase
        try {
          const { data } = await supabase.from('media')
            .select('tipo,nombre').or('tipo.like.config-maint-%,tipo.like.config-hidden-%')
          _maintTools = {}
          _hiddenTools = {}
          if (data) data.forEach(r => {
            if (r.tipo.startsWith('config-maint-')) _maintTools[r.tipo.replace('config-maint-','')] = (r.nombre === '1' || r.url === '1')
            else if (r.tipo.startsWith('config-hidden-')) _hiddenTools[r.tipo.replace('config-hidden-','')] = (r.nombre === '1' || r.url === '1')
          })
        } catch(e) {}
        _renderMantListas()
      }

      function _renderMantListas() {
        var MANT_TOOLS = (window._getMantTools || function(){return []}).call()
        ;['lab','empr'].forEach(tipo => {
          const lista = document.getElementById('mantLista' + (tipo==='lab'?'Lab':'Empr'))
          if (!lista) return
          lista.innerHTML = ''
          if (!MANT_TOOLS.filter(t => t.tipo === tipo).length) {
            lista.innerHTML = '<p style="font-size:.7rem;color:var(--muted);padding:.3rem">No hay herramientas registradas.</p>'
            return
          }
          MANT_TOOLS.filter(t => t.tipo === tipo).forEach(tool => {
            const enMant = !!_maintTools[tool.id]
            const oculta = !!_hiddenTools[tool.id]
            const row = document.createElement('div')
            row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:.4rem;padding:.5rem .7rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:8px'
            row.innerHTML = `
              <span style="font-size:.78rem;color:var(--text)">${tool.label}</span>
              <div style="display:flex;gap:.4rem">
                <button data-tool-id="${tool.id}" data-oculta="${oculta}"
                  style="padding:.3rem .8rem;border-radius:6px;border:none;cursor:pointer;font-size:.72rem;font-weight:700;
                    background:${oculta ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.06)'};
                    color:${oculta ? '#f87171' : 'var(--muted)'}"
                  onclick="toggleOcultaTool(this)">
                  ${oculta ? '🙈 Oculta' : '👁 Visible'}
                </button>
                <button data-tool-id="${tool.id}" data-en-mant="${enMant}"
                  style="padding:.3rem .8rem;border-radius:6px;border:none;cursor:pointer;font-size:.72rem;font-weight:700;
                    background:${enMant ? 'rgba(245,158,11,.15)' : 'rgba(21,154,156,.15)'};
                    color:${enMant ? '#f59e0b' : '#4ecca3'}"
                  onclick="toggleMantTool(this)">
                  ${enMant ? '🔧 En mantenimiento' : '✅ Activa'}
                </button>
              </div>`
            lista.appendChild(row)
          })
        })
      }

      window.toggleMantTool = async function(btn) {
        const id = btn.dataset.toolId
        const enMant = btn.dataset.enMant === 'true'
        const nuevoEstado = !enMant
        btn.disabled = true
        btn.textContent = '...'
        try {
          await supabase.from('media').delete().eq('tipo','config-maint-'+id)
          if (nuevoEstado) {
            await supabase.from('media').insert([{tipo:'config-maint-'+id, url:'1', nombre:'config-maint-'+id}])
          }
          _maintTools[id] = nuevoEstado
          // Actualizar overlay en la card
          const labCard = document.querySelector('.herramienta-card[onclick*="modal-'+id+'"]')
          if (labCard) _toggleMantOverlay(labCard, id, nuevoEstado, 'lab')
          const emprCard = document.querySelector('[data-empr-id="'+id+'"]')
          if (emprCard) _toggleMantOverlay(emprCard, id, nuevoEstado, 'empr')
          _renderMantListas()
        } catch(e) {
          btn.disabled = false
          alert('Error al guardar: ' + (e.message || e))
        }
      }

      window.toggleOcultaTool = async function(btn) {
        const id = btn.dataset.toolId
        const oculta = btn.dataset.oculta === 'true'
        const nuevoEstado = !oculta
        btn.disabled = true
        btn.textContent = '...'
        try {
          await supabase.from('media').delete().eq('tipo','config-hidden-'+id)
          if (nuevoEstado) {
            await supabase.from('media').insert([{tipo:'config-hidden-'+id, url:'1', nombre:'config-hidden-'+id}])
          }
          _hiddenTools[id] = nuevoEstado
          // Actualizar la card (ocultarla/mostrarla según corresponda)
          const labCard = document.querySelector('.herramienta-card[onclick*="modal-'+id+'"]')
          if (labCard) _toggleHiddenCard(labCard, id, nuevoEstado)
          const emprCard = document.querySelector('[data-empr-id="'+id+'"]')
          if (emprCard) _toggleHiddenCard(emprCard, id, nuevoEstado)
          _renderMantListas()
        } catch(e) {
          btn.disabled = false
          alert('Error al guardar: ' + (e.message || e))
        }
      }
      // ── Fin gestor de mantenimiento ──────────────────────────────────────

