import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {assembledEngine} from './engine-source.mjs';
const context=vm.createContext({window:{}});vm.runInContext(assembledEngine,context);
const E=context.window.KMEBlacksiteEngine,run=(s,seconds,input={})=>{for(let j=0;j<Math.ceil(seconds*60);j++)E.step(s,1/60,input);};
let checks=0;const pass=t=>{checks++;console.log('PASS '+t);};
for(const key of Object.keys(E.WEAPONS).filter(k=>!['beam','ring','rail','burst'].includes(E.WEAPONS[k].mode))){
 const s=E.make(19);s.phaseTime=Infinity;s.weapons[key]={mods:[]};s.weapon=key;run(s,30,{fire:true,ax:0,az:1});
 assert.ok(s.shots>=Math.floor(30/E.weapon(s).rate)-3,key+' silently stopped firing');assert.equal('heat'in s.player,false);assert.equal('overheat'in s.player,false);assert.equal('venting'in s.player,false);assert.ok(Number.isFinite(s.player.infusion));
}pass('Every weapon fires continuously for 30 seconds with no heat, vent state or hidden firing lockout');
for(const hz of[30,60,144,240]){
 const s=E.make(9);s.phaseTime=Infinity;s.wave=2;s.player.x=30;s.player.z=30;const e=E.spawn(s,'lancer',0,5.5);Object.assign(e,{state:'charge',wind:1,vx:0,vz:-1,chargeHitBase:false,chargeHitPlayer:false});const before=s.base.hp;
 for(let j=0;j<hz;j++)E.step(s,1/hz,{});assert.ok(Math.abs(before-s.base.hp-10*E.threat(s))<.01);assert.equal(e.chargeHitBase,true);
}pass('Shield charges still deal exactly one reactor impact at 30, 60, 144 and 240 FPS');
{
 const s=E.make(5);s.phaseTime=Infinity;const r=s.relays[0];Object.assign(s.player,{x:r.x,z:r.z,inv:0});E.interact(s);run(s,1);run(s,.1,{mx:1});assert.equal(r.on,false);assert.equal(s.action,null);
 Object.assign(s.player,{x:r.x,z:r.z});E.interact(s);run(s,.5);E.hurt(s,1);assert.equal(s.action,null);
 for(const r of s.relays){Object.assign(s.player,{x:r.x,z:r.z});assert.equal(E.interact(s),true);run(s,3);assert.equal(r.on,true);assert.ok(s.offer.length===4);const key=s.offer[0];assert.equal(E.choose(s,key),true);assert.equal(E.choose(s,key),false);}
 assert.equal(s.stats.relays,3);assert.equal(s.guardianId,null);assert.equal(E.callGuardian(s),true);assert.ok(s.enemies.some(e=>e.id===s.guardianId&&e.kind==='mole'));assert.equal(s.guardianDown,false);
 const guardian=s.enemies.find(e=>e.id===s.guardianId);E.damage(s,guardian,100000);assert.equal(s.guardianDown,true);
}pass('Signal channels cancel on motion/damage, commit once, offer real upgrades and make the guardian callable after all three links');
{
 const s=E.make(6,Infinity,{protocol:'enforcer'});s.player.inv=0;s.aim={x:0,z:1};assert.equal(E.gadget(s),true);assert.equal(E.hurt(s,30,0,14),false);assert.equal(s.player.hp,125);assert.equal(s.player.empowered,true);
 assert.equal(E.hurt(s,30,0,6),true);assert.equal(s.player.hp,95);s.player.guard=0;run(s,.1,{fire:true,ax:0,az:1});assert.equal(s.player.empowered,false);assert.equal(E.gadget(s),false);
}pass('Enforcer blocks only frontal hits, perfect blocks empower a volley, rear attacks still hurt, and the gadget respects cooldown');
{
 const s=E.make(7,Infinity,{protocol:'engineer'});s.phaseTime=Infinity;s.aim={x:0,z:1};s.weapons.pistol.mods=['electric','frost'];E.gadget(s);const id=s.sentry.id;E.spawn(s,'stalker',3,18);run(s,.1);assert.ok(s.bullets.some(b=>b.electric&&b.frost));s.player.gadgetCD=0;E.gadget(s);assert.notEqual(s.sentry.id,id);assert.equal(s.turrets.length,0);run(s,14.2);assert.equal(s.sentry,null);
}pass('Engineer has one repositionable, expiring sentry whose projectiles inherit electric/cryo features');
{
 const s=E.make(4,Infinity,{district:2,protocol:'chemist'});s.phaseTime=Infinity;s.aim={x:0,z:1};s.weapons.pistol.mods=['frost','plasma','electric'];E.gadget(s);const z=s.fields[0],e=E.spawn(s,'lancer',z.x,z.z);const hp=e.hp;run(s,.1);assert.ok(e.hp<hp);assert.ok(e.slow>0);assert.equal(s.fields.length,1);
}pass('Chemist flask follows equipped elemental features and actually damages/slows enemies');
{
 const s=E.make(5,Infinity,{district:2});s.phaseTime=Infinity;s.weapons.mortar={mods:[]};s.weapon='mortar';E.spawn(s,'stalker',0,16);E.spawn(s,'stalker',2,16);run(s,.6,{fire:true,ax:0,az:1});assert.ok(s.kills>=2);assert.equal(s.player.hp,s.player.maxHp);
 const r=E.make(9);r.phaseTime=Infinity;r.weapons.pistol.mods=['returning'];E.spawn(r,'gunner',0,15).hp=500;run(r,.14,{fire:true,ax:0,az:1});assert.ok(r.bullets.some(b=>b.returned));run(r,2);assert.ok(r.bullets.every(b=>!b.returned));
}pass('Heavy launcher splash damages groups, and returning projectiles return once and expire without resource loops');
{
 const s=E.make(8,Infinity,{protocol:'engineer'});s.aim={x:0,z:1};E.gadget(s);const id=s.sentry.id,life=s.sentry.life,balance=s.scrap;s.player.x=4;assert.equal(E.gadget(s),true);assert.equal(s.sentry.id,id);assert.equal(s.sentry.life,life);assert.equal(s.scrap,balance-20);assert.equal(s.turrets.length,0);
}pass('Repositioning the engineer sentry costs scrap and preserves its lifetime instead of duplicating or refreshing it');
{
 const a=E.make(4,Infinity,{district:2}),b=E.make(4,Infinity,{district:2});a.phaseTime=b.phaseTime=Infinity;Object.assign(a.player,{x:22,z:5});Object.assign(b.player,{x:0,z:12});run(a,.5,{mz:1});run(b,.5,{mz:1});assert.ok(a.player.z-5<(b.player.z-12)*.75);assert.notDeepEqual(E.make(1,Infinity,{district:1}).walls,E.make(1,Infinity,{district:3}).walls);
}pass('Flooded channels change movement, and district layouts/collision/navigation are genuinely distinct');
{
 const s=E.make(1);s.phaseTime=Infinity;assert.equal(E.available(s,'mod:relay'),false);const c=s.caches[2];Object.assign(s.player,{x:c.x,z:c.z});E.interact(s);assert.equal(s.supply,'carried');E.claimLoot(s,0);assert.ok(s.enemies.length>=3);Object.assign(s.player,{x:0,z:3});E.interact(s);assert.equal(s.supply,'delivered');assert.equal(E.available(s,'mod:relay'),true);assert.ok(s.offer);
}pass('Alarmed prototype cache summons opposition; carrying it home grants a real blueprint and field reward');
{
 const s=E.make(7);s.guardianDown=true;const before=s.enemies.length;assert.equal(E.contract(s),true);assert.equal(E.contract(s),false);assert.equal(s.extractionRequired,8);assert.equal(s.overtimeReward,1.35);assert.equal(s.enemies.length-before,4);assert.ok(s.wave>=5);s.phase='prep';s.phaseTime=Infinity;s.player.inv=999;s.base.hp=1e8;s.enemies=[];s.time=90;run(s,5.1,{bank:true});assert.equal(s.status,'playing');run(s,3.1,{bank:true});assert.equal(s.status,'extracted');
}pass('Overtime bargain is explicit, applies once, adds an elite patrol and requires the longer extraction channel');
{
 const s=E.make(3,Infinity,{district:4});s.practice=true;s.relays.forEach(r=>r.on=true);run(s,.1);E.callGuardian(s);const intern=s.enemies.find(e=>e.id===s.guardianId);assert.equal(intern.kind,'potency');E.damage(s,intern,10000);assert.equal(s.guardianDown,false);run(s,9.2);const rehired=s.enemies.find(e=>e.id===s.guardianId);assert.equal(rehired.kind,'revenge');E.damage(s,rehired,1000000);assert.equal(s.guardianDown,true);
}pass('Mr. Potency’s easy form does not award a clear; the announced return creates the actual guardian');
{
 for(const district of[1,2,3,4]){const a=E.make(777,Infinity,{district}),b=E.make(777,Infinity,{district});a.practice=b.practice=true;a.phaseTime=b.phaseTime=0;
 for(let j=0;j<1200;j++){E.step(a,.1,{fire:true,ax:0,az:1});E.step(b,.1,{fire:true,ax:0,az:1});}
 assert.equal(a.score,b.score);assert.equal(a.kills,b.kills);assert.ok(a.bullets.length<=640&&a.zones.length<=70&&a.effects.length<=100);assert.ok(a.enemies.every(e=>Number.isFinite(e.hp)&&Number.isFinite(e.x)));}
}pass('All four districts remain deterministic and bounded through sustained assaults');
console.log(JSON.stringify({checks}));
