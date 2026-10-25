begin;
create or replace function public.kme_push_claim(p_token text,p_user_id uuid default null)returns jsonb language plpgsql security definer set search_path=''as $fn$
declare result jsonb;
begin
 if p_token is distinct from(select scheduler_token from kme_private.push_config where singleton)then raise exception 'Invalid dispatcher credential.'using errcode='42501';end if;perform kme_private.push_prepare();
 with available as(select q.id from kme_private.push_queue q join kme_private.push_subscriptions s on s.id=q.subscription_id join kme_private.admitted_devices d on d.user_id=s.user_id join kme_private.settings g on g.singleton and g.password_version=d.password_version join auth.sessions a on a.id=s.session_id and a.user_id=s.user_id
 where(p_user_id is null or s.user_id=p_user_id)and(a.not_after is null or a.not_after>now())and q.due_at<=now()and q.attempts<4 and(q.status='pending'or(q.status='sending'and q.lease_until<now()))and(q.kind='test'or coalesce((s.prefs->>q.kind)::boolean,false))order by q.due_at limit 20 for update of q skip locked),
 claimed as(update kme_private.push_queue q set status='sending',attempts=q.attempts+1,lease_until=now()+interval '90 seconds',lease_token=gen_random_uuid()from available a where q.id=a.id returning q.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'lease_token',q.lease_token,'kind',q.kind,'source',q.source,'subscription_id',s.id,'subscription',jsonb_build_object('endpoint',s.endpoint,'keys',s.keys))),'[]')into result from claimed q join kme_private.push_subscriptions s on s.id=q.subscription_id;return result;
end;$fn$;

revoke all on function public.kme_push_claim(text,uuid)from public,anon,authenticated;grant execute on function public.kme_push_claim(text,uuid)to service_role;
commit;

