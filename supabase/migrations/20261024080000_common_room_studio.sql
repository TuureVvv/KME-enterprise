-- v2.2: time to chat out the nicotine. Preserve v2.1 art and every character.
begin;
create table if not exists kme_private.art_uploads(
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 profile_id uuid not null references public.kme_profiles(id) on delete cascade,
 prompt text not null check(char_length(prompt) between 1 and 180),
 bytes integer not null check(bytes between 33 and 25165824), parts integer not null check(parts between 1 and 512),
 sha256 text not null check(sha256~'^[0-9a-f]{64}$'), preview bytea not null check(octet_length(preview)<=98304),
 resisted boolean not null, created_at timestamptz not null default now()
);
create table if not exists kme_private.art_parts(
 upload_id uuid not null references kme_private.art_uploads(id) on delete cascade,
 part integer not null check(part between 0 and 511), data bytea not null check(octet_length(data) between 1 and 49152),
 primary key(upload_id,part)
);
create table if not exists kme_private.chat_art(
 post_id uuid primary key references kme_private.posts(id) on delete cascade,
 png bytea not null, preview bytea not null, width integer not null,height integer not null,
 created_at timestamptz not null default now()
);
create table if not exists kme_private.daily_note(
 day date primary key, body text not null default '' check(char_length(body)<=12000),
 revision bigint not null default 0, updated_at timestamptz not null default now(),
 profile_id uuid references public.kme_profiles(id) on delete set null
);
alter table kme_private.art_uploads enable row level security;
alter table kme_private.art_parts enable row level security;
alter table kme_private.chat_art enable row level security;
alter table kme_private.daily_note enable row level security;
revoke all on kme_private.art_uploads,kme_private.art_parts,kme_private.chat_art,kme_private.daily_note from public,anon,authenticated;
create index if not exists art_upload_user on kme_private.art_uploads(user_id);
create index if not exists art_upload_profile on kme_private.art_uploads(profile_id);
create index if not exists note_profile on kme_private.daily_note(profile_id);

do $move$ begin if to_regprocedure('kme_private.chat_cleanup_v21()') is null then
 alter function kme_private.chat_cleanup() rename to chat_cleanup_v21;
end if;end;$move$;
create or replace function kme_private.chat_cleanup() returns void language plpgsql set search_path='' as $fn$
declare total bigint;row record;removed boolean:=false;
begin
 perform kme_private.chat_cleanup_v21();
 delete from kme_private.art_uploads where created_at<now()-interval '2 hours';
 delete from kme_private.daily_note where day<(now() at time zone 'Europe/Helsinki')::date-2;
 for row in select post_id,octet_length(png)+octet_length(preview) as bytes,created_at,
  row_number()over(order by created_at desc,post_id desc) as position from kme_private.chat_art order by created_at desc,post_id desc loop
  total:=coalesce(total,0)+row.bytes;
  if row.created_at<now()-interval '7 days' or row.position>100 or total>100663296 then
   delete from kme_private.chat_art where post_id=row.post_id;removed:=true;
  end if;
 end loop;
 if removed then update kme_private.chat_state set revision=revision+1 where singleton;end if;
end;$fn$;

create or replace function public.kme_art_begin(p_profile_id uuid,p_id uuid,p_prompt text,p_bytes integer,p_parts integer,p_sha256 text,p_preview text,p_resisted boolean)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare row kme_private.art_uploads%rowtype;previous kme_private.posts%rowtype;preview bytea;
begin
 perform kme_private.guard(p_profile_id,'art-begin',20,60);
 if p_id is null or p_profile_id is null then raise exception 'Choose a character and drawing receipt.';end if;
 perform pg_advisory_xact_lock(hashtextextended('kme-chat',0));
 select * into previous from kme_private.posts where id=p_id;
 if found then
  if previous.user_id is distinct from auth.uid() or previous.profile_id<>p_profile_id then raise exception 'That receipt belongs to another submission.';end if;
  return jsonb_build_object('ok',true,'published',true,'id',p_id);
 end if;
 perform kme_private.chat_cleanup();
 select * into row from kme_private.art_uploads where id=p_id;
 if found then
  if row.user_id is distinct from auth.uid() or row.profile_id<>p_profile_id or row.sha256 is distinct from p_sha256 then raise exception 'That receipt belongs to another drawing.';end if;
  return jsonb_build_object('ok',true,'parts',coalesce((select jsonb_agg(part) from kme_private.art_parts where upload_id=p_id),'[]'::jsonb));
 end if;
 if p_bytes is null or p_bytes not between 33 and 25165824 or p_parts is null or p_parts<>ceil(p_bytes/49152.0)::integer or p_parts>512
  or p_prompt is null or char_length(btrim(p_prompt)) not between 1 and 180 or p_sha256 is null or p_sha256!~'^[0-9a-f]{64}$'
  or p_preview is null or octet_length(p_preview)>131072 then raise exception 'Invalid drawing transfer.';end if;
 if (select coalesce(sum(bytes),0) from kme_private.art_uploads)+p_bytes>100663296 then
  return jsonb_build_object('ok',false,'retryable',true,'message','The art upload queue is busy. Your full drawing stays on this device; retry shortly.');
 end if;
 preview:=decode(p_preview,'base64');if substring(preview from 1 for 2)<>decode('ffd8','hex') then raise exception 'Expected a raster preview.';end if;
 insert into kme_private.art_uploads(id,user_id,profile_id,prompt,bytes,parts,sha256,preview,resisted)
 values(p_id,auth.uid(),p_profile_id,btrim(p_prompt),p_bytes,p_parts,p_sha256,preview,p_resisted is true);
 return jsonb_build_object('ok',true,'parts','[]'::jsonb);
end;$fn$;
create or replace function public.kme_art_part(p_id uuid,p_part integer,p_data text) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare row kme_private.art_uploads%rowtype;data bytea;old bytea;
begin
 perform kme_private.guard(null,'art-part',1500,60);
 select * into row from kme_private.art_uploads where id=p_id for update;
 if not found or row.user_id is distinct from auth.uid() then raise exception 'Drawing upload not available to this device.';end if;
 if p_part is null or p_part<0 or p_part>=row.parts or p_data is null or octet_length(p_data)>65536 then raise exception 'Invalid drawing piece.';end if;
 data:=decode(p_data,'base64');
 if octet_length(data)<>(case when p_part=row.parts-1 then row.bytes-49152*p_part else 49152 end) then raise exception 'Incomplete drawing piece.';end if;
 select a.data into old from kme_private.art_parts a where upload_id=p_id and part=p_part;
 if found and old<>data then raise exception 'Retry must contain the same drawing piece.';end if;
 insert into kme_private.art_parts(upload_id,part,data) values(p_id,p_part,data) on conflict do nothing;
 return jsonb_build_object('ok',true);
end;$fn$;
create or replace function public.kme_art_finish(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare row kme_private.art_uploads%rowtype;png bytea;w integer;h integer;event uuid;logged boolean:=false;previous kme_private.posts%rowtype;
begin
 perform kme_private.guard(null,'art-finish',30,60);
 perform pg_advisory_xact_lock(hashtextextended('kme-chat',0));
 select * into previous from kme_private.posts where id=p_id;
 if found then
  if previous.user_id is distinct from auth.uid() then raise exception 'That receipt belongs to another device.';end if;
  return jsonb_build_object('ok',true,'id',p_id,'resisted_logged',coalesce((select resisted_logged from kme_private.chat_drawing_receipts where post_id=p_id),false),'duplicate',true);
 end if;
 select * into row from kme_private.art_uploads where id=p_id for update;
 if not found or row.user_id is distinct from auth.uid() then raise exception 'That upload belongs to another device or expired.';end if;
 if (select count(*) from kme_private.art_parts where upload_id=p_id)<>row.parts then raise exception 'Drawing upload is incomplete; retry to resume.';end if;
 select decode(string_agg(encode(data,'hex'),'' order by part),'hex') into png from kme_private.art_parts where upload_id=p_id;
 if octet_length(png)<>row.bytes or encode(extensions.digest(png,'sha256'),'hex')<>row.sha256
  or substring(png from 1 for 8)<>decode('89504e470d0a1a0a','hex') or substring(png from 13 for 4)<>decode('49484452','hex') then raise exception 'Drawing verification failed. The original stays on your device.';end if;
 w:=get_byte(png,16)*16777216+get_byte(png,17)*65536+get_byte(png,18)*256+get_byte(png,19);
 h:=get_byte(png,20)*16777216+get_byte(png,21)*65536+get_byte(png,22)*256+get_byte(png,23);
 if w not between 1 and 4096 or h not between 1 and 4096 or w::bigint*h>4194304 then raise exception 'Invalid canvas dimensions.';end if;
 insert into kme_private.posts(id,profile_id,body,user_id) values(p_id,row.profile_id,'Drawing challenge: '||row.prompt,auth.uid());
 insert into kme_private.chat_art(post_id,png,preview,width,height) values(p_id,png,row.preview,w,h);
 if row.resisted and exists(select 1 from kme_private.device_preferences where user_id=auth.uid() and allow_nicotine)
  and exists(select 1 from public.kme_profiles where id=row.profile_id and tracking_enabled) then
  event:=gen_random_uuid();insert into public.kme_activity(id,profile_id,kind,created_by) values(event,row.profile_id,'resisted',auth.uid());logged:=true;
 end if;
 insert into kme_private.chat_drawing_receipts(post_id,resisted_event_id,resisted_logged) values(p_id,event,logged);
 delete from kme_private.art_uploads where id=p_id;
 update kme_private.chat_state set revision=revision+1 where singleton;
 perform kme_private.chat_cleanup();
 return jsonb_build_object('ok',true,'id',p_id,'resisted_logged',logged);
end;$fn$;
create or replace function public.kme_art_get(p_id uuid,p_part integer default null) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare row kme_private.chat_art%rowtype;result jsonb;
begin
 perform kme_private.guard(null,'art-get',1500,60);
 select a.* into row from kme_private.chat_art a join kme_private.posts p on p.id=a.post_id where a.post_id=p_id and p.deleted_at is null and a.created_at>=now()-interval '7 days';
 if not found then
  if p_part is null then return public.kme_chat_image(p_id);end if;
  return jsonb_build_object('ok',false,'message','This drawing has expired or was removed.','expired',true);
 end if;
 if p_part is null then result:=jsonb_build_object('ok',true,'data_url','data:image/jpeg;base64,'||replace(encode(row.preview,'base64'),E'\n',''),
  'full_art',true,'width',row.width,'height',row.height,'bytes',octet_length(row.png),'parts',ceil(octet_length(row.png)/49152.0)::integer,'expires_at',row.created_at+interval '7 days');
 else
  if p_part<0 or p_part>=ceil(octet_length(row.png)/49152.0)::integer then raise exception 'Invalid drawing piece.';end if;
  result:=jsonb_build_object('ok',true,'data',replace(encode(substring(row.png from p_part*49152+1 for 49152),'base64'),E'\n',''));
 end if;
 return kme_private.chat_read_charge(result);
end;$fn$;

do $move$ begin if to_regprocedure('kme_private.chat_list_v21(timestamptz,uuid,uuid,bigint)') is null then
 alter function public.kme_chat_list(timestamptz,uuid,uuid,bigint) set schema kme_private;
 alter function kme_private.kme_chat_list(timestamptz,uuid,uuid,bigint) rename to chat_list_v21;
end if;end;$move$;
create or replace function public.kme_chat_list(p_before timestamptz default null,p_before_id uuid default null,p_thread uuid default null,p_known_revision bigint default null)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare result jsonb;items jsonb;
begin
 result:=kme_private.chat_list_v21(p_before,p_before_id,p_thread,p_known_revision);
 if result->>'ok'='false' or result->>'unchanged'='true' then return result;end if;
 select coalesce(jsonb_agg(item||case when a.post_id is null then '{}'::jsonb else jsonb_build_object('drawing',true,'drawing_expired',false,'full_art',true,'width',a.width,'height',a.height) end order by item->>'created_at' desc,item->>'id' desc),'[]'::jsonb) into items
 from jsonb_array_elements(result->'items') item left join kme_private.chat_art a on a.post_id=(item->>'id')::uuid;
 return jsonb_set(result,'{items}',items);
end;$fn$;

create or replace function public.kme_daily_note(p_known_revision bigint default null) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare v_day date:=(now() at time zone 'Europe/Helsinki')::date;row kme_private.daily_note%rowtype;result jsonb;
begin
 perform kme_private.guard(null,'daily-note-read',60,60);
 select * into row from kme_private.daily_note n where n.day=v_day;
 result:=jsonb_build_object('ok',true,'day',v_day,'revision',coalesce(row.revision,0),'expires_at',(v_day+1)::timestamp at time zone 'Europe/Helsinki','timezone','Europe/Helsinki','updated_at',row.updated_at,'profile_id',row.profile_id);
 if p_known_revision=coalesce(row.revision,0) then return kme_private.chat_read_charge(result||jsonb_build_object('unchanged',true));end if;
 return kme_private.chat_read_charge(result||jsonb_build_object('body',coalesce(row.body,'')));
end;$fn$;
create or replace function public.kme_daily_note_save(p_profile_id uuid,p_day date,p_revision bigint,p_body text) returns jsonb
language plpgsql security definer set search_path='' as $fn$
declare v_day date:=(now() at time zone 'Europe/Helsinki')::date;row kme_private.daily_note%rowtype;
begin
 perform kme_private.guard(p_profile_id,'daily-note-save',120,60);
 if p_profile_id is null or p_body is null or char_length(p_body)>12000 or p_revision is null then raise exception 'Invalid daily note.';end if;
 if p_day is distinct from v_day then return jsonb_build_object('ok',false,'new_day',true,'message','A new day has started. Your old draft remains on this device.');end if;
 perform pg_advisory_xact_lock(hashtextextended('kme-daily-note',0));
 insert into kme_private.daily_note(day) values(v_day) on conflict do nothing;
 select * into row from kme_private.daily_note n where n.day=v_day for update;
 if row.body=p_body then return jsonb_build_object('ok',true,'revision',row.revision,'day',v_day);end if;
 if row.revision<>p_revision then return jsonb_build_object('ok',false,'conflict',true,'current',to_jsonb(row));end if;
 update kme_private.daily_note n set body=p_body,revision=n.revision+1,updated_at=now(),profile_id=p_profile_id where n.day=v_day returning * into row;
 delete from kme_private.daily_note where daily_note.day<v_day-2;
 return jsonb_build_object('ok',true,'revision',row.revision,'day',v_day,'updated_at',row.updated_at,'profile_id',p_profile_id);
end;$fn$;

-- Keep the protocol at 6; the human-facing patch and feature capabilities change.
do $move$ begin if to_regprocedure('kme_private.world_v21()') is null then
 alter function public.kme_world() set schema kme_private;
 alter function kme_private.kme_world() rename to world_v21;
end if;end;$move$;
create or replace function public.kme_world() returns jsonb language plpgsql security definer set search_path='' as $fn$
declare result jsonb;
begin
 if auth.uid() is null or kme_private.has_access() is distinct from true then raise exception 'Enter the group password first.' using errcode='42501';end if;
 result:=kme_private.world_v21();
 return result||jsonb_build_object('patch',jsonb_build_object('version','2.2','name','time to chat out the nicotine'),
 'chat',(result->'chat')||jsonb_build_object('studio',2,'daily_note',true));
end;$fn$;
do $move$ begin if to_regprocedure('kme_private.export_v21(uuid)') is null then
 alter function public.kme_export_profile(uuid) set schema kme_private;
 alter function kme_private.kme_export_profile(uuid) rename to export_v21;
end if;end;$move$;
create or replace function public.kme_export_profile(p_profile_id uuid) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare result jsonb;art jsonb;
begin
 result:=kme_private.export_v21(p_profile_id);
 select coalesce(jsonb_agg(jsonb_build_object('post_id',a.post_id,'prompt',p.body,'width',a.width,'height',a.height,'bytes',octet_length(a.png),'created_at',a.created_at,'download','Open the drawing in Crew Chat and save its original PNG.')),'[]'::jsonb) into art
 from kme_private.chat_art a join kme_private.posts p on p.id=a.post_id where p.profile_id=p_profile_id and a.created_at>=now()-interval '7 days';
 return result||jsonb_build_object('original_drawing_manifest',art);
end;$fn$;
revoke all on function kme_private.chat_cleanup(),kme_private.chat_cleanup_v21(),kme_private.chat_list_v21(timestamptz,uuid,uuid,bigint),kme_private.world_v21() from public,anon,authenticated;
revoke all on function kme_private.export_v21(uuid) from public,anon,authenticated;
revoke all on function public.kme_export_profile(uuid) from public,anon,authenticated;
grant execute on function public.kme_export_profile(uuid) to authenticated;
revoke all on function public.kme_art_begin(uuid,uuid,text,integer,integer,text,text,boolean),public.kme_art_part(uuid,integer,text),public.kme_art_finish(uuid),public.kme_art_get(uuid,integer),public.kme_daily_note(bigint),public.kme_daily_note_save(uuid,date,bigint,text),public.kme_chat_list(timestamptz,uuid,uuid,bigint),public.kme_world() from public,anon,authenticated;
grant execute on function public.kme_art_begin(uuid,uuid,text,integer,integer,text,text,boolean),public.kme_art_part(uuid,integer,text),public.kme_art_finish(uuid),public.kme_art_get(uuid,integer),public.kme_daily_note(bigint),public.kme_daily_note_save(uuid,date,bigint,text),public.kme_chat_list(timestamptz,uuid,uuid,bigint),public.kme_world() to authenticated;
notify pgrst,'reload schema';
commit;
