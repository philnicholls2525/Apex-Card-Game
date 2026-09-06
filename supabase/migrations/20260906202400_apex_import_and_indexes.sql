begin;
create index if not exists friendships_blocked_by_idx on public.friendships(blocked_by) where blocked_by is not null;
create index if not exists sbc_definitions_set_idx on public.sbc_definitions(set_id);
create index if not exists sbc_submission_cards_player_idx on public.sbc_submission_cards(player_id) where player_id is not null;

create or replace function public.api_import_local_save(p_user uuid,p_save jsonb,p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_coins bigint:=0; v_limit jsonb; v_cards jsonb; v_inventory jsonb; r record; v_product uuid; v_card uuid; v_count integer; v_lifetime integer; v_hash text;
begin
  perform private.api_assert_user(p_user);
  if exists(select 1 from private.local_save_imports where user_id=p_user) then raise exception using errcode='23505',message='A local save has already been handled for this account'; end if;
  if coalesce((p_save->>'version')::integer,coalesce((p_save->>'saveVersion')::integer,0)) not in (10) then raise exception using errcode='22023',message='This local save version is not supported'; end if;
  select value into v_limit from private.game_settings where setting_key='local_import_limits';
  v_coins:=greatest(0,coalesce((p_save->>'coins')::bigint,0));
  if v_coins>(v_limit->>'maxCoins')::bigint then raise exception using errcode='22023',message='Local save exceeds the safe import limit'; end if;
  v_inventory:=coalesce(p_save->'inventory','{}'::jsonb);
  for r in select key,value::integer quantity from jsonb_each_text(v_inventory) loop
    if r.quantity<0 or r.quantity>(v_limit->>'maxProductQuantity')::integer then raise exception 'Invalid product quantity'; end if;
    select id into v_product from public.products where product_key=r.key;
    if v_product is not null and r.quantity>0 then insert into public.user_inventory(user_id,product_id,quantity) values(p_user,v_product,r.quantity) on conflict(user_id,product_id) do update set quantity=excluded.quantity; end if;
  end loop;
  v_cards:=coalesce(p_save->'cards','{}'::jsonb);
  for r in select key,value from jsonb_each(v_cards) loop
    v_count:=coalesce((r.value->>'count')::integer,0); v_lifetime:=coalesce((r.value->>'lifetime')::integer,v_count);
    if v_count<0 or v_lifetime<v_count or v_count>(v_limit->>'maxCardQuantity')::integer or v_lifetime>(v_limit->>'maxLifetime')::integer then raise exception 'Invalid card quantity'; end if;
    select id into v_card from public.card_definitions where card_code=r.key;
    if v_card is not null and v_count>0 then
      if exists(select 1 from public.card_definitions where id=v_card and unique_per_user) then v_count:=least(v_count,1); v_lifetime:=greatest(v_lifetime,v_count); end if;
      insert into public.user_cards(user_id,card_definition_id,quantity,lifetime_pulled,first_pulled_at,last_pulled_at) values(p_user,v_card,v_count,v_lifetime,now(),now());
      insert into public.card_discoveries(user_id,card_definition_id,discovery_source) values(p_user,v_card,'local_import') on conflict do nothing;
      insert into public.card_ownership_events(user_id,card_definition_id,delta,quantity_after,reason) values(p_user,v_card,v_count,v_count,'local_import');
    end if;
  end loop;
  if v_coins>0 then perform private.api_add_wallet(p_user,v_coins,'local_import',p_key); end if;
  v_hash:=encode(extensions.digest(p_save::text,'sha256'),'hex');
  insert into private.local_save_imports(user_id,source_version,source_hash,imported_summary) values(p_user,10,v_hash,jsonb_build_object('coins',v_coins,'cards',jsonb_object_length(v_cards),'inventory',jsonb_object_length(v_inventory)));
  update public.profiles set local_save_decision='imported',onboarding_completed=true where user_id=p_user;
  return public.api_bootstrap(p_user);
end $$;

revoke all on function public.api_import_local_save(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.api_import_local_save(uuid,jsonb,text) to service_role;
commit;
