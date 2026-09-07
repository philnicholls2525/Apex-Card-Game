begin;

-- APEX Friend Teams, competition entrants and resilient football-data cache.
-- Additive only: no existing profiles, friendships, clubs, cards or rewards are removed.

-- The previous foundation tables inherited Supabase's broad public-schema defaults.
-- Keep all mutations behind the JWT-verified game-api and its service-role RPCs.
revoke all on table
  public.user_presence,
  public.profile_showcase_cards,
  public.user_blocks,
  public.user_reports,
  public.direct_conversations,
  public.direct_messages,
  public.clubs,
  public.club_members,
  public.club_join_requests,
  public.club_invites,
  public.club_activity,
  public.club_messages,
  public.reward_definitions,
  public.daily_reward_progress,
  public.reward_grants,
  public.notifications,
  public.competition_rules,
  public.competition_weeks,
  public.competition_squads,
  public.competition_squad_slots,
  public.football_player_mappings,
  public.football_fixtures,
  public.football_sync_log
from anon, authenticated;

-- Complete Friends: outgoing requests can be cancelled and profiles can be opened.
create or replace function private.api_friend_cancel(p_user uuid, p_friendship uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.api_assert_user(p_user);
  delete from public.friendships
  where id=p_friendship and requester_id=p_user and status='pending';
  if not found then
    raise exception using errcode='42501',message='Friend request is unavailable';
  end if;
  return jsonb_build_object('relationship','none');
end $$;

create or replace function private.api_social_profile(p_user uuid, p_target uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_relationship text; v_profile public.profiles%rowtype; v_can_view boolean;
begin
  perform private.api_assert_user(p_user);
  if p_target is null or p_target=p_user then
    raise exception using errcode='22023',message='Choose another collector';
  end if;
  if private.api_is_blocked(p_user,p_target) then
    raise exception using errcode='42501',message='This collector is unavailable';
  end if;
  select * into v_profile from public.profiles where user_id=p_target;
  if v_profile.user_id is null then
    raise exception using errcode='23503',message='Collector not found';
  end if;
  v_relationship:=private.api_social_relationship(p_user,p_target);
  v_can_view:=v_relationship='friends' or coalesce(v_profile.profile_privacy->>'profile','friends')='everyone';
  return jsonb_build_object(
    'userId',v_profile.user_id,
    'apexId',v_profile.apex_id,
    'username',v_profile.username,
    'displayName',v_profile.display_name,
    'relationship',v_relationship,
    'limited',not v_can_view,
    'favouriteClub',case when v_can_view then v_profile.favourite_club else null end,
    'memberSince',case when v_can_view then v_profile.created_at else null end,
    'connectedSince',case when v_relationship='friends' then (
      select f.accepted_at from public.friendships f
      where f.status='accepted' and ((f.requester_id=p_user and f.recipient_id=p_target) or (f.requester_id=p_target and f.recipient_id=p_user))
    ) else null end
  );
end $$;

-- Friend Teams are deliberately separate from wider Clubs/community membership.
create table public.friend_teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(user_id) on delete restrict,
  name text not null check (char_length(trim(name)) between 3 and 32),
  tag text not null check (tag ~ '^[A-Z0-9]{3,5}$'),
  description text not null default '' check (char_length(description) <= 280),
  primary_color text not null default '#3578ff' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#e9bd63' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index friend_teams_name_lower_unique on public.friend_teams(lower(name)) where status='active';
create unique index friend_teams_tag_unique on public.friend_teams(tag) where status='active';
create index friend_teams_owner_idx on public.friend_teams(owner_id);

create table public.friend_team_members (
  team_id uuid not null references public.friend_teams(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  role text not null default 'member' check (role in ('captain','member')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  removed_by uuid references public.profiles(user_id) on delete set null,
  primary key (team_id,user_id),
  check (left_at is null or left_at >= joined_at)
);
create unique index friend_team_members_one_active_team on public.friend_team_members(user_id) where left_at is null;
create unique index friend_team_members_one_captain on public.friend_team_members(team_id) where role='captain' and left_at is null;
create index friend_team_members_team_active_idx on public.friend_team_members(team_id,joined_at) where left_at is null;
create index friend_team_members_removed_by_idx on public.friend_team_members(removed_by) where removed_by is not null;

create table public.friend_team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.friend_teams(id) on delete cascade,
  inviter_id uuid not null references public.profiles(user_id) on delete cascade,
  invitee_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '7 days'),
  responded_at timestamptz,
  check (inviter_id<>invitee_id),
  check (expires_at>created_at)
);
create unique index friend_team_invites_pending_unique on public.friend_team_invites(team_id,invitee_id) where status='pending';
create index friend_team_invites_invitee_pending_idx on public.friend_team_invites(invitee_id,created_at desc) where status='pending';
create index friend_team_invites_inviter_idx on public.friend_team_invites(inviter_id);

create trigger friend_teams_touch_updated_at before update on public.friend_teams
for each row execute function private.touch_updated_at();

-- Competition model: a competition has dated periods, typed entrants and historical scores.
create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,64}$'),
  name text not null check (char_length(trim(name)) between 3 and 80),
  scope text not null check (scope in ('friend_teams','clubs','collectors','mixed')),
  status text not null default 'draft' check (status in ('draft','scheduled','open','locked','scoring','finalised','cancelled')),
  primary_competition_code text,
  fallback_competition_code text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  rules jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at>starts_at)
);
create index competitions_status_dates_idx on public.competitions(status,starts_at,ends_at);
create index competitions_created_by_idx on public.competitions(created_by) where created_by is not null;

create table public.competition_periods (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  period_number integer not null check (period_number>0),
  name text not null check (char_length(trim(name)) between 1 and 80),
  status text not null default 'scheduled' check (status in ('scheduled','open','locked','scoring','finalised','cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  scoring_source_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_id,period_number),
  check (ends_at>starts_at)
);
create index competition_periods_status_dates_idx on public.competition_periods(status,starts_at,ends_at);

create table public.competition_entries (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  entrant_type text not null check (entrant_type in ('friend_team','club','collector')),
  friend_team_id uuid references public.friend_teams(id) on delete restrict,
  club_id uuid references public.clubs(id) on delete restrict,
  user_id uuid references public.profiles(user_id) on delete restrict,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  status text not null default 'registered' check (status in ('invited','registered','active','withdrawn','disqualified')),
  joined_at timestamptz not null default now(),
  total_score numeric(12,3) not null default 0,
  final_rank integer check (final_rank is null or final_rank>0),
  metadata jsonb not null default '{}'::jsonb,
  check (
    (entrant_type='friend_team' and friend_team_id is not null and club_id is null and user_id is null) or
    (entrant_type='club' and club_id is not null and friend_team_id is null and user_id is null) or
    (entrant_type='collector' and user_id is not null and friend_team_id is null and club_id is null)
  )
);
create unique index competition_entries_friend_team_unique on public.competition_entries(competition_id,friend_team_id) where friend_team_id is not null;
create unique index competition_entries_club_unique on public.competition_entries(competition_id,club_id) where club_id is not null;
create unique index competition_entries_collector_unique on public.competition_entries(competition_id,user_id) where user_id is not null;
create index competition_entries_standings_idx on public.competition_entries(competition_id,total_score desc,joined_at);
create index competition_entries_friend_team_idx on public.competition_entries(friend_team_id) where friend_team_id is not null;
create index competition_entries_club_idx on public.competition_entries(club_id) where club_id is not null;
create index competition_entries_user_idx on public.competition_entries(user_id) where user_id is not null;

create table public.competition_scores (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.competition_entries(id) on delete cascade,
  period_id uuid not null references public.competition_periods(id) on delete cascade,
  score numeric(12,3) not null default 0,
  provisional boolean not null default true,
  scoring_breakdown jsonb not null default '{}'::jsonb,
  source_verified_at timestamptz,
  calculated_at timestamptz not null default now(),
  unique (entry_id,period_id)
);
create index competition_scores_period_rank_idx on public.competition_scores(period_id,score desc,calculated_at);

create trigger competitions_touch_updated_at before update on public.competitions
for each row execute function private.touch_updated_at();
create trigger competition_periods_touch_updated_at before update on public.competition_periods
for each row execute function private.touch_updated_at();

-- Cached football data is server-written. Clients read a small safe status projection.
create table public.football_data_sources (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.sets(id) on delete cascade,
  provider_key text not null,
  competition_code text not null,
  source_role text not null check (source_role in ('primary','fallback')),
  priority smallint not null default 1 check (priority between 1 and 100),
  season text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (set_id,competition_code,source_role)
);
create unique index football_data_sources_one_primary on public.football_data_sources(set_id) where source_role='primary' and enabled;
create index football_data_sources_lookup_idx on public.football_data_sources(set_id,enabled,priority);

create table public.football_cache_state (
  source_id uuid primary key references public.football_data_sources(id) on delete cascade,
  status text not null default 'unconfigured' check (status in ('unconfigured','healthy','stale','error')),
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_verified_at timestamptz,
  retained_through timestamptz,
  consecutive_failures integer not null default 0 check (consecutive_failures>=0),
  message text,
  etag text,
  updated_at timestamptz not null default now(),
  check (last_verified_at is null or last_success_at is null or last_verified_at>=last_success_at)
);

alter table public.football_fixtures
  add column data_source_id uuid references public.football_data_sources(id) on delete set null,
  add column payload_hash text;
create index football_fixtures_source_kickoff_idx on public.football_fixtures(data_source_id,kickoff_at desc);

create table public.football_player_performances (
  fixture_id uuid not null references public.football_fixtures(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  minutes_played smallint check (minutes_played is null or minutes_played between 0 and 180),
  goals smallint not null default 0 check (goals>=0),
  assists smallint not null default 0 check (assists>=0),
  yellow_cards smallint not null default 0 check (yellow_cards>=0),
  red_cards smallint not null default 0 check (red_cards>=0),
  saves smallint not null default 0 check (saves>=0),
  rating numeric(4,2),
  raw_stats jsonb not null default '{}'::jsonb,
  verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (fixture_id,player_id)
);
create index football_player_performances_player_verified_idx on public.football_player_performances(player_id,verified_at desc);

create trigger football_data_sources_touch_updated_at before update on public.football_data_sources
for each row execute function private.touch_updated_at();
create trigger football_cache_state_touch_updated_at before update on public.football_cache_state
for each row execute function private.touch_updated_at();
create trigger football_player_performances_touch_updated_at before update on public.football_player_performances
for each row execute function private.touch_updated_at();

insert into public.football_data_sources(set_id,provider_key,competition_code,source_role,priority,season)
select id,'unconfigured','UCL','primary',1,season from public.sets where slug='debut-edition'
on conflict (set_id,competition_code,source_role) do nothing;

insert into public.football_data_sources(set_id,provider_key,competition_code,source_role,priority,season)
select id,'unconfigured','DOMESTIC_BY_CLUB','fallback',10,season from public.sets where slug='debut-edition'
on conflict (set_id,competition_code,source_role) do nothing;

insert into public.football_cache_state(source_id)
select id from public.football_data_sources
on conflict (source_id) do nothing;

-- Daily rewards now expose a configurable missed-day rule and explicit streak state.
create table public.daily_reward_settings (
  id boolean primary key default true check (id),
  continuity_mode text not null default 'reset_on_miss' check (continuity_mode in ('reset_on_miss','continue')),
  missed_day_tolerance smallint not null default 0 check (missed_day_tolerance between 0 and 30),
  cycle_length smallint not null default 7 check (cycle_length between 1 and 31),
  timezone_name text not null default 'UTC',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.daily_reward_settings(id) values(true) on conflict (id) do nothing;

alter table public.daily_reward_progress
  add column streak_count integer not null default 0 check (streak_count>=0),
  add column cycles_completed integer not null default 0 check (cycles_completed>=0),
  add column last_claimed_day smallint check (last_claimed_day is null or last_claimed_day between 1 and 7),
  add column next_eligible_at timestamptz;

update public.daily_reward_progress
set next_eligible_at=case when last_claim_date=current_date then date_trunc('day',now())+interval '1 day' else now() end
where next_eligible_at is null;

alter table public.daily_reward_progress alter column next_eligible_at set default now();
alter table public.daily_reward_progress alter column next_eligible_at set not null;

create trigger daily_reward_settings_touch_updated_at before update on public.daily_reward_settings
for each row execute function private.touch_updated_at();

alter table public.friend_teams enable row level security;
alter table public.friend_team_members enable row level security;
alter table public.friend_team_invites enable row level security;
alter table public.competitions enable row level security;
alter table public.competition_periods enable row level security;
alter table public.competition_entries enable row level security;
alter table public.competition_scores enable row level security;
alter table public.football_data_sources enable row level security;
alter table public.football_cache_state enable row level security;
alter table public.football_player_performances enable row level security;
alter table public.daily_reward_settings enable row level security;

create policy friend_teams_participant_read on public.friend_teams for select to authenticated
using (exists(select 1 from public.friend_team_members m where m.team_id=friend_teams.id and m.user_id=(select auth.uid()) and m.left_at is null));
create policy friend_team_members_participant_read on public.friend_team_members for select to authenticated
using ((select auth.uid())=user_id);
create policy friend_team_invites_participant_read on public.friend_team_invites for select to authenticated
using ((select auth.uid()) in (inviter_id,invitee_id));
create policy competitions_published_read on public.competitions for select to authenticated
using (status<>'draft');
create policy competition_periods_published_read on public.competition_periods for select to authenticated
using (exists(select 1 from public.competitions c where c.id=competition_periods.competition_id and c.status<>'draft'));
create policy competition_entries_published_read on public.competition_entries for select to authenticated
using (exists(select 1 from public.competitions c where c.id=competition_entries.competition_id and c.status<>'draft'));
create policy competition_scores_published_read on public.competition_scores for select to authenticated
using (exists(select 1 from public.competition_entries e join public.competitions c on c.id=e.competition_id where e.id=competition_scores.entry_id and c.status<>'draft'));
create policy football_sources_enabled_read on public.football_data_sources for select to authenticated using (enabled);
create policy football_cache_state_enabled_read on public.football_cache_state for select to authenticated
using (exists(select 1 from public.football_data_sources s where s.id=football_cache_state.source_id and s.enabled));
create policy football_performances_verified_read on public.football_player_performances for select to authenticated
using (verified_at<=now());
create policy daily_reward_settings_active_read on public.daily_reward_settings for select to authenticated using (active);

revoke all on table
  public.friend_teams,
  public.friend_team_members,
  public.friend_team_invites,
  public.competitions,
  public.competition_periods,
  public.competition_entries,
  public.competition_scores,
  public.football_data_sources,
  public.football_cache_state,
  public.football_player_performances,
  public.daily_reward_settings
from anon, authenticated;

grant select,insert,update,delete on table
  public.friend_teams,
  public.friend_team_members,
  public.friend_team_invites,
  public.competitions,
  public.competition_periods,
  public.competition_entries,
  public.competition_scores,
  public.football_data_sources,
  public.football_cache_state,
  public.football_player_performances,
  public.daily_reward_settings
to service_role;

create or replace function private.api_friend_team_status(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_team_id uuid; v_team jsonb; v_invites jsonb; v_available jsonb; v_role text;
begin
  perform private.api_assert_user(p_user);
  select m.team_id,m.role into v_team_id,v_role
  from public.friend_team_members m join public.friend_teams t on t.id=m.team_id
  where m.user_id=p_user and m.left_at is null and t.status='active'
  order by m.joined_at limit 1;

  if v_team_id is not null then
    select jsonb_build_object(
      'id',t.id,'name',t.name,'tag',t.tag,'description',t.description,
      'primaryColor',t.primary_color,'secondaryColor',t.secondary_color,
      'ownerId',t.owner_id,'myRole',v_role,'createdAt',t.created_at,
      'members',coalesce((
        select jsonb_agg(jsonb_build_object(
          'userId',m.user_id,'role',m.role,'joinedAt',m.joined_at,
          'apexId',p.apex_id,'username',p.username,'displayName',p.display_name
        ) order by case when m.role='captain' then 0 else 1 end,coalesce(p.display_name,p.username::text))
        from public.friend_team_members m join public.profiles p on p.user_id=m.user_id
        where m.team_id=t.id and m.left_at is null
      ),'[]'::jsonb),
      'outgoingInvites',case when v_role='captain' then coalesce((
        select jsonb_agg(jsonb_build_object(
          'inviteId',i.id,'userId',i.invitee_id,'apexId',p.apex_id,
          'username',p.username,'displayName',p.display_name,'expiresAt',i.expires_at
        ) order by i.created_at desc)
        from public.friend_team_invites i join public.profiles p on p.user_id=i.invitee_id
        where i.team_id=t.id and i.status='pending' and i.expires_at>now()
      ),'[]'::jsonb) else '[]'::jsonb end
    ) into v_team from public.friend_teams t where t.id=v_team_id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'inviteId',i.id,'teamId',t.id,'teamName',t.name,'teamTag',t.tag,
    'inviterId',i.inviter_id,'inviterName',coalesce(p.display_name,p.username::text,p.apex_id),
    'expiresAt',i.expires_at
  ) order by i.created_at desc),'[]'::jsonb)
  into v_invites
  from public.friend_team_invites i
  join public.friend_teams t on t.id=i.team_id and t.status='active'
  join public.profiles p on p.user_id=i.inviter_id
  where i.invitee_id=p_user and i.status='pending' and i.expires_at>now();

  if v_team_id is not null and v_role='captain' then
    with friend_ids as (
      select case when f.requester_id=p_user then f.recipient_id else f.requester_id end as user_id
      from public.friendships f
      where f.status='accepted' and (f.requester_id=p_user or f.recipient_id=p_user)
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'userId',p.user_id,'apexId',p.apex_id,'username',p.username,'displayName',p.display_name
    ) order by coalesce(p.display_name,p.username::text)),'[]'::jsonb)
    into v_available
    from friend_ids f join public.profiles p on p.user_id=f.user_id
    where not exists(select 1 from public.friend_team_members m where m.user_id=f.user_id and m.left_at is null)
      and not exists(select 1 from public.friend_team_invites i where i.team_id=v_team_id and i.invitee_id=f.user_id and i.status='pending' and i.expires_at>now());
  else
    v_available:='[]'::jsonb;
  end if;

  return jsonb_build_object('team',v_team,'invitations',v_invites,'availableFriends',v_available);
end $$;

create or replace function private.api_friend_team_create(p_user uuid, p_name text, p_tag text, p_description text, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_team_id uuid; v_response jsonb; v_tag text:=upper(trim(p_tag));
begin
  perform private.api_assert_user(p_user);
  if nullif(trim(p_key),'') is null then raise exception using errcode='22023',message='Missing idempotency key'; end if;
  select response into v_response from private.idempotency_keys where user_id=p_user and idempotency_key=p_key;
  if v_response is not null then return v_response; end if;
  if char_length(trim(coalesce(p_name,''))) not between 3 and 32 then raise exception using errcode='22023',message='Team name must be 3–32 characters'; end if;
  if v_tag !~ '^[A-Z0-9]{3,5}$' then raise exception using errcode='22023',message='Team tag must be 3–5 letters or numbers'; end if;
  if char_length(coalesce(p_description,''))>280 then raise exception using errcode='22023',message='Description must be 280 characters or fewer'; end if;
  if exists(select 1 from public.friend_team_members where user_id=p_user and left_at is null) then raise exception using errcode='23505',message='You already belong to a Friend Team'; end if;
  insert into public.friend_teams(owner_id,name,tag,description)
    values(p_user,trim(p_name),v_tag,trim(coalesce(p_description,''))) returning id into v_team_id;
  insert into public.friend_team_members(team_id,user_id,role) values(v_team_id,p_user,'captain');
  v_response:=private.api_friend_team_status(p_user);
  insert into private.idempotency_keys(user_id,idempotency_key,action,response) values(p_user,p_key,'friend_team_create',v_response);
  return v_response;
exception when unique_violation then
  raise exception using errcode='23505',message='That team name or tag is already in use';
end $$;

create or replace function private.api_friend_team_invite(p_user uuid, p_team uuid, p_target uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_invite uuid; v_response jsonb;
begin
  perform private.api_assert_user(p_user);
  if nullif(trim(p_key),'') is null then raise exception using errcode='22023',message='Missing idempotency key'; end if;
  select response into v_response from private.idempotency_keys where user_id=p_user and idempotency_key=p_key;
  if v_response is not null then return v_response; end if;
  if not exists(select 1 from public.friend_team_members m join public.friend_teams t on t.id=m.team_id where m.team_id=p_team and m.user_id=p_user and m.role='captain' and m.left_at is null and t.status='active') then
    raise exception using errcode='42501',message='Only the team captain can invite friends';
  end if;
  if not private.api_are_friends(p_user,p_target) then raise exception using errcode='42501',message='Only current friends can be invited'; end if;
  if exists(select 1 from public.friend_team_members where user_id=p_target and left_at is null) then raise exception using errcode='23505',message='That friend already belongs to a Friend Team'; end if;
  if (select count(*) from public.friend_team_members where team_id=p_team and left_at is null)>=20 then raise exception using errcode='23514',message='Friend Team member limit reached'; end if;
  insert into public.friend_team_invites(team_id,inviter_id,invitee_id)
    values(p_team,p_user,p_target)
    on conflict (team_id,invitee_id) where status='pending'
    do update set inviter_id=excluded.inviter_id,created_at=now(),expires_at=now()+interval '7 days'
    returning id into v_invite;
  insert into public.notifications(user_id,notification_type,title,body,payload)
    values(p_target,'friend_team_invite','Friend Team invitation','A friend invited you to their APEX team.',jsonb_build_object('teamId',p_team,'inviteId',v_invite));
  v_response:=jsonb_build_object('inviteId',v_invite,'status','pending');
  insert into private.idempotency_keys(user_id,idempotency_key,action,response) values(p_user,p_key,'friend_team_invite',v_response);
  return v_response;
end $$;

create or replace function private.api_friend_team_respond(p_user uuid, p_invite uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_invite public.friend_team_invites%rowtype;
begin
  perform private.api_assert_user(p_user);
  select * into v_invite from public.friend_team_invites where id=p_invite and invitee_id=p_user and status='pending' for update;
  if v_invite.id is null or v_invite.expires_at<=now() then
    if v_invite.id is not null then update public.friend_team_invites set status='expired',responded_at=now() where id=v_invite.id; end if;
    raise exception using errcode='42501',message='Team invitation is unavailable';
  end if;
  if not p_accept then
    update public.friend_team_invites set status='declined',responded_at=now() where id=p_invite;
    return private.api_friend_team_status(p_user);
  end if;
  if exists(select 1 from public.friend_team_members where user_id=p_user and left_at is null) then raise exception using errcode='23505',message='Leave your current Friend Team first'; end if;
  if not private.api_are_friends(p_user,v_invite.inviter_id) then raise exception using errcode='42501',message='You must still be friends with the inviter'; end if;
  if not exists(select 1 from public.friend_teams where id=v_invite.team_id and status='active') then raise exception using errcode='23503',message='Friend Team is unavailable'; end if;
  if (select count(*) from public.friend_team_members where team_id=v_invite.team_id and left_at is null)>=20 then raise exception using errcode='23514',message='Friend Team member limit reached'; end if;
  insert into public.friend_team_members(team_id,user_id,role,joined_at,left_at,removed_by)
    values(v_invite.team_id,p_user,'member',now(),null,null)
    on conflict (team_id,user_id) do update set role='member',joined_at=now(),left_at=null,removed_by=null;
  update public.friend_team_invites set status='accepted',responded_at=now() where id=p_invite;
  update public.friend_team_invites set status='cancelled',responded_at=now() where invitee_id=p_user and id<>p_invite and status='pending';
  insert into public.notifications(user_id,notification_type,title,body,payload)
    values(v_invite.inviter_id,'friend_team_joined','Friend joined your team','Your Friend Team has a new member.',jsonb_build_object('teamId',v_invite.team_id,'userId',p_user));
  return private.api_friend_team_status(p_user);
end $$;

create or replace function private.api_friend_team_cancel_invite(p_user uuid, p_invite uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.api_assert_user(p_user);
  update public.friend_team_invites i set status='cancelled',responded_at=now()
  where i.id=p_invite and i.status='pending' and exists(
    select 1 from public.friend_team_members m
    where m.team_id=i.team_id and m.user_id=p_user and m.role='captain' and m.left_at is null
  );
  if not found then raise exception using errcode='42501',message='Team invitation is unavailable'; end if;
  return private.api_friend_team_status(p_user);
end $$;

create or replace function private.api_friend_team_leave(p_user uuid, p_team uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_role text; v_members integer;
begin
  perform private.api_assert_user(p_user);
  select role into v_role from public.friend_team_members where team_id=p_team and user_id=p_user and left_at is null for update;
  if v_role is null then raise exception using errcode='42501',message='You are not an active member of that Friend Team'; end if;
  select count(*) into v_members from public.friend_team_members where team_id=p_team and left_at is null;
  if v_role='captain' and v_members>1 then raise exception using errcode='23514',message='Remove the other members before archiving your Friend Team'; end if;
  update public.friend_team_members set left_at=now() where team_id=p_team and user_id=p_user;
  if v_role='captain' then
    update public.friend_teams set status='archived' where id=p_team;
    update public.friend_team_invites set status='cancelled',responded_at=now() where team_id=p_team and status='pending';
  end if;
  return private.api_friend_team_status(p_user);
end $$;

create or replace function private.api_friend_team_remove_member(p_user uuid, p_team uuid, p_target uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.api_assert_user(p_user);
  if p_target=p_user then raise exception using errcode='22023',message='Use Leave Team to archive your own team'; end if;
  if not exists(select 1 from public.friend_team_members where team_id=p_team and user_id=p_user and role='captain' and left_at is null) then
    raise exception using errcode='42501',message='Only the team captain can remove members';
  end if;
  update public.friend_team_members set left_at=now(),removed_by=p_user
  where team_id=p_team and user_id=p_target and role='member' and left_at is null;
  if not found then raise exception using errcode='23503',message='Team member not found'; end if;
  insert into public.notifications(user_id,notification_type,title,body,payload)
    values(p_target,'friend_team_removed','Friend Team membership ended','The team captain removed you from their Friend Team.',jsonb_build_object('teamId',p_team));
  return private.api_friend_team_status(p_user);
end $$;

create or replace function private.api_competition_overview(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.api_assert_user(p_user);
  return jsonb_build_object(
    'competitions',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,'slug',c.slug,'name',c.name,'scope',c.scope,'status',c.status,
        'startsAt',c.starts_at,'endsAt',c.ends_at,
        'primaryCompetitionCode',c.primary_competition_code,
        'fallbackCompetitionCode',c.fallback_competition_code,
        'entrantCount',(select count(*) from public.competition_entries e where e.competition_id=c.id and e.status in ('registered','active')),
        'periods',coalesce((select jsonb_agg(jsonb_build_object(
          'id',p.id,'number',p.period_number,'name',p.name,'status',p.status,
          'startsAt',p.starts_at,'endsAt',p.ends_at,'scoringSourceCode',p.scoring_source_code
        ) order by p.period_number) from public.competition_periods p where p.competition_id=c.id),'[]'::jsonb),
        'standings',coalesce((select jsonb_agg(jsonb_build_object(
          'entryId',e.id,'name',e.display_name,'entrantType',e.entrant_type,
          'score',e.total_score,'rank',e.final_rank,'status',e.status
        ) order by coalesce(e.final_rank,2147483647),e.total_score desc,e.joined_at) from public.competition_entries e where e.competition_id=c.id and e.status not in ('withdrawn','disqualified')),'[]'::jsonb)
      ) order by c.starts_at desc)
      from public.competitions c where c.status<>'draft'
    ),'[]'::jsonb),
    'footballCache',coalesce((
      select jsonb_agg(jsonb_build_object(
        'setName',st.name,'role',s.source_role,'competitionCode',s.competition_code,
        'providerConfigured',s.provider_key<>'unconfigured','status',cs.status,
        'lastVerifiedAt',cs.last_verified_at,'lastSuccessfulAt',cs.last_success_at,
        'retainedThrough',cs.retained_through
      ) order by st.name,s.priority)
      from public.football_data_sources s
      join public.sets st on st.id=s.set_id
      join public.football_cache_state cs on cs.source_id=s.id
      where s.enabled
    ),'[]'::jsonb)
  );
end $$;

create or replace function private.api_prepare_daily_progress(p_user uuid)
returns public.daily_reward_progress language plpgsql security definer set search_path = '' as $$
declare v_progress public.daily_reward_progress%rowtype; v_settings public.daily_reward_settings%rowtype; v_today date;
begin
  perform private.api_assert_user(p_user);
  select * into v_settings from public.daily_reward_settings where id=true and active;
  if v_settings.id is null then raise exception using errcode='55000',message='Daily rewards are unavailable'; end if;
  v_today:=(now() at time zone v_settings.timezone_name)::date;
  insert into public.daily_reward_progress(user_id,next_eligible_at) values(p_user,now()) on conflict (user_id) do nothing;
  select * into v_progress from public.daily_reward_progress where user_id=p_user for update;
  if v_settings.continuity_mode='reset_on_miss'
    and v_progress.last_claim_date is not null
    and v_today>v_progress.last_claim_date+(v_settings.missed_day_tolerance+1) then
    update public.daily_reward_progress
      set current_day=1,streak_count=0,last_claimed_day=null,next_eligible_at=now()
      where user_id=p_user returning * into v_progress;
  end if;
  return v_progress;
end $$;

create or replace function private.api_daily_reward_status(p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_progress public.daily_reward_progress%rowtype; v_reward public.reward_definitions%rowtype; v_settings public.daily_reward_settings%rowtype; v_today date; v_claimed boolean; v_display_day smallint;
begin
  v_progress:=private.api_prepare_daily_progress(p_user);
  select * into v_settings from public.daily_reward_settings where id=true and active;
  v_today:=(now() at time zone v_settings.timezone_name)::date;
  v_claimed:=v_progress.last_claim_date=v_today;
  v_display_day:=case when v_claimed then coalesce(v_progress.last_claimed_day,v_progress.current_day) else v_progress.current_day end;
  select * into v_reward from public.reward_definitions where reward_key='daily_day_'||v_display_day and active;
  return jsonb_build_object(
    'currentDay',v_display_day,'nextDay',v_progress.current_day,
    'alreadyClaimed',v_claimed,'lastClaimDate',v_progress.last_claim_date,
    'streak',v_progress.streak_count,'cyclesCompleted',v_progress.cycles_completed,
    'nextEligibleAt',v_progress.next_eligible_at,'continuityMode',v_settings.continuity_mode,
    'reward',jsonb_build_object('key',v_reward.reward_key,'name',v_reward.display_name,'payload',v_reward.payload),
    'track',(select jsonb_agg(jsonb_build_object('day',substring(reward_key from '[0-9]+$')::int,'key',reward_key,'name',display_name,'payload',payload) order by substring(reward_key from '[0-9]+$')::int) from public.reward_definitions where category='daily_login' and active)
  );
end $$;

create or replace function private.api_claim_daily_reward(p_user uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_progress public.daily_reward_progress%rowtype; v_reward public.reward_definitions%rowtype; v_response jsonb; v_settings public.daily_reward_settings%rowtype; v_today date; v_next timestamptz;
begin
  if nullif(trim(p_key),'') is null then raise exception using errcode='22023',message='Missing idempotency key'; end if;
  select response into v_response from private.idempotency_keys where user_id=p_user and idempotency_key=p_key;
  if v_response is not null then return v_response; end if;
  v_progress:=private.api_prepare_daily_progress(p_user);
  select * into v_settings from public.daily_reward_settings where id=true and active;
  v_today:=(now() at time zone v_settings.timezone_name)::date;
  if v_progress.last_claim_date=v_today or v_progress.next_eligible_at>now() then raise exception using errcode='23505',message='Daily reward already claimed'; end if;
  select * into v_reward from public.reward_definitions where reward_key='daily_day_'||v_progress.current_day and active for update;
  if v_reward.reward_key is null then raise exception using errcode='23503',message='Daily reward is unavailable'; end if;
  insert into public.reward_grants(user_id,reward_key,source_key,payload) values(p_user,v_reward.reward_key,'daily:'||v_today,v_reward.payload);
  perform private.api_grant_reward(p_user,v_reward.payload,'daily_login:'||v_reward.reward_key,p_key);
  v_next:=((v_today+1)::timestamp at time zone v_settings.timezone_name);
  update public.daily_reward_progress set
    last_claim_date=v_today,last_claimed_at=now(),last_claimed_day=v_progress.current_day,
    total_claims=total_claims+1,streak_count=streak_count+1,
    cycles_completed=cycles_completed+case when v_progress.current_day=v_settings.cycle_length then 1 else 0 end,
    current_day=case when v_progress.current_day=v_settings.cycle_length then 1 else v_progress.current_day+1 end,
    next_eligible_at=v_next,updated_at=now()
  where user_id=p_user;
  insert into public.notifications(user_id,notification_type,title,body,payload)
    values(p_user,'daily_reward','Daily reward claimed',v_reward.display_name,v_reward.payload);
  v_response:=jsonb_build_object('claimed',true,'reward',jsonb_build_object('key',v_reward.reward_key,'name',v_reward.display_name,'payload',v_reward.payload),'daily',private.api_daily_reward_status(p_user));
  insert into private.idempotency_keys(user_id,idempotency_key,action,response) values(p_user,p_key,'daily_reward_claim',v_response);
  return v_response;
end $$;

create or replace function public.api_friend_cancel(p_user uuid,p_friendship uuid) returns jsonb language sql security definer set search_path = '' as $$ select private.api_friend_cancel(p_user,p_friendship) $$;
create or replace function public.api_social_profile(p_user uuid,p_target uuid) returns jsonb language sql stable security definer set search_path = '' as $$ select private.api_social_profile(p_user,p_target) $$;
create or replace function public.api_friend_team_status(p_user uuid) returns jsonb language sql stable security definer set search_path = '' as $$ select private.api_friend_team_status(p_user) $$;
create or replace function public.api_friend_team_create(p_user uuid,p_name text,p_tag text,p_description text,p_key text) returns jsonb language sql security definer set search_path = '' as $$ select private.api_friend_team_create(p_user,p_name,p_tag,p_description,p_key) $$;
create or replace function public.api_friend_team_invite(p_user uuid,p_team uuid,p_target uuid,p_key text) returns jsonb language sql security definer set search_path = '' as $$ select private.api_friend_team_invite(p_user,p_team,p_target,p_key) $$;
create or replace function public.api_friend_team_respond(p_user uuid,p_invite uuid,p_accept boolean) returns jsonb language sql security definer set search_path = '' as $$ select private.api_friend_team_respond(p_user,p_invite,p_accept) $$;
create or replace function public.api_friend_team_cancel_invite(p_user uuid,p_invite uuid) returns jsonb language sql security definer set search_path = '' as $$ select private.api_friend_team_cancel_invite(p_user,p_invite) $$;
create or replace function public.api_friend_team_leave(p_user uuid,p_team uuid) returns jsonb language sql security definer set search_path = '' as $$ select private.api_friend_team_leave(p_user,p_team) $$;
create or replace function public.api_friend_team_remove_member(p_user uuid,p_team uuid,p_target uuid) returns jsonb language sql security definer set search_path = '' as $$ select private.api_friend_team_remove_member(p_user,p_team,p_target) $$;
create or replace function public.api_competition_overview(p_user uuid) returns jsonb language sql stable security definer set search_path = '' as $$ select private.api_competition_overview(p_user) $$;

revoke all on function
  public.api_friend_cancel(uuid,uuid),
  public.api_social_profile(uuid,uuid),
  public.api_friend_team_status(uuid),
  public.api_friend_team_create(uuid,text,text,text,text),
  public.api_friend_team_invite(uuid,uuid,uuid,text),
  public.api_friend_team_respond(uuid,uuid,boolean),
  public.api_friend_team_cancel_invite(uuid,uuid),
  public.api_friend_team_leave(uuid,uuid),
  public.api_friend_team_remove_member(uuid,uuid,uuid),
  public.api_competition_overview(uuid)
from public,anon,authenticated;

grant execute on function
  public.api_friend_cancel(uuid,uuid),
  public.api_social_profile(uuid,uuid),
  public.api_friend_team_status(uuid),
  public.api_friend_team_create(uuid,text,text,text,text),
  public.api_friend_team_invite(uuid,uuid,uuid,text),
  public.api_friend_team_respond(uuid,uuid,boolean),
  public.api_friend_team_cancel_invite(uuid,uuid),
  public.api_friend_team_leave(uuid,uuid),
  public.api_friend_team_remove_member(uuid,uuid,uuid),
  public.api_competition_overview(uuid)
to service_role;

revoke all on function private.api_friend_cancel(uuid,uuid),private.api_social_profile(uuid,uuid),private.api_friend_team_status(uuid),private.api_friend_team_create(uuid,text,text,text,text),private.api_friend_team_invite(uuid,uuid,uuid,text),private.api_friend_team_respond(uuid,uuid,boolean),private.api_friend_team_cancel_invite(uuid,uuid),private.api_friend_team_leave(uuid,uuid),private.api_friend_team_remove_member(uuid,uuid,uuid),private.api_competition_overview(uuid),private.api_prepare_daily_progress(uuid) from public,anon,authenticated;
grant execute on function private.api_friend_cancel(uuid,uuid),private.api_social_profile(uuid,uuid),private.api_friend_team_status(uuid),private.api_friend_team_create(uuid,text,text,text,text),private.api_friend_team_invite(uuid,uuid,uuid,text),private.api_friend_team_respond(uuid,uuid,boolean),private.api_friend_team_cancel_invite(uuid,uuid),private.api_friend_team_leave(uuid,uuid),private.api_friend_team_remove_member(uuid,uuid,uuid),private.api_competition_overview(uuid),private.api_prepare_daily_progress(uuid) to service_role;

commit;
