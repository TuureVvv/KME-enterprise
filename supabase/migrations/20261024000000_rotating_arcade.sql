-- KME v4: ballots for newly developed games and a bank-anytime relief game.
-- Run in the existing project AFTER the v3 major update. No password changes.
begin;
do $check$ begin
 if to_regclass('kme_private.campaigns') is null or to_regprocedure('public.kme_privacy(boolean)') is null then
  raise exception 'Install the v3 major update first.';end if;
end; $check$;

create table if not exists kme_private.arcade_config(
 singleton boolean primary key default true check(singleton),game_key text not null default 'smoke-break',
 game_name text not null default 'Smoke Break: Extraction',build text not null default '4.0.0',published_at timestamptz not null default now()
);
insert into kme_private.arcade_config(singleton) values(true) on conflict do nothing;
create table if not exists kme_private.arcade_ballots(
 id uuid primary key default gen_random_uuid(),opened_at timestamptz not null default now(),
 closes_at timestamptz not null default now()+interval '48 hours',choices jsonb not null,
 status text not null default 'open' check(status in('open','awaiting_build','no_votes','published')),
 winner_key text,published_build text,published_at timestamptz,check(jsonb_typeof(choices)='array' and jsonb_array_length(choices)=3)
);
create unique index if not exists kme_one_arcade_ballot on kme_private.arcade_ballots((true)) where status in('open','awaiting_build');
create table if not exists kme_private.arcade_votes(
 ballot_id uuid not null references kme_private.arcade_ballots(id) on delete cascade,
 profile_id uuid not null references public.kme_profiles(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 choice_key text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 primary key(ballot_id,user_id),unique(ballot_id,profile_id)
);
create table if not exists kme_private.relief_runs(
 id uuid primary key default gen_random_uuid(),profile_id uuid not null references public.kme_profiles(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,campaign_id uuid references kme_private.campaigns(id) on delete set null,
 started_at timestamptz not null default now(),seed integer not null,result jsonb
);
create index if not exists kme_relief_recent on kme_private.relief_runs(user_id,started_at desc);
create table if not exists kme_private.relief_daily(
 profile_id uuid not null references public.kme_profiles(id) on delete cascade,day date not null,hits integer not null default 0,
 damage integer not null default 0 check(damage between 0 and 10),primary key(profile_id,day)
);
create table if not exists kme_private.relief_device_daily(
 user_id uuid not null references auth.users(id) on delete cascade,day date not null,hits integer not null default 0,
 damage integer not null default 0 check(damage between 0 and 10),primary key(user_id,day)
);
alter table kme_private.extraction_runs add column if not exists game_key text not null default 'smoke-break';
create table if not exists kme_private.arcade_run_scores(
 run_id uuid primary key references kme_private.extraction_runs(id) on delete cascade,
 profile_id uuid not null references public.kme_profiles(id) on delete cascade,game_key text not null,
 score integer not null,created_at timestamptz not null default now()
);
alter table kme_private.arcade_config enable row level security;
alter table kme_private.arcade_ballots enable row level security;
alter table kme_private.arcade_votes enable row level security;
alter table kme_private.relief_runs enable row level security;
alter table kme_private.relief_daily enable row level security;
alter table kme_private.relief_device_daily enable row level security;
alter table kme_private.arcade_run_scores enable row level security;
revoke all on kme_private.arcade_config,kme_private.arcade_ballots,kme_private.arcade_votes,kme_private.relief_runs,
 kme_private.relief_daily,kme_private.relief_device_daily,kme_private.arcade_run_scores from public,anon,authenticated;
insert into kme_private.arcade_run_scores(run_id,profile_id,game_key,score,created_at)
 select id,profile_id,game_key,(result->>'score')::integer,finished_at from kme_private.extraction_runs
 where result ? 'score' and not cancelled on conflict do nothing;

create or replace function kme_private.validate_arcade_choices(p_choices jsonb)
returns void language plpgsql set search_path='' as $fn$
declare item jsonb;
begin
 if p_choices is null or jsonb_typeof(p_choices)<>'array' or jsonb_array_length(p_choices)<>3 then raise exception 'Provide exactly three game proposals.';end if;
 if(select count(distinct x->>'key') from jsonb_array_elements(p_choices)x)<>3 then raise exception 'Proposal keys must be distinct.';end if;
 for item in select * from jsonb_array_elements(p_choices) loop
  if coalesce(item->>'key','') !~ '^[a-z][a-z0-9-]{2,39}$' or char_length(coalesce(item->>'name','')) not between 3 and 60
   or char_length(coalesce(item->>'pitch','')) not between 10 and 250 or char_length(coalesce(item->>'mechanic','')) not between 10 and 250
  then raise exception 'Each proposal needs a valid key, name, pitch and mechanic.';end if;
 end loop;
end; $fn$;

create or replace function kme_private.sync_arcade_ballot()
returns uuid language plpgsql security definer set search_path='' as $fn$
declare b kme_private.arcade_ballots%rowtype;v_id uuid;v_winner text;
 v_choices jsonb:='[
 {"key":"rooftop-rat-race","name":"Rooftop Rat Race","pitch":"Escape the kiosk across neon rooftops with a briefcase full of terrible decisions.","mechanic":"Double-jump, wall-kick and grind rails. Choose risky shortcuts to build a combo.","art":0},
 {"key":"swamp-delivery","name":"Swamp Delivery Service","pitch":"Get the crew their emergency snacks before the swamp eats your company van.","mechanic":"Steer a drifting boat, plan delivery routes and dodge hungry monsters.","art":1},
 {"key":"pouch-poltergeist","name":"Pouch Poltergeist","pitch":"The office is haunted by your former subscriptions. Evict them with a vacuum.","mechanic":"Aim the suction beam, manage an overheating tank and throw captured ghosts at the boss.","art":2}
 ]'::jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('kme-arcade-ballot',0));
 select * into b from kme_private.arcade_ballots where status in('open','awaiting_build') for update;
 if not found then
  select choices into v_choices from kme_private.arcade_ballots order by opened_at desc limit 1;
  if v_choices is null then v_choices:='[{"key":"rooftop-rat-race","name":"Rooftop Rat Race","pitch":"Escape the kiosk across neon rooftops with a briefcase full of terrible decisions.","mechanic":"Double-jump, wall-kick and grind rails. Choose risky shortcuts to build a combo.","art":0},{"key":"swamp-delivery","name":"Swamp Delivery Service","pitch":"Get the crew their emergency snacks before the swamp eats your company van.","mechanic":"Steer a drifting boat, plan delivery routes and dodge hungry monsters.","art":1},{"key":"pouch-poltergeist","name":"Pouch Poltergeist","pitch":"The office is haunted by your former subscriptions. Evict them with a vacuum.","mechanic":"Aim the suction beam, manage an overheating tank and throw captured ghosts at the boss.","art":2}]'::jsonb;end if;
  insert into kme_private.arcade_ballots(choices) values(v_choices) returning id into v_id;return v_id;
 end if;
 if b.status='open' and now()>=b.closes_at then
  select v.choice_key into v_winner from kme_private.arcade_votes v where ballot_id=b.id group by choice_key
   order by count(*) desc,(select ord from jsonb_array_elements(b.choices) with ordinality as x(item,ord) where item->>'key'=v.choice_key) asc limit 1;
  if v_winner is null then
   update kme_private.arcade_ballots set status='no_votes' where id=b.id;
   insert into kme_private.arcade_ballots(choices) values(b.choices) returning id into v_id;return v_id;
  end if;
  update kme_private.arcade_ballots set status='awaiting_build',winner_key=v_winner where id=b.id;
 end if;
 return b.id;
end; $fn$;

create or replace function public.kme_arcade_vote(p_profile_id uuid,p_ballot_id uuid,p_choice_key text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare b kme_private.arcade_ballots%rowtype;v_profile uuid;
begin
 perform kme_private.guard(p_profile_id,'arcade-vote',30,3600);
 perform kme_private.sync_arcade_ballot();
 select * into b from kme_private.arcade_ballots where id=p_ballot_id for update;
 if not found or b.status<>'open' or now()>=b.closes_at then raise exception 'This ballot closed. Refresh for the current round.';end if;
 if not exists(select 1 from jsonb_array_elements(b.choices)x where x->>'key'=p_choice_key) then raise exception 'Choose one of the three proposals.';end if;
 if p_profile_id is null then raise exception 'Choose your character first.';end if;
 select profile_id into v_profile from kme_private.arcade_votes where ballot_id=b.id and user_id=auth.uid();
 if found and v_profile<>p_profile_id then raise exception 'This device already voted as another character. Switch back to change that vote.';end if;
 if exists(select 1 from kme_private.arcade_votes where ballot_id=b.id and profile_id=p_profile_id and user_id<>auth.uid()) then
  raise exception 'This character already voted from another device.';end if;
 insert into kme_private.arcade_votes(ballot_id,profile_id,user_id,choice_key) values(b.id,p_profile_id,auth.uid(),p_choice_key)
 on conflict(ballot_id,user_id) do update set choice_key=excluded.choice_key,updated_at=now();
 return jsonb_build_object('ok',true);
end; $fn$;

-- Owner-only activation. The recurring developer uses this only AFTER the
-- winning game exists, passes checks, and its site deployment is verified.
create or replace function kme_private.publish_arcade(p_ballot_id uuid,p_game_key text,p_game_name text,p_build text,p_next_choices jsonb)
returns jsonb language plpgsql set search_path='' as $fn$
declare b kme_private.arcade_ballots%rowtype;v_next uuid;
begin
 perform kme_private.validate_arcade_choices(p_next_choices);perform kme_private.sync_arcade_ballot();
 select * into b from kme_private.arcade_ballots where id=p_ballot_id for update;
 if not found or b.status<>'awaiting_build' or b.winner_key is distinct from p_game_key then raise exception 'Only the closed ballot winner can be published.';end if;
 if char_length(coalesce(p_build,'')) not between 3 and 80 or char_length(coalesce(p_game_name,'')) not between 3 and 60 then raise exception 'Provide the verified build and game name.';end if;
 if exists(select 1 from jsonb_array_elements(p_next_choices)x where x->>'key' in(select y->>'key' from jsonb_array_elements(b.choices)y)) then
  raise exception 'Propose three fresh ideas rather than repeating the previous ballot.';end if;
 update kme_private.arcade_config set game_key=p_game_key,game_name=p_game_name,build=p_build,published_at=now() where singleton;
 update kme_private.arcade_ballots set status='published',published_build=p_build,published_at=now() where id=b.id;
 insert into kme_private.arcade_ballots(choices) values(p_next_choices) returning id into v_next;
 return jsonb_build_object('ok',true,'next_ballot_id',v_next);
end; $fn$;

create or replace function public.kme_relief_start(p_profile_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare r kme_private.relief_runs%rowtype;v_campaign uuid;
begin
 perform kme_private.guard(p_profile_id,'relief-start',60,3600);if p_profile_id is null then raise exception 'Choose a character first.';end if;
 perform pg_advisory_xact_lock(hashtextextended('kme-relief-start-'||auth.uid()::text,0));
 select * into r from kme_private.relief_runs where user_id=auth.uid() and profile_id=p_profile_id and result is null
  and started_at>now()-interval '5 minutes' order by started_at desc limit 1;
 if not found then
  v_campaign:=kme_private.sync_campaign();
  insert into kme_private.relief_runs(profile_id,user_id,campaign_id,seed)values(p_profile_id,auth.uid(),v_campaign,floor(random()*2147483646)::integer+1) returning * into r;
 end if;
 return jsonb_build_object('ok',true,'id',r.id,'seed',r.seed,'max_seconds',60,'started_at',r.started_at);
end; $fn$;

create or replace function public.kme_relief_bank(p_run_id uuid,p_hits integer)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare r kme_private.relief_runs%rowtype;d kme_private.relief_daily%rowtype;u kme_private.relief_device_daily%rowtype;
 c kme_private.campaigns%rowtype;v_day date;v_hits integer;v_damage integer:=0;v_earned integer;v_elapsed integer;v_result jsonb;
begin
 perform kme_private.guard(null,'relief-bank',120,3600);perform pg_advisory_xact_lock(hashtextextended('kme-campaign-v3',0));
 select * into r from kme_private.relief_runs where id=p_run_id for update;
 if not found or r.user_id is distinct from auth.uid() then raise exception 'That game receipt belongs to another device.';end if;
 if r.result is not null then return r.result;end if;
 if p_hits is null or p_hits<0 or p_hits>60 then raise exception 'Invalid completed-action count.';end if;
 v_elapsed:=least(90,greatest(0,floor(extract(epoch from(now()-r.started_at)))::integer));
 if p_hits>floor(v_elapsed/0.7) then raise exception 'That action count exceeds the game time.';end if;
 v_day:=(r.started_at at time zone 'UTC')::date;
 insert into kme_private.relief_daily(profile_id,day) values(r.profile_id,v_day) on conflict do nothing;
 insert into kme_private.relief_device_daily(user_id,day) values(r.user_id,v_day) on conflict do nothing;
 select * into d from kme_private.relief_daily where profile_id=r.profile_id and day=v_day for update;
 select * into u from kme_private.relief_device_daily where user_id=r.user_id and day=v_day for update;
 v_hits:=greatest(0,least(p_hits,30-d.hits,30-u.hits));
 v_earned:=least((d.hits+v_hits)/3-d.hits/3,(u.hits+v_hits)/3-u.hits/3);
 select * into c from kme_private.campaigns where id=r.campaign_id for update;
 if c.status in('wearing','sealed') and exists(select 1 from kme_private.boss_members where campaign_id=c.id and profile_id=r.profile_id) then
  v_damage:=greatest(0,least(v_earned,10-d.damage,10-u.damage));
  update kme_private.campaigns set damage=damage+v_damage where id=c.id;
 end if;
 update kme_private.relief_daily set hits=hits+v_hits,damage=damage+v_damage where profile_id=r.profile_id and day=v_day;
 update kme_private.relief_device_daily set hits=hits+v_hits,damage=damage+v_damage where user_id=r.user_id and day=v_day;
 v_result:=jsonb_build_object('ok',true,'hits',p_hits,'fragments_banked',v_hits,'fragments_today',d.hits+v_hits,
  'damage',v_damage,'damage_today',d.damage+v_damage,'daily_damage_left',greatest(0,least(10-d.damage-v_damage,10-u.damage-v_damage)),
  'next_fragment',mod(d.hits+v_hits,3),'game_only',true);
 update kme_private.relief_runs set result=v_result where id=r.id;
 perform kme_private.sync_campaign();return v_result;
end; $fn$;

CREATE OR REPLACE FUNCTION kme_private.world_v3()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_base jsonb;v_id uuid;c kme_private.campaigns%rowtype;v_stats jsonb;v_members jsonb;v_shifts jsonb;
 v_party integer;v_privacy jsonb;v_previous jsonb;
 v_names text[]:=array['The Pouch Goblin','Kiosk Gremlin','Lord Cravington','The Bargaining Department','Mint Condition Menace','Chief Excuse Officer','The Phantom Vape','Big Nicotine','The Final Procurement','The Eternal Side Quest'];
begin
 perform kme_private.guard(null,'world-v3',60,60);
 v_id:=kme_private.sync_campaign();v_base:=kme_private.world_v2();
 v_base:=jsonb_set(v_base,'{profiles}',coalesce((select jsonb_agg(case when p.tracking_enabled then item else
  item||jsonb_build_object('recorded_streak_seconds',0,'recorded_streak_days',0) end)
  from jsonb_array_elements(v_base->'profiles') item join public.kme_profiles p on p.id=(item->>'id')::uuid),'[]'::jsonb));
 select * into c from kme_private.campaigns where id=v_id;
 select greatest(1,count(*))::integer into v_party from kme_private.raid_contributions
  where campaign_id=v_id and last_seen>now()-interval '60 seconds';
 select coalesce(jsonb_agg(jsonb_build_object('profile_id',p.id,'tracking_enabled',p.tracking_enabled,
  'best',coalesce(s.best,0),'extracts',coalesce(s.extracts,0),'damage',coalesce(s.damage,0),'capsules',coalesce(s.capsules,0),'equipped',s.equipped,
  'inventory',coalesce((select jsonb_agg(jsonb_build_object('tier',i.tier,'quantity',i.quantity) order by i.tier) from kme_private.inventory i where i.profile_id=p.id),'[]'::jsonb),
  'full_runs_left',greatest(0,2-coalesce(d.successes,0)),'chip_runs_left',greatest(0,20-coalesce(d.chips,0)),
  'enrolled',exists(select 1 from kme_private.boss_members m where m.campaign_id=v_id and m.profile_id=p.id),
  'finale_seconds',coalesce((select rc.seconds from kme_private.raid_contributions rc where rc.campaign_id=v_id and rc.profile_id=p.id),0)
 ) order by p.created_at),'[]'::jsonb) into v_stats from public.kme_profiles p
 left join kme_private.extraction_stats s on s.profile_id=p.id
 left join kme_private.extraction_daily d on d.profile_id=p.id and d.day=(now() at time zone 'UTC')::date;
 select coalesce(jsonb_agg(jsonb_build_object('profile_id',m.profile_id,'damage',m.damage,
  'finale_seconds',coalesce(rc.seconds,0)) order by m.profile_id),'[]'::jsonb) into v_members
 from kme_private.boss_members m left join kme_private.raid_contributions rc on rc.campaign_id=m.campaign_id and rc.profile_id=m.profile_id where m.campaign_id=v_id;
 select coalesce(jsonb_agg(jsonb_build_object('profile_id',s.profile_id,'kind',s.kind,'created_at',s.created_at) order by s.created_at desc),'[]'::jsonb)
 into v_shifts from(select * from kme_private.shifts order by created_at desc limit 24)s;
 select jsonb_build_object('accepted',true,'allow_nicotine',allow_nicotine,'notice_version',notice_version) into v_privacy
  from kme_private.device_preferences where user_id=auth.uid();
 select jsonb_build_object('level',level,'defeated_at',defeated_at) into v_previous from kme_private.campaigns where status='defeated' order by level desc limit 1;
 return v_base||jsonb_build_object('version',3,'privacy',coalesce(v_privacy,jsonb_build_object('accepted',false,'allow_nicotine',false)),
  'boss',jsonb_build_object('id',c.id,'level',c.level,'name',v_names[mod(c.level-1,array_length(v_names,1))+1],
   'status',c.status,'started_at',c.started_at,'unlocks_at',c.unlocks_at,'roster_size',c.roster_size,
   'max_hp',c.max_hp,'hp',greatest(0,c.max_hp-c.damage),'damage',least(c.damage,c.max_hp),'total_damage',c.damage,
   'finale_seconds',c.finale_seconds,'finale_goal',c.finale_goal,'active_party',v_party,
   'personal_estimate_seconds',ceil(greatest(0,c.finale_goal-c.finale_seconds)::numeric/v_party),
   'members',v_members,'previous',v_previous),
  'extraction',v_stats,'shifts',v_shifts);
end; $function$;


CREATE OR REPLACE FUNCTION kme_private.extraction_start_v3(p_profile_id uuid, p_mode text DEFAULT 'arcade'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_campaign uuid;v_boss kme_private.campaigns%rowtype;v_id uuid;v_nonce uuid;v_seed integer;
 v_uses integer;v_last kme_private.extraction_runs%rowtype;
begin
 perform kme_private.guard(p_profile_id,'extraction-start',120,3600);
 if p_profile_id is null or p_mode is null or p_mode not in('arcade','finale') then raise exception 'Choose a character and game mode.';end if;
 v_campaign:=kme_private.sync_campaign();
 select * into v_boss from kme_private.campaigns where id=v_campaign;
 if p_mode='finale' and v_boss.status<>'finale' then raise exception 'Wear down the boss and wait for its finale window first.';end if;
 select * into v_last from kme_private.extraction_runs where user_id=auth.uid() or profile_id=p_profile_id order by started_at desc limit 1;
 if found and v_last.started_at>now()-interval '22 seconds' then raise exception 'Wait a moment between runs (22 seconds from start).';end if;
 if(select count(*) from kme_private.extraction_runs where(user_id=auth.uid() or profile_id=p_profile_id)
  and started_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=100 then
  raise exception 'One hundred runs per character/device per UTC day. The arcade needs sleep.';end if;
 update kme_private.extraction_runs set cancelled=true where finished_at is null and not cancelled
  and(user_id=auth.uid() or profile_id=p_profile_id);
 v_seed:=floor(random()*2147483646)::integer+1;
 insert into kme_private.extraction_runs(profile_id,user_id,campaign_id,mode,seed)
  values(p_profile_id,auth.uid(),v_campaign,p_mode,v_seed) returning id,nonce into v_id,v_nonce;
 select count(*)::integer into v_uses from public.kme_activity where profile_id=p_profile_id and kind='used' and created_at>=v_boss.started_at;
 return jsonb_build_object('id',v_id,'nonce',v_nonce,'seed',v_seed,'mode',p_mode,'max_seconds',300,
  'assist',case when v_uses>0 then 0.85 else 1 end,
  'weather',kme_private.day_variant((now() at time zone 'UTC')::date),
  'boss_id',v_campaign,'finale_remaining',greatest(0,v_boss.finale_goal-v_boss.finale_seconds));
end; $function$;


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
 if v_elapsed<20 or v_elapsed>330 then raise exception 'Extract after at least twenty seconds and within five minutes.';end if;
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
end; $function$;


CREATE OR REPLACE FUNCTION kme_private.export_profile_v3(p_profile_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_profile jsonb;
begin
 perform kme_private.guard(p_profile_id,'export-profile',4,3600);
 select to_jsonb(p) into v_profile from public.kme_profiles p where id=p_profile_id;
 if v_profile is null then raise exception 'Character not found.';end if;
 return jsonb_build_object('exported_at',now(),'profile',v_profile,
 'activity',coalesce((select jsonb_agg(to_jsonb(a)-'created_by' order by a.created_at) from public.kme_activity a where profile_id=p_profile_id),'[]'::jsonb),
 'posts',coalesce((select jsonb_agg(to_jsonb(p)-'user_id' order by p.created_at) from kme_private.posts p where profile_id=p_profile_id),'[]'::jsonb),
 'inventory',coalesce((select jsonb_agg(to_jsonb(i)) from kme_private.inventory i where profile_id=p_profile_id),'[]'::jsonb),
 'extraction_stats',(select to_jsonb(s) from kme_private.extraction_stats s where profile_id=p_profile_id),
 'shifts',coalesce((select jsonb_agg(to_jsonb(s)-'user_id' order by s.created_at) from kme_private.shifts s where profile_id=p_profile_id),'[]'::jsonb));
end; $function$;


create or replace function public.kme_arcade_start(p_profile_id uuid,p_mode text,p_game_key text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_active text;v_ticket jsonb;
begin
 perform kme_private.guard(p_profile_id,'arcade-start-v4',120,3600);
 select game_key into v_active from kme_private.arcade_config where singleton;
 if p_game_key is distinct from v_active then raise exception 'The arcade changed. Refresh to load the current game.';end if;
 v_ticket:=kme_private.extraction_start_v3(p_profile_id,p_mode);
 update kme_private.extraction_runs set game_key=v_active where id=(v_ticket->>'id')::uuid;
 return v_ticket||jsonb_build_object('game_key',v_active);
end; $fn$;

create or replace function public.kme_extraction_start(p_profile_id uuid,p_mode text default 'arcade')
returns jsonb language plpgsql security definer set search_path='' as $fn$
begin
 if(select game_key from kme_private.arcade_config where singleton) is distinct from 'smoke-break' then raise exception 'The arcade changed. Refresh to load the new game.';end if;
 return kme_private.extraction_start_v3(p_profile_id,p_mode);
end; $fn$;

create or replace function public.kme_extraction_finish(p_run_id uuid,p_score integer,p_greed integer,p_capsules integer,p_extract boolean default true)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_result jsonb;
begin
 v_result:=kme_private.extraction_finish_v3(p_run_id,p_score,p_greed,p_capsules,p_extract);
 if v_result ? 'score' and coalesce((v_result->>'cancelled')::boolean,false)=false then
  insert into kme_private.arcade_run_scores(run_id,profile_id,game_key,score)
   select id,profile_id,game_key,(v_result->>'score')::integer from kme_private.extraction_runs where id=p_run_id on conflict do nothing;
 end if;return v_result;
end; $fn$;

create or replace function kme_private.arcade_snapshot()
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_id uuid;b kme_private.arcade_ballots%rowtype;v_choices jsonb;v_config jsonb;v_vote jsonb;v_scores jsonb;v_relief jsonb;
begin
 v_id:=kme_private.sync_arcade_ballot();select * into b from kme_private.arcade_ballots where id=v_id;
 select to_jsonb(c)-'singleton' into v_config from kme_private.arcade_config c where singleton;
 select coalesce(jsonb_agg(item||jsonb_build_object('votes',(select count(*) from kme_private.arcade_votes where ballot_id=b.id and choice_key=item->>'key')) order by ord),'[]'::jsonb)
  into v_choices from jsonb_array_elements(b.choices) with ordinality as x(item,ord);
 select jsonb_build_object('key',choice_key,'profile_id',profile_id) into v_vote from kme_private.arcade_votes where ballot_id=b.id and user_id=auth.uid();
 select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) into v_scores from(select profile_id,game_key,max(score) as best,count(*) as extracts
  from kme_private.arcade_run_scores group by profile_id,game_key)s;
 select coalesce(jsonb_agg(jsonb_build_object('profile_id',p.id,'hits',coalesce(d.hits,0),'damage',coalesce(d.damage,0),
  'remaining',greatest(0,least(10-coalesce(d.damage,0),10-coalesce((select damage from kme_private.relief_device_daily where user_id=auth.uid() and day=(now() at time zone 'UTC')::date),0))))),'[]'::jsonb)
  into v_relief from public.kme_profiles p left join kme_private.relief_daily d on d.profile_id=p.id and d.day=(now() at time zone 'UTC')::date;
 return jsonb_build_object('current',v_config,'ballot',jsonb_build_object('id',b.id,'opened_at',b.opened_at,'closes_at',b.closes_at,'status',b.status,
  'winner_key',b.winner_key,'choices',v_choices,'my_vote',v_vote,'total_votes',(select count(*) from kme_private.arcade_votes where ballot_id=b.id)),
  'last_empty_round',(select max(closes_at) from kme_private.arcade_ballots where status='no_votes'),'scores',v_scores,'relief',v_relief);
end; $fn$;

create or replace function public.kme_world()
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_base jsonb;
begin
 v_base:=kme_private.world_v3();
 return v_base||jsonb_build_object('version',4,'arcade',kme_private.arcade_snapshot());
end; $fn$;

create or replace function public.kme_export_profile(p_profile_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v_base jsonb;
begin
 v_base:=kme_private.export_profile_v3(p_profile_id);
 return v_base||jsonb_build_object('arcade_votes',coalesce((select jsonb_agg(to_jsonb(v)-'user_id') from kme_private.arcade_votes v where profile_id=p_profile_id),'[]'::jsonb),
 'relief_games',coalesce((select jsonb_agg(to_jsonb(r)-'user_id') from kme_private.relief_runs r where profile_id=p_profile_id),'[]'::jsonb),
 'relief_daily',coalesce((select jsonb_agg(to_jsonb(d)) from kme_private.relief_daily d where profile_id=p_profile_id),'[]'::jsonb),
 'arcade_scores',coalesce((select jsonb_agg(to_jsonb(s)) from kme_private.arcade_run_scores s where profile_id=p_profile_id),'[]'::jsonb));
end; $fn$;

revoke all on function kme_private.validate_arcade_choices(jsonb),kme_private.sync_arcade_ballot(),kme_private.arcade_snapshot(),
 kme_private.publish_arcade(uuid,text,text,text,jsonb),kme_private.extraction_start_v3(uuid,text),
 kme_private.extraction_finish_v3(uuid,integer,integer,integer,boolean),kme_private.world_v3(),kme_private.export_profile_v3(uuid) from public,anon,authenticated;
revoke all on function public.kme_arcade_vote(uuid,uuid,text),public.kme_relief_start(uuid),public.kme_relief_bank(uuid,integer),
 public.kme_arcade_start(uuid,text,text),public.kme_extraction_start(uuid,text),public.kme_extraction_finish(uuid,integer,integer,integer,boolean),public.kme_world(),public.kme_export_profile(uuid) from public,anon,authenticated;
grant execute on function public.kme_arcade_vote(uuid,uuid,text),public.kme_relief_start(uuid),public.kme_relief_bank(uuid,integer),
 public.kme_arcade_start(uuid,text,text),public.kme_extraction_start(uuid,text),public.kme_extraction_finish(uuid,integer,integer,integer,boolean),public.kme_world(),public.kme_export_profile(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
select 'Rotating arcade ballot and Urge Breaker installed. Existing game and characters preserved.' as result;
