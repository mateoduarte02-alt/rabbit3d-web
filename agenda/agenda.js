// ═══════════════════════════════════════════════════
// agenda.js — La Madriguera (solo admin)
// ═══════════════════════════════════════════════════

;(function () {
  const SUPABASE_URL = 'https://jcrpxrfjenjdgqtwkiyw.supabase.co'
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcnB4cmZqZW5qZGdxdHdraXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzAzMDYsImV4cCI6MjA5MDg0NjMwNn0.eygcb6oGMkXRUXoJUCs_9B5yr5doF3LrQn9C1-eYHpE'
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

  const AGENDA_ICS_TOKEN = 'iOWe1A47c67N868jJ946tn8jMAQc1aw6'
  const AGENDA_ICS_URL = SUPABASE_URL + '/functions/v1/agenda-ics?token=' + encodeURIComponent(AGENDA_ICS_TOKEN)

  const DIAS_ALERTA = 3

  let items = []
  let tipos = []
  let filtroTipoId = 'todos'
  let verEntregados = false
  let vistaActual = 'lista'
  let tipoModalActual = null
  let pagoModalActual = false
  let calMesActual = new Date()
  calMesActual.setDate(1)

  function hoyISO() {
    const d = new Date()
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
  }
  function diasHasta(fechaISO) {
    const hoy = new Date(hoyISO() + 'T00:00:00')
    const f = new Date(fechaISO + 'T00:00:00')
    return Math.round((f - hoy) / 86400000)
  }
  function tipoDe(id) { return tipos.find(t => t.id === id) }
  function contraste(hex) {
    // Blanco o negro según el brillo del color, para que el texto se lea bien
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
    return (r*299 + g*587 + b*114) / 1000 > 150 ? '#0a1520' : '#ffffff'
  }

  // ══════════════════════════════════════════
  //  AUTH — solo admin
  // ══════════════════════════════════════════
  async function chequearAdmin() {
    try {
      const { data } = await supabase.auth.getSession()
      const user = data?.session?.user
      if (!user) return false
      const { data: perfil } = await supabase.from('profiles').select('rol').eq('id', user.id).limit(1)
      return perfil?.[0]?.rol === 'admin'
    } catch (e) { return false }
  }

  // ══════════════════════════════════════════
  //  TIPOS DE ENTRADA
  // ══════════════════════════════════════════
  async function cargarTipos() {
    const { data, error } = await supabase.from('agenda_tipos').select('*').order('orden', { ascending: true }).order('id', { ascending: true })
    if (error) { console.error('[agenda] error al cargar tipos:', error); return }
    tipos = data || []
    renderFiltros()
    renderTipoSelect()
  }

  function renderFiltros() {
    const cont = document.getElementById('agFiltros')
    // Sacar los botones de tipo viejos (todo lo que no sea "Todos" ni el checkbox)
    cont.querySelectorAll('.ag-filtro[data-tipo]:not([data-tipo="todos"])').forEach(b => b.remove())
    const checkboxLabel = cont.querySelector('label')
    tipos.forEach(t => {
      const btn = document.createElement('button')
      btn.className = 'ag-filtro'
      btn.dataset.tipo = t.id
      btn.textContent = `${t.icono} ${t.nombre}`
      if (filtroTipoId == t.id) { btn.classList.add('activo'); btn.style.borderColor = t.color; btn.style.color = t.color; btn.style.background = t.color + '22' }
      cont.insertBefore(btn, checkboxLabel)
    })
  }

  function renderTipoSelect() {
    const cont = document.getElementById('agTipoSelect')
    cont.innerHTML = tipos.map(t => `<button type="button" class="ag-tipo-btn" data-tipo-id="${t.id}">${t.icono} ${t.nombre}</button>`).join('')
  }

  document.getElementById('agTipoSelect').addEventListener('click', e => {
    const btn = e.target.closest('.ag-tipo-btn')
    if (!btn) return
    document.querySelectorAll('#agTipoSelect .ag-tipo-btn').forEach(b => b.classList.remove('activo'))
    btn.classList.add('activo')
    tipoModalActual = Number(btn.dataset.tipoId)
    actualizarVisibilidadPago()
  })

  function actualizarVisibilidadPago() {
    const t = tipoDe(tipoModalActual)
    document.getElementById('agPagoToggle').style.display = (t && t.requiere_pago) ? 'flex' : 'none'
  }

  document.getElementById('agPagoToggle').addEventListener('click', e => {
    const btn = e.target.closest('.ag-pago-btn')
    if (!btn) return
    pagoModalActual = btn.dataset.pago === 'si'
    document.querySelectorAll('#agPagoToggle .ag-pago-btn').forEach(b => b.classList.remove('activo-pagado','activo-pendiente'))
    btn.classList.add(pagoModalActual ? 'activo-pagado' : 'activo-pendiente')
  })

  // ── Gestor de tipos (modal aparte) ──
  document.getElementById('agBtnTipos').addEventListener('click', () => {
    renderTiposLista()
    resetFormTipo()
    document.getElementById('agModalTipos').classList.add('activo')
  })
  document.getElementById('agBtnCerrarModalTipos').addEventListener('click', () => document.getElementById('agModalTipos').classList.remove('activo'))

  function renderTiposLista() {
    const cont = document.getElementById('agTiposLista')
    cont.innerHTML = tipos.map(t => `
      <div class="ag-tipo-row">
        <div class="ag-tipo-row__color" style="background:${t.color}"></div>
        <span class="ag-tipo-row__nombre">${t.icono} ${t.nombre}</span>
        <span class="ag-tipo-row__pago">${t.requiere_pago ? '💰 con pago' : ''}</span>
        <button class="ag-item__btn" title="Editar" onclick="window._agEditarTipo(${t.id})">✎</button>
        <button class="ag-item__btn" title="Eliminar" onclick="window._agEliminarTipo(${t.id})">🗑</button>
      </div>
    `).join('') || '<p style="color:var(--muted);font-size:.78rem">Todavía no hay tipos creados.</p>'
  }

  function resetFormTipo() {
    document.getElementById('agTipoEditId').value = ''
    document.getElementById('agTipoNombre').value = ''
    document.getElementById('agTipoIcono').value = ''
    document.getElementById('agTipoColor').value = '#159A9C'
    document.getElementById('agTipoRequierePago').checked = false
    document.getElementById('agTipoError').textContent = ''
    document.getElementById('agBtnGuardarTipo').textContent = 'Agregar'
    document.getElementById('agBtnCancelarEdicionTipo').style.display = 'none'
  }

  window._agEditarTipo = function (id) {
    const t = tipoDe(id)
    if (!t) return
    document.getElementById('agTipoEditId').value = t.id
    document.getElementById('agTipoNombre').value = t.nombre
    document.getElementById('agTipoIcono').value = t.icono
    document.getElementById('agTipoColor').value = t.color
    document.getElementById('agTipoRequierePago').checked = t.requiere_pago
    document.getElementById('agBtnGuardarTipo').textContent = 'Guardar cambios'
    document.getElementById('agBtnCancelarEdicionTipo').style.display = 'inline-flex'
  }
  document.getElementById('agBtnCancelarEdicionTipo').addEventListener('click', resetFormTipo)

  window._agEliminarTipo = async function (id) {
    const enUso = items.some(i => i.tipo_id === id)
    if (enUso && !confirm('Hay entradas usando este tipo — si lo borrás, esas entradas quedan sin tipo asignado. ¿Seguir?')) return
    if (!enUso && !confirm('¿Eliminar este tipo de entrada?')) return
    const { error } = await supabase.from('agenda_tipos').delete().eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
    await cargarTipos()
    await cargarItems()
    renderTiposLista()
  }

  document.getElementById('agBtnGuardarTipo').addEventListener('click', async () => {
    const errEl = document.getElementById('agTipoError')
    const id = document.getElementById('agTipoEditId').value
    const datos = {
      nombre: document.getElementById('agTipoNombre').value.trim(),
      icono: document.getElementById('agTipoIcono').value.trim() || '📌',
      color: document.getElementById('agTipoColor').value,
      requiere_pago: document.getElementById('agTipoRequierePago').checked,
    }
    if (!datos.nombre) { errEl.textContent = 'El nombre es obligatorio.'; return }
    let error
    if (id) {
      ;({ error } = await supabase.from('agenda_tipos').update(datos).eq('id', id))
    } else {
      ;({ error } = await supabase.from('agenda_tipos').insert([{ ...datos, orden: tipos.length + 1 }]))
    }
    if (error) { errEl.textContent = 'Error al guardar: ' + error.message; return }
    await cargarTipos()
    renderTiposLista()
    resetFormTipo()
  })

  // ══════════════════════════════════════════
  //  CARGA Y RENDER — vista lista
  // ══════════════════════════════════════════
  async function cargarItems() {
    const { data, error } = await supabase.from('agenda_items').select('*').order('fecha_limite', { ascending: true })
    if (error) { console.error('[agenda] error al cargar:', error); return }
    items = data || []
    renderBanners()
    renderLista()
    if (vistaActual === 'calendario') renderCalendario()
  }

  function renderBanners() {
    const pendientes = items.filter(i => i.estado === 'pendiente')
    const vencidos = pendientes.filter(i => diasHasta(i.fecha_limite) < 0)
    const porVencer = pendientes.filter(i => { const d = diasHasta(i.fecha_limite); return d >= 0 && d <= DIAS_ALERTA })

    document.getElementById('agStatPendientes').textContent = pendientes.length
    document.getElementById('agStatVencidos').textContent = vencidos.length
    document.getElementById('agStatPorVencer').textContent = porVencer.length

    dispararNotificaciones(vencidos, porVencer)
  }

  function renderLista() {
    let visibles = items.filter(i => filtroTipoId === 'todos' || i.tipo_id == filtroTipoId)
    if (!verEntregados) visibles = visibles.filter(i => i.estado !== 'entregado')

    const lista = document.getElementById('agLista')
    const empty = document.getElementById('agEmpty')
    if (!visibles.length) { lista.innerHTML = ''; empty.style.display = 'block'; return }
    empty.style.display = 'none'

    lista.innerHTML = visibles.map(i => {
      try {
      const t = tipoDe(i.tipo_id) || { icono: '📌', color: '#8fa8b2', nombre: '', requiere_pago: false }
      const dias = diasHasta(i.fecha_limite)
      const entregado = i.estado === 'entregado'
      let claseItem = '', claseFecha = 'ag-item__fecha--ok', textoFecha
      if (!entregado && dias < 0)      { claseItem = 'ag-item--vencido';    claseFecha = 'ag-item__fecha--vencido';   textoFecha = `Demorada hace ${Math.abs(dias)} día${Math.abs(dias)===1?'':'s'}` }
      else if (!entregado && dias <= DIAS_ALERTA) { claseItem = 'ag-item--por-vencer'; claseFecha = 'ag-item__fecha--por-vencer'; textoFecha = dias===0?'Es hoy':`Faltan ${dias} día${dias===1?'':'s'}` }
      else { textoFecha = entregado ? formatearFecha(i.fecha_limite) : `${formatearFecha(i.fecha_limite)} · faltan ${dias} día${dias===1?'':'s'}` }
      if (entregado) claseItem += ' ag-item--entregado'

      const pagoTag = t.requiere_pago
        ? `<span class="ag-item__pago ${i.pagado ? 'ag-item__pago--pagado' : 'ag-item__pago--pendiente'}" style="cursor:pointer" onclick="window._agTogglePago(${i.id})">${i.pagado ? '✅ Pagado' : '💸 No pagado'}</span>`
        : ''

      return `
      <div class="ag-item ${claseItem}">
        <span class="ag-item__icono" style="background:${t.color}33">${t.icono}</span>
        <div class="ag-item__body">
          <p class="ag-item__titulo ${entregado?'ag-item__titulo--tachado':''}">${i.titulo}</p>
          ${i.descripcion ? `<p class="ag-item__desc">${i.descripcion}</p>` : ''}
          <p class="ag-item__fecha ${claseFecha}">${textoFecha}${entregado?' · ✓ Entregado':''}${pagoTag}</p>
        </div>
        <div class="ag-item__acciones">
          <button class="ag-item__btn ag-item__btn--check ${entregado?'activo':''}" title="${entregado?'Marcar como pendiente':'Marcar como entregado'}" onclick="window._agToggleEstado(${i.id})">✓</button>
          <button class="ag-item__btn" title="Editar" onclick="window._agAbrirModal(${i.id})">✎</button>
          <button class="ag-item__btn" title="Eliminar" onclick="window._agEliminar(${i.id})">🗑</button>
        </div>
      </div>`
      } catch (e) {
        console.error('[agenda] error renderizando entrada', i, e)
        return `<div class="ag-item"><div class="ag-item__body"><p class="ag-item__titulo">${i.titulo || '(sin título)'}</p><p class="ag-item__desc">⚠ Error al mostrar esta entrada</p></div></div>`
      }
    }).join('')
  }

  function formatearFecha(iso) {
    const [y,m,d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  document.getElementById('agFiltros').addEventListener('click', e => {
    const btn = e.target.closest('.ag-filtro')
    if (!btn) return
    document.querySelectorAll('.ag-filtro').forEach(b => { b.classList.remove('activo'); b.style.borderColor=''; b.style.color=''; b.style.background='' })
    btn.classList.add('activo')
    if (btn.dataset.tipo !== 'todos') { const t = tipoDe(Number(btn.dataset.tipo)); if (t) { btn.style.borderColor=t.color; btn.style.color=t.color; btn.style.background=t.color+'22' } }
    filtroTipoId = btn.dataset.tipo
    renderLista()
  })
  document.getElementById('agVerEntregados').addEventListener('change', e => {
    verEntregados = e.target.checked
    renderLista()
  })

  // ══════════════════════════════════════════
  //  VISTA: toggle lista / calendario
  // ══════════════════════════════════════════
  // ══════════════════════════════════════════
  //  DRAWER MOBILE (sidebar deslizable)
  // ══════════════════════════════════════════
  const sidebarEl = document.getElementById('agSidebar')
  const overlayEl = document.getElementById('agSidebarOverlay')
  function abrirDrawer() { sidebarEl.classList.add('abierto'); overlayEl.classList.add('abierto') }
  function cerrarDrawer() { sidebarEl.classList.remove('abierto'); overlayEl.classList.remove('abierto') }
  document.getElementById('agBtnMenu').addEventListener('click', abrirDrawer)
  overlayEl.addEventListener('click', cerrarDrawer)
  sidebarEl.addEventListener('click', e => { if (e.target.closest('.ag-nav-item')) cerrarDrawer() })

  document.getElementById('agBtnRecordatorios').addEventListener('click', () => document.getElementById('agModalRecordatorios').classList.add('activo'))
  document.getElementById('agBtnCerrarModalRecordatorios').addEventListener('click', () => document.getElementById('agModalRecordatorios').classList.remove('activo'))

  document.getElementById('agVistaToggle').addEventListener('click', e => {
    const btn = e.target.closest('[data-vista]')
    if (!btn) return
    document.querySelectorAll('#agVistaToggle [data-vista]').forEach(b => b.classList.remove('activo'))
    btn.classList.add('activo')
    vistaActual = btn.dataset.vista
    document.getElementById('agHeaderEntradas').style.display = (vistaActual === 'lista' || vistaActual === 'calendario') ? 'block' : 'none'
    document.getElementById('agVistaLista').style.display = vistaActual === 'lista' ? 'block' : 'none'
    document.getElementById('agVistaCalendario').style.display = vistaActual === 'calendario' ? 'block' : 'none'
    document.getElementById('agVistaCarpetas').style.display = vistaActual === 'carpetas' ? 'block' : 'none'
    document.getElementById('agVistaFinanzas').style.display = vistaActual === 'finanzas' ? 'block' : 'none'
    document.getElementById('agVistaEstudio').style.display = vistaActual === 'estudio' ? 'block' : 'none'
    document.getElementById('agVistaPantalla').style.display = vistaActual === 'pantalla' ? 'block' : 'none'
    if (vistaActual === 'calendario') renderCalendario()
    if (vistaActual === 'carpetas') { cargarCarpetas(); cargarCorcho() }
    if (vistaActual === 'finanzas') { Promise.all([cargarCategoriasFin(), cargarBilleterasFin()]).then(cargarFinanzas) }
    if (vistaActual === 'estudio') cargarEstudioTab()
    if (vistaActual === 'pantalla') cargarPantallaTab()
  })

  document.getElementById('agCalPrev').addEventListener('click', () => { calMesActual.setMonth(calMesActual.getMonth() - 1); renderCalendario() })
  document.getElementById('agCalNext').addEventListener('click', () => { calMesActual.setMonth(calMesActual.getMonth() + 1); renderCalendario() })

  function renderCalendario() {
    const year = calMesActual.getFullYear(), month = calMesActual.getMonth()
    const nombreMes = calMesActual.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    document.getElementById('agCalMes').textContent = nombreMes

    const primerDia = new Date(year, month, 1)
    const ultimoDia = new Date(year, month + 1, 0)
    const inicioOffset = (primerDia.getDay() + 6) % 7 // lunes=0

    const dias = []
    for (let i = 0; i < inicioOffset; i++) dias.push(null)
    for (let d = 1; d <= ultimoDia.getDate(); d++) dias.push(d)

    const itemsPorFecha = {}
    items.forEach(i => { (itemsPorFecha[i.fecha_limite] = itemsPorFecha[i.fecha_limite] || []).push(i) })

    const grid = document.getElementById('agCalGrid')
    const dow = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
    let html = dow.map(d => `<div class="ag-cal-dow">${d}</div>`).join('')

    html += dias.map(d => {
      if (!d) return `<div class="ag-cal-day ag-cal-day--fuera"></div>`
      const fechaISO = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const esHoy = fechaISO === hoyISO()
      const seleccionado = fechaISO === diaSeleccionado
      const entradas = itemsPorFecha[fechaISO] || []
      const MAX = 3
      const chips = entradas.slice(0, MAX).map(i => {
        const t = tipoDe(i.tipo_id) || { icono:'📌', color:'#8fa8b2' }
        const entregado = i.estado === 'entregado'
        return `<div class="ag-cal-chip ${entregado?'ag-cal-chip--entregado':''}" style="background:${t.color}" title="${i.titulo}" onclick="event.stopPropagation();window._agAbrirModal(${i.id})">${t.icono} ${i.titulo}</div>`
      }).join('')
      const mas = entradas.length > MAX ? `<div class="ag-cal-mas">+${entradas.length - MAX} más</div>` : ''
      const dots = entradas.map(i => { const t = tipoDe(i.tipo_id) || { color:'#8fa8b2' }; return `<span class="ag-cal-dot" style="background:${t.color}"></span>` }).join('')
      return `<div class="ag-cal-day ${esHoy?'ag-cal-day--hoy':''} ${seleccionado?'ag-cal-day--seleccionado':''}" onclick="window._agSeleccionarDia('${fechaISO}')">
        <span class="ag-cal-day__num">${d}</span>
        ${chips}${mas}
        <div class="ag-cal-dot-wrap">${dots}</div>
      </div>`
    }).join('')

    grid.innerHTML = html
    renderCalDetalle(itemsPorFecha)
  }

  let diaSeleccionado = null
  window._agSeleccionarDia = function (fechaISO) {
    diaSeleccionado = (diaSeleccionado === fechaISO) ? null : fechaISO
    renderCalendario()
  }

  function renderCalDetalle(itemsPorFecha) {
    const cont = document.getElementById('agCalDetalle')
    if (!diaSeleccionado) { cont.style.display = 'none'; return }
    const entradas = (itemsPorFecha || {})[diaSeleccionado] || []
    const [y,m,d] = diaSeleccionado.split('-')
    cont.style.display = 'flex'
    if (!entradas.length) {
      cont.innerHTML = `<p class="ag-cal-detalle__titulo">${d}/${m}/${y}</p><p style="color:var(--muted);font-size:.8rem">Nada cargado este día.</p>`
      return
    }
    cont.innerHTML = `<p class="ag-cal-detalle__titulo">${d}/${m}/${y}</p>` + entradas.map(i => {
      const t = tipoDe(i.tipo_id) || { icono:'📌', color:'#8fa8b2', nombre:'' }
      const entregado = i.estado === 'entregado'
      return `<div class="ag-item">
        <span class="ag-item__icono" style="background:${t.color}33">${t.icono}</span>
        <div class="ag-item__body">
          <p class="ag-item__titulo ${entregado?'ag-item__titulo--tachado':''}">${i.titulo}</p>
          ${i.descripcion ? `<p class="ag-item__desc">${i.descripcion}</p>` : ''}
        </div>
        <div class="ag-item__acciones">
          <button class="ag-item__btn ag-item__btn--check ${entregado?'activo':''}" onclick="window._agToggleEstado(${i.id})">✓</button>
          <button class="ag-item__btn" onclick="window._agAbrirModal(${i.id})">✎</button>
        </div>
      </div>`
    }).join('')
  }

  // ══════════════════════════════════════════
  //  CRUD DE ENTRADAS
  // ══════════════════════════════════════════
  document.getElementById('agBtnNuevo').addEventListener('click', () => window._agAbrirModal(null))

  window._agAbrirModal = function (id) {
    const it = id ? items.find(x => x.id === id) : null
    document.getElementById('agModalTitulo').textContent = it ? 'Editar entrada' : 'Nueva entrada'
    document.getElementById('agItemId').value = it ? it.id : ''
    document.getElementById('agTitulo').value = it ? it.titulo : ''
    document.getElementById('agDesc').value = it ? (it.descripcion || '') : ''
    document.getElementById('agFecha').value = it ? it.fecha_limite : hoyISO()

    tipoModalActual = it ? it.tipo_id : (tipos[0] ? tipos[0].id : null)
    document.querySelectorAll('#agTipoSelect .ag-tipo-btn').forEach(b => b.classList.toggle('activo', Number(b.dataset.tipoId) === tipoModalActual))

    pagoModalActual = it ? !!it.pagado : false
    document.querySelectorAll('#agPagoToggle .ag-pago-btn').forEach(b => {
      b.classList.remove('activo-pagado','activo-pendiente')
      if ((b.dataset.pago === 'si') === pagoModalActual) b.classList.add(pagoModalActual ? 'activo-pagado' : 'activo-pendiente')
    })
    actualizarVisibilidadPago()

    document.getElementById('agError').textContent = ''
    document.getElementById('agModal').classList.add('activo')
  }
  document.getElementById('agBtnCerrarModal').addEventListener('click', () => document.getElementById('agModal').classList.remove('activo'))

  document.getElementById('agBtnGuardar').addEventListener('click', async () => {
    const errEl = document.getElementById('agError')
    const id = document.getElementById('agItemId').value
    if (!tipoModalActual) { errEl.textContent = 'Elegí un tipo de entrada (o creá uno en "⚙ Tipos de entrada").'; return }
    const t = tipoDe(tipoModalActual)
    const datos = {
      tipo_id: tipoModalActual,
      titulo: document.getElementById('agTitulo').value.trim(),
      descripcion: document.getElementById('agDesc').value.trim(),
      fecha_limite: document.getElementById('agFecha').value,
      pagado: t && t.requiere_pago ? pagoModalActual : false,
    }
    if (!datos.titulo) { errEl.textContent = 'El título es obligatorio.'; return }
    if (!datos.fecha_limite) { errEl.textContent = 'La fecha es obligatoria.'; return }
    let error
    if (id) {
      ;({ error } = await supabase.from('agenda_items').update(datos).eq('id', id))
    } else {
      ;({ error } = await supabase.from('agenda_items').insert([{ ...datos, estado: 'pendiente' }]))
    }
    if (error) { errEl.textContent = 'Error al guardar: ' + error.message; return }
    document.getElementById('agModal').classList.remove('activo')
    await cargarItems()
  })

  window._agToggleEstado = async function (id) {
    const it = items.find(x => x.id === id)
    if (!it) return
    const nuevoEstado = it.estado === 'entregado' ? 'pendiente' : 'entregado'
    const { error } = await supabase.from('agenda_items').update({ estado: nuevoEstado }).eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
    await cargarItems()
  }

  window._agTogglePago = async function (id) {
    const it = items.find(x => x.id === id)
    if (!it) return
    const { error } = await supabase.from('agenda_items').update({ pagado: !it.pagado }).eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
    await cargarItems()
  }

  window._agEliminar = async function (id) {
    if (!confirm('¿Eliminar esta entrada?')) return
    const { error } = await supabase.from('agenda_items').delete().eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
    await cargarItems()
  }

  // ══════════════════════════════════════════
  //  NOTIFICACIONES DEL NAVEGADOR
  // ══════════════════════════════════════════
  document.getElementById('agBtnNotif').addEventListener('click', async () => {
    if (!('Notification' in window)) { alert('Tu navegador no soporta notificaciones.'); return }
    const permiso = await Notification.requestPermission()
    if (permiso === 'granted') {
      new Notification('¡Listo! 🔔', { body: 'Vas a recibir avisos acá cuando algo se acerque.' })
      renderBanners()
    } else {
      alert('No diste permiso — no vamos a poder mostrarte notificaciones del navegador.')
    }
  })

  function dispararNotificaciones(vencidos, porVencer) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    const hoy = hoyISO()
    const yaNotificados = JSON.parse(localStorage.getItem('lm_agenda_notif_' + hoy) || '[]')
    const nuevos = [...vencidos, ...porVencer].filter(i => !yaNotificados.includes(i.id))
    if (!nuevos.length) return
    nuevos.forEach(i => {
      const t = tipoDe(i.tipo_id) || { icono: '📌', nombre: '' }
      const dias = diasHasta(i.fecha_limite)
      const cuando = dias < 0 ? `demorada hace ${Math.abs(dias)} día(s)` : dias === 0 ? 'es hoy' : `faltan ${dias} día(s)`
      new Notification(`${t.icono} ${t.nombre}: ${i.titulo}`, { body: cuando.charAt(0).toUpperCase() + cuando.slice(1) })
    })
    localStorage.setItem('lm_agenda_notif_' + hoy, JSON.stringify([...yaNotificados, ...nuevos.map(i => i.id)]))
  }

  // ══════════════════════════════════════════
  //  SUSCRIPCIÓN A GOOGLE/APPLE CALENDAR (.ics vía Edge Function)
  // ══════════════════════════════════════════
  document.getElementById('agBtnIcs').href = AGENDA_ICS_URL.replace(/^https?:/, 'webcal:')

  document.getElementById('agBtnCopiarIcs').addEventListener('click', async () => {
    const btn = document.getElementById('agBtnCopiarIcs')
    try {
      await navigator.clipboard.writeText(AGENDA_ICS_URL)
      btn.textContent = '✓ Copiado — pegalo en Google Calendar → Otros calendarios → Desde URL'
      setTimeout(() => { btn.textContent = '📋 Copiar link (compu)' }, 4000)
    } catch (e) {
      prompt('Copiá este link manualmente:', AGENDA_ICS_URL)
    }
  })

  // ══════════════════════════════════════════
  //  CARPETAS DE NOTAS (listas rápidas sin fecha)
  // ══════════════════════════════════════════
  let carpetas = []
  let carpetaActualId = null

  async function cargarCarpetas() {
    const { data, error } = await supabase.from('agenda_carpetas').select('*').order('orden', { ascending: true }).order('id', { ascending: true })
    if (error) { console.error('[agenda] error al cargar carpetas:', error); return }
    carpetas = data || []
    renderCarpetasGrid()
  }

  async function renderCarpetasGrid() {
    document.getElementById('agCarpetaDetalle').style.display = 'none'
    document.getElementById('agCarpetasGrid-wrap').style.display = 'block'
    carpetaActualId = null

    const grid = document.getElementById('agCarpetasGrid')
    const empty = document.getElementById('agCarpetasEmpty')
    if (!carpetas.length) { grid.innerHTML = ''; empty.style.display = 'block'; return }
    empty.style.display = 'none'

    // Traer las notas reales de todas las carpetas (no solo el conteo)
    const { data: notasData } = await supabase.from('agenda_notas').select('*').order('orden', { ascending: true }).order('id', { ascending: true })
    const porCarpeta = {}
    ;(notasData || []).forEach(n => { (porCarpeta[n.carpeta_id] = porCarpeta[n.carpeta_id] || []).push(n) })

    grid.innerHTML = carpetas.map(c => {
      const notas = porCarpeta[c.id] || []
      const itemsHtml = notas.length
        ? notas.map(n => `
            <div class="ag-carpeta-card__item" onclick="event.stopPropagation()">
              <button class="ag-nota-item__check ag-nota-item__check--mini ${n.hecho?'hecho':''}" onclick="window._agToggleNotaGrid(${n.id}, ${c.id})">✓</button>
              <span class="ag-nota-item__texto ${n.hecho?'hecho':''}">${n.texto}</span>
              <button class="ag-postit__del" onclick="window._agEliminarNotaGrid(${n.id}, ${c.id})">🗑</button>
            </div>`).join('')
        : `<p class="ag-carpeta-card__vacia">Vacía</p>`
      return `<div class="ag-carpeta-card" style="border-top-color:${c.color}" onclick="window._agAbrirCarpeta(${c.id})">
        <p class="ag-carpeta-card__nombre"><span style="width:10px;height:10px;border-radius:3px;background:${c.color};display:inline-block;flex-shrink:0"></span> ${c.nombre}</p>
        <div class="ag-carpeta-card__items">${itemsHtml}</div>
      </div>`
    }).join('')
  }

  window._agToggleNotaGrid = async function (notaId, carpetaId) {
    const { data } = await supabase.from('agenda_notas').select('hecho').eq('id', notaId).limit(1)
    const actual = data?.[0]?.hecho || false
    await supabase.from('agenda_notas').update({ hecho: !actual }).eq('id', notaId)
    await renderCarpetasGrid()
  }

  window._agEliminarNotaGrid = async function (notaId, carpetaId) {
    await supabase.from('agenda_notas').delete().eq('id', notaId)
    await renderCarpetasGrid()
  }

  document.getElementById('agBtnNuevaCarpeta').addEventListener('click', () => window._agAbrirModalCarpeta(null))

  window._agAbrirModalCarpeta = function (id) {
    const c = id ? carpetas.find(x => x.id === id) : null
    document.getElementById('agModalCarpetaTitulo').textContent = c ? 'Editar carpeta' : 'Nueva carpeta'
    document.getElementById('agCarpetaId').value = c ? c.id : ''
    document.getElementById('agCarpetaNombre').value = c ? c.nombre : ''
    document.getElementById('agCarpetaColor').value = c ? c.color : '#159A9C'
    document.getElementById('agCarpetaError').textContent = ''
    document.getElementById('agModalCarpeta').classList.add('activo')
  }
  document.getElementById('agBtnCerrarModalCarpeta').addEventListener('click', () => document.getElementById('agModalCarpeta').classList.remove('activo'))

  document.getElementById('agBtnGuardarCarpeta').addEventListener('click', async () => {
    const errEl = document.getElementById('agCarpetaError')
    const id = document.getElementById('agCarpetaId').value
    const datos = {
      nombre: document.getElementById('agCarpetaNombre').value.trim(),
      color: document.getElementById('agCarpetaColor').value,
    }
    if (!datos.nombre) { errEl.textContent = 'El nombre es obligatorio.'; return }
    let error
    if (id) {
      ;({ error } = await supabase.from('agenda_carpetas').update(datos).eq('id', id))
    } else {
      ;({ error } = await supabase.from('agenda_carpetas').insert([{ ...datos, orden: carpetas.length + 1 }]))
    }
    if (error) { errEl.textContent = 'Error al guardar: ' + error.message; return }
    document.getElementById('agModalCarpeta').classList.remove('activo')
    await cargarCarpetas()
    if (id && carpetaActualId === Number(id)) window._agAbrirCarpeta(Number(id))
  })

  window._agAbrirCarpeta = async function (id) {
    carpetaActualId = id
    const c = carpetas.find(x => x.id === id)
    if (!c) return
    document.getElementById('agCarpetasGrid-wrap').style.display = 'none'
    document.getElementById('agCarpetaDetalle').style.display = 'block'
    document.getElementById('agCarpetaDetColor').style.background = c.color
    document.getElementById('agCarpetaDetNombre').textContent = c.nombre
    document.getElementById('agNuevaNotaInput').value = ''
    await cargarNotas(id)
  }

  document.getElementById('agBtnVolverCarpetas').addEventListener('click', renderCarpetasGrid)
  document.getElementById('agBtnEditarCarpeta').addEventListener('click', () => window._agAbrirModalCarpeta(carpetaActualId))
  document.getElementById('agBtnEliminarCarpeta').addEventListener('click', async () => {
    if (!confirm('¿Eliminar esta carpeta y todo lo que tiene adentro?')) return
    const { error } = await supabase.from('agenda_carpetas').delete().eq('id', carpetaActualId)
    if (error) { alert('Error: ' + error.message); return }
    await cargarCarpetas()
  })

  async function cargarNotas(carpetaId) {
    const { data, error } = await supabase.from('agenda_notas').select('*').eq('carpeta_id', carpetaId).order('orden', { ascending: true }).order('id', { ascending: true })
    if (error) { console.error('[agenda] error al cargar notas:', error); return }
    renderNotas(data || [])
  }

  function renderNotas(notas) {
    const lista = document.getElementById('agNotasLista')
    const empty = document.getElementById('agNotasEmpty')
    if (!notas.length) { lista.innerHTML = ''; empty.style.display = 'block'; return }
    empty.style.display = 'none'
    lista.innerHTML = notas.map(n => `
      <div class="ag-nota-item">
        <button class="ag-nota-item__check ${n.hecho?'hecho':''}" onclick="window._agToggleNota(${n.id})">✓</button>
        <span class="ag-nota-item__texto ${n.hecho?'hecho':''}">${n.texto}</span>
        <button class="ag-nota-item__del" onclick="window._agEliminarNota(${n.id})">🗑</button>
      </div>
    `).join('')
  }

  async function agregarNota() {
    const input = document.getElementById('agNuevaNotaInput')
    const texto = input.value.trim()
    if (!texto || !carpetaActualId) return
    const { error } = await supabase.from('agenda_notas').insert([{ carpeta_id: carpetaActualId, texto }])
    if (error) { alert('Error: ' + error.message); return }
    input.value = ''
    await cargarNotas(carpetaActualId)
    await cargarCarpetas() // refrescar conteos (queda oculto detrás, se recalcula al volver)
    document.getElementById('agCarpetasGrid-wrap').style.display = 'none'
    document.getElementById('agCarpetaDetalle').style.display = 'block'
  }
  document.getElementById('agBtnAgregarNota').addEventListener('click', agregarNota)
  document.getElementById('agNuevaNotaInput').addEventListener('keydown', e => { if (e.key === 'Enter') agregarNota() })

  window._agToggleNota = async function (id) {
    // buscar estado actual releyendo del DOM sería frágil — releemos la nota puntual
    const { data } = await supabase.from('agenda_notas').select('hecho').eq('id', id).limit(1)
    const actual = data?.[0]?.hecho || false
    const { error } = await supabase.from('agenda_notas').update({ hecho: !actual }).eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
    await cargarNotas(carpetaActualId)
  }

  window._agEliminarNota = async function (id) {
    const { error } = await supabase.from('agenda_notas').delete().eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
    await cargarNotas(carpetaActualId)
  }

  // ══════════════════════════════════════════
  //  NOTAS RÁPIDAS (corcho tipo post-it)
  // ══════════════════════════════════════════
  async function cargarCorcho() {
    const { data, error } = await supabase.from('agenda_notas_rapidas').select('*').order('orden', { ascending: true }).order('id', { ascending: true })
    if (error) { console.error('[agenda] error al cargar corcho:', error); return }
    renderCorcho(data || [])
  }

  function renderCorcho(notas) {
    const cont = document.getElementById('agCorcho')
    const tiles = notas.map(n => `
      <div class="ag-postit" style="background:${n.color};transform:rotate(${n.rotacion}deg)">
        <p class="ag-postit__texto">${n.texto}</p>
        <button class="ag-postit__del" onclick="window._agEliminarNotaRapida(${n.id})">🗑</button>
      </div>
    `).join('')
    cont.innerHTML = tiles + `<button class="ag-corcho-add" id="agBtnNuevaNotaRapida">+</button>`
    document.getElementById('agBtnNuevaNotaRapida').addEventListener('click', abrirModalNotaRapida)
  }

  function abrirModalNotaRapida() {
    document.getElementById('agNotaRapidaTexto').value = ''
    document.getElementById('agNotaRapidaError').textContent = ''
    document.querySelectorAll('#agNotaRapidaColores .ag-swatch').forEach((b,i) => b.classList.toggle('activo', i === 0))
    document.getElementById('agModalNotaRapida').classList.add('activo')
  }
  document.getElementById('agBtnCerrarModalNotaRapida').addEventListener('click', () => document.getElementById('agModalNotaRapida').classList.remove('activo'))

  document.getElementById('agNotaRapidaColores').addEventListener('click', e => {
    const btn = e.target.closest('.ag-swatch')
    if (!btn) return
    document.querySelectorAll('#agNotaRapidaColores .ag-swatch').forEach(b => b.classList.remove('activo'))
    btn.classList.add('activo')
  })

  document.getElementById('agBtnGuardarNotaRapida').addEventListener('click', async () => {
    const errEl = document.getElementById('agNotaRapidaError')
    const texto = document.getElementById('agNotaRapidaTexto').value.trim()
    if (!texto) { errEl.textContent = 'Escribí algo primero.'; return }
    const colorBtn = document.querySelector('#agNotaRapidaColores .ag-swatch.activo')
    const color = colorBtn ? colorBtn.dataset.color : '#f5e06a'
    const rotacion = Math.floor(Math.random() * 11) - 5 // -5° a +5°, look "clavado" prolijo pero no perfecto
    const { error } = await supabase.from('agenda_notas_rapidas').insert([{ texto, color, rotacion }])
    if (error) { errEl.textContent = 'Error al guardar: ' + error.message; return }
    document.getElementById('agModalNotaRapida').classList.remove('activo')
    await cargarCorcho()
  })

  window._agEliminarNotaRapida = async function (id) {
    const { error } = await supabase.from('agenda_notas_rapidas').delete().eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
    await cargarCorcho()
  }

  // ══════════════════════════════════════════
  //  FINANZAS (ingresos/gastos, categorías, reembolsos)
  // ══════════════════════════════════════════
  let categorias = []
  let billeteras = []
  let movimientos = []
  let periodoActual = 'mes'
  let pieNaturaleza = 'gasto'
  let filtroCategoriaFinId = null
  let movModalNaturaleza = 'ingreso'

  function fmtMonto(n) {
    return '$' + Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }

  function rangoPeriodo(periodo) {
    const hoy = new Date()
    if (periodo === 'mes') {
      const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      return { desde: desde.toISOString().slice(0,10), hasta: hoyISO() }
    }
    if (periodo === 'anio') {
      const desde = new Date(hoy.getFullYear(), 0, 1)
      return { desde: desde.toISOString().slice(0,10), hasta: hoyISO() }
    }
    return { desde: '1900-01-01', hasta: '2999-12-31' }
  }

  async function cargarCategoriasFin() {
    const { data, error } = await supabase.from('finanzas_categorias').select('*').order('naturaleza').order('orden', { ascending: true }).order('id', { ascending: true })
    if (error) { console.error('[agenda] error al cargar categorías fin:', error); return }
    categorias = data || []
  }

  async function cargarBilleterasFin() {
    const { data, error } = await supabase.from('finanzas_billeteras').select('*').order('orden', { ascending: true }).order('id', { ascending: true })
    if (error) { console.error('[agenda] error al cargar billeteras:', error); return }
    billeteras = data || []
  }

  document.getElementById('agFinPeriodo').addEventListener('click', e => {
    const btn = e.target.closest('.ag-fin-periodo__btn')
    if (!btn) return
    document.querySelectorAll('.ag-fin-periodo__btn').forEach(b => b.classList.remove('activo'))
    btn.classList.add('activo')
    periodoActual = btn.dataset.periodo
    filtroCategoriaFinId = null
    cargarFinanzas()
  })

  async function cargarFinanzas() {
    const { desde, hasta } = rangoPeriodo(periodoActual)
    const { data, error } = await supabase.from('finanzas_movimientos').select('*')
      .gte('fecha', desde).lte('fecha', hasta).order('fecha', { ascending: false }).order('id', { ascending: false })
    if (error) { console.error('[agenda] error al cargar movimientos:', error); return }
    movimientos = data || []
    renderFinStats()
    renderFinPie()
    await renderFinMovs()
  }

  function renderFinStats() {
    const ingresos = movimientos.filter(m => m.naturaleza === 'ingreso').reduce((a,m) => a + Number(m.monto), 0)
    const gastos = movimientos.filter(m => m.naturaleza === 'gasto').reduce((a,m) => a + Number(m.monto), 0)
    const balance = ingresos - gastos
    document.getElementById('agFinIngresos').textContent = fmtMonto(ingresos)
    document.getElementById('agFinGastos').textContent = fmtMonto(gastos)
    document.getElementById('agFinBalance').textContent = fmtMonto(balance)
    const card = document.getElementById('agFinBalanceCard')
    card.className = 'ag-stat-card' + (balance < 0 ? ' ag-stat-card--danger' : '')
    document.getElementById('agFinBalance').style.color = balance < 0 ? '#d94060' : '#4ecca3'
  }

  document.getElementById('agFinPieToggle').addEventListener('click', e => {
    const btn = e.target.closest('.ag-fin-pie-toggle__btn')
    if (!btn) return
    document.querySelectorAll('.ag-fin-pie-toggle__btn').forEach(b => b.classList.remove('activo'))
    btn.classList.add('activo')
    pieNaturaleza = btn.dataset.nat
    document.getElementById('agFinPieLabel').textContent = pieNaturaleza === 'gasto' ? 'Gastos por categoría' : 'Ingresos por categoría'
    renderFinPie()
  })

  function renderFinPie() {

    const gastos = movimientos.filter(m => m.naturaleza === pieNaturaleza)
    const porCat = {}
    gastos.forEach(m => { porCat[m.categoria_id] = (porCat[m.categoria_id] || 0) + Number(m.monto) })
    const total = Object.values(porCat).reduce((a,b) => a+b, 0)
    const pie = document.getElementById('agFinPie')
    const empty = document.getElementById('agFinPieEmpty')
    const leyenda = document.getElementById('agFinLeyenda')

    if (!total) {
      pie.style.background = 'var(--bg3)'
      empty.style.display = 'block'
      leyenda.innerHTML = ''
      return
    }
    empty.style.display = 'none'

    let acumulado = 0
    const stops = []
    const filas = Object.entries(porCat)
      .sort((a,b) => b[1]-a[1])
      .map(([catId, monto]) => {
        const c = categorias.find(x => x.id == catId) || { nombre: 'Sin categoría', color: '#607080' }
        const pct = (monto / total) * 100
        stops.push(`${c.color} ${acumulado}% ${acumulado+pct}%`)
        acumulado += pct
        return { catId: Number(catId), nombre: c.nombre, color: c.color, monto, pct }
      })

    pie.style.background = `conic-gradient(${stops.join(', ')})`
    leyenda.innerHTML = filas.map(f => `
      <div class="ag-fin-leyenda__fila ${filtroCategoriaFinId===f.catId?'ag-fin-leyenda__fila--activa':''}" onclick="window._agFiltrarPorCategoriaFin(${f.catId})">
        <span class="ag-fin-leyenda__dot" style="background:${f.color}"></span>
        ${f.nombre} · ${fmtMonto(f.monto)}
        <span class="ag-fin-leyenda__pct">${f.pct.toFixed(0)}%</span>
      </div>
    `).join('')
  }

  window._agFiltrarPorCategoriaFin = function (catId) {
    filtroCategoriaFinId = (filtroCategoriaFinId === catId) ? null : catId
    renderFinPie()
    renderFinMovs()
  }

  async function renderFinMovs() {
    const cont = document.getElementById('agFinMovs')
    const empty = document.getElementById('agFinMovsEmpty')

    // Chip de filtro activo (arriba de la lista de movimientos)
    let chipCont = document.getElementById('agFinFiltroChip')
    if (!chipCont) {
      chipCont = document.createElement('div')
      chipCont.id = 'agFinFiltroChip'
      cont.parentNode.insertBefore(chipCont, cont)
    }
    if (filtroCategoriaFinId) {
      const c = categorias.find(x => x.id === filtroCategoriaFinId)
      chipCont.innerHTML = `<div class="ag-fin-filtro-chip">Filtrando por: <strong>${c ? c.nombre : 'categoría'}</strong> <button onclick="window._agFiltrarPorCategoriaFin(${filtroCategoriaFinId})">✕ quitar</button></div>`
    } else {
      chipCont.innerHTML = ''
    }

    const visibles = filtroCategoriaFinId ? movimientos.filter(m => m.categoria_id === filtroCategoriaFinId) : movimientos
    if (!visibles.length) { cont.innerHTML = ''; empty.style.display = 'block'; return }
    empty.style.display = 'none'

    // Los gastos reembolsados pueden ser de otro período — buscamos los que falten
    const idsFaltantes = [...new Set(visibles.filter(m => m.gasto_relacionado_id && !movimientos.some(x => x.id === m.gasto_relacionado_id)).map(m => m.gasto_relacionado_id))]
    let gastosRelacionados = {}
    if (idsFaltantes.length) {
      const { data } = await supabase.from('finanzas_movimientos').select('id, descripcion, categoria_id').in('id', idsFaltantes)
      ;(data || []).forEach(g => { gastosRelacionados[g.id] = g })
    }
    movimientos.forEach(m => { if (m.gasto_relacionado_id) gastosRelacionados[m.id] = gastosRelacionados[m.id] || m })

    cont.innerHTML = visibles.map(m => {
      const c = categorias.find(x => x.id === m.categoria_id) || { nombre: 'Sin categoría', color: '#607080' }
      const bil = billeteras.find(x => x.id === m.billetera_id)
      const esIngreso = m.naturaleza === 'ingreso'
      let reembolsoHtml = ''
      if (esIngreso && m.gasto_relacionado_id) {
        const g = movimientos.find(x => x.id === m.gasto_relacionado_id) || gastosRelacionados[m.gasto_relacionado_id]
        const gc = g ? (categorias.find(x => x.id === g.categoria_id) || {}).nombre : null
        reembolsoHtml = `<p class="ag-fin-mov__abril">💗 Reembolso de: ${g ? (g.descripcion || gc || 'gasto') : 'un gasto'}</p>`
      }
      return `<div class="ag-fin-mov">
        <span class="ag-fin-mov__icon" style="background:${c.color}33">${esIngreso?'💚':'💸'}</span>
        <div class="ag-fin-mov__body">
          <p class="ag-fin-mov__cat">${m.descripcion || c.nombre}</p>
          <p class="ag-fin-mov__desc">${m.descripcion ? c.nombre+' · ' : ''}${formatearFecha(m.fecha)}${bil ? ' · '+bil.nombre : ''}</p>
          ${reembolsoHtml}
        </div>
        <span class="ag-fin-mov__monto ${esIngreso?'ag-fin-mov__monto--ingreso':'ag-fin-mov__monto--gasto'}">${esIngreso?'+':'-'}${fmtMonto(m.monto)}</span>
        <div class="ag-fin-mov__acciones">
          <button class="ag-item__btn" title="Editar" onclick="window._agAbrirModalMov(${m.id})">✎</button>
          <button class="ag-item__btn" title="Eliminar" onclick="window._agEliminarMov(${m.id})">🗑</button>
        </div>
      </div>`
    }).join('')
  }

  // ── Modal nuevo/editar movimiento ──
  document.getElementById('agBtnNuevoMov').addEventListener('click', () => window._agAbrirModalMov(null))

  document.getElementById('agMovNaturaleza').addEventListener('click', e => {
    const btn = e.target.closest('.ag-pago-btn')
    if (!btn) return
    movModalNaturaleza = btn.dataset.nat
    document.querySelectorAll('#agMovNaturaleza .ag-pago-btn').forEach(b => b.classList.remove('activo-pagado','activo-pendiente'))
    btn.classList.add(movModalNaturaleza === 'ingreso' ? 'activo-pagado' : 'activo-pendiente')
    document.getElementById('agMovReembolsoWrap').style.display = movModalNaturaleza === 'ingreso' ? 'block' : 'none'
    if (movModalNaturaleza === 'ingreso') poblarSelectReembolso()
    renderMovCategoriaSelect(null)
  })

  let movModalCategoriaId = null
  function renderMovCategoriaSelect(seleccionarId) {
    const cont = document.getElementById('agMovCategoriaSelect')
    const filtradas = categorias.filter(c => c.naturaleza === movModalNaturaleza)
    movModalCategoriaId = seleccionarId || (filtradas[0] ? filtradas[0].id : null)
    cont.innerHTML = filtradas.map(c => `<button type="button" class="ag-tipo-btn ${c.id===movModalCategoriaId?'activo':''}" data-cat-id="${c.id}" style="${c.id===movModalCategoriaId?'border-color:'+c.color+';background:'+c.color+'22;color:'+c.color:''}">${c.nombre}</button>`).join('')
      || '<p style="color:var(--muted);font-size:.76rem">No hay categorías de este tipo — creá una en "⚙ Categorías".</p>'
  }
  document.getElementById('agMovCategoriaSelect').addEventListener('click', e => {
    const btn = e.target.closest('.ag-tipo-btn')
    if (!btn) return
    movModalCategoriaId = Number(btn.dataset.catId)
    renderMovCategoriaSelect(movModalCategoriaId)
  })

  let movModalBilleteraId = null
  function renderMovBilleteraSelect(seleccionarId) {
    const cont = document.getElementById('agMovBilleteraSelect')
    movModalBilleteraId = seleccionarId || (billeteras[0] ? billeteras[0].id : null)
    cont.innerHTML = billeteras.map(b => `<button type="button" class="ag-tipo-btn ${b.id===movModalBilleteraId?'activo':''}" data-bil-id="${b.id}" style="${b.id===movModalBilleteraId?'border-color:'+b.color+';background:'+b.color+'22;color:'+b.color:''}">${b.nombre}</button>`).join('')
      || '<p style="color:var(--muted);font-size:.76rem">No hay billeteras cargadas — creá una en "💳 Billeteras".</p>'
  }
  document.getElementById('agMovBilleteraSelect').addEventListener('click', e => {
    const btn = e.target.closest('.ag-tipo-btn')
    if (!btn) return
    movModalBilleteraId = Number(btn.dataset.bilId)
    renderMovBilleteraSelect(movModalBilleteraId)
  })

  window._agAbrirModalMov = async function (id) {
    const m = id ? movimientos.find(x => x.id === id) : null
    document.getElementById('agModalMovTitulo').textContent = m ? 'Editar movimiento' : 'Nuevo movimiento'
    document.getElementById('agMovId').value = m ? m.id : ''
    movModalNaturaleza = m ? m.naturaleza : 'ingreso'
    document.querySelectorAll('#agMovNaturaleza .ag-pago-btn').forEach(b => {
      b.classList.remove('activo-pagado','activo-pendiente')
      if (b.dataset.nat === movModalNaturaleza) b.classList.add(movModalNaturaleza === 'ingreso' ? 'activo-pagado' : 'activo-pendiente')
    })
    document.getElementById('agMovReembolsoWrap').style.display = movModalNaturaleza === 'ingreso' ? 'block' : 'none'
    renderMovCategoriaSelect(m ? m.categoria_id : null)
    renderMovBilleteraSelect(m ? m.billetera_id : null)
    document.getElementById('agMovMonto').value = m ? m.monto : ''
    document.getElementById('agMovDesc').value = m ? (m.descripcion || '') : ''
    document.getElementById('agMovFecha').value = m ? m.fecha : hoyISO()
    if (movModalNaturaleza === 'ingreso') await poblarSelectReembolso(m ? m.gasto_relacionado_id : null)
    document.getElementById('agMovError').textContent = ''
    document.getElementById('agModalMov').classList.add('activo')
  }
  document.getElementById('agBtnCerrarModalMov').addEventListener('click', () => document.getElementById('agModalMov').classList.remove('activo'))

  async function poblarSelectReembolso(seleccionarId) {
    const sel = document.getElementById('agMovReembolsoSelect')
    const { data } = await supabase.from('finanzas_movimientos').select('id, monto, descripcion, categoria_id, fecha')
      .eq('naturaleza', 'gasto').order('fecha', { ascending: false }).order('id', { ascending: false }).limit(60)
    sel.innerHTML = '<option value="">No, es un ingreso normal</option>' + (data || []).map(g => {
      const c = categorias.find(x => x.id === g.categoria_id)
      const label = `${formatearFecha(g.fecha)} · ${c ? c.nombre : 'Sin categoría'} · ${g.descripcion || 'sin descripción'} · ${fmtMonto(g.monto)}`
      return `<option value="${g.id}" ${seleccionarId===g.id?'selected':''}>${label}</option>`
    }).join('')
  }

  document.getElementById('agBtnGuardarMov').addEventListener('click', async () => {
    const errEl = document.getElementById('agMovError')
    const id = document.getElementById('agMovId').value
    const monto = parseFloat(document.getElementById('agMovMonto').value)
    if (!movModalCategoriaId) { errEl.textContent = 'Elegí una categoría.'; return }
    if (!monto || monto <= 0) { errEl.textContent = 'Ingresá un monto válido.'; return }
    const datos = {
      categoria_id: movModalCategoriaId,
      billetera_id: movModalBilleteraId,
      naturaleza: movModalNaturaleza,
      monto,
      descripcion: document.getElementById('agMovDesc').value.trim(),
      fecha: document.getElementById('agMovFecha').value || hoyISO(),
      monto_a_cobrar: null,
      monto_cobrado: 0,
      gasto_relacionado_id: (movModalNaturaleza === 'ingreso' && document.getElementById('agMovReembolsoSelect').value)
        ? Number(document.getElementById('agMovReembolsoSelect').value) : null,
    }
    let error
    if (id) {
      ;({ error } = await supabase.from('finanzas_movimientos').update(datos).eq('id', id))
    } else {
      ;({ error } = await supabase.from('finanzas_movimientos').insert([{ ...datos, monto_cobrado: 0 }]))
    }
    if (error) { errEl.textContent = 'Error al guardar: ' + error.message; return }
    document.getElementById('agModalMov').classList.remove('activo')
    await cargarFinanzas()
  })

  window._agEliminarMov = async function (id) {
    if (!confirm('¿Eliminar este movimiento?')) return
    const { error } = await supabase.from('finanzas_movimientos').delete().eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
    await cargarFinanzas()
  }

  // ── Gestor de billeteras/bancos ──
  document.getElementById('agBtnBilleteras').addEventListener('click', () => {
    renderBilleterasLista()
    resetFormBilletera()
    document.getElementById('agModalBilleteras').classList.add('activo')
  })
  document.getElementById('agBtnCerrarModalBilleteras').addEventListener('click', () => document.getElementById('agModalBilleteras').classList.remove('activo'))

  function renderBilleterasLista() {
    const cont = document.getElementById('agBilleterasLista')
    if (!billeteras.length) { cont.innerHTML = '<p style="color:var(--muted);font-size:.78rem">Todavía no hay billeteras.</p>'; return }
    cont.innerHTML = billeteras.map(b => `
      <div class="ag-tipo-row">
        <div class="ag-tipo-row__color" style="background:${b.color}"></div>
        <span class="ag-tipo-row__nombre">${b.nombre}</span>
        <button class="ag-item__btn" title="Editar" onclick="window._agEditarBilletera(${b.id})">✎</button>
        <button class="ag-item__btn" title="Eliminar" onclick="window._agEliminarBilletera(${b.id})">🗑</button>
      </div>`).join('')
  }

  function resetFormBilletera() {
    document.getElementById('agBilleteraEditId').value = ''
    document.getElementById('agBilleteraNombre').value = ''
    document.getElementById('agBilleteraColor').value = '#159A9C'
    document.getElementById('agBilleteraError').textContent = ''
    document.getElementById('agBtnGuardarBilletera').textContent = 'Agregar'
    document.getElementById('agBtnCancelarEdicionBilletera').style.display = 'none'
  }

  window._agEditarBilletera = function (id) {
    const b = billeteras.find(x => x.id === id)
    if (!b) return
    document.getElementById('agBilleteraEditId').value = b.id
    document.getElementById('agBilleteraNombre').value = b.nombre
    document.getElementById('agBilleteraColor').value = b.color
    document.getElementById('agBtnGuardarBilletera').textContent = 'Guardar cambios'
    document.getElementById('agBtnCancelarEdicionBilletera').style.display = 'inline-flex'
  }
  document.getElementById('agBtnCancelarEdicionBilletera').addEventListener('click', resetFormBilletera)

  window._agEliminarBilletera = async function (id) {
    if (!confirm('¿Eliminar esta billetera? Los movimientos que ya la usan no se borran, solo quedan sin billetera.')) return
    const { error } = await supabase.from('finanzas_billeteras').delete().eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
    await cargarBilleterasFin()
    renderBilleterasLista()
    await cargarFinanzas()
  }

  document.getElementById('agBtnGuardarBilletera').addEventListener('click', async () => {
    const errEl = document.getElementById('agBilleteraError')
    const id = document.getElementById('agBilleteraEditId').value
    const datos = {
      nombre: document.getElementById('agBilleteraNombre').value.trim(),
      color: document.getElementById('agBilleteraColor').value,
    }
    if (!datos.nombre) { errEl.textContent = 'El nombre es obligatorio.'; return }
    let error
    if (id) {
      ;({ error } = await supabase.from('finanzas_billeteras').update(datos).eq('id', id))
    } else {
      ;({ error } = await supabase.from('finanzas_billeteras').insert([{ ...datos, orden: billeteras.length + 1 }]))
    }
    if (error) { errEl.textContent = 'Error al guardar: ' + error.message; return }
    await cargarBilleterasFin()
    renderBilleterasLista()
    resetFormBilletera()
    await cargarFinanzas()
  })

  // ── Gestor de categorías de finanzas ──
  let categoriaFinNaturalezaForm = 'ingreso'
  document.getElementById('agBtnCategorias').addEventListener('click', () => {
    renderCategoriasFinLista()
    resetFormCategoriaFin()
    document.getElementById('agModalCategorias').classList.add('activo')
  })
  document.getElementById('agBtnCerrarModalCategorias').addEventListener('click', () => document.getElementById('agModalCategorias').classList.remove('activo'))

  document.getElementById('agCategoriaNaturaleza').addEventListener('click', e => {
    const btn = e.target.closest('.ag-pago-btn')
    if (!btn) return
    categoriaFinNaturalezaForm = btn.dataset.nat
    document.querySelectorAll('#agCategoriaNaturaleza .ag-pago-btn').forEach(b => b.classList.remove('activo-pagado','activo-pendiente'))
    btn.classList.add(categoriaFinNaturalezaForm === 'ingreso' ? 'activo-pagado' : 'activo-pendiente')
  })

  function renderCategoriasFinLista() {
    const cont = document.getElementById('agCategoriasLista')
    if (!categorias.length) { cont.innerHTML = '<p style="color:var(--muted);font-size:.78rem">Todavía no hay categorías.</p>'; return }
    cont.innerHTML = ['ingreso','gasto'].map(nat => {
      const filtradas = categorias.filter(c => c.naturaleza === nat)
      if (!filtradas.length) return ''
      return `<p style="font-size:.66rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin:.8rem 0 .4rem">${nat==='ingreso'?'💚 Ingresos':'💸 Gastos'}</p>` +
        filtradas.map(c => `
          <div class="ag-tipo-row">
            <div class="ag-tipo-row__color" style="background:${c.color}"></div>
            <span class="ag-tipo-row__nombre">${c.nombre}</span>
            <button class="ag-item__btn" title="Editar" onclick="window._agEditarCategoriaFin(${c.id})">✎</button>
            <button class="ag-item__btn" title="Eliminar" onclick="window._agEliminarCategoriaFin(${c.id})">🗑</button>
          </div>`).join('')
    }).join('')
  }

  function resetFormCategoriaFin() {
    document.getElementById('agCategoriaEditId').value = ''
    document.getElementById('agCategoriaNombre').value = ''
    document.getElementById('agCategoriaColor').value = '#159A9C'
    document.getElementById('agCategoriaError').textContent = ''
    document.getElementById('agBtnGuardarCategoria').textContent = 'Agregar'
    document.getElementById('agBtnCancelarEdicionCategoria').style.display = 'none'
  }

  window._agEditarCategoriaFin = function (id) {
    const c = categorias.find(x => x.id === id)
    if (!c) return
    document.getElementById('agCategoriaEditId').value = c.id
    document.getElementById('agCategoriaNombre').value = c.nombre
    document.getElementById('agCategoriaColor').value = c.color
    categoriaFinNaturalezaForm = c.naturaleza
    document.querySelectorAll('#agCategoriaNaturaleza .ag-pago-btn').forEach(b => {
      b.classList.remove('activo-pagado','activo-pendiente')
      if (b.dataset.nat === c.naturaleza) b.classList.add(c.naturaleza === 'ingreso' ? 'activo-pagado' : 'activo-pendiente')
    })
    document.getElementById('agBtnGuardarCategoria').textContent = 'Guardar cambios'
    document.getElementById('agBtnCancelarEdicionCategoria').style.display = 'inline-flex'
  }
  document.getElementById('agBtnCancelarEdicionCategoria').addEventListener('click', resetFormCategoriaFin)

  window._agEliminarCategoriaFin = async function (id) {
    if (!confirm('¿Eliminar esta categoría? Los movimientos que ya la usan no se borran, pero quedan sin categoría.')) return
    const { error } = await supabase.from('finanzas_categorias').delete().eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
    await cargarCategoriasFin()
    renderCategoriasFinLista()
    await cargarFinanzas()
  }

  document.getElementById('agBtnGuardarCategoria').addEventListener('click', async () => {
    const errEl = document.getElementById('agCategoriaError')
    const id = document.getElementById('agCategoriaEditId').value
    const datos = {
      nombre: document.getElementById('agCategoriaNombre').value.trim(),
      color: document.getElementById('agCategoriaColor').value,
      naturaleza: categoriaFinNaturalezaForm,
    }
    if (!datos.nombre) { errEl.textContent = 'El nombre es obligatorio.'; return }
    let error
    if (id) {
      ;({ error } = await supabase.from('finanzas_categorias').update(datos).eq('id', id))
    } else {
      ;({ error } = await supabase.from('finanzas_categorias').insert([{ ...datos, orden: categorias.length + 1 }]))
    }
    if (error) { errEl.textContent = 'Error al guardar: ' + error.message; return }
    await cargarCategoriasFin()
    renderCategoriasFinLista()
    resetFormCategoriaFin()
    await cargarFinanzas()
  })

  // ══════════════════════════════════════════
  //  ESTUDIO — temporizador, tareas, exámenes y resumen semanal
  // ══════════════════════════════════════════
  let tareas = []
  let examenes = []
  let sesiones = []

  let timerModo = 'estudio'       // 'estudio' | 'descanso'
  let timerDuracionEstudio = 15   // minutos, elegido con los botones rápidos
  const TIMER_DURACION_DESCANSO = 5
  let timerSegundosRestantes = timerDuracionEstudio * 60
  let timerInterval = null
  let timerPausado = false
  let timerFinTimestamp = null    // Date.now() del momento en que el ciclo actual debería terminar
  let estudioCargado = false

  async function cargarEstudioTab() {
    if (!estudioCargado) { actualizarDisplayTimer(); estudioCargado = true }
    await Promise.all([cargarTareas(), cargarExamenes(), cargarSesiones()])
    renderResumenSemanal()
  }

  function formatoMMSS(totalSeg) {
    const m = Math.floor(totalSeg / 60), s = totalSeg % 60
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
  }

  function actualizarDisplayTimer() {
    document.getElementById('agTimerDisplay').textContent = formatoMMSS(timerSegundosRestantes)
    const modoEl = document.getElementById('agTimerModo')
    modoEl.textContent = timerModo === 'estudio' ? 'Estudio' : 'Descanso'
    modoEl.className = 'ag-timer-modo' + (timerModo === 'descanso' ? ' ag-timer-modo--descanso' : '')
  }

  function actualizarCiclosHoy() {
    const n = sesiones.filter(s => s.fecha === hoyISO()).length
    document.getElementById('agTimerCiclosHoy').textContent = n
  }

  // Beep simple con Web Audio — no depende de ningún archivo de sonido externo
  function sonarBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      ;[0, 0.32, 0.64].forEach(delay => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = 880
        gain.gain.value = 0.16
        osc.connect(gain); gain.connect(ctx.destination)
        osc.start(ctx.currentTime + delay)
        osc.stop(ctx.currentTime + delay + 0.26)
      })
    } catch (e) { /* si el navegador bloquea audio sin interacción previa, no pasa nada grave */ }
  }

  // Importante: el navegador puede frenar los setInterval de una pestaña que
  // quedó en segundo plano (para ahorrar batería), así que un tick del
  // intervalo NO siempre dura exactamente 1 segundo real. Por eso acá no
  // restamos "1" en cada tick — calculamos los segundos restantes comparando
  // la hora actual contra el momento exacto en que el ciclo debería terminar.
  // Así, aunque el navegador dispare los ticks más espaciados de lo normal,
  // el conteo siempre muestra el tiempo real que falta, sin atrasarse.
  function iniciarIntervaloTimer() {
    clearInterval(timerInterval)
    timerFinTimestamp = Date.now() + timerSegundosRestantes * 1000
    timerInterval = setInterval(() => {
      const restante = Math.round((timerFinTimestamp - Date.now()) / 1000)
      timerSegundosRestantes = Math.max(0, restante)
      if (timerSegundosRestantes <= 0) { terminarCicloTimer(); return }
      actualizarDisplayTimer()
    }, 1000)
  }

  async function terminarCicloTimer() {
    sonarBeep()
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(timerModo === 'estudio' ? '⏱️ ¡Tiempo de estudio terminado!' : '☕ Fin del descanso', {
        body: timerModo === 'estudio' ? 'Tomate un descanso de 5 minutos.' : 'Volvamos a estudiar.'
      })
    }
    if (timerModo === 'estudio') {
      await registrarSesion(timerDuracionEstudio)
      timerModo = 'descanso'
      timerSegundosRestantes = TIMER_DURACION_DESCANSO * 60
    } else {
      timerModo = 'estudio'
      timerSegundosRestantes = timerDuracionEstudio * 60
    }
    actualizarDisplayTimer()
    iniciarIntervaloTimer() // el ciclo siguiente arranca solo
  }

  document.querySelectorAll('#agTimerDuraciones .ag-tipo-btn').forEach(btn => {
    if (Number(btn.dataset.min) === timerDuracionEstudio) btn.classList.add('activo')
    btn.addEventListener('click', () => {
      document.querySelectorAll('#agTimerDuraciones .ag-tipo-btn').forEach(b => b.classList.remove('activo'))
      btn.classList.add('activo')
      timerDuracionEstudio = Number(btn.dataset.min)
      if (!timerInterval && timerModo === 'estudio') {
        timerSegundosRestantes = timerDuracionEstudio * 60
        actualizarDisplayTimer()
      }
    })
  })

  document.getElementById('agTimerBtnIniciar').addEventListener('click', () => {
    document.getElementById('agTimerBtnIniciar').style.display = 'none'
    document.getElementById('agTimerBtnPausar').style.display = 'inline-flex'
    document.getElementById('agTimerBtnDetener').style.display = 'inline-flex'
    timerPausado = false
    iniciarIntervaloTimer()
  })
  document.getElementById('agTimerBtnPausar').addEventListener('click', () => {
    timerPausado = !timerPausado
    const btn = document.getElementById('agTimerBtnPausar')
    if (timerPausado) { clearInterval(timerInterval); btn.textContent = '▶ Reanudar' }
    else { iniciarIntervaloTimer(); btn.textContent = '⏸ Pausar' }
  })
  document.getElementById('agTimerBtnDetener').addEventListener('click', () => {
    clearInterval(timerInterval); timerInterval = null
    timerModo = 'estudio'
    timerSegundosRestantes = timerDuracionEstudio * 60
    timerPausado = false
    document.getElementById('agTimerBtnIniciar').style.display = 'inline-flex'
    document.getElementById('agTimerBtnPausar').style.display = 'none'
    document.getElementById('agTimerBtnPausar').textContent = '⏸ Pausar'
    document.getElementById('agTimerBtnDetener').style.display = 'none'
    actualizarDisplayTimer()
  })

  // ── Sesiones (historial + resumen semanal) ─────────────────────────
  async function registrarSesion(minutos) {
    const { error } = await supabase.from('estudio_sesiones').insert([{ fecha: hoyISO(), minutos }])
    if (error) { console.error('[estudio] error al registrar sesión:', error); return }
    await cargarSesiones()
    renderResumenSemanal()
  }

  async function cargarSesiones() {
    const desde = new Date(); desde.setDate(desde.getDate() - 6)
    const desdeISO = desde.getFullYear() + '-' + String(desde.getMonth()+1).padStart(2,'0') + '-' + String(desde.getDate()).padStart(2,'0')
    const { data, error } = await supabase.from('estudio_sesiones').select('*').gte('fecha', desdeISO).order('fecha', { ascending: true })
    if (error) { console.error('[estudio] error al cargar sesiones:', error); return }
    sesiones = data || []
    actualizarCiclosHoy()
  }

  function renderResumenSemanal() {
    const porDia = {}
    const dias = []
    const hoy = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy); d.setDate(d.getDate() - i)
      const iso = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
      dias.push({ iso, nombre: d.toLocaleDateString('es-AR', { weekday: 'short' }) })
      porDia[iso] = 0
    }
    sesiones.forEach(s => { if (porDia[s.fecha] !== undefined) porDia[s.fecha] += s.minutos })

    const total = Object.values(porDia).reduce((a, b) => a + b, 0)
    const pie = document.getElementById('agEstudioPie')
    const empty = document.getElementById('agEstudioPieEmpty')
    const leyenda = document.getElementById('agEstudioLeyenda')
    document.getElementById('agEstudioTotalSemana').textContent = total + ' min'

    if (!total) {
      pie.style.background = 'var(--bg3)'
      empty.style.display = 'block'
      leyenda.innerHTML = ''
      return
    }
    empty.style.display = 'none'

    const colores = ['#159A9C', '#9d7fe8', '#e8608f', '#3ecf8e', '#f59e0b', '#4f8ff7', '#d1495b']
    let acumulado = 0
    const stops = []
    const filas = dias.map((d, i) => {
      const min = porDia[d.iso]
      const pct = (min / total) * 100
      if (min > 0) { stops.push(`${colores[i]} ${acumulado}% ${acumulado + pct}%`); acumulado += pct }
      return { nombre: d.nombre, min, color: colores[i], pct }
    })
    pie.style.background = stops.length ? `conic-gradient(${stops.join(', ')})` : 'var(--bg3)'
    leyenda.innerHTML = filas.filter(f => f.min > 0).map(f => `
      <div class="ag-fin-leyenda__fila">
        <span class="ag-fin-leyenda__dot" style="background:${f.color}"></span>
        ${f.nombre} · ${f.min} min
        <span class="ag-fin-leyenda__pct">${f.pct.toFixed(0)}%</span>
      </div>
    `).join('')
  }

  // ── Tareas de estudio (agrupadas por materia) ──────────────────────
  async function cargarTareas() {
    const { data, error } = await supabase.from('estudio_tareas').select('*').order('orden', { ascending: true }).order('id', { ascending: true })
    if (error) { console.error('[estudio] error al cargar tareas:', error); return }
    tareas = data || []
    renderTareas()
  }

  function renderTareas() {
    const cont = document.getElementById('agTareasLista')
    const empty = document.getElementById('agTareasEmpty')
    if (tareas.length === 0) { cont.innerHTML = ''; empty.style.display = 'block'; return }
    empty.style.display = 'none'

    const grupos = {}
    tareas.forEach(t => { const key = t.materia || 'Sin materia'; (grupos[key] = grupos[key] || []).push(t) })

    cont.innerHTML = Object.entries(grupos).map(([materia, lista]) => `
      <div class="ag-materia-grupo">
        <p class="ag-materia-grupo__titulo">${materia}</p>
        <div class="ag-notas-lista">
          ${lista.map(t => `
            <div class="ag-nota-item">
              <button class="ag-nota-item__check ${t.hecha ? 'hecho' : ''}" onclick="window._agToggleTarea(${t.id})">✓</button>
              <span class="ag-nota-item__texto ${t.hecha ? 'hecho' : ''}">${t.texto}</span>
              <button class="ag-nota-item__del" onclick="window._agEliminarTarea(${t.id})">🗑</button>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')
  }

  window._agToggleTarea = async function (id) {
    const t = tareas.find(x => x.id === id)
    if (!t) return
    const { error } = await supabase.from('estudio_tareas').update({ hecha: !t.hecha }).eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
    await cargarTareas()
  }
  window._agEliminarTarea = async function (id) {
    if (!confirm('¿Eliminar esta tarea?')) return
    const { error } = await supabase.from('estudio_tareas').delete().eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
    await cargarTareas()
  }

  document.getElementById('agBtnAgregarTarea').addEventListener('click', async () => {
    const texto = document.getElementById('agTareaInput').value.trim()
    const materia = document.getElementById('agTareaMateriaInput').value.trim()
    if (!texto) return
    const { error } = await supabase.from('estudio_tareas').insert([{ texto, materia: materia || null, orden: tareas.length }])
    if (error) { alert('Error: ' + error.message); return }
    document.getElementById('agTareaInput').value = ''
    document.getElementById('agTareaMateriaInput').value = ''
    await cargarTareas()
  })

  // ── Exámenes (cuenta regresiva) ─────────────────────────────────────
  async function cargarExamenes() {
    const { data, error } = await supabase.from('estudio_examenes').select('*').order('fecha', { ascending: true })
    if (error) { console.error('[estudio] error al cargar exámenes:', error); return }
    examenes = data || []
    renderExamenBanner()
    renderExamenesLista()
  }

  function renderExamenBanner() {
    const banner = document.getElementById('agExamenBanner')
    const proximo = examenes.filter(e => diasHasta(e.fecha) >= 0).sort((a, b) => diasHasta(a.fecha) - diasHasta(b.fecha))[0]
    if (!proximo) { banner.style.display = 'none'; return }
    const dias = diasHasta(proximo.fecha)
    banner.style.display = 'block'
    document.getElementById('agExamenBannerTexto').innerHTML = dias === 0
      ? `🎯 <strong>${proximo.nombre}</strong> es hoy — ¡mucha suerte!`
      : `🎯 Faltan <strong>${dias}</strong> día${dias === 1 ? '' : 's'} para <strong>${proximo.nombre}</strong>`
  }

  function renderExamenesLista() {
    const cont = document.getElementById('agExamenesLista')
    if (examenes.length === 0) { cont.innerHTML = '<p class="ag-empty">Todavía no cargaste ningún examen.</p>'; return }
    cont.innerHTML = examenes.map(e => {
      const dias = diasHasta(e.fecha)
      const pasado = dias < 0
      const texto = pasado ? 'Ya pasó' : (dias === 0 ? 'Hoy' : `Faltan ${dias} día${dias === 1 ? '' : 's'}`)
      return `
      <div class="ag-examen-row">
        <span class="ag-examen-row__nombre">${e.nombre}</span>
        <span class="ag-examen-row__dias ${pasado ? 'ag-examen-row__dias--pasado' : ''}">${texto}</span>
        <button class="ag-item__btn" onclick="window._agEliminarExamen(${e.id})">🗑</button>
      </div>`
    }).join('')
  }

  window._agEliminarExamen = async function (id) {
    if (!confirm('¿Eliminar este examen?')) return
    const { error } = await supabase.from('estudio_examenes').delete().eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
    await cargarExamenes()
  }

  document.getElementById('agBtnNuevoExamen').addEventListener('click', () => {
    const wrap = document.getElementById('agExamenAddWrap')
    wrap.style.display = wrap.style.display === 'flex' ? 'none' : 'flex'
  })
  document.getElementById('agBtnGuardarExamen').addEventListener('click', async () => {
    const nombre = document.getElementById('agExamenNombreInput').value.trim()
    const fecha = document.getElementById('agExamenFechaInput').value
    const errEl = document.getElementById('agExamenError')
    errEl.textContent = ''
    if (!nombre || !fecha) { errEl.textContent = 'Completá nombre y fecha.'; return }
    const { error } = await supabase.from('estudio_examenes').insert([{ nombre, fecha }])
    if (error) { errEl.textContent = 'Error: ' + error.message; return }
    document.getElementById('agExamenNombreInput').value = ''
    document.getElementById('agExamenFechaInput').value = ''
    document.getElementById('agExamenAddWrap').style.display = 'none'
    await cargarExamenes()
  })

  // ══════════════════════════════════════════
  //  PANTALLA — carga manual de tiempo de uso, con categorías propias
  // ══════════════════════════════════════════
  let pantallaFechaSeleccionada = hoyISO()
  let pantallaRegistrosDia = []
  let pantallaRegistrosSemana = []
  let pantallaCategorias = []
  let pantallaCategoriaSeleccionadaId = null
  let pantallaCargada = false

  const COLORES_PANTALLA = ['#159A9C', '#9d7fe8', '#e8608f', '#3ecf8e', '#f59e0b', '#4f8ff7', '#d1495b', '#c9973a']
  const COLOR_SIN_CATEGORIA = '#607080'

  function formatoHorasMin(totalMin) {
    if (!totalMin) return '0 min'
    const h = Math.floor(totalMin / 60), m = totalMin % 60
    if (h === 0) return `${m} min`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  async function cargarPantallaTab() {
    if (!pantallaCargada) {
      document.getElementById('agPantallaFechaInput').value = pantallaFechaSeleccionada
      pantallaCargada = true
    }
    await cargarCategoriasPantalla()
    await cargarPantallaDia()
    await cargarPantallaSemana()
    await cargarPantallaStats()
  }

  // ── Categorías propias (nombre + color) ────────────────────────────
  async function cargarCategoriasPantalla() {
    const { data, error } = await supabase.from('pantalla_categorias').select('*').order('orden', { ascending: true }).order('id', { ascending: true })
    if (error) { console.error('[pantalla] error al cargar categorías:', error); return }
    pantallaCategorias = data || []
    if (pantallaCategoriaSeleccionadaId === null && pantallaCategorias.length > 0) pantallaCategoriaSeleccionadaId = pantallaCategorias[0].id
    renderPantallaCategoriaSelect()
  }

  function renderPantallaCategoriaSelect() {
    const cont = document.getElementById('agPantallaCategoriaSelect')
    if (pantallaCategorias.length === 0) {
      cont.innerHTML = '<p style="font-size:.78rem;color:var(--muted);margin:0 0 .8rem">Todavía no creaste ninguna categoría. Tocá "⚙ Categorías" para agregar la primera.</p>'
      return
    }
    cont.innerHTML = pantallaCategorias.map(c => `
      <button type="button" class="ag-tipo-btn" data-cat-id="${c.id}"
        style="${c.id === pantallaCategoriaSeleccionadaId ? `border-color:${c.color};background:${c.color}22;color:${c.color}` : ''}">
        ${c.nombre}
      </button>
    `).join('')
    cont.querySelectorAll('.ag-tipo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        pantallaCategoriaSeleccionadaId = Number(btn.dataset.catId)
        renderPantallaCategoriaSelect()
      })
    })
  }

  document.getElementById('agBtnCategoriasPantalla').addEventListener('click', () => {
    renderCategoriasPantallaLista()
    resetFormCategoriaPantalla()
    document.getElementById('agModalCategoriasPantalla').classList.add('activo')
  })
  document.getElementById('agBtnCerrarModalCategoriasPantalla').addEventListener('click', () =>
    document.getElementById('agModalCategoriasPantalla').classList.remove('activo'))

  function renderCategoriasPantallaLista() {
    const cont = document.getElementById('agCategoriasPantallaLista')
    if (!pantallaCategorias.length) { cont.innerHTML = '<p style="color:var(--muted);font-size:.78rem">Todavía no hay categorías.</p>'; return }
    cont.innerHTML = pantallaCategorias.map(c => `
      <div class="ag-tipo-row">
        <div class="ag-tipo-row__color" style="background:${c.color}"></div>
        <span class="ag-tipo-row__nombre">${c.nombre}</span>
        <button class="ag-item__btn" title="Editar" onclick="window._agEditarCategoriaPantalla(${c.id})">✎</button>
        <button class="ag-item__btn" title="Eliminar" onclick="window._agEliminarCategoriaPantalla(${c.id})">🗑</button>
      </div>
    `).join('')
  }

  function resetFormCategoriaPantalla() {
    document.getElementById('agCategoriaPantallaEditId').value = ''
    document.getElementById('agCategoriaPantallaNombre').value = ''
    document.getElementById('agCategoriaPantallaColor').value = '#159A9C'
    document.getElementById('agCategoriaPantallaError').textContent = ''
    document.getElementById('agBtnGuardarCategoriaPantalla').textContent = 'Agregar'
    document.getElementById('agBtnCancelarEdicionCategoriaPantalla').style.display = 'none'
  }

  window._agEditarCategoriaPantalla = function (id) {
    const c = pantallaCategorias.find(x => x.id === id)
    if (!c) return
    document.getElementById('agCategoriaPantallaEditId').value = c.id
    document.getElementById('agCategoriaPantallaNombre').value = c.nombre
    document.getElementById('agCategoriaPantallaColor').value = c.color
    document.getElementById('agBtnGuardarCategoriaPantalla').textContent = 'Guardar cambios'
    document.getElementById('agBtnCancelarEdicionCategoriaPantalla').style.display = 'inline-flex'
  }
  document.getElementById('agBtnCancelarEdicionCategoriaPantalla').addEventListener('click', resetFormCategoriaPantalla)

  window._agEliminarCategoriaPantalla = async function (id) {
    if (!confirm('¿Eliminar esta categoría? Los registros que ya la usan quedan sin categoría, pero no se borran.')) return
    const { error } = await supabase.from('pantalla_categorias').delete().eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
    if (pantallaCategoriaSeleccionadaId === id) pantallaCategoriaSeleccionadaId = null
    await cargarCategoriasPantalla()
    renderCategoriasPantallaLista()
    await cargarPantallaDia()
    await cargarPantallaSemana()
    await cargarPantallaStats()
  }

  document.getElementById('agBtnGuardarCategoriaPantalla').addEventListener('click', async () => {
    const errEl = document.getElementById('agCategoriaPantallaError')
    const id = document.getElementById('agCategoriaPantallaEditId').value
    const datos = {
      nombre: document.getElementById('agCategoriaPantallaNombre').value.trim(),
      color: document.getElementById('agCategoriaPantallaColor').value,
    }
    if (!datos.nombre) { errEl.textContent = 'El nombre es obligatorio.'; return }
    let error
    if (id) {
      ;({ error } = await supabase.from('pantalla_categorias').update(datos).eq('id', id))
    } else {
      ;({ error } = await supabase.from('pantalla_categorias').insert([{ ...datos, orden: pantallaCategorias.length }]))
    }
    if (error) { errEl.textContent = 'Error al guardar: ' + error.message; return }
    await cargarCategoriasPantalla()
    renderCategoriasPantallaLista()
    resetFormCategoriaPantalla()
    await cargarPantallaDia()
    await cargarPantallaSemana()
    await cargarPantallaStats()
  })

  // ── Carga y borrado de registros de uso ────────────────────────────
  document.getElementById('agPantallaFechaInput').addEventListener('change', async e => {
    pantallaFechaSeleccionada = e.target.value || hoyISO()
    await cargarPantallaDia()
  })

  async function cargarPantallaDia() {
    document.getElementById('agPantallaFechaLabel').textContent =
      new Date(pantallaFechaSeleccionada + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const { data, error } = await supabase.from('pantalla_registros')
      .select('*, categoria:pantalla_categorias(id,nombre,color)')
      .eq('fecha', pantallaFechaSeleccionada).order('id', { ascending: true })
    if (error) { console.error('[pantalla] error al cargar el día:', error); return }
    pantallaRegistrosDia = data || []
    renderPantallaDia()
  }

  function nombreDe(r) { return r.categoria ? r.categoria.nombre : (r.app || 'Sin categoría') }
  function colorDe(r) { return r.categoria ? r.categoria.color : COLOR_SIN_CATEGORIA }

  function renderPantallaDia() {
    const cont = document.getElementById('agPantallaLista')
    const listaEmpty = document.getElementById('agPantallaListaEmpty')
    if (pantallaRegistrosDia.length === 0) {
      cont.innerHTML = ''
      listaEmpty.style.display = 'block'
    } else {
      listaEmpty.style.display = 'none'
      cont.innerHTML = pantallaRegistrosDia.map(r => `
        <div class="ag-examen-row">
          <div class="ag-tipo-row__color" style="background:${colorDe(r)};flex-shrink:0"></div>
          <span class="ag-examen-row__nombre">${nombreDe(r)}</span>
          <span class="ag-examen-row__dias">${formatoHorasMin(r.minutos)}</span>
          <button class="ag-item__btn" onclick="window._agEliminarPantalla(${r.id})">🗑</button>
        </div>
      `).join('')
    }

    const total = pantallaRegistrosDia.reduce((a, r) => a + r.minutos, 0)
    document.getElementById('agPantallaTotalDia').textContent = formatoHorasMin(total)
    const pie = document.getElementById('agPantallaPie')
    const pieEmpty = document.getElementById('agPantallaPieEmpty')
    const leyenda = document.getElementById('agPantallaLeyenda')

    if (!total) {
      pie.style.background = 'var(--bg3)'
      pieEmpty.style.display = 'block'
      leyenda.innerHTML = ''
      return
    }
    pieEmpty.style.display = 'none'

    const porCat = {}
    pantallaRegistrosDia.forEach(r => {
      const key = nombreDe(r)
      if (!porCat[key]) porCat[key] = { min: 0, color: colorDe(r) }
      porCat[key].min += r.minutos
    })
    let acumulado = 0
    const stops = []
    const filas = Object.entries(porCat).sort((a, b) => b[1].min - a[1].min).map(([nombre, info]) => {
      const pct = (info.min / total) * 100
      stops.push(`${info.color} ${acumulado}% ${acumulado + pct}%`)
      acumulado += pct
      return { nombre, min: info.min, color: info.color, pct }
    })
    pie.style.background = `conic-gradient(${stops.join(', ')})`
    leyenda.innerHTML = filas.map(f => `
      <div class="ag-fin-leyenda__fila">
        <span class="ag-fin-leyenda__dot" style="background:${f.color}"></span>
        ${f.nombre} · ${formatoHorasMin(f.min)}
        <span class="ag-fin-leyenda__pct">${f.pct.toFixed(0)}%</span>
      </div>
    `).join('')
  }

  document.getElementById('agBtnAgregarPantalla').addEventListener('click', async () => {
    const errEl = document.getElementById('agPantallaError')
    errEl.textContent = ''
    if (!pantallaCategoriaSeleccionadaId) { errEl.textContent = 'Elegí una categoría (o creá una con "⚙ Categorías").'; return }
    const hs = Number(document.getElementById('agPantallaHsInput').value) || 0
    const min = Number(document.getElementById('agPantallaMinInput').value) || 0
    const minutos = hs * 60 + min
    if (minutos <= 0) { errEl.textContent = 'Cargá al menos algún minuto u hora.'; return }
    const { error } = await supabase.from('pantalla_registros').insert([{ fecha: pantallaFechaSeleccionada, categoria_id: pantallaCategoriaSeleccionadaId, minutos }])
    if (error) { errEl.textContent = 'Error: ' + error.message; return }
    document.getElementById('agPantallaHsInput').value = ''
    document.getElementById('agPantallaMinInput').value = ''
    await cargarPantallaDia()
    await cargarPantallaSemana()
    await cargarPantallaStats()
  })

  window._agEliminarPantalla = async function (id) {
    if (!confirm('¿Eliminar este registro?')) return
    const { error } = await supabase.from('pantalla_registros').delete().eq('id', id)
    if (error) { alert('Error: ' + error.message); return }
    await cargarPantallaDia()
    await cargarPantallaSemana()
    await cargarPantallaStats()
  }

  async function cargarPantallaSemana() {
    const desde = new Date(); desde.setDate(desde.getDate() - 6)
    const desdeISO = desde.getFullYear() + '-' + String(desde.getMonth()+1).padStart(2,'0') + '-' + String(desde.getDate()).padStart(2,'0')
    const { data, error } = await supabase.from('pantalla_registros').select('*').gte('fecha', desdeISO)
    if (error) { console.error('[pantalla] error al cargar la semana:', error); return }
    pantallaRegistrosSemana = data || []
    renderPantallaSemana()
  }

  function renderPantallaSemana() {
    const porDia = {}
    const dias = []
    const hoy = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy); d.setDate(d.getDate() - i)
      const iso = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
      dias.push({ iso, nombre: d.toLocaleDateString('es-AR', { weekday: 'short' }) })
      porDia[iso] = 0
    }
    pantallaRegistrosSemana.forEach(r => { if (porDia[r.fecha] !== undefined) porDia[r.fecha] += r.minutos })

    const total = Object.values(porDia).reduce((a, b) => a + b, 0)
    document.getElementById('agPantallaTotalSemana').textContent = formatoHorasMin(total)
    const pie = document.getElementById('agPantallaSemanaPie')
    const empty = document.getElementById('agPantallaSemanaPieEmpty')
    const leyenda = document.getElementById('agPantallaSemanaLeyenda')

    if (!total) {
      pie.style.background = 'var(--bg3)'
      empty.style.display = 'block'
      leyenda.innerHTML = ''
      return
    }
    empty.style.display = 'none'

    let acumulado = 0
    const stops = []
    const filas = dias.map((d, i) => {
      const min = porDia[d.iso]
      const pct = (min / total) * 100
      if (min > 0) { stops.push(`${COLORES_PANTALLA[i]} ${acumulado}% ${acumulado + pct}%`); acumulado += pct }
      return { nombre: d.nombre, min, color: COLORES_PANTALLA[i], pct }
    })
    pie.style.background = stops.length ? `conic-gradient(${stops.join(', ')})` : 'var(--bg3)'
    leyenda.innerHTML = filas.filter(f => f.min > 0).map(f => `
      <div class="ag-fin-leyenda__fila">
        <span class="ag-fin-leyenda__dot" style="background:${f.color}"></span>
        ${f.nombre} · ${formatoHorasMin(f.min)}
        <span class="ag-fin-leyenda__pct">${f.pct.toFixed(0)}%</span>
      </div>
    `).join('')
  }

  // ── Estadísticas (período elegible: 7 / 30 días / todo) ────────────
  let pantallaStatsPeriodo = '7'
  let pantallaRegistrosStats = []

  document.getElementById('agPantallaStatsPeriodo').addEventListener('click', async e => {
    const btn = e.target.closest('.ag-fin-periodo__btn')
    if (!btn) return
    document.querySelectorAll('#agPantallaStatsPeriodo .ag-fin-periodo__btn').forEach(b => b.classList.remove('activo'))
    btn.classList.add('activo')
    pantallaStatsPeriodo = btn.dataset.dias
    await cargarPantallaStats()
  })

  async function cargarPantallaStats() {
    let query = supabase.from('pantalla_registros').select('*, categoria:pantalla_categorias(id,nombre,color)').order('fecha', { ascending: true })
    if (pantallaStatsPeriodo !== 'todo') {
      const desde = new Date(); desde.setDate(desde.getDate() - (Number(pantallaStatsPeriodo) - 1))
      const desdeISO = desde.getFullYear() + '-' + String(desde.getMonth()+1).padStart(2,'0') + '-' + String(desde.getDate()).padStart(2,'0')
      query = query.gte('fecha', desdeISO)
    }
    const { data, error } = await query
    if (error) { console.error('[pantalla] error al cargar estadísticas:', error); return }
    pantallaRegistrosStats = data || []
    renderPantallaStats()
  }

  function renderPantallaStats() {
    const lista = document.getElementById('agPantallaStatsLista')
    const empty = document.getElementById('agPantallaStatsEmpty')
    const diasInfoEl = document.getElementById('agPStatDiasRegistrados')

    if (pantallaRegistrosStats.length === 0) {
      document.getElementById('agPStatTotal').textContent = '0h'
      document.getElementById('agPStatPromedio').textContent = '0h'
      document.getElementById('agPStatTop').textContent = '—'
      document.getElementById('agPStatRecord').textContent = '—'
      diasInfoEl.textContent = ''
      lista.innerHTML = ''
      empty.style.display = 'block'
      return
    }
    empty.style.display = 'none'

    const totalGeneral = pantallaRegistrosStats.reduce((a, r) => a + r.minutos, 0)

    // Cuántos días abarca el período (para el promedio diario "real", contando
    // también los días en los que no cargaste nada)
    let periodDays
    if (pantallaStatsPeriodo === 'todo') {
      const fechas = pantallaRegistrosStats.map(r => r.fecha).sort()
      const primera = new Date(fechas[0] + 'T00:00:00')
      const hoy = new Date(hoyISO() + 'T00:00:00')
      periodDays = Math.max(1, Math.round((hoy - primera) / 86400000) + 1)
    } else {
      periodDays = Number(pantallaStatsPeriodo)
    }

    document.getElementById('agPStatTotal').textContent = formatoHorasMin(totalGeneral)
    document.getElementById('agPStatPromedio').textContent = formatoHorasMin(Math.round(totalGeneral / periodDays))

    const porCat = {}
    const porFecha = {}
    pantallaRegistrosStats.forEach(r => {
      const nombre = nombreDe(r), color = colorDe(r)
      if (!porCat[nombre]) porCat[nombre] = { nombre, color, total: 0 }
      porCat[nombre].total += r.minutos
      porFecha[r.fecha] = (porFecha[r.fecha] || 0) + r.minutos
    })

    const filas = Object.values(porCat).sort((a, b) => b.total - a.total).map(c => ({
      ...c,
      pct: (c.total / totalGeneral) * 100,
      promedio: c.total / periodDays,
    }))

    document.getElementById('agPStatTop').textContent = filas.length ? filas[0].nombre : '—'

    const fechasConRegistro = Object.keys(porFecha)
    const diaRecordEntry = Object.entries(porFecha).sort((a, b) => b[1] - a[1])[0]
    if (diaRecordEntry) {
      const [fecha, min] = diaRecordEntry
      const fechaFmt = new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
      document.getElementById('agPStatRecord').textContent = `${fechaFmt} · ${formatoHorasMin(min)}`
    }

    diasInfoEl.textContent = `Cargaste datos en ${fechasConRegistro.length} de los últimos ${periodDays} día${periodDays === 1 ? '' : 's'}.`

    lista.innerHTML = filas.map(f => `
      <div class="ag-examen-row">
        <div class="ag-tipo-row__color" style="background:${f.color};flex-shrink:0"></div>
        <span class="ag-examen-row__nombre">${f.nombre}</span>
        <span style="font-size:.7rem;color:var(--muted);margin-right:.7rem;white-space:nowrap">${f.pct.toFixed(0)}% · prom. ${formatoHorasMin(Math.round(f.promedio))}/día</span>
        <span class="ag-examen-row__dias">${formatoHorasMin(f.total)}</span>
      </div>
    `).join('')
  }

  // ══════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════
  ;(async () => {
    const esAdmin = await chequearAdmin()
    if (!esAdmin) {
      document.getElementById('agNoAuth').style.display = 'block'
      return
    }
    document.getElementById('agContenido').style.display = 'block'
    await cargarTipos()
    await cargarItems()
  })()
})()
