// ═══════════════════════════════════════════════════
// lab.js — La Madriguera
// ═══════════════════════════════════════════════════

    // IMAGE to STL TOOL
    // ── Shared WebGL renderer (global) ──────────────────────────────
    // ── Shared WebGL renderer ────────────────────────────────────────
    window.createGLRenderer=function(canvasId, initRotX, initRotY, canvasW, canvasH) {
      var cv=document.getElementById(canvasId)
      if(!cv) return null
      cv.width=canvasW||340; cv.height=canvasH||240
      var gl=cv.getContext('webgl',{antialias:true,preserveDrawingBuffer:false})
      if(!gl) return null

      var VS='attribute vec3 aP;attribute vec3 aN;uniform mat4 uMVP;uniform mat3 uNM;varying vec3 vN;void main(){gl_Position=uMVP*vec4(aP,1.0);vN=uNM*aN;}'
      var FS=[
        'precision mediump float;',
        'varying vec3 vN;uniform vec3 uC;',
        'void main(){',
        '  vec3 n=normalize(vN);',
        '  vec3 l1=normalize(vec3(0.6,0.9,1.0));',
        '  vec3 l2=normalize(vec3(-0.5,-0.3,0.8));',
        // Primary light: one-sided (shading shows shape)
        // Fill light: two-sided abs() so inner faces never go black
        '  float d=max(dot(n,l1),0.0)*0.50',
        '         +abs(dot(n,l2))*0.15',
        '         +0.35;',
        '  gl_FragColor=vec4(uC*d,1.0);',
        '}'
      ].join('\n')
      function mkS(t,src){var s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);return s}
      var prog=gl.createProgram()
      gl.attachShader(prog,mkS(gl.VERTEX_SHADER,VS))
      gl.attachShader(prog,mkS(gl.FRAGMENT_SHADER,FS))
      gl.linkProgram(prog)
      if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) return null
      gl.enable(gl.DEPTH_TEST)
      gl.clearColor(0,0.08,0.13,1)

      var rotX=initRotX!==undefined?initRotX:0.4, rotY=initRotY!==undefined?initRotY:0.5, drag=false,lx=0,ly=0,meshes=[],zoom=2.5,pinchDist=0

      function mId(){return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}
      function mMul(a,b){var r=new Float32Array(16);for(var i=0;i<4;i++)for(var j=0;j<4;j++)for(var k=0;k<4;k++)r[i+j*4]+=a[i+k*4]*b[k+j*4];return r}
      function mRx(a){var m=mId(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[9]=-s;m[6]=s;m[10]=c;return m}
      function mRy(a){var m=mId(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[8]=s;m[2]=-s;m[10]=c;return m}
      function mTr(x,y,z){var m=mId();m[12]=x;m[13]=y;m[14]=z;return m}
      function mP(fov,asp,n,f){var m=new Float32Array(16),t=Math.tan(fov/2);m[0]=1/(asp*t);m[5]=1/t;m[10]=-(f+n)/(f-n);m[14]=-2*f*n/(f-n);m[11]=-1;return m}

      function mkMesh(tris,col,dx,dy,dz){
        var vd=[],nd=[]
        tris.forEach(function(t){t.v.forEach(function(v){vd.push(v[0]+dx,v[1]+dy,v[2]+dz);nd.push(t.n[0],t.n[1],t.n[2])})})
        var vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vd),gl.STATIC_DRAW)
        var nb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(nd),gl.STATIC_DRAW)
        return {vb:vb,nb:nb,cnt:tris.length*3,col:col}
      }

      function draw(){
        gl.viewport(0,0,cv.width,cv.height); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)
        if(!meshes.length) return
        gl.useProgram(prog)
        var aP=gl.getAttribLocation(prog,'aP'),aN=gl.getAttribLocation(prog,'aN')
        var uMVP=gl.getUniformLocation(prog,'uMVP'),uC=gl.getUniformLocation(prog,'uC')
        var uNM=gl.getUniformLocation(prog,'uNM')
        var rot=mMul(mRx(rotX),mRy(rotY))
        var mv=mMul(mTr(0,0,-zoom),rot)
        var mvp=mMul(mP(0.8,cv.width/cv.height,0.01,50),mv)
        gl.uniformMatrix4fv(uMVP,false,mvp)
        var nm=new Float32Array([rot[0],rot[1],rot[2],rot[4],rot[5],rot[6],rot[8],rot[9],rot[10]])
        gl.uniformMatrix3fv(uNM,false,nm)
        meshes.forEach(function(m){
          gl.uniform3fv(uC,m.col)
          gl.bindBuffer(gl.ARRAY_BUFFER,m.vb);gl.enableVertexAttribArray(aP);gl.vertexAttribPointer(aP,3,gl.FLOAT,false,0,0)
          gl.bindBuffer(gl.ARRAY_BUFFER,m.nb);gl.enableVertexAttribArray(aN);gl.vertexAttribPointer(aN,3,gl.FLOAT,false,0,0)
          gl.drawArrays(gl.TRIANGLES,0,m.cnt)
        })
      }

      cv.addEventListener('mousedown',function(e){drag=true;lx=e.clientX;ly=e.clientY;e.preventDefault()})
      window.addEventListener('mousemove',function(e){if(!drag)return;rotY+=(e.clientX-lx)*0.013;rotX+=(e.clientY-ly)*0.013;lx=e.clientX;ly=e.clientY;draw()})
      window.addEventListener('mouseup',function(){drag=false})
      cv.addEventListener('wheel',function(e){
        e.preventDefault()
        zoom=Math.max(0.5,Math.min(8,zoom+e.deltaY*0.005))
        draw()
      },{passive:false})
      cv.addEventListener('touchstart',function(e){
        if(e.touches.length===2){
          drag=false
          pinchDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)
        } else {
          drag=true;lx=e.touches[0].clientX;ly=e.touches[0].clientY
        }
        e.preventDefault()
      },{passive:false})
      cv.addEventListener('touchmove',function(e){
        if(e.touches.length===2){
          var d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)
          zoom=Math.max(0.5,Math.min(8,zoom*(pinchDist/d)))
          pinchDist=d; draw()
        } else if(drag){
          rotY+=(e.touches[0].clientX-lx)*0.013;rotX+=(e.touches[0].clientY-ly)*0.013
          lx=e.touches[0].clientX;ly=e.touches[0].clientY;draw()
        }
        e.preventDefault()
      },{passive:false})
      cv.addEventListener('touchend',function(){drag=false})
      cv.style.cursor='grab'

      return {
        setMeshes: function(newMeshes){ meshes=newMeshes; draw() },
        mkMesh: mkMesh,
        draw: draw,
        gl: gl
      }
    }

        ;(function initSTLTool() {
      var stlImgData=null, stlBinaryMap=[], stlMapW=0, stlMapH=0, stlMode='dark'

      var stlDropzone =document.getElementById('stlDropzone')
      var stlFileInput=document.getElementById('stlFileInput')
      var stlPreview  =document.getElementById('stlPreview')
      var stlBtnGen   =document.getElementById('stlBtnGen')

      function setStatus(msg,state){
        document.getElementById('stlStatusText').textContent=msg
        var d=document.getElementById('stlDot')
        d.className='stl-status__dot'
          +(state==='ok'?' stl-status__dot--ok'
          :state==='err'?' stl-status__dot--err'
          :state==='busy'?' stl-status__dot--busy':'')
      }

      window.stlSetMode=function(m){
        stlMode=m
        document.getElementById('stlTogDark').className ='stl-tog'+(m==='dark' ?' stl-tog--active':'')
        document.getElementById('stlTogLight').className='stl-tog'+(m==='light'?' stl-tog--active':'')
        if(stlImgData) stlProcess()
      }
      window.stlSetModel=function(){}

      ;['stlSlThresh','stlSlHeight','stlSlSize','stlSlSmooth'].forEach(function(id){
        var el=document.getElementById(id)
        var out=document.getElementById(id.replace('stlSl','stlVal'))
        if(!el||!out) return
        el.addEventListener('input',function(){
          out.textContent=el.value
          if(stlImgData&&(id==='stlSlThresh'||id==='stlSlSmooth')) stlProcess()
          if(stlBinaryMap.length&&(id==='stlSlSize'||id==='stlSlHeight')){
            var targetMM=parseInt(document.getElementById('stlSlSize').value)
            var Hval=parseInt(document.getElementById('stlSlHeight').value)
            var res=stlBuildTris(targetMM,Hval)
            if(res) stl3DRebuild(res.tris,res.W,res.HH,res.scale,res.H)
          }
        })
      })

      stlDropzone.addEventListener('dragover',function(e){e.preventDefault();stlDropzone.classList.add('stl-dropzone--drag')})
      stlDropzone.addEventListener('dragleave',function(){stlDropzone.classList.remove('stl-dropzone--drag')})
      stlDropzone.addEventListener('drop',function(e){
        e.preventDefault();stlDropzone.classList.remove('stl-dropzone--drag')
        if(e.dataTransfer.files[0]) stlLoad(e.dataTransfer.files[0])
      })
      stlFileInput.addEventListener('change',function(){if(stlFileInput.files[0]) stlLoad(stlFileInput.files[0])})

      function stlLoad(file){
        if(!file.type.startsWith('image/')){setStatus('Formato no valido.','err');return}
        setStatus('Cargando imagen...','busy')
        var reader=new FileReader()
        reader.onload=function(e){
          var img=new Image()
          img.onload=function(){
            var maxDim=512
            var sc=Math.min(maxDim/img.width,maxDim/img.height,1)
            stlMapW=Math.round(img.width*sc)
            stlMapH=Math.round(img.height*sc)
            var cv=document.createElement('canvas')
            cv.width=stlMapW; cv.height=stlMapH
            var ctx=cv.getContext('2d')
            ctx.drawImage(img,0,0,stlMapW,stlMapH)
            stlImgData=ctx.getImageData(0,0,stlMapW,stlMapH)
            stlProcess()
          }
          img.src=e.target.result
        }
        reader.readAsDataURL(file)
      }

      function stlProcess(){
        var thresh=parseInt(document.getElementById('stlSlThresh').value)
        var smooth=parseInt(document.getElementById('stlSlSmooth').value)
        var d=stlImgData.data, W=stlMapW, H=stlMapH
        stlBinaryMap=new Uint8Array(W*H)
        for(var i=0;i<W*H;i++){
          var a=d[i*4+3]; if(a<50){stlBinaryMap[i]=0;continue}
          var lum=0.299*d[i*4]+0.587*d[i*4+1]+0.114*d[i*4+2]
          stlBinaryMap[i]=stlMode==='dark'?(lum<thresh?1:0):(lum>=thresh?1:0)
        }
        // Median filter para limpiar ruido
        for(var p=0;p<smooth;p++){
          var tmp=new Uint8Array(stlBinaryMap)
          for(var y=1;y<H-1;y++) for(var x=1;x<W-1;x++){
            var s=tmp[(y-1)*W+x-1]+tmp[(y-1)*W+x]+tmp[(y-1)*W+x+1]
                 +tmp[y*W+x-1]    +tmp[y*W+x]    +tmp[y*W+x+1]
                 +tmp[(y+1)*W+x-1]+tmp[(y+1)*W+x]+tmp[(y+1)*W+x+1]
            stlBinaryMap[y*W+x]=s>=5?1:0
          }
        }
        stlBtnGen.disabled=false
        var filled=0; for(var i=0;i<stlBinaryMap.length;i++) filled+=stlBinaryMap[i]
        document.getElementById('stlInfoRes').textContent=W+'x'+H
        document.getElementById('stlInfoPx').textContent=filled.toLocaleString()
        setStatus('Silueta lista.','ok')
        // Update 3D preview
        setTimeout(function(){
          var targetMM=parseInt(document.getElementById('stlSlSize').value)
          var Hval=parseInt(document.getElementById('stlSlHeight').value)
          var res=stlBuildTris(targetMM,Hval)
          if(res) stl3DRebuild(res.tris,res.W,res.HH,res.scale,res.H)
        },80)
      }

      var stlGL=null

      function stl3DRebuild(tris, W, HH, scale, H){
        var cv=document.getElementById('stl-canvas')
        if(!cv) return
        stlGL=null
        stlGL=createGLRenderer('stl-canvas', 0.7, 0.4, 340, 220)
        if(!stlGL) return
        var empty=document.getElementById('stl3dEmpty')
        if(empty) empty.style.display='none'
        // Normalize so largest XY dimension = 0.9 units
        // Z uses same scale as XY but with a minimum so thin panels stay visible
        var xySize=Math.max(W*scale, HH*scale)
        var sc=0.9/xySize
        var minZScale=sc*5  // minimum Z scale so panel is always visible
        var scZ=Math.max(sc, minZScale)
        var cx=W*scale/2, cy=HH*scale/2, cz=H/2
        var scaledTris=tris.map(function(t){
          return {
            n: t.n,
            v: t.v.map(function(v){
              return [(v[0]-cx)*sc, (v[1]-cy)*sc, (v[2]-cz)*scZ]
            })
          }
        })
        var ms=[stlGL.mkMesh(scaledTris, new Float32Array([0.04,0.30,0.36]), 0,0,0)]
        stlGL.setMeshes(ms)
      }

      function stlBuildTris(targetMM, H){
        if(!stlBinaryMap.length) return null
        var bH=Math.min(H*0.18,1.5)
        var scale=targetMM/Math.max(stlMapW,stlMapH)
        var W=stlMapW, HH=stlMapH
        var tris=[]
        function cell(x,y){return(x>=0&&x<W&&y>=0&&y<HH)?stlBinaryMap[y*W+x]:0}
        function pushQuad(a,b,c,dd){
          function tri(p,q,r){
            var ux=q[0]-p[0],uy=q[1]-p[1],uz=q[2]-p[2]
            var vx=r[0]-p[0],vy=r[1]-p[1],vz=r[2]-p[2]
            var nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx
            var nl=Math.sqrt(nx*nx+ny*ny+nz*nz)||1
            tris.push({n:[nx/nl,ny/nl,nz/nl],v:[p,q,r]})
          }
          tri(a,b,c); tri(a,c,dd)
        }
        for(var y=0;y<HH;y++){
          for(var x=0;x<W;x++){
            if(!cell(x,y)) continue
            var x0=x*scale, x1=(x+1)*scale
            var y0=y*scale, y1=(y+1)*scale
            var maxX=W*scale
            var mx0=maxX-x1, mx1=maxX-x0
            var zT=0, zB=H, zTi=bH, zBi=H-bH
            pushQuad([mx1,y0,zT],[mx0,y0,zT],[mx0,y1,zT],[mx1,y1,zT])
            pushQuad([mx1,y1,zB],[mx0,y1,zB],[mx0,y0,zB],[mx1,y0,zB])
            if(!cell(x,y-1)){
              pushQuad([mx1,y0,zB],[mx0,y0,zB],[mx0,y0,zTi],[mx1,y0,zTi])
              pushQuad([mx1,y0,zTi],[mx0,y0,zTi],[mx0,y0,zT],[mx1,y0,zT])
            }
            if(!cell(x,y+1)){
              pushQuad([mx0,y1,zB],[mx1,y1,zB],[mx1,y1,zTi],[mx0,y1,zTi])
              pushQuad([mx0,y1,zTi],[mx1,y1,zTi],[mx1,y1,zT],[mx0,y1,zT])
            }
            if(!cell(x-1,y)){
              pushQuad([mx1,y0,zB],[mx1,y1,zB],[mx1,y1,zTi],[mx1,y0,zTi])
              pushQuad([mx1,y0,zTi],[mx1,y1,zTi],[mx1,y1,zT],[mx1,y0,zT])
            }
            if(!cell(x+1,y)){
              pushQuad([mx0,y1,zB],[mx0,y0,zB],[mx0,y0,zTi],[mx0,y1,zTi])
              pushQuad([mx0,y1,zTi],[mx0,y0,zTi],[mx0,y0,zT],[mx0,y1,zT])
            }
          }
        }
        return {tris:tris, W:W, HH:HH, scale:scale, H:H}
      }

      window.stlGenerate=function(){
        if(!stlBinaryMap.length){setStatus('Primero subi una imagen','err');return}
        setStatus('Generando STL...','busy')
        stlBtnGen.disabled=true
        setTimeout(function(){
          try{
            var targetMM=parseInt(document.getElementById('stlSlSize').value)
            var H=parseInt(document.getElementById('stlSlHeight').value)
            var res=stlBuildTris(targetMM,H)
            if(!res){setStatus('Error al generar geometría','err');stlBtnGen.disabled=false;return}
            var tris=res.tris

            var buf=new ArrayBuffer(80+4+tris.length*50)
            var view=new DataView(buf)
            view.setUint32(80,tris.length,true)
            var off=84
            for(var ti=0;ti<tris.length;ti++){
              var t=tris[ti]
              view.setFloat32(off,t.n[0],true);off+=4
              view.setFloat32(off,t.n[1],true);off+=4
              view.setFloat32(off,t.n[2],true);off+=4
              for(var vi=0;vi<3;vi++){
                view.setFloat32(off,t.v[vi][0],true);off+=4
                view.setFloat32(off,t.v[vi][1],true);off+=4
                view.setFloat32(off,t.v[vi][2],true);off+=4
              }
              view.setUint16(off,0,true);off+=2
            }
            var blob=new Blob([buf],{type:'application/octet-stream'})
            var url=URL.createObjectURL(blob)
            var a=document.createElement('a')
            if (!usuarioActual) { window.requireLogin(function(){}); URL.revokeObjectURL(url); setStatus('Debés iniciar sesión para descargar','err'); return }
            a.href=url; a.download='rabbit3d_modelo.stl'; a.click()
            setTimeout(function(){URL.revokeObjectURL(url)},1000)
            var kb=(buf.byteLength/1024).toFixed(1)
            document.getElementById('stlInfoTris').textContent=tris.length.toLocaleString()
            document.getElementById('stlInfoSize').textContent=kb+' KB'
            setStatus('STL descargado — '+tris.length.toLocaleString()+' triangulos','ok')
          }catch(e){
            setStatus('Error: '+e.message,'err')
            console.error(e)
          }
          stlBtnGen.disabled=false
        },60)
      }
    })()


    // ══════════════════════════════════════════
    //  LLAVERO STL TOOL (v4 - rectangular base, X argolla)
    ;(function initLlaveroTool() {

      var LETRA_H = 12  // fixed letter height in mm

      function getP() {
        var ap=document.getElementById('llSlArgollaPos')
        var av=document.getElementById('llSlArgollaV')
        return {
          nombre   : document.getElementById('llNombre').value.trim(),
          fuente   : document.getElementById('llFuente').value,
          letraH   : LETRA_H,
          baseH    : parseFloat(document.getElementById('llSlBaseH').value),
          letraZ   : parseFloat(document.getElementById('llSlLetraZ').value),
          pad      : parseFloat(document.getElementById('llSlPad').value),
          argolla  : parseFloat(document.getElementById('llSlArgolla').value),
          argollaX : ap ? parseFloat(ap.value)/100 : 0,
          argollaV : av ? parseFloat(av.value)/100 : 0.5,
          radio    : parseFloat(document.getElementById('llSlRadio').value),
        }
      }

      ;['llSlBaseH','llSlLetraZ','llSlPad','llSlArgolla','llSlArgollaPos','llSlArgollaV','llSlRadio'].forEach(function(id){
        var el=document.getElementById(id), out=document.getElementById(id.replace('llSl','llVal'))
        if(!el) return
        el.addEventListener('input',function(){
          if(out) out.textContent = (id==='llSlArgollaPos'||id==='llSlArgollaV') ? el.value+'%' : el.value
          llDraw()
        })
      })
      document.getElementById('llNombre').addEventListener('input', llDraw)
      document.getElementById('llFuente').addEventListener('change', llDraw)

      function setStatus(msg,state){
        document.getElementById('llStatusText').textContent=msg
        var d=document.getElementById('llDot')
        d.className='stl-status__dot'+(state==='ok'?' stl-status__dot--ok':state==='err'?' stl-status__dot--err':state==='busy'?' stl-status__dot--busy':'')
      }

      function measureText(nom,fnt,fpx){
        var tmp=document.createElement('canvas'),ctx=tmp.getContext('2d')
        ctx.font='900 '+fpx+'px "'+fnt+'", sans-serif'
        var m=ctx.measureText(nom)
        return {
          w   : Math.ceil(m.width),
          asc : Math.ceil(m.actualBoundingBoxAscent  || fpx*0.78),
          dsc : Math.ceil(m.actualBoundingBoxDescent || fpx*0.22),
        }
      }

      // ── Preview ───────────────────────────────────────────────────────
      function llDraw(){
        var p=getP(), preview=document.getElementById('llPreview')
        if(!p.nombre){
          preview.innerHTML='<span class="stl-preview__empty">El llavero aparecerá aquí<br>mientras escribís el nombre</span>'
          return
        }
        var PX=4, fpx=p.letraH*PX, padPx=Math.round(p.pad*PX)
        var mt=measureText(p.nombre,p.fuente,fpx)
        var argR=Math.round(p.argolla/2*PX)
        var baseW=mt.w+padPx*2, baseH=mt.asc+mt.dsc+padPx*2

        // Same formula as STL: X from base center, V mirrored
        var argCenterXpx = Math.round((p.argollaX - 0.5) * baseW * 1.5 + baseW/2)  // px from base left
        var argCY = Math.round((1 - p.argollaV) * baseH)
        argCY = Math.max(argR, Math.min(baseH-argR, argCY))

        // baseX: enough left margin if argolla goes left of base
        var leftMargin = argR + 4
        var baseX = Math.max(leftMargin, leftMargin - Math.min(0, argCenterXpx - argR - 4))
        var ax = baseX + argCenterXpx
        var ay = argCY

        var W  = Math.max(baseX + baseW, ax + argR + 4)
        var H  = Math.max(baseH, ay + argR + 4)
        var yOff = Math.max(0, argR - ay + 2)
        ay += yOff; H += yOff

        var cv=document.createElement('canvas')
        cv.width=W; cv.height=H
        var ctx=cv.getContext('2d')
        ctx.clearRect(0,0,W,H)

        // Base rect
        var br=Math.min(Math.round(p.radio*PX), baseW/2, baseH/2)
        var bY=yOff
        ctx.beginPath()
        ctx.moveTo(baseX+br,bY)
        ctx.lineTo(baseX+baseW-br,bY); ctx.quadraticCurveTo(baseX+baseW,bY,baseX+baseW,bY+br)
        ctx.lineTo(baseX+baseW,bY+baseH-br); ctx.quadraticCurveTo(baseX+baseW,bY+baseH,baseX+baseW-br,bY+baseH)
        ctx.lineTo(baseX+br,bY+baseH); ctx.quadraticCurveTo(baseX,bY+baseH,baseX,bY+baseH-br)
        ctx.lineTo(baseX,bY+br); ctx.quadraticCurveTo(baseX,bY,baseX+br,bY)
        ctx.closePath()
        ctx.fillStyle='#001825'; ctx.fill()
        ctx.strokeStyle='#159A9C'; ctx.lineWidth=1.5; ctx.stroke()

        // Text
        ctx.font='900 '+fpx+'px "'+p.fuente+'", sans-serif'
        ctx.fillStyle='#DEEFE7'; ctx.textBaseline='alphabetic'
        ctx.fillText(p.nombre, baseX+padPx, bY+padPx+mt.asc)

        // Argolla ring — independent, just draws wherever it is
        ctx.beginPath(); ctx.arc(ax,ay,argR,0,Math.PI*2)
        ctx.strokeStyle='#159A9C'; ctx.lineWidth=1.5; ctx.stroke()
        ctx.beginPath(); ctx.arc(ax,ay,Math.round(argR*0.45),0,Math.PI*2)
        ctx.fillStyle='#0c2a3a'; ctx.fill()

        cv.style.cssText='max-width:100%;max-height:220px;object-fit:contain;border-radius:6px;display:block;'
        preview.innerHTML=''; preview.appendChild(cv)
        document.getElementById('llInfoW').textContent=(baseW/PX).toFixed(1)+' mm'
        document.getElementById('llInfoH').textContent=(baseH/PX).toFixed(1)+' mm'
      }

      // ── STL ───────────────────────────────────────────────────────────
      window.llGenerate=function(){
        var p=getP()
        if(!p.nombre){setStatus('Escribi un nombre primero','err');return}
        setStatus('Generando STL...','busy')
        document.getElementById('llBtnGen').disabled=true

        setTimeout(function(){
          try{
            var RES=8  // higher res for sharper text
            var fpx=p.letraH*RES, padPx=Math.round(p.pad*RES)
            var mt=measureText(p.nombre,p.fuente,fpx)

            // Rasterize text at high res
            var tW=mt.w+padPx*2, tH=mt.asc+mt.dsc+padPx*2
            var cv=document.createElement('canvas'); cv.width=tW; cv.height=tH
            var ctx=cv.getContext('2d')
            ctx.font='900 '+fpx+'px "'+p.fuente+'", sans-serif'
            ctx.fillStyle='#fff'; ctx.textBaseline='alphabetic'
            ctx.fillText(p.nombre, padPx, padPx+mt.asc)
            var d=ctx.getImageData(0,0,tW,tH).data
            var textMap=new Uint8Array(tW*tH)
            for(var i=0;i<tW*tH;i++) textMap[i]=d[i*4+3]>50?1:0

            // Base map with ROUNDED CORNERS
            var baseMap=new Uint8Array(tW*tH)
            var radioPx=Math.round(p.radio*RES)
            radioPx=Math.min(radioPx, Math.floor(tW/2), Math.floor(tH/2))
            for(var y=0;y<tH;y++) for(var x=0;x<tW;x++){
              var cx=Math.max(radioPx-x, x-(tW-1-radioPx), 0)
              var cy=Math.max(radioPx-y, y-(tH-1-radioPx), 0)
              // Include pixel if inside the rounded rect
              baseMap[y*tW+x] = (cx===0 && cy===0) || (cx*cx+cy*cy <= radioPx*radioPx) ? 1 : 0
            }

            // Argolla on LEFT side of base
            var argR=Math.round(p.argolla/2*RES)
            // Base and text only — argolla generated separately as ring geometry
            var W=tW, H=tH, offX=0

            var fullBase=new Uint8Array(W*H)
            var fullText=new Uint8Array(W*H)
            for(var y=0;y<tH;y++) for(var x=0;x<tW;x++){
              fullBase[y*W+x]=baseMap[y*tW+x]
              fullText[y*W+x]=textMap[y*tW+x]
            }
            // Argolla ring position — coordinates in same space as base voxels
            // Base occupies X: 0..baseWidthMM, Y: 0..baseHeightMM (after Y-mirror)
            // X: 0%=far left of base, 50%=center, 100%=far right
            // V: 0%=top (Y=0 after mirror = baseHeightMM), 50%=center, 100%=bottom
            var baseWidthMM  = tW/RES
            var baseHeightMM = tH/RES
            var argCenterX = (p.argollaX - 0.5) * baseWidthMM * 1.5 + baseWidthMM/2
            var argCenterY = (1 - p.argollaV) * baseHeightMM  // mirror Y to match voxel flip
            var innerRmm = (p.argolla/2) * 0.45
            var outerRmm = p.argolla/2
            var ringThkZ  = p.baseH

            var sc=1/RES, baseZ=p.baseH, letraZ=p.baseH+p.letraZ
            var tris=[]

            function pushTri(a,b,c){
              var ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2]
              var vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2]
              var nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx
              var nl=Math.sqrt(nx*nx+ny*ny+nz*nz)||1
              tris.push({n:[nx/nl,ny/nl,nz/nl],v:[a,b,c]})
            }
            function pq(a,b,c,d){pushTri(a,b,c);pushTri(a,c,d)}

            // ── Ring geometry (independent object) ──────────────────────
            var ringSegs=64
            for(var si=0;si<ringSegs;si++){
              var a0=(si/ringSegs)*Math.PI*2, a1=((si+1)/ringSegs)*Math.PI*2
              var cos0=Math.cos(a0),sin0=Math.sin(a0),cos1=Math.cos(a1),sin1=Math.sin(a1)
              var ox0=[argCenterX+outerRmm*cos0, argCenterY+outerRmm*sin0]
              var ox1=[argCenterX+outerRmm*cos1, argCenterY+outerRmm*sin1]
              var ix0=[argCenterX+innerRmm*cos0, argCenterY+innerRmm*sin0]
              var ix1=[argCenterX+innerRmm*cos1, argCenterY+innerRmm*sin1]
              var z0=0, z1=ringThkZ
              // Top
              pq([ox0[0],ox0[1],z1],[ox1[0],ox1[1],z1],[ix1[0],ix1[1],z1],[ix0[0],ix0[1],z1])
              // Bottom
              pq([ox0[0],ox0[1],z0],[ix0[0],ix0[1],z0],[ix1[0],ix1[1],z0],[ox1[0],ox1[1],z0])
              // Outer wall
              pq([ox0[0],ox0[1],z0],[ox1[0],ox1[1],z0],[ox1[0],ox1[1],z1],[ox0[0],ox0[1],z1])
              // Inner wall
              pq([ix1[0],ix1[1],z0],[ix0[0],ix0[1],z0],[ix0[0],ix0[1],z1],[ix1[0],ix1[1],z1])
            }
            function cb(x,y){return(x>=0&&x<W&&y>=0&&y<H)?fullBase[y*W+x]:0}
            function ct(x,y){return(x>=0&&x<W&&y>=0&&y<H)?fullText[y*W+x]:0}

            for(var y=0;y<H;y++) for(var x=0;x<W;x++){
              if(!cb(x,y)) continue
              var x0=x*sc, x1=(x+1)*sc
              var y0=(H-y-1)*sc, y1=(H-y)*sc
              if(!ct(x,y)) pq([x0,y0,baseZ],[x1,y0,baseZ],[x1,y1,baseZ],[x0,y1,baseZ])
              pq([x0,y1,0],[x1,y1,0],[x1,y0,0],[x0,y0,0])
              if(!cb(x,y-1)) pq([x0,y1,0],[x1,y1,0],[x1,y1,baseZ],[x0,y1,baseZ])
              if(!cb(x,y+1)) pq([x0,y0,0],[x1,y0,0],[x1,y0,baseZ],[x0,y0,baseZ])
              if(!cb(x-1,y)) pq([x0,y0,0],[x0,y1,0],[x0,y1,baseZ],[x0,y0,baseZ])
              if(!cb(x+1,y)) pq([x1,y1,0],[x1,y0,0],[x1,y0,baseZ],[x1,y1,baseZ])
            }
            for(var y=0;y<H;y++) for(var x=0;x<W;x++){
              if(!ct(x,y)||!cb(x,y)) continue
              var x0=x*sc, x1=(x+1)*sc
              var y0=(H-y-1)*sc, y1=(H-y)*sc
              pq([x0,y0,letraZ],[x1,y0,letraZ],[x1,y1,letraZ],[x0,y1,letraZ])
              if(!ct(x,y-1)) pq([x0,y1,baseZ],[x1,y1,baseZ],[x1,y1,letraZ],[x0,y1,letraZ])
              if(!ct(x,y+1)) pq([x0,y0,baseZ],[x1,y0,baseZ],[x1,y0,letraZ],[x0,y0,letraZ])
              if(!ct(x-1,y)) pq([x0,y0,baseZ],[x0,y1,baseZ],[x0,y1,letraZ],[x0,y0,letraZ])
              if(!ct(x+1,y)) pq([x1,y1,baseZ],[x1,y0,baseZ],[x1,y0,letraZ],[x1,y1,letraZ])
            }

            var buf=new ArrayBuffer(80+4+tris.length*50)
            var view=new DataView(buf)
            view.setUint32(80,tris.length,true)
            var off=84
            for(var ti=0;ti<tris.length;ti++){
              var t=tris[ti]
              view.setFloat32(off,t.n[0],true);off+=4
              view.setFloat32(off,t.n[1],true);off+=4
              view.setFloat32(off,t.n[2],true);off+=4
              for(var vi=0;vi<3;vi++){
                view.setFloat32(off,t.v[vi][0],true);off+=4
                view.setFloat32(off,t.v[vi][1],true);off+=4
                view.setFloat32(off,t.v[vi][2],true);off+=4
              }
              view.setUint16(off,0,true);off+=2
            }
            var blob=new Blob([buf],{type:'application/octet-stream'})
            var url=URL.createObjectURL(blob)
            var a=document.createElement('a')
            if (!usuarioActual) { window.requireLogin(function(){}); URL.revokeObjectURL(url); return }
            window.dlCheck('llavero',function(){ a.href=url; a.download='llavero_'+p.nombre.replace(/\s/g,'_')+'.stl'; a.click(); if(window.trackDescarga) trackDescarga('llavero') })
            setTimeout(function(){URL.revokeObjectURL(url)},1000)
            var kb=(buf.byteLength/1024).toFixed(1)
            document.getElementById('llInfoTris').textContent=tris.length.toLocaleString()
            document.getElementById('llInfoSize').textContent=kb+' KB'
            setStatus('STL descargado','ok')
          }catch(e){
            setStatus('Error: '+e.message,'err'); console.error(e)
          }
          document.getElementById('llBtnGen').disabled=false
        },80)
      }

      setTimeout(llDraw,800)
    })()


    // ── HERRAMIENTAS MODAL ──────────────────────────────────────────────
    window.abrirHerramienta = function(id) {
      document.getElementById(id).classList.add('activo')
      document.body.style.overflow = 'hidden'
      // Show warning for Cuadros 2D if not already seen this session
      if(id==='modal-stl' && !sessionStorage.getItem('cuadros2d-aviso-visto')){
        var aviso=document.getElementById('modal-cuadros2d-aviso')
        if(aviso){
          aviso.style.display='flex'
          // Mark as seen; button closes it
          var btn=aviso.querySelector('button')
          if(btn) btn.onclick=function(){
            aviso.style.display='none'
            sessionStorage.setItem('cuadros2d-aviso-visto','1')
          }
        }
      }

    // Cuadros 2D — bloqueado para usuarios, solo admin puede activar
    window.abrirHerramientaStl = function() {
      if (esAdmin) {
        // Admin: abre directo sin bloqueo
        window.abrirHerramienta('modal-stl')
      }
      // No-admin: el overlay visual es suficiente, no hace nada más
    }

    // Mostrar botón "Activar" del WIP solo para admin
    ;(function() {
      const adminBtn = document.getElementById('hcardWipAdminBtn')
      if (adminBtn && esAdmin) {
        adminBtn.style.display = 'inline-flex'
        adminBtn.addEventListener('click', function(e) {
          e.stopPropagation()
          // Quitar overlay y habilitar la card
          const overlay = document.getElementById('hcardWipOverlay')
          const card    = document.getElementById('hcard-stl')
          if (overlay) overlay.remove()
          if (card) {
            card.classList.remove('herramienta-card--wip')
            card.onclick = function() { window.abrirHerramienta('modal-stl') }
          }
          const badge = card && card.querySelector('.herramienta-card__badge--wip')
          if (badge) { badge.textContent = '🧪 Beta'; badge.classList.remove('herramienta-card__badge--wip') }
          const btn = card && card.querySelector('.herramienta-card__btn--wip')
          if (btn) { btn.textContent = 'Abrir herramienta →'; btn.disabled = false; btn.classList.remove('herramienta-card__btn--wip') }
        })
      }
    })()
    }
    window.cerrarHerramienta = function(id) {
      document.getElementById(id).classList.remove('activo')
      document.body.style.overflow = ''
    }
    document.querySelectorAll('.herramienta-modal-overlay').forEach(function(el) {
      el.addEventListener('click', function(e) {
        if (e.target === el) cerrarHerramienta(el.id)
      })
    })

        // ── HERRAMIENTAS — miniaturas editables por admin ────────────────────
    let hcardEditTarget = null

    window.herramientaEditImg = function(tool) {
      // Obtener URL actual
      var currentImg = document.querySelector('#hcard-visual-' + tool + ' img')
      var currentUrl = currentImg ? currentImg.src.split('?')[0] : ''

      var overlay = document.createElement('div')
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,8,15,.92);display:flex;align-items:center;justify-content:center'
      overlay.innerHTML = `
        <div style="background:var(--bg-card,#0a2535);border:1px solid var(--border);border-radius:12px;padding:1.5rem;width:min(480px,95vw);display:flex;flex-direction:column;gap:.75rem">
          <h3 style="font-family:var(--font-head);font-size:.75rem;font-weight:700;letter-spacing:.1em;color:var(--cyan);margin:0;text-transform:uppercase">Portada de herramienta</h3>
          <div>
            <label style="font-size:.7rem;color:var(--muted)">URL de imagen (GitHub)</label>
            <input type="text" id="_hcardImgUrl" value="${currentUrl}"
              placeholder="https://raw.githubusercontent.com/rabbit-3d/rabbit-3d.github.io/main/portadas/llaveros.png"
              style="width:100%;margin-top:.25rem;background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:.45rem .5rem;font-size:.72rem;box-sizing:border-box"/>
            <div id="_hcardImgPreview" style="margin-top:.5rem;height:80px;border-radius:6px;background-size:cover;background-position:center;background-color:rgba(255,255,255,.04);${currentUrl ? 'background-image:url(' + currentUrl + ')' : ''}"></div>
          </div>
          <div style="display:flex;gap:.5rem;justify-content:flex-end">
            <button id="_hcardImgCancel" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:.38rem .85rem;cursor:pointer;font-size:.77rem">Cancelar</button>
            <button id="_hcardImgGuardar" style="background:var(--cyan);border:none;color:#fff;border-radius:6px;padding:.38rem .85rem;cursor:pointer;font-size:.77rem;font-weight:600">Guardar</button>
          </div>
        </div>`
      document.body.appendChild(overlay)

      var input = document.getElementById('_hcardImgUrl')
      var preview = document.getElementById('_hcardImgPreview')
      input.addEventListener('input', function() {
        preview.style.backgroundImage = this.value ? 'url(' + this.value + ')' : ''
      })
      input.focus(); input.select()

      document.getElementById('_hcardImgCancel').onclick = function() { overlay.remove() }
      document.getElementById('_hcardImgGuardar').onclick = async function() {
        var cleanUrl = input.value.trim()
        overlay.remove()
        herramientaSetImg(tool, cleanUrl)
        const tipo = 'hcard-' + tool
        await supabase.from('media').delete().eq('tipo', tipo)
        if (cleanUrl) {
          await supabase.from('media').insert([{ tipo: tipo, url: cleanUrl, nombre: cleanUrl }])
        }
      }
    }

    function herramientaSetImg(tool, url) {
      const visual = document.getElementById('hcard-visual-' + tool)
      if (!visual) return
      const overlay = document.getElementById('hcard-edit-' + tool)
      visual.querySelectorAll('img').forEach(i => i.remove())
      if (!url) return
      const img = document.createElement('img')
      img.src = url
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;'
      img.onerror = () => img.remove()
      visual.insertBefore(img, overlay || null)
    }

    async function cargarHcardImgs() {
      try {
        // Cargar portadas de laboratorio Y emprendedores en un solo query
        const { data } = await supabase.from('media').select('tipo, url')
          .or('tipo.like.hcard-%,tipo.like.empr-img-%')
        if (data) {
          window._portadasMap = window._portadasMap || {}
          const _isGH = url => url && !url.includes('supabase.co/storage')
          data.forEach(row => {
            if (!row.url || !_isGH(row.url)) return
            if (row.tipo.startsWith('hcard-') && !row.tipo.endsWith('-pos')) {
              const tool = row.tipo.replace('hcard-', '')
              window._portadasMap[tool] = row.url
              herramientaSetImg(tool, row.url)
            }
            if (row.tipo.startsWith('empr-img-')) {
              const tool = row.tipo.replace('empr-img-', '')
              window._portadasMap[tool] = row.url
              // Aplicar portada a la card de emprendedores
              const emprCard = document.querySelector('[data-empr-id="'+tool+'"]')
              if (emprCard) {
                const imgEl = emprCard.querySelector('.empr-card__img, .empr-card__cover, img')
                if (imgEl) {
                  imgEl.src = row.url; imgEl.style.display = 'block'
                } else {
                  // Insertar imagen de fondo en el área de icono
                  const iconEl = emprCard.querySelector('.empr-card__icon')
                  if (iconEl) {
                    iconEl.style.backgroundImage = 'url('+row.url+')'
                    iconEl.style.backgroundSize = 'cover'
                    iconEl.style.backgroundPosition = 'center'
                    iconEl.innerHTML = ''
                  }
                }
              }
            }
          })        }
      } catch(e) { console.warn('cargarHcardImgs:', e) }
    }

    // ── Drag to reposition image (admin only) ────────────────────────────
    // Global handler compartido — evita acumular listeners por cada llamada
    const _hcardDragState = {}
    let _hcardGlobalListenersAdded = false

    function _addHcardGlobalListeners() {
      if (_hcardGlobalListenersAdded) return
      _hcardGlobalListenersAdded = true
      document.addEventListener('mousemove', function(e) {
        // Early return si ningún tool está siendo arrastrado
        if (!Object.values(_hcardDragState).some(s=>s.dragging)) return
        for (const tool in _hcardDragState) {
          const s = _hcardDragState[tool]
          if (!s.dragging) continue
          const visual = document.getElementById('hcard-visual-' + tool)
          if (!visual) continue
          const img = visual.querySelector('img')
          if (!img) continue
          const dx = (e.clientX - s.startX) / visual.offsetWidth  * 100
          const dy = (e.clientY - s.startY) / visual.offsetHeight * 100
          s.posX = Math.max(0, Math.min(100, s.posX - dx))
          s.posY = Math.max(0, Math.min(100, s.posY - dy))
          s.startX = e.clientX; s.startY = e.clientY
          img.style.objectPosition = s.posX.toFixed(1)+'% '+s.posY.toFixed(1)+'%'
        }
      })
      document.addEventListener('mouseup', async function() {
        for (const tool in _hcardDragState) {
          const s = _hcardDragState[tool]
          if (!s.dragging) continue
          s.dragging = false
          const visual = document.getElementById('hcard-visual-' + tool)
          if (visual) visual.style.cursor = esAdmin ? 'grab' : 'default'
          const img = visual && visual.querySelector('img')
          if (!img || !esAdmin) continue
          const pos = img.style.objectPosition
          try {
            const posKey='hcard-'+tool+'-pos'
            await supabase.from('media').delete().eq('tipo',posKey)
            await supabase.from('media').insert([{tipo:posKey,url:pos,nombre:posKey}])
          } catch(e) { console.warn('pos save:', e) }
        }
      })
      document.addEventListener('touchmove', function(e) {
        for (const tool in _hcardDragState) {
          const s = _hcardDragState[tool]
          if (!s.dragging) continue
          const visual = document.getElementById('hcard-visual-' + tool)
          if (!visual) continue
          const img = visual.querySelector('img')
          if (!img) continue
          const t = e.touches[0]
          const dx = (t.clientX - s.startX) / visual.offsetWidth  * 100
          const dy = (t.clientY - s.startY) / visual.offsetHeight * 100
          s.posX = Math.max(0, Math.min(100, s.posX - dx))
          s.posY = Math.max(0, Math.min(100, s.posY - dy))
          s.startX = t.clientX; s.startY = t.clientY
          img.style.objectPosition = s.posX.toFixed(1)+'% '+s.posY.toFixed(1)+'%'
          e.preventDefault()
        }
      }, { passive: false })
      document.addEventListener('touchend', async function() {
        for (const tool in _hcardDragState) {
          const s = _hcardDragState[tool]
          if (!s.dragging) continue
          s.dragging = false
          const visual = document.getElementById('hcard-visual-' + tool)
          const img = visual && visual.querySelector('img')
          if (!img || !esAdmin) continue
          const pos = img.style.objectPosition
          try {
            const posKey='hcard-'+tool+'-pos'
            await supabase.from('media').delete().eq('tipo',posKey)
            await supabase.from('media').insert([{tipo:posKey,url:pos,nombre:posKey}])
          } catch(e) { console.warn('pos save:', e) }
        }
      })
    }

    function initHcardDrag(tool) {
      const visual = document.getElementById('hcard-visual-' + tool)
      if (!visual) return
      // Init state for this tool
      _hcardDragState[tool] = { dragging: false, startX: 0, startY: 0, posX: 50, posY: 50 }
      const s = _hcardDragState[tool]
      // Load saved position
      const img = visual.querySelector('img')
      if (img && img.style.objectPosition) {
        const parts = img.style.objectPosition.split(' ')
        s.posX = parseFloat(parts[0]) || 50
        s.posY = parseFloat(parts[1]) || 50
      }
      // Only add mousedown on the visual element (not global)
      visual.addEventListener('mousedown', function(e) {
        if (!esAdmin) return
        const img = visual.querySelector('img'); if (!img) return
        s.dragging = true; s.startX = e.clientX; s.startY = e.clientY
        visual.style.cursor = 'grabbing'; e.preventDefault()
      })
      visual.addEventListener('touchstart', function(e) {
        if (!esAdmin) return
        const t = e.touches[0]; s.startX = t.clientX; s.startY = t.clientY; s.dragging = true
        e.preventDefault()
      }, { passive: false })
      // Add global listeners once
      _addHcardGlobalListeners()
    }

    // Init drag for both cards
    ;['stl','llavero','caja','maceta','marco','cortante'].forEach(initHcardDrag)

    // ── FILTROS MOBILE ──────────────────────────────────────────────────
    ;(function initMobileFilters() {
      var catSel    = document.getElementById('mobileCatSelect')
      var ordenSel  = document.getElementById('selectOrdenMobile')

      if (catSel) catSel.addEventListener('change', function() {
        categoriaActual = this.value
        // Sync desktop buttons
        document.querySelectorAll('.filtro[data-cat]').forEach(function(b){
          b.classList.toggle('activo', b.dataset.cat === categoriaActual)
        })
        paginaProductos = 1
        renderProductos()
      })

      if (ordenSel) ordenSel.addEventListener('change', function() {
        ordenActual = this.value
        document.getElementById('selectOrden').value = this.value
        paginaProductos = 1
        renderProductos()
      })

      // Sync desktop -> mobile when desktop buttons clicked
      document.querySelectorAll('.filtro[data-cat]').forEach(function(b) {
        b.addEventListener('click', function() {
          if (catSel) catSel.value = b.dataset.cat
        })
      })
      document.getElementById('selectOrden').addEventListener('change', function() {
        if (ordenSel) ordenSel.value = this.value
      })

      // Temáticas dropdown mobile — clone options from desktop after they load
      function syncTemaMobile() {
        var src  = document.getElementById('temaDropdown')
        var dst  = document.getElementById('temaDropdownMobile')
        var lblD = document.getElementById('btnTemaLabel')
        var lblM = document.getElementById('btnTemaLabelMobile')
        if (!src || !dst) return
        dst.innerHTML = src.innerHTML
        if (lblD && lblM) lblM.textContent = lblD.textContent
        // Wire up clicks in mobile dropdown
        dst.querySelectorAll('.tema-option').forEach(function(opt) {
          opt.addEventListener('click', function() {
            // Mirror to desktop
            var tema = opt.dataset.tema
            var desktopOpt = document.querySelector('.tema-option[data-tema="'+tema+'"]')
            if (desktopOpt) desktopOpt.click()
            dst.classList.remove('abierto')
            if (lblM) lblM.textContent = tema ? opt.textContent : 'Temáticas'
          })
        })
      }
      // Sync after temas are loaded (slight delay)
      setTimeout(syncTemaMobile, 2000)
      // Also sync label when desktop tema changes
      var desktopBtn = document.getElementById('btnTemaDropdown')
      if (desktopBtn) desktopBtn.addEventListener('click', function() {
        setTimeout(function() {
          var lbl = document.getElementById('btnTemaLabel')
          var lblM = document.getElementById('btnTemaLabelMobile')
          if (lbl && lblM) lblM.textContent = lbl.textContent
        }, 100)
      })

      // Mobile tema dropdown toggle
      var mobileBtn = document.getElementById('btnTemaDropdownMobile')
      var mobileDrop = document.getElementById('temaDropdownMobile')
      if (mobileBtn && mobileDrop) {
        mobileBtn.addEventListener('click', function(e) {
          e.stopPropagation()
          mobileDrop.classList.toggle('abierto')
        })
        document.addEventListener('click', function() { mobileDrop.classList.remove('abierto') })
      }
    })()

    
    // Limpiar buscador — prevenir autocomplete de Chrome
    ;(function limpiarBuscador() {
      const b = document.getElementById('buscador')
      if (!b) return
      b.value = ''
      busqueda = ''
      // Chrome aplica autocomplete de forma asíncrona, limpiar en varios momentos
      ;[0, 100, 300, 600, 1000, 2000].forEach(function(ms) {
        setTimeout(function() {
          const el = document.getElementById('buscador')
          if (el && el.value && el.value.includes('@')) {
            el.value = ''
            busqueda = ''
            if (typeof renderProductos === 'function' && productos.length > 0) renderProductos()
          }
        }, ms)
      })
    })()
    actualizarBadges()

    // ── Herramientas paramétricas ────────────────────────────────────
    // ══════════════════════════════════════════
    // ══════════════════════════════════════════
    //  HERRAMIENTAS PARAMÉTRICAS — geometría verificada
    // ══════════════════════════════════════════
    ;(function initParametric() {

      // ── Shared STL writer ────────────────────────────────────────────
      function writeSTL(tris, filename) {
        if (!usuarioActual) {
          window.requireLogin(function(){})
          return 0
        }
        var buf=new ArrayBuffer(80+4+tris.length*50)
        var dv=new DataView(buf)
        dv.setUint32(80,tris.length,true)
        var off=84
        tris.forEach(function(t){
          dv.setFloat32(off,t.n[0],true);off+=4
          dv.setFloat32(off,t.n[1],true);off+=4
          dv.setFloat32(off,t.n[2],true);off+=4
          t.v.forEach(function(v){
            dv.setFloat32(off,v[0],true);off+=4
            dv.setFloat32(off,v[1],true);off+=4
            dv.setFloat32(off,v[2],true);off+=4
          })
          dv.setUint16(off,0,true);off+=2
        })
        var blob=new Blob([buf],{type:'application/octet-stream'})
        var url=URL.createObjectURL(blob)
        var a=document.createElement('a')
        a.href=url;a.download=filename;a.click()
        setTimeout(function(){URL.revokeObjectURL(url)},1000)
        return buf.byteLength
      }

      // ── Geometry primitives (verified watertight) ────────────────────
      function _tri(out,a,b,c){
        var ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2]
        var vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2]
        var nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx
        var nl=Math.sqrt(nx*nx+ny*ny+nz*nz)
        if(nl<1e-10) return
        out.push({n:[nx/nl,ny/nl,nz/nl],v:[a,b,c]})
      }
      function _quad(out,a,b,c,d){_tri(out,a,b,c);_tri(out,a,c,d)}

      // Fan cap: ccw=true→normal up, ccw=false→normal down
      function _cap(out,pts,z,ccw){
        var n=pts.length,cx=0,cy=0
        for(var i=0;i<n;i++){cx+=pts[i][0];cy+=pts[i][1]}
        cx/=n;cy/=n
        for(var i=0;i<n;i++){
          var j=(i+1)%n
          var a=[cx,cy,z],b=[pts[i][0],pts[i][1],z],c=[pts[j][0],pts[j][1],z]
          if(ccw) _tri(out,a,b,c); else _tri(out,a,c,b)
        }
      }
      // Cylinder fan cap
      function _cylCap(out,r,z,ccw,segs){
        for(var i=0;i<segs;i++){
          var a0=(i/segs)*Math.PI*2,a1=((i+1)/segs)*Math.PI*2
          var a=[0,0,z],b=[r*Math.cos(a0),r*Math.sin(a0),z],c=[r*Math.cos(a1),r*Math.sin(a1),z]
          if(ccw) _tri(out,a,b,c); else _tri(out,a,c,b)
        }
      }
      // Extruded wall: outward→normal away from center
      function _wall(out,pts,z0,z1,outward){
        var n=pts.length
        for(var i=0;i<n;i++){
          var j=(i+1)%n
          var a0=[pts[i][0],pts[i][1],z0],a1=[pts[i][0],pts[i][1],z1]
          var b0=[pts[j][0],pts[j][1],z0],b1=[pts[j][0],pts[j][1],z1]
          if(outward) _quad(out,a0,b0,b1,a1); else _quad(out,b0,a0,a1,b1)
        }
      }
      // Frustum wall (variable radius)
      function _frust(out,rB,rT,z0,z1,segs,outward){
        for(var i=0;i<segs;i++){
          var a0=(i/segs)*Math.PI*2,a1=((i+1)/segs)*Math.PI*2
          var b0=[rB*Math.cos(a0),rB*Math.sin(a0),z0],b1=[rB*Math.cos(a1),rB*Math.sin(a1),z0]
          var t0=[rT*Math.cos(a0),rT*Math.sin(a0),z1],t1=[rT*Math.cos(a1),rT*Math.sin(a1),z1]
          if(outward) _quad(out,b0,b1,t1,t0); else _quad(out,b1,b0,t0,t1)
        }
      }
      // Ring cap between two concentric polys
      function _ring(out,outer,inner,z,faceUp){
        var n=outer.length
        for(var i=0;i<n;i++){
          var j=(i+1)%n
          var oa=[outer[i][0],outer[i][1],z],ob=[outer[j][0],outer[j][1],z]
          var ia=[inner[i][0],inner[i][1],z],ib=[inner[j][0],inner[j][1],z]
          if(faceUp) _quad(out,oa,ob,ib,ia); else _quad(out,oa,ia,ib,ob)
        }
      }
      // Cylinder ring cap
      function _cylRing(out,rOut,rIn,z,faceUp,segs){
        for(var i=0;i<segs;i++){
          var a0=(i/segs)*Math.PI*2,a1=((i+1)/segs)*Math.PI*2
          var oa=[rOut*Math.cos(a0),rOut*Math.sin(a0),z],ob=[rOut*Math.cos(a1),rOut*Math.sin(a1),z]
          var ia=[rIn*Math.cos(a0),rIn*Math.sin(a0),z],ib=[rIn*Math.cos(a1),rIn*Math.sin(a1),z]
          if(faceUp) _quad(out,oa,ob,ib,ia); else _quad(out,oa,ia,ib,ob)
        }
      }
      // Rounded rect polygon (segs*4 points, no duplicates)
      function _rrPts(L,W,r,segs){
        r=Math.max(0,Math.min(r,L/2-0.001,W/2-0.001))
        var pts=[],hL=L/2,hW=W/2
        ;[[hL-r,hW-r,0],[-hL+r,hW-r,Math.PI/2],[-hL+r,-hW+r,Math.PI],[hL-r,-hW+r,3*Math.PI/2]
        ].forEach(function(co){
          for(var i=0;i<segs;i++){
            var a=co[2]+(Math.PI/2)*(i/segs)
            pts.push([co[0]+r*Math.cos(a),co[1]+r*Math.sin(a)])
          }
        })
        return pts
      }
      // Shape path for cortante
      function _convexHull(pts){
        if(pts.length<3) return pts
        pts=pts.slice().sort(function(a,b){return a[0]-b[0]||a[1]-b[1]})
        var cross=function(O,A,B){return (A[0]-O[0])*(B[1]-O[1])-(A[1]-O[1])*(B[0]-O[0])}
        var lower=[],upper=[]
        for(var i=0;i<pts.length;i++){while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],pts[i])<=0)lower.pop();lower.push(pts[i])}
        for(var i=pts.length-1;i>=0;i--){while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],pts[i])<=0)upper.pop();upper.push(pts[i])}
        upper.pop();lower.pop()
        return lower.concat(upper)
      }
      function _shapePts(forma,r,segs){
        var pts=[]
        if(forma==='circulo'){
          for(var i=0;i<segs;i++){var a=(i/segs)*Math.PI*2;pts.push([r*Math.cos(a),r*Math.sin(a)])}
        } else if(forma==='cuadrado'){
          var s=r*0.85;pts=[[-s,-s],[s,-s],[s,s],[-s,s]]
        } else if(forma==='estrella'){
          var r2=r*0.38
          for(var i=0;i<10;i++){
            var a=(i/10)*Math.PI*2-Math.PI/2,ri=i%2===0?r:r2
            pts.push([ri*Math.cos(a),ri*Math.sin(a)])
          }
        } else if(forma==='corazon'){
          for(var i=0;i<segs;i++){
            var t=(i/segs)*Math.PI*2
            pts.push([r*0.75*Math.pow(Math.abs(Math.sin(t)),3)*(Math.sin(t)>=0?1:-1),
                     -r*0.7*(Math.cos(t)-0.3*Math.cos(2*t)-0.15*Math.cos(3*t)-0.05*Math.cos(4*t))])
          }
        } else if(forma==='cohete'){
          // Cohete: nariz cónica, cuerpo cilíndrico, aletas laterales
          var raw=[[0,-1],[0.22,-0.45],[0.22,0.38],[0.55,0.75],[0.55,1],[0.22,0.88],[-0.22,0.88],[-0.55,1],[-0.55,0.75],[-0.22,0.38],[-0.22,-0.45]]
          for(var i=0;i<raw.length;i++) pts.push([raw[i][0]*r,raw[i][1]*r])
        } else if(forma==='triangulo'){
          pts=[[0,-r],[r*0.866,r*0.5],[-r*0.866,r*0.5]]
        } else if(forma==='hexagono'){
          for(var i=0;i<6;i++){var a=(i/6)*Math.PI*2-Math.PI/6;pts.push([r*Math.cos(a),r*Math.sin(a)])}
        } else if(forma==='flecha'){
          var raw=[[0,-1],[0.5,-0.1],[0.25,-0.1],[0.25,1],[-0.25,1],[-0.25,-0.1],[-0.5,-0.1]]
          for(var i=0;i<raw.length;i++) pts.push([raw[i][0]*r, raw[i][1]*r])
        }
        return pts
      }

      // ── Watertight geometry builders ─────────────────────────────────
      // BOX BODY: cap(outer,bot,↓)+wall(outer,bot→top,→)+wall(inner,floor→top,←)+cap(inner,floor,↑)+ring(top,↑)
      function _buildBox(out,L,W,H,wall,r,segs){
        var outer=_rrPts(L,W,r,segs)
        var inner=_rrPts(L-wall*2,W-wall*2,Math.max(0,r-wall),segs)
        _cap(out,outer,0,false)
        _wall(out,outer,0,H,true)
        _wall(out,inner,wall,H,false)
        _cap(out,inner,wall,true)
        _ring(out,outer,inner,H,true)
      }
      // BOX LID: cap(outer,top,↑)+wall(outer,bot→top,→)+ring(outer,lip,bot,↓)+wall(lip,zL→bot,→)+cap(lip,zL,↓)
      function _buildLid(out,L,W,H,wall,r,lipH,tol,segs){
        var outer=_rrPts(L,W,r,segs)
        var lip=_rrPts(L-wall*2-tol*2,W-wall*2-tol*2,Math.max(0,r-wall-tol),segs)
        var zT=H,z0=0,zL=-lipH
        _cap(out,outer,zT,true)
        _wall(out,outer,z0,zT,true)
        _ring(out,outer,lip,z0,false)
        _wall(out,lip,zL,z0,true)
        _cap(out,lip,zL,false)
      }
      // MACETA: frustum shell with base thickness + optional single centered drain hole
      function _buildMaceta(out,rTop,rBot,H,wall,baseH,drenajeD,segs){
        var rTopIn=Math.max(0.5,rTop-wall),rBotIn=Math.max(0.5,rBot-wall)
        baseH=Math.min(baseH,H*0.8)
        var rd=drenajeD/2
        _frust(out,rBot,rTop,0,H,segs,true)
        _frust(out,rBotIn,rTopIn,baseH,H,segs,false)
        _cylRing(out,rTop,rTopIn,H,true,segs)
        if(rd<=0||rd>=rBotIn){
          _cylCap(out,rBot,0,false,segs)
          _cylCap(out,rBotIn,baseH,true,segs)
        } else {
          _cylRing(out,rBot,rd,0,false,segs)
          _frust(out,rd,rd,0,baseH,segs,true)
          _cylRing(out,rBotIn,rd,baseH,true,segs)
        }
      }
      // MARCO: ring(back,↓)+walls(outer,→)+walls(inner,←)+ring(front,↑)
      function _buildMarco(out,fw,fh,bw,d){
        var ow=fw+bw*2,oh=fh+bw*2
        var o=[[-ow/2,-oh/2],[ow/2,-oh/2],[ow/2,oh/2],[-ow/2,oh/2]]
        var inn=[[-fw/2,-fh/2],[fw/2,-fh/2],[fw/2,fh/2],[-fw/2,fh/2]]
        _ring(out,o,inn,0,false)   // back face (down)
        _wall(out,o,0,d,true)      // outer walls
        _wall(out,inn,0,d,false)   // inner walls (photo opening)
        _ring(out,o,inn,d,true)    // front face (up)
      }
      // CORTANTE: ring(bottom,↓)+wall(outer,→)+wall(inner,←)+ring(top,↑)
      // CORTANTE: shell with base flange (like a real cookie cutter)
      // outer wall + inner wall + bottom ring + top ring + base plate (flange)
      // Offset de polígono hacia adentro
      function _offsetPoly(pts,dist){
        var n=pts.length,result=[]
        for(var i=0;i<n;i++){
          var prev=pts[(i-1+n)%n],curr=pts[i],next=pts[(i+1)%n]
          var dx1=curr[0]-prev[0],dy1=curr[1]-prev[1]
          var len1=Math.sqrt(dx1*dx1+dy1*dy1)||1
          // Normal inward para CCW en canvas: (-dy/L, dx/L) con dist positivo encoge
          var nx1=-dy1/len1,ny1=dx1/len1
          var dx2=next[0]-curr[0],dy2=next[1]-curr[1]
          var len2=Math.sqrt(dx2*dx2+dy2*dy2)||1
          var nx2=-dy2/len2,ny2=dx2/len2
          var bx=(nx1+nx2)/2,by2=(ny1+ny2)/2
          var bLen=Math.sqrt(bx*bx+by2*by2)||1
          var dot=nx1*nx2+ny1*ny2
          var miter=1/Math.max(0.25,Math.sqrt((1+dot)/2))
          var ox=bx/bLen*dist*miter, oy=by2/bLen*dist*miter
          // Limitar miter para evitar spikes
          var maxOff=Math.abs(dist)*3
          if(Math.abs(ox)>maxOff) ox=ox>0?maxOff:-maxOff
          if(Math.abs(oy)>maxOff) oy=oy>0?maxOff:-maxOff
          result.push([curr[0]+ox,curr[1]+oy])
        }
        return result
      }

      function _buildCortante(out,forma,size,filo,wall,segs){
        var r=size/2
        var outer=_shapePts(forma,r,segs)
        var inner=_shapePts(forma,Math.max(0.5,r-wall),segs)
        _wall(out,outer,0,filo,true)
        _wall(out,inner,0,filo,false)
        _ring(out,outer,inner,filo,true)
        _ring(out,outer,inner,0,false)
      }

      // ── CAJA CON TAPA ────────────────────────────────────────────────
      var cajaGL=null, cajaPieza='ambas'
      window.cajaSetPieza=function(p){
        cajaPieza=p
        ;['caja','tapa','ambas'].forEach(function(x){
          document.getElementById('caja-tog'+x.charAt(0).toUpperCase()+x.slice(1)).className='stl-tog'+(x===p?' stl-tog--active':'')
        })
        cajaRebuild()
      }
      ;['caja-sLargo','caja-sAncho','caja-sAlto','caja-sGrosor','caja-sRadio','caja-sTapa'].forEach(function(id){
        var el=document.getElementById(id),out=document.getElementById(id.replace('-s','-v'))
        if(el&&out) el.addEventListener('input',function(){out.textContent=el.value;cajaRebuild()})
      })
      function cajaGetP(){
        var L=parseFloat(document.getElementById('caja-sLargo').value)
        var W=parseFloat(document.getElementById('caja-sAncho').value)
        var H=parseFloat(document.getElementById('caja-sAlto').value)
        var wall=parseFloat(document.getElementById('caja-sGrosor').value)
        var r=parseFloat(document.getElementById('caja-sRadio').value)
        var tapa=parseFloat(document.getElementById('caja-sTapa').value)
        wall=Math.max(0.5,Math.min(wall,L/4,W/4))
        r=Math.max(0,Math.min(r,L/2-wall-0.1,W/2-wall-0.1))
        tapa=Math.max(2,Math.min(tapa,H-2))
        return {L:L,W:W,H:H,wall:wall,r:r,tapa:tapa}
      }
      function cajaRebuild(){
        if(!cajaGL) cajaGL=createGLRenderer('caja-canvas')
        if(!cajaGL) return
        var p=cajaGetP(),segs=8,tol=0.25,bodyH=p.H-p.tapa
        var lipH=Math.min(p.tapa*0.6,6),sc=1.1/Math.max(p.L,p.W,p.H)
        var sL=p.L*sc,sW=p.W*sc,sBH=bodyH*sc,sTH=p.tapa*sc,sWall=p.wall*sc,sR=p.r*sc,sLip=lipH*sc
        var totH=sBH+sTH,cb=new Float32Array([0.04,0.25,0.32]),cl=new Float32Array([0.07,0.40,0.43])
        var ms=[]
        if(cajaPieza==='caja'||cajaPieza==='ambas'){
          var tb=[];_buildBox(tb,sL,sW,sBH,sWall,sR,segs)
          var ox=cajaPieza==='ambas'?-sL*0.6:0
          ms.push(cajaGL.mkMesh(tb,cb,ox-sL/2,-sW/2,cajaPieza==='caja'?-totH/2:-sBH/2))
        }
        if(cajaPieza==='tapa'||cajaPieza==='ambas'){
          var tl=[];_buildLid(tl,sL,sW,sTH,sWall,sR,sLip,tol*sc,segs)
          var ox2=cajaPieza==='ambas'?sL*0.6:0
          ms.push(cajaGL.mkMesh(tl,cl,ox2-sL/2,-sW/2,cajaPieza==='caja'?-totH/2+sBH:-sTH/2))
        }
        cajaGL.setMeshes(ms)
      }
      window.cajaGenerar=function(){
        var p=cajaGetP(),segs=8,tol=0.25,tris=[],bodyH=p.H-p.tapa,lipH=Math.min(p.tapa*0.6,6)
        if(cajaPieza==='caja'||cajaPieza==='ambas'){
          var offX=cajaPieza==='ambas'?-(p.L/2+4):0
          var tb=[];_buildBox(tb,p.L,p.W,bodyH,p.wall,p.r,segs)
          tb.forEach(function(t){tris.push({n:t.n,v:t.v.map(function(v){return[v[0]+offX,v[1],v[2]]})})})
        }
        if(cajaPieza==='tapa'||cajaPieza==='ambas'){
          var offX2=cajaPieza==='ambas'?p.L/2+4:0
          var tl=[];_buildLid(tl,p.L,p.W,p.tapa,p.wall,p.r,lipH,tol,segs)
          tl.forEach(function(t){tris.push({n:t.n,v:t.v.map(function(v){return[v[0]+offX2,v[1],v[2]]})})})
        }
        var bytes=writeSTL(tris,'caja.stl'); if(window.trackDescarga) trackDescarga('caja')
        document.getElementById('caja-tris').textContent=tris.length.toLocaleString()
        document.getElementById('caja-size').textContent=(bytes/1024).toFixed(1)+' KB'
        document.getElementById('caja-status').textContent='STL generado — '+tris.length.toLocaleString()+' triángulos'
      }
      setTimeout(cajaRebuild,400)

      // ── MACETA / BOWL ────────────────────────────────────────────────
      var macGL=null
      ;['mac-sDiamTop','mac-sDiamBot','mac-sAlto','mac-sGrosor','mac-sBase','mac-sDrenajeD','mac-sSegs'].forEach(function(id){
        var el=document.getElementById(id),out=document.getElementById(id.replace('-s','-v'))
        if(el&&out) el.addEventListener('input',function(){
          out.textContent=el.value

          macRebuild()
        })
      })
      function macGetP(){
        return {
          rTop:parseFloat(document.getElementById('mac-sDiamTop').value)/2,
          rBot:parseFloat(document.getElementById('mac-sDiamBot').value)/2,
          H:parseFloat(document.getElementById('mac-sAlto').value),
          wall:parseFloat(document.getElementById('mac-sGrosor').value),
          baseH:parseFloat(document.getElementById('mac-sBase').value),
          drenajeD:parseFloat(document.getElementById('mac-sDrenajeD').value),
          segs:parseInt(document.getElementById('mac-sSegs').value)
        }
      }
      function macRebuild(){
        if(!macGL) macGL=createGLRenderer('mac-canvas', 0.4, 0.5)
        if(!macGL) return
        var p=macGetP()
        var sc=1.1/Math.max(p.rTop*2,p.H)
        var rT=p.rTop*sc, rB=p.rBot*sc, H=p.H*sc
        var wall=p.wall*sc, segs=p.segs
        var rTin=Math.max(0.01,rT-wall), rBin=Math.max(0.01,rB-wall)
        var baseH=Math.min(p.baseH*sc,H*0.8)
        var rd=(p.drenajeD/2)*sc
        var tris=[]
        _frust(tris,rB,rT,0,H,segs,true)
        _cylRing(tris,rT,rTin,H,true,segs)
        _cylCap(tris,rTin,H,false,segs)
        if(rd>0&&rd<rBin){
          _cylRing(tris,rB,rd,0,false,segs)
          _frust(tris,rd,rd,0,baseH,segs,true)
          _cylRing(tris,rBin,rd,baseH,true,segs)
        } else {
          _cylCap(tris,rB,0,false,segs)
        }
        macGL.setMeshes([macGL.mkMesh(tris,new Float32Array([0.04,0.28,0.35]),0,0,-H/2)])
      }
      window.macetaGenerar=function(){
        var p=macGetP(),tris=[]
        _buildMaceta(tris,p.rTop,p.rBot,p.H,p.wall,p.baseH,p.drenajeD,p.segs)
        var bytes=writeSTL(tris,'maceta.stl'); if(window.trackDescarga) trackDescarga('maceta')
        document.getElementById('mac-tris').textContent=tris.length.toLocaleString()
        document.getElementById('mac-size').textContent=(bytes/1024).toFixed(1)+' KB'
        document.getElementById('mac-status').textContent='STL generado — '+tris.length.toLocaleString()+' triángulos'
      }
      setTimeout(macRebuild,500)

      // ── MARCO / PORTA-FOTO ───────────────────────────────────────────
      var marGL=null
      ;['mar-sFW','mar-sFH','mar-sBW','mar-sD','mar-sSop'].forEach(function(id){
        var el=document.getElementById(id),out=document.getElementById(id.replace('-s','-v'))
        if(el&&out) el.addEventListener('input',function(){out.textContent=el.value;marRebuild()})
      })
      function marGetP(){
        return {
          fw:parseFloat(document.getElementById('mar-sFW').value),
          fh:parseFloat(document.getElementById('mar-sFH').value),
          bw:parseFloat(document.getElementById('mar-sBW').value),
          d:parseFloat(document.getElementById('mar-sD').value),
          sop:parseFloat(document.getElementById('mar-sSop').value),
        }
      }
      function marRebuild(){
        if(!marGL) marGL=createGLRenderer('mar-canvas', 0.4, 0.3)
        if(!marGL) return
        var p=marGetP(),ow=p.fw+p.bw*2,oh=p.fh+p.bw*2
        var sc=1.1/Math.max(ow,oh,p.d*10)
        var tris=[];_buildMarco(tris,p.fw*sc,p.fh*sc,p.bw*sc,p.d*sc)
        var ms=[marGL.mkMesh(tris,new Float32Array([0.04,0.28,0.35]),0,0,-p.d*sc/2)]
        marGL.setMeshes(ms)
      }
      window.marcoGenerar=function(){
        var p=marGetP(),tris=[]
        _buildMarco(tris,p.fw,p.fh,p.bw,p.d)
        var bytes=writeSTL(tris,'marco.stl'); if(window.trackDescarga) trackDescarga('marco')
        document.getElementById('mar-tris').textContent=tris.length.toLocaleString()
        document.getElementById('mar-size').textContent=(bytes/1024).toFixed(1)+' KB'
        document.getElementById('mar-status').textContent='STL generado — '+tris.length.toLocaleString()+' triángulos'
      }
      setTimeout(marRebuild,600)

      // ── CORTANTE DE COCINA ───────────────────────────────────────────
      var cortGL=null, cortForma='estrella'
      window.cortSetForma=function(f){
        cortForma=f
        ;['estrella','corazon','circulo','cuadrado','cohete','triangulo','hexagono','flecha'].forEach(function(x){
          document.getElementById('cort-tog'+x.charAt(0).toUpperCase()+x.slice(1)).className='stl-tog'+(x===f?' stl-tog--active':'')
        })
        cortRebuild()
      }
      ;['cort-sSize','cort-sFilo','cort-sGrosor','cort-sFlangeH','cort-sFlangeW'].forEach(function(id){
        var el=document.getElementById(id),out=document.getElementById(id.replace('-s','-v'))
        if(el&&out) el.addEventListener('input',function(){out.textContent=el.value;cortRebuild()})
      })
      function cortGetP(){
        return {
          size:parseFloat(document.getElementById('cort-sSize').value),
          filo:parseFloat(document.getElementById('cort-sFilo').value),
          wall:parseFloat(document.getElementById('cort-sGrosor').value),
          flangeH:parseFloat(document.getElementById('cort-sFlangeH').value),
          flangeW:parseFloat(document.getElementById('cort-sFlangeW').value),
        }
      }
      function cortRebuild(){
        if(!cortGL) cortGL=createGLRenderer('cort-canvas', -0.3, 0.3)
        if(!cortGL) return
        var p=cortGetP()
        var flangeH=p.flangeH, flangeW=p.flangeW
        var totH=p.filo+flangeH
        var sc=1.1/Math.max(p.size+flangeW*2, totH)
        var segs=['cuadrado'].indexOf(cortForma)>=0?4:['estrella'].indexOf(cortForma)>=0?10:['cohete','triangulo','hexagono','flecha'].indexOf(cortForma)>=0?0:128
        var r=p.size/2*sc, rFlange=r+(flangeW*sc), fH=flangeH*sc, fsc=p.filo*sc
        var flangeOuter=_shapePts(cortForma,rFlange,segs)
        var outer=_shapePts(cortForma,r,segs)
        var tris=[]
        _ring(tris,flangeOuter,outer,0,false)
        _wall(tris,flangeOuter,0,fH,true)
        _ring(tris,flangeOuter,outer,fH,true)
        _ring(tris,outer,_shapePts(cortForma,Math.max(0.5*sc,r-p.wall*sc),segs),fH,false)
        _buildCortante(tris,cortForma,p.size*sc,fsc,p.wall*sc,segs)
        cortGL.setMeshes([cortGL.mkMesh(tris,new Float32Array([0.04,0.28,0.35]),0,0,-totH*sc/2)])
      }
      window.cortanteGenerar=function(){
        var p=cortGetP(),tris=[]
        var flangeH=p.flangeH, flangeW=p.flangeW
        var segs=['cuadrado'].indexOf(cortForma)>=0?4:['estrella'].indexOf(cortForma)>=0?10:['cohete','triangulo','hexagono','flecha'].indexOf(cortForma)>=0?0:128
        var r=p.size/2, rFlange=r+flangeW
        var flangeOuter=_shapePts(cortForma,rFlange,segs)
        var outer=_shapePts(cortForma,r,segs)
        _ring(tris,flangeOuter,outer,0,false)
        _wall(tris,flangeOuter,0,flangeH,true)
        _ring(tris,flangeOuter,outer,flangeH,true)
        _ring(tris,outer,_shapePts(cortForma,Math.max(0.5,r-p.wall),segs),flangeH,false)
        _buildCortante(tris,cortForma,p.size,p.filo,p.wall,segs)
        window.dlCheck('cortante',function(){
          var bytes=writeSTL(tris,'cortante.stl'); if(window.trackDescarga) trackDescarga('cortante')
          document.getElementById('cort-tris').textContent=tris.length.toLocaleString()
          document.getElementById('cort-size').textContent=(bytes/1024).toFixed(1)+' KB'
          document.getElementById('cort-status').textContent='STL generado — '+tris.length.toLocaleString()+' triángulos'
        })
      }
      
            setTimeout(cortRebuild,700)

    })()


    cargarPerfil()
    cargarDisenador()
    cargarSugerencias()
    cargarYoutube()
    _tendenciasCargarEstado()
    // Migrar URLs viejas de fondos si es admin
    if (typeof migrarUrlsFondos === 'function') setTimeout(migrarUrlsFondos, 3000)
    // Cargar media y portadas en secuencia: primero portadas, luego carrusel
    ;(async () => {
      await cargarMedia()      // carga logo, carruselItems
      await cargarHcardImgs()  // construye _portadasMap con URLs de GitHub
      renderCarrusel()         // renderiza con el mapa completo
    })()
