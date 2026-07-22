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
      const t = tipoDe(i.tipo_id) || { icono: '📌', color: '#8fa8b2', nombre: '', requiere_pago: false }
      const dias = diasHasta(i.fecha_limite)
      const entregado = i.estado === 'entregado'
      let claseItem = '', claseFecha = 'ag-item__fecha--ok', textoFecha
      if (!entregado && dias < 0)      { claseItem = 'ag-item--vencido';    claseFecha = 'ag-item__fecha--vencido';   textoFecha = `Venció hace ${Math.abs(dias)} día${Math.abs(dias)===1?'':'s'}` }
      else if (!entregado && dias <= DIAS_ALERTA) { claseItem = 'ag-item--por-vencer'; claseFecha = 'ag-item__fecha--por-vencer'; textoFecha = dias===0?'Vence hoy':`Vence en ${dias} día${dias===1?'':'s'}` }
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

  document.getElementById('agVistaToggle').addEventListener('click', e => {
    const btn = e.target.closest('[data-vista]')
    if (!btn) return
    document.querySelectorAll('#agVistaToggle [data-vista]').forEach(b => b.classList.remove('activo'))
    btn.classList.add('activo')
    vistaActual = btn.dataset.vista
    document.getElementById('agVistaLista').style.display = vistaActual === 'lista' ? 'block' : 'none'
    document.getElementById('agVistaCalendario').style.display = vistaActual === 'calendario' ? 'block' : 'none'
    if (vistaActual === 'calendario') renderCalendario()
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
      new Notification('¡Listo! 🔔', { body: 'Vas a recibir avisos acá cuando algo esté por vencer.' })
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
      const cuando = dias < 0 ? `venció hace ${Math.abs(dias)} día(s)` : dias === 0 ? 'vence hoy' : `vence en ${dias} día(s)`
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
