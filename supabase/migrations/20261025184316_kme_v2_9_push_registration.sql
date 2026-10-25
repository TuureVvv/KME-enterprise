begin;
create or replace function public.kme_push_status()returns jsonb language plpgsql security definer set search_path=''as $fn$
begin perform kme_private.guard(null,'push-status',30,60);return jsonb_build_object('ok',true,'public_key',(select public_key from kme_private.push_config where singleton),'devices',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'profile_id',profile_id,'prefs',prefs,'endpoint_hash',encode(extensions.digest(endpoint,'sha256'),'hex'))),'[]')from kme_private.push_subscriptions where user_id=auth.uid()));end;$fn$;
create or replace function public.kme_push_register(p_profile_id uuid,p_subscription jsonb,p_prefs jsonb default '{}'::jsonb)returns jsonb language plpgsql security definer set search_path=''as $fn$
declare v_endpoint text:=p_subscription->>'endpoint';sid uuid;record kme_private.push_subscriptions%rowtype;pref jsonb;
begin perform kme_private.guard(p_profile_id,'push-register',10,60);if p_profile_id is null then raise exception 'Choose your character.';end if;
 sid:=nullif(auth.jwt()->>'session_id','')::uuid;
 if sid is null or not exists(select 1 from auth.sessions where id=sid and user_id=auth.uid()and(not_after is null or not_after>now()))then raise exception 'Your device session expired. Reopen the app and try again.';end if;
 if v_endpoint is null or length(v_endpoint)>2048 or v_endpoint!~'^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com)/[^[:space:]]+$' then raise exception 'Unsupported push provider.';end if;
 if coalesce(p_subscription#>>'{keys,p256dh}','')!~'^[A-Za-z0-9_-]{87}=?$'or coalesce(p_subscription#>>'{keys,auth}','')!~'^[A-Za-z0-9_-]{22}==?$'and coalesce(p_subscription#>>'{keys,auth}','')!~'^[A-Za-z0-9_-]{22}$' then raise exception 'Invalid browser subscription keys.';end if;
 pref:=jsonb_build_object('chat',coalesce((p_prefs->>'chat')::boolean,true),'checkins',coalesce((p_prefs->>'checkins')::boolean,false),'timer',coalesce((p_prefs->>'timer')::boolean,true),'reminder',coalesce((p_prefs->>'reminder')::boolean,false),'time',coalesce(p_prefs->>'time','19:00'));
 if pref->>'time'!~'^([01][0-9]|2[0-3]):[0-5][0-9]$'then raise exception 'Choose a valid reminder time.';end if;
 select * into record from kme_private.push_subscriptions s where s.endpoint=v_endpoint;
 if found and record.user_id<>auth.uid()then raise exception 'This subscription belongs to another device session. Disable notifications and reconnect.';end if;
 if not found and(select count(*)from kme_private.push_subscriptions where user_id=auth.uid())>=3 then raise exception 'This device already has three subscriptions. Disable an old one first.';end if;
 insert into kme_private.push_subscriptions(user_id,session_id,profile_id,endpoint,keys,prefs)values(auth.uid(),sid,p_profile_id,v_endpoint,p_subscription->'keys',pref)on conflict(endpoint)do update set session_id=excluded.session_id,profile_id=excluded.profile_id,keys=excluded.keys,prefs=excluded.prefs,timer_at=case when coalesce((excluded.prefs->>'timer')::boolean,false)then push_subscriptions.timer_at else null end,updated_at=now()returning * into record;
 delete from kme_private.push_queue where subscription_id=record.id and status in('pending','sending')and kind<>'test'and not coalesce((pref->>kind)::boolean,false);
 return jsonb_build_object('ok',true,'id',record.id,'profile_id',record.profile_id,'prefs',pref);
end;$fn$;
revoke all on function public.kme_push_status() from public,anon;
revoke all on function public.kme_push_register(uuid,jsonb,jsonb) from public,anon;
notify pgrst,'reload schema';
commit;

