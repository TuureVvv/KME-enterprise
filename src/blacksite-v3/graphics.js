/* Original procedural KME art. Rendering owns no gameplay state. */
async function graphics(canvas){
  const T=await import('./vendor/three-0.180.0.module.js');
  const coarse=matchMedia('(pointer:coarse)').matches,reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const renderer=new T.WebGLRenderer({canvas,antialias:!coarse,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,coarse?1.35:1.8));
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
  renderer.shadowMap.enabled=!coarse;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene=new T.Scene(),camera=new T.OrthographicCamera(-20,20,20,-20,.1,180);
  const hemi=new T.HemisphereLight(0xe8ecfa,0x34313c,2.2);scene.add(hemi);
  const sun=new T.DirectionalLight(0xffe5b7,3.1);sun.position.set(-22,35,18);sun.castShadow=true;sun.shadow.mapSize.set(1536,1536);Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:.5,far:100});sun.shadow.normalBias=.06;sun.shadow.bias=-.0002;scene.add(sun,sun.target);
  const rim=new T.DirectionalLight(0x75b7cb,1.7);rim.position.set(15,14,-25);scene.add(rim);
  const geo={box:new T.BoxGeometry(1,1,1),round:new T.SphereGeometry(1,12,8),ico:new T.IcosahedronGeometry(1,1),cyl:new T.CylinderGeometry(1,1,1,10),cone:new T.ConeGeometry(1,1,6),ring:new T.TorusGeometry(1,.045,5,48),disc:new T.CircleGeometry(1,36)};
  const materials=new Map(),textures=new Set(),customGeometries=new Set();
  function material(color,glow=false,opacity=1){const key=color+':'+glow+':'+opacity;if(!materials.has(key))materials.set(key,glow?new T.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity>=1}):new T.MeshStandardMaterial({color,roughness:.79,metalness:.18,transparent:opacity<1,opacity}));return materials.get(key);}
  function mesh(parent,g,color,x,y,z,sx=1,sy=sx,sz=sx,glow=false,opacity=1){const m=new T.Mesh(geo[g],material(color,glow,opacity));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=!glow&&sy>.35;m.receiveShadow=!glow;parent.add(m);return m;}
  function ring(parent,x,z,r,color,y=.08,opacity=1){const m=mesh(parent,'ring',color,x,y,z,r,r,r,true,opacity);m.rotation.x=-Math.PI/2;return m;}
  function textTexture(text,color='#e9edd3',background='#182b29',width=512){const c=document.createElement('canvas');c.width=width;c.height=128;const q=c.getContext('2d');q.fillStyle=background;q.fillRect(0,0,width,128);q.fillStyle=color;q.font='bold 38px monospace';q.textAlign='center';q.textBaseline='middle';q.fillText(text,width/2,64,width-24);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;textures.add(tex);return tex;}
  function sign(parent,text,x,y,z,color='#dce6c2',scale=1){const m=new T.Mesh(new T.PlaneGeometry(6*scale,1.5*scale),new T.MeshBasicMaterial({map:textTexture(text,color),side:T.DoubleSide}));customGeometries.add(m.geometry);parent.add(m);m.position.set(x,y,z);return m;}
  function sprite(parent,text,color,width=4){const m=new T.Sprite(new T.SpriteMaterial({map:textTexture(text,color,'#102725e8'),transparent:true,depthTest:false}));m.scale.set(width,width/4,1);parent.add(m);m.renderOrder=4;return m;}
  const world=new T.Group(),actors=new T.Group(),effects=new T.Group();scene.add(world,actors,effects);
  let districtId=0,roofs=[],relayObjects=[],core=null,extraction=null,player=null,playerClass='',lastTime=0,follow=null,shake=0,quality='auto';
  const dynamic=new Map(),bulletDummy=new T.Object3D();
  const bullets=[new T.InstancedMesh(geo.round,material(0xddf8a5,true),640),new T.InstancedMesh(geo.round,material(0xff795f,true),640),new T.InstancedMesh(geo.round,material(0xcdb4ef,true),640)];for(const pool of bullets){pool.instanceMatrix.setUsage(T.DynamicDrawUsage);pool.frustumCulled=false;pool.count=0;effects.add(pool);}
  const particles=new T.InstancedMesh(geo.ico,material(0xefc49a,true),480);particles.instanceMatrix.setUsage(T.DynamicDrawUsage);particles.frustumCulled=false;particles.count=0;effects.add(particles);
  const rainGeo=new T.BufferGeometry(),rainPositions=new Float32Array(180*6);rainGeo.setAttribute('position',new T.BufferAttribute(rainPositions,3));customGeometries.add(rainGeo);const rain=new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:0xb1cece,transparent:true,opacity:.18}));rain.frustumCulled=false;effects.add(rain);
  const muzzle=new T.PointLight(0xffdda0,0,7,2);actors.add(muzzle);
  function clearGroup(group){const disposed=new Set(),shared=new Set(materials.values());for(const child of [...group.children]){group.remove(child);child.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&customGeometries.has(o.geometry)){o.geometry.dispose();customGeometries.delete(o.geometry);}const m=o.material;if(m&&!shared.has(m)&&!disposed.has(m)){if(m.map){textures.delete(m.map);m.map.dispose();}m.dispose();disposed.add(m);}});}}
  function batchWorld(target=world){
    target.updateMatrixWorld(true);const keep=new Set([core,extraction,...roofs.flatMap(r=>[r.roof,r.walls]),...relayObjects.map(r=>r.g)]),shared=new Set(materials.values()),geometries=new Set(Object.values(geo)),groups=new Map();
    target.traverse(m=>{if(!m.isMesh||m.isInstancedMesh||!geometries.has(m.geometry)||target===world&&!shared.has(m.material))return;if(target===world)for(let p=m;p&&p!==world;p=p.parent)if(keep.has(p)||p.userData.kind)return;const key=m.geometry.uuid+m.material.uuid+m.castShadow+m.receiveShadow;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);});
    let saved=0;for(const list of groups.values()){if(list.length<3)continue;const first=list[0],batch=new T.InstancedMesh(first.geometry,first.material,list.length);batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;list.forEach((m,i)=>{batch.setMatrixAt(i,m.matrixWorld);m.parent.remove(m);});batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();target.add(batch);saved+=list.length-1;}world.userData.savedDraws=(world.userData.savedDraws||0)+saved;
  }
  function buildWorld(s){
    clearGroup(world);roofs=[];relayObjects=[];districtId=s.district.id;world.userData.savedDraws=0;
    const d=s.district,rng=E.random(991+d.id*531);scene.background=new T.Color(d.fog);scene.fog=new T.Fog(d.fog,42,105);
    hemi.color.set(d.id===3?0xe3dafa:0xe8ecfa);rim.color.set(d.id===4?0xf58f69:d.id===3?0xa290d7:0x69b8c4);
    const tile=document.createElement('canvas');tile.width=tile.height=256;const q=tile.getContext('2d');q.fillStyle='#b6b2af';q.fillRect(0,0,256,256);
    for(let i=0;i<1400;i++){const a=rng();q.fillStyle=a>.5?'#d3ceca':'#777a84';q.globalAlpha=.1+rng()*.3;q.fillRect(rng()*256,rng()*256,1+rng()*5,1+rng()*3);}q.globalAlpha=1;q.strokeStyle='#656874';q.lineWidth=1;for(let i=0;i<12;i++){q.beginPath();let x=rng()*256,y=rng()*256;q.moveTo(x,y);for(let j=0;j<5;j++){x+=(rng()-.5)*30;y+=rng()*20;q.lineTo(x,y);}q.stroke();}
    const map=new T.CanvasTexture(tile);textures.add(map);map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(20,20);map.colorSpace=T.SRGBColorSpace;
    const floorMat=new T.MeshStandardMaterial({color:d.ground,map,roughness:d.id===2?.38:.95,metalness:d.id===2?.3:.03});const floor=new T.Mesh(new T.PlaneGeometry(122,122),floorMat);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.userData.ownedMaterial=true;customGeometries.add(floor.geometry);world.add(floor);
    mesh(world,'box',d.road,0,.025,0,120,.05,8);mesh(world,'box',d.road,0,.03,0,8,.06,120);
    for(let a=-54;a<=54;a+=8){mesh(world,'box',0xa5ad8c,a,.075,0,3,.02,.12);mesh(world,'box',0xa5ad8c,0,.08,a,.12,.02,3);}
    for(const b of s.buildings){
      const base=new T.Group();world.add(base);mesh(base,'box',d.interior,b.x,.12,b.z,b.w+.8,.24,b.d+.8);
      const walls=new T.Group();base.add(walls);const wallMat=new T.MeshStandardMaterial({color:b.color,roughness:.92,metalness:.09});
      for(const w of s.walls.filter(w=>Math.abs(w.x-b.x)<=b.w/2+.5&&Math.abs(w.z-b.z)<=b.d/2+.5)){
        const m=mesh(walls,'box',b.color,w.x,1.45,w.z,w.w,2.9,w.d);m.material=wallMat;m.userData.ownedMaterial=true;
        mesh(walls,'box',0x293d38,w.x,.35,w.z,w.w+.12,.5,w.d+.12);mesh(walls,'box',0x96a18c,w.x,2.9,w.z,w.w+.1,.1,w.d+.1);
      }
      const roof=new T.Group();base.add(roof);mesh(roof,'box',d.roof,b.x,3.15,b.z,b.w+1,.35,b.d+1);
      for(let x=-b.w/2;x<b.w/2;x+=2)mesh(roof,'box',0x778495,b.x+x,3.38,b.z,.12,.12,b.d+1);
      mesh(roof,'box',0x65746a,b.x+3,3.7,b.z-2,3,.8,2);for(let j=0;j<3;j++)mesh(roof,'box',0x263936,b.x+2.2+j*.7,4.13,b.z-2,.14,.08,1.7);
      const label=b.name==='THE SHELTER'?'BONGO / SAFE-ISH HOUSE':b.name;
      sign(base,label,b.x,2.3,b.z+b.d/2+.43,d.accent,.8);
      for(const side of[-1,1]){mesh(walls,'box',0x2f4a4b,b.x+side*b.w*.29,1.6,b.z+b.d/2+.39,2.4,.9,.06,true,.85);mesh(walls,'box',0x101f20,b.x+side*b.w*.29,1.6,b.z+b.d/2+.44,.07,1,.05);}
      for(const side of[-1,1]){mesh(base,'cyl',0x716d54,b.x+side*(b.w/2-.8),1.3,b.z-b.d/2+.9,.15,2.6,.15);mesh(base,'box',0x4b5d51,b.x+side*(b.w/2-1.6),.8,b.z-b.d/2+2,1.2,1.6,3);}
      ring(base,b.x,b.z,1.4,0x99bb8d,.26,.3);roofs.push({b,roof,walls,wallMat});
      // Interior floor joints, loading stripes and workstation silhouettes.
      for(let j=-b.w/2+2;j<b.w/2;j+=3)mesh(base,'box',0xd2bda0,b.x+j,.255,b.z,.035,.012,b.d-1);
      for(let j=-b.d/2+2;j<b.d/2;j+=3)mesh(base,'box',0xd2bda0,b.x,.257,b.z+j,b.w-1,.012,.035);
      for(const side of[-1,1])for(let j=0;j<4;j++){const stripe=mesh(base,'box',j%2?0xb9b682:0x283d35,b.x+side*(2+j*.38),.264,b.z+b.d/2+1,.38,.014,1.2);stripe.rotation.y=.35;}
      if(b.x!==0||b.z!==0){for(const side of[-1,1]){mesh(base,'box',0x88785a,b.x+side*3,.55,b.z-b.d/2+2,2.1,1.1,1.3);mesh(base,'box',0x293d37,b.x+side*3,1.16,b.z-b.d/2+2,2.3,.08,1.5);mesh(base,'box',0x465c59,b.x+side*3,1.45,b.z-b.d/2+1.7,.7,.5,.12);mesh(base,'box',0xa2c9b6,b.x+side*3,1.45,b.z-b.d/2+1.62,.53,.32,.02,true);}}
    }
    // Damaged fences, parking bays and legible shipping landmarks.
    for(const side of[-1,1]){for(let a=-58;a<58;a+=5){mesh(world,'cyl',0x52685d,side*59,1.3,a,.07,2.6,.07);mesh(world,'cyl',0x52685d,a,1.3,side*59,.07,2.6,.07);}mesh(world,'box',0x607569,side*59,1.8,0,.08,.08,118);mesh(world,'box',0x607569,0,1.8,side*59,118,.08,.08);}
    for(const[x,z]of[[-14,-20],[15,25],[-35,10]]){mesh(world,'box',0x737e67,x,.8,z,2.7,1.6,4.5);mesh(world,'box',0x3f5d60,x,1.8,z-.5,2.4,.65,2.7);for(const a of[-1,1])for(const b of[-1,1]){const wheel=mesh(world,'cyl',0x1c2929,x+a*1.25,.5,z+b*1.5,.44,.3,.44);wheel.rotation.z=Math.PI/2;}sign(world,'LEASE EXPIRED',x,1.1,z+2.28,'#e0c794',.35);}
    for(const[x,z,r]of E.COVER){mesh(world,'cyl',0x737b60,x,.7,z,r,1.4,r);ring(world,x,z,r+.03,0xa5ad7f,1.15);}
    // Marks live on the ground and never disguise collision geometry.
    for(let j=0;j<44;j++){const x=(rng()-.5)*110,z=(rng()-.5)*110;const stain=mesh(world,'disc',j%3?0x332d38:0x9b8b76,x,.037,z,1+rng()*2,1+rng()*2,1,true,.18);stain.rotation.x=-Math.PI/2;}
    for(const x of[-5,5])for(let z=-54;z<55;z+=3)mesh(world,'box',0x9aab93,x,.07,z,.18,.06,2.4);
    const plantGeo=new T.ConeGeometry(.35,1.4,4);customGeometries.add(plantGeo);const plants=new T.InstancedMesh(plantGeo,material(d.id===3?0x80768e:0x4d6b4c),260);plants.receiveShadow=true;const dummy=new T.Object3D();let count=0;
    for(let j=0;j<400&&count<260;j++){const x=(rng()-.5)*114,z=(rng()-.5)*114;if(Math.abs(x)<6||Math.abs(z)<5||s.buildings.some(b=>Math.abs(x-b.x)<b.w/2+1&&Math.abs(z-b.z)<b.d/2+1))continue;dummy.position.set(x,.3,z);dummy.scale.setScalar(.4+rng());dummy.rotation.y=rng()*7;dummy.updateMatrix();plants.setMatrixAt(count++,dummy.matrix);}plants.count=count;world.add(plants);
    for(const[x,z]of[[-18,-44],[19,-42],[-47,41],[47,-43],[-18,38],[18,17]]){mesh(world,'cyl',0x514c3a,x,1.9,z,.22,3.8,.22);for(let j=0;j<3;j++)mesh(world,'ico',d.id===3?0x837094:0x59735b,x+Math.sin(j*2)*.8,3.1+j*.45,z+Math.cos(j*2)*.7,1.1,.65,1);}
    for(const[x,z]of[[-11,12],[11,-12],[-12,-30],[12,32]]){mesh(world,'cyl',0x3b5149,x,2.7,z,.08,5.4,.08);mesh(world,'box',0xddd8ac,x,5.2,z,1,.15,.5,true);const lamp=new T.PointLight(d.id===4?0xffa16d:0xe5dca2,14,9,2);lamp.position.set(x,4.6,z);world.add(lamp);}
    if(d.id===2){for(const x of[-22,22]){mesh(world,'box',0x42747c,x,.035,0,3,.025,108,false,.74);for(let z=-48;z<=48;z+=16){mesh(world,'box',0x746d59,x,.13,z,4.4,.12,2);for(const side of[-1,1])mesh(world,'box',0x9ba88a,x+side*2,.65,z,.05,1.2,2);}}sign(world,'DO NOT LICK THE PUMPS',-10,2,-17,'#87e3d2',.65);}
    if(d.id===3){for(const[x,z]of[[-14,-13],[14,15],[-14,35],[14,-35]]){mesh(world,'box',0x5c516b,x,1.4,z,1.5,2.8,1.5);mesh(world,'ico',0xc4b0ef,x,3.4,z,.7,1.1,.7,true);ring(world,x,z,2,0xb09ddf);}sign(world,'ALL COMPLAINTS ARE FINAL',0,3,-34,'#d8c2ed',.7);}
    if(d.id===4){for(const[x,z]of[[-13,-15],[13,17],[-21,36],[20,-36]]){mesh(world,'cyl',0x806b53,x,2,z,.7,4,.7);mesh(world,'cone',0xf1ad6e,x,4.2,z,.6,1.4,.6,true);ring(world,x,z,2,0xd78e63);}sign(world,'EXECUTIVE PARKING ONLY',0,3,-32,'#efb48e',.75);}
    core=new T.Group();world.add(core);core.position.set(0,0,2);mesh(core,'cyl',0x455d58,0,.65,0,1.6,1.3,1.6);mesh(core,'round',0xb9e4bb,0,1.7,0,.75,1.1,.75,true);for(let j=0;j<4;j++){const a=j*Math.PI/2;mesh(core,'box',0x739386,Math.sin(a)*1.1,1.55,Math.cos(a)*1.1,.22,2.1,.22);}ring(core,0,0,1.8,0xc0d995,1.3);sign(world,'SHELTER REACTOR',0,3.5,3.3,'#d7e7b1',.7);
    mesh(world,'box',0x8c7252,-4,.7,3,3,1.4,1.4);mesh(world,'box',0xc5c797,-4,1.45,3,3.2,.12,1.5);sign(world,'BONGO / NO REFUNDS',-4,2.8,1,'#f1d091',.7);
    const bongo=actor('engineer',world);bongo.position.set(-4,0,1.3);bongo.rotation.y=.3;mesh(bongo,'cone',0xdcad64,0,2.05,0,.45,.55,.45);
    extraction=ring(world,0,14,2.5,0xa9d4b1);for(let j=0;j<4;j++){const a=j*Math.PI/2;mesh(world,'box',0xa5d8b3,Math.sin(a)*2.6,.1,14+Math.cos(a)*2.6,.2,.2,.8,true);}sign(world,'EVAC / HOLD YOUR GREED',0,2.3,17,'#b6e5c2',.7);
    sign(world,'OPERATIONS / CALL GUARDIAN',4,2.2,3,'#f2c58c',.65);mesh(world,'box',0x43576a,4,.75,3,1.1,1.5,.8);mesh(world,'box',0xe9b46a,4,1.4,3.42,.7,.3,.04,true);
    for(const r of s.relays){const g=new T.Group();world.add(g);g.position.set(r.x,0,r.z);mesh(g,'box',0x3b5552,0,.8,0,1,1.6,1);mesh(g,'cyl',0x81988b,0,2.2,0,.08,2.2,.08);const glow=mesh(g,'ico',0xe6bb75,0,2,0,.38,.38,.38,true);const halo=ring(g,0,0,2,0xe6bb75);const badge=sprite(g,'SIGNAL '+r.label,'#f1c47f',3);badge.position.y=3.3;relayObjects.push({g,glow,halo,badge});}
    batchWorld();for(const r of roofs){batchWorld(r.roof);batchWorld(r.walls);}
  }
  __BLACKSITE_MODELS__
  __BLACKSITE_EFFECTS__
  function actor(kind,parent=actors){const special=specialActor(kind,parent);if(special)return special;
    const g=new T.Group();parent.add(g);const isPlayer=['intern','enforcer','engineer','chemist'].includes(kind),color={intern:0xb4c68f,enforcer:0x9bafa5,engineer:0xd0b06b,chemist:0xb2a6cf,stalker:0x8c9f80,lancer:0xbda179,gunner:0x71969a,sniper:0xa89bc2,bomber:0x9b8b7c,mole:0x99724b,archer:0xc9b595,sludge:0x7f934d,potency:0xc8b46d,revenge:0x9372ae,warden:0xbe956d,reaper:0x806e9c,surveyor:0xa2b0bc,coil:0x7cc9ca,rat:0x999b87}[kind]||0x929f84;
    const u=g.userData={kind,legs:[],arms:[]};
    if(kind==='rat'){mesh(g,'ico',color,0,.25,0,.3,.24,.5);mesh(g,'cone',0xb1ad93,0,.3,.47,.15,.4,.15).rotation.x=Math.PI/2;for(const x of[-.16,.16])mesh(g,'round',0xd2aaa0,x,.47,.18,.1,.1,.06);mesh(g,'cyl',0xbc9f94,0,.15,-.65,.025,.7,.025).rotation.x=Math.PI/2;return g;}
    if(kind==='coil'||kind==='surveyor'){mesh(g,'ico',0x3f555c,0,1.4,0,.65,.45,.65);mesh(g,'round',color,0,1.45,.3,.3,.23,.3,true);for(const x of[-1,1]){mesh(g,'box',0x6b7d7e,x*.7,1.3,0,.9,.1,.35);ring(g,x*.85,0,.32,color,1.4);}u.float=true;return g;}
    if(kind==='sludge'){for(let i=0;i<9;i++)mesh(g,'ico',i%2?0x9b9e65:color,Math.sin(i*2.4)*.6,.7+(i%3)*.5,Math.cos(i*2.4)*.55,.55,.8,.55);mesh(g,'ico',0xd2cca1,0,1.7,.65,.4,.4,.2);for(const x of[-.15,.15])mesh(g,'round',0x1d2c24,x,1.75,.82,.07,.07,.05);u.weak=mesh(g,'round',0xd7dc8c,0,1.1,-.6,.36,.45,.2,true);g.scale.setScalar(2.8);return g;}
    mesh(g,'box',0x283c37,0,.9,0,.65,.8,.5);mesh(g,'ico',color,0,1.12,0,.48,.56,.37);mesh(g,'round',kind==='mole'?0x71583c:color,0,1.78,.02,.36,.35,.33);
    for(const side of[-1,1]){const leg=new T.Group();g.add(leg);leg.position.set(side*.23,.55,0);mesh(leg,'cyl',0x34463e,0,-.15,0,.13,.55,.13);mesh(leg,'box',0x273a36,0,-.43,.12,.28,.22,.45);u.legs.push(leg);const arm=new T.Group();g.add(arm);arm.position.set(side*.5,1.34,0);mesh(arm,'cyl',color,0,-.22,.08,.13,.56,.13);mesh(arm,'round',0xb8bf8b,0,-.5,.2,.14,.14,.14);u.arms.push(arm);if(isPlayer)mesh(g,'cone',color,side*.36,1.96,0,.17,.55,.16).rotation.z=side*-.9;}
    for(const side of[-1,1])mesh(g,'round',0x162c26,side*.14,1.83,.32,.055,.045,.03);
    if(isPlayer){mesh(g,'box',0x334944,0,1.15,-.4,.6,.65,.22);mesh(g,'box',0xd8dec2,0,1.4,.35,.28,.12,.08);}
    if(kind==='enforcer'||kind==='lancer'){mesh(g,'box',0x6f837e,0,1.2,.35,.8,.65,.18);u.shield=mesh(g,'box',kind==='lancer'?0x9e9268:0x99bba8,-.5,1.15,.6,.68,1.1,.15);mesh(g,'box',0xcbe1b2,-.5,1.2,.69,.36,.1,.03,true);}
    if(kind==='engineer'){mesh(g,'box',0xbca16d,0,1.22,-.45,.75,.8,.4);mesh(g,'cyl',0x6b7370,.53,1.6,-.35,.1,.9,.1).rotation.z=-.4;mesh(g,'box',0x455956,0,1.92,.27,.7,.18,.15);}
    if(kind==='chemist'){for(const side of[-1,1]){mesh(g,'cyl',side<0?0x79d6d1:0xb8dc85,side*.38,1,-.45,.13,.65,.13,true);mesh(g,'cyl',0x596476,side*.38,1.4,-.45,.15,.14,.15);}mesh(g,'round',0x7cb5b5,0,1.75,.36,.28,.14,.07,true);}
    if(kind==='mole'){mesh(g,'cone',0xbfa483,0,1.72,.43,.18,.55,.18).rotation.x=Math.PI/2;mesh(g,'round',0xb79558,0,2.02,0,.43,.16,.4);mesh(g,'round',0xefe4b4,0,2.02,.4,.13,.13,.05,true);for(const x of[-.7,.7])for(let j=0;j<3;j++)mesh(g,'cone',0xdfd5b6,x+j*.08,.7,.4,.08,.6,.08).rotation.x=Math.PI/2;g.scale.setScalar(2);}
    else if(kind==='archer'){u.bow=mesh(g,'ring',0x98774d,.68,1.1,.25,.5,.73,.5);u.bow.rotation.y=Math.PI/2;mesh(g,'box',0xe1d6b8,.68,1.1,.25,.025,1.35,.025);g.scale.setScalar(1.4);}
    else {u.gun=new T.Group();g.add(u.gun);u.gun.position.set(.35,1.25,.4);mesh(u.gun,'box',kind==='revenge'?0x5e4775:0x344b4a,0,0,0,.24,.25,.6);mesh(u.gun,'cyl',0x899c8a,0,0,.42,.065,.6,.065).rotation.x=Math.PI/2;u.muzzle=mesh(u.gun,'cone',0xffdda1,0,0,.85,.13,.4,.13,true);u.muzzle.rotation.x=Math.PI/2;u.muzzle.visible=false;if(kind==='revenge'){g.scale.setScalar(1.9);u.gun.scale.set(2.4,2.4,2.4);mesh(g,'box',0x5f526e,0,1.2,-.5,1,1,.35);}else if(E.BOSSES.includes(kind))g.scale.setScalar(1.35);}
    if(!isPlayer){mesh(g,'box',0x6d5651,0,1.3,-.4,.6,.8,.24);ring(g,0,0,.75,0xcf7363,.04,.55);for(const side of[-1,1])mesh(g,'box',0x424e48,side*.47,1.55,.02,.34,.28,.6);}
    if(kind==='gunner'){mesh(g,'cyl',0x8fac9e,0,2.05,0,.43,.18,.43);mesh(g,'box',0x192f31,0,1.83,.34,.62,.15,.1);for(const side of[-1,1])mesh(g,'box',0xd1b77e,side*.4,1.1,-.55,.2,.55,.15);}
    if(kind==='sniper'){mesh(g,'cone',0x897e9f,0,2.12,0,.45,.5,.45);mesh(g,'round',0xf1a79f,.13,1.8,.36,.1,.08,.05,true);if(u.gun){u.gun.scale.z=2;mesh(u.gun,'cyl',0x40554e,0,.2,.1,.12,.4,.12).rotation.x=Math.PI/2;}}
    if(kind==='bomber'){for(const x of[-.35,.35])mesh(g,'round',0xc58d58,x,1.1,-.5,.25,.3,.25);mesh(g,'box',0x4a5d54,0,1.85,.35,.65,.38,.14);}
    if(kind==='stalker'){mesh(g,'cone',0xb7b9a5,.63,.85,.5,.1,.75,.1).rotation.x=.6;mesh(g,'box',0x6f7b64,0,2.03,0,.65,.12,.6);}
    return g;
  }
  const names={mole:'MORTGAGE MOLE',archer:'UNLICENSED ARCHER',sludge:'DIRECTOR OF WASTE',potency:'MR. POTENCY',revenge:'POTENCY / REHIRED',warden:'AUDIT COMMITTEE',stamp:'HEAD OF APPROVALS',rig:'REPOSSESSION RIG'};
  function get(id,create,used){used.add(id);if(!dynamic.has(id))dynamic.set(id,create());return dynamic.get(id);}
  function update(s){
    if(!s?.district)return;if(s.district.id!==districtId)buildWorld(s);
    if(!player||playerClass!==s.protocol.id){if(player)actors.remove(player);player=actor(s.protocol.id);playerClass=s.protocol.id;}
    const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight),portrait=w<h,dt=Math.max(0,Math.min(.1,s.time-lastTime||1/60));lastTime=s.time;
    if(canvas.width!==Math.floor(w*renderer.getPixelRatio())||canvas.height!==Math.floor(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
    const half=portrait?22:18;camera.left=-half*w/h;camera.right=half*w/h;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
    const p=s.player;follow??={x:p.x,z:p.z};const smooth=1-Math.exp(-dt*12);follow.x+=(p.x-follow.x)*smooth;follow.z+=(p.z-follow.z)*smooth;
    const motion=!reduce?shake:0,hit=s.time-s.lastDamage<.15;camera.position.set(follow.x+15+(hit?Math.sin(s.time*150)*motion:0),34,follow.z+26);camera.lookAt(follow.x,0,follow.z-(portrait?3:2));camera.updateMatrixWorld();sun.position.set(p.x-22,35,p.z+18);sun.target.position.set(p.x,0,p.z);
    player.position.set(p.x,p.dash>0?.13:0,p.z);player.rotation.y=p.angle;player.rotation.x=p.dash>0?.18:0;
    player.userData.legs.forEach((m,j)=>m.rotation.x=Math.sin(s.time*13+j*Math.PI)*.42);if(player.userData.shield)player.userData.shield.scale.setScalar(p.guard>0?1.4:1);if(player.userData.gun){const scale={pistol:[1,1,1],rifle:[1,1,1.8],shotgun:[1.7,1.2,1.3],rivet:[1.1,1.1,1.9],arc:[1.5,1.3,1.4],prism:[1.2,1,1.7],mortar:[2.2,1.8,1.6]}[s.weapon]||({beam:[1.8,1.5,2.4],ring:[1.8,1.6,1.7],saw:[1.7,1.4,1.2],rail:[1.1,1,3],mine:[1.6,1.5,1.3],flame:[1.3,1.2,1.8]}[E.weapon(s).mode]||[1.2,1.2,1.8]);player.userData.gun.scale.set(...scale);player.userData.gun.position.z=p.fireCD>E.weapon(s).rate*.6?.28:.4;player.userData.muzzle.visible=p.fireCD>E.weapon(s).rate*.84&&s.shots>0;}
    if(player.userData.muzzle?.visible){muzzle.position.set(p.x+s.aim.x,1.4,p.z+s.aim.z);muzzle.intensity=10;}else muzzle.intensity=0;
    for(const{b,roof,wallMat}of roofs){const inside=Math.abs(p.x-b.x)<b.w/2+2&&Math.abs(p.z-b.z)<b.d/2+3;roof.visible=!(Math.abs(p.x-b.x)<b.w/2+3&&Math.abs(p.z-b.z)<b.d/2+5);wallMat.transparent=inside;wallMat.opacity=inside?.3:1;wallMat.depthWrite=!inside;}
    core.children[1].material=material(s.base.hp<s.base.maxHp*.3?0xf28e6b:0xb9e4bb,true);core.children[1].rotation.y=s.time;extraction.material=material(s.guardianDown?0xc5f58f:s.time>=60?0x85cdb6:0x526b69,true);
    s.relays.forEach((r,i)=>{const a=relayObjects[i];a.glow.material=material(r.on?0xa6ecc2:0xf0bd77,true);a.halo.material=material(r.on?0xa6ecc2:0xf0bd77,true);a.glow.rotation.y=s.time;a.badge.visible=!r.on;});
    const used=new Set();
    for(const e of s.enemies){if(Math.hypot(e.x-p.x,e.z-p.z)>45)continue;const m=get('enemy'+e.id,()=>actor(e.kind),used),u=m.userData;m.position.set(e.x,u.float?Math.sin(s.time*3+e.id)*.25:0,e.z);m.rotation.y=e.angle;m.rotation.z=e.flash>0?.09:0;m.visible=e.state!=='burrow';if(e.emerge>0){m.visible=true;m.position.y=-5*e.emerge/.6;}u.legs?.forEach((l,j)=>l.rotation.x=Math.sin(s.time*9+j*Math.PI)*.4);if(u.stamp)u.stamp.position.y=e.state==='stampWind'?1.2+Math.sin(e.wind*2)*.3:e.state==='recover'?.35:.6;if(u.weak)u.weak.visible=e.exposed||e.kind==='sludge';if(u.bow)u.bow.scale.z=e.state==='bow'?1.3:1;if(u.muzzle)u.muzzle.visible=e.state==='cannon';
      if(e.boss){const badge=get('badge'+e.id,()=>sprite(actors,names[e.kind]||e.kind,'#f0d4a5',6),used);badge.position.set(e.x,e.kind==='sludge'?8.2:5.4,e.z);}
      if(['wind','bow','cannon','burrow','charge','hammer','spit','pounceWind','forkWind','stampWind','plant','winch'].includes(e.state)){const color=e.state==='burrow'&&e.wind>.65?0xd0b28a:0xffa273;const r=get('tell'+e.id,()=>ring(effects,0,0,1,color),used);r.position.set(e.x,.12,e.z);r.material=material(color,true);r.scale.setScalar(e.kind==='mole'?4:e.kind==='revenge'?3:1.3);if(['bow','charge','wind','forkWind','pounceWind'].includes(e.state)&&['lancer','archer','sniper','surveyor','rig','skitter'].includes(e.kind)){const line=get('line'+e.id,()=>mesh(effects,'box',0xf5a67d,0,.16,0,.09,.035,18,true,.7),used);line.position.set(e.x+e.vx*9,.16,e.z+e.vz*9);line.rotation.y=Math.atan2(e.vx,e.vz);}}
    }
    for(const e of s.enemies)if(!e.dead&&Math.hypot(e.x-p.x,e.z-p.z)<29){
      if(e.hp<e.maxHp||e.boss||e.protection){const a=get('hpback'+e.id,()=>mesh(effects,'box',0x19272b,0,0,0,1.8,.13,.12,true),used),b=get('hpfill'+e.id,()=>mesh(effects,'box',0xf3a091,0,0,0,1.72,.09,.14,true),used),y=e.kind==='sludge'?6:e.boss?4.5:2.65;a.position.set(e.x,y,e.z);a.rotation.y=.52;b.position.set(e.x-(1-e.hp/e.maxHp)*.7,y+.01,e.z+(1-e.hp/e.maxHp)*.4);b.rotation.y=.52;b.scale.x=1.72*Math.max(0,e.hp/e.maxHp);}
      if(e.protection){const shield=get('insurance'+e.id,()=>ring(effects,0,0,1,0x7acde9,.08,.65),used);shield.position.set(e.x,.08,e.z);}
      if(e.kind==='insurer'){const aura=get('aura'+e.id,()=>ring(effects,0,0,7,0x79c8e4,.04,.24),used);aura.position.set(e.x,.04,e.z);}
    }
    for(const cache of s.caches){const m=get('cache'+cache.id,()=>{const g=new T.Group();actors.add(g);mesh(g,'box',0x68775d,0,.55,0,1.7,1.1,1);mesh(g,'box',cache.id===2?0xba9ddb:0xe1c786,0,1.15,0,1.9,.12,1.1);mesh(g,'box',0x9bb189,0,.65,.52,.18,.25,.05,true);return g;},used);m.position.set(cache.x,0,cache.z);m.rotation.z=cache.open?.12:0;m.scale.y=cache.open?.6:1;if(!cache.claimed&&Math.hypot(cache.x-p.x,cache.z-p.z)<15){const label=get('cachelabel'+cache.id+cache.unsealed,()=>sprite(actors,cache.type==='vault'?(cache.unsealed?'VAULT OPEN / CLAIM REWARD':'ELITE VAULT / SUMMON GUARD'):cache.label,cache.type==='vault'?'#efb6cb':'#eddaa4',7),used);label.position.set(cache.x,2.8,cache.z);}}
    for(const t of [...s.turrets,...(s.sentry?[s.sentry]:[])]){const m=get('turret'+t.id,()=>{const g=new T.Group();actors.add(g);mesh(g,'cyl',0x4b615b,0,.5,0,.55,1,.55);mesh(g,'box',t.temporary?0xd5b676:0xb5c99e,0,1.1,.15,.8,.5,1.3);mesh(g,'round',0xa8db9d,0,1.12,.9,.09,.09,.1,true);if(t.temporary){const rat=actor('allyRat',g);rat.position.y=1.4;rat.scale.setScalar(.8);}return g;},used);m.position.set(t.x,0,t.z);m.rotation.y=t.angle;m.rotation.x=t.cd>.35?-.1:0;}
    for(const r of s.rats){if(Math.hypot(r.x-p.x,r.z-p.z)>30)continue;const m=get('rat'+r.id,()=>actor('ambientRat'),used);m.position.set(r.x,.03+Math.abs(Math.sin(s.time*13+r.id))*.035,r.z);m.rotation.y=r.angle;}
    if(E.weapon(s).orbit)for(let j=0;j<Math.min(6,E.weapon(s).orbit);j++){const m=get('orbital'+j,()=>actor('allyRat'),used),a=s.time*2.7+j*Math.PI*2/E.weapon(s).orbit;m.position.set(p.x+Math.sin(a)*2.7,1,p.z+Math.cos(a)*2.7);m.rotation.y=a+Math.PI/2;}
    const playerRing=get('player-ring',()=>{const r=ring(effects,0,0,.63,0xd3eda4);r.material=r.material.clone();r.material.depthTest=false;r.material.depthWrite=false;r.renderOrder=3;return r;},used);playerRing.position.set(p.x,.04,p.z);playerRing.scale.setScalar(p.dash>0?.8:1);const reticle=get('reticle',()=>{const g=new T.Group();effects.add(g);ring(g,0,0,.36,0xd7efae);for(const sign of[-1,1])mesh(g,'box',0xd7efae,sign*.65,.05,0,.26,.03,.055,true);return g;},used);reticle.position.set(s.aimPoint?.x??p.x+s.aim.x*7,.12,s.aimPoint?.z??p.z+s.aim.z*7);reticle.scale.setScalar(1+p.charge*.5);
    if(p.guard>0){const shield=get('guard',()=>mesh(effects,'box',0xa7e3cf,0,1,0,2.2,2,.06,true,.5),used);shield.position.set(p.x+s.aim.x,1.2,p.z+s.aim.z);shield.rotation.y=p.angle;}
    for(const pool of bullets)pool.count=0;
    for(const b of s.bullets){if(Math.hypot(b.x-p.x,b.z-p.z)>46)continue;const pool=bullets[b.hostile?1:b.returned?2:0];if(pool.count>=640)continue;bulletDummy.position.set(b.x,.85,b.z);bulletDummy.scale.set(b.splash?.22:b.hostile?.14:.075,b.splash?.22:b.hostile?.14:.075,b.splash?.6:b.hostile?.5:.7);bulletDummy.rotation.set(0,Math.atan2(b.vx,b.vz),0);bulletDummy.updateMatrix();pool.setMatrixAt(pool.count++,bulletDummy.matrix);}for(const pool of bullets)pool.instanceMatrix.needsUpdate=true;
    particles.count=0;
    for(const z of s.zones){const danger=z.age>=z.warn,good=['plasma','chemical'].includes(z.kind),color=good?0x8cdeca:danger?0xfb9375:0xf6ca8c;const marker=get('zone'+z.id,()=>{const g=new T.Group();effects.add(g);ring(g,0,0,1,color);const disc=mesh(g,'disc',color,0,.01,0,1,1,1,true,.16);disc.rotation.x=-Math.PI/2;return g;},used);marker.position.set(z.x,.08,z.z);if(z.shape==='rect'){marker.children[0].visible=false;marker.children[1].visible=false;const rect=get('zonerect'+z.id,()=>{const g=new T.Group();effects.add(g);mesh(g,'box',0xf4aa86,0,0,0,1,.025,1,true,.14);for(const side of[-1,1]){mesh(g,'box',0xffbf95,side*.5,.02,0,.025,.03,1,true);mesh(g,'box',0xffbf95,0,.02,side*.5,1,.03,.025,true);}return g;},used);rect.position.set(z.x,.1,z.z);rect.rotation.y=-(z.angle||0);rect.scale.set(z.w,1,z.d);}else marker.scale.setScalar(z.r);marker.children[0].material=material(color,true);marker.children[1].material=material(color,true,danger?.23:.09);}
    armoryEffects(s,used);
    for(let k=0;k<s.effects.length;k++){const f=s.effects[k];if(Math.hypot(f.x-p.x,f.z-p.z)>40)continue;
      if(f.kind==='damage'&&s.effects.length<75){const id='number'+f.id;const m=get(id,()=>sprite(actors,String(f.amount),'#fff1be',1.4),used);m.position.set(f.x,2.5+(1-f.life/.65),f.z);m.material.opacity=Math.min(1,f.life*3);}
      else if(f.kind==='arc'){const m=get('arc'+k,()=>mesh(effects,'box',0xa2ece5,0,1,0,.08,.08,1,true),used);m.position.set((f.x+f.tx)/2,1,(f.z+f.tz)/2);m.scale.z=Math.hypot(f.tx-f.x,f.tz-f.z);m.rotation.y=Math.atan2(f.tx-f.x,f.tz-f.z);}
      else{const age=Math.max(0,1-f.life/(f.kind==='eruption'?1.1:.5));for(let j=0;j<(f.kind==='eruption'?18:5)&&particles.count<480;j++){const a=j*2.4+k;bulletDummy.position.set(f.x+Math.sin(a)*age*3,Math.max(.15,age*3-age*age*2),f.z+Math.cos(a)*age*3);bulletDummy.scale.setScalar(Math.max(.02,(1-age)*.15));bulletDummy.rotation.set(a,age*3,a);bulletDummy.updateMatrix();particles.setMatrixAt(particles.count++,bulletDummy.matrix);}}
      if(f.kind==='pulse'){const m=get('pulse'+k,()=>ring(effects,0,0,1,0xb6e6c9),used);m.position.set(f.x,.25,f.z);m.scale.setScalar((1-f.life/.45)*6);}
    }particles.instanceMatrix.needsUpdate=true;
    rain.visible=s.district.id!==3&&!reduce&&quality!=='low';if(rain.visible){for(let j=0;j<180;j++){const i=j*6,x=p.x+((j*7.13)%56)-28,z=p.z+((j*11.71)%56)-28,y=14-((s.time*13+j*.13)%14);rainPositions.set([x,y,z,x-.13,y-.65,z+.08],i);}rainGeo.attributes.position.needsUpdate=true;}
    for(const[id,m]of dynamic)if(!used.has(id)){m.parent?.remove(m);m.traverse(o=>{if(o.isSprite){textures.delete(o.material.map);o.material.map.dispose();o.material.dispose();}});dynamic.delete(id);}
    renderer.render(scene,camera);
  }
  const ray=new T.Raycaster(),mouse=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),0),point=new T.Vector3();
  return{update,direction(x,z){const a=Math.atan2(15,26);return{x:x*Math.cos(a)+z*Math.sin(a),z:-x*Math.sin(a)+z*Math.cos(a)};},aim(x,y){const b=canvas.getBoundingClientRect();mouse.set((x-b.left)/b.width*2-1,-(y-b.top)/b.height*2+1);ray.setFromCamera(mouse,camera);return ray.ray.intersectPlane(plane,point)?{x:point.x,z:point.z}:null;},project(x,z){point.set(x,0,z).project(camera);return{x:(point.x+1)/2*canvas.clientWidth,y:(1-point.y)/2*canvas.clientHeight};},setOptions(options){shake=Number(options.shake)||0;quality=options.quality||'auto';renderer.setPixelRatio(Math.min(devicePixelRatio||1,quality==='low'?1:coarse?1.35:1.8));renderer.shadowMap.enabled=quality!=='low'&&!coarse;},info:()=>({...renderer.info,savedWorldDraws:world.userData.savedDraws||0}),dispose(){renderer.dispose();renderer.forceContextLoss();scene.traverse(o=>{if(o.isSprite)o.material.dispose();if(o.material&&!Array.from(materials.values()).includes(o.material)){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});for(const t of textures)t.dispose();for(const g of Object.values(geo))g.dispose();for(const g of customGeometries)g.dispose();for(const m of materials.values())m.dispose();sun.shadow.map?.dispose();}};
}
