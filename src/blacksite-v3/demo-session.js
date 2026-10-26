/* Intentionally local only: no LiveRepository methods, injected callbacks or RPCs. */
(function(){
  'use strict';
  function assertDemo(repo){
    if(document.body.dataset.demo!=='true'||!(repo instanceof DemoRepository)||repo.constructor!==DemoRepository||repo!==state.repo)throw Error('BLACKSITE v3.0 is available only in the isolated local demo.');
    return repo;
  }
  function getProgress(repo,id){
    assertDemo(repo);repo.data.blacksite30??={profiles:{},receipts:[]};
    const p=repo.data.blacksite30.profiles[id]??={unlocked:1,clears:[],classes:['intern','enforcer','engineer'],blueprints:[],records:{}};
    p.weaponBlueprints??=[];p.discoveredMods??=[];return p;
  }
  const finishV29=DemoRepository.prototype.blacksiteFinish;
  DemoRepository.prototype.blacksiteFinish=async function(id,score,wave,capsules,outcome,details){
    assertDemo(this);
    const result=await finishV29.call(this,id,score,wave,capsules,outcome);
    if(!details?.district)return result;
    const run=this.data.v3.runs.find(r=>r.id===id),p=getProgress(this,run.profile_id),data=this.data.blacksite30;
    if(data.receipts.includes(id))return{...result,progression:{...result.progression,duplicate:true}};
    let cleared=false,newDistrict=null,blueprint=false;
    if(outcome==='extracted'&&details.guardianDefeated&&details.relays===3){
      cleared=true;const district=Math.max(1,Math.min(4,Math.floor(details.district)));
      if(!p.clears.includes(district))p.clears.push(district);
      const unlocked=Math.min(4,district+1);if(unlocked>p.unlocked){p.unlocked=unlocked;newDistrict=unlocked;}
      if(p.unlocked>=2&&!p.classes.includes('chemist'))p.classes.push('chemist');
    }
    if(outcome==='extracted'&&details.prototype&&!p.blueprints.includes('relay')){p.blueprints.push('relay');blueprint=true;}
    const newWeapons=[];
    if(outcome==='extracted')for(const key of details.weaponBlueprints||[])if(window.KMEBlacksiteArmory.weapons[key]&&!p.weaponBlueprints.includes(key)){p.weaponBlueprints.push(key);newWeapons.push(key);}
    for(const key of details.discoveredMods||[])if(window.KMEBlacksiteArmory.mods[key]&&!p.discoveredMods.includes(key))p.discoveredMods.push(key);
    const personalBest=wave>(p.records.bestWave||0)||(result.score||0)>(p.records.bestScore||0);
    p.records.bestWave=Math.max(p.records.bestWave||0,wave);p.records.bestScore=Math.max(p.records.bestScore||0,result.score||0);
    run.result={...result,progression:{cleared,newDistrict,blueprint,newWeapons,unlocked:p.unlocked,personalBest}};
    data.receipts.push(id);data.receipts=data.receipts.slice(-128);this.save();
    return run.result;
  };
  const exportV29=DemoRepository.prototype.exportProfile;
  DemoRepository.prototype.exportProfile=async function(id){assertDemo(this);return{...await exportV29.call(this,id),blacksite_progression:structuredClone(getProgress(this,id))};};
  const deleteV29=DemoRepository.prototype.deleteProfile;
  DemoRepository.prototype.deleteProfile=async function(id,name){assertDemo(this);const result=await deleteV29.call(this,id,name);if(this.data.blacksite30){delete this.data.blacksite30.profiles[id];this.save();}return result;};
  window.KMEBlacksiteDemoSession=function(profile,mode){
    const repo=assertDemo(state.repo);
    const check=()=>assertDemo(repo);
    return{
      progress(){return structuredClone(getProgress(check(),profile));},
      start(){return check().arcadeStart(profile,mode,'blacksite');},
      pulse(id,nonce){return check().extractionPulse(id,nonce);},
      finish(r){return check().blacksiteFinish(r.id,r.score,r.details.wave,r.capsules,r.details.outcome,r.details);},
      cancel(id){return check().extractionFinish(id,0,0,0,false);},
      exists(){return check().data.profiles.some(p=>p.id===profile);}
    };
  };
})();
