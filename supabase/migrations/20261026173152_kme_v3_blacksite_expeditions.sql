-- Additive v3 endpoints; all existing clients/RPCs remain available.
create table if not exists kme_private.blacksite_progress(
 profile_id uuid primary key references public.kme_profiles(id) on delete cascade,
 data jsonb not null default '{"unlocked":1,"clears":[],"classes":["intern","enforcer","engineer"],"blueprints":[],"weaponBlueprints":[],"discoveredMods":[],"records":{}}',
 updated_at timestamptz not null default now(),check(jsonb_typeof(data)='object')
);
create table if not exists kme_private.blacksite_expeditions(
 run_id uuid primary key references kme_private.extraction_runs(id) on delete cascade,
 profile_id uuid not null references public.kme_profiles(id) on delete cascade,
 district integer not null check(district between 1 and 4),operative text not null check(operative in('intern','enforcer','engineer','chemist')),
 result jsonb,paused boolean not null default false
);
alter table kme_private.blacksite_progress enable row level security;
alter table kme_private.blacksite_expeditions enable row level security;
revoke all on kme_private.blacksite_progress,kme_private.blacksite_expeditions from public,anon,authenticated;

create or replace function public.kme_blacksite_progress(p_profile_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform kme_private.guard(p_profile_id,'blacksite-progress-v3',180,3600);
 return coalesce((select data from kme_private.blacksite_progress where profile_id=p_profile_id),'{"unlocked":1,"clears":[],"classes":["intern","enforcer","engineer"],"blueprints":[],"weaponBlueprints":[],"discoveredMods":[],"records":{}}'::jsonb);
end;$$;
create or replace function public.kme_blacksite_start(p_profile_id uuid,p_mode text,p_district integer,p_operative text) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb;t jsonb;
begin
 p:=public.kme_blacksite_progress(p_profile_id);
 if p_district is null or p_district not between 1 and least(4,(p->>'unlocked')::integer) or p_operative is null or not(p->'classes'?p_operative) then raise exception 'That district or operative is locked.';end if;
 t:=public.kme_arcade_start(p_profile_id,p_mode,'blacksite');
 insert into kme_private.blacksite_expeditions(run_id,profile_id,district,operative)values((t->>'id')::uuid,p_profile_id,p_district,p_operative);
 return t;
end;$$;

create or replace function public.kme_blacksite_pulse(p_run_id uuid,p_nonce uuid,p_paused boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare r kme_private.extraction_runs%rowtype;e kme_private.blacksite_expeditions%rowtype;v jsonb;n uuid;
begin
 perform kme_private.guard(null,'blacksite-pulse-v3',12,60);
 perform pg_advisory_xact_lock(hashtextextended('kme-campaign-v3',0));
 select * into r from kme_private.extraction_runs where id=p_run_id for update;
 select * into e from kme_private.blacksite_expeditions where run_id=p_run_id;
 if r.id is null or e.run_id is null or r.user_id is distinct from auth.uid() then raise exception 'That expedition belongs to another device.';end if;
 if r.result is not null or r.cancelled then return jsonb_build_object('ok',false,'message','This expedition has ended.');end if;
 if p_nonce is not null and p_nonce=r.previous_nonce then return r.last_reply;end if;
 if p_nonce is distinct from r.nonce then raise exception 'Stale expedition checkpoint.';end if;
 if now()>r.last_seen+interval '45 seconds' and not(e.paused and r.mode='arcade') then raise exception 'Connection interrupted too long. Keep the result receipt and reconnect.';end if;
 if now()<r.last_seen+interval '10 seconds' then update kme_private.blacksite_expeditions set paused=coalesce(p_paused,true) where run_id=r.id;return jsonb_build_object('ok',true,'nonce',r.nonce,'active_seconds',r.active_seconds);end if;
 -- A paused interval, including the transition back from a menu, earns no finale time.
 if coalesce(p_paused,true) or e.paused then update kme_private.extraction_runs set last_seen=now() where id=r.id;v:=jsonb_build_object('ok',true,'active_seconds',r.active_seconds);
 else v:=kme_private.bank_run_time(r.id);end if;
 n:=gen_random_uuid();v:=v||jsonb_build_object('nonce',n);
 update kme_private.extraction_runs set previous_nonce=nonce,nonce=n,last_reply=v where id=r.id;
 update kme_private.blacksite_expeditions set paused=coalesce(p_paused,true) where run_id=r.id;return v;
end;$$;

create or replace function public.kme_blacksite_settle(p_run_id uuid,p_score integer,p_wave integer,p_capsules integer,p_outcome text,p_details jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r kme_private.extraction_runs%rowtype;e kme_private.blacksite_expeditions%rowtype;p jsonb;v jsonb;v_clear boolean:=false;v_unlock integer;key text;v_new jsonb:='[]';v_before integer;v_best boolean;v_age integer;
begin
 perform kme_private.guard(null,'blacksite-settle-v3',120,3600);
 perform pg_advisory_xact_lock(hashtextextended('kme-campaign-v3',0));
 select * into r from kme_private.extraction_runs where id=p_run_id for update;
 select * into e from kme_private.blacksite_expeditions where run_id=p_run_id for update;
 if r.id is null or e.run_id is null or r.user_id is distinct from auth.uid() then raise exception 'That expedition belongs to another device.';end if;
 if e.result is not null then return e.result;end if;
 if r.result is not null then raise exception 'That expedition was settled by an older client.';end if;
 if p_details is null or jsonb_typeof(p_details)<>'object' or octet_length(p_details::text)>16000 then raise exception 'Invalid expedition summary.';end if;
 v_age:=floor(extract(epoch from(now()-r.started_at)))::integer;
 if now()>r.last_seen+interval '45 seconds' then raise exception 'Reconnect the expedition before settling.';end if;
 if e.paused then update kme_private.extraction_runs set last_seen=now() where id=r.id;end if;
 -- Preserve existing score, nonce/freshness, retention and cosmetic/campaign caps.
 v:=public.kme_blacksite_finish(p_run_id,p_score,p_wave,p_capsules,p_outcome);
 insert into kme_private.blacksite_progress(profile_id)values(r.profile_id) on conflict do nothing;
 select data into p from kme_private.blacksite_progress where profile_id=r.profile_id for update;
 v_before:=(p->>'unlocked')::integer;
 if p_outcome='extracted' and v_age>=60 and p_details->>'guardianDefeated'='true' and p_details->>'relays'='3' then
  v_clear:=true;if not(p->'clears'@>jsonb_build_array(e.district)) then p:=jsonb_set(p,'{clears}',p->'clears'||jsonb_build_array(e.district));end if;
  v_unlock:=greatest(v_before,least(4,e.district+1));p:=jsonb_set(p,'{unlocked}',to_jsonb(v_unlock));
  if v_unlock>=2 and not(p->'classes'?'chemist') then p:=jsonb_set(p,'{classes}',p->'classes'||'"chemist"'::jsonb);end if;
 end if;
 if p_outcome='extracted' and v_age>=60 then
  if p_details->>'prototype'='true' and not(p->'blueprints'?'relay') then p:=jsonb_set(p,'{blueprints}',p->'blueprints'||'"relay"'::jsonb);end if;
  if jsonb_typeof(p_details->'weaponBlueprints')='array' then
   for key in select value from jsonb_array_elements_text(p_details->'weaponBlueprints') limit 8 loop
    if key=any(array['pistol','rifle','shotgun','rivet','arc','prism','mortar','redline','annuity','saw','swarm','planter','rail','flame','stapler']) and not(p->'weaponBlueprints'?key) then p:=jsonb_set(p,'{weaponBlueprints}',p->'weaponBlueprints'||to_jsonb(key));v_new:=v_new||to_jsonb(key);end if;
   end loop;
  end if;
 end if;
 v_best:=coalesce((p->'records'->>'bestScore')::integer,0)<(v->>'score')::integer or coalesce((p->'records'->>'bestWave')::integer,0)<p_wave;
 p:=jsonb_set(p,'{records}',jsonb_build_object('bestScore',greatest(coalesce((p->'records'->>'bestScore')::integer,0),(v->>'score')::integer),'bestWave',greatest(coalesce((p->'records'->>'bestWave')::integer,0),p_wave)));
 update kme_private.blacksite_progress set data=p,updated_at=now() where profile_id=r.profile_id;
 v:=v||jsonb_build_object('progression',jsonb_build_object('cleared',v_clear,'newDistrict',case when (p->>'unlocked')::integer>v_before then (p->>'unlocked')::integer end,'blueprint',p_outcome='extracted' and v_age>=60 and p_details->>'prototype'='true','newWeapons',v_new,'unlocked',(p->>'unlocked')::integer,'personalBest',v_best));
 update kme_private.blacksite_expeditions set result=v where run_id=r.id;update kme_private.extraction_runs set result=v where id=r.id;return v;
end;$$;

do $$begin
 if to_regprocedure('kme_private.export_profile_v29(uuid)') is null then
  alter function public.kme_export_profile(uuid) rename to export_profile_v29;
  alter function public.export_profile_v29(uuid) set schema kme_private;
 end if;
end;$$;
create or replace function public.kme_export_profile(p_profile_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$begin return kme_private.export_profile_v29(p_profile_id)||jsonb_build_object('blacksite_progression',public.kme_blacksite_progress(p_profile_id));end;$$;
revoke all on function kme_private.export_profile_v29(uuid) from public,anon,authenticated;
revoke all on function public.kme_blacksite_progress(uuid),public.kme_blacksite_start(uuid,text,integer,text),public.kme_blacksite_pulse(uuid,uuid,boolean),public.kme_blacksite_settle(uuid,integer,integer,integer,text,jsonb),public.kme_export_profile(uuid) from public,anon,authenticated;
grant execute on function public.kme_blacksite_progress(uuid),public.kme_blacksite_start(uuid,text,integer,text),public.kme_blacksite_pulse(uuid,uuid,boolean),public.kme_blacksite_settle(uuid,integer,integer,integer,text,jsonb),public.kme_export_profile(uuid) to authenticated;
create or replace function public.kme_world()returns jsonb language plpgsql security definer set search_path='' as $$
declare v jsonb;begin
 if auth.uid() is null or kme_private.has_access() is distinct from true then raise exception 'Enter the group password first.' using errcode='42501';end if;
 v:=kme_private.world_v22();return v||jsonb_build_object('quality',true,'patch',jsonb_build_object('version','3.0','name','GAMING WITHOUT NICOTINE'),'main_game',jsonb_build_object('game_key','blacksite','game_name','BLACKSITE: District Expeditions','build','8.0.0'),'appearances',(select coalesce(jsonb_object_agg(profile_id,items),'{}') from kme_private.appearances));
end;$$;
revoke all on function public.kme_world() from public,anon,authenticated;grant execute on function public.kme_world() to authenticated;
notify pgrst,'reload schema';
