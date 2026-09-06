begin;

-- These RPCs are intentionally callable only by the Edge Function's service key.
-- The authenticated browser never receives write grants to gameplay tables.
create or replace function private.api_assert_user(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or not exists (select 1 from public.profiles where user_id = p_user) then
    raise exception using errcode = '28000', message = 'Account not found';
  end if;
end $$;

create or replace function private.api_add_wallet(p_user uuid, p_delta bigint, p_reason text, p_key text, p_entity uuid default null)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_balance bigint;
begin
  update public.wallets set coin_balance = coin_balance + p_delta
    where user_id=p_user and coin_balance + p_delta >= 0 returning coin_balance into v_balance;
  if v_balance is null then raise exception using errcode='23514', message='Insufficient coins'; end if;
  insert into public.wallet_transactions(user_id,delta,balance_after,reason,idempotency_key,related_entity_id)
    values(p_user,p_delta,v_balance,p_reason,p_key,p_entity);
  update public.career_progress set
    coins_earned=coins_earned + greatest(p_delta,0), coins_spent=coins_spent + greatest(-p_delta,0)
    where user_id=p_user;
  return v_balance;
end $$;

create or replace function private.api_add_card(p_user uuid, p_card uuid, p_source text, p_entity uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_qty integer; v_unique boolean; v_code text;
begin
  select unique_per_user,card_code into v_unique,v_code from public.card_definitions where id=p_card and active;
  if v_code is null then raise exception using errcode='23503',message='Card unavailable'; end if;
  if v_unique and exists(select 1 from public.user_cards where user_id=p_user and card_definition_id=p_card and quantity>0) then
    raise exception using errcode='23505',message='Only One already owned';
  end if;
  insert into public.user_cards(user_id,card_definition_id,quantity,lifetime_pulled,first_pulled_at,last_pulled_at)
    values(p_user,p_card,1,1,now(),now())
    on conflict(user_id,card_definition_id) do update set quantity=public.user_cards.quantity+1,
      lifetime_pulled=public.user_cards.lifetime_pulled+1,last_pulled_at=now()
    returning quantity into v_qty;
  insert into public.card_discoveries(user_id,card_definition_id,discovery_source) values(p_user,p_card,p_source) on conflict do nothing;
  insert into public.card_ownership_events(user_id,card_definition_id,delta,quantity_after,reason,related_entity_id)
    values(p_user,p_card,1,v_qty,p_source,p_entity);
end $$;

create or replace function private.api_grant_reward(p_user uuid, p_reward jsonb, p_reason text, p_key text)
returns void language plpgsql security definer set search_path = '' as $$
declare k text; q integer; p_id uuid; c_id uuid;
begin
  if coalesce((p_reward->>'coins')::bigint,0) > 0 then
    perform private.api_add_wallet(p_user,(p_reward->>'coins')::bigint,p_reason,p_key);
  end if;
  if coalesce((p_reward->>'xp')::bigint,0) > 0 then
    update public.career_progress set xp=xp+(p_reward->>'xp')::bigint where user_id=p_user;
  end if;
  for k,q in select key,value::integer from jsonb_each_text(coalesce(p_reward->'packs','{}'::jsonb)) loop
    select id into p_id from public.products where product_key=k and active;
    if p_id is not null and q>0 then
      insert into public.user_inventory(user_id,product_id,quantity) values(p_user,p_id,q)
      on conflict(user_id,product_id) do update set quantity=public.user_inventory.quantity+excluded.quantity;
    end if;
  end loop;
  if p_reward ? 'card' then
    select id into c_id from public.card_definitions where card_code=p_reward->>'card';
    if c_id is not null then perform private.api_add_card(p_user,c_id,p_reason,null); end if;
  end if;
end $$;

create or replace function private.api_pack_cards(p_user uuid, p_product uuid, p_version integer, p_pack_count integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_cards uuid[]; v_base uuid[]; v_colour uuid[]; v_hits uuid[]; v_only uuid[]; v_pack jsonb;
  v_packs jsonb:='[]'::jsonb; i integer; j integer; v_id uuid; v_kind text;
begin
  select array_agg(id) filter(where card_type='base'),
         array_agg(id) filter(where card_type in ('green','blue','apex','red')),
         array_agg(id) filter(where card_type in ('elevation','afterimage','frameless','road','stage','neon','ice')),
         array_agg(id) filter(where card_type='onlyone')
  into v_base,v_colour,v_hits,v_only from public.card_definitions where active and card_type <> 'reward';
  if v_base is null then raise exception 'No pack cards configured'; end if;
  for i in 1..p_pack_count loop
    v_cards:=array[]::uuid[];
    for j in 1..3 loop
      if j=1 then v_id:=v_base[1+floor(random()*array_length(v_base,1))::integer];
      elsif j=2 then v_id:=v_colour[1+floor(random()*array_length(v_colour,1))::integer];
      else
        if random()<0.0025 and exists(select 1 from unnest(v_only) x where not exists(select 1 from public.user_cards u where u.user_id=p_user and u.card_definition_id=x and u.quantity>0)) then
          select x into v_id from unnest(v_only) x where not exists(select 1 from public.user_cards u where u.user_id=p_user and u.card_definition_id=x and u.quantity>0) order by random() limit 1;
        elsif random()<0.10 then v_id:=v_hits[1+floor(random()*array_length(v_hits,1))::integer];
        else v_id:=v_base[1+floor(random()*array_length(v_base,1))::integer]; end if;
      end if;
      v_cards:=array_append(v_cards,v_id);
    end loop;
    v_pack:=jsonb_build_object('cards',to_jsonb(v_cards),'source','server-sealed','packNumber',i);
    v_packs:=v_packs || jsonb_build_array(v_pack);
  end loop;
  return jsonb_build_object('version',p_version,'packs',v_packs);
end $$;

create or replace function public.api_bootstrap(p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.api_assert_user(p_user);
  return jsonb_build_object(
    'profile',(select to_jsonb(p) from public.profiles p where user_id=p_user),
    'wallet',(select to_jsonb(w) from public.wallets w where user_id=p_user),
    'career',(select to_jsonb(c) from public.career_progress c where user_id=p_user),
    'inventory',coalesce((select jsonb_agg(jsonb_build_object('product',pr.product_key,'quantity',i.quantity)) from public.user_inventory i join public.products pr on pr.id=i.product_id where i.user_id=p_user),'[]'::jsonb),
    'cards',coalesce((select jsonb_agg(jsonb_build_object('id',d.card_code,'quantity',u.quantity,'lifetime',u.lifetime_pulled,'gallery',exists(select 1 from public.gallery_cards g where g.user_id=p_user and g.card_definition_id=u.card_definition_id))) from public.user_cards u join public.card_definitions d on d.id=u.card_definition_id where u.user_id=p_user and u.quantity>0),'[]'::jsonb),
    'activeOpening',(select jsonb_build_object('id',o.id,'productKey',o.product_key_snapshot,'packCount',o.pack_count,'currentPack',o.current_pack_index,'currentReveal',o.current_reveal_index,'revealed',coalesce((select jsonb_agg(jsonb_build_object('packIndex',r.pack_index,'revealIndex',r.reveal_index,'cardCode',d.card_code,'source',r.source) order by r.pack_index,r.reveal_index) from public.opening_reveals r join public.card_definitions d on d.id=r.card_definition_id where r.opening_id=o.id),'[]'::jsonb)) from public.openings o where o.user_id=p_user and o.state='active')
  );
end $$;

create or replace function public.api_onboard(p_user uuid, p_display text, p_username text, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_started boolean; v_state jsonb;
begin
  perform private.api_assert_user(p_user);
  select not onboarding_completed into v_started from public.profiles where user_id=p_user for update;
  update public.profiles set display_name=nullif(trim(p_display),''),username=nullif(trim(p_username),'') where user_id=p_user;
  if v_started then
    select value into v_state from private.game_settings where setting_key='beta_start_state';
    perform private.api_add_wallet(p_user,coalesce((v_state->>'coins')::bigint,0),'beta_onboarding',p_key);
    perform private.api_grant_reward(p_user,jsonb_build_object('packs',coalesce(v_state->'inventory','{}'::jsonb)),'beta_onboarding',p_key||':inventory');
    update public.profiles set onboarding_completed=true where user_id=p_user;
  end if;
  return public.api_bootstrap(p_user);
end $$;

create or replace function public.api_purchase(p_user uuid, p_product_key text, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_product public.products%rowtype; v_seen jsonb;
begin
  select response into v_seen from private.idempotency_keys where user_id=p_user and idempotency_key=p_key;
  if v_seen is not null then return v_seen; end if;
  select * into v_product from public.products where product_key=p_product_key and active and price is not null for update;
  if v_product.id is null then raise exception using errcode='22023',message='Product cannot be purchased'; end if;
  perform private.api_add_wallet(p_user,-v_product.price,'purchase:'||p_product_key,p_key);
  insert into public.user_inventory(user_id,product_id,quantity) values(p_user,v_product.id,1)
    on conflict(user_id,product_id) do update set quantity=public.user_inventory.quantity+1;
  v_seen:=jsonb_build_object('ok',true,'product',p_product_key,'coins',(select coin_balance from public.wallets where user_id=p_user));
  insert into private.idempotency_keys values(p_user,p_key,'purchase',v_seen);
  return v_seen;
end $$;

create or replace function public.api_open_start(p_user uuid, p_product_key text, p_quantity integer, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_product public.products%rowtype; v_open uuid; v_result jsonb; v_count integer;
begin
  if p_quantity < 1 or p_quantity > 20 then raise exception using errcode='22023',message='Invalid opening quantity'; end if;
  if exists(select 1 from public.openings where user_id=p_user and state='active') then
    return public.api_bootstrap(p_user)->'activeOpening';
  end if;
  select * into v_product from public.products where product_key=p_product_key and active for update;
  if v_product.id is null then raise exception using errcode='22023',message='Unknown product'; end if;
  update public.user_inventory set quantity=quantity-p_quantity where user_id=p_user and product_id=v_product.id and quantity>=p_quantity;
  if not found then raise exception using errcode='23514',message='Not enough sealed inventory'; end if;
  v_count:=v_product.pack_count*p_quantity;
  v_result:=private.api_pack_cards(p_user,v_product.id,v_product.active_collation_version,v_count);
  insert into public.openings(user_id,product_id,product_key_snapshot,product_name_snapshot,product_quantity,pack_count,result_json,collation_version)
    values(p_user,v_product.id,v_product.product_key,v_product.name,p_quantity,v_count,v_result,v_product.active_collation_version) returning id into v_open;
  insert into private.idempotency_keys values(p_user,p_key,'open_start',jsonb_build_object('openingId',v_open)) on conflict do nothing;
  return jsonb_build_object('id',v_open,'productKey',v_product.product_key,'packCount',v_count,'currentPack',0,'currentReveal',0,'revealed','[]'::jsonb);
end $$;

create or replace function public.api_open_reveal(p_user uuid, p_opening uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_open public.openings%rowtype; v_card uuid; v_code text; v_done boolean:=false; v_response jsonb;
begin
  select * into v_open from public.openings where id=p_opening and user_id=p_user for update;
  if v_open.id is null then raise exception using errcode='22023',message='Opening not found'; end if;
  if v_open.state='completed' then return jsonb_build_object('completed',true); end if;
  select (v_open.result_json->'packs'->v_open.current_pack_index->'cards'->>v_open.current_reveal_index)::uuid into v_card;
  perform private.api_add_card(p_user,v_card,'opening',v_open.id);
  select card_code into v_code from public.card_definitions where id=v_card;
  insert into public.opening_reveals(opening_id,user_id,pack_index,reveal_index,card_definition_id,source)
    values(v_open.id,p_user,v_open.current_pack_index,v_open.current_reveal_index,v_card,v_open.product_name_snapshot)
    on conflict(opening_id,pack_index,reveal_index) do nothing;
  if v_open.current_reveal_index=2 and v_open.current_pack_index=v_open.pack_count-1 then
    update public.openings set state='completed',completed_at=now() where id=v_open.id; v_done:=true;
  elsif v_open.current_reveal_index=2 then update public.openings set current_pack_index=current_pack_index+1,current_reveal_index=0 where id=v_open.id;
  else update public.openings set current_reveal_index=current_reveal_index+1 where id=v_open.id; end if;
  update public.career_progress set cards_pulled=cards_pulled+1,packs_opened=packs_opened+case when v_open.current_reveal_index=0 then 1 else 0 end where user_id=p_user;
  v_response:=jsonb_build_object('cardCode',v_code,'packIndex',v_open.current_pack_index,'revealIndex',v_open.current_reveal_index,'completed',v_done);
  insert into private.idempotency_keys values(p_user,p_key,'open_reveal',v_response) on conflict do nothing;
  return v_response;
end $$;

create or replace function public.api_toggle_gallery(p_user uuid,p_card_code text,p_enabled boolean,p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_card uuid;
begin
  select id into v_card from public.card_definitions where card_code=p_card_code;
  if v_card is null or not exists(select 1 from public.user_cards where user_id=p_user and card_definition_id=v_card and quantity>0) then raise exception 'Card is not owned'; end if;
  if p_enabled then insert into public.gallery_cards values(p_user,v_card) on conflict do nothing; else delete from public.gallery_cards where user_id=p_user and card_definition_id=v_card; end if;
  return jsonb_build_object('cardCode',p_card_code,'gallery',p_enabled);
end $$;

create or replace function public.api_quick_sell(p_user uuid,p_cards jsonb,p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record; v_card uuid; v_qty integer; v_value bigint:=0; v_owned integer; v_protected boolean;
begin
  for r in select key,value::integer quantity from jsonb_each_text(p_cards) loop
    select id,quick_sell_value,protected into v_card,v_qty,v_protected from public.card_definitions where card_code=r.key;
    select quantity into v_owned from public.user_cards where user_id=p_user and card_definition_id=v_card for update;
    if v_card is null or v_protected or r.quantity<1 or coalesce(v_owned,0)<=r.quantity then raise exception using errcode='23514',message='Only duplicate non-protected cards can be quick sold'; end if;
    update public.user_cards set quantity=quantity-r.quantity where user_id=p_user and card_definition_id=v_card;
    insert into public.card_ownership_events(user_id,card_definition_id,delta,quantity_after,reason) values(p_user,v_card,-r.quantity,v_owned-r.quantity,'quick_sell');
    v_value:=v_value+v_qty*r.quantity;
  end loop;
  perform private.api_add_wallet(p_user,v_value,'quick_sell',p_key);
  update public.career_progress set quick_sell_coins=quick_sell_coins+v_value where user_id=p_user;
  return jsonb_build_object('coins',v_value);
end $$;

revoke all on all functions in schema private from public, anon, authenticated;
revoke all on function public.api_bootstrap(uuid),public.api_onboard(uuid,text,text,text),public.api_purchase(uuid,text,text),public.api_open_start(uuid,text,integer,text),public.api_open_reveal(uuid,uuid,text),public.api_toggle_gallery(uuid,text,boolean,text),public.api_quick_sell(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.api_bootstrap(uuid),public.api_onboard(uuid,text,text,text),public.api_purchase(uuid,text,text),public.api_open_start(uuid,text,integer,text),public.api_open_reveal(uuid,uuid,text),public.api_toggle_gallery(uuid,text,boolean,text),public.api_quick_sell(uuid,jsonb,text) to service_role;
commit;
