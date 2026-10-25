begin;
create or replace function kme_private.earn_cosmetic(p_profile uuid,p_user uuid,p_category text,p_receipt text) returns void language plpgsql security definer set search_path='' as $fn$
declare cap integer;points integer;today date:=(now() at time zone 'Europe/Helsinki')::date;
begin
 if p_user is null or p_user is distinct from auth.uid() or not exists(select 1 from public.kme_profiles where id=p_profile) then return;end if;
 cap:=case p_category when 'art' then 1 when 'game' then 3 when 'resisted' then 1 else 0 end;points:=case p_category when 'art' then 20 when 'game' then 10 when 'resisted' then 5 else 0 end;if cap=0 then return;end if;
 perform pg_advisory_xact_lock(hashtextextended('cosmetic-awards-v29',0));
 perform pg_advisory_xact_lock(hashtextextended('cosmetic-'||p_user||'-'||p_category||'-'||today,0));
 perform pg_advisory_xact_lock(hashtextextended('cosmetic-profile-'||p_profile||'-'||p_category||'-'||today,0));
 if exists(select 1 from kme_private.cosmetic_earnings where receipt=p_receipt) or (select count(*) from kme_private.cosmetic_earnings where user_id=p_user and day=today and category=p_category)>=cap or (select count(*) from kme_private.cosmetic_earnings where profile_id=p_profile and day=today and category=p_category)>=cap then return;end if;
 insert into kme_private.cosmetic_earnings(profile_id,user_id,category,receipt,amount) values(p_profile,p_user,p_category,p_receipt,points);
 insert into kme_private.cosmetic_wallet(profile_id,balance,earned) values(p_profile,20+points,20+points) on conflict(profile_id) do update set balance=cosmetic_wallet.balance+points,earned=cosmetic_wallet.earned+points;
end;$fn$;

revoke all on function kme_private.earn_cosmetic(uuid,uuid,text,text) from public,anon,authenticated;
commit;

