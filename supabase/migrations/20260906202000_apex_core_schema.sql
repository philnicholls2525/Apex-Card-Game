begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username extensions.citext unique,
  display_name text,
  avatar_url text,
  privacy_mode text not null default 'friends'
    check (privacy_mode in ('private', 'friends', 'public')),
  onboarding_completed boolean not null default false,
  local_save_decision text not null default 'none'
    check (local_save_decision in ('none', 'imported', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz,
  constraint profiles_username_format check (
    username is null or username::text ~ '^[A-Za-z0-9_]{3,24}$'
  ),
  constraint profiles_display_name_length check (
    display_name is null or char_length(display_name) between 1 and 40
  )
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(user_id) on delete cascade,
  recipient_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'blocked')),
  blocked_by uuid references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint friendships_not_self check (requester_id <> recipient_id),
  constraint friendships_block_owner check (
    (status = 'blocked' and blocked_by in (requester_id, recipient_id))
    or (status <> 'blocked' and blocked_by is null)
  )
);

create unique index friendships_unordered_unique_idx
  on public.friendships (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
create index friendships_requester_status_idx on public.friendships(requester_id, status);
create index friendships_recipient_status_idx on public.friendships(recipient_id, status);

create table public.sets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  season text not null,
  active boolean not null default false,
  released_at timestamptz,
  display_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  player_key text not null unique,
  name text not null,
  club text not null,
  tier text not null check (tier in ('common', 'uncommon', 'scarce', 'legend')),
  rookie boolean not null default false,
  display_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.card_definitions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.sets(id) on delete restrict,
  player_id uuid references public.players(id) on delete restrict,
  card_code text not null unique,
  card_type text not null,
  rarity_rank integer not null check (rarity_rank >= 0),
  protected boolean not null default false,
  unique_per_user boolean not null default false,
  quick_sell_value bigint not null default 0 check (quick_sell_value >= 0),
  asset_key text not null,
  display_metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (set_id, card_code),
  constraint card_definition_unique_requires_player check (
    not unique_per_user or player_id is not null
  )
);

create index card_definitions_set_active_idx on public.card_definitions(set_id, active);
create index card_definitions_player_idx on public.card_definitions(player_id);
create index card_definitions_type_rank_idx on public.card_definitions(card_type, rarity_rank);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.sets(id) on delete restrict,
  product_key text not null unique,
  name text not null,
  price bigint check (price is null or price >= 0),
  kind text not null check (kind in ('pack', 'box', 'reward')),
  pack_count integer not null check (pack_count > 0),
  active boolean not null default true,
  active_collation_version integer not null default 1 check (active_collation_version > 0),
  display_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index products_set_active_idx on public.products(set_id, active);

create table private.product_collation_versions (
  product_id uuid not null references public.products(id) on delete cascade,
  version integer not null check (version > 0),
  config jsonb not null,
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  primary key (product_id, version)
);

create table private.game_settings (
  setting_key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.wallets (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  coin_balance bigint not null default 0 check (coin_balance >= 0),
  updated_at timestamptz not null default now()
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  delta bigint not null check (delta <> 0),
  balance_after bigint not null check (balance_after >= 0),
  reason text not null,
  idempotency_key text,
  related_entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index wallet_transactions_user_created_idx
  on public.wallet_transactions(user_id, created_at desc);
create unique index wallet_transactions_idempotency_idx
  on public.wallet_transactions(user_id, idempotency_key)
  where idempotency_key is not null;

create table public.user_inventory (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index user_inventory_product_idx on public.user_inventory(product_id);

create table public.user_cards (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  card_definition_id uuid not null references public.card_definitions(id) on delete restrict,
  quantity integer not null default 0 check (quantity >= 0),
  lifetime_pulled integer not null default 0 check (lifetime_pulled >= 0),
  first_pulled_at timestamptz,
  last_pulled_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_definition_id),
  constraint user_cards_lifetime_gte_quantity check (lifetime_pulled >= quantity)
);

create index user_cards_definition_idx on public.user_cards(card_definition_id);
create index user_cards_owned_idx on public.user_cards(user_id, card_definition_id)
  where quantity > 0;

create table public.card_discoveries (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  card_definition_id uuid not null references public.card_definitions(id) on delete restrict,
  discovered_at timestamptz not null default now(),
  discovery_source text not null,
  primary key (user_id, card_definition_id)
);

create index card_discoveries_definition_idx on public.card_discoveries(card_definition_id);

create table public.gallery_cards (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  card_definition_id uuid not null references public.card_definitions(id) on delete restrict,
  added_at timestamptz not null default now(),
  primary key (user_id, card_definition_id)
);

create index gallery_cards_definition_idx on public.gallery_cards(card_definition_id);

create table public.openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_key_snapshot text not null,
  product_name_snapshot text not null,
  product_quantity integer not null check (product_quantity > 0),
  pack_count integer not null check (pack_count > 0),
  state text not null default 'active' check (state in ('active', 'completed')),
  result_json jsonb not null,
  collation_version integer not null check (collation_version > 0),
  current_pack_index integer not null default 0 check (current_pack_index >= 0),
  current_reveal_index integer not null default 0 check (current_reveal_index between 0 and 2),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint openings_result_shape check (jsonb_typeof(result_json->'packs') = 'array')
);

create unique index openings_one_active_per_user_idx on public.openings(user_id)
  where state = 'active';
create index openings_user_started_idx on public.openings(user_id, started_at desc);
create index openings_product_idx on public.openings(product_id);

create table public.opening_reveals (
  id uuid primary key default gen_random_uuid(),
  opening_id uuid not null references public.openings(id) on delete restrict,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  pack_index integer not null check (pack_index >= 0),
  reveal_index integer not null check (reveal_index between 0 and 2),
  card_definition_id uuid not null references public.card_definitions(id) on delete restrict,
  source text not null,
  revealed_at timestamptz not null default now(),
  unique(opening_id, pack_index, reveal_index)
);

create index opening_reveals_user_idx on public.opening_reveals(user_id, revealed_at desc);
create index opening_reveals_card_idx on public.opening_reveals(card_definition_id);

create table public.pull_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  opening_id uuid references public.openings(id) on delete restrict,
  card_definition_id uuid not null references public.card_definitions(id) on delete restrict,
  source text not null,
  pulled_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index pull_history_user_pulled_idx on public.pull_history(user_id, pulled_at desc);
create index pull_history_opening_idx on public.pull_history(opening_id);
create index pull_history_card_idx on public.pull_history(card_definition_id);

create table public.card_ownership_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  card_definition_id uuid not null references public.card_definitions(id) on delete restrict,
  delta integer not null check (delta <> 0),
  quantity_after integer not null check (quantity_after >= 0),
  reason text not null,
  related_entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index card_ownership_events_user_created_idx
  on public.card_ownership_events(user_id, created_at desc);
create index card_ownership_events_card_idx on public.card_ownership_events(card_definition_id);

create table public.objective_definitions (
  id text primary key,
  set_id uuid references public.sets(id) on delete restrict,
  category text not null,
  name text not null,
  description text not null,
  criteria jsonb not null,
  reward jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  repeat_period text check (repeat_period is null or repeat_period in ('daily', 'weekly')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index objective_definitions_set_active_idx
  on public.objective_definitions(set_id, active, category, sort_order);

create table public.objective_progress (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  objective_id text not null references public.objective_definitions(id) on delete restrict,
  period_key text not null default 'lifetime',
  progress bigint not null default 0 check (progress >= 0),
  target bigint not null check (target > 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, objective_id, period_key)
);

create index objective_progress_definition_idx on public.objective_progress(objective_id);

create table public.objective_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  objective_id text not null references public.objective_definitions(id) on delete restrict,
  period_key text not null default 'lifetime',
  reward_snapshot jsonb not null,
  idempotency_key text not null,
  claimed_at timestamptz not null default now(),
  unique(user_id, objective_id, period_key),
  unique(user_id, idempotency_key)
);

create index objective_claims_definition_idx on public.objective_claims(objective_id);

create table public.career_progress (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  xp bigint not null default 0 check (xp >= 0),
  apex_level integer generated always as (((xp / 500) + 1)::integer) stored,
  packs_opened bigint not null default 0 check (packs_opened >= 0),
  boxes_opened bigint not null default 0 check (boxes_opened >= 0),
  cards_pulled bigint not null default 0 check (cards_pulled >= 0),
  drafts_played bigint not null default 0 check (drafts_played >= 0),
  draft_stars bigint not null default 0 check (draft_stars >= 0),
  perfect_drafts bigint not null default 0 check (perfect_drafts >= 0),
  rushes_played bigint not null default 0 check (rushes_played >= 0),
  rush_packs_opened bigint not null default 0 check (rush_packs_opened >= 0),
  perfect_rushes bigint not null default 0 check (perfect_rushes >= 0),
  rush_best integer not null default 0 check (rush_best between 0 and 4),
  rush_perfect_streak integer not null default 0 check (rush_perfect_streak >= 0),
  rush_longest_streak integer not null default 0 check (rush_longest_streak >= 0),
  sbcs_completed bigint not null default 0 check (sbcs_completed >= 0),
  coins_earned bigint not null default 0 check (coins_earned >= 0),
  coins_spent bigint not null default 0 check (coins_spent >= 0),
  quick_sell_coins bigint not null default 0 check (quick_sell_coins >= 0),
  hangers_opened bigint not null default 0 check (hangers_opened >= 0),
  values_opened bigint not null default 0 check (values_opened >= 0),
  hobbies_opened bigint not null default 0 check (hobbies_opened >= 0),
  weekly_objectives_completed bigint not null default 0 check (weekly_objectives_completed >= 0),
  achievement_state jsonb not null default '{}'::jsonb,
  mode_state jsonb not null default '{}'::jsonb,
  collection_updated_at timestamptz not null default now(),
  xp_achieved_at timestamptz not null default now(),
  draft_stars_achieved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index career_progress_xp_idx on public.career_progress(xp desc, xp_achieved_at, user_id);
create index career_progress_draft_idx on public.career_progress(draft_stars desc, draft_stars_achieved_at, user_id);

create table public.draft_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed')),
  state jsonb not null,
  state_version integer not null default 1 check (state_version > 0),
  stars integer check (stars is null or stars between 0 and 5),
  reward jsonb,
  reward_claimed_at timestamptz,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index draft_runs_one_active_idx on public.draft_runs(user_id) where status='active';
create index draft_runs_user_started_idx on public.draft_runs(user_id, started_at desc);

create table public.rush_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed')),
  state jsonb not null,
  state_version integer not null default 1 check (state_version > 0),
  stars integer check (stars is null or stars between 0 and 4),
  reward jsonb,
  reward_claimed_at timestamptz,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index rush_runs_one_active_idx on public.rush_runs(user_id) where status='active';
create index rush_runs_user_started_idx on public.rush_runs(user_id, started_at desc);

create table public.sbc_definitions (
  id text primary key,
  set_id uuid not null references public.sets(id) on delete restrict,
  category text not null,
  name text not null,
  description text not null,
  repeatable boolean not null default false,
  group_reward jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.sbc_segments (
  id text not null,
  sbc_id text not null references public.sbc_definitions(id) on delete cascade,
  name text not null,
  slot_count integer not null check (slot_count > 0),
  requirements jsonb not null default '{}'::jsonb,
  reward jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  primary key (sbc_id, id)
);

create table public.sbc_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  sbc_id text not null references public.sbc_definitions(id) on delete restrict,
  segment_id text not null,
  reward_snapshot jsonb not null,
  reward_claimed_at timestamptz,
  group_reward_claimed_at timestamptz,
  idempotency_key text not null,
  submitted_at timestamptz not null default now(),
  foreign key (sbc_id, segment_id) references public.sbc_segments(sbc_id, id) on delete restrict,
  unique(user_id, idempotency_key)
);

create index sbc_submissions_user_idx on public.sbc_submissions(user_id, submitted_at desc);
create index sbc_submissions_definition_idx on public.sbc_submissions(sbc_id, segment_id);

create table public.sbc_submission_cards (
  submission_id uuid not null references public.sbc_submissions(id) on delete restrict,
  card_definition_id uuid not null references public.card_definitions(id) on delete restrict,
  player_id uuid references public.players(id) on delete restrict,
  quantity integer not null default 1 check (quantity = 1),
  quantity_before integer not null check (quantity_before > 0),
  primary key (submission_id, card_definition_id),
  unique(submission_id, player_id)
);

create index sbc_submission_cards_definition_idx on public.sbc_submission_cards(card_definition_id);

create table public.user_settings (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  reduced_motion boolean not null default false,
  sound_enabled boolean not null default true,
  last_screen text not null default 'home',
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.weekly_activity (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  week_start date not null,
  actions integer not null default 0 check (actions >= 0),
  objective_completions integer not null default 0 check (objective_completions >= 0),
  first_achieved_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

create index weekly_activity_rank_idx
  on public.weekly_activity(week_start, objective_completions desc, actions desc, first_achieved_at);

create table private.idempotency_keys (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  idempotency_key text not null,
  action text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key(user_id, idempotency_key),
  constraint idempotency_key_length check (char_length(idempotency_key) between 8 and 128)
);

create index idempotency_created_idx on private.idempotency_keys(created_at);

create table private.local_save_imports (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  source_version integer not null,
  source_hash text not null,
  imported_summary jsonb not null,
  imported_at timestamptz not null default now()
);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function private.touch_updated_at();
create trigger friendships_touch_updated_at before update on public.friendships
for each row execute function private.touch_updated_at();
create trigger user_inventory_touch_updated_at before update on public.user_inventory
for each row execute function private.touch_updated_at();
create trigger user_cards_touch_updated_at before update on public.user_cards
for each row execute function private.touch_updated_at();
create trigger openings_touch_updated_at before update on public.openings
for each row execute function private.touch_updated_at();
create trigger career_progress_touch_updated_at before update on public.career_progress
for each row execute function private.touch_updated_at();
create trigger draft_runs_touch_updated_at before update on public.draft_runs
for each row execute function private.touch_updated_at();
create trigger rush_runs_touch_updated_at before update on public.rush_runs
for each row execute function private.touch_updated_at();
create trigger user_settings_touch_updated_at before update on public.user_settings
for each row execute function private.touch_updated_at();

create or replace function private.prevent_immutable_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = format('%I is immutable', tg_table_name);
end;
$$;

create trigger wallet_transactions_immutable before update or delete on public.wallet_transactions
for each row execute function private.prevent_immutable_mutation();
create trigger pull_history_immutable before update or delete on public.pull_history
for each row execute function private.prevent_immutable_mutation();
create trigger ownership_events_immutable before update or delete on public.card_ownership_events
for each row execute function private.prevent_immutable_mutation();
create trigger opening_reveals_immutable before update or delete on public.opening_reveals
for each row execute function private.prevent_immutable_mutation();
create trigger objective_claims_immutable before update or delete on public.objective_claims
for each row execute function private.prevent_immutable_mutation();
create trigger sbc_submission_cards_immutable before update or delete on public.sbc_submission_cards
for each row execute function private.prevent_immutable_mutation();

create or replace function private.protect_user_card_quantity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_protected boolean;
  v_unique boolean;
  v_in_gallery boolean;
begin
  if tg_op = 'DELETE' then
    select d.protected, d.unique_per_user
      into v_protected, v_unique
    from public.card_definitions d
    where d.id = old.card_definition_id;
    if v_protected then
      raise exception using errcode = '23514', message = 'Protected cards cannot be removed';
    end if;
    select exists(
      select 1 from public.gallery_cards g
      where g.user_id = old.user_id and g.card_definition_id = old.card_definition_id
    ) into v_in_gallery;
    if v_in_gallery then
      raise exception using errcode = '23514', message = 'Gallery cards cannot be removed';
    end if;
    return old;
  end if;

  select d.protected, d.unique_per_user
    into v_protected, v_unique
  from public.card_definitions d
  where d.id = new.card_definition_id;

  if v_unique and new.quantity > 1 then
    raise exception using errcode = '23505', message = 'Only One is unique per account';
  end if;

  if tg_op = 'UPDATE' and new.quantity < old.quantity then
    if v_protected then
      raise exception using errcode = '23514', message = 'Protected cards cannot be removed';
    end if;
    select exists(
      select 1 from public.gallery_cards g
      where g.user_id = old.user_id and g.card_definition_id = old.card_definition_id
    ) into v_in_gallery;
    if v_in_gallery then
      raise exception using errcode = '23514', message = 'Gallery cards cannot be removed';
    end if;
  end if;
  return new;
end;
$$;

create trigger user_cards_protection
before insert or update or delete on public.user_cards
for each row execute function private.protect_user_card_quantity();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(user_id) values (new.id) on conflict do nothing;
  insert into public.wallets(user_id) values (new.id) on conflict do nothing;
  insert into public.career_progress(user_id) values (new.id) on conflict do nothing;
  insert into public.user_settings(user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

commit;
