/* Shared delivery/impact engine. No modifier-pair or weapon/mod ID matrix. */
const REACTIONS=[
 {id:'shatter',needs:{chill:1.2},incoming:{impact:1.1},consume:['chill'],effect:'burst',radius:3.3,power:.6,color:'ice'},
 {id:'thermal',needs:{chill:.65},incoming:{ember:.1},consume:['chill'],effect:'burst',radius:3,power:.5,color:'steam'},
 {id:'conduction',needs:{chill:.4},incoming:{shock:.1},consume:[],effect:'chain',count:2,power:.35,color:'shock'},
 {id:'volatile',needs:{acid:.7},incoming:{ember:.1},consume:['acid'],effect:'burst',radius:3.8,power:.55,color:'acid'}
];
function weapon(s){
 const ids=s.weapons[s.weapon]?.mods||[],stamp=s.weapon+'|'+ids.join(',')+'|'+Object.values(s.perks).join(',');
 if(s.compiledStamp!==stamp){s.compiledStamp=stamp;s.compiledWeapon=A.compile(s.weapon,ids,s.perks);}
 return{...s.compiledWeapon,mods:ids,reactionPower:s.protocol.id==='chemist'?1.6:1};
}
function friendlyPayload(b){
 if(b.payload)return b.payload;
 const p=A.compile('pistol');Object.assign(p,{damage:b.damage,shock:b.electric?1:0,chill:b.frost?.8:0,ember:b.plasma?.7:0,pools:b.plasma?1:0,chains:b.electric?2:0,pierce:b.pierce||0,bounces:b.bounces||0,splash:b.splash||0});b.payload=p;return p;
}
function hitRadius(e){return e.kind==='sludge'?2.3:e.boss?1.15:e.kind==='rat'||e.kind==='skitter'?.6:.7;}
function colourOf(p){return p.acid>p.ember&&p.acid>p.shock?'acid':p.chill>p.ember&&p.chill>p.shock?'ice':p.ember>p.shock?'fire':p.shock>0?'shock':'kinetic';}
function emitPacket(s,p,x,z,angle,scale=1,depth=0,charge=1){
 if(s.bullets.length>=640&& !['beam','rail','ring'].includes(p.mode))return;
 if(['beam','rail'].includes(p.mode)&&p.homing>0){const desired=targetDirection(s,{x,z},p);if(desired!==null){const delta=Math.atan2(Math.sin(desired-angle),Math.cos(desired-angle));angle+=clamp(delta,-.16,.16);}}
 const payload={...p,damage:p.damage*scale},vx=Math.sin(angle)*p.speed,vz=Math.cos(angle)*p.speed;
 if(p.mode==='beam'||p.mode==='rail'){
  const segments=[];let ox=x,oz=z,a=angle,left=p.range,rebounds=Math.round(p.bounces);
  for(let segment=0;segment<=rebounds&&left>1;segment++){
   let ex=ox,ez=oz,wall=false;for(let d=.4;d<=left;d+=.4){const nx=ox+Math.sin(a)*d,nz=oz+Math.cos(a)*d;if(blocked(s,nx,nz,.1)){wall=true;break;}ex=nx;ez=nz;}
   const distance=len(ex-ox,ez-oz);segments.push({ax:ox,az:oz,bx:ex,bz:ez});left-=distance;if(!wall||segment===rebounds)break;
   const dx=Math.sin(a),dz=Math.cos(a),bx=blocked(s,ex+dx*.5,ez,.1),bz=blocked(s,ex,ez+dz*.5,.1);a=Math.atan2(bx?-dx:dx,bz?-dz:dz);ox=ex+Math.sin(a)*.3;oz=ez+Math.cos(a)*.3;left-=.5;
  }
  if(s.beams.length<18)s.beams.push({id:++s.serial,kind:p.mode,segments,payload,life:p.mode==='rail'?.16:p.duration,initial:p.mode==='rail'?.16:p.duration,tick:0,hits:{},depth,width:p.width*p.size*(.6+charge*.6)});
 }else if(p.mode==='ring'){
  if(s.rings.length<20)s.rings.push({id:++s.serial,x,z,vx,vz,payload,radius:.6,targetRadius:p.radius*(.65+charge*1.15),width:p.width*p.size,life:p.duration,hits:{},tick:0,age:0,bounces:Math.round(p.bounces),depth});
 }else{
  s.bullets.push({id:++s.serial,x,z,originX:x,originZ:z,vx,vz,angle,hostile:false,damage:payload.damage,payload,life:p.mode==='mine'?.7:p.lifetime,r:.16*p.size,hit:[],hitTimes:{},pierce:Math.round(p.pierce),bounces:Math.round(p.bounces),shape:p.mode,depth,age:0,returning:p.returning>0||p.mode==='saw',returnDelay:p.mode==='saw'?(p.returnDelay||.65):Infinity,returned:false,splitDone:false});
 }
}
function emitAttack(s,p,scale=1,charge=1,echo=false){
 const player=s.player;let ox=player.x,oz=player.z;for(let d=.15;d<=.91;d+=.15){const nx=player.x+s.aim.x*d,nz=player.z+s.aim.z*d;if(blocked(s,nx,nz,.12))break;ox=nx;oz=nz;}const angles=p.angles||[0],count=Math.min(24,Math.round(p.pellets));let emitted=0;
 for(const baseAngle of angles)for(let j=0;j<count&&emitted<24;j++,emitted++){
  const spread=count>1?(j/(count-1)-.5)*p.spread:0;
  emitPacket(s,p,ox,oz,player.angle+baseAngle+spread,scale,0,charge);
 }
 s.shots++;s.effects.push({kind:'muzzle',x:player.x+s.aim.x,z:player.z+s.aim.z,life:.09,angle:player.angle,color:colourOf(p)});
 if(p.echo&&!echo&&s.echoes.length<16)s.echoes.push({at:s.time+.16,payload:{...p,echo:0},scale:scale*.48,charge});
 if(p.relay>0&&player.linkCD<=0){player.linkCD=.35;for(const t of s.turrets)if(len(t.x-player.x,t.z-player.z)<16)shot(s,t.x,t.z,player.angle,36,false,p.damage*.24,{payload:{...p,damage:p.damage*.24,split:0,cluster:0,pools:0}});}
 if(p.nova>0&&s.time-s.lastNova>=5){s.lastNova=s.time;radialImpact(s,player.x,player.z,5,{...p,damage:p.damage*.6,split:0,cluster:0},0);s.effects.push({kind:'pulse',x:player.x,z:player.z,life:.45});}
}
function fire(s){const p=weapon(s),boost=s.player.infusion>0;emitAttack(s,p,boost?1.65:1);s.player.fireCD=Math.max(-.05,s.player.fireCD)+p.rate/(boost?1.8:1);}
function triggerWeapon(s,dt,input){
 const p=s.player,g=weapon(s);p.holdAge=input.fire?p.holdAge+dt:0;
 const moving=len(input.mx||0,input.mz||0)>.15,scale=(p.infusion>0?1.65:1)*(p.empowered?1.8:1)*(1+(moving?g.momentum:0));
 if(p.guard>0){p.charge=0;p.fireHeld=false;s.burst=null;return;}
 if(['beam','ring','rail'].includes(g.mode)){
  if(input.fire){p.charge=Math.min(g.charge,p.charge+dt*(1+g.ramp*Math.min(1,p.holdAge)));p.fireHeld=true;}
  else if(p.fireHeld){if(p.charge>=g.minCharge&&p.fireCD<=0){const ratio=clamp(p.charge/g.charge,.2,1);emitAttack(s,g,scale*(.45+ratio*.75),ratio);p.empowered=false;p.fireCD=g.rate;}p.charge=0;p.fireHeld=false;}
 }else{
  p.charge=0;p.fireHeld=!!input.fire;
  if(input.fire&&p.fireCD<=0&&!s.burst){
   if(g.mode==='burst'){s.burst={remaining:g.burst||3,next:s.time,payload:g,scale};p.fireCD=g.rate;}
   else{emitAttack(s,g,scale);p.fireCD=Math.max(-.05,p.fireCD)+g.rate/((p.infusion>0?1.8:1)*(1+g.ramp*Math.min(1,p.holdAge/2)));}
   p.empowered=false;
  }
 }
 if(s.burst&&s.time>=s.burst.next){emitAttack(s,s.burst.payload,s.burst.scale);s.burst.remaining--;s.burst.next=s.time+(s.burst.payload.burstGap||.08);if(s.burst.remaining<=0)s.burst=null;}
 for(const echo of s.echoes)if(echo.at<=s.time){emitAttack(s,echo.payload,echo.scale,echo.charge,true);echo.done=true;}s.echoes=s.echoes.filter(e=>!e.done);
}
function radialImpact(s,x,z,radius,payload,depth=0,exclude=null){
 for(const target of s.enemies)if(!target.dead&&target!==exclude&&len(target.x-x,target.z-z)<radius&&clearLine(s,x,z,target.x,target.z))applyImpact(s,target,payload,{x,z,depth,secondary:true,scale:1-.4*len(target.x-x,target.z-z)/radius});
}
function chainImpact(s,start,payload,count,power,depth){
 let previous=start;const visited=new Set([start.id]);for(let j=0;j<Math.min(8,count);j++){
  const target=s.enemies.filter(e=>!e.dead&&!visited.has(e.id)&&len(e.x-previous.x,e.z-previous.z)<payload.chainRadius&&clearLine(s,previous.x,previous.z,e.x,e.z)).sort((a,b)=>len(a.x-previous.x,a.z-previous.z)-len(b.x-previous.x,b.z-previous.z))[0];
  if(!target)break;s.effects.push({kind:'arc',x:previous.x,z:previous.z,tx:target.x,tz:target.z,life:.18});visited.add(target.id);applyImpact(s,target,payload,{x:previous.x,z:previous.z,depth:depth+1,secondary:true,scale:power});previous=target;
 }
}
function applyImpact(s,e,payload,hit={}){
 if(e.dead||e.state==='burrow'||s.hitBudget--<=0)return;
 const depth=hit.depth||0,secondary=!!hit.secondary;
 let amount=payload.damage*(hit.scale??1)*(e.hp/e.maxHp<.33?1+payload.execute:1);if(payload.crit&&s.rng()<payload.crit){amount*=payload.critPower;s.effects.push({id:++s.serial,kind:'critical',x:e.x,z:e.z,life:.45});}
 e.lastPayload=payload;damage(s,e,amount);
 if(payload.leech>0&&s.leechBudget>0){const heal=Math.min(s.leechBudget,amount*payload.leech);s.player.hp=Math.min(s.player.maxHp,s.player.hp+heal);s.leechBudget-=heal;}
 const states=e.elements??={ember:0,chill:0,shock:0,acid:0};for(const key of['ember','chill','shock','acid'])states[key]=Math.min(3,states[key]+(payload[key]||0)*.55);
 e.corrosion=states.acid;e.slow=Math.max(e.slow,states.chill>.25?.5:0);
 if(payload.stagger&&s.time-(e.lastStagger||-5)>.7){e.stun=Math.max(e.stun,e.boss?Math.min(.06,payload.stagger):payload.stagger);e.lastStagger=s.time;}
 if(payload.knockback&&!e.boss){const dx=e.x-(hit.x??s.player.x),dz=e.z-(hit.z??s.player.z),n=len(dx,dz)||1;move(s,e,dx/n*payload.knockback*.22,dz/n*payload.knockback*.22,.5);}
 if(payload.pull&&!secondary)for(const other of s.enemies)if(other!==e&&!other.boss&&len(other.x-e.x,other.z-e.z)<5)move(s,other,(e.x-other.x)*payload.pull*.04,(e.z-other.z)*payload.pull*.04,.5);
 if(!secondary&&depth<2){
  if(payload.chains>0)chainImpact(s,e,payload,Math.round(payload.chains),.55,depth);
  if(payload.splash>0)radialImpact(s,e.x,e.z,payload.splash,{...payload,damage:payload.damage*.8},depth+1,e);
  if(payload.pools>0&&s.fields.length<60&&s.time-(e.lastField||-5)>.45){e.lastField=s.time;s.fields.push({id:++s.serial,x:e.x,z:e.z,r:2.2+Math.min(1,payload.pools*.2),life:payload.fieldLife||2.5,age:0,tick:0,payload:{...payload,damage:payload.damage*.17},depth:depth+1});}
  for(const reaction of REACTIONS){
   if(s.time-(e.reactions?.[reaction.id]??-5)<.75||!Object.entries(reaction.needs).every(([k,v])=>states[k]>=v)||!Object.entries(reaction.incoming).every(([k,v])=>(payload[k]||0)>=v))continue;
   (e.reactions??={})[reaction.id]=s.time;for(const key of reaction.consume)states[key]=0;
   const power=reaction.power*(s.protocol.id==='chemist'?1.6:1);if(reaction.effect==='burst')radialImpact(s,e.x,e.z,reaction.radius,{...payload,damage:payload.damage*power},depth+1,e);else chainImpact(s,e,payload,reaction.count,power,depth+1);
   s.effects.push({kind:'reaction',reaction:reaction.id,color:reaction.color,x:e.x,z:e.z,life:.5});s.stats.reactions=(s.stats.reactions||0)+1;
  }
 }
}
function fragments(s,b,count,radial=false){
 if((b.depth||0)>=1)return;
 const p=friendlyPayload(b);for(let j=0;j<Math.min(10,count);j++){
  const angle=radial?j*TAU/count:Math.atan2(b.vx||s.aim.x,b.vz||s.aim.z)+(j-(count-1)/2)*.32;
  emitPacket(s,{...p,mode:'bullet',split:0,cluster:0,pools:0,echo:0,returning:0,pellets:1,lifetime:1.1},b.x,b.z,angle,.36,(b.depth||0)+1);
 }
}
function endDelivery(s,b){if(b.ended)return;b.ended=true;const p=friendlyPayload(b);if(p.cluster>0)fragments(s,b,Math.round(p.cluster),true);}
function targetDirection(s,b,p){
 const options=s.enemies.filter(e=>!e.dead&&e.state!=='burrow'&&len(e.x-b.x,e.z-b.z)<24&&clearLine(s,b.x,b.z,e.x,e.z));
 options.sort((a,c)=>(len(a.x-b.x,a.z-b.z)/(1+p.priority*Math.sqrt(a.maxHp)*.08))-(len(c.x-b.x,c.z-b.z)/(1+p.priority*Math.sqrt(c.maxHp)*.08)));
 const target=options[0];if(!target)return null;return Math.atan2(target.x-b.x,target.z-b.z);
}
function stepBallistics(s,dt){
 for(const b of [...s.bullets]){
  b.life-=dt;b.age=(b.age||0)+dt;
  if(b.hostile){const spill=()=>{if(b.acidShot&&!b.spilled){b.spilled=true;s.zones.push({id:++s.serial,kind:'acid',x:b.x,z:b.z,r:1.8,age:0,warn:.35,life:3.5,tick:0});}};const nx=b.x+b.vx*dt,nz=b.z+b.vz*dt;if(blocked(s,nx,nz,b.r)){b.life=0;spill();continue;}b.x=nx;b.z=nz;if(len(b.x-s.player.x,b.z-s.player.z)<.7){hurt(s,b.damage,b.x-b.vx*.1,b.z-b.vz*.1);b.life=0;}else if(len(b.x,b.z-2)<2){baseHurt(s,b.damage*.35);b.life=0;}if(b.life<=0)spill();continue;}
  const p=friendlyPayload(b),speed=len(b.vx,b.vz)||p.speed;
  if(b.returning&&(b.returned||b.age>b.returnDelay)){b.returned=true;const dx=s.player.x-b.x,dz=s.player.z-b.z,n=len(dx,dz);if(n<.7){b.life=0;endDelivery(s,b);continue;}b.vx=dx/n*speed;b.vz=dz/n*speed;}
  else if(p.homing>0){const desired=targetDirection(s,b,p);if(desired!==null){const angle=Math.atan2(b.vx,b.vz),delta=Math.atan2(Math.sin(desired-angle),Math.cos(desired-angle)),next=angle+clamp(delta,-p.homing*dt,p.homing*dt);b.vx=Math.sin(next)*speed;b.vz=Math.cos(next)*speed;}}
  if(p.curve&&!b.returned){const a=Math.atan2(b.vx,b.vz)+p.curve*dt;b.vx=Math.sin(a)*speed;b.vz=Math.cos(a)*speed;}
  const sway=p.wobble?Math.sin(b.age*12+b.id)*p.wobble*dt*4:0,nx=b.x+b.vx*dt+Math.cos(b.angle||0)*sway,nz=b.z+b.vz*dt-Math.sin(b.angle||0)*sway;
  if(blocked(s,nx,nz,b.r)||!clearLine(s,b.x,b.z,nx,nz)){
   if(b.shape==='mine'){armMine(s,b);b.life=0;continue;}
   if(b.bounces>0){if(blocked(s,nx,b.z,b.r))b.vx=-b.vx;if(blocked(s,b.x,nz,b.r))b.vz=-b.vz;b.bounces--;continue;}
   if(b.returning&&!b.returned){b.returned=true;b.life=Math.min(2,p.lifetime);continue;}
   if(p.splash)radialImpact(s,b.x,b.z,p.splash,p,b.depth||0);b.life=0;endDelivery(s,b);continue;
  }
  b.x=nx;b.z=nz;for(const bomb of s.enemyBombs)if(!bomb.defused&&len(b.x-bomb.x,b.z-bomb.z)<.8){bomb.defused=true;s.parts++;s.effects.push({kind:'shield-spark',x:bomb.x,z:bomb.z,life:.35});}
  if(b.shape==='mine'&&b.life<=0){armMine(s,b);continue;}
  for(const e of s.enemies){
   if(e.dead||e.state==='burrow'||(b.hitTimes?.[e.id]!==undefined&&(b.shape!=='saw'||s.time-b.hitTimes[e.id]<.23)))continue;
   if(segmentDistance(e.x,e.z,b.x-b.vx*dt,b.z-b.vz*dt,b.x,b.z)>hitRadius(e)+b.r)continue;
   if(e.kind==='lancer'&&e.state==='walk'&&(b.vx*Math.sin(e.angle)+b.vz*Math.cos(e.angle))<0){s.effects.push({kind:'shield-spark',x:b.x,z:b.z,life:.2});if(b.returning)b.returned=true;else b.life=0;break;}
   (b.hitTimes??={})[e.id]=s.time;applyImpact(s,e,p,{x:b.x-b.vx*.05,z:b.z-b.vz*.05,depth:b.depth||0});
   if(p.split&&!b.splitDone){b.splitDone=true;fragments(s,b,Math.round(p.split));}
   if(b.returning&&!b.returned){b.returned=true;b.life=Math.min(2,p.lifetime);break;}if(b.pierce>0)b.pierce--;else if(b.shape!=='saw'){b.life=0;endDelivery(s,b);}break;
  }
  if(b.life<=0)endDelivery(s,b);
 }
 for(const beam of s.beams){beam.life-=dt;beam.tick-=dt;if(beam.life<=0&&!beam.ended){beam.ended=true;const end=beam.segments.at(-1);if(end)endDelivery(s,{x:end.bx,z:end.bz,payload:beam.payload,depth:beam.depth});}if(beam.tick>0)continue;beam.tick=.12;let hits=0;for(const segment of beam.segments)for(const e of s.enemies){if(e.dead||e.state==='burrow'||beam.kind==='rail'&&beam.hits[e.id]!==undefined||s.time-(beam.hits[e.id]??-5)<.12)continue;if(segmentDistance(e.x,e.z,segment.ax,segment.az,segment.bx,segment.bz)>hitRadius(e)+beam.width*(1+(beam.payload.wobble?Math.sin(s.time*24)*.15:0)))continue;if(hits++>beam.payload.pierce)break;beam.hits[e.id]=s.time;applyImpact(s,e,beam.payload,{x:segment.ax,z:segment.az,depth:beam.depth,scale:beam.kind==='rail'?1:.25});if(beam.payload.split&&!beam.splitDone){beam.splitDone=true;fragments(s,{x:e.x,z:e.z,vx:e.x-segment.ax,vz:e.z-segment.az,payload:beam.payload,depth:beam.depth},beam.payload.split);}}}
 for(const ring of s.rings){ring.life-=dt;ring.age+=dt;ring.radius+=(ring.targetRadius-ring.radius)*Math.min(1,dt*5);const p=ring.payload,speed=len(ring.vx,ring.vz);if(ring.returned){const dx=s.player.x-ring.x,dz=s.player.z-ring.z,n=len(dx,dz)||1;if(n<.8){ring.life=0;continue;}ring.vx=dx/n*speed;ring.vz=dz/n*speed;}else if(p.curve){const a=Math.atan2(ring.vx,ring.vz)+p.curve*dt;ring.vx=Math.sin(a)*speed;ring.vz=Math.cos(a)*speed;}if(p.homing&&!ring.returned){const a=targetDirection(s,ring,p);if(a!==null){const old=Math.atan2(ring.vx,ring.vz),next=old+clamp(Math.atan2(Math.sin(a-old),Math.cos(a-old)),-p.homing*dt,p.homing*dt);ring.vx=Math.sin(next)*speed;ring.vz=Math.cos(next)*speed;}}
  const nx=ring.x+ring.vx*dt,nz=ring.z+ring.vz*dt;if(blocked(s,nx,nz,.3)){if(ring.bounces>0){if(blocked(s,nx,ring.z,.3))ring.vx=-ring.vx;if(blocked(s,ring.x,nz,.3))ring.vz=-ring.vz;ring.bounces--;}else ring.life=0;}else{ring.x=nx;ring.z=nz;}
  for(const e of s.enemies)if(!e.dead&&Math.abs(len(e.x-ring.x,e.z-ring.z)-ring.radius)<hitRadius(e)+ring.width&&s.time-(ring.hits[e.id]??-5)>.2&&clearLine(s,ring.x,ring.z,e.x,e.z)){ring.hits[e.id]=s.time;if(p.returning)ring.returned=true;applyImpact(s,e,p,{x:ring.x,z:ring.z,depth:ring.depth,scale:.52});if(p.split&&!ring.splitDone){ring.splitDone=true;fragments(s,{...ring,payload:p},p.split);}}
  if(ring.life<=0)endDelivery(s,{...ring,payload:p});
 }
 for(const mine of s.mines){mine.life-=dt;mine.arm-=dt;if(mine.arm<=0&&s.enemies.some(e=>!e.dead&&len(e.x-mine.x,e.z-mine.z)<2.8)){radialImpact(s,mine.x,mine.z,mine.payload.splash||3.5,mine.payload,0);s.effects.push({kind:'eruption',x:mine.x,z:mine.z,life:1.1});if(mine.payload.split)fragments(s,mine,mine.payload.split,true);endDelivery(s,mine);mine.life=0;}}
 for(const field of s.fields){field.life-=dt;field.age+=dt;field.tick-=dt;if(field.tick<=0){field.tick=.45;radialImpact(s,field.x,field.z,field.r*(1+(field.payload.wobble?Math.sin(field.age*10)*.1:0)),field.payload,field.depth||1);}}
 s.beams=s.beams.filter(b=>b.life>0);s.rings=s.rings.filter(r=>r.life>0);s.mines=s.mines.filter(m=>m.life>0).slice(-20);s.fields=s.fields.filter(f=>f.life>0).slice(-70);
}
function armMine(s,b){if(b.armed)return;b.armed=true;const p=friendlyPayload(b);s.mines.push({id:++s.serial,x:b.x,z:b.z,arm:p.arm||.6,life:p.mineLife,payload:p,depth:b.depth||0});}
function statusTick(s,dt){
 s.hitBudget=120;s.leechBudget=Math.min(8,s.leechBudget+dt*8);s.player.overshield=Math.max(0,s.player.overshield-dt*1.1);
 for(const e of s.enemies){const status=e.elements;if(!status)continue;for(const k of Object.keys(status))status[k]=Math.max(0,status[k]-dt*.45);e.corrosion=status.acid;e.slow=Math.max(e.slow,status.chill>.3?.4:0);e.dotAt=(e.dotAt||0)-dt;if(e.dotAt<=0&&(status.ember||status.acid)){e.dotAt=.6;damage(s,e,(status.ember*3+status.acid*2)*(e.boss?.8:1));}}
 const g=weapon(s);if(g.orbit)for(const e of s.enemies)if(!e.dead&&s.time-e.orbitHit>.35)for(let j=0;j<Math.min(6,g.orbit);j++){const a=s.time*2.7+j*TAU/g.orbit;if(len(e.x-s.player.x-Math.sin(a)*2.7,e.z-s.player.z-Math.cos(a)*2.7)<1.1){e.orbitHit=s.time;applyImpact(s,e,g,{x:s.player.x,z:s.player.z,scale:.55,secondary:true});break;}}
}
function combatTrigger(s,event){
 const g=weapon(s),p=s.player;if(event==='dash'&&g.dashfire)for(let j=-2;j<=2;j++)emitPacket(s,{...g,mode:'bullet',split:0,cluster:0,echo:0},p.x,p.z,p.angle+Math.PI+j*.2,.35,1);
 if(event==='parry'&&g.parryShield)p.overshield=Math.min(25,p.overshield+g.parryShield);
}
