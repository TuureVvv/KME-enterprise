import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('../../scripts/browser-runtime.cjs');
const browser=await chromium.launch({headless:true,executablePath:process.env.KME_CHROMIUM_EXECUTABLE||undefined,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];let external=0,assetRequests=0;
p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:4174/'))external++;if(/\/vendor\/|\/assets\//.test(r.url().slice(0,120)))assetRequests++;});
try{
 await p.goto('http://127.0.0.1:4174/v3-standalone.html');await p.locator('#demo-enter').click();await p.locator('[data-v3="games-only"]').click();await p.locator('#picker [data-character]').first().click();if(await p.locator('#shift-dialog').evaluate(e=>e.open))await p.locator('#shift-dialog [data-close]').click();await p.waitForSelector('.bs-start',{timeout:60000});
 await p.locator('.bs-start').click();await p.waitForFunction(()=>KMEBlacksite.instance.active);assert.equal(external,0);assert.equal(assetRequests,0);assert.deepEqual(errors,[]);
 console.log('PASS standalone demo loads its complete UI, atlas and 3D modules without external files or backend requests');
 // Owned visual fixtures only; these do not settle or create player records.
 for(const district of[2,3,4,1,2,3,4,1]){await p.evaluate(d=>{const s=KMEBlacksite.instance.state;KMEBlacksiteEngine.configure(s,{district:d,protocol:'engineer'});s.enemies=[];s.bullets=[];s.zones=[];s.phaseTime=9999;},district);await p.waitForTimeout(80);}
 assert.ok(await p.evaluate(()=>KMEBlacksite.instance.renderer.info().memory.textures<100));
 await p.evaluate(()=>{const s=KMEBlacksite.instance.state;s.player.x=0;s.player.z=24;s.player.hp=61;s.player.stamina=52;s.player.inv=99;s.base.hp=780;s.lastBaseDamage=s.time;s.weapons.rifle={mods:['quad','electric','frost']};s.weapon='rifle';s.scrap=310;const boss=KMEBlacksiteEngine.spawn(s,'mole',8,25);s.guardianId=boss.id;boss.state='burrow';boss.wind=.6;boss.lockX=8;boss.lockZ=25;KMEBlacksiteEngine.spawn(s,'lancer',-8,18);KMEBlacksiteEngine.spawn(s,'gunner',5,32);KMEBlacksiteEngine.spawn(s,'rat',-3,26);KMEBlacksiteEngine.gadget(s);s.time=140;});
 await p.waitForTimeout(200);await p.locator('.bs-stage').screenshot({path:'outputs/previews/v3-field-combat.png'});assert.deepEqual(errors,[]);console.log('PASS district world rebuilds dispose old resources and the combat fixture renders without browser errors');
}finally{await browser.close();}
