/* Live access uses explicit admitted RPCs. Demo still uses its exact isolated adapter. */
(function(){'use strict';
 const empty=()=>({unlocked:1,clears:[],classes:['intern','enforcer','engineer'],blueprints:[],weaponBlueprints:[],discoveredMods:[],records:{}});
 const demoFactory=window.KMEBlacksiteDemoSession;
 window.KMEBlacksiteSession=function(profile,mode){
  const repo=state.repo;
  if(document.body.dataset.demo==='true')return demoFactory(profile,mode);
  if(!(repo instanceof LiveRepository)||repo.constructor!==LiveRepository)throw Error('Choose an admitted crew character first.');
  let current=empty();const check=()=>{if(state.repo!==repo)throw Error('Your group session changed. Reopen BLACKSITE.');return repo;};
  const load=async()=>{current=await liveRpc(check(),'kme_blacksite_progress',{p_profile_id:profile});return current;};
  return{progress:()=>structuredClone(current),ready:load,
   start:(district,operative)=>liveRpc(check(),'kme_blacksite_start',{p_profile_id:profile,p_mode:mode,p_district:district,p_operative:operative}),
   pulse:(id,nonce,paused)=>liveRpc(check(),'kme_blacksite_pulse',{p_run_id:id,p_nonce:nonce,p_paused:!!paused}),
   async finish(r){const result=await liveRpc(check(),'kme_blacksite_settle',{p_run_id:r.id,p_score:r.score,p_wave:r.details.wave,p_capsules:r.capsules,p_outcome:r.details.outcome,p_details:r.details});await load();state.version++;await refreshWorld();return result;},
   cancel:id=>check().extractionFinish(id,0,0,0,false),exists:()=>state.profiles.some(p=>p.id===profile)
  };
 };
})();
