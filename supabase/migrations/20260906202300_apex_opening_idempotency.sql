begin;
create or replace function public.api_open_reveal(p_user uuid, p_opening uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_open public.openings%rowtype; v_card uuid; v_code text; v_done boolean:=false; v_response jsonb;
begin
  select response into v_response from private.idempotency_keys where user_id=p_user and idempotency_key=p_key;
  if v_response is not null then return v_response; end if;
  select * into v_open from public.openings where id=p_opening and user_id=p_user for update;
  if v_open.id is null then raise exception using errcode='22023',message='Opening not found'; end if;
  if v_open.state='completed' then return jsonb_build_object('completed',true); end if;
  select (v_open.result_json->'packs'->v_open.current_pack_index->'cards'->>v_open.current_reveal_index)::uuid into v_card;
  perform private.api_add_card(p_user,v_card,'opening',v_open.id);
  select card_code into v_code from public.card_definitions where id=v_card;
  insert into public.opening_reveals(opening_id,user_id,pack_index,reveal_index,card_definition_id,source)
    values(v_open.id,p_user,v_open.current_pack_index,v_open.current_reveal_index,v_card,v_open.product_name_snapshot);
  if v_open.current_reveal_index=2 and v_open.current_pack_index=v_open.pack_count-1 then
    update public.openings set state='completed',completed_at=now() where id=v_open.id; v_done:=true;
  elsif v_open.current_reveal_index=2 then update public.openings set current_pack_index=current_pack_index+1,current_reveal_index=0 where id=v_open.id;
  else update public.openings set current_reveal_index=current_reveal_index+1 where id=v_open.id; end if;
  update public.career_progress set cards_pulled=cards_pulled+1,packs_opened=packs_opened+case when v_open.current_reveal_index=0 then 1 else 0 end where user_id=p_user;
  v_response:=jsonb_build_object('cardCode',v_code,'packIndex',v_open.current_pack_index,'revealIndex',v_open.current_reveal_index,'completed',v_done);
  insert into private.idempotency_keys values(p_user,p_key,'open_reveal',v_response);
  return v_response;
end $$;
commit;
