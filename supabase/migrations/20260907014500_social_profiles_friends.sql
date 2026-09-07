begin;

-- PR 3: Social Profiles and Friends. All public RPCs are service_role-only;
-- authenticated browsers can only reach them through the JWT-verified game-api.
create index if not exists profiles_username_discovery_idx on public.profiles (lower(username::text)) where username is not null;
create index if not exists profiles_display_name_discovery_idx on public.profiles (lower(display_name)) where display_name is not null;

create or replace function private.api_are_friends(p_left uuid, p_right uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.friendships f
    where f.status='accepted'
      and ((f.requester_id=p_left and f.recipient_id=p_right) or (f.requester_id=p_right and f.recipient_id=p_left))
  )
$$;

create or replace function private.api_is_blocked(p_left uuid, p_right uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.user_blocks b where (b.blocker_id=p_left and b.blocked_id=p_right) or (b.blocker_id=p_right and b.blocked_id=p_left))
    or exists(select 1 from public.friendships f where f.status='blocked' and ((f.requester_id=p_left and f.recipient_id=p_right) or (f.requester_id=p_right and f.recipient_id=p_left)))
$$;

create or replace function private.api_social_relationship(p_user uuid, p_target uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_status text;
begin
  if private.api_is_blocked(p_user,p_target) then return 'blocked'; end if;
  select case when status='accepted' then 'friends' when requester_id=p_user then 'outgoing' else 'incoming' end
    into v_status from public.friendships
    where (requester_id=p_user and recipient_id=p_target) or (requester_id=p_target and recipient_id=p_user);
  return coalesce(v_status,'none');
end $$;

create or replace function private.api_social_search(p_user uuid, p_query text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_query text:=lower(trim(p_query));
begin
  perform private.api_assert_user(p_user);
  if char_length(v_query)<2 then raise exception using errcode='22023',message='Enter at least 2 characters'; end if;
  return coalesce((
    select jsonb_agg(s.item order by s.sort_name,s.created_at)
    from (
      select jsonb_build_object(
        'userId',p.user_id,'apexId',p.apex_id,'username',p.username,'displayName',p.display_name,
        'relationship',private.api_social_relationship(p_user,p.user_id)
      ) as item,coalesce(p.username::text,p.display_name) as sort_name,p.created_at
      from public.profiles p
      where p.user_id<>p_user
        and not private.api_is_blocked(p_user,p.user_id)
        and (lower(coalesce(p.username::text,'')) like '%'||v_query||'%' or lower(coalesce(p.display_name,'')) like '%'||v_query||'%' or lower(p.apex_id) like '%'||v_query||'%')
      order by coalesce(p.username::text,p.display_name),p.created_at
      limit 20
    ) s
  ),'[]'::jsonb);
end $$;

create or replace function private.api_social_list(p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.api_assert_user(p_user);
  return jsonb_build_object(
    'friends',coalesce((select jsonb_agg(jsonb_build_object('friendshipId',f.id,'userId',p.user_id,'apexId',p.apex_id,'username',p.username,'displayName',p.display_name,'acceptedAt',f.accepted_at) order by coalesce(p.username::text,p.display_name)) from public.friendships f join public.profiles p on p.user_id=case when f.requester_id=p_user then f.recipient_id else f.requester_id end where f.status='accepted' and (f.requester_id=p_user or f.recipient_id=p_user)),'[]'::jsonb),
    'incoming',coalesce((select jsonb_agg(jsonb_build_object('friendshipId',f.id,'userId',p.user_id,'apexId',p.apex_id,'username',p.username,'displayName',p.display_name,'createdAt',f.created_at) order by f.created_at desc) from public.friendships f join public.profiles p on p.user_id=f.requester_id where f.status='pending' and f.recipient_id=p_user),'[]'::jsonb),
    'outgoing',coalesce((select jsonb_agg(jsonb_build_object('friendshipId',f.id,'userId',p.user_id,'apexId',p.apex_id,'username',p.username,'displayName',p.display_name,'createdAt',f.created_at) order by f.created_at desc) from public.friendships f join public.profiles p on p.user_id=f.recipient_id where f.status='pending' and f.requester_id=p_user),'[]'::jsonb)
  );
end $$;

create or replace function private.api_friend_request(p_user uuid, p_target uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_existing public.friendships%rowtype; v_result jsonb;
begin
  perform private.api_assert_user(p_user);
  if p_target is null or p_target=p_user then raise exception using errcode='22023',message='Choose another collector'; end if;
  if not exists(select 1 from public.profiles where user_id=p_target) then raise exception using errcode='23503',message='Collector not found'; end if;
  if private.api_is_blocked(p_user,p_target) then raise exception using errcode='42501',message='This collector is unavailable'; end if;
  if (select count(*) from public.friendships where status='accepted' and (requester_id=p_user or recipient_id=p_user))>=250 then raise exception using errcode='23514',message='Friend limit reached'; end if;
  select * into v_existing from public.friendships where (requester_id=p_user and recipient_id=p_target) or (requester_id=p_target and recipient_id=p_user) for update;
  if v_existing.id is not null then
    if v_existing.status='accepted' then raise exception using errcode='23505',message='Already friends'; end if;
    if v_existing.requester_id=p_target and v_existing.status='pending' then
      update public.friendships set status='accepted',accepted_at=now(),updated_at=now() where id=v_existing.id;
      return jsonb_build_object('relationship','friends','accepted',true);
    end if;
    return jsonb_build_object('relationship','outgoing','pending',true);
  end if;
  insert into public.friendships(requester_id,recipient_id,status) values(p_user,p_target,'pending') returning id into v_existing.id;
  insert into public.notifications(user_id,notification_type,title,body,payload) values(p_target,'friend_request','New friend request','A collector wants to connect.',jsonb_build_object('from',p_user));
  v_result:=jsonb_build_object('relationship','outgoing','friendshipId',v_existing.id);
  return v_result;
end $$;

create or replace function private.api_friend_respond(p_user uuid, p_friendship uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_friendship public.friendships%rowtype;
begin
  perform private.api_assert_user(p_user);
  select * into v_friendship from public.friendships where id=p_friendship and recipient_id=p_user and status='pending' for update;
  if v_friendship.id is null then raise exception using errcode='42501',message='Friend request is unavailable'; end if;
  if p_accept then
    if private.api_is_blocked(p_user,v_friendship.requester_id) then raise exception using errcode='42501',message='This collector is unavailable'; end if;
    update public.friendships set status='accepted',accepted_at=now(),updated_at=now() where id=p_friendship;
    insert into public.notifications(user_id,notification_type,title,body,payload) values(v_friendship.requester_id,'friend_accepted','Friend request accepted','You are now connected in APEX.',jsonb_build_object('by',p_user));
    return jsonb_build_object('relationship','friends');
  end if;
  delete from public.friendships where id=p_friendship;
  return jsonb_build_object('relationship','none');
end $$;

create or replace function private.api_friend_remove(p_user uuid, p_target uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.api_assert_user(p_user);
  if p_target is null or p_target=p_user then raise exception using errcode='22023',message='Choose another collector'; end if;
  delete from public.friendships where status='accepted' and ((requester_id=p_user and recipient_id=p_target) or (requester_id=p_target and recipient_id=p_user));
  return jsonb_build_object('relationship',private.api_social_relationship(p_user,p_target));
end $$;

create or replace function private.api_user_block(p_user uuid, p_target uuid, p_block boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.api_assert_user(p_user);
  if p_target is null or p_target=p_user then raise exception using errcode='22023',message='Choose another collector'; end if;
  if not exists(select 1 from public.profiles where user_id=p_target) then raise exception using errcode='23503',message='Collector not found'; end if;
  if p_block then
    insert into public.user_blocks(blocker_id,blocked_id) values(p_user,p_target) on conflict do nothing;
    delete from public.friendships where (requester_id=p_user and recipient_id=p_target) or (requester_id=p_target and recipient_id=p_user);
    return jsonb_build_object('relationship','blocked');
  end if;
  delete from public.user_blocks where blocker_id=p_user and blocked_id=p_target;
  return jsonb_build_object('relationship',private.api_social_relationship(p_user,p_target));
end $$;

create or replace function private.api_profile_update(p_user uuid, p_display text, p_favourite_club text, p_privacy jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_mode text;
begin
  perform private.api_assert_user(p_user);
  if char_length(trim(coalesce(p_display,''))) > 48 then raise exception using errcode='22023',message='Display name must be 48 characters or fewer'; end if;
  if char_length(trim(coalesce(p_favourite_club,''))) > 80 then raise exception using errcode='22023',message='Favourite club must be 80 characters or fewer'; end if;
  if p_privacy is not null then
    foreach v_mode in array array[coalesce(p_privacy->>'profile','friends'),coalesce(p_privacy->>'presence','friends'),coalesce(p_privacy->>'club','everyone'),coalesce(p_privacy->>'showcase','everyone')] loop
      if v_mode not in ('everyone','friends','nobody') then raise exception using errcode='22023',message='Invalid privacy setting'; end if;
    end loop;
  end if;
  update public.profiles set display_name=coalesce(nullif(trim(p_display),''),display_name),favourite_club=nullif(trim(p_favourite_club),''),profile_privacy=coalesce(p_privacy,profile_privacy),updated_at=now() where user_id=p_user;
  return (select jsonb_build_object('apexId',apex_id,'displayName',display_name,'username',username,'favouriteClub',favourite_club,'privacy',profile_privacy) from public.profiles where user_id=p_user);
end $$;

create or replace function public.api_social_search(p_user uuid, p_query text) returns jsonb language sql security definer set search_path = '' as $$ select private.api_social_search(p_user,p_query) $$;
create or replace function public.api_social_list(p_user uuid) returns jsonb language sql security definer set search_path = '' as $$ select private.api_social_list(p_user) $$;
create or replace function public.api_friend_request(p_user uuid, p_target uuid, p_key text) returns jsonb language sql security definer set search_path = '' as $$ select private.api_friend_request(p_user,p_target,p_key) $$;
create or replace function public.api_friend_respond(p_user uuid, p_friendship uuid, p_accept boolean) returns jsonb language sql security definer set search_path = '' as $$ select private.api_friend_respond(p_user,p_friendship,p_accept) $$;
create or replace function public.api_friend_remove(p_user uuid, p_target uuid) returns jsonb language sql security definer set search_path = '' as $$ select private.api_friend_remove(p_user,p_target) $$;
create or replace function public.api_user_block(p_user uuid, p_target uuid, p_block boolean) returns jsonb language sql security definer set search_path = '' as $$ select private.api_user_block(p_user,p_target,p_block) $$;
create or replace function public.api_profile_update(p_user uuid, p_display text, p_favourite_club text, p_privacy jsonb) returns jsonb language sql security definer set search_path = '' as $$ select private.api_profile_update(p_user,p_display,p_favourite_club,p_privacy) $$;

revoke all on function public.api_social_search(uuid,text),public.api_social_list(uuid),public.api_friend_request(uuid,uuid,text),public.api_friend_respond(uuid,uuid,boolean),public.api_friend_remove(uuid,uuid),public.api_user_block(uuid,uuid,boolean),public.api_profile_update(uuid,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.api_social_search(uuid,text),public.api_social_list(uuid),public.api_friend_request(uuid,uuid,text),public.api_friend_respond(uuid,uuid,boolean),public.api_friend_remove(uuid,uuid),public.api_user_block(uuid,uuid,boolean),public.api_profile_update(uuid,text,text,jsonb) to service_role;

commit;
