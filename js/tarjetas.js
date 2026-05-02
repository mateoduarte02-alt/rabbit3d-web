// ═══════════════════════════════════════════════════
// tarjetas.js — La Madriguera
// ═══════════════════════════════════════════════════

    const TARJ_W=1063,TARJ_H=650
    function tarjColorAlpha(color, alpha) {
      color = (color || '#000000').trim()
      if (color.startsWith('rgba')) return color.replace(/[\d.]+\)$/, alpha + ')')
      if (color.startsWith('rgb')) return color.replace('rgb(', 'rgba(').replace(')', ',' + alpha + ')')
      let hex = color.replace('#','')
      if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('')
      const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16)
      return `rgba(${r},${g},${b},${alpha})`
    }
    function tarjWrapText(ctx,text,x,y,maxW,lineH,color,font,align='left'){ctx.font=font;ctx.fillStyle=color;ctx.textAlign=align;const words=text.split(' ');let line='',ly=y;for(let w of words){const t=line+(line?'\u00a0':'')+w;if(ctx.measureText(t).width>maxW&&line){ctx.fillText(line,x,ly);line=w;ly+=lineH}else line=t}if(line)ctx.fillText(line,x,ly);ctx.textAlign='left'}
    function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath()}
    const TARJ_DISENOS=[
      // 1 — Minimalista oscuro
      {nombre:'Minimalista oscuro',render(ctx,W,H,logo,neg,msg,con,ac,c2,c3,c4){const accent=ac||'#159A9C';const col2=c2||'#001520';const col3=c3||'#ffffff';const col4=c4||'#f0a028';const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,col2);bg.addColorStop(1,tarjColorAlpha(col2,0.87));ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.fillStyle=accent;ctx.fillRect(0,0,5,H);ctx.fillStyle=tarjColorAlpha(accent,0.08);ctx.fillRect(0,0,W,H*0.35);if(logo){const lh=H*0.30*(tarjLogoScale||1),lw=logo.width*(lh/logo.height);ctx.drawImage(logo,W*0.07,H*0.12,Math.min(lw,W*0.35*(tarjLogoScale||1)),lh)}ctx.font=`900 ${H*0.11}px Arial`;ctx.fillStyle='#ffffff';ctx.textAlign='left';ctx.fillText(neg||'Tu Negocio',W*0.07,H*0.58);ctx.fillStyle=accent;ctx.fillRect(W*0.07,H*0.63,W*0.15,2);tarjWrapText(ctx,msg||'\u00a1Gracias por tu compra!',W*0.07,H*0.72,W*0.86,H*0.062,'#DEEFE7',`${H*0.062}px Arial`);ctx.font=`${H*0.055}px Arial`;ctx.fillStyle=accent;ctx.fillText(con||'',W*0.07,H*0.92);ctx.font=`${H*0.18}px Arial`;ctx.fillStyle='rgba(21,154,156,0.12)';ctx.textAlign='right';ctx.fillText('\u2665',W*0.95,H*0.55);ctx.textAlign='left'}},
      // 2 — Cálido con flores
      {nombre:'Calido con flores',render(ctx,W,H,logo,neg,msg,con,ac,c2,c3,c4){ctx.fillStyle='#FDF6EC';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#C8956C';ctx.lineWidth=3;ctx.strokeRect(12,12,W-24,H-24);ctx.strokeStyle='#E8C4A0';ctx.lineWidth=1;ctx.strokeRect(20,20,W-40,H-40);['\ud83c\udf38','\ud83c\udf38','\ud83c\udf3f','\ud83c\udf3f'].forEach((e,i)=>{ctx.font=`${H*0.13}px Arial`;ctx.textAlign=i%2?'right':'left';ctx.fillText(e,i%2?W*0.98:W*0.02,i<2?H*0.22:H*0.92)});if(logo){const lh=H*0.25*(tarjLogoScale||1),lw=logo.width*(lh/logo.height);ctx.drawImage(logo,(W-Math.min(lw,W*0.4*(tarjLogoScale||1)))/2,H*0.07,Math.min(lw,W*0.4*(tarjLogoScale||1)),lh)}ctx.font=`bold ${H*0.10}px Georgia,serif`;ctx.fillStyle='#7B4F2E';ctx.textAlign='center';ctx.fillText(neg||'Tu Negocio',W/2,H*0.46);ctx.strokeStyle='#C8956C';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(W*0.25,H*0.52);ctx.lineTo(W*0.75,H*0.52);ctx.stroke();tarjWrapText(ctx,msg||'Gracias por tu compra!',W/2,H*0.64,W*0.75,H*0.068,'#5C3D2E',`italic ${H*0.068}px Georgia,serif`,'center');ctx.font=`${H*0.053}px Arial`;ctx.fillStyle='#C8956C';ctx.fillText(con||'',W/2,H*0.89);ctx.textAlign='left'}},
      // 3 — Moderno degradado
      {nombre:'Moderno degradado',render(ctx,W,H,logo,neg,msg,con,ac,c2,c3,c4){const accent=ac||'#159A9C';const col2=c2||'#001520';const col3=c3||'#ffffff';const col4=c4||'#f0a028';ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);const grad=ctx.createLinearGradient(0,0,W*0.42,H);grad.addColorStop(0,accent);grad.addColorStop(1,col2);ctx.fillStyle=grad;ctx.fillRect(0,0,W*0.42,H);ctx.beginPath();ctx.arc(W*0.42,H/2,H*0.55,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,0.06)';ctx.fill();if(logo){const lh=H*0.28*(tarjLogoScale||1),lw=logo.width*(lh/logo.height);ctx.drawImage(logo,(W*0.42-Math.min(lw,W*0.35*(tarjLogoScale||1)))/2,H*0.10,Math.min(lw,W*0.35*(tarjLogoScale||1)),lh)}ctx.font=`bold ${H*0.085}px Arial`;ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(neg||'Tu Negocio',W*0.21,H*0.52);ctx.font=`${H*0.06}px Arial`;ctx.fillText('\u2726 \u2726 \u2726',W*0.21,H*0.64);ctx.font=`${H*0.05}px Arial`;ctx.fillStyle='rgba(255,255,255,0.8)';ctx.fillText(con||'',W*0.21,H*0.87);ctx.textAlign='left';ctx.font=`${H*0.075}px Arial`;ctx.fillStyle=accent;ctx.fillText('\u00a1Gracias!',W*0.50,H*0.22);ctx.fillStyle=col4;ctx.fillRect(W*0.50,H*0.27,W*0.18,3);tarjWrapText(ctx,msg||'Gracias por elegirnos.',W*0.50,H*0.42,W*0.47,H*0.072,'#333',`${H*0.068}px Arial`)}},
      // 4 — Festivo con confetti
      {nombre:'Festivo con confetti',render(ctx,W,H,logo,neg,msg,con,ac,c2,c3,c4){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);const cc=['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#FF6BD6','#FF9F43'];const rng=s=>{let x=Math.sin(s)*10000;return x-Math.floor(x)};for(let i=0;i<55;i++){ctx.save();ctx.fillStyle=cc[Math.floor(rng(i*7+1)*cc.length)];ctx.globalAlpha=0.55;const cx2=rng(i*3+1)*W,cy2=rng(i*5+2)*H,sz=6+rng(i*11+3)*12;ctx.translate(cx2,cy2);ctx.rotate(rng(i*13+4)*Math.PI*2);if(i%3===0)ctx.fillRect(-sz/2,-sz/6,sz,sz/3);else if(i%3===1){ctx.beginPath();ctx.arc(0,0,sz/2.5,0,Math.PI*2);ctx.fill()}else{ctx.beginPath();ctx.moveTo(0,-sz/2);ctx.lineTo(sz/2,sz/2);ctx.lineTo(-sz/2,sz/2);ctx.closePath();ctx.fill()};ctx.restore()};ctx.globalAlpha=1;const bx=W*0.08,by=H*0.06,bw=W*0.84,bh=H*0.88;ctx.fillStyle='rgba(255,255,255,0.92)';roundRect(ctx,bx,by,bw,bh,16);ctx.fill();ctx.strokeStyle='#FFD93D';ctx.lineWidth=3;roundRect(ctx,bx,by,bw,bh,16);ctx.stroke();if(logo){const lh=H*0.24*(tarjLogoScale||1),lw=logo.width*(lh/logo.height);ctx.drawImage(logo,(W-Math.min(lw,W*0.40*(tarjLogoScale||1)))/2,H*0.10,Math.min(lw,W*0.40*(tarjLogoScale||1)),lh)}ctx.font=`900 ${H*0.095}px Arial`;ctx.fillStyle='#FF6B6B';ctx.textAlign='center';ctx.fillText('\u00a1GRACIAS!',W/2,H*0.46);ctx.font=`bold ${H*0.075}px Arial`;ctx.fillStyle='#4D96FF';ctx.fillText(neg||'Tu Negocio',W/2,H*0.58);tarjWrapText(ctx,msg||'Tu compra nos alegra el dia!',W/2,H*0.72,W*0.72,H*0.062,'#555',`${H*0.062}px Arial`,'center');ctx.font=`${H*0.052}px Arial`;ctx.fillStyle='#888';ctx.fillText(con||'',W/2,H*0.90);ctx.textAlign='left'}},
      // 5 — Elegante negro y dorado
      {nombre:'Elegante negro y dorado',render(ctx,W,H,logo,neg,msg,con,ac,c2,c3,c4){ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,W,H);const gBorder=ctx.createLinearGradient(0,0,W,H);gBorder.addColorStop(0,'#c9a84c');gBorder.addColorStop(0.5,'#f0d060');gBorder.addColorStop(1,'#c9a84c');ctx.strokeStyle=gBorder;ctx.lineWidth=3;ctx.strokeRect(10,10,W-20,H-20);ctx.strokeStyle='rgba(201,168,76,0.3)';ctx.lineWidth=1;ctx.strokeRect(18,18,W-36,H-36);if(logo){const lh=H*0.28*(tarjLogoScale||1),lw=logo.width*(lh/logo.height);ctx.drawImage(logo,W*0.06,H*0.10,Math.min(lw,W*0.35*(tarjLogoScale||1)),lh)}ctx.font=`bold ${H*0.095}px Georgia,serif`;ctx.fillStyle='#f0d060';ctx.textAlign='left';ctx.fillText(neg||'Tu Negocio',W*0.06,H*0.55);const gLine=ctx.createLinearGradient(W*0.06,0,W*0.5,0);gLine.addColorStop(0,'#f0d060');gLine.addColorStop(1,'transparent');ctx.strokeStyle=gLine;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(W*0.06,H*0.60);ctx.lineTo(W*0.55,H*0.60);ctx.stroke();tarjWrapText(ctx,msg||'Gracias por tu confianza.',W*0.06,H*0.71,W*0.88,H*0.065,'#d4c5a0',`italic ${H*0.065}px Georgia,serif`);ctx.font=`${H*0.052}px Arial`;ctx.fillStyle='rgba(201,168,76,0.7)';ctx.fillText(con||'',W*0.06,H*0.90);ctx.font=`${H*0.22}px Arial`;ctx.fillStyle='rgba(201,168,76,0.06)';ctx.textAlign='right';ctx.fillText('\u2605',W*0.97,H*0.65);ctx.textAlign='left'}},
      // 6 — Naturaleza verde
      {nombre:'Naturaleza verde',render(ctx,W,H,logo,neg,msg,con,ac,c2,c3,c4){const accent=ac||'#2d7a4f';const col2=c2||'#f0f7f0';const col3=c3||'#ffffff';const col4=c4||'#4ade80';const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#f0f7f0');bg.addColorStop(1,'#e0f0e8');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.fillStyle=accent;ctx.fillRect(0,0,W*0.06,H);const av=ctx.createLinearGradient(0,0,0,H);av.addColorStop(0,'#4ade80');av.addColorStop(1,accent);ctx.fillStyle=av;ctx.fillRect(0,0,6,H);['\ud83c\udf3f','\ud83c\udf43','\ud83c\udf3f','\ud83c\udf43'].forEach((e,i)=>{ctx.font=`${H*(i<2?0.10:0.08)}px Arial`;ctx.textAlign='right';ctx.fillText(e,W*0.99,i<2?H*(0.15+i*0.12):H*(0.78+i*0.08))});if(logo){const lh=H*0.28*(tarjLogoScale||1),lw=logo.width*(lh/logo.height);ctx.drawImage(logo,W*0.10,H*0.10,Math.min(lw,W*0.38*(tarjLogoScale||1)),lh)}ctx.font=`bold ${H*0.10}px Arial`;ctx.fillStyle='#1a5c38';ctx.textAlign='left';ctx.fillText(neg||'Tu Negocio',W*0.10,H*0.55);ctx.fillStyle=accent;ctx.fillRect(W*0.10,H*0.60,W*0.12,2.5);tarjWrapText(ctx,msg||'Gracias por elegirnos!',W*0.10,H*0.70,W*0.82,H*0.062,'#2d5a3d',`${H*0.062}px Arial`);ctx.font=`${H*0.052}px Arial`;ctx.fillStyle=accent;ctx.fillText(con||'',W*0.10,H*0.90)}},
      // 7 — Pastel rosado
      {nombre:'Pastel rosado',render(ctx,W,H,logo,neg,msg,con,ac,c2,c3,c4){const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#fff0f5');bg.addColorStop(1,'#ffe4ef');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.fillStyle='rgba(255,182,193,0.4)';ctx.beginPath();ctx.arc(W*0.85,H*0.15,H*0.4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(W*0.1,H*0.85,H*0.3,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e8a0b0';ctx.lineWidth=2;ctx.strokeRect(12,12,W-24,H-24);['\ud83c\udf39','\ud83c\udf37','\ud83d\udc9d','\u2728'].forEach((e,i)=>{ctx.font=`${H*(i<2?0.10:0.09)}px Arial`;ctx.fillText(e,W*(0.06+i*0.22),H*0.96)});if(logo){const lh=H*0.25*(tarjLogoScale||1),lw=logo.width*(lh/logo.height);ctx.drawImage(logo,(W-Math.min(lw,W*0.4*(tarjLogoScale||1)))/2,H*0.07,Math.min(lw,W*0.4*(tarjLogoScale||1)),lh)}ctx.font=`bold ${H*0.095}px Georgia,serif`;ctx.fillStyle='#c0406a';ctx.textAlign='center';ctx.fillText(neg||'Tu Negocio',W/2,H*0.47);ctx.strokeStyle='#f4a0b8';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(W*0.2,H*0.52);ctx.lineTo(W*0.8,H*0.52);ctx.stroke();tarjWrapText(ctx,msg||'Gracias por tu compra!',W/2,H*0.64,W*0.78,H*0.065,'#8b3a5a',`italic ${H*0.065}px Georgia,serif`,'center');ctx.font=`${H*0.052}px Arial`;ctx.fillStyle='#c0406a';ctx.fillText(con||'',W/2,H*0.84);ctx.textAlign='left'}},
      // 8 — Geométrico moderno
      {nombre:'Geometrico moderno',render(ctx,W,H,logo,neg,msg,con,ac,c2,c3,c4){const accent=ac||'#e94560';const col2=c2||'#1a1a2e';const col3=c3||'#f8f9fa';const col4=c4||'#159A9C';ctx.fillStyle='#f8f9fa';ctx.fillRect(0,0,W,H);ctx.fillStyle=col2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(W*0.45,0);ctx.lineTo(W*0.35,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();ctx.fillStyle=accent;ctx.beginPath();ctx.moveTo(W*0.45,0);ctx.lineTo(W*0.52,0);ctx.lineTo(W*0.42,H);ctx.lineTo(W*0.35,H);ctx.closePath();ctx.fill();ctx.fillStyle=tarjColorAlpha(accent,0.15);ctx.beginPath();ctx.moveTo(W*0.52,0);ctx.lineTo(W,0);ctx.lineTo(W,H*0.5);ctx.closePath();ctx.fill();if(logo){const lh=H*0.28*(tarjLogoScale||1),lw=logo.width*(lh/logo.height);ctx.drawImage(logo,(W*0.38/2-Math.min(lw,W*0.32*(tarjLogoScale||1))/2),H*0.10,Math.min(lw,W*0.32*(tarjLogoScale||1)),lh)}ctx.font=`bold ${H*0.09}px Arial`;ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.fillText(neg||'Tu Negocio',W*0.19,H*0.55);ctx.font=`${H*0.052}px Arial`;ctx.fillStyle='rgba(255,255,255,0.7)';ctx.fillText(con||'',W*0.19,H*0.68);ctx.font=`${H*0.08}px Arial`;ctx.fillStyle=col2;ctx.textAlign='left';ctx.fillText('\u00a1Gracias!',W*0.58,H*0.30);ctx.fillStyle=accent;ctx.fillRect(W*0.58,H*0.35,W*0.12,3);tarjWrapText(ctx,msg||'Gracias por elegirnos.',W*0.58,H*0.46,W*0.38,H*0.062,'#333',`${H*0.058}px Arial`);ctx.font=`${H*0.20}px Arial`;ctx.fillStyle=tarjColorAlpha(accent,0.07);ctx.textAlign='right';ctx.fillText('\u25b2',W*0.99,H*0.92);ctx.textAlign='left'}},
      {nombre:'Bicolor clásico',render(ctx,W,H,logo,neg,msg,con,ac,c2,c3,c4){
        // Mitad izquierda oscura con logo, mitad derecha clara con mensaje — como la imagen de referencia
        const accent=ac||'#159A9C'
        const leftW=W*0.38
        // Fondo derecho
        ctx.fillStyle=c3||'#f5f5f5';ctx.fillRect(0,0,W,H)
        // Panel izquierdo
        ctx.fillStyle=c2||'#1a1a2e';ctx.fillRect(0,0,leftW,H)
        // Línea de acento
        ctx.fillStyle=accent;ctx.fillRect(leftW-4,0,4,H)
        // Logo en panel izquierdo
        if(logo){const lh=H*0.30*(tarjLogoScale||1),lw=logo.width*(lh/logo.height);const lx=(leftW-Math.min(lw,leftW*0.75*(tarjLogoScale||1)))/2;ctx.drawImage(logo,lx,H*0.18,Math.min(lw,leftW*0.75*(tarjLogoScale||1)),lh)}
        // Nombre negocio en panel izquierdo
        ctx.font=`bold ${H*0.075}px Arial`;ctx.fillStyle='#ffffff';ctx.textAlign='center';ctx.fillText(neg||'Tu Negocio',leftW/2,H*0.65)
        // Línea decorativa
        ctx.fillStyle=accent;ctx.fillRect(leftW*0.2,H*0.70,leftW*0.6,2)
        // Contacto
        ctx.font=`${H*0.048}px Arial`;ctx.fillStyle='rgba(255,255,255,0.6)';ctx.fillText(con||'',leftW/2,H*0.80)
        // Panel derecho — mensaje
        ctx.textAlign='left'
        ctx.font=`bold ${H*0.10}px Georgia,serif`;ctx.fillStyle='#1a1a2e'
        ctx.fillText('\u00a1Gracias!',leftW+W*0.07,H*0.35)
        ctx.fillStyle=accent;ctx.fillRect(leftW+W*0.07,H*0.40,W*0.15,2.5)
        tarjWrapText(ctx,msg||'Gracias por elegirnos.',leftW+W*0.07,H*0.53,W*0.50,H*0.068,'#444',`${H*0.065}px Georgia,serif`)
        // Punto decorativo
        ctx.font=`${H*0.22}px Arial`;ctx.fillStyle='rgba(21,154,156,0.07)';ctx.textAlign='right';ctx.fillText('\u25cf',W*0.97,H*0.95);ctx.textAlign='left'
      }},
      {nombre:'Franjas de color',render(ctx,W,H,logo,neg,msg,con,ac,c2,c3,c4){
        const accent=ac||'#f0a028'
        // Fondo blanco
        ctx.fillStyle=c3||'#ffffff';ctx.fillRect(0,0,W,H)
        // Franja superior
        ctx.fillStyle=c2||'#1a1a2e';ctx.fillRect(0,0,W,H*0.42)
        // Franja de acento
        ctx.fillStyle=accent;ctx.fillRect(0,H*0.42,W,H*0.045)
        // Logo centrado en franja oscura
        if(logo){const lh=H*0.22*(tarjLogoScale||1),lw=logo.width*(lh/logo.height);ctx.drawImage(logo,(W-Math.min(lw,W*0.45*(tarjLogoScale||1)))/2,H*0.06,Math.min(lw,W*0.45*(tarjLogoScale||1)),lh)}
        // Nombre en franja oscura
        ctx.font=`bold ${H*0.085}px Arial`;ctx.fillStyle='#ffffff';ctx.textAlign='center'
        ctx.fillText(neg||'Tu Negocio',W/2,H*0.37)
        // Mensaje en parte clara
        ctx.font=`${H*0.082}px Georgia,serif`;ctx.fillStyle=c2||'#1a1a2e'
        ctx.fillText('\u00a1Gracias!',W/2,H*0.60)
        tarjWrapText(ctx,msg||'Gracias por tu compra.',W/2,H*0.72,W*0.80,H*0.062,'#555',`${H*0.058}px Arial`,'center')
        ctx.font=`${H*0.048}px Arial`;ctx.fillStyle=accent
        ctx.fillText(con||'',W/2,H*0.90);ctx.textAlign='left'
      }},
      {nombre:'Marco redondeado',render(ctx,W,H,logo,neg,msg,con,ac,c2,c3,c4){
        const accent=ac||'#5b4fcf'
        // Fondo con color suave
        ctx.fillStyle=c3||'#f0eeff';ctx.fillRect(0,0,W,H)
        // Marco exterior redondeado relleno
        ctx.fillStyle=accent
        roundRect(ctx,0,0,W,H*0.45,0);ctx.fill()
        // Círculo decorativo
        ctx.beginPath();ctx.arc(W*0.85,H*0.05,H*0.28,0,Math.PI*2)
        ctx.fillStyle='rgba(255,255,255,0.08)';ctx.fill()
        // Logo
        if(logo){const lh=H*0.22*(tarjLogoScale||1),lw=logo.width*(lh/logo.height);ctx.drawImage(logo,W*0.07,H*0.07,Math.min(lw,W*0.38*(tarjLogoScale||1)),lh)}
        // Nombre
        ctx.font=`bold ${H*0.085}px Arial`;ctx.fillStyle='#ffffff';ctx.textAlign='left'
        ctx.fillText(neg||'Tu Negocio',W*0.07,H*0.36)
        // Separador curvo
        ctx.fillStyle='#f0eeff'
        ctx.beginPath();ctx.ellipse(W/2,H*0.45,W*0.6,H*0.08,0,0,Math.PI*2);ctx.fill()
        // Mensaje
        ctx.font=`bold ${H*0.082}px Georgia,serif`;ctx.fillStyle=accent
        ctx.fillText('\u00a1Gracias!',W*0.07,H*0.60)
        ctx.fillStyle=accent;ctx.fillRect(W*0.07,H*0.65,W*0.14,2.5)
        tarjWrapText(ctx,msg||'Gracias por elegirnos.',W*0.07,H*0.75,W*0.86,H*0.060,'#333',`${H*0.057}px Arial`)
        ctx.font=`${H*0.048}px Arial`;ctx.fillStyle='#888'
        ctx.fillText(con||'',W*0.07,H*0.91);ctx.textAlign='left'
      }},
      {nombre:'Lateral degradado',render(ctx,W,H,logo,neg,msg,con,ac,c2,c3,c4){
        const accent=ac||'#c0392b'
        const rightW=W*0.40
        const leftW=W-rightW
        // Panel izquierdo claro
        ctx.fillStyle=c3||'#ffffff';ctx.fillRect(0,0,leftW,H)
        // Panel derecho degradado
        const gr=ctx.createLinearGradient(leftW,0,W,H)
        gr.addColorStop(0,accent);gr.addColorStop(1,c2||'#1a1a2e')
        ctx.fillStyle=gr;ctx.fillRect(leftW,0,rightW,H)
        // Línea divisoria
        ctx.fillStyle=accent;ctx.fillRect(leftW,0,3,H)
        // Panel izquierdo — mensaje
        ctx.font=`bold ${H*0.095}px Georgia,serif`;ctx.fillStyle=c2||'#1a1a2e';ctx.textAlign='left'
        ctx.fillText('\u00a1Gracias!',W*0.06,H*0.28)
        ctx.fillStyle=accent;ctx.fillRect(W*0.06,H*0.33,W*0.16,2.5)
        tarjWrapText(ctx,msg||'Gracias por tu compra.',W*0.06,H*0.46,leftW*0.85,H*0.065,'#444',`${H*0.060}px Arial`)
        ctx.font=`${H*0.048}px Arial`;ctx.fillStyle='#888'
        ctx.fillText(con||'',W*0.06,H*0.90)
        // Panel derecho — logo y nombre
        ctx.textAlign='center'
        if(logo){const lh=H*0.30*(tarjLogoScale||1),lw=logo.width*(lh/logo.height);ctx.drawImage(logo,leftW+(rightW-Math.min(lw,rightW*0.75*(tarjLogoScale||1)))/2,H*0.10,Math.min(lw,rightW*0.75*(tarjLogoScale||1)),lh)}
        ctx.font=`bold ${H*0.080}px Arial`;ctx.fillStyle='#ffffff'
        ctx.fillText(neg||'Tu Negocio',leftW+rightW/2,H*0.60)
        ctx.fillStyle='rgba(255,255,255,0.4)';ctx.fillRect(leftW+rightW*0.2,H*0.65,rightW*0.6,1.5)
        ctx.font=`${H*0.046}px Arial`;ctx.fillStyle='rgba(255,255,255,0.6)'
        ctx.fillText(con||'',leftW+rightW/2,H*0.76);ctx.textAlign='left'
      }}
      ,{nombre:'Acuarela pastel',render:function(ctx,W,H,logo,neg,msg,con,ac,c2,c3,c4){
        var accent=ac||'#9b59b6'; var col2=c2||'#6c3483'; var col3=c3||'#fce4ec'
        var bg=ctx.createLinearGradient(0,0,W,H)
        bg.addColorStop(0,tarjColorAlpha(accent,0.15)); bg.addColorStop(0.5,tarjColorAlpha(col2,0.10)); bg.addColorStop(1,tarjColorAlpha(accent,0.08))
        ctx.fillStyle=col3; ctx.fillRect(0,0,W,H)
        ctx.fillStyle=bg; ctx.fillRect(0,0,W,H)
        var manchas=[[0.1,0.1,0.3],[0.7,0.05,0.25],[0.05,0.7,0.28],[0.65,0.65,0.22]]
        for(var mi=0;mi<manchas.length;mi++){
          var g=ctx.createRadialGradient(W*manchas[mi][0],H*manchas[mi][1],0,W*manchas[mi][0],H*manchas[mi][1],W*manchas[mi][2])
          g.addColorStop(0,tarjColorAlpha(accent,0.18)); g.addColorStop(1,'transparent')
          ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
        }
        if(logo){var lh=H*0.26*(tarjLogoScale||1),lw=logo.width*(lh/logo.height);ctx.drawImage(logo,(W-Math.min(lw,W*0.42*(tarjLogoScale||1)))/2,H*0.08,Math.min(lw,W*0.42*(tarjLogoScale||1)),lh)}
        ctx.font='bold '+Math.round(H*0.092)+'px Georgia,serif'; ctx.fillStyle=col2; ctx.textAlign='center'
        ctx.fillText(neg||'Tu Negocio',W/2,H*0.50)
        ctx.font=Math.round(H*0.055)+'px Arial'; ctx.fillStyle='#888'
        ctx.fillText('☆ ♡ ☆',W/2,H*0.60)
        tarjWrapText(ctx,msg||'¡Gracias por tu compra!',W/2,H*0.72,W*0.76,H*0.062,tarjColorAlpha(col2,0.75),'italic '+Math.round(H*0.060)+'px Georgia,serif','center')
        ctx.font=Math.round(H*0.052)+'px Arial'; ctx.fillStyle=accent; ctx.fillText(con||'',W/2,H*0.90); ctx.textAlign='left'
      }}
      ,{nombre:'Neon oscuro',render:function(ctx,W,H,logo,neg,msg,con,ac,c2,c3,c4){
        var accent=ac||'#00ff88'; var col2=c2||'#001520'; var col3=c3||'#00ccff'
        ctx.fillStyle='#050d15'; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='rgba(0,255,136,0.06)'
        for(var gx=0;gx<W;gx+=18) for(var gy=0;gy<H;gy+=18){ctx.beginPath();ctx.arc(gx,gy,1,0,Math.PI*2);ctx.fill()}
        ctx.shadowColor=accent; ctx.shadowBlur=12; ctx.strokeStyle=accent; ctx.lineWidth=2
        ctx.strokeRect(8,8,W-16,H-16); ctx.shadowBlur=0
        if(logo){var lh2=H*0.26*(tarjLogoScale||1),lw2=logo.width*(lh2/logo.height);ctx.drawImage(logo,W*0.07,H*0.10,Math.min(lw2,W*0.38*(tarjLogoScale||1)),lh2)}
        ctx.shadowColor=accent; ctx.shadowBlur=10
        ctx.font='900 '+Math.round(H*0.10)+'px Arial'; ctx.fillStyle=accent; ctx.textAlign='left'
        ctx.fillText(neg||'Tu Negocio',W*0.07,H*0.56); ctx.shadowBlur=0
        tarjWrapText(ctx,msg||'¡gracias por tu compra!',W*0.07,H*0.70,W*0.86,H*0.062,col3,Math.round(H*0.058)+'px Arial')
        ctx.font=Math.round(H*0.050)+'px Arial'; ctx.fillStyle='rgba(0,255,136,0.6)'; ctx.fillText(con||'',W*0.07,H*0.90); ctx.textAlign='left'
      }}
      ,{nombre:'Retro vintage',render:function(ctx,W,H,logo,neg,msg,con,ac,c2,c3,c4){
        var accent=ac||'#c0392b'; var col2=c2||'#2c2c2c'; var col3=c3||'#f5e6d0'
        ctx.fillStyle=col3; ctx.fillRect(0,0,W,H)
        ctx.fillStyle='rgba(139,90,43,0.07)'; ctx.fillRect(0,0,W,H)
        ctx.strokeStyle=accent; ctx.lineWidth=4; ctx.strokeRect(8,8,W-16,H-16)
        ctx.strokeStyle=tarjColorAlpha(accent,0.4); ctx.lineWidth=1.5; ctx.strokeRect(16,16,W-32,H-32)
        var corn=[[20,20],[W-20,20],[20,H-20],[W-20,H-20]]
        for(var ci=0;ci<corn.length;ci++){ctx.font=Math.round(H*0.07)+'px serif';ctx.fillStyle=accent;ctx.textAlign='center';ctx.fillText('✶',corn[ci][0],corn[ci][1]+8)}
        if(logo){var lh3=H*0.24*(tarjLogoScale||1),lw3=logo.width*(lh3/logo.height);ctx.drawImage(logo,(W-Math.min(lw3,W*0.40*(tarjLogoScale||1)))/2,H*0.08,Math.min(lw3,W*0.40*(tarjLogoScale||1)),lh3)}
        ctx.font='bold '+Math.round(H*0.09)+'px Georgia,serif'; ctx.fillStyle=col2; ctx.textAlign='center'
        ctx.fillText(neg||'Tu Negocio',W/2,H*0.50)
        ctx.strokeStyle=accent; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(W*0.2,H*0.55); ctx.lineTo(W*0.8,H*0.55); ctx.stroke()
        tarjWrapText(ctx,msg||'¡Gracias por su preferencia!',W/2,H*0.68,W*0.72,H*0.065,col2,'italic '+Math.round(H*0.062)+'px Georgia,serif','center')
        ctx.font=Math.round(H*0.050)+'px Arial'; ctx.fillStyle=accent; ctx.fillText(con||'',W/2,H*0.88); ctx.textAlign='left'
      }}
      ,{nombre:'Ondas dinamicas',render:function(ctx,W,H,logo,neg,msg,con,ac,c2,c3,c4){
        var accent=ac||'#3498db'; var col2=c2||'#1abc9c'
        ctx.fillStyle='#f8faff'; ctx.fillRect(0,0,W,H)
        for(var w=0;w<3;w++){
          var wg=ctx.createLinearGradient(0,0,W,0)
          wg.addColorStop(0,tarjColorAlpha(accent,0.15-w*0.04))
          wg.addColorStop(1,tarjColorAlpha(col2,0.12-w*0.03))
          ctx.fillStyle=wg; ctx.beginPath(); ctx.moveTo(0,H*(0.55+w*0.08))
          for(var xi=0;xi<=W;xi+=W/6) ctx.quadraticCurveTo(xi+W/12,H*(0.50+w*0.08)-H*0.05*(xi%2?1:-1),xi+W/6,H*(0.55+w*0.08))
          ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill()
        }
        if(logo){var lh4=H*0.26*(tarjLogoScale||1),lw4=logo.width*(lh4/logo.height);ctx.drawImage(logo,W*0.06,H*0.10,Math.min(lw4,W*0.35*(tarjLogoScale||1)),lh4)}
        ctx.font='bold '+Math.round(H*0.10)+'px Arial'; ctx.fillStyle=accent; ctx.textAlign='left'
        ctx.fillText(neg||'Tu Negocio',W*0.06,H*0.52)
        ctx.fillStyle=col2; ctx.fillRect(W*0.06,H*0.56,W*0.14,3)
        tarjWrapText(ctx,msg||'¡Gracias!',W*0.06,H*0.68,W*0.55,H*0.065,col2,Math.round(H*0.062)+'px Arial')
        ctx.font=Math.round(H*0.052)+'px Arial'; ctx.fillStyle='#888'; ctx.fillText(con||'',W*0.06,H*0.88)
        ctx.save(); ctx.globalAlpha=0.12; ctx.fillStyle=accent
        ctx.beginPath(); ctx.arc(W*0.78,H*0.35,H*0.28,0,Math.PI*2); ctx.fill(); ctx.restore()
        ctx.textAlign='left'
      }}
    ]
    // Orden de diseños — admin puede reordenar, se guarda en Supabase
    let tarjDisenosOrden = TARJ_DISENOS.map(d => d.nombre)

    async function tarjCargarOrden() {
      try {
        const res = await supabase.from('media').select('nombre').eq('tipo','tarj-disenos-order').maybeSingle()
        if (res.data && res.data.nombre) {
          const order = JSON.parse(res.data.nombre)
          const ordered = []
          const seen = new Set()
          // Solo agregar diseños que existen Y no se hayan agregado ya (eliminar duplicados del orden guardado)
          order.forEach(n => {
            const d = TARJ_DISENOS.find(x => x.nombre === n)
            if (d && !seen.has(n)) { seen.add(n); ordered.push(d) }
          })
          TARJ_DISENOS.forEach(d => { if (!seen.has(d.nombre)) ordered.push(d) })
          tarjDisenosOrden = ordered.map(d => d.nombre)
          // Reordenar el array en lugar
          ordered.forEach((d, i) => { TARJ_DISENOS[i] = d })
        }
      } catch(e) {}
    }

    async function tarjGuardarOrden() {
      try {
        await supabase.from('media').delete().eq('tipo','tarj-disenos-order')
        await supabase.from('media').insert([{tipo:'tarj-disenos-order',url:'',nombre:JSON.stringify(TARJ_DISENOS.map(d=>d.nombre))}])
      } catch(e) {}
    }

    // Panel admin para reordenar diseños
    window.abrirOrdenTarjetas = function() {
      const modal = document.getElementById('modalOrdenTarjetas')
      if (!modal) return
      renderOrdenTarjetas()
      modal.style.display = 'flex'
      document.body.style.overflow = 'hidden'
    }
    window.cerrarOrdenTarjetas = function() {
      const modal = document.getElementById('modalOrdenTarjetas')
      if (modal) modal.style.display = 'none'
      document.body.style.overflow = ''
    }

    function renderOrdenTarjetas() {
      // Renderizar en ambos posibles contenedores
      ;['tarjOrdenList','tarjOrdenListGestion'].forEach(containerId => {
        const list = document.getElementById(containerId)
        if (!list) return
        // Liberar canvases mini antes de limpiar
        list.querySelectorAll('canvas').forEach(c=>{c.width=0;c.height=0})
        list.innerHTML = ''
        let dragSrc = null
        TARJ_DISENOS.forEach((d, i) => {
          const item = document.createElement('div')
          item.setAttribute('draggable','true')
          item.setAttribute('data-nombre', d.nombre)
          item.style.cssText = 'display:flex;align-items:center;gap:.75rem;padding:.4rem .6rem;background:var(--bg3);border:1px solid var(--border);border-radius:8px;cursor:grab;user-select:none'

          // Mini preview de la tarjeta
          const miniCanvas = document.createElement('canvas')
          miniCanvas.width = TARJ_W; miniCanvas.height = TARJ_H
          try {
            d.render(miniCanvas.getContext('2d'), TARJ_W, TARJ_H, null, 'Mi Negocio', 'Gracias!', '', tarjColores[0], tarjColores[1], tarjColores[2], tarjColores[3])
          } catch(e) {}
          const thumb = document.createElement('canvas')
          thumb.width = 72; thumb.height = 44
          thumb.style.cssText = 'border-radius:4px;flex-shrink:0;border:1px solid var(--border-sub)'
          thumb.getContext('2d').drawImage(miniCanvas, 0, 0, 72, 44)

          item.innerHTML = `<span style="font-family:var(--font-head);font-size:.6rem;color:var(--cyan);width:16px;flex-shrink:0">${i+1}</span>`
          item.appendChild(thumb)
          const nameSpan = document.createElement('span')
          nameSpan.style.cssText = 'font-size:.75rem;color:var(--text);flex:1'
          nameSpan.textContent = d.nombre
          item.appendChild(nameSpan)
          const grip = document.createElement('span')
          grip.style.cssText = 'color:var(--muted);font-size:.8rem'
          grip.textContent = '⠿'
          item.appendChild(grip)

          item.addEventListener('dragstart', e => { dragSrc = item; setTimeout(()=>item.style.opacity='.4',0) })
          item.addEventListener('dragend', () => {
            item.style.opacity='1'
            // Sincronizar orden y re-numerar
            const newOrder = []
            list.querySelectorAll('[data-nombre]').forEach(el => {
              const d2 = TARJ_DISENOS.find(x => x.nombre === el.getAttribute('data-nombre'))
              if (d2) newOrder.push(d2)
            })
            newOrder.forEach((d2,i2) => TARJ_DISENOS[i2] = d2)
            renderOrdenTarjetas()  // re-render para actualizar números
          })
          item.addEventListener('dragover', e => {
            e.preventDefault()
            if (dragSrc && dragSrc !== item) {
              const rect = item.getBoundingClientRect()
              if (e.clientY < rect.top + rect.height/2) list.insertBefore(dragSrc, item)
              else list.insertBefore(dragSrc, item.nextSibling)
            }
          })
          list.appendChild(item)
        })
      })
    }

    document.getElementById('btnGuardarOrdenTarjetas')?.addEventListener('click', async () => {
      // Leer orden del DOM y reordenar TARJ_DISENOS
      const items = document.getElementById('tarjOrdenList').querySelectorAll('[data-nombre]')
      const newOrder = []
      items.forEach(el => {
        const d = TARJ_DISENOS.find(x => x.nombre === el.getAttribute('data-nombre'))
        if (d) newOrder.push(d)
      })
      newOrder.forEach((d,i) => TARJ_DISENOS[i] = d)
      await tarjGuardarOrden()
      cerrarOrdenTarjetas()
      if (document.getElementById('tarjResultados').style.display !== 'none') tarjGenerarTodas()
    })

    setTimeout(tarjCargarOrden, 800)

    function tarjGenerarTodas(){
      const neg=document.getElementById('tarjNegocio').value.trim(),msg=document.getElementById('tarjMensaje').value.trim(),con=document.getElementById('tarjContacto').value.trim()
      // Liberar canvases anteriores antes de crear nuevos
      const grid=document.getElementById('tarjGrid')
      grid.querySelectorAll('canvas').forEach(c=>{c.width=0;c.height=0})
      grid.innerHTML=''
      window._tarjLogoParaRender = tarjLogoImg
      let logoParaRender = window._tarjLogoParaRender
      if (tarjLogoImg && tarjBgRemoval > 0) {
        // Cap: reducir resolución para chroma-key (no necesita full res)
        const _maxSide = 400
        const _ratio = Math.min(1, _maxSide / Math.max(tarjLogoImg.width, tarjLogoImg.height))
        const oc = document.createElement('canvas')
        oc.width = Math.round(tarjLogoImg.width * _ratio)
        oc.height = Math.round(tarjLogoImg.height * _ratio)
        const ox = oc.getContext('2d')
        ox.drawImage(tarjLogoImg, 0, 0)
        // Detectar color de fondo desde las 4 esquinas
        const id = ox.getImageData(0, 0, oc.width, oc.height)
        const d = id.data
        const W2 = oc.width, H2 = oc.height
        // Promediar color de las 4 esquinas como color de fondo
        const corners = [[0,0],[W2-1,0],[0,H2-1],[W2-1,H2-1]]
        let bgR=0,bgG=0,bgB=0
        corners.forEach(function(cc){ var cx=cc[0],cy=cc[1]; const i=(cy*W2+cx)*4; bgR+=d[i]; bgG+=d[i+1]; bgB+=d[i+2] })
        bgR=Math.round(bgR/4); bgG=Math.round(bgG/4); bgB=Math.round(bgB/4)
        // Tolerancia según el slider (0 = 0px, 1 = 120px de distancia en RGB)
        const tol = tarjBgRemoval * 120
        for (let i = 0; i < d.length; i += 4) {
          const dr=Math.abs(d[i]-bgR), dg=Math.abs(d[i+1]-bgG), db=Math.abs(d[i+2]-bgB)
          const dist = dr + dg + db
          if (dist < tol) {
            // Fade suave en el borde (últimos 30% de tolerancia)
            const fade = Math.min(1, (tol - dist) / (tol * 0.3))
            d[i+3] = Math.round(d[i+3] * (1 - fade))
          }
        }
        ox.putImageData(id, 0, 0)
        const oImg = new Image()
        oImg.src = oc.toDataURL()
        logoParaRender = oImg
        window._tarjLogoParaRender = oImg
      }
      TARJ_DISENOS.forEach((d,idx)=>{
        const canvas=document.createElement('canvas');canvas.width=TARJ_W;canvas.height=TARJ_H
        // Pasar los 4 colores al diseño
        d.render(canvas.getContext('2d'),TARJ_W,TARJ_H,logoParaRender,neg,msg,con,tarjColores[0],tarjColores[1],tarjColores[2],tarjColores[3])
        const wrap=document.createElement('div');wrap.className='tarj-card-wrap'
        const label=document.createElement('p');label.className='tarj-card-label';label.textContent=`${idx+1}. ${d.nombre}`
        const prev=document.createElement('canvas');prev.width=TARJ_W/2;prev.height=TARJ_H/2;prev.style.cssText='width:100%;border-radius:8px;border:1px solid var(--border-sub);display:block'
        prev.getContext('2d').drawImage(canvas,0,0,TARJ_W/2,TARJ_H/2)
        const btn=document.createElement('button');btn.className='btn btn--sm tarj-dl-btn';btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Descargar PNG'
        btn.addEventListener('click',()=>{window.dlCheck('tarjetas',function(){canvas.toBlob(blob=>{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`tarjeta-${idx+1}.png`;a.click();URL.revokeObjectURL(url);if(window.trackDescarga)trackDescarga('tarjetas')},'image/png')})})
        const btnEdit=document.createElement('button');btnEdit.className='btn btn--sm';btnEdit.style.cssText='display:flex;align-items:center;gap:.3rem;margin-top:.3rem;width:100%;justify-content:center;border-color:var(--cyan);color:var(--cyan)'
        btnEdit.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar posición'
        btnEdit.addEventListener('click',()=>window.tarjEditorAbrir(d,idx))
        wrap.appendChild(label);wrap.appendChild(prev);wrap.appendChild(btn);wrap.appendChild(btnEdit);grid.appendChild(wrap)
      })
      document.getElementById('tarjResultados').style.display='block'
      document.getElementById('tarjResultados').scrollIntoView({behavior:'smooth',block:'nearest'})
    }
    // Throttle: evita generaciones masivas al mover sliders rápido
    let _tarjGenTimer = null
    const tarjGenerarTodas_throttled = () => {
      clearTimeout(_tarjGenTimer)
      _tarjGenTimer = setTimeout(tarjGenerarTodas, 120)
    }
    document.getElementById('btnGenerarTarjetas').addEventListener('click',tarjGenerarTodas)


    // ── POTENCIADOR CON IA ────────────────────────────────────────────
    const EDGE_FN_URL=SUPABASE_URL+'/functions/v1/potenciador-producto'
    let potencImgBase64=null,potencImgType='image/jpeg'
    const potencZone=document.getElementById('potencUploadZone'),potencFile=document.getElementById('potencImgFile'),potencPreview=document.getElementById('potencImgPreview'),potencInner=document.getElementById('potencUploadInner'),potencChange=document.getElementById('potencChangeBtn')
    function potencSetImg(file){if(!file)return;if(file.size>5*1024*1024){document.getElementById('potencError').textContent='Imagen mayor a 5MB';return}potencImgType=file.type||'image/jpeg';const r=new FileReader();r.onload=e=>{potencImgBase64=e.target.result.split(',')[1];potencPreview.src=e.target.result;potencPreview.style.display='block';potencInner.style.display='none';potencChange.style.display='block';document.getElementById('potencError').textContent='';document.getElementById('potencResultados').style.display='none'};r.readAsDataURL(file)}
    potencZone.addEventListener('click',e=>{if(!e.target.closest('#potencChangeBtn'))potencFile.click()});potencChange.addEventListener('click',e=>{e.stopPropagation();potencFile.click()});potencFile.addEventListener('change',e=>potencSetImg(e.target.files[0]));potencZone.addEventListener('dragover',e=>{e.preventDefault();potencZone.classList.add('potenc-drag')});potencZone.addEventListener('dragleave',()=>potencZone.classList.remove('potenc-drag'));potencZone.addEventListener('drop',e=>{e.preventDefault();potencZone.classList.remove('potenc-drag');const f=e.dataTransfer.files[0];if(f&&f.type.startsWith('image/'))potencSetImg(f)})
    window.potencCopiar=function(id,btn){navigator.clipboard.writeText(document.getElementById(id).innerText).then(()=>{const o=btn.textContent;btn.textContent='Copiado!';setTimeout(()=>{btn.textContent=o},2000)})}
    window.potencCopiarTitulo=function(btn,text){navigator.clipboard.writeText(text).then(()=>{const o=btn.textContent;btn.textContent='OK';setTimeout(()=>{btn.textContent=o},1800)})}
    document.getElementById('btnPotenciar').addEventListener('click',async()=>{const err=document.getElementById('potencError'),load=document.getElementById('potencLoading'),res=document.getElementById('potencResultados'),btn=document.getElementById('btnPotenciar');err.textContent='';if(!potencImgBase64){err.textContent='Primero subi una foto.';return}const desc=document.getElementById('potencDesc').value.trim();btn.disabled=true;load.style.display='flex';res.style.display='none';const msgs=['Analizando imagen...','Generando propuestas...','Creando descripcion...','Casi listo...'];let mi=0;const mel=document.getElementById('potencLoadingMsg');const intv=setInterval(()=>{mi=(mi+1)%msgs.length;mel.textContent=msgs[mi]},2200);try{const resp=await fetch(EDGE_FN_URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY},body:JSON.stringify({imageBase64:potencImgBase64,imageType:potencImgType,descripcion:desc||null})});const data=await resp.json();if(!resp.ok||!data.ok)throw new Error(data?.error||data?.detail||`Error ${resp.status}`);const p=data.data;document.getElementById('potencPromptImg').textContent=p.prompt_imagen||'';document.getElementById('potencTitulos').innerHTML=(p.titulos||[]).map((t,i)=>`<div class="potenc-titulo-item"><span class="potenc-titulo-num">${i+1}</span><span class="potenc-titulo-text">${t}</span><button class="potenc-copy-mini" onclick="potencCopiarTitulo(this,${JSON.stringify(t)})">copiar</button></div>`).join('');document.getElementById('potencDescResult').textContent=p.descripcion||'';res.style.display='block';res.scrollIntoView({behavior:'smooth',block:'nearest'})}catch(e){let msg=e.message||'Intenta de nuevo.';if(msg.includes('ANTHROPIC_API_KEY'))msg='Falta la API key en Supabase Edge Functions Secrets.';else if(msg.includes('Failed to fetch'))msg='No se pudo conectar con la Edge Function.';err.textContent=msg}finally{clearInterval(intv);load.style.display='none';btn.disabled=false}})

    // ── CALCULADORA ───────────────────────────────────────────────────
    document.getElementById('btnCalcularCosto').addEventListener('click',()=>{const g=id=>parseFloat(document.getElementById(id).value)||0;const mat=(g('costoGramos')/1000)*g('costoPorKg'),el=g('costoHoras')*g('costoElect'),trab=(g('costoTrabajo')/60)*g('costoHoraTrabajo'),fij=g('costoFijos');const sub=mat+el+trab+fij,gan=sub*(g('costoMargen')/100),tot=sub+gan;const fmt=n=>'$'+Math.round(n).toLocaleString('es-AR');[['resMateria',mat],['resElect',el],['resTrabajo',trab],['resFijos',fij],['resSubtotal',sub],['resGanancia',gan],['resTotal',tot]].forEach(function(pair){document.getElementById(pair[0]).textContent=fmt(pair[1])});const _resEl=document.getElementById('costosResultado'); _resEl.style.visibility='visible'; _resEl.style.minHeight=''; _resEl.style.overflow='visible'; if(window.trackDescarga) trackDescarga('costos')})
    document.getElementById('btnCopiarCosto').addEventListener('click',()=>{const g=id=>document.getElementById(id).textContent;const txt=['Calculadora Rabbit3D','Material: '+g('resMateria'),'Electricidad: '+g('resElect'),'Mano de obra: '+g('resTrabajo'),'Gastos fijos: '+g('resFijos'),'Subtotal: '+g('resSubtotal'),'Ganancia: '+g('resGanancia'),'PRECIO VENTA: '+g('resTotal')].join('\n');navigator.clipboard.writeText(txt).then(()=>{const b=document.getElementById('btnCopiarCosto');b.textContent='Copiado!';setTimeout(()=>{b.textContent='Copiar resumen'},2000)})})

    // ══════════════════════════════════════════
    //  MEJORADOR DE IMÁGENES — Canvas API
    // ══════════════════════════════════════════
