import vm from 'node:vm';import assert from 'node:assert/strict';import {assembledEngine} from './engine-source.mjs';
const ctx=vm.createContext({window:{}});vm.runInContext(assembledEngine,ctx);const E=ctx.window.KMEBlacksiteEngine,A=ctx.window.KMEBlacksiteArmory;
const run=(s,t,i={})=>{for(let j=0;j<Math.ceil(t*60);j++)E.step(s,1/60,i);},make=()=>{const s=E.make(312);s.practice=true;s.phaseTime=Infinity;s.player.x=0;s.player.z=20;s.player.inv=999;return s;};let checks=0;const pass=t=>{checks++;console.log('PASS '+t);};
assert.equal(Object.keys(A.mods).length,50);assert.equal(Object.keys(A.weapons).length,15);
for(const key of Object.keys(A.weapons))for(const mod of Object.keys(A.mods)){
 const a=A.compile(key,[mod,'quad','electric','plasma','frost']),b=A.compile(key,['frost','plasma','electric','quad',mod]);assert.equal(JSON.stringify(a),JSON.stringify(b));
 const s=make();s.weapons[key]={mods:[mod,'quad','electric','plasma','frost']};s.weapon=key;const e=E.spawn(s,'breacher',0,26);e.hp=e.maxHp=1e7;e.stun=10;
 run(s,1.4,{fire:true,ax:0,az:1});run(s,.5,{ax:0,az:1});assert.ok(s.shots>0,key+' + '+mod);assert.ok(Number.isFinite(e.hp)&&e.hp<1e7,key+' failed contact '+mod);assert.ok(s.bullets.length<=640&&s.fields.length<=70&&s.beams.length<=18&&s.rings.length<=20);assert.ok(s.bullets.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.vx)));
}pass('750 weapon/modifier scenarios compose in any order, cause real impacts and keep finite bounded state');
for(const key of ['redline','annuity','rail']){
 const s=make();s.weapons[key]={mods:[]};s.weapon=key;run(s,.1,{fire:true});run(s,.1);assert.equal(s.shots,0,'tap bypassed charge');
 run(s,1.3,{fire:true,ax:0,az:1});assert.equal(s.shots,0,'fired before release');assert.ok(s.player.charge>0);run(s,.02,{ax:0,az:1});assert.equal(s.shots,1);assert.equal(s.player.charge,0);
 run(s,1.3,{fire:true});E.cancelCharge(s);run(s,.1);assert.equal(s.shots,1,'cancel released a shot');
}pass('Beam, ring and rail require hold/release; tiny taps and focus/pointer cancellation never fire a charged shot');
{
 const s=make();s.weapons.redline={mods:[]};s.weapon='redline';s.walls=[{x:0,z:25,w:8,d:1}];const e=E.spawn(s,'breacher',0,29);e.stun=10;e.hp=e.maxHp=1000;run(s,1.1,{fire:true,ax:0,az:1});run(s,.7);assert.equal(e.hp,1000,'beam went through wall');
 const r=make();r.weapons.annuity={mods:[]};r.weapon='annuity';r.walls=[];r.cover=[];run(r,1.25,{fire:true,ax:0,az:1});E.step(r,.001,{});const ring=r.rings[0];ring.vx=ring.vz=0;ring.radius=ring.targetRadius=4;const a=E.spawn(r,'breacher',ring.x,ring.z),b=E.spawn(r,'breacher',ring.x+4,ring.z);a.hp=a.maxHp=b.hp=b.maxHp=10000;a.stun=b.stun=10;run(r,.13);assert.equal(a.hp,10000);assert.ok(b.hp<10000);
}pass('Beams respect walls and charged rings damage the annulus rather than the empty centre');
{
 const s=make();s.weapons.pistol.mods=['plasma','frost','electric','acid','cluster','fork','echo','quad'];for(let j=0;j<20;j++){const e=E.spawn(s,'breacher',(j%5)-2,25+Math.floor(j/5));e.hp=e.maxHp=10000;e.stun=10;}run(s,4,{fire:true,ax:0,az:1});assert.ok(s.stats.reactions>0);assert.ok(s.fields.length<=70&&s.bullets.length<=640);assert.ok(s.bullets.every(b=>(b.depth||0)<=1));
}pass('Generic elemental reactions activate and secondary fragments/echoes remain bounded without pair-specific modifier code');
{
 const s=E.make(22);Object.assign(s.player,{x:-4,z:3});s.scrap=1e6;const original=s.shop.stock.map(i=>i.key).join();assert.equal(s.shop.stock.length,6);assert.equal(E.buy(s,'mod:quad'),s.shop.stock.some(i=>i.key==='mod:quad')?true:false);
 const item=s.shop.stock.find(i=>!i.sold&&i.kind==='mod');assert.equal(E.buy(s,item.key),true);const balance=s.scrap;assert.equal(E.buy(s,item.key),false);assert.equal(s.scrap,balance);assert.equal(s.shop.stock.map(i=>i.key).join(),original);
 s.shopVouchers=1;assert.equal(E.rerollShop(s),true);assert.equal(s.shopVouchers,0);assert.notEqual(s.shop.stock.map(i=>i.key).join(),original);for(let j=0;j<3;j++)assert.equal(E.rerollShop(s),true);assert.equal(E.rerollShop(s),false);
 assert.equal(E.available(s,'weapon:redline'),false);assert.equal(E.buy(s,'weapon:redline'),false);assert.ok(A.unlocked({clears:[1]}).includes('redline'));assert.ok(A.unlocked({clears:[1,2]}).includes('annuity'));
 s.parts=3;assert.equal(E.research(s),true);assert.equal(s.lootMenu.entries.length,3);const before=s.parts;assert.equal(E.claimLoot(s,0,'pack'),true);assert.equal(E.claimLoot(s,0),false);assert.equal(s.parts,before);assert.equal(s.inventory.length,1);assert.equal(E.installInventory(s,s.inventory[0]),true);
}pass('Six stable offers rotate on reroll, vouchers/costs work, stock cannot be double-bought, locked weapons stay gated and research/backpacks work');
{
 const s=make();const box=s.caches[1];Object.assign(s.player,{x:box.x,z:box.z});E.interact(s);assert.equal(s.lootMenu.entries.length,3);const time=s.time;run(s,20);assert.equal(s.time,time);const i=s.lootMenu.entries.findIndex(e=>e.kind==='blueprint'),key=s.lootMenu.entries[i].key;E.claimLoot(s,i);assert.ok(s.foundBlueprints.includes(key));assert.ok(s.weapons[key]);assert.equal(E.interact(s),false);
 const v=s.caches[4];Object.assign(s.player,{x:v.x,z:v.z});E.interact(s);assert.equal(s.lootMenu,null);const boss=s.enemies.find(e=>e.cacheId===v.id);assert.equal(boss.kind,'stamp');E.damage(s,boss,1e6);assert.ok(v.unsealed);E.interact(s);if(s.lootMenu.dropId){E.claimLoot(s,0);E.interact(s);}assert.equal(s.lootMenu.entries[0].kind,'blueprint');E.claimLoot(s,0);
 E.addDrop(s,{kind:'mod',key:'aegis',tier:2},s.player.x,s.player.z);E.interact(s);assert.equal(s.lootMenu.title,'FIELD RECOVERY');E.claimLoot(s,0,'pack');assert.ok(s.inventory.includes('aegis'));assert.equal(s.drops.find(d=>d.key==='aegis').life,0);
}pass('Building rewards pause decisions, elite vaults require a boss, blueprints unlock usable weapons and typed drops are claimed exactly once');
{
 const s=make(),initial=E.threat(s);s.time=2000;run(s,10);assert.equal(E.threat(s),initial);s.relays.forEach(r=>r.on=true);run(s,.02);assert.equal(s.guardianId,null);assert.equal(s.phaseTime,Infinity);run(s,100);assert.equal(s.guardianId,null);assert.equal(E.callGuardian(s),true);assert.ok(s.guardianId);assert.equal(E.callGuardian(s),false);
 const a=E.make(24);const vouchers=a.shopVouchers;assert.equal(E.callAssault(a),true);assert.equal(a.shopVouchers,vouchers+1);assert.equal(a.phase,'assault');a.spawned=a.budget;a.enemies=[];run(a,.02);assert.equal(a.phase,'prep');assert.ok(a.phaseTime>59);
}pass('Scavenging time never raises threat, initial/intermission windows are generous, early assaults pay a voucher and guardians wait for manual call');
for(const hz of [30,60,144,240]){
 const s=E.make(24);s.phaseTime=Infinity;s.player.x=30;s.player.z=30;const e=E.spawn(s,'rig',0,6);Object.assign(e,{state:'forkCharge',vx:0,vz:-1,wind:.85});const hp=s.base.hp;for(let j=0;j<hz;j++)E.step(s,1/hz);assert.ok(Math.abs(hp-s.base.hp-32*E.threat(s))<.01);
}pass('Repossession Rig fork charges apply one reactor impact at 30, 60, 144 and 240 FPS');
{
 const s=make();for(const key of Object.keys(E.NEW_ENEMIES))E.spawn(s,key,8+(s.enemies.length%3)*3,24+Math.floor(s.enemies.length/3)*3);s.player.inv=999;s.base.hp=1e8;run(s,20);assert.ok(s.enemies.every(e=>Number.isFinite(e.x)&&Number.isFinite(e.hp)));assert.ok(s.stats.bosses===0);assert.ok(s.zones.length<=70&&s.enemyBombs.length<=20);
 const b=make();b.enemyBombs.push({id:999,x:b.player.x,z:b.player.z+2,life:2.6});E.pulse(b);run(b,.02);assert.equal(b.enemyBombs.length,0);assert.equal(b.parts,1);
}pass('Six enemy roles and two new bosses run finite state machines; sapper bombs can be actively defused');
console.log(JSON.stringify({checks,compositions:750}));
