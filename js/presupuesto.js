// ═══════════════════════════════════════════════════
// presupuesto.js — La Madriguera
// ═══════════════════════════════════════════════════

    let presItems = []
    let presItemCounter = 0

    function presRenderItems() {
      const container = document.getElementById('presItemsContainer')
      container.innerHTML = ''
      presItems.forEach((item, idx) => {
        const row = document.createElement('div')
        row.className = 'pres-item-row'
        row.innerHTML = `
          <input class="form-input pres-items-col--desc" type="text" placeholder="Impresión 3D en PLA, 20% relleno..." value="${item.desc}" data-idx="${idx}" data-field="desc"/>
          <input class="form-input pres-items-col--qty" type="number" min="1" value="${item.qty}" data-idx="${idx}" data-field="qty"/>
          <input class="form-input pres-items-col--price" type="number" min="0" step="0.01" placeholder="0" value="${item.price}" data-idx="${idx}" data-field="price"/>
          <span class="pres-items-col--sub pres-item-sub" data-idx="${idx}">$0</span>
          <button class="pres-item-del" data-idx="${idx}" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>`
        container.appendChild(row)
      })
      presActualizarTotales()
    }

    document.getElementById('presItemsContainer').addEventListener('input', e => {
      const el = e.target; const idx = parseInt(el.dataset.idx); const field = el.dataset.field
      if (isNaN(idx) || !field) return
      presItems[idx][field] = field === 'desc' ? el.value : (parseFloat(el.value) || 0)
      presActualizarTotales()
    })
    document.getElementById('presItemsContainer').addEventListener('click', e => {
      const del = e.target.closest('.pres-item-del')
      if (!del) return
      presItems.splice(parseInt(del.dataset.idx), 1)
      presRenderItems()
    })
    document.getElementById('btnPresAgregarItem').addEventListener('click', () => {
      presItems.push({ desc: '', qty: 1, price: 0 })
      presRenderItems()
      // Focus en el último input de descripción
      setTimeout(() => {
        const rows = document.querySelectorAll('.pres-item-row')
        if (rows.length) rows[rows.length-1].querySelector('input').focus()
      }, 50)
    })

    // Adicionales y totales
    ;['presDisenio','presEnvio','presOtros','presIva'].forEach(id => {
      const el = document.getElementById(id)
      if (el) el.addEventListener('input', presActualizarTotales)
    })

    function presActualizarTotales() {
      const moneda = document.getElementById('presMoneda').value || '$ '
      const subItems = presItems.reduce((s, item) => s + item.qty * item.price, 0)
      const adicionales = (parseFloat(document.getElementById('presDisenio').value)||0)
                        + (parseFloat(document.getElementById('presEnvio').value)||0)
                        + (parseFloat(document.getElementById('presOtros').value)||0)
      const base = subItems + adicionales
      const ivaPct = parseFloat(document.getElementById('presIva').value) || 0
      const iva = base * ivaPct / 100
      const total = base + iva

      const fmt = n => moneda + Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})

      // Actualizar subtotales por ítem en el DOM
      presItems.forEach((item, idx) => {
        const sub = document.querySelector(`.pres-item-sub[data-idx="${idx}"]`)
        if (sub) sub.textContent = fmt(item.qty * item.price)
      })

      document.getElementById('presTotalItems').textContent = fmt(subItems)
      document.getElementById('presTotalAdicionales').textContent = fmt(adicionales)
      document.getElementById('presTotalFinal').textContent = fmt(total)
      const ivaRow = document.getElementById('presIvaRow')
      if (ivaRow) { ivaRow.style.display = ivaPct > 0 ? 'flex' : 'none' }
      document.getElementById('presTotalIva').textContent = fmt(iva)
    }
    // Moneda: selector + campo personalizado
    ;(function() {
      const sel    = document.getElementById('presMonedaSelect')
      const custom = document.getElementById('presMonedaCustom')
      const hidden = document.getElementById('presMoneda')
      function updateMoneda() {
        if (sel.value === 'custom') {
          custom.style.display = 'block'
          hidden.value = custom.value.trim() ? custom.value.trim() + ' ' : '$ '
        } else {
          custom.style.display = 'none'
          hidden.value = sel.value
        }
        presActualizarTotales()
      }
      sel.addEventListener('change', updateMoneda)
      custom.addEventListener('input', updateMoneda)
    })()

    // Agregar ítem inicial
    presItems.push({ desc: '', qty: 1, price: 0 })
    presRenderItems()

    // ── Generación PDF via Canvas ─────────────────────────────────────
    document.getElementById('btnGenerarPresupuesto').addEventListener('click', () => {
      const g = id => (document.getElementById(id)?.value || '').trim()
      const errEl = document.getElementById('presError')
      errEl.textContent = ''
      if (!g('presNegocio')) { errEl.textContent = 'Completá el nombre de tu negocio.'; return }
      if (!g('presClienteNombre')) { errEl.textContent = 'Completá el nombre del cliente.'; return }
      if (presItems.every(i => !i.desc)) { errEl.textContent = 'Agregá al menos un ítem con descripción.'; return }

      const moneda = document.getElementById('presMoneda').value || '$ '
      const fmt    = n => moneda + Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})

      // Calcular totales finales
      const subItems    = presItems.reduce((s,i) => s + i.qty * i.price, 0)
      const adDisenio   = parseFloat(g('presDisenio'))||0
      const adEnvio     = parseFloat(g('presEnvio'))||0
      const adOtros     = parseFloat(g('presOtros'))||0
      const adicionales = adDisenio + adEnvio + adOtros
      const base        = subItems + adicionales
      const ivaPct      = parseFloat(document.getElementById('presIva').value)||0
      const iva         = base * ivaPct / 100
      const total       = base + iva

      // ── Canvas PDF (A4 a 150dpi: 1240×1754px) ─────────────────────
      const PW = 1240, PH = 1754
      const M  = 80   // margen
      const canvas = document.createElement('canvas')
      canvas.width = PW; canvas.height = PH
      const ctx = canvas.getContext('2d')

      // Fondo blanco
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, PW, PH)

      // ── Paleta y helpers ──────────────────────────────────────────
      const C = { dark:'#0d1117', cyan:'#159A9C', muted:'#6b7280', light:'#f3f4f6', border:'#e5e7eb', white:'#ffffff' }
      function txt(t, x, y, font, color='#0d1117', align='left') {
        ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(t, x, y); ctx.textAlign = 'left'
      }
      function line(y, x1=M, x2=PW-M, color=C.border, lw=1) {
        ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x2,y); ctx.stroke()
      }
      function rect(x, y, w, h, fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h) }
      function roundedRect(x, y, w, h, r, fill) {
        ctx.fillStyle = fill; ctx.beginPath()
        ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r)
        ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r)
        ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r)
        ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath(); ctx.fill()
      }

      let cy = 0  // cursor Y

      // ── CABECERA ─────────────────────────────────────────────────
      // Calcular altura de cabecera dinámicamente
      const contactLine = [g('presDireccion'), g('presTel'), g('presEmail')].filter(Boolean).join('  ·  ')
      const headerH = 190
      rect(0, 0, PW, headerH, C.dark)
      rect(0, 0, 8, headerH, C.cyan)

      // Logo (izquierda, centrado verticalmente)
      let logoEndX = M + 20
      if (presLogoImg) {
        const lh = 90, lw = Math.min(presLogoImg.width * (lh / presLogoImg.height), 260)
        ctx.drawImage(presLogoImg, M + 16, (headerH - lh) / 2, lw, lh)
        logoEndX = M + 16 + lw + 24
      }

      // Nombre del negocio
      ctx.font = 'bold 46px Arial'; ctx.fillStyle = C.white; ctx.textAlign = 'left'
      const negocioText = g('presNegocio') || 'Mi Emprendimiento'
      const negocioY = contactLine ? headerH/2 - 8 : headerH/2 + 16
      ctx.fillText(negocioText, logoEndX, negocioY)
      if (contactLine) {
        ctx.font = '24px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.fillText(contactLine, logoEndX, negocioY + 34)
      }

      // Número de presupuesto — derecha, centrado verticalmente
      ctx.textAlign = 'right'
      ctx.font = 'bold 18px Arial'; ctx.fillStyle = C.cyan
      ctx.fillText('PRESUPUESTO', PW - M, headerH/2 - 12)
      ctx.font = 'bold 58px Arial'; ctx.fillStyle = C.white
      ctx.fillText(`#${(g('presNumero') || '001').padStart(3,'0')}`, PW - M, headerH/2 + 42)
      ctx.textAlign = 'left'

      cy = headerH + 24

      // ── DATOS CLIENTE / EMISIÓN ──────────────────────────────────
      const colW = (PW - M*2 - 30) / 2

      // Construir filas de fechas primero para saber la altura necesaria
      const fechaFmt = g('presFecha')
        ? new Date(g('presFecha') + 'T12:00:00').toLocaleDateString(undefined, {day:'numeric',month:'long',year:'numeric'})
        : '—'
      const rows2 = [
        ['Fecha de emisión', fechaFmt],
        ['Válido por',       g('presValidez') || '—'],
        g('presCuit') ? ['CUIT / ID fiscal', g('presCuit')] : null,
      ].filter(Boolean)

      // Cada fila: label (22px) + valor (28px) + separación (16px) = 66px por fila
      const rowH    = 66
      const boxPadT = 24
      const boxPadB = 20
      const infoBoxH = Math.max(160, boxPadT + rows2.length * rowH + boxPadB)

      // Box izquierdo: cliente
      roundedRect(M, cy, colW, infoBoxH, 10, C.light)
      let iy = cy + boxPadT + 24
      txt('CLIENTE', M + 24, iy, 'bold 20px Arial', C.muted)
      iy += 36
      txt(g('presClienteNombre') || '—', M + 24, iy, 'bold 30px Arial', C.dark)
      iy += 36
      if (g('presClienteContacto')) { txt(g('presClienteContacto'), M + 24, iy, '24px Arial', C.muted); iy += 30 }
      if (g('presClienteDireccion')) { txt(g('presClienteDireccion'), M + 24, iy, '22px Arial', C.muted) }

      // Box derecho: fechas — layout fluido con cursor propio
      const bx2 = M + colW + 30
      roundedRect(bx2, cy, colW, infoBoxH, 10, C.light)
      let ry = cy + boxPadT
      rows2.forEach(r => {
        txt(r[0], bx2 + 24, ry + 22, 'bold 20px Arial', C.muted)
        txt(r[1], bx2 + 24, ry + 52, 'bold 28px Arial', C.dark)
        ry += rowH
      })

      cy += infoBoxH + 24

      // ── TABLA DE ÍTEMS ────────────────────────────────────────────
      const TW = PW - M*2          // ancho total de tabla: 1080px
      const TX = M                 // X inicio tabla

      // Columnas como proporciones del ancho total
      // Desc: 55%, Cant: 10%, Precio: 20%, Subtotal: 15%
      const C_DESC  = { x: TX + 16,               w: TW * 0.55, align:'left'   }
      const C_QTY   = { x: TX + TW * 0.55 + TW * 0.05, w: TW * 0.10, align:'center' }
      const C_PRICE = { x: TX + TW * 0.85 - 8,    w: TW * 0.20, align:'right'  }
      const C_SUB   = { x: TX + TW - 16,           w: TW * 0.15, align:'right'  }

      // Encabezado tabla
      rect(TX, cy, TW, 54, C.dark)
      ;[
        ['DESCRIPCIÓN', C_DESC],
        ['CANT.',       C_QTY],
        ['PRECIO UNIT.', C_PRICE],
        ['SUBTOTAL',    C_SUB],
      ].forEach(function(p) { var label=p[0],col=p[1];
        ctx.font = 'bold 21px Arial'; ctx.fillStyle = C.cyan
        ctx.textAlign = col.align; ctx.fillText(label, col.x, cy + 36); ctx.textAlign = 'left'
      })
      cy += 54

      // Función para dibujar una fila
      function presRow(desc, qty, precio, subtotal, rowIdx, dimmed) {
        const bg = rowIdx % 2 === 0 ? C.white : C.light
        rect(TX, cy, TW, 54, bg)
        line(cy + 54, TX, TX + TW, C.border, 0.5)
        const color = dimmed ? C.muted : C.dark
        // Truncar descripción si larga
        ctx.font = '25px Arial'; ctx.fillStyle = color; ctx.textAlign = 'left'
        const maxDescW = TW * 0.53
        let descText = desc
        while (descText.length > 0 && ctx.measureText(descText).width > maxDescW) {
          descText = descText.slice(0, -1)
        }
        if (descText !== desc) descText = descText.slice(0,-1) + '…'
        ctx.fillText(descText, C_DESC.x, cy + 36)

        ctx.textAlign = 'center'; ctx.fillText(qty, C_QTY.x, cy + 36)
        ctx.textAlign = 'right';  ctx.fillText(precio,   C_PRICE.x, cy + 36)
        ctx.font = dimmed ? '25px Arial' : 'bold 25px Arial'
        ctx.fillText(subtotal, C_SUB.x, cy + 36)
        ctx.textAlign = 'left'
        cy += 54
      }

      // Filas de ítems
      presItems.filter(i => i.desc || i.price).forEach((item, idx) => {
        presRow(item.desc || '—', String(item.qty), fmt(item.price), fmt(item.qty * item.price), idx, false)
      })

      // Adicionales
      const addRows = []
      if (adDisenio > 0) addRows.push(['Diseño / Modelado 3D', adDisenio])
      if (adEnvio > 0)   addRows.push(['Envío', adEnvio])
      if (adOtros > 0)   addRows.push(['Otros adicionales', adOtros])
      const baseIdx = presItems.filter(i=>i.desc||i.price).length
      addRows.forEach((r, idx) => {
        presRow(r[0], '—', '—', fmt(r[1]), baseIdx + idx, true)
      })

      cy += 20

      // ── TOTALES ───────────────────────────────────────────────────
      const totW = 440, totX = PW - M - totW
      function totRow(label, value, bold=false, highlight=false) {
        if (highlight) roundedRect(totX, cy, totW, 58, 8, C.cyan)
        const color = highlight ? C.white : C.dark
        txt(label, totX + 20, cy + 38, bold ? 'bold 28px Arial' : '26px Arial', highlight ? C.white : C.muted)
        txt(value, totX + totW - 20, cy + 38, bold ? 'bold 30px Arial' : '26px Arial', color, 'right')
        cy += highlight ? 62 : 46
      }
      if (adicionales > 0) { totRow('Subtotal ítems', fmt(subItems)); totRow('Adicionales', fmt(adicionales)) }
      if (ivaPct > 0) totRow(`IVA (${ivaPct}%)`, fmt(iva))
      line(cy, totX, totX + totW, C.border); cy += 16
      totRow('TOTAL', fmt(total), true, true)

      cy += 40

      // ── CONDICIONES ───────────────────────────────────────────────
      const conds = []
      if (g('presFormaPago')) conds.push(['Forma de pago', g('presFormaPago')])
      if (g('presSeña'))      conds.push(['Seña', g('presSeña')])
      if (g('presEntrega'))   conds.push(['Entrega', g('presEntrega')])
      if (g('presLogistica')) conds.push(['Logística', g('presLogistica')])

      if (conds.length > 0) {
        roundedRect(M, cy, PW - M*2, 44 + conds.length * 46, 10, C.light)
        txt('CONDICIONES DE VENTA', M + 24, cy + 34, 'bold 22px Arial', C.muted)
        conds.forEach((c, i) => {
          txt(c[0] + ':', M + 24, cy + 72 + i * 46, 'bold 26px Arial', C.dark)
          txt(c[1], M + 240, cy + 72 + i * 46, '26px Arial', C.muted)
        })
        cy += 44 + conds.length * 46 + 24
      }

      // ── NOTAS / LETRA CHICA ───────────────────────────────────────
      if (g('presNotas')) {
        line(cy, M, PW - M, C.border); cy += 20
        txt('Consideraciones:', M, cy + 26, 'bold 22px Arial', C.muted)
        // Wrap manual del texto de notas
        ctx.font = '22px Arial'; ctx.fillStyle = C.muted
        const words = g('presNotas').split(' ')
        let line2 = '', ly = cy + 56
        words.forEach(w => {
          const test = line2 + (line2 ? ' ' : '') + w
          if (ctx.measureText(test).width > PW - M*2 - 20 && line2) {
            ctx.fillText(line2, M, ly); line2 = w; ly += 30
          } else line2 = test
        })
        if (line2) ctx.fillText(line2, M, ly)
        cy = ly + 40
      }

      // ── PIE DE PÁGINA ─────────────────────────────────────────────
      rect(0, PH - 70, PW, 70, C.dark)
      rect(0, PH - 70, 8, 70, C.cyan)
      const pieParts = [g('presNegocio'), g('presEmail'), g('presTel')].filter(Boolean)
      txt(pieParts.join('  ·  '), PW / 2, PH - 35, '22px Arial', 'rgba(255,255,255,0.55)', 'center')
      txt(`Presupuesto válido por ${g('presValidez') || '7 días'} desde la fecha de emisión`, PW / 2, PH - 15, '18px Arial', 'rgba(255,255,255,0.3)', 'center')

      // ── Descargar como PNG → convertir a PDF via print ────────────
      // ── Generar PDF con jsPDF ─────────────────────────────────────
      const btnGen = document.getElementById('btnGenerarPresupuesto')
      btnGen.disabled = true
      btnGen.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" style="animation:potencSpin .7s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Generando PDF...'

      canvas.toBlob(async blob => {
        try {
          // Cargar jsPDF dinámicamente si no está cargado
          if (!window.jspdf) {
            await new Promise((resolve, reject) => {
              const s = document.createElement('script')
              s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
              s.onload = resolve; s.onerror = reject
              document.head.appendChild(s)
            })
          }
          const { jsPDF } = window.jspdf
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
          const imgData = await new Promise(res => {
            const reader = new FileReader()
            reader.onload = e => res(e.target.result)
            reader.readAsDataURL(blob)
          })
          pdf.addImage(imgData, 'PNG', 0, 0, 210, 297)
          const nombreArchivo = `presupuesto-${(g('presNumero')||'001').padStart(3,'0')}-${(g('presClienteNombre')||'cliente').toLowerCase().replace(/\s+/g,'-')}.pdf`
          window.dlCheck('presupuesto', function(){
            pdf.save(nombreArchivo)
            if(window.trackDescarga) trackDescarga('presupuesto')
          })
        } catch(err) {
          // Fallback: descargar como PNG si jsPDF falla
          console.warn('jsPDF error, fallback a PNG:', err)
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          window.dlCheck('presupuesto', function(){
            a.download = `presupuesto-${g('presNumero')||'001'}.png`
            a.click()
            URL.revokeObjectURL(url)
            if(window.trackDescarga) trackDescarga('presupuesto')
          })
        } finally {
          btnGen.disabled = false
          btnGen.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Generar y descargar PDF'
        }
      }, 'image/png')
    })

