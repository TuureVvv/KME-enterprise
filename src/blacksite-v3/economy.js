/* Run loot, rotating procurement, blueprints and exploration pacing. */
const CACHE_ROOMS=[
 {label:'GOBLIN MART / SUPPLIES',type:'supply',tier:0},
 {label:'LIABILITY LAB / RESEARCH',type:'research',tier:2},
 {label:'RAT RESIDENCE / ALARMED PROTOTYPE',type:'prototype',tier:2},
 {label:'UNPAID STORAGE / ARMORY',type:'armory',tier:1},
 {label:'POTENCY HQ / APPROVAL VAULT',type:'vault',tier:3,boss:'stamp'},
 {label:'SKILL ISSUE DEPT. / FIELD CACHE',type:'field',tier:1},
 {label:'BONE ACCOUNTING / REPOSSESSION VAULT',type:'vault',tier:3,boss:'rig'}
];
function armoryInit(s,options){
 s.progress=options.progress||{clears:[],weaponBlueprints:[],blueprints:options.blueprints||[]};
 s.unlockedWeapons=A.unlocked(s.progress);s.foundBlueprints=[];s.discoveredMods=[];s.inventory=[];s.parts=0;s.shopVouchers=0;s.cacheClaims=0;s.lootMenu=null;s.lootBanner=null;s.shop={version:0,rerolls:0,stock:[]};s.lastNova=-10;
 s.beams=[];s.rings=[];s.mines=[];s.fields=[];s.echoes=[];s.burst=null;s.hitBudget=120;s.leechBudget=8;s.combatTime=0;
 Object.assign(s.player,{charge:0,holdAge:0,fireHeld:false,overshield:0});
 s.caches.forEach((cache,i)=>Object.assign(cache,CACHE_ROOMS[i],{claimed:false,encounter:false,unsealed:false}));
 s.phaseTime=90;rotateStock(s,'ARRIVAL');
}
function lootName(item){return item.kind==='mod'?MODS[item.key]?.name||item.key:item.kind==='weapon'||item.kind==='blueprint'?WEAPONS[item.key]?.name||item.key:item.kind==='heal'?'MEDICAL KIT':item.kind==='part'?'SALVAGE PARTS':item.kind==='voucher'?'REROLL VOUCHER':item.kind==='scrap'?'SCRAP':'SUPPLY';}
function addDrop(s,entry,x,z){
 const special=['mod','weapon','blueprint'].includes(entry.kind);
 if(special&&s.drops.some(d=>d.life>0&&d.kind===entry.kind&&d.key===entry.key)){s.drops.push({id:++s.serial,x,z,kind:'part',value:1,tier:0,life:120});return;}
 s.drops.push({id:++s.serial,x,z,tier:entry.tier||0,life:special?Infinity:120,value:entry.value||1,...entry});
}
function rollMod(s,tier=null,exclude=[]){
 const tierRoll=s.rng()+Math.min(.25,(weapon(s).luck||0)*.08+(s.district.id-1)*.025),wanted=tier??(tierRoll>.98?3:tierRoll>.86?2:tierRoll>.58?1:0);
 const pool=Object.keys(MODS).filter(id=>MODS[id].tier===wanted&&!exclude.includes(id)&&(id!=='relay'||s.blueprints.includes('relay')));
 return pool[Math.floor(s.rng()*pool.length)]||'calibre';
}
function rollBlueprint(s,elite=false){
 const allowed=elite?['saw','stapler','annuity','rail','swarm','flame']:['redline','planter','prism','flame','saw'];
 const pool=allowed.filter(id=>!s.unlockedWeapons.includes(id));return pool[Math.floor(s.rng()*pool.length)]||null;
}
function rotateStock(s,reason='ASSAULT'){
 if(!s.shop)return;s.shop.version++;s.shop.rerolls=0;const owned=s.weapons[s.weapon]?.mods||[],stock=[];
 const rng=random((s.seed*7919+s.shop.version*104729+s.district.id*53)|0),newWeapons=s.unlockedWeapons.filter(id=>id!=='pistol'&&!s.weapons[id]);
 for(let j=0;j<2&&newWeapons.length;j++){const index=Math.floor(rng()*newWeapons.length),id=newWeapons.splice(index,1)[0];stock.push({id:'weapon:'+id,key:'weapon:'+id,kind:'weapon',name:WEAPONS[id].name,cost:WEAPONS[id].cost,tier:WEAPONS[id].mode==='beam'||WEAPONS[id].mode==='ring'?3:1,sold:false});}
 const candidates=Object.keys(MODS).filter(id=>!owned.includes(id)&&!s.inventory.includes(id)&&(id!=='relay'||s.blueprints.includes('relay')));
 while(stock.length<5&&candidates.length){const index=Math.floor(rng()*candidates.length),id=candidates.splice(index,1)[0];stock.push({id:'mod:'+id,key:'mod:'+id,kind:'mod',name:MODS[id].name,cost:MODS[id].cost,tier:MODS[id].tier,sold:false});}
 const support=['tesla','cryo','barricade','magnet'].filter(id=>!ownedUpgrade(s,id));const key=support[Math.floor(rng()*support.length)]||'vial',item=SHOP.find(x=>x.key===key);if(item)stock.push({id:key,key,kind:'service',name:item.name,cost:price(s,key),tier:1,sold:false});
 s.shop.stock=stock.slice(0,6);s.shop.reason=reason;s.stats.shopRotations=(s.stats.shopRotations||0)+1;
}
function ownedUpgrade(s,key){return key==='tesla'?s.tesla:key==='cryo'?s.cryo:key==='barricade'?s.base.reactive:key==='magnet'?s.magnet:false;}
function rerollShop(s){
 if(s.lootMenu||s.shop.rerolls>=4||len(s.player.x+4,s.player.z-3)>5)return false;
 const roll=s.shop.rerolls+1,cost=30+s.shop.rerolls*25;if(s.shopVouchers>0)s.shopVouchers--;else{if(s.scrap<cost)return false;s.scrap-=cost;s.spent+=cost;}
 rotateStock(s,'PAID REROLL');s.shop.rerolls=roll;return true;
}
function installMod(s,id){
 if(!MODS[id])return false;const mods=s.weapons[s.weapon].mods;
 if(mods.includes(id)){if(!s.inventory.includes(id)){s.inventory.push(id);s.lootBanner={name:MODS[id].name,message:'Already installed here · spare packed for another weapon',at:s.time};}else{s.parts+=2+MODS[id].tier;s.lootBanner={name:MODS[id].name,message:'Duplicate recycled into salvage parts',at:s.time};}}
 else{mods.push(id);s.lootBanner={name:MODS[id].name,message:'INSTALLED ON '+WEAPONS[s.weapon].name,at:s.time};}
 if(!s.discoveredMods.includes(id))s.discoveredMods.push(id);return true;
}
function installInventory(s,id){const index=s.inventory.indexOf(id);if(index<0||s.weapons[s.weapon].mods.includes(id))return false;s.inventory.splice(index,1);return installMod(s,id);}
function recycle(s,id){const index=s.inventory.indexOf(id);if(index<0)return false;s.inventory.splice(index,1);s.parts+=2+MODS[id].tier;return true;}
function research(s){
 if(s.lootMenu||s.parts<3||s.scrap<40||len(s.player.x+4,s.player.z-3)>5)return false;
 s.parts-=3;s.scrap-=40;s.spent+=40;const ids=[];while(ids.length<3){const id=rollMod(s,2,[...ids,...s.weapons[s.weapon].mods]);if(ids.includes(id))break;ids.push(id);}
 s.lootMenu={title:'BONGO’S RESEARCH BENCH',subtitle:'Three parts and 40 scrap bought one discovery. Pick one.',entries:ids.map(id=>({kind:'mod',key:id,tier:MODS[id].tier})),claimed:false};return true;
}
function claimLoot(s,index,mode='install'){
 const menu=s.lootMenu,entry=menu?.entries[index];if(!entry||menu.claimed)return false;menu.claimed=true;
 if(menu.dropId){const d=s.drops.find(d=>d.id===menu.dropId);if(d)d.life=0;}
 if(entry.kind==='mod'){
  if(mode==='recycle')s.parts+=2+entry.tier;
  else if(mode==='pack'){if(s.inventory.includes(entry.key))s.parts+=2+entry.tier;else s.inventory.push(entry.key);if(!s.discoveredMods.includes(entry.key))s.discoveredMods.push(entry.key);s.lootBanner={name:lootName(entry),message:'PACKED · Install later from Inspect build or Bongo’s bench',at:s.time};}
  else installMod(s,entry.key);
 }else if(entry.kind==='weapon'||entry.kind==='blueprint'){
  if(!s.unlockedWeapons.includes(entry.key))s.unlockedWeapons.push(entry.key);if(!s.foundBlueprints.includes(entry.key))s.foundBlueprints.push(entry.key);
  s.weapons[entry.key]??={mods:[]};if(mode!=='pack')equip(s,entry.key);s.lootBanner={name:WEAPONS[entry.key].name,message:'USE NOW · EXTRACT TO KEEP THE BLUEPRINT',at:s.time};rotateStock(s,'BLUEPRINT ARRIVED');
 }
 s.lootMenu=null;return true;
}
function pickDrop(s,id){const d=s.drops.find(d=>d.id===id&&d.life>0);if(!d||len(d.x-s.player.x,d.z-s.player.z)>3)return false;s.lootMenu={title:'FIELD RECOVERY',subtitle:'Action is paused while you inspect this item.',dropId:id,entries:[{kind:d.kind,key:d.key,tier:d.tier}],claimed:false};return true;}
function openCache(s,box){
 if(box.claimed)return false;
 if(box.type==='vault'&&!box.unsealed){if(!box.encounter){box.encounter=true;const boss=spawn(s,box.boss,box.x,box.z);boss.cacheId=box.id;boss.hp=boss.maxHp=(box.boss==='stamp'?950:1250)*s.district.difficulty;note(s,'ELITE VAULT: '+(box.boss==='stamp'?'HEAD OF APPROVALS':'REPOSSESSION RIG')+'. WIN TO OPEN THE REWARD.');}return true;}
 box.claimed=true;box.open=true;s.cacheClaims++;s.scrap+=Math.round((35+s.rng()*35)*(1+s.perks.salvage*.35));s.parts++;if(s.cacheClaims%2===0)s.shopVouchers++;
 if(box.type==='prototype'){s.supply='carried';for(let j=0;j<3;j++)spawn(s,j?'gunner':'lancer',box.x+8+j*2,box.z-8);}
 if(box.type==='supply'){addDrop(s,{kind:'heal',value:25},box.x-1.5,box.z+1.5);addDrop(s,{kind:'voucher'},box.x+1.5,box.z+1.5);}
 const entries=[],ids=[];for(let j=0;j<3;j++){const id=rollMod(s,box.tier,[...ids,...s.weapons[s.weapon].mods]);ids.push(id);entries.push({kind:'mod',key:id,tier:MODS[id].tier});}
 if(['armory','research','vault'].includes(box.type)){const blueprint=rollBlueprint(s,box.type==='vault');if(blueprint)entries[box.type==='vault'?0:2]={kind:'blueprint',key:blueprint,tier:3};}
 s.lootMenu={title:box.label,subtitle:box.type==='vault'?'VAULT CLEARED · Choose one high-value reward.':'Choose one reward. Install it now or pack it for later.',entries,claimed:false};
 if(s.cacheClaims>=3&&!s.unlockedWeapons.includes('flame'))addDrop(s,{kind:'blueprint',key:'flame',tier:2},box.x,box.z+2.5);
 return true;
}
function onEnemyDefeated(s,e){
 const p=e.lastPayload||weapon(s);s.drops.push({id:++s.serial,x:e.x,z:e.z,kind:s.rng()<.11?'heal':'scrap',value:e.boss?80:Math.round((8+s.rng()*8)*(1+p.bounty)),tier:0,life:120});
 if(p.bounty)s.score+=15*p.bounty;if(s.rng()<p.salvage)addDrop(s,{kind:'part',value:1},e.x+.7,e.z);
 if(e.cacheId!==undefined){const cache=s.caches[e.cacheId];cache.unsealed=true;note(s,cache.label+' OPEN. ITS REWARD IS MARKED ON YOUR MAP.');addDrop(s,{kind:'voucher'},e.x-1,e.z);}
 if(e.boss){const id=rollMod(s,3,s.weapons[s.weapon].mods);addDrop(s,{kind:'mod',key:id,tier:MODS[id].tier},e.x+1.2,e.z);addDrop(s,{kind:'part',value:2},e.x-1.2,e.z);}
 else if(s.rng()<.018+(p.luck||0)*.008){const id=rollMod(s,null,s.weapons[s.weapon].mods);addDrop(s,{kind:'mod',key:id,tier:MODS[id].tier},e.x,e.z);}
}
function lootTick(s,dt){
 const p=s.player,magnet=2+(s.magnet?6:0)+(weapon(s).lootRange||0);
 for(const d of s.drops){d.life-=dt;if(['mod','weapon','blueprint'].includes(d.kind))continue;const distance=len(d.x-p.x,d.z-p.z);if(distance<magnet&&d.kind!=='heal'){d.x+=(p.x-d.x)*dt*5;d.z+=(p.z-d.z)*dt*5;}if(distance<1.5){
  if(d.kind==='heal'){if(p.hp>=p.maxHp)continue;p.hp=Math.min(p.maxHp,p.hp+d.value);}
  else if(d.kind==='part')s.parts+=d.value;else if(d.kind==='voucher')s.shopVouchers+=d.value;else{const value=Math.round(d.value*(1+s.perks.salvage*.35));s.scrap+=value;s.score+=value;}
  s.lootBanner={name:lootName(d),message:'+'+d.value+(d.kind==='heal'?' HEALTH':d.kind==='part'?' PARTS':d.kind==='voucher'?' REROLL VOUCHER':' SCRAP'),at:s.time};d.life=0;
 }}
 const special=s.drops.filter(d=>d.life>0&&['mod','weapon','blueprint'].includes(d.kind)).slice(-75),ordinary=s.drops.filter(d=>d.life>0&&!['mod','weapon','blueprint'].includes(d.kind)).slice(-100);s.drops=[...special,...ordinary];
}
function callAssault(s){if(s.phase!=='prep'||s.status!=='playing'||s.lootMenu||s.offer)return false;if(s.phaseTime>20&&!s.practice)s.shopVouchers++;nextWave(s);return true;}
function callGuardian(s){
 if(s.status!=='playing'||s.guardianId!==null||!s.relays.every(r=>r.on)||s.lootMenu||s.offer)return false;
 const boss=spawn(s,s.district.guardian,0,-24),hp={mole:650,sludge:2500,archer:1200,potency:35,revenge:3600}[boss.kind]*threat(s);boss.hp=boss.maxHp=hp;boss.guardian=true;s.guardianId=boss.id;s.phase='assault';s.budget=Math.max(s.budget,s.spawned+3);note(s,'GUARDIAN CALLED. THE COMPANY ACCEPTS NO CANCELLATIONS.');return true;
}
