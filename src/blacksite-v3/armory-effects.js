/* Typed rewards and delivery geometry use shared geometry/material caches. */
function armoryEffects(s,used){
 const palette={fire:0xff8c64,shock:0x9cf2ea,ice:0xb9dffa,acid:0xb0df70,kinetic:0xe8e9ae},rarities=root.KMEBlacksiteArmory.rarity,p=s.player;
 for(const beam of s.beams)for(let j=0;j<beam.segments.length;j++){
  const line=beam.segments[j],d=Math.hypot(line.bx-line.ax,line.bz-line.az),color=palette[colour(beam.payload)]||0xff8f83;
  const group=get('beam'+beam.id+':'+j,()=>{const g=new T.Group();effects.add(g);mesh(g,'box',0x541e26,0,0,0,1,.45,1,true,.35);mesh(g,'box',color,0,0,0,.55,.22,1,true,.85);mesh(g,'box',0xfff1ce,0,0,0,.16,.09,1,true);return g;},used);
  group.position.set((line.ax+line.bx)/2,.95,(line.az+line.bz)/2);group.rotation.y=Math.atan2(line.bx-line.ax,line.bz-line.az);group.scale.set(beam.width*2*(1+(beam.payload.wobble?Math.sin(s.time*24)*.15:0)),1,d);
 }
 for(const r of s.rings){const m=get('ring-shot'+r.id,()=>{const g=new T.Group();effects.add(g);ring(g,0,0,1,0x172c36,.75);ring(g,0,0,1,0xb1a6ff,.82);ring(g,0,0,.92,0xc7fff0,.86);return g;},used);m.position.set(r.x,0,r.z);m.scale.set(r.radius,1,r.radius);m.rotation.y=s.time;}
 for(const b of s.bullets)if(!b.hostile&&b.shape==='saw'){const m=get('saw'+b.id,()=>{const g=new T.Group();effects.add(g);ring(g,0,0,.45,0xe9dec3,.75);for(let j=0;j<8;j++){const a=j*Math.PI/4,t=mesh(g,'cone',0xc6d6c1,Math.sin(a)*.5,.75,Math.cos(a)*.5,.13,.35,.13);t.rotation.x=Math.PI/2;t.rotation.z=a;}return g;},used);m.position.set(b.x,0,b.z);m.rotation.y=s.time*20;}
 for(const m of s.mines){const model=get('mine'+m.id,()=>{const g=new T.Group();actors.add(g);mesh(g,'cyl',0x6d7a52,0,.18,0,.45,.25,.45);mesh(g,'round',0xbcf8b0,0,.37,0,.15,.09,.15,true);ring(g,0,0,2.8,0xc9e3a2,.04,.25);return g;},used);model.position.set(m.x,0,m.z);model.children[1].visible=m.arm<=0||Math.sin(s.time*12)>0;}
 for(const f of s.fields){const color=palette[colour(f.payload)],m=get('field'+f.id,()=>{const g=new T.Group();effects.add(g);const disc=mesh(g,'disc',color,0,.06,0,1,1,1,true,.22);disc.rotation.x=-Math.PI/2;ring(g,0,0,1,color,.08,.7);return g;},used);m.position.set(f.x,0,f.z);m.scale.setScalar(f.r);}
 for(const bomb of s.enemyBombs){const m=get('enemybomb'+bomb.id,()=>{const g=new T.Group();actors.add(g);mesh(g,'cyl',0x483c34,0,.3,0,.5,.6,.5);mesh(g,'round',0xff6c59,0,.7,0,.18,.18,.18,true);ring(g,0,0,3.3,0xff685a,.04,.65);const label=sprite(g,'SHOOT / PARRY TO DEFUSE','#ffc1a0',5);label.position.y=1.7;return g;},used);m.position.set(bomb.x,0,bomb.z);m.children[1].visible=Math.sin(s.time*18)>0;}
 const nearest=s.drops.filter(d=>d.life>0&&Math.hypot(d.x-p.x,d.z-p.z)<18).sort((a,b)=>Number(['mod','weapon','blueprint'].includes(b.kind))-Number(['mod','weapon','blueprint'].includes(a.kind))||Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)).slice(0,9);
 for(const d of s.drops){
  if(d.life<=0||Math.hypot(d.x-p.x,d.z-p.z)>40)continue;
  const special=['mod','weapon','blueprint'].includes(d.kind),color=special?rarities[d.tier].color:d.kind==='heal'?'#8bf0c0':d.kind==='part'?'#a6d5ff':d.kind==='voucher'?'#d8b1ff':'#ebd09a';
  const m=get('drop'+d.id,()=>{const g=new T.Group();actors.add(g);ring(g,0,0,special?.75:.38,color,.05,.75);
   if(d.kind==='heal'){mesh(g,'box',0x284a40,0,.45,0,.65,.5,.55);mesh(g,'box',color,0,.74,0,.45,.035,.12,true);mesh(g,'box',color,0,.75,0,.12,.035,.4,true);}
   else if(d.kind==='mod'){mesh(g,'box',0x35494b,0,.6,0,.65,.65,.16);mesh(g,'ico',color,0,.6,.13,.25,.25,.1,true);for(const x of[-.4,.4])mesh(g,'box',0xc5ba8c,x,.6,0,.15,.5,.09);}
   else if(d.kind==='blueprint'){mesh(g,'box',0x314766,0,.5,0,.75,.08,.6);mesh(g,'box',color,0,.55,0,.6,.02,.04,true);mesh(g,'box',color,.15,.55,0,.04,.02,.4,true);}
   else if(d.kind==='weapon'){mesh(g,'box',color,0,.55,0,.3,.3,1,true);mesh(g,'box',0x597368,0,.37,-.12,.2,.5,.25);}
   else if(d.kind==='part'){mesh(g,'cyl',color,0,.3,0,.3,.25,.3);ring(g,0,0,.18,0x304b53,.44);}
   else mesh(g,d.kind==='voucher'?'box':'ico',color,0,.4,0,.28,.3,.28,true);
   if(special)mesh(g,'box',color,0,1.65,0,.055,2.3,.055,true,.45);return g;},used);
  m.position.set(d.x,.07+Math.sin(s.time*3+d.id)*.07,d.z);if(special)m.rotation.y=s.time*.5;
  if(nearest.includes(d)){const label=get('lootlabel'+d.id,()=>sprite(actors,(d.kind==='mod'?'MOD / ':d.kind==='blueprint'?'BLUEPRINT / ':d.kind==='weapon'?'WEAPON / ':'')+E.lootName(d),color,special?7:4),used);label.position.set(d.x,special?2.8:1.6,d.z);}
 }
}
function colour(p){return p.acid>p.ember&&p.acid>p.shock?'acid':p.chill>p.ember&&p.chill>p.shock?'ice':p.ember>p.shock?'fire':p.shock?'shock':'kinetic';}
