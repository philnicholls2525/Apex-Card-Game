begin;

-- APEX Social, Clubs and Rewards Foundation
-- Additive only: existing accounts, cards, packs, wallets and opening records are untouched.

alter table public.profiles
  add column if not exists apex_id text unique,
  add column if not exists favourite_club text,
  add column if not exists profile_privacy jsonb not null default '{"profile":"friends","presence":"friends","club":"everyone","showcase":"everyone"}'::jsonb;

update public.profiles
  set apex_id = 'APX-' || upper(substr(replace(user_id::text, '-', ''), 1, 8))
  where apex_id is null;

alter table public.profiles
  alter column apex_id set default ('APX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  alter column apex_id set not null;

create table if not exists public.user_presence (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  state text not null default 'offline' check (state in ('online','packs','collection','market','match','club','offline')),
  last_active_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_showcase_cards (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  card_definition_id uuid not null references public.card_definitions(id) on delete cascade,
  position smallint not null check (position between 1 and 6),
  created_at timestamptz not null default now(),
  primary key (user_id, card_definition_id),
  unique (user_id, position)
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(user_id) on delete cascade,
  blocked_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(user_id) on delete cascade,
  reported_user_id uuid references public.profiles(user_id) on delete set null,
  report_type text not null check (report_type in ('profile','message','club','other')),
  reason text not null check (char_length(trim(reason)) between 3 and 1000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(user_id) on delete set null
);

create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  first_user_id uuid not null references public.profiles(user_id) on delete cascade,
  second_user_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (first_user_id < second_user_id),
  unique (first_user_id, second_user_id)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(user_id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_by_sender_at timestamptz,
  reported_at timestamptz
);

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(user_id) on delete restrict,
  name text not null check (char_length(trim(name)) between 3 and 32),
  tag text not null unique check (tag ~ '^[A-Z0-9]{3,5}$'),
  description text not null default '' check (char_length(description) <= 500),
  motto text check (char_length(motto) <= 80),
  badge jsonb not null default '{}'::jsonb,
  primary_color text not null default '#3578ff' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#e9bd63' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  join_mode text not null default 'request' check (join_mode in ('open','request','invite')),
  status text not null default 'active' check (status in ('active','restricted','dissolved')),
  level integer not null default 1 check (level >= 1),
  xp bigint not null default 0 check (xp >= 0),
  tokens bigint not null default 0 check (tokens >= 0),
  founded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists clubs_name_lower_unique on public.clubs (lower(name));

create table if not exists public.club_members (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  role text not null default 'member' check (role in ('owner','co_owner','officer','member')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  contribution_xp bigint not null default 0 check (contribution_xp >= 0),
  last_contribution_at timestamptz,
  primary key (club_id, user_id)
);
create unique index if not exists club_members_one_active_club on public.club_members(user_id) where left_at is null;

create table if not exists public.club_join_requests (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(user_id) on delete set null,
  unique (club_id, user_id, status)
);

create table if not exists public.club_invites (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  inviter_id uuid not null references public.profiles(user_id) on delete cascade,
  invitee_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  responded_at timestamptz,
  unique (club_id, invitee_id, status)
);

create table if not exists public.club_activity (
  id bigint generated always as identity primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  actor_id uuid references public.profiles(user_id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.club_messages (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  sender_id uuid references public.profiles(user_id) on delete set null,
  message_type text not null default 'message' check (message_type in ('message','announcement','system')),
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.reward_definitions (
  reward_key text primary key,
  category text not null check (category in ('daily_login','competition','club','objective','admin')),
  display_name text not null,
  payload jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_reward_progress (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  current_day smallint not null default 1 check (current_day between 1 and 7),
  last_claim_date date,
  last_claimed_at timestamptz,
  total_claims integer not null default 0 check (total_claims >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.reward_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  reward_key text not null references public.reward_definitions(reward_key),
  source_key text not null,
  payload jsonb not null,
  granted_at timestamptz not null default now(),
  unique (user_id, reward_key, source_key)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.competition_rules (
  rule_key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.competition_weeks (
  id uuid primary key default gen_random_uuid(),
  set_id uuid references public.sets(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','open','locked','provisional','finalised','cancelled')),
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.competition_squads (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.competition_weeks(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  formation text not null,
  captain_card_definition_id uuid references public.card_definitions(id) on delete set null,
  vice_captain_card_definition_id uuid references public.card_definitions(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','submitted','incomplete','finalised')),
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (week_id, user_id)
);

create table if not exists public.competition_squad_slots (
  squad_id uuid not null references public.competition_squads(id) on delete cascade,
  slot_key text not null,
  card_definition_id uuid references public.card_definitions(id) on delete set null,
  is_substitute boolean not null default false,
  locked_at timestamptz,
  primary key (squad_id, slot_key)
);

create table if not exists public.football_player_mappings (
  player_id uuid primary key references public.players(id) on delete cascade,
  provider_player_id bigint unique,
  provider_team_id bigint,
  position text,
  updated_at timestamptz not null default now()
);

create table if not exists public.football_fixtures (
  id uuid primary key default gen_random_uuid(),
  provider_fixture_id bigint unique,
  competition_code text not null,
  kickoff_at timestamptz not null,
  status text not null default 'scheduled',
  home_team text,
  away_team text,
  payload jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.football_sync_log (
  id bigint generated always as identity primary key,
  sync_type text not null,
  status text not null check (status in ('started','success','failed','partial')),
  request_count integer not null default 0,
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.reward_definitions (reward_key, category, display_name, payload)
values
  ('daily_day_1','daily_login','Day 1: Coins','{"coins":1000}'::jsonb),
  ('daily_day_2','daily_login','Day 2: Normal Pack','{"packs":{"normal":1}}'::jsonb),
  ('daily_day_3','daily_login','Day 3: Coins + XP','{"coins":1500,"xp":250}'::jsonb),
  ('daily_day_4','daily_login','Day 4: Plus Pack','{"packs":{"plus":1}}'::jsonb),
  ('daily_day_5','daily_login','Day 5: Coins + XP','{"coins":2500,"xp":500}'::jsonb),
  ('daily_day_6','daily_login','Day 6: Premium Pack','{"packs":{"premium":1}}'::jsonb),
  ('daily_day_7','daily_login','Day 7: Elite Pack','{"packs":{"elite":1}}'::jsonb)
on conflict (reward_key) do update set display_name=excluded.display_name, payload=excluded.payload, updated_at=now();

insert into public.competition_rules (rule_key, value)
values
  ('squad_shape','{"starters":5,"substitutes":2,"future_shapes":[{"starters":7,"substitutes":3},{"starters":11,"substitutes":5}]}'::jsonb),
  ('captain_multiplier','1.25'::jsonb),
  ('club_member_cap','20'::jsonb),
  ('club_join_cooldown_hours','48'::jsonb)
on conflict (rule_key) do nothing;

alter table public.user_presence enable row level security;
alter table public.profile_showcase_cards enable row level security;
alter table public.user_blocks enable row level security;
alter table public.user_reports enable row level security;
alter table public.direct_conversations enable row level security;
alter table public.direct_messages enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.club_join_requests enable row level security;
alter table public.club_invites enable row level security;
alter table public.club_activity enable row level security;
alter table public.club_messages enable row level security;
alter table public.reward_definitions enable row level security;
alter table public.daily_reward_progress enable row level security;
alter table public.reward_grants enable row level security;
alter table public.notifications enable row level security;
alter table public.competition_rules enable row level security;
alter table public.competition_weeks enable row level security;
alter table public.competition_squads enable row level security;
alter table public.competition_squad_slots enable row level security;
alter table public.football_player_mappings enable row level security;
alter table public.football_fixtures enable row level security;
alter table public.football_sync_log enable row level security;

create policy daily_progress_read_self on public.daily_reward_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy reward_grants_read_self on public.reward_grants for select to authenticated using ((select auth.uid()) = user_id);
create policy notifications_read_self on public.notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy club_discovery_read on public.clubs for select to authenticated using (status = 'active');
create policy club_activity_member_read on public.club_activity for select to authenticated using (exists (select 1 from public.club_members m where m.club_id=club_activity.club_id and m.user_id=(select auth.uid()) and m.left_at is null));
create policy club_messages_member_read on public.club_messages for select to authenticated using (exists (select 1 from public.club_members m where m.club_id=club_messages.club_id and m.user_id=(select auth.uid()) and m.left_at is null));
create policy club_members_member_read on public.club_members for select to authenticated using (exists (select 1 from public.club_members mine where mine.club_id=club_members.club_id and mine.user_id=(select auth.uid()) and mine.left_at is null));
create policy own_blocks_read on public.user_blocks for select to authenticated using ((select auth.uid())=blocker_id);
create policy own_reports_read on public.user_reports for select to authenticated using ((select auth.uid())=reporter_id);
create policy direct_conversations_participant_read on public.direct_conversations for select to authenticated using ((select auth.uid()) in (first_user_id, second_user_id));
create policy direct_messages_participant_read on public.direct_messages for select to authenticated using (exists (select 1 from public.direct_conversations c where c.id=direct_messages.conversation_id and (select auth.uid()) in (c.first_user_id,c.second_user_id)));
create policy own_squad_read on public.competition_squads for select to authenticated using ((select auth.uid())=user_id);
create policy own_squad_slots_read on public.competition_squad_slots for select to authenticated using (exists (select 1 from public.competition_squads s where s.id=competition_squad_slots.squad_id and s.user_id=(select auth.uid())));

create or replace function private.api_daily_reward_status(p_user uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_progress public.daily_reward_progress%rowtype; v_reward public.reward_definitions%rowtype;
begin
  perform private.api_assert_user(p_user);
  insert into public.daily_reward_progress(user_id) values (p_user) on conflict (user_id) do nothing;
  select * into v_progress from public.daily_reward_progress where user_id=p_user;
  select * into v_reward from public.reward_definitions where reward_key='daily_day_' || v_progress.current_day and active;
  return jsonb_build_object(
    'currentDay',v_progress.current_day,
    'alreadyClaimed',v_progress.last_claim_date=current_date,
    'lastClaimDate',v_progress.last_claim_date,
    'reward',jsonb_build_object('key',v_reward.reward_key,'name',v_reward.display_name,'payload',v_reward.payload),
    'track',(select jsonb_agg(jsonb_build_object('day',substring(reward_key from '[0-9]+$')::int,'key',reward_key,'name',display_name,'payload',payload) order by reward_key) from public.reward_definitions where category='daily_login' and active)
  );
end $$;

create or replace function private.api_claim_daily_reward(p_user uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_progress public.daily_reward_progress%rowtype; v_reward public.reward_definitions%rowtype; v_response jsonb;
begin
  if nullif(trim(p_key),'') is null then raise exception using errcode='22023',message='Missing idempotency key'; end if;
  select response into v_response from private.idempotency_keys where user_id=p_user and idempotency_key=p_key;
  if v_response is not null then return v_response; end if;
  perform private.api_assert_user(p_user);
  insert into public.daily_reward_progress(user_id) values (p_user) on conflict (user_id) do nothing;
  select * into v_progress from public.daily_reward_progress where user_id=p_user for update;
  if v_progress.last_claim_date=current_date then raise exception using errcode='23505',message='Daily reward already claimed'; end if;
  select * into v_reward from public.reward_definitions where reward_key='daily_day_' || v_progress.current_day and active for update;
  if v_reward.reward_key is null then raise exception using errcode='23503',message='Daily reward is unavailable'; end if;
  insert into public.reward_grants(user_id,reward_key,source_key,payload) values (p_user,v_reward.reward_key,'daily:' || current_date,v_reward.payload);
  perform private.api_grant_reward(p_user,v_reward.payload,'daily_login:' || v_reward.reward_key,p_key);
  update public.daily_reward_progress
    set last_claim_date=current_date,last_claimed_at=now(),total_claims=total_claims+1,current_day=case when current_day=7 then 1 else current_day+1 end,updated_at=now()
    where user_id=p_user;
  insert into public.notifications(user_id,notification_type,title,body,payload)
    values(p_user,'daily_reward','Daily reward claimed',v_reward.display_name,v_reward.payload);
  v_response:=jsonb_build_object('claimed',true,'reward',jsonb_build_object('key',v_reward.reward_key,'name',v_reward.display_name,'payload',v_reward.payload),'daily',private.api_daily_reward_status(p_user));
  insert into private.idempotency_keys(user_id,idempotency_key,action,response) values(p_user,p_key,'daily_reward_claim',v_response);
  return v_response;
end $$;

revoke all on function private.api_daily_reward_status(uuid) from public, anon, authenticated;
revoke all on function private.api_claim_daily_reward(uuid,text) from public, anon, authenticated;
grant execute on function private.api_daily_reward_status(uuid) to service_role;
grant execute on function private.api_claim_daily_reward(uuid,text) to service_role;

commit;
