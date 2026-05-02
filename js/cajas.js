// ═══════════════════════════════════════════════════
// cajas.js — La Madriguera
// ═══════════════════════════════════════════════════

      // DISEÑADOR DE CAJAS — JS principal (estilo Pacdora)
      // ══════════════════════════════════════════════════════════════════
      let cajasLogoImg = null
      let cajasSelectedIdx = 0
      let cajasAnimId = null
      let _cajasDebounce = null

      // ── Helpers de color ──────────────────────────────────────────────
      function cajasAlpha(hex, a) {
        var r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16)
        return 'rgba('+r+','+g+','+b+','+a+')'
      }
      function cajasDrawLogo(ctx, img, x, y, w, h, padding) {
        if (!img) return
        padding = padding === undefined ? 0.1 : padding
        var pad = Math.min(w,h)*padding, maxW=w-pad*2, maxH=h-pad*2
        var ratio = Math.min(maxW/img.width, maxH/img.height)
        var lw=img.width*ratio, lh=img.height*ratio
        ctx.drawImage(img, x+(w-lw)/2, y+(h-lh)/2, lw, lh)
      }
      function cajasText(ctx, text, x, y, maxW, size, color, bold) {
        if (!text) return
        ctx.font=(bold?'bold ':'')+size+'px Arial'
        ctx.fillStyle=color; ctx.textAlign='center'
        var s=size; while(ctx.measureText(text).width>maxW&&s>5){s--;ctx.font=(bold?'bold ':'')+s+'px Arial'}
        ctx.fillText(text,x,y); ctx.textAlign='left'
      }
      function cajasLinCorte(ctx,x1,y1,x2,y2) {
        ctx.save(); ctx.strokeStyle='#333'; ctx.lineWidth=1.2; ctx.setLineDash([])
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.restore()
      }
      function cajasLinDoblez(ctx,x1,y1,x2,y2,color) {
        color=color||'#aaa'
        ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=.9; ctx.setLineDash([6,4])
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke()
        ctx.setLineDash([]); ctx.restore()
      }
      function cajasRoundRect(ctx,x,y,w,h,r) {
        ctx.beginPath(); ctx.moveTo(x+r,y)
        ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
        ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
        ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
        ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
      }
      function cajasLabel(ctx,text,x,y,align,vertical) {
        ctx.save(); ctx.font='500 8.5px Arial'; ctx.fillStyle='#999'
        ctx.textAlign=align||'center'
        if(vertical){ctx.translate(x,y);ctx.rotate(-Math.PI/2);ctx.fillText(text,0,0)}
        else ctx.fillText(text,x,y)
        ctx.restore()
      }

      const CAJAS_DISEÑOS = [

        // 1. TUCK TOP CLÁSICA
        // Faja: [LAT|FRENTE|LAT|TRASERA|PEGUE] con tapa arriba y base abajo del FRENTE
        { nombre:'Tuck Top clásica', icono:'📦',
          cW:function(W,H,D){ return D+W+D+W+D },
          cH:function(W,H,D){ return D*0.55+D+H+D+D*0.35 },
          faceRegion:function(W,H,D){ var TW=D+W+D+W+D,TH=D*0.55+D+H+D+D*0.35; return {x:D/TW,y:(D*0.55+D)/TH,w:W/TW,h:H/TH} },
          render(ctx,W,H,D,logo,color,bgColor,texto,sc) {
            bgColor=bgColor||'#fff'
            var tab=D*0.55, base=D*0.35
            var TW=(D+W+D+W+D)*sc, TH=(tab+D+H+D+base)*sc
            var x0=D*sc, y0=(tab+D)*sc
            var fw=W*sc, fh=H*sc, dw=D*sc, dh=D*sc, tb=tab*sc, bb=base*sc
            var MARGEN=14*sc  // espacio fuera de la caja para etiquetas

            ctx.fillStyle='#fff'; ctx.fillRect(0,0,TW,TH)

            // Laterales
            ctx.fillStyle=cajasAlpha(color,.18)
            ctx.fillRect(0,y0,dw,fh)
            ctx.fillRect(x0+fw,y0,dw,fh)
            // Frente
            ctx.fillStyle=bgColor; ctx.fillRect(x0,y0,fw,fh)
            // Trasera
            ctx.fillStyle=bgColor; ctx.fillRect(x0+fw+dw,y0,fw,fh)
            // Pestaña pegue
            cajasRoundRect(ctx,x0+fw*2+dw*2,y0+fh*0.08,dw*0.5,fh*0.84,5*sc)
            ctx.fillStyle=cajasAlpha(color,.12); ctx.fill()

            // Tapa frente
            ctx.fillStyle=cajasAlpha(color,.3); ctx.fillRect(x0,y0-dh,fw,dh)
            // Tapa trasera
            ctx.fillStyle=cajasAlpha(color,.15); ctx.fillRect(x0+fw+dw,y0-dh,fw,dh)
            // Orejas tapa
            ctx.fillStyle=cajasAlpha(color,.1)
            ctx.fillRect(0,y0-dh,dw,dh); ctx.fillRect(x0+fw,y0-dh,dw,dh)
            // Lengüeta
            cajasRoundRect(ctx,x0+fw*0.18,y0-dh-tb,fw*0.64,tb,10*sc)
            ctx.fillStyle=cajasAlpha(color,.32); ctx.fill()
            ctx.strokeStyle=color; ctx.lineWidth=sc; ctx.stroke()
            ctx.fillStyle='#fff'
            cajasRoundRect(ctx,x0+fw*0.42,y0-dh-tb*0.75,fw*0.16,6*sc,3*sc); ctx.fill()

            // Base frente
            ctx.fillStyle=cajasAlpha(color,.28); ctx.fillRect(x0,y0+fh,fw,dh)
            // Base trasera
            ctx.fillStyle=cajasAlpha(color,.14); ctx.fillRect(x0+fw+dw,y0+fh,fw,dh)
            // Orejas base
            ctx.fillStyle=cajasAlpha(color,.1)
            ctx.fillRect(0,y0+fh,dw,dh); ctx.fillRect(x0+fw,y0+fh,dw,dh)
            // Tab base
            cajasRoundRect(ctx,x0+fw*0.2,y0+fh+dh,fw*0.6,bb,6*sc)
            ctx.fillStyle=cajasAlpha(color,.2); ctx.fill()

            // Logo y texto
            cajasDrawLogo(ctx,logo,x0+4,y0+4,fw-8,fh*0.62)
            cajasText(ctx,texto,x0+fw/2,y0+fh*0.85,fw*0.86,10*sc,color,true)

            // Líneas
            cajasLinDoblez(ctx,0,y0,TW,y0,color)
            cajasLinDoblez(ctx,0,y0+fh,TW,y0+fh,color)
            cajasLinDoblez(ctx,0,y0-dh,x0+fw*2+dw*2,y0-dh,color)
            cajasLinDoblez(ctx,x0,y0+fh+dh,x0+fw,y0+fh+dh,color)
            cajasLinDoblez(ctx,x0+fw+dw,y0+fh+dh,x0+fw*2+dw,y0+fh+dh,color)
            ;[0,dw,x0,x0+fw,x0+fw+dw,x0+fw*2+dw].forEach(function(x){
              cajasLinDoblez(ctx,x,0,x,TH,color)
            })
            cajasLinCorte(ctx,0,0,TW,0)
            cajasLinCorte(ctx,0,TH,TW,TH)
            cajasLinCorte(ctx,0,y0-dh-tb,x0+fw+dw,y0-dh-tb)
            cajasLinCorte(ctx,x0+fw+dw,y0-dh,TW,y0-dh)

            // Etiquetas FUERA de la zona visible
            cajasLabel(ctx,'LENGÜETA (doblar y cerrar)',x0+fw/2,MARGEN/2,'center')
            cajasLabel(ctx,'TAPA',x0+fw/2,y0-dh-MARGEN/2,'center')
            cajasLabel(ctx,'T.TRAS.',x0+fw+dw+fw/2,y0-dh-MARGEN/2,'center')
            cajasLabel(ctx,'LAT.',dw/2,y0-MARGEN/2,'center')
            cajasLabel(ctx,'FRENTE',x0+fw/2,y0-MARGEN/2,'center')
            cajasLabel(ctx,'LAT.',x0+fw+dw/2,y0-MARGEN/2,'center')
            cajasLabel(ctx,'TRASERA',x0+fw+dw+fw/2,y0-MARGEN/2,'center')
            cajasLabel(ctx,'PEGUE',x0+fw*2+dw*2+dw*0.25,y0+fh/2,'left')
            cajasLabel(ctx,'BASE',x0+fw/2,TH-MARGEN/2,'center')
          }
        },

        // 2. CAJA MAILER (vista lateral — enrollada)
        // Disposición: [BASE][PROF.][FRENTE/TAPA][LENGÜETA] en columna
        { nombre:'Caja mailer', icono:'✉️',
          cW:function(W,H,D){ return D+W+D },
          cH:function(W,H,D){ return H+D+H+D*0.45 },
          faceRegion:function(W,H,D){ var TW=D+W+D,TH=H+D+H+D*0.45; return {x:D/TW,y:(H+D)/TH,w:W/TW,h:H/TH} },
          render(ctx,W,H,D,logo,color,bgColor,texto,sc) {
            bgColor=bgColor||'#fff'
            var TW=(D+W+D)*sc, TH=(H+D+H+D*0.45)*sc
            var x0=D*sc, fw=W*sc, dw=D*sc, dh=D*sc
            var yBase=0, yDepth=H*sc, yTapa=(H+D)*sc, yLeng=(H+D+H)*sc
            var tabH=D*0.45*sc
            var MARGEN=12*sc

            ctx.fillStyle='#fff'; ctx.fillRect(0,0,TW,TH)

            // BASE (fondo visible cuando está cerrado)
            ctx.fillStyle=bgColor; ctx.fillRect(x0,yBase,fw,H*sc)
            ctx.fillStyle=cajasAlpha(color,.2)
            ctx.fillRect(0,yBase,dw,H*sc); ctx.fillRect(x0+fw,yBase,dw,H*sc)

            // PROFUNDIDAD
            ctx.fillStyle=cajasAlpha(color,.35); ctx.fillRect(x0,yDepth,fw,dh)
            ctx.fillStyle=cajasAlpha(color,.2)
            ctx.fillRect(0,yDepth,dw,dh); ctx.fillRect(x0+fw,yDepth,dw,dh)

            // FRENTE (tapa visible)
            ctx.fillStyle=bgColor; ctx.fillRect(x0,yTapa,fw,H*sc)
            ctx.fillStyle=cajasAlpha(color,.2)
            ctx.fillRect(0,yTapa,dw,H*sc); ctx.fillRect(x0+fw,yTapa,dw,H*sc)

            // LENGÜETA DE CIERRE
            cajasRoundRect(ctx,x0,yLeng,fw,tabH,8*sc)
            ctx.fillStyle=cajasAlpha(color,.28); ctx.fill()
            ctx.strokeStyle=color; ctx.lineWidth=sc; ctx.stroke()
            cajasRoundRect(ctx,x0+fw*0.38,yLeng+tabH*0.28,fw*0.24,7*sc,3*sc)
            ctx.fillStyle='#fff'; ctx.fill()

            // Logos
            cajasDrawLogo(ctx,logo,x0+4,yTapa+4,fw-8,H*sc*0.62)
            cajasText(ctx,texto,x0+fw/2,yTapa+H*sc*0.85,fw*0.86,10*sc,color,true)
            cajasDrawLogo(ctx,logo,x0+fw*0.25,yBase+H*sc*0.15,fw*0.5,H*sc*0.6,0.05)

            // Líneas
            cajasLinDoblez(ctx,0,yDepth,TW,yDepth,color)
            cajasLinDoblez(ctx,0,yTapa,TW,yTapa,color)
            cajasLinDoblez(ctx,0,yBase+H*sc,TW,yBase+H*sc,color)
            ;[0,x0,x0+fw,TW].forEach(function(x){cajasLinDoblez(ctx,x,0,x,TH,color)})
            cajasLinCorte(ctx,0,0,TW,0); cajasLinCorte(ctx,0,TH,TW,TH)

            // Etiquetas FUERA
            cajasLabel(ctx,'LAT.',0,yBase+H*sc/2,'left',true)
            cajasLabel(ctx,'BASE (fondo)',x0+fw/2,MARGEN/2,'center')
            cajasLabel(ctx,'LAT.',TW,yBase+H*sc/2,'right',true)
            cajasLabel(ctx,'PROFUNDIDAD',x0+fw/2,yTapa-MARGEN/2,'center')
            cajasLabel(ctx,'FRENTE / TAPA',x0+fw/2,yTapa-MARGEN*0.4,'center')
            cajasLabel(ctx,'LENGÜETA CIERRE',x0+fw/2,TH-MARGEN/2,'center')
          }
        },

        // 3. CAJA CON TAPA SEPARADA
        { nombre:'Caja con tapa', icono:'🎁',
          cW:function(W,H,D){ return (W+D*2)*2+10 },
          cH:function(W,H,D){ return Math.max(H*0.38+D*2, H*0.62+D*2)+4 },
          faceRegion:function(W,H,D){ var TW=(W+D*2)*2+10,TH=Math.max(H*0.38+D*2,H*0.62+D*2)+4; return {x:D/TW,y:D/TH,w:W/TW,h:(H*0.38)/TH} },
          render(ctx,W,H,D,logo,color,bgColor,texto,sc) {
            bgColor=bgColor||'#fff'
            var tapaH=H*0.38, baseH=H*0.62
            var fw=W*sc, dw=D*sc, dh=D*sc
            var TW=((W+D*2)*2+10)*sc
            var TH=(Math.max(tapaH+D*2,baseH+D*2)+4)*sc
            var MARGEN=11*sc

            ctx.fillStyle='#fff'; ctx.fillRect(0,0,TW,TH)

            // TAPA (izquierda)
            var tx=0, tfh=tapaH*sc
            var ty=(TH-(tfh+dh*2))/2
            ctx.fillStyle=bgColor; ctx.fillRect(tx+dw,ty+dh,fw,tfh)
            ctx.fillStyle=cajasAlpha(color,.28)
            ctx.fillRect(tx,ty+dh,dw,tfh); ctx.fillRect(tx+dw+fw,ty+dh,dw,tfh)
            ctx.fillRect(tx+dw,ty,fw,dh); ctx.fillRect(tx+dw,ty+dh+tfh,fw,dh)
            ctx.fillStyle=color; ctx.fillRect(tx+dw,ty+dh+tfh-5*sc,fw,3*sc)
            cajasDrawLogo(ctx,logo,tx+dw+4,ty+dh+4,fw-8,tfh-8)

            // BASE (derecha)
            var bx=(W+D*2+8)*sc, bfh=baseH*sc
            var by=(TH-(bfh+dh*2))/2
            ctx.fillStyle=bgColor; ctx.fillRect(bx+dw,by+dh,fw,bfh)
            ctx.fillStyle=cajasAlpha(color,.22)
            ctx.fillRect(bx,by+dh,dw,bfh); ctx.fillRect(bx+dw+fw,by+dh,dw,bfh)
            ctx.fillRect(bx+dw,by,fw,dh); ctx.fillRect(bx+dw,by+dh+bfh,fw,dh)
            cajasDrawLogo(ctx,logo,bx+dw+fw*0.2,by+dh+bfh*0.1,fw*0.6,bfh*0.6,0.08)
            cajasText(ctx,texto,bx+dw+fw/2,by+dh+bfh*0.85,fw*0.84,9*sc,color,true)

            // Separador visual
            ctx.save(); ctx.strokeStyle='#ccc'; ctx.lineWidth=1; ctx.setLineDash([6,4])
            ctx.beginPath(); ctx.moveTo((W+D*2+4)*sc,0); ctx.lineTo((W+D*2+4)*sc,TH); ctx.stroke()
            ctx.setLineDash([]); ctx.restore()

            // Líneas tapa
            ;[tx,tx+dw,tx+dw+fw,tx+dw+fw+dw].forEach(function(x){cajasLinDoblez(ctx,x,ty,x,ty+dh+tfh+dh,color)})
            cajasLinDoblez(ctx,tx,ty+dh,tx+dw+fw+dw,ty+dh,color)
            cajasLinDoblez(ctx,tx,ty+dh+tfh,tx+dw+fw+dw,ty+dh+tfh,color)
            cajasLinCorte(ctx,tx,ty,tx+dw+fw+dw,ty)
            cajasLinCorte(ctx,tx,ty+dh+tfh+dh,tx+dw+fw+dw,ty+dh+tfh+dh)
            // Líneas base
            ;[bx,bx+dw,bx+dw+fw,bx+dw+fw+dw].forEach(function(x){cajasLinDoblez(ctx,x,by,x,by+dh+bfh+dh,color)})
            cajasLinDoblez(ctx,bx,by+dh,bx+dw+fw+dw,by+dh,color)
            cajasLinDoblez(ctx,bx,by+dh+bfh,bx+dw+fw+dw,by+dh+bfh,color)
            cajasLinCorte(ctx,bx,by,bx+dw+fw+dw,by)
            cajasLinCorte(ctx,bx,by+dh+bfh+dh,bx+dw+fw+dw,by+dh+bfh+dh)

            // Etiquetas FUERA
            cajasLabel(ctx,'◄ PIEZA 1: TAPA',tx+dw+fw/2,ty-MARGEN/2,'center')
            cajasLabel(ctx,'PIEZA 2: BASE ►',bx+dw+fw/2,by-MARGEN/2,'center')
            cajasLabel(ctx,'LAT.',tx,ty+dh+tfh/2,'right',true)
            cajasLabel(ctx,'LAT.',tx+dw+fw+dw,ty+dh+tfh/2,'left',true)
            cajasLabel(ctx,'LAT.',bx,by+dh+bfh/2,'right',true)
            cajasLabel(ctx,'LAT.',bx+dw+fw+dw,by+dh+bfh/2,'left',true)
            cajasLabel(ctx,'Imprimir y armar por separado',TW/2,TH-MARGEN/2,'center')
          }
        },

        // 4. SOBRE / BOLSITA PLANA
        { nombre:'Sobre / Bolsita', icono:'📋',
          cW:function(W,H,D){ return D+W+D },
          cH:function(W,H,D){ return H*0.38+H+D },
          faceRegion:function(W,H,D){ var TW=D+W+D,TH=H*0.38+H+D; return {x:D/TW,y:(H*0.38)/TH,w:W/TW,h:H/TH} },
          render(ctx,W,H,D,logo,color,bgColor,texto,sc) {
            bgColor=bgColor||'#fff'
            var solapaH=H*0.38
            var TW=(D+W+D)*sc, TH=(solapaH+H+D)*sc
            var x0=D*sc, y0=solapaH*sc
            var fw=W*sc, fh=H*sc, dw=D*sc, dh=D*sc, sh=solapaH*sc
            var MARGEN=12*sc

            ctx.fillStyle='#fff'; ctx.fillRect(0,0,TW,TH)

            // FRENTE
            ctx.fillStyle=bgColor; ctx.fillRect(x0,y0,fw,fh)
            // LATERALES
            ctx.fillStyle=cajasAlpha(color,.25)
            ctx.fillRect(0,y0,dw,fh); ctx.fillRect(x0+fw,y0,dw,fh)
            // BASE
            ctx.fillStyle=cajasAlpha(color,.3); ctx.fillRect(x0,y0+fh,fw,dh)
            // SOLAPA triangular
            ctx.save(); ctx.fillStyle=cajasAlpha(color,.28)
            ctx.beginPath()
            ctx.moveTo(x0,y0); ctx.lineTo(x0+fw/2,0); ctx.lineTo(x0+fw,y0); ctx.closePath()
            ctx.fill(); ctx.strokeStyle=color; ctx.lineWidth=sc; ctx.stroke()
            ctx.setLineDash([4,3]); ctx.strokeStyle=cajasAlpha(color,.5)
            ctx.beginPath(); ctx.moveTo(x0+fw*0.15,sh*0.25); ctx.lineTo(x0+fw*0.85,sh*0.25); ctx.stroke()
            ctx.setLineDash([]); ctx.restore()

            cajasDrawLogo(ctx,logo,x0+4,y0+4,fw-8,fh*0.62)
            cajasText(ctx,texto,x0+fw/2,y0+fh*0.85,fw*0.86,10*sc,color,true)

            cajasLinDoblez(ctx,0,y0,TW,y0,color)
            cajasLinDoblez(ctx,0,y0+fh,TW,y0+fh,color)
            cajasLinDoblez(ctx,x0,y0,x0,TH,color)
            cajasLinDoblez(ctx,x0+fw,y0,x0+fw,TH,color)
            cajasLinCorte(ctx,0,y0+fh+dh,TW,y0+fh+dh)
            cajasLinCorte(ctx,0,y0,0,y0+fh)
            cajasLinCorte(ctx,TW,y0,TW,y0+fh)

            // Etiquetas FUERA de zonas visibles
            // La solapa Y la base se pegan — etiquetas en los márgenes extremos
            cajasLabel(ctx,'SOLAPA — doblar hacia adentro y pegar',x0+fw/2,sh*0.12,'center')
            cajasLabel(ctx,'LAT.',0,y0+fh/2,'right',true)  // fuera izq
            cajasLabel(ctx,'FRENTE',x0+fw/2,y0-MARGEN/2,'center')
            cajasLabel(ctx,'LAT.',TW,y0+fh/2,'left',true)  // fuera der
            cajasLabel(ctx,'BASE — pegar y cerrar',x0+fw/2,y0+fh+dh/2,'center')
          }
        },

        // 5. BOLSA CON ASA
        { nombre:'Bolsa con asa', icono:'🛍',
          cW:function(W,H,D){ return D+W+D+W+D },
          cH:function(W,H,D){ return D*0.65+H+D },
          faceRegion:function(W,H,D){ var TW=D+W+D+W+D,TH=D*0.65+H+D; return {x:D/TW,y:(D*0.65)/TH,w:W/TW,h:H/TH} },
          render(ctx,W,H,D,logo,color,bgColor,texto,sc) {
            bgColor=bgColor||'#fff'
            var asaH=D*0.65
            var TW=(D+W+D+W+D)*sc, TH=(asaH+H+D)*sc
            var x0=D*sc, y0=asaH*sc
            var fw=W*sc, fh=H*sc, dw=D*sc, dh=D*sc, ah=asaH*sc
            var MARGEN=12*sc

            ctx.fillStyle='#fff'; ctx.fillRect(0,0,TW,TH)

            // CARA FRENTE
            ctx.fillStyle=bgColor; ctx.fillRect(x0,y0,fw,fh)
            // LATERAL
            ctx.fillStyle=cajasAlpha(color,.25); ctx.fillRect(x0+fw,y0,dw,fh)
            // CARA TRASERA
            ctx.fillStyle=bgColor; ctx.fillRect(x0+fw+dw,y0,fw,fh)
            // PESTAÑA PEGUE
            cajasRoundRect(ctx,x0+fw*2+dw*2,y0+fh*0.05,dw*0.6,fh*0.9,5*sc)
            ctx.fillStyle=cajasAlpha(color,.12); ctx.fill()
            // BASE
            ctx.fillStyle=cajasAlpha(color,.3)
            ctx.fillRect(x0,y0+fh,fw,dh)
            ctx.fillRect(x0+fw,y0+fh,dw,dh)
            ctx.fillRect(x0+fw+dw,y0+fh,fw,dh)
            // Zona de asa (franja en la parte superior de cada cara)
            ctx.fillStyle=cajasAlpha(color,.1)
            ctx.fillRect(x0,y0,fw,ah*0.5)
            ctx.fillRect(x0+fw+dw,y0,fw,ah*0.5)

            // ASAS
            ;[x0,x0+fw+dw].forEach(function(ax){
              ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=4*sc
              ctx.beginPath(); ctx.arc(ax+fw/2,y0,fw*0.16,Math.PI,0); ctx.stroke()
              ctx.fillStyle=color
              ctx.beginPath(); ctx.arc(ax+fw/2-fw*0.16,y0,4*sc,0,Math.PI*2); ctx.fill()
              ctx.beginPath(); ctx.arc(ax+fw/2+fw*0.16,y0,4*sc,0,Math.PI*2); ctx.fill()
              ctx.restore()
            })

            cajasDrawLogo(ctx,logo,x0+4,y0+ah*0.45+4,fw-8,fh-ah*0.45-8)
            cajasText(ctx,texto,x0+fw/2,y0+fh*0.88,fw*0.86,9*sc,color,true)
            cajasDrawLogo(ctx,logo,x0+fw+dw+fw*0.2,y0+ah*0.45,fw*0.6,fh-ah*0.45,0.06)

            ;[0,x0,x0+fw,x0+fw+dw,x0+fw*2+dw].forEach(function(x){cajasLinDoblez(ctx,x,y0,x,y0+fh+dh,color)})
            cajasLinDoblez(ctx,0,y0,TW,y0,color)
            cajasLinDoblez(ctx,0,y0+fh,TW,y0+fh,color)
            cajasLinCorte(ctx,0,0,TW,0)
            cajasLinCorte(ctx,0,TH,TW,TH)

            // Etiquetas FUERA — todas en los márgenes
            cajasLabel(ctx,'FRENTE',x0+fw/2,MARGEN/2,'center')
            cajasLabel(ctx,'LAT.',x0+fw+dw/2,MARGEN/2,'center')
            cajasLabel(ctx,'TRASERA',x0+fw+dw+fw/2,MARGEN/2,'center')
            cajasLabel(ctx,'PEGUE',x0+fw*2+dw*2+dw*0.3,y0+fh/2,'left')
            cajasLabel(ctx,'BASE (pegar)',x0+fw/2,TH-MARGEN/2,'center')
            cajasLabel(ctx,'BASE (pegar)',x0+fw+dw+fw/2,TH-MARGEN/2,'center')
          }
        },

        // 6. CAJA CON VENTANA
        { nombre:'Caja con ventana', icono:'🔵',
          cW:function(W,H,D){ return D+W+D+W+D },
          cH:function(W,H,D){ return D*0.55+D+H+D+D*0.3 },
          faceRegion:function(W,H,D){ var TW=D+W+D+W+D,TH=D*0.55+D+H+D+D*0.3; return {x:D/TW,y:(D*0.55+D)/TH,w:W/TW,h:H/TH} },
          render(ctx,W,H,D,logo,color,bgColor,texto,sc) {
            bgColor=bgColor||'#fff'
            var tab=D*0.55, base=D*0.3
            var TW=(D+W+D+W+D)*sc, TH=(tab+D+H+D+base)*sc
            var x0=D*sc, y0=(tab+D)*sc
            var fw=W*sc, fh=H*sc, dw=D*sc, dh=D*sc, tb=tab*sc, bb=base*sc
            var MARGEN=12*sc

            ctx.fillStyle='#fff'; ctx.fillRect(0,0,TW,TH)

            // Laterales
            ctx.fillStyle=cajasAlpha(color,.18)
            ctx.fillRect(0,y0,dw,fh); ctx.fillRect(x0+fw,y0,dw,fh)
            // Frente (con logo)
            ctx.fillStyle=bgColor; ctx.fillRect(x0,y0,fw,fh)
            // Trasera (con ventana)
            ctx.fillStyle=bgColor; ctx.fillRect(x0+fw+dw,y0,fw,fh)
            // Pestaña
            cajasRoundRect(ctx,x0+fw*2+dw*2,y0+fh*0.08,dw*0.5,fh*0.84,5*sc)
            ctx.fillStyle=cajasAlpha(color,.12); ctx.fill()

            // Tapas y orejas
            ctx.fillStyle=cajasAlpha(color,.3)
            ctx.fillRect(x0,y0-dh,fw,dh); ctx.fillRect(x0+fw+dw,y0-dh,fw,dh)
            ctx.fillRect(x0,y0+fh,fw,dh); ctx.fillRect(x0+fw+dw,y0+fh,fw,dh)
            ctx.fillStyle=cajasAlpha(color,.1)
            ctx.fillRect(0,y0-dh,dw,dh); ctx.fillRect(x0+fw,y0-dh,dw,dh)
            ctx.fillRect(0,y0+fh,dw,dh); ctx.fillRect(x0+fw,y0+fh,dw,dh)
            // Lengüeta
            cajasRoundRect(ctx,x0+fw*0.18,y0-dh-tb,fw*0.64,tb,10*sc)
            ctx.fillStyle=cajasAlpha(color,.32); ctx.fill()
            ctx.strokeStyle=color; ctx.lineWidth=sc; ctx.stroke()
            ctx.fillStyle='#fff'
            cajasRoundRect(ctx,x0+fw*0.42,y0-dh-tb*0.75,fw*0.16,6*sc,3*sc); ctx.fill()
            // Base tab
            cajasRoundRect(ctx,x0+fw*0.2,y0+fh+dh,fw*0.6,bb,6*sc)
            ctx.fillStyle=cajasAlpha(color,.2); ctx.fill()

            // VENTANA oval en la cara TRASERA
            var vx=x0+fw+dw, vcx=vx+fw/2, vcy=y0+fh*0.4
            ctx.save()
            ctx.beginPath(); ctx.ellipse(vcx,vcy,fw*0.28,fh*0.25,0,0,Math.PI*2)
            ctx.strokeStyle=color; ctx.lineWidth=1.5*sc; ctx.setLineDash([5,3]); ctx.stroke()
            ctx.fillStyle='rgba(180,230,255,0.4)'; ctx.fill()
            ctx.setLineDash([]); ctx.restore()
            // Texto ventana (pequeño, centrado en el círculo)
            ctx.fillStyle='#999'; ctx.font=Math.round(6*sc)+'px Arial'
            ctx.textAlign='center'; ctx.fillText('VENTANA',vcx,vcy+4); ctx.textAlign='left'

            // Logo en frente
            cajasDrawLogo(ctx,logo,x0+4,y0+4,fw-8,fh*0.62)
            cajasText(ctx,texto,x0+fw/2,y0+fh*0.85,fw*0.86,9*sc,color,true)

            // Líneas
            cajasLinDoblez(ctx,0,y0,TW,y0,color); cajasLinDoblez(ctx,0,y0+fh,TW,y0+fh,color)
            cajasLinDoblez(ctx,0,y0-dh,x0+fw*2+dw*2,y0-dh,color)
            cajasLinDoblez(ctx,x0,y0+fh+dh,x0+fw,y0+fh+dh,color)
            cajasLinDoblez(ctx,x0+fw+dw,y0+fh+dh,x0+fw*2+dw,y0+fh+dh,color)
            ;[0,dw,x0,x0+fw,x0+fw+dw,x0+fw*2+dw].forEach(function(x){cajasLinDoblez(ctx,x,0,x,TH,color)})
            cajasLinCorte(ctx,0,0,TW,0); cajasLinCorte(ctx,0,TH,TW,TH)
            cajasLinCorte(ctx,0,y0-dh-tb,x0+fw+dw,y0-dh-tb)
            cajasLinCorte(ctx,x0+fw+dw,y0-dh,TW,y0-dh)

            // Etiquetas FUERA
            cajasLabel(ctx,'LENGÜETA',x0+fw/2,MARGEN/2,'center')
            cajasLabel(ctx,'TAPA',x0+fw/2,y0-dh-MARGEN/2,'center')
            cajasLabel(ctx,'T.TRAS.',x0+fw+dw+fw/2,y0-dh-MARGEN/2,'center')
            cajasLabel(ctx,'LAT.',dw/2,y0-MARGEN/2,'center')
            cajasLabel(ctx,'FRENTE (logo)',x0+fw/2,y0-MARGEN/2,'center')
            cajasLabel(ctx,'LAT.',x0+fw+dw/2,y0-MARGEN/2,'center')
            cajasLabel(ctx,'TRASERA (ventana)',x0+fw+dw+fw/2,y0-MARGEN/2,'center')
            cajasLabel(ctx,'PEGUE',x0+fw*2+dw*2+dw*0.25,y0+fh/2,'left')
            cajasLabel(ctx,'BASE',x0+fw/2,TH-MARGEN/2,'center')
          }
        },

        // 7. CAJA HEXAGONAL PRISMA — 6 paneles en faja, tapas hexagonales separadas arriba/abajo
        { nombre:'Caja hexagonal', icono:'⬡',
          cW:function(W,H,D){ return W*6 },
          cH:function(W,H,D){ return H+W*Math.sqrt(3)*0.55 },
          faceRegion:function(W,H,D){ var TW=W*6,TH=H+W*Math.sqrt(3)*0.55; var hexH=W*Math.sqrt(3)/2; return {x:0,y:hexH*0.55/TH,w:W/TW,h:H/TH} },
          render(ctx,W,H,D,logo,color,bgColor,texto,sc) {
            bgColor=bgColor||'#fff'
            var sw=W*sc, fh=H*sc
            var hexR=W*sc*0.52  // radio circunscrito del hexágono
            var hexH=hexR*Math.sqrt(3)/2*1.0  // apotema
            var hexTotalH=hexR*Math.sqrt(3)*0.5  // altura del hexágono
            var topPad=hexTotalH*0.52+4*sc
            var TW=sw*6, TH=topPad+fh+hexTotalH*0.52+4*sc
            var yFaja=topPad
            var MARGEN=11*sc

            ctx.fillStyle='#fff'; ctx.fillRect(0,0,TW,TH)

            // 6 PANELES en faja horizontal — alternando bgColor y acento
            for(var i=0;i<6;i++){
              ctx.fillStyle=i%2===0?bgColor:cajasAlpha(color,.18)
              ctx.fillRect(i*sw,yFaja,sw,fh)
              cajasLinDoblez(ctx,i*sw,yFaja,i*sw,yFaja+fh,color)
            }
            cajasLinDoblez(ctx,TW,yFaja,TW,yFaja+fh,color)
            cajasLinDoblez(ctx,0,yFaja,TW,yFaja,color)
            cajasLinDoblez(ctx,0,yFaja+fh,TW,yFaja+fh,color)

            // TAPA hexagonal — centrada ARRIBA de la faja, SIN solaparse
            function hexPath(cx,cy,r){
              ctx.beginPath()
              for(var k=0;k<6;k++){
                var a=Math.PI/180*(60*k-90)
                if(k===0) ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a))
                else ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a))
              }
              ctx.closePath()
            }
            var hexCX=sw*3, hexTopY=topPad*0.5
            ctx.save()
            hexPath(hexCX,hexTopY,hexR*0.95)
            ctx.fillStyle=cajasAlpha(color,.25); ctx.fill()
            ctx.strokeStyle=color; ctx.lineWidth=1.5*sc; ctx.stroke()
            ctx.restore()

            // BASE hexagonal — centrada ABAJO de la faja
            var hexBotY=yFaja+fh+hexTotalH*0.52*0.5+4*sc
            ctx.save()
            hexPath(hexCX,hexBotY,hexR*0.95)
            ctx.fillStyle=cajasAlpha(color,.15); ctx.fill()
            ctx.strokeStyle=color; ctx.lineWidth=1.5*sc; ctx.stroke()
            ctx.restore()

            // Logos en paneles principales
            cajasDrawLogo(ctx,logo,0,yFaja+4,sw,fh-8)
            cajasDrawLogo(ctx,logo,sw*2,yFaja+fh*0.2,sw,fh*0.55,0.06)
            cajasDrawLogo(ctx,logo,sw*4,yFaja+4,sw,fh-8,0.08)
            cajasText(ctx,texto,sw/2,yFaja+fh*0.85,sw*0.86,9*sc,color,true)

            cajasLinCorte(ctx,0,yFaja,0,yFaja+fh)
            cajasLinCorte(ctx,TW,yFaja,TW,yFaja+fh)

            // Etiquetas FUERA de la faja y de las tapas
            cajasLabel(ctx,'TAPA (recortar y pegar)',hexCX,MARGEN/2,'center')
            for(var pi=0;pi<6;pi++){
              var lbl=pi===0?'FRENTE':pi===1?'LAT.':pi===2?'TRASERA':pi===3?'LAT.':pi===4?'FRENTE 2':'LAT.'
              cajasLabel(ctx,lbl,pi*sw+sw/2,yFaja-MARGEN/2,'center')
            }
            cajasLabel(ctx,'BASE (recortar y pegar)',hexCX,TH-MARGEN/2,'center')
          }
        },

        // 8. CAJA BOMBONERA / CILÍNDRICA
        { nombre:'Caja bombonera', icono:'🍫',
          cW:function(W,H,D){ return W*Math.PI+W*0.85 },
          cH:function(W,H,D){ return H+W*0.75 },
          faceRegion:function(W,H,D){ var TW=W*Math.PI+W*0.85,TH=H+W*0.75; var radio=W/2; return {x:(radio*1.1)/TW,y:(W*0.38)/TH,w:(W*Math.PI)/TW,h:H/TH} },
          render(ctx,W,H,D,logo,color,bgColor,texto,sc) {
            bgColor=bgColor||'#fff'
            var circ=W*Math.PI, radio=W/2
            var TW=(circ+W*0.85)*sc, TH=(H+W*0.75)*sc
            var x0=radio*1.1*sc, y0=W*0.38*sc
            var fajaW=circ*sc, fh=H*sc, r=radio*sc
            var MARGEN=12*sc

            ctx.fillStyle='#fff'; ctx.fillRect(0,0,TW,TH)

            // FAJA CILÍNDRICA
            ctx.fillStyle=bgColor; ctx.fillRect(x0,y0,fajaW,fh)
            ctx.strokeStyle=cajasAlpha(color,.5); ctx.lineWidth=sc
            ctx.strokeRect(x0,y0,fajaW,fh)
            // Líneas de curvado
            var segs=8
            for(var i=1;i<segs;i++){
              cajasLinDoblez(ctx,x0+fajaW/segs*i,y0,x0+fajaW/segs*i,y0+fh,cajasAlpha(color,.18))
            }
            // Pestañas de pegue arriba/abajo
            ctx.fillStyle=cajasAlpha(color,.18)
            ctx.fillRect(x0,y0-8*sc,fajaW*0.4,7*sc)
            ctx.fillRect(x0,y0+fh+sc,fajaW*0.4,7*sc)

            // TAPA circular — izquierda FUERA de la faja
            ctx.save()
            ctx.beginPath(); ctx.arc(x0-r*1.05,y0+fh/2,r*0.92,0,Math.PI*2)
            ctx.fillStyle=cajasAlpha(color,.3); ctx.fill()
            ctx.strokeStyle=color; ctx.lineWidth=1.5*sc; ctx.stroke()
            ctx.restore()

            // BASE circular — derecha FUERA de la faja
            ctx.save()
            ctx.beginPath(); ctx.arc(x0+fajaW+r*1.05,y0+fh/2,r*0.92,0,Math.PI*2)
            ctx.fillStyle=cajasAlpha(color,.18); ctx.fill()
            ctx.strokeStyle=color; ctx.lineWidth=1.5*sc; ctx.stroke()
            ctx.restore()

            // Logos y texto
            cajasDrawLogo(ctx,logo,x0+fajaW*0.08,y0+4,fajaW*0.84,fh*0.65)
            cajasText(ctx,texto,x0+fajaW/2,y0+fh*0.87,fajaW*0.86,10*sc,color,true)

            cajasLinDoblez(ctx,x0,y0,x0,y0+fh,color)
            cajasLinDoblez(ctx,x0+fajaW,y0,x0+fajaW,y0+fh,color)
            cajasLinCorte(ctx,x0,y0,x0+fajaW,y0)
            cajasLinCorte(ctx,x0,y0+fh,x0+fajaW,y0+fh)

            // Etiquetas FUERA
            cajasLabel(ctx,'TAPA ① — recortar y encajar',x0-r*1.05,MARGEN/2,'center')
            cajasLabel(ctx,'FAJA CILÍNDRICA — enrollar y pegar',x0+fajaW/2,y0-MARGEN/2,'center')
            cajasLabel(ctx,'BASE ② — recortar y encajar',x0+fajaW+r*1.05,MARGEN/2,'center')
            cajasLabel(ctx,'← pegar aquí',x0-4,y0+fh/2,'right')
            cajasLabel(ctx,'pegar aquí →',x0+fajaW+4,y0+fh/2,'left')
          }
        },

      ]  // fin CAJAS_DISEÑOS


      // ── Sync color pickers ────────────────────────────────────────────
      function cajasInitColorSync() {
        ;[['cajasColor','cajasColorHex'],['cajasBgColor','cajasBgColorHex']].forEach(function(pair){
          var picker=document.getElementById(pair[0]), hex=document.getElementById(pair[1])
          if(!picker||!hex) return
          picker.addEventListener('input',function(){hex.value=this.value;cajasRenderActual()})
          hex.addEventListener('input',function(){if(/^#[0-9a-fA-F]{6}$/.test(this.value)){picker.value=this.value;cajasRenderActual()}})
        })
        ;['cajasW','cajasH','cajasD'].forEach(function(id){
          var el=document.getElementById(id)
          if(el) el.addEventListener('input',function(){cajasUpdateAreaLabel();cajasRenderActual()})
        })
        var textoEl=document.getElementById('cajasTexto')
        if(textoEl) textoEl.addEventListener('input',function(){cajasRenderActual()})
      }

      function cajasGetDims() {
        var W=parseFloat(document.getElementById('cajasW').value)||12
        var H=parseFloat(document.getElementById('cajasH').value)||12
        var D=parseFloat(document.getElementById('cajasD').value)||6
        return {W:Math.max(3,W)*10, H:Math.max(3,H)*10, D:Math.max(1,D)*10}  // mm
      }

      function cajasUpdateAreaLabel() {
        var d=cajasGetDims(), W=d.W/10, H=d.H/10, D=d.D/10
        var area=((W*H*2+W*D*2+H*D*2)/100).toFixed(1)
        var el=document.getElementById('cajasAreaLabel')
        if(el) el.textContent='Área total aprox: '+area+' dm²\n'+W+'×'+H+'×'+D+' cm'
      }

      // ── Logo upload ───────────────────────────────────────────────────
      document.getElementById('cajasLogoFile').addEventListener('change', function(e) {
        var file=e.target.files[0]; if(!file) return
        var reader=new FileReader()
        reader.onload=function(ev){
          var img=new Image()
          img.onload=function(){
            cajasLogoImg=img
            document.getElementById('cajasLogoImg').src=ev.target.result
            document.getElementById('cajasLogoPreview').style.display='flex'
            document.getElementById('cajasLogoPlaceholder').style.display='none'
            cajasExtraerColores(img)
            cajasRenderActual()
          }
          img.src=ev.target.result
        }
        reader.readAsDataURL(file)
      })

      function cajasExtraerColores(img) {
        var sc=80/Math.max(img.width,img.height), sw=Math.round(img.width*sc), sh=Math.round(img.height*sc)
        var tc=document.createElement('canvas'); tc.width=sw; tc.height=sh
        var tCtx=tc.getContext('2d',{willReadFrequently:true})
        tCtx.drawImage(img,0,0,sw,sh)
        var data=tCtx.getImageData(0,0,sw,sh).data
        var bw=Math.max(2,Math.round(Math.min(sw,sh)*0.15))
        var bgR=0,bgG=0,bgB=0,bgN=0
        for(var y=0;y<sh;y++) for(var x=0;x<sw;x++){
          if(x<bw||x>=sw-bw||y<bw||y>=sh-bw){
            var i=(y*sw+x)*4; var a=data[i+3]
            if(a>128){bgR+=data[i];bgG+=data[i+1];bgB+=data[i+2];bgN++}
          }
        }
        if(bgN>0){bgR=Math.round(bgR/bgN);bgG=Math.round(bgG/bgN);bgB=Math.round(bgB/bgN)}
        else{bgR=245;bgG=240;bgB=232}
        var samples=[]
        for(var i=0;i<data.length;i+=4){
          var a=data[i+3]; if(a<128) continue
          var r=data[i],g=data[i+1],b=data[i+2]
          var dBg=Math.sqrt((r-bgR)**2+(g-bgG)**2+(b-bgB)**2)
          if(dBg>40) samples.push([r,g,b])
        }
        var accentR=bgR,accentG=bgG,accentB=bgB
        if(samples.length>10){
          var cents=[samples[0],samples[Math.floor(samples.length/3)],samples[Math.floor(2*samples.length/3)]]
          for(var iter=0;iter<8;iter++){
            var clusters=[[],[],[]]
            samples.forEach(function(s){
              var best=0,bd=Infinity
              cents.forEach(function(c,ci){var d=(s[0]-c[0])**2+(s[1]-c[1])**2+(s[2]-c[2])**2;if(d<bd){bd=d;best=ci}})
              clusters[best].push(s)
            })
            cents=clusters.map(function(cl){
              if(!cl.length) return [128,128,128]
              return [Math.round(cl.reduce(function(s,p){return s+p[0]},0)/cl.length),
                      Math.round(cl.reduce(function(s,p){return s+p[1]},0)/cl.length),
                      Math.round(cl.reduce(function(s,p){return s+p[2]},0)/cl.length)]
            })
          }
          var bestSat=-1,bestCent=cents[0]
          cents.forEach(function(c){
            var max=Math.max(c[0],c[1],c[2]),min=Math.min(c[0],c[1],c[2])
            var sat=max===0?0:(max-min)/max
            var dBg=Math.sqrt((c[0]-bgR)**2+(c[1]-bgG)**2+(c[2]-bgB)**2)
            var score=sat*(dBg/255)
            if(score>bestSat){bestSat=score;bestCent=c}
          })
          accentR=bestCent[0];accentG=bestCent[1];accentB=bestCent[2]
        }
        var toHex=function(n){return n.toString(16).padStart(2,'0')}
        var bgHex='#'+toHex(bgR)+toHex(bgG)+toHex(bgB)
        var accHex='#'+toHex(accentR)+toHex(accentG)+toHex(accentB)
        document.getElementById('cajasColor').value=accHex
        document.getElementById('cajasColorHex').value=accHex
        document.getElementById('cajasBgColor').value=bgHex
        document.getElementById('cajasBgColorHex').value=bgHex
        var fb=document.getElementById('cajasColorFeedback')
        if(fb){
          fb.innerHTML='<span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:'+bgHex+';border:1px solid rgba(255,255,255,.2);vertical-align:middle;margin-right:3px"></span>Fondo &nbsp;·&nbsp;<span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:'+accHex+';border:1px solid rgba(255,255,255,.2);vertical-align:middle;margin-right:3px"></span>Acento detectados'
          fb.style.display='block'
        }
      }

      // ── Selector lateral de tipos ─────────────────────────────────────
      function cajasRenderTipoList() {
        var list=document.getElementById('cajasTipoList'); if(!list) return
        list.innerHTML=''
        CAJAS_DISEÑOS.forEach(function(d,i){
          var btn=document.createElement('button')
          btn.style.cssText='width:100%;text-align:left;padding:.45rem .6rem;border-radius:7px;border:1px solid transparent;background:none;cursor:pointer;font-size:.7rem;color:var(--text);display:flex;align-items:center;gap:.4rem;transition:.15s'
          btn.innerHTML='<span style="font-size:.9rem">'+d.icono+'</span><span>'+d.nombre+'</span>'
          btn.onmouseover=function(){if(i!==cajasSelectedIdx)this.style.background='rgba(255,255,255,.05)'}
          btn.onmouseout=function(){if(i!==cajasSelectedIdx)this.style.background='none'}
          btn.onclick=function(){cajasSelectTipo(i)}
          btn.id='cajas-tipo-btn-'+i
          list.appendChild(btn)
        })
        cajasHighlightTipo(0)
      }

      function cajasHighlightTipo(idx) {
        CAJAS_DISEÑOS.forEach(function(_,i){
          var btn=document.getElementById('cajas-tipo-btn-'+i)
          if(!btn) return
          if(i===idx){
            btn.style.background='rgba(21,154,156,.15)'
            btn.style.borderColor='rgba(21,154,156,.4)'
            btn.style.color='var(--cyan)'
          } else {
            btn.style.background='none'
            btn.style.borderColor='transparent'
            btn.style.color='var(--text)'
          }
        })
      }

      function cajasSelectTipo(idx) {
        cajasSelectedIdx=idx
        cajasHighlightTipo(idx)
        cajasRenderActual()
      }

      // ── Render principal (plantilla + preview 3D) ─────────────────────
      function cajasRenderActual() {
        clearTimeout(_cajasDebounce)
        _cajasDebounce=setTimeout(function(){
          var dims=cajasGetDims(), W=dims.W, H=dims.H, D=dims.D
          var color=document.getElementById('cajasColor').value||'#159A9C'
          var bgColor=document.getElementById('cajasBgColor').value||'#f5f0e8'
          var texto=(document.getElementById('cajasTexto')||{}).value||''
          var d=CAJAS_DISEÑOS[cajasSelectedIdx]
          if(!d) return

          // ── Render plantilla ──
          var cP=document.getElementById('cajasPlantilla'); if(!cP) return
          var cW=d.cW(W,H,D), cH=d.cH(W,H,D)
          var maxPW=cP.parentElement.clientWidth-24||320
          var sc=Math.min(maxPW/cW, 240/cH, 3)
          cP.width=Math.round(cW*sc); cP.height=Math.round(cH*sc)
          var ctx=cP.getContext('2d',{willReadFrequently:true})
          ctx.fillStyle='#fff'; ctx.fillRect(0,0,cP.width,cP.height)
          try{ d.render(ctx,W,H,D,cajasLogoImg,color,bgColor,texto,sc) }catch(e){console.warn(e)}

          // ── Render preview 3D ──
          cajasRenderPreview3D(W,H,D,color,bgColor,texto)

          // ── Area label ──
          cajasUpdateAreaLabel()
        }, 120)
      }

      // ── Vista previa 3D animada ───────────────────────────────────────
      // Dibuja una caja isométrica con el panel de tapa en distintos ángulos según el slider
      function cajasRenderPreview3D(W,H,D,color,bgColor,texto) {
        var c=document.getElementById('cajasPreview3D'); if(!c) return
        var size=c.parentElement.clientWidth-24||300
        c.width=size; c.height=Math.round(size*0.68)
        var ctx=c.getContext('2d',{willReadFrequently:true})
        var slider=document.getElementById('cajasSlider')
        var t=(slider?parseInt(slider.value):70)/100
        var d=CAJAS_DISEÑOS[cajasSelectedIdx]

        // Fondo
        var grd=ctx.createLinearGradient(0,0,0,c.height)
        grd.addColorStop(0,'#1a2c38'); grd.addColorStop(1,'#0d1a22')
        ctx.fillStyle=grd; ctx.fillRect(0,0,c.width,c.height)

        // ── Infraestructura 3D compartida ──────────────────────────────
        var s=Math.max(W,H,D)
        var hw=W/s*0.36, hh=H/s*0.36, hd=D/s*0.36
        var zoom=Math.min(c.width,c.height)*0.88
        var cx=c.width/2, cy=c.height*0.52
        var rotY=0.52, rotX=0.40

        function proj(x,y,z){
          var cY=Math.cos(rotY),sY=Math.sin(rotY)
          var x1=x*cY+z*sY, z1=-x*sY+z*cY
          var cX=Math.cos(rotX),sX=Math.sin(rotX)
          return {px:cx+x1*zoom, py:cy+(y*cX-z1*sX)*zoom}
        }
        function face(pts,fill,stroke,lw,alpha){
          ctx.save(); if(alpha!=null) ctx.globalAlpha=alpha
          ctx.beginPath(); ctx.moveTo(pts[0].px,pts[0].py)
          for(var i=1;i<pts.length;i++) ctx.lineTo(pts[i].px,pts[i].py)
          ctx.closePath()
          if(fill){ctx.fillStyle=fill;ctx.fill()}
          if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw||1.5;ctx.stroke()}
          ctx.restore()
        }
        function shadow(cx2,cy2,rx,ry){
          ctx.save(); ctx.globalAlpha=0.13
          ctx.beginPath(); ctx.ellipse(cx2,cy2,rx,ry,0,0,Math.PI*2)
          ctx.fillStyle='#000'; ctx.fill(); ctx.restore()
        }
        function drawLogo(p0,p1,p2,p3){
          if(!cajasLogoImg) return
          var px=(p0.px+p1.px+p2.px+p3.px)/4
          var py=(p0.py+p1.py+p2.py+p3.py)/4
          var fw=Math.abs(p1.px-p0.px)*0.5, fh=Math.abs(p3.py-p0.py)*0.38
          var lr=Math.min(fw/cajasLogoImg.width, fh/cajasLogoImg.height)
          ctx.drawImage(cajasLogoImg, px-cajasLogoImg.width*lr/2, py-cajasLogoImg.height*lr/2,
            cajasLogoImg.width*lr, cajasLogoImg.height*lr)
        }

        // Tapa animada (pivota sobre el borde trasero superior)
        var tapAngle=(1-t)*(-Math.PI*0.75)
        function vT(x,y,z){
          var ry=y*Math.cos(tapAngle)-z*Math.sin(tapAngle)
          var rz=y*Math.sin(tapAngle)+z*Math.cos(tapAngle)
          return proj(x, hh+ry, -hd+rz)
        }

        var idx=cajasSelectedIdx

        // ══════════════════════════════════════════════════════════════
        // PREVIEW POR TIPO DE CAJA
        // ══════════════════════════════════════════════════════════════

        if(idx===0||idx===2||idx===5) {
          // CAJA RECTANGULAR CON TAPA — Tuck Top, Caja con tapa, Con ventana
          var fl=proj(-hw,-hh, hd), fr=proj( hw,-hh, hd)
          var bl=proj(-hw,-hh,-hd), br=proj( hw,-hh,-hd)
          var FL=proj(-hw, hh, hd), FR=proj( hw, hh, hd)
          var BL=proj(-hw, hh,-hd), BR=proj( hw, hh,-hd)

          shadow(cx, cy+hh*zoom*0.9, hw*zoom*0.75, hw*zoom*0.18)
          face([bl,br,BR,BL], cajasAlpha(bgColor,.45), 'rgba(255,255,255,.08)')
          face([bl,fl,FL,BL], cajasAlpha(bgColor,.6),  'rgba(255,255,255,.1)')
          face([bl,br,fr,fl], 'rgba(0,0,0,.35)',        'rgba(255,255,255,.06)')
          face([fl,fr,FR,FL], bgColor, 'rgba(255,255,255,.18)')
          drawLogo(FL,FR,fl,fr)

          if(idx===5) {
            // Con ventana: circulo en cara frontal
            var vcx=(FL.px+FR.px)/2, vcy=(FL.py+fl.py)/2
            ctx.save(); ctx.beginPath()
            ctx.ellipse(vcx, vcy, Math.abs(FR.px-FL.px)*0.22, Math.abs(fl.py-FL.py)*0.2, 0,0,Math.PI*2)
            ctx.strokeStyle=color; ctx.lineWidth=2; ctx.setLineDash([4,3]); ctx.stroke()
            ctx.fillStyle='rgba(180,230,255,0.2)'; ctx.fill()
            ctx.setLineDash([]); ctx.restore()
          }

          face([fr,br,BR,FR], cajasAlpha(bgColor,.72), 'rgba(255,255,255,.12)')

          // Tapa
          var T0=vT(-hw,0,0), T1=vT(hw,0,0), T2=vT(hw,0,hd*2), T3=vT(-hw,0,hd*2)
          var S0=vT(-hw,0,hd*2), S1=vT(hw,0,hd*2), S2=vT(hw,0,hd*2+hd*.55), S3=vT(-hw,0,hd*2+hd*.55)
          face([T0,T1,T2,T3], cajasAlpha(color,.4), color, 1.5, 0.92)
          face([S0,S1,S2,S3], cajasAlpha(color,.6), color, 1.5, 0.88)
          face([fl,fr,FR,FL], 'transparent', color, 2)

        } else if(idx===1||idx===6) {
          // MAILER / RECTANGULAR — caja plana tipo e-commerce
          var mhw=hw*1.3, mhd=hd*0.5  // más ancha, menos profunda
          var fl=proj(-mhw,-hh, mhd), fr=proj( mhw,-hh, mhd)
          var bl=proj(-mhw,-hh,-mhd), br=proj( mhw,-hh,-mhd)
          var FL=proj(-mhw, hh, mhd), FR=proj( mhw, hh, mhd)
          var BL=proj(-mhw, hh,-mhd), BR=proj( mhw, hh,-mhd)

          shadow(cx, cy+hh*zoom*0.88, mhw*zoom*0.75, mhw*zoom*0.12)
          face([bl,br,BR,BL], cajasAlpha(bgColor,.45), 'rgba(255,255,255,.08)')
          face([bl,fl,FL,BL], cajasAlpha(bgColor,.55), 'rgba(255,255,255,.1)')
          face([bl,br,fr,fl], 'rgba(0,0,0,.35)',        'rgba(255,255,255,.06)')
          face([fl,fr,FR,FL], bgColor, 'rgba(255,255,255,.18)')
          drawLogo(FL,FR,fl,fr)
          face([fr,br,BR,FR], cajasAlpha(bgColor,.7),  'rgba(255,255,255,.12)')

          // Tapa que se abre hacia arriba (como caja de zapatos)
          var tapAngle2=(1-t)*(-Math.PI*0.68)
          function vT2(x,y,z){
            var ry=y*Math.cos(tapAngle2)-z*Math.sin(tapAngle2)
            var rz=y*Math.sin(tapAngle2)+z*Math.cos(tapAngle2)
            return proj(x, hh+ry, -mhd+rz)
          }
          var T0=vT2(-mhw,0,0),T1=vT2(mhw,0,0),T2=vT2(mhw,0,mhd*2),T3=vT2(-mhw,0,mhd*2)
          face([T0,T1,T2,T3], cajasAlpha(color,.4), color, 1.5, 0.92)
          face([fl,fr,FR,FL], 'transparent', color, 2)

        } else if(idx===3) {
          // SOBRE / BOLSITA PLANA — caja muy plana, solapa triangular visible
          var shw=hw*1.1, shd=hd*0.25
          var fl=proj(-shw,-hh, shd), fr=proj( shw,-hh, shd)
          var bl=proj(-shw,-hh,-shd), br=proj( shw,-hh,-shd)
          var FL=proj(-shw, hh, shd), FR=proj( shw, hh, shd)
          var BL=proj(-shw, hh,-shd), BR=proj( shw, hh,-shd)

          shadow(cx, cy+hh*zoom*0.88, shw*zoom*0.7, shw*zoom*0.08)
          face([bl,br,BR,BL], cajasAlpha(bgColor,.4),  'rgba(255,255,255,.07)')
          face([bl,fl,FL,BL], cajasAlpha(bgColor,.5),  'rgba(255,255,255,.08)')
          face([bl,br,fr,fl], 'rgba(0,0,0,.3)',          'rgba(255,255,255,.05)')
          face([fl,fr,FR,FL], bgColor, 'rgba(255,255,255,.15)')
          drawLogo(FL,FR,fl,fr)
          face([fr,br,BR,FR], cajasAlpha(bgColor,.65), 'rgba(255,255,255,.1)')

          // Solapa triangular animada
          var solapaH=hh*0.7
          var tapAngle3=(1-t)*(-Math.PI*0.55)
          function vSolapa(x,y,z){
            var ry=y*Math.cos(tapAngle3)-z*Math.sin(tapAngle3)
            var rz=y*Math.sin(tapAngle3)+z*Math.cos(tapAngle3)
            return proj(x, hh+ry, -shd+rz)
          }
          var peak=vSolapa(0,0,solapaH*2)
          var sl=vSolapa(-shw,0,0), sr=vSolapa(shw,0,0)
          face([sl,sr,peak], cajasAlpha(color,.45), color, 1.5, 0.9)
          face([fl,fr,FR,FL], 'transparent', color, 1.5)

        } else if(idx===4) {
          // BOLSA CON ASA — caja con asas en la parte superior
          var bw=hw*0.95, bh=hh*1.1, bd=hd*0.4
          var fl=proj(-bw,-bh, bd), fr=proj( bw,-bh, bd)
          var bl=proj(-bw,-bh,-bd), br=proj( bw,-bh,-bd)
          var FL=proj(-bw, bh, bd), FR=proj( bw, bh, bd)
          var BL=proj(-bw, bh,-bd), BR=proj( bw, bh,-bd)

          shadow(cx, cy+bh*zoom*0.88, bw*zoom*0.65, bw*zoom*0.14)
          face([bl,br,BR,BL], cajasAlpha(bgColor,.45), 'rgba(255,255,255,.08)')
          face([bl,fl,FL,BL], cajasAlpha(bgColor,.6),  'rgba(255,255,255,.1)')
          face([bl,br,fr,fl], 'rgba(0,0,0,.35)',        'rgba(255,255,255,.06)')
          face([fl,fr,FR,FL], bgColor, 'rgba(255,255,255,.18)')
          drawLogo(FL,FR,fl,fr)
          face([fr,br,BR,FR], cajasAlpha(bgColor,.72), 'rgba(255,255,255,.12)')

          // Asas (arcos sobre la caja)
          var asaT = t  // cuando cerrado, el asa está arriba
          var topL=proj(-bw, bh, bd), topR=proj(bw, bh, bd)
          ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=3.5; ctx.globalAlpha=0.9
          // Asa izquierda
          var aL=proj(-bw*0.55, bh+bh*0.35*asaT, 0)
          ctx.beginPath(); ctx.moveTo(topL.px,topL.py)
          ctx.quadraticCurveTo(aL.px,aL.py, proj(-bw*0.05,bh,bd).px, proj(-bw*0.05,bh,bd).py)
          ctx.stroke()
          // Asa derecha
          var aR=proj(bw*0.55, bh+bh*0.35*asaT, 0)
          var topR2=proj(bw*0.05,bh,bd)
          ctx.beginPath(); ctx.moveTo(topR2.px,topR2.py)
          ctx.quadraticCurveTo(aR.px,aR.py, topR.px,topR.py)
          ctx.stroke(); ctx.restore()

          // Sin tapa — la bolsa se cierra con el asa
          face([fl,fr,FR,FL], 'transparent', color, 1.5)

        } else if(idx===6) {
          // (ya cubierto arriba con mailer)

        } else if(idx===6 || idx===7) {
          // HEXAGONAL / BOMBONERA — prisma de 6 lados o cilíndrico
          // Dibujar un hexágono isométrico
          var sides=6, hr=hw*1.0
          var topPts=[], botPts=[]
          for(var k=0;k<sides;k++){
            var ang=Math.PI/180*(60*k-90)
            topPts.push(proj(hr*Math.cos(ang), hh, hr*Math.sin(ang)))
            botPts.push(proj(hr*Math.cos(ang),-hh, hr*Math.sin(ang)))
          }

          shadow(cx,cy+hh*zoom*0.88, hr*zoom*0.7, hr*zoom*0.15)

          // Caras laterales visibles (lado derecho)
          for(var k=0;k<sides;k++){
            var next=(k+1)%sides
            var inView = topPts[k].px > cx-5
            if(inView){
              var bright = 0.45 + (topPts[k].px-cx)/(hr*zoom)*0.3
              face([botPts[k],botPts[next],topPts[next],topPts[k]],
                cajasAlpha(bgColor,Math.min(0.85,bright)), 'rgba(255,255,255,.1)')
            }
          }

          // Cara superior (tapa animada)
          var tapAng6=(1-t)*(-Math.PI*0.65)
          var pivL=topPts[3], pivR=topPts[0]
          function vH(px2,py2){
            // Rotar la cara top sobre el borde trasero
            return {px:px2, py:py2*Math.cos(tapAng6)-py2*Math.sin(tapAng6)*0.3}
          }
          // Tapa simple: polígono hexagonal en la parte superior, rotado
          ctx.save(); ctx.globalAlpha=0.88
          ctx.beginPath(); ctx.moveTo(topPts[0].px,topPts[0].py)
          for(var k=1;k<sides;k++) ctx.lineTo(topPts[k].px, topPts[k].py + (1-t)*(-hh*zoom*0.8*(k<3?1:-0.2)))
          ctx.closePath()
          ctx.fillStyle=cajasAlpha(color,.45); ctx.fill()
          ctx.strokeStyle=color; ctx.lineWidth=1.5; ctx.stroke()
          ctx.restore()

          // Logo en cara frontal
          if(cajasLogoImg){
            var fc=topPts[5]||topPts[0], fc2=topPts[1]||topPts[0]
            var fb=botPts[5]||botPts[0]
            var px2=(fc.px+fc2.px)/2, py2=(fc.py+fb.py)/2
            var fw2=Math.abs(fc2.px-fc.px)*0.6, fh2=Math.abs(fb.py-fc.py)*0.5
            var lr2=Math.min(fw2/cajasLogoImg.width, fh2/cajasLogoImg.height)
            ctx.drawImage(cajasLogoImg, px2-cajasLogoImg.width*lr2/2, py2-cajasLogoImg.height*lr2/2,
              cajasLogoImg.width*lr2, cajasLogoImg.height*lr2)
          }

        } else {
          // Fallback: caja rectangular genérica
          var fl=proj(-hw,-hh, hd), fr=proj( hw,-hh, hd)
          var bl=proj(-hw,-hh,-hd), br=proj( hw,-hh,-hd)
          var FL=proj(-hw, hh, hd), FR=proj( hw, hh, hd)
          var BL=proj(-hw, hh,-hd), BR=proj( hw, hh,-hd)
          shadow(cx,cy+hh*zoom*0.9, hw*zoom*0.7, hw*zoom*0.18)
          face([bl,br,BR,BL], cajasAlpha(bgColor,.45), 'rgba(255,255,255,.08)')
          face([bl,fl,FL,BL], cajasAlpha(bgColor,.6),  'rgba(255,255,255,.1)')
          face([fl,fr,FR,FL], bgColor, 'rgba(255,255,255,.18)')
          drawLogo(FL,FR,fl,fr)
          face([fr,br,BR,FR], cajasAlpha(bgColor,.72), 'rgba(255,255,255,.12)')
          var T0=vT(-hw,0,0),T1=vT(hw,0,0),T2=vT(hw,0,hd*2),T3=vT(-hw,0,hd*2)
          face([T0,T1,T2,T3], cajasAlpha(color,.4), color, 1.5, 0.92)
        }

        // Label
        ctx.fillStyle='rgba(255,255,255,.45)'; ctx.font='bold 11px Arial'
        ctx.textAlign='center'; ctx.fillText(d?d.icono+' '+d.nombre:'',cx,c.height-8)
        ctx.textAlign='left'
      }

      // ── Slider listener ───────────────────────────────────────────────
      function cajasInitSlider(){
        var sl=document.getElementById('cajasSlider')
        if(sl) sl.addEventListener('input',function(){
          var dims=cajasGetDims()
          cajasRenderPreview3D(dims.W,dims.H,dims.D,
            document.getElementById('cajasColor').value||'#159A9C',
            document.getElementById('cajasBgColor').value||'#f5f0e8',
            (document.getElementById('cajasTexto')||{}).value||'')
        })
      }

      // ── Descarga PNG/PDF del diseño actual ────────────────────────────
      window.cajasDescargarPNGActual = function() {
        var dims=cajasGetDims(), W=dims.W, H=dims.H, D=dims.D
        var color=document.getElementById('cajasColor').value||'#159A9C'
        var bgColor=document.getElementById('cajasBgColor').value||'#f5f0e8'
        var texto=(document.getElementById('cajasTexto')||{}).value||''
        var d=CAJAS_DISEÑOS[cajasSelectedIdx]; if(!d) return
        var HI=4.5, cW=d.cW(W,H,D), cH=d.cH(W,H,D)
        var hiC=document.createElement('canvas'); hiC.width=Math.round(cW*HI); hiC.height=Math.round(cH*HI)
        var hiCtx=hiC.getContext('2d',{willReadFrequently:true})
        hiCtx.fillStyle='#fff'; hiCtx.fillRect(0,0,hiC.width,hiC.height)
        try{d.render(hiCtx,W,H,D,cajasLogoImg,color,bgColor,texto,HI)}catch(e){}
        var a=document.createElement('a')
        window.dlCheck('cajas', function(){
          a.href=hiC.toDataURL('image/png')
          a.download='caja-'+d.nombre.toLowerCase().replace(/\s+/g,'-')+'.png'
          a.click()
        })
      }

      window.cajasDescargarPDFActual = function() {
        var dims=cajasGetDims(), W=dims.W, H=dims.H, D=dims.D
        var color=document.getElementById('cajasColor').value||'#159A9C'
        var bgColor=document.getElementById('cajasBgColor').value||'#f5f0e8'
        var texto=(document.getElementById('cajasTexto')||{}).value||''
        var d=CAJAS_DISEÑOS[cajasSelectedIdx]; if(!d) return
        var cW=d.cW(W,H,D), cH=d.cH(W,H,D)
        var pC=document.createElement('canvas'); pC.width=794; pC.height=1123
        var pCtx=pC.getContext('2d',{willReadFrequently:true})
        pCtx.fillStyle='#fff'; pCtx.fillRect(0,0,794,1123)
        var fitSc=Math.min(750/cW,1050/cH)
        pCtx.save(); pCtx.translate((794-cW*fitSc)/2,(1123-cH*fitSc)/2-10)
        try{d.render(pCtx,W,H,D,cajasLogoImg,color,bgColor,texto,fitSc)}catch(e){}
        pCtx.restore()
        pCtx.fillStyle='#555'; pCtx.font='bold 12px Arial'; pCtx.textAlign='center'
        pCtx.fillText('📦 '+d.nombre+' — '+dims.W/10+'×'+dims.H/10+'×'+dims.D/10+' cm | lamadriguera.site',397,25)
        pCtx.font='10px Arial'; pCtx.fillStyle='#999'
        pCtx.fillText('Línea sólida = cortar · Punteada = doblar',397,1110)
        pCtx.textAlign='left'
        var img=pC.toDataURL('image/png')
        var html='<!DOCTYPE html><html><head><style>*{margin:0;padding:0}body{background:#fff}img{width:210mm;height:297mm;display:block}@page{size:A4;margin:0}</style></head><body><img src="'+img+'"/>\u003cscript\u003ewindow.onload=function(){setTimeout(function(){window.print()},400)}\u003c/script\u003e</body></html>'
        window.dlCheck('cajas', function(){
          var w=window.open('','_blank')
          if(w){w.document.write(html);w.document.close()}
          else alert('Habilitá ventanas emergentes.')
        })
      }

      // Compatibilidad: estas funciones ya no se usan pero pueden llamarse desde lugares viejos
      window.cajasGenerarTodas = function() { cajasRenderActual() }
      window.cajaDescargarPNG = function(idx) { cajasSelectedIdx=idx; cajasDescargarPNGActual() }
      window.cajaDescargarPDF = function(idx) { cajasSelectedIdx=idx; cajasDescargarPDFActual() }

      // ── Init al abrir el modal ─────────────────────────────────────────
      ;(function(){
        var _origAbrirE=window.abrirEmprendedor
        window.abrirEmprendedor=function(id){
          _origAbrirE(id)
          if(id==='modal-cajas'){
            setTimeout(function(){
              cajasRenderTipoList()
              cajasInitColorSync()
              cajasInitSlider()
              cajasUpdateAreaLabel()
              cajasRenderActual()
            },80)
          }
        }
      })()
      // ── Fin diseñador de cajas ──────────────────────────────────────



      // ══════════════════════════════════════════════════════════════════

      // ══════════════════════════════════════════════════════════════════
