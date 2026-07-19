// ═══════════════════════════════════════════════════
// emprendedor.js — La Madriguera
// ═══════════════════════════════════════════════════

    if (!window._maintTools) window._maintTools = {}  // compartido con init.js
    let _maintLoaded = false

    async function cargarMantenimiento() {
      if (_maintLoaded) return
      try {
        const { data } = await supabase.from('media')
          .select('tipo,nombre').like('tipo','config-maint-%')
        if (data) data.forEach(r => {
          const id = r.tipo.replace('config-maint-','')
          window._maintTools[id] = r.url === '1' || r.nombre === '1'
        })
        _maintLoaded = true
        _aplicarOverlaysMant()
      } catch(e) {}
    }

    function _estaEnMant(toolId) { return !!(window._maintTools && window._maintTools[toolId]) }

    // Muestra overlay visual en la card si está en mantenimiento
    function _aplicarOverlaysMant() {
      Object.entries(window._maintTools || {}).forEach(function(entry) { var id=entry[0], enMant=entry[1];
        // Cards de laboratorio
        const labCard = document.querySelector('.herramienta-card[onclick*="modal-' + id + '"]')
        if (labCard) _toggleMantOverlay(labCard, id, enMant, 'lab')
        // Cards de emprendedores
        const emprCard = document.querySelector('[data-empr-id="' + id + '"]')
        if (emprCard) _toggleMantOverlay(emprCard, id, enMant, 'empr')
      })
    }

    window._toggleMantOverlay = function(card, id, enMant, tipo) {
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

    // Interceptar abrirHerramienta y abrirEmprendedor para bloquear si está en mant
    const _origAbrirH_mant = window.abrirHerramienta
    window.abrirHerramienta = function(id) {
      const toolId = id.replace('modal-','')
      if (_estaEnMant(toolId) && !esAdmin) {
        // Mostrar toast de mantenimiento
        _mostrarToastMant()
        return
      }
      _origAbrirH_mant(id)
    }

    const _origAbrirE_mant = window.abrirEmprendedor
    window.abrirEmprendedor = function(id) {
      const toolId = id.replace('modal-','')
      if (_estaEnMant(toolId) && !esAdmin) {
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
