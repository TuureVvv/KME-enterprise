begin;
create or replace function kme_private.queue_crew_push()returns trigger language plpgsql security definer set search_path=''as $fn$
declare actor uuid;category text;
begin if TG_TABLE_NAME='posts'then actor:=new.user_id;category:='chat';else actor:=new.created_by;category:='checkins';end if;
 insert into kme_private.push_queue(subscription_id,source,kind)
 select s.id,category||':'||floor(extract(epoch from now())/120),category from kme_private.push_subscriptions s
 where s.user_id is distinct from actor and s.created_at<=now()and coalesce((s.prefs->>category)::boolean,false)
 and(select count(*)from kme_private.push_queue q where q.subscription_id=s.id and q.created_at>=date_trunc('day',now()))<20
 on conflict(subscription_id,source)do nothing;return new;
end;$fn$;
create or replace trigger push_chat after insert on kme_private.posts for each row execute function kme_private.queue_crew_push();
create or replace trigger push_checkins after insert on public.kme_activity for each row execute function kme_private.queue_crew_push();

-- Only the Edge service role can obtain server keys or claim/complete deliveries.
revoke all on function kme_private.queue_crew_push() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;

