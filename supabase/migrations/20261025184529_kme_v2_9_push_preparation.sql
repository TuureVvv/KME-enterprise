begin;
create or replace function public.kme_push_secrets()returns jsonb language sql security definer set search_path=''as $fn$select to_jsonb(c)from kme_private.push_config c where singleton;$fn$;
create or replace function public.kme_push_init_keys(p_public text,p_private text)returns jsonb language plpgsql security definer set search_path=''as $fn$
begin if p_public is null or p_private is null or p_public!~'^[A-Za-z0-9_-]{87}$'or p_private!~'^[A-Za-z0-9_-]{43}$'then raise exception 'Invalid VAPID keys.';end if;update kme_private.push_config set public_key=p_public,private_key=p_private where singleton and public_key is null;return public.kme_push_secrets();end;$fn$;
create or replace function kme_private.push_prepare()returns void language plpgsql security definer set search_path=''as $fn$
declare v_sub record;localnow timestamp:=now()at time zone'Europe/Helsinki';
begin
 delete from kme_private.push_queue where created_at<now()-interval '3 days';
 delete from kme_private.push_subscriptions s where not exists(select 1 from auth.sessions a where a.id=s.session_id and a.user_id=s.user_id and(a.not_after is null or a.not_after>now()))or not exists(select 1 from kme_private.admitted_devices d join kme_private.settings g on g.singleton and g.password_version=d.password_version where d.user_id=s.user_id);
 for v_sub in select * from kme_private.push_subscriptions loop
  if coalesce((v_sub.prefs->>'reminder')::boolean,false)and v_sub.last_reminder is distinct from localnow::date and localnow::time>=(v_sub.prefs->>'time')::time and localnow::time<(v_sub.prefs->>'time')::time+interval '2 hours'then
   insert into kme_private.push_queue(subscription_id,source,kind)values(v_sub.id,'reminder:'||localnow::date,'reminder')on conflict do nothing;update kme_private.push_subscriptions set last_reminder=localnow::date where id=v_sub.id;
  end if;
  if v_sub.timer_at is not null and v_sub.timer_at<=now()and coalesce((v_sub.prefs->>'timer')::boolean,false)then insert into kme_private.push_queue(subscription_id,source,kind)values(v_sub.id,'timer:'||v_sub.timer_at::text,'timer')on conflict do nothing;update kme_private.push_subscriptions set timer_at=null where id=v_sub.id;end if;
 end loop;
end;$fn$;
revoke all on function public.kme_push_secrets() from public,anon,authenticated;
revoke all on function public.kme_push_init_keys(text,text) from public,anon,authenticated;
revoke all on function kme_private.push_prepare() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;

