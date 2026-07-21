// ═══════════════════════════════════════════════════
// fotoproducto.js — La Madriguera
// ═══════════════════════════════════════════════════

    //  FOTO DE PRODUCTO — compositor
    // ══════════════════════════════════════════
    ;(function() {
      // Estado
      let fotoOrigImg   = null   // HTMLImageElement original
      let fotoRecortada = null   // ImageData recortada (sin fondo)
      let fotoBgImg     = null   // HTMLImageElement fondo seleccionado
      let fotoFondos    = []     // URLs de fondos cargados desde Supabase
      let fotoPosX = 0, fotoPosY = 0
      let fotoEscala = 0.8, fotoRot = 0
      let fotoDragging = false, fotoDragStartX = 0, fotoDragStartY = 0

      const canvas  = document.getElementById('fotoCanvas')
      const ctx     = canvas.getContext('2d', { willReadFrequently: true })

      // ── Cargar fondos desde Supabase ─────────────────────────────
      // Convierte URLs de fondos de GitHub Pages a raw.githubusercontent.com para evitar CORS
      function normalizarUrlFondo(url) {
        if (!url) return url
        // lamadriguera.site/fondos/X → raw.githubusercontent.com/.../fondos/X
        if (url.includes('lamadriguera.site/fondos/')) {
          const archivo = url.split('/fondos/').pop()
          return 'https://raw.githubusercontent.com/rabbit-3d/rabbit-3d.github.io/main/fondos/' + archivo
        }
        // rabbit-3d.github.io/fondos/X → raw.githubusercontent.com/.../fondos/X
        if (url.includes('rabbit-3d.github.io/fondos/')) {
          const archivo = url.split('/fondos/').pop()
          return 'https://raw.githubusercontent.com/rabbit-3d/rabbit-3d.github.io/main/fondos/' + archivo
        }
        return url
      }

      async function cargarFotoFondos() {
        try {
          const { data, error } = await supabase.from('media')
            .select('tipo,url').like('tipo','foto-fondo-%')
          if (error || !data) return
          let fondos = data.map(r => normalizarUrlFondo(r.url)).filter(Boolean)
          // Aplicar orden guardado
          const orderRes = await supabase.from('media').select('nombre').eq('tipo','foto-fondos-order').maybeSingle()
          if (orderRes.data && orderRes.data.nombre) {
            try {
              const order = JSON.parse(orderRes.data.nombre)
              const map = {}
              data.forEach(r => { map[r.tipo] = normalizarUrlFondo(r.url) })
              const ordered = order.map(t => map[t]).filter(Boolean)
              // Agregar fondos sin orden al final
              data.forEach(r => { if (!order.includes(r.tipo) && r.url) ordered.push(normalizarUrlFondo(r.url)) })
              fondos = ordered
            } catch(e) {}
          }
          fotoFondos = fondos
          renderFondosGrid()
        } catch(e) { console.warn('cargarFotoFondos:', e) }
      }

      function renderFondosGrid() {
        const grid   = document.getElementById('fotoFondosGrid')
        const verBtn = document.getElementById('fotoVerMasFondos')
        if (!grid) return
        if (!fotoFondos.length) {
          grid.innerHTML = '<p style="color:var(--muted);font-size:.78rem">El administrador aún no cargó fondos. Volvé pronto.</p>'
          if (verBtn) verBtn.style.display = 'none'
          return
        }
        grid.innerHTML = ''
        grid.classList.remove('foto-fondos-grid--expanded')
        fotoFondos.forEach((url, i) => {
          const btn = document.createElement('div')
          btn.className = 'foto-fondo-thumb' + (i === 0 ? ' foto-fondo-thumb--active' : '')
          btn.style.backgroundImage = `url("${url}")`
          btn.addEventListener('click', () => {
            document.querySelectorAll('.foto-fondo-thumb').forEach(b => b.classList.remove('foto-fondo-thumb--active'))
            btn.classList.add('foto-fondo-thumb--active')
            const img = new Image(); img.crossOrigin = 'anonymous'
            img.onload = () => { fotoSetBgImg(img) }
            img.src = url
          })
          grid.appendChild(btn)
          if (i === 0) {
            const img = new Image(); img.crossOrigin = 'anonymous'
            img.onload = () => { if (!fotoBgImg && !fotoBgColor) fotoSetBgImg(img) }
            img.src = url
          }
        })
        // Mostrar botón "Ver más" solo si hay más de una fila
        if (verBtn) {
          const needsMore = fotoFondos.length > 4
          verBtn.style.display = needsMore ? 'flex' : 'none'
          let expanded = false
          verBtn.onclick = () => {
            expanded = !expanded
            grid.classList.toggle('foto-fondos-grid--expanded', expanded)
            verBtn.innerHTML = expanded
              ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="18 15 12 9 6 15"/></svg> Ver menos'
              : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg> Ver todos los fondos (' + fotoFondos.length + ')'
          }
          verBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg> Ver todos los fondos (' + fotoFondos.length + ')'
        }
      }

      // ── Upload zona producto ──────────────────────────────────────
      const uploadZone = document.getElementById('fotoUploadZone')
      const fileInput  = document.getElementById('fotoProductoFile')

      uploadZone.addEventListener('click', () => fileInput.click())
      uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('foto-drag') })
      uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('foto-drag'))
      uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('foto-drag'); fotoCargar(e.dataTransfer.files[0]) })
      fileInput.addEventListener('change', e => fotoCargar(e.target.files[0]))

      function fotoCargar(file) {
        if (!file) return
        // Validar formato
        const validTypes = ['image/jpeg','image/jpg','image/png']
        if (!validTypes.includes(file.type) && !file.name.match(/\.(jpe?g|png)$/i)) {
          const zone  = document.getElementById('fotoUploadZone')
          const inner = document.getElementById('fotoUploadInner')
          zone.style.borderColor = '#f87171'
          zone.style.background  = 'rgba(248,113,113,.05)'
          inner.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:.5rem;padding:1.5rem;pointer-events:none">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="1.5" width="36" height="36"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p style="margin:0;font-size:.9rem;font-weight:700;color:#f87171;font-family:var(--font-head)">FORMATO NO VÁLIDO</p>
              <p style="margin:0;font-size:.78rem;color:var(--text)">"${file.name}"</p>
              <p style="margin:0;font-size:.72rem;color:var(--muted)">Usá JPG o PNG · Hacé clic para intentar de nuevo</p>
            </div>`
          setTimeout(() => {
            zone.style.borderColor = ''
            zone.style.background  = ''
            inner.innerHTML = `
              <div style="display:flex;flex-direction:column;align-items:center;gap:.5rem;pointer-events:none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32" style="color:var(--cyan);opacity:.7"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span style="font-size:.8rem;font-weight:600;color:var(--text)">Clic o arrastrá tu imagen</span>
                <span style="font-size:.7rem;color:var(--muted)">JPG o PNG</span>
              </div>`
          }, 3000)
          return
        }
        // Mostrar estado de carga prominente
        const zone = document.getElementById('fotoUploadZone')
        const inner = document.getElementById('fotoUploadInner')
        zone.style.minHeight = '140px'
        zone.style.borderColor = 'var(--cyan)'
        zone.style.background = 'rgba(21,154,156,.06)'
        inner.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;gap:.75rem;padding:1.5rem;pointer-events:none">
            <svg viewBox="0 0 24 24" fill="none" stroke="#159A9C" stroke-width="2" width="44" height="44" style="animation:potencSpin .8s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <div style="text-align:center">
              <p style="margin:0;font-size:1rem;font-weight:700;color:var(--cyan);font-family:var(--font-head);letter-spacing:.05em">PROCESANDO IMAGEN</p>
              <p style="margin:.3rem 0 0;font-size:.78rem;color:var(--text)">Cargando modelo BiRefNet lite...</p>
              <p style="margin:.2rem 0 0;font-size:.7rem;color:var(--muted)">${file.name}</p>
            </div>
          </div>`

        const reader = new FileReader()
        reader.onload = e => {
          const img = new Image()
          img.onload = () => {
            fotoOrigImg = img
            // Actualizar mensaje — ahora esperando API
            inner.innerHTML = `
              <div style="display:flex;flex-direction:column;align-items:center;gap:.75rem;padding:1.5rem;pointer-events:none">
                <svg viewBox="0 0 24 24" fill="none" stroke="#159A9C" stroke-width="2" width="44" height="44" style="animation:potencSpin .8s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                <div style="text-align:center">
                  <p style="margin:0;font-size:1rem;font-weight:700;color:var(--cyan);font-family:var(--font-head);letter-spacing:.05em">REMOVIENDO FONDO</p>
                  <p style="margin:.3rem 0 0;font-size:.78rem;color:var(--text)">BiRefNet lite procesando tu foto...</p>
                  <p style="margin:.2rem 0 0;font-size:.7rem;color:var(--muted)">Alta calidad · 100% local · Sin límites</p>
                </div>
              </div>`
            document.getElementById('fotoPaso2').style.display = 'block'
            fotoRecortarAuto()
          }
          img.onerror = () => {
            zone.style.borderColor = '#f87171'
            zone.style.background = 'rgba(248,113,113,.05)'
            inner.innerHTML = `
              <div style="display:flex;flex-direction:column;align-items:center;gap:.5rem;padding:1.5rem;pointer-events:none">
                <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="1.5" width="36" height="36"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <p style="margin:0;font-size:.85rem;font-weight:600;color:#f87171">Error al cargar la imagen</p>
                <p style="margin:0;font-size:.72rem;color:var(--muted)">Hacé clic para intentar de nuevo</p>
              </div>`
          }
          img.src = e.target.result
        }
        reader.readAsDataURL(file)
      }

      // ── Remoción de fondo: BiRefNet lite (local) + remove.bg API (múltiples keys) ──
      let _rmbgModel      = null
      let _rmbgProcessor  = null
      let _rmbgLoading    = false
      let _rmbgLoaded     = false
      let _rembgMotor     = 'birefnet'  // 'birefnet' | 'removebg'
      let _rembgKeys      = []          // [{id, tipo, key, credits, nombre}]
      let _rembgKeyActivo = 0

      window._cargarConfigMotor = async function() {
        try {
          const { data } = await supabase.from('media').select('id,tipo,url,nombre')
            .or('tipo.eq.config-rembg-motor,tipo.like.config-rembg-key-%')
          if (!data) return
          _rembgKeys = []
          data.forEach(r => {
            if (r.tipo === 'config-rembg-motor') _rembgMotor = r.url || 'birefnet'
            if (r.tipo.startsWith('config-rembg-key-')) {
              const parts = (r.url || '').split('|')
              _rembgKeys.push({ id: r.id, tipo: r.tipo, key: parts[0]||'', credits: parts[1]!==undefined?parseInt(parts[1]):null, nombre: r.nombre||'' })
            }
          })
          _rembgKeys.sort((a,b) => a.tipo.localeCompare(b.tipo))
          _rembgKeyActivo = Math.max(0, _rembgKeys.findIndex(k => k.credits===null||k.credits>0))
        } catch(e) {}
      }
      window._cargarConfigMotor()

      async function _callRemoveBg(blob) {
        if (!_rembgKeys.length) throw new Error('No hay API keys configuradas. Configurá una en Motor Fondo.')
        let lastErr = null
        for (let attempt = 0; attempt < _rembgKeys.length; attempt++) {
          const idx = (_rembgKeyActivo + attempt) % _rembgKeys.length
          const k = _rembgKeys[idx]
          if (!k.key) continue
          try {
            const fd = new FormData()
            fd.append('image_file', blob, 'image.png')
            fd.append('size', 'auto')
            const res = await fetch('https://api.remove.bg/v1.0/removebg', { method:'POST', headers:{'X-Api-Key':k.key}, body:fd })
            if (res.status === 402) {
              k.credits = 0
              await supabase.from('media').update({ url: k.key+'|0' }).eq('id', k.id).catch(()=>{})
              lastErr = new Error('Sin créditos en key "'+(k.nombre||'#'+(idx+1))+'"')
              continue
            }
            if (!res.ok) { const e=await res.json().catch(()=>{}); throw new Error((e?.errors?.[0]?.title)||'Error '+res.status) }
            const rem = res.headers.get('X-Credits-Remaining')
            if (rem !== null) {
              k.credits = parseInt(rem)
              _rembgKeyActivo = idx
              await supabase.from('media').update({ url: k.key+'|'+k.credits }).eq('id', k.id).catch(()=>{})
              if (esAdmin && k.credits <= 5) _alertaCreditosBajos(k, idx)
            }
            return await res.blob()
          } catch(e) { lastErr = e }
        }
        throw lastErr || new Error('Todas las API keys fallaron')
      }

      function _alertaCreditosBajos(k, idx) {
        const ex = document.getElementById('rembg-alert-low'); if (ex) ex.remove()
        const div = document.createElement('div')
        div.id = 'rembg-alert-low'
        div.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:99999;background:#1a0a00;border:2px solid #f59e0b;border-radius:12px;padding:1rem 1.2rem;max-width:300px;box-shadow:0 4px 24px rgba(0,0,0,.5)'
        const h = []
        h.push('<div style="display:flex;align-items:flex-start;gap:.6rem"><span style="font-size:1.2rem">&#9888;</span><div>')
        h.push('<p style="font-size:.8rem;font-weight:700;color:#f59e0b;margin:0 0 .2rem">Key "'+(k.nombre||'#'+(idx+1))+'" con '+k.credits+' crédito'+(k.credits===1?'':'s')+' restante'+(k.credits===1?'':'s')+'</p>')
        h.push('<p style="font-size:.72rem;color:#fde68a;margin:0 0 .5rem">Configurá otra key antes de que se agote.</p>')
        h.push('<button id="rembg-alert-cfg" style="background:#f59e0b;color:#000;border:none;border-radius:6px;padding:.25rem .7rem;font-size:.72rem;font-weight:700;cursor:pointer;margin-right:.4rem">Configurar</button>')
        h.push('<button id="rembg-alert-close" style="background:none;border:none;color:#9ca3af;font-size:.7rem;cursor:pointer">Cerrar</button>')
        h.push('</div></div>')
        div.innerHTML = h.join('')
        div.querySelector('#rembg-alert-cfg').onclick = () => { div.remove(); window.abrirConfigMotorRembg && window.abrirConfigMotorRembg() }
        div.querySelector('#rembg-alert-close').onclick = () => div.remove()
        document.body.appendChild(div)
        setTimeout(() => { if(div.parentNode) div.remove() }, 15000)
      }

      const _TRANSFORMERS_CDNS = [
        'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/dist/transformers.min.js',
        'https://unpkg.com/@huggingface/transformers@3.4.0/dist/transformers.min.js'
      ]

      function _cargarScript(url, timeout = 30000) {
        return new Promise((resolve, reject) => {
          const s = document.createElement('script')
          s.src = url
          const t = setTimeout(() => { s.remove(); reject(new Error('timeout')) }, timeout)
          s.onload  = () => { clearTimeout(t); resolve() }
          s.onerror = () => { clearTimeout(t); s.remove(); reject(new Error('error CDN')) }
          document.head.appendChild(s)
        })
      }

      // Transformers.js se carga como módulo ESM inyectando un <script type="module">
      // que expone AutoModel/AutoProcessor/RawImage en window._tf
      function _inyectarModuloTransformers(onProgress) {
        return new Promise((resolve) => {
          if (window._tf) { resolve(true); return }
          if (onProgress) onProgress('Descargando modelo IA (~45MB, solo la primera vez)...')
          const s = document.createElement('script')
          s.type = 'module'
          // IIFE async — necesario porque await y return desnudos no son válidos en top-level de módulo inyectado
          s.textContent = `(async () => {
            const CDNS = [
              'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/dist/transformers.min.js',
              'https://unpkg.com/@huggingface/transformers@3.4.0/dist/transformers.min.js'
            ]
            let mod = null
            for (const cdn of CDNS) {
              try { mod = await import(cdn); break } catch(e) { /* probar siguiente */ }
            }
            if (!mod) { window._tfError = true; return }
            const { AutoModel, AutoProcessor, RawImage, env } = mod
            env.allowLocalModels = false
            if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
              env.backends.onnx.wasm.proxy = true
            }
            window._tf = { AutoModel, AutoProcessor, RawImage, env }
          })()`
          // El módulo no dispara onload — usamos poll para detectar window._tf
          document.head.appendChild(s)
          const t = Date.now()
          const poll = setInterval(() => {
            if (window._tf)          { clearInterval(poll); resolve(true)  }
            if (window._tfError)     { clearInterval(poll); resolve(false) }
            if (Date.now()-t > 30000){ clearInterval(poll); resolve(false) }
          }, 200)
        })
      }

      async function cargarBgRemoval(onProgress) {
        if (_rmbgLoaded) return true
        if (_rmbgLoading) {
          return new Promise(res => {
            const check = setInterval(() => {
              if (!_rmbgLoading) { clearInterval(check); res(_rmbgLoaded) }
            }, 300)
          })
        }
        _rmbgLoading = true
        try {
          const ok = await _inyectarModuloTransformers(onProgress)
          if (!ok || !window._tf) throw new Error('No se pudo cargar Transformers.js')

          const { AutoModel, AutoProcessor, env } = window._tf
          if (onProgress) onProgress('Cargando modelo BiRefNet lite...')

          // Silenciar warnings esperados de BiRefNet lite durante la carga
          const _origWarn = console.warn
          console.warn = (...args) => {
            const msg = args[0] || ''
            if (typeof msg === 'string' && (
              msg.includes('Unknown model class') ||
              msg.includes('dtype not specified') ||
              msg.includes('willReadFrequently')
            )) return
            _origWarn.apply(console, args)
          }
          _rmbgModel = await AutoModel.from_pretrained('onnx-community/BiRefNet_lite', {
            config: { model_type: 'custom' },
            dtype: 'fp32'
          })
          _rmbgProcessor = await AutoProcessor.from_pretrained('onnx-community/BiRefNet_lite', {
            config: {
              do_normalize: true, do_pad: false, do_rescale: true, do_resize: true,
              image_mean: [0.5, 0.5, 0.5], image_std: [1, 1, 1],
              feature_extractor_type: 'ImageFeatureExtractor',
              resample: 2, rescale_factor: 0.00392156862745098,
              size: { width: 1024, height: 1024 }
            }
          })
          console.warn = _origWarn  // restaurar
          _rmbgLoaded = true
          _rmbgLoading = false
          return true
        } catch(e) {
          console.warn('BiRefNet lite no se pudo cargar:', e)
          _rmbgLoading = false
          return false
        }
      }

      // Pre-procesa la imagen al tamaño óptimo para el modelo (max 1024px)
      function fotoPreprocessBlob(img) {
        const MAX = 1024
        const ratio = Math.min(1, MAX / Math.max(img.width, img.height))
        const w = Math.round(img.width * ratio)
        const h = Math.round(img.height * ratio)
        const tc = document.createElement('canvas')
        tc.width = w; tc.height = h
        const ctx = tc.getContext('2d', { willReadFrequently: true })
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, w, h)
        return new Promise(res => tc.toBlob(res, 'image/png'))
      }

      // Post-procesa el ImageData: pipeline avanzado 6 pasos
      function fotoPostprocess(imageData, origImg) {
        const data = imageData.data
        const w = imageData.width
        const h = imageData.height

        // ── Detectar color del fondo real (sampleo de bordes de la imagen original) ──
        let bgR=200, bgG=200, bgB=200, bgUniform=false
        if (origImg) {
          const sc = document.createElement('canvas')
          sc.width = w; sc.height = h
          const sx = sc.getContext('2d', { willReadFrequently: true })
          sx.drawImage(origImg, 0, 0, w, h)
          const ed = sx.getImageData(0, 0, w, h).data
          const bw = Math.max(4, Math.round(Math.min(w,h)*0.04))
          let sr=0,sg=0,sb=0,sn=0, sr2=0,sg2=0,sb2=0
          for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
            if (x<bw||x>=w-bw||y<bw||y>=h-bw) {
              const i=(y*w+x)*4; sr+=ed[i]; sg+=ed[i+1]; sb+=ed[i+2]; sn++
              sr2+=ed[i]*ed[i]; sg2+=ed[i+1]*ed[i+1]; sb2+=ed[i+2]*ed[i+2]
            }
          }
          if (sn>0) {
            bgR=sr/sn; bgG=sg/sn; bgB=sb/sn
            // Calcular varianza — si es baja, el fondo es uniforme
            const varR=sr2/sn-bgR*bgR, varG=sg2/sn-bgG*bgG, varB=sb2/sn-bgB*bgB
            bgUniform = (varR+varG+varB)/3 < 400  // varianza baja = fondo sólido
          }
        }

        // ── Copiar alpha del modelo como base ──────────────────────────────────
        const alpha = new Uint8Array(w * h)
        for (let i=0;i<w*h;i++) alpha[i]=data[i*4+3]

        // ── Paso 1: Refinar zonas ambiguas usando color del fondo ──────────────
        // Solo si el fondo es uniforme (evita falsos positivos con fondos complejos)
        if (bgUniform && origImg) {
          const sc2 = document.createElement('canvas')
          sc2.width=w; sc2.height=h
          const sx2 = sc2.getContext('2d', { willReadFrequently: true })
          sx2.drawImage(origImg, 0, 0, w, h)
          const orig = sx2.getImageData(0,0,w,h).data
          // Umbral de similitud al fondo: ajusta según uniformidad
          const thr = bgUniform ? 55 : 35
          for (let i=0;i<w*h;i++) {
            const a=alpha[i]
            if (a > 20 && a < 220) {  // zona ambigua
              const r=orig[i*4],g=orig[i*4+1],b=orig[i*4+2]
              const dist=Math.sqrt((r-bgR)**2+(g-bgG)**2+(b-bgB)**2)
              if (dist < thr) {
                // Muy parecido al fondo → transparente, ponderado por similitud y alpha del modelo
                alpha[i] = Math.round(a * Math.max(0, (dist-10)/(thr-10)))
              }
            }
          }
        }

        // ── Paso 2: Binarización suave de extremos ─────────────────────────────
        for (let i=0;i<w*h;i++) {
          if (alpha[i]<20)       alpha[i]=0
          else if (alpha[i]>235) alpha[i]=255
        }

        // ── Paso 3: Flood-fill exterior — elimina fondo conectado al borde ─────
        // Umbral adaptativo: más agresivo si fondo uniforme
        const ffThr = bgUniform ? 100 : 60
        const visited = new Uint8Array(w*h)
        const q = []
        const push = (idx) => { if(!visited[idx] && alpha[idx]<ffThr){visited[idx]=1;q.push(idx)} }
        for (let x=0;x<w;x++) { push(x); push((h-1)*w+x) }
        for (let y=1;y<h-1;y++) { push(y*w); push(y*w+w-1) }
        let qi=0
        while (qi<q.length) {
          const px=q[qi++]; const x=px%w, y=Math.floor(px/w)
          for (const nb of [px-1,px+1,px-w,px+w]) {
            if (nb>=0&&nb<w*h&&!visited[nb]&&alpha[nb]<ffThr){visited[nb]=1;q.push(nb)}
          }
        }
        for (let i=0;i<w*h;i++) if(visited[i]) alpha[i]=0

        // ── Paso 4: Morphological closing — cierra huecos internos pequeños ────
        // Dilación seguida de erosión para rellenar huecos de fondo dentro del sujeto
        const CLOSE_R = 2
        const dilated = new Uint8Array(alpha)
        for (let y=CLOSE_R;y<h-CLOSE_R;y++) for (let x=CLOSE_R;x<w-CLOSE_R;x++) {
          if (alpha[y*w+x]===0) {
            let hasOpaque=false
            outer: for (let dy=-CLOSE_R;dy<=CLOSE_R;dy++) for (let dx=-CLOSE_R;dx<=CLOSE_R;dx++) {
              if (alpha[(y+dy)*w+(x+dx)]>180){hasOpaque=true;break outer}
            }
            if (hasOpaque) dilated[y*w+x]=180  // dilatar
          }
        }
        // Erosión — volver atrás solo los que tienen vecinos opacos reales
        for (let y=CLOSE_R;y<h-CLOSE_R;y++) for (let x=CLOSE_R;x<w-CLOSE_R;x++) {
          if (dilated[y*w+x]===180) {
            let allOpaque=true
            outer2: for (let dy=-CLOSE_R;dy<=CLOSE_R;dy++) for (let dx=-CLOSE_R;dx<=CLOSE_R;dx++) {
              if (dilated[(y+dy)*w+(x+dx)]<100){allOpaque=false;break outer2}
            }
            // Si está rodeado de opacos → rellenar el hueco
            if (allOpaque) alpha[y*w+x]=220
          }
        }

        // ── Paso 5: Erosión de borde (eliminar halo) ──────────────────────────
        const alpha2 = new Uint8Array(alpha)
        for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++) {
          const i=y*w+x
          if (alpha[i]>0&&alpha[i]<255) {
            const mn=Math.min(alpha[i-1],alpha[i+1],alpha[i-w],alpha[i+w])
            if (mn===0) alpha2[i]=Math.round(alpha[i]*0.55)
          }
        }

        // ── Paso 6: Feathering suave de 1px ───────────────────────────────────
        for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++) {
          const i=y*w+x
          if (alpha2[i]>0&&alpha2[i]<255) {
            const sum=alpha2[i]+alpha2[(y-1)*w+x]+alpha2[(y+1)*w+x]+alpha2[y*w+x-1]+alpha2[y*w+x+1]
            alpha2[i]=Math.round(sum/5)
          }
        }

        // Aplicar alpha final
        for (let i=0;i<w*h;i++) data[i*4+3]=alpha2[i]
        return imageData
      }

      // Escala el ImageData recortado de vuelta al tamaño original
      function fotoEscalarResultado(imgData, targetW, targetH) {
        if (imgData.width === targetW && imgData.height === targetH) return imgData
        const src = document.createElement('canvas')
        src.width = imgData.width; src.height = imgData.height
        src.getContext('2d', { willReadFrequently: true }).putImageData(imgData, 0, 0)
        const dst = document.createElement('canvas')
        dst.width = targetW; dst.height = targetH
        const ctx = dst.getContext('2d', { willReadFrequently: true })
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(src, 0, 0, targetW, targetH)
        return ctx.getImageData(0, 0, targetW, targetH)
      }

      // Aplica el ImageData final al compositor
      function fotoAplicarResultado(imgData) {
        fotoRecortada = imgData
        const inner = document.getElementById('fotoUploadInner')
        const zone  = document.getElementById('fotoUploadZone')
        if (inner) {
          zone.style.minHeight = ''
          zone.style.borderColor = 'rgba(21,154,156,.5)'
          zone.style.background = 'rgba(21,154,156,.04)'
          inner.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:.5rem;padding:1rem;pointer-events:none">
              <svg viewBox="0 0 24 24" fill="none" stroke="#4ecca3" stroke-width="2" width="36" height="36"><polyline points="20 6 9 17 4 12"/></svg>
              <p style="margin:0;font-size:.9rem;font-weight:700;color:#4ecca3;font-family:var(--font-head)">¡FONDO REMOVIDO!</p>
              <p style="margin:0;font-size:.72rem;color:var(--muted)">Elegí un fondo y acomodá tu producto</p>
            </div>`
        }
        document.getElementById('fotoCompositor').style.display = 'block'
        // Mantener 1080x1080 si no hay fondo cargado — NO adoptar tamaño de la foto
        if (OUT_W === 0 || OUT_H === 0) { OUT_W = 1080; OUT_H = 1080 }
        // Si no hay fondo imagen seleccionado, resetear a 1080x1080 cuadrado
        if (!fotoBgImg) { OUT_W = 1080; OUT_H = 1080 }
        canvas.width = OUT_W; canvas.height = OUT_H
        // Escalar el producto para que entre bien en el canvas al cargar (~80%)
        const imgRatio = fotoRecortada.width / fotoRecortada.height
        const canvRatio = OUT_W / OUT_H
        if (imgRatio > canvRatio) {
          fotoEscala = (OUT_W * 0.8) / fotoRecortada.width
        } else {
          fotoEscala = (OUT_H * 0.8) / fotoRecortada.height
        }
        // Sincronizar el slider de escala
        const sliderEscala = document.getElementById('fotoEscala')
        if (sliderEscala) {
          sliderEscala.value = Math.round(fotoEscala * 100)
          const valEl = document.getElementById('fotoEscalaVal')
          if (valEl) valEl.textContent = Math.round(fotoEscala * 100) + '%'
        }
        fotoPosX = 0; fotoPosY = 0
        setTimeout(() => { fotoRender() }, 50)
        const btnRec = document.getElementById('fotoBtnRecortar')
        btnRec.textContent = '✂️ Re-recortar'
        btnRec.disabled = false
      }

      async function fotoRecortarConAPI() {
        if (!fotoOrigImg) return
        const errEl  = document.getElementById('fotoError')
        const btnRec = document.getElementById('fotoBtnRecortar')
        errEl.textContent = ''
        btnRec.disabled = true

        await window._cargarConfigMotor()

        try {
          if (_rembgMotor === 'removebg') {
            // ── remove.bg API ─────────────────────────────────────────
            btnRec.textContent = '⏳ Procesando con remove.bg...'
            const tc = document.createElement('canvas')
            tc.width = fotoOrigImg.width; tc.height = fotoOrigImg.height
            tc.getContext('2d').drawImage(fotoOrigImg, 0, 0)
            const blob = await new Promise(res => tc.toBlob(res, 'image/png'))
            const resultBlob = await _callRemoveBg(blob)
            const imgEl = new Image()
            imgEl.src = URL.createObjectURL(resultBlob)
            await new Promise(res => { imgEl.onload = res })
            const rc = document.createElement('canvas')
            rc.width = imgEl.width; rc.height = imgEl.height
            rc.getContext('2d', { willReadFrequently: true }).drawImage(imgEl, 0, 0)
            const imgData = rc.getContext('2d').getImageData(0, 0, rc.width, rc.height)
            URL.revokeObjectURL(imgEl.src)
            fotoAplicarResultado(fotoEscalarResultado(imgData, fotoOrigImg.width, fotoOrigImg.height))

          } else {
            // ── BiRefNet lite (local) ──────────────────────────────────
            btnRec.textContent = '⏳ Iniciando IA...'
            const loaded = await cargarBgRemoval((msg) => { btnRec.textContent = '⏳ ' + msg })
            if (!loaded) throw new Error('No se pudo cargar el modelo')
            btnRec.textContent = '⏳ Procesando imagen...'
            const tc = document.createElement('canvas')
            tc.width = fotoOrigImg.width; tc.height = fotoOrigImg.height
            tc.getContext('2d', { willReadFrequently: true }).drawImage(fotoOrigImg, 0, 0)
            const RawImage = window._tf?.RawImage
            const rawImg = await RawImage.fromURL(tc.toDataURL('image/png'))
            const { pixel_values } = await _rmbgProcessor(rawImg)
            const _biOut = await _rmbgModel({ input_image: pixel_values })
            const _rawMask = (_biOut.output_image ?? _biOut.output)[0]
            const _mask = _rawMask.sigmoid ? _rawMask.sigmoid() : _rawMask
            btnRec.textContent = '⏳ Refinando bordes...'
            const maskData = _mask.squeeze().tolist()
            const maskH = maskData.length, maskW = maskData[0].length
            const srcC = document.createElement('canvas')
            srcC.width = maskW; srcC.height = maskH
            srcC.getContext('2d', { willReadFrequently: true }).drawImage(fotoOrigImg, 0, 0, maskW, maskH)
            let imgData = srcC.getContext('2d').getImageData(0, 0, maskW, maskH)
            const pixels = imgData.data
            for (let y=0;y<maskH;y++) for (let x=0;x<maskW;x++) pixels[(y*maskW+x)*4+3] = Math.round(maskData[y][x]*255)
            imgData = fotoPostprocess(imgData, fotoOrigImg)
            fotoAplicarResultado(fotoEscalarResultado(imgData, fotoOrigImg.width, fotoOrigImg.height))
          }

        } catch(err) {
          console.warn('Remoción de fondo falló:', err)
          errEl.textContent = '⚠ ' + (err.message || 'Error. Usá el recorte manual.')
          document.getElementById('fotoTolRow').style.display = 'flex'
          fotoRecortarFallback()
          btnRec.textContent = '✂️ Re-recortar'
          btnRec.disabled = false
        }
      }

      // Fallback: algoritmo Canvas por si falla la API
      function fotoRecortarFallback() {
        if (!fotoOrigImg) return
        const tol = parseInt(document.getElementById('fotoTolerancia').value) || 50
        const MAX = 1000
        const ratio = Math.min(1, MAX / Math.max(fotoOrigImg.width, fotoOrigImg.height))
        const w = Math.round(fotoOrigImg.width * ratio)
        const h = Math.round(fotoOrigImg.height * ratio)
        const tc = document.createElement('canvas'); tc.width = w; tc.height = h
        const tx = tc.getContext('2d', { willReadFrequently: true })
        tx.drawImage(fotoOrigImg, 0, 0, w, h)
        const imgData = tx.getImageData(0, 0, w, h)
        const data = imgData.data, orig = new Uint8ClampedArray(data)
        const borderW = Math.max(3, Math.round(Math.min(w,h)*0.04))
        const samples = []
        for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
          if (x<borderW||x>=w-borderW||y<borderW||y>=h-borderW) {
            const i=(y*w+x)*4; samples.push([orig[i],orig[i+1],orig[i+2]])
          }
        }
        const n=samples.length
        const mR=samples.reduce((s,p)=>s+p[0],0)/n
        const mG=samples.reduce((s,p)=>s+p[1],0)/n
        const mB=samples.reduce((s,p)=>s+p[2],0)/n
        const std=Math.max(15,Math.sqrt(samples.reduce((s,p)=>s+(p[0]-mR)**2+(p[1]-mG)**2+(p[2]-mB)**2,0)/(n*3)))
        const threshold=(tol/100)*std*5
        const mask=new Uint8Array(w*h)
        const q=new Int32Array(w*h*2); let qH=0,qT=0
        for(let x=0;x<w;x++){q[qT++]=x;mask[x]=1;q[qT++]=(h-1)*w+x;mask[(h-1)*w+x]=1}
        for(let y=1;y<h-1;y++){q[qT++]=y*w;mask[y*w]=1;q[qT++]=y*w+w-1;mask[y*w+w-1]=1}
        while(qH<qT){
          const px=q[qH++]; const x=px%w,y=Math.floor(px/w)
          for(const nb of[px-1,px+1,px-w,px+w]){
            if(nb<0||nb>=w*h||mask[nb])continue
            const dr=orig[nb*4]-mR,dg=orig[nb*4+1]-mG,db=orig[nb*4+2]-mB
            if(Math.sqrt(dr*dr+dg*dg+db*db)<threshold){mask[nb]=1;q[qT++]=nb}
            else mask[nb]=2
          }
        }
        for(let i=0;i<w*h;i++) if(mask[i]===1) data[i*4+3]=0
        fotoRecortada=imgData
        document.getElementById('fotoCompositor').style.display='block'
        if (OUT_W === 0 || OUT_H === 0) { OUT_W = 1080; OUT_H = 1080 }
        canvas.width = OUT_W; canvas.height = OUT_H
        fotoPosX=0;fotoPosY=0
        setTimeout(() => { fotoRender() }, 50)
      }

      function fotoRecortarAuto() {
        fotoRecortarConAPI()
      }

      // ── Render compositor ─────────────────────────────────────────
      // OUT_W/OUT_H = tamaño final de exportación
      // El canvas siempre muestra el fondo a tamaño completo, sin bordes
      let OUT_W = 1080, OUT_H = 1080
      let fotoBgColor = null   // null = usar imagen, string = color sólido

      canvas.width = OUT_W; canvas.height = OUT_H

      function fotoSetSize(w, h) {
        OUT_W = w; OUT_H = h
        // Si hay fondo imagen, ajustar el canvas a ese ratio recortando/escalando
        if (fotoBgImg) {
          // Mantener el tamaño elegido, el fondo se estira para cubrir (cover)
          canvas.width = w; canvas.height = h
        } else {
          canvas.width = w; canvas.height = h
        }
        fotoRender()
      }

      // Cuando se selecciona una imagen de fondo, ajustar OUT_W/OUT_H a su resolución natural
      function fotoSetBgImg(img) {
        fotoBgImg = img; fotoBgColor = null
        // Por defecto adoptar el tamaño de la imagen de fondo
        OUT_W = img.width; OUT_H = img.height
        canvas.width = OUT_W; canvas.height = OUT_H
        // Sync size buttons — ninguno queda activo si el tamaño no coincide
        document.querySelectorAll('.foto-size-btn').forEach(b => {
          const match = b.dataset.w == OUT_W && b.dataset.h == OUT_H
          b.classList.toggle('foto-size-btn--active', match)
        })
        fotoRender()
      }

      // Size buttons
      document.querySelectorAll('.foto-size-btn:not(#fotoSizeLibre)').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.foto-size-btn').forEach(b => b.classList.remove('foto-size-btn--active'))
          btn.classList.add('foto-size-btn--active')
          document.getElementById('fotoSizeLibrePanel').style.display = 'none'
          fotoSetSize(parseInt(btn.dataset.w), parseInt(btn.dataset.h))
        })
      })
      document.getElementById('fotoSizeLibre').addEventListener('click', () => {
        document.querySelectorAll('.foto-size-btn').forEach(b => b.classList.remove('foto-size-btn--active'))
        document.getElementById('fotoSizeLibre').classList.add('foto-size-btn--active')
        document.getElementById('fotoSizeLibrePanel').style.display = 'flex'
        // Pre-cargar con tamaño actual
        document.getElementById('fotoLibreW').value = OUT_W
        document.getElementById('fotoLibreH').value = OUT_H
      })
      document.getElementById('fotoBtnAplicarSize').addEventListener('click', () => {
        const w = Math.max(100, Math.min(4000, parseInt(document.getElementById('fotoLibreW').value)||1080))
        const h = Math.max(100, Math.min(4000, parseInt(document.getElementById('fotoLibreH').value)||1080))
        fotoSetSize(w, h)
      })

      // Tabs imagen/color
      window.fotoSwitchTab = function(tab) {
        const isImagen = tab === 'imagen'
        document.getElementById('fotoPanelImagen').style.display = isImagen ? 'block' : 'none'
        document.getElementById('fotoPanelColor').style.display  = isImagen ? 'none'  : 'block'
        document.getElementById('fotoTabImagen').classList.toggle('foto-tab--active', isImagen)
        document.getElementById('fotoTabColor').classList.toggle('foto-tab--active', !isImagen)
        if (!isImagen) { fotoBgColor = fotoBgColor || '#ffffff'; fotoBgImg = null }
        else            { fotoBgColor = null }
        fotoRender()
      }

      // Color presets
      document.getElementById('fotoColorPresets').addEventListener('click', e => {
        const btn = e.target.closest('.foto-color-swatch')
        if (!btn) return
        document.querySelectorAll('.foto-color-swatch').forEach(b => b.classList.remove('foto-color-swatch--active'))
        btn.classList.add('foto-color-swatch--active')
        fotoBgColor = btn.dataset.color
        document.getElementById('fotoColorCustom').value = fotoBgColor
        fotoBgImg = null
        fotoRender()
      })
      document.getElementById('fotoColorCustom').addEventListener('input', function() {
        document.querySelectorAll('.foto-color-swatch').forEach(b => b.classList.remove('foto-color-swatch--active'))
        fotoBgColor = this.value
        fotoBgImg = null
        fotoRender()
      })

      function fotoRender() {
        if (!fotoRecortada) return

        // ── Leer todos los ajustes ────────────────────────────────────
        const brillo      = parseInt(document.getElementById('fotoBrillo')?.value     || 0)
        const contraste   = parseInt(document.getElementById('fotoContraste')?.value  || 0)
        const saturacion  = parseInt(document.getElementById('fotoSaturacion')?.value || 0)
        const tinte       = parseInt(document.getElementById('fotoTinte')?.value      || 0) / 100  // -0.4 a +0.4
        const bordes      = parseInt(document.getElementById('fotoBordes')?.value     || 0)
        const opacidad    = parseInt(document.getElementById('fotoOpacidad')?.value   || 100) / 100
        const sombraOpac  = parseInt(document.getElementById('fotoSombraOpac')?.value || 0) / 100
        const sombraBlur  = parseInt(document.getElementById('fotoSombraBlur')?.value || 20)
        const sombraOff   = parseInt(document.getElementById('fotoSombraOff')?.value  || 10)
        const vignet      = parseInt(document.getElementById('fotoVignet')?.value     || 0) / 100
        const bgBlur      = parseInt(document.getElementById('fotoBgBlur')?.value     || 0)

        ctx.clearRect(0, 0, OUT_W, OUT_H)

        // ── Fondo con desenfoque opcional ─────────────────────────────
        ctx.save()
        if (bgBlur > 0) ctx.filter = `blur(${bgBlur}px)`
        if (fotoBgColor) {
          ctx.fillStyle = fotoBgColor
          ctx.fillRect(0, 0, OUT_W, OUT_H)
        } else if (fotoBgImg) {
          const bRatio = fotoBgImg.width / fotoBgImg.height
          const cRatio = OUT_W / OUT_H
          let sx = 0, sy = 0, sw = fotoBgImg.width, sh = fotoBgImg.height
          if (bRatio > cRatio) { sw = fotoBgImg.height * cRatio; sx = (fotoBgImg.width - sw) / 2 }
          else                 { sh = fotoBgImg.width / cRatio;  sy = (fotoBgImg.height - sh) / 2 }
          ctx.drawImage(fotoBgImg, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H)
        } else {
          ctx.fillStyle = '#e8e8e8'; ctx.fillRect(0, 0, OUT_W, OUT_H)
        }
        ctx.filter = 'none'
        ctx.restore()

        // ── Extraer color promedio del fondo para tinte ambiental ─────
        let tintR = 128, tintG = 128, tintB = 128
        if (tinte !== 0 && (fotoBgImg || fotoBgColor)) {
          if (fotoBgColor) {
            const hex = fotoBgColor.replace('#','')
            tintR = parseInt(hex.slice(0,2),16) || 0
            tintG = parseInt(hex.slice(2,4),16) || 0
            tintB = parseInt(hex.slice(4,6),16) || 0
          } else {
            // Samplear esquinas del fondo (evitar el centro donde puede estar el producto)
            const pts = [[10,10],[OUT_W-60,10],[10,OUT_H-60],[OUT_W-60,OUT_H-60]]
            let sr=0,sg=0,sb=0,sn=0
            pts.forEach(function(pt) { var px=pt[0],py=pt[1];
              try {
                const s = ctx.getImageData(px, py, 50, 50).data
                for(let i=0;i<s.length;i+=4){sr+=s[i];sg+=s[i+1];sb+=s[i+2];sn++}
              } catch(e){}
            })
            if (sn > 0) { tintR=sr/sn; tintG=sg/sn; tintB=sb/sn }
          }
        }

        // ── Preparar producto con ajustes de imagen ───────────────────
        const tmp = document.createElement('canvas')
        tmp.width = fotoRecortada.width; tmp.height = fotoRecortada.height
        const tmpCtx = tmp.getContext('2d', { willReadFrequently: true })
        tmpCtx.putImageData(fotoRecortada, 0, 0)

        // Aplicar brillo/contraste/saturación/tinte via pixel manipulation
        if (brillo !== 0 || contraste !== 0 || saturacion !== 0 || tinte !== 0) {
          const imgd = tmpCtx.getImageData(0, 0, tmp.width, tmp.height)
          const d    = imgd.data
          const cf   = contraste !== 0 ? (259*(contraste+255))/(255*(259-contraste)) : 1
          for (let i = 0; i < d.length; i += 4) {
            if (d[i+3] === 0) continue
            let r = d[i], g = d[i+1], b = d[i+2]
            // Brillo — clamp inmediato
            if (brillo !== 0) {
              r = Math.max(0, Math.min(255, r + brillo))
              g = Math.max(0, Math.min(255, g + brillo))
              b = Math.max(0, Math.min(255, b + brillo))
            }
            // Contraste — clamp inmediato
            if (contraste !== 0) {
              r = Math.max(0, Math.min(255, cf*(r-128)+128))
              g = Math.max(0, Math.min(255, cf*(g-128)+128))
              b = Math.max(0, Math.min(255, cf*(b-128)+128))
            }
            // Saturación — clamp inmediato
            if (saturacion !== 0) {
              const gray = 0.299*r + 0.587*g + 0.114*b
              const sf   = 1 + saturacion/100
              r = Math.max(0, Math.min(255, gray + sf*(r-gray)))
              g = Math.max(0, Math.min(255, gray + sf*(g-gray)))
              b = Math.max(0, Math.min(255, gray + sf*(b-gray)))
            }
            // Tinte ambiental — mezcla el color del fondo al producto
            if (tinte > 0) {
              r = r*(1-tinte) + tintR*tinte
              g = g*(1-tinte) + tintG*tinte
              b = b*(1-tinte) + tintB*tinte
            }
            d[i]   = Math.max(0, Math.min(255, r))
            d[i+1] = Math.max(0, Math.min(255, g))
            d[i+2] = Math.max(0, Math.min(255, b))
          }
          tmpCtx.putImageData(imgd, 0, 0)
        }

        // ── Posición y transformaciones ───────────────────────────────
        const prodW = tmp.width  * fotoEscala
        const prodH = tmp.height * fotoEscala
        const cx    = OUT_W / 2 + fotoPosX
        const cy    = OUT_H / 2 + fotoPosY

        // ── Sombra proyectada ─────────────────────────────────────────
        if (sombraOpac > 0) {
          // Crear silhoueta negra del producto
          const shadowC = document.createElement('canvas')
          shadowC.width = fotoRecortada.width; shadowC.height = fotoRecortada.height
          const sCtx = shadowC.getContext('2d', { willReadFrequently: true })
          sCtx.putImageData(fotoRecortada, 0, 0)
          // Colorear todo negro manteniendo alpha
          sCtx.globalCompositeOperation = 'source-in'
          sCtx.fillStyle = 'rgba(0,0,0,1)'
          sCtx.fillRect(0, 0, shadowC.width, shadowC.height)

          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(fotoRot * Math.PI / 180)
          ctx.globalAlpha = sombraOpac
          ctx.filter = `blur(${sombraBlur}px)`
          // Desplazar hacia abajo y un poco a la derecha
          ctx.drawImage(shadowC, -prodW/2 + sombraOff*0.3, -prodH/2 + sombraOff, prodW, prodH)
          ctx.filter = 'none'
          ctx.globalAlpha = 1
          ctx.restore()
        }

        // ── Producto con suavizado de bordes y opacidad ───────────────
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(fotoRot * Math.PI / 180)
        ctx.globalAlpha = opacidad
        if (bordes > 0) {
          // Suavizar bordes con gradiente en máscara
          const offC = document.createElement('canvas')
          offC.width = prodW + bordes*2; offC.height = prodH + bordes*2
          const offCtx = offC.getContext('2d', { willReadFrequently: true })
          offCtx.drawImage(tmp, bordes, bordes, prodW, prodH)
          // Aplicar blur para suavizar contorno
          const blurC = document.createElement('canvas')
          blurC.width = prodW; blurC.height = prodH
          const blurCtx = blurC.getContext('2d', { willReadFrequently: true })
          blurCtx.filter = `blur(${bordes}px)`
          blurCtx.drawImage(offC, -bordes, -bordes)
          blurCtx.filter = 'none'
          ctx.drawImage(blurC, -prodW/2, -prodH/2)
        } else {
          ctx.drawImage(tmp, -prodW/2, -prodH/2, prodW, prodH)
        }
        ctx.globalAlpha = 1
        ctx.restore()

        // ── Viñeta sobre todo ─────────────────────────────────────────
        if (vignet > 0) {
          const grad = ctx.createRadialGradient(
            OUT_W/2, OUT_H/2, Math.min(OUT_W,OUT_H)*0.3,
            OUT_W/2, OUT_H/2, Math.max(OUT_W,OUT_H)*0.8
          )
          grad.addColorStop(0, 'rgba(0,0,0,0)')
          grad.addColorStop(1, `rgba(0,0,0,${vignet})`)
          ctx.fillStyle = grad
          ctx.fillRect(0, 0, OUT_W, OUT_H)
        }
      }

      // ── Controles sliders ─────────────────────────────────────────
      document.getElementById('fotoEscala').addEventListener('input', function() {
        fotoEscala = parseInt(this.value) / 100
        document.getElementById('fotoEscalaVal').textContent = this.value + '%'
        fotoRender()
      })
      document.getElementById('fotoRotacion').addEventListener('input', function() {
        fotoRot = parseInt(this.value)
        document.getElementById('fotoRotVal').textContent = this.value + '°'
        fotoRender()
      })
      document.getElementById('fotoTolerancia').addEventListener('input', function() {
        document.getElementById('fotoTolVal').textContent = this.value
      })
      // Nuevos ajustes — todos llaman fotoRender al cambiar
      ;[
        ['fotoBrillo','fotoBrilloVal',''],
        ['fotoContraste','fotoContrasteVal',''],
        ['fotoSaturacion','fotoSaturacionVal',''],
        ['fotoTinte','fotoTinteVal','%'],
        ['fotoBordes','fotoBordesVal','px'],
        ['fotoOpacidad','fotoOpacidadVal','%'],
        ['fotoSombraOpac','fotoSombraOpacVal','%'],
        ['fotoSombraBlur','fotoSombraBlurVal','px'],
        ['fotoSombraOff','fotoSombraOffVal','px'],
        ['fotoVignet','fotoVignetVal','%'],
        ['fotoBgBlur','fotoBgBlurVal','px'],
      ].forEach(function(p) { var id=p[0],valId=p[1],suffix=p[2],showSign=p[3];
        const el = document.getElementById(id)
        if (!el) return
        el.addEventListener('input', function() {
          const v = parseInt(this.value)
          const label = showSign && v > 0 ? '+' + v + suffix : v + suffix
          document.getElementById(valId).textContent = label
          fotoRender()
        })
      })

      // ── Drag para mover el producto ───────────────────────────────
      canvas.addEventListener('mousedown', e => {
        fotoDragging = true
        const r = canvas.getBoundingClientRect()
        const scaleX = OUT_W / r.width
        fotoDragStartX = e.clientX * scaleX - fotoPosX
        fotoDragStartY = e.clientY * scaleX - fotoPosY
        canvas.style.cursor = 'grabbing'
      })
      canvas.addEventListener('mousemove', e => {
        if (!fotoDragging) return
        const r = canvas.getBoundingClientRect()
        const scaleX = OUT_W / r.width
        fotoPosX = e.clientX * scaleX - fotoDragStartX
        fotoPosY = e.clientY * scaleX - fotoDragStartY
        fotoRender()
      })
      canvas.addEventListener('mouseup',    () => { fotoDragging = false; canvas.style.cursor = 'grab' })
      canvas.addEventListener('mouseleave', () => { fotoDragging = false; canvas.style.cursor = 'grab' })

      // Touch drag
      canvas.addEventListener('touchstart', e => {
        const t = e.touches[0]
        fotoDragging = true
        const r = canvas.getBoundingClientRect()
        const scaleX = OUT_W / r.width
        fotoDragStartX = t.clientX * scaleX - fotoPosX
        fotoDragStartY = t.clientY * scaleX - fotoPosY
        e.preventDefault()
      }, { passive: false })
      canvas.addEventListener('touchmove', e => {
        if (!fotoDragging) return
        const t = e.touches[0]
        const r = canvas.getBoundingClientRect()
        const scaleX = OUT_W / r.width
        fotoPosX = t.clientX * scaleX - fotoDragStartX
        fotoPosY = t.clientY * scaleX - fotoDragStartY
        fotoRender(); e.preventDefault()
      }, { passive: false })
      canvas.addEventListener('touchend', () => { fotoDragging = false })

      // Ruedita para escalar
      canvas.addEventListener('wheel', e => {
        e.preventDefault()
        fotoEscala = Math.max(0.05, Math.min(3, fotoEscala - e.deltaY * 0.001))
        document.getElementById('fotoEscala').value = Math.round(fotoEscala * 100)
        document.getElementById('fotoEscalaVal').textContent = Math.round(fotoEscala * 100) + '%'
        fotoRender()
      }, { passive: false })

      // Doble clic para centrar
      canvas.addEventListener('dblclick', () => {
        fotoPosX = 0; fotoPosY = 0
        document.getElementById('fotoRotacion').value = 0
        fotoRot = 0
        document.getElementById('fotoRotVal').textContent = '0°'
        fotoRender()
      })

      // ── Botones ───────────────────────────────────────────────────
      document.getElementById('fotoBtnRecortar').addEventListener('click', fotoRecortarConAPI)
      document.getElementById('fotoBtnCentrar').addEventListener('click', () => {
        fotoPosX = 0; fotoPosY = 0; fotoRender()
      })
      document.getElementById('fotoBtnDescargar').addEventListener('click', () => {
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          window.dlCheck('fotoproducto', function(){
            a.href = url; a.download = 'foto-producto-lamadriguera.png'; a.click()
            if(window.trackDescarga) trackDescarga('fotoproducto')
          })
        }, 'image/png')
      })
      document.getElementById('fotoBtnNueva').addEventListener('click', () => {
        fotoOrigImg = null; fotoRecortada = null; fotoBgColor = null
        fileInput.value = ''
        document.getElementById('fotoPaso2').style.display = 'none'
        document.getElementById('fotoCompositor').style.display = 'none'
        document.getElementById('fotoError').textContent = ''
        document.getElementById('fotoRotacion').value = 0
        document.getElementById('fotoEscala').value = 80
        document.getElementById('fotoTolRow').style.display = 'none'
        fotoEscala = 0.8; fotoRot = 0; fotoPosX = 0; fotoPosY = 0
        // Reset tabs
        fotoSwitchTab('imagen')
        document.getElementById('fotoTabImagen').classList.add('foto-tab--active')
        document.getElementById('fotoTabColor').classList.remove('foto-tab--active')
        // Reset ajustes
        ;[['fotoBrillo',0],['fotoContraste',0],['fotoSaturacion',0],['fotoTinte',0],
          ['fotoBordes',0],['fotoOpacidad',100],['fotoSombraOpac',0],['fotoSombraBlur',20],
          ['fotoSombraOff',10],['fotoVignet',0],['fotoBgBlur',0]
        ].forEach(function(p) { var id=p[0],val=p[1]; var el=document.getElementById(id); if(el) el.value=val })
        ;[['fotoBrilloVal','0'],['fotoContrasteVal','0'],['fotoSaturacionVal','0'],
          ['fotoTinteVal','0%'],['fotoBordesVal','0px'],['fotoOpacidadVal','100%'],
          ['fotoSombraOpacVal','0%'],['fotoSombraBlurVal','20px'],['fotoSombraOffVal','10px'],
          ['fotoVignetVal','0%'],['fotoBgBlurVal','0px']
        ].forEach(function(p) { var id=p[0],val=p[1]; var el=document.getElementById(id); if(el) el.textContent=val })
        fotoSetSize(1080, 1080)
        document.querySelectorAll('.foto-size-btn').forEach(b => b.classList.remove('foto-size-btn--active'))
        document.querySelector('.foto-size-btn[data-w="1080"][data-h="1080"]').classList.add('foto-size-btn--active')
        ctx.clearRect(0, 0, OUT_W, OUT_H)
      })

      // Cargar fondos al abrir el modal
      document.getElementById('modal-fotoproducto').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-fotoproducto') && fotoFondos.length === 0) cargarFotoFondos()
      })
      // También cargar al abrir via abrirEmprendedor
      const _origAbrirEmpr = window.abrirEmprendedor
      window.abrirEmprendedor = function(id) {
        _origAbrirEmpr(id)
        if (id === 'modal-fotoproducto' && fotoFondos.length === 0) cargarFotoFondos()
      }

    })()

    // Fijar fecha de hoy por defecto
    document.getElementById('presFecha').value = new Date().toISOString().split('T')[0]

    // ── Logo upload ───────────────────────────────────────────────────
    let presLogoImg = null
    const presLogoZone = document.getElementById('presLogoZone')
    const presLogoFile = document.getElementById('presLogoFile')
    presLogoZone.addEventListener('click', e => { if (!e.target.closest('#presLogoQuitar')) presLogoFile.click() })
    presLogoFile.addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        const img = new Image()
        img.onload = () => {
          presLogoImg = img
          document.getElementById('presLogoPreview').src = ev.target.result
          document.getElementById('presLogoPreview').style.display = 'block'
          document.getElementById('presLogoInner').style.display = 'none'
          document.getElementById('presLogoQuitar').style.display = 'inline-block'
        }
        img.src = ev.target.result
      }
      reader.readAsDataURL(file)
    })
    document.getElementById('presLogoQuitar').addEventListener('click', e => {
      e.stopPropagation()
      presLogoImg = null; presLogoFile.value = ''
      document.getElementById('presLogoPreview').style.display = 'none'
      document.getElementById('presLogoQuitar').style.display = 'none'
      document.getElementById('presLogoInner').style.display = 'flex'
    })

    // ── Ítems dinámicos ───────────────────────────────────────────────
