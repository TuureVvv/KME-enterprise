-- v3.5: additive, admitted team competition and deterministic aura atelier.
begin;
create table if not exists kme_private.nightfall_members(
 week date not null,profile_id uuid not null references public.kme_profiles(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,team text not null check(team in('rehab','night')),
 joined_at timestamptz not null default now(),target integer not null check(target between 60 and 420),
 left_at timestamptz,primary key(week,profile_id));
create index if not exists nightfall_members_user on kme_private.nightfall_members(user_id,week);
create index if not exists nightfall_members_profile on kme_private.nightfall_members(profile_id,week);
create table if not exists kme_private.nightfall_damage(
 receipt text primary key,week date not null,day date not null,profile_id uuid not null references public.kme_profiles(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,team text not null check(team in('rehab','night')),
 category text not null check(category in('game','art','resisted','rally','popular')),amount integer not null check(amount between 1 and 60),created_at timestamptz not null default now());
create index if not exists nightfall_damage_profile_day on kme_private.nightfall_damage(profile_id,day,category);
create index if not exists nightfall_damage_user_day on kme_private.nightfall_damage(user_id,day,category);
create index if not exists nightfall_damage_week on kme_private.nightfall_damage(week,team);
create table if not exists kme_private.aura_wallet(profile_id uuid primary key references public.kme_profiles(id) on delete cascade,stardust integer not null default 0 check(stardust>=0));
create table if not exists kme_private.aura_receipts(id uuid primary key,profile_id uuid not null references public.kme_profiles(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,action text not null,tier integer not null,result jsonb not null,created_at timestamptz not null default now());
create index if not exists aura_receipts_profile on kme_private.aura_receipts(profile_id);
create index if not exists aura_receipts_user on kme_private.aura_receipts(user_id);
alter table kme_private.nightfall_members enable row level security;
alter table kme_private.nightfall_damage enable row level security;
alter table kme_private.aura_wallet enable row level security;
alter table kme_private.aura_receipts enable row level security;
revoke all on kme_private.nightfall_members,kme_private.nightfall_damage,kme_private.aura_wallet,kme_private.aura_receipts from public,anon,authenticated;

create or replace function kme_private.nightfall_award(p_profile uuid,p_user uuid,p_category text,p_receipt text) returns integer language plpgsql security definer set search_path='' as $$
declare today date:=(now()at time zone'Europe/Helsinki')::date;w date:=date_trunc('week',now()at time zone'Europe/Helsinki')::date;
 m kme_private.nightfall_members%rowtype;cap integer;points integer;used_profile integer;used_device integer;days integer;
begin
 -- Only trusted server triggers and the explicit Rally RPC call this private function.
 if p_user is null or not exists(select 1 from public.kme_profiles where id=p_profile) then return 0;end if;
 perform pg_advisory_xact_lock(hashtextextended('nightfall-awards-v35',0));
 select * into m from kme_private.nightfall_members where week=w and profile_id=p_profile and left_at is null;
 if not found or exists(select 1 from kme_private.nightfall_damage where receipt=p_receipt) then return 0;end if;
 cap:=case p_category when'game'then 3 when'art'then 1 when'resisted'then 1 when'rally'then 1 when'popular'then 1 else 0 end;
 points:=case p_category when'game'then 10 when'art'then 10 when'resisted'then 5 when'rally'then 5 when'popular'then 10 else 0 end;
 if cap=0 or (select count(*)from kme_private.nightfall_damage where profile_id=p_profile and day=today and category=p_category)>=cap or (select count(*)from kme_private.nightfall_damage where user_id=p_user and day=today and category=p_category)>=cap then return 0;end if;
 if p_category='game' then select count(distinct day)into days from kme_private.nightfall_damage where profile_id=p_profile and week=w and day<today;points:=floor(10*least(1.35,1+.05*days));end if;
 select coalesce(sum(amount),0)into used_profile from kme_private.nightfall_damage where profile_id=p_profile and day=today;
 select coalesce(sum(amount),0)into used_device from kme_private.nightfall_damage where user_id=p_user and day=today;
 points:=greatest(0,least(points,60-used_profile,60-used_device));if points=0 then return 0;end if;
 insert into kme_private.nightfall_damage(receipt,week,day,profile_id,user_id,team,category,amount)values(p_receipt,w,today,p_profile,p_user,m.team,p_category,points);
 return points;
end;$$;
create or replace function kme_private.nightfall_earning()returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.category in('game','art','resisted')then perform kme_private.nightfall_award(new.profile_id,new.user_id,new.category,'earned:'||new.receipt);end if;return new;
end;$$;
create or replace trigger nightfall_confirmed_earning after insert on kme_private.cosmetic_earnings for each row execute function kme_private.nightfall_earning();
create or replace function kme_private.nightfall_popular()returns trigger language plpgsql security definer set search_path='' as $$
declare p kme_private.posts%rowtype;
begin
 perform pg_advisory_xact_lock(hashtextextended('nightfall-awards-v35',0));
 select * into p from kme_private.posts where id=new.post_id and deleted_at is null and parent_id is null and created_at>=date_trunc('week',now()at time zone'Europe/Helsinki')at time zone'Europe/Helsinki';
 if not found or new.user_id=p.user_id then return new;end if;
 if(select count(distinct user_id)from kme_private.votes where post_id=p.id and user_id<>p.user_id)>=3 then perform kme_private.nightfall_award(p.profile_id,p.user_id,'popular','popular:'||p.id);end if;return new;
end;$$;
create or replace trigger nightfall_popular_post after insert on kme_private.votes for each row execute function kme_private.nightfall_popular();

create or replace function kme_private.nightfall_snapshot(p_profile uuid default null,p_week date default date_trunc('week',now()at time zone'Europe/Helsinki')::date)returns jsonb language plpgsql security definer set search_path='' as $$
declare today date:=(now()at time zone'Europe/Helsinki')::date;v jsonb;
begin
 select jsonb_build_object('week',p_week,'day',today,'ends',p_week+7,
 'teams',(select jsonb_agg(jsonb_build_object('id',t.team,'members',(select count(*)from kme_private.nightfall_members m where m.week=p_week and m.team=t.team),'target',t.target,'damage',t.damage,'percent',case when t.target>0 then round(t.damage*100.0/t.target,1)else 0 end))from(select x.team,coalesce((select sum(target)from kme_private.nightfall_members where week=p_week and team=x.team),0)target,coalesce((select sum(amount)from kme_private.nightfall_damage where week=p_week and team=x.team),0)damage from(values('rehab'),('night'))x(team))t),
 'membership',(select jsonb_build_object('team',team,'left',left_at is not null,'target',target)from kme_private.nightfall_members where week=p_week and profile_id=p_profile),
 'today',jsonb_build_object('damage',(select coalesce(sum(amount),0)from kme_private.nightfall_damage where profile_id=p_profile and day=today),'counts',(select coalesce(jsonb_object_agg(category,n),'{}')from(select category,count(*)n from kme_private.nightfall_damage where profile_id=p_profile and day=today group by category)t)),
 'momentum',least(1.35,1+.05*(select count(distinct day)from kme_private.nightfall_damage where profile_id=p_profile and week=p_week and day<today)),
 'roster',(select coalesce(jsonb_agg(jsonb_build_object('profile_id',case when m.left_at is null then m.profile_id end,'team',m.team,'left',m.left_at is not null,'target',m.target,'damage',(select coalesce(sum(amount),0)from kme_private.nightfall_damage where week=p_week and profile_id=m.profile_id))order by m.joined_at),'[]')from(select * from kme_private.nightfall_members where week=p_week order by joined_at limit 200)m),
 'recent',(select coalesce(jsonb_agg(jsonb_build_object('profile_id',case when m.left_at is null then d.profile_id end,'team',d.team,'amount',d.amount,'category',d.category,'created_at',d.created_at)order by d.created_at desc),'[]')from(select * from kme_private.nightfall_damage where week=p_week order by created_at desc limit 8)d left join kme_private.nightfall_members m on m.week=d.week and m.profile_id=d.profile_id))into v;
 return v;
end;$$;
create or replace function public.kme_nightfall(p_profile_id uuid,p_action text default'read',p_team text default null)returns jsonb language plpgsql security definer set search_path='' as $$
declare w date:=date_trunc('week',now()at time zone'Europe/Helsinki')::date;today date:=(now()at time zone'Europe/Helsinki')::date;m kme_private.nightfall_members%rowtype;gained integer:=0;v jsonb;
begin
 perform kme_private.guard(p_profile_id,'nightfall',60,60);if p_profile_id is null then raise exception'Choose a character.';end if;
 if p_action not in('read','join','leave','rally')or p_action is null then raise exception'Unknown operation action.';end if;
 if p_action<>'read'then
  perform pg_advisory_xact_lock(hashtextextended('nightfall-awards-v35',0));
  select * into m from kme_private.nightfall_members where week=w and profile_id=p_profile_id;
  if p_action='join'then
   if p_team is null or p_team not in('rehab','night')then raise exception'Choose a crew.';end if;
   if m.profile_id is not null then
    if m.team<>p_team or m.left_at is not null then raise exception'Your crew is locked for this operation. Choose again next Monday.';end if;
   else
    if exists(select 1 from kme_private.nightfall_members where week=w and user_id=auth.uid()and team<>p_team)then raise exception'This device already joined the other crew this week.';end if;
    if(select count(*)from kme_private.nightfall_members where week=w)>=200 then raise exception'This operation roster is full.';end if;
    insert into kme_private.nightfall_members(week,profile_id,user_id,team,target)values(w,p_profile_id,auth.uid(),p_team,60*(7-(today-w)));
   end if;
  elsif p_action='leave'then update kme_private.nightfall_members set left_at=coalesce(left_at,now())where week=w and profile_id=p_profile_id;
  elsif p_action='rally'then
   if m.profile_id is null or m.left_at is not null then raise exception'Join a crew before rallying.';end if;
   gained:=kme_private.nightfall_award(p_profile_id,auth.uid(),'rally','rally:'||p_profile_id||':'||today);
  end if;
 end if;
 v:=kme_private.nightfall_snapshot(p_profile_id,w);
 return v||jsonb_build_object('ok',true,'gained',gained,'previous',kme_private.nightfall_snapshot(null,w-7)-'roster'-'recent'-'membership'-'today'-'momentum');
end;$$;

create or replace function public.kme_auras(p_profile_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform kme_private.guard(p_profile_id,'auras-read',60,60);if p_profile_id is null then raise exception'Choose a character.';end if;
 return jsonb_build_object('ok',true,'stardust',coalesce((select stardust from kme_private.aura_wallet where profile_id=p_profile_id),0),'equipped',(select equipped from kme_private.extraction_stats where profile_id=p_profile_id),'inventory',(select coalesce(jsonb_agg(jsonb_build_object('tier',tier,'quantity',quantity)order by tier),'[]')from kme_private.inventory where profile_id=p_profile_id and quantity>0));
end;$$;
create or replace function public.kme_aura_action(p_profile_id uuid,p_id uuid,p_action text,p_tier integer)returns jsonb language plpgsql security definer set search_path='' as $$
declare receipt kme_private.aura_receipts%rowtype;n integer;dust integer;price integer;v jsonb;
begin
 perform kme_private.guard(p_profile_id,'auras-write',60,60);
 if p_profile_id is null or p_id is null or p_action is null or p_action not in('distill','craft','equip')or p_tier is null or p_tier not between -1 and 9 or(p_tier=-1 and p_action<>'equip')then raise exception'Choose a valid aura action.';end if;
 perform pg_advisory_xact_lock(hashtextextended('auras-v35-'||p_profile_id,0));
 select * into receipt from kme_private.aura_receipts where id=p_id;
 if found then if receipt.profile_id<>p_profile_id or receipt.user_id<>auth.uid()or receipt.action<>p_action or receipt.tier<>p_tier then raise exception'This receipt belongs to a different action.';end if;return receipt.result;end if;
 -- Inventory row locks also serialize older open clients awarding capsule copies.
 insert into kme_private.aura_wallet(profile_id)values(p_profile_id)on conflict do nothing;
 select stardust into dust from kme_private.aura_wallet where profile_id=p_profile_id for update;
 if p_tier>=0 then insert into kme_private.inventory(profile_id,tier,quantity)values(p_profile_id,p_tier,0)on conflict do nothing;select quantity into n from kme_private.inventory where profile_id=p_profile_id and tier=p_tier for update;end if;
 if p_action='distill'then
  if n<2 then raise exception'Keep your last copy. Only duplicates can become stardust.';end if;
  update kme_private.inventory set quantity=quantity-1 where profile_id=p_profile_id and tier=p_tier;
  update kme_private.aura_wallet set stardust=stardust+10*(p_tier+1)where profile_id=p_profile_id;
 elsif p_action='craft'then
  price:=(array[20,35,60,100,160,240,360,520,760,1200])[p_tier+1];
  if n>0 then raise exception'You already own this aura. Your stardust is safe.';end if;
  if dust<price then raise exception'Not enough stardust for this aura.';end if;
  update kme_private.aura_wallet set stardust=stardust-price where profile_id=p_profile_id;
  update kme_private.inventory set quantity=quantity+1 where profile_id=p_profile_id and tier=p_tier;
 else
  if p_tier>=0 and n<1 then raise exception'Own the aura before equipping it.';end if;
  insert into kme_private.extraction_stats(profile_id,equipped)values(p_profile_id,nullif(p_tier,-1))on conflict(profile_id)do update set equipped=excluded.equipped;
 end if;
 v:=public.kme_auras(p_profile_id)||jsonb_build_object('action',p_action,'tier',p_tier,'receipt',p_id);
 insert into kme_private.aura_receipts(id,profile_id,user_id,action,tier,result)values(p_id,p_profile_id,auth.uid(),p_action,p_tier,v);return v;
end;$$;

do $$begin
 if to_regprocedure('kme_private.world_v30()')is null then alter function public.kme_world()rename to world_v30;alter function public.world_v30()set schema kme_private;end if;
 if to_regprocedure('kme_private.export_profile_v30(uuid)')is null then alter function public.kme_export_profile(uuid)rename to export_profile_v30;alter function public.export_profile_v30(uuid)set schema kme_private;end if;
end;$$;
create or replace function public.kme_world()returns jsonb language plpgsql security definer set search_path='' as $$declare v jsonb;begin
 v:=kme_private.world_v30();return v||jsonb_build_object('patch',jsonb_build_object('version','3.5','name','The Dark Side Of NICOTINE!'),'nightfall',kme_private.nightfall_snapshot(),'aura_atelier',true);
end;$$;
create or replace function public.kme_export_profile(p_profile_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$begin
 return kme_private.export_profile_v30(p_profile_id)||jsonb_build_object('aura_atelier',public.kme_auras(p_profile_id),'nightfall_memberships',(select coalesce(jsonb_agg(to_jsonb(m)-'user_id'),'[]')from kme_private.nightfall_members m where profile_id=p_profile_id),'nightfall_contributions',(select coalesce(jsonb_agg(to_jsonb(d)-'user_id'),'[]')from kme_private.nightfall_damage d where profile_id=p_profile_id));
end;$$;
revoke all on function kme_private.nightfall_award(uuid,uuid,text,text),kme_private.nightfall_earning(),kme_private.nightfall_popular(),kme_private.nightfall_snapshot(uuid,date),kme_private.world_v30(),kme_private.export_profile_v30(uuid)from public,anon,authenticated;
revoke all on function public.kme_nightfall(uuid,text,text),public.kme_auras(uuid),public.kme_aura_action(uuid,uuid,text,integer),public.kme_world(),public.kme_export_profile(uuid)from public,anon,authenticated;
grant execute on function public.kme_nightfall(uuid,text,text),public.kme_auras(uuid),public.kme_aura_action(uuid,uuid,text,integer),public.kme_world(),public.kme_export_profile(uuid)to authenticated;
notify pgrst,'reload schema';
commit;
