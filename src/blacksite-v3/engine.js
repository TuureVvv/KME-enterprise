/* BLACKSITE: Shelter Shift. Pure seeded simulation; the server owns banked rewards. */
(function(root){'use strict';
const {districts:DISTRICTS,protocols:PROTOCOLS,perks:PERKS}=root.KMEBlacksiteCampaign;
const A=root.KMEBlacksiteArmory;
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),len=(x,z)=>Math.hypot(x,z);
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const BUILDINGS=[{x:0,z:0,w:18,d:14,name:'THE SHELTER',color:0x647e71},{x:-29,z:-25,w:18,d:16,name:'GOBLIN MART',color:0x8b705a},{x:28,z:-26,w:19,d:15,name:'LIABILITY LAB',color:0x596d86},{x:-30,z:26,w:18,d:18,name:'RAT RESIDENCE',color:0x796358},{x:30,z:25,w:20,d:16,name:'UNPAID STORAGE',color:0x6b7961},{x:0,z:-43,w:16,d:13,name:'POTENCY HQ',color:0x725b78},{x:-45,z:0,w:13,d:14,name:'SKILL ISSUE DEPT.',color:0x657c76},{x:45,z:0,w:13,d:14,name:'BONE ACCOUNTING',color:0x837c67}];
const WEAPONS=A.weapons,MODS=A.mods;
const SHOP=[...Object.entries(WEAPONS).filter(([k])=>k!=='pistol').map(([k,v])=>({key:'weapon:'+k,...v,type:'weapon'})),...Object.entries(MODS).map(([k,v])=>({key:'mod:'+k,...v,type:'mod'})),{key:'turret',name:'Automatic Union Turret',cost:75,type:'base',desc:'Builds one of four shelter turrets. Automatic aim; line of sight matters.'},{key:'tesla',name:'Turret: Tesla Relay',cost:160,type:'base',desc:'Every turret shot chains lightning.'},{key:'cryo',name:'Turret: Freezer Clause',cost:120,type:'base',desc:'Turrets slow enemy rushes.'},{key:'barricade',name:'Reactive Barricades',cost:140,type:'base',desc:'Shelter damage fires a counter-pulse at attackers.'},{key:'repair',name:'Emergency Duct Tape',cost:45,type:'base',desc:'Repair 260 shelter integrity and 25 player integrity. Each repair costs more.'},{key:'vial',name:'Infusion Vial',cost:65,type:'supply',desc:'20-second fictional combat surge: speed, rapid fire, stamina and damage. Carry three.'},{key:'magnet',name:'Scrap Goblin Magnet',cost:80,type:'supply',desc:'Pull scrap and supplies from eight metres away.'}];
function walls(buildings=BUILDINGS){const out=[];for(const b of buildings){const y=b.d/2,x=b.w/2,g=2.6;out.push({x:b.x-x,z:b.z,w:.7,d:b.d},{x:b.x+x,z:b.z,w:.7,d:b.d});for(const side of[-1,1])for(const half of[-1,1])out.push({x:b.x+half*(x+g)/2,z:b.z+side*y,w:x-g,d:.7});}return out;}
const WALLS=[...walls(),...[[ -14,-20],[15,25],[-35,10]].map(([x,z])=>({x,z,w:2.7,d:4.5}))],COVER=[[-16,-10,1.3],[16,-10,1.3],[-17,14,1.2],[17,14,1.2],[-10,-35,1.4],[12,37,1.4],[-40,-39,1.4],[41,39,1.4]];
function blocked(s,x,z,r=.46){return Math.abs(x)>58-r||Math.abs(z)>58-r||(s.walls||WALLS).some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r)||(s.cover||COVER).some(o=>len(x-o[0],z-o[1])<o[2]+r);}
function move(s,o,x,z,r=.46){if(!blocked(s,o.x+x,o.z,r))o.x+=x;if(!blocked(s,o.x,o.z+z,r))o.z+=z;}
function note(s,text){s.message=text;s.messageTime=5;}
function make(seed=1,max=Infinity,options={}){const rng=random(seed),s={rng,seed,max,time:0,floorTime:0,depth:0,wave:0,phase:'prep',phaseTime:20,status:'playing',player:{x:0,z:10,hp:100,stamina:100,angle:Math.PI,dash:0,dashCD:0,pulseCD:0,inv:2,fireCD:0,infusion:0,vials:0},base:{x:0,z:2,hp:1100,maxHp:1100,reactive:false,hitCD:0},scrap:100,spent:0,repairs:0,weapons:{pistol:{mods:[]}},weapon:'pistol',turrets:[],tesla:false,cryo:false,magnet:false,enemies:[],bullets:[],zones:[],drops:[],effects:[],relays:[],cover:COVER,buildings:BUILDINGS,walls:WALLS,caches:BUILDINGS.slice(1).map((b,i)=>({id:i,x:b.x,z:b.z,open:false})),rats:Array.from({length:16},(_,i)=>({id:i,x:(rng()-.5)*100,z:(rng()-.5)*100,angle:rng()*TAU})),score:0,capsules:0,kills:0,combo:0,comboTime:0,bestCombo:0,bank:0,spawn:1,budget:0,spawned:0,bossSpawned:false,bossDown:false,revengeAt:null,serial:0,perks:{power:0,rapid:0,recovery:0,pierce:0,salvage:0,dashwake:0,conductor:0},stats:{parries:0,dodges:0,relays:0,bosses:0,repairs:0},aim:{x:0,z:-1},message:'WELCOME TO THE SHELTER. THE RATS ARE UNPAID QA.',messageTime:7,ui:null,requestExtract:false,navAt:0,flow:null};configure(s,options);return s;}
function threat(s){return s.district.difficulty*(1+s.wave*.13+Math.expm1(Math.min(12,Math.max(0,s.combatTime-(s.guardianDown?180:480))/300)));}

function price(s,key){const item=SHOP.find(x=>x.key===key);return item?item.cost+(key==='repair'?s.repairs*28:key==='turret'?s.turrets.length*35:0):Infinity;}
function owned(s,key){const [type,id]=key.split(':');if(type==='weapon')return !!s.weapons[id];if(type==='mod')return s.weapons[s.weapon].mods.includes(id);return key==='tesla'?s.tesla:key==='cryo'?s.cryo:key==='barricade'?s.base.reactive:key==='magnet'?s.magnet:false;}
function buy(s,key){if(s.status!=='playing'||len(s.player.x+4,s.player.z-3)>5)return false;const item=SHOP.find(x=>x.key===key),cost=price(s,key);if(item?.type==='weapon'&&owned(s,key)){return equip(s,key.split(':')[1]);}if(!['turret','repair','vial'].includes(key)&&!s.shop.stock.some(i=>i.key===key&&!i.sold))return false;if(!item||!available(s,item.key)||s.scrap<cost||owned(s,key)&&item.type!=='weapon'||key==='turret'&&s.turrets.length>=4||key==='vial'&&s.player.vials>=3||key==='repair'&&s.base.hp>=s.base.maxHp&&s.player.hp>=s.player.maxHp||['tesla','cryo'].includes(key)&&s.turrets.length===0)return false;if(item.type==='weapon'&&owned(s,key)){s.weapon=key.split(':')[1];return true;}s.scrap-=cost;s.spent+=cost;const[type,id]=key.split(':');if(type==='weapon'){s.weapons[id]={mods:[]};s.weapon=id;}else if(type==='mod')installMod(s,id);else if(key==='turret'){const spots=[[-10,5],[10,5],[-10,-5],[10,-5]],pos=spots[s.turrets.length];s.turrets.push({id:++s.serial,x:pos[0],z:pos[1],angle:0,cd:0});}else if(key==='repair'){s.base.hp=Math.min(s.base.maxHp,s.base.hp+260);s.player.hp=Math.min(s.player.maxHp,s.player.hp+25);s.repairs++;s.stats.repairs++;}else if(key==='vial')s.player.vials++;else if(key==='tesla')s.tesla=true;else if(key==='cryo')s.cryo=true;else if(key==='barricade')s.base.reactive=true;else if(key==='magnet')s.magnet=true;const stock=s.shop.stock.find(i=>i.key===key&&!i.sold);if(stock)stock.sold=true;cancelCharge(s);note(s,'PURCHASED: '+item.name.toUpperCase());return true;}
function cancelCharge(s){s.player.charge=0;s.player.fireHeld=false;s.player.holdAge=0;s.burst=null;}
function equip(s,key){if(!s.weapons[key])return false;cancelCharge(s);s.weapon=key;return true;}
function vial(s){const p=s.player;if(s.status!=='playing'||!p.vials||p.infusion>0)return false;p.vials--;p.infusion=20;p.hp=Math.min(p.maxHp,p.hp+15);note(s,'INFUSION ACTIVE. LIABILITY HAS LEFT THE BUILDING.');return true;}
function context(s){
 if(s.action)return{kind:'channel',text:'SIGNAL LINK · '+Math.max(0,s.action.required-s.action.time).toFixed(1)+'s · MOVE TO CANCEL'};
 if(s.supply==='carried'&&len(s.player.x,s.player.z-2)<6)return{kind:'delivery',text:'[E] SECURE PROTOTYPE · REPAIR SHELTER + FIRING SQUAD BLUEPRINT'};
 const drop=s.drops.filter(d=>d.life>0&&['mod','weapon','blueprint'].includes(d.kind)&&len(s.player.x-d.x,s.player.z-d.z)<3).sort((a,b)=>len(a.x-s.player.x,a.z-s.player.z)-len(b.x-s.player.x,b.z-s.player.z))[0];
 if(drop)return{kind:'drop',id:drop.id,text:'[E] '+(drop.kind==='mod'?'MODIFICATION':drop.kind==='blueprint'?'BLUEPRINT':'WEAPON')+' / '+lootName(drop)+' · '+A.rarity[drop.tier].name};
 if(len(s.player.x+4,s.player.z-3)<4)return{kind:'shop',text:'[E] BONGO’S ROTATING PROCUREMENT'};
 const cache=s.caches.find(c=>!c.claimed&&len(s.player.x-c.x,s.player.z-c.z)<3.5);if(cache)return{kind:'cache',id:cache.id,text:cache.type==='vault'&&!cache.unsealed?'[E] ELITE VAULT / '+(cache.encounter?'DEFEAT THE GUARD':'SUMMON GUARD · RARE BLUEPRINT REWARD'):'[E] '+cache.label+' / CHOOSE A REWARD'};
 const relay=s.relays.find(r=>!r.on&&len(s.player.x-r.x,s.player.z-r.z)<3);if(relay)return{kind:'relay',id:relay.id,text:'[E] RESTORE SIGNAL '+relay.label+' · 2.5s LINK'};
 if(len(s.player.x-4,s.player.z-3)<3)return{kind:'assault',text:s.relays.every(r=>r.on)&&s.guardianId===null?'[E] CALL GUARDIAN · WHEN YOU ARE READY':s.phase==='prep'?'[E] CALL ASSAULT EARLY / BONUS REROLL VOUCHER':'ASSAULT IN PROGRESS'};
 if(len(s.player.x,s.player.z-14)<3)return{kind:'extract',text:s.time>=60?'[E] CALL EXTRACTION · '+s.extractionRequired+'s CHANNEL':'EXTRACTION RADIO / OPENS AT 1:00'};
 return null;
}
function interact(s){if(s.status!=='playing'||s.lootMenu||s.offer)return false;const c=context(s);if(!c)return false;
 if(c.kind==='drop')return pickDrop(s,c.id);
 if(c.kind==='cache')return openCache(s,s.caches[c.id]);
 if(c.kind==='shop'){s.ui='shop';return true;}
 if(c.kind==='relay'){s.action={kind:'relay',id:c.id,time:0,required:2.5};return true;}
 if(c.kind==='assault')return s.relays.every(r=>r.on)&&s.guardianId===null?callGuardian(s):callAssault(s);
 if(c.kind==='delivery'){s.supply='delivered';if(!s.blueprints.includes('relay'))s.blueprints.push('relay');s.scrap+=100;s.base.hp=Math.min(s.base.maxHp,s.base.hp+250);requisition(s);note(s,'PROTOTYPE SECURED. EXTRACT TO KEEP THE FIRING SQUAD BLUEPRINT.');return true;}
 if(c.kind==='extract'&&s.time>=60){s.requestExtract=true;return true;}return false;
}
function shot(s,x,z,a,speed,hostile,damage=15,extra={}){s.bullets.push({id:++s.serial,x,z,vx:Math.sin(a)*speed,vz:Math.cos(a)*speed,hostile,damage,life:extra.life||3,r:hostile?.2:.15,hit:[],...extra});}

function hurt(s,n,sourceX,sourceZ){const p=s.player;if(s.status!=='playing'||p.inv>0||p.dash>0)return false;if(p.guard>0&&sourceX!==undefined&&frontal(s,sourceX,sourceZ)){block(s);return false;}if(s.practice)return false;n*=s.protocol.armor;const absorbed=Math.min(p.overshield,n);p.overshield-=absorbed;n-=absorbed;p.hp=Math.max(0,p.hp-n);s.lastDamage=s.time;s.damageSource=sourceX===undefined?null:{x:sourceX,z:sourceZ};s.action=null;p.inv=.55;s.bank=0;s.effects.push({kind:'hit',x:p.x,z:p.z,life:.3});if(p.hp<=0){s.status='dead';s.loss='YOU DIED. THE RATS WILL WRITE YOUR INCIDENT REPORT.';}return true;}
function baseHurt(s,n){if(s.practice)return;if(s.status!=='playing')return;s.base.hp=Math.max(0,s.base.hp-n);s.lastBaseDamage=s.time;s.effects.push({kind:'hit',x:0,z:2,life:.25});if(s.base.reactive&&s.base.hitCD<=0){s.base.hitCD=1;for(const e of s.enemies)if(len(e.x,e.z-2)<11)damage(s,e,45);s.effects.push({kind:'pulse',x:0,z:2,life:.5});}if(s.base.hp<=0){s.status='dead';s.loss='SHELTER LOST. YOUR LEASE HAS BEEN TERMINATED.';}}
const BOSSES=['mole','archer','sludge','potency','revenge','warden','stamp','rig'];
function spawn(s,kind,x,z){if(x===undefined){const a=s.rng()*TAU;x=Math.sin(a)*49;z=Math.cos(a)*49;}for(let i=0;i<20&&blocked(s,x,z,.8);i++){x=clamp(x+(s.rng()-.5)*8,-53,53);z=clamp(z+(s.rng()-.5)*8,-53,53);}const hp=(NEW_ENEMIES[kind]?.hp||{stalker:30,rat:12,lancer:65,gunner:42,sniper:55,bomber:60,mole:1100,archer:700,sludge:5200,potency:55,revenge:8000,warden:1000,coil:65,surveyor:80,reaper:45}[kind])*threat(s);const e={id:++s.serial,kind,x,z,hp,maxHp:hp,angle:0,timer:1+s.rng(),state:'walk',wind:0,vx:0,vz:0,stun:0,slow:0,phase:0,flash:0,boss:BOSSES.includes(kind),orbitHit:0,protection:0,march:0};s.enemies.push(e);return e;}
function damage(s,e,n){if(e.dead)return;s.effects.push({id:++s.serial,kind:'damage',x:e.x,z:e.z,amount:Math.round(n),life:.65,source:e.id});const behind=((s.player.x-e.x)*Math.sin(e.angle)+(s.player.z-e.z)*Math.cos(e.angle))/(len(s.player.x-e.x,s.player.z-e.z)||1);const shell=e.kind==='revenge'&&e.state!=='reload'?.4:e.kind==='mole'&&e.state==='recover'?1.6:e.kind==='sludge'&&behind<-.2?2.3:1;e.hp-=n*shell*(e.exposed?1.65:1)*(1-(e.protection||0))*(1+Math.min(.5,(e.corrosion||0)*.15));e.flash=.12;if(e.hp>0)return;e.dead=true;s.kills++;s.combo=s.comboTime>0?s.combo+1:1;s.comboTime=4;s.bestCombo=Math.max(s.bestCombo,s.combo);s.score+=(e.boss?500:25)*Math.min(4,1+s.combo*.07);s.player.stamina=Math.min(s.player.maxStamina,s.player.stamina+4);if(s.protocol.id==='engineer'&&s.sentry&&len(e.x-s.sentry.x,e.z-s.sentry.z)<20)s.scrap+=3;s.effects.push({kind:'burst',x:e.x,z:e.z,life:.5});if(e.id===s.guardianId&&e.kind!=='potency'){s.guardianDown=true;s.clearTime=s.time;s.capsules=Math.min(12,s.capsules+3);note(s,'GUARDIAN TERMINATED. EXTRACT TO SECURE YOUR DISTRICT CLEAR.');}if(e.kind==='potency'){s.revengeAt=s.time+9;note(s,'MR. POTENCY DEFEATED? HE REQUESTED A REMATCH. 9 SECONDS.');}else if(e.boss){s.stats.bosses++;s.capsules=Math.min(12,s.capsules+2);s.scrap+=e.kind==='revenge'?500:130;note(s,e.kind==='revenge'?'MR. POTENCY RETIRED. HR IS IN SHAMBLES.':'BOSS DOWN. THE RATS REMAIN UNIMPRESSED.');}onEnemyDefeated(s,e);}

function dash(s,i={}){const p=s.player;if(s.status!=='playing'||p.dashCD>0||p.stamina<32)return false;const moving=len(i.mx||0,i.mz||0)>.1;let x=moving?i.mx:s.aim.x,z=moving?i.mz:s.aim.z,n=len(x,z)||1;p.dx=x/n;p.dz=z/n;p.dash=.22;p.dashCD=s.protocol.dash;p.stamina-=32;s.action=null;if(s.perks.dashwake){for(const e of s.enemies)if(len(e.x-p.x,e.z-p.z)<5){damage(s,e,22);e.slow=2;}s.effects.push({kind:'pulse',x:p.x,z:p.z,life:.45});}combatTrigger(s,'dash');s.stats.dodges++;return true;}
function pulse(s){const p=s.player;if(s.status!=='playing'||p.pulseCD>0||p.stamina<28)return false;p.stamina-=28;p.pulseCD=2.7;s.action=null;s.effects.push({kind:'pulse',x:p.x,z:p.z,life:.45});for(const b of s.bullets)if(b.hostile&&len(b.x-p.x,b.z-p.z)<4){const t=s.enemies.filter(e=>!e.dead).sort((a,b)=>len(a.x-p.x,a.z-p.z)-len(b.x-p.x,b.z-p.z))[0],a=t?Math.atan2(t.x-b.x,t.z-b.z):Math.atan2(-b.vx,-b.vz);b.hostile=false;b.vx=Math.sin(a)*30;b.vz=Math.cos(a)*30;b.damage=90;b.life=3;s.stats.parries++;combatTrigger(s,'parry');}for(const bomb of s.enemyBombs)if(len(bomb.x-p.x,bomb.z-p.z)<5){bomb.defused=true;s.parts++;}for(const e of s.enemies)if(len(e.x-p.x,e.z-p.z)<4){if(!e.boss)e.stun=1;damage(s,e,25);}return true;}
function nextWave(s){s.wave++;s.depth=s.wave;s.phase='assault';s.phaseTime=0;s.floorTime=0;s.budget=7+s.wave*4;s.spawned=0;s.spawn=.2;s.bossSpawned=false;s.bossDown=false;rotateStock(s,'ASSAULT '+s.wave);note(s,'WAVE '+s.wave+' · HR HAS DECLINED YOUR VACATION REQUEST.');}
// Two flow fields route the horde through real building doorways instead of sticking to walls.
const N=60,CELL=2,grid=(x,z)=>({x:clamp(Math.floor((x+60)/CELL),0,N-1),z:clamp(Math.floor((z+60)/CELL),0,N-1)});
function flow(s,x,z){if(!s.navMask)s.navMask=Array.from({length:N*N},(_,k)=>blocked(s,(k%N)*2-59,Math.floor(k/N)*2-59,.7));const goal=grid(x,z),dist=new Int16Array(N*N).fill(-1),queue=new Int16Array(N*N);let a=0,b=0;const start=goal.z*N+goal.x;queue[b++]=start;dist[start]=0;while(a<b){const id=queue[a++],gx=id%N,gz=Math.floor(id/N);for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=gx+dx,zz=gz+dz,k=zz*N+xx;if(xx<0||zz<0||xx>=N||zz>=N||dist[k]>=0||s.navMask[k])continue;dist[k]=dist[id]+1;queue[b++]=k;}}return dist;}
function seek(s,e,tx,tz,speed,dt,field){let dx=tx-e.x,dz=tz-e.z;const g=grid(e.x,e.z),here=g.z*N+g.x;let best=field?.[here],target=null;for(const[x,z]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=g.x+x,zz=g.z+z,k=zz*N+xx;if(xx<0||zz<0||xx>=N||zz>=N)continue;const value=field?.[k];if(value>=0&&(best<0||value<best)){best=value;target={x:xx*2-59,z:zz*2-59};}}if(target&&len(dx,dz)>3){dx=target.x-e.x;dz=target.z-e.z;}const d=len(dx,dz)||1;move(s,e,dx/d*speed*dt,dz/d*speed*dt,e.boss?.75:.48);}
function clearLine(s,x,z,tx,tz){const d=len(tx-x,tz-z),n=Math.ceil(d/1);for(let i=1;i<n;i++)if(blocked(s,x+(tx-x)*i/n,z+(tz-z)*i/n,.12))return false;return true;}
function telegraph(s,e,kind,wind){e.state=kind;e.wind=wind;e.vx=Math.sin(e.angle);e.vz=Math.cos(e.angle);}
// Attack contacts are events, not damage-per-frame. Sweep the actual movement
// segment so a charge cannot miss or multiply its reactor hit with refresh rate.
function segmentDistance(x,z,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1),0,1);return len(x-ax-dx*t,z-az-dz*t);}
function chargeImpact(s,e,kind){e.state='recover';e.wind=.65;e.timer=2.4;s.effects.push({kind:'impact',x:e.x,z:e.z,life:.5,source:kind});}
function step(s,dt,i={}){let left=Math.min(.25,Math.max(0,dt));while(left>0&&s.status==='playing'&&!s.offer&&!s.lootMenu){const d=Math.min(1/60,left);left-=d;tick(s,d,i);}return s;}
function tick(s,dt,i){const p=s.player;s.time+=dt;s.floorTime+=dt;if(s.phase==='assault')s.combatTime+=dt;statusTick(s,dt);enemySupportTick(s,dt);if(s.time>=s.max){s.status='extracted';return;}const difficulty=threat(s);s.messageTime=Math.max(0,s.messageTime-dt);s.comboTime=Math.max(0,s.comboTime-dt);s.base.hitCD=Math.max(0,s.base.hitCD-dt);p.inv=Math.max(0,p.inv-dt);p.dashCD=Math.max(0,p.dashCD-dt);p.pulseCD=Math.max(0,p.pulseCD-dt);p.fireCD-=dt;p.linkCD=Math.max(0,p.linkCD-dt);p.gadgetCD=Math.max(0,p.gadgetCD-dt);if(p.guard>0){p.guard-=dt;p.guardAge+=dt;if(p.guard<=0){for(const e of s.enemies)if(len(e.x-p.x,e.z-p.z)<4&&frontal(s,e.x,e.z)){damage(s,e,45);e.stun=1.2;}s.effects.push({kind:'pulse',x:p.x,z:p.z,life:.45});}}if(s.sentry){s.sentry.life-=dt;if(s.sentry.life<=0)s.sentry=null;}p.infusion=Math.max(0,p.infusion-dt);p.stamina=Math.min(p.maxStamina,p.stamina+(p.infusion>0?38:21)*(1+s.perks.recovery*.35)*dt);let ax=i.ax??s.aim.x,az=i.az??s.aim.z;if(len(ax,az)>.05){const n=len(ax,az);s.aim={x:ax/n,z:az/n};p.angle=Math.atan2(ax,az);}let mx=i.mx||0,mz=i.mz||0,n=Math.max(1,len(mx,mz));mx/=n;mz/=n;const moving=len(mx,mz)>.1;const flooded=s.district.id===2&&Math.abs(Math.abs(p.x)-22)<1.6&&Math.abs(p.z/16-Math.round(p.z/16))>.08;if(flooded){mx*=.62;mz*=.62;}
if(p.dash>0){move(s,p,p.dx*25*dt,p.dz*25*dt);p.dash=Math.max(0,p.dash-dt);}else move(s,p,mx*(p.infusion>0?9:7)*(p.guard>0?.45:s.supply==='carried'?.9:1)*dt,mz*(p.infusion>0?9:7)*(p.guard>0?.45:s.supply==='carried'?.9:1)*dt);triggerWeapon(s,dt,i);if(i.bank&&s.time>=60&&!moving&&!i.fire){s.bank+=dt;if(s.bank>=s.extractionRequired){s.status='extracted';return;}}else s.bank=Math.max(0,s.bank-dt*2);
missionTick(s,dt,moving||i.fire);if(s.phase==='prep'){s.phaseTime-=dt;if(s.phaseTime<=0)nextWave(s);}else{s.spawn-=dt;if(s.spawn<=0&&s.spawned<s.budget&&s.enemies.length<Math.min(64,12+s.wave*3)){const kinds=s.wave<2?['stalker','rat','skitter']:['stalker','gunner','rat','lancer','insurer','sapper','breacher','spitter','foreman','skitter',...(s.wave>=3?['sniper','bomber']:[]),...(s.district.id>=2?['coil']:[]),...(s.district.id>=3?['surveyor']:[]),...(s.district.id>=4?['reaper','lancer']:[])];spawn(s,kinds[Math.floor(s.rng()*kinds.length)]);s.spawned++;s.spawn=Math.max(.3,1.8-s.wave*.07);}if(s.guardianDown&&s.wave>=5&&!s.bossSpawned&&s.floorTime>15){s.bossSpawned=true;spawn(s,['mole','archer','warden','revenge','stamp','rig'][(s.wave-5)%6],0,-20);note(s,'OVERTIME ENFORCEMENT. THE EXIT IS STILL OPEN.');}if(s.revengeAt!==null&&s.time>=s.revengeAt){s.revengeAt=null;const rehired=spawn(s,'revenge',p.x+12,p.z-12);if(s.district.id===4&&!s.guardianDown){s.guardianId=rehired.id;rehired.guardian=true;rehired.hp=rehired.maxHp=3600*threat(s);}note(s,'MR. POTENCY: REHIRED. HE BROUGHT THE VAPOUR CANNON.');}if(s.spawned>=s.budget&&true&&s.revengeAt===null&&!s.enemies.some(e=>!e.dead)){s.phase='prep';s.phaseTime=60;s.shopVouchers++;rotateStock(s,'QUIET SCAVENGING');s.scrap+=70+s.wave*12;s.score+=200+s.wave*30;s.capsules=Math.min(12,s.capsules+1);s.base.hp=Math.min(s.base.maxHp,s.base.hp+25);note(s,'WAVE CLEARED. SHOP, REPAIR OR EXTRACT. THE BILL GETS WORSE.');}}
s.navAt-=dt;if(s.navAt<=0){s.navAt=.6;s.flow={base:s.baseFlow??=flow(s,0,2),player:flow(s,p.x,p.z)};}
for(const t of [...s.turrets,...(s.sentry?[s.sentry]:[])]){t.cd-=dt;if(t.cd>0)continue;const target=s.enemies.filter(e=>!e.dead&&e.state!=='burrow'&&len(e.x-t.x,e.z-t.z)<25&&clearLine(s,t.x,t.z,e.x,e.z)).sort((a,b)=>len(a.x-t.x,a.z-t.z)-len(b.x-t.x,b.z-t.z))[0];if(target){t.angle=Math.atan2(target.x-t.x,target.z-t.z);shot(s,t.x,t.z,t.angle,34,false,t.temporary?18:23,{electric:s.tesla||t.temporary&&weapon(s).shock>0,frost:s.cryo||t.temporary&&weapon(s).chill>0});t.cd=.48;}}
for(const e of s.enemies){if(e.dead)continue;e.flash=Math.max(0,e.flash-dt);e.slow=Math.max(0,e.slow-dt);e.emerge=Math.max(0,(e.emerge||0)-dt);if(e.stun>0){e.stun-=dt;continue;}const pd=len(p.x-e.x,p.z-e.z),bd=len(e.x,e.z-2),targetPlayer=e.boss||pd<12,tx=targetPlayer?p.x:0,tz=targetPlayer?p.z:2,dx=tx-e.x,dz=tz-e.z,d=len(dx,dz)||1;if(e.kind==='sludge'){const target=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(target-e.angle),Math.cos(target-e.angle));e.angle+=delta*Math.min(1,dt*.8);}else e.angle=Math.atan2(dx,dz);e.timer-=dt;let speed=({rat:5,stalker:2.6,lancer:3.3,mole:2,archer:3,sludge:.9,potency:1.6,revenge:3.4,warden:1.6}[e.kind]||2.1)*(e.slow>0?.45:1)*(1+Math.max(0,difficulty-2)*.12);
speed*=1+(e.march||0);if(stepNewEnemy(s,e,dt))continue;
if(e.state==='burrow'){e.wind-=dt;const ox=e.x,oz=e.z;e.x+=(p.x-e.x)*dt*2;e.z+=(p.z-e.z)*dt*2;if(e.wind<.65){e.x=e.lockX??=p.x;e.z=e.lockZ??=p.z;}e.dustCD=(e.dustCD||0)-dt;if(e.dustCD<=0){e.dustCD=.08;s.effects.push({kind:'burrow-dust',x:e.x,z:e.z,life:.65,seed:e.id,angle:Math.atan2(e.x-ox,e.z-oz)});}if(e.wind<=0){if(blocked(s,e.x,e.z,.8)){e.x=0;e.z=16;}s.zones.push({id:++s.serial,kind:'eruption',x:e.x,z:e.z,r:4,age:0,warn:.12,life:.65});s.effects.push({kind:'eruption',x:e.x,z:e.z,life:1.1,seed:e.id});e.state='recover';e.wind=1.5;e.emerge=.6;e.lockX=e.lockZ=undefined;e.timer=3.8;for(let j=0;j<10;j++)shot(s,e.x,e.z,j*TAU/10,10,true,18,{});}continue;}
if(e.state==='recover'){e.wind-=dt;if(e.wind<=0)e.state='walk';continue;}
if(e.state==='reload'){e.wind-=dt;if(e.wind<=0){e.state='walk';e.timer=.3;}continue;}
if(e.state==='wind'||e.state==='bow'||e.state==='cannon'){e.wind-=dt;if(e.kind==='lancer'&&e.wind>.35){e.vx=dx/d;e.vz=dz/d;}if(e.wind<=0){if(e.kind==='lancer'){e.state='charge';e.wind=.8;e.timer=3;e.chargeHitBase=false;e.chargeHitPlayer=false;}else if(e.kind==='sniper'||e.kind==='archer'||e.kind==='surveyor'){const count=e.kind==='archer'?5:e.kind==='surveyor'?3:1;for(let j=0;j<count;j++)shot(s,e.x,e.z,Math.atan2(e.vx,e.vz)+(j-(count-1)/2)*.16,e.kind==='archer'?23:28,true,(e.kind==='archer'?20:22)*difficulty,{life:4});if(e.kind==='archer')for(let j=0;j<3;j++)s.zones.push({id:++s.serial,kind:'arrow',x:p.x+(j-1)*3,z:p.z,age:0,warn:1.2,life:1.8,r:1.7});e.state='walk';e.timer=2;}else if(e.kind==='revenge'||e.kind==='warden'){e.phase++;const count=e.kind==='revenge'?22:12;for(let j=0;j<count;j++)if((j+e.phase)%7!==0)shot(s,e.x,e.z,j*TAU/count+e.phase*.23,9+difficulty,true,(e.kind==='revenge'?25:15)*difficulty,{life:5});if(e.kind==='revenge'){for(let j=-2;j<=2;j++)shot(s,e.x,e.z,e.angle+j*.1,20,true,30*difficulty,{life:4});s.zones.push({id:++s.serial,kind:'vapour',x:p.x,z:p.z,age:0,warn:1,life:3,r:3});}e.state=e.phase%3===0?'reload':'walk';e.wind=2.2;e.timer=1.7;}else if(e.kind==='bomber'){s.zones.push({id:++s.serial,kind:'mine',x:p.x,z:p.z,age:0,warn:1.2,life:2.2,r:3});e.state='walk';e.timer=3;}else{if(targetPlayer&&d<2.1)hurt(s,12*difficulty,e.x,e.z);else if(!targetPlayer&&bd<6)baseHurt(s,10*difficulty);e.state='walk';e.timer=1.1;}}continue;}
if(e.state==='charge'){const ax=e.x,az=e.z;move(s,e,e.vx*17*dt,e.vz*17*dt,.5);e.wind-=dt;if(!e.chargeHitBase&&segmentDistance(s.base.x,s.base.z,ax,az,e.x,e.z)<2.3){e.chargeHitBase=true;baseHurt(s,10*difficulty);chargeImpact(s,e,'reactor');}else if(!e.chargeHitPlayer&&segmentDistance(p.x,p.z,ax,az,e.x,e.z)<1.25){e.chargeHitPlayer=true;if(hurt(s,24*difficulty))chargeImpact(s,e,'player');}else if(len(e.x-ax,e.z-az)<dt){chargeImpact(s,e,'wall');}if(e.wind<=0&&e.state==='charge')e.state='walk';continue;}
if(e.kind==='coil'){if(d>10)seek(s,e,tx,tz,speed,dt,s.flow?.player);if(e.timer<=0){for(let j=0;j<4;j++)shot(s,e.x,e.z,j*TAU/4+s.time*.12,10,true,13*difficulty,{life:4});e.timer=2.4;}}else if(e.kind==='surveyor'){if(d<8)seek(s,e,e.x-dx,e.z-dz,2,dt,null);if(e.timer<=0)telegraph(s,e,'bow',1.5);}else if(e.kind==='reaper'){seek(s,e,p.x,p.z,5.2,dt,s.flow?.player);if(e.timer<=0&&pd<2.8){telegraph(s,e,'wind',.65);}}else if(e.kind==='mole'){seek(s,e,p.x,p.z,speed,dt,s.flow?.player);if(e.timer<=0){e.state='burrow';e.wind=3;e.timer=6;note(s,'MORTGAGE MOLE IS BURROWING. WATCH THE DUST RING.');}}
else if(e.kind==='sludge'){seek(s,e,0,2,speed,dt,s.flow?.base);if(e.timer<=0){s.zones.push({id:++s.serial,kind:'sludge',x:e.x,z:e.z,age:0,warn:.7,life:7,r:4,tick:0});if(pd<4)hurt(s,6*difficulty);if(bd<7)baseHurt(s,8*difficulty);e.timer=3.2;}}
else if(['stalker','rat','lancer'].includes(e.kind)){if(d>1.6&&!(bd<5&&!targetPlayer))seek(s,e,tx,tz,speed,dt,targetPlayer?s.flow?.player:s.flow?.base);if(e.timer<=0&&(d<(e.kind==='lancer'?11:2.2)||!targetPlayer&&bd<6))telegraph(s,e,'wind',e.kind==='lancer'?.9:.5);}
else if(e.kind==='gunner'){if(d>12)seek(s,e,tx,tz,speed,dt,targetPlayer?s.flow?.player:s.flow?.base);if(e.timer<=0&&clearLine(s,e.x,e.z,tx,tz)){for(let j=-1;j<=1;j++)shot(s,e.x,e.z,e.angle+j*.19,12,true,12*difficulty,{life:4});e.timer=2.3;}}
else if(e.kind==='sniper'||e.kind==='archer'){if(d<7)seek(s,e,e.x-dx,e.z-dz,speed,dt,null);if(e.timer<=0)telegraph(s,e,'bow',e.kind==='archer'?1.05:1.3);}
else if(e.kind==='bomber'){if(d>16)seek(s,e,tx,tz,speed,dt,s.flow?.player);if(e.timer<=0)telegraph(s,e,'wind',.7);}
else if(e.kind==='potency'){if(d>7)seek(s,e,p.x,p.z,1.5,dt,s.flow?.player);if(e.timer<=0){shot(s,e.x,e.z,e.angle,6,true,2,{life:3});e.timer=3;}}
else if(e.kind==='revenge'||e.kind==='warden'){if(d>8)seek(s,e,p.x,p.z,speed,dt,s.flow?.player);if(e.timer<=0)telegraph(s,e,'cannon',e.kind==='revenge'?.85:1.1);}
}

stepBallistics(s,dt);hostileWorldTick(s,dt);
for(const z of s.zones){z.age+=dt;z.tick=(z.tick||0)-dt;if(z.age<=z.warn||z.tick>0)continue;z.tick=.55;if(z.kind==='chemical'){for(const e of s.enemies)if(!e.dead&&e.state!=='burrow'&&len(e.x-z.x,e.z-z.z)<z.r){if(z.frost)e.slow=2;damage(s,e,z.plasma?25:14);if(z.electric&&z.tick>.5)for(const other of s.enemies)if(other!==e&&len(other.x-e.x,other.z-e.z)<5)damage(s,other,7);}}else if(z.kind==='plasma'){for(const e of s.enemies)if(!e.dead&&e.state!=='burrow'&&len(e.x-z.x,e.z-z.z)<z.r)damage(s,e,13);}else{const n=z.kind==='sludge'?4:18;if(zoneContains(z,p.x,p.z))hurt(s,n*difficulty);if(zoneContains({...z,r:z.r+2,w:(z.w||0)+4,d:(z.d||0)+4},0,2))baseHurt(s,n*.3*difficulty);}}
lootTick(s,dt);
for(const r of s.rats){r.angle+=Math.sin(s.time+r.id)*dt;r.x=clamp(r.x+Math.sin(r.angle)*dt*1.7,-54,54);r.z=clamp(r.z+Math.cos(r.angle)*dt*1.7,-54,54);}
for(const e of s.effects)e.life-=dt;s.enemies=s.enemies.filter(e=>!e.dead);s.bullets=s.bullets.filter(b=>b.life>0).slice(-640);s.zones=s.zones.filter(z=>z.age<z.life).slice(-70);s.effects=s.effects.filter(e=>e.life>0).slice(-100);
}

function frontal(s,x,z){const dx=x-s.player.x,dz=z-s.player.z,n=len(dx,dz)||1;return(dx*s.aim.x+dz*s.aim.z)/n>.35;}
function block(s){const p=s.player;if(p.guardAge<.4)p.empowered=true;s.effects.push({kind:'shield-spark',x:p.x+s.aim.x,z:p.z+s.aim.z,life:.3});s.stats.blocks=(s.stats.blocks||0)+1;combatTrigger(s,'parry');}
function gadget(s){
  const p=s.player;if(s.status!=='playing'||s.offer)return false;if(s.protocol.id==='enforcer'&&p.guard>0){p.guard=.001;return true;}if(s.protocol.id==='engineer'&&s.sentry&&p.gadgetCD>0){if(s.scrap<20)return false;const x=p.x+s.aim.x*2,z=p.z+s.aim.z*2;if(blocked(s,x,z,.6))return false;s.scrap-=20;s.sentry.x=x;s.sentry.z=z;note(s,'RAT SENTRY REPOSITIONED. 20 SCRAP, SAME REMAINING LIFETIME.');return true;}if(p.gadgetCD>0)return false;
  p.gadgetCD=s.protocol.cooldown;s.action=null;
  if(s.protocol.id==='enforcer'){p.guard=2.4;p.guardAge=0;note(s,'SHIELD UP. FACE THE THREAT. PERFECT BLOCKS EMPOWER YOUR NEXT VOLLEY.');}
  else if(s.protocol.id==='engineer'){
    let x=p.x+s.aim.x*2,z=p.z+s.aim.z*2;if(blocked(s,x,z,.6)){x=p.x;z=p.z;}
    s.sentry={id:++s.serial,x,z,life:14,cd:0,angle:p.angle,temporary:true};note(s,'RAT SENTRY DEPLOYED. PLEASE DO NOT ASK FOR ITS QUALIFICATIONS.');
  }else if(s.protocol.id==='chemist'){
    let x=p.x,z=p.z;for(let d=1;d<=7;d+=.5){const nx=p.x+s.aim.x*d,nz=p.z+s.aim.z*d;if(blocked(s,nx,nz,.3))break;x=nx;z=nz;}
    const payload=weapon(s);s.fields.push({id:++s.serial,x,z,r:4,age:0,life:5,tick:0,depth:1,payload:{...payload,damage:payload.damage*.45}});note(s,'UNLABELLED FLASK. A FICTIONAL COMBAT ITEM. REAL PAPERWORK.');
  }else{
    for(const e of s.enemies)if(len(e.x-p.x,e.z-p.z)<6){damage(s,e,35);e.stun=e.boss?.45:2;}
    for(const b of s.bullets)if(b.hostile&&len(b.x-p.x,b.z-p.z)<7){b.hostile=false;b.vx=-b.vx;b.vz=-b.vz;b.damage=70;s.stats.parries++;}
    s.effects.push({kind:'pulse',x:p.x,z:p.z,life:.45});note(s,'PANIC BUTTON. MANAGEMENT APPROVES THIS ONE PANIC.');
  }
  return true;
}
function contract(s){
  if(!s.guardianDown||s.contractAccepted||s.status!=='playing')return false;
  s.contractAccepted=true;s.overtimeReward=1.35;s.extractionRequired=8;s.budget+=12;s.wave=Math.max(5,s.wave);
  for(let j=0;j<4;j++)spawn(s,j?'lancer':'warden',j%2?24:-24,-20+j*10);
  note(s,'OVERTIME SIGNED: +35% ELIGIBLE SCORE. ELITE PURSUIT. EIGHT-SECOND EXTRACTION.');return true;
}
function available(s,key){if(key.startsWith('weapon:'))return s.practice||s.unlockedWeapons.includes(key.split(':')[1]);return key!=='mod:relay'||s.blueprints.includes('relay');}
function configure(s,options={}){
  s.district=DISTRICTS[Math.max(0,Math.min(3,(Number(options.district)||1)-1))];
  s.protocol=PROTOCOLS.find(p=>p.id===options.protocol)||PROTOCOLS[0];
  const p=s.player;p.maxHp=s.protocol.hp;p.hp=p.maxHp;p.maxStamina=s.protocol.stamina;p.stamina=p.maxStamina;p.gadgetCD=0;p.guard=0;p.guardAge=0;p.empowered=false;p.linkCD=0;
  if(s.protocol.id==='engineer')p.vials=1;
  s.scrap=s.protocol.scrap;
  s.buildings=BUILDINGS.map((b,i)=>({...b,x:b.x+s.district.shifts[i][0],z:b.z+s.district.shifts[i][1],color:s.district.palette.paint[i]}));
  s.walls=[...walls(s.buildings),...WALLS.slice(-3)];
  s.cover=COVER;s.navMask=null;s.baseFlow=null;
  s.caches=s.buildings.slice(1).map((b,i)=>({id:i,x:b.x,z:b.z,open:false}));
  s.relays=[1,4,5].map((k,i)=>{const b=s.buildings[k];return{id:i,label:'ABC'[i],x:b.x,z:b.z+(b.z>0?-1:1)*(b.d/2+3),on:false};});
  s.sentry=null;s.supply='available';s.blueprints=[...(options.blueprints||[])];s.contractAccepted=false;s.extractionRequired=5;s.overtimeReward=1;s.guardianId=null;s.guardianDown=false;s.action=null;s.offer=null;s.relics=[];s.lastDamage=-10;s.lastBaseDamage=-10;s.hazardAt=16;s.shots=0;
  armoryInit(s,options);s.enemyBombs=[];s.guardianReady=false;note(s,s.district.objective.toUpperCase());
}
function choose(s,key){
  if(!s.offer?.includes(key)||!PERKS[key])return false;
  s.perks[key]=(s.perks[key]||0)+1;s.relics.push(key);s.offer=null;
  if(key==='vitality'){s.player.maxHp+=25;s.player.hp=Math.min(s.player.maxHp,s.player.hp+35);}
  note(s,'REQUISITION ACCEPTED: '+PERKS[key].name);return true;
}
function requisition(s){
  const pool=Object.keys(PERKS).filter(k=>(s.perks[k]||0)<3);
  for(let j=pool.length-1;j>0;j--){const k=Math.floor(s.rng()*(j+1));[pool[j],pool[k]]=[pool[k],pool[j]];}
  s.offer=pool.slice(0,s.protocol.id==='intern'?4:3);
}
function missionTick(s,dt,interrupted){
  if(s.action){
    const r=s.relays[s.action.id];
    if(interrupted||len(s.player.x-r.x,s.player.z-r.z)>3){s.action=null;note(s,'SIGNAL LINK INTERRUPTED. FIND AN OPENING.');}
    else if((s.action.time+=dt)>=s.action.required){
      r.on=true;s.action=null;s.stats.relays++;rotateStock(s,'SIGNAL '+r.label);s.scrap+=75;s.score+=180;s.base.hp=Math.min(s.base.maxHp,s.base.hp+90);
      s.effects.push({kind:'pulse',x:r.x,z:r.z,life:.45});requisition(s);
      note(s,'SIGNAL '+r.label+' RESTORED. CHOOSE A FIELD REQUISITION.');
    }
  }
  if(s.relays.every(r=>r.on)&&s.guardianId===null&&!s.guardianReady){s.guardianReady=true;s.phase='prep';s.phaseTime=Infinity;note(s,'ALL SIGNALS LINKED. LOOT THE DISTRICT, THEN CALL THE GUARDIAN AT THE SHELTER.');}
  
if(s.phase==='assault'&&s.district.id>=2&&(s.hazardAt-=dt)<=0){
    s.hazardAt=s.district.id===4?11:17;
    const points=s.district.id===2?[[-13,-8],[13,12],[-13,28],[13,-28]]:s.district.id===3?[[-8,-18],[8,20],[-22,8],[23,-8]]:[[-12,-12],[12,14],[0,-22],[-22,0]];
    const [x,z]=points[Math.floor(s.rng()*points.length)];
    s.zones.push({id:++s.serial,kind:s.district.id===2?'surge':s.district.id===3?'audit':'strike',x,z,age:0,warn:1.8,life:4,r:s.district.id===4?4:3,tick:0});
  }
}
__BLACKSITE_COMBAT__
__BLACKSITE_ECONOMY__
__BLACKSITE_ENEMIES__
root.KMEBlacksiteEngine={cancelCharge,rerollShop,rotateStock,installInventory,recycle,research,claimLoot,addDrop,lootName,callAssault,callGuardian,applyImpact,emitAttack,REACTIONS,NEW_ENEMIES,gadget,contract,configure,choose,available,DISTRICTS,PROTOCOLS,PERKS,make,step,dash,pulse,spawn,hurt,baseHurt,damage,blocked,move,random,threat,buy,owned,price,equip,vial,context,interact,nextWave,weapon,BUILDINGS,WALLS,COVER,WEAPONS,MODS,SHOP,BOSSES,clearLine};
})(window);
