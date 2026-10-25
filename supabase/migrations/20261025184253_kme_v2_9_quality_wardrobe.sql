begin;
create or replace function public.kme_wardrobe(p_profile_id uuid) returns jsonb language plpgsql security definer set search_path='' as $fn$
begin perform kme_private.guard(p_profile_id,'wardrobe-read',40,60);if p_profile_id is null then raise exception 'Choose a character.';end if;insert into kme_private.cosmetic_wallet(profile_id) values(p_profile_id) on conflict do nothing;
 return jsonb_build_object('ok',true,'catalog',(select jsonb_agg(c order by c.sort) from kme_private.cosmetic_catalog c),'wallet',(select to_jsonb(w) from kme_private.cosmetic_wallet w where profile_id=p_profile_id),'owned',(select coalesce(jsonb_agg(item_id),'[]') from kme_private.cosmetic_owned where profile_id=p_profile_id),'appearance',coalesce((select items from kme_private.appearances where profile_id=p_profile_id),'{}'::jsonb),'today',(select coalesce(jsonb_object_agg(category,n),'{}') from(select category,count(*) n from kme_private.cosmetic_earnings where profile_id=p_profile_id and day=(now() at time zone 'Europe/Helsinki')::date group by category)t));
end;$fn$;
create or replace function public.kme_cosmetic(p_profile_id uuid,p_action text,p_item_id text) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare item kme_private.cosmetic_catalog%rowtype;balance integer;
begin perform kme_private.guard(p_profile_id,'cosmetic-write',30,60);if p_profile_id is null then raise exception 'Choose a character.';end if;select * into item from kme_private.cosmetic_catalog where id=p_item_id;if not found then raise exception 'Unknown cosmetic.';end if;
 insert into kme_private.cosmetic_wallet(profile_id)values(p_profile_id)on conflict do nothing;select w.balance into balance from kme_private.cosmetic_wallet w where profile_id=p_profile_id for update;
 if p_action='unlock' then
  if item.cost>0 and not exists(select 1 from kme_private.cosmetic_owned where profile_id=p_profile_id and item_id=item.id) then
   if balance<item.cost then return jsonb_build_object('ok',false,'message','Earn a little more confetti first.');end if;
   update kme_private.cosmetic_wallet set balance=cosmetic_wallet.balance-item.cost where profile_id=p_profile_id;insert into kme_private.cosmetic_owned(profile_id,item_id)values(p_profile_id,item.id)on conflict do nothing;
  end if;
 elsif p_action<>'equip' then raise exception 'Unknown wardrobe action.';end if;
 if item.cost>0 and not exists(select 1 from kme_private.cosmetic_owned where profile_id=p_profile_id and item_id=item.id) then raise exception 'Unlock that cosmetic first.';end if;
 insert into kme_private.appearances(profile_id,items,revision)values(p_profile_id,jsonb_build_object(item.slot,item.id),1)on conflict(profile_id)do update set items=appearances.items||excluded.items,revision=appearances.revision+1;
 return jsonb_build_object('ok',true,'appearance',(select items from kme_private.appearances where profile_id=p_profile_id),'balance',(select w.balance from kme_private.cosmetic_wallet w where profile_id=p_profile_id));
end;$fn$;
revoke all on function public.kme_wardrobe(uuid) from public,anon;
revoke all on function public.kme_cosmetic(uuid,text,text) from public,anon;
notify pgrst,'reload schema';
commit;

