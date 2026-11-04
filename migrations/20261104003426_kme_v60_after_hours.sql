-- Additive v5/v6: independent response lanes and an original cooperative office operation.
begin;
create table if not exists kme_private.v6_read_budget(day date not null,lane text not null check(lane in('text','art')),bytes bigint not null default 0 check(bytes>=0),primary key(day,lane));
create table if not exists kme_private.v6_operations(week date primary key,chapter integer not null default 0 check(chapter between 0 and 6),outcomes jsonb not null default '[]',updated_at timestamptz not null default now());
create table if not exists kme_private.v6_jobs(id uuid primary key,week date not null,day date not null,profile_id uuid not null references public.kme_profiles(id)on delete cascade,user_id uuid not null references auth.users(id)on delete cascade,kind text not null check(kind in('art','game','community')),created_at timestamptz not null default now(),unique(day,profile_id,kind),unique(day,user_id,kind));
create index if not exists v6_jobs_week on kme_private.v6_jobs(week);
create index if not exists v6_jobs_profile on kme_private.v6_jobs(profile_id);
create index if not exists v6_jobs_user on kme_private.v6_jobs(user_id);
create table if not exists kme_private.v6_dispatches(id uuid primary key,week date not null,chapter integer not null check(chapter between 0 and 5),profile_id uuid not null references public.kme_profiles(id)on delete cascade,user_id uuid not null references auth.users(id)on delete cascade,kind text not null check(kind in('solve','vote')),choice integer check(choice in(0,1)),created_at timestamptz not null default now(),unique(week,chapter,profile_id,kind),unique(week,chapter,user_id,kind));
create index if not exists v6_dispatch_profile on kme_private.v6_dispatches(profile_id);
create index if not exists v6_dispatch_user on kme_private.v6_dispatches(user_id);
create table if not exists kme_private.v6_receipts(id uuid primary key,profile_id uuid not null references public.kme_profiles(id)on delete cascade,user_id uuid not null references auth.users(id)on delete cascade,week date not null,action text not null,payload text not null,result jsonb not null,created_at timestamptz not null default now());
create index if not exists v6_receipt_profile on kme_private.v6_receipts(profile_id);
create index if not exists v6_receipt_user on kme_private.v6_receipts(user_id);
do $$declare t text;begin foreach t in array array['v6_read_budget','v6_operations','v6_jobs','v6_dispatches','v6_receipts']loop execute format('alter table kme_private.%I enable row level security',t);execute format('revoke all on kme_private.%I from public,anon,authenticated',t);end loop;end;$$;

create or replace function kme_private.chat_read_charge(p_data jsonb)returns jsonb language plpgsql set search_path='' as $$
declare cost bigint:=octet_length(p_data::text)+128;used bigint;d date:=(now()at time zone'UTC')::date;v_lane text:=case when p_data?'data_url' or p_data?'data' or p_data?'drawings' then 'art' else 'text' end;cap bigint;reset_at timestamptz:=(d+1)::timestamp at time zone'UTC';
begin
 cap:=case when v_lane='art' then 134217728 else 16777216 end;
 insert into kme_private.v6_read_budget(day,lane)values(d,v_lane)on conflict do nothing;
 select b.bytes into used from kme_private.v6_read_budget b where b.day=d and b.lane=v_lane for update;
 if used+cost>cap then return jsonb_build_object('ok',false,'budget_paused',true,'budget_lane',v_lane,'resets_at',reset_at,'message',case when v_lane='art' then 'Drawing downloads reached today’s shared allowance. Text chat still works. Cached art stays available.' else 'Text refresh reached today’s shared allowance. Your drafts stay saved; sending is still available.' end);end if;
 update kme_private.v6_read_budget b set bytes=b.bytes+cost where b.day=d and b.lane=v_lane;
 delete from kme_private.v6_read_budget where day<d-35;
 return p_data;
end;$$;

create or replace function kme_private.v6_proof(p_profile uuid,p_kind text)returns boolean language sql stable security definer set search_path='' as $$
select case p_kind when 'art' then exists(select 1 from kme_private.posts p join kme_private.chat_art a on a.post_id=p.id where p.profile_id=p_profile and p.user_id=auth.uid()and p.deleted_at is null and a.created_at>=date_trunc('day',now()at time zone'Europe/Helsinki')at time zone'Europe/Helsinki')
when 'game' then exists(select 1 from kme_private.cosmetic_earnings e where e.profile_id=p_profile and e.user_id=auth.uid()and e.category='game'and e.day=(now()at time zone'Europe/Helsinki')::date)
when 'community' then exists(select 1 from kme_private.posts p where p.profile_id=p_profile and p.user_id=auth.uid()and p.deleted_at is null and char_length(btrim(p.body))>=20 and p.body not like 'Drawing challenge:%'and p.created_at>=date_trunc('day',now()at time zone'Europe/Helsinki')at time zone'Europe/Helsinki')else false end
$$;

create or replace function kme_private.v6_state(p_profile uuid)returns jsonb language plpgsql security definer set search_path='' as $$
declare w date:=date_trunc('week',now()at time zone'Europe/Helsinki')::date;d date:=(now()at time zone'Europe/Helsinki')::date;op kme_private.v6_operations%rowtype;result jsonb;
begin
 select * into op from kme_private.v6_operations where week=w;
 result:=jsonb_build_object('ok',true,'week',w,'day',d,'scenario',((floor((w-date'2026-11-02')/7.0)::integer%6)+6)%6,'chapter',coalesce(op.chapter,0),'outcomes',coalesce(op.outcomes,'[]'),'power',(select count(*)from kme_private.v6_jobs where week=w),'participants',(select count(distinct profile_id)from kme_private.v6_jobs where week=w),'solved',exists(select 1 from kme_private.v6_dispatches where week=w and chapter=coalesce(op.chapter,0)and kind='solve'),'votes',(select jsonb_build_array(count(*)filter(where choice=0),count(*)filter(where choice=1))from kme_private.v6_dispatches where week=w and chapter=coalesce(op.chapter,0)and kind='vote'),'myVote',(select choice from kme_private.v6_dispatches where week=w and chapter=coalesce(op.chapter,0)and kind='vote'and(profile_id=p_profile or user_id=auth.uid())limit 1),'jobs',(select jsonb_agg(jsonb_build_object('kind',kind,'eligible',kme_private.v6_proof(p_profile,kind),'claimed',exists(select 1 from kme_private.v6_jobs j where j.day=d and j.kind=k.kind and(j.profile_id=p_profile or j.user_id=auth.uid()))))from unnest(array['art','game','community'])k(kind)),'recent',(select coalesce(jsonb_agg(to_jsonb(x)),'[]')from(select profile_id,kind,created_at from kme_private.v6_jobs where week=w order by created_at desc limit 12)x),'history',(select coalesce(jsonb_agg(to_jsonb(x)),'[]')from(select week,chapter,outcomes from kme_private.v6_operations where week<w order by week desc limit 6)x),'myMarks',(select count(*)from kme_private.v6_dispatches where week=w and profile_id=p_profile));
 return result;
end;$$;
create or replace function public.kme_v6_state(p_profile_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$begin perform kme_private.guard(p_profile_id,'v6-state',240,3600);if p_profile_id is null then raise exception'Choose a character.';end if;return kme_private.chat_read_charge(kme_private.v6_state(p_profile_id));end;$$;
create or replace function public.kme_v6_action(p_profile_id uuid,p_id uuid,p_week date,p_action text,p_value text default '')returns jsonb language plpgsql security definer set search_path='' as $$
declare w date:=date_trunc('week',now()at time zone'Europe/Helsinki')::date;d date:=(now()at time zone'Europe/Helsinki')::date;old kme_private.v6_receipts%rowtype;op kme_private.v6_operations%rowtype;result jsonb;power integer;votes integer[];chosen integer;answers text[]:=array['4373','31','45','29','105','13'];
begin
 perform kme_private.guard(p_profile_id,'v6-action',120,3600);if p_profile_id is null or p_id is null then raise exception'Choose a character and action receipt.';end if;
 if p_action is null or p_action not in('job','solve','vote','advance')or p_value is null or char_length(p_value)>80 then raise exception'Unknown operation action.';end if;
 perform pg_advisory_xact_lock(hashtextextended('kme-v6-operation',0));
 select * into old from kme_private.v6_receipts where id=p_id;if found then if old.profile_id<>p_profile_id or old.user_id<>auth.uid()or old.week is distinct from p_week or old.action<>p_action or old.payload<>p_value then raise exception'That receipt is bound to another action.';end if;return old.result;end if;
 if p_week is distinct from w then raise exception'That operation ended. Refresh before acting.';end if;
 insert into kme_private.v6_operations(week)values(w)on conflict do nothing;select * into op from kme_private.v6_operations where week=w for update;
 if p_action='job'then
  if p_value not in('art','game','community')or not kme_private.v6_proof(p_profile_id,p_value)then raise exception'Complete this activity with this character and device today first.';end if;
  if exists(select 1 from kme_private.v6_jobs where day=d and kind=p_value and(profile_id=p_profile_id or user_id=auth.uid()))then raise exception'That daily job is already claimed on this character or device.';end if;
  insert into kme_private.v6_jobs(id,week,day,profile_id,user_id,kind)values(p_id,w,d,p_profile_id,auth.uid(),p_value);
 elsif p_action='solve'then
  if op.chapter>=6 then raise exception'The operation is complete.';end if;
  if btrim(p_value)<>answers[op.chapter+1]then return jsonb_build_object('ok',false,'message','The panel rejects that answer. Check the clue and try again.');end if;
  if exists(select 1 from kme_private.v6_dispatches where week=w and chapter=op.chapter and kind='solve'and(profile_id=p_profile_id or user_id=auth.uid()))then raise exception'You already solved this panel.';end if;
  insert into kme_private.v6_dispatches(id,week,chapter,profile_id,user_id,kind)values(p_id,w,op.chapter,p_profile_id,auth.uid(),'solve');
 elsif p_action='vote'then
  if op.chapter>=6 or p_value not in('0','1')then raise exception'Choose an active decision.';end if;
  if exists(select 1 from kme_private.v6_dispatches where week=w and chapter=op.chapter and kind='vote'and(profile_id=p_profile_id or user_id=auth.uid()))then raise exception'Your device or character already voted here.';end if;
  insert into kme_private.v6_dispatches(id,week,chapter,profile_id,user_id,kind,choice)values(p_id,w,op.chapter,p_profile_id,auth.uid(),'vote',p_value::integer);
 else
  if op.chapter>=6 then raise exception'The operation is complete.';end if;
  select count(*)into power from kme_private.v6_jobs where week=w;
  select array[count(*)filter(where choice=0)::integer,count(*)filter(where choice=1)::integer]into votes from kme_private.v6_dispatches where week=w and chapter=op.chapter and kind='vote';
  if power<(op.chapter+1)*2 or votes[1]+votes[2]=0 or not exists(select 1 from kme_private.v6_dispatches where week=w and chapter=op.chapter and kind='solve')then raise exception'Complete the puzzle, cast a decision and collect enough crew power first.';end if;
  chosen:=case when votes[2]>votes[1]then 1 else 0 end;
  update kme_private.v6_operations set chapter=chapter+1,outcomes=outcomes||jsonb_build_array(jsonb_build_object('chapter',chapter,'choice',chosen,'votes',to_jsonb(votes),'closed_at',now())),updated_at=now()where week=w;
 end if;
 result:=kme_private.v6_state(p_profile_id);insert into kme_private.v6_receipts values(p_id,p_profile_id,auth.uid(),w,p_action,p_value,result,now());return result;
end;$$;

create or replace function public.kme_v6_gallery(p_before timestamptz default null,p_before_id uuid default null)returns jsonb language plpgsql security definer set search_path='' as $$
declare items jsonb;more boolean;begin perform kme_private.guard(null,'v6-gallery',30,60);if(p_before is null)is distinct from(p_before_id is null)then raise exception'Both cursor fields are required.';end if;
 with page as(select p.id,p.profile_id,p.body,p.created_at,a.width,a.height,octet_length(a.png)as bytes,(select count(*)from kme_private.votes v where v.post_id=p.id)as votes from kme_private.posts p join kme_private.chat_art a on a.post_id=p.id where p.deleted_at is null and a.created_at>=now()-interval'7 days'and(p_before is null or(p.created_at,p.id)<(p_before,p_before_id))order by p.created_at desc,p.id desc limit 31),shown as(select * from page order by created_at desc,id desc limit 30)select coalesce(jsonb_agg(to_jsonb(shown)order by created_at desc,id desc),'[]'),(select count(*)>30 from page)into items,more from shown;
 return kme_private.chat_read_charge(jsonb_build_object('ok',true,'items',items,'more',more));end;$$;

do $$begin if to_regprocedure('kme_private.export_before_v6(uuid)')is null then alter function public.kme_export_profile(uuid)set schema kme_private;alter function kme_private.kme_export_profile(uuid)rename to export_before_v6;end if;end;$$;
create or replace function public.kme_export_profile(p_profile_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$begin return kme_private.export_before_v6(p_profile_id)||jsonb_build_object('after_hours_jobs',(select coalesce(jsonb_agg(to_jsonb(j)-'user_id'),'[]')from kme_private.v6_jobs j where profile_id=p_profile_id),'after_hours_dispatches',(select coalesce(jsonb_agg(to_jsonb(j)-'user_id'),'[]')from kme_private.v6_dispatches j where profile_id=p_profile_id));end;$$;
revoke all on function kme_private.chat_read_charge(jsonb),kme_private.v6_proof(uuid,text),kme_private.v6_state(uuid),kme_private.export_before_v6(uuid)from public,anon,authenticated;
revoke all on function public.kme_v6_state(uuid),public.kme_v6_action(uuid,uuid,date,text,text),public.kme_v6_gallery(timestamptz,uuid),public.kme_export_profile(uuid)from public,anon,authenticated;
grant execute on function public.kme_v6_state(uuid),public.kme_v6_action(uuid,uuid,date,text,text),public.kme_v6_gallery(timestamptz,uuid),public.kme_export_profile(uuid)to authenticated;
commit;
