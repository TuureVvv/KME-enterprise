-- v2.1 / NIKO NOOOO DONT DO IT. Owner migration; tested before deployment.
-- Text history is bounded independently of drawing bytes and read traffic.
begin;
drop index if exists kme_private.kme_one_daily_post;
create index if not exists kme_chat_cursor on kme_private.posts(created_at desc,id desc);
create index if not exists kme_chat_profile_day on kme_private.posts(profile_id,day);
create index if not exists kme_chat_votes_time on kme_private.votes(created_at);
create table if not exists kme_private.chat_state(
 singleton boolean primary key default true check(singleton),
 revision bigint not null default 1, cleaned_at timestamptz not null default '-infinity'
);
insert into kme_private.chat_state(singleton) values(true) on conflict do nothing;
create table if not exists kme_private.chat_drawings(
 post_id uuid primary key references kme_private.posts(id) on delete cascade,
 prompt text not null check(char_length(prompt) between 1 and 80),
 png bytea not null check(octet_length(png) between 33 and 24576),
 created_at timestamptz not null default now()
);
create table if not exists kme_private.chat_drawing_receipts(
 post_id uuid primary key references kme_private.posts(id) on delete cascade,
 resisted_event_id uuid references public.kme_activity(id) on delete set null,
 resisted_logged boolean not null default false
);
create table if not exists kme_private.chat_read_budget(
 day date primary key, bytes bigint not null default 0
);
create index if not exists kme_chat_receipt_event on kme_private.chat_drawing_receipts(resisted_event_id) where resisted_event_id is not null;
alter table kme_private.chat_state enable row level security;
alter table kme_private.chat_drawings enable row level security;
alter table kme_private.chat_drawing_receipts enable row level security;
alter table kme_private.chat_read_budget enable row level security;
revoke all on kme_private.chat_state,kme_private.chat_drawings,kme_private.chat_drawing_receipts,kme_private.chat_read_budget from public,anon,authenticated;

create or replace function kme_private.chat_cleanup() returns void
language plpgsql set search_path='' as $fn$
declare n integer;removed integer;changed boolean:=false;
begin
 -- Caller already holds the one chat transaction lock. Expire bytes, keep the message.
 delete from kme_private.chat_drawings where created_at<now()-interval '7 days'
  or post_id in(select post_id from kme_private.chat_drawings order by created_at desc,post_id desc offset 100);
 get diagnostics removed=row_count;changed:=removed>0;
 delete from kme_private.posts where deleted_at is not null;
 get diagnostics removed=row_count;changed:=changed or removed>0;
 -- Remove oldest individual leaves first, preserving new replies on older roots.
 loop
  select greatest(0,count(*)-10000)::integer into n from kme_private.posts;
  exit when n=0;
  delete from kme_private.posts where id in(select p.id from kme_private.posts p
   where not exists(select 1 from kme_private.posts c where c.parent_id=p.id)
   order by p.created_at,p.id limit n);
  get diagnostics removed=row_count;changed:=changed or removed>0;exit when removed=0;
 end loop;
 delete from kme_private.votes where (post_id,profile_id) in
  (select post_id,profile_id from kme_private.votes order by created_at desc,post_id desc,profile_id desc offset 20000);
 get diagnostics removed=row_count;changed:=changed or removed>0;
 delete from kme_private.chat_read_budget where day<current_date-35;
 update kme_private.chat_state set cleaned_at=now(),revision=revision+case when changed then 1 else 0 end where singleton;
end; $fn$;

create or replace function kme_private.chat_read_charge(p_data jsonb) returns jsonb
language plpgsql set search_path='' as $fn$
declare cost integer:=octet_length(p_data::text)+512;used bigint;d date:=(now() at time zone 'UTC')::date;
begin
 insert into kme_private.chat_read_budget(day) values(d) on conflict do nothing;
 select bytes into used from kme_private.chat_read_budget where day=d for update;
 if used+cost>67108864 then
  return jsonb_build_object('ok',false,'message','Chat downloads paused to protect the free allowance. Try again after midnight UTC.','budget_paused',true);
 end if;
 update kme_private.chat_read_budget set bytes=bytes+cost where day=d;
 return p_data;
end; $fn$;

create or replace function public.kme_chat_list(p_before timestamptz default null,p_before_id uuid default null,p_thread uuid default null,p_known_revision bigint default null)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare rev bigint;rows_json jsonb;more boolean;result jsonb;
begin
 perform kme_private.guard(null,'chat-read',30,60);
 perform pg_advisory_xact_lock(hashtextextended('kme-chat',0));
 if exists(select 1 from kme_private.chat_state where singleton and cleaned_at<now()-interval '1 minute') then perform kme_private.chat_cleanup();end if;
 select revision into rev from kme_private.chat_state where singleton;
 if p_before is null and p_thread is null and p_known_revision=rev then
  return kme_private.chat_read_charge(jsonb_build_object('ok',true,'unchanged',true,'revision',rev));
 end if;
 if (p_before is null) is distinct from (p_before_id is null) then raise exception 'Both cursor fields are required.';end if;
 if p_thread is not null and not exists(select 1 from kme_private.posts where id=p_thread and parent_id is null and deleted_at is null) then
  return kme_private.chat_read_charge(jsonb_build_object('ok',true,'items','[]'::jsonb,'more',false,'revision',rev,'gone',true));
 end if;
 with page as (select * from kme_private.posts p where deleted_at is null
  and (case when p_thread is null then parent_id is null else parent_id=p_thread end)
  and (p_before is null or (created_at,id)<(p_before,p_before_id)) order by created_at desc,id desc limit 31),
 shown as(select * from page order by created_at desc,id desc limit 30)
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'profile_id',p.profile_id,'parent_id',p.parent_id,'body',p.body,'created_at',p.created_at,
  'can_delete',p.user_id=auth.uid(),'own_device',p.user_id=auth.uid(),
  'votes',(select count(*) from kme_private.votes v where v.post_id=p.id),
  'voted_by_me',exists(select 1 from kme_private.votes v where v.post_id=p.id and v.user_id=auth.uid()),
  'comment_count',(select count(*) from kme_private.posts c where c.parent_id=p.id and c.deleted_at is null),
  'drawing',exists(select 1 from kme_private.chat_drawings d where d.post_id=p.id),
  'drawing_expired',exists(select 1 from kme_private.chat_drawing_receipts r where r.post_id=p.id) and not exists(select 1 from kme_private.chat_drawings d where d.post_id=p.id)
 ) order by p.created_at desc,p.id desc),'[]'::jsonb),(select count(*)>30 from page) into rows_json,more from shown p;
 result:=jsonb_build_object('ok',true,'revision',rev,'items',rows_json,'more',more);
 return kme_private.chat_read_charge(result);
end; $fn$;

create or replace function public.kme_chat_image(p_post_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare result jsonb;
begin
 perform kme_private.guard(null,'chat-image',30,60);
 select jsonb_build_object('ok',true,'data_url','data:image/png;base64,'||replace(encode(d.png,'base64'),E'\n',''),'expires_at',d.created_at+interval '7 days') into result
 from kme_private.chat_drawings d join kme_private.posts p on p.id=d.post_id where p.id=p_post_id and p.deleted_at is null and d.created_at>=now()-interval '7 days';
 return kme_private.chat_read_charge(coalesce(result,jsonb_build_object('ok',false,'message','This drawing has expired or was removed.','expired',true)));
end; $fn$;

-- Keep the same public social API, including reactions and replies, but remove the daily gate.
create or replace function public.kme_social(p_action text,p_profile_id uuid,p_target_id uuid default null,p_body text default null)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare post kme_private.posts%rowtype;new_id uuid;voted boolean;body text:=btrim(p_body);
begin
 perform kme_private.guard(p_profile_id,'chat-write',20,60);
 if p_profile_id is null then raise exception 'Choose a character.';end if;
 perform pg_advisory_xact_lock(hashtextextended('kme-chat',0));
 if p_action in('post','comment') then
  if body is null or char_length(body) not between 1 and 280 then raise exception 'Write 1–280 characters.';end if;
  if p_action='comment' and not exists(select 1 from kme_private.posts where id=p_target_id and parent_id is null and deleted_at is null) then raise exception 'That conversation is gone.';end if;
  insert into kme_private.posts(profile_id,parent_id,body,user_id) values(p_profile_id,case when p_action='comment' then p_target_id else null end,body,auth.uid()) returning id into new_id;
 elsif p_action in('vote','delete') then
  select * into post from kme_private.posts where id=p_target_id and deleted_at is null for update;
  if not found then raise exception 'That message is gone.';end if;
  if p_action='delete' then
   if post.profile_id<>p_profile_id or post.user_id is distinct from auth.uid() then raise exception 'Only the posting device and character can remove this message.';end if;
   delete from kme_private.posts where id=post.id;
  else
   if post.profile_id=p_profile_id or post.user_id=auth.uid() then raise exception 'React to someone else’s message.';end if;
   delete from kme_private.votes where post_id=post.id and user_id=auth.uid();
   if found then voted:=false;else insert into kme_private.votes(post_id,profile_id,user_id) values(post.id,p_profile_id,auth.uid()) on conflict(post_id,profile_id) do nothing;voted:=true;end if;
  end if;
 else raise exception 'Unknown chat action.';end if;
 update kme_private.chat_state set revision=revision+1 where singleton;
 perform kme_private.chat_cleanup();
 return jsonb_build_object('ok',true,'id',new_id,'voted',voted);
end; $fn$;

create or replace function public.kme_chat_drawing(p_profile_id uuid,p_submission_id uuid,p_prompt text,p_png_base64 text,p_resisted boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare png bytea;post kme_private.posts%rowtype;event_id uuid;logged boolean:=false;
begin
 perform kme_private.guard(p_profile_id,'chat-drawing',10,60);
 if p_profile_id is null or p_submission_id is null then raise exception 'Choose a character and drawing receipt.';end if;
 perform pg_advisory_xact_lock(hashtextextended('kme-chat',0));
 select * into post from kme_private.posts where id=p_submission_id;
 if found then
  if post.user_id is distinct from auth.uid() or post.profile_id<>p_profile_id or not exists(select 1 from kme_private.chat_drawing_receipts where post_id=post.id) then raise exception 'That drawing receipt belongs to another submission.';end if;
  select resisted_logged into logged from kme_private.chat_drawing_receipts where post_id=post.id;
  return jsonb_build_object('ok',true,'id',post.id,'resisted_logged',logged,'duplicate',true);
 end if;
 if p_prompt is null or char_length(btrim(p_prompt)) not between 1 and 80 or p_png_base64 is null or octet_length(p_png_base64)>32768 then raise exception 'Use a small drawing and a short prompt.';end if;
 png:=decode(p_png_base64,'base64');
 -- Only a bounded 320 × 240 raster PNG, never SVG, HTML or an external URL.
 if octet_length(png) not between 33 and 24576 or substring(png from 1 for 8)<>decode('89504e470d0a1a0a','hex')
  or substring(png from 13 for 4)<>decode('49484452','hex') or substring(png from 17 for 8)<>decode('00000140000000f0','hex') then raise exception 'Expected a 320 × 240 PNG under 24 KiB.';end if;
 insert into kme_private.posts(id,profile_id,body,user_id) values(p_submission_id,p_profile_id,'Drawing challenge: '||btrim(p_prompt),auth.uid());
 insert into kme_private.chat_drawings(post_id,prompt,png) values(p_submission_id,btrim(p_prompt),png);
 if p_resisted is true and exists(select 1 from kme_private.device_preferences where user_id=auth.uid() and allow_nicotine)
  and exists(select 1 from public.kme_profiles where id=p_profile_id and tracking_enabled) then
  event_id:=gen_random_uuid();insert into public.kme_activity(id,profile_id,kind,created_by) values(event_id,p_profile_id,'resisted',auth.uid());logged:=true;
 end if;
 insert into kme_private.chat_drawing_receipts(post_id,resisted_event_id,resisted_logged) values(p_submission_id,event_id,logged);
 update kme_private.chat_state set revision=revision+1 where singleton;
 perform kme_private.chat_cleanup();
 return jsonb_build_object('ok',true,'id',p_submission_id,'resisted_logged',logged);
end; $fn$;

-- Do not repeatedly transfer chat history with gameplay/health snapshots.
do $move$ begin if to_regprocedure('kme_private.world_before_chat()') is null then
 alter function public.kme_world() set schema kme_private;
 alter function kme_private.kme_world() rename to world_before_chat;
end if;end; $move$;
create or replace function public.kme_world() returns jsonb language plpgsql security definer set search_path='' as $fn$
begin
 if auth.uid() is null or kme_private.has_access() is distinct from true then raise exception 'Enter the group password first.' using errcode='42501';end if;
 return jsonb_set(kme_private.world_before_chat()-'posts','{main_game,build}',to_jsonb('2.1.0-niko-noooo-dont-do-it'::text))||jsonb_build_object('patch',jsonb_build_object('version','2.1','name','NIKO NOOOO DONT DO IT'),'chat',jsonb_build_object('version',1,'message_limit',10000,'drawing_limit',100,'drawing_days',7,'drawing_bytes',24576));
end; $fn$;

do $move$ begin if to_regprocedure('kme_private.export_before_chat(uuid)') is null then
 alter function public.kme_export_profile(uuid) set schema kme_private;
 alter function kme_private.kme_export_profile(uuid) rename to export_before_chat;
end if;end; $move$;
create or replace function public.kme_export_profile(p_profile_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare base jsonb;drawings jsonb;
begin
 base:=kme_private.export_before_chat(p_profile_id);
 select coalesce(jsonb_agg(jsonb_build_object('post_id',d.post_id,'prompt',d.prompt,'created_at',d.created_at,
  'data_url','data:image/png;base64,'||replace(encode(d.png,'base64'),E'\n',''))),'[]'::jsonb) into drawings
 from kme_private.chat_drawings d join kme_private.posts p on p.id=d.post_id where p.profile_id=p_profile_id and d.created_at>=now()-interval '7 days';
 return kme_private.chat_read_charge(base||jsonb_build_object('drawings',drawings));
end; $fn$;

revoke all on function kme_private.chat_cleanup(),kme_private.chat_read_charge(jsonb),kme_private.world_before_chat(),kme_private.export_before_chat(uuid) from public,anon,authenticated;
revoke all on function public.kme_chat_list(timestamptz,uuid,uuid,bigint),public.kme_chat_image(uuid),public.kme_social(text,uuid,uuid,text),public.kme_chat_drawing(uuid,uuid,text,text,boolean),public.kme_world() from public,anon,authenticated;
grant execute on function public.kme_chat_list(timestamptz,uuid,uuid,bigint),public.kme_chat_image(uuid),public.kme_social(text,uuid,uuid,text),public.kme_chat_drawing(uuid,uuid,text,text,boolean),public.kme_world() to authenticated;
revoke all on function public.kme_export_profile(uuid) from public,anon,authenticated;
grant execute on function public.kme_export_profile(uuid) to authenticated;
select kme_private.chat_cleanup();
notify pgrst,'reload schema';
commit;
