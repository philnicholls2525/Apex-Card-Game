begin;

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.sets enable row level security;
alter table public.players enable row level security;
alter table public.card_definitions enable row level security;
alter table public.products enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.user_inventory enable row level security;
alter table public.user_cards enable row level security;
alter table public.card_discoveries enable row level security;
alter table public.gallery_cards enable row level security;
alter table public.openings enable row level security;
alter table public.opening_reveals enable row level security;
alter table public.pull_history enable row level security;
alter table public.card_ownership_events enable row level security;
alter table public.objective_definitions enable row level security;
alter table public.objective_progress enable row level security;
alter table public.objective_claims enable row level security;
alter table public.career_progress enable row level security;
alter table public.draft_runs enable row level security;
alter table public.rush_runs enable row level security;
alter table public.sbc_definitions enable row level security;
alter table public.sbc_segments enable row level security;
alter table public.sbc_submissions enable row level security;
alter table public.sbc_submission_cards enable row level security;
alter table public.user_settings enable row level security;
alter table public.weekly_activity enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.friendships from anon, authenticated;
revoke all on table public.sets from anon, authenticated;
revoke all on table public.players from anon, authenticated;
revoke all on table public.card_definitions from anon, authenticated;
revoke all on table public.products from anon, authenticated;
revoke all on table public.wallets from anon, authenticated;
revoke all on table public.wallet_transactions from anon, authenticated;
revoke all on table public.user_inventory from anon, authenticated;
revoke all on table public.user_cards from anon, authenticated;
revoke all on table public.card_discoveries from anon, authenticated;
revoke all on table public.gallery_cards from anon, authenticated;
revoke all on table public.openings from anon, authenticated;
revoke all on table public.opening_reveals from anon, authenticated;
revoke all on table public.pull_history from anon, authenticated;
revoke all on table public.card_ownership_events from anon, authenticated;
revoke all on table public.objective_definitions from anon, authenticated;
revoke all on table public.objective_progress from anon, authenticated;
revoke all on table public.objective_claims from anon, authenticated;
revoke all on table public.career_progress from anon, authenticated;
revoke all on table public.draft_runs from anon, authenticated;
revoke all on table public.rush_runs from anon, authenticated;
revoke all on table public.sbc_definitions from anon, authenticated;
revoke all on table public.sbc_segments from anon, authenticated;
revoke all on table public.sbc_submissions from anon, authenticated;
revoke all on table public.sbc_submission_cards from anon, authenticated;
revoke all on table public.user_settings from anon, authenticated;
revoke all on table public.weekly_activity from anon, authenticated;

grant usage on schema public to authenticated;
grant select on public.sets, public.players, public.card_definitions, public.products,
  public.objective_definitions, public.sbc_definitions, public.sbc_segments to authenticated;
grant select on public.profiles, public.friendships, public.wallets,
  public.wallet_transactions, public.user_inventory, public.user_cards,
  public.card_discoveries, public.gallery_cards, public.opening_reveals,
  public.pull_history, public.card_ownership_events, public.objective_progress,
  public.objective_claims, public.career_progress, public.sbc_submissions,
  public.sbc_submission_cards, public.user_settings, public.weekly_activity to authenticated;
grant update (username, display_name, avatar_url, privacy_mode, last_seen_at)
  on public.profiles to authenticated;
grant update (reduced_motion, sound_enabled, last_screen, preferences)
  on public.user_settings to authenticated;

create policy profiles_read_self on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy profiles_update_self on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy friendships_read_participant on public.friendships
  for select to authenticated
  using ((select auth.uid()) in (requester_id, recipient_id));

create policy sets_read_authenticated on public.sets
  for select to authenticated using (true);
create policy players_read_authenticated on public.players
  for select to authenticated using (true);
create policy card_definitions_read_authenticated on public.card_definitions
  for select to authenticated using (active = true);
create policy products_read_authenticated on public.products
  for select to authenticated using (active = true);
create policy objective_definitions_read_authenticated on public.objective_definitions
  for select to authenticated using (active = true);
create policy sbc_definitions_read_authenticated on public.sbc_definitions
  for select to authenticated using (active = true);
create policy sbc_segments_read_authenticated on public.sbc_segments
  for select to authenticated using (
    exists (select 1 from public.sbc_definitions d where d.id = sbc_id and d.active)
  );

create policy wallets_read_self on public.wallets
  for select to authenticated using ((select auth.uid()) = user_id);
create policy wallet_transactions_read_self on public.wallet_transactions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy inventory_read_self on public.user_inventory
  for select to authenticated using ((select auth.uid()) = user_id);
create policy user_cards_read_self on public.user_cards
  for select to authenticated using ((select auth.uid()) = user_id);
create policy discoveries_read_self on public.card_discoveries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy gallery_read_self on public.gallery_cards
  for select to authenticated using ((select auth.uid()) = user_id);
create policy opening_reveals_read_self on public.opening_reveals
  for select to authenticated using ((select auth.uid()) = user_id);
create policy pull_history_read_self on public.pull_history
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ownership_events_read_self on public.card_ownership_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy objective_progress_read_self on public.objective_progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy objective_claims_read_self on public.objective_claims
  for select to authenticated using ((select auth.uid()) = user_id);
create policy career_progress_read_self on public.career_progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy sbc_submissions_read_self on public.sbc_submissions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy sbc_submission_cards_read_self on public.sbc_submission_cards
  for select to authenticated using (
    exists (
      select 1 from public.sbc_submissions s
      where s.id = submission_id and s.user_id = (select auth.uid())
    )
  );
create policy user_settings_read_self on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy user_settings_update_self on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy weekly_activity_read_self on public.weekly_activity
  for select to authenticated using ((select auth.uid()) = user_id);

-- Deliberately no client policies or grants for openings, draft_runs or rush_runs.
-- Their hidden results/options are returned incrementally by the authenticated Edge Function.

commit;
