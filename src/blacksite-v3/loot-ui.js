/* Procurement and loot are bounded selections; the catalogue lives in a separate codex. */
const ARMORY=root.KMEBlacksiteArmory,LOOT_ICONS={mod:'◆',weapon:'╤',blueprint:'▤',heal:'✚',scrap:'⬡',part:'⚙',voucher:'↻'};
let lootStamp='';
function modCard(entry,index=null){
 const data=entry.kind==='mod'?E.MODS[entry.key]:E.WEAPONS[entry.key],rarity=ARMORY.rarity[entry.tier||0];
 return '<article class="bs-reward-card" style="'+rarityStyle(entry.tier)+'"><small>'+LOOT_ICONS[entry.kind]+' '+entry.kind.toUpperCase()+' / '+rarity.name+'</small><div class="bs-reward-icon">'+purchaseIcon((entry.kind==='blueprint'?'weapon':entry.kind)+':'+entry.key)+'</div><h4>'+esc(data.name)+'</h4><p>'+esc(data.desc)+'</p>'+(entry.kind==='blueprint'?'<em>Use this run. Extract alive to permanently unlock.</em>':'')+(index===null?'':'<button data-bs-claim="'+index+'">'+(entry.kind==='mod'?'Install on '+esc(E.WEAPONS[s.weapon].name):'Take & equip')+'</button>'+(entry.kind==='mod'?'<div class="bs-reward-secondary"><button data-bs-pack="'+index+'">Pack for later</button><button data-bs-recycle-drop="'+index+'">Recycle / '+(2+entry.tier)+' parts</button></div>':''))+'</article>';
}
function backpack(){return '<details class="bs-backpack"><summary>BACKPACK / '+s.inventory.length+' MODS · '+s.parts+' PARTS</summary><p>Switch weapons before installing a spare. Research converts 3 parts + 40 scrap into a choice of upgrades.</p>'+s.inventory.map(id=>'<div><span><b>'+esc(E.MODS[id].name)+'</b><small>'+esc(E.MODS[id].desc)+'</small></span><button data-bs-install="'+id+'" '+(s.weapons[s.weapon].mods.includes(id)?'disabled':'')+'>Install</button><button data-bs-recycle="'+id+'">Recycle</button></div>').join('')+(!s.inventory.length?'<p>No packed modifications. Pick “Pack for later” on a field reward.</p>':'')+'</details>';}
__BLACKSITE_SHOP_UI__
function fieldLootHud(){
 const charge=$('.bs-charge'),g=E.weapon(s);charge.hidden=!['beam','ring','rail'].includes(g.mode);charge.querySelector('progress').max=g.charge;charge.querySelector('progress').value=s.player.charge;charge.querySelector('span').textContent=s.player.charge>=g.minCharge?'RELEASE TO FIRE / '+Math.round(s.player.charge/g.charge*100)+'%':'HOLD FIRE TO CHARGE';
 const button=$('.bs-assault');button.hidden=!active||practice||s.phase!=='prep';button.textContent=s.guardianReady&&s.guardianId===null?'Call guardian':'Start assault / +voucher';
 const banner=$('.bs-loot-banner');banner.hidden=!s.lootBanner||s.time-s.lootBanner.at>3.5||!!s.lootMenu;banner.textContent=s.lootBanner?s.lootBanner.name+' / '+s.lootBanner.message:'';
 $('.bs-kit').querySelector('small').textContent=g.mods.length?g.mods.length+' MODIFICATIONS / INSPECT BUILD':'NO MODIFICATIONS';
 if(s.lootMenu&&!paused&&!shopping){const menu=s.lootMenu,stamp=menu.title+'|'+menu.entries.map(e=>e.key).join(',')+'|'+s.cacheClaims+'|'+menu.dropId;if(lootStamp!==stamp||overlay.hidden){lootStamp=stamp;clearInput();show('<span class="bs-tag">RECOVERY / ACTION PAUSED</span><h3>'+esc(menu.title)+'</h3><p>'+esc(menu.subtitle)+'</p><div class="bs-reward-grid">'+menu.entries.map((e,i)=>modCard(e,i)).join('')+'</div>'+(menu.dropId?'<button class="bs-leave-drop">Leave on map</button>':''));}}
 const cursor=$('.bs-cursor'),r=canvas.getBoundingClientRect();cursor.hidden=!active||paused||shopping||!!s.offer||!!s.lootMenu||!mouse.valid||mouse.x<r.left||mouse.x>r.right||mouse.y<r.top||mouse.y>r.bottom;if(!cursor.hidden){cursor.style.left=(mouse.x-r.left)+'px';cursor.style.top=(mouse.y-r.top)+'px';cursor.classList.toggle('charged',s.player.charge>=g.minCharge&&g.charge>0);}
 box.classList.toggle('bs-custom-cursor',!cursor.hidden);
 drawRadar();
}
function drawRadar(){
 const q=$('.bs-map').getContext('2d');q.setTransform(2,0,0,2,0,0);q.fillStyle='#102728';q.fillRect(0,0,120,120);
 for(const b of s.buildings){q.fillStyle=b.x===0&&b.z===0?'#789a88':'#395551';q.fillRect(60+b.x-b.w/2,60+b.z-b.d/2,b.w,b.d);}
 q.font='bold 8px monospace';q.textAlign='center';for(const c of s.caches){q.fillStyle=c.claimed?'#61756b':c.type==='vault'?'#eb9aac':'#f0d19b';q.fillText(c.claimed?'·':c.type==='vault'?'V':'□',60+c.x,63+c.z);}
 for(const r of s.relays){q.fillStyle=r.on?'#8bdab2':'#ffd988';q.fillText(r.label,60+r.x,63+r.z);}
 for(const d of s.drops){if(d.life<=0)continue;q.fillStyle=['mod','weapon','blueprint'].includes(d.kind)?ARMORY.rarity[d.tier].color:d.kind==='heal'?'#84efcb':d.kind==='part'?'#b9d8ff':d.kind==='voucher'?'#dcb4ff':'#c8af79';const special=['mod','weapon','blueprint'].includes(d.kind);if(special){q.beginPath();q.moveTo(60+d.x,57+d.z);q.lineTo(63+d.x,60+d.z);q.lineTo(60+d.x,63+d.z);q.lineTo(57+d.x,60+d.z);q.closePath();q.fill();q.strokeStyle='#071919';q.lineWidth=.8;q.stroke();}else q.fillRect(59+d.x,59+d.z,2,2);}
 q.fillStyle='#bce9c5';q.fillText('⌂',60,65);q.fillStyle='#ff7069';for(const e of s.enemies)if(!e.dead)q.fillRect(59+e.x,59+e.z,e.boss?4:2,e.boss?4:2);q.fillStyle='#edffb1';q.beginPath();q.arc(60+s.player.x,60+s.player.z,2.5,0,7);q.fill();q.strokeStyle='#fff';q.lineWidth=.5;q.stroke();
}
function codex(){
 if(active){paused=true;clearInput();}const unlocked=ARMORY.unlocked(progress());show('<span class="bs-tag">ARMORY / '+unlocked.length+' OF 15 WEAPONS</span><h3>The liability catalogue.</h3><p>50 modifications share patterns, trajectories, elemental payloads and utility stats. They stack in any order. Equipment resets each expedition; extracted blueprints remain.</p><div class="bs-codex">'+Object.entries(E.WEAPONS).map(([id,w])=>'<article><strong>'+esc(w.name)+'</strong><p>'+esc(w.desc)+'</p><small>'+(unlocked.includes(id)?'UNLOCKED':esc(ARMORY.requirement(id)))+'</small></article>').join('')+'</div><button class="button '+(active?'bs-resume':'bs-options-back')+'">Back</button>');
}
on(container,'click',event=>{
 const b=event.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-bs-shop-view')){shopView=b.getAttribute('data-bs-shop-view');shop();$('.bs-shop-content').scrollTop=0;return;}
 const field=attribute=>b.hasAttribute(attribute),value=attribute=>b.getAttribute(attribute);
 let claim=null,mode='install';if(field('data-bs-claim'))claim=Number(value('data-bs-claim'));if(field('data-bs-pack')){claim=Number(value('data-bs-pack'));mode='pack';}if(field('data-bs-recycle-drop')){claim=Number(value('data-bs-recycle-drop'));mode='recycle';}
 if(claim!==null){if(E.claimLoot(s,claim,mode)){overlay.hidden=true;lootStamp='';clearInput();tone(540,.1);}return;}
 if(b.classList.contains('bs-leave-drop')){s.lootMenu=null;overlay.hidden=true;lootStamp='';clearInput();}
 if(b.classList.contains('bs-reroll')){E.rerollShop(s);shop();}
 if(b.classList.contains('bs-research')&&E.research(s)){closeShop();lootStamp='';}
 if(field('data-bs-install')){E.installInventory(s,value('data-bs-install'));if(shopping)shop();else inspect();}
 if(field('data-bs-recycle')){E.recycle(s,value('data-bs-recycle'));if(shopping)shop();else inspect();}
 if(b.classList.contains('bs-assault')){if(s.guardianReady&&s.guardianId===null)E.callGuardian(s);else E.callAssault(s);clearInput();}
 if(b.classList.contains('bs-codex-button'))codex();if(b.classList.contains('bs-loadout-link'))inspect();
 if(field('data-bs-test-weapon')&&practice){const key=value('data-bs-test-weapon');s.weapons[key]??={mods:[]};E.equip(s,key);paused=false;overlay.hidden=true;clearInput();}
});
