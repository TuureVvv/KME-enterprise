begin;
alter table kme_private.push_config add column if not exists dispatch_ticket text;
alter table kme_private.push_config add column if not exists dispatch_until timestamptz;
create or replace function public.kme_push_dispatch_admit(p_ticket text)returns boolean language plpgsql security definer set search_path=''as $fn$
declare accepted boolean;
begin
 if p_ticket is null or length(p_ticket)<>64 then return false;end if;
 update kme_private.push_config set dispatch_ticket=null,dispatch_until=null where singleton and dispatch_ticket=p_ticket and dispatch_until>now() returning true into accepted;
 return coalesce(accepted,false);
end;$fn$;
revoke all on function public.kme_push_dispatch_admit(text)from public,anon,authenticated;
grant execute on function public.kme_push_dispatch_admit(text)to service_role;
notify pgrst,'reload schema';
commit;

