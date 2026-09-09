begin;

-- Clubs v1 is additive: it uses the foundation tables and exposes mutations only
-- through the JWT-verified game-api Edge Function.
create index if not exists clubs_discovery_active_idx
  on public.clubs (lower(name), tag) where status = 'active';
create index if not exists club_members_active_club_idx
  on public.club_members (club_id, role, joined_at) where left_at is null;
create index if not exists club_join_requests_pending_club_idx
  on public.club_join_requests (club_id, created_at) where status = 'pending';
create index if not exists club_invites_pending_invitee_idx
  on public.club_invites (invitee_id, created_at) where status = 'pending';
create index if not exists club_activity_feed_idx
  on public.club_activity (club_id, created_at desc);

create or replace function private.api_club_role(p_user uuid, p_club uuid)
returns text language sql stable security definer set search_path = '' as $$
  select role from public.club_members
  where club_id=p_club and user_id=p_user and left_at is null
$$;

create or replace function private.api_club_can_manage(p_user uuid, p_club uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.api_club_role(p_user,p_club) in ('owner','co_owner','officer'),false)
$$;

create or replace function private.api_club_member_cap()
returns integer language plpgsql stable security definer set search_path = '' as $$
declare v_cap integer;
begin
  select (value #>> '{}')::integer into v_cap
  from public.competition_rules where rule_key='club_member_cap';
  return greatest(coalesce(v_cap,20),1);
end $$;

create or replace function private.api_club_has_active_membership(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.club_members where user_id=p_user and left_at is null)
$$;

create or replace function private.api_club_member_count(p_club uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.club_members where club_id=p_club and left_at is null
$$;

create or replace function private.api_club_discover(p_user uuid, p_query text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_query text:=lower(trim(coalesce(p_query,'')));
begin
  return coalesce((
    select jsonb_agg(d.item order by d.member_count desc,d.name)
    from (
      select jsonb_build_object(
        'id',c.id,'name',c.name,'tag',c.tag,'description',c.description,'motto',c.motto,
        'primaryColor',c.primary_color,'secondaryColor',c.secondary_color,'joinMode',c.join_mode,
        'level',c.level,'memberCount',private.api_club_member_count(c.id),'memberCap',private.api_club_member_cap(),
        'joinState',case
          when exists(select 1 from public.club_members m where m.club_id=c.id and m.user_id=p_user and m.left_at is null) then 'member'
          when exists(select 1 from public.club_invites i where i.club_id=c.id and i.invitee_id=p_user and i.status='pending' and i.expires_at>now()) then 'invited'
          when exists(select 1 from public.club_join_requests r where r.club_id=c.id and r.user_id=p_user and r.status='pending') then 'requested'
          when c.join_mode='open' then 'open'
          when c.join_mode='request' then 'request'
          else 'invite_only'
        end
      ) as item, c.name, private.api_club_member_count(c.id) as member_count
      from public.clubs c
      where c.status='active'
        and (v_query='' or lower(c.name) like '%'||v_query||'%' or lower(c.tag) like '%'||v_query||'%')
      order by private.api_club_member_count(c.id) desc,c.name
      limit 20
    ) d
  ),'[]'::jsonb);
end $$;

create or replace function private.api_club_status(p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_club uuid; v_role text; v_can_manage boolean; v_is_owner boolean;
begin
  perform private.api_assert_user(p_user);
  select club_id,role into v_club,v_role from public.club_members
  where user_id=p_user and left_at is null;
  v_can_manage:=coalesce(v_role in ('owner','co_owner','officer'),false);
  v_is_owner:=v_role='owner';
  return jsonb_build_object(
    'membership',case when v_club is null then null else jsonb_build_object('clubId',v_club,'role',v_role,'canManage',v_can_manage,'isOwner',v_is_owner) end,
    'club',case when v_club is null then null else (
      select jsonb_build_object('id',c.id,'name',c.name,'tag',c.tag,'description',c.description,'motto',c.motto,
        'primaryColor',c.primary_color,'secondaryColor',c.secondary_color,'joinMode',c.join_mode,'level',c.level,
        'xp',c.xp,'tokens',c.tokens,'memberCount',private.api_club_member_count(c.id),'memberCap',private.api_club_member_cap(),'ownerId',c.owner_id)
      from public.clubs c where c.id=v_club
    ) end,
    'members',case when v_club is null then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object('userId',p.user_id,'apexId',p.apex_id,'username',p.username,'displayName',p.display_name,
        'role',m.role,'joinedAt',m.joined_at,'contributionXp',m.contribution_xp)
        order by case m.role when 'owner' then 1 when 'co_owner' then 2 when 'officer' then 3 else 4 end,p.display_name)
      from public.club_members m join public.profiles p on p.user_id=m.user_id
      where m.club_id=v_club and m.left_at is null
    ),'[]'::jsonb) end,
    'activity',case when v_club is null then '[]'::jsonb else coalesce((
      select jsonb_agg(x.item order by x.created_at desc) from (
        select jsonb_build_object('id',a.id,'eventType',a.event_type,'payload',a.payload,'createdAt',a.created_at,
          'actor',case when p.user_id is null then null else jsonb_build_object('userId',p.user_id,'displayName',p.display_name,'username',p.username) end) as item,a.created_at
        from public.club_activity a left join public.profiles p on p.user_id=a.actor_id
        where a.club_id=v_club order by a.created_at desc limit 20
      ) x
    ),'[]'::jsonb) end,
    'requests',case when not v_can_manage then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object('id',r.id,'userId',p.user_id,'displayName',p.display_name,'username',p.username,'apexId',p.apex_id,'createdAt',r.created_at) order by r.created_at)
      from public.club_join_requests r join public.profiles p on p.user_id=r.user_id
      where r.club_id=v_club and r.status='pending'
    ),'[]'::jsonb) end,
    'invites',coalesce((
      select jsonb_agg(jsonb_build_object('id',i.id,'clubId',c.id,'clubName',c.name,'clubTag',c.tag,'primaryColor',c.primary_color,'secondaryColor',c.secondary_color,'expiresAt',i.expires_at) order by i.created_at desc)
      from public.club_invites i join public.clubs c on c.id=i.club_id
      where i.invitee_id=p_user and i.status='pending' and i.expires_at>now()
    ),'[]'::jsonb),
    'discover',private.api_club_discover(p_user,'')
  );
end $$;

create or replace function private.api_club_search(p_user uuid, p_query text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.api_assert_user(p_user);
  if char_length(trim(coalesce(p_query,''))) = 1 then
    raise exception using errcode='22023',message='Enter at least 2 characters';
  end if;
  return private.api_club_discover(p_user,p_query);
end $$;

create or replace function private.api_club_create(p_user uuid, p_name text, p_tag text, p_description text, p_motto text, p_join_mode text, p_primary_color text, p_secondary_color text, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_club uuid; v_seen jsonb; v_name text:=trim(coalesce(p_name,'')); v_tag text:=upper(trim(coalesce(p_tag,'')));
begin
  perform private.api_assert_user(p_user);
  if nullif(trim(p_key),'') is null then raise exception using errcode='22023',message='Missing idempotency key'; end if;
  select response into v_seen from private.idempotency_keys where user_id=p_user and idempotency_key=p_key;
  if v_seen is not null then return v_seen; end if;
  if private.api_club_has_active_membership(p_user) then raise exception using errcode='23505',message='Leave your current club before creating another'; end if;
  if char_length(v_name) not between 3 and 32 then raise exception using errcode='22023',message='Club name must be 3–32 characters'; end if;
  if v_tag !~ '^[A-Z0-9]{3,5}$' then raise exception using errcode='22023',message='Tag must be 3–5 capital letters or numbers'; end if;
  if char_length(trim(coalesce(p_description,'')))>500 or char_length(trim(coalesce(p_motto,'')))>80 then raise exception using errcode='22023',message='Club description or motto is too long'; end if;
  if coalesce(p_join_mode,'') not in ('open','request','invite') then raise exception using errcode='22023',message='Choose an access mode'; end if;
  if coalesce(p_primary_color,'') !~ '^#[0-9A-Fa-f]{6}$' or coalesce(p_secondary_color,'') !~ '^#[0-9A-Fa-f]{6}$' then raise exception using errcode='22023',message='Choose valid club colours'; end if;
  if exists(select 1 from public.clubs where lower(name)=lower(v_name) or tag=v_tag) then raise exception using errcode='23505',message='Club name or tag is already taken'; end if;
  insert into public.clubs(owner_id,name,tag,description,motto,join_mode,primary_color,secondary_color)
    values(p_user,v_name,v_tag,trim(coalesce(p_description,'')),nullif(trim(coalesce(p_motto,'')),''),p_join_mode,p_primary_color,p_secondary_color)
    returning id into v_club;
  insert into public.club_members(club_id,user_id,role) values(v_club,p_user,'owner');
  insert into public.club_activity(club_id,actor_id,event_type,payload) values(v_club,p_user,'club_created',jsonb_build_object('name',v_name,'tag',v_tag));
  v_seen:=private.api_club_status(p_user);
  insert into private.idempotency_keys(user_id,idempotency_key,action,response) values(p_user,p_key,'club_create',v_seen);
  return v_seen;
end $$;

create or replace function private.api_club_join(p_user uuid, p_club uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_join_mode text; v_status text; v_seen jsonb; v_cap integer;
begin
  perform private.api_assert_user(p_user);
  if nullif(trim(p_key),'') is null then raise exception using errcode='22023',message='Missing idempotency key'; end if;
  select response into v_seen from private.idempotency_keys where user_id=p_user and idempotency_key=p_key;
  if v_seen is not null then return v_seen; end if;
  if private.api_club_has_active_membership(p_user) then raise exception using errcode='23505',message='You are already in a club'; end if;
  select join_mode,status into v_join_mode,v_status from public.clubs where id=p_club for update;
  if v_status is null or v_status<>'active' then raise exception using errcode='23503',message='Club is unavailable'; end if;
  if v_join_mode='invite' then raise exception using errcode='42501',message='This club is invite only'; end if;
  if v_join_mode='request' then
    if exists(select 1 from public.club_join_requests where club_id=p_club and user_id=p_user and status='pending') then
      return jsonb_build_object('joinState','requested','clubId',p_club);
    end if;
    insert into public.club_join_requests(club_id,user_id) values(p_club,p_user);
    insert into public.club_activity(club_id,actor_id,event_type,payload) values(p_club,p_user,'join_requested','{}'::jsonb);
    insert into public.notifications(user_id,notification_type,title,body,payload)
      select m.user_id,'club_join_request','New club request','A collector requested to join your club.',jsonb_build_object('clubId',p_club,'from',p_user)
      from public.club_members m where m.club_id=p_club and m.left_at is null and m.role in ('owner','co_owner','officer');
    v_seen:=jsonb_build_object('joinState','requested','clubId',p_club);
  else
    v_cap:=private.api_club_member_cap();
    if private.api_club_member_count(p_club)>=v_cap then raise exception using errcode='23514',message='This club is full'; end if;
    insert into public.club_members(club_id,user_id,role,joined_at,left_at) values(p_club,p_user,'member',now(),null)
      on conflict(club_id,user_id) do update set role='member',joined_at=now(),left_at=null;
    update public.club_join_requests set status='approved',decided_at=now(),decided_by=p_user where club_id=p_club and user_id=p_user and status='pending';
    insert into public.club_activity(club_id,actor_id,event_type,payload) values(p_club,p_user,'member_joined',jsonb_build_object('source','open'));
    v_seen:=private.api_club_status(p_user);
  end if;
  insert into private.idempotency_keys(user_id,idempotency_key,action,response) values(p_user,p_key,'club_join',v_seen);
  return v_seen;
end $$;

create or replace function private.api_club_request_respond(p_user uuid, p_request uuid, p_accept boolean, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_club uuid; v_target uuid; v_seen jsonb; v_cap integer;
begin
  perform private.api_assert_user(p_user);
  if nullif(trim(p_key),'') is null then raise exception using errcode='22023',message='Missing idempotency key'; end if;
  select response into v_seen from private.idempotency_keys where user_id=p_user and idempotency_key=p_key;
  if v_seen is not null then return v_seen; end if;
  select club_id,user_id into v_club,v_target from public.club_join_requests where id=p_request and status='pending' for update;
  if v_club is null or not private.api_club_can_manage(p_user,v_club) then raise exception using errcode='42501',message='Join request is unavailable'; end if;
  if p_accept then
    if private.api_club_has_active_membership(v_target) then raise exception using errcode='23505',message='This collector has already joined a club'; end if;
    v_cap:=private.api_club_member_cap();
    if private.api_club_member_count(v_club)>=v_cap then raise exception using errcode='23514',message='Your club is full'; end if;
    insert into public.club_members(club_id,user_id,role,joined_at,left_at) values(v_club,v_target,'member',now(),null)
      on conflict(club_id,user_id) do update set role='member',joined_at=now(),left_at=null;
    update public.club_join_requests set status='approved',decided_at=now(),decided_by=p_user where id=p_request;
    insert into public.club_activity(club_id,actor_id,event_type,payload) values(v_club,v_target,'member_joined',jsonb_build_object('source','request','approvedBy',p_user));
    insert into public.notifications(user_id,notification_type,title,body,payload) values(v_target,'club_request_approved','Club request accepted','Your request to join a club was accepted.',jsonb_build_object('clubId',v_club));
  else
    update public.club_join_requests set status='rejected',decided_at=now(),decided_by=p_user where id=p_request;
    insert into public.notifications(user_id,notification_type,title,body,payload) values(v_target,'club_request_rejected','Club request declined','Your request to join a club was declined.',jsonb_build_object('clubId',v_club));
  end if;
  v_seen:=private.api_club_status(p_user);
  insert into private.idempotency_keys(user_id,idempotency_key,action,response) values(p_user,p_key,'club_request_respond',v_seen);
  return v_seen;
end $$;

create or replace function private.api_club_invite(p_user uuid, p_club uuid, p_target uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_seen jsonb; v_invite uuid; v_status text; v_cap integer;
begin
  perform private.api_assert_user(p_user);
  if nullif(trim(p_key),'') is null then raise exception using errcode='22023',message='Missing idempotency key'; end if;
  select response into v_seen from private.idempotency_keys where user_id=p_user and idempotency_key=p_key;
  if v_seen is not null then return v_seen; end if;
  if p_target is null or p_target=p_user then raise exception using errcode='22023',message='Choose another collector'; end if;
  if not private.api_club_can_manage(p_user,p_club) then raise exception using errcode='42501',message='Only club leaders can invite collectors'; end if;
  select status into v_status from public.clubs where id=p_club for update;
  if v_status is null or v_status<>'active' then raise exception using errcode='23503',message='Club is unavailable'; end if;
  v_cap:=private.api_club_member_cap();
  if private.api_club_member_count(p_club)>=v_cap then raise exception using errcode='23514',message='Your club is full'; end if;
  if not exists(select 1 from public.profiles where user_id=p_target) then raise exception using errcode='23503',message='Collector not found'; end if;
  if private.api_club_has_active_membership(p_target) then raise exception using errcode='23505',message='This collector is already in a club'; end if;
  if not private.api_are_friends(p_user,p_target) then raise exception using errcode='42501',message='You can only invite APEX friends'; end if;
  if private.api_is_blocked(p_user,p_target) then raise exception using errcode='42501',message='This collector is unavailable'; end if;
  select id into v_invite from public.club_invites where club_id=p_club and invitee_id=p_target and status='pending' and expires_at>now() for update;
  if v_invite is null then
    insert into public.club_invites(club_id,inviter_id,invitee_id) values(p_club,p_user,p_target) returning id into v_invite;
    insert into public.club_activity(club_id,actor_id,event_type,payload) values(p_club,p_user,'invite_sent',jsonb_build_object('inviteeId',p_target));
    insert into public.notifications(user_id,notification_type,title,body,payload)
      select p_target,'club_invite','Club invitation','A friend invited you to join their club.',jsonb_build_object('clubId',p_club,'inviteId',v_invite);
  end if;
  v_seen:=jsonb_build_object('invited',true,'inviteId',v_invite);
  insert into private.idempotency_keys(user_id,idempotency_key,action,response) values(p_user,p_key,'club_invite',v_seen);
  return v_seen;
end $$;

create or replace function private.api_club_invite_respond(p_user uuid, p_invite uuid, p_accept boolean, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_club uuid; v_seen jsonb; v_cap integer; v_status text;
begin
  perform private.api_assert_user(p_user);
  if nullif(trim(p_key),'') is null then raise exception using errcode='22023',message='Missing idempotency key'; end if;
  select response into v_seen from private.idempotency_keys where user_id=p_user and idempotency_key=p_key;
  if v_seen is not null then return v_seen; end if;
  select club_id into v_club from public.club_invites where id=p_invite and invitee_id=p_user and status='pending' and expires_at>now() for update;
  if v_club is null then raise exception using errcode='42501',message='Club invitation is unavailable'; end if;
  if p_accept then
    select status into v_status from public.clubs where id=v_club for update;
    if v_status is null or v_status<>'active' then raise exception using errcode='23503',message='Club is unavailable'; end if;
    if private.api_club_has_active_membership(p_user) then raise exception using errcode='23505',message='Leave your current club before accepting'; end if;
    v_cap:=private.api_club_member_cap();
    if private.api_club_member_count(v_club)>=v_cap then raise exception using errcode='23514',message='This club is full'; end if;
    insert into public.club_members(club_id,user_id,role,joined_at,left_at) values(v_club,p_user,'member',now(),null)
      on conflict(club_id,user_id) do update set role='member',joined_at=now(),left_at=null;
    update public.club_invites set status='accepted',responded_at=now() where id=p_invite;
    insert into public.club_activity(club_id,actor_id,event_type,payload) values(v_club,p_user,'member_joined',jsonb_build_object('source','invite'));
    v_seen:=private.api_club_status(p_user);
  else
    update public.club_invites set status='declined',responded_at=now() where id=p_invite;
    v_seen:=jsonb_build_object('declined',true,'clubId',v_club);
  end if;
  insert into private.idempotency_keys(user_id,idempotency_key,action,response) values(p_user,p_key,'club_invite_respond',v_seen);
  return v_seen;
end $$;

create or replace function private.api_club_member_role_update(p_user uuid, p_club uuid, p_target uuid, p_role text, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_seen jsonb; v_old_role text;
begin
  perform private.api_assert_user(p_user);
  if nullif(trim(p_key),'') is null then raise exception using errcode='22023',message='Missing idempotency key'; end if;
  select response into v_seen from private.idempotency_keys where user_id=p_user and idempotency_key=p_key;
  if v_seen is not null then return v_seen; end if;
  if private.api_club_role(p_user,p_club)<>'owner' then raise exception using errcode='42501',message='Only the club owner can change roles'; end if;
  if p_target=p_user then raise exception using errcode='22023',message='Owner role changes are not available in Clubs v1'; end if;
  if p_role not in ('co_owner','officer','member') then raise exception using errcode='22023',message='Choose a valid club role'; end if;
  select role into v_old_role from public.club_members where club_id=p_club and user_id=p_target and left_at is null for update;
  if v_old_role is null then raise exception using errcode='23503',message='Member not found'; end if;
  update public.club_members set role=p_role where club_id=p_club and user_id=p_target and left_at is null;
  insert into public.club_activity(club_id,actor_id,event_type,payload) values(p_club,p_user,'role_changed',jsonb_build_object('memberId',p_target,'from',v_old_role,'to',p_role));
  v_seen:=private.api_club_status(p_user);
  insert into private.idempotency_keys(user_id,idempotency_key,action,response) values(p_user,p_key,'club_role_update',v_seen);
  return v_seen;
end $$;

create or replace function private.api_club_leave(p_user uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_club uuid; v_role text; v_seen jsonb;
begin
  perform private.api_assert_user(p_user);
  if nullif(trim(p_key),'') is null then raise exception using errcode='22023',message='Missing idempotency key'; end if;
  select response into v_seen from private.idempotency_keys where user_id=p_user and idempotency_key=p_key;
  if v_seen is not null then return v_seen; end if;
  select club_id,role into v_club,v_role from public.club_members where user_id=p_user and left_at is null for update;
  if v_club is null then raise exception using errcode='23503',message='You are not in a club'; end if;
  if v_role='owner' then raise exception using errcode='42501',message='Transfer ownership before leaving; owner transfer is not in Clubs v1'; end if;
  update public.club_members set left_at=now() where club_id=v_club and user_id=p_user and left_at is null;
  insert into public.club_activity(club_id,actor_id,event_type,payload) values(v_club,p_user,'member_left','{}'::jsonb);
  v_seen:=private.api_club_status(p_user);
  insert into private.idempotency_keys(user_id,idempotency_key,action,response) values(p_user,p_key,'club_leave',v_seen);
  return v_seen;
end $$;

create or replace function public.api_club_status(p_user uuid)
returns jsonb language sql security definer set search_path = '' as $$ select private.api_club_status(p_user) $$;
create or replace function public.api_club_search(p_user uuid, p_query text)
returns jsonb language sql security definer set search_path = '' as $$ select private.api_club_search(p_user,p_query) $$;
create or replace function public.api_club_create(p_user uuid, p_name text, p_tag text, p_description text, p_motto text, p_join_mode text, p_primary_color text, p_secondary_color text, p_key text)
returns jsonb language sql security definer set search_path = '' as $$ select private.api_club_create(p_user,p_name,p_tag,p_description,p_motto,p_join_mode,p_primary_color,p_secondary_color,p_key) $$;
create or replace function public.api_club_join(p_user uuid, p_club uuid, p_key text)
returns jsonb language sql security definer set search_path = '' as $$ select private.api_club_join(p_user,p_club,p_key) $$;
create or replace function public.api_club_request_respond(p_user uuid, p_request uuid, p_accept boolean, p_key text)
returns jsonb language sql security definer set search_path = '' as $$ select private.api_club_request_respond(p_user,p_request,p_accept,p_key) $$;
create or replace function public.api_club_invite(p_user uuid, p_club uuid, p_target uuid, p_key text)
returns jsonb language sql security definer set search_path = '' as $$ select private.api_club_invite(p_user,p_club,p_target,p_key) $$;
create or replace function public.api_club_invite_respond(p_user uuid, p_invite uuid, p_accept boolean, p_key text)
returns jsonb language sql security definer set search_path = '' as $$ select private.api_club_invite_respond(p_user,p_invite,p_accept,p_key) $$;
create or replace function public.api_club_member_role_update(p_user uuid, p_club uuid, p_target uuid, p_role text, p_key text)
returns jsonb language sql security definer set search_path = '' as $$ select private.api_club_member_role_update(p_user,p_club,p_target,p_role,p_key) $$;
create or replace function public.api_club_leave(p_user uuid, p_key text)
returns jsonb language sql security definer set search_path = '' as $$ select private.api_club_leave(p_user,p_key) $$;

revoke all on function
  private.api_club_role(uuid,uuid),private.api_club_can_manage(uuid,uuid),private.api_club_member_cap(),private.api_club_has_active_membership(uuid),private.api_club_member_count(uuid),private.api_club_discover(uuid,text),private.api_club_status(uuid),private.api_club_search(uuid,text),private.api_club_create(uuid,text,text,text,text,text,text,text,text),private.api_club_join(uuid,uuid,text),private.api_club_request_respond(uuid,uuid,boolean,text),private.api_club_invite(uuid,uuid,uuid,text),private.api_club_invite_respond(uuid,uuid,boolean,text),private.api_club_member_role_update(uuid,uuid,uuid,text,text),private.api_club_leave(uuid,text),
  public.api_club_status(uuid),public.api_club_search(uuid,text),public.api_club_create(uuid,text,text,text,text,text,text,text,text),public.api_club_join(uuid,uuid,text),public.api_club_request_respond(uuid,uuid,boolean,text),public.api_club_invite(uuid,uuid,uuid,text),public.api_club_invite_respond(uuid,uuid,boolean,text),public.api_club_member_role_update(uuid,uuid,uuid,text,text),public.api_club_leave(uuid,text)
from public, anon, authenticated;
grant execute on function
  private.api_club_role(uuid,uuid),private.api_club_can_manage(uuid,uuid),private.api_club_member_cap(),private.api_club_has_active_membership(uuid),private.api_club_member_count(uuid),private.api_club_discover(uuid,text),private.api_club_status(uuid),private.api_club_search(uuid,text),private.api_club_create(uuid,text,text,text,text,text,text,text,text),private.api_club_join(uuid,uuid,text),private.api_club_request_respond(uuid,uuid,boolean,text),private.api_club_invite(uuid,uuid,uuid,text),private.api_club_invite_respond(uuid,uuid,boolean,text),private.api_club_member_role_update(uuid,uuid,uuid,text,text),private.api_club_leave(uuid,text),
  public.api_club_status(uuid),public.api_club_search(uuid,text),public.api_club_create(uuid,text,text,text,text,text,text,text,text),public.api_club_join(uuid,uuid,text),public.api_club_request_respond(uuid,uuid,boolean,text),public.api_club_invite(uuid,uuid,uuid,text),public.api_club_invite_respond(uuid,uuid,boolean,text),public.api_club_member_role_update(uuid,uuid,uuid,text,text),public.api_club_leave(uuid,text)
to service_role;

commit;
