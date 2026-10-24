import fs from'node:fs/promises';
const old=await fs.readFile('work/v5/blacksite.js','utf8');let code=old.slice(0,old.indexOf('function destroy(){'));
const start=code.indexOf("const tile=document.createElement('canvas')"),end=code.indexOf("const player=actor('player')");if(start<0||end<0)throw Error('Cannot locate v5 renderer');code=code.slice(0,start)+(await fs.readFile('work/v6/world.js','utf8'))+'\n'+code.slice(end);
code=code.replace("const player=actor('player')", "const bulletPools=[new T.InstancedMesh(geos.round,mat(0xc4efb4,true),640),new T.InstancedMesh(geos.round,mat(0xee9870,true),640)];for(const pool of bulletPools){pool.instanceMatrix.setUsage(T.DynamicDrawUsage);pool.frustumCulled=false;pool.count=0;scene.add(pool);}const dummy=new T.Object3D();const player=actor('player')");
code=code.replace("camera.position.set(p.x*.6,portrait?29:24,p.z*.6+(portrait?22:18));camera.lookAt(p.x*.6,0,p.z*.6-1)","camera.position.set(p.x,portrait?29:24,p.z+(portrait?23:19));camera.lookAt(p.x,0,p.z-2)");
code=code.replace("liftBeacon.visible=s.bossDown;liftBeacon.position.y=3.7+Math.sin(s.time*3)*.2;extraction.material=mat(s.bossDown?0xb9f18e:0x497e7b,true)","liftBeacon.visible=true;liftBeacon.position.y=3.7+Math.sin(s.time*3)*.2;extraction.material=mat(s.time>=60?0xb9f18e:0x497e7b,true);for(const {b,roof} of roofs)roof.visible=!(Math.abs(p.x-b.x)<b.w/2+4&&Math.abs(p.z-b.z)<b.d/2+7);coreRotor.rotation.z=s.time;core.children[1].material=mat(s.base.hp<250?0xe2916d:0x91d7b6,true)");
code=code.replace("for(const e of s.enemies){const m=", "for(const e of s.enemies){if(Math.hypot(e.x-p.x,e.z-p.z)>39)continue;const m=");
code=code.replace("m.position.set(e.x,e.stun>0?.1:0,e.z);m.rotation.y=e.angle;", "m.position.set(e.x,e.stun>0?.1:0,e.z);m.rotation.y=e.angle;m.rotation.z=Math.sin(s.time*3+e.id)*.025;if(e.kind==='sludge')m.scale.y=3*(1+Math.sin(s.time*2)*.05);if(e.kind==='mole'){m.visible=e.state!=='burrow'||e.wind>2.65;m.position.y=e.state==='burrow'?-Math.min(4,(3-e.wind)*12):e.emerge>0?-4*e.emerge/.6:0;m.rotation.x=e.state==='burrow'?.5:0;}");
code=code.replace("if(e.state==='wind'){", "if(['wind','bow','cannon','burrow'].includes(e.state)){");
code=code.replace("e.kind==='sniper'||e.kind==='lancer'", "e.kind==='sniper'||e.kind==='lancer'||e.kind==='archer'");
const bs=code.indexOf('for(const b of s.bullets){'),be=code.indexOf('for(let i=0;i<s.relays.length;',bs);code=code.slice(0,bs)+`for(const pool of bulletPools)pool.count=0;for(const b of s.bullets){if(Math.hypot(b.x-p.x,b.z-p.z)>42)continue;const pool=bulletPools[b.hostile?1:0];dummy.position.set(b.x,.8,b.z);dummy.scale.setScalar(b.hostile?.19:b.plasma?.23:.14);dummy.updateMatrix();pool.setMatrixAt(pool.count++,dummy.matrix);}for(const pool of bulletPools)pool.instanceMatrix.needsUpdate=true;
for(const c of s.caches){const m=get('cache'+c.id,()=>mesh('box',0x9d9169,0,.6,0,1.4,1.2,1,scene));m.position.set(c.x,.6,c.z);m.material=mat(c.open?0x3d5548:0xb5a66e);}
for(const t of s.turrets){const m=get('turret'+t.id,()=>{const g=new T.Group();scene.add(g);mesh('cyl',0x4e665a,0,.6,0,.6,1.2,.6,g);const gun=mesh('box',0xabc3a1,0,1.45,.3,.7,.5,1.2,g);mesh('round',0xb5ecd1,0,1.5,.95,.16,.16,.08,g,true);g.userData.gun=gun;return g;});m.position.set(t.x,0,t.z);m.rotation.y=t.angle;m.userData.gun.position.z=t.cd>.4?.15:.3;}
for(const r of s.rats){if(Math.hypot(r.x-p.x,r.z-p.z)>35)continue;const m=get('rat'+r.id,ratModel);m.position.set(r.x,.02+Math.abs(Math.sin(s.time*15+r.id))*.05,r.z);m.rotation.y=r.angle;}
const merchant=get('merchant',()=>actor('player'));merchant.position.set(-4,0,1.4);merchant.rotation.y=Math.sin(s.time)*.3;merchant.userData.legs[0].rotation.x=Math.sin(s.time*3)*.2;
if(E.weapon(s).mods.includes('orbit'))for(let j=0;j<3;j++){const m=get('orbital'+j,ratModel),a=s.time*2.7+j*Math.PI*2/3;m.position.set(p.x+Math.sin(a)*2.7,1,p.z+Math.cos(a)*2.7);m.rotation.y=a+Math.PI/2;}
`+code.slice(be);
code=code.replace("ring(0,0,z.r,0xff755c)","ring(0,0,z.r,z.kind==='plasma'?0x92e1de:z.kind==='sludge'?0xb3bd69:0xf7af7b)");
const zs=code.indexOf('const phase=s.floorTime%12;'),ze=code.indexOf('for(const [id,m]of objects)',zs);if(zs>=0)code=code.slice(0,zs)+code.slice(ze);
code=code.replace("if(fx.kind==='pulse'", "if(fx.kind==='pulse'");
code=code.replaceAll("e.kind==='warden'?2.3:1.1","e.kind==='mole'?4:e.kind==='warden'?2.3:1.1");
code=code.replace("reticle.position.set(p.x+s.aim.x*4", "if(player.userData.gun)player.userData.gun.position.z=p.fireCD>E.weapon(s).rate*.7?.38:.5;player.rotation.x=p.dash>0?.18:0;reticle.position.set(p.x+s.aim.x*4");
code=code.replace("const fx=s.effects[j],m=get", "const fx=s.effects[j];if(fx.kind==='arc'){const m=get('arc'+j+fx.x+fx.z,()=>mesh('box',0xa9e9ed,0,1,0,.08,.08,1,scene,true));m.position.set((fx.x+fx.tx)/2,1,(fx.z+fx.tz)/2);m.scale.z=Math.hypot(fx.tx-fx.x,fx.tz-fx.z);m.rotation.y=Math.atan2(fx.tx-fx.x,fx.tz-fx.z);continue;}const m=get");
code=code.replace('player.visible=p.inv<=0||Math.sin(s.time*35)>-.5;','player.visible=true;');
code=code.replace("const player=actor('player'),reticle=",(await fs.readFile('work/v6/visual-effects.js','utf8'))+"\nconst player=actor('player'),reticle=");
code=code.replace("for(const [id,m]of objects)if(!used.has(id)){scene.remove(m);objects.delete(id);}","visualUpdate(s,get);for(const [id,m]of objects)if(!used.has(id)){m.userData.dispose?.();scene.remove(m);objects.delete(id);}");
code=code.replace("const fx=s.effects[j];if(fx.kind==='arc')", "const fx=s.effects[j];if(['burrow-dust','eruption','impact','shield-spark'].includes(fx.kind))continue;if(fx.kind==='arc')");
await fs.writeFile('work/v6/blacksite.js',code+'\n'+await fs.readFile('work/v6/controller.js','utf8'));
console.log('Composed shelter world, optimized projectile rendering and controller.');
