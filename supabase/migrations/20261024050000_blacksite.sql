begin;
-- Extend only BLACKSITE arcade receipts. Finale credit and all economy caps stay unchanged.
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
 if now()>r.started_at+make_interval(secs=>case when r.mode='arcade' and r.game_key='blacksite' then 930 else 330 end) or now()>r.last_seen+interval '45 seconds' then
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
 if v_elapsed<20 or v_elapsed>(case when r.mode='arcade' and r.game_key='blacksite' then 930 else 330 end) then raise exception 'Extract after twenty seconds, within fifteen minutes for BLACKSITE arcade or five minutes for the finale.';end if;
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
-- Existing ACLs are retained by CREATE OR REPLACE; explicitly deny client access again.
revoke all on function kme_private.bank_run_time(uuid),kme_private.extraction_finish_v3(uuid,integer,integer,integer,boolean) from public,anon,authenticated;
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
 if p_game_key is distinct from v_active then raise exception 'The arcade changed. Refresh to load the current game.';end if;
 v_ticket:=kme_private.extraction_start_v3(p_profile_id,p_mode);
 update kme_private.extraction_runs set game_key=v_active where id=(v_ticket->>'id')::uuid;
 return v_ticket||jsonb_build_object('game_key',v_active,'max_seconds',case when p_mode='arcade' and v_active='blacksite' then 900 else 300 end);
end; $function$;
revoke all on function public.kme_arcade_start(uuid,text,text) from public,anon;
grant execute on function public.kme_arcade_start(uuid,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
