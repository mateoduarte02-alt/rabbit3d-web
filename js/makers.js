// ═══════════════════════════════════════════════════
// makers.js — La Madriguera
// ═══════════════════════════════════════════════════

    //  MAKERS DE LA COMUNIDAD
    // ══════════════════════════════════════════
    let makersData    = []
    let miMaker       = null
    let makerProyectos = []   // array de hasta 6 URLs

    async function cargarMakers() {
      const { data, error } = await supabase
        .from('makers').select('*').order('created_at', { ascending: false })
      if (error) {
        console.warn('[Rabbit3D] Error cargando makers:', error.message)
        // Aun con error, mostrar el CTA para que el usuario pueda unirse
        makersData = []
      } else {
        makersData = data || []
      }
      renderMakers()
    }

    function renderMakers() {
      const grid = document.getElementById('makersGrid')
      const cta  = document.getElementById('makersCta')

      // CTA: mostrar según estado del usuario
      if (usuarioActual) {
        const yaTiene = makersData.find(m => m.user_id === usuarioActual.id)
        if (esAdmin) {
          // Admin: puede editar su perfil + crear perfiles para otros usuarios
          const btnEditar = yaTiene
            ? `<button class="btn btn--primary makers-cta__btn" id="btnEditarMaker">✏️ Editar mi perfil Maker</button>`
            : `<button class="btn btn--primary makers-cta__btn" id="btnUnirMaker">✦ Unirme a la comunidad</button>`
          cta.innerHTML = btnEditar +
            `<button class="btn btn--sm" id="btnCrearMakerAdmin" style="background:var(--bg3);border:1px solid var(--cyan-mid);color:var(--cyan)">
              ➕ Crear perfil para un usuario
            </button>`
          cta.style.display = 'flex'
          if (yaTiene) {
            document.getElementById('btnEditarMaker').addEventListener('click', () => abrirModalMaker(yaTiene, false))
          } else {
            document.getElementById('btnUnirMaker').addEventListener('click', () => abrirModalMaker(null, false))
          }
          document.getElementById('btnCrearMakerAdmin').addEventListener('click', () => abrirModalMaker(null, true))
        } else if (yaTiene) {
          cta.innerHTML = `<button class="btn btn--primary makers-cta__btn" id="btnEditarMaker">✏️ Editar mi perfil Maker</button>`
          cta.style.display = 'flex'
          document.getElementById('btnEditarMaker').addEventListener('click', () => abrirModalMaker(yaTiene, false))
        } else {
          cta.innerHTML = `<button class="btn btn--primary makers-cta__btn" id="btnUnirMaker">✦ Unirme a la comunidad</button>
            <p style="font-size:0.78rem;color:var(--muted);text-align:center">Mostrá tus proyectos a la comunidad</p>`
          cta.style.display = 'flex'
          document.getElementById('btnUnirMaker').addEventListener('click', () => abrirModalMaker(null, false))
        }
      } else {
        cta.innerHTML = `<p class="makers-cta__login"><a href="#" id="btnMakerLogin" style="color:var(--cyan);text-decoration:underline">Iniciá sesión</a> para mostrar tus proyectos a la comunidad</p>`
        cta.style.display = 'flex'
        document.getElementById('btnMakerLogin')?.addEventListener('click', e => {
          e.preventDefault()
          resetUserModal('login')
          document.getElementById('modalUsuario').classList.add('activo')
        })
      }

      // Grid de makers
      if (makersData.length === 0) {
        grid.innerHTML = '<p class="cargando" style="text-align:center;padding:2rem 0">Aún no hay makers en la comunidad. ¡Sé el primero!</p>'
        return
      }

      grid.innerHTML = makersData.map(m => {
        const nombre   = m.nombre || 'Maker'
        const avatar   = m.foto_url
          ? `<img src="${m.foto_url}" alt="${nombre}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
          : `<span style="font-family:var(--font-head);font-size:1.4rem;font-weight:700;color:var(--cyan)">${nombre[0].toUpperCase()}</span>`
        const proyectos = (m.proyectos || []).slice(0, 6)
        const proyGrid  = proyectos.length > 0
          ? `<div class="maker-card__proyectos">
              ${proyectos.map(url => `<div class="maker-card__proyecto"><img src="${url}" alt="proyecto" loading="lazy"/></div>`).join('')}
             </div>`
          : ''
        const igBtn = m.instagram
          ? `<a href="${m.instagram}" target="_blank" rel="noopener" class="maker-card__ig">
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.975-.975 2.242-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.333.014 7.053.072 5.775.13 4.602.402 3.635 1.368 2.668 2.335 2.396 3.508 2.338 4.786 2.28 6.066 2.163 6.474 2.163 12c0 5.526.117 5.934.175 7.214.058 1.278.33 2.451 1.297 3.418.967.967 2.14 1.239 3.418 1.297C8.333 23.986 8.741 24 12 24s3.667-.014 4.947-.072c1.278-.058 2.451-.33 3.418-1.297.967-.967 1.239-2.14 1.297-3.418.058-1.28.072-1.688.072-7.214 0-5.526-.014-5.934-.072-7.214-.058-1.278-.33-2.451-1.297-3.418C19.398.402 18.225.13 16.947.072 15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
              Seguir en Instagram
             </a>`
          : ''
        return `
        <div class="maker-card">
          ${esAdmin ? `<button class="maker-card__admin-del" onclick="window.adminEliminarMaker('${m.id}')" title="Eliminar perfil">✕</button>` : ''}
          <div class="maker-card__header">
            <div class="maker-card__avatar">${avatar}</div>
            <div class="maker-card__info">
              <p class="maker-card__nombre">${nombre}</p>
              ${m.descripcion ? `<p class="maker-card__desc">${m.descripcion}</p>` : ''}
              ${igBtn}
            </div>
          </div>
          ${proyGrid}
        </div>`
      }).join('')
    }

    window.adminEliminarMaker = async (id) => {
      if (!confirm('¿Eliminar este perfil maker?')) return
      const { error } = await supabase.from('makers').delete().eq('id', id)
      if (error) { alert('Error al eliminar: ' + error.message); return }
      await cargarMakers()
    }

    let makerAdminTargetUser = null  // usuario target cuando admin crea perfil para otro

    function abrirModalMaker(maker, modoAdmin = false) {
      miMaker        = maker
      makerProyectos = maker?.proyectos ? [...maker.proyectos] : []
      makerAdminTargetUser = null

      const adminField = document.getElementById('makerAdminUserField')
      const preview    = document.getElementById('makerAdminUserPreview')

      if (modoAdmin) {
        // Modo admin: crear perfil para otro usuario
        document.getElementById('makerModalTitulo').textContent = 'Crear perfil Maker para usuario'
        adminField.style.display = 'block'
        document.getElementById('makerAdminEmail').value = ''
        preview.style.display = 'none'
        document.getElementById('makerEmailSuggestions').innerHTML = ''
        // Limpiar campos
        document.getElementById('makerDesc').value = ''
        document.getElementById('makerInstagram').value = ''
        makerProyectos = []
        // Ocultar avatar y botón eliminar
        document.getElementById('makerModalAvatarImg').style.display = 'none'
        document.getElementById('makerModalAvatarTxt').style.display = 'block'
        document.getElementById('makerModalAvatarTxt').textContent = '?'
        document.getElementById('btnEliminarMaker').style.display = 'none'
      } else {
        // Modo normal: usuario edita su propio perfil
        document.getElementById('makerModalTitulo').textContent = maker ? 'Editar mi perfil Maker' : 'Unirme a la comunidad'
        adminField.style.display = 'none'
        document.getElementById('makerDesc').value      = maker?.descripcion || ''
        document.getElementById('makerInstagram').value = maker?.instagram   || ''
        document.getElementById('btnEliminarMaker').style.display = maker ? 'inline-block' : 'none'
        // Avatar
        const img     = document.getElementById('makerModalAvatarImg')
        const txt     = document.getElementById('makerModalAvatarTxt')
        const fotoUrl = maker?.foto_url || perfilUsuario?.foto_url || null
        const nombre  = maker?.nombre   || perfilUsuario?.nombre   || usuarioActual?.email || '?'
        if (fotoUrl) { img.src = fotoUrl; img.style.display = 'block'; txt.style.display = 'none' }
        else { img.style.display = 'none'; txt.style.display = 'block'; txt.textContent = nombre[0].toUpperCase() }
      }

      document.getElementById('makerError').textContent   = ''
      document.getElementById('makerExito').style.display = 'none'
      renderMakerProyectosGrid()
      document.getElementById('modalMaker').classList.add('activo')
    }

    // ── Autocompletado email admin ──
    document.getElementById('makerAdminEmail').addEventListener('input', async (e) => {
      const q = e.target.value.toLowerCase().trim()
      const suggestions = document.getElementById('makerEmailSuggestions')
      const preview     = document.getElementById('makerAdminUserPreview')
      if (q.length < 2) { suggestions.innerHTML = ''; preview.style.display = 'none'; return }

      // Filtrar usuarios registrados que coincidan
      const matches = todosLosUsuarios.filter(u =>
        (u.email || '').toLowerCase().includes(q) ||
        (u.nombre || '').toLowerCase().includes(q)
      ).slice(0, 5)

      if (matches.length === 0) { suggestions.innerHTML = '<p class="maker-suggestion-empty">No se encontraron usuarios</p>'; return }

      suggestions.innerHTML = matches.map(u => `
        <div class="maker-suggestion-item" onclick="window.seleccionarUsuarioMaker('${u.id}')">
          <div class="maker-suggestion-avatar">${u.foto_url
            ? `<img src="${u.foto_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
            : `<span>${(u.nombre || u.email || '?')[0].toUpperCase()}</span>`}
          </div>
          <div>
            <p style="font-size:0.78rem;font-weight:700;color:var(--text)">${u.nombre || 'Sin nombre'}</p>
            <p style="font-size:0.7rem;color:var(--muted)">${u.email}</p>
          </div>
          ${makersData.find(m => m.user_id === u.id) ? '<span style="font-size:0.6rem;color:var(--cyan);margin-left:auto">Ya tiene maker</span>' : ''}
        </div>`).join('')
    })

    window.seleccionarUsuarioMaker = (uid) => {
      const u = todosLosUsuarios.find(x => x.id === uid)
      if (!u) return
      makerAdminTargetUser = u

      // Ocultar sugerencias
      document.getElementById('makerEmailSuggestions').innerHTML = ''
      document.getElementById('makerAdminEmail').value = u.email

      // Mostrar preview del usuario
      const preview = document.getElementById('makerAdminUserPreview')
      preview.style.display = 'flex'
      const avatarEl = document.getElementById('makerAdminAvatar')
      avatarEl.innerHTML = u.foto_url
        ? `<img src="${u.foto_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`
        : `<span>${(u.nombre || u.email)[0].toUpperCase()}</span>`
      document.getElementById('makerAdminNombre').textContent    = u.nombre || 'Sin nombre'
      document.getElementById('makerAdminEmailLabel').textContent = u.email

      // Autocompletar con datos existentes del maker (si tiene)
      const makerExistente = makersData.find(m => m.user_id === uid)
      if (makerExistente) {
        miMaker = makerExistente
        makerProyectos = [...(makerExistente.proyectos || [])]
        document.getElementById('makerDesc').value      = makerExistente.descripcion || ''
        document.getElementById('makerInstagram').value = makerExistente.instagram   || ''
        document.getElementById('btnEliminarMaker').style.display = 'inline-block'
      } else {
        miMaker = null
        makerProyectos = []
        // Autocompletar con datos del perfil del usuario
        document.getElementById('makerDesc').value      = u.descripcion || ''
        document.getElementById('makerInstagram').value = u.instagram   || ''
        document.getElementById('btnEliminarMaker').style.display = 'none'
      }

      // Actualizar avatar del modal con foto del usuario
      const img = document.getElementById('makerModalAvatarImg')
      const txt = document.getElementById('makerModalAvatarTxt')
      if (u.foto_url) { img.src = u.foto_url; img.style.display = 'block'; txt.style.display = 'none' }
      else { img.style.display = 'none'; txt.style.display = 'block'; txt.textContent = (u.nombre || u.email)[0].toUpperCase() }

      renderMakerProyectosGrid()
    }

    function renderMakerProyectosGrid() {
      const grid = document.getElementById('makerProyectosGrid')
      const slots = []
      for (let i = 0; i < 6; i++) {
        const url = makerProyectos[i] || null
        if (url) {
          slots.push(`
            <div class="maker-proyecto-slot maker-proyecto-slot--filled" data-idx="${i}">
              <img src="${url}" alt="proyecto ${i+1}"/>
              <button class="maker-proyecto-del" onclick="window.makerDelProyecto(${i})" title="Eliminar">✕</button>
            </div>`)
        } else if (makerProyectos.length < 6) {
          slots.push(`
            <div class="maker-proyecto-slot maker-proyecto-slot--add" onclick="window.makerAddProyecto()">
              <span>+</span>
            </div>`)
          break  // solo un slot vacío a la vez
        }
      }
      grid.innerHTML = slots.join('')
    }

    window.makerDelProyecto = (idx) => {
      makerProyectos.splice(idx, 1)
      renderMakerProyectosGrid()
    }

    window.makerAddProyecto = () => {
      const input = document.createElement('input')
      input.type   = 'file'
      input.accept = 'image/*'
      input.onchange = async (e) => {
        const file = e.target.files[0]
        if (!file || !usuarioActual) return
        const errEl = document.getElementById('makerError')
        errEl.textContent = 'Subiendo imagen...'
        const ext      = file.name.split('.').pop()
        const fileName = `maker_${usuarioActual.id}_${Date.now()}.jpg`
        const fileToUpload = await comprimirImagen(file, 900, 900, 0.78)
        const { error: upErr } = await supabase.storage.from('media').upload(fileName, fileToUpload, { upsert: true })
        if (upErr) { errEl.textContent = 'Error al subir: ' + upErr.message; return }
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName)
        makerProyectos.push(urlData.publicUrl)
        errEl.textContent = ''
        renderMakerProyectosGrid()
      }
      input.click()
    }

    // Avatar upload
    document.getElementById('makerModalAvatar').addEventListener('click', () => {
      document.getElementById('makerAvatarFile').click()
    })
    document.getElementById('makerAvatarFile').addEventListener('change', async (e) => {
      const file = e.target.files[0]
      if (!file) return
      if (!usuarioActual) {
        document.getElementById('makerError').textContent = 'Necesitás iniciar sesión para subir una foto.'
        return
      }
      const errEl = document.getElementById('makerError')
      const overlay = document.querySelector('.maker-modal-avatar-overlay')
      if (overlay) overlay.textContent = 'Subiendo...'
      try {
        const fileName = `maker_avatar_${usuarioActual.id}_${Date.now()}.jpg`
        const fileToUpload = await comprimirImagen(file, 400, 400, 0.80)
        const { error: upErr } = await supabase.storage.from('media').upload(fileName, fileToUpload, { upsert: true })
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName)
        const url = urlData.publicUrl
        document.getElementById('makerModalAvatarImg').src = url
        document.getElementById('makerModalAvatarImg').style.display = 'block'
        document.getElementById('makerModalAvatarTxt').style.display = 'none'
        if (!miMaker) miMaker = {}
        miMaker.foto_url = url
        errEl.textContent = ''
      } catch(err) {
        errEl.textContent = 'Error al subir la foto: ' + (err.message || 'intentá de nuevo')
      } finally {
        if (overlay) overlay.textContent = '✎ Cambiar foto'
      }
    })

    // Guardar maker
    document.getElementById('btnGuardarMaker').addEventListener('click', async () => {
      const errEl   = document.getElementById('makerError')
      const exitoEl = document.getElementById('makerExito')
      const btn     = document.getElementById('btnGuardarMaker')
      errEl.textContent = ''; exitoEl.style.display = 'none'

      // Verificar sesión vigente
      if (!usuarioActual) {
        errEl.textContent = 'Tu sesión expiró. Por favor iniciá sesión nuevamente.'
        return
      }
      // Verificar que tenga nombre al menos
      const nombreFinal = perfilUsuario?.nombre || usuarioActual.email.split('@')[0]
      if (!nombreFinal) {
        errEl.textContent = 'Completá tu perfil de usuario antes de crear un perfil Maker.'
        return
      }

      btn.disabled = true; btn.textContent = 'Guardando...'

      const datos = {
        user_id:     usuarioActual.id,
        nombre:      nombreFinal,
        foto_url:    miMaker?.foto_url || perfilUsuario?.foto_url || null,
        descripcion: document.getElementById('makerDesc').value.trim() || null,
        instagram:   document.getElementById('makerInstagram').value.trim() || null,
        proyectos:   makerProyectos.slice(0, 6)
      }

      // Si admin está creando para otro usuario, usar ese user_id
      if (makerAdminTargetUser) {
        datos.user_id = makerAdminTargetUser.id
        datos.nombre  = makerAdminTargetUser.nombre || makerAdminTargetUser.email.split('@')[0]
        datos.foto_url = miMaker?.foto_url || makerAdminTargetUser.foto_url || null
      }
      if (!datos.user_id) { errEl.textContent = 'Seleccioná un usuario primero.'; btn.disabled = false; btn.textContent = 'Guardar perfil'; return }
      const esNuevo = !miMaker?.id
      const { error } = await supabase.from('makers').upsert([datos], { onConflict: 'user_id' })
      btn.disabled = false; btn.textContent = 'Guardar perfil'
      if (error) {
        console.error('Error makers upsert:', error)
        errEl.textContent = 'Error al guardar: ' + (error.message || error.details || 'Error desconocido')
        return
      }

      // Notificar por email:
      // - Si es perfil nuevo con Instagram (cualquier usuario)
      // - Si el admin crea perfil para otro usuario
      const emailDestino = makerAdminTargetUser ? makerAdminTargetUser.email : usuarioActual.email
      const debeNotificar = (esNuevo && datos.instagram) || (esAdmin && makerAdminTargetUser)
      if (debeNotificar) {
        try {
          await supabase.functions.invoke('notify-maker', {
            body: {
              nombre:       datos.nombre,
              instagram:    datos.instagram || 'No cargado',
              email:        emailDestino,
              creadoPorAdmin: !!makerAdminTargetUser
            }
          })
        } catch(e) { console.warn('Notificación no enviada:', e.message) }
      }

      exitoEl.style.display = 'block'
      setTimeout(() => { exitoEl.style.display = 'none' }, 2500)
      await cargarMakers()
    })

    // Eliminar maker — funciona para el propio usuario Y para admin borrando perfil de otro
    document.getElementById('btnEliminarMaker').addEventListener('click', async () => {
      const targetId = makerAdminTargetUser ? makerAdminTargetUser.id : usuarioActual.id
      const targetNombre = makerAdminTargetUser ? (makerAdminTargetUser.nombre || makerAdminTargetUser.email) : 'tu perfil'
      if (!confirm(`¿Eliminar el perfil maker de ${targetNombre}?`)) return
      await supabase.from('makers').delete().eq('user_id', targetId)
      document.getElementById('modalMaker').classList.remove('activo')
      makerAdminTargetUser = null
      await cargarMakers()
    })

    document.getElementById('btnCerrarMaker').addEventListener('click', () => {
      document.getElementById('modalMaker').classList.remove('activo')
    })


    // ══════════════════════════════════════════
