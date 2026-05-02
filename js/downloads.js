// ═══════════════════════════════════════════════════
// downloads.js — La Madriguera
// ═══════════════════════════════════════════════════

      // LÍMITE DE DESCARGAS — 2 por herramienta sin login, ilimitado con login
      // ══════════════════════════════════════════════════════════════════
      const DESCARGA_LIMITE = 2

      function _dlKey(tool) { return 'lm_dl_' + tool }

      function dlContador(tool) {
        if (usuarioActual) return Infinity  // usuario logueado: ilimitado
        try { return parseInt(localStorage.getItem(_dlKey(tool)) || '0') } catch(e) { return 0 }
      }

      function dlIncrementar(tool) {
        if (usuarioActual) return  // no contar si está logueado
        try {
          var n = dlContador(tool) + 1
          localStorage.setItem(_dlKey(tool), String(n))
        } catch(e) {}
      }

      function dlPuedeDescargar(tool) {
        return usuarioActual || dlContador(tool) < DESCARGA_LIMITE
      }

      function dlRestablecerSiLogin() {
        // Llamar cuando el usuario inicia sesión — limpiar contadores
        ;['tarjetas','mejora','fotoproducto','cajas','costos','presupuesto','llavero','caja','maceta','marco','cortante'].forEach(function(t){
          try { localStorage.removeItem(_dlKey(t)) } catch(e) {}
        })
      }

      function dlMostrarModal(tool, callback) {
        // Modal que pide login mostrando cuántas descargas usó
        var existente = document.getElementById('dl-limit-modal')
        if (existente) existente.remove()

        var modal = document.createElement('div')
        modal.id = 'dl-limit-modal'
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,8,15,.88);display:flex;align-items:center;justify-content:center;padding:1rem'
        modal.innerHTML = `
          <div style="background:var(--bg-card,#0a2535);border:1px solid rgba(21,154,156,.4);border-radius:16px;padding:2rem;max-width:380px;width:100%;text-align:center;display:flex;flex-direction:column;gap:1rem">
            <div style="font-size:2.2rem">🔒</div>
            <h3 style="font-family:var(--font-head);font-size:.9rem;font-weight:700;color:var(--cyan);letter-spacing:.06em;margin:0">DESCARGA GRATUITA AGOTADA</h3>
            <p style="font-size:.78rem;color:var(--text);margin:0;line-height:1.6">
              Usaste tus <strong>${DESCARGA_LIMITE} descargas gratuitas</strong> de esta herramienta.<br>
              Creá una cuenta gratis para descargas ilimitadas.
            </p>
            <div style="display:flex;flex-direction:column;gap:.5rem">
              <button id="dl-limit-login" class="btn btn--primary" style="font-size:.82rem">
                Iniciar sesión / Registrarse gratis
              </button>
              <button id="dl-limit-cerrar" style="background:none;border:none;color:var(--muted);font-size:.72rem;cursor:pointer;padding:.3rem">
                Cancelar
              </button>
            </div>
            <p style="font-size:.65rem;color:var(--muted);margin:0">
              ¿Ya tenés cuenta? Iniciá sesión y las descargas se desbloquean automáticamente.
            </p>
          </div>`

        document.body.appendChild(modal)
        document.getElementById('dl-limit-cerrar').onclick = function() { modal.remove() }
        document.getElementById('dl-limit-login').onclick = function() {
          modal.remove()
          var btn = document.getElementById('btnUserLogin') || document.getElementById('btn-login')
          if (btn) btn.click()
          else window.requireLogin && window.requireLogin(function(){})
        }
        modal.addEventListener('click', function(e){ if(e.target===modal) modal.remove() })
      }

      // Función principal a llamar antes de cada descarga
      // Devuelve true si puede descargar, false si no (y muestra el modal)
      window.dlCheck = function(tool, callback) {
        if (dlPuedeDescargar(tool)) {
          dlIncrementar(tool)
          if (typeof callback === 'function') callback()
          return true
        } else {
          dlMostrarModal(tool)
          return false
        }
      }

      // Resetear al hacer login
      ;(function() {
        var origVerificar = window.verificarSesion || function(){}
        // Interceptar cambio de sesión para resetear contadores
        if (window.supabase && window.supabase.auth) {
          window.supabase.auth.onAuthStateChange(function(event) {
            if (event === 'SIGNED_IN') dlRestablecerSiLogin()
          })
        }
      })()
      // ── Fin sistema de descargas ────────────────────────────────────────

    // ══════════════════════════════════════════
    //  TRACKING DE EVENTOS
    // ══════════════════════════════════════════
    ;(function() {
      // Generar o recuperar session_id para anónimos
      let sessionId = sessionStorage.getItem('lm_session')
      if (!sessionId) {
        sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2,8)
        sessionStorage.setItem('lm_session', sessionId)
      }

      function trackEvento(tipo, herramienta) {
        // Fire-and-forget — no await, no bloqueo
        setTimeout(() => {
          supabase.from('eventos').insert([{
            tipo,
            herramienta: herramienta || null,
            user_id: usuarioActual?.id || null,
            session_id: sessionId
          }]).then(() => {}).catch(() => {})
        }, 2000)  // Esperar 2s para no competir con el init
      }

      // Registrar visita (una vez por sesión)
      if (!sessionStorage.getItem('lm_visited')) {
        sessionStorage.setItem('lm_visited', '1')
        trackEvento('visit', null)
      }

      // Exponer función global para registrar usos y descargas
      window.trackUso      = (herramienta) => trackEvento('tool_use', herramienta)
      window.trackDescarga = (herramienta) => trackEvento('download', herramienta)

      // Auto-trackear apertura de herramientas del Laboratorio 3D
      const _origAbrirH = window.abrirHerramienta
      window.abrirHerramienta = function(id) {
        _origAbrirH(id)
        trackEvento('tool_use', id.replace('modal-',''))
      }

      // Auto-trackear apertura de herramientas de Emprendedores
      const _origAbrirE = window.abrirEmprendedor
      window.abrirEmprendedor = function(id) {
        _origAbrirE(id)
        trackEvento('tool_use', id.replace('modal-',''))
      }

    })()

    // ══════════════════════════════════════════
