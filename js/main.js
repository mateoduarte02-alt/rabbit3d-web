// ═══════════════════════════════════════════════════
// main.js — La Madriguera
// Resto de funcionalidades:
// menú mobile, lab STL, emprendedores, tarjetas,
// mejora, fotoproducto, presupuesto, cajas,
// downloads, tracking, gestión herramientas
// ═══════════════════════════════════════════════════

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

    // Sincronizar label de usuario en menú mobile
    const _actualizarNavOrig = actualizarNavUsuario
    actualizarNavUsuario = function() {
      _actualizarNavOrig()
      const label = document.getElementById('mm-userLabel')
      if (label) {
        label.textContent = usuarioActual
          ? (perfilUsuario?.nombre || usuarioActual.email)
          : 'Iniciar sesión'
      }
    }

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
      function _shapePts(forma,r,segs){
        var pts=[]
        if(forma==='circulo'){
          for(var i=0;i<segs;i++){var a=(i/segs)*Math.PI*2;pts.push([r*Math.cos(a),r*Math.sin(a)])}
        } else if(forma==='cuadrado'){
          var s=r*0.85;pts=[[-s,-s],[s,-s],[s,s],[-s,s]]
        } else if(forma==='estrella'){
          var r2=r*0.45
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
      function _buildCortante(out,forma,size,filo,wall,segs){
        var r=size/2,rIn=Math.max(0.5,r-wall)
        var outer=_shapePts(forma,r,segs)
        var inner=_shapePts(forma,rIn,segs)
        // Cutting walls (from z=0 to z=filo)
        _ring(out,outer,inner,0,false)       // bottom ring (cutting edge)
        _wall(out,outer,0,filo,true)         // outer wall
        _wall(out,inner,0,filo,false)        // inner wall
        _ring(out,outer,inner,filo,true)     // top ring
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
        ;['estrella','corazon','circulo','cuadrado'].forEach(function(x){
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
        // Max segments: estrella fixed 10 pts, others use 128 for smoothness
        var segs=cortForma==='cuadrado'?4:cortForma==='estrella'?10:128
        var r=p.size/2*sc, rIn=Math.max(0.5*sc,r-p.wall*sc)
        var rFlange=r+(flangeW*sc), fH=flangeH*sc, fsc=p.filo*sc
        var outer=_shapePts(cortForma,r,segs)
        var inner=_shapePts(cortForma,rIn,segs)
        var flangeOuter=_shapePts(cortForma,rFlange,segs)
        var tris=[]
        _ring(tris,flangeOuter,outer,0,false)
        _wall(tris,flangeOuter,0,fH,true)
        _ring(tris,flangeOuter,outer,fH,true)
        _ring(tris,outer,inner,0,false)
        _wall(tris,outer,0,fsc,true)
        _wall(tris,inner,0,fsc,false)
        _ring(tris,outer,inner,fsc,true)
        cortGL.setMeshes([cortGL.mkMesh(tris,new Float32Array([0.04,0.28,0.35]),0,0,-totH*sc/2)])
      }
      window.cortanteGenerar=function(){
        var p=cortGetP(),tris=[]
        var flangeH=p.flangeH, flangeW=p.flangeW
        // Max segments for best quality STL
        var segs=cortForma==='cuadrado'?4:cortForma==='estrella'?10:128
        var r=p.size/2, rIn=Math.max(0.5,r-p.wall)
        var rFlange=r+flangeW
        var outer=_shapePts(cortForma,r,segs)
        var inner=_shapePts(cortForma,rIn,segs)
        var flangeOuter=_shapePts(cortForma,rFlange,segs)
        _ring(tris,flangeOuter,outer,0,false)
        _wall(tris,flangeOuter,0,flangeH,true)
        _ring(tris,flangeOuter,outer,flangeH,true)
        _ring(tris,outer,inner,0,false)
        _wall(tris,outer,0,p.filo,true)
        _wall(tris,inner,0,p.filo,false)
        _ring(tris,outer,inner,p.filo,true)
        var bytes=writeSTL(tris,'cortante.stl'); if(window.trackDescarga) trackDescarga('cortante')
        document.getElementById('cort-tris').textContent=tris.length.toLocaleString()
        document.getElementById('cort-size').textContent=(bytes/1024).toFixed(1)+' KB'
        document.getElementById('cort-status').textContent='STL generado — '+tris.length.toLocaleString()+' triángulos'
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

    //  ÁREA DE EMPRENDEDORES
    // ══════════════════════════════════════════
    window.abrirEmprendedor = function(id) {
      const el = document.getElementById(id)
      if (!el) return
      el.style.display = 'flex'
      el.style.alignItems = 'center'
      el.style.justifyContent = 'center'
      el.style.position = 'fixed'
      el.style.inset = '0'
      el.style.zIndex = '9998'
      el.style.background = 'rgba(0,0,0,0.82)'
      el.style.backdropFilter = 'blur(6px)'
      el.style.padding = '1rem'
      document.body.style.overflow = 'hidden'
    }

    window.cerrarEmprendedor = function(id) {
      const el = document.getElementById(id)
      if (el) el.style.display = 'none'
      document.body.style.overflow = ''
    }
    ;['modal-tarjetas','modal-potenciador','modal-costos','modal-mejora','modal-presupuesto','modal-fotoproducto','modal-cajas'].forEach(id=>{
      const el=document.getElementById(id)
      if(el) el.addEventListener('click',e=>{ if(e.target===el) cerrarEmprendedor(id) })
    })

    // ── Sistema de Mantenimiento de herramientas ──────────────────────────────
    // Las herramientas en mantenimiento se guardan en Supabase tabla media
    // tipo = 'config-maint-<toolId>', nombre = '1' (en mant) o '0' (activa)
    let _maintTools = {}       // { toolId: true/false }
    let _maintLoaded = false

    async function cargarMantenimiento() {
      if (_maintLoaded) return
      try {
        const { data } = await supabase.from('media')
          .select('tipo,nombre').like('tipo','config-maint-%')
        if (data) data.forEach(r => {
          const id = r.tipo.replace('config-maint-','')
          _maintTools[id] = r.nombre === '1'
        })
        _maintLoaded = true
        _aplicarOverlaysMant()
      } catch(e) {}
    }

    function _estaEnMant(toolId) { return !!_maintTools[toolId] }

    // Muestra overlay visual en la card si está en mantenimiento
    function _aplicarOverlaysMant() {
      Object.entries(_maintTools).forEach(function(entry) { var id=entry[0], enMant=entry[1];
        // Cards de laboratorio
        const labCard = document.querySelector('.herramienta-card[onclick*="modal-' + id + '"]')
        if (labCard) _toggleMantOverlay(labCard, id, enMant, 'lab')
        // Cards de emprendedores
        const emprCard = document.querySelector('[data-empr-id="' + id + '"]')
        if (emprCard) _toggleMantOverlay(emprCard, id, enMant, 'empr')
      })
    }

    function _toggleMantOverlay(card, id, enMant, tipo) {
      const overlayId = 'mant-overlay-' + id
      let overlay = document.getElementById(overlayId)
      if (enMant && !esAdmin) {
        if (!overlay) {
          overlay = document.createElement('div')
          overlay.id = overlayId
          overlay.style.cssText = 'position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4rem;background:rgba(0,0,0,.72);border-radius:inherit;backdrop-filter:blur(3px);pointer-events:all'
          overlay.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.5" width="28" height="28"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span style="font-size:.72rem;font-weight:700;color:#f59e0b;text-align:center;padding:0 .5rem">En mantenimiento</span><span style="font-size:.65rem;color:rgba(255,255,255,.6);text-align:center;padding:0 .5rem">Volvé pronto</span>'
          if (getComputedStyle(card).position === 'static') card.style.position = 'relative'
          card.appendChild(overlay)
        }
      } else if (overlay) {
        overlay.remove()
      }
    }

    // Interceptar abrirHerramienta y abrirEmprendedor para bloquear si está en mant
    const _origAbrirH_mant = window.abrirHerramienta
    window.abrirHerramienta = function(id) {
      const toolId = id.replace('modal-','')
      if (_estaEnMant(toolId) && !esAdmin) {
        // Mostrar toast de mantenimiento
        _mostrarToastMant()
        return
      }
      _origAbrirH_mant(id)
    }

    const _origAbrirE_mant = window.abrirEmprendedor
    window.abrirEmprendedor = function(id) {
      const toolId = id.replace('modal-','')
      if (_estaEnMant(toolId) && !esAdmin) {
        _mostrarToastMant()
        return
      }
      _origAbrirE_mant(id)
    }

    function _mostrarToastMant() {
      const t = document.createElement('div')
      t.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:#1a1a2e;border:1px solid #f59e0b;color:#f59e0b;padding:.6rem 1.2rem;border-radius:8px;font-size:.8rem;font-weight:600;z-index:99999;display:flex;align-items:center;gap:.5rem;box-shadow:0 4px 20px rgba(0,0,0,.5)'
      t.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Esta herramienta está en mantenimiento'
      document.body.appendChild(t)
      setTimeout(() => t.remove(), 3000)
    }

    // Cargar estado de mantenimiento al iniciar
    cargarMantenimiento()
    // ── Fin sistema de mantenimiento ──────────────────────────────────────────

    window.requireLogin = function(callback) {
      if (usuarioActual) { callback(); return }
      // Mostrar modal de login inmediatamente (z-index: 99999 lo pone sobre cualquier herramienta)
      const modalU = document.getElementById('modalUsuario')
      if (modalU) {
        // Agregar mensaje contextual en el modal
        const existing = document.getElementById('loginDownloadMsg')
        if (existing) existing.remove()
        const msg = document.createElement('div')
        msg.id = 'loginDownloadMsg'
        msg.style.cssText = 'background:rgba(21,154,156,.12);border:1px solid rgba(21,154,156,.35);border-radius:8px;padding:.65rem 1rem;font-size:.8rem;color:var(--cyan);text-align:center;margin-bottom:.5rem'
        msg.innerHTML = '🔒 Iniciá sesión para descargar el archivo'
        const firstChild = modalU.querySelector('.modal')
        if (firstChild) {
          const title = firstChild.querySelector('.modal__title,.modal__sub')
          if (title) title.parentNode.insertBefore(msg, title.nextSibling)
          else firstChild.prepend(msg)
        }
        // Asegurarse de mostrar el tab de login
        const tabLogin = document.getElementById('tabLogin')
        if (tabLogin) tabLogin.click()
        modalU.classList.add('activo')
      }
    }
    // ── TARJETAS ─────────────────────────────────────────────────────
    // Agrega contorno del color del fondo original al logo recortado
    async function tarjAgregarContorno(src, color) {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const pad = Math.round(Math.max(img.width, img.height) * 0.04)
          const W = img.width + pad*2, H = img.height + pad*2
          const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, pad, pad)
          resolve(canvas.toDataURL('image/png'))
        }
        img.src = src
      })
    }

    let tarjLogoImg=null, tarjLogoColor=null, tarjColores=['#159A9C','#001520','#ffffff','#f0a028']

    let tarjBgRemoval = 0  // 0 = sin remoción, 1 = remoción total del fondo
    let tarjLogoScale = 1.0  // 1 = tamaño base

    function tarjLoadLogo(file) {
      if (!file || !file.type.startsWith('image/')) return
      const r = new FileReader()
      r.onload = e => {
        const img = new Image()
        img.onload = () => {
          tarjLogoImg = img
          tarjPrevImg.src = e.target.result
          tarjInner.style.display = 'none'
          tarjPrev.style.display = 'flex'
          document.getElementById('tarjError').textContent = ''
          document.getElementById('tarjLogoOpacityGroup').style.display = 'block'
          document.getElementById('tarjLogoScaleGroup').style.display = 'block'

          // Extraer los 4 colores más destacados del logo
          try {
            const tc = document.createElement('canvas'); tc.width = 80; tc.height = 80
            const tx = tc.getContext('2d'); tx.drawImage(img, 0, 0, 80, 80)
            const pixels = tx.getImageData(0, 0, 80, 80).data
            const colorMap = {}
            for (let i = 0; i < pixels.length; i += 4) {
              const a = pixels[i+3]; if (a < 80) continue
              const rv = pixels[i], gv = pixels[i+1], bv = pixels[i+2]
              const bright = rv*0.299 + gv*0.587 + bv*0.114
              if (bright > 235 || bright < 15) continue
              // Cuantizar a grupos de 32
              const key = `${Math.round(rv/32)*32},${Math.round(gv/32)*32},${Math.round(bv/32)*32}`
              colorMap[key] = (colorMap[key] || 0) + 1
            }
            const sorted = Object.entries(colorMap).sort((a,b) => b[1]-a[1])
            // Tomar los 4 más frecuentes y distintos entre sí
            const picked = []
            for (var ki=0; ki<sorted.length; ki++) {
              var key = sorted[ki][0]
              var rgb = key.split(',').map(Number)
              var r2=rgb[0],g2=rgb[1],b2=rgb[2]
              var esDistinto = picked.every(function(p) {
                return Math.abs(r2-p[0])+Math.abs(g2-p[1])+Math.abs(b2-p[2]) > 60
              })
              if (esDistinto) picked.push([r2,g2,b2])
              if (picked.length === 4) break
            }
            const defaults = [[21,154,156],[0,21,32],[255,255,255],[240,160,40]]
            while (picked.length < 4) picked.push(defaults[picked.length])
            tarjColores = picked.map(function(p) { return 'rgb('+p[0]+','+p[1]+','+p[2]+')' })
            tarjLogoColor = tarjColores[0]
            tarjActualizarSelectores()
          } catch(e) { tarjLogoColor = null }

          if (typeof tarjGenerarTodas === 'function') tarjGenerarTodas_throttled()
        }
        img.src = e.target.result
      }
      r.readAsDataURL(file)
    }

    function tarjActualizarSelectores() {
      tarjColores.forEach((color, i) => {
        const el = document.getElementById('tarjColor' + i)
        if (el) {
          // Convertir rgb() a hex para el input color
          const m = color.match(/\d+/g)
          if (m && m.length >= 3) el.value = '#' + m.slice(0,3).map(v => Math.min(255,parseInt(v)).toString(16).padStart(2,'0')).join('')
        }
      })
    }
    const tarjZone=document.getElementById('tarjUploadZone'),tarjFile=document.getElementById('tarjLogoFile'),tarjInner=document.getElementById('tarjUploadInner'),tarjPrev=document.getElementById('tarjUploadPreview'),tarjPrevImg=document.getElementById('tarjLogoPreviewImg')
    tarjZone.addEventListener('click',e=>{if(!e.target.closest('#tarjChangeLogo'))tarjFile.click()})
    document.getElementById('tarjChangeLogo').addEventListener('click',e=>{e.stopPropagation();tarjFile.click()})
    tarjFile.addEventListener('change',e=>tarjLoadLogo(e.target.files[0]))
    tarjZone.addEventListener('dragover',e=>{e.preventDefault();tarjZone.classList.add('vec-drag')});tarjZone.addEventListener('dragleave',()=>tarjZone.classList.remove('vec-drag'));tarjZone.addEventListener('drop',e=>{e.preventDefault();tarjZone.classList.remove('vec-drag');tarjLoadLogo(e.dataTransfer.files[0])})

    // Color inputs
    ;[0,1,2,3].forEach(i => {
      document.getElementById('tarjColor'+i)?.addEventListener('input', function() {
        const hex = this.value
        const r2 = parseInt(hex.slice(1,3),16), g2 = parseInt(hex.slice(3,5),16), b2 = parseInt(hex.slice(5,7),16)
        tarjColores[i] = `rgb(${r2},${g2},${b2})`
        if (i === 0) tarjLogoColor = tarjColores[0]
        if (typeof tarjGenerarTodas === 'function') tarjGenerarTodas_throttled()
      })
    })
    document.getElementById('tarjResetColores')?.addEventListener('click', () => {
      if (tarjLogoImg) tarjLoadLogo(tarjFile.files[0]) // re-detectar del logo
    })
    document.getElementById('tarjLogoOpacity')?.addEventListener('input', function() {
      tarjBgRemoval = this.value / 100
      document.getElementById('tarjLogoOpacityVal').textContent = this.value + '%'
      if (typeof tarjGenerarTodas === 'function') tarjGenerarTodas_throttled()
    })
    document.getElementById('tarjLogoScaleInput')?.addEventListener('input', function() {
      tarjLogoScale = this.value / 100
      document.getElementById('tarjLogoScaleVal').textContent = this.value + '%'
      if (typeof tarjGenerarTodas === 'function') tarjGenerarTodas_throttled()
    })
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

    //  FOTO DE PRODUCTO — compositor
    // ══════════════════════════════════════════
    ;(function() {
      // Estado
      let fotoOrigImg   = null   // HTMLImageElement original
      let fotoRecortada = null   // ImageData recortada (sin fondo)
      let fotoBgImg     = null   // HTMLImageElement fondo seleccionado
      let fotoFondos    = []     // URLs de fondos cargados desde Supabase
      let fotoPosX = 0, fotoPosY = 0
      let fotoEscala = 0.8, fotoRot = 0
      let fotoDragging = false, fotoDragStartX = 0, fotoDragStartY = 0

      const canvas  = document.getElementById('fotoCanvas')
      const ctx     = canvas.getContext('2d', { willReadFrequently: true })

      // ── Cargar fondos desde Supabase ─────────────────────────────
      // Convierte URLs de fondos de GitHub Pages a raw.githubusercontent.com para evitar CORS
      function normalizarUrlFondo(url) {
        if (!url) return url
        // lamadriguera.site/fondos/X → raw.githubusercontent.com/.../fondos/X
        if (url.includes('lamadriguera.site/fondos/')) {
          const archivo = url.split('/fondos/').pop()
          return 'https://raw.githubusercontent.com/rabbit-3d/rabbit-3d.github.io/main/fondos/' + archivo
        }
        // rabbit-3d.github.io/fondos/X → raw.githubusercontent.com/.../fondos/X
        if (url.includes('rabbit-3d.github.io/fondos/')) {
          const archivo = url.split('/fondos/').pop()
          return 'https://raw.githubusercontent.com/rabbit-3d/rabbit-3d.github.io/main/fondos/' + archivo
        }
        return url
      }

      async function cargarFotoFondos() {
        try {
          const { data, error } = await supabase.from('media')
            .select('tipo,url').like('tipo','foto-fondo-%')
          if (error || !data) return
          let fondos = data.map(r => normalizarUrlFondo(r.url)).filter(Boolean)
          // Aplicar orden guardado
          const orderRes = await supabase.from('media').select('nombre').eq('tipo','foto-fondos-order').maybeSingle()
          if (orderRes.data && orderRes.data.nombre) {
            try {
              const order = JSON.parse(orderRes.data.nombre)
              const map = {}
              data.forEach(r => { map[r.tipo] = normalizarUrlFondo(r.url) })
              const ordered = order.map(t => map[t]).filter(Boolean)
              // Agregar fondos sin orden al final
              data.forEach(r => { if (!order.includes(r.tipo) && r.url) ordered.push(normalizarUrlFondo(r.url)) })
              fondos = ordered
            } catch(e) {}
          }
          fotoFondos = fondos
          renderFondosGrid()
        } catch(e) { console.warn('cargarFotoFondos:', e) }
      }

      function renderFondosGrid() {
        const grid   = document.getElementById('fotoFondosGrid')
        const verBtn = document.getElementById('fotoVerMasFondos')
        if (!grid) return
        if (!fotoFondos.length) {
          grid.innerHTML = '<p style="color:var(--muted);font-size:.78rem">El administrador aún no cargó fondos. Volvé pronto.</p>'
          if (verBtn) verBtn.style.display = 'none'
          return
        }
        grid.innerHTML = ''
        grid.classList.remove('foto-fondos-grid--expanded')
        fotoFondos.forEach((url, i) => {
          const btn = document.createElement('div')
          btn.className = 'foto-fondo-thumb' + (i === 0 ? ' foto-fondo-thumb--active' : '')
          btn.style.backgroundImage = `url("${url}")`
          btn.addEventListener('click', () => {
            document.querySelectorAll('.foto-fondo-thumb').forEach(b => b.classList.remove('foto-fondo-thumb--active'))
            btn.classList.add('foto-fondo-thumb--active')
            const img = new Image(); img.crossOrigin = 'anonymous'
            img.onload = () => { fotoSetBgImg(img) }
            img.src = url
          })
          grid.appendChild(btn)
          if (i === 0) {
            const img = new Image(); img.crossOrigin = 'anonymous'
            img.onload = () => { if (!fotoBgImg && !fotoBgColor) fotoSetBgImg(img) }
            img.src = url
          }
        })
        // Mostrar botón "Ver más" solo si hay más de una fila
        if (verBtn) {
          const needsMore = fotoFondos.length > 4
          verBtn.style.display = needsMore ? 'flex' : 'none'
          let expanded = false
          verBtn.onclick = () => {
            expanded = !expanded
            grid.classList.toggle('foto-fondos-grid--expanded', expanded)
            verBtn.innerHTML = expanded
              ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="18 15 12 9 6 15"/></svg> Ver menos'
              : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg> Ver todos los fondos (' + fotoFondos.length + ')'
          }
          verBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg> Ver todos los fondos (' + fotoFondos.length + ')'
        }
      }

      // ── Upload zona producto ──────────────────────────────────────
      const uploadZone = document.getElementById('fotoUploadZone')
      const fileInput  = document.getElementById('fotoProductoFile')

      uploadZone.addEventListener('click', () => fileInput.click())
      uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('foto-drag') })
      uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('foto-drag'))
      uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('foto-drag'); fotoCargar(e.dataTransfer.files[0]) })
      fileInput.addEventListener('change', e => fotoCargar(e.target.files[0]))

      function fotoCargar(file) {
        if (!file) return
        // Validar formato
        const validTypes = ['image/jpeg','image/jpg','image/png']
        if (!validTypes.includes(file.type) && !file.name.match(/\.(jpe?g|png)$/i)) {
          const zone  = document.getElementById('fotoUploadZone')
          const inner = document.getElementById('fotoUploadInner')
          zone.style.borderColor = '#f87171'
          zone.style.background  = 'rgba(248,113,113,.05)'
          inner.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:.5rem;padding:1.5rem;pointer-events:none">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="1.5" width="36" height="36"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p style="margin:0;font-size:.9rem;font-weight:700;color:#f87171;font-family:var(--font-head)">FORMATO NO VÁLIDO</p>
              <p style="margin:0;font-size:.78rem;color:var(--text)">"${file.name}"</p>
              <p style="margin:0;font-size:.72rem;color:var(--muted)">Usá JPG o PNG · Hacé clic para intentar de nuevo</p>
            </div>`
          setTimeout(() => {
            zone.style.borderColor = ''
            zone.style.background  = ''
            inner.innerHTML = `
              <div style="display:flex;flex-direction:column;align-items:center;gap:.5rem;pointer-events:none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32" style="color:var(--cyan);opacity:.7"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span style="font-size:.8rem;font-weight:600;color:var(--text)">Clic o arrastrá tu imagen</span>
                <span style="font-size:.7rem;color:var(--muted)">JPG o PNG</span>
              </div>`
          }, 3000)
          return
        }
        // Mostrar estado de carga prominente
        const zone = document.getElementById('fotoUploadZone')
        const inner = document.getElementById('fotoUploadInner')
        zone.style.minHeight = '140px'
        zone.style.borderColor = 'var(--cyan)'
        zone.style.background = 'rgba(21,154,156,.06)'
        inner.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;gap:.75rem;padding:1.5rem;pointer-events:none">
            <svg viewBox="0 0 24 24" fill="none" stroke="#159A9C" stroke-width="2" width="44" height="44" style="animation:potencSpin .8s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <div style="text-align:center">
              <p style="margin:0;font-size:1rem;font-weight:700;color:var(--cyan);font-family:var(--font-head);letter-spacing:.05em">PROCESANDO IMAGEN</p>
              <p style="margin:.3rem 0 0;font-size:.78rem;color:var(--text)">Cargando modelo RMBG-1.4...</p>
              <p style="margin:.2rem 0 0;font-size:.7rem;color:var(--muted)">${file.name}</p>
            </div>
          </div>`

        const reader = new FileReader()
        reader.onload = e => {
          const img = new Image()
          img.onload = () => {
            fotoOrigImg = img
            // Actualizar mensaje — ahora esperando API
            inner.innerHTML = `
              <div style="display:flex;flex-direction:column;align-items:center;gap:.75rem;padding:1.5rem;pointer-events:none">
                <svg viewBox="0 0 24 24" fill="none" stroke="#159A9C" stroke-width="2" width="44" height="44" style="animation:potencSpin .8s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                <div style="text-align:center">
                  <p style="margin:0;font-size:1rem;font-weight:700;color:var(--cyan);font-family:var(--font-head);letter-spacing:.05em">REMOVIENDO FONDO</p>
                  <p style="margin:.3rem 0 0;font-size:.78rem;color:var(--text)">RMBG-1.4 procesando tu foto...</p>
                  <p style="margin:.2rem 0 0;font-size:.7rem;color:var(--muted)">Alta calidad · 100% local · Sin límites</p>
                </div>
              </div>`
            document.getElementById('fotoPaso2').style.display = 'block'
            fotoRecortarAuto()
          }
          img.onerror = () => {
            zone.style.borderColor = '#f87171'
            zone.style.background = 'rgba(248,113,113,.05)'
            inner.innerHTML = `
              <div style="display:flex;flex-direction:column;align-items:center;gap:.5rem;padding:1.5rem;pointer-events:none">
                <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="1.5" width="36" height="36"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <p style="margin:0;font-size:.85rem;font-weight:600;color:#f87171">Error al cargar la imagen</p>
                <p style="margin:0;font-size:.72rem;color:var(--muted)">Hacé clic para intentar de nuevo</p>
              </div>`
          }
          img.src = e.target.result
        }
        reader.readAsDataURL(file)
      }

      // ── Remoción de fondo: Transformers.js + RMBG-1.4 (100% local, ~45MB modelo) ──
      // Modelo: briaai/RMBG-1.4 — calidad similar a remove.bg, sin API key, sin servidor

      let _rmbgModel     = null   // modelo cargado
      let _rmbgProcessor = null   // procesador cargado
      let _rmbgLoading   = false
      let _rmbgLoaded    = false

      const _TRANSFORMERS_CDNS = [
        'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/dist/transformers.min.js',
        'https://unpkg.com/@huggingface/transformers@3.4.0/dist/transformers.min.js'
      ]

      function _cargarScript(url, timeout = 30000) {
        return new Promise((resolve, reject) => {
          const s = document.createElement('script')
          s.src = url
          const t = setTimeout(() => { s.remove(); reject(new Error('timeout')) }, timeout)
          s.onload  = () => { clearTimeout(t); resolve() }
          s.onerror = () => { clearTimeout(t); s.remove(); reject(new Error('error CDN')) }
          document.head.appendChild(s)
        })
      }

      // Transformers.js se carga como módulo ESM inyectando un <script type="module">
      // que expone AutoModel/AutoProcessor/RawImage en window._tf
      function _inyectarModuloTransformers(onProgress) {
        return new Promise((resolve) => {
          if (window._tf) { resolve(true); return }
          if (onProgress) onProgress('Descargando modelo IA (~45MB, solo la primera vez)...')
          const s = document.createElement('script')
          s.type = 'module'
          // IIFE async — necesario porque await y return desnudos no son válidos en top-level de módulo inyectado
          s.textContent = `(async () => {
            const CDNS = [
              'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0/dist/transformers.min.js',
              'https://unpkg.com/@huggingface/transformers@3.4.0/dist/transformers.min.js'
            ]
            let mod = null
            for (const cdn of CDNS) {
              try { mod = await import(cdn); break } catch(e) { /* probar siguiente */ }
            }
            if (!mod) { window._tfError = true; return }
            const { AutoModel, AutoProcessor, RawImage, env } = mod
            env.allowLocalModels = false
            if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
              env.backends.onnx.wasm.proxy = true
            }
            window._tf = { AutoModel, AutoProcessor, RawImage, env }
          })()`
          // El módulo no dispara onload — usamos poll para detectar window._tf
          document.head.appendChild(s)
          const t = Date.now()
          const poll = setInterval(() => {
            if (window._tf)          { clearInterval(poll); resolve(true)  }
            if (window._tfError)     { clearInterval(poll); resolve(false) }
            if (Date.now()-t > 30000){ clearInterval(poll); resolve(false) }
          }, 200)
        })
      }

      async function cargarBgRemoval(onProgress) {
        if (_rmbgLoaded) return true
        if (_rmbgLoading) {
          return new Promise(res => {
            const check = setInterval(() => {
              if (!_rmbgLoading) { clearInterval(check); res(_rmbgLoaded) }
            }, 300)
          })
        }
        _rmbgLoading = true
        try {
          const ok = await _inyectarModuloTransformers(onProgress)
          if (!ok || !window._tf) throw new Error('No se pudo cargar Transformers.js')

          const { AutoModel, AutoProcessor, env } = window._tf
          if (onProgress) onProgress('Cargando modelo RMBG-1.4...')

          // Silenciar warnings esperados de RMBG-1.4 durante la carga
          const _origWarn = console.warn
          console.warn = (...args) => {
            const msg = args[0] || ''
            if (typeof msg === 'string' && (
              msg.includes('Unknown model class') ||
              msg.includes('dtype not specified') ||
              msg.includes('willReadFrequently')
            )) return
            _origWarn.apply(console, args)
          }
          _rmbgModel = await AutoModel.from_pretrained('briaai/RMBG-1.4', {
            config: { model_type: 'custom' },
            dtype: 'fp32'
          })
          _rmbgProcessor = await AutoProcessor.from_pretrained('briaai/RMBG-1.4', {
            config: {
              do_normalize: true, do_pad: false, do_rescale: true, do_resize: true,
              image_mean: [0.5, 0.5, 0.5], image_std: [1, 1, 1],
              feature_extractor_type: 'ImageFeatureExtractor',
              resample: 2, rescale_factor: 0.00392156862745098,
              size: { width: 1024, height: 1024 }
            }
          })
          console.warn = _origWarn  // restaurar
          _rmbgLoaded = true
          _rmbgLoading = false
          return true
        } catch(e) {
          console.warn('RMBG-1.4 no se pudo cargar:', e)
          _rmbgLoading = false
          return false
        }
      }

      // Pre-procesa la imagen al tamaño óptimo para el modelo (max 1024px)
      function fotoPreprocessBlob(img) {
        const MAX = 1024
        const ratio = Math.min(1, MAX / Math.max(img.width, img.height))
        const w = Math.round(img.width * ratio)
        const h = Math.round(img.height * ratio)
        const tc = document.createElement('canvas')
        tc.width = w; tc.height = h
        const ctx = tc.getContext('2d', { willReadFrequently: true })
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, w, h)
        return new Promise(res => tc.toBlob(res, 'image/png'))
      }

      // Post-procesa el ImageData: pipeline avanzado 6 pasos
      function fotoPostprocess(imageData, origImg) {
        const data = imageData.data
        const w = imageData.width
        const h = imageData.height

        // ── Detectar color del fondo real (sampleo de bordes de la imagen original) ──
        let bgR=200, bgG=200, bgB=200, bgUniform=false
        if (origImg) {
          const sc = document.createElement('canvas')
          sc.width = w; sc.height = h
          const sx = sc.getContext('2d', { willReadFrequently: true })
          sx.drawImage(origImg, 0, 0, w, h)
          const ed = sx.getImageData(0, 0, w, h).data
          const bw = Math.max(4, Math.round(Math.min(w,h)*0.04))
          let sr=0,sg=0,sb=0,sn=0, sr2=0,sg2=0,sb2=0
          for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
            if (x<bw||x>=w-bw||y<bw||y>=h-bw) {
              const i=(y*w+x)*4; sr+=ed[i]; sg+=ed[i+1]; sb+=ed[i+2]; sn++
              sr2+=ed[i]*ed[i]; sg2+=ed[i+1]*ed[i+1]; sb2+=ed[i+2]*ed[i+2]
            }
          }
          if (sn>0) {
            bgR=sr/sn; bgG=sg/sn; bgB=sb/sn
            // Calcular varianza — si es baja, el fondo es uniforme
            const varR=sr2/sn-bgR*bgR, varG=sg2/sn-bgG*bgG, varB=sb2/sn-bgB*bgB
            bgUniform = (varR+varG+varB)/3 < 400  // varianza baja = fondo sólido
          }
        }

        // ── Copiar alpha del modelo como base ──────────────────────────────────
        const alpha = new Uint8Array(w * h)
        for (let i=0;i<w*h;i++) alpha[i]=data[i*4+3]

        // ── Paso 1: Refinar zonas ambiguas usando color del fondo ──────────────
        // Solo si el fondo es uniforme (evita falsos positivos con fondos complejos)
        if (bgUniform && origImg) {
          const sc2 = document.createElement('canvas')
          sc2.width=w; sc2.height=h
          const sx2 = sc2.getContext('2d', { willReadFrequently: true })
          sx2.drawImage(origImg, 0, 0, w, h)
          const orig = sx2.getImageData(0,0,w,h).data
          // Umbral de similitud al fondo: ajusta según uniformidad
          const thr = bgUniform ? 55 : 35
          for (let i=0;i<w*h;i++) {
            const a=alpha[i]
            if (a > 20 && a < 220) {  // zona ambigua
              const r=orig[i*4],g=orig[i*4+1],b=orig[i*4+2]
              const dist=Math.sqrt((r-bgR)**2+(g-bgG)**2+(b-bgB)**2)
              if (dist < thr) {
                // Muy parecido al fondo → transparente, ponderado por similitud y alpha del modelo
                alpha[i] = Math.round(a * Math.max(0, (dist-10)/(thr-10)))
              }
            }
          }
        }

        // ── Paso 2: Binarización suave de extremos ─────────────────────────────
        for (let i=0;i<w*h;i++) {
          if (alpha[i]<20)       alpha[i]=0
          else if (alpha[i]>235) alpha[i]=255
        }

        // ── Paso 3: Flood-fill exterior — elimina fondo conectado al borde ─────
        // Umbral adaptativo: más agresivo si fondo uniforme
        const ffThr = bgUniform ? 100 : 60
        const visited = new Uint8Array(w*h)
        const q = []
        const push = (idx) => { if(!visited[idx] && alpha[idx]<ffThr){visited[idx]=1;q.push(idx)} }
        for (let x=0;x<w;x++) { push(x); push((h-1)*w+x) }
        for (let y=1;y<h-1;y++) { push(y*w); push(y*w+w-1) }
        let qi=0
        while (qi<q.length) {
          const px=q[qi++]; const x=px%w, y=Math.floor(px/w)
          for (const nb of [px-1,px+1,px-w,px+w]) {
            if (nb>=0&&nb<w*h&&!visited[nb]&&alpha[nb]<ffThr){visited[nb]=1;q.push(nb)}
          }
        }
        for (let i=0;i<w*h;i++) if(visited[i]) alpha[i]=0

        // ── Paso 4: Morphological closing — cierra huecos internos pequeños ────
        // Dilación seguida de erosión para rellenar huecos de fondo dentro del sujeto
        const CLOSE_R = 2
        const dilated = new Uint8Array(alpha)
        for (let y=CLOSE_R;y<h-CLOSE_R;y++) for (let x=CLOSE_R;x<w-CLOSE_R;x++) {
          if (alpha[y*w+x]===0) {
            let hasOpaque=false
            outer: for (let dy=-CLOSE_R;dy<=CLOSE_R;dy++) for (let dx=-CLOSE_R;dx<=CLOSE_R;dx++) {
              if (alpha[(y+dy)*w+(x+dx)]>180){hasOpaque=true;break outer}
            }
            if (hasOpaque) dilated[y*w+x]=180  // dilatar
          }
        }
        // Erosión — volver atrás solo los que tienen vecinos opacos reales
        for (let y=CLOSE_R;y<h-CLOSE_R;y++) for (let x=CLOSE_R;x<w-CLOSE_R;x++) {
          if (dilated[y*w+x]===180) {
            let allOpaque=true
            outer2: for (let dy=-CLOSE_R;dy<=CLOSE_R;dy++) for (let dx=-CLOSE_R;dx<=CLOSE_R;dx++) {
              if (dilated[(y+dy)*w+(x+dx)]<100){allOpaque=false;break outer2}
            }
            // Si está rodeado de opacos → rellenar el hueco
            if (allOpaque) alpha[y*w+x]=220
          }
        }

        // ── Paso 5: Erosión de borde (eliminar halo) ──────────────────────────
        const alpha2 = new Uint8Array(alpha)
        for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++) {
          const i=y*w+x
          if (alpha[i]>0&&alpha[i]<255) {
            const mn=Math.min(alpha[i-1],alpha[i+1],alpha[i-w],alpha[i+w])
            if (mn===0) alpha2[i]=Math.round(alpha[i]*0.55)
          }
        }

        // ── Paso 6: Feathering suave de 1px ───────────────────────────────────
        for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++) {
          const i=y*w+x
          if (alpha2[i]>0&&alpha2[i]<255) {
            const sum=alpha2[i]+alpha2[(y-1)*w+x]+alpha2[(y+1)*w+x]+alpha2[y*w+x-1]+alpha2[y*w+x+1]
            alpha2[i]=Math.round(sum/5)
          }
        }

        // Aplicar alpha final
        for (let i=0;i<w*h;i++) data[i*4+3]=alpha2[i]
        return imageData
      }

      // Escala el ImageData recortado de vuelta al tamaño original
      function fotoEscalarResultado(imgData, targetW, targetH) {
        if (imgData.width === targetW && imgData.height === targetH) return imgData
        const src = document.createElement('canvas')
        src.width = imgData.width; src.height = imgData.height
        src.getContext('2d', { willReadFrequently: true }).putImageData(imgData, 0, 0)
        const dst = document.createElement('canvas')
        dst.width = targetW; dst.height = targetH
        const ctx = dst.getContext('2d', { willReadFrequently: true })
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(src, 0, 0, targetW, targetH)
        return ctx.getImageData(0, 0, targetW, targetH)
      }

      // Aplica el ImageData final al compositor
      function fotoAplicarResultado(imgData) {
        fotoRecortada = imgData
        const inner = document.getElementById('fotoUploadInner')
        const zone  = document.getElementById('fotoUploadZone')
        if (inner) {
          zone.style.minHeight = ''
          zone.style.borderColor = 'rgba(21,154,156,.5)'
          zone.style.background = 'rgba(21,154,156,.04)'
          inner.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:.5rem;padding:1rem;pointer-events:none">
              <svg viewBox="0 0 24 24" fill="none" stroke="#4ecca3" stroke-width="2" width="36" height="36"><polyline points="20 6 9 17 4 12"/></svg>
              <p style="margin:0;font-size:.9rem;font-weight:700;color:#4ecca3;font-family:var(--font-head)">¡FONDO REMOVIDO!</p>
              <p style="margin:0;font-size:.72rem;color:var(--muted)">Elegí un fondo y acomodá tu producto</p>
            </div>`
        }
        document.getElementById('fotoCompositor').style.display = 'block'
        // Mantener 1080x1080 si no hay fondo cargado — NO adoptar tamaño de la foto
        if (OUT_W === 0 || OUT_H === 0) { OUT_W = 1080; OUT_H = 1080 }
        // Si no hay fondo imagen seleccionado, resetear a 1080x1080 cuadrado
        if (!fotoBgImg) { OUT_W = 1080; OUT_H = 1080 }
        canvas.width = OUT_W; canvas.height = OUT_H
        // Escalar el producto para que entre bien en el canvas al cargar (~80%)
        const imgRatio = fotoRecortada.width / fotoRecortada.height
        const canvRatio = OUT_W / OUT_H
        if (imgRatio > canvRatio) {
          fotoEscala = (OUT_W * 0.8) / fotoRecortada.width
        } else {
          fotoEscala = (OUT_H * 0.8) / fotoRecortada.height
        }
        // Sincronizar el slider de escala
        const sliderEscala = document.getElementById('fotoEscala')
        if (sliderEscala) {
          sliderEscala.value = Math.round(fotoEscala * 100)
          const valEl = document.getElementById('fotoEscalaVal')
          if (valEl) valEl.textContent = Math.round(fotoEscala * 100) + '%'
        }
        fotoPosX = 0; fotoPosY = 0
        setTimeout(() => { fotoRender() }, 50)
        const btnRec = document.getElementById('fotoBtnRecortar')
        btnRec.textContent = '✂️ Re-recortar'
        btnRec.disabled = false
      }

      async function fotoRecortarConAPI() {
        if (!fotoOrigImg) return
        const errEl  = document.getElementById('fotoError')
        const btnRec = document.getElementById('fotoBtnRecortar')
        errEl.textContent = ''
        btnRec.textContent = '⏳ Iniciando IA...'
        btnRec.disabled = true

        try {
          // Cargar modelo (se descarga ~45MB la primera vez, luego queda en caché del browser)
          const loaded = await cargarBgRemoval((msg) => { btnRec.textContent = '⏳ ' + msg })
          if (!loaded) throw new Error('No se pudo cargar el modelo')

          btnRec.textContent = '⏳ Procesando imagen...'

          // Convertir fotoOrigImg a RawImage para RMBG-1.4
          const tc = document.createElement('canvas')
          tc.width = fotoOrigImg.width; tc.height = fotoOrigImg.height
          tc.getContext('2d', { willReadFrequently: true }).drawImage(fotoOrigImg, 0, 0)
          const dataUrl = tc.toDataURL('image/png')

          const RawImage = window._tf?.RawImage
          const rawImg = await RawImage.fromURL(dataUrl)

          // Procesar con el modelo
          const { pixel_values } = await _rmbgProcessor(rawImg)
          const { output } = await _rmbgModel({ input: pixel_values })

          btnRec.textContent = '⏳ Refinando bordes...'

          // Convertir máscara a ImageData con alpha
          const maskData = output[0].squeeze().tolist()  // valores 0-1
          const maskH    = maskData.length
          const maskW    = maskData[0].length

          // Escalar la imagen original al tamaño de la máscara
          const srcC = document.createElement('canvas')
          srcC.width = maskW; srcC.height = maskH
          const srcCtx = srcC.getContext('2d', { willReadFrequently: true })
          srcCtx.drawImage(fotoOrigImg, 0, 0, maskW, maskH)
          let imgData = srcCtx.getImageData(0, 0, maskW, maskH)
          const pixels = imgData.data

          // Aplicar máscara como canal alpha
          for (let y = 0; y < maskH; y++) {
            for (let x = 0; x < maskW; x++) {
              const i = (y * maskW + x) * 4
              pixels[i + 3] = Math.round(maskData[y][x] * 255)
            }
          }

          // Post-procesar: eliminar fondo residual + suavizar bordes
          imgData = fotoPostprocess(imgData, fotoOrigImg)

          // Escalar de vuelta al tamaño original
          const finalData = fotoEscalarResultado(imgData, fotoOrigImg.width, fotoOrigImg.height)

          fotoAplicarResultado(finalData)

        } catch(err) {
          console.warn('RMBG-1.4 falló, usando fallback Canvas:', err)
          errEl.textContent = '⚠ IA no disponible. Usá el recorte manual con la barra de tolerancia.'
          document.getElementById('fotoTolRow').style.display = 'flex'
          fotoRecortarFallback()
          btnRec.textContent = '✂️ Re-recortar'
          btnRec.disabled = false
        }
      }

      // Fallback: algoritmo Canvas por si falla la API
      function fotoRecortarFallback() {
        if (!fotoOrigImg) return
        const tol = parseInt(document.getElementById('fotoTolerancia').value) || 50
        const MAX = 1000
        const ratio = Math.min(1, MAX / Math.max(fotoOrigImg.width, fotoOrigImg.height))
        const w = Math.round(fotoOrigImg.width * ratio)
        const h = Math.round(fotoOrigImg.height * ratio)
        const tc = document.createElement('canvas'); tc.width = w; tc.height = h
        const tx = tc.getContext('2d', { willReadFrequently: true })
        tx.drawImage(fotoOrigImg, 0, 0, w, h)
        const imgData = tx.getImageData(0, 0, w, h)
        const data = imgData.data, orig = new Uint8ClampedArray(data)
        const borderW = Math.max(3, Math.round(Math.min(w,h)*0.04))
        const samples = []
        for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
          if (x<borderW||x>=w-borderW||y<borderW||y>=h-borderW) {
            const i=(y*w+x)*4; samples.push([orig[i],orig[i+1],orig[i+2]])
          }
        }
        const n=samples.length
        const mR=samples.reduce((s,p)=>s+p[0],0)/n
        const mG=samples.reduce((s,p)=>s+p[1],0)/n
        const mB=samples.reduce((s,p)=>s+p[2],0)/n
        const std=Math.max(15,Math.sqrt(samples.reduce((s,p)=>s+(p[0]-mR)**2+(p[1]-mG)**2+(p[2]-mB)**2,0)/(n*3)))
        const threshold=(tol/100)*std*5
        const mask=new Uint8Array(w*h)
        const q=new Int32Array(w*h*2); let qH=0,qT=0
        for(let x=0;x<w;x++){q[qT++]=x;mask[x]=1;q[qT++]=(h-1)*w+x;mask[(h-1)*w+x]=1}
        for(let y=1;y<h-1;y++){q[qT++]=y*w;mask[y*w]=1;q[qT++]=y*w+w-1;mask[y*w+w-1]=1}
        while(qH<qT){
          const px=q[qH++]; const x=px%w,y=Math.floor(px/w)
          for(const nb of[px-1,px+1,px-w,px+w]){
            if(nb<0||nb>=w*h||mask[nb])continue
            const dr=orig[nb*4]-mR,dg=orig[nb*4+1]-mG,db=orig[nb*4+2]-mB
            if(Math.sqrt(dr*dr+dg*dg+db*db)<threshold){mask[nb]=1;q[qT++]=nb}
            else mask[nb]=2
          }
        }
        for(let i=0;i<w*h;i++) if(mask[i]===1) data[i*4+3]=0
        fotoRecortada=imgData
        document.getElementById('fotoCompositor').style.display='block'
        if (OUT_W === 0 || OUT_H === 0) { OUT_W = 1080; OUT_H = 1080 }
        canvas.width = OUT_W; canvas.height = OUT_H
        fotoPosX=0;fotoPosY=0
        setTimeout(() => { fotoRender() }, 50)
      }

      function fotoRecortarAuto() {
        fotoRecortarConAPI()
      }

      // ── Render compositor ─────────────────────────────────────────
      // OUT_W/OUT_H = tamaño final de exportación
      // El canvas siempre muestra el fondo a tamaño completo, sin bordes
      let OUT_W = 1080, OUT_H = 1080
      let fotoBgColor = null   // null = usar imagen, string = color sólido

      canvas.width = OUT_W; canvas.height = OUT_H

      function fotoSetSize(w, h) {
        OUT_W = w; OUT_H = h
        // Si hay fondo imagen, ajustar el canvas a ese ratio recortando/escalando
        if (fotoBgImg) {
          // Mantener el tamaño elegido, el fondo se estira para cubrir (cover)
          canvas.width = w; canvas.height = h
        } else {
          canvas.width = w; canvas.height = h
        }
        fotoRender()
      }

      // Cuando se selecciona una imagen de fondo, ajustar OUT_W/OUT_H a su resolución natural
      function fotoSetBgImg(img) {
        fotoBgImg = img; fotoBgColor = null
        // Por defecto adoptar el tamaño de la imagen de fondo
        OUT_W = img.width; OUT_H = img.height
        canvas.width = OUT_W; canvas.height = OUT_H
        // Sync size buttons — ninguno queda activo si el tamaño no coincide
        document.querySelectorAll('.foto-size-btn').forEach(b => {
          const match = b.dataset.w == OUT_W && b.dataset.h == OUT_H
          b.classList.toggle('foto-size-btn--active', match)
        })
        fotoRender()
      }

      // Size buttons
      document.querySelectorAll('.foto-size-btn:not(#fotoSizeLibre)').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.foto-size-btn').forEach(b => b.classList.remove('foto-size-btn--active'))
          btn.classList.add('foto-size-btn--active')
          document.getElementById('fotoSizeLibrePanel').style.display = 'none'
          fotoSetSize(parseInt(btn.dataset.w), parseInt(btn.dataset.h))
        })
      })
      document.getElementById('fotoSizeLibre').addEventListener('click', () => {
        document.querySelectorAll('.foto-size-btn').forEach(b => b.classList.remove('foto-size-btn--active'))
        document.getElementById('fotoSizeLibre').classList.add('foto-size-btn--active')
        document.getElementById('fotoSizeLibrePanel').style.display = 'flex'
        // Pre-cargar con tamaño actual
        document.getElementById('fotoLibreW').value = OUT_W
        document.getElementById('fotoLibreH').value = OUT_H
      })
      document.getElementById('fotoBtnAplicarSize').addEventListener('click', () => {
        const w = Math.max(100, Math.min(4000, parseInt(document.getElementById('fotoLibreW').value)||1080))
        const h = Math.max(100, Math.min(4000, parseInt(document.getElementById('fotoLibreH').value)||1080))
        fotoSetSize(w, h)
      })

      // Tabs imagen/color
      window.fotoSwitchTab = function(tab) {
        const isImagen = tab === 'imagen'
        document.getElementById('fotoPanelImagen').style.display = isImagen ? 'block' : 'none'
        document.getElementById('fotoPanelColor').style.display  = isImagen ? 'none'  : 'block'
        document.getElementById('fotoTabImagen').classList.toggle('foto-tab--active', isImagen)
        document.getElementById('fotoTabColor').classList.toggle('foto-tab--active', !isImagen)
        if (!isImagen) { fotoBgColor = fotoBgColor || '#ffffff'; fotoBgImg = null }
        else            { fotoBgColor = null }
        fotoRender()
      }

      // Color presets
      document.getElementById('fotoColorPresets').addEventListener('click', e => {
        const btn = e.target.closest('.foto-color-swatch')
        if (!btn) return
        document.querySelectorAll('.foto-color-swatch').forEach(b => b.classList.remove('foto-color-swatch--active'))
        btn.classList.add('foto-color-swatch--active')
        fotoBgColor = btn.dataset.color
        document.getElementById('fotoColorCustom').value = fotoBgColor
        fotoBgImg = null
        fotoRender()
      })
      document.getElementById('fotoColorCustom').addEventListener('input', function() {
        document.querySelectorAll('.foto-color-swatch').forEach(b => b.classList.remove('foto-color-swatch--active'))
        fotoBgColor = this.value
        fotoBgImg = null
        fotoRender()
      })

      function fotoRender() {
        if (!fotoRecortada) return

        // ── Leer todos los ajustes ────────────────────────────────────
        const brillo      = parseInt(document.getElementById('fotoBrillo')?.value     || 0)
        const contraste   = parseInt(document.getElementById('fotoContraste')?.value  || 0)
        const saturacion  = parseInt(document.getElementById('fotoSaturacion')?.value || 0)
        const tinte       = parseInt(document.getElementById('fotoTinte')?.value      || 0) / 100  // -0.4 a +0.4
        const bordes      = parseInt(document.getElementById('fotoBordes')?.value     || 0)
        const opacidad    = parseInt(document.getElementById('fotoOpacidad')?.value   || 100) / 100
        const sombraOpac  = parseInt(document.getElementById('fotoSombraOpac')?.value || 0) / 100
        const sombraBlur  = parseInt(document.getElementById('fotoSombraBlur')?.value || 20)
        const sombraOff   = parseInt(document.getElementById('fotoSombraOff')?.value  || 10)
        const vignet      = parseInt(document.getElementById('fotoVignet')?.value     || 0) / 100
        const bgBlur      = parseInt(document.getElementById('fotoBgBlur')?.value     || 0)

        ctx.clearRect(0, 0, OUT_W, OUT_H)

        // ── Fondo con desenfoque opcional ─────────────────────────────
        ctx.save()
        if (bgBlur > 0) ctx.filter = `blur(${bgBlur}px)`
        if (fotoBgColor) {
          ctx.fillStyle = fotoBgColor
          ctx.fillRect(0, 0, OUT_W, OUT_H)
        } else if (fotoBgImg) {
          const bRatio = fotoBgImg.width / fotoBgImg.height
          const cRatio = OUT_W / OUT_H
          let sx = 0, sy = 0, sw = fotoBgImg.width, sh = fotoBgImg.height
          if (bRatio > cRatio) { sw = fotoBgImg.height * cRatio; sx = (fotoBgImg.width - sw) / 2 }
          else                 { sh = fotoBgImg.width / cRatio;  sy = (fotoBgImg.height - sh) / 2 }
          ctx.drawImage(fotoBgImg, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H)
        } else {
          ctx.fillStyle = '#e8e8e8'; ctx.fillRect(0, 0, OUT_W, OUT_H)
        }
        ctx.filter = 'none'
        ctx.restore()

        // ── Extraer color promedio del fondo para tinte ambiental ─────
        let tintR = 128, tintG = 128, tintB = 128
        if (tinte !== 0 && (fotoBgImg || fotoBgColor)) {
          if (fotoBgColor) {
            const hex = fotoBgColor.replace('#','')
            tintR = parseInt(hex.slice(0,2),16) || 0
            tintG = parseInt(hex.slice(2,4),16) || 0
            tintB = parseInt(hex.slice(4,6),16) || 0
          } else {
            // Samplear esquinas del fondo (evitar el centro donde puede estar el producto)
            const pts = [[10,10],[OUT_W-60,10],[10,OUT_H-60],[OUT_W-60,OUT_H-60]]
            let sr=0,sg=0,sb=0,sn=0
            pts.forEach(function(pt) { var px=pt[0],py=pt[1];
              try {
                const s = ctx.getImageData(px, py, 50, 50).data
                for(let i=0;i<s.length;i+=4){sr+=s[i];sg+=s[i+1];sb+=s[i+2];sn++}
              } catch(e){}
            })
            if (sn > 0) { tintR=sr/sn; tintG=sg/sn; tintB=sb/sn }
          }
        }

        // ── Preparar producto con ajustes de imagen ───────────────────
        const tmp = document.createElement('canvas')
        tmp.width = fotoRecortada.width; tmp.height = fotoRecortada.height
        const tmpCtx = tmp.getContext('2d', { willReadFrequently: true })
        tmpCtx.putImageData(fotoRecortada, 0, 0)

        // Aplicar brillo/contraste/saturación/tinte via pixel manipulation
        if (brillo !== 0 || contraste !== 0 || saturacion !== 0 || tinte !== 0) {
          const imgd = tmpCtx.getImageData(0, 0, tmp.width, tmp.height)
          const d    = imgd.data
          const cf   = contraste !== 0 ? (259*(contraste+255))/(255*(259-contraste)) : 1
          for (let i = 0; i < d.length; i += 4) {
            if (d[i+3] === 0) continue
            let r = d[i], g = d[i+1], b = d[i+2]
            // Brillo — clamp inmediato
            if (brillo !== 0) {
              r = Math.max(0, Math.min(255, r + brillo))
              g = Math.max(0, Math.min(255, g + brillo))
              b = Math.max(0, Math.min(255, b + brillo))
            }
            // Contraste — clamp inmediato
            if (contraste !== 0) {
              r = Math.max(0, Math.min(255, cf*(r-128)+128))
              g = Math.max(0, Math.min(255, cf*(g-128)+128))
              b = Math.max(0, Math.min(255, cf*(b-128)+128))
            }
            // Saturación — clamp inmediato
            if (saturacion !== 0) {
              const gray = 0.299*r + 0.587*g + 0.114*b
              const sf   = 1 + saturacion/100
              r = Math.max(0, Math.min(255, gray + sf*(r-gray)))
              g = Math.max(0, Math.min(255, gray + sf*(g-gray)))
              b = Math.max(0, Math.min(255, gray + sf*(b-gray)))
            }
            // Tinte ambiental — mezcla el color del fondo al producto
            if (tinte > 0) {
              r = r*(1-tinte) + tintR*tinte
              g = g*(1-tinte) + tintG*tinte
              b = b*(1-tinte) + tintB*tinte
            }
            d[i]   = Math.max(0, Math.min(255, r))
            d[i+1] = Math.max(0, Math.min(255, g))
            d[i+2] = Math.max(0, Math.min(255, b))
          }
          tmpCtx.putImageData(imgd, 0, 0)
        }

        // ── Posición y transformaciones ───────────────────────────────
        const prodW = tmp.width  * fotoEscala
        const prodH = tmp.height * fotoEscala
        const cx    = OUT_W / 2 + fotoPosX
        const cy    = OUT_H / 2 + fotoPosY

        // ── Sombra proyectada ─────────────────────────────────────────
        if (sombraOpac > 0) {
          // Crear silhoueta negra del producto
          const shadowC = document.createElement('canvas')
          shadowC.width = fotoRecortada.width; shadowC.height = fotoRecortada.height
          const sCtx = shadowC.getContext('2d', { willReadFrequently: true })
          sCtx.putImageData(fotoRecortada, 0, 0)
          // Colorear todo negro manteniendo alpha
          sCtx.globalCompositeOperation = 'source-in'
          sCtx.fillStyle = 'rgba(0,0,0,1)'
          sCtx.fillRect(0, 0, shadowC.width, shadowC.height)

          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(fotoRot * Math.PI / 180)
          ctx.globalAlpha = sombraOpac
          ctx.filter = `blur(${sombraBlur}px)`
          // Desplazar hacia abajo y un poco a la derecha
          ctx.drawImage(shadowC, -prodW/2 + sombraOff*0.3, -prodH/2 + sombraOff, prodW, prodH)
          ctx.filter = 'none'
          ctx.globalAlpha = 1
          ctx.restore()
        }

        // ── Producto con suavizado de bordes y opacidad ───────────────
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(fotoRot * Math.PI / 180)
        ctx.globalAlpha = opacidad
        if (bordes > 0) {
          // Suavizar bordes con gradiente en máscara
          const offC = document.createElement('canvas')
          offC.width = prodW + bordes*2; offC.height = prodH + bordes*2
          const offCtx = offC.getContext('2d', { willReadFrequently: true })
          offCtx.drawImage(tmp, bordes, bordes, prodW, prodH)
          // Aplicar blur para suavizar contorno
          const blurC = document.createElement('canvas')
          blurC.width = prodW; blurC.height = prodH
          const blurCtx = blurC.getContext('2d', { willReadFrequently: true })
          blurCtx.filter = `blur(${bordes}px)`
          blurCtx.drawImage(offC, -bordes, -bordes)
          blurCtx.filter = 'none'
          ctx.drawImage(blurC, -prodW/2, -prodH/2)
        } else {
          ctx.drawImage(tmp, -prodW/2, -prodH/2, prodW, prodH)
        }
        ctx.globalAlpha = 1
        ctx.restore()

        // ── Viñeta sobre todo ─────────────────────────────────────────
        if (vignet > 0) {
          const grad = ctx.createRadialGradient(
            OUT_W/2, OUT_H/2, Math.min(OUT_W,OUT_H)*0.3,
            OUT_W/2, OUT_H/2, Math.max(OUT_W,OUT_H)*0.8
          )
          grad.addColorStop(0, 'rgba(0,0,0,0)')
          grad.addColorStop(1, `rgba(0,0,0,${vignet})`)
          ctx.fillStyle = grad
          ctx.fillRect(0, 0, OUT_W, OUT_H)
        }
      }

      // ── Controles sliders ─────────────────────────────────────────
      document.getElementById('fotoEscala').addEventListener('input', function() {
        fotoEscala = parseInt(this.value) / 100
        document.getElementById('fotoEscalaVal').textContent = this.value + '%'
        fotoRender()
      })
      document.getElementById('fotoRotacion').addEventListener('input', function() {
        fotoRot = parseInt(this.value)
        document.getElementById('fotoRotVal').textContent = this.value + '°'
        fotoRender()
      })
      document.getElementById('fotoTolerancia').addEventListener('input', function() {
        document.getElementById('fotoTolVal').textContent = this.value
      })
      // Nuevos ajustes — todos llaman fotoRender al cambiar
      ;[
        ['fotoBrillo','fotoBrilloVal',''],
        ['fotoContraste','fotoContrasteVal',''],
        ['fotoSaturacion','fotoSaturacionVal',''],
        ['fotoTinte','fotoTinteVal','%'],
        ['fotoBordes','fotoBordesVal','px'],
        ['fotoOpacidad','fotoOpacidadVal','%'],
        ['fotoSombraOpac','fotoSombraOpacVal','%'],
        ['fotoSombraBlur','fotoSombraBlurVal','px'],
        ['fotoSombraOff','fotoSombraOffVal','px'],
        ['fotoVignet','fotoVignetVal','%'],
        ['fotoBgBlur','fotoBgBlurVal','px'],
      ].forEach(function(p) { var id=p[0],valId=p[1],suffix=p[2],showSign=p[3];
        const el = document.getElementById(id)
        if (!el) return
        el.addEventListener('input', function() {
          const v = parseInt(this.value)
          const label = showSign && v > 0 ? '+' + v + suffix : v + suffix
          document.getElementById(valId).textContent = label
          fotoRender()
        })
      })

      // ── Drag para mover el producto ───────────────────────────────
      canvas.addEventListener('mousedown', e => {
        fotoDragging = true
        const r = canvas.getBoundingClientRect()
        const scaleX = OUT_W / r.width
        fotoDragStartX = e.clientX * scaleX - fotoPosX
        fotoDragStartY = e.clientY * scaleX - fotoPosY
        canvas.style.cursor = 'grabbing'
      })
      canvas.addEventListener('mousemove', e => {
        if (!fotoDragging) return
        const r = canvas.getBoundingClientRect()
        const scaleX = OUT_W / r.width
        fotoPosX = e.clientX * scaleX - fotoDragStartX
        fotoPosY = e.clientY * scaleX - fotoDragStartY
        fotoRender()
      })
      canvas.addEventListener('mouseup',    () => { fotoDragging = false; canvas.style.cursor = 'grab' })
      canvas.addEventListener('mouseleave', () => { fotoDragging = false; canvas.style.cursor = 'grab' })

      // Touch drag
      canvas.addEventListener('touchstart', e => {
        const t = e.touches[0]
        fotoDragging = true
        const r = canvas.getBoundingClientRect()
        const scaleX = OUT_W / r.width
        fotoDragStartX = t.clientX * scaleX - fotoPosX
        fotoDragStartY = t.clientY * scaleX - fotoPosY
        e.preventDefault()
      }, { passive: false })
      canvas.addEventListener('touchmove', e => {
        if (!fotoDragging) return
        const t = e.touches[0]
        const r = canvas.getBoundingClientRect()
        const scaleX = OUT_W / r.width
        fotoPosX = t.clientX * scaleX - fotoDragStartX
        fotoPosY = t.clientY * scaleX - fotoDragStartY
        fotoRender(); e.preventDefault()
      }, { passive: false })
      canvas.addEventListener('touchend', () => { fotoDragging = false })

      // Ruedita para escalar
      canvas.addEventListener('wheel', e => {
        e.preventDefault()
        fotoEscala = Math.max(0.05, Math.min(3, fotoEscala - e.deltaY * 0.001))
        document.getElementById('fotoEscala').value = Math.round(fotoEscala * 100)
        document.getElementById('fotoEscalaVal').textContent = Math.round(fotoEscala * 100) + '%'
        fotoRender()
      }, { passive: false })

      // Doble clic para centrar
      canvas.addEventListener('dblclick', () => {
        fotoPosX = 0; fotoPosY = 0
        document.getElementById('fotoRotacion').value = 0
        fotoRot = 0
        document.getElementById('fotoRotVal').textContent = '0°'
        fotoRender()
      })

      // ── Botones ───────────────────────────────────────────────────
      document.getElementById('fotoBtnRecortar').addEventListener('click', fotoRecortarConAPI)
      document.getElementById('fotoBtnCentrar').addEventListener('click', () => {
        fotoPosX = 0; fotoPosY = 0; fotoRender()
      })
      document.getElementById('fotoBtnDescargar').addEventListener('click', () => {
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          window.dlCheck('fotoproducto', function(){
            a.href = url; a.download = 'foto-producto-lamadriguera.png'; a.click()
            if(window.trackDescarga) trackDescarga('fotoproducto')
          })
        }, 'image/png')
      })
      document.getElementById('fotoBtnNueva').addEventListener('click', () => {
        fotoOrigImg = null; fotoRecortada = null; fotoBgColor = null
        fileInput.value = ''
        document.getElementById('fotoPaso2').style.display = 'none'
        document.getElementById('fotoCompositor').style.display = 'none'
        document.getElementById('fotoError').textContent = ''
        document.getElementById('fotoRotacion').value = 0
        document.getElementById('fotoEscala').value = 80
        document.getElementById('fotoTolRow').style.display = 'none'
        fotoEscala = 0.8; fotoRot = 0; fotoPosX = 0; fotoPosY = 0
        // Reset tabs
        fotoSwitchTab('imagen')
        document.getElementById('fotoTabImagen').classList.add('foto-tab--active')
        document.getElementById('fotoTabColor').classList.remove('foto-tab--active')
        // Reset ajustes
        ;[['fotoBrillo',0],['fotoContraste',0],['fotoSaturacion',0],['fotoTinte',0],
          ['fotoBordes',0],['fotoOpacidad',100],['fotoSombraOpac',0],['fotoSombraBlur',20],
          ['fotoSombraOff',10],['fotoVignet',0],['fotoBgBlur',0]
        ].forEach(function(p) { var id=p[0],val=p[1]; var el=document.getElementById(id); if(el) el.value=val })
        ;[['fotoBrilloVal','0'],['fotoContrasteVal','0'],['fotoSaturacionVal','0'],
          ['fotoTinteVal','0%'],['fotoBordesVal','0px'],['fotoOpacidadVal','100%'],
          ['fotoSombraOpacVal','0%'],['fotoSombraBlurVal','20px'],['fotoSombraOffVal','10px'],
          ['fotoVignetVal','0%'],['fotoBgBlurVal','0px']
        ].forEach(function(p) { var id=p[0],val=p[1]; var el=document.getElementById(id); if(el) el.textContent=val })
        fotoSetSize(1080, 1080)
        document.querySelectorAll('.foto-size-btn').forEach(b => b.classList.remove('foto-size-btn--active'))
        document.querySelector('.foto-size-btn[data-w="1080"][data-h="1080"]').classList.add('foto-size-btn--active')
        ctx.clearRect(0, 0, OUT_W, OUT_H)
      })

      // Cargar fondos al abrir el modal
      document.getElementById('modal-fotoproducto').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-fotoproducto') && fotoFondos.length === 0) cargarFotoFondos()
      })
      // También cargar al abrir via abrirEmprendedor
      const _origAbrirEmpr = window.abrirEmprendedor
      window.abrirEmprendedor = function(id) {
        _origAbrirEmpr(id)
        if (id === 'modal-fotoproducto' && fotoFondos.length === 0) cargarFotoFondos()
      }

    })()


    // Fijar fecha de hoy por defecto
    document.getElementById('presFecha').value = new Date().toISOString().split('T')[0]

    // ── Logo upload ───────────────────────────────────────────────────
    let presLogoImg = null
    const presLogoZone = document.getElementById('presLogoZone')
    const presLogoFile = document.getElementById('presLogoFile')
    presLogoZone.addEventListener('click', e => { if (!e.target.closest('#presLogoQuitar')) presLogoFile.click() })
    presLogoFile.addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        const img = new Image()
        img.onload = () => {
          presLogoImg = img
          document.getElementById('presLogoPreview').src = ev.target.result
          document.getElementById('presLogoPreview').style.display = 'block'
          document.getElementById('presLogoInner').style.display = 'none'
          document.getElementById('presLogoQuitar').style.display = 'inline-block'
        }
        img.src = ev.target.result
      }
      reader.readAsDataURL(file)
    })
    document.getElementById('presLogoQuitar').addEventListener('click', e => {
      e.stopPropagation()
      presLogoImg = null; presLogoFile.value = ''
      document.getElementById('presLogoPreview').style.display = 'none'
      document.getElementById('presLogoQuitar').style.display = 'none'
      document.getElementById('presLogoInner').style.display = 'flex'
    })

    // ── Ítems dinámicos ───────────────────────────────────────────────
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


    // Productos primero, después sesión y makers — orden importa para el CTA
    ;(async () => {
      await Promise.all([cargarProductos(), cargarTematicas()])
      await verificarSesionUsuario()
      // Cargar en paralelo todo lo que puede ir junto
      await Promise.all([
        cargarTendOcultas(),
        cargarMakers(),
      ])
      // Cargar tendencias sin bloquear — no es crítico para el render inicial
      cargarMakerworld()
      // ── MAKERWORLD TRENDING ─────────────────────────────────────────────
    })()

    // ── GESTIÓN HERRAMIENTAS (admin) ────────────────────────────────────
    ;(function() {
      // Config: tool id, display name, modal id
      var TOOLS = [
        {id:'stl',      label:'Cuadros 2D',        modal:'modal-stl'},
        {id:'llavero',  label:'Llaveros con nombre',modal:'modal-llavero'},
        {id:'caja',     label:'Caja con tapa',      modal:'modal-caja'},
        {id:'maceta',   label:'Macetas',      modal:'modal-maceta'},
        {id:'marco',    label:'Marco / Porta-foto', modal:'modal-marco'},
        {id:'cortante', label:'Cortantes', modal:'modal-cortante'},
      ]
      // ── Orden Laboratorio 3D — Supabase ──────────────────────────
      function parseOrder(json, tools) {
        try {
          var order = JSON.parse(json)
          if (order.length === tools.length && order.every(function(id){ return tools.find(function(t){return t.id===id}) })) {
            return order.map(function(id){ return tools.find(function(t){return t.id===id}) })
          }
        } catch(e) {}
        return null
      }
      function loadOrder() { return TOOLS.slice() }  // default; overridden after async load
      async function loadOrderFromSupabase() {
        try {
          var res = await supabase.from('media').select('nombre').eq('tipo','herramientas-order').maybeSingle()
          if (res.data && res.data.nombre) {
            var parsed = parseOrder(res.data.nombre, TOOLS)
            if (parsed) { currentOrder = parsed; applyOrder(parsed) }
          }
        } catch(e) { console.warn('loadOrderFromSupabase:', e) }
      }
      async function saveOrder(orderedIds) {
        try {
          var json = JSON.stringify(orderedIds)
          await supabase.from('media').delete().eq('tipo','herramientas-order')
          await supabase.from('media').insert([{tipo:'herramientas-order',url:'',nombre:json}])
        } catch(e) { console.warn('saveOrder:', e) }
      }

      // Apply order to the grid
      function applyOrder(tools) {
        var grid = document.querySelector('.herramientas-grid')
        if (!grid) return
        tools.forEach(function(tool) {
          var card = grid.querySelector('[data-tool="' + tool.id + '"]')
          if (card) grid.appendChild(card)
        })
      }

      // Add data-tool attribute to each card
      function tagCards() {
        TOOLS.forEach(function(tool) {
          var card = document.querySelector('#hcard-visual-' + tool.id)
          if (card) card.closest('.herramienta-card').setAttribute('data-tool', tool.id)
        })
      }

      // Init on load
      tagCards()
      var currentOrder = TOOLS.slice()
      var dragSrc = null
      setTimeout(loadOrderFromSupabase, 300)

      window.abrirGestionHerramientas = function() {
        renderLista()
        renderEmprLista()
        var modal = document.getElementById('modal-gestion-herramientas')
        modal.style.display = 'flex'
        modal.style.alignItems = 'center'
        modal.style.justifyContent = 'center'
      }
      window.cerrarGestionHerramientas = function() {
        document.getElementById('modal-gestion-herramientas').style.display = 'none'
      }

      function renderLista() {
        var lista = document.getElementById('gestion-herramientas-lista')
        lista.innerHTML = ''
        currentOrder.forEach(function(tool, idx) {
          var img = (document.querySelector('#hcard-visual-' + tool.id + ' img') || {}).src || ''
          var row = document.createElement('div')
          row.setAttribute('draggable', 'true')
          row.setAttribute('data-tool-id', tool.id)
          row.style.cssText = [
            'display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem',
            'background:var(--bg-card,#0a2535);border:1px solid rgba(21,154,156,0.2)',
            'border-radius:8px;cursor:grab;user-select:none;transition:opacity 0.15s'
          ].join(';')

          // Drag handle
          row.innerHTML = [
            '<span style="color:var(--muted);font-size:1.2rem;cursor:grab">⠿</span>',
            '<div style="width:72px;height:48px;border-radius:6px;overflow:hidden;flex-shrink:0;',
              'background:#001520;border:1px solid rgba(21,154,156,0.2);cursor:pointer" ',
              'onclick="gestionEditarImg(\'' + tool.id + '\')" title="Cambiar imagen">',
              img ? '<img src="' + img + '" style="width:100%;height:100%;object-fit:cover">' :
                    '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:0.7rem;text-align:center">Sin<br>imagen</div>',
            '</div>',
            '<div style="flex:1">',
              '<p style="margin:0;font-weight:600;color:var(--cyan)">' + tool.label + '</p>',
              '<p style="margin:0;font-size:0.75rem;color:var(--muted)">Clic para cambiar URL de portada</p>',
            '</div>',
            '<span style="color:var(--muted);font-size:0.8rem">#' + (idx+1) + '</span>'
          ].join('')

          // Drag events
          row.addEventListener('dragstart', function(e) {
            dragSrc = row
            e.dataTransfer.effectAllowed = 'move'
            setTimeout(function(){ row.style.opacity = '0.4' }, 0)
          })
          row.addEventListener('dragend', function() { row.style.opacity = '1' })
          row.addEventListener('dragover', function(e) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            var rct = row.getBoundingClientRect()
            var mid = rct.top + rct.height/2
            if (dragSrc && dragSrc !== row) {
              if (e.clientY < mid) lista.insertBefore(dragSrc, row)
              else lista.insertBefore(dragSrc, row.nextSibling)
            }
          })

          // Touch drag support
          var touchStartY = 0
          row.addEventListener('touchstart', function(e) {
            dragSrc = row; touchStartY = e.touches[0].clientY
            row.style.opacity = '0.4'
          }, {passive:true})
          row.addEventListener('touchmove', function(e) {
            e.preventDefault()
            var y = e.touches[0].clientY
            var rows = Array.from(lista.children)
            rows.forEach(function(r) {
              var rct = r.getBoundingClientRect()
              if (r !== dragSrc && y > rct.top && y < rct.bottom) {
                if (y < rct.top + rct.height/2) lista.insertBefore(dragSrc, r)
                else lista.insertBefore(dragSrc, r.nextSibling)
              }
            })
          }, {passive:false})
          row.addEventListener('touchend', function() { row.style.opacity = '1'; syncOrderFromDOM() })

          lista.appendChild(row)
        })
      }

      function syncOrderFromDOM() {
        var lista = document.getElementById('gestion-herramientas-lista')
        var rows = Array.from(lista.children)
        currentOrder = rows.map(function(r) {
          var id = r.getAttribute('data-tool-id')
          return TOOLS.find(function(t){ return t.id === id })
        }).filter(Boolean)
        // Update index labels
        rows.forEach(function(r, i) {
          var lbl = r.querySelector('span:last-child')
          if (lbl) lbl.textContent = '#' + (i+1)
        })
      }

      window.guardarOrdenHerramientas = async function() {
        syncOrderFromDOM()
        var ids = currentOrder.map(function(t){ return t.id })
        applyOrder(currentOrder)
        syncEmprOrderFromDOM()
        // También guardar orden de tarjetas si cambió
        const tarjList = document.getElementById('tarjOrdenListGestion')
        if (tarjList && typeof tarjGuardarOrden === 'function') {
          const items = tarjList.querySelectorAll('[data-nombre]')
          if (items.length) {
            const newOrder = []
            items.forEach(el => {
              const d = TARJ_DISENOS.find(x => x.nombre === el.getAttribute('data-nombre'))
              if (d) newOrder.push(d)
            })
            newOrder.forEach((d,i) => TARJ_DISENOS[i] = d)
            tarjGuardarOrden()
          }
        }
        await Promise.all([saveOrder(ids), saveEmprOrder(emprCurrentOrder.map(function(t){return t.id}))])
        cerrarGestionHerramientas()
        var bar = document.getElementById('adminBar')
        if (bar) {
          var msg = document.createElement('span')
          msg.style.cssText = 'color:#4ecca3;font-size:0.8rem;margin-left:0.5rem'
          msg.textContent = '✓ Orden guardado'
          bar.appendChild(msg)
          setTimeout(function(){ msg.remove() }, 2500)
        }
      }

      // Edit image from gestión modal (Laboratorio 3D)
      window.gestionEditarImg = function(toolId) {
        var overlay = document.getElementById('hcard-edit-' + toolId)
        if (overlay) overlay.style.display = 'flex'
        window.herramientaEditImg(toolId)
        var checkDone = function() {
          renderLista()
          if (!esAdmin && overlay) overlay.style.display = 'none'
        }
        setTimeout(checkDone, 500)
        setTimeout(checkDone, 2000)
        setTimeout(checkDone, 4000)
      }

      // ── EMPRENDEDORES: orden + portada ────────────────────────────
      // EMPR_TOOLS — se construye dinámicamente desde el DOM para incluir nuevas herramientas automáticamente
      var EMPR_TOOLS = [
        {id:'tarjetas',      label:'Tarjetas de agradecimiento'},
        {id:'fotoproducto',  label:'Cambiar fondo de producto'},
        {id:'presupuesto',   label:'Generador de presupuestos'},
        {id:'mejora',        label:'Mejorador de imágenes'},
        {id:'costos',        label:'Calculadora de costos'},
        {id:'cajas',         label:'Cajas ensamblables'},
      ]
      var EMPR_IMG_KEY = 'empr-img-'

      function loadEmprOrder() { return EMPR_TOOLS.slice() }  // default
      async function loadEmprOrderFromSupabase() {
        try {
          var res = await supabase.from('media').select('nombre').eq('tipo','empr-order').maybeSingle()
          if (res.data && res.data.nombre) {
            var order = JSON.parse(res.data.nombre)
            // Filtrar solo ids que existen actualmente, agregar los nuevos al final
            var validOrder = order.filter(function(id){ return EMPR_TOOLS.find(function(t){return t.id===id}) })
            EMPR_TOOLS.forEach(function(t){ if (!validOrder.includes(t.id)) validOrder.push(t.id) })
            var parsed = validOrder.map(function(id){ return EMPR_TOOLS.find(function(t){return t.id===id}) }).filter(Boolean)
            emprCurrentOrder = parsed
            applyEmprOrder(parsed)
          }
        } catch(e) { console.warn('loadEmprOrderFromSupabase:', e) }
      }
      async function saveEmprOrder(ids) {
        try {
          await supabase.from('media').delete().eq('tipo','empr-order')
          await supabase.from('media').insert([{tipo:'empr-order',url:'',nombre:JSON.stringify(ids)}])
        } catch(e) { console.warn('saveEmprOrder:', e) }
      }

      function applyEmprOrder(tools) {
        var grid = document.querySelector('.emprendedores-grid')
        if (!grid) return
        tools.forEach(function(tool) {
          var card = grid.querySelector('[data-empr-id="' + tool.id + '"]')
          if (card) grid.appendChild(card)
        })
      }

      // Apply saved order on load (async from Supabase)
      var emprCurrentOrder = EMPR_TOOLS.slice()
      var emprDragSrc = null
      setTimeout(loadEmprOrderFromSupabase, 400)

      function setEmprCardImg(toolId, url) {
        var card = document.querySelector('[data-empr-id="' + toolId + '"]')
        if (!card) return
        var iconDiv = card.querySelector('.empr-card__icon')
        if (!iconDiv) return
        iconDiv.style.backgroundImage = 'url(' + url + ')'
        iconDiv.style.backgroundSize = 'cover'
        iconDiv.style.backgroundPosition = 'center'
        // Hide the SVG icon when there's a photo
        var svg = iconDiv.querySelector('svg')
        if (svg) svg.style.display = 'none'
      }

      function renderEmprLista() {
        var lista = document.getElementById('gestion-empr-lista')
        if (!lista) return
        lista.innerHTML = ''
        emprCurrentOrder.forEach(function(tool, idx) {
          // Obtener URL de la imagen del DOM (ya cargada desde Supabase)
          var card = document.querySelector('[data-empr-id="' + tool.id + '"]')
          var iconDiv = card && card.querySelector('.empr-card__icon')
          var bgImg = iconDiv && iconDiv.style.backgroundImage
          var savedImg = bgImg ? bgImg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '') : ''
          var row = document.createElement('div')
          row.setAttribute('draggable', 'true')
          row.setAttribute('data-empr-tool-id', tool.id)
          row.style.cssText = 'display:flex;align-items:center;gap:1rem;padding:0.75rem 1rem;background:var(--bg-card,#0a2535);border:1px solid rgba(21,154,156,0.2);border-radius:8px;cursor:grab;user-select:none;transition:opacity 0.15s'
          row.innerHTML = [
            '<span style="color:var(--muted);font-size:1.2rem;cursor:grab">⠿</span>',
            '<div style="width:72px;height:48px;border-radius:6px;overflow:hidden;flex-shrink:0;background:#001520;border:1px solid rgba(21,154,156,0.2);cursor:pointer;position:relative" ',
              'onclick="gestionEmprEditarImg(\'' + tool.id + '\')" title="Cambiar imagen">',
              savedImg
                ? '<img src="' + savedImg + '" style="width:100%;height:100%;object-fit:cover">'
                : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:0.65rem;text-align:center;padding:4px">Sin<br>imagen</div>',
            '</div>',
            '<div style="flex:1">',
              '<p style="margin:0;font-weight:600;color:var(--cyan)">' + tool.label + '</p>',
              '<p style="margin:0;font-size:0.72rem;color:var(--muted)">Clic para cambiar URL de portada</p>',
            '</div>',
            '<span style="color:var(--muted);font-size:0.8rem">#' + (idx+1) + '</span>'
          ].join('')

          // Drag
          row.addEventListener('dragstart', function(e) {
            emprDragSrc = row; e.dataTransfer.effectAllowed = 'move'
            setTimeout(function(){ row.style.opacity = '0.4' }, 0)
          })
          row.addEventListener('dragend', function() { row.style.opacity = '1' })
          row.addEventListener('dragover', function(e) {
            e.preventDefault(); e.dataTransfer.dropEffect = 'move'
            var rct = row.getBoundingClientRect(), mid = rct.top + rct.height/2
            if (emprDragSrc && emprDragSrc !== row) {
              if (e.clientY < mid) lista.insertBefore(emprDragSrc, row)
              else lista.insertBefore(emprDragSrc, row.nextSibling)
            }
          })
          row.addEventListener('touchstart', function(e) {
            emprDragSrc = row; row.style.opacity = '0.4'
          }, {passive:true})
          row.addEventListener('touchmove', function(e) {
            e.preventDefault()
            var y = e.touches[0].clientY
            Array.from(lista.children).forEach(function(r) {
              var rct = r.getBoundingClientRect()
              if (r !== emprDragSrc && y > rct.top && y < rct.bottom) {
                if (y < rct.top + rct.height/2) lista.insertBefore(emprDragSrc, r)
                else lista.insertBefore(emprDragSrc, r.nextSibling)
              }
            })
          }, {passive:false})
          row.addEventListener('touchend', function() { row.style.opacity = '1'; syncEmprOrderFromDOM() })

          lista.appendChild(row)
        })

        var lista2 = document.getElementById('gestion-empr-lista')
        if (lista2) {
          lista2.addEventListener('dragover', function(e){ e.preventDefault() })
          lista2.addEventListener('drop', function(e){ e.preventDefault(); syncEmprOrderFromDOM() })
        }
      }

      function syncEmprOrderFromDOM() {
        var lista = document.getElementById('gestion-empr-lista')
        if (!lista) return
        var rows = Array.from(lista.children)
        emprCurrentOrder = rows.map(function(r) {
          var id = r.getAttribute('data-empr-tool-id')
          return EMPR_TOOLS.find(function(t){ return t.id === id })
        }).filter(Boolean)
        rows.forEach(function(r, i) {
          var lbl = r.querySelector('span:last-child')
          if (lbl) lbl.textContent = '#' + (i+1)
        })
        // Solo aplicar al DOM — guardar en Supabase solo al presionar "Guardar orden"
        applyEmprOrder(emprCurrentOrder)
      }

      // Upload portada for emprendedores card
      // ── Cargar portadas desde Supabase al iniciar ────────────────
      async function cargarEmprImgs() {
        try {
          var ids = EMPR_TOOLS.map(function(t){ return 'empr-img-'+t.id })
          var res = await supabase.from('media').select('tipo,url').in('tipo', ids)
          if (res.error || !res.data) return
          res.data.forEach(function(row) {
            var toolId = row.tipo.replace('empr-img-','')
            if (row.url && !row.url.includes('supabase.co/storage')) {
              window._portadasMap = window._portadasMap || {}
              window._portadasMap[toolId] = row.url
              setEmprCardImg(toolId, row.url)
            }
          })
        } catch(e) { console.warn('cargarEmprImgs:', e) }
      }
      setTimeout(cargarEmprImgs, 600)

      window.gestionEmprEditarImg = function(toolId) {
        // Obtener URL actual
        var card = document.querySelector('[data-empr-id="' + toolId + '"]')
        var iconDiv = card && card.querySelector('.empr-card__icon')
        var bgImg = iconDiv && iconDiv.style.backgroundImage
        var currentUrl = bgImg ? bgImg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '') : ''

        // Modal de URL
        var overlay = document.createElement('div')
        overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,8,15,.92);display:flex;align-items:center;justify-content:center'
        overlay.innerHTML = `
          <div style="background:var(--bg-card,#0a2535);border:1px solid var(--border);border-radius:12px;padding:1.5rem;width:min(480px,95vw);display:flex;flex-direction:column;gap:.75rem">
            <h3 style="font-family:var(--font-head);font-size:.75rem;font-weight:700;letter-spacing:.1em;color:var(--cyan);margin:0;text-transform:uppercase">Portada de herramienta</h3>
            <div>
              <label style="font-size:.7rem;color:var(--muted)">URL de imagen (GitHub)</label>
              <input type="text" id="_emprImgUrl" value="${currentUrl}"
                placeholder="https://raw.githubusercontent.com/rabbit-3d/rabbit-3d.github.io/main/portadas/calculadora-costos.png"
                style="width:100%;margin-top:.25rem;background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:.45rem .5rem;font-size:.72rem;box-sizing:border-box"/>
              <div id="_emprImgPreview" style="margin-top:.5rem;height:80px;border-radius:6px;background-size:cover;background-position:center;background-color:rgba(255,255,255,.04);${currentUrl ? 'background-image:url(' + currentUrl + ')' : ''}"></div>
            </div>
            <div style="display:flex;gap:.5rem;justify-content:flex-end">
              <button id="_emprImgCancel" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:.38rem .85rem;cursor:pointer;font-size:.77rem">Cancelar</button>
              <button id="_emprImgGuardar" style="background:var(--cyan);border:none;color:#fff;border-radius:6px;padding:.38rem .85rem;cursor:pointer;font-size:.77rem;font-weight:600">Guardar</button>
            </div>
          </div>`
        document.body.appendChild(overlay)

        var input = document.getElementById('_emprImgUrl')
        var preview = document.getElementById('_emprImgPreview')
        input.addEventListener('input', function() {
          preview.style.backgroundImage = this.value ? 'url(' + this.value + ')' : ''
        })
        input.focus(); input.select()

        document.getElementById('_emprImgCancel').onclick = function() { overlay.remove() }
        document.getElementById('_emprImgGuardar').onclick = async function() {
          var cleanUrl = input.value.trim()
          var tipo = 'empr-img-' + toolId
          overlay.remove()
          setEmprCardImg(toolId, cleanUrl)
          await supabase.from('media').delete().eq('tipo', tipo)
          if (cleanUrl) {
            await supabase.from('media').insert([{ tipo: tipo, url: cleanUrl, nombre: cleanUrl }])
          }
          renderEmprLista()
        }
      }

      // Also listen on dragover
      setTimeout(function() {
        var lista = document.getElementById('gestion-herramientas-lista')
        if (!lista) return
        lista.addEventListener('dragover', function(e){ e.preventDefault() })
        lista.addEventListener('drop', function(e){ e.preventDefault(); syncOrderFromDOM() })
      }, 1000)

      // ── Gestión fondos foto de producto ──────────────────────────
      var fondosAdmin = []

      async function cargarFondosAdmin() {
        try {
          var res = await supabase.from('media').select('tipo,url,nombre').like('tipo','foto-fondo-%').order('nombre')
          fondosAdmin = (res.data || [])
          // Aplicar orden guardado si existe
          var orderRes = await supabase.from('media').select('nombre').eq('tipo','foto-fondos-order').maybeSingle()
          if (orderRes.data && orderRes.data.nombre) {
            try {
              var order = JSON.parse(orderRes.data.nombre)
              var ordered = []
              order.forEach(function(tipo) {
                var f = fondosAdmin.find(function(x){ return x.tipo === tipo })
                if (f) ordered.push(f)
              })
              // Agregar los que no están en el orden (nuevos)
              fondosAdmin.forEach(function(f) {
                if (!ordered.find(function(x){ return x.tipo === f.tipo })) ordered.push(f)
              })
              fondosAdmin = ordered
            } catch(e) {}
          }
          renderFondosAdmin()
        } catch(e) { console.warn('cargarFondosAdmin:', e) }
      }

      async function guardarOrdenFondos() {
        var ids = fondosAdmin.map(function(f){ return f.tipo })
        try {
          await supabase.from('media').delete().eq('tipo','foto-fondos-order')
          await supabase.from('media').insert([{tipo:'foto-fondos-order',url:'',nombre:JSON.stringify(ids)}])
        } catch(e) { console.warn('guardarOrdenFondos:', e) }
      }

      function renderFondosAdmin() {
        var grid = document.getElementById('gestionFondosGrid')
        if (!grid) return
        grid.innerHTML = ''
        if (!fondosAdmin.length) {
          grid.innerHTML = '<p style="font-size:.7rem;color:var(--muted);grid-column:1/-1">Sin fondos cargados. Hacé clic en "Subir fondos" para agregar.</p>'
          return
        }
        var dragSrcFondo = null
        fondosAdmin.forEach(function(fondo, idx) {
          var wrap = document.createElement('div')
          wrap.setAttribute('draggable','true')
          wrap.setAttribute('data-tipo', fondo.tipo)
          wrap.style.cssText = 'position:relative;height:80px;border-radius:8px;overflow:hidden;border:1px solid var(--border);cursor:grab;user-select:none'
          // Imagen de fondo
          var imgDiv = document.createElement('div')
          imgDiv.style.cssText = 'width:100%;height:100%;background-size:cover;background-position:center;background-image:url("'+fondo.url+'")'
          // Número de orden
          var numBadge = document.createElement('div')
          numBadge.textContent = idx + 1
          numBadge.style.cssText = 'position:absolute;top:2px;left:4px;background:rgba(0,0,0,.7);color:#fff;font-size:.6rem;font-weight:700;border-radius:3px;padding:1px 4px;pointer-events:none'
          // Botón eliminar
          var del = document.createElement('button')
          del.textContent = '✕'
          del.style.cssText = 'position:absolute;top:2px;right:2px;background:rgba(0,0,0,.7);color:#fff;border:none;border-radius:4px;width:18px;height:18px;font-size:.6rem;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1'
          del.addEventListener('click', async function(e) {
            e.stopPropagation()
            if (!confirm('¿Eliminar este fondo? Recordá también borrar el archivo de tu repo de GitHub.')) return
            try {
              await supabase.from('media').delete().eq('tipo', fondo.tipo)
              fondosAdmin = fondosAdmin.filter(function(f){ return f.tipo !== fondo.tipo })
              await guardarOrdenFondos()
              renderFondosAdmin()
            } catch(e) { console.warn('borrar fondo:', e) }
          })
          wrap.appendChild(imgDiv); wrap.appendChild(numBadge); wrap.appendChild(del)

          // Drag para reordenar
          wrap.addEventListener('dragstart', function(e) {
            dragSrcFondo = wrap
            e.dataTransfer.effectAllowed = 'move'
            setTimeout(function(){ wrap.style.opacity = '0.4' }, 0)
          })
          wrap.addEventListener('dragend', function() {
            wrap.style.opacity = '1'
            // Sincronizar orden desde el DOM
            var newOrder = []
            grid.querySelectorAll('[data-tipo]').forEach(function(el) {
              var f = fondosAdmin.find(function(x){ return x.tipo === el.getAttribute('data-tipo') })
              if (f) newOrder.push(f)
            })
            fondosAdmin = newOrder
            guardarOrdenFondos()
            renderFondosAdmin()  // re-render para actualizar números
          })
          wrap.addEventListener('dragover', function(e) {
            e.preventDefault(); e.dataTransfer.dropEffect = 'move'
            if (dragSrcFondo && dragSrcFondo !== wrap) {
              var rect = wrap.getBoundingClientRect()
              var mid  = rect.left + rect.width / 2
              if (e.clientX < mid) grid.insertBefore(dragSrcFondo, wrap)
              else grid.insertBefore(dragSrcFondo, wrap.nextSibling)
            }
          })
          grid.appendChild(wrap)
        })
      }

      // Subir múltiples fondos
      var fondoFileInput   = document.getElementById('fondoFileInput')
      var fondoFolderInput = document.getElementById('fondoFolderInput')

      document.getElementById('btnSubirFondo').addEventListener('click', function() {
        fondoFileInput.value = ''; fondoFileInput.click()
      })
      document.getElementById('btnSubirCarpeta').addEventListener('click', function() {
        fondoFolderInput.value = ''; fondoFolderInput.click()
      })

      // Mismo handler para archivos y carpeta
      function procesarFondos(e) { fondoFileInput.dispatchEvent(Object.assign(new Event('change'), { target: e.target })) }
      fondoFolderInput.addEventListener('change', async function(e) {
        // Reusar el mismo handler pasando los archivos
        var files = Array.from(e.target.files).filter(function(f){ return f.type.startsWith('image/') })
        if (!files.length) return
        var btn = document.getElementById('btnSubirFondo')
        var btn2 = document.getElementById('btnSubirCarpeta')
        btn.disabled = true; btn2.disabled = true; btn2.textContent = 'Registrando...'

        var instrDiv = document.getElementById('fondoGithubInstr')
        var nombres = files.map(function(f){ return f.name }).join(', ')
        if (instrDiv) {
          instrDiv.style.display = 'block'
          instrDiv.innerHTML = '<p style="font-size:.72rem;color:var(--cyan);margin:0 0 .4rem;font-weight:600">📁 Subí estos archivos a GitHub:</p>' +
            '<ol style="font-size:.7rem;color:var(--text);margin:0 0 .5rem;padding-left:1.2rem;line-height:1.8">' +
            '<li>En tu repo de GitHub, subí la carpeta <strong>fondos</strong> completa</li>' +
            '<li>Esperá que se publiquen (~2 min) y los fondos estarán disponibles</li>' +
            '</ol>' +
            '<p style="font-size:.7rem;color:var(--muted);margin:0">Archivos detectados: ' + files.length + '</p>'
        }

        var errores = 0
        for (var i = 0; i < files.length; i++) {
          var file = files[i]
          var idx  = Date.now() + i
          var tipo = 'foto-fondo-' + idx
          var url  = 'https://lamadriguera.site/fondos/' + encodeURIComponent(file.name)
          try {
            await supabase.from('media').upsert([{ tipo: tipo, url: url, nombre: file.name }], { onConflict: 'nombre' })
            fondosAdmin.push({ tipo: tipo, url: url, nombre: file.name })
          } catch(err) { errores++; console.warn('Error registrando fondo:', err) }
        }
        await guardarOrdenFondos()
        renderFondosAdmin()
        btn.disabled = false; btn2.disabled = false
        btn2.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1-2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> Subir fondos (carpeta)'
        if (errores) alert(errores + ' archivo(s) no se pudieron registrar.')
      })
      fondoFileInput.addEventListener('change', async function(e) {
        var files = Array.from(e.target.files)
        if (!files.length) return
        var btn = document.getElementById('btnSubirFondo')

        // Mostrar instrucciones para subir a GitHub
        var nombres = files.map(function(f){ return f.name }).join(', ')
        var instrDiv = document.getElementById('fondoGithubInstr')
        if (instrDiv) {
          instrDiv.style.display = 'block'
          instrDiv.innerHTML = '<p style="font-size:.72rem;color:var(--cyan);margin:0 0 .4rem;font-weight:600">📁 Subí estos archivos a GitHub:</p>' +
            '<ol style="font-size:.7rem;color:var(--text);margin:0 0 .5rem;padding-left:1.2rem;line-height:1.8">' +
            '<li>En tu repo de GitHub, creá la carpeta <code>fondos/</code> si no existe</li>' +
            '<li>Subí los archivos: <strong>' + nombres + '</strong></li>' +
            '<li>Esperá que se publiquen (~2 min) y después hacé clic en "Registrar fondos" abajo</li>' +
            '</ol>'
        }

        // Generar las URLs de GitHub Pages y registrarlas en Supabase
        btn.disabled = true; btn.textContent = 'Registrando...'
        var errores = 0
        for (var i = 0; i < files.length; i++) {
          var file = files[i]
          var idx  = Date.now() + i
          var nombre = file.name
          var tipo = 'foto-fondo-' + idx
          var url  = 'https://lamadriguera.site/fondos/' + encodeURIComponent(nombre)
          try {
            await supabase.from('media').upsert([{ tipo: tipo, url: url, nombre: nombre }], { onConflict: 'nombre' })
            fondosAdmin.push({ tipo: tipo, url: url, nombre: nombre })
          } catch(err) { errores++; console.warn('Error registrando fondo:', err) }
        }
        await guardarOrdenFondos()
        renderFondosAdmin()
        btn.disabled = false
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Subir fondos'
        if (errores) alert(errores + ' archivo(s) no se pudieron registrar.')
      })

      // Cargar fondos al abrir el modal de gestión
      var _origAbrirGestion = window.abrirGestionHerramientas
      window.abrirGestionHerramientas = async function() {
        await _origAbrirGestion()
        cargarFondosAdmin()
        if (typeof renderOrdenTarjetas === 'function') renderOrdenTarjetas()
        if (typeof carruselAdminRender === 'function') carruselAdminRender()
      }

    })()


      // ── Gestor de Mantenimiento (admin) ──────────────────────────────────
      // Lee dinámicamente las herramientas desde el DOM — se actualiza solo al agregar nuevas
      window._getMantTools = function() {
        var tools = []

        // Laboratorio 3D: herramienta-card — extraer id sin regex
        document.querySelectorAll('.herramienta-card[onclick]').forEach(function(card) {
          var onc = card.getAttribute('onclick') || ''
          var raw = ''
          var q1 = onc.indexOf("'"), q2 = onc.indexOf("'", q1+1)
          var q3 = onc.indexOf('"'), q4 = onc.indexOf('"', q3+1)
          if (q1 >= 0 && q2 > q1) raw = onc.slice(q1+1, q2)
          else if (q3 >= 0 && q4 > q3) raw = onc.slice(q3+1, q4)
          if (!raw) return
          var id = raw.indexOf('modal-') === 0 ? raw.slice(6) : raw
          var titulo = card.querySelector('h3,.herramienta-card__title')
          var label = titulo ? titulo.textContent.trim() : id
          if (!tools.find(function(t){ return t.id === id })) tools.push({ id: id, label: label, tipo: 'lab' })
        })

        // Emprendedores: data-empr-id — lectura directa, soporta cualquier caracter
        document.querySelectorAll('[data-empr-id]').forEach(function(card) {
          var id = card.getAttribute('data-empr-id')
          if (!id) return
          var titulo = card.querySelector('h3,.empr-card__title')
          var label = titulo ? titulo.textContent.trim() : id
          if (!tools.find(function(t){ return t.id === id })) tools.push({ id: id, label: label, tipo: 'empr' })
        })

        return tools
      }

      window.abrirGestorMantenimiento = async function() {
        const modal = document.getElementById('modalGestorMant')
        modal.style.display = 'flex'
        // Recargar estado fresco desde Supabase
        try {
          const { data } = await supabase.from('media')
            .select('tipo,nombre').like('tipo','config-maint-%')
          _maintTools = {}
          if (data) data.forEach(r => {
            _maintTools[r.tipo.replace('config-maint-','')] = r.nombre === '1'
          })
        } catch(e) {}
        _renderMantListas()
      }

      function _renderMantListas() {
        var MANT_TOOLS = (window._getMantTools || function(){return []}).call()
        ;['lab','empr'].forEach(tipo => {
          const lista = document.getElementById('mantLista' + (tipo==='lab'?'Lab':'Empr'))
          if (!lista) return
          lista.innerHTML = ''
          if (!MANT_TOOLS.filter(t => t.tipo === tipo).length) {
            lista.innerHTML = '<p style="font-size:.7rem;color:var(--muted);padding:.3rem">No hay herramientas registradas.</p>'
            return
          }
          MANT_TOOLS.filter(t => t.tipo === tipo).forEach(tool => {
            const enMant = !!_maintTools[tool.id]
            const row = document.createElement('div')
            row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:.5rem .7rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:8px'
            row.innerHTML = `
              <span style="font-size:.78rem;color:var(--text)">${tool.label}</span>
              <button data-tool-id="${tool.id}" data-en-mant="${enMant}"
                style="padding:.3rem .8rem;border-radius:6px;border:none;cursor:pointer;font-size:.72rem;font-weight:700;
                  background:${enMant ? 'rgba(245,158,11,.15)' : 'rgba(21,154,156,.15)'};
                  color:${enMant ? '#f59e0b' : '#4ecca3'}"
                onclick="toggleMantTool(this)">
                ${enMant ? '🔧 En mantenimiento' : '✅ Activa'}
              </button>`
            lista.appendChild(row)
          })
        })
      }

      window.toggleMantTool = async function(btn) {
        const id = btn.dataset.toolId
        const enMant = btn.dataset.enMant === 'true'
        const nuevoEstado = !enMant
        btn.disabled = true
        btn.textContent = '...'
        try {
          await supabase.from('media').delete().eq('tipo','config-maint-'+id)
          if (nuevoEstado) {
            await supabase.from('media').insert([{tipo:'config-maint-'+id, url:'', nombre:'1'}])
          }
          _maintTools[id] = nuevoEstado
          // Actualizar overlay en la card
          const labCard = document.querySelector('.herramienta-card[onclick*="modal-'+id+'"]')
          if (labCard) _toggleMantOverlay(labCard, id, nuevoEstado, 'lab')
          const emprCard = document.querySelector('[data-empr-id="'+id+'"]')
          if (emprCard) _toggleMantOverlay(emprCard, id, nuevoEstado, 'empr')
          _renderMantListas()
        } catch(e) {
          btn.disabled = false
          alert('Error al guardar: ' + (e.message || e))
        }
      }
      // ── Fin gestor de mantenimiento ──────────────────────────────────────


      // ══════════════════════════════════════════════════════════════════

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
        var html='<!DOCTYPE html><html><head><style>*{margin:0;padding:0}body{background:#fff}img{width:210mm;height:297mm;display:block}@page{size:A4;margin:0}</style></head><body><img src="'+img+'"/><script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script></body></html>'
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

