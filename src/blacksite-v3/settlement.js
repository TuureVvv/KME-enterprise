async function save(){
  if(busy||!receipt||!alive)return;busy=true;
  show('<span class="bs-tag">FIELD ACCOUNTING</span><h3>Securing your haul.</h3><p>One receipt. One result.</p>');
  try{
    if(pulsePromise)await pulsePromise;
    const result=receipt.extract?await demo.finish(receipt):await demo.cancel(receipt.id);
    if(result?.ok===false)throw Error(result.message||'Banking failed');if(!alive)return;
    const run=receipt,summary=run.summary,dead=run.details?.outcome!=='extracted',cleared=!!result.progression?.cleared,unlock=result.progression?.newDistrict;
    receipt=null;try{localStorage.removeItem(storageKey);}catch{}
    show('<div class="bs-result"><span class="bs-tag">'+(dead?'RECOVERY / 20% RETAINED':cleared?'DISTRICT SECURED':'EARLY EXTRACTION / FULL ELIGIBLE HAUL')+'</span><h3>'+(dead?'The lease<br>is lost.':cleared?'Another department.<br><em>Out of business.</em>':'Clocked out alive.')+'</h3><p>'+esc(E.DISTRICTS[(run.details?.district||1)-1].name)+' · '+esc(E.PROTOCOLS.find(c=>c.id===run.details?.operative)?.name||'OPERATIVE')+'</p><div class="bs-result-stats"><span><b>'+Math.floor(summary.time/60)+':'+String(summary.time%60).padStart(2,'0')+'</b>FIELD TIME</span><span><b>'+summary.kills+'</b>HOSTILES</span><span><b>'+(result.score||0)+'</b>BANKED SCORE</span><span><b>'+summary.parries+'</b>REFLECTED SHOTS</span></div><p>'+esc(summary.loss||(cleared?'Guardian defeated. District clear saved to your character.':'Guardian not defeated: no district clear. Your eligible haul is still safe.'))+'</p>'+(unlock?'<div class="bs-unlock"><span>NEW DISTRICT DISCOVERED</span><strong>'+esc(E.DISTRICTS[unlock-1].name)+'</strong><p>'+esc(E.DISTRICTS[unlock-1].subtitle)+'</p></div>':'')+(result.progression?.blueprint?'<p class="bs-unlock">BLUEPRINT SECURED / FIRING SQUAD · available in future runs.</p>':'')+(result.progression?.newWeapons?.length?'<p class="bs-unlock">WEAPON BLUEPRINTS SECURED / '+result.progression.newWeapons.map(id=>esc(E.WEAPONS[id].name)).join(' · ')+'</p>':'')+(result.progression?.personalBest?'<p class="bs-record">PERSONAL BEST / YOUR RECORDS HAVE BEEN UPDATED.</p>':'')+'<p>Cosmetic capsules: '+(result.loot?.length||0)+' · Score lost: '+Math.max(0,run.score-(result.score||0))+'</p><p class="bs-result-note">'+(dead?'80% of the eligible haul was lost. Previously secured progression remains.':'Combat upgrades reset. Confirmed clears, blueprints and personal records remain.')+'</p><button class="button bs-again">Choose the next expedition ↗</button></div>');
    $('.bs-loot').innerHTML=result.loot?.map(item=>'<span style="--loot:'+root.KMEExtraction.rarities.colors[item.tier]+'">'+esc(root.KMEExtraction.rarities.names[item.tier])+'</span>').join('')||'';
    text('Confirmed. '+(cleared?'District progression saved.':'No district clear awarded.')+' No nicotine report was created.');tone(650,.3);
  }catch(error){if(alive){retryScreen();text(error.message||'Your exact receipt remains on this device.');}}
  finally{busy=false;}
}
