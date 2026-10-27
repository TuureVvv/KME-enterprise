/* Shared rules for isolated practice and the interface. SQL remains authoritative live. */
(function(root){'use strict';
 const TEAMS={rehab:{name:'Quitters',subtitle:'Rehab',motto:'One minute further.',color:'#80e1e5',symbol:'◈'},night:{name:'Night Shift',subtitle:'Nicotine Users',motto:'Still here. Still in the fight.',color:'#f0bf7c',symbol:'◒'}};
 const AURAS=[
  ['Common','Desk Lamp','#b4becb','A steady halo. Standard issue, surprisingly competent.','halo'],
  ['Uncommon','Twin Satellites','#98d9ae','Two small satellites. Neither is on payroll.','twin'],
  ['Rare','Blue Hour','#86cafa','Electric arcs from the after-hours department.','arcs'],
  ['Epic','Union Constellation','#c1a4f5','A constellation with excellent collective bargaining.','constellation'],
  ['Legendary','Golden Parachute','#f4cf80','Golden rays. Management did not approve this expense.','rays'],
  ['Mythic','Rose Supernova','#f3a0c3','Rose sparks from an extremely dramatic resignation.','sparks'],
  ['Astral','Ratellite Network','#7fe7d6','Teal orbital lights. The rats have achieved spaceflight.','satellite'],
  ['Ethereal','Ghost of Overtime','#e1d8ff','Pale waves from the shift that never ended.','waves'],
  ['Void','Niko Event Horizon','#bd9bff','A violet eclipse. Niko, do not expense the black hole.','eclipse'],
  ['Aether','The Final Payrise','#f2f4c0','A luminous corona. Finally, an acceptable benefits package.','corona']
 ].map((a,tier)=>({tier,rarity:a[0],name:a[1],color:a[2],description:a[3],shape:a[4],cost:[20,35,60,100,160,240,360,520,760,1200][tier],yield:10*(tier+1)}));
 function day(at=Date.now()){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Helsinki',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(at));const part=k=>parts.find(p=>p.type===k).value;return part('year')+'-'+part('month')+'-'+part('day');}
 const ordinal=d=>Math.floor(Date.parse(d+'T00:00:00Z')/86400000);
 function operation(at=Date.now()){const today=day(at),date=new Date(today+'T00:00:00Z'),offset=(date.getUTCDay()+6)%7;date.setUTCDate(date.getUTCDate()-offset);const week=date.toISOString().slice(0,10);date.setUTCDate(date.getUTCDate()+7);return{week,day:today,ends:date.toISOString().slice(0,10),remaining:7-offset};}
 function momentum(days){return Math.min(1.35,1+.05*Math.max(0,days));}
 function award(ledger,members,{profile,user,category,receipt,at=Date.now()}){const op=operation(at),m=members.find(m=>m.profile_id===profile&&m.week===op.week&&!m.left);if(!m||ledger.some(e=>e.receipt===receipt))return null;
  const limits={game:3,art:1,resisted:1,rally:1,popular:1},points={game:10,art:10,resisted:5,rally:5,popular:10};if(!limits[category])return null;
  const today=ledger.filter(e=>e.day===op.day),own=today.filter(e=>e.profile_id===profile),device=today.filter(e=>e.user_id===user);if(own.filter(e=>e.category===category).length>=limits[category]||device.filter(e=>e.category===category).length>=limits[category])return null;
  const active=new Set(ledger.filter(e=>e.profile_id===profile&&e.week===op.week&&e.day<op.day).map(e=>e.day)).size;
  const amount=Math.max(0,Math.min(category==='game'?Math.floor(10*momentum(active)):points[category],60-own.reduce((n,e)=>n+e.amount,0),60-device.reduce((n,e)=>n+e.amount,0)));if(!amount)return null;
  const e={profile_id:profile,user_id:user,week:op.week,day:op.day,team:m.team,category,receipt,amount,created_at:new Date(at).toISOString()};ledger.push(e);return e;
 }
 function snapshot(members,ledger,profile,at=Date.now(),weekOverride){const op=operation(at),week=weekOverride||op.week,roster=members.filter(m=>m.week===week),entries=ledger.filter(e=>e.week===week),teams=Object.keys(TEAMS).map(id=>{const people=roster.filter(m=>m.team===id),target=people.reduce((n,m)=>n+m.target,0),damage=entries.filter(e=>e.team===id).reduce((n,e)=>n+e.amount,0);return{id,members:people.length,target,damage,percent:target?Math.round(damage/target*1000)/10:0};});
  const m=roster.find(m=>m.profile_id===profile),today=entries.filter(e=>e.profile_id===profile&&e.day===op.day);return{week,day:op.day,ends:op.ends,teams,membership:m?{team:m.team,left:!!m.left,target:m.target}:null,today:{damage:today.reduce((n,e)=>n+e.amount,0),counts:Object.fromEntries(['game','art','resisted','rally','popular'].map(k=>[k,today.filter(e=>e.category===k).length]))},momentum:momentum(new Set(entries.filter(e=>e.profile_id===profile&&e.day<op.day).map(e=>e.day)).size),roster:roster.map(m=>({profile_id:m.left?null:m.profile_id,team:m.team,left:!!m.left,target:m.target,damage:entries.filter(e=>e.profile_id===m.profile_id).reduce((n,e)=>n+e.amount,0)})),recent:entries.slice(-8).reverse().map(({user_id,receipt,...e})=>({...e,profile_id:roster.find(m=>m.profile_id===e.profile_id)?.left?null:e.profile_id}))};
 }
 root.KMENightfall={TEAMS,AURAS,day,ordinal,operation,momentum,award,snapshot};
})(typeof window==='undefined'?globalThis:window);
