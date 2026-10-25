begin;
create or replace function public.kme_updates(p_known_revision bigint default null) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare rev bigint;items jsonb;
begin perform kme_private.guard(null,'quality-updates',30,60);select revision into rev from kme_private.chat_state where singleton;if p_known_revision=rev then return jsonb_build_object('ok',true,'unchanged',true,'revision',rev);end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'profile_id',p.profile_id,'parent_id',p.parent_id,'parent_root',(select jsonb_build_object('id',r.id,'profile_id',r.profile_id,'body',r.body,'created_at',r.created_at,'can_delete',r.user_id=auth.uid(),'own_device',r.user_id=auth.uid(),'comment_count',(select count(*)from kme_private.posts where parent_id=r.id))from kme_private.posts r where r.id=p.parent_id),'body',p.body,'created_at',p.created_at,'can_delete',p.user_id=auth.uid(),'own_device',p.user_id=auth.uid(),'votes',(select count(*)from kme_private.votes where post_id=p.id),'voted_by_me',exists(select 1 from kme_private.votes where post_id=p.id and user_id=auth.uid()),'comment_count',(select count(*)from kme_private.posts where parent_id=p.id and deleted_at is null),'drawing',exists(select 1 from kme_private.chat_drawings where post_id=p.id) or a.post_id is not null,'full_art',a.post_id is not null,'width',a.width,'height',a.height)order by p.created_at desc,p.id desc),'[]') into items from(select * from kme_private.posts where deleted_at is null order by created_at desc,id desc limit 20)p left join kme_private.chat_art a on a.post_id=p.id;
 return kme_private.chat_read_charge(jsonb_build_object('ok',true,'items',items,'revision',rev));
end;$fn$;
create or replace function public.kme_chat_send(p_profile_id uuid,p_id uuid,p_body text,p_parent_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare old kme_private.posts%rowtype;
begin perform kme_private.guard(p_profile_id,'chat-send-v29',20,60);if p_profile_id is null or p_id is null or p_body is null or char_length(btrim(p_body)) not between 1 and 280 then raise exception 'Write 1–280 characters.';end if;
 perform pg_advisory_xact_lock(hashtextextended('kme-chat',0));select * into old from kme_private.posts where id=p_id;if found then if old.user_id is distinct from auth.uid() or old.profile_id<>p_profile_id then raise exception 'That message belongs to another device.';end if;return jsonb_build_object('ok',true,'id',old.id,'duplicate',true);end if;
 if p_parent_id is not null and not exists(select 1 from kme_private.posts where id=p_parent_id and parent_id is null and deleted_at is null)then raise exception 'That conversation is gone.';end if;
 insert into kme_private.posts(id,profile_id,user_id,body,parent_id)values(p_id,p_profile_id,auth.uid(),btrim(p_body),p_parent_id);update kme_private.chat_state set revision=revision+1 where singleton;perform kme_private.chat_cleanup();return jsonb_build_object('ok',true,'id',p_id);
end;$fn$;
revoke all on function public.kme_updates(bigint) from public,anon;
revoke all on function public.kme_chat_send(uuid,uuid,text,uuid) from public,anon;
notify pgrst,'reload schema';
commit;

