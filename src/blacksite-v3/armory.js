/* Content is data. All delivery shapes consume the same compiled payload. */
(function(root){'use strict';
const W=(name,mode,damage,rate,speed,cost,desc,extra={})=>({name,mode,damage,rate,speed,cost,desc,pellets:1,...extra});
const weapons={
 pistol:W('Union Pistol','bullet',24,.32,34,0,'Precise, reliable, and technically company property.'),
 rifle:W('Boiler Rifle','bullet',15,.16,38,80,'Automatic fire. A surprisingly effective argument.'),
 shotgun:W('Four-Barrel Grievance','bullet',17,.72,29,95,'Four close-range pellets. Submit every grievance at once.',{pellets:4,spread:.72}),
 rivet:W('Rivet Repeater','bullet',32,.43,32,100,'Heavy piercing fasteners. Also opens hostile conversations.',{pierce:2,impact:1.2}),
 arc:W('Arc Fork','bullet',33,.58,29,140,'An electrical projectile that jumps between targets.',{shock:1,chains:2}),
 prism:W('Prism Carbine','bullet',19,.18,40,190,'Two converging bolts, built for corridors and ricochets.',{pellets:2,spread:.12,pierce:1}),
 mortar:W('Mortgage Launcher','bullet',80,1.1,14,175,'Slow explosive shells. Heavy impacts punish frozen groups.',{splash:3.5,size:1.7,impact:2}),
 redline:W('Niko’s Final Warning','beam',145,.4,0,220,'Hold to charge. Release a sustained red cutting beam. NIKO NOOOO was the entire safety briefing.',{charge:1.05,minCharge:.28,range:38,width:.8,duration:.6,pierce:8,ember:.3,impact:.2}),
 annuity:W('Compound Interest','ring',34,.35,13,230,'Hold to grow a luminous ring. Release it through the district; only the rim deals contact damage.',{charge:1.2,minCharge:.22,radius:2.4,width:.38,duration:2.6,pierce:12,shock:.35,impact:.3}),
 saw:W('Union Circular','saw',45,.85,23,165,'A spinning saw flies out, then comes back. Internal mail has become violent.',{size:1.3,returnDelay:.65,pierce:7,impact:1.5}),
 swarm:W('Rat King Special','burst',10,.65,29,195,'Five tracking darts. The rats voted for guided procurement.',{burst:5,burstGap:.075,homing:2.3,size:.7}),
 planter:W('Pension Planter','mine',60,.8,17,155,'Throw armed proximity mines into a planned retreat route.',{splash:3.6,arm:.6,mineLife:24,impact:1.6}),
 rail:W('Liability Lance','rail',190,.5,0,240,'Charge a narrow instantaneous shot through a line of targets. Count your openings.',{charge:.85,minCharge:.2,range:48,width:.28,pierce:12,impact:2.5}),
 flame:W('Fire Exit','flame',5,.09,19,160,'A short-range fan of fire. The exit itself is now the hazard.',{pellets:3,spread:.4,lifetime:.48,ember:1,impact:.1}),
 stapler:W('Executive Stapler','burst',23,.65,38,150,'Three tight bursts. Great for headcount reduction.',{burst:3,burstGap:.085,pierce:1})
};
const op=(stat,value,kind='add')=>({stat,value,kind});
const M=(name,tier,family,desc,ops)=>({name,tier,family,desc,cost:[65,100,145,190][tier],ops});
const mods={
 electric:M('Chain Lightning',2,'payload','Hits arc to nearby enemies. Shock reacts with cold and conductive targets.',[op('shock',1),op('chains',2)]),
 plasma:M('Plasma Wake',2,'payload','Impacts leave burning pools. Frozen targets can shatter inside the same payload.',[op('ember',.6),op('pools',1)]),
 quad:M('Quadra Shot',2,'pattern','Four times the projectiles or delivery paths, with reduced damage per path.',[op('pellets',4,'multiply'),op('damage',.63,'multiply'),op('spread',.42)]),
 ricochet:M('Ricochet License',1,'trajectory','Two wall rebounds. Beams reflect; rings rebound; projectiles keep their payload.',[op('bounces',2)]),
 frost:M('Cryo Rounds',1,'payload','Build chill and slow targets. Impact and fire can consume a freeze for a burst.',[op('chill',.85)]),
 vampire:M('Goblin Blood Tax',2,'utility','A fraction of direct damage returns as health, with a bounded recovery rate.',[op('leech',.025)]),
 orbit:M('Orbital Rats',3,'pattern','Three cyan-harnessed allies orbit you, carrying a lighter copy of your weapon payload.',[op('orbit',3)]),
 relay:M('Firing Squad',3,'utility','Firing near shelter turrets commands linked shots. Their payload inherits your elemental traits.',[op('relay',1)]),
 returning:M('Return to Sender',1,'trajectory','Projectiles and travelling rings return after contact. One return; beams already occupy their whole path.',[op('returning',1)]),
 calibre:M('Management Calibre',0,'payload','More damage and heavier impacts; slower firing.',[op('damage',1.35,'multiply'),op('rate',1.14,'multiply'),op('impact',.5)]),
 hairtrigger:M('Hair-Trigger Policy',0,'pattern','Faster fire and charge recovery, with lighter hits.',[op('rate',.78,'multiply'),op('damage',.86,'multiply')]),
 needle:M('Needle Audit',0,'trajectory','Small, fast shots pierce one extra target. Beam and ring contact bands become finer.',[op('size',.65,'multiply'),op('width',.7,'multiply'),op('speed',1.4,'multiply'),op('pierce',1)]),
 breach:M('Breach of Contract',1,'trajectory','Pass through three additional enemies. Beams gain more target capacity; area weapons already affect groups.',[op('pierce',3)]),
 hollow:M('Hollow Promises',1,'payload','Add a compact impact explosion at the cost of direct damage.',[op('splash',1.8),op('damage',.82,'multiply')]),
 homing:M('Guided Excuses',1,'trajectory','Deliveries steer gently toward visible enemies. Walls still matter.',[op('homing',2)]),
 predator:M('Executive Targeting',2,'trajectory','Steering favours larger, tougher enemies rather than the nearest rat.',[op('homing',1.3),op('priority',1)]),
 rubber:M('Rubber Stamp',0,'trajectory','Four more rebounds and a bigger contact shape. Predictable paperwork pinball.',[op('bounces',4),op('size',1.18,'multiply')]),
 wide:M('Broad Interpretation',0,'pattern','Much wider projectiles, beams and rings; slightly slower travel.',[op('size',1.6,'multiply'),op('width',1.55,'multiply'),op('speed',.85,'multiply')]),
 accelerator:M('Express Procurement',0,'trajectory','Faster travel and longer reach. Your invoice arrives first.',[op('speed',1.5,'multiply'),op('range',1.2,'multiply')]),
 longshot:M('Remote Work Clause',0,'trajectory','Longer-lasting projectiles and impact fields, with extra beam reach.',[op('lifetime',1.65,'multiply'),op('duration',1.3,'multiply'),op('range',1.4,'multiply')]),
 ember:M('Hostile Work Environment',0,'payload','Hits leave a burning status. Fire and chill share the reaction system.',[op('ember',.85)]),
 permafrost:M('Permafrost Benefits',2,'payload','Strong chill freezes enemies sooner, at a small firing-rate cost.',[op('chill',1.35),op('rate',1.08,'multiply')]),
 static:M('Static Meeting',1,'payload','A little shock, an extra chain jump and wider conduction range.',[op('shock',.6),op('chains',1),op('chainRadius',2)]),
 acid:M('Liability Solvent',1,'payload','Corrosion damages and softens armour. Burning corrosion can detonate.',[op('acid',1)]),
 toxic:M('Wastewater Dividend',2,'payload','Impacts leave corrosive fields, even on beams, rings and mine blasts.',[op('acid',.5),op('pools',1)]),
 shrapnel:M('Exit Interview',1,'pattern','The first impact produces four lighter fragments carrying the same elemental payload.',[op('split',4)]),
 fork:M('Department Split',2,'pattern','Pierce a target and fork into two new paths. Child paths cannot fork forever.',[op('split',2),op('pierce',1)]),
 cluster:M('Distributed Blame',2,'payload','When a delivery expires or detonates, it releases a bounded radial cluster.',[op('cluster',5)]),
 nova:M('All-Hands Meeting',3,'utility','Periodic firing releases a short-range pulse using your current elemental payload.',[op('nova',1)]),
 capacitor:M('Certified Delay',1,'pattern','Stronger charged attacks and larger rings; longer charging. Automatic guns gain heavier hits.',[op('charge',1.3,'multiply'),op('damage',1.23,'multiply'),op('radius',1.2,'multiply')]),
 quickcharge:M('No More Meetings',1,'pattern','Faster charging and a little less damage. Automatic guns also cycle faster.',[op('charge',.63,'multiply'),op('rate',.9,'multiply'),op('damage',.88,'multiply')]),
 resonator:M('Harmonic Accounting',2,'pattern','Longer-lived rings, beams, fields and mines with thicker contact bands.',[op('duration',1.5,'multiply'),op('mineLife',1.4,'multiply'),op('width',1.2,'multiply')]),
 echo:M('Reply All',2,'pattern','Every attack leaves a delayed lighter copy. Echoes do not echo themselves.',[op('echo',1)]),
 afterimage:M('Exit Velocity Clause',2,'utility','Dashing fires a small fan of your current payload behind you.',[op('dashfire',1)]),
 recoil:M('Personal Space Policy',0,'payload','Hits shove enemies. Heavier deliveries get a stronger push.',[op('knockback',3)]),
 stagger:M('Mandatory Break',1,'payload','Hits briefly stagger ordinary enemies. Bosses resist repeated stagger.',[op('stagger',.22)]),
 executioner:M('Final Notice',1,'payload','Deal bonus damage to enemies below one-third health.',[op('execute',.7)]),
 headhunter:M('Headcount Reduction',1,'payload','More critical hits and a stronger critical multiplier.',[op('crit',.18),op('critPower',.5)]),
 lucky:M('Wet Rat’s Foot',2,'utility','Improve rare loot rolls and add a small critical chance. The rat kept its actual foot.',[op('luck',1),op('crit',.08)]),
 duplex:M('Backdated Invoice',1,'pattern','Add a rear-facing delivery path. Watch where you stand when it returns.',[op('angles',[Math.PI],'append')]),
 sideshot:M('Horizontal Promotion',1,'pattern','Add side-facing paths. All paths retain the compiled payload.',[op('angles',[-Math.PI/2,Math.PI/2],'append')]),
 helix:M('Double-Entry Wobble',1,'trajectory','Travelling deliveries weave across their path; beams and fields gain a pulsing width.',[op('wobble',.7)]),
 spiral:M('Circular Reasoning',1,'trajectory','Deliveries curve while travelling. Combine with rebounds or tracking.',[op('curve',.65)]),
 gravity:M('Gravity of the Situation',2,'payload','Impacts pull nearby enemies toward the hit point, feeding other area effects.',[op('pull',2.2)]),
 magnet:M('Expense Reclamation',0,'utility','Your equipped weapon attracts nearby ordinary scrap and supplies from farther away.',[op('lootRange',5)]),
 salvage:M('Parts of the Problem',1,'utility','Kills can drop salvage parts for Bongo’s research bench.',[op('salvage',.22)]),
 bounty:M('Questionable Bonus',0,'utility','Kills yield extra run scrap and score. Existing settlement caps still apply.',[op('bounty',.3)]),
 aegis:M('Union Coverage',2,'utility','Successful parries grant a small temporary overshield. Ground hazards still demand respect.',[op('parryShield',8)]),
 overdrive:M('Unpaid Overtime',2,'pattern','Holding fire gradually accelerates automatic fire and charges. Releasing resets the ramp.',[op('ramp',.45)]),
 momentum:M('Running from HR',1,'payload','Moving builds a modest damage bonus. Standing still gives the bonus back.',[op('momentum',.4)])
};
const rarity=[{name:'COMMON',color:'#d7ddba'},{name:'UNCOMMON',color:'#a8df95'},{name:'RARE',color:'#92d9ed'},{name:'EXOTIC',color:'#d0b0f4'}];
const limits={damage:[1,1500],rate:[.065,4],speed:[3,85],pellets:[1,24],spread:[0,2.2],size:[.35,4],width:[.12,4],lifetime:[.18,7],duration:[.15,7],range:[5,65],radius:[.5,9],pierce:[0,32],bounces:[0,8],homing:[0,8],chains:[0,8],chainRadius:[2,13],splash:[0,7],split:[0,8],cluster:[0,10],echo:[0,2],orbit:[0,6],crit:[0,.65],critPower:[1,3.5],charge:[.15,3],minCharge:[.1,1],leech:[0,.08],stagger:[0,.5],pull:[0,5]};
function compile(key,ids=[],perks={}){
 const w=weapons[key]||weapons.pistol,base={...w,damage:w.damage,rate:w.rate,speed:w.speed||22,size:w.size||1,width:w.width||.3,lifetime:w.lifetime||2.8,duration:w.duration||.45,range:w.range||32,radius:w.radius||1,pierce:w.pierce||0,bounces:0,homing:w.homing||0,priority:0,chains:w.chains||0,chainRadius:6,splash:w.splash||0,impact:w.impact??.7,ember:w.ember||0,chill:0,shock:w.shock||0,acid:0,pools:0,leech:0,orbit:0,relay:0,returning:0,split:0,cluster:0,nova:0,echo:0,dashfire:0,knockback:0,stagger:0,execute:0,crit:0,critPower:1.6,luck:0,wobble:0,curve:0,pull:0,lootRange:0,salvage:0,bounty:0,parryShield:0,ramp:0,momentum:0,charge:w.charge||.75,minCharge:w.minCharge||.2,mineLife:w.mineLife||20,angles:[0]};
 const add={},mul={},append={};
 for(const id of [...new Set(ids)].sort())for(const entry of mods[id]?.ops||[]){if(entry.kind==='multiply')mul[entry.stat]=(mul[entry.stat]??1)*entry.value;else if(entry.kind==='append')(append[entry.stat]??=[]).push(...entry.value);else add[entry.stat]=(add[entry.stat]||0)+entry.value;}
 for(const k of new Set([...Object.keys(add),...Object.keys(mul)]))base[k]=((base[k]||0)+(add[k]||0))*(mul[k]??1);
 for(const[k,values]of Object.entries(append))base[k]=[...new Set([...(base[k]||[]),...values])].sort((a,b)=>a-b);
 base.damage*=1+(perks.power||0)*.18;base.rate/=1+(perks.rapid||0)*.15;base.pierce+=perks.pierce||0;base.chains+=(perks.conductor||0)*2;
 for(const[k,[lo,hi]]of Object.entries(limits))base[k]=Math.max(lo,Math.min(hi,Number(base[k])||lo));
 base.fieldLife=2.5*(mul.duration??1);base.minCharge=Math.min(base.minCharge,base.charge*.8);base.pellets=Math.round(base.pellets);base.angles=base.angles.slice(0,5);base.ids=[...new Set(ids)].sort();return base;
}
function unlocked(progress={}){const ids=new Set(['pistol','rifle','shotgun','rivet',...(progress.weaponBlueprints||[])]),clears=progress.clears||[];
 if(clears.includes(1))['arc','mortar','redline'].forEach(x=>ids.add(x));if(clears.includes(2))['prism','annuity'].forEach(x=>ids.add(x));if(clears.includes(3))['rail','swarm'].forEach(x=>ids.add(x));if((progress.blueprints||[]).includes('relay'))ids.add('planter');return [...ids].filter(id=>weapons[id]);}
function requirement(id){return['pistol','rifle','shotgun','rivet'].includes(id)?'Standard issue':['arc','mortar','redline'].includes(id)?'Clear and extract from Mossline Yard':['prism','annuity'].includes(id)?'Clear and extract from The Drowned Works':['rail','swarm'].includes(id)?'Clear and extract from Violet Archives':id==='planter'?'Secure the alarmed prototype':id==='flame'?'Extract after claiming three building rewards':'Secure an elite vault blueprint';}
if(Object.keys(mods).length!==50)throw Error('Armory must contain exactly 50 designed modifiers');
root.KMEBlacksiteArmory={weapons,mods,rarity,compile,unlocked,requirement,families:['pattern','trajectory','payload','utility']};
})(window);
