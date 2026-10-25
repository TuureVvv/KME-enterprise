begin;


revoke all on net.http_request_queue,net._http_response from public,anon,authenticated;
create or replace function kme_private.push_tick()returns void language plpgsql security definer set search_path=''as $fn$
declare ticket text;
begin
 if not exists(select 1 from kme_private.push_subscriptions)then return;end if;
 perform kme_private.push_prepare();
 if exists(select 1 from kme_private.push_queue where attempts<4 and due_at<=now()and(status='pending'or(status='sending'and lease_until<now())))then
  ticket:=encode(extensions.gen_random_bytes(32),'hex');
  update kme_private.push_config set dispatch_ticket=ticket,dispatch_until=now()+interval '90 seconds' where singleton;
  perform net.http_post(url:='https://amuvikkddeeckhtimhht.supabase.co/functions/v1/kme-push',headers:=jsonb_build_object('Content-Type','application/json','x-kme-dispatch',ticket),body:='{}'::jsonb,timeout_milliseconds:=60000);
 end if;
 delete from cron.job_run_details where jobid=(select jobid from cron.job where jobname='kme-push-dispatch')and start_time<now()-interval '3 days';
end;$fn$;
revoke all on function kme_private.push_tick()from public,anon,authenticated;
select cron.schedule('kme-push-dispatch','* * * * *','select kme_private.push_tick()');
commit;
