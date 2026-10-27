/* Inserted inside the pure simulation scope. One run carries its build through district circuits. */
const V4_MISSIONS=[
 {id:'seismic',title:'SEISMIC TRIANGULATION',names:['Ground probe A','Ground probe B','Ground probe C'],verb:'Triangulate the Mortgage Mole'},
 {id:'flood',title:'DRAIN THE WORKS',names:['Recover valve fuse','Hold the pump perimeter','Flush the sludge lock'],verb:'Break the Director’s containment'},
 {id:'evidence',title:'BREAK THE AUDIT',names:['Recover payroll evidence','Recover expense evidence','Recover approval evidence'],verb:'Deliver evidence to the hearing terminal'},
 {id:'blackout',title:'EXECUTIVE LOCKDOWN',names:['Destroy west power cell','Destroy east power cell','Reroute emergency breaker'],verb:'Cut power to Mr. Potency’s boardroom'}
];
Object.assign(DISTRICTS[0],{objective:'Triangulate the Mortgage Mole with three seismic probes.',unlock:'Drowned Works · Liability Chemist'});
Object.assign(DISTRICTS[1],{objective:'Recover a valve fuse, drain the works and breach the Director’s containment.'});
Object.assign(DISTRICTS[2],{guardian:'stamp',objective:'Recover the audit evidence and force the Approval Committee into a hearing.',rule:'Redaction drones mark long lanes. The Committee stamps a warned grid: keep moving.'});
Object.assign(DISTRICTS[3],{objective:'Destroy power cells and reroute the emergency breaker.',unlock:'Next circuit · escalating sectors'});
Object.assign(NEW_ENEMIES,{dredger:{hp:190,name:'CONTAMINATION DREDGER'},archivist:{hp:95,name:'REDACTION DRONE'},executive:{hp:160,name:'EXECUTIVE ESCORT'},powercell:{hp:260,name:'SHIELDED POWER CELL'}});
const V4_POOLS=[['stalker','rat','skitter','breacher','gunner'],['spitter','dredger','coil','sapper','rat','breacher'],['archivist','surveyor','sniper','insurer','gunner'],['executive','reaper','foreman','lancer','bomber','insurer']];
function sectorMission(s){
 s.mission={...V4_MISSIONS[s.district.id-1],carry:[],delivered:false};s.relays.forEach((r,i)=>Object.assign(r,{name:s.mission.names[i],collected:false}));
 if(s.mission.id==='blackout')for(let i=0;i<2;i++){const r=s.relays[i],e=spawn(s,'powercell',r.x,r.z);e.objective=true;e.relayId=i;e.timer=0;}
}
const configureV3=configure;configure=function(s,options={}){configureV3(s,options);s.sector=options.sector||s.sector||s.district.id;s.circuit=1+Math.floor((s.sector-1)/4);s.completedSectors??=[];s.calibrations??={};s.transit=null;sectorMission(s);};
const threatV3=threat;threat=function(s){return threatV3(s)*(1+Math.max(0,(s.sector||1)-1)*.3);};
const weaponV3=weapon;weapon=function(s){const w=weaponV3(s),level=s.calibrations?.[s.weapon]||0;return{...w,damage:w.damage*(1+level*.22),calibration:level};};
function calibrationCost(s){return 80+(s.calibrations?.[s.weapon]||0)*55;}
function calibrate(s){const cost=calibrationCost(s);if(s.status!=='playing'||len(s.player.x+4,s.player.z-3)>5||s.scrap<cost||s.parts<1)return false;s.scrap-=cost;s.parts--;s.spent+=cost;s.calibrations[s.weapon]=(s.calibrations[s.weapon]||0)+1;s.compiledStamp=null;note(s,'FIELD CALIBRATION '+s.calibrations[s.weapon]+' / WEAPON DAMAGE +22% BASE.');return true;}
const requisitionV3=requisition;requisition=function(s){const pool=Object.keys(PERKS).filter(k=>(s.perks[k]||0)<8);for(let i=pool.length-1;i>0;i--){const j=Math.floor(s.rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}s.offer=pool.slice(0,s.protocol.id==='intern'?4:3);if(!s.offer.length){s.offer=null;s.parts+=3;s.scrap+=150;note(s,'ALL REQUISITIONS MASTERED. +3 PARTS / +150 SCRAP FOR CALIBRATION.');}};
function finishObjective(s,r){if(r.on)return;r.on=true;s.action=null;s.stats.relays++;s.scrap+=85+15*s.sector;s.parts++;s.score+=200*s.sector;s.base.hp=Math.min(s.base.maxHp,s.base.hp+75);rotateStock(s,'MISSION REWARD');requisition(s);note(s,r.name.toUpperCase()+' COMPLETE. FIELD REQUISITION AVAILABLE.');}
const contextV3=context;context=function(s){
 if(s.transit)return{kind:'transit',text:'SECTOR SECURED / TRANSIT TO '+s.transit.nextName};
 if(s.action)return{kind:'channel',text:(s.action.label||s.relays[s.action.id].name).toUpperCase()+' · '+Math.max(0,s.action.required-s.action.time).toFixed(1)+'s'};
 if(s.mission.id==='evidence'&&s.mission.carry.length===3&&!s.mission.delivered&&len(s.player.x-4,s.player.z-3)<3)return{kind:'evidence-delivery',text:'[E] DELIVER EVIDENCE / FORCE THE HEARING'};
 const r=s.relays.find(r=>!r.on&&!r.collected&&len(s.player.x-r.x,s.player.z-r.z)<3);
 if(r){const m=s.mission.id,earlier=s.relays.slice(0,r.id).every(r=>r.on);let text=r.name.toUpperCase();if(m==='blackout'&&r.id<2)return{kind:'powercell',id:r.id,text:'SHOOT THE POWER CELL / SHIELD OPENS EVERY 8s'};if(m!=='evidence'&&!earlier)return{kind:'locked-objective',id:r.id,text:'LOCKED / COMPLETE '+s.relays.find(r=>!r.on).name.toUpperCase()+' FIRST'};return{kind:'mission-v4',id:r.id,text:'[E] '+text+(m==='evidence'||m==='flood'&&r.id===0?' / RECOVER':' / HOLD POSITION')};}
 const old=contextV3(s);if(old?.kind==='relay')return null;return old;
};
const interactV3=interact;interact=function(s){if(s.status!=='playing'||s.offer||s.lootMenu)return false;const c=context(s);if(c?.kind==='mission-v4'){const r=s.relays[c.id];if(s.mission.id==='evidence'){r.collected=true;s.mission.carry.push(r.id);spawn(s,'archivist',r.x+5,r.z-4);note(s,'EVIDENCE RECOVERED / '+s.mission.carry.length+'/3. DELIVER TO THE HEARING TERMINAL.');return true;}if(s.mission.id==='flood'&&r.id===0){s.mission.carry=['fuse'];finishObjective(s,r);return true;}s.action={id:r.id,time:0,required:s.mission.id==='flood'&&r.id===1?8:s.mission.id==='blackout'?4:2.5,label:r.name};return true;}
 if(c?.kind==='evidence-delivery'){s.mission.delivered=true;for(const r of s.relays){r.on=true;s.stats.relays++;}s.scrap+=260+s.sector*30;s.parts+=3;s.score+=600*s.sector;requisition(s);note(s,'THE AUDIT HAS NO EXCUSE LEFT. CALL THE COMMITTEE WHEN READY.');return true;}
 if(['locked-objective','powercell','transit'].includes(c?.kind))return false;return interactV3(s);
};
const missionTickV3=missionTick;missionTick=function(s,dt,interrupted){
 if(s.action){const r=s.relays[s.action.id],pump=s.mission.id==='flood'&&r.id===1,away=len(s.player.x-r.x,s.player.z-r.z)>(pump?6:3);
  if(away||!pump&&interrupted){s.action=null;note(s,'TASK INTERRUPTED. FIND AN OPENING.');}
  else if(pump&&s.enemies.some(e=>!e.dead&&!e.objective&&len(e.x-r.x,e.z-r.z)<6)){s.action.label='Pump contested / clear the perimeter';}
  else if((s.action.time+=dt)>=s.action.required){finishObjective(s,r);if(s.mission.id==='seismic'){s.zones.push({id:++s.serial,kind:'eruption',x:r.x,z:r.z,r:4,age:0,warn:1.7,life:2.2});spawn(s,'skitter',r.x+5,r.z+3);spawn(s,'skitter',r.x-5,r.z+3);}}
 }
 // Retain district hazards and the deliberate guardian-call/looting window.
 const action=s.action;s.action=null;missionTickV3(s,dt,false);s.action=action;
};
const damageV3=damage;damage=function(s,e,n){const wasDead=e.dead;damageV3(s,e,n);if(!wasDead&&e.dead&&e.objective)finishObjective(s,s.relays[e.relayId]);};
const supportV3=enemySupportTick;enemySupportTick=function(s,dt){supportV3(s,dt);for(const e of s.enemies)if(e.kind==='powercell')e.protection=s.floorTime%8<3?0:.94;};
const stepNewV3=stepNewEnemy;stepNewEnemy=function(s,e,dt){
 if(e.kind==='powercell')return true;
 if(e.kind==='dredger'){seek(s,e,s.player.x,s.player.z,1.8*(e.slow>0?.45:1),dt,s.flow?.player);if(e.timer<=0){s.zones.push({id:++s.serial,kind:'sludge',x:e.x,z:e.z,r:3.1,age:0,warn:1.1,life:5});e.timer=3.4;}return true;}
 if(e.kind==='archivist'){const p=s.player,d=len(e.x-p.x,e.z-p.z);if(d<10)seek(s,e,e.x+(e.x-p.x),e.z+(e.z-p.z),2.5,dt,null);if(e.timer<=0){s.zones.push({id:++s.serial,kind:'stamp',shape:'rect',x:p.x,z:p.z,w:2.3,d:10,angle:e.id%2?0:Math.PI/2,r:4,age:0,warn:1.4,life:2,tick:0});e.timer=4.1;}return true;}
 if(e.kind==='executive'){const target=s.enemies.find(t=>t.boss&&!t.dead);if(target&&len(e.x-target.x,e.z-target.z)>4)seek(s,e,target.x,target.z,3,dt,s.flow?.player);else seek(s,e,s.player.x,s.player.z,2.5,dt,s.flow?.player);if(e.timer<=0){for(let j=-1;j<=1;j++)shot(s,e.x,e.z,e.angle+j*.25,13,true,14*threat(s),{life:3});e.timer=2.7;}if(target)target.protection=Math.max(target.protection||0,.25);return true;}
 return stepNewV3(s,e,dt);
};
const spawnV3=spawn;spawn=function(s,kind,x,z){if(kind==='stalker'&&s.district.id>1&&!s.spawningObjective){const pool=V4_POOLS[s.district.id-1];kind=pool[Math.floor(s.rng()*pool.length)];}return spawnV3(s,kind,x,z);};
const defeatedV3=onEnemyDefeated;onEnemyDefeated=function(s,e){const before=s.drops.length;defeatedV3(s,e);if(s.guardianDown&&e.id===s.guardianId)s.guardianCargoIds=s.drops.slice(before).map(d=>d.id);};
function secureGuardianCargo(s){const cargo=[];for(const d of s.drops){if(!s.guardianCargoIds?.includes(d.id)||d.life<=0)continue;if(d.kind==='mod'){if(s.inventory.includes(d.key))s.parts+=2+d.tier;else s.inventory.push(d.key);if(!s.discoveredMods.includes(d.key))s.discoveredMods.push(d.key);cargo.push(MODS[d.key].name+' / packed');d.life=0;}else if(d.kind==='part'){s.parts+=d.value;cargo.push(d.value+' salvage parts');d.life=0;}}s.guardianCargoIds=[];return cargo;}
function beginTransit(s){if(s.transit||s.status!=='playing')return;const cargo=secureGuardianCargo(s);cancelCharge(s);s.action=null;s.enemies=[];s.bullets=[];s.zones=[];s.offer=null;s.lootMenu=null;s.phase='prep';s.phaseTime=Infinity;const checkpoint={sector:s.sector,district:s.district.id,cycle:s.circuit,score:Math.floor(s.score),kills:s.kills,wave:s.wave,seconds:Math.floor(s.time),guardianDefeated:true,relays:3,operative:s.protocol.id};s.completedSectors.push(checkpoint);s.transit={remaining:12,confirmed:!!s.practice,checkpoint,cargo,nextName:DISTRICTS[s.district.id%4].name};note(s,'SECTOR '+s.sector+' SECURED. EXTRACT DURING TRANSIT OR KEEP YOUR BUILD AND CONTINUE.');}
function confirmTransit(s){if(!s.transit)return false;s.transit.confirmed=true;return true;}
function advanceSector(s){
 if(!s.transit?.confirmed)return false;const next=s.sector+1;
 const keep={weapons:s.weapons,weapon:s.weapon,inventory:s.inventory,perks:s.perks,calibrations:s.calibrations,scrap:s.scrap,parts:s.parts,shopVouchers:s.shopVouchers,foundBlueprints:s.foundBlueprints,discoveredMods:s.discoveredMods,cacheClaims:s.cacheClaims,blueprints:s.blueprints,relics:s.relics,progress:s.progress},hp=s.player.hp,maxHp=s.player.maxHp,stamina=s.player.stamina,maxStamina=s.player.maxStamina,vials=s.player.vials,baseHp=s.base.hp;
 configure(s,{district:(next-1)%4+1,sector:next,protocol:s.protocol.id,blueprints:keep.blueprints,progress:keep.progress});Object.assign(s,keep);s.scrap+=65+next*15;s.parts+=2;s.shopVouchers++;s.player.maxHp=maxHp;s.player.hp=Math.min(maxHp,hp+maxHp*.08);s.player.maxStamina=maxStamina;s.player.stamina=Math.min(maxStamina,stamina+25);s.player.vials=vials;s.player.x=0;s.player.z=10;s.player.inv=4;s.base.hp=Math.min(s.base.maxHp,baseHp+80);s.floorTime=0;s.wave=0;s.budget=0;s.spawned=0;s.bossSpawned=false;s.revengeAt=null;s.bank=0;s.phase='prep';s.phaseTime=75;s.effects=[];s.drops=[];s.turrets.forEach(t=>t.cd=0);s.compiledStamp=null;rotateStock(s,'SECTOR '+next+' / ARRIVAL');note(s,'SECTOR '+next+' · CIRCUIT '+s.circuit+' / '+s.mission.title+'. YOUR BUILD CARRIES FORWARD.');return true;
}
const stepV3=step;step=function(s,dt,input={}){if(s.transit){if(s.transit.confirmed){s.transit.remaining=Math.max(0,s.transit.remaining-Math.min(.25,dt));if(s.transit.remaining<=0)advanceSector(s);}return s;}stepV3(s,dt,input);if(s.guardianDown&&!s.transit&&s.status==='playing')beginTransit(s);return s;};
