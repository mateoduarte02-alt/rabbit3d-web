// ═══════════════════════════════════════════════════
// init.js — La Madriguera
// ═══════════════════════════════════════════════════

    // Productos primero, después sesión y makers — orden importa para el CTA
    ;(async () => {
      await Promise.all([cargarProductos(), cargarTematicas()])
      await verificarSesionUsuario()
      // Cargar en paralelo todo lo que puede ir junto
      await Promise.all([
        cargarTendOcultas(),
        cargarMakers(),
      ])
      // Cargar tendencias sin bloquear — no es crítico para el render inicial
      cargarMakerworld()
      // ── MAKERWORLD TRENDING ─────────────────────────────────────────────
    })()

    // ── GESTIÓN HERRAMIENTAS (admin) ────────────────────────────────────
    ;(function() {
      // Config: tool id, display name, modal id
      var TOOLS = [
        {id:'stl',      label:'Cuadros 2D',        modal:'modal-stl'},
        {id:'llavero',  label:'Llaveros con nombre',modal:'modal-llavero'},
        {id:'caja',     label:'Caja con tapa',      modal:'modal-caja'},
        {id:'maceta',   label:'Macetas',      modal:'modal-maceta'},
        {id:'marco',    label:'Marco / Porta-foto', modal:'modal-marco'},
        {id:'cortante', label:'Cortantes', modal:'modal-cortante'},
      ]
      // ── Orden Laboratorio 3D — Supabase ──────────────────────────
      function parseOrder(json, tools) {
        try {
          var order = JSON.parse(json)
          if (order.length === tools.length && order.every(function(id){ return tools.find(function(t){return t.id===id}) })) {
            return order.map(function(id){ return tools.find(function(t){return t.id===id}) })
          }
        } catch(e) {}
        return null
      }
      function loadOrder() { return TOOLS.slice() }  // default; overridden after async load
      async function loadOrderFromSupabase() {
        try {
          var res = await supabase.from('media').select('nombre').eq('tipo','herramientas-order').maybeSingle()
          if (res.data && res.data.nombre) {
            var parsed = parseOrder(res.data.nombre, TOOLS)
            if (parsed) { currentOrder = parsed; applyOrder(parsed) }
          }
        } catch(e) { console.warn('loadOrderFromSupabase:', e) }
      }
      async function saveOrder(orderedIds) {
        try {
          var json = JSON.stringify(orderedIds)
          await supabase.from('media').delete().eq('tipo','herramientas-order')
          await supabase.from('media').insert([{tipo:'herramientas-order',url:'',nombre:json}])
        } catch(e) { console.warn('saveOrder:', e) }
      }

      // Apply order to the grid
      function applyOrder(tools) {
        var grid = document.querySelector('.herramientas-grid')
        if (!grid) return
        tools.forEach(function(tool) {
          var card = grid.querySelector('[data-tool="' + tool.id + '"]')
          if (card) grid.appendChild(card)
        })
      }

      // Add data-tool attribute to each card
      function tagCards() {
        TOOLS.forEach(function(tool) {
          var card = document.querySelector('#hcard-visual-' + tool.id)
          if (card) card.closest('.herramienta-card').setAttribute('data-tool', tool.id)
        })
      }

      // Init on load
      tagCards()
      var currentOrder = TOOLS.slice()
      var dragSrc = null
      setTimeout(loadOrderFromSupabase, 300)

      window.abrirGestionHerramientas = function() {
        renderLista()
        renderEmprLista()
        var modal = document.getElementById('modal-gestion-herramientas')
        modal.style.display = 'flex'
        modal.style.alignItems = 'center'
        modal.style.justifyContent = 'center'
      }
      window.cerrarGestionHerramientas = function() {
        document.getElementById('modal-gestion-herramientas').style.display = 'none'
      }

      function renderLista() {
        var lista = document.getElementById('gestion-herramientas-lista')
        lista.innerHTML = ''
        currentOrder.forEach(function(tool, idx) {
          var img = (document.querySelector('#hcard-visual-' + tool.id + ' img') || {}).src || ''
          var row = document.createElement('div')
          row.setAttribute('draggable', 'true')
          row.setAttribute('data-tool-id', tool.id)
          row.style.cssText = [
            'display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem',
            'background:var(--bg-card,#0a2535);border:1px solid rgba(21,154,156,0.2)',
            'border-radius:8px;cursor:grab;user-select:none;transition:opacity 0.15s'
          ].join(';')

          // Drag handle
          row.innerHTML = [
            '<span style="color:var(--muted);font-size:1.2rem;cursor:grab">⠿</span>',
            '<div style="width:72px;height:48px;border-radius:6px;overflow:hidden;flex-shrink:0;',
              'background:#001520;border:1px solid rgba(21,154,156,0.2);cursor:pointer" ',
              'onclick="gestionEditarImg(\'' + tool.id + '\')" title="Cambiar imagen">',
              img ? '<img src="' + img + '" style="width:100%;height:100%;object-fit:cover">' :
                    '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:0.7rem;text-align:center">Sin<br>imagen</div>',
            '</div>',
            '<div style="flex:1">',
              '<p style="margin:0;font-weight:600;color:var(--cyan)">' + tool.label + '</p>',
              '<p style="margin:0;font-size:0.75rem;color:var(--muted)">Clic para cambiar URL de portada</p>',
            '</div>',
            '<span style="color:var(--muted);font-size:0.8rem">#' + (idx+1) + '</span>'
          ].join('')

          // Drag events
          row.addEventListener('dragstart', function(e) {
            dragSrc = row
            e.dataTransfer.effectAllowed = 'move'
            setTimeout(function(){ row.style.opacity = '0.4' }, 0)
          })
          row.addEventListener('dragend', function() { row.style.opacity = '1' })
          row.addEventListener('dragover', function(e) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            var rct = row.getBoundingClientRect()
            var mid = rct.top + rct.height/2
            if (dragSrc && dragSrc !== row) {
              if (e.clientY < mid) lista.insertBefore(dragSrc, row)
              else lista.insertBefore(dragSrc, row.nextSibling)
            }
          })

          // Touch drag support
          var touchStartY = 0
          row.addEventListener('touchstart', function(e) {
            dragSrc = row; touchStartY = e.touches[0].clientY
            row.style.opacity = '0.4'
          }, {passive:true})
          row.addEventListener('touchmove', function(e) {
            e.preventDefault()
            var y = e.touches[0].clientY
            var rows = Array.from(lista.children)
            rows.forEach(function(r) {
              var rct = r.getBoundingClientRect()
              if (r !== dragSrc && y > rct.top && y < rct.bottom) {
                if (y < rct.top + rct.height/2) lista.insertBefore(dragSrc, r)
                else lista.insertBefore(dragSrc, r.nextSibling)
              }
            })
          }, {passive:false})
          row.addEventListener('touchend', function() { row.style.opacity = '1'; syncOrderFromDOM() })

          lista.appendChild(row)
        })
      }

      function syncOrderFromDOM() {
        var lista = document.getElementById('gestion-herramientas-lista')
        var rows = Array.from(lista.children)
        currentOrder = rows.map(function(r) {
          var id = r.getAttribute('data-tool-id')
          return TOOLS.find(function(t){ return t.id === id })
        }).filter(Boolean)
        // Update index labels
        rows.forEach(function(r, i) {
          var lbl = r.querySelector('span:last-child')
          if (lbl) lbl.textContent = '#' + (i+1)
        })
      }

      window.guardarOrdenHerramientas = async function() {
        syncOrderFromDOM()
        var ids = currentOrder.map(function(t){ return t.id })
        applyOrder(currentOrder)
        syncEmprOrderFromDOM()
        // También guardar orden de tarjetas si cambió
        const tarjList = document.getElementById('tarjOrdenListGestion')
        if (tarjList && typeof tarjGuardarOrden === 'function') {
          const items = tarjList.querySelectorAll('[data-nombre]')
          if (items.length) {
            const newOrder = []
            items.forEach(el => {
              const d = TARJ_DISENOS.find(x => x.nombre === el.getAttribute('data-nombre'))
              if (d) newOrder.push(d)
            })
            newOrder.forEach((d,i) => TARJ_DISENOS[i] = d)
            tarjGuardarOrden()
          }
        }
        await Promise.all([saveOrder(ids), saveEmprOrder(emprCurrentOrder.map(function(t){return t.id}))])
        cerrarGestionHerramientas()
        var bar = document.getElementById('adminBar')
        if (bar) {
          var msg = document.createElement('span')
          msg.style.cssText = 'color:#4ecca3;font-size:0.8rem;margin-left:0.5rem'
          msg.textContent = '✓ Orden guardado'
          bar.appendChild(msg)
          setTimeout(function(){ msg.remove() }, 2500)
        }
      }

      // Edit image from gestión modal (Laboratorio 3D)
      window.gestionEditarImg = function(toolId) {
        var overlay = document.getElementById('hcard-edit-' + toolId)
        if (overlay) overlay.style.display = 'flex'
        window.herramientaEditImg(toolId)
        var checkDone = function() {
          renderLista()
          if (!esAdmin && overlay) overlay.style.display = 'none'
        }
        setTimeout(checkDone, 500)
        setTimeout(checkDone, 2000)
        setTimeout(checkDone, 4000)
      }

      // ── EMPRENDEDORES: orden + portada ────────────────────────────
      // EMPR_TOOLS — se construye dinámicamente desde el DOM para incluir nuevas herramientas automáticamente
      var EMPR_TOOLS = [
        {id:'tarjetas',      label:'Tarjetas de agradecimiento'},
        {id:'fotoproducto',  label:'Cambiar fondo de producto'},
        {id:'presupuesto',   label:'Generador de presupuestos'},
        {id:'mejora',        label:'Mejorador de imágenes'},
        {id:'costos',        label:'Calculadora de costos'},
        {id:'cajas',         label:'Cajas ensamblables'},
      ]
      var EMPR_IMG_KEY = 'empr-img-'

      function loadEmprOrder() { return EMPR_TOOLS.slice() }  // default
      async function loadEmprOrderFromSupabase() {
        try {
          var res = await supabase.from('media').select('nombre').eq('tipo','empr-order').maybeSingle()
          if (res.data && res.data.nombre) {
            var order = JSON.parse(res.data.nombre)
            // Filtrar solo ids que existen actualmente, agregar los nuevos al final
            var validOrder = order.filter(function(id){ return EMPR_TOOLS.find(function(t){return t.id===id}) })
            EMPR_TOOLS.forEach(function(t){ if (!validOrder.includes(t.id)) validOrder.push(t.id) })
            var parsed = validOrder.map(function(id){ return EMPR_TOOLS.find(function(t){return t.id===id}) }).filter(Boolean)
            emprCurrentOrder = parsed
            applyEmprOrder(parsed)
          }
        } catch(e) { console.warn('loadEmprOrderFromSupabase:', e) }
      }
      async function saveEmprOrder(ids) {
        try {
          await supabase.from('media').delete().eq('tipo','empr-order')
          await supabase.from('media').insert([{tipo:'empr-order',url:'',nombre:JSON.stringify(ids)}])
        } catch(e) { console.warn('saveEmprOrder:', e) }
      }

      function applyEmprOrder(tools) {
        var grid = document.querySelector('.emprendedores-grid')
        if (!grid) return
        tools.forEach(function(tool) {
          var card = grid.querySelector('[data-empr-id="' + tool.id + '"]')
          if (card) grid.appendChild(card)
        })
      }

      // Apply saved order on load (async from Supabase)
      var emprCurrentOrder = EMPR_TOOLS.slice()
      var emprDragSrc = null
      setTimeout(loadEmprOrderFromSupabase, 400)

      function setEmprCardImg(toolId, url) {
        var card = document.querySelector('[data-empr-id="' + toolId + '"]')
        if (!card) return
        var iconDiv = card.querySelector('.empr-card__icon')
        if (!iconDiv) return
        iconDiv.style.backgroundImage = 'url(' + url + ')'
        iconDiv.style.backgroundSize = 'cover'
        iconDiv.style.backgroundPosition = 'center'
        // Hide the SVG icon when there's a photo
        var svg = iconDiv.querySelector('svg')
        if (svg) svg.style.display = 'none'
      }

      function renderEmprLista() {
        var lista = document.getElementById('gestion-empr-lista')
        if (!lista) return
        lista.innerHTML = ''
        emprCurrentOrder.forEach(function(tool, idx) {
          // Obtener URL de la imagen del DOM (ya cargada desde Supabase)
          var card = document.querySelector('[data-empr-id="' + tool.id + '"]')
          var iconDiv = card && card.querySelector('.empr-card__icon')
          var bgImg = iconDiv && iconDiv.style.backgroundImage
          var savedImg = bgImg ? bgImg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '') : ''
          var row = document.createElement('div')
          row.setAttribute('draggable', 'true')
          row.setAttribute('data-empr-tool-id', tool.id)
          row.style.cssText = 'display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem;background:var(--bg-card,#0a2535);border:1px solid rgba(21,154,156,0.2);border-radius:8px;cursor:grab;user-select:none;transition:opacity 0.15s'
          row.innerHTML = [
            '<span style="color:var(--muted);font-size:1.2rem;cursor:grab">⠿</span>',
            '<div style="width:72px;height:48px;border-radius:6px;overflow:hidden;flex-shrink:0;background:#001520;border:1px solid rgba(21,154,156,0.2);cursor:pointer;position:relative" ',
              'onclick="gestionEmprEditarImg(\'' + tool.id + '\')" title="Cambiar imagen">',
              savedImg
                ? '<img src="' + savedImg + '" style="width:100%;height:100%;object-fit:cover">'
                : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:0.65rem;text-align:center;padding:4px">Sin<br>imagen</div>',
            '</div>',
            '<div style="flex:1">',
              '<p style="margin:0;font-weight:600;color:var(--cyan)">' + tool.label + '</p>',
              '<p style="margin:0;font-size:0.72rem;color:var(--muted)">Clic para cambiar URL de portada</p>',
            '</div>',
            '<span style="color:var(--muted);font-size:0.8rem">#' + (idx+1) + '</span>'
          ].join('')

          // Drag
          row.addEventListener('dragstart', function(e) {
            emprDragSrc = row; e.dataTransfer.effectAllowed = 'move'
            setTimeout(function(){ row.style.opacity = '0.4' }, 0)
          })
          row.addEventListener('dragend', function() { row.style.opacity = '1' })
          row.addEventListener('dragover', function(e) {
            e.preventDefault(); e.dataTransfer.dropEffect = 'move'
            var rct = row.getBoundingClientRect(), mid = rct.top + rct.height/2
            if (emprDragSrc && emprDragSrc !== row) {
              if (e.clientY < mid) lista.insertBefore(emprDragSrc, row)
              else lista.insertBefore(emprDragSrc, row.nextSibling)
            }
          })
          row.addEventListener('touchstart', function(e) {
            emprDragSrc = row; row.style.opacity = '0.4'
          }, {passive:true})
          row.addEventListener('touchmove', function(e) {
            e.preventDefault()
            var y = e.touches[0].clientY
            Array.from(lista.children).forEach(function(r) {
              var rct = r.getBoundingClientRect()
              if (r !== emprDragSrc && y > rct.top && y < rct.bottom) {
                if (y < rct.top + rct.height/2) lista.insertBefore(emprDragSrc, r)
                else lista.insertBefore(emprDragSrc, r.nextSibling)
              }
            })
          }, {passive:false})
          row.addEventListener('touchend', function() { row.style.opacity = '1'; syncEmprOrderFromDOM() })

          lista.appendChild(row)
        })

        var lista2 = document.getElementById('gestion-empr-lista')
        if (lista2) {
          lista2.addEventListener('dragover', function(e){ e.preventDefault() })
          lista2.addEventListener('drop', function(e){ e.preventDefault(); syncEmprOrderFromDOM() })
        }
      }

      function syncEmprOrderFromDOM() {
        var lista = document.getElementById('gestion-empr-lista')
        if (!lista) return
        var rows = Array.from(lista.children)
        emprCurrentOrder = rows.map(function(r) {
          var id = r.getAttribute('data-empr-tool-id')
          return EMPR_TOOLS.find(function(t){ return t.id === id })
        }).filter(Boolean)
        rows.forEach(function(r, i) {
          var lbl = r.querySelector('span:last-child')
          if (lbl) lbl.textContent = '#' + (i+1)
        })
        // Solo aplicar al DOM — guardar en Supabase solo al presionar "Guardar orden"
        applyEmprOrder(emprCurrentOrder)
      }

      // Upload portada for emprendedores card
      // ── Cargar portadas desde Supabase al iniciar ────────────────
      async function cargarEmprImgs() {
        try {
          var ids = EMPR_TOOLS.map(function(t){ return 'empr-img-'+t.id })
          var res = await supabase.from('media').select('tipo,url').in('tipo', ids)
          if (res.error || !res.data) return
          res.data.forEach(function(row) {
            var toolId = row.tipo.replace('empr-img-','')
            if (row.url && !row.url.includes('supabase.co/storage')) {
              window._portadasMap = window._portadasMap || {}
              window._portadasMap[toolId] = row.url
              setEmprCardImg(toolId, row.url)
            }
          })
        } catch(e) { console.warn('cargarEmprImgs:', e) }
      }
      setTimeout(cargarEmprImgs, 600)

      window.gestionEmprEditarImg = function(toolId) {
        // Obtener URL actual
        var card = document.querySelector('[data-empr-id="' + toolId + '"]')
        var iconDiv = card && card.querySelector('.empr-card__icon')
        var bgImg = iconDiv && iconDiv.style.backgroundImage
        var currentUrl = bgImg ? bgImg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '') : ''

        // Modal de URL
        var overlay = document.createElement('div')
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,8,15,.92);display:flex;align-items:center;justify-content:center'
        overlay.innerHTML = `
          <div style="background:var(--bg-card,#0a2535);border:1px solid var(--border);border-radius:12px;padding:1.5rem;width:min(480px,95vw);display:flex;flex-direction:column;gap:.75rem">
            <h3 style="font-family:var(--font-head);font-size:.75rem;font-weight:700;letter-spacing:.1em;color:var(--cyan);margin:0;text-transform:uppercase">Portada de herramienta</h3>
            <div>
              <label style="font-size:.7rem;color:var(--muted)">URL de imagen (GitHub)</label>
              <input type="text" id="_emprImgUrl" value="${currentUrl}"
                placeholder="https://raw.githubusercontent.com/rabbit-3d/rabbit-3d.github.io/main/portadas/calculadora-costos.png"
                style="width:100%;margin-top:.25rem;background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:.45rem .5rem;font-size:.72rem;box-sizing:border-box"/>
              <div id="_emprImgPreview" style="margin-top:.5rem;height:80px;border-radius:6px;background-size:cover;background-position:center;background-color:rgba(255,255,255,.04);${currentUrl ? 'background-image:url(' + currentUrl + ')' : ''}"></div>
            </div>
            <div style="display:flex;gap:.5rem;justify-content:flex-end">
              <button id="_emprImgCancel" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:.38rem .85rem;cursor:pointer;font-size:.77rem">Cancelar</button>
              <button id="_emprImgGuardar" style="background:var(--cyan);border:none;color:#fff;border-radius:6px;padding:.38rem .85rem;cursor:pointer;font-size:.77rem;font-weight:600">Guardar</button>
            </div>
          </div>`
        document.body.appendChild(overlay)

        var input = document.getElementById('_emprImgUrl')
        var preview = document.getElementById('_emprImgPreview')
        input.addEventListener('input', function() {
          preview.style.backgroundImage = this.value ? 'url(' + this.value + ')' : ''
        })
        input.focus(); input.select()

        document.getElementById('_emprImgCancel').onclick = function() { overlay.remove() }
        document.getElementById('_emprImgGuardar').onclick = async function() {
          var cleanUrl = input.value.trim()
          var tipo = 'empr-img-' + toolId
          overlay.remove()
          setEmprCardImg(toolId, cleanUrl)
          await supabase.from('media').delete().eq('tipo', tipo)
          if (cleanUrl) {
            await supabase.from('media').insert([{ tipo: tipo, url: cleanUrl, nombre: cleanUrl }])
          }
          renderEmprLista()
        }
      }

      // Also listen on dragover
      setTimeout(function() {
        var lista = document.getElementById('gestion-herramientas-lista')
        if (!lista) return
        lista.addEventListener('dragover', function(e){ e.preventDefault() })
        lista.addEventListener('drop', function(e){ e.preventDefault(); syncOrderFromDOM() })
      }, 1000)

      // ── Gestión fondos foto de producto ──────────────────────────
      var fondosAdmin = []

      async function cargarFondosAdmin() {
        try {
          var res = await supabase.from('media').select('tipo,url,nombre').like('tipo','foto-fondo-%').order('nombre')
          fondosAdmin = (res.data || [])
          // Aplicar orden guardado si existe
          var orderRes = await supabase.from('media').select('nombre').eq('tipo','foto-fondos-order').maybeSingle()
          if (orderRes.data && orderRes.data.nombre) {
            try {
              var order = JSON.parse(orderRes.data.nombre)
              var ordered = []
              order.forEach(function(tipo) {
                var f = fondosAdmin.find(function(x){ return x.tipo === tipo })
                if (f) ordered.push(f)
              })
              // Agregar los que no están en el orden (nuevos)
              fondosAdmin.forEach(function(f) {
                if (!ordered.find(function(x){ return x.tipo === f.tipo })) ordered.push(f)
              })
              fondosAdmin = ordered
            } catch(e) {}
          }
          renderFondosAdmin()
        } catch(e) { console.warn('cargarFondosAdmin:', e) }
      }

      async function guardarOrdenFondos() {
        var ids = fondosAdmin.map(function(f){ return f.tipo })
        try {
          await supabase.from('media').delete().eq('tipo','foto-fondos-order')
          await supabase.from('media').insert([{tipo:'foto-fondos-order',url:'',nombre:JSON.stringify(ids)}])
        } catch(e) { console.warn('guardarOrdenFondos:', e) }
      }

      function renderFondosAdmin() {
        var grid = document.getElementById('gestionFondosGrid')
        if (!grid) return
        grid.innerHTML = ''
        if (!fondosAdmin.length) {
          grid.innerHTML = '<p style="font-size:.7rem;color:var(--muted);grid-column:1/-1">Sin fondos cargados. Hacé clic en "Subir fondos" para agregar.</p>'
          return
        }
        var dragSrcFondo = null
        fondosAdmin.forEach(function(fondo, idx) {
          var wrap = document.createElement('div')
          wrap.setAttribute('draggable','true')
          wrap.setAttribute('data-tipo', fondo.tipo)
          wrap.style.cssText = 'position:relative;height:80px;border-radius:8px;overflow:hidden;border:1px solid var(--border);cursor:grab;user-select:none'
          // Imagen de fondo
          var imgDiv = document.createElement('div')
          imgDiv.style.cssText = 'width:100%;height:100%;background-size:cover;background-position:center;background-image:url("'+fondo.url+'")'
          // Número de orden
          var numBadge = document.createElement('div')
          numBadge.textContent = idx + 1
          numBadge.style.cssText = 'position:absolute;top:2px;left:4px;background:rgba(0,0,0,.7);color:#fff;font-size:.6rem;font-weight:700;border-radius:3px;padding:1px 4px;pointer-events:none'
          // Botón eliminar
          var del = document.createElement('button')
          del.textContent = '✕'
          del.style.cssText = 'position:absolute;top:2px;right:2px;background:rgba(0,0,0,.7);color:#fff;border:none;border-radius:4px;width:18px;height:18px;font-size:.6rem;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1'
          del.addEventListener('click', async function(e) {
            e.stopPropagation()
            if (!confirm('¿Eliminar este fondo? Recordá también borrar el archivo de tu repo de GitHub.')) return
            try {
              await supabase.from('media').delete().eq('tipo', fondo.tipo)
              fondosAdmin = fondosAdmin.filter(function(f){ return f.tipo !== fondo.tipo })
              await guardarOrdenFondos()
              renderFondosAdmin()
            } catch(e) { console.warn('borrar fondo:', e) }
          })
          wrap.appendChild(imgDiv); wrap.appendChild(numBadge); wrap.appendChild(del)

          // Drag para reordenar
          wrap.addEventListener('dragstart', function(e) {
            dragSrcFondo = wrap
            e.dataTransfer.effectAllowed = 'move'
            setTimeout(function(){ wrap.style.opacity = '0.4' }, 0)
          })
          wrap.addEventListener('dragend', function() {
            wrap.style.opacity = '1'
            // Sincronizar orden desde el DOM
            var newOrder = []
            grid.querySelectorAll('[data-tipo]').forEach(function(el) {
              var f = fondosAdmin.find(function(x){ return x.tipo === el.getAttribute('data-tipo') })
              if (f) newOrder.push(f)
            })
            fondosAdmin = newOrder
            guardarOrdenFondos()
            renderFondosAdmin()  // re-render para actualizar números
          })
          wrap.addEventListener('dragover', function(e) {
            e.preventDefault(); e.dataTransfer.dropEffect = 'move'
            if (dragSrcFondo && dragSrcFondo !== wrap) {
              var rect = wrap.getBoundingClientRect()
              var mid  = rect.left + rect.width / 2
              if (e.clientX < mid) grid.insertBefore(dragSrcFondo, wrap)
              else grid.insertBefore(dragSrcFondo, wrap.nextSibling)
            }
          })
          grid.appendChild(wrap)
        })
      }

      // Subir múltiples fondos
      var fondoFileInput   = document.getElementById('fondoFileInput')
      var fondoFolderInput = document.getElementById('fondoFolderInput')

      document.getElementById('btnSubirFondo').addEventListener('click', function() {
        fondoFileInput.value = ''; fondoFileInput.click()
      })
      document.getElementById('btnSubirCarpeta').addEventListener('click', function() {
        fondoFolderInput.value = ''; fondoFolderInput.click()
      })

      // Mismo handler para archivos y carpeta
      function procesarFondos(e) { fondoFileInput.dispatchEvent(Object.assign(new Event('change'), { target: e.target })) }
      fondoFolderInput.addEventListener('change', async function(e) {
        // Reusar el mismo handler pasando los archivos
        var files = Array.from(e.target.files).filter(function(f){ return f.type.startsWith('image/') })
        if (!files.length) return
        var btn = document.getElementById('btnSubirFondo')
        var btn2 = document.getElementById('btnSubirCarpeta')
        btn.disabled = true; btn2.disabled = true; btn2.textContent = 'Registrando...'

        var instrDiv = document.getElementById('fondoGithubInstr')
        var nombres = files.map(function(f){ return f.name }).join(', ')
        if (instrDiv) {
          instrDiv.style.display = 'block'
          instrDiv.innerHTML = '<p style="font-size:.72rem;color:var(--cyan);margin:0 0 .4rem;font-weight:600">📁 Subí estos archivos a GitHub:</p>' +
            '<ol style="font-size:.7rem;color:var(--text);margin:0 0 .5rem;padding-left:1.2rem;line-height:1.8">' +
            '<li>En tu repo de GitHub, subí la carpeta <strong>fondos</strong> completa</li>' +
            '<li>Esperá que se publiquen (~2 min) y los fondos estarán disponibles</li>' +
            '</ol>' +
            '<p style="font-size:.7rem;color:var(--muted);margin:0">Archivos detectados: ' + files.length + '</p>'
        }

        var errores = 0
        for (var i = 0; i < files.length; i++) {
          var file = files[i]
          var idx  = Date.now() + i
          var tipo = 'foto-fondo-' + idx
          var url  = 'https://lamadriguera.site/fondos/' + encodeURIComponent(file.name)
          try {
            await supabase.from('media').upsert([{ tipo: tipo, url: url, nombre: file.name }], { onConflict: 'nombre' })
            fondosAdmin.push({ tipo: tipo, url: url, nombre: file.name })
          } catch(err) { errores++; console.warn('Error registrando fondo:', err) }
        }
        await guardarOrdenFondos()
        renderFondosAdmin()
        btn.disabled = false; btn2.disabled = false
        btn2.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1-2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> Subir fondos (carpeta)'
        if (errores) alert(errores + ' archivo(s) no se pudieron registrar.')
      })
      fondoFileInput.addEventListener('change', async function(e) {
        var files = Array.from(e.target.files)
        if (!files.length) return
        var btn = document.getElementById('btnSubirFondo')

        // Mostrar instrucciones para subir a GitHub
        var nombres = files.map(function(f){ return f.name }).join(', ')
        var instrDiv = document.getElementById('fondoGithubInstr')
        if (instrDiv) {
          instrDiv.style.display = 'block'
          instrDiv.innerHTML = '<p style="font-size:.72rem;color:var(--cyan);margin:0 0 .4rem;font-weight:600">📁 Subí estos archivos a GitHub:</p>' +
            '<ol style="font-size:.7rem;color:var(--text);margin:0 0 .5rem;padding-left:1.2rem;line-height:1.8">' +
            '<li>En tu repo de GitHub, creá la carpeta <code>fondos/</code> si no existe</li>' +
            '<li>Subí los archivos: <strong>' + nombres + '</strong></li>' +
            '<li>Esperá que se publiquen (~2 min) y después hacé clic en "Registrar fondos" abajo</li>' +
            '</ol>'
        }

        // Generar las URLs de GitHub Pages y registrarlas en Supabase
        btn.disabled = true; btn.textContent = 'Registrando...'
        var errores = 0
        for (var i = 0; i < files.length; i++) {
          var file = files[i]
          var idx  = Date.now() + i
          var nombre = file.name
          var tipo = 'foto-fondo-' + idx
          var url  = 'https://lamadriguera.site/fondos/' + encodeURIComponent(nombre)
          try {
            await supabase.from('media').upsert([{ tipo: tipo, url: url, nombre: nombre }], { onConflict: 'nombre' })
            fondosAdmin.push({ tipo: tipo, url: url, nombre: nombre })
          } catch(err) { errores++; console.warn('Error registrando fondo:', err) }
        }
        await guardarOrdenFondos()
        renderFondosAdmin()
        btn.disabled = false
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Subir fondos'
        if (errores) alert(errores + ' archivo(s) no se pudieron registrar.')
      })

      // Cargar fondos al abrir el modal de gestión
      var _origAbrirGestion = window.abrirGestionHerramientas
      window.abrirGestionHerramientas = async function() {
        await _origAbrirGestion()
        cargarFondosAdmin()
        if (typeof renderOrdenTarjetas === 'function') renderOrdenTarjetas()
        if (typeof carruselAdminRender === 'function') carruselAdminRender()
      }

    })()


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

      // _maintTools vive en window para ser compartido con emprendedor.js
      if (!window._maintTools) window._maintTools = {}

      window.abrirGestorMantenimiento = async function() {
        const modal = document.getElementById('modalGestorMant')
        modal.style.display = 'flex'
        try {
          const { data } = await supabase.from('media')
            .select('tipo,url,nombre').like('tipo','config-maint-%')
          window._maintTools = {}
          if (data) data.forEach(r => {
            // Estado guardado en campo url ('1'=mant) o nombre ('1'=mant, legado)
            window._maintTools[r.tipo.replace('config-maint-','')] = r.url === '1' || r.nombre === '1'
          })
        } catch(e) {}
        _renderMantListas()
      }

      function _renderMantListas() {
        var MANT_TOOLS = (window._getMantTools || function(){return []}).call()
        ;['lab','empr'].forEach(function(tipo) {
          var lista = document.getElementById('mantLista' + (tipo==='lab'?'Lab':'Empr'))
          if (!lista) return
          lista.innerHTML = ''
          var filtrados = MANT_TOOLS.filter(function(t){ return t.tipo === tipo })
          if (!filtrados.length) {
            lista.innerHTML = '<p style="font-size:.7rem;color:var(--muted);padding:.3rem">No hay herramientas registradas.</p>'
            return
          }
          filtrados.forEach(function(tool) {
            var enMant = !!window._maintTools[tool.id]
            var row = document.createElement('div')
            row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:.5rem .7rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:8px'
            var btn2 = document.createElement('button')
            btn2.dataset.toolId = tool.id
            btn2.dataset.enMant = String(enMant)
            btn2.style.cssText = 'padding:.3rem .8rem;border-radius:6px;border:none;cursor:pointer;font-size:.72rem;font-weight:700;background:' + (enMant?'rgba(245,158,11,.15)':'rgba(21,154,156,.15)') + ';color:' + (enMant?'#f59e0b':'#4ecca3')
            btn2.textContent = enMant ? '🔧 En mantenimiento' : '✅ Activa'
            btn2.onclick = function(){ window.toggleMantTool(this) }
            var span = document.createElement('span')
            span.style.cssText = 'font-size:.78rem;color:var(--text)'
            span.textContent = tool.label
            row.appendChild(span)
            row.appendChild(btn2)
            lista.appendChild(row)
          })
        })
      }

      window.toggleMantTool = async function(btn) {
        var id = btn.dataset.toolId
        var enMant = btn.dataset.enMant === 'true'
        var nuevoEstado = !enMant
        btn.disabled = true
        btn.textContent = '...'

        var tipo = 'config-maint-' + id
        var nombreUniq = 'cfg_maint_' + id
        var estadoVal = nuevoEstado ? '1' : '0'

        try {
          // 1. Borrar registro existente (si hay)
          var delRes = await supabase.from('media').delete().eq('tipo', tipo)
          if (delRes.error) throw new Error('Delete: ' + delRes.error.message)

          // 2. Insertar con nombre único para evitar unique constraint
          var insRes = await supabase.from('media').insert([{
            tipo: tipo,
            url: estadoVal,
            nombre: nombreUniq + '_' + estadoVal + '_' + Date.now()
          }])
          if (insRes.error) throw new Error('Insert: ' + insRes.error.message)

          // 3. Actualizar estado local y UI
          window._maintTools[id] = nuevoEstado
          var labCard = document.querySelector('.herramienta-card[onclick*="modal-'+id+'"]')
          if (labCard && window._toggleMantOverlay) window._toggleMantOverlay(labCard, id, nuevoEstado, 'lab')
          var emprCard = document.querySelector('[data-empr-id="'+id+'"]')
          if (emprCard && window._toggleMantOverlay) window._toggleMantOverlay(emprCard, id, nuevoEstado, 'empr')
          _renderMantListas()

        } catch(e) {
          alert('Error al guardar mantenimiento: ' + e.message)
          btn.disabled = false
          btn.textContent = enMant ? '🔧 En mantenimiento' : '✅ Activa'
        }
      }
      // ── Fin gestor de mantenimiento ──────────────────────────────────────


      // ══════════════════════════════════════════════════════════════════
