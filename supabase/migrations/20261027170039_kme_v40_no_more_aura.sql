-- v4.0 release epoch, collectible reset and unified stardust. Existing non-aura records survive.
begin;
create table if not exists kme_private.v4_releases(epoch text primary key,applied_at timestamptz not null default now());
create table if not exists kme_private.v4_collection_archive(profile_id uuid primary key references public.kme_profiles(id)on delete cascade,data jsonb not null,created_at timestamptz not null default now());
create table if not exists kme_private.v4_aura_catalog(id text primary key,tier integer not null check(tier between 0 and 9),name text not null,variant integer not null,hidden boolean not null default false,cost integer,distill integer not null default 0,theme integer);
create table if not exists kme_private.v4_aura_copies(profile_id uuid references public.kme_profiles(id)on delete cascade,aura_id text references kme_private.v4_aura_catalog(id),quantity integer not null default 0 check(quantity>=0),primary key(profile_id,aura_id));
create index if not exists v4_copies_aura on kme_private.v4_aura_copies(aura_id);
create table if not exists kme_private.v4_identity(profile_id uuid primary key references public.kme_profiles(id)on delete cascade,equipped text references kme_private.v4_aura_catalog(id),rank_visible boolean not null default true);
create index if not exists v4_identity_aura on kme_private.v4_identity(equipped);
create table if not exists kme_private.v4_receipts(id uuid primary key,profile_id uuid not null references public.kme_profiles(id)on delete cascade,user_id uuid not null references auth.users(id)on delete cascade,action text not null,target text,operation text,result jsonb not null,created_at timestamptz not null default now());
create index if not exists v4_receipts_profile on kme_private.v4_receipts(profile_id);
create index if not exists v4_receipts_user on kme_private.v4_receipts(user_id);
create table if not exists kme_private.v4_run_rewards(run_id uuid primary key references kme_private.extraction_runs(id)on delete cascade,profile_id uuid not null references public.kme_profiles(id)on delete cascade,result jsonb not null);
create index if not exists v4_rewards_profile on kme_private.v4_run_rewards(profile_id);
create table if not exists kme_private.v4_hidden_attempts(day date not null,profile_id uuid not null references public.kme_profiles(id)on delete cascade,user_id uuid not null references auth.users(id)on delete cascade,theme integer not null,won text references kme_private.v4_aura_catalog(id),primary key(day,profile_id),unique(day,user_id));
create index if not exists v4_hidden_profile on kme_private.v4_hidden_attempts(profile_id);
create index if not exists v4_hidden_user on kme_private.v4_hidden_attempts(user_id);
create index if not exists v4_hidden_aura on kme_private.v4_hidden_attempts(won);
create table if not exists kme_private.v4_week_results(week date primary key,theme integer not null,winner text,scores jsonb not null,created_at timestamptz not null default now());
create table if not exists kme_private.v4_achievements(profile_id uuid references public.kme_profiles(id)on delete cascade,week date references kme_private.v4_week_results(week),team text,kind text not null,theme integer not null,created_at timestamptz not null default now(),primary key(profile_id,week));
create index if not exists v4_achievement_week on kme_private.v4_achievements(week);
create table if not exists kme_private.v4_competitive(profile_id uuid primary key references public.kme_profiles(id)on delete cascade,best_score bigint not null default 0,best_sector integer not null default 0,kills bigint not null default 0,runs integer not null default 0,extractions integer not null default 0,longest integer not null default 0);
create table if not exists kme_private.v4_expeditions(run_id uuid primary key references kme_private.extraction_runs(id)on delete cascade,profile_id uuid not null references public.kme_profiles(id)on delete cascade,user_id uuid not null references auth.users(id)on delete cascade,start_sector integer not null,last_sector integer not null,started_at timestamptz not null default now(),last_sector_at timestamptz not null default now(),result jsonb);
create index if not exists v4_expedition_profile on kme_private.v4_expeditions(profile_id);
create index if not exists v4_expedition_user on kme_private.v4_expeditions(user_id);
create table if not exists kme_private.v4_sector_receipts(id uuid primary key,run_id uuid not null references kme_private.v4_expeditions(run_id)on delete cascade,profile_id uuid not null references public.kme_profiles(id)on delete cascade,sector integer not null,result jsonb not null,unique(run_id,sector));
create index if not exists v4_sector_profile on kme_private.v4_sector_receipts(profile_id);
create table if not exists kme_private.v4_donations(id uuid primary key references kme_private.v4_receipts(id)on delete cascade,profile_id uuid not null references public.kme_profiles(id)on delete cascade,user_id uuid not null references auth.users(id)on delete cascade,day date not null,target text not null,damage integer not null,cost integer not null);
create index if not exists v4_donations_profile_day on kme_private.v4_donations(profile_id,day,target);
create index if not exists v4_donations_user_day on kme_private.v4_donations(user_id,day,target);
do $$declare t text;begin foreach t in array array['v4_releases','v4_collection_archive','v4_aura_catalog','v4_aura_copies','v4_identity','v4_receipts','v4_run_rewards','v4_hidden_attempts','v4_week_results','v4_achievements','v4_competitive','v4_expeditions','v4_sector_receipts','v4_donations']loop execute format('alter table kme_private.%I enable row level security',t);execute format('revoke all on kme_private.%I from public,anon,authenticated',t);end loop;end;$$;

-- This block is intentionally release-scoped. Reruns never wipe the new collection.
do $$begin
 if not exists(select 1 from kme_private.v4_releases where epoch='collection-4.0')then
  insert into kme_private.v4_collection_archive(profile_id,data)select p.id,jsonb_build_object('legacy_inventory',(select coalesce(jsonb_agg(to_jsonb(i)-'profile_id'),'[]')from kme_private.inventory i where i.profile_id=p.id),'equipped',(select equipped from kme_private.extraction_stats where profile_id=p.id),'confetti',coalesce(w.balance,20),'old_stardust',coalesce(a.stardust,0))from public.kme_profiles p left join kme_private.cosmetic_wallet w on w.profile_id=p.id left join kme_private.aura_wallet a on a.profile_id=p.id on conflict do nothing;
  insert into kme_private.cosmetic_wallet(profile_id,balance,earned)select p.id,coalesce(w.balance,20)+coalesce(a.stardust,0),coalesce(w.earned,20)+coalesce(a.stardust,0)from public.kme_profiles p left join kme_private.cosmetic_wallet w on w.profile_id=p.id left join kme_private.aura_wallet a on a.profile_id=p.id on conflict(profile_id)do update set balance=excluded.balance,earned=excluded.earned;
  update kme_private.inventory set quantity=0;update kme_private.extraction_stats set equipped=null;update kme_private.aura_wallet set stardust=0;
  insert into kme_private.v4_releases(epoch)values('collection-4.0');
 end if;
end;$$;

create or replace function kme_private.v4_uniform(p_max integer)returns integer language plpgsql volatile security definer set search_path='' as $$declare bytes bytea;n bigint;ceiling bigint;begin
 if p_max<1 then raise exception'Invalid random range.';end if;ceiling:=(4294967296::bigint/p_max)*p_max;
 loop bytes:=extensions.gen_random_bytes(4);n:=get_byte(bytes,0)::bigint*16777216+get_byte(bytes,1)::bigint*65536+get_byte(bytes,2)::bigint*256+get_byte(bytes,3);exit when n<ceiling;end loop;return(n%p_max)::integer;
end;$$;
create or replace function kme_private.v4_rarity(p_roll integer)returns integer language plpgsql immutable set search_path='' as $$declare weights integer[]:=array[450000,250000,140000,80000,40000,20000,10000,6000,3000,1000];i integer;begin if p_roll<0 or p_roll>=1000000 then raise exception'Invalid capsule roll.';end if;for i in 1..10 loop if p_roll<weights[i]then return i-1;end if;p_roll:=p_roll-weights[i];end loop;raise exception'Invalid rarity table.';end;$$;
create or replace function kme_private.v4_theme(p_week date)returns integer language sql immutable set search_path='' as $$select((floor((p_week-date'2026-10-26')/7.0)::integer%6)+6)%6$$;
create or replace function kme_private.v4_collection(p_profile uuid)returns jsonb language sql security definer set search_path='' as $$select jsonb_build_object('ok',true,'epoch','collection-4.0','stardust',coalesce((select balance from kme_private.cosmetic_wallet where profile_id=p_profile),20),'equipped',(select equipped from kme_private.v4_identity where profile_id=p_profile),'rankVisible',coalesce((select rank_visible from kme_private.v4_identity where profile_id=p_profile),true),'clue',jsonb_build_object('week',date_trunc('week',now()at time zone'Europe/Helsinki')::date,'theme',kme_private.v4_theme(date_trunc('week',now()at time zone'Europe/Helsinki')::date),'active',extract(hour from now()at time zone'Europe/Helsinki')between 14 and 21 and extract(isodow from now()at time zone'Europe/Helsinki')::integer in(2,4,6,7)and exists(select 1 from kme_private.cosmetic_earnings where profile_id=p_profile and day=(now()at time zone'Europe/Helsinki')::date and category in('game','art')),'inspected',exists(select 1 from kme_private.v4_hidden_attempts where day=(now()at time zone'Europe/Helsinki')::date and(profile_id=p_profile or user_id=auth.uid()))),'inventory',(select coalesce(jsonb_agg(jsonb_build_object('id',c.aura_id,'quantity',c.quantity,'tier',a.tier)order by a.tier,c.aura_id),'[]')from kme_private.v4_aura_copies c join kme_private.v4_aura_catalog a on a.id=c.aura_id where c.profile_id=p_profile and c.quantity>0))$$;

insert into kme_private.v4_aura_catalog(id,tier,name,variant,hidden,cost,distill,theme)values
('a0-0',0,'Desk Lamp',0,false,60,1,null),
('a0-1',0,'Paper Moon',1,false,60,1,null),
('a0-2',0,'Office Firefly',2,false,60,1,null),
('a1-0',1,'Twin Satellites',0,false,90,1,null),
('a1-1',1,'Moss Lantern',1,false,90,1,null),
('a1-2',1,'Orbital Intern',2,false,90,1,null),
('a2-0',2,'Blue Hour',0,false,150,2,null),
('a2-1',2,'Cryo Halo',1,false,150,2,null),
('a2-2',2,'Midnight Transit',2,false,150,2,null),
('a3-0',3,'Union Constellation',0,false,240,2,null),
('a3-1',3,'Violet Dividend',1,false,240,2,null),
('a3-2',3,'Audit Afterglow',2,false,240,2,null),
('a4-0',4,'Golden Parachute',0,false,400,3,null),
('a4-1',4,'Solar Severance',1,false,400,3,null),
('a4-2',4,'Executive Sunrise',2,false,400,3,null),
('a5-0',5,'Rose Supernova',0,false,650,4,null),
('a5-1',5,'Redundancy Bloom',1,false,650,4,null),
('a5-2',5,'Nebula Notice',2,false,650,4,null),
('a6-0',6,'Ratellite Network',0,false,1000,5,null),
('a6-1',6,'Celestial Overtime',1,false,1000,5,null),
('a7-0',7,'Ghost of Overtime',0,false,1600,6,null),
('a7-1',7,'Pale Aurora',1,false,1600,6,null),
('a8-0',8,'Niko Event Horizon',0,false,2400,8,null),
('a9-0',9,'The Final Payrise',0,false,4000,12,null),
('signature-procurement',9,'Denied By Gravity',0,true,null,0,0),
('signature-ratellite',9,'Rat King Of Orbit',1,true,null,0,1),
('signature-audit',9,'Classified Starlight',2,true,null,0,2),
('signature-dividend',9,'The Sunken Payrise',3,true,null,0,3),
('signature-niko',9,'Niko, Close The Portal',4,true,null,0,4),
('signature-lastbreak',9,'The Final Clock Out',5,true,null,0,5)
on conflict(id)do update set name=excluded.name,cost=excluded.cost,distill=excluded.distill;
alter table kme_private.nightfall_damage drop constraint if exists nightfall_damage_category_check;
alter table kme_private.nightfall_damage add constraint nightfall_damage_category_check check(category in('game','art','resisted','rally','popular','report','donation'));
create or replace function kme_private.nightfall_award(p_profile uuid,p_user uuid,p_category text,p_receipt text)returns integer language plpgsql security definer set search_path='' as $$
declare today date:=(now()at time zone'Europe/Helsinki')::date;w date:=date_trunc('week',now()at time zone'Europe/Helsinki')::date;m kme_private.nightfall_members%rowtype;cap integer;points integer;used_profile integer;used_device integer;days integer;
begin
 if p_user is null or not exists(select 1 from public.kme_profiles where id=p_profile)then return 0;end if;perform pg_advisory_xact_lock(hashtextextended('nightfall-awards-v35',0));
 select * into m from kme_private.nightfall_members where week=w and profile_id=p_profile and left_at is null;if not found or exists(select 1 from kme_private.nightfall_damage where receipt=p_receipt)then return 0;end if;
 cap:=case p_category when'game'then 3 when'art'then 1 when'rally'then 1 when'popular'then 1 when'report'then 5 when'donation'then 10 else 0 end;points:=case p_category when'game'then 10 when'art'then 10 when'rally'then 5 when'popular'then 10 when'report'then 2 when'donation'then 1 else 0 end;
 if cap=0 or(select count(*)from kme_private.nightfall_damage where profile_id=p_profile and day=today and category=p_category)>=cap or(select count(*)from kme_private.nightfall_damage where user_id=p_user and day=today and category=p_category)>=cap then return 0;end if;
 if p_category='game'then select count(distinct day)into days from kme_private.nightfall_damage where profile_id=p_profile and week=w and day<today;points:=floor(10*least(1.35,1+.05*days));end if;
 select coalesce(sum(amount),0)into used_profile from kme_private.nightfall_damage where profile_id=p_profile and day=today;select coalesce(sum(amount),0)into used_device from kme_private.nightfall_damage where user_id=p_user and day=today;
 points:=greatest(0,least(points,60-used_profile,60-used_device));if points=0 then return 0;end if;insert into kme_private.nightfall_damage(receipt,week,day,profile_id,user_id,team,category,amount)values(p_receipt,w,today,p_profile,p_user,m.team,p_category,points);return points;
end;$$;
create or replace function kme_private.nightfall_earning()returns trigger language plpgsql security definer set search_path='' as $$begin if new.category in('game','art')then perform kme_private.nightfall_award(new.profile_id,new.user_id,new.category,'earned:'||new.receipt);end if;return new;end;$$;
create or replace function kme_private.v4_reporting_credit()returns trigger language plpgsql security definer set search_path='' as $$declare faction text;begin
 if new.kind not in('used','resisted')or not exists(select 1 from public.kme_profiles where id=new.profile_id and tracking_enabled)or not exists(select 1 from kme_private.device_preferences where user_id=new.created_by and allow_nicotine)then return new;end if;
 select team into faction from kme_private.nightfall_members where week=date_trunc('week',now()at time zone'Europe/Helsinki')::date and profile_id=new.profile_id and left_at is null;
 if new.kind='resisted'and faction in('rehab','night')or new.kind='used'and faction='night'then perform kme_private.nightfall_award(new.profile_id,new.created_by,'report','checkin:'||new.id);end if;return new;
end;$$;
create or replace trigger v4_reporting_credit after insert on public.kme_activity for each row execute function kme_private.v4_reporting_credit();

create or replace function kme_private.v4_finalize_weeks()returns void language plpgsql security definer set search_path='' as $$
declare w date;current_week date:=date_trunc('week',now()at time zone'Europe/Helsinki')::date;a numeric;b numeric;atarget numeric;btarget numeric;winner text;scores jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('nightfall-awards-v35',0));
 for w in select distinct m.week from kme_private.nightfall_members m where m.week<current_week and not exists(select 1 from kme_private.v4_week_results r where r.week=m.week)order by m.week limit 104 loop
  select coalesce(sum(amount)filter(where team='rehab'),0),coalesce(sum(amount)filter(where team='night'),0)into a,b from kme_private.nightfall_damage where week=w;select coalesce(sum(target)filter(where team='rehab'),0),coalesce(sum(target)filter(where team='night'),0)into atarget,btarget from kme_private.nightfall_members where week=w;
  winner:=case when atarget=0 or btarget=0 or a+b=0 then null when a*btarget=b*atarget then'tie'when a*btarget>b*atarget then'rehab'else'night'end;
  scores:=kme_private.nightfall_snapshot(null,w)->'teams';insert into kme_private.v4_week_results(week,theme,winner,scores)values(w,kme_private.v4_theme(w),winner,scores)on conflict do nothing;
  if winner is not null then insert into kme_private.v4_achievements(profile_id,week,team,kind,theme)select m.profile_id,w,m.team,case when winner='tie'then'shared-orbit'else'victory'end,kme_private.v4_theme(w)from kme_private.nightfall_members m where m.week=w and(winner='tie'or m.team=winner)and exists(select 1 from kme_private.nightfall_damage d where d.week=w and d.profile_id=m.profile_id and d.amount>0)on conflict do nothing;end if;
 end loop;
end;$$;
do $$begin if to_regprocedure('kme_private.nightfall_v35(uuid,text,text)')is null then alter function public.kme_nightfall(uuid,text,text)rename to nightfall_v35;alter function public.nightfall_v35(uuid,text,text)set schema kme_private;end if;end;$$;
create or replace function public.kme_nightfall(p_profile_id uuid,p_action text default'read',p_team text default null)returns jsonb language plpgsql security definer set search_path='' as $$declare v jsonb;begin
 perform kme_private.guard(p_profile_id,'singularity',60,60);perform kme_private.v4_finalize_weeks();v:=kme_private.nightfall_v35(p_profile_id,p_action,p_team);return v||jsonb_build_object('event_name','Nicotine Singularity','theme',kme_private.v4_theme((v->>'week')::date),'report_limit',5,'history',(select coalesce(jsonb_agg(to_jsonb(r)order by r.week desc),'[]')from(select * from kme_private.v4_week_results order by week desc limit 6)r));
end;$$;

create or replace function public.kme_profile_v4(p_profile_id uuid,p_before timestamptz default null)returns jsonb language plpgsql security definer set search_path='' as $$
declare health boolean;v jsonb;timeline jsonb;best jsonb;
begin
 perform kme_private.guard(p_profile_id,'profile-v4',60,60);perform kme_private.v4_finalize_weeks();health:=exists(select 1 from public.kme_profiles where id=p_profile_id and tracking_enabled)and exists(select 1 from kme_private.device_preferences where user_id=auth.uid()and allow_nicotine);
 select coalesce(jsonb_agg(x.data order by x.at desc,x.id desc),'[]')into timeline from(select * from(
  select r.id::text id,r.finished_at at,jsonb_build_object('id',r.id,'kind','game','at',r.finished_at,'title',case when r.game_key='blacksite'then'BLACKSITE expedition'else'Arcade extraction'end,'score',coalesce(r.result->'score','0'),'outcome',r.result->'blacksite'->>'outcome')data from kme_private.extraction_runs r where r.profile_id=p_profile_id and r.result is not null and r.finished_at is not null
  union all select p.id::text,p.created_at,jsonb_build_object('id',p.id,'kind',case when a.post_id is not null then'art'else'chat'end,'at',p.created_at,'title',p.body,'votes',(select count(*)from kme_private.votes where post_id=p.id))from kme_private.posts p left join kme_private.chat_art a on a.post_id=p.id where p.profile_id=p_profile_id and p.deleted_at is null
  union all select e.id::text,e.created_at,jsonb_build_object('id',e.id,'kind','checkin','at',e.created_at,'title',e.kind)from public.kme_activity e where health and e.profile_id=p_profile_id
 )items where(p_before is null or at<p_before)order by at desc,id desc limit 30)x;
 select jsonb_build_object('id',p.id,'body',p.body,'created_at',p.created_at,'votes',(select count(*)from kme_private.votes where post_id=p.id),'full_art',true,'drawing',true,'width',a.width,'height',a.height,'profile_id',p.profile_id,'own_device',p.user_id=auth.uid(),'voted_by_me',exists(select 1 from kme_private.votes where post_id=p.id and user_id=auth.uid()))into best from kme_private.posts p join kme_private.chat_art a on a.post_id=p.id where p.profile_id=p_profile_id and p.deleted_at is null order by(select count(*)from kme_private.votes where post_id=p.id)desc,p.created_at desc limit 1;
 v:=jsonb_build_object('ok',true,'healthVisible',health,'collection',kme_private.v4_collection(p_profile_id),'records',coalesce((select to_jsonb(c)-'profile_id'from kme_private.v4_competitive c where profile_id=p_profile_id),'{}'),'legacy',(select to_jsonb(s)-'profile_id'from kme_private.blacksite_stats s where profile_id=p_profile_id),'progress',(select data from kme_private.blacksite_progress where profile_id=p_profile_id),'capsules',coalesce((select capsules from kme_private.extraction_stats where profile_id=p_profile_id),0),'retained',jsonb_build_object('drawings',(select count(*)from kme_private.chat_art a join kme_private.posts p on p.id=a.post_id where p.profile_id=p_profile_id and p.deleted_at is null),'respect',(select count(*)from kme_private.votes v join kme_private.posts p on p.id=v.post_id where p.profile_id=p_profile_id and p.deleted_at is null)),'timeline',timeline,'bestArt',best,'faction',(select team from kme_private.nightfall_members where week=date_trunc('week',now()at time zone'Europe/Helsinki')::date and profile_id=p_profile_id and left_at is null),'achievements',(select coalesce(jsonb_agg(to_jsonb(a)-'profile_id'-'team'order by week desc),'[]')from kme_private.v4_achievements a where profile_id=p_profile_id));return v;
end;$$;

create or replace function public.kme_v4_collection(p_profile_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$begin perform kme_private.guard(p_profile_id,'v4-collection',60,60);if p_profile_id is null then raise exception'Choose a character.';end if;return kme_private.v4_collection(p_profile_id);end;$$;
create or replace function public.kme_aura_action(p_profile_id uuid,p_id uuid,p_action text,p_tier integer)returns jsonb language plpgsql security definer set search_path='' as $$begin perform kme_private.guard(p_profile_id,'auras-update',60,60);raise exception'The collection restarted in v4.0. Refresh before changing auras; this old receipt spent nothing.';end;$$;
create or replace function public.kme_auras(p_profile_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$declare v jsonb;begin perform kme_private.guard(p_profile_id,'auras-read-compat',60,60);v:=kme_private.v4_collection(p_profile_id);return v||jsonb_build_object('equipped',(select tier from kme_private.v4_aura_catalog where id=v->>'equipped'),'inventory',(select coalesce(jsonb_agg(jsonb_build_object('tier',tier,'quantity',n)),'[]')from(select a.tier,sum(c.quantity)n from kme_private.v4_aura_copies c join kme_private.v4_aura_catalog a on a.id=c.aura_id where c.profile_id=p_profile_id and c.quantity>0 group by a.tier)t));end;$$;
create or replace function public.kme_equip(p_profile_id uuid,p_tier integer)returns jsonb language plpgsql security definer set search_path='' as $$declare key text;begin perform kme_private.guard(p_profile_id,'equip',30,3600);if p_tier is not null then select c.aura_id into key from kme_private.v4_aura_copies c join kme_private.v4_aura_catalog a on a.id=c.aura_id where c.profile_id=p_profile_id and c.quantity>0 and a.tier=p_tier order by c.aura_id limit 1;if key is null then raise exception'Collect that aura in v4.0 first.';end if;end if;insert into kme_private.v4_identity(profile_id,equipped)values(p_profile_id,key)on conflict(profile_id)do update set equipped=excluded.equipped;update kme_private.extraction_stats set equipped=p_tier where profile_id=p_profile_id;return jsonb_build_object('ok',true);end;$$;

create or replace function kme_private.v4_roll_rewards(p_run uuid,p_caps integer)returns jsonb language plpgsql security definer set search_path='' as $$
declare r kme_private.extraction_runs%rowtype;saved jsonb;loot jsonb:='[]';a kme_private.v4_aura_catalog%rowtype;v_tier integer;n integer;count integer;i integer;
begin
 select result into saved from kme_private.v4_run_rewards where run_id=p_run;if saved is not null then return saved;end if;
 select * into r from kme_private.extraction_runs where id=p_run for update;
 if r.user_id is distinct from auth.uid()then raise exception'That reward belongs to another device.';end if;
 n:=case when not r.cancelled and r.result is not null and coalesce((r.result->>'score')::bigint,0)>0 and now()-r.started_at>=interval'20 seconds'then greatest(0,least(12,coalesce(p_caps,0),floor(extract(epoch from(now()-r.started_at))/8)::integer))else 0 end;
 for i in 1..n loop
  v_tier:=kme_private.v4_rarity(kme_private.v4_uniform(1000000));select count(*)into count from kme_private.v4_aura_catalog where v4_aura_catalog.tier=v_tier and not hidden;
  select * into a from kme_private.v4_aura_catalog where v4_aura_catalog.tier=v_tier and not hidden order by id offset kme_private.v4_uniform(count)limit 1;
  insert into kme_private.v4_aura_copies(profile_id,aura_id,quantity)values(r.profile_id,a.id,1)on conflict(profile_id,aura_id)do update set quantity=v4_aura_copies.quantity+1;
  insert into kme_private.inventory(profile_id,tier,quantity)values(r.profile_id,v_tier,1)on conflict(profile_id,tier)do update set quantity=inventory.quantity+1;
  loot:=loot||jsonb_build_array(jsonb_build_object('id',a.id,'tier',v_tier,'name',a.name));
 end loop;
 update kme_private.extraction_stats set capsules=capsules+n where profile_id=r.profile_id;
 saved:=r.result||jsonb_build_object('loot',loot,'min_tier',0,'rare_pool_weight',1000000,'collection_epoch','collection-4.0','stardust',(select balance from kme_private.cosmetic_wallet where profile_id=r.profile_id));
 insert into kme_private.v4_run_rewards(run_id,profile_id,result)values(r.id,r.profile_id,saved);update kme_private.extraction_runs set result=saved where id=r.id;return saved;
end;$$;
do $$begin
 if to_regprocedure('kme_private.extraction_finish_v35(uuid,integer,integer,integer,boolean)')is null then alter function public.kme_extraction_finish(uuid,integer,integer,integer,boolean)rename to extraction_finish_v35;alter function public.extraction_finish_v35(uuid,integer,integer,integer,boolean)set schema kme_private;end if;
 if to_regprocedure('kme_private.blacksite_finish_v35(uuid,integer,integer,integer,text)')is null then alter function public.kme_blacksite_finish(uuid,integer,integer,integer,text)rename to blacksite_finish_v35;alter function public.blacksite_finish_v35(uuid,integer,integer,integer,text)set schema kme_private;end if;
end;$$;
create or replace function public.kme_extraction_finish(p_run_id uuid,p_score integer,p_greed integer,p_capsules integer,p_extract boolean default true)returns jsonb language plpgsql security definer set search_path='' as $$declare v jsonb;begin
 v:=kme_private.extraction_finish_v35(p_run_id,p_score,p_greed,0,p_extract);
 if coalesce(current_setting('kme.v4_defer_rewards',true),'')='1'or not p_extract then return v;end if;return kme_private.v4_roll_rewards(p_run_id,p_capsules);
end;$$;
create or replace function public.kme_blacksite_finish(p_run_id uuid,p_score integer,p_wave integer,p_capsules integer,p_outcome text)returns jsonb language plpgsql security definer set search_path='' as $$declare v jsonb;oldflag text;begin
 oldflag:=coalesce(current_setting('kme.v4_defer_rewards',true),'');perform set_config('kme.v4_defer_rewards','1',true);v:=kme_private.blacksite_finish_v35(p_run_id,p_score,p_wave,0,p_outcome);perform set_config('kme.v4_defer_rewards',oldflag,true);
 return kme_private.v4_roll_rewards(p_run_id,case when p_outcome='extracted'then p_capsules else floor(p_capsules*.2)::integer end);
end;$$;

create or replace function public.kme_v4_action(p_profile_id uuid,p_id uuid,p_action text,p_target text default null,p_operation text default null,p_confirm boolean default false,p_epoch text default'collection-4.0')returns jsonb language plpgsql security definer set search_path='' as $$
<<v4action>>
declare old kme_private.v4_receipts%rowtype;a kme_private.v4_aura_catalog%rowtype;n integer;balance integer;cost integer:=0;damage integer:=0;v jsonb;today date:=(now()at time zone'Europe/Helsinki')::date;w date:=date_trunc('week',now()at time zone'Europe/Helsinki')::date;v_theme integer;won text;camp kme_private.campaigns%rowtype;used integer;active boolean;
begin
 perform kme_private.guard(p_profile_id,'v4-action',100,60);
 if p_profile_id is null or p_id is null or p_epoch is distinct from'collection-4.0'or p_action is null or p_action not in('equip','craft','distill','rank','donate','secret')then raise exception'Refresh to the v4.0 collection before changing it.';end if;
 perform pg_advisory_xact_lock(hashtextextended('kme-campaign-v3',0));perform pg_advisory_xact_lock(hashtextextended('nightfall-awards-v35',0));perform pg_advisory_xact_lock(hashtextextended('v4-action-'||p_profile_id,0));
 select * into old from kme_private.v4_receipts where id=p_id;if found then if old.profile_id<>p_profile_id or old.user_id<>auth.uid()or old.action<>p_action or old.target is distinct from p_target or old.operation is distinct from p_operation then raise exception'That receipt is bound to another action.';end if;return old.result;end if;
 insert into kme_private.cosmetic_wallet(profile_id)values(p_profile_id)on conflict do nothing;select w.balance into balance from kme_private.cosmetic_wallet w where profile_id=p_profile_id for update;
 if p_action in('equip','craft','distill')then
  if p_target is not null then select * into a from kme_private.v4_aura_catalog where id=p_target;if not found then raise exception'Unknown aura.';end if;select quantity into n from kme_private.v4_aura_copies where profile_id=p_profile_id and aura_id=p_target for update;n:=coalesce(n,0);end if;
  if p_action='equip'then if p_target is not null and n<1 then raise exception'Collect this aura before equipping it.';end if;insert into kme_private.v4_identity(profile_id,equipped)values(p_profile_id,p_target)on conflict(profile_id)do update set equipped=excluded.equipped;update kme_private.extraction_stats set equipped=a.tier where profile_id=p_profile_id;
  elsif p_action='craft'then if p_target is null or a.hidden then raise exception'This signature is discovered, never crafted.';end if;if n>0 then raise exception'You already own this aura.';end if;if balance<a.cost then raise exception'Not enough stardust.';end if;cost:=a.cost;insert into kme_private.v4_aura_copies(profile_id,aura_id,quantity)values(p_profile_id,a.id,1)on conflict(profile_id,aura_id)do update set quantity=1;insert into kme_private.inventory(profile_id,tier,quantity)values(p_profile_id,a.tier,1)on conflict(profile_id,tier)do update set quantity=inventory.quantity+1;
  else if p_target is null or a.hidden then raise exception'Signature auras cannot be distilled.';end if;if n<2 then raise exception'Your last copy is protected.';end if;if n in(3,6,10,15)and not p_confirm then return jsonb_build_object('ok',false,'resonance_confirmation',true,'message','This removes a resonance level. Confirm to distill this copy.');end if;update kme_private.v4_aura_copies set quantity=quantity-1 where profile_id=p_profile_id and aura_id=a.id;update kme_private.inventory set quantity=greatest(0,quantity-1)where profile_id=p_profile_id and tier=a.tier;cost:=-a.distill;
  end if;
 elsif p_action='rank'then insert into kme_private.v4_identity(profile_id,rank_visible)values(p_profile_id,p_target='show')on conflict(profile_id)do update set rank_visible=excluded.rank_visible;
 elsif p_action='secret'then
  v_theme:=kme_private.v4_theme(w);if p_operation is distinct from w::text or p_target is distinct from v_theme::text then raise exception'This clue has moved. Find its current appearance.';end if;
  active:=extract(hour from now()at time zone'Europe/Helsinki')between 14 and 21 and extract(isodow from today)::integer in(2,4,6,7);
  if not active or not exists(select 1 from kme_private.cosmetic_earnings where profile_id=p_profile_id and day=today and category in('game','art'))then raise exception'The clue is dormant. Meaningful game or art activity and an active window are required.';end if;
  if exists(select 1 from kme_private.v4_hidden_attempts where day=today and(profile_id=p_profile_id or user_id=auth.uid()))then raise exception'This character or device already inspected a clue today.';end if;
  if kme_private.v4_uniform(128)=0 then select id into won from kme_private.v4_aura_catalog where hidden and v4_aura_catalog.theme=v_theme;insert into kme_private.v4_aura_copies(profile_id,aura_id,quantity)values(p_profile_id,won,1)on conflict(profile_id,aura_id)do update set quantity=v4_aura_copies.quantity+1;end if;
  insert into kme_private.v4_hidden_attempts(day,profile_id,user_id,theme,won)values(today,p_profile_id,auth.uid(),v_theme,won);
 elsif p_action='donate'then
  if p_target='singularity'then
   if p_operation is distinct from w::text then raise exception'The displayed operation ended. No stardust was spent.';end if;
   select greatest(coalesce((select sum(d.damage)from kme_private.v4_donations d where d.profile_id=p_profile_id and d.day=today and d.target=p_target),0),coalesce((select sum(d.damage)from kme_private.v4_donations d where d.user_id=auth.uid()and d.day=today and d.target=p_target),0))into used;if used>=10 then raise exception'Daily donation allowance reached.';end if;
   if balance<10 then raise exception'Not enough stardust.';end if;damage:=kme_private.nightfall_award(p_profile_id,auth.uid(),'donation','donation:'||p_id);if damage<1 then raise exception'Join an active faction with damage allowance before donating.';end if;cost:=10;
  elsif p_target='crew'then
   select * into camp from kme_private.campaigns where id::text=p_operation for update;if not found or camp.status not in('wearing','sealed')then raise exception'This boss is not accepting damage. Finale time cannot be purchased.';end if;
   select greatest(coalesce((select sum(d.damage)from kme_private.v4_donations d where d.profile_id=p_profile_id and d.day=today and d.target=p_target),0),coalesce((select sum(d.damage)from kme_private.v4_donations d where d.user_id=auth.uid()and d.day=today and d.target=p_target),0))into used;if used>=15 then raise exception'Daily boss donation allowance reached.';end if;
   if balance<20 then raise exception'Not enough stardust.';end if;damage:=least(3,camp.max_hp-camp.damage);if damage<=0 then raise exception'This boss is already ready for its finale.';end if;cost:=20;update kme_private.campaigns set damage=least(max_hp,campaigns.damage+v4action.damage)where id=camp.id;update kme_private.campaigns set status=case when now()<unlocks_at then'sealed'else'finale'end where id=camp.id and campaigns.damage>=max_hp;
  else raise exception'Choose a contribution destination.';end if;
 end if;
 if cost<>0 then update kme_private.cosmetic_wallet set balance=cosmetic_wallet.balance-cost where profile_id=p_profile_id;end if;
 v:=kme_private.v4_collection(p_profile_id)||jsonb_build_object('receipt',p_id,'action',p_action,'damage',damage,'won',won);
 insert into kme_private.v4_receipts(id,profile_id,user_id,action,target,operation,result)values(p_id,p_profile_id,auth.uid(),p_action,p_target,p_operation,v);
 if p_action='donate'then insert into kme_private.v4_donations(id,profile_id,user_id,day,target,damage,cost)values(p_id,p_profile_id,auth.uid(),today,p_target,damage,cost);end if;
 return v;
end;$$;

create or replace function public.kme_blacksite_v4_start(p_profile_id uuid,p_mode text,p_district integer,p_operative text)returns jsonb language plpgsql security definer set search_path='' as $$declare t jsonb;begin
 t:=public.kme_blacksite_start(p_profile_id,p_mode,p_district,p_operative);insert into kme_private.v4_expeditions(run_id,profile_id,user_id,start_sector,last_sector)values((t->>'id')::uuid,p_profile_id,auth.uid(),p_district,p_district-1);return t||jsonb_build_object('v4',true,'sector',p_district);
end;$$;
create or replace function public.kme_blacksite_v4_sector(p_run_id uuid,p_id uuid,p_details jsonb)returns jsonb language plpgsql security definer set search_path='' as $$
declare r kme_private.extraction_runs%rowtype;e kme_private.v4_expeditions%rowtype;old kme_private.v4_sector_receipts%rowtype;sector integer;district integer;progress jsonb;v jsonb;bonus integer;used_profile integer;used_device integer;today date:=(now()at time zone'Europe/Helsinki')::date;
begin
 perform kme_private.guard(null,'v4-sector',100,3600);perform pg_advisory_xact_lock(hashtextextended('kme-campaign-v3',0));select * into r from kme_private.extraction_runs where id=p_run_id for update;select * into e from kme_private.v4_expeditions where run_id=p_run_id for update;
 if e.run_id is null or r.user_id is distinct from auth.uid()then raise exception'That expedition belongs to another device.';end if;
 select * into old from kme_private.v4_sector_receipts where id=p_id;if found then if old.run_id<>p_run_id then raise exception'That checkpoint belongs to another expedition.';end if;return old.result;end if;
 if e.result is not null or r.cancelled or r.result is not null then raise exception'This expedition ended.';end if;
 if p_id is null or p_details is null or jsonb_typeof(p_details)<>'object'or octet_length(p_details::text)>16000 then raise exception'Invalid sector checkpoint.';end if;
 sector:=(p_details->>'sector')::integer;district:=(sector-1)%4+1;
 if sector<>e.last_sector+1 or(p_details->>'district')::integer<>district or p_details->>'guardianDefeated'<>'true'or p_details->>'relays'<>'3'then raise exception'Complete the next sector guardian and its mission first.';end if;
 if extract(epoch from(now()-e.last_sector_at))<(case when e.last_sector<e.start_sector then 60 else 30 end)or now()>r.last_seen+interval'45 seconds'then raise exception'Reconnect and complete a real sector before confirming it.';end if;
 insert into kme_private.blacksite_progress(profile_id)values(r.profile_id)on conflict do nothing;select data into progress from kme_private.blacksite_progress where profile_id=r.profile_id for update;
 if not(progress->'clears'@>jsonb_build_array(district))then progress:=jsonb_set(progress,'{clears}',progress->'clears'||jsonb_build_array(district));end if;
 progress:=jsonb_set(progress,'{unlocked}',to_jsonb(greatest((progress->>'unlocked')::integer,least(4,district+1))));if not(progress->'classes'?'chemist')then progress:=jsonb_set(progress,'{classes}',progress->'classes'||'"chemist"'::jsonb);end if;update kme_private.blacksite_progress set data=progress,updated_at=now()where profile_id=r.profile_id;
 perform pg_advisory_xact_lock(hashtextextended('cosmetic-awards-v29',0));select coalesce(sum(amount),0)into used_profile from kme_private.cosmetic_earnings where profile_id=r.profile_id and day=today and category='sector';select coalesce(sum(amount),0)into used_device from kme_private.cosmetic_earnings where user_id=auth.uid()and day=today and category='sector';bonus:=greatest(0,least((array[5,8,12,20])[district],60-used_profile,60-used_device));
 if bonus>0 then insert into kme_private.cosmetic_earnings(profile_id,user_id,day,category,receipt,amount)values(r.profile_id,auth.uid(),today,'sector','v4-sector:'||r.id||':'||sector,bonus);insert into kme_private.cosmetic_wallet(profile_id,balance,earned)values(r.profile_id,20+bonus,20+bonus)on conflict(profile_id)do update set balance=cosmetic_wallet.balance+bonus,earned=cosmetic_wallet.earned+bonus;end if;
 v:=jsonb_build_object('ok',true,'sector',sector,'district',district,'progress',progress,'stardustBonus',bonus,'day',today,'at',now());insert into kme_private.v4_sector_receipts(id,run_id,profile_id,sector,result)values(p_id,r.id,r.profile_id,sector,v);update kme_private.v4_expeditions set last_sector=sector,last_sector_at=now()where run_id=r.id;return v;
end;$$;
create or replace function public.kme_blacksite_v4_settle(p_run_id uuid,p_score bigint,p_wave integer,p_capsules integer,p_outcome text,p_details jsonb)returns jsonb language plpgsql security definer set search_path='' as $$
declare r kme_private.extraction_runs%rowtype;e kme_private.v4_expeditions%rowtype;v jsonb;age integer;retained bigint;sector integer;kills bigint;before_wallet integer;prior bigint;
begin
 perform kme_private.guard(null,'v4-settle',120,3600);perform pg_advisory_xact_lock(hashtextextended('kme-campaign-v3',0));select * into r from kme_private.extraction_runs where id=p_run_id for update;select * into e from kme_private.v4_expeditions where run_id=p_run_id for update;
 if e.run_id is null or r.user_id is distinct from auth.uid()then raise exception'That expedition belongs to another device.';end if;if e.result is not null then return e.result;end if;
 if p_details is null or jsonb_typeof(p_details)<>'object'or octet_length(p_details::text)>16000 or p_score is null or p_score<0 or p_score>9007199254740991 then raise exception'Invalid competitive result.';end if;
 sector:=coalesce((p_details->>'sector')::integer,e.start_sector);kills:=coalesce((p_details->>'kills')::bigint,0);if sector not in(e.last_sector,e.last_sector+1)or kills<0 or kills>2147483647 then raise exception'Invalid sector or kill record.';end if;
 age:=greatest(0,floor(extract(epoch from(now()-r.started_at)))::integer);select balance into before_wallet from kme_private.cosmetic_wallet where profile_id=r.profile_id;select best_score into prior from kme_private.v4_competitive where profile_id=r.profile_id;
 -- The legacy social/cosmetic economy remains bounded; its old score is not the competitive record.
 v:=public.kme_blacksite_settle(p_run_id,least(p_score,10000,age::bigint*24)::integer,least(greatest(0,p_wave),age/20+1),least(12,greatest(0,p_capsules),age/8),p_outcome,p_details);
 retained:=case when p_outcome='extracted'then p_score else floor(p_score::numeric*.2)::bigint end;
 insert into kme_private.v4_competitive as c(profile_id,best_score,best_sector,kills,runs,extractions,longest)values(r.profile_id,retained,sector,kills,1,case when p_outcome='extracted'then 1 else 0 end,age)on conflict(profile_id)do update set best_score=greatest(c.best_score,excluded.best_score),best_sector=greatest(c.best_sector,excluded.best_sector),kills=c.kills+excluded.kills,runs=c.runs+1,extractions=c.extractions+excluded.extractions,longest=greatest(c.longest,excluded.longest);
 v:=v||jsonb_build_object('score',retained,'rawScore',p_score,'v4',jsonb_build_object('sector',sector,'completedSectors',greatest(0,e.last_sector-e.start_sector+1),'kills',kills,'seconds',age,'personalBest',retained>coalesce(prior,0)),'stardustEarned',greatest(0,coalesce((select balance from kme_private.cosmetic_wallet where profile_id=r.profile_id),20)-coalesce(before_wallet,20)));
 update kme_private.v4_expeditions set result=v where run_id=r.id;update kme_private.extraction_runs set result=v where id=r.id;update kme_private.blacksite_expeditions set result=v where run_id=r.id;return v;
end;$$;

do $$begin
 if to_regprocedure('kme_private.world_v35()')is null then alter function public.kme_world()rename to world_v35;alter function public.world_v35()set schema kme_private;end if;
 if to_regprocedure('kme_private.export_profile_v35(uuid)')is null then alter function public.kme_export_profile(uuid)rename to export_profile_v35;alter function public.export_profile_v35(uuid)set schema kme_private;end if;
end;$$;
create or replace function public.kme_world()returns jsonb language plpgsql security definer set search_path='' as $$declare v jsonb;begin
 v:=kme_private.world_v35();perform kme_private.v4_finalize_weeks();return v||jsonb_build_object('patch',jsonb_build_object('version','4.0','name','NO MORE AURA FOR U'),'v4',true,'collection_epoch','collection-4.0','competitive',(select coalesce(jsonb_agg(to_jsonb(c)order by c.best_score desc),'[]')from kme_private.v4_competitive c),'identities',(select coalesce(jsonb_object_agg(i.profile_id,jsonb_build_object('equipped',i.equipped,'rankVisible',i.rank_visible,'copies',coalesce(c.quantity,0))),'{}')from kme_private.v4_identity i left join kme_private.v4_aura_copies c on c.profile_id=i.profile_id and c.aura_id=i.equipped),'singularity_theme',kme_private.v4_theme(date_trunc('week',now()at time zone'Europe/Helsinki')::date));
end;$$;
create or replace function public.kme_export_profile(p_profile_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$begin
 return kme_private.export_profile_v35(p_profile_id)||jsonb_build_object('v4_profile',public.kme_profile_v4(p_profile_id),'v4_collection_archive',(select data from kme_private.v4_collection_archive where profile_id=p_profile_id),'v4_receipts',(select coalesce(jsonb_agg(to_jsonb(r)-'user_id'),'[]')from kme_private.v4_receipts r where profile_id=p_profile_id),'v4_expeditions',(select coalesce(jsonb_agg(to_jsonb(e)-'user_id'),'[]')from kme_private.v4_expeditions e where profile_id=p_profile_id));
end;$$;
do $$declare p regprocedure;begin for p in select oid::regprocedure from pg_proc where pronamespace='kme_private'::regnamespace and(proname like'v4_%'or proname in('extraction_finish_v35','blacksite_finish_v35','nightfall_v35','world_v35','export_profile_v35'))loop execute format('revoke all on function %s from public,anon,authenticated',p);end loop;end;$$;
revoke all on function public.kme_v4_collection(uuid),public.kme_v4_action(uuid,uuid,text,text,text,boolean,text),public.kme_profile_v4(uuid,timestamptz),public.kme_blacksite_v4_start(uuid,text,integer,text),public.kme_blacksite_v4_sector(uuid,uuid,jsonb),public.kme_blacksite_v4_settle(uuid,bigint,integer,integer,text,jsonb),public.kme_world(),public.kme_export_profile(uuid),public.kme_extraction_finish(uuid,integer,integer,integer,boolean),public.kme_blacksite_finish(uuid,integer,integer,integer,text),public.kme_nightfall(uuid,text,text)from public,anon,authenticated;
grant execute on function public.kme_v4_collection(uuid),public.kme_v4_action(uuid,uuid,text,text,text,boolean,text),public.kme_profile_v4(uuid,timestamptz),public.kme_blacksite_v4_start(uuid,text,integer,text),public.kme_blacksite_v4_sector(uuid,uuid,jsonb),public.kme_blacksite_v4_settle(uuid,bigint,integer,integer,text,jsonb),public.kme_world(),public.kme_export_profile(uuid),public.kme_extraction_finish(uuid,integer,integer,integer,boolean),public.kme_blacksite_finish(uuid,integer,integer,integer,text),public.kme_nightfall(uuid,text,text)to authenticated;
notify pgrst,'reload schema';
commit;
