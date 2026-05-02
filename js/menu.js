// ═══════════════════════════════════════════════════
// menu.js — La Madriguera
// ═══════════════════════════════════════════════════

    //  TEMÁTICAS
    // ══════════════════════════════════════════
    let temaActual = ''
    let tematicas  = []

    const TEMAS_DEFAULT = [
      { id: 'pokemon',    nombre: 'Pokémon',       palabras: 'pokemon,pokemón,pokemons' },
      { id: 'starwars',   nombre: 'Star Wars',     palabras: 'star,wars,mandalorian' },
      { id: 'lilo',       nombre: 'Lilo y Stitch', palabras: 'lilo,stitch' },
      { id: 'dragonball', nombre: 'Dragon Ball',   palabras: 'dragon,ball,goku' },
      { id: 'mario',      nombre: 'Mario Bros',    palabras: 'mario,bros,luigi' },
    ]

    function matchTema(prod, palabras) {
      const hay = ((prod.nombre || '') + ' ' + (prod.descripcion || '')).toLowerCase()
      return palabras.split(',').map(p => p.trim().toLowerCase()).some(p => p && hay.includes(p))
    }

    async function cargarTematicas() {
      let data = null
      try { const r = await supabase.from('tematicas').select('*').order('nombre'); data = r.data } catch(e) {}
      tematicas = (data && data.length > 0) ? data : TEMAS_DEFAULT
      renderTemaDropdown()
    }

    function renderTemaDropdown() {
      const lista = document.getElementById('temasLista')
      if (!lista) return
      lista.innerHTML = tematicas.map(t =>
        `<button class="tema-option${temaActual === String(t.id) ? ' activo' : ''}" data-tema="${t.id}">${t.nombre}</button>`
      ).join('')
      lista.querySelectorAll('.tema-option').forEach(b =>
        b.addEventListener('click', () => seleccionarTema(b.dataset.tema)))
      const allBtn = document.querySelector('.tema-option--all')
      if (allBtn) {
        allBtn.classList.toggle('activo', !temaActual)
        allBtn.addEventListener('click', () => seleccionarTema(''))
      }
    }

    function seleccionarTema(id) {
      temaActual = id
      const t = tematicas.find(x => String(x.id) === id)
      document.getElementById('btnTemaLabel').textContent = t ? t.nombre : 'Temáticas'
      document.getElementById('btnTemaDropdown').classList.toggle('activo', !!id)
      document.getElementById('temaDropdown').classList.remove('abierto')
      document.querySelectorAll('.tema-option').forEach(b => b.classList.toggle('activo', b.dataset.tema === id))
      const allBtn = document.querySelector('.tema-option--all')
      if (allBtn) allBtn.classList.toggle('activo', !id)
      paginaProductos = 1
      renderProductos()
    }

    document.getElementById('btnTemaDropdown').addEventListener('click', e => {
      e.stopPropagation()
      document.getElementById('temaDropdown').classList.toggle('abierto')
    })
    document.addEventListener('click', () => document.getElementById('temaDropdown')?.classList.remove('abierto'))
    document.getElementById('temaDropdown').addEventListener('click', e => e.stopPropagation())


    // ══════════════════════════════════════════
    //  CARTEL PROMO MAKERS
    // ══════════════════════════════════════════
    window.initMakersPromo = function initMakersPromo() {
      const promo = document.getElementById('makersPromo')
      const closeBtn = document.getElementById('makersPromoClose')
      const promoBtn = document.getElementById('makersPromoBtn')
      if (!promo) return

      // No mostrar si ya lo cerró o si ya tiene perfil maker
      const cerrado = localStorage.getItem('r3d_promo_makers_cerrado')
      if (cerrado) return

      // Mostrar después de 8 segundos solo a usuarios logueados sin perfil maker
      setTimeout(() => {
        if (!usuarioActual) return
        const yaTiene = makersData.find(m => m.user_id === usuarioActual.id)
        if (yaTiene) return
        promo.classList.add('activo')
      }, 8000)

      closeBtn.addEventListener('click', () => {
        promo.classList.remove('activo')
        // No volver a mostrar por 24 horas
        localStorage.setItem('r3d_promo_makers_cerrado', Date.now())
        setTimeout(() => localStorage.removeItem('r3d_promo_makers_cerrado'), 86400000)
      })

      promoBtn.addEventListener('click', () => {
        promo.classList.remove('activo')
        localStorage.setItem('r3d_promo_makers_cerrado', Date.now())
        setTimeout(() => localStorage.removeItem('r3d_promo_makers_cerrado'), 86400000)
      })
    }

    // ══════════════════════════════════════════
    //  MENÚ HAMBURGUESA MOBILE
    // ══════════════════════════════════════════
    const btnHamburguesa    = document.getElementById('btnHamburguesa')
    const mobileMenu        = document.getElementById('mobileMenu')
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay')

    function abrirMenu() {
      mobileMenu.classList.add('activo')
      mobileMenuOverlay.classList.add('activo')
      btnHamburguesa.classList.add('activo')
      document.body.style.overflow = 'hidden'
    }
    function cerrarMenu() {
      mobileMenu.classList.remove('activo')
      mobileMenuOverlay.classList.remove('activo')
      btnHamburguesa.classList.remove('activo')
      document.body.style.overflow = ''
    }

    btnHamburguesa.addEventListener('click', () => {
      mobileMenu.classList.contains('activo') ? cerrarMenu() : abrirMenu()
    })
    mobileMenuOverlay.addEventListener('click', cerrarMenu)
    document.getElementById('btnCerrarMenu').addEventListener('click', cerrarMenu)

    // Cerrar al hacer click en cualquier link del menú
    document.querySelectorAll('.mobile-menu__link').forEach(link => {
      link.addEventListener('click', cerrarMenu)
    })

    // Botón usuario en menú mobile
    document.getElementById('mm-btnUser').addEventListener('click', () => {
      cerrarMenu()
      document.getElementById('btnUserLogin').click()
    })

    // Botón favoritos en menú mobile
    document.getElementById('mm-btnFav').addEventListener('click', () => {
      cerrarMenu()
      document.getElementById('btnFavoritos').click()
    })

    // Sincronizar badge de favoritos con el menú mobile
    const _actualizarBadgesOrig = actualizarBadges
    actualizarBadges = function() {
      _actualizarBadgesOrig()
      const mmBadge = document.getElementById('mm-badgeFav')
      if (mmBadge) {
        mmBadge.textContent = favoritos.length
        mmBadge.style.display = favoritos.length > 0 ? 'inline-flex' : 'none'
      }
    }

    // Sincronizar label de usuario en menú mobile — diferido para que admin.js esté cargado
    window.addEventListener('load', function() {
      var _actualizarNavOrig = window.actualizarNavUsuario || function(){}
      window.actualizarNavUsuario = function() {
        _actualizarNavOrig()
        var label = document.getElementById('mm-userLabel')
        if (label) {
          label.textContent = usuarioActual
            ? (perfilUsuario?.nombre || usuarioActual.email)
            : 'Iniciar sesión'
        }
      }
    })
