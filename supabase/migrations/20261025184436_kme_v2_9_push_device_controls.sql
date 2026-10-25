begin;
create or replace function public.kme_push_remove(p_id uuid default null)returns jsonb language plpgsql security definer set search_path=''as $fn$
begin perform kme_private.guard(null,'push-remove',20,60);delete from kme_private.push_subscriptions where user_id=auth.uid()and(p_id is null or id=p_id);return jsonb_build_object('ok',true);end;$fn$;
create or replace function public.kme_push_timer(p_until timestamptz default null)returns jsonb language plpgsql security definer set search_path=''as $fn$
begin perform kme_private.guard(null,'push-timer',20,60);if p_until is not null and(p_until<now()+interval '10 seconds'or p_until>now()+interval '11 minutes')then raise exception 'Choose a three- or five-minute coping timer.';end if;
 update kme_private.push_subscriptions set timer_at=p_until where user_id=auth.uid()and coalesce((prefs->>'timer')::boolean,false);delete from kme_private.push_queue q using kme_private.push_subscriptions s where q.subscription_id=s.id and s.user_id=auth.uid()and q.kind='timer'and q.status in('pending','sending');return jsonb_build_object('ok',true);end;$fn$;
create or replace function public.kme_push_test()returns jsonb language plpgsql security definer set search_path=''as $fn$
begin perform kme_private.guard(null,'push-test',3,300);insert into kme_private.push_queue(subscription_id,source,kind)select id,'test:'||gen_random_uuid(),'test'from kme_private.push_subscriptions where user_id=auth.uid();return jsonb_build_object('ok',true);end;$fn$;
revoke all on function public.kme_push_remove(uuid) from public,anon;
revoke all on function public.kme_push_timer(timestamptz) from public,anon;
revoke all on function public.kme_push_test() from public,anon;
notify pgrst,'reload schema';
commit;

