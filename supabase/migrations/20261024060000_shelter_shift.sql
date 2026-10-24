begin;
-- Permanent main game, independent of the rotating cabinet. No health data changes.
CREATE OR REPLACE FUNCTION kme_private.bank_run_time(p_run_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r kme_private.extraction_runs%rowtype;c kme_private.campaigns%rowtype;v_delta integer;v_next integer;
begin
 select * into r from kme_private.extraction_runs where id=p_run_id for update;
 if not found or r.user_id is distinct from auth.uid() or r.cancelled or r.finished_at is not null then
  return jsonb_build_object('ok',false,'message','This run is no longer active.');end if;
 if (not(r.mode='arcade' and r.game_key='blacksite') and now()>r.started_at+interval '330 seconds') or now()>r.last_seen+interval '45 seconds' then
  update kme_private.extraction_runs set cancelled=true where id=r.id;
  return jsonb_build_object('ok',false,'message','Run paused too long. Start a fresh escape.');end if;
 v_delta:=least(30,greatest(0,300-r.active_seconds),greatest(0,floor(extract(epoch from(now()-r.last_seen)))::integer));
 update kme_private.extraction_runs set active_seconds=least(300,active_seconds+v_delta),last_seen=now() where id=r.id;
 if r.mode='finale' and v_delta>0 then
  select * into c from kme_private.campaigns where id=r.campaign_id for update;
  if c.status='finale' then
   insert into kme_private.raid_contributions as rc(campaign_id,profile_id,seconds,last_seen)
    values(c.id,r.profile_id,v_delta,now()) on conflict(campaign_id,profile_id) do update
    set seconds=rc.seconds+excluded.seconds,last_seen=now();
   update kme_private.campaigns set finale_seconds=least(finale_goal,finale_seconds+v_delta) where id=c.id;
   if c.finale_seconds+v_delta>=c.finale_goal then
    update kme_private.campaigns set status='defeated',defeated_at=now() where id=c.id;
    perform kme_private.spawn_campaign(c.level+1);
   end if;
  end if;
 end if;
 select * into c from kme_private.campaigns where id=r.campaign_id;
 return jsonb_build_object('ok',true,'active_seconds',least(300,r.active_seconds+v_delta),
  'finale_seconds',coalesce(c.finale_seconds,0),'finale_goal',coalesce(c.finale_goal,1200),'boss_defeated',c.status='defeated');
end; $function$
;
CREATE OR REPLACE FUNCTION kme_private.extraction_finish_v3(p_run_id uuid, p_score integer, p_greed integer, p_capsules integer, p_extract boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r kme_private.extraction_runs%rowtype;c kme_private.campaigns%rowtype;d kme_private.extraction_daily%rowtype;
 v_elapsed integer;v_damage integer:=0;v_credit jsonb;v_result jsonb;v_loot jsonb:='[]'::jsonb;
 v_weights integer[]:=array[450000,250000,140000,80000,40000,20000,10000,6000,3000,1000];
 v_min integer;v_total integer:=0;v_roll integer;v_tier integer;v_i integer;v_caps integer;v_day date:=(now() at time zone 'UTC')::date;
begin
 perform kme_private.guard(null,'extraction-finish',120,3600);
 perform pg_advisory_xact_lock(hashtextextended('kme-campaign-v3',0));
 select * into r from kme_private.extraction_runs where id=p_run_id for update;
 if not found or r.user_id is distinct from auth.uid() then raise exception 'That ticket belongs to another device.';end if;
 if r.result is not null then return r.result;end if;
 if p_extract is not true then
  v_result:=jsonb_build_object('ok',true,'cancelled',true,'damage',0,'loot','[]'::jsonb);
  update kme_private.extraction_runs set cancelled=true,finished_at=now(),result=v_result where id=r.id;return v_result;
 end if;
 if r.cancelled then raise exception 'That run was cancelled.';end if;
 v_elapsed:=floor(extract(epoch from(now()-r.started_at)))::integer;
 if v_elapsed<20 or (not(r.mode='arcade' and r.game_key='blacksite') and v_elapsed>330) then raise exception 'Extract after twenty seconds, while the ticket is active; finale and rotating games retain their five-minute limit.';end if;
 if p_score is null or p_score<0 or p_score>least(10000,v_elapsed*30)
  or p_greed is null or p_greed<0 or p_greed>least(14,v_elapsed/20)
  or p_capsules is null or p_capsules<0 or p_capsules>least(12,v_elapsed/8) then
  raise exception 'The result exceeds this run’s timing or game limits.';end if;
 v_credit:=kme_private.bank_run_time(r.id);
 if(v_credit->>'ok')::boolean is distinct from true then raise exception '%',v_credit->>'message';end if;
 insert into kme_private.extraction_daily(profile_id,day) values(r.profile_id,v_day) on conflict do nothing;
 select * into d from kme_private.extraction_daily where profile_id=r.profile_id and day=v_day for update;
 select * into c from kme_private.campaigns where id=r.campaign_id for update;
 if c.status in('wearing','sealed') and exists(select 1 from kme_private.boss_members where campaign_id=c.id and profile_id=r.profile_id) then
  if d.successes<2 then v_damage:=least(60,greatest(1,floor(p_score/20.0*power(2,least(p_greed,4)))::integer),120-d.damage);
  elsif d.chips<20 then v_damage:=1;end if;
  update kme_private.campaigns set damage=damage+v_damage where id=c.id;
 end if;
 update kme_private.extraction_daily set successes=successes+1,damage=damage+v_damage,
  chips=chips+case when d.successes>=2 and v_damage=1 then 1 else 0 end where profile_id=r.profile_id and day=v_day;
 v_min:=least(3,p_greed/2);
 for v_i in v_min+1..10 loop v_total:=v_total+v_weights[v_i];end loop;
 v_caps:=least(12,p_capsules);
 if v_caps>0 then for v_i in 1..v_caps loop
  v_roll:=floor(random()*v_total)::integer;v_tier:=v_min;
  while v_tier<9 and v_roll>=v_weights[v_tier+1] loop v_roll:=v_roll-v_weights[v_tier+1];v_tier:=v_tier+1;end loop;
  insert into kme_private.inventory as inv(profile_id,tier,quantity) values(r.profile_id,v_tier,1)
   on conflict(profile_id,tier) do update set quantity=inv.quantity+1;
  v_loot:=v_loot||jsonb_build_array(jsonb_build_object('tier',v_tier));
 end loop;end if;
 insert into kme_private.extraction_stats as s(profile_id,best,extracts,damage,capsules)
  values(r.profile_id,p_score,1,v_damage,v_caps) on conflict(profile_id) do update
  set best=greatest(s.best,excluded.best),extracts=s.extracts+1,damage=s.damage+excluded.damage,capsules=s.capsules+excluded.capsules;
 v_result:=jsonb_build_object('ok',true,'score',p_score,'greed',p_greed,'damage',v_damage,'loot',v_loot,
  'successful_runs_today',d.successes+1,'full_damage_left',greatest(0,1-d.successes),'cosmetic_only',true,
  'finale',v_credit,'rare_pool_weight',v_total,'min_tier',v_min);
 update kme_private.extraction_runs set finished_at=now(),result=v_result where id=r.id;
 perform kme_private.sync_campaign();return v_result;
end; $function$
;
CREATE OR REPLACE FUNCTION public.kme_arcade_start(p_profile_id uuid, p_mode text, p_game_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_active text;v_ticket jsonb;
begin
 perform kme_private.guard(p_profile_id,'arcade-start-v4',120,3600);
 select game_key into v_active from kme_private.arcade_config where singleton;
 if p_game_key is distinct from 'blacksite' and p_game_key is distinct from v_active then raise exception 'The arcade changed. Refresh to load the current game.';end if;
 v_ticket:=kme_private.extraction_start_v3(p_profile_id,p_mode);
 update kme_private.extraction_runs set game_key=p_game_key where id=(v_ticket->>'id')::uuid;
 return v_ticket||jsonb_build_object('game_key',p_game_key,'max_seconds',case when p_mode='arcade' and p_game_key='blacksite' then null else 300 end);
end; $function$
;
CREATE OR REPLACE FUNCTION kme_private.world_v5()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_base jsonb;
begin
 v_base:=kme_private.world_v3();
 return v_base||jsonb_build_object('version',4,'arcade',kme_private.arcade_snapshot());
end; $function$
;
CREATE OR REPLACE FUNCTION kme_private.export_profile_v5(p_profile_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_base jsonb;
begin
 v_base:=kme_private.export_profile_v3(p_profile_id);
 return v_base||jsonb_build_object('arcade_votes',coalesce((select jsonb_agg(to_jsonb(v)-'user_id') from kme_private.arcade_votes v where profile_id=p_profile_id),'[]'::jsonb),
 'relief_games',coalesce((select jsonb_agg(to_jsonb(r)-'user_id') from kme_private.relief_runs r where profile_id=p_profile_id),'[]'::jsonb),
 'relief_daily',coalesce((select jsonb_agg(to_jsonb(d)) from kme_private.relief_daily d where profile_id=p_profile_id),'[]'::jsonb),
 'arcade_scores',coalesce((select jsonb_agg(to_jsonb(s)) from kme_private.arcade_run_scores s where profile_id=p_profile_id),'[]'::jsonb));
end; $function$
;

create table if not exists kme_private.blacksite_stats(
 profile_id uuid primary key references public.kme_profiles(id) on delete cascade,
 best_score integer not null default 0,best_wave integer not null default 0,longest_seconds integer not null default 0,
 extractions integer not null default 0,deaths integer not null default 0,updated_at timestamptz not null default now(),
 check(best_score between 0 and 10000),check(best_wave>=0),check(longest_seconds>=0),check(extractions>=0 and deaths>=0)
);
alter table kme_private.blacksite_stats enable row level security;
revoke all on kme_private.blacksite_stats from public,anon,authenticated;

create or replace function public.kme_blacksite_finish(p_run_id uuid,p_score integer,p_wave integer,p_capsules integer,p_outcome text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare r kme_private.extraction_runs%rowtype;v_elapsed integer;v_score integer;v_caps integer;v_greed integer;v_result jsonb;v_success boolean;
begin
 perform kme_private.guard(null,'blacksite-finish-v6',120,3600);
 -- Keep the same lock ordering as the existing checkpoint and reward helpers.
 perform pg_advisory_xact_lock(hashtextextended('kme-campaign-v3',0));
 select * into r from kme_private.extraction_runs where id=p_run_id for update;
 if not found or r.user_id is distinct from auth.uid() or r.game_key<>'blacksite' then raise exception 'That BLACKSITE ticket belongs to another device or game.';end if;
 if r.result is not null then return r.result;end if;
 v_elapsed:=greatest(0,floor(extract(epoch from(now()-r.started_at)))::integer);
 if p_outcome is null or p_outcome not in('extracted','defeated','retreated') then raise exception 'Choose a valid raid outcome.';end if;
 if p_score is null or p_score<0 or p_score>least(10000,v_elapsed*30) or p_wave is null or p_wave<0 or p_wave>v_elapsed/20+1
  or p_capsules is null or p_capsules<0 or p_capsules>least(12,v_elapsed/8) then raise exception 'That raid result exceeds its timing or game limits.';end if;
 v_success:=p_outcome='extracted';
 v_score:=case when v_success then p_score else floor(p_score*.2)::integer end;
 v_caps:=case when v_success then p_capsules else floor(p_capsules*.2)::integer end;
 v_greed:=case when v_success then least(14,greatest(0,p_wave-1),v_elapsed/20) else 0 end;
 v_result:=public.kme_extraction_finish(p_run_id,v_score,v_greed,v_caps,true);
 v_result:=v_result||jsonb_build_object('blacksite',jsonb_build_object('outcome',p_outcome,'wave',p_wave,'seconds',v_elapsed,'retained_percent',case when v_success then 100 else 20 end));
 insert into kme_private.blacksite_stats as s(profile_id,best_score,best_wave,longest_seconds,extractions,deaths)
 values(r.profile_id,v_score,p_wave,v_elapsed,case when v_success then 1 else 0 end,case when v_success then 0 else 1 end)
 on conflict(profile_id) do update set best_score=greatest(s.best_score,excluded.best_score),best_wave=greatest(s.best_wave,excluded.best_wave),
  longest_seconds=greatest(s.longest_seconds,excluded.longest_seconds),extractions=s.extractions+excluded.extractions,deaths=s.deaths+excluded.deaths,updated_at=now();
 update kme_private.extraction_runs set result=v_result where id=r.id;
 return v_result;
end; $fn$;

create or replace function public.kme_world()
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_world jsonb;v_scores jsonb;
begin
 v_world:=kme_private.world_v5();
 select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) into v_scores from kme_private.blacksite_stats s;
 return v_world||jsonb_build_object('version',6,'main_game',jsonb_build_object('game_key','blacksite','game_name','BLACKSITE: Shelter Shift','build','6.0.0'),'main_scores',v_scores);
end; $fn$;

create or replace function public.kme_export_profile(p_profile_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
begin
 return kme_private.export_profile_v5(p_profile_id)||jsonb_build_object('blacksite_stats',(select to_jsonb(s) from kme_private.blacksite_stats s where profile_id=p_profile_id));
end; $fn$;
revoke all on function kme_private.bank_run_time(uuid),kme_private.extraction_finish_v3(uuid,integer,integer,integer,boolean),kme_private.world_v5(),kme_private.export_profile_v5(uuid) from public,anon,authenticated;
revoke all on function public.kme_blacksite_finish(uuid,integer,integer,integer,text),public.kme_arcade_start(uuid,text,text),public.kme_world(),public.kme_export_profile(uuid) from public,anon,authenticated;
grant execute on function public.kme_blacksite_finish(uuid,integer,integer,integer,text),public.kme_arcade_start(uuid,text,text),public.kme_world(),public.kme_export_profile(uuid) to authenticated;
create table if not exists kme_private.relief_scores(
 run_id uuid primary key references kme_private.relief_runs(id) on delete cascade,
 profile_id uuid not null references public.kme_profiles(id) on delete cascade,
 score integer not null check(score between 0 and 500000),hits integer not null check(hits between 0 and 5000),
 seconds integer not null check(seconds between 0 and 300),created_at timestamptz not null default now()
);
create index if not exists kme_relief_score_profile on kme_private.relief_scores(profile_id);
alter table kme_private.relief_scores enable row level security;
revoke all on kme_private.relief_scores from public,anon,authenticated;

create or replace function public.kme_relief_finish(p_run_id uuid,p_hits integer,p_score integer,p_resisted boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare r kme_private.relief_runs%rowtype;v_seconds numeric;v_fragments integer;v_result jsonb;v_event uuid;v_allowed boolean;
begin
 perform kme_private.guard(null,'relief-finish-v2',120,3600);
 perform pg_advisory_xact_lock(hashtextextended('kme-campaign-v3',0));
 select * into r from kme_private.relief_runs where id=p_run_id for update;
 if not found or r.user_id is distinct from auth.uid() then raise exception 'That game receipt belongs to another device.';end if;
 if r.result is null then
  v_seconds:=least(300,greatest(0,extract(epoch from(now()-r.started_at))));
  if p_hits is null or p_hits<0 or p_hits>least(5000,floor(v_seconds*40)+1) or p_score is null or p_score<0 or p_score>least(500000,ceil(v_seconds*8000)) then
   raise exception 'That score exceeds this game ticket timing or limits.';end if;
  v_fragments:=least(60,p_hits,floor(least(90,floor(v_seconds))/.7)::integer);
  v_result:=public.kme_relief_bank(p_run_id,v_fragments);
  insert into kme_private.relief_scores(run_id,profile_id,score,hits,seconds) values(r.id,r.profile_id,p_score,p_hits,floor(v_seconds)::integer) on conflict do nothing;
  v_result:=v_result||jsonb_build_object('score',p_score,'resisted_logged',false);
 else v_result:=r.result;end if;
 if p_resisted is true and coalesce((v_result->>'resisted_logged')::boolean,false)=false then
  v_allowed:=exists(select 1 from kme_private.device_preferences where user_id=auth.uid() and allow_nicotine)
   and exists(select 1 from public.kme_profiles where id=r.profile_id and tracking_enabled);
  if v_allowed then
   v_event:=gen_random_uuid();
   insert into public.kme_activity(id,profile_id,kind,created_by) values(v_event,r.profile_id,'resisted',auth.uid());
   v_result:=v_result||jsonb_build_object('resisted_logged',true,'resisted_event_id',v_event);
  else v_result:=v_result||jsonb_build_object('resisted_logged',false,'resisted_unavailable',true);end if;
 end if;
 update kme_private.relief_runs set result=v_result where id=r.id;
 return v_result;
end; $fn$;

create or replace function public.kme_world()
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_world jsonb;v_scores jsonb;v_relief jsonb;v_history jsonb;
begin
 v_world:=kme_private.world_v5();
 select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) into v_scores from kme_private.blacksite_stats s;
 select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) into v_relief from(select profile_id,max(score) as best,count(*) as runs,max(seconds) as longest_seconds from kme_private.relief_scores group by profile_id)s;
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'game_key',b.winner_key,'game_name',(select c->>'name' from jsonb_array_elements(b.choices)c where c->>'key'=b.winner_key),'build',b.published_build,'published_at',b.published_at) order by b.published_at desc),'[]'::jsonb)
  into v_history from kme_private.arcade_ballots b where b.status='published';
 return v_world||jsonb_build_object('version',6,'patch',jsonb_build_object('version','2.0','name','MAJOR ANTI TWEAK SYSTEM OFFLINE'),
 'main_game',jsonb_build_object('game_key','blacksite','game_name','BLACKSITE: Shelter Shift','build','2.0.0-anti-tweak'),
 'main_scores',v_scores,'relief_scores',v_relief,'arcade_history',v_history);
end; $fn$;
create or replace function public.kme_export_profile(p_profile_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
begin
 return kme_private.export_profile_v5(p_profile_id)||jsonb_build_object('blacksite_stats',(select to_jsonb(s) from kme_private.blacksite_stats s where profile_id=p_profile_id),
  'tweakmax_scores',coalesce((select jsonb_agg(to_jsonb(s)) from kme_private.relief_scores s where profile_id=p_profile_id),'[]'::jsonb));
end; $fn$;
revoke all on function public.kme_relief_finish(uuid,integer,integer,boolean),public.kme_world(),public.kme_export_profile(uuid) from public,anon,authenticated;
grant execute on function public.kme_relief_finish(uuid,integer,integer,boolean),public.kme_world(),public.kme_export_profile(uuid) to authenticated;

notify pgrst,'reload schema';
commit;
