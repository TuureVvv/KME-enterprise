begin;
create or replace function public.kme_push_complete(p_id uuid,p_lease uuid,p_status integer,p_retry_seconds integer default 60)returns void language plpgsql security definer set search_path=''as $fn$
declare q kme_private.push_queue%rowtype;
begin select * into q from kme_private.push_queue where id=p_id and lease_token=p_lease and status='sending'for update;if not found then return;end if;
 if p_status in(404,410)then delete from kme_private.push_subscriptions where id=q.subscription_id;
 elsif p_status between 200 and 299 then update kme_private.push_queue set status='sent',lease_until=null where id=q.id;
 elsif p_status in(0,429)or p_status>=500 then update kme_private.push_queue set status=case when attempts>=4 then'failed'else'pending'end,due_at=now()+make_interval(secs=>greatest(30,least(3600,p_retry_seconds))),lease_until=null where id=q.id;
 else update kme_private.push_queue set status='failed',lease_until=null where id=q.id;end if;
end;$fn$;
revoke all on function kme_private.queue_crew_push(),kme_private.push_prepare()from public,anon,authenticated;
revoke all on function public.kme_push_secrets(),public.kme_push_init_keys(text,text),public.kme_push_claim(text,uuid),public.kme_push_complete(uuid,uuid,integer,integer)from public,anon,authenticated;
grant execute on function public.kme_push_secrets(),public.kme_push_init_keys(text,text),public.kme_push_claim(text,uuid),public.kme_push_complete(uuid,uuid,integer,integer)to service_role;
revoke all on function public.kme_push_status(),public.kme_push_register(uuid,jsonb,jsonb),public.kme_push_remove(uuid),public.kme_push_timer(timestamptz),public.kme_push_test()from public,anon,authenticated;
grant execute on function public.kme_push_status(),public.kme_push_register(uuid,jsonb,jsonb),public.kme_push_remove(uuid),public.kme_push_timer(timestamptz),public.kme_push_test()to authenticated;
grant execute on function public.kme_push_secrets(),public.kme_push_init_keys(text,text),public.kme_push_claim(text,uuid),public.kme_push_complete(uuid,uuid,integer,integer)to service_role;
notify pgrst,'reload schema';
revoke all on function public.kme_push_claim(text,uuid) from public,anon,authenticated;
revoke all on function public.kme_push_complete(uuid,uuid,integer,integer) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;

