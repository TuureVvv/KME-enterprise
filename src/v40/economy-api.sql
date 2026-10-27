create or replace function public.kme_v4_collection(p_profile_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$begin perform kme_private.guard(p_profile_id,'v4-collection',60,60);if p_profile_id is null then raise exception'Choose a character.';end if;return kme_private.v4_collection(p_profile_id);end;$$;
create or replace function public.kme_aura_action(p_profile_id uuid,p_id uuid,p_action text,p_tier integer)returns jsonb language plpgsql security definer set search_path='' as $$begin perform kme_private.guard(p_profile_id,'auras-update',60,60);raise exception'The collection restarted in v4.0. Refresh before changing auras; this old receipt spent nothing.';end;$$;
create or replace function public.kme_auras(p_profile_id uuid)returns jsonb language plpgsql security definer set search_path='' as $$declare v jsonb;begin perform kme_private.guard(p_profile_id,'auras-read-compat',60,60);v:=kme_private.v4_collection(p_profile_id);return v||jsonb_build_object('equipped',(select tier from kme_private.v4_aura_catalog where id=v->>'equipped'),'inventory',(select coalesce(jsonb_agg(jsonb_build_object('tier',tier,'quantity',n)),'[]')from(select a.tier,sum(c.quantity)n from kme_private.v4_aura_copies c join kme_private.v4_aura_catalog a on a.id=c.aura_id where c.profile_id=p_profile_id and c.quantity>0 group by a.tier)t));end;$$;
create or replace function public.kme_equip(p_profile_id uuid,p_tier integer)returns jsonb language plpgsql security definer set search_path='' as $$declare key text;begin perform kme_private.guard(p_profile_id,'equip',30,3600);if p_tier is not null then select c.aura_id into key from kme_private.v4_aura_copies c join kme_private.v4_aura_catalog a on a.id=c.aura_id where c.profile_id=p_profile_id and c.quantity>0 and a.tier=p_tier order by c.aura_id limit 1;if key is null then raise exception'Collect that aura in v4.0 first.';end if;end if;insert into kme_private.v4_identity(profile_id,equipped)values(p_profile_id,key)on conflict(profile_id)do update set equipped=excluded.equipped;update kme_private.extraction_stats set equipped=p_tier where profile_id=p_profile_id;return jsonb_build_object('ok',true);end;$$;

create or replace function kme_private.v4_roll_rewards(p_run uuid,p_caps integer)returns jsonb language plpgsql security definer set search_path='' as $$
declare r kme_private.extraction_runs%rowtype;saved jsonb;loot jsonb:='[]';a kme_private.v4_aura_catalog%rowtype;v_tier integer;n integer;count integer;i integer;
begin
 select result into saved from kme_private.v4_run_rewards where run_id=p_run;if saved is not null then return saved;end if;
 select * into r from kme_private.extraction_runs where id=p_run for update;
 if r.user_id is distinct from auth.uid()then raise exception'That reward belongs to another device.';end if;
 n:=case when not r.cancelled and r.result is not null and coalesce((r.result->>'score')::bigint,0)>0 and now()-r.started_at>=interval'20 seconds'then greatest(0,least(12,coalesce(p_caps,0),floor(extract(epoch from(now()-r.started_at))/8)::integer))else 0 end;
 for i in 1..n loop
  v_tier:=kme_private.v4_rarity(kme_private.v4_uniform(1000000));select count(*)into count from kme_private.v4_aura_catalog where v4_aura_catalog.tier=v_tier and not hidden;
  select * into a from kme_private.v4_aura_catalog where v4_aura_catalog.tier=v_tier and not hidden order by id offset kme_private.v4_uniform(count)limit 1;
  insert into kme_private.v4_aura_copies(profile_id,aura_id,quantity)values(r.profile_id,a.id,1)on conflict(profile_id,aura_id)do update set quantity=v4_aura_copies.quantity+1;
  insert into kme_private.inventory(profile_id,tier,quantity)values(r.profile_id,v_tier,1)on conflict(profile_id,tier)do update set quantity=inventory.quantity+1;
  loot:=loot||jsonb_build_array(jsonb_build_object('id',a.id,'tier',v_tier,'name',a.name));
 end loop;
 update kme_private.extraction_stats set capsules=capsules+n where profile_id=r.profile_id;
 saved:=r.result||jsonb_build_object('loot',loot,'min_tier',0,'rare_pool_weight',1000000,'collection_epoch','collection-4.0','stardust',(select balance from kme_private.cosmetic_wallet where profile_id=r.profile_id));
 insert into kme_private.v4_run_rewards(run_id,profile_id,result)values(r.id,r.profile_id,saved);update kme_private.extraction_runs set result=saved where id=r.id;return saved;
end;$$;
do $$begin
 if to_regprocedure('kme_private.extraction_finish_v35(uuid,integer,integer,integer,boolean)')is null then alter function public.kme_extraction_finish(uuid,integer,integer,integer,boolean)rename to extraction_finish_v35;alter function public.extraction_finish_v35(uuid,integer,integer,integer,boolean)set schema kme_private;end if;
 if to_regprocedure('kme_private.blacksite_finish_v35(uuid,integer,integer,integer,text)')is null then alter function public.kme_blacksite_finish(uuid,integer,integer,integer,text)rename to blacksite_finish_v35;alter function public.blacksite_finish_v35(uuid,integer,integer,integer,text)set schema kme_private;end if;
end;$$;
create or replace function public.kme_extraction_finish(p_run_id uuid,p_score integer,p_greed integer,p_capsules integer,p_extract boolean default true)returns jsonb language plpgsql security definer set search_path='' as $$declare v jsonb;begin
 v:=kme_private.extraction_finish_v35(p_run_id,p_score,p_greed,0,p_extract);
 if coalesce(current_setting('kme.v4_defer_rewards',true),'')='1'or not p_extract then return v;end if;return kme_private.v4_roll_rewards(p_run_id,p_capsules);
end;$$;
create or replace function public.kme_blacksite_finish(p_run_id uuid,p_score integer,p_wave integer,p_capsules integer,p_outcome text)returns jsonb language plpgsql security definer set search_path='' as $$declare v jsonb;oldflag text;begin
 oldflag:=coalesce(current_setting('kme.v4_defer_rewards',true),'');perform set_config('kme.v4_defer_rewards','1',true);v:=kme_private.blacksite_finish_v35(p_run_id,p_score,p_wave,0,p_outcome);perform set_config('kme.v4_defer_rewards',oldflag,true);
 return kme_private.v4_roll_rewards(p_run_id,case when p_outcome='extracted'then p_capsules else floor(p_capsules*.2)::integer end);
end;$$;

create or replace function public.kme_v4_action(p_profile_id uuid,p_id uuid,p_action text,p_target text default null,p_operation text default null,p_confirm boolean default false,p_epoch text default'collection-4.0')returns jsonb language plpgsql security definer set search_path='' as $$
<<v4action>>
declare old kme_private.v4_receipts%rowtype;a kme_private.v4_aura_catalog%rowtype;n integer;balance integer;cost integer:=0;damage integer:=0;v jsonb;today date:=(now()at time zone'Europe/Helsinki')::date;w date:=date_trunc('week',now()at time zone'Europe/Helsinki')::date;v_theme integer;won text;camp kme_private.campaigns%rowtype;used integer;active boolean;
begin
 perform kme_private.guard(p_profile_id,'v4-action',100,60);
 if p_profile_id is null or p_id is null or p_epoch is distinct from'collection-4.0'or p_action is null or p_action not in('equip','craft','distill','rank','donate','secret')then raise exception'Refresh to the v4.0 collection before changing it.';end if;
 perform pg_advisory_xact_lock(hashtextextended('kme-campaign-v3',0));perform pg_advisory_xact_lock(hashtextextended('nightfall-awards-v35',0));perform pg_advisory_xact_lock(hashtextextended('v4-action-'||p_profile_id,0));
 select * into old from kme_private.v4_receipts where id=p_id;if found then if old.profile_id<>p_profile_id or old.user_id<>auth.uid()or old.action<>p_action or old.target is distinct from p_target or old.operation is distinct from p_operation then raise exception'That receipt is bound to another action.';end if;return old.result;end if;
 insert into kme_private.cosmetic_wallet(profile_id)values(p_profile_id)on conflict do nothing;select w.balance into balance from kme_private.cosmetic_wallet w where profile_id=p_profile_id for update;
 if p_action in('equip','craft','distill')then
  if p_target is not null then select * into a from kme_private.v4_aura_catalog where id=p_target;if not found then raise exception'Unknown aura.';end if;select quantity into n from kme_private.v4_aura_copies where profile_id=p_profile_id and aura_id=p_target for update;n:=coalesce(n,0);end if;
  if p_action='equip'then if p_target is not null and n<1 then raise exception'Collect this aura before equipping it.';end if;insert into kme_private.v4_identity(profile_id,equipped)values(p_profile_id,p_target)on conflict(profile_id)do update set equipped=excluded.equipped;update kme_private.extraction_stats set equipped=a.tier where profile_id=p_profile_id;
  elsif p_action='craft'then if p_target is null or a.hidden then raise exception'This signature is discovered, never crafted.';end if;if n>0 then raise exception'You already own this aura.';end if;if balance<a.cost then raise exception'Not enough stardust.';end if;cost:=a.cost;insert into kme_private.v4_aura_copies(profile_id,aura_id,quantity)values(p_profile_id,a.id,1)on conflict(profile_id,aura_id)do update set quantity=1;insert into kme_private.inventory(profile_id,tier,quantity)values(p_profile_id,a.tier,1)on conflict(profile_id,tier)do update set quantity=inventory.quantity+1;
  else if p_target is null or a.hidden then raise exception'Signature auras cannot be distilled.';end if;if n<2 then raise exception'Your last copy is protected.';end if;if n in(3,6,10,15)and not p_confirm then return jsonb_build_object('ok',false,'resonance_confirmation',true,'message','This removes a resonance level. Confirm to distill this copy.');end if;update kme_private.v4_aura_copies set quantity=quantity-1 where profile_id=p_profile_id and aura_id=a.id;update kme_private.inventory set quantity=greatest(0,quantity-1)where profile_id=p_profile_id and tier=a.tier;cost:=-a.distill;
  end if;
 elsif p_action='rank'then insert into kme_private.v4_identity(profile_id,rank_visible)values(p_profile_id,p_target='show')on conflict(profile_id)do update set rank_visible=excluded.rank_visible;
 elsif p_action='secret'then
  v_theme:=kme_private.v4_theme(w);if p_operation is distinct from w::text or p_target is distinct from v_theme::text then raise exception'This clue has moved. Find its current appearance.';end if;
  active:=extract(hour from now()at time zone'Europe/Helsinki')between 14 and 21 and extract(isodow from today)::integer in(2,4,6,7);
  if not active or not exists(select 1 from kme_private.cosmetic_earnings where profile_id=p_profile_id and day=today and category in('game','art'))then raise exception'The clue is dormant. Meaningful game or art activity and an active window are required.';end if;
  if exists(select 1 from kme_private.v4_hidden_attempts where day=today and(profile_id=p_profile_id or user_id=auth.uid()))then raise exception'This character or device already inspected a clue today.';end if;
  if kme_private.v4_uniform(128)=0 then select id into won from kme_private.v4_aura_catalog where hidden and v4_aura_catalog.theme=v_theme;insert into kme_private.v4_aura_copies(profile_id,aura_id,quantity)values(p_profile_id,won,1)on conflict(profile_id,aura_id)do update set quantity=v4_aura_copies.quantity+1;end if;
  insert into kme_private.v4_hidden_attempts(day,profile_id,user_id,theme,won)values(today,p_profile_id,auth.uid(),v_theme,won);
 elsif p_action='donate'then
  if p_target='singularity'then
   if p_operation is distinct from w::text then raise exception'The displayed operation ended. No stardust was spent.';end if;
   select greatest(coalesce((select sum(d.damage)from kme_private.v4_donations d where d.profile_id=p_profile_id and d.day=today and d.target=p_target),0),coalesce((select sum(d.damage)from kme_private.v4_donations d where d.user_id=auth.uid()and d.day=today and d.target=p_target),0))into used;if used>=10 then raise exception'Daily donation allowance reached.';end if;
   if balance<10 then raise exception'Not enough stardust.';end if;damage:=kme_private.nightfall_award(p_profile_id,auth.uid(),'donation','donation:'||p_id);if damage<1 then raise exception'Join an active faction with damage allowance before donating.';end if;cost:=10;
  elsif p_target='crew'then
   select * into camp from kme_private.campaigns where id::text=p_operation for update;if not found or camp.status not in('wearing','sealed')then raise exception'This boss is not accepting damage. Finale time cannot be purchased.';end if;
   select greatest(coalesce((select sum(d.damage)from kme_private.v4_donations d where d.profile_id=p_profile_id and d.day=today and d.target=p_target),0),coalesce((select sum(d.damage)from kme_private.v4_donations d where d.user_id=auth.uid()and d.day=today and d.target=p_target),0))into used;if used>=15 then raise exception'Daily boss donation allowance reached.';end if;
   if balance<20 then raise exception'Not enough stardust.';end if;damage:=least(3,camp.max_hp-camp.damage);if damage<=0 then raise exception'This boss is already ready for its finale.';end if;cost:=20;update kme_private.campaigns set damage=least(max_hp,campaigns.damage+v4action.damage)where id=camp.id;update kme_private.campaigns set status=case when now()<unlocks_at then'sealed'else'finale'end where id=camp.id and campaigns.damage>=max_hp;
  else raise exception'Choose a contribution destination.';end if;
 end if;
 if cost<>0 then update kme_private.cosmetic_wallet set balance=cosmetic_wallet.balance-cost where profile_id=p_profile_id;end if;
 v:=kme_private.v4_collection(p_profile_id)||jsonb_build_object('receipt',p_id,'action',p_action,'damage',damage,'won',won);
 insert into kme_private.v4_receipts(id,profile_id,user_id,action,target,operation,result)values(p_id,p_profile_id,auth.uid(),p_action,p_target,p_operation,v);
 if p_action='donate'then insert into kme_private.v4_donations(id,profile_id,user_id,day,target,damage,cost)values(p_id,p_profile_id,auth.uid(),today,p_target,damage,cost);end if;
 return v;
end;$$;
