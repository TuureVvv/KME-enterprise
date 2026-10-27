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
