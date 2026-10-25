begin;
do $move$ begin if to_regprocedure('kme_private.world_v22()')is null then alter function public.kme_world()set schema kme_private;alter function kme_private.kme_world()rename to world_v22;end if;end;$move$;
create or replace function public.kme_world()returns jsonb language plpgsql security definer set search_path='' as $fn$
declare result jsonb;
begin if auth.uid()is null or kme_private.has_access()is distinct from true then raise exception 'Enter the group password first.'using errcode='42501';end if;result:=kme_private.world_v22();return result||jsonb_build_object('quality',true,'patch',jsonb_build_object('version','2.9','name','quality of nicotine free life update'),'appearances',(select coalesce(jsonb_object_agg(profile_id,items),'{}')from kme_private.appearances));end;$fn$;
do $move$ begin if to_regprocedure('kme_private.export_v22(uuid)')is null then alter function public.kme_export_profile(uuid)set schema kme_private;alter function kme_private.kme_export_profile(uuid)rename to export_v22;end if;end;$move$;
create or replace function public.kme_export_profile(p_profile_id uuid)returns jsonb language plpgsql security definer set search_path='' as $fn$
begin return kme_private.export_v22(p_profile_id)||jsonb_build_object('wardrobe',(select to_jsonb(w)from kme_private.cosmetic_wallet w where profile_id=p_profile_id),'cosmetics',(select coalesce(jsonb_agg(item_id),'[]')from kme_private.cosmetic_owned where profile_id=p_profile_id),'appearance',(select items from kme_private.appearances where profile_id=p_profile_id),'cosmetic_earnings',(select coalesce(jsonb_agg(jsonb_build_object('category',category,'amount',amount,'day',day,'created_at',created_at)),'[]')from kme_private.cosmetic_earnings where profile_id=p_profile_id));end;$fn$;
revoke all on function kme_private.world_v22(),kme_private.export_v22(uuid),kme_private.earn_cosmetic(uuid,uuid,text,text),kme_private.cosmetic_reward_trigger()from public,anon,authenticated;
revoke all on function public.kme_noticeboard(bigint),public.kme_noticeboard_save(uuid,bigint,text,text),public.kme_wardrobe(uuid),public.kme_cosmetic(uuid,text,text),public.kme_updates(bigint),public.kme_chat_send(uuid,uuid,text,uuid),public.kme_world(),public.kme_export_profile(uuid)from public,anon,authenticated;
grant execute on function public.kme_noticeboard(bigint),public.kme_noticeboard_save(uuid,bigint,text,text),public.kme_wardrobe(uuid),public.kme_cosmetic(uuid,text,text),public.kme_updates(bigint),public.kme_chat_send(uuid,uuid,text,uuid),public.kme_world(),public.kme_export_profile(uuid)to authenticated;
notify pgrst,'reload schema';
revoke all on function public.kme_world() from public,anon;
revoke all on function public.kme_export_profile(uuid) from public,anon;
notify pgrst,'reload schema';
commit;

