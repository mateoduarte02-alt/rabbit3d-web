// ═══════════════════════════════════════════════════
// mejora.js — La Madriguera
// ═══════════════════════════════════════════════════

    let mejoraImgOrig = null  // HTMLImageElement
    let mejoraEscala  = 2
    const mejoraZone  = document.getElementById('mejoraUploadZone')
    const mejoraFile  = document.getElementById('mejoraImgFile')
    const mejoraInner = document.getElementById('mejoraUploadInner')
    const meCtrls     = document.getElementById('mejoraControles')

    // Upload
    mejoraZone.addEventListener('click', () => mejoraFile.click())
    mejoraFile.addEventListener('change', e => mejoraCargarImg(e.target.files[0]))
    mejoraZone.addEventListener('dragover', e => { e.preventDefault(); mejoraZone.classList.add('mejora-drag') })
    mejoraZone.addEventListener('dragleave', () => mejoraZone.classList.remove('mejora-drag'))
    mejoraZone.addEventListener('drop', e => { e.preventDefault(); mejoraZone.classList.remove('mejora-drag'); mejoraCargarImg(e.dataTransfer.files[0]) })

    function mejoraCargarImg(file) {
      if (!file || !file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = e => {
        const img = new Image()
        img.onload = () => {
          mejoraImgOrig = img
          // Dibujar original en canvas preview
          const c = document.getElementById('mejoraCanvasOrig')
          c.width = img.width; c.height = img.height
          c.getContext('2d').drawImage(img, 0, 0)
          document.getElementById('mejoraDimOrig').textContent = `${img.width}×${img.height}px`
          mejoraInner.style.display = 'none'
          meCtrls.style.display = 'block'
          document.getElementById('btnDescargarMejora').style.display = 'none'
          document.getElementById('mejoraError').textContent = ''
          // Limpiar resultado
          const r = document.getElementById('mejoraCanvasResult')
          r.width = img.width * mejoraEscala; r.height = img.height * mejoraEscala
          r.getContext('2d').clearRect(0, 0, r.width, r.height)
          document.getElementById('mejoraDimResult').textContent = ''
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    }

    // Sliders
    ;[['mejoraSuavizado','mejoraSuavizadoVal'],['mejoraNitidez','mejoraNitidezVal'],
      ['mejoraContraste','mejoraContrasteVal'],['mejoraRuido','mejoraRuidoVal'],
      ['mejoraSat','mejoraSatVal']
    ].forEach(function(pair) { var id=pair[0],vid=pair[1];
      var el = document.getElementById(id)
      if (el) el.addEventListener('input', function() { document.getElementById(vid).textContent = this.value })
    })

    // Escala radio buttons
    document.querySelectorAll('.mejora-radio').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mejora-radio').forEach(b => b.classList.remove('mejora-radio--active'))
        btn.classList.add('mejora-radio--active')
        mejoraEscala = parseInt(btn.dataset.scale)
        document.getElementById('mejoraEscalaVal').textContent = mejoraEscala + '×'
      })
    })

    // ── Algoritmos de mejora ──────────────────────────────────────────

    // Convolución genérica 3×3
    function mejoraConvolucion(src, width, height, kernel, factor, bias) {
      const dst = new Uint8ClampedArray(src.length)
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let r = 0, g = 0, b = 0
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4
              const w = kernel[(ky+1)*3+(kx+1)]
              r += src[idx]   * w
              g += src[idx+1] * w
              b += src[idx+2] * w
            }
          }
          const i = (y * width + x) * 4
          dst[i]   = Math.min(255, Math.max(0, r / factor + bias))
          dst[i+1] = Math.min(255, Math.max(0, g / factor + bias))
          dst[i+2] = Math.min(255, Math.max(0, b / factor + bias))
          dst[i+3] = src[i+3]
        }
      }
      // Copiar bordes del original
      for (let x = 0; x < width; x++) { const i=(x)*4; dst[i]=src[i]; dst[i+1]=src[i+1]; dst[i+2]=src[i+2]; dst[i+3]=src[i+3]; const j=((height-1)*width+x)*4; dst[j]=src[j]; dst[j+1]=src[j+1]; dst[j+2]=src[j+2]; dst[j+3]=src[j+3] }
      for (let y = 0; y < height; y++) { const i=(y*width)*4; dst[i]=src[i]; dst[i+1]=src[i+1]; dst[i+2]=src[i+2]; dst[i+3]=src[i+3]; const j=(y*width+width-1)*4; dst[j]=src[j]; dst[j+1]=src[j+1]; dst[j+2]=src[j+2]; dst[j+3]=src[j+3] }
      return dst
    }

    // Gaussian blur (radio variable: 1..4 pasadas de box blur 3×3)
    function mejoraGaussian(data, width, height, pasadas) {
      const kernel = [1,2,1, 2,4,2, 1,2,1]
      let cur = new Uint8ClampedArray(data)
      for (let p = 0; p < pasadas; p++) cur = mejoraConvolucion(cur, width, height, kernel, 16, 0)
      return cur
    }

    // Unsharp mask: original + alpha*(original - blurred)
    function mejoraUnsharp(data, blurred, width, height, strength) {
      const dst = new Uint8ClampedArray(data.length)
      for (let i = 0; i < data.length; i += 4) {
        dst[i]   = Math.min(255, Math.max(0, data[i]   + strength * (data[i]   - blurred[i])))
        dst[i+1] = Math.min(255, Math.max(0, data[i+1] + strength * (data[i+1] - blurred[i+1])))
        dst[i+2] = Math.min(255, Math.max(0, data[i+2] + strength * (data[i+2] - blurred[i+2])))
        dst[i+3] = data[i+3]
      }
      return dst
    }

    // Ajuste de contraste y saturación
    function mejoraAjustes(data, contraste, saturacion) {
      const dst = new Uint8ClampedArray(data)
      const cf = (259 * (contraste + 255)) / (255 * (259 - contraste))
      for (let i = 0; i < dst.length; i += 4) {
        let r = dst[i], g = dst[i+1], b = dst[i+2]
        // Contraste
        r = cf * (r - 128) + 128
        g = cf * (g - 128) + 128
        b = cf * (b - 128) + 128
        // Saturación via HSL shift simple
        if (saturacion !== 0) {
          const gray = 0.299*r + 0.587*g + 0.114*b
          const sf = 1 + saturacion / 100
          r = gray + sf*(r-gray); g = gray + sf*(g-gray); b = gray + sf*(b-gray)
        }
        dst[i]   = Math.min(255, Math.max(0, r))
        dst[i+1] = Math.min(255, Math.max(0, g))
        dst[i+2] = Math.min(255, Math.max(0, b))
      }
      return dst
    }

    // Median filter 3×3 (reducir ruido puntual)
    function mejoraMedian(data, width, height) {
      const dst = new Uint8ClampedArray(data)
      for (let y = 1; y < height-1; y++) {
        for (let x = 1; x < width-1; x++) {
          const rs=[], gs=[], bs=[]
          for (let ky=-1;ky<=1;ky++) for (let kx=-1;kx<=1;kx++) {
            const idx=((y+ky)*width+(x+kx))*4
            rs.push(data[idx]); gs.push(data[idx+1]); bs.push(data[idx+2])
          }
          rs.sort((a,b)=>a-b); gs.sort((a,b)=>a-b); bs.sort((a,b)=>a-b)
          const i=(y*width+x)*4
          dst[i]=rs[4]; dst[i+1]=gs[4]; dst[i+2]=bs[4]; dst[i+3]=data[i+3]
        }
      }
      return dst
    }

    // Upscale bicúbico via canvas (interpolación del browser)
    function mejoraUpscale(srcCanvas, escala) {
      const dstW = srcCanvas.width * escala
      const dstH = srcCanvas.height * escala
      const dst = document.createElement('canvas')
      dst.width = dstW; dst.height = dstH
      const ctx = dst.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(srcCanvas, 0, 0, dstW, dstH)
      return dst
    }

    // ── Pipeline principal ────────────────────────────────────────────
    document.getElementById('btnMejorar').addEventListener('click', async () => {
      if (!mejoraImgOrig) return
      const btn    = document.getElementById('btnMejorar')
      const errEl  = document.getElementById('mejoraError')
      const result = document.getElementById('mejoraCanvasResult')
      errEl.textContent = ''; btn.disabled = true
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="animation:potencSpin .7s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Procesando...'

      // Yield al browser antes de empezar para que muestre el spinner
      await new Promise(r => setTimeout(r, 60))

      try {
        const suavizado  = parseInt(document.getElementById('mejoraSuavizado').value)
        const nitidez    = parseInt(document.getElementById('mejoraNitidez').value)
        const contraste  = parseInt(document.getElementById('mejoraContraste').value)
        const ruido      = parseInt(document.getElementById('mejoraRuido').value)
        const saturacion = parseInt(document.getElementById('mejoraSat').value)
        const W = mejoraImgOrig.width
        const H = mejoraImgOrig.height

        // Limitar tamaño máximo para no congelar el browser
        const MAX_PIX = 1200
        const ratio = Math.min(1, MAX_PIX / Math.max(W, H))
        const w = Math.round(W * ratio)
        const h = Math.round(H * ratio)

        // 1. Dibujar original en canvas temporal (con resize si es muy grande)
        const tmpC = document.createElement('canvas')
        tmpC.width = w; tmpC.height = h
        const tmpCtx = tmpC.getContext('2d')
        tmpCtx.imageSmoothingEnabled = true
        tmpCtx.imageSmoothingQuality = 'high'
        tmpCtx.drawImage(mejoraImgOrig, 0, 0, w, h)
        let pix = tmpCtx.getImageData(0, 0, w, h).data

        // Yield entre pasos pesados
        const yld = () => new Promise(r => setTimeout(r, 0))

        // 2. Reducir ruido (median — limitado a 2 pasadas máx para no colgar)
        if (ruido > 0) {
          const pasadas = Math.min(ruido, 2)
          for (let r2 = 0; r2 < pasadas; r2++) { pix = mejoraMedian(pix, w, h); await yld() }
        }

        // 3. Suavizado gaussian
        if (suavizado > 0) { pix = mejoraGaussian(pix, w, h, Math.min(Math.ceil(suavizado / 2), 3)); await yld() }

        // 4. Poner pixeles en canvas y upscale
        tmpCtx.putImageData(new ImageData(pix, w, h), 0, 0)
        const upC = mejoraUpscale(tmpC, mejoraEscala)
        await yld()

        const upCtx = upC.getContext('2d')
        let upPix = upCtx.getImageData(0, 0, upC.width, upC.height).data

        // 5. Unsharp mask
        if (nitidez > 0) {
          const blurred = mejoraGaussian(upPix, upC.width, upC.height, 1)
          upPix = mejoraUnsharp(upPix, blurred, upC.width, upC.height, nitidez * 0.25)
          await yld()
        }

        // 6. Contraste + saturación
        if (contraste !== 0 || saturacion !== 0) {
          upPix = mejoraAjustes(upPix, contraste, saturacion)
          await yld()
        }

        // 7. Resultado final
        result.width = upC.width; result.height = upC.height
        result.getContext('2d').putImageData(new ImageData(upPix, upC.width, upC.height), 0, 0)
        document.getElementById('mejoraDimResult').textContent = `${upC.width}×${upC.height}px`
        if (ratio < 1) document.getElementById('mejoraError').textContent = `⚠ Imagen reducida a ${w}×${h}px antes de procesar para no saturar el browser.`
        document.getElementById('btnDescargarMejora').style.display = 'inline-flex'

      } catch(e) {
        errEl.textContent = 'Error: ' + (e.message || String(e))
        console.error(e)
      } finally {
        btn.disabled = false
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> Mejorar imagen'
      }
    })

    document.getElementById('btnDescargarMejora').addEventListener('click', () => {
      const c = document.getElementById('mejoraCanvasResult')
      c.toBlob(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        window.dlCheck('mejora', function(){
          a.href = url; a.download = 'imagen-mejorada.png'; a.click()
          if(window.trackDescarga) trackDescarga('mejora')
        })
        // No revocar URL acá — se revoca después del click en el callback
      }, 'image/png')
    })

    document.getElementById('btnNuevaMejora').addEventListener('click', () => {
      mejoraImgOrig = null; mejoraFile.value = ''
      mejoraInner.style.display = 'flex'; meCtrls.style.display = 'none'
      document.getElementById('btnDescargarMejora').style.display = 'none'
      document.getElementById('mejoraError').textContent = ''
      document.getElementById('mejoraDimOrig').textContent = ''
      document.getElementById('mejoraDimResult').textContent = ''
    })

    // ══════════════════════════════════════════
