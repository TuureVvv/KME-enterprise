begin;
create or replace function public.kme_noticeboard(p_known_revision bigint default null) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare r kme_private.noticeboard%rowtype;
begin perform kme_private.guard(null,'notice-read',60,60);select * into r from kme_private.noticeboard where singleton;if p_known_revision=r.revision then return jsonb_build_object('ok',true,'unchanged',true,'revision',r.revision,'updated_at',r.updated_at,'permanent',true);end if;return jsonb_build_object('ok',true,'title',r.title,'body',r.body,'revision',r.revision,'updated_at',r.updated_at,'profile_id',r.profile_id,'permanent',true);end;$fn$;
create or replace function public.kme_noticeboard_save(p_profile_id uuid,p_revision bigint,p_title text,p_body text) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare r kme_private.noticeboard%rowtype;
begin perform kme_private.guard(p_profile_id,'notice-save',120,60);if p_profile_id is null or p_revision is null or p_title is null or char_length(btrim(p_title)) not between 1 and 100 or p_body is null or char_length(p_body)>12000 then raise exception 'Write a title (1–100 characters) and a note of at most 12,000 characters.';end if;
 select * into r from kme_private.noticeboard where singleton for update;
 if r.title=btrim(p_title) and r.body=p_body then return to_jsonb(r)||jsonb_build_object('ok',true);end if;
 if r.revision<>p_revision then return jsonb_build_object('ok',false,'conflict',true,'current',to_jsonb(r));end if;
 update kme_private.noticeboard set title=btrim(p_title),body=p_body,revision=revision+1,updated_at=now(),profile_id=p_profile_id where singleton returning * into r;return to_jsonb(r)||jsonb_build_object('ok',true);
end;$fn$;

-- Older open clients keep writing the same shared text during the upgrade.
create or replace function public.kme_daily_note(p_known_revision bigint default null)returns jsonb language plpgsql security definer set search_path=''as $fn$
declare r kme_private.noticeboard%rowtype;
begin perform kme_private.guard(null,'daily-note-read',60,60);select * into r from kme_private.noticeboard where singleton;return jsonb_build_object('ok',true,'day',(now()at time zone'Europe/Helsinki')::date,'body',r.body,'revision',r.revision,'unchanged',p_known_revision=r.revision,'timezone','Europe/Helsinki','updated_at',r.updated_at);end;$fn$;
create or replace function public.kme_daily_note_save(p_profile_id uuid,p_day date,p_revision bigint,p_body text)returns jsonb language plpgsql security definer set search_path=''as $fn$
declare result jsonb;
begin
 if p_day is distinct from(now()at time zone'Europe/Helsinki')::date then perform kme_private.guard(p_profile_id,'daily-note-save',120,60);return jsonb_build_object('ok',false,'new_day',true,'message','Reload the shared noticeboard. Your draft is safe.');end if;
 result:=public.kme_noticeboard_save(p_profile_id,p_revision,(select title from kme_private.noticeboard where singleton),p_body);return result||jsonb_build_object('day',p_day);
end;$fn$;
revoke all on function public.kme_noticeboard(bigint) from public,anon;
revoke all on function public.kme_noticeboard_save(uuid,bigint,text,text) from public,anon;
revoke all on function public.kme_daily_note(bigint) from public,anon;
revoke all on function public.kme_daily_note_save(uuid,date,bigint,text) from public,anon;
notify pgrst,'reload schema';
commit;

