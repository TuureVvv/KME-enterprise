begin;
create or replace function kme_private.cosmetic_reward_trigger() returns trigger language plpgsql security definer set search_path='' as $fn$
declare p uuid;u uuid;
begin
 if TG_TABLE_NAME='kme_activity' then
  if new.kind='resisted' and exists(select 1 from public.kme_profiles where id=new.profile_id and tracking_enabled) and exists(select 1 from kme_private.device_preferences where user_id=new.created_by and allow_nicotine) then perform kme_private.earn_cosmetic(new.profile_id,new.created_by,'resisted','report:'||new.id);end if;
 elsif TG_TABLE_NAME='chat_art' then select profile_id,user_id into p,u from kme_private.posts where id=new.post_id;perform kme_private.earn_cosmetic(p,u,'art','art:'||new.post_id);
 elsif TG_TABLE_NAME='relief_scores' then select user_id into u from kme_private.relief_runs where id=new.run_id;if new.seconds>=10 and new.score>0 then perform kme_private.earn_cosmetic(new.profile_id,u,'game','relief:'||new.run_id);end if;
 elsif TG_TABLE_NAME='extraction_runs' then if old.result is null and new.result is not null and not new.cancelled and coalesce((new.result->>'score')::integer,0)>0 and now()-new.started_at>=interval '20 seconds' then perform kme_private.earn_cosmetic(new.profile_id,new.user_id,'game','run:'||new.id);end if;
 end if;return new;
end;$fn$;
create or replace trigger cosmetic_report after insert on public.kme_activity for each row execute function kme_private.cosmetic_reward_trigger();
create or replace trigger cosmetic_art after insert on kme_private.chat_art for each row execute function kme_private.cosmetic_reward_trigger();
create or replace trigger cosmetic_relief after insert on kme_private.relief_scores for each row execute function kme_private.cosmetic_reward_trigger();
create or replace trigger cosmetic_game after update of result on kme_private.extraction_runs for each row execute function kme_private.cosmetic_reward_trigger();
revoke all on function kme_private.earn_cosmetic(uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function kme_private.cosmetic_reward_trigger() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;

