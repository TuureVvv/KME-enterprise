const NEW_ENEMIES={insurer:{hp:70,name:'LIABILITY INSURER'},sapper:{hp:44,name:'LEASE SAPPER'},breacher:{hp:145,name:'UNIONBREAKER'},spitter:{hp:58,name:'WASTE SPITTER'},skitter:{hp:24,name:'RED-TAG SKITTER'},foreman:{hp:100,name:'OVERTIME FOREMAN'},stamp:{hp:950,name:'HEAD OF APPROVALS'},rig:{hp:1250,name:'REPOSSESSION RIG'}};
function enemySupportTick(s,dt){
 for(const e of s.enemies){e.protection=0;e.march=0;}
 for(const support of s.enemies)if(!support.dead){
  if(support.kind==='insurer')for(const e of s.enemies)if(e!==support&&!e.dead&&len(e.x-support.x,e.z-support.z)<7)e.protection=.36;
  if(support.kind==='foreman')for(const e of s.enemies)if(e!==support&&!e.dead&&len(e.x-support.x,e.z-support.z)<10)e.march=.25;
 }
}
function stepNewEnemy(s,e,dt){
 if(!NEW_ENEMIES[e.kind])return false;
 const p=s.player,pd=len(e.x-p.x,e.z-p.z),bd=len(e.x,e.z-2),difficulty=threat(s),slow=e.slow>0?.45:1;
 if(e.kind==='insurer'){
  const target=s.enemies.filter(t=>t!==e&&!t.dead&&t.kind!=='insurer').sort((a,b)=>Number(b.boss)-Number(a.boss)||len(a.x-e.x,a.z-e.z)-len(b.x-e.x,b.z-e.z))[0];
  if(target&&len(e.x-target.x,e.z-target.z)>4)seek(s,e,target.x,target.z,2.6*slow,dt,s.flow?.base);else if(pd<5)seek(s,e,e.x+(e.x-p.x),e.z+(e.z-p.z),2.2*slow,dt,null);
  if(e.timer<=0){shot(s,e.x,e.z,e.angle,10,true,7*difficulty,{life:3});e.timer=2.8;}return true;
 }
 if(e.kind==='sapper'){
  if(e.state==='plant'){e.wind-=dt;if(e.wind<=0){if(s.enemyBombs.length<20)s.enemyBombs.push({id:++s.serial,x:e.x,z:e.z,life:2.6,initial:2.6});e.state='retreat';e.wind=2;e.timer=5;}return true;}
  if(e.state==='retreat'){e.wind-=dt;seek(s,e,e.x+(e.x||1),e.z+(e.z-2||1),4*slow,dt,null);if(e.wind<=0)e.state='walk';return true;}
  seek(s,e,0,2,3.3*slow,dt,s.flow?.base);if(bd<7&&e.timer<=0){e.state='plant';e.wind=1.1;}return true;
 }
 if(e.kind==='breacher'){
  if(e.state==='hammer'){e.wind-=dt;if(e.wind<=0){if(bd<5)baseHurt(s,24*difficulty);if(pd<3)hurt(s,24*difficulty,e.x,e.z);s.effects.push({kind:'impact',x:e.x,z:e.z,life:.6});e.state='recover';e.wind=1.2;}return true;}
  if(e.state==='recover'){e.wind-=dt;if(e.wind<=0){e.state='walk';e.timer=.6;}return true;}
  seek(s,e,0,2,2.1*slow*(1+(e.march||0)),dt,s.flow?.base);if((bd<4.5||pd<2)&&e.timer<=0){e.state='hammer';e.wind=1.05;}return true;
 }
 if(e.kind==='spitter'){
  if(e.state==='spit'){e.wind-=dt;if(e.wind<=0){for(let j=-1;j<=1;j++)shot(s,e.x,e.z,e.angle+j*.19,10,true,8*difficulty,{life:2.6,acidShot:true});e.state='walk';e.timer=3.2;}return true;}
  if(pd>13)seek(s,e,p.x,p.z,2.3*slow,dt,s.flow?.player);if(e.timer<=0&&clearLine(s,e.x,e.z,p.x,p.z)){e.state='spit';e.wind=.8;}return true;
 }
 if(e.kind==='skitter'){
  if(e.state==='pounceWind'){e.wind-=dt;if(e.wind<=0){e.state='pounce';e.wind=.5;e.struck=false;}return true;}
  if(e.state==='pounce'){const ax=e.x,az=e.z;move(s,e,e.vx*12*dt,e.vz*12*dt,.45);e.wind-=dt;if(!e.struck&&segmentDistance(p.x,p.z,ax,az,e.x,e.z)<1.2){e.struck=true;hurt(s,14*difficulty,e.x,e.z);}if(e.wind<=0){e.state='recover';e.wind=.8;}return true;}
  if(e.state==='recover'){e.wind-=dt;if(e.wind<=0){e.state='walk';e.timer=.6;}return true;}
  const side=e.id%2?1:-1;seek(s,e,p.x+Math.cos(e.angle)*side*3,p.z-Math.sin(e.angle)*side*3,4.8*slow,dt,s.flow?.player);if(pd<7&&e.timer<=0){e.state='pounceWind';e.wind=.6;const a=Math.atan2(p.x-e.x,p.z-e.z);e.vx=Math.sin(a);e.vz=Math.cos(a);}return true;
 }
 if(e.kind==='foreman'){
  if(pd>16)seek(s,e,0,2,1.7*slow,dt,s.flow?.base);if(e.timer<=0){if((e.recruits||0)<6&&s.enemies.length<60){spawn(s,'stalker',e.x+2,e.z+2);spawn(s,'rat',e.x-2,e.z+2);e.recruits=(e.recruits||0)+2;s.effects.push({kind:'announcement',x:e.x,z:e.z,life:1.5,text:'MANDATORY VOLUNTARY VIOLENCE'});}e.timer=9;}return true;
 }
 if(e.kind==='stamp'){
  if(e.state==='stampWind'){e.wind-=dt;if(e.wind<=0){e.state='recover';e.wind=2;e.exposed=true;s.effects.push({kind:'impact',x:e.lockX,z:e.lockZ,life:.65});}return true;}
  if(e.state==='recover'){e.wind-=dt;if(e.wind<=0){e.state='walk';e.exposed=false;e.timer=1;}return true;}
  if(pd>11)seek(s,e,p.x,p.z,1.7*slow,dt,s.flow?.player);
  if(e.timer<=0){e.phase++;e.state='stampWind';e.wind=1.45;e.lockX=e.phase%3===0?0:p.x;e.lockZ=e.phase%3===0?2:p.z;for(let j=-1;j<=1;j++)s.zones.push({id:++s.serial,kind:'stamp',shape:'rect',x:e.lockX+j*4,z:e.lockZ,w:2.9,d:7,angle:e.phase%2?0:Math.PI/2,r:3.5,age:0,warn:1.45,life:1.86,tick:0});if(e.phase%3===0&&s.enemies.length<56)spawn(s,'insurer',e.x+5,e.z+2);}return true;
 }
 if(e.kind==='rig'){
  if(e.state==='forkWind'){e.wind-=dt;if(e.wind<=0){e.state='forkCharge';e.wind=.85;e.chargeHitBase=false;e.chargeHitPlayer=false;}return true;}
  if(e.state==='forkCharge'){
   const ax=e.x,az=e.z;move(s,e,e.vx*15*dt,e.vz*15*dt,.7);e.wind-=dt;
   if(!e.chargeHitBase&&segmentDistance(0,2,ax,az,e.x,e.z)<2.7){e.chargeHitBase=true;baseHurt(s,32*difficulty);e.wind=0;}
   if(!e.chargeHitPlayer&&segmentDistance(p.x,p.z,ax,az,e.x,e.z)<1.5){e.chargeHitPlayer=true;hurt(s,30*difficulty,e.x,e.z);e.wind=0;}
   if(e.wind<=0||len(e.x-ax,e.z-az)<dt){e.state='recover';e.wind=1.8;e.exposed=true;s.effects.push({kind:'impact',x:e.x,z:e.z,life:.6});}return true;
  }
  if(e.state==='winch'){e.wind-=dt;if(pd<14&&pd>3&&clearLine(s,e.x,e.z,p.x,p.z))move(s,p,(e.x-p.x)/pd*2.3*dt,(e.z-p.z)/pd*2.3*dt);if(e.wind<=0){for(let j=-2;j<=2;j++)shot(s,e.x,e.z,e.angle+j*.22,11,true,13*difficulty,{life:3});e.state='recover';e.wind=1.7;e.exposed=true;}return true;}
  if(e.state==='recover'){e.wind-=dt;if(e.wind<=0){e.state='walk';e.exposed=false;e.timer=.9;}return true;}
  if(pd>11)seek(s,e,p.x,p.z,2.8*slow,dt,s.flow?.player);if(e.timer<=0){e.phase++;if(e.phase%2===0){e.state='winch';e.wind=2.1;}else{e.state='forkWind';e.wind=1.15;const a=Math.atan2(pd<18?p.x-e.x:-e.x,pd<18?p.z-e.z:2-e.z);e.vx=Math.sin(a);e.vz=Math.cos(a);}}return true;
 }
 return false;
}
function hostileWorldTick(s,dt){
 for(const bomb of s.enemyBombs){bomb.life-=dt;if(bomb.life<=0&&!bomb.defused){bomb.defused=true;if(len(bomb.x,bomb.z-2)<9)baseHurt(s,28*threat(s));if(len(bomb.x-s.player.x,bomb.z-s.player.z)<3.3)hurt(s,28*threat(s));s.effects.push({kind:'eruption',x:bomb.x,z:bomb.z,life:1.1});}}
 s.enemyBombs=s.enemyBombs.filter(b=>b.life>0&&!b.defused).slice(-20);
}
function zoneContains(z,x,zz){if(z.shape!=='rect')return len(x-z.x,zz-z.z)<z.r;const dx=x-z.x,dz=zz-z.z,a=z.angle||0;return Math.abs(dx*Math.cos(a)-dz*Math.sin(a))<z.w/2&&Math.abs(dx*Math.sin(a)+dz*Math.cos(a))<z.d/2;}
